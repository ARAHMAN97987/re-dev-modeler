/**
 * ZAN Engine — Layer A: Project Inputs
 * Default project structure, scenario multipliers, input validation.
 * Source: App.jsx lines 525-616, 682-691
 */

const defaultProject = () => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'test-' + Date.now(),
  name: "New Project", status: "Draft",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  location: "", startYear: new Date().getFullYear(), horizon: 50, currency: "SAR",
  landType: "lease", landArea: 0,
  landRentAnnual: 0, landRentEscalation: 5, landRentEscalationEveryN: 5, landRentGrace: 5, landRentTerm: 50,
  landPurchasePrice: 0, partnerEquityPct: 0, landValuation: 0, botOperationYears: 0,
  softCostPct: 10, contingencyPct: 5,
  rentEscalation: 0.75, vacancyPct: 0, defaultEfficiency: 85, defaultLeaseRate: 700, defaultCostPerSqm: 3500,
  activeScenario: "Base Case", customCapexMult: 100, customRentMult: 100, customDelay: 0, customEscAdj: 0,
  phases: [{ name: "Phase 1", startYearOffset: 1, footprint: 0 }],
  assets: [],
  finMode: "self",
  vehicleType: "fund",
  fundName: "",
  fundStartYear: 0,
  landCapitalize: false,
  landCapRate: 1000,
  landCapTo: "gp",
  landRentPaidBy: "auto",
  debtAllowed: true,
  maxLtvPct: 70,
  financeRate: 6.5,
  loanTenor: 7,
  debtGrace: 3,
  debtGraceStartYear: 0,
  upfrontFeePct: 0.5,
  repaymentType: "amortizing",
  islamicMode: "conventional",
  gpEquityManual: 0,
  lpEquityManual: 0,
  subscriptionFeePct: 2,
  annualMgmtFeePct: 0.9,
  custodyFeeAnnual: 130000,
  mgmtFeeBase: "devCost",
  feeTreatment: "capital",
  graceBasis: "cod",
  developerFeePct: 10,
  structuringFeePct: 0.1,
  exitStrategy: "sale",
  exitYear: 0,
  exitMultiple: 10,
  exitCapRate: 9,
  exitCostPct: 2,
  prefReturnPct: 15,
  gpCatchup: true,
  carryPct: 30,
  lpProfitSplitPct: 70,
  incentives: {
    capexGrant: { enabled: false, grantPct: 25, maxCap: 50000000, phases: [], timing: "construction" },
    financeSupport: { enabled: false, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation", softLoanAmount: 0, softLoanTenor: 10, softLoanGrace: 3, phases: [] },
    landRentRebate: { enabled: false, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 3, phases: [] },
    feeRebates: { enabled: false, items: [], phases: [] },
  },
  sharedWith: [],
  market: {
    enabled: false,
    horizonYear: 2033,
    gaps: {
      Retail: { unit: "sqm", gap: 0 }, Office: { unit: "sqm", gap: 0 },
      Hospitality: { unit: "keys", gap: 0 }, Residential: { unit: "sqm", gap: 0 },
      Marina: { unit: "berths", gap: 0 }, Industrial: { unit: "sqm", gap: 0 },
    },
    thresholds: {
      Retail: { low: 50, med: 70 }, Office: { low: 50, med: 70 },
      Hospitality: { low: 15, med: 30 }, Residential: { low: 5, med: 10 },
      Marina: { low: 85, med: 100 }, Industrial: { low: 50, med: 70 },
    },
    conversionFactors: { sqmPerKey: 45, sqmPerUnit: 200, sqmPerBerth: 139 },
    notes: "",
  },
});

function getScenarioMults(p) {
  let cm = 1, rm = 1, dm = 0, ea = 0;
  const s = p.activeScenario;
  if (s === "CAPEX +10%") cm = 1.1; else if (s === "CAPEX -10%") cm = 0.9;
  else if (s === "Rent +10%") rm = 1.1; else if (s === "Rent -10%") rm = 0.9;
  else if (s === "Delay +6 months") dm = 6;
  else if (s === "Escalation +0.5%") ea = 0.5; else if (s === "Escalation -0.5%") ea = -0.5;
  else if (s === "Custom") {
    cm = (p.customCapexMult ?? 100) / 100;
    rm = (p.customRentMult ?? 100) / 100;
    dm = p.customDelay ?? 0;
    ea = p.customEscAdj ?? 0;
  }
  return { cm, rm, dm, ea };
}

/**
 * Validate project inputs. Returns array of { field, message, severity }.
 * severity: 'error' (blocks calculation) | 'warning' (may produce unexpected results)
 */
function validateInputs(project) {
  const issues = [];
  const p = project || {};

  // Required numeric fields
  if (!p.horizon || p.horizon < 1 || p.horizon > 100) {
    issues.push({ field: 'horizon', message: 'Horizon must be 1-100 years', severity: 'error' });
  }
  if (!p.startYear || p.startYear < 2000 || p.startYear > 2100) {
    issues.push({ field: 'startYear', message: 'Start year must be 2000-2100', severity: 'error' });
  }

  // Land validation
  if (p.landType === 'lease') {
    if ((p.landRentAnnual || 0) < 0) {
      issues.push({ field: 'landRentAnnual', message: 'Land rent cannot be negative', severity: 'error' });
    }
    if ((p.landRentGrace || 0) >= (p.landRentTerm || 50)) {
      issues.push({ field: 'landRentGrace', message: 'Grace period exceeds lease term', severity: 'warning' });
    }
  } else if (p.landType === 'purchase') {
    if ((p.landPurchasePrice || 0) < 0) {
      issues.push({ field: 'landPurchasePrice', message: 'Purchase price cannot be negative', severity: 'error' });
    }
  }

  // CAPEX assumptions
  if ((p.softCostPct || 0) < 0 || (p.softCostPct || 0) > 100) {
    issues.push({ field: 'softCostPct', message: 'Soft cost % must be 0-100', severity: 'warning' });
  }
  if ((p.contingencyPct || 0) < 0 || (p.contingencyPct || 0) > 100) {
    issues.push({ field: 'contingencyPct', message: 'Contingency % must be 0-100', severity: 'warning' });
  }

  // Assets validation
  const assets = p.assets || [];
  assets.forEach((a, i) => {
    if ((a.gfa || 0) < 0) {
      issues.push({ field: `assets[${i}].gfa`, message: `Asset "${a.name || i}": negative GFA`, severity: 'error' });
    }
    if ((a.costPerSqm || 0) < 0) {
      issues.push({ field: `assets[${i}].costPerSqm`, message: `Asset "${a.name || i}": negative cost/sqm`, severity: 'error' });
    }
    if ((a.constrDuration || 0) <= 0 && (a.gfa || 0) > 0 && (a.costPerSqm || 0) > 0) {
      issues.push({ field: `assets[${i}].constrDuration`, message: `Asset "${a.name || i}": has cost but zero duration`, severity: 'warning' });
    }
  });

  // Phase allocation check
  const phaseNames = [...new Set(assets.map(a => a.phase || 'Unphased'))];
  const totalFP = assets.reduce((s, a) => s + (a.footprint || 0), 0);
  if (phaseNames.length > 1 && totalFP === 0) {
    issues.push({ field: 'phases', message: 'Multiple phases but no footprint allocated', severity: 'warning' });
  }

  return issues;
}

module.exports = { defaultProject, getScenarioMults, validateInputs };
