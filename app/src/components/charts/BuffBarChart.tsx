"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";

type Point = { name: string; value: number };

function ChartTooltip({
  active,
  payload,
  color,
  locale,
}: {
  active?: boolean;
  payload?: { value: number; payload: Point }[];
  color: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="panel px-3 py-2 text-xs">
      <p className="text-text mb-0.5">{p.name}</p>
      <p className="font-data" style={{ color }}>
        {p.value.toLocaleString(locale)}
      </p>
    </div>
  );
}

const ROW_HEIGHT = 28;
const MIN_HEIGHT = 140;

export default function BuffBarChart({
  title,
  color,
  data,
}: {
  title: string;
  color: string;
  data: Point[];
}) {
  const t = useTranslations("BuffBarChart");
  const locale = useLocale();
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const height = Math.max(MIN_HEIGHT, sorted.length * ROW_HEIGHT + 24);

  return (
    <div className="panel p-4">
      <p className="font-display text-sm mb-3" style={{ color }}>
        {title}
      </p>
      {sorted.length === 0 ? (
        <p className="text-text-dim text-sm py-8 text-center">{t("noData")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis
              type="number"
              tick={{ fill: "var(--text-dim)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "var(--text-dim)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={<ChartTooltip color={color} locale={locale} />}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value) =>
                  typeof value === "number" ? value.toLocaleString(locale) : value
                }
                style={{ fill: color, fontFamily: "var(--font-data), monospace", fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
