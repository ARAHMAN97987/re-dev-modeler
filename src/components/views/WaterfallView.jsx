// Extracted from App.jsx lines 438-1270
// WaterfallView + ExitAnalysisPanel + IncentivesImpact + HelpLink + EducationalModal

import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, PieChart, Pie, Cell } from "recharts";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { btnS, btnPrim, tblStyle, thSt, tdSt, tdN, sideInputStyle } from "../shared/styles";
import { calcIRR, calcNPV } from "../../engine/math.js";
import { getPhaseFinancing } from "../../engine/phases.js";

// ── HelpLink: inline educational link ──
function HelpLink({ contentKey, lang, onOpen, label: customLabel }) {
  const ar = lang === "ar";
  const label = customLabel || (ar ? "ما الفرق؟" : "What's the difference?");
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(contentKey); }}
      style={{
        fontSize: 11,
        color: "#2563eb",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 3,
        cursor: "pointer",
        fontWeight: 500,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "color 0.15s",
      }}
      onMouseEnter={e => { e.target.style.color = "#1d4ed8"; }}
      onMouseLeave={e => { e.target.style.color = "#2563eb"; }}
    >
      {label}
    </span>
  );
}

// ── EducationalModal: Reusable full-screen learning modal ──
// Reads EDUCATIONAL_CONTENT from window.__EDUCATIONAL_CONTENT (set by App.jsx)
function EducationalModal({ contentKey, lang, onClose }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const EDUCATIONAL_CONTENT = window.__EDUCATIONAL_CONTENT || {};
  const content = EDUCATIONAL_CONTENT[contentKey]?.[ar ? "ar" : "en"];
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!content) return null;

  const tab = content.tabs[activeTab];

  const renderBlock = (block, i) => {
    if (block.type === "heading") return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23", marginTop: i === 0 ? 0 : 18, marginBottom: 6 }}>{block.text}</div>;
    if (block.type === "text") return <div key={i} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.75, marginBottom: 6 }}>{block.text}</div>;
    if (block.type === "list") return (
      <div key={i} style={{ marginBottom: 8 }}>
        {block.items.map((item, j) => (
          <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 12.5, color: "#374151", lineHeight: 1.65 }}>
            <span style={{ color: "#9ca3af", fontSize: 8, marginTop: 6, flexShrink: 0 }}>●</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
    return null;
  };

  return (<>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(2px)" }} />
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      width: isMobile ? "96vw" : 620, maxWidth: "96vw", maxHeight: "88vh",
      background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
      zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
      direction: ar ? "rtl" : "ltr",
    }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e5e7ec", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>📘</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1d23" }}>{content.title}</div>
          <div style={{ fontSize: 12, color: "#6b7080", marginTop: 3, lineHeight: 1.5 }}>{content.intro}</div>
        </div>
        <button onClick={onClose} style={{ background: "#f0f1f5", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7080", fontFamily: "inherit", flexShrink: 0 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7ec", flexShrink: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {content.tabs.map((t, i) => {
          const isActive = i === activeTab;
          return (
            <button key={t.id} onClick={() => setActiveTab(i)} style={{
              padding: isMobile ? "10px 12px" : "12px 18px",
              background: "none", border: "none", borderBottom: isActive ? "2.5px solid #2563eb" : "2.5px solid transparent",
              fontSize: isMobile ? 11 : 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#2563eb" : "#6b7080",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
            }}>
              <span style={{ marginInlineEnd: 5 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 18px" : "20px 24px" }}>
        {tab && tab.content.map(renderBlock)}
      </div>
      {content.cta && (
        <div style={{ padding: "12px 22px", borderTop: "1px solid #e5e7ec", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          {window.__zanOpenAcademy ? (
            <button onClick={() => { onClose(); window.__zanOpenAcademy(contentKey); }} style={{ background: "none", border: "none", color: "#C8A96E", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>📚 {ar ? "اقرأ المزيد في الأكاديمية" : "Read more in Academy"}</button>
          ) : <span />}
          <button onClick={onClose} style={{ padding: "9px 28px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
          onMouseEnter={e => { e.target.style.background = "#1d4ed8"; }}
          onMouseLeave={e => { e.target.style.background = "#2563eb"; }}
          >{content.cta}</button>
        </div>
      )}
    </div>
  </>);
}

// ── Metric color utility ──
// ── Functional Colors — consistent metric coloring across all tabs ──
const METRIC_COLORS = { success: "#10b981", warning: "#f59e0b", error: "#ef4444", neutral: "#6b7080", muted: "#9ca3af" };
const METRIC_COLORS_DARK = { success: "#4ade80", warning: "#fbbf24", error: "#f87171", neutral: "#8b90a0", muted: "#6b7080" };

/**
 * Returns the functional color for a financial metric based on its value.
 * @param {string} metric - One of: IRR, DSCR, LTV, NPV, MOIC, cashFlow
 * @param {number|null} value - The numeric value (IRR as decimal e.g. 0.15, DSCR as ratio, LTV as %, NPV as amount, MOIC as multiple)
 * @param {object} [opts] - Options: { dark: false, raw: false }
 *   dark=true returns lighter colors for dark backgrounds
 *   raw=true returns 'success'|'warning'|'error' instead of hex
 * @returns {string} hex color or level string
 */
const getMetricColor = (metric, value, opts = {}) => {
  const { dark = false, raw = false } = opts;
  if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
    return raw ? "neutral" : (dark ? METRIC_COLORS_DARK.muted : METRIC_COLORS.muted);
  }
  const palette = dark ? METRIC_COLORS_DARK : METRIC_COLORS;
  let level = "neutral";
  switch (metric) {
    case "IRR":
      level = value >= 0.15 ? "success" : value >= 0.10 ? "warning" : "error";
      break;
    case "DSCR":
      level = value >= 1.5 ? "success" : value >= 1.2 ? "warning" : "error";
      break;
    case "LTV":
      level = value <= 60 ? "success" : value <= 70 ? "warning" : "error";
      break;
    case "NPV":
      level = value > 0 ? "success" : value === 0 ? "warning" : "error";
      break;
    case "MOIC":
      level = value >= 2.0 ? "success" : value >= 1.5 ? "warning" : "error";
      break;
    case "cashFlow":
      level = value > 0 ? "success" : value === 0 ? "neutral" : "error";
      break;
    default:
      return raw ? "neutral" : palette.neutral;
  }
  return raw ? level : palette[level];
};

function WaterfallView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [wSec, setWSec] = useState({});  // chart toggle state
  const [kpiOpen, setKpiOpen] = useState({gp:false,lp:false,fund:false,devTotal:false}); // expandable KPI cards
  const [eduModal, setEduModal] = useState(null);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({gp:expand,lp:expand,fund:expand,devTotal:expand}); setWSec(expand?{chart:true}:{}); }}, [globalExpand]);

  if (!project || !results || !waterfall) return <div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>
    <div style={{fontSize:14,marginBottom:8}}>{lang==="ar"?"يتطلب اختيار هيكل تمويل غير ذاتي":"Requires non-self financing mode"}</div>
    <div style={{fontSize:12}}>{lang==="ar"?"اختر 'دين بنكي' أو 'صندوق استثماري' من لوحة التحكم":"Select 'Bank Debt' or 'Fund Structure' from the control panel"}</div>
  </div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;
  const upCfg = up ? (isSinglePhase
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }))) : null;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;
  const hasPhases = phaseNames.length > 1 && phaseWaterfalls && Object.keys(phaseWaterfalls).length > 0;
  const h0 = new Array(h).fill(0);
  const cur = project.currency || "SAR";

  // ── Filtered waterfall ──
  const w = useMemo(() => {
    if (isSinglePhase && phaseWaterfalls?.[singlePhaseName]) {
      const _pw = phaseWaterfalls[singlePhaseName];
      return { ..._pw,
        feeSub:_pw.feeSub||h0, feeMgmt:_pw.feeMgmt||h0, feeCustody:_pw.feeCustody||h0,
        feeDev:_pw.feeDev||h0, feeStruct:_pw.feeStruct||h0, feePreEst:_pw.feePreEst||h0,
        feeSpv:_pw.feeSpv||h0, feeAuditor:_pw.feeAuditor||h0, feeOperator:_pw.feeOperator||h0,
        feeMisc:_pw.feeMisc||h0, fees:_pw.fees||h0, totalFees:_pw.totalFees??0,
        totalEquity:_pw.totalEquity||_pw.equity||0, exitYear:_pw.exitYear||waterfall.exitYear||0,
        lpNPV12:_pw.lpNPV12??null, lpNPV14:_pw.lpNPV14??null, gpNPV12:_pw.gpNPV12??null, gpNPV14:_pw.gpNPV14??null,
        unreturnedClose:_pw.unreturnedClose||h0, unreturnedOpen:_pw.unreturnedOpen||h0,
        prefAccrual:_pw.prefAccrual||h0, prefAccumulated:_pw.prefAccumulated||h0, exitProceeds:_pw.exitProceeds||h0,
      };
    }
    if (!isFiltered) return waterfall;
    // Multi-phase: aggregate selected phase waterfalls
    const pws = activePh.map(p => phaseWaterfalls?.[p]).filter(Boolean);
    if (pws.length === 0) return waterfall;
    const sumArr = (field) => { const arr = new Array(h).fill(0); pws.forEach(pw => { const a = pw[field]; if (a) for(let y=0;y<h;y++) arr[y]+=(a[y]||0); }); return arr; };
    const sum = (field) => pws.reduce((s,pw) => s + (pw[field]||0), 0);
    const lpNetCF = sumArr('lpNetCF'), gpNetCF = sumArr('gpNetCF');
    const totalEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.totalEquity||0), 0);
    const gpEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.gpEquity||0), 0);
    const lpEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.lpEquity||0), 0);
    const lpTotalDist = sum('lpTotalDist'), gpTotalDist = sum('gpTotalDist');
    const eqCalls = sumArr('equityCalls');
    const lpCalled = eqCalls.reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity));
    const gpCalled = eqCalls.reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity));
    return { ...waterfall, totalEquity, gpEquity, lpEquity, gpPct: totalEquity>0?gpEquity/totalEquity:0, lpPct: totalEquity>0?lpEquity/totalEquity:0,
      equityCalls: eqCalls, fees: sumArr('fees'), feeSub: sumArr('feeSub'), feeMgmt: sumArr('feeMgmt'),
      feeCustody: sumArr('feeCustody'), feeDev: sumArr('feeDev'), feeStruct: sumArr('feeStruct'),
      feePreEst: sumArr('feePreEst'), feeSpv: sumArr('feeSpv'), feeAuditor: sumArr('feeAuditor'),
      feeOperator: sumArr('feeOperator'), feeMisc: sumArr('feeMisc'), totalFees: sum('totalFees'),
      unfundedFees: sumArr('unfundedFees'), exitProceeds: sumArr('exitProceeds'),
      exitYear: Math.max(...pws.map(pw=>pw.exitYear||0)),
      cashAvail: sumArr('cashAvail'), tier1: sumArr('tier1'), tier2: sumArr('tier2'),
      tier3: sumArr('tier3'), tier4LP: sumArr('tier4LP'), tier4GP: sumArr('tier4GP'),
      lpDist: sumArr('lpDist'), gpDist: sumArr('gpDist'), lpNetCF, gpNetCF,
      unreturnedOpen: sumArr('unreturnedOpen'), unreturnedClose: sumArr('unreturnedClose'),
      prefAccrual: sumArr('prefAccrual'), prefAccumulated: sumArr('prefAccumulated'),
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
      lpTotalDist, gpTotalDist, lpNetDist: sum('lpNetDist')||lpTotalDist, gpNetDist: sum('gpNetDist')||gpTotalDist,
      lpTotalCalled: lpCalled, gpTotalCalled: gpCalled, lpTotalInvested: lpCalled, gpTotalInvested: gpCalled,
      lpMOIC: lpCalled>0?(sum('lpNetDist')||lpTotalDist)/lpCalled:0, gpMOIC: gpCalled>0?(sum('gpNetDist')||gpTotalDist)/gpCalled:0,
      lpNPV10: calcNPV(lpNetCF,0.10), lpNPV12: calcNPV(lpNetCF,0.12), lpNPV14: calcNPV(lpNetCF,0.14),
      gpNPV10: calcNPV(gpNetCF,0.10), gpNPV12: calcNPV(gpNetCF,0.12), gpNPV14: calcNPV(gpNetCF,0.14),
      isFund: pws.some(pw=>pw.isFund),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, waterfall, phaseWaterfalls, phaseFinancings, h]);

  // Phase-aware data sources for table §7 and §8
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return results.consolidated;
    const income=new Array(h).fill(0),capex=new Array(h).fill(0),landRent=new Array(h).fill(0),netCF=new Array(h).fill(0);
    activePh.forEach(pName=>{const pr=results.phaseResults?.[pName];if(!pr)return;for(let y=0;y<h;y++){income[y]+=pr.income[y]||0;capex[y]+=pr.capex[y]||0;landRent[y]+=pr.landRent[y]||0;netCF[y]+=pr.netCF[y]||0;}});
    return {income,capex,landRent,netCF,totalCapex:capex.reduce((a,b)=>a+b,0),totalIncome:income.reduce((a,b)=>a+b,0),totalLandRent:landRent.reduce((a,b)=>a+b,0),totalNetCF:netCF.reduce((a,b)=>a+b,0),irr:calcIRR(netCF)};
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h]);
  const f = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p=>phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length===0) return financing;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf2=>{if(pf2.leveredCF)for(let y=0;y<h;y++)leveredCF[y]+=pf2.leveredCF[y]||0;});
    return {...financing, leveredCF, leveredIRR:calcIRR(leveredCF),
      totalDebt:pfs.reduce((s,p2)=>s+(p2.totalDebt||0),0), totalEquity:pfs.reduce((s,p2)=>s+(p2.totalEquity||0),0),
      devCostInclLand:pfs.reduce((s,p2)=>s+(p2.devCostInclLand||0),0), totalInterest:pfs.reduce((s,p2)=>s+(p2.totalInterest||0),0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h]);

  // ── Derived metrics: Payback, Cash Yield, Exit, Attribution ──
  const lpPayback = (() => { if ((w.lpTotalInvested||0) <= 0) return null; let cum = 0, wasNeg = false; for (let y = 0; y < h; y++) { cum += w.lpNetCF[y] || 0; if (cum < -1) wasNeg = true; if (wasNeg && cum >= 0) return y + 1; } return null; })();
  const gpPayback = (() => { if ((w.gpTotalInvested||0) <= 0) return null; let cum = 0, wasNeg = false; for (let y = 0; y < h; y++) { cum += w.gpNetCF[y] || 0; if (cum < -1) wasNeg = true; if (wasNeg && cum >= 0) return y + 1; } return null; })();

  // Exit details
  const exitProc = (w.exitProceeds || []).reduce((a, b) => a + b, 0);
  const exitYr = w.exitYear || 0;
  const exitMult = cfg.exitMultiple || project.exitMultiple || 0;
  const exitCostPct = cfg.exitCostPct || project.exitCostPct || 0;

  const lpCashYield = w.lpTotalInvested > 0 ? (w.lpDist || []).map(d => d / w.lpTotalInvested) : [];
  const gpCashYield = w.gpTotalInvested > 0 ? (w.gpDist || []).map(d => d / w.gpTotalInvested) : [];
  const lpStabYield = lpCashYield.length > 0 && exitYr > 2 ? lpCashYield[Math.min(exitYr - 2, lpCashYield.length - 1)] : 0;
  const gpStabYield = gpCashYield.length > 0 && exitYr > 2 ? gpCashYield[Math.min(exitYr - 2, gpCashYield.length - 1)] : 0;

  // Return attribution (where did distributions come from?)
  const t1Total = w.tier1.reduce((a, b) => a + b, 0);
  const t2Total = w.tier2.reduce((a, b) => a + b, 0);
  const t3Total = w.tier3.reduce((a, b) => a + b, 0);
  const t4LPTotal = w.tier4LP.reduce((a, b) => a + b, 0);
  const t4GPTotal = w.tier4GP.reduce((a, b) => a + b, 0);

  // Cumulative CF chart data
  const cfChartData = (() => {
    let lpCum = 0, gpCum = 0;
    return Array.from({ length: Math.min(showYrs, h) }, (_, y) => {
      lpCum += w.lpNetCF[y] || 0;
      gpCum += w.gpNetCF[y] || 0;
      return { year: sy + y, yr: `Yr ${y + 1}`, lp: Math.round(lpCum), gp: Math.round(gpCum) };
    });
  })();

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?100:160}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* Phase selector (multi-select) */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p=>{
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pw = phaseWaterfalls?.[p];
            const irr = pw?.lpIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"#6b7080",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && upCfg && (
      <div style={{background:"#fffbeb",borderRadius:8,border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}

    {/* ═══ QUICK EDIT: Fund & Waterfall Terms ═══ */}
    {upCfg && cfg.finMode === "fund" && (
      <div style={{background:showTerms?"#fff":"#f8f9fb",borderRadius:10,border:showTerms?"2px solid #8b5cf6":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#faf5ff":"#f8f9fb",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?"تعديل سريع - شروط الصندوق":"Quick Edit - Fund Terms"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{ar?"العائد المتوقع":"Expected Return"} {cfg.hurdleIRR||15}% · {ar?"الحافز":"Incentive"} {cfg.incentivePct||20}%</span>
          <span style={{fontSize:11,color:"#9ca3af",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #ede9fe",animation:"zanSlide 0.15s ease"}}>
          {/* Row 1: Waterfall Terms */}
          <div style={{fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"حافز حسن الأداء للمطور":"DEVELOPER PERFORMANCE INCENTIVE"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {false && ([
              {l:ar?"العائد التفضيلي %":"Pref Return %",k:"prefReturnPct",v:cfg.prefReturnPct},
              {l:ar?"حصة المطور %":"Carry %",k:"carryPct",v:cfg.carryPct},
              {l:ar?"حصة المستثمر %":"Investor Split %",k:"lpProfitSplitPct",v:cfg.lpProfitSplitPct},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:90}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
            </div>))}
            {false && (<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080"}}>{ar?"معاملة الرسوم":"Fee Treatment"}</span>
              <select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="capital">{ar?"رأسمال":"Capital"}</option><option value="rocOnly">{ar?"استرداد فقط":"ROC Only"}</option><option value="expense">{ar?"مصروف":"Expense"}</option>
              </select>
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080"}}>{ar?"تفعيل حافز حسن الأداء للمطور":"Enable Developer Performance Incentive"}</span>
              <select value={cfg.performanceIncentive?"Y":"N"} onChange={e=>upCfg({performanceIncentive:e.target.value==="Y"})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="N">{ar?"لا":"Off"}</option><option value="Y">{ar?"نعم":"On"}</option>
              </select>
            </div>
            {cfg.performanceIncentive && <>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:90}}>{ar?"العائد المتوقع السنوي للمستثمر %":"Investor Expected Annual Return %"}</span>
              <input type="number" value={cfg.hurdleIRR||""} onChange={e=>upCfg({hurdleIRR:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:90}}>{ar?"نسبة حافز المطور من الفائض %":"Developer Share of Excess %"}</span>
              <input type="number" value={cfg.incentivePct||""} onChange={e=>upCfg({incentivePct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
            </div>
            </>}
          </div>
          {/* Row 2: Fund Fees */}
          <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {l:ar?"اكتتاب %":"Sub %",k:"subscriptionFeePct",v:cfg.subscriptionFeePct},
              {l:ar?"إدارة %":"Mgmt %",k:"annualMgmtFeePct",v:cfg.annualMgmtFeePct},
              {l:ar?"سقف إدارة":"Mgmt Cap",k:"mgmtFeeCapAnnual",v:cfg.mgmtFeeCapAnnual,wide:true},
              {l:ar?"تطوير %":"Dev %",k:"developerFeePct",v:cfg.developerFeePct},
              {l:ar?"هيكلة %":"Struct %",k:"structuringFeePct",v:cfg.structuringFeePct},
              {l:ar?"سقف هيكلة":"Struct Cap",k:"structuringFeeCap",v:cfg.structuringFeeCap,wide:true},
              {l:ar?"حفظ/سنة":"Custody",k:"custodyFeeAnnual",v:cfg.custodyFeeAnnual,wide:true},
              {l:ar?"ما قبل التأسيس":"Pre-Est.",k:"preEstablishmentFee",v:cfg.preEstablishmentFee,wide:true},
              {l:ar?"SPV":"SPV",k:"spvFee",v:cfg.spvFee},
              {l:ar?"مراجع/سنة":"Auditor",k:"auditorFeeAnnual",v:cfg.auditorFeeAnnual,wide:true},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:10,color:"#6b7080",minWidth:f.wide?68:52}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:f.wide?80:55,padding:"4px 6px",border:"1px solid #e5e7ec",borderRadius:5,fontSize:11,textAlign:"center",background:"#fff"}} />
            </div>)}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: Investors | Developer | Fund | Total Dev Returns ═══ */}
    {(() => {
      const gpIsManager = cfg.gpIsFundManager !== false;
      const _feeDev = (w.feeDev||[]).reduce((a,b)=>a+b,0);
      const _feeMgmt = (w.feeMgmt||[]).reduce((a,b)=>a+b,0);
      const _feeSub = (w.feeSub||[]).reduce((a,b)=>a+b,0);
      const _feeStruct = (w.feeStruct||[]).reduce((a,b)=>a+b,0);
      const _feeCustody = (w.feeCustody||[]).reduce((a,b)=>a+b,0);
      const _feePreEst = (w.feePreEst||[]).reduce((a,b)=>a+b,0);
      const _feeSpv = (w.feeSpv||[]).reduce((a,b)=>a+b,0);
      const _feeAuditor = (w.feeAuditor||[]).reduce((a,b)=>a+b,0);
      const _feeOperator = (w.feeOperator||[]).reduce((a,b)=>a+b,0);
      const _feeMisc = (w.feeMisc||[]).reduce((a,b)=>a+b,0);
      const gpPctVal = w.gpPct||0;
      const lpPctVal = w.lpPct||0;
      const isLpOnlyPref = (w.prefAllocation||cfg.prefAllocation) === "lpOnly";
      const lpT1 = t1Total * lpPctVal;
      const lpT2 = isLpOnlyPref ? t2Total : t2Total * lpPctVal;
      const gpT1 = t1Total * gpPctVal;
      const gpT2 = isLpOnlyPref ? 0 : t2Total * gpPctVal;
      const lpNetCash = (w.lpTotalDist||0) - (w.lpTotalInvested||0);
      const lpStabYieldVal = lpCashYield.length > 0 && exitYr > 2 ? lpCashYield[Math.min(exitYr - 2, lpCashYield.length - 1)] : 0;
      // Developer as investor distributions
      const devAsInvestor = w.developerAsInvestor ?? ((w.gpTotalDist||0) - (w.perfIncentiveAmount||0));
      // Total invested across both parties
      const totalInvested = (w.lpTotalInvested||0) + (w.gpTotalInvested||0);
      const totalDist = (w.lpTotalDist||0) + devAsInvestor;
      // Developer card: non-investor income only
      const devFeeTotal = w.developerDevFees ?? (w.devFeesTotal || _feeDev);
      const perfIncentive = w.developerPerfIncentive ?? (w.perfIncentiveAmount||0);
      const devRoleIncome = devFeeTotal + (w.perfIncentiveEnabled && perfIncentive > 0 ? perfIncentive : 0);
      // Card 4: total developer economics
      const devTotalEconomics = w.developerTotalEconomics ?? (devAsInvestor + devFeeTotal + (w.perfIncentiveEnabled && perfIncentive > 0 ? perfIncentive : 0));
      const devNetProfit = devTotalEconomics - (w.gpTotalInvested||0);

      const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};
      const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
      const KR = ({l,v,c,bold}) => <><span style={{color:"#6b7080",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:bold?700:500,fontSize:11,color:c||"#1a1d23"}}>{v}</span></>;
      const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#9ca3af",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
      return <>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:12}}>

        {/* ── Card 1: Investors (All Equity) ── */}
        <div style={{background:kpiOpen.lp?"#fff":"linear-gradient(135deg, #faf5ff, #f5f3ff)",borderRadius:10,border:kpiOpen.lp?"2px solid #8b5cf6":"1px solid #e9d5ff",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,lp:!p.lp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#8b5cf6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Inv</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5b21b6",flex:1}}>{ar?"المستثمرون":"Investors"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.lp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.lp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"إجمالي مستثمر":"Total Inv.", fmtM(totalInvested), "#8b5cf6")}
              {badge(ar?"إجمالي توزيعات":"Total Dist.", fmtM(totalDist), "#16a34a")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"المساهمات":"CONTRIBUTIONS"} />
              <KR l={ar?"مساهمة المستثمر":"Investor Contribution"} v={fmt(w.lpTotalInvested)} c="#8b5cf6" />
              <KR l={ar?"مساهمة المطور (كمستثمر)":"Developer Contribution"} v={fmt(w.gpTotalInvested)} c="#3b82f6" />
              <KR l={ar?"إجمالي المستثمر":"Total Invested"} v={fmt(totalInvested)} bold />
              <SecHd text={ar?"التوزيعات":"DISTRIBUTIONS"} />
              <KR l={ar?"توزيعات المستثمر":"Investor Distributions"} v={fmt(w.lpTotalDist)} c="#8b5cf6" />
              <KR l={ar?"توزيعات المطور (كمستثمر)":"Developer Dist. (as Inv.)"} v={fmt(devAsInvestor)} c="#3b82f6" />
              <KR l={ar?"إجمالي التوزيعات":"Total Distributions"} v={fmt(totalDist)} bold />
              <SecHd text={ar?"مؤشرات المستثمر":"INVESTOR METRICS"} />
              <KR l="IRR" v={w.lpIRR!==null?fmtPct(w.lpIRR*100):"—"} c={getMetricColor("IRR",w.lpIRR)} bold />
              <KR l="MOIC" v={w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.lpMOIC)} bold />
              <KR l="DPI" v={w.lpDPI?w.lpDPI.toFixed(2)+"x":"—"} />
              <KR l={ar?"استرداد":"Payback"} v={lpPayback?`${lpPayback} ${ar?"سنة":"yr"}`:"—"} />
              <KR l={ar?"عائد نقدي":"Cash Yield"} v={lpStabYieldVal>0?fmtPct(lpStabYieldVal*100):"—"} />
              <SecHd text={ar?"مؤشرات المطور (كمستثمر)":"DEV. METRICS (AS INVESTOR)"} />
              <KR l="IRR" v={w.gpIRR!==null?fmtPct(w.gpIRR*100):"—"} c={getMetricColor("IRR",w.gpIRR)} bold />
              <KR l="MOIC" v={w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.gpMOIC)} bold />
              <KR l={ar?"استرداد":"Payback"} v={gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—"} />
              <SecHd text="NPV" />
              <KR l="@10%" v={fmtM(w.lpNPV10)} />
              <KR l="@12%" v={fmtM(w.lpNPV12)} c="#8b5cf6" bold />
              <KR l="@14%" v={fmtM(w.lpNPV14)} />
            </div>
          )}
        </div>

        {/* ── Card 2: Developer (Fees + Incentive Only) ── */}
        <div style={{background:kpiOpen.gp?"#fff":"linear-gradient(135deg, #eff6ff, #f0fdf4)",borderRadius:10,border:kpiOpen.gp?"2px solid #3b82f6":"1px solid #bfdbfe",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,gp:!p.gp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#3b82f6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Dev</span>
            <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"المطور":"Developer"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.gp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.gp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"دخل المطور":"Dev Income", fmtM(devRoleIncome), "#3b82f6")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"دخل الدور":"ROLE INCOME"} />
              <KR l={ar?"رسوم المطور":"Developer Fee"} v={fmt(devFeeTotal)} c="#a16207" />
              {w.perfIncentiveEnabled && perfIncentive > 0 && <KR l={ar?"حافز حسن الأداء":"Performance Incentive"} v={fmt(perfIncentive)} c="#059669" />}
              <div style={{gridColumn:"1/-1",height:1,background:"#e5e7ec",margin:"2px 0"}} />
              <KR l={ar?"إجمالي دخل المطور":"Total Developer Income"} v={fmtM(devRoleIncome)} c="#3b82f6" bold />
            </div>
          )}
        </div>

        {/* ── Card 3: Fund Manager ── */}
        <div style={{background:kpiOpen.fund?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.fund?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,fund:!p.fund}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📊</span>
            <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"مدير الصندوق":"Fund Manager"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.fund?"▲":"▼"}</span>
          </div>
          {!kpiOpen.fund ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"رسوم":"Fees", fmtM(w.totalFees), "#f59e0b")}
              {badge(ar?"ملكية":"Equity", fmtM(w.totalEquity), "#3b82f6")}
              {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${exitYr}`, "#16a34a")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"الرسوم":"FEES"} />
              <KR l={`${ar?"اكتتاب":"Subscription"} (${ar?"مرة":"once"})`} v={fmt(_feeSub)} c="#f59e0b" />
              <KR l={`${ar?"إدارة":"Management"} (${ar?"سنوي":"annual"})`} v={fmt(_feeMgmt)} c="#f59e0b" />
              <KR l={`${ar?"حفظ":"Custody"} (${ar?"سنوي":"annual"})`} v={fmt(_feeCustody)} c="#f59e0b" />
              <KR l={`${ar?"تطوير":"Developer"} (${ar?"مرة":"once"})`} v={fmt(_feeDev)} c="#f59e0b" />
              <KR l={`${ar?"هيكلة":"Structuring"} (${ar?"مرة+سقف":"once+cap"})`} v={fmt(_feeStruct)} c="#f59e0b" />
              <KR l={`${ar?"ما قبل التأسيس":"Pre-Est"} (${ar?"مرة":"once"})`} v={fmt(_feePreEst)} c="#f59e0b" />
              <KR l={`SPV (${ar?"مرة":"once"})`} v={fmt(_feeSpv)} c="#f59e0b" />
              <KR l={`${ar?"مراجع":"Auditor"} (${ar?"سنوي":"annual"})`} v={fmt(_feeAuditor)} c="#f59e0b" />
              {_feeOperator > 0 && <KR l={`${ar?"مشغل":"Operator"} (${ar?"سنوي":"annual"})`} v={fmt(_feeOperator)} c="#f59e0b" />}
              {_feeMisc > 0 && <KR l={`${ar?"أخرى":"Misc."} (${ar?"مرة":"once"})`} v={fmt(_feeMisc)} c="#f59e0b" />}
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #fde68a",paddingTop:4,marginTop:2,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
                <KR l={ar?"إجمالي الرسوم":"Total Fees"} v={fmtM(w.totalFees)} c="#f59e0b" bold />
              </div>
              <SecHd text={ar?"رأس المال":"CAPITAL"} />
              <KR l={ar?"إجمالي الملكية":"Total Equity"} v={fmtM(w.totalEquity)} bold />
              <KR l={ar?"المستثمر / المطور":"Investor / Developer"} v={`${fmtPct(lpPctVal*100)} / ${fmtPct(gpPctVal*100)}`} />
              <KR l={ar?"دين":"Debt"} v={f?.totalDebt ? fmtM(f.totalDebt) : "—"} c="#ef4444" />
              <SecHd text={ar?"التخارج":"EXIT"} />
              <KR l={ar?"السنة":"Year"} v={exitYr>0?`${exitYr} (${sy+exitYr-1})`:"—"} />
              <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
              <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="#16a34a" />
              <KR l={ar?"تكاليف %":"Cost %"} v={exitCostPct>0?fmtPct(exitCostPct)+"%":"—"} />
              <SecHd text={ar?"إعدادات":"CONFIG"} />
              <KR l={ar?"معاملة الرسوم":"Fee Treatment"} v={({capital:ar?"رأسمالية":"Capital",expense:ar?"مصروفات":"Expense"})[cfg.feeTreatment||"capital"]||cfg.feeTreatment||"Capital"} />
              <KR l={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} v={({equity:ar?"ملكية":"Equity",nav:ar?"صافي الأصول":"NAV",commitment:ar?"الالتزام":"Commitment"})[cfg.mgmtFeeBase||"equity"]||cfg.mgmtFeeBase||"Equity"} />
            </div>
          )}
        </div>

      </div>

      {/* ── Card 4: Total Developer Returns (full-width) ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:16}}>
        <div style={{background:kpiOpen.devTotal?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:10,border:kpiOpen.devTotal?"2px solid #16a34a":"1px solid #bbf7d0",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,devTotal:!p.devTotal}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#16a34a",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Σ</span>
            <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"إجمالي عوائد المطور":"Total Developer Returns"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.devTotal?"▲":"▼"}</span>
          </div>
          {!kpiOpen.devTotal ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"إجمالي":"Total", fmtM(devTotalEconomics), "#16a34a")}
              {badge(ar?"صافي الربح":"Net Profit", fmtM(devNetProfit), devNetProfit>=0?"#16a34a":"#ef4444")}
              {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
              {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:"3px 16px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"مكونات العائد":"RETURN COMPONENTS"} />
              <KR l={ar?"① كمستثمر (توزيعات)":"① As Investor (distributions)"} v={fmt(devAsInvestor)} c="#8b5cf6" />
              <KR l={ar?"② رسوم المطور":"② Developer Fee"} v={fmt(devFeeTotal)} c="#a16207" />
              {w.perfIncentiveEnabled && perfIncentive > 0 && <KR l={ar?"③ حافز حسن الأداء":"③ Performance Incentive"} v={fmt(perfIncentive)} c="#059669" />}
              <div style={{gridColumn:"1/-1",height:1,background:"#bbf7d0",margin:"2px 0"}} />
              <KR l={ar?"إجمالي العوائد":"Total Returns"} v={fmtM(devTotalEconomics)} c="#16a34a" bold />
              <KR l={ar?"مساهمة (حق انتفاع)":"Contribution (Usufruct)"} v={fmt(w.gpTotalInvested)} />
              <KR l={ar?"صافي الربح":"Net Profit"} v={fmtM(devNetProfit)} c={devNetProfit>=0?"#16a34a":"#ef4444"} bold />
              <SecHd text={ar?"المؤشرات":"METRICS"} />
              <div style={{gridColumn:"1/-1",display:"flex",gap:6,flexWrap:"wrap",paddingTop:4}}>
                {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
                {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
                {badge(ar?"استرداد":"Payback", gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—", "#6366f1")}
              </div>
            </div>
          )}
        </div>
      </div>
      </>;
    })()}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} waterfall={w} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT (if active) ═══ */}
    {!isFiltered && incentivesResult && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CHART TOGGLE ═══ */}
    {cfChartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setWSec(p=>({...p,chart:!p.chart}))} style={{...btnS,fontSize:11,padding:"6px 14px",background:wSec.chart?"#f0f4ff":"#f8f9fb",color:wSec.chart?"#2563eb":"#6b7080",border:"1px solid "+(wSec.chart?"#93c5fd":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"عرض الشارت":"Show Chart"} {wSec.chart?"▲":"▼"}
        </button>
        {wSec.chart && <div style={{marginTop:10,background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cfChartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="lpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="lp" stroke="#8b5cf6" strokeWidth={2} fill="url(#lpG)" name="Investor" dot={false} />
              <Area type="monotone" dataKey="gp" stroke="#3b82f6" strokeWidth={2} fill="url(#gpG)" name="Developer" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>
    )}

    {/* ═══ UNIFIED TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"تدفقات الصندوق":"Fund Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 7. PROJECT CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s7:!p.s7}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{wSec.s7?"▶":"▼"} {ar?"7. تدفقات المشروع (غير ممول)":"7. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!wSec.s7 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
      <CFRow label={ar?"إيجار الأرض":"Land Rent"} values={pc.landRent} total={pc.totalLandRent ?? pc.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      <CFRow label={ar?"تكلفة التطوير (CAPEX)":"Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"صافي التدفق النقدي (غير ممول)":"Net Project CF (Unlevered)"} values={pc.netCF} total={pc.totalNetCF ?? pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 8. FUND CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s8:!p.s8}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#2563eb",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{wSec.s8?"▶":"▼"} {ar?"8. تدفقات الصندوق (ممول)":"8. FUND CASH FLOW (Levered)"}</td></tr>
      {!wSec.s8 && <>
      <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={w.equityCalls} total={w.equityCalls.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
      {f && <>
        <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={f.drawdown} total={f.drawdown?.reduce((a,b)=>a+b,0)||0} />
        <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={f.debtBalOpen} total={null} />
        <CFRow label={ar?"سداد أصل الدين":"Debt Repayment"} values={f.repayment} total={f.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
        <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={f.debtBalClose} total={null} />
        <CFRow label={ar?"تكلفة التمويل (فائدة)":"Interest/Profit"} values={f.interest} total={f.totalInterest||0} negate color="#ef4444" />
        <CFRow label={ar?"إجمالي خدمة الدين":"Total Debt Service"} values={f.debtService} total={f.debtService?.reduce((a,b)=>a+b,0)||0} negate bold color="#ef4444" />
        {/* DSCR */}
        {f.dscr && <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontWeight:500,minWidth:isMobile?120:200,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>DSCR</td>
          <td style={tdN}></td>
          {years.map(y=>{const v=f.dscr?.[y];return <td key={y} style={{...tdN,fontSize:10,fontWeight:v&&v<1.2?700:500,color:getMetricColor("DSCR",v)}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
        </tr>}
      </>}

      {/* Fees sub-section */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"#f59e0b",background:"#fffbeb",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"الرسوم":"FEES"}</td></tr>
      {(w.feeSub||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"اكتتاب":"Subscription Fee"}`} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeMgmt||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"إدارة":"Management Fee"}`} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeCustody||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"حفظ":"Custody Fee"}`} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeDev||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"تطوير":"Developer Fee"}`} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeStruct||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"هيكلة":"Structuring Fee"}`} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feePreEst||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"ما قبل التأسيس":"Pre-Establishment"}`} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeSpv||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"SPV":"SPV Setup"}`} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeAuditor||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مراجع حسابات":"Auditor Fee"}`} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeOperator||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"أتعاب المشغل":"Operator Fee"}`} values={w.feeOperator} total={(w.feeOperator||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeMisc||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مصروفات أخرى":"Misc. Expenses"}`} values={w.feeMisc} total={(w.feeMisc||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      <CFRow label={ar?"إجمالي الرسوم":"Total Fees"} values={w.fees} total={w.totalFees} bold negate color="#f59e0b" />
      {(w.unfundedFees||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"}`} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
      <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={w.exitProceeds} total={exitProc} color="#16a34a" />
      </>}

      {/* ═══ § 9. DISTRIBUTIONS & RETURNS ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s9:!p.s9}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#7c3aed",background:"#f5f3ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #8b5cf6",userSelect:"none"}}>{wSec.s9?"▶":"▼"} {ar?"9. توزيعات وأرباح":"9. DISTRIBUTIONS & RETURNS"}</td></tr>
      {!wSec.s9 && <>
      <CFRow label={ar?"النقد المتاح للتوزيع":"Cash Available for Distribution"} values={w.cashAvail} total={w.cashAvail.reduce((a,b)=>a+b,0)} bold color="#16a34a" />

      {/* Unreturned Capital tracking */}
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:20}}>{ar?"رأس المال غير المسترد (بداية)":"Unreturned Capital (Open)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{(w.unreturnedOpen[y]||0)===0?"—":fmt(w.unreturnedOpen[y])}</td>)}
      </tr>
      <CFRow label={ar?"رد رأس المال":"Return of Capital"} values={w.tier1} total={t1Total} color="#2563eb" />
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:20,fontWeight:500}}>{ar?"رأس المال غير المسترد (نهاية)":"Unreturned Capital (Close)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:w.unreturnedClose[y]>0?"#3b82f6":"#16a34a",fontSize:10,fontWeight:w.unreturnedClose[y]===0?600:400}}>{w.unreturnedClose[y]===0?"✓ 0":fmt(w.unreturnedClose[y])}</td>)}
      </tr>

      {/* Pref tracking */}
      {t2Total > 0 && <>
      <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontSize:10,color:"#8b5cf6",paddingInlineStart:20}}>{ar?"استحقاق العائد التفضيلي":"Pref Accrual"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"#8b5cf6",fontSize:10}}>{(w.prefAccrual[y]||0)===0?"—":fmt(w.prefAccrual[y])}</td>)}
      </tr>
      <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"العائد التفضيلي المتراكم":"Unpaid Pref (Accumulated)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:(w.prefAccumulated[y]||0)>0?"#7c3aed":"#16a34a",fontSize:10,fontWeight:(w.prefAccumulated[y]||0)===0?600:400}}>{(w.prefAccumulated[y]||0)===0?"✓ 0":fmt(w.prefAccumulated[y])}</td>)}
      </tr>
      <CFRow label={ar?"العائد التفضيلي":"Preferred Return"} values={w.tier2} total={t2Total} color="#8b5cf6" />
      </>}

      {/* Remaining + T3/T4 */}
      {(() => { const rem = new Array(h).fill(0); for(let y=0;y<h;y++) rem[y]=Math.max(0,(w.cashAvail[y]||0)-(w.tier1[y]||0)-(w.tier2[y]||0)); const tot=rem.reduce((a,b)=>a+b,0); return tot>0?<CFRow label={ar?"المتبقي بعد ROC + Pref":"Remaining After ROC + Pref"} values={rem} total={tot} bold />:null; })()}
      {w.tier3?.some(v=>v>0) && <CFRow label={ar?"التعويض":"Catch-up"} values={w.tier3} total={t3Total} color="#f59e0b" />}
      {(t4LPTotal+t4GPTotal) > 0 && <>
      <CFRow label={ar?"توزيع الأرباح":"Profit Split"} values={(() => { const a=new Array(h).fill(0); for(let y=0;y<h;y++) a[y]=(w.tier4LP[y]||0)+(w.tier4GP[y]||0); return a; })()} total={t4LPTotal+t4GPTotal} color="#16a34a" />
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#16a34a",paddingInlineStart:24}}>→ {ar?"المستثمر":"Investor"} ({cfg.lpProfitSplitPct||75}%)</td>
        <td style={{...tdN,fontSize:10,color:"#16a34a"}}>{fmt(t4LPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#16a34a"}}>{(w.tier4LP[y]||0)===0?"—":fmt(w.tier4LP[y])}</td>)}
      </tr>
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>→ {ar?"المطور":"Developer"} ({100-(cfg.lpProfitSplitPct||75)}%)</td>
        <td style={{...tdN,fontSize:10,color:"#3b82f6"}}>{fmt(t4GPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#3b82f6"}}>{(w.tier4GP[y]||0)===0?"—":fmt(w.tier4GP[y])}</td>)}
      </tr>
      </>}

      {/* Distribution totals */}
      <CFRow label={ar?"إجمالي توزيعات المستثمر":"Total Investor Distributions"} values={w.lpDist} total={w.lpTotalDist} bold color="#8b5cf6" />
      <CFRow label={ar?"إجمالي توزيعات المطور":"Total Developer Distributions"} values={w.gpDist} total={w.gpTotalDist} bold color="#3b82f6" />
      </>}

      {/* ═══ § 10. PARTY RETURNS ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s10:!p.s10}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#92400e",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ca8a04",userSelect:"none"}}>{wSec.s10?"▶":"▼"} {ar?"10. عوائد الأطراف":"10. PARTY RETURNS"}</td></tr>
      {!wSec.s10 && <>
      {/* Sub-header: Investor */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"#8b5cf6",background:"#faf5ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"المستثمر":"Investor"}</td></tr>
      <CFRow label={ar?"صافي CF المستثمر":"Investor Net Cash Flow"} values={w.lpNetCF} total={w.lpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:600,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"↳ تراكمي المستثمر":"↳ Investor Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.lpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.lpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>{ar?"عائد نقدي المستثمر %":"Investor Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=lpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}

      {/* Sub-header: Developer (as Investor) */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"#3b82f6",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"المطور (كمستثمر)":"Developer (as Investor)"}</td></tr>
      <CFRow label={ar?"صافي CF المطور":"Developer Net Cash Flow"} values={w.gpNetCF} total={w.gpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:600,fontSize:10,color:"#1e40af",paddingInlineStart:20}}>{ar?"↳ تراكمي المطور":"↳ Developer Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.gpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.gpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>{ar?"عائد نقدي المطور %":"Developer Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=gpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}

      {/* Separator + Developer Fees & Incentive rows */}
      <tr><td colSpan={years.length+2} style={{padding:"2px 0",background:"#e5e7ec",height:1}}></td></tr>
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"#a16207",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"دخل المطور (الدور)":"Developer Income (Role)"}</td></tr>
      {(() => {
        const feeDevArr = w.feeDev||[];
        const feeDevTotal = feeDevArr.reduce((a,b)=>a+b,0);
        return <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#a16207",paddingInlineStart:20}}>{ar?"رسوم المطور":"Developer Fee"}</td>
          <td style={{...tdN,fontSize:10,fontWeight:600,color:"#a16207"}}>{fmt(feeDevTotal)}</td>
          {years.map(y=>{const v=feeDevArr[y]||0;return <td key={y} style={{...tdN,fontSize:10,color:v>0?"#a16207":"#d0d4dc"}}>{v>0?fmt(v):"—"}</td>;})}
        </tr>;
      })()}
      {(() => {
        const perfAmt = w.perfIncentiveAmount||0;
        if (!w.perfIncentiveEnabled || perfAmt <= 0) return null;
        const settleYr = w.exitYear ? w.exitYear - (w.startYear||results.startYear||0) : years.length - 1;
        return <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#059669",paddingInlineStart:20}}>{ar?"حافز حسن الأداء":"Performance Incentive"}</td>
          <td style={{...tdN,fontSize:10,fontWeight:600,color:"#059669"}}>{fmt(perfAmt)}</td>
          {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:y===settleYr?"#059669":"#d0d4dc"}}>{y===settleYr?fmt(perfAmt):"—"}</td>)}
        </tr>;
      })()}
      </>}

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);

}

