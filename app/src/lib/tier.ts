import type { Tier } from "@prisma/client";

// Subscription tiers are cumulative: Competitive includes Alliance, which
// includes Free. A subscription only unlocks the pages up to its active tier.
export const TIER_RANK: Record<Tier, number> = {
  NONE: 0,
  FREE: 1,
  ALLIANCE: 2,
  COMPETITIVE: 3,
};

// The free tier has no price and no PayPal step — it's granted automatically.
export const TIER_PRICE_USD: Record<Exclude<Tier, "NONE" | "FREE">, number> = {
  ALLIANCE: 15,
  COMPETITIVE: 30,
};

type SubscriptionLike = {
  tier: Tier;
  status: string;
  currentPeriodEnd?: Date | string | null;
} | null | undefined;

// True once a paid subscription's period has passed — the free tier never
// expires, so this is always false for it (or for a subscription with no
// period end at all, e.g. one never activated).
export function isSubscriptionExpired(subscription: SubscriptionLike): boolean {
  if (!subscription || subscription.tier === "FREE" || !subscription.currentPeriodEnd) {
    return false;
  }
  return new Date(subscription.currentPeriodEnd) < new Date();
}

// Days left until a still-active paid subscription's period ends, rounded
// up (so under a day left still reads as "1", not "0"). Null when there's
// nothing to count down to: no subscription, the Free tier (never
// expires), or a period that's already lapsed (see isSubscriptionExpired —
// that case gets its own "Expired" messaging instead of "0 days left").
export function daysUntilPeriodEnd(subscription: SubscriptionLike): number | null {
  if (!subscription || subscription.tier === "FREE" || !subscription.currentPeriodEnd) {
    return null;
  }
  if (isSubscriptionExpired(subscription)) return null;
  const ms = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function hasTierAccess(subscription: SubscriptionLike, required: Tier) {
  if (!subscription) return false;
  if (subscription.status !== "ACTIVE") return false;
  // Tiers are cumulative (see TIER_RANK above) — a lapsed paid tier drops
  // the user back down to whatever Free grants, not down to nothing.
  // Every registered player has Free automatically and it never expires,
  // so losing it because a *paid* period ended would take away more than
  // the lapsed payment was ever for.
  const effectiveTier = isSubscriptionExpired(subscription) ? "FREE" : subscription.tier;
  return TIER_RANK[effectiveTier] >= TIER_RANK[required];
}

// Same as hasTierAccess, but an admin-granted per-user exemption
// (User.freeAccess) unlocks every tier regardless of the user's actual
// subscription. The user still needs to belong to an alliance — this only
// bypasses the payment requirement, not the alliance requirement.
export function userHasTierAccess(
  user: { freeAccess: boolean } | null | undefined,
  subscription: SubscriptionLike,
  required: Tier
) {
  if (user?.freeAccess) return true;
  return hasTierAccess(subscription, required);
}

// A subscription is a month-to-month grant: one period is 30 days from the
// moment an admin activates it.
export function addSubscriptionPeriod(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + 30);
  return end;
}
