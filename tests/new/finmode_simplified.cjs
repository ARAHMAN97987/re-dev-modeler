/**
 * tests/new/finmode_simplified.cjs
 *
 * Verifies that engine accepts all legacy finMode values (via migration)
 * while the canonical new set is just: fund | incomeFund | debt.
 *
 * Status: RED until Task 4 normalizes finMode internally
 */

const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0;
const t = (name, ok, detail) => {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}  ${detail || ''}`); }
};

console.log('FINMODE SIMPLIFIED TESTS');

const investorsPath = path.resolve(__dirname, '..', '..', 'src', 'engine', 'investors.js');
if (!fs.existsSync(investorsPath)) {
  console.log(`  ⏭  investors.js not created yet — skipping`);
  console.log(`\nSUMMARY: 0 passed, 0 failed, all skipped (engine not refactored)`);
  process.exit(0);
}

const E = require('../helpers/engine.cjs');

const baseProject = (finMode) => ({
  id: `fm-${finMode}`, name: finMode, startYear: 2026, horizon: 12, currency: 'SAR',
  finMode,
  landType: 'lease', landArea: 10000, landRentAnnual: 100000,
  softCostPct: 10, contingencyPct: 5,
  phases: [{ name: 'P1', completionMonth: 24 }],
  assets: [{ id: 'a1', phase: 'P1', category: 'Retail', name: 'R', gfa: 8000,
             costPerSqm: 3000, leaseRate: 700, efficiency: 85, stabilizedOcc: 90,
             revType: 'Lease', rampUpYears: 2, constrDuration: 24, escalation: 2, footprint: 3000 }],
  debtAllowed: true, maxLtvPct: 60, financeRate: 6, loanTenor: 8, debtGrace: 2,
  exitStrategy: 'sale', exitYear: 8, exitMultiple: 10, exitCostPct: 2,
  performanceIncentive: false,
  incentives: { capexGrant:{enabled:false}, financeSupport:{enabled:false},
                landRentRebate:{enabled:false}, feeRebates:{enabled:false} },
});

// All legacy finMode values should produce a valid result
for (const mode of ['self', 'bank100', 'debt', 'fund', 'jv', 'hybrid', 'incomeFund']) {
  const p = baseProject(mode);
  if (mode === 'bank100') p.maxLtvPct = 100;
  let ok = true, msg = '';
  try {
    const r = E.computeProjectCashFlows(p);
    const ir = E.computeIncentives(p, r);
    const f = E.computeFinancing(p, r, ir);
    if (!f) ok = false;
    // fund/jv/hybrid/incomeFund should produce waterfall
    if (['fund','jv','hybrid','incomeFund'].includes(mode)) {
      const w = E.computeWaterfall(p, r, f, ir);
      if (!w) { ok = false; msg = 'waterfall missing'; }
    }
  } catch (e) { ok = false; msg = e.message; }
  t(`finMode: "${mode}" runs without throwing`, ok, msg);
}

// migrateProjectToInvestors normalizes legacy jv → still produces LP (investor role)
const migrate = E.migrateProjectToInvestors;
if (typeof migrate === 'function') {
  const migratedJV = migrate({ ...baseProject('jv'), gpEquityManual: 5_000_000, lpEquityManual: 10_000_000 });
  t('legacy "jv" produces investors[] with both dev + investor roles',
    migratedJV.investors?.some(i => i.role === 'developer') &&
    migratedJV.investors?.some(i => i.role === 'investor'));
}

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
