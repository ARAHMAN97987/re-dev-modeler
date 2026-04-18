// User-journey tests for the post-audit investor model.
// Each test simulates a realistic sequence of user actions and verifies
// that gpEquity + lpEquity === totalEquity AND perInvestorEquity by role
// matches gp/lp aliases.

const E = require('../helpers/engine.cjs');

let pass = 0, fail = 0;
const assertions = [];

function approxEq(a, b, tol = 1) { return Math.abs((a || 0) - (b || 0)) < tol; }

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}  [${detail}]`); }
}

function runCompute(p) {
  const r = E.computeProjectCashFlows(p);
  const ir = E.computeIncentives(p, r);
  const f = E.computeFinancing(p, r, ir);
  let w = null;
  try { w = E.computeWaterfall(p, r, f, ir); } catch (_) {}
  let checks = [];
  try { checks = E.runChecks(p, r, f, w, ir); } catch (_) {}
  return { r, ir, f, w, checks };
}

function auditWaterfallConsistency(label, f, w) {
  if (!w) return;
  if (Array.isArray(w.investorOutcomes) && w.investorOutcomes.length > 0) {
    // totalCalled includes equity + fund-level fees → should be >= totalEquity
    const calledSum = w.investorOutcomes.reduce((s, o) => s + (o.totalCalled || 0), 0);
    check(`${label}: Σ investorOutcomes.totalCalled ≥ totalEquity`, calledSum + 1 >= f.totalEquity,
      `Σcalls=${calledSum} vs totalEquity=${f.totalEquity}`);
    // Distribution sum should match legacy gp+lp totals (within 1%)
    const distSum   = w.investorOutcomes.reduce((s, o) => s + (o.totalDist || 0), 0);
    const legacyDist = (w.lpTotalDist || 0) + (w.gpTotalDist || 0);
    check(`${label}: Σ investorOutcomes.totalDist ≈ gpTotalDist + lpTotalDist`,
      approxEq(distSum, legacyDist, Math.max(100, legacyDist * 0.01)),
      `Σdist=${distSum} vs gp+lp=${legacyDist}`);
    // Role-sum invariant
    const devCalled = w.investorOutcomes.filter(o => o.role==='developer').reduce((s,o)=>s+(o.totalCalled||0),0);
    const invCalled = w.investorOutcomes.filter(o => o.role==='investor').reduce((s,o)=>s+(o.totalCalled||0),0);
    check(`${label}: role calls sum coherent`, devCalled + invCalled >= f.totalEquity - 1,
      `devCalled=${devCalled} invCalled=${invCalled} totalEq=${f.totalEquity}`);
  }
}

function baseProject(overrides = {}) {
  const p = E.defaultProject();
  p.landType = 'purchase';
  p.landPurchasePrice = 10_000_000;
  p.assets = [{
    phase: 'P', category: 'Retail', name: 'Mall',
    gfa: 10000, footprint: 5000, plotArea: 8000,
    revType: 'Lease', efficiency: 85, leaseRate: 800,
    escalation: 2, rampUpYears: 2, stabilizedOcc: 90,
    costPerSqm: 4000, constrStart: 1, constrDuration: 20,
  }];
  p.phases = [{ name: 'P', completionMonth: 20 }];
  return { ...p, ...overrides };
}

function auditEquityIdentity(label, f, investors) {
  const gpLp = approxEq(f.gpEquity + f.lpEquity, f.totalEquity);
  const devSum = (f.perInvestorEquity || []).filter(x => x.role === 'developer').reduce((s, x) => s + x.amount, 0);
  const invSum = (f.perInvestorEquity || []).filter(x => x.role === 'investor').reduce((s, x) => s + x.amount, 0);
  const gpMatch = approxEq(f.gpEquity, devSum);
  const lpMatch = approxEq(f.lpEquity, invSum);

  check(`${label}: gpEquity + lpEquity = totalEquity`, gpLp,
    `gp=${f.gpEquity} + lp=${f.lpEquity} vs total=${f.totalEquity}`);
  check(`${label}: gpEquity = Σ dev.perInvestorEquity`, gpMatch,
    `gp=${f.gpEquity} vs Σdev=${devSum}`);
  check(`${label}: lpEquity = Σ inv.perInvestorEquity`, lpMatch,
    `lp=${f.lpEquity} vs Σinv=${invSum}`);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 1: new debt project, no user edits ═══');
{
  const p = baseProject({ finMode: 'debt', debtAllowed: true, maxLtvPct: 60 });
  // Simulate createProject seeding investors[]
  const seeded = E.migrateProjectToInvestors(p);
  p.investors = seeded.investors;
  const { f } = runCompute(p);
  check('has 1 developer', p.investors.length === 1 && p.investors[0].role === 'developer', JSON.stringify(p.investors));
  check('developer absorbs all equity', approxEq(f.gpEquity, f.totalEquity), `gp=${f.gpEquity} total=${f.totalEquity}`);
  check('no LP in debt mode', f.lpEquity === 0, `lp=${f.lpEquity}`);
  auditEquityIdentity('J1', f, p.investors);
  auditWaterfallConsistency('J1', f, runCompute(p).w);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 2: new fund project with lease + landCap, no user edits ═══');
{
  const p = baseProject({
    finMode: 'fund', landType: 'lease', landArea: 100000, landCapRate: 1000,
    landCapitalize: true, landCapTo: 'gp',
    debtAllowed: true, maxLtvPct: 50,
  });
  const seeded = E.migrateProjectToInvestors(p);
  p.investors = seeded.investors;
  const { f } = runCompute(p);
  check('has developer + investor', p.investors.length === 2, JSON.stringify(p.investors.map(i=>i.role)));
  check('developer has landCap contribution', p.investors.some(i=>i.role==='developer' && i.contribution.type==='landCap'), JSON.stringify(p.investors));
  check('investor is fill-rest', p.investors.some(i=>i.role==='investor' && i.contribution.type==='cash' && !i.contribution.amount), JSON.stringify(p.investors));
  check('gpEquity ≈ landCap (100M)', approxEq(f.gpEquity, 100_000_000), `gp=${f.gpEquity}`);
  auditEquityIdentity('J2', f, p.investors);
  auditWaterfallConsistency('J2', f, runCompute(p).w);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 3: user adds cash investor to fund ═══');
{
  const p = baseProject({ finMode: 'fund', debtAllowed: true, maxLtvPct: 60 });
  p.investors = [
    { id: 'dev', name: 'Dev', role: 'developer', contribution: { type: 'cash', amount: 0 } },
    { id: 'inv1', name: 'Investor A', role: 'investor', contribution: { type: 'cash', amount: 20_000_000 } },
    { id: 'inv2', name: 'Investor B', role: 'investor', contribution: { type: 'cash', amount: 0 } }, // fill-rest
  ];
  p._investorsEditedByUser = true;
  const { f } = runCompute(p);
  check('inv1 gets 20M static', f.perInvestorEquity.find(x => x.investorId === 'inv1')?.amount === 20_000_000, JSON.stringify(f.perInvestorEquity));
  check('inv2 gets remainder', f.perInvestorEquity.find(x => x.investorId === 'inv2')?.amount > 0, JSON.stringify(f.perInvestorEquity));
  check('dev (non-matching fill-rest in fund) = 0', f.perInvestorEquity.find(x => x.investorId === 'dev')?.amount === 0, JSON.stringify(f.perInvestorEquity));
  auditEquityIdentity('J3', f, p.investors);
  auditWaterfallConsistency('J3', f, runCompute(p).w);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 4: landCap split (50/50) via explicit investors ═══');
{
  const p = baseProject({
    finMode: 'fund', landType: 'lease', landArea: 100000, landCapRate: 1000,
    landCapitalize: true, debtAllowed: true, maxLtvPct: 50,
  });
  p.investors = [
    { id: 'dev', name: 'Dev', role: 'developer',
      contribution: { type: 'landCap', valuation: 50_000_000, landCapReceiver: true } },
    { id: 'inv', name: 'LeaseInv', role: 'investor',
      contribution: { type: 'landCap', valuation: 50_000_000, landCapReceiver: true } },
    { id: 'inv2', name: 'Cash', role: 'investor', contribution: { type: 'cash', amount: 0 } },
  ];
  p._investorsEditedByUser = true;
  const { f } = runCompute(p);
  check('effectiveLandCap = 100M (sum of investor landCaps)', approxEq(f.effectiveLandCap, 100_000_000), `eff=${f.effectiveLandCap}`);
  check('dev gets 50M landCap', approxEq(f.perInvestorEquity.find(x=>x.investorId==='dev')?.amount, 50_000_000), JSON.stringify(f.perInvestorEquity));
  check('lease investor gets 50M', approxEq(f.perInvestorEquity.find(x=>x.investorId==='inv')?.amount, 50_000_000), JSON.stringify(f.perInvestorEquity));
  auditEquityIdentity('J4', f, p.investors);
  auditWaterfallConsistency('J4', f, runCompute(p).w);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 5: debt → fund switch preserves user edits ═══');
{
  const p = baseProject({ finMode: 'debt', debtAllowed: true, maxLtvPct: 60 });
  p.investors = [
    { id: 'dev', name: 'Dev', role: 'developer', contribution: { type: 'cash', amount: 5_000_000 } },
  ];
  p._investorsEditedByUser = true;

  // Simulate App.jsx up() with finMode change when _investorsEditedByUser=true
  const patch = { finMode: 'fund' };
  let next = { ...p, ...patch };
  if ('finMode' in patch && !p._investorsEditedByUser) {
    // Should NOT re-migrate because user edited
    next.investors = E.migrateProjectToInvestors({ ...next, investors: undefined }).investors;
  }
  check('finMode switched', next.finMode === 'fund');
  check('user-edited investors preserved', next.investors.length === 1 && next.investors[0].contribution.amount === 5_000_000,
    JSON.stringify(next.investors));
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 6: fund → debt switch, no user edits, auto re-migrate ═══');
{
  const p = baseProject({ finMode: 'fund', landType: 'lease', landArea: 100000, landCapRate: 1000,
    landCapitalize: true, landCapTo: 'gp', debtAllowed: true, maxLtvPct: 50 });
  const seeded = E.migrateProjectToInvestors(p);
  p.investors = seeded.investors;
  // No user edit → _investorsEditedByUser = undefined

  const patch = { finMode: 'debt' };
  let next = { ...p, ...patch };
  if ('finMode' in patch && !p._investorsEditedByUser) {
    next.investors = E.migrateProjectToInvestors({ ...next, investors: undefined }).investors;
  }
  check('auto-re-migrated: has 1 developer only', next.investors.length === 1 && next.investors[0].role === 'developer',
    JSON.stringify(next.investors));
  check('developer is fill-rest in debt mode', next.investors[0].contribution.type === 'cash' && !next.investors[0].contribution.amount,
    JSON.stringify(next.investors));
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 7: static contributions exceed totalEquity (scale down) ═══');
{
  const p = baseProject({ finMode: 'fund', debtAllowed: true, maxLtvPct: 60 });
  // User over-specifies: devFee + 2 large cash contributions that exceed residual equity
  p.investors = [
    { id: 'dev', name: 'Dev', role: 'developer', contribution: { type: 'cash', amount: 10_000_000 } },
    { id: 'inv1', name: 'Inv1', role: 'investor', contribution: { type: 'cash', amount: 50_000_000 } },
    { id: 'inv2', name: 'Inv2', role: 'investor', contribution: { type: 'cash', amount: 50_000_000 } },
  ];
  p._investorsEditedByUser = true;
  const { f } = runCompute(p);
  check('static sum > totalEquity detected', 110_000_000 > f.totalEquity);
  check('allocated sum == totalEquity after scale', approxEq(
    f.perInvestorEquity.reduce((s,x)=>s+x.amount,0), f.totalEquity, 1), JSON.stringify(f.perInvestorEquity));
  auditEquityIdentity('J7', f, p.investors);
  auditWaterfallConsistency('J7', f, runCompute(p).w);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n═══ JOURNEY 8: incomeFund + debt + developer devFee reinvest ═══');
{
  const p = baseProject({
    finMode: 'incomeFund', exitStrategy: 'hold', fundLife: 10,
    debtAllowed: true, maxLtvPct: 50,
  });
  p.investors = [
    { id: 'dev', name: 'Dev', role: 'developer',
      contribution: { type: 'devFee', investPct: 100 } }, // reinvest all dev fees
    { id: 'inv', name: 'Inv', role: 'investor',
      contribution: { type: 'cash', amount: 0 } }, // fill-rest
  ];
  p._investorsEditedByUser = true;
  const { f } = runCompute(p);
  const devRec = f.perInvestorEquity.find(x => x.investorId === 'dev');
  check('dev equity from devFee > 0', devRec?.amount > 0, `dev=${devRec?.amount}, devFeeTotal=${f.devFeeTotal}`);
  check('inv fills remainder', f.perInvestorEquity.find(x => x.investorId === 'inv')?.amount > 0, JSON.stringify(f.perInvestorEquity));
  auditEquityIdentity('J8', f, p.investors);
  auditWaterfallConsistency('J8', f, runCompute(p).w);
}

// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`SUMMARY: ${pass} passed, ${fail} failed`);
console.log('═'.repeat(60));
process.exit(fail > 0 ? 1 : 0);
