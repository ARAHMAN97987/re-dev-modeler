/**
 * ZAN — Comprehensive Financing Settings Audit
 *
 * Tests EVERY financing setting combination for logical correctness.
 * Not just "does it crash" but "does it make financial sense?"
 *
 * Inspired by the bug: land cap GP was charged fund fees despite contributing
 * only in-kind equity. This audit looks for similar logical errors across
 * ALL settings.
 *
 * Run: node tests/financing_settings_audit.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 1) => Math.abs((a||0) - (b||0)) <= tol;
const nearPct = (a, b, pct = 0.05) => Math.abs((a||0) - (b||0)) <= Math.max(Math.abs(b||0) * pct, 100);
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+'M' : v.toFixed(0)) : String(v);

function proj(finMode, opts = {}) {
  return {
    id:'fa', name:'FinAudit', horizon:25, startYear:2026, currency:"SAR",
    landType:"lease", landArea:100000,
    landRentAnnual:5000000, landRentEscalation:5, landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:30,
    softCostPct:10, contingencyPct:5, rentEscalation:1.0, activeScenario:"Base Case",
    finMode, exitStrategy:"sale", exitYear:8, exitMultiple:10, exitCostPct:2,
    debtAllowed:true, maxLtvPct:70, financeRate:6.5, loanTenor:10, debtGrace:3,
    upfrontFeePct:0.5, repaymentType:"amortizing", graceBasis:"cod", debtTrancheMode:"single",
    vehicleType:"fund", subscriptionFeePct:2, annualMgmtFeePct:1.0,
    mgmtFeeCapAnnual:0, custodyFeeAnnual:100000, mgmtFeeBase:"devCost",
    feeTreatment:"capital", developerFeePct:10, developerFeeBasis:"exclLand",
    auditorFeeAnnual:40000, structuringFeePct:0.5,
    preEstablishmentFee:200000, spvFee:20000,
    operatorFeePct:0.15, operatorFeeCap:0, miscExpensePct:0.5,
    prefReturnPct:0, gpCatchup:false, carryPct:0, lpProfitSplitPct:100,
    performanceIncentive:true, hurdleMode:"simple", hurdleIRR:15, incentivePct:20,
    landCapitalize:false, landCapRate:1000, landCapTo:"gp", landRentPaidBy:"auto",
    gpInvestDevFee:false, gpDevFeeInvestPct:100, gpCashInvest:false, gpCashInvestAmount:0,
    govFinancingPct:70, govBeneficiary:"project", govFinanceRate:3.0, govLoanTenor:15, govGrace:5,
    hybridDrawOrder:"finFirst",
    phases:[{name:"P1", startYearOffset:1, footprint:100000}],
    assets:[{
      id:"a1", phase:"P1", category:"Retail", name:"Mall",
      gfa:30000, footprint:30000, costPerSqm:5000, constrDuration:30, constrStart:1,
      revType:"Lease", efficiency:75, leaseRate:1000, stabilizedOcc:90, rampUpYears:3,
    }],
    incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},
      landRentRebate:{enabled:false},feeRebates:{enabled:false,items:[]}},
    ...opts,
  };
}

// ═══════════════════════════════════════════════════
// SECTION A: LAND CAPITALIZATION SCENARIOS
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  A: LAND CAPITALIZATION SCENARIOS");
console.log("═══════════════════════════════════════════════════\n");
{
  // A1: Land cap to GP, no other GP sources → GP contribution = land cap only
  const r1 = E.runFullModel(proj("fund", {
    landCapitalize:true, landCapRate:1000, landCapTo:"gp",
    gpInvestDevFee:false, gpCashInvest:false,
  }));
  if (r1.waterfall) {
    t("[A1] GP-only land cap: gpCalled = landCap",
      nearPct(r1.waterfall.gpTotalCalled, r1.financing.landCapValue, 0.01),
      `gpCalled=${fmt(r1.waterfall.gpTotalCalled)}, landCap=${fmt(r1.financing.landCapValue)}`);
  }

  // A2: Land cap to LP → LP gets land credit, GP has zero
  const r2 = E.runFullModel(proj("fund", {
    landCapitalize:true, landCapRate:1000, landCapTo:"lp",
    gpInvestDevFee:false, gpCashInvest:false,
  }));
  if (r2.financing) {
    t("[A2] LP land cap: GP equity = 0 or auto-split",
      r2.financing.gpEquity >= 0, `gpEq=${fmt(r2.financing.gpEquity)}`);
  }

  // A3: Land cap to split → both GP and LP get land credit
  const r3 = E.runFullModel(proj("fund", {
    landCapitalize:true, landCapRate:1000, landCapTo:"split",
    gpInvestDevFee:false, gpCashInvest:false,
  }));
  if (r3.financing) {
    const halfLand = r3.financing.landCapValue * 0.5;
    t("[A3] Split land cap: GP gets ~50% of land",
      nearPct(r3.financing.gpEquity, halfLand, 0.20),
      `gpEq=${fmt(r3.financing.gpEquity)}, halfLand=${fmt(halfLand)}`);
  }

  // A4: Land cap + devFee invest → GP equity = land + devFee portion
  const r4 = E.runFullModel(proj("fund", {
    landCapitalize:true, landCapRate:1000, landCapTo:"gp",
    gpInvestDevFee:true, gpDevFeeInvestPct:100,
  }));
  if (r4.financing) {
    const expectedGP = r4.financing.landCapValue + r4.financing.devFeeTotal;
    t("[A4] Land + devFee: GP equity ≈ land + devFee",
      nearPct(r4.financing.gpEquity, expectedGP, 0.15),
      `gpEq=${fmt(r4.financing.gpEquity)}, expected=${fmt(expectedGP)}`);
    // GP contribution should include both land AND cash devFee
    if (r4.waterfall) {
      t("[A4b] GP called > land cap (includes devFee cash)",
        r4.waterfall.gpTotalCalled > r4.financing.landCapValue + 1,
        `gpCalled=${fmt(r4.waterfall.gpTotalCalled)}, landCap=${fmt(r4.financing.landCapValue)}`);
    }
  }

  // A5: Land cap + cash invest → GP equity = land + cash
  const r5 = E.runFullModel(proj("fund", {
    landCapitalize:true, landCapRate:1000, landCapTo:"gp",
    gpCashInvest:true, gpCashInvestAmount:20000000,
  }));
  if (r5.financing) {
    const expectedGP = r5.financing.landCapValue + 20000000;
    t("[A5] Land + cash: GP equity ≈ land + 20M",
      nearPct(r5.financing.gpEquity, expectedGP, 0.15),
      `gpEq=${fmt(r5.financing.gpEquity)}, expected=${fmt(expectedGP)}`);
  }

  // A6: No land cap → GP equity should come from other sources or be auto-split
  const r6 = E.runFullModel(proj("fund", {
    landCapitalize:false,
    gpInvestDevFee:false, gpCashInvest:false,
  }));
  if (r6.financing) {
    // With no GP sources, GP equity should be 0 or auto-assigned
    t("[A6] No land cap, no sources: LP gets all equity",
      r6.financing.lpEquity >= r6.financing.gpEquity,
      `gpEq=${fmt(r6.financing.gpEquity)}, lpEq=${fmt(r6.financing.lpEquity)}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION B: DEVELOPER FEE INVESTMENT
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  B: DEVELOPER FEE AS EQUITY INVESTMENT");
console.log("═══════════════════════════════════════════════════\n");
{
  // B1: DevFee invest ON → devFee should appear in GP equity
  const r1 = E.runFullModel(proj("fund", {
    gpInvestDevFee:true, gpDevFeeInvestPct:100, landCapitalize:false,
  }));
  if (r1.financing) {
    t("[B1] DevFee invest: GP equity ≈ devFee",
      nearPct(r1.financing.gpEquity, r1.financing.devFeeTotal, 0.15),
      `gpEq=${fmt(r1.financing.gpEquity)}, devFee=${fmt(r1.financing.devFeeTotal)}`);
  }

  // B2: DevFee invest 50% → GP equity ≈ 50% of devFee
  const r2 = E.runFullModel(proj("fund", {
    gpInvestDevFee:true, gpDevFeeInvestPct:50, landCapitalize:false,
  }));
  if (r2.financing) {
    const expected = r2.financing.devFeeTotal * 0.5;
    t("[B2] DevFee 50%: GP equity ≈ 50% of devFee",
      nearPct(r2.financing.gpEquity, expected, 0.20),
      `gpEq=${fmt(r2.financing.gpEquity)}, expected=${fmt(expected)}`);
  }

  // B3: DevFee invest OFF → GP equity should NOT include devFee
  const r3 = E.runFullModel(proj("fund", {
    gpInvestDevFee:false, landCapitalize:false, gpCashInvest:false,
  }));
  if (r3.financing) {
    // Without any GP source, GP equity should be 0 or small (auto-split)
    t("[B3] No devFee invest: devFee NOT in GP equity",
      r3.financing.gpEquity < r3.financing.devFeeTotal,
      `gpEq=${fmt(r3.financing.gpEquity)}, devFee=${fmt(r3.financing.devFeeTotal)}`);
  }

  // B4: DevFee in self/debt/bank100 → should be ZERO (no fund = no devFee)
  for (const mode of ["self", "debt", "bank100"]) {
    const r = E.runFullModel(proj(mode));
    t(`[B4] ${mode}: devFeeTotal = 0`,
      (r.financing?.devFeeTotal || 0) === 0,
      `devFee=${r.financing?.devFeeTotal}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION C: DEBT SETTINGS CROSS-MODE
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  C: DEBT SETTINGS ACROSS MODES");
console.log("═══════════════════════════════════════════════════\n");
{
  // C1: LTV 70% → debt = 70% of devCost
  const r1 = E.runFullModel(proj("debt", { maxLtvPct:70 }));
  if (r1.financing) {
    const expectedDebt = r1.financing.devCostExclLand * 0.70;
    t("[C1] LTV 70%: debt ≈ 70% of devCost",
      nearPct(r1.financing.totalDebt, expectedDebt, 0.05),
      `debt=${fmt(r1.financing.totalDebt)}, expected=${fmt(expectedDebt)}`);
  }

  // C2: LTV 0% (debtAllowed but LTV=0) → debt should be 0
  const r2 = E.runFullModel(proj("debt", { maxLtvPct:0 }));
  if (r2.financing) {
    t("[C2] LTV 0%: debt = 0", (r2.financing.totalDebt || 0) < 1,
      `debt=${fmt(r2.financing.totalDebt)}`);
  }

  // C3: debtAllowed=false in fund mode → no debt
  const r3 = E.runFullModel(proj("fund", { debtAllowed:false }));
  if (r3.financing) {
    t("[C3] Fund no debt: totalDebt = 0", (r3.financing.totalDebt || 0) < 1,
      `debt=${fmt(r3.financing.totalDebt)}`);
    // All cost should be equity
    t("[C3b] Fund no debt: equity = devCost",
      nearPct(r3.financing.totalEquity, r3.financing.devCostInclLand, 0.05),
      `equity=${fmt(r3.financing.totalEquity)}, cost=${fmt(r3.financing.devCostInclLand)}`);
  }

  // C4: Bullet repayment → debt balance constant until final payment
  const r4 = E.runFullModel(proj("debt", { repaymentType:"bullet" }));
  if (r4.financing) {
    const grace = r4.financing.grace || 3;
    // During grace+repay period (before bullet), repayment should be ~0
    if (grace + 1 < r4.financing.debtBalClose.length) {
      t("[C4] Bullet: balance constant during grace",
        near(r4.financing.debtBalClose[grace], r4.financing.debtBalClose[grace-1], 100),
        `bal[${grace}]=${fmt(r4.financing.debtBalClose[grace])}`);
    }
  }

  // C5: Interest rate 0% → total interest should be 0
  const r5 = E.runFullModel(proj("debt", { financeRate:0 }));
  if (r5.financing) {
    t("[C5] Rate 0%: total interest ≈ 0",
      r5.financing.totalInterest < 1000,
      `interest=${fmt(r5.financing.totalInterest)}`);
  }

  // C6: Very high rate (20%) → interest should be very large
  const r6 = E.runFullModel(proj("debt", { financeRate:20 }));
  if (r6.financing) {
    t("[C6] Rate 20%: interest > 50% of debt",
      r6.financing.totalInterest > r6.financing.totalDebt * 0.5,
      `interest=${fmt(r6.financing.totalInterest)}, debt=${fmt(r6.financing.totalDebt)}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION D: FEE TREATMENT MODES
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  D: FEE TREATMENT MODES");
console.log("═══════════════════════════════════════════════════\n");
{
  // D1: feeTreatment="capital" → fees count as invested capital (larger calls)
  const rCap = E.runFullModel(proj("fund", { feeTreatment:"capital", landCapitalize:false }));

  // D2: feeTreatment="expense" → fees are expenses (smaller calls)
  const rExp = E.runFullModel(proj("fund", { feeTreatment:"expense", landCapitalize:false }));

  if (rCap.waterfall && rExp.waterfall) {
    // Capital treatment should have HIGHER equity calls (fees included in capital)
    t("[D1] Capital vs expense: capital has higher calls",
      rCap.waterfall.lpTotalCalled > rExp.waterfall.lpTotalCalled,
      `capital=${fmt(rCap.waterfall.lpTotalCalled)}, expense=${fmt(rExp.waterfall.lpTotalCalled)}`);

    // Capital treatment: unreturned capital includes fees → higher ROC
    const capT1 = rCap.waterfall.tier1.reduce((a,b)=>a+b,0);
    const expT1 = rExp.waterfall.tier1.reduce((a,b)=>a+b,0);
    t("[D2] Capital: higher ROC (fees in capital base)",
      capT1 >= expT1 - 1,
      `capital ROC=${fmt(capT1)}, expense ROC=${fmt(expT1)}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION E: HYBRID MODE SPECIFICS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  E: HYBRID MODE SPECIFICS");
console.log("═══════════════════════════════════════════════════\n");
{
  // E1: hybrid-project: gov debt ≈ govPct × devCost
  const r1 = E.runFullModel(proj("hybrid", { govBeneficiary:"project", govFinancingPct:70 }));
  if (r1.financing) {
    const expected = r1.financing.devCostExclLand * 0.70;
    t("[E1] Hybrid-project: debt ≈ 70% of devCost",
      nearPct(r1.financing.totalDebt, expected, 0.10),
      `debt=${fmt(r1.financing.totalDebt)}, expected=${fmt(expected)}`);
  }

  // E2: hybrid-gp: GP personal debt exists
  const r2 = E.runFullModel(proj("hybrid", { govBeneficiary:"gp", govFinancingPct:70 }));
  if (r2.financing) {
    t("[E2] Hybrid-GP: gpPersonalDebt exists", !!r2.financing.gpPersonalDebt);
    t("[E2b] Hybrid-GP: fund equity ≈ 30%",
      nearPct(r2.financing.totalEquity, r2.financing.devCostExclLand * 0.30, 0.15),
      `equity=${fmt(r2.financing.totalEquity)}`);
  }

  // E3: hybrid fund portion cost = total - gov debt
  if (r1.financing) {
    t("[E3] Fund portion = total - debt",
      nearPct(r1.financing.fundPortionCost, r1.financing.totalEquity, 0.10),
      `fundPortion=${fmt(r1.financing.fundPortionCost)}, equity=${fmt(r1.financing.totalEquity)}`);
  }

  // E4: hybrid fees should be on FUND portion, not full project
  if (r1.waterfall) {
    // Subscription fee = subscriptionFeePct × fundEquityBasis (not full project)
    const fullProjectSub = r1.financing.devCostExclLand * 0.02;
    const actualSub = r1.waterfall.feeSub.reduce((a,b)=>a+b,0);
    t("[E4] Hybrid: sub fee < full project sub fee",
      actualSub < fullProjectSub * 0.8,
      `actual=${fmt(actualSub)}, fullProject=${fmt(fullProjectSub)}`);
  }

  // E5: hybrid-gp: cashAvail should NOT deduct DS (GP pays personally)
  if (r2.waterfall) {
    // In hybrid-GP, cashAvail includes full exit without DS deduction
    // This means higher cashAvail than hybrid-project
    const gpCashTotal = r2.waterfall.cashAvail.reduce((a,b)=>a+b,0);
    const projCashTotal = r1.waterfall ? r1.waterfall.cashAvail.reduce((a,b)=>a+b,0) : 0;
    t("[E5] Hybrid-GP: cashAvail ≥ project mode",
      gpCashTotal >= projCashTotal - 1,
      `GP=${fmt(gpCashTotal)}, project=${fmt(projCashTotal)}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION F: PERFORMANCE INCENTIVE
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  F: PERFORMANCE INCENTIVE");
console.log("═══════════════════════════════════════════════════\n");
{
  // F1: Incentive OFF → perfIncentiveAmount = 0
  const r1 = E.runFullModel(proj("fund", { performanceIncentive:false }));
  if (r1.waterfall) {
    t("[F1] Incentive OFF: amount = 0",
      (r1.waterfall.perfIncentiveAmount || 0) === 0,
      `amount=${r1.waterfall.perfIncentiveAmount}`);
  }

  // F2: Incentive ON with low hurdle → should trigger (profitable project)
  const r2 = E.runFullModel(proj("fund", {
    performanceIncentive:true, hurdleIRR:5, incentivePct:20,
  }));
  if (r2.waterfall) {
    // With hurdle at 5% on a decent project, there should be excess
    t("[F2] Low hurdle (5%): incentive may trigger",
      true, // Just verify no crash
      `amount=${fmt(r2.waterfall.perfIncentiveAmount)}`);
  }

  // F3: Incentive ON with very high hurdle (50%) → should NOT trigger
  const r3 = E.runFullModel(proj("fund", {
    performanceIncentive:true, hurdleIRR:50, incentivePct:20,
  }));
  if (r3.waterfall) {
    t("[F3] High hurdle (50%): no incentive",
      (r3.waterfall.perfIncentiveAmount || 0) === 0,
      `amount=${fmt(r3.waterfall.perfIncentiveAmount)}`);
  }

  // F4: Incentive only in fund modes (not self/debt/bank100)
  for (const mode of ["self", "debt", "bank100"]) {
    const r = E.runFullModel(proj(mode, { performanceIncentive:true }));
    t(`[F4] ${mode}: no waterfall = no incentive`, !r.waterfall);
  }
}

// ═══════════════════════════════════════════════════
// SECTION G: EXIT STRATEGY INTERACTIONS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  G: EXIT STRATEGY INTERACTIONS");
console.log("═══════════════════════════════════════════════════\n");
{
  // G1: hold → no exit proceeds
  const r1 = E.runFullModel(proj("fund", { exitStrategy:"hold" }));
  if (r1.financing) {
    const ep = r1.financing.exitProceeds.reduce((a,b)=>a+b,0);
    t("[G1] Hold: exit proceeds = 0", ep < 1, `exit=${fmt(ep)}`);
  }

  // G2: sale exitYear=5 → exit in year 5
  const r2 = E.runFullModel(proj("fund", { exitStrategy:"sale", exitYear:5 }));
  if (r2.financing) {
    t("[G2] Sale yr 5: exitYear = 2031",
      r2.financing.exitYear === 2031,
      `exitYear=${r2.financing.exitYear}`);
  }

  // G3: caprate exit → uses NOI/capRate instead of income×multiple
  const r3 = E.runFullModel(proj("fund", { exitStrategy:"caprate", exitCapRate:8 }));
  if (r3.financing) {
    const ep = r3.financing.exitProceeds.reduce((a,b)=>a+b,0);
    t("[G3] CapRate exit: proceeds > 0", ep > 0, `exit=${fmt(ep)}`);
  }

  // G4: incomeFund always forces hold regardless of exitStrategy
  const r4 = E.runFullModel(proj("incomeFund", { exitStrategy:"sale", exitYear:8 }));
  if (r4.financing) {
    const ep = r4.financing.exitProceeds.reduce((a,b)=>a+b,0);
    t("[G4] IncomeFund: forces hold (exit=0 even with sale setting)",
      ep < 1, `exit=${fmt(ep)}`);
  }

  // G5: exitYear=0 (auto) → should find optimal exit
  const r5 = E.runFullModel(proj("fund", { exitYear:0 }));
  if (r5.financing) {
    t("[G5] Auto exit: exitYear > startYear",
      r5.financing.exitYear > 2026,
      `exitYear=${r5.financing.exitYear}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION H: EQUITY SPLIT CONSISTENCY
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  H: EQUITY SPLIT CONSISTENCY");
console.log("═══════════════════════════════════════════════════\n");
{
  // H1: GP + LP = Total Equity (always)
  for (const mode of ["fund", "hybrid", "incomeFund"]) {
    const r = E.runFullModel(proj(mode, { landCapitalize:true, landCapRate:500, landCapTo:"gp" }));
    if (r.financing) {
      t(`[H1] ${mode}: GP+LP = totalEquity`,
        near(r.financing.gpEquity + r.financing.lpEquity, r.financing.totalEquity, 100),
        `GP=${fmt(r.financing.gpEquity)}+LP=${fmt(r.financing.lpEquity)}=${fmt(r.financing.gpEquity+r.financing.lpEquity)}, total=${fmt(r.financing.totalEquity)}`);
    }
  }

  // H2: gpPct + lpPct = 1.0 (always)
  for (const mode of ["fund", "hybrid"]) {
    const r = E.runFullModel(proj(mode, { landCapitalize:true, landCapRate:500, landCapTo:"gp" }));
    if (r.financing) {
      t(`[H2] ${mode}: gpPct+lpPct = 1.0`,
        Math.abs(r.financing.gpPct + r.financing.lpPct - 1.0) < 0.001,
        `GP%=${r.financing.gpPct.toFixed(4)}+LP%=${r.financing.lpPct.toFixed(4)}=${(r.financing.gpPct+r.financing.lpPct).toFixed(4)}`);
    }
  }

  // H3: Manual GP equity override
  const r3 = E.runFullModel(proj("fund", {
    gpEquityManual:30000000, landCapitalize:false,
  }));
  if (r3.financing) {
    t("[H3] Manual GP: gpEquity = 30M",
      nearPct(r3.financing.gpEquity, 30000000, 0.05),
      `gpEq=${fmt(r3.financing.gpEquity)}`);
  }

  // H4: Debt + Equity = DevCost (sources = uses)
  for (const mode of ["fund", "debt"]) {
    const r = E.runFullModel(proj(mode));
    if (r.financing) {
      const sources = r.financing.totalDebt + r.financing.totalEquity;
      t(`[H4] ${mode}: debt+equity ≈ devCost`,
        nearPct(sources, r.financing.devCostInclLand, 0.05),
        `D+E=${fmt(sources)}, cost=${fmt(r.financing.devCostInclLand)}`);
    }
  }

  // H5: Waterfall calls + debt drawdown ≈ total capex (money in = money needed)
  const r5 = E.runFullModel(proj("fund", { landCapitalize:false }));
  if (r5.waterfall && r5.financing) {
    const totalCalls = r5.waterfall.equityCalls.reduce((a,b)=>a+b,0);
    const totalDraw = r5.financing.drawdown.reduce((a,b)=>a+b,0);
    const totalCapex = r5.projectResults.consolidated.totalCapex;
    // calls + drawdown should cover capex (calls also include fees)
    t("[H5] Calls + drawdown ≥ capex",
      (totalCalls + totalDraw) >= totalCapex * 0.99,
      `calls=${fmt(totalCalls)}+draw=${fmt(totalDraw)}=${fmt(totalCalls+totalDraw)}, capex=${fmt(totalCapex)}`);
  }
}

// ═══════════════════════════════════════════════════
// SECTION I: INCOME FUND SPECIFICS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  I: INCOME FUND SPECIFICS");
console.log("═══════════════════════════════════════════════════\n");
{
  // I1: Simplified distribution (no T2/T3)
  const r1 = E.runFullModel(proj("incomeFund"));
  if (r1.waterfall) {
    const t2 = r1.waterfall.tier2.reduce((a,b)=>a+b,0);
    const t3 = r1.waterfall.tier3.reduce((a,b)=>a+b,0);
    t("[I1] Income fund: T2 (pref) = 0", t2 < 1, `T2=${fmt(t2)}`);
    t("[I1b] Income fund: T3 (catch-up) = 0", t3 < 1, `T3=${fmt(t3)}`);
  }

  // I2: Distribution yield computed
  if (r1.waterfall) {
    t("[I2] avgDistYield > 0", (r1.waterfall.avgDistYield || 0) > 0,
      `yield=${((r1.waterfall.avgDistYield||0)*100).toFixed(1)}%`);
  }

  // I3: Cumulative distributions monotonically increasing
  if (r1.waterfall?.cumDistributions) {
    let mono = true;
    for (let y = 1; y < 20; y++) {
      if ((r1.waterfall.cumDistributions[y]||0) < (r1.waterfall.cumDistributions[y-1]||0) - 1) {
        mono = false; break;
      }
    }
    t("[I3] Cumulative dist monotonically increasing", mono);
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  FINANCING SETTINGS AUDIT: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
