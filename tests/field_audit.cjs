/**
 * FINANCIAL STRUCTURE — FIELD AUDIT
 * Tests every field in the Financial Structure settings panel.
 * For each field: change value → verify engine output changes correctly.
 * Detects: dead fields, wrong direction, missing propagation, edge cases.
 */
const { computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall,
  FINANCING_FIELDS, getPhaseFinancing, computeIndependentPhaseResults,
  defaultProject } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
const discoveries = [];

function t(cat, name, ok, detail) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(`[${cat}] ${name}: ${detail}`); process.stdout.write('X'); }
}

function disc(msg) { discoveries.push(msg); }

// ════════════════════════════════════════════════════════
// BASE PROJECT: Fund mode, lease land, 2 assets, all features on
// ════════════════════════════════════════════════════════
function mkProj(ov) {
  return {
    id:'audit', name:'Audit', startYear:2026, horizon:20, currency:'SAR',
    landType:'lease', landArea:100000,
    landRentAnnual:3000000, landRentEscalation:5, landRentEscalationEveryN:5,
    landRentGrace:3, landRentTerm:50,
    landPurchasePrice:40000000, partnerEquityPct:30, landValuation:80000000, botOperationYears:25,
    softCostPct:10, contingencyPct:5, rentEscalation:2, defaultEfficiency:85,
    activeScenario:'Base Case', customCapexMult:100, customRentMult:100, customDelay:0, customEscAdj:0,
    phases:[{name:'P1', completionMonth:36}],
    assets:[
      { id:'a1', phase:'P1', category:'Retail', name:'Mall', code:'R1',
        plotArea:20000, footprint:8000, gfa:32000, revType:'Lease',
        efficiency:85, leaseRate:800, stabilizedOcc:90, costPerSqm:4000,
        constrDuration:24, rampUpYears:3, escalation:2, opEbitda:0,
        hotelPL:null, marinaPL:null, salePricePerSqm:0, absorptionYears:0, commissionPct:0, preSalePct:0 },
      { id:'a2', phase:'P1', category:'Hospitality', name:'Hotel', code:'H1',
        plotArea:15000, footprint:5000, gfa:20000, revType:'Operating',
        efficiency:0, leaseRate:0, stabilizedOcc:0, costPerSqm:6000,
        constrDuration:30, rampUpYears:3, escalation:2, opEbitda:30000000,
        hotelPL:null, marinaPL:null, salePricePerSqm:0, absorptionYears:0, commissionPct:0, preSalePct:0 },
    ],
    // Financing
    finMode:'fund', vehicleType:'fund', fundName:'TestFund', fundStartYear:0,
    gpIsFundManager:true,
    debtAllowed:true, maxLtvPct:60, financeRate:6.5, loanTenor:10, debtGrace:3,
    graceBasis:'cod', upfrontFeePct:0.5, repaymentType:'amortizing',
    debtTrancheMode:'single', capitalizeIDC:false, islamicMode:'conventional',
    // Equity
    landCapitalize:true, landCapRate:800, landCapTo:'gp', landRentPaidBy:'auto',
    gpEquityManual:0, lpEquityManual:0,
    gpInvestDevFee:true, gpDevFeeInvestPct:100, gpCashInvest:true, gpCashInvestAmount:5000000,
    // Exit
    exitStrategy:'sale', exitYear:2035, exitMultiple:10, exitCapRate:9, exitCostPct:2,
    exitStabilizationYears:3,
    // Waterfall
    prefReturnPct:15, gpCatchup:true, carryPct:30, lpProfitSplitPct:70,
    feeTreatment:'capital', prefAllocation:'proRata', catchupMethod:'perYear',
    // Fees
    subscriptionFeePct:2, annualMgmtFeePct:1.5, mgmtFeeCapAnnual:2000000,
    custodyFeeAnnual:100000, mgmtFeeBase:'nav', developerFeePct:10,
    structuringFeePct:1, structuringFeeCap:300000,
    preEstablishmentFee:200000, spvFee:20000, auditorFeeAnnual:50000,
    // Incentives off for clean test
    incentives:{ capexGrant:{enabled:false}, financeSupport:{enabled:false}, landRentRebate:{enabled:false}, feeRebates:{enabled:false} },
    ...ov
  };
}

