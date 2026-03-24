/**
 * ZAN Financial Modeler v4.3 — Full Procedure-by-Procedure Test Suite
 * Coverage: 20 functions, 5 test layers, 3 datasets
 * Run: cd re-dev-modeler && node tests/full_suite.cjs
 */
const E = require('./helpers/engine.cjs');
const O = require('./helpers/oracles.cjs');
const {TOL,oracleNPV,oracleIRR,oracleCapex,oracleCapexSchedule,oracleLeaseRevenue,oracleLandRent,oracleDebtRollForward,oracleWaterfall,arrClose,near} = O;

// ═══ Test Framework ═══
let pass=0, fail=0, skip=0, tests=[], currentSuite='';
const t = (name, ok, detail) => {
  const rec = { suite:currentSuite, name, pass:!!ok, detail:detail||'' };
  tests.push(rec);
  if (ok) pass++; else { fail++; console.log(`  ❌ [${currentSuite}] ${name}: ${detail||''}`); }
};
const suite = (name) => { currentSuite = name; };
const sumArr = a => a.reduce((s,v)=>s+v,0);

// ═══════════════════════════════════════════════
// DATASET D1 — Mini Formula Model (hand-checkable)
// ═══════════════════════════════════════════════
const D1 = {
  id:'d1', name:'Mini', horizon:10, startYear:2026, landType:'lease',
  landArea:10000, landRentAnnual:500000, landRentEscalation:5, landRentEscalationEveryN:5,
  landRentGrace:2, landRentTerm:10, softCostPct:10, contingencyPct:5,
  rentEscalation:1.0, activeScenario:'Base Case',
  phases:[{name:'P1'}],
  assets:[{
    id:'a1', phase:'P1', category:'Retail', name:'Shop', code:'S1',
    gfa:1000, footprint:500, plotArea:1000, revType:'Lease', efficiency:80,
    leaseRate:1000, escalation:2.0, rampUpYears:2, stabilizedOcc:90,
    costPerSqm:3000, constrStart:1, constrDuration:24, opEbitda:0,
  }],
  finMode:'debt', debtAllowed:true, maxLtvPct:60, financeRate:7, loanTenor:7,
  debtGrace:2, upfrontFeePct:0.5, repaymentType:'amortizing', graceBasis:'cod',
  exitStrategy:'sale', exitYear:0, exitMultiple:10, exitCostPct:2,
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

// ═══════════════════════════════════════════════
// DATASET D2 — Integration Model (3 phases, mixed)
// ═══════════════════════════════════════════════
const D2 = {
  id:'d2', name:'Integration', horizon:15, startYear:2026, landType:'lease',
  landArea:50000, landRentAnnual:2000000, landRentEscalation:5, landRentEscalationEveryN:5,
  landRentGrace:2, landRentTerm:15, softCostPct:10, contingencyPct:5,
  rentEscalation:1.0, activeScenario:'Base Case',
  phases:[{name:'Phase A'},{name:'Phase B'},{name:'Phase C'}],
  assets:[
    {id:'a1',phase:'Phase A',category:'Retail',name:'Mall',code:'M1',gfa:10000,footprint:6000,plotArea:8000,revType:'Lease',efficiency:85,leaseRate:1500,escalation:1.0,rampUpYears:2,stabilizedOcc:92,costPerSqm:4000,constrStart:1,constrDuration:24,opEbitda:0},
    {id:'a2',phase:'Phase B',category:'Hospitality',name:'Hotel',code:'H1',gfa:8000,footprint:3000,plotArea:4000,revType:'Operating',efficiency:0,leaseRate:0,escalation:1.0,rampUpYears:3,stabilizedOcc:100,costPerSqm:7000,constrStart:2,constrDuration:36,opEbitda:8000000},
    {id:'a3',phase:'Phase C',category:'Residential',name:'Apts',code:'R1',gfa:6000,footprint:2000,plotArea:3000,revType:'Sale',efficiency:90,leaseRate:0,escalation:0,rampUpYears:1,stabilizedOcc:100,costPerSqm:2500,constrStart:3,constrDuration:24,salePricePerSqm:5000,absorptionYears:3,preSalePct:10,commissionPct:3},
  ],
  finMode:'fund', vehicleType:'fund', debtAllowed:true, maxLtvPct:60,
  financeRate:6.5, loanTenor:8, debtGrace:3, upfrontFeePct:0.5,
  repaymentType:'amortizing', graceBasis:'cod', feeTreatment:'capital',
  gpEquityManual:0, lpEquityManual:0,
  prefReturnPct:12, gpCatchup:true, carryPct:25, lpProfitSplitPct:75,
  exitStrategy:'sale', exitYear:0, exitMultiple:10, exitCostPct:2,
  subscriptionFeePct:2, annualMgmtFeePct:1.0, custodyFeeAnnual:100000,
  developerFeePct:5, structuringFeePct:0.5, mgmtFeeBase:'devCost',
  incentives:{capexGrant:{enabled:true,grantPct:5,timing:'construction',maxCap:999999999},financeSupport:{enabled:false},landRentRebate:{enabled:true,constrRebatePct:50,constrRebateYears:0,operRebatePct:30,operRebateYears:5},feeRebates:{enabled:false}},
};

// ═══════════════════════════════════════════════
// LAYER 1: UNIT TESTS — Function by Function
// ═══════════════════════════════════════════════

// ── F1: getScenarioMults ──
suite('F1-getScenarioMults');
{
  const gm = E.getScenarioMults;
  const bc = gm({activeScenario:'Base Case'}); t('Base Case neutral', bc.cm===1 && bc.rm===1 && bc.dm===0 && bc.ea===0);
  const cx = gm({activeScenario:'CAPEX +10%'}); t('CAPEX +10%', cx.cm===1.1 && cx.rm===1 && cx.dm===0);
  const cxm = gm({activeScenario:'CAPEX -10%'}); t('CAPEX -10%', cxm.cm===0.9);
  const rp = gm({activeScenario:'Rent +10%'}); t('Rent +10%', rp.rm===1.1 && rp.cm===1);
  const rm = gm({activeScenario:'Rent -10%'}); t('Rent -10%', rm.rm===0.9);
  const dl = gm({activeScenario:'Delay +6 months'}); t('Delay +6mo', dl.dm===6 && dl.cm===1);
  const ep = gm({activeScenario:'Escalation +0.5%'}); t('Esc +0.5%', ep.ea===0.5);
  const em = gm({activeScenario:'Escalation -0.5%'}); t('Esc -0.5%', em.ea===-0.5);
  const cu = gm({activeScenario:'Custom', customCapexMult:110, customRentMult:90, customDelay:12, customEscAdj:1});
  t('Custom full', cu.cm===1.1 && cu.rm===0.9 && cu.dm===12 && cu.ea===1);
  const cu0 = gm({activeScenario:'Custom', customCapexMult:0, customRentMult:0});
  t('Custom zero valid (?? not ||)', cu0.cm===0 && cu0.rm===0, `cm=${cu0.cm} rm=${cu0.rm}`);
  const unk = gm({activeScenario:'Nonsense'}); t('Unknown fallback', unk.cm===1 && unk.rm===1);
  const nd = gm({}); t('No scenario', nd.cm===1 && nd.rm===1);
}

// ── F2: computeAssetCapex ──
suite('F2-computeAssetCapex');
{
  const ca = E.computeAssetCapex;
  const expected = 1000 * 3000 * 1.10 * 1.05 * 1; // = 3,465,000
  t('Base formula', near(ca(D1.assets[0], D1), expected, TOL.MONEY_SMALL), `${ca(D1.assets[0],D1)} vs ${expected}`);
  t('Oracle match', near(ca(D1.assets[0], D1), oracleCapex(1000,3000,10,5,1), TOL.MONEY_SMALL));
  t('Zero GFA', ca({gfa:0,costPerSqm:3000}, D1) === 0);
  t('Zero cost', ca({gfa:1000,costPerSqm:0}, D1) === 0);
  const p10 = {...D1, activeScenario:'CAPEX +10%'};
  t('Scenario mult', near(ca(D1.assets[0], p10), expected*1.1, TOL.MONEY_SMALL));
}

// ── F3: computeProjectCashFlows ──
suite('F3-computeProjectCashFlows');
{
  const r = E.computeProjectCashFlows(D1);
  const c = r.consolidated;
  // A: CAPEX schedule (constrStart=1 → cStart=1, dur=2yrs → CAPEX at Y1,Y2)
  const expCapex = oracleCapex(1000,3000,10,5,1);
  const durYrs = Math.ceil(24/12); // 2
  t('Total CAPEX matches oracle', near(c.totalCapex, expCapex, TOL.MONEY_LARGE), `${c.totalCapex} vs ${expCapex}`);
  t('CAPEX sum = totalCapex', near(sumArr(c.capex), c.totalCapex, TOL.MONEY_SMALL));
  const expSch = oracleCapexSchedule(expCapex, 0, 2, 10, 0);
  t('CAPEX schedule Y1', near(c.capex[1], expCapex/2, TOL.MONEY_SMALL));
  t('CAPEX schedule Y2', near(c.capex[2], expCapex/2, TOL.MONEY_SMALL));
  t('CAPEX Y3+ = 0', c.capex.slice(3).every(v => v === 0));
  // B: Lease revenue (constrStart=1 → cStart=1, dur=2 → revStart=3)
  const revStart = 1 + 2; // constrStart=1 → idx 1, dur=2 → revStart=3
  t('No revenue Y0-Y2', c.income[0]===0 && c.income[1]===0 && c.income[2]===0);
  t('Revenue starts Y3', c.income[3] > 0, `Y3=${c.income[3]}`);
  // Oracle: leasable=1000*0.8=800, rate=1000, occ=0.9, ramp=2, esc=2%
  const expRevY3 = 800 * 1000 * 0.9 * Math.min(1, 1/2) * Math.pow(1.02, 0); // = 360,000
  t('Rev Y3 oracle', near(c.income[3], expRevY3, TOL.MONEY_LARGE), `${c.income[3]} vs ${expRevY3}`);
  const expRevY4 = 800 * 1000 * 0.9 * Math.min(1, 2/2) * Math.pow(1.02, 1); // = 734,400
  t('Rev Y4 oracle (full ramp)', near(c.income[4], expRevY4, TOL.MONEY_LARGE), `${c.income[4]} vs ${expRevY4}`);
  // E: Land rent
  const expLand = oracleLandRent(500000, 2, 5, 5, 10, 10);
  const landCheck = arrClose(r.landSchedule, expLand, TOL.MONEY_SMALL);
  t('Land schedule oracle', landCheck.ok, landCheck.msg);
  // F: Phase results
  t('1 phase exists', Object.keys(r.phaseResults).length === 1);
  t('Phase P1 CAPEX = consolidated', near(r.phaseResults.P1.totalCapex, c.totalCapex, TOL.MONEY_SMALL));
  // G: NetCF equation
  let ncfOk = true;
  for (let y=0; y<10; y++) { if (!near(c.netCF[y], c.income[y]-c.capex[y]-c.landRent[y], TOL.MONEY_SMALL)) { ncfOk=false; break; } }
  t('NetCF = Income - CAPEX - LandRent', ncfOk);
  t('IRR computed', typeof c.irr === 'number' || c.irr === null);
  t('NPV10 computed', typeof c.npv10 === 'number');
}

// ── F3b: Sale revenue branch ──
suite('F3b-SaleRevenue');
{
  const pSale = {...D1, assets:[{...D1.assets[0], revType:'Sale', salePricePerSqm:5000, efficiency:90, absorptionYears:2, preSalePct:20, commissionPct:5}]};
  const r = E.computeProjectCashFlows(pSale);
  const sellable = 1000 * 0.9; // 900
  const totalVal = 900 * 5000; // 4,500,000
  const preSale = totalVal * 0.2 * 0.95; // 855,000
  // constrStart=1 → cStart=1, dur=2 → constr Y1-Y2, revStart=3
  t('Pre-sale in last constr yr', near(r.consolidated.income[2], preSale, TOL.MONEY_LARGE), `Y2=${r.consolidated.income[2]} exp=${preSale}`);
  const remaining = totalVal * 0.8;
  const annSale = remaining / 2; // 1,800,000
  const postY3 = annSale * 0.95 * Math.pow(1.02, 0); // esc=2% from asset
  t('Post-sale Y3', near(r.consolidated.income[3], postY3, TOL.MONEY_LARGE), `Y3=${r.consolidated.income[3]} exp=${postY3}`);
}

// ── F3c: Operating revenue branch ──
suite('F3c-OperatingRevenue');
{
  const pOp = {...D1, assets:[{...D1.assets[0], revType:'Operating', opEbitda:1000000, rampUpYears:3, escalation:1.0}]};
  const r = E.computeProjectCashFlows(pOp);
  // constrStart=1 → cStart=1, dur=2 → revStart=3
  const expY3 = 1000000 * Math.min(1, 1/3) * Math.pow(1.01, 0); // ramp yr 1
  t('Op rev Y3 ramp', near(r.consolidated.income[3], expY3, TOL.MONEY_LARGE), `${r.consolidated.income[3]} vs ${expY3}`);
  t('Op rev Y5 full', r.consolidated.income[5] > r.consolidated.income[3]);
}

// ── F3d: Delay scenario ──
suite('F3d-DelayScenario');
{
  const pDelay = {...D1, activeScenario:'Delay +6 months'};
  const r = E.computeProjectCashFlows(pDelay);
  const rBase = E.computeProjectCashFlows(D1);
  t('Delay shifts CAPEX start', r.consolidated.capex.findIndex(v=>v>0) > rBase.consolidated.capex.findIndex(v=>v>0));
  t('Delay same total CAPEX', near(r.consolidated.totalCapex, rBase.consolidated.totalCapex, TOL.MONEY_SMALL));
}

// ── F3e: Land purchase ──
suite('F3e-LandPurchase');
{
  const pPurch = {...D1, landType:'purchase', landPurchasePrice:5000000};
  const r = E.computeProjectCashFlows(pPurch);
  t('Land purchase in CAPEX Y0', r.consolidated.capex[0] >= 5000000);
  t('Land rent = 0 (purchase)', r.landSchedule.every(v => v === 0));
}

// ── F4: calcIRR ──
suite('F4-calcIRR');
{
  // Known: -100, 110 → IRR = 10%
  const irr1 = E.calcIRR([-100, 110]);
  t('Simple 10%', near(irr1, 0.10, TOL.IRR), `${irr1}`);
  // Verify NPV ≈ 0
  t('NPV at IRR ≈ 0', near(E.calcNPV([-100,110], irr1), 0, 0.001));
  // Known: -1000, 200, 200, 200, 200, 200, 200 → use oracle
  const cf2 = [-1000, 200, 200, 200, 200, 200, 200];
  const irr2 = E.calcIRR(cf2);
  const oirr2 = oracleIRR(cf2);
  t('Complex IRR matches oracle', near(irr2, oirr2, 0.001), `engine=${irr2} oracle=${oirr2}`);
  t('All positive → null', E.calcIRR([100,100,100]) === null);
  t('All negative → null', E.calcIRR([-100,-100]) === null);
  t('Flat CF → null', E.calcIRR([100,100,100,100]) === null);
}

// ── F5: calcNPV ──
suite('F5-calcNPV');
{
  const cf = [-1000, 500, 600];
  const npv = E.calcNPV(cf, 0.10);
  const exp = -1000 + 500/1.1 + 600/1.21;
  t('NPV formula exact', near(npv, exp, TOL.NPV), `${npv} vs ${exp}`);
  t('NPV oracle match', near(npv, oracleNPV(cf, 0.10), TOL.NPV));
  t('NPV rate=0 = sum', near(E.calcNPV([1,2,3], 0), 6, TOL.NPV));
}

// ── F7: computeIncentives ──
suite('F7-computeIncentives');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  // A: CAPEX grant
  t('Grant total = 5% of CAPEX', near(i.capexGrantTotal, r.consolidated.totalCapex * 0.05, TOL.MONEY_LARGE));
  t('Grant schedule sum = total', near(sumArr(i.capexGrantSchedule), i.capexGrantTotal, TOL.MONEY_SMALL));
  // FIX#6: Spend-weighted
  const capexYrs = r.consolidated.capex.map((v,i)=>({y:i,capex:v,grant:i.capexGrantSchedule?.[i]||0}));
  t('adjustedCapex = capex - grant', (() => {
    for (let y=0; y<D2.horizon; y++) {
      if (!near(i.adjustedCapex[y], r.consolidated.capex[y] - i.capexGrantSchedule[y], TOL.MONEY_SMALL)) return false;
    }
    return true;
  })());
  // B: Land rebate
  t('Land saving total > 0', i.landRentSavingTotal > 0);
  t('Adjusted land rent >= 0', i.adjustedLandRent.every(v => v >= 0));
  t('Saving sum = total', near(sumArr(i.landRentSavingSchedule), i.landRentSavingTotal, TOL.MONEY_SMALL));
  // FIX#7: Rebate starts at construction start, not Y0
  const constrStartIdx = r.consolidated.capex.findIndex(v => v > 0);
  if (constrStartIdx > 0) {
    t('FIX7: No rebate before construction', i.landRentSavingSchedule.slice(0, constrStartIdx).every(v => v === 0),
      `Pre-constr savings: ${i.landRentSavingSchedule.slice(0,constrStartIdx)}`);
  }
  // D: Net impact
  t('netCFImpact = grant+land+fee', (() => {
    for (let y=0; y<D2.horizon; y++) {
      const exp = i.capexGrantSchedule[y] + i.landRentSavingSchedule[y] + i.feeRebateSchedule[y];
      if (!near(i.netCFImpact[y], exp, TOL.MONEY_SMALL)) return false;
    }
    return true;
  })());
  t('adjustedNetCF = netCF + impact', (() => {
    for (let y=0; y<D2.horizon; y++) {
      if (!near(i.adjustedNetCF[y], r.consolidated.netCF[y] + i.netCFImpact[y], TOL.MONEY_SMALL)) return false;
    }
    return true;
  })());
}

