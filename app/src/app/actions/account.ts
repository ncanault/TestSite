"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { userHasTierAccess } from "@/lib/tier";
import { periodMonthOf } from "@/lib/history";
import { STAT_FIELD_NAMES } from "@/lib/stats";
import type { ActionState } from "@/app/actions/auth";

type FieldKey = "keep" | "power" | "rally" | "rein" | (typeof STAT_FIELD_NAMES)[number];

async function buildAccountSchema() {
  const t = await getTranslations("Errors");
  const fieldLabel = await getTranslations("Errors.field");

  const numeric = (key: FieldKey) =>
    z.coerce
      .number({ message: `${fieldLabel(key)} ${t("mustBeNumber")}` })
      .min(0, `${fieldLabel(key)} ${t("mustBePositive")}`);

  const statFields = Object.fromEntries(
    STAT_FIELD_NAMES.map((key) => [key, numeric(key)])
  ) as Record<(typeof STAT_FIELD_NAMES)[number], ReturnType<typeof numeric>>;

  return z.object({
    gameId: z
      .string()
      .trim()
      .regex(/^\d{3,15}$/, t("invalidGameId"))
      .transform((s) => BigInt(s)),
    name: z.string().trim().min(1, t("accountNameRequired")).max(40),
    keep: numeric("keep"),
    power: numeric("power"),
    rally: numeric("rally"),
    rein: numeric("rein"),
    ...statFields,
  });
}

async function requireBasicAlliance() {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { alliance: true, subscription: true },
  });
  if (!user?.alliance) return { error: t("noAlliance") };
  if (!userHasTierAccess(user, user.subscription, "FREE")) {
    return { error: t("basicSubscriptionRequired") };
  }
  // The alliance's admin and anyone named leadership can manage every
  // account; a regular member can only touch the one Account row linked
  // to their own userId — enforced in each action below, not just hidden
  // in the UI (the Team page hides the buttons too, but that's a
  // convenience, not the actual gate).
  const isManager = user.alliance.ownerId === user.id || user.isLeadership;
  return { alliance: user.alliance, userId: user.id, isManager };
}

export async function upsertAccountAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const [gate, t, accountSchema] = await Promise.all([
    requireBasicAlliance(),
    getTranslations("Errors"),
    buildAccountSchema(),
  ]);
  if ("error" in gate) return { error: gate.error };

  const parsed = accountSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }

  const { gameId, name, ...historyData } = parsed.data;
  const data = { name, ...historyData };

  // gameId is the account's unique in-game number: an account belongs to
  // exactly one alliance platform-wide, so re-saving an id that already
  // belongs to a different alliance is rejected rather than silently
  // stolen/moved.
  const existing = await prisma.account.findUnique({ where: { gameId } });
  if (existing && existing.allianceId !== gate.alliance.id) {
    return { error: t("gameIdTakenByOtherAlliance") };
  }

  // A regular member can only edit their own already-linked account —
  // never create a brand new row, never touch anyone else's.
  if (!gate.isManager && (!existing || existing.userId !== gate.userId)) {
    return { error: t("onlyOwnAccountEditable") };
  }

  if (existing) {
    await prisma.account.update({ where: { gameId }, data });
  } else {
    await prisma.account.create({ data: { gameId, ...data, allianceId: gate.alliance.id } });
  }

  // Historized snapshot powering the Alliance evolution charts, bounded to
  // one row per account per calendar month: saving again within the same
  // month overwrites that month's row instead of piling up new ones.
  const periodMonth = periodMonthOf();
  await prisma.accountHistory.upsert({
    where: { accountGameId_periodMonth: { accountGameId: gameId, periodMonth } },
    create: { accountGameId: gameId, periodMonth, ...historyData },
    update: { capturedAt: new Date(), ...historyData },
  });

  revalidatePath("/team");
  revalidatePath("/buffs-analysis");
  revalidatePath("/battlefield");
  return { success: existing ? t("accountUpdated") : t("accountAdded") };
}

export async function deleteAccountAction(formData: FormData) {
  const gate = await requireBasicAlliance();
  if ("error" in gate) return;

  const raw = formData.get("gameId");
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return;
  const gameId = BigInt(raw);

  if (!gate.isManager) {
    const account = await prisma.account.findUnique({ where: { gameId } });
    if (!account || account.allianceId !== gate.alliance.id || account.userId !== gate.userId) return;
  }

  await prisma.account.deleteMany({ where: { gameId, allianceId: gate.alliance.id } });

  revalidatePath("/team");
  revalidatePath("/buffs-analysis");
  revalidatePath("/battlefield");
}
