# ZAN Financial Modeler - Code Splitting Plan
## Extracting the Financial Engine from App.jsx

**Date:** March 21, 2026
**Version:** 2.0 (updated after external review by ChatGPT)
**Status:** Plan - approved with reviewer corrections applied
**Current state:** 12,901 lines in single App.jsx
**Target state:** ~10,300 lines in App.jsx (UI) + ~2,600 lines in engine/ and utils/

---

## 1. Why Split Now

- Every future fix (DSCR, isFund bug, engine conflict) is easier on small focused files
- Engine has **zero React dependencies** - confirmed by line-by-line audit
- Dependency flow is **one-directional** (no circular deps)
- Tests can run on engine without React rendering
- Two people (or two Claude sessions) can work on engine vs UI simultaneously

---

## 2. Strategy: Copy, Don't Rewrite

**Golden rule: We are MOVING code, not REWRITING it.**

- Every function moves exactly as-is, character for character
- No logic changes during extraction
- No "improvements" or "cleanups" during extraction
- Bug fixes (E3-1, E3-5, etc.) happen AFTER extraction is verified

**Branch strategy (not parallel files):**
- All extraction work happens on git branch `feature/engine-extraction`
- Current `main` branch stays untouched and live
- Engine files created in engine/, data/, utils/ on the feature branch
- App.jsx imports updated on the feature branch only
- Both branches tested against same 633 test suite
- Merge to main only after full verification
- If rollback needed: `git revert` the merge commit
- **No App_v2.jsx** - one App.jsx, two branches. Avoids drift risk.

**Import compatibility during transition:**
- Create `tests/helpers/engine.cjs` as single import gateway for tests
- Tests import from this helper, not directly from App.jsx or engine/
- Helper points to engine/ on feature branch, App.jsx on main
- This avoids rewiring every test file individually

---

## 3. Current Code Map

### 3.1 What's in App.jsx today

```
Lines 1-43       Imports (React, Recharts, storage, excelExport, etc.)
Lines 44-211     CSV/Import utils (csvEscape, csvParse, parseAssetFile, mapRowsToAssets)
Lines 212-358    exportAssetsToExcel
Lines 357-390    Translation maps (CAT_AR, REV_AR, catL, revL)
Lines 391-495    Benchmarks & defaults (getBenchmark, getAutoFillDefaults, defaultHotelPL, etc.)
Lines 496-526    calcHotelEBITDA, calcMarinaEBITDA
Lines 527-627    defaultProject()
Lines 628-692    Format utils (fmt, fmtPct, fmtM) + misc helpers
Lines 693-937    getScenarioMults, computeAssetCapex, computeProjectCashFlows
Lines 938-963    calcIRR, calcNPV
Lines 964-1247   runChecks
Lines 1248-1429  computeIncentives, applyInterestSubsidy
Lines 1430-1850  computeFinancing
Lines 1851-2226  computeWaterfall
Lines 2214-2224  FINANCING_FIELDS constant (used by phase utilities)
Lines 2227-2606  Phase system (getPhaseFinancing, buildPhase*, aggregate*, computeIndependent*, legacy computePhaseWaterfalls)
Lines 2607-12901 ALL UI COMPONENTS (React)
```

### 3.2 Dependency Graph (engine functions only)

