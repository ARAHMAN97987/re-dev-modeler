/**
 * ZAN Financial Engine — Government Incentives Calculator
 * @module engine/incentives
 * 
 * Dependencies: engine/math.js (calcIRR, calcNPV)
 * Used by: financing.js (applyInterestSubsidy), phases.js, App.jsx
 */

import { calcIRR, calcNPV } from './math.js';

export function computeIncentives(project, projectResults) {
  if (!project || !projectResults) return null;
  const h = project.horizon || 50;
  const inc = project.incentives || {};
  const c = projectResults.consolidated;

  let constrEnd = 0;
  for (let y = h-1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }

  const result = {
    capexGrantTotal: 0, capexGrantSchedule: new Array(h).fill(0),
    interestSubsidyTotal: 0, interestSubsidySchedule: new Array(h).fill(0),
    softLoanDrawdown: new Array(h).fill(0), softLoanRepay: new Array(h).fill(0), softLoanBalance: new Array(h).fill(0),
    landRentSavingTotal: 0, landRentSavingSchedule: new Array(h).fill(0), adjustedLandRent: [...(c.landRent || [])],
    feeRebateTotal: 0, feeRebateSchedule: new Array(h).fill(0),
    totalIncentiveValue: 0,
    adjustedCapex: [...c.capex],
    netCFImpact: new Array(h).fill(0),
  };

  // ── 1. CAPEX Grant ──
  if (inc.capexGrant?.enabled) {
    const g = inc.capexGrant;
    const rawGrant = c.totalCapex * (g.grantPct || 0) / 100;
    const grantAmt = Math.min(rawGrant, g.maxCap || Infinity);
    result.capexGrantTotal = grantAmt;
    if (g.timing === "construction" && constrEnd >= 0) {
      const totalEligibleCapex = c.capex.reduce((s, v) => s + (v > 0 ? v : 0), 0);
      if (totalEligibleCapex > 0) {
        for (let y = 0; y < h; y++) {
          if (c.capex[y] > 0) {
            const alloc = grantAmt * (c.capex[y] / totalEligibleCapex);
            result.capexGrantSchedule[y] = alloc;
            result.adjustedCapex[y] -= alloc;
          }
        }
      }
    } else {
      result.capexGrantSchedule[Math.min(constrEnd + 1, h - 1)] = grantAmt;
      const totalEligibleCapex = c.capex.reduce((s, v) => s + (v > 0 ? v : 0), 0);
      if (totalEligibleCapex > 0) {
        for (let y = 0; y < h; y++) {
          if (c.capex[y] > 0) {
            result.adjustedCapex[y] -= grantAmt * (c.capex[y] / totalEligibleCapex);
          }
        }
      }
    }
  }

  // ── 2. Land Rent Rebate ──
  if (inc.landRentRebate?.enabled && project.landType === "lease") {
    const lr = inc.landRentRebate;
    let constrStart = 0;
    for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { constrStart = y; break; } }
    const constrYrs = lr.constrRebateYears > 0 ? lr.constrRebateYears : constrEnd - constrStart + 1;
    const constrPct = (lr.constrRebatePct || 0) / 100;
    const operPct = (lr.operRebatePct || 0) / 100;
    const operYrs = lr.operRebateYears || 0;
    const constrWindowEnd = constrStart + constrYrs;
    for (let y = 0; y < h; y++) {
      let rebatePct = 0;
      if (y >= constrStart && y < constrWindowEnd) rebatePct = constrPct;
      else if (y >= constrWindowEnd && y < constrWindowEnd + operYrs) rebatePct = operPct;
      const saving = Math.abs(c.landRent[y] || 0) * rebatePct;
      result.landRentSavingSchedule[y] = saving;
      result.adjustedLandRent[y] = Math.max(0, (c.landRent[y] || 0) - saving);
      result.landRentSavingTotal += saving;
    }
  }

  // ── 3. Fee/Tax Rebates ──
  if (inc.feeRebates?.enabled && inc.feeRebates.items?.length > 0) {
    for (const item of inc.feeRebates.items) {
      const amt = item.amount || 0;
      const yr = Math.max(0, Math.min((item.year || 1) - 1, h - 1));
      if (item.type === "rebate") {
        result.feeRebateSchedule[yr] += amt;
        result.feeRebateTotal += amt;
      } else if (item.type === "deferral") {
        const deferYrs = Math.ceil((item.deferralMonths || 12) / 12);
        const newYr = Math.min(yr + deferYrs, h - 1);
        result.feeRebateSchedule[yr] += amt;
        result.feeRebateSchedule[newYr] -= amt;
        const benefit = amt - amt / Math.pow(1.1, deferYrs);
        result.feeRebateTotal += benefit;
      }
    }
  }

  // ── Net CF Impact ──
  for (let y = 0; y < h; y++) {
    result.netCFImpact[y] = result.capexGrantSchedule[y] + result.landRentSavingSchedule[y] + result.feeRebateSchedule[y];
  }
  result.totalIncentiveValue = result.capexGrantTotal + result.landRentSavingTotal + result.feeRebateTotal;

  // ── Finance Support value (estimate for display) ──
  const fs = project.incentives?.financeSupport;
  if (fs?.enabled) {
    if (fs.subType === 'interestSubsidy') {
      result.finSupportEstimate = true;
    } else if (fs.subType === 'softLoan') {
      const slAmt = fs.softLoanAmount || 0;
      result.softLoanAmount = slAmt;
      result.finSupportEstimate = true;
    }
  }

  // ── Adjusted CF with incentives (for correct IRR/NPV) ──
  const adjCF = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    adjCF[y] = c.netCF[y] + result.netCFImpact[y];
  }
  result.adjustedNetCF = adjCF;
  result.adjustedIRR = calcIRR(adjCF);
  result.adjustedNPV10 = calcNPV(adjCF, 0.10);
  result.adjustedNPV12 = calcNPV(adjCF, 0.12);
  result.adjustedTotalNetCF = adjCF.reduce((a, b) => a + b, 0);

  return result;
}

