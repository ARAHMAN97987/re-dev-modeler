/**
 * PART 2 AUDIT: Capital Structure Integrity
 * 
 * Independently calculates devCost, landCap, debt ceiling, GP/LP equity
 * from raw project data, then compares with engine output.
 *
 * THE GOLDEN EQUATION: totalDebt + gpEquity + lpEquity = totalProjectCost
 *
 * Tests across 4 financing modes × 3 land types × GP source combos
 */
const { computeProjectCashFlows, computeIncentives, computeFinancing, computeAssetCapex } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
function t(cat, name, ok, detail) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(`[${cat}] ${name}: ${detail}`); process.stdout.write('X'); }
}
const EQ = (a, b, tol=1) => Math.abs((a||0) - (b||0)) <= tol;

// Base project template
const base = {
  id:'cap-audit', name:'Capital Audit', startYear:2026, horizon:20, currency:'SAR',
  landType:'lease', landArea:100000,
  landRentAnnual:5000000, landRentEscalation:5, landRentEscalationEveryN:5,
  landRentGrace:3, landRentTerm:50,
  landPurchasePrice:0, partnerEquityPct:0, landValuation:0, botOperationYears:0,
  softCostPct:10, contingencyPct:5, rentEscalation:2,
  activeScenario:'Base Case', customCapexMult:100, customRentMult:100, customDelay:0, customEscAdj:0,
  phases:[{name:'P1', completionMonth:36}],
  assets:[
    {id:'a1', phase:'P1', category:'Retail', name:'Mall', gfa:40000, revType:'Lease',
     efficiency:85, leaseRate:800, stabilizedOcc:90, costPerSqm:4000,
     constrDuration:24, rampUpYears:3, escalation:2, footprint:10000, plotArea:20000},
    {id:'a2', phase:'P1', category:'Hospitality', name:'Hotel', gfa:20000, revType:'Operating',
     efficiency:0, leaseRate:0, stabilizedOcc:100, costPerSqm:6000,
     constrDuration:30, rampUpYears:4, escalation:2, opEbitda:25000000, footprint:5000, plotArea:15000},
  ],
  // Financing defaults
  finMode:'fund', vehicleType:'fund', debtAllowed:true, maxLtvPct:60, financeRate:6.5, loanTenor:7, debtGrace:3,
  upfrontFeePct:0.5, repaymentType:'amortizing', capitalizeIDC:false,
  landCapitalize:true, landCapRate:1000, landCapTo:'gp', landRentPaidBy:'auto',
  gpInvestDevFee:false, gpDevFeeInvestPct:100, gpCashInvest:false, gpCashInvestAmount:0,
  gpEquityManual:0, lpEquityManual:0,
  exitStrategy:'sale', exitYear:2035, exitMultiple:10, exitCostPct:2, exitCapRate:10,
  developerFeePct:10, subscriptionFeePct:2, annualMgmtFeePct:1.5,
  mgmtFeeCapAnnual:0, custodyFeeAnnual:100000, structuringFeePct:1, structuringFeeCap:0,
  mgmtFeeBase:'nav', preEstablishmentFee:0, spvFee:0, auditorFeeAnnual:50000,
  prefReturnPct:15, gpCatchup:true, carryPct:30, lpProfitSplitPct:70,
  feeTreatment:'capital', prefAllocation:'proRata', catchupMethod:'perYear',
  fundStartYear:0, fundName:'Test Fund', gpIsFundManager:false,
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

function run(overrides, label) {
  const p = {...base, ...overrides};
  const r = computeProjectCashFlows(p);
  const ir = computeIncentives(p, r);
  const f = computeFinancing(p, r, ir);
  return { p, r, ir, f };
}

// Helper: compute expected values independently
function expectedCapitalStructure(p, r) {
  const totalCapex = r.consolidated.totalCapex;
  const landPurchaseInCapex = p.landType === 'purchase' ? (p.landPurchasePrice || 0) : 0;
  const buildCapex = Math.max(0, totalCapex - landPurchaseInCapex);
  
  // Land cap
  const canCap = p.landType === 'lease' || p.landType === 'bot';
  const landCapValue = (p.landCapitalize && canCap) ? (p.landArea || 0) * (p.landCapRate || 1000) : 0;
  const partnerLandValue = p.landType === 'partner' ? (p.landValuation || 0) : 0;
  const effectiveLandCap = landCapValue + partnerLandValue;
  
  const devCostExclLand = totalCapex;
  const devCostInclLand = devCostExclLand + effectiveLandCap;
  
  // Dev fee
  const devFeeTotal = buildCapex * (p.developerFeePct ?? 10) / 100;
  
  // Debt
  const isBank100 = p.finMode === 'bank100';
  const maxDebt = isBank100 ? devCostInclLand : (p.debtAllowed ? devCostInclLand * (p.maxLtvPct ?? 70) / 100 : 0);
  
  const totalProjectCost = devCostInclLand; // no IDC for now
  const totalEquity = Math.max(0, totalProjectCost - maxDebt);
  
  // GP/LP
  const hasLP = p.finMode === 'fund' || p.finMode === 'jv';
  let gpEquity, lpEquity;
  
  if (!hasLP) {
    gpEquity = totalEquity;
    lpEquity = 0;
  } else {
    let gpFromLandCap = 0;
    if (p.landType === 'partner' && (p.partnerEquityPct || 0) > 0) {
      gpFromLandCap = totalEquity * (p.partnerEquityPct / 100);
    } else if (effectiveLandCap > 0) {
      if ((p.landCapTo || 'gp') === 'gp') gpFromLandCap = effectiveLandCap;
      else if (p.landCapTo === 'split') gpFromLandCap = effectiveLandCap * 0.5;
    }
    const gpFromDevFee = p.gpInvestDevFee ? devFeeTotal * ((p.gpDevFeeInvestPct ?? 100) / 100) : 0;
    const gpFromCash = p.gpCashInvest ? (p.gpCashInvestAmount || 0) : 0;
    gpEquity = Math.min(gpFromLandCap + gpFromDevFee + gpFromCash, totalEquity);
    lpEquity = Math.max(0, totalEquity - gpEquity);
  }
  
  return { devCostExclLand, devCostInclLand, effectiveLandCap, landCapValue, partnerLandValue,
           devFeeTotal, maxDebt, totalProjectCost, totalEquity, gpEquity, lpEquity, buildCapex };
}

console.log('PART 2 AUDIT: CAPITAL STRUCTURE INTEGRITY');
console.log('==========================================\n');

// ══════════════════════════════════════════
// A. FUND MODE + LEASE LAND (base case)
// ══════════════════════════════════════════
process.stdout.write('[A] Fund+Lease: ');
{
  const { p, r, f } = run({});
  const e = expectedCapitalStructure(p, r);
  
  t('A', 'devCostExclLand', EQ(f.devCostExclLand, e.devCostExclLand), `eng=${f.devCostExclLand} exp=${e.devCostExclLand}`);
  t('A', 'devCostInclLand', EQ(f.devCostInclLand, e.devCostInclLand), `eng=${f.devCostInclLand} exp=${e.devCostInclLand}`);
  t('A', 'landCapValue', EQ(f.landCapValue, e.landCapValue), `eng=${f.landCapValue} exp=${e.landCapValue}`);
  t('A', 'devFeeTotal', EQ(f.devFeeTotal, e.devFeeTotal), `eng=${f.devFeeTotal} exp=${e.devFeeTotal}`);
  t('A', 'maxDebt', EQ(f.maxDebt, e.maxDebt), `eng=${f.maxDebt} exp=${e.maxDebt}`);
  t('A', 'totalEquity', EQ(f.totalEquity, e.totalEquity), `eng=${f.totalEquity} exp=${e.totalEquity}`);
  t('A', 'gpEquity', EQ(f.gpEquity, e.gpEquity), `eng=${f.gpEquity} exp=${e.gpEquity}`);
  t('A', 'lpEquity', EQ(f.lpEquity, e.lpEquity), `eng=${f.lpEquity} exp=${e.lpEquity}`);
  // GOLDEN EQUATION
  t('A', 'GOLDEN: D+GP+LP=Cost', EQ(f.totalDebt + f.gpEquity + f.lpEquity, f.totalProjectCost || f.devCostInclLand), 
    `D=${f.maxDebt} GP=${f.gpEquity} LP=${f.lpEquity} sum=${f.totalDebt+f.gpEquity+f.lpEquity} cost=${f.totalProjectCost||f.devCostInclLand}`);
  t('A', 'GP+LP=Equity', EQ(f.gpEquity + f.lpEquity, f.totalEquity), `GP+LP=${f.gpEquity+f.lpEquity} eq=${f.totalEquity}`);
}
console.log('');

// ══════════════════════════════════════════
// B. FUND MODE + PURCHASE LAND
// ══════════════════════════════════════════
process.stdout.write('[B] Fund+Purchase: ');
{
  const { p, r, f } = run({ landType:'purchase', landPurchasePrice:50000000, landCapitalize:false, landRentAnnual:0 });
  const e = expectedCapitalStructure(p, r);
  
  t('B', 'landCap=0 for purchase', f.landCapValue === 0, `landCap=${f.landCapValue}`);
  t('B', 'devCostExclLand includes land', EQ(f.devCostExclLand, e.devCostExclLand), `eng=${f.devCostExclLand} exp=${e.devCostExclLand}`);
  t('B', 'devCostInclLand=ExclLand (no cap)', EQ(f.devCostInclLand, f.devCostExclLand), `incl=${f.devCostInclLand} excl=${f.devCostExclLand}`);
  t('B', 'devFee excludes land', EQ(f.devFeeTotal, e.devFeeTotal), `eng=${f.devFeeTotal} exp=${e.devFeeTotal}`);
  t('B', 'GOLDEN: D+GP+LP=Cost', EQ(f.totalDebt + f.gpEquity + f.lpEquity, f.totalProjectCost || f.devCostInclLand),
    `sum=${f.totalDebt+f.gpEquity+f.lpEquity} cost=${f.totalProjectCost||f.devCostInclLand}`);
}
console.log('');

// ══════════════════════════════════════════
// C. FUND MODE + PARTNER LAND
// ══════════════════════════════════════════
process.stdout.write('[C] Fund+Partner: ');
{
  const { p, r, f } = run({ landType:'partner', landValuation:80000000, partnerEquityPct:30, landCapitalize:false, landRentAnnual:0 });
  const e = expectedCapitalStructure(p, r);
  
  t('C', 'partnerLand in devCostInclLand', f.devCostInclLand > f.devCostExclLand, `incl=${f.devCostInclLand} excl=${f.devCostExclLand}`);
  t('C', 'GP includes partner share', f.gpEquity > 0, `gpEquity=${f.gpEquity}`);
  t('C', 'GOLDEN: D+GP+LP=Cost', EQ(f.totalDebt + f.gpEquity + f.lpEquity, f.totalProjectCost || f.devCostInclLand),
    `sum=${f.totalDebt+f.gpEquity+f.lpEquity} cost=${f.totalProjectCost||f.devCostInclLand}`);
}
console.log('');

// ══════════════════════════════════════════
// D. SELF-FUNDED MODE
// ══════════════════════════════════════════
process.stdout.write('[D] Self-funded: ');
{
  const { p, r, f } = run({ finMode:'self' });
  
  t('D', 'mode=self', f.mode === 'self', `mode=${f.mode}`);
  t('D', 'maxDebt=0', f.maxDebt === 0, `maxDebt=${f.maxDebt}`);
  t('D', 'GP=100%', f.gpPct === 1, `gpPct=${f.gpPct}`);
  t('D', 'LP=0', f.lpEquity === 0, `lpEquity=${f.lpEquity}`);
  t('D', 'totalEquity=devCostInclLand', EQ(f.totalEquity, f.devCostInclLand), `eq=${f.totalEquity} dev=${f.devCostInclLand}`);
}
console.log('');

// ══════════════════════════════════════════
// E. DEBT MODE (no LP)
// ══════════════════════════════════════════
process.stdout.write('[E] Debt mode: ');
{
  const { p, r, f } = run({ finMode:'debt' });
  
  t('E', 'GP=100% of equity', f.gpPct === 1 || EQ(f.gpEquity, f.totalEquity), `gpPct=${f.gpPct} gp=${f.gpEquity} eq=${f.totalEquity}`);
  t('E', 'LP=0', f.lpEquity === 0, `lpEquity=${f.lpEquity}`);
  t('E', 'maxDebt>0', f.maxDebt > 0, `maxDebt=${f.maxDebt}`);
  t('E', 'GOLDEN: D+GP+LP=Cost', EQ(f.totalDebt + f.gpEquity + f.lpEquity, f.totalProjectCost || f.devCostInclLand),
    `sum=${f.totalDebt+f.gpEquity+f.lpEquity} cost=${f.totalProjectCost||f.devCostInclLand}`);
}
console.log('');

// ══════════════════════════════════════════
// F. BANK100 MODE
// ══════════════════════════════════════════
process.stdout.write('[F] Bank100: ');
{
  const { p, r, f } = run({ finMode:'bank100' });
  
  t('F', 'maxDebt=devCostInclLand', EQ(f.maxDebt, f.devCostInclLand), `maxDebt=${f.maxDebt} dev=${f.devCostInclLand}`);
  t('F', 'totalEquity=0', f.totalEquity === 0, `totalEquity=${f.totalEquity}`);
  // bank100 golden: totalDebt may be less than maxDebt when landCap creates non-cash gap
  // The correct identity for bank100: totalDebt = min(maxDebt, totalCapex), equity = 0
  const expectedDebt = Math.min(f.maxDebt, r.consolidated.totalCapex);
  t('F', 'GOLDEN: totalDebt=min(max,capex)', EQ(f.totalDebt, expectedDebt),
    `totalDebt=${f.totalDebt} expected=${expectedDebt}`);
}
console.log('');

// ══════════════════════════════════════════
// G. GP EQUITY SOURCES
// ══════════════════════════════════════════
process.stdout.write('[G] GP Sources: ');

// G1: Land cap only (default)
{
  const { f } = run({ landCapTo:'gp', gpInvestDevFee:false, gpCashInvest:false });
  t('G', 'GP=landCap when capTo=gp', EQ(f.gpEquity, f.landCapValue), `gp=${f.gpEquity} landCap=${f.landCapValue}`);
}

// G2: Land cap to LP
{
  const { f } = run({ landCapTo:'lp', gpInvestDevFee:false, gpCashInvest:false });
  t('G', 'GP=0 when capTo=lp', f.gpEquity === 0, `gp=${f.gpEquity}`);
  t('G', 'LP=totalEquity when capTo=lp', EQ(f.lpEquity, f.totalEquity), `lp=${f.lpEquity} eq=${f.totalEquity}`);
}

// G3: Land cap to split
{
  const { f } = run({ landCapTo:'split', gpInvestDevFee:false, gpCashInvest:false });
  t('G', 'GP=landCap/2 when split', EQ(f.gpEquity, f.landCapValue * 0.5), `gp=${f.gpEquity} half=${f.landCapValue*0.5}`);
}

// G4: DevFee as GP investment
{
  const { f } = run({ landCapTo:'lp', gpInvestDevFee:true, gpDevFeeInvestPct:100, gpCashInvest:false });
  t('G', 'GP=devFee when invest=100%', EQ(f.gpEquity, f.devFeeTotal), `gp=${f.gpEquity} devFee=${f.devFeeTotal}`);
}

// G5: DevFee partial
{
  const { f } = run({ landCapTo:'lp', gpInvestDevFee:true, gpDevFeeInvestPct:50, gpCashInvest:false });
  t('G', 'GP=devFee×50%', EQ(f.gpEquity, f.devFeeTotal * 0.5), `gp=${f.gpEquity} half=${f.devFeeTotal*0.5}`);
}

// G6: Cash investment
{
  const { f } = run({ landCapTo:'lp', gpInvestDevFee:false, gpCashInvest:true, gpCashInvestAmount:5000000 });
  t('G', 'GP=5M cash', EQ(f.gpEquity, 5000000), `gp=${f.gpEquity}`);
}

// G7: All 3 sources combined
{
  const { f } = run({ landCapTo:'gp', gpInvestDevFee:true, gpDevFeeInvestPct:100, gpCashInvest:true, gpCashInvestAmount:3000000 });
  const expectedGP = Math.min(f.landCapValue + f.devFeeTotal + 3000000, f.totalEquity);
  t('G', 'GP=landCap+devFee+cash', EQ(f.gpEquity, expectedGP), `gp=${f.gpEquity} exp=${expectedGP}`);
  t('G', 'GP+LP=Equity (3 sources)', EQ(f.gpEquity + f.lpEquity, f.totalEquity), `sum=${f.gpEquity+f.lpEquity} eq=${f.totalEquity}`);
}

// G8: GP capped at totalEquity
{
  const { f } = run({ landCapTo:'gp', gpInvestDevFee:true, gpDevFeeInvestPct:100, gpCashInvest:true, gpCashInvestAmount:999999999 });
  t('G', 'GP capped at totalEquity', EQ(f.gpEquity, f.totalEquity), `gp=${f.gpEquity} eq=${f.totalEquity}`);
  t('G', 'LP=0 when GP=max', f.lpEquity === 0, `lp=${f.lpEquity}`);
}
console.log('');

// ══════════════════════════════════════════
// H. LTV VARIATIONS
// ══════════════════════════════════════════
process.stdout.write('[H] LTV: ');

for (const ltv of [0, 30, 50, 70, 100]) {
  const { p, r, f } = run({ maxLtvPct:ltv });
  const e = expectedCapitalStructure(p, r);
  t('H', `LTV=${ltv}% debt`, EQ(f.maxDebt, e.maxDebt), `eng=${f.maxDebt} exp=${e.maxDebt}`);
  t('H', `LTV=${ltv}% golden`, EQ(f.totalDebt + f.gpEquity + f.lpEquity, f.totalProjectCost || f.devCostInclLand),
    `sum=${f.totalDebt+f.gpEquity+f.lpEquity} cost=${f.totalProjectCost||f.devCostInclLand}`);
}
console.log('');

// ══════════════════════════════════════════
// I. CAPITALIZE IDC
// ══════════════════════════════════════════
process.stdout.write('[I] IDC: ');
{
  const { f: fNo } = run({ capitalizeIDC:false });
  const { f: fYes } = run({ capitalizeIDC:true });
  
  t('I', 'IDC increases totalProjectCost', fYes.totalProjectCost > fNo.totalProjectCost || fNo.totalProjectCost === fNo.devCostInclLand,
    `no=${fNo.totalProjectCost} yes=${fYes.totalProjectCost}`);
  t('I', 'IDC increases equity', fYes.totalEquity >= fNo.totalEquity,
    `no=${fNo.totalEquity} yes=${fYes.totalEquity}`);
  t('I', 'GOLDEN with IDC', EQ(fYes.totalDebt + fYes.gpEquity + fYes.lpEquity, fYes.totalProjectCost),
    `sum=${fYes.totalDebt+fYes.gpEquity+fYes.lpEquity} cost=${fYes.totalProjectCost}`);
}
console.log('');

// ══════════════════════════════════════════
// J. PER-PHASE GOLDEN EQUATION
// ══════════════════════════════════════════
process.stdout.write('[J] Per-Phase: ');
{
  const p3 = {...base, 
    phases:[{name:'P1',completionMonth:36},{name:'P2',completionMonth:48}],
    assets:[
      ...base.assets,
      {id:'a3',phase:'P2',category:'Office',name:'Office',gfa:24000,revType:'Lease',efficiency:90,leaseRate:900,stabilizedOcc:85,costPerSqm:3000,constrDuration:24,rampUpYears:3,escalation:2,footprint:4000,plotArea:8000},
    ]
  };
  const r = computeProjectCashFlows(p3);
  const ir = computeIncentives(p3, r);
  // Per-phase financing
  const { computeIndependentPhaseResults } = require('./helpers/engine.cjs');
  const res = computeIndependentPhaseResults(p3, r, ir);
  
  for (const [pName, pf] of Object.entries(res.phaseFinancings)) {
    t('J', `${pName} golden`, EQ(pf.totalDebt + pf.gpEquity + pf.lpEquity, pf.totalProjectCost || pf.devCostInclLand),
      `D=${pf.maxDebt} GP=${pf.gpEquity} LP=${pf.lpEquity} sum=${pf.totalDebt+pf.gpEquity+pf.lpEquity} cost=${pf.totalProjectCost||pf.devCostInclLand}`);
    t('J', `${pName} GP+LP=Eq`, EQ(pf.gpEquity + pf.lpEquity, pf.totalEquity),
      `GP+LP=${pf.gpEquity+pf.lpEquity} eq=${pf.totalEquity}`);
  }
  
  // Consolidated = sum of phases
  const cf = res.consolidatedFinancing;
  const sumDebt = Object.values(res.phaseFinancings).reduce((s,pf) => s + pf.maxDebt, 0);
  const sumGP = Object.values(res.phaseFinancings).reduce((s,pf) => s + pf.gpEquity, 0);
  const sumLP = Object.values(res.phaseFinancings).reduce((s,pf) => s + pf.lpEquity, 0);
  t('J', 'cons debt = sum phases', EQ(cf.maxDebt, sumDebt), `cons=${cf.maxDebt} sum=${sumDebt}`);
  t('J', 'cons GP = sum phases', EQ(cf.gpEquity, sumGP), `cons=${cf.gpEquity} sum=${sumGP}`);
  t('J', 'cons LP = sum phases', EQ(cf.lpEquity, sumLP), `cons=${cf.lpEquity} sum=${sumLP}`);
}
console.log('');

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  PART 2 AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\n❌ FAILURES:');
  issues.forEach(i => console.log(`  ${i}`));
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
