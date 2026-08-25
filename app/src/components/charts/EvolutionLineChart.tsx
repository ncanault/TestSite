"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";

export const LINE_PALETTE = [
  "var(--gold)",
  "var(--steel)",
  "var(--orange)",
  "var(--green)",
  "var(--purple)",
  "var(--khaki)",
  "var(--red)",
];

// Distinct dash patterns per series, layered on top of color, so identity
// never depends on hue alone when several lines are compared at once.
const DASH_PATTERNS = ["0", "6 3", "2 3", "8 3 2 3", "1 3", "10 3 2 3", "4 2"];

export type SeriesPoint = { capturedAt: number; value: number };

export default function EvolutionLineChart({
  series,
  metricLabel,
}: {
  series: { accountId: string; accountName: string; points: SeriesPoint[] }[];
  metricLabel: string;
}) {
  const t = useTranslations("EvolutionLineChart");
  const locale = useLocale();

  if (series.length === 0) {
    return <p className="text-text-dim text-sm py-16 text-center">{t("selectPrompt")}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="capturedAt"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v: number) => new Date(v).toLocaleDateString(locale)}
          tick={{ fill: "var(--text-dim)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-dim)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
          label={{
            value: metricLabel,
            angle: -90,
            position: "insideLeft",
            fill: "var(--text-dim)",
            fontSize: 11,
          }}
        />
        <Tooltip
          labelFormatter={(v) => new Date(Number(v)).toLocaleDateString(locale)}
          contentStyle={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--text)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-dim)" }}
          formatter={(value: string) => <span style={{ color: "var(--text-dim)" }}>{value}</span>}
        />
        {series.map((s, i) => (
          <Line
            key={s.accountId}
            data={s.points}
            dataKey="value"
            name={s.accountName}
            stroke={LINE_PALETTE[i % LINE_PALETTE.length]}
            strokeWidth={2}
            strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
            dot={{ r: 3, strokeWidth: 2, stroke: "var(--panel)" }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--panel)" }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
