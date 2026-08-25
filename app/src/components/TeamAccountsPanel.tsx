"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import AccountForm, { type AccountFormValues } from "@/components/AccountForm";
import ColumnFilterButton from "@/components/ColumnFilterButton";
import LinkAccountButton from "@/components/LinkAccountButton";
import LinkAccountDialog from "@/components/LinkAccountDialog";
import RowActionsMenu from "@/components/RowActionsMenu";
import ConfirmDialog from "@/components/ConfirmDialog";
import { deleteAccountAction } from "@/app/actions/account";
import {
  toggleLeadershipAction,
  transferAllianceAdminAction,
  linkAccountAndSetLeadershipAction,
  linkAccountToMemberAction,
} from "@/app/actions/team";
import { attackScore, defenseScore, ratio, formatRatio, type AccountLike } from "@/lib/domain";
import { formatGameId, formatInt, formatPower } from "@/lib/format";

const menuItem =
  "font-data text-xs uppercase tracking-wide text-text-dim hover:text-gold px-2 py-1.5 rounded transition-colors text-left w-full";

type SortDirection = "asc" | "desc";

// Set only for accounts claimed by a platform user who's an accepted
// member of this alliance (not just pending in the Lobby) — the admin can
// only manage leadership/admin standing for those.
type LinkedUser = { id: string; isLeadership: boolean };

type Column = {
  key: string;
  label: string;
  sortValue: (a: AccountLike) => number | string;
  display: (a: AccountLike) => string;
};

// A freshly-joined account has keep 0 until its real stats are filled in
// (see requestJoinAlliance) — guard against the 0/0 that'd otherwise show
// as "NaN" in the table.
function powerPerKeep(a: AccountLike): number | null {
  return a.keep > 0 ? a.power / a.keep : null;
}

function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <svg
      viewBox="0 0 10 8"
      width="8"
      height="7"
      fill="currentColor"
      className="ml-1 inline-block text-gold"
      style={{ transform: direction === "desc" ? "rotate(180deg)" : undefined }}
    >
      <path d="M5 0 10 8H0Z" />
    </svg>
  );
}

type Account = AccountLike & { linkedUser: LinkedUser | null };

