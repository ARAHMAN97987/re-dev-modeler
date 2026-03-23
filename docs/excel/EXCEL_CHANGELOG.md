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

### v11 - 2026-03-24
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
