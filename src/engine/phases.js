/**
 * ZAN Financial Engine — Phase System (Per-Phase Independent Calculations)
 * @module engine/phases
 * 
 * Dependencies: engine/math.js, engine/financing.js, engine/waterfall.js (DIRECT imports)
 * Orchestrates per-phase financing + waterfall, then aggregates to consolidated.
 */

import { calcIRR, calcNPV } from './math.js';
import { computeFinancing } from './financing.js';
import { computeWaterfall } from './waterfall.js';

export const FINANCING_FIELDS = [
  'finMode','vehicleType','debtAllowed','maxLtvPct','financeRate',
  'loanTenor','debtGrace','graceBasis','upfrontFeePct','repaymentType','debtTrancheMode',
  'govFinancingPct','govBeneficiary','govFinanceRate','govLoanTenor','govGrace','govRepaymentType','govUpfrontFeePct',
  'hybridDrawOrder',
  'islamicMode','gpEquityManual','lpEquityManual','capitalizeIDC',
  'gpInvestDevFee','gpDevFeeInvestPct','gpCashInvest','gpCashInvestAmount',
  'exitStrategy','exitYear','exitCapRate','exitMultiple','exitCostPct',
  'prefReturnPct','gpCatchup','carryPct','lpProfitSplitPct',
  'feeTreatment','prefAllocation','subscriptionFeePct','annualMgmtFeePct','mgmtFeeCapAnnual','custodyFeeAnnual',
  // NOTE: catchupMethod is intentionally NOT per-phase — it's project-level only (matches ZAN Excel perYear convention)
  'developerFeePct','developerFeeBasis','structuringFeePct','structuringFeeCap','mgmtFeeBase',
  'preEstablishmentFee','spvFee','auditorFeeAnnual',
  'operatorFeePct','operatorFeeCap','miscExpensePct',
  'fundStartYear','fundName','gpIsFundManager','landCapitalize','landCapRate','landCapTo','landRentPaidBy',
  'performanceIncentive','hurdleMode','hurdleIRR','incentivePct',
  // Income fund fields
  'fundLife','targetYield','distributionFrequency','propertyMgmtFeePct','propertyMgmtFeeCap',
];

/** Get financing settings for a specific phase. Falls back to project-level. */
export function getPhaseFinancing(project, phaseName) {
  const phase = (project.phases || []).find(p => p.name === phaseName);
  // Always start with project-level defaults as base
  const base = {};
  FINANCING_FIELDS.forEach(f => { if (project[f] !== undefined) base[f] = project[f]; });
  // Overlay phase-specific settings, excluding project-level-only fields
  const PROJECT_ONLY_FIELDS = ['catchupMethod']; // These are project-level conventions, not per-phase
  const phaseFinancing = { ...(phase?.financing || {}) };
  PROJECT_ONLY_FIELDS.forEach(f => delete phaseFinancing[f]);
  return { ...base, ...phaseFinancing };
}

/** Check if project has per-phase financing enabled */
export function hasPerPhaseFinancing(project) {
  return (project.phases || []).some(p => p.financing);
}

/** Migrate project: copy project-level settings to each phase */
export function migrateToPerPhaseFinancing(project) {
  if (!project.phases || project.phases.length === 0) return project;
  if (hasPerPhaseFinancing(project)) return project; // Already migrated
  const settings = {};
  FINANCING_FIELDS.forEach(f => { if (project[f] !== undefined) settings[f] = project[f]; });
  return {
    ...project,
    phases: project.phases.map(p => ({ ...p, financing: { ...settings } })),
  };
}