```
LEVEL 0 - No dependencies (pure math):
  calcIRR(cf)
  calcNPV(cf, rate)
  calcHotelEBITDA(hotelConfig)
  calcMarinaEBITDA(marinaConfig)

LEVEL 1 - Depends on Level 0:
  computeAssetCapex(asset, project)
  computeProjectCashFlows(project)
    → calls: computeAssetCapex, calcHotelEBITDA, calcMarinaEBITDA, calcIRR, calcNPV

LEVEL 2 - Depends on Level 1:
  computeIncentives(project, projectResults)
  applyInterestSubsidy(project, interest, constrEnd, totalDebt, rate)

LEVEL 3 - Depends on Level 2:
  computeFinancing(project, projectResults, incentivesResult)
    → calls: applyInterestSubsidy, calcIRR

LEVEL 4 - Depends on Level 3:
  computeWaterfall(project, projectResults, financing, incentivesResult)
    → calls: calcIRR, calcNPV

LEVEL 5 - Orchestrators (depend on all above):
  buildPhaseVirtualProject(project, phaseName, phaseResult)
  buildPhaseProjectResults(projectResults, phaseName)
  buildPhaseIncentives(projectResults, incentivesResult, phaseName)
  aggregatePhaseFinancings(phaseFinancings, h)
  aggregatePhaseWaterfalls(phaseWaterfalls, phaseFinancings, h)
  computeIndependentPhaseResults(project, projectResults, incentivesResult)
    → calls: buildPhase*, computeFinancing, computeWaterfall, aggregate*
  computePhaseWaterfalls(project, projectResults, financing, waterfall)
    → LEGACY: kept for backward compat

LEVEL 6 - Validation (reads everything):
  runChecks(project, results, financing, waterfall, incentivesResult)

CROSS-CUTTING:
  FINANCING_FIELDS (constant array) - used by getPhaseFinancing, migrateToPerPhaseFinancing
  getScenarioMults(project) - used by computeProjectCashFlows
  getPhaseFinancing(project, phaseName) - config helper, uses FINANCING_FIELDS
  hasPerPhaseFinancing(project) - config helper
  migrateToPerPhaseFinancing(project) - migration helper, uses FINANCING_FIELDS
  defaultProject() - used by UI for new projects
```

### 3.3 UI Components That Call Engine Directly

These components will need `import` statements after extraction:

| Component | Engine Functions Called |
|-----------|----------------------|
| **ReDevModelerInner** | computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall, computeIndependentPhaseResults, computePhaseWaterfalls, runChecks |
| **ScenariosView** | computeProjectCashFlows, computeIncentives, computeFinancing, calcIRR, calcNPV |
| **PresentationView** | computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall |
| **ReportsView** | calcIRR, calcNPV |
| **ExitAnalysisPanel** | calcIRR, calcNPV |
| **SelfResultsView** | calcNPV |
| **BankResultsView** | calcNPV |
| **SidebarAdvisor** | calcNPV |
| **IncentivesImpact** | calcIRR, calcNPV |

---

## 4. Target File Structure

```
src/
├── App.jsx                    UI only (~10,300 lines)
│
├── engine/
│   ├── index.js               Public API - re-exports for EXTERNAL consumers only (50 lines)
│   │                          ⚠️ Internal engine files import each other DIRECTLY,
│   │                          never through index.js (prevents circular deps)
│   ├── math.js                calcIRR, calcNPV (30 lines)
│   ├── hospitality.js         calcHotelEBITDA, calcMarinaEBITDA (35 lines)
│   ├── cashflow.js            computeAssetCapex, getScenarioMults,
│   │                          computeProjectCashFlows (250 lines)
│   ├── incentives.js          computeIncentives, applyInterestSubsidy (185 lines)
│   ├── financing.js           computeFinancing (425 lines)
│   ├── waterfall.js           computeWaterfall (380 lines)
│   ├── phases.js              FINANCING_FIELDS constant,
│   │                          buildPhaseVirtualProject, buildPhaseProjectResults,
│   │                          buildPhaseIncentives, aggregatePhaseFinancings,
│   │                          aggregatePhaseWaterfalls, computeIndependentPhaseResults,
│   │                          getPhaseFinancing, hasPerPhaseFinancing,
│   │                          migrateToPerPhaseFinancing (370 lines)
│   ├── checks.js              runChecks (285 lines)
│   │                          NOTE: validation not calculation. May move to
│   │                          validators/ later, but stays here for now.
│   └── legacy/
│       └── phaseWaterfalls.js  computePhaseWaterfalls — DEPRECATED (129 lines)
│                               Kept only as temporary fallback until new
│                               phase path is proven and UI fallback removed.
│                               NOT exported from engine/index.js.
│
├── data/
│   ├── defaults.js            defaultProject, defaultHotelPL, defaultMarinaPL (105 lines)
│   ├── benchmarks.js          getBenchmark, benchmarkColor, getAutoFillDefaults (105 lines)
│   └── translations.js        CAT_AR, REV_AR, catL, revL (10 lines)
│
├── utils/
│   ├── format.js              fmt, fmtPct, fmtM (10 lines)
│   └── csv.js                 csvEscape, csvParse, generateTemplate,
│                              parseAssetFile, mapRowsToAssets,
│                              exportAssetsToExcel (315 lines)
│
├── tests/
│   └── helpers/
│       └── engine.cjs         Single import gateway for all test suites (20 lines)
│                              Tests import from here, not from App.jsx or engine/ directly.
│                              Makes switching between old/new imports safe.
│
├── excelExport.js             Already separate ✅
├── excelFormulaExport.js      Already separate ✅
├── AiAssistant.jsx            Already separate ✅
├── embeddedFonts.js           Already separate ✅
└── lib/
    ├── auth.jsx               Already separate ✅
    └── storage.js             Already separate ✅
```

