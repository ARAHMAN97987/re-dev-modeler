/**
 * Report Data Collector — gathers TRIMMED data for the Advisory Report
 * Keeps payload under ~3000 tokens for fast API response.
 * READ-ONLY: never modifies project data.
 */

export function collectReportData(project, results, financing, waterfall, incentivesResult, smartAlerts) {
  if (!project) return null;
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;

  // DSCR stats (computed, not full array)
  const dscrArr = f?.dscr?.filter(v => v != null && isFinite(v) && v > 0) || [];
  const minDSCR = dscrArr.length ? Math.min(...dscrArr) : null;
  const avgDSCR = dscrArr.length ? dscrArr.reduce((a, b) => a + b, 0) / dscrArr.length : null;

  return {
    project: {
      name: project.name || "Unnamed",
      location: project.location || "",
      startYear: project.startYear,
      horizon: project.horizon,
      currency: project.currency || "SAR",
      landType: project.landType,
      landArea: project.landArea,
      landRentAnnual: project.landRentAnnual,
      finMode: project.finMode,
      exitStrategy: project.exitStrategy,
      exitYear: project.exitYear,
      phases: (project.phases || []).map(p => p.name),
      totalAssets: (project.assets || []).length,
    },
    // Trimmed asset list — key fields only
    assets: (project.assets || []).slice(0, 15).map(a => ({
      name: a.name, category: a.category, phase: a.phase,
      gfa: a.gfa, costPerSqm: a.costPerSqm,
      revType: a.revType, leaseRate: a.leaseRate,
      stabilizedOcc: a.stabilizedOcc,
    })),
    financials: {
      totalCAPEX: c?.totalCapex,
      totalRevenue: c?.totalIncome,
      totalLandRent: c?.totalLandRent,
      projectIRR: c?.irr,
      npv10: c?.npv10,
      npv12: c?.npv12,
      paybackYear: c?.paybackYear,
    },
    financing: f ? {
      mode: project.finMode,
      totalEquity: f.totalEquity,
      totalDebt: f.totalDebt,
      gpEquity: f.gpEquity,
      lpEquity: f.lpEquity,
      ltvPct: f.totalDebt && f.totalProjectCost ? Math.round(f.totalDebt / f.totalProjectCost * 100) : null,
      rate: f.rate, tenor: f.tenor, grace: f.grace,
      minDSCR, avgDSCR,
      leveredIRR: f.leveredIRR,
      totalInterest: f.totalInterest,
    } : null,
    waterfall: w ? {
      lpIRR: w.lpIRR, gpIRR: w.gpIRR,
      lpMOIC: w.lpMOIC, gpMOIC: w.gpMOIC,
      totalFees: w.totalFees,
      prefReturnPct: project.prefReturnPct,
      carryPct: project.carryPct,
    } : null,
    alerts: {
      total: (smartAlerts || []).length,
      critical: (smartAlerts || []).filter(a => a.severity === "critical").length,
      warning: (smartAlerts || []).filter(a => a.severity === "warning").length,
      top5: (smartAlerts || []).filter(a => a.severity === "critical" || a.severity === "warning").slice(0, 5).map(a => a.en),
    },
  };
}
