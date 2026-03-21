/**
 * ENGINE IMMUTABILITY TESTS
 * 
 * Verifies that engine functions do NOT mutate their input objects.
 * Uses deepFreeze — if any function tries to write to a frozen property,
 * it throws TypeError, which we catch as a mutation bug.
 * 
 * Run: cd re-dev-modeler && node tests/immutability.cjs
 */
const {
  computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall,
  computeIndependentPhaseResults, buildPhaseVirtualProject, buildPhaseIncentives,
  buildPhaseProjectResults, getScenarioMults, computeAssetCapex,
  calcIRR, calcNPV, defaultProject
} = require('./helpers/engine.cjs');

let pass = 0, fail = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
};

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.keys(obj).forEach(k => {
    if (typeof obj[k] === 'object' && obj[k] !== null && !Object.isFrozen(obj[k])) {
      deepFreeze(obj[k]);
    }
  });
  return obj;
}

// ═══ Test Project ═══
const BASE = {
  id: "test", name: "Immutability Test", status: "Draft",
  createdAt: "2025-01-01", updatedAt: "2025-01-01",
  location: "", startYear: 2025, horizon: 15, currency: "SAR",
  landType: "lease", landArea: 50000, landRentAnnual: 2000000,
  landRentEscalation: 5, landRentEscalationEveryN: 5, landRentGrace: 3, landRentTerm: 15,
  landPurchasePrice: 0, partnerEquityPct: 0, landValuation: 0, botOperationYears: 0,
  softCostPct: 10, contingencyPct: 5, rentEscalation: 1.0, vacancyPct: 0,
  defaultEfficiency: 85, defaultLeaseRate: 700, defaultCostPerSqm: 3500,
  activeScenario: "Base Case", customCapexMult: 100, customRentMult: 100, customDelay: 0, customEscAdj: 0,
  phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 36, footprint: 0 }],
  assets: [
    { id: "a1", phase: "Phase 1", category: "Retail", name: "Mall", code: "M1",
      gfa: 20000, footprint: 10000, plotArea: 15000, revType: "Lease", efficiency: 80,
      leaseRate: 2000, escalation: 1.0, rampUpYears: 3, stabilizedOcc: 90,
      costPerSqm: 4000, constrStart: 1, constrDuration: 24, opEbitda: 0,
      hotelPL: null, marinaPL: null },
  ],
  finMode: "fund", vehicleType: "fund", debtAllowed: true, maxLtvPct: 60,
  financeRate: 7, loanTenor: 8, debtGrace: 3, upfrontFeePct: 0.5,
  repaymentType: "amortizing", landCapitalize: false, landCapTo: "gp",
  graceBasis: "cod", feeTreatment: "capital", gpEquityManual: 0, lpEquityManual: 0,
  prefReturnPct: 15, gpCatchup: true, carryPct: 25, lpProfitSplitPct: 75,
  exitStrategy: "sale", exitYear: 0, exitMultiple: 10, exitCostPct: 2,
  subscriptionFeePct: 2, annualMgmtFeePct: 0.9, custodyFeeAnnual: 130000,
  developerFeePct: 10, structuringFeePct: 0.1, mgmtFeeBase: "devCost",
  incentives: {
    capexGrant: { enabled: false, grantPct: 25, maxCap: 50000000, phases: [], timing: "construction" },
    financeSupport: { enabled: false, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation", softLoanAmount: 0, softLoanTenor: 10, softLoanGrace: 3, phases: [] },
    landRentRebate: { enabled: false, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 3, phases: [] },
    feeRebates: { enabled: false, items: [], phases: [] },
  },
  sharedWith: [],
  market: { enabled: false, horizonYear: 2033, gaps: {}, thresholds: {}, conversionFactors: { sqmPerKey: 45, sqmPerUnit: 200, sqmPerBerth: 139 }, notes: "" },
};

// ═══ Tests ═══

