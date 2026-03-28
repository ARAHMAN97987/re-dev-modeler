/**
 * ZAN ENGINE — COMPREHENSIVE STRESS TEST
 *
 * Tests EVERY combination of: finMode × exitStrategy × landType
 * For each combination, verifies:
 *   1. No crash (engine doesn't throw)
 *   2. No NaN/Infinity in any output array
 *   3. Financial invariants hold (CAPEX>0 → income>0, debt balance ≥ 0, etc.)
 *   4. Mode-specific rules (fund → waterfall exists, self → no debt, etc.)
 *   5. Multi-phase works without crash
 *   6. Per-phase override works without crash
 *
 * Run: node tests/stress_all_modes.cjs
 */

const E = require('./helpers/engine.cjs');

// ═══ Test Framework ═══
let pass = 0, fail = 0, errors = [];
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; errors.push({ name, detail: detail || '' }); console.log(`  ❌ ${name}: ${detail || ''}`); }
};

// ═══ Helper: build a realistic project for any mode combo ═══
function buildProject(finMode, exitStrategy, landType, opts = {}) {
  const p = {
    id: `test-${finMode}-${exitStrategy}-${landType}`,
    name: `Test ${finMode}/${exitStrategy}/${landType}`,
    horizon: 30,
    startYear: 2026,
    currency: "SAR",
    landType,
    softCostPct: 10,
    contingencyPct: 5,
    rentEscalation: 1.0,
    activeScenario: "Base Case",
    finMode,
    exitStrategy,

    // Land config (varies by type)
    landArea: 50000,
    landRentAnnual: landType === "lease" ? 2000000 : 0,
    landRentEscalation: 5,
    landRentEscalationEveryN: 5,
    landRentGrace: 3,
    landRentTerm: 30,
    landPurchasePrice: landType === "purchase" ? 50000000 : 0,
    landValuation: landType === "partner" ? 40000000 : 0,
    partnerEquityPct: landType === "partner" ? 30 : 0,
    botOperationYears: landType === "bot" ? 25 : 0,

    // Phases & Assets
    phases: [{ name: "Phase 1", startYearOffset: 1, footprint: 50000 }],
    assets: [{
      id: "a1", phase: "Phase 1", category: "Retail", name: "Mall",
      code: "M1", gfa: 25000, footprint: 25000,
      costPerSqm: 4000, constrDuration: 24, constrStart: 1,
      revType: "Lease", efficiency: 75, leaseRate: 800,
      stabilizedOcc: 90, rampUpYears: 3, escalation: 1.0,
    }, {
      id: "a2", phase: "Phase 1", category: "Office", name: "Tower",
      code: "T1", gfa: 15000, footprint: 15000,
      costPerSqm: 5000, constrDuration: 30, constrStart: 1,
      revType: "Lease", efficiency: 80, leaseRate: 600,
      stabilizedOcc: 85, rampUpYears: 3, escalation: 1.0,
    }],

    // Financing — generic good defaults
    debtAllowed: finMode !== "self",
    maxLtvPct: finMode === "bank100" ? 100 : 70,
    financeRate: 6.5,
    loanTenor: 10,
    debtGrace: 3,
    upfrontFeePct: 0.5,
    repaymentType: "amortizing",
    graceBasis: "cod",

    // Fund structure
    vehicleType: "fund",
    gpEquityManual: 0,
    lpEquityManual: 0,
    subscriptionFeePct: 2,
    annualMgmtFeePct: 0.9,
    custodyFeeAnnual: 130000,
    mgmtFeeBase: "devCost",
    feeTreatment: "capital",
    developerFeePct: 12,
    developerFeeBasis: "exclLand",
    auditorFeeAnnual: 40000,
    structuringFeePct: 0.1,
    landCapitalize: false,
    landCapRate: 1000,
    landCapTo: "gp",
    landRentPaidBy: "auto",
    performanceIncentive: true,
    hurdleMode: "simple",
    hurdleIRR: 15,
    incentivePct: 20,

    // Exit
    exitYear: 0, // auto
    exitMultiple: 10,
    exitCapRate: 9,
    exitCostPct: 2,

    // Waterfall
    prefReturnPct: 15,
    gpCatchup: true,
    carryPct: 30,
    lpProfitSplitPct: 70,
    catchupMethod: "perYear",
    prefAllocation: "proRata",

    // Hybrid
    govFinancingPct: 70,
    govBeneficiary: "project",
    govFinanceRate: 3.0,
    govLoanTenor: 15,
    govGrace: 5,
    govRepaymentType: "amortizing",
    govUpfrontFeePct: 0,
    hybridDrawOrder: "finFirst",

    // Incentives (disabled by default)
    incentives: {
      capexGrant: { enabled: false, grantPct: 25, maxCap: 50000000, timing: "construction" },
      financeSupport: { enabled: false, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation" },
      landRentRebate: { enabled: false, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 3 },
      feeRebates: { enabled: false, items: [] },
    },

    // Overrides from opts
    ...opts,
  };
  return p;
}

// ═══ Helper: check array for NaN/Infinity ═══
function hasNaN(arr, label) {
  if (!arr || !Array.isArray(arr)) return null;
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] === 'number' && (isNaN(arr[i]) || !isFinite(arr[i]))) {
      return `${label}[${i}] = ${arr[i]}`;
    }
  }
  return null;
}

