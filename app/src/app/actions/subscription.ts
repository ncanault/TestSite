"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createPaypalOrder, capturePaypalOrder } from "@/lib/paypalApi";
import { TIER_PRICE_USD, addSubscriptionPeriod } from "@/lib/tier";
import type { ActionState } from "@/app/actions/auth";
import type { Tier } from "@prisma/client";

type PaidTier = Exclude<Tier, "NONE" | "FREE">;

const requestSchema = z.object({
  tier: z.enum(["ALLIANCE", "COMPETITIVE"]),
  paypalRef: z.string().trim().max(120).optional(),
});

// Every member of an alliance manages their own subscription — there's no
// "owner pays for the alliance" step anymore, each player requests and pays
// individually to unlock the tier for themselves.
export async function requestSubscriptionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: t("invalidSession") };
  if (!user.allianceId) return { error: t("createOrJoinAllianceFirst") };

  const parsed = requestSchema.safeParse({
    tier: formData.get("tier"),
    paypalRef: formData.get("paypalRef") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidForm") };
  }

  const requestedAt = new Date();
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: parsed.data.tier,
      status: "PENDING",
      paypalRef: parsed.data.paypalRef,
      requestedAt,
    },
    update: {
      tier: parsed.data.tier,
      status: "PENDING",
      paypalRef: parsed.data.paypalRef,
      requestedAt,
      activatedAt: null,
      activatedBy: null,
      currentPeriodEnd: null,
    },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId: user.id,
      tier: parsed.data.tier,
      status: "PENDING",
      paypalRef: parsed.data.paypalRef,
      requestedAt,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/pricing");
  return { success: t("subscriptionRequested") };
}

// Called directly (not through a <form action>) by PaypalCheckoutButton's
// createOrder callback — the amount always comes from TIER_PRICE_USD here,
// server-side, never from anything the browser sends, so there's no way to
// tamper the price from devtools.
export async function createPaypalOrderAction(
  tier: PaidTier
): Promise<{ orderId: string } | { error: string }> {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: t("invalidSession") };
  if (!user.allianceId) return { error: t("createOrJoinAllianceFirst") };

  try {
    const orderId = await createPaypalOrder(tier);
    return { orderId };
  } catch (e) {
    console.error("[paypal] createPaypalOrder failed:", e);
    return { error: t("paypalError") };
  }
}

// Called directly by PaypalCheckoutButton's onApprove callback, once the
// player has approved the payment in the PayPal popup. Captures the order
// against PayPal's own API (never trusting anything the client claims was
// paid) and only activates the subscription if that capture actually comes
// back COMPLETED for the exact amount this tier costs — this is what
// replaces the old "paste a transaction reference, wait for an admin to
// click Activate" flow with something PayPal itself has verified.
export async function capturePaypalOrderAction(
  orderId: string,
  tier: PaidTier
): Promise<ActionState> {
  const t = await getTranslations("Errors");
  const session = await getSession();
  if (!session) return { error: t("mustBeLoggedIn") };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: t("invalidSession") };

  let capture;
  try {
    capture = await capturePaypalOrder(orderId);
  } catch (e) {
    console.error("[paypal] capturePaypalOrder failed:", e);
    return { error: t("paypalError") };
  }

  const expectedAmount = TIER_PRICE_USD[tier].toFixed(2);
  if (capture.status !== "COMPLETED" || capture.amount !== expectedAmount) {
    console.error(
      `[paypal] capture didn't verify for user ${user.id}: status=${capture.status} amount=${capture.amount} expected=${expectedAmount}`
    );
    return { error: t("paypalNotVerified") };
  }

  const activatedAt = new Date();
  const currentPeriodEnd = addSubscriptionPeriod(activatedAt);
  // The capture id is the more specific reference (one per actual charge);
  // falls back to the order id in the unlikely case PayPal doesn't return one.
  const paypalRef = capture.captureId ?? orderId;

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      status: "ACTIVE",
      paypalRef,
      activatedAt,
      activatedBy: "paypal-api",
      currentPeriodEnd,
    },
    update: {
      tier,
      status: "ACTIVE",
      paypalRef,
      activatedAt,
      activatedBy: "paypal-api",
      currentPeriodEnd,
      requestedAt: null,
    },
  });

  await prisma.subscriptionHistory.create({
    data: {
      userId: user.id,
      tier,
      status: "ACTIVE",
      paypalRef,
      activatedAt,
      activatedBy: "paypal-api",
      currentPeriodEnd,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/pricing");
  return { success: t("subscriptionActivatedByPaypal") };
}
