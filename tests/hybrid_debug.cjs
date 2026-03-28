/**
 * Hybrid Financing Debug Test
 * Simulates the TDF project to diagnose cash flow issues
 */
const engine = require('./helpers/engine.cjs');
const { runFullModel, computeProjectCashFlows, computeFinancing, computeWaterfall, computeIncentives } = engine;

// Build a project similar to the user's TDF project
const project = {
  name: "TDF Hybrid Test",
  currency: "SAR",
  startYear: 2027,

  // Land
  landType: "leasehold",
  landLeaseAnnual: 1000000,
  landLeaseTerm: 10,

  // Assets
  assets: [
    {
      name: "Tower A",
      type: "residential_apt",
      gfa: 100000,           // 100k sqm GFA
      costPerSqm: 3500,      // 3,500 SAR/sqm
      constructionMonths: 36, // 3 years
      rentalPerSqm: 50,      // annual rent per sqm
      occupancy: 85,
      opexPct: 15,
      startMonth: 0,
    }
  ],
  softCostPct: 0,
  contingencyPct: 0,

  // Financing - HYBRID mode with Project (SPV) beneficiary
  finMode: "hybrid",
  govBeneficiary: "project",  // THIS IS THE KEY - debt on project level
  govFinancingPct: 70,
  govFinanceRate: 6,
  govLoanTenor: 10,
  govGrace: 4,
  govRepaymentType: "amortizing",
  govUpfrontFeePct: 0,
  graceBasis: "firstDraw",
  hybridDrawOrder: "finFirst",  // FINANCING DRAWS FIRST
  debtTrancheMode: "single",
  capitalizeIDC: false,

  // Fund settings
  fundType: "regulated",
  fundStartYear: 2027,
  gpSplit: 70,
  lpSplit: 30,
  debtAllowed: false,  // No additional fund debt

  // Fees
  subscriptionFeePct: 2,
  mgmtFeePct: 0.9,
  devFeePct: 10,
  devFeeBasis: "devCostExcl",

  // Exit
  exitStrategy: "caprate",
  exitCapRate: 10,
  exitCostPct: 2,

  // Waterfall
  hurdleRate: 15,
  hurdleMode: "simple",
  enableCarry: true,
  carryPct: 10,
};

console.log("\n═══════════════════════════════════════════════════");
console.log("  HYBRID FINANCING DEBUG TEST");
console.log("═══════════════════════════════════════════════════\n");

const result = runFullModel(project);
if (!result) {
  console.log("❌ runFullModel returned null!");
  process.exit(1);
}

const { financing: f, waterfall: w, projectResults: pr } = result;

console.log("── PROJECT BASICS ──");
console.log("  Dev Cost (incl Land):", f.devCostInclLand?.toLocaleString());
console.log("  Total Project Cost:  ", f.totalProjectCost?.toLocaleString());
console.log("  Mode:               ", f.mode);
console.log("  isHybrid:           ", f.isHybrid);
console.log("  govBeneficiary:     ", f.govBeneficiary);
console.log("  govFinancingPct:    ", f.govFinancingPct, "%");
console.log("  hybridDrawOrder:    ", project.hybridDrawOrder);

console.log("\n── DEBT STRUCTURE ──");
console.log("  Max Debt (70%):     ", f.maxDebt?.toLocaleString());
console.log("  Total Drawn:        ", f.totalDebt?.toLocaleString());
console.log("  Total Equity:       ", f.totalEquity?.toLocaleString());
console.log("  GP Equity:          ", f.gpEquity?.toLocaleString());
console.log("  LP Equity:          ", f.lpEquity?.toLocaleString());
console.log("  Gov Loan Amount:    ", f.govLoanAmount?.toLocaleString());
console.log("  Fund Portion Cost:  ", f.fundPortionCost?.toLocaleString());
console.log("  Rate:               ", (f.rate * 100).toFixed(1), "%");
console.log("  Tenor:              ", f.tenor, "years");
console.log("  Grace:              ", f.grace, "years");

console.log("\n── DRAW ORDER (finFirst) ──");
const h = pr.horizon;
const sy = pr.startYear;
const capex = pr.consolidated.capex;
const totalCapex = capex.reduce((a,b) => a+b, 0);
console.log("  Total CAPEX:        ", totalCapex.toLocaleString());

