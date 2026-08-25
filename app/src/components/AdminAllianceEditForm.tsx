"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { adminUpdateAllianceAction } from "@/app/actions/admin";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function AdminAllianceEditForm({
  allianceId,
  tag,
  name,
  onDone,
}: {
  allianceId: string;
  tag: string;
  name: string;
  onDone: () => void;
}) {
  const t = useTranslations("AdminPage");
  const tAlliance = useTranslations("AllianceHeader");
  const [state, formAction, pending] = useActionState(adminUpdateAllianceAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input type="hidden" name="allianceId" value={allianceId} />
        <input
          name="tag"
          defaultValue={tag}
          maxLength={3}
          required
          className="field-input uppercase !text-xs !py-1 !w-16"
        />
        <input name="name" defaultValue={name} required className="field-input !text-xs !py-1 !w-40" />
        <button type="submit" disabled={pending} className="btn btn-ghost !text-xs !py-1">
          {pending ? tAlliance("savingNameTag") : tAlliance("saveNameTag")}
        </button>
        <button type="button" onClick={onDone} className="text-text-dim hover:text-text text-xs">
          {t("cancel")}
        </button>
      </div>
      {state?.error && <p className="text-red text-xs">{state.error}</p>}
    </form>
  );
}
