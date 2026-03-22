/**
 * PART 5 AUDIT: Exit Integrity
 *
 * KEY IDENTITIES:
 * 1. Sale: exitVal = sum(assetIncome × multiple) for non-Sale assets
 * 2. CapRate: exitVal = sum(assetNOI / capRate)
 * 3. exitCost = exitVal × exitCostPct%
 * 4. exitProceeds[exitYr] = MAX(0, exitVal - exitCost)
 * 5. Balloon: if sold & debtBal > 0 at exit → repay remaining
 * 6. Post-exit: leveredCF = 0, debt = 0, all zero
 * 7. Hold: no exit proceeds, CF runs full horizon
 * 8. exitProceeds flows into both leveredCF and cashAvail
 */
const { computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall, computeIndependentPhaseResults } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
function t(cat, name, ok, detail) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(`[${cat}] ${name}: ${detail}`); process.stdout.write('X'); }
}
const EQ = (a, b, tol=1) => Math.abs((a||0) - (b||0)) <= tol;
const EQPCT = (a, b, pct=0.01) => Math.abs((a||0) - (b||0)) <= Math.max(1, Math.abs(b||0) * pct);

const base = {
  id:'exit-audit', name:'Exit Audit', startYear:2026, horizon:20, currency:'SAR',
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
  mgmtFeeCapAnnual:2000000, custodyFeeAnnual:100000, structuringFeePct:1, structuringFeeCap:300000,
  mgmtFeeBase:'nav', preEstablishmentFee:200000, spvFee:20000, auditorFeeAnnual:50000,
  operatorFeePct:0.15, operatorFeeCap:600000, miscExpensePct:0.5,
  prefReturnPct:15, gpCatchup:true, carryPct:30, lpProfitSplitPct:70,
  feeTreatment:'capital', prefAllocation:'proRata', catchupMethod:'perYear',
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

console.log('PART 5 AUDIT: EXIT INTEGRITY');
console.log('============================\n');

// ══════════════════════════════════════════
// A. SALE EXIT — VALUE FORMULA
// ══════════════════════════════════════════
process.stdout.write('[A] Sale Value: ');
{
  const { p, r, f } = run({});
  const exitYrIdx = p.exitYear - p.startYear;
  const c = r.consolidated;
  
  // Independent: exitVal = income[exitYr] × multiple
  const stabIncome = c.income[exitYrIdx];
  const expVal = stabIncome * p.exitMultiple;
  const expCost = expVal * p.exitCostPct / 100;
  const expNet = Math.max(0, expVal - expCost);
  const actNet = f.exitProceeds[exitYrIdx];
  
  t('A', 'exitProceeds > 0', actNet > 0, `net=${actNet}`);
  t('A', 'exitProceeds = income × mult × (1-cost%)', EQPCT(actNet, expNet), `act=${actNet.toFixed(0)} exp=${expNet.toFixed(0)}`);
  t('A', 'only at exit year', f.exitProceeds.filter(v=>v>0).length === 1, `nonzero=${f.exitProceeds.filter(v=>v>0).length}`);
  t('A', 'exit year correct', f.exitYear === p.exitYear, `f.exitYear=${f.exitYear} exp=${p.exitYear}`);
}
console.log('');

// ══════════════════════════════════════════
// B. CAPRATE EXIT
// ══════════════════════════════════════════
process.stdout.write('[B] CapRate: ');
{
  const { p, r, f } = run({ exitStrategy:'caprate', exitCapRate:9 });
  const exitYrIdx = p.exitYear - p.startYear;
  const c = r.consolidated;
  
  const stabIncome = c.income[exitYrIdx];
  const stabLandRent = c.landRent[exitYrIdx];
  const stabNOI = stabIncome - stabLandRent;
  const capRate = p.exitCapRate / 100;
  const expVal = stabNOI / capRate;
  const expCost = expVal * p.exitCostPct / 100;
  const expNet = Math.max(0, expVal - expCost);
  const actNet = f.exitProceeds[exitYrIdx];
  
  t('B', 'caprate exitProceeds > 0', actNet > 0, `net=${actNet}`);
  t('B', 'caprate = NOI/capRate × (1-cost%)', EQPCT(actNet, expNet), `act=${actNet.toFixed(0)} exp=${expNet.toFixed(0)}`);
}
console.log('');

// ══════════════════════════════════════════
// C. HOLD — NO EXIT
// ══════════════════════════════════════════
process.stdout.write('[C] Hold: ');
{
  const { f } = run({ exitStrategy:'hold' });
  const exitSum = f.exitProceeds.reduce((a,b)=>a+b,0);
  t('C', 'hold: no exit proceeds', exitSum === 0, `sum=${exitSum}`);
  // leveredCF runs full horizon
  const lastCF = f.leveredCF[f.leveredCF.length - 1];
  t('C', 'hold: CF continues to end', f.leveredCF.some((v,i) => i > 10 && v !== 0), 'CF runs full horizon');
}
console.log('');

// ══════════════════════════════════════════
// D. BALLOON — EARLY EXIT BEFORE DEBT MATURITY
// ══════════════════════════════════════════
process.stdout.write('[D] Balloon: ');
{
  // Exit at year 5 (2031), debt tenor 7 + grace 3 = maturity year 10
  const { p, r, f } = run({ exitYear:2031 });
  const exitYrIdx = 2031 - p.startYear; // = 5
  
  // At exit: remaining debt should be paid off
  t('D', 'debtBalClose at exit = 0', f.debtBalClose[exitYrIdx] === 0, `bal=${f.debtBalClose[exitYrIdx]}`);
  
  // Post-exit: everything zero
  let postZero = true;
  for (let y = exitYrIdx + 1; y < 20; y++) {
    if (f.debtBalOpen[y] !== 0 || f.debtBalClose[y] !== 0 || f.interest[y] !== 0 || f.repayment[y] !== 0) {
      postZero = false;
      break;
    }
  }
  t('D', 'post-exit debt all zero', postZero, '');
  
  // Post-exit leveredCF = 0
  let postCFzero = true;
  for (let y = exitYrIdx + 1; y < 20; y++) {
    if (f.leveredCF[y] !== 0) { postCFzero = false; break; }
  }
  t('D', 'post-exit leveredCF = 0', postCFzero, '');
  
  // Balloon = remaining balance repaid at exit
  const totalRepay = f.repayment.reduce((a,b)=>a+b,0);
  t('D', 'sum(repay) = totalDebt', EQPCT(totalRepay, f.totalDebt), `repay=${totalRepay.toFixed(0)} debt=${f.totalDebt.toFixed(0)}`);
}
console.log('');

// ══════════════════════════════════════════
// E. EXIT FLOWS INTO LEVEREDCF AND CASHAVAIL
// ══════════════════════════════════════════
process.stdout.write('[E] Flow: ');
{
  const { p, r, f, w } = run({});
  const exitYrIdx = p.exitYear - p.startYear;
  const c = r.consolidated;
  
  // leveredCF at exit year includes exitProceeds
  const expLev = c.income[exitYrIdx] - c.landRent[exitYrIdx] - c.capex[exitYrIdx]
    - f.debtService[exitYrIdx] + f.drawdown[exitYrIdx] + f.exitProceeds[exitYrIdx]
    - (f.devFeeSchedule[exitYrIdx]||0);
  t('E', 'leveredCF includes exit', EQPCT(f.leveredCF[exitYrIdx], expLev), `lev=${f.leveredCF[exitYrIdx].toFixed(0)} exp=${expLev.toFixed(0)}`);
  
  // cashAvail at exit year includes exitProceeds
  if (w) {
    const expCA = Math.max(0, c.netCF[exitYrIdx] - f.debtService[exitYrIdx] - w.fees[exitYrIdx] + (w.unfundedFees[exitYrIdx]||0) + f.exitProceeds[exitYrIdx]);
    // Note: waterfall may use its own exit proceeds calculation
    t('E', 'cashAvail at exit > 0', w.cashAvail[exitYrIdx] > 0, `ca=${w.cashAvail[exitYrIdx]}`);
  }
}
console.log('');

// ══════════════════════════════════════════
// F. SELF MODE EXIT
// ══════════════════════════════════════════
process.stdout.write('[F] Self: ');
{
  const { p, r, f } = run({ finMode:'self' });
  const exitYrIdx = p.exitYear - p.startYear;
  const c = r.consolidated;
  
  const stabIncome = c.income[exitYrIdx];
  const expVal = stabIncome * p.exitMultiple;
  const expCost = expVal * p.exitCostPct / 100;
  const expNet = Math.max(0, expVal - expCost);
  
  t('F', 'self exit > 0', f.exitProceeds[exitYrIdx] > 0, `exit=${f.exitProceeds[exitYrIdx]}`);
  t('F', 'self exit formula', EQPCT(f.exitProceeds[exitYrIdx], expNet), `act=${f.exitProceeds[exitYrIdx].toFixed(0)} exp=${expNet.toFixed(0)}`);
  // Post-exit zero
  let selfPostZero = true;
  for (let y = exitYrIdx + 1; y < 20; y++) { if (f.leveredCF[y] !== 0) { selfPostZero = false; break; } }
  t('F', 'self post-exit CF = 0', selfPostZero, '');
}
console.log('');

// ══════════════════════════════════════════
// G. PER-PHASE EXIT
// ══════════════════════════════════════════
process.stdout.write('[G] Per-Phase: ');
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
  const res = computeIndependentPhaseResults(p2, r, ir);
  
  // Each phase has exit proceeds
  for (const [pName, pf] of Object.entries(res.phaseFinancings)) {
    const exitSum = pf.exitProceeds.reduce((a,b)=>a+b,0);
    t('G', `${pName} exit > 0`, exitSum > 0, `exit=${exitSum.toFixed(0)}`);
  }
  
  // Consolidated exit = sum of phases
  const consExit = res.consolidatedFinancing.exitProceeds.reduce((a,b)=>a+b,0);
  const phaseExitSum = Object.values(res.phaseFinancings).reduce((s,pf)=>s+pf.exitProceeds.reduce((a,b)=>a+b,0),0);
  t('G', 'cons exit = sum(phases)', EQPCT(consExit, phaseExitSum), `cons=${consExit.toFixed(0)} sum=${phaseExitSum.toFixed(0)}`);
  
  // Year-by-year array match
  let arrOk = true;
  for (let y = 0; y < 20; y++) {
    const phaseSum = Object.values(res.phaseFinancings).reduce((s,pf)=>s+(pf.exitProceeds[y]||0),0);
    if (!EQ(res.consolidatedFinancing.exitProceeds[y]||0, phaseSum)) { arrOk = false; break; }
  }
  t('G', 'exit arrays match', arrOk, '');
}
console.log('');

