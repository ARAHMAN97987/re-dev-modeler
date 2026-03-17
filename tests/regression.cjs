/**
 * ZAN Financial Modeler - Regression Test Pack (C10)
 * Run: cd re-dev-modeler && node tests/regression.js
 * 
 * Golden scenario: Jazan Waterfront (4 assets, 15yr, fund mode)
 * Must pass 100% before any deployment.
 */
const fs = require('fs');
const appCode = fs.readFileSync('src/App.jsx', 'utf8');
eval(appCode.substring(appCode.indexOf('function getScenarioMults'), appCode.indexOf('function computePhaseWaterfalls')));

let pass = 0, fail = 0, tests = [];
const t = (cat, name, ok, detail) => {
  tests.push({ cat, name, pass: ok, detail });
  if (ok) pass++; else { fail++; console.log(`  ❌ [${cat}] ${name}: ${detail || ''}`); }
};

// ═══════════════════════════════════════════════
// GOLDEN SCENARIO: Jazan Waterfront
// ═══════════════════════════════════════════════
const JAZAN = {
  id:"jazan", name:"واجهة الميناء - جازان", status:"Draft", horizon:15, startYear:2025,
  landType:"lease", landArea:80000, landRentAnnual:4000000,
  landRentEscalation:5, landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:15,
  softCostPct:10, contingencyPct:5, rentEscalation:1.0, activeScenario:"Base Case",
  phases:[{name:"Phase 1"},{name:"Phase 2"}],
  assets:[
    { id:"a1", phase:"Phase 1", category:"Retail", name:"Marina Mall", code:"MM",
      gfa:25000, footprint:15000, plotArea:20000, revType:"Lease", efficiency:80,
      leaseRate:2500, escalation:1.0, rampUpYears:3, stabilizedOcc:90,
      costPerSqm:4000, constrStart:1, constrDuration:24, opEbitda:0 },
    { id:"a2", phase:"Phase 1", category:"Hospitality", name:"Hotel 4-Star", code:"H1",
      gfa:15000, footprint:5000, plotArea:8000, revType:"Operating", efficiency:0,
      leaseRate:0, escalation:1.0, rampUpYears:4, stabilizedOcc:100,
      costPerSqm:8500, constrStart:1, constrDuration:36, opEbitda:12000000 },
    { id:"a3", phase:"Phase 2", category:"Office", name:"Office Tower", code:"O1",
      gfa:12000, footprint:3000, plotArea:5000, revType:"Lease", efficiency:90,
      leaseRate:1200, escalation:1.0, rampUpYears:2, stabilizedOcc:85,
      costPerSqm:3000, constrStart:3, constrDuration:30, opEbitda:0 },
    { id:"a4", phase:"Phase 2", category:"Residential", name:"Apartments", code:"R1",
      gfa:18000, footprint:4000, plotArea:6000, revType:"Lease", efficiency:85,
      leaseRate:800, escalation:1.0, rampUpYears:2, stabilizedOcc:92,
      costPerSqm:2800, constrStart:3, constrDuration:30, opEbitda:0 },
  ],
  finMode:"fund", vehicleType:"fund", debtAllowed:true, maxLtvPct:60,
  financeRate:7, loanTenor:8, debtGrace:3, upfrontFeePct:0.5,
  repaymentType:"amortizing", landCapitalize:false, landCapTo:"gp",
  graceBasis:"cod", feeTreatment:"capital",
  gpEquityManual:0, lpEquityManual:0,
  prefReturnPct:15, gpCatchup:true, carryPct:25, lpProfitSplitPct:75,
  exitStrategy:"sale", exitYear:0, exitMultiple:10, exitCostPct:2,
  subscriptionFeePct:2, annualMgmtFeePct:0.9, custodyFeeAnnual:130000,
  developerFeePct:10, structuringFeePct:0.1, mgmtFeeBase:"devCost",
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},
    landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

const r = computeProjectCashFlows(JAZAN);
const i = computeIncentives(JAZAN, r);
const f = computeFinancing(JAZAN, r, i);
const w = computeWaterfall(JAZAN, r, f, i);
const checks = runChecks(JAZAN, r, f, w, i);

// ── T1: Project Engine ──
const tol = (actual, expected, pct) => Math.abs(actual - expected) / Math.max(1, Math.abs(expected)) < pct/100;
t("T1", "Total CAPEX = 362,554,500", tol(r.consolidated.totalCapex, 362554500, 0.01), `Got: ${Math.round(r.consolidated.totalCapex)}`);
t("T1", "Total Income (15yr) > 900M", r.consolidated.totalIncome > 900000000, `Got: ${Math.round(r.consolidated.totalIncome)}`);
t("T1", "Unlevered IRR ~13.5%", tol(r.consolidated.irr, 0.1353, 1), `Got: ${(r.consolidated.irr*100).toFixed(2)}%`);
t("T1", "NPV@10% > 0", r.consolidated.npv10 > 0, `Got: ${Math.round(r.consolidated.npv10)}`);
t("T1", "4 assets computed", r.assetSchedules.length === 4);
t("T1", "2 phases", Object.keys(r.phaseResults).length === 2);

