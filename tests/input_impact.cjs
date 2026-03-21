const { computeProjectCashFlows, computeIncentives, computeFinancing, computeWaterfall,
  calcIRR, calcNPV, calcHotelEBITDA, calcMarinaEBITDA, defaultHotelPL, defaultMarinaPL } = require('./helpers/engine.cjs');

let passed = 0, failed = 0;
const issues = [];
function chk(name, ok, reason) {
  if (ok) { passed++; process.stdout.write('.'); }
  else { failed++; issues.push(name+': '+reason); process.stdout.write('X'); }
}

function makeProject(ov) {
  return { id:'t', name:'T', startYear:2026, horizon:50, currency:'SAR',
    landType:'lease', landArea:500000,
    landRentAnnual:5000000, landRentEscalation:5, landRentEscalationEveryN:5,
    landRentGrace:3, landRentTerm:50, landLeaseStartYear:0, landRentStartRule:'auto', landRentManualAlloc:null,
    landPurchasePrice:100000000, partnerEquityPct:30, landValuation:200000000, botOperationYears:25,
    softCostPct:10, contingencyPct:5, rentEscalation:2, defaultEfficiency:85, defaultLeaseRate:700, defaultCostPerSqm:3500,
    activeScenario:'Base Case', customCapexMult:100, customRentMult:100, customDelay:0, customEscAdj:0,
    phases:[{name:'Phase 1',completionMonth:36}],
    assets:[
      { id:'a1',phase:'Phase 1',category:'Retail',name:'Mall',code:'R1',plotArea:20000,footprint:8000,gfa:32000,
        revType:'Lease',efficiency:85,leaseRate:800,stabilizedOcc:90,costPerSqm:4000,constrDuration:24,rampUpYears:3,escalation:2,
        salePricePerSqm:0,absorptionYears:3,commissionPct:0,preSalePct:0,opEbitda:0,hotelPL:null,marinaPL:null },
      { id:'a2',phase:'Phase 1',category:'Hospitality',name:'Hotel',code:'H1',plotArea:15000,footprint:5000,gfa:20000,
        revType:'Operating',efficiency:0,leaseRate:0,stabilizedOcc:0,costPerSqm:6000,constrDuration:30,rampUpYears:3,escalation:2,
        opEbitda:35000000,hotelPL:null,marinaPL:null,salePricePerSqm:0,absorptionYears:0,commissionPct:0,preSalePct:0 },
    ],
    finMode:'fund',vehicleType:'fund',fundName:'TF',debtAllowed:true,maxLtvPct:30,financeRate:6.5,
    loanTenor:7,debtGrace:3,graceBasis:'cod',upfrontFeePct:0.5,repaymentType:'amortizing',islamicMode:'conventional',
    exitStrategy:'sale',exitYear:0,exitMultiple:10,exitCapRate:9,exitCostPct:2,
    landCapitalize:true,landCapRate:600,landCapTo:'gp',landRentPaidBy:'auto',gpEquityManual:0,lpEquityManual:0,fundStartYear:0,
    prefReturnPct:15,gpCatchup:true,carryPct:30,lpProfitSplitPct:70,
    feeTreatment:'capital',subscriptionFeePct:2,annualMgmtFeePct:0.9,custodyFeeAnnual:130000,
    mgmtFeeBase:'deployed',developerFeePct:10,structuringFeePct:1,
    incentives:{
      capexGrant:{enabled:true,grantPct:25,maxCap:50000000,phases:[],timing:'construction'},
      financeSupport:{enabled:true,subType:'interestSubsidy',subsidyPct:50,subsidyYears:5,subsidyStart:'operation',softLoanAmount:0,softLoanTenor:10,softLoanGrace:3,phases:[]},
      landRentRebate:{enabled:true,constrRebatePct:100,constrRebateYears:0,operRebatePct:50,operRebateYears:3,phases:[]},
      feeRebates:{enabled:true,items:[{name:'Permit',type:'rebate',amount:500000,year:1,deferralMonths:12}],phases:[]},
    }, ...ov };
}
function run(p){const r=computeProjectCashFlows(p);const inc=computeIncentives(p,r);const f=computeFinancing(p,r,inc);const w=computeWaterfall(p,r,f,inc);return{r,f,w,inc,c:r.consolidated};}
function wA(i,k,v){const p=makeProject();p.assets=p.assets.map((a,j)=>j===i?{...a,[k]:v}:a);return p;}
function wI(m,k,v){const p=makeProject();p.incentives=JSON.parse(JSON.stringify(p.incentives));p.incentives[m]={...p.incentives[m],[k]:v};return p;}
const B=run(makeProject());

