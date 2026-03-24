# ZAN Excel Model - Changelog

All changes to the Excel model template must be logged here.

## Format

```
### [version] - [date]
**Changed:** what changed
**Why:** reason
**Cells affected:** list
**Tests:** PASS/FAIL
```

---

### v11.1 - 2026-03-24
**Changed:**
- Added Inputs row 141: Exit Cap Rate % (per-phase, default 10%)
- Added Fund rows 44-45: Exit Method + Exit Cap Rate (reads from Inputs)
- Exit formula dual-mode: IF(method="Sale") → Income×Multiple, else → Income/CapRate
- Fixed Fund Start Year: template formula was off by 1 year vs platform. Now force-written from phase.financing.fundStartYear
- excelTemplateExport.js: reads per-phase financing config (phase.financing.X ?? project.X) for all 15 fund params
- excelTemplateExport.js: pct() always divides by 100 (fixed upfrontFee 0.5→0.005, structuringFee 1→0.01)
- excelTemplateExport.js: caprate exit type maps to "CapRate" (was incorrectly "Sale")
- Fund Settings Mode auto-detects Per-Phase when phases have financing configs

**Cells affected:**
- Inputs: row 141 (new - Exit Cap Rate)
- Fund_ZAN 1-6: rows 44-45 (new), row 51 formula updated (all year columns)

**Tests:** 634 PASSED | 0 FAILED + 26,220 formulas, 0 errors
**Changed:**
- Fund sheet rebuilt as per-phase (Fund_ZAN 1-6 instead of single Fund)
- Added Fund_Summary dashboard
- Added Bank sheet (debt service, DSCR, sources & uses)
- Added 9_Checks sheet (24 automated integrity checks)
- Added per-phase fund settings grid in Inputs (rows 126-140)
- Added Fund Settings Mode (Unified/Per-Phase) in Inputs!C118
- Fixed: Debt Allowed=N now zeros Max Debt (was ignoring the flag)
- Fixed: Project IRR uses fund-window CF instead of 50-year CF
- Added blue borders to all 524 input cells (C4 compliance)
- Tab colors, freeze panes, sheet protection on all 15 sheets

**Cells affected:**
- Inputs: rows 117-140 (new)
- Fund_ZAN 1-6: entire sheets (new, replacing old single Fund sheet)
- Fund_Summary: entire sheet (new)
- Bank: entire sheet (new)
- 9_Checks: entire sheet (new)

**Tests:** 6-phase audit PASS (formula integrity, sensitivity, edge cases, financial logic, C1-C10, integration)

### v10 - 2026-03-15
**Changed:**
- Initial standalone model: Inputs, Program, CAPEX, Revenue, CashFlow, Operating_PL, Fund
- 7 sheets, ~13,855 formulas

**Tests:** Basic validation against ZAN reference files
