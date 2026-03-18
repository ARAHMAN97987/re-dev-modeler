/**
 * ZAN Engine — Layer C: Unlevered Cash Flow (v2)
 * 
 * CHANGES from v1:
 * 1. Land rent starts at MAX(grace end, Phase 1 completion) — not year 0
 * 2. Dynamic allocation: as each phase opens, its footprint joins the pool
 * 3. Payback period + Peak Negative CF added to consolidated output
 * 4. Returns landRentMeta for debug/settings display
 * 5. Validation: warns if asset duration > phase completionMonth
 *
 * Dependencies: Layer B (computeAssetSchedules), Layer 0 (calcIRR, calcNPV)
 */

const { calcIRR, calcNPV } = require('./calcUtils.cjs');
const { computeAssetSchedules } = require('./assets.cjs');

// ── Compute phase completion year (0-indexed) from project phases + asset schedules ──

function getPhaseCompletionYears(project, assetSchedules) {
  const phases = project.phases || [];
  const result = {};

  phases.forEach(ph => {
    if (ph.completionMonth && ph.completionMonth > 0) {
      result[ph.name] = Math.ceil(ph.completionMonth / 12);
    } else {
      // Legacy: find max construction end for this phase's assets
      const phaseAssets = assetSchedules.filter(a => (a.phase || 'Phase 1') === ph.name);
      let maxEnd = 0;
      phaseAssets.forEach(a => {
        const lastCapex = a.capexSchedule.reduce((last, v, i) => v > 0 ? i + 1 : last, 0);
        maxEnd = Math.max(maxEnd, lastCapex);
      });
      result[ph.name] = maxEnd;
    }
  });

  // Handle "Unphased" assets
  const unphasedAssets = assetSchedules.filter(a => {
    const pName = a.phase || 'Unphased';
    return !phases.some(ph => ph.name === pName);
  });
  if (unphasedAssets.length > 0) {
    let maxEnd = 0;
    unphasedAssets.forEach(a => {
      const lastCapex = a.capexSchedule.reduce((last, v, i) => v > 0 ? i + 1 : last, 0);
      maxEnd = Math.max(maxEnd, lastCapex);
    });
    result['Unphased'] = maxEnd;
  }

  return result;
}

// ── Compute footprint per phase ──

function getPhaseFootprints(project, assetSchedules) {
  const result = {};
  const phaseNames = [...new Set(assetSchedules.map(a => a.phase || 'Unphased'))];
  phaseNames.forEach(pName => {
    result[pName] = assetSchedules
      .filter(a => (a.phase || 'Unphased') === pName)
      .reduce((s, a) => s + (a.footprint || 0), 0);
  });
  return result;
}

// ── Land Rent Schedule (v2: dynamic allocation) ──

function computeLandSchedule(project, horizon, assetSchedules) {
  const totalSch = new Array(horizon).fill(0);
  const phaseAllocations = {};
  const phaseNames = [...new Set(assetSchedules.map(a => a.phase || 'Unphased'))];
  phaseNames.forEach(pn => { phaseAllocations[pn] = new Array(horizon).fill(0); });

  // Purchase: price goes to CAPEX (year 0), not land rent
  if (project.landType === 'purchase') {
    return {
      schedule: totalSch, // stays zero — purchase is CAPEX not rent
      phaseAllocations,
      landPurchaseCapex: project.landPurchasePrice || 0,
      meta: { rentStartYear: 0, graceEnd: 0, phaseCompletionYears: {}, phaseShares: {} }
    };
  }

  // Non-lease types: no land rent
  if (project.landType !== 'lease') {
    return {
      schedule: totalSch,
      phaseAllocations,
      meta: { rentStartYear: 0, graceEnd: 0, phaseCompletionYears: {}, phaseShares: {} }
    };
  }

  // ── Lease land rent with dynamic phase allocation ──
  const base = project.landRentAnnual || 0;
  if (base <= 0) {
    return {
      schedule: totalSch,
      phaseAllocations,
      meta: { rentStartYear: 0, graceEnd: 0, phaseCompletionYears: {}, phaseShares: {} }
    };
  }

  const grace = project.landRentGrace || 0;
  const eN = Math.max(1, project.landRentEscalationEveryN ?? 5);
  const eP = (project.landRentEscalation || 0) / 100;
  const term = Math.min(project.landRentTerm || 50, horizon);

  const phaseCompletionYears = getPhaseCompletionYears(project, assetSchedules);
  const phaseFootprints = getPhaseFootprints(project, assetSchedules);

  // Sort phases by completion year
  const sortedPhases = Object.entries(phaseCompletionYears)
    .sort((a, b) => a[1] - b[1]);

  const phase1CompletionYear = sortedPhases.length > 0 ? sortedPhases[0][1] : 0;

  // Lease contract start (absolute year). 0 = same as project start.
  const startYear = project.startYear || 2026;
  const leaseStartAbsolute = (project.landLeaseStartYear || 0) > 0 ? project.landLeaseStartYear : startYear;
  const graceEndIdx = Math.max(0, (leaseStartAbsolute + grace) - startYear);

  // First income year
  let firstIncomeYear = horizon;
  assetSchedules.forEach(a => {
    const fy = a.revenueSchedule.findIndex(v => v > 0);
    if (fy >= 0 && fy < firstIncomeYear) firstIncomeYear = fy;
  });
  if (firstIncomeYear >= horizon) firstIncomeYear = phase1CompletionYear;

  const startRule = project.landRentStartRule || "auto";
  const graceEnd = grace;
  let rentStartYear;
  if (startRule === "grace") {
    rentStartYear = graceEndIdx;
  } else if (startRule === "income") {
    rentStartYear = firstIncomeYear;
  } else {
    rentStartYear = Math.min(graceEndIdx, firstIncomeYear);
  }

  const totalFootprint = Object.values(phaseFootprints).reduce((s,v) => s+v, 0);
  const phaseSharesLog = {};

  for (let y = 0; y < term; y++) {
    if (y < rentStartYear) continue;

    const yearsFromRentStart = y - rentStartYear;
    const rentThisYear = base * Math.pow(1 + eP, Math.floor(yearsFromRentStart / eN));
    totalSch[y] = rentThisYear;

    // Which phases are open?
    let activeFootprint = 0;
    const activePhases = [];
    sortedPhases.forEach(([pName, completionYr]) => {
      if (y >= completionYr) { activePhases.push(pName); activeFootprint += phaseFootprints[pName] || 0; }
    });

    if (activePhases.length > 0 && activeFootprint > 0) {
      activePhases.forEach(pName => {
        const share = (phaseFootprints[pName] || 0) / activeFootprint;
        phaseAllocations[pName][y] = rentThisYear * share;
        if (!phaseSharesLog[pName]) {
          phaseSharesLog[pName] = { footprint: phaseFootprints[pName] || 0, completionYear: phaseCompletionYears[pName], firstRentYear: y, shareAtOpen: share };
        }
      });
    } else if (totalFootprint > 0) {
      // No phase opened yet — allocate to ALL phases by footprint
      const phNames = [...new Set(assetSchedules.map(a => a.phase || 'Unphased'))];
      phNames.forEach(pName => {
        const share = (phaseFootprints[pName] || 0) / totalFootprint;
        phaseAllocations[pName][y] = rentThisYear * share;
      });
    }
  }

  return {
    schedule: totalSch,
    phaseAllocations,
    meta: {
      rentStartYear,
      graceEnd,
      graceEndIdx,
      leaseStartAbsolute,
      phase1CompletionYear,
      firstIncomeYear,
      startRule,
      phaseCompletionYears,
      phaseFootprints,
      phaseShares: phaseSharesLog,
      escalationEveryN: eN,
      escalationPct: eP * 100,
      annualBase: base,
      term,
    }
  };
}

