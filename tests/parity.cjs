/**
 * PARITY TEST: Legacy (single-block) vs Aggregated (per-phase) financing & waterfall
 * 
 * Runs both computation paths on the same project, compares every numeric field.
 * Purpose: Ensure the per-phase aggregation produces results consistent with
 * the legacy single-block calculation. Known acceptable differences are documented.
 */
const E = require('./helpers/engine.cjs');

let passed = 0, failed = 0, skipped = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === 'skip') { skipped++; return; }
    if (result) { passed++; }
    else { failed++; failures.push(name); console.log(`  ❌ ${name}`); }
  } catch (e) { failed++; failures.push(`${name} (ERROR: ${e.message})`); console.log(`  ❌ ${name} — ${e.message}`); }
}

function approxEq(a, b, tol = 1) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < tol;
}

function arrApproxEq(a, b, tol = 1) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!approxEq(a[i] || 0, b[i] || 0, tol)) return false;
  }
  return true;
}

function pctDiff(a, b) {
  if (a === 0 && b === 0) return 0;
  if (a === 0) return 100;
  return Math.abs(a - b) / Math.abs(a) * 100;
}

// ═══════════════════════════════════════════════════════════
//  TEST SET 1: Single-phase project (legacy = aggregated)
// ═══════════════════════════════════════════════════════════

console.log('\n═══ T1: Single-Phase Fund Project (Legacy ≈ Aggregated) ═══\n');

const p1 = E.defaultProject();
p1.finMode = 'fund';
p1.debtAllowed = true;
p1.maxLtvPct = 60;
p1.financeRate = 7;
p1.loanTenor = 10;
p1.debtGrace = 3;
p1.exitStrategy = 'sale';
p1.exitMultiple = 10;
p1.exitYear = 0; // auto
p1.prefReturnPct = 12;
p1.carryPct = 20;
p1.lpProfitSplitPct = 80;
p1.gpCatchup = true;
p1.subscriptionFeePct = 1;
p1.annualMgmtFeePct = 2;
p1.developerFeePct = 5;
p1.landType = 'lease';
p1.landArea = 50000;
p1.landRentAnnual = 5000000;
p1.landCapitalize = true;
p1.landCapRate = 1200;
p1.phases = [{ name: 'Phase 1', startOffset: 0 }];
p1.assets = [
  { phase: 'Phase 1', category: 'Retail', name: 'Mall A', code: 'MA', gfa: 25000, footprint: 12000, plotArea: 18000,
    revType: 'Lease', efficiency: 80, leaseRate: 1800, escalation: 2, rampUpYears: 2, stabilizedOcc: 92,
    costPerSqm: 4000, constrStart: 1, constrDuration: 36 },
  { phase: 'Phase 1', category: 'Office', name: 'Tower B', code: 'TB', gfa: 15000, footprint: 5000, plotArea: 8000,
    revType: 'Lease', efficiency: 75, leaseRate: 2200, escalation: 1.5, rampUpYears: 3, stabilizedOcc: 88,
    costPerSqm: 5000, constrStart: 1, constrDuration: 30 },
];

const r1 = E.runFullModel(p1);
const leg1 = r1._legacyFinancing;
const agg1 = r1.financing;

// Single phase: legacy and aggregated should be nearly identical
const FIN_SCALARS = ['totalEquity','gpEquity','lpEquity','totalDebt','maxDebt','devCostExclLand','devCostInclLand',
  'landCapValue','upfrontFee','totalInterest','leveredIRR','constrEnd','exitYear','rate','tenor','grace','repayYears','repayStart'];

for (const f of FIN_SCALARS) {
  test(`T1 financing.${f}`, () => approxEq(leg1?.[f], agg1?.[f], f === 'leveredIRR' ? 0.005 : 100));
}

const FIN_ARRAYS = ['drawdown','equityCalls','debtBalOpen','debtBalClose','repayment','interest','debtService','leveredCF','exitProceeds'];
for (const f of FIN_ARRAYS) {
  test(`T1 financing.${f}[]`, () => arrApproxEq(leg1?.[f], agg1?.[f], 100));
}

// Waterfall comparison (single phase)
const legW1 = r1._legacyWaterfall;
const aggW1 = r1.waterfall;

const WF_SCALARS = ['totalEquity','gpEquity','lpEquity','totalFees','lpIRR','gpIRR','lpMOIC','gpMOIC','lpTotalDist','gpTotalDist'];
for (const f of WF_SCALARS) {
  test(`T1 waterfall.${f}`, () => {
    const tol = (f === 'lpIRR' || f === 'gpIRR') ? 0.01 : (f === 'lpMOIC' || f === 'gpMOIC') ? 0.05 : 1000;
    return approxEq(legW1?.[f], aggW1?.[f], tol);
  });
}

