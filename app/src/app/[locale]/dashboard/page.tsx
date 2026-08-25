import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { userHasTierAccess, isSubscriptionExpired } from "@/lib/tier";
import { attackScore, defenseScore } from "@/lib/domain";
import { formatPower } from "@/lib/format";
import CreateTeamForm from "@/components/CreateTeamForm";
import JoinTeamForm from "@/components/JoinTeamForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [t, tTier, locale] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Tier"),
    getLocale(),
  ]);

  if (user.pendingAlliance) {
    return (
      <div className="reveal">
        <h1 className="text-2xl mb-2">{t("welcome", { name: user.playerName })}</h1>
        <p className="text-text-dim mb-8">
          {t("pendingJoinMessage", {
            tag: user.pendingAlliance.tag,
            name: user.pendingAlliance.name,
          })}
        </p>
      </div>
    );
  }

  if (!user.alliance) {
    return (
      <div className="reveal">
        <h1 className="text-2xl mb-2">{t("welcome", { name: user.playerName })}</h1>
        <p className="text-text-dim mb-8">{t("noAllianceMessage")}</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="section-label mb-3">{t("createAllianceLabel")}</div>
            <CreateTeamForm />
          </div>
          <div>
            <div className="section-label mb-3">{t("joinAllianceLabel")}</div>
            <JoinTeamForm />
          </div>
        </div>
      </div>
    );
  }

  const sub = user.subscription;
  const tier = sub?.tier ?? "NONE";
  const status = sub?.status ?? "NONE";
  const expired = isSubscriptionExpired(sub);
  const hasBasic = userHasTierAccess(user, sub, "FREE");

  const accounts = hasBasic
    ? await prisma.account.findMany({ where: { allianceId: user.alliance.id } })
    : [];
  const topPower = [...accounts].sort((a, b) => b.power - a.power)[0];
  const topAttack = [...accounts].sort((a, b) => attackScore(b) - attackScore(a))[0];
  const topDefense = [...accounts].sort((a, b) => defenseScore(b) - defenseScore(a))[0];

  const pages = [
    { href: "/team", label: t("navTeam"), need: "FREE" as const },
    { href: "/buffs-analysis", label: t("navAlliance"), need: "ALLIANCE" as const },
    { href: "/battlefield", label: t("navCompetitive"), need: "COMPETITIVE" as const },
  ];

  return (
    <div className="reveal">
      <h1 className="text-2xl mb-1">
        [{user.alliance.tag}] {user.alliance.name}
      </h1>
      <p className="text-text-dim mb-8">
        {t("serverLabel", { number: user.alliance.server.number })}
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="kpi-card">
          <span className="field-label mb-1">{t("subscriptionLabel")}</span>
          <span className="font-data text-xl text-gold">{tTier(tier)}</span>
          {status === "PENDING" && (
            <span className="text-xs text-gold-dim mt-1">{t("pendingValidation")}</span>
          )}
          {status === "CANCELLED" && (
            <span className="text-xs text-red mt-1">{t("subscriptionCancelled")}</span>
          )}
          {status === "ACTIVE" && expired && sub?.currentPeriodEnd && (
            <span className="text-xs text-red mt-1">
              {t("subscriptionExpired", {
                date: new Date(sub.currentPeriodEnd).toLocaleDateString(locale),
              })}
            </span>
          )}
          {status === "ACTIVE" && !expired && sub?.currentPeriodEnd && (
            <span className="text-xs text-text-dim mt-1">
              {t("subscriptionUntil", {
                date: new Date(sub.currentPeriodEnd).toLocaleDateString(locale),
              })}
            </span>
          )}
        </div>
        <div className="kpi-card">
          <span className="field-label mb-1">{t("roleLabel")}</span>
          <span className="font-data text-xl">
            {user.alliance.ownerId === user.id ? t("ownerRole") : t("memberRole")}
          </span>
        </div>
      </div>

      <div className="section-label">{t("accessLabel")}</div>
      <div className="grid sm:grid-cols-3 gap-4">
        {pages.map((p) => {
          const unlocked = userHasTierAccess(user, sub, p.need);
          return (
            <Link
              key={p.href}
              href={unlocked ? p.href : "/pricing"}
              className={`panel p-5 flex flex-col gap-1 transition-all hover:-translate-y-0.5 ${
                unlocked ? "hover:border-gold-dim" : "opacity-60"
              }`}
            >
              <span className="font-display text-lg">{p.label}</span>
              <span className="text-text-dim text-xs">
                {unlocked ? t("unlockedAccess") : t("needsAccess", { tier: tTier(p.need) })}
              </span>
            </Link>
          );
        })}
      </div>

      {!hasBasic && (
        <div className="panel p-6 mt-8 max-w-xl">
          <p className="font-display text-base mb-1">{t("readyToStart")}</p>
          <p className="text-text-dim text-sm mb-4">{t("readyToStartBody")}</p>
          <Link href="/pricing" className="btn btn-primary">
            {t("viewSubscriptions")}
          </Link>
        </div>
      )}

      {hasBasic && (
        <>
          <div className="section-label">{t("overviewLabel")}</div>
          {accounts.length === 0 ? (
            <div className="panel p-6">
              <p className="font-display text-base mb-1">{t("noAccountsYet")}</p>
              <p className="text-text-dim text-sm mb-4">{t("noAccountsBody")}</p>
              <Link href="/team" className="btn btn-primary">
                {t("addAccounts")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="kpi-card">
                  <span className="field-label mb-1">{t("topPower")}</span>
                  <span className="font-data text-xl text-gold">{topPower?.name}</span>
                  <span className="text-text-dim text-xs mt-0.5">
                    {topPower && formatPower(topPower.power)}
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="field-label mb-1">{t("topAttack")}</span>
                  <span className="font-data text-xl text-orange">{topAttack?.name}</span>
                  <span className="text-text-dim text-xs mt-0.5">
                    {topAttack &&
                      t("atkScoreValue", { value: attackScore(topAttack).toLocaleString(locale) })}
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="field-label mb-1">{t("topDefense")}</span>
                  <span className="font-data text-xl text-steel">{topDefense?.name}</span>
                  <span className="text-text-dim text-xs mt-0.5">
                    {topDefense &&
                      t("defScoreValue", {
                        value: defenseScore(topDefense).toLocaleString(locale),
                      })}
                  </span>
                </div>
              </div>
              <div className="panel p-4 flex items-center justify-between gap-4">
                <p className="text-text-dim text-sm">
                  {t("accountsTrackedTotal", { count: accounts.length })}
                </p>
                <Link href="/team" className="btn btn-ghost !text-xs shrink-0">
                  {t("manageAccounts")}
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
