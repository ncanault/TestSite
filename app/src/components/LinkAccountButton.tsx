"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { linkAccountToMemberAction } from "@/app/actions/team";

// A compact trigger for a row with no platform user linked yet — reveals a
// small "pick who this is" picker on click instead of permanently
// occupying space in every unlinked row (which is what made the
// Leadership column read as "a link picker" rather than "a leadership
// checkbox" when most of the 85 real accounts had no link yet).
//
// Two triggers share this same popover: the "Link" text button in the
// actions cell (plain link, the default `action`) and the Leadership
// column's own checkbox for an unlinked row — clicking that checkbox is
// how the admin identifies who the account belongs to *and* names them
// leadership in one step (`action={linkAccountAndSetLeadershipAction}`),
// rather than linking elsewhere and coming back to check a box that used
// to just be disabled.
export default function LinkAccountButton({
  gameId,
  label,
  placeholder,
  members,
  action = linkAccountToMemberAction,
  trigger = "button",
  ariaLabel,
}: {
  gameId: bigint;
  label: string;
  placeholder: string;
  members: { id: string; playerName: string }[];
  action?: (formData: FormData) => void | Promise<void>;
  trigger?: "button" | "checkbox";
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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
    // The popover's <select autoFocus> can sit below the fold on a long
    // table — the browser scrolls it into view the instant it mounts,
    // which is itself a "scroll" event. Attaching the close-on-scroll
    // listener in the very same tick caught that self-inflicted scroll
    // and slammed the popover shut before anyone could use it. Deferring
    // registration by a frame lets that initial focus-scroll settle
    // first, so only a scroll the user causes afterward closes it.
    let scrollListenerAttached = false;
    const raf = requestAnimationFrame(() => {
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
      scrollListenerAttached = true;
    });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
      if (scrollListenerAttached) {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
      }
    };
  }, [open]);

  return (
    <>
      {trigger === "checkbox" ? (
        <input
          ref={btnRef as React.RefObject<HTMLInputElement>}
          type="checkbox"
          checked={false}
          // Stays unchecked until the account is actually linked — this
          // click only opens the picker, it never toggles by itself.
          onChange={() => {}}
          onClick={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          title={label}
          className="w-4 h-4 cursor-pointer align-middle accent-gold"
        />
      ) : (
        <button
          ref={btnRef as React.RefObject<HTMLButtonElement>}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-steel hover:underline text-xs"
        >
          {label}
        </button>
      )}

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          // Positioning lives on this outer fixed box; `.panel` (unlayered
          // position: relative — always wins the cascade over a layered
          // position utility on the SAME element) is confined to the inner
          // box instead. Same pattern as ColumnFilterButton/RowActionsMenu.
          <div className="fixed z-50" style={{ top: coords.top, left: coords.left }}>
            <div
              ref={popoverRef}
              className="panel p-2"
              style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
            >
              <form
                action={action}
                className="flex items-center gap-1"
                onSubmit={() => setOpen(false)}
              >
                <input type="hidden" name="gameId" value={gameId.toString()} />
                <select
                  name="userId"
                  defaultValue=""
                  required
                  autoFocus
                  className="field-input !text-xs !py-1 !w-32"
                >
                  <option value="" disabled>
                    {placeholder}
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.playerName}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-ghost !text-xs !py-1">
                  {label}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
