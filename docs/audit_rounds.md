# Audit Rounds 2–4: Distribution Bug Investigation
**Date:** 2026-04-13  
**Issue:** "توزيع التوزيعات مابتروح للمستثمر والمطور كمستثمر كل واحد حسب استثماره، بتروح كلها للمستثمر وبترجع للمطور كمستثمر رأس ماله فقط"

Translation: Distributions go all to LP investor; developer-as-investor only gets ROC (capital return), no profit share proportional to their investment.

---

## Round 2: Equity Call Allocation

### Findings
- **gpPct/lpPct calculation**: ✅ CORRECT. With `landType=partner` + `partnerEquityPct=75`, financing engine correctly sets `gpPct=75%`, `lpPct=25%`.
- **gpCalls/lpCalls split**: ✅ CORRECT. All equity calls split exactly by `gpPct/lpPct` ratio (e.g., 75/25 for partner land scenario).
- **GP equity includes land**: ✅ CORRECT. When `landType=partner` + `partnerEquityPct=75`, `gpFromLandCap = totalEquity × 75%`, so GP equity = 75% of total (the land contribution as in-kind equity).

### THE BUG (confirmed)
**Root cause**: `defaults.js` set `lpProfitSplitPct: 100` (comment: "HIDDEN: all profits to investor first"). In the waterfall engine, this sent **100% of tier4 (profit) distributions to LP**, regardless of GP equity ownership.

With `gpPct=75%`, `lpPct=25%`, `lpProfitSplitPct=100`:
- Developer (75% equity): gets ROC (75% of tier1) + zero profits ❌
- Investor (25% equity): gets ROC (25% of tier1) + **100%** of profits ❌

This is structurally wrong for a partnership where the developer contributed 75% of equity.

### Fix Applied
1. **`src/engine/waterfall.js`** — Changed `lpSplitPct` computation:
   ```javascript
   // BEFORE (always 100% from defaults):
   const lpSplitPct = Math.max(0, Math.min(1, (project.lpProfitSplitPct ?? 70) / 100));
   
   // AFTER (null = equity-proportional default):
   const _lpSplitRaw = project.lpProfitSplitPct;
   const lpSplitPct = (_lpSplitRaw != null)
     ? Math.max(0, Math.min(1, _lpSplitRaw / 100))
     : lpPct; // equity-proportional: LP profit share = LP equity share
   ```

2. **`src/data/defaults.js`** — Changed default from `100` to `null`:
   ```javascript
   // BEFORE: lpProfitSplitPct: 100, // HIDDEN: all profits to investor first
   lpProfitSplitPct: null, // null = auto (equity-proportional: LP gets lpPct% of profits)
   ```

3. **`src/components/views/WaterfallView.jsx`** — Updated tier4 split labels to show actual equity-proportional percentages when `lpProfitSplitPct` is null.

### Backward Compatibility
- **Old projects with explicit `lpProfitSplitPct: 100`**: Unchanged — they still send 100% profits to LP (intentional for promote structures).
- **New projects (null default)**: Profit split = equity ownership split (75/25 in this example).
- **Existing fund projects (e.g., ZAN benchmark with `lpProfitSplitPct: 70`)**: Unchanged — explicit values are always used as-is.

### Test Results: 14/14 passed
- gpPct=69.6%, lpPct=30.4% verified ✅  
- GP calls=69.6%, LP calls=30.4% verified ✅
- null split → LP gets 30.4% of tier4, GP gets 69.6% ✅
- Explicit 70% split → LP gets 70%, GP gets 30% ✅
- Explicit 100% split → LP gets 100% (backward compat) ✅
- Developer with 75% equity + null split → gets 75% of profits ✅

---

## Round 3: Sale Revenue Timing

### Findings
**No bug found.** Revenue timing is correct.

Formula: `durYears = Math.ceil(constrDuration / 12)`, `revStart = cStart + durYears`

Key field: `asset.constrDuration` (months), NOT `asset.constrDurationYears`.

| Config | cStart | durYears | revStart | Absorption years |
|--------|--------|----------|----------|-----------------|
| `constrStart:1`, `constrDuration:24` | 1 | 2 | 3 | 3, 4 |
| `constrStart:1`, `constrDuration:12` | 1 | 1 | 2 | 2, 3 |
| `phase.completionYear:2028` | auto | auto | 2 | 2, 3 |

