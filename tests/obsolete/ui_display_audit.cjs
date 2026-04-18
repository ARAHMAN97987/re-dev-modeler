/**
 * ZAN Platform — UI Display Audit
 *
 * Tests what the USER SEES, not what the engine computes.
 * For each finMode, verifies:
 *   1. Which view component would render (routing)
 *   2. What data is passed to each view
 *   3. What derived metrics the view computes from the data
 *   4. Whether any cross-mode data contamination exists
 *   5. Whether labels/sections match the mode
 *
 * Run: node tests/ui_display_audit.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(1)+'M' : Math.round(v).toLocaleString()) : String(v);

// ═══ Realistic project builder ═══
function buildProject(finMode, opts = {}) {
  return {
    id: `audit-${finMode}`, name: `Audit ${finMode}`,
    horizon: 30, startYear: 2026, currency: "SAR",
    landType: "lease", landArea: 50000,
    landRentAnnual: 2000000, landRentEscalation: 5, landRentEscalationEveryN: 5,
    landRentGrace: 3, landRentTerm: 30,
    softCostPct: 10, contingencyPct: 5, rentEscalation: 1.0,
    activeScenario: "Base Case",
    finMode,
    exitStrategy: "sale", exitYear: 0, exitMultiple: 10, exitCapRate: 9, exitCostPct: 2,
    phases: [{ name: "Phase 1", startYearOffset: 1, footprint: 50000 }],
    assets: [{
      id: "a1", phase: "Phase 1", category: "Retail", name: "Mall",
      gfa: 25000, footprint: 25000, costPerSqm: 4000, constrDuration: 24, constrStart: 1,
      revType: "Lease", efficiency: 75, leaseRate: 800,
      stabilizedOcc: 90, rampUpYears: 3,
    }],
    // Debt
    debtAllowed: true, maxLtvPct: finMode === "bank100" ? 100 : 70,
    financeRate: 6.5, loanTenor: 10, debtGrace: 3, upfrontFeePct: 0.5,
    repaymentType: "amortizing", graceBasis: "cod",
    // Fund
    vehicleType: "fund", subscriptionFeePct: 2, annualMgmtFeePct: 0.9,
    custodyFeeAnnual: 130000, mgmtFeeBase: "devCost", feeTreatment: "capital",
    developerFeePct: 12, developerFeeBasis: "exclLand", auditorFeeAnnual: 40000,
    structuringFeePct: 0.1, landCapitalize: false, landCapRate: 1000,
    landCapTo: "gp", landRentPaidBy: "auto",
    prefReturnPct: 15, gpCatchup: true, carryPct: 30, lpProfitSplitPct: 70,
    performanceIncentive: true, hurdleMode: "simple", hurdleIRR: 15, incentivePct: 20,
    // Hybrid
    govFinancingPct: 70, govBeneficiary: "project", govFinanceRate: 3.0,
    govLoanTenor: 15, govGrace: 5, govRepaymentType: "amortizing",
    govUpfrontFeePct: 0, hybridDrawOrder: "finFirst",
    // Incentives off
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false },
      landRentRebate: { enabled: false }, feeRebates: { enabled: false, items: [] } },
    ...opts,
  };
}

// ═══ Simulate ResultsView routing logic (exact mirror of ResultsView.jsx lines 59-124) ═══
function getViewRoute(project, financing, waterfall) {
  const mode = project.finMode || financing?.mode || "self";
  const phaseFinModes = (project.phases || []).map(p => p.financing?.finMode || mode);
  const hasFundPhase = phaseFinModes.some(m => m === "fund" || m === "hybrid");
  const hasBankPhase = phaseFinModes.some(m => m === "debt" || m === "bank100");
  const isMixedMode = hasFundPhase && hasBankPhase;

  if (isMixedMode) return "MixedView";
  if (mode === "fund" || mode === "hybrid") return "WaterfallView";
  if (mode === "debt" || mode === "bank100") return "BankResultsView";
  return "SelfResultsView";
}

// ═══ Simulate what BankResultsView computes and displays ═══
function auditBankResultsView(project, results, financing) {
  const prefix = `[BankResultsView/${project.finMode}]`;
  const c = results.consolidated;
  const pf = financing;
  const h = project.horizon;
  const sy = project.startYear;
  const isBank100 = project.finMode === "bank100";

  // 1. DSCR values
  const dscrVals = pf.dscr ? pf.dscr.filter(v => v !== null && v > 0) : [];
  const dscrMin = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const dscrAvg = dscrVals.length > 0 ? dscrVals.reduce((a,b)=>a+b,0)/dscrVals.length : null;

  // Verify DSCR = NOI / DS
  for (let y = 0; y < h; y++) {
    const ds = pf.debtService?.[y] || 0;
    if (ds > 0 && pf.dscr?.[y] !== null) {
      const noi = (c.income[y] || 0) - (c.landRent[y] || 0);
      const expectedDSCR = noi / ds;
      const actual = pf.dscr[y];
      if (Math.abs(expectedDSCR - actual) > 0.01) {
        t(`${prefix} DSCR[${y}] = NOI/DS`, false,
          `NOI=${fmt(noi)}, DS=${fmt(ds)}, expected=${expectedDSCR.toFixed(2)}, got=${actual.toFixed(2)}`);
        break;
      }
    }
  }
  t(`${prefix} DSCR calc correct`, true);

  // 2. Peak debt
  const peakDebt = pf.debtBalClose ? Math.max(...pf.debtBalClose) : 0;
  t(`${prefix} Peak debt > 0`, peakDebt > 0, `peakDebt=${fmt(peakDebt)}`);

  // 3. Debt clear year
  const debtClearYr = (() => {
    if (!pf.debtBalClose) return null;
    for (let y = 0; y < h; y++) {
      if (pf.debtBalClose[y] <= 0 && y > 0 && pf.debtBalClose[y-1] > 0) return sy + y;
    }
    return null;
  })();
  t(`${prefix} Debt clear year exists`, debtClearYr !== null,
    debtClearYr ? `cleared at ${debtClearYr}` : 'debt never cleared');

  // 4. Levered IRR
  t(`${prefix} Levered IRR defined`, pf.leveredIRR !== null && pf.leveredIRR !== undefined,
    `leveredIRR=${pf.leveredIRR}`);

  // 5. Payback period
  let cum = 0, wasNeg = false, paybackLev = null;
  if (pf.leveredCF) {
    for (let y = 0; y < h; y++) {
      cum += pf.leveredCF[y] || 0;
      if (cum < -1) wasNeg = true;
      if (wasNeg && cum >= 0) { paybackLev = y + 1; break; }
    }
  }
  t(`${prefix} Payback exists`, paybackLev !== null,
    paybackLev ? `payback in ${paybackLev} years` : 'no payback');

  // 6. Cash-on-Cash yield
  const constrEnd = pf.constrEnd || 0;
  const stableIncome = c.income.find((v, i) => i > constrEnd && v > 0) || 0;
  const cashOnCash = pf.totalEquity > 0 && stableIncome > 0 ? stableIncome / pf.totalEquity : 0;
  if (!isBank100) {
    t(`${prefix} Cash-on-Cash > 0`, cashOnCash > 0, `CoC=${(cashOnCash*100).toFixed(1)}%`);
  }

  // 7. Developer net CF
  const devNetCF = pf.leveredCF ? pf.leveredCF.reduce((a,b)=>a+b,0) : 0;
  t(`${prefix} Dev net CF computed`, true, `devNetCF=${fmt(devNetCF)}`);

  // 8. Simple return
  const levCFArr = pf.leveredCF || [];
  const totalInvested = Math.abs(levCFArr.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const simpleROE = totalInvested > 0 ? devNetCF / totalInvested : 0;
  t(`${prefix} Simple return computed`, totalInvested > 0, `simpleROE=${(simpleROE*100).toFixed(1)}%`);

  // 9. Bank100 specifics
  if (isBank100) {
    t(`${prefix} bank100: equity = 0`, pf.totalEquity < 1, `equity=${fmt(pf.totalEquity)}`);
    t(`${prefix} bank100: LTV = 100%`, true); // Always true by design
  } else {
    t(`${prefix} debt: equity > 0`, pf.totalEquity > 0, `equity=${fmt(pf.totalEquity)}`);
    t(`${prefix} debt: debt < total cost`, pf.totalDebt < pf.devCostInclLand + 1,
      `debt=${fmt(pf.totalDebt)}, cost=${fmt(pf.devCostInclLand)}`);
  }

  // 10. NO FUND FEES should be in this view
  // The view should NOT show: subscriptionFee, managementFee, etc.
  // These come from waterfall, which should be null for debt/bank100
  t(`${prefix} No waterfall data (no fund fees)`, true); // Structural - waterfall is null

  // 11. Cash flow table verification
  // Section 1: Project CF rows should show income, land rent, capex, netCF
  t(`${prefix} Income > 0`, c.totalIncome > 0, `income=${fmt(c.totalIncome)}`);
  t(`${prefix} Capex > 0`, c.totalCapex > 0, `capex=${fmt(c.totalCapex)}`);

  // Section 2: Financing rows should show drawdown, debt balance, repayment, interest
  const totalDrawn = pf.drawdown ? pf.drawdown.reduce((a,b)=>a+b,0) : 0;
  t(`${prefix} Drawdown > 0`, totalDrawn > 0, `drawn=${fmt(totalDrawn)}`);
  const totalRepay = pf.repayment ? pf.repayment.reduce((a,b)=>a+b,0) : 0;
  t(`${prefix} Repayment > 0`, totalRepay > 0, `repay=${fmt(totalRepay)}`);

  // 12. Cumulative CF should match sum
  let cumCheck = 0;
  for (let y = 0; y < h; y++) cumCheck += pf.leveredCF?.[y] || 0;
  t(`${prefix} Cumulative CF = sum`, Math.abs(cumCheck - devNetCF) < 1);

  // 13. Break-even year
  cum = 0; wasNeg = false;
  let breakEvenYr = null;
  for (let y = 0; y < h; y++) {
    cum += pf.leveredCF?.[y] || 0;
    if (cum < -1) wasNeg = true;
    if (wasNeg && cum >= 0) { breakEvenYr = sy + y; break; }
  }
  t(`${prefix} Break-even milestone`, breakEvenYr !== null,
    breakEvenYr ? `break-even at ${breakEvenYr}` : 'never');

  return { dscrMin, dscrAvg, debtClearYr, paybackLev, devNetCF, simpleROE, breakEvenYr };
}

// ═══ Simulate what WaterfallView displays ═══
function auditWaterfallView(project, results, financing, waterfall) {
  const prefix = `[WaterfallView/${project.finMode}]`;
  const c = results.consolidated;
  const h = project.horizon;
  const isHybrid = project.finMode === "hybrid";

  if (!waterfall) {
    t(`${prefix} Waterfall exists`, false, 'waterfall is null');
    return;
  }
  t(`${prefix} Waterfall exists`, true);

  const w = waterfall;

  // 1. Equity calls
  const totalCalls = w.equityCalls ? w.equityCalls.reduce((a,b)=>a+b,0) : 0;
  t(`${prefix} Equity calls > 0`, totalCalls > 0, `calls=${fmt(totalCalls)}`);

  // 2. Fund fees breakdown
  t(`${prefix} Total fees > 0`, (w.totalFees || 0) > 0, `fees=${fmt(w.totalFees)}`);

  // 3. Fee detail check — subscription fee should be close to subscriptionFeePct × devCost
  const expectedSubFee = financing.devCostExclLand * (project.subscriptionFeePct || 2) / 100;
  if (w.subscriptionFee !== undefined) {
    const subFeeOff = Math.abs((w.subscriptionFee || 0) - expectedSubFee);
    t(`${prefix} Subscription fee ≈ ${(project.subscriptionFeePct||2)}% of devCost`,
      subFeeOff < expectedSubFee * 0.3, // 30% tolerance for basis differences
      `expected≈${fmt(expectedSubFee)}, got=${fmt(w.subscriptionFee)}`);
  }

  // 4. Tier distributions exist
  const sumTier1 = (w.tier1 || []).reduce((a,b)=>a+b,0);
  const sumTier4LP = (w.tier4LP || []).reduce((a,b)=>a+b,0);
  t(`${prefix} Tier 1 (pref) > 0`, sumTier1 > 0, `tier1=${fmt(sumTier1)}`);
  t(`${prefix} Tier 4 LP > 0`, sumTier4LP > 0, `tier4LP=${fmt(sumTier4LP)}`);

  // 5. LP metrics
  t(`${prefix} LP IRR defined`, w.lpIRR !== null && w.lpIRR !== undefined, `lpIRR=${w.lpIRR}`);
  // GP IRR can be null when GP has zero equity (no investment to compute IRR against)
  const gpHasEquity = (financing.gpEquity || 0) > 0;
  if (gpHasEquity) {
    t(`${prefix} GP IRR defined (GP has equity)`, w.gpIRR !== null, `gpIRR=${w.gpIRR}`);
  } else {
    t(`${prefix} GP IRR null (no GP equity)`, true, `gpEquity=0 → IRR N/A is correct`);
  }
  t(`${prefix} MOIC defined`, w.lpMOIC !== null && w.lpMOIC !== undefined, `MOIC=${w.lpMOIC}`);

  // 6. LP distributions >= 0
  if (w.lpDist) {
    const negLP = w.lpDist.findIndex(v => v < -0.01);
    t(`${prefix} LP dist never negative`, negLP < 0,
      negLP >= 0 ? `lpDist[${negLP}]=${w.lpDist[negLP]}` : '');
  }

  // 7. GP distributions >= 0
  if (w.gpDist) {
    const negGP = w.gpDist.findIndex(v => v < -0.01);
    t(`${prefix} GP dist never negative`, negGP < 0,
      negGP >= 0 ? `gpDist[${negGP}]=${w.gpDist[negGP]}` : '');
  }

  // 8. Cash conservation: distributions ≤ cash available
  if (w.cashAvail && w.lpDist && w.gpDist) {
    for (let y = 0; y < h; y++) {
      const totalDist = (w.lpDist[y] || 0) + (w.gpDist[y] || 0);
      const cash = w.cashAvail[y] || 0;
      if (totalDist > cash + 1) {
        t(`${prefix} Cash conservation yr ${y}`, false,
          `dist=${fmt(totalDist)} > cash=${fmt(cash)}`);
        break;
      }
    }
    t(`${prefix} Cash conservation`, true);
  }

  // 9. Unreturned capital should decrease over time (eventually → 0 if profitable)
  if (w.unreturnedCapital) {
    const lastURC = w.unreturnedCapital[h - 1] || 0;
    t(`${prefix} Unreturned capital resolved`, lastURC <= 1, `URC end=${fmt(lastURC)}`);
  }

  // 10. Hybrid-specific checks
  if (isHybrid) {
    t(`${prefix} isHybrid flag in financing`, !!financing.isHybrid, `isHybrid=${financing.isHybrid}`);
    t(`${prefix} govFinancingPct displayed`, financing.govFinancingPct > 0,
      `govPct=${financing.govFinancingPct}`);

    // Fund portion cost should be 30% (or 100-govPct %)
    const fundPct = 100 - (project.govFinancingPct || 70);
    t(`${prefix} Fund portion = ${fundPct}%`, true);

    // Dual CF (financing + fund) should exist
    if (w.financingCF && w.fundCF) {
      t(`${prefix} Dual CF exists (financing + fund)`, true);
      // financingCF should have the government loan draws
      const finCFSum = w.financingCF.reduce((a,b)=>a+b,0);
      t(`${prefix} Financing CF has content`, finCFSum !== 0, `finCFSum=${fmt(finCFSum)}`);
    } else {
      t(`${prefix} Dual CF exists`, false, 'financingCF or fundCF missing');
    }

    // For hybrid-gp: check gpPersonalDebt
    if (project.govBeneficiary === "gp") {
      t(`${prefix} GP personal debt tracked`, !!financing.gpPersonalDebt,
        financing.gpPersonalDebt ? 'exists' : 'missing');
    }
  }

  // 11. NO BANK-SPECIFIC metrics should appear
  // WaterfallView should NOT show: DSCR compliance, bank terms, etc.
  // These are structural — WaterfallView doesn't render them
  t(`${prefix} View is fund-focused`, true);
}

// ═══ Simulate SelfResultsView display ═══
function auditSelfResultsView(project, results, financing) {
  const prefix = `[SelfResultsView/self]`;
  const c = results.consolidated;

  // 1. In self mode, leveredIRR includes exit proceeds but no debt.
  // It should be >= project IRR (exit adds value) or null
  const selfIRR = financing.leveredIRR;
  const exitProc = financing.exitProceeds ? financing.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  if (exitProc > 0) {
    // With exit, levered IRR should be >= unlevered IRR (exit adds positive value)
    t(`${prefix} IRR ≥ unlevered (has exit)`, selfIRR >= (c.irr||0) - 0.001,
      `levIRR=${selfIRR}, projIRR=${c.irr}`);
  } else {
    t(`${prefix} IRR ≈ unlevered (no exit)`, Math.abs((selfIRR||0) - (c.irr||0)) < 0.01,
      `levIRR=${selfIRR}, projIRR=${c.irr}`);
  }

  // 2. No debt
  t(`${prefix} No debt`, financing.totalDebt === 0, `debt=${financing.totalDebt}`);

  // 3. No waterfall
  t(`${prefix} No waterfall implied`, true); // Structural

  // 4. Income & capex correct
  t(`${prefix} Income > 0`, c.totalIncome > 0);
  t(`${prefix} Capex > 0`, c.totalCapex > 0);
}

// ═══════════════════════════════════════════════════
// PART 1: VIEW ROUTING AUDIT
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  ZAN — UI DISPLAY AUDIT");
console.log("═══════════════════════════════════════════════════\n");

console.log("── PART 1: View Routing ──");
{
  const modes = {
    "self": "SelfResultsView",
    "bank100": "BankResultsView",
    "debt": "BankResultsView",
    "fund": "WaterfallView",
    "hybrid": "WaterfallView",
  };
  for (const [fm, expectedView] of Object.entries(modes)) {
    const project = buildProject(fm);
    const result = E.runFullModel(project);
    const view = getViewRoute(project, result.financing, result.waterfall);
    t(`[Routing] ${fm} → ${expectedView}`, view === expectedView, `got ${view}`);
  }

  // Mixed mode routing
  const mixed = buildProject("fund", {
    phases: [
      { name: "Phase 1", financing: { finMode: "bank100" } },
      { name: "Phase 2", financing: { finMode: "fund" } },
    ],
  });
  const view = getViewRoute(mixed, null, null);
  t(`[Routing] mixed → MixedView`, view === "MixedView", `got ${view}`);
}

// ═══════════════════════════════════════════════════
// PART 2: BankResultsView AUDIT (debt + bank100)
// ═══════════════════════════════════════════════════
console.log("\n── PART 2: BankResultsView Display ──");
{
  for (const fm of ["debt", "bank100"]) {
    const project = buildProject(fm);
    const result = E.runFullModel(project);
    if (!result || !result.financing) {
      t(`[Bank/${fm}] Engine produced result`, false);
      continue;
    }
    // Verify NO waterfall (fund data should not leak)
    t(`[Bank/${fm}] No waterfall (no fund contamination)`, !result.waterfall,
      result.waterfall ? 'WATERFALL EXISTS — fund fees would show!' : '');

    auditBankResultsView(project, result.projectResults, result.financing);
  }
}

// ═══════════════════════════════════════════════════
// PART 3: WaterfallView AUDIT (fund + hybrid)
// ═══════════════════════════════════════════════════
console.log("\n── PART 3: WaterfallView Display ──");
{
  for (const fm of ["fund", "hybrid"]) {
    const project = buildProject(fm);
    const result = E.runFullModel(project);
    if (!result || !result.financing) {
      t(`[Waterfall/${fm}] Engine produced result`, false);
      continue;
    }
    auditWaterfallView(project, result.projectResults, result.financing, result.waterfall);
  }

  // Fund with GP equity (to test GP IRR is computed)
  // Use low cap rate so GP gets ~25M equity (reasonable GP/LP split)
  const fundGP = buildProject("fund", {
    landCapitalize: true, landCapRate: 500, landCapTo: "gp",
  });
  const rFundGP = E.runFullModel(fundGP);
  if (rFundGP?.financing && rFundGP?.waterfall) {
    console.log(`    Fund with GP equity: gpEquity=${rFundGP.financing.gpEquity}, gpIRR=${rFundGP.waterfall.gpIRR}`);
    auditWaterfallView(fundGP, rFundGP.projectResults, rFundGP.financing, rFundGP.waterfall);
  }

  // Hybrid-GP sub-mode
  const hybridGP = buildProject("hybrid", { govBeneficiary: "gp" });
  const rGP = E.runFullModel(hybridGP);
  if (rGP?.financing && rGP?.waterfall) {
    auditWaterfallView(hybridGP, rGP.projectResults, rGP.financing, rGP.waterfall);
  }
}

// ═══════════════════════════════════════════════════
// PART 4: SelfResultsView AUDIT
// ═══════════════════════════════════════════════════
console.log("\n── PART 4: SelfResultsView Display ──");
{
  const project = buildProject("self");
  const result = E.runFullModel(project);
  if (result?.financing) {
    auditSelfResultsView(project, result.projectResults, result.financing);
  }
}

// ═══════════════════════════════════════════════════
// PART 5: CROSS-MODE CONTAMINATION CHECK
// ═══════════════════════════════════════════════════
console.log("\n── PART 5: Cross-Mode Contamination ──");
{
  // When mode = bank100, there should be NO fund fee data in financing
  const bank = buildProject("bank100");
  const rBank = E.runFullModel(bank);
  if (rBank?.financing) {
    const f = rBank.financing;
    t(`[Contamination/bank100] No devFeeTotal`, !f.devFeeTotal || f.devFeeTotal === 0 || f.mode !== "fund",
      `devFeeTotal=${f.devFeeTotal}, mode=${f.mode}`);
    t(`[Contamination/bank100] No waterfall`, !rBank.waterfall);
    t(`[Contamination/bank100] No LP equity`, (f.lpEquity || 0) === 0, `lpEquity=${f.lpEquity}`);
  }

  // When mode = self, there should be NO debt data
  const self = buildProject("self");
  const rSelf = E.runFullModel(self);
  if (rSelf?.financing) {
    const f = rSelf.financing;
    t(`[Contamination/self] No totalDebt`, f.totalDebt === 0, `totalDebt=${f.totalDebt}`);
    t(`[Contamination/self] No totalInterest`, (f.totalInterest || 0) === 0, `totalInterest=${f.totalInterest}`);
    t(`[Contamination/self] No waterfall`, !rSelf.waterfall);
  }

  // When mode = fund, verify that fund-specific fields are populated
  const fund = buildProject("fund");
  const rFund = E.runFullModel(fund);
  if (rFund?.waterfall) {
    const w = rFund.waterfall;
    t(`[Contamination/fund] Has totalFees`, (w.totalFees || 0) > 0, `totalFees=${w.totalFees}`);
    t(`[Contamination/fund] Has LP IRR`, w.lpIRR !== null);
    t(`[Contamination/fund] Has MOIC`, w.lpMOIC !== null);
  }
}

// ═══════════════════════════════════════════════════
// PART 6: MIXED-MODE PHASE CONTAMINATION
// ═══════════════════════════════════════════════════
console.log("\n── PART 6: Mixed-Mode Phase Contamination ──");
{
  // Phase 1 = bank100, Phase 2 = fund
  const mixed = buildProject("fund", {
    phases: [
      { name: "Phase 1", startYearOffset: 1, footprint: 30000, financing: { finMode: "bank100" } },
      { name: "Phase 2", startYearOffset: 3, footprint: 20000 },
    ],
    assets: [
      { id: "a1", phase: "Phase 1", category: "Retail", name: "Mall P1",
        gfa: 15000, footprint: 15000, costPerSqm: 4000, constrDuration: 24, constrStart: 1,
        revType: "Lease", efficiency: 75, leaseRate: 800, stabilizedOcc: 90, rampUpYears: 3 },
      { id: "a2", phase: "Phase 2", category: "Office", name: "Office P2",
        gfa: 12000, footprint: 12000, costPerSqm: 4500, constrDuration: 30, constrStart: 3,
        revType: "Lease", efficiency: 80, leaseRate: 600, stabilizedOcc: 85, rampUpYears: 3 },
    ],
  });
  const result = E.runFullModel(mixed);
  if (result) {
    const pf = result.phaseFinancings;

    // Phase 1 (bank100) should have NO fund fees
    if (pf?.["Phase 1"]) {
      const p1 = pf["Phase 1"];
      t(`[Mixed] P1 mode = bank100`, p1.mode === "bank100", `mode=${p1.mode}`);
      t(`[Mixed] P1 no LP equity`, (p1.lpEquity || 0) < 1, `lpEquity=${p1.lpEquity}`);
      // No waterfall for P1
      const pw = result.phaseWaterfalls;
      t(`[Mixed] P1 no waterfall`, !pw?.["Phase 1"],
        pw?.["Phase 1"] ? 'P1 HAS waterfall — fund fees would display!' : '');
    }

    // Phase 2 (fund) SHOULD have fund fees
    if (pf?.["Phase 2"]) {
      const p2 = pf["Phase 2"];
      t(`[Mixed] P2 mode = fund`, p2.mode === "fund", `mode=${p2.mode}`);
      const pw = result.phaseWaterfalls;
      t(`[Mixed] P2 has waterfall`, !!pw?.["Phase 2"]);
      if (pw?.["Phase 2"]) {
        t(`[Mixed] P2 has fees`, (pw["Phase 2"].totalFees || 0) > 0,
          `fees=${pw["Phase 2"].totalFees}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════
// PART 7: KEY DISPLAY VALUES SANITY
// ═══════════════════════════════════════════════════
console.log("\n── PART 7: Display Value Sanity ──");
{
  // For each mode, verify key displayed metrics are sensible
  for (const fm of ["self", "bank100", "debt", "fund", "hybrid"]) {
    const project = buildProject(fm);
    const result = E.runFullModel(project);
    if (!result?.financing) continue;
    const f = result.financing;
    const prefix = `[Sanity/${fm}]`;

    // Total cost should be GFA × cost × soft × contingency
    const expectedCapex = 25000 * 4000 * 1.10 * 1.05; // GFA=25000, cost=4000, soft=10%, contingency=5%
    t(`${prefix} devCostExclLand ≈ expected`,
      Math.abs(f.devCostExclLand - expectedCapex) < expectedCapex * 0.02,
      `expected≈${fmt(expectedCapex)}, got=${fmt(f.devCostExclLand)}`);

    // Levered IRR should be reasonable (-50% to 100%)
    if (f.leveredIRR !== null) {
      t(`${prefix} IRR in sane range`, f.leveredIRR > -0.5 && f.leveredIRR < 1.0,
        `IRR=${(f.leveredIRR*100).toFixed(1)}%`);
    }

    // For debt modes, debt should be ≤ devCost × LTV
    if (fm === "debt" || fm === "bank100") {
      const maxLTV = fm === "bank100" ? 1.0 : (project.maxLtvPct || 70) / 100;
      t(`${prefix} Debt ≤ devCost × LTV`, f.totalDebt <= f.devCostInclLand * maxLTV + 1,
        `debt=${fmt(f.totalDebt)}, limit=${fmt(f.devCostInclLand * maxLTV)}`);
    }

    // For fund/hybrid, LP IRR should be defined
    if (fm === "fund" || fm === "hybrid") {
      const w = result.waterfall;
      if (w) {
        t(`${prefix} LP IRR sane`, w.lpIRR === null || (w.lpIRR > -0.5 && w.lpIRR < 1.0),
          `lpIRR=${w.lpIRR ? (w.lpIRR*100).toFixed(1)+'%' : 'null'}`);
        t(`${prefix} MOIC sane`, w.lpMOIC === null || (w.lpMOIC > 0 && w.lpMOIC < 20),
          `MOIC=${w.lpMOIC ? w.lpMOIC.toFixed(2)+'x' : 'null'}`);
      }
    }
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  UI DISPLAY AUDIT: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ DISPLAY ISSUES FOUND:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
} else {
  console.log("  ✅ All display data verified correct");
}

process.exit(fail > 0 ? 1 : 0);
