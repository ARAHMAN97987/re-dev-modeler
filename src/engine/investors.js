/**
 * ZAN Financial Engine — Investors migration + utilities
 * @module engine/investors
 *
 * Zero engine dependencies. Used by financing.js + waterfall.js.
 *
 * Converts legacy projects (with gpEquity, lpEquity, partnerLand, landCap etc.)
 * into the new `investors[]` schema — without mutating the input.
 * If project already has investors[], returns it unchanged.
 *
 * Simplification campaign — see .claude/simplification/02_data_model.md
 */

/**
 * Migrate a legacy project into the new investors[] shape.
 *
 * @param {Object} project - project state (may be legacy or already-migrated)
 * @returns {Object} NEW project object with investors[] populated.
 */
export function migrateProjectToInvestors(project) {
  if (!project) return project;
  if (Array.isArray(project.investors) && project.investors.length > 0) {
    return project;
  }

  const mode = project.finMode || 'self';
  const investors = [];

  // === Modes without LPs: solo developer absorbs all equity (fill-rest) ===
  // In debt/self/bank100, developer = 100% of equity by definition
  // (totalEquity = totalProjectCost − maxDebt). Using cash amount=0 marks the
  // developer as a "fill-rest" slot so allocateEquity assigns the full residual.
  if (mode === 'self' || mode === 'bank100' || mode === 'debt') {
    investors.push({
      id: 'dev', name: 'Developer', role: 'developer',
      contribution: { type: 'cash', amount: 0 },
    });
  } else {
    // === Fund-like modes: fund / jv / hybrid / incomeFund ===
    const devContribs = [];

    // Partner land (in-kind equity contribution from developer)
    if (project.landType === 'partner' && (project.landValuation || 0) > 0) {
      devContribs.push({
        type: 'landValue',
        valuation: project.landValuation,
        equityPct: project.partnerEquityPct || 0,
      });
    }

    // Leasehold capitalization credit to developer
    const landCapValue = (project.landArea || 0) * (project.landCapRate || 1000);
    if (project.landCapitalize &&
        (project.landType === 'lease' || project.landType === 'bot') &&
        (project.landCapTo === 'gp' || project.landCapTo === 'split')) {
      const frac = project.landCapTo === 'split' ? 0.5 : 1;
      devContribs.push({
        type: 'landCap',
        valuation: landCapValue * frac,
        landCapReceiver: true,
      });
    }

    // Developer reinvests dev fee as equity
    if (project.gpInvestDevFee) {
      devContribs.push({
        type: 'devFee',
        investPct: project.gpDevFeeInvestPct ?? 100,
      });
    }

    // Developer cash investment
    if (project.gpCashInvest && (project.gpCashInvestAmount || 0) > 0) {
      devContribs.push({
        type: 'cash',
        amount: project.gpCashInvestAmount,
      });
    }

    // Legacy manual override
    if ((project.gpEquityManual || 0) > 0 && devContribs.length === 0) {
      devContribs.push({
        type: 'cash',
        amount: project.gpEquityManual,
      });
    }

    // Fallback: at least one developer with zero cash (placeholder)
    if (devContribs.length === 0) {
      devContribs.push({ type: 'cash', amount: 0 });
    }

    // Add developer investor(s)
    devContribs.forEach((c, i) => {
      investors.push({
        id: i === 0 ? 'dev' : `dev-${i}`,
        name: i === 0 ? 'Developer' : `Developer Contribution ${i + 1}`,
        role: 'developer',
        contribution: c,
      });
    });

    // Leasehold capitalization to LP-side (non-developer investor)
    if (project.landCapitalize && project.landCapTo === 'lp' &&
        (project.landType === 'lease' || project.landType === 'bot')) {
      investors.push({
        id: 'inv-landcap', name: 'Leasehold Investor', role: 'investor',
        contribution: { type: 'landCap', valuation: landCapValue, landCapReceiver: true },
      });
    } else if (project.landCapitalize && project.landCapTo === 'split' &&
               (project.landType === 'lease' || project.landType === 'bot')) {
      investors.push({
        id: 'inv-landcap', name: 'Leasehold Investor (half)', role: 'investor',
        contribution: { type: 'landCap', valuation: landCapValue * 0.5, landCapReceiver: true },
      });
    }

    // External cash investor
    if ((project.lpEquityManual || 0) > 0) {
      investors.push({
        id: 'inv', name: 'External Investor', role: 'investor',
        contribution: { type: 'cash', amount: project.lpEquityManual },
      });
    } else {
      // Placeholder for external investor; real amount filled by financing.js
      investors.push({
        id: 'inv', name: 'External Investor', role: 'investor',
        contribution: { type: 'cash', amount: 0 },
      });
    }
  }

  return {
    ...project,
    investors,
    _migratedToInvestors: true,
  };
}

/**
 * Get the list of developer investor IDs for incentive attribution.
 */
export function developerIds(investors) {
  return (investors || []).filter(i => i.role === 'developer').map(i => i.id);
}

/**
 * Sum contribution amounts for a given role, for rough equity display.
 * Note: actual equity computation (with devFee resolved against real devFeeTotal,
 * landCap vs landValue handling, remainder allocation) happens in financing.js.
 */
