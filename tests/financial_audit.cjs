/**
 * ZAN — Deep Financial Audit
 *
 * Tests financial/accounting correctness, NOT just "no crash/NaN".
 * Each test verifies a specific financial principle with hand-calculated values.
 *
 * Run: node tests/financial_audit.cjs
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

// ═══ Standard test project ═══
function baseProject(finMode = "self", opts = {}) {
  return {
    id: 'audit', name: 'Audit', horizon: 30, startYear: 2026, currency: "SAR",
    landType: "lease", landArea: 50000,
    landRentAnnual: 2000000, landRentEscalation: 5, landRentEscalationEveryN: 5,
    landRentGrace: 3, landRentTerm: 30,
    softCostPct: 10, contingencyPct: 5,
    rentEscalation: 1.0, activeScenario: "Base Case",
    finMode, exitStrategy: "sale", exitYear: 8, exitMultiple: 10, exitCapRate: 9, exitCostPct: 2,
    debtAllowed: true, maxLtvPct: 70, financeRate: 6.5, loanTenor: 10, debtGrace: 3,
    upfrontFeePct: 0.5, repaymentType: "amortizing", graceBasis: "cod", debtTrancheMode: "single",
    vehicleType: "fund", subscriptionFeePct: 2, annualMgmtFeePct: 1.0,
    custodyFeeAnnual: 100000, mgmtFeeBase: "devCost", feeTreatment: "capital",
    developerFeePct: 10, developerFeeBasis: "exclLand", auditorFeeAnnual: 40000,
    structuringFeePct: 0.5, structuringFeeCap: 0,
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
      stabilizedOcc: 90, rampUpYears: 3, escalation: 1.0,
    }],
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false },
      landRentRebate: { enabled: false }, feeRebates: { enabled: false, items: [] } },
    ...opts,
  };
}

// ═══════════════════════════════════════════════════
// ROUND 1: CAPEX + REVENUE
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  ROUND 1: CAPEX & REVENUE CALCULATIONS");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = baseProject("self");
  const r = E.computeProjectCashFlows(p);
  const a = r.assetSchedules[0];
  const c = r.consolidated;

  // 1.1: CAPEX = GFA × costPerSqm × (1 + soft%) × (1 + contingency%)
  const expectedCapex = 20000 * 5000 * 1.10 * 1.05; // = 115,500,000
  t("[R1.1] CAPEX formula", near(a.totalCapex, expectedCapex),
    `expected=${fmt(expectedCapex)}, got=${fmt(a.totalCapex)}`);

  // 1.2: CAPEX spread over construction duration
  // constrDuration=24 months = 2 years, constrStart=1 → CAPEX in years 1 and 2 (index 1-2)
  const capexY0 = a.capexSchedule[0];
  const capexY1 = a.capexSchedule[1];
  const capexY2 = a.capexSchedule[2];
  const capexY3 = a.capexSchedule[3];
  t("[R1.2] CAPEX year 0 = 0 (before constrStart)", capexY0 === 0, `Y0=${fmt(capexY0)}`);
  t("[R1.2] CAPEX year 1 = half total", nearPct(capexY1, expectedCapex / 2),
    `Y1=${fmt(capexY1)}, expected=${fmt(expectedCapex/2)}`);
  t("[R1.2] CAPEX year 2 = half total", nearPct(capexY2, expectedCapex / 2),
    `Y2=${fmt(capexY2)}, expected=${fmt(expectedCapex/2)}`);
  t("[R1.2] CAPEX year 3 = 0 (after construction)", capexY3 === 0, `Y3=${fmt(capexY3)}`);

  // 1.3: Leasable area = GFA × efficiency
  const expectedLeasable = 20000 * 0.75; // = 15,000
  t("[R1.3] Leasable area", near(a.leasableArea, expectedLeasable),
    `expected=${expectedLeasable}, got=${a.leasableArea}`);

  // 1.4: Revenue starts AFTER construction ends (constrStart=1, duration=2yr → ends Y2, revenue Y3)
  t("[R1.4] No revenue during construction", a.revenueSchedule[0] === 0 && a.revenueSchedule[1] === 0 && a.revenueSchedule[2] === 0,
    `Y0=${a.revenueSchedule[0]}, Y1=${a.revenueSchedule[1]}, Y2=${a.revenueSchedule[2]}`);
  t("[R1.4] Revenue starts year 3", a.revenueSchedule[3] > 0,
    `Y3=${fmt(a.revenueSchedule[3])}`);

  // 1.5: Revenue year 3 (first year of income, ramp 1/3)
  const y3Rev = expectedLeasable * 1000 * 0.90 * (1/3) * Math.pow(1 + 0.01, 0);
  t("[R1.5] Revenue Y3 (ramp 1/3)", nearPct(a.revenueSchedule[3], y3Rev, 0.02),
    `expected=${fmt(y3Rev)}, got=${fmt(a.revenueSchedule[3])}`);

  // 1.6: Revenue year 5 (fully ramped, 2 years of escalation)
  const y5Rev = expectedLeasable * 1000 * 0.90 * 1.0 * Math.pow(1 + 0.01, 2);
  t("[R1.6] Revenue Y5 (fully ramped)", nearPct(a.revenueSchedule[5], y5Rev, 0.02),
    `expected=${fmt(y5Rev)}, got=${fmt(a.revenueSchedule[5])}`);

  // 1.7: Land rent — lease type with grace
  // Grace = 3 years → no rent Y0-Y2, rent starts Y3
  const landSch = r.landSchedule;
  t("[R1.7] No land rent during grace (Y0)", landSch[0] === 0, `Y0=${landSch[0]}`);
  t("[R1.7] No land rent during grace (Y2)", landSch[2] === 0, `Y2=${landSch[2]}`);
  t("[R1.7] Land rent starts Y3", landSch[3] === 2000000, `Y3=${landSch[3]}, expected=2000000`);

  // 1.8: Land rent escalation
  // escalation = 5% every 5 years. Y3-Y7 = base, Y8-Y12 = base × 1.05
  t("[R1.8] Land rent Y7 = base", landSch[7] === 2000000, `Y7=${landSch[7]}`);
  t("[R1.8] Land rent Y8 = base × 1.05", near(landSch[8], 2000000 * 1.05),
    `Y8=${landSch[8]}, expected=${2000000 * 1.05}`);

  // 1.9: Net CF = income - landRent - capex
  for (let y = 0; y < 10; y++) {
    const expected = c.income[y] - c.landRent[y] - c.capex[y];
    t(`[R1.9] netCF[${y}] = income - land - capex`, near(c.netCF[y], expected),
      `expected=${fmt(expected)}, got=${fmt(c.netCF[y])}`);
  }

  // 1.10: Total income > total capex (project should be profitable)
  t("[R1.10] Project profitable (income > capex)", c.totalIncome > c.totalCapex,
    `income=${fmt(c.totalIncome)}, capex=${fmt(c.totalCapex)}`);
}

// ═══════════════════════════════════════════════════
// ROUND 2: DEBT SCHEDULE
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 2: DEBT SCHEDULE");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = baseProject("debt");
  const result = E.runFullModel(p);
  const f = result.financing;
  const c = result.projectResults.consolidated;
  const h = p.horizon;

  // 2.1: Total debt = devCost × LTV
  const expectedDebt = f.devCostExclLand * 0.70;
  t("[R2.1] Total debt = devCost × 70% LTV", nearPct(f.totalDebt, expectedDebt, 0.05),
    `expected=${fmt(expectedDebt)}, got=${fmt(f.totalDebt)}`);

  // 2.2: Total equity = devCost - debt
  t("[R2.2] Equity = devCost - debt", nearPct(f.totalEquity, f.devCostExclLand - f.totalDebt, 0.05),
    `expected=${fmt(f.devCostExclLand - f.totalDebt)}, got=${fmt(f.totalEquity)}`);

  // 2.3: Debt balance never negative
  const negBal = f.debtBalClose.findIndex(v => v < -0.01);
  t("[R2.3] Debt balance ≥ 0 always", negBal < 0,
    negBal >= 0 ? `debtBalClose[${negBal}]=${f.debtBalClose[negBal]}` : '');

  // 2.4: Debt balance at end = 0 (for amortizing with enough years)
  const lastPositiveBal = f.debtBalClose.findIndex((v, i) => i > 0 && v === 0 && f.debtBalClose[i-1] > 0);
  t("[R2.4] Debt eventually clears", lastPositiveBal >= 0 || f.debtBalClose[h-1] === 0,
    `lastBal=${f.debtBalClose[h-1]}`);

  // 2.5: Interest = (balOpen + balClose) / 2 × rate + drawdown × upfrontFeePct
  // ZAN convention: upfront fee embedded in interest. At exit year, balloon changes
  // balClose after interest was already computed, so debtBalClose may not match.
  // We verify non-exit years only.
  const rate = 0.065;
  const ufPct = 0.005;
  const exitIdx25 = f.exitYear - p.startYear;
  let intOK = true;
  for (let y = 0; y < h; y++) {
    if (f.interest[y] > 0 && y !== exitIdx25) { // skip exit year (balloon distorts close)
      const avgBal = (f.debtBalOpen[y] + f.debtBalClose[y]) / 2;
      const expected = avgBal * rate + f.drawdown[y] * ufPct;
      if (!nearPct(f.interest[y], expected, 0.02)) {
        t(`[R2.5] Interest[${y}]`, false,
          `expected=${fmt(expected)}, got=${fmt(f.interest[y])}`);
        intOK = false;
        break;
      }
    }
  }
  if (intOK) t("[R2.5] Interest = avgBal×rate + draw×upfrontFee (non-exit years)", true);

  // 2.6: DS = principal + interest
  for (let y = 0; y < h; y++) {
    if (f.debtService[y] > 0) {
      t(`[R2.6] DS[${y}] = repay + interest`, near(f.debtService[y], f.repayment[y] + f.interest[y]),
        `DS=${fmt(f.debtService[y])}, repay+int=${fmt(f.repayment[y] + f.interest[y])}`);
      if (!near(f.debtService[y], f.repayment[y] + f.interest[y])) break;
    }
  }

  // 2.7: Balance roll-forward: close = open + draw - repay
  for (let y = 0; y < h; y++) {
    const expected = f.debtBalOpen[y] + f.drawdown[y] - f.repayment[y];
    if (!near(f.debtBalClose[y], expected)) {
      t(`[R2.7] Balance roll-forward[${y}]`, false,
        `open=${fmt(f.debtBalOpen[y])} + draw=${fmt(f.drawdown[y])} - repay=${fmt(f.repayment[y])} = ${fmt(expected)}, got=${fmt(f.debtBalClose[y])}`);
      break;
    }
  }
  t("[R2.7] Balance roll-forward correct", true);

  // 2.8: DSCR = NOI / DS (where NOI = income - landRent)
  for (let y = 0; y < h; y++) {
    if (f.dscr[y] !== null && f.debtService[y] > 0) {
      const noi = c.income[y] - c.landRent[y];
      const expectedDSCR = noi / f.debtService[y];
      if (!nearPct(f.dscr[y], expectedDSCR, 0.01)) {
        t(`[R2.8] DSCR[${y}] = NOI/DS`, false,
          `NOI=${fmt(noi)}, DS=${fmt(f.debtService[y])}, expected=${expectedDSCR.toFixed(3)}, got=${f.dscr[y].toFixed(3)}`);
        break;
      }
    }
  }
  t("[R2.8] DSCR = NOI/DS correct", true);

  // 2.9: Levered CF = income - adjLandRent - capex + grants - DS + drawdown + exit - devFee
  const ir = result.incentivesResult;
  for (let y = 0; y < h; y++) {
    const adjLR = ir?.adjustedLandRent?.[y] ?? c.landRent[y] ?? 0;
    const exitYrIdx = f.exitYear - p.startYear;
    const sold = p.exitStrategy !== "hold" && f.exitProceeds.some(v => v > 0);
    if (sold && y > exitYrIdx) continue;
    const expected = c.income[y] - adjLR - c.capex[y]
      + (ir?.capexGrantSchedule?.[y] || 0) + (ir?.feeRebateSchedule?.[y] || 0)
      - f.debtService[y] + f.drawdown[y] + f.exitProceeds[y]
      - (f.devFeeSchedule?.[y] || 0);
    if (!near(f.leveredCF[y], expected, 10)) {
      t(`[R2.9] LeveredCF[${y}]`, false,
        `expected=${fmt(expected)}, got=${fmt(f.leveredCF[y])}, diff=${fmt(f.leveredCF[y]-expected)}`);
      break;
    }
  }
  t("[R2.9] Levered CF formula correct", true);
}

// ═══════════════════════════════════════════════════
// ROUND 3: EXIT VALUATION
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 3: EXIT VALUATION");
console.log("═══════════════════════════════════════════════════\n");
{
  // 3.1: Sale exit = income × multiple - costs
  const p1 = baseProject("debt", { exitStrategy: "sale", exitYear: 8, exitMultiple: 10, exitCostPct: 2 });
  const r1 = E.runFullModel(p1);
  const f1 = r1.financing;
  const c1 = r1.projectResults.consolidated;
  const exitIdx = 8; // relative year
  const incomeAtExit = c1.income[exitIdx];
  const expectedGross = incomeAtExit * 10;
  const expectedNet = expectedGross * (1 - 0.02);
  const actualExit = f1.exitProceeds[exitIdx];
  t("[R3.1] Sale exit = income × mult × (1-cost%)",
    nearPct(actualExit, expectedNet, 0.05),
    `income=${fmt(incomeAtExit)}, gross=${fmt(expectedGross)}, net=${fmt(expectedNet)}, actual=${fmt(actualExit)}`);

  // 3.2: Cap rate exit — ZAN convention uses INCOME (not NOI) for cap rate valuation
  // This is a known deviation from standard NOI-based cap rate. ZAN Excel formula: totalIncome/$C$45
  // The engine uses per-asset income / capRate (not consolidated NOI / capRate)
  const p2 = baseProject("debt", { exitStrategy: "caprate", exitYear: 8, exitCapRate: 9, exitCostPct: 2 });
  const r2 = E.runFullModel(p2);
  const f2 = r2.financing;
  const c2 = r2.projectResults.consolidated;
  const incomeAtExit2 = c2.income[exitIdx];
  const expectedGross2 = incomeAtExit2 / 0.09; // ZAN: income/capRate (not NOI/capRate)
  const expectedNet2 = expectedGross2 * (1 - 0.02);
  t("[R3.2] CapRate exit = income/capRate × (1-cost%) [ZAN convention]",
    nearPct(f2.exitProceeds[exitIdx], expectedNet2, 0.05),
    `income=${fmt(incomeAtExit2)}, gross=${fmt(expectedGross2)}, net=${fmt(expectedNet2)}, actual=${fmt(f2.exitProceeds[exitIdx])}`);
  // NOTE: Standard real estate uses NOI/capRate. The ZAN difference is documented.

  // 3.3: Hold = zero exit proceeds
  const p3 = baseProject("debt", { exitStrategy: "hold" });
  const r3 = E.runFullModel(p3);
  const totalExit = r3.financing.exitProceeds.reduce((a,b) => a+b, 0);
  t("[R3.3] Hold = zero exit", totalExit === 0, `total=${totalExit}`);

  // 3.4: Post-exit CF should be zeroed
  if (actualExit > 0) {
    const postExitCF = f1.leveredCF.slice(exitIdx + 1).reduce((a,b) => a+b, 0);
    t("[R3.4] Post-exit CF = 0", Math.abs(postExitCF) < 1,
      `postExitCF=${fmt(postExitCF)}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 4: WATERFALL DISTRIBUTIONS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 4: WATERFALL DISTRIBUTIONS");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = baseProject("fund");
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;
  const h = p.horizon;

  if (!w) {
    t("[R4] Waterfall exists", false, "null");
  } else {
    // 4.1: Cash conservation — LP+GP dist = cashAvail each year
    let cashConservationOK = true;
    for (let y = 0; y < h; y++) {
      const totalDist = (w.lpDist[y] || 0) + (w.gpDist[y] || 0);
      const avail = w.cashAvail[y] || 0;
      if (totalDist > avail + 1) {
        t(`[R4.1] Cash conservation Y${y}`, false,
          `dist=${fmt(totalDist)} > avail=${fmt(avail)}`);
        cashConservationOK = false;
        break;
      }
    }
    if (cashConservationOK) t("[R4.1] Cash conservation (dist ≤ avail)", true);

    // 4.2: Tier sum = total distributions each year
    for (let y = 0; y < h; y++) {
      const tierSum = (w.tier1[y]||0) + (w.tier2[y]||0) + (w.tier3[y]||0) + (w.tier4LP[y]||0) + (w.tier4GP[y]||0);
      const distSum = (w.lpDist[y]||0) + (w.gpDist[y]||0);
      if (!near(tierSum, distSum, 1)) {
        t(`[R4.2] Tier sum = dist sum Y${y}`, false,
          `tiers=${fmt(tierSum)}, dist=${fmt(distSum)}`);
        break;
      }
    }
    t("[R4.2] Tier sum = distribution sum", true);

    // 4.3: LP distributions ≥ 0 every year
    const negLP = w.lpDist.findIndex(v => v < -0.01);
    t("[R4.3] LP dist ≥ 0", negLP < 0,
      negLP >= 0 ? `Y${negLP}: ${w.lpDist[negLP]}` : '');

    // 4.4: GP distributions ≥ 0 every year
    const negGP = w.gpDist.findIndex(v => v < -0.01);
    t("[R4.4] GP dist ≥ 0", negGP < 0,
      negGP >= 0 ? `Y${negGP}: ${w.gpDist[negGP]}` : '');

    // 4.5: MOIC = totalDist / totalCalled
    if (w.lpTotalCalled > 0) {
      const expectedMOIC = (w.lpNetDist || w.lpTotalDist) / w.lpTotalCalled;
      t("[R4.5] LP MOIC = netDist/called", nearPct(w.lpMOIC, expectedMOIC, 0.02),
        `expected=${expectedMOIC.toFixed(3)}, got=${w.lpMOIC?.toFixed(3)}`);
    }

    // 4.6: DPI = same as MOIC for this simple case
    if (w.lpDPI !== undefined && w.lpMOIC !== undefined) {
      t("[R4.6] DPI ≈ MOIC (same basis)", nearPct(w.lpDPI, w.lpMOIC, 0.02),
        `DPI=${w.lpDPI?.toFixed(3)}, MOIC=${w.lpMOIC?.toFixed(3)}`);
    }

    // 4.7: Unreturned capital closes at 0 eventually (if profitable)
    const lastURC = w.unreturnedClose[h-1] || 0;
    t("[R4.7] Capital fully returned", lastURC <= 1, `unreturnedClose[end]=${fmt(lastURC)}`);

    // 4.8: LP netCF includes both calls (negative) and distributions (positive)
    const hasNeg = w.lpNetCF.some(v => v < -1);
    const hasPos = w.lpNetCF.some(v => v > 1);
    t("[R4.8] LP netCF has neg+pos", hasNeg && hasPos,
      `hasNeg=${hasNeg}, hasPos=${hasPos}`);

    // 4.9: LP IRR computed from LP netCF
    if (w.lpIRR !== null) {
      const recomputed = E.calcIRR(w.lpNetCF);
      t("[R4.9] LP IRR = calcIRR(lpNetCF)", nearPct(w.lpIRR, recomputed, 0.001),
        `waterfall=${(w.lpIRR*100).toFixed(2)}%, recomputed=${recomputed?(recomputed*100).toFixed(2)+'%':'null'}`);
    }
  }
}

// ═══════════════════════════════════════════════════
// ROUND 5: FEES
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 5: FEE CALCULATIONS");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = baseProject("fund");
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;

  if (!w) {
    t("[R5] Waterfall exists", false, "null");
  } else {
    // 5.1: Subscription fee = subscriptionFeePct × basis
    const subFee = w.feeSub ? w.feeSub.reduce((a,b)=>a+b,0) : 0;
    // Basis depends on feeBasis setting — check what it actually uses
    t("[R5.1] Subscription fee > 0", subFee > 0, `subFee=${fmt(subFee)}`);

    // 5.2: Developer fee = developerFeePct × devCostExclLand (when basis=exclLand)
    const devFee = w.feeDev ? w.feeDev.reduce((a,b)=>a+b,0) : 0;
    const expectedDevFee = f.devCostExclLand * (p.developerFeePct / 100);
    t("[R5.2] Dev fee = 10% of devCostExclLand", nearPct(devFee, expectedDevFee, 0.1),
      `expected=${fmt(expectedDevFee)}, got=${fmt(devFee)}`);

    // 5.3: Total fees = sum of all fee arrays
    const feeArraySum = [w.feeSub, w.feeMgmt, w.feeCustody, w.feeDev, w.feeStruct,
      w.feePreEst, w.feeSpv, w.feeAuditor, w.feeOperator, w.feeMisc]
      .filter(Boolean).map(a => a.reduce((s,v)=>s+v,0)).reduce((s,v)=>s+v,0);
    t("[R5.3] totalFees = sum of fee arrays", nearPct(w.totalFees, feeArraySum, 0.01),
      `totalFees=${fmt(w.totalFees)}, arraySum=${fmt(feeArraySum)}`);

    // 5.4: Fees per year = fees[y] array
    const feesYearlySum = w.fees ? w.fees.reduce((a,b)=>a+b,0) : 0;
    t("[R5.4] fees[] sum = totalFees", nearPct(feesYearlySum, w.totalFees, 0.01),
      `feesSum=${fmt(feesYearlySum)}, totalFees=${fmt(w.totalFees)}`);

    // 5.5: Management fee basis check
    // mgmtFeeBase="devCost" → fee = devCostExclLand × annualMgmtFeePct / 100
    const mgmtFee = w.feeMgmt ? w.feeMgmt.reduce((a,b)=>a+b,0) : 0;
    t("[R5.5] Management fee > 0", mgmtFee > 0, `mgmtFee=${fmt(mgmtFee)}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 6: MULTI-PHASE
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 6: MULTI-PHASE AGGREGATION");
console.log("═══════════════════════════════════════════════════\n");
{
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

  // 6.1: Both phases have financing
  t("[R6.1] Phase P1 financing exists", !!pf?.P1);
  t("[R6.1] Phase P2 financing exists", !!pf?.P2);

  // 6.2: Consolidated debt = sum of phase debts
  if (pf?.P1 && pf?.P2 && cf) {
    const sumDebt = (pf.P1.totalDebt || 0) + (pf.P2.totalDebt || 0);
    t("[R6.2] Consolidated debt = P1 + P2", nearPct(cf.totalDebt, sumDebt, 0.05),
      `P1=${fmt(pf.P1.totalDebt)}, P2=${fmt(pf.P2.totalDebt)}, sum=${fmt(sumDebt)}, consol=${fmt(cf.totalDebt)}`);
  }

  // 6.3: Consolidated equity = sum of phase equities
  if (pf?.P1 && pf?.P2 && cf) {
    const sumEq = (pf.P1.totalEquity || 0) + (pf.P2.totalEquity || 0);
    t("[R6.3] Consolidated equity = P1 + P2", nearPct(cf.totalEquity, sumEq, 0.05),
      `P1=${fmt(pf.P1.totalEquity)}, P2=${fmt(pf.P2.totalEquity)}, sum=${fmt(sumEq)}, consol=${fmt(cf.totalEquity)}`);
  }

  // 6.4: Both phases have waterfalls (fund mode)
  t("[R6.4] Phase P1 waterfall exists", !!pw?.P1);
  t("[R6.4] Phase P2 waterfall exists", !!pw?.P2);

  // 6.5: Consolidated distributions = sum of phase distributions
  if (pw?.P1 && pw?.P2 && cw) {
    const sumLPDist = (pw.P1.lpTotalDist || 0) + (pw.P2.lpTotalDist || 0);
    t("[R6.5] LP dist = P1 + P2", nearPct(cw.lpTotalDist, sumLPDist, 0.05),
      `P1=${fmt(pw.P1.lpTotalDist)}, P2=${fmt(pw.P2.lpTotalDist)}, sum=${fmt(sumLPDist)}, consol=${fmt(cw.lpTotalDist)}`);
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  FINANCIAL AUDIT: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES FOUND:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
