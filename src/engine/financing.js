/**
 * ZAN Financial Engine — Financing Calculator
 * @module engine/financing
 * 
 * Dependencies: engine/math.js (calcIRR), engine/incentives.js (applyInterestSubsidy)
 * Consumes: computeProjectCashFlows output + computeIncentives output
 * Produces: debt schedule, equity calls, levered CF, DSCR, exit proceeds
 */

import { calcIRR } from './math.js';
import { applyInterestSubsidy } from './incentives.js';

export function computeFinancing(project, projectResults, incentivesResult) {
  if (!project || !projectResults) return null;
  const h = project.horizon || 50;
  const startYear = project.startYear || 2026;
  const c = projectResults.consolidated;

  const ir = incentivesResult;

  // ── Find construction period (early detection for scanner + IDC) ──
  let _constrStartEarly = h, _constrEndEarly = 0;
  for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { _constrStartEarly = Math.min(_constrStartEarly, y); _constrEndEarly = Math.max(_constrEndEarly, y); } }

  // ── Exit year resolution ──
  // Smart: if user enters small number (< 100), treat as relative offset from startYear.
  // If calendar year (≥ startYear), convert to index. 0 = auto (optimal).
  const rawExitYear = project.exitYear || 0;

  // ── Optimal Exit Year Scanner ──
  // يجرب كل سنة تخارج ممكنة ويحسب levered IRR لكل واحدة ويختار الأعلى
  // Uses a lightweight simulation: exit proceeds + balloon repay at each candidate year
  // Income fund always holds — optional exit at end of fundLife
  const exitStrategy = project.finMode === "incomeFund" ? "hold" : (project.exitStrategy || "sale");
  const assetScheds = projectResults.assetSchedules || [];
  let optimalExitIdx = null;
  let optimalExitIRR = null;

  if (exitStrategy !== "hold") {
    // Always scan as advisory — recommendation shows regardless of manual exitYear
    const scanStart = _constrEndEarly + 1;
    const scanEnd = Math.min(_constrEndEarly + 25, h - 1);
    let bestIRR = -Infinity;
    let bestIdx = -1;

    for (let tryExit = scanStart; tryExit <= scanEnd; tryExit++) {
      let exitVal = 0;
      const exitIdx = Math.min(tryExit, h - 1);
      if (assetScheds.length > 0) {
        for (const as of assetScheds) {
          if (as.revType === "Sale") continue;
          const assetIncome = as.revenueSchedule[exitIdx] ?? 0;
          if (exitStrategy === "caprate") {
            const capRate = (project.exitCapRate ?? 9) / 100;
            exitVal += capRate > 0 ? assetIncome / capRate : 0;
          } else {
            exitVal += assetIncome * (project.exitMultiple ?? 10);
          }
        }
      } else {
        const stabIncome = c.income[exitIdx] || 0;
        // ZAN convention: exit value uses gross income (no land rent deduction), matching Excel
        if (exitStrategy === "caprate") {
          const capRate = (project.exitCapRate ?? 9) / 100;
          exitVal = capRate > 0 ? stabIncome / capRate : 0;
        } else {
          exitVal = stabIncome * (project.exitMultiple ?? 10);
        }
      }
      const exitCost = exitVal * (project.exitCostPct ?? 2) / 100;
      const netExit = Math.max(0, exitVal - exitCost);

      const tryCF = new Array(h).fill(0);
      const adjLR = ir?.adjustedLandRent || c.landRent;
      for (let y = 0; y <= tryExit && y < h; y++) {
        tryCF[y] = c.income[y] - adjLR[y] - c.capex[y]
          + (ir?.capexGrantSchedule?.[y] || 0) + (ir?.feeRebateSchedule?.[y] || 0);
      }
      tryCF[tryExit] += netExit;

      const tryIRR = calcIRR(tryCF);
      if (tryIRR !== null && isFinite(tryIRR) && tryIRR > bestIRR) {
        bestIRR = tryIRR;
        bestIdx = tryExit;
      }
    }
    if (bestIdx >= 0 && bestIRR > -Infinity && isFinite(bestIRR)) {
      optimalExitIdx = bestIdx;
      optimalExitIRR = bestIRR;
    }
  }

  // For auto exit year (exitYear=0): use optimal if found, else constrEnd+3
  const autoExitIdx = optimalExitIdx ?? (_constrEndEarly + 3);

  // ── Land Capitalization ──
  // Only for lease/bot — purchase has land in CAPEX already, partner uses landValuation
  const canCapitalize = project.landType === "lease" || project.landType === "bot";
  const landCapValue = (project.landCapitalize && canCapitalize) ? (project.landArea || 0) * (project.landCapRate || 1000) : 0;
  // H15: Partner land uses landValuation as equity contribution
  const partnerLandValue = project.landType === "partner" ? (project.landValuation || 0) : 0;
  const effectiveLandCap = landCapValue + partnerLandValue;
  const devCostExclLand = ir ? ir.adjustedCapex.reduce((a,b) => a+b, 0) : c.totalCapex;
  const capexGrantTotal = ir?.capexGrantTotal || 0;
  // NOTE: When landType=purchase, landPurchasePrice is ALREADY included in c.capex[0]
  // (added by cashflow.js line 225). cashLandCost must be 0 to avoid double-counting.
  // devCostExclLand = totalCapex (which includes land purchase when landType=purchase).
  const cashLandCost = 0;
  const devCostInclLand = devCostExclLand + effectiveLandCap;
  // True construction cost excluding land (for fee basis)
  const _landInCapexAll = project.landType === "purchase" ? (project.landPurchasePrice || 0) : 0;
  const buildCostOnly = Math.max(0, devCostExclLand - _landInCapexAll);

  // ── Dev fee (computed early — needed by ALL modes including self) ──
  const _landInCapex = project.landType === "purchase" ? (project.landPurchasePrice || 0) : 0;
  const _buildCapex = Math.max(0, c.totalCapex - _landInCapex);
  // Developer fee basis: exclLand (construction only, default) or inclLand (construction + land)
  const devFeeBasis = project.developerFeeBasis === "inclLand" ? devCostInclLand : _buildCapex;
  const devFeeTotal = devFeeBasis * (project.developerFeePct ?? 10) / 100;
  // DevFee schedule: spread over construction proportional to CAPEX
  const devFeeSchedule = new Array(h).fill(0);
  {
    let _cS = h, _cE = 0;
    for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { _cS = Math.min(_cS, y); _cE = Math.max(_cE, y); } }
    for (let y = _cS; y <= _cE && y < h; y++) {
      if (c.totalCapex > 0) devFeeSchedule[y] = devFeeTotal * (c.capex[y] / c.totalCapex);
    }
  }

  if (project.finMode === "self") {
    // For self-funded: use incentive-adjusted CF if available
    const selfCF = ir && ir.adjustedNetCF ? [...ir.adjustedNetCF] : [...c.netCF];
    // Deduct dev fee during construction (real cost to the project)
    for (let y = 0; y < h; y++) selfCF[y] -= devFeeSchedule[y];
    // ── Self-funded Exit ──
    let constrEndSelf = 0;
    for (let y = h - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEndSelf = y; break; } }
    const exitProceedsSelf = new Array(h).fill(0);
    const exitStrategySelf = project.exitStrategy || "sale";
    // Auto exit: optimal year for highest IRR (scanned above)
    const resolvedExitSelf = rawExitYear > 0 && rawExitYear < 100 ? rawExitYear : rawExitYear > 0 ? rawExitYear - startYear : 0;
    const exitYrSelf = exitStrategySelf === "hold" ? h - 1 : (resolvedExitSelf > 0 ? resolvedExitSelf : autoExitIdx);
    const selfSold = exitStrategySelf !== "hold" && exitYrSelf >= 0 && exitYrSelf < h;
    if (selfSold) {
      // FIX#1: Per-asset exit valuation - skip Sale assets (already realized)
      let exitVal = 0;
      const exitIdx = Math.min(exitYrSelf, h - 1);
      const fallbackIdx = Math.min(constrEndSelf + 2, h - 1);
      const assetScheds = projectResults.assetSchedules || [];
      if (assetScheds.length > 0) {
        for (const as of assetScheds) {
          if (as.revType === "Sale") continue; // Skip - already realized through sales
          const assetIncome = as.revenueSchedule[exitIdx] ?? as.revenueSchedule[fallbackIdx] ?? 0;
          if (exitStrategySelf === "caprate") {
            const capRate = (project.exitCapRate ?? 9) / 100;
            exitVal += capRate > 0 ? assetIncome / capRate : 0;
          } else {
            exitVal += assetIncome * (project.exitMultiple ?? 10);
          }
        }
      } else {
        const stabIncome = c.income[exitIdx] || c.income[fallbackIdx] || 0;
        // ZAN convention: exit value uses gross income (no land rent deduction), matching Excel
        if (exitStrategySelf === "caprate") {
          const capRateSelf = (project.exitCapRate ?? 9) / 100;
          exitVal = capRateSelf > 0 ? stabIncome / capRateSelf : 0;
        } else {
          exitVal = stabIncome * (project.exitMultiple ?? 10);
        }
      }
      const exitCost = exitVal * (project.exitCostPct ?? 2) / 100;
      exitProceedsSelf[exitYrSelf] = Math.max(0, exitVal - exitCost);
      selfCF[exitYrSelf] += exitProceedsSelf[exitYrSelf];
      // FIX#1: Zero out post-exit CF
      for (let y = exitYrSelf + 1; y < h; y++) selfCF[y] = 0;
    }
    const selfIRR = calcIRR(selfCF);
    return {
      mode: "self", landCapValue, effectiveLandCap, devCostExclLand, devCostInclLand, totalProjectCost: devCostInclLand, capexGrantTotal,
      gpEquity: devCostInclLand, lpEquity: 0, totalEquity: devCostInclLand, gpPct: 1, lpPct: 0,
      leveredCF: selfCF, debtBalOpen: new Array(h).fill(0), debtBalClose: new Array(h).fill(0),
      debtService: new Array(h).fill(0),
      interest: new Array(h).fill(0), originalInterest: new Array(h).fill(0),
      repayment: new Array(h).fill(0), drawdown: new Array(h).fill(0),
      equityCalls: c.capex.map((v, i) => Math.max(0, v + (c.landRent[i]||0))), dscr: new Array(h).fill(null),
      totalDebt: 0, totalInterest: 0, interestSubsidyTotal: 0, interestSubsidySchedule: new Array(h).fill(0),
      upfrontFee: 0, leveredIRR: selfIRR, exitProceeds: exitProceedsSelf,
      maxDebt: 0, rate: 0, tenor: 0, grace: 0, repayYears: 0, constrEnd: constrEndSelf, repayStart: 0, exitYear: exitYrSelf + startYear,
      optimalExitYear: optimalExitIdx != null ? optimalExitIdx + startYear : null, optimalExitIRR,
      devFeeTotal, devFeeSchedule,
    };
  }

  // ── Debt ──
  const isBank100 = project.finMode === "bank100";
  const isHybrid = project.finMode === "hybrid";
  const isHybridProject = isHybrid && (project.govBeneficiary || "project") === "project";
  const isHybridGP = isHybrid && project.govBeneficiary === "gp";
  const isIncomeFund = project.finMode === "incomeFund";

  let rate, tenor, grace, repayYears, maxDebt, upfrontFeePct;

  if (isHybrid) {
    // ── Hybrid (both project & gp): institutional financing is ALWAYS active ──
    // Both modes: financing draws during construction, visible in cash flow.
    // Difference: "project" = SPV debt (DSCR applies, affects LP).
    //             "gp" = developer's personal obligation (deducted from GP distributions only).
    rate = (project.govFinanceRate ?? 3.0) / 100;
    tenor = project.govLoanTenor ?? 15;
    grace = project.govGrace ?? 5;
    repayYears = Math.max(0, tenor - grace);
    maxDebt = devCostInclLand * (project.govFinancingPct ?? 70) / 100;
    upfrontFeePct = (project.govUpfrontFeePct || 0) / 100;
  } else {
    // Standard modes: self, debt, fund, jv, bank100
    rate = (project.financeRate ?? 6.5) / 100;
    tenor = project.loanTenor ?? 7;
    grace = project.debtGrace ?? 3;
    repayYears = Math.max(0, tenor - grace);
    maxDebt = isBank100 ? devCostInclLand : (project.debtAllowed ? devCostInclLand * (project.maxLtvPct ?? 70) / 100 : 0);
    upfrontFeePct = (project.upfrontFeePct || 0) / 100;
  }

  // ── Interest During Construction (IDC) estimation ──
  // When capitalizeIDC is true: estimate financing costs during construction
  // and add them to project cost → increases equity needed
  // IDC = progressive debt draws × rate during construction period
  // Upfront fees = each draw × upfront fee %
  // FIX#17: Use min(maxDebt, totalCapex) — actual drawable, not theoretical maxDebt.
  // maxDebt can exceed totalCapex when landCap inflates devCostInclLand.
  let estimatedIDC = 0;
  let estimatedUpfrontFees = 0;
  if (project.capitalizeIDC && maxDebt > 0 && rate > 0) {
    const totalCapex = c.totalCapex || 1;
    const drawableDebt = Math.min(maxDebt, totalCapex); // Actual draws capped to CAPEX
    let cumDraw = 0;
    for (let y = _constrStartEarly; y <= _constrEndEarly && y < h; y++) {
      const yearDraw = drawableDebt * ((c.capex[y] || 0) / totalCapex);
      const avgBalance = cumDraw + yearDraw / 2;
      estimatedIDC += avgBalance * rate;
      estimatedUpfrontFees += yearDraw * upfrontFeePct;
      cumDraw += yearDraw;
    }
  }
  const capitalizedFinCosts = (project.capitalizeIDC && !isBank100) ? (estimatedIDC + estimatedUpfrontFees) : 0;
  // NOTE: bank100 ignores capitalizeIDC because 100% debt financing inherently
  // includes construction interest in the loan — no separate capitalization needed.

  // ── Equity Structure ──
  const totalProjectCost = devCostInclLand + capitalizedFinCosts;
  let totalEquity = Math.max(0, totalProjectCost - maxDebt);
  let gpEquity, lpEquity;

  // Debt mode: developer owns 100% of equity. No LP exists.
  // Only fund and jv modes have LP investors.
  const hasLP = project.finMode === "fund" || project.finMode === "jv" || project.finMode === "hybrid" || isIncomeFund;

  // Dev fee already computed above (line ~115) — reuse devFeeTotal
  // GP investment from dev fee
  const gpDevFeeInvest = project.gpInvestDevFee ? devFeeTotal * ((project.gpDevFeeInvestPct ?? 100) / 100) : 0;
  // GP cash investment
  const gpCashInvest = project.gpCashInvest ? (project.gpCashInvestAmount || 0) : 0;

  if (!hasLP) {
    // debt / bank100 / any non-fund mode: GP = all equity, LP = 0
    gpEquity = totalEquity;
    lpEquity = 0;
  } else {
    // Fund/JV: GP equity = sum of 3 sources, LP = remainder
    // Source 1: Land capitalization credit
    let gpFromLandCap = 0;
    const landCapTarget = project.landCapTo || "gp";
    if (project.landType === "partner" && (project.partnerEquityPct || 0) > 0) {
      gpFromLandCap = totalEquity * ((project.partnerEquityPct || 50) / 100);
    } else if (effectiveLandCap > 0) {
      if (landCapTarget === "gp") gpFromLandCap = effectiveLandCap;
      else if (landCapTarget === "split") gpFromLandCap = effectiveLandCap * 0.5;
      // lp → gpFromLandCap = 0
    }

    // Source 2: Dev fee as investment
    const gpFromDevFee = gpDevFeeInvest;

    // Source 3: Cash investment
    const gpFromCash = gpCashInvest;

    // Legacy fallback: if old project has gpEquityManual > 0 and no new flags
    const hasNewFlags = project.gpInvestDevFee || project.gpCashInvest || effectiveLandCap > 0;
    if (!hasNewFlags && (project.gpEquityManual ?? 0) > 0) {
      gpEquity = Math.min(project.gpEquityManual, totalEquity);
    } else {
      gpEquity = Math.min(gpFromLandCap + gpFromDevFee + gpFromCash, totalEquity);
    }

    // LP Equity: manual override > remainder
    if ((project.lpEquityManual ?? 0) > 0) {
      lpEquity = Math.min(project.lpEquityManual, Math.max(0, totalEquity - gpEquity));
    } else {
      lpEquity = Math.max(0, totalEquity - gpEquity);
    }

    // Safety: if fund mode and both GP and LP = 0, force LP = 100%
    if ((project.finMode === "fund" || isHybrid) && lpEquity === 0 && gpEquity === 0 && totalEquity > 0) {
      lpEquity = totalEquity;
    }

    // ── Hybrid-GP: fund manages only the equity portion (30%) ──
    // Developer borrows 70% personally, but the fund only sees the remaining 30%.
    // totalEquity is already correct: totalProjectCost - maxDebt = 30%.
    // GP equity within the fund comes from normal sources (land cap + dev fee + cash).
    // The 70% government loan is NOT fund equity — it's separate financing.

    // Reconcile - GP + LP must equal totalEquity
    if (totalEquity > 0 && Math.abs((gpEquity + lpEquity) - totalEquity) > 1) {
      lpEquity = Math.max(0, totalEquity - gpEquity);
    }
  }

  // GP equity breakdown (for UI display)
  const gpEquityBreakdown = {
    landCap: hasLP ? Math.min(effectiveLandCap > 0 ? (landCapValue * ((project.landCapTo||"gp")==="gp"?1:(project.landCapTo||"gp")==="split"?0.5:0)) : 0, totalEquity) : 0,
    partnerLand: hasLP && project.landType === "partner" ? totalEquity * ((project.partnerEquityPct || 50) / 100) : 0,
    devFee: hasLP ? gpDevFeeInvest : 0,
    cash: hasLP ? gpCashInvest : 0,
    devFeeTotal,
  };

  let gpPct = isBank100 ? 1 : (totalEquity > 0 ? gpEquity / totalEquity : 0);
  let lpPct = isBank100 ? 0 : (totalEquity > 0 ? lpEquity / totalEquity : 0);

  // ── Construction period ──
  let constrStart = h, constrEnd = 0;
  for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { constrStart = Math.min(constrStart, y); constrEnd = Math.max(constrEnd, y); } }
  // Fund start: user input or 1 year before construction (same formula as waterfall.js)
  const computedFundStartIdx = (project.fundStartYear || 0) > 0 ? project.fundStartYear - startYear : constrStart;

  // ── Debt drawdown ──
  // scheduledUses = CAPEX schedule (land purchase already in capex[0] from cashflow.js)
  const scheduledUses = [...c.capex];
  const totalScheduledUses = scheduledUses.reduce((a, b) => a + b, 0);
  const drawdown = new Array(h).fill(0);
  const equityCalls = new Array(h).fill(0);
  let totalDrawn = 0;
  // Debt ratio based on financeable uses (scheduled uses only, upfront fee is per-draw interest)
  const financeableUses = totalScheduledUses;
  const actualMaxDebt = Math.min(maxDebt, financeableUses);
  // For hybrid mode, hybridDrawOrder controls financing-vs-fund priority
  // (capitalCallOrder still controls fund-internal debt-vs-equity if fund has its own debt)
  const callOrder = isHybrid
    ? (project.hybridDrawOrder || "finFirst")  // hybrid default: financing first (cheaper)
    : (project.capitalCallOrder || "prorata");
  const useDebtFirst = callOrder === "debtFirst" || callOrder === "finFirst";

  if (useDebtFirst) {
    // ── Debt-First Mode: draw all available debt before any equity ──
    // Each year: use debt first up to actualMaxDebt, equity covers the rest
    for (let y = 0; y < h; y++) {
      if (scheduledUses[y] > 0 && totalDrawn < actualMaxDebt) {
        const draw = Math.min(scheduledUses[y], actualMaxDebt - totalDrawn);
        drawdown[y] = draw;
        totalDrawn += draw;
      }
      equityCalls[y] = Math.max(0, scheduledUses[y] - drawdown[y]);
    }
  } else {
    // ── Pro-Rata Mode (default): debt and equity drawn proportionally each year ──
    const debtRatio = totalScheduledUses > 0 ? Math.min(actualMaxDebt / totalScheduledUses, 1) : 0;
    for (let y = 0; y < h; y++) {
      if (scheduledUses[y] > 0 && totalDrawn < actualMaxDebt) {
        const draw = Math.min(scheduledUses[y] * debtRatio, actualMaxDebt - totalDrawn);
        drawdown[y] = draw;
        totalDrawn += draw;
      }
      equityCalls[y] = Math.max(0, scheduledUses[y] - drawdown[y]);
    }
  }

  // Gate equity calls and drawdowns to fund period [fundStart..exit]
  // Any CAPEX before fund start → accumulate into fund start year (like Excel: IF(yr>=fundStart,...))
  // HYBRID exception: institutional debt drawdowns happen during construction regardless of fund start
  if (computedFundStartIdx > 0) {
    let preFundEquity = 0;
    let preFundDebt = 0;
    for (let y = 0; y < computedFundStartIdx; y++) {
      preFundEquity += equityCalls[y];
      equityCalls[y] = 0;
      if (!isHybrid) {
        // Non-hybrid: gate both debt and equity to fund start
        preFundDebt += drawdown[y];
        drawdown[y] = 0;
      }
      // Hybrid: debt drawdowns stay in their original construction year
    }
    equityCalls[computedFundStartIdx] += preFundEquity;
    if (!isHybrid) {
      drawdown[computedFundStartIdx] += preFundDebt;
    }
  }

  // Land capitalization value added as equity call at fund start (non-cash but counts as equity)
  if (effectiveLandCap > 0) equityCalls[computedFundStartIdx] += effectiveLandCap;

  // ── Post-drawdown reconciliation ──
  // When actualMaxDebt < maxDebt (e.g. landCap inflates devCost beyond cash needs),
  // equity must absorb the difference to keep Sources = Uses balanced.
  if (!isBank100 && totalDrawn < maxDebt && totalProjectCost > 0) {
    const prevEquity = totalEquity;
    totalEquity = Math.max(0, totalProjectCost - totalDrawn);
    if (totalEquity !== prevEquity) {
      if (prevEquity > 0) {
        // Scale GP/LP proportionally to preserve split ratio
        const scale = totalEquity / prevEquity;
        gpEquity *= scale;
        lpEquity = totalEquity - gpEquity;
      } else {
        // BUG#21 fix: prevEquity=0 but totalEquity>0 → recompute GP/LP from scratch
        // This happens when maxDebt ≥ TPC but actual draws < TPC (e.g. landCap + high LTV)
        const landCapTarget = project.landCapTo || "gp";
        let gpFromLandCap = 0;
        if (effectiveLandCap > 0) {
          if (landCapTarget === "gp") gpFromLandCap = effectiveLandCap;
          else if (landCapTarget === "split") gpFromLandCap = effectiveLandCap * 0.5;
        }
        gpEquity = Math.min(gpFromLandCap + gpDevFeeInvest + gpCashInvest, totalEquity);
        lpEquity = Math.max(0, totalEquity - gpEquity);
        if (hasLP && lpEquity === 0 && gpEquity === 0 && totalEquity > 0) {
          lpEquity = totalEquity;
        }
      }
      gpPct = totalEquity > 0 ? gpEquity / totalEquity : 0;
      lpPct = totalEquity > 0 ? lpEquity / totalEquity : 0;
    }
  }

  // ── Debt balance + repayment ──
  const debtBalOpen = new Array(h).fill(0);
  const debtBalClose = new Array(h).fill(0);
  const repay = new Array(h).fill(0);
  const interest = new Array(h).fill(0);
  const debtService = new Array(h).fill(0);

  // H10: Grace basis - "firstDraw" / "cod" / "fundStart" (ZAN: from fund start year)
  const graceBasis = project.graceBasis || "cod";
  let graceStartIdx = constrEnd; // default: COD
  if (graceBasis === "fundStart") {
    graceStartIdx = computedFundStartIdx;
  } else if (graceBasis === "firstDraw") {
    for (let y = 0; y < h; y++) { if (drawdown[y] > 0) { graceStartIdx = y; break; } }
  } else if (project.debtGraceStartYear > 0) {
    graceStartIdx = Math.max(0, project.debtGraceStartYear - startYear);
  }
  // else: graceStartIdx = constrEnd (COD default)
  const repayStart = graceStartIdx + grace;

  // ── Tranche mode: 'single' (default/ZAN) vs 'perDraw' (each drawdown = independent loan) ──
  const trancheMode = project.debtTrancheMode || "single";
  const repayType = isHybridProject ? (project.govRepaymentType || "amortizing") : (project.repaymentType || "amortizing");
  let tranches = null; // Only populated for perDraw mode (for reporting)

  if (trancheMode === "perDraw" && repayYears > 0) {
    // ═══ PER-DRAW TRANCHE MODE ═══
    // ZAN Excel convention: all tranches share the SAME repayStart (firstDraw + grace).
    // Excel template rows 130-139 each use the SAME grace period countdown from fund start,
    // not from individual draw date. repayStart was already computed above.
    // Excel formula: Tranche N repays when year >= fundStart + N + grace
    // Row 130 (N=0): year >= fundStart+0+grace, Row 131 (N=1): year >= fundStart+1+grace
    let trancheIndex = 0;
    tranches = [];
    for (let y = 0; y < h; y++) {
      if (drawdown[y] > 0) {
        const excelRepayStart = computedFundStartIdx + trancheIndex + grace;
        tranches.push({
          drawYear: y,
          amount: drawdown[y],
          repayStart: excelRepayStart, // ZAN Excel: fundStart + trancheN + grace
          annualRepay: drawdown[y] / repayYears,
          balOpen: new Array(h).fill(0),
          balClose: new Array(h).fill(0),
          repay: new Array(h).fill(0),
          interest: new Array(h).fill(0),
        });
        trancheIndex++;
      }
    }

    // Compute each tranche independently
    for (const tr of tranches) {
      for (let y = 0; y < h; y++) {
        tr.balOpen[y] = y === 0 ? 0 : tr.balClose[y - 1];
        let bal = tr.balOpen[y] + (y === tr.drawYear ? tr.amount : 0);

        if (y >= tr.repayStart && bal > 0 && repayType === "amortizing") {
          tr.repay[y] = Math.min(tr.annualRepay, bal);
        } else if (repayType === "bullet") {
          const bulletYear = Math.min(tr.repayStart + repayYears - 1, h - 1);
          if (y === bulletYear && bal > 0) tr.repay[y] = bal;
        }

        tr.balClose[y] = bal - tr.repay[y];
        // Interest: average balance × rate + upfront fee on draw year
        tr.interest[y] = (tr.balOpen[y] + tr.balClose[y]) / 2 * rate
          + (y === tr.drawYear ? tr.amount * upfrontFeePct : 0);
        if (tr.interest[y] < 0) tr.interest[y] = 0;
      }
    }

    // Aggregate all tranches
    for (let y = 0; y < h; y++) {
      for (const tr of tranches) {
        debtBalOpen[y] += tr.balOpen[y];
        debtBalClose[y] += tr.balClose[y];
        repay[y] += tr.repay[y];
        interest[y] += tr.interest[y];
      }
      debtService[y] = repay[y] + interest[y];
    }
    // Sweep any residual debt at horizon end (per-tranche rounding)
    if (debtBalClose[h - 1] > 1) {
      repay[h - 1] += debtBalClose[h - 1];
      debtService[h - 1] = repay[h - 1] + interest[h - 1];
      debtBalClose[h - 1] = 0;
    }
  } else {
    // ═══ SINGLE BLOCK MODE (default, matches ZAN) ═══
    const annualRepay = repayYears > 0 ? totalDrawn / repayYears : 0;

    for (let y = 0; y < h; y++) {
      debtBalOpen[y] = y === 0 ? 0 : debtBalClose[y - 1];
      let bal = debtBalOpen[y] + drawdown[y];
      if (y >= repayStart && bal > 0 && repayType === "amortizing") {
        repay[y] = Math.min(annualRepay, bal);
      } else if (repayType === "bullet") {
        // Cap bullet to last year of horizon if it would exceed
        const bulletYear = Math.min(repayStart + repayYears - 1, h - 1);
        if (y === bulletYear && bal > 0) repay[y] = bal;
      }
      debtBalClose[y] = bal - repay[y];
      // ZAN interest: average of opening and closing balance × rate + per-draw upfront fee
      interest[y] = (debtBalOpen[y] + debtBalClose[y]) / 2 * rate + drawdown[y] * upfrontFeePct;
      if (interest[y] < 0) interest[y] = 0;
      debtService[y] = repay[y] + interest[y];
    }
    // Sweep any residual debt at horizon end (rounding or tenor > horizon)
    if (debtBalClose[h - 1] > 1) {
      repay[h - 1] += debtBalClose[h - 1];
      debtService[h - 1] = repay[h - 1] + interest[h - 1];
      debtBalClose[h - 1] = 0;
    }
  }

  // Total upfront fee = sum of per-draw fees (for reporting)
  const upfrontFee = drawdown.reduce((s, d) => s + d * upfrontFeePct, 0);

  // ── Exit ──
  const exitProceeds = new Array(h).fill(0);
  // Resolve exit year: rawExitYear defined at top of function
  const resolvedExitYear = rawExitYear > 0 && rawExitYear < 100
    ? rawExitYear  // Relative offset (e.g., 10 = year index 10)
    : rawExitYear > 0
      ? rawExitYear - startYear  // Calendar year (e.g., 2036 → index 10)
      : 0;
  const exitYr = exitStrategy === "hold" ? h - 1 : (resolvedExitYear > 0 ? resolvedExitYear : autoExitIdx);

  if (exitStrategy !== "hold" && exitYr >= 0 && exitYr < h) {
    // H8: Per-component exit valuation
    let exitVal = 0;
    const exitIdx = Math.min(exitYr, h - 1);
    const fallbackIdx = Math.min(constrEnd + 2, h - 1);
    const assetScheds = projectResults.assetSchedules || [];
    if (assetScheds.length > 0) {
      for (const as of assetScheds) {
        const assetIncome = as.revenueSchedule[exitIdx] ?? as.revenueSchedule[fallbackIdx] ?? 0;
        if (as.revType === "Sale") {
          // Sale: remaining unsold value (skip - already realized through sales)
        } else if (exitStrategy === "caprate") {
          // CapRate exit: ALL assets valued at income/capRate (matches Excel: totalIncome/$C$45)
          // This is standard real estate cap rate valuation applied to total property income.
          const capRate = (project.exitCapRate ?? 9) / 100;
          exitVal += capRate > 0 ? assetIncome / capRate : 0;
        } else {
          // Sale exit: income × multiple for all asset types
          exitVal += assetIncome * (project.exitMultiple ?? 10);
        }
      }
    } else {
      // Fallback: old method if no asset schedules
      const stabIncome = c.income[exitIdx] || c.income[fallbackIdx] || 0;
      // ZAN convention: exit value uses gross income (no land rent deduction), matching Excel
      if (exitStrategy === "caprate") {
        const capRate = (project.exitCapRate ?? 9) / 100;
        exitVal = capRate > 0 ? stabIncome / capRate : 0;
      } else {
        exitVal = stabIncome * (project.exitMultiple ?? 10);
      }
    }
    const exitCost = exitVal * (project.exitCostPct ?? 2) / 100;
    // ZAN: Exit proceeds are GROSS (not net of debt)
    // Debt is repaid through normal schedule. If exit before maturity,
    // remaining debt is paid off as balloon repayment in exit year.
    exitProceeds[exitYr] = Math.max(0, exitVal - exitCost);
  }

  // Determine if project was sold (not hold)
  const sold = exitStrategy !== "hold" && exitYr >= 0 && exitYr < h;
  // Balloon at exit: for perDraw + fund/jv, ZAN Excel does NOT balloon remaining debt into DS.
  // Exit proceeds (gross) implicitly cover remaining debt as part of the sale transaction.
  // For single tranche OR debt-only mode, balloon IS added (conventional modeling).
  const isFundPerDraw = trancheMode === "perDraw" && (project.finMode === "fund" || project.finMode === "jv" || isHybrid || isIncomeFund);
  if (sold && !isFundPerDraw && debtBalClose[exitYr] > 0) {
    const remainingDebt = debtBalClose[exitYr];
    repay[exitYr] += remainingDebt;
    debtBalClose[exitYr] = 0;
    debtService[exitYr] = repay[exitYr] + interest[exitYr];
  }
  // Zero out post-exit debt schedule
  if (sold) {
    for (let y = exitYr + 1; y < h; y++) {
      drawdown[y] = 0;
      repay[y] = 0;
      interest[y] = 0;
      debtBalOpen[y] = 0;
      debtBalClose[y] = 0;
      debtService[y] = 0;
    }
    // Also clean up individual tranches post-exit (for reporting)
    if (tranches) {
      for (const tr of tranches) {
        for (let y = exitYr + 1; y < h; y++) {
          tr.balOpen[y] = 0; tr.balClose[y] = 0; tr.repay[y] = 0; tr.interest[y] = 0;
        }
      }
    }
  }

  // ── Apply interest subsidy ──
  const intSub = applyInterestSubsidy(project, interest, constrEnd, totalDrawn, rate);
  const adjustedInterest = intSub.adjusted;
  const adjustedDebtService = new Array(h).fill(0);
  for (let y = 0; y < h; y++) adjustedDebtService[y] = repay[y] + adjustedInterest[y];

  // ── Levered CF (with incentives) ──
  // landRent is positive (cost amount), income is positive (revenue)
  const adjustedLandRent = ir?.adjustedLandRent || c.landRent;
  const leveredCF = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    if (sold && y > exitYr) { leveredCF[y] = 0; continue; }
    leveredCF[y] = c.income[y] - adjustedLandRent[y] - c.capex[y]
      + (ir?.capexGrantSchedule?.[y] || 0) + (ir?.feeRebateSchedule?.[y] || 0)
      - adjustedDebtService[y] + drawdown[y] + exitProceeds[y]
      - devFeeSchedule[y]; // Dev fee is a real cost during construction
  }

  // ── DSCR (using adjusted interest) ──
  // NOTE: DSCR uses (Income - Land Rent) as proxy for NOI/CFADS.
  // For lender-grade models, replace with actual NOI after opex deduction per asset.
  const dscr = new Array(h).fill(null);
  for (let y = 0; y < h; y++) {
    if (adjustedDebtService[y] > 0) { dscr[y] = (c.income[y] - adjustedLandRent[y]) / adjustedDebtService[y]; }
  }

  // ── Hybrid: Separate cash flows (financing portion + fund portion) ──
  // Treats hybrid as two virtual perspectives for display:
  //   financingCF: debt flows only (drawdowns in, debt service out)
  //   fundCF: what equity holders receive (levered CF = project CF after debt)
  //   These are additive: unlevered CF = financingCF + fundCF
  //   NOTE: The waterfall uses leveredCF (= fundCF) which is CORRECT —
  //   full income → pay debt → residual goes to fund equity holders (GP/LP)
  let financingCF = null;
  let fundCF = null;
  let fullProjectExitVal = 0;
  if (isHybrid) {
    financingCF = new Array(h).fill(0);
    fundCF = new Array(h).fill(0);
    for (let y = 0; y < h; y++) {
      // Financing side: debt flows only (net lending activity)
      financingCF[y] = drawdown[y] - adjustedDebtService[y];
      // Fund side: everything after debt = levered CF (what equity holders get)
      fundCF[y] = leveredCF[y];
    }
    // Full project exit value for display (before debt payoff)
    fullProjectExitVal = exitProceeds[exitYr] || 0;
  }

  // ── Hybrid-GP: Developer personal loan reference ──
  // In GP mode, the main debt schedule IS the developer's loan (same drawdown/interest/repayment).
  // We just reference it so waterfall can deduct DS from GP distributions instead of project CF.
  let gpPersonalDebt = null;
  if (isHybridGP) {
    gpPersonalDebt = {
      ds: [...adjustedDebtService],
      interest: [...adjustedInterest],
      repayment: [...repay],
      balanceOpen: [...debtBalOpen],
      balanceClose: [...debtBalClose],
      totalAmount: totalDrawn,
    };
    // Note: interest subsidy already applied to adjustedInterest/adjustedDebtService above
    if (intSub.total > 0) {
      gpPersonalDebt.interestSubsidySavings = intSub.total;
    }
  }

  // ── Hybrid metadata ──
  // Use actual drawn amount (may differ from theoretical maxDebt due to reconciliation)
  const govLoanAmount = isHybrid ? totalDrawn : 0;
  const fundPortionCost = isHybrid ? Math.max(0, totalProjectCost - govLoanAmount) : null;

  return {
    mode: project.finMode, landCapValue, effectiveLandCap, devCostExclLand, devCostInclLand, totalProjectCost, capexGrantTotal,
    gpEquity, lpEquity, totalEquity, gpPct, lpPct, gpEquityBreakdown,
    capitalizedFinCosts, estimatedIDC, estimatedUpfrontFees,
    drawdown, equityCalls, debtBalOpen, debtBalClose,
    repayment: repay, interest: adjustedInterest, originalInterest: interest,
    debtService: adjustedDebtService, leveredCF, dscr, exitProceeds,
    totalDebt: totalDrawn, totalInterest: adjustedInterest.reduce((a, b) => a + b, 0),
    interestSubsidyTotal: intSub.total, interestSubsidySchedule: intSub.savings,
    upfrontFee, maxDebt, rate, tenor, grace, repayYears, graceStartIdx,
    leveredIRR: calcIRR(leveredCF), constrEnd, constrStart, repayStart, exitYear: exitYr + startYear,
    computedFundStartYear: computedFundStartIdx + startYear,
    incomeStabilizationYear: autoExitIdx + startYear, optimalExitYear: optimalExitIdx != null ? optimalExitIdx + startYear : null, optimalExitIRR,
    trancheMode, tranches,
    devFeeTotal, devFeeSchedule,
    // Hybrid financing fields
    isHybrid, govBeneficiary: isHybrid ? (project.govBeneficiary || "project") : null,
    govFinancingPct: isHybrid ? (project.govFinancingPct ?? 70) : null,
    govLoanAmount, govLoanRate: isHybrid ? (project.govFinanceRate ?? 3.0) / 100 : null,
    gpPersonalDebt, fundPortionCost, buildCostOnly,
    // Separate cash flows for hybrid mode (two virtual projects)
    financingCF, fundCF, fullProjectExitVal,
    // Income fund fields
    isIncomeFund, fundLife: isIncomeFund ? (project.fundLife || 5) : null,
    targetYield: isIncomeFund ? (project.targetYield || 8) : null,
  };
}
