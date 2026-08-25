"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SubscriptionHistory } from "@prisma/client";

export default function SubscriptionHistoryPanel({
  history,
}: {
  history: SubscriptionHistory[];
}) {
  const t = useTranslations("Pricing");
  const tTier = useTranslations("Tier");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto mb-8 -mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost !text-xs mx-auto block"
      >
        {open ? t("hideHistory") : t("viewHistory")}
      </button>

      {open && (
        <div className="panel overflow-x-auto mt-4">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>{t("historyColDate")}</th>
                <th>{t("historyColTier")}</th>
                <th>{t("historyColStatus")}</th>
                <th>{t("historyColPaypalRef")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="text-text-dim">
                    {new Date(h.createdAt).toLocaleString(locale)}
                  </td>
                  <td className="text-gold">{tTier(h.tier)}</td>
                  <td className="text-text-dim">{h.status}</td>
                  <td className="text-text-dim">{h.paypalRef || "—"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-text-dim py-6">
                    {t("noHistory")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
