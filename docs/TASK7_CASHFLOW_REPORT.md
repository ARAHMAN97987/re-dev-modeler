# Task 7: Cash Flow View Completeness Report
Date: 2026-04-05

## Rows Before
1. Revenue (t.income = engine `income` = EBITDA for operating assets)
2. (-) Land Rent
3. = NOI (Net Operating Income)
4. NOI Margin %
5. (-) Development CAPEX
6. = Net Cash Flow
7. ↳ Cumulative

## Rows Added
| Row | Source | Available from Engine? | Computed? |
|-----|--------|-----------------------|-----------|
| Gross Revenue | `income / ebitdaMargin` | NO | YES — income ÷ EBITDA margin from calcHotelEBITDA/calcMarinaEBITDA |
| OPEX | `grossRev - gop` | NO | YES — variable + overhead = grossRev × (1 - gopMargin) |
| GOP | `grossRev × gopMargin` | NO | YES — (ebitda + fixed) / totalRev from P&L calculator |
| FF&E Reserves | `grossRev × 4%` (hotel) / `2%` (marina) | NO | YES — industry standard rate |

## Row Order (Final)
For projects with hotel/marina assets (hasOpexData = true):
1. Gross Revenue [new, sub-row, green]
2. (-) Operating Expenses / OPEX [new, sub-row, red, negated]
3. = Gross Operating Profit (GOP) [new, bold]
4. EBITDA (relabeled from "Revenue") [existing, green]
5. (-) FF&E Reserves 4% [new, sub-row, amber, negated]
6. (-) Land Rent [existing, sub-row, red]
7. = NOI [existing, bold]
8. NOI Margin % [existing, italic]
9. (-) Development CAPEX [existing, red]
10. = Net Cash Flow [existing, bold]
11. ↳ Cumulative [existing, amber]

For projects WITHOUT hotel/marina assets (hasOpexData = false):
- Row order unchanged from before

## Data Source Logic
- `calcHotelEBITDA(asset.hotelPL)` → ebitdaMargin = ebitda/totalRev, gopMargin = (ebitda+fixed)/totalRev
- `calcMarinaEBITDA(asset.marinaPL)` → ebitdaMargin = ebitda/totalRev, gopMargin = ebitdaMargin
- For each year: grossRev = income[y] / ebitdaMargin (reuses engine ramp-up timing)
- OPEX = grossRev - gop (variable costs + undistributed overhead)
- Reserves = grossRev × 4% (hotel) or 2% (marina)
- Rows hidden if grossRev total = 0 (pure lease/sale portfolio)

## Visual Verification
- Desktop: Phase and consolidated tables show new rows between SectionRow and existing income row
- Mobile: Table remains horizontally scrollable
- Numbers logical: GOP > EBITDA (GOP includes fixed charges that EBITDA excludes) ✓
- OPEX shown as positive negated numbers ✓
- Reserves shown in amber (distinct from red OPEX) ✓
- Label changes: "Revenue" → "EBITDA" when hasOpexData = true, providing clear hierarchy ✓

## Tests: 427/427 PASSED
- engine_audit.cjs: 267/267 ✓
- zan_benchmark.cjs: 160/160 ✓
- Engine untouched, display-only changes ✓

## Build: SUCCESS
- vite build: ✓ built in 4.20s

## Deploy: https://haseefdev.com
- Deployment: dpl_9DfCPccDC9wkvqRwdX2rKFoBwmuv
- Commit: df5b6e4 on main, pushed to origin