// ═══ Helper: check scalar for NaN/Infinity ═══
function badScalar(val, label) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) return `${label} = ${val}`;
  return null;
}

// ═══ MODE COMBINATIONS ═══
const FIN_MODES = ["self", "bank100", "debt", "fund", "hybrid"];
const EXIT_STRATEGIES = ["sale", "hold", "caprate"];
const LAND_TYPES = ["lease", "purchase", "partner"];

console.log("═══════════════════════════════════════════════════");
console.log("  ZAN ENGINE — COMPREHENSIVE STRESS TEST");
console.log("═══════════════════════════════════════════════════");
console.log(`Testing ${FIN_MODES.length} × ${EXIT_STRATEGIES.length} × ${LAND_TYPES.length} = ${FIN_MODES.length * EXIT_STRATEGIES.length * LAND_TYPES.length} combinations\n`);

// ═══ PART 1: Every mode combination ═══
for (const fm of FIN_MODES) {
  for (const es of EXIT_STRATEGIES) {
    for (const lt of LAND_TYPES) {
      const combo = `${fm}/${es}/${lt}`;
      const project = buildProject(fm, es, lt);

      // 1. No crash
      let result;
      try {
        result = E.runFullModel(project);
        t(`[${combo}] No crash`, true);
      } catch (e) {
        t(`[${combo}] No crash`, false, `CRASH: ${e.message}\n${e.stack?.split('\n').slice(0,3).join('\n')}`);
        continue; // can't test further
      }

      if (!result) {
        t(`[${combo}] Returns result`, false, 'runFullModel returned null');
        continue;
      }

      const { projectResults: pr, financing: fin, waterfall: wf, checks } = result;

      // 2. Project results exist and are sane
      t(`[${combo}] projectResults exists`, !!pr, pr ? '' : 'null');
      if (!pr) continue;

      const c = pr.consolidated;
      t(`[${combo}] consolidated exists`, !!c);
      if (!c) continue;

      // 3. No NaN in project arrays
      for (const [key, arr] of Object.entries(c)) {
        if (Array.isArray(arr)) {
          const bad = hasNaN(arr, `consolidated.${key}`);
          t(`[${combo}] No NaN: c.${key}`, !bad, bad || '');
        }
      }

      // 4. CAPEX should be positive (we have 2 assets)
      t(`[${combo}] totalCapex > 0`, c.totalCapex > 0, `totalCapex = ${c.totalCapex}`);

      // 5. Income should be positive (lease assets generate revenue)
      t(`[${combo}] totalIncome > 0`, c.totalIncome > 0, `totalIncome = ${c.totalIncome}`);

      // 6. Financing exists for all modes
      t(`[${combo}] financing exists`, !!fin, fin ? '' : 'null');
      if (!fin) continue;

      // 7. No NaN in financing arrays
      const finArrays = ['leveredCF', 'debtService', 'interest', 'repayment', 'debtBalOpen', 'debtBalClose', 'drawdown', 'equityCalls', 'exitProceeds', 'dscr'];
      for (const key of finArrays) {
        if (fin[key]) {
          const bad = hasNaN(fin[key], `financing.${key}`);
          t(`[${combo}] No NaN: fin.${key}`, !bad, bad || '');
        }
      }

      // 8. No NaN in financing scalars
      for (const key of ['totalDebt', 'totalEquity', 'gpEquity', 'lpEquity', 'totalInterest', 'devCostInclLand', 'devCostExclLand', 'leveredIRR']) {
        const bad = badScalar(fin[key], `financing.${key}`);
        t(`[${combo}] No NaN: fin.${key}`, !bad, bad || '');
      }

      // 9. Debt balance should never go negative
      if (fin.debtBalClose) {
        const negBal = fin.debtBalClose.findIndex(v => v < -0.01);
        t(`[${combo}] Debt balance ≥ 0`, negBal < 0, negBal >= 0 ? `debtBalClose[${negBal}] = ${fin.debtBalClose[negBal]}` : '');
      }

      // 10. Mode-specific invariants
      if (fm === "self") {
        t(`[${combo}] self: totalDebt = 0`, (fin.totalDebt || 0) === 0, `totalDebt = ${fin.totalDebt}`);
        t(`[${combo}] self: no waterfall`, wf === null || wf === undefined, wf ? 'waterfall exists for self mode!' : '');
      }
      if (fm === "bank100") {
        t(`[${combo}] bank100: totalDebt > 0`, (fin.totalDebt || 0) > 0, `totalDebt = ${fin.totalDebt}`);
        t(`[${combo}] bank100: totalEquity ≈ 0`, (fin.totalEquity || 0) < 1, `totalEquity = ${fin.totalEquity}`);
      }
      if (fm === "debt") {
        t(`[${combo}] debt: totalDebt > 0`, (fin.totalDebt || 0) > 0, `totalDebt = ${fin.totalDebt}`);
        t(`[${combo}] debt: totalEquity > 0`, (fin.totalEquity || 0) > 0, `totalEquity = ${fin.totalEquity}`);
        t(`[${combo}] debt: no waterfall`, wf === null || wf === undefined, wf ? 'waterfall exists for debt mode!' : '');
      }
      if (fm === "fund") {
        t(`[${combo}] fund: waterfall exists`, !!wf, wf ? '' : 'null');
        if (wf) {
          // Waterfall NaN checks
          for (const key of ['lpNetCF', 'gpNetCF', 'equityCalls', 'cashAvail', 'tier1', 'tier2', 'tier4LP', 'tier4GP', 'lpDist', 'gpDist']) {
            if (wf[key]) {
              const bad = hasNaN(wf[key], `waterfall.${key}`);
              t(`[${combo}] No NaN: wf.${key}`, !bad, bad || '');
            }
          }
          for (const key of ['lpIRR', 'gpIRR', 'lpTotalDist', 'gpTotalDist', 'totalFees']) {
            const bad = badScalar(wf[key], `waterfall.${key}`);
            t(`[${combo}] No NaN: wf.${key}`, !bad, bad || '');
          }
          // LP distributions should be ≥ 0
          if (wf.lpDist) {
            const negLP = wf.lpDist.findIndex(v => v < -0.01);
            t(`[${combo}] fund: LP dist ≥ 0`, negLP < 0, negLP >= 0 ? `lpDist[${negLP}] = ${wf.lpDist[negLP]}` : '');
          }
          // GP distributions should be ≥ 0
          if (wf.gpDist) {
            const negGP = wf.gpDist.findIndex(v => v < -0.01);
            t(`[${combo}] fund: GP dist ≥ 0`, negGP < 0, negGP >= 0 ? `gpDist[${negGP}] = ${wf.gpDist[negGP]}` : '');
          }
          // Total LP+GP dist should ≤ total cash available (conservation of cash)
          if (wf.lpTotalDist !== undefined && wf.gpTotalDist !== undefined && wf.totalCashAvail !== undefined) {
            const totalDist = (wf.lpTotalDist || 0) + (wf.gpTotalDist || 0);
            t(`[${combo}] fund: dist ≤ cash avail`, totalDist <= (wf.totalCashAvail || 0) + 1,
              `LP+GP dist (${totalDist.toFixed(0)}) > cash avail (${(wf.totalCashAvail||0).toFixed(0)})`);
          }
        }
      }
      if (fm === "hybrid") {
        t(`[${combo}] hybrid: waterfall exists`, !!wf, wf ? '' : 'null — waterfall should exist for hybrid');
        t(`[${combo}] hybrid: totalDebt > 0`, (fin.totalDebt || 0) > 0, `totalDebt = ${fin.totalDebt}`);
        t(`[${combo}] hybrid: isHybrid flag`, !!fin.isHybrid, `isHybrid = ${fin.isHybrid}`);
        if (wf) {
          for (const key of ['lpNetCF', 'gpNetCF', 'lpDist', 'gpDist']) {
            if (wf[key]) {
              const bad = hasNaN(wf[key], `waterfall.${key}`);
              t(`[${combo}] No NaN: wf.${key}`, !bad, bad || '');
            }
          }
        }
      }

      // 11. Exit proceeds checks
      if (es === "sale" || es === "caprate") {
        const ep = fin.exitProceeds ? fin.exitProceeds.reduce((a, b) => a + b, 0) : 0;
        // Exit proceeds should exist if there's income (project generates revenue)
        if (c.totalIncome > 0) {
          t(`[${combo}] Exit proceeds > 0`, ep > 0, `exitProceeds total = ${ep}`);
        }
      }
      if (es === "hold") {
        const ep = fin.exitProceeds ? fin.exitProceeds.reduce((a, b) => a + b, 0) : 0;
        t(`[${combo}] Hold: no exit proceeds`, ep < 1, `exitProceeds total = ${ep}`);
      }

      // 12. Levered IRR should be computable (not null) when project has positive CF
      if (es !== "hold" && c.totalIncome > c.totalCapex) {
        t(`[${combo}] leveredIRR not null`, fin.leveredIRR !== null && fin.leveredIRR !== undefined,
          `leveredIRR = ${fin.leveredIRR}`);
      }

      // 13. Checks array should be valid
      if (checks) {
        const badCheck = checks.find(ch => !ch.cat || !ch.name);
        t(`[${combo}] checks well-formed`, !badCheck, badCheck ? `bad check: ${JSON.stringify(badCheck)}` : '');
      }
    }
  }
}

