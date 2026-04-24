# Asset Program — Comprehensive Audit

**Date:** 2026-04-24
**Scope:** Every layer the Asset Program tab touches — UI, state, engine, persistence, exports, integration with the rest of the app.
**Purpose:** Single reference document. Anyone picking up future work reads this once and knows how the whole surface behaves.

---

## 1. Layered architecture

```
┌─────────────────────────────────────────────────────────────┐
│  UI                                                         │
│   ─ AssetTable          (App.jsx ~5225-6085)                │
│       toolbar · filters · land section · phases bar ·       │
│       spreadsheet table · per-asset cash-flow expandables · │
│       hotel/marina P&L modals                               │
│   ─ AssetDetailPanel    (components/AssetDetailPanel.jsx)   │
│       right-side drawer · 6 sections · ~40 fields           │
│   ─ HotelPLModal / MarinaPLModal (components/shared/*)      │
├─────────────────────────────────────────────────────────────┤
│  STATE (project object)                                     │
│   ─ project.assets[]           one entry per asset          │
│   ─ project.phases[]           phase metadata + timing      │
│   ─ project.land*              tenure, area, rent, etc.     │
│   ─ project.softCostPct,       project-wide cost defaults   │
│     contingencyPct                                          │
├─────────────────────────────────────────────────────────────┤
│  ENGINE (pure, no side effects)                             │
│   ─ engine/cashflow.js      computeProjectCashFlows         │
│       · computeAssetCapex   · computeAssetCapexBreakdown    │
│   ─ engine/phases.js        per-phase aggregation +         │
│                             land-rent footprint allocation  │
│   ─ engine/hospitality.js   hotel / marina P&L → opEbitda   │
│   ─ engine/math.js          calcIRR · calcNPV               │
├─────────────────────────────────────────────────────────────┤
│  PERSISTENCE                                                │
│   ─ Supabase (project JSON via useProject hook)             │
│   ─ Per-project localStorage mirror (dirty-flag save)       │
│   ─ Migration hooks: _feesVersion · _waterfallVersion       │
├─────────────────────────────────────────────────────────────┤
│  EXPORTS                                                    │
│   ─ excelAssetExport.js    NEW — 12-sheet Asset-only        │
│                            workbook with live formulas      │
│   ─ excelExport.js         "Full Model" (all tabs, Reports) │
│   ─ excelFormulaExport.js  formula-linked full model        │
│   ─ excelTemplateExport.js template-style full model        │
│   ─ utils/csv.js           CSV template · CSV export ·      │
│                            CSV / xlsx import                │
├─────────────────────────────────────────────────────────────┤
│  DOWNSTREAM CONSUMERS                                       │
│   ─ Dashboard KPIs · CashFlowView · Financing tab ·         │
│     Waterfall · Scenarios · Reports · Smart Reviewer ·      │
│     Checks — all read results.assetSchedules /              │
│     results.consolidated, none hold their own copy          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Asset object — every field, classified

Consolidated from `defaults.js`, the `addAsset()` factory, and every engine read confirmed via grep.

### 🟢 CRITICAL (engine reads, affects output)
| Field | Type | Engine role | Table editable? | Drawer editable? |
|---|---|---|---|---|
| `id` | UUID | identity | auto | — |
| `phase` | string | phase.completionYear drives timing | ✅ | ✅ |
| `name` | string | display + export label | ✅ | ✅ |
| `revType` | Lease/Operating/Sale | dispatches revenue formula | ✅ | ✅ |
| `gfa` | number | CAPEX base + Lease/Sale revenue base | ✅ | ✅ |
| `efficiency` | 0–100 | Lease leasableArea · Sale sellableArea | ✅ | ✅ |
| `costPerSqm` | number | CAPEX hard cost | ✅ | ✅ |
| `constrDuration` | months | CAPEX schedule proration | ✅ | ✅ |
| `leaseRate` | number | Lease revenue driver | ✅ | ✅ |
| `opEbitda` | number | Operating revenue driver | ✅ *(post-P1 fix)* | ✅ |
| `salePricePerSqm` | number | Sale revenue driver | ❌ drawer-only | ✅ |
| `absorptionYears` | number | Sale revenue spread | ❌ drawer-only | ✅ |
| `preSalePct` | 0–100 | Sale pre-sale in last build year | ❌ drawer-only | ✅ |
| `commissionPct` | 0–100 | Sale net proceeds | ❌ drawer-only | ✅ |
| `stabilizedOcc` | 0–100 | revenue occupancy factor | ✅ | ✅ |
| `rampUpYears` | number | revenue ramp curve | ✅ | ✅ |
| `escalation` | 0–100 | annual revenue growth | ✅ | ✅ |
| `footprint` | number | land-rent allocation by footprint share | ✅ | ✅ |
| `plotArea` | number | display + zoning warning | ✅ | ✅ |
| `basementLevels` | number | basement premium when > 0 | ❌ | ✅ |
| `basementCostMultiplier` | number | basement cost multiplier | ❌ | ✅ (advanced) |
| `parkingCostPerSqm` | number | adds parking CAPEX | ❌ | ✅ (advanced) |
| `parkingArea` | number | parking CAPEX base | ❌ | ✅ (advanced) |
| `softCostPctOverride` | number | overrides project soft% | ❌ | ✅ (advanced) |
| `contingencyPctOverride` | number | overrides project contingency% | ❌ | ✅ (advanced) |
| `hotelPL` | object | hospitality engine → opEbitda | via P&L modal | — |
| `marinaPL` | object | hospitality engine → opEbitda | via P&L modal | — |

### 🟡 SECONDARY (engine reads with safe defaults)
| Field | Engine fallback |
|---|---|
| `constrStart` | 0; engine prefers phase.completionYear, uses this only if completionYear is 0 |
| `category` | "Retail"; drives benchmark colouring |
| `assetType` | "retail_lifestyle"; picks CAP_RATE + `isBuilding` |
| `code` | "" (display only) |

### ⚫ PURELY DISPLAY (engine never reads)
| Field | Purpose |
|---|---|
| `floorsAboveGround` | Drawer — auto-derives expected GFA; zoning check |
| `coveragePct` | Drawer — zoning warning |
| `far` | Drawer — zoning warning |
| `gla` | Drawer — auto-derived = GFA × efficiency |
| `nla` | Drawer (advanced) — architect metric |
| `openArea` | Drawer (advanced) — no engine use |
| `isBuilding` | toggles geometry section visibility |
| `assetPriority` | annotation badge (drawer only, row badge removed in P4) |

### ☠️ DELETED in prior campaigns
`plotReference` (P5) · `notes` (P5) · `startYear` (P3) · `openingYear` (P3)

---

## 3. UI surfaces — what each control does

### 3a. Table toolbar
| Control | Writes to | Notes |
|---|---|---|
| Phase / Category / RevType filters | local state | display filter only |
| ⚙ Cols picker | `hiddenCols` state | session-local |
| Soft% / Contingency% inputs | `project.softCostPct` / `contingencyPct` | project-wide |
| ⬇ نموذج (Template) | generates CSV template | for bulk import |
| ⬇ Excel | generates 12-sheet xlsx | **new** — see §6 |
| ⬇ CSV | quick CSV of inputs | for re-import |
| ⬆ رفع (Upload) | `project.assets` | CSV or xlsx import |
| + أصل | opens Template Picker → addAsset() | — |

### 3b. Table cells
Every cell writes to `project.assets[i].<field>` via `upAsset(i, {...})`. `EditableCell` commits on blur/Enter (avoids focus loss during re-render).

### 3c. Per-asset cashflow expandable
Pure display. Reads from `results.assetSchedules[i]`. No writes.

### 3d. Drawer (6 sections)
| Section | Writes | Validations |
|---|---|---|
| Investment Metrics | — (display) | — |
| Basics | name, code, phase | — |
| Geometry | plotArea, footprint, floors, basement, gfa, coverage, far, efficiency, gla | Coverage > max · FAR > max · GFA mismatch · Eff > 100 |
| Geometry → Advanced | nla, parkingArea, openArea | — |
| Phase & Timeline | phase, constrDuration, assetPriority | — |
| Revenue (Lease) | leaseRate, stabilizedOcc, rampUpYears, escalation | non-negative |
| Revenue (Operating) | opEbitda, stabilizedOcc, rampUpYears | non-negative |
| Revenue (Sale) | salePricePerSqm, absorptionYears, preSalePct, commissionPct | non-negative |
| Cost | costPerSqm | non-negative |
| Cost → Advanced | basementCostMultiplier, parkingCostPerSqm, softCostPctOverride, contingencyPctOverride | — |

### 3e. Hotel / Marina P&L modals
Produce `hotelPL` / `marinaPL` objects + derive `opEbitda`. Engine only reads `opEbitda`; the PL objects are stored for round-trip editing.

---

## 4. End-to-end data flow for one edit

```
user types leaseRate = 800 in table cell
  │
  ▼