// Interest subsidy AND soft loan applied inside computeFinancing
export function applyInterestSubsidy(project, interest, constrEnd, totalDebt, rate) {
  const inc = project.incentives?.financeSupport;
  if (!inc?.enabled) return { adjusted: interest, savings: new Array(interest.length).fill(0), total: 0, softLoanSavings: 0 };
  const h = interest.length;
  const adjusted = [...interest];
  const savings = new Array(h).fill(0);
  let total = 0;

  if (inc.subType === "interestSubsidy") {
    let firstInterestYr = 0;
    for (let y = 0; y < h; y++) { if (interest[y] > 0) { firstInterestYr = y; break; } }
    const startYr = inc.subsidyStart === "operation" ? constrEnd + 1 : firstInterestYr;
    const endYr = startYr + (inc.subsidyYears ?? 5);
    const pct = (inc.subsidyPct || 0) / 100;
    for (let y = startYr; y < endYr && y < h; y++) {
      savings[y] = interest[y] * pct;
      adjusted[y] = interest[y] * (1 - pct);
      total += savings[y];
    }
  } else if (inc.subType === "softLoan") {
    const slAmt = Math.min(inc.softLoanAmount || 0, totalDebt);
    const slTenor = inc.softLoanTenor ?? 10;
    const slGrace = inc.softLoanGrace ?? 3;
    if (slAmt > 0 && rate > 0) {
      let firstDrawYr = 0;
      for (let y = 0; y < h; y++) { if (interest[y] > 0) { firstDrawYr = y; break; } }
      let slBalance = slAmt;
      const slRepayYrs = Math.max(1, slTenor - slGrace);
      const slAnnualRepay = slAmt / slRepayYrs;
      for (let y = firstDrawYr; y < h && slBalance > 0; y++) {
        const saving = slBalance * rate;
        savings[y] = Math.min(saving, interest[y]);
        adjusted[y] = interest[y] - savings[y];
        total += savings[y];
        if (y >= firstDrawYr + slGrace) {
          slBalance = Math.max(0, slBalance - slAnnualRepay);
        }
      }
    }
  }

  return { adjusted, savings, total, softLoanSavings: total };
}
