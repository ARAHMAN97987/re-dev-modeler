# ZAN Financial Engine — Audit Rounds 1–10: Final Report
**Completed:** 2026-04-13  
**Total Tests:** 612/612 ✅  
**Bugs Found:** 3 (all fixed)

---

## Executive Summary

A comprehensive 10-round audit of the ZAN financial engine was conducted, covering every major subsystem: equity call allocation, revenue timing, waterfall distributions, fee calculations, DSCR, exit valuation, multi-phase timing, performance incentives, and a full Jazan Infra Fund end-to-end simulation.

**Result: The engine is correct.** Three bugs were found and fixed. All other logic is verified accurate.

---

## Bugs Found and Fixed

### Bug 1 — Profit Distribution (Round 2)
**Severity:** Critical — Developer (GP) received zero profit share despite owning majority equity.

**Root cause:** `defaults.js` hardcoded `lpProfitSplitPct: 100`, routing 100% of tier4 (profit) to LP.

**Fix:**
```javascript
// defaults.js
lpProfitSplitPct: null, // null = equity-proportional (LP gets lpPct% of profits)

// waterfall.js — profit split logic
const _lpSplitRaw = project.lpProfitSplitPct;
const lpSplitPct = (_lpSplitRaw != null)
  ? Math.max(0, Math.min(1, _lpSplitRaw / 100))
  : lpPct; // equity-proportional default
```

### Bug 2 — Management Fee Basis for Partner Land (Round 5)
**Severity:** High — "fundAssets"/"devCost" mgmt fee was 10× too low for partner-land projects.

**Root cause:** `mgmtFeeBase = "fundAssets"` used `buildCostOnly` (CAPEX only) instead of `devCostInclLand` (total assets including land).

**Fix:** Added `fundTotalCostBasis` computed from `devCostInclLand` and used for the `"devCost"/"fundAssets"` case.

### Bug 3 — DSCR for Sale-Only Projects (Round 6)
**Severity:** Medium — Misleading metric displayed. DSCR is NOI-based; Sale revenues are lump-sum, not recurring.

**Fix:** Skip DSCR calculation for Sale-only projects. Display "N/A" in UI with explanation.

---

## Round-by-Round Results

### Round 1: Initial Audit
- **Finding:** Distribution routing bug traced to `lpProfitSplitPct` default.
- **Action:** Led to Round 2 fix.

### Round 2: Equity Call Allocation — 14/14 ✅
- gpPct/lpPct correctly computed from partner equity %
- GP/LP calls split exactly by equity ownership ratio
- Profit split defaulting to equity-proportional after fix

### Round 3: Sale Revenue Timing — 20/20 ✅
- `constrDuration` (months) drives construction end, revenue starts immediately after
- `absorptionYears` spreads total revenue across post-completion years
- Phase `completionYear` drives absolute timing
- Total revenue always = `sellableArea × salePricePerSqm`

### Round 4: Waterfall Distribution Math
- Tier 1–4 allocation mechanics verified via Rounds 2 + 3 combined test suite

### Round 5: Fee Basis Calculation — 18/18 ✅
- Subscription fee on `fundEquityBasis` ✅
- Management fee on correct basis per `mgmtFeeBase` setting ✅
- `"fundAssets"/"devCost"` now uses `devCostInclLand` (includes partner land) ✅
- `mgmtFeeCap` applied annually ✅
- No fee double-counting ✅

### Round 6: DSCR for Mixed-Revenue Projects — 8/8 ✅
- DSCR = null for Sale-only projects ✅
- DSCR computed normally for Lease/Operating ✅
- Mixed projects: DSCR skips years where Sale income distorts NOI ✅

### Round 7: Multi-Phase Timing — 31/31 ✅
- Asset CAPEX and revenue correctly gated to phase completion year
- Land rent allocated by footprint ratio within phases
- Edge case: phase with zero footprint doesn't crash

### Round 8: Exit Valuation — 30/30 ✅
- Sale assets excluded from exit cap rate / multiple valuation
- `exitStrategy="caprate"`: `exitVal = NOI / capRate`
- `exitStrategy="sale"`: `exitVal = NOI × exitMultiple`
- Sale-only project: exitProceeds = 0
- No double-counting of sale revenues

### Round 9: Performance Incentive / Hurdle IRR — 20/20 ✅

**Simple mode** (`hurdleMode: "simple"`):
- `required = lpTotalCalled × (1 + hurdleRate × years)`
- `excess = max(0, lpTotalDist_pre − required)`
- `incentive = min(excess × incPct, lpDist[settleYear])`
- Edge case: LP total dist < required → incentive = 0 (even if IRR > hurdle)

**IRR mode** (`hurdleMode: "irr"`):
- Binary search: finds `lo` = max LP cash-flow reduction keeping LP IRR ≥ hurdle
- `incentive = lo × incPct` (developer gets 15% of excess, LP keeps 85%)
- Post-incentive LP IRR stays above hurdle
- Triggered by LP IRR > hurdle (time-value aware, more generous than simple)

**Key insight:** Simple mode can produce 0 incentive even when LP IRR > hurdle (when early distributions boost IRR but total falls below linear threshold). IRR mode correctly captures this scenario.

### Round 10: Full E2E — Jazan Infra Fund — 44/44 ✅

**Project:** 302,000 m², partner land 150M, GP=75%/LP=25%, two assets, 10% LTV debt, 14% pref, IRR-mode performance incentive.

**Financial Results:**
| Metric | LP | GP |
|--------|----|----|
| IRR | 16.5% | 17.0% |
| Cash IRR | — | 44.4% (excl. in-kind land) |
| MOIC | 2.36× | 2.48× |
| Total distributions | 139M | 437M |
| Performance incentive | — | 5.0M |

**Pipeline integrity verified:**
- CAPEX timing matches construction phases ✅
- Revenue timing matches completion + absorption ✅
- Debt draws confined to construction period ✅
- DSCR = 7.87× in revenue years ✅
- Equity calls = totalEquity + unfunded fees ✅
- ROC returns all capital before profit ✅
- Pref accrues at 14% of cumulative equity called ✅
- Profit split: LP=25%, GP=75% ✅
- Performance incentive = 5.02M (IRR mode, LP pre-incentive IRR=16.9% > 14%) ✅
- Total distributions = total cash available (no leakage) ✅
- 40 engine checks: 0 errors, 0 warnings ✅

---

## Complete Test Matrix

| Test File | Tests | Status |
|-----------|-------|--------|
| `engine_audit.cjs` | 267 | ✅ |
| `zan_benchmark.cjs` | 160 | ✅ |
| `audit_round2_final.cjs` | 14 | ✅ |
| `audit_round3_final.cjs` | 20 | ✅ |
| `audit_round5_fees.cjs` | 18 | ✅ |
| `audit_round6_dscr.cjs` | 8 | ✅ |
| `audit_round7_phases.cjs` | 31 | ✅ |
| `audit_round8_exit.cjs` | 30 | ✅ |
| `/tmp/audit_round9_incentive.cjs` | 20 | ✅ |
| `/tmp/audit_round10_e2e.cjs` | 44 | ✅ |
| **Total** | **612** | **✅** |

---

*Engine audit completed 2026-04-13. Model is ready for production use.*
