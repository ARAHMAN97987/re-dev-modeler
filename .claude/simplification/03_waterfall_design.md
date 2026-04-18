# 03 — 3-Stage Waterfall Design

## Philosophy

> Every investor puts money in → gets their money back → shares in the profit pro-rata.
> Developers (by role, not by equity class) also earn a performance incentive if the project exceeds the hurdle rate.

No GP/LP. No Catchup. No Carry. No Pref tier. No Promote.

## Stage-by-stage math

### Inputs per year

- `cashAvail[y]` — cash available for distribution after debt service, fund manager fees, land rent (exactly as today)
- `investors[]` — from `project.investors`, each with `equityAmount` (see below)
- `hurdleIRR` (default 15%), `incentivePct` (default 20%)

### Equity amount per investor

- `type: "cash"` → `amount`
- `type: "devFee"` → `devFeeTotal × investPct / 100`
- `type: "landValue"` → `valuation` (partner land / BOT partner-owned)
- `type: "landCap"` → `valuation` (leasehold cap)
- `type: "landPurchase"` → `amount`

Sum them → `totalEquity`.
Each investor's `equityPct = equityAmount / totalEquity`.

### Stage 1 — Return of Capital (per year, cumulative)

For each year `y` with `cashAvail[y] > 0`:
```
remaining = cashAvail[y]
// Pro-rata ROC across investors with unreturned capital
for each investor i:
    unreturned_i = equityAmount_i - cumulativeReturned_i
    if unreturned_i <= 0: continue
    tier1_share = min(unreturned_i, remaining × (unreturned_i / sum_unreturned))
    distributions_i[y] += tier1_share
    cumulativeReturned_i += tier1_share
    remaining -= tier1_share
```

Continue until all capital returned OR cashAvail depleted.

### Stage 2 — Performance Incentive

**When does it trigger?**
- `project.performanceIncentive === true`
- After all capital is returned (stage 1 complete)
- Project total distributions at exit ≥ required amount for `hurdleIRR`

**Required amount (simple mode, market convention):**
```
required = totalEquityCalled × (1 + hurdleIRR × investYears)
```

**Required amount (compound/IRR mode):**
```
required = totalEquityCalled × (1 + hurdleIRR)^investYears
```

**Excess & incentive amount:**
```
totalDistributed = sum across all years of all stage1 + stage3 payouts
excess = max(0, totalDistributed - required)
incentive = excess × incentivePct / 100
```

**Settlement:** In the **last positive-distribution year**, clawback `incentive` from non-developer investors pro-rata by their equity share, and add to developer investors pro-rata by their equity share.

**Multiple developers** split the incentive by their equity share among themselves:
```
devIncentive_i = incentive × (dev_i.equityAmount / sum(developers.equityAmount))
```

**Zero developers:** incentive is not applied (warn emitted).

### Stage 3 — Remaining profit pro-rata

For each year with remaining cashAvail after Stage 1:
```
for each investor i:
    share = remaining × equityPct_i
    distributions_i[y] += share
```

## Worked example

### Setup
- 3 investors:
  - Developer: dev fee reinvest, devFeeTotal = 5M → equityAmount = 5M
  - Investor A: cash 50M
  - Landholder: landCap 40M
- `totalEquity = 95M`; equity shares: dev=5.26%, InvA=52.63%, Land=42.11%
- Assume project generates `cashAvail` totaling 200M by horizon (200M distributable to equity after all costs).
- `hurdleIRR = 15%`, `investYears = 6`, `incentivePct = 20%`, simple hurdle mode.

### Stage 1 — ROC
Each investor gets their capital back pro-rata across years. Assume by year 5 all 95M returned:
- Developer: 5M
- InvA: 50M
- Land: 40M
- Total returned: 95M

**Cumulative distributions so far:** 95M.
**Remaining distributable:** 200M − 95M = 105M.

### Stage 2 — Incentive check
```
required = 95M × (1 + 0.15 × 6) = 95M × 1.9 = 180.5M
actualTotal = 200M
excess = 200M − 180.5M = 19.5M
incentive = 19.5M × 0.20 = 3.9M
```

**Settlement (last year):**
- Clawback 3.9M from non-developers pro-rata to their equity within non-dev group:
  - InvA share of non-dev: 50M / 90M = 55.56%
  - Land share of non-dev: 40M / 90M = 44.44%
  - InvA gives up: 3.9M × 55.56% = 2.167M
  - Land gives up: 3.9M × 44.44% = 1.733M
- Developer receives: 3.9M (only one developer)

### Stage 3 — Pro-rata profit
Distribute 105M (remaining after ROC) pro-rata by equity share across years, then apply Stage 2 settlement.

Final per-investor totals (before incentive settlement):
- Developer: ROC 5M + (105M × 5.26%) = 5M + 5.523M = **10.523M**
- InvA: ROC 50M + (105M × 52.63%) = 50M + 55.262M = **105.262M**
- Land: ROC 40M + (105M × 42.11%) = 40M + 44.215M = **84.215M**

After Stage 2 settlement:
- Developer: 10.523M + 3.9M = **14.423M**
- InvA: 105.262M − 2.167M = **103.095M**
- Land: 84.215M − 1.733M = **82.482M**

Check: 14.423 + 103.095 + 82.482 = 200M ✅

### IRRs / MOICs per investor
- Developer: called 5M → distributed 14.423M → MOIC = 2.88x
- InvA: called 50M → distributed 103.095M → MOIC = 2.06x
- Land: called 40M → distributed 82.482M → MOIC = 2.06x

All investors earn >15% IRR. Developer outperforms by the incentive uplift.

## Edge cases

### 0 investors
Engine returns `null` from waterfall. `checks.js` emits error "No investors defined". UI blocks model run.

### 1 investor (solo developer)
No 3-stage. All cash goes to the single investor. `projIRR` = investor IRR. No incentive (no non-developer to clawback from). This replaces the old `self` mode.

### All-developer investors (2+ devs, no external)
Incentive split pro-rata among developers based on equity. Since clawback source is non-developers, and there are none, incentive = 0.

### Loss scenario (projectTotal < totalEquity)
Only partial Stage 1. No Stage 2 (no excess). No Stage 3. All investors take a loss pro-rata.

### Income Fund mode
Skip 3-stage entirely. Distribute cashAvail[y] pro-rata by equityPct every year from fund start to exit. No incentive in incomeFund (hurdle doesn't fit annual-yield structure).

## Numerical guards

- `incentivePct` capped at [0, 50]
- `hurdleIRR` must be > 0
- Clawback never exceeds last-year distribution to non-developers (prevent negative balances)
- IRR Newton-Raphson handles single-investor case (no weird cash flow shapes)

## Aggregate tiers (for UI charts)

Per year aggregate:
- `tier1[y]` = total ROC across investors that year
- `tier2[y]` = incentive transferred that year (only non-zero in settlement year)
- `tier3[y]` = total profit share that year

So existing chart UIs that read `tier1[y] + tier2[y] + tier3[y] = cashAvail[y]` still work conceptually; the labels change from (ROC, Pref, Profit Split) to (ROC, Incentive, Profit).
