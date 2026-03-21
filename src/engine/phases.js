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
  'islamicMode','gpEquityManual','lpEquityManual',
  'exitStrategy','exitYear','exitCapRate','exitMultiple','exitCostPct',
  'prefReturnPct','gpCatchup','carryPct','lpProfitSplitPct',
  'feeTreatment','prefAllocation','catchupMethod','subscriptionFeePct','annualMgmtFeePct','mgmtFeeCapAnnual','custodyFeeAnnual',
  'developerFeePct','structuringFeePct','structuringFeeCap','mgmtFeeBase',
  'preEstablishmentFee','spvFee','auditorFeeAnnual',
  'fundStartYear','fundName','gpIsFundManager','landCapitalize','landCapRate','landCapTo','landRentPaidBy',
];

/** Get financing settings for a specific phase. Falls back to project-level. */
export function getPhaseFinancing(project, phaseName) {
  const phase = (project.phases || []).find(p => p.name === phaseName);
  // Always start with project-level defaults as base
  const base = {};
  FINANCING_FIELDS.forEach(f => { if (project[f] !== undefined) base[f] = project[f]; });
  // Overlay phase-specific settings (if any)
  return { ...base, ...(phase?.financing || {}) };
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

  return {
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
    // FIX#9: ALWAYS clear manual equity for per-phase virtual projects.
    // Project-level gpEquityManual is sized for the FULL project.
    // migrateToPerPhaseFinancing copies it to each phase.financing too.
    // Passing it unscaled causes gpEquity >= phase totalEquity → lpEquity = 0.
    // Force auto-calculation via land cap proportional split.
    gpEquityManual: 0,
    lpEquityManual: 0,
  };
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
    totalEquity: sum('totalEquity'), gpEquity: sum('gpEquity'), lpEquity: sum('lpEquity'),
    gpPct: sum('totalEquity') > 0 ? sum('gpEquity') / sum('totalEquity') : 0,
    lpPct: sum('totalEquity') > 0 ? sum('lpEquity') / sum('totalEquity') : 0,
    devCostExclLand: sum('devCostExclLand'), devCostInclLand: sum('devCostInclLand'),
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
    totalInterest: sum('totalInterest'),
    interestSubsidyTotal: sum('interestSubsidyTotal'),
    interestSubsidySchedule: sumArr('interestSubsidySchedule'),
    leveredIRR: calcIRR(levCF),
    constrEnd: Math.max(...names.map(n => phaseFinancings[n]?.constrEnd || 0)),
    rate: 0, tenor: 0, grace: 0, repayYears: 0, repayStart: 0,
    exitYear: Math.max(...names.map(n => phaseFinancings[n]?.exitYear || 0)),
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
    lpMOIC: lpEquity > 0 ? sum('lpTotalDist') / lpEquity : 0,
    gpMOIC: gpEquity > 0 ? sum('gpTotalDist') / gpEquity : 0,
    // Committed MOIC = same as lpMOIC/gpMOIC here (using original equity)
    lpCommittedMOIC: lpEquity > 0 ? sum('lpTotalDist') / lpEquity : 0,
    gpCommittedMOIC: gpEquity > 0 ? sum('gpTotalDist') / gpEquity : 0,
    // Net distributions (after land rent obligations)
    lpNetDist: sum('lpNetDist') || sum('lpTotalDist'),
    gpNetDist: sum('gpNetDist') || sum('gpTotalDist'),
    // Total called (actual cash contributed)
    lpTotalCalled: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    gpTotalCalled: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    lpTotalInvested: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    gpTotalInvested: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    lpDPI: sum('lpTotalDist') / Math.max(1, sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity))),
    gpDPI: sum('gpTotalDist') / Math.max(1, sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity))),
    lpNPV10: calcNPV(lpNetCF, 0.10), lpNPV12: calcNPV(lpNetCF, 0.12), lpNPV14: calcNPV(lpNetCF, 0.14),
    gpNPV10: calcNPV(gpNetCF, 0.10), gpNPV12: calcNPV(gpNetCF, 0.12), gpNPV14: calcNPV(gpNetCF, 0.14),
    isFund: true,
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
        if (pFinMode === "fund" || pFinMode === "jv") {
          try {
            const pWaterfall = computeWaterfall(vProject, vResults, pFinancing, pIr);
            if (pWaterfall) phaseWaterfalls[pName] = pWaterfall;
          } catch (e) { console.error(`Phase waterfall error (${pName}):`, e); }
        }
      }
    } catch (e) { console.error(`Phase financing error (${pName}):`, e); }
  }

  const consolidatedFinancing = aggregatePhaseFinancings(phaseFinancings, h);
  const consolidatedWaterfall = aggregatePhaseWaterfalls(phaseWaterfalls, phaseFinancings, h);

  return { phaseFinancings, phaseWaterfalls, consolidatedFinancing, consolidatedWaterfall };
}

// ═══ Legacy computePhaseWaterfalls (kept for backward compat) ═══