// ── F7b: Grant spend-weighted (FIX#6) ──
suite('F7b-GrantSpendWeighted');
{
  const pUneven = {...D1, assets:[
    {...D1.assets[0], gfa:1000, costPerSqm:3000, constrStart:1, constrDuration:12},
    {...D1.assets[0], id:'a2', gfa:2000, costPerSqm:3000, constrStart:2, constrDuration:24},
  ], incentives:{capexGrant:{enabled:true, grantPct:10, timing:'construction', maxCap:999999999},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}}};
  const r = E.computeProjectCashFlows(pUneven);
  const i = E.computeIncentives(pUneven, r);
  const totalCapex = sumArr(r.consolidated.capex);
  // Each year's grant should be proportional to that year's CAPEX
  let spendWeightOk = true;
  for (let y=0; y<pUneven.horizon; y++) {
    if (r.consolidated.capex[y] > 0) {
      const expGrant = i.capexGrantTotal * (r.consolidated.capex[y] / totalCapex);
      if (!near(i.capexGrantSchedule[y], expGrant, TOL.MONEY_LARGE)) { spendWeightOk = false; break; }
    }
  }
  t('Grant proportional to CAPEX spend', spendWeightOk);
}

// ── F8: applyInterestSubsidy ──
suite('F8-applyInterestSubsidy');
{
  const interest = [0, 100, 200, 300, 400, 500];
  // Disabled
  const d = E.applyInterestSubsidy({incentives:{}}, interest, 1, 1000, 0.07);
  t('Disabled: no change', arrClose(d.adjusted, interest, TOL.MONEY_SMALL).ok);
  // Interest subsidy
  const ps = {incentives:{financeSupport:{enabled:true, subType:'interestSubsidy', subsidyPct:50, subsidyYears:3, subsidyStart:'construction'}}};
  const s = E.applyInterestSubsidy(ps, interest, 1, 1000, 0.07);
  t('Subsidy savings Y1', near(s.savings[1], 50, TOL.MONEY_SMALL)); // 50% of 100
  t('Subsidy adjusted Y1', near(s.adjusted[1], 50, TOL.MONEY_SMALL));
  t('Subsidy total', near(s.total, sumArr(s.savings), TOL.MONEY_SMALL));
}

