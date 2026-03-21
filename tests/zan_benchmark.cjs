/**
 * ZAN Benchmark Test Suite — Push 8 (Layer D)
 * 
 * Validates the financing + waterfall engine against ZAN Fund_ZAN1 Excel values.
 * Every formula was independently verified (mathematically + market conventions)
 * before being accepted as a benchmark target.
 * 
 * Approach:
 *   Part A: Inject ZAN1 exact unlevered CFs → test financing + waterfall (15 metrics)
 *   Part B: Build 6 ZAN1 assets → test project engine produces correct CAPEX/revenue
 * 
 * Run: cd re-dev-modeler && node tests/zan_benchmark.cjs
 */
const E = require('./helpers/engine.cjs');

// ═══ Test Framework ═══
let pass = 0, fail = 0, tests = [], currentSuite = '';
const t = (name, ok, detail) => {
  tests.push({ suite: currentSuite, name, pass: !!ok, detail: detail || '' });
  if (ok) pass++;
  else { fail++; console.log(`  ❌ [${currentSuite}] ${name}: ${detail || ''}`); }
};
const suite = (name) => { currentSuite = name; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const pctNear = (a, b, tolPct) => Math.abs(a - b) <= tolPct;
const sumArr = a => a.reduce((s, v) => s + v, 0);

// Tolerances
const TOL_SAR = 100;       // SAR 100 tolerance for large amounts (rounding in project engine)
const TOL_SAR_STRICT = 1;  // SAR 1 for direct formula outputs
const TOL_PCT = 0.005;     // 0.5% tolerance for IRR
const TOL_MOIC = 0.02;     // 0.02x tolerance for MOIC

// ═══════════════════════════════════════════════════════════════
// ZAN FUND_ZAN1 BENCHMARK DATA (extracted and independently verified)
// ═══════════════════════════════════════════════════════════════

// Capital Structure
const ZAN = {
  gpEquity: 102011929.91,
  lpEquity: 44497965.92,
  totalEquity: 146509895.83,
  gpPct: 0.6962801340535828,
  lpPct: 0.30371986594641726,
  devCostExclLand: 386354389.52,
  devCostInclLand: 488366319.43,
  landCap: 102011929.91,  // = GP Equity = land capitalization for ZAN1
  maxDebt: 341856423.60,
  rate: 0.065,
  tenor: 7,
  grace: 3,
  upfrontFeePct: 0.005,
  fundStartYear: 2027,
  startYear: 2026,
  exitYear: 2033,
  exitMultiple: 10,
  exitCostPct: 0.02,
  prefReturn: 0.15,
  carry: 0.30,
  lpSplit: 0.70,

  // Fees
  subFeePct: 0.02,
  mgmtFeePct: 0.009,
  custodyAnnual: 130000,
  devFeePct: 0.12,
  structFeePct: 0.01,

  // Year-by-year (2026-2033, indexes 0-7)
  income:     [0, 0, 541352.25, 1090824.78375, 16940053.11277552, 32708499.327720463, 48475590.54274562, 64477348.27290896],
  landRent:   [0, 0, 0, 0, 0, 2023557.7372118847, 2023557.7372118847, 2023557.7372118847],  // positive = cost
  capex:      [0, 105869995, 97994050, 182490344.5218402, 0, 0, 0, 0],  // positive = spend
  netCF:      [0, -105869995, -97452697.75, -181399519.73809022, 16940053.11277552, 30684941.59050858, 46452032.80553374, 62453790.53569708],

  // Fund outputs
  totalInterest: 75074899.27,
  totalFees: 74239822.44,
  exitProceeds: 631878013.07,
  cashAvail2033: 602482924.76,

  // Distributions
  lpDistTotal: 206555606.75,
  gpDistTotal: 395927318.02,
  tier1Total: 217142528.77,
  tier2Total: 185461517.37,
  tier3Total: 79483507.45,
  tier4Total: 120395371.18,

  // Returns
  lpIRR: 0.2674,
  gpIRR: 0.2221,
  projIRR: 0.1678,
  lpMOIC_committed: 4.6419,
  gpMOIC_committed: 3.8812,

  // Year-by-year debt
  drawdown:    [0, 93676528.18, 86707686.97, 161472208.45, 0, 0, 0, 0],
  debtBalOpen: [0, 0, 93676528.18, 180384215.15, 341856423.60, 256392317.70, 170928211.80, 85464105.90],
  debtBalClose:[0, 93676528.18, 180384215.15, 341856423.60, 256392317.70, 170928211.80, 85464105.90, 0],
  repayment:   [0, 0, 0, 0, 85464105.90, 85464105.90, 85464105.90, 85464105.90],
  interest:    [0, 3512869.81, 9340512.59, 17780181.80, 19443084.09, 13887917.21, 8332750.33, 2777583.44],

  // Year-by-year fees
  feeSub:     [0, 2930197.92, 0, 0, 0, 0, 0, 0],
  feeMgmt:    [0, 952829.96, 1834776.40, 3477189.51, 3477189.51, 3477189.51, 3477189.51, 3477189.51],
  feeCustody: [0, 130000, 130000, 130000, 130000, 130000, 130000, 130000],
  feeDev:     [0, 12704399.40, 11759286, 21898841.34, 0, 0, 0, 0],
  feeStruct:  [0, 3863543.90, 0, 0, 0, 0, 0, 0],
  fees:       [0, 20580971.17, 13724062.41, 25506030.85, 3607189.51, 3607189.51, 3607189.51, 3607189.51],
  unfundedFees:[0, 20580971.17, 13724062.41, 25506030.85, 3607189.51, 3607189.51, 3607189.51, 0],

  // Equity calls and cash available
  equityCalls: [0, 60728054.67, 50884499.68, 94708405.90, 3607189.51, 3607189.51, 3607189.51, 0],
  cashAvail:   [0, 0, 0, 0, 0, 0, 0, 602482924.76],
  lpNetCF:     [0, -18444316.62, -15454633.42, -28764824.34, -1095575.11, -1095575.11, -1095575.11, 206555606.75],
  gpNetCF:     [0, -42283738.05, -35429866.26, -65943581.55, -2511614.39, -2511614.39, -2511614.39, 395927318.02],
};

// ═══════════════════════════════════════════════════════════════
// PART A: FINANCING + WATERFALL ENGINE (injected cash flows)
// ═══════════════════════════════════════════════════════════════
// Build a project dataset that matches ZAN1 structure, then inject
// exact cash flow arrays as "project results" to isolate financing/waterfall testing.

const HORIZON = 50; // Match ZAN project horizon

// Pad ZAN arrays to full horizon
function padTo(arr, len, fill = 0) {
  const result = [...arr];
  while (result.length < len) result.push(fill);
  return result;
}

// Build mock project results matching ZAN1 cash flows
const zanProjectResults = {
  consolidated: {
    income: padTo(ZAN.income, HORIZON),
    landRent: padTo(ZAN.landRent, HORIZON),
    capex: padTo(ZAN.capex, HORIZON),
    netCF: padTo(ZAN.netCF, HORIZON),
    totalCapex: sumArr(ZAN.capex),
    irr: ZAN.projIRR,
  },
  assetSchedules: [], // No per-asset schedules needed for fund-level test
};

// Build project config matching ZAN Fund_ZAN1
const zanProject = {
  id: 'zan-benchmark', name: 'ZAN Benchmark', horizon: HORIZON, startYear: 2026,
  landType: 'lease',
  // ZAN1 land allocation: 302,473 total × (32,498/96,359) = ZAN1 section area
  // Land cap = area × SAR 1,000/sqm = GP Equity
  landArea: 302473 * 32498 / 96359,  // Exact ZAN1 footprint ratio
  landRentAnnual: 6000000 * 0.33725962286864747,  // ZAN1 share of total 6M rent
  landRentEscalation: 5, landRentEscalationEveryN: 5,
  landRentGrace: 5, landRentTerm: 50,
  landCapitalize: true,
  landCapRate: 1000,  // SAR/sqm → landCap = 102,012 × 1,000 ≈ 102,011,930
  landCapTo: 'gp',
  landRentPaidBy: 'project',  // ZAN: land rent is in project CF, not charged at fund level
  softCostPct: 10, contingencyPct: 5,
  rentEscalation: 0.75, activeScenario: 'Base Case',
  phases: [{ name: 'ZAN 1' }],
  assets: [], // Not needed for Part A

  // Financing
  finMode: 'fund', vehicleType: 'fund',
  debtAllowed: true, maxLtvPct: 70,
  financeRate: 6.5, loanTenor: 7, debtGrace: 3,
  upfrontFeePct: 0.5, repaymentType: 'amortizing',
  graceBasis: 'fundStart', fundStartYear: 2027,

  // GP/LP - manual equity to match ZAN exactly
  gpEquityManual: ZAN.gpEquity,
  lpEquityManual: ZAN.lpEquity,

  // Exit
  exitStrategy: 'sale', exitYear: 2033,
  exitMultiple: 10, exitCostPct: 2,

  // Waterfall
  prefReturnPct: 15, gpCatchup: true, carryPct: 30, lpProfitSplitPct: 70,
  prefAllocation: 'proRata', catchupMethod: 'perYear',
  feeTreatment: 'capital',

  // Fees
  subscriptionFeePct: 2, annualMgmtFeePct: 0.9, custodyFeeAnnual: 130000,
  developerFeePct: 12, structuringFeePct: 1, mgmtFeeBase: 'deployed',

  // Incentives disabled
  incentives: {
    capexGrant: { enabled: false },
    financeSupport: { enabled: false },
    landRentRebate: { enabled: false },
    feeRebates: { enabled: false },
  },
};

// ── Run Financing Engine ──
suite('BM-A1: Financing Engine');
const fin = E.computeFinancing(zanProject, zanProjectResults, null);

if (!fin) {
  t('Financing engine returned result', false, 'computeFinancing returned null');
} else {
  // Capital Structure
  t('Total Equity', near(fin.totalEquity, ZAN.totalEquity, TOL_SAR),
    `got=${fin.totalEquity.toFixed(0)} exp=${ZAN.totalEquity.toFixed(0)}`);
  t('GP Equity', near(fin.gpEquity, ZAN.gpEquity, TOL_SAR),
    `got=${fin.gpEquity.toFixed(0)} exp=${ZAN.gpEquity.toFixed(0)}`);
  t('LP Equity', near(fin.lpEquity, ZAN.lpEquity, TOL_SAR),
    `got=${fin.lpEquity.toFixed(0)} exp=${ZAN.lpEquity.toFixed(0)}`);

  // Debt
  t('Total Debt Drawn', near(fin.totalDebt, ZAN.maxDebt, TOL_SAR),
    `got=${fin.totalDebt.toFixed(0)} exp=${ZAN.maxDebt.toFixed(0)}`);
  t('Total Interest', near(fin.totalInterest, ZAN.totalInterest, TOL_SAR),
    `got=${fin.totalInterest.toFixed(0)} exp=${ZAN.totalInterest.toFixed(0)}`);

  // Year-by-year debt schedule (first 8 years)
  for (let y = 0; y < 8; y++) {
    const yr = 2026 + y;
    t(`Drawdown ${yr}`, near(fin.drawdown[y], ZAN.drawdown[y], TOL_SAR_STRICT),
      `got=${fin.drawdown[y].toFixed(0)} exp=${ZAN.drawdown[y].toFixed(0)}`);
    t(`Interest ${yr}`, near(fin.interest[y], ZAN.interest[y], TOL_SAR_STRICT),
      `got=${fin.interest[y].toFixed(0)} exp=${ZAN.interest[y].toFixed(0)}`);
    t(`DebtBalClose ${yr}`, near(fin.debtBalClose[y], ZAN.debtBalClose[y], TOL_SAR_STRICT),
      `got=${fin.debtBalClose[y].toFixed(0)} exp=${ZAN.debtBalClose[y].toFixed(0)}`);
  }

  // Exit
  t('Exit Proceeds', near(fin.exitProceeds[7], ZAN.exitProceeds, TOL_SAR_STRICT),
    `got=${fin.exitProceeds[7].toFixed(0)} exp=${ZAN.exitProceeds.toFixed(0)}`);

  // Grace / Repayment timing
  t('Repay Start Index', fin.repayStart === 4, `got=${fin.repayStart} exp=4 (year 2030)`);
  t('Debt zero at exit', fin.debtBalClose[7] < 1, `bal=${fin.debtBalClose[7].toFixed(0)}`);
}

// ── Run Waterfall Engine ──
suite('BM-A2: Waterfall Engine');
const wf = E.computeWaterfall(zanProject, zanProjectResults, fin, null);

if (!wf) {
  t('Waterfall engine returned result', false, 'computeWaterfall returned null');
} else {
  // Total Fees
  t('Total Fees', near(wf.totalFees, ZAN.totalFees, TOL_SAR),
    `got=${wf.totalFees.toFixed(0)} exp=${ZAN.totalFees.toFixed(0)}`);

  // Year-by-year fee breakdown (years 1-7 = fund active period)
  suite('BM-A3: Fee Schedule');
  for (let y = 1; y <= 7; y++) {
    const yr = 2026 + y;
    t(`MgmtFee ${yr}`, near(wf.feeMgmt[y], ZAN.feeMgmt[y], TOL_SAR_STRICT),
      `got=${wf.feeMgmt[y].toFixed(0)} exp=${ZAN.feeMgmt[y].toFixed(0)}`);
  }
  t('SubFee 2027', near(wf.feeSub[1], ZAN.feeSub[1], TOL_SAR_STRICT),
    `got=${wf.feeSub[1].toFixed(0)} exp=${ZAN.feeSub[1].toFixed(0)}`);
  t('StructFee 2027', near(wf.feeStruct[1], ZAN.feeStruct[1], TOL_SAR_STRICT),
    `got=${wf.feeStruct[1].toFixed(0)} exp=${ZAN.feeStruct[1].toFixed(0)}`);

  // Unfunded Fees
  suite('BM-A4: Unfunded Fees');
  for (let y = 1; y <= 7; y++) {
    const yr = 2026 + y;
    t(`UF ${yr}`, near(wf.unfundedFees[y], ZAN.unfundedFees[y], TOL_SAR),
      `got=${wf.unfundedFees[y].toFixed(0)} exp=${ZAN.unfundedFees[y].toFixed(0)}`);
  }

  // Equity Calls
  suite('BM-A5: Equity Calls');
  for (let y = 1; y <= 7; y++) {
    const yr = 2026 + y;
    t(`EqCall ${yr}`, near(wf.equityCalls[y], ZAN.equityCalls[y], TOL_SAR),
      `got=${wf.equityCalls[y].toFixed(0)} exp=${ZAN.equityCalls[y].toFixed(0)}`);
  }
  const totalEqCalls = sumArr(wf.equityCalls);
  t('Total Equity Calls', near(totalEqCalls, ZAN.tier1Total, TOL_SAR),
    `got=${totalEqCalls.toFixed(0)} exp=${ZAN.tier1Total.toFixed(0)}`);

  // Cash Available
  suite('BM-A6: Cash Available');
  t('CashAvail 2033', near(wf.cashAvail[7], ZAN.cashAvail2033, TOL_SAR),
    `got=${wf.cashAvail[7].toFixed(0)} exp=${ZAN.cashAvail2033.toFixed(0)}`);
  // Construction years should be 0
  for (let y = 0; y <= 6; y++) {
    t(`CashAvail ${2026+y} = 0`, wf.cashAvail[y] < 1,
      `got=${wf.cashAvail[y].toFixed(0)}`);
  }

  // Waterfall Tiers
  suite('BM-A7: Waterfall Tiers');
  const t1Total = sumArr(wf.tier1);
  const t2Total = sumArr(wf.tier2);
  const t3Total = sumArr(wf.tier3);
  const t4Total = sumArr(wf.tier4LP) + sumArr(wf.tier4GP);

  t('Tier 1 (ROC)', near(t1Total, ZAN.tier1Total, TOL_SAR),
    `got=${t1Total.toFixed(0)} exp=${ZAN.tier1Total.toFixed(0)}`);
  t('Tier 2 (Pref)', near(t2Total, ZAN.tier2Total, TOL_SAR),
    `got=${t2Total.toFixed(0)} exp=${ZAN.tier2Total.toFixed(0)}`);
  t('Tier 3 (Catchup)', near(t3Total, ZAN.tier3Total, TOL_SAR),
    `got=${t3Total.toFixed(0)} exp=${ZAN.tier3Total.toFixed(0)}`);
  t('Tier 4 (Split)', near(t4Total, ZAN.tier4Total, TOL_SAR),
    `got=${t4Total.toFixed(0)} exp=${ZAN.tier4Total.toFixed(0)}`);

  // Verify T3 formula: MIN(remaining, T2 × carry/(1-carry))
  const remaining2033 = wf.cashAvail[7] - wf.tier1[7] - wf.tier2[7];
  const expectedT3 = Math.min(remaining2033, wf.tier2[7] * 0.30 / 0.70);
  t('T3 formula correct', near(wf.tier3[7], expectedT3, TOL_SAR_STRICT),
    `got=${wf.tier3[7].toFixed(0)} formula=${expectedT3.toFixed(0)}`);

  // Distributions
  suite('BM-A8: Distributions');
  t('LP Total Dist', near(wf.lpTotalDist, ZAN.lpDistTotal, TOL_SAR),
    `got=${wf.lpTotalDist.toFixed(0)} exp=${ZAN.lpDistTotal.toFixed(0)}`);
  t('GP Total Dist', near(wf.gpTotalDist, ZAN.gpDistTotal, TOL_SAR),
    `got=${wf.gpTotalDist.toFixed(0)} exp=${ZAN.gpDistTotal.toFixed(0)}`);
  t('Dist = CashAvail', near(wf.lpTotalDist + wf.gpTotalDist, wf.cashAvail[7], TOL_SAR_STRICT),
    `dist=${(wf.lpTotalDist + wf.gpTotalDist).toFixed(0)} ca=${wf.cashAvail[7].toFixed(0)}`);

  // proRata allocation check: LP = (T1+T2)*LP% + T4_LP
  const calcLPDist = (t1Total + t2Total) * wf.lpPct + sumArr(wf.tier4LP);
  t('proRata LP allocation', near(wf.lpTotalDist, calcLPDist, TOL_SAR_STRICT),
    `got=${wf.lpTotalDist.toFixed(0)} formula=${calcLPDist.toFixed(0)}`);

  // LP Net Cash Flow
  suite('BM-A9: LP/GP Net Cash Flow');
  for (let y = 1; y <= 7; y++) {
    const yr = 2026 + y;
    t(`LP NCF ${yr}`, near(wf.lpNetCF[y], ZAN.lpNetCF[y], TOL_SAR),
      `got=${wf.lpNetCF[y].toFixed(0)} exp=${ZAN.lpNetCF[y].toFixed(0)}`);
  }

  // Returns
  suite('BM-A10: Returns');
  t('LP IRR', pctNear(wf.lpIRR, ZAN.lpIRR, TOL_PCT),
    `got=${(wf.lpIRR * 100).toFixed(2)}% exp=${(ZAN.lpIRR * 100).toFixed(2)}%`);
  t('GP IRR', pctNear(wf.gpIRR, ZAN.gpIRR, TOL_PCT),
    `got=${(wf.gpIRR * 100).toFixed(2)}% exp=${(ZAN.gpIRR * 100).toFixed(2)}%`);

  // MOIC - ZAN uses committed equity (original equity, not total called)
  t('LP MOIC (committed)', near(wf.lpCommittedMOIC, ZAN.lpMOIC_committed, TOL_MOIC),
    `got=${wf.lpCommittedMOIC.toFixed(4)} exp=${ZAN.lpMOIC_committed.toFixed(4)}`);
  t('GP MOIC (committed)', near(wf.gpCommittedMOIC, ZAN.gpMOIC_committed, TOL_MOIC),
    `got=${wf.gpCommittedMOIC.toFixed(4)} exp=${ZAN.gpMOIC_committed.toFixed(4)}`);
}

// ═══════════════════════════════════════════════════════════════
// PART B: PROJECT ENGINE (6 ZAN1 assets)
// ═══════════════════════════════════════════════════════════════
// Test that the project engine produces correct CAPEX from ZAN1 asset data.

suite('BM-B1: Project Engine CAPEX');
{
  // 6 ZAN1 assets with exact parameters from ZAN Project Model
  const zan1Assets = [
    {
      id: 'hotel', phase: 'ZAN 1', category: 'Hospitality', name: 'Hotel', code: 'H',
      gfa: 16577, footprint: 2072, plotArea: 5133,
      revType: 'Operating', efficiency: 0, leaseRate: 0,
      opEbitda: 13901056.63, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 100,
      costPerSqm: 8000, constrStart: 2, constrDuration: 36,
    },
    {
      id: 'retail-sport', phase: 'ZAN 1', category: 'Retail', name: 'Retail - Sport Complex', code: 'S',
      gfa: 6000, footprint: 6000, plotArea: 6000,
      revType: 'Lease', efficiency: 100, leaseRate: 173, leasableArea: 6000,
      opEbitda: 0, escalation: 0.75, rampUpYears: 3, stabilizedOcc: 90,
      costPerSqm: 240, constrStart: 2, constrDuration: 6,
    },
    {
      id: 'parking', phase: 'ZAN 1', category: 'Utilities', name: 'Parking & Landscaping ZAN1', code: 'NA',
      gfa: 69513.9299079484, footprint: 0, plotArea: 0,
      revType: 'Lease', efficiency: 0, leaseRate: 0, leasableArea: 0,
      opEbitda: 0, escalation: 0.75, rampUpYears: 1, stabilizedOcc: 0,
      costPerSqm: 500, constrStart: 4, constrDuration: 12,
    },
    {
      id: 'fuel', phase: 'ZAN 1', category: 'Retail', name: 'Fuel Station', code: 'F',
      gfa: 3586, footprint: 3586, plotArea: 6920,
      revType: 'Lease', efficiency: 30, leaseRate: 900, leasableArea: 1075.8,
      opEbitda: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 95,
      costPerSqm: 1500, constrStart: 2, constrDuration: 12,
    },
    {
      id: 'marina', phase: 'ZAN 1', category: 'Marina', name: 'Marina Berths', code: 'MAR',
      gfa: 2400, footprint: 0, plotArea: 3000,
      revType: 'Operating', efficiency: 0, leaseRate: 0,
      opEbitda: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 90,
      costPerSqm: 16000, constrStart: 4, constrDuration: 12,
    },
    {
      id: 'marina-mall', phase: 'ZAN 1', category: 'Retail', name: 'Marina Mall', code: 'C1',
      gfa: 31260, footprint: 20840, plotArea: 28947,
      revType: 'Lease', efficiency: 80, leaseRate: 2100, leasableArea: 25008,
      opEbitda: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 90,
      costPerSqm: 3900, constrStart: 2, constrDuration: 30,
    },
  ];

  // Expected CAPEX per asset: GFA × cost/sqm × 1.10 (soft) × 1.05 (contingency)
  const expectedCapex = {
    hotel: 16577 * 8000 * 1.10 * 1.05,       // 153,171,480
    'retail-sport': 6000 * 240 * 1.10 * 1.05,   // 1,663,200
    parking: 69513.9299079484 * 500 * 1.10 * 1.05, // 40,144,295
    fuel: 3586 * 1500 * 1.10 * 1.05,            // 6,212,745
    marina: 2400 * 16000 * 1.10 * 1.05,         // 44,352,000
    'marina-mall': 31260 * 3900 * 1.10 * 1.05,  // 140,810,670
  };

  const zanProjectB = {
    horizon: HORIZON, startYear: 2026, softCostPct: 10, contingencyPct: 5,
    activeScenario: 'Base Case',
  };

  // Test each asset's CAPEX
  for (const asset of zan1Assets) {
    const capex = E.computeAssetCapex(asset, zanProjectB);
    const expected = expectedCapex[asset.id];
    t(`CAPEX ${asset.name}`, near(capex, expected, 1),
      `got=${capex.toFixed(0)} exp=${expected.toFixed(0)}`);
  }

  // Test total CAPEX
  const totalCapex = zan1Assets.reduce((s, a) => s + E.computeAssetCapex(a, zanProjectB), 0);
  t('Total CAPEX (6 assets)', near(totalCapex, ZAN.devCostExclLand, TOL_SAR),
    `got=${totalCapex.toFixed(0)} exp=${ZAN.devCostExclLand.toFixed(0)}`);
}

// ═══════════════════════════════════════════════════════════════
// PART C: CROSS-CHECKS (financial sanity)
// ═══════════════════════════════════════════════════════════════
suite('BM-C1: Financial Sanity Checks');
if (fin && wf) {
  // Sources = Uses
  t('Sources = Uses (Equity + Debt = DevCostInclLand)',
    near(fin.totalEquity + fin.totalDebt, fin.devCostInclLand, TOL_SAR),
    `eq=${fin.totalEquity.toFixed(0)} debt=${fin.totalDebt.toFixed(0)} total=${(fin.totalEquity+fin.totalDebt).toFixed(0)} devCost=${fin.devCostInclLand.toFixed(0)}`);

  // LTV check
  const ltv = fin.totalDebt / fin.devCostInclLand;
  t('LTV = 70%', near(ltv, 0.70, 0.001), `got=${(ltv*100).toFixed(2)}%`);

  // GP% + LP% = 100%
  t('GP% + LP% = 100%', near(fin.gpPct + fin.lpPct, 1.0, 0.0001),
    `${(fin.gpPct*100).toFixed(2)}% + ${(fin.lpPct*100).toFixed(2)}%`);

  // Total distributions = Cash available
  t('Total Dist = Cash Available',
    near(wf.lpTotalDist + wf.gpTotalDist, sumArr(wf.cashAvail), TOL_SAR),
    `dist=${(wf.lpTotalDist+wf.gpTotalDist).toFixed(0)} ca=${sumArr(wf.cashAvail).toFixed(0)}`);

  // Waterfall integrity: T1 + T2 + T3 + T4 = Cash Available
  const tierSum = sumArr(wf.tier1) + sumArr(wf.tier2) + sumArr(wf.tier3) + sumArr(wf.tier4LP) + sumArr(wf.tier4GP);
  t('Tiers sum = Cash Available', near(tierSum, sumArr(wf.cashAvail), TOL_SAR_STRICT),
    `tiers=${tierSum.toFixed(0)} ca=${sumArr(wf.cashAvail).toFixed(0)}`);

  // Debt fully repaid by exit
  t('Debt = 0 at exit', fin.debtBalClose[7] < 1, `bal=${fin.debtBalClose[7].toFixed(0)}`);

  // Unreturned capital = 0 after exit distribution
  t('Unreturned = 0 after exit', wf.unreturnedClose[7] < 1,
    `unreturned=${wf.unreturnedClose[7].toFixed(0)}`);

  // LP net CF positive overall (profitable investment)
  const lpTotal = sumArr(wf.lpNetCF);
  t('LP net positive (profitable)', lpTotal > 0, `total=${lpTotal.toFixed(0)}`);

  // GP net CF positive overall
  const gpTotal = sumArr(wf.gpNetCF);
  t('GP net positive (profitable)', gpTotal > 0, `total=${gpTotal.toFixed(0)}`);

  // MOIC > 1 (return exceeds investment)
  t('LP MOIC > 1', wf.lpCommittedMOIC > 1, `${wf.lpCommittedMOIC.toFixed(2)}`);
  t('GP MOIC > 1', wf.gpCommittedMOIC > 1, `${wf.gpCommittedMOIC.toFixed(2)}`);

  // LP IRR > pref rate (investment beats hurdle)
  t('LP IRR > Pref Rate', wf.lpIRR > 0.15, `IRR=${(wf.lpIRR*100).toFixed(2)}% pref=15%`);
}

// ═══════════════════════════════════════════════════════════════
// PART D: PER-PHASE ENGINE SYNC (Push 9)
// Single-phase project through independent path must match consolidated.
// ═══════════════════════════════════════════════════════════════
suite('BM-D1: Per-Phase Engine Sync');
{
  // Build projectResults with phaseResults so the per-phase path can run
  const zanPRWithPhases = {
    ...zanProjectResults,
    phaseResults: {
      'ZAN 1': {
        income: padTo(ZAN.income, HORIZON),
        landRent: padTo(ZAN.landRent, HORIZON),
        capex: padTo(ZAN.capex, HORIZON),
        netCF: padTo(ZAN.netCF, HORIZON),
        totalCapex: sumArr(ZAN.capex),
        totalIncome: sumArr(ZAN.income),
        totalLandRent: sumArr(ZAN.landRent),
        totalNetCF: sumArr(ZAN.netCF),
        irr: ZAN.projIRR,
        allocPct: 1.0,  // Single phase = 100%
      },
    },
    startYear: 2026,
    horizon: HORIZON,
  };

  // Run per-phase path
  const indep = E.computeIndependentPhaseResults(zanProject, zanPRWithPhases, null);

  if (!indep || !indep.phaseFinancings['ZAN 1']) {
    t('Per-phase financing computed', false, 'computeIndependentPhaseResults returned no ZAN 1');
  } else {
    const pFin = indep.phaseFinancings['ZAN 1'];
    const pWf = indep.phaseWaterfalls['ZAN 1'];
    const aggFin = indep.consolidatedFinancing;
    const aggWf = indep.consolidatedWaterfall;

    // Phase financing must match consolidated
    t('Phase Fin: Total Equity', near(pFin.totalEquity, fin.totalEquity, TOL_SAR),
      `phase=${pFin.totalEquity.toFixed(0)} consol=${fin.totalEquity.toFixed(0)}`);
    t('Phase Fin: Total Debt', near(pFin.totalDebt, fin.totalDebt, TOL_SAR),
      `phase=${pFin.totalDebt.toFixed(0)} consol=${fin.totalDebt.toFixed(0)}`);
    t('Phase Fin: Total Interest', near(pFin.totalInterest, fin.totalInterest, TOL_SAR),
      `phase=${pFin.totalInterest.toFixed(0)} consol=${fin.totalInterest.toFixed(0)}`);

    if (pWf) {
      t('Per-phase waterfall computed', true);
      // Phase waterfall must match consolidated
      t('Phase WF: Total Fees', near(pWf.totalFees, wf.totalFees, TOL_SAR),
        `phase=${pWf.totalFees.toFixed(0)} consol=${wf.totalFees.toFixed(0)}`);
      t('Phase WF: LP Dist', near(pWf.lpTotalDist, wf.lpTotalDist, TOL_SAR),
        `phase=${pWf.lpTotalDist.toFixed(0)} consol=${wf.lpTotalDist.toFixed(0)}`);
      t('Phase WF: GP Dist', near(pWf.gpTotalDist, wf.gpTotalDist, TOL_SAR),
        `phase=${pWf.gpTotalDist.toFixed(0)} consol=${wf.gpTotalDist.toFixed(0)}`);
      t('Phase WF: LP IRR', pctNear(pWf.lpIRR, wf.lpIRR, TOL_PCT),
        `phase=${(pWf.lpIRR*100).toFixed(2)}% consol=${(wf.lpIRR*100).toFixed(2)}%`);
      t('Phase WF: GP IRR', pctNear(pWf.gpIRR, wf.gpIRR, TOL_PCT),
        `phase=${(pWf.gpIRR*100).toFixed(2)}% consol=${(wf.gpIRR*100).toFixed(2)}%`);
      t('Phase WF: CashAvail 2033', near(pWf.cashAvail[7], wf.cashAvail[7], TOL_SAR),
        `phase=${pWf.cashAvail[7].toFixed(0)} consol=${wf.cashAvail[7].toFixed(0)}`);
      // Unfunded fees should also match
      const pUFTotal = pWf.unfundedFees.reduce((a,b)=>a+b,0);
      const cUFTotal = wf.unfundedFees.reduce((a,b)=>a+b,0);
      t('Phase WF: Unfunded Fees', near(pUFTotal, cUFTotal, TOL_SAR),
        `phase=${pUFTotal.toFixed(0)} consol=${cUFTotal.toFixed(0)}`);
    } else {
      t('Per-phase waterfall computed', false, 'No waterfall for ZAN 1');
    }

    // Aggregated results should also match (single phase = consolidated)
    if (aggFin) {
      t('Agg Fin: Total Equity', near(aggFin.totalEquity, fin.totalEquity, TOL_SAR),
        `agg=${aggFin.totalEquity.toFixed(0)} consol=${fin.totalEquity.toFixed(0)}`);
      t('Agg Fin: Total Debt', near(aggFin.totalDebt, fin.totalDebt, TOL_SAR),
        `agg=${aggFin.totalDebt.toFixed(0)} consol=${fin.totalDebt.toFixed(0)}`);
    }
    if (aggWf) {
      t('Agg WF: LP Dist', near(aggWf.lpTotalDist, wf.lpTotalDist, TOL_SAR),
        `agg=${aggWf.lpTotalDist.toFixed(0)} consol=${wf.lpTotalDist.toFixed(0)}`);
      t('Agg WF: GP Dist', near(aggWf.gpTotalDist, wf.gpTotalDist, TOL_SAR),
        `agg=${aggWf.gpTotalDist.toFixed(0)} consol=${wf.gpTotalDist.toFixed(0)}`);
      // Committed MOIC fields exist
      t('Agg WF: lpCommittedMOIC exists', typeof aggWf.lpCommittedMOIC === 'number',
        `type=${typeof aggWf.lpCommittedMOIC}`);
      t('Agg WF: gpCommittedMOIC exists', typeof aggWf.gpCommittedMOIC === 'number',
        `type=${typeof aggWf.gpCommittedMOIC}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PART E: PER-TRANCHE GRACE (Push 10)
// ═══════════════════════════════════════════════════════════════

suite('BM-E1: Per-Tranche Mode - Hand-Checkable');
{
  // Simple scenario: 3 draws over 3 years, grace 3yr per draw, repay 4yr
  // Facility 100M: 30M yr1 + 40M yr2 + 30M yr3
  const trancheProject = {
    horizon: 15, startYear: 2026,
    landType: 'purchase', landPurchasePrice: 0, landArea: 0,
    softCostPct: 0, contingencyPct: 0,
    activeScenario: 'Base Case',
    phases: [{ name: 'P1' }],
    assets: [],
    finMode: 'debt', debtAllowed: true, maxLtvPct: 100,
    financeRate: 10, loanTenor: 7, debtGrace: 3,
    upfrontFeePct: 0, repaymentType: 'amortizing',
    graceBasis: 'firstDraw',
    debtTrancheMode: 'perDraw',
    exitStrategy: 'hold',
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false }, landRentRebate: { enabled: false }, feeRebates: { enabled: false } },
  };

  // 3 draws: Y0=30M, Y1=40M, Y2=30M (CAPEX in years 0,1,2)
  const trCapex = [30000000, 40000000, 30000000, ...new Array(12).fill(0)];
  const trIncome = [0, 0, 0, 0, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000];
  const trNetCF = trCapex.map((c, i) => (trIncome[i] || 0) - c);

  const trResults = {
    consolidated: {
      income: trIncome,
      landRent: new Array(15).fill(0),
      capex: trCapex,
      netCF: trNetCF,
      totalCapex: 100000000,
      irr: 0,
    },
    assetSchedules: [],
  };

  const trFin = E.computeFinancing(trancheProject, trResults, null);

  if (!trFin) {
    t('perDraw financing computed', false, 'returned null');
  } else {
    // Basic checks
    t('trancheMode = perDraw', trFin.trancheMode === 'perDraw');
    t('tranches array exists', Array.isArray(trFin.tranches) && trFin.tranches.length === 3,
      `count=${trFin.tranches?.length}`);
    t('Total debt = 100M', near(trFin.totalDebt, 100000000, 1));

    // Tranche 1: 30M drawn Y0, grace 3yr → repay starts Y3
    // Annual repay = 30M/4 = 7.5M, repay Y3-Y6
    const tr1 = trFin.tranches[0];
    t('Tr1: amount=30M', near(tr1.amount, 30000000, 1));
    t('Tr1: drawYear=0', tr1.drawYear === 0);
    t('Tr1: repayStart=3', tr1.repayStart === 3);
    t('Tr1: annualRepay=7.5M', near(tr1.annualRepay, 7500000, 1));
    // Tr1 balance: Y0=30M, Y1=30M, Y2=30M, Y3=22.5M, Y4=15M, Y5=7.5M, Y6=0
    t('Tr1: balClose Y0=30M', near(tr1.balClose[0], 30000000, 1));
    t('Tr1: balClose Y2=30M', near(tr1.balClose[2], 30000000, 1));
    t('Tr1: balClose Y3=22.5M', near(tr1.balClose[3], 22500000, 1));
    t('Tr1: balClose Y6=0', tr1.balClose[6] < 1);

    // Tranche 2: 40M drawn Y1, grace 3yr → repay starts Y4
    const tr2 = trFin.tranches[1];
    t('Tr2: amount=40M', near(tr2.amount, 40000000, 1));
    t('Tr2: repayStart=4', tr2.repayStart === 4);
    t('Tr2: annualRepay=10M', near(tr2.annualRepay, 10000000, 1));
    t('Tr2: balClose Y1=40M', near(tr2.balClose[1], 40000000, 1));
    t('Tr2: balClose Y4=30M', near(tr2.balClose[4], 30000000, 1));
    t('Tr2: balClose Y7=0', tr2.balClose[7] < 1);

    // Tranche 3: 30M drawn Y2, grace 3yr → repay starts Y5
    const tr3 = trFin.tranches[2];
    t('Tr3: amount=30M', near(tr3.amount, 30000000, 1));
    t('Tr3: repayStart=5', tr3.repayStart === 5);
    t('Tr3: balClose Y5=22.5M', near(tr3.balClose[5], 22500000, 1));
    t('Tr3: balClose Y8=0', tr3.balClose[8] < 1);

    // Aggregated schedule checks
    // Y3: only Tr1 repays (7.5M)
    t('Agg repay Y3=7.5M (Tr1 only)', near(trFin.repayment[3], 7500000, 1),
      `got=${trFin.repayment[3].toFixed(0)}`);
    // Y4: Tr1 (7.5M) + Tr2 (10M) = 17.5M
    t('Agg repay Y4=17.5M (Tr1+Tr2)', near(trFin.repayment[4], 17500000, 1),
      `got=${trFin.repayment[4].toFixed(0)}`);
    // Y5: Tr1 (7.5M) + Tr2 (10M) + Tr3 (7.5M) = 25M
    t('Agg repay Y5=25M (all 3)', near(trFin.repayment[5], 25000000, 1),
      `got=${trFin.repayment[5].toFixed(0)}`);
    // Y6: Tr1 last (7.5M) + Tr2 (10M) + Tr3 (7.5M) = 25M
    t('Agg repay Y6=25M', near(trFin.repayment[6], 25000000, 1),
      `got=${trFin.repayment[6].toFixed(0)}`);
    // Y7: Tr2 last (10M) + Tr3 (7.5M) = 17.5M
    t('Agg repay Y7=17.5M (Tr2+Tr3)', near(trFin.repayment[7], 17500000, 1),
      `got=${trFin.repayment[7].toFixed(0)}`);
    // Y8: Tr3 last (7.5M)
    t('Agg repay Y8=7.5M (Tr3 only)', near(trFin.repayment[8], 7500000, 1),
      `got=${trFin.repayment[8].toFixed(0)}`);
    // Y9+: no repayment
    t('Agg repay Y9=0', trFin.repayment[9] < 1);

    // Total repaid = 100M
    const totalRepaid = trFin.repayment.reduce((a, b) => a + b, 0);
    t('Total repaid = 100M', near(totalRepaid, 100000000, 1),
      `got=${totalRepaid.toFixed(0)}`);

    // Interest check: Y0 Tr1 only → (0+30M)/2 × 10% = 1.5M
    t('Agg interest Y0=1.5M', near(trFin.originalInterest[0], 1500000, 1),
      `got=${trFin.originalInterest[0].toFixed(0)}`);
    // Y2: all 3 tranches have balance → sum of averages × 10%
    // Tr1: (30+30)/2 × 0.1 = 3M, Tr2: (40+40)/2 × 0.1 = 4M, Tr3: (0+30)/2 × 0.1 = 1.5M = 8.5M
    t('Agg interest Y2=8.5M', near(trFin.originalInterest[2], 8500000, 1),
      `got=${trFin.originalInterest[2].toFixed(0)}`);

    // Debt fully repaid by Y8
    t('Debt = 0 at Y8', trFin.debtBalClose[8] < 1,
      `bal=${trFin.debtBalClose[8].toFixed(0)}`);
  }
}

suite('BM-E2: Single vs PerDraw Comparison');
{
  // Same project, single mode - verify it gives different results
  const singleProject = {
    horizon: 15, startYear: 2026,
    landType: 'purchase', landPurchasePrice: 0, landArea: 0,
    softCostPct: 0, contingencyPct: 0,
    activeScenario: 'Base Case',
    phases: [{ name: 'P1' }],
    finMode: 'debt', debtAllowed: true, maxLtvPct: 100,
    financeRate: 10, loanTenor: 7, debtGrace: 3,
    upfrontFeePct: 0, repaymentType: 'amortizing',
    graceBasis: 'firstDraw',
    debtTrancheMode: 'single',  // explicit single
    exitStrategy: 'hold',
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false }, landRentRebate: { enabled: false }, feeRebates: { enabled: false } },
  };

  const trCapex = [30000000, 40000000, 30000000, ...new Array(12).fill(0)];
  const trIncome = [0, 0, 0, 0, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000];
  const trNetCF = trCapex.map((c, i) => (trIncome[i] || 0) - c);
  const trResults = {
    consolidated: {
      income: trIncome, landRent: new Array(15).fill(0),
      capex: trCapex, netCF: trNetCF, totalCapex: 100000000, irr: 0,
    },
    assetSchedules: [],
  };

  const sFin = E.computeFinancing(singleProject, trResults, null);
  const pProject = { ...singleProject, debtTrancheMode: 'perDraw' };
  const pFin = E.computeFinancing(pProject, trResults, null);

  if (sFin && pFin) {
    // Same total debt
    t('Same total debt', near(sFin.totalDebt, pFin.totalDebt, 1));
    // Same total repaid
    t('Same total repaid',
      near(sFin.repayment.reduce((a,b)=>a+b,0), pFin.repayment.reduce((a,b)=>a+b,0), 1));

    // Single: all repay starts Y3, ends Y6 (4 equal payments of 25M)
    // PerDraw: repay spreads Y3-Y8 (staggered)
    t('Single repays by Y6', sFin.debtBalClose[6] < 1);
    t('PerDraw still has debt at Y6', pFin.debtBalClose[6] > 1000000,
      `bal=${pFin.debtBalClose[6].toFixed(0)}`);

    // PerDraw has lower total interest (debt repaid more gradually, later draws have shorter balance life)
    // Actually this depends - with later grace periods, balance stays longer. Let me just check they differ.
    t('Interest differs', Math.abs(sFin.totalInterest - pFin.totalInterest) > 100,
      `single=${sFin.totalInterest.toFixed(0)} perDraw=${pFin.totalInterest.toFixed(0)}`);
  }
}

suite('BM-E3: PerDraw with Early Exit (Balloon)');
{
  // Exit in Y5 when some tranches still have balance
  const earlyExitProject = {
    horizon: 15, startYear: 2026,
    landType: 'purchase', landPurchasePrice: 0, landArea: 0,
    softCostPct: 0, contingencyPct: 0,
    activeScenario: 'Base Case',
    phases: [{ name: 'P1' }],
    finMode: 'debt', debtAllowed: true, maxLtvPct: 100,
    financeRate: 10, loanTenor: 7, debtGrace: 3,
    upfrontFeePct: 0, repaymentType: 'amortizing',
    graceBasis: 'firstDraw',
    debtTrancheMode: 'perDraw',
    exitStrategy: 'sale', exitYear: 2031, exitMultiple: 10, exitCostPct: 0,
    incentives: { capexGrant: { enabled: false }, financeSupport: { enabled: false }, landRentRebate: { enabled: false }, feeRebates: { enabled: false } },
  };

  const trCapex = [30000000, 40000000, 30000000, ...new Array(12).fill(0)];
  const trIncome = [0, 0, 0, 0, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000, 20000000];
  const trResults = {
    consolidated: {
      income: trIncome, landRent: new Array(15).fill(0),
      capex: trCapex, netCF: trCapex.map((c, i) => (trIncome[i] || 0) - c),
      totalCapex: 100000000, irr: 0,
    },
    assetSchedules: [],
  };

  const eFin = E.computeFinancing(earlyExitProject, trResults, null);

  if (eFin) {
    // Exit at Y5 (2031). At Y5, remaining debt should be balloon'd to zero.
    t('Debt = 0 at exit Y5', eFin.debtBalClose[5] < 1, `bal=${eFin.debtBalClose[5].toFixed(0)}`);
    // Post-exit years should be zero
    t('No debt post-exit', eFin.debtBalClose[6] < 1 && eFin.repayment[6] < 1);
  }
}

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════');
console.log(`  ZAN BENCHMARK: ${pass} PASSED | ${fail} FAILED | ${pass + fail} TOTAL`);
console.log('══════════════════════════════════════════════════');

if (fail === 0) {
  console.log('  🎯 ALL BENCHMARKS MATCH ZAN FUND MODEL');
} else {
  console.log('\n  FAILURES BY SUITE:');
  const failedSuites = {};
  tests.filter(t => !t.pass).forEach(t => {
    if (!failedSuites[t.suite]) failedSuites[t.suite] = [];
    failedSuites[t.suite].push(t);
  });
  Object.entries(failedSuites).forEach(([suite, tests]) => {
    console.log(`\n  ${suite}:`);
    tests.forEach(t => console.log(`    ❌ ${t.name}: ${t.detail}`));
  });
}

process.exit(fail > 0 ? 1 : 0);