- `absorptionYears=2` vs `=3`: spreads same total revenue over 2 or 3 years ✅
- `constrStart=0` vs `1`: shifts everything by 1 year ✅
- Total sale revenue always = `sellableArea × salePricePerSqm` ✅

### Test Results: 20/20 passed

---

## Round 4: Waterfall Distribution Math Summary

### Two-mechanism waterfall
1. **Tier 1 (ROC) + Tier 2 (Pref)**: split by `gpPct/lpPct` (equity ownership)
2. **Tier 4 (Profit)**: split by `lpSplitPct/gpSplitPct`
   - BEFORE fix: always `lpProfitSplitPct=100` → LP gets all profits
   - AFTER fix: null default → `lpSplitPct = lpPct` → equity-proportional

### UI Labels
- WaterfallView now shows actual effective split percentage for tier4, dynamically computed when `lpProfitSplitPct` is null.

---

## All Tests After Fix
- `engine_audit.cjs`: **267/267 ✅**
- `zan_benchmark.cjs`: **160/160 ✅**
- `audit_round2_final.cjs`: **14/14 ✅**
- `audit_round3_final.cjs`: **20/20 ✅**

---

## Round 5: Fee Basis Calculation Audit
**Date:** 2026-04-13

### Findings

| Fee Type | Base Used | Correct for Partner Land? |
|----------|-----------|--------------------------|
| Subscription fee | `fundEquityBasis` = totalEquity (incl. land) | ✅ |
| Management fee — "equity" | `fundEquityBasis` = totalEquity | ✅ |
| Management fee — "fundAssets"/"devCost" | **BUG: was `buildCostOnly` (CAPEX only)** | ❌ Fixed |
| Management fee — "nav" | starts at `fundEquityBasis` = totalEquity | ✅ |
| Management fee — "deployed" | cumulative CAPEX | ✅ (intentional) |
| Structuring fee | `fundFeeBasis` = buildCostOnly (CAPEX) | ✅ (construction cost basis) |
| Operator fee | `effectiveDevCost` = buildCostOnly (full project) | ✅ |
| `mgmtFeeCap` | applied per year as annual cap | ✅ |
| Double-counting | `fees[y] = sum(all schedules)` | ✅ None found |

### Bug Fixed: "fundAssets"/"devCost" basis for partner land

**Root cause**: Comments said `"fundAssets"` = `devCostInclLand` (total project cost including land equity contribution). Code used `buildCostOnly` (CAPEX only).

For a 200M partner land + 65M CAPEX fund:
- **Before**: `"fundAssets"` basis = 65M → mgmt fee 10× too low
- **After**: `"fundAssets"` basis = 265M → correct per fund docs

**Code change** (`src/engine/waterfall.js`):
```javascript
// Added fundTotalCostBasis (devCostInclLand, includes land equity)
const fundTotalCostBasis = isHybridMode ? (f.fundPortionCost || f.devCostInclLand) : (f.devCostInclLand || effectiveDevCost);

// Changed "devCost"/"fundAssets" case:
// BEFORE: mgmtBase = fundFeeBasis;  // was buildCostOnly
// AFTER:  mgmtBase = fundTotalCostBasis;  // devCostInclLand
```

### Partner Land Recommendation
- Use `"equity"` or `"fundAssets"` for AUM-based management fee (both = totalEquity/devCostInclLand = 265M)
- Use `"deployed"` for deployed-capital basis (cumulative CAPEX, max 65M)
- Use `"nav"` for NAV-linked fee (starts at totalEquity, adjusts with income)

### Test Results: 18/18 ✅
- `tests/audit_round5_fees.cjs`

---

## Round 6: DSCR Calculation with Sale Assets
**Date:** 2026-04-13

### Findings

**DSCR = NOI / Debt Service** is designed for income-producing (Lease/Rent) assets. For Sale assets, revenue is a one-time lump sum at sale date, not recurring NOI.

| Project Type | Before Fix | After Fix |
|-------------|------------|-----------|
| Lease-only | DSCR = 2–3x (meaningful) ✅ | Unchanged ✅ |
| Sale-only | DSCR = 13.9x in sale year (misleading ❌) | DSCR = null for all years ✅ |
| Mixed (Sale + Lease) | DSCR spikes in sale year | DSCR computed (UI note added) |
| No debt | DSCR = null everywhere ✅ | Unchanged ✅ |