export default function TeamAccountsPanel({
  accounts,
  isOwner,
  ownerId,
  unlinkedMembers,
  currentUserId,
  canManageAll,
}: {
  accounts: Account[];
  // Only the alliance's admin (its owner) can name leadership or hand off
  // the admin seat — everyone else just sees the regular columns.
  isOwner: boolean;
  ownerId: string;
  // Accepted members with no Account row linked to them yet — offered as
  // the "link this account to..." picker for a row that has none. Empty
  // (and unused) for anyone but the owner.
  unlinkedMembers: { id: string; playerName: string }[];
  // The signed-in caller's own id — a regular member can only edit or
  // delete the one Account row linked to them; the admin/leadership
  // check below (canManageAll) lifts that restriction for everyone.
  currentUserId: string;
  canManageAll: boolean;
}) {
  const t = useTranslations("TeamAccountsPanel");
  const locale = useLocale();
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({
    key: "power",
    direction: "desc",
  });
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [linkTarget, setLinkTarget] = useState<Account | null>(null);

  function confirmDelete() {
    if (!deleteTarget) return;
    const formData = new FormData();
    formData.set("gameId", deleteTarget.gameId.toString());
    startDeleteTransition(() => {
      deleteAccountAction(formData);
    });
    setDeleteTarget(null);
  }

  const editing = useMemo(
    () => accounts.find((a) => a.gameId === editingId) ?? null,
    [accounts, editingId]
  );

  // Every column shares the same shape: how to compare two accounts for
  // sorting, and how to render the cell text — the filter box matches
  // against that same rendered text, so typing what you see always works.
  const columns: Column[] = useMemo(
    () => [
      {
        key: "gameId",
        label: t("colGameId"),
        sortValue: (a) => Number(a.gameId),
        display: (a) => formatGameId(a.gameId, locale),
      },
      {
        key: "name",
        label: t("colAccount"),
        sortValue: (a) => a.name.toLowerCase(),
        display: (a) => a.name,
      },
      { key: "keep", label: "Keep", sortValue: (a) => a.keep, display: (a) => String(a.keep) },
      {
        key: "power",
        label: "Power",
        sortValue: (a) => a.power,
        display: (a) => formatPower(a.power),
      },
      {
        key: "powerPerKeep",
        label: "Power/Keep",
        sortValue: (a) => powerPerKeep(a) ?? -1,
        display: (a) => powerPerKeep(a)?.toFixed(2) ?? "—",
      },
      {
        key: "rally",
        label: t("colRallyCap"),
        sortValue: (a) => a.rally,
        display: (a) => formatInt(a.rally, locale),
      },
      {
        key: "rein",
        label: t("colReinCap"),
        sortValue: (a) => a.rein,
        display: (a) => formatInt(a.rein, locale),
      },
      {
        key: "atk",
        label: "Atk Score",
        sortValue: (a) => attackScore(a),
        display: (a) => formatInt(attackScore(a), locale),
      },
      {
        key: "def",
        label: "Def Score",
        sortValue: (a) => defenseScore(a),
        display: (a) => formatInt(defenseScore(a), locale),
      },
      {
        key: "ratio",
        label: "Ratio",
        sortValue: (a) => ratio(a) ?? -1,
        display: (a) => formatRatio(ratio(a)),
      },
    ],
    [t, locale]
  );

  const rows = useMemo(() => {
    const filtered = accounts.filter((a) =>
      columns.every((col) => {
        const f = filters[col.key]?.trim();
        if (!f) return true;
        return col.display(a).toLowerCase().includes(f.toLowerCase());
      })
    );
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue(a);
      const vb = col.sortValue(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [accounts, columns, filters, sort]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const formValues: AccountFormValues | undefined = editing
    ? (() => {
        // AccountFormValues' index signature doesn't accept linkedUser
        // (string | number | undefined only) — drop it before spreading.
        const rest: Record<string, unknown> = { ...editing };
        delete rest.linkedUser;
        return { ...rest, gameId: editing.gameId.toString() } as AccountFormValues;
      })()
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-text-dim text-sm">
          {t("accountsTracked", { count: rows.length })}
        </p>
        {/* Creating a brand new account row is an admin/leadership action —
            a regular member only ever has their own (already-created) row
            to edit, reached from that row's own Edit button below. */}
        {canManageAll && (
          <button
            type="button"
            className="btn btn-ghost !text-xs"
            onClick={() => {
              setEditingId(null);
              setShowForm((s) => !s);
            }}
          >
            {showForm && !editingId ? t("close") : t("addAccount")}
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <AccountForm
          key={editing?.gameId.toString() ?? "new"}
          initial={formValues}
          onSaved={() => {
            setEditingId(null);
            setShowForm(false);
          }}
          onCancel={() => {
            setEditingId(null);
            setShowForm(false);
          }}
        />
      )}

      <div className="panel overflow-x-auto">
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap"
                >
                  {col.label}
                  {sort.key === col.key && <SortIcon direction={sort.direction} />}
                  <ColumnFilterButton
                    label={col.label}
                    value={filters[col.key] ?? ""}
                    onChange={(v) => setFilters((prev) => ({ ...prev, [col.key]: v }))}
                  />
                </th>
              ))}
              {isOwner && <th>{t("colLeadership")}</th>}
              {isOwner && <th>{t("colAdmin")}</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={a.gameId.toString()}>
                <td className="text-text-dim">{i + 1}</td>
                <td className="text-text-dim">{formatGameId(a.gameId, locale)}</td>
                <td className="text-text">{a.name}</td>
                <td>{a.keep}</td>
                <td className="text-gold">{formatPower(a.power)}</td>
                <td>{powerPerKeep(a)?.toFixed(2) ?? "—"}</td>
                <td>{formatInt(a.rally, locale)}</td>
                <td>{formatInt(a.rein, locale)}</td>
                <td>{formatInt(attackScore(a), locale)}</td>
                <td>{formatInt(defenseScore(a), locale)}</td>
                <td>{formatRatio(ratio(a))}</td>
                {isOwner && (
                  <td>
                    {a.linkedUser && a.linkedUser.id !== ownerId ? (
                      <form action={toggleLeadershipAction}>
                        <input type="hidden" name="userId" value={a.linkedUser.id} />
                        <input
                          type="checkbox"
                          defaultChecked={a.linkedUser.isLeadership}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="accent-gold w-4 h-4 cursor-pointer align-middle"
                          aria-label={t("colLeadership")}
                        />
                      </form>
                    ) : a.linkedUser?.id === ownerId ? (
                      <span className="text-text-dim">{t("adminBadge")}</span>
                    ) : unlinkedMembers.length > 0 ? (
                      // No platform user linked to this account yet — the
                      // checkbox stays clickable anyway: picking who this
                      // is and naming them leadership is one motion here,
                      // instead of linking elsewhere first and coming back
                      // to check a box that used to just be disabled.
                      <LinkAccountButton
                        gameId={a.gameId}
                        label={t("link")}
                        placeholder={t("linkPlaceholder")}
                        members={unlinkedMembers}
                        action={linkAccountAndSetLeadershipAction}
                        trigger="checkbox"
                        ariaLabel={t("colLeadership")}
                      />
                    ) : (
                      // Nobody left to link this account to — genuinely
                      // nothing this checkbox could do yet.
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 opacity-30 align-middle"
                        aria-label={t("colLeadership")}
                        title={t("linkFirstHint")}
                      />
                    )}
                  </td>
                )}
                {isOwner && (
                  <td className="whitespace-nowrap">
                    {/* Only leadership is eligible for the admin seat — make
                        someone leadership first (checkbox to the left). */}
                    {a.linkedUser && a.linkedUser.id !== ownerId && a.linkedUser.isLeadership ? (
                      <form action={transferAllianceAdminAction}>
                        <input type="hidden" name="userId" value={a.linkedUser.id} />
                        <button type="submit" className="text-steel hover:underline text-xs">
                          {t("makeAdmin")}
                        </button>
                      </form>
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                )}
                <td className="whitespace-nowrap">
                  {/* Link/Edit/Delete used to sit here as separate
                      permanent text links per row — with up to 85 rows
                      that alone made the table read as too wide/dense.
                      All three now live in the same compact "..." menu
                      already used on the Admin page. Link opens a
                      top-level modal (LinkAccountDialog) rather than the
                      anchored popover LinkAccountButton normally uses:
                      nesting that popover inside this menu's own portal
                      wouldn't survive the menu closing on click. */}
                  {(() => {
                    const canLink = isOwner && !a.linkedUser && unlinkedMembers.length > 0;
                    // A regular member manages only the one account linked
                    // to them — admin/leadership manage every row.
                    const canManage = canManageAll || a.linkedUser?.id === currentUserId;
                    if (!canLink && !canManage) return null;
                    return (
                      <RowActionsMenu label={t("actionsMenu")}>
                        {canLink && (
                          <button
                            type="button"
                            className={menuItem}
                            onClick={() => setLinkTarget(a)}
                          >
                            {t("link")}
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className={menuItem}
                              onClick={() => {
                                setEditingId(a.gameId);
                                setShowForm(true);
                              }}
                            >
                              {t("edit")}
                            </button>
                            <button
                              type="button"
                              className={menuItem}
                              onClick={() => setDeleteTarget(a)}
                            >
                              {t("delete")}
                            </button>
                          </>
                        )}
                      </RowActionsMenu>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 14 : 12} className="text-center text-text-dim py-8">
                  {t("noAccounts")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("confirmDeleteTitle")}
        message={deleteTarget ? t("confirmDeleteMessage", { name: deleteTarget.name }) : ""}
        confirmLabel={deletePending ? t("deletePending") : t("delete")}
        cancelLabel={t("cancel")}
        pending={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <LinkAccountDialog
        key={linkTarget?.gameId.toString() ?? "none"}
        open={linkTarget !== null}
        gameId={linkTarget?.gameId ?? null}
        accountName={linkTarget?.name ?? ""}
        members={unlinkedMembers}
        placeholder={t("linkPlaceholder")}
        title={t("linkDialogTitle")}
        confirmLabel={t("link")}
        cancelLabel={t("cancel")}
        action={linkAccountToMemberAction}
        onDone={() => setLinkTarget(null)}
        onCancel={() => setLinkTarget(null)}
      />
    </div>
  );
}
