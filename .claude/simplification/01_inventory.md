# 01 — Inventory of GP/LP + finMode + Waterfall Settings

**Baseline date:** 2026-04-18
**Campaign goal:** replace GP/LP + multi-mode finMode + hidden waterfall knobs with a unified `investors[]` model.

## Baseline line counts

| File | Lines |
|---|---|
| `src/engine/cashflow.js` | 397 |
| `src/engine/checks.js` | 475 |
| `src/engine/financing.js` | 806 |
| `src/engine/hospitality.js` | 37 |
| `src/engine/incentives.js` | 200 |
| `src/engine/index.js` | 89 |
| `src/engine/math.js` | 32 |
| `src/engine/phases.js` | 454 |
| `src/engine/waterfall.js` | 782 |
| `src/engine/legacy/phaseWaterfalls.js` | 141 |
| **Engine total** | **3,413** |
| `src/App.jsx` | 7,984 |
| `src/data/defaults.js` | 142 |

## Reference counts (grep)

- `gpEquity | lpEquity | gpDist | lpDist | gpIRR | lpIRR | gpMOIC | lpMOIC | gpCalls | lpCalls | gpNetCF | lpNetCF | gpPct | lpPct` — **469 src + 612 tests = 1,081 refs**
- `finMode === "..."` — **55 explicit branches**
- `prefReturnPct | gpCatchup | carryPct | lpProfitSplitPct | prefAllocation | catchupMethod | feeTreatment | gpIsFundManager` — **147 refs**

## Engine: GP/LP field producers

### `src/engine/financing.js` (806 lines)
Produces: `gpEquity, lpEquity, gpPct, lpPct, gpEquityBreakdown, gpPersonalDebt`
- L136–199: `self` mode branch — whole developer owns; no LP
- L203–329: multi-mode equity structure; `hasLP` gate decides GP/LP split
- L272–305: 6 equity sources combined into `gpEquity` (landCap / partnerLand / devFee / cash / gpEquityManual / lpEquityManual)
- L418–445: post-drawdown reconciliation re-scales GP/LP proportionally
- L730–746: hybrid-gp `gpPersonalDebt` object (developer personal loan)

### `src/engine/waterfall.js` (782 lines)
Produces: `gpDist, lpDist, gpNetCF, lpNetCF, gpIRR, lpIRR, gpMOIC, lpMOIC, gpDPI, lpDPI, gpCalls, lpCalls, gpCashIRR, lpCashIRR, gpCashMOIC, lpCashMOIC, gpSimpleROE, lpSimpleROE, gpTotalCalled/Dist/NetDist, lpTotalCalled/Dist/NetDist, gpLandRentObligation, lpLandRentObligation, gpLandRentTotal, lpLandRentTotal, gpNPV10/12/14, lpNPV10/12/14, tier1, tier2, tier3, tier4LP, tier4GP, developerAsInvestor, developerDevFees, developerPerfIncentive, developerTotalEconomics, developerCapitalReturn, sponsorWaterfallEconomics, developerEquity, investorEquity, developerPct, investorPct` (aliases)
- L262–267: per-year `gpCalls[y] = equityCalls[y] * gpPct`, `lpCalls[y] = equityCalls[y] * lpPct`
- L370–495: 4-tier waterfall (tier1=ROC, tier2=Pref, tier3=Catchup, tier4=Profit split)
- L571–581: per-year `lpNetCF[y] = -lpCalls[y] + lpDist[y] - lpLandRentObligation[y]`
- L632–655: MOIC/DPI computations
- L756–767: Saudi-style aliases (`developerEquity = gpEquity` etc.)

### `src/engine/phases.js` (454 lines)
Aggregates per-phase → consolidated using derived gp/lp sums.
- L160–222: `aggregatePhaseFinancings` — `sum('gpEquity')`, `sum('lpEquity')`, `sum('lpCalls')`, etc.
- L224–382: `aggregatePhaseWaterfalls` — similar.
- L316–317: `developerContribution`/`investorContribution` aliases.

### `src/engine/checks.js` (475 lines)
- L30: `T0 "GP+LP = 100%"` check
- L178–181: `T2 "Capital Structure Equation"` check uses `totalDebt + gpEquity + lpEquity`
- L338–358: `T3 LP Dist = (T1+T2)*LP% + T4LP` check
- L358–365: `T3 LP MOIC = Dist/Equity`, `T3 GP MOIC`
- L370–371: `T3 LP IRR Computed`, `T3 GP IRR Computed`
- L386–388: `T3 GP Catch-up Convention` warning (perYear + proRata)

### `src/engine/incentives.js` (200 lines)
- No gp/lp fields. Only `adjustedNetCF` / grants / subsidies. Minimal changes needed.

### `src/engine/cashflow.js` (397 lines)
- L220–336: land rent engine — no gp/lp
- Phase structure independent of investor model

### `src/engine/legacy/phaseWaterfalls.js` (141 lines)
- Legacy — target for deletion in Task 5.

## `finMode` branches (55 total)

