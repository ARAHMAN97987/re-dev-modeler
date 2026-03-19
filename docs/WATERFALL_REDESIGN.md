# Waterfall Page Redesign - User Story

## Date: March 19, 2026
## Status: Phase 1 (Table) - In Progress | Phase 2 (KPI Boxes) - Planned

---

## Problem

The current waterfall page has ~10 collapsible sections with scattered information:
- Hero cards, exit cards, donut charts, area charts, fee columns, GP/LP returns
- Same numbers appear in 3-4 different places
- Hard to scan and compare across years
- Doesn't match the ZAN Fund Model Excel structure that users are familiar with

## Solution

### Phase 1: Single Unified Table (NOW)

Replace all sections below Quick Edit with ONE large table matching ZAN Fund Model Excel structure (Fund_ZAN1 sheet).

**Layout:**
```
[Phase Tabs: Consolidated | ZAN1 | ZAN2 | ZAN3]
[Quick Edit - Fund Terms] (collapsible)
[KPI Strip: GP metrics | LP metrics | Fund metrics]  ← compact, 1 row
[📈 Toggle Chart] ← optional area chart
[Years selector: 10 | 15 | 20 | 30]
┌────────────────────────────────────────────────────────┐
│ § 7. PROJECT CF (green header)                         │
│   Rental Income           │ Total │ Yr1 │ Yr2 │ ...   │
│   Land Rent               │       │     │     │       │
│   Development CAPEX       │       │     │     │       │
│   Net Project CF          │       │     │     │ BOLD  │
├────────────────────────────────────────────────────────┤
│ § 8. FUND CF (blue header)                             │
│   Equity Calls            │       │     │     │       │
│   Debt Drawdown           │       │     │     │       │
│   Debt Balance (Open)     │       │     │     │       │
│   Debt Repayment          │       │     │     │       │
│   Debt Balance (Close)    │       │     │     │       │
│   Interest/Profit         │       │     │     │       │
│   Debt Service            │       │     │     │ BOLD  │
│   DSCR                    │       │     │     │       │
│   --- Fees ---            │       │     │     │       │
│   Subscription Fee        │       │     │     │       │
│   Management Fee          │       │     │     │       │
│   Custody Fee             │       │     │     │       │
│   Developer Fee           │       │     │     │       │
│   Structuring Fee         │       │     │     │       │
│   Pre-Establishment       │       │     │     │       │
│   SPV Setup               │       │     │     │       │
│   Auditor Fee             │       │     │     │       │
│   Total Fees              │       │     │     │ BOLD  │
│   Unfunded Fees           │       │     │     │       │
│   Exit Proceeds           │       │     │     │       │
├────────────────────────────────────────────────────────┤
│ § 9. DISTRIBUTIONS & WATERFALL (purple header)         │
│   Cash Available          │       │     │     │ BOLD  │
│   Unreturned Capital (O)  │       │     │     │ sub   │
│   T1: Return of Capital   │       │     │     │       │
│   Unreturned Capital (C)  │       │     │     │ sub   │
│   Pref Accrual            │       │     │     │ sub   │
│   Unpaid Pref (Opening)   │       │     │     │ sub   │
│   Total Pref Owed         │       │     │     │ sub   │
│   T2: Preferred Return    │       │     │     │       │
│   Unpaid Pref (Closing)   │       │     │     │ sub   │
│   Remaining After ROC+Pf  │       │     │     │ BOLD  │
│   T3: GP Catch-up         │       │     │     │       │
│   T4: Profit Split        │       │     │     │       │
│     → LP (70%)            │       │     │     │ sub   │
│     → GP (30%)            │       │     │     │ sub   │
│   LP Total Distributions  │       │     │     │ BOLD  │
│   GP Total Distributions  │       │     │     │ BOLD  │
├────────────────────────────────────────────────────────┤
│ § 10. INVESTOR RETURNS (gold header)                   │
│   LP Net Cash Flow        │       │     │     │ BOLD  │
│   LP Cumulative CF        │       │     │     │ sub   │
│   LP Cash Yield %         │       │     │     │ sub   │
│   GP Net Cash Flow        │       │     │     │ BOLD  │
│   GP Cumulative CF        │       │     │     │ sub   │
│   GP Cash Yield %         │       │     │     │ sub   │
└────────────────────────────────────────────────────────┘
```

