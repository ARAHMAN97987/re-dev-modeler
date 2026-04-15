# Night Audit Report

Work completed autonomously against the `main` branch. All commits are pushed to `origin/main`; `git status` clean at wrap-up; tests green.

## Final state
- Local `main` = `origin/main` = **5970e96**
- 4 new commits tonight beyond the morning's 7-pass UI cleanup
- Net: 3 engine/test commits + 1 UI commit

---

## Tonight's commits (newest first)

| SHA | Type | Summary |
|---|---|---|
| `5970e96` | refactor(ui) | Asset-table per-asset expand — Total column, hide zero Land Rent, Full Settings link |
| `a6ec4c9` | test(waterfall) | 14-scenario legacy-vs-consolidated MOIC/IRR parity sweep |
| `df757f6` | fix(waterfall) | Hybrid-GP debt service now deducted from aggregated MOIC |
| `e3f4867` | fix(waterfall) | Sponsor-promote floor + quiet GP-CF warning |

## Bugs fixed

### 1. "Developer-as-investor only gets capital back, LP takes all profit"
**Root cause:** When a promote structure is active (`gpCatchup=true`, `carryPct>0`) and `lpProfitSplitPct > 100 - gpPct`, tier-4 profit routed entirely to LPs, zeroing GP's residual share. With `prefReturnPct=0` there is no tier-2/tier-3 to compensate, so GP earned MOIC 1.000x (exact capital back) while LP captured all profit.

**Fix:** `engine/waterfall.js` floors `gpSplitPct` at `gpPct`. A sponsor promote should reward the sponsor above equity pro-rata, never below. When configured splits violate that invariant, the engine falls back to equity-proportional. Covered by `tests/waterfall_sponsor_floor.cjs`.

Before: GP MOIC 1.000x, LP MOIC 1.606x.  
After: GP MOIC 1.485x, LP MOIC 1.485x (equity-pro-rata floor).

### 2. Hybrid-GP consolidated MOIC ignored developer's personal gov loan
**Root cause:** `aggregatePhaseWaterfalls()` in `phases.js` computed consolidated `gpMOIC` from `sum('gpNetDist')` (post-land-rent, pre-debt). The debt adjustment (`gpAdjNetDist`) was an internal scalar inside `computeWaterfall()` that never crossed the phase aggregation boundary.

**Fix:** `waterfall.js` now exports `gpDebtServiceTotal` and `gpAdjNetDist`. `phases.js` subtracts `sum('gpDebtServiceTotal')` from `gpNetDist` when re-computing consolidated `gpMOIC` / `gpCommittedMOIC`. `gpDPI` remains on the raw basis (DPI is by design a cash-on-cash payback measure). Covered by `tests/waterfall_hybrid_gp_moic.cjs` and `tests/waterfall_legacy_consolidated_parity.cjs`.

Before: consolidated gpMOIC 4.97x, legacy gpMOIC 1.365x (3.6x overstatement).  
After: both 1.365x. All 14 scenarios in the parity sweep pass.

### 3. Noisy "[waterfall] Year N: gpNetCF=..." warning
**Root cause:** Fired on every equity call because `gpNetCF < -1e6` is expected whenever there's a real fund call. Flooded logs during testing.

**Fix:** Re-targeted to fire only when non-call obligations (debt service + land rent) exceed distributions by > $1M — the actual distress signal.

## UI improvements

**Asset-table per-asset expand** (Assets tab → click ▶):
- Added a "Total" column after the Item label so users no longer have to sum years by eye.
- Hide the `(-) Land Rent` row when the asset's total land rent = 0 (consistent with Results-page rule).
- Added `⚙ Full Asset Settings ↗` footer link inside the expanded panel so users can jump to `AssetDetailPanel` without collapsing the row first.

## Tests

### Green across the board (after fixes)
- `full_suite.cjs`: all layers pass (27 unit + 6 bug-hunt + 3 integration + 4 property + 8 scenario packs)
- `absorption_equivalence.cjs`: 23/23
- `waterfall_sponsor_floor.cjs`: 6/6 (new)
- `waterfall_hybrid_gp_moic.cjs`: 6/6 (new)
- `waterfall_legacy_consolidated_parity.cjs`: 14/14 scenarios (new)

### Pre-existing non-regression
- `scenario_deep_audit.cjs`: 23/1 — same baseline as morning (1 failure is a parameter-sanity warning on a synthetic high-fee fund, not a correctness bug)

### New diagnostic probes (kept in repo for future debugging)
- `tests/probe_waterfall_edge_cases.cjs` — 15+ scenarios covering loss cases, promote variants, pref/carry boundaries, partner land, JV
- `tests/probe_waterfall_more.cjs` — perf incentive, fee treatments, income fund, gpInvestDevFee, hybrid-GP

## Known-open items (not addressed tonight)

- `scenario_deep_audit.cjs` parameter warning: one synthetic scenario has fee/equity ratio 67% > 40%. Not a correctness bug, but the threshold is hard-coded — could be made configurable or the synthetic scenario could be rebalanced.
- `AssetDetailPanel.jsx` (side panel): not restructured tonight. Current 6-section layout is reasonable; visible room to add inline "summary badges" on collapsed sections but that's enhancement, not a bug.
- Performance-incentive interaction with `gpInvestDevFee` + `lpProfitSplitPct` at extreme parameter combinations was not exhaustively probed. Current probe shows they compose reasonably, but formal invariants (e.g. "total distributions conserve") would be worth pinning.

## Workflow compliance

Per the user's explicit instruction ("وانتبه بالاخير انك تعدل وتفرفع على قيت هب"): every commit tonight followed `edit → build → commit → push origin HEAD`. Final `git log origin/main..HEAD` is empty. No local-only work remains.