upAsset(i, { leaseRate: 800 })
  │
  ▼
setProject({ ...project, assets: [...updated] })
  │
  ▼
useMemo → computeProjectCashFlows(project)
  │
  ├─▶ for each asset:
  │     1. computeAssetCapex → scalar total CAPEX
  │     2. loop year 0..horizon:
  │        a. CAPEX schedule (over construction years)
  │        b. revenue schedule by revType (Lease/Operating/Sale)
  │     3. schedules[i] = { capexSchedule[], revenueSchedule[],
  │        totalCapex, totalRevenue, leasableArea }
  │
  ▼
engine/phases.js → per-phase aggregation + land-rent footprint allocation
  │
  ▼
results = { assetSchedules, phaseResults, consolidated,
            landRentMeta, ... }
  │
  ├─▶ AssetTable KPIs recompute
  ├─▶ every cell re-reads its source
  ├─▶ per-asset cashflow expandables re-render
  ├─▶ AssetDetailPanel (if open) recomputes KPIs
  ├─▶ Dashboard KPIs update
  ├─▶ CashFlowView year-by-year updates
  ├─▶ Financing tab refires (totalProjectCost, maxDebt, ...)
  ├─▶ Waterfall tab refires
  ├─▶ Smart Reviewer re-runs (alerts update)
  └─▶ Checks tab re-runs validation
