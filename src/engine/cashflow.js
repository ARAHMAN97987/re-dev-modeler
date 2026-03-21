/**
 * ZAN Financial Engine — Project Cash Flow Calculator
 * @module engine/cashflow
 * 
 * Dependencies: engine/math.js, engine/hospitality.js
 * This is the FOUNDATION - all other engine modules depend on its output.
 */

import { calcIRR, calcNPV } from './math.js';
import { calcHotelEBITDA, calcMarinaEBITDA } from './hospitality.js';

export function getScenarioMults(p) {
  let cm=1,rm=1,dm=0,ea=0;
  const s = p.activeScenario;
  if (s==="CAPEX +10%") cm=1.1; else if (s==="CAPEX -10%") cm=0.9;
  else if (s==="Rent +10%") rm=1.1; else if (s==="Rent -10%") rm=0.9;
  else if (s==="Delay +6 months") dm=6;
  else if (s==="Escalation +0.5%") ea=0.5; else if (s==="Escalation -0.5%") ea=-0.5;
  else if (s==="Custom") { cm=(p.customCapexMult??100)/100; rm=(p.customRentMult??100)/100; dm=p.customDelay??0; ea=p.customEscAdj??0; }
  return {cm,rm,dm,ea};
}

export function computeAssetCapex(asset, project) {
  const {cm} = getScenarioMults(project);
  return (asset.gfa||0) * (asset.costPerSqm||0) * (1+(project.softCostPct||0)/100) * (1+(project.contingencyPct||0)/100) * cm;
}

