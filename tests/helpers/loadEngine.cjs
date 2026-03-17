const fs = require('fs');
const path = require('path');
const appPath = path.resolve(__dirname, '..', '..', 'src', 'App.jsx');
const src = fs.readFileSync(appPath, 'utf8');
const startIdx = src.indexOf('function getScenarioMults');
const endIdx = src.indexOf('function WaterfallView');
if (startIdx < 0 || endIdx < 0) throw new Error('Cannot find engine boundaries');
// buildPhaseIncentives is before getScenarioMults, extract it separately
const bpiStart = src.indexOf('function buildPhaseIncentives');
const bpiEnd = bpiStart >= 0 ? src.indexOf('\nfunction buildPhaseVirtualProject', bpiStart) : -1;
let code = '';
if (bpiStart >= 0 && bpiEnd > bpiStart && bpiStart < startIdx) {
  code += src.substring(bpiStart, bpiEnd) + '\n';
}
code += src.substring(startIdx, endIdx);
eval(code);
module.exports = {
  getScenarioMults, computeAssetCapex, computeProjectCashFlows,
  calcIRR, calcNPV, runChecks, computeIncentives, applyInterestSubsidy,
  computeFinancing, computeWaterfall,
  getPhaseFinancing, hasPerPhaseFinancing, migrateToPerPhaseFinancing,
  buildPhaseVirtualProject, buildPhaseProjectResults,
  aggregatePhaseFinancings, aggregatePhaseWaterfalls,
  computeIndependentPhaseResults, computePhaseWaterfalls,
  ...(typeof buildPhaseIncentives === 'function' ? { buildPhaseIncentives } : {}),
  FINANCING_FIELDS: typeof FINANCING_FIELDS !== 'undefined' ? FINANCING_FIELDS : [],
};
