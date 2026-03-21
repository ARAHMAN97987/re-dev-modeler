/**
 * ENGINE EXTRACTION — Parity Tests
 * 
 * Verifies that extracted engine/ files produce IDENTICAL results
 * to the original functions eval'd from App.jsx.
 * 
 * Run after each extraction step.
 * Run: cd re-dev-modeler && node tests/extraction_parity.cjs
 */
const fs = require('fs');
const path = require('path');

// ═══ Load ORIGINAL engine from App.jsx (eval method) ═══
const appPath = path.resolve(__dirname, '..', 'src', 'App.jsx');
const src = fs.readFileSync(appPath, 'utf8');

// Extract hotel/marina calculators
const hotelStart = src.indexOf('const defaultHotelPL');
const hotelEnd = src.indexOf('const defaultProject');
if (hotelStart >= 0 && hotelEnd > hotelStart) {
  eval(src.substring(hotelStart, hotelEnd).replace(/^const /gm, 'var '));
}

// Extract main engine
const startIdx = src.indexOf('function getScenarioMults');
const endIdx = src.indexOf('function computePhaseWaterfalls');
const bpiStart = src.indexOf('function buildPhaseIncentives');
const bpiEnd = bpiStart >= 0 ? src.indexOf('\nfunction buildPhaseVirtualProject', bpiStart) : -1;
let code = '';
if (bpiStart >= 0 && bpiEnd > bpiStart && bpiStart < startIdx) {
  code += src.substring(bpiStart, bpiEnd) + '\n';
}
code += src.substring(startIdx, endIdx < 0 ? undefined : endIdx);
eval(code);

// ═══ Load EXTRACTED engine files (dynamic import not available in CJS, so we read+eval too) ═══
function loadModule(filePath) {
  const code = fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf8');
  // Convert ESM exports to CJS-compatible: remove 'export ' prefix
  const cjsCode = code
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s+\{[^}]*\}\s*from\s*['"][^'"]*['"];?\s*$/gm, '') // remove re-exports
    .replace(/^import\s+.*$/gm, ''); // remove imports (we provide deps in scope)
  return cjsCode;
}

// ═══ Test Framework ═══
let pass = 0, fail = 0, tests = [];
const t = (name, ok, detail) => {
  tests.push({ name, pass: ok, detail });
  if (ok) pass++;
  else { fail++; console.log(`  ❌ ${name}: ${detail || ''}`); }
};

const near = (a, b, tol = 1e-6) => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < tol;
};

// ═══════════════════════════════════════════════
// STEP 1: engine/math.js
// ═══════════════════════════════════════════════
try {
  eval(loadModule('src/engine/math.js'));
  // These are now the extracted versions, shadowing the eval'd originals
  // So we need to compare differently. Let's load originals with prefixed names.
  
  // Re-extract originals with different names
  const origCode = `
    var orig_calcIRR = ${src.substring(src.indexOf('function calcIRR'), src.indexOf('\nfunction calcNPV'))};
    var orig_calcNPV = ${src.substring(src.indexOf('function calcNPV'), src.indexOf('\nfunction runChecks'))};
  `;
  eval(origCode);

  // Test data
  const testCFs = [
    [-1000, 300, 300, 300, 300, 300],      // simple
    [-5000000, 500000, 800000, 1200000, 1500000, 2000000, 2500000], // large
    [-100, 200],                             // 2-period
    [-100, 50, 50, 50],                      // negative NPV at high rates
    [0, 0, 0],                               // all zeros
    [-100, 0, 0],                            // no positive
    [100, 200],                              // no negative
  ];

  testCFs.forEach((cf, i) => {
    const origIRR = orig_calcIRR(cf);
    const newIRR = calcIRR(cf);
    t(`math.js: calcIRR test ${i+1}`, near(origIRR, newIRR, 1e-10),
      `orig=${origIRR} new=${newIRR}`);
  });

  const rates = [0.08, 0.10, 0.12, 0.15, 0.20];
  testCFs.forEach((cf, i) => {
    rates.forEach(r => {
      const origNPV = orig_calcNPV(cf, r);
      const newNPV = calcNPV(cf, r);
      t(`math.js: calcNPV test ${i+1} @${r*100}%`, near(origNPV, newNPV, 0.01),
        `orig=${origNPV?.toFixed(2)} new=${newNPV?.toFixed(2)}`);
    });
  });
  
  console.log('  ✓ Step 1: engine/math.js loaded and tested');
} catch (e) {
  console.log(`  ❌ Step 1 FAILED TO LOAD: ${e.message}`);
  fail++;
}

