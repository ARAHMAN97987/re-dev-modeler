# Revert Option A — UI Revert after Simplification Campaign #1

**Date:** 2026-04-18
**Commit:** `165c88a refactor(ui): revert to legacy Financing UI (Option A)`
**Prior commits involved:** `4cd6627`, `5658afe`, `fc3418c`, `251f653`, `67367a7`

## Context

Simplification Campaign #1 (9 tasks, commits `26646e2..9d41e32`) replaced the GP/LP/Catchup/Carry/Pref vocabulary with a unified `investors[]` model, collapsed `finMode` from 6 → 3 values, added `InvestorsView` to the UI, and added per-investor IRR/MOIC tables. Two deep audit rounds (`fc3418c`, `67367a7`) followed, fixing 10 engine bugs.

After shipping and browser-testing, the user decided the user-experience cost was higher than the architectural gain:
- The new `InvestorsView` required naming every investor, which was awkward for the single-project / self-funded use case.
- Treating the developer as "one investor with role=developer" felt heavier than the legacy GP/LP dichotomy.
- Per-investor breakdown tables were noise for the 95% case where there are only two parties (developer + fund).

## Decision: Option A — Revert UI only, keep engine

- Restore the legacy Financing UI (6 finMode options: `self, bank100, debt, fund, incomeFund, hybrid`, plus `landCapTo`, `gpInvestDevFee`, `gpDevFeeInvestPct`, `gpCashInvest`, `gpCashInvestAmount`, `gpEquityManual`).
- Keep the `investors[]` model as the engine's single source of truth.
- Keep `migrateProjectToInvestors()` as the bridge — it's called on project load (`App.jsx:358`) and before every compute path (`financing.js:19`, `waterfall.js:39`, `phases.js:405`) to populate `investors[]` from the legacy fields.
- Keep the 3-stage waterfall (ROC → Performance Incentive (20% above 15% hurdle, dev-only) → Profit split).
- Keep `allocateEquity()` and `equityByRole()` as the equity engine. All legacy aliases (`gpEquity`, `lpEquity`, `gpIRR`, `lpIRR`, `gpMOIC`, `lpMOIC`) are derived from the investors[] array.

## What was removed by the revert

- `src/components/views/InvestorsView.jsx` (file deletion).
- Per-investor IRR/MOIC breakdown section in ResultsView.
- `fundManager` UI (field kept in engine).
- Reduced-finMode dropdown (3 options).

## What was kept from the campaign

- All engine changes — `engine/investors.js`, `engine/waterfall.js` (3-stage), `engine/financing.js` (investors-aware), `engine/phases.js` (per-phase equity via allocateEquity).
- All 10 engine bug fixes from audit rounds `fc3418c` and `67367a7`.
- `tests/new/*.cjs` — 6 new test files, 82 assertions, all green.
- Migration hooks on load (`_feesVersion`, `_waterfallVersion`, `_structureVersion=3`).

## Implications

- The user-facing vocabulary stays GP/LP. No migration required for existing saved projects.
- The engine is stronger than pre-campaign — 10 bugs fixed, invariants (identity + formula + golden equation) hold across all financing modes.
- The 14 `tests/*.cjs` files that assert pref/catchup/carry behaviour are still failing — this is inherited from the campaign (not introduced by the revert). They will be triaged in Simplification Campaign #2.
- `FINAL_REPORT.md` and `TASK_09_DONE.md` have been corrected to reflect reality.

## Verification

See `.claude/audit_phase1_verification.md` for the full post-revert audit:
- Code integrity: all legacy fields wired, no dead references, migration paths live.
- Build: ✅ clean.
- Engine invariants: ✅ 11/11 scenarios.
- Browser walk-through on haseefdev.com, Jazan project: ✅ all 10 tabs, live reactivity confirmed, Excel export works, 43/43 engine-check invariants pass live.
- **One bug flagged:** Advisory Report crashes with `alerts.items` key mismatch — pre-existing since `8741aa1`, not caused by the revert. Triggered only when a project has active smart-alerts.
