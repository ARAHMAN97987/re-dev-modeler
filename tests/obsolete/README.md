# Obsolete tests — archived 2026-04-18

These 14 `.cjs` files are pinned to the **legacy 4-tier waterfall** (preferred
return, catch-up, carry) that was retired by Simplification Campaign #1 and
whose field definitions were deleted in Campaign #2 Phase 2
(`3108766 refactor(engine): delete legacy 4-tier waterfall fields`).

Running them against the current engine produces failures because they assert
numbers that can only be produced by the old model (e.g. `prefReturnPct=15`,
`carryPct=30`, `gpCatchup=true`, `tier3 > 0`, etc.). The fields no longer
exist in defaults and the waterfall engine no longer has pref/catchup/carry
logic.

Kept here as a historical reference only. The **current authoritative test
suite** is `tests/new/*.cjs` (82 assertions across 6 files) plus the
remaining `tests/*.cjs` files that test the simplified engine.

## Files

| File | Original purpose |
|---|---|
| audit_phase_filter.cjs | Multi-Phase Filter Implementation (Rounds 1-6) |
| audit_round10_e2e.cjs | Jazan E2E with old waterfall |
| engine_audit.cjs | Engine comprehensive audit with pref accrual assertions |
| extraction_parity.cjs | Legacy vs consolidated waterfall parity |
| fin_audit_p2.cjs | Land/Equity + Waterfall + Fund + Fees audit |
| financing_settings_audit.cjs | Every financing setting combination |
| full_suite.cjs | Aggregator of pref/catchup/carry suites |
| input_impact.cjs | Asserts prefReturn/carryPct/catchup inputs affect outputs |
| rounds_18_20.cjs | Waterfall tier T1→T2→T3→T4 math |
| scenario_deep_audit.cjs | Per-scenario number trace with old tier names |
| ui_display_audit.cjs | Legacy UI display assertions |
| waterfall_hybrid_gp_moic.cjs | Hybrid-GP with legacy gov-pref |
| waterfall_sponsor_floor.cjs | 4-tier sponsor-promote floor |
| zan_benchmark.cjs | Benchmark against old Jazan model numbers |

## If you need to revive one

1. Rewrite assertions in terms of the current waterfall (3-stage):
   `ROC → Performance Incentive (above hurdleIRR) → Profit split pro-rata`.
2. Use the `tests/new/*.cjs` files as templates — they show the current idioms
   for `investors[]`, `gpEquity`/`lpEquity` aliases, and Performance Incentive.
3. Move the file back up to `tests/` and run it.
