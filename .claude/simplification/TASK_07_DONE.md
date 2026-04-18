# Task 7/9 — FinancingView + defaults.js cleanup — DONE

Date: 2026-04-18

## What landed
- `src/data/defaults.js`: `finMode: "self"` → `finMode: "debt"` (simplified to 3 modes)
- `src/App.jsx` — FinancingView finMode selector:
  - Active options: `debt`, `fund`, `incomeFund` (3 total)
  - Legacy `self`/`bank100`/`hybrid` still selectable **only** when current project uses them (backward-compat)
- `src/App.jsx` — ProjectSetupWizard (step 2 "Financing Mode"):
  - Reduced to 3 active options; removed `self`/`bank100`/`hybrid` options
- `src/App.jsx` — FinancingView Land & Equity section:
  - Added banner above "Developer Investment" subsection pointing users to the new **Investors** tab when `project.investors[]` has entries. Legacy fields preserved for edit but deprecated.

## Backward compatibility
- Saved projects with `finMode: "self" | "bank100" | "hybrid"` still load correctly
- `migrateProjectToInvestors()` converts them to the new `investors[]` model on load
- Legacy option visible in the selector only while editing such a project

## Gate verification
- Build: ✅ vite build, no errors
- New tests: ✅ 82/82 pass
- Regression + financial_audit: ✅ pass
