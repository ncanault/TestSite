"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// The alliance's creator (Alliance.ownerId) is its admin by default and is
// always leadership. A member gains the same "manage the team" rights the
// moment the admin checks them as leadership (User.isLeadership) — used to
// gate the Lobby and the accept action below.
async function requireAllianceLeader() {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { alliance: true },
  });
  if (!user?.alliance) return { error: t("noAlliance") };
  if (user.alliance.ownerId !== user.id && !user.isLeadership) {
    return { error: t("leadershipAccessRequired") };
  }
  return { user, alliance: user.alliance };
}

async function requireAllianceOwner() {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { alliance: true },
  });
  if (!user?.alliance) return { error: t("noAlliance") };
  if (user.alliance.ownerId !== user.id) return { error: t("adminAccessRequired") };
  return { user, alliance: user.alliance };
}

const targetUserSchema = z.object({ userId: z.string().min(1) });

const linkAccountSchema = z.object({
  gameId: z.string().trim().regex(/^\d+$/),
  userId: z.string().min(1),
});

// Links an existing Account row to a member of the alliance — the missing
// piece for accounts that predate the join-request flow (bulk-imported
// history, or one added by hand via the Team page's own "+ Add an
// account"): those never got Account.userId set, so a legitimate member
// managing that account had no Leadership checkbox or Make Admin button
// (both gated on the account having a linked user). This is how the admin
// backfills that link by hand instead of the member having to re-register
// with the exact same GameID.
export async function linkAccountToMemberAction(formData: FormData) {
  const gate = await requireAllianceOwner();
  if ("error" in gate) return;

  const parsed = linkAccountSchema.safeParse({
    gameId: formData.get("gameId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return;
  const gameId = BigInt(parsed.data.gameId);

  const account = await prisma.account.findUnique({ where: { gameId } });
  // Never overwrite an existing link from here — unlinking (if ever
  // needed) is a deliberate separate action, not a side effect of picking
  // someone else in this dropdown.
  if (!account || account.allianceId !== gate.alliance.id || account.userId) return;

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.allianceId !== gate.alliance.id) return;

  await prisma.account.update({ where: { gameId }, data: { userId: target.id } });

  revalidatePath("/team");
}

// The Leadership column's checkbox stays clickable even for an unlinked
// account — clicking it is how the admin both identifies who that account
// belongs to *and* names them leadership in one step, instead of linking
// first (elsewhere) and then coming back to check a box. Same link
// validation as linkAccountToMemberAction, plus setting isLeadership.
export async function linkAccountAndSetLeadershipAction(formData: FormData) {
  const gate = await requireAllianceOwner();
  if ("error" in gate) return;

  const parsed = linkAccountSchema.safeParse({
    gameId: formData.get("gameId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success || parsed.data.userId === gate.user.id) return;
  const gameId = BigInt(parsed.data.gameId);

  const account = await prisma.account.findUnique({ where: { gameId } });
  if (!account || account.allianceId !== gate.alliance.id || account.userId) return;

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.allianceId !== gate.alliance.id) return;

  await prisma.$transaction([
    prisma.account.update({ where: { gameId }, data: { userId: target.id } }),
    prisma.user.update({ where: { id: target.id }, data: { isLeadership: true } }),
  ]);

  revalidatePath("/team");
}

// Accepts a pending join request into the caller's alliance: the user's
// pendingAllianceId (set at registration or from the dashboard's join
// form) becomes their real allianceId. Available to the alliance's admin
// and anyone they've named leadership.
export async function acceptJoinRequestAction(formData: FormData) {
  const gate = await requireAllianceLeader();
  if ("error" in gate) return;

  const parsed = targetUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  await prisma.user.updateMany({
    where: { id: parsed.data.userId, pendingAllianceId: gate.alliance.id },
    data: { allianceId: gate.alliance.id, pendingAllianceId: null },
  });

  revalidatePath("/team");
}

// Refuses a pending join request: clears pendingAllianceId (the user goes
// back to having no alliance at all, free to register/join again, e.g.
// with a corrected GameID) and unlinks their claim on the Account row
// requestJoinAlliance created or matched — but leaves that row itself in
// place, stats and all, since it may be a real pre-existing account (a
// bulk import) rather than one created just for this request. A leftover
// bare row with no stats can still be cleaned up with the account table's
// own Delete action. Same availability as accept: admin and leadership.
export async function rejectJoinRequestAction(formData: FormData) {
  const gate = await requireAllianceLeader();
  if ("error" in gate) return;

  const parsed = targetUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.pendingAllianceId !== gate.alliance.id) return;

  await prisma.account.updateMany({
    where: { userId: target.id, allianceId: gate.alliance.id },
    data: { userId: null },
  });
  await prisma.user.update({ where: { id: target.id }, data: { pendingAllianceId: null } });

  revalidatePath("/team");
}

// The admin names (or un-names) a member as leadership — able to see the
// Lobby and accept join requests, but not to grant leadership themselves
// or transfer the admin seat. The admin (alliance owner) is always
// effectively leadership and isn't toggled by this action.
export async function toggleLeadershipAction(formData: FormData) {
  const gate = await requireAllianceOwner();
  if ("error" in gate) return;

  const parsed = targetUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success || parsed.data.userId === gate.user.id) return;

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.allianceId !== gate.alliance.id) return;

  await prisma.user.update({
    where: { id: target.id },
    data: { isLeadership: !target.isLeadership },
  });

  revalidatePath("/team");
}

// Hands the admin seat to another member the caller has already named
// leadership — there can only ever be one admin (Alliance.ownerId is a
// single field), so this simply reassigns it. Leadership-only is
// deliberate: it keeps admin transfer a two-step promotion (leadership,
// then admin) instead of handing the whole alliance to an arbitrary
// member in one click. The outgoing admin keeps their own leadership
// status; they just aren't the admin anymore.
export async function transferAllianceAdminAction(formData: FormData) {
  const gate = await requireAllianceOwner();
  if ("error" in gate) return;

  const parsed = targetUserSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success || parsed.data.userId === gate.user.id) return;

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.allianceId !== gate.alliance.id || !target.isLeadership) return;

  await prisma.alliance.update({ where: { id: gate.alliance.id }, data: { ownerId: target.id } });

  revalidatePath("/team");
}