console.log('INPUT IMPACT VERIFICATION TEST\n');

// [1] General
process.stdout.write('[1] General: ');
let M;
M=run(makeProject({startYear:2030}));chk('startYear',M.r.startYear===2030,'not set');
M=run(makeProject({horizon:20}));chk('horizon',M.r.horizon===20,'not set');
M=run(makeProject({activeScenario:'CAPEX +10%'}));chk('scn CAPEX+10%',M.c.totalCapex>B.c.totalCapex*1.05,'no impact');
M=run(makeProject({activeScenario:'Rent -10%'}));chk('scn Rent-10%',M.c.totalIncome<B.c.totalIncome*0.95,'no impact');
M=run(makeProject({activeScenario:'Delay +6 months'}));chk('scn Delay',M.c.irr!==B.c.irr,'no impact');
M=run(makeProject({activeScenario:'Custom',customCapexMult:120}));chk('customCapexMult',M.c.totalCapex>B.c.totalCapex*1.15,'no impact');
M=run(makeProject({activeScenario:'Custom',customRentMult:80}));chk('customRentMult',M.c.totalIncome<B.c.totalIncome*0.85,'no impact');
M=run(makeProject({activeScenario:'Custom',customDelay:12}));chk('customDelay',M.c.irr!==B.c.irr,'no impact');
M=run(makeProject({activeScenario:'Custom',customEscAdj:3}));chk('customEscAdj',M.c.totalIncome!==B.c.totalIncome,'no impact');

// [2] Land
process.stdout.write('\n[2] Land: ');
M=run(makeProject({landArea:1000000}));chk('landArea',M.f.landCapValue>B.f.landCapValue,'no impact');
M=run(makeProject({landRentAnnual:10000000}));chk('landRentAnnual',M.c.totalLandRent>B.c.totalLandRent,'no impact');
M=run(makeProject({landRentEscalation:10}));chk('landRentEsc',M.c.totalLandRent>B.c.totalLandRent*1.1,'no impact');
M=run(makeProject({landRentEscalationEveryN:1}));chk('escEveryN',M.c.totalLandRent>B.c.totalLandRent*1.1,'no impact');
M=run(makeProject({landRentGrace:10,landRentStartRule:'grace'}));var bg=run(makeProject({landRentGrace:3,landRentStartRule:'grace'}));chk('landRentGrace',M.c.totalLandRent<bg.c.totalLandRent,'no impact');
M=run(makeProject({landRentTerm:10}));chk('landRentTerm',M.c.totalLandRent<B.c.totalLandRent,'no impact');
M=run(makeProject({landRentStartRule:'income'}));chk('startRule',M.r.landRentMeta.startRule==='income','not set');
M=run(makeProject({landType:'purchase',landPurchasePrice:100000000}));chk('landType=purchase',M.c.totalLandRent===0&&M.c.totalCapex>B.c.totalCapex,'no impact');
var M2=run(makeProject({landType:'purchase',landPurchasePrice:200000000}));chk('purchasePrice',M2.c.totalCapex>M.c.totalCapex,'no impact');
M=run(makeProject({landType:'bot',botOperationYears:10}));chk('botYears',M.c.totalIncome<B.c.totalIncome,'no impact');

// [3] Defaults
process.stdout.write('\n[3] Defaults: ');
M=run(makeProject({softCostPct:20}));chk('softCostPct',M.c.totalCapex>B.c.totalCapex*1.05,'no impact');
M=run(makeProject({contingencyPct:15}));chk('contingencyPct',M.c.totalCapex>B.c.totalCapex*1.05,'no impact');
var pe1=makeProject({rentEscalation:5});pe1.assets=pe1.assets.map(a=>({...a,escalation:null}));var pe0=makeProject();pe0.assets=pe0.assets.map(a=>({...a,escalation:null}));M=run(pe1);var be=run(pe0);chk('rentEscalation',M.c.totalIncome>be.c.totalIncome*1.1,'no impact');

