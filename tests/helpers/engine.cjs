/**
 * tests/helpers/engine.cjs
 * 
 * Single import gateway for ALL test suites.
 * Reads engine/ files (ESM) and makes them available as CJS exports.
 * Tests import from here — if engine paths change, only this file updates.
 * 
 * Strategy: Read ESM source, strip import/export syntax, eval in shared scope.
 */
const fs = require('fs');
const path = require('path');

const engineDir = path.resolve(__dirname, '..', '..', 'src', 'engine');
const dataDir = path.resolve(__dirname, '..', '..', 'src', 'data');

function loadESM(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  // Strip ESM syntax for CJS eval
  // Convert const/let to var so eval declarations leak to outer scope
  return code
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\s*$/gm, '') // import { x } from 'y'
    .replace(/^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"];?\s*$/gm, '') // import * as x from 'y'
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '') // export { x, y }
    .replace(/^export\s+\{[^}]*\}\s*from\s*['"][^'"]*['"];?\s*$/gm, '') // re-exports
    .replace(/^const\s+/gm, 'var ')
    .replace(/^let\s+/gm, 'var ');
}

// Load in dependency order (matching engine dependency graph)
// Level 0: no deps
eval(loadESM(path.join(engineDir, 'math.js')));
eval(loadESM(path.join(engineDir, 'hospitality.js')));

// Level 1: depends on math + hospitality
eval(loadESM(path.join(engineDir, 'cashflow.js')));

// Level 2: depends on math
eval(loadESM(path.join(engineDir, 'incentives.js')));

// Level 3: depends on math + incentives
eval(loadESM(path.join(engineDir, 'financing.js')));

// Level 4: depends on math
eval(loadESM(path.join(engineDir, 'waterfall.js')));

// Level 5: depends on math + financing + waterfall
eval(loadESM(path.join(engineDir, 'phases.js')));

// Level 6: no engine deps (reads params)
eval(loadESM(path.join(engineDir, 'checks.js')));

// Legacy (deprecated)
eval(loadESM(path.join(engineDir, 'legacy', 'phaseWaterfalls.js')));

// Data
eval(loadESM(path.join(dataDir, 'defaults.js')));

module.exports = {
  // engine/math.js
  calcIRR, calcNPV,
  // engine/hospitality.js
  calcHotelEBITDA, calcMarinaEBITDA,
  // engine/cashflow.js
  getScenarioMults, computeAssetCapex, computeProjectCashFlows,
  // engine/incentives.js
  computeIncentives, applyInterestSubsidy,
  // engine/financing.js
  computeFinancing,
  // engine/waterfall.js
  computeWaterfall,
  // engine/phases.js
  FINANCING_FIELDS, getPhaseFinancing, hasPerPhaseFinancing, migrateToPerPhaseFinancing,
  buildPhaseIncentives, buildPhaseVirtualProject, buildPhaseProjectResults,
  aggregatePhaseFinancings, aggregatePhaseWaterfalls, computeIndependentPhaseResults,
  // engine/checks.js
  runChecks,
  // engine/legacy/phaseWaterfalls.js
  computePhaseWaterfalls,
  // data/defaults.js
  defaultProject, defaultHotelPL, defaultMarinaPL,
};
