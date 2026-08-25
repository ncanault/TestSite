"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AllianceLogoForm from "@/components/AllianceLogoForm";

export default function AllianceLogoEditor({
  tag,
  name,
  logoUrl,
  isOwner,
}: {
  tag: string;
  name: string;
  logoUrl: string | null;
  isOwner: boolean;
}) {
  const t = useTranslations("AllianceHeader");
  const [open, setOpen] = useState(false);

  const logo = logoUrl ? (
    // A link the owner pasted in, not fetched/stored by this app.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      className="w-48 h-48 rounded-full object-cover border border-border"
    />
  ) : (
    <div
      className="w-48 h-48 rounded-full flex items-center justify-center border border-border font-display text-5xl text-gold"
      style={{ background: "var(--panel-alt)" }}
    >
      {tag.slice(0, 3).toUpperCase()}
    </div>
  );

  if (!isOwner) {
    return <div className="shrink-0">{logo}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("editLogoLabel")}
        className="relative w-48 h-48 rounded-full group"
      >
        {logo}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-center text-sm leading-tight px-2 text-text opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(11,13,17,0.72)" }}
        >
          {t("editLogoLabel")}
        </div>
      </button>
      {open && <AllianceLogoForm currentUrl={logoUrl} />}
    </div>
  );
}
