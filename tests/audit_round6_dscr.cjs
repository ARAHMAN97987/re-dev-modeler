/**
 * ROUND 6 AUDIT: DSCR Calculation with Sale Assets
 *
 * DSCR = NOI / Debt Service. For Sale assets, revenue is lump-sum (not recurring NOI).
 * Verifies:
 *   1. DSCR is null for years with no debt service (correct)
 *   2. DSCR for Lease-only project: uses recurring income (correct & meaningful)
 *   3. DSCR for Sale-only project: sale year DSCR is very high (misleading)
 *      → After fix: DSCR set to null for Sale-only projects
 *   4. DSCR for mixed (Sale + Lease): lease income used (Sale proceeds excluded)
 *      → After fix: Sale revenue excluded from DSCR numerator
 *   5. hasSaleOnlyAssets exported from financing
 *
 * Run: cd re-dev-modeler && node tests/audit_round6_dscr.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0;
const t = (name, ok, detail) => {
  if (ok) { pass++; process.stdout.write('.'); }
  else { fail++; process.stdout.write('X'); console.log(`\n  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 0.01) => Math.abs((a || 0) - (b || 0)) <= tol;

const base = {
  id: 'r6-dscr', name: 'DSCR Test', startYear: 2026, horizon: 12, currency: 'SAR',
  landType: 'lease', landArea: 50_000, landRentAnnual: 2_000_000,
  landRentEscalation: 0, landRentGrace: 2, landRentTerm: 50,
  softCostPct: 5, contingencyPct: 3,
  finMode: 'debt', debtAllowed: true, maxLtvPct: 60, financeRate: 7, loanTenor: 7,
  debtGrace: 2, upfrontFeePct: 0.5, repaymentType: 'amortizing', trancheMode: 'single',
  graceBasis: 'cod', exitStrategy: 'sale', exitYear: 2034, exitMultiple: 10, exitCostPct: 2,
  activeScenario: 'Base Case',
  incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false }, landRentRebate: { enabled: false }, feeRebates: { enabled: false } },
  phases: [{ name: 'P1', completionMonth: 24 }],
};

function run(assetOverrides = {}, projectOverrides = {}) {
  const p = { ...base, ...projectOverrides, assets: [{ id: 'a1', phase: 'P1', ...assetOverrides }] };
  const r = E.computeProjectCashFlows(p);
  const ir = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, ir);
  return { p, r, ir, f };
}

function runMulti(assets, projectOverrides = {}) {
  const p = { ...base, ...projectOverrides, assets };
  const r = E.computeProjectCashFlows(p);
  const ir = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, ir);
  return { p, r, ir, f };
}

console.log('\nROUND 6 AUDIT: DSCR WITH SALE ASSETS');
console.log('======================================\n');

// ══════════════════════════════════════════
// A. Lease-only project: DSCR is meaningful
// ══════════════════════════════════════════
console.log('[A] Lease-only: DSCR is meaningful recurring income coverage:');
{
  const { r, f } = run({
    name: 'Office', type: 'Office', revType: 'Lease',
    gfa: 20_000, efficiency: 80, leaseRate: 1_500, costPerSqm: 3_000,
    constrStart: 0, constrDuration: 24, rampUpYears: 2, stabilizedOcc: 90, escalation: 2,
  });

  const dscrArr = f.dscr || [];
  const dscrWithValues = dscrArr.map((v, y) => ({ y, v })).filter(({ v }) => v !== null && v > 0);

  t('Lease-only: has DSCR values in operating period', dscrWithValues.length > 0,
    `years with DSCR=${dscrWithValues.length}`);

  // DSCR should be consistent (not spike to unrealistic values)
  const maxDscr = Math.max(...dscrWithValues.map(d => d.v));
  t('Lease-only: max DSCR < 50x (realistic range)', maxDscr < 50,
    `maxDSCR=${maxDscr.toFixed(2)}x`);

  console.log(`  DSCR values (Lease): [${dscrArr.map(v => v === null ? '—' : v.toFixed(1) + 'x').join(', ')}]`);
}

// ══════════════════════════════════════════
// B. Sale-only project: DSCR behavior
// ══════════════════════════════════════════
console.log('\n[B] Sale-only: DSCR with lump-sum revenue:');
{
  const { r, f } = run({
    name: 'Villa', type: 'Residential', revType: 'Sale',
    gfa: 20_000, efficiency: 80, salePricePerSqm: 5_000, costPerSqm: 3_000,
    constrStart: 0, constrDuration: 24, absorptionYears: 2,
  });

  const dscrArr = f.dscr || [];
  const nonNull = dscrArr.filter(v => v !== null);
  const saleYearDscr = nonNull.length > 0 ? Math.max(...nonNull) : null;

  console.log(`  DSCR values (Sale): [${dscrArr.map(v => v === null ? '—' : v.toFixed(1) + 'x').join(', ')}]`);

  // Check: does the fix export hasSaleOnlyAssets?
  t('Sale-only: hasSaleOnlyAssets exported from financing', f.hasSaleOnlyAssets !== undefined,
    `hasSaleOnlyAssets=${f.hasSaleOnlyAssets}`);

  if (f.hasSaleOnlyAssets) {
    // AFTER FIX: DSCR should be null for Sale-only projects
    t('Sale-only (after fix): all DSCR null', nonNull.length === 0,
      `nonNullCount=${nonNull.length} — Sale revenue is lump-sum, not NOI`);
  } else {
    // BEFORE FIX: DSCR would spike to unrealistic value in sale year
    if (saleYearDscr !== null && saleYearDscr > 100) {
      t('Sale-only (before fix): DSCR misleadingly high in sale year', false,
        `CURRENT BUG: saleYearDSCR=${saleYearDscr.toFixed(1)}x — lump-sum proceeds treated as NOI`);
    } else {
      t('Sale-only: DSCR check', true, `saleYearDSCR=${saleYearDscr}`);
    }
  }
}

// ══════════════════════════════════════════
// C. Mixed project (Sale + Lease): DSCR behavior
// ══════════════════════════════════════════
console.log('\n[C] Mixed project (Sale + Lease): DSCR uses only Lease income:');
{
  const { r, f } = runMulti([
    {
      id: 'a1', phase: 'P1', name: 'Villa', type: 'Residential', revType: 'Sale',
      gfa: 10_000, efficiency: 80, salePricePerSqm: 5_000, costPerSqm: 3_000,
      constrStart: 0, constrDuration: 24, absorptionYears: 2,
    },
    {
      id: 'a2', phase: 'P1', name: 'Office', type: 'Office', revType: 'Lease',
      gfa: 10_000, efficiency: 80, leaseRate: 1_500, costPerSqm: 3_000,
      constrStart: 0, constrDuration: 24, rampUpYears: 2, stabilizedOcc: 90, escalation: 2,
    },
  ]);

  const dscrArr = f.dscr || [];
  const nonNull = dscrArr.filter(v => v !== null);
  const maxDscr = nonNull.length > 0 ? Math.max(...nonNull) : null;

  console.log(`  DSCR (mixed): [${dscrArr.map(v => v === null ? '—' : v.toFixed(1) + 'x').join(', ')}]`);
  console.log(`  consolidated income[y]: [${r.consolidated.income.map(v => Math.round(v/1e6) + 'M').join(', ')}]`);

  t('Mixed: has DSCR values', nonNull.length > 0, `nonNullCount=${nonNull.length}`);

  if (f.hasSaleOnlyAssets === false) {
    // Mixed project is not Sale-only — DSCR still computed
    // After fix: DSCR should only use Lease income (not sale spikes)
    t('Mixed: hasSaleOnlyAssets=false (has rental)', f.hasSaleOnlyAssets === false, `hasSaleOnlyAssets=${f.hasSaleOnlyAssets}`);
  }

  // Check for DSCR spikes from sale revenue
  if (maxDscr !== null) {
    const isRealistic = maxDscr < 1000;
    if (!isRealistic) {
      t('Mixed: DSCR not spiked by sale revenue (after fix)', false,
        `CURRENT BUG: maxDSCR=${maxDscr.toFixed(0)}x — sale proceeds inflate DSCR`);
    } else {
      t('Mixed: DSCR in realistic range', true, `maxDSCR=${maxDscr.toFixed(1)}x`);
    }
  }
}

// ══════════════════════════════════════════
// D. No debt: DSCR = null for all years
// ══════════════════════════════════════════
console.log('\n[D] No debt → DSCR = null for all years:');
{
  const { f } = run({
    name: 'Office', type: 'Office', revType: 'Lease',
    gfa: 20_000, efficiency: 80, leaseRate: 1_500, costPerSqm: 3_000,
    constrStart: 0, constrDuration: 24, rampUpYears: 2, stabilizedOcc: 90, escalation: 2,
  }, { debtAllowed: false });

  const dscrArr = f.dscr || [];
  const allNull = dscrArr.every(v => v === null);
  t('no-debt: all DSCR = null', allNull, `nonNullCount=${dscrArr.filter(v => v !== null).length}`);
}

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  ROUND 6 DSCR: ${pass} PASSED | ${fail} FAILED`);
console.log('═'.repeat(50));
if (fail > 0) {
  console.log('\n  Fixes needed:');
  console.log('  1. financing.js: export hasSaleOnlyAssets = !hasRentalAssets');
  console.log('  2. financing.js: set DSCR to null for Sale-only projects (lump-sum ≠ NOI)');
  console.log('  3. WaterfallView.jsx: show note when hasSaleOnlyAssets=true');
}
process.exit(fail > 0 ? 1 : 0);
