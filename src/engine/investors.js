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

  // === Modes without LPs: solo developer ===
  if (mode === 'self') {
    investors.push({
      id: 'dev', name: 'Developer', role: 'developer',
      contribution: { type: 'cash', amount: project.gpEquityManual || 0 },
    });
  } else if (mode === 'bank100') {
    // 100% debt — developer has zero equity but still owns the deal
    investors.push({
      id: 'dev', name: 'Developer', role: 'developer',
      contribution: { type: 'cash', amount: 0 },
    });
  } else if (mode === 'debt') {
    investors.push({
      id: 'dev', name: 'Developer', role: 'developer',
      contribution: { type: 'cash', amount: project.gpEquityManual || 0 },
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
 * Build per-investor equity amounts + pct, given a total equity pool to allocate.
 * Cash contributions keep their nominal amount; dynamic ones (devFee) resolve
 * against `context`; landValue/landCap use their valuation.
 *
 * Cash investors with `amount === 0` act as "fill the rest" — any residual
 * after fixed contributions is distributed pro-rata across them.
 *
 * @param {Array} investors
 * @param {number} totalEquity - target equity total (from financing.js)
 * @param {Object} context - { devFeeTotal, ... }
 * @returns {Array} [{ investorId, amount, source }]
 */
export function allocateEquity(investors, totalEquity, context = {}) {
  if (!Array.isArray(investors) || investors.length === 0) return [];

  // Pass 1: resolve all "known" contributions
  const resolved = investors.map(i => {
    const contrib = i.contribution || {};
    const isFillRest = contrib.type === 'cash' && (!contrib.amount || contrib.amount === 0);
    return {
      investorId: i.id,
      source: contrib.type,
      amount: isFillRest ? null : resolveContributionAmount(contrib, context),
      isFillRest,
    };
  });

  // Sum of fixed contributions
  const fixedTotal = resolved
    .filter(r => !r.isFillRest)
    .reduce((s, r) => s + (r.amount || 0), 0);

  const remainder = Math.max(0, totalEquity - fixedTotal);
  const fillRestCount = resolved.filter(r => r.isFillRest).length;

  // Distribute remainder evenly across "fill the rest" slots
  if (fillRestCount > 0) {
    const per = remainder / fillRestCount;
    resolved.forEach(r => { if (r.isFillRest) r.amount = per; });
  }

  // Cleanup
  return resolved.map(r => ({
    investorId: r.investorId,
    amount: r.amount || 0,
    source: r.source,
  }));
}
