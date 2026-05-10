import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · AI Presentation Coach" },
      {
        name: "description",
        content: "Sign in with a magic link to save your presentation analyses.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (err) {
        const msg = err.message || "";
        if (msg.includes("fetch") || msg.includes("network")) {
          setError("Connection error. Please check your internet connection and try again.");
        } else if (msg.includes("rate")) {
          setError("Too many attempts. Please wait a minute and try again.");
        } else {
          setError(msg);
        }
        return;
      }
      setSent(true);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("fetch") || msg.includes("network")) {
        setError("Connection error. Please check your internet connection and try again.");
      } else {
        setError(msg || "Could not send magic link. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-card backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {sent ? "Check your email" : "Sign in"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {sent
                ? `We sent a magic link to ${email}. Click it to sign in.`
                : "We'll email you a magic link — no password needed."}
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-glow" />
                <div>
                  <p className="font-medium text-foreground">Magic link sent</p>
                  <p className="mt-1 text-muted-foreground">
                    Open the email and tap the link on this device to finish signing in.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={submitting || !email}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  "Send magic link"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