### Fix Applied

**`src/engine/financing.js`**:
```javascript
// Detect Sale-only projects
const hasSaleOnlyAssets = (project.assets || []).length > 0 &&
  (project.assets || []).every(a => a.revType === "Sale");

// Skip DSCR calculation for Sale-only (lump-sum ≠ NOI)
if (!hasSaleOnlyAssets) {
  // ... compute dscr normally
}
```
Also exports `hasSaleOnlyAssets` in the return object.

**`src/components/views/WaterfallView.jsx`**:
- DSCR row shows `N/A` for Sale-only projects (with tooltip)
- Warning row added: "DSCR not applicable for Sale-only projects — revenue is a lump-sum at sale, not recurring operating income"

### Test Results: 8/8 ✅
- `tests/audit_round6_dscr.cjs`

---

## All Tests After Rounds 5–6
- `engine_audit.cjs`: **267/267 ✅**
- `zan_benchmark.cjs`: **160/160 ✅**
- `audit_round5_fees.cjs`: **18/18 ✅**
- `audit_round6_dscr.cjs`: **8/8 ✅**

---

## Round 7: Multi-Phase Timing and Land Rent Allocation
**Date:** 2026-04-13

### Findings

All phase timing and land rent allocation logic is working correctly. No bugs found.

| Scenario | Result |
|----------|--------|
| Phase completionYear drives asset revStart | ✅ |
| Phase CAPEX ends before revenue start | ✅ |
| Land rent allocation by footprint ratio | ✅ |
| Phase 2 with zero footprint (no crash) | ✅ |
| All assets in one phase → 100% land rent | ✅ |
| Legacy `constrStart` mode (no completionYear) | ✅ |
| `landRentMeta` records correct footprint shares | ✅ |

### Key Behaviors Verified

**Asset timing (completionYear mode):**
- Phase `completionYear=2028` (startYear=2026) → index 2
- Asset `revStart = phaseOpenIdx + delayYears`
- Asset `cStart = max(0, revStart - durYears)`
- CAPEX fills `[cStart, revStart)`, revenue starts at `revStart`

**Land rent footprint allocation:**
- `phaseFP[pn] = Σ asset.footprint` per phase
- `share = phaseFP[pn] / totalFootprint`
- Verified: 3000/(3000+5000) = 37.5%, 5000/(3000+5000) = 62.5%
- Fallback when zero footprint: other phases receive equal split

**Edge case: Phase with zero footprint**
- Phase 2 with no assets → totalCapex=0, but no crash
- Phase 1 receives 100% of land rent (correct footprint math: 4000/4000)

### Test Results: 31/31 ✅
- `tests/audit_round7_phases.cjs`

---

## Round 8: Exit Valuation for Mixed RevType Projects
**Date:** 2026-04-13

### Findings

Exit valuation correctly excludes Sale assets from capitalization. No bugs found.

| Scenario | Result |
|----------|--------|
| Sale asset excluded from `exitStrategy="sale"` | ✅ |
| Sale asset excluded from `exitStrategy="caprate"` | ✅ |
| Sale-only project → exit proceeds = 0 | ✅ |
| Lease-only → exit = income × multiple | ✅ |
| `exitStrategy="hold"` → no exit proceeds | ✅ |
| No double-counting of Sale revenue | ✅ |
| Cap rate vs multiple give different values | ✅ |
| Full `runFullModel` integration | ✅ |

### Key Behaviors Verified

**Exit valuation logic (financing.js):**
```javascript
for (const as of assetScheds) {
  if (as.revType === "Sale") {
    // Skip — already realized through sales cash flows
  } else if (exitStrategy === "caprate") {
    exitVal += assetIncome / (exitCapRate / 100);
  } else {
    // "sale" multiple
    exitVal += assetIncome * exitMultiple;
  }
}
```

**Mixed project (Sale + Lease + Operating) at exit year 10:**
- Sale absorption complete by year 10 (3-year absorption after year 3 completion)
- Exit proceeds = (leaseIncome + opIncome) × 10 = 77,540,000
- Cap rate exit = (leaseIncome + opIncome) / 9% = 86,155,556
- Sale revenue (40M) already in years 3–5 cash flows — not double-counted