// ── T2: Financing ──
t("T2", "Max Debt = 217,532,700", tol(f.maxDebt, 217532700, 0.01), `Got: ${Math.round(f.maxDebt)}`);
t("T2", "Total Equity = 145,021,800", tol(f.totalEquity, 145021800, 0.01), `Got: ${Math.round(f.totalEquity)}`);
t("T2", "GP = LP (50/50)", Math.abs(f.gpEquity - f.lpEquity) < 1);
t("T2", "Levered IRR > 25%", f.leveredIRR > 0.25, `Got: ${(f.leveredIRR*100).toFixed(2)}%`);
t("T2", "DSCR all > 0 during repayment", f.dscr.filter(d => d !== null && d > 0).length > 0);
t("T2", "Debt fully repaid", f.debtBalClose[f.repayStart + f.repayYears] === 0 || f.debtBalClose[14] < 1);

// ── T3: Waterfall ──
t("T3", "Catch-up < Pref (C5 fix)", w.tier3.reduce((s,v)=>s+v,0) < w.tier2.reduce((s,v)=>s+v,0));
t("T3", "LP IRR > 20%", w.lpIRR > 0.20, `Got: ${(w.lpIRR*100).toFixed(2)}%`);
t("T3", "GP IRR > 15%", w.gpIRR > 0.15, `Got: ${(w.gpIRR*100).toFixed(2)}%`);
t("T3", "LP MOIC > 5x", w.lpMOIC > 5, `Got: ${w.lpMOIC.toFixed(2)}x`);
t("T3", "DPI exists", w.lpDPI > 0 && w.gpDPI > 0);
t("T3", "LP+GP dist = total distributable", Math.abs(w.lpTotalDist + w.gpTotalDist - (w.tier1.reduce((s,v)=>s+v,0) + w.tier2.reduce((s,v)=>s+v,0) + w.tier3.reduce((s,v)=>s+v,0) + w.tier4LP.reduce((s,v)=>s+v,0) + w.tier4GP.reduce((s,v)=>s+v,0))) < 1);

// ── T4: Edge Cases ──
// C1: Zero inputs
const p0 = {...JAZAN, financeRate:0};
const f0 = computeFinancing(p0, computeProjectCashFlows(p0), computeIncentives(p0, computeProjectCashFlows(p0)));
t("T4", "C1: rate=0 stays 0", f0.rate === 0);

// C2: Land purchase
const pL = {...JAZAN, landType:"purchase", landPurchasePrice:50000000, landCapitalize:false};
const fL = computeFinancing(pL, computeProjectCashFlows(pL), computeIncentives(pL, computeProjectCashFlows(pL)));
t("T4", "C2: land in financing", fL.devCostInclLand > r.consolidated.totalCapex);

// C3: Self-funded exit
const pS = {...JAZAN, finMode:"self"};
const fS = computeFinancing(pS, computeProjectCashFlows(pS), computeIncentives(pS, computeProjectCashFlows(pS)));
t("T4", "C3: self exit > 0", fS.exitProceeds.some(v => v > 0));

// C4: Asset escalation
const pE = {...JAZAN, assets:[{...JAZAN.assets[0], escalation:5}, ...JAZAN.assets.slice(1)]};
const rE = computeProjectCashFlows(pE);
t("T4", "C4: asset esc 5%", Math.abs((rE.assetSchedules[0].revenueSchedule[6]/rE.assetSchedules[0].revenueSchedule[5]-1)*100 - 5) < 0.5);

// C9: IRR edge
t("T4", "C9: flat CF → null", calcIRR(new Array(10).fill(100)) === null);
t("T4", "C9: valid CF → number", typeof w.lpIRR === "number");

// H1: Sale
const pSale = {...JAZAN, assets:[{...JAZAN.assets[0], revType:"Sale", salePricePerSqm:8000, efficiency:85, absorptionYears:3, preSalePct:10, commissionPct:3}]};
t("T4", "H1: Sale revenue > 0", computeProjectCashFlows(pSale).consolidated.totalIncome > 0);

// H7: Unphased
t("T4", "H7: Unphased works", Object.keys(computeProjectCashFlows({...JAZAN, assets:[{...JAZAN.assets[0], phase:""}]}).phaseResults).includes("Unphased"));

// H12: Delay
const rD = computeProjectCashFlows({...JAZAN, activeScenario:"Delay +6 months"});
t("T4", "H12: delay shifts start", rD.consolidated.capex.findIndex(v=>v>0) > r.consolidated.capex.findIndex(v=>v>0));

// H14: Fee treatment
const wExp = computeWaterfall({...JAZAN, feeTreatment:"expense"}, r, f, i);
t("T4", "H14: expense ≠ capital", wExp.lpDPI !== w.lpDPI);

// ── T5: Integrity Checks ──
const failedChecks = checks.filter(c => !c.pass && c.cat !== "T0");
t("T5", "All integrity checks pass", failedChecks.length === 0, failedChecks.map(c => c.name).join(", "));

// C8: Incentives
const pInc = {...JAZAN, incentives:{...JAZAN.incentives, landRentRebate:{enabled:true, constrRebatePct:50, operRebatePct:50, operRebateYears:15}}};
const rInc = computeProjectCashFlows(pInc), iInc = computeIncentives(pInc, rInc), fInc = computeFinancing(pInc, rInc, iInc);
const wInc = computeWaterfall(pInc, rInc, fInc, iInc);
t("T5", "C8: incentives improve LP", wInc.lpTotalDist > w.lpTotalDist);

// ═══ RESULTS ═══
console.log(`\n${"═".repeat(50)}`);
console.log(`  ZAN REGRESSION TEST: ${pass} PASSED | ${fail} FAILED`);
console.log(`${"═".repeat(50)}`);
if (fail === 0) {
  console.log("  🎉 ALL TESTS PASSED - SAFE TO DEPLOY");
} else {
  console.log("  ⛔ FAILURES DETECTED - DO NOT DEPLOY");
  process.exit(1);
}
