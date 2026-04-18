# 04 — Execution Plan

## Principles

1. **No engine breaking changes in any one task.** Each task preserves backward-compat aliases so that 316+ existing tests keep passing.
2. **TDD where possible.** New tests land before new engine behavior (Task 2).
3. **Engine before UI.** Finish engine refactor (Tasks 3–5) before touching any UI.
4. **Migration is one function.** `migrateProjectToInvestors()` in `src/engine/investors.js` is the single source of truth — used by engine internally AND by UI on project load.

## Task breakdown

### Task 1 — Inventory + Design docs
**File:** `.claude/simplification/{01..04}.md`
- Complete ✅

### Task 2 — TDD tests
**File:** `tests/new/*.cjs` (6 files)
- `investors_schema.cjs`, `waterfall_3stage.cjs`, `fund_manager.cjs`, `no_gp_lp_fields.cjs`, `finmode_simplified.cjs`, `developer_performance_incentive.cjs`
- All 6 fail initially (engine not refactored).

### Task 3 — Create `src/engine/investors.js` + rewrite `src/engine/waterfall.js`
**Output:**
- `src/engine/investors.js` (new): `migrateProjectToInvestors()`, `sumByRole()`, `developerIds()`
- `src/engine/waterfall.js` (rewritten): 3-stage model + compat aliases
- All legacy tests (audit_round10, waterfall_pin_tests, etc.) still pass via derived aliases
- `tests/new/waterfall_3stage.cjs` turns green

### Task 4 — Rewrite `src/engine/financing.js`
**Output:**
- Uses `migrateProjectToInvestors()` at top
- Equity computed from `project.investors[]`
- `perInvestorEquity[]` added to return
- `gpEquity/lpEquity/gpPct/lpPct/gpEquityBreakdown` kept as derived aliases
- Fund manager fees read from `project.fundManager.*` with fallback to top-level

### Task 5 — `phases.js` + `checks.js` + legacy cleanup
**Output:**
- `phases.js`: aggregator produces `investorOutcomes` aggregated
- `checks.js`: new T6 checks, legacy checks still work via aliases
- `incentives.js`: no structural changes, verify still passes
- `cashflow.js`: land-rent payer accepts new `investor:{id}` format
- DELETE `src/engine/legacy/phaseWaterfalls.js`
- All legacy tests green, all new tests green

### Task 6 — Investors UI screen + migration on project load
**Output:**
- `src/components/views/InvestorsView.jsx` (new)
- Fund Manager section (inside FinancingView collapsible)
- `App.jsx` project load: call `migrateProjectToInvestors()`, assign `investors`/`fundManager`, bump `_structureVersion: 3`
- Tab registration in App.jsx tab bar
- Old UI sections (Dev Investment / Partner Land / Land Cap Credit To / GP/LP manual) remain visible — user sees both layers temporarily

### Task 7 — Simplify FinancingView + defaults.js
**Output:**
- finMode dropdown: 3 values only
- Delete old equity sections (now managed in InvestorsView)
- Hybrid section → unified Debt Terms + `debt.beneficiary` dropdown
- `defaults.js`: remove 22 legacy fields, add `investors`, `fundManager`, `debt`, `_structureVersion: 3`
- `FINANCING_FIELDS` in phases.js: add new fields, remove removed ones

### Task 8 — Per-investor display everywhere
**Output:**
- WaterfallView, ResultsView, ReportsView, ScenariosView, AdvisoryReport, Excel export: all iterate `investorOutcomes[]`
- Dashboard KPI bar: Developer IRR / Investor IRR / Project IRR (no lp*/gp*)
- Zero GP/LP user-facing labels

### Task 9 — Final audit + cleanup + push
- Per-file audit docs under `.claude/simplification/audit_09_*.md`
- Dead-code grep sweep
- Full test sweep (all existing + all new)
- Legacy project smoke test (inline node -e)
- `FINAL_REPORT.md` with line counts, concepts removed/added, trade-offs, prior-task status

## Compatibility strategy

- **Engine is always backward-compatible** via `migrateProjectToInvestors()` shim + derived aliases.
- **Defaults.js evolves forward** — new projects use new schema only (Task 7).
- **UI has both old and new** between Task 6 and Task 8, with a banner explaining the transition.

## Test gates

Each task includes a gate-check script at top that verifies the previous task's artifacts exist. If gate fails, the task writes a `TASK_XX_BLOCKED.md` marker, commits it, pushes, and exits cleanly — does NOT attempt work on missing dependencies.

## Success criteria

- Engine size: 3,413 → ≤2,400 lines (target −30%)
- GP/LP refs in src/: 469 → < 80 (only inside `investors.js` shim as `@legacy`)
- finMode branches: 55 → ≤20
- Tests: 316+ passing preserved, +30 new tests green
- Zero user-facing "GP"/"LP" labels
- Build green
- Migration verified on legacy smoke test