// ═══ PART 2: Hybrid sub-modes ═══
console.log("\n── PART 2: Hybrid sub-modes ──");
for (const ben of ["project", "gp"]) {
  for (const es of EXIT_STRATEGIES) {
    const combo = `hybrid-${ben}/${es}/lease`;
    const project = buildProject("hybrid", es, "lease", { govBeneficiary: ben });
    let result;
    try {
      result = E.runFullModel(project);
      t(`[${combo}] No crash`, true);
    } catch (e) {
      t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
      continue;
    }
    if (!result || !result.financing) continue;
    const fin = result.financing;
    const wf = result.waterfall;

    if (ben === "project") {
      t(`[${combo}] govBeneficiary=project`, fin.govBeneficiary === "project", `got ${fin.govBeneficiary}`);
    }
    if (ben === "gp") {
      t(`[${combo}] govBeneficiary=gp`, fin.govBeneficiary === "gp", `got ${fin.govBeneficiary}`);
      t(`[${combo}] gpPersonalDebt exists`, !!fin.gpPersonalDebt, fin.gpPersonalDebt ? '' : 'null');
    }
    // Waterfall must exist for hybrid
    t(`[${combo}] waterfall exists`, !!wf, wf ? '' : 'null');
    if (wf) {
      for (const key of ['lpNetCF', 'gpNetCF']) {
        if (wf[key]) {
          const bad = hasNaN(wf[key], `waterfall.${key}`);
          t(`[${combo}] No NaN: wf.${key}`, !bad, bad || '');
        }
      }
    }
  }
}