// ═══════════════════════════════════════════════════════════════
// EXIT ANALYSIS PANEL (shared by all Results views, collapsible)
// ═══════════════════════════════════════════════════════════════
function ExitAnalysisPanel({ project, results, financing, waterfall, lang, globalExpand }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  const f = financing;
  if (!f || !results) return null;

  const c = results.consolidated;
  const h = results.horizon;
  const sy = results.startYear;
  const cur = project.currency || "SAR";
  const strategy = project.exitStrategy || "sale";
  const isHold = strategy === "hold";
  const exitYearAbs = f.exitYear || 0;
  const exitYrIdx = exitYearAbs > 0 ? exitYearAbs - sy : 0;
  const exitProc = f.exitProceeds ? f.exitProceeds.reduce((a,b)=>a+b,0) : 0;

  // If hold and no exit proceeds, still show but with hold info
  if (isHold && exitProc <= 0) {
    return (
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #f59e0b22",marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08"}}>
          <span style={{fontSize:14}}>🚪</span>
          <span style={{fontSize:13,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?"استراتيجية التخارج":"Exit Strategy"}</span>
          <span style={{fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 8px",borderRadius:10}}>{ar?"احتفاظ بالدخل":"Hold for Income"}</span>
        </div>
      </div>
    );
  }
  if (exitProc <= 0) return null;

  // Compute exit details
  const exitMult = project.exitMultiple || 10;
  const exitCostPct = project.exitCostPct || 2;
  const exitCapRate = project.exitCapRate || 9;
  const isSale = strategy === "sale";
  const isCapRate = strategy === "caprate";

  // Stabilized income & NOI at exit
  const stabIncome = exitYrIdx >= 0 && exitYrIdx < h ? (c.income[exitYrIdx] || 0) : 0;
  const stabLandRent = exitYrIdx >= 0 && exitYrIdx < h ? (c.landRent[exitYrIdx] || 0) : 0;
  const stabNOI = stabIncome - stabLandRent;

  // Gross exit value (before cost deduction)
  const grossExit = exitCostPct > 0 ? exitProc / (1 - exitCostPct/100) : exitProc;
  const exitCostAmt = grossExit - exitProc;

  // Implied cap rate and implied multiple
  const impliedCapRate = stabNOI > 0 ? (stabNOI / grossExit) * 100 : 0;
  const impliedMultiple = stabIncome > 0 ? grossExit / stabIncome : 0;

  // Debt remaining at exit
  const debtAtExit = f.debtBalClose ? (exitYrIdx > 0 && exitYrIdx < h ? (f.debtBalClose[Math.max(0,exitYrIdx-1)] || 0) : 0) : 0;
  const netToEquity = exitProc - debtAtExit;

  // Years from construction end to exit
  const constrEnd = f.constrEnd || 0;
  const holdPeriod = exitYrIdx - constrEnd;

  // Dev cost ratio
  const devCost = f.devCostInclLand || c.totalCapex;
  const returnOnCost = devCost > 0 ? exitProc / devCost : 0;

  // Fund-specific: LP/GP exit share
  const w = waterfall;
  const hasWaterfall = w && w.lpTotalDist > 0;

  return (
    <div style={{background:"#fff",borderRadius:10,border:`1px solid ${open?"#f59e0b33":"#f59e0b22"}`,marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08",borderBottom:open?"1px solid #f59e0b18":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🚪</span>
        <span style={{fontSize:13,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?"تحليل التخارج":"Exit Analysis"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 8px",borderRadius:10}}>
          {isSale ? `${exitMult}x · ` : isCapRate ? `${exitCapRate}% CR · ` : ""}{exitYearAbs} · {fmtM(exitProc)}
        </span>
        <span style={{fontSize:10,color:"#9ca3af"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Row 1: Strategy + Valuation */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:10,marginBottom:14}}>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"الاستراتيجية":"Strategy"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?(ar?"بيع (مضاعف)":"Sale (Multiple)"):isCapRate?(ar?"بيع (رسملة)":"Sale (Cap Rate)"):(ar?"احتفاظ":"Hold")}</div>
          </div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"سنة التخارج":"Exit Year"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{exitYearAbs} <span style={{fontSize:10,color:"#9ca3af"}}>({ar?"سنة":"Yr"} {exitYrIdx+1})</span></div>
          </div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"فترة الاحتفاظ":"Hold Period"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{holdPeriod > 0 ? `${holdPeriod} ${ar?"سنة بعد البناء":"yr post-build"}` : "—"}</div>
          </div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{isSale?(ar?"المضاعف":"Multiple"):(ar?"معدل الرسملة":"Cap Rate")}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?`${exitMult}x`:isCapRate?`${exitCapRate}%`:"—"}</div>
          </div>
        </div>

        {/* Row 2: Value breakdown */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
          {/* Valuation */}
          <div style={{background:"#fffbeb",borderRadius:8,padding:"10px 14px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400e",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"التقييم":"VALUATION"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"#6b7080"}}>{ar?"دخل مستقر":"Stabilized Income"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(stabIncome)}</span>
              {stabLandRent > 0 && <><span style={{color:"#6b7080"}}>{ar?"(-) إيجار أرض":"(-) Land Rent"}</span><span style={{textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmt(stabLandRent)}</span></>}
              {stabNOI !== stabIncome && <><span style={{color:"#6b7080"}}>= NOI</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(stabNOI)}</span></>}
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,color:"#6b7080"}}>{isSale?`× ${exitMult}x`:isCapRate?`÷ ${exitCapRate}%`:""}</span>
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,textAlign:"right",fontWeight:700,color:"#1a1d23"}}>{fmtM(grossExit)}</span>
              <span style={{color:"#ef4444",fontSize:11}}>{ar?"(-) تكاليف التخارج":"(-) Exit Costs"} ({exitCostPct}%)</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(exitCostAmt)}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,fontWeight:700,color:"#16a34a"}}>{ar?"= صافي العائد":"= Net Proceeds"}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,textAlign:"right",fontWeight:800,fontSize:14,color:"#16a34a"}}>{fmtM(exitProc)}</span>
            </div>
          </div>

          {/* Returns */}
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#166534",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"مؤشرات التخارج":"EXIT METRICS"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"#6b7080"}}>{ar?"العائد / التكلفة":"Proceeds / Dev Cost"}</span><span style={{textAlign:"right",fontWeight:700,color:returnOnCost>1?"#16a34a":"#ef4444"}}>{returnOnCost.toFixed(2)}x</span>
              {impliedCapRate > 0 && <><span style={{color:"#6b7080"}}>{ar?"معدل رسملة ضمني":"Implied Cap Rate"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedCapRate.toFixed(1)}%</span></>}
              {impliedMultiple > 0 && <><span style={{color:"#6b7080"}}>{ar?"مضاعف ضمني":"Implied Multiple"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedMultiple.toFixed(1)}x</span></>}
              {debtAtExit > 0 && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"#ef4444"}}>{ar?"دين متبقي عند التخارج":"Debt at Exit"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmtM(debtAtExit)}</span>
                <span style={{color:"#16a34a",fontWeight:600}}>{ar?"صافي للملكية":"Net to Equity"}</span><span style={{textAlign:"right",fontWeight:700,color:netToEquity>0?"#16a34a":"#ef4444"}}>{fmtM(netToEquity)}</span>
              </>}
              {f.totalEquity > 0 && <><span style={{color:"#6b7080"}}>{ar?"العائد / الملكية":"Proceeds / Equity"}</span><span style={{textAlign:"right",fontWeight:600,color:"#16a34a"}}>{(exitProc/f.totalEquity).toFixed(2)}x</span></>}
              {hasWaterfall && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"#8b5cf6"}}>{ar?"حصة المستثمر من التخارج":"Investor Exit Share"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"#8b5cf6"}}>{fmtM((w.lpDist||[]).slice(exitYrIdx).reduce((a,b)=>a+b,0))}</span>
                <span style={{color:"#3b82f6"}}>{ar?"حصة المطور من التخارج":"Developer Exit Share"}</span><span style={{textAlign:"right",fontWeight:500,color:"#3b82f6"}}>{fmtM((w.gpDist||[]).slice(exitYrIdx).reduce((a,b)=>a+b,0))}</span>
              </>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCENTIVES IMPACT PANEL (shared by all Results views)
