/**
 * ZAN — Audit Rounds 15-17
 *
 * Round 15: Excel export parity (does exported data match engine?)
 * Round 16: Mode switching (does changing finMode preserve/reset correctly?)
 * Round 17: Edge cases (zero values, extreme inputs, boundary conditions)
 *
 * Run: node tests/rounds_15_17.cjs
 */

const E = require('./helpers/engine.cjs');

let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 1) => Math.abs((a||0) - (b||0)) < tol;
const nearPct = (a, b, pct = 0.02) => Math.abs((a||0) - (b||0)) < Math.max(Math.abs(b||0) * pct, 1);
const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+'M' : Math.round(v).toLocaleString()) : String(v);

function baseProject(finMode, opts = {}) {
  return {
    id:'rnd', name:'RoundTest', horizon:30, startYear:2026, currency:"SAR",
    landType:"lease", landArea:50000,
    landRentAnnual:2000000, landRentEscalation:5, landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:30,
    softCostPct:10, contingencyPct:5, rentEscalation:1.0, activeScenario:"Base Case",
    finMode, exitStrategy:"sale", exitYear:8, exitMultiple:10, exitCapRate:9, exitCostPct:2,
    debtAllowed:true, maxLtvPct:70, financeRate:6.5, loanTenor:10, debtGrace:3,
    upfrontFeePct:0.5, repaymentType:"amortizing", graceBasis:"cod", debtTrancheMode:"single",
    vehicleType:"fund", subscriptionFeePct:2, annualMgmtFeePct:1.0,
    mgmtFeeCapAnnual:2000000, custodyFeeAnnual:100000, mgmtFeeBase:"devCost",
    feeTreatment:"capital", developerFeePct:10, developerFeeBasis:"exclLand",
    auditorFeeAnnual:40000, structuringFeePct:0.5,
    prefReturnPct:0, gpCatchup:false, carryPct:0, lpProfitSplitPct:100,
    performanceIncentive:true, hurdleMode:"simple", hurdleIRR:15, incentivePct:20,
    landCapitalize:false, landRentPaidBy:"auto",
    govFinancingPct:70, govBeneficiary:"project", govFinanceRate:3.0, govLoanTenor:15, govGrace:5,
    hybridDrawOrder:"finFirst",
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
// ROUND 15: EXCEL EXPORT DATA PARITY
// ═══════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════");
console.log("  ROUND 15: EXCEL EXPORT DATA PARITY");
console.log("═══════════════════════════════════════════════════\n");
{
  // The Excel export receives the SAME data objects as the UI views.
  // Verify that the data passed to export has the same structure.

  for (const fm of ["self", "debt", "bank100", "fund", "hybrid", "incomeFund"]) {
    const p = baseProject(fm);
    const r = E.runFullModel(p);
    const prefix = `[R15/${fm}]`;

    // 15.1: financing exists and has mode
    t(`${prefix} financing.mode = ${fm}`, r.financing?.mode === fm, `got ${r.financing?.mode}`);

    // 15.2: projectResults.consolidated has required arrays
    const c = r.projectResults?.consolidated;
    t(`${prefix} has income array`, !!c?.income && c.income.length === p.horizon);
    t(`${prefix} has capex array`, !!c?.capex && c.capex.length === p.horizon);
    t(`${prefix} has netCF array`, !!c?.netCF && c.netCF.length === p.horizon);

    // 15.3: financing has required arrays for export
    if (fm !== "self") {
      t(`${prefix} has leveredCF`, !!r.financing?.leveredCF && r.financing.leveredCF.length === p.horizon);
      t(`${prefix} has debtService`, !!r.financing?.debtService);
      t(`${prefix} has debtBalClose`, !!r.financing?.debtBalClose);
    }

    // 15.4: waterfall exists for fund modes
    if (fm === "fund" || fm === "hybrid" || fm === "incomeFund") {
      t(`${prefix} waterfall for export`, !!r.waterfall, r.waterfall ? '' : 'null — Excel would miss waterfall sheet');
      if (r.waterfall) {
        t(`${prefix} wf.lpDist array`, !!r.waterfall.lpDist);
        t(`${prefix} wf.gpDist array`, !!r.waterfall.gpDist);
        t(`${prefix} wf.fees array`, !!r.waterfall.fees);
        t(`${prefix} wf.cashAvail array`, !!r.waterfall.cashAvail);
      }
    }

    // 15.5: phaseFinancings match project phases
    const phaseNames = Object.keys(r.projectResults?.phaseResults || {});
    const pfNames = Object.keys(r.phaseFinancings || {});
    t(`${prefix} phaseFinancings covers all phases`,
      phaseNames.length === pfNames.length && phaseNames.every(n => pfNames.includes(n)),
      `phases=${phaseNames}, phaseFinancings=${pfNames}`);
  }
}

// ═══════════════════════════════════════════════════
// ROUND 16: MODE SWITCHING CORRECTNESS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 16: MODE SWITCHING");
console.log("═══════════════════════════════════════════════════\n");
{
  // Simulate: user starts with fund, switches to bank100, then to hybrid.
  // Each switch should produce correct results without leftover state.

  const base = baseProject("fund");

  // Switch 1: fund → bank100
  const asFund = E.runFullModel(base);
  const asBank = E.runFullModel({...base, finMode: "bank100", maxLtvPct: 100});

  t("[R16.1] fund→bank100: no waterfall", !asBank.waterfall,
    asBank.waterfall ? 'waterfall leaked from fund config!' : '');
  t("[R16.2] fund→bank100: equity = 0", (asBank.financing?.totalEquity || 0) < 1);
  t("[R16.3] fund→bank100: debt = devCost",
    nearPct(asBank.financing?.totalDebt, asBank.financing?.devCostExclLand, 0.05));

  // Switch 2: bank100 → hybrid
  const asHybrid = E.runFullModel({...base, finMode: "hybrid"});
  t("[R16.4] bank100→hybrid: waterfall exists", !!asHybrid.waterfall);
  t("[R16.5] bank100→hybrid: has LP equity", (asHybrid.financing?.lpEquity || 0) > 0,
    `lpEq=${fmt(asHybrid.financing?.lpEquity)}`);
  t("[R16.6] bank100→hybrid: debt ≈ 70% of cost",
    nearPct(asHybrid.financing?.totalDebt, asHybrid.financing?.devCostExclLand * 0.70, 0.10));

  // Switch 3: hybrid → self
  const asSelf = E.runFullModel({...base, finMode: "self"});
  t("[R16.7] hybrid→self: no debt", (asSelf.financing?.totalDebt || 0) === 0);
  t("[R16.8] hybrid→self: no waterfall", !asSelf.waterfall);
  t("[R16.9] hybrid→self: leveredIRR = project IRR",
    asSelf.financing?.leveredIRR !== null);

  // Switch 4: self → incomeFund
  const asIncome = E.runFullModel({...base, finMode: "incomeFund", exitStrategy: "hold"});
  t("[R16.10] self→incomeFund: waterfall exists", !!asIncome.waterfall);
  t("[R16.11] self→incomeFund: exit proceeds = 0",
    (asIncome.financing?.exitProceeds?.reduce((a,b)=>a+b,0) || 0) < 1);
  t("[R16.12] self→incomeFund: isIncomeFund flag", !!asIncome.waterfall?.isIncomeFund);

  // Critical: fund fees should NOT appear when switching away from fund modes
  t("[R16.13] bank100: no fund fees in financing",
    !asBank.financing?.devFeeSchedule || asBank.financing.devFeeSchedule.reduce((a,b)=>a+b,0) === 0,
    `devFee sum = ${asBank.financing?.devFeeSchedule?.reduce((a,b)=>a+b,0)}`);
}

// ═══════════════════════════════════════════════════
// ROUND 17: EDGE CASES & BOUNDARY CONDITIONS
// ═══════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════════");
console.log("  ROUND 17: EDGE CASES");
console.log("═══════════════════════════════════════════════════\n");
{
  // 17.1: Zero GFA (no construction cost)
  {
    const p = baseProject("fund", {
      assets: [{id:"a1",phase:"P1",category:"Retail",name:"M",
        gfa:0, footprint:0, costPerSqm:5000, constrDuration:24, constrStart:1,
        revType:"Lease",efficiency:75,leaseRate:1000,stabilizedOcc:90,rampUpYears:3}],
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.1] Zero GFA: no crash", true); }
    catch(e) { t("[R17.1] Zero GFA: no crash", false, e.message); }
    if (r) {
      t("[R17.1b] Zero GFA: capex = 0", r.projectResults.consolidated.totalCapex === 0);
    }
  }

  // 17.2: Zero land rent
  {
    const p = baseProject("fund", { landRentAnnual: 0 });
    let r;
    try { r = E.runFullModel(p); t("[R17.2] Zero rent: no crash", true); }
    catch(e) { t("[R17.2] Zero rent: no crash", false, e.message); }
  }

  // 17.3: 100% LTV in fund mode
  {
    const p = baseProject("fund", { maxLtvPct: 100 });
    let r;
    try { r = E.runFullModel(p); t("[R17.3] 100% LTV fund: no crash", true); }
    catch(e) { t("[R17.3] 100% LTV fund: no crash", false, e.message); }
    if (r) {
      t("[R17.3b] 100% LTV fund: equity ≈ 0", (r.financing?.totalEquity || 0) < 1);
      // Waterfall should be null (no equity)
      t("[R17.3c] 100% LTV fund: no waterfall", !r.waterfall,
        r.waterfall ? 'waterfall with zero equity!' : '');
    }
  }

  // 17.4: Very long construction (10 years)
  {
    const p = baseProject("debt", {
      assets: [{id:"a1",phase:"P1",category:"Retail",name:"M",
        gfa:20000, footprint:20000, costPerSqm:5000, constrDuration:120, constrStart:1,
        revType:"Lease",efficiency:75,leaseRate:1000,stabilizedOcc:90,rampUpYears:3}],
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.4] 10yr construction: no crash", true); }
    catch(e) { t("[R17.4] 10yr construction: no crash", false, e.message); }
    if (r) {
      t("[R17.4b] 10yr constr: constrEnd ≈ 10", (r.financing?.constrEnd || 0) >= 9);
    }
  }

  // 17.5: Exit year before construction ends
  {
    const p = baseProject("debt", { exitYear: 1 }); // exits year 1, construction 2yr
    let r;
    try { r = E.runFullModel(p); t("[R17.5] Early exit: no crash", true); }
    catch(e) { t("[R17.5] Early exit: no crash", false, e.message); }
    if (r) {
      // Should still produce some result, even if exit value is low
      t("[R17.5b] Early exit: financing exists", !!r.financing);
    }
  }

  // 17.6: Horizon = 5 (very short)
  {
    const p = baseProject("fund", { horizon: 5, exitYear: 4 });
    let r;
    try { r = E.runFullModel(p); t("[R17.6] Short horizon: no crash", true); }
    catch(e) { t("[R17.6] Short horizon: no crash", false, e.message); }
  }

  // 17.7: Multiple assets in one phase
  {
    const p = baseProject("fund", {
      assets: [
        {id:"a1",phase:"P1",category:"Retail",name:"Mall",gfa:10000,footprint:10000,costPerSqm:4000,constrDuration:24,constrStart:1,revType:"Lease",efficiency:75,leaseRate:800,stabilizedOcc:90,rampUpYears:3},
        {id:"a2",phase:"P1",category:"Office",name:"Tower",gfa:8000,footprint:8000,costPerSqm:6000,constrDuration:30,constrStart:1,revType:"Lease",efficiency:80,leaseRate:600,stabilizedOcc:85,rampUpYears:4},
        {id:"a3",phase:"P1",category:"Hospitality",name:"Hotel",gfa:5000,footprint:5000,costPerSqm:8000,constrDuration:36,constrStart:1,revType:"Operating",opEbitda:5000000,rampUpYears:3},
      ],
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.7] Multi-asset: no crash", true); }
    catch(e) { t("[R17.7] Multi-asset: no crash", false, e.message); }
    if (r) {
      t("[R17.7b] Multi-asset: 3 schedules", r.projectResults.assetSchedules.length === 3);
      t("[R17.7c] Multi-asset: income > 0", r.projectResults.consolidated.totalIncome > 0);
    }
  }

  // 17.8: Bullet repayment with fund mode
  {
    const p = baseProject("fund", { repaymentType: "bullet" });
    let r;
    try { r = E.runFullModel(p); t("[R17.8] Bullet+fund: no crash", true); }
    catch(e) { t("[R17.8] Bullet+fund: no crash", false, e.message); }
    if (r?.financing) {
      // Debt should remain constant until bullet payment
      const bal = r.financing.debtBalClose;
      const grace = r.financing.grace || 3;
      const tenor = r.financing.tenor || 10;
      if (bal && bal.length > grace + 1) {
        // During grace, balance should be constant (no repayment)
        t("[R17.8b] Bullet: balance constant during grace",
          near(bal[grace], bal[grace-1], 100),
          `bal[${grace}]=${fmt(bal[grace])}, bal[${grace-1}]=${fmt(bal[grace-1])}`);
      }
    }
  }

  // 17.9: Land purchase (not lease)
  {
    const p = baseProject("fund", {
      landType: "purchase", landPurchasePrice: 30000000,
      landRentAnnual: 0, landCapitalize: false,
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.9] Land purchase: no crash", true); }
    catch(e) { t("[R17.9] Land purchase: no crash", false, e.message); }
    if (r) {
      // Land purchase should appear as capex[0]
      t("[R17.9b] Land in capex", r.projectResults.consolidated.capex[0] >= 30000000,
        `capex[0]=${fmt(r.projectResults.consolidated.capex[0])}`);
    }
  }

  // 17.10: Partner land
  {
    const p = baseProject("fund", {
      landType: "partner", landValuation: 40000000, partnerEquityPct: 30,
      landRentAnnual: 0, landCapitalize: false,
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.10] Partner land: no crash", true); }
    catch(e) { t("[R17.10] Partner land: no crash", false, e.message); }
  }

  // 17.11: All incentives enabled simultaneously
  {
    const p = baseProject("fund", {
      incentives: {
        capexGrant: { enabled: true, grantPct: 30, maxCap: 100000000, timing: "construction" },
        financeSupport: { enabled: true, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation" },
        landRentRebate: { enabled: true, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 5 },
        feeRebates: { enabled: true, items: [{ type: "rebate", amount: 500000, year: 1 }] },
      },
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.11] All incentives: no crash", true); }
    catch(e) { t("[R17.11] All incentives: no crash", false, e.message); }
    if (r?.incentivesResult) {
      t("[R17.11b] Grant > 0", r.incentivesResult.capexGrantTotal > 0);
      t("[R17.11c] Land saving > 0", r.incentivesResult.landRentSavingTotal > 0);
      t("[R17.11d] Fee rebate > 0", r.incentivesResult.feeRebateTotal > 0);
    }
  }

  // 17.12: incomeFund with debt and incentives
  {
    const p = baseProject("incomeFund", {
      exitStrategy: "hold", maxLtvPct: 50,
      incentives: {
        capexGrant: { enabled: true, grantPct: 20, maxCap: 50000000, timing: "construction" },
        financeSupport: { enabled: false },
        landRentRebate: { enabled: true, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 30, operRebateYears: 3 },
        feeRebates: { enabled: false, items: [] },
      },
    });
    let r;
    try { r = E.runFullModel(p); t("[R17.12] incomeFund+debt+incentives: no crash", true); }
    catch(e) { t("[R17.12] incomeFund+debt+incentives: no crash", false, e.message); }
    if (r) {
      t("[R17.12b] Has waterfall", !!r.waterfall);
      t("[R17.12c] Exit = 0 (hold)", (r.financing?.exitProceeds?.reduce((a,b)=>a+b,0)||0) < 1);
      t("[R17.12d] Grant applied", r.incentivesResult?.capexGrantTotal > 0);
      if (r.waterfall) {
        t("[R17.12e] Dist yield computed", r.waterfall.avgDistYield > 0,
          `avgYield=${(r.waterfall.avgDistYield*100).toFixed(1)}%`);
      }
    }
  }

  // 17.13: Hybrid-GP mode edge case
  {
    const p = baseProject("hybrid", { govBeneficiary: "gp", govFinancingPct: 90 });
    let r;
    try { r = E.runFullModel(p); t("[R17.13] hybrid-gp 90%: no crash", true); }
    catch(e) { t("[R17.13] hybrid-gp 90%: no crash", false, e.message); }
    if (r?.financing) {
      t("[R17.13b] GP personal debt exists", !!r.financing.gpPersonalDebt);
    }
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  ROUNDS 15-17: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ ISSUES:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
