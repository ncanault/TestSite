"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createAllianceAction } from "@/app/actions/alliance";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function CreateTeamForm() {
  const t = useTranslations("CreateAlliance");
  const [state, formAction, pending] = useActionState(createAllianceAction, initialState);

  return (
    <form action={formAction} className="panel p-6 flex flex-col gap-4 max-w-md">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label" htmlFor="tag">
            {t("tagLabel")}
          </label>
          <input
            className="field-input uppercase"
            id="tag"
            name="tag"
            placeholder="xXx"
            maxLength={3}
            required
          />
        </div>
        <div className="col-span-2">
          <label className="field-label" htmlFor="name">
            {t("nameLabel")}
          </label>
          <input
            className="field-input"
            id="name"
            name="name"
            placeholder="Your Alliance Name"
            required
          />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="serverNumber">
          {t("serverLabel")}
        </label>
        <input
          className="field-input"
          id="serverNumber"
          name="serverNumber"
          placeholder="000"
          required
        />
      </div>

      {state?.error && (
        <p className="text-red text-sm" aria-live="polite">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? t("submitPending") : t("submit")}
      </button>
    </form>
  );
}