**Import rules:**
- `App.jsx` → imports from `engine/index.js` (barrel file)
- `tests/` → imports from `tests/helpers/engine.cjs` (shim)
- `engine/financing.js` → imports from `./math.js` (DIRECT, not ./index.js)
- `engine/phases.js` → imports from `./financing.js`, `./waterfall.js` (DIRECT)
- `engine/legacy/phaseWaterfalls.js` → imported ONLY by App.jsx directly, not via index.js

**Total new files: 14** (12 engine/data/utils + 1 legacy + 1 test helper)
**Total lines moved: ~2,555**
**App.jsx after: ~10,300 lines (all UI)**

---

## 5. Extraction Order (step by step)

Each step is atomic: extract → test → verify → commit. If any step fails, fix before proceeding.

### Step 1: engine/math.js (safest, zero dependencies)

**Move:**
- `calcIRR` (lines 938-961, 24 lines)
- `calcNPV` (lines 962-963, 2 lines)

**Exports:**
```javascript
export function calcIRR(cf, guess=0.1, maxIter=200, tol=1e-7) { ... }
export function calcNPV(cf, r) { ... }
```

**Import in App.jsx:**
```javascript
import { calcIRR, calcNPV } from './engine/math.js';
```

**Risk:** Lowest. Pure math, used everywhere but depends on nothing.
**Test:** Run full test suite. calcIRR/calcNPV results must be identical.

---

### Step 2: engine/hospitality.js

**Move:**
- `calcHotelEBITDA` (lines 496-512, 17 lines)
- `calcMarinaEBITDA` (lines 513-526, 14 lines)

**Dependencies:** None.
**Risk:** Very low.

---

### Step 3: data/defaults.js

**Move:**
- `defaultProject()` (lines 527-627, 101 lines)
- `defaultHotelPL()` (line 493, 1 line)
- `defaultMarinaPL()` (line 494, 1 line)

**Dependencies:** defaultProject references defaultHotelPL and defaultMarinaPL internally.
**Imports needed:** None from other new files.
**Risk:** Low. Used by UI for new project creation.

---

### Step 4: data/benchmarks.js

**Move:**
- `getBenchmark` (lines 391-404)
- `benchmarkColor` (lines 405-419)
- `getAutoFillDefaults` (lines 420-492)

**Dependencies:** getAutoFillDefaults uses defaultHotelPL and defaultMarinaPL.
**Import needed:** `import { defaultHotelPL, defaultMarinaPL } from './defaults.js';`
**Risk:** Low.

---

### Step 5: data/translations.js

**Move:**
- `CAT_AR` (line 357)
- `REV_AR` (line 358)
- `catL` (line 359)
- `revL` (line 360)

**Dependencies:** None.
**Risk:** Very low. Used widely in UI for display.

---

### Step 6: utils/format.js

**Move:**
- `fmt` (line 628)
- `fmtPct` (line 629)
- `fmtM` (line 630)

**Dependencies:** fmtM calls fmt internally.
**Risk:** Very low. Used everywhere in UI.

---

### Step 7: utils/csv.js

**Move:**
- `csvEscape` (lines 44-49)
- `csvParse` (lines 50-108)
- `generateTemplate` (lines 109-119)
- `parseAssetFile` (lines 120-136)
- `mapRowsToAssets` (lines 137-211)
- `exportAssetsToExcel` (lines 212-358)

**Dependencies:** mapRowsToAssets uses defaultHotelPL, defaultMarinaPL. exportAssetsToExcel uses fmt.
**Imports needed:**
```javascript
import { defaultHotelPL, defaultMarinaPL } from '../data/defaults.js';
import { fmt } from './format.js';
```
**Risk:** Low-medium. exportAssetsToExcel is complex but self-contained.

