import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { activateSubscriptionAction } from "@/app/actions/admin";
import AdminAlliancesTable from "@/components/AdminAlliancesTable";
import AdminUsersTable from "@/components/AdminUsersTable";
import AdminAccountsTable from "@/components/AdminAccountsTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [users, alliances, accounts, history, t, tTier, locale] = await Promise.all([
    // `select` (not `include`) on purpose — this goes straight to a client
    // component (AdminUsersTable), so only the fields it actually displays
    // are fetched, keeping passwordHash and everything else server-only.
    prisma.user.findMany({
      select: {
        id: true,
        playerName: true,
        email: true,
        role: true,
        freeAccess: true,
        allianceId: true,
        alliance: { select: { tag: true, name: true, ownerId: true } },
        // The player's own linked in-game account, if any — shown as a
        // "server · gameId" prefix in front of their pseudo so an admin
        // can see at a glance which account each registration refers to.
        account: {
          select: { gameId: true, alliance: { select: { server: { select: { number: true } } } } },
        },
        subscription: {
          select: { tier: true, status: true, currentPeriodEnd: true, paypalRef: true, requestedAt: true },
        },
        // Deleting a user who still owns an alliance would hit the
        // Alliance.ownerId foreign key (ON DELETE RESTRICT) — this count
        // gates the "Delete user" menu item before that can happen.
        _count: { select: { ownedAlliances: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.alliance.findMany({
      select: {
        id: true,
        tag: true,
        name: true,
        server: { select: { number: true } },
        owner: { select: { id: true, playerName: true } },
        members: { select: { id: true } },
        // Deleting an alliance that still has Account rows would hit the
        // Account.allianceId foreign key (ON DELETE RESTRICT) — this
        // gates the Delete button before that can happen.
        _count: { select: { accounts: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Platform-wide, every Account row — the admin can delete any of
    // them, linked or not (see deleteAccountAdminAction). Scoped to the
    // admin page only (not any one alliance's Team page) since this is a
    // site-wide tool, not something an alliance owner should reach for by
    // accident.
    prisma.account.findMany({
      select: {
        gameId: true,
        name: true,
        power: true,
        alliance: { select: { tag: true, name: true, server: { select: { number: true } } } },
        user: { select: { playerName: true } },
      },
      orderBy: { gameId: "asc" },
    }),
    prisma.subscriptionHistory.findMany({ orderBy: { createdAt: "desc" } }),
    getTranslations("AdminPage"),
    getTranslations("Tier"),
    getLocale(),
  ]);

  const pending = users.filter((u) => u.subscription?.status === "PENDING");

  const historyByUser: Record<string, typeof history> = {};
  for (const h of history) {
    (historyByUser[h.userId] ??= []).push(h);
  }

  return (
    <div className="flex flex-col gap-10 reveal">
      <div>
        <h1 className="text-2xl mb-1">{t("title")}</h1>
        <p className="text-text-dim">{t("subtitle")}</p>
      </div>

      {pending.length > 0 && (
        <div>
          <div className="section-label">{t("pendingSubsTitle")}</div>
          <div className="panel overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>{t("colPseudo")}</th>
                  <th>{t("colEmail")}</th>
                  <th>{t("colAllianceAssociated")}</th>
                  <th>{t("colTierRequested")}</th>
                  <th>{t("colPaypalRef")}</th>
                  <th>{t("colRequestedAt")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td>{u.playerName}</td>
                    <td className="text-text-dim">{u.email}</td>
                    <td className="text-text-dim">
                      {u.alliance ? `[${u.alliance.tag}] ${u.alliance.name}` : "—"}
                    </td>
                    <td className="text-gold">{tTier(u.subscription!.tier)}</td>
                    <td className="text-text-dim">{u.subscription?.paypalRef || "—"}</td>
                    <td className="text-text-dim">
                      {u.subscription?.requestedAt?.toLocaleDateString(locale) ?? "—"}
                    </td>
                    <td>
                      <form action={activateSubscriptionAction} className="inline">
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" className="btn btn-primary !text-xs !py-1">
                          {t("activate")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="section-label">{t("alliancesTitle")}</div>
        <AdminAlliancesTable alliances={alliances} />
      </div>

      <div>
        <div className="section-label">{t("usersTitle")}</div>
        <AdminUsersTable
          users={users}
          alliances={alliances}
          historyByUser={historyByUser}
          adminId={admin.id}
        />
      </div>

      <div>
        <div className="section-label">{t("accountsTitle")}</div>
        <p className="text-text-dim text-xs -mt-1 mb-3">{t("accountsHint")}</p>
        <AdminAccountsTable accounts={accounts} />
      </div>
    </div>
  );
}
