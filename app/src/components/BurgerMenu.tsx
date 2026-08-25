"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Holds every nav link except Subscriptions (which stays directly visible in
// the top bar, next to its countdown — see Navbar) — Team, Alliance,
// Competitive, Admin move in here so the bar itself stays down to just the
// logo, the burger, and Subscriptions.
export default function BurgerMenu({
  links,
}: {
  links: { href: string; label: string }[];
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

  if (links.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("menu")}
        aria-expanded={open}
        className="w-8 h-8 rounded flex items-center justify-center text-text-dim hover:text-gold hover:bg-panel-alt transition-colors"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        // Positioning lives on this outer box; `.panel` (unlayered
        // position: relative — always wins the cascade over a layered
        // position utility on the SAME element) is confined to the inner
        // box instead, so opening this can never affect the header's
        // height. See UserMenu for the same pattern.
        <div className="absolute left-0 top-full mt-2 w-48 z-40">
          <div
            className="panel p-2 flex flex-col gap-1"
            style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-data text-xs uppercase tracking-wide text-text-dim hover:text-gold px-2 py-1.5 rounded transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
