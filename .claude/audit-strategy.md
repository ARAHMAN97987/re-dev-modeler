# ZAN Platform — UI/Display Audit Strategy

## Problem Statement
The engine may be mathematically correct, but the USER sees:
- Wrong numbers in the wrong place
- Missing information that should be visible
- Confusing presentation that implies errors
- Mode-specific data leaking into wrong modes

## Audit Methodology
For EACH section below:
1. Run the app with a realistic project
2. Switch to each finMode and visually verify EVERY number displayed
3. Cross-check displayed values against engine output
4. Flag any: wrong value, missing value, misleading label, wrong location

---

## SECTION 1: FinancingView (Settings Panel)
**What user expects**: Configure financing correctly for their chosen mode.
**Audit checklist**:
- [ ] self: Only exit strategy visible. No debt, no fund, no equity sections.
- [ ] bank100: Debt terms visible. LTV hidden (100%). No fund fees. No equity split.
- [ ] debt: Debt terms + exit. LTV visible. No fund fees. Equity = developer only.
- [ ] fund: Fund structure + fees + equity + exit. Debt terms IF debtAllowed. No gov section.
- [ ] hybrid: Government financing section visible. Fund structure + fees. No standard debt section.
- [ ] Per-phase override: When phase has different finMode, settings apply to that phase only.

## SECTION 2: ResultsView Routing
**What user expects**: See results relevant to their financing mode.
**Audit checklist**:
- [ ] self → SelfResultsView (no debt metrics, no fund metrics)
- [ ] bank100 → BankResultsView (developer/owner perspective, NO fund fees)
- [ ] debt → BankResultsView (debt + equity, NO fund fees)
- [ ] fund → WaterfallView (full fund metrics, LP/GP, fees)
- [ ] hybrid → WaterfallView (fund + government debt info)
- [ ] Mixed phases → Both views with correct separation

## SECTION 3: BankResultsView (debt/bank100)
**What user expects**: "As the developer/owner, is this project viable?"
**Audit checklist**:
- [ ] KPI cards show correct values (Bank, Developer, Project)
- [ ] DSCR calculation matches NOI / DS
- [ ] Debt balance never negative
- [ ] Exit proceeds calculated correctly
- [ ] Levered IRR matches CF
- [ ] Cash flow table rows add up correctly
- [ ] Cumulative row is running total
- [ ] No fund fees appear anywhere
- [ ] Developer feasibility timeline shows correct milestones
- [ ] J-curve chart matches cumulative CF data

## SECTION 4: WaterfallView (fund/hybrid)
**What user expects**: Fund performance, LP/GP returns, fee impact.
**Audit checklist**:
- [ ] Equity calls shown correctly (GP + LP)
- [ ] Fund fees breakdown matches settings
- [ ] Tier 1-4 distributions are correct
- [ ] LP IRR, GP IRR, MOIC displayed
- [ ] Cash available = NOI + land rent addback - DS - fees + unfunded + exit
- [ ] Distributions never exceed cash available
- [ ] Hybrid: government debt info shown
- [ ] Hybrid: dual CF (financing + fund) displayed correctly
- [ ] No bank-specific metrics leak into fund view

## SECTION 5: SelfResultsView
**What user expects**: Simple project economics without financing complexity.
**Audit checklist**:
- [ ] Shows unlevered IRR, NPV
- [ ] No debt rows
- [ ] No fund/waterfall sections
- [ ] Cash flow = income - capex - land rent
- [ ] Exit proceeds if applicable

## SECTION 6: Excel Export
**What user expects**: Downloaded file matches what they see on screen.
**Audit checklist**:
- [ ] Mode label correct for each finMode
- [ ] Financing parameters section present for non-self
- [ ] Government section for hybrid
- [ ] Cash flow rows match UI
- [ ] No fund fees in bank/debt export
- [ ] Hybrid dual CF in export

## SECTION 7: Multi-Phase Display
**What user expects**: Per-phase results when filtered, consolidated when not.
**Audit checklist**:
- [ ] Phase selector works
- [ ] Single phase shows only that phase's data
- [ ] Filtered metrics recalculate correctly
- [ ] Mixed finMode phases show correct view per phase
- [ ] No cross-contamination of phase-specific fees/metrics

## SECTION 8: Checks/Warnings
**What user expects**: Relevant warnings for their configuration.
**Audit checklist**:
- [ ] No irrelevant warnings for current mode
- [ ] Critical issues flagged prominently
- [ ] Warning text is accurate and helpful

---

## Execution Order
1. Section 2 (routing) — most critical, wrong view = everything wrong
2. Section 3 (BankResultsView) — user's main complaint area
3. Section 4 (WaterfallView) — fund mode accuracy
4. Section 1 (FinancingView) — settings correctness
5. Section 5 (SelfResultsView) — simplest, quick check
6. Section 7 (Multi-phase) — complex interactions
7. Section 6 (Excel) — export parity
8. Section 8 (Checks) — validation layer