```

Every edit fires the entire pipeline — no stale data, no manual "recompute" button.

---

## 5. Edge cases & safety rails

### 5a. Defensive defaults in engine
- `asset.gfa || 0` — zero GFA silently produces zero revenue + CAPEX (not an error)
- `asset.efficiency ?? DEFAULT_EFFICIENCY_BY_REV_TYPE[revType]` — Sale defaults to 100 %, Lease/Op to 0 (so the user sees "no revenue" rather than unintended numbers)
- `asset.constrDuration || 12` — one-year fallback
- `asset.rampUpYears ?? 3` — 33 % → 67 % → 100 %
- `asset.stabilizedOcc ?? 100` — full occupancy
- `Math.max(1, asset.absorptionYears || 3)` — Sale never divides by zero

### 5b. Soft warnings (non-blocking)
- `constrDuration` vs `durYears` mismatch → `console.warn` (e.g. 30 mo ceiled to 2 yr drops the last 6 mo)
- Smart Reviewer: construction cost outliers, zero-revenue CAPEX, escalation > 10 %, ramp-up > 10 yr, etc.
- Zoning: coverage > max, FAR > max, GFA vs floors × footprint

### 5c. Hardened against
- Negative numbers (UI rejects, engine clamps)
- Missing phase → defaults to "Phase 1"
- Missing phase.completionYear → falls back to `constrStart` → falls back to 0
- Empty `assets[]` → cashflow is all zeros, no crash

### 5d. Fragile spots (non-blocking, worth knowing)
- `constrDuration` > 120 months: UI clamps but engine doesn't validate
- Scenario delay combined with `constrStart` can push construction past horizon; engine silently truncates
- Very small (GFA < 100) or very large (GFA > 1 M) assets work but look weird in the UI
- 100+ assets: table still scrolls fine, but per-asset cash-flow expandables get slow

---

## 6. New Excel export — what the user actually gets

Implemented in `src/excelAssetExport.js`. Replaces the old CSV-named-Excel export behind the "⬇ Excel" button. The old CSV path still exists behind a separate "⬇ CSV" button for quick re-import.

**File:** `<ProjectName>_Assets_Full.xlsx` · typical size 200–400 KB

### 12 sheets

| # | Sheet | Content | Formulas |
|---|---|---|---|
| 1 | **Read Me** | project metadata, sheet guide, formula glossary | — |
| 2 | **Inputs** | 22 columns / asset · bilingual · covers identity, geometry, revenue (all 3 types), cost, timing · Sale fields (`salePricePerSqm`, `absorption`, `preSale`, `commission`) now visible | values |
| 3 | **Geometry** | Plot / Footprint / Floors / Basement / GFA + derived Coverage %, FAR, GLA, Parking · zoning warnings amber-highlighted | derived |
| 4 | **Cost Breakdown** | cost/m² · above-ground · basement premium · parking · hard cost · soft % · soft cost · cont % · contingency · subtotal · scenario mult · total CAPEX · avg/m² | ✅ SUM totals |
| 5 | **Land** | project-level land params + year-by-year rent from engine | ✅ SUM total |
| 6 | **CAPEX Schedule** | year-by-year per asset · row & column totals | ✅ |
| 7 | **Revenue Schedule** | year-by-year per asset · row & column totals | ✅ |
| 8 | **Land Rent Schedule** | per asset allocated by footprint share | ✅ |
| 9 | **Net Cash Flow** | Revenue − Land Rent − CAPEX · **per-asset Excel IRR()** · payback year · portfolio total · **portfolio IRR()** | ✅ IRR + SUM |
| 10 | **Investment Metrics** | Total CAPEX · Annual Rev · YoC · Cap Rate · Exit Value · Dev Profit · Dev Margin (coloured green/amber/red) · Rev/m² · Cost/m² · Break-even Rent · portfolio row with ratio formulas | ✅ |
| 11 | **Phase Summary** | per phase aggregates · % of CAPEX/Revenue · land rent · portfolio SUM row | ✅ |
| 12 | **Smart Alerts** | active Smart-Reviewer warnings (if any) · severity coloured | — |

### Dynamic — what actually recalculates inside Excel

**IS dynamic:**
- All SUM totals on every sheet
- Per-asset IRR on Net Cash Flow sheet — Excel's `IRR()` over the year row; edit any year's number and IRR updates live
- Portfolio IRR — Excel `IRR()` on the portfolio-total row
- Investment Metrics ratios on the Portfolio row (Dev Margin, YoC computed from Total Exit Value / Total CAPEX)
- Phase Summary portfolio row

**Is NOT dynamic (engine-computed static values):**
- Year-by-year CAPEX curve (depends on construction start + duration + phase timing)
- Year-by-year Revenue curve (depends on ramp-up, Sale pre-sale + absorption, escalation compounding)
- Year-by-year Land Rent (depends on grace period, escalation-every-N, manual allocation override)

**Why:** those curves encode non-trivial pipeline logic. Mirroring them faithfully in cells would need ~200 Excel formulas per asset. Trade-off chosen: exact engine numbers + live subtotals/IRR. For what-if experiments, change an input in Haseef and regenerate — Excel subtotals and IRRs still stay live once opened.

---

## 7. Downstream integration

| Consumer | Reads | Note |
|---|---|---|
| Dashboard KPIs | `results.consolidated.*` | IRR, NPV, CAPEX, cash yield |
| CashFlowView | `results.consolidated.*`, phase results | year-by-year aggregate |
| Financing tab | `results.consolidated.totalCapex`, `totalEquity` | doesn't read asset fields directly |
| Waterfall tab | financing + waterfall | assets not visible here |
| Scenarios tab | re-runs `computeProjectCashFlows` per scenario | asset schedules recomputed per scenario |
| Reports tab | full asset list + schedules | bank package, fund memo, advisory report |
| Smart Reviewer | asset fields | 40 + rules across asset/fund/project scopes |
| Checks tab | T0 + T1 validations | phase vs. GFA totals, etc. |

All consumers respect the same reactive pipeline — nobody caches engine output.

---

## 8. Red flags worth flagging (not blocking, inventoried for future)

### 🟡 Minor
1. **`asset.constrStart` name overload** — engine treats it as both "construction start year" and "legacy fallback when completionYear is 0". The priority logic is coherent, the variable name isn't.
2. **CSV import doesn't accept Sale fields** (`salePricePerSqm`, `absorptionYears`, `preSalePct`, `commissionPct`). They map to null/0, leaving Sale assets silent. `utils/csv.js:TEMPLATE_COLS` also omits them.
3. **CSV template still lists `notes` column** — the drawer input was deleted in P5. Harmless but stale.
4. **`category` vs `assetType` drift** — the `assetType` picker sets category via `getCategoryFromType`, but a direct category edit doesn't back-propagate to assetType. Small risk of inconsistency on imported data.
5. **Operating-hotel/marina with empty PL** — table shows P&L button; modal opens with empty defaults; user may ship EBITDA = 0 by accident.
6. **Active scenario isn't tagged into the Excel export filename** — exported numbers are whichever scenario is active; Read Me mentions it, but the filename is always the same.

### 🟢 Safety gates (good as-is, keep)
- `computeAssetCapex` has a legacy fallback for old projects without basement/parking fields — old saved projects reproduce their original numbers.
- `DEFAULT_EFFICIENCY_BY_REV_TYPE` asymmetry (Sale = 100, Lease/Op = 0) is intentional and documented.
- Migration hooks (`_feesVersion`, `_waterfallVersion`) survive every change.

### ⚫ Dead/rename candidates (very low priority)
- `utils/csv.js: exportAssetsToExcel` is misnamed (returns CSV). The button label now reads "CSV", matching behaviour.
- `excelFormulaExport.js` + `excelTemplateExport.js` — two similar full-model exports. Could potentially consolidate one day; not urgent.

---

## 9. Verification protocol

After this ships:
```bash
npm run build                       # expect clean
pass=0; fail=0
for f in tests/*.cjs tests/new/*.cjs; do
  [ -f "$f" ] && node "$f" >/dev/null 2>&1 && pass=$((pass+1)) || fail=$((fail+1))
done
echo "$pass/$((pass+fail))"         # expect 39/39
```

Live smoke test on haseefdev.com once Vercel redeploys (~30–60 s):
1. Open Jazan project → Assets tab
2. Click "⬇ Excel" in the toolbar
3. Expect download `مشروع_جازان_Assets_Full.xlsx` (~200–400 KB)
4. Open in Numbers / Excel:
   - Read Me shows metadata + sheet guide
   - Inputs shows 30 assets; Sale-type assets show Sale values; others blank Sale columns
   - Net Cash Flow shows IRR per asset via Excel IRR() function
   - Edit any Net CF year value → IRR + portfolio totals recalculate
   - Phase Summary shows 3 phases correctly aggregated
   - Cost Breakdown total row SUM works (edit a line → total updates)

---

## 10. What this audit does NOT claim

- Not an exhaustive check of every `revType × landType × phase × scenario` permutation. The space is combinatorial.
- Not a re-verification of engine math vs. the original ZAN Excel. The engine has been tested across campaigns; deviations would show in `tests/`, not here.
- No performance benchmarking at 500 + asset scale — the tool works for < 100 assets in observed usage.
- No Supabase schema or migration audit — separate concern.

---

**End.** Together with `00_plan.md`, `01_mockup.html`, `02_drawer_audit.md`, and `FINAL_REPORT.md`, this is the complete Asset Program reference set.
