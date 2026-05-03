import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic,
  Sparkles,
  Loader2,
  LogIn,
  Upload,
  Cpu,
  FileText,
  Mic2,
  PenLine,
  Eye,
  PersonStanding,
  MessageSquare,
  Brain,
  Check,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { VideoUploader } from "@/components/VideoUploader";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractFromVideo } from "@/lib/video-extract";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzePresentation,
  type Analysis,
} from "@/server/analyze.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Presentation Analyzer · Get instant coaching feedback" },
      {
        name: "description",
        content:
          "Upload a presentation video and get AI-powered scoring on speech, fluency, body language, and confidence — with personalized mentor feedback.",
      },
      {
        property: "og:title",
        content: "AI Presentation Analyzer",
      },
      {
        property: "og:description",
        content:
          "Upload a presentation video and get AI-powered scoring on speech, fluency, body language, and confidence.",
      },
    ],
  }),
  component: HomePage,
});

type Stage = "idle" | "extracting" | "analyzing" | "done" | "error";

function HomePage() {
  const analyze = useServerFn(analyzePresentation);
  const [file, setFile] = useState<File | null>(null);
  const [tone, setTone] = useState<"male" | "female" | "neutral">("neutral");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const scrollToUpload = () => {
    document
      .getElementById("upload")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  const reset = () => {
    setFile(null);
    setStage("idle");
    setProgress(0);
    setStatusText("");
    setAnalysis(null);
    setError(null);
    setNeedsAuth(false);
  };

  const run = async () => {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setNeedsAuth(false);
    setStage("extracting");
    setProgress(2);
    setStatusText("Preparing your video…");

    try {
      const extracted = await extractFromVideo(file, (label, pct) => {
        setStatusText(label);
        setProgress(Math.min(90, pct));
      });

      setStage("analyzing");
      setStatusText("Sending to AI coach…");
      setProgress(92);

      // Forward the user's access token (if signed in) so the server can
      // identify them and apply the per-user quota.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const result = await analyze({
        data: {
          audioBase64: extracted.audioBase64,
          audioMimeType: extracted.audioMimeType,
          frames: extracted.frames,
          durationSeconds: extracted.durationSeconds,
          tone,
          ...(accessToken ? { accessToken } : {}),
        },
      });

      setProgress(100);
      setStatusText("Analysis complete");
      setAnalysis(result);
      setStage("done");
    } catch (e: any) {
      console.error(e);
      const msg: string = e?.message ?? "Something went wrong.";
      if (msg.includes("LIMIT_REACHED")) {
        setShowUpgrade(true);
        setStage("idle");
        setProgress(0);
        setStatusText("");
        return;
      }
      if (msg.includes("AUTH_REQUIRED")) {
        setNeedsAuth(true);
        setStage("error");
        setProgress(0);
        setStatusText("");
        return;
      }
      let friendly: string;
      if (msg.includes("RATE_LIMIT"))
        friendly = "Too many requests right now. Please wait a moment and try again.";
      else if (msg.includes("PAYMENT_REQUIRED"))
        friendly =
          "Your Lovable AI workspace is out of credits. Add funds in Settings → Workspace → Usage and retry.";
      else if (msg.includes("AI_ERROR"))
        friendly = "The analysis service is temporarily unavailable. Please try again shortly.";
      else
        friendly = "Something went wrong while analyzing your video. Please try again.";
      setError(friendly);
      setStage("error");
    }
  };

  const busy = stage === "extracting" || stage === "analyzing";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                AI Presentation Coach
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Powered by Lovable AI
              </p>
            </div>
          </div>
          <a
            href="https://docs.lovable.dev/features/ai"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            About
          </a>
        </div>
      </header>

      <main className="scroll-smooth">
        {!analysis && (
          <>
            {/* SECTION 1 — Hero */}
            <section className="mx-auto max-w-5xl px-4 pb-16 pt-12 text-center sm:pt-20">
              <div className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered presentation analysis
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Turn any recorded talk into{" "}
                <span className="text-gradient-score">actionable coaching</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
                Upload a video. Get AI-powered scores on fluency, body language,
                grammar and confidence — with a personal mentor report in under
                60 seconds.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={scrollToUpload}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Try it free — no signup needed
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowSample(true)}
                >
                  See a sample report
                </Button>
              </div>

              <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-3">
                <Stat label="Dimensions" value="6" />
                <Stat label="AI passes" value="4" />
                <Stat label="Avg. time" value="~45s" />
              </div>
            </section>

            {/* SECTION 2 — How it works */}
            <section className="border-t border-border/60 bg-card/20 py-16">
              <div className="mx-auto max-w-5xl px-4">
                <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                  How it works
                </h2>
                <div className="grid gap-6 sm:grid-cols-3">
                  <Step
                    n={1}
                    icon={<Upload className="h-5 w-5" />}
                    title="Upload your video"
                    text="MP4, MOV, AVI — up to 200MB."
                  />
                  <Step
                    n={2}
                    icon={<Cpu className="h-5 w-5" />}
                    title="AI analyzes in parallel"
                    text="Speech, body language, fluency and confidence — all at once."
                  />
                  <Step
                    n={3}
                    icon={<FileText className="h-5 w-5" />}
                    title="Get your mentor report"
                    text="Personal scores plus targeted improvement tips."
                  />
                </div>
              </div>
            </section>

            {/* SECTION 3 — What gets analyzed */}
            <section className="py-16">
              <div className="mx-auto max-w-5xl px-4">
                <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                  What gets analyzed
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Feature
                    icon={<Mic2 className="h-5 w-5" />}
                    title="Speech Fluency"
                    text="Filler words, pace, rhythm scored 0–100."
                  />
                  <Feature
                    icon={<PenLine className="h-5 w-5" />}
                    title="Grammar"
                    text="Sentence structure and language quality."
                  />
                  <Feature
                    icon={<Eye className="h-5 w-5" />}
                    title="Eye Contact"
                    text="How often you face the camera."
                  />
                  <Feature
                    icon={<PersonStanding className="h-5 w-5" />}
                    title="Posture"
                    text="Body positioning throughout your talk."
                  />
                  <Feature
                    icon={<MessageSquare className="h-5 w-5" />}
                    title="Confidence"
                    text="Word choice, structure, hedging language."
                  />
                  <Feature
                    icon={<Brain className="h-5 w-5" />}
                    title="Mentor Report"
                    text="3-paragraph personalized coaching feedback."
                  />
                </div>
              </div>
            </section>

            {/* SECTION 4 — Pricing */}
            <section className="border-t border-border/60 bg-card/20 py-16">
              <div className="mx-auto max-w-5xl px-4">
                <h2 className="mb-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                  Simple, transparent pricing
                </h2>
                <p className="mb-10 text-center text-sm text-muted-foreground">
                  Start free. Upgrade when you're ready.
                </p>
                <div className="grid gap-6 lg:grid-cols-3">
                  <PriceCard
                    name="Free"
                    price="₹0"
                    period="forever"
                    features={[
                      "3 analyses per month",
                      "Basic scores only",
                      "History dashboard",
                    ]}
                    cta="Start free"
                    onCta={scrollToUpload}
                  />
                  <PriceCard
                    name="Pro"
                    price="₹499"
                    period="per month"
                    highlighted
                    features={[
                      "Unlimited analyses",
                      "Full mentor report",
                      "History dashboard",
                      "PDF export",
                    ]}
                    cta="Get Pro"
                    href="/pricing"
                  />
                  <PriceCard
                    name="Business"
                    price="₹1999"
                    period="per month"
                    features={[
                      "Everything in Pro",
                      "5 seats included",
                      "Manager dashboard",
                      "API access",
                    ]}
                    cta="Contact us"
                    href="mailto:hello@example.com"
                  />
                </div>
              </div>
            </section>

            {/* SECTION 5 — FAQ */}
            <section className="py-16">
              <div className="mx-auto max-w-3xl px-4">
                <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                  Frequently asked questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  <FaqItem
                    value="q1"
                    q="Is my video stored after analysis?"
                    a="No. Videos are processed in memory and never stored on our servers."
                  />
                  <FaqItem
                    value="q2"
                    q="What video formats are supported?"
                    a="MP4, MOV, AVI, and WebM up to 200MB. We recommend 30 seconds to 3 minutes."
                  />
                  <FaqItem
                    value="q3"
                    q="How accurate is the body language analysis?"
                    a="Our AI samples up to 8 frames and scores posture and eye contact. Results improve with good lighting and a clear camera angle."
                  />
                  <FaqItem
                    value="q4"
                    q="Can I use this for job interview prep?"
                    a="Absolutely — that's one of our most popular use cases. Practice your answers and get scored before the real thing."
                  />
                  <FaqItem
                    value="q5"
                    q="What happens when I hit the free limit?"
                    a="You'll see an upgrade prompt. Your past analyses are always saved in your history."
                  />
                </Accordion>
              </div>
            </section>
          </>
        )}

        {/* Upload tool — kept exactly as-is, just below the fold */}
        <section
          id="upload"
          className="mx-auto max-w-5xl scroll-mt-20 px-4 py-12 sm:py-16"
        >
          {!analysis && (
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Try it now
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload a video to get your personal coaching report.
              </p>
            </div>
          )}

          {!analysis && (
            <div className="space-y-5">
              <VideoUploader file={file} onFile={setFile} disabled={busy} />

              <div className="grid gap-4 rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Coaching tone
                  </label>
                  <Select
                    value={tone}
                    onValueChange={(v) => setTone(v as typeof tone)}
                    disabled={busy}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">
                        Neutral — balanced & professional
                      </SelectItem>
                      <SelectItem value="male">
                        Direct — competitive, data-driven
                      </SelectItem>
                      <SelectItem value="female">
                        Encouraging — warm & empowering
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="lg"
                  onClick={run}
                  disabled={!file || busy}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze presentation
                    </>
                  )}
                </Button>
              </div>

              {busy && (
                <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-foreground/90">{statusText}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  {stage === "analyzing" && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Running transcription, speech analysis, vision analysis, and
                      mentor feedback in parallel. This usually takes 20–60 seconds.
                    </p>
                  )}
                </div>
              )}

              {needsAuth && (
                <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-sm shadow-glow">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                      <LogIn className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        Sign in for free to keep going
                      </p>
                      <p className="mt-1 text-foreground/80">
                        You've used your free anonymous analysis. Create a free
                        account to get 3 analyses every month.
                      </p>
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                        >
                          <Link to="/auth">Sign in free</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && !needsAuth && (
                <div
                  role="alert"
                  className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground"
                >
                  <p className="font-medium">Analysis failed</p>
                  <p className="mt-1 text-foreground/90">{error}</p>
                </div>
              )}
            </div>
          )}

          {analysis && <ResultsDashboard analysis={analysis} onReset={reset} />}
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Built on Lovable Cloud · AI by Lovable AI Gateway
      </footer>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
      <SampleReportDialog open={showSample} onOpenChange={setShowSample} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 text-center backdrop-blur">
      <p className="text-2xl font-bold text-gradient-score">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-card backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step {n}
        </span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary-glow">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PriceCard({
  name,
  price,
  period,
  features,
  cta,
  href,
  onCta,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href?: string;
  onCta?: () => void;
  highlighted?: boolean;
}) {
  const button = onCta ? (
    <Button
      onClick={onCta}
      className={
        highlighted
          ? "w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          : "w-full"
      }
      variant={highlighted ? "default" : "outline"}
    >
      {cta}
    </Button>
  ) : (
    <Button
      asChild
      className={
        highlighted
          ? "w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          : "w-full"
      }
      variant={highlighted ? "default" : "outline"}
    >
      <a href={href}>{cta}</a>
    </Button>
  );

  return (
    <div
      className={
        "relative rounded-2xl border bg-card/60 p-6 shadow-card backdrop-blur " +
        (highlighted
          ? "border-primary/60 shadow-glow"
          : "border-border")
      }
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-glow">
          <Star className="h-3 w-3" />
          Most popular
        </div>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gradient-score">{price}</span>
        <span className="text-sm text-muted-foreground">/ {period}</span>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{button}</div>
    </div>
  );
}