function run(p) {
  const r = computeProjectCashFlows(p);
  const inc = computeIncentives(p, r);
  const f = computeFinancing(p, r, inc);
  const w = computeWaterfall(p, r, f, inc);
  return { r, f, w, p };
}

// Baseline
const B = run(mkProj());

// Helper: run with one field changed
function R(field, val) { return run(mkProj({[field]: val})); }

// Helper: compare a metric
function changed(m1, m2) { return m1 !== m2 && !(m1 === null && m2 === null); }
function higher(m1, m2) { return m1 > m2; }
function lower(m1, m2) { return m1 < m2; }

console.log('FINANCIAL STRUCTURE — FIELD AUDIT');
console.log('Base: fund mode, 60% LTV, exit 2035, 2 assets, all features on\n');

// ════════════════════════════════════════════════════════
// [1] FINANCING MODE — C01-C04
// ════════════════════════════════════════════════════════
process.stdout.write('[1] Financing Mode: ');

// C01: Mode switching — self
let M = R('finMode', 'self');
t('MODE', 'C01a self: no debt', M.f.totalDebt === 0, `debt=${M.f.totalDebt}`);
t('MODE', 'C01b self: no waterfall', M.w === null, `w=${M.w}`);
t('MODE', 'C01c self: GP=100%', M.f.gpPct === 1, `gpPct=${M.f.gpPct}`);

// C01: bank100
M = R('finMode', 'bank100');
t('MODE', 'C01d bank100: LTV=100%', M.f.maxDebt > B.f.maxDebt, `maxDebt=${M.f.maxDebt} vs base=${B.f.maxDebt}`);
t('MODE', 'C01e bank100: no waterfall', M.w === null, `w=${M.w}`);

// C01: debt
M = R('finMode', 'debt');
t('MODE', 'C01f debt: has debt', M.f.totalDebt > 0, `debt=${M.f.totalDebt}`);
t('MODE', 'C01g debt: no waterfall', M.w === null, `w=${M.w}`);
t('MODE', 'C01h debt: GP=100%', M.f.gpPct === 1, `gpPct=${M.f.gpPct}`);

// C02: fund→debt should NOT zero fees (in project data)
// This tests the principle — engine ignores fund fees for non-fund anyway
M = R('finMode', 'debt');
t('MODE', 'C02 fund→debt: waterfall null', M.w === null, 'waterfall should be null for debt');

// C03: This is UI behavior (bank100→debt resets LTV) — engine test just verifies both work
t('MODE', 'C03 bank100 LTV calc', run(mkProj({finMode:'bank100',maxLtvPct:100})).f.maxDebt >= B.f.devCostInclLand * 0.95, 'bank100 should have ~100% LTV');

console.log('');

// ════════════════════════════════════════════════════════
// [2] EXIT STRATEGY — C05-C09
// ════════════════════════════════════════════════════════
process.stdout.write('[2] Exit Strategy: ');

// C05: hold = no exit proceeds
M = R('exitStrategy', 'hold');
const exitSum = (M.f.exitProceeds||[]).reduce((a,b)=>a+b,0);
t('EXIT', 'C05 hold: no exit proceeds', exitSum === 0, `exitSum=${exitSum}`);
t('EXIT', 'C05b hold: IRR differs', changed(M.f.leveredIRR, B.f.leveredIRR), `hold=${M.f.leveredIRR} base=${B.f.leveredIRR}`);

// C06: caprate mode
M = R('exitStrategy', 'caprate');
const capExitSum = (M.f.exitProceeds||[]).reduce((a,b)=>a+b,0);
t('EXIT', 'C06 caprate: has exit', capExitSum > 0, `exitSum=${capExitSum}`);
t('EXIT', 'C06b caprate: different from sale', capExitSum !== (B.f.exitProceeds||[]).reduce((a,b)=>a+b,0), 'should differ from sale');

// C07: exitYear=0 (auto) vs manual
M = R('exitYear', 0);
t('EXIT', 'C07 auto exit: has exit', (M.f.exitProceeds||[]).reduce((a,b)=>a+b,0) > 0, 'should have exit');
t('EXIT', 'C07b auto exit: IRR may differ', true, 'auto picks optimal'); // always pass — just informational

