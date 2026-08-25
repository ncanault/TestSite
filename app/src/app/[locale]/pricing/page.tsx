import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPaypalLink } from "@/lib/paypal";
import { isPaypalApiConfigured } from "@/lib/paypalApi";
import { isSubscriptionExpired } from "@/lib/tier";
import { prisma } from "@/lib/prisma";
import RequestSubscriptionForm from "@/components/RequestSubscriptionForm";
import PaypalCheckoutButton from "@/components/PaypalCheckoutButton";
import SubscriptionHistoryPanel from "@/components/SubscriptionHistoryPanel";
import type { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

const TIER_KEYS: { tier: Exclude<Tier, "NONE">; price: number; flagship?: boolean }[] = [
  { tier: "FREE", price: 0 },
  { tier: "ALLIANCE", price: 15 },
  { tier: "COMPETITIVE", price: 30, flagship: true },
];

function IconCheck() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4 shrink-0 mt-0.5"
    >
      <path d="m4 10.5 3.5 3.5L16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function PricingPage() {
  const [user, t, locale] = await Promise.all([
    getCurrentUser(),
    getTranslations("Pricing"),
    getLocale(),
  ]);
  const currentTier = user?.subscription?.tier ?? "NONE";
  const currentStatus = user?.subscription?.status ?? "NONE";
  const currentPeriodEnd = user?.subscription?.currentPeriodEnd ?? null;
  const subscriptionExpired = isSubscriptionExpired(user?.subscription);
  // An admin-granted exemption (see toggleFreeAccessAction) unlocks every
  // tier regardless of the user's real subscription row — every paid
  // tier's card should say so plainly (active, unlimited, no payment
  // prompt) instead of still asking them to pay for something they
  // already have full access to.
  const hasFreeAccess = !!user?.freeAccess;

  const history = user
    ? await prisma.subscriptionHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const paypalConfigured = isPaypalApiConfigured();
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  // Only accurate copy for how this deployment is actually configured — the
  // manual "wait for an admin" step doesn't exist once PayPal API checkout
  // is wired up.
  const howItWorksSteps = t.raw(
    paypalConfigured ? "howItWorksStepsAuto" : "howItWorksSteps"
  ) as string[];

  return (
    <div>
      <div className="text-center mb-12 reveal">
        <h1 className="text-3xl sm:text-4xl mb-3">{t("title")}</h1>
        <p className="text-text-dim max-w-xl mx-auto">{t("subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-5 mb-12 items-stretch">
        {TIER_KEYS.map(({ tier, price, flagship }) => {
          const isFree = tier === "FREE";
          const isExpired = !hasFreeAccess && currentTier === tier && currentStatus === "ACTIVE" && subscriptionExpired;
          const isActive =
            (!isFree && hasFreeAccess) ||
            (currentTier === tier && currentStatus === "ACTIVE" && !isExpired);
          const isPending = !hasFreeAccess && currentTier === tier && currentStatus === "PENDING";
          const features = t.raw(`${tier}.features`) as string[];
          return (
            <div
              key={tier}
              className={`panel p-6 flex flex-col relative ${isActive ? "is-active" : ""} ${
                flagship && !isActive ? "sm:scale-[1.04] sm:-translate-y-1" : ""
              }`}
              style={
                flagship && !isActive
                  ? {
                      borderColor: "var(--gold-dim)",
                      boxShadow:
                        "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(201,169,97,0.3)",
                    }
                  : undefined
              }
            >
              {flagship && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 pill !cursor-default !text-[0.62rem]"
                  style={{
                    borderColor: "var(--gold)",
                    color: "var(--gold)",
                    background: "var(--bg-deep)",
                  }}
                >
                  {t("flagshipBadge")}
                </span>
              )}
              <h2 className="text-xl text-gold mb-1">{t(`${tier}.name`)}</h2>
              <p className="text-text-dim text-sm mb-4">{t(`${tier}.tagline`)}</p>
              <p className="font-data text-3xl mb-4">
                ${price}
                {!isFree && <span className="text-text-dim text-sm">{t("perMonth")}</span>}
              </p>
              <ul className="text-sm flex flex-col gap-2.5 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="text-gold-dim">
                      <IconCheck />
                    </span>
                    <span className="text-text-dim">{f}</span>
                  </li>
                ))}
              </ul>

              {isFree ? (
                <p className="text-text-dim text-xs text-center">{t("includedNotice")}</p>
              ) : hasFreeAccess ? null : paypalConfigured && user ? (
                <PaypalCheckoutButton tier={tier} clientId={paypalClientId as string} />
              ) : (
                <a
                  href={getPaypalLink(tier)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full"
                >
                  {t("payPaypal")}
                </a>
              )}

              {isActive && (
                <div className="mt-3 text-center">
                  <p className="text-green text-xs">{t("subscriptionActive")}</p>
                  {!isFree && hasFreeAccess && (
                    <p className="text-gold-dim text-xs mt-0.5">{t("unlimitedAccess")}</p>
                  )}
                  {!isFree && !hasFreeAccess && currentPeriodEnd && (
                    <p className="text-text-dim text-xs mt-0.5">
                      {t("subscriptionUntil", {
                        date: new Date(currentPeriodEnd).toLocaleDateString(locale),
                      })}
                    </p>
                  )}
                </div>
              )}
              {isPending && (
                <p className="text-gold text-xs mt-3 text-center">{t("pendingActivation")}</p>
              )}
              {isExpired && currentPeriodEnd && (
                <p className="text-red text-xs mt-3 text-center">
                  {t("subscriptionExpiredCard", {
                    date: new Date(currentPeriodEnd).toLocaleDateString(locale),
                  })}
                </p>
              )}
              {user && !isFree && !isActive && !isPending && !paypalConfigured && (
                <RequestSubscriptionForm tier={tier} />
              )}
              {!user && !isFree && (
                <Link href="/register" className="btn btn-ghost w-full mt-3 !text-xs">
                  {t("registerToSubscribe")}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {user && <SubscriptionHistoryPanel history={history} />}

      <div className="panel p-6 max-w-2xl mx-auto text-sm">
        <p className="text-text mb-4 font-display text-base">{t("howItWorksTitle")}</p>
        <ol className="flex flex-col gap-3">
          {howItWorksSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="font-data text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "var(--bg-deep)",
                  border: "1px solid var(--gold-dim)",
                  color: "var(--gold)",
                }}
              >
                {i + 1}
              </span>
              <span className="text-text-dim leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