const WF_ARRAYS = ['equityCalls','fees','cashAvail','tier1','tier2','tier3','tier4LP','tier4GP','lpDist','gpDist','lpNetCF','gpNetCF'];
for (const f of WF_ARRAYS) {
  test(`T1 waterfall.${f}[]`, () => arrApproxEq(legW1?.[f], aggW1?.[f], 1000));
}

// ═══════════════════════════════════════════════════════════
//  TEST SET 2: Multi-phase project (ZAN-like 3 phases)
// ═══════════════════════════════════════════════════════════

console.log('\n═══ T2: Multi-Phase Fund Project (3 phases) ═══\n');

const p2 = E.defaultProject();
p2.finMode = 'fund';
p2.debtAllowed = true;
p2.maxLtvPct = 65;
p2.financeRate = 6.5;
p2.loanTenor = 8;
p2.debtGrace = 3;
p2.exitStrategy = 'sale';
p2.exitMultiple = 10;
p2.prefReturnPct = 10;
p2.carryPct = 25;
p2.lpProfitSplitPct = 75;
p2.gpCatchup = true;
p2.subscriptionFeePct = 1;
p2.annualMgmtFeePct = 1.75;
p2.developerFeePct = 4;
p2.landType = 'lease';
p2.landArea = 100000;
p2.landRentAnnual = 8000000;
p2.landCapitalize = true;
p2.landCapRate = 1000;
p2.phases = [
  { name: 'ZAN 1', startOffset: 0 },
  { name: 'ZAN 2', startOffset: 2 },
  { name: 'ZAN 3', startOffset: 4 },
];
p2.assets = [
  { phase: 'ZAN 1', category: 'Retail', name: 'Mall', code: 'Z1M', gfa: 20000, footprint: 10000, plotArea: 15000,
    revType: 'Lease', efficiency: 80, leaseRate: 2000, escalation: 2, rampUpYears: 2, stabilizedOcc: 90,
    costPerSqm: 4000, constrStart: 1, constrDuration: 30 },
  { phase: 'ZAN 2', category: 'Office', name: 'Tower', code: 'Z2T', gfa: 18000, footprint: 6000, plotArea: 10000,
    revType: 'Lease', efficiency: 75, leaseRate: 2500, escalation: 1.5, rampUpYears: 3, stabilizedOcc: 85,
    costPerSqm: 5500, constrStart: 3, constrDuration: 36 },
  { phase: 'ZAN 3', category: 'Residential', name: 'Villas', code: 'Z3V', gfa: 12000, footprint: 8000, plotArea: 20000,
    revType: 'Lease', efficiency: 90, leaseRate: 1500, escalation: 1, rampUpYears: 1, stabilizedOcc: 95,
    costPerSqm: 3000, constrStart: 5, constrDuration: 24 },
];

const r2 = E.runFullModel(p2);
const leg2 = r2._legacyFinancing;
const agg2 = r2.financing;

// Multi-phase: aggregated sum of phases vs legacy (single-block over whole project)
// These will differ because per-phase computes debt/equity independently per phase.
// We check that the DIRECTION is same and values are within reasonable range.

test('T2 both paths produce results', () => !!leg2 && !!agg2);
test('T2 totalDebt same direction', () => leg2.totalDebt > 0 && agg2.totalDebt > 0);
test('T2 totalEquity same direction', () => leg2.totalEquity > 0 && agg2.totalEquity > 0);
test('T2 totalDebt within 15%', () => pctDiff(leg2.totalDebt, agg2.totalDebt) < 15);
test('T2 totalEquity within 15%', () => pctDiff(leg2.totalEquity, agg2.totalEquity) < 15);
test('T2 gpEquity > 0 both', () => leg2.gpEquity > 0 && agg2.gpEquity > 0);
test('T2 lpEquity > 0 both', () => leg2.lpEquity > 0 && agg2.lpEquity > 0);
test('T2 leveredIRR both computed', () => leg2.leveredIRR !== null && agg2.leveredIRR !== null);
test('T2 rate inherited (not 0)', () => agg2.rate > 0);
test('T2 tenor inherited (not 0)', () => agg2.tenor > 0);
test('T2 grace inherited (not 0)', () => agg2.grace > 0);
test('T2 repayYears inherited (not 0)', () => agg2.repayYears > 0);
test('T2 repayStart inherited (not 0)', () => agg2.repayStart > 0);
test('T2 exitYear matches', () => approxEq(leg2.exitYear, agg2.exitYear, 2));

// Debt arrays: total debt drawn should be close
test('T2 sum(drawdown) within 15%', () => {
  const legSum = leg2.drawdown.reduce((a, b) => a + b, 0);
  const aggSum = agg2.drawdown.reduce((a, b) => a + b, 0);
  return pctDiff(legSum, aggSum) < 15;
});

// Multi-phase waterfall
const legW2 = r2._legacyWaterfall;
const aggW2 = r2.waterfall;