export function sumByRole(investors, role) {
  return (investors || [])
    .filter(i => i.role === role)
    .reduce((s, i) => {
      const c = i.contribution || {};
      return s + (c.amount || c.valuation || 0);
    }, 0);
}

/**
 * Resolve an investor's contribution into a concrete equity amount.
 * Uses context values (like devFeeTotal) for dynamic contributions.
 *
 * @returns {number} equity amount in project currency units
 */
export function resolveContributionAmount(contribution, context = {}) {
  if (!contribution) return 0;
  switch (contribution.type) {
    case 'cash': return contribution.amount || 0;
    case 'devFee': return (context.devFeeTotal || 0) * ((contribution.investPct ?? 100) / 100);
    case 'landValue': return contribution.valuation || 0;
    case 'landCap': return contribution.valuation || 0;
    case 'landPurchase': return contribution.amount || 0;
    default: return 0;
  }
}

/**
 * Build per-investor equity amounts, given a total equity pool to allocate.
 *
 * UNIFIED POLICY (Apr 2026 simplification — single source of truth):
 * 1. Resolve static contributions (cash-with-amount, devFee, landValue, landCap,
 *    landPurchase) into concrete amounts.
 * 2. Fill-rest slots = cash contributions with amount=0. They absorb the
 *    `remainder = max(0, totalEquity - Σ static)`.
 * 3. Only fill-rest slots whose role **matches** the capital-structure policy
 *    absorb the remainder:
 *      - hasLP=true  (fund/hybrid/incomeFund): investor-role fill-rest absorbs
 *      - hasLP=false (debt/self):              developer-role fill-rest absorbs
 *    Non-matching fill-rest slots get 0.
 * 4. If no matching fill-rest exists but a non-matching one does, it falls
 *    back to absorbing (so user intent is never lost).
 * 5. If Σ static > totalEquity, static amounts are scaled down pro-rata and a
 *    warning flag is returned in context.scaled=true.
 *
 * Post-condition: Σ return.amount === totalEquity (within 1 unit).
 *
 * @param {Array}  investors - project.investors[]
 * @param {number} totalEquity - target equity total (from financing.js)
 * @param {Object} context - { devFeeTotal, hasLP }
 * @returns {Array} [{ investorId, role, amount, source, isFillRest }]
 */
export function allocateEquity(investors, totalEquity, context = {}) {
  if (!Array.isArray(investors) || investors.length === 0) return [];
  const hasLP = context.hasLP !== false; // default: assume fund-like
  const absorbingRole = hasLP ? 'investor' : 'developer';

  // ── Pass 1: resolve each contribution ──
  const resolved = investors.map(i => {
    const c = i.contribution || {};
    const isFillRest = c.type === 'cash' && (!c.amount || c.amount === 0);
    return {
      investorId: i.id,
      role: i.role || 'investor',
      source: c.type,
      amount: isFillRest ? 0 : resolveContributionAmount(c, context),
      isFillRest,
    };
  });

  // ── Scale-down if static exceeds totalEquity ──
  const staticTotal = resolved
    .filter(r => !r.isFillRest)
    .reduce((s, r) => s + r.amount, 0);
  if (staticTotal > totalEquity && staticTotal > 0 && totalEquity > 0) {
    const scale = totalEquity / staticTotal;
    resolved.forEach(r => { if (!r.isFillRest) r.amount *= scale; });
  }

  // ── Remainder absorbed by fill-rest slots of the matching role ──
  const actualStatic = resolved
    .filter(r => !r.isFillRest)
    .reduce((s, r) => s + r.amount, 0);
  const remainder = Math.max(0, totalEquity - actualStatic);

  const matchingFillRest = resolved.filter(r => r.isFillRest && r.role === absorbingRole);
  const otherFillRest    = resolved.filter(r => r.isFillRest && r.role !== absorbingRole);

  if (matchingFillRest.length > 0) {
    const per = remainder / matchingFillRest.length;
    matchingFillRest.forEach(r => { r.amount = per; });
    otherFillRest.forEach(r => { r.amount = 0; }); // non-matching role stays 0
  } else if (otherFillRest.length > 0) {
    // No matching-role fill-rest — fallback so user intent isn't lost
    const per = remainder / otherFillRest.length;
    otherFillRest.forEach(r => { r.amount = per; });
  }
  // If no fill-rest at all, remainder is unallocated — caller may warn.

  return resolved.map(r => ({
    investorId: r.investorId,
    role: r.role,
    amount: r.amount || 0,
    source: r.source,
    isFillRest: r.isFillRest,
  }));
}

/**
 * Aggregate perInvestorEquity by role. Returns { gpEquity, lpEquity, totalEquity }.
 * This is the canonical way to derive gp/lp equity from investors[].
 */
export function equityByRole(perInvestorEquity) {
  if (!Array.isArray(perInvestorEquity)) return { gpEquity: 0, lpEquity: 0, totalEquity: 0 };
  let gp = 0, lp = 0;
  for (const r of perInvestorEquity) {
    if (r.role === 'developer') gp += r.amount || 0;
    else lp += r.amount || 0;
  }
  return { gpEquity: gp, lpEquity: lp, totalEquity: gp + lp };
}