// [4] Assets
process.stdout.write('\n[4] Assets: ');
M=run(wA(0,'gfa',64000));chk('gfa',M.c.totalCapex>B.c.totalCapex*1.3,'no CAPEX impact');
M=run(wA(0,'costPerSqm',8000));chk('costPerSqm',M.c.totalCapex>B.c.totalCapex*1.3,'no CAPEX impact');
M=run(wA(0,'leaseRate',1500));chk('leaseRate',M.c.totalIncome>B.c.totalIncome*1.05,'no income impact');
M=run(wA(0,'efficiency',95));chk('efficiency',M.c.totalIncome>B.c.totalIncome,'no impact');
M=run(wA(0,'stabilizedOcc',50));chk('stabilizedOcc',M.c.totalIncome<B.c.totalIncome,'no impact');
M=run(wA(0,'constrDuration',48));chk('constrDuration',M.c.irr!==B.c.irr,'no IRR impact');
M=run(wA(0,'rampUpYears',1));chk('rampUpYears',M.c.totalIncome!==B.c.totalIncome,'no impact');
M=run(wA(0,'escalation',5));chk('escalation(asset)',M.c.totalIncome>B.c.totalIncome*1.1,'no impact');
M=run(wA(1,'opEbitda',50000000));chk('opEbitda',M.c.totalIncome>B.c.totalIncome,'no impact');

// Sale fields
var ps=makeProject();ps.assets=ps.assets.map((a,i)=>i===0?{...a,revType:'Sale',salePricePerSqm:5000,absorptionYears:3,efficiency:90,commissionPct:0,preSalePct:0}:a);var bs=run(ps);
var ps2=makeProject();ps2.assets=ps2.assets.map((a,i)=>i===0?{...a,revType:'Sale',salePricePerSqm:10000,absorptionYears:3,efficiency:90,commissionPct:0,preSalePct:0}:a);M=run(ps2);chk('salePricePerSqm',M.c.totalIncome>bs.c.totalIncome,'no impact');
var ps3={...ps,assets:ps.assets.map((a,i)=>i===0?{...a,absorptionYears:1}:a)};M=run(ps3);chk('absorptionYears',M.c.irr!==bs.c.irr,'no IRR impact');
var ps4={...ps,assets:ps.assets.map((a,i)=>i===0?{...a,commissionPct:5}:a)};M=run(ps4);chk('commissionPct',M.c.totalIncome<bs.c.totalIncome,'no impact');
var ps5={...ps,assets:ps.assets.map((a,i)=>i===0?{...a,preSalePct:30}:a)};M=run(ps5);chk('preSalePct',M.c.irr!==bs.c.irr,'no IRR impact');

// [5] Hotel PL
process.stdout.write('\n[5] Hotel: ');
function wH(k,v){var p=makeProject();var h={...defaultHotelPL(),keys:200,adr:800,[k]:v};var e=calcHotelEBITDA(h).ebitda;p.assets=p.assets.map((a,i)=>i===1?{...a,hotelPL:h,opEbitda:e}:a);return p;}
var bh=run(wH('keys',200));
M=run(wH('keys',400));chk('keys',M.c.totalIncome>bh.c.totalIncome*1.3,'no impact');
M=run(wH('adr',1200));chk('adr',M.c.totalIncome>bh.c.totalIncome*1.1,'no impact');
M=run(wH('stabOcc',90));chk('stabOcc',M.c.totalIncome>bh.c.totalIncome,'no impact');
M=run(wH('roomExpPct',40));chk('roomExpPct',M.c.totalIncome<bh.c.totalIncome,'no impact');
M=run(wH('fbPct',35));chk('fbPct',M.c.totalIncome!==bh.c.totalIncome,'no impact');
M=run(wH('undistPct',45));chk('undistPct',M.c.totalIncome<bh.c.totalIncome,'no impact');
M=run(wH('fixedPct',18));chk('fixedPct',M.c.totalIncome<bh.c.totalIncome,'no impact');
M=run(wH('daysYear',300));chk('daysYear',M.c.totalIncome<bh.c.totalIncome,'no impact');
M=run(wH('roomsPct',60));chk('roomsPct',M.c.totalIncome!==bh.c.totalIncome,'no impact');
M=run(wH('micePct',10));chk('micePct',M.c.totalIncome!==bh.c.totalIncome,'no impact');
M=run(wH('miceExpPct',80));chk('miceExpPct',M.c.totalIncome<bh.c.totalIncome,'no impact');
M=run(wH('fbExpPct',80));chk('fbExpPct',M.c.totalIncome<bh.c.totalIncome,'no impact');
M=run(wH('otherExpPct',80));chk('otherExpPct',M.c.totalIncome<bh.c.totalIncome,'no impact');

