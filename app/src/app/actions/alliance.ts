"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { joinTeamSchema } from "@/lib/joinTeam";
import type { ActionState } from "@/app/actions/auth";

// Public, read-only lookup used by the registration and dashboard forms to
// show which alliances already exist on a given server as the player
// types — no session required, and nothing more sensitive than an
// alliance's tag/name is returned (the same information a leader would
// hand out to a recruit anyway).
export async function listAlliancesForServerAction(
  serverNumber: string
): Promise<{ tag: string; name: string }[]> {
  const trimmed = serverNumber.trim();
  if (!trimmed) return [];
  const server = await prisma.server.findUnique({ where: { number: trimmed } });
  if (!server) return [];
  return prisma.alliance.findMany({
    where: { serverId: server.id },
    select: { tag: true, name: true },
    orderBy: { tag: "asc" },
  });
}

export async function createAllianceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const [t, locale] = await Promise.all([getTranslations("Errors"), getLocale()]);

  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: t("invalidSession") };
  if (user.allianceId) return { error: t("alreadyInAlliance") };

  const allianceSchema = z.object({
    tag: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3}$/, t("invalidTag")),
    name: z.string().trim().min(3, t("allianceNameTooShort")).max(60),
    serverNumber: z.string().trim().min(1, t("serverNumberRequired")).max(20),
  });

  const parsed = allianceSchema.safeParse({
    tag: formData.get("tag"),
    name: formData.get("name"),
    serverNumber: formData.get("serverNumber"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }
  const { tag, name, serverNumber } = parsed.data;

  const server = await prisma.server.upsert({
    where: { number: serverNumber },
    create: { number: serverNumber },
    update: {},
  });

  const existing = await prisma.alliance.findFirst({
    where: { serverId: server.id, OR: [{ tag }, { name }] },
  });
  if (existing) {
    return {
      error: existing.tag === tag ? t("tagTaken") : t("allianceNameTaken"),
    };
  }

  const alliance = await prisma.alliance.create({
    data: {
      tag,
      name,
      serverId: server.id,
      ownerId: user.id,
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { allianceId: alliance.id } });

  redirect({ href: "/dashboard", locale });
}

// Same "give a server number, a tag and a GameID" flow as registration's
// optional join fields, exposed again here for a user who registered
// without joining a team and wants to now. Ends in a pending state, not
// membership — the target alliance's leadership must accept it (see
// acceptJoinRequestAction in app/actions/team.ts).
export async function requestJoinAllianceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const [t, locale] = await Promise.all([getTranslations("Errors"), getLocale()]);

  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: t("invalidSession") };
  if (user.allianceId) return { error: t("alreadyInAlliance") };
  if (user.pendingAllianceId) return { error: t("joinRequestAlreadyPending") };

  const parsed = joinTeamSchema(t).safeParse({
    gameId: formData.get("gameId"),
    serverNumber: formData.get("serverNumber"),
    tag: formData.get("tag"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }
  const { gameId, serverNumber, tag } = parsed.data;

  const server = await prisma.server.findUnique({ where: { number: serverNumber } });
  const alliance = server
    ? await prisma.alliance.findUnique({ where: { serverId_tag: { serverId: server.id, tag } } })
    : null;
  if (!alliance) return { error: t("teamNotFound") };

  const existingAccount = await prisma.account.findUnique({ where: { gameId } });
  if (existingAccount && existingAccount.allianceId !== alliance.id) {
    return { error: t("gameIdTakenByOtherAlliance") };
  }
  if (existingAccount?.userId && existingAccount.userId !== user.id) {
    return { error: t("gameIdAlreadyClaimed") };
  }

  await prisma.user.update({ where: { id: user.id }, data: { pendingAllianceId: alliance.id } });
  await prisma.account.upsert({
    where: { gameId },
    create: { gameId, name: user.playerName, allianceId: alliance.id, userId: user.id },
    update: { userId: user.id, name: user.playerName },
  });

  redirect({ href: "/dashboard", locale });
}

// A link to an image hosted elsewhere (imgur, Discord CDN, ...) — this app
// never fetches or stores the image itself, just the URL. http(s) only,
// so an `<img src>` can't be pointed at something like a javascript: URI.
const logoUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: "must be http(s)" })
  .max(2000);

export async function updateAllianceLogoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { alliance: true },
  });
  if (!user?.alliance) return { error: t("noAlliance") };
  if (user.alliance.ownerId !== user.id) return { error: t("onlyOwnerCanUploadLogo") };

  const raw = formData.get("logoUrl");
  if (typeof raw !== "string" || raw.trim() === "") {
    // Clearing the field removes the logo instead of erroring.
    await prisma.alliance.update({
      where: { id: user.alliance.id },
      data: { logoUrl: null },
    });
    revalidatePath("/team");
    revalidatePath("/buffs-analysis");
    revalidatePath("/battlefield");
    revalidatePath("/dashboard");
    return { success: t("logoUpdated") };
  }

  const parsed = logoUrlSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: t("logoUrlInvalid") };
  }

  await prisma.alliance.update({
    where: { id: user.alliance.id },
    data: { logoUrl: parsed.data },
  });

  revalidatePath("/team");
  revalidatePath("/buffs-analysis");
  revalidatePath("/battlefield");
  revalidatePath("/dashboard");
  return { success: t("logoUpdated") };
}

// Owner-only rename of the alliance's own name/tag, from the Team page.
// Same uniqueness rule as founding one (see createAllianceAction): no two
// alliances share a tag or a name on the same server — checked here with
// a friendly error before the attempt, since the DB itself would only
// reject it with a raw unique-constraint violation (both are enforced as
// @@unique([serverId, tag]) / @@unique([serverId, name])).
export async function updateAllianceNameTagAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { alliance: true },
  });
  if (!user?.alliance) return { error: t("noAlliance") };
  if (user.alliance.ownerId !== user.id) return { error: t("onlyOwnerCanEditAlliance") };

  const schema = z.object({
    tag: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3}$/, t("invalidTag")),
    name: z.string().trim().min(3, t("allianceNameTooShort")).max(60),
  });
  const parsed = schema.safeParse({ tag: formData.get("tag"), name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }
  const { tag, name } = parsed.data;

  const clash = await prisma.alliance.findFirst({
    where: {
      serverId: user.alliance.serverId,
      id: { not: user.alliance.id },
      OR: [{ tag }, { name }],
    },
  });
  if (clash) {
    return { error: clash.tag === tag ? t("tagTaken") : t("allianceNameTaken") };
  }

  await prisma.alliance.update({ where: { id: user.alliance.id }, data: { tag, name } });

  revalidatePath("/team");
  revalidatePath("/buffs-analysis");
  revalidatePath("/battlefield");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: t("allianceRenamed") };
}
