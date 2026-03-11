/**
 * RE-DEV MODELER — Comprehensive Financial Model Test Suite v2.0
 * 
 * SCOPE: Project Engine, Financing Engine, Land Capitalization,
 *        Government Incentives, Scenarios, Multi-phase, Edge Cases
 * 
 * BUGS FOUND:
 *   BUG-001: stabilizedOcc=0 → treated as 100% [FIXED]
 *   BUG-002: Land rent rebate sign error [FIXED]
 * 
 * Run: node tests/test_suite.js
 */

// ── Calculation Functions (from App.jsx) ──

function getScenarioMults(p) {
  let cm=1,rm=1,dm=0,ea=0; const s=p.activeScenario;
  if(s==="CAPEX +10%")cm=1.1;else if(s==="CAPEX -10%")cm=0.9;
  else if(s==="Rent +10%")rm=1.1;else if(s==="Rent -10%")rm=0.9;
  else if(s==="Delay +6 months")dm=6;else if(s==="Escalation +0.5%")ea=0.5;else if(s==="Escalation -0.5%")ea=-0.5;
  else if(s==="Custom"){cm=(p.customCapexMult||100)/100;rm=(p.customRentMult||100)/100;dm=p.customDelay||0;ea=p.customEscAdj||0;}
  return{cm,rm,dm,ea};
}
function computeAssetCapex(a,p){const{cm}=getScenarioMults(p);return(a.gfa||0)*(a.costPerSqm||0)*(1+(p.softCostPct||0)/100)*(1+(p.contingencyPct||0)/100)*cm;}
function calcIRR(cf,guess=0.1,maxIter=200,tol=1e-7){if(!cf.some(c=>c<0)||!cf.some(c=>c>0))return null;let r=guess;for(let i=0;i<maxIter;i++){let npv=0,dnpv=0;for(let t=0;t<cf.length;t++){const d=Math.pow(1+r,t);npv+=cf[t]/d;dnpv-=t*cf[t]/(d*(1+r));}if(Math.abs(dnpv)<1e-15)break;const nr=r-npv/dnpv;if(Math.abs(nr-r)<tol)return nr;r=nr;if(r<-0.99||r>10)return null;}return r;}
function calcNPV(cf,r){return cf.reduce((s,v,t)=>s+v/Math.pow(1+r,t),0);}

function computeProjectCashFlows(project) {
  const{cm,rm,dm,ea}=getScenarioMults(project);const horizon=project.horizon||50;const effEsc=((project.rentEscalation||0)+ea)/100;
  const assetSchedules=(project.assets||[]).map(asset=>{
    const totalCapex=computeAssetCapex(asset,project);const durYears=Math.ceil(((asset.constrDuration||12)+dm)/12);
    const ramp=asset.rampUpYears||3;const occ=(asset.stabilizedOcc!=null?asset.stabilizedOcc:100)/100;
    const eff=(asset.efficiency||0)/100;const leasableArea=(asset.gfa||0)*eff;
    const leaseRate=(asset.leaseRate||0)*rm;const opEbitda=(asset.opEbitda||0)*rm;
    const capexSch=new Array(horizon).fill(0);const revSch=new Array(horizon).fill(0);const cStart=(asset.constrStart||1)-1;
    if(durYears>0&&totalCapex>0){const ann=totalCapex/durYears;for(let y=cStart;y<cStart+durYears&&y<horizon;y++)if(y>=0)capexSch[y]=ann;}
    const revStart=cStart+durYears;
    if(asset.revType==="Lease"&&leasableArea>0&&leaseRate>0){for(let y=revStart;y<horizon;y++){const yrs=y-revStart;revSch[y]=leasableArea*leaseRate*occ*Math.min(1,(yrs+1)/ramp)*Math.pow(1+effEsc,yrs);}}
    else if(asset.revType==="Operating"&&opEbitda>0){for(let y=revStart;y<horizon;y++){const yrs=y-revStart;revSch[y]=opEbitda*Math.min(1,(yrs+1)/ramp)*Math.pow(1+effEsc,yrs);}}
    return{...asset,totalCapex,leasableArea,capexSchedule:capexSch,revenueSchedule:revSch,totalRevenue:revSch.reduce((a,b)=>a+b,0)};
  });
  const landSch=new Array(horizon).fill(0);
  if(project.landType==="lease"){const base=project.landRentAnnual||0;const gr=project.landRentGrace||0;const eN=project.landRentEscalationEveryN||5;const eP=(project.landRentEscalation||0)/100;const term=Math.min(project.landRentTerm||50,horizon);for(let y=0;y<term;y++){if(y<gr)continue;landSch[y]=base*Math.pow(1+eP,Math.floor((y-gr)/eN));}}
  else if(project.landType==="purchase"){landSch[0]=project.landPurchasePrice||0;}
  const phaseNames=[...new Set((project.assets||[]).map(a=>a.phase).filter(Boolean))];const phaseResults={};
  phaseNames.forEach(pName=>{const pa=assetSchedules.filter(a=>a.phase===pName);const inc=new Array(horizon).fill(0),cap=new Array(horizon).fill(0);pa.forEach(a=>{for(let y=0;y<horizon;y++){inc[y]+=a.revenueSchedule[y];cap[y]+=a.capexSchedule[y];}});const totalFP=assetSchedules.reduce((s,a)=>s+(a.footprint||0),0);const pFP=pa.reduce((s,a)=>s+(a.footprint||0),0);const alloc=totalFP>0?pFP/totalFP:phaseNames.length>0?1/phaseNames.length:0;const pLand=landSch.map(l=>l*alloc);const net=new Array(horizon).fill(0);for(let y=0;y<horizon;y++)net[y]=inc[y]-pLand[y]-cap[y];phaseResults[pName]={income:inc,capex:cap,landRent:pLand,netCF:net,totalCapex:cap.reduce((a,b)=>a+b,0),totalIncome:inc.reduce((a,b)=>a+b,0),totalLandRent:pLand.reduce((a,b)=>a+b,0),irr:calcIRR(net),assetCount:pa.length,footprint:pFP,allocPct:alloc};});
  const ci=new Array(horizon).fill(0),cc=new Array(horizon).fill(0),cl=new Array(horizon).fill(0),cn=new Array(horizon).fill(0);
  Object.values(phaseResults).forEach(pr=>{for(let y=0;y<horizon;y++){ci[y]+=pr.income[y];cc[y]+=pr.capex[y];cl[y]+=pr.landRent[y];cn[y]+=pr.netCF[y];}});
  return{assetSchedules,phaseResults,landSchedule:landSch,startYear:project.startYear||2026,horizon,consolidated:{income:ci,capex:cc,landRent:cl,netCF:cn,totalCapex:cc.reduce((a,b)=>a+b,0),totalIncome:ci.reduce((a,b)=>a+b,0),totalLandRent:cl.reduce((a,b)=>a+b,0),irr:calcIRR(cn),npv10:calcNPV(cn,0.10),npv12:calcNPV(cn,0.12),npv14:calcNPV(cn,0.14)}};
}

