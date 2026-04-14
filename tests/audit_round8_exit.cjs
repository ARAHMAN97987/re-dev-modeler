/**
 * Audit Round 8: Exit valuation for mixed revType projects
 * Tests:
 * 1. Sale assets are EXCLUDED from exit valuation (already realized via sales)
 * 2. Lease + Operating assets included in exit valuation
 * 3. exitStrategy: "sale" with exitMultiple
 * 4. exitStrategy: "caprate" with exitCapRate
 * 5. No double-counting of Sale revenue at exit
 */

const path = require('path');

// Use the same helper loader as other test suites
const E = require(path.resolve(__dirname, 'helpers/engine.cjs'));

const runFullModel = E.runFullModel;
const computeProjectCashFlows = E.computeProjectCashFlows;
const computeFinancing = E.computeFinancing;

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
// Base mixed project: 1 Sale + 1 Lease + 1 Operating
// ─────────────────────────────────────────────────────────────────────────────
function makeMixedProject(exitStrategy, exitMultiple, exitCapRate, exitYear = 10) {
  return {
    name: 'Mixed RevType Exit Test',
    startYear: 2026,
    horizon: 15,
    landType: 'freehold',
    finMode: 'equity',
    exitStrategy,
    exitMultiple: exitMultiple ?? 10,
    exitCapRate: exitCapRate ?? 9,
    exitYear,
    exitCostPct: 0, // No exit costs for clean test
    phases: [
      { name: 'Phase 1', completionYear: 2029 },
    ],
    assets: [
      {
        name: 'Villa Sales',
        phase: 'Phase 1',
        revType: 'Sale',
        gfa: 5000,
        efficiency: 100,
        salePricePerSqm: 8000,
        absorptionYears: 3,
        preSalePct: 0,
        constrDuration: 36,
        footprint: 2000,
      },
      {
        name: 'Retail Lease',
        phase: 'Phase 1',
        revType: 'Lease',
        gfa: 3000,
        efficiency: 85,
        leaseRate: 1200,
        stabilizedOcc: 90,
        rampUpYears: 1,
        constrDuration: 36,
        footprint: 2000,
      },
      {
        name: 'Hotel Operating',
        phase: 'Phase 1',
        revType: 'Operating',
        gfa: 8000,
        opEbitda: 5000000,
        rampUpYears: 2,
        constrDuration: 36,
        footprint: 4000,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: exitStrategy = "sale" (income × multiple)
// Sale asset EXCLUDED, Lease + Operating INCLUDED
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ Round 8: Exit Valuation for Mixed RevType Projects ═══');
console.log('\nTest 1: exitStrategy="sale" — Sale asset excluded from exit');

const proj8a = makeMixedProject('sale', 10, 9, 10);
const pr8a = computeProjectCashFlows(proj8a);

// Compute financing to get exitProceeds
const fin8a = computeFinancing(proj8a, pr8a, null);

assert(fin8a != null, 'Financing computed successfully');

if (fin8a) {
  // exitYear = 10 (index 10)
  const exitIdx = 10;
  const exitProceeds = fin8a.exitProceeds[exitIdx];
  assert(exitProceeds > 0, `Exit proceeds exist at year ${exitIdx}`, `exitProceeds=${exitProceeds?.toFixed(0)}`);

  // Compute expected exit value manually:
  // Only Lease + Operating assets contribute (Sale excluded)
  const leaseSched = pr8a.assetSchedules.find(a => a.name === 'Retail Lease');
  const opSched = pr8a.assetSchedules.find(a => a.name === 'Hotel Operating');
  const saleSched = pr8a.assetSchedules.find(a => a.name === 'Villa Sales');

  if (leaseSched && opSched && saleSched) {
    const leaseIncome = leaseSched.revenueSchedule[exitIdx] || 0;
    const opIncome = opSched.revenueSchedule[exitIdx] || 0;
    const saleIncome = saleSched.revenueSchedule[exitIdx] || 0;

    const expectedExitVal = (leaseIncome + opIncome) * 10; // multiple=10, Sale excluded
    const expectedWithSale = (leaseIncome + opIncome + saleIncome) * 10;

    assert(near(exitProceeds, expectedExitVal, 0.001),
      `Exit proceeds = (Lease + Operating) × 10 (Sale excluded)`,
      `expected=${expectedExitVal.toFixed(0)}, actual=${exitProceeds.toFixed(0)}`
    );

    // If Sale were included, proceeds would be higher
    if (saleIncome > 0) {
      assert(exitProceeds < expectedWithSale,
        `Exit proceeds are LESS than if Sale were included (confirming exclusion)`,
        `actual=${exitProceeds.toFixed(0)}, would-be-with-sale=${expectedWithSale.toFixed(0)}`
      );
    } else {
      // Sale absorption may be complete by year 10
      assert(saleIncome === 0,
        `Villa Sale income is 0 at exit year (absorption complete)`,
        `saleIncome at yr${exitIdx}=${saleIncome.toFixed(0)}`
      );
      assert(exitProceeds === (leaseIncome + opIncome) * 10,
        `Exit proceeds = (Lease + Operating) × 10 with Sale income=0`,
        `expected=${((leaseIncome + opIncome) * 10).toFixed(0)}, actual=${exitProceeds.toFixed(0)}`
      );
    }

    console.log(`    Info: leaseIncome@yr10=${leaseIncome.toFixed(0)}, opIncome@yr10=${opIncome.toFixed(0)}, saleIncome@yr10=${saleIncome.toFixed(0)}`);
    console.log(`    Info: exitProceeds=${exitProceeds.toFixed(0)}, expected(no sale)=${expectedExitVal.toFixed(0)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: exitStrategy = "caprate" (income / capRate)
// Same exclusion should apply
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: exitStrategy="caprate" — Sale asset excluded, cap rate valuation');

const proj8b = makeMixedProject('caprate', 10, 9, 10);
const pr8b = computeProjectCashFlows(proj8b);
const fin8b = computeFinancing(proj8b, pr8b, null);

assert(fin8b != null, 'Financing computed for caprate project');

if (fin8b) {
  const exitIdx = 10;
  const exitProceeds = fin8b.exitProceeds[exitIdx];
  assert(exitProceeds > 0, `Cap rate exit proceeds exist at year ${exitIdx}`);

  const leaseSched = pr8b.assetSchedules.find(a => a.name === 'Retail Lease');
  const opSched = pr8b.assetSchedules.find(a => a.name === 'Hotel Operating');
  const saleSched = pr8b.assetSchedules.find(a => a.name === 'Villa Sales');

  if (leaseSched && opSched && saleSched) {
    const leaseIncome = leaseSched.revenueSchedule[exitIdx] || 0;
    const opIncome = opSched.revenueSchedule[exitIdx] || 0;
    const saleIncome = saleSched.revenueSchedule[exitIdx] || 0;

    const capRate = 9 / 100;
    // For caprate: ALL assets (including Sale) use income/capRate per current code
    // Sale is excluded in "sale" mode; for "caprate" the code also excludes Sale (revType="Sale" block is empty)
    // BUT wait — re-reading the code: the caprate path says "ALL assets valued at income/capRate"
    // Let me re-check: in financing.js the caprate block does NOT have a Sale exclusion —
    // the if/else structure means:
    //   if Sale → skip
    //   else if caprate → value at income/capRate
    //   else → value at income × multiple
    // So Sale IS excluded for caprate too.
    const expectedExitVal = (leaseIncome + opIncome) / capRate;

    assert(near(exitProceeds, expectedExitVal, 0.001),
      `Cap rate exit = (Lease + Operating) / 9% (Sale excluded)`,
      `expected=${expectedExitVal.toFixed(0)}, actual=${exitProceeds.toFixed(0)}`
    );

    console.log(`    Info: leaseIncome@yr10=${leaseIncome.toFixed(0)}, opIncome@yr10=${opIncome.toFixed(0)}, saleIncome@yr10=${saleIncome.toFixed(0)}`);
    console.log(`    Info: exitProceeds=${exitProceeds.toFixed(0)}, expected=${expectedExitVal.toFixed(0)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Sale-only project — exit proceeds should be 0 (all realized via sales)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: Sale-only project — no exit proceeds');

const projSaleOnly = {
  name: 'Sale Only Exit',
  startYear: 2026,
  horizon: 12,
  landType: 'freehold',
  finMode: 'equity',
  exitStrategy: 'sale',
  exitMultiple: 10,
  exitYear: 8,
  exitCostPct: 0,
  phases: [{ name: 'Phase 1', completionYear: 2029 }],
  assets: [
    {
      name: 'Units',
      phase: 'Phase 1',
      revType: 'Sale',
      gfa: 6000,
      efficiency: 100,
      salePricePerSqm: 5000,
      absorptionYears: 2,
      constrDuration: 36,
      footprint: 3000,
    },
  ],
};

const prSaleOnly = computeProjectCashFlows(projSaleOnly);
const finSaleOnly = computeFinancing(projSaleOnly, prSaleOnly, null);

assert(finSaleOnly != null, 'Financing computed for sale-only project');

if (finSaleOnly) {
  const maxExitProceeds = Math.max(...finSaleOnly.exitProceeds);
  assert(maxExitProceeds === 0,
    `Sale-only: exit proceeds = 0 (no income-producing assets to capitalize)`,
    `maxExitProceeds=${maxExitProceeds.toFixed(0)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Lease-only project — exit proceeds = income × multiple
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: Lease-only project — exit proceeds = income × multiple');

const projLeaseOnly = {
  name: 'Lease Only Exit',
  startYear: 2026,
  horizon: 15,
  landType: 'freehold',
  finMode: 'equity',
  exitStrategy: 'sale',
  exitMultiple: 10,
  exitYear: 10,
  exitCostPct: 0,
  phases: [{ name: 'Phase 1', completionYear: 2029 }],
  assets: [
    {
      name: 'Office Space',
      phase: 'Phase 1',
      revType: 'Lease',
      gfa: 5000,
      efficiency: 85,
      leaseRate: 1000,
      stabilizedOcc: 92,
      rampUpYears: 1,
      constrDuration: 36,
      footprint: 3000,
    },
  ],
};

const prLeaseOnly = computeProjectCashFlows(projLeaseOnly);
const finLeaseOnly = computeFinancing(projLeaseOnly, prLeaseOnly, null);

assert(finLeaseOnly != null, 'Financing computed for lease-only project');

if (finLeaseOnly) {
  const exitIdx = 10;
  const exitProceeds = finLeaseOnly.exitProceeds[exitIdx];
  const leaseSched = prLeaseOnly.assetSchedules.find(a => a.name === 'Office Space');
  const leaseIncome = leaseSched?.revenueSchedule[exitIdx] || 0;
  const expectedExitVal = leaseIncome * 10;

  assert(exitProceeds > 0, `Lease-only: exit proceeds > 0`, `got ${exitProceeds?.toFixed(0)}`);
  assert(near(exitProceeds, expectedExitVal, 0.001),
    `Lease exit proceeds = income × 10`,
    `expected=${expectedExitVal.toFixed(0)}, actual=${exitProceeds?.toFixed(0)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Mixed project with exitStrategy="hold" — no exit proceeds
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: exitStrategy="hold" — no exit proceeds regardless of revType');

const projHold = makeMixedProject('hold', 10, 9, 10);
const prHold = computeProjectCashFlows(projHold);
const finHold = computeFinancing(projHold, prHold, null);

assert(finHold != null, 'Financing computed for hold strategy');

if (finHold) {
  const maxExitProceedsHold = Math.max(...finHold.exitProceeds);
  assert(maxExitProceedsHold === 0,
    `Hold strategy: no exit proceeds`,
    `max=${maxExitProceedsHold.toFixed(0)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: No double-counting — Sale income already in cash flows, not in exit
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 6: No double-counting — Sale revenue in cash flows, NOT in exit proceeds');

const proj8c = makeMixedProject('sale', 10, 9, 10);
const pr8c = computeProjectCashFlows(proj8c);
const fin8c = computeFinancing(proj8c, pr8c, null);

if (fin8c && pr8c) {
  const saleSchedule = pr8c.assetSchedules.find(a => a.name === 'Villa Sales');
  const totalSaleRevenue = saleSchedule?.totalRevenue || 0;

  assert(totalSaleRevenue > 0,
    `Sale asset has revenue in cash flow schedule`,
    `totalSaleRevenue=${totalSaleRevenue.toFixed(0)}`
  );

  // Compute total exit proceeds
  const totalExitProceeds = fin8c.exitProceeds.reduce((a, b) => a + b, 0);

  // Compute what exit would be WITH Sale included
  const exitIdx = 10;
  const saleSched = pr8c.assetSchedules.find(a => a.name === 'Villa Sales');
  const saleAtExit = saleSched?.revenueSchedule[exitIdx] || 0;
  const leaseSched2 = pr8c.assetSchedules.find(a => a.name === 'Retail Lease');
  const opSched2 = pr8c.assetSchedules.find(a => a.name === 'Hotel Operating');
  const leaseAtExit = leaseSched2?.revenueSchedule[exitIdx] || 0;
  const opAtExit = opSched2?.revenueSchedule[exitIdx] || 0;

  const exitWithoutSale = (leaseAtExit + opAtExit) * 10;
  const exitWithSale = (leaseAtExit + opAtExit + saleAtExit) * 10;

  // Only meaningful check if Sale income is present at exit year
  // (could be 0 if absorption is complete by year 10)
  if (saleAtExit > 0) {
    assert(totalExitProceeds < exitWithSale,
      `Exit proceeds exclude Sale income (no double-counting)`,
      `exitWithoutSale=${exitWithoutSale.toFixed(0)}, exitWithSale=${exitWithSale.toFixed(0)}, actual=${totalExitProceeds.toFixed(0)}`
    );
  } else {
    // Sale absorption complete before exit year
    assert(near(totalExitProceeds, exitWithoutSale, 0.001),
      `Exit proceeds = income-only assets × multiple (Sale absorption already complete)`,
      `expected=${exitWithoutSale.toFixed(0)}, actual=${totalExitProceeds.toFixed(0)}`
    );
    console.log('    Note: Sale absorption was complete before exit year — no double-counting risk');
  }

  // Verify sale income IS in cash flows before exit year
  const saleBeforeExit = saleSchedule?.revenueSchedule.slice(0, exitIdx).reduce((a, b) => a + b, 0) || 0;
  assert(saleBeforeExit > 0,
    `Sale revenue captured in cash flows before exit year`,
    `saleRevenue years 0-${exitIdx-1} = ${saleBeforeExit.toFixed(0)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Verify Sale exclusion is consistent — caprate and sale modes match expectation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7: Sale exclusion consistent between "sale" and "caprate" strategies');

const proj8d_sale = makeMixedProject('sale', 10, 9, 10);
const proj8d_cap = makeMixedProject('caprate', 10, 9, 10);
const pr8d_sale = computeProjectCashFlows(proj8d_sale);
const pr8d_cap = computeProjectCashFlows(proj8d_cap);
const fin8d_sale = computeFinancing(proj8d_sale, pr8d_sale, null);
const fin8d_cap = computeFinancing(proj8d_cap, pr8d_cap, null);

if (fin8d_sale && fin8d_cap) {
  const exitIdx = 10;

  // Both should produce non-zero exit (non-sale assets exist)
  assert(fin8d_sale.exitProceeds[exitIdx] > 0, `Sale strategy: exit proceeds > 0 (Lease + Op assets exist)`);
  assert(fin8d_cap.exitProceeds[exitIdx] > 0, `CapRate strategy: exit proceeds > 0 (Lease + Op assets exist)`);

  // The two strategies should give different values (multiple≠caprate for most assets)
  const saleExit = fin8d_sale.exitProceeds[exitIdx];
  const capExit = fin8d_cap.exitProceeds[exitIdx];

  // Cap rate at 9% gives value = income/0.09; multiple at 10x gives income×10
  // income/0.09 ≈ income × 11.11, so caprate should be higher than 10x multiple
  assert(capExit !== saleExit,
    `Cap rate and multiple strategies give different exit values (expected)`,
    `cap=${capExit.toFixed(0)}, sale=${saleExit.toFixed(0)}`
  );

  console.log(`    Info: sale exit=${saleExit.toFixed(0)}, caprate exit=${capExit.toFixed(0)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: Full model integration — runFullModel with mixed project
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 8: Full model integration — runFullModel with mixed revType');

const projFull = makeMixedProject('sale', 10, 9, 10);
let fullModel;
try {
  fullModel = runFullModel(projFull);
} catch(e) {
  console.error(`  runFullModel threw: ${e.message}`);
}

assert(fullModel != null, 'runFullModel returns result');

if (fullModel) {
  assert(fullModel.financing != null, 'Full model has financing');
  assert(fullModel.projectResults != null, 'Full model has projectResults');

  const fin = fullModel.financing;
  if (fin) {
    const exitIdx = 10;
    const exitProceeds = fin.exitProceeds?.[exitIdx] ?? 0;
    assert(exitProceeds > 0, `Full model: exit proceeds > 0 at year 10`);

    // leveredCF should include exit proceeds in exit year
    const levCF = fin.leveredCF?.[exitIdx] ?? 0;
    assert(levCF > 0,
      `Levered CF at exit year > 0 (includes exit proceeds)`,
      `leveredCF[${exitIdx}]=${levCF.toFixed(0)}`
    );
  }

  // Asset schedules in full model
  const assetScheds = fullModel.projectResults?.assetSchedules || [];
  assert(assetScheds.length === 3, `Full model has 3 asset schedules`, `got ${assetScheds.length}`);

  const saleAsset = assetScheds.find(a => a.revType === 'Sale');
  const leaseAsset = assetScheds.find(a => a.revType === 'Lease');
  const opAsset = assetScheds.find(a => a.revType === 'Operating');

  assert(saleAsset != null, 'Sale asset present in full model');
  assert(leaseAsset != null, 'Lease asset present in full model');
  assert(opAsset != null, 'Operating asset present in full model');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════════`);
console.log(`Round 8 Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ ALL TESTS PASSED');
} else {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
}
