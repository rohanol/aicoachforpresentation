import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Analysis } from "@/server/analyze.functions";
import { ScoreCard } from "./ScoreCard";
import { ScoreRadar } from "./ScoreRadar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, Eye, Activity, MessageSquare } from "lucide-react";

interface Props {
  analysis: Analysis;
  onReset: () => void;
}

export function ResultsDashboard({ analysis, onReset }: Props) {
  const radarData = [
    { metric: "Fluency", value: analysis.fluencyScore },
    { metric: "Grammar", value: analysis.grammarScore },
    { metric: "Body", value: analysis.postureScore },
    { metric: "Confidence", value: analysis.confidenceScore },
    { metric: "Vocabulary", value: Math.round(analysis.vocabularyRichness * 100) },
  ];

  const downloadFeedback = () => {
    const blob = new Blob(
      [
        `AI Presentation Coach — Feedback\n` +
          `Final Score: ${analysis.finalScore}/100\n\n` +
          `Fluency: ${analysis.fluencyScore}\n` +
          `Grammar: ${analysis.grammarScore}\n` +
          `Body Language: ${analysis.postureScore}\n` +
          `Confidence: ${analysis.confidenceScore}\n\n` +
          `--- Mentor Feedback ---\n${analysis.mentorFeedback}\n\n` +
          `--- Transcript ---\n${analysis.transcript}\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "presentation-feedback.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-6 shadow-elegant backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Final Score
          </p>
          <p className="mt-1 text-5xl font-bold text-gradient-score">
            {analysis.finalScore.toFixed(1)}
            <span className="ml-1 text-xl text-muted-foreground">/100</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadFeedback} variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={onReset} variant="default">
            Analyze another
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">
            <Sparkles className="mr-1.5 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="speech">
            <MessageSquare className="mr-1.5 h-4 w-4" /> Speech
          </TabsTrigger>
          <TabsTrigger value="body">
            <Activity className="mr-1.5 h-4 w-4" /> Body
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <Eye className="mr-1.5 h-4 w-4" /> Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ScoreCard label="Fluency" value={analysis.fluencyScore} />
            <ScoreCard label="Grammar" value={analysis.grammarScore} />
            <ScoreCard label="Body Language" value={analysis.postureScore} />
            <ScoreCard label="Confidence" value={analysis.confidenceScore} accent />
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-card backdrop-blur">
            <h3 className="mb-2 text-lg font-semibold">Performance Profile</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              How you scored across the five core presentation dimensions.
            </p>
            <ScoreRadar data={radarData} />
          </div>
        </TabsContent>

        <TabsContent value="speech" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <ScoreCard
              label="Pace"
              value={analysis.wpm}
              suffix=" WPM"
            />
            <ScoreCard
              label="Filler Words"
              value={analysis.fillerCount}
              suffix=""
            />
            <ScoreCard
              label="Vocabulary"
              value={Math.round(analysis.vocabularyRichness * 100)}
              suffix="%"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur">
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="mr-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-glow">
                Pace
              </span>
              {analysis.paceFeedback}
            </p>
          </div>

          {analysis.fillerWords.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur">
              <h3 className="mb-3 text-base font-semibold">Filler word breakdown</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.fillerWords}>
                    <XAxis
                      dataKey="word"
                      tick={{ fill: "oklch(0.75 0.02 270)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "oklch(0.6 0.02 270)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {analysis.fillerWords.map((_, i) => (
                        <Cell key={i} fill="oklch(0.78 0.18 305)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {analysis.grammarIssues.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
              <h3 className="mb-2 text-base font-semibold">Grammar notes</h3>
              <ul className="space-y-2">
                {analysis.grammarIssues.map((g, i) => (
                  <li key={i} className="text-sm text-foreground/90">
                    • {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.suggestions.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h3 className="mb-2 text-base font-semibold">Improvement tips</h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-foreground/90">
                    {i + 1}. {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border bg-card/60 px-5 shadow-card backdrop-blur"
          >
            <AccordionItem value="t" className="border-0">
              <AccordionTrigger>View full transcript</AccordionTrigger>
              <AccordionContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {analysis.transcript || "(no speech detected)"}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="body" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <ScoreCard label="Posture" value={analysis.postureScore} />
            <ScoreCard label="Eye Contact" value={analysis.eyeContactScore} />
            <ScoreCard
              label="Face Visible"
              value={Math.round(analysis.faceVisibleRatio * 100)}
              suffix="%"
            />
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gesture activity:{" "}
              <span className="text-foreground">{analysis.gestureActivity}</span>
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {analysis.bodyLanguageSummary}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <div className="rounded-2xl border border-primary/30 bg-card/60 p-6 shadow-elegant backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold">Your AI mentor feedback</h3>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              {analysis.mentorFeedback
                .split(/\n\n+/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