// ── Phase Aggregation (v2: uses pre-computed land allocations) ──

function computePhaseResults(assetSchedules, landResult, horizon) {
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

    const pLand = landResult.phaseAllocations[pName] || new Array(horizon).fill(0);
    const totalFP = assetSchedules.reduce((s, a) => s + (a.footprint || 0), 0);
    const pFP = pa.reduce((s, a) => s + (a.footprint || 0), 0);
    const alloc = totalFP > 0 ? pFP / totalFP : phaseNames.length > 0 ? 1 / phaseNames.length : 0;

    // Add land purchase CAPEX to year 0 (allocated by footprint)
    const landPurchaseCapex = landResult.landPurchaseCapex || 0;
    if (landPurchaseCapex > 0) cap[0] += landPurchaseCapex * alloc;

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

// ── Consolidated (v2: adds payback + peak negative) ──

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

  let cumCF = 0, paybackYear = null, peakNegative = 0, peakNegativeYear = 0;
  for (let y = 0; y < horizon; y++) {
    cumCF += cn[y];
    if (cumCF < peakNegative) { peakNegative = cumCF; peakNegativeYear = y; }
    if (paybackYear === null && cumCF >= 0 && y > 0) { paybackYear = y; }
  }

  return {
    income: ci, capex: cc, landRent: cl, netCF: cn,
    totalCapex: cc.reduce((a, b) => a + b, 0),
    totalIncome: ci.reduce((a, b) => a + b, 0),
    totalLandRent: cl.reduce((a, b) => a + b, 0),
    totalNetCF: cn.reduce((a, b) => a + b, 0),
    irr: calcIRR(cn),
    npv10: calcNPV(cn, 0.10), npv12: calcNPV(cn, 0.12), npv14: calcNPV(cn, 0.14),
    paybackYear, peakNegative, peakNegativeYear,
  };
}

// ── Validation ──

function validateCashFlow(project, assetSchedules) {
  const warnings = [];
  const phases = project.phases || [];
  (project.assets || []).forEach((asset, i) => {
    const assetPhase = phases.find(ph => ph.name === (asset.phase || 'Phase 1'));
    if (assetPhase?.completionMonth && (asset.constrDuration || 12) > assetPhase.completionMonth) {
      warnings.push({
        type: 'duration_exceeds_phase',
        severity: 'error',
        asset: asset.name || `Asset ${i + 1}`,
        phase: assetPhase.name,
        assetDuration: asset.constrDuration,
        phaseCompletion: assetPhase.completionMonth,
        message: `"${asset.name || 'Asset ' + (i+1)}" build (${asset.constrDuration}mo) > ${assetPhase.name} opens (${assetPhase.completionMonth}mo)`,
      });
    }
  });
  return warnings;
}

// ── Full Unlevered Cash Flow (v2) ──

function computeUnleveredCashFlows(project) {
  const horizon = project.horizon || 50;
  const startYear = project.startYear || 2026;

  const assetSchedules = computeAssetSchedules(project);
  const warnings = validateCashFlow(project, assetSchedules);
  const landResult = computeLandSchedule(project, horizon, assetSchedules);
  const phaseResults = computePhaseResults(assetSchedules, landResult, horizon);
  const consolidated = computeConsolidated(phaseResults, horizon);

  return {
    assetSchedules, phaseResults,
    landSchedule: landResult.schedule,
    landRentMeta: landResult.meta,
    startYear, horizon, consolidated, warnings,
  };
}

module.exports = {
  computeLandSchedule, getPhaseCompletionYears, getPhaseFootprints,
  computePhaseResults, computeConsolidated,
  computeUnleveredCashFlows, validateCashFlow,
};