---

### Step 8: engine/cashflow.js (first real engine file)

**Move:**
- `getScenarioMults` (lines 693-703)
- `computeAssetCapex` (lines 704-708)
- `computeProjectCashFlows` (lines 709-937, 229 lines)

**Dependencies:**
```javascript
import { calcIRR, calcNPV } from './math.js';
import { calcHotelEBITDA, calcMarinaEBITDA } from './hospitality.js';
```

**Risk:** Medium. This is the foundation of all calculations. Tests critical.
**Test:** computeProjectCashFlows output must match exactly for ZAN benchmark project.

---

### Step 9: engine/incentives.js

**Move:**
- `computeIncentives` (lines 1248-1377, 130 lines)
- `applyInterestSubsidy` (lines 1378-1429, 52 lines)

**Dependencies:** None from other engine files (reads project + projectResults).
**Risk:** Low-medium.

---

### Step 10: engine/financing.js

**Move:**
- `computeFinancing` (lines 1430-1850, 421 lines)

**Dependencies:**
```javascript
import { calcIRR } from './math.js';
import { applyInterestSubsidy } from './incentives.js';
```

**Risk:** Medium-high. Core financial logic. Extensive testing required.
**Test:** Every financing output (debt balance, DSCR, equity calls) must match.

---

### Step 11: engine/waterfall.js

**Move:**
- `computeWaterfall` (lines 1851-2226, 376 lines)

**Dependencies:**
```javascript
import { calcIRR, calcNPV } from './math.js';
```

**Risk:** Medium-high. Complex distribution logic.
**Test:** LP IRR, GP IRR, MOIC, all tier distributions must match.

---

### Step 12: engine/phases.js

**Move:**
- `FINANCING_FIELDS` constant (lines 2214-2224, 11 lines)
- `getPhaseFinancing` (lines 2227-2236)
- `hasPerPhaseFinancing` (lines 2237-2241)
- `migrateToPerPhaseFinancing` (lines 2242-2253)
- `buildPhaseIncentives` (lines 2254-2287)
- `buildPhaseVirtualProject` (lines 2288-2310)
- `buildPhaseProjectResults` (lines 2311-2334)
- `aggregatePhaseFinancings` (lines 2335-2374)
- `aggregatePhaseWaterfalls` (lines 2375-2433)
- `computeIndependentPhaseResults` (lines 2434-2477)

**NOT included:** `computePhaseWaterfalls` (legacy) → goes to Step 12b separately.

**Dependencies:**
```javascript
import { calcIRR, calcNPV } from './math.js';       // DIRECT, not ./index.js
import { computeFinancing } from './financing.js';   // DIRECT
import { computeWaterfall } from './waterfall.js';   // DIRECT
```

**Risk:** Medium. These orchestrate per-phase calculations.
**Test:** Multi-phase project results must match.

---

### Step 12b: engine/legacy/phaseWaterfalls.js — DEPRECATED

**Move:**
- `computePhaseWaterfalls` (lines 2478-2606, 129 lines)

**Dependencies:**
```javascript
import { calcIRR } from '../math.js';  // DIRECT, one level up
```

**Mark deprecated:**
```javascript
/**
 * @deprecated Legacy per-phase waterfall allocation.
 * Kept as temporary fallback until computeIndependentPhaseResults
 * is proven to fully replace this function.
 * Do NOT add new features to this function.
 * Target removal: after engine extraction parity is confirmed.
 */
export function computePhaseWaterfalls(project, projectResults, financing, waterfallConsolidated) {
  // ... existing code unchanged ...
}
```

**NOT exported from engine/index.js.** App.jsx imports it directly:
```javascript
import { computePhaseWaterfalls } from './engine/legacy/phaseWaterfalls.js';
```

**Risk:** Low. Isolated legacy code.
**Test:** Existing tests that use legacy path must still pass.

---

### Step 13: engine/checks.js

**Move:**
- `runChecks` (lines 964-1247, 284 lines)

**Dependencies:** None from other engine files. Reads results passed as parameters.
**Risk:** Low. Pure validation, reads data only.

---

### Step 14: engine/index.js (public API)

