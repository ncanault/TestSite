import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAllianceTier } from "@/lib/guards";
import { fillMonthlyGaps } from "@/lib/history";
import { STAT_FIELD_NAMES } from "@/lib/stats";
import { attackScore, defenseScore } from "@/lib/domain";
import AlliancePageClient, { type HistoryPoint } from "@/components/AlliancePageClient";
import AllianceHeader from "@/components/AllianceHeader";

export const dynamic = "force-dynamic";

export default async function AlliancePage() {
  const { user, alliance } = await requireAllianceTier("ALLIANCE");
  const [allAccounts, historyRows, t, tTier] = await Promise.all([
    prisma.account.findMany({ where: { allianceId: alliance.id } }),
    prisma.accountHistory.findMany({
      where: { account: { allianceId: alliance.id } },
      orderBy: { periodMonth: "asc" },
    }),
    getTranslations("AlliancePage"),
    getTranslations("Tier"),
  ]);

  // An account with every buff still at 0 (never actually tracked, e.g. a
  // secondary account only added for its power) is just clutter across 36
  // bar charts — leave it off this page. It still counts everywhere else
  // (Team, Competitive).
  const accounts = allAccounts.filter((a) => attackScore(a) + defenseScore(a) > 0);

  // A month with no save for a given account carries that account's last
  // known snapshot forward, so the evolution chart draws a continuous line
  // instead of a gap.
  const history: HistoryPoint[] = fillMonthlyGaps(historyRows).map((h) => {
    // h already carries all 36 stat fields (AccountHistory mirrors
    // Account's field names, see src/lib/stats.ts) — spread them through
    // generically instead of naming each one.
    const stats = Object.fromEntries(STAT_FIELD_NAMES.map((key) => [key, h[key as keyof typeof h]]));
    return {
      ...stats,
      accountGameId: h.accountGameId,
      gameId: h.accountGameId,
      name: "",
      keep: h.keep,
      power: h.power,
      rally: h.rally,
      rein: h.rein,
      capturedAt: h.periodMonth.getTime(),
    } as unknown as HistoryPoint;
  });

  return (
    <div className="reveal">
      <AllianceHeader
        alliance={alliance}
        tier={tTier("ALLIANCE")}
        isOwner={user.id === alliance.ownerId}
        eyebrow={t("titlePrefix")}
      />

      {accounts.length === 0 ? (
        <p className="text-text-dim">{t("noAccounts")}</p>
      ) : (
        <AlliancePageClient accounts={accounts} history={history} />
      )}
    </div>
  );
}
