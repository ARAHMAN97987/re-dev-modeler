/**
 * ZAN Financial Engine — Model Integrity Checks
 * @module engine/checks
 * 
 * Zero engine dependencies (reads results passed as parameters).
 * Pure validation - no calculations, no mutations.
 */

export function runChecks(project, results, financing, waterfall, incentivesResult) {
  const as = results.assetSchedules;
  const c = results.consolidated;
  const h = results.horizon;
  const f = financing;
  const w = waterfall;
  const ir = incentivesResult;
  const tol = 1;
  const phases = results.phaseResults || {};
  const checks = [];
  const add = (cat, name, pass, desc, detail) => checks.push({ cat, name, pass, desc, detail: detail || "" });
  const fmt = n => n != null ? Math.round(n).toLocaleString() : "N/A";
  const fp = n => n != null ? (n*100).toFixed(2)+"%" : "N/A";

  // ═══════════════════════════════════════════════
  // T0: BUSINESS VALIDATION (H16)
  // ═══════════════════════════════════════════════
  if (w && project.finMode === "fund") {
    const gpP = w.gpPct || 0, lpP = w.lpPct || 0;
    add("T0","GP+LP = 100%", Math.abs((gpP+lpP)-1) < 0.001, "Equity split must total 100%", `GP: ${fp(gpP)} + LP: ${fp(lpP)} = ${fp(gpP+lpP)}`);
  }
  const infraCats = ["utilities","parking","landscaping","roads","common","infrastructure"];
  const isInfra = (a) => infraCats.some(ic => (a.category||"").toLowerCase().includes(ic) || (a.name||"").toLowerCase().includes(ic));
  (project.assets||[]).forEach((a,i) => {
    if (a.revType === "Lease" && (a.efficiency||0) === 0 && (a.gfa||0) > 0 && !isInfra(a))
      add("T0",`Asset "${a.name||i}": Efficiency=0`, false, "Lease asset with 0% efficiency generates no revenue");
    if ((a.gfa||0) > 0 && (a.costPerSqm||0) === 0)
      add("T0",`Asset "${a.name||i}": Cost/sqm=0`, false, "Asset has GFA but zero construction cost");
  });
  if (project.exitStrategy === "caprate" && (project.exitCapRate??9) === 0)
    add("T0","Exit Cap Rate = 0", false, "Cap rate exit with 0% cap rate causes division by zero");
  if ((project.exitStrategy||"sale") === "sale" && (project.exitMultiple??10) === 0)
    add("T0","Exit Multiple = 0", false, "Sale exit with 0x multiple produces zero exit value");
  if (f && project.debtAllowed && (project.loanTenor??7) <= (project.debtGrace??3))
    add("T0","Tenor ≤ Grace", false, "Loan tenor must exceed grace period", `Tenor: ${project.loanTenor??7}, Grace: ${project.debtGrace??3}`);
  // K1-K7: Additional validation checks from code audit
  if ((project.landRentEscalationEveryN ?? 5) <= 0 && project.landType === "lease")
    add("T0","Land Esc Interval = 0", false, "Step escalation interval must be > 0");
  if ((project.carryPct ?? 30) >= 100 && project.gpCatchup)
    add("T0","Carry ≥ 100%", false, "Carry percentage must be < 100% when catch-up enabled");
  if ((project.maxLtvPct ?? 70) >= 100 && project.finMode === "fund")
    add("T0","LTV ≥ 100% in Fund", false, "100% LTV in fund mode leaves no equity for investors");
  const maxConstrEnd = Math.max(0, ...as.map(a => a.capexSchedule.reduce((last, v, i) => v > 0 ? i + 1 : last, 0)));
  if (maxConstrEnd > (project.horizon||50))
    add("T0","Horizon < Construction", false, "Horizon doesn't cover full construction period", `Constr ends Y${maxConstrEnd}, Horizon Y${project.horizon||50}`);

  // H11: Exit during ramp-up warning
  if (f && project.exitStrategy !== "hold") {
    const exitYrIdx = f.exitYear ? f.exitYear - (project.startYear||2026) : 0;
    const maxRamp = Math.max(...as.map(a => {
      const lastCapex = a.capexSchedule.reduce((last, v, i) => v > 0 ? i + 1 : last, 0);
      return lastCapex + (a.rampUpYears??3);
    }));
    if (exitYrIdx > 0 && exitYrIdx < maxRamp)
      add("T0","Exit Before Stabilization", true, "Exit year is during ramp-up. Valuation may use unstabilized income", `Exit Y${exitYrIdx}, Full stabilization Y${maxRamp}`);
  }

  // ═══════════════════════════════════════════════
  // T1: PROJECT ENGINE (15 checks)
  // ═══════════════════════════════════════════════
  add("T1","GFA Total Match", Math.abs((project.assets||[]).reduce((s,a)=>s+(a.gfa||0),0) - as.reduce((s,a)=>s+(a.gfa||0),0)) < tol, "Program GFA = Computed GFA");
  add("T1","No Negative GFA", (project.assets||[]).every(a=>(a.gfa||0)>=0), "All GFA values ≥ 0");
  add("T1","Active Assets Have Duration", (project.assets||[]).every(a=>((a.gfa||0)===0&&(a.costPerSqm||0)===0)||(a.constrDuration||0)>0), "Assets with GFA have construction duration");
  // Check: no asset's build duration exceeds its phase opening period
  const _sy = project.startYear || 2026;
  const durationOK = (project.assets||[]).every(a => {
    const ph = (project.phases||[]).find(p => p.name === (a.phase || 'Phase 1'));
    if (!ph) return true;
    let phaseMonths = 0;
    if ((ph.completionYear || 0) > 0) {
      phaseMonths = (ph.completionYear - _sy) * 12;
    } else if ((ph.completionMonth || 0) > 0) {
      phaseMonths = ph.completionMonth;
    }
    if (phaseMonths <= 0) return true;
    return (a.constrDuration || 12) <= phaseMonths;
  });
  const badAssets = (project.assets||[]).filter(a => {
    const ph = (project.phases||[]).find(p => p.name === (a.phase || 'Phase 1'));
    if (!ph) return false;
    let phaseMonths = 0;
    if ((ph.completionYear || 0) > 0) {
      phaseMonths = (ph.completionYear - _sy) * 12;
    } else if ((ph.completionMonth || 0) > 0) {
      phaseMonths = ph.completionMonth;
    }
    return phaseMonths > 0 && (a.constrDuration || 12) > phaseMonths;
  }).map(a => {
    const ph = (project.phases||[]).find(p => p.name === (a.phase || 'Phase 1'));
    const pm = (ph?.completionYear||0) > 0 ? (ph.completionYear-_sy)*12 : (ph?.completionMonth||0);
    return `${a.name||'?'}(${a.constrDuration}mo>${pm}mo)`;
  });
  add("T0","Build Duration ≤ Phase Opening", durationOK, "Asset build exceeds phase opening — adjust build duration or opening year",
    badAssets.length > 0 ? badAssets.join(', ') : undefined);
  add("T1","No Negative Leasable", as.every(a=>(a.leasableArea||0)>=0), "All leasable areas ≥ 0");
  add("T1","CAPEX Reconciles", Math.abs(as.reduce((s,a)=>s+a.totalCapex,0) - c.totalCapex) < tol, "Sum asset CAPEX = consolidated",
    `Assets: ${fmt(as.reduce((s,a)=>s+a.totalCapex,0))} vs Cons: ${fmt(c.totalCapex)}`);
  add("T1","Revenue Reconciles", Math.abs(as.reduce((s,a)=>s+a.totalRevenue,0) - c.totalIncome) < tol, "Sum asset revenue = consolidated");
  add("T1","Op Assets Have EBITDA", (project.assets||[]).filter(a=>a.revType==="Operating").every(a=>(a.opEbitda||0)>0||(a.gfa||0)===0), "Operating assets have EBITDA");
  const phInc = Object.values(phases).reduce((s,p)=>s+p.totalIncome,0);
  const phCap = Object.values(phases).reduce((s,p)=>s+p.totalCapex,0);
  add("T1","Phase Income = Consolidated", Math.abs(phInc-c.totalIncome)<tol, "Sum phase income = consolidated",
    `Phases: ${fmt(phInc)} vs Cons: ${fmt(c.totalIncome)}`);
  add("T1","Phase CAPEX = Consolidated", Math.abs(phCap-c.totalCapex)<tol, "Sum phase CAPEX = consolidated");
  let cfOk = true;
  for (let y=0;y<h;y++) { if (Math.abs(c.netCF[y]-(c.income[y]-c.capex[y]-c.landRent[y]))>tol) { cfOk=false; break; } }
  add("T1","Net CF = Income - CAPEX - Land", cfOk, "Year-by-year CF equation holds");
  const escOk = as.every(a => a.revenueSchedule[Math.min(9,h-1)]===0 || a.revenueSchedule[Math.min(4,h-1)]===0 || a.revenueSchedule[Math.min(9,h-1)] >= a.revenueSchedule[Math.min(4,h-1)]);
  add("T1","Revenue Escalates", escOk, "Later years revenue ≥ earlier years");
  add("T1","IRR Computed", c.irr !== null || c.totalNetCF <= 0, "IRR computed when CF positive", `IRR: ${fp(c.irr)}`);
  add("T1","NPV@10% Computed", c.npv10 !== undefined, "NPV at 10% computed", `NPV: ${fmt(c.npv10)}`);
  add("T1","Sum Consistency", Math.abs(c.totalNetCF-(c.totalIncome-c.totalCapex-c.totalLandRent))<tol, "Total Net CF = Income - CAPEX - Land");
  if (project.landType === "lease") { add("T1","Lease Land Rent", c.totalLandRent>0||(project.landRentAnnual||0)===0, "Leased land: rent configured correctly"); }
  else if (project.landType === "purchase") { add("T1","Purchase Land Cost", c.capex[0]>=(project.landPurchasePrice||0)||(project.landPurchasePrice||0)===0, "Purchase cost in CAPEX year 0"); }
  else if (project.landType === "partner" || project.landType === "bot") { add("T1","No Land Cost", c.totalLandRent===0, "No cash land cost for partner/BOT"); }
  // Manual allocation sum check
  if (project.landRentManualAlloc && Object.keys(project.landRentManualAlloc).length > 0) {
    const mSum = Object.values(project.landRentManualAlloc).reduce((s,v) => s + (Number(v)||0), 0);
    add("T1","Rent Alloc = 100%", Math.abs(mSum - 100) <= 0.1, "Manual land rent allocation totals 100%", `Sum: ${mSum.toFixed(1)}%`);
  }

  // ═══════════════════════════════════════════════
  // T2: FINANCING ENGINE (12 checks)
  // ═══════════════════════════════════════════════
  if (f && f.mode !== "self") {
    const capTarget = f.totalProjectCost || f.devCostInclLand;
    const capDiff = Math.abs((f.totalDebt+f.gpEquity+f.lpEquity)-capTarget);
    add("T2","Capital Structure Equation", capDiff<10000, "Debt + GP + LP = Total Project Cost",
      `${fmt(f.totalDebt+f.gpEquity+f.lpEquity)} vs ${fmt(capTarget)} (diff: ${fmt(capDiff)})`);
    add("T2","Debt Balance ≥ 0", (f.debtBalClose||[]).every(v=>v>=-0.01), "Debt balance never negative");
    const rpEnd = f.repayStart+f.repayYears-1;
    const balEnd = rpEnd>=0&&rpEnd<h?(f.debtBalClose[rpEnd]||0):0;
    add("T2","Debt Fully Repaid", f.tenor===0||balEnd<1, "Debt repaid by tenor end", `Balance at year ${rpEnd+1}: ${fmt(balEnd)}`);
    let intOk=true;
    const ufPct = (project.upfrontFeePct||0)/100;
    const exitIdx = f.exitYear ? f.exitYear - (project.startYear||2026) : -1;
    for (let y=0;y<Math.min(h,20);y++) {
      if (y === exitIdx) continue; // Balloon repay distorts trueClose at exit year
      if ((f.debtBalOpen[y]||0)>0||(f.debtBalClose[y]||0)>0||(f.drawdown?.[y]||0)>0) {
        const trueClose = Math.max(0,(f.debtBalOpen[y]||0)+(f.drawdown?.[y]||0)-(f.repayment?.[y]||0));
        const exp=Math.max(0,((f.debtBalOpen[y]||0)+trueClose)/2*f.rate + (f.drawdown?.[y]||0)*ufPct);
        const act=Math.abs(f.originalInterest?.[y]||f.interest[y]||0);
        if (exp>0&&Math.abs(act-exp)/exp>0.05) { intOk=false; break; }
      }
    }
    add("T2","Interest = AvgBal × Rate + Draw × Fee%", intOk, "Interest uses (Open+Close)/2 × rate + draw × upfrontFee%");
    const totEqC=(f.equityCalls||[]).reduce((s,v)=>s+v,0);
    add("T2","Equity Calls ≥ Equity", totEqC>=f.totalEquity-10000, "Equity calls cover equity",
      `Calls: ${fmt(totEqC)} vs Equity: ${fmt(f.totalEquity)}`);
    const totDrw=(f.drawdown||[]).reduce((s,v)=>s+v,0);
    add("T2","Drawdown = Total Debt", Math.abs(totDrw-f.totalDebt)<1, "Sum drawdowns = debt drawn");
    let graceOk=true;
    if (f.repayStart>0) { for(let y=0;y<f.repayStart&&y<h;y++) { if(y===exitIdx) continue; if((f.repayment?.[y]||0)>1){graceOk=false;break;} } }
    add("T2","Grace Period Respected", graceOk, "No repayment during grace period");
    const adjLR=ir?.adjustedLandRent||c.landRent;
    let levOk=true;
    // Determine if sold (post-exit CF should be zero)
    const fExitStr=project.exitStrategy||"sale";
    const fExitYrIdx=f.exitYear?(f.exitYear-(project.startYear||2026)):-1;
    const fSold=fExitStr!=="hold"&&fExitYrIdx>=0&&fExitYrIdx<h;
    for(let y=0;y<h;y++){
      let exp;
      if(fSold&&y>fExitYrIdx){exp=0;}
      else{exp=c.income[y]-adjLR[y]-c.capex[y]+(ir?.capexGrantSchedule?.[y]||0)+(ir?.feeRebateSchedule?.[y]||0)-f.debtService[y]+f.drawdown[y]+(f.exitProceeds?.[y]||0)-(f.devFeeSchedule?.[y]||0);}
      if(Math.abs(f.leveredCF[y]-exp)>tol){levOk=false;break;}
    }
    add("T2","Levered CF Equation", levOk, "LevCF = Income - Land - CAPEX + Grants - DS + Draw + Exit - DevFee");
    let dscrOk=true;
    for(let y=0;y<h;y++){
      if(f.debtService[y]>0&&f.dscr[y]!==null){
        const exp=(c.income[y]-adjLR[y])/f.debtService[y];
        if(Math.abs(f.dscr[y]-exp)>0.01){dscrOk=false;break;}
      }
    }
    add("T2","DSCR = NOI / Debt Service", dscrOk, "DSCR calculation consistent");
    add("T2","GP + LP = Equity", Math.abs(f.gpEquity+f.lpEquity-f.totalEquity)<1, "GP + LP = total equity");
    if (f.leveredIRR!==null&&c.irr!==null) {
      add("T2","Leverage Changes IRR", Math.abs(f.leveredIRR-c.irr)>0.001, "Levered ≠ Unlevered IRR",
        `Unlev: ${fp(c.irr)} Lev: ${fp(f.leveredIRR)}`);
    }
    if (f.interestSubsidyTotal>0) {
      add("T2","Interest Subsidy Active", true, "Finance support reduces interest", `Savings: ${fmt(f.interestSubsidyTotal)}`);
    }
  }

  // ═══════════════════════════════════════════════
  // T3: WATERFALL ENGINE (10 checks)
  // ═══════════════════════════════════════════════
  if (w && w.tier1) {
    let distOk=true;
    for(let y=0;y<h;y++){
      const td=(w.tier1[y]||0)+(w.tier2[y]||0)+(w.tier3[y]||0)+(w.tier4LP[y]||0)+(w.tier4GP[y]||0);
      if(td>(w.cashAvail[y]||0)+tol){distOk=false;break;}
    }
    add("T3","Dist ≤ Cash Available", distOk, "Annual distributions ≤ cash available");
    const firstEqCallYr = (w.equityCalls||[]).findIndex(v => v > 0);
    const unretAfterFirstCall = firstEqCallYr >= 0 ? (w.unreturnedOpen?.[firstEqCallYr] || 0) + (w.equityCalls?.[firstEqCallYr] || 0) : 0;
    add("T3","Unreturned Capital Init", unretAfterFirstCall > 0, "Unreturned capital initialized",
      `Start: ${fmt(unretAfterFirstCall)} (yr ${firstEqCallYr >= 0 ? firstEqCallYr + 1 : '?'})`);
    let lpDOk=true;
    for(let y=0;y<h;y++){
      if(w.lpDist[y]>0&&w.lpPct>0){
        // Option B: T1+T2 both pro-rata
        const exp=(w.tier1[y]+w.tier2[y])*(w.lpPct||0)+(w.tier4LP[y]||0);
        if(Math.abs(w.lpDist[y]-exp)>tol){lpDOk=false;break;}
      }
    }
    add("T3","LP Dist = (T1+T2)*LP% + T4LP", lpDOk, "LP distribution formula correct");
    let gpDOk=true;
    for(let y=0;y<h;y++){
      if(w.gpDist[y]>0&&w.gpPct>0){
        // Option B: T1+T2 pro-rata + T3 + T4GP
        const exp=(w.tier1[y]+w.tier2[y])*(w.gpPct||0)+(w.tier3[y]||0)+(w.tier4GP[y]||0);
        if(Math.abs(w.gpDist[y]-exp)>tol){gpDOk=false;break;}
      }
    }
    add("T3","GP Dist = (T1+T2)*GP% + T3 + T4GP", gpDOk, "GP distribution formula correct");
    if(w.lpTotalInvested>0&&w.lpMOIC){
      const expM=w.lpTotalDist/w.lpTotalInvested;
      add("T3","LP MOIC = Dist/Equity", Math.abs(w.lpMOIC-expM)<0.01, "LP MOIC correct", `${w.lpMOIC.toFixed(2)}x`);
    }
    if(w.gpTotalInvested>0&&w.gpMOIC){
      const expM=w.gpTotalDist/w.gpTotalInvested;
      add("T3","GP MOIC = Dist/Equity", Math.abs(w.gpMOIC-expM)<0.01, "GP MOIC correct", `${w.gpMOIC.toFixed(2)}x`);
    }
    const totROC=(w.tier1||[]).reduce((s,v)=>s+v,0);
    const totCalled=(w.equityCalls||[]).reduce((s,v)=>s+v,0);
    add("T3","ROC ≤ Called Capital", totROC<=totCalled+tol, "Return of capital ≤ called",
      `ROC: ${fmt(totROC)} vs Called: ${fmt(totCalled)}`);
    add("T3","LP IRR Computed", w.lpIRR!==null||w.lpTotalDist===0, "LP IRR computed", `${fp(w.lpIRR)}`);
    add("T3","GP IRR Computed", w.gpIRR!==null||w.gpTotalInvested===0||w.gpTotalDist===0||w.gpTotalDist<w.gpTotalInvested, "GP IRR computed (N/A if GP has no equity or return < equity)", `${fp(w.gpIRR)}`);
  }

  // ═══════════════════════════════════════════════
  // T4: INCENTIVES ENGINE (8 checks)
  // ═══════════════════════════════════════════════
  if (ir) {
    if (ir.capexGrantTotal > 0) {
      add("T4","CAPEX Grant ≤ CAPEX", ir.capexGrantTotal<=c.totalCapex+tol, "Grant ≤ total CAPEX",
        `Grant: ${fmt(ir.capexGrantTotal)} vs CAPEX: ${fmt(c.totalCapex)}`);
      const adjCT=ir.adjustedCapex.reduce((s,v)=>s+v,0);
      add("T4","Adjusted CAPEX = Orig - Grant", Math.abs(adjCT-(c.totalCapex-ir.capexGrantTotal))<tol, "CAPEX reduced by grant",
        `${fmt(adjCT)} = ${fmt(c.totalCapex)} - ${fmt(ir.capexGrantTotal)}`);
      add("T4","CAPEX Grant → IRR Change", ir.adjustedIRR!==c.irr, "Grant changes Unlevered IRR",
        `${fp(c.irr)} → ${fp(ir.adjustedIRR)}`);
    }
    if (ir.landRentSavingTotal > 0) {
      let lrOk=true;
      for(let y=0;y<h;y++){ if(ir.landRentSavingSchedule[y]>Math.abs(c.landRent[y]||0)+tol){lrOk=false;break;} }
      add("T4","Land Rebate ≤ Rent", lrOk, "Rebate never exceeds original rent");
      add("T4","Land Rebate → IRR Change", ir.adjustedIRR!==null&&ir.adjustedIRR!==c.irr, "Rebate changes IRR",
        `Saving: ${fmt(ir.landRentSavingTotal)} → IRR: ${fp(ir.adjustedIRR)}`);
    }
    if (ir.feeRebateTotal > 0) {
      add("T4","Fee Rebate Recorded", true, "Fee rebate value computed", `Total: ${fmt(ir.feeRebateTotal)}`);
      add("T4","Fee Rebate → IRR Change", ir.adjustedIRR!==null&&ir.adjustedIRR!==c.irr, "Fee rebate changes IRR");
    }
    if (ir.totalIncentiveValue > 0) {
      let impOk=true;
      for(let y=0;y<h;y++){
        const exp=(ir.capexGrantSchedule?.[y]||0)+(ir.landRentSavingSchedule?.[y]||0)+(ir.feeRebateSchedule?.[y]||0);
        if(Math.abs((ir.netCFImpact?.[y]||0)-exp)>tol){impOk=false;break;}
      }
      add("T4","Net Impact = Grant+Land+Fee", impOk, "Year-by-year incentive impact reconciles");
    }
  }

  // ═══════════════════════════════════════════════
  // T5: CROSS-ENGINE INTEGRATION (8 checks)
  // ═══════════════════════════════════════════════
  if (f && f.mode !== "self" && ir && ir.capexGrantTotal > 0) {
    const expDev=ir.adjustedCapex.reduce((s,v)=>s+v,0);
    add("T5","Fin Uses Adjusted CAPEX", Math.abs(f.devCostExclLand-expDev)<tol, "Financing uses incentive-adjusted CAPEX",
      `Fin: ${fmt(f.devCostExclLand)} vs Adj: ${fmt(expDev)}`);
  }
  if (f && f.mode !== "self" && ir && ir.totalIncentiveValue > 0) {
    const baseCF=new Array(h).fill(0);
    for(let y=0;y<h;y++) baseCF[y]=c.income[y]-c.landRent[y]-c.capex[y]-(f.debtService[y]||0)+(f.drawdown[y]||0)+(f.exitProceeds?.[y]||0);
    const baseIRR=calcIRR(baseCF);
    add("T5","Incentives Change Levered IRR", baseIRR===null||f.leveredIRR===null||Math.abs(f.leveredIRR-baseIRR)>0.00001,
      "Levered IRR differs with incentives", `Without: ${fp(baseIRR)} With: ${fp(f.leveredIRR)}`);
  }
  if (f && f.mode === "self" && ir && ir.totalIncentiveValue > 0) {
    add("T5","Self-Funded IRR Adjusted", f.leveredIRR!==c.irr||ir.capexGrantTotal===0, "Self-funded IRR includes incentives",
      `Base: ${fp(c.irr)} Adj: ${fp(f.leveredIRR)}`);
  }
  if (w && f) {
    add("T5","Waterfall Has Cash", w.cashAvail.reduce((s,v)=>s+v,0)!==0, "Cash available for distribution");
  }
  if (ir && ir.adjustedIRR !== null && ir.totalIncentiveValue > 0) {
    add("T5","Dashboard Shows Adjusted IRR", true, "Adjusted IRR ready for display", `${fp(ir.adjustedIRR)}`);
  }
  if (f && f.exitProceeds && f.exitProceeds.some(v=>v>0)) {
    add("T5","Exit Proceeds Generated", true, "Exit generates proceeds", `${fmt(f.exitProceeds.reduce((s,v)=>s+v,0))}`);
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: FINANCING ENGINE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// GOVERNMENT INCENTIVES ENGINE
// ═══════════════════════════════════════════════════════════════
