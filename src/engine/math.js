/**
 * ZAN Financial Engine — Pure Math Functions
 * @module engine/math
 * 
 * Zero dependencies. Used by cashflow, financing, waterfall, phases, checks.
 */

export function calcIRR(cf, guess=0.1, maxIter=200, tol=1e-7) {
  if (!cf.some(c=>c<0) || !cf.some(c=>c>0)) return null;
  let r = guess;
  for (let i=0;i<maxIter;i++) {
    let npv=0,dnpv=0;
    for (let t=0;t<cf.length;t++) { const d=Math.pow(1+r,t); npv+=cf[t]/d; dnpv-=t*cf[t]/(d*(1+r)); }
    if (Math.abs(dnpv)<1e-15) break;
    const nr = r - npv/dnpv;
    if (Math.abs(nr-r)<tol) return nr;
    r = nr;
    if (r<-0.99||r>10) return null;
  }
  // Newton-Raphson did not converge - try bisection fallback
  let lo = -0.5, hi = 5.0;
  const npvAt = (rate) => cf.reduce((s,v,t) => s + v/Math.pow(1+rate,t), 0);
  if (npvAt(lo) * npvAt(hi) > 0) return null; // no root in range
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const nmid = npvAt(mid);
    if (Math.abs(nmid) < Math.max(1, cf.reduce((s,v)=>s+Math.abs(v),0) * 1e-8)) return mid;
    if (npvAt(lo) * nmid < 0) hi = mid; else lo = mid;
  }
  return null; // still no convergence
}
export function calcNPV(cf, r) { return cf.reduce((s,v,t)=>s+v/Math.pow(1+r,t),0); }
