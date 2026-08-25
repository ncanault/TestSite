"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AllianceNameTagForm from "@/components/AllianceNameTagForm";

// Team-page-only: lets the alliance's admin rename its tag/name inline,
// next to the read-only [tag] name heading every other page (Buffs
// Analysis, Battlefield, dashboard) still just prints via AllianceHeader.
export default function AllianceNameTagEditor({ tag, name }: { tag: string; name: string }) {
  const t = useTranslations("AllianceHeader");
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="text-2xl font-display leading-tight">
        [{tag}] {name}{" "}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-steel text-xs align-middle hover:underline"
        >
          {t("editNameTagLabel")}
        </button>
      </p>
      {open && <AllianceNameTagForm tag={tag} name={name} />}
    </div>
  );
}