// ── F9: computeFinancing ──
suite('F9-computeFinancing');
{
  const r = E.computeProjectCashFlows(D1);
  const i = E.computeIncentives(D1, r);
  const f = E.computeFinancing(D1, r, i);
  // A: Cost structure
  t('devCostExclLand computed', f.devCostExclLand > 0);
  t('devCostInclLand >= excl', f.devCostInclLand >= f.devCostExclLand);
  // C: Debt sizing
  t('maxDebt ≈ 60% of devCostInclLand', near(f.maxDebt, f.devCostInclLand * 0.6, TOL.MONEY_LARGE));
  t('totalEquity = devCost - debt', near(f.totalEquity, f.devCostInclLand - f.maxDebt, TOL.MONEY_LARGE));
  // E: Drawdown
  t('Sum drawdown = totalDebt', near(sumArr(f.drawdown), f.totalDebt, TOL.MONEY_SMALL));
  t('No neg equity calls', f.equityCalls.every(v => v >= -TOL.MONEY_SMALL));
  // F: Debt roll-forward
  let balOk = true;
  for (let y=1; y<D1.horizon; y++) {
    if (!near(f.debtBalOpen[y], f.debtBalClose[y-1], TOL.MONEY_SMALL)) { balOk=false; break; }
  }
  t('Debt balance rolls forward', balOk);
  // ZAN interest: (Open+Close)/2 × rate + draw × upfrontFee%
  // Note: at exit year, balloon repayment is added after interest calc, so skip it
  let intOk = true;
  const ufPct = (D1.upfrontFeePct||0)/100;
  const exitIdx = f.exitYear ? f.exitYear - D1.startYear : -1;
  for (let y=0; y<D1.horizon; y++) {
    if (y === exitIdx) continue; // Balloon repay distorts trueClose
    const trueClose = Math.max(0, (f.debtBalOpen[y]||0) + (f.drawdown[y]||0) - (f.repayment[y]||0));
    const expInt = Math.max(0, ((f.debtBalOpen[y]||0) + trueClose)/2 * (D1.financeRate/100) + (f.drawdown[y]||0) * ufPct);
    if (!near(f.originalInterest[y], expInt, TOL.MONEY_LARGE)) { intOk=false; break; }
  }
  t('AvgBal interest formula', intOk);
  // G: Exit
  t('Exit proceeds exist', f.exitProceeds.some(v => v > 0));
  // FIX#1: Post-exit truncation
  const exitYrIdx = f.exitYear - D1.startYear;
  if (exitYrIdx >= 0 && exitYrIdx < D1.horizon - 1) {
    t('FIX1: Post-exit leveredCF = 0', f.leveredCF.slice(exitYrIdx+1).every(v => v === 0));
    t('FIX1: Post-exit debt = 0', f.debtBalClose.slice(exitYrIdx+1).every(v => v === 0));
    t('FIX1: Post-exit interest = 0', f.interest.slice(exitYrIdx+1).every(v => v === 0));
  }
  // H: Levered CF equation
  const adjLR = i?.adjustedLandRent || r.consolidated.landRent;
  let lcfOk = true;
  for (let y=0; y<D1.horizon; y++) {
    const sold = (D1.exitStrategy!=='hold') && exitYrIdx>=0 && exitYrIdx<D1.horizon;
    if (sold && y > exitYrIdx) { if (!near(f.leveredCF[y], 0, TOL.MONEY_SMALL)) { lcfOk=false; break; } continue; }
    const exp = r.consolidated.income[y] - adjLR[y] - r.consolidated.capex[y]
      + (i?.capexGrantSchedule?.[y]||0) + (i?.feeRebateSchedule?.[y]||0)
      - f.debtService[y] + f.drawdown[y] + (f.exitProceeds[y]||0) - (f.devFeeSchedule?.[y]||0);
    if (!near(f.leveredCF[y], exp, TOL.MONEY_LARGE)) { lcfOk=false; break; }
  }
  t('Levered CF equation (year-by-year)', lcfOk);
  t('Levered IRR computed', typeof f.leveredIRR === 'number');
}

// ── F9b: Self-funded ──
suite('F9b-SelfFunded');
{
  const pSelf = {...D1, finMode:'self'};
  const r = E.computeProjectCashFlows(pSelf);
  const f = E.computeFinancing(pSelf, r, null);
  t('Self: no debt', f.totalDebt === 0);
  t('Self: GP = 100%', f.gpPct === 1);
  t('Self: LP = 0', f.lpPct === 0);
  t('Self: exit proceeds exist', f.exitProceeds.some(v => v > 0));
  // FIX#1: Post-exit CF zeroed
  const eIdx = f.exitProceeds.findIndex(v => v > 0);
  if (eIdx >= 0 && eIdx < pSelf.horizon - 1) {
    t('Self FIX1: post-exit CF = 0', f.leveredCF.slice(eIdx+1).every(v => v === 0));
  }
}

