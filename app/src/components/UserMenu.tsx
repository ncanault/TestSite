"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/app/actions/auth";
import { updateAvatarColorAction } from "@/app/actions/profile";
import { AVATAR_COLORS } from "@/lib/avatar";
import { initials } from "@/lib/avatar";
import type { Role } from "@prisma/client";

const menuItem =
  "font-data text-xs uppercase tracking-wide text-text-dim hover:text-gold px-2 py-1.5 rounded transition-colors text-left w-full";

export default function UserMenu({
  playerName,
  email,
  avatarColor,
  role,
}: {
  playerName: string;
  email: string;
  avatarColor: string;
  role: Role;
}) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("accountMenu")}
        aria-expanded={open}
        className="w-8 h-8 rounded-full flex items-center justify-center font-data text-xs font-semibold shrink-0 transition-transform hover:scale-105"
        style={{ background: `var(--${avatarColor})`, color: "var(--bg-deep)" }}
      >
        {initials(playerName)}
      </button>

      {open && (
        // Positioning lives on this outer box; `.panel` (which sets its own
        // `position: relative` and would silently win over `absolute` here
        // — it's declared outside Tailwind's layers, so it beats utility
        // classes regardless of order) is confined to the inner box instead,
        // so opening this can never affect the header's layout/height.
        <div className="absolute right-0 top-full mt-2 w-60 z-40">
          <div
            className="panel p-2 flex flex-col gap-1"
            style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
          >
            <div className="px-2 py-2 border-b border-border mb-1">
              <p className="text-sm truncate">{playerName}</p>
              <p className="text-text-dim text-xs truncate">{email}</p>
            </div>

            <Link href="/dashboard" className={menuItem} onClick={() => setOpen(false)}>
              {t("dashboard")}
            </Link>
            <Link href="/account" className={menuItem} onClick={() => setOpen(false)}>
              {t("account")}
            </Link>
            {role === "ADMIN" && (
              <Link href="/admin" className={menuItem} onClick={() => setOpen(false)}>
                {t("admin")}
              </Link>
            )}

            <div className="px-2 py-2 border-t border-border mt-1">
              <p className="field-label mb-1.5">{t("avatarColorLabel")}</p>
              <form action={updateAvatarColorAction} className="flex gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="submit"
                    name="color"
                    value={c}
                    aria-label={c}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: `var(--${c})`,
                      outline: c === avatarColor ? "2px solid var(--text)" : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </form>
            </div>

            <form action={logoutAction} className="border-t border-border mt-1 pt-1">
              <button type="submit" className={menuItem}>
                {t("logout")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
