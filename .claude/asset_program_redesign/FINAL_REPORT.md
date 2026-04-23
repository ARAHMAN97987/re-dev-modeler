# Asset Program Redesign — Final Report

**Date:** 2026-04-18 (overnight session)
**Status:** 8 of 10 planned phases shipped. P6 + P7 skipped by explicit user request (keep "Hard Cost" + "Soft+Cont" columns and the column-resize drag handles).
**Shipped commits on `origin/main`:**

| Phase | Commit | Title | LOC Δ |
|---|---|---|---|
| — | `f545cca` | hotfix(ui): toggleTheme is not defined in home toolbar | +25 / -4 |
| P1 | `ba4ca77` | refactor(assets): remove Cards view from Asset Program | +4 / -74 |
| P2 | `f2fa5bb` | refactor(assets): remove inline Edit Modal — drawer is the only edit path | +5 / -77 |
| P3 | `5db61e4` | refactor(assets): Cost section — Advanced collapse + compact CAPEX summary | +70 / -52 |
| P4 | `a0eb50f` | refactor(assets): Geometry section — Advanced collapse for secondary areas | +8 / -6 |
| P5 | `493dec6` | refactor(assets): delete plotReference + notes UI inputs from drawer | +1 / -10 |
| P8 | `45d7086` | refactor(assets): land-rent allocation details → modal | +63 / -53 |
| P9 | `81bd569` | refactor(assets): cash-flow Show Details toggle removed — rows always on | +4 / -7 |
| P10 | *this* | cleanup: delete unused FieldGroup export + FINAL_REPORT | — |

**Net change:** ~180 lines deleted, one production-blocking bug fixed, two edit paths collapsed into one, four secondary fields hidden behind "Advanced" toggles, two annotation fields deleted outright, one inline expandable refactored into a modal, one redundant toggle removed.

---

## 1. The crash fix that unblocked everything (hotfix `f545cca`)

On first visit to the home page (ProjectsDashboard), production crashed with `ReferenceError: toggleTheme is not defined`. Root cause: Simplification #2 Phase 9 (commit `5c4b5ac`) added `theme`/`toggleTheme` inside `ReDevModelerInner`, but the home toolbar's toggle button lives in the separate `ProjectsDashboard` component — two different scopes.

Fix: extracted the theme state into a shared `useTheme()` hook in `components/shared/hooks.js`. The hook persists to `localStorage`, syncs `<html data-theme>`, and broadcasts a `haseefThemeChange` CustomEvent so both components stay live-synced when one flips. Now both `ProjectsDashboard` and `ReDevModelerInner` call `useTheme()` independently and the state is coherent.

---

## 2. What shipped (user-facing)

### 2a. One edit path, not two (P1 + P2)
Before: Clicking a card (or some row interactions) opened an **inline Edit Modal** centered on screen with 4 field-group sections. Clicking the `›` button opened the **AssetDetailPanel drawer** — a right-side panel with 6 sections and more fields. The two disagreed on what was shown, which is what the user called "مخربطة".

After: The Cards view is gone. The inline Edit Modal is gone. Only the drawer remains. Clicking a cell edits it in place (unchanged). Clicking `›` opens the drawer.

### 2b. Cost Configuration is calmer (P3)
Before: Four per-asset override fields (`basementCostMultiplier`, `parkingCostPerSqm`, `softCostPctOverride`, `contingencyPctOverride`) sat flat under an "Advanced (optional)" divider that was always visible. Underneath, a 33-line dark panel rendered 7 numbers that were already visible in the table's "Total CAPEX" column.

After: The four overrides are behind a collapsed "▶ متقدم" button. The 33-line dark panel is replaced by a single compact line:
```
تفصيل سريع:  Hard 120M · Soft+Cont 18M · Total 138M · avg/m² 2,300
```
Same math, different skin.

### 2c. Geometry & Areas: secondary fields hidden (P4)
Before: `NLA`, `Parking Area`, `Open Area` were always visible, pushing the useful fields (Plot / Footprint / Floors / GFA / Coverage / FAR / Efficiency / GLA + auto-derived benchmarks) further down.

After: the three secondary fields are behind a collapsed "▶ متقدم (مساحات إضافية)" block. The primary geometry fields + the derived-values callout stay open.

