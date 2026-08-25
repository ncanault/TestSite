"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createPaypalOrderAction, capturePaypalOrderAction } from "@/app/actions/subscription";
import type { Tier } from "@prisma/client";

type PaypalButtonsConfig = {
  style?: Record<string, unknown>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError?: (err: unknown) => void;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PaypalButtonsConfig) => { render: (el: HTMLElement) => void };
    };
  }
}

// Shared across every button instance on the page (Pricing renders one per
// paid tier) so only one <script> tag is ever injected, and every instance
// just awaits the same load.
let paypalScriptPromise: Promise<void> | null = null;

function loadPaypalScript(clientId: string): Promise<void> {
  if (typeof window !== "undefined" && window.paypal) return Promise.resolve();
  if (!paypalScriptPromise) {
    paypalScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => reject(new Error("PayPal SDK failed to load")));
      document.body.appendChild(script);
    });
  }
  return paypalScriptPromise;
}

// Real, server-verified PayPal checkout for one period of `tier` — replaces
// the old "pay via a plain PayPal.me link, paste the reference, wait for an
// admin to click Activate" flow (see RequestSubscriptionForm) with the
// PayPal JS SDK's Smart Buttons. createOrder/onApprove call
// createPaypalOrderAction/capturePaypalOrderAction directly (server
// actions, called as plain functions here rather than through a <form> —
// that's fine, "use server" exports work either way), which do the actual
// PayPal API calls and only activate the subscription once PayPal itself
// confirms the capture completed for the right amount.
export default function PaypalCheckoutButton({
  tier,
  clientId,
}: {
  tier: Exclude<Tier, "NONE" | "FREE">;
  clientId: string;
}) {
  const t = useTranslations("Pricing");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPaypalScript(clientId)
      .then(() => {
        if (cancelled || !containerRef.current || !window.paypal) return;
        // Clear before re-rendering — effect re-runs if `tier` changes, and
        // in dev StrictMode double-invokes effects.
        containerRef.current.innerHTML = "";
        window.paypal
          .Buttons({
            style: { layout: "horizontal", tagline: false, height: 40 },
            createOrder: async () => {
              setError(null);
              setSuccess(null);
              const result = await createPaypalOrderAction(tier);
              if ("error" in result) {
                setError(result.error);
                throw new Error(result.error);
              }
              return result.orderId;
            },
            onApprove: async (data) => {
              const result = await capturePaypalOrderAction(data.orderID, tier);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setSuccess(result?.success ?? null);
              router.refresh();
            },
            onError: () => {
              setError(t("paypalGenericError"));
            },
          })
          .render(containerRef.current);
      })
      .catch(() => {
        if (!cancelled) setError(t("paypalGenericError"));
      });

    return () => {
      cancelled = true;
    };
  }, [tier, clientId, t, router]);

  return (
    <div className="mt-3">
      <div ref={containerRef} />
      {error && (
        <p className="text-red text-xs mt-1" aria-live="polite">
          {error}
        </p>
      )}
      {success && (
        <p className="text-green text-xs mt-1" aria-live="polite">
          {success}
        </p>
      )}
    </div>
  );
}
