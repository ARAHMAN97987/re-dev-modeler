/**
 * صندوق جازان — تحليل الحساسية
 * Jazan Fund — Sensitivity Analysis
 *
 * Tests 5 scenarios with different plot sale prices.
 */

const { runFullModel } = require('./helpers/engine.cjs');

const BASE_PROJECT = {
  name: "صندوق تطوير البنية التحتية - ساحل جازان",
  location: "Jazan", startYear: 2026, horizon: 10, currency: "SAR",
  landType: "partner", landValuation: 150000000, landArea: 302000, partnerEquityPct: 75,
  finMode: "fund", vehicleType: "fund",
  exitStrategy: "hold", exitCostPct: 0,
  softCostPct: 0, contingencyPct: 0,
  prefReturnPct: 0, gpCatchup: false, carryPct: 0, lpProfitSplitPct: 25,
  prefAllocation: "proRata", performanceIncentive: false,
  debtAllowed: false, maxLtvPct: 0,
  subscriptionFeePct: 0, annualMgmtFeePct: 0, developerFeePct: 0,
  structuringFeePct: 0, custodyFeeAnnual: 0, auditorFeeAnnual: 0,
  operatorFeePct: 0, preEstablishmentFee: 0, spvFee: 0, miscExpensePct: 0, upfrontFeePct: 0,
  gpInvestDevFee: false, gpCashInvest: false,
  phases: [{ name: "Phase 1", startYearOffset: 0, footprint: 302000 }],
  assets: [
    { id: "infra-1", name: "البنية التحتية", phase: "Phase 1", category: "Infrastructure",
      revType: "Lease", gfa: 302000, costPerSqm: 166, efficiency: 0, leaseRate: 0,
      constrStart: 0, constrDuration: 24, rampUpYears: 1, stabilizedOcc: 0, escalation: 0,
      plotArea: 302000, footprint: 0, hotelPL: null, marinaPL: null },
    { id: "plots-1", name: "بيع الأراضي", phase: "Phase 1", category: "Retail",
      revType: "Sale", gfa: 302000, costPerSqm: 0, efficiency: 70,
      salePricePerSqm: 1420, absorptionYears: 2, preSalePct: 0, commissionPct: 0,
      constrStart: 0, constrDuration: 24, rampUpYears: 1, stabilizedOcc: 100, escalation: 0,
      plotArea: 302000, footprint: 0, hotelPL: null, marinaPL: null },
  ],
};

const fmtM = (n) => (n / 1e6).toFixed(1) + "M";
const fmtPct = (n) => n != null ? (n * 100).toFixed(1) + "%" : "N/A";

const scenarios = [
  { name: "خسارة | Distressed",    price: 600,  color: "🔴" },
  { name: "متحفظ | Conservative",  price: 800,  color: "🟡" },
  { name: "معتدل | Moderate",      price: 1100, color: "🟡" },
  { name: "أساسي | Base Case",     price: 1420, color: "🟢" },
  { name: "متفائل | Optimistic",   price: 2000, color: "🟢" },
];

console.log("══════════════════════════════════════════════════════════════════════════");
console.log("  صندوق جازان — تحليل الحساسية لسعر بيع الأراضي المخدومة");
console.log("  Jazan Fund — Plot Sale Price Sensitivity Analysis");
console.log("══════════════════════════════════════════════════════════════════════════\n");

console.log("  الأرض: 302,000 م² | صافي قابل للبيع: 211,400 م² (70%)");
console.log("  تكلفة البنية التحتية: 50.1M | حق الانتفاع: 150M | إجمالي: 200.1M");
console.log("  هيكل: GP 75% (زان) / LP 25% (مستثمرين) | بدون عائد تفضيلي\n");

console.log("  ─────────────────────────────────────────────────────────────────────────────────────────");
console.log("  السيناريو                  | سعر/م² | إجمالي بيع | ربح      | LP MOIC | LP IRR  | GP MOIC");
console.log("  ─────────────────────────────────────────────────────────────────────────────────────────");

for (const sc of scenarios) {
  const p = JSON.parse(JSON.stringify(BASE_PROJECT));
  p.assets[1].salePricePerSqm = sc.price;

  const result = runFullModel(p);
  if (!result || !result.waterfall) {
    console.log(`  ${sc.color} ${sc.name.padEnd(26)} | ${String(sc.price).padStart(6)} | ERROR`);
    continue;
  }

  const { projectResults: r, waterfall: w } = result;
  const totalRev = r.consolidated.totalIncome;
  const profit = totalRev - r.consolidated.totalCapex;
  const lpCalled = w.lpCalls.reduce((s, v) => s + v, 0);
  const gpCalled = w.gpCalls.reduce((s, v) => s + v, 0);
  const lpDist = w.lpDist.reduce((s, v) => s + v, 0);
  const gpDist = w.gpDist.reduce((s, v) => s + v, 0);
  const lpMOIC = lpCalled > 0 ? lpDist / lpCalled : 0;
  const gpMOIC = gpCalled > 0 ? gpDist / gpCalled : 0;
  const lpIRR = w.lpIRR;

  console.log(`  ${sc.color} ${sc.name.padEnd(26)} | ${String(sc.price).padStart(6)} | ${fmtM(totalRev).padStart(10)} | ${fmtM(profit).padStart(8)} | ${lpMOIC.toFixed(2).padStart(6)}x | ${fmtPct(lpIRR).padStart(7)} | ${gpMOIC.toFixed(2).padStart(6)}x`);
}

console.log("  ─────────────────────────────────────────────────────────────────────────────────────────");
console.log();

// Break-even analysis
console.log("  ── تحليل نقطة التعادل | Break-Even Analysis ──\n");
let breakEvenPrice = null;
for (let price = 400; price <= 3000; price += 10) {
  const p = JSON.parse(JSON.stringify(BASE_PROJECT));
  p.assets[1].salePricePerSqm = price;
  const result = runFullModel(p);
  if (!result || !result.waterfall) continue;
  const lpCalled = result.waterfall.lpCalls.reduce((s, v) => s + v, 0);
  const lpDist = result.waterfall.lpDist.reduce((s, v) => s + v, 0);
  if (lpDist >= lpCalled && !breakEvenPrice) {
    breakEvenPrice = price;
    break;
  }
}
if (breakEvenPrice) {
  const totalRevBE = 211400 * breakEvenPrice;
  console.log(`  سعر التعادل للمستثمر (LP MOIC = 1.0x): ${breakEvenPrice} ر.س/م²`);
  console.log(`  إجمالي بيع عند التعادل: ${fmtM(totalRevBE)}`);
  console.log(`  أي سعر أقل من ${breakEvenPrice} ر.س/م² = المستثمر يخسر جزء من رأسماله`);
} else {
  console.log("  لم يتم العثور على نقطة التعادل في النطاق 400-3000 ر.س/م²");
}
console.log();
console.log("══════════════════════════════════════════════════════════════════════════");
