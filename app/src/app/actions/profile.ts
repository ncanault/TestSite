"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { sendPasswordChangedEmail } from "@/lib/mail";
import { isAvatarColor } from "@/lib/avatar";
import type { ActionState } from "@/app/actions/auth";

export async function updateAvatarColorAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;

  const color = formData.get("color");
  if (typeof color !== "string" || !isAvatarColor(color)) return;

  await prisma.user.update({ where: { id: session.userId }, data: { avatarColor: color } });
  revalidatePath("/", "layout");
}

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const schema = z
    .object({
      currentPassword: z.string().min(1, t("passwordRequired")),
      newPassword: z.string().min(8, t("passwordTooShort")),
      confirmPassword: z.string().min(1, t("passwordRequired")),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t("passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: t("invalidSession") };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: t("currentPasswordIncorrect") };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Best-effort notification — a failed send shouldn't fail the password
  // change itself, the password is already updated at this point.
  await sendPasswordChangedEmail(user.email, user.playerName).catch(() => {});

  return { success: t("passwordChanged") };
}