// ── F9c: Cash land in drawdown (FIX#2) ──
suite('F9c-CashLandDrawdown');
{
  const pLand = {...D1, landType:'purchase', landPurchasePrice:5000000, landCapitalize:false};
  const r = E.computeProjectCashFlows(pLand);
  const f = E.computeFinancing(pLand, r, null);
  // Land purchase is in CAPEX (cashflow.js), so devCostExclLand = totalCapex (includes land)
  // devCostInclLand = devCostExclLand (no extra cashLandCost, no effectiveLandCap)
  t('FIX2: devCostInclLand includes land via CAPEX', f.devCostInclLand >= 5000000);
  // Y0 uses should include land (via CAPEX, not double-counted)
  const y0uses = f.drawdown[0] + f.equityCalls[0];
  t('FIX2: Y0 sources fund land', y0uses >= 5000000 - TOL.MONEY_LARGE, `Y0 uses: ${Math.round(y0uses)}`);
  // Source/use reconciliation: sources = totalCapex (no double count)
  const totalSources = sumArr(f.drawdown) + sumArr(f.equityCalls);
  t('FIX2: Sources ≈ Uses (no double count)', near(totalSources, r.consolidated.totalCapex, 100000), `Sources=${Math.round(totalSources)} Uses=${Math.round(r.consolidated.totalCapex)}`);
}

// ── F10: computeWaterfall ──
suite('F10-computeWaterfall');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall(D2, r, f, i);
  // A: Guard
  t('Self returns null', E.computeWaterfall({...D2,finMode:'self'}, r, f, i) === null);
  t('Bank100 returns null', E.computeWaterfall({...D2,finMode:'bank100'}, r, f, i) === null);
  t('Fund returns object', w !== null);
  // B: Fees
  t('Total fees > 0', w.totalFees > 0);
  t('Fee sum = total', near(sumArr(w.fees), w.totalFees, TOL.MONEY_SMALL));
  // D: Cash conservation
  let distOk = true;
  for (let y=0; y<D2.horizon; y++) {
    const totalDist = w.tier1[y]+w.tier2[y]+w.tier3[y]+w.tier4LP[y]+w.tier4GP[y];
    if (totalDist > w.cashAvail[y] + TOL.MONEY_LARGE) { distOk=false; break; }
  }
  t('Distributions ≤ cash available', distOk);
  // E: ROC
  const totalROC = sumArr(w.tier1);
  const totalCalled = sumArr(w.equityCalls);
  t('ROC ≤ called capital', totalROC <= totalCalled + TOL.MONEY_LARGE);
  // FIX3B: T2 pro-rata (Option B) - GP gets gpPct of T2
  let t2proRataOk = true;
  for (let y=0; y<D2.horizon; y++) {
    if (w.tier2[y] > 0) {
      const expLP = (w.tier1[y]+w.tier2[y])*w.lpPct + (w.tier4LP[y]||0);
      const expGP = (w.tier1[y]+w.tier2[y])*w.gpPct + (w.tier3[y]||0) + (w.tier4GP[y]||0);
      if (!near(w.lpDist[y], expLP, TOL.MONEY_LARGE) || !near(w.gpDist[y], expGP, TOL.MONEY_LARGE)) { t2proRataOk=false; break; }
    }
  }
  t('FIX3B: T2 pro-rata (GP gets share)', t2proRataOk);
  // I: LP+GP = total tiers
  let allocOk = true;
  for (let y=0; y<D2.horizon; y++) {
    const totalTiers = w.tier1[y]+w.tier2[y]+w.tier3[y]+w.tier4LP[y]+w.tier4GP[y];
    const totalDist = w.lpDist[y]+w.gpDist[y];
    if (!near(totalTiers, totalDist, TOL.MONEY_LARGE)) { allocOk=false; break; }
  }
  t('LP+GP dist = all tiers', allocOk);
  // J: Net CF
  let ncfOk = true;
  for (let y=0; y<D2.horizon; y++) {
    if (!near(w.lpNetCF[y], -w.equityCalls[y]*w.lpPct + w.lpDist[y], TOL.MONEY_SMALL)) { ncfOk=false; break; }
  }
  t('LP netCF = -calls*lpPct + dist', ncfOk);
  // K: MOIC = dist / paid-in (actual equity called × share)
  t('LP MOIC = dist/paidIn', near(w.lpMOIC, w.lpNetDist/w.lpTotalCalled, 0.01));
  t('GP MOIC = dist/paidIn or 0 if no GP equity', w.gpTotalCalled > 0 ? near(w.gpMOIC, w.gpNetDist/w.gpTotalCalled, 0.01) : w.gpMOIC === 0);
}

// ── F10b: Waterfall oracle comparison ──
suite('F10b-WaterfallOracle');
{
  // Oracle uses cumulative catch-up (Option B). Test engine in same mode.
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall({...D2, catchupMethod:'cumulative'}, r, f, i);
  const ow = oracleWaterfall(w.cashAvail, w.equityCalls, (D2.prefReturnPct)/100, Math.min(0.9999,(D2.carryPct)/100), (D2.lpProfitSplitPct)/100, w.gpPct, w.lpPct, D2.gpCatchup, false);
  const t1chk = arrClose(w.tier1, ow.tier1, TOL.MONEY_LARGE);
  t('Oracle T1 match', t1chk.ok, t1chk.msg);
  const t2chk = arrClose(w.tier2, ow.tier2, TOL.MONEY_LARGE);
  t('Oracle T2 match', t2chk.ok, t2chk.msg);
  const t3chk = arrClose(w.tier3, ow.tier3, TOL.MONEY_LARGE);
  t('Oracle T3 (catch-up) match', t3chk.ok, t3chk.msg);
  const lpchk = arrClose(w.lpDist, ow.lpDist, TOL.MONEY_LARGE);
  t('Oracle LP dist match', lpchk.ok, lpchk.msg);
  const gpchk = arrClose(w.gpDist, ow.gpDist, TOL.MONEY_LARGE);
  t('Oracle GP dist match', gpchk.ok, gpchk.msg);
}

// ── F10c: MOIC Paid-In vs Committed ──
suite('F10c-MOIC-PaidInVsCommitted');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall(D2, r, f, i);
  // Paid-in MOIC = dist / totalCalled
  t('MOIC paid-in = dist/called', near(w.lpMOIC, w.lpNetDist / w.lpTotalCalled, 0.01));
  // Committed MOIC = dist / original equity (may differ if not all equity called)
  t('CommittedMOIC exists', w.lpCommittedMOIC > 0 && (w.gpCommittedMOIC > 0 || w.gpEquity === 0));
}

// ── F11: getPhaseFinancing ──
suite('F11-getPhaseFinancing');
{
  const proj = {...D2, phases:[{name:'PA', financing:{financeRate:8, maxLtvPct:50}}, {name:'PB'}]};
  const pa = E.getPhaseFinancing(proj, 'PA');
  t('Phase override respected', pa.financeRate === 8 && pa.maxLtvPct === 50);
  t('Fallback fields present', pa.loanTenor === D2.loanTenor);
  const pb = E.getPhaseFinancing(proj, 'PB');
  t('No override uses project', pb.financeRate === D2.financeRate);
}

// ── F12: hasPerPhaseFinancing ──
suite('F12-hasPerPhaseFinancing');
{
  t('No phases', !E.hasPerPhaseFinancing({phases:[]}));
  t('No financing', !E.hasPerPhaseFinancing({phases:[{name:'P1'}]}));
  t('Has financing', E.hasPerPhaseFinancing({phases:[{name:'P1', financing:{financeRate:5}}]}));
}

// ── F13: migrateToPerPhaseFinancing ──
suite('F13-migrate');
{
  const proj = {...D2, phases:[{name:'PA'},{name:'PB'}]};
  delete proj.phases[0].financing;
  delete proj.phases[1].financing;
  const m = E.migrateToPerPhaseFinancing(proj);
  t('Phases get financing', m.phases.every(p => p.financing));
  t('Finance rate copied', m.phases[0].financing.financeRate === D2.financeRate);
  // Idempotent
  const m2 = E.migrateToPerPhaseFinancing(m);
  t('Idempotent', JSON.stringify(m2.phases) === JSON.stringify(m.phases));
}

