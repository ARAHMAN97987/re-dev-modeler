/**
 * runFullModel PARITY TEST
 * 
 * Verifies that runFullModel(project) produces IDENTICAL results
 * to calling each engine function manually (the old useMemo chain).
 * 
 * Run: cd re-dev-modeler && node tests/runFullModel.cjs
 */
const {
  computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall,
  computeIndependentPhaseResults, runChecks, runFullModel
} = require('./helpers/engine.cjs');

let pass = 0, fail = 0;
const t = (name, ok, detail) => {
  if (ok) pass++;
  else { fail++; console.log(`  ❌ ${name}: ${detail || ''}`); }
};
const near = (a, b, tol = 0.01) => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < tol;
};

// ═══ Golden Scenario: Jazan Waterfront ═══
const JAZAN = {
  id:"jazan", name:"واجهة الميناء", status:"Draft", horizon:15, startYear:2025,
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

// ═══ Manual Pipeline (same as App.jsx useMemo chain) ═══
const mResults = computeProjectCashFlows(JAZAN);
const mIncentives = computeIncentives(JAZAN, mResults);
const mLegacyFin = computeFinancing(JAZAN, mResults, mIncentives);
const mLegacyWf = computeWaterfall(JAZAN, mResults, mLegacyFin, mIncentives);
const mIndep = computeIndependentPhaseResults(JAZAN, mResults, mIncentives);
const mFinancing = mIndep?.consolidatedFinancing || mLegacyFin;
const mWaterfall = mIndep?.consolidatedWaterfall || mLegacyWf;
const mChecks = runChecks(JAZAN, mResults, mFinancing, mWaterfall, mIncentives);

// ═══ runFullModel ═══
const fm = runFullModel(JAZAN);

// ═══ Compare ═══
t("runFullModel returns non-null", fm !== null);
t("projectResults match", fm.projectResults.consolidated.totalCapex === mResults.consolidated.totalCapex);
t("incentivesResult match", fm.incentivesResult?.totalIncentiveValue === mIncentives?.totalIncentiveValue);

// Financing
t("financing.totalDebt", near(fm.financing.totalDebt, mFinancing.totalDebt));
t("financing.totalEquity", near(fm.financing.totalEquity, mFinancing.totalEquity));
t("financing.gpEquity", near(fm.financing.gpEquity, mFinancing.gpEquity));
t("financing.lpEquity", near(fm.financing.lpEquity, mFinancing.lpEquity));
t("financing.leveredIRR", near(fm.financing.leveredIRR, mFinancing.leveredIRR, 0.0001));

// Year-by-year financing
for (let y = 0; y < 15; y++) {
  if (!near(fm.financing.debtBalClose[y], mFinancing.debtBalClose[y])) {
    t(`financing.debtBalClose[${y}]`, false, `${fm.financing.debtBalClose[y]} vs ${mFinancing.debtBalClose[y]}`);
    break;
  }
}
t("financing.debtBalClose all years", true);

for (let y = 0; y < 15; y++) {
  if (!near(fm.financing.leveredCF[y], mFinancing.leveredCF[y])) {
    t(`financing.leveredCF[${y}]`, false, `${fm.financing.leveredCF[y]} vs ${mFinancing.leveredCF[y]}`);
    break;
  }
}
t("financing.leveredCF all years", true);

// Waterfall
if (mWaterfall && fm.waterfall) {
  t("waterfall.lpIRR", near(fm.waterfall.lpIRR, mWaterfall.lpIRR, 0.0001));
  t("waterfall.gpIRR", near(fm.waterfall.gpIRR, mWaterfall.gpIRR, 0.0001));
  t("waterfall.lpMOIC", near(fm.waterfall.lpMOIC, mWaterfall.lpMOIC));
  t("waterfall.gpMOIC", near(fm.waterfall.gpMOIC, mWaterfall.gpMOIC));
} else {
  t("waterfall exists", fm.waterfall !== null && mWaterfall !== null, `fm=${!!fm.waterfall} manual=${!!mWaterfall}`);
}

// Checks
t("checks count", fm.checks.length === mChecks.length, `${fm.checks.length} vs ${mChecks.length}`);
const failedFm = fm.checks.filter(c => !c.pass).length;
const failedM = mChecks.filter(c => !c.pass).length;
t("checks failures match", failedFm === failedM, `${failedFm} vs ${failedM}`);

// Phase data
t("phaseFinancings keys", JSON.stringify(Object.keys(fm.phaseFinancings).sort()) === JSON.stringify(Object.keys(mIndep?.phaseFinancings || {}).sort()));

// ═══ SELF mode test ═══
const SELF = { ...JAZAN, finMode: "self", id: "self-test" };
const fmSelf = runFullModel(SELF);
t("self mode: financing exists", fmSelf.financing !== null);
t("self mode: financing.mode = self", fmSelf.financing.mode === "self");
t("self mode: waterfall is null", fmSelf.waterfall === null);
t("self mode: totalDebt = 0", fmSelf.financing.totalDebt === 0);

// ═══ DEBT mode test ═══
const DEBT = { ...JAZAN, finMode: "debt", id: "debt-test" };
const fmDebt = runFullModel(DEBT);
t("debt mode: financing exists", fmDebt.financing !== null);
t("debt mode: waterfall null (non-fund)", fmDebt.waterfall === null);
t("debt mode: totalDebt > 0", fmDebt.financing.totalDebt > 0);

// ═══ Null project ═══
t("null project returns null", runFullModel(null) === null);

// ═══ Empty assets ═══
const EMPTY = { ...JAZAN, assets: [], id: "empty-test" };
const fmEmpty = runFullModel(EMPTY);
t("empty assets: returns non-null", fmEmpty !== null);
t("empty assets: totalCapex = 0", fmEmpty.projectResults.consolidated.totalCapex === 0);

// ═══ Summary ═══
console.log(`\n${'═'.repeat(50)}`);
console.log(`  runFullModel: ${pass} PASSED | ${fail} FAILED`);
console.log(`${'═'.repeat(50)}`);
if (fail === 0) console.log('  🎉 runFullModel = manual pipeline (identical)');
else { console.log('  ⚠️  MISMATCH FOUND'); process.exit(1); }
