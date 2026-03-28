/**
 * Hybrid vs Fund LP IRR Comparison
 * Tests identical projects with fund+debt vs hybrid mode to identify IRR differences
 */
const engine = require('./helpers/engine.cjs');
const { runFullModel } = engine;

// Base project template - identical financials
const baseProject = {
  name: "IRR Comparison",
  currency: "SAR",
  startYear: 2027,
  horizon: 30,
  landType: "purchase",
  landPurchasePrice: 0,
  landArea: 0,
  landRentAnnual: 0,
  softCostPct: 0,
  contingencyPct: 0,
  defaultEfficiency: 85,
  defaultLeaseRate: 700,
  defaultCostPerSqm: 3500,
  rentEscalation: 0,
  vacancyPct: 0,
  assets: [{
    name: "Office Tower",
    type: "Office",
    gfa: 20000,
    costPerSqm: 3500,
    constructionMonths: 36,
    efficiency: 85,
    leaseRate: 700,
    occupancy: 90,
    opexPct: 20,
    startMonth: 0,
    revType: "Lease",
    stabilizedOcc: 90,
    rampUpYears: 2,
    escalation: 0,
    constrDuration: 36,
    phase: "Phase 1",
  }],
  phases: [{ name: "Phase 1", startYearOffset: 0, completionYear: 2030, footprint: 20000 }],

  // Fund settings (same for both)
  vehicleType: "fund",
  gpIsFundManager: false,
  fundStartYear: 0,
  subscriptionFeePct: 2,
  annualMgmtFeePct: 1.5,
  mgmtFeeBase: "nav",
  mgmtFeeCapAnnual: 0,
  custodyFeeAnnual: 100000,
  preEstablishmentFee: 200000,
  spvFee: 20000,
  auditorFeeAnnual: 50000,
  developerFeePct: 10,
  developerFeeBasis: "exclLand",
  structuringFeePct: 1,
  structuringFeeCap: 0,
  operatorFeePct: 0.15,
  operatorFeeCap: 600000,
  miscExpensePct: 0.5,
  feeTreatment: "capital",
  graceBasis: "cod",

  // Land cap
  landCapitalize: false,
  landCapRate: 0,

  // Equity
  gpEquityManual: 0,
  lpEquityManual: 0,
  gpInvestDevFee: false,
  gpCashInvest: false,
  gpCashInvestAmount: 0,
  partnerEquityPct: 0,

  // Exit
  exitStrategy: "caprate",
  exitCapRate: 9,
  exitCostPct: 2,
  exitYear: 0,
  exitStabilizationYears: 3,

  // Waterfall
  performanceIncentive: false,
  prefReturnPct: 0,
  gpCatchup: false,
  carryPct: 0,
  lpProfitSplitPct: 100,
  prefAllocation: "lpOnly",

  // No incentives
  incentives: {
    capexGrant: { enabled: false },
    financeSupport: { enabled: false },
    landRentRebate: { enabled: false },
    feeRebates: { enabled: false },
  },
};

// ═══ Scenario 1: Fund + Debt (70% @ 6%) ═══
const fundProject = {
  ...baseProject,
  name: "Fund + Debt",
  finMode: "fund",
  debtAllowed: true,
  maxLtvPct: 70,
  financeRate: 6,
  loanTenor: 10,
  debtGrace: 4,
  repaymentType: "amortizing",
  upfrontFeePct: 0,
  debtTrancheMode: "single",
  capitalizeIDC: false,
  islamicMode: "conventional",
};

// ═══ Scenario 2: Hybrid (70% gov @ 6%, same terms) ═══
const hybridProject = {
  ...baseProject,
  name: "Hybrid (Gov 70%)",
  finMode: "hybrid",
  govFinancingPct: 70,
  govBeneficiary: "project",
  govFinanceRate: 6,
  govLoanTenor: 10,
  govGrace: 4,
  govRepaymentType: "amortizing",
  govUpfrontFeePct: 0,
  hybridDrawOrder: "finFirst",
  debtAllowed: false,
  debtTrancheMode: "single",
  capitalizeIDC: false,
};

console.log("\n═══════════════════════════════════════════════════════");
console.log("  HYBRID vs FUND LP IRR COMPARISON");
console.log("═══════════════════════════════════════════════════════\n");