**Create new file:**
```javascript
// engine/index.js - Public API for ZAN Financial Engine
// ⚠️ This barrel file is for EXTERNAL consumers only (App.jsx, tests)
// Engine files import each other DIRECTLY (e.g., import { calcIRR } from './math.js')

export { calcIRR, calcNPV } from './math.js';
export { calcHotelEBITDA, calcMarinaEBITDA } from './hospitality.js';
export { getScenarioMults, computeAssetCapex, computeProjectCashFlows } from './cashflow.js';
export { computeIncentives, applyInterestSubsidy } from './incentives.js';
export { computeFinancing } from './financing.js';
export { computeWaterfall } from './waterfall.js';
export {
  FINANCING_FIELDS,
  getPhaseFinancing, hasPerPhaseFinancing, migrateToPerPhaseFinancing,
  buildPhaseIncentives, buildPhaseVirtualProject, buildPhaseProjectResults,
  aggregatePhaseFinancings, aggregatePhaseWaterfalls,
  computeIndependentPhaseResults
} from './phases.js';
export { runChecks } from './checks.js';

// NOTE: computePhaseWaterfalls is NOT exported here.
// It lives in engine/legacy/phaseWaterfalls.js and must be imported directly.
// It is deprecated and will be removed after parity is confirmed.
```

---

### Step 15: Create tests/helpers/engine.cjs (test import shim)

**Create new file:**
```javascript
// tests/helpers/engine.cjs
// Single import gateway for all test suites.
// Tests import from here. If engine paths change, only this file updates.

const engine = require('../../src/engine/index.js');
const defaults = require('../../src/data/defaults.js');
const legacy = require('../../src/engine/legacy/phaseWaterfalls.js');

module.exports = {
  ...engine,
  ...defaults,
  computePhaseWaterfalls: legacy.computePhaseWaterfalls,
};
```

**Update test files:** Replace direct App.jsx imports with:
```javascript
const { computeProjectCashFlows, computeFinancing, ... } = require('./helpers/engine.cjs');
```

**Risk:** Medium. Paths must be correct. Test one suite first before updating all.

---

### Step 16: Update App.jsx imports

**Replace** all inline engine functions with:
```javascript
// Engine (via barrel file - external consumer)
import {
  calcIRR, calcNPV,
  computeProjectCashFlows, computeFinancing, computeWaterfall,
  computeIncentives, computeIndependentPhaseResults,
  runChecks, migrateToPerPhaseFinancing, hasPerPhaseFinancing
} from './engine/index.js';

// Legacy (direct import - NOT via barrel)
import { computePhaseWaterfalls } from './engine/legacy/phaseWaterfalls.js';

// Data
import { defaultProject, defaultHotelPL, defaultMarinaPL } from './data/defaults.js';
import { getBenchmark, benchmarkColor, getAutoFillDefaults } from './data/benchmarks.js';
import { CAT_AR, REV_AR, catL, revL } from './data/translations.js';

// Utils
import { fmt, fmtPct, fmtM } from './utils/format.js';
import { csvEscape, csvParse, generateTemplate, parseAssetFile, mapRowsToAssets, exportAssetsToExcel } from './utils/csv.js';
```

**Delete** the original function definitions from App.jsx (lines 44-2606).

---

### Step 17: Immutability tests (post-extraction verification)

**Why:** Reviewer flagged that `buildPhaseVirtualProject` passes `project.phases` by reference (not copy), and `buildPhaseIncentives` does shallow spread of `incentivesResult`. After extraction, these functions may be called in new contexts where mutation could cause bugs.

