# ZAN Platform — Architecture Map

## Engine Layer (src/engine/*.js)
All files are ESM. App.jsx imports directly from these.

```
Level 0 (no deps):
  math.js          → calcIRR, calcNPV
  hospitality.js   → calcHotelEBITDA, calcMarinaEBITDA
  checks.js        → runChecks

Level 1:
  cashflow.js      → computeProjectCashFlows (depends: math)
  incentives.js    → computeIncentives (depends: math)
  waterfall.js     → computeWaterfall (depends: math)

Level 2:
  financing.js     → computeFinancing (depends: math, incentives)
  phases.js        → computeIndependentPhaseResults (depends: math, financing, waterfall)

Barrel:
  index.js         → runFullModel() orchestrator (for tests/external)
```

## Computation Pipeline (App.jsx)
```
project state (user edits)
  │
  ├─ computeProjectCashFlows(project) → projectResults
  │     └─ income[], capex[], landRent[], netCF[] per asset/phase
  │
  ├─ computeIncentives(project, projectResults) → incentivesResult
  │     └─ capexGrant, landRentRebate, feeRebate schedules
  │
  ├─ computeIndependentPhaseResults(project, projectResults, incentivesResult)
  │     ├─ For each phase: computeFinancing + computeWaterfall
  │     ├─ Aggregates → consolidatedFinancing, consolidatedWaterfall
  │     └─ Exposes → phaseFinancings, phaseWaterfalls
  │
  ├─ financing = consolidatedFinancing (from per-phase)
  ├─ waterfall = consolidatedWaterfall (from per-phase)
  │
  └─ runChecks(project, projectResults, financing, waterfall) → checks[]
```

## View Routing (ResultsView.jsx)
```
finMode → View Component
  "self"     → SelfResultsView  (no debt, no fund)
  "bank100"  → BankResultsView  (developer/owner dashboard)
  "debt"     → BankResultsView  (debt + equity, NO fund fees)
  "fund"     → WaterfallView    (GP/LP, waterfall, fees)
  "hybrid"   → WaterfallView    (gov + fund, dual CF)
  mixed      → BankResultsView + WaterfallView (side by side)
```

## Props Flow
```
App.jsx passes to all views:
  project, results, financing, waterfall,
  phaseFinancings, phaseWaterfalls, incentivesResult

Views NEVER recompute engine — they only format/display.
(Exception: PresentationView has live preview recalc)
```

## Files NOT Used by Frontend
```
src/engine/_deprecated/    → Old CJS files, dead code
  calcUtils.cjs            → Replaced by math.js
  assets.cjs               → Merged into cashflow.js
  cashflow.cjs             → Rewritten as cashflow.js
  inputs.cjs               → Replaced by data/defaults.js
  layer_abc.cjs            → Old test that used .cjs files
```

## Test Architecture
```
tests/helpers/engine.cjs   → Loads REAL .js engine files via eval
tests/stress_all_modes.cjs → 1831 tests: all mode combinations
tests/full_suite.cjs       → 205 tests: function-level verification
tests/regression.cjs       → 50 tests: regression guards
tests/ui_display_audit.cjs → 136 tests: display data verification
tests/scenario_deep_audit.cjs → 24 tests: realistic scenario tracing
```
