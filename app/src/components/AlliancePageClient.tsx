"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import BuffBarChart from "@/components/charts/BuffBarChart";
import EvolutionLineChart, {
  LINE_PALETTE,
  type SeriesPoint,
} from "@/components/charts/EvolutionLineChart";
import { attackScore, defenseScore, type AccountLike } from "@/lib/domain";
import {
  ATTACK_BUFF_FIELDS,
  DEFENSE_BUFF_FIELDS,
  DEFENSE_DEBUFF_FIELDS,
  type StatField,
  type StatKind,
  type Troop,
} from "@/lib/stats";

export type HistoryPoint = AccountLike & { accountGameId: bigint; capturedAt: number };

const TROOP_COLOR: Record<Troop, string> = {
  ground: "var(--khaki)",
  ranged: "var(--green)",
  cavalry: "var(--purple)",
  siege: "var(--orange)",
};

// The three phase blocks share the same shape: 12 fields (4 troop types x
// Attack/HP/Defense), rendered as one small bar chart per field, colored by
// troop type.
const PHASE_BLOCKS: { titleKey: string; fields: StatField[] }[] = [
  { titleKey: "attackPhaseTitle", fields: ATTACK_BUFF_FIELDS },
  { titleKey: "defensePhaseBuffsTitle", fields: DEFENSE_BUFF_FIELDS },
  { titleKey: "defensePhaseDebuffsTitle", fields: DEFENSE_DEBUFF_FIELDS },
];

const STAT_KINDS: StatKind[] = ["attack", "hp", "defense"];

// Evolution-chart metric options: overall power/scores, plus every one of
// the 36 troop stats (labeled Phase . Troop . Stat since e.g. "Ground
// Attack" exists in both the Attack-phase and Defense-phase buff blocks).
const SCORE_METRICS: { key: string; get: (a: AccountLike) => number }[] = [
  { key: "power", get: (a) => a.power },
  { key: "attackScore", get: attackScore },
  { key: "defenseScore", get: defenseScore },
];

function statMetrics(phaseKey: string, fields: StatField[]) {
  return fields.map((f) => ({
    key: f.field,
    phaseKey,
    troop: f.troop,
    stat: f.stat,
    get: (a: AccountLike) => (a as unknown as Record<string, number>)[f.field],
  }));
}

const STAT_METRICS = [
  ...statMetrics("attackPhaseShort", ATTACK_BUFF_FIELDS),
  ...statMetrics("defensePhaseBuffsShort", DEFENSE_BUFF_FIELDS),
  ...statMetrics("defensePhaseDebuffsShort", DEFENSE_DEBUFF_FIELDS),
];

export default function AlliancePageClient({
  accounts,
  history,
}: {
  accounts: AccountLike[];
  history: HistoryPoint[];
}) {
  const t = useTranslations("AlliancePageClient");
  const [selected, setSelected] = useState<bigint[]>(() =>
    accounts.slice(0, 4).map((a) => a.gameId)
  );
  const [metricKey, setMetricKey] = useState(SCORE_METRICS[0].key);
  // Phase is a tab (one visible at a time) and stat is a filter within it —
  // together they cut what used to be 36 always-visible bar charts down to
  // 4 (one per troop), the actual point of both controls.
  const [activePhase, setActivePhase] = useState(0);
  const [activeStat, setActiveStat] = useState<StatKind>("attack");

  const METRICS = useMemo(
    () => [
      ...SCORE_METRICS.map((m) => ({ key: m.key, get: m.get, label: t(`metric.${m.key}`) })),
      ...STAT_METRICS.map((m) => ({
        key: m.key,
        get: m.get,
        label: `${t(m.phaseKey)} · ${t(`troop.${m.troop}`)} · ${t(`subStat.${m.stat}`)}`,
      })),
    ],
    [t]
  );
  const metric = useMemo(
    () => METRICS.find((m) => m.key === metricKey) ?? METRICS[0],
    [METRICS, metricKey]
  );

  const byAccount = useMemo(() => {
    const map = new Map<bigint, HistoryPoint[]>();
    for (const h of history) {
      if (!map.has(h.accountGameId)) map.set(h.accountGameId, []);
      map.get(h.accountGameId)!.push(h);
    }
    for (const points of map.values()) points.sort((a, b) => a.capturedAt - b.capturedAt);
    return map;
  }, [history]);

  const lineSeries = useMemo(
    () =>
      selected
        .map((id) => accounts.find((a) => a.gameId === id))
        .filter((a): a is AccountLike => !!a)
        .map((a) => {
          const points: SeriesPoint[] = (byAccount.get(a.gameId) ?? []).map((h) => ({
            capturedAt: h.capturedAt,
            value: metric.get(h),
          }));
          return { accountId: a.gameId.toString(), accountName: a.name, points };
        }),
    [selected, accounts, byAccount, metric]
  );

  function toggle(id: bigint) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const currentPhase = PHASE_BLOCKS[activePhase];
  // buildFields (lib/stats.ts) iterates troops outer, stat inner, so
  // filtering to one stat naturally keeps TROOPS order (Ground, Ranged,
  // Cavalry, Siege) — exactly the 4 that go on one row.
  const currentFields = currentPhase.fields.filter((f) => f.stat === activeStat);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="flex gap-1 border-b border-border mb-4" role="tablist">
          {PHASE_BLOCKS.map((block, i) => (
            <button
              key={block.titleKey}
              type="button"
              role="tab"
              aria-selected={activePhase === i}
              onClick={() => setActivePhase(i)}
              className={`px-4 py-2.5 font-display text-sm border-b-2 -mb-px transition-colors ${
                activePhase === i
                  ? "text-gold border-gold"
                  : "text-text-dim border-transparent hover:text-text"
              }`}
            >
              {t(block.titleKey)}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 mb-4">
          {STAT_KINDS.map((stat) => (
            <button
              key={stat}
              type="button"
              onClick={() => setActiveStat(stat)}
              className={`pill ${activeStat === stat ? "active" : ""}`}
            >
              {t(`subStat.${stat}`)}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentFields.map((f) => (
            <BuffBarChart
              key={f.field}
              title={t(`troop.${f.troop}`)}
              color={TROOP_COLOR[f.troop]}
              data={accounts.map((a) => ({
                name: a.name,
                value: (a as unknown as Record<string, number>)[f.field],
              }))}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="section-label">{t("evolutionTitle")}</div>
        <div className="panel p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <label className="field-label" htmlFor="metric">
                {t("metricLabel")}
              </label>
              <select
                id="metric"
                className="field-input !w-auto"
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
              >
                {METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[240px]">
              <p className="field-label mb-1">{t("comparedAccountsLabel")}</p>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => {
                  const active = selected.includes(a.gameId);
                  return (
                    <button
                      key={a.gameId.toString()}
                      type="button"
                      onClick={() => toggle(a.gameId)}
                      className={`pill ${active ? "active" : ""}`}
                      style={
                        active
                          ? {
                              borderColor:
                                LINE_PALETTE[selected.indexOf(a.gameId) % LINE_PALETTE.length],
                              color:
                                LINE_PALETTE[selected.indexOf(a.gameId) % LINE_PALETTE.length],
                            }
                          : undefined
                      }
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <EvolutionLineChart series={lineSeries} metricLabel={metric.label} />
        </div>
      </div>
    </div>
  );
}