**Create:** `tests/immutability.cjs`
```javascript
// Tests that engine functions do NOT mutate their input objects

const { computeProjectCashFlows, computeFinancing, computeWaterfall,
  computeIncentives, computeIndependentPhaseResults,
  buildPhaseVirtualProject, buildPhaseIncentives
} = require('./helpers/engine.cjs');
const { defaultProject } = require('./helpers/engine.cjs');

function deepFreeze(obj) {
  Object.freeze(obj);
  Object.keys(obj).forEach(k => {
    if (typeof obj[k] === 'object' && obj[k] !== null && !Object.isFrozen(obj[k])) {
      deepFreeze(obj[k]);
    }
  });
  return obj;
}

describe('Immutability', () => {
  test('computeProjectCashFlows does not mutate project', () => {
    const project = deepFreeze({ ...defaultProject(), assets: [/* test asset */] });
    expect(() => computeProjectCashFlows(project)).not.toThrow();
  });

  test('computeFinancing does not mutate inputs', () => {
    const project = deepFreeze({ ...defaultProject(), finMode: 'debt' });
    const results = deepFreeze(computeProjectCashFlows({ ...defaultProject(), assets: [] }));
    // If it throws TypeError: Cannot assign to read only property → mutation detected
    expect(() => computeFinancing(project, results, null)).not.toThrow();
  });

  test('buildPhaseVirtualProject does not mutate project', () => {
    const project = deepFreeze({ ...defaultProject(), phases: [{ name: 'Phase 1' }] });
    const phaseResult = deepFreeze({ allocPct: 1, totalCapex: 1000000 });
    expect(() => buildPhaseVirtualProject(project, 'Phase 1', phaseResult)).not.toThrow();
  });

  test('buildPhaseIncentives does not mutate incentivesResult', () => {
    const ir = deepFreeze({
      capexGrantTotal: 0, capexGrantSchedule: new Array(50).fill(0),
      feeRebateTotal: 0, feeRebateSchedule: new Array(50).fill(0),
      landRentSavingTotal: 0, landRentSavingSchedule: new Array(50).fill(0),
    });
    const projectResults = deepFreeze({
      consolidated: { totalCapex: 100, totalLandRent: 10 },
      phaseResults: { 'Phase 1': { totalCapex: 100, totalLandRent: 10, allocPct: 1,
        landRent: new Array(50).fill(0), capex: new Array(50).fill(0), netCF: new Array(50).fill(0) } }
    });
    expect(() => buildPhaseIncentives(projectResults, ir, 'Phase 1')).not.toThrow();
  });
});
```

**Risk:** Low. These are read-only tests. If any throw → we found a mutation bug to fix.

---

### Step 18: runFullModel orchestrator (thin wrapper)

**When:** ONLY after Steps 1-17 pass all tests and parity is confirmed.

**Create:** Add to `engine/index.js`:
```javascript
/**
 * Runs the complete financial model pipeline.
 * Thin wrapper - NO new logic. Just composes existing functions in order.
 * This should eventually become the ONLY function App.jsx calls.
 *
 * @param {Object} project - Full project state
 * @returns {Object} All computed results
 */
export function runFullModel(project) {
  const projectResults = computeProjectCashFlows(project);
  if (!projectResults) return null;

  const incentivesResult = computeIncentives(project, projectResults);

  const financing = (project.finMode !== 'self' && project.finMode !== 'bank100')
    ? computeFinancing(project, projectResults, incentivesResult)
    : null;

  const waterfall = (project.finMode === 'fund')
    ? computeWaterfall(project, projectResults, financing, incentivesResult)
    : null;

  const independentPhaseResults = computeIndependentPhaseResults(project, projectResults, incentivesResult);

  const checks = runChecks(
    project, projectResults,
    independentPhaseResults?.consolidatedFinancing || financing,
    independentPhaseResults?.consolidatedWaterfall || waterfall,
    incentivesResult
  );

  return {
    projectResults,
    incentivesResult,
    financing: independentPhaseResults?.consolidatedFinancing || financing,
    waterfall: independentPhaseResults?.consolidatedWaterfall || waterfall,
    independentPhaseResults,
    checks,
  };
}
```

**⚠️ NOTE:** This wrapper replicates the EXACT same logic currently at App.jsx lines 4897-4909. No new branching. No new behavior. Just composition.

**Future goal:** App.jsx replaces its 7 separate useMemo calls with a single:
```javascript
const modelResults = useMemo(() => runFullModel(project), [project]);
```
But that UI change happens AFTER extraction, not during.

**Acceptance Criteria:**
- [ ] runFullModel(project) returns identical results to current 7-useMemo approach
- [ ] No new logic added
- [ ] Tested against ZAN benchmark

---

## 6. Testing Protocol

### After EACH step:

