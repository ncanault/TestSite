---
name: Evony Alliance Dashboard
description: A dark "war room" command-center dashboard for Evony alliance leaders, gold-accented and data-dense.
colors:
  bg: "#12151a"
  bg-deep: "#0b0d11"
  panel: "#1b2027"
  panel-alt: "#232a33"
  panel-raised: "#262e38"
  border: "#313a45"
  border-soft: "#262d38"
  text: "#e7e2d4"
  text-dim: "#8b93a1"
  gold: "#c9a961"
  gold-bright: "#e4c583"
  gold-dim: "#8f7c4d"
  steel: "#4f83a3"
  red: "#b5483f"
  orange: "#e08a3e"
  green: "#8aab5c"
  purple: "#8b7ec8"
  khaki: "#b3a06a"
typography:
  display:
    fontFamily: "Oswald, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "0.02em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "3px"
  md: "4px"
  pill: "999px"
spacing:
  xs: "0.4rem"
  sm: "0.6rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "#1a1408"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1.2rem"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.02)"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1.2rem"
  kpi-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1rem"
  field-input:
    backgroundColor: "{colors.bg-deep}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0.55rem 0.7rem"
---

# Design System: Evony Alliance Dashboard

## Overview

**Creative North Star: "The War Room"**

A dark command-center for an alliance leader planning combat and tracking a roster like a field command tracks a unit — dense, numeric, gold-lit against near-black. The identity was inherited from an operator-authored prior single-file HTML dashboard (SOG#669) and carried forward unbroken into this multi-page Next.js build: the same near-black layered surface, the same restrained gold accent, the same tabular/mono treatment of numbers. This pass amplified craft (panels gained inset highlight lines and layered shadows, buttons gained gradient sheen and lift, a signature `.reveal` entrance animation was added) without changing the identity's substance.

Density is moderate-to-high: KPI grids, data tables, and multi-panel dashboards dominate the "Operate" surfaces (dashboard, team, alliance, competitive, admin), while the home and pricing pages loosen into a more spacious "Persuade" register (hero, capability panel, pricing tiers) built from the same tokens. Nothing in the build reads as generic AI-default styling — no system-font stacks, no icon-font glyphs, no drop shadows without direction; every surface is built from the same panel/kpi-card/btn/field-input vocabulary defined once in `globals.css`.

**Key Characteristics:**
- Near-black layered surfaces (gradient panels, never flat fills) with a faint gold dot-grid + 45°/135° cross-hatch + vignette on the page body itself
- A single saturated accent (gold) reserved for actions, active states, and the KPI left-edge marker; everything else is desaturated steel/red/orange/green/purple used only as semantic data color
- Oswald uppercase for all headings and buttons; IBM Plex Mono for every number, code-like value, and label; IBM Plex Sans for body copy
- One shared entrance motion (`.reveal`, 0.7s ease-out-expo slide-up) applied to above-the-fold content, with staggered delay variants
- Hand-drawn inline SVG line icons (1.5px stroke, no fill) — never icon fonts or filled glyph icons

## Colors

A single-accent palette: near-black neutrals carry almost all surface area, gold is the one saturated color, and a small semantic set (steel/red/orange/green/purple) marks data meaning only.

### Primary
- **Command Gold** (`#c9a961`): the one accent. Primary buttons, active panel/kpi-card borders, links, section-label markers, focus rings, scrollbar thumb hover. Never used as a large fill.
- **Gold Bright** (`#e4c583`): the lit end of the primary-button and header-accent gradients; hover states brighten toward this.
- **Gold Dim** (`#8f7c4d`): the resting/inactive gold — kpi-card left-edge bar at rest, field-label and section-label text, mono-data secondary accents, unfocused pill borders.

### Neutral
- **Void** (`#0b0d11` — `--bg-deep`): deepest surface; field-input backgrounds, step-number badge fills, scrollbar track.
- **War Room Floor** (`#12151a` — `--bg`): page background, under the dot-grid/cross-hatch/vignette composite.
- **Panel** (`#1b2027`): base panel/card surface (gradient partner to panel-raised).
- **Panel Alt** (`#232a33`): pill backgrounds, secondary chip surfaces.
- **Panel Raised** (`#262e38`): the lit top of the panel gradient (`linear-gradient(165deg, panel-raised → panel)`).
- **Border** (`#313a45`) / **Border Soft** (`#262d38`): panel/table hairlines; border is the resting panel edge, border-soft the lighter table-row divider.
- **Parchment Text** (`#e7e2d4` — `--text`): primary text on dark surfaces — warm off-white, not pure white.
- **Dim Text** (`#8b93a1` — `--text-dim`): secondary/supporting copy, taglines, table captions.

### Semantic (data-only, not decorative)
- **Steel** (`#4f83a3`): defense-oriented values (e.g. top defense score).
- **Orange** (`#e08a3e`): attack-oriented values (e.g. top attack score).
- **Green** (`#8aab5c`): positive/active status (active subscription).
- **Red** (`#b5483f`): errors, cancelled status.
- **Purple** (`#8b7ec8`), **Khaki** (`#b3a06a`): reserved semantic slots for charts (BuffBarChart / EvolutionLineChart series) alongside the above.

### Named Rules
**The Gold Scarcity Rule.** Gold appears only as accent, never as a fill larger than a thin border, badge, or button: KPI-card left edge, active-panel border, primary-button gradient, focus ring. If a surface needs to feel "important," it earns a gold border or gold text — not a gold background.

**The War Room Material Rule.** The page body is never a flat color. It always carries the layered composite: radial dot-grid (1px dots, 28px pitch) + two diagonal 45°/135° cross-hatch repeating-gradients (34px pitch, matching the Hive Composition board's own motif) + a top vignette radial. Panels sit on top of this material as gradient-lit cards, not as flat rectangles on a flat page.

## Typography

**Display Font:** Oswald (with system-ui, sans-serif fallback)
**Body Font:** IBM Plex Sans (with system-ui, sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** A condensed, uppercase, military-stencil display face over a plain humanist body face, with every number and machine-readable value rendered in mono — the pairing reads as briefing-room signage plus a data terminal, not as an editorial or marketing typeface pairing.

### Hierarchy
- **Display / H1** (Oswald 500, `clamp(1.5rem, 4vw, 3.75rem)` i.e. `text-2xl` to `text-4xl sm:text-5xl xl:text-6xl` by context, line-height 0.95, uppercase, letter-spacing -0.01em): page/hero titles. Home hero is the largest use; dashboard/transactional headings (`text-2xl`/`text-3xl`) are the same face at smaller scale, not a different one.
- **Headline / Panel Title** (Oswald 500, `text-lg`–`text-xl`, uppercase): panel and card section titles ("Hive Composition", tier names, "Prêt à démarrer le suivi ?").
- **Title / Inline Label** (Oswald 500, `text-sm`–`text-base`, uppercase): small in-panel headers, step titles, capability titles.
- **Body** (IBM Plex Sans 400, `text-sm`–`text-lg`, line-height 1.6, `text-dim` for secondary copy): paragraph copy, taglines, descriptions. Kept short — no long-form running text in the product.
- **Label / Data** (IBM Plex Mono 400–500, `0.65rem`–`0.9rem`, tabular-nums, often uppercase + `letter-spacing: 0.05–0.15em`): field labels, section-label headers, table headers' numeric columns, KPI values, pills, table cell data. This is the "instrument panel" register — anything that is a number, a code, or a machine-read value goes here.

### Named Rules
**The Uppercase Display Rule.** `h1`–`h4` and `.font-display` are always uppercase with `letter-spacing: 0.02em` (h1: `-0.01em`). Sentence-case or lowercase headings do not occur in the build.

**The Mono-For-Numbers Rule.** Any value the user reads as data — KPI numbers, table cells, price figures, pill counts, form inputs — renders in IBM Plex Mono with `font-variant-numeric: tabular-nums`. Oswald is reserved for words (titles, labels, buttons); Plex Mono is reserved for values.

## Layout

A centered `max-w-7xl` container (`px-4 sm:px-6`) holds every page, with `py-8` top-level vertical padding from the root layout. Within that container, sections stack with generous top margin from `.section-label` dividers (`margin: 2.5rem 0 1rem`) rather than explicit page-level grid tracks.

Two compositional registers, both built from the same tokens:
- **Operate pages** (dashboard, team, alliance, competitive, admin): KPI-card grids (`grid sm:grid-cols-2/3 gap-4`), stacked panels, and `table.data-table` for rosters — data-dense, narrow gaps (`gap-4`).
- **Persuade pages** (home, pricing): looser, asymmetric grids — home's hero is `lg:grid-cols-[1.05fr_1fr]`, the capabilities panel is `sm:grid-cols-[1.3fr_1fr]` (one lead statement beside two compact points, not three identical cards), pricing tiers are `sm:grid-cols-3` with the flagship tier scaled up 4% and lifted.

Responsive behavior is mobile-stacking throughout (`grid` collapses to single column below `sm`); the product is explicitly desktop-first (per PRODUCT.md) but never breaks on mobile. Spacing rhythm runs on a loose 4/6/8/10/12 (`gap-4` through `gap-10`, gutters keyed to Tailwind's default scale) rather than a custom spacing token set — no bespoke spacing scale beyond Tailwind's own is defined in `globals.css`.

## Elevation & Depth

Hybrid: gradient tonal layering (every panel is a 165°-angled two-stop gradient, lighter at the top) combined with soft, diffuse (never hard-offset) shadows for lift. Depth signals importance and interactivity, not decoration — the `.panel.is-active` and `.kpi-card:hover` states are the only places shadow strength changes, and it changes by softening/warming (gold-tinted glow), not by adding a harder edge.

### Shadow Vocabulary
- **Panel rest** (`0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 24px -16px rgba(0,0,0,0.55)`): default panel — a hairline top highlight plus a soft under-shadow.
- **Panel active** (`... , 0 0 0 1px rgba(201,169,97,0.25), 0 16px 32px -18px rgba(201,169,97,0.25)`): selected/current-tier panel — the shadow itself turns gold.
- **KPI card rest / hover**: rest matches panel rest at smaller radius; hover adds `translateY(-2px)` and deepens to `0 16px 28px -16px rgba(0,0,0,0.65)` while the left-edge bar brightens from gold-dim to gold.
- **Primary button** (`0 8px 20px -8px rgba(201,169,97,0.55)`, hover `0 10px 26px -8px rgba(201,169,97,0.75)` + `translateY(-1px)`): the button is the only element whose shadow is gold at rest, not just on hover — signaling "the one thing to click."

### Named Rules
**The Soft-Shadow-Only Rule.** Every shadow in the system is diffuse and negative-offset-blurred (`Ypx blur -Nspread`), never a hard, unblurred offset shadow. This is a dark command-center material, not a neobrutalist poster; hard offset shadows are not part of this world.

## Shapes

Small, consistent corner radii throughout: panels and kpi-cards at 4px, buttons/inputs/pills at 3px, with true circles/pills reserved for two specific uses — the 999px `.pill` (stat chips, filter chips, tier badges) and small circular step-number badges (`rounded-full`, used in "How it works" / "Comment ça marche" numbered sequences). The `.section-label::before` diamond (a 6×6px square rotated 45°) is the one non-rectangular, non-circular mark in the system, used exclusively as the section-divider bullet.

Borders are 1px hairlines (`--border` at rest, `--gold`/`--gold-dim` on active/hover) on every panel, card, input, and table row — nothing is borderless. The recurring geometric motif is the 45°/135° diagonal cross-hatch, used at low opacity on the page body and echoed literally in the Hive Composition board's own grid.

## Components

### Buttons
- **Shape:** 3px radius (`rounded: 3px`), uppercase Oswald label, `0.06em` letter-spacing.
- **Primary** (`.btn-primary`): gold gradient fill (`gold-bright → gold`, 165°) on `#1a1408` near-black text, gold border, gold ambient shadow at rest. One primary action per view.
- **Hover / Focus:** primary brightens toward `#eeceb1`, lifts `-1px`, shadow deepens; all buttons depress `translateY(1px)` on `:active`. Focus uses the global 2px gold `:focus-visible` outline with 2px offset.
- **Ghost** (`.btn-ghost`): near-transparent background, `--text` label; hover shifts border and text to gold with a faint gold wash background. Used for secondary actions (logout, "voir les abonnements") and never paired with a second primary button in the same row.

### Cards / Containers
- **Panel** (`.panel`): 4px radius, 1px `--border`, 165° two-stop gradient fill, inset highlight + soft under-shadow. The default container for every grouped surface (forms, hero art, pricing tiers, dashboard access tiles).
- **KPI Card** (`.kpi-card`): panel gradient + a 2px `--gold-dim` left-edge accent bar (see Do's and Don'ts — this is a disclosed, spec-sourced exception, not a general "colored border" license). Fixed `min-height: 78px`, column layout for label/value/sublabel. Interactive variants (`a.kpi-card`, `.is-interactive`) lift and brighten the edge bar on hover.
- **Internal padding:** panels typically `p-5`–`p-8` depending on density; kpi-cards `0.85rem 1rem`.

### Inputs / Fields
- **Style** (`.field-input`): `--bg-deep` fill (darker than its parent panel), 1px `--border`, 3px radius, mono font, inset shadow for a recessed "terminal" feel.
- **Focus:** border shifts to `--gold-dim` and gains a 3px soft gold glow ring (`0 0 0 3px rgba(201,169,97,0.15)`), stacked with the resting inset shadow.
- **Labels** (`.field-label`): mono, uppercase, `--text-dim`, 0.7rem, always above the field.
- **Error:** inline `--red` text below the field/form, `aria-live="polite"`.

### Pills
- **Style** (`.pill`): `--panel-alt` fill, 1px `--border`, 999px radius, mono text, `--text-dim` at rest.
- **State:** `.active` (or the gold-bordered inline variant used for tier badges) shifts border and text to gold with a faint gold background wash. Used for stat chips (home hero), filter/status chips, and the "flagship tier" ribbon on pricing.

### Tables
- **Style** (`table.data-table`): mono throughout, uppercase Oswald column headers (`0.72rem`, `--text-dim`, on a faintly darker header band), 1px `--border`/`--border-soft` row dividers, subtle gold-wash row hover (`rgba(201,169,97,0.06)`). No zebra striping — hover is the only row-level color cue.

### Navigation
- **Navbar:** sticky, `--panel` at 90% opacity with backdrop-blur, 1px gold-tinted bottom hairline (`rgba(201,169,97,0.12)`). Wordmark is a rotated-square gold-gradient mark + uppercase "EVONY" in gold + mono subtitle. Nav links are mono, uppercase, `--text-dim` → gold on hover; auth actions render as ghost/primary buttons at reduced (`!text-xs !py-1.5`) size.

### Signature: Section Label
A recurring divider (`.section-label`) used to break a page into named zones ("Comment ça marche", "Accès", "Aperçu"): a rotated-square gold-dim diamond, mono uppercase gold-dim label text at `0.15em` tracking, and a fading gradient rule filling the remaining width. This is a structural section divider repeated identically across every page — not a per-headline kicker (see Do's and Don'ts).

### Signature: Hive Composition Board
A cross-hatched tactical grid (reusing the body's own 45°/135° motif) rendering the alliance's computed combat placement — the one component where the diagonal cross-hatch is a literal foreground grid rather than an ambient background texture, and the visual anchor the rest of the "war room" material language was built to match.

## Do's and Don'ts

### Do:
- **Do** keep gold to borders, text, and small fills only (see The Gold Scarcity Rule); a screen with a large gold background is off-system.
- **Do** render every number, price, table cell, and form value in IBM Plex Mono with tabular-nums; reserve Oswald for words.
- **Do** use soft, blurred, negative-offset shadows for all elevation; never a hard, unblurred offset shadow.
- **Do** use inline hand-drawn SVG line icons (~1.5px stroke, no fill, `currentColor`) sized 16–24px when an icon is needed; never an icon font or a filled glyph icon.
- **Do** treat the 2px gold-dim left-edge bar on `.kpi-card` and the page-body dot-grid/cross-hatch material as fixed, spec-sourced identity marks (both pinned in `.impeccable/config.json` as inherited from the operator's SOG#669 reference) — reproduce them exactly on new KPI cards and page backgrounds; don't invent a third colored-border or background-texture treatment elsewhere.

### Don't:
- **Don't** extend the kpi-card's colored left-edge-bar treatment to other card types (panels, pricing tiers, tables). It is scoped to KPI cards specifically because that is what the inherited spec pins — not a general "add a colored accent border to containers" license.
- **Don't** add a kicker or eyebrow line above a headline. The build's only standing divider pattern is `.section-label`, which marks a page zone, not an individual headline — it is not evidence for eyebrow-over-title composition and should not be read as license to add one.
- **Don't** introduce a system-default sans/serif display face or Material-style card elevation; the display face is always Oswald uppercase and elevation is always the soft-shadow gradient-panel treatment described above.
- **Don't** treat one-off page flourishes (e.g. the radial gold glow behind the home hero's Hive Composition preview, or a pricing tier's inline `scale`/shadow bump) as reusable tokens — they are single-use compositional accents in their surface, not system components.
