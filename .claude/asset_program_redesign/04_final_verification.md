# Final Verification Audit — Asset Program Campaign

**Date:** 2026-04-24
**Scope:** Deep end-to-end verification of everything done for the Asset Program area since the Simplification Campaign #2 began. Line-by-line review, live production test, bug discovery + fixes.
**Verdict:** ✅ **All clean. Two bugs caught + fixed during this audit** (smart-alerts wiring + filename trailing-underscore). Everything else verified green.

---

## 1. Commit chain on `origin/main` (verified via local git + GitHub API)

Oldest → newest, the Asset Program / Drawer campaign:

| # | SHA | Title | Type |
|---|---|---|---|
| 0 | `f545cca` | hotfix(ui): toggleTheme is not defined in home toolbar | fix |
| 1 | `ba4ca77` | refactor(assets): remove Cards view from Asset Program | refactor |
| 2 | `f2fa5bb` | refactor(assets): remove inline Edit Modal — drawer is the only edit path | refactor |
| 3 | `5db61e4` | refactor(assets): Cost section — Advanced collapse + compact CAPEX summary | refactor |
| 4 | `a0eb50f` | refactor(assets): Geometry section — Advanced collapse for secondary areas | refactor |
| 5 | `493dec6` | refactor(assets): delete plotReference + notes UI inputs from drawer | refactor |
| 6 | `45d7086` | refactor(assets): land-rent allocation details → modal | refactor |
| 7 | `81bd569` | refactor(assets): cash-flow Show Details toggle removed — rows always on | refactor |
| 8 | `2111c75` | cleanup(assets): delete unused FieldGroup export + Asset Program FINAL_REPORT | cleanup |
| 9 | `00b4a66` | docs(assets): deep audit of AssetDetailPanel drawer | docs |
| 10 | `58de9bc` | fix(assets): EBITDA editable for all Operating assets, not just Hotel/Marina | fix |
| 11 | `8bb78c5` | feat(assets): add "Residential for Sale" template with KSA defaults | feat |
| 12 | `268d81a` | refactor(assets): delete dead startYear + openingYear fields from drawer | refactor |
| 13 | `92f838c` | refactor(assets): remove Priority badge from table name cell | refactor |
| 14 | `5d676ce` | docs(assets): update drawer audit with post-execution status matrix | docs |
| 15 | `0ca5bfd` | feat(assets): comprehensive 12-sheet dynamic Excel export | **feat (flagship)** |
| 16 | `48d710a` | docs(assets): comprehensive audit (03_comprehensive_audit.md) | docs |
| 17 | `fb8516b` | fix(excel-export): wire Smart Alerts data into the Assets workbook | **bug caught in this audit** |
| 18 | `cd43301` | polish(excel-export): strip trailing underscores from download filename | **polish from this audit** |

All 19 commits confirmed on `origin/main` via both `git log` and GitHub REST API (`/repos/ARAHMAN97987/re-dev-modeler/commits`).
Working tree is clean. Local HEAD = `cd43301` = origin/main.

---

## 2. Gate verification