// [6] Marina PL
process.stdout.write('\n[6] Marina: ');
function wMr(k,v){var p=makeProject();var m={...defaultMarinaPL(),berths:100,[k]:v};var e=calcMarinaEBITDA(m).ebitda;p.assets=p.assets.map((a,i)=>i===1?{...a,marinaPL:m,revType:'Operating',opEbitda:e}:a);return p;}
var bm=run(wMr('berths',100));
M=run(wMr('berths',200));chk('berths',M.c.totalIncome>bm.c.totalIncome,'no impact');
M=run(wMr('avgLength',25));chk('avgLength',M.c.totalIncome>bm.c.totalIncome,'no impact');
M=run(wMr('unitPrice',4000));chk('unitPrice',M.c.totalIncome>bm.c.totalIncome,'no impact');
M=run(wMr('stabOcc',50));chk('stabOcc',M.c.totalIncome<bm.c.totalIncome,'no impact');
M=run(wMr('fuelPct',40));chk('fuelPct',M.c.totalIncome!==bm.c.totalIncome,'no impact');
M=run(wMr('berthingOpexPct',80));chk('berthingOpex',M.c.totalIncome<bm.c.totalIncome,'no impact');
M=run(wMr('fuelOpexPct',50));chk('fuelOpexPct',M.c.totalIncome>bm.c.totalIncome,'no impact');
M=run(wMr('otherRevPct',25));chk('otherRevPct',M.c.totalIncome!==bm.c.totalIncome,'no impact');
M=run(wMr('otherOpexPct',60));chk('otherOpex',M.c.totalIncome<bm.c.totalIncome,'no impact');

// [7] Financing
process.stdout.write('\n[7] Financing: ');
M=run(makeProject({finMode:'self'}));chk('finMode=self',M.f.mode==='self'&&M.f.totalDebt===0,'not applied');
M=run(makeProject({finMode:'debt'}));chk('finMode=debt',M.f.mode==='debt'&&M.f.totalDebt>0,'not applied');
M=run(makeProject({maxLtvPct:50}));chk('maxLtvPct',M.f.maxDebt!==B.f.maxDebt,'no impact');
M=run(makeProject({financeRate:9}));chk('financeRate',M.f.totalInterest>B.f.totalInterest*1.2,'no impact');
M=run(makeProject({loanTenor:15}));chk('loanTenor',M.f.totalInterest!==B.f.totalInterest,'no impact');
M=run(makeProject({debtGrace:5}));chk('debtGrace',M.f.totalInterest!==B.f.totalInterest,'no impact');
M=run(makeProject({graceBasis:'firstDraw'}));chk('graceBasis',M.f.repayStart!==B.f.repayStart||M.f.totalInterest!==B.f.totalInterest,'no impact');
M=run(makeProject({upfrontFeePct:2}));chk('upfrontFeePct',M.f.totalInterest>B.f.totalInterest,'no impact');
M=run(makeProject({repaymentType:'bullet'}));chk('repayType',M.f.totalInterest!==B.f.totalInterest,'no impact');
M=run(makeProject({exitStrategy:'hold'}));chk('exit=hold',M.f.exitProceeds.reduce((a,b)=>a+b,0)===0,'still has exit');
M=run(makeProject({exitMultiple:15}));chk('exitMultiple',M.f.exitProceeds.reduce((a,b)=>a+b,0)>B.f.exitProceeds.reduce((a,b)=>a+b,0),'no impact');
M=run(makeProject({exitYear:15}));chk('exitYear',M.f.exitYear!==B.f.exitYear,'no impact');
M=run(makeProject({exitCostPct:5}));chk('exitCostPct',M.f.exitProceeds.reduce((a,b)=>a+b,0)<B.f.exitProceeds.reduce((a,b)=>a+b,0),'no impact');
M=run(makeProject({landCapitalize:false}));chk('landCap=off',M.f.landCapValue===0,'still has cap');
M=run(makeProject({landCapRate:1200}));chk('landCapRate',M.f.landCapValue>B.f.landCapValue,'no impact');
M=run(makeProject({landCapTo:'lp'}));chk('landCapTo',M.f.gpEquity!==B.f.gpEquity,'no impact');
M=run(makeProject({gpEquityManual:100000000}));chk('gpEquityManual',M.f.gpEquity!==B.f.gpEquity,'no impact');

