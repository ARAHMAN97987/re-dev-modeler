/**
 * ZAN Engine — Layer A+B+C Tests
 * Verifies modular engine produces IDENTICAL results to App.jsx monolith.
 *
 * Test categories:
 *   T1: Layer A — Input validation + scenario multipliers (8 tests)
 *   T2: Layer B — Asset CAPEX + revenue schedules (16 tests)
 *   T3: Layer C — Unlevered CF + land rent + IRR/NPV (14 tests)
 *   T4: Cross-check — Modular vs App.jsx engine (8 tests)
 *   T5: Edge cases (6 tests)
 *
 * Run: node tests/layer_abc.cjs
 */

const { defaultProject, getScenarioMults, validateInputs } = require('../src/engine/inputs.cjs');
const { computeAssetCapex, computeAssetSchedules, calcHotelEBITDA, calcMarinaEBITDA, defaultHotelPL, defaultMarinaPL } = require('../src/engine/assets.cjs');
const { computeLandSchedule, getPhaseCompletionYears, getPhaseFootprints, computePhaseResults, computeConsolidated, computeUnleveredCashFlows, validateCashFlow } = require('../src/engine/cashflow.cjs');
const { calcIRR, calcNPV } = require('../src/engine/calcUtils.cjs');
const { oracleNPV, oracleIRR, oracleCapex, oracleCapexSchedule, oracleLeaseRevenue, oracleLandRent, arrClose, near, TOL } = require('./helpers/oracles.cjs');

// Load App.jsx engine for cross-checking
const appEngine = require('./helpers/loadEngine.cjs');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

// ── ZAN-like test project ──
function zanProject() {
  const p = defaultProject();
  p.name = "ZAN Waterfront Test";
  p.startYear = 2026;
  p.horizon = 50;
  p.landType = "lease";
  p.landArea = 1300000;
  p.landRentAnnual = 15000000;
  p.landRentEscalation = 5;
  p.landRentEscalationEveryN = 5;
  p.landRentGrace = 5;
  p.landRentTerm = 50;
  p.softCostPct = 10;
  p.contingencyPct = 5;
  p.rentEscalation = 0.75;
  p.activeScenario = "Base Case";
  p.phases = [
    { name: 'Phase 1', completionMonth: 36 },
    { name: 'Phase 2', completionMonth: 108 },
  ];
  p.assets = [
    { id: 'a1', name: 'Retail Mall', category: 'Retail', phase: 'Phase 1', gfa: 45000, footprint: 15000, costPerSqm: 4500, efficiency: 80, leaseRate: 800, revType: 'Lease', stabilizedOcc: 85, rampUpYears: 3, constrDuration: 24, constrStart: 1 },
    { id: 'a2', name: 'Office Tower', category: 'Office', phase: 'Phase 1', gfa: 30000, footprint: 7500, costPerSqm: 5000, efficiency: 85, leaseRate: 900, revType: 'Lease', stabilizedOcc: 80, rampUpYears: 4, constrDuration: 30, constrStart: 1 },
    { id: 'a3', name: 'Beach Hotel', category: 'Hospitality', phase: 'Phase 2', gfa: 25000, footprint: 8000, costPerSqm: 6000, efficiency: 100, leaseRate: 0, revType: 'Operating', opEbitda: 35000000, stabilizedOcc: 70, rampUpYears: 4, constrDuration: 36, constrStart: 7 },
    { id: 'a4', name: 'Marina', category: 'Marina', phase: 'Phase 2', gfa: 5000, footprint: 12000, costPerSqm: 3000, efficiency: 100, leaseRate: 0, revType: 'Operating', opEbitda: 8000000, stabilizedOcc: 90, rampUpYears: 2, constrDuration: 18, constrStart: 7 },
    { id: 'a5', name: 'Residential Villas', category: 'Residential', phase: 'Phase 1', gfa: 20000, footprint: 10000, costPerSqm: 3800, efficiency: 100, salePricePerSqm: 8000, revType: 'Sale', absorptionYears: 4, commissionPct: 3, preSalePct: 15, stabilizedOcc: 100, rampUpYears: 1, constrDuration: 18, constrStart: 1 },
  ];
  return p;
}