function applyInterestSubsidy(project,interest,constrEnd){const inc=project.incentives?.financeSupport;if(!inc?.enabled||inc.subType!=="interestSubsidy")return{adjusted:interest,savings:new Array(interest.length).fill(0),total:0};const h=interest.length;const startYr=inc.subsidyStart==="operation"?constrEnd+1:0;const endYr=startYr+(inc.subsidyYears||5);const pct=(inc.subsidyPct||0)/100;const adjusted=[...interest];const savings=new Array(h).fill(0);let total=0;for(let y=startYr;y<endYr&&y<h;y++){savings[y]=interest[y]*pct;adjusted[y]=interest[y]*(1-pct);total+=savings[y];}return{adjusted,savings,total};}

function computeIncentives(project,projectResults){if(!project||!projectResults)return null;const h=project.horizon||50;const inc=project.incentives||{};const c=projectResults.consolidated;let constrEnd=0;for(let y=h-1;y>=0;y--){if(c.capex[y]>0){constrEnd=y;break;}}const result={capexGrantTotal:0,capexGrantSchedule:new Array(h).fill(0),landRentSavingTotal:0,landRentSavingSchedule:new Array(h).fill(0),adjustedLandRent:[...(c.landRent||[])],feeRebateTotal:0,feeRebateSchedule:new Array(h).fill(0),totalIncentiveValue:0,adjustedCapex:[...c.capex],netCFImpact:new Array(h).fill(0)};
  if(inc.capexGrant?.enabled){const g=inc.capexGrant;const rawGrant=c.totalCapex*(g.grantPct||0)/100;const grantAmt=Math.min(rawGrant,g.maxCap||Infinity);result.capexGrantTotal=grantAmt;if(g.timing==="construction"&&constrEnd>=0){const constrYears=constrEnd+1;const perYear=grantAmt/constrYears;for(let y=0;y<=constrEnd&&y<h;y++){if(c.capex[y]>0){result.capexGrantSchedule[y]=perYear;result.adjustedCapex[y]-=perYear;}}}else{result.capexGrantSchedule[Math.min(constrEnd+1,h-1)]=grantAmt;}}
  if(inc.landRentRebate?.enabled&&project.landType==="lease"){const lr=inc.landRentRebate;const constrYrs=lr.constrRebateYears>0?lr.constrRebateYears:constrEnd+1;const constrPct=(lr.constrRebatePct||0)/100;const operPct=(lr.operRebatePct||0)/100;const operYrs=lr.operRebateYears||0;for(let y=0;y<h;y++){let rebatePct=0;if(y<constrYrs)rebatePct=constrPct;else if(y<constrYrs+operYrs)rebatePct=operPct;const saving=Math.abs(c.landRent[y]||0)*rebatePct;result.landRentSavingSchedule[y]=saving;result.adjustedLandRent[y]=Math.max(0,(c.landRent[y]||0)-saving);result.landRentSavingTotal+=saving;}}
  if(inc.feeRebates?.enabled&&inc.feeRebates.items?.length>0){for(const item of inc.feeRebates.items){const amt=item.amount||0;const yr=Math.max(0,Math.min((item.year||1)-1,h-1));if(item.type==="rebate"){result.feeRebateSchedule[yr]+=amt;result.feeRebateTotal+=amt;}else if(item.type==="deferral"){const deferYrs=Math.ceil((item.deferralMonths||12)/12);const benefit=amt-amt/Math.pow(1.1,deferYrs);result.feeRebateSchedule[yr]+=benefit;result.feeRebateTotal+=benefit;}}}
  for(let y=0;y<h;y++)result.netCFImpact[y]=result.capexGrantSchedule[y]+result.landRentSavingSchedule[y]+result.feeRebateSchedule[y];result.totalIncentiveValue=result.capexGrantTotal+result.landRentSavingTotal+result.feeRebateTotal;return result;}

