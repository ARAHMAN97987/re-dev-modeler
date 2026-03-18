/**
 * ZAN Engine — Layer C: Unlevered Cash Flow
 * Land rent schedule, phase aggregation, consolidated CF, IRR, NPV.
 *
 * Source: App.jsx computeProjectCashFlows lines 774-807
 * EXACT COPY — no modifications to formulas.
 *
 * Dependencies: Layer B (computeAssetSchedules), Layer 0 (calcIRR, calcNPV)
 */

const { calcIRR, calcNPV } = require('./calcUtils.cjs');
const { computeAssetSchedules } = require('./assets.cjs');

// ── Land Rent Schedule ──

function computeLandSchedule(project, horizon) {
  const landSch = new Array(horizon).fill(0);
  if (project.landType === "lease") {
    const base = project.landRentAnnual || 0;
    const gr = project.landRentGrace || 0;
    const eN = Math.max(1, project.landRentEscalationEveryN ?? 5);
    const eP = (project.landRentEscalation || 0) / 100;
    const term = Math.min(project.landRentTerm || 50, horizon);
    for (let y = 0; y < term; y++) {
      if (y < gr) continue;
      landSch[y] = base * Math.pow(1 + eP, Math.floor((y - gr) / eN));
    }
  } else if (project.landType === "purchase") {
    landSch[0] = project.landPurchasePrice || 0;
  }
  return landSch;
}

// ── Phase Aggregation ──

function computePhaseResults(assetSchedules, landSchedule, horizon) {
  const phaseNames = [...new Set(assetSchedules.map(a => (a.phase || "Unphased")))];
  const phaseResults = {};

  phaseNames.forEach(pName => {
    const pa = assetSchedules.filter(a => (a.phase || "Unphased") === pName);
    const inc = new Array(horizon).fill(0);
    const cap = new Array(horizon).fill(0);
    pa.forEach(a => {
      for (let y = 0; y < horizon; y++) {
        inc[y] += a.revenueSchedule[y];
        cap[y] += a.capexSchedule[y];
      }
    });

    // Land allocation by footprint
    const totalFP = assetSchedules.reduce((s, a) => s + (a.footprint || 0), 0);
    const pFP = pa.reduce((s, a) => s + (a.footprint || 0), 0);
    const alloc = totalFP > 0 ? pFP / totalFP : phaseNames.length > 0 ? 1 / phaseNames.length : 0;
    const pLand = landSchedule.map(l => l * alloc);

    const net = new Array(horizon).fill(0);
    for (let y = 0; y < horizon; y++) net[y] = inc[y] - pLand[y] - cap[y];

    phaseResults[pName] = {
      income: inc, capex: cap, landRent: pLand, netCF: net,
      totalCapex: cap.reduce((a, b) => a + b, 0),
      totalIncome: inc.reduce((a, b) => a + b, 0),
      totalLandRent: pLand.reduce((a, b) => a + b, 0),
      totalNetCF: net.reduce((a, b) => a + b, 0),
      irr: calcIRR(net),
      assetCount: pa.length,
      footprint: pFP,
      allocPct: alloc,
    };
  });

  return phaseResults;
}

// ── Consolidated ──

function computeConsolidated(phaseResults, horizon) {
  const ci = new Array(horizon).fill(0);
  const cc = new Array(horizon).fill(0);
  const cl = new Array(horizon).fill(0);
  const cn = new Array(horizon).fill(0);
  Object.values(phaseResults).forEach(pr => {
    for (let y = 0; y < horizon; y++) {
      ci[y] += pr.income[y];
      cc[y] += pr.capex[y];
      cl[y] += pr.landRent[y];
      cn[y] += pr.netCF[y];
    }
  });
  return {
    income: ci, capex: cc, landRent: cl, netCF: cn,
    totalCapex: cc.reduce((a, b) => a + b, 0),
    totalIncome: ci.reduce((a, b) => a + b, 0),
    totalLandRent: cl.reduce((a, b) => a + b, 0),
    totalNetCF: cn.reduce((a, b) => a + b, 0),
    irr: calcIRR(cn),
    npv10: calcNPV(cn, 0.10),
    npv12: calcNPV(cn, 0.12),
    npv14: calcNPV(cn, 0.14),
  };
}

// ── Full Unlevered Cash Flow (combines everything) ──
// This is the modular equivalent of computeProjectCashFlows in App.jsx

function computeUnleveredCashFlows(project) {
  const horizon = project.horizon || 50;
  const startYear = project.startYear || 2026;

  // Layer B: Asset schedules
  const assetSchedules = computeAssetSchedules(project);

  // Layer C: Land rent
  const landSchedule = computeLandSchedule(project, horizon);

  // Layer C: Phase aggregation
  const phaseResults = computePhaseResults(assetSchedules, landSchedule, horizon);

  // Layer C: Consolidated
  const consolidated = computeConsolidated(phaseResults, horizon);

  return {
    assetSchedules,
    phaseResults,
    landSchedule: landSchedule,
    startYear,
    horizon,
    consolidated,
  };
}

module.exports = {
  computeLandSchedule,
  computePhaseResults,
  computeConsolidated,
  computeUnleveredCashFlows,
};
