import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userHasTierAccess, isSubscriptionExpired, daysUntilPeriodEnd } from "@/lib/tier";
import BurgerMenu from "@/components/BurgerMenu";
import UserMenu from "@/components/UserMenu";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function Navbar() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("Nav")]);
  const sub = user?.subscription ?? null;

  // Everything except Subscriptions lives behind the burger now — the bar
  // itself only ever shows the logo, the burger, and Subscriptions (with
  // its countdown next to it).
  const burgerLinks: { href: string; label: string; show: boolean }[] = [
    {
      href: "/team",
      label: t("team"),
      show: !!user?.alliance && userHasTierAccess(user, sub, "FREE"),
    },
    {
      href: "/buffs-analysis",
      label: t("alliance"),
      show: !!user?.alliance && userHasTierAccess(user, sub, "ALLIANCE"),
    },
    {
      href: "/battlefield",
      label: t("competitive"),
      show: !!user?.alliance && userHasTierAccess(user, sub, "COMPETITIVE"),
    },
    { href: "/admin", label: t("admin"), show: user?.role === "ADMIN" },
  ].filter((l) => l.show);

  const subExpired = isSubscriptionExpired(sub);
  const daysRemaining = daysUntilPeriodEnd(sub);

  return (
    <header
      className="border-b border-border bg-panel/90 backdrop-blur sticky top-0 z-30"
      style={{ boxShadow: "0 1px 0 0 rgba(201,169,97,0.12)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <BurgerMenu links={burgerLinks} />
          <Link href="/" className="flex items-center gap-2.5 group">
            <span
              className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-45"
              style={{
                background: "linear-gradient(165deg, var(--gold-bright), var(--gold-dim))",
                transform: "rotate(45deg)",
              }}
            />
            <span className="font-display text-gold text-lg leading-none">EVONY</span>
            <span className="hidden sm:inline text-text-dim font-data text-[0.65rem] tracking-widest uppercase">
              {t("tagline")}
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <Link
            href="/pricing"
            className="font-data text-xs uppercase tracking-wide text-text-dim hover:text-gold px-2 py-1.5 rounded transition-colors flex items-center gap-1.5"
          >
            {t("subscriptions")}
            {subExpired && (
              <span className="text-red normal-case tracking-normal">
                {t("subscriptionExpiredBadge")}
              </span>
            )}
            {daysRemaining !== null && (
              <span className="text-gold-dim normal-case tracking-normal">
                {t("daysRemaining", { count: daysRemaining })}
              </span>
            )}
          </Link>

          <LocaleSwitcher />

          {user ? (
            <UserMenu
              playerName={user.playerName}
              email={user.email}
              avatarColor={user.avatarColor}
              role={user.role}
            />
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !text-xs !py-1.5">
                {t("login")}
              </Link>
              <Link href="/register" className="btn btn-primary !text-xs !py-1.5">
                {t("createAccount")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
