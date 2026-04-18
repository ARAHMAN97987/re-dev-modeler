# 02 — Data Model Design

## `project.investors[]` schema

```ts
type Investor = {
  id: string;                  // "dev", "inv-cash", "inv-land", "inv-2", ...
  name: string;                // "شركة السليمان", "Developer", "Land Partner", etc.
  role: "developer" | "investor";
  contribution: Contribution;
  // Optional: override auto-computed equity%
  equityOverridePct?: number;
};

type Contribution =
  | { type: "cash"; amount: number }
  | { type: "devFee"; investPct: number }                         // e.g. 100 = reinvest 100%
  | { type: "landValue"; valuation: number; equityPct: number }   // partner land (in-kind)
  | { type: "landCap"; valuation: number; landCapReceiver?: boolean } // leasehold cap to THIS investor
  | { type: "landPurchase"; amount: number };                     // purchased-land contribution
```

### Examples

**Jazan-like fund (land partner + cash investor):**
```json
{ "investors": [
  { "id": "dev", "name": "Developer", "role": "developer",
    "contribution": { "type": "landValue", "valuation": 100000000, "equityPct": 40 } },
  { "id": "inv", "name": "External Investor", "role": "investor",
    "contribution": { "type": "cash", "amount": 150000000 } }
]}
```

**Solo developer (replaces `finMode: self`):**
```json
{ "investors": [
  { "id": "dev", "name": "Developer", "role": "developer",
    "contribution": { "type": "cash", "amount": 50000000 } }
]}
```

**Multi-investor fund (new capability — 3 investors):**
```json
{ "investors": [
  { "id": "dev", "name": "Developer", "role": "developer",
    "contribution": { "type": "devFee", "investPct": 100 } },
  { "id": "inv1", "name": "Sponsor A", "role": "investor",
    "contribution": { "type": "cash", "amount": 50000000 } },
  { "id": "inv2", "name": "Land Partner", "role": "investor",
    "contribution": { "type": "landCap", "valuation": 40000000, "landCapReceiver": true } }
]}
```

## `project.fundManager` schema

```ts
type FundManager = {
  name: string;                  // Always present in fund mode
  annualFeePct: number;          // % per year
  mgmtFeeBase: "nav" | "gav" | "equity" | "deployed";
  mgmtFeeCapAnnual: number;      // 0 = no cap
  subscriptionFeePct: number;    // one-time on equity raise
  structuringFeePct: number;     // one-time
  structuringFeeCap: number;     // 0 = no cap
  custodyFeeAnnual: number;
  auditorFeeAnnual: number;
  spvFee: number;                // one-time
  preEstablishmentFee: number;   // one-time
  miscExpensePct: number;        // one-time, % of fund portion
};
```

**Key decision:** Fund Manager is **always separate** from developer. If developer happens to also manage the fund, it's modeled as: the fund manager is a named entity whose fees happen to flow to the same real-world party. The engine does not model this overlap.

## New `finMode` values (3 only)

| Value | Meaning | Who invests |
|---|---|---|
| `fund` | Investment fund (GP/LP replaced by investors[]) | Multiple investors, must include ≥1 developer |
| `incomeFund` | Income-generating fund (buy-and-hold, no 3-stage waterfall, pro-rata annual yield) | Same structure as fund |
| `debt` | Self + optional bank debt | ≥1 developer, external investors optional |

**No `self`** — a solo developer is represented as `finMode: "debt"` with a single investor of role `developer`. This honors the user's rule: "even if I self-fund, I'm still an investor in myself".

## `project.debt` sub-object

```ts
type Debt = {
  beneficiary: "project" | "developer";  // replaces govBeneficiary hybrid-gp complexity
};
```

All other debt terms stay at project level (financeRate, loanTenor, debtGrace, upfrontFeePct, maxLtvPct, repaymentType, debtTrancheMode, capitalizeIDC, islamicMode, capitalCallOrder, graceBasis).

## Migration mapping (legacy → new)

