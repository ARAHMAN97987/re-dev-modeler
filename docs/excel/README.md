# Excel Model Documentation

This folder contains the complete documentation for the ZAN Excel Financial Model template.

## Files

| File | Purpose | When to Read |
|------|---------|-------------|
| **EXCEL_MODEL.md** | Full reference: sheet structure, 524 inputs, 56 outputs, formula chain, how to add/modify | Before making ANY change to the Excel model |
| **EXCEL_CHANGELOG.md** | Version history of all changes | After every change (add your entry) |
| **EXCEL_WORKFLOW.md** | Quick-reference: "I want to add an input" → step-by-step | When doing common tasks |
| **excel_model_spec.json** | Machine-readable map of every input cell (sheet, cell, label, type, value) | For `excelExport.js` development |

## Architecture

```
User enters project in ZAN Platform
         ↓
Platform fills 524 input cells in Excel template
         ↓
26,208 formulas calculate automatically
         ↓
Platform reads 56 output cells
         ↓
User downloads complete dynamic Excel model
```

## The Template

Located at: `templates/ZAN_Full_Model_v11_AUDITED.xlsx`

- 15 sheets | 26,208 formulas | 0 errors
- 6-phase audit passed (formula integrity, sensitivity, edge cases, financial logic, C1-C10, integration)
- All input cells: blue font (#0000FF) + light blue bg (#EBF5FB) + blue border (#4472C4)
- All formula cells: locked (sheet protection enabled)

## Golden Rules

1. **Never hardcode numbers in formula areas** (rows 47+ in Fund sheets)
2. **Every input cell must be blue** (font + bg + border)
3. **Test after every change** (`python scripts/recalc.py` + check 9_Checks sheet)
4. **Document every change** in EXCEL_CHANGELOG.md
5. **Update EXCEL_MODEL.md** when adding/removing inputs or outputs
6. **Replicate Fund changes to all 6 sheets** (Fund_ZAN 1-6 have identical structure)