// Simple 1-asset project for isolated testing
function simpleProject() {
  const p = defaultProject();
  p.startYear = 2026;
  p.horizon = 20;
  p.landType = "lease";
  p.landRentAnnual = 1000000;
  p.landRentEscalation = 5;
  p.landRentEscalationEveryN = 5;
  p.landRentGrace = 2;
  p.landRentTerm = 20;
  p.softCostPct = 10;
  p.contingencyPct = 5;
  p.rentEscalation = 1;
  p.activeScenario = "Base Case";
  p.phases = [{ name: 'Phase 1', completionMonth: 12 }];
  p.assets = [
    { id: 's1', name: 'Shop', phase: 'Phase 1', gfa: 10000, footprint: 5000, costPerSqm: 3000, efficiency: 80, leaseRate: 500, revType: 'Lease', stabilizedOcc: 85, rampUpYears: 3, constrDuration: 12, constrStart: 1 },
  ];
  return p;
}

// ═════════════════════════════════════════════
console.log('\n═══ T1: Layer A — Inputs & Scenarios ═══');
// ═════════════════════════════════════════════

test('T1.1 defaultProject returns valid object', () => {
  const p = defaultProject();
  assert(p.horizon === 50, 'horizon');
  assert(p.landType === 'lease', 'landType');
  assert(p.finMode === 'self', 'finMode');
  assert(Array.isArray(p.assets), 'assets array');
  assert(p.softCostPct === 10, 'softCostPct');
  assert(p.contingencyPct === 5, 'contingencyPct');
});

test('T1.2 getScenarioMults Base Case', () => {
  const m = getScenarioMults({ activeScenario: 'Base Case' });
  assert(m.cm === 1 && m.rm === 1 && m.dm === 0 && m.ea === 0, `Got ${JSON.stringify(m)}`);
});

test('T1.3 getScenarioMults CAPEX+10%', () => {
  const m = getScenarioMults({ activeScenario: 'CAPEX +10%' });
  assert(m.cm === 1.1, `cm=${m.cm}`);
});

test('T1.4 getScenarioMults Custom scenario', () => {
  const m = getScenarioMults({ activeScenario: 'Custom', customCapexMult: 120, customRentMult: 90, customDelay: 3, customEscAdj: 0.25 });
  assert(m.cm === 1.2, `cm=${m.cm}`);
  assert(m.rm === 0.9, `rm=${m.rm}`);
  assert(m.dm === 3, `dm=${m.dm}`);
  assert(m.ea === 0.25, `ea=${m.ea}`);
});

test('T1.5 validateInputs catches negative GFA', () => {
  const p = defaultProject();
  p.assets = [{ gfa: -100, costPerSqm: 3000, name: 'Bad' }];
  const issues = validateInputs(p);
  assert(issues.some(i => i.field.includes('gfa') && i.severity === 'error'), 'Should catch negative GFA');
});

test('T1.6 validateInputs catches zero duration with cost', () => {
  const p = defaultProject();
  p.assets = [{ gfa: 1000, costPerSqm: 3000, constrDuration: 0, name: 'NoDur' }];
  const issues = validateInputs(p);
  assert(issues.some(i => i.field.includes('constrDuration')), 'Should warn zero duration');
});

test('T1.7 validateInputs clean project has no errors', () => {
  const p = zanProject();
  const issues = validateInputs(p);
  const errors = issues.filter(i => i.severity === 'error');
  assert(errors.length === 0, `Found ${errors.length} errors: ${errors.map(e=>e.message).join(', ')}`);
});

test('T1.8 getScenarioMults matches App.jsx', () => {
  const scenarios = ['Base Case', 'CAPEX +10%', 'Rent -10%', 'Delay +6 months', 'Escalation +0.5%'];
  for (const s of scenarios) {
    const mine = getScenarioMults({ activeScenario: s });
    const theirs = appEngine.getScenarioMults({ activeScenario: s });
    assert(mine.cm === theirs.cm && mine.rm === theirs.rm && mine.dm === theirs.dm && mine.ea === theirs.ea,
      `Mismatch on "${s}": ${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}`);
  }
});

// ═════════════════════════════════════════════
console.log('\n═══ T2: Layer B — Assets ═══');
// ═════════════════════════════════════════════

test('T2.1 computeAssetCapex basic', () => {
  const p = { softCostPct: 10, contingencyPct: 5, activeScenario: 'Base Case' };
  const a = { gfa: 10000, costPerSqm: 3000 };
  const capex = computeAssetCapex(a, p);
  const oracle = oracleCapex(10000, 3000, 10, 5, 1);
  assert(near(capex, oracle, 0.01), `${capex} vs oracle ${oracle}`);
});

