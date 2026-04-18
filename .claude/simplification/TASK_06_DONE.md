# Task 6/9 — Investors UI + fundManager + migration v3 — DONE

Date: 2026-04-18

## What landed
- `src/components/views/InvestorsView.jsx` (315 lines) — manages `project.investors[]`
  - 5 contribution presets (Cash, Developer Cash, Dev Fee Reinvest, Land Partner, Leasehold)
  - Role dropdown (developer/investor)
  - Inline editable name, contribution type, amount
  - Leasehold capitalization hint (when `landType === "lease" && landCapitalize`)
  - Apple HIG tokens throughout
- `src/App.jsx`
  - Import `InvestorsView`
  - Tab registered: `{key:"investors", label:"المستثمرون"/"Investors", group:"finance", hide: !(fund|incomeFund|hybrid|investors.length>1)}`
  - Wired into view-switch dictionary
  - `migrateProjectToInvestors()` call inside `loadProject` → seeds `investors[]` from legacy modes
  - `fundManager` seeded from `fundName`, `annualMgmtFeePct`, `mgmtFeeBase`, …
  - `_structureVersion = 3` stamped

## Gate verification
- Build: ✅ `vite build` 1198 modules, no errors
- New tests: ✅ 82/82 pass (investors_schema, waterfall_3stage, fund_manager, no_gp_lp_fields, finmode_simplified, developer_performance_incentive)
- Legacy tests sampled: ✅ regression 49/49, financial_audit 67/67, round9 19/19, round10 43/43, pin-tests 24/24, jazan 100%
