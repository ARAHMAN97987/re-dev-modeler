/**
 * Hybrid-GP MOIC Aggregation — pin test
 *
 * Bug: in hybrid-GP mode the developer personally borrows the government loan.
 * The per-phase waterfall correctly subtracts that debt service from gpMOIC
 * (gpAdjNetDist / gpTotalCalled), but `aggregatePhaseWaterfalls` in phases.js
 * was using raw `gpNetDist` (pre debt adjustment) when re-computing the
 * consolidated gpMOIC. Result: consolidated view showed a GP MOIC that
 * ignored the developer's personal loan obligation — wildly overstated.
 *
 * Fix: waterfall.js now exports `gpDebtServiceTotal` and `gpAdjNetDist`;
 * phases.js subtracts `sum('gpDebtServiceTotal')` from gpNetDist when
 * computing gpMOIC / gpCommittedMOIC.
 *
 * This test pins both the legacy and the consolidated MOIC to the same value.
 */
const { runFullModel } = require('./helpers/engine.cjs');

const p = {
  name: "Hybrid-GP MOIC parity", location: "Test", startYear: 2026, horizon: 10, currency: "SAR",
  landType: "lease", landArea: 10000,
  finMode: "hybrid", vehicleType: "fund", govBeneficiary: "gp",
  govFinancingPct: 70, govFinanceRate: 2, govLoanTenor: 15, govGrace: 5, govRepaymentType: "amortizing",
  debtAllowed: false, maxLtvPct: 0,
  exitCostPct: 0, softCostPct: 0, contingencyPct: 0,
  prefReturnPct: 8, gpCatchup: true, carryPct: 20, lpProfitSplitPct: 70,
  prefAllocation: "proRata", catchupMethod: "perYear",
  performanceIncentive: false,
  subscriptionFeePct: 0, annualMgmtFeePct: 0, developerFeePct: 0, structuringFeePct: 0,
  custodyFeeAnnual: 0, auditorFeeAnnual: 0, operatorFeePct: 0, preEstablishmentFee: 0,
  spvFee: 0, miscExpensePct: 0, upfrontFeePct: 0,
  gpInvestDevFee: false, gpCashInvest: true, gpCashInvestAmount: 20000000,
  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 10000 }],
  assets: [
    { id: "a1", name: "Asset", phase: "Phase 1", category: "Office",
      revType: "Lease", gfa: 10000, costPerSqm: 10000, efficiency: 100,
      leaseRate: 1500, opEbitda: 0, constrStart: 0, constrDuration: 12, rampUpYears: 1,
      stabilizedOcc: 90, escalation: 0, plotArea: 10000, footprint: 10000 }
  ],
  exitStrategy: "sale",
};

const r = runFullModel(p);
const w = r.waterfall;           // consolidated (independent phases aggregated)
const lw = r._legacyWaterfall;   // legacy (single-pass)

let pass = 0, fail = 0;
function check(label, a, b, tol = 1e-3) {
  const ok = Math.abs(a - b) <= tol;
  if (ok) { console.log(`  ✅ ${label}: ${a.toFixed(4)} == ${b.toFixed(4)}`); pass++; }
  else { console.log(`  ❌ ${label}: consolidated=${a.toFixed(4)} vs legacy=${b.toFixed(4)}`); fail++; }
}

console.log("═════════════════════════════════════════════════════════");
console.log("  Hybrid-GP MOIC Aggregation Parity Test");
console.log("═════════════════════════════════════════════════════════\n");
console.log(`  Project: hybrid-GP, gov loan 70% @ 2%, tenor 15, grace 5`);
console.log(`  GP: 20M cash invest, LP: 10M\n`);

// Sanity: debt service should be > 0
const debtSum = r.financing.debtService.reduce((a,b)=>a+b,0);
console.log(`  Debt service sum: ${(debtSum/1e6).toFixed(1)}M\n`);
if (debtSum <= 0) { console.log("❌ FATAL: no debt service detected"); process.exit(1); }

check("gpMOIC parity (consolidated vs legacy)", w.gpMOIC, lw.gpMOIC);
check("gpCommittedMOIC parity", w.gpCommittedMOIC, lw.gpCommittedMOIC);
check("lpMOIC parity", w.lpMOIC, lw.lpMOIC);
check("gpIRR parity", w.gpIRR, lw.gpIRR);
check("lpIRR parity", w.lpIRR, lw.lpIRR);

// Invariant: gpMOIC should reflect debt deduction
// Without fix: gpMOIC ≈ gpTotalDist / gpTotalCalled (= raw, ~5x here)
// With fix: gpMOIC ≈ (gpTotalDist - gpDebtService) / gpTotalCalled (~1.4x here)
const rawMOIC = w.gpTotalDist / w.gpTotalCalled;
console.log(`\n  Raw (would-be-buggy) MOIC: ${rawMOIC.toFixed(3)}x`);
console.log(`  Correct adj MOIC:          ${w.gpMOIC.toFixed(3)}x`);
if (w.gpMOIC < rawMOIC - 0.1) {
  console.log(`  ✅ Debt obligation properly deducted from GP MOIC`);
  pass++;
} else {
  console.log(`  ❌ Debt obligation NOT reflected in GP MOIC`);
  fail++;
}

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  ${pass} PASSED | ${fail} FAILED`);
console.log(`  ═══════════════════════════════════════════════════`);
process.exit(fail > 0 ? 1 : 0);
