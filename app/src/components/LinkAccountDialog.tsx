"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// A modal (not an anchored popover) for picking who an unlinked account
// belongs to — moved out of the "..." menu's own portal on purpose:
// RowActionsMenu closes on any click inside it, which would unmount a
// nested popover before it could ever render. This one lives at the
// panel's top level instead, driven by its own open/target state, the
// same way ConfirmDialog does for delete.
export default function LinkAccountDialog({
  open,
  gameId,
  accountName,
  members,
  placeholder,
  title,
  confirmLabel,
  cancelLabel,
  action,
  onDone,
  onCancel,
}: {
  open: boolean;
  gameId: bigint | null;
  accountName: string;
  members: { id: string; playerName: string }[];
  placeholder: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState("");

  if (!open || gameId === null || typeof document === "undefined") return null;

  function handleConfirm() {
    if (!userId || gameId === null) return;
    const formData = new FormData();
    formData.set("gameId", gameId.toString());
    formData.set("userId", userId);
    action(formData);
    onDone();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,13,17,0.72)" }}
      onClick={onCancel}
    >
      <div
        className="panel p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="text-lg font-display mb-1">{title}</p>
        <p className="text-text-dim text-sm mb-4">{accountName}</p>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          autoFocus
          className="field-input !text-sm w-full mb-5"
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
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn btn-ghost !text-xs">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!userId}
            className="btn btn-primary !text-xs disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