/** FIX#4: Allocate consolidated incentives to a single phase */
export function buildPhaseIncentives(projectResults, incentivesResult, phaseName) {
  if (!incentivesResult) return null;
  const pr = projectResults.phaseResults[phaseName];
  const c = projectResults.consolidated;
  if (!pr) return null;

  const capexShare = c.totalCapex > 0 ? pr.totalCapex / c.totalCapex : 0;
  const landShare = c.totalLandRent > 0 ? pr.totalLandRent / c.totalLandRent : pr.allocPct || 0;

  const h = incentivesResult.capexGrantSchedule.length;
  const pIr = {
    ...incentivesResult,
    capexGrantTotal: incentivesResult.capexGrantTotal * capexShare,
    capexGrantSchedule: incentivesResult.capexGrantSchedule.map(v => v * capexShare),
    feeRebateTotal: incentivesResult.feeRebateTotal * capexShare,
    feeRebateSchedule: incentivesResult.feeRebateSchedule.map(v => v * capexShare),
    landRentSavingTotal: incentivesResult.landRentSavingTotal * landShare,
    landRentSavingSchedule: incentivesResult.landRentSavingSchedule.map(v => v * landShare),
    adjustedLandRent: pr.landRent.map(
      (lr, y) => Math.max(0, lr - (incentivesResult.landRentSavingSchedule[y] || 0) * landShare)
    ),
    adjustedCapex: pr.capex.map(
      (cx, y) => Math.max(0, cx - (incentivesResult.capexGrantSchedule[y] || 0) * capexShare)
    ),
    adjustedNetCF: pr.netCF.map(
      (cf, y) => cf + (incentivesResult.capexGrantSchedule[y] || 0) * capexShare
        + (incentivesResult.landRentSavingSchedule[y] || 0) * landShare
        + (incentivesResult.feeRebateSchedule[y] || 0) * capexShare
    ),
  };
  return pIr;
}

/** Build a virtual project for a single phase (uses phase financing + phase land allocation) */
export function buildPhaseVirtualProject(project, phaseName, phaseResult) {
  const pf = getPhaseFinancing(project, phaseName);
  const allocPct = phaseResult.allocPct || 0;

  // FIX#9: Project-level gpEquityManual/lpEquityManual must NOT leak into phases.
  // Per-phase equity is derived from that phase's own land cap / dev cost
  // (matching ZAN Excel per-fund behavior).

  const vProject = {
    ...project,
    ...pf, // Phase financing settings override project-level
    _isPhaseVirtual: true,
    _phaseName: phaseName,
    // Land: allocate proportionally by footprint
    landArea: (project.landArea || 0) * allocPct,
    // FIX#5: Allocate one-time land economics by phase
    landPurchasePrice: (project.landPurchasePrice || 0) * allocPct,
    landValuation: (project.landValuation || 0) * allocPct,
    landCapRate: project.landCapRate || 1000,
    // Keep land type and other land settings from project
    landRentAnnual: project.landRentAnnual, // Not used directly - comes from phaseResults
    // Override phases to prevent recursion
    phases: project.phases,
  };

  // FIX#9: ALWAYS clear inherited manual equity overrides.
  // Project-level gpEquityManual/lpEquityManual represent the FULL project amount
  // and must NOT leak into per-phase virtual projects. migrateToPerPhaseFinancing
  // also copies them to phase.financing, so hasOwnProperty checks are unreliable.
  // Per-phase equity is derived from that phase's own land cap / dev cost
  // (matching ZAN Excel per-fund behavior where each fund computes GP from its own land cap).
  delete vProject.gpEquityManual;
  delete vProject.lpEquityManual;

  return vProject;
}

/** Build synthetic projectResults where "consolidated" = phase data */
export function buildPhaseProjectResults(projectResults, phaseName) {
  const pr = projectResults.phaseResults[phaseName];
  if (!pr) return null;
  return {
    ...projectResults,
    consolidated: {
      income: pr.income,
      capex: pr.capex,
      landRent: pr.landRent,
      netCF: pr.netCF,
      totalCapex: pr.totalCapex,
      totalIncome: pr.totalIncome,
      totalLandRent: pr.totalLandRent,
      totalNetCF: pr.totalNetCF,
      irr: pr.irr,
      npv10: calcNPV(pr.netCF, 0.10),
      npv12: calcNPV(pr.netCF, 0.12),
      npv14: calcNPV(pr.netCF, 0.14),
    },
    assetSchedules: projectResults.assetSchedules.filter(a => (a.phase || "Unphased") === phaseName),
  };
}

