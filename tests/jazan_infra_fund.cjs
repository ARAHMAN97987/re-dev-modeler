/**
 * صندوق تطوير البنية التحتية — ساحل جازان
 * Jazan Waterfront Infrastructure Development Fund
 *
 * Proof-of-concept validation test.
 *
 * Structure:
 *   - ZAN contributes 302,000 m² land usufruct valued at 150M SAR (GP = 75%)
 *   - Investors contribute 50M SAR cash for infrastructure (LP = 25%)
 *   - 2-year infrastructure development → sell serviced plots for ~300M
 *   - Flat 75/25 profit split (no pref, no carry)
 *   - Expected: both GP and LP get ~1.5x MOIC
 */

const { runFullModel, computeAssetCapex, calcIRR } = require('./helpers/engine.cjs');

// ═══════════════════════════════════════════════════════════
// PROJECT CONFIGURATION
// ═══════════════════════════════════════════════════════════

const LAND_AREA = 302000;          // m²
const LAND_VALUATION = 150000000;  // 150M SAR
const INFRA_COST_PER_SQM = 166;   // 302,000 × 166 ≈ 50.1M
const NET_DEVELOPABLE_PCT = 70;    // 70% of land is sellable (30% roads/public)
const SALE_PRICE_PER_SQM = 1420;  // → 211,400 × 1,420 ≈ 300M
const ABSORPTION_YEARS = 2;
const CONSTRUCTION_MONTHS = 24;

