/**
 * PART 3 AUDIT: Debt Service Integrity
 * 
 * Independently calculates drawdown, interest, repayment, DSCR
 * from raw project data + capital structure, cross-checks engine.
 *
 * KEY IDENTITIES:
 * - sum(drawdown) = totalDebt
 * - debtBalClose[y] = debtBalOpen[y] + drawdown[y] - repayment[y]
 * - interest[y] = (open + close) / 2 × rate + draw[y] × upfrontFee%
 * - debtService[y] = repayment[y] + interest[y]
 * - debtBalClose[last] = 0 (fully repaid)
 * - DSCR = NOI / debtService
 */
const { computeProjectCashFlows, computeIncentives, computeFinancing } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
function t(cat, name, ok, detail) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(`[${cat}] ${name}: ${detail}`); process.stdout.write('X'); }
}
const EQ = (a, b, tol=1) => Math.abs((a||0) - (b||0)) <= tol;

const base = {
  id:'debt-audit', name:'Debt Audit', startYear:2026, horizon:20, currency:'SAR',
  landType:'lease', landArea:100000, landRentAnnual:5000000, landRentEscalation:5,
  landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:50,
  softCostPct:10, contingencyPct:5, rentEscalation:2,
  activeScenario:'Base Case', customCapexMult:100, customRentMult:100, customDelay:0, customEscAdj:0,
  phases:[{name:'P1', completionMonth:36}],
  assets:[
    {id:'a1', phase:'P1', gfa:40000, revType:'Lease', efficiency:85, leaseRate:800,
     stabilizedOcc:90, costPerSqm:4000, constrDuration:24, rampUpYears:3, escalation:2, footprint:10000},
    {id:'a2', phase:'P1', gfa:20000, revType:'Operating', efficiency:0, leaseRate:0,
     stabilizedOcc:100, costPerSqm:6000, constrDuration:30, rampUpYears:4, escalation:2, opEbitda:25000000, footprint:5000},
  ],
  finMode:'debt', debtAllowed:true, maxLtvPct:60, financeRate:6.5, loanTenor:7, debtGrace:3,
  upfrontFeePct:0.5, repaymentType:'amortizing', debtTrancheMode:'single', graceBasis:'cod',
  capitalizeIDC:false, landCapitalize:true, landCapRate:1000, landCapTo:'gp',
  gpInvestDevFee:false, gpCashInvest:false,
  exitStrategy:'sale', exitYear:2035, exitMultiple:10, exitCostPct:2,
  developerFeePct:10,
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

function run(overrides) {
  const p = {...base, ...overrides};
  const r = computeProjectCashFlows(p);
  const ir = computeIncentives(p, r);
  const f = computeFinancing(p, r, ir);
  return { p, r, ir, f };
}

console.log('PART 3 AUDIT: DEBT SERVICE INTEGRITY');
console.log('=====================================\n');

// ══════════════════════════════════════════
// A. DRAWDOWN FUNDAMENTALS
// ══════════════════════════════════════════
process.stdout.write('[A] Drawdown: ');
{
  const { p, r, f } = run({});
  const h = r.horizon;
  
  // sum(drawdown) = totalDebt
  const sumDraw = f.drawdown.reduce((a,b) => a+b, 0);
  t('A', 'sum(drawdown)=totalDebt', EQ(sumDraw, f.totalDebt), `sum=${sumDraw} total=${f.totalDebt}`);
  
  // Drawdown only during CAPEX years
  for (let y = 0; y < h; y++) {
    if (f.drawdown[y] > 0 && r.consolidated.capex[y] === 0) {
      t('A', 'drawdown only during capex', false, `draw at y=${y} but no capex`);
      break;
    }
  }
  t('A', 'drawdown aligned with capex', true, '');
  
  // Drawdown pro-rata: draw[y]/totalDebt ≈ capex[y]/totalCapex
  for (let y = 0; y < h; y++) {
    if (f.drawdown[y] > 0 && f.totalDebt > 0 && r.consolidated.totalCapex > 0) {
      const drawRatio = f.drawdown[y] / f.totalDebt;
      const capexRatio = r.consolidated.capex[y] / r.consolidated.totalCapex;
      if (Math.abs(drawRatio - capexRatio) > 0.01) {
        t('A', `pro-rata y=${y}`, false, `drawR=${drawRatio.toFixed(4)} capexR=${capexRatio.toFixed(4)}`);
        break;
      }
    }
  }
  t('A', 'drawdown pro-rata with capex', true, '');
  
  // Equity calls = capex - drawdown (per year)
  for (let y = 0; y < h; y++) {
    const expectedEqCall = Math.max(0, r.consolidated.capex[y] - f.drawdown[y]);
    // Note: equityCalls[0] may include landCap, so check y>0 strictly
    if (y > 0 && !EQ(f.equityCalls[y], expectedEqCall)) {
      t('A', `equityCalls[${y}]`, false, `eng=${f.equityCalls[y]} exp=${expectedEqCall}`);
      break;
    }
  }
  t('A', 'equityCalls = capex - drawdown', true, '');
}
console.log('');

// ══════════════════════════════════════════
// B. BALANCE IDENTITY
// ══════════════════════════════════════════
process.stdout.write('[B] Balance: ');
{
  const { f } = run({});
  const h = 20;
  
  // debtBalClose[y] = debtBalOpen[y] + drawdown[y] - repayment[y]
  for (let y = 0; y < h; y++) {
    const expected = f.debtBalOpen[y] + f.drawdown[y] - f.repayment[y];
    if (!EQ(f.debtBalClose[y], expected)) {
      t('B', `balance identity y=${y}`, false, `close=${f.debtBalClose[y]} exp=${expected}`);
      break;
    }
  }
  t('B', 'close = open + draw - repay', true, '');
  
  // debtBalOpen[y] = debtBalClose[y-1]
  for (let y = 1; y < h; y++) {
    if (!EQ(f.debtBalOpen[y], f.debtBalClose[y-1])) {
      t('B', `continuity y=${y}`, false, `open=${f.debtBalOpen[y]} prevClose=${f.debtBalClose[y-1]}`);
      break;
    }
  }
  t('B', 'open[y] = close[y-1]', true, '');
  
  // Final balance = 0 (fully repaid)
  t('B', 'final balance = 0', f.debtBalClose[h-1] < 1, `final=${f.debtBalClose[h-1]}`);
  
  // debtBalOpen[0] = 0
  t('B', 'initial balance = 0', f.debtBalOpen[0] === 0, `initial=${f.debtBalOpen[0]}`);
}
console.log('');

// ══════════════════════════════════════════
// C. INTEREST FORMULA
// ══════════════════════════════════════════
process.stdout.write('[C] Interest: ');
{
  const { p, f } = run({});
  const h = 20;
  const rate = p.financeRate / 100;
  const ufPct = p.upfrontFeePct / 100;
  
  for (let y = 0; y < h; y++) {
    if (f.originalInterest[y] > 0 || f.drawdown[y] > 0) {
      const avgBal = (f.debtBalOpen[y] + f.debtBalClose[y]) / 2;
      const expected = avgBal * rate + f.drawdown[y] * ufPct;
      if (!EQ(f.originalInterest[y], expected, Math.max(1, expected * 0.001))) {
        t('C', `interest formula y=${y}`, false, `eng=${f.originalInterest[y]} exp=${expected}`);
        break;
      }
    }
  }
  t('C', 'interest = avgBal × rate + draw × fee%', true, '');
  
  // debtService = repay + interest
  for (let y = 0; y < h; y++) {
    const expected = f.repayment[y] + f.interest[y];
    if (!EQ(f.debtService[y], expected)) {
      t('C', `debtService y=${y}`, false, `eng=${f.debtService[y]} exp=${expected}`);
      break;
    }
  }
  t('C', 'debtService = repay + interest', true, '');
  
  // totalInterest = sum(interest)
  const sumInt = f.interest.reduce((a,b) => a+b, 0);
  t('C', 'totalInterest = sum', EQ(f.totalInterest, sumInt), `total=${f.totalInterest} sum=${sumInt}`);
}
console.log('');

// ══════════════════════════════════════════
// D. GRACE PERIOD
// ══════════════════════════════════════════
process.stdout.write('[D] Grace: ');
{
  const { f } = run({ graceBasis:'cod' });
  
  // No repayment during grace
  for (let y = 0; y < f.repayStart; y++) {
    if (f.repayment[y] > 0) {
      t('D', 'no repay during grace', false, `repay at y=${y}, repayStart=${f.repayStart}`);
      break;
    }
  }
  t('D', 'no repay during grace (cod)', true, '');
  
  // repayStart = graceStartIdx + grace
  t('D', 'repayStart formula', f.repayStart === f.graceStartIdx + f.grace, `repayStart=${f.repayStart} graceStart=${f.graceStartIdx} grace=${f.grace}`);
}

// firstDraw basis
{
  const { f } = run({ graceBasis:'firstDraw' });
  const firstDrawYear = f.drawdown.findIndex(d => d > 0);
  t('D', 'firstDraw: grace from first draw', f.graceStartIdx === firstDrawYear, `graceStart=${f.graceStartIdx} firstDraw=${firstDrawYear}`);
}
console.log('');

// ══════════════════════════════════════════
// E. AMORTIZING vs BULLET
// ══════════════════════════════════════════
process.stdout.write('[E] Repay Type: ');
{
  // Amortizing: equal annual repayment
  const { f: fA } = run({ repaymentType:'amortizing' });
  const repayYears = fA.repayYears;
  const repayments = fA.repayment.filter(r => r > 0);
  if (repayments.length > 1) {
    const allEqual = repayments.every(r => EQ(r, repayments[0], repayments[0] * 0.01));
    t('E', 'amortizing: equal payments', allEqual, `payments=${repayments.map(r=>r.toFixed(0)).join(',')}`);
  } else {
    t('E', 'amortizing: has payments', repayments.length > 0, `count=${repayments.length}`);
  }
  
  // Bullet: all repayment in one year
  const { f: fB } = run({ repaymentType:'bullet' });
  const bulletPayments = fB.repayment.filter(r => r > 0);
  t('E', 'bullet: one payment', bulletPayments.length === 1, `count=${bulletPayments.length}`);
  if (bulletPayments.length === 1) {
    t('E', 'bullet: full amount', EQ(bulletPayments[0], fB.totalDebt), `payment=${bulletPayments[0]} debt=${fB.totalDebt}`);
  }
}
console.log('');

// ══════════════════════════════════════════
// F. DSCR
// ══════════════════════════════════════════
process.stdout.write('[F] DSCR: ');
{
  const { r, f } = run({});
  const h = r.horizon;
  const adjLR = r.consolidated.landRent; // no incentives in test
  
  for (let y = 0; y < h; y++) {
    if (f.debtService[y] > 0) {
      const noi = r.consolidated.income[y] - adjLR[y];
      const expectedDSCR = noi / f.debtService[y];
      if (f.dscr[y] === null || Math.abs(f.dscr[y] - expectedDSCR) > 0.01) {
        t('F', `DSCR y=${y}`, false, `eng=${f.dscr[y]} exp=${expectedDSCR.toFixed(4)}`);
        break;
      }
    } else if (f.dscr[y] !== null) {
      t('F', `DSCR null when no DS y=${y}`, false, `dscr=${f.dscr[y]} but DS=0`);
      break;
    }
  }
  t('F', 'DSCR = NOI / debtService', true, '');
}
console.log('');

// ══════════════════════════════════════════
// G. EXIT BALLOON
// ══════════════════════════════════════════
process.stdout.write('[G] Exit Balloon: ');
{
  // Exit before debt maturity → balloon
  const { p, f } = run({ exitYear:2032, loanTenor:10, debtGrace:3 });
  const exitIdx = 2032 - 2026;
  
  // Balance should be 0 at exit year
  t('G', 'balance=0 at exit', f.debtBalClose[exitIdx] < 1, `balance=${f.debtBalClose[exitIdx]}`);
  
  // Post-exit: all zero
  let postExitClean = true;
  for (let y = exitIdx + 1; y < 20; y++) {
    if (f.debtBalOpen[y] > 0 || f.debtBalClose[y] > 0 || f.drawdown[y] > 0 || f.repayment[y] > 0) {
      postExitClean = false;
      break;
    }
  }
  t('G', 'post-exit all zero', postExitClean, '');
}
console.log('');

// ══════════════════════════════════════════
// H. PER-PHASE DEBT
// ══════════════════════════════════════════
process.stdout.write('[H] Per-Phase: ');
{
  const p3 = {...base, finMode:'fund', vehicleType:'fund',
    phases:[{name:'P1',completionMonth:36},{name:'P2',completionMonth:48}],
    assets:[
      ...base.assets,
      {id:'a3',phase:'P2',gfa:24000,revType:'Lease',efficiency:90,leaseRate:900,stabilizedOcc:85,costPerSqm:3000,constrDuration:24,rampUpYears:3,escalation:2,footprint:4000},
    ],
    prefReturnPct:15, gpCatchup:true, carryPct:30, lpProfitSplitPct:70,
    feeTreatment:'capital', prefAllocation:'proRata', catchupMethod:'perYear',
    subscriptionFeePct:2, annualMgmtFeePct:1.5, custodyFeeAnnual:100000,
  };
  const r = computeProjectCashFlows(p3);
  const ir = computeIncentives(p3, r);
  const { computeIndependentPhaseResults } = require('./helpers/engine.cjs');
  const res = computeIndependentPhaseResults(p3, r, ir);
  const h = r.horizon;
  
  // Per-phase: balance identities hold
  for (const [pName, pf] of Object.entries(res.phaseFinancings)) {
    for (let y = 0; y < h; y++) {
      const expected = pf.debtBalOpen[y] + pf.drawdown[y] - pf.repayment[y];
      if (!EQ(pf.debtBalClose[y], expected)) {
        t('H', `${pName} balance y=${y}`, false, `close=${pf.debtBalClose[y]} exp=${expected}`);
        break;
      }
    }
    t('H', `${pName} balance identity`, true, '');
    t('H', `${pName} sum(draw)=totalDebt`, EQ(pf.drawdown.reduce((a,b)=>a+b,0), pf.totalDebt), '');
  }
  
  // Consolidated = sum of phases
  const cf = res.consolidatedFinancing;
  for (let y = 0; y < h; y++) {
    const phaseDrawSum = Object.values(res.phaseFinancings).reduce((s,pf) => s + pf.drawdown[y], 0);
    if (!EQ(cf.drawdown[y], phaseDrawSum)) {
      t('H', `cons drawdown[${y}]`, false, `cons=${cf.drawdown[y]} sum=${phaseDrawSum}`);
      break;
    }
  }
  t('H', 'cons drawdown = sum(phases)', true, '');
}
console.log('');

// ══════════════════════════════════════════
// I. SELF MODE: NO DEBT
// ══════════════════════════════════════════
process.stdout.write('[I] Self Mode: ');
{
  const { f } = run({ finMode:'self' });
  t('I', 'totalDebt=0', f.totalDebt === 0, `totalDebt=${f.totalDebt}`);
  t('I', 'totalInterest=0', f.totalInterest === 0, `totalInterest=${f.totalInterest}`);
  t('I', 'all drawdown=0', f.drawdown.every(d => d === 0), '');
  t('I', 'all repayment=0', f.repayment.every(r => r === 0), '');
}
console.log('');

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  PART 3 AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log('═'.repeat(50));
if (failed > 0) { console.log('\n❌ FAILURES:'); issues.forEach(i => console.log(`  ${i}`)); }
console.log('');
process.exit(failed > 0 ? 1 : 0);