| Value | Where | Unique behavior |
|---|---|---|
| `self` | financing.js:136 | Solo developer. Whole equity = dev. No waterfall. |
| `bank100` | financing.js:203 | 100% debt. `totalEquity=0`. `gpPct=1`. |
| `debt` | — | Debt + developer equity. No LP. |
| `fund` | waterfall.js:38 | Has LP. 4-tier waterfall. Fund fees apply. |
| `jv` | financing.js:268 | Alias of fund internally. |
| `hybrid` | financing.js:211 | Institutional debt + fund. `govBeneficiary: project|gp`. |
| `incomeFund` | waterfall.js:332 | Simplified pro-rata dist. Fund life ≠ horizon. |

## Settings to be deleted

| Setting | Default | Current use |
|---|---|---|
| `prefReturnPct` | 0 (already neutralized) | waterfall tier 2 |
| `gpCatchup` | false | triggers tier 3 |
| `carryPct` | 0 | GP share of tier 3+4 |
| `lpProfitSplitPct` | null (→lpPct) | tier 4 split |
| `prefAllocation` | "lpOnly" | proRata vs lpOnly pref distribution |
| `catchupMethod` | "perYear" | perYear vs cumulative catchup |
| `feeTreatment` | "capital" | capital | rocOnly | expense |
| `gpIsFundManager` | false | changes fee attribution |
| `gpEquityManual` | 0 | manual GP equity override |
| `lpEquityManual` | 0 | manual LP equity override |
| `gpInvestDevFee` | false | dev fee as equity |
| `gpDevFeeInvestPct` | 100 | % of dev fee reinvested |
| `gpCashInvest` | false | dev cash equity |
| `gpCashInvestAmount` | 0 | cash amount |
| `landCapTo` | "gp" | gp | lp | split |
| `govFinancingPct` | 70 | hybrid financing portion |
| `govBeneficiary` | "project" | project | gp |
| `govFinanceRate` / `govLoanTenor` / `govGrace` / `govRepaymentType` / `govUpfrontFeePct` | various | gov loan terms (merge into unified debt) |
| `hybridDrawOrder` | "finFirst" | merged into `capitalCallOrder` |
| `partnerEquityPct` | 0 | partner land equity share |

## Tests that will need updating

**Existing tests that already pass** (must continue via compat aliases):
- `tests/audit_part1_unlevered.cjs` (61 tests)
- `tests/audit_part2_capital.cjs` (61)
- `tests/audit_part3_debt.cjs` (29)
- `tests/audit_part4_fees.cjs` (31) — references `gpPct`, `lpPct`, `f.devFeeTotal`
- `tests/audit_part5_exit.cjs` (28)
- `tests/audit_part6_leveredcf.cjs` (22)
- `tests/audit_round5_fees.cjs` — fee basis
- `tests/audit_round6_dscr.cjs`
- `tests/audit_round7_phases.cjs`
- `tests/audit_round8_exit.cjs`
- `tests/audit_round9_incentive.cjs` (21)
- `tests/audit_round10_e2e.cjs` (44) — references `w.lpIRR`, `w.gpMOIC`
- `tests/waterfall_pin_tests.cjs` (24)
- `tests/financial_audit.cjs`, `tests/financial_audit_advanced.cjs`
- `tests/jazan_infra_fund.cjs`, `tests/jazan_sensitivity.cjs`
- `tests/stress_all_modes.cjs` — iterates all finMode
- `tests/regression.cjs`

**NEW tests to create** (Task 2, under `tests/new/`):
1. `investors_schema.cjs`
2. `waterfall_3stage.cjs`
3. `fund_manager.cjs`
4. `no_gp_lp_fields.cjs`
5. `finmode_simplified.cjs`
6. `developer_performance_incentive.cjs`

## UI screens rendering GP/LP labels

- `src/App.jsx` WaterfallView (~L409) — "Developer" / "Investor" columns
- `src/App.jsx` FinancingView (~L2452–3200) — equity breakdown
- `src/App.jsx` Dashboard KPI bar (~L4263) — lpIRR/gpIRR tiles
- `src/components/views/ResultsView.jsx` — IncomeFundResultsView shows LP yield
- `src/components/views/ScenariosView.jsx` — "عائد الممول (LP)" row in comparison
- `src/components/views/ReportsView.jsx` — exec/bank/investor report templates
- `src/components/shared/AdvisoryReport.jsx` — L228–230 LP IRR / MOIC rows

## Top 5 risks of the simplification

1. **Breaking saved projects** — 469 engine references × cached UI state. Migration must be deterministic on every legacy project. Solved by: `migrateProjectToInvestors()` shim in engine + compat aliases output.
2. **Test churn** — 612 test references. Keeping legacy tests green requires derived aliases in new engine output. Non-negotiable.
3. **Hybrid-gp complexity** — `govBeneficiary: gp` case (developer borrows personally, debt service deducted from GP distributions). Maps to `project.debt.beneficiary = "developer"` but must preserve the cash-flow mechanics exactly.
4. **Performance incentive attribution** — multiple developers split pro-rata, but edge cases: zero developers, dev with zero equity contribution, mixed dev+investor roles on one person.
5. **Display compatibility** — old projects may have cached `gpEquity`/`lpEquity`. UI fallback must degrade gracefully to 2-column view when `investorOutcomes[]` missing.
