"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { addSubscriptionPeriod } from "@/lib/tier";
import type { ActionState } from "@/app/actions/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    const t = await getTranslations("Errors");
    throw new Error(t("adminAccessRequired"));
  }
  return session;
}

const assignSchema = z.object({
  userId: z.string().min(1),
  allianceId: z.string().min(1), // "" (empty select) means "detach"
});

// Associates (or detaches, when allianceId is empty) a player to an
// alliance. This is the admin-only mechanism the user relies on to link
// their game account.
export async function assignUserToAllianceAction(formData: FormData) {
  await requireAdmin();

  const parsed = assignSchema.safeParse({
    userId: formData.get("userId"),
    allianceId: formData.get("allianceId") ?? "",
  });
  if (!parsed.success) return;

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { allianceId: parsed.data.allianceId || null },
  });

  revalidatePath("/admin");
}

const activateSchema = z.object({
  userId: z.string().min(1),
});

export async function activateSubscriptionAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = activateSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  const activatedAt = new Date();
  const currentPeriodEnd = addSubscriptionPeriod(activatedAt);

  const sub = await prisma.subscription.update({
    where: { userId: parsed.data.userId },
    data: { status: "ACTIVE", activatedAt, activatedBy: session.userId, currentPeriodEnd },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId: parsed.data.userId,
      tier: sub.tier,
      status: "ACTIVE",
      paypalRef: sub.paypalRef,
      requestedAt: sub.requestedAt,
      activatedAt,
      activatedBy: session.userId,
      currentPeriodEnd,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/pricing");
}

// Cancelling a paid tier logs the cancellation, then immediately falls the
// user back to the free tier (rather than leaving them with no active
// subscription at all — there's no recurring billing to "let lapse" here,
// every action is admin-triggered).
export async function cancelSubscriptionAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = activateSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  const before = await prisma.subscription.findUnique({
    where: { userId: parsed.data.userId },
  });
  if (!before) return;

  await prisma.subscriptionHistory.create({
    data: {
      userId: parsed.data.userId,
      tier: before.tier,
      status: "CANCELLED",
      paypalRef: before.paypalRef,
      requestedAt: before.requestedAt,
      activatedAt: before.activatedAt,
      activatedBy: session.userId,
      currentPeriodEnd: before.currentPeriodEnd,
    },
  });

  await prisma.subscription.update({
    where: { userId: parsed.data.userId },
    data: {
      tier: "FREE",
      status: "ACTIVE",
      activatedAt: new Date(),
      activatedBy: session.userId,
      currentPeriodEnd: null,
      paypalRef: null,
      requestedAt: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/pricing");
}

const promoteSchema = z.object({ userId: z.string().min(1) });

export async function toggleAdminAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = promoteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;
  if (parsed.data.userId === session.userId) return; // can't demote yourself

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return;

  await prisma.user.update({
    where: { id: target.id },
    data: { role: target.role === "ADMIN" ? "PLAYER" : "ADMIN" },
  });

  revalidatePath("/admin");
}

// Grants (or revokes) a per-user exemption from needing a paid subscription:
// the user sees every subscription tier's features on their alliance for
// free. See userHasTierAccess in lib/tier.ts for where this is checked.
export async function toggleFreeAccessAction(formData: FormData) {
  await requireAdmin();
  const parsed = promoteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return;

  await prisma.user.update({
    where: { id: target.id },
    data: { freeAccess: !target.freeAccess },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// Site-admin override: hands the target's alliance's admin seat
// (Alliance.ownerId) to them directly, no matter their leadership status —
// unlike the alliance owner's own self-service transfer (see
// transferAllianceAdminAction in app/actions/team.ts), which only accepts
// a member already named leadership. This is the escape hatch for when
// that self-service path isn't available (the current owner is gone,
// unreachable, or a dispute needs resolving).
export async function setTeamAdminAction(formData: FormData) {
  await requireAdmin();
  const parsed = promoteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, allianceId: true },
  });
  if (!target?.allianceId) return;

  await prisma.alliance.update({ where: { id: target.allianceId }, data: { ownerId: target.id } });

  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/dashboard");
}

const deleteAccountSchema = z.object({
  gameId: z.string().trim().regex(/^\d+$/),
});

// Permanently removes ANY Account row, platform-wide — imported/test data
// with nobody attached to it, or a real player's linked account. Deleting
// a linked one only detaches the game data from that platform user (their
// User row, subscription, and alliance membership are untouched — they'd
// just show up as having no in-game account until re-linked); it does not
// delete the person. AccountHistory rows cascade-delete with it (see the
// onDelete: Cascade relation in schema.prisma). This is the platform-wide
// admin tool — unlinking (not deleting) a specific member's account is
// still the Team page's job for an alliance's own owner.
export async function deleteAccountAdminAction(formData: FormData) {
  await requireAdmin();
  const parsed = deleteAccountSchema.safeParse({ gameId: formData.get("gameId") });
  if (!parsed.success) return;

  const gameId = BigInt(parsed.data.gameId);
  const account = await prisma.account.findUnique({ where: { gameId } });
  if (!account) return;

  await prisma.account.delete({ where: { gameId } });

  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/buffs-analysis");
  revalidatePath("/battlefield");
  revalidatePath("/dashboard");
}

// Permanently deletes a platform user (not their in-game Account — that
// stays behind, auto-unlinked, so its history isn't lost; it just shows up
// in the Orphan accounts table again). Refuses to delete yourself, and
// refuses anyone who still owns an alliance (Alliance.ownerId is a
// required, ON DELETE RESTRICT foreign key — hand off or delete their
// alliance first, same as the DB would insist on anyway).
export async function deleteUserAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = promoteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;
  if (parsed.data.userId === session.userId) return;

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, _count: { select: { ownedAlliances: true } } },
  });
  if (!target || target._count.ownedAlliances > 0) return;

  await prisma.$transaction([
    prisma.subscriptionHistory.deleteMany({ where: { userId: target.id } }),
    prisma.subscription.deleteMany({ where: { userId: target.id } }),
    prisma.user.delete({ where: { id: target.id } }),
  ]);

  revalidatePath("/admin");
}