export function computeProjectCashFlows(project) {
  const {cm,rm,dm,ea} = getScenarioMults(project);
  const horizon = project.horizon || 50;
  const startYear = project.startYear || 2026;
  const projectEsc = (project.rentEscalation ?? 0);

  const assetSchedules = (project.assets || []).map(asset => {
    const assetEsc = (asset.escalation ?? projectEsc);
    const effEsc = Math.max(-0.99, (assetEsc + ea) / 100);
    const totalCapex = computeAssetCapex(asset, project);
    const durYears = Math.ceil((asset.constrDuration||12) / 12); // H12: Duration unchanged by delay
    const delayYears = Math.ceil(dm / 12); // H12: Delay shifts start
    const ramp = Math.max(1, asset.rampUpYears ?? 3);
    const occ = (asset.stabilizedOcc != null ? asset.stabilizedOcc : 100) / 100;
    const eff = (asset.efficiency || 0) / 100;
    const leasableArea = (asset.gfa || 0) * eff;
    const leaseRate = (asset.leaseRate || 0) * rm;
    const opEbitda = (asset.opEbitda || 0) * rm;
    const capexSch = new Array(horizon).fill(0);
    const revSch = new Array(horizon).fill(0);
    const cStart = (() => {
      // Use asset's own constrStart if set (matches ZAN Excel per-asset timing)
      if ((asset.constrStart || 0) > 0) {
        return (asset.constrStart - 1) + delayYears;
      }
      // Fallback: derive from phase completionMonth if available
      const assetPhase = (project.phases || []).find(ph => ph.name === (asset.phase || 'Phase 1'));
      if (assetPhase?.completionMonth) {
        const phaseEndYear = Math.ceil(assetPhase.completionMonth / 12);
        return Math.max(0, phaseEndYear - durYears) + delayYears;
      }
      return delayYears; // Last resort
    })();

    if (durYears > 0 && totalCapex > 0) {
      const ann = totalCapex / durYears;
      for (let y = cStart; y < cStart + durYears && y < horizon; y++) if (y >= 0) capexSch[y] = ann;
    }

    const revStart = cStart + durYears;
    // H15: BOT limits revenue to operation period
    const botYrs = project.landType === "bot" ? (project.botOperationYears || horizon) : horizon;
    const revEnd = Math.min(revStart + botYrs, horizon);
    if (asset.revType === "Lease" && leasableArea > 0 && leaseRate > 0) {
      for (let y = revStart; y < revEnd; y++) {
        const yrs = y - revStart;
        revSch[y] = leasableArea * leaseRate * occ * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
      }
    } else if (asset.revType === "Operating" && opEbitda > 0) {
      for (let y = revStart; y < revEnd; y++) {
        const yrs = y - revStart;
        revSch[y] = opEbitda * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
      }
    } else if (asset.revType === "Sale") {
      // H1: Unit sale revenue - absorption over N years after construction
      const salePriceSqm = (asset.salePricePerSqm || 0) * rm;
      const sellableArea = (asset.gfa || 0) * ((asset.efficiency ?? 100) / 100);
      const totalSaleValue = sellableArea * salePriceSqm;
      const absorptionYears = Math.max(1, asset.absorptionYears || 3);
      const commissionPct = Math.min(1, Math.max(0, (asset.commissionPct || 0) / 100));
      const preSalePct = Math.min(1, Math.max(0, (asset.preSalePct || 0) / 100));
      // Pre-sales during construction (last year of construction)
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

    return { ...asset, totalCapex, leasableArea, capexSchedule: capexSch, revenueSchedule: revSch, totalRevenue: revSch.reduce((a,b)=>a+b,0) };
  });

  // ── Land Rent (v2: dynamic phase allocation) ──
  const landSch = new Array(horizon).fill(0);
  const phaseAllocLand = {};
  const phaseNames = [...new Set([
    ...(project.assets || []).map(a => a.phase || "Unphased"),
    ...(project.phases || []).map(p => p.name),
  ])];
  phaseNames.forEach(pn => { phaseAllocLand[pn] = new Array(horizon).fill(0); });
  let landRentMeta = { rentStartYear: 0, graceEnd: 0, phaseCompletionYears: {}, phaseShares: {} };

  if (project.landType === "lease" && (project.landRentAnnual || 0) > 0) {
    const base = project.landRentAnnual;
    const gr = project.landRentGrace || 0;
    const eN = Math.max(1, project.landRentEscalationEveryN ?? 5);
    const eP = (project.landRentEscalation || 0) / 100;
    const term = Math.min(project.landRentTerm || 50, horizon);

    // Phase completion years
    const phaseCompYrs = {};
    (project.phases || []).forEach(ph => {
      if (ph.completionMonth && ph.completionMonth > 0) {
        phaseCompYrs[ph.name] = Math.ceil(ph.completionMonth / 12);
      } else {
        const pa = assetSchedules.filter(a => (a.phase || 'Phase 1') === ph.name);
        let mx = 0;
        pa.forEach(a => { const lc = a.capexSchedule.reduce((l,v,i) => v > 0 ? i+1 : l, 0); mx = Math.max(mx, lc); });
        phaseCompYrs[ph.name] = mx;
      }
    });

    // Phase footprints
    const phaseFP = {};
    phaseNames.forEach(pn => { phaseFP[pn] = assetSchedules.filter(a=>(a.phase||"Unphased")===pn).reduce((s,a)=>s+(a.footprint||0),0); });
    const totalFootprint = Object.values(phaseFP).reduce((s,v)=>s+v, 0);

    const sortedPh = Object.entries(phaseCompYrs).sort((a,b) => a[1]-b[1]);
    const phase1Year = sortedPh.length > 0 ? sortedPh[0][1] : 0;

    // Lease contract start (absolute year). 0 = same as project start.
    const leaseStartAbsolute = (project.landLeaseStartYear || 0) > 0 ? project.landLeaseStartYear : startYear;
    // Grace end in model index (0-based from project startYear)
    // Note: grace period is contractual (fixed). Construction delay does NOT auto-extend it.
    // If user wants longer grace, they adjust landRentGrace manually.
    const graceEndIdx = Math.max(0, (leaseStartAbsolute + gr) - startYear);

    // First income year (when any asset starts generating revenue)
    let firstIncomeYear = horizon;
    assetSchedules.forEach(a => {
      const fy = a.revenueSchedule.findIndex(v => v > 0);
      if (fy >= 0 && fy < firstIncomeYear) firstIncomeYear = fy;
    });
    if (firstIncomeYear >= horizon) firstIncomeYear = phase1Year;

    // Land rent start rule: auto | grace | income
    const startRule = project.landRentStartRule || "auto";
    let rentStartYear;
    if (startRule === "grace") {
      rentStartYear = graceEndIdx;
    } else if (startRule === "income") {
      rentStartYear = firstIncomeYear;
    } else {
      // auto: whichever comes first (MIN)
      rentStartYear = Math.min(graceEndIdx, firstIncomeYear);
    }

    const phaseSharesLog = {};

    // Manual allocation override: user sets percentage per phase
    const manualAlloc = project.landRentManualAlloc; // e.g. {"Phase 1":60,"Phase 2":40}
    const useManual = manualAlloc && typeof manualAlloc === 'object' && Object.keys(manualAlloc).length > 0;
    const manualSum = useManual ? Object.values(manualAlloc).reduce((s,v) => s + (Number(v)||0), 0) : 0;

    for (let y = 0; y < term; y++) {
      if (y < rentStartYear) continue;
      const yrsFromStart = y - rentStartYear;
      const rent = base * Math.pow(1 + eP, Math.floor(yrsFromStart / eN));
      landSch[y] = rent;

      if (useManual) {
        // Manual: user-defined percentages
        phaseNames.forEach(pn => {
          const pct = (Number(manualAlloc[pn]) || 0) / 100;
          phaseAllocLand[pn][y] = rent * pct;
          if (!phaseSharesLog[pn]) phaseSharesLog[pn] = { footprint: phaseFP[pn]||0, completionYear: phaseCompYrs[pn], share: pct, firstRentYear: y, manual: true };
        });
      } else if (totalFootprint > 0) {
        // Auto: all phases by footprint proportion
        phaseNames.forEach(pn => {
          const share = (phaseFP[pn] || 0) / totalFootprint;
          phaseAllocLand[pn][y] = rent * share;
          if (!phaseSharesLog[pn]) phaseSharesLog[pn] = { footprint: phaseFP[pn]||0, completionYear: phaseCompYrs[pn], share, firstRentYear: y };
        });
      } else if (phaseNames.length > 0) {
        const share = 1 / phaseNames.length;
        phaseNames.forEach(pn => {
          phaseAllocLand[pn][y] = rent * share;
          if (!phaseSharesLog[pn]) phaseSharesLog[pn] = { footprint: 0, completionYear: phaseCompYrs[pn], share, firstRentYear: y };
        });
      }
    }
    landRentMeta = { rentStartYear, graceEndIdx, leaseStartAbsolute, phase1CompletionYear: phase1Year, firstIncomeYear, startRule, useManual, manualSum, phaseCompletionYears: phaseCompYrs, phaseFootprints: phaseFP, phaseShares: phaseSharesLog, escalationEveryN: eN, escalationPct: eP*100, annualBase: base, term };
  } else if (project.landType === "purchase") {
    // Purchase price goes to CAPEX (year 0), NOT land rent
    // landSch stays zero — purchase is capital expenditure, not ongoing rent
  }

  // Land purchase CAPEX: added to phase CAPEX in year 0
  const landPurchaseCapex = (project.landType === "purchase") ? (project.landPurchasePrice || 0) : 0;

  // ── Phase Results (using pre-computed land allocations) ──
  const phaseResults = {};
  phaseNames.forEach(pName => {
    const pa = assetSchedules.filter(a => (a.phase || "Unphased") === pName);
    const inc = new Array(horizon).fill(0), cap = new Array(horizon).fill(0);
    pa.forEach(a => { for (let y=0;y<horizon;y++) { inc[y]+=a.revenueSchedule[y]; cap[y]+=a.capexSchedule[y]; }});
    const totalFP = assetSchedules.reduce((s,a)=>s+(a.footprint||0),0);
    const pFP = pa.reduce((s,a)=>s+(a.footprint||0),0);
    const alloc = totalFP > 0 ? pFP/totalFP : phaseNames.length > 0 ? 1/phaseNames.length : 0;
    // Add land purchase CAPEX to year 0 (allocated by footprint)
    if (landPurchaseCapex > 0) cap[0] += landPurchaseCapex * alloc;
    const pLand = phaseAllocLand[pName] || new Array(horizon).fill(0);
    const net = new Array(horizon).fill(0);
    for (let y=0;y<horizon;y++) net[y] = inc[y] - pLand[y] - cap[y];
    phaseResults[pName] = {
      income:inc, capex:cap, landRent:pLand, netCF:net,
      totalCapex: cap.reduce((a,b)=>a+b,0), totalIncome: inc.reduce((a,b)=>a+b,0),
      totalLandRent: pLand.reduce((a,b)=>a+b,0), totalNetCF: net.reduce((a,b)=>a+b,0),
      irr: calcIRR(net), assetCount: pa.length, footprint: pFP, allocPct: alloc,
    };
  });

  const ci = new Array(horizon).fill(0), cc = new Array(horizon).fill(0), cl = new Array(horizon).fill(0), cn = new Array(horizon).fill(0);
  Object.values(phaseResults).forEach(pr => { for (let y=0;y<horizon;y++) { ci[y]+=pr.income[y]; cc[y]+=pr.capex[y]; cl[y]+=pr.landRent[y]; cn[y]+=pr.netCF[y]; }});

  // Payback + Peak Negative
  let cumCF = 0, paybackYear = null, peakNegative = 0, peakNegativeYear = 0, _pbWasNeg = false;
  for (let y = 0; y < horizon; y++) {
    cumCF += cn[y];
    if (cumCF < peakNegative) { peakNegative = cumCF; peakNegativeYear = y; }
    if (cumCF < -1) _pbWasNeg = true;
    if (paybackYear === null && _pbWasNeg && cumCF >= 0) { paybackYear = y; }
  }

  return {
    assetSchedules, phaseResults, landSchedule: landSch, landRentMeta, startYear, horizon,
    consolidated: {
      income:ci, capex:cc, landRent:cl, netCF:cn,
      totalCapex:cc.reduce((a,b)=>a+b,0), totalIncome:ci.reduce((a,b)=>a+b,0),
      totalLandRent:cl.reduce((a,b)=>a+b,0), totalNetCF:cn.reduce((a,b)=>a+b,0),
      irr:calcIRR(cn), npv10:calcNPV(cn,0.10), npv12:calcNPV(cn,0.12), npv14:calcNPV(cn,0.14),
      paybackYear, peakNegative, peakNegativeYear,
    },
  };
}

