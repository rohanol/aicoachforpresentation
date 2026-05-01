import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proFeatures = [
  "Unlimited analyses",
  "Priority AI processing",
  "Full transcript downloads",
  "Email support",
];

const businessFeatures = [
  "Everything in Pro",
  "Team workspaces (up to 10 seats)",
  "Custom coaching tone presets",
  "Dedicated support",
];

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card/95 backdrop-blur">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl">
            You've used your 3 free analyses
          </DialogTitle>
          <DialogDescription className="text-base">
            Upgrade to keep training and unlock unlimited coaching sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <PlanCard
            icon={<Zap className="h-5 w-5" />}
            name="Pro"
            price="₹499"
            tagline="Best for individuals"
            highlighted
            features={proFeatures}
          />
          <PlanCard
            icon={<Crown className="h-5 w-5" />}
            name="Business"
            price="₹1,999"
            tagline="For teams & coaches"
            features={businessFeatures}
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Link to="/pricing">Upgrade to Pro</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PlanCardProps {
  icon: React.ReactNode;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

function PlanCard({
  icon,
  name,
  price,
  tagline,
  features,
  highlighted,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-2xl border p-5 transition-colors ${
        highlighted
          ? "border-primary/50 bg-primary/5 shadow-glow"
          : "border-border bg-card/40"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-glow">
          Popular
        </span>
      )}
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlighted
              ? "bg-gradient-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>
      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gradient-score">{price}</span>
        <span className="text-xs text-muted-foreground">/ month</span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