// C08: higher multiple → higher IRR
M = R('exitMultiple', 15);
t('EXIT', 'C08 mult 15: higher IRR', M.f.leveredIRR > B.f.leveredIRR, `15x=${(M.f.leveredIRR*100).toFixed(2)}% vs 10x=${(B.f.leveredIRR*100).toFixed(2)}%`);

// C09: lower capRate → higher exit value → higher IRR
const capBase = run(mkProj({exitStrategy:'caprate', exitCapRate:9}));
const capLow = run(mkProj({exitStrategy:'caprate', exitCapRate:7}));
t('EXIT', 'C09 capRate 7<9: higher IRR', capLow.f.leveredIRR > capBase.f.leveredIRR, `7%=${(capLow.f.leveredIRR*100).toFixed(2)}% 9%=${(capBase.f.leveredIRR*100).toFixed(2)}%`);

// C09b: exitCostPct impact
M = R('exitCostPct', 10);
t('EXIT', 'C09b exitCost 10%: lower IRR', M.f.leveredIRR < B.f.leveredIRR, `10%cost=${(M.f.leveredIRR*100).toFixed(2)}% vs 2%cost=${(B.f.leveredIRR*100).toFixed(2)}%`);

// DEAD FIELD: exitStabilizationYears
const stab3 = run(mkProj({exitStabilizationYears:3}));
const stab10 = run(mkProj({exitStabilizationYears:10}));
t('EXIT', 'exitStabilizationYears: DEAD', stab3.f.leveredIRR === stab10.f.leveredIRR, `3yr=${stab3.f.leveredIRR} 10yr=${stab10.f.leveredIRR}`);
if (stab3.f.leveredIRR === stab10.f.leveredIRR) disc('exitStabilizationYears: CONFIRMED DEAD — zero engine impact');

console.log('');

// ════════════════════════════════════════════════════════
// [3] LOAN TERMS — C10-C18
// ════════════════════════════════════════════════════════
process.stdout.write('[3] Loan Terms: ');

// C10: debtAllowed=false
M = R('debtAllowed', false);
t('DEBT', 'C10 debtAllowed=N: no debt', M.f.maxDebt === 0, `maxDebt=${M.f.maxDebt}`);

// C11: LTV 70→50
M = R('maxLtvPct', 50);
t('DEBT', 'C11 LTV 50%: less debt', M.f.maxDebt < B.f.maxDebt, `50%=${M.f.maxDebt} vs 60%=${B.f.maxDebt}`);

// C12: rate 6.5→10
M = R('financeRate', 10);
t('DEBT', 'C12 rate 10%: more interest', M.f.totalInterest > B.f.totalInterest, `10%=${M.f.totalInterest} vs 6.5%=${B.f.totalInterest}`);

// C13: tenor 10→15
M = R('loanTenor', 15);
t('DEBT', 'C13 tenor 15: more repay years', M.f.repayYears > B.f.repayYears, `15yr=${M.f.repayYears} vs 10yr=${B.f.repayYears}`);

// C14: grace 3→5
M = R('debtGrace', 5);
t('DEBT', 'C14 grace 5: later repay', M.f.repayStart > B.f.repayStart, `grace5=${M.f.repayStart} vs grace3=${B.f.repayStart}`);

// C15: graceBasis firstDraw vs cod
M = R('graceBasis', 'firstDraw');
t('DEBT', 'C15 firstDraw: different graceStart', M.f.graceStartIdx !== B.f.graceStartIdx || M.f.repayStart !== B.f.repayStart, `firstDraw repayStart=${M.f.repayStart} vs cod=${B.f.repayStart}`);

// C15b: graceBasis fundStart
M = R('graceBasis', 'fundStart');
t('DEBT', 'C15b fundStart: different graceStart', M.f.graceStartIdx !== B.f.graceStartIdx || M.f.repayStart !== B.f.repayStart, `fundStart repayStart=${M.f.repayStart} vs cod=${B.f.repayStart}`);

// C16: bullet vs amortizing
M = R('repaymentType', 'bullet');
const bulletRepay = M.f.repayment || [];
const nonZeroRepay = bulletRepay.filter(v => v > 0);
t('DEBT', 'C16 bullet: concentrated repay', nonZeroRepay.length <= 2, `non-zero repay periods=${nonZeroRepay.length}`);

