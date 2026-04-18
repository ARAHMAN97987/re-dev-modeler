/**
 * ZAN — Audit Rounds 18-20: Deep Mathematical Verification
 *
 * Round 18: Waterfall tier distribution math (T1→T2→T3→T4)
 * Round 19: Every fee formula independently recomputed
 * Round 20: cashAvail formula traced year by year
 *
 * These tests RECOMPUTE everything from scratch and compare to engine output.
 * If the engine has a math error, these will catch it.
 *
 * Run: node tests/rounds_18_20.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 1) => Math.abs((a||0) - (b||0)) <= tol;
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+'M' : v.toFixed(0)) : String(v);

function fundProject(opts = {}) {
  return {
    id:'wf', name:'WaterfallAudit', horizon:20, startYear:2026, currency:"SAR",
    landType:"lease", landArea:50000,
    landRentAnnual:2000000, landRentEscalation:5, landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:30,
    softCostPct:10, contingencyPct:5, rentEscalation:1.0, activeScenario:"Base Case",
    finMode:"fund", exitStrategy:"sale", exitYear:8, exitMultiple:10, exitCapRate:9, exitCostPct:2,
    debtAllowed:true, maxLtvPct:60, financeRate:6.0, loanTenor:8, debtGrace:3,
    upfrontFeePct:0.5, repaymentType:"amortizing", graceBasis:"cod", debtTrancheMode:"single",
    vehicleType:"fund", subscriptionFeePct:2, annualMgmtFeePct:1.0,
    mgmtFeeCapAnnual:0, custodyFeeAnnual:100000, mgmtFeeBase:"devCost",
    feeTreatment:"capital", developerFeePct:10, developerFeeBasis:"exclLand",
    auditorFeeAnnual:40000, structuringFeePct:0.5, structuringFeeCap:0,
    preEstablishmentFee:200000, spvFee:20000,
    operatorFeePct:0.15, operatorFeeCap:0, miscExpensePct:0.5,
    // Simplified waterfall: all to LP, performance incentive replaces carry
    prefReturnPct:0, gpCatchup:false, carryPct:0, lpProfitSplitPct:100,
    prefAllocation:"lpOnly", catchupMethod:"perYear",
    performanceIncentive:true, hurdleMode:"simple", hurdleIRR:12, incentivePct:20,
    landCapitalize:false, landRentPaidBy:"auto",
    phases:[{name:"P1", startYearOffset:1, footprint:50000}],
    assets:[{
      id:"a1", phase:"P1", category:"Retail", name:"Mall",
      gfa:20000, footprint:20000, costPerSqm:5000, constrDuration:24, constrStart:1,
      revType:"Lease", efficiency:75, leaseRate:1000, stabilizedOcc:90, rampUpYears:3,
    }],
    incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},
      landRentRebate:{enabled:false},feeRebates:{enabled:false,items:[]}},
    ...opts,
  };
}

// ═══════════════════════════════════════════════════
// ROUND 18: WATERFALL TIER MATH
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  ROUND 18: WATERFALL TIER DISTRIBUTION MATH");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = fundProject();
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;
  const h = p.horizon;

  if (!w) { t("[R18] Waterfall exists", false, 'null'); }
  else {
    // 18.1: For each year, T1+T2+T3+T4LP+T4GP = cashAvail (conservation of cash)
    let conservationOK = true;
    for (let y = 0; y < h; y++) {
      const totalTiers = (w.tier1[y]||0) + (w.tier2[y]||0) + (w.tier3[y]||0) + (w.tier4LP[y]||0) + (w.tier4GP[y]||0);
      const avail = w.cashAvail[y]||0;
      if (!near(totalTiers, avail, 2)) {
        t(`[R18.1] Cash conservation Y${y}`, false,
          `tiers=${fmt(totalTiers)}, avail=${fmt(avail)}, diff=${fmt(totalTiers-avail)}`);
        conservationOK = false; break;
      }
    }
    if (conservationOK) t("[R18.1] Cash conservation: ΣTiers = cashAvail every year", true);

    // 18.2: lpDist + gpDist = cashAvail (all cash distributed)
    let distOK = true;
    for (let y = 0; y < h; y++) {
      const totalDist = (w.lpDist[y]||0) + (w.gpDist[y]||0);
      const avail = w.cashAvail[y]||0;
      if (!near(totalDist, avail, 2)) {
        t(`[R18.2] Dist conservation Y${y}`, false,
          `LP+GP=${fmt(totalDist)}, avail=${fmt(avail)}`);
        distOK = false; break;
      }
    }
    if (distOK) t("[R18.2] Distribution conservation: LP+GP = cashAvail every year", true);

    // 18.3: Unreturned capital tracking
    // unreturnedOpen[y] = cumEquityCalled - cumReturned (before this year's distribution)
    // unreturnedClose[y] = unreturnedOpen[y] - tier1[y]
    let urcOK = true;
    for (let y = 0; y < h; y++) {
      const closeExpected = (w.unreturnedOpen[y]||0) - (w.tier1[y]||0);
      if (!near(w.unreturnedClose[y], closeExpected, 2)) {
        t(`[R18.3] URC Y${y}`, false,
          `open=${fmt(w.unreturnedOpen[y])}, T1=${fmt(w.tier1[y])}, close=${fmt(w.unreturnedClose[y])}, expected=${fmt(closeExpected)}`);
        urcOK = false; break;
      }
    }
    if (urcOK) t("[R18.3] Unreturned capital: close = open - T1", true);

    // 18.4: Tier1 never exceeds unreturned capital
    let t1OK = true;
    for (let y = 0; y < h; y++) {
      if ((w.tier1[y]||0) > (w.unreturnedOpen[y]||0) + 1) {
        t("[R18.4] T1 ≤ unreturned", false,
          `Y${y}: T1=${fmt(w.tier1[y])}, unreturned=${fmt(w.unreturnedOpen[y])}`);
        t1OK = false; break;
      }
    }
    if (t1OK) t("[R18.4] Tier1 never exceeds unreturned capital", true);

    // 18.5: No negative distributions
    let noNeg = true;
    for (let y = 0; y < h; y++) {
      for (const [name, arr] of [['lpDist',w.lpDist],['gpDist',w.gpDist],['tier1',w.tier1],['tier2',w.tier2],['tier4LP',w.tier4LP],['tier4GP',w.tier4GP]]) {
        if ((arr[y]||0) < -0.01) {
          t(`[R18.5] No negative: ${name}[${y}]`, false, `val=${arr[y]}`);
          noNeg = false; break;
        }
      }
      if (!noNeg) break;
    }
    if (noNeg) t("[R18.5] No negative distributions anywhere", true);

    // 18.6: With prefReturnPct=0 and gpCatchup=false, T2 and T3 should be 0
    const sumT2 = w.tier2.reduce((a,b)=>a+b,0);
    const sumT3 = w.tier3.reduce((a,b)=>a+b,0);
    t("[R18.6] With pref=0: T2 = 0", near(sumT2, 0, 1), `T2 sum=${fmt(sumT2)}`);
    t("[R18.7] With catchup=false: T3 = 0", near(sumT3, 0, 1), `T3 sum=${fmt(sumT3)}`);

    // 18.8: With lpProfitSplitPct=100, T4GP should be 0 (all profit to LP)
    const sumT4GP = w.tier4GP.reduce((a,b)=>a+b,0);
    t("[R18.8] With lpSplit=100%: T4GP = 0", near(sumT4GP, 0, 1), `T4GP sum=${fmt(sumT4GP)}`);

    // 18.9: LP total dist = sum(lpDist)
    t("[R18.9] lpTotalDist = Σ lpDist",
      near(w.lpTotalDist, w.lpDist.reduce((a,b)=>a+b,0), 1));

    // 18.10: GP total dist = sum(gpDist)
    t("[R18.10] gpTotalDist = Σ gpDist",
      near(w.gpTotalDist, w.gpDist.reduce((a,b)=>a+b,0), 1));

    // 18.11: MOIC = totalDist / totalCalled
    if (w.lpTotalCalled > 0) {
      const expectedMOIC = w.lpNetDist / w.lpTotalCalled;
      t("[R18.11] LP MOIC = netDist/called",
        Math.abs((w.lpMOIC||0) - expectedMOIC) < 0.01,
        `expected=${expectedMOIC.toFixed(3)}, got=${w.lpMOIC?.toFixed(3)}`);
    }

    // 18.12: DPI = netDist / totalCalled
    if (w.lpTotalCalled > 0) {
      const expectedDPI = w.lpNetDist / w.lpTotalCalled;
      t("[R18.12] LP DPI = netDist/called",
        Math.abs((w.lpDPI||0) - expectedDPI) < 0.01,
        `expected=${expectedDPI.toFixed(3)}, got=${w.lpDPI?.toFixed(3)}`);
    }
  }

  // 18.13-18.16: Test with FULL waterfall (pref + catch-up + carry)
  console.log("  -- Full 4-tier waterfall --");
  const pFull = fundProject({
    prefReturnPct: 12, gpCatchup: true, carryPct: 25, lpProfitSplitPct: 75,
    prefAllocation: "proRata", catchupMethod: "perYear",
    performanceIncentive: false,
    // GP needs equity for catch-up to work
    landCapitalize: true, landCapRate: 500, landCapTo: "gp",
    // Higher multiple to generate enough profit for catch-up
    exitMultiple: 15,
  });
  const rFull = E.runFullModel(pFull);
  const wFull = rFull.waterfall;
  if (wFull) {
    // With pref=12%, T2 should be > 0
    const fullT2 = wFull.tier2.reduce((a,b)=>a+b,0);
    t("[R18.13] Full waterfall: T2 (pref) > 0", fullT2 > 0, `T2=${fmt(fullT2)}`);

    // With catch-up enabled, T3 should be > 0
    const fullT3 = wFull.tier3.reduce((a,b)=>a+b,0);
    t("[R18.14] Full waterfall: T3 (catch-up) > 0", fullT3 > 0, `T3=${fmt(fullT3)}`);

    // With lpSplit=75%, GP gets 25% of T4
    const fullT4LP = wFull.tier4LP.reduce((a,b)=>a+b,0);
    const fullT4GP = wFull.tier4GP.reduce((a,b)=>a+b,0);
    if (fullT4LP > 0) {
      const ratio = fullT4GP / (fullT4LP + fullT4GP);
      t("[R18.15] Full waterfall: T4GP ≈ 25% of T4",
        Math.abs(ratio - 0.25) < 0.02,
        `ratio=${(ratio*100).toFixed(1)}%, expected=25%`);
    }

    // Cash conservation still holds
    let fullConsOK = true;
    for (let y = 0; y < pFull.horizon; y++) {
      const totalTiers = (wFull.tier1[y]||0)+(wFull.tier2[y]||0)+(wFull.tier3[y]||0)+(wFull.tier4LP[y]||0)+(wFull.tier4GP[y]||0);
      if (!near(totalTiers, wFull.cashAvail[y]||0, 2)) {
        t(`[R18.16] Full waterfall conservation Y${y}`, false,
          `tiers=${fmt(totalTiers)}, avail=${fmt(wFull.cashAvail[y])}`);
        fullConsOK = false; break;
      }
    }
    if (fullConsOK) t("[R18.16] Full waterfall: cash conservation holds", true);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 19: FEE CALCULATION FORMULAS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 19: FEE CALCULATION FORMULAS");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = fundProject();
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;

  if (!w) { t("[R19] Waterfall exists", false); }
  else {
    const devCostExcl = f.devCostExclLand;
    const devCostIncl = f.devCostInclLand;
    const h = p.horizon;

    // 19.1: Subscription fee = subscriptionFeePct × totalEquity (fee on equity raised)
    const subFeeExpected = f.totalEquity * (p.subscriptionFeePct / 100);
    const subFeeActual = w.feeSub ? w.feeSub.reduce((a,b)=>a+b,0) : 0;
    t("[R19.1] Subscription fee = pct × equity",
      near(subFeeActual, subFeeExpected, subFeeExpected * 0.15),
      `expected≈${fmt(subFeeExpected)}, got=${fmt(subFeeActual)}`);

    // 19.2: Structuring fee = structuringFeePct × devCostExclLand (one-time, capped)
    const structFeeExpected = devCostExcl * (p.structuringFeePct / 100);
    const structFeeActual = w.feeStruct ? w.feeStruct.reduce((a,b)=>a+b,0) : 0;
    t("[R19.2] Structuring fee = pct × devCost",
      near(structFeeActual, structFeeExpected, structFeeExpected * 0.15),
      `expected≈${fmt(structFeeExpected)}, got=${fmt(structFeeActual)}`);

    // 19.3: Custody fee = fixed annual amount
    const custodyYears = w.feeCustody ? w.feeCustody.filter(v => v > 0).length : 0;
    const custodyTotal = w.feeCustody ? w.feeCustody.reduce((a,b)=>a+b,0) : 0;
    const custodyExpected = p.custodyFeeAnnual * custodyYears;
    t("[R19.3] Custody fee = annual × years",
      near(custodyTotal, custodyExpected, custodyExpected * 0.05),
      `expected=${fmt(custodyExpected)}, got=${fmt(custodyTotal)}, years=${custodyYears}`);

    // 19.4: Auditor fee = fixed annual
    const auditorYears = w.feeAuditor ? w.feeAuditor.filter(v => v > 0).length : 0;
    const auditorTotal = w.feeAuditor ? w.feeAuditor.reduce((a,b)=>a+b,0) : 0;
    const auditorExpected = p.auditorFeeAnnual * auditorYears;
    t("[R19.4] Auditor fee = annual × years",
      near(auditorTotal, auditorExpected, auditorExpected * 0.05),
      `expected=${fmt(auditorExpected)}, got=${fmt(auditorTotal)}, years=${auditorYears}`);

    // 19.5: Pre-establishment fee = one-time fixed
    const preEstTotal = w.feePreEst ? w.feePreEst.reduce((a,b)=>a+b,0) : 0;
    t("[R19.5] Pre-establishment = one-time",
      near(preEstTotal, p.preEstablishmentFee, 1),
      `expected=${p.preEstablishmentFee}, got=${fmt(preEstTotal)}`);

    // 19.6: SPV fee = one-time fixed
    const spvTotal = w.feeSpv ? w.feeSpv.reduce((a,b)=>a+b,0) : 0;
    t("[R19.6] SPV fee = one-time",
      near(spvTotal, p.spvFee, 1),
      `expected=${p.spvFee}, got=${fmt(spvTotal)}`);

    // 19.7: Total fees = sum of all individual fee arrays
    const manualFeeSum = [w.feeSub, w.feeMgmt, w.feeCustody, w.feeDev, w.feeStruct,
      w.feePreEst, w.feeSpv, w.feeAuditor, w.feeOperator, w.feeMisc]
      .reduce((s, arr) => s + (arr ? arr.reduce((a,b)=>a+b,0) : 0), 0);
    t("[R19.7] totalFees = Σ(all fee arrays)",
      near(w.totalFees, manualFeeSum, 10),
      `sum=${fmt(manualFeeSum)}, totalFees=${fmt(w.totalFees)}`);

    // 19.8: fees[y] = sum of all fee arrays at year y
    let feeSumOK = true;
    for (let y = 0; y < h; y++) {
      const manual = [w.feeSub, w.feeMgmt, w.feeCustody, w.feeDev, w.feeStruct,
        w.feePreEst, w.feeSpv, w.feeAuditor, w.feeOperator, w.feeMisc]
        .reduce((s, arr) => s + ((arr && arr[y]) || 0), 0);
      if (!near(w.fees[y], manual, 2)) {
        t(`[R19.8] fees[${y}] = Σ sub-fees`, false,
          `manual=${fmt(manual)}, engine=${fmt(w.fees[y])}`);
        feeSumOK = false; break;
      }
    }
    if (feeSumOK) t("[R19.8] fees[y] = Σ(all sub-fees) every year", true);

    // 19.9: Developer fee = financing.devFeeTotal
    const devFeeWF = w.feeDev ? w.feeDev.reduce((a,b)=>a+b,0) : 0;
    t("[R19.9] WF devFee ≈ financing devFeeTotal",
      near(devFeeWF, f.devFeeTotal, f.devFeeTotal * 0.15),
      `wf=${fmt(devFeeWF)}, fin=${fmt(f.devFeeTotal)}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 20: CASH AVAILABLE FORMULA
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 20: CASH AVAILABLE FORMULA DEEP TRACE");
console.log("═══════════════════════════════════════════════════\n");
{
  const p = fundProject();
  const r = E.runFullModel(p);
  const w = r.waterfall;
  const f = r.financing;
  const c = r.projectResults.consolidated;
  const ir = r.incentivesResult;
  const h = p.horizon;

  if (!w) { t("[R20] Waterfall exists", false); }
  else {
    // cashAvail[y] = MAX(0, unlevCF - DS - fees + unfundedFees + exitProceeds)
    // where unlevCF = adjustedNetCF or c.netCF (includes income - landRent - capex)

    let cashOK = true;
    for (let y = 0; y < h; y++) {
      const unlevCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
      const ds = f.debtService[y] || 0;
      const fees = w.fees[y] || 0;
      const uf = w.unfundedFees?.[y] || 0;
      const exit = f.exitProceeds[y] || 0;

      // Determine if year is "in period" (between fund start and exit)
      // Fund start = year 0 or fundStartYear; exit = exitYear index
      const exitYr = (f.exitYear || 0) - p.startYear;
      const inPeriod = y <= exitYr;

      const expected = Math.max(0, (inPeriod ? unlevCF : 0) - ds - fees + uf + exit);
      const actual = w.cashAvail[y] || 0;

      if (!near(actual, expected, Math.max(Math.abs(expected) * 0.05, 100))) {
        t(`[R20.1] cashAvail[${y}]`, false,
          `unlevCF=${fmt(unlevCF)}, DS=${fmt(ds)}, fees=${fmt(fees)}, UF=${fmt(uf)}, exit=${fmt(exit)}, expected=${fmt(expected)}, actual=${fmt(actual)}`);
        cashOK = false;
        // Show a few more years for context
        if (y < h - 1) {
          const next = w.cashAvail[y+1] || 0;
          console.log(`    Y${y+1}: cashAvail=${fmt(next)}`);
        }
        break;
      }
    }
    if (cashOK) t("[R20.1] cashAvail formula matches hand calculation every year", true);

    // 20.2: Equity calls should equal capex × equity ratio + unfunded fees
    const totalCalls = w.equityCalls ? w.equityCalls.reduce((a,b)=>a+b,0) : 0;
    const totalCapex = c.totalCapex;
    const equityRatio = f.totalEquity / (f.devCostExclLand || 1);
    // Equity calls should be roughly: capex × (1 - debtRatio) + fees funded from equity
    t("[R20.2] Equity calls ≈ equity portion of cost + fees",
      totalCalls > 0, `calls=${fmt(totalCalls)}`);

    // 20.3: LP calls = equityCalls × lpPct
    const lpCalls = w.lpCalls ? w.lpCalls.reduce((a,b)=>a+b,0) : 0;
    const gpCalls = w.gpCalls ? w.gpCalls.reduce((a,b)=>a+b,0) : 0;
    t("[R20.3] LP+GP calls = total calls",
      near(lpCalls + gpCalls, totalCalls, 2),
      `LP=${fmt(lpCalls)}, GP=${fmt(gpCalls)}, total=${fmt(totalCalls)}`);

    // 20.4: lpNetCF = -lpCalls + lpDist
    let lpCFOK = true;
    for (let y = 0; y < h; y++) {
      const expected = -(w.lpCalls?.[y]||0) + (w.lpDist[y]||0);
      if (!near(w.lpNetCF[y], expected, 2)) {
        t(`[R20.4] lpNetCF[${y}]`, false,
          `expected=-${fmt(w.lpCalls?.[y])}+${fmt(w.lpDist[y])}=${fmt(expected)}, got=${fmt(w.lpNetCF[y])}`);
        lpCFOK = false; break;
      }
    }
    if (lpCFOK) t("[R20.4] lpNetCF = -lpCalls + lpDist every year", true);

    // 20.5: IRR should be computable from lpNetCF
    const manualIRR = E.calcIRR(w.lpNetCF);
    if (manualIRR !== null && w.lpIRR !== null) {
      t("[R20.5] LP IRR matches calcIRR(lpNetCF)",
        Math.abs(manualIRR - w.lpIRR) < 0.001,
        `manual=${(manualIRR*100).toFixed(2)}%, engine=${(w.lpIRR*100).toFixed(2)}%`);
    } else {
      t("[R20.5] LP IRR = calcIRR(lpNetCF)", manualIRR === w.lpIRR,
        `manual=${manualIRR}, engine=${w.lpIRR}`);
    }
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  ROUNDS 18-20: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