**Sale-only project:**
- All income is lump-sum at sale dates, not recurring NOI
- Exit proceeds = 0 (correct — no income-producing assets to capitalize)

### Test Results: 30/30 ✅
- `tests/audit_round8_exit.cjs`

---

## All Tests After Rounds 7–8
- `engine_audit.cjs`: **267/267 ✅**
- `zan_benchmark.cjs`: **160/160 ✅**
- `audit_round5_fees.cjs`: **18/18 ✅**
- `audit_round6_dscr.cjs`: **8/8 ✅**
- `audit_round7_phases.cjs`: **31/31 ✅**
- `audit_round8_exit.cjs`: **30/30 ✅**

---

## Round 9: Performance Incentive / Hurdle IRR Accuracy
**Date:** 2026-04-13

### Findings

No bugs found. Performance incentive engine is correct. Two modes verified.

**Key configuration:** `prefReturnPct=14, performanceIncentive=true, hurdleIRR=14, incentivePct=15`

| Test Scenario | Result |
|---------------|--------|
| Simple mode: incentive = 15% of LP excess above linear hurdle | ✅ |
| Simple mode: `required = lpCalled × (1 + rate × years)` | ✅ |
| Simple mode: `excess = max(0, lpDist_pre − required)` | ✅ |
| Simple mode: `amount = incPct × excess` | ✅ |
| IRR mode: binary search finds max clawback → LP IRR ≥ hurdle | ✅ |
| IRR mode: incentive = 15% of excess (not full clawback) | ✅ |
| IRR mode: LP IRR after incentive stays ≥ hurdle | ✅ |
| Clawback cannot exceed LP's last distribution | ✅ |
| Edge case: LP distributions < hurdle → incentive = 0 | ✅ |
| `performanceIncentive=false` → amount = 0 | ✅ |
| Conservation: LP loses exactly what GP gains | ✅ |

### IRR Mode vs Simple Mode

**Simple mode** (market convention):
- `required = lpTotalCalled × (1 + hurdleRate × years)`
- `excess = max(0, totalLPDist_pre − required)`
- Triggered when *total LP distributions* exceed the linear hurdle amount.
- Can produce 0 incentive even when LP IRR > hurdle (if distributions are front-loaded).

**IRR mode** (compound/advanced):
- Binary search finds `lo` = max clawback that keeps LP IRR ≥ hurdleRate.
- `incentive = lo × incPct` (developer keeps 15% of IRR-excess value).
- Triggered when LP IRR > hurdle (time-value aware).
- Post-incentive LP IRR stays above hurdle (only 15% of excess is clawed back, not 100%).

### Test Results: 20/20 ✅
- `/tmp/audit_round9_incentive.cjs`

---

## Round 10: Full End-to-End Synthetic Project (Jazan Infra Fund)
**Date:** 2026-04-13

### Project Configuration

Modelled after the Jazan infrastructure fund:

| Parameter | Value |
|-----------|-------|
| Site area | 302,000 m² |
| Partner land (GP in-kind) | 150M SAR |
| partnerEquityPct | 75% (GP=75%, LP=25%) |
| Asset 1 | Infrastructure (Lease): 10,000 m², 5,000 SAR/m² → 50M CAPEX |
| Asset 2 | Plot Sales: 50,000 m², 6,000 SAR/m² → 300M revenue |
| Fund mode | `fund`, exitYear=12, 10% LTV debt |
| Pref return | 14% |
| Performance incentive | 14% hurdle (IRR mode), 15% of excess |
| Fees | 2% sub, 1% mgmt/yr, 1% struct, 5% dev fee |

### All Pipeline Stages Verified

**Stage 1: Cash Flow Engine**
- totalCapex = 75M (infra 50M + plots 25M) ✅
- totalIncome = 567M (300M sales + 267M lease) ✅
- Infra: zero revenue during 3-year construction, then ramp ✅
- Plots: zero revenue until Sales Phase completes (completionYear=2030) ✅

**Stage 2: Financing Engine**
- Debt = 7.5M (10% × 75M buildCostOnly) ✅
- effectiveLandCap = 150M (landValuation) ✅
- devCostInclLand = 225M (75M CAPEX + 150M land) ✅
- totalEquity = 217.5M (225M − 7.5M debt) ✅
- GP = 75%, LP = 25% ✅
- Debt draws in construction only, no post-completion draws ✅
- DSCR = 7.87× in revenue years (well covered) ✅