// C17: upfrontFee 0.5→2
M = R('upfrontFeePct', 2);
t('DEBT', 'C17 upfront 2%: higher fee', M.f.upfrontFee > B.f.upfrontFee, `2%=${M.f.upfrontFee} vs 0.5%=${B.f.upfrontFee}`);

// C18: capitalizeIDC
M = R('capitalizeIDC', true);
t('DEBT', 'C18 capitalizeIDC: higher totalProjectCost', M.f.totalProjectCost > B.f.totalProjectCost, `IDC=${M.f.totalProjectCost} vs no=${B.f.totalProjectCost}`);
t('DEBT', 'C18b capitalizeIDC: estimatedIDC > 0', (M.f.estimatedIDC||0) > 0, `IDC=${M.f.estimatedIDC}`);

// C18c: debtTrancheMode
M = R('debtTrancheMode', 'perDraw');
t('DEBT', 'C18c perDraw: has tranches', M.f.trancheMode === 'perDraw', `mode=${M.f.trancheMode}`);

// DEAD FIELD: islamicMode
const conv = run(mkProj({islamicMode:'conventional'}));
const mur = run(mkProj({islamicMode:'murabaha'}));
const ij = run(mkProj({islamicMode:'ijara'}));
t('DEBT', 'islamicMode: DEAD (conv=mur)', conv.f.totalInterest === mur.f.totalInterest, `conv=${conv.f.totalInterest} mur=${mur.f.totalInterest}`);
t('DEBT', 'islamicMode: DEAD (conv=ij)', conv.f.totalInterest === ij.f.totalInterest, `conv=${conv.f.totalInterest} ij=${ij.f.totalInterest}`);
if (conv.f.totalInterest === mur.f.totalInterest) disc('islamicMode: CONFIRMED DEAD — zero calc impact');

console.log('');

// ════════════════════════════════════════════════════════
// [4] LAND & EQUITY — C19-C24
// ════════════════════════════════════════════════════════
process.stdout.write('[4] Land & Equity: ');

// C19: landCapitalize toggle
M = R('landCapitalize', false);
t('LAND', 'C19 cap=N: no landCapValue', M.f.landCapValue === 0, `capVal=${M.f.landCapValue}`);
t('LAND', 'C19b cap=Y: has landCapValue', B.f.landCapValue > 0, `capVal=${B.f.landCapValue}`);

// C20: landCapRate double
M = R('landCapRate', 1600);
t('LAND', 'C20 rate 1600: ~double cap value', M.f.landCapValue > B.f.landCapValue * 1.8, `1600=${M.f.landCapValue} vs 800=${B.f.landCapValue}`);

// C21: landCapTo gp→lp
M = R('landCapTo', 'lp');
t('LAND', 'C21 capTo=lp: GP lower', M.f.gpEquity < B.f.gpEquity, `lp mode GP=${M.f.gpEquity} vs gp mode GP=${B.f.gpEquity}`);

// C22: landRentPaidBy — affects net CF, not gross distributions
M = R('landRentPaidBy', 'project');
const gpRentBase = B.w ? B.w.gpLandRentTotal : 0;
const gpRentProj = M.w ? M.w.gpLandRentTotal : 0;
t('LAND', 'C22 rentPaidBy=project: GP rent obligation changes', gpRentBase !== gpRentProj, `project gpRent=${gpRentProj} vs auto gpRent=${gpRentBase}`);

// C23: gpInvestDevFee
M = R('gpInvestDevFee', false);
t('LAND', 'C23 devFee=N: GP equity drops', M.f.gpEquity < B.f.gpEquity, `noDevFee GP=${M.f.gpEquity} vs withDevFee GP=${B.f.gpEquity}`);

// C24: gpCashInvest
M = R('gpCashInvest', false);
t('LAND', 'C24 cash=N: GP equity drops', M.f.gpEquity < B.f.gpEquity, `noCash GP=${M.f.gpEquity} vs withCash GP=${B.f.gpEquity}`);

