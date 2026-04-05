# Handoff: ADE Task 05 → Task 06
**Date:** 2026-04-05
**Status:** COMPLETE — All 427 tests passing, committed (bc16ef3), pushed to origin/main

---

## 1. What Was Done

Task 5 (Area Derivation Logic + Efficiency System) fully implemented:

### New File: `src/data/areaBenchmarks.js`
- **EFFICIENCY_BENCHMARKS**: 11 asset types with benchmark efficiency % and area labels
  - Retail/Mall → GLA (75%, 70%)
  - Office → NLA (80%)
  - Residential Villas → NSA (90%)
  - Residential Multifamily/Serviced Apts → NUA (82%, 75%)
  - Hotel/Resort → NUA (65%, 55%)
  - Marina → Berth Area (100%)
  - Yacht Club → NUA (70%)
  - Parking Structure → Parking NUA (95%)
- **AREA_BASES**: definitions for gfa/unit/key/berth/land area basis types
- **`deriveAreas(asset)`**: computes netArea, coveragePct, FAR, leasableArea
- **`getBenchmarkEfficiency(assetType)`**: returns benchmark % or 85 default
- **`getAreaLabel(assetType, lang)`**: returns appropriate area label per type/language

### Updated: `src/components/AssetDetailPanel.jsx`
- Added import from areaBenchmarks.js
- **Auto-sync GLA → efficiency**: when user enters GLA value, efficiency auto-updates to `min(100, round(GLA/GFA × 100))`; prevents infinite loop by not re-triggering GLA on efficiency change
- **Derived Values box**: blue info card shown in Area Breakdown section after Efficiency field, displays:
  - Net Area (labeled per asset type: GLA/NLA/NSA/NUA/etc.)
  - Coverage % (footprint / plotArea × 100)
  - FAR (GFA / plotArea)
  - Benchmark efficiency for this asset type
- **"Apply Benchmark" button**: appears only when current efficiency ≠ benchmark; resets efficiency to type default on click

### Updated: `src/components/views/AssetTable.jsx`
- Added import of `deriveAreas` from areaBenchmarks.js
- Added "Net Area" column (`key: "netArea"`, `w: 65`) in cols array after "Lease."
- Cell renders `deriveAreas(a).netArea` formatted, in blue (#0369a1)
- Column is **hidden by default** (added to hiddenCols initial Set) — user can toggle via column picker

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/data/areaBenchmarks.js` | NEW — benchmarks, derive functions |
| `src/components/AssetDetailPanel.jsx` | Import + GLA auto-sync + Derived Values box |
| `src/components/views/AssetTable.jsx` | Import + netArea column |
| `docs/TASK_ADE05_AREA_LOGIC_REPORT.md` | NEW — task report |

---

## 3. What Task 6 Needs to Know

### Area derivation architecture
- `deriveAreas(asset)` is the single source of truth for derived area calculations
- The engine (cashflow.js) still computes `leasableArea = gfa * efficiency / 100` **internally** — we do NOT pass our derived values to the engine
- The "sync" is: user enters GLA → UI updates efficiency → engine uses new efficiency
- `deriveAreas` returns same `netArea` as engine's `leasableArea` for consistency

### Key derived fields
```javascript
deriveAreas(asset) → {
  netArea:      round(gfa * efficiency/100),    // = engine's leasableArea
  coveragePct:  round(footprint/plotArea * 100), // 0 if no plotArea
  far:          round(gfa/plotArea * 100) / 100, // 0 if no plotArea
  leasableArea: round(gfa * efficiency/100),     // alias
}
```

### Where to find things
- areaBenchmarks.js: `src/data/areaBenchmarks.js`
- Derived Values UI: `src/components/AssetDetailPanel.jsx` lines ~191-230 (after efficiency field)
- Net Area column: `src/components/views/AssetTable.jsx` — in cols array and in row rendering after "leasable" cell

### Test commands
```bash
node tests/engine_audit.cjs   # 267 tests
node tests/zan_benchmark.cjs  # 160 tests
# Total: 427 tests
```

---

## 4. Issues / Warnings

- Bundle still large (~2.98MB) — pre-existing, not introduced here
- `assetType` field on asset must match keys in `EFFICIENCY_BENCHMARKS` to get a non-default benchmark (e.g. "hotel", "mall", "office"). If assetType is unrecognized, defaults to 85%
- Coverage% and FAR in the Derived Values box are read-only derived displays; the asset also has editable `coveragePct` and `far` fields in the panel — these are separate (manual overrides). Task 6 may want to unify or clarify this UX
- `netArea` column is togglable but hidden by default — users must enable it via column picker
- No failing tests or build errors
