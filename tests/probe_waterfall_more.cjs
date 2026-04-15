/**
 * Waterfall Round 2 — Additional Edge Cases
 *
 *  F. Performance Incentive — under losses or barely-met hurdle
 *  G. Fee treatment = "expense" vs "capital"
 *  H. Income Fund simple distribution
 *  I. Partner land — 100% land-as-equity (no cash from GP)
 *  J. gpInvestDevFee path
 *  K. Hybrid-GP (developer personally borrows government loan)
 */
const { runFullModel } = require('./helpers/engine.cjs');

const base = {
  name: "Probe2", location: "Test", startYear: 2026, horizon: 10, currency: "SAR",
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

function fmt(n) { return (n||0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function pct(n) { return n == null ? "—" : (n*100).toFixed(2) + "%"; }

function probe(label, overrides) {
  const p = { ...base, ...overrides };
  const r = runFullModel(p);
  if (!r || !r.waterfall) { console.log(`  [${label}] ❌ no waterfall`); return null; }
  const w = r.waterfall;
  console.log(`\n  [${label}]`);
  console.log(`    lpPct=${pct(w.lpPct)}  gpPct=${pct(w.gpPct)}`);
  console.log(`    LP: Called=${fmt(w.lpTotalCalled)}  Dist=${fmt(w.lpTotalDist)}  MOIC=${(w.lpMOIC||0).toFixed(3)}x  IRR=${pct(w.lpIRR)}`);
  console.log(`    GP: Called=${fmt(w.gpTotalCalled)}  Dist=${fmt(w.gpTotalDist)}  MOIC=${(w.gpMOIC||0).toFixed(3)}x  IRR=${pct(w.gpIRR)}`);
  if (w.perfIncentiveEnabled) {
    console.log(`    PerfIncentive: amount=${fmt(w.perfIncentiveAmount)}  excess=${fmt(w.perfIncentiveExcess)}  required=${fmt(w.perfIncentiveRequired)}  settleYr=${w.perfIncentiveSettleYear}`);
  }
  // MOIC sanity: under profit, nobody should have MOIC < pro-rata × overall MOIC
  const overallMOIC = w.lpTotalCalled + w.gpTotalCalled > 0 ? (w.lpTotalDist + w.gpTotalDist) / (w.lpTotalCalled + w.gpTotalCalled) : 0;
  if (overallMOIC > 1.0 && (w.lpMOIC < 0.99 || w.gpMOIC < 0.99)) {
    console.log(`    ⚠️  FLAG: overall MOIC=${overallMOIC.toFixed(3)}x but LP=${w.lpMOIC.toFixed(3)} GP=${w.gpMOIC.toFixed(3)} — someone lost on profitable deal`);
  }
  return { w, r };
}

console.log("═══════════════════════════════════════════════════════════");
console.log("  SCENARIO F — Performance Incentive");
console.log("═══════════════════════════════════════════════════════════");
probe("F1: PerfIncentive 20% on 15% hurdle, strong win",
  { performanceIncentive: true, hurdleIRR: 15, incentivePct: 20, hurdleMode: "simple" });
probe("F2: PerfIncentive 20% on 15% hurdle, IRR mode",
  { performanceIncentive: true, hurdleIRR: 15, incentivePct: 20, hurdleMode: "irr" });
probe("F3: PerfIncentive on losing deal (shouldn't trigger)",
  { assets: [{ ...base.assets[0], costPerSqm: 25000 }],
    performanceIncentive: true, hurdleIRR: 15, incentivePct: 20 });
probe("F4: PerfIncentive + promote together (double-dip?)",
  { performanceIncentive: true, hurdleIRR: 12, incentivePct: 20,
    prefReturnPct: 8, gpCatchup: true, carryPct: 20 });

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SCENARIO G — Fee Treatment");
console.log("═══════════════════════════════════════════════════════════");
probe("G1: feeTreatment=capital (default)", {
  subscriptionFeePct: 2, annualMgmtFeePct: 1, structuringFeePct: 1,
  feeTreatment: "capital"
});
probe("G2: feeTreatment=expense (fees gone, not returned)", {
  subscriptionFeePct: 2, annualMgmtFeePct: 1, structuringFeePct: 1,
  feeTreatment: "expense"
});
probe("G3: feeTreatment=rocOnly", {
  subscriptionFeePct: 2, annualMgmtFeePct: 1, structuringFeePct: 1,
  feeTreatment: "rocOnly"
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SCENARIO H — Income Fund");
console.log("═══════════════════════════════════════════════════════════");
probe("H1: Income fund, hold strategy", {
  finMode: "incomeFund", exitStrategy: "hold", fundLife: 10,
  assets: [{ ...base.assets[0], leaseRate: 1200 }]
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SCENARIO I — Partner Land only (no GP cash)");
console.log("═══════════════════════════════════════════════════════════");
probe("I1: 100% land partner, GP gets partnerEquityPct=40 via land", {
  landType: "partner", landValuation: 40000000, partnerEquityPct: 40,
  gpCashInvest: false, gpCashInvestAmount: 0
});
probe("I2: Partner land 100% (GP owns via land only)", {
  landType: "partner", landValuation: 100000000, partnerEquityPct: 100,
  gpCashInvest: false, gpCashInvestAmount: 0
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SCENARIO J — gpInvestDevFee");
console.log("═══════════════════════════════════════════════════════════");
probe("J1: GP invests dev fee as equity", {
  developerFeePct: 5, gpInvestDevFee: true, gpDevFeeInvestPct: 100,
  gpCashInvest: false, gpCashInvestAmount: 0
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SCENARIO K — Hybrid-GP (developer borrows personally)");
console.log("═══════════════════════════════════════════════════════════");
probe("K1: Hybrid fund, govBeneficiary=gp, 70% gov loan", {
  finMode: "hybrid", govBeneficiary: "gp", govLtv: 70, govRate: 2,
  govLoanTenor: 15, govGrace: 5, govRepaymentType: "amortizing",
  debtAllowed: false
});

console.log("\n═══ END OF PROBE 2 ═══\n");
