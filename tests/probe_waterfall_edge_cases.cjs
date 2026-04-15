/**
 * Waterfall Edge-Case Diagnostic Probe
 *
 * Tests the user's two standing concerns:
 *   A. "Investor gets back less than invested" — LP RoC under-fill in loss/small-win cases
 *   B. "Developer-as-investor only gets capital back while LP takes all profit"
 *   C. Pref/carry boundary conditions
 *
 * Prints numerical evidence; does not assert hard invariants (yet).
 */
const { runFullModel } = require('./helpers/engine.cjs');

const base = {
  name: "Probe", location: "Test", startYear: 2026, horizon: 10, currency: "SAR",
  landType: "lease", landArea: 10000, landRentAnnual: 0, landRentGrace: 0,
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
  gpCashInvest: true, gpCashInvestAmount: 20000000, // GP invests 20M cash
  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 10000 }],
  assets: [
    { id: "a1", name: "Asset", phase: "Phase 1", category: "Office",
      revType: "Lease", gfa: 10000, costPerSqm: 10000, efficiency: 100,
      leaseRate: 1500, opEbitda: 0, constrStart: 0, constrDuration: 12, rampUpYears: 1,
      stabilizedOcc: 90, escalation: 0, plotArea: 10000, footprint: 10000 }
  ],
  exitStrategy: "sale",
};

function header(title) {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  ${title}`);
  console.log("═══════════════════════════════════════════════════════════");
}

function fmt(n) { return (n||0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function pct(n) { return n == null ? "—" : (n*100).toFixed(2) + "%"; }

function probe(label, overrides) {
  const p = { ...base, ...overrides };
  const r = runFullModel(p);
  if (!r || !r.waterfall) { console.log(`  [${label}] ❌ no waterfall`); return null; }
  const w = r.waterfall;
  const f = r.financing;

  const lpCalled = w.lpTotalCalled || 0;
  const lpDist = w.lpTotalDist || 0;
  const gpCalled = w.gpTotalCalled || 0;
  const gpDist = w.gpTotalDist || 0;
  const totalDist = lpDist + gpDist;
  const totalCalled = lpCalled + gpCalled;

  // Tier breakdown totals
  const t1 = w.tier1.reduce((a,b)=>a+b,0);
  const t2 = w.tier2.reduce((a,b)=>a+b,0);
  const t3 = w.tier3.reduce((a,b)=>a+b,0);
  const t4LP = w.tier4LP.reduce((a,b)=>a+b,0);
  const t4GP = w.tier4GP.reduce((a,b)=>a+b,0);

  console.log(`\n  [${label}]`);
  console.log(`    lpPct=${pct(w.lpPct)}  gpPct=${pct(w.gpPct)}  lpSplitPct(t4)=${w.tier4LP && t4LP+t4GP > 0 ? (t4LP/(t4LP+t4GP)*100).toFixed(1)+'%' : 'n/a'}`);
  console.log(`    LP Called=${fmt(lpCalled)}  LP Dist=${fmt(lpDist)}  MOIC=${(w.lpMOIC||0).toFixed(3)}x  IRR=${pct(w.lpIRR)}`);
  console.log(`    GP Called=${fmt(gpCalled)}  GP Dist=${fmt(gpDist)}  MOIC=${(w.gpMOIC||0).toFixed(3)}x  IRR=${pct(w.gpIRR)}`);
  console.log(`    Tiers: T1(RoC)=${fmt(t1)}  T2(Pref)=${fmt(t2)}  T3(Catch)=${fmt(t3)}  T4-LP=${fmt(t4LP)}  T4-GP=${fmt(t4GP)}`);
  console.log(`    Totals: Called=${fmt(totalCalled)}  Dist=${fmt(totalDist)}  Profit=${fmt(totalDist - totalCalled)}`);
  // Flag: LP got back less than invested (excl. hypothetical profit)
  if (lpDist < lpCalled * 0.999 && totalDist >= totalCalled) {
    console.log(`    ⚠️  FLAG: LP dist (${fmt(lpDist)}) < LP called (${fmt(lpCalled)}) while project is profitable — investor lost capital to sponsor`);
  }
  // Flag: GP got only capital back (profit = 0 for GP) while LP captured all profit
  if (gpDist <= gpCalled * 1.001 && lpDist > lpCalled * 1.05 && totalDist > totalCalled) {
    console.log(`    ⚠️  FLAG: GP only got capital back (dist/called ~ 1.0x) while LP earned profit. Developer-as-investor economics broken.`);
  }
  // Flag: GP got more profit pct than equity pct suggests (excessive carry)
  if (gpCalled > 0 && (gpDist - gpCalled) > (totalDist - totalCalled) * w.gpPct * 3) {
    const gpProfitPct = (gpDist - gpCalled) / (totalDist - totalCalled);
    console.log(`    ⚠️  FLAG: GP captured ${(gpProfitPct*100).toFixed(1)}% of profit but only owns ${(w.gpPct*100).toFixed(1)}% of equity (likely extreme carry)`);
  }
  return { w, f, r };
}

header("SCENARIO A — LOSS CASE (total dist < total equity)");
probe("A1: Profitable baseline (sanity)", {});
probe("A2: 50% construction cost overrun forces loss", {
  assets: [{ ...base.assets[0], costPerSqm: 30000 }] // 3x cost → likely loss
});
probe("A3: Zero rental income (worst loss)", {
  assets: [{ ...base.assets[0], leaseRate: 0 }],
  exitStrategy: "hold"
});

header("SCENARIO B — DEVELOPER-AS-INVESTOR vs LP");
probe("B1: Baseline with GP cash invest 20M", {});
probe("B2: lpProfitSplitPct=100 (LP takes all tier4)", { lpProfitSplitPct: 100 });
probe("B3: lpProfitSplitPct=100 + pref=0 (no carry possible)", {
  lpProfitSplitPct: 100, prefReturnPct: 0
});
probe("B4: No promote (gpCatchup=false)", { gpCatchup: false });
probe("B5: No promote + carry=0", { gpCatchup: false, carryPct: 0 });

header("SCENARIO C — PREF/CARRY BOUNDARIES");
probe("C1: Pref barely met (prefRate=8%, IRR~9%)", {});
probe("C2: Zero pref, carry=30 (pure promote)", { prefReturnPct: 0, carryPct: 30 });
probe("C3: Pref=20% (likely not met)", { prefReturnPct: 20 });
probe("C4: Catchup method = cumulative", {
  catchupMethod: "cumulative", prefReturnPct: 8
});

header("SCENARIO D — PARTNER LAND (in-kind equity)");
probe("D1: Partner land 50/50", {
  landType: "partner", landValuation: 20000000, partnerEquityPct: 50,
  gpCashInvest: false, gpCashInvestAmount: 0
});
probe("D2: Partner land 75/25 GP-heavy", {
  landType: "partner", landValuation: 30000000, partnerEquityPct: 75,
  gpCashInvest: false, gpCashInvestAmount: 0
});

header("SCENARIO E — JV MODE");
probe("E1: JV baseline", { finMode: "jv" });

console.log("\n═══ END OF PROBE ═══\n");