function computeFinancing(project,projectResults,ir){if(!project||!projectResults)return null;const h=project.horizon||50;const startYear=project.startYear||2026;const c=projectResults.consolidated;const landCapValue=project.landCapitalize?(project.landArea||0)*(project.landCapRate||1000):0;const devCostExclLand=ir?ir.adjustedCapex.reduce((a,b)=>a+b,0):c.totalCapex;const devCostInclLand=devCostExclLand+landCapValue;
  if(project.finMode==="self")return{mode:"self",landCapValue,devCostExclLand,devCostInclLand,gpEquity:devCostInclLand,lpEquity:0,totalEquity:devCostInclLand,gpPct:1,lpPct:0,leveredCF:[...c.netCF],debtBalClose:new Array(h).fill(0),debtService:new Array(h).fill(0),interest:new Array(h).fill(0),originalInterest:new Array(h).fill(0),repayment:new Array(h).fill(0),drawdown:new Array(h).fill(0),equityCalls:c.capex.map((v,i)=>Math.max(0,v)),dscr:new Array(h).fill(null),totalDebt:0,totalInterest:0,interestSubsidyTotal:0,interestSubsidySchedule:new Array(h).fill(0),upfrontFee:0,leveredIRR:c.irr,exitProceeds:new Array(h).fill(0),maxDebt:0,rate:0,tenor:0,grace:0,repayYears:0,constrEnd:0,repayStart:0,graceStartIdx:0,exitYear:0};
  const rate=(project.financeRate||6.5)/100;const tenor=project.loanTenor||7;const grace=project.debtGrace||3;const repayYears=tenor-grace;const maxDebt=project.debtAllowed?devCostInclLand*(project.maxLtvPct||70)/100:0;const upfrontFee=maxDebt*(project.upfrontFeePct||0)/100;const totalEquity=Math.max(0,devCostInclLand-maxDebt);let gpEquity,lpEquity;
  if((project.gpEquityManual||0)>0)gpEquity=Math.min(project.gpEquityManual,totalEquity);else if(landCapValue>0)gpEquity=Math.min(landCapValue,totalEquity);else gpEquity=totalEquity*0.5;
  if((project.lpEquityManual||0)>0)lpEquity=Math.min(project.lpEquityManual,Math.max(0,totalEquity-gpEquity));else lpEquity=Math.max(0,totalEquity-gpEquity);
  if(project.finMode==="fund"&&lpEquity===0&&!(project.gpEquityManual>0)&&!(landCapValue>=totalEquity)){gpEquity=totalEquity*0.5;lpEquity=totalEquity*0.5;}
  const gpPct=totalEquity>0?gpEquity/totalEquity:0;const lpPct=totalEquity>0?lpEquity/totalEquity:0;
  let constrEnd=0;for(let y=h-1;y>=0;y--){if(c.capex[y]>0){constrEnd=y;break;}}
  const drawdown=new Array(h).fill(0),equityCalls=new Array(h).fill(0);let totalDrawn=0;const debtRatio=devCostExclLand>0?Math.min(maxDebt/devCostExclLand,1):0;
  for(let y=0;y<h;y++){if(c.capex[y]>0&&totalDrawn<maxDebt){const draw=Math.min(c.capex[y]*debtRatio,maxDebt-totalDrawn);drawdown[y]=draw;totalDrawn+=draw;}equityCalls[y]=Math.max(0,c.capex[y]-drawdown[y]);}
  let firstDrawYear=-1;for(let y=0;y<h;y++){if(drawdown[y]>0){firstDrawYear=y;break;}}if(firstDrawYear>=0)equityCalls[firstDrawYear]+=upfrontFee;
  const debtBalOpen=new Array(h).fill(0),debtBalClose=new Array(h).fill(0),repay=new Array(h).fill(0),interest2=new Array(h).fill(0),debtSvc=new Array(h).fill(0);
  let graceStartIdx=constrEnd;for(let y=0;y<h;y++){if(drawdown[y]>0){graceStartIdx=y;break;}}const repayStart=graceStartIdx+grace;const annualRepay=repayYears>0?totalDrawn/repayYears:0;
  for(let y=0;y<h;y++){debtBalOpen[y]=y===0?0:debtBalClose[y-1];let bal=debtBalOpen[y]+drawdown[y];if(y>=repayStart&&bal>0&&project.repaymentType==="amortizing")repay[y]=Math.min(annualRepay,bal);else if(project.repaymentType==="bullet"&&y===repayStart+repayYears-1&&bal>0)repay[y]=bal;debtBalClose[y]=bal-repay[y];interest2[y]=((debtBalOpen[y]+drawdown[y]+debtBalClose[y])/2)*rate;debtSvc[y]=repay[y]+interest2[y];}
  const exitProceeds=new Array(h).fill(0);const exitStrategy=project.exitStrategy||"sale";const exitYr=exitStrategy==="hold"?h-1:((project.exitYear||0)>0?project.exitYear-startYear:constrEnd+grace+2);
  if(exitStrategy!=="hold"&&exitYr>=0&&exitYr<h){const stabIncome=c.income[Math.min(exitYr,h-1)]||0;const stabNOI=stabIncome-(c.landRent[Math.min(exitYr,h-1)]||0);let exitVal;if(exitStrategy==="caprate"){const capR=(project.exitCapRate||9)/100;exitVal=capR>0?stabNOI/capR:0;}else exitVal=stabIncome*(project.exitMultiple||10);const exitCost=exitVal*(project.exitCostPct||2)/100;exitProceeds[exitYr]=Math.max(0,exitVal-exitCost-debtBalClose[exitYr]);}
  const intSub=applyInterestSubsidy(project,interest2,constrEnd);const adjInt=intSub.adjusted;const adjDS=new Array(h).fill(0);for(let y=0;y<h;y++)adjDS[y]=repay[y]+adjInt[y];
  const adjLR=ir?.adjustedLandRent||c.landRent;const leveredCF=new Array(h).fill(0);for(let y=0;y<h;y++)leveredCF[y]=c.income[y]-adjLR[y]-c.capex[y]+(ir?.capexGrantSchedule?.[y]||0)+(ir?.feeRebateSchedule?.[y]||0)-adjDS[y]+drawdown[y]+exitProceeds[y];
  const dscr=new Array(h).fill(null);for(let y=0;y<h;y++){if(adjDS[y]>0)dscr[y]=(c.income[y]-adjLR[y])/adjDS[y];}
  return{mode:project.finMode,landCapValue,devCostExclLand,devCostInclLand,gpEquity,lpEquity,totalEquity,gpPct,lpPct,drawdown,equityCalls,debtBalOpen,debtBalClose,repayment:repay,interest:adjInt,originalInterest:interest2,debtService:adjDS,leveredCF,dscr,exitProceeds,totalDebt:totalDrawn,totalInterest:adjInt.reduce((a,b)=>a+b,0),interestSubsidyTotal:intSub.total,interestSubsidySchedule:intSub.savings,upfrontFee,maxDebt,rate,tenor,grace,repayYears,graceStartIdx,leveredIRR:calcIRR(leveredCF),constrEnd,repayStart,exitYear:exitYr+startYear};
}

