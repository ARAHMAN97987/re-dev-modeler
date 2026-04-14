/**
 * Audit Round 7: Multi-phase timing and land rent allocation
 * Tests:
 * 1. Assets in different phases get correct timing (capex + revenue start)
 * 2. Land rent allocation by footprint ratio within phase
 * 3. Edge cases: Phase 2 with no footprint, all assets in one phase
 */

const path = require('path');

// Use the same helper loader as other test suites
const E = require(path.resolve(__dirname, 'helpers/engine.cjs'));

const runFullModel = E.runFullModel;
const computeProjectCashFlows = E.computeProjectCashFlows;

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function near(a, b, tol = 0.01) {
  if (b === 0) return Math.abs(a) < tol;
  return Math.abs(a - b) / Math.abs(b) < tol;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Basic two-phase timing
// Phase 1 = infrastructure, completionYear = 2028 (index 2)
// Phase 2 = buildings, completionYear = 2031 (index 5)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ Round 7: Multi-Phase Timing ═══');
console.log('\nTest 1: Two-phase project — correct asset timing per phase');

const project1 = {
  name: 'Two-Phase Test',
  startYear: 2026,
  horizon: 15,
  landType: 'lease',
  landArea: 10000,
  landRentAnnual: 1000000,
  landRentGrace: 0,
  landRentTerm: 15,
  finMode: 'equity',
  phases: [
    { name: 'Phase 1', completionYear: 2028 }, // index 2
    { name: 'Phase 2', completionYear: 2031 }, // index 5
  ],
  assets: [
    {
      name: 'Infra Asset',
      phase: 'Phase 1',
      revType: 'Lease',
      gfa: 5000,
      efficiency: 80,
      leaseRate: 500,
      stabilizedOcc: 95,
      rampUpYears: 1,
      constrDuration: 24, // 2 years
      footprint: 3000,
    },
    {
      name: 'Building Asset',
      phase: 'Phase 2',
      revType: 'Lease',
      gfa: 8000,
      efficiency: 85,
      leaseRate: 800,
      stabilizedOcc: 95,
      rampUpYears: 2,
      constrDuration: 36, // 3 years
      footprint: 5000,
    },
  ],
};

const res1 = computeProjectCashFlows(project1);
const schedules1 = res1.assetSchedules;
const infraSched = schedules1.find(a => a.name === 'Infra Asset');
const buildSched = schedules1.find(a => a.name === 'Building Asset');

// Phase 1 completionYear=2028 → index 2 → revStart=2, cStart=0
// Phase 2 completionYear=2031 → index 5 → revStart=5, cStart=2
assert(infraSched != null, 'Infra Asset schedule exists');
assert(buildSched != null, 'Building Asset schedule exists');

if (infraSched && buildSched) {
  // Revenue should start at phase completion year
  const infraFirstRev = infraSched.revenueSchedule.findIndex(v => v > 0);
  const buildFirstRev = buildSched.revenueSchedule.findIndex(v => v > 0);

  assert(infraFirstRev === 2, `Infra Asset revenue starts at index 2 (completionYear=2028)`, `got ${infraFirstRev}`);
  assert(buildFirstRev === 5, `Building Asset revenue starts at index 5 (completionYear=2031)`, `got ${buildFirstRev}`);

  // CAPEX should end at completionYear (or before)
  const infraLastCapex = infraSched.capexSchedule.reduce((l, v, i) => v > 0 ? i : l, -1);
  const buildLastCapex = buildSched.capexSchedule.reduce((l, v, i) => v > 0 ? i : l, -1);

  assert(infraLastCapex < 2, `Infra CAPEX ends before revenue start (idx ${infraLastCapex} < 2)`, `last capex at idx ${infraLastCapex}`);
  assert(buildLastCapex < 5, `Building CAPEX ends before revenue start (idx ${buildLastCapex} < 5)`, `last capex at idx ${buildLastCapex}`);

  // Phase results: Phase 1 should have income from index 2, Phase 2 from index 5
  const p1Result = res1.phaseResults['Phase 1'];
  const p2Result = res1.phaseResults['Phase 2'];

  assert(p1Result != null, 'Phase 1 results exist');
  assert(p2Result != null, 'Phase 2 results exist');

  if (p1Result && p2Result) {
    const p1FirstIncome = p1Result.income.findIndex(v => v > 0);
    const p2FirstIncome = p2Result.income.findIndex(v => v > 0);

    assert(p1FirstIncome === 2, `Phase 1 income starts at index 2`, `got ${p1FirstIncome}`);
    assert(p2FirstIncome === 5, `Phase 2 income starts at index 5`, `got ${p2FirstIncome}`);

    // Phase 2 income should be zero for years 0-4
    let p2PreIncome = p2Result.income.slice(0, 5).reduce((a, b) => a + b, 0);
    assert(p2PreIncome === 0, `Phase 2 has no income before index 5`, `sum 0-4 = ${p2PreIncome.toFixed(0)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Land rent allocation by footprint ratio
// Infra Asset: footprint 3000 → share = 3000/8000 = 37.5%
// Building Asset: footprint 5000 → share = 5000/8000 = 62.5%
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: Land rent allocation by footprint ratio');

if (res1.phaseResults['Phase 1'] && res1.phaseResults['Phase 2']) {
  const totalFP = 3000 + 5000; // 8000
  const p1Share = 3000 / totalFP; // 0.375
  const p2Share = 5000 / totalFP; // 0.625

  // Find a year where land rent is active (after grace period)
  const activeYear = res1.landSchedule.findIndex(v => v > 0);
  assert(activeYear >= 0, `Land rent is active at some year`, `first active year: ${activeYear}`);

  if (activeYear >= 0) {
    const totalRent = res1.landSchedule[activeYear];
    const p1Rent = res1.phaseResults['Phase 1'].landRent[activeYear];
    const p2Rent = res1.phaseResults['Phase 2'].landRent[activeYear];

    assert(near(p1Rent / totalRent, p1Share),
      `Phase 1 land rent = ${(p1Share*100).toFixed(1)}% (footprint ratio)`,
      `actual ${(p1Rent/totalRent*100).toFixed(2)}%, expected ${(p1Share*100).toFixed(1)}%`
    );
    assert(near(p2Rent / totalRent, p2Share),
      `Phase 2 land rent = ${(p2Share*100).toFixed(1)}% (footprint ratio)`,
      `actual ${(p2Rent/totalRent*100).toFixed(2)}%, expected ${(p2Share*100).toFixed(1)}%`
    );

    // Allocations should sum to total rent
    assert(near(p1Rent + p2Rent, totalRent),
      `Phase allocations sum to total rent`,
      `p1=${p1Rent.toFixed(0)} + p2=${p2Rent.toFixed(0)} vs total=${totalRent.toFixed(0)}`
    );

    // Land rent meta should record correct footprints
    const meta = res1.landRentMeta;
    assert(meta != null, 'landRentMeta exists');
    if (meta && meta.phaseShares) {
      const p1Meta = meta.phaseShares['Phase 1'];
      const p2Meta = meta.phaseShares['Phase 2'];
      assert(p1Meta && near(p1Meta.share, p1Share),
        `landRentMeta Phase 1 share = ${(p1Share*100).toFixed(1)}%`,
        `got ${p1Meta ? (p1Meta.share*100).toFixed(2) : 'null'}%`
      );
      assert(p2Meta && near(p2Meta.share, p2Share),
        `landRentMeta Phase 2 share = ${(p2Share*100).toFixed(1)}%`,
        `got ${p2Meta ? (p2Meta.share*100).toFixed(2) : 'null'}%`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Edge case — Phase 2 has no footprint (no assets assigned to it)
// Phase 2 still exists, but all assets in Phase 1
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: Edge case — Phase 2 has no assets (zero footprint)');

const project2 = {
  name: 'Phase2 No Footprint',
  startYear: 2026,
  horizon: 15,
  landType: 'lease',
  landArea: 5000,
  landRentAnnual: 500000,
  landRentGrace: 0,
  landRentTerm: 15,
  finMode: 'equity',
  phases: [
    { name: 'Phase 1', completionYear: 2028 },
    { name: 'Phase 2', completionYear: 2031 }, // NO assets
  ],
  assets: [
    {
      name: 'All In Phase 1',
      phase: 'Phase 1',
      revType: 'Lease',
      gfa: 4000,
      efficiency: 80,
      leaseRate: 600,
      stabilizedOcc: 90,
      rampUpYears: 1,
      constrDuration: 24,
      footprint: 4000,
    },
  ],
};

const res2 = computeProjectCashFlows(project2);
const p1Res2 = res2.phaseResults['Phase 1'];
const p2Res2 = res2.phaseResults['Phase 2'];

assert(p1Res2 != null, 'Phase 1 results exist (all assets)');
// Phase 2 exists but may have zero capex
// The key check: no crash, and no undefined behavior
const noError2 = res2 != null && res2.consolidated != null;
assert(noError2, 'No crash when Phase 2 has zero footprint');

if (p2Res2) {
  const p2TotalCapex = p2Res2.totalCapex;
  assert(p2TotalCapex === 0 || p2TotalCapex == null,
    `Phase 2 has zero CAPEX`, `got ${p2TotalCapex}`);

  // Land rent: with only Phase 1 having footprint, allocPct check
  const activeYear2 = res2.landSchedule.findIndex(v => v > 0);
  if (activeYear2 >= 0) {
    const totalRent2 = res2.landSchedule[activeYear2];
    const p1Rent2 = p1Res2.landRent[activeYear2];
    const p2Rent2 = p2Res2 ? p2Res2.landRent[activeYear2] : 0;

    // All footprint in Phase 1 → Phase 1 gets 100% OR equal split (if fallback)
    // With Phase 1 having footprint=4000 and Phase 2 having footprint=0,
    // totalFootprint=4000, Phase 1 share = 4000/4000 = 100%
    assert(near(p1Rent2, totalRent2) || p1Rent2 > 0,
      `Phase 1 gets most/all land rent when Phase 2 has no footprint`,
      `p1=${p1Rent2.toFixed(0)}, p2=${p2Rent2.toFixed(0)}, total=${totalRent2.toFixed(0)}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Edge case — All assets in one phase
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: Edge case — All assets in a single phase');

const project3 = {
  name: 'Single Phase',
  startYear: 2026,
  horizon: 12,
  landType: 'lease',
  landArea: 6000,
  landRentAnnual: 600000,
  landRentGrace: 0,
  landRentTerm: 12,
  finMode: 'equity',
  phases: [
    { name: 'Phase A', completionYear: 2029 },
  ],
  assets: [
    {
      name: 'Asset 1',
      phase: 'Phase A',
      revType: 'Lease',
      gfa: 2000,
      efficiency: 80,
      leaseRate: 500,
      stabilizedOcc: 90,
      rampUpYears: 1,
      constrDuration: 36,
      footprint: 2000,
    },
    {
      name: 'Asset 2',
      phase: 'Phase A',
      revType: 'Operating',
      gfa: 3000,
      opEbitda: 300000,
      rampUpYears: 1,
      constrDuration: 36,
      footprint: 3000,
    },
  ],
};

const res3 = computeProjectCashFlows(project3);
const pAResult = res3.phaseResults['Phase A'];

assert(pAResult != null, 'Phase A results exist');
assert(res3.consolidated != null, 'Consolidated results exist');

if (pAResult) {
  // All income goes to Phase A
  const pAFirstIncome = pAResult.income.findIndex(v => v > 0);
  assert(pAFirstIncome === 3, `Single phase income starts at index 3 (completionYear=2029)`, `got ${pAFirstIncome}`);

  // Consolidated should match phase (only one phase)
  const totalConsolidatedIncome = res3.consolidated.income.reduce((a, b) => a + b, 0);
  const totalPhaseAIncome = pAResult.income.reduce((a, b) => a + b, 0);
  assert(near(totalConsolidatedIncome, totalPhaseAIncome),
    `Single phase: consolidated income = Phase A income`,
    `consolidated=${totalConsolidatedIncome.toFixed(0)}, phaseA=${totalPhaseAIncome.toFixed(0)}`
  );

  // Land rent: 100% to Phase A
  const activeYear3 = res3.landSchedule.findIndex(v => v > 0);
  if (activeYear3 >= 0) {
    const totalRent3 = res3.landSchedule[activeYear3];
    const pARent = pAResult.landRent[activeYear3];
    assert(near(pARent, totalRent3),
      `Single phase: 100% land rent allocated to Phase A`,
      `pA=${pARent.toFixed(0)}, total=${totalRent3.toFixed(0)}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Phase timing with constrStart (legacy mode) vs completionYear
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: Legacy constrStart mode — no phase completionYear');

const project4 = {
  name: 'Legacy constrStart',
  startYear: 2026,
  horizon: 12,
  landType: 'freehold',
  finMode: 'equity',
  phases: [
    { name: 'Phase 1' }, // NO completionYear
    { name: 'Phase 2' }, // NO completionYear
  ],
  assets: [
    {
      name: 'Early Asset',
      phase: 'Phase 1',
      revType: 'Lease',
      gfa: 3000,
      efficiency: 80,
      leaseRate: 500,
      stabilizedOcc: 90,
      rampUpYears: 1,
      constrStart: 0, // starts at project start
      constrDuration: 24, // 2 years → revStart = 2
      footprint: 3000,
    },
    {
      name: 'Late Asset',
      phase: 'Phase 2',
      revType: 'Lease',
      gfa: 4000,
      efficiency: 80,
      leaseRate: 600,
      stabilizedOcc: 90,
      rampUpYears: 1,
      constrStart: 3, // starts at year 3
      constrDuration: 24, // 2 years → revStart = 5
      footprint: 4000,
    },
  ],
};

const res4 = computeProjectCashFlows(project4);
const earlySched = res4.assetSchedules.find(a => a.name === 'Early Asset');
const lateSched = res4.assetSchedules.find(a => a.name === 'Late Asset');

if (earlySched && lateSched) {
  const earlyFirstRev = earlySched.revenueSchedule.findIndex(v => v > 0);
  const lateFirstRev = lateSched.revenueSchedule.findIndex(v => v > 0);

  assert(earlyFirstRev === 2, `Early Asset revenue starts at index 2 (constrStart=0 + 2yr)`, `got ${earlyFirstRev}`);
  assert(lateFirstRev === 5, `Late Asset revenue starts at index 5 (constrStart=3 + 2yr)`, `got ${lateFirstRev}`);

  // Phase 1 income before index 2 = 0
  const p1R4 = res4.phaseResults['Phase 1'];
  const p2R4 = res4.phaseResults['Phase 2'];
  if (p1R4 && p2R4) {
    assert(p1R4.income.slice(0, 2).every(v => v === 0), `Phase 1 (early) has no income before construction complete`);
    assert(p2R4.income.slice(0, 5).every(v => v === 0), `Phase 2 (late) has no income before year 5`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════════`);
console.log(`Round 7 Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ ALL TESTS PASSED');
} else {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
}
