"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import AccountPicker from "@/components/AccountPicker";
import HiveComposition from "@/components/HiveComposition";
import { attackScore, computeSetter, defenseScore, type AccountLike } from "@/lib/domain";
import { formatPower } from "@/lib/format";

export default function CompetitivePageClient({
  accounts,
  canReorganize = false,
}: {
  accounts: AccountLike[];
  // Team admin or leadership only — lets them right-click a Hive
  // Composition cell to swap in a different account.
  canReorganize?: boolean;
}) {
  const t = useTranslations("CompetitivePageClient");
  const locale = useLocale();
  // Only the roster's top 15 accounts by power are preselected — a large
  // alliance's whole roster rarely belongs in one Hive Composition, and
  // power is the simplest, least surprising default ranking to start
  // from. Still just a starting point: the picker lets anyone add or
  // remove accounts from there.
  const [selected, setSelected] = useState<Set<bigint>>(
    () =>
      new Set(
        [...accounts]
          .sort((a, b) => b.power - a.power)
          .slice(0, 15)
          .map((a) => a.gameId)
      )
  );
  const [manualSetterId, setManualSetterId] = useState<string>("auto");

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selected.has(a.gameId)),
    [accounts, selected]
  );

  const computedSetter = useMemo(() => computeSetter(selectedAccounts), [selectedAccounts]);
  const setter =
    manualSetterId !== "auto"
      ? selectedAccounts.find((a) => a.gameId.toString() === manualSetterId) ?? computedSetter
      : computedSetter;

  const totalPower = selectedAccounts.reduce((sum, a) => sum + a.power, 0);
  const bestAttack = [...selectedAccounts].sort(
    (a, b) => attackScore(b) - attackScore(a)
  )[0];
  const bestDefense = [...selectedAccounts].sort(
    (a, b) => defenseScore(b) - defenseScore(a)
  )[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <AccountPicker accounts={accounts} selected={selected} onChange={setSelected} />

        <div className="flex items-center gap-2">
          <label className="field-label mb-0" htmlFor="setter">
            {t("setterLabel")}
          </label>
          <select
            id="setter"
            className="field-input !w-auto"
            value={manualSetterId}
            onChange={(e) => setManualSetterId(e.target.value)}
          >
            <option value="auto">{t("autoComputed")}</option>
            {selectedAccounts.map((a) => (
              <option key={a.gameId.toString()} value={a.gameId.toString()}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <div className="kpi-card">
          <span className="field-label mb-1">{t("selectionPowerLabel")}</span>
          <span className="font-data text-xl text-gold">{formatPower(totalPower)}</span>
          <span className="text-text-dim text-xs mt-0.5">
            {t("accountsCount", { count: selectedAccounts.length })}
          </span>
        </div>
        <div className="kpi-card">
          <span className="field-label mb-1">{t("setterTileLabel")}</span>
          {setter ? (
            <>
              <span className="font-data text-xl text-gold">{setter.name}</span>
              <span className="text-text-dim text-xs mt-0.5">
                {manualSetterId !== "auto" ? t("forced") : t("calculated")}
              </span>
            </>
          ) : (
            <span className="text-text-dim">—</span>
          )}
        </div>
        <div className="kpi-card">
          <span className="field-label mb-1">{t("bestAttackLabel")}</span>
          {bestAttack ? (
            <>
              <span className="font-data text-xl text-orange">{bestAttack.name}</span>
              <span className="text-text-dim text-xs mt-0.5">
                {attackScore(bestAttack).toLocaleString(locale)}
              </span>
            </>
          ) : (
            <span className="text-text-dim">—</span>
          )}
        </div>
        <div className="kpi-card">
          <span className="field-label mb-1">{t("bestDefenseLabel")}</span>
          {bestDefense ? (
            <>
              <span className="font-data text-xl text-steel">{bestDefense.name}</span>
              <span className="text-text-dim text-xs mt-0.5">
                {defenseScore(bestDefense).toLocaleString(locale)}
              </span>
            </>
          ) : (
            <span className="text-text-dim">—</span>
          )}
        </div>
      </div>

      <div>
        <div className="section-label">Hive Composition</div>
        <div className="panel p-4">
          <HiveComposition
            accounts={selectedAccounts}
            setter={setter ?? null}
            canReorganize={canReorganize}
          />
        </div>
      </div>
    </div>
  );
}
