"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerAction, type ActionState } from "@/app/actions/auth";
import { listAlliancesForServerAction } from "@/app/actions/alliance";

const initialState: ActionState = undefined;

type AllianceOption = { tag: string; name: string };

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const tCreate = useTranslations("CreateAlliance");
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  const [serverNumber, setServerNumber] = useState("");
  // null = not looked up yet, [] = looked up, nothing found on that server.
  const [alliances, setAlliances] = useState<AllianceOption[] | null>(null);
  const [mode, setMode] = useState<"join" | "create">("join");
  const [tag, setTag] = useState("");

  // Looks up existing alliances the moment a server number is typed, so the
  // tag field becomes "pick your alliance" instead of "hope you spelled its
  // tag right" — and falls back to the alliance-creation fields on its own
  // once a server has been searched and nothing came back.
  useEffect(() => {
    const trimmed = serverNumber.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await listAlliancesForServerAction(trimmed);
      if (cancelled) return;
      setAlliances(result);
      setMode(result.length > 0 ? "join" : "create");
      setTag("");
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serverNumber]);

  function handleServerNumberChange(value: string) {
    setServerNumber(value);
    // Clearing the field is a plain event, not a subscription update —
    // reset synchronously here instead of from the debounced effect above.
    if (!value.trim()) setAlliances(null);
  }

  const hasTeamInput = serverNumber.trim() !== "";
  const teamMode = hasTeamInput ? mode : "";

  return (
    <div className="max-w-sm mx-auto py-8 sm:py-16 reveal">
      <div className="text-center mb-8">
        <h1 className="text-2xl">{t("registerTitle")}</h1>
        <p className="text-text-dim text-sm mt-1">{t("registerSubtitle")}</p>
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
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="playerName">
              {t("playerNameLabel")}
            </label>
            <input className="field-input" id="playerName" name="playerName" required />
          </div>
          <div>
            <label className="field-label" htmlFor="gameId">
              {t("gameIdLabel")}
            </label>
            <input className="field-input" id="gameId" name="gameId" placeholder="123456789" />
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-1 flex flex-col gap-4">
          <div>
            <p className="text-text text-sm">{t("joinTeamLabel")}</p>
            <p className="text-text-dim text-xs mt-0.5">{t("joinTeamHint")}</p>
          </div>

          <input type="hidden" name="teamMode" value={teamMode} />

          <div>
            <label className="field-label" htmlFor="serverNumber">
              {t("serverLabel")}
            </label>
            <input
              className="field-input"
              id="serverNumber"
              name="serverNumber"
              placeholder="000"
              value={serverNumber}
              onChange={(e) => handleServerNumberChange(e.target.value)}
            />
          </div>

          {hasTeamInput && mode === "join" && (
            <div>
              <div className="flex items-center justify-between">
                <label className="field-label" htmlFor="tag">
                  {t("tagLabel")}
                </label>
                <button
                  type="button"
                  className="text-steel hover:underline text-xs"
                  onClick={() => {
                    setMode("create");
                    setTag("");
                  }}
                >
                  {t("allianceNotListed")}
                </button>
              </div>
              <select
                id="tag"
                name="tag"
                required
                className="field-input"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="" disabled>
                  {alliances && alliances.length > 0 ? t("chooseAlliance") : t("lookingUpAlliances")}
                </option>
                {alliances?.map((a) => (
                  <option key={a.tag} value={a.tag}>
                    [{a.tag}] {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasTeamInput && mode === "create" && (
            <div className="flex flex-col gap-3">
              <p className="text-text-dim text-xs">{t("createAllianceHint")}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="field-label" htmlFor="tag">
                    {tCreate("tagLabel")}
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
                  <label className="field-label" htmlFor="allianceName">
                    {tCreate("nameLabel")}
                  </label>
                  <input
                    className="field-input"
                    id="allianceName"
                    name="allianceName"
                    placeholder="Your Alliance Name"
                    required
                  />
                </div>
              </div>
              {alliances && alliances.length > 0 && (
                <button
                  type="button"
                  className="text-steel hover:underline text-xs self-start"
                  onClick={() => setMode("join")}
                >
                  {t("pickExistingAlliance")}
                </button>
              )}
            </div>
          )}
        </div>

        {state?.error && (
          <p className="text-red text-sm" aria-live="polite">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary mt-2">
          {pending ? t("registerButtonPending") : t("registerButton")}
        </button>
      </form>

      <p className="text-text-dim text-sm mt-5 text-center">
        {t("alreadyRegistered")}{" "}
        <Link href="/login" className="text-gold hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