test('T2.2 computeAssetCapex with CAPEX+10% scenario', () => {
  const p = { softCostPct: 10, contingencyPct: 5, activeScenario: 'CAPEX +10%' };
  const a = { gfa: 10000, costPerSqm: 3000 };
  const capex = computeAssetCapex(a, p);
  const oracle = oracleCapex(10000, 3000, 10, 5, 1.1);
  assert(near(capex, oracle, 0.01), `${capex} vs oracle ${oracle}`);
});

test('T2.3 computeAssetCapex matches App.jsx', () => {
  const p = zanProject();
  for (const a of p.assets) {
    const mine = computeAssetCapex(a, p);
    const theirs = appEngine.computeAssetCapex(a, p);
    assert(near(mine, theirs, 0.01), `Asset "${a.name}": ${mine} vs ${theirs}`);
  }
});

test('T2.4 computeAssetSchedules returns correct array length', () => {
  const p = simpleProject();
  const scheds = computeAssetSchedules(p);
  assert(scheds.length === 1, `Expected 1, got ${scheds.length}`);
  assert(scheds[0].capexSchedule.length === 20, 'CAPEX schedule length');
  assert(scheds[0].revenueSchedule.length === 20, 'Revenue schedule length');
});

test('T2.5 CAPEX schedule spreads evenly over construction', () => {
  const p = simpleProject();
  const scheds = computeAssetSchedules(p);
  const s = scheds[0];
  // 12mo = 1 year, constrStart=1 → index 0
  assert(s.capexSchedule[0] > 0, 'CAPEX in year 0');
  assert(s.capexSchedule[1] === 0, 'No CAPEX in year 1');
  assert(near(s.capexSchedule[0], s.totalCapex, 0.01), 'All CAPEX in 1 year');
});

test('T2.6 Revenue starts after construction ends', () => {
  const p = simpleProject();
  const scheds = computeAssetSchedules(p);
  const s = scheds[0];
  // constrStart=1 → index 0, dur=1yr → revenue starts index 1
  assert(s.revenueSchedule[0] === 0, 'No revenue during construction');
  assert(s.revenueSchedule[1] > 0, 'Revenue starts year 1');
});

test('T2.7 Ramp-up reaches stabilized occupancy', () => {
  const p = simpleProject();
  const scheds = computeAssetSchedules(p);
  const s = scheds[0];
  // rampUpYears=3, revStart=1. Year 3 (index 3) = full ramp
  const year1Rev = s.revenueSchedule[1]; // 1/3 ramp
  const year3Rev = s.revenueSchedule[3]; // full ramp
  assert(year3Rev > year1Rev, 'Year 3 revenue > Year 1');
  // After ramp, growth is only from escalation
  const year4Rev = s.revenueSchedule[4];
  const growthRate = year4Rev / year3Rev - 1;
  assert(near(growthRate, 0.01, 0.005), `Post-ramp growth should be ~1% (escalation), got ${(growthRate*100).toFixed(2)}%`);
});

test('T2.8 Lease revenue matches oracle', () => {
  const p = simpleProject();
  const asset = p.assets[0];
  const oracle = oracleLeaseRevenue(
    asset.gfa, asset.efficiency, asset.leaseRate, asset.stabilizedOcc,
    asset.rampUpYears, p.rentEscalation, asset.constrStart - 1,
    Math.ceil(asset.constrDuration / 12), p.horizon, 0
  );
  const scheds = computeAssetSchedules(p);
  const check = arrClose(scheds[0].revenueSchedule, oracle, 0.01);
  assert(check.ok, check.msg);
});

test('T2.9 Sale revenue: pre-sale + absorption', () => {
  const p = zanProject();
  // Asset a5 is Sale type, Phase 1 completionMonth=36 (3yr), dur=18mo (2yr)
  // cStart = ceil(36/12) - ceil(18/12) = 3 - 2 = 1
  // CAPEX years 1-2, pre-sale at year 2, absorption years 3-6
  const scheds = computeAssetSchedules(p);
  const villa = scheds.find(s => s.name === 'Residential Villas');
  assert(villa, 'Villa asset found');
  const lastConstrYr = villa.capexSchedule.reduce((last, v, i) => v > 0 ? i : last, -1);
  assert(villa.revenueSchedule[lastConstrYr] > 0, `Pre-sale revenue in last constr year (yr ${lastConstrYr})`);
  const revStart = lastConstrYr + 1;
  assert(villa.revenueSchedule[revStart] > 0, `Absorption starts yr ${revStart}`);
  assert(villa.revenueSchedule[revStart + 3] > 0, 'Absorption year 4');
  assert(villa.revenueSchedule[revStart + 4] === 0, 'No revenue after absorption');
});