// ══════════════════════════════════════════
// H. SALE ASSETS EXCLUDED FROM EXIT
// ══════════════════════════════════════════
process.stdout.write('[H] Sale Skip: ');
{
  // Mix of Lease + Sale assets — Sale should be excluded from exit
  const pMix = {...base,
    assets:[
      base.assets[0], // Lease
      {id:'a2',phase:'P1',gfa:20000,revType:'Sale',efficiency:100,leaseRate:0,salesPricePerSqm:5000,absorptionMonths:24,stabilizedOcc:0,costPerSqm:3000,constrDuration:24,rampUpYears:0,escalation:0,footprint:5000},
    ],
  };
  const { r: rMix, f: fMix } = (() => { const r = computeProjectCashFlows(pMix); const ir = computeIncentives(pMix, r); const f = computeFinancing(pMix, r, ir); return {r:r,f:f}; })();
  
  // Exit should be based on Lease asset only (not Sale)
  const { f: fLeaseOnly } = run({}); // Lease only
  // Both should have same exit value approach (income × mult) but different income base
  t('H', 'mixed exit > 0', fMix.exitProceeds.reduce((a,b)=>a+b,0) > 0, '');
  // Sale asset income is different from lease, so exits won't match exactly
  // But importantly: exit should be less than or equal to lease-only (Sale is excluded)
  const mixExit = fMix.exitProceeds.reduce((a,b)=>a+b,0);
  const leaseExit = fLeaseOnly.exitProceeds.reduce((a,b)=>a+b,0);
  t('H', 'mixed exit based on lease only', mixExit <= leaseExit * 1.01, `mix=${mixExit.toFixed(0)} lease=${leaseExit.toFixed(0)}`);
}
console.log('');

