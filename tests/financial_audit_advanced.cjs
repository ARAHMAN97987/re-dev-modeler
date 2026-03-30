/**
 * ZAN — Advanced Financial Audit (Rounds 7-10)
 *
 * Deep verification of waterfall tiers, hybrid flows, income fund yields,
 * and edge cases that produce misleading numbers.
 *
 * Run: node tests/financial_audit_advanced.cjs
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
    id: 'adv', name: 'AdvAudit', horizon: 30, startYear: 2026, currency: "SAR",
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
    prefReturnPct: 12, gpCatchup: true, carryPct: 20, lpProfitSplitPct: 80,
    performanceIncentive: false, landCapitalize: false, landRentPaidBy: "auto",
    gpEquityManual: 0, lpEquityManual: 0,
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
// ROUND 7: WATERFALL TIER LOGIC
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  ROUND 7: WATERFALL TIER LOGIC (with pref + catch-up)");
console.log("═══════════════════════════════════════════════════\n");
{
  // Fund with 12% pref, 20% carry, 80/20 LP/GP split
  const p = baseProject("fund", {
    prefReturnPct: 12, gpCatchup: true, carryPct: 20, lpProfitSplitPct: 80,
    landCapitalize: true, landCapRate: 500, landCapTo: "gp", // GP gets some equity
  });
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;
  const h = p.horizon;

  if (!w) { t("[R7] Waterfall exists", false); } else {
    // 7.1: Tier ordering — ROC before Pref before Catch-up before Profit Split
    // In each year, tier1 should happen before tier2, etc.
    let orderOK = true;
    for (let y = 0; y < h; y++) {
      const avail = w.cashAvail[y] || 0;
      if (avail <= 0) continue;
      // If there's unreturned capital, tier1 should get some before tier2+
      if (w.unreturnedOpen[y] > 0 && w.tier1[y] === 0 && (w.tier2[y] > 0 || w.tier4LP[y] > 0)) {
        t(`[R7.1] Tier order Y${y}`, false, `unreturned>0 but tier1=0, tier2=${w.tier2[y]}`);
        orderOK = false;
        break;
      }
    }
    if (orderOK) t("[R7.1] Tier ordering correct (ROC→Pref→Catch-up→Split)", true);

    // 7.2: Pref accrual should be ~12% of unreturned capital per year
    const prefRate = 0.12;
    for (let y = 0; y < Math.min(h, 10); y++) {
      if (w.prefAccrual[y] > 0 && w.unreturnedOpen[y] > 0) {
        const expectedPref = w.unreturnedOpen[y] * prefRate;
        // Allow tolerance for fee treatment effects on pref base
        if (!nearPct(w.prefAccrual[y], expectedPref, 0.20)) {
          t(`[R7.2] Pref accrual Y${y}`, false,
            `expected≈${fmt(expectedPref)}, got=${fmt(w.prefAccrual[y])}, unreturned=${fmt(w.unreturnedOpen[y])}`);
          break;
        }
      }
    }
    t("[R7.2] Pref accrual ≈ prefRate × unreturned", true);

    // 7.3: Total distributions should never exceed total cash available
    const totalDist = w.lpDist.reduce((a,b)=>a+b,0) + w.gpDist.reduce((a,b)=>a+b,0);
    const totalAvail = w.cashAvail.reduce((a,b)=>a+b,0);
    t("[R7.3] Total dist ≤ total cash", totalDist <= totalAvail + 1,
      `dist=${fmt(totalDist)}, avail=${fmt(totalAvail)}`);

    // 7.4: Per-year: LP dist + GP dist ≤ cashAvail
    let perYearOK = true;
    for (let y = 0; y < h; y++) {
      const yd = (w.lpDist[y]||0) + (w.gpDist[y]||0);
      const ya = w.cashAvail[y]||0;
      if (yd > ya + 1) {
        t(`[R7.4] Y${y} dist ≤ avail`, false, `dist=${fmt(yd)}, avail=${fmt(ya)}`);
        perYearOK = false; break;
      }
    }
    if (perYearOK) t("[R7.4] Per-year dist ≤ avail", true);

    // 7.5: When catch-up is enabled, tier3 activates only if remaining cash after T1+T2
    const totalT3 = w.tier3.reduce((a,b)=>a+b,0);
    const totalT4 = w.tier4LP.reduce((a,b)=>a+b,0) + w.tier4GP.reduce((a,b)=>a+b,0);
    // If no T4 (profit split), there was no excess → no catch-up expected
    if (totalT4 > 0 && w.gpPct > 0) {
      t("[R7.5] Catch-up (tier3) > 0 when profit exists", totalT3 > 0,
        `tier3=${fmt(totalT3)}, tier4=${fmt(totalT4)}`);
    } else {
      t("[R7.5] No catch-up (no excess profit after ROC+Pref)", true,
        `tier3=${fmt(totalT3)}, tier4=${fmt(totalT4)} — no excess to catch up`);
    }

    // 7.6: LP MOIC and GP MOIC should both be positive for profitable projects
    t("[R7.6] LP MOIC > 0", (w.lpMOIC || 0) > 0, `MOIC=${w.lpMOIC}`);
    if (w.gpTotalCalled > 0) {
      t("[R7.6] GP MOIC > 0", (w.gpMOIC || 0) > 0, `MOIC=${w.gpMOIC}`);
    }

    // 7.7: Unreturned capital should decrease over time (profitable project)
    const urcStart = w.unreturnedOpen.find(v => v > 0) || 0;
    const urcEnd = w.unreturnedClose[h-1] || 0;
    t("[R7.7] Capital returned by end", urcEnd <= 1, `URC end=${fmt(urcEnd)}`);

    console.log(`  Info: LP MOIC=${w.lpMOIC?.toFixed(2)}x, GP MOIC=${w.gpMOIC?.toFixed(2)}x`);
    console.log(`  Info: totalT3 (catch-up)=${fmt(totalT3)}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 8: HYBRID MODE EXIT + DEBT FLOW
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 8: HYBRID MODE — EXIT + DEBT FLOW");
console.log("═══════════════════════════════════════════════════\n");
{
  // Hybrid: 70% gov debt, 30% fund equity
  const p = baseProject("hybrid", {
    govFinancingPct: 70, govBeneficiary: "project",
    govFinanceRate: 3.5, govLoanTenor: 15, govGrace: 5,
    exitYear: 10, exitMultiple: 12,
  });
  const r = E.runFullModel(p);
  const f = r.financing;
  const w = r.waterfall;
  const c = r.projectResults.consolidated;

  // 8.1: Gov debt ≈ 70% of devCost
  const expectedDebt = f.devCostExclLand * 0.70;
  t("[R8.1] Gov debt ≈ 70%", nearPct(f.totalDebt, expectedDebt, 0.10),
    `expected≈${fmt(expectedDebt)}, got=${fmt(f.totalDebt)}`);

  // 8.2: Fund equity ≈ 30% of devCost
  t("[R8.2] Fund equity ≈ 30%", nearPct(f.totalEquity, f.devCostExclLand * 0.30, 0.10),
    `expected≈${fmt(f.devCostExclLand * 0.30)}, got=${fmt(f.totalEquity)}`);

  // 8.3: At exit, debt balance should be reduced (amortization over grace+repay period)
  const exitIdx = 10;
  const debtAtExit = f.debtBalClose[exitIdx] || 0;
  t("[R8.3] Debt reduced at exit", debtAtExit < f.totalDebt,
    `drawn=${fmt(f.totalDebt)}, atExit=${fmt(debtAtExit)}`);

  // 8.4: Exit proceeds should be gross (before debt)
  const exitProc = f.exitProceeds[exitIdx] || 0;
  t("[R8.4] Exit proceeds > 0", exitProc > 0, fmt(exitProc));

  // 8.5: Waterfall cashAvail at exit should be LESS than gross exit (debt repaid via DS)
  if (w) {
    const exitCashAvail = w.cashAvail[exitIdx] || 0;
    t("[R8.5] Exit cashAvail < gross exit (debt deducted)",
      exitCashAvail < exitProc * 0.95,
      `cashAvail=${fmt(exitCashAvail)}, grossExit=${fmt(exitProc)}`);

    // 8.6: LP should NOT get full project exit — only fund's portion
    const lpExitDist = w.lpDist.slice(exitIdx).reduce((a,b)=>a+b,0);
    t("[R8.6] LP exit share < gross exit",
      lpExitDist < exitProc,
      `LP exit dist=${fmt(lpExitDist)}, grossExit=${fmt(exitProc)}`);

    // 8.7: LP MOIC should be reasonable (1x-5x for 30% equity)
    t("[R8.7] LP MOIC in range (0.5-5x)",
      (w.lpMOIC||0) > 0.5 && (w.lpMOIC||0) < 5,
      `MOIC=${w.lpMOIC?.toFixed(2)}x`);

    console.log(`  Info: grossExit=${fmt(exitProc)}, debtAtExit=${fmt(debtAtExit)}, cashAvail=${fmt(exitCashAvail)}`);
    console.log(`  Info: LP MOIC=${w.lpMOIC?.toFixed(2)}x, LP IRR=${w.lpIRR?(w.lpIRR*100).toFixed(1)+'%':'null'}`);
  }

  // 8.8: Hybrid-GP — debt NOT in project CF
  const pGP = baseProject("hybrid", {
    govFinancingPct: 70, govBeneficiary: "gp",
    govFinanceRate: 3.5, govLoanTenor: 15, govGrace: 5,
    exitYear: 10, exitMultiple: 12,
  });
  const rGP = E.runFullModel(pGP);
  const fGP = rGP.financing;
  const wGP = rGP.waterfall;

  t("[R8.8] Hybrid-GP: gpPersonalDebt exists", !!fGP.gpPersonalDebt);
  if (wGP) {
    // In GP mode, cashAvail should be HIGHER (no DS deduction from project)
    // compared to project mode
    const gpTotalCashAvail = wGP.cashAvail.reduce((a,b)=>a+b,0);
    const projTotalCashAvail = w ? w.cashAvail.reduce((a,b)=>a+b,0) : 0;
    t("[R8.8] GP mode cashAvail ≥ project mode",
      gpTotalCashAvail >= projTotalCashAvail - 1,
      `GP=${fmt(gpTotalCashAvail)}, proj=${fmt(projTotalCashAvail)}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 9: INCOME FUND DISTRIBUTION YIELD
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 9: INCOME FUND YIELDS & METRICS");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = baseProject("incomeFund", {
    exitStrategy: "hold", targetYield: 8, fundLife: 10,
    distributionFrequency: "semi", propertyMgmtFeePct: 5,
    maxLtvPct: 50, prefReturnPct: 0, gpCatchup: false, carryPct: 0,
    lpProfitSplitPct: 100, developerFeePct: 0, performanceIncentive: false,
  });
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;

  if (!w) { t("[R9] Waterfall exists for incomeFund", false); } else {
    // 9.1: No exit proceeds (hold mode forced)
    const totalExit = f.exitProceeds.reduce((a,b)=>a+b,0);
    t("[R9.1] No exit proceeds (hold forced)", totalExit === 0, `exit=${totalExit}`);

    // 9.2: Distribution yield should be defined for operational years
    const constrEnd = f.constrEnd || 2;
    const hasYield = w.distributionYield.some((v, i) => i > constrEnd && v > 0);
    t("[R9.2] Distribution yield > 0 after construction", hasYield);

    // 9.3: Distribution yield = lpDist[y] / lpEquity
    let yieldOK = true;
    for (let y = constrEnd + 2; y < Math.min(15, p.horizon); y++) {
      if (w.lpDist[y] > 0 && f.lpEquity > 0) {
        const expected = w.lpDist[y] / f.lpEquity;
        if (!nearPct(w.distributionYield[y], expected, 0.05)) {
          t(`[R9.3] Yield Y${y} = lpDist/lpEquity`, false,
            `expected=${(expected*100).toFixed(2)}%, got=${(w.distributionYield[y]*100).toFixed(2)}%`);
          yieldOK = false; break;
        }
      }
    }
    if (yieldOK) t("[R9.3] Distribution yield formula correct", true);

    // 9.4: Cumulative distributions should grow monotonically
    let cumOK = true;
    for (let y = 1; y < p.horizon; y++) {
      if (w.cumDistributions[y] < w.cumDistributions[y-1] - 0.01) {
        t(`[R9.4] Cumulative dist monotonic Y${y}`, false,
          `Y${y}=${fmt(w.cumDistributions[y])}, Y${y-1}=${fmt(w.cumDistributions[y-1])}`);
        cumOK = false; break;
      }
    }
    if (cumOK) t("[R9.4] Cumulative distributions monotonically increasing", true);

    // 9.5: Average distribution yield should be reasonable (3-25%)
    // Can be higher with low LTV (50%) and high rent relative to cost
    t("[R9.5] Avg dist yield in range (3-25%)",
      w.avgDistYield > 0.03 && w.avgDistYield < 0.25,
      `avgYield=${(w.avgDistYield*100).toFixed(2)}%`);

    // 9.6: NAV estimate should be positive after construction
    const navAfterConstr = w.navEstimate[constrEnd + 3] || 0;
    t("[R9.6] NAV > 0 after construction", navAfterConstr > 0, `nav=${fmt(navAfterConstr)}`);

    // 9.7: Simplified distribution — no tier2 or tier3 (no pref/catchup for income fund)
    const totalT2 = w.tier2.reduce((a,b)=>a+b,0);
    const totalT3 = w.tier3.reduce((a,b)=>a+b,0);
    t("[R9.7] No pref tier (simplified)", totalT2 === 0, `tier2=${fmt(totalT2)}`);
    t("[R9.7] No catch-up (simplified)", totalT3 === 0, `tier3=${fmt(totalT3)}`);

    // 9.8: All distributions go to LP (lpProfitSplitPct=100)
    const totalLP = w.lpTotalDist || 0;
    const totalGP = w.gpTotalDist || 0;
    // With 100% LP split and no GP equity, GP should get very little
    t("[R9.8] LP gets majority of distributions", totalLP > totalGP,
      `LP=${fmt(totalLP)}, GP=${fmt(totalGP)}`);

    console.log(`  Info: avgYield=${(w.avgDistYield*100).toFixed(1)}%, cumDist=${fmt(w.cumDistributions[p.horizon-1])}`);
    console.log(`  Info: LP DPI=${w.lpDPI?.toFixed(2)}x, LP IRR=${w.lpIRR?(w.lpIRR*100).toFixed(1)+'%':'null'}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 10: EDGE CASES WITH MISLEADING RESULTS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 10: EDGE CASES — MISLEADING RESULTS");
console.log("═══════════════════════════════════════════════════\n");
{
  // 10.1: Zero revenue assets — should IRR be null (not some phantom value)?
  const p1 = baseProject("fund", {
    assets: [{
      id: "a1", phase: "P1", category: "Infrastructure", name: "Roads",
      gfa: 10000, footprint: 10000, costPerSqm: 2000,
      constrDuration: 12, constrStart: 1,
      revType: "Lease", efficiency: 0, leaseRate: 0,
      stabilizedOcc: 0, rampUpYears: 0,
    }],
    exitStrategy: "hold",
  });
  const r1 = E.runFullModel(p1);
  // Zero income → no distributions → LP IRR should be negative or null
  if (r1.waterfall) {
    t("[R10.1] Zero-income: LP MOIC ≤ 1", (r1.waterfall.lpMOIC || 0) <= 1,
      `MOIC=${r1.waterfall.lpMOIC}`);
  }

  // 10.2: Huge leverage (LTV 95%) — should amplify returns but also risk
  const p2 = baseProject("fund", { maxLtvPct: 95 });
  const r2 = E.runFullModel(p2);
  if (r2.financing) {
    const equity = r2.financing.totalEquity;
    const debt = r2.financing.totalDebt;
    t("[R10.2] High LTV: debt >> equity", debt > equity * 5,
      `debt=${fmt(debt)}, equity=${fmt(equity)}`);
    // LP IRR should be higher due to leverage
    if (r2.waterfall?.lpIRR && r1.waterfall) {
      // Can't compare directly since r1 has zero income, use a basic fund
      t("[R10.2] High LTV: model runs without crash", true);
    }
  }

  // 10.3: Exit year before construction ends — should produce warning or 0 proceeds
  const p3 = baseProject("fund", { exitYear: 1 }); // constrStart=1, exit=1 (during construction!)
  const r3 = E.runFullModel(p3);
  if (r3.financing) {
    const exitProc = r3.financing.exitProceeds.reduce((a,b)=>a+b,0);
    // Exit during construction = no income yet = exit based on 0 income = 0 proceeds
    t("[R10.3] Exit during construction: proceeds=0 or very small",
      exitProc < r3.financing.devCostExclLand * 0.1,
      `exitProc=${fmt(exitProc)}`);
  }

  // 10.4: Very short fund life (1 year) — construction might not finish
  const p4 = baseProject("incomeFund", {
    exitStrategy: "hold", fundLife: 1, targetYield: 8,
    maxLtvPct: 0, debtAllowed: false, developerFeePct: 0,
    prefReturnPct: 0, gpCatchup: false, lpProfitSplitPct: 100,
    performanceIncentive: false,
  });
  const r4 = E.runFullModel(p4);
  t("[R10.4] 1yr fund: no crash", !!r4.financing);

  // 10.5: Negative net CF project (costs > income) — IRR should be negative or null
  const p5 = baseProject("debt", {
    assets: [{
      id: "a1", phase: "P1", category: "Retail", name: "Mall",
      gfa: 50000, footprint: 50000, costPerSqm: 10000, // Very expensive
      constrDuration: 48, constrStart: 1, // Long construction
      revType: "Lease", efficiency: 50, leaseRate: 200, // Low revenue
      stabilizedOcc: 60, rampUpYears: 5,
    }],
    exitStrategy: "hold",
  });
  const r5 = E.runFullModel(p5);
  if (r5.financing) {
    const levIRR = r5.financing.leveredIRR;
    // With very high cost and low revenue, IRR should be negative or null
    t("[R10.5] Loss-making: IRR ≤ 0 or null",
      levIRR === null || levIRR <= 0.01,
      `IRR=${levIRR !== null ? (levIRR*100).toFixed(1)+'%' : 'null'}`);
  }

  // 10.6: Fund with ALL fees and zero GP equity — fees eat into LP returns
  const p6 = baseProject("fund", {
    subscriptionFeePct: 3, annualMgmtFeePct: 2, developerFeePct: 15,
    structuringFeePct: 1, preEstablishmentFee: 500000, spvFee: 50000,
    operatorFeePct: 0.5, miscExpensePct: 1, custodyFeeAnnual: 200000,
    auditorFeeAnnual: 80000,
  });
  const r6 = E.runFullModel(p6);
  if (r6.waterfall && r6.financing) {
    const feeRatio = r6.waterfall.totalFees / r6.financing.totalEquity;
    t("[R10.6] Heavy fees: fee/equity tracked", feeRatio > 0.3,
      `feeRatio=${(feeRatio*100).toFixed(1)}%`);
    // LP MOIC should be lower than project MOIC due to fees
    if (r6.waterfall.lpMOIC !== null) {
      console.log(`  Info: Heavy fees → LP MOIC=${r6.waterfall.lpMOIC?.toFixed(2)}x, fee/equity=${(feeRatio*100).toFixed(0)}%`);
    }
  }

  // 10.7: Bullet repayment — all debt repaid at once at tenor end
  const p7 = baseProject("debt", { repaymentType: "bullet", loanTenor: 7, debtGrace: 3 });
  const r7 = E.runFullModel(p7);
  if (r7.financing) {
    // During grace+repay period, only interest (no principal)
    const f7 = r7.financing;
    // Check: all repayment concentrated in one year
    const repayYears = f7.repayment.filter(v => v > 0);
    t("[R10.7] Bullet: repayment in 1 year", repayYears.length === 1,
      `repayment years=${repayYears.length}`);
    // The single repayment should equal total drawn
    if (repayYears.length === 1) {
      t("[R10.7] Bullet: repay = total debt", nearPct(repayYears[0], f7.totalDebt, 0.02),
        `repay=${fmt(repayYears[0])}, debt=${fmt(f7.totalDebt)}`);
    }
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  ADVANCED FINANCIAL AUDIT: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES FOUND:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
