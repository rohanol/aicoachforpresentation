interface Props {
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
}

export function ScoreCard({ label, value, suffix = "/100", accent = false }: Props) {
  const display = Number.isFinite(value) ? value.toFixed(1).replace(/\.0$/, ".0") : "—";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card/60 p-4 shadow-card backdrop-blur transition-smooth hover:-translate-y-0.5 hover:shadow-elegant ${
        accent ? "ring-1 ring-primary/40" : ""
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${
          accent ? "text-gradient-score" : "text-foreground"
        }`}
      >
        {display}
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          {suffix}
        </span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary transition-smooth"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