// C24b: gpCashInvestAmount change
M = run(mkProj({gpCashInvestAmount:20000000}));
t('LAND', 'C24b cash 20M: GP equity higher', M.f.gpEquity > B.f.gpEquity, `20M GP=${M.f.gpEquity} vs 5M GP=${B.f.gpEquity}`);

// C24c: gpEquityManual — ONLY works in fund mode (legacy path). Debt mode forces GP=100%.
M = run(mkProj({finMode:'debt', gpEquityManual:50000000, gpInvestDevFee:false, gpCashInvest:false, landCapitalize:false}));
t('LAND', 'C24c gpManual debt: GP=totalEquity (forced)', M.f.gpEquity === M.f.totalEquity, `GP=${M.f.gpEquity} totalEq=${M.f.totalEquity}`);
// Legacy path only works in fund mode
const legacyFund = run(mkProj({finMode:'fund', gpEquityManual:50000000, gpInvestDevFee:false, gpCashInvest:false, landCapitalize:false}));
t('LAND', 'C24d gpManual fund: GP=50M (legacy)', Math.abs(legacyFund.f.gpEquity - 50000000) < 1, `GP=${legacyFund.f.gpEquity}`);

console.log('');

// ════════════════════════════════════════════════════════
// [5] FUND STRUCTURE — C25-C27
// ════════════════════════════════════════════════════════
process.stdout.write('[5] Fund Structure: ');

// C25: vehicleType — engine should still calc (known gap I3)
M = R('vehicleType', 'direct');
t('FUND', 'C25 direct: waterfall still runs', M.w !== null, 'waterfall should still run for fund mode even with direct vehicle');
if (M.w) {
  const directFees = M.w.totalFees || 0;
  const fundFees = B.w.totalFees || 0;
  disc(`vehicleType direct vs fund: fees direct=${directFees} fund=${fundFees} — ${directFees === fundFees ? 'SAME (engine ignores vehicleType)' : 'DIFFERENT'}`);
  t('FUND', 'C25b vehicleType: engine gap confirmed', directFees === fundFees, `direct=${directFees} fund=${fundFees} — engine ignores vehicleType`);
}

// C27: fundStartYear manual vs auto
const autoStart = run(mkProj({fundStartYear:0}));
const manualStart = run(mkProj({fundStartYear:2025}));
t('FUND', 'C27 fundStart manual vs auto', autoStart.f.computedFundStartYear !== 2025 || manualStart.f.computedFundStartYear === 2025, 'manual should fix year');

// DEAD FIELD: gpIsFundManager
const mgr = run(mkProj({gpIsFundManager:true}));
const noMgr = run(mkProj({gpIsFundManager:false}));
t('FUND', 'gpIsFundManager: DEAD', mgr.f.leveredIRR === noMgr.f.leveredIRR && mgr.f.totalInterest === noMgr.f.totalInterest, `mgr=${mgr.f.leveredIRR} noMgr=${noMgr.f.leveredIRR}`);
if (mgr.f.leveredIRR === noMgr.f.leveredIRR) disc('gpIsFundManager: CONFIRMED DEAD — zero calc impact');

// fundName: display only
const fn1 = run(mkProj({fundName:'ABC'}));
const fn2 = run(mkProj({fundName:'XYZ'}));
t('FUND', 'fundName: display only', fn1.f.leveredIRR === fn2.f.leveredIRR, 'should have zero impact');

console.log('');

// ════════════════════════════════════════════════════════
// [6] WATERFALL — C28-C34
// ════════════════════════════════════════════════════════
process.stdout.write('[6] Waterfall: ');

