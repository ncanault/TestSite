import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { DEMO_ROSTER } from "@/lib/demo-roster";
import HiveComposition from "@/components/HiveComposition";

export const dynamic = "force-dynamic";

async function getStats() {
  const [userCount, allianceCount, serverCount, accountCount] = await Promise.all([
    prisma.user.count(),
    prisma.alliance.count(),
    prisma.server.count(),
    prisma.account.count(),
  ]);
  return { userCount, allianceCount, serverCount, accountCount };
}

function IconCrosshair() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" strokeLinecap="round" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M2.5 18 9 10.5l4 4L21.5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 5H21.5V11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path
        d="M12 2.5 20 6v6c0 5-3.4 8.3-8 9.5-4.6-1.2-8-4.5-8-9.5V6l8-3.5Z"
        strokeLinejoin="round"
      />
      <path d="m8.5 12 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function HomePage() {
  const [stats, t] = await Promise.all([getStats(), getTranslations("Home")]);

  const CAPABILITIES = [
    { icon: IconCrosshair, title: t("capability1Title"), body: t("capability1Body") },
    { icon: IconTrend, title: t("capability2Title"), body: t("capability2Body") },
    { icon: IconShield, title: t("capability3Title"), body: t("capability3Body") },
  ];

  const HOW_IT_WORKS = [
    [t("step1Title"), t("step1Body")],
    [t("step2Title"), t("step2Body")],
    [t("step3Title"), t("step3Body")],
    [t("step4Title"), t("step4Body")],
  ];

  const statChip = (count: number, key: "statsUsers" | "statsAlliances" | "statsServers" | "statsAccounts") => (
    <span key={key} className="pill !cursor-default font-data" style={{ pointerEvents: "none" }}>
      {t.rich(key, {
        count,
        gold: (chunks) => <span className="text-gold mr-1.5">{chunks}</span>,
      })}
    </span>
  );

  return (
    <div>
      {/* Hero — the mechanism demonstrated immediately, not described */}
      <section className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center py-10 sm:py-14 reveal">
        <div>
          <h1 className="text-4xl sm:text-5xl xl:text-6xl leading-[0.95] mb-5">
            {t.rich("heading", { gold: (chunks) => <span className="text-gold">{chunks}</span> })}
          </h1>
          <p className="max-w-lg text-text-dim text-base sm:text-lg mb-8 leading-relaxed">
            {t("subtitle")}
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-9">
            <Link href="/register" className="btn btn-primary">
              {t("ctaPrimary")}
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              {t("ctaSecondary")}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {statChip(stats.userCount, "statsUsers")}
            {statChip(stats.allianceCount, "statsAlliances")}
            {statChip(stats.serverCount, "statsServers")}
            {statChip(stats.accountCount, "statsAccounts")}
          </div>
        </div>

        <div>
          <div className="panel p-5 relative overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(201,169,97,0.16), transparent 70%)",
              }}
            />
            <div className="flex items-center justify-between mb-3 relative">
              <p className="font-display text-sm text-gold">Hive Composition</p>
              <span className="pill !cursor-default text-[0.65rem]">{t("hiveBadge")}</span>
            </div>
            <HiveComposition accounts={DEMO_ROSTER} setter={null} />
            <p className="text-text-dim text-xs mt-3 relative">{t("hiveCaption")}</p>
          </div>
        </div>
      </section>

      {/* Capabilities — one lead statement, two compact supporting points;
          not three identical icon+heading+text cards. */}
      <section className="panel p-0 overflow-hidden">
        <div className="grid sm:grid-cols-[1.3fr_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-7 sm:p-8">
            <div className="text-gold mb-4">
              <IconCrosshair />
            </div>
            <h3 className="text-xl mb-2">{CAPABILITIES[0].title}</h3>
            <p className="text-text-dim text-sm leading-relaxed max-w-sm">
              {CAPABILITIES[0].body}
            </p>
          </div>
          <div className="p-7 sm:p-8 flex flex-col gap-6 justify-center">
            {CAPABILITIES.slice(1).map((c) => (
              <div key={c.title} className="flex gap-3.5">
                <div className="text-gold-dim shrink-0 mt-0.5">
                  <c.icon />
                </div>
                <div>
                  <p className="font-display text-sm mb-0.5">{c.title}</p>
                  <p className="text-text-dim text-sm leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-label">{t("howItWorksTitle")}</div>
      <section className="relative">
        <div
          className="hidden sm:block absolute top-[22px] left-[12.5%] right-[12.5%] h-px"
          style={{ background: "linear-gradient(90deg, var(--gold-dim), var(--border))" }}
        />
        <div className="grid sm:grid-cols-4 gap-6 sm:gap-4">
          {HOW_IT_WORKS.map(([title, body], i) => (
            <div key={title} className="relative">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="font-data text-xs w-7 h-7 rounded-full flex items-center justify-center shrink-0 relative"
                  style={{
                    background: "var(--bg-deep)",
                    border: "1px solid var(--gold-dim)",
                    color: "var(--gold)",
                  }}
                >
                  {i + 1}
                </span>
                <p className="font-display text-sm">{title}</p>
              </div>
              <p className="text-text-dim text-sm leading-relaxed pl-10">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
