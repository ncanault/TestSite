"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deleteAccountAdminAction } from "@/app/actions/admin";
import { formatGameId, formatPower } from "@/lib/format";

type AccountRow = {
  gameId: bigint;
  name: string;
  power: number;
  alliance: { tag: string; name: string; server: { number: string } };
  user: { playerName: string } | null;
};

// Platform-wide list of every Account row — unlike the Team page (owner-
// only, one alliance at a time), the site admin can delete any of them
// here, linked or not. Deleting a linked account only detaches the game
// data from that player's platform account (their User row itself is
// untouched); AccountHistory rows cascade-delete with it.
export default function AdminAccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const t = useTranslations("AdminPage");
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.alliance.tag.toLowerCase().includes(q) ||
        a.alliance.name.toLowerCase().includes(q) ||
        a.alliance.server.number.toLowerCase().includes(q) ||
        a.gameId.toString().includes(q) ||
        (a.user?.playerName.toLowerCase().includes(q) ?? false)
    );
  }, [accounts, query]);

  return (
    <div>
      <input
        className="field-input !w-auto !text-xs mb-3"
        placeholder={t("filterPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="panel overflow-x-auto">
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>{t("colGameId")}</th>
              <th>{t("colAccountName")}</th>
              <th>{t("colServer")}</th>
              <th>{t("colAlliance")}</th>
              <th>{t("colLinkedTo")}</th>
              <th>Power</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.gameId.toString()}>
                <td className="text-text-dim">{formatGameId(a.gameId, locale)}</td>
                <td>{a.name}</td>
                <td className="text-text-dim">{a.alliance.server.number}</td>
                <td className="text-text-dim">
                  [{a.alliance.tag}] {a.alliance.name}
                </td>
                <td className={a.user ? "text-gold" : "text-text-dim"}>
                  {a.user?.playerName ?? "—"}
                </td>
                <td className="text-gold">{formatPower(a.power)}</td>
                <td>
                  <form action={deleteAccountAdminAction}>
                    <input type="hidden" name="gameId" value={a.gameId.toString()} />
                    <button type="submit" className="text-red hover:underline text-xs">
                      {t("delete")}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-text-dim py-6">
                  {t("noAccounts")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
