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
