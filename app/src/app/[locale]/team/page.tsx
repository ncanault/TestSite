import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAllianceTier } from "@/lib/guards";
import { attackScore, defenseScore } from "@/lib/domain";
import { formatPower } from "@/lib/format";
import TeamAccountsPanel from "@/components/TeamAccountsPanel";
import AllianceHeader from "@/components/AllianceHeader";
import LobbyPanel from "@/components/LobbyPanel";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { user, alliance } = await requireAllianceTier("FREE");
  const isOwner = user.id === alliance.ownerId;
  const isLeader = isOwner || user.isLeadership;

  const [accounts, pendingMembers, members, t, tTier, locale] = await Promise.all([
    prisma.account.findMany({
      where: { allianceId: alliance.id },
      include: { user: { select: { id: true, isLeadership: true, allianceId: true } } },
    }),
    // Only fetched for leadership — the Lobby is invisible (and its data
    // never sent to the client) for anyone else.
    // `select` (not `include`) on purpose — this goes straight to a client
    // component, so only the fields the Lobby actually displays are
    // fetched, keeping passwordHash and everything else server-only.
    isLeader
      ? prisma.user.findMany({
          where: { pendingAllianceId: alliance.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            playerName: true,
            email: true,
            createdAt: true,
            account: { select: { gameId: true, name: true } },
          },
        })
      : Promise.resolve([]),
    // Only fetched for the owner — used to offer accepted members who have
    // no linked Account yet in the "link this account" picker below.
    isOwner
      ? prisma.user.findMany({
          where: { allianceId: alliance.id },
          select: { id: true, playerName: true },
        })
      : Promise.resolve([]),
    getTranslations("Team"),
    getTranslations("Tier"),
    getLocale(),
  ]);

  // A row's claiming user only counts as "linked" here once they've been
  // accepted into this alliance — a still-pending join request already has
  // its account row (see requestJoinAlliance), but shows up in the Lobby,
  // not with leadership/admin controls on this table.
  const accountsWithMemberInfo = accounts.map(({ user: linkedRaw, ...a }) => ({
    ...a,
    linkedUser:
      linkedRaw && linkedRaw.allianceId === alliance.id
        ? { id: linkedRaw.id, isLeadership: linkedRaw.isLeadership }
        : null,
  }));

  // Members already linked to some account don't need offering again.
  const linkedUserIds = new Set(
    accountsWithMemberInfo.filter((a) => a.linkedUser).map((a) => a.linkedUser!.id)
  );
  const unlinkedMembers = members.filter((m) => !linkedUserIds.has(m.id));

  const topPower = [...accounts].sort((a, b) => b.power - a.power)[0];
  const topAttack = [...accounts].sort(
    (a, b) => attackScore(b) - attackScore(a)
  )[0];
  const topDefense = [...accounts].sort(
    (a, b) => defenseScore(b) - defenseScore(a)
  )[0];

  return (
    <div className="reveal">
      <AllianceHeader
        alliance={alliance}
        tier={tTier("FREE")}
        isOwner={user.id === alliance.ownerId}
        eyebrow={t("titlePrefix")}
        editNameTag
      />

      <div className="section-label">{t("recapLabel")}</div>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div className="kpi-card">
          <span className="field-label mb-1">{t("topPower")}</span>
          {topPower ? (
            <>
              <span className="font-data text-xl text-gold">{topPower.name}</span>
              <span className="text-text-dim text-xs mt-0.5">
                {formatPower(topPower.power)}
              </span>
            </>
          ) : (
            <span className="text-text-dim">—</span>
          )}
        </div>
        <div className="kpi-card">
          <span className="field-label mb-1">{t("topAttack")}</span>
          {topAttack ? (
            <>
              <span className="font-data text-xl text-orange">{topAttack.name}</span>
              <span className="text-text-dim text-xs mt-0.5">
                {t("atkScoreValue", { value: attackScore(topAttack).toLocaleString(locale) })}
              </span>
            </>
          ) : (
            <span className="text-text-dim">—</span>
          )}
        </div>
        <div className="kpi-card">
          <span className="field-label mb-1">{t("topDefense")}</span>
          {topDefense ? (
            <>
              <span className="font-data text-xl text-steel">{topDefense.name}</span>
              <span className="text-text-dim text-xs mt-0.5">
                {t("defScoreValue", { value: defenseScore(topDefense).toLocaleString(locale) })}
              </span>
            </>
          ) : (
            <span className="text-text-dim">—</span>
          )}
        </div>
      </div>

      {isLeader && pendingMembers.length > 0 && (
        <>
          <div className="section-label">{t("lobbyLabel")}</div>
          <LobbyPanel members={pendingMembers} />
        </>
      )}

      <div className="section-label">{t("accountsLabel")}</div>
      <TeamAccountsPanel
        accounts={accountsWithMemberInfo}
        isOwner={isOwner}
        ownerId={alliance.ownerId}
        unlinkedMembers={unlinkedMembers}
        currentUserId={user.id}
        canManageAll={isLeader}
      />
    </div>
  );
}
