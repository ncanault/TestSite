"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { upsertAccountAction } from "@/app/actions/account";
import type { ActionState } from "@/app/actions/auth";
import { TROOPS, type StatKind, type Troop } from "@/lib/stats";

const initialState: ActionState = undefined;

export type AccountFormValues = {
  gameId?: string;
  name?: string;
  keep?: number;
  power?: number;
  rally?: number;
  rein?: number;
  // The 36 troop-stat fields (see src/lib/stats.ts), indexed generically.
  [key: string]: number | string | undefined;
};

const STAT_KINDS: StatKind[] = ["attack", "hp", "defense"];

function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

// Field name for a given phase ("atk" | "def"), troop, and stat — matches
// src/lib/stats.ts. `debuff` only applies to the "def" phase.
function statField(phase: "atk" | "def", troop: Troop, stat: StatKind, debuff = false) {
  return `${phase}${capitalize(troop)}${debuff ? "Debuff" : ""}${capitalize(stat)}`;
}

function IconSwords() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      className="w-[18px] h-[18px]"
    >
      <path d="M4.5 19.5 17 7" strokeLinecap="round" />
      <path d="M12.2 11.8 15.5 8.5" strokeLinecap="round" />
      <circle cx="4.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M19.5 19.5 7 7" strokeLinecap="round" />
      <path d="M11.8 11.8 8.5 8.5" strokeLinecap="round" />
      <circle cx="19.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M12 2.5 19 5.3v5.4c0 5-3.2 8.9-7 10.1-3.8-1.2-7-5.1-7-10.1V5.3Z" />
    </svg>
  );
}

// A shield with a downward notch — debuffs reduce the enemy's stats, the
// opposite direction of a buff.
function IconDebuff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
      <path d="M12 2.5 19 5.3v5.4c0 5-3.2 8.9-7 10.1-3.8-1.2-7-5.1-7-10.1V5.3Z" strokeLinejoin="round" />
      <path d="M9 10.5 12 14l3-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AccountForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: AccountFormValues;
  onSaved?: () => void;
  // Lets whoever opened the form back out without submitting — until this,
  // opening "Edit" only ever closed by way of a successful (or failed)
  // save, with no way to just change your mind.
  onCancel?: () => void;
}) {
  const t = useTranslations("AccountForm");
  const [state, formAction, pending] = useActionState(upsertAccountAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!initial?.gameId;

  useEffect(() => {
    if (state?.success) {
      if (!isEdit) formRef.current?.reset();
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Every phase section below shares the same shape: one column per troop
  // type (Ground, Ranged, Cavalry, Siege), each carrying the same 3 stats
  // (Attack, HP, Defense) — either as buffs (phase "atk"/"def") or, in
  // Defense's third block, as debuffs applied to the enemy.
  const renderPhase = (phase: "atk" | "def", debuff = false) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {TROOPS.map((troop) => (
        <div key={troop} className="flex flex-col gap-2">
          <p className="text-text-dim text-xs uppercase tracking-wide">{t(`troop.${troop}`)}</p>
          {STAT_KINDS.map((stat) => {
            const key = statField(phase, troop, stat, debuff);
            return (
              <div key={key}>
                <label className="field-label" htmlFor={key}>
                  {t(`subStat.${stat}`)}
                </label>
                <input
                  className="field-input"
                  id={key}
                  name={key}
                  type="number"
                  min={0}
                  defaultValue={initial?.[key] ?? 0}
                  required
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <form ref={formRef} action={formAction} className="panel p-5 flex flex-col gap-5">
      <div>
        <p className="field-label mb-2 text-gold-dim">{t("generalSection")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="col-span-2">
            <label className="field-label" htmlFor="gameId">
              {t("gameIdLabel")}
            </label>
            <input
              className="field-input font-data disabled:opacity-60"
              id="gameId"
              name="gameId"
              inputMode="numeric"
              pattern="\d*"
              placeholder="123456789"
              defaultValue={initial?.gameId}
              readOnly={isEdit}
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="field-label" htmlFor="name">
              {t("nameLabel")}
            </label>
            <input
              className="field-input"
              id="name"
              name="name"
              defaultValue={initial?.name}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="keep">
              Keep
            </label>
            <input
              className="field-input"
              id="keep"
              name="keep"
              type="number"
              min={0}
              defaultValue={initial?.keep}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="power">
              {t("powerLabel")}
            </label>
            <input
              className="field-input"
              id="power"
              name="power"
              type="number"
              step="0.1"
              min={0}
              defaultValue={initial?.power}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rally">
              {t("rallyLabel")}
            </label>
            <input
              className="field-input"
              id="rally"
              name="rally"
              type="number"
              min={0}
              defaultValue={initial?.rally ?? 0}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rein">
              {t("reinLabel")}
            </label>
            <input
              className="field-input"
              id="rein"
              name="rein"
              type="number"
              min={0}
              defaultValue={initial?.rein ?? 0}
              required
            />
          </div>
        </div>
      </div>

      <div>
        <p className="field-label mb-2 text-orange flex items-center gap-1.5">
          <IconSwords />
          {t("attackPhaseSection")}
        </p>
        {renderPhase("atk")}
      </div>

      <div>
        <p className="field-label mb-2 text-steel flex items-center gap-1.5">
          <IconShield />
          {t("defensePhaseBuffsSection")}
        </p>
        {renderPhase("def")}
      </div>

      <div>
        <p className="field-label mb-2 text-red flex items-center gap-1.5">
          <IconDebuff />
          {t("defensePhaseDebuffsSection")}
        </p>
        {renderPhase("def", true)}
      </div>

      {state?.error && (
        <p className="text-red text-sm" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-green text-sm" aria-live="polite">
          {state.success}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t("submitPending") : isEdit ? t("submitUpdate") : t("submitAdd")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
