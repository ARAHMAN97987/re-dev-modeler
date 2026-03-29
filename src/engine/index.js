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
export {
  runMarketDataUpdate, loadLatestSnapshot, loadHistory,
  checkFreshness, getMarketDefaults, getMarketHotelDefaults,
  getMarketExitCapRate, routeSnapshot, applyToBenchmarks,
  formToEntries, snapshotToForm, structureSnapshot, saveSnapshot,
} from './marketData.js';

// ── Local imports for runFullModel composition ──
import { computeProjectCashFlows } from './cashflow.js';
import { computeIncentives } from './incentives.js';
import { computeFinancing } from './financing.js';
import { computeWaterfall } from './waterfall.js';
import { computeIndependentPhaseResults } from './phases.js';
import { runChecks } from './checks.js';

/**
 * Runs the complete financial model pipeline.
 * Thin wrapper — NO new logic. Just composes existing functions in order.
 * Replicates the EXACT same logic as App.jsx lines 2602-2616 useMemo chain.
 *
 * @param {Object} project - Full project state
 * @returns {Object|null} All computed results, or null if no project
 */
export function runFullModel(project) {
  if (!project) return null;

  const projectResults = computeProjectCashFlows(project);
  if (!projectResults) return null;

  const incentivesResult = computeIncentives(project, projectResults);

  // Legacy single-block financing & waterfall
  let _legacyFinancing = null;
  let _legacyWaterfall = null;
  try { _legacyFinancing = computeFinancing(project, projectResults, incentivesResult); } catch(e) { console.error("computeFinancing error:", e); }
  try { if (_legacyFinancing) _legacyWaterfall = computeWaterfall(project, projectResults, _legacyFinancing, incentivesResult); } catch(e) { console.error("computeWaterfall error:", e); }

  // Per-phase independent financing & waterfall (new architecture)
  let independentPhaseResults = null;
  try { independentPhaseResults = computeIndependentPhaseResults(project, projectResults, incentivesResult); } catch(e) { console.error("independentPhaseResults error:", e); }

  // Resolved: prefer aggregated per-phase results, fallback to legacy
  const financing = independentPhaseResults?.consolidatedFinancing || _legacyFinancing;
  const waterfall = independentPhaseResults?.consolidatedWaterfall || _legacyWaterfall;

  // Phase data
  const phaseFinancings = independentPhaseResults?.phaseFinancings || {};
  const phaseWaterfalls = (independentPhaseResults?.phaseWaterfalls && Object.keys(independentPhaseResults.phaseWaterfalls).length > 0)
    ? independentPhaseResults.phaseWaterfalls
    : null; // UI handles legacy fallback via computePhaseWaterfalls (not included here)

  // Checks: validate against the SAME source the UI displays
  let checks = [];
  try { checks = runChecks(project, projectResults, financing, waterfall, incentivesResult); } catch(e) { console.error("runChecks error:", e); }

  return {
    projectResults,
    incentivesResult,
    financing,
    waterfall,
    independentPhaseResults,
    phaseFinancings,
    phaseWaterfalls,
    checks,
    // Convenience: expose legacy for comparison/debugging
    _legacyFinancing,
    _legacyWaterfall,
  };
}
