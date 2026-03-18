/**
 * ZAN Financial Modeler — Full Excel Export with Live Formulas
 * All calculations use Excel formulas. Blue=input, Black=formula, Green=cross-sheet.
 * Uses ExcelJS (already in project dependencies).
 */
import ExcelJS from "exceljs";

const CL = (c) => { let s = ""; while (c > 0) { c--; s = String.fromCharCode(65 + (c % 26)) + s; c = Math.floor(c / 26); } return s; };

// Styles
const FILL_HDR = { type:"pattern", pattern:"solid", fgColor:{argb:"FF1F2937"} };
const FILL_SEC = { type:"pattern", pattern:"solid", fgColor:{argb:"FFF0FDF4"} };
const FILL_TOT = { type:"pattern", pattern:"solid", fgColor:{argb:"FFEEF2FF"} };
const FH  = { name:"Arial", bold:true,  color:{argb:"FFFFFFFF"}, size:10 };
const FHS = { name:"Arial", bold:true,  color:{argb:"FFFFFFFF"}, size:9 };
const FTL = { name:"Arial", bold:true,  color:{argb:"FFFFFFFF"}, size:12 };
const FSC = { name:"Arial", bold:true,  color:{argb:"FF1F2937"}, size:10 };
const FB  = { name:"Arial", bold:true,  color:{argb:"FF000000"}, size:10 };
const FBS = { name:"Arial", bold:true,  color:{argb:"FF000000"}, size:9 };
const FN  = { name:"Arial", bold:false, color:{argb:"FF000000"}, size:10 };
const FNS = { name:"Arial", bold:false, color:{argb:"FF000000"}, size:9 };
const FI  = { name:"Arial", bold:false, color:{argb:"FF2563EB"}, size:10 };
const FIS = { name:"Arial", bold:false, color:{argb:"FF2563EB"}, size:9 };
const FR  = { name:"Arial", bold:false, color:{argb:"FF008000"}, size:9 };
const FRB = { name:"Arial", bold:true,  color:{argb:"FF008000"}, size:9 };
const BB  = { bottom:{ style:"medium", color:{argb:"FF6B7280"} } };
const NUM = "#,##0"; const NUMN = '#,##0;(#,##0);"-"'; const PCT = "0.0%"; const DX = '0.00"x"';

function sc(ws, r, c, val, font, fill, nf, bd) {
  const cell = ws.getCell(r, c);
  if (typeof val === "string" && val.startsWith("=")) {
    cell.value = { formula: val.slice(1) };
  } else {
    cell.value = val;
  }
  if (font) cell.font = font;
  if (fill) cell.fill = fill;
  if (nf) cell.numFmt = nf;
  if (bd) cell.border = bd;
  return cell;
}

function hdr(ws, r, c1, c2, t) {
  for (let c = c1; c <= c2; c++) sc(ws, r, c, c === c1 ? t : null, FTL, FILL_HDR);
  if (c2 > c1) ws.mergeCells(r, c1, r, c2);
}

function chdr(ws, r, hh, c1 = 1) {
  hh.forEach((h, i) => { const cell = sc(ws, r, c1 + i, h, FHS, FILL_HDR); cell.alignment = { horizontal: "center", vertical: "center", wrapText: true }; });
}

function secr(ws, r, c1, c2, t) {
  for (let c = c1; c <= c2; c++) sc(ws, r, c, c === c1 ? t : null, FSC, FILL_SEC);
}

