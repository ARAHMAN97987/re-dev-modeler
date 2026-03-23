# Excel Templates

Template files used by `src/excelExport.js` for platform Excel export.

## Current Template

**ZAN_Full_Model_v11_AUDITED.xlsx**
- Version: v11 (Mar 2026)
- Sheets: 15 (Inputs, Program, CAPEX, Revenue, CashFlow, Operating_PL, Fund_Summary, Fund_ZAN 1-6, Bank, 9_Checks)
- Formulas: 26,208
- Inputs: 524 blue cells (platform fills these)
- Outputs: 56 key metrics (platform reads these)
- Errors: 0

## How Export Works

1. `excelExport.js` loads this template using ExcelJS
2. Fills 524 input cells with project data from the platform
3. Formulas recalculate in the user's Excel/LibreOffice when opened
4. User gets a fully dynamic model they can modify

## Important

- **Do NOT manually edit this file** without following `docs/excel/EXCEL_WORKFLOW.md`
- **After any change:** run `python scripts/recalc.py templates/ZAN_Full_Model_v11_AUDITED.xlsx` and verify 0 errors
- **Log changes** in `docs/excel/EXCEL_CHANGELOG.md`
- **Full docs:** see `docs/excel/EXCEL_MODEL.md`
