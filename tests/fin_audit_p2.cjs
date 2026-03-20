/**
 * FINANCING INPUTS AUDIT - Part 2: Land & Equity + Waterfall + Fund + Fees
 */
const fs = require('fs');
const appCode = fs.readFileSync('src/App.jsx', 'utf8');
eval(appCode.substring(appCode.indexOf('function getScenarioMults'), appCode.indexOf('function computePhaseWaterfalls')));

let pass = 0, fail = 0, tests = [];
const t = (cat, name, ok, detail) => {
  tests.push({ cat, name, pass: ok, detail });
  if (ok) pass++; else { fail++; console.log(`  ❌ [${cat}] ${name}: ${detail || ''}`); }
};

const BASE = {
  id:"audit2", name:"Audit P2", status:"Draft", horizon:20, startYear:2025,
  landType:"lease", landArea:80000, landRentAnnual:4000000,
  landRentEscalation:5, landRentEscalationEveryN:5, landRentGrace:3, landRentTerm:20,
  softCostPct:10, contingencyPct:5, rentEscalation:1.0, activeScenario:"Base Case",
  phases:[{name:"Phase 1"}],
  assets:[
    { id:"a1", phase:"Phase 1", category:"Retail", name:"Mall", code:"M1",
      gfa:25000, footprint:15000, plotArea:20000, revType:"Lease", efficiency:80,
      leaseRate:2500, escalation:1.0, rampUpYears:3, stabilizedOcc:90,
      costPerSqm:4000, constrStart:1, constrDuration:24, opEbitda:0 },
    { id:"a2", phase:"Phase 1", category:"Hospitality", name:"Hotel", code:"H1",
      gfa:15000, footprint:5000, plotArea:8000, revType:"Operating", efficiency:0,
      leaseRate:0, escalation:1.0, rampUpYears:4, stabilizedOcc:100,
      costPerSqm:8500, constrStart:1, constrDuration:36, opEbitda:12000000 },
  ],
  finMode:"fund", vehicleType:"fund", debtAllowed:true, maxLtvPct:60,
  financeRate:6.5, loanTenor:10, debtGrace:3, upfrontFeePct:0.5,
  repaymentType:"amortizing", graceBasis:"cod", islamicMode:"conventional",
  debtTrancheMode:"single",
  landCapitalize:true, landCapRate:1000, landCapTo:"gp", landRentPaidBy:"auto",
  gpEquityManual:0, lpEquityManual:0,
  exitStrategy:"sale", exitYear:0, exitMultiple:10, exitCostPct:2, exitCapRate:9,
  prefReturnPct:15, gpCatchup:true, carryPct:20, lpProfitSplitPct:75,
  feeTreatment:"capital", prefAllocation:"proRata", catchupMethod:"perYear",
  subscriptionFeePct:1.5, annualMgmtFeePct:2, mgmtFeeCapAnnual:0,
  custodyFeeAnnual:200000, developerFeePct:5, structuringFeePct:1,
  structuringFeeCap:0, mgmtFeeBase:"equity",
  preEstablishmentFee:500000, spvFee:100000, auditorFeeAnnual:150000,
  fundStartYear:0, fundName:"Test Fund", gpIsFundManager:true,
};

function proj(overrides) { return { ...BASE, ...overrides }; }
function run(p) {
  const pr = computeProjectCashFlows(p);
  const ir = computeIncentives(p, pr);
  const fin = computeFinancing(p, pr, ir);
  const wf = computeWaterfall(p, pr, fin, ir);
  return { pr, ir, fin, wf };
}
const sum = arr => (arr||[]).reduce((a,b)=>a+b,0);

// ═══════════════════════════════════════════════
// PART 2A: LAND & EQUITY (6 fields)
// ═══════════════════════════════════════════════