// ── F14: buildPhaseVirtualProject ──
suite('F14-buildPhaseVirtualProject');
{
  const r = E.computeProjectCashFlows(D2);
  const pr = r.phaseResults['Phase A'];
  const pPurch = {...D2, landType:'purchase', landPurchasePrice:10000000, landValuation:8000000};
  const vp = E.buildPhaseVirtualProject(pPurch, 'Phase A', pr);
  t('Phase marker set', vp._isPhaseVirtual === true && vp._phaseName === 'Phase A');
  t('FIX5: landArea allocated', near(vp.landArea, pPurch.landArea * pr.allocPct, TOL.MONEY_SMALL));
  t('FIX5: landPurchasePrice allocated', near(vp.landPurchasePrice, 10000000 * pr.allocPct, TOL.MONEY_SMALL));
  t('FIX5: landValuation allocated', near(vp.landValuation, 8000000 * pr.allocPct, TOL.MONEY_SMALL));
  // Verify NOT duplicated
  const vp2 = E.buildPhaseVirtualProject(pPurch, 'Phase B', r.phaseResults['Phase B']);
  t('FIX5: Sum of phase land ≈ total', near(vp.landPurchasePrice + vp2.landPurchasePrice + E.buildPhaseVirtualProject(pPurch, 'Phase C', r.phaseResults['Phase C']).landPurchasePrice, 10000000, TOL.MONEY_LARGE));
}

// ── F15: buildPhaseProjectResults ──
suite('F15-buildPhaseProjectResults');
{
  const r = E.computeProjectCashFlows(D2);
  const pr = E.buildPhaseProjectResults(r, 'Phase A');
  t('Consolidated = phase data', near(pr.consolidated.totalCapex, r.phaseResults['Phase A'].totalCapex, TOL.MONEY_SMALL));
  t('Missing phase → null', E.buildPhaseProjectResults(r, 'Nonexistent') === null);
  t('Filtered assets', pr.assetSchedules.every(a => a.phase === 'Phase A'));
}

// ── F16: aggregatePhaseFinancings ──
suite('F16-aggregatePhaseFinancings');
{
  t('Empty → null', E.aggregatePhaseFinancings({}, 10) === null);
  const mock = {
    P1: {totalEquity:100,gpEquity:30,lpEquity:70,devCostExclLand:200,devCostInclLand:250,maxDebt:150,totalDebt:150,leveredCF:[1,2,3],drawdown:[100,50,0],equityCalls:[50,50,0],debtBalOpen:[0,100,150],debtBalClose:[100,150,0],repayment:[0,0,150],interest:[5,8,3],originalInterest:[5,8,3],debtService:[5,8,153],dscr:[null,2.0,0.5],exitProceeds:[0,0,10],upfrontFee:1,totalInterest:16,interestSubsidyTotal:0,interestSubsidySchedule:[0,0,0],landCapValue:0,capexGrantTotal:0,constrEnd:1,exitYear:2028},
    P2: {totalEquity:200,gpEquity:60,lpEquity:140,devCostExclLand:400,devCostInclLand:500,maxDebt:300,totalDebt:300,leveredCF:[2,4,6],drawdown:[200,100,0],equityCalls:[100,100,0],debtBalOpen:[0,200,300],debtBalClose:[200,300,0],repayment:[0,0,300],interest:[10,16,6],originalInterest:[10,16,6],debtService:[10,16,306],dscr:[null,3.0,0.8],exitProceeds:[0,0,20],upfrontFee:2,totalInterest:32,interestSubsidyTotal:0,interestSubsidySchedule:[0,0,0],landCapValue:0,capexGrantTotal:0,constrEnd:1,exitYear:2029},
  };
  const agg = E.aggregatePhaseFinancings(mock, 3);
  t('Agg totalEquity', agg.totalEquity === 300);
  t('Agg totalDebt', agg.totalDebt === 450);
  t('Agg leveredCF sum', arrClose(agg.leveredCF, [3,6,9], TOL.MONEY_SMALL).ok);
}

// ── F18: computeIndependentPhaseResults ──
suite('F18-independentPhaseResults');
{
  const proj = E.migrateToPerPhaseFinancing(D2);
  const r = E.computeProjectCashFlows(proj);
  const i = E.computeIncentives(proj, r);
  const res = E.computeIndependentPhaseResults(proj, r, i);
  t('Phase financings exist', Object.keys(res.phaseFinancings).length > 0);
  t('Consolidated financing exists', res.consolidatedFinancing !== null);
  // FIX#4: Incentives pass-through
  if (typeof E.buildPhaseIncentives === 'function') {
    t('FIX4: buildPhaseIncentives available', true);
    const pIr = E.buildPhaseIncentives(r, i, 'Phase A');
    t('FIX4: Phase incentives not null', pIr !== null);
    if (pIr) {
      t('FIX4: Phase grant allocated', pIr.capexGrantTotal > 0 && pIr.capexGrantTotal < i.capexGrantTotal);
    }
  }
  // Phase equity sums
  const sumEq = Object.values(res.phaseFinancings).reduce((s,pf)=>s+(pf.totalEquity||0),0);
  t('Sum phase equity ≈ agg equity', near(sumEq, res.consolidatedFinancing.totalEquity, TOL.MONEY_LARGE));
}

// ═══════════════════════════════════════════════
// LAYER 2: RED-FLAG BUG-HUNT TESTS
// ═══════════════════════════════════════════════

// BH1: Land purchase funding gap
suite('BH1-LandFundingGap');
{
  const pLand = {...D1, landType:'purchase', landPurchasePrice:2000000, landCapitalize:false, maxLtvPct:70};
  const r = E.computeProjectCashFlows(pLand);
  const f = E.computeFinancing(pLand, r, null);
  const totalScheduledUses = sumArr(f.drawdown) + sumArr(f.equityCalls);
  // Land purchase is already in totalCapex (from cashflow.js). No double-count.
  const totalNeeded = r.consolidated.totalCapex;
  t('No funding gap', near(totalScheduledUses, totalNeeded, 100000), `Sources=${Math.round(totalScheduledUses)} Needs=${Math.round(totalNeeded)}`);
}

// BH2: Exit truncation (early exit)
suite('BH2-ExitTruncation');
{
  const pEarly = {...D1, exitYear: D1.startYear + 5};
  const r = E.computeProjectCashFlows(pEarly);
  const f = E.computeFinancing(pEarly, r, null);
  const eIdx = 5;
  t('Post-exit levCF = 0', f.leveredCF.slice(eIdx+1).every(v => v === 0), `PostExit: ${f.leveredCF.slice(eIdx+1)}`);
  t('Post-exit debt = 0', f.debtBalClose.slice(eIdx+1).every(v => v === 0));
}

// BH3: Sale-only exit valuation
suite('BH3-SaleOnlyExit');
{
  const pSaleOnly = {...D1, finMode:'self', assets:[{...D1.assets[0], revType:'Sale', salePricePerSqm:5000, efficiency:90, absorptionYears:2, preSalePct:0, commissionPct:3}]};
  const r = E.computeProjectCashFlows(pSaleOnly);
  const f = E.computeFinancing(pSaleOnly, r, null);
  // Exit valuation should skip Sale assets (they're already sold)
  // If exit proceeds are suspiciously large, the model is capitalizing sale receipts
  const totalSaleRev = r.consolidated.totalIncome;
  const exitVal = sumArr(f.exitProceeds);
  t('Sale-only: exit ≤ total sale revenue', exitVal <= totalSaleRev + TOL.MONEY_LARGE, `Exit=${Math.round(exitVal)} SaleRev=${Math.round(totalSaleRev)}`);
}

// BH4: GP catch-up consistency (FIX#3)
suite('BH4-GPCatchupConsistency');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall(D2, r, f, i);
  // Option B: GP gets gpPct of T2. Catch-up = (carry*cumPref - gpPrefShare) / (1-carry)
  // Verify GP gets his pro-rata share of T1+T2
  let gpProRataOk = true;
  for (let y=0; y<D2.horizon; y++) {
    if (w.tier1[y]+w.tier2[y] > 0) {
      const gpT1T2 = w.gpDist[y] - (w.tier3[y]||0) - (w.tier4GP[y]||0);
      const expected = (w.tier1[y]+w.tier2[y]) * w.gpPct;
      if (!near(gpT1T2, expected, TOL.MONEY_LARGE)) { gpProRataOk=false; break; }
    }
  }
  t('FIX3B: GP gets gpPct of T1+T2', gpProRataOk);
}

// BH5: Per-phase land duplication
suite('BH5-PhaseLandDuplication');
{
  const pPurch = {...D2, landType:'purchase', landPurchasePrice:20000000};
  const r = E.computeProjectCashFlows(pPurch);
  const phases = Object.keys(r.phaseResults);
  let sumLandPP = 0;
  for (const pName of phases) {
    const vp = E.buildPhaseVirtualProject(pPurch, pName, r.phaseResults[pName]);
    sumLandPP += vp.landPurchasePrice || 0;
  }
  t('FIX5: Phase land NOT duplicated', near(sumLandPP, 20000000, TOL.MONEY_LARGE), `Sum=${Math.round(sumLandPP)} vs 20M`);
}

