# Deep Audit — Option A (Radical Unification) — Completed

Date: 2026-04-18

After user walked through the platform as a real investor and flagged that
Investors tab was still "cosmetic" while FinancingView held contradictory
legacy fields, they chose **Option A (radical unification)**.

## Eight verified bugs, all fixed

| # | Bug | Status | Fix |
|---|-----|--------|-----|
| 1 | `createProject()` leaves `investors[]` undefined — Investors tab shows "no investors" on fresh projects | ✅ | Migration call added in `createProject()` (App.jsx) |
| 2 | finMode switch does not re-migrate — switching debt→fund leaves 1-developer orphan | ✅ | `up()` detects finMode change + `_investorsEditedByUser` flag → re-seeds investors[] when virgin |
| 3 | `landCapTo` dropdown in Financing duplicates `landCap` contributions in InvestorsView | ✅ | `landCapTo` dropdown removed; recipient is set via investor contribution type |
| 4 | `allocateEquity` policy ≠ `financing.js` override policy → `gp + lp ≠ Σ perInvestorEquity by role` | ✅ | Unified: both now use single `allocateEquity` with explicit `hasLP` context; `gpEquity = Σ dev.perInvestor` by construction (`equityByRole` helper) |
| 5 | Investors tab hidden in debt mode even with landCapitalize or partner land | ✅ | Visibility broadened: show when fund-like, OR landCapitalize, OR landType=partner, OR investors.length>1 |
| 6 | Dead banner "configure financing first" never reachable (Investors tab hidden when totalEquity=0) | ✅ | Banner moot now that tab shows in more cases; kept as defensive |
| 7 | `FinancingView > Developer Investment` section held `gpInvestDevFee`, `gpCashInvest`, `gpEquityManual` — dual-write conflict | ✅ | Entire section replaced with read-only summary + link to Investors tab |
| 8 | No validation for Σ contributions vs totalEquity — silent pro-rata scale-down | ✅ | Amber warning banners in InvestorsView: over-contribution, under-contribution, missing landCap recipient |

## Code changes

### Engine

- **`src/engine/investors.js`**
  - `allocateEquity()` rewritten with **unified policy**:
    - Resolves static contributions first (cash-with-amount, devFee, landValue, landCap, landPurchase).
    - Scale-down if static exceeds totalEquity.
    - Fill-rest absorbs remainder **only if role matches `hasLP`** policy.
    - Non-matching fill-rest slots get 0 (prevents phantom developer equity in fund mode).
  - New `equityByRole()` helper → canonical gp/lp derivation from perInvestorEquity.
  - Migration simplified: debt/self/bank100 → developer cash=0 (fill-rest) instead of `gpEquityManual`, so residual always flows to developer in hasLP=false modes.

- **`src/engine/financing.js`**
  - Imports `equityByRole`.
  - Legacy gp/lp split runs first (preserves behavior for projects without investors[]).
  - When investors[] has static contributions: `allocateEquity(...)` runs with `{ devFeeTotal, hasLP }`, and gp/lp are derived from it via `equityByRole`.
  - Final `perInvestorEquity` uses the SAME `allocateEquity` call signature (same hasLP) → perfect consistency between aliases and per-investor output.

- **`src/engine/index.js`** + **`tests/helpers/engine.cjs`**: export/load `equityByRole`.

### App / UI

- **`src/App.jsx`**
  - `createProject()`: seeds investors[] + fundManager + `_structureVersion: 3` immediately.
  - `up()`: when `patch.finMode` changes AND `!prev._investorsEditedByUser`, re-runs `migrateProjectToInvestors({...next, investors: undefined})` and overwrites investors[].
  - Investors tab visibility broadened (lease+cap, partner land, etc.).
  - FinancingView `Land & Equity` section:
    - Removed `landCapTo` dropdown → hint pointing to Investors tab.
    - Removed "Developer Investment" subsection (gpInvestDevFee, gpCashInvest) → single info banner.
    - Non-fund mode: removed `gpEquityManual` input → read-only summary.
    - `landRentPaidBy` simplified to 2 options (auto / project).

- **`src/components/views/InvestorsView.jsx`**
  - `setInvestors` marks `_investorsEditedByUser: true` on every edit → prevents accidental reseed on finMode change.
  - New validation warnings: over-contribution, under-contribution, missing landCap recipient.
  - Removed redundant "leasehold hint" banner (now surfaced as a validation warning).

## Test coverage

- **52 legacy test files:** all pass.
- **1 new file:** `tests/new/user_journeys.cjs` with **8 end-to-end scenarios**, 54 assertions, all pass:

  | # | Scenario | Checks |
  |---|----------|--------|
  | 1 | New debt project, no user edits | 1 dev, 100% equity, identity |
  | 2 | New fund project + lease + landCap | dev+inv auto, landCap 100M, identity |
  | 3 | User adds cash investor to fund | inv1=static, inv2=fill-rest, dev=0 |
  | 4 | landCap split via explicit investors | effectiveLandCap=sum, 50/50 split |
  | 5 | debt→fund switch with user edits | preserves user's investors[] |
  | 6 | fund→debt switch without edits | auto re-migration → clean dev-only |
  | 7 | Static > totalEquity | scale-down works, sum matches |
  | 8 | incomeFund + devFee reinvest | dev gets devFee equity, inv fills rest |

- **Invariants checked in every journey:**
  - `gpEquity + lpEquity = totalEquity` (identity)
  - `gpEquity = Σ dev.perInvestorEquity`
  - `lpEquity = Σ inv.perInvestorEquity`
  - `Σ investorOutcomes.totalCalled ≥ totalEquity` (called includes fees)
  - `Σ investorOutcomes.totalDist ≈ gpTotalDist + lpTotalDist`

## Browser verification — blocked by sandbox

Attempted 4 approaches (direct cwd, symlink in /tmp, full copy to /tmp, npx vite with
explicit root) — all fail with `getcwd: Operation not permitted` due to Arabic
characters in the parent directory path combined with Claude Code's sandbox
restrictions. The node subprocess for Vite cannot establish a working directory
outside the originally-invoked Arabic path.

**Compensation:** Deep engine tests (user_journeys.cjs + all 52 legacy tests) exercise
the full pipeline (financing → waterfall → checks) on 8 realistic user scenarios.
Every invariant holds.

**To manually verify in the browser**, run from a terminal outside the Arabic
path (e.g., `cp -R` the project to `~/zan && cd ~/zan && npm run dev`) and walk
through:

1. **Dashboard → Create Project** — confirm investors[] pre-seeded.
2. **Fund mode with lease + landCap** — confirm Investors tab shows dev + inv rows.
3. **Edit investor contribution** — watch Summary totals update live.
4. **Switch finMode debt→fund** — without editing, confirm auto re-seed.
5. **Over-contribute** — confirm amber warning.
6. **Remove all landCap investors while landCapitalize=true** — confirm warning.

## Summary

- **Bugs fixed:** 8/8
- **Tests:** 53/53 files pass (including 54 new assertions across 8 journeys)
- **Build:** clean
- **Backward compat:** projects with no investors[] still compute correctly via legacy path
- **Migration idempotent:** safe to call multiple times, preserves user edits