// ── Test Framework ──
let passed=0,failed=0,total=0;const failures=[];const P0_FAILS=[];
function T(cond,id,name,pri,detail){total++;if(cond){passed++;process.stdout.write("✓ ");}else{failed++;const e={id,test:name,priority:pri,detail};failures.push(e);if(pri==="P0")P0_FAILS.push(e);process.stdout.write("✗ ");}}
function Tc(actual,expected,tol,id,name,pri){const d=Math.abs(actual-expected);T(d<=tol,id,name,pri,d>tol?`Expected ~${expected}, got ${actual} (diff:${d.toFixed(4)})`:"");}
function S(n){console.log(`\n${"═".repeat(60)}\n  ${n}\n${"═".repeat(60)}`);}

// ── Test Data ──
function P(o={}){return{id:"t",name:"Test",startYear:2026,horizon:20,currency:"SAR",landType:"lease",landArea:10000,landRentAnnual:1000000,landRentEscalation:5,landRentEscalationEveryN:5,landRentGrace:2,landRentTerm:20,landPurchasePrice:0,softCostPct:10,contingencyPct:5,rentEscalation:0.75,activeScenario:"Base Case",customCapexMult:100,customRentMult:100,customDelay:0,customEscAdj:0,phases:[{name:"Phase 1",startYearOffset:1,footprint:0}],assets:[A()],finMode:"debt",vehicleType:"fund",landCapitalize:false,landCapRate:1000,landCapTo:"gp",landCapGpBearRent:false,debtAllowed:true,maxLtvPct:60,financeRate:6.5,loanTenor:7,debtGrace:3,upfrontFeePct:0.5,repaymentType:"amortizing",gpEquityManual:0,lpEquityManual:0,exitStrategy:"sale",exitYear:0,exitMultiple:10,exitCapRate:9,exitCostPct:2,prefReturnPct:15,gpCatchup:true,carryPct:30,lpProfitSplitPct:70,incentives:{capexGrant:{enabled:false,grantPct:25,maxCap:50000000,timing:"construction"},financeSupport:{enabled:false,subType:"interestSubsidy",subsidyPct:50,subsidyYears:5,subsidyStart:"operation"},landRentRebate:{enabled:false,constrRebatePct:100,constrRebateYears:0,operRebatePct:50,operRebateYears:3},feeRebates:{enabled:false,items:[]}},...o};}
function A(o={}){return{id:"a1",phase:"Phase 1",category:"Retail",name:"Mall",gfa:12000,revType:"Lease",efficiency:80,leaseRate:1200,opEbitda:0,rampUpYears:3,stabilizedOcc:95,costPerSqm:4000,constrStart:1,constrDuration:24,footprint:4000,hotelPL:null,marinaPL:null,...o};}

// Oracle (independent calculation)
const oracle = (gfa,cost,soft,cont,mult=1) => gfa*cost*(1+soft/100)*(1+cont/100)*mult;

// ════════════════════ T1: CAPEX ════════════════════
S("T1: CAPEX [P0] [Unit]");
(()=>{
  const p=P();const cap=computeAssetCapex(p.assets[0],p);
  Tc(cap,oracle(12000,4000,10,5),0.01,"T1.01","CAPEX = GFA×cost×(1+soft)×(1+cont)","P0");
  Tc(cap,55440000,0.01,"T1.02","CAPEX exact = 55,440,000","P0");
  // Zero inputs
  let p2=P();p2.assets[0].gfa=0;T(computeAssetCapex(p2.assets[0],p2)===0,"T1.03","GFA=0→CAPEX=0","P0");
  p2=P();p2.assets[0].costPerSqm=0;T(computeAssetCapex(p2.assets[0],p2)===0,"T1.04","cost=0→CAPEX=0","P0");
  Tc(computeAssetCapex(A(),P({softCostPct:0})),oracle(12000,4000,0,5),0.01,"T1.05","soft=0","P1");
  Tc(computeAssetCapex(A(),P({contingencyPct:0})),oracle(12000,4000,10,0),0.01,"T1.06","cont=0","P1");
  // Scenarios
  const base=oracle(12000,4000,10,5);
  Tc(computeAssetCapex(A(),P({activeScenario:"CAPEX +10%"})),base*1.1,1,"T1.07","CAPEX+10%","P0");
  Tc(computeAssetCapex(A(),P({activeScenario:"CAPEX -10%"})),base*0.9,1,"T1.08","CAPEX-10%","P0");
  Tc(computeAssetCapex(A(),P({activeScenario:"Custom",customCapexMult:130})),base*1.3,1,"T1.09","Custom 130%","P1");
  // Schedule spread
  const r=computeProjectCashFlows(P());const a=r.assetSchedules[0];
  Tc(a.capexSchedule.reduce((s,v)=>s+v,0),a.totalCapex,0.01,"T1.10","Schedule sums to total","P0");
  Tc(a.capexSchedule[0],a.totalCapex/2,0.01,"T1.11","24mo→2yr even spread","P0");
  T(a.capexSchedule[2]===0,"T1.12","Post-construction=0","P0");
  // Large GFA
  let pBig=P();pBig.assets[0].gfa=1000000;T(isFinite(computeAssetCapex(pBig.assets[0],pBig)),"T1.13","1M sqm no overflow","P1");
})();
console.log("");