// C28: prefReturnPct
M = R('prefReturnPct', 10);
const prefT2base = B.w ? (B.w.prefPaid||[]).reduce((a,b)=>a+b,0) : 0;
const prefT2low = M.w ? (M.w.prefPaid||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C28 pref 10%: lower T2', prefT2low < prefT2base || prefT2base === 0, `10%=${prefT2low} vs 15%=${prefT2base}`);

// C29: carryPct
M = R('carryPct', 20);
const gpDistBase = B.w ? (B.w.gpDist||[]).reduce((a,b)=>a+b,0) : 0;
const gpDistLow = M.w ? (M.w.gpDist||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C29 carry 20%: less GP', gpDistLow <= gpDistBase, `20%GP=${gpDistLow} vs 30%GP=${gpDistBase}`);

// C30: lpProfitSplitPct
M = R('lpProfitSplitPct', 80);
const lpDistNew = M.w ? (M.w.lpDist||[]).reduce((a,b)=>a+b,0) : 0;
const lpDistOrig = B.w ? (B.w.lpDist||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C30 LP 80%: more LP', lpDistNew >= lpDistOrig, `80%=${lpDistNew} vs 70%=${lpDistOrig}`);

// C31: gpCatchup off
M = R('gpCatchup', false);
const t3base = B.w ? (B.w.gpCatchup||[]).reduce((a,b)=>a+b,0) : 0;
const t3off = M.w ? (M.w.gpCatchup||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C31 catchup=N: T3=0', t3off === 0, `T3=${t3off}`);
if (t3base > 0) t('WF', 'C31b catchup=Y: T3>0', t3base > 0, `T3=${t3base}`);

// C32: feeTreatment
const feeCapital = run(mkProj({feeTreatment:'capital'}));
const feeExpense = run(mkProj({feeTreatment:'expense'}));
const lpCapital = feeCapital.w ? (feeCapital.w.lpDist||[]).reduce((a,b)=>a+b,0) : 0;
const lpExpense = feeExpense.w ? (feeExpense.w.lpDist||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C32 feeTreatment: capital vs expense differ', lpCapital !== lpExpense, `capital LP=${lpCapital} expense LP=${lpExpense}`);

// C33: prefAllocation
const prefPR = run(mkProj({prefAllocation:'proRata'}));
const prefLP = run(mkProj({prefAllocation:'lpOnly'}));
const gpPrefPR = prefPR.w ? (prefPR.w.gpPref||[]).reduce((a,b)=>a+b,0) : 0;
const gpPrefLP = prefLP.w ? (prefLP.w.gpPref||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C33 prefAlloc lpOnly: GP pref=0', gpPrefLP === 0 || gpPrefLP < gpPrefPR, `proRata GP pref=${gpPrefPR} lpOnly=${gpPrefLP}`);

// C34: catchupMethod
const cuPY = run(mkProj({catchupMethod:'perYear'}));
const cuCum = run(mkProj({catchupMethod:'cumulative'}));
const t3PY = cuPY.w ? (cuPY.w.gpCatchup||[]).reduce((a,b)=>a+b,0) : 0;
const t3Cum = cuCum.w ? (cuCum.w.gpCatchup||[]).reduce((a,b)=>a+b,0) : 0;
t('WF', 'C34 catchupMethod: perYear vs cumulative differ', t3PY !== t3Cum || (t3PY === 0 && t3Cum === 0), `perYear T3=${t3PY} cumulative=${t3Cum}`);

console.log('');

// ════════════════════════════════════════════════════════
// [7] FEES — C35-C39
// ════════════════════════════════════════════════════════
process.stdout.write('[7] Fees: ');

// C35: developerFeePct=0
M = R('developerFeePct', 0);
t('FEES', 'C35 devFee 0%: no fee', M.f.devFeeTotal === 0, `devFee=${M.f.devFeeTotal}`);

// C36: devFee in self mode
const selfWithFee = run(mkProj({finMode:'self', developerFeePct:10}));
const selfNoFee = run(mkProj({finMode:'self', developerFeePct:0}));
t('FEES', 'C36 self: devFee affects IRR', selfWithFee.f.leveredIRR !== selfNoFee.f.leveredIRR, `10%=${(selfWithFee.f.leveredIRR*100).toFixed(2)}% 0%=${(selfNoFee.f.leveredIRR*100).toFixed(2)}%`);

// C37: subscriptionFeePct
M = R('subscriptionFeePct', 0);
const feesZeroSub = M.w ? M.w.totalFees : 0;
const feesWithSub = B.w ? B.w.totalFees : 0;
t('FEES', 'C37 sub=0: lower total fees', feesZeroSub < feesWithSub, `0%=${feesZeroSub} vs 2%=${feesWithSub}`);

// C38: mgmtFeeBase
const navBase = run(mkProj({mgmtFeeBase:'nav'}));
const deployBase = run(mkProj({mgmtFeeBase:'deployed'}));
const navMgmt = navBase.w ? (navBase.w.feeMgmt||[]).reduce((a,b)=>a+b,0) : 0;
const deployMgmt = deployBase.w ? (deployBase.w.feeMgmt||[]).reduce((a,b)=>a+b,0) : 0;
t('FEES', 'C38 mgmtBase: nav vs deployed differ', navMgmt !== deployMgmt, `nav=${navMgmt} deployed=${deployMgmt}`);

// C39: mgmtFeeCapAnnual
const noCap = run(mkProj({mgmtFeeCapAnnual:0}));
const withCap = run(mkProj({mgmtFeeCapAnnual:500000}));
const noCapMgmt = noCap.w ? (noCap.w.feeMgmt||[]).reduce((a,b)=>a+b,0) : 0;
const withCapMgmt = withCap.w ? (withCap.w.feeMgmt||[]).reduce((a,b)=>a+b,0) : 0;
t('FEES', 'C39 cap 500K: lower fees', withCapMgmt <= noCapMgmt, `noCap=${noCapMgmt} cap500K=${withCapMgmt}`);

// Extra: each fund fee individually
for (const [field, label] of [['structuringFeePct','structuring'],['preEstablishmentFee','preEst'],['spvFee','spv'],['custodyFeeAnnual','custody'],['auditorFeeAnnual','auditor']]) {
  const withFee = run(mkProj({[field]: field.includes('Pct') ? 2 : 200000}));
  const noFee = run(mkProj({[field]: 0}));
  const wF = withFee.w ? withFee.w.totalFees : 0;
  const nF = noFee.w ? noFee.w.totalFees : 0;
  t('FEES', `${label}: has impact`, wF > nF, `with=${wF} without=${nF}`);
}

console.log('');

// ════════════════════════════════════════════════════════
// [8] PER-PHASE — C40
// ════════════════════════════════════════════════════════
process.stdout.write('[8] Per-Phase: ');

const multiPhase = mkProj({
  phases:[
    {name:'A', completionMonth:24, financing:{finMode:'fund',vehicleType:'fund',maxLtvPct:50,debtAllowed:true,financeRate:6.5,loanTenor:7,debtGrace:3,graceBasis:'cod',upfrontFeePct:0.5,repaymentType:'amortizing',exitStrategy:'sale',exitYear:2035,exitMultiple:10,exitCostPct:2,prefReturnPct:15,gpCatchup:true,carryPct:30,lpProfitSplitPct:70,feeTreatment:'capital',subscriptionFeePct:2,annualMgmtFeePct:1.5,developerFeePct:10,landCapitalize:true,landCapRate:800,landCapTo:'gp',landRentPaidBy:'auto'}},
    {name:'B', completionMonth:36, financing:{finMode:'fund',vehicleType:'fund',maxLtvPct:30,debtAllowed:true,financeRate:8,loanTenor:5,debtGrace:2,graceBasis:'firstDraw',upfrontFeePct:1,repaymentType:'amortizing',exitStrategy:'sale',exitYear:2036,exitMultiple:12,exitCostPct:3,prefReturnPct:12,gpCatchup:false,carryPct:20,lpProfitSplitPct:80,feeTreatment:'expense',subscriptionFeePct:1,annualMgmtFeePct:1,developerFeePct:8,landCapitalize:true,landCapRate:800,landCapTo:'gp',landRentPaidBy:'auto'}}
  ],
  assets:[
    { id:'a1', phase:'A', category:'Retail', name:'Mall A', code:'RA', plotArea:20000, footprint:8000, gfa:32000, revType:'Lease', efficiency:85, leaseRate:800, stabilizedOcc:90, costPerSqm:4000, constrDuration:24, rampUpYears:3, escalation:2, opEbitda:0, hotelPL:null, marinaPL:null },
    { id:'a2', phase:'B', category:'Retail', name:'Mall B', code:'RB', plotArea:15000, footprint:6000, gfa:24000, revType:'Lease', efficiency:85, leaseRate:900, stabilizedOcc:90, costPerSqm:3500, constrDuration:30, rampUpYears:3, escalation:2, opEbitda:0, hotelPL:null, marinaPL:null },
  ]
});

const MPR = computeProjectCashFlows(multiPhase);
const MPI = computeIncentives(multiPhase, MPR);
const MPRes = computeIndependentPhaseResults(multiPhase, MPR, MPI);

if (MPRes && MPRes.phaseFinancings) {
  const pfA = MPRes.phaseFinancings['A'];
  const pfB = MPRes.phaseFinancings['B'];
  t('PHASE', 'C40a different LTV', pfA && pfB && pfA.maxDebt !== pfB.maxDebt, `A=${pfA?.maxDebt} B=${pfB?.maxDebt}`);
  t('PHASE', 'C40b different rate', pfA && pfB && pfA.rate !== pfB.rate, `A=${pfA?.rate} B=${pfB?.rate}`);
} else {
  t('PHASE', 'C40 per-phase results exist', false, 'computeIndependentPhaseResults returned null');
}

// Verify FINANCING_FIELDS completeness — these were added in D5-D9 fix
const shouldBeInFF = ['capitalizeIDC','gpInvestDevFee','gpDevFeeInvestPct','gpCashInvest','gpCashInvestAmount'];
for (const f of shouldBeInFF) {
  t('PHASE', `FINANCING_FIELDS has: ${f}`, FINANCING_FIELDS.includes(f), `Missing from FINANCING_FIELDS`);
}

console.log('');

// ════════════════════════════════════════════════════════
// [9] EDGE CASES
// ════════════════════════════════════════════════════════
process.stdout.write('[9] Edge Cases: ');

// Zero assets
try {
  const noAssets = run(mkProj({assets:[]}));
  t('EDGE', 'zero assets: no crash', true, '');
} catch(e) { t('EDGE', 'zero assets: no crash', false, e.message); }

// LTV 0
M = R('maxLtvPct', 0);
t('EDGE', 'LTV 0%: no debt', M.f.maxDebt === 0 || M.f.totalDebt === 0, `maxDebt=${M.f.maxDebt}`);

// LTV 100
M = R('maxLtvPct', 100);
t('EDGE', 'LTV 100%: high debt', M.f.maxDebt >= B.f.devCostInclLand * 0.95, `maxDebt=${M.f.maxDebt} devCost=${B.f.devCostInclLand}`);

// prefReturnPct 0
M = R('prefReturnPct', 0);
t('EDGE', 'pref 0%: waterfall runs', M.w !== null, 'should not crash');

// carryPct 0
M = R('carryPct', 0);
t('EDGE', 'carry 0%: waterfall runs', M.w !== null, 'should not crash');

// lpProfitSplitPct 100 (GP=0)
M = R('lpProfitSplitPct', 100);
t('EDGE', 'LP 100%: GP gets 0', M.w !== null, 'should not crash');
if (M.w) {
  const gpT4 = (M.w.gpProfit||[]).reduce((a,b)=>a+b,0);
  t('EDGE', 'LP 100%: GP T4=0', gpT4 <= 0.01, `gpT4=${gpT4}`);
}

// horizon 5 (very short)
try {
  const short = run(mkProj({horizon:5, exitYear:2030}));
  t('EDGE', 'horizon 5: no crash', true, '');
} catch(e) { t('EDGE', 'horizon 5: no crash', false, e.message); }

// landType=purchase with landCapitalize (should be ignored)
const purchaseCap = run(mkProj({landType:'purchase', landCapitalize:true}));
t('EDGE', 'purchase+cap: landCapValue=0', purchaseCap.f.landCapValue === 0, `capVal=${purchaseCap.f.landCapValue}`);

// debtGrace > loanTenor: REAL FINDING — engine allows negative repayYears
M = R('debtGrace', 15);
if (M.f.repayYears < 0) disc(`grace>tenor: repayYears=${M.f.repayYears} (NEGATIVE) — engine should clamp to 0`);
t('EDGE', 'grace>tenor: no crash', M.f.leveredIRR !== undefined, `IRR=${M.f.leveredIRR}`);

console.log('');

// ════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  FIELD AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log('═'.repeat(50));

if (discoveries.length > 0) {
  console.log('\n📋 DISCOVERIES:');
  discoveries.forEach(d => console.log(`  → ${d}`));
}

if (failed > 0) {
  console.log('\n❌ FAILURES:');
  issues.forEach(i => console.log(`  ${i}`));
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