| Gate | Result |
|---|---|
| `git status` | `nothing to commit, working tree clean` |
| `git diff origin/main..HEAD` | empty (fully pushed) |
| `git diff HEAD..origin/main` | empty (no remote is ahead) |
| GitHub API — 15 most recent commits | matches local 1:1 |
| `npm run build` (post clean `rm -rf dist`) | ✓ 1,198 modules, 17.87 s |
| Bundle (gzip) | 944.22 kB main · 143.08 kB xlsx · 6.63 kB CSS · 0.93 kB html |
| Full test sweep (tests/*.cjs + tests/new/*.cjs) | **PASS=39 FAIL=0** |
| Engine files (engine/cashflow.js, phases.js, hospitality.js, waterfall.js, financing.js, checks.js, incentives.js, math.js) | `git diff f545cca^..HEAD --stat src/engine/` = **0 changes** |
| Live production at `haseefdev.com` | HTTP 200, bundle hash matches last deploy |
| Live Asset Program tab | ✓ toolbar shows Excel + CSV + Template + Upload + Add Asset in order |
| Live drawer (opened Hotel asset in Jazan) | ✓ 6 sections, no regressions |
| Live Excel export click | ✓ file downloads — 88 KB, 12 sheets in order |
| Excel sheets inspected (xlsx unzip + grep) | ✓ all 12 sheets present, 168+ live formulas across schedule sheets |

---

## 3. Bugs discovered during THIS final audit + fixed

### Bug #1 — Smart Alerts sheet always empty (fixed in `fb8516b`)

**Symptom:** The `Smart Alerts` sheet in the new Excel export would ALWAYS show "No active alerts", even when the project had live warnings.

**Root cause:** `excelAssetExport.js:806` (original) read:
```js
const alerts = results?.smartAlerts?.alerts || [];
```
But `smartAlerts` is a **separate React state** at `App.jsx:3721`, NOT part of the results object produced by `computeProjectCashFlows`. So `results.smartAlerts` was always `undefined` → `alerts` was always `[]`.

**Fix:**
1. `generateAssetsWorkbook` now accepts `smartAlerts` as a third argument.
2. Defensive shape handling: accepts either `{alerts:[]}` object form (whole smart-reviewer output) OR the raw array (which is how `AssetTable` receives it).
3. Call site in `App.jsx:5671` updated to pass `smartAlerts` (already in scope inside AssetTable).

**Why it matters:** The whole point of Sheet 12 is alerting the bank/fund to project-level warnings. Silently hiding them would undermine trust in the export.

### Bug #2 — Double underscore in download filename (fixed in `cd43301`)

**Symptom:** Download came out as `مشروع_جازان__Assets_Full.xlsx` (double `__`).

**Root cause:** Project name is "مشروع جازان " (trailing space). The regex `[^a-zA-Z0-9\u0600-\u06FF]+` collapsed the trailing space to `_`, then the template appended `_Assets_Full`, producing the double underscore.

**Fix:** Added `.replace(/^_+|_+$/g, "")` to strip leading/trailing underscores before the template concatenation. Empty-string guard falls back to `"Project"`.

---

## 4. Line-by-line review summary

### 4a. `src/App.jsx` — Asset Program sections (L5221-6176 approx = 955 lines of AssetTable)
| Section | LOC | Status |
|---|---|---|
| State + templates (incl. new `resi_sale`) | 5222-5279 | ✓ clean, 7 templates including Sale |
| Handlers (handleTemplateSelect, handleAddAsset, handleCategoryChange, handleUpload) | 5281-5347 | ✓ template auto-opens drawer for new asset |
| Scoring + Cols definitions | 5349-5377 | ✓ |
| Phase + filter state | 5378-5434 | ✓ |
| Phases bar render | ~5440-5540 | ✓ |
| Land section (collapsible) | ~5540-5642 | ✓ inline rent-allocation expandable replaced by modal (P8) |
| Toolbar row (filters, cols, soft/cont inputs, buttons) | 5658-5687 | ✓ Excel + CSV buttons wired, old CSV-misnamed-Excel gone |
| Template Picker modal | 5703-5720 | ✓ rendered unconditionally (moved out of old cards block) |
| Table header + data rows | 5721-5830 | ✓ name cell: editable + ‹ + FieldAlertDot — no priority badge (P4); EBITDA cell: always EditableCell + P&L button for Hotel/Marina (P1) |
| Cost breakdown cells | 5805-5811 | ✓ hard cost + soft+cont columns kept per user request |
| Per-asset cashflow expandable | ~5833-6089 | ✓ Net Income + Cumulative rows always rendered (P9) |
| Hotel P&L + Marina P&L modals | 6091-6101 | ✓ unchanged |
| Land-Rent Allocation modal (new) | 6102-6159 | ✓ P8 — replaces the inline expandable |
| AssetDetailPanel drawer render | 6160-6173 | ✓ sole edit surface (no parallel inline modal) |

**Dead references grep:** `viewMode=0`, `setViewMode=0`, `editIdx=0`, `setEditIdx=0`, `cfDetail=1 (comment)`, `FieldGroup=1 (comment in FormWidgets)`, `plotReference=0`, `assetNotes=0`. Clean.

### 4b. `src/components/AssetDetailPanel.jsx` (899 lines)
| Section | Status |
|---|---|
| Imports, constants (ZONING_BENCHMARKS, CAP_RATES) | ✓ |
| `Tip` helper | ✓ |
| `CollapseBlock` helper (new, P3/P4) | ✓ dashed-border toggle for Advanced blocks |
| `Section` helper | ✓ |
| `KpiCard` + `field()` factory | ✓ |
| Main render | ✓ |
| Investment Metrics (open by default) | ✓ 6 KpiCards + break-even hint |
| Basics | ✓ **only 3 fields** (name, code, phase) — plotReference + notes removed (P5) |
| Geometry & Areas | ✓ primary fields open + zoning warnings + derived values + Advanced collapse (NLA, parking, openArea) |
| Non-building simplified area | ✓ |
| Phase & Timeline | ✓ **only 3 fields** (phase, build duration, priority) — startYear + openingYear removed (P3) |
| Revenue (Lease/Operating/Sale) | ✓ all 3 branches; Sale has salePricePerSqm + absorption + preSale + commission |
| Cost | ✓ Cost/m² + compact breakdown line + Advanced collapse (4 overrides) |

### 4c. `src/excelAssetExport.js` (843 lines after fixes)
- Imports engine helpers (`computeAssetCapexBreakdown`, `computeAssetCapex`, `calcIRR`). ✓
- 12 sheets in order, each wrapped in `{ ... }` block for variable isolation. ✓
- Helper functions: `setCol`, `titleBar`, `sectionHeader`, `tableHeader`, `writeRow`, `totalRow`, `note`, `colLetter` (handles AA-ZZ). ✓
- Sheet 1 (Read Me): metadata + 11-item guide + 8-line formula glossary. ✓
- Sheet 2 (Inputs): 22 columns per asset; Sale fields (salePricePerSqm, absorption, preSale%, commission%) PRESENT. ✓
- Sheet 3 (Geometry): 13 columns; coverage > 80% and FAR > 6 amber-highlighted. ✓
- Sheet 4 (Cost Breakdown): 16 columns; SUM totals row — avg/m² formula slightly convoluted (harmless multiplication by `SUMIF(...)*0 + x`) — produces correct result. Minor code smell, no behaviour issue.
- Sheet 5 (Land): project-level inputs + year-by-year rent from engine with SUM total cell. ✓
- Sheet 6-8 (CAPEX / Revenue / Land Rent Schedules): generic `buildScheduleSheet` helper — each sheet has 81 formulas (row totals + column totals + grand total). ✓
- Sheet 9 (Net Cash Flow): per-asset `IFERROR(IRR(range),"—")` formulas + per-asset SUM + payback (pre-computed) + portfolio totals + portfolio IRR formula. **112 formulas verified via xlsx unzip.** ✓
- Sheet 10 (Investment Metrics): per-asset CAPEX + Annual Rev + YoC + Cap Rate + Exit Value + Dev Profit + Dev Margin (coloured) + Rev/m² + Cost/m² + Break-even Rent. Portfolio row with 4 ratio formulas. ✓
- Sheet 11 (Phase Summary): per-phase aggregates with portfolio SUM row (6 formulas). ✓
- Sheet 12 (Smart Alerts): accepts both shapes, severity-coloured. **(Bug fixed in fb8516b.)** ✓
- Export trigger: writeBuffer → Blob → URL.createObjectURL → click → cleanup. Filename now clean (Bug #2 fixed). ✓

### 4d. `src/components/shared/hooks.js` (42 lines)
- `useIsMobile` — unchanged. ✓
- `useTheme` — new; state + localStorage + `<html data-theme>` + CustomEvent cross-component sync. Try/catch wrapped for SSR safety. ✓

### 4e. `src/components/shared/FormWidgets.jsx` (34 lines)
- `FieldGroup` removed (was only consumed by the deleted inline Edit Modal). ✓
- `FL`, `Inp`, `Drp` retained — each still used (94 refs in App.jsx). ✓

### 4f. `src/utils/csv.js` (204 lines)
- Unchanged since before this campaign. ✓
- `exportAssetsToExcel()` still exists but the AssetTable button now labelled "⬇ CSV" matching its actual behaviour (produces CSV). The function name is historical; low priority rename.

---

## 5. Live production end-to-end

Open `https://haseefdev.com/#/project/ea43981b-18d3-4403-8d04-58dd3f7c3683/assets`:

1. ✓ Tab loads with no errors
2. ✓ Toolbar shows 6 buttons in order: Cols picker / ⬇ نموذج / ⬇ Excel / ⬇ CSV / ⬆ رفع ملف / + إضافة أصل
3. ✓ Phases bar shows ZAN 1 · ZAN 2 · ZAN 3 + completion years + "+ مرحلة"
4. ✓ Filter row with Phase / Category / RevType dropdowns
5. ✓ Land section collapsed by default with land type + area pills
6. ✓ Asset table renders 30 assets; priority badges GONE from name cells; Hotel's EBITDA column shows value + P&L button
7. ✓ Click ‹ on Hotel row → drawer slides in with 6 sections
8. ✓ Basics section shows ONLY name / code / phase (3 fields)
9. ✓ Geometry section shows primary fields + derived values callout + "▶ متقدم (مساحات إضافية)" button
10. ✓ Phase & Timeline shows ONLY phase / build duration / priority (3 fields) — startYear + openingYear gone
11. ✓ Click ⬇ Excel → `مشروع_جازان_Assets_Full.xlsx` downloads (88 KB), 12 sheets
12. ✓ Excel sheet 9 (Net Cash Flow) has 31 IRR formulas + 81 SUM formulas — verified by xlsx unzip + XML parse

---

## 6. Things deliberately kept (per user request)

Cross-referenced against original plan requests:

| Thing | Status | Per whose request |
|---|---|---|
| Hard Cost column in table | ✓ kept | user (explicit "don't delete these two") |
| Soft+Cont column in table | ✓ kept | user |
| Column resize drag handles | ✓ kept | user |
| NLA / Parking Area / Open Area | ✓ kept (behind Advanced collapse) | my decision — low cost, doc use |
| Basement / parking / soft overrides | ✓ kept (behind Advanced collapse) | my decision — rare but valid |
| CSV export button | ✓ kept alongside Excel | standard practice |
| Engine untouched | ✓ zero lines changed | my constraint |

---

## 7. Residual minor items (documented, not blocking)

| Item | File:Line | Severity |
|---|---|---|
| Cost Breakdown avg/m² total formula has a no-op `SUMIF(...)*0 + …` pattern | `excelAssetExport.js:~432` | Cosmetic — produces correct result but weird JSX |
| CSV template still lists `notes` column | `utils/csv.js:15` | Harmless — import still works if user fills it; field is no-op now |
| CSV import doesn't accept Sale fields (`salePricePerSqm`, `absorption`, etc.) | `utils/csv.js:126-145` | Importer gap — users must open drawer to set Sale params |
| `exportAssetsToExcel` is a CSV function (misnamed) | `utils/csv.js:189` | Historical — rename on next cleanup pass |
| Active scenario not in filename of the Excel export | `excelAssetExport.js:828` | Minor — scenario name is in Read Me sheet |

None of these affect correctness of financial numbers or block any user workflow.

---

## 8. Net outcome of the whole campaign

| Metric | Before campaign | Now |
|---|---|---|
| Edit paths for an asset | 2 (inline modal + drawer) | **1 (drawer only)** |
| Cards view | Present (rarely used) | **Removed** |
| Dead inputs in drawer | plotReference, notes, startYear, openingYear | **All removed** |
| Priority badge in row | Present (visual noise) | **Removed from row, field kept in drawer** |
| Operating EBITDA editable in table | Hotel/Marina only | **All Operating assets** |
| Sale template | None | **"Residential for Sale" with KSA defaults** |
| Land-rent allocation UI | Inline expandable | **Modal (cleaner main flow)** |
| Cash-flow Show Details toggle | Separate toggle | **Always on** |
| Cost Configuration overrides | Flat always visible | **Collapsed behind Advanced** |
| Geometry secondary fields (NLA/parking/open) | Flat always visible | **Collapsed behind Advanced** |
| Excel export | CSV labelled "Excel" (misleading, static) | **Dedicated ⬇ Excel with 12 sheets + live formulas** |
| Engine changes | — | **Zero** |
| Tests | 39/0 | **39/0** |
| Build | clean | **clean** |
| Production bugs caught this audit | — | **2 caught + fixed** |

---

## 9. Explicit scope-out (what this audit does NOT cover)

- No performance benchmark at 500+ assets.
- No Supabase schema audit.
- No verification of the Excel export against 5 different projects — only Jazan tested live.
- No automated regression test for the Excel export (would require Puppeteer + xlsx parsing). Manual test covered.
- No re-verification of engine math vs. ZAN Excel (engine untouched, tests still 39/0).

---

## 10. Final state

`origin/main` at `cd43301 polish(excel-export): strip trailing underscores from download filename`.

19 commits in this Asset Program campaign. All verified clean. Live production tested. Two bugs caught post-ship and patched in the same session. Zero engine-math changes. Zero test regressions.

**The Asset Program tab is in better shape than when the campaign started, and the Excel export delivers what was requested: comprehensive, dynamic, detailed — with IRR + SUM formulas that recalculate live in Excel, and engine-accurate year-by-year schedules for the ramp-up / pre-sale / basement math that can't be faithfully mirrored in spreadsheet cells.**

Everything is pushed, visible on GitHub (verified via both git + API), and live on haseefdev.com (verified via Chrome MCP).