| Legacy | New |
|---|---|
| `finMode: "self"` | `finMode: "debt"` + 1 investor `{role: "developer", type: "cash"}` |
| `finMode: "bank100"` | `finMode: "debt"` + `maxLtvPct: 100` + 1 dev investor with 0 equity |
| `finMode: "debt"` | unchanged + 1 dev investor |
| `finMode: "fund"` | unchanged + investors[] built from legacy equity fields |
| `finMode: "jv"` | `finMode: "fund"` + investors[] |
| `finMode: "hybrid"` (gov=project) | `finMode: "fund"` + `debt.beneficiary: "project"` + investors[] |
| `finMode: "hybrid"` (gov=gp) | `finMode: "fund"` + `debt.beneficiary: "developer"` + investors[] |
| `finMode: "incomeFund"` | unchanged + investors[] |
| `gpEquityManual > 0` | dev investor with `{type: "cash", amount}` |
| `lpEquityManual > 0` | non-dev investor with `{type: "cash", amount}` |
| `gpInvestDevFee: true` | dev investor contribution: `{type: "devFee", investPct}` |
| `gpCashInvest: true, gpCashInvestAmount` | dev investor additional `{type: "cash", amount}` |
| `landType: "partner"` + `partnerEquityPct` | dev investor `{type: "landValue", valuation, equityPct}` |
| `landCapitalize: true, landCapTo: "gp"` | dev investor `{type: "landCap", valuation, landCapReceiver: true}` |
| `landCapitalize: true, landCapTo: "lp"` | non-dev investor `{type: "landCap", ...landCapReceiver: true}` |
| `landCapitalize: true, landCapTo: "split"` | two investors each with half valuation |
| Top-level `annualMgmtFeePct` etc. | `fundManager.annualFeePct` etc. |
| `govFinancingPct`, `govBeneficiary="gp"` | `debt.beneficiary: "developer"`, gov loan terms merged with main debt terms |
| `gpIsFundManager` | **IGNORED** — fund manager always separate now |

## Engine output shape (new)

### `computeWaterfall()` return:
```js
{
  // Aggregate (for charts)
  totalEquity, cashAvail[], tier1[], tier2[], tier3[],
  totalDistributions, investYears,
  projIRR, hurdleIRR, incentivePct,
  performanceIncentiveAmount, performanceIncentiveTriggered,

  // Per-investor (PRIMARY source of truth)
  investorOutcomes: [{
    id, name, role, contribution,
    equityAmount, equityPct,
    calls[], distributions[], netCF[],
    totalCalled, totalDist, netDist,
    irr, moic, dpi, npv10, npv12, npv14,
    roc, profitShare, incentiveReceived,
  }],

  // Backward-compat DERIVED aliases (keep legacy tests + old UI working):
  gpEquity, lpEquity, gpPct, lpPct,
  gpDist[], lpDist[], gpNetCF[], lpNetCF[],
  gpIRR, lpIRR, gpMOIC, lpMOIC, gpDPI, lpDPI,
  gpNPV10/12/14, lpNPV10/12/14,
  gpTotalCalled, lpTotalCalled, gpTotalDist, lpTotalDist,
  gpCalls[], lpCalls[],
  // All income-fund fields preserved
  isIncomeFund, distributionYield, avgDistYield, payoutRatio,
  navEstimate, cumDistributions, ffoProxy,
}
```

Aliases are derived as:
- `gpEquity = sum(outcomes.filter(role=="developer").equityAmount)`
- `lpEquity = sum(outcomes.filter(role=="investor").equityAmount)`
- `gpDist[y] = sum(outcomes.filter(role=="developer").distributions[y])`
- Similar for each array and aggregate.

### `computeFinancing()` return:
Add: `perInvestorEquity[] = [{ investorId, amount, source }]`.
Keep all existing fields + compat aliases.

## `_structureVersion` migration flag

- `_feesVersion: 2` — existing (keep)
- `_waterfallVersion: 2` — existing (keep during transition)
- `_structureVersion: 3` — **new** — indicates migration to investors[]-based project
