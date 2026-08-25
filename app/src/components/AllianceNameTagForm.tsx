"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateAllianceNameTagAction } from "@/app/actions/alliance";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function AllianceNameTagForm({ tag, name }: { tag: string; name: string }) {
  const t = useTranslations("AllianceHeader");
  const [state, formAction, pending] = useActionState(updateAllianceNameTagAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-center gap-1.5 mt-1.5">
      <div className="flex gap-2">
        <div>
          <label className="field-label" htmlFor="alliance-tag">
            {t("tagLabel")}
          </label>
          <input
            id="alliance-tag"
            name="tag"
            defaultValue={tag}
            maxLength={3}
            required
            className="field-input uppercase !text-xs !py-1.5 !w-16"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="alliance-name">
            {t("nameLabel")}
          </label>
          <input
            id="alliance-name"
            name="name"
            defaultValue={name}
            required
            className="field-input !text-xs !py-1.5 !w-48"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-ghost !text-xs !py-1.5 shrink-0 self-end"
        >
          {pending ? t("savingNameTag") : t("saveNameTag")}
        </button>
      </div>
      {state?.error && <p className="text-red text-xs">{state.error}</p>}
      {state?.success && <p className="text-green text-xs">{state.success}</p>}
    </form>
  );
}
