/**
 * Diagnostic: Per-phase waterfall LP = 0 bug
 * Tests that per-phase virtual projects produce non-zero LP equity and distributions.
 */
const E = require('./helpers/engine.cjs');

// Build a 3-phase fund project mimicking ZAN Waterfront
const project = {
  id: 'diag-phase-lp', name: 'Phase LP Diagnostic', horizon: 50, startYear: 2026,
  landType: 'lease', landArea: 96000, landRentAnnual: 6000000,
  landRentEscalation: 5, landRentEscalationEveryN: 5, landRentGrace: 5, landRentTerm: 50,
  landCapitalize: true, landCapRate: 1000, landCapTo: 'gp',
  landRentPaidBy: 'project',
  softCostPct: 10, contingencyPct: 5, rentEscalation: 0.75,
  activeScenario: 'Base Case',
  phases: [
    { name: 'ZAN 1', startYearOffset: 1, completionMonth: 36, footprint: 32000 },
    { name: 'ZAN 2', startYearOffset: 2, completionMonth: 60, footprint: 32000 },
    { name: 'ZAN 3', startYearOffset: 3, completionMonth: 72, footprint: 32000 },
  ],
  assets: [
    { phase:'ZAN 1', category:'Retail', name:'Mall A', code:'M1', gfa:30000, footprint:20000, plotArea:28000,
      revType:'Lease', efficiency:80, leaseRate:2100, escalation:0.75, rampUpYears:3, stabilizedOcc:100,
      costPerSqm:3900, constrStart:2, constrDuration:36, opEbitda:0 },
    { phase:'ZAN 1', category:'Hospitality', name:'Hotel A', code:'H1', gfa:16000, footprint:2000, plotArea:5000,
      revType:'Operating', efficiency:0, leaseRate:0, escalation:0.75, rampUpYears:4, stabilizedOcc:100,
      costPerSqm:8000, constrStart:2, constrDuration:36, opEbitda:13900000 },
    { phase:'ZAN 2', category:'Office', name:'Office B', code:'O1', gfa:16000, footprint:2700, plotArea:5500,
      revType:'Lease', efficiency:90, leaseRate:900, escalation:0.75, rampUpYears:2, stabilizedOcc:100,
      costPerSqm:2600, constrStart:3, constrDuration:36, opEbitda:0 },
    { phase:'ZAN 2', category:'Residential', name:'Resi B', code:'R1', gfa:14000, footprint:2000, plotArea:4000,
      revType:'Lease', efficiency:85, leaseRate:800, escalation:0.75, rampUpYears:2, stabilizedOcc:92,
      costPerSqm:2800, constrStart:3, constrDuration:30, opEbitda:0 },
    { phase:'ZAN 3', category:'Retail', name:'Mall C', code:'M3', gfa:20000, footprint:10000, plotArea:15000,
      revType:'Lease', efficiency:80, leaseRate:1800, escalation:0.75, rampUpYears:3, stabilizedOcc:95,
      costPerSqm:3500, constrStart:4, constrDuration:36, opEbitda:0 },
  ],

  // Financing - fund mode with manual equity (triggers the bug)
  finMode: 'fund', vehicleType: 'fund',
  debtAllowed: true, maxLtvPct: 70,
  financeRate: 6.5, loanTenor: 7, debtGrace: 3,
  upfrontFeePct: 0.5, repaymentType: 'amortizing',
  graceBasis: 'fundStart', fundStartYear: 2027,

  // KEY: Set project-level manual equity (this was causing the bug)
  gpEquityManual: 100000000,  // 100M - sized for full project
  lpEquityManual: 0,          // let it auto-calculate

  // Exit
  exitStrategy: 'sale', exitYear: 2033,
  exitMultiple: 10, exitCostPct: 2,

  // Waterfall
  prefReturnPct: 15, gpCatchup: true, carryPct: 30, lpProfitSplitPct: 70,
  prefAllocation: 'proRata', catchupMethod: 'perYear',
  feeTreatment: 'capital',

  // Fees
  subscriptionFeePct: 2, annualMgmtFeePct: 0.9, custodyFeeAnnual: 130000,
  developerFeePct: 12, structuringFeePct: 1, mgmtFeeBase: 'deployed',

  incentives: {
    capexGrant: { enabled: false },
    financeSupport: { enabled: false },
    landRentRebate: { enabled: false },
    feeRebates: { enabled: false },
  },
};