t("computeProjectCashFlows does not mutate project", () => {
  const frozen = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  computeProjectCashFlows(frozen);
});

t("getScenarioMults does not mutate project", () => {
  const frozen = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  getScenarioMults(frozen);
});

t("computeAssetCapex does not mutate inputs", () => {
  const frozen = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  const asset = deepFreeze(JSON.parse(JSON.stringify(BASE.assets[0])));
  computeAssetCapex(asset, frozen);
});

// Run pipeline unfrozen to get results, then test downstream functions with frozen inputs
const results = computeProjectCashFlows(JSON.parse(JSON.stringify(BASE)));
const incentives = computeIncentives(JSON.parse(JSON.stringify(BASE)), results);
const financing = computeFinancing(JSON.parse(JSON.stringify(BASE)), results, incentives);

t("computeIncentives does not mutate project", () => {
  const frozenP = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  const frozenR = deepFreeze(JSON.parse(JSON.stringify(results)));
  computeIncentives(frozenP, frozenR);
});

t("computeFinancing does not mutate project", () => {
  const frozenP = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  const frozenR = deepFreeze(JSON.parse(JSON.stringify(results)));
  const frozenI = deepFreeze(JSON.parse(JSON.stringify(incentives)));
  computeFinancing(frozenP, frozenR, frozenI);
});

t("computeWaterfall does not mutate project", () => {
  const frozenP = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  const frozenR = deepFreeze(JSON.parse(JSON.stringify(results)));
  const frozenF = deepFreeze(JSON.parse(JSON.stringify(financing)));
  const frozenI = deepFreeze(JSON.parse(JSON.stringify(incentives)));
  computeWaterfall(frozenP, frozenR, frozenF, frozenI);
});

t("computeIndependentPhaseResults does not mutate project", () => {
  const frozenP = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  const frozenR = deepFreeze(JSON.parse(JSON.stringify(results)));
  const frozenI = deepFreeze(JSON.parse(JSON.stringify(incentives)));
  computeIndependentPhaseResults(frozenP, frozenR, frozenI);
});

t("buildPhaseVirtualProject does not mutate project", () => {
  const frozenP = deepFreeze(JSON.parse(JSON.stringify(BASE)));
  const phaseResult = deepFreeze({ allocPct: 1, totalCapex: 1000000, income: new Array(15).fill(0), capex: new Array(15).fill(0), landRent: new Array(15).fill(0), netCF: new Array(15).fill(0), totalIncome: 0, totalLandRent: 0, totalNetCF: 0, irr: null, assetCount: 1, footprint: 10000 });
  buildPhaseVirtualProject(frozenP, "Phase 1", phaseResult);
});

t("buildPhaseIncentives does not mutate incentivesResult", () => {
  const frozenR = deepFreeze(JSON.parse(JSON.stringify(results)));
  const frozenI = deepFreeze(JSON.parse(JSON.stringify(incentives)));
  buildPhaseIncentives(frozenR, frozenI, "Phase 1");
});

t("buildPhaseProjectResults does not mutate projectResults", () => {
  const frozenR = deepFreeze(JSON.parse(JSON.stringify(results)));
  buildPhaseProjectResults(frozenR, "Phase 1");
});

t("calcIRR does not mutate cash flow array", () => {
  const cf = deepFreeze([-1000, 300, 300, 300, 300, 300]);
  calcIRR(cf);
});

t("calcNPV does not mutate cash flow array", () => {
  const cf = deepFreeze([-1000, 300, 300, 300, 300, 300]);
  calcNPV(cf, 0.10);
});

// ═══ Summary ═══
console.log(`\n${'═'.repeat(50)}`);
console.log(`  IMMUTABILITY: ${pass} PASSED | ${fail} FAILED`);
console.log(`${'═'.repeat(50)}`);
if (fail === 0) console.log('  🎉 NO MUTATION DETECTED');
else { console.log('  ⚠️  MUTATION BUGS FOUND'); process.exit(1); }
