"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loginAction, type ActionState } from "@/app/actions/auth";

const initialState: ActionState = undefined;

export default function LoginPage() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="max-w-sm mx-auto py-8 sm:py-16 reveal">
      <div className="text-center mb-8">
        <h1 className="text-2xl">{t("loginTitle")}</h1>
        <p className="text-text-dim text-sm mt-1">{t("loginSubtitle")}</p>
      </div>

      <form action={formAction} className="panel p-6 flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor="email">
            {t("emailLabel")}
          </label>
          <input
            className="field-input"
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            {t("passwordLabel")}
          </label>
          <input
            className="field-input"
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>

        {state?.error && (
          <p className="text-red text-sm" aria-live="polite">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary mt-2">
          {pending ? t("loginButtonPending") : t("loginButton")}
        </button>
      </form>

      <p className="text-text-dim text-sm mt-5 text-center">
        {t("noAccountYet")}{" "}
        <Link href="/register" className="text-gold hover:underline">
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