// [8] Waterfall
process.stdout.write('\n[8] Waterfall: ');
// Waterfall tests need high exit multiple so cash flows through all tiers
var BW=run(makeProject({exitMultiple:25}));
M=run(makeProject({prefReturnPct:8,exitMultiple:25}));chk('prefReturn',M.w&&M.w.lpIRR!==BW.w.lpIRR,'no impact');
M=run(makeProject({carryPct:10,exitMultiple:25}));chk('carryPct',M.w&&M.w.gpTotalDist!==BW.w.gpTotalDist,'no impact');
M=run(makeProject({lpProfitSplitPct:80,exitMultiple:25}));chk('lpSplit',M.w&&M.w.lpTotalDist!==BW.w.lpTotalDist,'no impact');
M=run(makeProject({gpCatchup:false,exitMultiple:25}));chk('catchup=off',M.w&&M.w.tier3.reduce((a,b)=>a+b,0)===0,'T3 not 0');
M=run(makeProject({feeTreatment:'expense',exitMultiple:25}));chk('feeTreat=expense',M.w&&M.w.lpIRR!==BW.w.lpIRR,'no impact');
M=run(makeProject({feeTreatment:'rocOnly',exitMultiple:25}));chk('feeTreat=rocOnly',M.w&&M.w.lpIRR!==BW.w.lpIRR,'no impact');
M=run(makeProject({subscriptionFeePct:5}));chk('subFee',M.w&&M.w.totalFees>B.w.totalFees,'no impact');
M=run(makeProject({annualMgmtFeePct:3}));chk('mgmtFee',M.w&&M.w.totalFees>B.w.totalFees*1.5,'no impact');
M=run(makeProject({mgmtFeeBase:'devCost'}));chk('mgmtBase=dev',M.w&&M.w.totalFees!==B.w.totalFees,'no impact');
M=run(makeProject({mgmtFeeBase:'equity'}));chk('mgmtBase=eq',M.w&&M.w.totalFees!==B.w.totalFees,'no impact');
M=run(makeProject({developerFeePct:5}));chk('devFee',M.w&&M.w.totalFees<B.w.totalFees,'no impact');
M=run(makeProject({structuringFeePct:3}));chk('structFee',M.w&&M.w.totalFees>B.w.totalFees,'no impact');
M=run(makeProject({custodyFeeAnnual:500000}));chk('custody',M.w&&M.w.totalFees>B.w.totalFees,'no impact');
M=run(makeProject({fundStartYear:2025}));chk('fundStart',M.w&&M.w.totalFees!==B.w.totalFees,'no impact');
M=run(makeProject({landRentPaidBy:'gp'}));chk('rentPaidBy=gp',M.w&&M.w.gpLandRentTotal>0,'GP rent=0');

