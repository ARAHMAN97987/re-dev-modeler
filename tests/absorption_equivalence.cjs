/**
 * Absorption Equivalence Test
 *
 * Verifies: exitStrategy: "absorption" produces IDENTICAL engine output
 * to exitStrategy: "hold". Absorption is a UI-level label for dev funds
 * with Sale-type assets; at the engine level it maps to hold (no terminal
 * sale event added; the asset-level Sale absorption IS the exit).
 */

const { runFullModel } = require('./helpers/engine.cjs');

const baseProject = {
  name: "Absorption vs Hold Test",
  location: "Jazan",
  startYear: 2026,
  horizon: 10,
  currency: "SAR",

  landType: "partner",
  landValuation: 150000000,
  landArea: 302000,
  partnerEquityPct: 75,

  finMode: "fund",
  vehicleType: "fund",
  exitCostPct: 0,
  softCostPct: 0,
  contingencyPct: 0,

  prefReturnPct: 0,
  gpCatchup: false,
  carryPct: 0,
  lpProfitSplitPct: 25,
  prefAllocation: "proRata",
  catchupMethod: "perYear",

  performanceIncentive: false,
  hurdleIRR: 0,
  incentivePct: 0,

  debtAllowed: false,
  maxLtvPct: 0,

  subscriptionFeePct: 0,
  annualMgmtFeePct: 0,
  developerFeePct: 0,
  structuringFeePct: 0,
  custodyFeeAnnual: 0,
  auditorFeeAnnual: 0,
  operatorFeePct: 0,
  preEstablishmentFee: 0,
  spvFee: 0,
  miscExpensePct: 0,
  upfrontFeePct: 0,

  gpInvestDevFee: false,
  gpCashInvest: false,

  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 302000 }],

  assets: [
    { id: "infra-1", name: "Infrastructure", phase: "Phase 1", category: "Infrastructure",
      revType: "Lease", gfa: 302000, costPerSqm: 166, efficiency: 0, leaseRate: 0,
      opEbitda: 0, constrStart: 0, constrDuration: 24, rampUpYears: 1,
      stabilizedOcc: 0, escalation: 0, plotArea: 302000, footprint: 0 },
    { id: "plots-1", name: "Plots", phase: "Phase 1", category: "Retail",
      revType: "Sale", gfa: 302000, costPerSqm: 0, efficiency: 70,
      salePricePerSqm: 1420, absorptionYears: 2, preSalePct: 0, commissionPct: 0,
      constrStart: 0, constrDuration: 24, rampUpYears: 1, stabilizedOcc: 100,
      escalation: 0, plotArea: 302000, footprint: 0 },
  ],
};

console.log("═════════════════════════════════════════════════════════");
console.log("  ABSORPTION vs HOLD — Engine Equivalence Test");
console.log("═════════════════════════════════════════════════════════\n");

const holdResult = runFullModel({ ...baseProject, exitStrategy: "hold" });
const absResult  = runFullModel({ ...baseProject, exitStrategy: "absorption" });

if (!holdResult || !absResult) { console.error("❌ FATAL: null result"); process.exit(1); }

let passed = 0, failed = 0;
const near = (a, b, tol = 1e-6) => Math.abs((a||0) - (b||0)) <= tol;

function assertEq(label, a, b) {
  const ok = near(a, b);
  if (ok) passed++;
  else { failed++; console.log(`  ❌ ${label}: hold=${a} vs absorption=${b}`); return; }
}

const h = holdResult, a = absResult;
const hc = h.projectResults.consolidated, ac = a.projectResults.consolidated;
const hf = h.financing, af = a.financing;
const hw = h.waterfall, aw = a.waterfall;

// Project-level
assertEq("Total CAPEX",     hc.totalCapex,   ac.totalCapex);
assertEq("Total Income",    hc.totalIncome,  ac.totalIncome);
assertEq("Total Net CF",    hc.totalNetCF,   ac.totalNetCF);
assertEq("Unlevered IRR",   hc.irr,          ac.irr);

// Financing-level
assertEq("Total Equity",    hf.totalEquity,  af.totalEquity);
assertEq("GP Equity",       hf.gpEquity,     af.gpEquity);
assertEq("LP Equity",       hf.lpEquity,     af.lpEquity);
assertEq("Levered IRR",     hf.leveredIRR,   af.leveredIRR);
assertEq("Exit Year",       hf.exitYear,     af.exitYear);

// Waterfall-level
assertEq("LP IRR",          hw.lpIRR,        aw.lpIRR);
assertEq("GP IRR",          hw.gpIRR,        aw.gpIRR);
const hLPDist = hw.lpDist.reduce((s,v)=>s+v,0);
const aLPDist = aw.lpDist.reduce((s,v)=>s+v,0);
const hGPDist = hw.gpDist.reduce((s,v)=>s+v,0);
const aGPDist = aw.gpDist.reduce((s,v)=>s+v,0);
assertEq("Total LP Dist",   hLPDist,         aLPDist);
assertEq("Total GP Dist",   hGPDist,         aGPDist);

// Per-year cash flow equivalence
for (let y = 0; y < h.projectResults.horizon; y++) {
  assertEq(`Year ${y} netCF`, hc.netCF[y], ac.netCF[y]);
}

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  ABSORPTION = HOLD: ${passed} PASSED | ${failed} FAILED`);
console.log(`  ═══════════════════════════════════════════════════`);
if (failed === 0) console.log("  🎯 engine treats 'absorption' identically to 'hold'");
process.exit(failed > 0 ? 1 : 0);