**Table features:**
- Sticky first column (labels) + sticky Total column
- Section headers with color coding (green/blue/purple/gold)
- Sub-rows (indented, smaller font) for tracking items like Unreturned Capital
- Bold rows for totals and key metrics
- Color-coded values: green positive, red negative, gray zero
- Year columns scrollable horizontally

**KPI Strip (compact, above table):**
3 groups in 1 row:

| GP (Developer) | LP (Investor) | Fund |
|---|---|---|
| Net Cash: 895.8M | IRR: 12.62% | Total Fees: 228M |
| Multiple: 2.97x | MOIC: 4.64x | Exit: 2.56B |
| IRR: 21.1% | Payback: Yr 9 | Equity: 1.15B |
| Payback: Yr 5 | Cash Yield: X% | Debt: 1.03B |

**What gets removed:**
- Hero cards (LP/GP side-by-side)
- Exit Summary card
- Attribution Donut charts
- Area Chart (becomes optional toggle)
- Fees 3-column section
- GP/LP Returns 2-column section
- Old Annual Distributions table
- Phase Comparison table (data visible when switching phase tabs)

---

### Phase 2: Expandable KPI Boxes (LATER)

Replace the compact KPI strip with 3 expandable cards:

**🔵 Developer (GP) Card** - collapsed shows: Net Cash, Multiple, IRR
When expanded shows full breakdown:
- AS INVESTOR: Capital Return (T1×GP%), Pref Return (T2×GP%)
- AS DEVELOPER: Catch-up, Profit Split, Dev Fee, Mgmt Fee, Struct Fee, Land Rent
- NET SUMMARY: GP Equity, Waterfall Dist, Fees Received, Net Cash, Net Profit
- METRICS: Multiple, IRR, Payback, NPV

**🟣 Investor (LP) Card** - collapsed shows: IRR, MOIC, Payback
When expanded shows:
- DISTRIBUTION SOURCES: Capital Return (T1×LP%), Pref Return (T2×LP%), Profit Split (T4)
- NET SUMMARY: LP Equity, Total Distributions, Net Cash
- METRICS: IRR, MOIC, DPI, Payback, Cash Yield
- NPV: @10%, @12%, @14%

**🟡 Fund Manager Card** - collapsed shows: Total Fees
When expanded shows:
- ALL FEES: Management, Subscription, Structuring, Custody, Pre-Establishment, SPV, Auditor
- CAPITAL STRUCTURE: Total Equity, LP/GP split, Debt
- EXIT: Year, Multiple, Proceeds, Cost %
- Fee Treatment setting

Each card is independently collapsible. User opens what they care about.

---

## Acceptance Criteria

### Phase 1
- [ ] Single table matches ZAN Fund Model Excel structure
- [ ] All data from removed sections present in table or KPI strip
- [ ] Phase switching updates both KPI and table
- [ ] Table scrolls horizontally with sticky label column
- [ ] Section headers color-coded
- [ ] Years selector works (10/15/20/30)
- [ ] No duplicate information between KPI strip and table
- [ ] Quick Edit still functional

### Phase 2
- [ ] 3 expandable cards replace KPI strip
- [ ] Each card independently collapsible
- [ ] Expanded state shows complete breakdown
- [ ] Collapsed state shows 2-3 key metrics
- [ ] GP card shows both "investor hat" and "developer hat" economics
- [ ] LP card shows distribution sources + all return metrics
- [ ] Fund Manager card shows all fees with frequency labels
