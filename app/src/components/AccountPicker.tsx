"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPower } from "@/lib/format";
import type { AccountLike } from "@/lib/domain";

// Roster filter: classed by power, and it auto-hides the full pill list
// unless the user is actively filtering — keeps the page compact on large
// rosters while staying a single click away from a full re-selection.
export default function AccountPicker({
  accounts,
  selected,
  onChange,
}: {
  accounts: AccountLike[];
  selected: Set<bigint>;
  onChange: (next: Set<bigint>) => void;
}) {
  const t = useTranslations("AccountPicker");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...accounts].sort((a, b) => b.power - a.power),
    [accounts]
  );
  const filtered = sorted.filter((a) =>
    a.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggle(id: bigint) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost !text-xs" onClick={() => setOpen(true)}>
          {t("filterButton", { selected: selected.size, total: accounts.length })}
        </button>
        <div className="flex flex-wrap gap-1.5">
          {sorted
            .filter((a) => selected.has(a.gameId))
            .slice(0, 8)
            .map((a) => (
              <span key={a.gameId.toString()} className="pill active">
                {a.name}
              </span>
            ))}
          {selected.size > 8 && (
            <span className="pill">+{selected.size - 8}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-3 mb-3">
        <input
          autoFocus
          className="field-input flex-1"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost !text-xs"
          onClick={() => onChange(new Set(accounts.map((a) => a.gameId)))}
        >
          {t("allButton")}
        </button>
        <button type="button" className="btn btn-ghost !text-xs" onClick={() => onChange(new Set())}>
          {t("noneButton")}
        </button>
        <button type="button" className="btn btn-primary !text-xs" onClick={() => setOpen(false)}>
          {t("closeButton")}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
        {filtered.map((a) => (
          <button
            key={a.gameId.toString()}
            type="button"
            onClick={() => toggle(a.gameId)}
            className={`pill ${selected.has(a.gameId) ? "active" : ""}`}
          >
            {a.name} <span className="text-text-dim ml-1">{formatPower(a.power)}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-text-dim text-sm py-4">{t("noAccountsFound")}</p>
        )}
      </div>
    </div>
  );
}
