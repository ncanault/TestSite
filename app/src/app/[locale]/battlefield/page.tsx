import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAllianceTier } from "@/lib/guards";
import CompetitivePageClient from "@/components/CompetitivePageClient";
import AllianceHeader from "@/components/AllianceHeader";

export const dynamic = "force-dynamic";

export default async function CompetitivePage() {
  const { user, alliance } = await requireAllianceTier("COMPETITIVE");
  const [accounts, t, tTier] = await Promise.all([
    prisma.account.findMany({ where: { allianceId: alliance.id } }),
    getTranslations("CompetitivePage"),
    getTranslations("Tier"),
  ]);
  const canReorganize = user.id === alliance.ownerId || user.isLeadership;

  return (
    <div className="reveal">
      <AllianceHeader
        alliance={alliance}
        tier={tTier("COMPETITIVE")}
        isOwner={user.id === alliance.ownerId}
        eyebrow={t("titlePrefix")}
        serverLink={`https://svs.info/server/${alliance.server.number}`}
      />

      {accounts.length === 0 ? (
        <p className="text-text-dim">{t("noAccounts")}</p>
      ) : (
        <CompetitivePageClient accounts={accounts} canReorganize={canReorganize} />
      )}
    </div>
  );
}