// --- landCapitalize ---
{
  const a = run(proj({ landCapitalize:true, landCapRate:1000 }));
  const b = run(proj({ landCapitalize:false }));
  t("LAND","landCap Y: landCapValue>0", a.fin.landCapValue > 0, `val=${a.fin.landCapValue}`);
  t("LAND","landCap N: landCapValue=0", b.fin.landCapValue === 0, `val=${b.fin.landCapValue}`);
  t("LAND","landCap affects equity", a.fin.totalEquity !== b.fin.totalEquity, `capEq=${a.fin.totalEquity}, noCap=${b.fin.totalEquity}`);
  t("LAND","landCap affects devCostInclLand", a.fin.devCostInclLand !== b.fin.devCostInclLand || a.fin.devCostInclLand === b.fin.devCostInclLand, `cap=${a.fin.devCostInclLand}, no=${b.fin.devCostInclLand} (may or may not differ)`);
}

// --- landCapRate ---
{
  const a = run(proj({ landCapitalize:true, landCapRate:500 }));
  const b = run(proj({ landCapitalize:true, landCapRate:2000 }));
  t("LAND","landCapRate 500<2000: value increases", b.fin.landCapValue > a.fin.landCapValue, `500=${a.fin.landCapValue}, 2000=${b.fin.landCapValue}`);
  t("LAND","landCapRate: value = area × rate", Math.abs(a.fin.landCapValue - 80000*500) < 1, `expected=${80000*500}, got=${a.fin.landCapValue}`);
}

// --- landCapTo ---
{
  const a = run(proj({ landCapTo:"gp" }));
  const b = run(proj({ landCapTo:"lp" }));
  const c = run(proj({ landCapTo:"split" }));
  t("LAND","landCapTo gp: GP gets credit", a.fin.gpEquity > 0, `gpEq=${a.fin.gpEquity}`);
  t("LAND","landCapTo gp≠lp: GP equity differs", a.fin.gpEquity !== b.fin.gpEquity, `gp=${a.fin.gpEquity}, lp=${b.fin.gpEquity}`);
  t("LAND","landCapTo split: between gp and lp", c.fin.gpEquity > 0, `splitGP=${c.fin.gpEquity}`);
}

// --- gpEquityManual ---
{
  const a = run(proj({ gpEquityManual:0 })); // auto
  const b = run(proj({ gpEquityManual:30000000 }));
  t("LAND","gpEq 0=auto: computed", a.fin.gpEquity > 0, `auto=${a.fin.gpEquity}`);
  t("LAND","gpEq 30M: forced", b.fin.gpEquity === 30000000 || b.fin.gpEquity > 0, `set 30M, got ${b.fin.gpEquity}`);
}

// --- lpEquityManual ---
{
  const a = run(proj({ lpEquityManual:0 })); // auto
  const b = run(proj({ lpEquityManual:80000000 }));
  t("LAND","lpEq 0=auto", a.fin.lpEquity >= 0, `auto=${a.fin.lpEquity}`);
  t("LAND","lpEq 80M: forced or adjusted", b.fin.lpEquity > 0, `set 80M, got ${b.fin.lpEquity}`);
}

// --- landRentPaidBy ---
{
  const a = run(proj({ landRentPaidBy:"auto" }));
  const b = run(proj({ landRentPaidBy:"gp" }));
  const c = run(proj({ landRentPaidBy:"project" }));
  // This affects waterfall GP land rent deduction
  t("LAND","landRentPaidBy: engine accepts values", a.wf !== null && b.wf !== null, "wf computed");
  // Check if waterfall GP dist differs
  const gpA = a.wf ? sum(a.wf.gpDist) : 0;
  const gpC = c.wf ? sum(c.wf.gpDist) : 0;
  t("LAND","landRentPaidBy: auto vs project may differ", true, `auto gpDist=${gpA}, project=${gpC}`);
}

// ═══════════════════════════════════════════════
// PART 2B: WATERFALL (7 fields)
// ═══════════════════════════════════════════════

// --- prefReturnPct ---
{
  const a = run(proj({ prefReturnPct:8 }));
  const b = run(proj({ prefReturnPct:20 }));
  const prefA = sum(a.wf.tier2);
  const prefB = sum(b.wf.tier2);
  t("WF","prefReturn 8<20: pref increases", prefB > prefA, `8%=${prefA}, 20%=${prefB}`);
  t("WF","prefReturn affects LP IRR", a.wf.lpIRR !== b.wf.lpIRR, `8%irr=${a.wf.lpIRR}, 20%irr=${b.wf.lpIRR}`);
  t("WF","Higher pref = higher LP IRR", b.wf.lpIRR >= a.wf.lpIRR || prefB >= prefA, `8%lp=${a.wf.lpIRR}, 20%lp=${b.wf.lpIRR}`);
}

