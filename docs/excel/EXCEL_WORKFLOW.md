# ZAN Excel Model - Development Workflow

## Quick Reference: I Want To...

### Add a new input field
```
1. Inputs sheet → add row with blue styling
2. Reference it in the relevant formula sheet
3. Update EXCEL_MODEL.md Section 3
4. Update excelExport.js input mapping
5. Test: recalc.py → 0 errors → sensitivity test
6. Log in EXCEL_CHANGELOG.md
```

### Add a new output/KPI
```
1. Add formula row in the relevant sheet
2. Replicate to all Fund_ZAN sheets if per-phase
3. Update EXCEL_MODEL.md Section 4
4. Update excelExport.js output reading
5. Test: recalc.py → 9_Checks → sensitivity
6. Log in EXCEL_CHANGELOG.md
```

### Change a formula
```
1. Edit the formula in the Excel file
2. Replicate to all copies (if in Fund_ZAN, update all 6)
3. Test: recalc.py → 0 errors
4. Sensitivity: change related input → verify output changes correctly
5. Check 9_Checks → MODEL CLEAN
6. Log in EXCEL_CHANGELOG.md
```

### Add a new sheet
```
1. Create sheet with proper styling
2. Add cross-sheet references
3. Add to 9_Checks (Section D cross-sheet)
4. Update sheet order
5. Update EXCEL_MODEL.md Section 2
6. Full test cycle
7. Log in EXCEL_CHANGELOG.md
```

### Connect a new platform feature to Excel
```
1. Identify which input cells need data
2. Add mapping in excelExport.js: platform field → Excel cell
3. If new input needed → follow "Add a new input field"
4. If new output needed → follow "Add a new output/KPI"  
5. Test round-trip: platform data → Excel → compare numbers
6. Log in EXCEL_CHANGELOG.md
```

## File Locations (in repo)

```
docs/
  EXCEL_MODEL.md          ← Main reference (this is the bible)
  EXCEL_CHANGELOG.md      ← Version history
  EXCEL_WORKFLOW.md        ← This file
  excel_model_spec.json   ← Machine-readable cell map

templates/
  ZAN_Full_Model_v11_AUDITED.xlsx  ← The template file

src/
  excelExport.js          ← Platform → Excel bridge code
```

## Golden Rules

1. **Never hardcode numbers in formula areas** (rows 47+ in Fund sheets)
2. **Every input cell must be blue** (font + bg + border)
3. **Test after every change** (recalc.py + 9_Checks)
4. **Document every change** (EXCEL_CHANGELOG.md)
5. **Update EXCEL_MODEL.md** when adding/removing inputs or outputs
6. **Replicate Fund changes to all 6 sheets** (ZAN 1-6 have identical structure)