/** Aggregate per-phase financing results into consolidated view */
export function aggregatePhaseFinancings(phaseFinancings, h) {
  const names = Object.keys(phaseFinancings);
  if (names.length === 0) return null;
  const sum = (field) => names.reduce((s, n) => {
    const v = phaseFinancings[n]?.[field];
    return s + (typeof v === 'number' ? v : 0);
  }, 0);
  const sumArr = (field) => {
    const arr = new Array(h).fill(0);
    names.forEach(n => { const a = phaseFinancings[n]?.[field]; if (a) for (let y = 0; y < h; y++) arr[y] += (a[y] || 0); });
    return arr;
  };
  const levCF = sumArr('leveredCF');
  return {
    mode: phaseFinancings[names[0]]?.mode || 'independent',
    isConsolidated: true, // multi-phase aggregate — checks must not apply single-phase formula math
    totalEquity: sum('totalEquity'), gpEquity: sum('gpEquity'), lpEquity: sum('lpEquity'),
    // FIX: bank100 has totalEquity=0, but gpPct should be 1; inherit from first phase
    gpPct: sum('totalEquity') > 0 ? sum('gpEquity') / sum('totalEquity') : (phaseFinancings[names[0]]?.gpPct ?? 0),
    lpPct: sum('totalEquity') > 0 ? sum('lpEquity') / sum('totalEquity') : (phaseFinancings[names[0]]?.lpPct ?? 0),
    devCostExclLand: sum('devCostExclLand'), devCostInclLand: sum('devCostInclLand'),
    totalProjectCost: sum('devCostInclLand'),
    maxDebt: sum('maxDebt'), totalDebt: sum('totalDebt'),
    landCapValue: sum('landCapValue'), capexGrantTotal: sum('capexGrantTotal'),
    drawdown: sumArr('drawdown'), equityCalls: sumArr('equityCalls'),
    debtBalOpen: sumArr('debtBalOpen'), debtBalClose: sumArr('debtBalClose'),
    repayment: sumArr('repayment'), interest: sumArr('interest'),
    originalInterest: sumArr('originalInterest'),
    debtService: sumArr('debtService'), leveredCF: levCF,
    dscr: (() => { const ds = sumArr('debtService'); const noi = new Array(h).fill(0); names.forEach(n => { const pf = phaseFinancings[n]; if (!pf) return; for (let y = 0; y < h; y++) { if (pf.dscr && pf.dscr[y] !== null && pf.debtService[y] > 0) noi[y] += pf.dscr[y] * pf.debtService[y]; } }); return ds.map((d, y) => d > 0 ? noi[y] / d : null); })(),
    exitProceeds: sumArr('exitProceeds'),
    upfrontFee: sum('upfrontFee'),
    devFeeTotal: sum('devFeeTotal'), devFeeSchedule: sumArr('devFeeSchedule'),
    totalInterest: sum('totalInterest'),
    interestSubsidyTotal: sum('interestSubsidyTotal'),
    interestSubsidySchedule: sumArr('interestSubsidySchedule'),
    leveredIRR: calcIRR(levCF),
    constrEnd: Math.max(...names.map(n => phaseFinancings[n]?.constrEnd || 0)),
    // Inherit scalar debt terms from first phase with debt (typically same across phases)
    rate: names.reduce((r, n) => r || phaseFinancings[n]?.rate, 0) || 0,
    tenor: names.reduce((r, n) => r || phaseFinancings[n]?.tenor, 0) || 0,
    grace: names.reduce((r, n) => r || phaseFinancings[n]?.grace, 0) || 0,
    repayYears: names.reduce((r, n) => r || phaseFinancings[n]?.repayYears, 0) || 0,
    repayStart: names.reduce((r, n) => r || phaseFinancings[n]?.repayStart, 0) || 0,
    graceStartIdx: names.reduce((r, n) => r || phaseFinancings[n]?.graceStartIdx, 0) || 0,
    exitYear: Math.max(...names.map(n => phaseFinancings[n]?.exitYear || 0)),
    incomeStabilizationYear: Math.max(...names.map(n => phaseFinancings[n]?.incomeStabilizationYear || 0)),
    optimalExitYear: Math.max(...names.map(n => phaseFinancings[n]?.optimalExitYear || 0)),
    optimalExitIRR: (() => { const irrs = names.map(n => phaseFinancings[n]?.optimalExitIRR).filter(v => v != null && isFinite(v)); return irrs.length > 0 ? Math.max(...irrs) : null; })(),
    // Hybrid financing fields — inherit flags from first phase, sum amounts/arrays
    isHybrid: phaseFinancings[names[0]]?.isHybrid || false,
    govBeneficiary: phaseFinancings[names[0]]?.govBeneficiary || null,
    govFinancingPct: phaseFinancings[names[0]]?.govFinancingPct ?? null,
    govLoanAmount: sum('govLoanAmount'),
    govLoanRate: phaseFinancings[names[0]]?.govLoanRate ?? null,
    gpPersonalDebt: phaseFinancings[names[0]]?.gpPersonalDebt || null,
    fundPortionCost: sum('fundPortionCost'),
    buildCostOnly: sum('buildCostOnly'),
    financingCF: sumArr('financingCF'),
    fundCF: sumArr('fundCF'),
    fullProjectExitVal: sum('fullProjectExitVal'),
  };
}