console.log("\n  Year  |  CAPEX         |  Drawdown      |  Equity Call   |  Cum Drawn     |  Cum Equity");
console.log("  ------|----------------|----------------|----------------|----------------|----------------");
let cumDrawn = 0, cumEquity = 0;
for (let y = 0; y < Math.min(15, h); y++) {
  const cx = capex[y] || 0;
  const dd = f.drawdown[y] || 0;
  const eq = f.equityCalls[y] || 0;
  cumDrawn += dd;
  cumEquity += eq;
  if (cx !== 0 || dd !== 0 || eq !== 0) {
    console.log(`  ${sy+y}  |  ${cx.toLocaleString().padStart(14)} |  ${dd.toLocaleString().padStart(14)} |  ${eq.toLocaleString().padStart(14)} |  ${cumDrawn.toLocaleString().padStart(14)} |  ${cumEquity.toLocaleString().padStart(14)}`);
  }
}

console.log("\n── FINANCING CASH FLOWS ──");
console.log("  financingCF exists: ", !!f.financingCF);
console.log("  fundCF exists:      ", !!f.fundCF);

if (f.financingCF) {
  console.log("\n  Year  |  financingCF   |  fundCF        |  leveredCF");
  console.log("  ------|----------------|----------------|----------------");
  for (let y = 0; y < Math.min(15, h); y++) {
    const fc = f.financingCF[y] || 0;
    const fuc = f.fundCF[y] || 0;
    const lc = f.leveredCF[y] || 0;
    if (fc !== 0 || fuc !== 0 || lc !== 0) {
      console.log(`  ${sy+y}  |  ${fc.toLocaleString().padStart(14)} |  ${fuc.toLocaleString().padStart(14)} |  ${lc.toLocaleString().padStart(14)}`);
    }
  }
}

console.log("\n── DEBT SERVICE ──");
console.log("  Year  |  Balance Open  |  Interest      |  Repayment     |  Debt Service  |  DSCR");
console.log("  ------|----------------|----------------|----------------|----------------|--------");
for (let y = 0; y < Math.min(15, h); y++) {
  const bo = f.debtBalOpen[y] || 0;
  const int = (f.interest || [])[y] || 0;
  const rep = (f.repayment || [])[y] || 0;
  const ds = (f.debtService || [])[y] || 0;
  const dscr = f.dscr[y];
  if (bo > 0 || int > 0 || rep > 0) {
    console.log(`  ${sy+y}  |  ${bo.toLocaleString().padStart(14)} |  ${int.toLocaleString().padStart(14)} |  ${rep.toLocaleString().padStart(14)} |  ${ds.toLocaleString().padStart(14)} |  ${dscr != null ? dscr.toFixed(2)+'x' : '—'}`);
  }
}

// VERIFICATION CHECKS
console.log("\n═══ VERIFICATION CHECKS ═══");

// Check 1: Drawdown should happen before equity (finFirst)
let firstDrawYear = -1, firstEquityYear = -1;
for (let y = 0; y < h; y++) {
  if (f.drawdown[y] > 0 && firstDrawYear === -1) firstDrawYear = y;
  if (f.equityCalls[y] > 0 && firstEquityYear === -1) firstEquityYear = y;
}
const drawFirstOk = firstDrawYear <= firstEquityYear || firstEquityYear === -1;
console.log(`  ${drawFirstOk ? '✓' : '✗'} Draw Order: First draw year=${sy+firstDrawYear}, First equity year=${firstEquityYear>=0 ? sy+firstEquityYear : 'none'}`);

// Check 2: Total drawdown should be ~70% of project
const drawdownTotal = f.drawdown.reduce((a,b) => a+b, 0);
const equityTotal = f.equityCalls.reduce((a,b) => a+b, 0);
const drawPct = (drawdownTotal / (drawdownTotal + equityTotal) * 100).toFixed(1);
console.log(`  ${Math.abs(drawPct - 70) < 5 ? '✓' : '✗'} Debt/Equity Split: Debt=${drawPct}% (expected ~70%)`);

// Check 3: financingCF should NOT be all zeros
const finCFTotal = f.financingCF ? f.financingCF.reduce((a,b) => a + Math.abs(b), 0) : 0;
console.log(`  ${finCFTotal > 0 ? '✓' : '✗'} Financing CF: Total absolute=${finCFTotal.toLocaleString()} (should NOT be 0)`);

// Check 4: Interest should exist
const totalInterest = f.totalInterest || 0;
console.log(`  ${totalInterest > 0 ? '✓' : '✗'} Total Interest: ${totalInterest.toLocaleString()} (should be > 0)`);

// Check 5: DSCR should have values
const dscrValues = f.dscr.filter(d => d !== null);
console.log(`  ${dscrValues.length > 0 ? '✓' : '✗'} DSCR: ${dscrValues.length} non-null values`);

console.log("\n═══ TEST COMPLETE ═══\n");