test('T2.10 Operating revenue (hotel) with ramp-up', () => {
  const p = zanProject();
  const scheds = computeAssetSchedules(p);
  const hotel = scheds.find(s => s.name === 'Beach Hotel');
  assert(hotel, 'Hotel asset found');
  // constrStart=7 → index 6, dur=36mo=3yr → revStart=9 (index 9, but 0-indexed from construction start offset)
  const revStart = 6 + 3; // index 9
  assert(hotel.revenueSchedule[revStart - 1] === 0, 'No rev before completion');
  assert(hotel.revenueSchedule[revStart] > 0, `Revenue starts at index ${revStart}`);
});

test('T2.11 Delay scenario shifts construction', () => {
  const p = simpleProject();
  p.activeScenario = 'Delay +6 months';
  const scheds = computeAssetSchedules(p);
  const s = scheds[0];
  // 6mo delay → 1yr ceil → constrStart moves from index 0 to index 1
  assert(s.capexSchedule[0] === 0, 'No CAPEX at original start');
  assert(s.capexSchedule[1] > 0, 'CAPEX at delayed start');
});

test('T2.12 calcHotelEBITDA basic', () => {
  const h = { keys: 200, adr: 500, stabOcc: 70, daysYear: 365, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 };
  const r = calcHotelEBITDA(h);
  assert(r.roomsRev > 0, 'roomsRev > 0');
  assert(r.totalRev > r.roomsRev, 'totalRev > roomsRev (includes F&B etc)');
  assert(r.ebitda > 0, 'ebitda > 0');
  assert(r.margin > 0 && r.margin < 1, `Margin should be 0-100%: ${r.margin}`);
});

test('T2.13 calcMarinaEBITDA basic', () => {
  const m = { berths: 300, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 };
  const r = calcMarinaEBITDA(m);
  assert(r.berthingRev > 0, 'berthingRev > 0');
  assert(r.ebitda > 0, 'ebitda > 0');
});

test('T2.14 Asset schedules match App.jsx for ZAN project', () => {
  const p = zanProject();
  const mine = computeAssetSchedules(p);
  const theirs = appEngine.computeProjectCashFlows(p).assetSchedules;
  assert(mine.length === theirs.length, `Count: ${mine.length} vs ${theirs.length}`);
  for (let i = 0; i < mine.length; i++) {
    assert(near(mine[i].totalCapex, theirs[i].totalCapex, 1), `Asset ${i} CAPEX: ${mine[i].totalCapex} vs ${theirs[i].totalCapex}`);
    const capCheck = arrClose(mine[i].capexSchedule, theirs[i].capexSchedule, 1);
    assert(capCheck.ok, `Asset ${i} CAPEX schedule: ${capCheck.msg}`);
    const revCheck = arrClose(mine[i].revenueSchedule, theirs[i].revenueSchedule, 1);
    assert(revCheck.ok, `Asset ${i} revenue schedule: ${revCheck.msg}`);
  }
});

test('T2.15 Zero GFA produces zero CAPEX and revenue', () => {
  const p = defaultProject();
  p.horizon = 10;
  p.assets = [{ id: 'z', gfa: 0, costPerSqm: 5000, efficiency: 80, leaseRate: 500, revType: 'Lease', constrDuration: 12, constrStart: 1 }];
  const scheds = computeAssetSchedules(p);
  assert(scheds[0].totalCapex === 0, 'Zero CAPEX');
  assert(scheds[0].totalRevenue === 0, 'Zero revenue');
});

test('T2.16 Multiple assets in same phase aggregate correctly', () => {
  const p = defaultProject();
  p.horizon = 10;
  p.assets = [
    { id: 'x1', phase: 'P1', gfa: 1000, footprint: 500, costPerSqm: 3000, efficiency: 80, leaseRate: 500, revType: 'Lease', stabilizedOcc: 100, rampUpYears: 1, constrDuration: 12, constrStart: 1 },
    { id: 'x2', phase: 'P1', gfa: 2000, footprint: 800, costPerSqm: 4000, efficiency: 80, leaseRate: 600, revType: 'Lease', stabilizedOcc: 100, rampUpYears: 1, constrDuration: 12, constrStart: 1 },
  ];
  const scheds = computeAssetSchedules(p);
  assert(scheds.length === 2, '2 assets');
  const totalCapex = scheds[0].totalCapex + scheds[1].totalCapex;
  const expected = computeAssetCapex(p.assets[0], p) + computeAssetCapex(p.assets[1], p);
  assert(near(totalCapex, expected, 1), `Total CAPEX: ${totalCapex} vs ${expected}`);
});

