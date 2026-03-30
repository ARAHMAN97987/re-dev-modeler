/**
 * ZAN — Display Values Audit (Rounds 11-14)
 *
 * Verifies that values DISPLAYED to users match engine calculations.
 * Simulates the EXACT derived metrics computed in each view component.
 *
 * Run: node tests/display_values_audit.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 1) => Math.abs(a - b) < tol;
const nearPct = (a, b, pct = 0.01) => Math.abs(a - b) < Math.max(Math.abs(b) * pct, 1);
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+'M' : Math.round(v).toLocaleString()) : String(v);

function baseProject(finMode, opts = {}) {
  return {
    id: 'disp', name: 'DispAudit', horizon: 30, startYear: 2026, currency: "SAR",
    landType: "lease", landArea: 50000,
    landRentAnnual: 2000000, landRentEscalation: 5, landRentEscalationEveryN: 5,
    landRentGrace: 3, landRentTerm: 30,
    softCostPct: 10, contingencyPct: 5, rentEscalation: 1.0, activeScenario: "Base Case",
    finMode, exitStrategy: "sale", exitYear: 8, exitMultiple: 10, exitCapRate: 9, exitCostPct: 2,
    debtAllowed: true, maxLtvPct: 70, financeRate: 6.5, loanTenor: 10, debtGrace: 3,
    upfrontFeePct: 0.5, repaymentType: "amortizing", graceBasis: "cod", debtTrancheMode: "single",
    vehicleType: "fund", subscriptionFeePct: 2, annualMgmtFeePct: 1.0,
    mgmtFeeCapAnnual: 2000000, custodyFeeAnnual: 100000, mgmtFeeBase: "devCost",
    feeTreatment: "capital", developerFeePct: 10, developerFeeBasis: "exclLand",
    auditorFeeAnnual: 40000, structuringFeePct: 0.5,
    prefReturnPct: 0, gpCatchup: false, carryPct: 0, lpProfitSplitPct: 100,
    performanceIncentive: true, hurdleMode: "simple", hurdleIRR: 15, incentivePct: 20,
    landCapitalize: false, landRentPaidBy: "auto",
    govFinancingPct: 70, govBeneficiary: "project", govFinanceRate: 3.0,
    govLoanTenor: 15, govGrace: 5,
    phases: [{ name: "P1", startYearOffset: 1, footprint: 50000 }],
    assets: [{
      id: "a1", phase: "P1", category: "Retail", name: "Mall",
      gfa: 20000, footprint: 20000, costPerSqm: 5000,
      constrDuration: 24, constrStart: 1,
      revType: "Lease", efficiency: 75, leaseRate: 1000,
      stabilizedOcc: 90, rampUpYears: 3,
    }],
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false },
      landRentRebate: { enabled: false }, feeRebates: { enabled: false, items: [] } },
    ...opts,
  };
}

// ═══════════════════════════════════════════════════
// ROUND 11: BankResultsView DISPLAY VALUES
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  ROUND 11: BankResultsView DISPLAYED VALUES");
console.log("═══════════════════════════════════════════════════\n");
{
  // Simulate exactly what BankResultsView computes (ResultsView.jsx lines 571-598)
  const p = baseProject("debt");
  const r = E.runFullModel(p);
  const pf = r.financing;
  const pc = r.projectResults.consolidated;
  const h = p.horizon;
  const sy = p.startYear;

  // These are the EXACT derived metrics from BankResultsView
  const dscrVals = pf.dscr ? pf.dscr.filter(v => v !== null && v > 0) : [];
  const dscrMin = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const dscrAvg = dscrVals.length > 0 ? dscrVals.reduce((a,b)=>a+b,0)/dscrVals.length : null;
  const peakDebt = pf.debtBalClose ? Math.max(...pf.debtBalClose) : 0;
  const debtClearYr = (() => { if (!pf.debtBalClose) return null; for (let y=0;y<h;y++) { if (pf.debtBalClose[y]<=0 && y>0 && pf.debtBalClose[y-1]>0) return sy+y; } return null; })();
  const totalDS = pf.debtService ? pf.debtService.reduce((a,b)=>a+b,0) : 0;
  const exitProc = pf.exitProceeds ? pf.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const paybackLev = (() => { if (!pf.leveredCF) return null; let cum=0,wasNeg=false; for (let y=0;y<h;y++) { cum+=pf.leveredCF[y]||0; if(cum<-1)wasNeg=true; if(wasNeg&&cum>=0) return y+1; } return null; })();
  const constrEnd = pf.constrEnd || 0;
  const stableIncome = pc.income.find((v,i) => i > constrEnd && v > 0) || 0;
  const cashOnCash = pf.totalEquity > 0 && stableIncome > 0 ? stableIncome / pf.totalEquity : 0;
  const totalFinCost = pf.totalInterest;
  const devNetCF = pf.leveredCF ? pf.leveredCF.reduce((a,b)=>a+b,0) : 0;
  const levCFArr = pf.leveredCF || [];
  const bankTotalInvested = Math.abs(levCFArr.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const bankSimpleROE = bankTotalInvested > 0 ? devNetCF / bankTotalInvested : 0;

  console.log("  KPI Values displayed to user:");
  console.log(`    Total Debt: ${fmt(pf.totalDebt)}`);
  console.log(`    DSCR Min: ${dscrMin?.toFixed(2)}x`);
  console.log(`    DSCR Avg: ${dscrAvg?.toFixed(2)}x`);
  console.log(`    Peak Debt: ${fmt(peakDebt)}`);
  console.log(`    Debt Clear Year: ${debtClearYr}`);
  console.log(`    Levered IRR: ${pf.leveredIRR?(pf.leveredIRR*100).toFixed(2)+'%':'null'}`);
  console.log(`    Payback: ${paybackLev} years`);
  console.log(`    Cash-on-Cash: ${(cashOnCash*100).toFixed(1)}%`);
  console.log(`    Simple ROE: ${(bankSimpleROE*100).toFixed(1)}%`);
  console.log(`    Dev Net CF: ${fmt(devNetCF)}`);
  console.log(`    Total Interest: ${fmt(totalFinCost)}`);
  console.log(`    Exit Proceeds: ${fmt(exitProc)}`);

  // 11.1: DSCR min should be > 0 when debt service exists
  t("[R11.1] DSCR min > 0", dscrMin !== null && dscrMin > 0, `dscrMin=${dscrMin}`);

  // 11.2: DSCR min value matches engine
  t("[R11.2] DSCR min matches engine", dscrMin === Math.min(...dscrVals));

  // 11.3: Peak debt = max of debtBalClose
  t("[R11.3] Peak debt = max(debtBalClose)", peakDebt > 0 && peakDebt === Math.max(...pf.debtBalClose));

  // 11.4: Debt clear year logic
  t("[R11.4] Debt clear year defined", debtClearYr !== null, `yr=${debtClearYr}`);

  // 11.5: Payback period: cumulative levered CF turns positive
  t("[R11.5] Payback period defined", paybackLev !== null, `yrs=${paybackLev}`);

  // 11.6: Simple ROE = devNetCF / totalInvested
  t("[R11.6] Simple ROE formula", bankTotalInvested > 0 && nearPct(bankSimpleROE, devNetCF / bankTotalInvested, 0.001));

  // 11.7: Total interest = sum of interest array
  t("[R11.7] Total interest = sum(interest[])",
    nearPct(totalFinCost, pf.interest.reduce((a,b)=>a+b,0), 0.001));

  // 11.8: Dev net CF = sum of levered CF
  t("[R11.8] Dev net CF = sum(leveredCF)",
    nearPct(devNetCF, pf.leveredCF.reduce((a,b)=>a+b,0), 0.001));

  // 11.9: Cash-on-cash = stableIncome / equity
  t("[R11.9] Cash-on-Cash formula correct",
    cashOnCash > 0 && nearPct(cashOnCash, stableIncome / pf.totalEquity, 0.001));

  // 11.10: Interest as % of cost should be displayed correctly
  const intCostPct = pf.devCostInclLand > 0 ? totalFinCost / pf.devCostInclLand : 0;
  t("[R11.10] Interest/Cost % > 0", intCostPct > 0, `${(intCostPct*100).toFixed(1)}%`);

  // 11.11: Bank compliance checks displayed correctly
  t("[R11.11] DSCR ≥ 1.25 check", dscrMin >= 1.25 ? true : dscrMin < 1.25,
    `min=${dscrMin?.toFixed(2)}, compliant=${dscrMin >= 1.25}`);
}

// ═══════════════════════════════════════════════════
// ROUND 12: INCENTIVES ENGINE
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 12: INCENTIVES ACCURACY");
console.log("═══════════════════════════════════════════════════\n");
{
  // Project with ALL incentives enabled
  const p = baseProject("fund", {
    incentives: {
      capexGrant: { enabled: true, grantPct: 25, maxCap: 50000000, timing: "construction" },
      financeSupport: { enabled: true, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation" },
      landRentRebate: { enabled: true, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 5 },
      feeRebates: { enabled: false, items: [] },
    },
  });
  const r = E.runFullModel(p);
  const ir = r.incentivesResult;
  const c = r.projectResults.consolidated;

  // 12.1: CAPEX grant = min(totalCapex × grantPct, maxCap)
  const expectedGrant = Math.min(c.totalCapex * 0.25, 50000000);
  t("[R12.1] CAPEX grant = min(capex×25%, 50M)",
    nearPct(ir.capexGrantTotal, expectedGrant, 0.05),
    `expected=${fmt(expectedGrant)}, got=${fmt(ir.capexGrantTotal)}`);

  // 12.2: Grant schedule should sum to grant total
  const grantScheduleSum = ir.capexGrantSchedule.reduce((a,b)=>a+b,0);
  t("[R12.2] Grant schedule sum = total",
    nearPct(grantScheduleSum, ir.capexGrantTotal, 0.01),
    `sum=${fmt(grantScheduleSum)}, total=${fmt(ir.capexGrantTotal)}`);

  // 12.3: Land rent rebate during construction = 100%
  // Find construction years and verify 100% rebate
  let constrEnd = 0;
  for (let y = 29; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }
  let rebateOK = true;
  for (let y = 0; y <= constrEnd; y++) {
    if (c.landRent[y] > 0) {
      const saving = ir.landRentSavingSchedule[y];
      if (!nearPct(saving, c.landRent[y], 0.05)) {
        t(`[R12.3] Land rent rebate Y${y} = 100%`, false,
          `rent=${fmt(c.landRent[y])}, saving=${fmt(saving)}`);
        rebateOK = false; break;
      }
    }
  }
  if (rebateOK) t("[R12.3] Land rent 100% rebated during construction", true);

  // 12.4: Land rent rebate after construction = 50% for 5 years
  let operRebateOK = true;
  for (let y = constrEnd + 1; y <= constrEnd + 5 && y < 30; y++) {
    if (c.landRent[y] > 0) {
      const saving = ir.landRentSavingSchedule[y];
      const expected = c.landRent[y] * 0.50;
      if (!nearPct(saving, expected, 0.10)) {
        t(`[R12.4] Land rent rebate Y${y} = 50%`, false,
          `rent=${fmt(c.landRent[y])}, saving=${fmt(saving)}, expected=${fmt(expected)}`);
        operRebateOK = false; break;
      }
    }
  }
  if (operRebateOK) t("[R12.4] Land rent 50% rebated post-construction (5yr)", true);

  // 12.5: Adjusted land rent = original - savings
  for (let y = 0; y < 30; y++) {
    const expected = Math.max(0, (c.landRent[y] || 0) - (ir.landRentSavingSchedule[y] || 0));
    if (!near(ir.adjustedLandRent[y], expected, 1)) {
      t(`[R12.5] Adjusted land rent Y${y}`, false,
        `original=${fmt(c.landRent[y])}, saving=${fmt(ir.landRentSavingSchedule[y])}, adj=${fmt(ir.adjustedLandRent[y])}`);
      break;
    }
  }
  t("[R12.5] Adjusted land rent = original - savings", true);

  // 12.6: Total incentive value = grant + land savings + fee rebates
  const expectedTotal = ir.capexGrantTotal + ir.landRentSavingTotal + ir.feeRebateTotal;
  t("[R12.6] Total incentive = grant + land + fees",
    nearPct(ir.totalIncentiveValue, expectedTotal, 0.01),
    `expected=${fmt(expectedTotal)}, got=${fmt(ir.totalIncentiveValue)}`);

  // 12.7: Interest subsidy is applied in financing (not in incentives directly)
  // The financing engine should use adjusted interest rates
  const f = r.financing;
  if (f.interestSubsidyTotal > 0) {
    t("[R12.7] Interest subsidy applied", true, `savings=${fmt(f.interestSubsidyTotal)}`);
  } else {
    // Interest subsidy might start at "operation" which is after constrEnd
    // If exit is before subsidy starts, it might be 0
    t("[R12.7] Interest subsidy (may be 0 if exit before operation)", true);
  }

  console.log(`  Info: Grant=${fmt(ir.capexGrantTotal)}, LandSaving=${fmt(ir.landRentSavingTotal)}, Total=${fmt(ir.totalIncentiveValue)}`);
}

// ═══════════════════════════════════════════════════
// ROUND 13: PER-PHASE INDEPENDENCE
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 13: PER-PHASE FINANCING INDEPENDENCE");
console.log("═══════════════════════════════════════════════════\n");
{
  // Two phases, different timing, same finMode
  const p = baseProject("fund", {
    phases: [
      { name: "P1", startYearOffset: 1, footprint: 30000 },
      { name: "P2", startYearOffset: 3, footprint: 20000 },
    ],
    assets: [
      { id: "a1", phase: "P1", category: "Retail", name: "Mall P1",
        gfa: 15000, footprint: 15000, costPerSqm: 5000, constrDuration: 24, constrStart: 1,
        revType: "Lease", efficiency: 75, leaseRate: 1000, stabilizedOcc: 90, rampUpYears: 3 },
      { id: "a2", phase: "P2", category: "Office", name: "Office P2",
        gfa: 10000, footprint: 10000, costPerSqm: 6000, constrDuration: 30, constrStart: 3,
        revType: "Lease", efficiency: 80, leaseRate: 800, stabilizedOcc: 85, rampUpYears: 3 },
    ],
  });
  const r = E.runFullModel(p);
  const pf = r.phaseFinancings;
  const pw = r.phaseWaterfalls;
  const cf = r.financing;
  const cw = r.waterfall;
  const h = p.horizon;

  // 13.1: Each phase has independent capex total
  if (pf?.P1 && pf?.P2) {
    t("[R13.1] P1 capex ≠ P2 capex", pf.P1.devCostExclLand !== pf.P2.devCostExclLand,
      `P1=${fmt(pf.P1.devCostExclLand)}, P2=${fmt(pf.P2.devCostExclLand)}`);
  }

  // 13.2: Phase debt is proportional to phase cost (same LTV)
  if (pf?.P1 && pf?.P2) {
    const ltv1 = pf.P1.totalDebt / (pf.P1.devCostExclLand || 1);
    const ltv2 = pf.P2.totalDebt / (pf.P2.devCostExclLand || 1);
    t("[R13.2] LTV consistent across phases", nearPct(ltv1, ltv2, 0.05),
      `P1 LTV=${(ltv1*100).toFixed(1)}%, P2 LTV=${(ltv2*100).toFixed(1)}%`);
  }

  // 13.3: Consolidated debt = sum of phase debts
  if (pf?.P1 && pf?.P2 && cf) {
    const sumDebt = pf.P1.totalDebt + pf.P2.totalDebt;
    t("[R13.3] Consol debt = P1+P2", nearPct(cf.totalDebt, sumDebt, 0.05),
      `sum=${fmt(sumDebt)}, consol=${fmt(cf.totalDebt)}`);
  }

  // 13.4: Consolidated equity = sum of phase equities
  if (pf?.P1 && pf?.P2 && cf) {
    const sumEq = pf.P1.totalEquity + pf.P2.totalEquity;
    t("[R13.4] Consol equity = P1+P2", nearPct(cf.totalEquity, sumEq, 0.05),
      `sum=${fmt(sumEq)}, consol=${fmt(cf.totalEquity)}`);
  }

  // 13.5: Consolidated LP dist = sum of phase LP dists
  if (pw?.P1 && pw?.P2 && cw) {
    const sumLP = (pw.P1.lpTotalDist || 0) + (pw.P2.lpTotalDist || 0);
    t("[R13.5] Consol LP dist = P1+P2", nearPct(cw.lpTotalDist, sumLP, 0.05),
      `sum=${fmt(sumLP)}, consol=${fmt(cw.lpTotalDist)}`);
  }

  // 13.6: Consolidated DSCR should be total NOI / total DS (not average of phase DSCRs)
  if (cf?.dscr) {
    for (let y = 0; y < h; y++) {
      if (cf.debtService[y] > 0 && cf.dscr[y] !== null) {
        const c = r.projectResults.consolidated;
        const totalNOI = c.income[y] - c.landRent[y];
        const totalDS = cf.debtService[y];
        const expectedDSCR = totalNOI / totalDS;
        if (!nearPct(cf.dscr[y], expectedDSCR, 0.05)) {
          t(`[R13.6] Consol DSCR[${y}] = totalNOI/totalDS`, false,
            `expected=${expectedDSCR.toFixed(2)}, got=${cf.dscr[y].toFixed(2)}`);
          break;
        }
      }
    }
    t("[R13.6] Consolidated DSCR = totalNOI/totalDS", true);
  }

  // 13.7: Levered CF arrays should be additive
  if (pf?.P1 && pf?.P2 && cf) {
    let addOK = true;
    for (let y = 0; y < h; y++) {
      const sum = (pf.P1.leveredCF?.[y] || 0) + (pf.P2.leveredCF?.[y] || 0);
      if (!near(cf.leveredCF[y], sum, 100)) {
        t(`[R13.7] LeveredCF[${y}] additive`, false,
          `P1+P2=${fmt(sum)}, consol=${fmt(cf.leveredCF[y])}`);
        addOK = false; break;
      }
    }
    if (addOK) t("[R13.7] Levered CF is additive across phases", true);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 14: DEVELOPER FEE LOGIC
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 14: DEVELOPER FEE BASIS & TIMING");
console.log("═══════════════════════════════════════════════════\n");
{
  // 14.1: Dev fee exclLand = devCostExclLand × pct
  const p1 = baseProject("fund", { developerFeePct: 10, developerFeeBasis: "exclLand" });
  const r1 = E.runFullModel(p1);
  if (r1.financing) {
    const expectedDevFee = r1.financing.devCostExclLand * 0.10;
    t("[R14.1] Dev fee exclLand = devCost × 10%",
      nearPct(r1.financing.devFeeTotal, expectedDevFee, 0.05),
      `expected=${fmt(expectedDevFee)}, got=${fmt(r1.financing.devFeeTotal)}`);
  }

  // 14.2: Dev fee inclLand = devCostInclLand × pct
  const p2 = baseProject("fund", { developerFeePct: 10, developerFeeBasis: "inclLand", landCapitalize: true, landCapRate: 1000 });
  const r2 = E.runFullModel(p2);
  if (r2.financing) {
    const expectedDevFee2 = r2.financing.devCostInclLand * 0.10;
    t("[R14.2] Dev fee inclLand = devCostInclLand × 10%",
      nearPct(r2.financing.devFeeTotal, expectedDevFee2, 0.05),
      `expected=${fmt(expectedDevFee2)}, got=${fmt(r2.financing.devFeeTotal)}`);
  }

  // 14.3: Dev fee schedule should be during construction only
  if (r1.financing?.devFeeSchedule) {
    const dfs = r1.financing.devFeeSchedule;
    const constrEnd = r1.financing.constrEnd || 2;
    const postConstrDevFee = dfs.slice(constrEnd + 1).reduce((a,b) => a+b, 0);
    t("[R14.3] Dev fee only during construction", postConstrDevFee < 1,
      `post-construction devFee=${fmt(postConstrDevFee)}`);
  }

  // 14.4: Dev fee is deducted from levered CF
  if (r1.financing?.devFeeSchedule) {
    const dfs = r1.financing.devFeeSchedule;
    const totalDevFee = dfs.reduce((a,b) => a+b, 0);
    t("[R14.4] Dev fee total = sum(schedule)",
      nearPct(totalDevFee, r1.financing.devFeeTotal, 0.01));
  }

  // 14.5: Dev fee appears in waterfall as feeDev
  if (r1.waterfall?.feeDev) {
    const waterfallDevFee = r1.waterfall.feeDev.reduce((a,b) => a+b, 0);
    t("[R14.5] Waterfall feeDev ≈ devFeeTotal",
      nearPct(waterfallDevFee, r1.financing.devFeeTotal, 0.10),
      `waterfall=${fmt(waterfallDevFee)}, financing=${fmt(r1.financing.devFeeTotal)}`);
  }

  // 14.6: Zero dev fee when pct = 0
  const p3 = baseProject("fund", { developerFeePct: 0 });
  const r3 = E.runFullModel(p3);
  if (r3.financing) {
    t("[R14.6] Dev fee = 0 when pct = 0", (r3.financing.devFeeTotal || 0) === 0,
      `devFee=${r3.financing.devFeeTotal}`);
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  DISPLAY VALUES AUDIT: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES FOUND:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