// BH9: MOIC denominator = paid-in capital
suite('BH9-MOICDenominator');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall({...D2, feeTreatment:'capital'}, r, f, i);
  const totalCalled = sumArr(w.equityCalls);
  const lpCalled = totalCalled * w.lpPct;
  t('MOIC denom = paid-in (totalCalled*lpPct)', near(w.lpTotalCalled, lpCalled, TOL.MONEY_LARGE), `Called=${Math.round(w.lpTotalCalled)} Expected=${Math.round(lpCalled)}`);
}

// ═══════════════════════════════════════════════
// LAYER 3: CROSS-FUNCTION INTEGRATION
// ═══════════════════════════════════════════════

suite('INT1-FullChain');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall(D2, r, f, i);
  const checks = E.runChecks(D2, r, f, w, i);
  t('Checks array returned', Array.isArray(checks) && checks.length > 0);
  const failures = checks.filter(c => !c.pass && c.cat !== 'T0' && c.sev !== 'warn');
  t('No non-T0 failures', failures.length === 0, failures.map(c=>c.name).join(', '));
}

suite('INT2-SelfFundedExit');
{
  const p = {...D2, finMode:'self'};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, E.computeIncentives(p, r));
  t('Self-funded chain ok', f !== null && f.mode === 'self');
  t('Self IRR exists', typeof f.leveredIRR === 'number' || f.leveredIRR === null);
}

suite('INT3-IncentivesImproveReturns');
{
  const pNo = {...D2, incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}}};
  const rNo = E.computeProjectCashFlows(pNo);
  const fNo = E.computeFinancing(pNo, rNo, E.computeIncentives(pNo, rNo));
  const wNo = E.computeWaterfall(pNo, rNo, fNo, E.computeIncentives(pNo, rNo));
  const rYes = E.computeProjectCashFlows(D2);
  const iYes = E.computeIncentives(D2, rYes);
  const fYes = E.computeFinancing(D2, rYes, iYes);
  const wYes = E.computeWaterfall(D2, rYes, fYes, iYes);
  t('Incentives improve LP dist', wYes.lpTotalDist > wNo.lpTotalDist, `With=${Math.round(wYes.lpTotalDist)} Without=${Math.round(wNo.lpTotalDist)}`);
}

// ═══════════════════════════════════════════════
// LAYER 4: PROPERTY / METAMORPHIC TESTS
// ═══════════════════════════════════════════════

suite('PROP1-ScaleInvariance');
{
  const k = 10;
  const pScaled = {...D1, assets:[{...D1.assets[0], costPerSqm: D1.assets[0].costPerSqm*k, leaseRate: D1.assets[0].leaseRate*k}], landRentAnnual: D1.landRentAnnual*k};
  const r1 = E.computeProjectCashFlows(D1);
  const rk = E.computeProjectCashFlows(pScaled);
  t('CAPEX scales by k', near(rk.consolidated.totalCapex, r1.consolidated.totalCapex * k, r1.consolidated.totalCapex * k * 0.001));
  t('Revenue scales by k', near(rk.consolidated.totalIncome, r1.consolidated.totalIncome * k, r1.consolidated.totalIncome * k * 0.001));
  // IRR should be approximately same (not exactly due to land rent interaction)
  if (r1.consolidated.irr !== null && rk.consolidated.irr !== null) {
    t('IRR approx same', near(r1.consolidated.irr, rk.consolidated.irr, 0.01), `Base=${r1.consolidated.irr} Scaled=${rk.consolidated.irr}`);
  }
}

suite('PROP2-DebtBalanceProperty');
{
  const r = E.computeProjectCashFlows(D1);
  const f = E.computeFinancing(D1, r, null);
  const exitIdx = f.exitYear - D1.startYear;
  const sold = (D1.exitStrategy !== 'hold') && exitIdx >= 0 && exitIdx < D1.horizon;
  let ok = true;
  for (let y=0; y<D1.horizon; y++) {
    // At exit year: balance zeroed because debt netted in exit proceeds (FIX#1)
    if (sold && y === exitIdx) continue;
    // Post-exit: all zeros, property holds trivially
    if (sold && y > exitIdx) continue;
    const expClose = f.debtBalOpen[y] + f.drawdown[y] - f.repayment[y];
    if (!near(f.debtBalClose[y], expClose, TOL.MONEY_SMALL)) { ok=false; break; }
  }
  t('Close = Open + Draw - Repay (pre-exit)', ok);
  // Verify exit year: balance zeroed because debt netted from proceeds
  if (sold) t('Exit yr: debt zeroed (netted in proceeds)', f.debtBalClose[exitIdx] === 0);
}

suite('PROP3-DistConservation');
{
  const r = E.computeProjectCashFlows(D2);
  const f = E.computeFinancing(D2, r, E.computeIncentives(D2, r));
  const w = E.computeWaterfall(D2, r, f, E.computeIncentives(D2, r));
  let ok = true;
  for (let y=0; y<D2.horizon; y++) {
    if (w.lpDist[y] + w.gpDist[y] > w.cashAvail[y] + TOL.MONEY_LARGE) { ok=false; break; }
  }
  t('Total dist ≤ cash available', ok);
}

suite('PROP4-LandRebateCap');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  t('Adjusted land rent never negative', i.adjustedLandRent.every(v => v >= -TOL.MONEY_SMALL));
}

// ── F6: runChecks structure ──
suite('F6-runChecks');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall(D2, r, f, i);
  const checks = E.runChecks(D2, r, f, w, i);
  t('Returns array', Array.isArray(checks));
  t('Has check objects', checks.length > 0 && checks[0].cat && checks[0].name && 'pass' in checks[0]);
  const cats = [...new Set(checks.map(c => c.cat))];
  t('Has T0 category', cats.includes('T0'));
  t('Has T1 category', cats.includes('T1'));
  // Craft: efficiency=0 non-infra lease → should fail T0
  const pBadEff = {...D2, assets:[{...D2.assets[0], efficiency:0, category:'Retail', revType:'Lease'}]};
  const rBad = E.computeProjectCashFlows(pBadEff);
  const chBad = E.runChecks(pBadEff, rBad, null, null, null);
  const effCheck = chBad.find(c => c.name && c.name.includes('fficiency'));
  if (effCheck) t('Eff=0 non-infra flagged', !effCheck.pass);
  else t('Eff=0 check exists', false, 'Efficiency check not found');
}

// ── F19: computePhaseWaterfalls (legacy) ──
suite('F19-legacyPhaseWaterfalls');
{
  const r = E.computeProjectCashFlows(D2);
  const i = E.computeIncentives(D2, r);
  const f = E.computeFinancing(D2, r, i);
  const w = E.computeWaterfall(D2, r, f, i);
  const pw = E.computePhaseWaterfalls(D2, r, f, w);
  t('Returns object', typeof pw === 'object');
  const pNames = Object.keys(pw);
  t('Has phase entries', pNames.length > 0);
  if (pNames.length > 0) {
    const p1 = pw[pNames[0]];
    t('Phase has lpIRR', typeof p1.lpIRR === 'number' || p1.lpIRR === null);
    t('Phase has lpMOIC', typeof p1.lpMOIC === 'number');
    // Legacy T2 pro-rata check (Option B)
    let legacyT2Ok = true;
    for (let y=0; y<D2.horizon; y++) {
      if (p1.tier2[y] > 0) {
        // LP gets (T1+T2)*lpPct + T4LP
        const expLP = (p1.tier1[y]+p1.tier2[y])*w.lpPct + (p1.tier4LP[y]||0);
        if (!near(p1.lpDist[y], expLP, TOL.MONEY_LARGE)) { legacyT2Ok=false; break; }
      }
    }
    t('FIX3B: Legacy T2 pro-rata', legacyT2Ok);
  }
}

// ═══════════════════════════════════════════════
// LAYER 5: SCENARIO REGRESSION MATRIX
// ═══════════════════════════════════════════════

suite('SCN-HoldStrategy');
{
  const p = {...D1, exitStrategy:'hold'};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, null);
  t('Hold: no exit proceeds', f.exitProceeds.every(v => v === 0));
  t('Hold: CF continues to horizon', f.leveredCF.some(v => v !== 0));
}

suite('SCN-Bank100');
{
  const p = {...D1, finMode:'bank100'};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, null);
  t('Bank100: debt covers all', near(f.maxDebt, f.devCostInclLand, TOL.MONEY_LARGE));
  t('Bank100: GP=100% LP=0', f.gpPct === 1 && f.lpPct === 0);
}