// ═════════════════════════════════════════════
console.log('\n═══ T3: Layer C — Unlevered Cash Flow ═══');
// ═════════════════════════════════════════════

test('T3.1 Land rent schedule (grace rule) matches oracle', () => {
  const p = simpleProject();
  p.landRentStartRule = "grace"; // use grace-only for oracle comparison
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  const oracle = oracleLandRent(p.landRentAnnual, p.landRentGrace, p.landRentEscalationEveryN, p.landRentEscalation, p.landRentTerm, p.horizon);
  const check = arrClose(landSch, oracle, 0.01);
  assert(check.ok, check.msg);
});

test('T3.2 Land rent grace period respected (grace rule)', () => {
  const p = simpleProject();
  p.landRentStartRule = "grace";
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  assert(landSch[0] === 0, 'Year 0 grace');
  assert(landSch[1] === 0, 'Year 1 grace');
  assert(landSch[2] > 0, 'Year 2 starts rent');
  assert(near(landSch[2], 1000000, 0.01), 'Base rent = 1M');
});

test('T3.3 Land rent escalation every N years (grace rule)', () => {
  const p = simpleProject();
  p.landRentStartRule = "grace";
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  // Grace=2, EveryN=5: escalation at year 7 (5 years after grace ends)
  assert(near(landSch[2], 1000000, 0.01), 'Base rent at grace end');
  assert(near(landSch[6], 1000000, 0.01), 'Still base at year 6');
  assert(landSch[7] > landSch[6], 'Escalation at year 7');
  assert(near(landSch[7], 1000000 * 1.05, 0.01), `Escalated rent: ${landSch[7]}`);
});

test('T3.3b Land rent auto rule: starts at MIN(grace, firstIncome)', () => {
  const p = simpleProject();
  // p has grace=2, completionMonth=12 (1yr), asset dur=12 → revenue starts yr 1
  // Auto: MIN(grace=2, firstIncome=1) = 1
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  assert(landResult.meta.startRule === 'auto', 'Default is auto');
  assert(landResult.meta.rentStartYear === 1, `Rent starts yr 1 = MIN(2,1), got ${landResult.meta.rentStartYear}`);
  assert(landSch[0] === 0, 'Year 0 no rent');
  assert(landSch[1] > 0, 'Year 1 rent starts (income started)');
});

test('T3.3c Land rent income rule: starts at first income', () => {
  const p = simpleProject();
  p.landRentStartRule = "income";
  p.landRentGrace = 10; // grace is 10yr but income rule ignores it
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  assert(landResult.meta.rentStartYear === 1, `Rent starts yr 1 (income), got ${landResult.meta.rentStartYear}`);
  assert(landResult.schedule[1] > 0, 'Year 1 has rent despite grace=10');
});

test('T3.4 Land purchase: in CAPEX year 0, not land rent', () => {
  const p = defaultProject();
  p.landType = 'purchase';
  p.landPurchasePrice = 50000000;
  p.horizon = 10;
  p.phases = [{ name: 'Phase 1', completionMonth: 24 }];
  p.assets = [{ id:'lp1', phase:'Phase 1', gfa:5000, footprint:3000, costPerSqm:3000, efficiency:80, leaseRate:500, revType:'Lease', stabilizedOcc:80, rampUpYears:2, constrDuration:24 }];
  const result = computeUnleveredCashFlows(p);
  assert(result.landSchedule[0] === 0, 'Land rent should be 0 for purchase');
  assert(result.consolidated.capex[0] >= 50000000, `CAPEX Y0 should include 50M land: got ${result.consolidated.capex[0]}`);
});

test('T3.5 Phase results: single phase', () => {
  const p = simpleProject();
  const scheds = computeAssetSchedules(p);
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  const phases = computePhaseResults(scheds, landResult, p.horizon);
  const phaseNames = Object.keys(phases);
  assert(phaseNames.length === 1, `Expected 1 phase, got ${phaseNames.length}`);
  assert(phaseNames[0] === 'Phase 1', 'Phase name');
  assert(phases['Phase 1'].allocPct === 1, 'Single phase = 100% allocation');
});

