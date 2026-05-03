import Stripe from "stripe";

// Stripe SDK initializer. Uses the Fetch HTTP client so it works in
// Cloudflare Workers / edge runtimes (no Node http module required).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2024-06-20" as any,
  httpClient: Stripe.createFetchHttpClient(),
});