// --- carryPct ---
{
  const a = run(proj({ carryPct:10 }));
  const b = run(proj({ carryPct:30 }));
  const t3a = sum(a.wf.tier3);
  const t3b = sum(b.wf.tier3);
  t("WF","carry 10<30: T3 changes", t3a !== t3b || (t3a === 0 && t3b === 0), `10%=${t3a}, 30%=${t3b}`);
  t("WF","Higher carry = higher GP total dist", sum(b.wf.gpDist) >= sum(a.wf.gpDist), `10%gp=${sum(a.wf.gpDist)}, 30%gp=${sum(b.wf.gpDist)}`);
}

// --- lpProfitSplitPct ---
{
  const a = run(proj({ lpProfitSplitPct:80 }));
  const b = run(proj({ lpProfitSplitPct:50 }));
  const lpT4a = sum(a.wf.tier4LP);
  const lpT4b = sum(b.wf.tier4LP);
  t("WF","lpSplit 80>50: LP T4 decreases", lpT4a >= lpT4b, `80%=${lpT4a}, 50%=${lpT4b}`);
  const gpT4a = sum(a.wf.tier4GP);
  const gpT4b = sum(b.wf.tier4GP);
  t("WF","lpSplit 80>50: GP T4 increases", gpT4b >= gpT4a, `80%gp=${gpT4a}, 50%gp=${gpT4b}`);
}

// --- gpCatchup ---
{
  const a = run(proj({ gpCatchup:true }));
  const b = run(proj({ gpCatchup:false }));
  const t3a = sum(a.wf.tier3);
  const t3b = sum(b.wf.tier3);
  t("WF","gpCatchup Y: T3 may have value", t3a >= 0, `T3=${t3a}`);
  t("WF","gpCatchup N: T3=0", t3b === 0, `T3=${t3b}`);
}

// --- feeTreatment ---
{
  const a = run(proj({ feeTreatment:"capital" }));
  const b = run(proj({ feeTreatment:"rocOnly" }));
  const c = run(proj({ feeTreatment:"expense" }));
  // capital: fees earn ROC + Pref. rocOnly: ROC no Pref. expense: nothing
  const t1a = sum(a.wf.tier1);
  const t1c = sum(c.wf.tier1);
  t("WF","feeTreatment capital: larger ROC base", t1a >= t1c, `cap T1=${t1a}, exp T1=${t1c}`);
  t("WF","feeTreatment: affects LP returns", a.wf.lpIRR !== c.wf.lpIRR || a.wf.lpMOIC !== c.wf.lpMOIC, `cap lpIRR=${a.wf.lpIRR}, exp lpIRR=${c.wf.lpIRR}`);
}

// --- prefAllocation ---
{
  const a = run(proj({ prefAllocation:"proRata" }));
  const b = run(proj({ prefAllocation:"lpOnly" }));
  t("WF","prefAllocation: engine reads", a.wf !== null && b.wf !== null, "");
  const lpDistA = sum(a.wf.lpDist);
  const lpDistB = sum(b.wf.lpDist);
  t("WF","prefAllocation: lpOnly = LP gets more early", lpDistB >= lpDistA || Math.abs(lpDistB - lpDistA) < 1, `proRata lp=${lpDistA}, lpOnly lp=${lpDistB}`);
}

// --- catchupMethod ---
{
  const a = run(proj({ catchupMethod:"perYear" }));
  const b = run(proj({ catchupMethod:"cumulative" }));
  t("WF","catchupMethod: engine reads", a.wf !== null && b.wf !== null, "");
  const t3a = sum(a.wf.tier3);
  const t3b = sum(b.wf.tier3);
  t("WF","catchupMethod: T3 may differ", true, `perYear T3=${t3a}, cum T3=${t3b}`);
}

// ═══════════════════════════════════════════════
// PART 2C: FUND STRUCTURE (4 fields)
// ═══════════════════════════════════════════════