test('T3.6 Phase results: multi-phase land allocation by footprint', () => {
  const p = zanProject();
  const scheds = computeAssetSchedules(p);
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  const phases = computePhaseResults(scheds, landResult, p.horizon);
  const p1 = phases['Phase 1'];
  const p2 = phases['Phase 2'];
  assert(p1 && p2, 'Both phases exist');
  // Phase 1 footprint: 15000+7500+10000=32500, Phase 2: 8000+12000=20000
  const totalFP = 32500 + 20000;
  assert(near(p1.allocPct, 32500 / totalFP, 0.001), `P1 alloc: ${p1.allocPct}`);
  assert(near(p2.allocPct, 20000 / totalFP, 0.001), `P2 alloc: ${p2.allocPct}`);
  assert(near(p1.allocPct + p2.allocPct, 1, 0.001), 'Allocations sum to 100%');
});

test('T3.7 Consolidated = sum of phases', () => {
  const p = zanProject();
  const scheds = computeAssetSchedules(p);
  const scheds_lr = computeAssetSchedules(p);
  const landResult = computeLandSchedule(p, p.horizon, scheds_lr);
  const landSch = landResult.schedule;
  const phases = computePhaseResults(scheds, landResult, p.horizon);
  const consolidated = computeConsolidated(phases, p.horizon);
  const phaseTotalCapex = Object.values(phases).reduce((s, ph) => s + ph.totalCapex, 0);
  assert(near(consolidated.totalCapex, phaseTotalCapex, 1), `Consolidated CAPEX: ${consolidated.totalCapex} vs sum ${phaseTotalCapex}`);
  const phaseTotalIncome = Object.values(phases).reduce((s, ph) => s + ph.totalIncome, 0);
  assert(near(consolidated.totalIncome, phaseTotalIncome, 1), `Consolidated Income: ${consolidated.totalIncome} vs sum ${phaseTotalIncome}`);
});

test('T3.8 NetCF = Income - LandRent - CAPEX (every year)', () => {
  const p = simpleProject();
  const result = computeUnleveredCashFlows(p);
  const c = result.consolidated;
  for (let y = 0; y < p.horizon; y++) {
    const expected = c.income[y] - c.landRent[y] - c.capex[y];
    assert(near(c.netCF[y], expected, 0.01), `Year ${y}: ${c.netCF[y]} vs ${expected}`);
  }
});

test('T3.9 IRR is positive for profitable project', () => {
  const p = zanProject();
  const result = computeUnleveredCashFlows(p);
  assert(result.consolidated.irr > 0, `IRR should be > 0: ${result.consolidated.irr}`);
  assert(result.consolidated.irr < 1, `IRR should be < 100%: ${result.consolidated.irr}`);
});

test('T3.10 NPV at 0% = total net CF', () => {
  const p = simpleProject();
  const result = computeUnleveredCashFlows(p);
  const cf = result.consolidated.netCF;
  const npv0 = calcNPV(cf, 0);
  const totalCF = cf.reduce((a, b) => a + b, 0);
  assert(near(npv0, totalCF, 0.01), `NPV@0%: ${npv0} vs totalCF: ${totalCF}`);
});

test('T3.11 NPV at higher rate < NPV at lower rate', () => {
  const p = zanProject();
  const result = computeUnleveredCashFlows(p);
  assert(result.consolidated.npv10 > result.consolidated.npv12, 'NPV@10% > NPV@12%');
  assert(result.consolidated.npv12 > result.consolidated.npv14, 'NPV@12% > NPV@14%');
});

test('T3.12 calcIRR matches oracle (Newton vs bisection, wider tol)', () => {
  const cf = [-100, 20, 30, 40, 50, 60];
  const mine = calcIRR(cf);
  const oracle = oracleIRR(cf);
  // Newton-Raphson is more precise than bisection, allow 1% relative tolerance
  assert(near(mine, oracle, 0.005), `IRR: ${mine} vs oracle ${oracle}`);
});

test('T3.13 calcNPV matches oracle', () => {
  const cf = [-100, 20, 30, 40, 50, 60];
  const mine = calcNPV(cf, 0.10);
  const oracle = oracleNPV(cf, 0.10);
  assert(near(mine, oracle, 0.01), `NPV: ${mine} vs oracle ${oracle}`);
});

test('T3.14 Per-phase IRR exists for each phase', () => {
  const p = zanProject();
  const result = computeUnleveredCashFlows(p);
  for (const [name, phase] of Object.entries(result.phaseResults)) {
    assert(phase.irr !== null && phase.irr !== undefined, `Phase "${name}" has no IRR`);
    assert(phase.irr > -1, `Phase "${name}" IRR unreasonable: ${phase.irr}`);
  }
});

// ═════════════════════════════════════════════
console.log('\n═══ T4: Cross-Check — Modular Engine vs App.jsx ═══');
// ═════════════════════════════════════════════

