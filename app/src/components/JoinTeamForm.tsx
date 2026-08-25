"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestJoinAllianceAction } from "@/app/actions/alliance";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function JoinTeamForm() {
  const t = useTranslations("JoinAlliance");
  const [state, formAction, pending] = useActionState(requestJoinAllianceAction, initialState);

  return (
    <form action={formAction} className="panel p-6 flex flex-col gap-4 max-w-md">
      <p className="text-text-dim text-xs -mt-1">{t("intro")}</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label" htmlFor="join-serverNumber">
            {t("serverLabel")}
          </label>
          <input
            className="field-input"
            id="join-serverNumber"
            name="serverNumber"
            placeholder="000"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="join-tag">
            {t("tagLabel")}
          </label>
          <input
            className="field-input uppercase"
            id="join-tag"
            name="tag"
            placeholder="xXx"
            maxLength={3}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="join-gameId">
            {t("gameIdLabel")}
          </label>
          <input className="field-input" id="join-gameId" name="gameId" placeholder="123456789" required />
        </div>
      </div>

      {state?.error && (
        <p className="text-red text-sm" aria-live="polite">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-ghost self-start">
        {pending ? t("submitPending") : t("submit")}
      </button>
    </form>
  );
}