const fundResult = runFullModel(fundProject);
const hybridResult = runFullModel(hybridProject);

if (!fundResult || !hybridResult) {
  console.log("❌ One of the models returned null!");
  console.log("  Fund:", !!fundResult, "Hybrid:", !!hybridResult);
  process.exit(1);
}

const ff = fundResult.financing;
const hf = hybridResult.financing;
const fw = fundResult.waterfall;
const hw = hybridResult.waterfall;

const fmt = (n) => n != null ? n.toLocaleString() : "null";
const fmtPct = (n) => n != null ? (n * 100).toFixed(2) + "%" : "null";

console.log("── FINANCING STRUCTURE ──");
console.log(`  ${"".padEnd(25)} | ${"Fund+Debt".padStart(15)} | ${"Hybrid".padStart(15)}`);
console.log(`  ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(15)}`);
console.log(`  ${"Dev Cost".padEnd(25)} | ${fmt(ff.devCostInclLand).padStart(15)} | ${fmt(hf.devCostInclLand).padStart(15)}`);
console.log(`  ${"Total Project Cost".padEnd(25)} | ${fmt(ff.totalProjectCost).padStart(15)} | ${fmt(hf.totalProjectCost).padStart(15)}`);
console.log(`  ${"Max Debt".padEnd(25)} | ${fmt(ff.maxDebt).padStart(15)} | ${fmt(hf.maxDebt).padStart(15)}`);
console.log(`  ${"Total Debt Drawn".padEnd(25)} | ${fmt(ff.totalDebt).padStart(15)} | ${fmt(hf.totalDebt).padStart(15)}`);
console.log(`  ${"Total Equity".padEnd(25)} | ${fmt(ff.totalEquity).padStart(15)} | ${fmt(hf.totalEquity).padStart(15)}`);
console.log(`  ${"GP Equity".padEnd(25)} | ${fmt(ff.gpEquity).padStart(15)} | ${fmt(hf.gpEquity).padStart(15)}`);
console.log(`  ${"LP Equity".padEnd(25)} | ${fmt(ff.lpEquity).padStart(15)} | ${fmt(hf.lpEquity).padStart(15)}`);
console.log(`  ${"GP%".padEnd(25)} | ${fmtPct(ff.gpPct).padStart(15)} | ${fmtPct(hf.gpPct).padStart(15)}`);
console.log(`  ${"Rate".padEnd(25)} | ${fmtPct(ff.rate).padStart(15)} | ${fmtPct(hf.rate).padStart(15)}`);
console.log(`  ${"Tenor".padEnd(25)} | ${String(ff.tenor).padStart(15)} | ${String(hf.tenor).padStart(15)}`);
console.log(`  ${"Grace".padEnd(25)} | ${String(ff.grace).padStart(15)} | ${String(hf.grace).padStart(15)}`);
console.log(`  ${"isHybrid".padEnd(25)} | ${String(!!ff.isHybrid).padStart(15)} | ${String(!!hf.isHybrid).padStart(15)}`);
console.log(`  ${"Fund Portion Cost".padEnd(25)} | ${fmt(ff.fundPortionCost).padStart(15)} | ${fmt(hf.fundPortionCost).padStart(15)}`);
console.log(`  ${"Build Cost Only".padEnd(25)} | ${fmt(ff.buildCostOnly).padStart(15)} | ${fmt(hf.buildCostOnly).padStart(15)}`);

console.log("\n── FEE COMPARISON ──");
console.log(`  ${"".padEnd(25)} | ${"Fund+Debt".padStart(15)} | ${"Hybrid".padStart(15)} | ${"Delta".padStart(15)}`);
console.log(`  ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(15)} | ${"-".repeat(15)}`);
const feeTypes = ['feeSub', 'feeMgmt', 'feeCustody', 'feeDev', 'feeStruct', 'feePreEst', 'feeSpv', 'feeAuditor', 'feeOperator', 'feeMisc'];
const feeLabels = ['Subscription', 'Management', 'Custody', 'Developer', 'Structuring', 'Pre-Establishment', 'SPV Setup', 'Auditor', 'Operator', 'Miscellaneous'];
for (let i = 0; i < feeTypes.length; i++) {
  const fTotal = fw[feeTypes[i]].reduce((a,b) => a+b, 0);
  const hTotal = hw[feeTypes[i]].reduce((a,b) => a+b, 0);
  const delta = hTotal - fTotal;
  const marker = Math.abs(delta) > 1 ? " ←" : "";
  console.log(`  ${feeLabels[i].padEnd(25)} | ${fmt(Math.round(fTotal)).padStart(15)} | ${fmt(Math.round(hTotal)).padStart(15)} | ${fmt(Math.round(delta)).padStart(15)}${marker}`);
}
console.log(`  ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(15)} | ${"-".repeat(15)}`);
console.log(`  ${"TOTAL FEES".padEnd(25)} | ${fmt(Math.round(fw.totalFees)).padStart(15)} | ${fmt(Math.round(hw.totalFees)).padStart(15)} | ${fmt(Math.round(hw.totalFees - fw.totalFees)).padStart(15)}`);

