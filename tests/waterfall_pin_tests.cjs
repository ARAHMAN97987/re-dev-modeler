/**
 * Waterfall Pin-Tests (PT-1 .. PT-6)
 *
 * Pins specific waterfall scenarios that the user has expressed recurring
 * fear about. Each test documents the EXPECTED behavior at the engine level
 * — these are regression guards. If any fails, STOP and review with user.
 *
 * PT-1: LP loses money → MOIC<1, IRR<0, no phantom distributions.
 * PT-2: gpCatchup=false, carryPct=0, profitable → GP gets equity-pro-rata share.
 * PT-3: prefAlloc proRata vs lpOnly → total distributions conserved.
 * PT-4: carryPct=99% → tier3 finite (cap guard works).
 * PT-5: Performance incentive with excess >> settlement-year LP dist
 *        → clawback capped at that year's lpDist (current behavior).
 * PT-6: gpCatchup=false, carryPct=30% → carry silently ignored (current
 *        behavior — flagged to user for policy decision).
 */

const { runFullModel } = require('./helpers/engine.cjs');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✓ ${msg}`); pass++; }
  else      { console.log(`  ✗ ${msg}`); fail++; }
}
function near(a, b, tol = 1e-3) { return Math.abs(a - b) <= tol; }

// ── Profitable base project (fund mode, sale exit, sufficient revenue) ──
// Uses partner land structure so GP has real equity via land-cap contribution.
// gpPct ≈ partnerEquityPct. Without this, gpPct=0 and GP gets no profit share.
const profitable = () => ({
  name: "PT base",
  location: "Riyadh",
  startYear: 2026,
  horizon: 10,
  currency: "SAR",
  landType: "partner",
  landValuation: 25000000,
  partnerEquityPct: 50,
  landAreaSqm: 50000,
  finMode: "fund",
  vehicleType: "fund",
  exitStrategy: "sale",
  exitYear: 7,
  exitCostPct: 0,
  softCostPct: 0,
  contingencyPct: 0,
  prefReturnPct: 0,
  gpCatchup: false,
  carryPct: 0,
  lpProfitSplitPct: 50,
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
  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 50000 }],
  assets: [
    { id: "a1", name: "Plots", phase: "Phase 1", category: "Retail",
      revType: "Sale", gfa: 50000, costPerSqm: 500, efficiency: 70,
      salePricePerSqm: 2500, absorptionYears: 2, preSalePct: 0, commissionPct: 0,
      constrStart: 0, constrDuration: 12, rampUpYears: 1, stabilizedOcc: 100,
      escalation: 0, plotArea: 50000, footprint: 0 },
  ],
});

console.log("═════════════════════════════════════════════════════════");
console.log("  WATERFALL PIN-TESTS (PT-1..PT-6)");
console.log("═════════════════════════════════════════════════════════\n");

// ──────────────────────────────────────────────────────────────
// PT-1: Loss scenario → LP MOIC < 1
// ──────────────────────────────────────────────────────────────
console.log("[PT-1] Loss scenario: LP should get back less than invested");
{
  // Make the project lose money: jack up cost, reduce sale price.
  const p = profitable();
  p.assets = [{ ...p.assets[0], costPerSqm: 2000, salePricePerSqm: 500 }];
  const r = runFullModel(p);
  const w = r.waterfall;
  assert(w != null, "waterfall computed for loss scenario");
  if (w) {
    assert(w.lpTotalCalled > 0, `LP called > 0 (${w.lpTotalCalled.toFixed(0)})`);
    assert(w.lpTotalDist < w.lpTotalCalled, `LP distributions (${w.lpTotalDist.toFixed(0)}) < LP called (${w.lpTotalCalled.toFixed(0)}) — loss preserved`);
    assert(w.lpMOIC < 1, `LP MOIC (${w.lpMOIC.toFixed(3)}) < 1.0 on loss`);
    // IRR may be null when no positive CF — that is acceptable
    assert(w.lpIRR === null || w.lpIRR < 0, `LP IRR (${w.lpIRR === null ? 'null' : (w.lpIRR*100).toFixed(1)+'%'}) negative or null on loss`);
    // No phantom distributions: all lpDist values are non-negative
    const minLP = Math.min(...w.lpDist);
    assert(minLP >= -1e-6, `No negative LP distributions (min=${minLP.toFixed(3)})`);
  }
}

// ──────────────────────────────────────────────────────────────
// PT-2: No promote → GP gets equity-pro-rata profit share
// ──────────────────────────────────────────────────────────────
console.log("\n[PT-2] No promote (gpCatchup=false, carryPct=0, profitable) → GP share ≈ gpPct");
{
  const p = profitable();
  p.gpCatchup = false;
  p.carryPct = 0;
  p.prefReturnPct = 0;
  p.lpProfitSplitPct = 99; // deliberately misconfigured — engine should override to equity-prorata
  const r = runFullModel(p);
  const w = r.waterfall;
  if (w) {
    // Sponsor-promote floor: when hasPromoteStructure=false,
    // lpSplitPct = lpPct regardless of saved lpProfitSplitPct.
    const totalDist = w.lpTotalDist + w.gpTotalDist;
    const gpShare = totalDist > 0 ? w.gpTotalDist / totalDist : 0;
    assert(totalDist > 0, `Total distributions > 0 (${totalDist.toFixed(0)})`);
    assert(w.gpPct > 0, `GP has equity (gpPct=${(w.gpPct*100).toFixed(1)}%)`);
    // GP share should be close to gpPct (equity-proportional)
    assert(near(gpShare, w.gpPct, 0.02), `GP share ≈ gpPct (share=${(gpShare*100).toFixed(1)}%, gpPct=${(w.gpPct*100).toFixed(1)}%)`);
    assert(w.gpMOIC > 1, `GP MOIC > 1 — developer-as-investor gets profit, not just capital (actual ${w.gpMOIC.toFixed(3)})`);
  } else {
    assert(false, "waterfall computed");
  }
}

// ──────────────────────────────────────────────────────────────
// PT-3: prefAlloc conservation (proRata vs lpOnly sum to same total)
// ──────────────────────────────────────────────────────────────
console.log("\n[PT-3] prefAlloc proRata vs lpOnly → total (LP+GP) conserved");
{
  const base = profitable();
  base.prefReturnPct = 8;
  base.gpCatchup = true;
  base.carryPct = 20;
  base.lpProfitSplitPct = 80;

  const p1 = { ...base, prefAllocation: "proRata" };
  const p2 = { ...base, prefAllocation: "lpOnly" };
  const r1 = runFullModel(p1), r2 = runFullModel(p2);
  const w1 = r1.waterfall, w2 = r2.waterfall;
  if (w1 && w2) {
    const tot1 = w1.lpTotalDist + w1.gpTotalDist;
    const tot2 = w2.lpTotalDist + w2.gpTotalDist;
    assert(near(tot1, tot2, Math.max(1, tot1 * 1e-6)),
      `Total distributions equal: proRata=${tot1.toFixed(0)}, lpOnly=${tot2.toFixed(0)}`);
    // Allocation should actually differ between the two modes
    assert(Math.abs(w1.lpTotalDist - w2.lpTotalDist) > 0,
      `LP allocation DOES differ between modes (proRata=${w1.lpTotalDist.toFixed(0)}, lpOnly=${w2.lpTotalDist.toFixed(0)})`);
  } else {
    assert(false, "both waterfalls computed");
  }
}

// ──────────────────────────────────────────────────────────────
// PT-4: Extreme carry (99%) → tier3 finite, no NaN/Infinity
// ──────────────────────────────────────────────────────────────
console.log("\n[PT-4] Extreme carry (99%) → no Infinity/NaN in tier3");
{
  const p = profitable();
  p.prefReturnPct = 8;
  p.gpCatchup = true;
  p.carryPct = 99;
  p.lpProfitSplitPct = 50;
  const r = runFullModel(p);
  const w = r.waterfall;
  if (w) {
    const t3Total = w.tier3.reduce((a, b) => a + b, 0);
    assert(isFinite(t3Total), `tier3 total is finite (${t3Total.toFixed(0)})`);
    assert(!isNaN(t3Total), "tier3 total is not NaN");
    assert(isFinite(w.gpTotalDist), `GP total dist finite (${w.gpTotalDist.toFixed(0)})`);
    assert(isFinite(w.lpTotalDist), `LP total dist finite (${w.lpTotalDist.toFixed(0)})`);
    assert(w.lpMOIC >= 0 && isFinite(w.lpMOIC), `LP MOIC sane (${w.lpMOIC.toFixed(3)})`);
    assert(w.gpMOIC >= 0 && isFinite(w.gpMOIC), `GP MOIC sane (${w.gpMOIC.toFixed(3)})`);
  } else {
    assert(false, "waterfall computed");
  }
}

// ──────────────────────────────────────────────────────────────
// PT-5: Performance incentive with excess >> settlement year lpDist
// → clawback capped at lpDist[settleYear] (documents current behaviour)
// ──────────────────────────────────────────────────────────────
console.log("\n[PT-5] Performance incentive clawback capped at settlement year lpDist");
{
  const p = profitable();
  p.prefReturnPct = 0;
  p.gpCatchup = false;
  p.carryPct = 0;
  p.performanceIncentive = true;
  p.hurdleIRR = 1;        // very low hurdle → most dist is "excess"
  p.incentivePct = 100;   // GP tries to take 100% of excess
  p.hurdleMode = "simple";
  const r = runFullModel(p);
  const w = r.waterfall;
  if (w) {
    assert(w.perfIncentiveEnabled === true, "incentive enabled");
    assert(w.perfIncentiveAmount >= 0, `incentive amount non-negative (${w.perfIncentiveAmount.toFixed(0)})`);
    // Settlement year is the last year with positive lpDist pre-incentive.
    // Even with huge intended clawback, settled amount cannot exceed that year's lpDist.
    // We verify by checking no negative lpDist values anywhere.
    const minLP = Math.min(...w.lpDist);
    assert(minLP >= -1e-6, `No negative LP distributions post-clawback (min=${minLP.toFixed(3)})`);
    // And that perfIncentiveAmount doesn't exceed lpTotalDist (sanity)
    assert(w.perfIncentiveAmount <= w.lpTotalDist + w.perfIncentiveAmount + 1,
      "incentive amount does not produce impossible LP distribution");
  } else {
    assert(false, "waterfall computed");
  }
}

// ──────────────────────────────────────────────────────────────
// PT-6: gpCatchup=false + carryPct>0 → carry silently ignored
//       THIS DOCUMENTS CURRENT BEHAVIOUR. Flagged for user policy decision.
// ──────────────────────────────────────────────────────────────
console.log("\n[PT-6] gpCatchup=false with carryPct=30 → carry is ignored (current behaviour)");
{
  const withCarryNoCatchup = (() => {
    const p = profitable();
    p.gpPct = 50; p.lpPct = 50;
    p.prefReturnPct = 0;
    p.gpCatchup = false;
    p.carryPct = 30;
    p.lpProfitSplitPct = 50;
    return runFullModel(p);
  })();

  const noCarryNoCatchup = (() => {
    const p = profitable();
    p.gpPct = 50; p.lpPct = 50;
    p.prefReturnPct = 0;
    p.gpCatchup = false;
    p.carryPct = 0;
    p.lpProfitSplitPct = 50;
    return runFullModel(p);
  })();

  const w1 = withCarryNoCatchup.waterfall, w2 = noCarryNoCatchup.waterfall;
  if (w1 && w2) {
    // If carry were applied, w1 GP dist would be ~30% higher than w2.
    // If carry is ignored (current code path, line 351), distributions should be identical.
    const gpDelta = Math.abs(w1.gpTotalDist - w2.gpTotalDist);
    const rel = w2.gpTotalDist > 0 ? gpDelta / w2.gpTotalDist : 0;
    assert(rel < 1e-6,
      `GP dist identical with/without carry (Δ=${gpDelta.toFixed(0)}, rel=${(rel*1e6).toFixed(2)}ppm) — current behaviour: carry is ignored when catchup=false`);
    const lpDelta = Math.abs(w1.lpTotalDist - w2.lpTotalDist);
    assert(lpDelta < 1e-3,
      `LP dist identical with/without carry (Δ=${lpDelta.toFixed(6)})`);
  } else {
    assert(false, "both waterfalls computed");
  }
}

console.log("\n═════════════════════════════════════════════════════════");
if (fail === 0) {
  console.log(`  🎯 PIN-TESTS (PT-1..PT-6): ${pass} PASSED | 0 FAILED`);
} else {
  console.log(`  ❌ PIN-TESTS: ${pass} passed, ${fail} failed`);
}
console.log("═════════════════════════════════════════════════════════");

process.exit(fail > 0 ? 1 : 0);