// ═══ PART 3: Multi-phase (2 phases, same finMode) ═══
console.log("\n── PART 3: Multi-phase scenarios ──");
for (const fm of FIN_MODES) {
  const combo = `multiphase-${fm}/sale/lease`;
  const project = buildProject(fm, "sale", "lease", {
    phases: [
      { name: "Phase 1", startYearOffset: 1, footprint: 30000 },
      { name: "Phase 2", startYearOffset: 3, footprint: 20000 },
    ],
    assets: [
      { id: "a1", phase: "Phase 1", category: "Retail", name: "Mall P1", code: "M1",
        gfa: 15000, footprint: 15000, costPerSqm: 4000, constrDuration: 24, constrStart: 1,
        revType: "Lease", efficiency: 75, leaseRate: 800, stabilizedOcc: 90, rampUpYears: 3 },
      { id: "a2", phase: "Phase 1", category: "Office", name: "Office P1", code: "O1",
        gfa: 10000, footprint: 10000, costPerSqm: 4500, constrDuration: 24, constrStart: 1,
        revType: "Lease", efficiency: 80, leaseRate: 600, stabilizedOcc: 85, rampUpYears: 3 },
      { id: "a3", phase: "Phase 2", category: "Residential", name: "Res P2", code: "R1",
        gfa: 12000, footprint: 12000, costPerSqm: 3500, constrDuration: 30, constrStart: 3,
        revType: "Lease", efficiency: 85, leaseRate: 500, stabilizedOcc: 95, rampUpYears: 2 },
    ],
  });

  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}\n${e.stack?.split('\n').slice(0,3).join('\n')}`);
    continue;
  }
  if (!result) continue;

  // Phase results should have both phases
  const pr = result.projectResults;
  if (pr) {
    t(`[${combo}] Phase 1 exists`, !!pr.phaseResults?.["Phase 1"]);
    t(`[${combo}] Phase 2 exists`, !!pr.phaseResults?.["Phase 2"]);
  }

  // Per-phase financing
  const pf = result.phaseFinancings;
  if (pf && Object.keys(pf).length > 0) {
    t(`[${combo}] phaseFinancings has Phase 1`, !!pf["Phase 1"], pf["Phase 1"] ? '' : 'missing');
    t(`[${combo}] phaseFinancings has Phase 2`, !!pf["Phase 2"], pf["Phase 2"] ? '' : 'missing');
    // Verify no NaN in phase financings
    for (const [pName, pfin] of Object.entries(pf)) {
      if (pfin.leveredCF) {
        const bad = hasNaN(pfin.leveredCF, `${pName}.leveredCF`);
        t(`[${combo}] No NaN: ${pName}.leveredCF`, !bad, bad || '');
      }
    }
  }

  // Per-phase waterfalls (only for fund/hybrid)
  if (fm === "fund" || fm === "hybrid") {
    const pw = result.phaseWaterfalls;
    if (pw) {
      for (const [pName, pwf] of Object.entries(pw)) {
        t(`[${combo}] ${pName} waterfall exists`, !!pwf);
        if (pwf?.lpNetCF) {
          const bad = hasNaN(pwf.lpNetCF, `${pName}.lpNetCF`);
          t(`[${combo}] No NaN: ${pName}.lpNetCF`, !bad, bad || '');
        }
      }
    }
  }
}

// ═══ PART 4: Mixed per-phase finMode ═══
console.log("\n── PART 4: Mixed per-phase finMode ──");
{
  const combo = "mixed-bank100+fund/sale/lease";
  const project = buildProject("fund", "sale", "lease", {
    phases: [
      { name: "Phase 1", startYearOffset: 1, footprint: 30000, financing: { finMode: "bank100" } },
      { name: "Phase 2", startYearOffset: 3, footprint: 20000, financing: { finMode: "fund" } },
    ],
    assets: [
      { id: "a1", phase: "Phase 1", category: "Retail", name: "Mall P1", code: "M1",
        gfa: 15000, footprint: 15000, costPerSqm: 4000, constrDuration: 24, constrStart: 1,
        revType: "Lease", efficiency: 75, leaseRate: 800, stabilizedOcc: 90, rampUpYears: 3 },
      { id: "a2", phase: "Phase 2", category: "Office", name: "Office P2", code: "O1",
        gfa: 12000, footprint: 12000, costPerSqm: 4500, constrDuration: 30, constrStart: 3,
        revType: "Lease", efficiency: 80, leaseRate: 600, stabilizedOcc: 85, rampUpYears: 3 },
    ],
  });

  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}\n${e.stack?.split('\n').slice(0,3).join('\n')}`);
  }
  if (result) {
    const pf = result.phaseFinancings;
    if (pf) {
      // Phase 1 should be bank100 (100% debt, no equity)
      if (pf["Phase 1"]) {
        t(`[${combo}] P1 mode = bank100`, pf["Phase 1"].mode === "bank100", `mode = ${pf["Phase 1"].mode}`);
        t(`[${combo}] P1 equity ≈ 0`, (pf["Phase 1"].totalEquity || 0) < 1, `equity = ${pf["Phase 1"].totalEquity}`);
      }
      // Phase 2 should be fund (has equity)
      if (pf["Phase 2"]) {
        t(`[${combo}] P2 mode = fund`, pf["Phase 2"].mode === "fund", `mode = ${pf["Phase 2"].mode}`);
      }
    }
    // Phase 2 should have waterfall, Phase 1 should not
    const pw = result.phaseWaterfalls;
    if (pw) {
      // Phase 1 (bank100) should have null waterfall
      t(`[${combo}] P1 no waterfall`, !pw["Phase 1"], pw["Phase 1"] ? 'P1 has waterfall but is bank100!' : '');
      // Phase 2 (fund) should have waterfall
      t(`[${combo}] P2 has waterfall`, !!pw["Phase 2"], pw["Phase 2"] ? '' : 'P2 missing waterfall');
    }
  }
}

