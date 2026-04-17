import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Sparkles, Loader2 } from "lucide-react";

import { VideoUploader } from "@/components/VideoUploader";
import { ResultsDashboard } from "@/components/ResultsDashboard";
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

  const reset = () => {
    setFile(null);
    setStage("idle");
    setProgress(0);
    setStatusText("");
    setAnalysis(null);
    setError(null);
  };

  const run = async () => {
    if (!file) return;
    setError(null);
    setAnalysis(null);
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

      const result = await analyze({
        data: {
          audioBase64: extracted.audioBase64,
          audioMimeType: extracted.audioMimeType,
          frames: extracted.frames,
          durationSeconds: extracted.durationSeconds,
          tone,
        },
      });

      setProgress(100);
      setStatusText("Analysis complete");
      setAnalysis(result);
      setStage("done");
    } catch (e: any) {
      console.error(e);
      const msg: string = e?.message ?? "Something went wrong.";
      let friendly = msg;
      if (msg.includes("RATE_LIMIT"))
        friendly = "Too many requests right now. Please wait a moment and try again.";
      else if (msg.includes("PAYMENT_REQUIRED"))
        friendly =
          "Your Lovable AI workspace is out of credits. Add funds in Settings → Workspace → Usage and retry.";
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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {!analysis && (
          <section className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered presentation analysis
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              Turn any recorded talk into{" "}
              <span className="text-gradient-score">actionable coaching</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              Upload a presentation video. We transcribe your speech, analyze your
              body language, score fluency and confidence, and write you a personal
              mentor report.
            </p>
          </section>
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

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground"
              >
                <p className="font-medium">Analysis failed</p>
                <p className="mt-1 text-foreground/90">{error}</p>
              </div>
            )}

            {!busy && !error && (
              <div className="grid grid-cols-3 gap-3 pt-4">
                <Stat label="Dimensions" value="6" />
                <Stat label="AI passes" value="4" />
                <Stat label="Avg. time" value="~45s" />
              </div>
            )}
          </div>
        )}

        {analysis && <ResultsDashboard analysis={analysis} onReset={reset} />}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Built on Lovable Cloud · AI by Lovable AI Gateway
      </footer>
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
