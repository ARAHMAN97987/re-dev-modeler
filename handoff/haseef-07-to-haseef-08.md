# Handoff: Haseef Task 7 Complete → Haseef Task 8
**Date:** 2026-04-05
**Commit:** df5b6e4 on main, pushed to origin
**Deploy:** https://haseefdev.com (dpl_9DfCPccDC9wkvqRwdX2rKFoBwmuv)

---

## What Was Done

### 1. New useMemo: `opexData` (App.jsx, CashFlowView, ~line 6777)
Added a new `useMemo` hook BEFORE the early return guard (hooks safety rule).
Computes per-phase and consolidated OPEX breakdown from asset P&L data:
- Iterates `results.assetSchedules` (array indexed same as `project.assets`)
- For hotel assets with `hotelPL`: calls `calcHotelEBITDA(a.hotelPL)` → ebitdaMargin, gopMargin, reserveRate=4%
- For marina assets with `marinaPL`: calls `calcMarinaEBITDA(a.marinaPL)` → ebitdaMargin, gopMargin, reserveRate=2%
- For each operating year: `grossRev = income / ebitdaMargin`, `gop = grossRev × gopMargin`, `opex = grossRev - gop`, `reserves = grossRev × resRate`
- Returns: `{ phaseData, cons, hasOpexData }` where `hasOpexData` is false for pure lease/sale portfolios

### 2. Phase Tables (App.jsx, inside `phases.map()`)
When `opexData.hasOpexData = true` and phase has data:
- Added 3 rows BEFORE existing income row: Gross Revenue (sub, green), (-) OPEX (sub, red negated), = GOP (bold)
- Relabeled existing `t.income` row → "EBITDA" (was "Revenue")
- Added 1 row AFTER EBITDA: (-) FF&E Reserves 4% (sub, amber negated)

### 3. Consolidated Table (App.jsx, consolidated table section)
Same pattern using `opexData.cons` instead of `opexData.phaseData[name]`

## Files Changed
- `src/App.jsx` — opexData useMemo + new rows in phase & consolidated tables
- `docs/TASK7_CASHFLOW_REPORT.md` — new report file

## Tests
- 267/267 engine_audit.cjs PASSED
- 160/160 zan_benchmark.cjs PASSED
- Engine untouched — all changes are display-only

## What the Next Task Needs to Know

### Architecture Patterns
- `opexData` hook is at App.jsx line ~6777 (right after the `c` useMemo)
- The hook pattern: compute before early return, use inside render conditionally
- `results.assetSchedules` is an ARRAY (not object), indexed same as `project.assets`
- `allPhaseNames` is derived from `Object.keys(results.phaseResults || {})`
- `opexData.phaseData[name]` key must match phase names from `results.phaseResults`

### Key Data Sources
- `calcHotelEBITDA` and `calcMarinaEBITDA` are imported from `./engine/hospitality.js` (already in App.jsx imports)
- Hotel PL params: `asset.hotelPL` (keys, adr, stabOcc, etc.)
- Marina PL params: `asset.marinaPL` (berths, avgLength, etc.)
- Assets without hotelPL/marinaPL are SKIPPED (generic Operating assets)

### Conditional Display
- All new rows are ONLY shown when `opexData.hasOpexData = true`
- If grossRev total = 0 for a phase, that phase's new rows are hidden
- If reserves total = 0, the reserves row is hidden
- Pure lease/sale portfolios: table shows exactly as before (no changes)

### Known Limitations
- Only works for assets with `hotelPL` or `marinaPL` populated
- Generic Operating assets (no P&L params, just `opEbitda` number) show no breakdown
- GOP is computed using `(ebitda + fixed) / totalRev` margin from P&L calculator
- Reserves are industry-standard rates (4% hotel, 2% marina), not engine-computed

## Any Issues
- None. Clean build, all tests pass, no regressions.