const project = {
  // ── Identity ──
  name: "صندوق تطوير البنية التحتية - ساحل جازان",
  location: "Jazan",
  startYear: 2026,
  horizon: 10,
  currency: "SAR",

  // ── Land: partner contribution ──
  landType: "partner",
  landValuation: LAND_VALUATION,
  landArea: LAND_AREA,
  partnerEquityPct: 75,

  // ── Fund mode ──
  finMode: "fund",
  vehicleType: "fund",

  // ── Exit: hold (revenue comes from Sale asset absorption, NOT terminal exit) ──
  exitStrategy: "hold",
  exitCostPct: 0,

  // ── Costs: zero soft/contingency (costPerSqm is all-in) ──
  softCostPct: 0,
  contingencyPct: 0,

  // ── Waterfall: flat 75/25 split ──
  prefReturnPct: 0,
  gpCatchup: false,
  carryPct: 0,
  lpProfitSplitPct: 25,
  prefAllocation: "proRata",
  catchupMethod: "perYear",

  // ── Performance incentive: disabled ──
  performanceIncentive: false,
  hurdleIRR: 0,
  incentivePct: 0,

  // ── Debt: none ──
  debtAllowed: false,
  maxLtvPct: 0,

  // ── Fees: zero for POC ──
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

  // ── GP investment ──
  gpInvestDevFee: false,
  gpCashInvest: false,

  // ── Phases ──
  phases: [
    { name: "Phase 1", startYearOffset: 0, footprint: LAND_AREA }
  ],

  // ── Assets ──
  assets: [
    {
      id: "infra-1",
      name: "البنية التحتية - طرق ومرافق",
      phase: "Phase 1",
      category: "Infrastructure",
      revType: "Lease",         // Lease with 0 rate = CAPEX-only
      gfa: LAND_AREA,
      costPerSqm: INFRA_COST_PER_SQM,
      efficiency: 0,            // No leasable area → no revenue
      leaseRate: 0,
      opEbitda: 0,
      constrStart: 0,
      constrDuration: CONSTRUCTION_MONTHS,
      rampUpYears: 1,
      stabilizedOcc: 0,
      escalation: 0,
      plotArea: LAND_AREA,
      footprint: 0,
      hotelPL: null,
      marinaPL: null,
    },
    {
      id: "plots-1",
      name: "بيع الأراضي المخدومة",
      phase: "Phase 1",
      category: "Retail",
      revType: "Sale",
      gfa: LAND_AREA,
      costPerSqm: 0,           // No construction cost on plots
      efficiency: NET_DEVELOPABLE_PCT,
      salePricePerSqm: SALE_PRICE_PER_SQM,
      absorptionYears: ABSORPTION_YEARS,
      preSalePct: 0,
      commissionPct: 0,
      constrStart: 0,
      constrDuration: CONSTRUCTION_MONTHS,
      rampUpYears: 1,
      stabilizedOcc: 100,
      escalation: 0,
      plotArea: LAND_AREA,
      footprint: 0,
      hotelPL: null,
      marinaPL: null,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// RUN MODEL
// ═══════════════════════════════════════════════════════════

console.log("══════════════════════════════════════════════════════════════");
console.log("  صندوق تطوير البنية التحتية — ساحل جازان");
console.log("  Jazan Infrastructure Development Fund — Validation Test");
console.log("══════════════════════════════════════════════════════════════\n");

const result = runFullModel(project);
if (!result) { console.error("❌ FATAL: runFullModel returned null"); process.exit(1); }

const { projectResults: r, financing: f, waterfall: w } = result;

// ═══════════════════════════════════════════════════════════
// EXTRACT RESULTS
// ═══════════════════════════════════════════════════════════

const c = r.consolidated;
const totalCapex = c.totalCapex;
const totalRevenue = c.totalIncome;
const totalNetCF = c.totalNetCF;
const unleveredIRR = c.irr;

const fmtM = (n) => (n / 1e6).toFixed(2) + "M";
const fmtPct = (n) => n != null ? (n * 100).toFixed(2) + "%" : "N/A";

// ── Asset-level ──
const infraAsset = r.assetSchedules[0];
const plotsAsset = r.assetSchedules[1];

// ── Fund structure ──
const gpEquity = f ? f.gpEquity : 0;
const lpEquity = f ? f.lpEquity : 0;
const totalEquity = f ? f.totalEquity : 0;

// ── Waterfall ──
const t1 = w ? w.tier1.reduce((s, v) => s + v, 0) : 0;
const t2 = w ? w.tier2.reduce((s, v) => s + v, 0) : 0;
const t3 = w ? w.tier3.reduce((s, v) => s + v, 0) : 0;
const t4LP = w ? w.tier4LP.reduce((s, v) => s + v, 0) : 0;
const t4GP = w ? w.tier4GP.reduce((s, v) => s + v, 0) : 0;
const lpTotalDist = w ? w.lpDist.reduce((s, v) => s + v, 0) : 0;
const gpTotalDist = w ? w.gpDist.reduce((s, v) => s + v, 0) : 0;
const lpCalled = w ? w.lpCalls.reduce((s, v) => s + v, 0) : 0;
const gpCalled = w ? w.gpCalls.reduce((s, v) => s + v, 0) : 0;

const lpMOIC = lpCalled > 0 ? lpTotalDist / lpCalled : 0;
const gpMOIC = gpCalled > 0 ? gpTotalDist / gpCalled : 0;

const lpIRR = w ? w.lpIRR : null;
const gpIRR = w ? w.gpIRR : null;
const gpCashIRR = w ? w.gpCashIRR : null;

// ═══════════════════════════════════════════════════════════
// PRINT RESULTS
// ═══════════════════════════════════════════════════════════

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  المدخلات | INPUTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  الأرض:              ${LAND_AREA.toLocaleString()} م²`);
console.log(`  تقييم حق الانتفاع:  ${fmtM(LAND_VALUATION)}`);
console.log(`  تكلفة البنية التحتية: ${fmtM(LAND_AREA * INFRA_COST_PER_SQM)}`);
console.log(`  صافي المساحة القابلة: ${(LAND_AREA * NET_DEVELOPABLE_PCT / 100).toLocaleString()} م² (${NET_DEVELOPABLE_PCT}%)`);
console.log(`  سعر البيع:          ${SALE_PRICE_PER_SQM.toLocaleString()} ر.س/م²`);
console.log(`  فترة الاستيعاب:     ${ABSORPTION_YEARS} سنوات`);
console.log(`  حصة زان (GP):       75%`);
console.log(`  حصة المستثمرين (LP): 25%`);
console.log();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  النتائج المالية | FINANCIAL RESULTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  إجمالي التكاليف (CAPEX):  ${fmtM(totalCapex)}`);
console.log(`    └ البنية التحتية:       ${fmtM(infraAsset.totalCapex)}`);
console.log(`    └ القطع:                ${fmtM(plotsAsset.totalCapex)}`);
console.log(`  إجمالي الإيرادات:         ${fmtM(totalRevenue)}`);
console.log(`  صافي التدفق:              ${fmtM(totalNetCF)}`);
console.log(`  IRR المشروع (unlevered):  ${fmtPct(unleveredIRR)}`);
console.log();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  هيكل الصندوق | FUND STRUCTURE");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  حقوق ملكية GP (زان):      ${fmtM(gpEquity)} (${(gpEquity / totalEquity * 100).toFixed(1)}%)`);
console.log(`  حقوق ملكية LP (مستثمرين): ${fmtM(lpEquity)} (${(lpEquity / totalEquity * 100).toFixed(1)}%)`);
console.log(`  إجمالي رأس المال:         ${fmtM(totalEquity)}`);
console.log();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  توزيع الأرباح | WATERFALL DISTRIBUTION");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Tier 1 (استرداد رأس المال): ${fmtM(t1)}`);
console.log(`  Tier 2 (عائد تفضيلي):       ${fmtM(t2)}`);
console.log(`  Tier 3 (استدراك GP):         ${fmtM(t3)}`);
console.log(`  Tier 4 LP (حصة الأرباح):    ${fmtM(t4LP)}`);
console.log(`  Tier 4 GP (حصة الأرباح):    ${fmtM(t4GP)}`);
console.log();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  عوائد المستثمرين | INVESTOR RETURNS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  LP استثمر:    ${fmtM(lpCalled)}`);
console.log(`  LP استلم:     ${fmtM(lpTotalDist)}`);
console.log(`  LP MOIC:      ${lpMOIC.toFixed(2)}x`);
console.log(`  LP IRR:       ${fmtPct(lpIRR)}`);
console.log();
console.log(`  GP استثمر:    ${fmtM(gpCalled)} (يشمل ${fmtM(LAND_VALUATION)} حق انتفاع)`);
console.log(`  GP استلم:     ${fmtM(gpTotalDist)}`);
console.log(`  GP MOIC:      ${gpMOIC.toFixed(2)}x`);
console.log(`  GP IRR:       ${fmtPct(gpIRR)}`);
if (gpCashIRR != null) {
  console.log(`  GP Cash IRR:  ${fmtPct(gpCashIRR)} (على الكاش فقط بدون الأرض)`);
}
console.log();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  التدفقات النقدية | CASH FLOW SCHEDULE");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const h = Math.min(6, r.horizon);
let cumCF = 0;
console.log("  السنة  | CAPEX      | إيراد     | صافي      | تراكمي     | LP توزيع  | GP توزيع");
console.log("  ───────┼────────────┼───────────┼───────────┼────────────┼───────────┼──────────");
for (let y = 0; y < h; y++) {
  const cap = c.capex[y] || 0;
  const inc = c.income[y] || 0;
  const net = c.netCF[y] || 0;
  cumCF += net;
  const lpD = w ? (w.lpDist[y] || 0) : 0;
  const gpD = w ? (w.gpDist[y] || 0) : 0;
  console.log(`  ${2026 + y}   | ${fmtM(cap).padStart(10)} | ${fmtM(inc).padStart(9)} | ${fmtM(net).padStart(9)} | ${fmtM(cumCF).padStart(10)} | ${fmtM(lpD).padStart(9)} | ${fmtM(gpD).padStart(9)}`);
}
console.log();

// ═══════════════════════════════════════════════════════════
// ASSERTIONS
// ═══════════════════════════════════════════════════════════

let passed = 0, failed = 0;
const near = (a, b, tol = 0.01) => Math.abs(a - b) / Math.max(1, Math.abs(b)) <= tol;
const nearAbs = (a, b, tol = 1e6) => Math.abs(a - b) <= tol;

function assert(label, condition) {
  if (condition) { passed++; }
  else { failed++; console.log(`  ❌ FAIL: ${label}`); }
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  التحقق | ASSERTIONS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 1. CAPEX ≈ 50M
assert(`CAPEX ≈ 50.1M (actual: ${fmtM(totalCapex)})`, nearAbs(totalCapex, 50132000, 500000));

// 2. Revenue ≈ 300M
assert(`Revenue ≈ 300.2M (actual: ${fmtM(totalRevenue)})`, nearAbs(totalRevenue, 300188000, 1000000));

// 3. Infra asset has no revenue
assert(`Infra revenue = 0 (actual: ${fmtM(infraAsset.totalRevenue)})`, infraAsset.totalRevenue === 0);

// 4. Plots asset has no CAPEX
assert(`Plots CAPEX = 0 (actual: ${fmtM(plotsAsset.totalCapex)})`, plotsAsset.totalCapex === 0);

// 5. GP equity ≈ 75%
assert(`GP equity ≈ 75% (actual: ${(gpEquity / totalEquity * 100).toFixed(1)}%)`, near(gpEquity / totalEquity, 0.75, 0.02));

// 6. LP equity ≈ 25%
assert(`LP equity ≈ 25% (actual: ${(lpEquity / totalEquity * 100).toFixed(1)}%)`, near(lpEquity / totalEquity, 0.25, 0.02));

// 7. No pref return (Tier 2 = 0)
assert(`Tier 2 (pref) = 0 (actual: ${fmtM(t2)})`, Math.abs(t2) < 1);

// 8. No catch-up (Tier 3 = 0)
assert(`Tier 3 (catch-up) = 0 (actual: ${fmtM(t3)})`, Math.abs(t3) < 1);

// 9. LP MOIC ≈ 1.5x
assert(`LP MOIC ≈ 1.5x (actual: ${lpMOIC.toFixed(2)}x)`, near(lpMOIC, 1.5, 0.1));

// 10. GP MOIC ≈ 1.5x
assert(`GP MOIC ≈ 1.5x (actual: ${gpMOIC.toFixed(2)}x)`, near(gpMOIC, 1.5, 0.1));

// 11. LP IRR > 0 (positive return)
assert(`LP IRR > 0% (actual: ${fmtPct(lpIRR)})`, lpIRR != null && lpIRR > 0);

console.log();
console.log(`  ════════════════════════════════════════════════════`);
console.log(`  JAZAN INFRA FUND: ${passed} PASSED | ${failed} FAILED | ${passed + failed} TOTAL`);
console.log(`  ════════════════════════════════════════════════════`);
if (failed === 0) console.log("  🎯 ALL ASSERTIONS PASS");
else console.log("  ⚠ SOME ASSERTIONS FAILED — review model configuration");
console.log();

process.exit(failed > 0 ? 1 : 0);
