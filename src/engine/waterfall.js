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
  // No waterfall when zero equity (e.g. hybrid with 100% government financing)
  if (financing.totalEquity <= 0) return null;
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
  const isFund = project.finMode === "fund" || project.finMode === "hybrid" || project.finMode === "incomeFund";
  const isIncomeFund = project.finMode === "incomeFund";

  // Fee basis: for hybrid mode, fees apply to fund portion only (not government-financed portion)
  const isHybridMode = project.finMode === "hybrid";
  const isHybridGP = isHybridMode && project.govBeneficiary === "gp";
  // buildCostOnly = true construction cost (excludes land purchase from capex).
  // For non-hybrid: use buildCostOnly if available, else devCostExclLand (which may include land purchase).
  const effectiveDevCost = f.buildCostOnly != null ? f.buildCostOnly : f.devCostExclLand;
  const fundFeeBasis = isHybridMode ? (f.fundPortionCost || effectiveDevCost) : effectiveDevCost;
  // Fund equity basis: for hybrid, the fund's equity is only the fund portion (not gov-borrowed GP equity)
  const fundEquityBasis = isHybridMode ? (f.fundPortionCost || totalEquity) : totalEquity;

  // Fee calculations (only Fund type gets full fees)
  // Subscription fee: for hybrid, apply only to fund portion equity (LP raise), not government-borrowed GP equity
  const subFeeBase = fundEquityBasis;
  const subFee = isFund ? subFeeBase * (project.subscriptionFeePct || 0) / 100 : 0;
  // DevFee: developer manages FULL project → fee on full project cost (not scaled for hybrid)
  // The dev fee is a project expense NOT included in devCostInclLand, so the government
  // loan doesn't cover it. The full fee must be borne by project CF / fund equity.
  const _rawDevFee = f.devFeeTotal || 0;
  const hybridFundRatio = (isHybridMode && f.totalProjectCost > 0 && f.fundPortionCost > 0)
    ? f.fundPortionCost / f.totalProjectCost : 1;
  const devFeeTotal = _rawDevFee; // Full project — developer manages entire project
  // Structuring fee: % of fund portion cost, not total project cost for hybrid
  let structFee = isFund ? fundFeeBasis * (project.structuringFeePct || 0) / 100 : 0;
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
  // Operator manages the ENTIRE physical asset regardless of financing structure
  // → use full project cost (effectiveDevCost), NOT fund portion
  const hasRentalAssets = (project.assets || []).some(a => a.revType !== "Sale");
  const operatorFeePct = (project.operatorFeePct || 0) / 100;
  const operatorFeeBase = hasRentalAssets ? effectiveDevCost : 0;

  // Miscellaneous expenses: 0.5% of fund portion, one-time at fund start
  const miscExpensePct = (project.miscExpensePct || 0) / 100;
  const miscExpenseTotal = (isFund || project.finMode === "jv") ? fundFeeBasis * miscExpensePct : 0;

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
  const fundStartIdx = Math.max(0, (project.fundStartYear || 0) > 0 ? project.fundStartYear - sy : constrStart);

  // Exit year — use optimal exit from financing engine (highest IRR)
  const exitStrategy = isIncomeFund ? "hold" : (project.exitStrategy || "sale");
  const optIdx = financing.optimalExitYear ? financing.optimalExitYear - sy : constrEnd + 3;
  // Smart exit year: values < 100 treated as relative offset, ≥ startYear as absolute
  const rawExit = project.exitYear || 0;
  const resolvedExit = rawExit > 0 && rawExit < 100 ? rawExit : rawExit > 0 ? rawExit - sy : 0;
  const exitYr = exitStrategy === "hold" ? h - 1 : (resolvedExit > 0 ? resolvedExit : optIdx);
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
  // Fee basis options per fund document:
  //   "fundAssets" = total fund assets (devCostInclLand = GP+LP+Debt) — CORRECT per fund docs
  //                  Fixed annual amount. "0.50% of total fund assets" → rate × fundSize
  //   "nav"        = NAV proxy (equity + cumIncome - cumCapex, floor at equity)
  //   "equity"     = total equity commitment (GP+LP, fixed)
  //   "devCost"    = development cost including land (same as fundAssets but explicit)
  //   "deployed"   = cumulative CAPEX deployed (legacy, incorrect for mgmt fee)
  let cumCapex = 0, cumIncome = 0;
  for (let y = fundStartIdx; y <= feeEndYr && y < h; y++) {
    // For hybrid: fund's share of income/capex for accurate NAV tracking
    cumCapex += Math.abs(c.capex[y] || 0) * hybridFundRatio;
    cumIncome += (c.income[y] || 0) * hybridFundRatio;
    if (isFund) {
      let mgmtBase = 0;
      if (mgmtFeeBase === "equity") {
        mgmtBase = fundEquityBasis;
      } else if (mgmtFeeBase === "devCost" || mgmtFeeBase === "fundAssets") {
        // For hybrid: fund portion only. For standard fund: total project cost.
        mgmtBase = fundFeeBasis;
      } else if (mgmtFeeBase === "nav") {
        // NAV proxy: equity + cumulative net income - cumulative capex (floor at equity)
        mgmtBase = Math.max(fundEquityBasis, fundEquityBasis + cumIncome - cumCapex);
      } else {
        // "deployed": cumulative CAPEX deployed (legacy)
        mgmtBase = cumCapex;
      }
      feeMgmt[y] = mgmtBase * mgmtFeeRate;
      if (mgmtFeeCap > 0 && feeMgmt[y] > mgmtFeeCap) feeMgmt[y] = mgmtFeeCap;
    }
    feeCustody[y] = annualCustody;
    feeAuditor[y] = auditorAnnual;
    // Operator fee: annual, when income > 0 (operating period)
    // Excel formula: IF(AND(year>=fundStart, year<=exitYear, income>0), MIN(cap, devCost*rate), 0)
    if (hasRentalAssets && operatorFeeBase > 0 && c.income[y] > 0) {
      feeOperator[y] = operatorFeeBase * operatorFeePct;
      const operatorCap = project.operatorFeeCap || 0;
      if (operatorCap > 0 && feeOperator[y] > operatorCap) feeOperator[y] = operatorCap;
    }
  }
  for (let y = 0; y < h; y++) fees[y] = feeSub[y] + feeMgmt[y] + feeCustody[y] + feeDev[y] + feeStruct[y] + feePreEst[y] + feeSpv[y] + feeAuditor[y] + feeOperator[y] + feeMisc[y];

  const totalFees = fees.reduce((a, b) => a + b, 0);

  // ── Phase A: Fee Attribution ──
  // Split fees into developer fees vs fund-level operating fees vs subscription/investor costs
  const _gpIsFundManager = project.gpIsFundManager !== false;
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
  const developerFeesReceived = _gpIsFundManager ? devFeesTotal + fundLevelFeesTotal : devFeesTotal;

  // ── ZAN: Unfunded Fees ──
  // Fees that operating CF cannot cover → must be funded from equity
  // ZAN: UnfundedFees[y] = MAX(0, Fees[y] - MAX(0, UnlevCF[y] + DS[y] + Exit[y]))
  // In ZAN: DS is negative. In our code: DS is positive → subtract.
  // FIX#20: Use incentive-adjusted netCF (was using raw c.netCF, ignoring grants/rebates)
  const ir = incentivesResult;
  const unfundedFees = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    if (fees[y] > 0) {
      const adjNetCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
      const operatingCF = adjNetCF - (f.debtService[y] || 0) + (f.exitProceeds?.[y] || 0);
      unfundedFees[y] = Math.max(0, fees[y] - Math.max(0, operatingCF));
    }
  }

  // H14: Fee treatment policy
  // "capital" = fees count as invested capital (earn ROC + Pref) - default, current behavior
  // "expense" = fees are expenses (outside capital base - don't earn Pref, smaller unreturned capital)
  const feeTreatment = project.feeTreatment || "capital";
  // ── Land Capitalization (in-kind equity at fund start) ──
  // effectiveLandCap is a non-cash equity contribution recognized at fund start.
  // ZAN Excel: land cap is distributed proportionally across construction (not lump sum).
  // It inflates GP's equity% → GP's share of ALL calls (incl. land cap) = gpPct.
  const effectiveLandCap = f.effectiveLandCap || 0;

  // ── Equity Calls ──
  // capitalCallOrder: "prorata" (default) = equity pro-rata to CAPEX each year
  //                   "debtFirst" = exhaust debt before calling equity (back-loaded calls, boosts IRR)
  // ZAN Excel convention: ALL equity (including land cap) distributed proportionally to CAPEX.
  // Land cap is NOT a lump sum — it's recognized as construction progresses.
  const callOrder = project.capitalCallOrder || "prorata";
  const equityCalls = new Array(h).fill(0);
  if (callOrder === "debtFirst" && f.drawdown && c.totalCapex > 0) {
    // Debt-First: equity = residual after debt drawdown each year, scaled to totalEquity
    const finEquityCalls = new Array(h).fill(0);
    let finTotalEquity = 0;
    for (let y = 0; y < h; y++) {
      finEquityCalls[y] = Math.max(0, (c.capex[y] || 0) - (f.drawdown[y] || 0));
      finTotalEquity += finEquityCalls[y];
    }
    const scale = finTotalEquity > 0 ? totalEquity / finTotalEquity : 0;
    for (let y = 0; y < h; y++) {
      equityCalls[y] = finEquityCalls[y] * scale + unfundedFees[y];
    }
  } else {
    // Pro-Rata (default): ALL equity (incl. land cap) distributed proportionally to CAPEX each year
    for (let y = 0; y < h; y++) {
      const capexPortion = c.totalCapex > 0 && c.capex[y] > 0 ? (c.capex[y] / c.totalCapex) * totalEquity : 0;
      equityCalls[y] = capexPortion + unfundedFees[y];
    }
  }
  // Gate equity calls to fund period: accumulate pre-fundStart into fundStartIdx
  // This matches Excel: IF(year >= fundStart, call, 0)
  if (fundStartIdx > 0) {
    let preFundCalls = 0;
    for (let y = 0; y < fundStartIdx; y++) {
      preFundCalls += equityCalls[y];
      equityCalls[y] = 0;
    }
    equityCalls[fundStartIdx] += preFundCalls;
  }

  // GP/LP call split
  // ZAN Excel: ALL calls (including land cap portion) split by overall equity ratio (gpPct/lpPct).
  // Land cap inflates GP equity% (e.g. 69.6%), so GP bears proportionally larger calls.
  // This is correct: land cap is an in-kind contribution — GP "pays" via land, not cash.
  const gpCalls = new Array(h).fill(0);
  const lpCalls = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    gpCalls[y] = equityCalls[y] * gpPct;
    lpCalls[y] = equityCalls[y] * lpPct;
  }

  // Exit proceeds - GROSS (net of exit cost only, NOT net of debt). Debt repaid via balloon in debtService.
  const exitProceeds = [...(f.exitProceeds || new Array(h).fill(0))];

  // Cash available for distribution - ZAN formula:
  // cashAvail[y] = MAX(0, IF(yr in [fundStart..exit], UnlevCF, 0) + DS - Fees + UF + Exit)
  // UnlevCF = c.netCF = income - landRent - CAPEX (already includes CAPEX, unlike NOI-only)
  // DS is positive in our code → subtract. Fees positive → subtract. UF positive → add back.
  const adjLandRent = ir?.adjustedLandRent || c.landRent;
  // Land rent payer resolution (platform-specific, not in ZAN)
  // IMPORTANT: Land rent is ALREADY deducted in unlevered CF (Income - LandRent - CAPEX).
  // cashAvail is based on unlevered CF, so distributions already reflect land rent cost.
  // Setting a specific payer (gp/lp) would DOUBLE-COUNT land rent unless we add it back to cashAvail.
  // Therefore: "auto" always resolves to "project" (shared via CF, no separate obligation).
  // Only explicit "gp"/"lp" with cashAvail adjustment would avoid double-counting (future enhancement).
  const lrPaidByRaw = project.landRentPaidBy || "auto";
  // Resolve land rent payer:
  // "auto"/"project" → land rent stays embedded in project CF (shared proportionally via waterfall)
  // "gp"/"lp"/"split" → land rent is UN-embedded from CF and charged directly to the designated party
  let resolvedLandRentPayer = "project";
  if (lrPaidByRaw === "gp" || lrPaidByRaw === "lp" || lrPaidByRaw === "split") {
    resolvedLandRentPayer = lrPaidByRaw;
  }
  const gpPaysLandRent = resolvedLandRentPayer === "gp" || resolvedLandRentPayer === "split";
  const lpPaysLandRent = resolvedLandRentPayer === "lp" || resolvedLandRentPayer === "split";
  const gpLandRentObligation = new Array(h).fill(0);
  const lpLandRentObligation = new Array(h).fill(0);
  const cashAvail = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    // When a specific payer is assigned, populate their obligation array.
    // The obligation is deducted from their net CF (lines ~480-481), NOT from cashAvail.
    if (resolvedLandRentPayer === "gp") {
      gpLandRentObligation[y] = adjLandRent[y];
    } else if (resolvedLandRentPayer === "lp") {
      lpLandRentObligation[y] = adjLandRent[y];
    } else if (resolvedLandRentPayer === "split") {
      gpLandRentObligation[y] = adjLandRent[y] * gpPct;
      lpLandRentObligation[y] = adjLandRent[y] * lpPct;
    }
    // ZAN Cash Available: MAX(0, NetCF + DS - TotalFees + UF + Exit)
    // IMPORTANT: unlevCF already has land rent deducted (Income - LandRent - CAPEX).
    // When a specific payer is assigned, we ADD BACK the land rent to cashAvail so it's
    // not double-counted (once in CF, once via obligation). The obligation arrays above
    // ensure the designated party still bears the cost in their net CF.
    const unlevCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
    const inPeriod = y >= fundStartIdx && y <= exitYr;
    const landRentAddBack = resolvedLandRentPayer !== "project" ? (adjLandRent[y] || 0) : 0;
    // Hybrid-GP: debt service is developer's personal obligation, NOT deducted from fund cashAvail.
    // The developer pays from their GP distributions (deducted in GP net CF below).
    // Hybrid-Project & standard: debt service deducted normally from project CF.
    const dsDeduction = isHybridGP ? 0 : (f.debtService[y] || 0);
    cashAvail[y] = Math.max(0,
      (inPeriod ? unlevCF : 0)
      + landRentAddBack
      - dsDeduction
      - fees[y]
      + unfundedFees[y]
      + exitProceeds[y]
    );
  }

  // ── INCOME FUND: Simplified distribution (no tiers, direct pro-rata) ──
  // Income funds distribute all available cash directly by ownership percentage.
  // No catch-up, no carry, no complex waterfall. Optional performance incentive.
  const isIncomeFundDist = isIncomeFund;

  // 4-tier waterfall (skipped for income fund — uses simplified path)
  const prefRate = isIncomeFundDist ? 0 : Math.max(0, Math.min(0.5, (project.prefReturnPct ?? 15) / 100));
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

    if (isIncomeFundDist) {
      // ── INCOME FUND: Simple pro-rata distribution ──
      // 1. Return of capital first (same as tier 1)
      if (unreturned > 0 && remaining > 0) {
        const t1 = Math.min(remaining, unreturned);
        tier1[y] = t1;
        remaining -= t1;
        cumReturned += t1;
      }
      // 2. Remaining cash distributed by ownership percentage (no pref, no catch-up, no carry)
      if (remaining > 0) {
        tier4LP[y] = remaining * lpPct;
        tier4GP[y] = remaining * gpPct;
        remaining = 0;
      }
      lpDist[y] = tier1[y] * lpPct + tier4LP[y];
      gpDist[y] = tier1[y] * gpPct + tier4GP[y];
    } else {
      // ── STANDARD FUND: 4-tier waterfall ──
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
      if (project.gpCatchup && remaining > 0 && carryPct > 0) {
        if (catchMethod === "perYear") {
          const catchup = Math.min(remaining, tier2[y] * carryPct / (1 - carryPct));
          tier3[y] = catchup;
          remaining -= catchup;
        } else {
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
      if (prefAlloc === "lpOnly") {
        lpDist[y] = tier1[y] * lpPct + tier2[y] + tier4LP[y];
        gpDist[y] = tier1[y] * gpPct + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);
      } else {
        lpDist[y] = (tier1[y] + tier2[y]) * lpPct + tier4LP[y];
        gpDist[y] = (tier1[y] + tier2[y]) * gpPct + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);
      }
    }

    unreturnedClose[y] = rocBase - cumReturned;
  }

  // ── Performance Incentive: Developer share of excess above Expected Annual Return ──
  // Two modes:
  //   "simple" (default, market convention): requiredAmount = lpCalled × (1 + rate × years)
  //   "irr" (compound/advanced): binary search on actual cash flows to find IRR-accurate excess
  // Settlement: deducted from last positive LP distribution, added to GP.
  let perfIncentiveAmount = 0;
  let perfIncentiveExcess = 0;
  let perfIncentiveYears = 0;
  let perfIncentiveSettleYear = -1;
  let perfIncentiveRequired = 0; // المبلغ المطلوب لتحقيق العائد المتوقع
  let lpIRR_preIncentive = null;
  let gpIRR_preIncentive = null;
  const perfIncentiveEnabled = !!project.performanceIncentive;
  const hurdleMode = project.hurdleMode || "simple";
  if (perfIncentiveEnabled && lpEquity > 0) {
    const hurdleRate = (project.hurdleIRR ?? 15) / 100;
    const incPct = (project.incentivePct ?? 20) / 100;
    perfIncentiveYears = Math.max(1, exitYr - fundStartIdx + 1);
    // Find last year with positive LP distribution (settlement year)
    for (let y = h - 1; y >= 0; y--) { if (lpDist[y] > 0) { perfIncentiveSettleYear = y; break; } }
    if (perfIncentiveSettleYear >= 0) {
      const sy_ = perfIncentiveSettleYear;
      const maxClawback = lpDist[sy_]; // can't take more than what's there
      // Pre-incentive LP totals
      const lpTotalDist_pre = lpDist.reduce((a, b) => a + b, 0);
      const lpTotalCalled_pre = lpCalls.reduce((a, b) => a + b, 0);
      // Build pre-incentive lpNetCF (needed for both modes — IRR reporting)
      const _preCF = new Array(h).fill(0);
      for (let y = 0; y < h; y++) _preCF[y] = -lpCalls[y] + lpDist[y] - lpLandRentObligation[y];
      lpIRR_preIncentive = calcIRR(_preCF);

      if (hurdleMode === "simple") {
        // ═══ Mode 1: Simple Annual Return (Market Convention) ═══
        // requiredAmount = totalInvested × (1 + rate × years)
        // excess = max(0, totalDistributions - requiredAmount)
        perfIncentiveRequired = lpTotalCalled_pre * (1 + hurdleRate * perfIncentiveYears);
        perfIncentiveExcess = Math.max(0, lpTotalDist_pre - perfIncentiveRequired);
        if (perfIncentiveExcess > 0) {
          perfIncentiveAmount = Math.min(perfIncentiveExcess * incPct, maxClawback);
          lpDist[sy_] -= perfIncentiveAmount;
          gpDist[sy_] += perfIncentiveAmount;
        }
      } else {
        // ═══ Mode 2: Compounded Return / IRR (Binary Search) ═══
        // Find max clawback that keeps Investor IRR = hurdleRate exactly
        perfIncentiveRequired = lpTotalCalled_pre * Math.pow(1 + hurdleRate, perfIncentiveYears);
        if (lpIRR_preIncentive !== null && lpIRR_preIncentive > hurdleRate) {
          let lo = 0, hi = maxClawback;
          for (let iter = 0; iter < 60; iter++) {
            const mid = (lo + hi) / 2;
            const tmpCF = [..._preCF];
            tmpCF[sy_] -= mid;
            const tmpIRR = calcIRR(tmpCF);
            if (tmpIRR === null || tmpIRR <= hurdleRate) {
              hi = mid;
            } else {
              lo = mid;
            }
            if (hi - lo < 1) break;
          }
          perfIncentiveExcess = lo;
          perfIncentiveAmount = Math.min(perfIncentiveExcess * incPct, maxClawback);
          lpDist[sy_] -= perfIncentiveAmount;
          gpDist[sy_] += perfIncentiveAmount;
        }
      }
    }
  }

  // LP Net Cash Flow: -equity calls (LP share) + distributions - land rent obligation
  // NOTE: lpDist/gpDist already include performance incentive settlement above
  const lpNetCF = new Array(h).fill(0);
  const gpNetCF = new Array(h).fill(0);
  const gpLandRentTotal = gpLandRentObligation.reduce((a,b) => a+b, 0);
  const lpLandRentTotal = lpLandRentObligation.reduce((a,b) => a+b, 0);
  for (let y = 0; y < h; y++) {
    lpNetCF[y] = -lpCalls[y] + lpDist[y] - lpLandRentObligation[y];
    // Hybrid-GP: developer pays debt service from their distributions
    const gpDebtObligation = isHybridGP ? (f.debtService[y] || 0) : 0;
    gpNetCF[y] = -gpCalls[y] + gpDist[y] - gpLandRentObligation[y] - gpDebtObligation;
  }

  const lpIRR = calcIRR(lpNetCF);
  const gpIRR = calcIRR(gpNetCF);
  const projIRR = c.irr;
  // Pre-incentive IRR: only different when incentive is applied
  if (lpIRR_preIncentive === null) lpIRR_preIncentive = lpIRR;
  if (gpIRR_preIncentive === null) gpIRR_preIncentive = gpIRR;
  // Build pre-incentive gpIRR if incentive was applied
  if (perfIncentiveAmount > 0) {
    const _gpPreCF = new Array(h).fill(0);
    for (let y = 0; y < h; y++) {
      const gpDistPre = y === perfIncentiveSettleYear ? gpDist[y] - perfIncentiveAmount : gpDist[y];
      _gpPreCF[y] = -gpCalls[y] + gpDistPre - gpLandRentObligation[y];
    }
    gpIRR_preIncentive = calcIRR(_gpPreCF);
  }

  // GP Cash IRR: excludes non-cash land cap from GP equity calls for truer cash-on-cash IRR.
  // When GP contributes land (in-kind), gpCalls includes the land value as a lump-sum at fund start.
  // This depresses IRR because a large "outflow" appears in year 1 that wasn't actually cash.
  // gpCashIRR removes the land cap portion from the call, showing return on actual cash invested.
  let gpCashIRR = gpIRR;
  let lpCashIRR = lpIRR;
  // Cash IRR: excludes non-cash land cap from equity calls for truer cash-on-cash return.
  // NOTE: For hybrid-GP, debt service is ALREADY deducted from gpNetCF (line ~510),
  // so no additional deduction needed here.
  const needsCashIRR = effectiveLandCap > 0;
  if (needsCashIRR) {
    const gpCashNetCF = new Array(h).fill(0);
    const lpCashNetCF = new Array(h).fill(0);
    for (let y = 0; y < h; y++) {
      // Land cap is distributed proportionally across construction (not lump sum).
      // Remove the in-kind land cap portion from each year's call for cash IRR.
      const landCapInCall = c.totalCapex > 0 && c.capex[y] > 0
        ? (c.capex[y] / c.totalCapex) * effectiveLandCap : 0;
      gpCashNetCF[y] = gpNetCF[y] + landCapInCall * gpPct;
      lpCashNetCF[y] = lpNetCF[y] + landCapInCall * lpPct;
    }
    gpCashIRR = calcIRR(gpCashNetCF);
    lpCashIRR = calcIRR(lpCashNetCF);
  }

  // MOIC: Total Distributions / Paid-In Capital (industry standard default)
  const lpTotalDist = lpDist.reduce((a, b) => a + b, 0);
  const gpTotalDist = gpDist.reduce((a, b) => a + b, 0);
  const lpNetDist = lpTotalDist - lpLandRentTotal;
  const gpNetDist = gpTotalDist - gpLandRentTotal;
  const lpTotalCalled = lpCalls.reduce((a, b) => a + b, 0);
  const gpTotalCalled = gpCalls.reduce((a, b) => a + b, 0);
  // Hybrid-GP: debt service is developer's obligation — deduct from GP distributions for true MOIC
  const gpDebtServiceTotal = isHybridGP ? (f.debtService || []).reduce((a, b) => a + b, 0) : 0;
  const gpAdjNetDist = gpNetDist - gpDebtServiceTotal;
  const lpMOIC = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpMOIC = gpTotalCalled > 0 ? gpAdjNetDist / gpTotalCalled : 0;
  const lpCommittedMOIC = lpEquity > 0 ? lpNetDist / lpEquity : 0;
  const gpCommittedMOIC = gpEquity > 0 ? gpAdjNetDist / gpEquity : 0;
  // GP Cash MOIC: excludes non-cash land cap from denominator for truer cash-on-cash measure
  // When GP contributes land (in-kind), their total called includes the land cap value,
  // which dilutes the MOIC. Cash MOIC shows return on actual cash invested only.
  const gpCashCalled = Math.max(0, gpTotalCalled - effectiveLandCap * gpPct);
  const lpCashCalled = Math.max(0, lpTotalCalled - effectiveLandCap * lpPct);
  // GP Cash MOIC: excludes non-cash land cap + deducts debt obligation for hybrid-GP
  let gpCashMOIC = gpCashCalled > 0 ? gpAdjNetDist / gpCashCalled : gpMOIC;
  const lpCashMOIC = lpCashCalled > 0 ? lpNetDist / lpCashCalled : lpMOIC;
  const lpDPI = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpDPI = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;

  // ── Phase C: Capital return + sponsor economics buckets ──
  const t1Total = tier1.reduce((a, b) => a + b, 0);
  const t2Total = tier2.reduce((a, b) => a + b, 0);
  const developerCapitalReturn = prefAlloc === "lpOnly"
    ? t1Total * gpPct
    : (t1Total + t2Total) * gpPct;
  const t3Total = tier3.reduce((a, b) => a + b, 0);
  const t4GPTotal = tier4GP.reduce((a, b) => a + b, 0);
  const sponsorWaterfallEconomics = t3Total + t4GPTotal;

  // ── Developer Economics: Two Hats ──
  // Hat 1: Developer-as-Investor (returns from equity position only, no incentive)
  const developerAsInvestor = gpTotalDist - perfIncentiveAmount;
  // Hat 2: Developer-as-Developer (fees + performance incentive)
  const developerDevFees = devFeesTotal; // paid during construction from project CF
  const developerPerfIncentive = perfIncentiveAmount; // settled in final distribution
  // Combined: total developer economics
  const developerTotalEconomics = developerAsInvestor + developerDevFees + developerPerfIncentive;

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

  // Simple Return (Saudi market convention: linear, non-compounded)
  const lpSimpleROE = lpTotalCalled > 0 ? (lpNetDist - lpTotalCalled) / lpTotalCalled : 0;
  const gpSimpleROE = gpTotalCalled > 0 ? (gpNetDist - gpTotalCalled) / gpTotalCalled : 0;
  // Investment period: first negative CF → last positive CF
  let _firstCall = -1, _lastDist = 0;
  for (let y = 0; y < h; y++) { if (lpNetCF[y] < 0 && _firstCall < 0) _firstCall = y; if (lpNetCF[y] > 0) _lastDist = y; }
  const investYears = Math.max(1, _firstCall >= 0 ? _lastDist - _firstCall + 1 : (exitYr > 0 ? exitYr : h));
  const lpSimpleAnnual = investYears > 0 ? lpSimpleROE / investYears : 0;
  const gpSimpleAnnual = investYears > 0 ? gpSimpleROE / investYears : 0;

  // ── Income Fund Metrics ──
  const distributionYield = new Array(h).fill(0);
  const payoutRatio = new Array(h).fill(0);
  const navEstimate = new Array(h).fill(0);
  const cumDistributions = new Array(h).fill(0);
  const ffoProxy = new Array(h).fill(0);
  let avgDistYield = 0;

  if (isIncomeFund && lpEquity > 0) {
    let cumDist = 0;
    let stableYields = [];
    const constrEnd = f.constrEnd || 0;
    for (let y = 0; y < h; y++) {
      const noi = (c.income[y] || 0) - (adjLandRent[y] || 0);
      cumDist += lpDist[y];
      cumDistributions[y] = cumDist;
      distributionYield[y] = lpEquity > 0 ? lpDist[y] / lpEquity : 0;
      payoutRatio[y] = cashAvail[y] > 0 ? (lpDist[y] + gpDist[y]) / cashAvail[y] : 0;
      navEstimate[y] = noi > 0 ? noi / 0.08 : (f.devCostInclLand || 0); // 8% cap rate proxy
      ffoProxy[y] = Math.max(0, noi - (fees[y] || 0) - (f.debtService?.[y] || 0));
      if (y > constrEnd && distributionYield[y] > 0) stableYields.push(distributionYield[y]);
    }
    avgDistYield = stableYields.length > 0 ? stableYields.reduce((a, b) => a + b, 0) / stableYields.length : 0;
  }

  return {
    isIncomeFund, distributionYield, avgDistYield, payoutRatio, navEstimate, cumDistributions, ffoProxy,
    gpEquity, lpEquity, totalEquity, gpPct, lpPct,
    fees, feeSub, feeMgmt, feeCustody, feeDev, feeStruct, feePreEst, feeSpv, feeAuditor, feeOperator, feeMisc, totalFees, unfundedFees,
    equityCalls, gpCalls, lpCalls, exitProceeds, cashAvail,
    tier1, tier2, tier3, tier4LP, tier4GP,
    lpDist, gpDist, lpNetCF, gpNetCF,
    unreturnedOpen, unreturnedClose, prefAccrual, prefAccumulated,
    lpIRR, gpIRR, gpCashIRR, lpCashIRR, projIRR, lpMOIC, gpMOIC, gpCashMOIC, gpCashCalled, lpCashMOIC, lpCashCalled, lpCommittedMOIC, gpCommittedMOIC, lpDPI, gpDPI,
    lpSimpleROE, gpSimpleROE, lpSimpleAnnual, gpSimpleAnnual, investYears,
    lpTotalInvested: lpTotalCalled, gpTotalInvested: gpTotalCalled, // aliases for UI backward compat
    lpTotalDist, gpTotalDist, lpNetDist, gpNetDist, lpTotalCalled, gpTotalCalled,
    gpLandRentObligation, gpLandRentTotal, lpLandRentObligation, lpLandRentTotal,
    gpPaysLandRent, lpPaysLandRent, resolvedLandRentPayer,
    lpNPV10, lpNPV12, lpNPV14, gpNPV10, gpNPV12, gpNPV14,
    projNPV10, projNPV12, projNPV14, isFund,
    prefAllocation: prefAlloc, catchupMethod: catchMethod,
    exitYear: exitYr + sy,
    // Phase A: Fee attribution
    gpIsFundManager: _gpIsFundManager, devFeesTotal, fundLevelFeesTotal, subFeesTotal, developerFeesReceived,
    // Phase C: Capital return + sponsor economics buckets
    developerCapitalReturn, sponsorWaterfallEconomics,
    // Phase C.1: Clean developer-fee-only field (always = devFeesTotal, never mixed)
    developerFeeOnlyReceived: devFeesTotal,
    // Performance Incentive (IRR-accurate, settled in distributions)
    perfIncentiveEnabled, perfIncentiveAmount, perfIncentiveExcess, perfIncentiveYears,
    perfIncentiveRequired, hurdleMode,
    perfIncentiveSettleYear: perfIncentiveSettleYear >= 0 ? perfIncentiveSettleYear + sy : null,
    lpIRR_preIncentive, gpIRR_preIncentive,
    // Developer Two-Hats breakdown
    developerAsInvestor, developerDevFees, developerPerfIncentive, developerTotalEconomics,
    // Phase B1: Saudi-style alias outputs (read-only aliases to existing GP/LP fields)
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
    // Hybrid separate cash flows (pass-through from financing engine)
    financingCF: f.financingCF, fundCF: f.fundCF, fullProjectExitVal: f.fullProjectExitVal,
    fundFeeBasis,
  };
}

// ═══════════════════════════════════════════════════════════════
// PER-PHASE WATERFALL (runs waterfall for each phase independently)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PHASE 3.5: PER-PHASE INDEPENDENT FINANCING & WATERFALL
// ═══════════════════════════════════════════════════════════════

// All financing fields that can be set per-phase
// build-bust 1774429214
