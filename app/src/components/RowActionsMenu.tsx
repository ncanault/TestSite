"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A "..." trigger whose dropdown renders through a portal into
// document.body, positioned with `fixed` coordinates computed from the
// trigger's own bounding box. It never becomes part of the table row's (or
// any other container's) layout flow, so opening it can't push the row —
// or anything else — taller. Closes on outside click, Escape, or scroll.
export default function RowActionsMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // The table scrolls horizontally (overflow-x-auto) — rather than
    // re-tracking position on every scroll frame, just close the menu.
    function onScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-7 h-6 rounded flex items-center justify-center text-text-dim hover:text-gold hover:bg-panel-alt transition-colors"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          // Positioning lives on this outer box; `.panel` (which sets its
          // own `position: relative` and would silently win over `fixed`
          // here — it's declared outside Tailwind's layers, so it beats
          // utility classes regardless of order) is confined to the inner
          // box instead.
          <div
            className="fixed z-50 min-w-[190px]"
            style={{ top: coords.top, right: coords.right }}
          >
            <div
              ref={menuRef}
              role="menu"
              // Any click inside (a menu item, a form's submit button)
              // closes the menu — the action itself still fires normally.
              onClick={() => setOpen(false)}
              className="panel p-1.5 flex flex-col gap-0.5"
              style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
            >
              {children}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