console.log("\n── FEE BASIS ANALYSIS ──");
console.log(`  Fund effectiveDevCost (fee basis): ${fmt(ff.devCostExclLand)}`);
console.log(`  Hybrid fundFeeBasis:               ${fmt(hw.fundFeeBasis)}`);
console.log(`  Hybrid fundPortionCost:             ${fmt(hf.fundPortionCost)}`);

console.log("\n── EQUITY CALLS ──");
console.log(`  ${"".padEnd(25)} | ${"Fund+Debt".padStart(15)} | ${"Hybrid".padStart(15)}`);
console.log(`  ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(15)}`);
console.log(`  ${"LP Total Called".padEnd(25)} | ${fmt(Math.round(fw.lpTotalCalled)).padStart(15)} | ${fmt(Math.round(hw.lpTotalCalled)).padStart(15)}`);
console.log(`  ${"GP Total Called".padEnd(25)} | ${fmt(Math.round(fw.gpTotalCalled)).padStart(15)} | ${fmt(Math.round(hw.gpTotalCalled)).padStart(15)}`);
console.log(`  ${"Total Equity Called".padEnd(25)} | ${fmt(Math.round(fw.lpTotalCalled + fw.gpTotalCalled)).padStart(15)} | ${fmt(Math.round(hw.lpTotalCalled + hw.gpTotalCalled)).padStart(15)}`);

console.log("\n── DISTRIBUTIONS ──");
console.log(`  ${"".padEnd(25)} | ${"Fund+Debt".padStart(15)} | ${"Hybrid".padStart(15)}`);
console.log(`  ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(15)}`);
console.log(`  ${"LP Total Dist".padEnd(25)} | ${fmt(Math.round(fw.lpTotalDist)).padStart(15)} | ${fmt(Math.round(hw.lpTotalDist)).padStart(15)}`);
console.log(`  ${"GP Total Dist".padEnd(25)} | ${fmt(Math.round(fw.gpTotalDist)).padStart(15)} | ${fmt(Math.round(hw.gpTotalDist)).padStart(15)}`);

console.log("\n── IRR & MOIC ──");
console.log(`  ${"".padEnd(25)} | ${"Fund+Debt".padStart(15)} | ${"Hybrid".padStart(15)} | ${"Delta".padStart(10)}`);
console.log(`  ${"-".repeat(25)} | ${"-".repeat(15)} | ${"-".repeat(15)} | ${"-".repeat(10)}`);
console.log(`  ${"LP IRR".padEnd(25)} | ${fmtPct(fw.lpIRR).padStart(15)} | ${fmtPct(hw.lpIRR).padStart(15)} | ${((hw.lpIRR - fw.lpIRR) * 100).toFixed(2).padStart(10)}%`);
console.log(`  ${"GP IRR".padEnd(25)} | ${fmtPct(fw.gpIRR).padStart(15)} | ${fmtPct(hw.gpIRR).padStart(15)} | ${((hw.gpIRR - fw.gpIRR) * 100).toFixed(2).padStart(10)}%`);
console.log(`  ${"LP MOIC".padEnd(25)} | ${fw.lpMOIC.toFixed(3).padStart(15)} | ${hw.lpMOIC.toFixed(3).padStart(15)} | ${(hw.lpMOIC - fw.lpMOIC).toFixed(3).padStart(10)}`);
console.log(`  ${"GP MOIC".padEnd(25)} | ${fw.gpMOIC.toFixed(3).padStart(15)} | ${hw.gpMOIC.toFixed(3).padStart(15)} | ${(hw.gpMOIC - fw.gpMOIC).toFixed(3).padStart(10)}`);
console.log(`  ${"Project IRR".padEnd(25)} | ${fmtPct(fw.projIRR).padStart(15)} | ${fmtPct(hw.projIRR).padStart(15)} | ${((hw.projIRR - fw.projIRR) * 100).toFixed(2).padStart(10)}%`);

