/**
 * Report Data Collector — gathers ALL data needed for the Advisory Report
 * READ-ONLY: never modifies project data.
 */

export function collectReportData(project, results, financing, waterfall, incentivesResult, smartAlerts) {
  if (!project) return null;
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;
  const ir = incentivesResult;

  // Compute DSCR stats
  const dscrArr = f?.dscr?.filter(v => v != null && isFinite(v) && v > 0) || [];
  const minDSCR = dscrArr.length ? Math.min(...dscrArr) : null;
  const avgDSCR = dscrArr.length ? dscrArr.reduce((a, b) => a + b, 0) / dscrArr.length : null;

  return {
    project: {
      name: project.name || "Unnamed Project",
      location: project.location || "",
      startYear: project.startYear || 2026,
      horizon: project.horizon || 50,
      currency: project.currency || "SAR",
      landType: project.landType,
      landArea: project.landArea,
      landRentAnnual: project.landRentAnnual,
      finMode: project.finMode || "self",
      softCostPct: project.softCostPct,
      contingencyPct: project.contingencyPct,
      totalAssets: (project.assets || []).length,
      phases: (project.phases || []).map(p => p.name),
      exitStrategy: project.exitStrategy,
      exitYear: project.exitYear,
      exitMultiple: project.exitMultiple,
    },
    assets: (project.assets || []).map(a => ({
      phase: a.phase, category: a.category, name: a.name,
      gfa: a.gfa, plotArea: a.plotArea, footprint: a.footprint,
      revType: a.revType, costPerSqm: a.costPerSqm,
      leaseRate: a.leaseRate, opEbitda: a.opEbitda,
      efficiency: a.efficiency, stabilizedOcc: a.stabilizedOcc,
      constrDuration: a.constrDuration, rampUpYears: a.rampUpYears,
      escalation: a.escalation,
    })),
    financials: {
      totalCAPEX: c?.totalCapex,
      totalRevenue: c?.totalIncome,
      totalLandRent: c?.totalLandRent,
      totalNetCF: c?.totalNetCF,
      projectIRR: c?.irr,
      npv10: c?.npv10,
      npv12: c?.npv12,
      paybackYear: c?.paybackYear,
      peakNegative: c?.peakNegative,
    },
    financing: f ? {
      mode: project.finMode,
      totalEquity: f.totalEquity,
      totalDebt: f.totalDebt,
      gpEquity: f.gpEquity,
      lpEquity: f.lpEquity,
      ltvActual: f.totalDebt && f.totalProjectCost ? (f.totalDebt / f.totalProjectCost * 100).toFixed(1) + "%" : null,
      rate: f.rate,
      tenor: f.tenor,
      grace: f.grace,
      minDSCR, avgDSCR,
      leveredIRR: f.leveredIRR,
      totalInterest: f.totalInterest,
    } : null,
    waterfall: w ? {
      lpIRR: w.lpIRR, gpIRR: w.gpIRR,
      lpMOIC: w.lpMOIC, gpMOIC: w.gpMOIC,
      lpTotalDist: w.lpTotalDist, gpTotalDist: w.gpTotalDist,
      totalFees: w.totalFees,
      prefReturnPct: project.prefReturnPct,
      carryPct: project.carryPct,
    } : null,
    incentives: ir ? {
      totalValue: ir.totalIncentiveValue,
      capexGrant: ir.capexGrantTotal,
      landRentSaving: ir.landRentSavingTotal,
      interestSubsidy: f?.interestSubsidyTotal || 0,
    } : null,
    alerts: {
      total: (smartAlerts || []).length,
      critical: (smartAlerts || []).filter(a => a.severity === "critical").length,
      warning: (smartAlerts || []).filter(a => a.severity === "warning").length,
      items: (smartAlerts || []).filter(a => a.severity === "critical" || a.severity === "warning").slice(0, 10).map(a => ({
        id: a.id, severity: a.severity, ar: a.ar, en: a.en, assetName: a.assetName,
      })),
    },
    generatedAt: new Date().toISOString(),
  };
}