```bash
# 1. Run full test suite
node tests/regression.cjs        # 50 tests
node tests/full_suite.cjs        # 205 tests
node tests/input_impact.cjs      # 108 tests
node tests/fin_audit_p1.cjs      # 58 tests
node tests/fin_audit_p2.cjs      # 52 tests
node tests/zan_benchmark.cjs     # 160 tests
# Target: 633 PASSED | 0 FAILED

# 2. Verify Vite builds without errors
npm run build

# 3. Verify dev server runs
npm run dev
```

### After ALL extraction steps complete:

```bash
# 4. Run immutability tests (Step 17)
node tests/immutability.cjs

# 5. Diff test: run ZAN benchmark on main branch vs feature branch
# Every number must be identical (diff = 0.00%)

# 6. Manual verification by Abdulrahman:
# - Create new project
# - Add assets
# - Run financing
# - Check waterfall
# - Export Excel
# - Verify all numbers match
```

### defaultProject() test stability:

`defaultProject()` uses `crypto.randomUUID()`, `new Date().toISOString()`, and `new Date().getFullYear()`. Tests that create projects from defaults must either:
- Mock these values, or
- Normalize (strip) id/timestamps before comparison

```javascript
// Example: normalize before snapshot comparison
const normalize = (project) => {
  const p = { ...project };
  delete p.id;
  delete p.createdAt;
  p.startYear = 2026; // Fixed
  return p;
};
```

---

## 7. Rollback Plan

- All work on branch `feature/engine-extraction`
- `main` branch stays untouched and deployable throughout
- If any step fails and can't be fixed quickly → `git stash` or revert that commit
- Final merge: `git merge feature/engine-extraction` into main
- If production issues found post-merge → `git revert <merge-commit>` (instant rollback)
- **No parallel App files.** One branch = one version of truth at any time.

---

## 8. What This Does NOT Include

- No logic changes (bug fixes happen after extraction is verified)
- No React component splitting (App.jsx stays as one UI file for now)
- No new features
- No style changes
- No test logic modifications (same tests, same expectations, only import paths change via shim)

---

## 9. Known Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Import path typo breaks build | Medium | Low | Vite build check after each step |
| Circular dependency via barrel file | Low | High | Internal imports use DIRECT paths, not index.js |
| Function references `this` or closure variable | Low | Medium | All functions are pure - verified by audit |
| Test suite can't import from engine/ | Medium | Medium | tests/helpers/engine.cjs shim handles this |
| ScenariosView re-runs engine inline | Known | None | Works fine with imports, same as before |
| Shared object mutation after extraction | Medium | Medium | Immutability tests (Step 17) catch this |
| defaultProject() time/random instability in tests | Medium | Low | Mock or normalize before comparison |
| Aggregated outputs ≠ legacy outputs (schema gaps) | Known | High | Documented in Output Contract (Section 12) |
| Branch drift if extraction takes too long | Low | Medium | Target: complete in 1-2 sessions max |

---

## 10. Success Criteria

- [ ] 633 tests pass (identical to current)
- [ ] Vite build succeeds
- [ ] ZAN benchmark numbers identical (0.00% diff)
- [ ] No engine function remains in App.jsx
- [ ] App.jsx contains only React components and UI logic
- [ ] Each engine file is independently testable (can import and call without React)
- [ ] Immutability tests pass (no input mutation detected)
- [ ] runFullModel() produces identical results to current 7-useMemo approach
- [ ] tests/helpers/engine.cjs works as single import gateway
- [ ] computePhaseWaterfalls isolated in engine/legacy/ with deprecated marker
- [ ] Manual verification by Abdulrahman passes

---

## 11. Estimated Effort

| Step | Effort | Time |
|------|--------|------|
| Steps 1-7 (utils + data) | Simple copy | 30 min |
| Steps 8-13 (engine core + legacy isolation) | Careful extraction | 1-2 hours |
| Steps 14-15 (index + test shim) | Create new files | 20 min |
| Step 16 (rewire App.jsx imports) | Import replacement | 30 min |
| Step 17 (immutability tests) | Write + run | 30 min |
| Step 18 (runFullModel wrapper) | Thin wrapper + test | 20 min |
| Testing (after each step) | Build + 633 tests | 1 hour total |
| **Total** | | **4-5 hours** |

---

## 12. Output Contract: Aggregated vs Legacy Results

