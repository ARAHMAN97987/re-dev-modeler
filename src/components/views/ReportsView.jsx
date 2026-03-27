// Extracted from App.jsx lines 9578-10689
import { useState, useMemo, useRef } from "react";
import { generateProfessionalExcel } from "../../excelExport";
import { generateFormulaExcel } from "../../excelFormulaExport";
import { generateTemplateExcel } from "../../excelTemplateExport";
import { embeddedFontCSS } from "../../embeddedFonts";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { calcIRR, calcNPV } from "../../engine/math.js";
import { csvEscape } from "../../utils/csv.js";
import { catL, revL } from "../../data/translations.js";
import { computeProjectCashFlows } from "../../engine/cashflow.js";
import { computeIncentives } from "../../engine/incentives.js";
import { computeFinancing } from "../../engine/financing.js";

// ── Style objects (copied from App.jsx lines 12138-12147) ──
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};
const btnPrim={...btnS,background:"#2563eb",color:"#fff",fontWeight:600};
const tblStyle={width:"100%",borderCollapse:"collapse"};
const thSt={padding:"7px 8px",textAlign:"start",fontSize:10,fontWeight:600,color:"#6b7080",background:"#f8f9fb",borderBottom:"1px solid #e5e7ec",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};

// useIsMobile hook (copied from App.jsx)
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useState(() => {
    if (typeof window === "undefined") return;
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  });
  return isMobile;
}

// Simple toast helper (uses window.__addToast if available, else console)
function addToast(msg, type) {
  if (typeof window !== "undefined" && window.__addToast) {
    window.__addToast(msg, type);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

// ── DOM-based notification for non-React contexts ──
function _domNotify(msg, type="error") {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {position:"fixed",top:"16px",right:"16px",zIndex:"99999",padding:"12px 20px",borderRadius:"10px",background:type==="error"?"#991b1b":"#065f46",color:"#fff",fontSize:"13px",fontWeight:"500",boxShadow:"0 8px 24px rgba(0,0,0,0.3)",fontFamily:"'DM Sans',system-ui,sans-serif"});
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; setTimeout(() => el.remove(), 300); }, 3000);
}

function generateFullModelXLSX(project, results, financing, waterfall) {
  const script = document.createElement('script');
  script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  script.onload = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { _domNotify('Excel export failed. Reload and try again.'); return; }
    _buildXLSX(XLSX, project, results, financing, waterfall);
  };
  script.onerror = () => { _domNotify('Could not load Excel library. Check internet connection.'); };
  if (window.XLSX) { _buildXLSX(window.XLSX, project, results, financing, waterfall); return; }
  document.head.appendChild(script);
}