const deleteAllianceSchema = z.object({ allianceId: z.string().min(1) });

// Permanently deletes an alliance shell. Refuses when it still has any
// Account rows (Account.allianceId is ON DELETE RESTRICT — clear those
// via the Team page or the Orphan accounts table first); members and
// pending join requests are simply detached (User.allianceId/
// pendingAllianceId are ON DELETE SET NULL), not deleted.
export async function deleteAllianceAction(formData: FormData) {
  await requireAdmin();
  const parsed = deleteAllianceSchema.safeParse({ allianceId: formData.get("allianceId") });
  if (!parsed.success) return;

  const alliance = await prisma.alliance.findUnique({
    where: { id: parsed.data.allianceId },
    select: { id: true, _count: { select: { accounts: true } } },
  });
  if (!alliance || alliance._count.accounts > 0) return;

  await prisma.alliance.delete({ where: { id: alliance.id } });

  revalidatePath("/admin");
}

// Site-admin rename of any alliance's tag/name — the same uniqueness rule
// as an alliance owner renaming their own (see updateAllianceNameTagAction
// in app/actions/alliance.ts): no two alliances share a tag or a name on
// the same server. Unlike the rest of this file's actions, this one
// reports back through ActionState instead of failing silently — a
// rejected rename (duplicate tag/name) needs to say why, the same as it
// does for the alliance's own owner.
export async function adminUpdateAllianceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("Errors");
  await requireAdmin();

  const schema = z.object({
    allianceId: z.string().min(1),
    tag: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3}$/, t("invalidTag")),
    name: z.string().trim().min(3, t("allianceNameTooShort")).max(60),
  });
  const parsed = schema.safeParse({
    allianceId: formData.get("allianceId"),
    tag: formData.get("tag"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }
  const { allianceId, tag, name } = parsed.data;

  const alliance = await prisma.alliance.findUnique({ where: { id: allianceId } });
  if (!alliance) return { error: t("invalidForm") };

  const clash = await prisma.alliance.findFirst({
    where: { serverId: alliance.serverId, id: { not: allianceId }, OR: [{ tag }, { name }] },
  });
  if (clash) {
    return { error: clash.tag === tag ? t("tagTaken") : t("allianceNameTaken") };
  }

  await prisma.alliance.update({ where: { id: allianceId }, data: { tag, name } });

  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/buffs-analysis");
  revalidatePath("/battlefield");
  revalidatePath("/dashboard");
  return { success: t("allianceRenamed") };
}
