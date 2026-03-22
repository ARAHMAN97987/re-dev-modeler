/**
 * ZAN Financial Engine — Default Data Factories
 * @module data/defaults
 * 
 * Zero dependencies. Used by UI (new project creation) and benchmarks.
 */

export const defaultHotelPL = () => ({ keys: 0, adr: 0, stabOcc: 70, daysYear: 365, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 });
export const defaultMarinaPL = () => ({ berths: 0, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 });

export const defaultProject = () => ({
  id: crypto.randomUUID(), name: "New Project", status: "Draft",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  location: "", startYear: new Date().getFullYear(), horizon: 50, currency: "SAR",
  landType: "lease", landArea: 0,
  landRentAnnual: 0, landRentEscalation: 5, landRentEscalationEveryN: 5, landRentGrace: 5, landRentTerm: 50,
  landPurchasePrice: 0, partnerEquityPct: 0, landValuation: 0, botOperationYears: 0,
  softCostPct: 10, contingencyPct: 5,
  rentEscalation: 0.75, vacancyPct: 0, defaultEfficiency: 85, defaultLeaseRate: 700, defaultCostPerSqm: 3500,
  activeScenario: "Base Case", customCapexMult: 100, customRentMult: 100, customDelay: 0, customEscAdj: 0,
  phases: [{ name: "Phase 1", startYearOffset: 1, completionYear: new Date().getFullYear() + 3, footprint: 0 }],
  assets: [],
  // Financing (Phase 2)
  finMode: "self", // self | debt | fund
  vehicleType: "fund", // fund | direct | spv
  gpIsFundManager: true, // true = GP manages the fund (gets all fees). false = separate financial company
  fundName: "",
  fundStartYear: 0, // 0 = auto
  // Land Capitalization
  landCapitalize: false,
  landCapRate: 1000, // SAR/sqm
  landCapTo: "gp", // gp | lp | split
  landRentPaidBy: "auto", // auto | project | gp | lp — who pays ongoing land rent after capitalization
  landRentStartRule: "auto", // auto = MIN(grace, income) | grace = grace end only | income = first income only
  landLeaseStartYear: 0, // 0 = same as project startYear. Otherwise absolute year (e.g. 2025)
  landRentManualAlloc: null, // null = auto (by footprint). Object like {"Phase 1":60,"Phase 2":40} = manual %
  // Debt
  debtAllowed: true,
  maxLtvPct: 70,
  financeRate: 6.5,
  loanTenor: 7,
  debtGrace: 3,
  debtGraceStartYear: 0, // 0 = auto (first drawdown year), or specific calendar year e.g. 2027
  upfrontFeePct: 0.5,
  repaymentType: "amortizing", // amortizing | bullet
  debtTrancheMode: "single", // single | perDraw
  capitalizeIDC: false, // Capitalize Interest During Construction + upfront fees into equity
  islamicMode: "conventional", // conventional | murabaha | ijara
  // Equity (manual override)
  gpEquityManual: 0, // 0 = auto from land cap + dev fee + cash
  lpEquityManual: 0, // 0 = auto (remainder)
  gpInvestDevFee: false, // Developer invests dev fee back into fund as equity
  gpDevFeeInvestPct: 100, // % of dev fee to invest (default 100%)
  gpCashInvest: false, // Developer adds cash investment
  gpCashInvestAmount: 0, // Cash amount (SAR)
  // Fund Fees (only when vehicleType = fund)
  subscriptionFeePct: 2,
  annualMgmtFeePct: 1.5,
  mgmtFeeCapAnnual: 2000000, // Max annual mgmt fee (0 = no cap)
  custodyFeeAnnual: 100000,
  mgmtFeeBase: "nav", // nav (net asset value) | deployed (ZAN: cumCAPEX) | devCost | equity
  feeTreatment: "capital", // H14: capital (ROC+Pref) | rocOnly (ROC, no Pref) | expense (no ROC, no Pref)
  graceBasis: "cod", // H10: cod | firstDraw
  developerFeePct: 10,
  structuringFeePct: 1,
  structuringFeeCap: 300000, // Max structuring fee (0 = no cap)
  preEstablishmentFee: 200000, // One-time pre-establishment fee
  spvFee: 20000, // One-time SPV setup fee
  auditorFeeAnnual: 50000, // Annual auditor fee
  operatorFeePct: 0.15, // Annual operator fee % of completed asset value (only for rental/hold projects)
  miscExpensePct: 0.5, // One-time miscellaneous expenses % of total assets
  // Exit
  exitStrategy: "sale", // sale | hold | caprate
  exitYear: 0, // 0 = auto
  exitMultiple: 10,
  exitCapRate: 9, // NOI / Cap Rate %
  exitCostPct: 2,
  exitStabilizationYears: 3, // Years after construction to stabilize before auto-exit (self mode). Debt/fund use debtGrace instead.
  // Waterfall (Phase 3)
  prefReturnPct: 15,
  gpCatchup: true,
  carryPct: 30,
  lpProfitSplitPct: 70,
  prefAllocation: "proRata", // proRata (GP+LP share T1+T2) | lpOnly (T2 all to LP)
  catchupMethod: "perYear", // perYear (ZAN) | cumulative
  // Government Incentives
  incentives: {
    capexGrant: { enabled: false, grantPct: 25, maxCap: 50000000, phases: [], timing: "construction" },
    financeSupport: { enabled: false, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation", softLoanAmount: 0, softLoanTenor: 10, softLoanGrace: 3, phases: [] },
    landRentRebate: { enabled: false, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 3, phases: [] },
    feeRebates: { enabled: false, items: [], phases: [] },
  },
  // Sharing
  sharedWith: [], // array of email strings
  // Market Indicators (optional)
  market: {
    enabled: false,
    horizonYear: 2033,
    gaps: {
      Retail: { unit: "sqm", gap: 0 },
      Office: { unit: "sqm", gap: 0 },
      Hospitality: { unit: "keys", gap: 0 },
      Residential: { unit: "sqm", gap: 0 },
      Marina: { unit: "berths", gap: 0 },
      Industrial: { unit: "sqm", gap: 0 },
    },
    thresholds: {
      Retail: { low: 50, med: 70 },
      Office: { low: 50, med: 70 },
      Hospitality: { low: 15, med: 30 },
      Residential: { low: 5, med: 10 },
      Marina: { low: 85, med: 100 },
      Industrial: { low: 50, med: 70 },
    },
    conversionFactors: { sqmPerKey: 45, sqmPerUnit: 200, sqmPerBerth: 139 },
    notes: "",
  },
});
