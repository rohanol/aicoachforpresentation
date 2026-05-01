import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · AI Presentation Coach" },
      {
        name: "description",
        content: "Pro and Business plans for unlimited AI-powered presentation coaching.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back home
      </Link>

      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Plans & pricing
        </h1>
        <p className="mt-2 text-muted-foreground">
          Stripe checkout coming soon. For now, reach out to get early access.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 shadow-glow">
          <p className="text-sm font-semibold">Pro</p>
          <p className="mt-1 text-3xl font-bold text-gradient-score">₹499<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Unlimited analyses, priority processing, full transcript downloads.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-6">
          <p className="text-sm font-semibold">Business</p>
          <p className="mt-1 text-3xl font-bold text-gradient-score">₹1,999<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="mt-2 text-sm text-muted-foreground">Team workspaces, custom tone presets, dedicated support.</p>
        </div>
      </div>
    </div>
  );
}