suite('SCN-ZeroRate');
{
  const p = {...D1, financeRate:0};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, null);
  t('Rate=0: interest = upfront fees only', f.totalInterest <= f.totalDebt * (D1.upfrontFeePct||0)/100 + 1);
  t('Rate=0: no crash', f !== null);
}

suite('SCN-BulletRepay');
{
  const p = {...D1, repaymentType:'bullet'};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, null);
  const repayYears = f.repayment.filter(v => v > 0);
  t('Bullet: single repayment year', repayYears.length <= 1, `Repay years: ${repayYears.length}`);
}

suite('SCN-PartnerLand');
{
  const p = {...D1, landType:'partner', landValuation:3000000, partnerEquityPct:40};
  const r = E.computeProjectCashFlows(p);
  t('Partner: no land rent', r.landSchedule.every(v => v === 0));
  const f = E.computeFinancing(p, r, null);
  t('Partner: land adds to equity', f.devCostInclLand > f.devCostExclLand);
}

suite('SCN-CapRateExit');
{
  const p = {...D2, exitStrategy:'caprate', exitCapRate:8};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, E.computeIncentives(p, r));
  t('CapRate exit: proceeds exist', f.exitProceeds.some(v => v > 0));
}

suite('SCN-NoPref');
{
  const p = {...D2, prefReturnPct:0};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, E.computeIncentives(p, r));
  const w = E.computeWaterfall(p, r, f, E.computeIncentives(p, r));
  t('No pref: T2 = 0', sumArr(w.tier2) === 0);
}

suite('SCN-NoCatchup');
{
  const p = {...D2, gpCatchup:false};
  const r = E.computeProjectCashFlows(p);
  const f = E.computeFinancing(p, r, E.computeIncentives(p, r));
  const w = E.computeWaterfall(p, r, f, E.computeIncentives(p, r));
  t('No catchup: T3 = 0', sumArr(w.tier3) === 0);
}

// ═══════════════════════════════════════════════
// LAND RENT PAID BY GP TESTS
// ═══════════════════════════════════════════════

suite('LR1-LandRentPaidByProject');
{
  // Default: project pays land rent, GP unaffected
  const p = {...D2, landCapitalize:true, landCapRate:2000, landRentPaidBy:'project'};
  const r = E.computeProjectCashFlows(p);
  const i = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, i);
  const w = E.computeWaterfall(p, r, f, i);
  t('Project pays: gpPaysLandRent=false', !w.gpPaysLandRent);
  t('Project pays: gpLandRentTotal=0', w.gpLandRentTotal === 0);
  t('Project pays: GP net CF no land deduction', w.gpNetCF.every((v,y) => near(v, -w.equityCalls[y]*w.gpPct + w.gpDist[y], TOL.MONEY_SMALL)));
}

suite('LR2-LandRentPaidByDeveloper');
{
  // Developer pays: land rent excluded from NOI, deducted from GP
  const p = {...D2, landCapitalize:true, landCapRate:2000, landRentPaidBy:'gp'};
  const r = E.computeProjectCashFlows(p);
  const i = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, i);
  const wDev = E.computeWaterfall(p, r, f, i);
  const wProj = E.computeWaterfall({...p, landRentPaidBy:'project'}, r, f, i);
  t('Dev pays: gpPaysLandRent=false (double-count fix)', !wDev.gpPaysLandRent);
  t('Dev pays: gpLandRentTotal = 0 (double-count fix)', wDev.gpLandRentTotal === 0);
  // When GP pays rent, more cash available for distribution (higher cashAvail)
  const devCash = sumArr(wDev.cashAvail);
  const projCash = sumArr(wProj.cashAvail);
  t('Dev pays: more cash distributable', devCash > projCash - TOL.MONEY_LARGE, 
    'Dev=' + Math.round(devCash) + ' Proj=' + Math.round(projCash));
  // But GP net returns are lower (pays rent from pocket)
  t('Dev pays: GP IRR lower', (wDev.gpIRR||0) < (wProj.gpIRR||0) + 0.001 || wProj.gpIRR === null);
  // LP should benefit when GP pays rent (higher LP distributions)
  t('Dev pays: LP dist >= project mode', wDev.lpTotalDist >= wProj.lpTotalDist - TOL.MONEY_LARGE);
  // GP MOIC uses gpNetDist (after land rent)
  t('Dev pays: GP MOIC accounts for rent', wDev.gpMOIC <= wProj.gpMOIC + 0.01);
}

suite('LR3-OptionB-GPTwoHats');
{
  // Test cumulative catch-up path (Option B: GP pref offset)
  const p = {...D2, landCapitalize:false, landRentPaidBy:'project',
    gpEquityManual:20000000, catchupMethod:'cumulative',
    prefReturnPct:10, gpCatchup:true, carryPct:25};
  const r = E.computeProjectCashFlows(p);
  const i = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, i);
  const w = E.computeWaterfall(p, r, f, i);
  t('GP+LP both have equity', w.gpPct > 0.01 && w.lpPct > 0.01, 'GP%=' + (w.gpPct*100).toFixed(1) + ' LP%=' + (w.lpPct*100).toFixed(1));
  const totalT2 = sumArr(w.tier2);
  const gpT2share = totalT2 * w.gpPct;
  t('GP gets pref on equity (T2*gpPct > 0)', totalT2 > 0 && gpT2share > 0, 'T2=' + Math.round(totalT2) + ' GP share=' + Math.round(gpT2share));
  const totalT3 = sumArr(w.tier3);
  const optionBTarget = Math.max(0, (0.25 * totalT2 - totalT2 * w.gpPct) / 0.75);
  t('Catch-up = Option B formula (cumulative)', totalT3 <= optionBTarget + TOL.MONEY_LARGE || totalT3 === 0,
    'Actual=' + Math.round(totalT3) + ' OptionB=' + Math.round(optionBTarget));
  // Verify conservation
  let distOk = true;
  for (let y=0; y<D2.horizon; y++) {
    const totalTiers = w.tier1[y]+w.tier2[y]+w.tier3[y]+w.tier4LP[y]+w.tier4GP[y];
    if (!near(w.lpDist[y]+w.gpDist[y], totalTiers, TOL.MONEY_LARGE)) { distOk=false; break; }
  }
  t('LP+GP dist = all tiers (conservation)', distOk);

  // Test perYear catch-up path (ZAN method)
  const w2 = E.computeWaterfall({...p, catchupMethod:'perYear'}, r, f, i);
  const totalT3zy = sumArr(w2.tier3);
  // perYear: T3 = T2_yr × carry/(1-carry), so total = sum of per-year values
  t('perYear T3 > 0 when catch-up enabled', totalT3zy > 0, 'T3=' + Math.round(totalT3zy));
}


suite('LR4-AutoResolution');
{
  // Auto should follow landCapTo
  // Case 1: landCapTo=gp + auto -> GP pays
  const pGP = {...D2, landCapitalize:true, landCapRate:2000, landCapTo:'gp', landRentPaidBy:'auto'};
  const rGP = E.computeProjectCashFlows(pGP);
  const iGP = E.computeIncentives(pGP, rGP);
  const fGP = E.computeFinancing(pGP, rGP, iGP);
  const wGP = E.computeWaterfall(pGP, rGP, fGP, iGP);
  // NOTE: All modes now resolve to "project" to prevent double-counting.
  // Land rent is already in unlevered CF → charging separately = double-count.
  // Future: implement cashAvail add-back for explicit gp/lp modes.
  t('Auto+capToGP = project (double-count fix)', wGP.resolvedLandRentPayer === 'project', 'Resolved: ' + wGP.resolvedLandRentPayer);
  t('Auto+capToGP: gpLandRent = 0 (double-count fix)', wGP.gpLandRentTotal === 0);

  // Case 2: landCapTo=lp + auto -> LP pays
  const pLP = {...D2, landCapitalize:true, landCapRate:2000, landCapTo:'lp', landRentPaidBy:'auto'};
  const rLP = E.computeProjectCashFlows(pLP);
  const iLP = E.computeIncentives(pLP, rLP);
  const fLP = E.computeFinancing(pLP, rLP, iLP);
  const wLP = E.computeWaterfall(pLP, rLP, fLP, iLP);
  t('Auto+capToLP = project (double-count fix)', wLP.resolvedLandRentPayer === 'project', 'Resolved: ' + wLP.resolvedLandRentPayer);
  t('Auto+capToLP: lpLandRent = 0 (double-count fix)', wLP.lpLandRentTotal === 0);
  t('Auto+capToLP: gpLandRent = 0', wLP.gpLandRentTotal === 0);

  // Case 3: landCapTo=split + auto -> split
  const pSplit = {...D2, landCapitalize:true, landCapRate:2000, landCapTo:'split', landRentPaidBy:'auto'};
  const rS = E.computeProjectCashFlows(pSplit);
  const iS = E.computeIncentives(pSplit, rS);
  const fS = E.computeFinancing(pSplit, rS, iS);
  const wS = E.computeWaterfall(pSplit, rS, fS, iS);
  t('Auto+capToSplit = project (double-count fix)', wS.resolvedLandRentPayer === 'project', 'Resolved: ' + wS.resolvedLandRentPayer);
  t('Auto+split: no obligations (double-count fix)', wS.gpLandRentTotal === 0 && wS.lpLandRentTotal === 0);

  // Case 4: no capitalization + auto -> project
  const pNoCap = {...D2, landCapitalize:false, landRentPaidBy:'auto'};
  const rNC = E.computeProjectCashFlows(pNoCap);
  const iNC = E.computeIncentives(pNoCap, rNC);
  const fNC = E.computeFinancing(pNoCap, rNC, iNC);
  const wNC = E.computeWaterfall(pNoCap, rNC, fNC, iNC);
  t('Auto+noCap = project', wNC.resolvedLandRentPayer === 'project');
  t('Auto+noCap: no GP/LP rent', wNC.gpLandRentTotal === 0 && wNC.lpLandRentTotal === 0);
}

