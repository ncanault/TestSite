"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A small triangle trigger next to a table header that reveals a text
// filter for just that column. Renders through a portal into
// document.body, positioned from its own bounding box — like
// RowActionsMenu, this can never affect the table's layout (a filter
// popover growing the header row would be the same bug fixed there).
export default function ColumnFilterButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const active = value.trim() !== "";

  useEffect(() => {
    if (!open) return;

    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 4, left: rect.left });

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
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
        // Stop this click from bubbling up to the <th>'s own onClick,
        // which sorts by the column — opening the filter shouldn't also
        // trigger a sort.
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={label}
        aria-expanded={open}
        className={`ml-1 inline-flex items-center justify-center align-middle w-3 h-3 transition-colors ${
          active ? "text-gold" : "text-text-dim hover:text-gold"
        }`}
      >
        <svg viewBox="0 0 10 8" width="8" height="7" fill="currentColor">
          <path d="M0 0h10L5 8Z" />
        </svg>
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          // `.panel`'s unlayered `position: relative` always beats a
          // layered `.fixed` utility on the same element (see the note
          // above globals.css's `.panel` rule) — so positioning goes on
          // this outer, .panel-free box, and .panel styling goes on the
          // inner one, same as RowActionsMenu/UserMenu.
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="panel p-2" style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}>
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={label}
                className="field-input !text-xs !py-1 !w-36"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
