"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// A modal confirmation, not another anchored popover — a destructive
// action (delete) deserves the visitor's full attention, not a small
// panel next to a button they might not even be looking at. Positioning
// (the outer full-screen overlay) and styling (the inner `.panel`) stay
// split the same way as every other portal in this app.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,13,17,0.72)" }}
      onClick={onCancel}
    >
      <div
        className="panel p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <p className="text-lg font-display mb-2">{title}</p>
        <p className="text-text-dim text-sm mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn btn-ghost !text-xs">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="btn !text-xs"
            style={{ borderColor: "var(--red)", color: "var(--red)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
