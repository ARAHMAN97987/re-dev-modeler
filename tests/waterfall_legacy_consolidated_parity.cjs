/**
 * Legacy vs Consolidated Waterfall Parity — broad sweep
 *
 * After finding that hybrid-GP gpMOIC differed between `_legacyWaterfall` (single-pass)
 * and `waterfall` (consolidated = phase-aggregated) this test checks for other hidden
 * parity breaks across a range of scenarios.
 *
 * Invariant for SINGLE-phase projects: consolidated == legacy on key metrics.
 * Any divergence surfaces as a test failure.
 */
const { runFullModel } = require('./helpers/engine.cjs');

const base = {
  name: "Parity", location: "Test", startYear: 2026, horizon: 10, currency: "SAR",
  landType: "lease", landArea: 10000,
  finMode: "fund", vehicleType: "fund",
  exitCostPct: 0, softCostPct: 0, contingencyPct: 0,
  prefReturnPct: 8, gpCatchup: true, carryPct: 20, lpProfitSplitPct: 70,
  prefAllocation: "proRata", catchupMethod: "perYear",
  performanceIncentive: false,
  debtAllowed: false, maxLtvPct: 0,
  subscriptionFeePct: 0, annualMgmtFeePct: 0, developerFeePct: 0, structuringFeePct: 0,
  custodyFeeAnnual: 0, auditorFeeAnnual: 0, operatorFeePct: 0, preEstablishmentFee: 0,
  spvFee: 0, miscExpensePct: 0, upfrontFeePct: 0,
  gpInvestDevFee: false,
  gpCashInvest: true, gpCashInvestAmount: 20000000,
  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 10000 }],
  assets: [
    { id: "a1", name: "Asset", phase: "Phase 1", category: "Office",
      revType: "Lease", gfa: 10000, costPerSqm: 10000, efficiency: 100,
      leaseRate: 1500, opEbitda: 0, constrStart: 0, constrDuration: 12, rampUpYears: 1,
      stabilizedOcc: 90, escalation: 0, plotArea: 10000, footprint: 10000 }
  ],
  exitStrategy: "sale",
};

const scenarios = [
  { label: "Fund (basic)", p: {} },
  { label: "Fund (no promote)", p: { gpCatchup: false, carryPct: 0 } },
  { label: "Fund (lpProfitSplitPct=100)", p: { lpProfitSplitPct: 100 } },
  { label: "Fund (debt 60%)", p: { debtAllowed: true, maxLtvPct: 60, financeRate: 7 } },
  { label: "Fund (perf incentive)", p: { performanceIncentive: true, hurdleIRR: 15, incentivePct: 20 } },
  { label: "Fund (partner land 50/50)", p: {
      landType: "partner", landValuation: 30000000, partnerEquityPct: 50,
      gpCashInvest: false, gpCashInvestAmount: 0 } },
  { label: "Fund (fees: 2% sub, 1.5% mgmt)", p: {
      subscriptionFeePct: 2, annualMgmtFeePct: 1.5, structuringFeePct: 1 } },
  { label: "Fund (hold strategy)", p: { exitStrategy: "hold" } },
  { label: "Fund (feeTreatment=expense)", p: {
      subscriptionFeePct: 2, annualMgmtFeePct: 1, feeTreatment: "expense" } },
  { label: "Fund (gpInvestDevFee)", p: {
      developerFeePct: 5, gpInvestDevFee: true, gpDevFeeInvestPct: 100,
      gpCashInvest: false, gpCashInvestAmount: 0 } },
  { label: "Hybrid-Project (gov loan for project)", p: {
      finMode: "hybrid", govBeneficiary: "project",
      govFinancingPct: 70, govFinanceRate: 3, govLoanTenor: 15, govGrace: 5 } },
  { label: "Hybrid-GP (gov loan for developer)", p: {
      finMode: "hybrid", govBeneficiary: "gp",
      govFinancingPct: 70, govFinanceRate: 2, govLoanTenor: 15, govGrace: 5 } },
  { label: "IncomeFund", p: {
      finMode: "incomeFund", exitStrategy: "hold", fundLife: 10 } },
  { label: "JV", p: { finMode: "jv" } },
];

const fieldsToCompare = [
  "gpMOIC", "lpMOIC",
  "gpCommittedMOIC", "lpCommittedMOIC",
  "gpDPI", "lpDPI",
  "gpIRR", "lpIRR",
  "gpTotalDist", "lpTotalDist",
  "gpTotalCalled", "lpTotalCalled",
];

let passed = 0, failed = 0;
const failures = [];

console.log("═════════════════════════════════════════════════════════");
console.log("  Legacy vs Consolidated Waterfall Parity — Single Phase");
console.log("═════════════════════════════════════════════════════════\n");

for (const { label, p } of scenarios) {
  const r = runFullModel({ ...base, ...p });
  if (!r || !r.waterfall || !r._legacyWaterfall) {
    console.log(`  ⏭  ${label}: no waterfall (skipped)`);
    continue;
  }
  const w = r.waterfall;
  const lw = r._legacyWaterfall;
  let okCount = 0, mismatch = [];
  for (const f of fieldsToCompare) {
    const a = w[f], b = lw[f];
    if (a == null && b == null) { okCount++; continue; }
    if (typeof a !== "number" || typeof b !== "number") {
      if (a === b) { okCount++; continue; }
      mismatch.push(`${f}: ${a} vs ${b}`); continue;
    }
    // Relative tolerance: 0.1% or $1 absolute, whichever larger
    const tol = Math.max(1, Math.abs(b) * 0.001);
    if (Math.abs(a - b) <= tol) { okCount++; continue; }
    mismatch.push(`${f}: consolidated=${a.toFixed(4)} vs legacy=${b.toFixed(4)} (Δ ${(a-b).toFixed(4)})`);
  }
  if (mismatch.length === 0) {
    console.log(`  ✅ ${label} — ${okCount}/${fieldsToCompare.length} match`);
    passed++;
  } else {
    console.log(`  ❌ ${label} — ${mismatch.length} mismatches`);
    mismatch.forEach(m => console.log(`       ${m}`));
    failed++;
    failures.push({ label, mismatch });
  }
}

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  ${passed} scenarios PASSED | ${failed} FAILED`);
console.log(`  ═══════════════════════════════════════════════════`);
process.exit(failed > 0 ? 1 : 0);
