import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userHasTierAccess } from "@/lib/tier";
import type { Tier } from "@prisma/client";

// Explicit return types below are load-bearing: without them, TypeScript's
// inferred return type of these functions (as seen from other functions in
// this file) doesn't pick up the narrowing performed by `redirect`, so
// callers see a spuriously nullable type. The `!` assertions after each
// `redirect(...)` call exist for the same reason: `redirect`'s generic,
// deeply-conditional `href` parameter type defeats TypeScript's
// never-returns-so-code-after-is-unreachable control-flow analysis here,
// even though `redirect` is typed to return `never` — confirmed safe at
// runtime because `redirect` always throws.
type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) redirect({ href: "/login", locale });
  return user!;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  if (user.role !== "ADMIN") redirect({ href: "/dashboard", locale });
  return user;
}

// Requires a logged-in user with an alliance, whose *own* subscription
// covers `tier` (each member of an alliance needs their own active
// subscription — one member paying doesn't unlock it for the rest).
// Redirects to /dashboard (no alliance) or /pricing (subscription too low).
export async function requireAllianceTier(
  tier: Tier
): Promise<{ user: CurrentUser; alliance: NonNullable<CurrentUser["alliance"]> }> {
  const user = await requireUser();
  const locale = await getLocale();
  if (!user.alliance) redirect({ href: "/dashboard", locale });
  const alliance = user.alliance!;
  if (!userHasTierAccess(user, user.subscription, tier)) {
    redirect({ href: "/pricing", locale });
  }
  return { user, alliance };
}
