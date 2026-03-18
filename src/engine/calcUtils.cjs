/**
 * ZAN Engine — Calculation Utilities (Layer 0)
 * Pure math: IRR (Newton-Raphson + bisection fallback), NPV.
 * Zero dependencies. Zero side effects.
 *
 * Source: App.jsx lines 808-832 (exact copy, no modifications)
 */

function calcIRR(cf, guess = 0.1, maxIter = 200, tol = 1e-7) {
  if (!cf || cf.length < 2) return null;
  const hasNeg = cf.some(c => c < 0);
  const hasPos = cf.some(c => c > 0);
  if (!hasNeg || !hasPos) return null;
  let r = guess;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cf.length; t++) {
      const d = Math.pow(1 + r, t);
      npv += cf[t] / d;
      dnpv -= t * cf[t] / (d * (1 + r));
    }
    if (Math.abs(npv) < tol) return r;
    if (Math.abs(dnpv) < 1e-20) break;
    const nr = r - npv / dnpv;
    if (Math.abs(nr - r) < tol) return nr;
    r = nr;
    if (r < -0.99) r = -0.5;
    if (r > 10) r = 5;
  }
  // Bisection fallback
  let lo = -0.5, hi = 5.0;
  const npvAt = rate => cf.reduce((s, v, t) => s + v / Math.pow(1 + rate, t), 0);
  if (npvAt(lo) * npvAt(hi) > 0) return null;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    if (Math.abs(npvAt(mid)) < tol) return mid;
    if (npvAt(lo) * npvAt(mid) < 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

function calcNPV(cf, r) {
  return cf.reduce((s, v, t) => s + v / Math.pow(1 + r, t), 0);
}

module.exports = { calcIRR, calcNPV };