// ════════════════════ T2: REVENUE ════════════════════
S("T2: REVENUE [P0] [Unit]");
(()=>{
  const r=computeProjectCashFlows(P());const a=r.assetSchedules[0];
  T(a.revenueSchedule[0]===0,"T2.01","No rev in constr yr0","P0");
  T(a.revenueSchedule[1]===0,"T2.02","No rev in constr yr1","P0");
  T(a.revenueSchedule[2]>0,"T2.03","Rev starts yr2","P0");
  // Ramp: yr1=1/3, yr2=2/3, yr3=full
  const stab=12000*0.80*1200*0.95;
  Tc(a.revenueSchedule[2],stab*(1/3),1,"T2.04","Ramp yr1=stab/3","P0");
  Tc(a.revenueSchedule[3],stab*(2/3)*Math.pow(1.0075,1),1,"T2.05","Ramp yr2=stab×2/3×esc","P0");
  Tc(a.revenueSchedule[4],stab*1.0*Math.pow(1.0075,2),1,"T2.06","Yr3=full stab","P0");
  // Escalation 5%
  const r5=computeProjectCashFlows(P({rentEscalation:5}));
  Tc(r5.assetSchedules[0].revenueSchedule[12],stab*Math.pow(1.05,10),100,"T2.07","5% esc 10yr","P0");
  // Zero occ (BUG-001 regression)
  let pz=P();pz.assets[0].stabilizedOcc=0;T(computeProjectCashFlows(pz).assetSchedules[0].totalRevenue===0,"T2.08","occ=0→rev=0 [BUG-001]","P0");
  // Zero efficiency
  pz=P();pz.assets[0].efficiency=0;T(computeProjectCashFlows(pz).assetSchedules[0].totalRevenue===0,"T2.09","eff=0→rev=0","P0");
  // Zero leaseRate
  pz=P();pz.assets[0].leaseRate=0;T(computeProjectCashFlows(pz).assetSchedules[0].totalRevenue===0,"T2.10","rate=0→rev=0","P0");
  // Operating
  let po=P();po.assets[0].revType="Operating";po.assets[0].opEbitda=5000000;po.assets[0].leaseRate=0;
  Tc(computeProjectCashFlows(po).assetSchedules[0].revenueSchedule[2],5000000/3,1,"T2.11","Operating ramp yr1","P0");
  // Rent scenarios
  const rb=computeProjectCashFlows(P());
  Tc(computeProjectCashFlows(P({activeScenario:"Rent +10%"})).consolidated.totalIncome/rb.consolidated.totalIncome,1.1,0.001,"T2.12","Rent+10%","P0");
  Tc(computeProjectCashFlows(P({activeScenario:"Rent -10%"})).consolidated.totalIncome/rb.consolidated.totalIncome,0.9,0.001,"T2.13","Rent-10%","P0");
  // Delay
  const rd=computeProjectCashFlows(P({activeScenario:"Delay +6 months"}));
  T(rd.assetSchedules[0].revenueSchedule[2]===0,"T2.14","Delay:no rev yr2","P0");
  T(rd.assetSchedules[0].revenueSchedule[3]>0,"T2.15","Delay:rev yr3","P0");
})();
console.log("");

// ════════════════════ T3: LAND ════════════════════
S("T3: LAND [P0] [Unit]");
(()=>{
  // Grace
  const r=computeProjectCashFlows(P({landRentGrace:3}));
  T(r.landSchedule[0]===0,"T3.01","Grace yr0=0","P0");T(r.landSchedule[2]===0,"T3.02","Grace yr2=0","P0");
  Tc(r.landSchedule[3],1000000,0.01,"T3.03","Post-grace=base","P0");
  // Escalation
  const r2=computeProjectCashFlows(P({landRentGrace:0}));
  Tc(r2.landSchedule[0],1000000,0.01,"T3.04","Yr0=base","P0");
  Tc(r2.landSchedule[4],1000000,0.01,"T3.05","Yr4=base(no esc)","P0");
  Tc(r2.landSchedule[5],1050000,0.01,"T3.06","Yr5=5% esc","P0");
  Tc(r2.landSchedule[10],1000000*Math.pow(1.05,2),0.01,"T3.07","Yr10=2nd esc","P0");
  // Term limit
  const r3=computeProjectCashFlows(P({landRentGrace:0,landRentTerm:10,horizon:20}));
  T(r3.landSchedule[9]>0,"T3.08","Yr9 within term","P0");T(r3.landSchedule[10]===0,"T3.09","Yr10 past term","P0");
  // Purchase
  const r4=computeProjectCashFlows(P({landType:"purchase",landPurchasePrice:50000000}));
  Tc(r4.landSchedule[0],50000000,0.01,"T3.10","Purchase yr0","P0");T(r4.landSchedule[1]===0,"T3.11","Purchase yr1=0","P0");
  // Zero rent
  T(computeProjectCashFlows(P({landRentAnnual:0})).landSchedule.every(v=>v===0),"T3.12","Zero rent→all 0","P1");
  // Grace > horizon
  T(computeProjectCashFlows(P({landRentGrace:25,horizon:20})).landSchedule.every(v=>v===0),"T3.13","Grace>horizon→all 0","P2");
})();
console.log("");

