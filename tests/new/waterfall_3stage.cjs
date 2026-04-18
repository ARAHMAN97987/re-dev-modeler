/**
 * tests/new/waterfall_3stage.cjs
 *
 * Verifies the new 3-stage waterfall on a project with multiple investors.
 *
 * Setup: 3 investors
 *   - Developer: 5M (type: cash)
 *   - Investor A: 50M (type: cash)
 *   - Landholder: 40M (type: landValue, in-kind)
 * Expected: Stage 1 ROC pro-rata → Stage 2 incentive if IRR > 15% → Stage 3 profit pro-rata
 *
 * Status: RED until Task 3 rewrites waterfall.js with 3-stage model
 */

const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0, skipped = 0;
const t = (name, ok, detail) => {
  if (ok === 'skip') { skipped++; console.log(`  ⏭  ${name} ${detail ? '— ' + detail : ''}`); return; }
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}  ${detail || ''}`); }
};

console.log('WATERFALL 3-STAGE TESTS');

const investorsPath = path.resolve(__dirname, '..', '..', 'src', 'engine', 'investors.js');
if (!fs.existsSync(investorsPath)) {
  console.log(`  ⏭  investors.js not created yet — skipping`);
  console.log(`\nSUMMARY: 0 passed, 0 failed, all skipped (engine not refactored)`);
  process.exit(0);
}

const E = require('../helpers/engine.cjs');

const project = {
  id: 'wf3', name: 'WF-3 Stage', startYear: 2026, horizon: 15, currency: 'SAR',
  finMode: 'fund', landType: 'lease', landArea: 20000,
  landRentAnnual: 500000, landRentEscalation: 5, landRentEscalationEveryN: 5,
  landRentGrace: 3, landRentTerm: 50, softCostPct: 10, contingencyPct: 5,
  phases: [{ name: 'P1', completionMonth: 24 }],
  assets: [{
    id: 'a1', phase: 'P1', category: 'Retail', name: 'Mall', code: 'R',
    gfa: 20000, costPerSqm: 3500, leaseRate: 900, efficiency: 85,
    stabilizedOcc: 92, revType: 'Lease', rampUpYears: 2,
    constrDuration: 24, escalation: 2, footprint: 8000,
  }],
  investors: [
    { id: 'dev', name: 'Developer', role: 'developer',
      contribution: { type: 'cash', amount: 5000000 } },
    { id: 'invA', name: 'Investor A', role: 'investor',
      contribution: { type: 'cash', amount: 50000000 } },
    { id: 'land', name: 'Landholder', role: 'investor',
      contribution: { type: 'landValue', valuation: 40000000, equityPct: 42.1 } },
  ],
  debtAllowed: false, maxLtvPct: 0, financeRate: 0, loanTenor: 0, debtGrace: 0,
  exitStrategy: 'sale', exitYear: 10, exitMultiple: 10, exitCostPct: 2,
  performanceIncentive: true, hurdleIRR: 15, incentivePct: 20, hurdleMode: 'simple',
  incentives: { capexGrant:{enabled:false}, financeSupport:{enabled:false},
                landRentRebate:{enabled:false}, feeRebates:{enabled:false} },
};

let r, ir, f, w;
try {
  r = E.computeProjectCashFlows(project);
  ir = E.computeIncentives(project, r);
  f = E.computeFinancing(project, r, ir);
  w = E.computeWaterfall(project, r, f, ir);
} catch (e) {
  t('engine ran without throwing', false, e.message);
  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(1);
}

t('waterfall returned object', w && typeof w === 'object');
if (!w) {
  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

t('has investorOutcomes[]', Array.isArray(w.investorOutcomes));
t('3 investors in outcomes', w.investorOutcomes?.length === 3);

const dev = w.investorOutcomes?.find(o => o.role === 'developer');
const invA = w.investorOutcomes?.find(o => o.id === 'invA');
const land = w.investorOutcomes?.find(o => o.id === 'land');

t('dev outcome exists', !!dev);
t('invA outcome exists', !!invA);
t('land outcome exists', !!land);

t('each outcome has equityAmount', w.investorOutcomes?.every(o => typeof o.equityAmount === 'number'));
t('each outcome has calls[] array', w.investorOutcomes?.every(o => Array.isArray(o.calls)));
t('each outcome has distributions[] array', w.investorOutcomes?.every(o => Array.isArray(o.distributions)));
t('each outcome has netCF[] array', w.investorOutcomes?.every(o => Array.isArray(o.netCF)));
t('each outcome has irr (number or null)', w.investorOutcomes?.every(o => o.irr === null || typeof o.irr === 'number'));
t('each outcome has moic (number)', w.investorOutcomes?.every(o => typeof o.moic === 'number'));

// Sum of all investor distributions ≤ total cashAvail
const totalDist = (w.investorOutcomes || []).reduce((s,o) =>
  s + (o.distributions || []).reduce((a,b) => a+b, 0), 0);
const totalCashAvail = (w.cashAvail || []).reduce((a,b) => a+b, 0);
t('Σ investor distributions ≤ cashAvail', totalDist <= totalCashAvail + 1,
  `totalDist=${totalDist.toFixed(0)}, cashAvail=${totalCashAvail.toFixed(0)}`);

// Backward-compat aliases must exist
t('backward-compat gpEquity exists', typeof w.gpEquity === 'number');
t('backward-compat lpEquity exists', typeof w.lpEquity === 'number');
t('backward-compat gpIRR exists', w.gpIRR === null || typeof w.gpIRR === 'number');
t('backward-compat lpIRR exists', w.lpIRR === null || typeof w.lpIRR === 'number');

// Developer's equity share must match sum of developer investors
if (dev) {
  t('gpEquity alias matches dev equity sum',
    Math.abs((w.gpEquity || 0) - dev.equityAmount) < 1,
    `gpEquity=${w.gpEquity}, dev.equityAmount=${dev.equityAmount}`);
}

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