test('T4.1 computeUnleveredCashFlows matches App.jsx computeProjectCashFlows - simple', () => {
  const p = simpleProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  assert(near(mine.consolidated.totalCapex, theirs.consolidated.totalCapex, 1), `CAPEX: ${mine.consolidated.totalCapex} vs ${theirs.consolidated.totalCapex}`);
  assert(near(mine.consolidated.totalIncome, theirs.consolidated.totalIncome, 1), `Income: ${mine.consolidated.totalIncome} vs ${theirs.consolidated.totalIncome}`);
  const cfCheck = arrClose(mine.consolidated.netCF, theirs.consolidated.netCF, 1);
  assert(cfCheck.ok, `NetCF: ${cfCheck.msg}`);
});

test('T4.2 computeUnleveredCashFlows matches App.jsx - ZAN project', () => {
  const p = zanProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  assert(near(mine.consolidated.totalCapex, theirs.consolidated.totalCapex, 1), `CAPEX: ${mine.consolidated.totalCapex} vs ${theirs.consolidated.totalCapex}`);
  assert(near(mine.consolidated.totalIncome, theirs.consolidated.totalIncome, 1), `Income: ${mine.consolidated.totalIncome} vs ${theirs.consolidated.totalIncome}`);
  assert(near(mine.consolidated.totalLandRent, theirs.consolidated.totalLandRent, 1), `LandRent: ${mine.consolidated.totalLandRent} vs ${theirs.consolidated.totalLandRent}`);
});

test('T4.3 Consolidated IRR matches App.jsx', () => {
  const p = zanProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  assert(near(mine.consolidated.irr, theirs.consolidated.irr, 1e-6), `IRR: ${mine.consolidated.irr} vs ${theirs.consolidated.irr}`);
});

test('T4.4 Consolidated NPV matches App.jsx', () => {
  const p = zanProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  assert(near(mine.consolidated.npv10, theirs.consolidated.npv10, 1), `NPV@10%: ${mine.consolidated.npv10} vs ${theirs.consolidated.npv10}`);
  assert(near(mine.consolidated.npv12, theirs.consolidated.npv12, 1), `NPV@12%: ${mine.consolidated.npv12} vs ${theirs.consolidated.npv12}`);
  assert(near(mine.consolidated.npv14, theirs.consolidated.npv14, 1), `NPV@14%: ${mine.consolidated.npv14} vs ${theirs.consolidated.npv14}`);
});

test('T4.5 Year-by-year CF matches App.jsx (all 50 years)', () => {
  const p = zanProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  const cfCheck = arrClose(mine.consolidated.netCF, theirs.consolidated.netCF, 1);
  assert(cfCheck.ok, `Year-by-year CF mismatch: ${cfCheck.msg}`);
});

test('T4.6 Phase results match App.jsx', () => {
  const p = zanProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  const myPhases = Object.keys(mine.phaseResults).sort();
  const theirPhases = Object.keys(theirs.phaseResults).sort();
  assert(myPhases.join(',') === theirPhases.join(','), `Phases: ${myPhases} vs ${theirPhases}`);
  for (const pName of myPhases) {
    const m = mine.phaseResults[pName];
    const t = theirs.phaseResults[pName];
    assert(near(m.totalCapex, t.totalCapex, 1), `Phase "${pName}" CAPEX: ${m.totalCapex} vs ${t.totalCapex}`);
    assert(near(m.totalIncome, t.totalIncome, 1), `Phase "${pName}" Income: ${m.totalIncome} vs ${t.totalIncome}`);
    assert(near(m.irr, t.irr, 1e-6), `Phase "${pName}" IRR: ${m.irr} vs ${t.irr}`);
  }
});

test('T4.7 Land schedule matches App.jsx', () => {
  const p = zanProject();
  const mine = computeUnleveredCashFlows(p);
  const theirs = appEngine.computeProjectCashFlows(p);
  const check = arrClose(mine.landSchedule, theirs.landSchedule, 0.01);
  assert(check.ok, `Land schedule: ${check.msg}`);
});

