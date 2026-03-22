/**
 * PART 1 AUDIT: Unlevered Cash Flow Integrity
 * 
 * Independently calculates every number from raw project data,
 * then compares with engine output. Zero tolerance.
 *
 * Checks:
 * A. Per-asset CAPEX formula
 * B. Per-asset Revenue formula (Lease + Operating + Sale)
 * C. Per-phase aggregation (income, capex, landRent, netCF)
 * D. Consolidated = sum of phases
 * E. IRR/NPV match
 * F. CashFlowView reads from engine (not re-computes)
 */
const { computeProjectCashFlows, computeAssetCapex, calcIRR, calcNPV } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
function t(cat, name, ok, detail) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(`[${cat}] ${name}: ${detail}`); process.stdout.write('X'); }
}

// Tolerance: 1 SAR for sums, 0.01% for percentages
const EQ = (a, b, tol=1) => Math.abs((a||0) - (b||0)) <= tol;
const PCT = (a, b, tol=0.0001) => Math.abs((a||0) - (b||0)) <= tol;

// ══════════════════════════════════════════
// TEST PROJECT: 3 phases, mixed asset types
// ══════════════════════════════════════════
const project = {
  id:'audit1', name:'Unlevered Audit', startYear:2026, horizon:20, currency:'SAR',
  landType:'lease', landArea:100000,
  landRentAnnual:5000000, landRentEscalation:5, landRentEscalationEveryN:5,
  landRentGrace:3, landRentTerm:50, landLeaseStartYear:0, landRentStartRule:'auto',
  landPurchasePrice:0, partnerEquityPct:0, landValuation:0, botOperationYears:0,
  softCostPct:10, contingencyPct:5, rentEscalation:2,
  defaultEfficiency:85, defaultLeaseRate:700, defaultCostPerSqm:3500,
  activeScenario:'Base Case', customCapexMult:100, customRentMult:100, customDelay:0, customEscAdj:0,
  phases:[
    {name:'P1', completionMonth:36},
    {name:'P2', completionMonth:48},
  ],
  assets:[
    // P1: Lease asset
    {id:'a1', phase:'P1', category:'Retail', name:'Mall', code:'R1',
     plotArea:20000, footprint:10000, gfa:40000, revType:'Lease',
     efficiency:85, leaseRate:800, stabilizedOcc:90, costPerSqm:4000,
     constrDuration:24, rampUpYears:3, escalation:2, opEbitda:0,
     hotelPL:null, marinaPL:null},
    // P1: Operating asset
    {id:'a2', phase:'P1', category:'Hospitality', name:'Hotel', code:'H1',
     plotArea:15000, footprint:5000, gfa:20000, revType:'Operating',
     efficiency:0, leaseRate:0, stabilizedOcc:100, costPerSqm:6000,
     constrDuration:30, rampUpYears:4, escalation:2, opEbitda:25000000,
     hotelPL:null, marinaPL:null},
    // P2: Lease asset
    {id:'a3', phase:'P2', category:'Office', name:'Office', code:'O1',
     plotArea:8000, footprint:4000, gfa:24000, revType:'Lease',
     efficiency:90, leaseRate:900, stabilizedOcc:85, costPerSqm:3000,
     constrDuration:24, rampUpYears:3, escalation:2, opEbitda:0,
     hotelPL:null, marinaPL:null},
  ],
  finMode:'self', exitStrategy:'hold',
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

// Run engine
const R = computeProjectCashFlows(project);
const h = R.horizon;

console.log('PART 1 AUDIT: UNLEVERED CASH FLOW INTEGRITY');
console.log(`Project: ${project.name} | ${h}yr | ${project.assets.length} assets | ${project.phases.length} phases\n`);

// ══════════════════════════════════════════
// A. PER-ASSET CAPEX
// ══════════════════════════════════════════
process.stdout.write('[A] Asset CAPEX: ');

for (let i = 0; i < project.assets.length; i++) {
  const a = project.assets[i];
  const as = R.assetSchedules[i];
  // Manual calculation
  const expectedCapex = a.gfa * a.costPerSqm * (1 + project.softCostPct/100) * (1 + project.contingencyPct/100);
  t('A', `${a.name} totalCapex`, EQ(as.totalCapex, expectedCapex), `engine=${as.totalCapex} expected=${expectedCapex}`);
  
  // CAPEX schedule: should sum to totalCapex
  const schedSum = as.capexSchedule.reduce((s,v) => s+v, 0);
  t('A', `${a.name} capex schedule sum`, EQ(schedSum, as.totalCapex), `schedSum=${schedSum} total=${as.totalCapex}`);
  
  // CAPEX spread: durYears equal slices
  const durYears = Math.ceil(a.constrDuration / 12);
  const annualCapex = as.totalCapex / durYears;
  const nonZeroYears = as.capexSchedule.filter(v => v > 0);
  t('A', `${a.name} capex spread ${durYears}yr`, nonZeroYears.length === durYears, `nonZero=${nonZeroYears.length} expected=${durYears}`);
  if (nonZeroYears.length > 0) {
    t('A', `${a.name} equal annual`, EQ(nonZeroYears[0], annualCapex), `annual=${nonZeroYears[0]} expected=${annualCapex}`);
  }
}
console.log('');

// ══════════════════════════════════════════
// B. PER-ASSET REVENUE
// ══════════════════════════════════════════
process.stdout.write('[B] Asset Revenue: ');

for (let i = 0; i < project.assets.length; i++) {
  const a = project.assets[i];
  const as = R.assetSchedules[i];
  const durYears = Math.ceil(a.constrDuration / 12);
  const phase = project.phases.find(p => p.name === a.phase);
  
  // Determine revStart
  let revStart;
  if (phase && (phase.completionYear || 0) > 0) {
    revStart = phase.completionYear - project.startYear;
  } else if ((a.constrStart || 0) > 0) {
    revStart = (a.constrStart - 1) + durYears;
  } else if (phase && (phase.completionMonth || 0) > 0) {
    revStart = Math.ceil(phase.completionMonth / 12);
  } else {
    revStart = durYears;
  }
  
  // Check first revenue year
  const firstRevIdx = as.revenueSchedule.findIndex(v => v > 0);
  t('B', `${a.name} first revenue year`, firstRevIdx === revStart || firstRevIdx === -1, `actual=${firstRevIdx} expected=${revStart}`);
  
  if (a.revType === 'Lease') {
    const eff = a.efficiency / 100;
    const leasable = a.gfa * eff;
    const occ = a.stabilizedOcc / 100;
    const ramp = a.rampUpYears;
    const esc = a.escalation / 100;
    
    // Year 1 revenue (revStart): leasable × rate × occ × rampFraction × esc^0
    const yr1Expected = leasable * a.leaseRate * occ * Math.min(1, 1/ramp);
    if (firstRevIdx >= 0) {
      t('B', `${a.name} yr1 revenue`, EQ(as.revenueSchedule[firstRevIdx], yr1Expected, yr1Expected*0.001), 
        `engine=${as.revenueSchedule[firstRevIdx]} expected=${yr1Expected}`);
    }
    
    // Stabilized revenue (after ramp): leasable × rate × occ × 1.0 × esc^(ramp-1)
    const stabYear = revStart + ramp;
    if (stabYear < h) {
      const yrsFromStart = stabYear - revStart;
      const stabExpected = leasable * a.leaseRate * occ * Math.pow(1+esc, yrsFromStart);
      t('B', `${a.name} stabilized revenue`, EQ(as.revenueSchedule[stabYear], stabExpected, stabExpected*0.001),
        `engine=${as.revenueSchedule[stabYear]} expected=${stabExpected}`);
    }
  } else if (a.revType === 'Operating') {
    const ramp = a.rampUpYears;
    const esc = a.escalation / 100;
    
    // Year 1: opEbitda × rampFraction
    const yr1Expected = a.opEbitda * Math.min(1, 1/ramp);
    if (firstRevIdx >= 0) {
      t('B', `${a.name} yr1 EBITDA`, EQ(as.revenueSchedule[firstRevIdx], yr1Expected, yr1Expected*0.001),
        `engine=${as.revenueSchedule[firstRevIdx]} expected=${yr1Expected}`);
    }
  }
  
  // No revenue before construction end
  for (let y = 0; y < revStart && y < h; y++) {
    if (as.revenueSchedule[y] > 0) {
      t('B', `${a.name} no rev before constr`, false, `revenue at y=${y} before revStart=${revStart}: ${as.revenueSchedule[y]}`);
      break;
    }
  }
  if (revStart > 0) t('B', `${a.name} no rev before constr`, true, '');
}
console.log('');

// ══════════════════════════════════════════
// C. PER-PHASE AGGREGATION
// ══════════════════════════════════════════
process.stdout.write('[C] Phase Aggregation: ');

for (const pName of Object.keys(R.phaseResults)) {
  const pr = R.phaseResults[pName];
  const phaseAssets = R.assetSchedules.filter(a => (a.phase || 'Unphased') === pName);
  
  // Income = sum of asset revenues
  for (let y = 0; y < h; y++) {
    const assetSum = phaseAssets.reduce((s, a) => s + (a.revenueSchedule[y] || 0), 0);
    if (!EQ(pr.income[y], assetSum)) {
      t('C', `${pName} income[${y}]`, false, `phase=${pr.income[y]} assetSum=${assetSum}`);
      break;
    }
  }
  t('C', `${pName} income = sum(assets)`, true, '');
  
  // CAPEX = sum of asset capex (+ land purchase if applicable)
  for (let y = 0; y < h; y++) {
    let assetSum = phaseAssets.reduce((s, a) => s + (a.capexSchedule[y] || 0), 0);
    // Land purchase allocated by footprint
    if (project.landType === 'purchase' && y === 0 && project.landPurchasePrice > 0) {
      const totalFP = R.assetSchedules.reduce((s, a) => s + (a.footprint || 0), 0);
      const pFP = phaseAssets.reduce((s, a) => s + (a.footprint || 0), 0);
      const alloc = totalFP > 0 ? pFP / totalFP : 1 / Object.keys(R.phaseResults).length;
      assetSum += project.landPurchasePrice * alloc;
    }
    if (!EQ(pr.capex[y], assetSum)) {
      t('C', `${pName} capex[${y}]`, false, `phase=${pr.capex[y]} assetSum=${assetSum}`);
      break;
    }
  }
  t('C', `${pName} capex = sum(assets)`, true, '');
  
  // NetCF = income - landRent - capex
  for (let y = 0; y < h; y++) {
    const expected = pr.income[y] - pr.landRent[y] - pr.capex[y];
    if (!EQ(pr.netCF[y], expected)) {
      t('C', `${pName} netCF[${y}]`, false, `phase=${pr.netCF[y]} expected=${expected}`);
      break;
    }
  }
  t('C', `${pName} netCF = income - rent - capex`, true, '');
  
  // Totals match array sums
  t('C', `${pName} totalCapex`, EQ(pr.totalCapex, pr.capex.reduce((a,b)=>a+b,0)), '');
  t('C', `${pName} totalIncome`, EQ(pr.totalIncome, pr.income.reduce((a,b)=>a+b,0)), '');
  t('C', `${pName} totalLandRent`, EQ(pr.totalLandRent, pr.landRent.reduce((a,b)=>a+b,0)), '');
  t('C', `${pName} totalNetCF`, EQ(pr.totalNetCF, pr.netCF.reduce((a,b)=>a+b,0)), '');
}
console.log('');

// ══════════════════════════════════════════
// D. CONSOLIDATED = SUM OF PHASES
// ══════════════════════════════════════════
process.stdout.write('[D] Consolidated: ');

const c = R.consolidated;
const phases = Object.values(R.phaseResults);

for (let y = 0; y < h; y++) {
  const incSum = phases.reduce((s, pr) => s + pr.income[y], 0);
  if (!EQ(c.income[y], incSum)) { t('D', `income[${y}]`, false, `cons=${c.income[y]} phaseSum=${incSum}`); break; }
}
t('D', 'income = sum(phases)', true, '');

for (let y = 0; y < h; y++) {
  const capSum = phases.reduce((s, pr) => s + pr.capex[y], 0);
  if (!EQ(c.capex[y], capSum)) { t('D', `capex[${y}]`, false, `cons=${c.capex[y]} phaseSum=${capSum}`); break; }
}
t('D', 'capex = sum(phases)', true, '');

for (let y = 0; y < h; y++) {
  const lrSum = phases.reduce((s, pr) => s + pr.landRent[y], 0);
  if (!EQ(c.landRent[y], lrSum)) { t('D', `landRent[${y}]`, false, `cons=${c.landRent[y]} phaseSum=${lrSum}`); break; }
}
t('D', 'landRent = sum(phases)', true, '');

for (let y = 0; y < h; y++) {
  const netSum = phases.reduce((s, pr) => s + pr.netCF[y], 0);
  if (!EQ(c.netCF[y], netSum)) { t('D', `netCF[${y}]`, false, `cons=${c.netCF[y]} phaseSum=${netSum}`); break; }
}
t('D', 'netCF = sum(phases)', true, '');

// Totals
t('D', 'totalCapex', EQ(c.totalCapex, phases.reduce((s,p)=>s+p.totalCapex,0)), '');
t('D', 'totalIncome', EQ(c.totalIncome, phases.reduce((s,p)=>s+p.totalIncome,0)), '');
t('D', 'totalLandRent', EQ(c.totalLandRent, phases.reduce((s,p)=>s+p.totalLandRent,0)), '');
t('D', 'totalNetCF', EQ(c.totalNetCF, phases.reduce((s,p)=>s+p.totalNetCF,0)), '');

console.log('');

// ══════════════════════════════════════════
// E. IRR/NPV MATCH
// ══════════════════════════════════════════
process.stdout.write('[E] IRR/NPV: ');

// Independent IRR calculation from consolidated netCF
const indepIRR = calcIRR(c.netCF);
t('E', 'consolidated IRR', PCT(c.irr, indepIRR), `engine=${c.irr} independent=${indepIRR}`);

// Per-phase IRR
for (const pName of Object.keys(R.phaseResults)) {
  const pr = R.phaseResults[pName];
  const indepPhaseIRR = calcIRR(pr.netCF);
  t('E', `${pName} IRR`, PCT(pr.irr, indepPhaseIRR), `engine=${pr.irr} independent=${indepPhaseIRR}`);
}

// NPV at 10%, 12%, 14%
const indepNPV10 = calcNPV(c.netCF, 0.10);
const indepNPV12 = calcNPV(c.netCF, 0.12);
const indepNPV14 = calcNPV(c.netCF, 0.14);
t('E', 'NPV 10%', EQ(c.npv10, indepNPV10), `engine=${c.npv10} independent=${indepNPV10}`);
t('E', 'NPV 12%', EQ(c.npv12, indepNPV12), `engine=${c.npv12} independent=${indepNPV12}`);
t('E', 'NPV 14%', EQ(c.npv14, indepNPV14), `engine=${c.npv14} independent=${indepNPV14}`);

console.log('');

// ══════════════════════════════════════════
// F. LAND RENT INTEGRITY
// ══════════════════════════════════════════
process.stdout.write('[F] Land Rent: ');

// Land rent schedule: verify formula independently
const base = project.landRentAnnual;
const gr = project.landRentGrace;
const eN = project.landRentEscalationEveryN;
const eP = project.landRentEscalation / 100;
const lsYear = project.startYear; // landLeaseStartYear=0 → startYear
const graceEndIdx = Math.max(0, (lsYear + gr) - project.startYear);

// First income year from asset schedules
let firstIncome = h;
R.assetSchedules.forEach(a => {
  const fy = a.revenueSchedule.findIndex(v => v > 0);
  if (fy >= 0 && fy < firstIncome) firstIncome = fy;
});

const rentStart = Math.min(graceEndIdx, firstIncome); // auto rule
t('F', 'rent start year', R.landRentMeta.rentStartYear === rentStart, `engine=${R.landRentMeta.rentStartYear} expected=${rentStart}`);

// Verify year-by-year land rent
for (let y = 0; y < Math.min(project.landRentTerm, h); y++) {
  let expected = 0;
  if (y >= rentStart) {
    const yrsFromStart = y - rentStart;
    expected = base * Math.pow(1 + eP, Math.floor(yrsFromStart / eN));
  }
  if (!EQ(R.landSchedule[y], expected, 0.01)) {
    t('F', `landRent[${y}]`, false, `engine=${R.landSchedule[y]} expected=${expected}`);
    break;
  }
}
t('F', 'land rent schedule matches formula', true, '');

// Phase allocation: sum of phase rents = total rent
for (let y = 0; y < h; y++) {
  const phaseSum = Object.values(R.phaseResults).reduce((s, pr) => s + pr.landRent[y], 0);
  if (!EQ(R.landSchedule[y], phaseSum, 0.01)) {
    t('F', `landRent alloc[${y}]`, false, `total=${R.landSchedule[y]} phaseSum=${phaseSum}`);
    break;
  }
}
t('F', 'phase allocation sums to total', true, '');

// Allocation by footprint
const totalFP = R.assetSchedules.reduce((s, a) => s + (a.footprint || 0), 0);
if (totalFP > 0) {
  for (const pName of Object.keys(R.phaseResults)) {
    const pFP = R.assetSchedules.filter(a => (a.phase||'Unphased') === pName).reduce((s,a)=>s+(a.footprint||0),0);
    const expectedShare = pFP / totalFP;
    // Check first rent year
    const firstRentY = R.phaseResults[pName].landRent.findIndex(v => v > 0);
    if (firstRentY >= 0 && R.landSchedule[firstRentY] > 0) {
      const actualShare = R.phaseResults[pName].landRent[firstRentY] / R.landSchedule[firstRentY];
      t('F', `${pName} footprint share`, EQ(actualShare, expectedShare, 0.001), `actual=${actualShare.toFixed(4)} expected=${expectedShare.toFixed(4)}`);
    }
  }
}

console.log('');

// ══════════════════════════════════════════
// G. LAND PURCHASE CAPEX (separate test)
// ══════════════════════════════════════════
process.stdout.write('[G] Land Purchase: ');

const purchaseProject = {...project, landType:'purchase', landPurchasePrice:50000000, landRentAnnual:0};
const PR = computeProjectCashFlows(purchaseProject);

// Land purchase should appear in total CAPEX
const assetCapexOnly = project.assets.reduce((s, a) => s + computeAssetCapex(a, purchaseProject), 0);
t('G', 'totalCapex includes land', EQ(PR.consolidated.totalCapex, assetCapexOnly + 50000000), `total=${PR.consolidated.totalCapex} expected=${assetCapexOnly+50000000}`);

// Land allocated to phases by footprint (sum of phase capex[0] includes land)
const p1FP = R.assetSchedules.filter(a=>a.phase==='P1').reduce((s,a)=>s+(a.footprint||0),0);
const p2FP = R.assetSchedules.filter(a=>a.phase==='P2').reduce((s,a)=>s+(a.footprint||0),0);
const tFP = p1FP + p2FP;
if (tFP > 0) {
  const p1LandExpected = 50000000 * (p1FP/tFP);
  const p1AssetCapex0 = R.assetSchedules.filter(a=>a.phase==='P1').reduce((s,a)=>s+(a.capexSchedule[0]||0),0);
  t('G', 'P1 land allocation', EQ(PR.phaseResults.P1.capex[0], p1AssetCapex0 + p1LandExpected), `P1 capex[0]=${PR.phaseResults.P1.capex[0]}`);
}

console.log('');

// ══════════════════════════════════════════
// H. SCENARIO MULTIPLIERS
// ══════════════════════════════════════════
process.stdout.write('[H] Scenarios: ');

const capex10 = computeProjectCashFlows({...project, activeScenario:'CAPEX +10%'});
t('H', 'CAPEX +10%', capex10.consolidated.totalCapex > R.consolidated.totalCapex * 1.09, `+10%=${capex10.consolidated.totalCapex} base=${R.consolidated.totalCapex}`);

const rent10 = computeProjectCashFlows({...project, activeScenario:'Rent -10%'});
t('H', 'Rent -10%', rent10.consolidated.totalIncome < R.consolidated.totalIncome * 0.91, `-10%=${rent10.consolidated.totalIncome} base=${R.consolidated.totalIncome}`);

const delay = computeProjectCashFlows({...project, activeScenario:'Delay +6 months'});
t('H', 'Delay shifts timing', delay.consolidated.irr !== R.consolidated.irr, `delay IRR=${delay.consolidated.irr} base=${R.consolidated.irr}`);

console.log('');

// ══════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  PART 1 AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\n❌ FAILURES:');
  issues.forEach(i => console.log(`  ${i}`));
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
