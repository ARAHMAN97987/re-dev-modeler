/**
 * ZAN Engine — Layer B: Asset Program
 * Per-asset CAPEX schedule, revenue schedule (Lease/Operating/Sale),
 * Hotel operating P&L, Marina P&L.
 *
 * Source: App.jsx lines 491-524, 693-773
 * EXACT COPY — no modifications to formulas.
 */

const { getScenarioMults } = require('./inputs.cjs');

// ── Defaults ──

const defaultHotelPL = () => ({
  keys: 0, adr: 0, stabOcc: 70, daysYear: 365,
  roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2,
  roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50,
  undistPct: 29, fixedPct: 9
});

const defaultMarinaPL = () => ({
  berths: 0, avgLength: 14, unitPrice: 2063, stabOcc: 90,
  fuelPct: 25, otherRevPct: 10,
  berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30
});

// ── P&L Calculations ──

function calcHotelEBITDA(h) {
  const roomsRev = (h.keys || 0) * (h.adr || 0) * ((h.stabOcc || 0) / 100) * (h.daysYear || 365);
  const totalRev = (h.roomsPct || 0) > 0 ? roomsRev / ((h.roomsPct || 72) / 100) : 0;
  const fbRev = totalRev * ((h.fbPct || 0) / 100);
  const miceRev = totalRev * ((h.micePct || 0) / 100);
  const otherRev = totalRev * ((h.otherPct || 0) / 100);
  const roomExp = roomsRev * ((h.roomExpPct || 0) / 100);
  const fbExp = fbRev * ((h.fbExpPct || 0) / 100);
  const miceExp = miceRev * ((h.miceExpPct || 0) / 100);
  const otherExp = otherRev * ((h.otherExpPct || 0) / 100);
  const undist = totalRev * ((h.undistPct || 0) / 100);
  const fixed = totalRev * ((h.fixedPct || 0) / 100);
  const totalOpex = roomExp + fbExp + miceExp + otherExp + undist + fixed;
  const ebitda = totalRev - totalOpex;
  return {
    roomsRev, totalRev, fbRev, miceRev, otherRev,
    roomExp, fbExp, miceExp, otherExp, undist, fixed,
    totalOpex, ebitda,
    margin: totalRev > 0 ? ebitda / totalRev : 0
  };
}

function calcMarinaEBITDA(m) {
  const berthingRev = (m.berths || 0) * (m.avgLength || 0) * (m.unitPrice || 0) * ((m.stabOcc || 0) / 100);
  const berthingPct = 100 - (m.fuelPct || 0) - (m.otherRevPct || 0);
  const totalRev = berthingPct > 0 ? berthingRev / (berthingPct / 100) : 0;
  const fuelRev = totalRev * ((m.fuelPct || 0) / 100);
  const otherRev = totalRev * ((m.otherRevPct || 0) / 100);
  const berthingOpex = berthingRev * ((m.berthingOpexPct || 0) / 100);
  const fuelOpex = fuelRev * ((m.fuelOpexPct || 0) / 100);
  const otherOpex = otherRev * ((m.otherOpexPct || 0) / 100);
  const totalOpex = berthingOpex + fuelOpex + otherOpex;
  const ebitda = totalRev - totalOpex;
  return {
    berthingRev, totalRev, fuelRev, otherRev,
    berthingOpex, fuelOpex, otherOpex,
    totalOpex, ebitda,
    margin: totalRev > 0 ? ebitda / totalRev : 0
  };
}

// ── CAPEX per asset ──

function computeAssetCapex(asset, project) {
  const { cm } = getScenarioMults(project);
  return (asset.gfa || 0) * (asset.costPerSqm || 0)
    * (1 + (project.softCostPct || 0) / 100)
    * (1 + (project.contingencyPct || 0) / 100) * cm;
}

// ── Asset Schedules ──
// Computes per-asset CAPEX and Revenue year-by-year arrays.
// Source: App.jsx computeProjectCashFlows lines 700-773 (the assetSchedules map)

