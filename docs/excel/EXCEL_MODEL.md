# ZAN Excel Model - Development & Maintenance Guide

> **File:** `ZAN_Full_Model_v11_AUDITED.xlsx`
> **Version:** v11 | **Sheets:** 15 | **Formulas:** 26,208 | **Inputs:** 524 | **Outputs:** 56

---

## 1. What This File Is

A standalone Excel financial model that mirrors the ZAN platform calculation engine. The platform uses this file as a **template** for Excel export:

```
Platform (user enters data) → fills Excel inputs → formulas calculate → user downloads complete model
```

The file has **zero hardcoded numbers** in calculation areas. Everything flows from inputs through formulas to outputs.

---

## 2. Sheet Structure

| # | Sheet | Type | Purpose |
|---|-------|------|---------|
| 1 | Inputs | INPUT | All assumptions: project info, rent, land, CAPEX %, phases, debt, exit, fund settings |
| 2 | Program | INPUT | Asset table: 30 rows × 20+ cols (phase, category, name, areas, revenue, cost, duration) |
| 3 | CAPEX | CALC | Year-by-year cost schedule per asset (reads Program + Inputs) |
| 4 | Revenue | CALC | Year-by-year income per asset (reads Program + Inputs + Operating_PL) |
| 5 | CashFlow | CALC | Per-phase + consolidated unlevered CF, IRR, NPV |
| 6 | Operating_PL | INPUT | Hotel P&L (keys, ADR, occ, revenue mix, OPEX ratios) + Marina P&L |
| 7 | Fund_Summary | CALC | Dashboard: all phases side-by-side (equity, debt, fees, IRR, MOIC) |
| 8-13 | Fund_ZAN 1-6 | CALC+INPUT | Per-phase fund: capital structure, debt, fees, waterfall, returns |
| 14 | Bank | CALC+INPUT | Aggregated debt service, DSCR, sources & uses |
| 15 | 9_Checks | CALC | 24 automated integrity checks |

**Type Legend:**
- INPUT = has blue cells the platform fills
- CALC = 100% formulas (or mostly formulas with a few config inputs)

---

## 3. Input Cell Map

