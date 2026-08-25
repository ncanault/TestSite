import type { Tier } from "@prisma/client";
import { TIER_PRICE_USD } from "@/lib/tier";

// Simple PayPal.me-style payment links, one per tier. Set these env vars to
// your real PayPal links; falls back to a generic paypal.me placeholder
// pre-filled with the tier's price so the flow still works out of the box.
export function getPaypalLink(tier: Exclude<Tier, "NONE" | "FREE">) {
  const envKey = `NEXT_PUBLIC_PAYPAL_LINK_${tier}` as const;
  const configured = process.env[envKey];
  if (configured) return configured;
  return `https://www.paypal.com/paypalme/your-handle/${TIER_PRICE_USD[tier]}`;
}
