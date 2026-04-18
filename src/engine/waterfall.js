/**
 * ZAN Financial Engine — Waterfall Distribution Engine (Simplified)
 * @module engine/waterfall
 *
 * NEW MODEL (Apr 2026 simplification):
 *   - All equity is modeled as project.investors[] (each with role: developer | investor)
 *   - 3-stage distribution per year:
 *       Stage 1: Return of Capital pro-rata across investors with unreturned equity
 *       Stage 2: Performance Incentive (applied at settlement year if project IRR > hurdle)
 *                — developers receive incentivePct × excess, clawed back from investors
 *       Stage 3: Remaining profit pro-rata by original equity %
 *   - Income-fund mode keeps its simplified pro-rata annual distribution.
 *   - Legacy gp and lp output fields are DERIVED ALIASES (not source of truth)
 *     so existing tests + UI continue working during the migration.
 *
 * Dependencies: engine/math.js, engine/investors.js
 * Consumes: computeFinancing output + project config
 */

import { calcIRR, calcNPV } from './math.js';
import {
  migrateProjectToInvestors,
  allocateEquity,
  developerIds,
} from './investors.js';

export function computeWaterfall(project, projectResults, financing, incentivesResult) {
  if (!project || !projectResults || !financing) return null;

  // Self/Bank100/Debt modes: single developer, no profit split → no waterfall
  if (project.finMode === 'self' ||
      project.finMode === 'bank100' ||
      project.finMode === 'debt') {
    return null;
  }
  if (financing.totalEquity <= 0) return null;

  // Migrate project to investors[] shape (no-op if already migrated)
  project = migrateProjectToInvestors(project);
  const investors = project.investors || [];
  if (investors.length === 0) return null;

  const h = project.horizon || 50;
  const sy = project.startYear || 2026;
  const c = projectResults.consolidated;
  const f = financing;
  const ir = incentivesResult;

  const isIncomeFund = project.finMode === 'incomeFund';
  const isFund = project.finMode === 'fund' || project.finMode === 'hybrid' || isIncomeFund;
  const isHybridMode = project.finMode === 'hybrid';
  const isHybridGP = isHybridMode && (project.debt?.beneficiary === 'developer' ||
                                       project.govBeneficiary === 'gp');

  // Fund life validation
  const fundLife = project.fundLife || 0;
  if (isIncomeFund && fundLife > 0 && fundLife < h) {
    console.warn(`[waterfall] incomeFund: fundLife=${fundLife} < horizon=${h}. Tail distributions may be excluded.`);
  }

  // ── Equity allocation per investor ──
  const totalEquity = f.totalEquity;
  const devFeeTotal = f.devFeeTotal || 0;
  const equityAllocation = allocateEquity(investors, totalEquity, { devFeeTotal });
  const equityByInvestorId = {};
  equityAllocation.forEach(e => { equityByInvestorId[e.investorId] = e.amount; });

  // Build investor records. Equity% is normalized across investor pool (sum to 1.0)
  // so pro-rata distributions split cleanly even if investor contributions don't
  // exactly match financing.js totalEquity (which still reflects legacy "capex-based"
  // equity pool — Task 4 will align it with investor totals).
  const sumInvestorContribs = investors.reduce((s, inv) => {
    return s + (equityByInvestorId[inv.id] || 0);
  }, 0);
  const equityBase = sumInvestorContribs > 0 ? sumInvestorContribs : totalEquity;
  const records = investors.map(inv => {
    const equityAmount = equityByInvestorId[inv.id] || 0;
    return {
      id: inv.id,
      name: inv.name || inv.id,
      role: inv.role || 'investor',
      contribution: inv.contribution || {},
      equityAmount,
      equityPct: equityBase > 0 ? equityAmount / equityBase : 0,
      // Per-year arrays (filled below)
      calls: new Array(h).fill(0),
      distributions: new Array(h).fill(0),
      netCF: new Array(h).fill(0),
      // Bucketed distributions
      roc: 0,
      profitShare: 0,
      incentiveReceived: 0,
    };
  });

  const devRecords = records.filter(r => r.role === 'developer');
  const invRecords = records.filter(r => r.role === 'investor');
  const totalDevEquity = devRecords.reduce((s, r) => s + r.equityAmount, 0);
  const totalInvEquity = invRecords.reduce((s, r) => s + r.equityAmount, 0);
  const gpPct = totalEquity > 0 ? totalDevEquity / totalEquity : 0;
  const lpPct = totalEquity > 0 ? totalInvEquity / totalEquity : 0;

  // ── Fee basis ──
  const effectiveDevCost = f.buildCostOnly != null ? f.buildCostOnly : f.devCostExclLand;
  const fundFeeBasis = isHybridMode ? (f.fundPortionCost || effectiveDevCost) : effectiveDevCost;
  const fundTotalCostBasis = isHybridMode
    ? (f.fundPortionCost || f.devCostInclLand)
    : (f.devCostInclLand || effectiveDevCost);
  const fundEquityBasis = isHybridMode ? (f.fundPortionCost || totalEquity) : totalEquity;

  // ── Fund manager fees (read from fundManager sub-object with top-level fallback) ──
  const fm = project.fundManager || project;
  const subFee = isFund ? fundEquityBasis * (fm.subscriptionFeePct ?? project.subscriptionFeePct ?? 0) / 100 : 0;
  let structFee = isFund ? fundFeeBasis * (fm.structuringFeePct ?? project.structuringFeePct ?? 0) / 100 : 0;
  const structFeeCap = fm.structuringFeeCap ?? project.structuringFeeCap ?? 0;
  if (structFeeCap > 0 && structFee > structFeeCap) structFee = structFeeCap;
  const mgmtFeeBase = fm.mgmtFeeBase ?? project.mgmtFeeBase ?? 'nav';
  const mgmtFeeRate = (fm.annualFeePct ?? project.annualMgmtFeePct ?? 0) / 100;
  const mgmtFeeCap = fm.mgmtFeeCapAnnual ?? project.mgmtFeeCapAnnual ?? 0;
  const annualCustody = isFund ? (fm.custodyFeeAnnual ?? project.custodyFeeAnnual ?? 0) : 0;
  const preEstFee = isFund ? (fm.preEstablishmentFee ?? project.preEstablishmentFee ?? 0) : 0;
  const spvSetupFee = isFund ? (fm.spvFee ?? project.spvFee ?? 0) : 0;
  const auditorAnnual = isFund ? (fm.auditorFeeAnnual ?? project.auditorFeeAnnual ?? 0) : 0;

  // Operator fee: 0.15% of completed asset value, annual, only for rental/hold
  const hasRentalAssets = (project.assets || []).some(a => a.revType !== 'Sale');
  const operatorFeePct = (project.operatorFeePct || 0) / 100;
  const operatorFeeBase = hasRentalAssets ? effectiveDevCost : 0;

  // Misc expense one-time at fund start
  const miscExpensePct = (fm.miscExpensePct ?? project.miscExpensePct ?? 0) / 100;
  const miscExpenseTotal = isFund ? fundFeeBasis * miscExpensePct : 0;

  // Dev fee (project-wide) already computed in financing.js
  const feeDev = new Array(h).fill(0);
  const fDevSchedule = f.devFeeSchedule || [];
  for (let y = 0; y < h; y++) feeDev[y] = fDevSchedule[y] || 0;

  // Fee schedule arrays
  const fees = new Array(h).fill(0);
  const feeSub = new Array(h).fill(0);
  const feeMgmt = new Array(h).fill(0);
  const feeCustody = new Array(h).fill(0);
  const feeStruct = new Array(h).fill(0);
  const feePreEst = new Array(h).fill(0);
  const feeSpv = new Array(h).fill(0);
  const feeAuditor = new Array(h).fill(0);
  const feeOperator = new Array(h).fill(0);
  const feeMisc = new Array(h).fill(0);

  // Construction period
  let constrStart = h, constrEnd = 0;
  for (let y = 0; y < h; y++) {
    if (c.capex[y] > 0) {
      constrStart = Math.min(constrStart, y);
      constrEnd = Math.max(constrEnd, y);
    }
  }

  const fundStartIdx = Math.max(0,
    (project.fundStartYear || 0) > 0 ? project.fundStartYear - sy : constrStart);

  const _rawWfExit = project.exitStrategy || 'sale';
  const exitStrategy = (isIncomeFund || _rawWfExit === 'absorption') ? 'hold' : _rawWfExit;
  const optIdx = financing.optimalExitYear ? financing.optimalExitYear - sy : constrEnd + 3;
  const rawExit = project.exitYear || 0;
  const resolvedExit = rawExit > 0 && rawExit < 100 ? rawExit : rawExit > 0 ? rawExit - sy : 0;
  const exitYr = exitStrategy === 'hold' ? h - 1 : (resolvedExit > 0 ? resolvedExit : optIdx);
  const feeEndYr = exitStrategy === 'hold' ? h - 1 : exitYr;

  // One-time fees at fund start
  if (fundStartIdx < h) {
    feeSub[fundStartIdx] = subFee;
    feeStruct[fundStartIdx] = structFee;
    feePreEst[fundStartIdx] = preEstFee;
    feeSpv[fundStartIdx] = spvSetupFee;
    if (miscExpenseTotal > 0) feeMisc[fundStartIdx] = miscExpenseTotal;
  }

  // Hybrid fund ratio for NAV tracking
  const hybridFundRatio = (isHybridMode && f.totalProjectCost > 0 && f.fundPortionCost > 0)
    ? f.fundPortionCost / f.totalProjectCost : 1;

  // Annual fees (mgmt/custody/auditor/operator) during operations
  let cumCapex = 0, cumIncome = 0;
  for (let y = fundStartIdx; y <= feeEndYr && y < h; y++) {
    cumCapex += Math.abs(c.capex[y] || 0) * hybridFundRatio;
    cumIncome += (c.income[y] || 0) * hybridFundRatio;
    if (isFund) {
      let mgmtBase = 0;
      if (mgmtFeeBase === 'equity') {
        mgmtBase = fundEquityBasis;
      } else if (mgmtFeeBase === 'devCost' || mgmtFeeBase === 'fundAssets' || mgmtFeeBase === 'gav') {
        mgmtBase = fundTotalCostBasis;
      } else if (mgmtFeeBase === 'nav') {
        mgmtBase = Math.max(fundEquityBasis, fundEquityBasis + cumIncome - cumCapex);
      } else {
        mgmtBase = cumCapex;
      }
      feeMgmt[y] = mgmtBase * mgmtFeeRate;
      if (mgmtFeeCap > 0 && feeMgmt[y] > mgmtFeeCap) feeMgmt[y] = mgmtFeeCap;
    }
    feeCustody[y] = annualCustody;
    feeAuditor[y] = auditorAnnual;
    if (hasRentalAssets && operatorFeeBase > 0 && c.income[y] > 0) {
      feeOperator[y] = operatorFeeBase * operatorFeePct;
      const operatorCap = project.operatorFeeCap || 0;
      if (operatorCap > 0 && feeOperator[y] > operatorCap) feeOperator[y] = operatorCap;
    }
  }

  for (let y = 0; y < h; y++) {
    fees[y] = feeSub[y] + feeMgmt[y] + feeCustody[y] + feeDev[y] +
              feeStruct[y] + feePreEst[y] + feeSpv[y] + feeAuditor[y] +
              feeOperator[y] + feeMisc[y];
  }
  const totalFees = fees.reduce((a, b) => a + b, 0);

  // ── Unfunded fees (fees that operating CF can't cover → equity absorbs) ──
  const unfundedFees = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    if (fees[y] > 0) {
      const adjNetCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
      const operatingCF = adjNetCF - (f.debtService[y] || 0) + (f.exitProceeds?.[y] || 0);
      unfundedFees[y] = Math.max(0, fees[y] - Math.max(0, operatingCF));
    }
  }

  // ── Equity calls pro-rata to CAPEX per year (same as before) ──
  const callOrder = project.capitalCallOrder || 'prorata';
  const totalEquityCalls = new Array(h).fill(0);
  if (callOrder === 'debtFirst' && f.drawdown && c.totalCapex > 0) {
    const finEquityCalls = new Array(h).fill(0);
    let finTotalEquity = 0;
    for (let y = 0; y < h; y++) {
      finEquityCalls[y] = Math.max(0, (c.capex[y] || 0) - (f.drawdown[y] || 0));
      finTotalEquity += finEquityCalls[y];
    }
    const scale = finTotalEquity > 0 ? totalEquity / finTotalEquity : 0;
    for (let y = 0; y < h; y++) {
      totalEquityCalls[y] = finEquityCalls[y] * scale + unfundedFees[y];
    }
  } else {
    for (let y = 0; y < h; y++) {
      const capexPortion = c.totalCapex > 0 && c.capex[y] > 0
        ? (c.capex[y] / c.totalCapex) * totalEquity : 0;
      totalEquityCalls[y] = capexPortion + unfundedFees[y];
    }
  }

  // Gate calls to fund period
  if (fundStartIdx > 0) {
    let pre = 0;
    for (let y = 0; y < fundStartIdx; y++) { pre += totalEquityCalls[y]; totalEquityCalls[y] = 0; }
    totalEquityCalls[fundStartIdx] += pre;
  }

  // Per-investor calls (each investor's share of each year's call)
  for (let y = 0; y < h; y++) {
    records.forEach(r => {
      r.calls[y] = totalEquityCalls[y] * r.equityPct;
    });
  }

  // ── Exit proceeds ──
  const exitProceeds = [...(f.exitProceeds || new Array(h).fill(0))];

  // ── Cash available per year ──
  const adjLandRent = ir?.adjustedLandRent || c.landRent;
  const cashAvail = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    const unlevCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
    const inPeriod = y >= fundStartIdx && y <= exitYr;
    const dsDeduction = isHybridGP ? 0 : (f.debtService[y] || 0);
    cashAvail[y] = Math.max(0,
      (inPeriod ? unlevCF : 0)
      - dsDeduction
      - fees[y]
      + unfundedFees[y]
      + exitProceeds[y]
    );
  }

  // ── Per-year distribution: Income fund simplified path ──
  const tier1 = new Array(h).fill(0); // ROC
  const tier2 = new Array(h).fill(0); // Incentive (settlement year only)
  const tier3 = new Array(h).fill(0); // Remaining profit

  if (isIncomeFund) {
    // Income fund: simple annual pro-rata distribution, no stages
    let cumReturned = new Array(records.length).fill(0);
    for (let y = 0; y < h; y++) {
      if (cashAvail[y] <= 0) continue;
      // Stage 1: ROC first until all unreturned reach zero
      let remaining = cashAvail[y];
      const unret = records.map((r, i) => Math.max(0, r.equityAmount - cumReturned[i]));
      const sumUnret = unret.reduce((a, b) => a + b, 0);
      if (sumUnret > 0 && remaining > 0) {
        const rocAmt = Math.min(remaining, sumUnret);
        records.forEach((r, i) => {
          if (unret[i] > 0) {
            const share = rocAmt * (unret[i] / sumUnret);
            r.distributions[y] += share;
            cumReturned[i] += share;
            r.roc += share;
          }
        });
        tier1[y] += rocAmt;
        remaining -= rocAmt;
      }
      // Stage 3: remaining pro-rata
      if (remaining > 0) {
        records.forEach(r => {
          const share = remaining * r.equityPct;
          r.distributions[y] += share;
          r.profitShare += share;
        });
        tier3[y] += remaining;
      }
    }
  } else {
    // Standard fund: 3-stage per year
    let cumReturned = new Array(records.length).fill(0);
    for (let y = 0; y < h; y++) {
      if (cashAvail[y] <= 0) continue;
      let remaining = cashAvail[y];

      // Stage 1: ROC pro-rata to unreturned amounts
      const unret = records.map((r, i) => Math.max(0, r.equityAmount - cumReturned[i]));
      const sumUnret = unret.reduce((a, b) => a + b, 0);
      if (sumUnret > 0 && remaining > 0) {
        const rocAmt = Math.min(remaining, sumUnret);
        records.forEach((r, i) => {
          if (unret[i] > 0) {
            const share = rocAmt * (unret[i] / sumUnret);
            r.distributions[y] += share;
            cumReturned[i] += share;
            r.roc += share;
          }
        });
        tier1[y] += rocAmt;
        remaining -= rocAmt;
      }

      // Stage 3: remaining profit pro-rata by equity%
      if (remaining > 0) {
        records.forEach(r => {
          const share = remaining * r.equityPct;
          r.distributions[y] += share;
          r.profitShare += share;
        });
        tier3[y] += remaining;
      }
    }
  }

  // ── Stage 2: Performance Incentive (settlement at last positive-dist year) ──
  let performanceIncentiveAmount = 0;
  let performanceIncentiveTriggered = false;
  let performanceIncentiveExcess = 0;
  let performanceIncentiveRequired = 0;
  let performanceIncentiveSettleYear = -1;
  const hurdleRate = (project.hurdleIRR ?? 15) / 100;
  const incPct = (project.incentivePct ?? 20) / 100;
  const hurdleMode = project.hurdleMode || 'simple';
  const perfEnabled = project.performanceIncentive !== false && !isIncomeFund;

  if (perfEnabled && devRecords.length > 0) {
    // Find last year with any positive distribution across all investors
    for (let y = h - 1; y >= 0; y--) {
      const anyDist = records.some(r => r.distributions[y] > 0);
      if (anyDist) { performanceIncentiveSettleYear = y; break; }
    }

    if (performanceIncentiveSettleYear >= 0) {
      const sy2 = performanceIncentiveSettleYear;
      const totalCalled = records.reduce((s, r) =>
        s + r.calls.reduce((a, b) => a + b, 0), 0);
      const totalDist = records.reduce((s, r) =>
        s + r.distributions.reduce((a, b) => a + b, 0), 0);

      // Find first call year for investYears
      let firstCallYr = 0;
      for (let y = 0; y < h; y++) {
        if (totalEquityCalls[y] > 0) { firstCallYr = y; break; }
      }
      const incentiveYears = Math.max(1, sy2 - firstCallYr + 1);

      if (hurdleMode === 'simple') {
        // Simple mode: required = totalCalled × (1 + rate × years); excess is
        // compared to the undiscounted total distribution.
        performanceIncentiveRequired = totalCalled * (1 + hurdleRate * incentiveYears);
        performanceIncentiveExcess = Math.max(0, totalDist - performanceIncentiveRequired);
      } else {
        // IRR mode: compare future values at the hurdle rate. Future-value the
        // calls forward and the distributions forward to the settle year. Excess
        // is the FV of distributions above the FV of calls at hurdle — equivalent
        // to testing whether actual IRR exceeds hurdle IRR. This properly
        // handles multi-year call + distribution schedules.
        let requiredFV = 0, actualFV = 0;
        for (let y = 0; y < h; y++) {
          const yearsToSettle = Math.max(0, sy2 - y);
          const compound = Math.pow(1 + hurdleRate, yearsToSettle);
          requiredFV += (totalEquityCalls[y] || 0) * compound;
          const yearDist = records.reduce((s, r) => s + (r.distributions[y] || 0), 0);
          actualFV += yearDist * compound;
        }
        performanceIncentiveRequired = requiredFV;
        performanceIncentiveExcess = Math.max(0, actualFV - requiredFV);
      }

      if (performanceIncentiveExcess > 0) {
        performanceIncentiveAmount = performanceIncentiveExcess * incPct;
        performanceIncentiveTriggered = true;

        // Clawback: take from non-developers pro-rata to their Stage 3 distribution at sy2
        // Cap clawback at what they actually received in sy2
        const invDistAtSy2 = invRecords.map(r => r.distributions[sy2]);
        const totalInvDistAtSy2 = invDistAtSy2.reduce((a, b) => a + b, 0);
        const clawback = Math.min(performanceIncentiveAmount, totalInvDistAtSy2);
        performanceIncentiveAmount = clawback;

        if (clawback > 0 && totalInvDistAtSy2 > 0) {
          // Investors: their distribution + profitShare drop by the clawback share.
          // incentiveReceived stays at 0 for investors — they don't receive incentive,
          // the clawback is a transfer out of their profit share.
          invRecords.forEach((r, i) => {
            const share = clawback * (invDistAtSy2[i] / totalInvDistAtSy2);
            r.distributions[sy2] -= share;
            r.profitShare -= share;
          });

          // Developers: receive the full clawback pro-rata by their equity share
          if (totalDevEquity > 0) {
            devRecords.forEach(r => {
              const share = clawback * (r.equityAmount / totalDevEquity);
              r.distributions[sy2] += share;
              r.incentiveReceived += share;
            });
          } else {
            // Equal split if all devs have zero equity
            const per = clawback / devRecords.length;
            devRecords.forEach(r => {
              r.distributions[sy2] += per;
              r.incentiveReceived += per;
            });
          }

          tier2[sy2] += clawback;
          // Reduce tier3 by the amount that was shifted (it moved from profit-share into incentive)
          tier3[sy2] = Math.max(0, tier3[sy2] - clawback);
        }
      }
    }
  } else if (perfEnabled && devRecords.length === 0 && !isIncomeFund) {
    console.warn('[waterfall] Performance incentive enabled but no developer role found — skipping incentive.');
  }

  // ── Per-investor netCF ──
  records.forEach(r => {
    for (let y = 0; y < h; y++) {
      r.netCF[y] = r.distributions[y] - r.calls[y];
    }
  });

  // ── Per-investor aggregates ──
  records.forEach(r => {
    r.totalCalled = r.calls.reduce((a, b) => a + b, 0);
    r.totalDist = r.distributions.reduce((a, b) => a + b, 0);
    r.netDist = r.totalDist; // no land rent obligation separately tracked in new model
    r.irr = calcIRR(r.netCF);
    r.moic = r.totalCalled > 0 ? r.totalDist / r.totalCalled : 0;
    r.dpi = r.totalCalled > 0 ? r.totalDist / r.totalCalled : 0;
    r.npv10 = calcNPV(r.netCF, 0.10);
    r.npv12 = calcNPV(r.netCF, 0.12);
    r.npv14 = calcNPV(r.netCF, 0.14);
  });

  const investorOutcomes = records;

  // ── Backward-compat derived aliases ──
  const sumArrByRole = (role, field) => {
    const arr = new Array(h).fill(0);
    records.filter(r => r.role === role).forEach(r => {
      for (let y = 0; y < h; y++) arr[y] += r[field][y] || 0;
    });
    return arr;
  };
  const sumByRoleField = (role, field) =>
    records.filter(r => r.role === role).reduce((s, r) => s + (r[field] || 0), 0);

  const gpEquity = totalDevEquity;
  const lpEquity = totalInvEquity;
  const gpDist = sumArrByRole('developer', 'distributions');
  const lpDist = sumArrByRole('investor', 'distributions');
  const gpNetCF = sumArrByRole('developer', 'netCF');
  const lpNetCF = sumArrByRole('investor', 'netCF');
  const gpCalls = sumArrByRole('developer', 'calls');
  const lpCalls = sumArrByRole('investor', 'calls');
  const gpTotalCalled = sumByRoleField('developer', 'totalCalled');
  const lpTotalCalled = sumByRoleField('investor', 'totalCalled');
  const gpTotalDist = sumByRoleField('developer', 'totalDist');
  const lpTotalDist = sumByRoleField('investor', 'totalDist');
  const gpNetDist = gpTotalDist;
  const lpNetDist = lpTotalDist;
  const gpIRR = calcIRR(gpNetCF);
  const lpIRR = calcIRR(lpNetCF);
  const gpMOIC = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;
  const lpMOIC = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpDPI = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;
  const lpDPI = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpCommittedMOIC = gpEquity > 0 ? gpNetDist / gpEquity : 0;
  const lpCommittedMOIC = lpEquity > 0 ? lpNetDist / lpEquity : 0;
  const gpNPV10 = calcNPV(gpNetCF, 0.10);
  const gpNPV12 = calcNPV(gpNetCF, 0.12);
  const gpNPV14 = calcNPV(gpNetCF, 0.14);
  const lpNPV10 = calcNPV(lpNetCF, 0.10);
  const lpNPV12 = calcNPV(lpNetCF, 0.12);
  const lpNPV14 = calcNPV(lpNetCF, 0.14);
  const projNPV10 = calcNPV(c.netCF, 0.10);
  const projNPV12 = calcNPV(c.netCF, 0.12);
  const projNPV14 = calcNPV(c.netCF, 0.14);

  // Simple ROE
  const gpSimpleROE = gpTotalCalled > 0 ? (gpNetDist - gpTotalCalled) / gpTotalCalled : 0;
  const lpSimpleROE = lpTotalCalled > 0 ? (lpNetDist - lpTotalCalled) / lpTotalCalled : 0;
  let _firstCall = -1, _lastDist = 0;
  for (let y = 0; y < h; y++) {
    if (lpNetCF[y] < 0 && _firstCall < 0) _firstCall = y;
    if (lpNetCF[y] > 0) _lastDist = y;
  }
  const investYears = Math.max(1, _firstCall >= 0 ? _lastDist - _firstCall + 1 : (exitYr > 0 ? exitYr : h));
  const gpSimpleAnnual = investYears > 0 ? gpSimpleROE / investYears : 0;
  const lpSimpleAnnual = investYears > 0 ? lpSimpleROE / investYears : 0;

  // Income fund metrics
  const distributionYield = new Array(h).fill(0);
  const payoutRatio = new Array(h).fill(0);
  const navEstimate = new Array(h).fill(0);
  const cumDistributions = new Array(h).fill(0);
  const ffoProxy = new Array(h).fill(0);
  let avgDistYield = 0;
  if (isIncomeFund && lpEquity > 0) {
    let cumDist = 0;
    let stableYields = [];
    const constrEndLocal = f.constrEnd || 0;
    for (let y = 0; y < h; y++) {
      const noi = (c.income[y] || 0) - (adjLandRent[y] || 0);
      cumDist += lpDist[y];
      cumDistributions[y] = cumDist;
      distributionYield[y] = lpEquity > 0 ? lpDist[y] / lpEquity : 0;
      payoutRatio[y] = cashAvail[y] > 0 ? (lpDist[y] + gpDist[y]) / cashAvail[y] : 0;
      navEstimate[y] = noi > 0 ? noi / 0.08 : (f.devCostInclLand || 0);
      ffoProxy[y] = Math.max(0, noi - (fees[y] || 0) - (f.debtService?.[y] || 0));
      if (y > constrEndLocal && distributionYield[y] > 0) stableYields.push(distributionYield[y]);
    }
    avgDistYield = stableYields.length > 0
      ? stableYields.reduce((a, b) => a + b, 0) / stableYields.length : 0;
  }

  // Aggregate equity calls (backward compat — engine clients expect this)
  const equityCalls = new Array(h).fill(0);
  for (let y = 0; y < h; y++) equityCalls[y] = totalEquityCalls[y];

  // Developer fee totals (informational)
  const devFeesTotal = feeDev.reduce((a, b) => a + b, 0);
  const fundLevelFeesTotal = feeMgmt.reduce((a, b) => a + b, 0)
    + feeStruct.reduce((a, b) => a + b, 0)
    + feePreEst.reduce((a, b) => a + b, 0)
    + feeCustody.reduce((a, b) => a + b, 0)
    + feeSpv.reduce((a, b) => a + b, 0)
    + feeAuditor.reduce((a, b) => a + b, 0)
    + feeOperator.reduce((a, b) => a + b, 0)
    + feeMisc.reduce((a, b) => a + b, 0);
  const subFeesTotal = feeSub.reduce((a, b) => a + b, 0);

  // Developer economics (two-hats decomposition — kept for UI)
  const developerAsInvestor = gpTotalDist - performanceIncentiveAmount;
  const developerDevFees = devFeesTotal;
  const developerPerfIncentive = performanceIncentiveAmount;
  const developerTotalEconomics = developerAsInvestor + developerDevFees + developerPerfIncentive;

  return {
    // ── NEW: Source of truth ──
    investorOutcomes,

    // ── Aggregate (for charts/UI) ──
    totalEquity, cashAvail, tier1, tier2, tier3,
    tier4LP: new Array(h).fill(0), tier4GP: new Array(h).fill(0), // legacy compat
    investYears, projIRR: c.irr,

    // ── Performance Incentive ──
    performanceIncentiveAmount, performanceIncentiveTriggered,
    performanceIncentiveExcess, performanceIncentiveRequired,
    performanceIncentiveSettleYear: performanceIncentiveSettleYear >= 0
      ? performanceIncentiveSettleYear + sy : null,
    perfIncentiveEnabled: perfEnabled,
    perfIncentiveAmount: performanceIncentiveAmount,
    perfIncentiveExcess: performanceIncentiveExcess,
    perfIncentiveRequired: performanceIncentiveRequired,
    perfIncentiveYears: investYears,
    hurdleIRR: hurdleRate * 100,
    incentivePct: incPct * 100,
    hurdleMode,

    // ── Fee schedule ──
    fees, feeSub, feeMgmt, feeCustody, feeDev,
    feeStruct, feePreEst, feeSpv, feeAuditor, feeOperator, feeMisc,
    totalFees, unfundedFees,

    // ── Equity calls ──
    equityCalls, gpCalls, lpCalls, exitProceeds,

    // ── Backward-compat derived aliases ──
    gpEquity, lpEquity, gpPct, lpPct,
    gpDist, lpDist, gpNetCF, lpNetCF,
    gpIRR, lpIRR, gpMOIC, lpMOIC, gpDPI, lpDPI,
    gpCommittedMOIC, lpCommittedMOIC,
    gpNPV10, gpNPV12, gpNPV14,
    lpNPV10, lpNPV12, lpNPV14,
    projNPV10, projNPV12, projNPV14,
    gpTotalCalled, lpTotalCalled, gpTotalDist, lpTotalDist,
    gpNetDist, lpNetDist,
    gpTotalInvested: gpTotalCalled, lpTotalInvested: lpTotalCalled,
    gpCashIRR: gpIRR, lpCashIRR: lpIRR, gpCashMOIC: gpMOIC, lpCashMOIC: lpMOIC,
    gpCashCalled: gpTotalCalled, lpCashCalled: lpTotalCalled,
    gpSimpleROE, lpSimpleROE, gpSimpleAnnual, lpSimpleAnnual,

    // Land rent obligations — simplified: always project-level (no gp/lp payer)
    gpLandRentObligation: new Array(h).fill(0),
    lpLandRentObligation: new Array(h).fill(0),
    gpLandRentTotal: 0, lpLandRentTotal: 0,
    gpPaysLandRent: false, lpPaysLandRent: false,
    resolvedLandRentPayer: 'project',

    // Unreturned capital tracking (legacy compat — summed from records)
    unreturnedOpen: new Array(h).fill(0),
    unreturnedClose: new Array(h).fill(0),
    prefAccrual: new Array(h).fill(0),
    prefAccumulated: new Array(h).fill(0),

    // ── Fee attribution ──
    gpIsFundManager: false, devFeesTotal, fundLevelFeesTotal, subFeesTotal,
    developerFeesReceived: devFeesTotal,
    developerFeeOnlyReceived: devFeesTotal,

    // Developer two-hats
    developerAsInvestor, developerDevFees, developerPerfIncentive, developerTotalEconomics,
    developerCapitalReturn: gpTotalDist,
    sponsorWaterfallEconomics: performanceIncentiveAmount,

    // Saudi-style aliases
    developerEquity: gpEquity, investorEquity: lpEquity,
    developerPct: gpPct, investorPct: lpPct,
    developerContribution: gpTotalCalled, investorContribution: lpTotalCalled,
    developerDistributions: gpTotalDist, investorDistributions: lpTotalDist,
    developerNetDistributions: gpNetDist, investorNetDistributions: lpNetDist,
    developerNetCF: gpNetCF, investorNetCF: lpNetCF,
    developerIRR: gpIRR, investorIRR: lpIRR,
    developerMOIC: gpMOIC, investorMOIC: lpMOIC,
    developerDPI: gpDPI, investorDPI: lpDPI,
    developerNPV10: gpNPV10, investorNPV10: lpNPV10,
    developerNPV12: gpNPV12, investorNPV12: lpNPV12,

    // Pre-incentive IRRs (compat — simplified: same as post when no incentive applied)
    lpIRR_preIncentive: lpIRR, gpIRR_preIncentive: gpIRR,
    exitYear: exitYr + sy,

    // Income fund
    isIncomeFund, distributionYield, avgDistYield, payoutRatio,
    navEstimate, cumDistributions, ffoProxy, isFund,

    // Hybrid pass-through
    financingCF: f.financingCF, fundCF: f.fundCF,
    fullProjectExitVal: f.fullProjectExitVal,
    fundFeeBasis,

    // Hybrid-GP debt obligation (for MOIC aggregation at phases.js)
    gpDebtServiceTotal: 0, gpAdjNetDist: gpNetDist,
  };
}