test('T2 waterfall: both paths produce results', () => !!legW2 && !!aggW2);
test('T2 waterfall: lpIRR both computed', () => legW2.lpIRR !== null && aggW2.lpIRR !== null);
test('T2 waterfall: gpIRR both defined', () => legW2.gpIRR !== undefined && aggW2.gpIRR !== undefined);
test('T2 waterfall: lpMOIC > 0 both', () => legW2.lpMOIC > 0 && aggW2.lpMOIC > 0);
test('T2 waterfall: gpMOIC same sign', () => (legW2.gpMOIC >= 0) === (aggW2.gpMOIC >= 0));
test('T2 waterfall: totalFees within 20%', () => pctDiff(legW2.totalFees, aggW2.totalFees) < 20);
test('T2 waterfall: isFund correct', () => aggW2.isFund === true);

// ═══════════════════════════════════════════════════════════
//  TEST SET 3: Self-funded (no waterfall, no aggregation diff)
// ═══════════════════════════════════════════════════════════

console.log('\n═══ T3: Self-Funded (no waterfall path) ═══\n');

const p3 = E.defaultProject();
p3.finMode = 'self';
p3.exitStrategy = 'sale';
p3.exitMultiple = 8;
p3.phases = [{ name: 'Phase 1', startOffset: 0 }];
p3.assets = [
  { phase: 'Phase 1', category: 'Retail', name: 'Shop', code: 'S1', gfa: 5000, footprint: 5000, plotArea: 8000,
    revType: 'Lease', efficiency: 85, leaseRate: 1500, escalation: 2, rampUpYears: 1, stabilizedOcc: 95,
    costPerSqm: 3000, constrStart: 1, constrDuration: 18 },
];

const r3 = E.runFullModel(p3);
test('T3 self: financing exists', () => !!r3.financing);
test('T3 self: mode = self', () => r3.financing.mode === 'self');
test('T3 self: totalDebt = 0', () => r3.financing.totalDebt === 0);
test('T3 self: waterfall = null', () => r3.waterfall === null);
test('T3 self: leveredIRR computed', () => r3.financing.leveredIRR !== null);

// ═══════════════════════════════════════════════════════════
//  TEST SET 4: Bank100 mode
// ═══════════════════════════════════════════════════════════

console.log('\n═══ T4: Bank 100% Debt ═══\n');

const p4 = E.defaultProject();
p4.finMode = 'bank100';
p4.financeRate = 7;
p4.loanTenor = 10;
p4.debtGrace = 3;
p4.exitStrategy = 'sale';
p4.exitMultiple = 10;
p4.phases = [{ name: 'Phase 1', startOffset: 0 }];
p4.assets = [
  { phase: 'Phase 1', category: 'Office', name: 'Tower', code: 'T1', gfa: 10000, footprint: 5000, plotArea: 8000,
    revType: 'Lease', efficiency: 80, leaseRate: 2000, escalation: 1.5, rampUpYears: 2, stabilizedOcc: 90,
    costPerSqm: 4500, constrStart: 1, constrDuration: 30 },
];

const r4 = E.runFullModel(p4);
const leg4 = r4._legacyFinancing;
const agg4 = r4.financing;
test('T4 bank100: financing exists', () => !!r4.financing);
test('T4 bank100: totalEquity ≈ 0', () => agg4.totalEquity < 100);
test('T4 bank100: gpPct = 1', () => approxEq(agg4.gpPct, 1, 0.001));
test('T4 bank100: totalDebt matches', () => approxEq(leg4.totalDebt, agg4.totalDebt, 100));
test('T4 bank100: waterfall = null', () => r4.waterfall === null);
test('T4 bank100: rate inherited', () => agg4.rate > 0);

// ═══════════════════════════════════════════════════════════
//  TEST SET 5: Per-phase financing fields populated
// ═══════════════════════════════════════════════════════════

console.log('\n═══ T5: Per-Phase Financing Field Verification ═══\n');

const pf = r2.independentPhaseResults?.phaseFinancings || {};
const phaseNames = Object.keys(pf);
test('T5 phaseFinancings has 3 phases', () => phaseNames.length === 3);

for (const pName of phaseNames) {
  const pFin = pf[pName];
  test(`T5 ${pName}: rate > 0`, () => pFin.rate > 0);
  test(`T5 ${pName}: tenor > 0`, () => pFin.tenor > 0);
  test(`T5 ${pName}: grace > 0`, () => pFin.grace > 0);
  test(`T5 ${pName}: repayYears > 0`, () => pFin.repayYears > 0);
  test(`T5 ${pName}: totalDebt > 0`, () => pFin.totalDebt > 0);
}

// ═══════════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════════

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  PARITY TEST: ${passed} PASSED | ${failed} FAILED | ${skipped} SKIPPED`);
console.log(`══════════════════════════════════════════════════`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(failed === 0 ? '  🎉 ALL PARITY TESTS PASSED' : '  ⚠️  SOME PARITY TESTS FAILED');
process.exit(failed === 0 ? 0 : 1);