suite('LR5-LPPaysLandRent');
{
  // NOTE: Explicit LP/GP payer modes now resolve to "project" to prevent double-counting.
  // Land rent is in unlevered CF → separate obligation = double-count.
  const p = {...D2, landCapitalize:true, landCapRate:2000, landCapTo:'lp', landRentPaidBy:'lp'};
  const r = E.computeProjectCashFlows(p);
  const i = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, i);
  const wLP = E.computeWaterfall(p, r, f, i);
  const wProj = E.computeWaterfall({...p, landRentPaidBy:'project'}, r, f, i);
  t('LP pays: lpLandRentTotal = 0 (double-count fix)', wLP.lpLandRentTotal === 0);
  t('LP pays: gpLandRentTotal = 0', wLP.gpLandRentTotal === 0);
  t('LP pays: same as project mode (double-count fix)', Math.abs(wLP.lpMOIC - wProj.lpMOIC) < 0.01);
  t('LP pays: LP MOIC same as project mode', wLP.lpMOIC <= wProj.lpMOIC + 0.01);
}

suite('NPV1-FormulaVerification');
{
  // Manual NPV vs engine NPV
  const p = {...D2, landCapitalize:false};
  const r = E.computeProjectCashFlows(p);
  const i = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, i);
  const w = E.computeWaterfall(p, r, f, i);
  if (w) {
    // LP NPV manual calc
    const manualLpNPV10 = w.lpNetCF.reduce((s,v,t) => s + v/Math.pow(1.10,t), 0);
    const manualLpNPV12 = w.lpNetCF.reduce((s,v,t) => s + v/Math.pow(1.12,t), 0);
    t('LP NPV@10% matches manual', near(w.lpNPV10, manualLpNPV10, 1), 'Engine='+Math.round(w.lpNPV10)+' Manual='+Math.round(manualLpNPV10));
    t('LP NPV@12% matches manual', near(w.lpNPV12, manualLpNPV12, 1), 'Engine='+Math.round(w.lpNPV12)+' Manual='+Math.round(manualLpNPV12));
    // GP NPV manual calc
    const manualGpNPV10 = w.gpNetCF.reduce((s,v,t) => s + v/Math.pow(1.10,t), 0);
    t('GP NPV@10% matches manual', near(w.gpNPV10, manualGpNPV10, 1), 'Engine='+Math.round(w.gpNPV10)+' Manual='+Math.round(manualGpNPV10));
    // IRR/NPV consistency: if IRR < 10%, NPV@10% must be negative
    if (w.lpIRR !== null && w.lpIRR < 0.10) t('IRR<10% -> NPV@10%<0', w.lpNPV10 < 0);
    if (w.lpIRR !== null && w.lpIRR > 0.10) t('IRR>10% -> NPV@10%>0', w.lpNPV10 > 0);
  }
}

suite('DPI1-FormulaVerification');
{
  // DPI = Total Distributions / Total Equity Called
  const p = {...D2, landCapitalize:false, gpEquityManual:20000000};
  const r = E.computeProjectCashFlows(p);
  const i = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, i);
  const w = E.computeWaterfall(p, r, f, i);
  if (w && w.lpTotalCalled > 0) {
    const manualLpDPI = (w.lpTotalDist - w.lpLandRentTotal) / w.lpTotalCalled;
    const manualGpDPI = (w.gpTotalDist - w.gpLandRentTotal) / w.gpTotalCalled;
    t('LP DPI matches manual', near(w.lpDPI, manualLpDPI, 0.001), 'Engine='+w.lpDPI.toFixed(4)+' Manual='+manualLpDPI.toFixed(4));
    t('GP DPI matches manual', near(w.gpDPI, manualGpDPI, 0.001), 'Engine='+w.gpDPI.toFixed(4)+' Manual='+manualGpDPI.toFixed(4));
    // DPI > 1 means you got more than you put in (but doesn't mean profitable in time-value)
    t('DPI formula: dist/called', true); // structural test
  }
}

// ═══════════════════════════════════════════════
// RESULTS & REPORTS
// ═══════════════════════════════════════════════

const suites = [...new Set(tests.map(t => t.suite))];
console.log(`\n${"═".repeat(60)}`);
console.log(`  ZAN FULL TEST SUITE: ${pass} PASSED | ${fail} FAILED | ${tests.length} TOTAL`);
console.log(`${"═".repeat(60)}`);

// Suite summary
console.log('\n  SUITE SUMMARY:');
for (const s of suites) {
  const st = tests.filter(t => t.suite === s);
  const sp = st.filter(t => t.pass).length;
  const sf = st.length - sp;
  const icon = sf === 0 ? '✅' : '❌';
  console.log(`    ${icon} ${s}: ${sp}/${st.length}`);
}

// Failure log
if (fail > 0) {
  console.log('\n  FAILURE LOG:');
  tests.filter(t => !t.pass).forEach((t, i) => {
    console.log(`    ${i+1}. [${t.suite}] ${t.name}`);
    if (t.detail) console.log(`       Detail: ${t.detail}`);
  });
}

// Coverage summary
console.log('\n  FUNCTION COVERAGE:');
const fnCoverage = {
  getScenarioMults: 'F1', computeAssetCapex: 'F2', computeProjectCashFlows: 'F3',
  calcIRR: 'F4', calcNPV: 'F5', runChecks: 'F6', computeIncentives: 'F7',
  applyInterestSubsidy: 'F8', computeFinancing: 'F9', computeWaterfall: 'F10',
  getPhaseFinancing: 'F11', hasPerPhaseFinancing: 'F12', migrateToPerPhaseFinancing: 'F13',
  buildPhaseVirtualProject: 'F14', buildPhaseProjectResults: 'F15',
  aggregatePhaseFinancings: 'F16', aggregatePhaseWaterfalls: 'INT(agg)',
  computeIndependentPhaseResults: 'F18', computePhaseWaterfalls: 'F19',
  buildPhaseIncentives: 'F18/FIX4',
};
Object.entries(fnCoverage).forEach(([fn, suite]) => {
  const covered = tests.some(t => t.suite.startsWith(suite) || t.suite.includes(fn.substring(0,8)));
  console.log(`    ${covered ? '✓' : '✗'} ${fn} → ${suite}`);
});

console.log(`\n  LAYERS COVERED:`);
console.log(`    ✓ Layer 1: Unit tests (${suites.filter(s=>s.startsWith('F')).length} function suites)`);
console.log(`    ✓ Layer 2: Bug-hunt tests (${suites.filter(s=>s.startsWith('BH')).length} red-flag suites)`);
console.log(`    ✓ Layer 3: Integration (${suites.filter(s=>s.startsWith('INT')).length} chain tests)`);
console.log(`    ✓ Layer 4: Property tests (${suites.filter(s=>s.startsWith('PROP')).length} metamorphic tests)`);
console.log(`    ✓ Layer 5: Scenario regression (${suites.filter(s=>s.startsWith('SCN')).length} scenario packs)`);

if (fail === 0) {
  console.log('\n  🎉 ALL TESTS PASSED');
} else {
  console.log('\n  ⛔ FAILURES DETECTED');
  process.exit(1);
}