function FaqItem({ value, q, a }: { value: string; q: string; a: string }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-left">{q}</AccordionTrigger>
      <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
    </AccordionItem>
  );
}

const SAMPLE_SCORES = [
  { label: "Fluency", value: 82 },
  { label: "Grammar", value: 88 },
  { label: "Confidence", value: 74 },
  { label: "Posture", value: 79 },
  { label: "Eye Contact", value: 71 },
  { label: "Overall", value: 79 },
];

function SampleReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sample mentor report</DialogTitle>
          <DialogDescription>
            A preview of what you'll receive after uploading a real video.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SAMPLE_SCORES.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card/60 p-3 text-center"
            >
              <p className="text-2xl font-bold text-gradient-score">
                {s.value}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <p>
            <strong>Strengths.</strong> Your delivery is clear and well-paced,
            with strong vocabulary and minimal filler words. Grammar is
            consistently solid, which keeps the audience focused on your ideas
            rather than the language.
          </p>
          <p>
            <strong>Areas to improve.</strong> Confidence dipped in the middle
            third — there's noticeable hedging ("kind of", "I think maybe")
            when introducing your second main point. Eye contact also drops as
            you reference notes; try memorizing the opening sentence of each
            section so you can look up confidently.
          </p>
          <p>
            <strong>Next step.</strong> Re-record just the second section, this
            time without notes for the first 15 seconds. Aim for a confidence
            score above 80 — small posture and eye-contact adjustments
            typically lift the overall score by 5–8 points.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