test('T4.8 All scenarios produce matching results', () => {
  const scenarios = ['Base Case', 'CAPEX +10%', 'CAPEX -10%', 'Rent +10%', 'Rent -10%', 'Delay +6 months'];
  for (const s of scenarios) {
    const p = zanProject();
    p.activeScenario = s;
    const mine = computeUnleveredCashFlows(p);
    const theirs = appEngine.computeProjectCashFlows(p);
    assert(near(mine.consolidated.totalCapex, theirs.consolidated.totalCapex, 1), `${s}: CAPEX ${mine.consolidated.totalCapex} vs ${theirs.consolidated.totalCapex}`);
    assert(near(mine.consolidated.totalIncome, theirs.consolidated.totalIncome, 1), `${s}: Income ${mine.consolidated.totalIncome} vs ${theirs.consolidated.totalIncome}`);
    assert(near(mine.consolidated.irr, theirs.consolidated.irr, 1e-5), `${s}: IRR ${mine.consolidated.irr} vs ${theirs.consolidated.irr}`);
  }
});

// ═════════════════════════════════════════════
console.log('\n═══ T5: Edge Cases ═══');
// ═════════════════════════════════════════════

test('T5.1 Empty project (no assets)', () => {
  const p = defaultProject();
  p.horizon = 10;
  p.assets = [];
  const result = computeUnleveredCashFlows(p);
  assert(result.consolidated.totalCapex === 0, 'Zero CAPEX');
  assert(result.consolidated.totalIncome === 0, 'Zero income');
  assert(result.consolidated.irr === null, 'Null IRR');
});

test('T5.2 Very short horizon (5 years)', () => {
  const p = simpleProject();
  p.horizon = 5;
  const result = computeUnleveredCashFlows(p);
  assert(result.consolidated.netCF.length === 5, '5-year CF');
  assert(result.consolidated.totalCapex > 0, 'Has CAPEX');
});

test('T5.3 BOT land type limits revenue period', () => {
  const p = simpleProject();
  p.landType = 'bot';
  p.botOperationYears = 5;
  p.horizon = 20;
  const result = computeUnleveredCashFlows(p);
  // Revenue should stop after 5 years of operation
  // constrStart=0, dur=1yr → revStart=1. RevEnd = 1+5=6
  for (let y = 7; y < 20; y++) {
    assert(result.consolidated.income[y] === 0, `Year ${y} should have 0 income (BOT expired)`);
  }
});

test('T5.4 Partner land type: no land cost', () => {
  const p = defaultProject();
  p.horizon = 10;
  p.landType = 'partner';
  p.landValuation = 100000000;
  p.assets = [{ id: 't', phase: 'P1', gfa: 5000, footprint: 5000, costPerSqm: 3000, efficiency: 80, leaseRate: 500, revType: 'Lease', stabilizedOcc: 80, rampUpYears: 2, constrDuration: 12, constrStart: 1 }];
  const result = computeUnleveredCashFlows(p);
  assert(result.consolidated.totalLandRent === 0, 'Partner land: no rent');
});

test('T5.5 100-year horizon', () => {
  const p = simpleProject();
  p.horizon = 100;
  const result = computeUnleveredCashFlows(p);
  assert(result.consolidated.netCF.length === 100, '100-year CF');
  assert(result.consolidated.irr !== null, 'IRR computable');
});

test('T5.6 Multiple assets different construction timings', () => {
  const p = defaultProject();
  p.horizon = 20;
  p.landType = 'purchase';
  p.landPurchasePrice = 0;
  p.assets = [
    { id: 'e1', phase: 'P1', gfa: 5000, footprint: 3000, costPerSqm: 3000, efficiency: 80, leaseRate: 500, revType: 'Lease', stabilizedOcc: 80, rampUpYears: 2, constrDuration: 12, constrStart: 1 },
    { id: 'e2', phase: 'P1', gfa: 8000, footprint: 4000, costPerSqm: 4000, efficiency: 85, leaseRate: 600, revType: 'Lease', stabilizedOcc: 85, rampUpYears: 3, constrDuration: 24, constrStart: 4 },
  ];
  const result = computeUnleveredCashFlows(p);
  // Asset 1: CAPEX year 0. Asset 2: CAPEX years 3-4
  assert(result.consolidated.capex[0] > 0, 'CAPEX year 0 (asset 1)');
  assert(result.consolidated.capex[3] > 0, 'CAPEX year 3 (asset 2)');
  // Income: Asset 1 starts year 1, Asset 2 starts year 5
  assert(result.consolidated.income[1] > 0, 'Income year 1 (asset 1)');
  assert(result.consolidated.income[5] > result.consolidated.income[1], 'Income year 5 > year 1 (both assets contributing)');
});


// ═════════════════════════════════════════════
// Summary
// ═════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`Layer A+B+C Tests: ${passed} PASSED | ${failed} FAILED`);
console.log(`${'═'.repeat(50)}\n`);
process.exit(failed > 0 ? 1 : 0);
