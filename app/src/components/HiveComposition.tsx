"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { attackScore, computeHiveComposition, type AccountLike } from "@/lib/domain";

const GAP = 6;
const MIN_CELL = 64;
const MAX_CELL = 160;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

type SwapMenuState = { cellAccountId: bigint; left: number; top: number };

export default function HiveComposition({
  accounts,
  setter,
  canReorganize = false,
}: {
  accounts: AccountLike[];
  setter: AccountLike | null;
  // Team admin or leadership only — see CompetitivePage. Everyone else
  // still sees the same board, just without the right-click menu.
  canReorganize?: boolean;
}) {
  const t = useTranslations("HiveComposition");
  const locale = useLocale();
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [availWidth, setAvailWidth] = useState(600);
  const [availHeight, setAvailHeight] = useState(600);
  const [manualOrder, setManualOrder] = useState<bigint[] | null>(null);
  const [swapMenu, setSwapMenu] = useState<SwapMenuState | null>(null);
  const [zoom, setZoom] = useState(1);

  // A manual order only makes sense for the exact account set it was built
  // from — if the roster selection changes (AccountPicker checkboxes),
  // fall back to the auto layout instead of silently misapplying a stale
  // swap to a different set of accounts.
  const accountsKey = useMemo(
    () => accounts.map((a) => a.gameId.toString()).sort().join(","),
    [accounts]
  );
  const prevAccountsKey = useRef(accountsKey);
  useEffect(() => {
    if (prevAccountsKey.current !== accountsKey) {
      setManualOrder(null);
      prevAccountsKey.current = accountsKey;
    }
  }, [accountsKey]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setAvailWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The board used to only size itself to the panel's width, so a tall
  // hive on a short browser window (a laptop screen, a window not
  // maximized) could still overflow well below the fold. Sizing it off
  // window.innerHeight directly (not the panel's current position on the
  // page, which shifts with whatever's scrolled above it — an account
  // picker, other panels — and isn't what "fits the browser" means)
  // keeps it reacting to the actual window size, with a fixed allowance
  // for the nav bar and the page's own heading above the panel.
  useEffect(() => {
    function measure() {
      setAvailHeight(Math.max(320, window.innerHeight - 220));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!swapMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setSwapMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSwapMenu(null);
    }
    function onScroll() {
      setSwapMenu(null);
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
  }, [swapMenu]);

  if (accounts.length === 0) {
    return (
      <p className="text-text-dim text-sm py-16 text-center">{t("selectPrompt")}</p>
    );
  }

  const placements = computeHiveComposition(accounts, setter, manualOrder ?? undefined);
  const xs = placements.map((p) => p.x);
  const ys = placements.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  // Cell size is derived from whichever of the panel's available width or
  // the remaining browser height is tighter, so the diamond fills the
  // space without overflowing either axis, clamped to a legible range.
  // The zoom controls then scale that auto-fit size up or down on top —
  // going below MIN_CELL/above MAX_CELL is exactly the point of zooming.
  const rawCellSizeW = (availWidth - 24 - (Math.max(w, h) - 1) * GAP) / ((w + h) * 0.7072);
  const rawCellSizeH = (availHeight - 24 - (Math.max(w, h) - 1) * GAP) / ((w + h) * 0.7072);
  const autoCellSize = Math.min(MAX_CELL, Math.max(MIN_CELL, Math.min(rawCellSizeW, rawCellSizeH)));
  const cellSize = autoCellSize * zoom;

  const maxAtk = Math.max(...accounts.map(attackScore), 1);
  const gridPx = w * cellSize + (w - 1) * GAP;
  const gridPy = h * cellSize + (h - 1) * GAP;
  const boardSide = (gridPx + gridPy) * 0.7072 + 24;
  const showKeep = cellSize >= 80;

  function swap(cellAccountId: bigint, pickedId: bigint) {
    if (cellAccountId === pickedId) {
      setSwapMenu(null);
      return;
    }
    const baseOrder = manualOrder ?? placements.map((p) => p.account.gameId);
    const cellIdx = baseOrder.indexOf(cellAccountId);
    const pickedIdx = baseOrder.indexOf(pickedId);
    if (cellIdx === -1 || pickedIdx === -1) {
      setSwapMenu(null);
      return;
    }
    const next = [...baseOrder];
    [next[cellIdx], next[pickedIdx]] = [next[pickedIdx], next[cellIdx]];
    setManualOrder(next);
    setSwapMenu(null);
  }

  const swapMenuAccountId = swapMenu?.cellAccountId;

  return (
    <div ref={wrapRef} className="overflow-auto">
      <div className="flex items-center justify-between mb-2 gap-2">
        {canReorganize ? (
          <p className="text-text-dim text-xs">{t("reorganizeHint")}</p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label={t("zoomOut")}
            className="btn btn-ghost !text-xs !py-1 !px-2 disabled:opacity-30"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label={t("zoomReset")}
            className="font-data text-xs text-text-dim w-11 text-center hover:text-gold transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label={t("zoomIn")}
            className="btn btn-ghost !text-xs !py-1 !px-2 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      <div
        className="relative mx-auto"
        style={{
          width: boardSide,
          height: boardSide,
          backgroundColor: "#161a20",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(201,169,97,0.07) 0, rgba(201,169,97,0.07) 1px, transparent 1px, transparent 26px)," +
            "repeating-linear-gradient(135deg, rgba(201,169,97,0.07) 0, rgba(201,169,97,0.07) 1px, transparent 1px, transparent 26px)",
          borderRadius: 6,
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 grid"
          style={{
            gridTemplateColumns: `repeat(${w}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${h}, ${cellSize}px)`,
            gap: GAP,
            transform: "translate(-50%, -50%) rotate(45deg)",
          }}
        >
          {placements.map((p) => {
            const atk = attackScore(p.account);
            const opacity = p.isSetter ? 1 : 0.45 + 0.55 * (atk / maxAtk);
            return (
              // This cell (background/border) stays rotated with the grid —
              // that's what makes fixed-size square cells tile edge-to-edge
              // into a diamond mesh. Only the text inside is counter-rotated
              // back to upright; the tile shape itself must NOT be
              // counter-rotated, or the mesh collapses back into a
              // staggered grid of upright squares.
              <div
                key={p.account.gameId.toString()}
                onContextMenu={(e) => {
                  if (!canReorganize) return;
                  e.preventDefault();
                  setSwapMenu({
                    cellAccountId: p.account.gameId,
                    left: e.clientX,
                    top: e.clientY,
                  });
                }}
                style={{
                  gridColumn: p.x - minX + 1,
                  gridRow: p.y - minY + 1,
                  opacity,
                  background: p.isSetter
                    ? "radial-gradient(circle, rgba(201,169,97,0.35), rgba(201,169,97,0.08))"
                    : "var(--panel-alt)",
                  border: p.isSetter ? "2px solid var(--gold)" : "1px solid var(--border)",
                  boxShadow: p.isSetter ? "0 0 12px rgba(201,169,97,0.5)" : undefined,
                  borderRadius: 4,
                  cursor: canReorganize ? "context-menu" : undefined,
                }}
                className="flex items-center justify-center"
                title={t("cellTitle", { name: p.account.name, atk: atk.toLocaleString(locale) })}
              >
                <div
                  className="flex flex-col items-center justify-center px-1"
                  style={{ transform: "rotate(-45deg)" }}
                >
                  <span className="font-display text-xs text-center leading-tight">
                    {p.account.name}
                    {p.isSetter && <span className="text-gold"> ★</span>}
                  </span>
                  {showKeep && (
                    <span className="font-data text-[0.65rem] text-text-dim mt-0.5">
                      K{p.account.keep}
                    </span>
                  )}
                  <span className="font-data text-[0.7rem] text-gold mt-0.5">
                    {atk.toLocaleString(locale)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {swapMenu &&
        swapMenuAccountId !== undefined &&
        typeof document !== "undefined" &&
        createPortal(
          // Positioning lives on this outer fixed box; `.panel` (unlayered
          // position: relative — always wins the cascade over a layered
          // `.fixed`/`.absolute` utility on the SAME element) is confined
          // to the inner box instead. See globals.css's note on `.panel`.
          <div className="fixed z-50" style={{ left: swapMenu.left, top: swapMenu.top }}>
            <div ref={menuRef} className="panel p-2" style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}>
              <label className="field-label" htmlFor="hive-swap-select">
                {t("swapLabel")}
              </label>
              <select
                id="hive-swap-select"
                autoFocus
                defaultValue=""
                className="field-input !text-xs !py-1 !w-48"
                onChange={(e) => {
                  if (!e.target.value) return;
                  swap(swapMenuAccountId, BigInt(e.target.value));
                }}
              >
                <option value="" disabled>
                  {t("swapPlaceholder")}
                </option>
                {[...accounts]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((a) => (
                    <option key={a.gameId.toString()} value={a.gameId.toString()}>
                      {a.name}
                      {a.gameId === swapMenuAccountId ? ` (${t("currentHere")})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
