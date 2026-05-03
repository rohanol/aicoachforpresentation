import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PRICE_AMOUNTS = {
  pro: 49900, // ₹499.00
  business: 199900, // ₹1999.00
} as const;

const PLAN_NAMES = {
  pro: "Pro Plan",
  business: "Business Plan",
} as const;

const checkoutInput = z.object({
  email: z.string().email(),
  plan: z.enum(["pro", "business"]),
  userId: z.string().uuid(),
});

function getOrigin(): string {
  return process.env.PUBLIC_APP_URL ?? "http://localhost:8080";
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutInput.parse(input))
  .handler(async ({ data }) => {
    const origin = getOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: data.email,
      line_items: [
        {
          price_data: {
            currency: "inr",
            recurring: { interval: "month" },
            product_data: { name: PLAN_NAMES[data.plan] },
            unit_amount: PRICE_AMOUNTS[data.plan],
          },
          quantity: 1,
        },
      ],
      // CRITICAL: stash the supabase user id so the webhook can link the
      // Stripe customer back to our user even if email matching fails.
      metadata: { supabase_user_id: data.userId, plan: data.plan },
      subscription_data: {
        metadata: { supabase_user_id: data.userId, plan: data.plan },
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });

    return { url: session.url };
  });

const portalInput = z.object({ userId: z.string().uuid() });

export const createPortalSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => portalInput.parse(input))
  .handler(async ({ data }) => {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", data.userId)
      .maybeSingle();

    if (error) throw error;
    if (!profile?.stripe_customer_id) {
      throw new Error("NO_CUSTOMER: No Stripe customer linked to this user.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getOrigin()}/`,
    });

    return { url: session.url };
  });