// Run project engine
const results = E.computeProjectCashFlows(project);

console.log('\n═══ DIAGNOSTIC: Per-Phase LP = 0 Bug ═══\n');
console.log('Phase results found:', Object.keys(results.phaseResults || {}));

// Run independent phase results
const incentives = E.computeIncentives(project, results);
const phaseResults = E.computeIndependentPhaseResults(project, results, incentives);

console.log('\nPhase Financings:', Object.keys(phaseResults.phaseFinancings));
console.log('Phase Waterfalls:', Object.keys(phaseResults.phaseWaterfalls));

let allGood = true;

for (const pName of Object.keys(phaseResults.phaseFinancings)) {
  const pf = phaseResults.phaseFinancings[pName];
  const pw = phaseResults.phaseWaterfalls[pName];
  
  console.log(`\n── ${pName} ──`);
  console.log(`  Financing: gpEquity=${(pf.gpEquity/1e6).toFixed(1)}M  lpEquity=${(pf.lpEquity/1e6).toFixed(1)}M  totalEquity=${(pf.totalEquity/1e6).toFixed(1)}M  gpPct=${(pf.gpPct*100).toFixed(1)}%  lpPct=${(pf.lpPct*100).toFixed(1)}%`);
  console.log(`  Debt: maxDebt=${(pf.maxDebt/1e6).toFixed(1)}M  totalDebt=${(pf.totalDebt/1e6).toFixed(1)}M`);
  
  if (pw) {
    console.log(`  Waterfall: lpIRR=${pw.lpIRR !== null ? (pw.lpIRR*100).toFixed(2)+'%' : '—'}  gpIRR=${pw.gpIRR !== null ? (pw.gpIRR*100).toFixed(2)+'%' : '—'}`);
    console.log(`  MOIC: lpMOIC=${pw.lpMOIC ? pw.lpMOIC.toFixed(2)+'x' : '—'}  gpMOIC=${pw.gpMOIC ? pw.gpMOIC.toFixed(2)+'x' : '—'}`);
    console.log(`  Dist: lpTotal=${(pw.lpTotalDist/1e6).toFixed(1)}M  gpTotal=${(pw.gpTotalDist/1e6).toFixed(1)}M`);
    
    if (pf.lpEquity <= 0) { console.log('  ❌ LP EQUITY = 0 (BUG!)'); allGood = false; }
    if (!pw.lpIRR && pw.lpTotalDist > 0) { console.log('  ❌ LP IRR missing despite distributions'); allGood = false; }
    if (pw.lpMOIC === 0 && pf.lpEquity > 0) { console.log('  ❌ LP MOIC = 0 despite LP equity'); allGood = false; }
  } else {
    console.log('  ⚠ No waterfall result');
    if (project.finMode === 'fund') { console.log('  ❌ Fund mode but no waterfall!'); allGood = false; }
  }
}

// Check consolidated
const cw = phaseResults.consolidatedWaterfall;
if (cw) {
  console.log(`\n── Consolidated (aggregated) ──`);
  console.log(`  lpIRR=${cw.lpIRR !== null ? (cw.lpIRR*100).toFixed(2)+'%' : '—'}  gpIRR=${cw.gpIRR !== null ? (cw.gpIRR*100).toFixed(2)+'%' : '—'}`);
  console.log(`  MOIC: lpMOIC=${cw.lpMOIC ? cw.lpMOIC.toFixed(2)+'x' : '—'}  gpMOIC=${cw.gpMOIC ? cw.gpMOIC.toFixed(2)+'x' : '—'}`);
}

console.log(`\n═══ RESULT: ${allGood ? '✅ ALL PHASES HAVE LP VALUES' : '❌ BUG STILL PRESENT'} ═══\n`);
process.exit(allGood ? 0 : 1);
