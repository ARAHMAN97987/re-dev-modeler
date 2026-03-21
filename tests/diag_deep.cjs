const E = require('./helpers/engine.cjs');

// Simulate the real ZAN Waterfront saved project structure
const project = {
  id: 'diag-deep', name: 'ZAN Deep Diag', horizon: 50, startYear: 2026,
  landType: 'lease', landArea: 96359, landRentAnnual: 6000000,
  landRentEscalation: 5, landRentEscalationEveryN: 5, landRentGrace: 5, landRentTerm: 50,
  landCapitalize: true, landCapRate: 1000, landCapTo: 'gp',
  landRentPaidBy: 'project',
  softCostPct: 10, contingencyPct: 5, rentEscalation: 0.75,
  activeScenario: 'Base Case',
  phases: [
    { name: 'ZAN 1', startYearOffset: 1, completionMonth: 36, footprint: 32498 },
    { name: 'ZAN 2', startYearOffset: 2, completionMonth: 60, footprint: 31910 },
    { name: 'ZAN 3', startYearOffset: 3, completionMonth: 72, footprint: 31951 },
  ],
  assets: [
    { phase:'ZAN 1', category:'Retail', name:'Mall', code:'M1', gfa:31260, footprint:20840, plotArea:28947,
      revType:'Lease', efficiency:80, leaseRate:2100, escalation:0.75, rampUpYears:4, stabilizedOcc:100,
      costPerSqm:3900, constrStart:2, constrDuration:36, opEbitda:0 },
    { phase:'ZAN 1', category:'Hospitality', name:'Hotel', code:'H1', gfa:16577, footprint:2072, plotArea:5133,
      revType:'Operating', efficiency:0, leaseRate:0, escalation:0.75, rampUpYears:4, stabilizedOcc:100,
      costPerSqm:8000, constrStart:2, constrDuration:36, opEbitda:13901057 },
    { phase:'ZAN 2', category:'Office', name:'Office', code:'O1', gfa:16429, footprint:2710, plotArea:5497,
      revType:'Lease', efficiency:90, leaseRate:900, escalation:0.75, rampUpYears:2, stabilizedOcc:100,
      costPerSqm:2600, constrStart:3, constrDuration:36, opEbitda:0 },
    { phase:'ZAN 2', category:'Residential', name:'Resi', code:'R1', gfa:14000, footprint:2000, plotArea:4000,
      revType:'Lease', efficiency:85, leaseRate:800, escalation:0.75, rampUpYears:2, stabilizedOcc:92,
      costPerSqm:2800, constrStart:3, constrDuration:30, opEbitda:0 },
    { phase:'ZAN 3', category:'Retail', name:'Mall C', code:'M3', gfa:20000, footprint:10000, plotArea:15000,
      revType:'Lease', efficiency:80, leaseRate:1800, escalation:0.75, rampUpYears:3, stabilizedOcc:95,
      costPerSqm:3500, constrStart:4, constrDuration:36, opEbitda:0 },
  ],
  finMode: 'fund', vehicleType: 'fund',
  debtAllowed: true, maxLtvPct: 70,
  financeRate: 6.5, loanTenor: 7, debtGrace: 3,
  upfrontFeePct: 0.5, repaymentType: 'amortizing',
  graceBasis: 'fundStart', fundStartYear: 2027,
  gpEquityManual: 0, lpEquityManual: 0,
  exitStrategy: 'caprate', exitYear: 2035, exitCapRate: 10, exitCostPct: 2,
  prefReturnPct: 15, gpCatchup: true, carryPct: 30, lpProfitSplitPct: 70,
  prefAllocation: 'proRata', catchupMethod: 'perYear', feeTreatment: 'capital',
  subscriptionFeePct: 2, annualMgmtFeePct: 0.9, custodyFeeAnnual: 130000,
  developerFeePct: 12, structuringFeePct: 1, mgmtFeeBase: 'deployed',
  incentives: { capexGrant:{enabled:false}, financeSupport:{enabled:false}, landRentRebate:{enabled:false}, feeRebates:{enabled:false} },
};

const results = E.computeProjectCashFlows(project);
const incentives = E.computeIncentives(project, results);

// Run consolidated financing first
const consolFin = E.computeFinancing(project, results, incentives);
console.log('\n═══ CONSOLIDATED FINANCING ═══');
console.log(`  gpEquity=${(consolFin.gpEquity/1e6).toFixed(1)}M  lpEquity=${(consolFin.lpEquity/1e6).toFixed(1)}M  totalEquity=${(consolFin.totalEquity/1e6).toFixed(1)}M`);
console.log(`  gpPct=${(consolFin.gpPct*100).toFixed(1)}%  lpPct=${(consolFin.lpPct*100).toFixed(1)}%`);
console.log(`  landCapValue=${(consolFin.landCapValue/1e6).toFixed(1)}M  devCostInclLand=${(consolFin.devCostInclLand/1e6).toFixed(1)}M`);

// Now trace per-phase
for (const pName of Object.keys(results.phaseResults)) {
  const pr = results.phaseResults[pName];
  const vProject = E.buildPhaseVirtualProject(project, pName, pr);
  const vResults = E.buildPhaseProjectResults(results, pName);
  const pIr = E.buildPhaseIncentives(results, incentives, pName);
  const pFin = E.computeFinancing(vProject, vResults, pIr);
  
  console.log(`\n── ${pName} ──`);
  console.log(`  allocPct=${(pr.allocPct*100).toFixed(1)}%  totalCapex=${(pr.totalCapex/1e6).toFixed(1)}M`);
  console.log(`  vProject.landArea=${vProject.landArea?.toFixed(0)}  landCapitalize=${vProject.landCapitalize}  landCapRate=${vProject.landCapRate}`);
  console.log(`  vProject.gpEquityManual=${vProject.gpEquityManual}  lpEquityManual=${vProject.lpEquityManual}`);
  const landCap = vProject.landCapitalize ? vProject.landArea * (vProject.landCapRate || 1000) : 0;
  console.log(`  → Computed landCapValue=${(landCap/1e6).toFixed(1)}M`);
  console.log(`  → pFin: totalEquity=${(pFin.totalEquity/1e6).toFixed(1)}M  gpEquity=${(pFin.gpEquity/1e6).toFixed(1)}M  lpEquity=${(pFin.lpEquity/1e6).toFixed(1)}M`);
  console.log(`  → gpPct=${(pFin.gpPct*100).toFixed(1)}%  lpPct=${(pFin.lpPct*100).toFixed(1)}%`);
  console.log(`  → landCap >= totalEquity? ${landCap >= pFin.totalEquity ? 'YES → GP=100%, LP=0 ❌' : 'NO → LP has equity ✅'}`);
}
