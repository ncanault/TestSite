"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SubscriptionHistory, SubscriptionStatus, Tier } from "@prisma/client";
import {
  assignUserToAllianceAction,
  toggleAdminAction,
  toggleFreeAccessAction,
  setTeamAdminAction,
  activateSubscriptionAction,
  cancelSubscriptionAction,
  deleteUserAction,
} from "@/app/actions/admin";
import RowActionsMenu from "@/components/RowActionsMenu";
import { formatGameId } from "@/lib/format";

const menuItem =
  "font-data text-xs uppercase tracking-wide text-text-dim hover:text-gold px-2 py-1.5 rounded transition-colors text-left w-full";

type UserRow = {
  id: string;
  playerName: string;
  email: string;
  role: "ADMIN" | "PLAYER";
  freeAccess: boolean;
  allianceId: string | null;
  // Just the alliance's admin (ownerId) — enough to tell whether this user
  // is already their alliance's admin, gating the "Make team admin" action.
  alliance: { ownerId: string } | null;
  // The in-game account this user linked (at registration or from the
  // dashboard's join form), if any — shown as its own Server/Account #
  // columns ahead of the pseudo, not folded into that cell (a prefix
  // there read as one run-on value instead of distinct data).
  account: { gameId: bigint; alliance: { server: { number: string } } } | null;
  subscription: {
    tier: Tier;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    paypalRef: string | null;
  } | null;
  // Deleting a user who still owns an alliance would hit a foreign-key
  // restriction — gates the "Delete user" menu item.
  _count: { ownedAlliances: number };
};

type AllianceOption = { id: string; tag: string; name: string };

