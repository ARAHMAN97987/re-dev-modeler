/**
 * ZAN Financial Engine — Public API
 * 
 * ⚠️ This barrel file is for EXTERNAL consumers only (App.jsx, tests).
 * Engine files import each other DIRECTLY (e.g., import { calcIRR } from './math.js')
 * to prevent circular dependencies.
 * 
 * NOTE: computePhaseWaterfalls is NOT exported here.
 * It lives in engine/legacy/phaseWaterfalls.js and must be imported directly.
 * It is deprecated and will be removed after parity is confirmed.
 */

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
