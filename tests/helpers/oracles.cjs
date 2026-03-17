/**
 * Independent Oracle Helpers — for zero-trust verification of ZAN engine.
 * Each oracle recomputes a result independently; never calls the engine.
 */

// ── Tolerances ──
const TOL = {
  MONEY_SMALL: 0.01, MONEY_LARGE: 1.00,
  PCT: 1e-9, IRR: 1e-6, NPV: 1e-6,
  ARR_SMALL: 0.01, ARR_LARGE: 1.00,
};

// ── NPV Oracle ──
function oracleNPV(cf, r) {
  let s = 0;
  for (let t = 0; t < cf.length; t++) s += cf[t] / Math.pow(1 + r, t);
  return s;
}

// ── IRR Oracle (bisection) ──
function oracleIRR(cf, lo = -0.5, hi = 5.0, maxIter = 200) {
  if (!cf.some(c => c < 0) || !cf.some(c => c > 0)) return null;
  const npvAt = r => oracleNPV(cf, r);
  if (npvAt(lo) * npvAt(hi) > 0) return null;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const nm = npvAt(mid);
    if (Math.abs(nm) < Math.max(1, cf.reduce((s,v)=>s+Math.abs(v),0) * 1e-10)) return mid;
    if (npvAt(lo) * nm < 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

// ── CAPEX Oracle ──
function oracleCapex(gfa, costPerSqm, softPct, contPct, scenarioMult) {
  return gfa * costPerSqm * (1 + softPct/100) * (1 + contPct/100) * scenarioMult;
}

// ── CAPEX Schedule Oracle ──
function oracleCapexSchedule(totalCapex, constrStart0, durYears, horizon, delayYears) {
  const sch = new Array(horizon).fill(0);
  const cStart = constrStart0 + delayYears;
  if (durYears > 0 && totalCapex > 0) {
    const ann = totalCapex / durYears;
    for (let y = cStart; y < cStart + durYears && y < horizon; y++) if (y >= 0) sch[y] = ann;
  }
  return sch;
}

// ── Lease Revenue Oracle ──
function oracleLeaseRevenue(gfa, eff, leaseRate, occ, ramp, escRate, constrStart0, durYears, horizon, delayYears) {
  const sch = new Array(horizon).fill(0);
  const revStart = constrStart0 + delayYears + durYears;
  const leasable = gfa * (eff / 100);
  for (let y = revStart; y < horizon; y++) {
    const yrs = y - revStart;
    sch[y] = leasable * leaseRate * (occ / 100) * Math.min(1, (yrs+1)/Math.max(1,ramp)) * Math.pow(1+escRate/100, yrs);
  }
  return sch;
}

// ── Land Rent Oracle ──
function oracleLandRent(base, grace, eN, ePct, term, horizon) {
  const sch = new Array(horizon).fill(0);
  const t = Math.min(term, horizon);
  for (let y = 0; y < t; y++) {
    if (y < grace) continue;
    sch[y] = base * Math.pow(1 + ePct/100, Math.floor((y - grace) / Math.max(1, eN)));
  }
  return sch;
}

// ── Debt Roll-Forward Oracle ──
function oracleDebtRollForward(drawdown, repayStart, repayYears, totalDrawn, rate, horizon, repayType) {
  const balOpen = new Array(horizon).fill(0);
  const balClose = new Array(horizon).fill(0);
  const repay = new Array(horizon).fill(0);
  const interest = new Array(horizon).fill(0);
  const annRepay = repayYears > 0 ? totalDrawn / repayYears : 0;
  for (let y = 0; y < horizon; y++) {
    balOpen[y] = y === 0 ? 0 : balClose[y - 1];
    let bal = balOpen[y] + drawdown[y];
    if (repayType === 'amortizing' && y >= repayStart && bal > 0) {
      repay[y] = Math.min(annRepay, bal);
    } else if (repayType === 'bullet' && y === repayStart + repayYears - 1 && bal > 0) {
      repay[y] = bal;
    }
    balClose[y] = bal - repay[y];
    interest[y] = Math.max(0, (balOpen[y] + 0.5 * drawdown[y] - 0.5 * repay[y]) * rate);
  }
  return { balOpen, balClose, repay, interest };
}

// ── Waterfall Tier Oracle ──
function oracleWaterfall(cashAvail, equityCalls, prefRate, carryPct, lpSplitPct, gpPct, lpPct, gpCatchup, t2LpOnly) {
  const h = cashAvail.length;
  const tier1=new Array(h).fill(0), tier2=new Array(h).fill(0), tier3=new Array(h).fill(0);
  const tier4LP=new Array(h).fill(0), tier4GP=new Array(h).fill(0);
  const lpDist=new Array(h).fill(0), gpDist=new Array(h).fill(0);
  let cumEqCalled=0, cumReturned=0, cumPrefPaid=0, cumPrefAccrued=0, cumGPCatchup=0;
  for (let y=0; y<h; y++) {
    cumEqCalled += equityCalls[y];
    const unreturned = cumEqCalled - cumReturned;
    cumPrefAccrued += unreturned * prefRate;
    let rem = cashAvail[y];
    if (rem <= 0) continue;
    // T1: ROC
    if (unreturned > 0) { const t1 = Math.min(rem, unreturned); tier1[y]=t1; rem-=t1; cumReturned+=t1; }
    // T2: Pref
    const prefOwed = cumPrefAccrued - cumPrefPaid;
    if (prefOwed > 0 && rem > 0) { const t2 = Math.min(rem, prefOwed); tier2[y]=t2; rem-=t2; cumPrefPaid+=t2; }
    // T3: Catch-up
    if (gpCatchup && rem > 0 && carryPct > 0) {
      const target = cumPrefPaid * carryPct / (1-carryPct);
      const needed = Math.max(0, target - cumGPCatchup);
      const cu = Math.min(rem, needed); tier3[y]=cu; rem-=cu; cumGPCatchup+=cu;
    }
    // T4: Split
    if (rem > 0) { tier4LP[y] = rem * lpSplitPct; tier4GP[y] = rem * (1-lpSplitPct); }
    // Distribute (Option A: T2 LP-only)
    if (t2LpOnly) {
      lpDist[y] = tier1[y]*lpPct + tier2[y] + tier4LP[y];
      gpDist[y] = tier1[y]*gpPct + tier3[y] + tier4GP[y];
    } else {
      lpDist[y] = (tier1[y]+tier2[y])*lpPct + tier4LP[y];
      gpDist[y] = (tier1[y]+tier2[y])*gpPct + tier3[y] + tier4GP[y];
    }
  }
  return { tier1,tier2,tier3,tier4LP,tier4GP,lpDist,gpDist };
}

// ── Reconcile Helpers ──
function arrClose(a, b, tol) {
  if (a.length !== b.length) return { ok: false, msg: `Length mismatch: ${a.length} vs ${b.length}` };
  for (let i = 0; i < a.length; i++) {
    if (Math.abs((a[i]||0) - (b[i]||0)) > tol) return { ok: false, msg: `Index ${i}: ${a[i]} vs ${b[i]}, diff=${Math.abs(a[i]-b[i])}` };
  }
  return { ok: true };
}

function near(a, b, tol) { return Math.abs((a||0) - (b||0)) <= tol; }

module.exports = { TOL, oracleNPV, oracleIRR, oracleCapex, oracleCapexSchedule, oracleLeaseRevenue, oracleLandRent, oracleDebtRollForward, oracleWaterfall, arrClose, near };