**Stage 3: Waterfall Engine**
- GP calls = 176M, LP calls = 59M (total = 235M = equity + 17.5M unfunded fees) ✅
- Tier 1 (ROC) = 235M (all capital returned) ✅
- Pref accrual = 14% × equityCalls (correct — fees in capital base) ✅
- Tier 4 profit split: LP=25% as configured ✅
- Performance incentive = 5.02M (IRR mode triggered: LP IRR=16.54% > 14%) ✅

**Stage 4: Financial Ratios**
| Metric | LP | GP |
|--------|----|----|
| IRR | 16.54% | 17.03% |
| MOIC | 2.36× | 2.48× |
| Cash IRR | — | 44.37% (cash-on-cash excl. in-kind land) |
| Total dist | 139M | 437M |

**Stage 5: Developer Economics (Two Hats)**
- Hat 1 (Investor): 432M distributions from GP equity position
- Hat 2 (Developer): 3.75M dev fees + 5.02M performance incentive = 8.77M
- Total developer economics: 440M ✅

**Stage 6: Conservation Laws**
- Total LP + GP distributions = total cash available (no leakage) ✅
- GP + LP equity calls = total waterfall equity calls ✅

**Stage 7: Engine Checks**
- 40 checks run: 0 errors, 0 warnings ✅

### Key Findings

1. **Equity calls include unfunded fees**: `totalCalls = totalEquity + unfundedFees` (17.5M fees funded from equity). This is correct and expected — fees drawn from equity, not from project CF.

2. **Pref base includes fees** (feeTreatment="capital"): Max annual pref accrual = 14% × (totalEquity + unfundedFees), slightly larger than 14% × totalEquity.

3. **Simple vs IRR incentive mode matters**: Simple mode would produce 0 incentive for this project (LP total dist=144M < required 166M). IRR mode correctly triggers incentive since LP IRR=16.54% > 14% hurdle.

4. **GP CashIRR = 44%** vs GP IRR = 17%: The large gap confirms that the land in-kind contribution (150M) massively suppresses total-return IRR. CashIRR (excl. in-kind) is the more meaningful metric for the developer's actual cash return.

### Test Results: 44/44 ✅
- `/tmp/audit_round10_e2e.cjs`

---

## Final Audit Summary (Rounds 1–10)
**Date:** 2026-04-13

### Bugs Found and Fixed

| Round | Issue | Status |
|-------|-------|--------|
| 2 | `lpProfitSplitPct: 100` default → LP gets all profits, developer gets no profit share | ✅ Fixed |
| 5 | `"fundAssets"/"devCost"` mgmt fee base used `buildCostOnly` instead of `devCostInclLand` | ✅ Fixed |
| 6 | DSCR shown for Sale-only projects (lump-sum ≠ NOI, misleading metric) | ✅ Fixed |

### No Bugs Found (Engine Correct)

| Round | Area Tested | Verdict |
|-------|-------------|---------|
| 1 | Initial audit (distribution routing) | ✅ Correct |
| 3 | Sale revenue timing with `constrDuration` | ✅ Correct |
| 4 | Waterfall distribution math | ✅ Correct |
| 7 | Multi-phase timing and land rent allocation | ✅ Correct |
| 8 | Exit valuation (Sale excluded, cap rate vs multiple) | ✅ Correct |
| 9 | Performance incentive (simple & IRR modes) | ✅ Correct |
| 10 | Full E2E Jazan fund pipeline | ✅ Correct |

### Final Test Count

| Test Suite | Results |
|------------|---------|
| `engine_audit.cjs` | 267/267 ✅ |
| `zan_benchmark.cjs` | 160/160 ✅ |
| `audit_round2_final.cjs` | 14/14 ✅ |
| `audit_round3_final.cjs` | 20/20 ✅ |
| `audit_round5_fees.cjs` | 18/18 ✅ |
| `audit_round6_dscr.cjs` | 8/8 ✅ |
| `audit_round7_phases.cjs` | 31/31 ✅ |
| `audit_round8_exit.cjs` | 30/30 ✅ |
| `audit_round9_incentive.cjs` | 20/20 ✅ |
| `audit_round10_e2e.cjs` | 44/44 ✅ |
| **Total** | **612/612 ✅** |