All input cells have: **blue font (#0000FF) + light blue background (#EBF5FB) + blue border (#4472C4)**

### 3.1 Inputs Sheet (134 cells)

| Row | Cell | Label | Type | Default |
|-----|------|-------|------|---------|
| 5 | C5 | Project Name | text | ZAN Waterfront |
| 6 | C6 | Location | text | Jazan |
| 7 | C7 | Model Start Year | number | 2026 |
| 8 | C8 | Projection Horizon | number | 50 |
| 9 | C9 | Currency | text | SAR |
| 12 | C12 | Rent Escalation % | percent | 0.75% |
| 13 | C13 | Flexible Block Efficiency | percent | 85% |
| 14 | C14 | Flexible Block Rate SAR/m² | currency | 700 |
| 15 | C15 | Flexible Block Cost/m² | currency | 3,500 |
| 18 | C18 | Annual Land Rent | currency | 6,000,000 |
| 19 | C19 | Land Rent Escalation Every N Years | number | 5 |
| 20 | C20 | Land Rent Escalation % | percent | 5% |
| 21 | C21 | Land Rent Grace Period | number | 5 |
| 22 | C22 | Land Rent Term | number | 50 |
| 25 | C25 | Soft Cost % | percent | 10% |
| 26 | C26 | Contingency % | percent | 5% |
| 29 | C29 | Active Scenario | dropdown | Base Case |
| 45-59 | C45:C59 | Phase Start Year Offsets (ZAN 1-15) | number | 2,3,4,5,7,7... |
| 63 | C63 | Total Land Area m² | currency | 302,473 |
| 85 | C85 | Max Debt % of Dev Cost | percent | 70% |
| 88 | C88 | Land Type | dropdown | Lease |
| 93 | C93 | Land Purchase Price | currency | 0 |
| 94 | C94 | Partner Land Equity % | percent | 0 |
| 95 | C95 | BOT Operation Period | number | 0 |
| 101 | C101 | Financing Mode | dropdown | Fund |
| 107 | C107 | Exit Type | dropdown | Sale |
| 113 | C113 | Exit Year (consolidated) | number | 2032 |
| 114 | C114 | Exit Multiple | number | 10 |
| 115 | C115 | Exit Cost % | percent | 2% |
| 118 | C118 | Fund Settings Mode | dropdown | Unified |

### 3.2 Per-Phase Fund Grid (Inputs rows 126-140, cols C-H)

Each column = one phase (C=ZAN1, D=ZAN2, E=ZAN3, F=ZAN4, G=ZAN5, H=ZAN6)

| Row | Parameter | Type | Default |
|-----|-----------|------|---------|
| 126 | Financing Rate % | percent | 6.50% |
| 127 | Loan Tenor (years) | number | 7 |
| 128 | Grace Period (years) | number | 3 |
| 129 | Upfront Fee % | percent | 0.50% |
| 130 | Subscription Fee % | percent | 2.00% |
| 131 | Management Fee % | percent | 0.90% |
| 132 | Custody Fee (SAR) | currency | 130,000 |
| 133 | Developer Fee % | percent | 12.00% |
| 134 | Structuring Fee % | percent | 1.00% |
| 135 | Preferred Return % | percent | 15.00% |
| 136 | GP Catch-up (Y/N) | dropdown | Y |
| 137 | Carry % | percent | 30.00% |
| 138 | Exit Year | number | 2033/2034/2035/... |
| 139 | Exit Multiple | number | 10 |
| 140 | Exit Cost % | percent | 2.00% |

### 3.3 Program Sheet (319 cells)

Each asset = 1 row (rows 4-33). Platform fills these columns per asset:

| Column | Field | Type | Platform Source |
|--------|-------|------|----------------|
| A | Phase (ZAN 1, ZAN 2...) | text | asset.phase |
| B | Category | text | asset.category |
| C | Asset Name | text | asset.name |
| D | Code | text | asset.code |
| E | Notes | text | asset.notes |
| F | Plot Area m² | number | asset.plotArea |
| G | Building Footprint m² | number | asset.footprint |
| H | GFA m² | number | asset.gfa |
| I | Revenue Type (Lease/Operating) | text | asset.revenueType |
| J | Efficiency % | percent | asset.efficiency |
| L | Lease Rate SAR/m² | number | asset.leaseRate |
| O | Ramp-up Years | number | asset.rampUpYears |
| P | Occupancy % | percent | asset.occupancy |
| Q | Cost/m² (SAR) | number | asset.costPerSqm |
| R | Floors (for Parking) | number | asset.floors |
| S | Duration (months) | number | asset.constructionMonths |

### 3.4 Operating_PL Sheet (40 cells)

| Cell Range | Content | Platform Source |
|------------|---------|----------------|
| C7:D7 | Links to Program Row | hotel/resort row numbers |
| C8:D8 | Keys (rooms) | hotel.keys |
| C9:D9 | ADR SAR/night | hotel.adr |
| C10:D10 | Stabilized Occupancy | hotel.occupancy |
| C15:D18 | Revenue Mix (Rooms/F&B/MICE/Other) | hotel.revenueMix |
| C28:D33 | OPEX Ratios | hotel.opexRatios |
| C50:C72 | Marina params | marina.* |

### 3.5 Fund Sheet Inputs (4 per sheet × 6 sheets)

| Cell | Field | Platform Source |
|------|-------|----------------|
| C4 | Fund Name | project.fundName |
| C6 | Vehicle Type | "Fund" |
| C7 | Strategy | "Develop & Hold" |
| C22 | Debt Allowed Y/N | project.debtAllowed |

### 3.6 Bank Sheet Inputs (4 cells)

| Cell | Field | Default |
|------|-------|---------|
| C4 | Bank Name | [Bank Name] |
| C5 | Scope | All |
| C6 | DSCR Analysis Period | 10 |
| C22 | Repayment Type | Equal Installment |

---

## 4. Output Cell Map

### 4.1 Project Level (CashFlow sheet)

| Cell | Output | Format |
|------|--------|--------|
| C110 | Total Income | SAR |
| C111 | Total Land Rent | SAR |
| C112 | Total CAPEX | SAR |
| C113 | Net CF Consolidated | SAR |
| C115 | Consolidated IRR | % |
| C119 | NPV @ 10% | SAR |
| C120 | NPV @ 12% | SAR |
| C121 | NPV @ 14% | SAR |
| C123 | Payback Period | years |

### 4.2 Per-Phase (Fund_ZAN N, where N = 1-6)

| Cell | Output | Format |
|------|--------|--------|
| C12 | GP Equity | SAR |
| C13 | LP Equity | SAR |
| C14 | Total Equity | SAR |
| C15 | GP % | % |
| C16 | LP % | % |
| C17 | Dev Cost excl Land | SAR |
| C18 | Dev Cost incl Land | SAR |
| C19 | Max Debt | SAR |
| D51 | Exit Proceeds | SAR |
| D57 | Total Debt Drawn | SAR |
| D61 | Total Interest | SAR |
| D69 | Total Fees | SAR |
| D93 | LP Distributions | SAR |
| D94 | GP Distributions | SAR |
| D95 | Total Distributions | SAR |
| C107 | Project IRR (fund window) | % |
| E101 | LP IRR | % |
| E104 | GP IRR | % |
| C110 | LP MOIC | x |
| C111 | GP MOIC | x |

### 4.3 Bank Sheet

| Cell | Output | Format |
|------|--------|--------|
| C11 | Total Dev Cost | SAR |
| C12 | Total Equity | SAR |
| C13 | Total Debt | SAR |
| C14 | Equity % | % |
| C15 | Debt % | % |
| C42 | Min DSCR | x |
| C43 | Avg DSCR | x |

### 4.4 Yearly Arrays (columns E:BB = years 0-49)

In each Fund_ZAN sheet:

| Row | Data |
|-----|------|
| 47 | Income |
| 48 | Land Rent |
| 49 | CAPEX |
| 50 | Net CF |
| 51 | Exit Proceeds |
| 56 | Equity Calls |
| 57 | Debt Drawdown |
| 60 | Debt Balance (Close) |
| 62 | Total Debt Service |
| 69 | Total Fees |
| 75 | Cash Available |
| 78 | Tier 1: ROC |
| 84 | Tier 2: Pref Paid |
| 88 | Tier 3: GP Catch-up |
| 89 | Tier 4: Profit Split |
| 93 | LP Distributions |
| 94 | GP Distributions |
| 99 | LP Net CF |
| 103 | GP Net CF |

In Bank sheet:
| Row | Data |
|-----|------|
| 26 | Total Income |
| 27 | Total Land Rent |
| 28 | Total CAPEX |
| 29 | Net CF |
| 33 | Debt Drawdown |
| 34 | Debt Repayment |
| 35 | Interest |
| 36 | Total Debt Service |
| 38 | Debt Balance |
| 40 | NOI |
| 41 | DSCR |

---

## 5. Formula Chain (Data Flow)

```
Inputs + Program + Operating_PL
    ↓
CAPEX (cost schedule per asset per year)
    ↓
Revenue (income per asset per year)
    ↓
CashFlow (per-phase: Income + Land Rent + CAPEX = Net CF)
    ↓
Fund_ZAN 1-6 (each reads its phase from CashFlow)
  → Capital Structure (DevCost, Equity, Debt)
  → Debt Engine (drawdown, repayment, interest)
  → Fee Engine (subscription, management, custody, developer, structuring)
  → Waterfall (ROC → Pref → Catch-up → Profit Split)
  → Returns (LP/GP IRR, MOIC)
    ↓
Fund_Summary (aggregates all Fund sheets)
    ↓
Bank (aggregates debt service from all Fund sheets, computes DSCR)
    ↓
9_Checks (validates everything)
```

**Critical:** No circular references. Data flows one direction only.

---

## 6. How to Add a New Input

Example: adding "Construction Inflation %" to the model.

### Step 1: Add to Inputs sheet
- Pick an empty row (or add after row 140)
- Cell B: label ("Construction Inflation %")
- Cell C: default value (e.g., 0.03)
- Style C with blue font + #EBF5FB bg + #4472C4 border
- Add Arabic label in Cell D

### Step 2: Use it in formulas
- In CAPEX sheet, modify the cost formulas to multiply by (1 + Inputs!C_NEW)^year
- All downstream sheets auto-update because they reference CAPEX

### Step 3: Update this doc
- Add to Section 3.1 input table
- Note which formulas changed

### Step 4: Update excelExport.js
- Add mapping: `project.constructionInflation → Inputs!C_NEW`

### Step 5: Test
- Run recalc.py → 0 errors
- Check 9_Checks → MODEL CLEAN
- Run sensitivity test: change new input, verify outputs change logically

---

## 7. How to Add a New Output

Example: adding "DPI (Distributions to Paid-In)" to Fund sheets.

### Step 1: Add formula row in Fund_ZAN 1
- Pick row after existing KPIs (e.g., row 112)
- Formula: `=IFERROR(D95/D56, "-")`
- Label: "DPI (Dist/Paid-In)"

### Step 2: Replicate to Fund_ZAN 2-6
- Same row, same formula

### Step 3: Update this doc
- Add to Section 4.2 output table

### Step 4: Update excelExport.js
- Add read mapping: `results.phases[N].dpi ← Fund_ZAN N!C112`

---

## 8. How to Add a New Phase

The model supports up to 15 phases (ZAN 1-15). Currently 6 Fund sheets exist.

### To add Fund_ZAN 7-15:
1. Copy Fund_ZAN 6 sheet
2. Update CashFlow references (row numbers: income, land rent, CAPEX)
3. Update Inputs references (per-phase grid column)
4. Add to Fund_Summary aggregation formulas
5. Add to Bank aggregation formulas
6. Add to 9_Checks

### CashFlow per-phase row mapping:
| Phase | Income Row | Land Rent Row | CAPEX Row | Net CF Row | IRR Row |
|-------|-----------|---------------|-----------|------------|---------|
| ZAN 1 | 5 | 6 | 7 | 8 | 9 |
| ZAN 2 | 12 | 13 | 14 | 15 | 16 |
| ZAN 3 | 19 | 20 | 21 | 22 | 23 |
| ZAN N | 5+(N-1)*7 | 6+(N-1)*7 | 7+(N-1)*7 | 8+(N-1)*7 | 9+(N-1)*7 |

### Inputs per-phase grid column mapping:
| Phase | Column | Letter |
|-------|--------|--------|
| ZAN 1 | 3 | C |
| ZAN 2 | 4 | D |
| ZAN 3 | 5 | E |
| ZAN N | 2+N | ... |

---

## 9. Acceptance Criteria (Must Pass After Every Change)

| # | Criteria | How to Check |
|---|----------|-------------|
| C1 | Numbers match platform | Compare key outputs with platform using same inputs |
| C2 | All formulas (no hardcoded in calc areas) | Visual check: Ctrl+` in calc rows |
| C3 | Simple formulas (≤3 nested IFs) | Automated scan |
| C4 | Input cells: blue font + #EBF5FB bg + blue border | Automated scan |
| C5 | Zero formula errors | `python scripts/recalc.py file.xlsx` → 0 errors |
| C6 | Cross-sheet consistency | 9_Checks section D → all PASS |
| C7 | Import sections at bottom (collapsible) | Visual check in Fund sheets |
| C8 | Number format: SAR=#,##0, %=0.00%, neg=red parens | Spot check |
| C9 | Dropdowns on text inputs | Check data validations |
| C10 | Sheet protection (formulas locked, inputs editable) | Try editing a formula cell |

---

## 10. Testing Checklist (Run After Every Change)

```bash
# 1. Recalculate and check errors
python scripts/recalc.py ZAN_Full_Model_v11_AUDITED.xlsx

# 2. Open in Excel/LibreOffice and verify:
#    - 9_Checks sheet → "✓ MODEL CLEAN"
#    - Change one input → outputs change → revert
#    - No #REF! or #VALUE! anywhere

# 3. Sensitivity tests (change each, verify, revert):
#    - Financing Rate 6.5% → 10%: interest increases, IRR decreases
#    - Max Debt 70% → 50%: equity increases, debt decreases
#    - Exit Year +5 years: exit proceeds increase
#    - Debt Allowed Y → N: debt = 0, equity = 100%
#    - Developer Fee 12% → 0%: fees drop, IRR improves

# 4. Edge cases:
#    - Empty phase (ZAN 4): all zeros, no errors
#    - Carry = 0%: GP gets no carry
#    - Grace = 0: repayment starts immediately
```

---

## 11. Version History

| Version | Date | Changes |
|---------|------|---------|
| v10 | Mar 2026 | Initial: Inputs, Program, CAPEX, Revenue, CashFlow, Operating_PL, Fund (single) |
| v11 | Mar 2026 | Fund → per-phase (Fund_ZAN 1-6), Fund_Summary, Bank, 9_Checks, per-phase Inputs grid, Debt Allowed=N fix |