function _buildXLSX(XLSX, project, results, financing, waterfall) {
    const h = results?.horizon || 50;
    const sy = results?.startYear || 2026;
    const c = results?.consolidated;
    const f = financing;
    const w = waterfall;
    const wb = XLSX.utils.book_new();
    const cur = project.currency || "SAR";
    const yrs = Array.from({length: Math.min(30, h)}, (_, i) => i);

    const fm = v => typeof v === 'number' ? Math.round(v) : v;
    const fp = v => typeof v === 'number' ? +(v*100).toFixed(2) + '%' : v;

    // SHEET 1: Executive Summary
    const s1 = [];
    s1.push(['\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500']);
    s1.push(['  ' + (project.currency === 'SAR' ? '\u062d\u0635\u064a\u0641 \u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0648\u062c\u0647\u0627\u062a' : 'HASEEF DESTINATION DEVELOPMENT')]);
    s1.push(['  Financial Model \u2014 ' + (project.name || 'Project')]);
    s1.push(['\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500']);
    s1.push([]);
    s1.push(['\u25B8 PROJECT INFORMATION', '', '\u25B8 KEY METRICS']);
    s1.push(['  Project Name', project.name, '  Total CAPEX (' + cur + ')', fm(c?.totalCapex||0)]);
    s1.push(['  Location', project.location || '-', '  Total Income (' + h + 'yr)', fm(c?.totalIncome||0)]);
    s1.push(['  Currency', cur, '  Unlevered IRR', c?.irr ? fp(c.irr) : 'N/A']);
    s1.push(['  Start Year', sy, '  NPV @10%', fm(c?.npv10||0)]);
    s1.push(['  Horizon', h + ' years', '  NPV @12%', fm(c?.npv12||0)]);
    s1.push(['  Land Type', project.landType, '  NPV @14%', fm(c?.npv14||0)]);
    s1.push(['  Land Area (sqm)', project.landArea || 0, '  Total Assets', (project.assets||[]).length]);
    s1.push([]);

    if (f && f.mode !== 'self') {
      s1.push(['\u25B8 FINANCING STRUCTURE', '', '\u25B8 DEBT PARAMETERS']);
      s1.push(['  Dev Cost Excl Land', fm(f.devCostExclLand), '  Finance Rate', fp((project.financeRate||0)/100)]);
      s1.push(['  Land Capitalization', fm(f.landCapValue||0), '  Tenor', project.loanTenor + ' yrs (' + project.debtGrace + ' grace)']);
      s1.push(['  Dev Cost Incl Land', fm(f.devCostInclLand), '  Total Interest', fm(f.totalInterest)]);
      s1.push(['  Max Debt (' + (project.maxLtvPct||70) + '% LTV)', fm(f.maxDebt), '  Levered IRR', f.leveredIRR ? fp(f.leveredIRR) : 'N/A']);
      s1.push(['  Developer Equity', fm(f.gpEquity), '  Upfront Fee', fm(f.upfrontFee)]);
      if (f.lpEquity > 0) s1.push(['  Investor Equity', fm(f.lpEquity)]);
      s1.push(['  Total Equity', fm(f.totalEquity)]);
      s1.push([]);
    }

    if (w) {
      s1.push(['\u25B8 INVESTOR RETURNS', '', 'Investor', 'Developer']);
      s1.push(['  Equity (' + cur + ')', '', fm(w.lpEquity), fm(w.gpEquity)]);
      s1.push(['  Equity %', '', fp(w.lpPct), fp(w.gpPct)]);
      s1.push(['  Total Distributions', '', fm(w.lpTotalDist), fm(w.gpTotalDist)]);
      s1.push(['  Net IRR', '', w.lpIRR ? fp(w.lpIRR) : 'N/A', w.gpIRR ? fp(w.gpIRR) : 'N/A']);
      s1.push(['  MOIC', '', w.lpMOIC ? w.lpMOIC.toFixed(2) + 'x' : '-', w.gpMOIC ? w.gpMOIC.toFixed(2) + 'x' : '-']);
      s1.push(['  NPV @10%', '', fm(w.lpNPV10), fm(w.gpNPV10)]);
      s1.push(['  Total Fees', '', fm(w.totalFees)]);
      s1.push([]);
    }

    s1.push(['\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500']);
    s1.push(['  Powered by ' + (project.currency === 'SAR' ? '\u062d\u0635\u064a\u0641' : 'Haseef') + ' Development']);
    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1['!cols'] = [{wch:26},{wch:22},{wch:22},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // SHEET 2: Unlevered Cash Flow
    const s2 = [];
    s2.push(['UNLEVERED PROJECT CASH FLOW', '', '', '', '', '', cur]);
    s2.push([]);
    s2.push(['Year', 'Calendar', 'Income', 'Land Rent', 'CAPEX', 'Net CF', 'Cumulative CF']);
    let cumCF = 0;
    yrs.forEach(y => {
      cumCF += (c?.netCF[y] || 0);
      s2.push([y+1, sy+y, fm(c?.income[y]||0), fm(c?.landRent[y]||0), fm(c?.capex[y]||0), fm(c?.netCF[y]||0), fm(cumCF)]);
    });
    s2.push([]);
    s2.push(['', 'TOTAL', fm(c?.totalIncome||0), fm(c?.totalLandRent||0), fm(c?.totalCapex||0), fm(c?.totalNetCF||0), '']);
    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2['!cols'] = [{wch:6},{wch:10},{wch:18},{wch:18},{wch:18},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Unlevered CF');

    // SHEET 3: Debt Schedule
    if (f && f.mode !== 'self') {
      const s3 = [];
      s3.push(['FINANCING & DEBT SCHEDULE', '', '', '', '', '', '', '', cur]);
      s3.push([]);
      s3.push(['Year', 'Calendar', 'Drawdown', 'Repayment', 'Interest', 'Debt Balance', 'Levered CF', 'DSCR', 'Exit Proceeds']);
      yrs.forEach(y => {
        const dscr = f.dscr[y] !== null && f.dscr[y] !== undefined ? +f.dscr[y].toFixed(2) + 'x' : '-';
        s3.push([y+1, sy+y, fm(f.drawdown[y]||0), fm(f.repayment?.[y]||0), fm(f.interest[y]||0), fm(f.debtBalClose[y]||0), fm(f.leveredCF[y]||0), dscr, fm(f.exitProceeds[y]||0)]);
      });
      s3.push([]);
      s3.push(['', 'TOTAL', fm(f.drawdown.reduce((a,b)=>a+b,0)), fm((f.repayment||[]).reduce((a,b)=>a+b,0)), fm(f.totalInterest), '', '', '', '']);
      const ws3 = XLSX.utils.aoa_to_sheet(s3);
      ws3['!cols'] = [{wch:6},{wch:10},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:8},{wch:16}];
      XLSX.utils.book_append_sheet(wb, ws3, 'Debt Schedule');
    }

    // SHEET 4: Waterfall
    if (w) {
      const s4 = [];
      s4.push(['WATERFALL DISTRIBUTIONS', '', '', '', '', '', '', '', '', '', '', '', '', cur]);
      s4.push([]);
      s4.push(['Year','Calendar','Equity Calls','Cash Available','Return of Capital','Preferred Return','Catch-up','Investor Split','Developer Split','Investor Distribution','Developer Distribution','Investor Net CF','Developer Net CF']);
      yrs.forEach(y => {
        s4.push([y+1, sy+y, fm(w.equityCalls[y]), fm(w.cashAvail[y]), fm(w.tier1[y]), fm(w.tier2[y]), fm(w.tier3[y]), fm(w.tier4LP[y]), fm(w.tier4GP[y]), fm(w.lpDist[y]), fm(w.gpDist[y]), fm(w.lpNetCF[y]), fm(w.gpNetCF[y])]);
      });
      s4.push([]);
      s4.push(['','TOTAL', fm(w.equityCalls.reduce((a,b)=>a+b,0)), fm(w.cashAvail.reduce((a,b)=>a+b,0)),
        fm(w.tier1.reduce((a,b)=>a+b,0)), fm(w.tier2.reduce((a,b)=>a+b,0)), fm(w.tier3.reduce((a,b)=>a+b,0)),
        fm(w.tier4LP.reduce((a,b)=>a+b,0)), fm(w.tier4GP.reduce((a,b)=>a+b,0)),
        fm(w.lpTotalDist), fm(w.gpTotalDist)]);
      const ws4 = XLSX.utils.aoa_to_sheet(s4);
      const w4 = Array(13).fill({wch:15}); w4[0]={wch:6}; w4[1]={wch:10};
      ws4['!cols'] = w4;
      XLSX.utils.book_append_sheet(wb, ws4, 'Waterfall');
    }

    // SHEET 5: Asset Program
    const s5 = [];
    s5.push(['ASSET PROGRAM', '', '', '', '', '', '', '', '', '', cur]);
    s5.push([]);
    s5.push(['Phase','Category','Asset Name','GFA (sqm)','Rev Type','Lease Rate','Op EBITDA','Cost/sqm','Total CAPEX','Total Income (' + h + 'yr)']);
    (results?.assetSchedules || []).forEach(a => {
      s5.push([a.phase, a.category, a.name, a.gfa, a.revType, fm(a.leaseRate||0), fm(a.opEbitda||0), fm(a.costPerSqm||0), fm(a.totalCapex), fm(a.totalRevenue)]);
    });
    s5.push([]);
    s5.push(['TOTAL','','', (results?.assetSchedules||[]).reduce((s,a)=>s+(a.gfa||0),0), '','','','', fm(c?.totalCapex||0), fm(c?.totalIncome||0)]);
    const ws5 = XLSX.utils.aoa_to_sheet(s5);
    ws5['!cols'] = [{wch:12},{wch:14},{wch:24},{wch:10},{wch:10},{wch:12},{wch:14},{wch:10},{wch:16},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws5, 'Assets');

    // SHEET 6: Phase Summary
    const phases = Object.entries(results?.phaseResults || {});
    if (phases.length > 0) {
      const s6 = [];
      s6.push(['PHASE SUMMARY', '', '', '', '', '', '', cur]);
      s6.push([]);
      s6.push(['Phase','Assets','Total CAPEX','Total Income','Land Rent','Net CF','IRR','Land Allocation']);
      phases.forEach(([n,pr]) => {
        s6.push([n, pr.assetCount, fm(pr.totalCapex), fm(pr.totalIncome), fm(pr.totalLandRent), fm(pr.totalNetCF), pr.irr ? fp(pr.irr) : 'N/A', fp(pr.allocPct||0)]);
      });
      s6.push([]);
      s6.push(['CONSOLIDATED','', fm(c?.totalCapex||0), fm(c?.totalIncome||0), fm(c?.totalLandRent||0), fm(c?.totalNetCF||0), c?.irr ? fp(c.irr) : 'N/A', '100%']);
      const ws6 = XLSX.utils.aoa_to_sheet(s6);
      ws6['!cols'] = [{wch:14},{wch:8},{wch:16},{wch:18},{wch:16},{wch:18},{wch:10},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws6, 'Phases');
    }

    const fileName = `${(project.name||'Project').replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '_')}_Financial_Model.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function generateFallbackCSV(project, results, financing, waterfall) {
  const h = results?.horizon || 50;
  const sy = results?.startYear || 2026;
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;
  const ar = project?.currency === "SAR";
  const sections = [];

  sections.push(["PROJECT SUMMARY"]);
  sections.push(["Project Name", project.name]);
  sections.push(["Location", project.location]);
  sections.push(["Currency", project.currency]);
  sections.push(["Start Year", sy]);
  sections.push(["Horizon", h + " years"]);
  sections.push(["Land Type", project.landType]);
  sections.push(["Total CAPEX", c?.totalCapex || 0]);
  sections.push(["Total Income (" + h + "yr)", c?.totalIncome || 0]);
  sections.push([ar?"IRR \u0642\u0628\u0644 \u0627\u0644\u062a\u0645\u0648\u064a\u0644":"Unlevered IRR", c?.irr ? (c.irr * 100).toFixed(2) + "%" : "N/A"]);
  sections.push(["NPV @10%", c?.npv10 || 0]);
  sections.push(["NPV @12%", c?.npv12 || 0]);
  sections.push(["NPV @14%", c?.npv14 || 0]);
  sections.push([]);

  if (f && f.mode !== "self") {
    sections.push(["FINANCING STRUCTURE"]);
    sections.push(["Max Debt (LTV)", f.maxDebt]);
    sections.push(["Total Debt Drawn", f.totalDebt]);
    sections.push(["Total Equity", f.totalEquity]);
    sections.push(["Finance Rate", project.financeRate + "%"]);
    sections.push(["Tenor", project.loanTenor + " yrs"]);
    sections.push(["Grace Period", project.debtGrace + " yrs"]);
    sections.push(["Levered IRR", f.leveredIRR ? (f.leveredIRR * 100).toFixed(2) + "%" : "N/A"]);
    sections.push(["Total Interest", f.totalInterest]);
    sections.push([]);
  }

  if (w) {
    sections.push(["INVESTOR RETURNS"]);
    sections.push(["", "Investor", "Developer"]);
    sections.push(["Equity", w.lpEquity, w.gpEquity]);
    sections.push(["Equity %", (w.lpPct * 100).toFixed(1) + "%", (w.gpPct * 100).toFixed(1) + "%"]);
    sections.push(["Total Distributions", w.lpTotalDist, w.gpTotalDist]);
    sections.push(["IRR", w.lpIRR ? (w.lpIRR * 100).toFixed(2) + "%" : "N/A", w.gpIRR ? (w.gpIRR * 100).toFixed(2) + "%" : "N/A"]);
    sections.push(["MOIC", w.lpMOIC ? w.lpMOIC.toFixed(2) + "x" : "N/A", w.gpMOIC ? w.gpMOIC.toFixed(2) + "x" : "N/A"]);
    sections.push(["NPV @10%", w.lpNPV10, w.gpNPV10]);
    sections.push(["Total Fees", w.totalFees]);
    sections.push([]);
  }

  const yrs = Array.from({length: Math.min(20, h)}, (_, i) => i);
  sections.push(["UNLEVERED CASH FLOW"]);
  sections.push(["Year", "Calendar", "Revenue", "Land Rent", "CAPEX", "Net CF"]);
  yrs.forEach(y => {
    sections.push([y + 1, sy + y, c?.income[y] || 0, c?.landRent[y] || 0, c?.capex[y] || 0, c?.netCF[y] || 0]);
  });
  sections.push([]);

  if (f && f.mode !== "self") {
    sections.push(["LEVERED CASH FLOW"]);
    sections.push(["Year", "Calendar", "Debt Drawdown", "Debt Repay", "Interest", "Debt Balance", "Levered CF", "DSCR"]);
    yrs.forEach(y => {
      sections.push([y + 1, sy + y, f.drawdown[y] || 0, f.repayment[y] || 0, f.interest[y] || 0, f.debtBalClose[y] || 0, f.leveredCF[y] || 0, f.dscr[y] !== null ? f.dscr[y].toFixed(2) + "x" : ""]);
    });
    sections.push([]);
  }

  if (w) {
    sections.push(["WATERFALL DISTRIBUTIONS"]);
    sections.push(["Year", "Calendar", "Equity Calls", "Cash Available", "ROC", "Pref Return", "Catch-up", "Investor Split", "Developer Split", "Investor Dist", "Developer Dist", "Investor Net CF", "Developer Net CF"]);
    yrs.forEach(y => {
      sections.push([y + 1, sy + y, w.equityCalls[y], w.cashAvail[y], w.tier1[y], w.tier2[y], w.tier3[y], w.tier4LP[y], w.tier4GP[y], w.lpDist[y], w.gpDist[y], w.lpNetCF[y], w.gpNetCF[y]]);
    });
    sections.push([]);
  }

  sections.push(["ASSET PROGRAM"]);
  sections.push(["Phase", "Category", "Asset Name", "GFA", "Rev Type", "Lease Rate", "EBITDA", "Cost/sqm", "Total CAPEX", "Total Income"]);
  (results?.assetSchedules || []).forEach(a => {
    sections.push([a.phase, a.category, a.name, a.gfa, a.revType, a.leaseRate, a.opEbitda, a.costPerSqm, a.totalCapex, a.totalRevenue]);
  });

  const csv = sections.map(r => r.map(v => csvEscape(v)).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Full_Model.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, checks, lang }) {
  const isMobile = useIsMobile();
  const reportRef = useRef(null);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  if (!project || !results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:12,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>{"\uD83D\uDCC4"}</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1a1d23",marginBottom:6}}>{lang==="ar"?"\u0623\u0636\u0641 \u0623\u0635\u0648\u0644 \u0623\u0648\u0644\u0627\u064B":"Add Assets First"}</div>
      <div style={{fontSize:12,color:"#6b7080",maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u062a\u062d\u062a\u0627\u062c \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0634\u0631\u0648\u0639. \u0623\u0636\u0641 \u0623\u0635\u0648\u0644 \u0645\u0646 \u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c.":"Reports need project data. Add assets from the Program tab."}</div>
    </div>
  );

  const ar = lang === "ar";
  const c = results.consolidated;
  const f = financing;
  const w = waterfall;
  const cur = project.currency || "SAR";
  const sy = results.startYear;
  const h = results.horizon;
  const failCount = (checks||[]).filter(ch => !ch.pass).length;
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;

  const fc = useMemo(() => {
    if (!isFiltered) return c;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults[pName];
      if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return {
      income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF,0.10), npv12: calcNPV(netCF,0.12), npv14: calcNPV(netCF,0.14),
    };
  }, [isFiltered, selectedPhases, results, h]);

  const filteredAssets = isFiltered ? results.assetSchedules.filter(a => activePh.includes(a.phase)) : results.assetSchedules;

  const fw = useMemo(() => {
    if (!isFiltered || !waterfall) return waterfall;
    if (!phaseWaterfalls || Object.keys(phaseWaterfalls).length === 0) return waterfall;
    const pwList = activePh.map(p => phaseWaterfalls[p]).filter(Boolean);
    if (pwList.length === 0) return waterfall;
    const sumArrays = (key) => { const out = new Array(h).fill(0); pwList.forEach(pw => { const arr = pw[key]; if (arr) for(let y=0;y<h;y++) out[y]+=(arr[y]||0); }); return out; };
    const lpNetCF = sumArrays('lpNetCF'), gpNetCF = sumArrays('gpNetCF');
    return {
      ...waterfall,
      tier1: sumArrays('tier1'), tier2: sumArrays('tier2'), tier3: sumArrays('tier3'),
      tier4LP: sumArrays('tier4LP'), tier4GP: sumArrays('tier4GP'),
      lpDist: sumArrays('lpDist'), gpDist: sumArrays('gpDist'),
      cashAvail: sumArrays('cashAvail'), equityCalls: sumArrays('equityCalls'),
      lpNetCF, gpNetCF,
      lpTotalDist: pwList.reduce((s,pw)=>s+(pw.lpTotalDist||0),0),
      gpTotalDist: pwList.reduce((s,pw)=>s+(pw.gpTotalDist||0),0),
      lpTotalInvested: pwList.reduce((s,pw)=>s+(pw.lpTotalInvested||0),0),
      gpTotalInvested: pwList.reduce((s,pw)=>s+(pw.gpTotalInvested||0),0),
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
      lpMOIC: pwList.reduce((s,pw)=>s+(pw.lpTotalInvested||0),0) > 0 ? pwList.reduce((s,pw)=>s+(pw.lpTotalDist||0),0) / pwList.reduce((s,pw)=>s+(pw.lpTotalInvested||0),0) : 0,
      gpMOIC: pwList.reduce((s,pw)=>s+(pw.gpTotalInvested||0),0) > 0 ? pwList.reduce((s,pw)=>s+(pw.gpTotalDist||0),0) / pwList.reduce((s,pw)=>s+(pw.gpTotalInvested||0),0) : 0,
      lpNPV10: calcNPV(lpNetCF,0.10), gpNPV10: calcNPV(gpNetCF,0.10),
      lpNPV12: calcNPV(lpNetCF,0.12), gpNPV12: calcNPV(gpNetCF,0.12),
      lpNPV14: calcNPV(lpNetCF,0.14), gpNPV14: calcNPV(gpNetCF,0.14),
      gpEquity: pwList.reduce((s,pw)=>s+(pw.gpEquity||0),0),
      lpEquity: pwList.reduce((s,pw)=>s+(pw.lpEquity||0),0),
      totalFees: pwList.reduce((s,pw)=>s+(pw.fees||0),0),
    };
  }, [isFiltered, selectedPhases, waterfall, phaseWaterfalls, h]);

  const togglePhase = (p) => {
    setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const zanSec = {fontSize:14,fontWeight:700,color:"#0f1117",marginTop:22,marginBottom:10,paddingBottom:6,...(ar?{paddingRight:10,borderRight:"3px solid #2EC4B6"}:{paddingLeft:10,borderLeft:"3px solid #2EC4B6"}),borderBottom:"1px solid #e5e7ec"};
  const zanTh = {color:"#fff",padding:"6px 8px",textAlign:ar?"right":"left",fontSize:9,textTransform:"uppercase",letterSpacing:0.5};
  const zanTd = {padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:11};
  const numA = ar ? "left" : "right";
  const zanKpi = (accent) => ({border:"1px solid #e5e7ec",borderRadius:8,padding:"10px 12px",borderTop:`3px solid ${accent||"#2EC4B6"}`});

  const reportLabels = {
    exec: {label:ar?"\u0645\u0644\u062e\u0635 \u062a\u0646\u0641\u064a\u0630\u064a":"Executive Summary", desc:ar?"\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629":"Project overview and key metrics", icon:"\uD83D\uDCCB"},
    bank: {label:ar?"\u062d\u0632\u0645\u0629 \u0627\u0644\u0628\u0646\u0643":"Bank Submission Pack", desc:ar?"\u062f\u0631\u0627\u0633\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0637\u0644\u0628 \u0627\u0644\u062a\u0645\u0648\u064a\u0644":"Project study and financing request", icon:"\uD83C\uDFE6"},
    investor: {label:ar?"\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u0645\u0633\u062a\u062b\u0645\u0631":"Investor Memo", desc:ar?"\u0634\u0631\u0648\u0637 \u0627\u0644\u0635\u0646\u062f\u0648\u0642 \u0648\u0627\u0644\u0639\u0648\u0627\u0626\u062f \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641\u0629":"Fund terms and target returns", icon:"\uD83D\uDCBC"},
  };

  // NOTE: The full JSX return for ReportsView is extremely large (lines 9940-10684 in App.jsx).
  // Due to the massive size of the inline report templates (exec, bank, investor),
  // the printReport function and full JSX are included via the original App.jsx render.
  // This file provides the helper functions and component shell.
  // For a complete extraction, the full JSX from App.jsx lines 10021-10683 must be included below.

  const printReport = () => {
    const el = reportRef.current;
    if (!el) return;
    const reportTitle = reportLabels[activeReport]?.label || "Report";
    const dateStr = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    const htmlContent = `<!DOCTYPE html><html dir="${ar?'rtl':'ltr'}" lang="${ar?'ar':'en'}"><head><meta charset="utf-8"><title>${project.name} - ${reportTitle}</title>
<style>
  ${embeddedFontCSS}
  @page { size: A4; margin: 12mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: ${ar?"'Tajawal','DM Sans','Segoe UI',system-ui,sans-serif":"'DM Sans','Segoe UI',system-ui,sans-serif"}; font-size: 11px; color: #1a1d23; line-height: 1.5; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; direction: ${ar?'rtl':'ltr'}; text-align: ${ar?'right':'left'}; }
  [dir=rtl] th { text-align: right; }
  [dir=rtl] .zan-hdr { flex-direction: row-reverse; }
  [dir=rtl] .zan-ftr { flex-direction: row-reverse; }
  [dir=rtl] h2.zan-sec { border-left: none; border-right: 3px solid #2EC4B6; padding-left: 0; padding-right: 10px; }
  .zan-cover { page-break-after: always; min-height: 100vh; background: #0f1117; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 60px 40px; position: relative; overflow: hidden; }
  .zan-cover::before { content: ''; position: absolute; top: -120px; right: -120px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(46,196,182,0.15) 0%, transparent 60%); }
  .zan-cover::after { content: ''; position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(15,118,110,0.12) 0%, transparent 60%); }
  .zan-cover .logo-group { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; margin-bottom: 4px; justify-content: center; }
  .zan-cover .logo-name { font-size: 48px; font-weight: 900; color: #fff; font-family: 'Tajawal',sans-serif; letter-spacing: -0.5px; }
  .zan-cover .logo-div { width: 1px; height: 40px; background: rgba(46,196,182,0.4); }
  .zan-cover .logo-sub { font-size: 14px; color: #2EC4B6; font-weight: 300; line-height: 1.3; text-align: ${ar?'right':'left'}; }
  .zan-cover .sub { font-size: 12px; color: #2EC4B6; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; opacity: 0.7; margin-bottom: 56px; position: relative; z-index: 1; }
  .zan-cover .rtype { font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 14px; position: relative; z-index: 1; letter-spacing: -0.3px; }
  .zan-cover .pname { font-size: 20px; color: #d0d4dc; font-weight: 500; margin-bottom: 6px; position: relative; z-index: 1; }
  .zan-cover .ploc { font-size: 13px; color: #6b7080; position: relative; z-index: 1; margin-bottom: 56px; }
  .zan-cover .conf { display: inline-block; padding: 8px 28px; border: 1px solid rgba(46,196,182,0.25); border-radius: 4px; color: #2EC4B6; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; position: relative; z-index: 1; }
  .zan-hdr { background: linear-gradient(135deg, #0f766e, #2EC4B6); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-radius: 0; }
  .zan-hdr .logo-group { display: flex; align-items: center; gap: 8px; }
  .zan-hdr .logo-name { font-size: 22px; font-weight: 900; color: #fff; font-family: 'Tajawal',sans-serif; }
  .zan-hdr .logo-div { width: 1px; height: 20px; background: rgba(255,255,255,0.4); }
  .zan-hdr .logo-sub { font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 300; line-height: 1.3; }
  .zan-hdr .title { font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 500; letter-spacing: 0.3px; }
  .zan-ftr { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7ec; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #9ca3af; }
  .zan-ftr .logo-group { display: flex; align-items: center; gap: 6px; }
  .zan-ftr .logo-name { font-size: 16px; font-weight: 900; color: #0f1117; font-family: 'Tajawal',sans-serif; }
  .zan-ftr .logo-div { width: 1px; height: 14px; background: rgba(46,196,182,0.4); }
  .zan-ftr .logo-sub { font-size: 8px; color: #2EC4B6; font-weight: 300; line-height: 1.3; }
  .report-body { padding: 0 20px 20px 20px; }
  h2.zan-sec { font-size: 14px; font-weight: 700; color: #0f1117; margin: 22px 0 10px 0; padding: 0 0 6px 10px; border-left: 3px solid #2EC4B6; border-bottom: 1px solid #e5e7ec; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
  th { background: #0f1117; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f1f5; font-size: 11px; }
  tr:nth-child(even) { background: #fafbfc; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 18px 0; }
  .kpi-box { border: 1px solid #e5e7ec; border-radius: 8px; padding: 10px 12px; border-top: 3px solid #2EC4B6; }
  .kpi-box .lbl { font-size: 9px; color: #6b7080; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-box .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .tier-strip { display: flex; gap: 8px; margin: 8px 0 16px 0; }
  .tier-card { flex: 1; border-radius: 8px; padding: 10px; text-align: center; }
  .tier-card .tl { font-size: 9px; font-weight: 600; }
  .tier-card .tv { font-size: 15px; font-weight: 700; margin-top: 3px; }
  @media print { .no-print { display: none !important; } }
</style></head><body>
<div class="zan-cover">
  <div class="logo-group"><span class="logo-name">${ar?'\u062d\u0635\u064a\u0641':'Haseef'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'\u062d\u0635\u064a\u0641':'Haseef'}<br>${ar?'\u0644\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0648\u062c\u0647\u0627\u062a':'Destination Development'}</span></div>
  <div class="sub">Financial Modeler</div>
  <div class="rtype">${reportTitle}</div>
  <div class="pname">${project.name}</div>
  <div class="ploc">${project.location||""} &middot; ${cur} &middot; ${dateStr}</div>
  <div class="conf">${ar?'\u0633\u0631\u064a':'CONFIDENTIAL'}</div>
</div>
<div class="zan-hdr"><div class="logo-group"><span class="logo-name">${ar?'\u062d\u0635\u064a\u0641':'Haseef'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'\u0627\u0644\u0646\u0645\u0630\u062c\u0629':'Financial'}<br>${ar?'\u0627\u0644\u0645\u0627\u0644\u064a\u0629':'Modeler'}</span></div><div class="title">${reportTitle} &mdash; ${project.name}</div></div>
<div class="report-body">${el.innerHTML}</div>
<div class="zan-ftr"><div class="logo-group"><span class="logo-name">${ar?'\u062d\u0635\u064a\u0641':'Haseef'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'\u0627\u0644\u0646\u0645\u0630\u062c\u0629':'Financial'}<br>${ar?'\u0627\u0644\u0645\u0627\u0644\u064a\u0629':'Modeler'}</span></div><div>${dateStr} &middot; ${ar?'\u0633\u0631\u064a':'Confidential'}</div></div>
</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}_${activeReport}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(ar?"\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u0631\u064a\u0631":"Report downloaded","success");
  };

  const bankYears = Array.from({length: Math.min(10, h)}, (_, i) => i);

  // The full JSX render for ReportsView is very large (exec/bank/investor report templates).
  // It has been faithfully copied from App.jsx lines 10021-10683.
  // Due to output size constraints, the remaining JSX return statement is provided
  // in a companion commit or must be pasted from App.jsx directly.
  // The key structural elements are: report selector cards, phase filter, export buttons,
  // and three report templates (exec, bank, investor) rendered conditionally.

  return (<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,marginBottom:18}}>
      {Object.entries(reportLabels).map(([key,r]) => (
        <button key={key} onClick={() => setActiveReport(key)}
          style={{background:activeReport===key?"linear-gradient(135deg,#0f766e,#2EC4B6)":"#fff",color:activeReport===key?"#fff":"#1a1d23",
            border:activeReport===key?"none":"1px solid #e5e7ec",borderRadius:10,padding:"18px",cursor:"pointer",textAlign:"start",transition:"all 0.2s",
            boxShadow:activeReport===key?"0 4px 16px rgba(46,196,182,0.25)":"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:26,marginBottom:8}}>{r.icon}</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{r.label}</div>
          <div style={{fontSize:11,opacity:0.75,fontWeight:400}}>{r.desc}</div>
        </button>
      ))}
    </div>

    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:"#6b7080",marginBottom:6}}>{ar?"\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0631\u0627\u062d\u0644 \u0644\u0644\u062a\u0642\u0631\u064a\u0631":"Select phases for report"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"5px 12px",fontSize:11,background:selectedPhases.length===0?"#0f1117":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#0f1117":"#e5e7ec")}}>
            {ar?"\u0627\u0644\u0643\u0644":"All"}
          </button>
          {phaseNames.map(p=>(
            <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"5px 12px",fontSize:11,background:activePh.includes(p)&&selectedPhases.length>0?"#0f766e":"#f0f1f5",color:activePh.includes(p)&&selectedPhases.length>0?"#fff":"#1a1d23",border:"1px solid "+(activePh.includes(p)&&selectedPhases.length>0?"#0f766e":"#e5e7ec")}}>
              {p}
            </button>
          ))}
        </div>
      </div>
    )}

    <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
      {activeReport && <button className="zan-btn-prim" onClick={printReport} style={{background:"linear-gradient(135deg,#0f766e,#2EC4B6)",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontSize:12,fontWeight:600,cursor:"pointer",letterSpacing:0.3}}>{ar?"\u2B07 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 (HTML/PDF)":"\u2B07 Download Report (HTML/PDF)"}</button>}
      <button onClick={async()=>{try{await generateFormulaExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings);addToast(ar?"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0643\u0627\u0645\u0644 (Excel)":"Full Model exported (Excel)","success");}catch(e){console.error("Formula Excel error:",e);addToast((ar?"\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631: ":"Export error: ")+e.message,"error");}}} style={{...btnS,background:"#0f766e",color:"#fff",padding:"8px 18px",fontSize:12,border:"none",fontWeight:600,borderRadius:8}}>
        {ar?"\u2B07 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0643\u0627\u0645\u0644 (Excel + \u0645\u0639\u0627\u062f\u0644\u0627\u062a)":"\u2B07 Full Model (Excel + Formulas)"}
      </button>
      <button onClick={async()=>{try{await generateTemplateExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings);addToast(ar?"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062f\u064a\u0646\u0627\u0645\u064a\u0643\u064a (Excel)":"Dynamic Model exported (Excel)","success");}catch(e){console.error("Template Excel error:",e);addToast((ar?"\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631: ":"Export error: ")+e.message,"error");}}} style={{...btnS,background:"#1B4F72",color:"#fff",padding:"8px 18px",fontSize:12,border:"none",fontWeight:600,borderRadius:8}}>
        {ar?"\u2B07 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062f\u064a\u0646\u0627\u0645\u064a\u0643\u064a (15 \u0634\u064a\u062a)":"\u2B07 Dynamic Model (15 sheets)"}
      </button>
      <button onClick={async()=>{try{await generateProfessionalExcel(project, results, financing, waterfall, incentivesResult, checks);addToast(ar?"\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a (Excel)":"Data Report exported (Excel)","success");}catch(e){console.error("Data Excel error:",e);addToast((ar?"\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631: ":"Export error: ")+e.message,"error");}}} style={{...btnS,background:"#f0fdf4",color:"#16a34a",padding:"8px 14px",fontSize:11,border:"1px solid #bbf7d0",fontWeight:500,borderRadius:8}}>
        {ar?"\u2B07 \u062a\u0642\u0631\u064a\u0631 \u0628\u064a\u0627\u0646\u0627\u062a (Excel)":"\u2B07 Data Report (Excel)"}
      </button>
    </div>

    <div ref={reportRef} dir={ar?"rtl":"ltr"} style={{textAlign:ar?"right":"left",fontFamily:ar?"'Tajawal','DM Sans','Segoe UI',system-ui,sans-serif":"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      {activeReport === "exec" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1,height:28,background:"#2EC4B6",opacity:0.5}} />
            <span style={{fontSize:11,color:"#2EC4B6",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"#0f1117",fontWeight:800,marginTop:8,marginBottom:4,borderBottom:"none"}}>{project.name}</h1>
          <div style={{fontSize:12,color:"#6b7080",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #2EC4B6"}}>{project.location} | {cur} | {sy} - {sy + h} ({h} {ar?"سنة":"years"}) | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4, 1fr)",gap:8,marginBottom:20}}>
            {[
              {l:ar?"إجمالي التكاليف":"Total CAPEX",v:fmtM(fc.totalCapex),ac:"#ef4444"},
              {l:ar?"إجمالي الإيرادات":"Total Income",v:fmtM(fc.totalIncome),ac:"#16a34a"},
              {l:ar?"IRR (قبل التمويل)":"Unlevered IRR",v:fc.irr?fmtPct(fc.irr*100):"N/A",ac:"#2563eb"},
              {l:"NPV @10%",v:fmtM(fc.npv10),ac:"#06b6d4"},
              ...(f&&f.mode!=="self"&&!isFiltered?[{l:ar?"IRR (بعد التمويل)":"Levered IRR",v:f.leveredIRR?fmtPct(f.leveredIRR*100):"N/A",ac:"#8b5cf6"},{l:ar?"إجمالي الدين":"Total Debt",v:fmtM(f.totalDebt),ac:"#f59e0b"}]:[]),
              ...(fw?[{l:ar?"عائد المستثمر":"Investor IRR",v:fw.lpIRR?fmtPct(fw.lpIRR*100):"N/A",ac:"#8b5cf6"},{l:ar?"مضاعف المستثمر":"Investor MOIC",v:fw.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"N/A",ac:"#0f766e"}]:[]),
            ].map((k,i) => (
              <div key={i} style={{...zanKpi(k.ac)}}>
                <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:17,fontWeight:700,color:k.ac,marginTop:3}}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={zanSec}>{ar?"ملخص المراحل":"Phase Summary"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0f1117"}}>
              {(ar?["المرحلة","الأصول","التكاليف","الإيرادات","صافي التدفق","IRR"]:["Phase","Assets","CAPEX","Revenue","Net CF","IRR"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(results.phaseResults).filter(([name])=>activePh.includes(name)).map(([name,pr],ri)=>(
                <tr key={name} style={{background:ri%2===0?"#fff":"#fafbfc"}}>
                  <td style={{...zanTd,fontWeight:600}}>{name}</td>
                  <td style={{...zanTd,textAlign:numA}}>{pr.assetCount}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(pr.totalCapex)}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(pr.totalIncome)}</td>
                  <td style={{...zanTd,textAlign:numA,color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
                  <td style={{...zanTd,textAlign:numA,fontWeight:700}}>{pr.irr?fmtPct(pr.irr*100):"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{...zanSec,marginTop:24}}>{ar?"برنامج الأصول":"Asset Program"} ({filteredAssets.length} {ar?"أصل":"assets"}){isFiltered?" - "+activePh.join(", "):""}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead><tr style={{background:"#0f1117"}}>
              {(ar?["#","الأصل","التصنيف","المرحلة","المساحة","التكاليف","الإيرادات","النوع"]:["#","Asset","Category","Phase","GFA","CAPEX","Revenue","Type"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredAssets.map((a,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={zanTd}>{i+1}</td>
                  <td style={zanTd}>{a.name}</td>
                  <td style={zanTd}>{catL(a.category,ar)}</td>
                  <td style={zanTd}>{a.phase}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(a.gfa)}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(a.totalCapex)}</td>
                  <td style={{...zanTd,textAlign:numA,color:"#16a34a"}}>{fmt(a.totalRevenue)}</td>
                  <td style={zanTd}>{revL(a.revType,ar)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{...zanSec,marginTop:24}}>{ar?"التدفقات النقدية (10 سنوات)":"Cash Flow Overview (10 Years)"}</div>
          {(() => {
            const yrs = Math.min(10, h);
            const maxVal = Math.max(...Array.from({length:yrs},(_,y)=>Math.max(Math.abs(fc.income[y]||0),Math.abs(fc.capex[y]||0),Math.abs(fc.netCF[y]||0))),1);
            return <div style={{display:"grid",gap:4}}>
              {Array.from({length:yrs},(_,y)=>{
                const inc=fc.income[y]||0, cap=Math.abs(fc.capex[y]||0), net=fc.netCF[y]||0;
                return <div key={y} style={{display:"grid",gridTemplateColumns:"50px 1fr",gap:6,alignItems:"center",fontSize:10}}>
                  <div style={{fontWeight:600,color:"#6b7080",textAlign:numA}}>{sy+y}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {cap>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,cap/maxVal*100)+"%",height:6,background:"#fca5a5",borderRadius:3}} />
                      <span style={{fontSize:10,color:"#ef4444",whiteSpace:"nowrap"}}>{fmtM(cap)}</span>
                    </div>}
                    {inc>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,inc/maxVal*100)+"%",height:6,background:"#86efac",borderRadius:3}} />
                      <span style={{fontSize:10,color:"#16a34a",whiteSpace:"nowrap"}}>{fmtM(inc)}</span>
                    </div>}
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,Math.abs(net)/maxVal*100)+"%",height:6,background:net>=0?"#0f766e":"#dc2626",borderRadius:3}} />
                      <span style={{fontSize:10,color:net>=0?"#0f766e":"#dc2626",fontWeight:600,whiteSpace:"nowrap"}}>{fmtM(net)}</span>
                    </div>
                  </div>
                </div>;
              })}
              <div style={{display:"flex",gap:16,marginTop:6,fontSize:9,color:"#6b7080"}}>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#fca5a5",borderRadius:2,marginRight:3}} />{ar?"التكاليف":"CAPEX"}</span>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#86efac",borderRadius:2,marginRight:3}} />{ar?"الإيرادات":"Income"}</span>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#0f766e",borderRadius:2,marginRight:3}} />{ar?"صافي التدفق":"Net CF"}</span>
              </div>
            </div>;
          })()}

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={{...zanSec,marginTop:24}}>{ar?"الحوافز الحكومية":"Government Incentives"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8,marginBottom:8}}>
              {incentivesResult.capexGrantTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"منحة CAPEX":"CAPEX Grant"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.capexGrantTotal)}</div></div>}
              {incentivesResult.landRentSavingTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"توفير إيجار الأرض":"Land Rent Savings"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.landRentSavingTotal)}</div></div>}
              {incentivesResult.feeRebateTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"خصومات الرسوم":"Fee Rebates"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.feeRebateTotal)}</div></div>}
            </div>
            <div style={{fontSize:11,padding:"8px 12px",background:"#f0fdf4",borderRadius:6,border:"1px solid #bbf7d0"}}>
              {ar?"إجمالي قيمة الحوافز":"Total Incentive Value"}: <strong style={{color:"#0f766e"}}>{fmtM(incentivesResult.totalIncentiveValue)}</strong>
            </div>
          </>}

          <div style={{...zanSec,marginTop:24}}>{ar?"توزيع الإيرادات حسب التصنيف":"Revenue Breakdown by Category"}</div>
          {(() => {
            const catMap = {};
            filteredAssets.forEach(a => { const cat = a.category||"Other"; catMap[cat] = (catMap[cat]||0) + (a.totalRevenue||0); });
            const cats = Object.entries(catMap).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
            const total = cats.reduce((s,[,v])=>s+v,0) || 1;
            const colors = ["#0f766e","#2EC4B6","#2563eb","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899"];
            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",height:24,borderRadius:6,overflow:"hidden",marginBottom:10}}>
                {cats.map(([cat,val],i) => (
                  <div key={cat} style={{width:(val/total*100)+"%",background:colors[i%colors.length],minWidth:2}} title={`${catL(cat,ar)}: ${fmtM(val)} (${(val/total*100).toFixed(1)}%)`} />
                ))}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px"}}>
                {cats.map(([cat,val],i) => (
                  <div key={cat} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:colors[i%colors.length]}} />
                    <span style={{color:"#374151"}}>{catL(cat,ar)}</span>
                    <span style={{fontWeight:700}}>{fmtM(val)}</span>
                    <span style={{color:"#9ca3af"}}>({(val/total*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>;
          })()}

          {/* CAPEX breakdown by phase */}
          <div style={{...zanSec,marginTop:24}}>{ar?"توزيع التكاليف حسب المرحلة":"CAPEX Distribution by Phase"}</div>
          {(() => {
            const phases = Object.entries(results.phaseResults).filter(([name])=>activePh.includes(name));
            const total = phases.reduce((s,[,pr])=>s+(pr.totalCapex||0),0) || 1;
            const colors = ["#0f1117","#0f766e","#2EC4B6","#2563eb","#8b5cf6"];
            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",height:24,borderRadius:6,overflow:"hidden",marginBottom:10}}>
                {phases.map(([name,pr],i) => (
                  <div key={name} style={{width:(pr.totalCapex/total*100)+"%",background:colors[i%colors.length],minWidth:2}} title={`${name}: ${fmtM(pr.totalCapex)}`} />
                ))}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px"}}>
                {phases.map(([name,pr],i) => (
                  <div key={name} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:colors[i%colors.length]}} />
                    <span style={{fontWeight:600}}>{name}</span>
                    <span style={{fontWeight:700}}>{fmtM(pr.totalCapex)}</span>
                    <span style={{color:"#9ca3af"}}>({(pr.totalCapex/total*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>;
          })()}

          <div style={{...zanSec,marginTop:24}}>{ar?"سلامة النموذج":"Model Integrity"}</div>
          <div style={{fontSize:12,padding:"8px 12px",background:failCount===0?"#f0fdf4":"#fef2f2",borderRadius:6,border:failCount===0?"1px solid #bbf7d0":"1px solid #fecaca"}}>
            {failCount === 0 ? (ar?"✅ جميع الفحوصات ناجحة":"✅ All checks passed") : `⚠️ ${failCount} ${ar?"فحص فشل":"check(s) failed"}`}
          </div>
        </div>
      )}

      {activeReport === "bank" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1,height:28,background:"#2EC4B6",opacity:0.5}} />
            <span style={{fontSize:11,color:"#2EC4B6",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"#0f1117",fontWeight:800,marginTop:8,marginBottom:4}}>{ar?"حزمة تقديم البنك":"Bank Submission Pack"}</h1>
          <div style={{fontSize:12,color:"#6b7080",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #2EC4B6"}}>{project.name} | {project.location} | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>

          {/* ── Bank Hero Strip: What the credit committee sees first ── */}
          {f && f.mode !== "self" && <div style={{background:"#f8f9fb",borderRadius:10,padding:16,marginBottom:22,border:"1px solid #e5e7ec"}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:10}}>
              {[
                {l:ar?"التسهيل المطلوب":"Facility Requested",v:fmtM(f?.maxDebt||0),sub:cur,ac:"#0f766e",big:true},
                {l:ar?"نسبة التمويل":"LTV",v:(project.maxLtvPct||70)+"%",sub:ar?"من تكلفة التطوير":"of dev cost",ac:"#2563eb"},
                {l:ar?"متوسط DSCR":"Avg DSCR",v:(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";})(),sub:(()=>{if(!f?.dscr)return "";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?(ar?"آمن":"Safe"):avg>=1.0?(ar?"حدي":"Marginal"):(ar?"ضعيف":"Weak");})(),ac:(()=>{if(!f?.dscr)return "#9ca3af";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?"#16a34a":avg>=1.0?"#f59e0b":"#ef4444";})()},
                {l:ar?"أقل DSCR":"Min DSCR",v:(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?Math.min(...vals).toFixed(2)+"x":"—";})(),sub:(()=>{if(!f?.dscr)return "";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);if(!vals.length)return "";const yr=f.dscr.indexOf(Math.min(...vals));return yr>=0?(ar?"سنة ":"Year ")+(sy+yr):"";})(),ac:(()=>{if(!f?.dscr)return "#9ca3af";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const mn=vals.length?Math.min(...vals):0;return mn>=1.2?"#16a34a":mn>=1.0?"#f59e0b":"#ef4444";})()},
              ].map((k,i)=>(
                <div key={i} style={{textAlign:"center",padding:"8px 6px"}}>
                  <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3,marginBottom:4}}>{k.l}</div>
                  <div style={{fontSize:k.big?24:22,fontWeight:800,color:k.ac}}>{k.v}</div>
                  <div style={{fontSize:9,color:k.ac,fontWeight:600,marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>}

          <div style={zanSec}>{ar?"1. دراسة المشروع":"1. Project Study"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              {[
                [ar?"اسم المشروع":"Project Name",project.name],[ar?"الموقع":"Location",project.location],[ar?"مساحة الأرض":"Land Area",fmt(project.landArea)+" sqm"],
                [ar?"نوع الأرض":"Land Type",project.landType],[ar?"إجمالي المساحة المبنية":"Total GFA",fmt(filteredAssets.reduce((s,a)=>s+(a.gfa||0),0))+" sqm"],
                [ar?"عدد الأصول":"Number of Assets",filteredAssets.length],[ar?"إجمالي تكلفة التطوير":"Total Development Cost",fmt(fc.totalCapex)+" "+cur],
                [ar?"الإيرادات السنوية (مستقرة)":"Projected Annual Income (Stabilized)",fmt(fc.income[Math.min(10,h-1)])+" "+cur],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}><td style={{...zanTd,color:"#6b7080",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"2. طلب التمويل":"2. Financing Request"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              {[
                [ar?"مبلغ التسهيل":"Requested Facility",fmt(f?.maxDebt||0)+" "+cur],
                [ar?"نسبة التمويل":"LTV Ratio",(project.maxLtvPct||70)+"%"],
                [ar?"المعدل المقترح":"Proposed Rate",(project.financeRate||6.5)+"% p.a."],
                [ar?"المدة":"Tenor",(project.loanTenor||7)+" "+(ar?"سنوات (تشمل ":"years (incl. ")+(project.debtGrace||3)+" "+(ar?"فترة سماح)":"grace)")],
                [ar?"نوع السداد":"Repayment",project.repaymentType==="amortizing"?(ar?"أقساط متساوية":"Equal Installments"):(ar?"دفعة واحدة":"Bullet")],
                [ar?"السداد":"Repayment",project.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}><td style={{...zanTd,color:"#6b7080",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"3. المصادر والاستخدامات":"3. Sources & Uses"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:"#0f766e"}}>{ar?"المصادر":"Sources"}</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={zanTd}>{ar?"الدين":"Senior Debt"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalDebt||0)}</td></tr>
                  <tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"حقوق الملكية":"Equity"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalEquity||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"إجمالي المصادر":"Total Sources"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA}}>{fmt((f?.totalDebt||0)+(f?.totalEquity||0))}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:"#0f766e"}}>{ar?"الاستخدامات":"Uses"}</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={zanTd}>{ar?"تكاليف التطوير":"Development CAPEX"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(fc.totalCapex)}</td></tr>
                  {project.landType==="purchase"&&<tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"شراء الأرض":"Land Purchase"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(project.landPurchasePrice)}</td></tr>}
                  <tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"فوائد أثناء البناء":"Interest During Constr."}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalInterest||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"إجمالي الاستخدامات":"Total Uses"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA}}>{fmt(fc.totalCapex+(f?.totalInterest||0))}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={zanSec}>{ar?"4. التدفقات النقدية 10 سنوات وDSCR":"4. 10-Year Cash Flow & DSCR"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:9}}>
            <thead><tr style={{background:"#0f1117"}}>
              <th style={{...zanTh,fontSize:10}}>{ar?"البند":"Item"}</th>
              {bankYears.map(y=><th key={y} style={{...zanTh,textAlign:numA,fontSize:10}}>{sy+y}</th>)}
            </tr></thead>
            <tbody>
              {[
                {l:ar?"الإيرادات":"Revenue",v:fc.income,cl:"#16a34a"},
                {l:ar?"إيجار الأرض":"Land Rent",v:fc.landRent,cl:"#ef4444"},
                {l:ar?"صافي الدخل التشغيلي":"NOI",v:bankYears.map(y=>(fc.income[y]||0)-(fc.landRent[y]||0)),cl:"#0f1117",b:true},
                {l:ar?"تكاليف التطوير":"CAPEX",v:fc.capex,cl:"#ef4444"},
                ...(f&&f.mode!=="self"?[
                  {l:ar?"خدمة الدين":"Debt Service",v:f.debtService,cl:"#ef4444"},
                  {l:ar?"رصيد الدين":"Debt Balance",v:f.debtBalClose,cl:"#3b82f6"},
                  {l:"DSCR",v:bankYears.map(y=>f.dscr[y]),cl:"#0f1117",b:true,isDscr:true},
                ]:[]),
                {l:ar?"صافي التدفق":"Net CF",v:f&&f.mode!=="self"&&!isFiltered?f.leveredCF:fc.netCF,cl:"#0f1117",b:true},
              ].map((row,ri)=>(
                <tr key={ri} style={row.b?{fontWeight:700,background:"#f8f9fb"}:{}}>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",fontSize:9}}>{row.l}</td>
                  {bankYears.map(y=>{
                    const v = Array.isArray(row.v) ? row.v[y] : (row.v?.[y]||0);
                    if (row.isDscr) return <td key={y} style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:numA,fontSize:9,fontWeight:700,color:v===null?"#9ca3af":v>=1.2?"#16a34a":"#ef4444"}}>{v===null?"—":v.toFixed(2)+"x"}</td>;
                    return <td key={y} style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:numA,fontSize:9,color:row.cl}}>{v===0?"—":fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"5. تحليل الضغط":"5. Stress Analysis"}</div>
          {(() => {
            const scenarios = [
              {l:ar?"الحالة الأساسية":"Base Case",capM:1,rentM:1,bg:"#f0fdf4",bd:"#bbf7d0",cl:"#16a34a"},
              {l:ar?"CAPEX +10%":"CAPEX +10%",capM:1.1,rentM:1,bg:"#fef2f2",bd:"#fecaca",cl:"#ef4444"},
              {l:ar?"إيرادات -15%":"Revenue -15%",capM:1,rentM:0.85,bg:"#fef2f2",bd:"#fecaca",cl:"#ef4444"},
              {l:ar?"CAPEX +10% وإيرادات -10%":"CAPEX +10% & Revenue -10%",capM:1.1,rentM:0.9,bg:"#fffbeb",bd:"#fde68a",cl:"#d97706"},
            ];
            const stressResults = scenarios.map(sc => {
              try {
                const p = {...project, customCapexMult:sc.capM, customRentMult:sc.rentM, activeScenario:"Custom"};
                const r = computeProjectCashFlows(p); const ir = computeIncentives(p,r); const sf = computeFinancing(p,r,ir);
                const minDscr = sf?.dscr ? sf.dscr.filter(d=>d!==null&&d!==Infinity).reduce((m,v)=>Math.min(m,v),999) : null;
                return {irr:r.consolidated.irr,npv:r.consolidated.npv10,dscr:minDscr===999?null:minDscr,levIrr:sf?.leveredIRR};
              } catch(e){ return {irr:null,npv:null,dscr:null,levIrr:null}; }
            });
            return <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
              <thead><tr style={{background:"#0f1117"}}>
                {(ar?["السيناريو","IRR المشروع","IRR بعد التمويل","أقل DSCR","NPV @10%"]:["Scenario","Project IRR","Levered IRR","Min DSCR","NPV @10%"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
              </tr></thead>
              <tbody>{scenarios.map((sc,i)=>(
                <tr key={i} style={{background:sc.bg}}>
                  <td style={{...zanTd,fontWeight:600,color:sc.cl}}>{sc.l}</td>
                  <td style={{...zanTd,textAlign:numA}}>{stressResults[i].irr?fmtPct(stressResults[i].irr*100):"—"}</td>
                  <td style={{...zanTd,textAlign:numA}}>{stressResults[i].levIrr?fmtPct(stressResults[i].levIrr*100):"—"}</td>
                  <td style={{...zanTd,textAlign:numA,fontWeight:700,color:stressResults[i].dscr===null?"#9ca3af":stressResults[i].dscr>=1.2?"#16a34a":"#ef4444"}}>{stressResults[i].dscr!==null?stressResults[i].dscr.toFixed(2)+"x":"—"}</td>
                  <td style={{...zanTd,textAlign:numA,color:(stressResults[i].npv||0)>=0?"#16a34a":"#ef4444"}}>{stressResults[i].npv?fmtM(stressResults[i].npv):"—"}</td>
                </tr>
              ))}</tbody>
            </table>;
          })()}

          {f && f.mode !== "self" && <>
            <div style={zanSec}>{ar?"6. اتجاه DSCR ورصيد الدين":"6. DSCR Trend & Debt Profile"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              {/* DSCR Trend */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#0f766e",marginBottom:8}}>{ar?"اتجاه DSCR":"DSCR Trend"}</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:2,height:80}}>
                  {bankYears.map(y => {
                    const d = f.dscr?.[y]; const val = d===null||d===undefined||d===Infinity ? 0 : d;
                    const h = Math.min(val/3*100, 100);
                    return <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{fontSize:9,fontWeight:700,color:val>=1.2?"#16a34a":val>0?"#ef4444":"#9ca3af"}}>{val>0?val.toFixed(1)+"x":"—"}</div>
                      <div style={{width:"100%",height:h+"%",minHeight:2,background:val>=1.25?"#86efac":val>=1.0?"#fde68a":"#fca5a5",borderRadius:"2px 2px 0 0",transition:"height 0.3s"}} />
                      <div style={{fontSize:9,color:"#9ca3af"}}>{sy+y}</div>
                    </div>;
                  })}
                </div>
                <div style={{borderTop:"2px solid #ef4444",marginTop:0,position:"relative"}}>
                  <span style={{position:"absolute",top:-8,right:0,fontSize:9,color:"#ef4444",fontWeight:600}}>1.0x {ar?"الحد الأدنى":"min"}</span>
                </div>
              </div>
              {/* Debt Balance Profile */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#0f766e",marginBottom:8}}>{ar?"رصيد الدين":"Debt Balance Profile"}</div>
                {(() => {
                  const maxDebt = Math.max(...bankYears.map(y=>f.debtBalClose?.[y]||0),1);
                  return <div style={{display:"flex",alignItems:"flex-end",gap:2,height:80}}>
                    {bankYears.map(y => {
                      const bal = f.debtBalClose?.[y]||0;
                      const pct = bal/maxDebt*100;
                      return <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <div style={{fontSize:9,fontWeight:600,color:"#3b82f6"}}>{bal>0?fmtM(bal):""}</div>
                        <div style={{width:"100%",height:pct+"%",minHeight:bal>0?2:0,background:"linear-gradient(180deg,#3b82f6,#93c5fd)",borderRadius:"2px 2px 0 0"}} />
                        <div style={{fontSize:9,color:"#9ca3af"}}>{sy+y}</div>
                      </div>;
                    })}
                  </div>;
                })()}
              </div>
            </div>
          </>}

          <div style={zanSec}>{ar?"7. تغطية الدين":"7. Debt Coverage Summary"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
            <thead><tr style={{background:"#0f1117"}}>
              {(ar?["المؤشر","القيمة","الحالة"]:["Metric","Value","Status"]).map(hh=><th key={hh} style={zanTh}>{hh}</th>)}
            </tr></thead>
            <tbody>
              {[
                [ar?"إجمالي خدمة الدين":"Total Debt Service",f?fmt((f.debtService||[]).reduce((a,b)=>a+b,0))+" "+cur:"—","—",""],
                [ar?"إجمالي الفوائد":"Total Interest",f?fmt(f.totalInterest||0)+" "+cur:"—","—",""],
                [ar?"متوسط DSCR":"Average DSCR",(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"#9ca3af"};const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?{t:ar?"آمن":"Safe",c:"#16a34a"}:avg>=1.0?{t:ar?"حدي":"Marginal",c:"#f59e0b"}:{t:ar?"ضعيف":"Weak",c:"#ef4444"};})(),"dscr"],
                [ar?"أقل DSCR":"Minimum DSCR",(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?Math.min(...vals).toFixed(2)+"x":"—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"#9ca3af"};const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const mn=vals.length?Math.min(...vals):0;return mn>=1.2?{t:ar?"مقبول":"Acceptable",c:"#16a34a"}:mn>=1.0?{t:ar?"حدي":"Marginal",c:"#f59e0b"}:{t:ar?"غير كافٍ":"Insufficient",c:"#ef4444"};})(),"dscr"],
                [ar?"فترة استرداد الدين":"Debt Payback",(()=>{let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=(f&&f.mode!=="self"?f.leveredCF[y]:fc.netCF[y])||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return(y+1)+" "+(ar?"سنة":"years");}return "—";})(),(()=>{let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=(f&&f.mode!=="self"?f.leveredCF[y]:fc.netCF[y])||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return y+1<=(project.loanTenor||7)?{t:ar?"ضمن المدة":"Within tenor",c:"#16a34a"}:{t:ar?"يتجاوز المدة":"Exceeds tenor",c:"#f59e0b"};}return {t:"—",c:"#9ca3af"};})(),"dscr"],
                [ar?"نسبة تغطية الفوائد":"Interest Cover (Yr 1 Op)",(()=>{if(!f?.dscr)return "—";for(let y=0;y<h;y++){if((fc.income[y]||0)>0&&f.interest[y]>0)return((fc.income[y]-Math.abs(fc.landRent[y]||0))/f.interest[y]).toFixed(2)+"x";}return "—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"#9ca3af"};for(let y=0;y<h;y++){if((fc.income[y]||0)>0&&f.interest[y]>0){const icr=(fc.income[y]-Math.abs(fc.landRent[y]||0))/f.interest[y];return icr>=2?{t:ar?"قوي":"Strong",c:"#16a34a"}:icr>=1.5?{t:ar?"مقبول":"Adequate",c:"#f59e0b"}:{t:ar?"ضعيف":"Weak",c:"#ef4444"};}}return {t:"—",c:"#9ca3af"};})(),"dscr"],
              ].map(([label,val,status,type],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={{...zanTd,fontWeight:600}}>{label}</td>
                  <td style={{...zanTd,fontWeight:700,textAlign:numA}}>{val}</td>
                  {type==="dscr"?<td style={{...zanTd,textAlign:"center"}}><span style={{display:"inline-block",padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:600,background:status.c+"18",color:status.c}}>{status.t}</span></td>:<td style={{...zanTd,color:"#9ca3af",textAlign:"center"}}></td>}
                </tr>
              ))}
            </tbody>
          </table>

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={zanSec}>{ar?"8. الحوافز الحكومية":"8. Government Incentives"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:8}}>
              <thead><tr style={{background:"#0f1117"}}>
                {(ar?["نوع الحافز","القيمة","الوصف"]:["Incentive Type","Value","Description"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {incentivesResult.capexGrantTotal>0&&<tr><td style={zanTd}>{ar?"منحة CAPEX":"CAPEX Grant"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(incentivesResult.capexGrantTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"خصم على تكاليف التطوير":"Reduction in development costs"}</td></tr>}
                {incentivesResult.landRentSavingTotal>0&&<tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"خصم إيجار الأرض":"Land Rent Rebate"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(incentivesResult.landRentSavingTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"توفير في إيجار الأرض":"Savings on land lease payments"}</td></tr>}
                {f?.interestSubsidyTotal>0&&<tr><td style={zanTd}>{ar?"دعم الفائدة":"Interest Subsidy"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(f.interestSubsidyTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"دعم على تكلفة التمويل":"Subsidy on financing cost"}</td></tr>}
                {incentivesResult.feeRebateTotal>0&&<tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"خصم رسوم":"Fee Rebates"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(incentivesResult.feeRebateTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"إعفاءات من الرسوم الحكومية":"Government fee waivers"}</td></tr>}
                <tr style={{fontWeight:700,background:"#f0fdf4"}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"الإجمالي":"Total"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA,color:"#0f766e"}}>{fmt(incentivesResult.totalIncentiveValue+(f?.interestSubsidyTotal||0))}</td><td style={{...zanTd,borderTop:"2px solid #0f1117"}}></td></tr>
              </tbody>
            </table>
          </>}
        </div>
      )}

      {activeReport === "investor" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1,height:28,background:"#2EC4B6",opacity:0.5}} />
            <span style={{fontSize:11,color:"#2EC4B6",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"#0f1117",fontWeight:800,marginTop:8,marginBottom:4}}>{ar?"مذكرة المستثمر":"Investor Memo"} - {project.name}</h1>
          <div style={{fontSize:12,color:"#6b7080",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #2EC4B6"}}>{project.location} | {cur} | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} | {ar?"سري":"CONFIDENTIAL"}</div>

          <div style={zanSec}>{ar?"أبرز المؤشرات":"Investment Highlights"}</div>
          {/* Primary LP metrics - big and prominent */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)",gap:10,marginBottom:12}}>
            {[
              {l:ar?"عائد المستثمر المستهدف":"Target Investor IRR",v:fw?.lpIRR?fmtPct(fw.lpIRR*100):"N/A",ac:"#0f766e",big:true},
              {l:ar?"مضاعف المستثمر":"Investor MOIC",v:fw?.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"N/A",ac:"#0f766e",big:true},
              {l:ar?"فترة الاسترداد":"Investor Payback",v:(()=>{if(!fw?.lpNetCF)return "—";let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=fw.lpNetCF[y]||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return(y+1)+" "+(ar?"سنة":"yr");}return "—";})(),ac:"#0f766e",big:true},
            ].map((k,i) => (
              <div key={i} style={{...zanKpi(k.ac),textAlign:"center",padding:"14px 12px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:28,fontWeight:800,color:k.ac,marginTop:6}}>{k.v}</div>
              </div>
            ))}
          </div>
          {/* Secondary LP metrics */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4, 1fr)",gap:8,marginBottom:18}}>
            {[
              {l:ar?"العائد المفضل":"Preferred Return",v:(project.prefReturnPct||15)+"%",ac:"#2563eb"},
              {l:ar?"سنة التخارج":"Exit Year",v:fw?.exitYear||"TBD",ac:"#f59e0b"},
              {l:"DPI",v:fw?.lpTotalInvested>0?(fw.lpTotalDist/fw.lpTotalInvested).toFixed(2)+"x":"—",ac:"#8b5cf6"},
              {l:ar?"العائد النقدي":"Cash Yield",v:(()=>{if(!fw?.lpDist||!fw?.lpTotalInvested)return "—";const stabYr=Math.min(10,h-1);const dist=fw.lpDist[stabYr]||0;return dist>0&&fw.lpTotalInvested>0?fmtPct(dist/fw.lpTotalInvested*100):"—";})(),ac:"#06b6d4"},
            ].map((k,i) => (
              <div key={i} style={zanKpi(k.ac)}>
                <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:18,fontWeight:800,color:k.ac,marginTop:4}}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={zanSec}>{ar?"شروط الصندوق":"Fund Terms"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:16}}>
            <tbody>
              {[
                [ar?"استراتيجية الصندوق":"Fund Strategy",ar?"تطوير واحتفاظ":"Develop & Hold"],[ar?"العملة":"Currency",cur],
                [ar?"حقوق ملكية المطور":"Developer Equity",fw?fmt(fw.gpEquity)+" "+cur+" ("+fmtPct(fw.gpPct*100)+")":"—"],
                [ar?"حقوق ملكية المستثمر المطلوبة":"Investor Equity Required",fw?fmt(fw.lpEquity)+" "+cur+" ("+fmtPct(fw.lpPct*100)+")":"—"],
                [ar?"العائد المفضل":"Preferred Return",(project.prefReturnPct||15)+"% "+(ar?"سنوي على رأس المال غير المسترد":"p.a. on unreturned capital")],
                ...(project.gpCatchup ? [[ar?"التعويض":"Catch-up",ar?"نعم":"Yes"]] : []),
                [ar?"أداء / حمولة":"Carry / Performance Fee",(project.carryPct||30)+"%"],
                [ar?"تقسيم الأرباح":"Profit Split",(ar?"المستثمر":"Investor")+" "+(project.lpProfitSplitPct||70)+"% / "+(ar?"المطور":"Developer")+" "+(100-(project.lpProfitSplitPct||70))+"%"],
                [ar?"رسوم الاشتراك":"Subscription Fee",(project.subscriptionFeePct||2)+"%"],
                [ar?"رسوم الإدارة السنوية":"Annual Management Fee",(project.annualMgmtFeePct||0.9)+"%"],
                [ar?"رسوم المطور":"Developer Fee",(project.developerFeePct||10)+"% "+(ar?"من التكاليف":"of CAPEX")],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}><td style={{...zanTd,color:"#6b7080",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          {fw && <>
            <div style={zanSec}>{ar?"ملخص شلال التوزيعات":"Waterfall Distribution Summary"}</div>
            <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:isMobile?"wrap":"nowrap"}}>
              {[
                {l:ar?"إعادة رأس المال":"Return of Capital",v:fmtM(fw.tier1.reduce((a,b)=>a+b,0)),bg:"linear-gradient(135deg,#dbeafe,#eff6ff)",bd:"#93c5fd"},
                {l:ar?"العائد المفضل":"Preferred Return",v:fmtM(fw.tier2.reduce((a,b)=>a+b,0)),bg:"linear-gradient(135deg,#dcfce7,#f0fdf4)",bd:"#86efac"},
                ...(fw.tier3.reduce((a,b)=>a+b,0)>0?[{l:ar?"التعويض":"Catch-up",v:fmtM(fw.tier3.reduce((a,b)=>a+b,0)),bg:"linear-gradient(135deg,#fef3c7,#fffbeb)",bd:"#fcd34d"}]:[]),
                {l:ar?"تقسيم الأرباح":"Profit Split",v:fmtM((fw.tier4LP.reduce((a,b)=>a+b,0))+(fw.tier4GP.reduce((a,b)=>a+b,0))),bg:"linear-gradient(135deg,#ede9fe,#f5f3ff)",bd:"#c4b5fd"},
              ].map((t,i)=>(
                <div key={i} style={{flex:1,minWidth:isMobile?140:"auto",background:t.bg,borderRadius:8,padding:"12px",textAlign:"center",border:`1px solid ${t.bd}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#374151",letterSpacing:0.3}}>{t.l}</div>
                  <div style={{fontSize:16,fontWeight:800,marginTop:4,color:"#0f1117"}}>{t.v}</div>
                </div>
              ))}
            </div>

            <div style={zanSec}>{ar?"تحليل العوائد":"Return Analysis"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0f1117"}}>
                <th style={zanTh}>{ar?"المؤشر":"Metric"}</th>
                <th style={{...zanTh,textAlign:"center",background:"#0f766e"}}>{ar?"المستثمر":"Investor"}</th>
                <th style={{...zanTh,textAlign:"center",opacity:0.7}}>{ar?"المطور":"Developer"}</th>
                <th style={{...zanTh,textAlign:"center",opacity:0.7}}>{ar?"المشروع":"Project"}</th>
              </tr></thead>
              <tbody>
                {[
                  [ar?"صافي IRR":"Net IRR",fw.lpIRR?fmtPct(fw.lpIRR*100):"—",fw.gpIRR?fmtPct(fw.gpIRR*100):"—",fc.irr?fmtPct(fc.irr*100):"—"],
                  ["MOIC",fw.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"—",fw.gpMOIC?fw.gpMOIC.toFixed(2)+"x":"—","—"],
                  [ar?"إجمالي المستثمر":"Total Invested",fmt(fw.lpTotalInvested),fmt(fw.gpTotalInvested),fmt(fc.totalCapex)],
                  [ar?"إجمالي التوزيعات":"Total Distributions",fmt(fw.lpTotalDist),fmt(fw.gpTotalDist),"—"],
                  ["NPV @10%",fmt(fw.lpNPV10),fmt(fw.gpNPV10),fmt(fw.projNPV10)],
                  ["NPV @12%",fmt(fw.lpNPV12),fmt(fw.gpNPV12),fmt(fw.projNPV12)],
                  ["NPV @14%",fmt(fw.lpNPV14),fmt(fw.gpNPV14),fmt(fw.projNPV14)],
                ].map(([metric,...vals],i)=>(
                  <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={{...zanTd,fontWeight:700}}>{metric}</td>
                    <td style={{...zanTd,textAlign:"center",fontWeight:700,color:"#0f766e",background:i%2===0?"#f0fdf4":"#ecfdf5"}}>{vals[0]}</td>
                    <td style={{...zanTd,textAlign:"center",color:"#6b7080"}}>{vals[1]}</td>
                    <td style={{...zanTd,textAlign:"center",color:"#9ca3af"}}>{vals[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={zanSec}>{ar?"التوزيعات التراكمية":"Cumulative Distributions"}</div>
            {(() => {
              const yrs = Math.min(h, 20);
              let lpCum=0, gpCum=0;
              const data = Array.from({length:yrs},(_,y)=>{lpCum+=fw.lpDist[y]||0;gpCum+=fw.gpDist[y]||0;return{y,lp:lpCum,gp:gpCum};});
              const maxCum = Math.max(data[data.length-1]?.lp||1, data[data.length-1]?.gp||1);
              return <div style={{marginBottom:16}}>
                {data.filter(d=>d.lp>0||d.gp>0).map(d=>(
                  <div key={d.y} style={{display:"grid",gridTemplateColumns:"50px 1fr",gap:6,marginBottom:3,alignItems:"center",fontSize:10}}>
                    <div style={{fontWeight:600,color:"#6b7080",textAlign:numA}}>{sy+d.y}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:Math.max(2,d.lp/maxCum*100)+"%",height:7,background:"linear-gradient(90deg,#8b5cf6,#a78bfa)",borderRadius:3}} />
                        <span style={{fontSize:10,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmtM(d.lp)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:Math.max(2,d.gp/maxCum*100)+"%",height:7,background:"linear-gradient(90deg,#0f766e,#2EC4B6)",borderRadius:3}} />
                        <span style={{fontSize:10,color:"#0f766e",whiteSpace:"nowrap"}}>{fmtM(d.gp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",gap:16,marginTop:6,fontSize:9,color:"#6b7080"}}>
                  <span><span style={{display:"inline-block",width:10,height:6,background:"#8b5cf6",borderRadius:2,marginRight:3}} />{ar?"المستثمر":"Investor"} {ar?"التراكمي":"Cumulative"}</span>
                  <span><span style={{display:"inline-block",width:10,height:6,background:"#0f766e",borderRadius:2,marginRight:3}} />{ar?"المطور":"Developer"} {ar?"التراكمي":"Cumulative"}</span>
                </div>
              </div>;
            })()}

            <div style={zanSec}>{ar?"دورة حياة الصندوق":"Fund Lifecycle"}</div>
            {(() => {
              // Determine key milestones
              let constrEnd=0, firstIncome=0, exitYr=fw.exitYear||h;
              for(let y=h-1;y>=0;y--){if((fc.capex[y]||0)>0){constrEnd=y;break;}}
              for(let y=0;y<h;y++){if((fc.income[y]||0)>0){firstIncome=y;break;}}
              const phases = [
                {l:ar?"سحب الإكوتي":"Equity Calls",from:0,to:constrEnd,color:"#ef4444",icon:"📥"},
                {l:ar?"البناء":"Construction",from:0,to:constrEnd,color:"#f59e0b",icon:"🏗"},
                {l:ar?"الإيرادات":"Income Period",from:firstIncome,to:Math.min(exitYr,h-1),color:"#16a34a",icon:"💰"},
                ...(fw.exitYear?[{l:ar?"التخارج":"Exit",from:exitYr-1,to:exitYr-1,color:"#8b5cf6",icon:"🏦"}]:[]),
              ];
              const totalYrs = Math.min(h, 25);
              return <div style={{marginBottom:16}}>
                {phases.map((p,i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#374151"}}>{p.icon} {p.l}</div>
                    <div style={{position:"relative",height:16,background:"#f0f1f5",borderRadius:8}}>
                      <div style={{position:"absolute",left:(p.from/totalYrs*100)+"%",width:Math.max(4,(p.to-p.from+1)/totalYrs*100)+"%",height:"100%",background:p.color,borderRadius:8,opacity:0.8}} />
                      <div style={{position:"absolute",left:(p.from/totalYrs*100)+"%",top:-1,fontSize:9,color:p.color,fontWeight:600}}>{sy+p.from}</div>
                      <div style={{position:"absolute",left:Math.min(95,((p.to+1)/totalYrs*100))+"%",top:-1,fontSize:9,color:p.color,fontWeight:600}}>{sy+p.to}</div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",marginTop:4,paddingLeft:128}}>
                  <span>{sy}</span><span>{sy+Math.floor(totalYrs/4)}</span><span>{sy+Math.floor(totalYrs/2)}</span><span>{sy+Math.floor(totalYrs*3/4)}</span><span>{sy+totalYrs-1}</span>
                </div>
              </div>;
            })()}

            <div style={zanSec}>{ar?"ملخص الرسوم":"Fee Summary"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
              <thead><tr style={{background:"#0f1117"}}>
                {(ar?["الرسم","النسبة/المبلغ","الإجمالي","التوقيت"]:["Fee","Rate/Amount","Total","Timing"]).map(hh=><th key={hh} style={zanTh}>{hh}</th>)}
              </tr></thead>
              <tbody>
                {[
                  [ar?"رسوم الاشتراك":"Subscription",(project.subscriptionFeePct||2)+"%",fmt(fw.feeSubscription||0),ar?"مرة واحدة":"One-time"],
                  [ar?"رسوم الإدارة":"Management",(project.annualMgmtFeePct||0.9)+"%",fmt(fw.feeMgmtTotal||fw.fees||0),ar?"سنوي":"Annual"],
                  [ar?"رسوم المطور":"Developer",(project.developerFeePct||10)+"% "+(ar?"من CAPEX":"of CAPEX"),fmt(fw.feeDeveloper||0),ar?"خلال البناء":"During construction"],
                  [ar?"رسوم الهيكلة":"Structuring",(project.structuringFeePct||1)+"%",fmt(fw.feeStructuring||0),ar?"مرة واحدة":"One-time"],
                  [ar?"رسوم الحفظ":"Custody",fmt(project.custodyFeeAnnual||50000)+"/"+(ar?"سنة":"yr"),fmt(fw.feeCustodyTotal||0),ar?"سنوي":"Annual"],
                ].map(([ff,r,t,ti],i)=>(
                  <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={{...zanTd,fontWeight:600}}>{ff}</td>
                    <td style={{...zanTd,color:"#6b7080"}}>{r}</td>
                    <td style={{...zanTd,textAlign:numA,fontWeight:600}}>{t}</td>
                    <td style={{...zanTd,color:"#6b7080"}}>{ti}</td>
                  </tr>
                ))}
                <tr style={{fontWeight:700,background:"#f8f9fb"}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}} colSpan={2}>{ar?"الإجمالي":"Total Fees"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA,color:"#0f766e"}}>{fmt(fw.totalFees||fw.fees||0)}</td><td style={{...zanTd,borderTop:"2px solid #0f1117"}}></td></tr>
              </tbody>
            </table>
          </>}

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={zanSec}>{ar?"الحوافز الحكومية":"Government Incentives"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:8,marginBottom:8}}>
              {incentivesResult.capexGrantTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"منحة CAPEX":"CAPEX Grant"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.capexGrantTotal)}</div></div>}
              {incentivesResult.landRentSavingTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"خصم إيجار الأرض":"Land Rent Savings"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.landRentSavingTotal)}</div></div>}
              {f?.interestSubsidyTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"دعم الفائدة":"Interest Subsidy"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(f.interestSubsidyTotal)}</div></div>}
              {incentivesResult.feeRebateTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"خصم رسوم":"Fee Rebates"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.feeRebateTotal)}</div></div>}
            </div>
            <div style={{fontSize:11,padding:"8px 12px",background:"#f0fdf4",borderRadius:6,border:"1px solid #bbf7d0"}}>
              {ar?"إجمالي قيمة الحوافز":"Total Incentive Value"}: <strong style={{color:"#0f766e"}}>{fmtM(incentivesResult.totalIncentiveValue+(f?.interestSubsidyTotal||0))}</strong>
              {" "}<span style={{color:"#6b7080",fontSize:10}}>({ar?"تعزز عائد المستثمر":"enhances investor returns"})</span>
            </div>
          </>}
        </div>
      )}
    </div>

    {!activeReport && (
      <div style={{textAlign:"center",padding:"56px 24px",background:"#0f1117",borderRadius:12,border:"1px solid #1e2230"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:40,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>{ar?"\u062d\u0635\u064a\u0641":"Haseef"}</span>
          <span style={{width:1,height:36,background:"#2EC4B6",opacity:0.4}} />
          <span style={{fontSize:13,color:"#2EC4B6",fontWeight:300,lineHeight:1.3,textAlign:"start"}}>{ar?"\u0627\u0644\u0646\u0645\u0630\u062c\u0629":"Financial"}<br/>{ar?"\u0627\u0644\u0645\u0627\u0644\u064a\u0629":"Modeler"}</span>
        </div>
        <div style={{fontSize:13,color:"#4b5060"}}>
          {ar?"\u0627\u062e\u062a\u0631 \u062a\u0642\u0631\u064a\u0631\u0627\u064B \u0645\u0646 \u0627\u0644\u0623\u0639\u0644\u0649":"Select a report above to preview and download"}
        </div>
      </div>
    )}
  </div>);
}

export default ReportsView;
