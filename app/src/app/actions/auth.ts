"use server";

import { z } from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { joinTeamSchema } from "@/lib/joinTeam";

export type ActionState = { error?: string; success?: string } | undefined;

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const [t, locale] = await Promise.all([getTranslations("Errors"), getLocale()]);

  const registerSchema = z.object({
    playerName: z.string().trim().min(2, t("playerNameTooShort")).max(40),
    email: z.string().trim().toLowerCase().email(t("invalidEmail")),
    password: z.string().min(8, t("passwordTooShort")),
  });

  const parsed = registerSchema.safeParse({
    playerName: formData.get("playerName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }

  const { playerName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: t("emailAlreadyExists") };
  }

  // Joining or creating a team at signup is optional, chosen by the
  // "teamMode" hidden field the register page sets from its own UI state
  // ("" when the server field was left blank, "join" once it found
  // existing alliances on that server, "create" when it didn't — see
  // RegisterPage). gameId is shared by both paths: it's the new player's
  // own in-game account, linked whether they're joining someone else's
  // alliance or founding a brand new one.
  const teamMode = formData.get("teamMode");
  const rawGameId = formData.get("gameId");
  const rawServerNumber = formData.get("serverNumber");
  const rawTag = formData.get("tag");

  let joinTarget: { gameId: bigint; serverNumber: string; tag: string } | null = null;
  let pendingAllianceId: string | null = null;

  let createTarget: { gameId: bigint | null; serverNumber: string; tag: string; name: string } | null = null;

  if (teamMode === "join") {
    const parsedJoin = joinTeamSchema(t).safeParse({
      gameId: rawGameId,
      serverNumber: rawServerNumber,
      tag: rawTag,
    });
    if (!parsedJoin.success) {
      return { error: parsedJoin.error.issues[0]?.message ?? t("invalidForm") };
    }
    joinTarget = parsedJoin.data;

    // Resolved before creating the user, so a bad team lookup (typo'd tag,
    // gameId already claimed elsewhere) fails the whole registration
    // instead of leaving a user stuck with no way to fix it.
    const server = await prisma.server.findUnique({ where: { number: joinTarget.serverNumber } });
    const alliance = server
      ? await prisma.alliance.findUnique({ where: { serverId_tag: { serverId: server.id, tag: joinTarget.tag } } })
      : null;
    if (!alliance) {
      return { error: t("teamNotFound") };
    }

    const existingAccount = await prisma.account.findUnique({ where: { gameId: joinTarget.gameId } });
    if (existingAccount && existingAccount.allianceId !== alliance.id) {
      return { error: t("gameIdTakenByOtherAlliance") };
    }
    if (existingAccount?.userId) {
      return { error: t("gameIdAlreadyClaimed") };
    }
    pendingAllianceId = alliance.id;
  } else if (teamMode === "create") {
    const createSchema = z.object({
      gameId: z
        .string()
        .trim()
        .regex(/^\d{3,15}$/, t("invalidGameId"))
        .transform((s) => BigInt(s))
        .optional()
        .or(z.literal("").transform(() => undefined)),
      serverNumber: z.string().trim().min(1, t("serverNumberRequired")).max(20),
      tag: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{3}$/, t("invalidTag")),
      name: z.string().trim().min(3, t("allianceNameTooShort")).max(60),
    });
    const parsedCreate = createSchema.safeParse({
      gameId: rawGameId,
      serverNumber: rawServerNumber,
      tag: rawTag,
      name: formData.get("allianceName"),
    });
    if (!parsedCreate.success) {
      return { error: parsedCreate.error.issues[0]?.message ?? t("invalidForm") };
    }
    createTarget = { gameId: parsedCreate.data.gameId ?? null, ...parsedCreate.data };

    if (createTarget.gameId !== null) {
      const existingAccount = await prisma.account.findUnique({ where: { gameId: createTarget.gameId } });
      if (existingAccount?.userId) {
        return { error: t("gameIdAlreadyClaimed") };
      }
    }

    // Same duplicate check as the dashboard's own create-alliance form —
    // resolved before creating the user so a taken tag/name fails the
    // whole registration cleanly instead of the transaction below hitting
    // a unique-constraint error.
    const existingServer = await prisma.server.findUnique({ where: { number: createTarget.serverNumber } });
    if (existingServer) {
      const dup = await prisma.alliance.findFirst({
        where: { serverId: existingServer.id, OR: [{ tag: createTarget.tag }, { name: createTarget.name }] },
      });
      if (dup) {
        return { error: dup.tag === createTarget.tag ? t("tagTaken") : t("allianceNameTaken") };
      }
    }
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        playerName,
        email,
        passwordHash,
        role: "PLAYER",
        pendingAllianceId,
        // Every player gets the free tier immediately, no PayPal/admin step.
        subscription: { create: { tier: "FREE", status: "ACTIVE", activatedAt: new Date() } },
      },
    });

    if (joinTarget && pendingAllianceId) {
      await tx.account.upsert({
        where: { gameId: joinTarget.gameId },
        create: { gameId: joinTarget.gameId, name: playerName, allianceId: pendingAllianceId, userId: created.id },
        update: { userId: created.id, name: playerName },
      });
    }

    if (createTarget) {
      const server = await tx.server.upsert({
        where: { number: createTarget.serverNumber },
        create: { number: createTarget.serverNumber },
        update: {},
      });
      const alliance = await tx.alliance.create({
        data: { tag: createTarget.tag, name: createTarget.name, serverId: server.id, ownerId: created.id },
      });
      // The founder is a full member immediately (no leadership approval
      // needed for the alliance they themselves just created).
      await tx.user.update({ where: { id: created.id }, data: { allianceId: alliance.id } });
      if (createTarget.gameId !== null) {
        await tx.account.upsert({
          where: { gameId: createTarget.gameId },
          create: { gameId: createTarget.gameId, name: playerName, allianceId: alliance.id, userId: created.id },
          update: { userId: created.id, name: playerName, allianceId: alliance.id },
        });
      }
    }

    return created;
  });

  await createSession({ userId: user.id, role: user.role });
  redirect({ href: "/dashboard", locale });
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const [t, locale] = await Promise.all([getTranslations("Errors"), getLocale()]);

  const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(t("invalidEmail")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: t("invalidCredentials") };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: t("invalidCredentials") };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect({ href: "/dashboard", locale });
}

export async function logoutAction() {
  "use server";
  const locale = await getLocale();
  await destroySession();
  redirect({ href: "/", locale });
}
