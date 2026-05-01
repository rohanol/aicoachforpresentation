import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI Presentation Analyzer" },
      { name: "description", content: "Upload a presentation video and get AI-powered scoring on speech, body language, and confidence with personalized mentor feedback." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "AI Presentation Analyzer" },
      { property: "og:description", content: "Upload a presentation video and get AI-powered scoring on speech, body language, and confidence with personalized mentor feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "AI Presentation Analyzer" },
      { name: "twitter:description", content: "Upload a presentation video and get AI-powered scoring on speech, body language, and confidence with personalized mentor feedback." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f9f9bc10-29f2-4461-be73-308ebdd8781e" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f9f9bc10-29f2-4461-be73-308ebdd8781e" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <AuthHeader />
      <Outlet />
    </>
  );
}

function AuthHeader() {
  const { user, loading } = useUser();

  if (loading) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      {user ? (
        <>
          <Button asChild size="sm" variant="ghost" className="backdrop-blur">
            <Link to="/history">History</Link>
          </Button>
          <span className="hidden rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-foreground/90 backdrop-blur sm:inline">
            {user.email}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            className="backdrop-blur"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </>
      ) : (
        <Button
          asChild
          size="sm"
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Link to="/auth">Sign in</Link>
        </Button>
      )}
    </div>
  );
}
