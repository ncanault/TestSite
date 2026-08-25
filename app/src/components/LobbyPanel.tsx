"use client";

import { useTranslations, useLocale } from "next-intl";
import { acceptJoinRequestAction, rejectJoinRequestAction } from "@/app/actions/team";
import { formatGameId } from "@/lib/format";

type PendingMember = {
  id: string;
  playerName: string;
  email: string;
  createdAt: Date;
  account: { gameId: bigint; name: string } | null;
};

// Visible only to the alliance's admin and leadership (gated by the caller
// — see TeamPage) — everyone who asked to join by giving this alliance's
// server number and tag, awaiting acceptance.
export default function LobbyPanel({ members }: { members: PendingMember[] }) {
  const t = useTranslations("Lobby");
  const locale = useLocale();

  return (
    <div className="panel overflow-x-auto mb-4">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("colPlayer")}</th>
            <th>{t("colEmail")}</th>
            <th>{t("colGameId")}</th>
            <th>{t("colRequested")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td className="text-text">{m.playerName}</td>
              <td className="text-text-dim">{m.email}</td>
              <td className="text-text-dim">
                {m.account ? formatGameId(m.account.gameId, locale) : "—"}
              </td>
              <td className="text-text-dim text-xs">
                {new Date(m.createdAt).toLocaleDateString(locale)}
              </td>
              <td className="whitespace-nowrap">
                <form action={acceptJoinRequestAction} className="inline">
                  <input type="hidden" name="userId" value={m.id} />
                  <button type="submit" className="btn btn-ghost !text-xs !py-1 mr-2">
                    {t("accept")}
                  </button>
                </form>
                <form action={rejectJoinRequestAction} className="inline">
                  <input type="hidden" name="userId" value={m.id} />
                  <button type="submit" className="text-red hover:underline text-xs">
                    {t("refuse")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