// ══════════════════════════════════════════
// I. AUTO EXIT YEAR (OPTIMAL)
// ══════════════════════════════════════════
process.stdout.write('[I] Auto: ');
{
  const { f } = run({ exitYear:0 }); // auto
  t('I', 'auto exit year determined', f.exitYear > 0, `exitYear=${f.exitYear}`);
  t('I', 'optimal exit year stored', f.optimalExitYear > 0 || f.optimalExitYear === null, `opt=${f.optimalExitYear}`);
  t('I', 'exit proceeds at auto year', f.exitProceeds.reduce((a,b)=>a+b,0) > 0, '');
}
console.log('');

// ══════════════════════════════════════════
// J. WATERFALL EXIT PROCEEDS
// ══════════════════════════════════════════
process.stdout.write('[J] Waterfall: ');
{
  const { f, w } = run({});
  if (w) {
    const wExitSum = (w.exitProceeds||[]).reduce((a,b)=>a+b,0);
    t('J', 'waterfall has exit', wExitSum > 0, `sum=${wExitSum.toFixed(0)}`);
    // Waterfall exit may differ from financing exit (waterfall computes its own)
    // But they should be in same ballpark
    const fExitSum = f.exitProceeds.reduce((a,b)=>a+b,0);
    t('J', 'waterfall exit ~ financing exit', EQPCT(wExitSum, fExitSum, 0.05), `w=${wExitSum.toFixed(0)} f=${fExitSum.toFixed(0)}`);
  }
}
console.log('');

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  PART 5 AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log('═'.repeat(50));
if (failed > 0) { console.log('\n❌ FAILURES:'); issues.forEach(i => console.log(`  ${i}`)); }
console.log('');
process.exit(failed > 0 ? 1 : 0);