/** Aggregate per-phase waterfall results into consolidated view */
export function aggregatePhaseWaterfalls(phaseWaterfalls, phaseFinancings, h) {
  const names = Object.keys(phaseWaterfalls);
  if (names.length === 0) return null;
  const sumArr = (field) => {
    const arr = new Array(h).fill(0);
    names.forEach(n => { const a = phaseWaterfalls[n]?.[field]; if (a) for (let y = 0; y < h; y++) arr[y] += (a[y] || 0); });
    return arr;
  };
  const sum = (field) => names.reduce((s, n) => s + (phaseWaterfalls[n]?.[field] || 0), 0);

  const lpNetCF = sumArr('lpNetCF');
  const gpNetCF = sumArr('gpNetCF');
  const totalEquity = Object.keys(phaseFinancings).reduce((s, n) => s + (phaseFinancings[n]?.totalEquity || 0), 0);
  const gpEquity = Object.keys(phaseFinancings).reduce((s, n) => s + (phaseFinancings[n]?.gpEquity || 0), 0);
  const lpEquity = Object.keys(phaseFinancings).reduce((s, n) => s + (phaseFinancings[n]?.lpEquity || 0), 0);

  return {
    mode: 'independent',
    totalEquity, gpEquity, lpEquity,
    gpPct: totalEquity > 0 ? gpEquity / totalEquity : 0,
    lpPct: totalEquity > 0 ? lpEquity / totalEquity : 0,
    equityCalls: sumArr('equityCalls'), fees: sumArr('fees'),
    feeSub: sumArr('feeSub'), feeMgmt: sumArr('feeMgmt'), feeCustody: sumArr('feeCustody'),
    feeDev: sumArr('feeDev'), feeStruct: sumArr('feeStruct'),
    feePreEst: sumArr('feePreEst'), feeSpv: sumArr('feeSpv'), feeAuditor: sumArr('feeAuditor'),
    feeOperator: sumArr('feeOperator'), feeMisc: sumArr('feeMisc'),
    totalFees: sum('totalFees'), unfundedFees: sumArr('unfundedFees'),
    gpLandRentTotal: sum('gpLandRentTotal'),
    exitProceeds: sumArr('exitProceeds'), exitYear: Math.max(...names.map(n => phaseWaterfalls[n]?.exitYear || 0)),
    cashAvail: sumArr('cashAvail'),
    tier1: sumArr('tier1'), tier2: sumArr('tier2'),
    tier3: sumArr('tier3'), tier4LP: sumArr('tier4LP'), tier4GP: sumArr('tier4GP'),
    lpDist: sumArr('lpDist'), gpDist: sumArr('gpDist'),
    lpNetCF, gpNetCF,
    unreturnedOpen: sumArr('unreturnedOpen'), unreturnedClose: sumArr('unreturnedClose'),
    prefAccrual: sumArr('prefAccrual'), prefAccumulated: sumArr('prefAccumulated'),
    lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
    lpTotalDist: sum('lpTotalDist'), gpTotalDist: sum('gpTotalDist'),
    // Net distributions (after land rent obligations)
    lpNetDist: sum('lpNetDist') || sum('lpTotalDist'),
    gpNetDist: sum('gpNetDist') || sum('gpTotalDist'),
    // Total called (actual cash contributed)
    lpTotalCalled: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    gpTotalCalled: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    lpTotalInvested: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    gpTotalInvested: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    // MOIC = NetDist / TotalCalled (paid-in basis, matches computeWaterfall)
    lpMOIC: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)); const nd = sum('lpNetDist') || sum('lpTotalDist'); return c > 0 ? nd / c : 0; })(),
    gpMOIC: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)); const nd = sum('gpNetDist') || sum('gpTotalDist'); return c > 0 ? nd / c : 0; })(),
    // Committed MOIC = NetDist / Original Equity (secondary metric)
    lpCommittedMOIC: lpEquity > 0 ? (sum('lpNetDist') || sum('lpTotalDist')) / lpEquity : 0,
    gpCommittedMOIC: gpEquity > 0 ? (sum('gpNetDist') || sum('gpTotalDist')) / gpEquity : 0,
    // DPI = NetDist / TotalCalled (same as paid-in MOIC)
    lpDPI: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)); const nd = sum('lpNetDist') || sum('lpTotalDist'); return c > 0 ? nd / c : 0; })(),
    gpDPI: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)); const nd = sum('gpNetDist') || sum('gpTotalDist'); return c > 0 ? nd / c : 0; })(),
    lpNPV10: calcNPV(lpNetCF, 0.10), lpNPV12: calcNPV(lpNetCF, 0.12), lpNPV14: calcNPV(lpNetCF, 0.14),
    gpNPV10: calcNPV(gpNetCF, 0.10), gpNPV12: calcNPV(gpNetCF, 0.12), gpNPV14: calcNPV(gpNetCF, 0.14),
    isFund: names.some(n => phaseWaterfalls[n]?.isFund),
    // Phase A: Fee attribution (aggregate across phases)
    gpIsFundManager: names.some(n => phaseWaterfalls[n]?.gpIsFundManager !== false),
    devFeesTotal: sum('devFeesTotal'),
    fundLevelFeesTotal: sum('fundLevelFeesTotal'),
    subFeesTotal: sum('subFeesTotal'),
    developerFeesReceived: sum('developerFeesReceived'),
    // Phase C: Capital return + sponsor economics buckets
    developerCapitalReturn: sum('developerCapitalReturn'),
    sponsorWaterfallEconomics: sum('sponsorWaterfallEconomics'),
    // Phase C.1: Clean developer-fee-only field
    developerFeeOnlyReceived: sum('developerFeeOnlyReceived'),
    // Performance Incentive (aggregated — sum of per-phase incentives)
    perfIncentiveEnabled: names.some(n => phaseWaterfalls[n]?.perfIncentiveEnabled),
    perfIncentiveAmount: sum('perfIncentiveAmount'),
    perfIncentiveExcess: sum('perfIncentiveExcess'),
    perfIncentiveRequired: sum('perfIncentiveRequired'),
    hurdleMode: names.length > 0 ? (phaseWaterfalls[names[0]]?.hurdleMode || "simple") : "simple",
    perfIncentiveYears: Math.max(...names.map(n => phaseWaterfalls[n]?.perfIncentiveYears || 0)),
    perfIncentiveSettleYear: Math.max(...names.map(n => phaseWaterfalls[n]?.perfIncentiveSettleYear || 0)) || null,
    lpIRR_preIncentive: null, // recomputed at aggregate level, not sum
    gpIRR_preIncentive: null,
    // Developer Two-Hats breakdown
    developerAsInvestor: sum('developerAsInvestor'),
    developerDevFees: sum('developerDevFees'),
    developerPerfIncentive: sum('developerPerfIncentive'),
    developerTotalEconomics: sum('developerTotalEconomics'),
    // Phase B1: Saudi-style alias outputs (recomputed from aggregated data)
    developerEquity: gpEquity, investorEquity: lpEquity,
    developerPct: totalEquity > 0 ? gpEquity / totalEquity : 0,
    investorPct: totalEquity > 0 ? lpEquity / totalEquity : 0,
    developerContribution: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    investorContribution: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    developerDistributions: sum('gpTotalDist'), investorDistributions: sum('lpTotalDist'),
    developerNetDistributions: sum('gpNetDist') || sum('gpTotalDist'),
    investorNetDistributions: sum('lpNetDist') || sum('lpTotalDist'),
    developerNetCF: gpNetCF, investorNetCF: lpNetCF,
    developerIRR: calcIRR(gpNetCF), investorIRR: calcIRR(lpNetCF),
    developerMOIC: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)); const nd = sum('gpNetDist') || sum('gpTotalDist'); return c > 0 ? nd / c : 0; })(),
    investorMOIC: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)); const nd = sum('lpNetDist') || sum('lpTotalDist'); return c > 0 ? nd / c : 0; })(),
    developerDPI: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)); const nd = sum('gpNetDist') || sum('gpTotalDist'); return c > 0 ? nd / c : 0; })(),
    investorDPI: (() => { const c = sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)); const nd = sum('lpNetDist') || sum('lpTotalDist'); return c > 0 ? nd / c : 0; })(),
    developerNPV10: calcNPV(gpNetCF, 0.10), investorNPV10: calcNPV(lpNetCF, 0.10),
    developerNPV12: calcNPV(gpNetCF, 0.12), investorNPV12: calcNPV(lpNetCF, 0.12),
    // Hybrid: pass-through from waterfall (financingCF/fundCF/fullProjectExitVal)
    financingCF: sumArr('financingCF'),
    fundCF: sumArr('fundCF'),
    fullProjectExitVal: sum('fullProjectExitVal'),
    fundFeeBasis: sum('fundFeeBasis'),
    // Cash IRR/MOIC (hybrid-gp + land cap): inherit from first phase or recompute
    gpCashIRR: names.length === 1 ? (phaseWaterfalls[names[0]]?.gpCashIRR ?? null) : calcIRR(gpNetCF),
    lpCashIRR: names.length === 1 ? (phaseWaterfalls[names[0]]?.lpCashIRR ?? null) : calcIRR(lpNetCF),
    gpCashMOIC: names.length === 1 ? (phaseWaterfalls[names[0]]?.gpCashMOIC ?? null) : null,
    lpCashMOIC: names.length === 1 ? (phaseWaterfalls[names[0]]?.lpCashMOIC ?? null) : null,
    gpCashCalled: sum('gpCashCalled'),
    lpCashCalled: sum('lpCashCalled'),
    // Land rent obligations
    lpLandRentTotal: sum('lpLandRentTotal'),
    gpLandRentObligation: sumArr('gpLandRentObligation'),
    lpLandRentObligation: sumArr('lpLandRentObligation'),
    gpPaysLandRent: names.some(n => phaseWaterfalls[n]?.gpPaysLandRent),
    lpPaysLandRent: names.some(n => phaseWaterfalls[n]?.lpPaysLandRent),
    resolvedLandRentPayer: phaseWaterfalls[names[0]]?.resolvedLandRentPayer || "project",
    // GP/LP call arrays
    gpCalls: sumArr('gpCalls'),
    lpCalls: sumArr('lpCalls'),
    // Simple return metrics
    lpSimpleROE: names.length === 1 ? (phaseWaterfalls[names[0]]?.lpSimpleROE ?? 0) : 0,
    gpSimpleROE: names.length === 1 ? (phaseWaterfalls[names[0]]?.gpSimpleROE ?? 0) : 0,
    lpSimpleAnnual: names.length === 1 ? (phaseWaterfalls[names[0]]?.lpSimpleAnnual ?? 0) : 0,
    gpSimpleAnnual: names.length === 1 ? (phaseWaterfalls[names[0]]?.gpSimpleAnnual ?? 0) : 0,
    investYears: Math.max(...names.map(n => phaseWaterfalls[n]?.investYears || 0)),
  };
}