> **Added per reviewer recommendation.** The newer per-phase aggregated outputs are NOT yet fully equivalent to the legacy consolidated outputs. This section documents the differences explicitly so no one assumes equivalence.

### aggregatePhaseFinancings() vs computeFinancing()

| Field | Legacy (computeFinancing) | Aggregated (aggregatePhaseFinancings) | Status |
|-------|--------------------------|--------------------------------------|--------|
| totalEquity, gpEquity, lpEquity | Exact | Sum of phases | ✅ Equivalent |
| totalDebt, maxDebt | Exact | Sum of phases | ✅ Equivalent |
| drawdown[], equityCalls[] | Exact per year | Sum per year across phases | ✅ Equivalent |
| debtBalOpen[], debtBalClose[] | Exact per year | Sum per year across phases | ✅ Equivalent |
| interest[], debtService[] | Exact per year | Sum per year across phases | ✅ Equivalent |
| leveredCF[] | Exact per year | Sum per year across phases | ✅ Equivalent |
| leveredIRR | From single CF stream | From summed CF stream | ⚠️ May differ slightly |
| dscr[] | NOI / DS per year | Weighted reconstruction | ⚠️ Approximation |
| **rate** | Actual debt rate | **0 (placeholder)** | ❌ Not equivalent |
| **tenor** | Actual tenor | **0 (placeholder)** | ❌ Not equivalent |
| **grace** | Actual grace | **0 (placeholder)** | ❌ Not equivalent |
| **repayYears** | Actual repay years | **0 (placeholder)** | ❌ Not equivalent |
| **repayStart** | Actual repay start | **0 (placeholder)** | ❌ Not equivalent |
| exitYear | Actual exit year | Max across phases | ⚠️ May differ |

### aggregatePhaseWaterfalls() vs computeWaterfall()

| Field | Legacy (computeWaterfall) | Aggregated | Status |
|-------|--------------------------|-----------|--------|
| tier1-4, distributions | Exact per year | Sum per year across phases | ✅ Equivalent |
| lpIRR, gpIRR | From single CF stream | From summed CF stream | ⚠️ May differ slightly |
| lpMOIC, gpMOIC | Exact | Recomputed from sums | ✅ Equivalent |
| **isFund** | Dynamic (checks finMode + vehicleType) | **Hardcoded `true`** | ❌ Not equivalent |
| exitYear | Actual | Max across phases | ⚠️ May differ |

### Impact on UI and Checks

The current code at lines 4903-4909 uses aggregated results for UI display but legacy results for checks. After extraction, this mismatch is documented but NOT fixed during extraction. The fix (E3-1 from the Master Development Plan) happens as a separate task.

### Action items (post-extraction):
- [ ] Fix placeholder fields in aggregatePhaseFinancings (rate, tenor, grace, etc.)
- [ ] Fix hardcoded isFund: true in aggregatePhaseWaterfalls
- [ ] Align checks to use same source as UI (E3-1)
- [ ] Add parity tests: run both paths on same input, compare field by field

---

## 13. Reviewer Feedback Log

**External reviewer:** ChatGPT (Eval 3 author)
**Review date:** March 21, 2026
**Verdict:** "Approved with conditions"

| # | Reviewer Point | Our Response | Plan Change |
|---|---------------|-------------|-------------|
| 1 | FINANCING_FIELDS missing | Confirmed. Was missed. | Added to phases.js (Step 12) |
| 2 | Aggregated ≠ Legacy outputs | Confirmed. Documented. | Added Output Contract (Section 12) |
| 3 | computePhaseWaterfalls should be quarantined | Agreed. | Moved to engine/legacy/ (Step 12b) |
| 4 | Don't maintain parallel App files | Agreed. | Changed to git branch strategy |
| 5 | Use import shim for tests | Agreed. | Added tests/helpers/engine.cjs (Step 15) |
| 6 | Internal imports should be direct | Agreed. | Documented in file structure + import rules |
| 7 | Add immutability tests | Agreed. | Added Step 17 |
| 8 | checks.js placement fine for now | Noted. | No change, added future note |
| 9 | runFullModel yes, but thin wrapper only | Agreed. | Added Step 18 with strict "no new logic" rule |
| 10 | Freeze time/randomness in default tests | Agreed. | Added mock strategy in Testing Protocol |