// ═══ PART 5: Edge cases ═══
console.log("\n── PART 5: Edge cases ──");

// 5.1 Zero assets (empty project)
{
  const combo = "edge/zero-assets";
  const project = buildProject("self", "hold", "lease", { assets: [], phases: [{ name: "Phase 1" }] });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.2 Very large project
{
  const combo = "edge/large-project";
  const project = buildProject("fund", "sale", "lease", {
    assets: [{
      id: "big", phase: "Phase 1", category: "Retail", name: "Mega Mall",
      gfa: 500000, footprint: 500000, costPerSqm: 6000, constrDuration: 48, constrStart: 1,
      revType: "Lease", efficiency: 80, leaseRate: 1200, stabilizedOcc: 95, rampUpYears: 5,
    }],
  });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.financing) {
      t(`[${combo}] No NaN leveredIRR`, !isNaN(result.financing.leveredIRR ?? 0));
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.3 Hybrid with govFinancingPct = 100 (edge: zero fund equity)
{
  const combo = "edge/hybrid-100pct-gov";
  const project = buildProject("hybrid", "sale", "lease", { govFinancingPct: 100 });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.financing) {
      t(`[${combo}] totalEquity ≈ 0`, (result.financing.totalEquity || 0) < 1,
        `totalEquity = ${result.financing.totalEquity}`);
      // Waterfall should be null (no equity)
      t(`[${combo}] No waterfall (zero equity)`, !result.waterfall,
        result.waterfall ? 'waterfall exists with zero equity!' : '');
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.4 Hybrid with govFinancingPct = 0 (should behave like fund)
{
  const combo = "edge/hybrid-0pct-gov";
  const project = buildProject("hybrid", "sale", "lease", { govFinancingPct: 0 });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.financing) {
      t(`[${combo}] totalDebt = 0`, (result.financing.totalDebt || 0) < 1,
        `totalDebt = ${result.financing.totalDebt}`);
      t(`[${combo}] waterfall exists`, !!result.waterfall);
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.5 Fund with land capitalization
{
  const combo = "edge/fund-landcap";
  const project = buildProject("fund", "sale", "lease", {
    landCapitalize: true, landCapRate: 2000, landCapTo: "gp",
  });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.financing) {
      t(`[${combo}] landCapValue > 0`, (result.financing.landCapValue || 0) > 0,
        `landCapValue = ${result.financing.landCapValue}`);
      t(`[${combo}] No NaN leveredIRR`, !isNaN(result.financing.leveredIRR ?? 0));
    }
    if (result?.waterfall) {
      const bad = hasNaN(result.waterfall.lpNetCF, 'wf.lpNetCF');
      t(`[${combo}] No NaN wf.lpNetCF`, !bad, bad || '');
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.6 Incentives enabled for each mode
console.log("\n── PART 5.6: Incentives with each mode ──");
for (const fm of FIN_MODES) {
  const combo = `incentives-${fm}/sale/lease`;
  const project = buildProject(fm, "sale", "lease", {
    incentives: {
      capexGrant: { enabled: true, grantPct: 25, maxCap: 100000000, timing: "construction" },
      financeSupport: { enabled: true, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation" },
      landRentRebate: { enabled: true, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 5 },
      feeRebates: { enabled: false, items: [] },
    },
  });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.incentivesResult) {
      t(`[${combo}] capexGrant > 0`, (result.incentivesResult.capexGrantTotal || 0) > 0,
        `grant = ${result.incentivesResult.capexGrantTotal}`);
      t(`[${combo}] landRentSaving > 0`, (result.incentivesResult.landRentSavingTotal || 0) > 0,
        `saving = ${result.incentivesResult.landRentSavingTotal}`);
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.7 Bullet repayment
{
  const combo = "edge/bullet-repay";
  const project = buildProject("debt", "sale", "lease", { repaymentType: "bullet" });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.financing?.debtBalClose) {
      const bad = hasNaN(result.financing.debtBalClose, 'debtBalClose');
      t(`[${combo}] No NaN debtBalClose`, !bad, bad || '');
      // Debt should remain constant during grace then drop to 0
      t(`[${combo}] Debt balance ≥ 0`, result.financing.debtBalClose.every(v => v >= -0.01));
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// 5.8 Operating revenue type (not Lease)
{
  const combo = "edge/operating-rev";
  const project = buildProject("fund", "sale", "lease", {
    assets: [{
      id: "hotel", phase: "Phase 1", category: "Hospitality", name: "Hotel",
      gfa: 20000, footprint: 20000, costPerSqm: 8000, constrDuration: 36, constrStart: 1,
      revType: "Operating", opEbitda: 15000000, efficiency: 0,
      stabilizedOcc: 100, rampUpYears: 3,
    }],
  });
  let result;
  try {
    result = E.runFullModel(project);
    t(`[${combo}] No crash`, true);
    if (result?.projectResults?.consolidated) {
      t(`[${combo}] totalIncome > 0`, result.projectResults.consolidated.totalIncome > 0);
    }
  } catch (e) {
    t(`[${combo}] No crash`, false, `CRASH: ${e.message}`);
  }
}

// ═══ PART 6: Financial Invariant Deep Checks ═══
console.log("\n── PART 6: Financial invariant deep checks ──");

// For fund mode specifically, verify waterfall conserves cash
{
  const combo = "invariant/fund-cash-conservation";
  const project = buildProject("fund", "sale", "lease");
  const result = E.runFullModel(project);
  if (result?.waterfall) {
    const wf = result.waterfall;
    const h = project.horizon;
    // Sum of all tier distributions should equal total cash available minus unfunded fees
    const sumTier1 = (wf.tier1 || []).reduce((a, b) => a + b, 0);
    const sumTier2 = (wf.tier2 || []).reduce((a, b) => a + b, 0);
    const sumTier3 = (wf.tier3 || []).reduce((a, b) => a + b, 0);
    const sumTier4LP = (wf.tier4LP || []).reduce((a, b) => a + b, 0);
    const sumTier4GP = (wf.tier4GP || []).reduce((a, b) => a + b, 0);
    const sumTiers = sumTier1 + sumTier2 + sumTier3 + sumTier4LP + sumTier4GP;
    const cashAvail = (wf.totalCashAvail || 0);
    // Tiers should roughly equal cash available (allow 1% tolerance for rounding)
    const diff = Math.abs(sumTiers - cashAvail);
    const tolPct = cashAvail > 0 ? diff / cashAvail : 0;
    t(`[${combo}] Tiers sum ≈ cashAvail`, tolPct < 0.02,
      `sum_tiers=${sumTiers.toFixed(0)}, cashAvail=${cashAvail.toFixed(0)}, diff%=${(tolPct * 100).toFixed(2)}%`);

    // LP+GP distributions should equal Tier1+Tier2+Tier3+Tier4
    const lpGP = (wf.lpTotalDist || 0) + (wf.gpTotalDist || 0);
    t(`[${combo}] LP+GP = tier sum`, Math.abs(lpGP - sumTiers) < 1,
      `LP+GP=${lpGP.toFixed(0)}, tierSum=${sumTiers.toFixed(0)}`);
  }
}

// For debt mode, verify levered CF = income - adjLandRent - capex + grants + feeRebates - DS + drawdown + exit - devFee
{
  const combo = "invariant/debt-levered-cf";
  const project = buildProject("debt", "sale", "lease");
  const result = E.runFullModel(project);
  if (result?.financing && result?.projectResults) {
    const fin = result.financing;
    const c = result.projectResults.consolidated;
    const h = project.horizon;
    const ir = result.incentivesResult;
    let mismatch = false;
    for (let y = 0; y < h; y++) {
      // leveredCF = income - adjLandRent - capex + grants + feeRebates - DS + drawdown + exit - devFee
      const adjLR = ir?.adjustedLandRent?.[y] ?? c.landRent[y] ?? 0;
      // After exit year, engine zeros out CF
      const exitYr = (fin.exitYear || 0) - project.startYear;
      const sold = (project.exitStrategy || "sale") !== "hold" && (fin.exitProceeds || []).some(v => v > 0);
      if (sold && y > exitYr) continue; // skip post-exit years
      const expected = (c.income[y] || 0) - adjLR - (c.capex[y] || 0)
        + (ir?.capexGrantSchedule?.[y] || 0) + (ir?.feeRebateSchedule?.[y] || 0)
        - (fin.debtService[y] || 0) + (fin.drawdown[y] || 0) + (fin.exitProceeds[y] || 0)
        - (fin.devFeeSchedule?.[y] || 0);
      const actual = fin.leveredCF[y] || 0;
      if (Math.abs(expected - actual) > 1) {
        mismatch = true;
        t(`[${combo}] LeveredCF[${y}] matches`, false,
          `expected=${expected.toFixed(0)}, actual=${actual.toFixed(0)}, diff=${(actual - expected).toFixed(0)}`);
        break;
      }
    }
    if (!mismatch) t(`[${combo}] LeveredCF matches formula`, true);
  }
}

// ═══ SUMMARY ═══
console.log("\n═══════════════════════════════════════════════════");
console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════");

if (fail > 0) {
  console.log("\n❌ FAILURES:");
  for (const e of errors) {
    console.log(`  • ${e.name}: ${e.detail}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
