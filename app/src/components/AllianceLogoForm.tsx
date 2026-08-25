"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateAllianceLogoAction } from "@/app/actions/alliance";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function AllianceLogoForm({ currentUrl }: { currentUrl: string | null }) {
  const t = useTranslations("AllianceHeader");
  const [state, formAction, pending] = useActionState(updateAllianceLogoAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-center gap-1.5">
      <div className="flex gap-2">
        <input
          type="url"
          name="logoUrl"
          defaultValue={currentUrl ?? ""}
          placeholder={t("logoUrlPlaceholder")}
          className="field-input !text-xs !py-1.5 !w-64"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn btn-ghost !text-xs !py-1.5 shrink-0"
        >
          {pending ? t("uploading") : t("changeLogo")}
        </button>
      </div>
      {state?.error && <p className="text-red text-xs">{state.error}</p>}
      {state?.success && <p className="text-green text-xs">{state.success}</p>}
    </form>
  );
}
