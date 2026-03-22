/**
 * ZAN Financial Engine — Waterfall Distribution Engine
 * @module engine/waterfall
 * 
 * Dependencies: engine/math.js (calcIRR, calcNPV)
 * Consumes: computeFinancing output + project config
 * Produces: 4-tier waterfall, LP/GP distributions, IRR, MOIC
 */

import { calcIRR, calcNPV } from './math.js';

export function computeWaterfall(project, projectResults, financing, incentivesResult) {
  if (!project || !projectResults || !financing) return null;
  if (project.finMode === "self" || project.finMode === "bank100" || project.finMode === "debt") return null;
  // Waterfall only applies to fund and jv modes (GP/LP distribution)
  const h = project.horizon || 50;
  const sy = project.startYear || 2026;
  const c = projectResults.consolidated;
  const f = financing;

  // Use equity from financing engine
  const gpEquity = f.gpEquity;
  const lpEquity = f.lpEquity;
  const totalEquity = f.totalEquity;
  const gpPct = f.gpPct;
  const lpPct = f.lpPct;
  const isFund = project.finMode === "fund";

  // Fee calculations (only Fund type gets full fees)
  const subFee = isFund ? totalEquity * (project.subscriptionFeePct || 0) / 100 : 0;
  // DevFee: read from financing (single source — computed in financing.js)
  const devFeeTotal = f.devFeeTotal || 0;
  // Structuring fee: % of development cost (CAPEX), not equity — matches ZAN Fund Model
  let structFee = isFund ? f.devCostExclLand * (project.structuringFeePct || 0) / 100 : 0;
  const structFeeCap = project.structuringFeeCap || 0;
  if (structFeeCap > 0 && structFee > structFeeCap) structFee = structFeeCap;
  const mgmtFeeBase = project.mgmtFeeBase || "nav";
  const mgmtFeeRate = (project.annualMgmtFeePct || 0) / 100;
  const mgmtFeeCap = project.mgmtFeeCapAnnual || 0;
  const annualCustody = isFund ? (project.custodyFeeAnnual || 0) : 0;
  const preEstFee = isFund ? (project.preEstablishmentFee || 0) : 0;
  const spvSetupFee = isFund ? (project.spvFee || 0) : 0;
  const auditorAnnual = isFund ? (project.auditorFeeAnnual || 0) : 0;

  // Operator fee: 0.15% of completed asset value, annual, only for rental/hold projects (not pure sale)
  const hasRentalAssets = (project.assets || []).some(a => a.revType !== "Sale");
  const operatorFeePct = (project.operatorFeePct || 0) / 100;
  const operatorFeeBase = hasRentalAssets ? f.devCostExclLand : 0; // Completed asset value ≈ construction cost

  // Miscellaneous expenses: 0.5% of total assets, one-time at fund start
  const miscExpensePct = (project.miscExpensePct || 0) / 100;
  const miscExpenseTotal = (isFund || project.finMode === "jv") ? f.devCostExclLand * miscExpensePct : 0;

  // Fee schedule
  const fees = new Array(h).fill(0);
  const feeSub = new Array(h).fill(0);
  const feeMgmt = new Array(h).fill(0);
  const feeCustody = new Array(h).fill(0);
  const feeDev = new Array(h).fill(0);
  const feeStruct = new Array(h).fill(0);
  const feePreEst = new Array(h).fill(0);
  const feeSpv = new Array(h).fill(0);
  const feeAuditor = new Array(h).fill(0);
  const feeOperator = new Array(h).fill(0);
  const feeMisc = new Array(h).fill(0);

  // Find construction period
  let constrStart = h, constrEnd = 0;
  for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { constrStart = Math.min(constrStart, y); constrEnd = Math.max(constrEnd, y); } }

  // Fund start year: user input or auto (1 year before construction)
  const fundStartIdx = (project.fundStartYear || 0) > 0 ? project.fundStartYear - sy : constrStart;

  // Exit year — use optimal exit from financing engine (highest IRR)
  const exitStrategy = project.exitStrategy || "sale";
  const optIdx = financing.optimalExitYear ? financing.optimalExitYear - sy : constrEnd + 3;
  const exitYr = exitStrategy === "hold" ? h - 1 : ((project.exitYear || 0) > 0 ? project.exitYear - sy : optIdx);
  const operYears = exitYr - constrStart + 1;

  // Fee period end: hold = full horizon, sale/caprate = exit year
  const feeEndYr = exitStrategy === "hold" ? h - 1 : exitYr;

  // One-time fees at fund start
  if (fundStartIdx < h) {
    feeSub[fundStartIdx] = subFee;
    feeStruct[fundStartIdx] = structFee;
    feePreEst[fundStartIdx] = preEstFee;
    feeSpv[fundStartIdx] = spvSetupFee;
    if (miscExpenseTotal > 0) feeMisc[fundStartIdx] = miscExpenseTotal;
  }
  // Developer fee spread over construction
  for (let y = constrStart; y <= constrEnd && y < h; y++) {
    if (c.totalCapex > 0) feeDev[y] = devFeeTotal * (c.capex[y] / c.totalCapex);
  }
  // Management + custody + auditor fees from fund start to fee period end
  // NAV = totalEquity - cumCapex + cumIncome (simplified NAV proxy)
  let cumCapex = 0, cumIncome = 0;
  for (let y = fundStartIdx; y <= feeEndYr && y < h; y++) {
    cumCapex += Math.abs(c.capex[y] || 0);
    cumIncome += (c.income[y] || 0);
    if (isFund) {
      let mgmtBase = 0;
      if (mgmtFeeBase === "equity") {
        mgmtBase = totalEquity;
      } else if (mgmtFeeBase === "devCost") {
        mgmtBase = f.devCostInclLand;
      } else if (mgmtFeeBase === "nav") {
        // NAV proxy: equity + cumulative net income - cumulative capex (floor at equity)
        mgmtBase = Math.max(totalEquity, totalEquity + cumIncome - cumCapex);
      } else {
        // "deployed": cumulative CAPEX deployed
        mgmtBase = cumCapex;
      }
      feeMgmt[y] = mgmtBase * mgmtFeeRate;
      if (mgmtFeeCap > 0 && feeMgmt[y] > mgmtFeeCap) feeMgmt[y] = mgmtFeeCap;
    }
    feeCustody[y] = annualCustody;
    feeAuditor[y] = auditorAnnual;
    // Operator fee: annual, starts after construction ends (operating period only)
    if (hasRentalAssets && operatorFeeBase > 0 && y > constrEnd) {
      feeOperator[y] = operatorFeeBase * operatorFeePct;
      const operatorCap = project.operatorFeeCap || 0;
      if (operatorCap > 0 && feeOperator[y] > operatorCap) feeOperator[y] = operatorCap;
    }
  }
  for (let y = 0; y < h; y++) fees[y] = feeSub[y] + feeMgmt[y] + feeCustody[y] + feeDev[y] + feeStruct[y] + feePreEst[y] + feeSpv[y] + feeAuditor[y] + feeOperator[y] + feeMisc[y];

  const totalFees = fees.reduce((a, b) => a + b, 0);

  // ── ZAN: Unfunded Fees ──
  // Fees that operating CF cannot cover → must be funded from equity
  // ZAN: UnfundedFees[y] = MAX(0, Fees[y] - MAX(0, UnlevCF[y] + DS[y] + Exit[y]))
  // In ZAN: DS is negative. In our code: DS is positive → subtract.
  // UnlevCF = c.netCF = income - landRent - capex
  const unfundedFees = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    if (fees[y] > 0) {
      const operatingCF = c.netCF[y] - (f.debtService[y] || 0) + (f.exitProceeds?.[y] || 0);
      unfundedFees[y] = Math.max(0, fees[y] - Math.max(0, operatingCF));
    }
  }

  // H14: Fee treatment policy
  // "capital" = fees count as invested capital (earn ROC + Pref) - default, current behavior
  // "expense" = fees are expenses (outside capital base - don't earn Pref, smaller unreturned capital)
  const feeTreatment = project.feeTreatment || "capital";
  // ── Equity Calls: ZAN formula (pro-rata to CAPEX × totalEquity + unfundedFees) ──
  // NOTE: This matches ZAN Excel behavior where:
  //   equityCalls = (CAPEX_yr / Total_CAPEX) × TotalEquity + UnfundedFees
  //   LP pays lpPct of each call → sum(LP calls) = lpEquity + lpPct×UF
  //   GP pays gpPct of each call → sum(GP calls) = gpEquity + gpPct×UF
  // LandCap is embedded in totalEquity and distributed pro-rata across construction,
  // not as a lump-sum at Y0. This is the ZAN convention.
  const equityCalls = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    const capexPortion = c.totalCapex > 0 && c.capex[y] > 0 ? (c.capex[y] / c.totalCapex) * totalEquity : 0;
    equityCalls[y] = capexPortion + unfundedFees[y];
  }

  // GP/LP call split (for transparency and proper net CF calculation)
  const gpCalls = new Array(h).fill(0);
  const lpCalls = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    gpCalls[y] = equityCalls[y] * gpPct;
    lpCalls[y] = equityCalls[y] * lpPct;
  }

  // Exit proceeds - use from financing engine (already net of debt)
  const exitProceeds = [...(f.exitProceeds || new Array(h).fill(0))];

  // Cash available for distribution - ZAN formula:
  // cashAvail[y] = MAX(0, IF(yr in [fundStart..exit], UnlevCF, 0) + DS - Fees + UF + Exit)
  // UnlevCF = c.netCF = income - landRent - CAPEX (already includes CAPEX, unlike NOI-only)
  // DS is positive in our code → subtract. Fees positive → subtract. UF positive → add back.
  const ir = incentivesResult;
  const adjLandRent = ir?.adjustedLandRent || c.landRent;
  // Land rent payer resolution (platform-specific, not in ZAN)
  const lrPaidByRaw = project.landRentPaidBy || "auto";
  let resolvedLandRentPayer = lrPaidByRaw;
  if (lrPaidByRaw === "auto" && project.landCapitalize) {
    resolvedLandRentPayer = project.landCapTo || "gp";
  } else if (lrPaidByRaw === "auto" || lrPaidByRaw === "developer") {
    resolvedLandRentPayer = "project";
  }
  const gpPaysLandRent = resolvedLandRentPayer === "gp" || resolvedLandRentPayer === "split";
  const lpPaysLandRent = resolvedLandRentPayer === "lp" || resolvedLandRentPayer === "split";
  const gpLandRentObligation = new Array(h).fill(0);
  const lpLandRentObligation = new Array(h).fill(0);
  const cashAvail = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    // Track GP/LP land rent obligations (platform feature)
    if (gpPaysLandRent && resolvedLandRentPayer === "gp") {
      gpLandRentObligation[y] = adjLandRent[y];
    } else if (lpPaysLandRent && resolvedLandRentPayer === "lp") {
      lpLandRentObligation[y] = adjLandRent[y];
    } else if (resolvedLandRentPayer === "split") {
      gpLandRentObligation[y] = adjLandRent[y] * gpPct;
      lpLandRentObligation[y] = adjLandRent[y] * lpPct;
    }
    // ZAN Cash Available: MAX(0, UnlevCF - DS - Fees + UF + Exit)
    // Use incentive-adjusted CF if available
    const unlevCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
    const inPeriod = y >= fundStartIdx && y <= exitYr;
    cashAvail[y] = Math.max(0,
      (inPeriod ? unlevCF : 0)
      - (f.debtService[y] || 0)
      - fees[y]
      + unfundedFees[y]
      + exitProceeds[y]
    );
  }

  // 4-tier waterfall
  const prefRate = Math.max(0, Math.min(0.5, (project.prefReturnPct ?? 15) / 100));
  const carryPct = Math.min(0.9999, Math.max(0, (project.carryPct ?? 30) / 100));
  const lpSplitPct = Math.max(0, Math.min(1, (project.lpProfitSplitPct ?? 70) / 100));
  const gpSplitPct = 1 - lpSplitPct;

  const tier1 = new Array(h).fill(0); // Return of Capital
  const tier2 = new Array(h).fill(0); // Preferred Return
  const tier3 = new Array(h).fill(0); // GP Catch-up
  const tier4LP = new Array(h).fill(0); // Profit Split LP
  const tier4GP = new Array(h).fill(0); // Profit Split GP
  const lpDist = new Array(h).fill(0);
  const gpDist = new Array(h).fill(0);
  const unreturnedOpen = new Array(h).fill(0);
  const unreturnedClose = new Array(h).fill(0);
  const prefAccrual = new Array(h).fill(0);
  const prefAccumulated = new Array(h).fill(0);

  // Waterfall convention settings
  const prefAlloc = project.prefAllocation || "proRata";   // proRata (ZAN) / lpOnly
  const catchMethod = project.catchupMethod || "perYear";  // perYear (ZAN) / cumulative

  let cumEquityCalled = 0;
  let cumReturned = 0;
  let cumPrefPaid = 0;
  let cumPrefAccrued = 0;
  let cumGPCatchup = 0; // C5: Track cumulative GP catch-up
  let cumFeesCalled = 0; // H14: Track fee portion of equity calls

  for (let y = 0; y < h; y++) {
    cumEquityCalled += equityCalls[y];
    cumFeesCalled += unfundedFees[y]; // Track cumulative fees funded from equity

    // H14: Fee Treatment - 3 modes:
    // "capital"  (ZAN default): fees in ROC + Pref (full invested capital)
    // "rocOnly": fees in ROC (returned to LP) but NO Pref calculated on them
    // "expense": fees excluded from ROC and Pref (gone, not returned)
    const rocBase = feeTreatment === "expense"
      ? cumEquityCalled - cumFeesCalled  // Exclude fees from ROC
      : cumEquityCalled;                 // Include fees in ROC (capital + rocOnly)
    const prefBase = (feeTreatment === "expense" || feeTreatment === "rocOnly")
      ? cumEquityCalled - cumFeesCalled  // Exclude fees from Pref base
      : cumEquityCalled;                 // Include fees in Pref (capital only)

    const unreturned = rocBase - cumReturned;
    unreturnedOpen[y] = unreturned;

    // Pref accrual on pref-eligible capital (may differ from ROC base)
    const prefEligible = Math.max(0, prefBase - cumReturned);
    const yearPref = prefEligible * prefRate;
    cumPrefAccrued += yearPref;
    prefAccrual[y] = yearPref;
    prefAccumulated[y] = cumPrefAccrued - cumPrefPaid;

    let remaining = cashAvail[y];
    if (remaining <= 0) {
      unreturnedClose[y] = unreturned;
      continue;
    }

    // Tier 1: Return of Capital
    if (unreturned > 0 && remaining > 0) {
      const t1 = Math.min(remaining, unreturned);
      tier1[y] = t1;
      remaining -= t1;
      cumReturned += t1;
    }

    // Tier 2: Preferred Return (pay accrued pref)
    const prefOwed = cumPrefAccrued - cumPrefPaid;
    if (prefOwed > 0 && remaining > 0) {
      const t2 = Math.min(remaining, prefOwed);
      tier2[y] = t2;
      remaining -= t2;
      cumPrefPaid += t2;
    }

    // C5: Tier 3: GP Catch-up
    // Convention: waterfallConvention controls T3 + distribution allocation
    // - prefAllocation: "proRata" (GP gets GP% of T2 as investor) / "lpOnly" (T2 all to LP)
    // - catchupMethod: "perYear" (ZAN: based on this year's T2) / "cumulative" (tracked across years)

    if (project.gpCatchup && remaining > 0 && carryPct > 0) {
      if (catchMethod === "perYear") {
        // ZAN method: T3 = MIN(remaining, T2_thisYear × carry/(1-carry))
        // Simple per-year formula. No cumulative tracking. No GP offset.
        const catchup = Math.min(remaining, tier2[y] * carryPct / (1 - carryPct));
        tier3[y] = catchup;
        remaining -= catchup;
      } else {
        // Cumulative method: track GP's pref participation and offset
        const gpProfitFromPref = prefAlloc === "proRata" ? cumPrefPaid * gpPct : 0;
        const targetCatchupOnly = Math.max(0, (carryPct * cumPrefPaid - gpProfitFromPref) / (1 - carryPct));
        const catchupNeeded = Math.max(0, targetCatchupOnly - cumGPCatchup);
        const catchup = Math.min(remaining, catchupNeeded);
        tier3[y] = catchup;
        remaining -= catchup;
        cumGPCatchup += catchup;
      }
    }

    // Tier 4: Profit Split
    if (remaining > 0) {
      tier4LP[y] = remaining * lpSplitPct;
      tier4GP[y] = remaining * gpSplitPct;
      remaining = 0;
    }

    // Allocate distributions based on prefAllocation convention
    // proRata: T1 + T2 split by GP%/LP%. GP wears two hats (investor + manager).
    // lpOnly: T1 pro-rata, T2 100% to LP. GP compensated only via T3 + T4.
    if (prefAlloc === "lpOnly") {
      lpDist[y] = tier1[y] * lpPct + tier2[y] + tier4LP[y];
      gpDist[y] = tier1[y] * gpPct + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);
    } else {
      // proRata (ZAN default): GP gets investor share of T1 + T2
      lpDist[y] = (tier1[y] + tier2[y]) * lpPct + tier4LP[y];
      gpDist[y] = (tier1[y] + tier2[y]) * gpPct + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);
    }

    unreturnedClose[y] = rocBase - cumReturned;
  }

  // LP Net Cash Flow: -equity calls (LP share) + distributions - land rent obligation
  const lpNetCF = new Array(h).fill(0);
  const gpNetCF = new Array(h).fill(0);
  const gpLandRentTotal = gpLandRentObligation.reduce((a,b) => a+b, 0);
  const lpLandRentTotal = lpLandRentObligation.reduce((a,b) => a+b, 0);
  for (let y = 0; y < h; y++) {
    lpNetCF[y] = -lpCalls[y] + lpDist[y] - lpLandRentObligation[y];
    gpNetCF[y] = -gpCalls[y] + gpDist[y] - gpLandRentObligation[y];
  }

  const lpIRR = calcIRR(lpNetCF);
  const gpIRR = calcIRR(gpNetCF);
  const projIRR = c.irr;
  // MOIC: Total Distributions / Paid-In Capital (industry standard default)
  // Paid-In = actual equity calls × share (cash actually transferred)
  // Committed MOIC = Distributions / Original Equity (secondary metric)
  const lpTotalDist = lpDist.reduce((a, b) => a + b, 0);
  const gpTotalDist = gpDist.reduce((a, b) => a + b, 0);
  const lpNetDist = lpTotalDist - lpLandRentTotal;
  const gpNetDist = gpTotalDist - gpLandRentTotal;
  const lpTotalCalled = lpCalls.reduce((a, b) => a + b, 0);
  const gpTotalCalled = gpCalls.reduce((a, b) => a + b, 0);
  // Default MOIC = Paid-In basis (actual cash contributed)
  const lpMOIC = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpMOIC = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;
  // Committed MOIC = Original equity commitment basis (secondary)
  const lpCommittedMOIC = lpEquity > 0 ? lpNetDist / lpEquity : 0;
  const gpCommittedMOIC = gpEquity > 0 ? gpNetDist / gpEquity : 0;
  // H13: DPI = Total Distributions / Total Equity Called (same as paid-in MOIC for net dist)
  const lpDPI = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpDPI = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;

  // NPV - Full 3x3 matrix
  const lpNPV10 = calcNPV(lpNetCF, 0.10);
  const lpNPV12 = calcNPV(lpNetCF, 0.12);
  const lpNPV14 = calcNPV(lpNetCF, 0.14);
  const gpNPV10 = calcNPV(gpNetCF, 0.10);
  const gpNPV12 = calcNPV(gpNetCF, 0.12);
  const gpNPV14 = calcNPV(gpNetCF, 0.14);
  const projNPV10 = calcNPV(c.netCF, 0.10);
  const projNPV12 = calcNPV(c.netCF, 0.12);
  const projNPV14 = calcNPV(c.netCF, 0.14);

  return {
    gpEquity, lpEquity, totalEquity, gpPct, lpPct,
    fees, feeSub, feeMgmt, feeCustody, feeDev, feeStruct, feePreEst, feeSpv, feeAuditor, feeOperator, feeMisc, totalFees, unfundedFees,
    equityCalls, gpCalls, lpCalls, exitProceeds, cashAvail,
    tier1, tier2, tier3, tier4LP, tier4GP,
    lpDist, gpDist, lpNetCF, gpNetCF,
    unreturnedOpen, unreturnedClose, prefAccrual, prefAccumulated,
    lpIRR, gpIRR, projIRR, lpMOIC, gpMOIC, lpCommittedMOIC, gpCommittedMOIC, lpDPI, gpDPI,
    lpTotalInvested: lpTotalCalled, gpTotalInvested: gpTotalCalled, // aliases for UI backward compat
    lpTotalDist, gpTotalDist, lpNetDist, gpNetDist, lpTotalCalled, gpTotalCalled,
    gpLandRentObligation, gpLandRentTotal, lpLandRentObligation, lpLandRentTotal,
    gpPaysLandRent, lpPaysLandRent, resolvedLandRentPayer,
    lpNPV10, lpNPV12, lpNPV14, gpNPV10, gpNPV12, gpNPV14,
    projNPV10, projNPV12, projNPV14, isFund,
    prefAllocation: prefAlloc, catchupMethod: catchMethod,
    exitYear: exitYr + sy,
  };
}

// ═══════════════════════════════════════════════════════════════
// PER-PHASE WATERFALL (runs waterfall for each phase independently)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PHASE 3.5: PER-PHASE INDEPENDENT FINANCING & WATERFALL
// ═══════════════════════════════════════════════════════════════

// All financing fields that can be set per-phase