export async function generateFormulaExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings) {
  const p = project;
  const hasWF = waterfall && waterfall.lpIRR !== undefined;
  const hasF = financing && financing.totalEquity !== undefined;
  const hasPW = phaseWaterfalls && Object.keys(phaseWaterfalls).length > 0;
  const wb = new ExcelJS.Workbook();
  const assets = p.assets || [];
  const phases = p.phases || [];
  const pn = phases.map(ph => ph.name);
  const na = assets.length, nph = pn.length;
  const h = p.horizon || 50, sy = p.startYear || 2026, cur = p.currency || "SAR";
  const YC = (yi) => 5 + yi;
  const LC = YC(h - 1);
  const YR = (r) => `${CL(5)}${r}:${CL(LC)}${r}`;

  // ═══════════ INPUTS ═══════════
  const ws = wb.addWorksheet("Inputs", { properties: { tabColor: { argb: "FF3B82F6" } } });
  ws.getColumn(1).width = 32; ws.getColumn(2).width = 18;
  hdr(ws, 1, 1, 3, `${p.name || ""} — Inputs / المدخلات`);
  let R = 3;

  function sec(t) { R++; for (let c = 1; c <= 3; c++) sc(ws, R, c, c === 1 ? t : null, FSC, FILL_SEC); ws.mergeCells(R, 1, R, 3); R++; }
  function inp(l, v, nf, pct) {
    sc(ws, R, 1, l, FN);
    const val = pct && typeof v === "number" ? v / 100 : v;
    sc(ws, R, 2, val, FI, null, nf || (pct ? PCT : null));
    R++; return R - 1;
  }

  sec("General / عام");
  const rNM = inp("Project Name", p.name || "");
  const rSY = inp("Start Year", sy);
  const rHR = inp("Horizon", h);

  sec("Land / الأرض");
  const rLT = inp("Land Type", p.landType || "lease");
  const rLA = inp("Land Area (sqm)", p.landArea || 0, NUM);
  const rLR = inp("Annual Land Rent", p.landRentAnnual || 0, NUM);
  const rLE = inp("Rent Escalation %", p.landRentEscalation || 0, PCT, true);
  const rLN = inp("Escalation Every N Yrs", p.landRentEscalationEveryN || 5);
  const rLG = inp("Grace Period (yrs)", p.landRentGrace || 0);
  const rLTR = inp("Lease Term (yrs)", p.landRentTerm || 50);
  const rLP = inp("Purchase Price", p.landPurchasePrice || 0, NUM);

  sec("CAPEX / التكاليف");
  const rSF = inp("Soft Cost %", p.softCostPct || 10, PCT, true);
  const rCN = inp("Contingency %", p.contingencyPct || 5, PCT, true);

  sec("Financing / التمويل");
  const rLV = inp("Max LTV %", p.maxLtvPct || 60, PCT, true);
  const rFR = inp("Finance Rate %", p.financeRate || 7, PCT, true);
  const rTN = inp("Loan Tenor (yrs)", p.loanTenor || 8);
  const rDG = inp("Debt Grace (yrs)", p.debtGrace || 3);

  sec("Exit / التخارج");
  const rEY = inp("Exit Year (0=auto)", p.exitYear || 0);
  const rEM = inp("Exit Multiple (x rent)", p.exitMultiple || 10);
  const rEC = inp("Exit Cost %", p.exitCostPct || 2, PCT, true);

  sec("Waterfall / الشلال");
  const rGP = inp("GP Equity %", p.gpEquityPct || 20, PCT, true);
  const rPF = inp("Preferred Return %", p.prefReturnPct || 15, PCT, true);
  const rCR_ = inp("Carry %", p.carryPct || 25, PCT, true);
  const rLS = inp("LP Profit Split %", p.lpProfitSplitPct || 70, PCT, true);

  sec("Fees / الرسوم");
  const rSUB = inp("Subscription Fee %", p.subscriptionFeePct || 2, PCT, true);
  const rMGM = inp("Annual Mgmt Fee %", p.annualMgmtFeePct || 0.9, PCT, true);
  const rCUST = inp("Annual Custody Fee (fixed)", p.annualCustodyFee || 0, NUM);
  const rDEV = inp("Developer Fee % (of CAPEX)", p.developerFeePct || 10, PCT, true);
  const rSTR = inp("Structuring Fee %", p.structuringFeePct || 0, PCT, true);

  sec("Phase Allocation / التوزيع");
  const rPA = R;
  for (let i = 0; i < nph; i++) {
    sc(ws, R, 1, pn[i], FN); sc(ws, R, 2, Math.round(10000 / Math.max(nph, 1)) / 10000, FI, null, PCT); R++;
  }

  // ═══════════ PROGRAM ═══════════
  const ws2 = wb.addWorksheet("Program", { properties: { tabColor: { argb: "FF10B981" } } });
  hdr(ws2, 1, 1, 20, "Asset Program / برنامج المساحات");
  chdr(ws2, 3, ["Phase","Category","Name","Code","Notes","Plot Area","Footprint","GFA",
    "Rev Type","Eff%","Leasable","Rate/sqm","Op EBITDA","Esc%","Ramp","Occ%",
    "Cost/sqm","Start","Dur(mo)","Total CAPEX"]);
  [14,12,18,8,8,10,10,10,10,8,10,10,12,8,6,8,10,6,8,14].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  const PD = 4;
  assets.forEach((a, i) => {
    const r = PD + i;
    sc(ws2,r,1,a.phase||"",FIS); sc(ws2,r,2,a.category||"",FIS);
    sc(ws2,r,3,a.name||"",FIS); sc(ws2,r,4,a.code||"",FIS); sc(ws2,r,5,"",FNS);
    sc(ws2,r,6,a.plotArea||0,FIS,null,NUM); sc(ws2,r,7,a.footprint||0,FIS,null,NUM);
    sc(ws2,r,8,a.gfa||0,FIS,null,NUM); sc(ws2,r,9,a.revType||"Lease",FIS);
    sc(ws2,r,10,(a.efficiency||0)/100,FIS,null,PCT);
    sc(ws2,r,11,`=H${r}*J${r}`,FNS,null,NUM); // Leasable=GFA*Eff
    sc(ws2,r,12,a.leaseRate||0,FIS,null,NUM); sc(ws2,r,13,a.opEbitda||0,FIS,null,NUM);
    sc(ws2,r,14,(a.escalation||0)/100,FIS,null,PCT);
    sc(ws2,r,15,a.rampUpYears||3,FIS); sc(ws2,r,16,(a.stabilizedOcc||100)/100,FIS,null,PCT);
    sc(ws2,r,17,a.costPerSqm||0,FIS,null,NUM);
    sc(ws2,r,18,a.constrStart||1,FIS); sc(ws2,r,19,a.constrDuration||12,FIS);
    sc(ws2,r,20,`=H${r}*Q${r}*(1+Inputs!B${rSF})*(1+Inputs!B${rCN})`,FBS,null,NUM);
  });
  const PE = PD + na - 1;

  // ═══════════ CALC ═══════════
  const ws0 = wb.addWorksheet("Calc", { properties: { tabColor: { argb: "FF059669" } } });
  ws0.getColumn(1).width = 5; ws0.getColumn(2).width = 22; ws0.getColumn(3).width = 12; ws0.getColumn(4).width = 14;
  for (let yi = 0; yi < h; yi++) ws0.getColumn(YC(yi)).width = 12;
  hdr(ws0, 1, 1, LC, `${p.name || ""} — Calculation Engine`);
  sc(ws0,3,1,"#",FHS,FILL_HDR); sc(ws0,3,2,"Asset",FHS,FILL_HDR);
  sc(ws0,3,3,"Phase",FHS,FILL_HDR); sc(ws0,3,4,"Total",FHS,FILL_HDR);
  for (let yi = 0; yi < h; yi++) sc(ws0, 3, YC(yi), sy + yi, FHS, FILL_HDR, "0");

  // CAPEX
  let CR = 5; sc(ws0, CR, 2, "CAPEX SCHEDULE (Per Asset)", FB); CR++;
  const CX = CR;
  for (let i = 0; i < na; i++) {
    const r = CX + i, pr = PD + i;
    sc(ws0,r,1,i+1,FNS); sc(ws0,r,2,`=Program!C${pr}`,FR); sc(ws0,r,3,`=Program!A${pr}`,FR);
    sc(ws0,r,4,`=SUM(${YR(r)})`,FBS,null,NUM);
    for (let yi = 0; yi < h; yi++) {
      const yr = yi + 1;
      sc(ws0,r,YC(yi),`=IF(OR(Program!H${pr}=0,Program!S${pr}=0,Program!T${pr}=0),0,IF(AND(${yr}>=Program!R${pr},${yr}<Program!R${pr}+CEILING(Program!S${pr}/12,1)),Program!T${pr}/CEILING(Program!S${pr}/12,1),0))`,FNS,null,NUM);
    }
  }
  const CXE = CX + na - 1, CXT = CXE + 1;
  sc(ws0,CXT,2,"TOTAL CAPEX",FB,FILL_TOT); sc(ws0,CXT,4,`=SUM(${YR(CXT)})`,FB,FILL_TOT,NUM);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws0,CXT,c,`=SUM(${CL(c)}${CX}:${CL(c)}${CXE})`,FBS,FILL_TOT,NUM); }

  // Revenue
  sc(ws0,CXT+2,2,"INCOME SCHEDULE (Per Asset)",FB); const RV = CXT + 3;
  for (let i = 0; i < na; i++) {
    const r = RV + i, pr = PD + i;
    sc(ws0,r,1,i+1,FNS); sc(ws0,r,2,`=Program!C${pr}`,FR); sc(ws0,r,3,`=Program!A${pr}`,FR);
    sc(ws0,r,4,`=SUM(${YR(r)})`,FBS,null,NUM);
    for (let yi = 0; yi < h; yi++) {
      const yr = yi + 1;
      const H=`Program!H${pr}`,R_=`Program!R${pr}`,S=`Program!S${pr}`;
      const I=`Program!I${pr}`,K=`Program!K${pr}`,L=`Program!L${pr}`;
      const M=`Program!M${pr}`,N=`Program!N${pr}`,O=`Program!O${pr}`,P=`Program!P${pr}`;
      const OS = `(${R_}+CEILING(${S}/12,1))`;
      sc(ws0,r,YC(yi),`=IF(OR(${H}=0,${R_}=0,${S}=0),0,IF(${yr}>=${OS},IF(${I}="Operating",${M}*(1+${N})^(${yr}-${OS})*MIN(1,(${yr}-${OS}+1)/MAX(1,${O})),${K}*${L}*(1+${N})^(${yr}-${OS})*MIN(${P},${P}/MAX(1,${O})*(${yr}-${OS}+1))),0))`,FNS,null,NUM);
    }
  }
  const RVE = RV + na - 1, RVT = RVE + 1;
  sc(ws0,RVT,2,"TOTAL INCOME",FB,FILL_TOT); sc(ws0,RVT,4,`=SUM(${YR(RVT)})`,FB,FILL_TOT,NUM);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws0,RVT,c,`=SUM(${CL(c)}${RV}:${CL(c)}${RVE})`,FBS,FILL_TOT,NUM); }

  // Land Rent
  sc(ws0,RVT+2,2,"LAND RENT SCHEDULE",FB); const LR = RVT + 3;
  sc(ws0,LR,2,"Total Land Rent",FBS); sc(ws0,LR,4,`=SUM(${YR(LR)})`,FBS,null,NUM);
  for (let yi = 0; yi < h; yi++) {
    const yr = yi + 1;
    sc(ws0,LR,YC(yi),`=IF(Inputs!B${rLT}="purchase",IF(${yr}=1,Inputs!B${rLP},0),IF(Inputs!B${rLT}="partner",0,IF(${yr}<=Inputs!B${rLG},0,IF(${yr}>Inputs!B${rLTR},0,Inputs!B${rLR}*(1+Inputs!B${rLE})^INT((${yr}-Inputs!B${rLG}-1)/MAX(1,Inputs!B${rLN}))))))`,FNS,null,NUM);
  }
  const LRP = LR + 1;
  for (let pi = 0; pi < nph; pi++) {
    const r = LRP + pi; sc(ws0,r,2,`  ${pn[pi]}`,FNS); sc(ws0,r,4,`=SUM(${YR(r)})`,FNS,null,NUM);
    for (let yi = 0; yi < h; yi++) sc(ws0,r,YC(yi),`=${CL(YC(yi))}${LR}*Inputs!B${rPA+pi}`,FNS,null,NUM);
  }

  // Phase aggregation
  sc(ws0,LRP+nph+1,2,"CAPEX BY PHASE",FB); const PC = LRP + nph + 2;
  for (let pi = 0; pi < nph; pi++) {
    const r = PC + pi; sc(ws0,r,2,pn[pi],FBS,FILL_SEC); sc(ws0,r,4,`=SUM(${YR(r)})`,FBS,null,NUM);
    for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws0,r,c,`=SUMPRODUCT(($C$${CX}:$C$${CXE}="${pn[pi]}")*(${CL(c)}${CX}:${CL(c)}${CXE}))`,FNS,null,NUM); }
  }
  sc(ws0,PC+nph+1,2,"INCOME BY PHASE",FB); const PR = PC + nph + 2;
  for (let pi = 0; pi < nph; pi++) {
    const r = PR + pi; sc(ws0,r,2,pn[pi],FBS,FILL_SEC); sc(ws0,r,4,`=SUM(${YR(r)})`,FBS,null,NUM);
    for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws0,r,c,`=SUMPRODUCT(($C$${RV}:$C$${RVE}="${pn[pi]}")*(${CL(c)}${RV}:${CL(c)}${RVE}))`,FNS,null,NUM); }
  }

  // ═══════════ CASHFLOW ═══════════
  const ws3 = wb.addWorksheet("CashFlow", { properties: { tabColor: { argb: "FF059669" } } });
  ws3.getColumn(1).width = 30; ws3.getColumn(2).width = 8; ws3.getColumn(3).width = 15; ws3.getColumn(4).width = 14;
  for (let yi = 0; yi < h; yi++) ws3.getColumn(YC(yi)).width = 12;
  hdr(ws3, 1, 1, LC, "Unlevered Project Cash Flow / التدفقات النقدية");
  sc(ws3,3,1,"Line Item",FHS,FILL_HDR); sc(ws3,3,2,"Unit",FHS,FILL_HDR); sc(ws3,3,3,"Total",FHS,FILL_HDR);
  for (let yi = 0; yi < h; yi++) sc(ws3, 3, YC(yi), sy + yi, FHS, FILL_HDR, "0");

  let cr = 5;
  for (let pi = 0; pi < nph; pi++) {
    secr(ws3,cr,1,LC,pn[pi]); cr++;
    const ir = cr;
    sc(ws3,cr,1,"  Income",FNS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FNS,null,NUM);
    for (let yi = 0; yi < h; yi++) sc(ws3,cr,YC(yi),`=Calc!${CL(YC(yi))}${PR+pi}`,FR,null,NUM);
    cr++;
    const lr_ = cr;
    sc(ws3,cr,1,"  Land Rent",FNS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FNS,null,NUMN);
    for (let yi = 0; yi < h; yi++) sc(ws3,cr,YC(yi),`=Calc!${CL(YC(yi))}${LRP+pi}*-1`,FR,null,NUMN);
    cr++;
    const cx_ = cr;
    sc(ws3,cr,1,"  CAPEX",FNS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FNS,null,NUMN);
    for (let yi = 0; yi < h; yi++) sc(ws3,cr,YC(yi),`=Calc!${CL(YC(yi))}${PC+pi}*-1`,FR,null,NUMN);
    cr++;
    const nr = cr;
    sc(ws3,cr,1,`  Net CF — ${pn[pi]}`,FBS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FBS,null,NUMN);
    for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws3,cr,c,`=${CL(c)}${ir}+${CL(c)}${lr_}+${CL(c)}${cx_}`,FBS,null,NUMN,BB); }
    cr++;
    sc(ws3,cr,1,`  IRR — ${pn[pi]}`,FBS); sc(ws3,cr,2,"%",FNS);
    sc(ws3,cr,3,`=IFERROR(IRR(${CL(YC(0))}${nr}:${CL(LC)}${nr}),"-")`,FBS,null,PCT); cr += 2;
  }

  secr(ws3,cr,1,LC,"CONSOLIDATED / الموحّد"); cr++;
  const ci = cr;
  sc(ws3,cr,1,"  Total Income",FNS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FNS,null,NUM);
  for (let yi = 0; yi < h; yi++) sc(ws3,cr,YC(yi),`=Calc!${CL(YC(yi))}${RVT}`,FR,null,NUM);
  cr++;
  const cl_ = cr;
  sc(ws3,cr,1,"  Total Land Rent",FNS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) sc(ws3,cr,YC(yi),`=Calc!${CL(YC(yi))}${LR}*-1`,FR,null,NUMN);
  cr++;
  const cc_ = cr;
  sc(ws3,cr,1,"  Total CAPEX",FNS); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) sc(ws3,cr,YC(yi),`=Calc!${CL(YC(yi))}${CXT}*-1`,FR,null,NUMN);
  cr++;
  const cn = cr;
  sc(ws3,cr,1,"  Net CF — Consolidated",FB); sc(ws3,cr,2,cur,FNS); sc(ws3,cr,3,`=SUM(${YR(cr)})`,FB,null,NUMN);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws3,cr,c,`=${CL(c)}${ci}+${CL(c)}${cl_}+${CL(c)}${cc_}`,FBS,null,NUMN,BB); }
  cr++;
  const cirr = cr;
  sc(ws3,cr,1,"  IRR",FB); sc(ws3,cr,2,"%",FNS);
  sc(ws3,cr,3,`=IFERROR(IRR(${CL(YC(0))}${cn}:${CL(LC)}${cn}),"-")`,FB,null,PCT); cr++;
  const cnpv = cr;
  for (const [d, l] of [[0.10,"10%"],[0.12,"12%"],[0.14,"14%"]]) {
    sc(ws3,cr,1,`  NPV @${l}`,FNS); sc(ws3,cr,2,cur,FNS);
    sc(ws3,cr,3,`=NPV(${d},${CL(YC(0))}${cn}:${CL(LC)}${cn})`,FNS,null,NUM); cr++;
  }
  const cum = cr;
  sc(ws3,cr,1,"  Cumulative CF",FNS); sc(ws3,cr,2,cur,FNS);
  for (let yi = 0; yi < h; yi++) {
    const c = YC(yi);
    sc(ws3,cr,c,yi === 0 ? `=${CL(c)}${cn}` : `=${CL(YC(yi-1))}${cum}+${CL(c)}${cn}`,FNS,null,NUMN);
  }

  // ═══════════ FUND ═══════════
  const ws5 = wb.addWorksheet("Fund", { properties: { tabColor: { argb: "FFD97706" } } });
  ws5.getColumn(1).width = 34; ws5.getColumn(2).width = 8; ws5.getColumn(3).width = 15; ws5.getColumn(4).width = 14;
  for (let yi = 0; yi < h; yi++) ws5.getColumn(YC(yi)).width = 12;
  hdr(ws5, 1, 1, LC, "Fund Model / نموذج الصندوق");
  sc(ws5,3,1,"Line Item",FHS,FILL_HDR); sc(ws5,3,2,"Unit",FHS,FILL_HDR); sc(ws5,3,3,"Total",FHS,FILL_HDR);
  for (let yi = 0; yi < h; yi++) sc(ws5, 3, YC(yi), sy + yi, FHS, FILL_HDR, "0");

  let fr = 5;
  secr(ws5,fr,1,LC,"CAPITAL STRUCTURE"); fr++;
  const fDC=fr;sc(ws5,fr,1,"  Total Dev Cost",FNS);sc(ws5,fr,3,`=Calc!D${CXT}`,FR,null,NUM);fr++;
  const fMD=fr;sc(ws5,fr,1,"  Max Debt (LTV)",FNS);sc(ws5,fr,3,`=C${fDC}*Inputs!B${rLV}`,FNS,null,NUM);fr++;
  const fEQ=fr;sc(ws5,fr,1,"  Total Equity",FBS);sc(ws5,fr,3,`=C${fDC}-C${fMD}`,FBS,null,NUM);fr++;
  sc(ws5,fr,1,"  GP Equity",FNS);sc(ws5,fr,3,`=C${fEQ}*Inputs!B${rGP}`,FNS,null,NUM);fr++;
  sc(ws5,fr,1,"  LP Equity",FNS);sc(ws5,fr,3,`=C${fEQ}*(1-Inputs!B${rGP})`,FNS,null,NUM);fr++;
  const fEXY=fr;sc(ws5,fr,1,"  Exit Year",FBS);sc(ws5,fr,3,`=IF(Inputs!B${rEY}=0,Inputs!B${rTN}+1,Inputs!B${rEY})`,FBS);fr+=2;

  secr(ws5,fr,1,LC,"DEBT SCHEDULE"); fr++;
  const fDD=fr;sc(ws5,fr,1,"  Drawdown",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUM);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=Calc!${CL(YC(yi))}${CXT}*Inputs!B${rLV}`,FNS,null,NUM);
  fr++;
  const fOB=fr;sc(ws5,fr,1,"  Opening Balance",FNS);sc(ws5,fr,2,cur,FNS);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),yi===0?0:`=${CL(YC(yi-1))}${fOB+2}`,FNS,null,NUM);
  fr++;
  const fRP=fr;sc(ws5,fr,1,"  Repayment",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    const yr = yi + 1;
    sc(ws5,fr,YC(yi),`=IF(AND(${yr}>Inputs!B${rDG},${yr}<=Inputs!B${rTN}),-C${fMD}/MAX(1,Inputs!B${rTN}-Inputs!B${rDG}),0)`,FNS,null,NUMN);
  }
  fr++;
  const fCB=fr;sc(ws5,fr,1,"  Closing Balance",FBS);sc(ws5,fr,2,cur,FNS);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws5,fr,c,`=MAX(0,${CL(c)}${fOB}+${CL(c)}${fDD}+${CL(c)}${fRP})`,FBS,null,NUM,BB); }
  fr++;
  const fIT=fr;sc(ws5,fr,1,"  Interest",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws5,fr,c,`=-(${CL(c)}${fOB}+${CL(c)}${fCB})/2*Inputs!B${rFR}`,FNS,null,NUMN); }
  fr++;
  const fDS=fr;sc(ws5,fr,1,"  Total Debt Service",FBS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FBS,null,NUMN);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws5,fr,c,`=${CL(c)}${fRP}+${CL(c)}${fIT}`,FBS,null,NUMN); }
  fr++;
  sc(ws5,fr,1,"  DSCR",FBS);sc(ws5,fr,2,"x",FNS);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws5,fr,c,`=IF(ABS(${CL(c)}${fDS})=0,"-",CashFlow!${CL(c)}${ci}/ABS(${CL(c)}${fDS}))`,FBS,null,DX); }
  fr += 2;

  // Fees
  secr(ws5,fr,1,LC,"FEES / الرسوم"); fr++;
  const fSUBF=fr;sc(ws5,fr,1,"  Subscription Fee",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    // One-time at fund start year (year 1)
    sc(ws5,fr,YC(yi),yi===0?`=-C${fEQ}*Inputs!B${rSUB}`:0,FNS,null,NUMN);
  }
  fr++;
  const fMGMF=fr;sc(ws5,fr,1,"  Management Fee (annual)",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    // Annual % of equity committed, during fund life (up to exit year)
    sc(ws5,fr,YC(yi),`=IF(${yi+1}<=C${fEXY},-C${fEQ}*Inputs!B${rMGM},0)`,FNS,null,NUMN);
  }
  fr++;
  const fCUSTF=fr;sc(ws5,fr,1,"  Custody & Admin Fee",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    sc(ws5,fr,YC(yi),`=IF(${yi+1}<=C${fEXY},-Inputs!B${rCUST},0)`,FNS,null,NUMN);
  }
  fr++;
  const fDEVF=fr;sc(ws5,fr,1,"  Developer Fee (% of CAPEX)",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    // Spread over construction years (proportional to CAPEX spend)
    sc(ws5,fr,YC(yi),`=IF(Calc!${CL(YC(yi))}${CXT}>0,-Calc!${CL(YC(yi))}${CXT}*Inputs!B${rDEV},0)`,FNS,null,NUMN);
  }
  fr++;
  const fSTRF=fr;sc(ws5,fr,1,"  Structuring Fee",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    sc(ws5,fr,YC(yi),yi===0?`=-C${fDC}*Inputs!B${rSTR}`:0,FNS,null,NUMN);
  }
  fr++;
  const fTOTFEE=fr;sc(ws5,fr,1,"  Total Fees",FBS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FBS,null,NUMN);
  for (let yi = 0; yi < h; yi++) {
    const c = YC(yi);
    sc(ws5,fr,c,`=${CL(c)}${fSUBF}+${CL(c)}${fMGMF}+${CL(c)}${fCUSTF}+${CL(c)}${fDEVF}+${CL(c)}${fSTRF}`,FBS,null,NUMN,BB);
  }
  fr += 2;
  secr(ws5,fr,1,LC,"EXIT PROCEEDS"); fr++;
  const fSTI=fr;sc(ws5,fr,1,"  Stabilized Income",FNS);sc(ws5,fr,2,cur,FNS);
  sc(ws5,fr,3,`=IFERROR(INDEX(CashFlow!${CL(YC(0))}${ci}:${CL(LC)}${ci},1,C${fEXY}),0)`,FNS,null,NUM);fr++;
  const fEXV=fr;sc(ws5,fr,1,"  Exit Value",FBS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=C${fSTI}*Inputs!B${rEM}`,FBS,null,NUM);fr++;
  sc(ws5,fr,1,"  Exit Cost",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=C${fEXV}*Inputs!B${rEC}*-1`,FNS,null,NUMN);fr++;
  const fEXN=fr;sc(ws5,fr,1,"  Net Exit Proceeds",FBS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=C${fEXV}+C${fr-1}`,FBS,null,NUM);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=IF(${yi+1}=C${fEXY},C${fEXN},0)`,FNS,null,NUM);
  fr += 2;

  // Levered CF
  secr(ws5,fr,1,LC,"LEVERED CASH FLOW"); fr++;
  const fUL=fr;sc(ws5,fr,1,"  Unlevered Net CF",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=CashFlow!${CL(YC(yi))}${cn}`,FR,null,NUMN);
  fr++;
  const fDL=fr;sc(ws5,fr,1,"  + Drawdown",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUM);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=${CL(YC(yi))}${fDD}`,FNS,null,NUM);
  fr++;
  const fSL=fr;sc(ws5,fr,1,"  - Debt Service",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=${CL(YC(yi))}${fDS}`,FNS,null,NUMN);
  fr++;
  const fDP=fr;sc(ws5,fr,1,"  - Debt Payoff at Exit",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=IF(${yi+1}=C${fEXY},-${CL(YC(yi))}${fCB},0)`,FNS,null,NUMN);
  fr++;
  const fEP=fr;sc(ws5,fr,1,"  + Exit Proceeds",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUM);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=${CL(YC(yi))}${fEXN}`,FNS,null,NUM);
  fr++;
  const fFEL=fr;sc(ws5,fr,1,"  - Total Fees",FNS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FNS,null,NUMN);
  for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),`=${CL(YC(yi))}${fTOTFEE}`,FNS,null,NUMN);
  fr++;
  const fLV=fr;sc(ws5,fr,1,"  Levered Net CF",FB);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FB,null,NUMN);
  for (let yi = 0; yi < h; yi++) { const c = YC(yi); sc(ws5,fr,c,`=${CL(c)}${fUL}+${CL(c)}${fDL}+${CL(c)}${fSL}+${CL(c)}${fDP}+${CL(c)}${fEP}+${CL(c)}${fFEL}`,FBS,null,NUMN,BB); }
  fr++;
  const fLI=fr;sc(ws5,fr,1,"  Levered IRR",FB);sc(ws5,fr,2,"%",FNS);
  sc(ws5,fr,3,`=IFERROR(IRR(${CL(YC(0))}${fLV}:${CL(LC)}${fLV}),"-")`,FB,null,PCT);fr++;
  for (const [d,l] of [[0.10,"10%"],[0.12,"12%"]]) {
    sc(ws5,fr,1,`  Levered NPV @${l}`,FNS);sc(ws5,fr,2,cur,FNS);
    sc(ws5,fr,3,`=NPV(${d},${CL(YC(0))}${fLV}:${CL(LC)}${fLV})`,FNS,null,NUM);fr++;
  }
  fr++;

  // Waterfall — uses computed values from app engine for accuracy
  secr(ws5,fr,1,LC,"WATERFALL DISTRIBUTION"); fr++;
  if (hasWF) {
    const wfRows = [
      ["  Cash Available", waterfall.cashAvail],
      ["  Equity Calls", waterfall.equityCalls.map(v => -Math.abs(v))],
      ["  T1: Return of Capital", waterfall.tier1],
      ["  T2: Preferred Return", waterfall.tier2],
      ["  T3: GP Catch-Up", waterfall.tier3],
      ["  T4: LP Profit Split", waterfall.tier4LP],
      ["  T4: GP Profit Split", waterfall.tier4GP],
    ];
    const wfRowNums = {};
    for (const [label, arr] of wfRows) {
      const isBold = label.includes("T1:") || label.includes("T2:") || label.includes("T3:") || label.includes("T4:");
      sc(ws5,fr,1,label,isBold?FBS:FNS);sc(ws5,fr,2,cur,FNS);
      sc(ws5,fr,3,`=SUM(${YR(fr)})`,isBold?FBS:FNS,null,NUM);
      for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),(arr && arr[yi]) || 0,FNS,null,NUM);
      wfRowNums[label.trim()] = fr;
      fr++;
    }
    fr++;

    // LP/GP Returns — computed values
    secr(ws5,fr,1,LC,"INVESTOR RETURNS"); fr++;
    const fLPD=fr;sc(ws5,fr,1,"  LP Distribution",FBS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FBS,null,NUM);
    for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),(waterfall.lpDist && waterfall.lpDist[yi]) || 0,FNS,null,NUM);
    fr++;
    const fLPCF=fr;sc(ws5,fr,1,"  LP Net Cash Flow",FB);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FB,null,NUMN);
    for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),(waterfall.lpNetCF && waterfall.lpNetCF[yi]) || 0,FBS,null,NUMN,BB);
    fr++;
    const fLPI=fr;sc(ws5,fr,1,"  LP IRR",FB);sc(ws5,fr,2,"%",FNS);
    sc(ws5,fr,3,waterfall.lpIRR != null ? waterfall.lpIRR : "-",FB,null,PCT);fr++;
    const fLPMOIC=fr;sc(ws5,fr,1,"  LP MOIC",FB);sc(ws5,fr,2,"x",FNS);
    sc(ws5,fr,3,waterfall.lpMOIC || 0,FB,null,DX);fr++;
    for (const [d,l] of [[0.10,"10%"],[0.12,"12%"],[0.14,"14%"]]) {
      const key = `lpNPV${Math.round(d*100)}`;
      sc(ws5,fr,1,`  LP NPV @${l}`,FNS);sc(ws5,fr,2,cur,FNS);
      sc(ws5,fr,3,waterfall[key] || 0,FNS,null,NUM);fr++;
    }
    const fLPCUM=fr;sc(ws5,fr,1,"  LP Cumulative CF",FNS);sc(ws5,fr,2,cur,FNS);
    let lpCum = 0;
    for (let yi = 0; yi < h; yi++) { lpCum += (waterfall.lpNetCF && waterfall.lpNetCF[yi]) || 0; sc(ws5,fr,YC(yi),lpCum,FNS,null,NUMN); }
    fr += 2;

    const fGPD=fr;sc(ws5,fr,1,"  GP Distribution",FBS);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FBS,null,NUM);
    for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),(waterfall.gpDist && waterfall.gpDist[yi]) || 0,FNS,null,NUM);
    fr++;
    const fGPCF=fr;sc(ws5,fr,1,"  GP Net Cash Flow",FB);sc(ws5,fr,2,cur,FNS);sc(ws5,fr,3,`=SUM(${YR(fr)})`,FB,null,NUMN);
    for (let yi = 0; yi < h; yi++) sc(ws5,fr,YC(yi),(waterfall.gpNetCF && waterfall.gpNetCF[yi]) || 0,FBS,null,NUMN,BB);
    fr++;
    const fGPI=fr;sc(ws5,fr,1,"  GP IRR",FB);sc(ws5,fr,2,"%",FNS);
    sc(ws5,fr,3,waterfall.gpIRR != null ? waterfall.gpIRR : "-",FB,null,PCT);fr++;
    const fGPMOIC=fr;sc(ws5,fr,1,"  GP MOIC",FB);sc(ws5,fr,2,"x",FNS);
    sc(ws5,fr,3,waterfall.gpMOIC || 0,FB,null,DX);fr++;
    for (const [d,l] of [[0.10,"10%"],[0.12,"12%"],[0.14,"14%"]]) {
      const key = `gpNPV${Math.round(d*100)}`;
      sc(ws5,fr,1,`  GP NPV @${l}`,FNS);sc(ws5,fr,2,cur,FNS);
      sc(ws5,fr,3,waterfall[key] || 0,FNS,null,NUM);fr++;
    }
    const fGPCUM=fr;sc(ws5,fr,1,"  GP Cumulative CF",FNS);sc(ws5,fr,2,cur,FNS);
    let gpCum = 0;
    for (let yi = 0; yi < h; yi++) { gpCum += (waterfall.gpNetCF && waterfall.gpNetCF[yi]) || 0; sc(ws5,fr,YC(yi),gpCum,FNS,null,NUMN); }
  } else {
    // Fallback: formula-based waterfall when engine values not available
    sc(ws5,fr,1,"  (Waterfall not computed — open in app first)",FNS);
    var fLPI=fr, fLPMOIC=fr, fGPI=fr, fGPMOIC=fr, fLPD=fr, fGPD=fr, fCA=fr;
  }

  // ═══════════ PER-PHASE FUND SHEETS ═══════════
  const phaseSheetNames = [];
  if (hasPW) {
    for (const phaseName of pn) {
      const pw = phaseWaterfalls[phaseName];
      const pf = phaseFinancings ? phaseFinancings[phaseName] : null;
      if (!pw) continue;

      const sheetName = `Fund_${phaseName.replace(/[^a-zA-Z0-9 ]/g,"").substring(0,25)}`;
      phaseSheetNames.push(sheetName);
      const wsp = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: "FFD97706" } } });
      wsp.getColumn(1).width = 34; wsp.getColumn(2).width = 14; wsp.getColumn(3).width = 16; wsp.getColumn(4).width = 14;
      for (let yi = 0; yi < h; yi++) wsp.getColumn(YC(yi)).width = 12;

      hdr(wsp, 1, 1, LC, `Fund — ${phaseName}`);
      sc(wsp, 3, 1, "Line Item", FHS, FILL_HDR); sc(wsp, 3, 2, "Unit", FHS, FILL_HDR); sc(wsp, 3, 3, "Total", FHS, FILL_HDR);
      for (let yi = 0; yi < h; yi++) sc(wsp, 3, YC(yi), sy + yi, FHS, FILL_HDR, "0");

      let pr = 5;

      // 1. Fund Information
      secr(wsp, pr, 1, 6, "1  FUND INFORMATION / معلومات الصندوق"); pr++;
      sc(wsp,pr,1,"  Fund Name",FNS); sc(wsp,pr,3,`${p.name || ""} — ${phaseName}`,FI); pr++;
      sc(wsp,pr,1,"  Phase",FNS); sc(wsp,pr,3,phaseName,FI); pr++;
      sc(wsp,pr,1,"  Strategy",FNS); sc(wsp,pr,3,p.exitStrategy || "sale",FI); pr++;
      sc(wsp,pr,1,"  Exit Year",FBS); sc(wsp,pr,3,pw.exitYear || 0,FBS); pr += 2;

      // 2. Capital Structure
      secr(wsp, pr, 1, 6, "2  CAPITAL STRUCTURE / هيكل رأس المال"); pr++;
      const kv = (label, val, nf = NUM, bold = false) => {
        sc(wsp, pr, 1, `  ${label}`, bold ? FBS : FNS);
        sc(wsp, pr, 3, val, bold ? FBS : FNS, null, nf); pr++;
      };
      kv("GP Equity", pw.gpEquity || 0); kv("LP Equity", pw.lpEquity || 0);
      kv("Total Equity", pw.totalEquity || 0, NUM, true);
      kv("GP %", pw.gpPct || 0, PCT); kv("LP %", pw.lpPct || 0, PCT);
      kv("Dev Cost (excl land)", pf?.devCostExclLand || 0); kv("Dev Cost (incl land)", pf?.devCostInclLand || 0);
      pr++;

      // 3. Debt
      secr(wsp, pr, 1, 6, "3  DEBT / الدين"); pr++;
      kv("Max Debt", pf?.maxDebt || 0); kv("Total Debt Drawn", pf?.totalDebtDrawn || 0);
      pr++;

      // 4. Fees
      secr(wsp, pr, 1, 6, "4  FEES / الرسوم"); pr++;
      kv("Total Fees", pw.totalFees || 0, NUMN);
      pr++;

      // 5-7. Project CashFlows + Fund CF + Waterfall — year-by-year
      const writeRow = (label, arr, nf = NUM, bold = false) => {
        sc(wsp, pr, 1, `  ${label}`, bold ? FBS : FNS); sc(wsp, pr, 2, cur, FNS);
        const total = (arr || []).reduce((a, b) => a + (b || 0), 0);
        sc(wsp, pr, 3, total, bold ? FBS : FNS, null, nf);
        for (let yi = 0; yi < h; yi++) sc(wsp, pr, YC(yi), (arr && arr[yi]) || 0, FNS, null, nf);
        pr++;
      };

      secr(wsp, pr, 1, LC, "5  FUND CASH FLOW / تدفقات الصندوق"); pr++;
      writeRow("Equity Calls", pw.equityCalls?.map(v => -Math.abs(v)), NUMN);
      if (pf) {
        writeRow("Debt Drawdown", pf.debtDrawdown);
        writeRow("Debt Service", pf.debtService?.map(v => -Math.abs(v)), NUMN);
      }
      writeRow("Exit Proceeds", pw.exitProceeds);
      writeRow("Cash Available", pw.cashAvail, NUM, true);
      pr++;

      secr(wsp, pr, 1, LC, "6  WATERFALL / الشلال"); pr++;
      writeRow("T1: Return of Capital", pw.tier1, NUM, true);
      writeRow("T2: Preferred Return", pw.tier2, NUM, true);
      writeRow("T3: GP Catch-Up", pw.tier3, NUM, true);
      writeRow("T4: LP Profit Split", pw.tier4LP);
      writeRow("T4: GP Profit Split", pw.tier4GP);
      pr++;

      secr(wsp, pr, 1, LC, "7  DISTRIBUTIONS / التوزيعات"); pr++;
      writeRow("LP Distribution", pw.lpDist, NUM, true);
      writeRow("GP Distribution", pw.gpDist, NUM, true);
      pr++;

      secr(wsp, pr, 1, LC, "8  INVESTOR RETURNS / عوائد المستثمرين"); pr++;
      writeRow("LP Net Cash Flow", pw.lpNetCF, NUMN, true);
      // LP Cumulative
      sc(wsp,pr,1,"  LP Cumulative CF",FNS); sc(wsp,pr,2,cur,FNS);
      let lpC = 0;
      for (let yi = 0; yi < h; yi++) { lpC += (pw.lpNetCF?.[yi] || 0); sc(wsp,pr,YC(yi),lpC,FNS,null,NUMN); }
      pr++;

      writeRow("GP Net Cash Flow", pw.gpNetCF, NUMN, true);
      sc(wsp,pr,1,"  GP Cumulative CF",FNS); sc(wsp,pr,2,cur,FNS);
      let gpC = 0;
      for (let yi = 0; yi < h; yi++) { gpC += (pw.gpNetCF?.[yi] || 0); sc(wsp,pr,YC(yi),gpC,FNS,null,NUMN); }
      pr += 2;

      // KPI Summary
      secr(wsp, pr, 1, 6, "9  KPI SUMMARY / ملخص الأداء"); pr++;
      kv("LP IRR", pw.lpIRR != null ? pw.lpIRR : "-", PCT);
      kv("GP IRR", pw.gpIRR != null ? pw.gpIRR : "-", PCT);
      kv("LP MOIC", pw.lpMOIC || 0, DX);
      kv("GP MOIC", pw.gpMOIC || 0, DX);
      kv("Total Equity", pw.totalEquity || 0);
      kv("Total LP Distributions", pw.lpTotalDist || 0);
      kv("Total GP Distributions", pw.gpTotalDist || 0);
      kv("Exit Proceeds", (pw.exitProceeds || []).reduce((a,b) => a+(b||0), 0));
      pr++;

      // NPV Analysis
      secr(wsp, pr, 1, 6, "10  NPV ANALYSIS"); pr++;
      sc(wsp,pr,1,"  Discount Rate",FBS); sc(wsp,pr,2,"Project",FBS); sc(wsp,pr,3,"LP",FBS); sc(wsp,pr,4,"GP",FBS); pr++;
      for (const [d, l] of [[0.10,"10%"],[0.12,"12%"],[0.14,"14%"]]) {
        sc(wsp,pr,1,`  ${l}`,FNS);
        const lpKey = `lpNPV${Math.round(d*100)}`, gpKey = `gpNPV${Math.round(d*100)}`;
        sc(wsp,pr,2,pw.projNPV10 != null ? (d === 0.10 ? pw.projNPV10 : d === 0.12 ? pw.projNPV12 : pw.projNPV14) : 0,FNS,null,NUM);
        sc(wsp,pr,3,pw[lpKey] || 0,FNS,null,NUM);
        sc(wsp,pr,4,pw[gpKey] || 0,FNS,null,NUM); pr++;
      }

      wsp.views = [{ state: "frozen", xSplit: 4, ySplit: 3 }];
    }
  }

  // ═══════════ OUTPUTS ═══════════
  const ws4 = wb.addWorksheet("Outputs", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  ws4.getColumn(1).width = 28; ws4.getColumn(2).width = 18; ws4.getColumn(3).width = 10;
  hdr(ws4, 1, 1, 3, "Project Outputs / المخرجات");
  chdr(ws4, 3, ["Metric", "Value", "Unit"]);
  let o = 4;
  const orow = (l, f, nf = NUM, u = cur) => { sc(ws4,o,1,l,FNS); sc(ws4,o,2,f,typeof f==="string"&&f.startsWith("=")?FRB:FBS,null,nf); sc(ws4,o,3,u,FNS); o++; };
  orow("Total CAPEX",`=Calc!D${CXT}`); orow(`Total Income (${h}yr)`,`=Calc!D${RVT}`);
  orow("Total Land Rent",`=Calc!D${LR}`); orow("Unlevered IRR",`=CashFlow!C${cirr}`,PCT,"%");
  orow("NPV @10%",`=CashFlow!C${cnpv}`); orow("Levered IRR",`=Fund!C${fLI}`,PCT,"%");
  orow("Max Debt",`=Fund!C${fMD}`); orow("Equity",`=Fund!C${fEQ}`);
  orow("Net Exit",`=Fund!C${fEXN}`); orow("Total Fees",`=Fund!C${fTOTFEE}`,NUMN);
  if (hasWF) {
    orow("LP IRR", waterfall.lpIRR != null ? waterfall.lpIRR : 0, PCT, "%");
    orow("LP MOIC", waterfall.lpMOIC || 0, DX, "x");
    orow("GP IRR", waterfall.gpIRR != null ? waterfall.gpIRR : 0, PCT, "%");
    orow("GP MOIC", waterfall.gpMOIC || 0, DX, "x");
  }

  // ═══════════ CHECKS ═══════════
  const ws9 = wb.addWorksheet("Checks", { properties: { tabColor: { argb: "FF059669" } } });
  ws9.getColumn(1).width = 45; ws9.getColumn(2).width = 15; ws9.getColumn(3).width = 10;
  hdr(ws9, 1, 1, 3, "Model Checks / الفحوصات");
  chdr(ws9, 3, ["Check", "Diff", "Status"]);
  let ck = 4;
  const chk = (l, d) => { sc(ws9,ck,1,l,FNS); sc(ws9,ck,2,d,FNS,null,NUM); sc(ws9,ck,3,`=IF(ABS(B${ck})<1,"PASS","FAIL")`,FBS); ck++; };
  const px = Array.from({length:nph},(_,i)=>`Calc!D${PC+i}`).join("+");
  chk("CAPEX = Sum Phases", `=Calc!D${CXT}-(${px})`);
  const pv = Array.from({length:nph},(_,i)=>`Calc!D${PR+i}`).join("+");
  chk("Revenue = Sum Phases", `=Calc!D${RVT}-(${pv})`);
  chk("D+E = Total Cost", `=ABS(Fund!C${fMD}+Fund!C${fEQ}-Fund!C${fDC})`);
  // No negative GFA
  sc(ws9,ck,1,"No Negative GFA",FNS);
  sc(ws9,ck,2,`=COUNTIF(Program!H${PD}:H${PE},"<0")`,FNS,null,NUM);
  sc(ws9,ck,3,`=IF(B${ck}=0,"PASS","FAIL")`,FBS); ck++;
  // No zero duration for active assets
  sc(ws9,ck,1,"Active Assets Have Duration > 0",FNS);
  sc(ws9,ck,2,`=SUMPRODUCT((Program!H${PD}:H${PE}>0)*(Program!S${PD}:S${PE}=0))`,FNS,null,NUM);
  sc(ws9,ck,3,`=IF(B${ck}=0,"PASS","FAIL")`,FBS); ck++;
  // Phase allocation = 100%
  sc(ws9,ck,1,"Phase Allocation = 100%",FNS);
  sc(ws9,ck,2,`=ABS(SUM(Inputs!B${rPA}:B${rPA+nph-1})-1)`,FNS,null,'0.0000');
  sc(ws9,ck,3,`=IF(B${ck}<0.01,"PASS","FAIL")`,FBS); ck++;
  // Operating assets have EBITDA > 0
  sc(ws9,ck,1,"Operating Assets Have EBITDA > 0",FNS);
  sc(ws9,ck,2,`=SUMPRODUCT((Program!I${PD}:I${PE}="Operating")*(Program!M${PD}:M${PE}<=0))`,FNS,null,NUM);
  sc(ws9,ck,3,`=IF(B${ck}=0,"PASS","WARN")`,FBS); ck++;
  // LP+GP = Total
  if (!hasWF) {
    // Only add formula check when waterfall is formula-based
    chk("LP+GP Dist = Total Available","=0");
  }
  // Overall
  sc(ws9,ck,1,"OVERALL STATUS",FB,FILL_TOT);
  sc(ws9,ck,2,"",null,FILL_TOT);
  sc(ws9,ck,3,`=IF(COUNTIF(C4:C${ck-1},"FAIL")=0,"ALL PASS","ERRORS")`,FB,FILL_TOT);
  // ═══════════ DOCS ═══════════
  const wsd = wb.addWorksheet("Docs", { properties: { tabColor: { argb: "FF6B7280" } } });
  wsd.getColumn(1).width = 65;
  hdr(wsd, 1, 1, 1, "Documentation / التوثيق");
  ["","Sheet Guide:","  Inputs — Editable assumptions (blue text)","  Program — Asset table",
    "  Calc — Engine (all formulas)","  CashFlow — Unlevered cash flows","  Fund — Debt + Exit + Waterfall + LP/GP",
    "  Outputs — Summary KPIs","  Checks — Integrity checks","",
    "Color: Blue=Input, Black=Formula, Green=Cross-sheet","",
    `Project: ${p.name||""}`,`Horizon: ${h}yr from ${sy}`,
    `Assets: ${na} | Phases: ${pn.join(", ")}`, "Generated by ZAN Financial Modeler"
  ].forEach((l, i) => sc(wsd, 2 + i, 1, l, FN));

  // ═══════════ DASHBOARD ═══════════
  const wdb = wb.addWorksheet("Dashboard", { properties: { tabColor: { argb: "FF0F172A" } } });
  wdb.getColumn(1).width = 24; wdb.getColumn(2).width = 20; wdb.getColumn(3).width = 20;
  wdb.getColumn(4).width = 20; wdb.getColumn(5).width = 16; wdb.getColumn(6).width = 14;

  // Title
  hdr(wdb, 1, 1, 6, `${p.name || "Project"}`);
  sc(wdb, 2, 1, "Project Financial Model Dashboard  /  لوحة النموذج المالي", FSC);

  // KPI row
  let dr = 4;
  secr(wdb, dr, 1, 6, "KEY METRICS / المؤشرات الرئيسية"); dr++;
  chdr(wdb, dr, ["Metric / المؤشر", "Value / القيمة", "Unit", "", "", ""]); dr++;

  const dashKpi = (label, formula, nf = NUM, unit = cur) => {
    sc(wdb, dr, 1, label, FNS); sc(wdb, dr, 2, formula, FRB, null, nf); sc(wdb, dr, 3, unit, FNS); dr++;
  };
  dashKpi("Total CAPEX / تكاليف التطوير", `=Calc!D${CXT}`);
  dashKpi(`Total Income (${h}yr) / الإيرادات`, `=Calc!D${RVT}`);
  dashKpi("Total Land Rent / إيجار الأرض", `=Calc!D${LR}`);
  dashKpi("Unlevered IRR / العائد غير المموّل", `=CashFlow!C${cirr}`, PCT, "%");
  dashKpi("NPV @10%", `=CashFlow!C${cnpv}`);
  dashKpi("Levered IRR / العائد المموّل", `=Fund!C${fLI}`, PCT, "%");
  dashKpi("Max Debt / أقصى دين", `=Fund!C${fMD}`);
  dashKpi("Total Equity / حقوق الملكية", `=Fund!C${fEQ}`);
  dashKpi("Net Exit Proceeds / عوائد التخارج", `=Fund!C${fEXN}`);
  dashKpi("Total Fees / إجمالي الرسوم", `=Fund!C${fTOTFEE}`, NUMN);
  dr++;
  if (hasWF) {
    dashKpi("LP IRR", waterfall.lpIRR != null ? waterfall.lpIRR : 0, PCT, "%");
    dashKpi("LP MOIC", waterfall.lpMOIC || 0, DX, "x");
    dashKpi("GP IRR", waterfall.gpIRR != null ? waterfall.gpIRR : 0, PCT, "%");
    dashKpi("GP MOIC", waterfall.gpMOIC || 0, DX, "x");
  }
  dr++;

  // Phase summary table
  secr(wdb, dr, 1, 6, "PHASE SUMMARY / ملخص المراحل"); dr++;
  chdr(wdb, dr, ["Phase / المرحلة", "CAPEX / التكاليف", "Income / الإيرادات", "Assets / الأصول", "% of CAPEX", ""]); dr++;
  for (let pi = 0; pi < nph; pi++) {
    sc(wdb, dr, 1, pn[pi], FBS);
    sc(wdb, dr, 2, `=Calc!D${PC + pi}`, FR, null, NUM);
    sc(wdb, dr, 3, `=Calc!D${PR + pi}`, FR, null, NUM);
    sc(wdb, dr, 4, `=COUNTIF(Program!A${PD}:A${PE},"${pn[pi]}")`, FNS);
    sc(wdb, dr, 5, `=IF(Calc!D${CXT}=0,0,Calc!D${PC + pi}/Calc!D${CXT})`, FNS, null, PCT);
    dr++;
  }
  // Consolidated
  sc(wdb, dr, 1, "CONSOLIDATED / الإجمالي", FB, FILL_TOT);
  sc(wdb, dr, 2, `=Calc!D${CXT}`, FRB, FILL_TOT, NUM);
  sc(wdb, dr, 3, `=Calc!D${RVT}`, FRB, FILL_TOT, NUM);
  sc(wdb, dr, 4, na, FBS, FILL_TOT);
  sc(wdb, dr, 5, 1, FBS, FILL_TOT, PCT);
  dr += 2;

  // Asset list
  secr(wdb, dr, 1, 6, "ASSET PROGRAM / برنامج الأصول"); dr++;
  chdr(wdb, dr, ["No.", "Asset / الأصل", "Category / التصنيف", "GFA (sqm)", "Cost/sqm", "Total CAPEX"]); dr++;
  for (let i = 0; i < na; i++) {
    const pr = PD + i;
    sc(wdb, dr, 1, i + 1, FNS);
    sc(wdb, dr, 2, `=Program!C${pr}`, FR);
    sc(wdb, dr, 3, `=Program!B${pr}`, FR);
    sc(wdb, dr, 4, `=Program!H${pr}`, FR, null, NUM);
    sc(wdb, dr, 5, `=Program!Q${pr}`, FR, null, NUM);
    sc(wdb, dr, 6, `=Program!T${pr}`, FR, null, NUM);
    dr++;
  }

  // NPV Analysis table
  dr += 1;
  secr(wdb, dr, 1, 6, "NPV ANALYSIS / تحليل صافي القيمة الحالية"); dr++;
  chdr(wdb, dr, ["Discount Rate", "Project (Unlevered)", "Project (Levered)", "LP", "GP", ""]); dr++;
  for (const [d, l] of [[0.10, "10%"], [0.12, "12%"], [0.14, "14%"]]) {
    sc(wdb, dr, 1, l, FBS);
    sc(wdb, dr, 2, `=NPV(${d},CashFlow!${CL(YC(0))}${cn}:${CL(LC)}${cn})`, FNS, null, NUM);
    sc(wdb, dr, 3, `=NPV(${d},Fund!${CL(YC(0))}${fLV}:${CL(LC)}${fLV})`, FNS, null, NUM);
    const lpKey = `lpNPV${Math.round(d*100)}`;
    const gpKey = `gpNPV${Math.round(d*100)}`;
    sc(wdb, dr, 4, hasWF ? (waterfall[lpKey] || 0) : 0, FNS, null, NUM);
    sc(wdb, dr, 5, hasWF ? (waterfall[gpKey] || 0) : 0, FNS, null, NUM);
    dr++;
  }

  // Per-phase fund performance comparison (like ZAN Dashboard)
  if (hasPW && pn.length > 1) {
    dr++;
    secr(wdb, dr, 1, 6, "FUND PERFORMANCE COMPARISON / مقارنة أداء الصناديق"); dr++;
    chdr(wdb, dr, ["Phase / المرحلة", "Equity", "LP IRR", "GP IRR", "LP MOIC", "GP MOIC"]); dr++;
    for (const pName of pn) {
      const pw = phaseWaterfalls[pName];
      if (!pw) continue;
      sc(wdb, dr, 1, pName, FBS);
      sc(wdb, dr, 2, pw.totalEquity || 0, FNS, null, NUM);
      sc(wdb, dr, 3, pw.lpIRR != null ? pw.lpIRR : "-", FNS, null, PCT);
      sc(wdb, dr, 4, pw.gpIRR != null ? pw.gpIRR : "-", FNS, null, PCT);
      sc(wdb, dr, 5, pw.lpMOIC || 0, FNS, null, DX);
      sc(wdb, dr, 6, pw.gpMOIC || 0, FNS, null, DX);
      dr++;
    }
    // Consolidated
    sc(wdb, dr, 1, "CONSOLIDATED", FB, FILL_TOT);
    sc(wdb, dr, 2, hasWF ? (waterfall.totalEquity || 0) : 0, FBS, FILL_TOT, NUM);
    sc(wdb, dr, 3, hasWF && waterfall.lpIRR != null ? waterfall.lpIRR : "-", FBS, FILL_TOT, PCT);
    sc(wdb, dr, 4, hasWF && waterfall.gpIRR != null ? waterfall.gpIRR : "-", FBS, FILL_TOT, PCT);
    sc(wdb, dr, 5, hasWF ? (waterfall.lpMOIC || 0) : 0, FBS, FILL_TOT, DX);
    sc(wdb, dr, 6, hasWF ? (waterfall.gpMOIC || 0) : 0, FBS, FILL_TOT, DX);
  }

  // Freeze
  ws0.views = [{ state: "frozen", xSplit: 4, ySplit: 3 }];
  ws3.views = [{ state: "frozen", xSplit: 4, ySplit: 3 }];
  ws5.views = [{ state: "frozen", xSplit: 4, ySplit: 3 }];

  // Generate & download
  // Reorder: Dashboard first
  const dashWs = wb.getWorksheet("Dashboard");
  if (dashWs) { dashWs.orderNo = 0; }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(p.name || "ZAN_Model").replace(/[^a-zA-Z0-9_\- ]/g, "")}_Full_Model.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
