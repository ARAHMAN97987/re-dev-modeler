/**
 * @deprecated Legacy per-phase waterfall allocation.
 * Kept as temporary fallback until computeIndependentPhaseResults
 * is proven to fully replace this function.
 * Do NOT add new features to this function.
 * Target removal: after engine extraction parity is confirmed.
 * 
 * Dependencies: engine/math.js (calcIRR) - DIRECT import, one level up
 */

import { calcIRR } from '../math.js';

export function computePhaseWaterfalls(project, projectResults, financing, waterfallConsolidated) {
  if (!project || !projectResults || !financing || !waterfallConsolidated) return {};
  if (project.finMode === "self" || project.finMode === "bank100") return {};

  const phases = projectResults.phaseResults;
  const phaseNames = Object.keys(phases);
  if (phaseNames.length <= 1) return {}; // No need if single phase

  const h = project.horizon || 50;
  const sy = project.startYear || 2026;
  const c = projectResults.consolidated;
  const f = financing;
  const wc = waterfallConsolidated;

  const result = {};

  for (const pName of phaseNames) {
    const pr = phases[pName];
    const allocPct = pr.allocPct || (1 / phaseNames.length);

    // Phase-level financing allocation (proportional to CAPEX)
    const capexPct = c.totalCapex > 0 ? pr.totalCapex / c.totalCapex : allocPct;

    const pDebt = f.totalDebt * capexPct;
    const pEquity = f.totalEquity * capexPct;
    const pGpEquity = f.gpEquity * capexPct;
    const pLpEquity = f.lpEquity * capexPct;
    const pFees = wc.totalFees * capexPct;

    // Phase exit proceeds (proportional to income at exit)
    const exitYr = wc.exitYear - sy;
    const totalIncomeAtExit = c.income[exitYr] || 1;
    const phaseIncomeAtExit = pr.income[exitYr] || 0;
    const exitPct = totalIncomeAtExit > 0 ? phaseIncomeAtExit / totalIncomeAtExit : capexPct;

    // Phase cash available - ZAN formula: MAX(0, UnlevCF + DS - Fees + UF + Exit)
    const pCashAvail = new Array(h).fill(0);
    const pEquityCalls = new Array(h).fill(0);
    const pUnfundedFees = new Array(h).fill(0);
    for (let y = 0; y < h; y++) {
      pEquityCalls[y] = (wc.equityCalls[y] || 0) * capexPct;
      const unlevCF = pr.netCF[y] || 0; // income - landRent - capex
      const debtSvc = (f.debtService[y] || 0) * capexPct;
      const fees = (wc.fees[y] || 0) * capexPct;
      const exitP = (wc.exitProceeds[y] || 0) * exitPct;
      // Unfunded fees for this phase
      if (fees > 0) {
        const operCF = unlevCF - debtSvc + exitP;
        pUnfundedFees[y] = Math.max(0, fees - Math.max(0, operCF));
      }
      const exitYrIdx = wc.exitYear - sy;
      const inPeriod = y <= exitYrIdx;
      pCashAvail[y] = Math.max(0, (inPeriod ? unlevCF : 0) - debtSvc - fees + pUnfundedFees[y] + exitP);
    }

    // Run 4-tier waterfall for this phase
    const prefRate = (project.prefReturnPct ?? 15) / 100;
    const carryPct = Math.min(0.9999, Math.max(0, (project.carryPct ?? 30) / 100));
    const lpSplitPct = (project.lpProfitSplitPct ?? 70) / 100;
    const gpPct = wc.gpPct;
    const lpPct = wc.lpPct;

    const catchMethod = project.catchupMethod || "perYear";
    const prefAlloc = project.prefAllocation || "proRata";

    const tier1=[],tier2=[],tier3=[],tier4LP=[],tier4GP=[],lpDist=[],gpDist=[];
    for(let i=0;i<h;i++){tier1.push(0);tier2.push(0);tier3.push(0);tier4LP.push(0);tier4GP.push(0);lpDist.push(0);gpDist.push(0);}

    let cumEqCalled=0,cumReturned=0,cumPrefPaid=0,cumPrefAccrued=0,cumGPCatchup=0;
    for(let y=0;y<h;y++){
      cumEqCalled+=pEquityCalls[y];
      const unreturned=cumEqCalled-cumReturned;
      const yearPref=unreturned*prefRate;
      cumPrefAccrued+=yearPref;
      let rem=pCashAvail[y];
      if(rem<=0)continue;
      if(unreturned>0&&rem>0){const t1=Math.min(rem,unreturned);tier1[y]=t1;rem-=t1;cumReturned+=t1;}
      const prefOwed=cumPrefAccrued-cumPrefPaid;
      if(prefOwed>0&&rem>0){const t2=Math.min(rem,prefOwed);tier2[y]=t2;rem-=t2;cumPrefPaid+=t2;}
      if(project.gpCatchup&&rem>0&&carryPct>0){
        if(catchMethod==="perYear"){
          // ZAN method: based on this year's T2 only
          const catchup=Math.min(rem,tier2[y]*carryPct/(1-carryPct));
          tier3[y]=catchup;rem-=catchup;
        }else{
          const gpFromPref=prefAlloc==="proRata"?cumPrefPaid*gpPct:0;
          const targetCU=Math.max(0,(carryPct*cumPrefPaid-gpFromPref)/(1-carryPct));
          const needed=Math.max(0,targetCU-cumGPCatchup);
          const catchup=Math.min(rem,needed);tier3[y]=catchup;rem-=catchup;cumGPCatchup+=catchup;
        }
      }
      if(rem>0){tier4LP[y]=rem*lpSplitPct;tier4GP[y]=rem*(1-lpSplitPct);}
      if(prefAlloc==="lpOnly"){
        lpDist[y]=tier1[y]*lpPct+tier2[y]+tier4LP[y];
        gpDist[y]=tier1[y]*gpPct+tier3[y]+tier4GP[y];
      }else{
        lpDist[y]=(tier1[y]+tier2[y])*lpPct+tier4LP[y];
        gpDist[y]=(tier1[y]+tier2[y])*gpPct+tier3[y]+tier4GP[y];
      }
    }

    const lpNetCF=new Array(h).fill(0),gpNetCF=new Array(h).fill(0);
    for(let y=0;y<h;y++){lpNetCF[y]=-pEquityCalls[y]*lpPct+lpDist[y];gpNetCF[y]=-pEquityCalls[y]*gpPct+gpDist[y];}

    const lpTotalDist=lpDist.reduce((a,b)=>a+b,0);
    const gpTotalDist=gpDist.reduce((a,b)=>a+b,0);
    const lpInv=pEquityCalls.reduce((a,b)=>a+b,0)*lpPct;
    const gpInv=pEquityCalls.reduce((a,b)=>a+b,0)*gpPct;

    result[pName] = {
      debt: pDebt, equity: pEquity, gpEquity: pGpEquity, lpEquity: pLpEquity,
      fees: pFees, capexPct, exitPct, unfundedFees: pUnfundedFees,
      cashAvail: pCashAvail, equityCalls: pEquityCalls,
      tier1, tier2, tier3, tier4LP, tier4GP, lpDist, gpDist, lpNetCF, gpNetCF,
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF), projIRR: pr.irr,
      lpMOIC: lpInv > 0 ? lpTotalDist / lpInv : 0,
      gpMOIC: gpInv > 0 ? gpTotalDist / gpInv : 0,
      lpCommittedMOIC: pLpEquity > 0 ? lpTotalDist / pLpEquity : 0,
      gpCommittedMOIC: pGpEquity > 0 ? gpTotalDist / pGpEquity : 0,
      lpTotalDist, gpTotalDist, lpTotalInvested: lpInv, gpTotalInvested: gpInv,
      lpTotalCalled: lpInv, gpTotalCalled: gpInv,
      lpNetDist: lpTotalDist, gpNetDist: gpTotalDist,
      lpNPV10: calcNPV(lpNetCF, 0.10), gpNPV10: calcNPV(gpNetCF, 0.10),
      totalCashAvail: pCashAvail.reduce((a,b)=>a+b,0),
    };
  }

  return result;
}