// Year-by-year LP Net CF comparison
console.log("\n── LP NET CF (Year by Year) ──");
console.log(`  Year  |  Fund LP NetCF  |  Hybrid LP NetCF  |  Delta`);
console.log(`  ------|-----------------|-------------------|------------------`);
const sy = 2027;
const h = 30;
for (let y = 0; y < Math.min(20, h); y++) {
  const fCF = fw.lpNetCF[y] || 0;
  const hCF = hw.lpNetCF[y] || 0;
  const delta = hCF - fCF;
  if (Math.abs(fCF) > 0 || Math.abs(hCF) > 0) {
    console.log(`  ${sy+y}  |  ${fmt(Math.round(fCF)).padStart(15)} |  ${fmt(Math.round(hCF)).padStart(17)} |  ${fmt(Math.round(delta)).padStart(15)}`);
  }
}

// Drawdown comparison
console.log("\n── DRAWDOWN (Year by Year) ──");
console.log(`  Year  |  Fund Drawdown  |  Hybrid Drawdown  |  Fund EquityCalls |  Hybrid EquityCalls`);
console.log(`  ------|-----------------|-------------------|-------------------|-------------------`);
for (let y = 0; y < Math.min(15, h); y++) {
  const fd = ff.drawdown[y] || 0;
  const hd = hf.drawdown[y] || 0;
  const fe = ff.equityCalls[y] || 0;
  const he = hf.equityCalls[y] || 0;
  if (fd > 0 || hd > 0 || fe > 0 || he > 0) {
    console.log(`  ${sy+y}  |  ${fmt(Math.round(fd)).padStart(15)} |  ${fmt(Math.round(hd)).padStart(17)} |  ${fmt(Math.round(fe)).padStart(17)} |  ${fmt(Math.round(he)).padStart(17)}`);
  }
}

// Debt service comparison
console.log("\n── DEBT SERVICE ──");
console.log(`  Year  |  Fund DS        |  Hybrid DS        |  Delta`);
console.log(`  ------|-----------------|-------------------|------------------`);
for (let y = 0; y < Math.min(20, h); y++) {
  const fds = ff.debtService[y] || 0;
  const hds = hf.debtService[y] || 0;
  const delta = hds - fds;
  if (fds > 0 || hds > 0) {
    console.log(`  ${sy+y}  |  ${fmt(Math.round(fds)).padStart(15)} |  ${fmt(Math.round(hds)).padStart(17)} |  ${fmt(Math.round(delta)).padStart(15)}`);
  }
}

console.log("\n═══ ANALYSIS ═══");
const feeDelta = hw.totalFees - fw.totalFees;
const irrDelta = (hw.lpIRR - fw.lpIRR) * 100;
if (Math.abs(feeDelta) < 100 && Math.abs(irrDelta) < 0.01) {
  console.log("✓ LP IRR is IDENTICAL between Fund and Hybrid (fee bases match)");
} else {
  console.log(`  Fee delta: ${fmt(Math.round(feeDelta))} SAR (hybrid ${feeDelta < 0 ? 'lower' : 'higher'} fees)`);
  console.log(`  LP IRR delta: ${irrDelta.toFixed(2)}% (hybrid ${irrDelta > 0 ? 'higher' : 'lower'})`);
  if (feeDelta < 0 && irrDelta > 0) {
    console.log("  → Lower fees in hybrid → higher LP IRR. This is because:");
    console.log("    - Fund mode: mgmt/struct fees on FULL project cost (effectiveDevCost)");
    console.log("    - Hybrid mode: mgmt/struct fees on FUND PORTION only (30% of project)");
    console.log("    - This IS the correct behavior IF fund only manages 30%");
    console.log("    - BUT if both modes should produce identical LP IRR with same terms,");
    console.log("      then fee basis should be the same in both modes.");
  }
}

console.log("\n═══ TEST COMPLETE ═══\n");