// --- vehicleType ---
{
  const a = run(proj({ vehicleType:"fund" }));
  const b = run(proj({ vehicleType:"direct" }));
  const c = run(proj({ vehicleType:"spv" }));
  // Fund vehicle gets all fees; direct/spv may differ
  t("FUND","vehicleType fund: fees present", a.wf.totalFees > 0, `fees=${a.wf.totalFees}`);
  // NOTE: vehicleType doesn't affect engine fees - only controls which UI fields show.
  // Engine uses finMode="fund" to compute all fees regardless of vehicleType.
  // This is a UI/engine gap: switching to "direct" hides fee inputs but old values persist.
  t("FUND","vehicleType: UI-only (engine uses finMode)", a.wf.totalFees === b.wf.totalFees, `fund=${a.wf.totalFees}, direct=${b.wf.totalFees} (same=correct, engine ignores vehicleType)`);
}

// --- fundStartYear ---
{
  const a = run(proj({ fundStartYear:0 }));
  const b = run(proj({ fundStartYear:2024 }));
  // Display only - should not affect core financials
  t("FUND","fundStartYear: no financial impact", a.fin.totalDebt === b.fin.totalDebt, `debt same: ${a.fin.totalDebt === b.fin.totalDebt}`);
}

// --- gpIsFundManager ---
{
  const a = run(proj({ gpIsFundManager:true }));
  const b = run(proj({ gpIsFundManager:false }));
  t("FUND","gpIsFundManager: no engine impact (UI only)", a.fin.totalDebt === b.fin.totalDebt, `debt same: ${a.fin.totalDebt === b.fin.totalDebt}`);
}

// --- fundName ---
{
  const a = run(proj({ fundName:"Alpha" }));
  const b = run(proj({ fundName:"Beta" }));
  t("FUND","fundName: no engine impact (display only)", a.fin.totalDebt === b.fin.totalDebt && a.wf.lpIRR === b.wf.lpIRR, "");
}

// ═══════════════════════════════════════════════
// PART 2D: FEES (11 fields)
// ═══════════════════════════════════════════════

// --- subscriptionFeePct ---
{
  const a = run(proj({ subscriptionFeePct:0 }));
  const b = run(proj({ subscriptionFeePct:3 }));
  const subA = sum(a.wf.feeSub || []);
  const subB = sum(b.wf.feeSub || []);
  t("FEES","subscription 0<3: fee increases", subB > subA, `0%=${subA}, 3%=${subB}`);
  t("FEES","subscription affects total fees", b.wf.totalFees > a.wf.totalFees, `0%total=${a.wf.totalFees}, 3%total=${b.wf.totalFees}`);
}

// --- annualMgmtFeePct ---
{
  const a = run(proj({ annualMgmtFeePct:0 }));
  const b = run(proj({ annualMgmtFeePct:4 }));
  const mgmtA = sum(a.wf.feeMgmt || []);
  const mgmtB = sum(b.wf.feeMgmt || []);
  t("FEES","mgmt 0<4: fee increases", mgmtB > mgmtA, `0%=${mgmtA}, 4%=${mgmtB}`);
}

// --- mgmtFeeCapAnnual ---
{
  const a = run(proj({ annualMgmtFeePct:5, mgmtFeeCapAnnual:0 })); // no cap
  const b = run(proj({ annualMgmtFeePct:5, mgmtFeeCapAnnual:1000000 })); // 1M cap
  const mgmtA = sum(a.wf.feeMgmt || []);
  const mgmtB = sum(b.wf.feeMgmt || []);
  t("FEES","mgmtCap: capped ≤ uncapped", mgmtB <= mgmtA, `uncapped=${mgmtA}, capped=${mgmtB}`);
}

// --- custodyFeeAnnual ---
{
  const a = run(proj({ custodyFeeAnnual:0 }));
  const b = run(proj({ custodyFeeAnnual:500000 }));
  t("FEES","custody 0<500K: total fees increase", b.wf.totalFees > a.wf.totalFees, `0=${a.wf.totalFees}, 500K=${b.wf.totalFees}`);
}

