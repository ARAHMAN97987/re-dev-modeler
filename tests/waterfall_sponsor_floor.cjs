/**
 * Sponsor-Promote Floor — pin test
 *
 * Documents and locks in the behavior fix:
 *  When a promote structure is configured (gpCatchup=true, carryPct>0) but the user
 *  sets lpProfitSplitPct so high that GP's tier-4 share would drop below GP's equity %,
 *  the engine floors gpSplitPct at gpPct (sponsor never earns less than equity pro-rata).
 *
 * Without this floor, developer-as-investor would see "only capital back" while LP
 * captures all residual profit (the user's standing complaint).
 */
const { runFullModel } = require('./helpers/engine.cjs');

const base = {
  name: "Sponsor Floor Test", location: "Test", startYear: 2026, horizon: 10, currency: "SAR",
  landType: "lease", landArea: 10000,
  finMode: "fund", vehicleType: "fund",
  exitCostPct: 0, softCostPct: 0, contingencyPct: 0,
  prefAllocation: "proRata", catchupMethod: "perYear",
  performanceIncentive: false,
  debtAllowed: false, maxLtvPct: 0,
  subscriptionFeePct: 0, annualMgmtFeePct: 0, developerFeePct: 0, structuringFeePct: 0,
  custodyFeeAnnual: 0, auditorFeeAnnual: 0, operatorFeePct: 0, preEstablishmentFee: 0,
  spvFee: 0, miscExpensePct: 0, upfrontFeePct: 0,
  gpInvestDevFee: false,
  gpCashInvest: true, gpCashInvestAmount: 20000000, // GP owns 20% via 20M cash (LP=80M, 80%)
  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 10000 }],
  assets: [
    { id: "a1", name: "Asset", phase: "Phase 1", category: "Office",
      revType: "Lease", gfa: 10000, costPerSqm: 10000, efficiency: 100,
      leaseRate: 1500, opEbitda: 0, constrStart: 0, constrDuration: 12, rampUpYears: 1,
      stabilizedOcc: 90, escalation: 0, plotArea: 10000, footprint: 10000 }
  ],
  exitStrategy: "sale",
};

let pass = 0, fail = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else { console.log(`  ❌ ${label} — ${detail || ''}`); fail++; }
}

console.log("═════════════════════════════════════════════════════════");
console.log("  Sponsor-Promote Floor Test");
console.log("═════════════════════════════════════════════════════════\n");

// ── CASE 1: pathological config — lpProfitSplitPct=100 with promote on ──
// Without floor: GP would earn 0 profit (MOIC=1.0). With floor: GP pins at equity-share.
{
  console.log("CASE 1 — lpProfitSplitPct=100 + gpCatchup=true (pathological)");
  const r = runFullModel({
    ...base,
    prefReturnPct: 0, gpCatchup: true, carryPct: 20,
    lpProfitSplitPct: 100,
  });
  const w = r.waterfall;
  const gpProfit = (w.gpTotalDist - w.gpTotalCalled);
  const lpProfit = (w.lpTotalDist - w.lpTotalCalled);
  const totalProfit = gpProfit + lpProfit;
  assert("GP earns at least equity-pro-rata share of profit",
    gpProfit >= totalProfit * w.gpPct - 1,
    `GP profit=${gpProfit.toFixed(0)}, expected >= ${(totalProfit * w.gpPct).toFixed(0)}`);
  assert("GP MOIC >= 1.0 (not only capital back)", w.gpMOIC > 1.0);
  assert("LP MOIC > 1.0 (still profitable for LP)", w.lpMOIC > 1.0);
}

// ── CASE 2: reasonable promote — lpProfitSplitPct=70 with 20% GP equity ──
// Floor shouldn't activate: gpSplitPct = 30% > gpPct 20%. Behavior unchanged.
{
  console.log("\nCASE 2 — lpProfitSplitPct=70 (reasonable promote, floor inactive)");
  const r = runFullModel({
    ...base,
    prefReturnPct: 8, gpCatchup: true, carryPct: 20,
    lpProfitSplitPct: 70,
  });
  const w = r.waterfall;
  const t4Total = w.tier4LP.reduce((a,b)=>a+b,0) + w.tier4GP.reduce((a,b)=>a+b,0);
  const actualGpSplit = t4Total > 0 ? w.tier4GP.reduce((a,b)=>a+b,0) / t4Total : 0;
  assert("GP tier-4 split ≈ 30% (honors user config)",
    Math.abs(actualGpSplit - 0.30) < 0.01,
    `actual=${(actualGpSplit*100).toFixed(1)}%`);
}

// ── CASE 3: extreme GP promote — lpProfitSplitPct=10, floor inactive ──
{
  console.log("\nCASE 3 — lpProfitSplitPct=10 (extreme sponsor-favored, floor inactive)");
  const r = runFullModel({
    ...base,
    prefReturnPct: 0, gpCatchup: true, carryPct: 30,
    lpProfitSplitPct: 10,
  });
  const w = r.waterfall;
  const t4Total = w.tier4LP.reduce((a,b)=>a+b,0) + w.tier4GP.reduce((a,b)=>a+b,0);
  const actualGpSplit = t4Total > 0 ? w.tier4GP.reduce((a,b)=>a+b,0) / t4Total : 0;
  assert("GP tier-4 split ≈ 90% (honors user config)",
    Math.abs(actualGpSplit - 0.90) < 0.01,
    `actual=${(actualGpSplit*100).toFixed(1)}%`);
}

// ── CASE 4: no-promote mode — behavior unchanged (equity-pro-rata tier 4) ──
{
  console.log("\nCASE 4 — gpCatchup=false (no promote, floor does not apply)");
  const r = runFullModel({
    ...base,
    prefReturnPct: 0, gpCatchup: false, carryPct: 0,
    lpProfitSplitPct: 100, // would be ignored anyway
  });
  const w = r.waterfall;
  const t4Total = w.tier4LP.reduce((a,b)=>a+b,0) + w.tier4GP.reduce((a,b)=>a+b,0);
  const actualGpSplit = t4Total > 0 ? w.tier4GP.reduce((a,b)=>a+b,0) / t4Total : 0;
  assert("No-promote mode: GP tier-4 = gpPct (equity pro-rata)",
    Math.abs(actualGpSplit - w.gpPct) < 0.01,
    `actual=${(actualGpSplit*100).toFixed(1)}% vs gpPct=${(w.gpPct*100).toFixed(1)}%`);
}

console.log(`\n  ═══════════════════════════════════════════════════`);
console.log(`  ${pass} PASSED | ${fail} FAILED`);
console.log(`  ═══════════════════════════════════════════════════`);
process.exit(fail > 0 ? 1 : 0);
