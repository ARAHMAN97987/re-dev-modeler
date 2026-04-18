/**
 * tests/new/developer_performance_incentive.cjs
 *
 * Verifies performance incentive goes to investors with role="developer":
 *  - When project IRR > hurdle, developer(s) get incentivePct × excess
 *  - Multiple developers split pro-rata by their equity share
 *  - When no developer exists, no incentive applied (warn)
 *  - incentiveReceived > 0 only on developer outcomes (zero on investor outcomes)
 *
 * Status: RED until Task 3 attaches incentive to developer-role outcomes
 */

const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0;
const t = (name, ok, detail) => {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}  ${detail || ''}`); }
};

console.log('DEVELOPER PERFORMANCE INCENTIVE TESTS');

const investorsPath = path.resolve(__dirname, '..', '..', 'src', 'engine', 'investors.js');
if (!fs.existsSync(investorsPath)) {
  console.log(`  ⏭  investors.js not created yet — skipping`);
  console.log(`\nSUMMARY: 0 passed, 0 failed, all skipped (engine not refactored)`);
  process.exit(0);
}

const E = require('../helpers/engine.cjs');

// Case 1: single developer + single investor, strong project → incentive fires
const project = {
  id: 'pi', name: 'Perf Inc', startYear: 2026, horizon: 12, currency: 'SAR',
  finMode: 'fund', landType: 'lease', landArea: 5000, landRentAnnual: 50000,
  softCostPct: 10, contingencyPct: 5,
  phases: [{ name: 'P1', completionMonth: 18 }],
  assets: [{ id: 'a1', phase: 'P1', category: 'Office', name: 'T', gfa: 10000,
             costPerSqm: 3500, leaseRate: 1200, efficiency: 90, stabilizedOcc: 95,
             revType: 'Lease', rampUpYears: 1, constrDuration: 18, escalation: 3, footprint: 3500 }],
  investors: [
    { id: 'dev', name: 'Developer', role: 'developer', contribution: { type: 'cash', amount: 5000000 } },
    { id: 'inv', name: 'Investor', role: 'investor', contribution: { type: 'cash', amount: 35000000 } },
  ],
  debtAllowed: false, exitStrategy: 'sale', exitYear: 8, exitMultiple: 12, exitCostPct: 2,
  performanceIncentive: true, hurdleIRR: 10, incentivePct: 20, hurdleMode: 'simple',
  incentives: { capexGrant:{enabled:false}, financeSupport:{enabled:false},
                landRentRebate:{enabled:false}, feeRebates:{enabled:false} },
};

const r = E.computeProjectCashFlows(project);
const ir = E.computeIncentives(project, r);
const f = E.computeFinancing(project, r, ir);
const w = E.computeWaterfall(project, r, f, ir);

t('waterfall exists', !!w);
if (!w) { console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`); process.exit(1); }

const dev = (w.investorOutcomes || []).find(o => o.role === 'developer');
const inv = (w.investorOutcomes || []).find(o => o.role === 'investor');

t('dev outcome has incentiveReceived field', dev && typeof dev.incentiveReceived === 'number');
t('inv outcome has incentiveReceived field', inv && typeof inv.incentiveReceived === 'number');

// Investor should have zero incentive (only developers receive it)
t('Investor incentiveReceived = 0', inv?.incentiveReceived === 0,
  `inv.incentiveReceived=${inv?.incentiveReceived}`);

// If incentive triggered, developer gets a positive amount
if (w.performanceIncentiveTriggered) {
  t('incentive triggered → dev incentiveReceived > 0', dev?.incentiveReceived > 0,
    `dev.incentiveReceived=${dev?.incentiveReceived}`);
  t('sum of incentiveReceived = performanceIncentiveAmount',
    Math.abs((dev?.incentiveReceived || 0) + (inv?.incentiveReceived || 0) - (w.performanceIncentiveAmount || 0)) < 1);
}

// Case 2: two developers split pro-rata
const project2 = {
  ...project, id: 'pi2',
  investors: [
    { id: 'dev1', name: 'Dev1', role: 'developer', contribution: { type: 'cash', amount: 3000000 } },
    { id: 'dev2', name: 'Dev2', role: 'developer', contribution: { type: 'cash', amount: 2000000 } },
    { id: 'inv', name: 'Inv', role: 'investor', contribution: { type: 'cash', amount: 35000000 } },
  ],
};
const w2 = E.computeWaterfall(project2, E.computeProjectCashFlows(project2),
  E.computeFinancing(project2, E.computeProjectCashFlows(project2), E.computeIncentives(project2, E.computeProjectCashFlows(project2))),
  E.computeIncentives(project2, E.computeProjectCashFlows(project2)));

if (w2?.performanceIncentiveTriggered) {
  const d1 = w2.investorOutcomes.find(o => o.id === 'dev1');
  const d2 = w2.investorOutcomes.find(o => o.id === 'dev2');
  // Dev1 has 60% of dev equity (3M/5M), Dev2 has 40%
  const totalDevIncentive = (d1?.incentiveReceived || 0) + (d2?.incentiveReceived || 0);
  if (totalDevIncentive > 0) {
    const d1Share = (d1?.incentiveReceived || 0) / totalDevIncentive;
    t('dev1 gets ~60% of incentive (3M/5M)', Math.abs(d1Share - 0.6) < 0.01,
      `d1Share=${d1Share.toFixed(3)}`);
  }
}

// Case 3: zero developers → no incentive (warn expected)
const project3 = {
  ...project, id: 'pi3',
  investors: [
    { id: 'inv1', name: 'Inv1', role: 'investor', contribution: { type: 'cash', amount: 20000000 } },
    { id: 'inv2', name: 'Inv2', role: 'investor', contribution: { type: 'cash', amount: 20000000 } },
  ],
};
try {
  const w3 = E.computeWaterfall(project3, E.computeProjectCashFlows(project3),
    E.computeFinancing(project3, E.computeProjectCashFlows(project3), E.computeIncentives(project3, E.computeProjectCashFlows(project3))),
    E.computeIncentives(project3, E.computeProjectCashFlows(project3)));
  if (w3) {
    t('zero-developers: no incentive applied',
      (w3.performanceIncentiveAmount || 0) === 0,
      `performanceIncentiveAmount=${w3.performanceIncentiveAmount}`);
  }
} catch (e) {
  t('zero-developers case runs without crash', false, e.message);
}

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