// ════════════════════ T4: IRR/NPV ════════════════════
S("T4: IRR & NPV [P0] [Unit]");
(()=>{
  Tc(calcIRR([-1000,100,100,100,100,100,100,100,100,100,1100]),0.10,0.001,"T4.01","Known IRR=10%","P0");
  const cf2=[-1000,200,200,200,200,200,200];Tc(calcNPV(cf2,calcIRR(cf2)),0,1,"T4.02","NPV@IRR≈0","P0");
  Tc(calcNPV([-1000,500,500],0.10),-132.23,1,"T4.03","Known NPV=-132.23","P0");
  T(calcIRR([100,100,100])===null,"T4.04","All pos→null","P0");
  T(calcIRR([-100,-100])===null,"T4.05","All neg→null","P1");
  const cf3=[-1000,300,300,300,300,300];T(calcNPV(cf3,0.10)>calcNPV(cf3,0.20),"T4.06","Higher r→lower NPV","P0");
  T(isFinite(calcIRR([-1e9,...new Array(99).fill(50e6)])||0),"T4.07","100yr no crash","P1");
})();
console.log("");

// ════════════════════ T5: FINANCING ════════════════════
S("T5: FINANCING [P0] [Integration]");
(()=>{
  // Self-funded
  const ps=P({finMode:"self"});const rs=computeProjectCashFlows(ps);const fs=computeFinancing(ps,rs,null);
  T(fs.totalDebt===0,"T5.01","Self:no debt","P0");T(fs.lpEquity===0,"T5.02","Self:no LP","P0");
  Tc(fs.gpEquity,fs.devCostInclLand,0.01,"T5.03","Self:GP=all","P0");
  // Debt structure
  const pd=P({maxLtvPct:60});const rd=computeProjectCashFlows(pd);const fd=computeFinancing(pd,rd,null);
  Tc(fd.totalDebt+fd.totalEquity,fd.devCostInclLand,1,"T5.04","Debt+Eq=DevCost","P0");
  Tc(fd.maxDebt,fd.devCostInclLand*0.60,1,"T5.05","maxDebt=60%","P0");
  T(fd.drawdown.reduce((a,b)=>a+b,0)<=fd.maxDebt+1,"T5.06","Draws≤maxDebt","P0");
  // Grace
  let noRepay=true;for(let y=fd.graceStartIdx;y<fd.repayStart&&y<20;y++)if(fd.repayment[y]>0)noRepay=false;
  T(noRepay,"T5.07","No repay during grace","P0");
  let hasInt=false;for(let y=fd.graceStartIdx;y<fd.repayStart&&y<20;y++)if(fd.originalInterest[y]>0)hasInt=true;
  T(hasInt,"T5.08","Interest during grace","P0");
  // Amortizing fully repaid
  Tc(fd.debtBalClose[19],0,100,"T5.09","Amort:fully repaid","P0");
  // Bullet
  const pb=P({repaymentType:"bullet",loanTenor:7,debtGrace:3});const fb=computeFinancing(pb,computeProjectCashFlows(pb),null);
  const bYr=fb.repayStart+fb.repayYears-1;
  if(bYr<20){T(fb.repayment[bYr]>0,"T5.10a","Bullet:repay in final yr","P0");let mid=false;for(let y=fb.repayStart;y<bYr&&y<20;y++)if(fb.repayment[y]>0)mid=true;T(!mid,"T5.10b","Bullet:no mid repay","P0");}
  // Interest formula
  for(let y=0;y<20;y++){if(fd.originalInterest[y]>0){Tc(fd.originalInterest[y],((fd.debtBalOpen[y]+fd.drawdown[y]+fd.debtBalClose[y])/2)*fd.rate,1,"T5.11","Int=avgBal×rate","P0");break;}}
  // DSCR
  for(let y=0;y<20;y++){if(fd.dscr[y]!==null){const noi=rd.consolidated.income[y]-rd.consolidated.landRent[y];Tc(fd.dscr[y],noi/fd.debtService[y],0.01,"T5.12","DSCR=NOI/DS","P0");break;}}
  // Exit
  T(fd.exitProceeds.some(e=>e>0),"T5.13","Sale exit:proceeds>0","P0");
  T(fd.exitProceeds.every(e=>e>=0),"T5.14","Exit never negative","P0");
  const fh=computeFinancing(P({exitStrategy:"hold"}),rd,null);T(fh.exitProceeds.slice(0,19).every(e=>e===0),"T5.15","Hold:no exit","P0");
  // Disabled debt
  const fn=computeFinancing(P({debtAllowed:false}),rd,null);T(fn.maxDebt===0,"T5.16","debtAllowed=false→0","P0");
  // Upfront fee
  Tc(fd.upfrontFee,fd.maxDebt*0.005,1,"T5.17","Fee=maxDebt×0.5%","P1");
  // Debt balance never negative
  T(fd.debtBalClose.every(v=>v>=-0.01),"T5.18","Balance≥0","P0");
  // GP+LP=100%
  Tc(fd.gpPct+fd.lpPct,1.0,0.001,"T5.19","GP%+LP%=100%","P0");
})();
console.log("");