### 2d. Two annotation fields deleted (P5)
`plotReference` (masterplan plot #) and `notes` (freeform text) were flagged by the asset-program inventory audit as "pure-dead inputs". Both had zero engine consumption. Removed from `AssetDetailPanel` and from `newFieldDefaults` + `addAsset` factory. Existing values in saved projects survive (stored as-is); users just don't have an edit surface. Excel/CSV/AI context still read `a.notes || ""` and gracefully handle absence.

### 2e. Land rent allocation → modal (P8)
Before: An inline expandable under the Land section opened to a ~55-line detail panel with auto/manual toggle + per-phase share editor.

After: The expandable is a single button "⚙ توزيع متقدم للإيجار بين المراحل" that opens a centered modal with the same content. Same math. Less clutter in the main flow.

### 2f. Cash-flow "Show Details" toggle removed (P9)
Net Income + Cumulative rows now always render under each per-asset expansion. Two rows are not a visual burden; the toggle added cognitive load with no real payoff.

---

## 3. What was NOT touched (explicit keep-list)

- **Engine** (`engine/cashflow.js`, `engine/phases.js`, etc.) — unchanged.
- **All IRR / CAPEX / Revenue / scoring math** — unchanged.
- **Hotel + Marina P&L modals** — unchanged.
- **Template Picker** — unchanged (triggered by "+ أصل").
- **Filter bar** — unchanged.
- **Phases bar** — unchanged.
- **Smart-Reviewer alert dots** on asset names — unchanged.
- **Benchmark-colour indicator bars** on rate/cost/efficiency cells — unchanged.
- **Zoning warnings** (Coverage > max, FAR > max) — unchanged.
- **GFA-vs-floors sanity check warning** — unchanged.
- **Score cell** (viability + impact) — unchanged.
- **Investment Metrics section** of the drawer (ROI / Cap Rate / Exit Value / Dev Profit / Dev Margin / Break-even / Revenue/m² / Cost/m²) — unchanged.
- **Per-asset cash-flow expandables** with year-range dropdown and IRR pill — unchanged.
- **Excel export + import** — unchanged.
- **Advisory Report generation** — unchanged (bug fixed in Simplification #2 Phase 1 still holds).

### Explicitly kept by user request (2026-04-18 chat)
- The "Hard Cost" and "Soft+Cont" columns in the table (originally planned for removal in P6).
- The column-resize drag handles in the table header (originally planned for removal in P7).

---

## 4. Verification artefacts

At every phase: **build clean**, **tests PASS=39 FAIL=0**, no new console errors.

- Phase 1: grep viewMode → 0 matches.
- Phase 2: grep editIdx → 0 matches; grep FieldGroup → only in FormWidgets export.
- Phase 3: capexBreakdown math unchanged (engine function untouched).
- Phase 4: zoning + efficiency logic unchanged.
- Phase 5: grep plotReference → only in legacy docs; grep assetNotes → 0 matches in src.
- Phase 8: landRentManualAlloc / landRentMeta plumbing identical.
- Phase 9: grep cfDetail → single comment reference.
- Phase 10: FieldGroup export removed; no other dead exports detected.

**Live smoke test:** Ask Vercel deploy ~30-60s after each push, then open haseefdev.com, navigate to Jazan → Assets tab, verify table renders, click "›" to open drawer, verify sections collapse/expand, verify IRR/CAPEX/Revenue numbers match pre-redesign snapshots.

---

## 5. If any phase needs reversing

Each phase is a single commit. To revert one without touching the others:

```bash
git revert <commit-sha>
```

For example `git revert 45d7086` brings back the inline land-rent expandable without undoing P9's cash-flow change. The phases are deliberately orthogonal.

---

## 6. Remaining ideas (not executed — for user's future consideration)

These were scoped out of this pass but noted here so they aren't lost:

1. **Click-to-open-drawer from the row itself** — currently only the `›` button opens the drawer; nothing happens on row click. If the user wants the whole row clickable (with cells still editable in place), that's ~10 lines of JSX.
2. **Score cell + Viability badge in drawer** — currently only shown in the table's Score column. Could be mirrored in the drawer's Investment Metrics header for at-a-glance context.
3. **"+ مرحلة" empty-state hint** when `project.phases.length === 0` — unlikely path but worth a friendly message.
4. **Asset Priority** still displayed as a small badge in the table row when not "standard" — not removed, but the user might want it fully hidden in favour of the Score cell's impact indicator.

None of these are blocking or on any plan; listed only as nice-to-haves.

---

## 7. Success metrics

| Metric | Before | After |
|---|---|---|
| Asset tab LOC in App.jsx | ~1,077 | ~880 |
| AssetDetailPanel LOC | 885 | 880 (≈same; reshuffled, not reduced) |
| Two edit paths | yes (inline modal + drawer) | **one** (drawer only) |
| Cards view | yes | **no** |
| "Advanced (optional)" flat-always-visible | yes | **collapsed by default** |
| `plotReference` + `notes` UI inputs | present | **deleted** |
| Inline land-rent expandable | present | **modal** |
| Redundant "Show Details" toggle | present | **removed, rows always on** |
| Production crash on home page | yes (toggleTheme ref error) | **fixed** |
| Tests pass/fail | 39/0 | 39/0 |
| Engine math change | — | none |

---

## 8. What's next

Per the plan's §7, the user's open questions were all answered through the execution:
1. Removal list — user approved all except P6 + P7 (honoured).
2. Deletion list (plotReference + notes) — user approved.
3. Execution order — followed as-is, except P6/P7 skipped.
4. One-commit-per-phase rhythm — followed (8 execution commits).
5. HTML mockup — used as reference; shipped UI matches the mockup's layout intent.

If the user wants a Phase 11 (e.g. click-row-opens-drawer) or Phase 12 (revive Priority badge or other), we start a new plan doc.