// ═══════════════════════════════════════════════════════════════
function IncentivesImpact({ project, results, financing, incentivesResult, lang, globalExpand }) {
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  const ir = incentivesResult;
  if (!ir || !financing) return null;
  const hasAny = (ir.capexGrantTotal||0) > 0 || (ir.interestSubsidyTotal||0) > 0 || (ir.landRentSavingTotal||0) > 0 || (ir.feeRebateTotal||0) > 0;
  if (!hasAny) return null;

  const cur = project.currency || "SAR";
  const c = results.consolidated;
  const f = financing;
  const h = results.horizon;

  // Compute base IRR (WITHOUT incentives) using original CF
  const baseCF = new Array(h).fill(0);
  if (f.mode === "self") {
    // Self: base = raw netCF (no incentive adjustments)
    for (let y = 0; y < h; y++) baseCF[y] = c.income[y] - c.landRent[y] - c.capex[y];
    // Add exit if present
    if (f.exitProceeds) for (let y = 0; y < h; y++) baseCF[y] += f.exitProceeds[y] || 0;
  } else {
    // Debt/Fund: levered base using original (non-adjusted) values
    for (let y = 0; y < h; y++) baseCF[y] = c.income[y] - c.landRent[y] - c.capex[y] - (f.debtService[y]||0) + (f.drawdown[y]||0) + (f.exitProceeds?.[y]||0);
  }
  const baseIRR = calcIRR(baseCF);
  const baseNPV = calcNPV(baseCF, 0.12);
  const withIRR = f.leveredIRR;
  const withNPV = f.leveredCF ? calcNPV(f.leveredCF, 0.12) : null;
  const irrDelta = (withIRR !== null && baseIRR !== null) ? (withIRR - baseIRR) * 100 : null;
  const npvDelta = (withNPV !== null && baseNPV !== null) ? withNPV - baseNPV : null;
  const total = ir.totalIncentiveValue || ((ir.capexGrantTotal||0) + (ir.interestSubsidyTotal||0) + (ir.landRentSavingTotal||0) + (ir.feeRebateTotal||0));

  const items = [
    ir.capexGrantTotal > 0 && { icon: "🏗", label: ar?"منحة CAPEX":"CAPEX Grant", value: ir.capexGrantTotal, color: "#059669" },
    ir.interestSubsidyTotal > 0 && { icon: "🏦", label: ar?"دعم الفوائد":"Interest Subsidy", value: ir.interestSubsidyTotal, color: "#2563eb" },
    ir.landRentSavingTotal > 0 && { icon: "🏠", label: ar?"وفر إيجار الأرض":"Land Rent Savings", value: ir.landRentSavingTotal, color: "#7c3aed" },
    ir.feeRebateTotal > 0 && { icon: "📋", label: ar?"إعفاء رسوم":"Fee Rebates", value: ir.feeRebateTotal, color: "#f59e0b" },
  ].filter(Boolean);

  return (
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #05966933",marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#05966908",borderBottom:open?"1px solid #05966918":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🏛</span>
        <span style={{fontSize:13,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?"أثر الحوافز الحكومية":"Government Incentives Impact"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#059669",background:"#05966918",padding:"2px 8px",borderRadius:10}}>{fmtM(total)} {cur}</span>
        <span style={{fontSize:10,color:"#9ca3af"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Active incentives */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {items.map((it,i) => (
            <div key={i} style={{display:"inline-flex",alignItems:"center",gap:6,background:it.color+"12",border:`1px solid ${it.color}33`,borderRadius:6,padding:"5px 10px"}}>
              <span style={{fontSize:12}}>{it.icon}</span>
              <span style={{fontSize:11,fontWeight:600,color:it.color}}>{it.label}</span>
              <span style={{fontSize:11,fontWeight:700,color:"#1a1d23"}}>{fmtM(it.value)}</span>
            </div>
          ))}
        </div>

        {/* Before/After comparison */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
          {/* Without */}
          <div style={{background:"#fef2f2",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"بدون حوافز":"WITHOUT INCENTIVES"}</div>
            <div style={{fontSize:11,color:"#6b7080",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"#ef4444"}}>{baseIRR!==null?fmtPct(baseIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"#6b7080"}}>{fmtM(baseNPV)}</div>
          </div>

          {/* Arrow + Delta */}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:18,color:"#059669"}}>→</div>
            {irrDelta !== null && <div style={{fontSize:11,fontWeight:700,color:"#059669",marginTop:4}}>+{irrDelta.toFixed(2)}%</div>}
            {npvDelta !== null && npvDelta > 0 && <div style={{fontSize:10,color:"#059669"}}>+{fmtM(npvDelta)}</div>}
          </div>

          {/* With */}
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#059669",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"مع حوافز":"WITH INCENTIVES"}</div>
            <div style={{fontSize:11,color:"#6b7080",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"#16a34a"}}>{withIRR!==null?fmtPct(withIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"#16a34a"}}>{withNPV!==null?fmtM(withNPV):""}</div>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESULTS VIEW - Dynamic smart results page based on financing mode
// ═══════════════════════════════════════════════════════════════

export { ExitAnalysisPanel, IncentivesImpact, HelpLink, EducationalModal, getMetricColor };
export default WaterfallView;
