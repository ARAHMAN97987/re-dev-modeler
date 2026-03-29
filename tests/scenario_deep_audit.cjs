/**
 * ZAN — Scenario Deep Audit
 *
 * For each scenario (bank100, hybrid, fund), trace EVERY displayed number
 * and verify it makes financial sense.
 *
 * Run: node tests/scenario_deep_audit.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+'M' : Math.round(v).toLocaleString()) : String(v);
const pct = v => (v * 100).toFixed(2) + '%';

// ═══ Realistic Saudi project: mixed-use, 550M total ═══
function buildBigProject(finMode, opts = {}) {
  return {
    id: `scenario-${finMode}`, name: `Scenario ${finMode}`,
    horizon: 30, startYear: 2026, currency: "SAR",
    landType: "lease", landArea: 80000,
    landRentAnnual: 4000000, landRentEscalation: 5, landRentEscalationEveryN: 5,
    landRentGrace: 3, landRentTerm: 30,
    softCostPct: 12, contingencyPct: 5,
    rentEscalation: 1.0, activeScenario: "Base Case",
    finMode,
    exitStrategy: "sale", exitYear: 10, exitMultiple: 12, exitCapRate: 8, exitCostPct: 2.5,
    phases: [{ name: "Phase 1", startYearOffset: 1, footprint: 80000 }],
    assets: [
      { id: "a1", phase: "Phase 1", category: "Retail", name: "Mall",
        gfa: 40000, footprint: 40000, costPerSqm: 5000, constrDuration: 30, constrStart: 1,
        revType: "Lease", efficiency: 75, leaseRate: 900, stabilizedOcc: 92, rampUpYears: 3 },
      { id: "a2", phase: "Phase 1", category: "Office", name: "Office Tower",
        gfa: 30000, footprint: 30000, costPerSqm: 6000, constrDuration: 36, constrStart: 1,
        revType: "Lease", efficiency: 80, leaseRate: 700, stabilizedOcc: 88, rampUpYears: 4 },
    ],
    // Debt
    debtAllowed: true, maxLtvPct: finMode === "bank100" ? 100 : 70,
    financeRate: 6.5, loanTenor: 12, debtGrace: 4, upfrontFeePct: 0.5,
    repaymentType: "amortizing", graceBasis: "cod",
    debtTrancheMode: "single",
    // Fund
    vehicleType: "fund", subscriptionFeePct: 2, annualMgmtFeePct: 0.9,
    custodyFeeAnnual: 150000, mgmtFeeBase: "devCost", feeTreatment: "capital",
    developerFeePct: 10, developerFeeBasis: "exclLand", auditorFeeAnnual: 50000,
    structuringFeePct: 0.15, landCapitalize: false, landCapRate: 1000,
    landCapTo: "gp", landRentPaidBy: "auto",
    prefReturnPct: 12, gpCatchup: true, carryPct: 25, lpProfitSplitPct: 75,
    catchupMethod: "perYear",
    performanceIncentive: true, hurdleMode: "simple", hurdleIRR: 12, incentivePct: 20,
    // Hybrid
    govFinancingPct: 70, govBeneficiary: "project", govFinanceRate: 3.5,
    govLoanTenor: 15, govGrace: 5, govRepaymentType: "amortizing",
    govUpfrontFeePct: 0.25, hybridDrawOrder: "finFirst",
    // Incentives off
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false },
      landRentRebate: { enabled: false }, feeRebates: { enabled: false, items: [] } },
    ...opts,
  };
}

// ═══════════════════════════════════════════════════
// SCENARIO 1: BANK 100%
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  SCENARIO 1: BANK 100%");
console.log("═══════════════════════════════════════════════════\n");
{
  const project = buildBigProject("bank100");
  const result = E.runFullModel(project);
  const { projectResults: pr, financing: f } = result;
  const c = pr.consolidated;
  const h = project.horizon;

  console.log("  Project Summary:");
  console.log(`    Total CAPEX: ${fmt(c.totalCapex)}`);
  console.log(`    Total Income (30yr): ${fmt(c.totalIncome)}`);
  console.log(`    Dev Cost incl Land: ${fmt(f.devCostInclLand)}`);
  console.log(`    Total Debt: ${fmt(f.totalDebt)}`);
  console.log(`    Total Equity: ${fmt(f.totalEquity)}`);
  console.log(`    Levered IRR: ${f.leveredIRR ? pct(f.leveredIRR) : 'null'}`);
  console.log(`    Exit Year: ${f.exitYear}`);
  console.log(`    Exit Proceeds: ${fmt(f.exitProceeds?.reduce((a,b)=>a+b,0) || 0)}`);

  // bank100: equity should be 0
  t("[Bank100] Equity = 0", f.totalEquity < 1, `equity=${fmt(f.totalEquity)}`);
  // bank100: debt should equal dev cost
  t("[Bank100] Debt ≈ devCost", Math.abs(f.totalDebt - f.devCostExclLand) < f.devCostExclLand * 0.02,
    `debt=${fmt(f.totalDebt)}, devCost=${fmt(f.devCostExclLand)}`);
  // No waterfall
  t("[Bank100] No waterfall", !result.waterfall);
  // DSCR should be defined for some years
  const dscrVals = f.dscr?.filter(v => v !== null && v > 0) || [];
  t("[Bank100] DSCR computed", dscrVals.length > 0, `${dscrVals.length} years with DSCR`);
  // Debt should clear before horizon
  const debtClearYr = (() => {
    for (let y = 0; y < h; y++) if (f.debtBalClose[y] <= 0 && y > 0 && f.debtBalClose[y-1] > 0) return y;
    return null;
  })();
  t("[Bank100] Debt clears", debtClearYr !== null, debtClearYr ? `yr ${debtClearYr}` : 'never');
  // Total interest should be positive
  t("[Bank100] Total interest > 0", f.totalInterest > 0, `interest=${fmt(f.totalInterest)}`);
  // Interest as % of cost should be reasonable (5-30%)
  const intPct = f.totalInterest / f.devCostInclLand;
  // bank100 with 12yr tenor at 6.5% → interest can be 30-60% of cost (all debt, long tenor)
  t("[Bank100] Interest/Cost reasonable (5-60%)", intPct > 0.05 && intPct < 0.60,
    `${pct(intPct)}`);

  console.log("");
}

// ═══════════════════════════════════════════════════
// SCENARIO 2: HYBRID (Government 70% + Fund 30%)
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  SCENARIO 2: HYBRID (Gov 70% + Fund 30%)");
console.log("═══════════════════════════════════════════════════\n");
{
  const project = buildBigProject("hybrid");
  const result = E.runFullModel(project);
  const { projectResults: pr, financing: f, waterfall: w } = result;
  const c = pr.consolidated;
  const h = project.horizon;
  const exitYr = f.exitYear - project.startYear;

  console.log("  Project Summary:");
  console.log(`    Total CAPEX: ${fmt(c.totalCapex)}`);
  console.log(`    Dev Cost (excl land): ${fmt(f.devCostExclLand)}`);
  console.log(`    Dev Cost (incl land): ${fmt(f.devCostInclLand)}`);
  console.log(`    Total Project Cost: ${fmt(f.totalProjectCost)}`);
  console.log(`    Gov Financing (70%): ${fmt(f.totalDebt)}`);
  console.log(`    Fund Equity (30%): ${fmt(f.totalEquity)}`);
  console.log(`    GP Equity: ${fmt(f.gpEquity)}`);
  console.log(`    LP Equity: ${fmt(f.lpEquity)}`);
  console.log(`    Fund Portion Cost: ${fmt(f.fundPortionCost)}`);
  console.log(`    Exit Proceeds (gross): ${fmt(f.exitProceeds[exitYr] || 0)}`);
  console.log(`    Debt balance at exit: ${fmt(f.debtBalClose[exitYr] || 0)}`);

  // ── KEY CHECK: Fund equity should be ~30% of total project cost ──
  const govPct = project.govFinancingPct / 100;
  const expectedFundEquity = f.totalProjectCost * (1 - govPct);
  t("[Hybrid] Fund equity ≈ 30% of project cost",
    Math.abs(f.totalEquity - expectedFundEquity) < expectedFundEquity * 0.15,
    `equity=${fmt(f.totalEquity)}, expected≈${fmt(expectedFundEquity)}`);

  // ── KEY CHECK: Gov debt ≈ 70% of project cost ──
  const expectedGovDebt = f.devCostExclLand * govPct;
  t("[Hybrid] Gov debt ≈ 70% of devCost",
    Math.abs(f.totalDebt - expectedGovDebt) < expectedGovDebt * 0.15,
    `debt=${fmt(f.totalDebt)}, expected≈${fmt(expectedGovDebt)}`);

  // Waterfall should exist
  t("[Hybrid] Waterfall exists", !!w);
  if (w) {
    console.log("\n  Waterfall Metrics:");
    console.log(`    LP IRR: ${w.lpIRR ? pct(w.lpIRR) : 'null'}`);
    console.log(`    GP IRR: ${w.gpIRR ? pct(w.gpIRR) : 'null'}`);
    console.log(`    LP MOIC: ${w.lpMOIC ? w.lpMOIC.toFixed(2)+'x' : 'null'}`);
    console.log(`    LP Total Called: ${fmt(w.lpTotalCalled)}`);
    console.log(`    LP Total Dist: ${fmt(w.lpTotalDist)}`);
    console.log(`    GP Total Called: ${fmt(w.gpTotalCalled)}`);
    console.log(`    GP Total Dist: ${fmt(w.gpTotalDist)}`);
    console.log(`    Total Fees: ${fmt(w.totalFees)}`);
    console.log(`    Total Cash Available: ${fmt(w.totalCashAvail)}`);

    // ══ THE CRITICAL BUG CHECK ══
    // Exit proceeds in the waterfall: should NOT be the full 550M project exit
    // The waterfall's cashAvail includes exitProceeds. For hybrid-project mode,
    // DS includes balloon repayment of remaining gov debt.
    // So net exit flowing to fund = grossExit - balloon - normalDS
    // But check: does MOIC make sense?

    // MOIC = total distributions / total called
    // For a 30% equity investor, MOIC should be reasonable (1.5x - 5x typically)
    // If MOIC > 10x, something is wrong (full project exit flowing to 30% investor)
    t("[Hybrid] LP MOIC reasonable (< 10x)", (w.lpMOIC || 0) < 10,
      `MOIC=${w.lpMOIC ? w.lpMOIC.toFixed(2)+'x' : 'null'} — if > 10x, exit likely includes gov portion`);

    // ══ EXIT PROCEEDS FLOW CHECK ══
    // Cash available at exit year should be: exitProceeds - debtBalloon - fees, NOT the full gross
    const exitCashAvail = w.cashAvail?.[exitYr] || 0;
    const grossExit = f.exitProceeds[exitYr] || 0;
    const debtAtExit = f.debtBalClose[exitYr] || 0;
    const dsAtExit = f.debtService[exitYr] || 0;
    console.log(`\n  Exit Year Analysis (yr ${exitYr}):`);
    console.log(`    Gross exit proceeds: ${fmt(grossExit)}`);
    console.log(`    Debt balance at exit: ${fmt(debtAtExit)}`);
    console.log(`    DS at exit (incl balloon): ${fmt(dsAtExit)}`);
    console.log(`    Cash available at exit: ${fmt(exitCashAvail)}`);
    console.log(`    Difference (exit - cash): ${fmt(grossExit - exitCashAvail)}`);

    // The cash available at exit should be MUCH less than gross exit (gov debt repaid)
    if (grossExit > 0 && f.totalDebt > 0) {
      t("[Hybrid] Exit cashAvail < gross exit (debt repaid)",
        exitCashAvail < grossExit * 0.95,
        `cashAvail=${fmt(exitCashAvail)}, grossExit=${fmt(grossExit)} — if equal, gov debt NOT deducted!`);
    }

    // ══ LP IRR SANITY ══
    // With 30% equity on a decent project, LP IRR should be 8-40%
    if (w.lpIRR !== null) {
      t("[Hybrid] LP IRR reasonable (< 50%)", w.lpIRR < 0.50,
        `lpIRR=${pct(w.lpIRR)} — if > 50%, exit likely inflated`);
    }

    // ══ FUND FEES CHECK ══
    // Fees should be based on fund portion (30% equity), NOT full project cost
    // Dev fee = 10% of devCostExclLand → this is on the full project cost (correct per convention)
    // But management fee should be on fund basis
    const expectedDevFee = f.devCostExclLand * (project.developerFeePct / 100);
    // For hybrid: fee basis might be fundPortionCost or full project — depends on feeBasis setting
    console.log(`\n  Fee Analysis:`);
    console.log(`    Total fees: ${fmt(w.totalFees)}`);
    console.log(`    Fund portion cost: ${fmt(f.fundPortionCost)}`);
    console.log(`    Fee/Equity ratio: ${pct(w.totalFees / f.totalEquity)}`);
    // Fees as % of equity should be reasonable (10-40%)
    t("[Hybrid] Fee/equity ratio reasonable (< 50%)",
      w.totalFees / f.totalEquity < 0.50,
      `${pct(w.totalFees / f.totalEquity)}`);
  }

  console.log("");
}

// ═══════════════════════════════════════════════════
// SCENARIO 2b: HYBRID-GP (Developer personal loan)
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  SCENARIO 2b: HYBRID-GP (Developer Personal Loan)");
console.log("═══════════════════════════════════════════════════\n");
{
  const project = buildBigProject("hybrid", { govBeneficiary: "gp" });
  const result = E.runFullModel(project);
  const { financing: f, waterfall: w } = result;
  const exitYr = f.exitYear - project.startYear;

  console.log("  Hybrid-GP Summary:");
  console.log(`    Gov Debt (personal): ${fmt(f.totalDebt)}`);
  console.log(`    Fund Equity: ${fmt(f.totalEquity)}`);
  console.log(`    GP Personal Debt exists: ${!!f.gpPersonalDebt}`);
  console.log(`    Exit Proceeds (gross): ${fmt(f.exitProceeds[exitYr] || 0)}`);

  t("[Hybrid-GP] gpPersonalDebt exists", !!f.gpPersonalDebt);

  if (w) {
    console.log(`    LP IRR: ${w.lpIRR ? pct(w.lpIRR) : 'null'}`);
    console.log(`    LP MOIC: ${w.lpMOIC ? w.lpMOIC.toFixed(2)+'x' : 'null'}`);
    console.log(`    Cash available at exit: ${fmt(w.cashAvail?.[exitYr] || 0)}`);

    // In GP mode, DS is NOT deducted from cashAvail (line 297: dsDeduction = 0)
    // So the full exit proceeds flow to cashAvail
    // But the GP pays the debt service from their distributions
    // CHECK: does this mean LP gets too much?
    const exitCashAvail = w.cashAvail?.[exitYr] || 0;
    const grossExit = f.exitProceeds[exitYr] || 0;

    // In hybrid-GP: cashAvail = unlevCF + exit (no DS deduction)
    // This means the full gross exit goes to the waterfall
    // GP then pays personal debt from their share
    // This CAN result in inflated LP returns if GP doesn't fully pay off debt

    // KEY: remaining gov debt at exit should be repaid from GP's share
    const govDebtAtExit = f.debtBalClose[exitYr] || 0;
    console.log(`    Gov debt at exit: ${fmt(govDebtAtExit)}`);

    // If gov debt is still large at exit, the GP needs to pay it
    // But does the waterfall account for this?
    // The GP's net CF already deducts DS, so GP MOIC should reflect debt burden
    t("[Hybrid-GP] LP MOIC reasonable", (w.lpMOIC || 0) < 10,
      `MOIC=${w.lpMOIC?.toFixed(2)}x`);
  }

  console.log("");
}

// ═══════════════════════════════════════════════════
// SCENARIO 3: FUND (Standard)
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  SCENARIO 3: FUND (Standard)");
console.log("═══════════════════════════════════════════════════\n");
{
  const project = buildBigProject("fund");
  const result = E.runFullModel(project);
  const { projectResults: pr, financing: f, waterfall: w } = result;
  const c = pr.consolidated;
  const exitYr = f.exitYear - project.startYear;

  console.log("  Fund Summary:");
  console.log(`    Dev Cost: ${fmt(f.devCostInclLand)}`);
  console.log(`    Total Debt (LTV 70%): ${fmt(f.totalDebt)}`);
  console.log(`    Total Equity: ${fmt(f.totalEquity)}`);
  console.log(`    GP Equity: ${fmt(f.gpEquity)}`);
  console.log(`    LP Equity: ${fmt(f.lpEquity)}`);
  console.log(`    Exit Proceeds (gross): ${fmt(f.exitProceeds[exitYr] || 0)}`);

  t("[Fund] Equity > 0", f.totalEquity > 0);
  t("[Fund] Debt > 0", f.totalDebt > 0);
  t("[Fund] Waterfall exists", !!w);

  if (w) {
    console.log("\n  Waterfall:");
    console.log(`    LP IRR: ${w.lpIRR ? pct(w.lpIRR) : 'null'}`);
    console.log(`    LP MOIC: ${w.lpMOIC ? w.lpMOIC.toFixed(2)+'x' : 'null'}`);
    console.log(`    LP Total Called: ${fmt(w.lpTotalCalled)}`);
    console.log(`    LP Total Dist: ${fmt(w.lpTotalDist)}`);
    console.log(`    Total Fees: ${fmt(w.totalFees)}`);
    console.log(`    Cash available (total): ${fmt(w.totalCashAvail)}`);

    // ── MOIC check ──
    t("[Fund] LP MOIC reasonable (1-10x)", (w.lpMOIC || 0) > 0.5 && (w.lpMOIC || 0) < 10,
      `MOIC=${w.lpMOIC?.toFixed(2)}x`);

    // ── Exit value check ──
    // Exit proceeds should be reasonable relative to project cost
    const exitProc = f.exitProceeds[exitYr] || 0;
    const exitRatio = exitProc / f.devCostInclLand;
    t("[Fund] Exit/Cost ratio reasonable (0.5-5x)", exitRatio > 0.5 && exitRatio < 5,
      `exit=${fmt(exitProc)}, cost=${fmt(f.devCostInclLand)}, ratio=${exitRatio.toFixed(2)}x`);

    // ── Cash conservation ──
    const totalDist = (w.lpTotalDist || 0) + (w.gpTotalDist || 0);
    const totalCashAvail = w.cashAvail ? w.cashAvail.reduce((a,b)=>a+b,0) : 0;
    t("[Fund] Distributions ≤ cash available",
      totalDist <= totalCashAvail + 1,
      `dist=${fmt(totalDist)}, avail=${fmt(totalCashAvail)}`);

    // ── Fee breakdown ──
    const feeEquityRatio = w.totalFees / f.totalEquity;
    t("[Fund] Fee/equity ratio < 40%", feeEquityRatio < 0.40,
      pct(feeEquityRatio));

    // ── LP distributions should be reasonable ──
    // LP should get back their equity + some profit
    const lpNetReturn = (w.lpTotalDist || 0) - (w.lpTotalCalled || 0);
    console.log(`    LP Net Return: ${fmt(lpNetReturn)}`);
    t("[Fund] LP has positive net return", lpNetReturn > 0, fmt(lpNetReturn));
  }

  console.log("");
}

// ═══ SUMMARY ═══
console.log("═══════════════════════════════════════════════════");
console.log(`  SCENARIO AUDIT: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES FOUND:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
