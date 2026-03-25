# Haseef Financial Modeler — Full Platform Audit Plan

**Date**: 2026-03-26
**Baseline**: 634/634 tests passing (50+205+109+58+52+160)

## Categories

### A — Financial Engine Accuracy
- [ ] CAPEX calculation (cost/sqm × GFA × softCost × contingency, monthly proration)
- [ ] Revenue per asset type (lease ramp/escalation, hotel EBITDA, marina EBITDA, sale absorption)
- [ ] Land rent schedule (grace, escalation step, allocation by footprint)
- [ ] Unlevered CF aggregation (income - capex - landRent)
- [ ] IRR (Newton-Raphson + bisection fallback, edge cases)
- [ ] NPV at 10%, 12%, 14%
- [ ] Payback period

### B — Financing Engine
- [ ] Debt drawdown (LTV cap, construction timing, fund timing gate)
- [ ] Interest calculation ((open+close)/2 × rate + draw × upfrontFee)
- [ ] Grace period (cod vs firstDraw)
- [ ] Amortizing vs bullet repayment
- [ ] Equity structure (GP/LP split, land capitalization, manual overrides)
- [ ] DSCR calculation
- [ ] Levered CF
- [ ] Islamic finance toggle (terminology only, same math)

### C — Waterfall Engine
- [ ] 4-tier distribution (ROC, Pref, Catch-up, Profit Split)
- [ ] Fee calculations (subscription, structuring, management, dev, operator, custody)
- [ ] Cash available formula
- [ ] LP/GP IRR and MOIC
- [ ] Grace period options
- [ ] Catch-up methods (perYear vs cumulative)
- [ ] Pref allocation (proRata vs lpOnly)
- [ ] Fee treatment (capital vs rocOnly vs expense)

### D — Government Incentives
- [ ] CAPEX grant (% capped, construction-weighted vs lump-sum)
- [ ] Land rent rebate (construction + operation phases)
- [ ] Fee rebates (immediate + deferral NPV)
- [ ] Interest subsidy
- [ ] Soft loan
- [ ] Adjusted CF and IRR

### E — Scenario Engine
- [ ] 8-scenario comparison
- [ ] Scenario multipliers (CAPEX ±10%, rent ±10%, delay, escalation)
- [ ] Correct recalculation per scenario

### F — Data Integrity & Edge Cases
- [ ] Division by zero guards
- [ ] NaN/Infinity display guards
- [ ] Zero assets / single asset
- [ ] Self-funded mode (no waterfall)
- [ ] Bank100 mode (no equity)
- [ ] Very large numbers formatting
- [ ] IRR with no sign change → null

### G — Excel Export
- [ ] Template export (6 sheets, formula preservation)
- [ ] Formula export (10 sheets, Excel formulas)
- [ ] Professional export (10 sheets, hardcoded values)
- [ ] Number formatting (SAR=#,##0, %=0.00%, negatives in red)
- [ ] Blue input cells
- [ ] Platform vs Excel number match

### H — UI/UX Consistency
- [ ] All tabs reachable and rendering correct content
- [ ] RTL mode (layout flips, numbers LTR)
- [ ] Bilingual labels (every visible text has EN and AR)
- [ ] Sidebar expand/collapse
- [ ] Quick Setup Wizard (4 steps)
- [ ] 30-state undo (Ctrl+Z)
- [ ] Language toggle
- [ ] Empty state handling
- [ ] Mobile responsiveness

### I — Code Quality
- [ ] No console.log in production (except debug flags)
- [ ] No unused imports
- [ ] No inline component definitions causing focus loss
- [ ] State update batching
- [ ] Event listener cleanup

### J — Auth & Data
- [ ] Supabase auth flow
- [ ] Session persistence
- [ ] Per-user data isolation
- [ ] Error handling on auth failures

### K — Tests
- [ ] regression.cjs: 50/50
- [ ] full_suite.cjs: 205/205
- [ ] input_impact.cjs: 109/109
- [ ] fin_audit_p1.cjs: 58/58
- [ ] fin_audit_p2.cjs: 52/52
- [ ] zan_benchmark.cjs: 160/160
- [ ] Total: 634/634

### Cross-Category Verification
- [ ] Financing mode switching (self → debt → fund)
- [ ] Language switch (AR ↔ EN) on every tab
- [ ] Full lifecycle test
