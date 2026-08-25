"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { requestSubscriptionAction } from "@/app/actions/subscription";
import type { ActionState } from "@/app/actions/auth";
import type { Tier } from "@prisma/client";

const initialState: ActionState = undefined;

export default function RequestSubscriptionForm({
  tier,
}: {
  tier: Exclude<Tier, "NONE" | "FREE">;
}) {
  const t = useTranslations("Pricing");
  const [state, formAction, pending] = useActionState(
    requestSubscriptionAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 mt-3">
      <input type="hidden" name="tier" value={tier} />
      <input
        className="field-input !text-xs"
        name="paypalRef"
        placeholder={t("paypalRefPlaceholder")}
      />
      <button type="submit" disabled={pending} className="btn btn-primary !text-xs w-full">
        {pending ? t("requestPending") : t("requestActivation")}
      </button>
      {state?.error && (
        <p className="text-red text-xs" aria-live="polite">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-green text-xs" aria-live="polite">
          {state.success}
        </p>
      )}
    </form>
  );
}