function computeAssetSchedules(project) {
  const { cm, rm, dm, ea } = getScenarioMults(project);
  const horizon = project.horizon || 50;
  const projectEsc = (project.rentEscalation ?? 0);

  return (project.assets || []).map(asset => {
    const assetEsc = (asset.escalation ?? projectEsc);
    const effEsc = Math.max(-0.99, (assetEsc + ea) / 100);
    const totalCapex = computeAssetCapex(asset, project);
    const durYears = Math.ceil((asset.constrDuration || 12) / 12);
    const delayYears = Math.ceil(dm / 12);
    const ramp = Math.max(1, asset.rampUpYears ?? 3);
    const occ = (asset.stabilizedOcc != null ? asset.stabilizedOcc : 100) / 100;
    const eff = (asset.efficiency || 0) / 100;
    const leasableArea = (asset.gfa || 0) * eff;
    const leaseRate = (asset.leaseRate || 0) * rm;
    const opEbitda = (asset.opEbitda || 0) * rm;
    const capexSch = new Array(horizon).fill(0);
    const revSch = new Array(horizon).fill(0);
    const cStart = (() => {
      // NEW: Calculate start from phase completionMonth (all assets in phase finish together)
      const assetPhase = (project.phases || []).find(ph => ph.name === (asset.phase || 'Phase 1'));
      if (assetPhase?.completionMonth) {
        const phaseEndYear = Math.ceil(assetPhase.completionMonth / 12);
        return Math.max(0, phaseEndYear - durYears) + delayYears;
      }
      return (asset.constrStart || 1) - 1 + delayYears; // Legacy fallback
    })();

    // CAPEX spread
    if (durYears > 0 && totalCapex > 0) {
      const ann = totalCapex / durYears;
      for (let y = cStart; y < cStart + durYears && y < horizon; y++) {
        if (y >= 0) capexSch[y] = ann;
      }
    }

    // Revenue
    const revStart = cStart + durYears;
    const botYrs = project.landType === "bot" ? (project.botOperationYears || horizon) : horizon;
    const revEnd = Math.min(revStart + botYrs, horizon);

    if (asset.revType === "Lease" && leasableArea > 0 && leaseRate > 0) {
      for (let y = revStart; y < revEnd; y++) {
        const yrs = y - revStart;
        revSch[y] = leasableArea * leaseRate * occ
          * Math.min(1, (yrs + 1) / ramp)
          * Math.pow(1 + effEsc, yrs);
      }
    } else if (asset.revType === "Operating" && opEbitda > 0) {
      for (let y = revStart; y < revEnd; y++) {
        const yrs = y - revStart;
        revSch[y] = opEbitda * Math.min(1, (yrs + 1) / ramp) * Math.pow(1 + effEsc, yrs);
      }
    } else if (asset.revType === "Sale") {
      const salePriceSqm = (asset.salePricePerSqm || 0) * rm;
      const sellableArea = (asset.gfa || 0) * ((asset.efficiency ?? 100) / 100);
      const totalSaleValue = sellableArea * salePriceSqm;
      const absorptionYears = Math.max(1, asset.absorptionYears || 3);
      const commissionPct = Math.min(1, Math.max(0, (asset.commissionPct || 0) / 100));
      const preSalePct = Math.min(1, Math.max(0, (asset.preSalePct || 0) / 100));
      // Pre-sales during construction
      if (preSalePct > 0 && cStart + durYears - 1 >= 0 && cStart + durYears - 1 < horizon) {
        const preSaleAmt = totalSaleValue * preSalePct * (1 - commissionPct);
        revSch[cStart + durYears - 1] = preSaleAmt;
      }
      // Post-construction absorption
      const remainingValue = totalSaleValue * (1 - preSalePct);
      const annualSales = absorptionYears > 0 ? remainingValue / absorptionYears : remainingValue;
      for (let y = revStart; y < Math.min(revStart + absorptionYears, revEnd); y++) {
        const yrs = y - revStart;
        revSch[y] += annualSales * (1 - commissionPct) * Math.pow(1 + effEsc, yrs);
      }
    }

    return {
      ...asset,
      totalCapex,
      leasableArea,
      capexSchedule: capexSch,
      revenueSchedule: revSch,
      totalRevenue: revSch.reduce((a, b) => a + b, 0),
    };
  });
}

module.exports = {
  defaultHotelPL, defaultMarinaPL,
  calcHotelEBITDA, calcMarinaEBITDA,
  computeAssetCapex, computeAssetSchedules,
};
