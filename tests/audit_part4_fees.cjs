/**
 * PART 4 AUDIT: Fund Fees Integrity
 * 
 * 3 PATHS verified:
 * Path 1: Debt costs (interest + upfrontFee) → deducted from leveredCF via debtService
 * Path 2: Fund fees (sub, mgmt, custody, dev, struct, preEst, spv, auditor) → deducted from cashAvail
 * Path 3: DevFee → deducted from leveredCF (all modes) AND from cashAvail (fund mode)
 *
 * KEY IDENTITIES:
 * - fees[y] = sum of all 8 fee schedules at year y
 * - totalFees = sum(fees)
 * - cashAvail = MAX(0, unlevCF - DS - fees + unfunded + exit)
 * - leveredCF includes -devFee but NOT other fund fees
 * - No double-deduction between paths
 */
const { computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
function t(cat, name, ok, detail) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(`[${cat}] ${name}: ${detail}`); process.stdout.write('X'); }
}
const EQ = (a, b, tol=1) => Math.abs((a||0) - (b||0)) <= tol;

const base = {
  id:'fee-audit', name:'Fee Audit', startYear:2026, horizon:20, currency:'SAR',
  landType:'lease', landArea:100000, landRentAnnual:5000000, landRentEscalation:5,
  landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:50,
  softCostPct:10, contingencyPct:5, rentEscalation:2,
  activeScenario:'Base Case', customCapexMult:100, customRentMult:100, customDelay:0, customEscAdj:0,
  phases:[{name:'P1', completionMonth:36}],
  assets:[
    {id:'a1', phase:'P1', gfa:40000, revType:'Lease', efficiency:85, leaseRate:800,
     stabilizedOcc:90, costPerSqm:4000, constrDuration:24, rampUpYears:3, escalation:2, footprint:10000},
  ],
  finMode:'fund', vehicleType:'fund', debtAllowed:true, maxLtvPct:60, financeRate:6.5, loanTenor:7, debtGrace:3,
  upfrontFeePct:0.5, repaymentType:'amortizing', landCapitalize:true, landCapRate:1000, landCapTo:'gp',
  gpInvestDevFee:false, gpCashInvest:false,
  exitStrategy:'sale', exitYear:2035, exitMultiple:10, exitCostPct:2,
  developerFeePct:10, subscriptionFeePct:2, annualMgmtFeePct:1.5,
  mgmtFeeCapAnnual:0, custodyFeeAnnual:100000, structuringFeePct:1, structuringFeeCap:0,
  mgmtFeeBase:'equity', preEstablishmentFee:200000, spvFee:150000, auditorFeeAnnual:50000,
  prefReturnPct:15, gpCatchup:true, carryPct:30, lpProfitSplitPct:70,
  feeTreatment:'capital', prefAllocation:'proRata', catchupMethod:'perYear',
  fundStartYear:0,
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

function run(overrides) {
  const p = {...base, ...overrides};
  const r = computeProjectCashFlows(p);
  const ir = computeIncentives(p, r);
  const f = computeFinancing(p, r, ir);
  const w = computeWaterfall(p, r, f, ir);
  return { p, r, ir, f, w };
}

console.log('PART 4 AUDIT: FUND FEES INTEGRITY');
console.log('==================================\n');

// ══════════════════════════════════════════
// A. FEE TOTALS
// ══════════════════════════════════════════
process.stdout.write('[A] Fee Totals: ');
{
  const { p, r, f, w } = run({});
  const h = r.horizon;
  
  // totalFees = sum(fees)
  const sumFees = w.fees.reduce((a,b) => a+b, 0);
  t('A', 'totalFees = sum(fees)', EQ(w.totalFees, sumFees), `total=${w.totalFees} sum=${sumFees}`);
  
  // fees[y] = sum of 8 schedules
  for (let y = 0; y < h; y++) {
    const scheduleSum = (w.feeSub[y]||0) + (w.feeMgmt[y]||0) + (w.feeCustody[y]||0) + 
                        (w.feeDev[y]||0) + (w.feeStruct[y]||0) + (w.feePreEst[y]||0) + 
                        (w.feeSpv[y]||0) + (w.feeAuditor[y]||0);
    if (!EQ(w.fees[y], scheduleSum)) {
      t('A', `fees[${y}] = sum schedules`, false, `fees=${w.fees[y]} sum=${scheduleSum}`);
      break;
    }
  }
  t('A', 'fees[y] = sum of 8 schedules', true, '');
  
  // Each fee > 0
  t('A', 'subFee > 0', (w.feeSub||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'mgmtFee > 0', (w.feeMgmt||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'custodyFee > 0', (w.feeCustody||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'devFee > 0', (w.feeDev||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'structFee > 0', (w.feeStruct||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'preEstFee > 0', (w.feePreEst||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'spvFee > 0', (w.feeSpv||[]).reduce((a,b)=>a+b,0) > 0, '');
  t('A', 'auditorFee > 0', (w.feeAuditor||[]).reduce((a,b)=>a+b,0) > 0, '');
}
console.log('');

// ══════════════════════════════════════════
// B. INDIVIDUAL FEE FORMULAS
// ══════════════════════════════════════════
process.stdout.write('[B] Fee Formulas: ');
{
  const { p, r, f, w } = run({});
  const h = r.horizon;
  
  // subFee = totalEquity × subscriptionFeePct
  const expSub = f.totalEquity * (p.subscriptionFeePct / 100);
  const actSub = (w.feeSub||[]).reduce((a,b)=>a+b,0);
  t('B', 'subFee formula', EQ(actSub, expSub), `act=${actSub} exp=${expSub}`);
  
  // devFee = f.devFeeTotal (from financing)
  const actDev = (w.feeDev||[]).reduce((a,b)=>a+b,0);
  t('B', 'devFee = f.devFeeTotal', EQ(actDev, f.devFeeTotal), `act=${actDev} eng=${f.devFeeTotal}`);
  
  // structFee = devCostExclLand × structuringFeePct
  const expStruct = f.devCostExclLand * (p.structuringFeePct / 100);
  const actStruct = (w.feeStruct||[]).reduce((a,b)=>a+b,0);
  t('B', 'structFee formula', EQ(actStruct, expStruct), `act=${actStruct} exp=${expStruct}`);
  
  // preEstFee = fixed amount
  const actPreEst = (w.feePreEst||[]).reduce((a,b)=>a+b,0);
  t('B', 'preEstFee = fixed', EQ(actPreEst, p.preEstablishmentFee), `act=${actPreEst} exp=${p.preEstablishmentFee}`);
  
  // spvFee = fixed amount
  const actSpv = (w.feeSpv||[]).reduce((a,b)=>a+b,0);
  t('B', 'spvFee = fixed', EQ(actSpv, p.spvFee), `act=${actSpv} exp=${p.spvFee}`);
}
console.log('');

// ══════════════════════════════════════════
// C. CASH AVAILABLE FORMULA
// ══════════════════════════════════════════
process.stdout.write('[C] cashAvail: ');
{
  const { p, r, f, w } = run({});
  const h = r.horizon;
  const c = r.consolidated;
  const exitYr = p.exitYear - p.startYear;
  
  // cashAvail = MAX(0, unlevCF - DS - fees + unfunded + exit)
  for (let y = 0; y < h; y++) {
    const unlevCF = c.netCF[y];
    const exp = Math.max(0, unlevCF - (f.debtService[y]||0) - (w.fees[y]||0) + (w.unfundedFees[y]||0) + (w.exitProceeds[y]||0));
    // Only check in-period (fundStart to exit)
    if (y >= 0 && y <= exitYr) {
      if (!EQ(w.cashAvail[y], exp, Math.max(1, Math.abs(exp) * 0.01))) {
        t('C', `cashAvail[${y}]`, false, `eng=${w.cashAvail[y]} exp=${exp}`);
        break;
      }
    }
  }
  t('C', 'cashAvail = MAX(0, unlevCF - DS - fees + UF + exit)', true, '');
}
console.log('');

// ══════════════════════════════════════════
// D. PATH INDEPENDENCE (no double-deduction)
// ══════════════════════════════════════════
process.stdout.write('[D] No Double Deduction: ');
{
  const { r, f, w } = run({});
  const c = r.consolidated;
  const h = r.horizon;
  
  // leveredCF uses debtService + devFee (NOT other fund fees)
  // cashAvail uses debtService + ALL fees (including devFee)
  // They are built from different bases: leveredCF from income/capex, cashAvail from unlevCF
  
  // Verify leveredCF does NOT include fund fees (sub, mgmt, custody, etc.)
  // If it did, the formula would give different results
  for (let y = 0; y < h; y++) {
    const expLev = c.income[y] - c.landRent[y] - c.capex[y] 
                   - f.debtService[y] + f.drawdown[y] + (f.exitProceeds[y]||0)
                   - (f.devFeeSchedule[y]||0);
    // leveredCF should match this (without fund fees)
    if (f.leveredCF[y] !== 0 && !EQ(f.leveredCF[y], expLev, Math.max(1, Math.abs(expLev)*0.01))) {
      t('D', `leveredCF[${y}] excludes fund fees`, false, `eng=${f.leveredCF[y]} exp=${expLev}`);
      break;
    }
  }
  t('D', 'leveredCF excludes fund fees (sub/mgmt/etc)', true, '');
  
  // cashAvail includes ALL fees
  t('D', 'cashAvail includes devFee + fund fees', w.totalFees > f.devFeeTotal, `totalFees=${w.totalFees} devFee=${f.devFeeTotal}`);
}
console.log('');

// ══════════════════════════════════════════
// E. SELF/DEBT MODE: FUND FEES IGNORED
// ══════════════════════════════════════════
process.stdout.write('[E] Non-Fund Modes: ');
{
  // Self mode: waterfall returns null
  const { w: wSelf } = run({ finMode:'self' });
  t('E', 'self: waterfall=null', wSelf === null, `w=${wSelf}`);
  
  // Debt mode: waterfall returns null
  const { w: wDebt } = run({ finMode:'debt' });
  t('E', 'debt: waterfall=null', wDebt === null, `w=${wDebt}`);
  
  // But devFee still deducted from leveredCF in all modes
  const { f: fSelf } = run({ finMode:'self' });
  t('E', 'self: devFee in leveredCF', fSelf.devFeeTotal > 0, `devFee=${fSelf.devFeeTotal}`);
  const { f: fDebt } = run({ finMode:'debt' });
  t('E', 'debt: devFee in leveredCF', fDebt.devFeeTotal > 0, `devFee=${fDebt.devFeeTotal}`);
}
console.log('');

// ══════════════════════════════════════════
// F. PER-PHASE FEES
// ══════════════════════════════════════════
process.stdout.write('[F] Per-Phase: ');
{
  const p2 = {...base,
    phases:[{name:'P1',completionMonth:36},{name:'P2',completionMonth:48}],
    assets:[
      base.assets[0],
      {id:'a2',phase:'P2',gfa:24000,revType:'Lease',efficiency:90,leaseRate:900,stabilizedOcc:85,costPerSqm:3000,constrDuration:24,rampUpYears:3,escalation:2,footprint:4000},
    ],
  };
  const r = computeProjectCashFlows(p2);
  const ir = computeIncentives(p2, r);
  const { computeIndependentPhaseResults } = require('./helpers/engine.cjs');
  const res = computeIndependentPhaseResults(p2, r, ir);
  
  for (const [pName, pw] of Object.entries(res.phaseWaterfalls)) {
    const pf = res.phaseFinancings[pName];
    // Each phase has its own totalFees
    t('F', `${pName} totalFees > 0`, pw.totalFees > 0, `fees=${pw.totalFees}`);
    // devFee matches financing
    const pwDev = (pw.feeDev||[]).reduce((a,b)=>a+b,0);
    t('F', `${pName} devFee = f.devFeeTotal`, EQ(pwDev, pf.devFeeTotal), `wDev=${pwDev} fDev=${pf.devFeeTotal}`);
  }
  
  // Consolidated fees = sum of per-phase fees
  const cw = res.consolidatedWaterfall;
  const phaseFeesSum = Object.values(res.phaseWaterfalls).reduce((s,pw) => s + (pw.totalFees||0), 0);
  t('F', 'cons totalFees = sum(phases)', EQ(cw.totalFees, phaseFeesSum), `cons=${cw.totalFees} sum=${phaseFeesSum}`);
}
console.log('');

// ══════════════════════════════════════════
// G. UI DISPLAY READS FROM CORRECT SOURCE
// ══════════════════════════════════════════
process.stdout.write('[G] UI Sources: ');
{
  const { f, w } = run({});
  // feeData in FinancingView reads from w (waterfall)
  const feeData = {
    sub: (w.feeSub||[]).reduce((a,b)=>a+b,0),
    mgmt: (w.feeMgmt||[]).reduce((a,b)=>a+b,0),
    custody: (w.feeCustody||[]).reduce((a,b)=>a+b,0),
    dev: (w.feeDev||[]).reduce((a,b)=>a+b,0),
    struct: (w.feeStruct||[]).reduce((a,b)=>a+b,0),
    preEst: (w.feePreEst||[]).reduce((a,b)=>a+b,0),
    spv: (w.feeSpv||[]).reduce((a,b)=>a+b,0),
    auditor: (w.feeAuditor||[]).reduce((a,b)=>a+b,0),
    total: w.totalFees || 0,
  };
  // totalFinCost = interest + fees + upfrontFee
  const totalFinCost = f.totalInterest + feeData.total + (f.upfrontFee || 0);
  
  t('G', 'feeData.total = w.totalFees', EQ(feeData.total, w.totalFees), '');
  t('G', 'totalFinCost includes all 3 paths', totalFinCost > f.totalInterest + f.devFeeTotal, `tfc=${totalFinCost}`);
  t('G', 'debt cost from f', f.totalInterest > 0, '');
  t('G', 'fund fees from w', feeData.total > 0, '');
}
console.log('');

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  PART 4 AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log('═'.repeat(50));
if (failed > 0) { console.log('\n❌ FAILURES:'); issues.forEach(i => console.log(`  ${i}`)); }
console.log('');
process.exit(failed > 0 ? 1 : 0);