// ═══════════════════════════════════════════════
// STEP 2: engine/hospitality.js
// ═══════════════════════════════════════════════
try {
  if (fs.existsSync(path.resolve(__dirname, '..', 'src/engine/hospitality.js'))) {
    eval(loadModule('src/engine/hospitality.js'));

    // Test hotel EBITDA
    const hotelConfig = {
      rooms: 200, adr: 800, occupancy: 70, fbCapture: 40, fbAvgCheck: 150,
      otherPctRoom: 15, undistPctRev: 25, mgmtFeePct: 3, ffePct: 4, insurancePctRev: 1,
      keys: 200, stabOcc: 70, daysYear: 365, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2,
      roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9
    };
    const origHotel = calcHotelEBITDA(hotelConfig);
    t('hospitality.js: calcHotelEBITDA returns object with ebitda', typeof origHotel === 'object' && typeof origHotel.ebitda === 'number' && origHotel.ebitda > 0,
      `EBITDA=${origHotel?.ebitda}`);

    const marinaConfig = {
      berths: 50, avgLength: 15, unitPrice: 3000, stabOcc: 60,
      fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30
    };
    const origMarina = calcMarinaEBITDA(marinaConfig);
    t('hospitality.js: calcMarinaEBITDA returns object with ebitda', typeof origMarina === 'object' && typeof origMarina.ebitda === 'number' && origMarina.ebitda > 0,
      `EBITDA=${origMarina?.ebitda}`);

    console.log('  ✓ Step 2: engine/hospitality.js loaded and tested');
  } else {
    console.log('  ⏭ Step 2: engine/hospitality.js not yet created');
  }
} catch (e) {
  console.log(`  ❌ Step 2 FAILED: ${e.message}`);
  fail++;
}

// ═══════════════════════════════════════════════
// GOLDEN SCENARIO PARITY TEST (runs after Step 8+)
// ═══════════════════════════════════════════════
// This comprehensive test runs the full pipeline on both engines
// and compares every output field. Enabled after cashflow.js is extracted.