// ════════════════════ T6: LAND CAP ════════════════════
S("T6: LAND CAPITALIZATION [P0]");
(()=>{
  const r=computeProjectCashFlows(P());
  const fc=computeFinancing(P({landCapitalize:true,landCapRate:2000}),r,null);
  Tc(fc.landCapValue,20000000,0.01,"T6.01","capVal=area×rate","P0");
  const f0=computeFinancing(P({landCapitalize:false}),r,null);
  Tc(fc.devCostInclLand-f0.devCostInclLand,20000000,1,"T6.02","DevCost↑by capVal","P0");
  // GP equity
  const ff=computeFinancing(P({landCapitalize:true,landCapRate:2000,finMode:"fund"}),r,null);
  T(ff.gpEquity>=ff.landCapValue||ff.gpEquity===ff.totalEquity,"T6.03","GP≥landCap","P0");
  // No cap → 50/50
  const fn=computeFinancing(P({landCapitalize:false,finMode:"fund",gpEquityManual:0}),r,null);
  Tc(fn.gpPct,0.5,0.01,"T6.04","No cap→50/50","P0");
  // Disabled
  T(f0.landCapValue===0,"T6.05","Disabled→val=0","P0");
  // Manual override
  const fm=computeFinancing(P({landCapitalize:true,landCapRate:2000,finMode:"fund",gpEquityManual:5000000}),r,null);
  Tc(fm.gpEquity,5000000,1,"T6.06","Manual overrides cap","P0");
})();
console.log("");

// ════════════════════ T7: INCENTIVES ════════════════════
S("T7: INCENTIVES [P0]");
(()=>{
  // CAPEX grant
  let p=P();p.incentives.capexGrant={enabled:true,grantPct:20,maxCap:1e9,timing:"construction"};
  const r=computeProjectCashFlows(p);const inc=computeIncentives(p,r);
  Tc(inc.capexGrantTotal,r.consolidated.totalCapex*0.20,1,"T7.01","Grant=20%","P0");
  // Capped
  let p2=P();p2.incentives.capexGrant={enabled:true,grantPct:50,maxCap:5000000,timing:"construction"};
  Tc(computeIncentives(p2,computeProjectCashFlows(p2)).capexGrantTotal,5000000,1,"T7.02","Capped@5M","P0");
  // Adjusted CAPEX reduced
  T(inc.adjustedCapex.reduce((a,b)=>a+b,0)<r.consolidated.totalCapex,"T7.03","adjCapex<original","P0");
  // Grant schedule sums
  Tc(inc.capexGrantSchedule.reduce((a,b)=>a+b,0),inc.capexGrantTotal,1,"T7.04","Schedule=total","P0");
  // Land rebate
  let pl=P({landRentGrace:0});pl.incentives.landRentRebate={enabled:true,constrRebatePct:100,constrRebateYears:2,operRebatePct:50,operRebateYears:3};
  const rl=computeProjectCashFlows(pl);const incl=computeIncentives(pl,rl);
  Tc(incl.landRentSavingSchedule[0],1000000,1,"T7.05","100% rebate yr0","P0");
  Tc(incl.landRentSavingSchedule[2],500000,1,"T7.06","50% oper yr2","P0");
  Tc(incl.landRentSavingSchedule[5],0,1,"T7.07","No rebate yr5","P0");
  // BUG-002 FIXED: adjusted should be LOWER than original (rebate reduces rent)
  T(incl.adjustedLandRent[0]<rl.consolidated.landRent[0],"T7.08","[BUG-002 FIXED] adjRent<original","P0");
  // Interest subsidy
  let pi=P();pi.incentives.financeSupport={enabled:true,subType:"interestSubsidy",subsidyPct:50,subsidyYears:3,subsidyStart:"operation"};
  const fi=computeFinancing(pi,computeProjectCashFlows(pi),null);const fb=computeFinancing(P(),computeProjectCashFlows(P()),null);
  T(fi.totalInterest<fb.totalInterest,"T7.09","Subsidy↓interest","P0");
  T(fi.interestSubsidyTotal>0,"T7.10","SubsidyTotal>0","P0");
  // Disabled
  T(computeIncentives(P(),computeProjectCashFlows(P())).totalIncentiveValue===0,"T7.11","Disabled=0","P1");
})();
console.log("");

// ════════════════════ T8: DATA INTEGRITY ════════════════════
S("T8: DATA INTEGRITY [P0]");
(()=>{
  const p=P();const r=computeProjectCashFlows(p);const c=r.consolidated;const h=r.horizon;
  let ok=true;for(let y=0;y<h;y++)if(Math.abs(c.netCF[y]-(c.income[y]-c.landRent[y]-c.capex[y]))>0.01)ok=false;
  T(ok,"T8.01","netCF=inc-land-capex ∀yr","P0");
  Tc(c.totalCapex,Object.values(r.phaseResults).reduce((s,p)=>s+p.totalCapex,0),1,"T8.02","Consol=Σphase","P0");
  Tc(c.totalCapex,r.assetSchedules.reduce((s,a)=>s+a.totalCapex,0),1,"T8.03","Consol=Σasset","P0");
  T(c.netCF.every(v=>!isNaN(v)),"T8.04","No NaN","P0");
  T(c.netCF.every(v=>isFinite(v)),"T8.05","No Infinity","P0");
  T(c.income.every(v=>v>=0),"T8.06","Rev≥0","P0");
  T(c.capex.every(v=>v>=0),"T8.07","CAPEX≥0","P0");
  Tc(Object.values(r.phaseResults).reduce((s,p)=>s+p.allocPct,0),1.0,0.01,"T8.08","Alloc=100%","P0");
  const f=computeFinancing(p,r,null);
  T(f.debtBalClose.every(v=>v>=-0.01),"T8.09","DebtBal≥0","P0");
  Tc(f.totalDebt+f.gpEquity+f.lpEquity,f.devCostInclLand,10000,"T8.10","D+GP+LP=DevCost","P0");
})();
console.log("");

