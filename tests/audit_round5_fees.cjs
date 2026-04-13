/**
 * ROUND 5 AUDIT: Fee Basis Calculation
 *
 * Verifies:
 *   1. Each mgmtFeeBase option uses the correct base
 *   2. mgmtFeeCap works as annual cap
 *   3. No fee double-counting
 *   4. Partner land: fundAssets/devCost should include land (devCostInclLand), not buildCostOnly
 *   5. Hybrid: fees apply to fund portion only
 *
 * Run: cd re-dev-modeler && node /tmp/audit_round5_fees.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0;
const t = (name, ok, detail) => {
  if (ok) { pass++; process.stdout.write('.'); }
  else { fail++; process.stdout.write('X'); console.log(`\n  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 1) => Math.abs((a || 0) - (b || 0)) <= tol;
const sum = arr => (arr || []).reduce((a, b) => a + b, 0);

// ── Base project (fund mode, partner land) ──
const basePartnerLand = {
  id: 'r5-test', name: 'R5 Fee Basis', startYear: 2026, horizon: 15, currency: 'SAR',
  landType: 'partner', landValuation: 200_000_000,  // 200M land as equity
  landArea: 100_000, landRentAnnual: 0,
  softCostPct: 5, contingencyPct: 3,
  finMode: 'fund', debtAllowed: false,
  gpPct: 75, lpPct: 25, gpCashPct: 0,
  exitStrategy: 'sale', exitYear: 2035, exitMultiple: 10, exitCostPct: 2,
  prefReturnPct: 10, gpCatchup: true, carryPct: 20, lpProfitSplitPct: null,
  feeTreatment: 'capital', prefAllocation: 'proRata',
  subscriptionFeePct: 0, annualMgmtFeePct: 1.0, mgmtFeeCapAnnual: 0,
  custodyFeeAnnual: 0, developerFeePct: 0, structuringFeePct: 0,
  operatorFeePct: 0, miscExpensePct: 0, auditorFeeAnnual: 0,
  preEstablishmentFee: 0, spvFee: 0, fundStartYear: 0, fundLife: 10,
  activeScenario: 'Base Case',
  incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false }, landRentRebate: { enabled: false }, feeRebates: { enabled: false } },
  assets: [{
    id: 'a1', name: 'Office', type: 'Office', revType: 'Lease',
    gfa: 20_000, efficiency: 80, leaseRate: 1_500, costPerSqm: 3_000,
    constrStart: 0, constrDuration: 24, rampUpYears: 2, stabilizedOcc: 90, escalation: 2,
    phase: 'P1',
  }],
  phases: [{ name: 'P1', completionMonth: 24 }],
};

function run(overrides = {}) {
  const p = { ...basePartnerLand, ...overrides };
  const r = E.computeProjectCashFlows(p);
  const ir = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, ir);
  const w = E.computeWaterfall(p, r, f, ir);
  return { p, r, ir, f, w };
}

console.log('\nROUND 5 AUDIT: FEE BASIS CALCULATION');
console.log('=====================================\n');

// ══════════════════════════════════════════
// A. FINANCING ENGINE: devCostInclLand vs buildCostOnly
// ══════════════════════════════════════════
console.log('[A] Financing basis values for partner land:');
{
  const { f } = run({});
  // Partner land: construction cost (CAPEX) is the buildCostOnly
  // Land (200M) adds to devCostInclLand
  const capex = f.devCostExclLand;
  const land = f.effectiveLandCap;
  const total = f.devCostInclLand;

  t('devCostExclLand = CAPEX only (no land)', capex > 0 && capex < total, `capex=${Math.round(capex/1e6)}M`);
  t('effectiveLandCap = 200M land', near(land, 200_000_000, 1000), `land=${Math.round(land/1e6)}M`);
  t('devCostInclLand = CAPEX + land', near(total, capex + land, 1000), `total=${Math.round(total/1e6)}M capex=${Math.round(capex/1e6)}M land=${Math.round(land/1e6)}M`);
  t('buildCostOnly exported', f.buildCostOnly != null, `bco=${f.buildCostOnly}`);
  t('buildCostOnly = devCostExclLand (no purchase land in capex)', near(f.buildCostOnly, capex, 1000), `bco=${Math.round(f.buildCostOnly/1e6)}M capex=${Math.round(capex/1e6)}M`);

  console.log(`\n  Partner land scenario:`);
  console.log(`    buildCostOnly (CAPEX only):  ${Math.round(f.buildCostOnly/1e6)}M`);
  console.log(`    devCostExclLand (CAPEX):     ${Math.round(f.devCostExclLand/1e6)}M`);
  console.log(`    devCostInclLand (total):     ${Math.round(f.devCostInclLand/1e6)}M`);
  console.log(`    totalEquity:                 ${Math.round(f.totalEquity/1e6)}M`);
}

// ══════════════════════════════════════════
// B. mgmtFeeBase = "equity" → uses totalEquity (includes partner land)
// ══════════════════════════════════════════
console.log('\n[B] mgmtFeeBase="equity" → totalEquity (includes land):');
{
  const { f, w } = run({ mgmtFeeBase: 'equity', annualMgmtFeePct: 1.0 });
  const totalMgmt = sum(w.feeMgmt);
  const feeYears = (w.feeMgmt || []).filter(v => v > 0).length;
  // Annual fee = totalEquity × 1% = ~250M × 1% = ~2.5M/yr
  const expPerYear = f.totalEquity * 0.01;
  const expTotal = expPerYear * feeYears;

  t('equity basis: per-year mgmt = totalEquity × 1%', feeYears > 0 && near(totalMgmt, expTotal, expTotal * 0.05),
    `total=${Math.round(totalMgmt/1e6)}M exp=${Math.round(expTotal/1e6)}M (${feeYears}yrs × ${Math.round(expPerYear/1e3)}k)`);
  t('equity basis: base includes land (>CAPEX)', totalMgmt > 0 && (f.totalEquity > f.buildCostOnly * 1.5),
    `totalEquity=${Math.round(f.totalEquity/1e6)}M vs buildCost=${Math.round(f.buildCostOnly/1e6)}M`);

  console.log(`  annualMgmt(equity basis): ${Math.round(expPerYear/1e6 * 100)/100}M/yr × ${feeYears}yrs = ${Math.round(totalMgmt/1e6)}M`);
}

// ══════════════════════════════════════════
// C. mgmtFeeBase = "fundAssets"/"devCost" → BUG CHECK
//    Comment says: devCostInclLand (total project cost incl land)
//    Current code: uses buildCostOnly (CAPEX only, excludes land)
//    Expected behavior: should use devCostInclLand
// ══════════════════════════════════════════
console.log('\n[C] mgmtFeeBase="fundAssets"/"devCost" basis check:');
{
  const { f, w: wFA } = run({ mgmtFeeBase: 'fundAssets', annualMgmtFeePct: 1.0 });
  const { w: wDC } = run({ mgmtFeeBase: 'devCost', annualMgmtFeePct: 1.0 });
  const feeYears = (wFA.feeMgmt || []).filter(v => v > 0).length;

  const totalFA = sum(wFA.feeMgmt);
  const totalDC = sum(wDC.feeMgmt);

  // Expected: fee on devCostInclLand (incl 200M land) → ~250M × 1% = ~2.5M/yr
  const expOnTotal = f.devCostInclLand * 0.01 * feeYears;
  // Current (buggy): fee on buildCostOnly (CAPEX only, ~50M) → ~50M × 1% = 0.5M/yr
  const expOnCapex = f.buildCostOnly * 0.01 * feeYears;

  console.log(`  fundAssets total mgmt fee: ${Math.round(totalFA/1e6)}M`);
  console.log(`  devCost total mgmt fee:    ${Math.round(totalDC/1e6)}M`);
  console.log(`  Expected (on devCostInclLand ${Math.round(f.devCostInclLand/1e6)}M): ${Math.round(expOnTotal/1e6)}M`);
  console.log(`  Expected (on buildCostOnly ${Math.round(f.buildCostOnly/1e6)}M):   ${Math.round(expOnCapex/1e6)}M`);

  // Check: does "fundAssets" use devCostInclLand (correct) or buildCostOnly (bug)?
  const usesInclLand = near(totalFA, expOnTotal, expOnTotal * 0.05);
  const usesCapexOnly = near(totalFA, expOnCapex, expOnCapex * 0.05);

  if (usesInclLand) {
    t('fundAssets uses devCostInclLand (CORRECT)', true, `total=${Math.round(totalFA/1e6)}M matches devCostInclLand basis`);
  } else if (usesCapexOnly) {
    t('fundAssets uses devCostInclLand (CORRECT)', false,
      `BUG: fundAssets uses buildCostOnly (${Math.round(f.buildCostOnly/1e6)}M) instead of devCostInclLand (${Math.round(f.devCostInclLand/1e6)}M). Partner land 200M excluded from fee basis.`);
  } else {
    t('fundAssets basis check', false, `total=${Math.round(totalFA/1e6)}M — unexpected value`);
  }

  // "devCost" and "fundAssets" should give same result (per comment: "same as fundAssets but explicit")
  t('devCost = fundAssets (same basis per docs)', near(totalDC, totalFA, 1),
    `devCost=${Math.round(totalDC/1e6)}M fundAssets=${Math.round(totalFA/1e6)}M`);
}

// ══════════════════════════════════════════
// D. mgmtFeeBase = "nav"
// ══════════════════════════════════════════
console.log('\n[D] mgmtFeeBase="nav" → starts at totalEquity (includes land):');
{
  const { f, w } = run({ mgmtFeeBase: 'nav', annualMgmtFeePct: 1.0 });
  const totalMgmt = sum(w.feeMgmt);
  const feeYears = (w.feeMgmt || []).filter(v => v > 0).length;

  // NAV proxy = max(equity, equity + cumIncome - cumCapex)
  // In early years (construction): equity - cumCapex < equity → floor = equity
  // NAV-based fee should be ≥ equity-based fee
  const { w: wEq } = run({ mgmtFeeBase: 'equity', annualMgmtFeePct: 1.0 });
  const totalEq = sum(wEq.feeMgmt);

  t('nav basis: total mgmt > 0', totalMgmt > 0, `total=${Math.round(totalMgmt/1e6)}M`);
  t('nav basis: >= equity basis (floor = equity)', totalMgmt >= totalEq - 1, `nav=${Math.round(totalMgmt/1e6)}M eq=${Math.round(totalEq/1e6)}M`);
  console.log(`  nav total: ${Math.round(totalMgmt/1e6)}M vs equity total: ${Math.round(totalEq/1e6)}M`);
}

// ══════════════════════════════════════════
// E. mgmtFeeBase = "deployed"
// ══════════════════════════════════════════
console.log('\n[E] mgmtFeeBase="deployed" → cumulative CAPEX:');
{
  const { f, w } = run({ mgmtFeeBase: 'deployed', annualMgmtFeePct: 1.0 });
  const totalMgmt = sum(w.feeMgmt);
  // deployed = cumCapex × rate — should be much less than equity basis (CAPEX << totalEquity)
  const { w: wEq } = run({ mgmtFeeBase: 'equity', annualMgmtFeePct: 1.0 });
  const totalEq = sum(wEq.feeMgmt);

  t('deployed basis: total mgmt > 0', totalMgmt > 0, `total=${Math.round(totalMgmt/1e6)}M`);
  t('deployed basis: < equity basis (CAPEX < totalEquity)', totalMgmt < totalEq, `deployed=${Math.round(totalMgmt/1e6)}M eq=${Math.round(totalEq/1e6)}M`);
  console.log(`  deployed total: ${Math.round(totalMgmt/1e6)}M vs equity total: ${Math.round(totalEq/1e6)}M`);
}

// ══════════════════════════════════════════
// F. mgmtFeeCap works as annual cap
// ══════════════════════════════════════════
console.log('\n[F] mgmtFeeCap = annual cap:');
{
  const CAP = 500_000; // 500k/yr cap
  const { f, w } = run({ mgmtFeeBase: 'equity', annualMgmtFeePct: 1.0, mgmtFeeCapAnnual: CAP });

  // Every year with mgmt fee should be ≤ cap
  let allCapped = true;
  for (let y = 0; y < w.feeMgmt.length; y++) {
    if (w.feeMgmt[y] > CAP + 1) { allCapped = false; break; }
  }
  t('all feeMgmt[y] <= mgmtFeeCap', allCapped, `cap=${CAP}`);

  // Without cap, fee should exceed 500k (since equity basis >> 50M × 1%)
  const { w: wNoCap } = run({ mgmtFeeBase: 'equity', annualMgmtFeePct: 1.0, mgmtFeeCapAnnual: 0 });
  const maxNoCap = Math.max(...(wNoCap.feeMgmt || [0]));
  t('uncapped fee > cap (cap is binding)', maxNoCap > CAP, `maxUncapped=${Math.round(maxNoCap/1e3)}k cap=${CAP/1e3}k`);

  console.log(`  Cap=${CAP/1e3}k, max uncapped per year=${Math.round(maxNoCap/1e3)}k → cap is ${maxNoCap > CAP ? 'BINDING ✓' : 'NOT binding ✗'}`);
}

// ══════════════════════════════════════════
// G. No double-counting
// ══════════════════════════════════════════
console.log('\n[G] No fee double-counting:');
{
  const { w } = run({ annualMgmtFeePct: 1.0, subscriptionFeePct: 2, custodyFeeAnnual: 100_000, auditorFeeAnnual: 50_000 });

  // fees[y] = sum of all individual schedules
  let ok = true;
  for (let y = 0; y < w.fees.length; y++) {
    const schedSum = (w.feeSub[y]||0) + (w.feeMgmt[y]||0) + (w.feeCustody[y]||0)
      + (w.feeDev[y]||0) + (w.feeStruct[y]||0) + (w.feePreEst[y]||0)
      + (w.feeSpv[y]||0) + (w.feeAuditor[y]||0) + (w.feeOperator[y]||0) + (w.feeMisc[y]||0);
    if (!near(w.fees[y], schedSum, 1)) {
      ok = false;
      console.log(`  fees[${y}]=${Math.round(w.fees[y])} != sum=${Math.round(schedSum)}`);
      break;
    }
  }
  t('fees[y] = sum(all schedules) — no double-count', ok, '');

  // totalFees = sum(fees array)
  const sumFees = sum(w.fees);
  t('totalFees = sum(fees)', near(w.totalFees, sumFees, 1), `total=${Math.round(w.totalFees/1e3)}k sum=${Math.round(sumFees/1e3)}k`);
}

// ══════════════════════════════════════════
// H. Summary for partner land recommendation
// ══════════════════════════════════════════
console.log('\n[H] Partner land fee basis summary:');
{
  const { f } = run({});
  console.log(`  For a partner-land infrastructure fund:`);
  console.log(`    Land contribution (in-kind equity):  ${Math.round(f.effectiveLandCap/1e6)}M`);
  console.log(`    CAPEX (construction only):           ${Math.round(f.buildCostOnly/1e6)}M`);
  console.log(`    Total project cost (devCostInclLand): ${Math.round(f.devCostInclLand/1e6)}M`);
  console.log(`    Total equity (GP+LP, incl land):     ${Math.round(f.totalEquity/1e6)}M`);
  console.log(``);
  console.log(`  Management fee basis options:`);
  console.log(`    "equity"     → ${Math.round(f.totalEquity/1e6)}M (totalEquity = land + CAPEX - debt) — correct for AUM`);
  console.log(`    "fundAssets" → currently uses buildCostOnly (${Math.round(f.buildCostOnly/1e6)}M) → SHOULD be devCostInclLand (${Math.round(f.devCostInclLand/1e6)}M)`);
  console.log(`    "devCost"    → same as fundAssets (documented: should be devCostInclLand)`);
  console.log(`    "nav"        → starts at totalEquity (${Math.round(f.totalEquity/1e6)}M), adjusts with income`);
  console.log(`    "deployed"   → cumulative CAPEX (max ${Math.round(f.buildCostOnly/1e6)}M) — correct for deployed-capital basis`);
  t('recommendation documented', true, '');
}

console.log('\n' + '═'.repeat(50));
console.log(`  ROUND 5 FEE BASIS: ${pass} PASSED | ${fail} FAILED`);
console.log('═'.repeat(50));
if (fail > 0) console.log('\n  Fix needed: "fundAssets"/"devCost" should use f.devCostInclLand, not buildCostOnly');
process.exit(fail > 0 ? 1 : 0);
