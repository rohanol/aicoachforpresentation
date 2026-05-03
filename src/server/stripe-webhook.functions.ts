import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function detectPlan(sub: Stripe.Subscription): "pro" | "business" | null {
  const item = sub.items.data[0];
  const nickname = item?.price.nickname?.toLowerCase();
  if (nickname === "pro") return "pro";
  if (nickname === "business") return "business";
  const amount = item?.price.unit_amount;
  if (amount === 49900) return "pro";
  if (amount === 199900) return "business";
  return null;
}

async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const status = sub.status;
  const plan = detectPlan(sub);

  if (status === "active" || status === "trialing") {
    if (!plan) {
      console.warn("Subscription active but plan not detected:", sub.id);
      return;
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan, stripe_subscription_id: sub.id })
      .eq("stripe_customer_id", customerId);
    if (error) console.error("DB update (active sub) failed:", error);
    return;
  }

  if (status === "past_due") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: "free" })
      .eq("stripe_customer_id", customerId);
    if (error) console.error("DB update (past_due) failed:", error);
    return;
  }

  if (status === "canceled" || status === "unpaid") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: "free", stripe_subscription_id: null })
      .eq("stripe_customer_id", customerId);
    if (error) console.error("DB update (canceled/unpaid) failed:", error);
    return;
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!customerId) {
    console.warn("checkout.session.completed without customer id");
    return;
  }

  // Prefer metadata supabase_user_id (set during createCheckoutSession).
  const supabaseUserId = session.metadata?.supabase_user_id;
  if (supabaseUserId) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", supabaseUserId);
    if (error) console.error("DB link by metadata failed:", error);
    return;
  }

  // Fallback: look up the auth user by email.
  const email =
    session.customer_email ?? session.customer_details?.email ?? null;
  if (!email) {
    console.warn("checkout.session.completed: no metadata or email");
    return;
  }

  // auth.admin.listUsers doesn't filter by email natively; page through a
  // small set. For larger user bases, store email in profiles instead.
  const { data: list, error: listErr } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    console.error("auth.admin.listUsers failed:", listErr);
    return;
  }
  const match = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!match) {
    console.warn("No auth user found for email:", email);
    return;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", match.id);
  if (error) console.error("DB link by email failed:", error);
}

export const handleStripeWebhook = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = getRequest();
    const signature = request.headers.get("stripe-signature");
    const rawBody = await request.text();

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      throw new Error("WEBHOOK_INVALID_SIGNATURE");
    }
    if (!signature) {
      throw new Error("WEBHOOK_INVALID_SIGNATURE");
    }

    let event: Stripe.Event;
    try {
      // constructEventAsync is required on Workers (async crypto).
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        secret,
      );
    } catch (err) {
      console.error("Stripe signature verification failed:", err);
      throw new Error("WEBHOOK_INVALID_SIGNATURE");
    }

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          await applySubscription(event.data.object as Stripe.Subscription);
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ plan: "free", stripe_subscription_id: null })
            .eq("stripe_customer_id", customerId);
          if (error) console.error("DB update (sub.deleted) failed:", error);
          break;
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;
          if (!customerId) break;
          // Reset usage for the new billing cycle (paid plans only).
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ analyses_used: 0 })
            .eq("stripe_customer_id", customerId)
            .neq("plan", "free");
          if (error) console.error("DB usage reset failed:", error);
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;
          console.warn("Payment failed for customer:", customerId);
          break;
        }
        case "checkout.session.completed": {
          await handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        }
        default:
          // Unhandled event types are safe to ignore.
          break;
      }
    } catch (err) {
      // Swallow business-logic errors so Stripe doesn't retry endlessly.
      console.error("Webhook handler error:", err);
    }

    return { received: true };
  },
);