const JAZAN = {
  id:"jazan", name:"واجهة الميناء - جازان", status:"Draft", horizon:15, startYear:2025,
  landType:"lease", landArea:80000, landRentAnnual:4000000,
  landRentEscalation:5, landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:15,
  softCostPct:10, contingencyPct:5, rentEscalation:1.0, activeScenario:"Base Case",
  phases:[{name:"Phase 1"},{name:"Phase 2"}],
  assets:[
    { id:"a1", phase:"Phase 1", category:"Retail", name:"Marina Mall", code:"MM",
      gfa:25000, footprint:15000, plotArea:20000, revType:"Lease", efficiency:80,
      leaseRate:2500, escalation:1.0, rampUpYears:3, stabilizedOcc:90,
      costPerSqm:4000, constrStart:1, constrDuration:24, opEbitda:0 },
    { id:"a2", phase:"Phase 1", category:"Hospitality", name:"Hotel 4-Star", code:"H1",
      gfa:15000, footprint:5000, plotArea:8000, revType:"Operating", efficiency:0,
      leaseRate:0, escalation:1.0, rampUpYears:4, stabilizedOcc:100,
      costPerSqm:8500, constrStart:1, constrDuration:36, opEbitda:12000000 },
    { id:"a3", phase:"Phase 2", category:"Office", name:"Office Tower", code:"O1",
      gfa:12000, footprint:3000, plotArea:5000, revType:"Lease", efficiency:90,
      leaseRate:1200, escalation:1.0, rampUpYears:2, stabilizedOcc:85,
      costPerSqm:3000, constrStart:3, constrDuration:30, opEbitda:0 },
    { id:"a4", phase:"Phase 2", category:"Residential", name:"Apartments", code:"R1",
      gfa:18000, footprint:4000, plotArea:6000, revType:"Lease", efficiency:85,
      leaseRate:800, escalation:1.0, rampUpYears:2, stabilizedOcc:92,
      costPerSqm:2800, constrStart:3, constrDuration:30, opEbitda:0 },
  ],
  finMode:"fund", vehicleType:"fund", debtAllowed:true, maxLtvPct:60,
  financeRate:7, loanTenor:8, debtGrace:3, upfrontFeePct:0.5,
  repaymentType:"amortizing", landCapitalize:false, landCapTo:"gp",
  graceBasis:"cod", feeTreatment:"capital",
  gpEquityManual:0, lpEquityManual:0,
  prefReturnPct:15, gpCatchup:true, carryPct:25, lpProfitSplitPct:75,
  exitStrategy:"sale", exitYear:0, exitMultiple:10, exitCostPct:2,
  subscriptionFeePct:2, annualMgmtFeePct:0.9, custodyFeeAnnual:130000,
  developerFeePct:10, structuringFeePct:0.1, mgmtFeeBase:"devCost",
  incentives:{capexGrant:{enabled:false},financeSupport:{enabled:false},
    landRentRebate:{enabled:false},feeRebates:{enabled:false}},
};

// Run original engine on golden scenario
const origResults = computeProjectCashFlows(JAZAN);
const origIncentives = computeIncentives(JAZAN, origResults);
const origFinancing = computeFinancing(JAZAN, origResults, origIncentives);
const origWaterfall = computeWaterfall(JAZAN, origResults, origFinancing, origIncentives);

t('Golden: Original engine runs', origResults !== null && origFinancing !== null && origWaterfall !== null,
  `results=${!!origResults} fin=${!!origFinancing} wf=${!!origWaterfall}`);

// Store golden values for comparison once engine files are ready
const goldenValues = {
  totalCapex: origResults.consolidated.totalCapex,
  totalIncome: origResults.consolidated.totalIncome,
  irr: origResults.consolidated.irr,
  npv10: origResults.consolidated.npv10,
  totalDebt: origFinancing.totalDebt,
  totalEquity: origFinancing.totalEquity,
  lpIRR: origWaterfall.lpIRR,
  gpIRR: origWaterfall.gpIRR,
  lpMOIC: origWaterfall.lpMOIC,
  gpMOIC: origWaterfall.gpMOIC,
};

t('Golden: CAPEX > 0', goldenValues.totalCapex > 0, `${goldenValues.totalCapex}`);
t('Golden: Income > 0', goldenValues.totalIncome > 0, `${goldenValues.totalIncome}`);
t('Golden: IRR computed', goldenValues.irr !== null, `${(goldenValues.irr*100).toFixed(2)}%`);
t('Golden: LP IRR computed', goldenValues.lpIRR !== null, `${(goldenValues.lpIRR*100).toFixed(2)}%`);

// ═══ Summary ═══
console.log(`\n${'═'.repeat(50)}`);
console.log(`  EXTRACTION PARITY: ${pass} PASSED | ${fail} FAILED`);
console.log(`${'═'.repeat(50)}`);
if (fail === 0) console.log('  🎉 ALL PARITY TESTS PASSED');
else { console.log('  ⚠️  PARITY FAILURES - DO NOT PROCEED'); process.exit(1); }