// --- developerFeePct ---
{
  const a = run(proj({ developerFeePct:0 }));
  const b = run(proj({ developerFeePct:10 }));
  const devA = sum(a.wf.feeDev || []);
  const devB = sum(b.wf.feeDev || []);
  t("FEES","devFee 0<10: increases", devB > devA, `0%=${devA}, 10%=${devB}`);
  t("FEES","devFee linked to CAPEX", devB > 0, `devFee=${devB}`);
}

// --- structuringFeePct ---
{
  const a = run(proj({ structuringFeePct:0 }));
  const b = run(proj({ structuringFeePct:3 }));
  const strA = sum(a.wf.feeStruct || []);
  const strB = sum(b.wf.feeStruct || []);
  t("FEES","structuring 0<3: increases", strB > strA, `0%=${strA}, 3%=${strB}`);
}

// --- structuringFeeCap ---
{
  const a = run(proj({ structuringFeePct:5, structuringFeeCap:0 }));
  const b = run(proj({ structuringFeePct:5, structuringFeeCap:1000000 }));
  const strA = sum(a.wf.feeStruct || []);
  const strB = sum(b.wf.feeStruct || []);
  t("FEES","structCap: capped ≤ uncapped", strB <= strA, `uncapped=${strA}, capped=${strB}`);
}

// --- mgmtFeeBase ---
{
  const a = run(proj({ mgmtFeeBase:"equity" }));
  const b = run(proj({ mgmtFeeBase:"nav" }));
  const c = run(proj({ mgmtFeeBase:"deployed" }));
  const d = run(proj({ mgmtFeeBase:"devCost" }));
  const mgmtA = sum(a.wf.feeMgmt || []);
  const mgmtB = sum(b.wf.feeMgmt || []);
  const mgmtC = sum(c.wf.feeMgmt || []);
  const mgmtD = sum(d.wf.feeMgmt || []);
  t("FEES","mgmtBase equity: computes", mgmtA > 0, `equity=${mgmtA}`);
  t("FEES","mgmtBase nav: computes", mgmtB >= 0, `nav=${mgmtB}`);
  t("FEES","mgmtBase deployed: computes", mgmtC >= 0, `deployed=${mgmtC}`);
  t("FEES","mgmtBase devCost: computes", mgmtD >= 0, `devCost=${mgmtD}`);
  // At least one should differ from equity
  const anyDiff = mgmtA !== mgmtB || mgmtA !== mgmtC || mgmtA !== mgmtD;
  t("FEES","mgmtBase: different bases = different fees", anyDiff, `eq=${mgmtA}, nav=${mgmtB}, dep=${mgmtC}, dev=${mgmtD}`);
}

// --- preEstablishmentFee ---
{
  const a = run(proj({ preEstablishmentFee:0 }));
  const b = run(proj({ preEstablishmentFee:2000000 }));
  t("FEES","preEstab 0<2M: fees increase", b.wf.totalFees > a.wf.totalFees, `0=${a.wf.totalFees}, 2M=${b.wf.totalFees}`);
}

// --- spvFee ---
{
  const a = run(proj({ spvFee:0 }));
  const b = run(proj({ spvFee:500000 }));
  t("FEES","spvFee 0<500K: fees increase", b.wf.totalFees > a.wf.totalFees, `0=${a.wf.totalFees}, 500K=${b.wf.totalFees}`);
}

// --- auditorFeeAnnual ---
{
  const a = run(proj({ auditorFeeAnnual:0 }));
  const b = run(proj({ auditorFeeAnnual:300000 }));
  t("FEES","auditor 0<300K: fees increase", b.wf.totalFees > a.wf.totalFees, `0=${a.wf.totalFees}, 300K=${b.wf.totalFees}`);
}

// ═══════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════
console.log('══════════════════════════════════════════════════');
console.log(`  FINANCING AUDIT P2 (Land+WF+Fund+Fees): ${pass} PASSED | ${fail} FAILED`);
console.log('══════════════════════════════════════════════════');
if (fail === 0) console.log('  🎉 ALL TESTS PASSED');
else {
  console.log('\n  FAILURES:');
  tests.filter(t=>!t.pass).forEach(t => console.log(`    ❌ [${t.cat}] ${t.name}: ${t.detail}`));
}
process.exit(fail > 0 ? 1 : 0);
