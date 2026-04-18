# Post-Campaign Audit Fixes — 2026-04-18

After the user requested a line-by-line mathematical/financial/logical audit
and flagged that the **Investors tab order is wrong** ("لازم تدخل مبكرا لانه
حتعتبر كاصول ان شي يدخل يعني في راس المال"), the following 4 real issues
were found and fixed.

## Issues found

### 1. Tab ordering — logical inversion (UX + data-flow)

**Before:** `assets → financing → investors → results`
**After:** `assets → investors → financing → results`

**Reason:** Investor contributions (landCap, landValue, devFee reinvest)
are **inputs** to capital structure, not outputs. `totalEquity` is the
residual `totalProjectCost − maxDebt`, but the **composition** of that
equity comes from investors first. User must define investors before the
financing view can meaningfully display gp/lp splits.

**Fix:** `src/App.jsx` tab array — `investors` now precedes `financing`.

### 2. CRITICAL — financing.js ignored `investors[]` for gpEquity/lpEquity

**Before:** `financing.js:289-357` computed `gpEquity`/`lpEquity` from
legacy fields (`gpEquityManual`, `landCapTo`, `gpInvestDevFee`,
`gpCashInvest`) and *ignored* `project.investors[]`. The
`perInvestorEquity[]` array was computed (line 796) but isolated —
never used to reconcile `gpEquity`/`lpEquity`.

**Consequence:** If a user added or edited investors in `InvestorsView`,
the engine still ran off legacy fields. The investor UI was purely
cosmetic — wouldn't change IRR, MOIC, or distributions.

**Fix:** New "INVESTORS-DERIVED OVERRIDE" block in `financing.js` after
line 357. When `project.investors[]` carries non-zero contributions:

- Sum static amounts by role → `devStatic` + `invStatic`.
- `remainder = totalEquity − (devStatic + invStatic)`.
- Remainder distribution follows `hasLP`:
  - `hasLP=true` (fund/incomeFund/hybrid) → all remainder to investors.
  - `hasLP=false` (debt/self) → all remainder to developer.
- Scale down if static contributions exceed totalEquity.
- Legacy projects with placeholder-only investors (amounts=0) preserve
  legacy-field-driven splits → backward compat intact.

### 3. landCap double-counting risk

**Before:** `migrateProjectToInvestors()` creates a landCap investor with
`valuation = landArea × landCapRate`. `financing.js:118` also computes
`landCapValue` from the same fields. If a user edits an investor's
landCap valuation while keeping `project.landCapitalize=true`, the two
sources could diverge, and `effectiveLandCap` would use the legacy value
— ignoring the user's edit.

**Fix:** `financing.js:115-130` now prefers investor-derived landCap over
legacy-field landCap when the investors[] array has explicit `landCap`
or `landValue` contributions:

```js
const landCapValue = investorLandCap > 0 ? investorLandCap : legacyLandCap;
const partnerLandValue = investorLandValue > 0 ? investorLandValue : legacyPartnerLand;
```

This prevents divergence and makes investors[] the source of truth for
land-based equity.

### 4. CRITICAL — Multi-phase triple-counting

**Symptom discovered during T2 parity test:** aggregated `totalEquity` =
300M vs legacy 121M — 2.5× inflation. Per-phase `landCap = 100M` in each
of 3 phases (should be ~33M each).

**Root cause:** `computeIndependentPhaseResults` in `phases.js` calls
`migrateProjectToInvestors(project)` at line 399, populating
`project.investors[]` with full-project landCap valuation (100M).
`buildPhaseVirtualProject` then spreads `...project` into each phase's
virtual project — inheriting the full 100M landCap. Migration inside
`computeFinancing(vProject)` sees pre-populated investors[] and skips
re-migration, so per-phase landArea scoping is bypassed.

**Fix:** `phases.js:buildPhaseVirtualProject` now strips inherited
`investors[]`:

```js
delete vProject.investors; // force per-phase re-migration from scoped landArea
```

Each phase's virtual project re-migrates using its own `landArea *
allocPct`, producing phase-scoped landCap valuations.

## Verification

- **Tests:** 52/52 files pass (PASS=52 FAIL=0). Same as pre-audit.
- **Build:** `vite build` clean, 1198 modules.
- **Browser preview:** blocked by cwd-inheritance issue in Arabic-path
  parent directory; preview server won't bind to the project folder.
  Engine-level fixes validated through the full test suite (which
  exercises finMode=fund with landCap, multi-phase, and per-role
  metrics). UI tab reorder is a trivial array swap — no runtime risk.

## Remaining out-of-scope notes

- `aggregatePhaseWaterfalls` still does not propagate synthetic
  `investorOutcomes[]` in multi-phase mode. The aggregate waterfall uses
  legacy gp/lp sums for display; per-investor table in Results view
  therefore shows empty rows on multi-phase projects. Recommended
  follow-up: synthesize `investorOutcomes[]` by aggregating per-phase
  `r.calls/distributions` by investor id.
