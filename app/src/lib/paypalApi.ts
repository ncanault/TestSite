import "server-only";
import type { Tier } from "@prisma/client";
import { TIER_PRICE_USD } from "@/lib/tier";

// One-time-payment PayPal integration (Orders API v2), not a true recurring
// subscription — the player pays each period through a real PayPal Smart
// Button on /pricing, the server creates and captures the order directly
// against PayPal's API, and the subscription is activated automatically
// the moment the capture comes back COMPLETED. No admin step, no manually
// pasted transaction reference. See requestSubscriptionAction/
// RequestSubscriptionForm for the older manual fallback, still used when
// this isn't configured (see isPaypalApiConfigured below).
//
// Sandbox vs live is picked by PAYPAL_ENV ("sandbox" | "live", defaults to
// sandbox so a half-configured deploy fails safe into test mode rather than
// accidentally taking real money).
function apiBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

// The client id is not secret (it's sent to the browser for the JS SDK
// button anyway) — only the secret needs to stay server-only. Both are
// still required server-side too, for the OAuth token exchange below.
export function isPaypalApiConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

class PaypalApiError extends Error {}

// Cached in memory (module-level — fine for a single Node process; the
// token is valid for hours, and every request otherwise doing its own
// OAuth round trip would double the API calls this flow makes) with a
// safety margin so it's refreshed slightly before PayPal would reject it.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new PaypalApiError("PayPal API is not configured (missing client id or secret).");
  }

  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new PaypalApiError(`PayPal OAuth token request failed (${res.status}).`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    // expires_in is seconds; refresh a minute early to avoid edge-of-expiry races.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

async function paypalFetch(path: string, init: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PaypalApiError(`PayPal API request to ${path} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

// Creates a PayPal order for one period of the given tier. The amount comes
// from TIER_PRICE_USD (server-controlled) — never from anything the client
// sends — so there's no way to tamper the price from the browser.
export async function createPaypalOrder(tier: Exclude<Tier, "NONE" | "FREE">): Promise<string> {
  const amount = TIER_PRICE_USD[tier].toFixed(2);
  const order = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: `Evony Alliance Dashboard — ${tier} (1 month)`,
          amount: { currency_code: "USD", value: amount },
        },
      ],
    }),
  });
  return order.id as string;
}

export type PaypalCapture = { status: string; captureId: string | null; amount: string | null };

// Captures a previously-created (and, on the client, approved) order.
// Returns enough to verify against the expected tier price before trusting
// it — see capturePaypalOrderAction.
export async function capturePaypalOrder(orderId: string): Promise<PaypalCapture> {
  const result = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
  const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: result?.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
    amount: capture?.amount?.value ?? null,
  };
}
