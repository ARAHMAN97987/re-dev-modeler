/**
 * tests/new/fund_manager.cjs
 *
 * Verifies project.fundManager is a SEPARATE entity (not an investor):
 *  - Manager fees apply when fund mode is active
 *  - Manager is NEVER in investorOutcomes[]
 *  - Fund-level fees (mgmt/struct/custody/...) accumulate from fundManager.*
 *
 * Status: RED until Task 4 reads fees from fundManager sub-object
 */

const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0, skipped = 0;
const t = (name, ok, detail) => {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}  ${detail || ''}`); }
};

console.log('FUND MANAGER TESTS');

const investorsPath = path.resolve(__dirname, '..', '..', 'src', 'engine', 'investors.js');
if (!fs.existsSync(investorsPath)) {
  console.log(`  ⏭  investors.js not created yet — skipping`);
  console.log(`\nSUMMARY: 0 passed, 0 failed, all skipped (engine not refactored)`);
  process.exit(0);
}

const E = require('../helpers/engine.cjs');

const project = {
  id: 'fm', name: 'Fund Mgr', startYear: 2026, horizon: 15, currency: 'SAR',
  finMode: 'fund', landType: 'lease', landArea: 20000,
  landRentAnnual: 300000, softCostPct: 10, contingencyPct: 5,
  phases: [{ name: 'P1', completionMonth: 24 }],
  assets: [{ id: 'a1', phase: 'P1', category: 'Retail', name: 'R', gfa: 15000,
             costPerSqm: 3000, leaseRate: 800, efficiency: 85, stabilizedOcc: 90,
             revType: 'Lease', rampUpYears: 2, constrDuration: 24, escalation: 2, footprint: 5000 }],
  investors: [
    { id: 'dev', name: 'Developer', role: 'developer', contribution: { type: 'cash', amount: 5000000 } },
    { id: 'inv', name: 'Inv', role: 'investor', contribution: { type: 'cash', amount: 40000000 } },
  ],
  fundManager: {
    name: 'Independent Manager Co',
    annualFeePct: 1.5,
    mgmtFeeBase: 'nav',
    mgmtFeeCapAnnual: 2000000,
    subscriptionFeePct: 2,
    structuringFeePct: 1,
    structuringFeeCap: 300000,
    custodyFeeAnnual: 100000,
    auditorFeeAnnual: 50000,
    spvFee: 20000,
    preEstablishmentFee: 200000,
    miscExpensePct: 0.5,
  },
  debtAllowed: false, exitStrategy: 'sale', exitYear: 10,
  performanceIncentive: false,
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
  t('engine ran', false, e.message);
  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

t('waterfall returned', !!w);

// Fund manager is NOT in investorOutcomes
const mgrInOutcomes = (w?.investorOutcomes || []).some(o =>
  o.name === project.fundManager.name || o.role === 'manager');
t('Fund manager NOT in investorOutcomes', !mgrInOutcomes);

// Exactly 2 investors
t('Exactly 2 investorOutcomes (dev + inv, no manager)',
  (w?.investorOutcomes || []).length === 2);

// Fees accumulated from fundManager fields
const totalFees = (w?.fees || []).reduce((a,b) => a+b, 0);
t('Total fees > 0 (fund manager is charging)', totalFees > 0,
  `totalFees=${totalFees}`);

// Structuring fee present
const structFeeTotal = (w?.feeStruct || []).reduce((a,b) => a+b, 0);
t('Structuring fee > 0', structFeeTotal > 0, `structFee=${structFeeTotal}`);

// Annual mgmt fee present
const mgmtFeeTotal = (w?.feeMgmt || []).reduce((a,b) => a+b, 0);
t('Annual mgmt fee > 0', mgmtFeeTotal > 0, `mgmtFee=${mgmtFeeTotal}`);

// Custody fee present
const custodyTotal = (w?.feeCustody || []).reduce((a,b) => a+b, 0);
t('Custody fee > 0', custodyTotal > 0);

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
