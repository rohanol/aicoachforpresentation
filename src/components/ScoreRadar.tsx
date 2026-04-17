import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { metric: string; value: number }[];
}

export function ScoreRadar({ data }: Props) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="oklch(0.4 0.03 270 / 0.5)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "oklch(0.85 0.01 260)", fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "oklch(0.6 0.02 270)", fontSize: 10 }}
            stroke="oklch(0.4 0.03 270 / 0.5)"
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="oklch(0.78 0.18 305)"
            strokeWidth={2}
            fill="oklch(0.68 0.2 285)"
            fillOpacity={0.45}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
