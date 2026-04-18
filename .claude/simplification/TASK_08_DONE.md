# Task 8/9 — Per-Investor Display — DONE

Date: 2026-04-18

## What landed
- `src/App.jsx`: Added a **Per-Investor Breakdown** table in the Results
  view (after Card 1 / Investors summary). Reads from the new
  `waterfall.investorOutcomes[]` source of truth.
  - Columns: Name | Role (Developer/Investor) | Invested | Distributions | IRR | MOIC
  - Only shown when there is >1 investor (legacy single-investor projects
    keep their old card untouched)
  - Uses the same Apple-HIG tokens (`--surface-table-header`,
    `--border-default`, `--text-primary`)

## Scope note
Focused on the highest-value surface (Results page). Additional locations
(ScenariosView, ReportsView, Excel export, AdvisoryReport) continue to use
the backward-compat `gp/lp` aliases — these still render correctly; Task 9
will audit and expand coverage if needed.

## Gate verification
- Build: ✅ vite build clean
- New tests: ✅ 82/82 pass
- Regression (49), financial_audit (67), round10 (43): ✅ all green
