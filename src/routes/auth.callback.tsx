import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: "/" });
      } else {
        navigate({ to: "/auth" });
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-foreground">Signing you in…</p>
        <p className="animate-pulse text-sm text-muted-foreground">
          If you are not redirected, please return{" "}
          <a href="/" className="underline">
            home
          </a>
          .
        </p>
      </div>
    </div>
  );
}
