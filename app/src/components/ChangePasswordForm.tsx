"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction } from "@/app/actions/profile";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function ChangePasswordForm() {
  const t = useTranslations("Account");
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="panel p-6 flex flex-col gap-4 max-w-md">
      <div>
        <label className="field-label" htmlFor="currentPassword">
          {t("currentPasswordLabel")}
        </label>
        <input
          className="field-input"
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="newPassword">
          {t("newPasswordLabel")}
        </label>
        <input
          className="field-input"
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="confirmPassword">
          {t("confirmPasswordLabel")}
        </label>
        <input
          className="field-input"
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <p className="text-text-dim text-xs leading-relaxed">{t("passwordDisclaimer")}</p>

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

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? t("submitPending") : t("submit")}
      </button>
    </form>
  );
}
