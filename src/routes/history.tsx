import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useUser } from "@/hooks/use-user";
import { getAnalysisHistory, type Analysis } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Analysis History — AI Presentation Analyzer" },
      { name: "description", content: "Review your past presentation analyses and track score progress over time." },
      { property: "og:title", content: "Analysis History — AI Presentation Analyzer" },
      { property: "og:description", content: "Review your past presentation analyses and track score progress over time." },
    ],
  }),
  component: HistoryPage,
});

function scoreColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score > 75) return "text-green-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function HistoryPage() {
  const { user, loading: authLoading } = useUser();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAnalysisHistory(user.id)
      .then((data) => {
        if (!cancelled) setAnalyses(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background px-4 pt-24 pb-16">
        <div className="mx-auto max-w-4xl text-center text-muted-foreground">Loading…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background px-4 pt-24 pb-16">
        <div className="mx-auto max-w-4xl text-center text-destructive">{error}</div>
      </main>
    );
  }

  const list = analyses ?? [];

  const chartData = [...list]
    .reverse()
    .filter((a) => a.final_score != null)
    .map((a) => ({
      date: a.created_at ? new Date(a.created_at).toLocaleDateString() : "",
      score: Number(a.final_score),
    }));

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Your analysis history</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <Upload className="mr-1.5 h-4 w-4" /> New analysis
            </Link>
          </Button>
        </div>

        {list.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">
                No analyses yet — upload your first presentation to get started.
              </p>
              <Button asChild className="mt-6">
                <Link to="/">Upload presentation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {chartData.length > 1 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-base">Final score over time</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {list.map((a) => {
                const isOpen = expanded[a.id];
                const date = a.created_at ? new Date(a.created_at).toLocaleString() : "";
                return (
                  <Card key={a.id}>
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">{date}</div>
                          <div className={`mt-1 text-4xl font-bold ${scoreColor(a.final_score != null ? Number(a.final_score) : null)}`}>
                            {a.final_score != null ? Number(a.final_score).toFixed(0) : "—"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant="secondary">Fluency {fmt(a.fluency_score)}</Badge>
                          <Badge variant="secondary">Grammar {fmt(a.grammar_score)}</Badge>
                          <Badge variant="secondary">Confidence {fmt(a.confidence_score)}</Badge>
                          <Badge variant="secondary">Posture {fmt(a.posture_score)}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpanded((s) => ({ ...s, [a.id]: !s[a.id] }))}
                          >
                            {isOpen ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                            {isOpen ? "Hide" : "View details"}
                          </Button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
                          <Detail label="Fluency" value={a.fluency_score} />
                          <Detail label="Grammar" value={a.grammar_score} />
                          <Detail label="Confidence" value={a.confidence_score} />
                          <Detail label="Posture" value={a.posture_score} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function fmt(v: number | null | undefined) {
  return v != null ? Number(v).toFixed(0) : "—";
}

function Detail({ label, value }: { label: string; value: number | null | undefined }) {
  const num = value != null ? Number(value) : null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${scoreColor(num)}`}>
        {num != null ? num.toFixed(0) : "—"}
      </div>
    </div>
  );
}
