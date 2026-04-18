/**
 * tests/new/no_gp_lp_fields.cjs
 *
 * Regression guard:
 *  - The SOURCE OF TRUTH is `investorOutcomes[]`
 *  - Legacy `gp*`/`lp*` fields may still exist as DERIVED ALIASES (for back-compat)
 *  - But each investor in `investorOutcomes` must carry: id, name, role, contribution,
 *    equityAmount, equityPct, calls[], distributions[], netCF[], totalCalled,
 *    totalDist, netDist, irr, moic, dpi, npv10, npv12, npv14, roc, profitShare, incentiveReceived
 *
 * Status: RED until Task 3 produces investorOutcomes[] with full schema
 */

const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0;
const t = (name, ok, detail) => {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}  ${detail || ''}`); }
};

console.log('NO GP/LP FIELDS (source of truth) TESTS');

const investorsPath = path.resolve(__dirname, '..', '..', 'src', 'engine', 'investors.js');
if (!fs.existsSync(investorsPath)) {
  console.log(`  ⏭  investors.js not created yet — skipping`);
  console.log(`\nSUMMARY: 0 passed, 0 failed, all skipped (engine not refactored)`);
  process.exit(0);
}

const E = require('../helpers/engine.cjs');

const project = {
  id: 'src-of-truth', name: 'SoT', startYear: 2026, horizon: 15, currency: 'SAR',
  finMode: 'fund', landType: 'lease', landArea: 10000,
  landRentAnnual: 100000, softCostPct: 10, contingencyPct: 5,
  phases: [{ name: 'P1', completionMonth: 24 }],
  assets: [{ id: 'a1', phase: 'P1', category: 'Retail', name: 'R', gfa: 10000,
             costPerSqm: 3000, leaseRate: 700, efficiency: 85, stabilizedOcc: 90,
             revType: 'Lease', rampUpYears: 2, constrDuration: 24, escalation: 2, footprint: 4000 }],
  investors: [
    { id: 'dev', name: 'Developer', role: 'developer', contribution: { type: 'cash', amount: 3000000 } },
    { id: 'invA', name: 'Inv A', role: 'investor', contribution: { type: 'cash', amount: 10000000 } },
    { id: 'invB', name: 'Inv B', role: 'investor', contribution: { type: 'cash', amount: 15000000 } },
  ],
  debtAllowed: false, exitStrategy: 'sale', exitYear: 10,
  performanceIncentive: true, hurdleIRR: 15, incentivePct: 20, hurdleMode: 'simple',
  incentives: { capexGrant:{enabled:false}, financeSupport:{enabled:false},
                landRentRebate:{enabled:false}, feeRebates:{enabled:false} },
};

const r = E.computeProjectCashFlows(project);
const ir = E.computeIncentives(project, r);
const f = E.computeFinancing(project, r, ir);
const w = E.computeWaterfall(project, r, f, ir);

t('waterfall exists', !!w);
if (!w) { console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`); process.exit(1); }

// Required shape
t('investorOutcomes is array', Array.isArray(w.investorOutcomes));
t('3 outcomes', w.investorOutcomes?.length === 3);

const required = ['id', 'name', 'role', 'contribution', 'equityAmount', 'equityPct',
                  'calls', 'distributions', 'netCF', 'totalCalled', 'totalDist',
                  'netDist', 'irr', 'moic', 'dpi', 'npv10', 'npv12', 'npv14',
                  'roc', 'profitShare', 'incentiveReceived'];
for (const field of required) {
  const all = (w.investorOutcomes || []).every(o => field in o);
  t(`every outcome has '${field}'`, all);
}

// Aliases must still be derived (derived = matches aggregate of outcomes)
const devOutcomes = (w.investorOutcomes || []).filter(o => o.role === 'developer');
const invOutcomes = (w.investorOutcomes || []).filter(o => o.role === 'investor');

const sumEquity = arr => arr.reduce((s,o) => s + (o.equityAmount || 0), 0);
t('gpEquity = Σ dev equity', Math.abs((w.gpEquity||0) - sumEquity(devOutcomes)) < 1,
  `gpEquity=${w.gpEquity}, sumDev=${sumEquity(devOutcomes)}`);
t('lpEquity = Σ inv equity', Math.abs((w.lpEquity||0) - sumEquity(invOutcomes)) < 1,
  `lpEquity=${w.lpEquity}, sumInv=${sumEquity(invOutcomes)}`);

// Per-year sums
const h = project.horizon;
for (const [aliasKey, role, arrKey] of [
  ['gpDist', 'developer', 'distributions'],
  ['lpDist', 'investor', 'distributions'],
  ['gpNetCF', 'developer', 'netCF'],
  ['lpNetCF', 'investor', 'netCF'],
]) {
  const alias = w[aliasKey] || [];
  const outcomes = (w.investorOutcomes || []).filter(o => o.role === role);
  let ok = true, diff = 0;
  for (let y = 0; y < h; y++) {
    const derivedY = outcomes.reduce((s,o) => s + (o[arrKey]?.[y] || 0), 0);
    const aliasY = alias[y] || 0;
    if (Math.abs(aliasY - derivedY) > 1) { ok = false; diff = Math.abs(aliasY - derivedY); break; }
  }
  t(`${aliasKey}[y] = Σ ${role}.${arrKey}[y]`, ok, `max diff=${diff.toFixed(2)}`);
}

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