/** Main orchestrator: runs independent financing + waterfall per phase, then aggregates */
export function computeIndependentPhaseResults(project, projectResults, incentivesResult) {
  if (!project || !projectResults) return { phaseFinancings: {}, phaseWaterfalls: {}, consolidatedFinancing: null, consolidatedWaterfall: null };

  const phases = projectResults.phaseResults;
  const phaseNames = Object.keys(phases);
  if (phaseNames.length === 0) return { phaseFinancings: {}, phaseWaterfalls: {}, consolidatedFinancing: null, consolidatedWaterfall: null };

  const h = project.horizon || 50;
  const phaseFinancings = {};
  const phaseWaterfalls = {};

  for (const pName of phaseNames) {
    const pr = phases[pName];
    if (!pr || pr.totalCapex === 0) continue;

    const vProject = buildPhaseVirtualProject(project, pName, pr);

    const vResults = buildPhaseProjectResults(projectResults, pName);
    if (!vResults) continue;

    // Run financing for this phase (FIX#4: pass phase-allocated incentives)
    try {
      const pIr = buildPhaseIncentives(projectResults, incentivesResult, pName);
      const pFinancing = computeFinancing(vProject, vResults, pIr);
      if (pFinancing) {
        phaseFinancings[pName] = pFinancing;
        // Run waterfall (only if fund mode for this phase)
        const pFinMode = vProject.finMode || project.finMode;
        if (pFinMode === "fund" || pFinMode === "jv" || pFinMode === "hybrid") {
          try {
            const pWaterfall = computeWaterfall(vProject, vResults, pFinancing, pIr);
            if (pWaterfall) phaseWaterfalls[pName] = pWaterfall;
          } catch (e) { console.error(`Phase waterfall error (${pName}):`, e); }
        }
      }
    } catch (e) { console.error(`Phase financing error (${pName}):`, e); }
  }

  const consolidatedFinancing = aggregatePhaseFinancings(phaseFinancings, h);
  // FIX: Consolidated DSCR must use total NOI / total DS across ALL phases
  // The weighted-average method in aggregatePhaseFinancings misses NOI from phases
  // whose debt is fully repaid (DS=0 → DSCR=null → excluded from weighted avg).
  // Correct: total NOI includes income from ALL phases (even those without active debt).
  if (consolidatedFinancing && projectResults?.consolidated) {
    const c = projectResults.consolidated;
    const adjLR = incentivesResult?.adjustedLandRent || c.landRent;
    const ds = consolidatedFinancing.debtService;
    const fixedDscr = new Array(h).fill(null);
    for (let y = 0; y < h; y++) {
      if (ds[y] > 0) fixedDscr[y] = (c.income[y] - adjLR[y]) / ds[y];
    }
    consolidatedFinancing.dscr = fixedDscr;
  }
  const consolidatedWaterfall = aggregatePhaseWaterfalls(phaseWaterfalls, phaseFinancings, h);

  return { phaseFinancings, phaseWaterfalls, consolidatedFinancing, consolidatedWaterfall };
}

// ═══ Legacy computePhaseWaterfalls (kept for backward compat) ═══