// [9] Incentives
process.stdout.write('\n[9] Incentives: ');
M=run(wI('capexGrant','enabled',false));chk('grant.off',M.inc.capexGrantTotal<B.inc.capexGrantTotal,'no impact');
M=run(wI('capexGrant','grantPct',50));var bgr=run(wI('capexGrant','maxCap',500000000));M=run((function(){var p=makeProject();p.incentives=JSON.parse(JSON.stringify(p.incentives));p.incentives.capexGrant.grantPct=50;p.incentives.capexGrant.maxCap=500000000;return p;})());bgr=run((function(){var p=makeProject();p.incentives=JSON.parse(JSON.stringify(p.incentives));p.incentives.capexGrant.grantPct=25;p.incentives.capexGrant.maxCap=500000000;return p;})());chk('grantPct',M.inc.capexGrantTotal>bgr.inc.capexGrantTotal,'no impact');
M=run(wI('capexGrant','maxCap',10000000));chk('maxCap',M.inc.capexGrantTotal<=10000001,'not capping');
M=run(wI('landRentRebate','enabled',false));chk('rentRebate.off',M.inc.landRentSavingTotal<B.inc.landRentSavingTotal,'no impact');
M=run(wI('landRentRebate','operRebatePct',80));chk('operRebatePct',M.inc.landRentSavingTotal>B.inc.landRentSavingTotal,'no impact');
M=run(wI('landRentRebate','operRebateYears',10));chk('operRebateYrs',M.inc.landRentSavingTotal>B.inc.landRentSavingTotal,'no impact');
M=run(wI('financeSupport','enabled',false));chk('finSup.off',M.f.interestSubsidyTotal<B.f.interestSubsidyTotal,'no impact');
M=run(wI('financeSupport','subsidyPct',80));chk('subsidyPct',M.f.interestSubsidyTotal>B.f.interestSubsidyTotal,'no impact');
var bsy=run(wI('financeSupport','subsidyYears',2));M=run(wI('financeSupport','subsidyYears',10));chk('subsidyYrs',M.f.interestSubsidyTotal>bsy.f.interestSubsidyTotal,'no impact');

// [10] Cross-impact (correct place ONLY)
process.stdout.write('\n[10] Cross: ');
M=run(wA(0,'leaseRate',1200));chk('rate->Inc NOT capex',M.c.totalIncome>B.c.totalIncome&&M.c.totalCapex===B.c.totalCapex,'leaking');
M=run(wA(0,'costPerSqm',8000));chk('cost->CAPEX NOT inc',M.c.totalCapex>B.c.totalCapex&&M.c.totalIncome===B.c.totalIncome,'leaking');
M=run(makeProject({landRentAnnual:10000000}));chk('rent->LandRent ONLY',M.c.totalLandRent>B.c.totalLandRent&&M.c.totalCapex===B.c.totalCapex&&M.c.totalIncome===B.c.totalIncome,'leaking');
M=run(makeProject({financeRate:9}));chk('rate->Interest ONLY',M.f.totalInterest>B.f.totalInterest&&M.c.totalCapex===B.c.totalCapex&&M.c.totalIncome===B.c.totalIncome,'leaking');
M=run(makeProject({prefReturnPct:8,exitMultiple:25}));chk('pref->WF NOT levered',M.w.lpIRR!==BW.w.lpIRR&&M.f.leveredIRR===BW.f.leveredIRR,'leaking');
M=run(makeProject({exitMultiple:15}));chk('exitMult->Exit NOT rev',M.f.exitProceeds.reduce((a,b)=>a+b,0)>B.f.exitProceeds.reduce((a,b)=>a+b,0)&&M.c.totalIncome===B.c.totalIncome,'leaking');
M=run(makeProject({financeRate:12}));chk('rate!->UnlevIRR',M.c.irr===B.c.irr,'Unlev IRR changed by rate');
M=run(makeProject({prefReturnPct:5}));chk('pref!->UnlevIRR',M.c.irr===B.c.irr,'Unlev IRR changed by pref');
M=run(makeProject({prefReturnPct:5}));chk('pref!->LevIRR',M.f.leveredIRR===B.f.leveredIRR,'Lev IRR changed by pref');
M=run(makeProject({prefReturnPct:5,exitMultiple:25}));chk('pref->LPIRR YES',M.w.lpIRR!==BW.w.lpIRR,'LP IRR not affected');

console.log('\n\n' + '='.repeat(50));
console.log('  INPUT IMPACT: ' + passed + ' PASSED | ' + failed + ' FAILED');
console.log('='.repeat(50));
if(issues.length>0){console.log('\n  ISSUES:');issues.forEach(i=>console.log('    '+i));}
if(failed===0) console.log('\n  ALL INPUTS VERIFIED');
process.exit(failed>0?1:0);
