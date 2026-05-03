import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhook } from "@/server/stripe-webhook.functions";

// Stripe webhook endpoint. Stripe POSTs raw JSON here; signature verification
// requires the unparsed body, which the server function reads via getRequest().
export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await handleStripeWebhook();
          return Response.json(result, { status: 200 });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("WEBHOOK_INVALID_SIGNATURE")) {
            return Response.json(
              { error: "Invalid signature" },
              { status: 400 },
            );
          }
          // Any other unexpected error: still return 200 so Stripe doesn't
          // retry. The handler logs internally.
          console.error("Webhook route error:", err);
          return Response.json({ received: true }, { status: 200 });
        }
      },
    },
  },
});