// ════════════════════ T9: EDGE CASES ════════════════════
S("T9: EDGE CASES [P1]");
(()=>{
  let pe=P();pe.assets=[];const re=computeProjectCashFlows(pe);
  T(re.consolidated.totalCapex===0,"T9.01","NoAsset:capex=0","P1");
  T(re.consolidated.totalIncome===0,"T9.02","NoAsset:inc=0","P1");
  T(computeProjectCashFlows(P({horizon:1})).consolidated.netCF.length===1,"T9.03","H=1:1yr","P1");
  T(isFinite(computeProjectCashFlows(P({rentEscalation:50})).consolidated.totalIncome),"T9.04","50%esc:finite","P1");
  const f100=computeFinancing(P({maxLtvPct:100}),computeProjectCashFlows(P()),null);
  Tc(f100.maxDebt,f100.devCostInclLand,1,"T9.05","100%LTV","P1");
  // 1mo construction
  let p1m=P();p1m.assets[0].constrDuration=1;const r1m=computeProjectCashFlows(p1m);
  T(r1m.assetSchedules[0].capexSchedule[0]>0,"T9.06","1mo:capex yr0","P1");
  T(r1m.assetSchedules[0].revenueSchedule[1]>0,"T9.07","1mo:rev yr1","P1");
})();
console.log("");

// ════════════════════ T10: MULTI-PHASE ════════════════════
S("T10: MULTI-PHASE [P0]");
(()=>{
  const p=P();p.phases.push({name:"Phase 2",startYearOffset:3,footprint:0});
  p.assets[0].footprint=6000;p.assets.push(A({id:"a2",phase:"Phase 2",name:"Office",footprint:4000,gfa:8000,costPerSqm:3000,leaseRate:900,efficiency:90,constrStart:3}));
  const r=computeProjectCashFlows(p);
  Tc(r.phaseResults["Phase 1"].allocPct,0.6,0.001,"T10.01","P1=60%","P0");
  Tc(r.phaseResults["Phase 2"].allocPct,0.4,0.001,"T10.02","P2=40%","P0");
  Tc(r.consolidated.totalIncome,r.phaseResults["Phase 1"].totalIncome+r.phaseResults["Phase 2"].totalIncome,1,"T10.03","Consol=Σphase inc","P0");
  Tc(r.consolidated.totalCapex,r.phaseResults["Phase 1"].totalCapex+r.phaseResults["Phase 2"].totalCapex,1,"T10.04","Consol=Σphase cap","P0");
})();
console.log("");

// ════════════════════ T11: INCENTIVES+FINANCING ════════════════════
S("T11: INCENTIVES+FINANCING [P0]");
(()=>{
  let pg=P();pg.incentives.capexGrant={enabled:true,grantPct:25,maxCap:1e9,timing:"construction"};
  const rg=computeProjectCashFlows(pg);const ig=computeIncentives(pg,rg);const fg=computeFinancing(pg,rg,ig);const fb=computeFinancing(P(),computeProjectCashFlows(P()),null);
  T(fg.devCostExclLand<fb.devCostExclLand,"T11.01","Grant↓devCost","P0");
  Tc(ig.capexGrantSchedule.reduce((a,b)=>a+b,0),ig.capexGrantTotal,1,"T11.02","GrantSch=total","P0");
  // Subsidy
  let ps=P();ps.incentives.financeSupport={enabled:true,subType:"interestSubsidy",subsidyPct:50,subsidyYears:5,subsidyStart:"operation"};
  const fs=computeFinancing(ps,computeProjectCashFlows(ps),null);
  if(fs.leveredIRR!=null&&fb.leveredIRR!=null)T(fs.leveredIRR>=fb.leveredIRR,"T11.03","Subsidy↑IRR","P0");
})();
console.log("");

// ════════════════════ T12: SCENARIOS ════════════════════
S("T12: SCENARIOS [P1]");
(()=>{
  const b=computeProjectCashFlows(P());
  const cu=computeProjectCashFlows(P({activeScenario:"CAPEX +10%"}));
  T(cu.consolidated.totalCapex>b.consolidated.totalCapex,"T12.01","CAPEX+10%:↑capex","P1");
  if(cu.consolidated.irr!=null&&b.consolidated.irr!=null)T(cu.consolidated.irr<b.consolidated.irr,"T12.02","CAPEX+10%:↓IRR","P1");
  const ru=computeProjectCashFlows(P({activeScenario:"Rent +10%"}));
  T(ru.consolidated.totalIncome>b.consolidated.totalIncome,"T12.03","Rent+10%:↑income","P1");
  if(ru.consolidated.irr!=null&&b.consolidated.irr!=null)T(ru.consolidated.irr>b.consolidated.irr,"T12.04","Rent+10%:↑IRR","P1");
  Tc(computeProjectCashFlows(P({activeScenario:"CAPEX -10%"})).consolidated.totalCapex/b.consolidated.totalCapex,0.9,0.001,"T12.05","CAPEX-10%=90%","P1");
  T(computeProjectCashFlows(P({activeScenario:"Escalation +0.5%"})).consolidated.totalIncome>b.consolidated.totalIncome,"T12.06","Esc+0.5%:↑income","P1");
})();
console.log("");

// ════════════════════ RESULTS ════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED | ${total} TOTAL`);
console.log(`${"═".repeat(60)}`);
if(P0_FAILS.length>0){console.log("\n  🔴 P0 FAILURES:");P0_FAILS.forEach(f=>{console.log(`     ✗ [${f.id}] ${f.test}`);if(f.detail)console.log(`       → ${f.detail}`);});}
if(failures.length>P0_FAILS.length){console.log("\n  🟡 Other:");failures.filter(f=>f.priority!=="P0").forEach(f=>{console.log(`     ✗ [${f.id}] [${f.priority}] ${f.test}`);});}
if(failed===0)console.log("\n  ✅ ALL TESTS PASSED");
console.log(`\n  KNOWN BUGS:`);
console.log(`    BUG-001: stabilizedOcc=0→100% [FIXED in App.jsx:506]`);
console.log(`    BUG-002: Land rent rebate sign error [FIXED in App.jsx:699]`);
process.exit(failed>0?1:0);