export default function AdminUsersTable({
  users,
  alliances,
  historyByUser,
  adminId,
}: {
  users: UserRow[];
  alliances: AllianceOption[];
  historyByUser: Record<string, SubscriptionHistory[]>;
  adminId: string;
}) {
  const t = useTranslations("AdminPage");
  const tTier = useTranslations("Tier");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // The row actions menu renders its content through a portal, created
  // client-side the moment it's opened — a <form action={serverAction}>
  // mounted that way never has React's own hydration to progressively
  // enhance, and the wrapping menu's "close on any click inside" handler
  // (see RowActionsMenu) races the browser's native submit, unmounting the
  // form before it completes ("Form submission canceled because the form
  // is not connected"). Calling the action directly sidesteps the whole
  // native-submission path — no form, no race.
  function runAction(action: (formData: FormData) => void | Promise<void>, userId: string) {
    const formData = new FormData();
    formData.set("userId", userId);
    startTransition(() => {
      action(formData);
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.playerName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div>
      <input
        className="field-input !w-auto !text-xs mb-3"
        placeholder={t("filterPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="panel overflow-x-auto">
        <table className="data-table min-w-[1140px]">
          <thead>
            <tr>
              <th>{t("colServer")}</th>
              <th>{t("colGameId")}</th>
              <th>{t("colPseudo")}</th>
              <th>{t("colEmail")}</th>
              <th>{t("colRole")}</th>
              <th>{t("colSubscription")}</th>
              <th>{t("colFreeAccess")}</th>
              <th>{t("colAllianceAssociated")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const sub = u.subscription;
              const history = historyByUser[u.id] ?? [];
              return (
                <Fragment key={u.id}>
                  <tr>
                    <td className="text-text-dim font-data whitespace-nowrap">
                      {u.account ? u.account.alliance.server.number : "—"}
                    </td>
                    <td className="text-text-dim font-data whitespace-nowrap">
                      {u.account ? formatGameId(u.account.gameId, locale) : "—"}
                    </td>
                    <td>{u.playerName}</td>
                    <td className="text-text-dim">{u.email}</td>
                    <td className={u.role === "ADMIN" ? "text-gold" : "text-text-dim"}>
                      {u.role}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="text-gold">{tTier(sub?.tier ?? "NONE")}</span>
                      <span className="text-text-dim"> · {sub?.status ?? "NONE"}</span>
                      {sub?.status === "ACTIVE" && sub.currentPeriodEnd && (
                        <div className="text-text-dim text-[0.7rem] mt-0.5">
                          {t("untilDate", {
                            date: new Date(sub.currentPeriodEnd).toLocaleDateString(locale),
                          })}
                        </div>
                      )}
                    </td>
                    <td className={u.freeAccess ? "text-gold" : "text-text-dim"}>
                      {u.freeAccess ? t("freeAccessYes") : t("freeAccessNo")}
                    </td>
                    <td>
                      <form
                        action={assignUserToAllianceAction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="allianceId"
                          defaultValue={u.allianceId ?? ""}
                          className="field-input !text-xs !py-1 !w-auto"
                        >
                          <option value="">{t("noneOption")}</option>
                          {alliances.map((a) => (
                            <option key={a.id} value={a.id}>
                              [{a.tag}] {a.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-ghost !text-xs !py-1">
                          {t("associate")}
                        </button>
                      </form>
                    </td>
                    <td>
                      <RowActionsMenu label={t("actionsMenu")}>
                        {sub?.status === "ACTIVE" && sub.tier !== "FREE" && (
                          <button
                            type="button"
                            className={menuItem}
                            onClick={() => runAction(cancelSubscriptionAction, u.id)}
                          >
                            {t("cancel")}
                          </button>
                        )}
                        {sub?.status === "PENDING" && (
                          <button
                            type="button"
                            className={menuItem}
                            onClick={() => runAction(activateSubscriptionAction, u.id)}
                          >
                            {t("activate")}
                          </button>
                        )}
                        {u.id !== adminId && (
                          <button
                            type="button"
                            className={menuItem}
                            onClick={() => runAction(toggleAdminAction, u.id)}
                          >
                            {u.role === "ADMIN" ? t("removeAdmin") : t("makeAdmin")}
                          </button>
                        )}
                        {u.allianceId && u.alliance?.ownerId !== u.id && (
                          <button
                            type="button"
                            className={menuItem}
                            onClick={() => runAction(setTeamAdminAction, u.id)}
                          >
                            {t("makeTeamAdmin")}
                          </button>
                        )}
                        <button
                          type="button"
                          className={menuItem}
                          onClick={() => runAction(toggleFreeAccessAction, u.id)}
                        >
                          {u.freeAccess ? t("revokeFreeAccess") : t("grantFreeAccess")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                          className={menuItem}
                        >
                          {expanded === u.id ? t("hideHistory") : t("viewHistory")}
                        </button>
                        {u.id !== adminId &&
                          (u._count.ownedAlliances > 0 ? (
                            <span
                              className={`${menuItem} opacity-40 cursor-not-allowed`}
                              title={t("deleteUserOwnsAlliance")}
                            >
                              {t("deleteUser")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={menuItem}
                              onClick={() => runAction(deleteUserAction, u.id)}
                            >
                              {t("deleteUser")}
                            </button>
                          ))}
                      </RowActionsMenu>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr>
                      <td colSpan={9} className="!p-0">
                        <div className="p-4" style={{ background: "var(--bg-deep)" }}>
                          {history.length === 0 ? (
                            <p className="text-text-dim text-xs">{t("noHistory")}</p>
                          ) : (
                            <table className="data-table !text-xs w-full">
                              <thead>
                                <tr>
                                  <th>{t("historyColDate")}</th>
                                  <th>{t("historyColTier")}</th>
                                  <th>{t("historyColStatus")}</th>
                                  <th>{t("historyColPaypalRef")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {history.map((h) => (
                                  <tr key={h.id}>
                                    <td className="text-text-dim">
                                      {new Date(h.createdAt).toLocaleString(locale)}
                                    </td>
                                    <td className="text-gold">{tTier(h.tier)}</td>
                                    <td className="text-text-dim">{h.status}</td>
                                    <td className="text-text-dim">{h.paypalRef || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-text-dim py-6">
                  {t("noUsers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
