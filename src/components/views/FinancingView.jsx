// Extracted from App.jsx lines 2253-3158
// FinancingView: Full financing configuration + outputs + debt schedule

import { useState, useEffect, useMemo, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line, Legend } from "recharts";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { btnS, btnPrim, sideInputStyle, tblStyle, thSt, tdSt, tdN } from "../shared/styles";
import { FINANCING_FIELDS, getPhaseFinancing, hasPerPhaseFinancing } from "../../engine/phases";

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

// ── Form helpers (also used by ResultsView) ──
function FieldGroup({icon,title,children,defaultOpen=false,globalExpand}) {
  const [open,setOpen]=useState(defaultOpen);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  return <div style={{marginBottom:12,border:"1px solid #e5e7ec",borderRadius:10,overflow:"hidden"}}>
    <button onClick={()=>setOpen(!open)} style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:open?"#fff":"#fafbfc",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,color:"#1a1d23"}}><span>{icon}</span><span>{title}</span><span style={{marginInlineStart:"auto",fontSize:9,color:"#9ca3af"}}>{open?"▲":"▼"}</span></button>
    {open&&<div style={{padding:"10px 14px",borderTop:"1px solid #f0f1f5"}}>{children}</div>}
  </div>;
}
function FL({label,children,tip,hint,error}) {
  return (<div style={{marginBottom:10}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:error?"#ef4444":"#6b7080",marginBottom:4,fontWeight:500,letterSpacing:0.2}}>{tip?<Tip text={tip}>{label}</Tip>:label}</label>
    <div style={error?{borderRadius:6,boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>
    {error&&<div style={{fontSize:9,color:"#ef4444",marginTop:3,fontWeight:500}}>{error}</div>}
    {!error&&hint&&<div style={{fontSize:9,color:"#9ca3af",marginTop:3}}>{hint}</div>}
  </div>);
}
function Inp({value,onChange,type="text",...rest}) {
  const [local, setLocal] = useState(String(value??""));
  const ref = useRef(null);
  const committed = useRef(value);
  useEffect(() => { if (committed.current !== value && document.activeElement !== ref.current) { setLocal(String(value??"")); committed.current = value; } }, [value]);
  const commit = () => { const v = type==="number" ? +local : local; if (v !== committed.current) { committed.current = v; onChange(v); } };
  return <input ref={ref} type={type} value={local} onChange={e=>setLocal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter"){commit();e.target.blur();}}} style={_finInpSt} onFocus={e=>{e.target.style.borderColor="#2563eb";e.target.style.boxShadow="0 0 0 2px rgba(37,99,235,0.12)";e.target.style.background="#fff";}} {...rest} />;
}
function Drp({value,onChange,options,lang:dl}) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={_finSelSt}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[dl]||o.en||o.label}</option>)}</select>;
}


function FinancingView({ project, results, financing, phaseFinancings, waterfall, phaseWaterfalls, incentivesResult, t, up, lang, globalExpand }) {
  const isMobile = useIsMobile();
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [cfgSec, setCfgSec] = useState({}); // accordion sections: {debt:false} = collapsed
  const cfgToggle = (id) => setCfgSec(prev => ({...prev, [id]: !prev[id]}));
  const cfgOpen = (id) => cfgSec[id] === true; // all closed by default
  const [eduModal, setEduModal] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  const [kpiOpen, setKpiOpen] = useState({bank:false,dev:false,proj:false});
  const [showChart, setShowChart] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; const allSec = {mode:expand,debt:expand,exit:expand,land:expand,fund:expand,wf:expand,fees:expand,dscr:expand,equity:expand,cf:expand}; setCollapsed(expand?allSec:{}); setCfgSec(expand?{debt:true,exit:true,land:true,fund:true,wf:true,fees:true}:{}); setShowTerms(expand); setKpiOpen({bank:expand,dev:expand,proj:expand}); setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);
  const ar = lang === "ar";
  const cur = project.currency || "SAR";
  const toggle = (id) => setCollapsed(prev => ({...prev, [id]: !prev[id]}));
  const isOpen = (id) => collapsed[id] === true; // all closed by default

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results?.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const hasPhases = allPhaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;

  // ── Settings source: single phase → phase settings, multi → first selected, all → project ──
  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;

  // ── Settings writer ──
  const upCfg = isSinglePhase
    // Single phase → write to that phase only
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : isFiltered
    // Multiple phases selected → write to selected phases ONLY (not project-level)
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => activePh.includes(p.name)
          ? { ...p, financing: { ...(p.financing || getPhaseFinancing(prev, p.name)), ...fields } }
          : p)
      }))
    // All → write to project + propagate to all phases
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }));

  const copyFromPhase = (sourceName) => {
    const source = getPhaseFinancing(project, sourceName);
    upCfg({ ...source });
  };

  if (!project || !results) return <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>
    <div style={{fontSize:32,marginBottom:12}}>📊</div>
    <div style={{fontSize:14,fontWeight:500,color:"#6b7080",marginBottom:6}}>{ar?"أكمل برنامج الأصول أولاً":"Complete Asset Program First"}</div>
    <div style={{fontSize:12}}>{ar?"أضف أصول في تاب 'برنامج الأصول' ثم ارجع هنا":"Add assets in the 'Asset Program' tab, then return here"}</div>
  </div>;

  const h = results.horizon;
  const sy = results.startYear;
  const ir = incentivesResult;
  // Fee auto-default hints — shown under field as part of hint text
  const _FD = { subscriptionFeePct:2, annualMgmtFeePct:1.5, mgmtFeeCapAnnual:2000000, custodyFeeAnnual:100000, developerFeePct:10, structuringFeePct:1, structuringFeeCap:300000, preEstablishmentFee:200000, spvFee:20000, auditorFeeAnnual:50000, operatorFeePct:0.15, operatorFeeCap:600000, miscExpensePct:0.5, upfrontFeePct:0.5, maxLtvPct:70, financeRate:6.5, loanTenor:7, debtGrace:3, exitMultiple:10, exitCapRate:9, exitCostPct:2, landCapRate:1000, prefReturnPct:15, carryPct:30, lpProfitSplitPct:70 };
  const _FU = { loanTenor:ar?"سنوات":"yr", debtGrace:ar?"سنوات":"yr", exitMultiple:"x", landCapRate:ar?"ريال/م²":"SAR/sqm" }; // special units
  const autoHint = (field, baseHint) => { const d = _FD[field]; if (d === undefined) return baseHint; const u = _FU[field]; const fmt = u ? d.toLocaleString()+u : d >= 1000 ? (d/1000).toLocaleString()+'K' : d+'%'; const tag = ar ? `التلقائي: ${fmt}` : `default: ${fmt}`; return baseHint ? baseHint + ` · ${tag}` : tag; };
  const dh = (field) => autoHint(field, ""); // shortcut: default hint only
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;

  // ── Filtered financing & cashflow ──
  const f = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p => phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0), debtService = new Array(h).fill(0), debtBalClose = new Array(h).fill(0);
    const interest = new Array(h).fill(0), repayment = new Array(h).fill(0), exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { for (let y=0;y<h;y++) {
      leveredCF[y] += pf.leveredCF?.[y]||0; debtService[y] += pf.debtService?.[y]||0;
      debtBalClose[y] += pf.debtBalClose?.[y]||0; interest[y] += pf.interest?.[y]||0;
      repayment[y] += pf.repayment?.[y]||0; exitProceeds[y] += pf.exitProceeds?.[y]||0;
    }});
    const dscrRaw = new Array(h).fill(null);
    for (let y=0;y<h;y++) { if (debtService[y] > 0) { let noi = 0; activePh.forEach(p => { const pr = results.phaseResults?.[p]; if (pr) noi += (pr.income[y]||0) - (pr.landRent[y]||0); }); dscrRaw[y] = noi / debtService[y]; } }
    return { ...financing, leveredCF, debtService, debtBalClose, interest, repayment, exitProceeds,
      leveredIRR: calcIRR(leveredCF), dscr: dscrRaw,
      totalDebt: pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0),
      totalEquity: pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0),
      totalInterest: pfs.reduce((s,pf) => s + (pf.totalInterest||0), 0),
      devCostInclLand: pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0),
      devCostExclLand: pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0),
      landCapValue: pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0),
      maxDebt: pfs.reduce((s,pf) => s + (pf.maxDebt||0), 0),
      gpEquity: pfs.reduce((s,pf) => s + (pf.gpEquity||0), 0),
      lpEquity: pfs.reduce((s,pf) => s + (pf.lpEquity||0), 0),
      constrEnd: Math.max(...pfs.map(pf => pf.constrEnd || 0)),
      upfrontFee: pfs.reduce((s,pf) => s + (pf.upfrontFee||0), 0),
      devFeeTotal: pfs.reduce((s,pf) => s + (pf.devFeeTotal||0), 0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h, results]);

  const c = results.consolidated;
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return c;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => { const pr = results.phaseResults?.[pName]; if (!pr) return; for (let y=0;y<h;y++) { income[y]+=pr.income[y]||0; capex[y]+=pr.capex[y]||0; landRent[y]+=pr.landRent[y]||0; netCF[y]+=pr.netCF[y]||0; }});
    return { income, capex, landRent, netCF, totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0), totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0), irr: calcIRR(netCF) };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h, c]);

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?100:140}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE SELECTOR (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p=>{
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pf = phaseFinancings?.[p];
            const irr = pf?.leveredIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isSinglePhase && (
            <select onChange={e => { if (e.target.value) { copyFromPhase(e.target.value); e.target.value = ""; } }} style={{padding:"5px 10px",fontSize:10,borderRadius:6,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1e40af",cursor:"pointer",marginInlineStart:"auto"}}>
              <option value="">{ar?"📋 نسخ من...":"📋 Copy from..."}</option>
              {(project.phases||[]).filter(p=>p.name!==singlePhaseName).map(p=>
                <option key={p.name} value={p.name}>{p.name}</option>
              )}
            </select>
          )}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"#6b7080",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && (
      <div style={{background:"#fffbeb",borderRadius:8,border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}
    {/* Single phase info */}
    {isSinglePhase && (
      <div style={{background:"#eff6ff",borderRadius:8,border:"1px solid #bfdbfe",padding:"10px 16px",marginBottom:12,fontSize:12,color:"#1e40af"}}>
        <strong>{singlePhaseName}</strong> — {ar?"إعدادات تمويل مستقلة":"Independent Financing Settings"}
        {f && f.devCostInclLand > 0 && <span style={{marginInlineStart:12,color:"#6b7080"}}>DevCost: {fmtM(f.devCostInclLand)} · Debt: {fmtM(f.maxDebt)} · Equity: {fmtM(f.totalEquity)}</span>}
      </div>
    )}

    {/* ═══ FINANCING KPI STRIP ═══ */}
    {f && f.totalDebt > 0 && (() => {
      const dscrArr = f.dscr ? f.dscr.filter(v => v !== null && v > 0) : [];
      const avgD = dscrArr.length > 0 ? dscrArr.reduce((a,b) => a+b, 0) / dscrArr.length : null;
      const minD = dscrArr.length > 0 ? Math.min(...dscrArr) : null;
      const effLTV = f.devCostInclLand > 0 ? (f.totalDebt / f.devCostInclLand) * 100 : 0;
      const costOfDebt = cfg.financeRate || 0;
      const kpis = [
        { label: ar ? "إجمالي الدين" : "Total Debt", value: fmtM(f.totalDebt), color: "#1a1d23" },
        { label: ar ? "إجمالي الملكية" : "Total Equity", value: fmtM(f.totalEquity), color: "#1a1d23" },
        { label: ar ? "LTV الفعلي" : "Effective LTV", value: effLTV.toFixed(0) + "%", color: getMetricColor("LTV", effLTV) },
        { label: ar ? "متوسط DSCR" : "Avg DSCR", value: avgD ? avgD.toFixed(2) + "x" : "—", color: getMetricColor("DSCR", avgD), sub: minD ? (ar ? "أدنى: " : "Min: ") + minD.toFixed(2) + "x" : null },
        { label: ar ? "تكلفة الدين" : "Cost of Debt", value: costOfDebt + "%", color: "#1a1d23" },
      ];
      return <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {kpis.map((k,i) => <div key={i} style={{flex:"1 1 120px",minWidth:110,background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"10px 14px",boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>
          <div style={{fontSize:9,color:"#6b7080",fontWeight:500,marginBottom:4,textTransform:"uppercase",letterSpacing:0.3}}>{k.label}</div>
          <div style={{fontSize:18,fontWeight:700,color:k.color,fontVariantNumeric:"tabular-nums"}}>{k.value}</div>
          {k.sub && <div style={{fontSize:9,color:getMetricColor("DSCR",minD),marginTop:2,fontWeight:600}}>{k.sub}</div>}
        </div>)}
      </div>;
    })()}

    {/* ═══ FINANCIAL STRUCTURE SETTINGS ═══ */}
    {(() => {
        const hasDbt = cfg.finMode !== "self";
        const hasEq = cfg.finMode !== "self" && cfg.finMode !== "bank100";
        const isFundMode = cfg.finMode === "fund";
        const notHold = (cfg.exitStrategy||"sale") !== "hold";
        // Accordion section header helper
        const AH = ({id, color, label, summary, visible}) => {
          if (visible === false) return null;
          const open = cfgOpen(id);
          return <div onClick={()=>cfgToggle(id)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:open?"#fff":"#fafbfc",userSelect:"none",transition:"all 0.2s"}}>
            <span style={{fontSize:12,fontWeight:600,color:open?color:"#1a1d23",flex:1,transition:"color 0.2s"}}>{label}</span>
            {!open && summary && <span style={{fontSize:10,color:"#9ca3af",fontWeight:500,maxWidth:180,textAlign:"end",lineHeight:1.2}}>{summary}</span>}
            <span style={{fontSize:10,color:"#9ca3af",transition:"transform 0.25s ease",transform:open?"rotate(0)":"rotate(-90deg)",display:"inline-block"}}>{open?"▼":"▶"}</span>
          </div>;
        };
        const AB = ({id, children, visible}) => {
          if (visible === false || !cfgOpen(id)) return null;
          return <div style={{padding:"8px 14px 14px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6,background:"#fff",borderTop:"1px solid #f0f1f5",animation:"zanSlide 0.15s ease"}}>{children}</div>;
        };
        const g2 = {display:"contents"};
        const g3 = {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:6,gridColumn:"1/-1"};
        // Section card wrapper with color accent
        const SecWrap = ({children, visible, color}) => {
          if (visible === false) return null;
          return <div style={{borderRadius:8,border:`1px solid ${color||"#e5e7ec"}40`,borderTop:`3px solid ${color||"#e5e7ec"}`,overflow:"hidden",background:"#fafbfc",transition:"border-color 0.2s"}}>{children}</div>;
        };
        return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:18}}>
        {/* ── SECTION: FINANCING MODE (always visible, compact) ── */}
        <div style={{padding:"12px 14px",gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",borderRadius:8,border:"1px solid #e5e7ec",background:"#fff"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#1a1d23",whiteSpace:"nowrap"}}>{ar?"آلية التمويل":"Financing Mode"}</span>
          <select value={cfg.finMode} onChange={e=>{const v=e.target.value;const wasB100=cfg.finMode==="bank100";const extras=v==="bank100"?{debtAllowed:true,maxLtvPct:100}:{};const bank100Reset=wasB100&&v!=="bank100"?{maxLtvPct:70}:{};const graceReset=v!=="fund"&&cfg.graceBasis==="fundStart"?{graceBasis:"cod"}:{};upCfg({finMode:v,...extras,...bank100Reset,...graceReset});}} style={{padding:"8px 12px",borderRadius:7,border:"1px solid #e0e3ea",background:"#f8f9fb",fontSize:12,fontFamily:"inherit",minWidth:160,maxWidth:240,position:"relative",zIndex:10}}>
            <option value="self">{ar?"تمويل ذاتي":"Self-Funded"}</option>
            <option value="bank100">{ar?"بنكي 100%":"100% Bank Debt"}</option>
            <option value="debt">{ar?"دين + ملكية":"Debt + Equity"}</option>
            <option value="fund">{ar?"صندوق (GP/LP)":"Fund (GP/LP)"}</option>
          </select>
          <HelpLink contentKey="financingMode" lang={lang} onOpen={setEduModal} />
        </div>

        {/* ── SECTION: DEBT TERMS ── */}
        <SecWrap visible={hasDbt} color="#2563eb">
        <AH id="debt" color="#2563eb" label={ar?"شروط القرض":"Debt Terms"} summary={hasDbt && (cfg.debtAllowed || cfg.finMode==="bank100") ? `${cfg.finMode!=="bank100"?(cfg.maxLtvPct||70)+"% LTV · ":""}${cfg.financeRate||6.5}% · ${cfg.loanTenor||7}yr` : ""} visible={hasDbt} />
        <AB id="debt" visible={hasDbt}>{(() => {
          const showDebtFields = cfg.debtAllowed || cfg.finMode === "bank100";
          return <>
            {cfg.finMode !== "bank100" && (
              <FL label={ar?"هل الدين مسموح؟":"Debt Allowed"} tip="هذا المفتاح يحدد هل النموذج يسمح بتمويل بنكي. عند إيقافه يصبح المشروع ممولاً بالكامل من Equity\nToggles whether bank debt is allowed. If off, the project becomes fully equity-funded">
                <Drp lang={lang} value={cfg.debtAllowed?"Y":"N"} onChange={v=>upCfg({debtAllowed:v==="Y"})} options={["Y","N"]} />
              </FL>
            )}
            {showDebtFields && <>
              <div style={g2}>
                {cfg.finMode!=="bank100"&&<FL label={ar?"نسبة التمويل %":"LTV %"} tip="نسبة القرض إلى قيمة المشروع. في السعودية 50-70%\nLoan-to-Value ratio. Saudi: 50-70%" hint={dh("maxLtvPct")} error={cfg.maxLtvPct>100?(ar?"الحد الأقصى 100%":"Max 100%"):cfg.maxLtvPct<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><Inp type="number" value={cfg.maxLtvPct} onChange={v=>upCfg({maxLtvPct:v})} /></FL>}
                <FL label={ar?"معدل %":"Rate %"} tip="معدل تكلفة التمويل السنوي. في السعودية 5-8%\nAnnual financing cost rate. Saudi: 5-8%" hint={dh("financeRate")} error={cfg.financeRate>30?(ar?"الحد الأقصى 30%":"Max 30%"):cfg.financeRate<0?(ar?"لا يمكن أن يكون سالباً":"Cannot be negative"):null}><Inp type="number" value={cfg.financeRate} onChange={v=>upCfg({financeRate:v})} /></FL>
              </div>
              <div style={g3}>
                <FL label={ar?"مدة القرض":"Tenor"} tip="مدة القرض الكلية شاملة فترة السماح. عادة 7-15 سنة\nTotal loan period including grace. Usually 7-15 years" hint={dh("loanTenor")} error={cfg.loanTenor<1?(ar?"يجب أن تكون سنة واحدة على الأقل":"Must be at least 1 year"):cfg.loanTenor>50?(ar?"الحد الأقصى 50 سنة":"Max 50 years"):null}><Inp type="number" value={cfg.loanTenor} onChange={v=>upCfg({loanTenor:v})} /></FL>
                <FL label={ar?"فترة السماح":"Grace"} tip="فترة دفع الربح فقط بدون أصل الدين. عادة 2-4 سنوات\nInterest-only period, no principal. Usually 2-4 years" hint={dh("debtGrace")} error={cfg.debtGrace>(cfg.loanTenor||7)?(ar?"فترة السماح تتجاوز مدة القرض":"Grace exceeds tenor"):cfg.debtGrace<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><Inp type="number" value={cfg.debtGrace} onChange={v=>upCfg({debtGrace:v})} /></FL>
                <FL label={ar?"بداية السماح":"Grace Basis"} tip={ar?"متى تبدأ فترة السماح: من اكتمال البناء أو أول سحب"+(isFundMode?" أو بداية الصندوق":""):"When grace starts: COD, first drawdown"+(isFundMode?", or fund start year":"")}><select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fff",fontSize:13}}><option value="cod">{ar?"اكتمال البناء (تلقائي)":"COD (default)"}</option><option value="firstDraw">{ar?"أول سحب":"First Drawdown"}</option>{isFundMode&&<option value="fundStart">{ar?"بداية الصندوق":"Fund Start Year"}</option>}</select></FL>
              </div>
              <div style={g2}>
                <FL label={ar?"رسوم %":"Upfront Fee %"} tip="رسوم القرض المقدمة كنسبة من مبلغ التمويل. تُدفع مرة واحدة عند السحب\nUpfront loan fee as percentage of debt amount. Paid once at drawdown" hint={autoHint("upfrontFeePct",ar?"مرة واحدة · عند السحب":"One-time · at drawdown")}><Inp type="number" value={cfg.upfrontFeePct} onChange={v=>upCfg({upfrontFeePct:v})} /></FL>
                <FL label={ar?"سداد":"Repayment"} tip="Amortizing = أقساط دورية تقلل الرصيد. Bullet = سداد الأصل دفعة واحدة بالنهاية\nAmortizing = regular installments. Bullet = principal at end">
                  <Drp lang={lang} value={cfg.repaymentType} onChange={v=>upCfg({repaymentType:v})} options={[{value:"amortizing",en:"Amortizing (default)",ar:"أقساط (تلقائي)"},{value:"bullet",en:"Bullet",ar:"دفعة واحدة"}]} />
                </FL>
              </div>
              <FL label={ar?"طريقة السحب":"Tranche Mode"} tip="Single: all debt as one block. Per Draw: each drawdown as separate tranche"><Drp lang={lang} value={cfg.debtTrancheMode||"single"} onChange={v=>upCfg({debtTrancheMode:v})} options={[{value:"single",en:"Single Block (default)",ar:"كتلة واحدة (تلقائي)"},{value:"perDraw",en:"Per Drawdown",ar:"لكل سحبة"}]} /></FL>
              <div style={{gridColumn:"1/-1",marginTop:-2,marginBottom:4}}><HelpLink contentKey="islamicFinance" lang={lang} onOpen={setEduModal} label={ar?"المرابحة والإجارة والتقليدي":"Murabaha vs Ijara vs Conventional"} /></div>
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #f0f1f3",paddingTop:8,marginTop:4}}>
                <FL label={ar?"رسملة تكاليف التمويل أثناء البناء (IDC)":"Capitalize Financing Costs (IDC)"} tip={ar?
`خلال البناء، المشروع ما يولّد دخل — لكن القرض يبدأ يراكم فوائد.

السؤال: من يدفع هالفوائد؟

لا (الوضع الافتراضي):
الفوائد تتراكم وتُدفع من أول دخل تشغيلي بعد البناء.
الـ Equity يغطي تكلفة البناء فقط.

نعم (رسملة):
الفوائد + رسوم البنك خلال البناء تُضاف على تكلفة المشروع.
هذا يرفع الـ Equity المطلوب لأن المبلغ الإضافي لازم يجي من المطور أو المستثمر.

متى تستخدمها؟
• لما تبي تعرف التكلفة الحقيقية الكاملة للمشروع
• لما البنك يطلب إدراج IDC بالدراسة
• لما تقارن بين سيناريوهات تمويل مختلفة`:
`During construction, the project generates no income — but the loan accrues interest.

The question: who pays this interest?

No (default):
Interest accrues and is paid from first operating income after construction.
Equity covers construction cost only.

Yes (capitalize):
Interest + bank fees during construction are added to project cost.
This increases equity needed — the extra amount must come from developer or investor.

When to use:
• To see the true all-in project cost
• When the bank requires IDC in the study
• When comparing different financing scenarios`}>
                  <Drp lang={lang} value={cfg.capitalizeIDC?"Y":"N"} onChange={v=>upCfg({capitalizeIDC:v==="Y"})} options={["Y","N"]} />
                </FL>
                {cfg.capitalizeIDC && f?.capitalizedFinCosts > 0 && <div style={{padding:"6px 10px",background:"#fef9c3",borderRadius:6,border:"1px solid #fde68a",fontSize:10,color:"#92400e",marginTop:-4}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span>{ar?"فوائد أثناء البناء (IDC)":"Interest During Construction"}</span>
                    <span style={{fontWeight:600}}>{fmt(f.estimatedIDC)} {cur}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span>{ar?"رسوم بنك أولية":"Upfront Bank Fees"}</span>
                    <span style={{fontWeight:600}}>{fmt(f.estimatedUpfrontFees)} {cur}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #fde68a",paddingTop:2,marginTop:2}}>
                    <span style={{fontWeight:700}}>{ar?"إجمالي مُرسمل (يُضاف على الـ Equity)":"Total Capitalized (added to Equity)"}</span>
                    <span style={{fontWeight:700}}>{fmt(f.capitalizedFinCosts)} {cur}</span>
                  </div>
                </div>}
              </div>
            </>}
          </>;
        })()}</AB>

        {/* ── SECTION: EXIT STRATEGY (visible for ALL modes including self) ── */}
        </SecWrap>
        <SecWrap visible={true} color="#8b5cf6">
        <AH id="exit" color="#8b5cf6" label={ar?"التخارج":"Exit Strategy"} summary={`${({sale:ar?"بيع":"Sale",caprate:ar?"رسملة":"Cap Rate",hold:ar?"احتفاظ":"Hold"})[cfg.exitStrategy||"sale"]||""}${notHold?` · ${ar?"سنة":"Yr"} ${cfg.exitYear||"auto"}`:""}`} visible={true} />
        <AB id="exit" visible={true}>
          <FL label={ar?"استراتيجية التخارج":"Exit Strategy"} tip="بيع الأصل = تخارج في سنة محددة. احتفاظ بالدخل = بدون بيع\nAsset Sale = exit at a set year. Hold for Income = no sale event">
            <Drp lang={lang} value={cfg.exitStrategy||"sale"} onChange={v=>upCfg({exitStrategy:v})} options={[{value:"sale",en:"Sale - Multiple (default)",ar:"بيع - مضاعف (تلقائي)"},{value:"caprate",en:"Sale - Cap Rate",ar:"بيع - رسملة"},{value:"hold",en:"Hold",ar:"احتفاظ"}]} />
          </FL>
          <div style={{gridColumn:"1/-1",marginTop:-6,marginBottom:4}}><HelpLink contentKey="exitStrategy" lang={lang} onOpen={setEduModal} /></div>
          {notHold&&<>
            <div style={g2}>
              <div>
                <FL label={ar?"سنة التخارج":"Exit Year"} hint="0 = auto" tip="سنة بيع الأصل. عادة 5-10 سنوات بعد الاستقرار التشغيلي. 0 = تلقائي\nYear of asset sale. Usually 5-10 years after stabilization. 0 = auto"><Inp type="number" value={cfg.exitYear} onChange={v=>upCfg({exitYear:v})} /></FL>
                {f?.optimalExitYear > 0 && f?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <div style={{marginTop:-6,marginBottom:4,padding:"4px 8px",background:"#fef9c3",borderRadius:5,border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:11}}>💡</span>
                  <span style={{fontSize:10,color:"#92400e"}}>{ar?`أعلى IRR غير ممول (${(f.optimalExitIRR*100).toFixed(1)}%) بسنة: ${f.optimalExitYear}`:`Best unlevered IRR (${(f.optimalExitIRR*100).toFixed(1)}%) at year: ${f.optimalExitYear}`}</span>
                </div>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<FL label={ar?"المضاعف":"Multiple (x)"} tip="قيمة البيع = الإيجار × المضاعف. عادة 8x-15x\nSale price = Rent × Multiple. Usually 8x-15x" hint={dh("exitMultiple")}><Inp type="number" value={cfg.exitMultiple} onChange={v=>upCfg({exitMultiple:v})} /></FL>}
              {cfg.exitStrategy==="caprate"&&<FL label={ar?"معدل الرسملة %":"Cap Rate %"} tip="قيمة التخارج = NOI / Cap Rate. في السعودية 7-10% للأصول المستقرة\nExit = NOI / Cap Rate. Saudi stabilized: 7-10%" hint={dh("exitCapRate")}><Inp type="number" value={cfg.exitCapRate} onChange={v=>upCfg({exitCapRate:v})} /></FL>}
            </div>
            <FL label={ar?"تكاليف التخارج %":"Exit Cost %"} tip="تكاليف البيع مثل السمسرة والاستشارات القانونية. عادة 1.5-3% من سعر البيع\nSale costs like brokerage and legal fees. Typically 1.5-3% of sale price" hint={dh("exitCostPct")}><Inp type="number" value={cfg.exitCostPct} onChange={v=>upCfg({exitCostPct:v})} /></FL>
          </>}
        </AB>

        {/* ── SECTION: LAND & EQUITY ── */}
        </SecWrap>
        <SecWrap visible={hasEq} color="#8b5cf6">
        <AH id="land" color="#8b5cf6" label={ar?"الأرض والملكية":"Land & Equity"} summary={hasEq ? `${cfg.landCapitalize?(ar?"مرسملة":"Cap"):""} · GP ${cfg.gpEquityManual||"auto"}` : ""} visible={hasEq} />
        <AB id="land" visible={hasEq}>
          {(project.landType==="lease"||project.landType==="bot")&&<FL label={ar?"رسملة حق الانتفاع؟":"Capitalize Leasehold?"} tip={ar?"الأرض مؤجرة وليست مملوكة — لكن حق الانتفاع له قيمة مالية. رسملته تعني تحويل هذي القيمة إلى حصة Equity في الصندوق.\nمثال: أرض 50,000 م² × 800 ريال = 40 مليون تُحسب كمساهمة عينية لصاحب الأرض":"The land is leased, not owned — but the leasehold right has financial value. Capitalizing it converts this value into an equity stake in the fund.\nExample: 50,000 sqm × SAR 800 = SAR 40M counted as in-kind equity contribution"}>
            <Drp lang={lang} value={cfg.landCapitalize?"Y":"N"} onChange={v=>upCfg({landCapitalize:v==="Y"})} options={["Y","N"]} />
          </FL>}
          {cfg.landCapitalize&&(project.landType==="lease"||project.landType==="bot")&&<>
            <div style={g2}>
              <FL label={ar?"سعر/م²":"Rate/sqm"} tip="سعر تقييم الأرض للمتر المربع عند رسملتها كـ Equity. يفضل أن يكون محافظاً\nLand value per sqm for equity capitalization. Should be based on conservative appraisal" hint={`= ${fmt((project.landArea||0)*(cfg.landCapRate||1000))} ${cur} · ${dh("landCapRate")}`}><Inp type="number" value={cfg.landCapRate} onChange={v=>upCfg({landCapRate:v})} /></FL>
              <FL label={ar?"رسملة حق الانتفاع لصالح":"Leasehold Cap Credit To"} tip={ar?"من يُحسب له حق الانتفاع كحصة Equity: المطور أو المستثمر أو مقسمة":"Who gets the leasehold capitalization as equity credit: Developer (GP), Investor (LP), or split 50/50"}><Drp lang={lang} value={cfg.landCapTo||"gp"} onChange={v=>upCfg({landCapTo:v})} options={[{value:"gp",en:"Developer - GP (default)",ar:"المطور - GP (تلقائي)"},{value:"lp",en:"Investor (LP)",ar:"المستثمر (LP)"},{value:"split",en:"Split 50/50",ar:"مقسمة 50/50"}]} /></FL>
            </div>
            {project.landType==="lease"&&<FL label={ar?"من يدفع إيجار الأرض؟":"Who Pays Land Rent?"} tip={ar?"بعد رسملة حق الانتفاع: تلقائي = اللي انحسب له حق الانتفاع يدفع الإيجار. المشروع = الكل يتحمل. أو اختر يدوياً":"After leasehold cap: Auto = whoever got the cap credit pays rent. Project = all bear cost. Or choose manually"}><Drp lang={lang} value={cfg.landRentPaidBy||"auto"} onChange={v=>upCfg({landRentPaidBy:v})} options={[{value:"auto",en:"Auto (cap credit owner)",ar:"تلقائي (صاحب حق الانتفاع)"},{value:"project",en:"Project (all bear cost)",ar:"المشروع (الكل يتحمل)"},{value:"gp",en:"Developer (GP)",ar:"المطور (GP)"},{value:"lp",en:"Investor (LP)",ar:"المستثمر (LP)"}]} /></FL>}
          </>}

          {/* ── GP Investment Sources ── */}
          {isFundMode && <>
            <div style={{gridColumn:"1/-1",marginTop:4,marginBottom:2,fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.3,textTransform:"uppercase"}}>{ar?"استثمار المطور (GP)":"Developer Investment (GP)"}</div>

            {/* Source 2: Dev Fee as Investment */}
            <FL label={ar?"إدخال أتعاب التطوير كاستثمار؟":"Invest Dev Fee as Equity?"} tip={ar?"المطور يعيد أتعاب التطوير للصندوق كاستثمار بدل استلامها نقداً":"Developer reinvests dev fee into fund as equity instead of taking cash"}>
              <Drp lang={lang} value={cfg.gpInvestDevFee?"Y":"N"} onChange={v=>upCfg({gpInvestDevFee:v==="Y"})} options={["Y","N"]} />
            </FL>
            {cfg.gpInvestDevFee && <div style={g2}>
              <FL label={ar?"نسبة الإدخال %":"Invest %"} hint={`${ar?"أتعاب التطوير":"Dev Fee"} = ${fmtM(f?.gpEquityBreakdown?.devFeeTotal||0)}`} tip={ar?"نسبة أتعاب التطوير المُعاد استثمارها. 100% = كامل الأتعاب":"% of dev fee reinvested. 100% = all fees"}>
                <Inp type="number" value={cfg.gpDevFeeInvestPct??100} onChange={v=>upCfg({gpDevFeeInvestPct:v})} />
              </FL>
              <div style={{display:"flex",alignItems:"center",fontSize:11,color:"#16a34a",fontWeight:600,padding:"8px 0"}}>= {fmt((f?.gpEquityBreakdown?.devFeeTotal||0)*((cfg.gpDevFeeInvestPct??100)/100))} {cur}</div>
            </div>}

            {/* Source 3: Cash Investment */}
            <FL label={ar?"استثمار نقدي إضافي؟":"Additional Cash Investment?"} tip={ar?"المطور يضيف مبلغ نقدي من جيبه كاستثمار بالصندوق":"Developer adds cash from own pocket as fund investment"}>
              <Drp lang={lang} value={cfg.gpCashInvest?"Y":"N"} onChange={v=>upCfg({gpCashInvest:v==="Y"})} options={["Y","N"]} />
            </FL>
            {cfg.gpCashInvest && <FL label={ar?"المبلغ":"Amount (SAR)"} tip={ar?"المبلغ النقدي الإضافي":"Cash investment amount"}>
              <Inp type="number" value={cfg.gpCashInvestAmount} onChange={v=>upCfg({gpCashInvestAmount:v})} />
            </FL>}

            {/* Live Summary */}
            {f && <div style={{gridColumn:"1/-1",marginTop:4,padding:"8px 12px",background:"#f8f9fb",borderRadius:6,border:"1px solid #e5e7ec",fontSize:11}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"#6b7080"}}>{ar?"إجمالي Equity":"Total Equity"}</span>
                <span style={{fontWeight:700}}>{fmt(f.totalEquity)} {cur}</span>
              </div>
              {f.gpEquityBreakdown?.landCap > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#6b7080",paddingInlineStart:8}}>↳ {ar?"رسملة حق الانتفاع":"Leasehold Cap (GP)"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.landCap)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.partnerLand > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#6b7080",paddingInlineStart:8}}>↳ {ar?"حصة الشريك":"Partner Land"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.partnerLand)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.devFee > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#6b7080",paddingInlineStart:8}}>↳ {ar?"أتعاب تطوير":"Dev Fee Invested"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.devFee)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.cash > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#6b7080",paddingInlineStart:8}}>↳ {ar?"نقدي":"Cash"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.cash)} {cur}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e5e7ec",paddingTop:4,marginTop:4}}>
                <span style={{fontWeight:600,color:"#8b5cf6"}}>GP ({fmtPct(f.gpPct*100)})</span>
                <span style={{fontWeight:700,color:"#8b5cf6"}}>{fmt(f.gpEquity)} {cur}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,color:"#2563eb"}}>LP ({fmtPct(f.lpPct*100)})</span>
                <span style={{fontWeight:700,color:"#2563eb"}}>{fmt(f.lpEquity)} {cur}</span>
              </div>
            </div>}
          </>}

          {/* Non-fund modes: just show GP equity */}
          {!isFundMode && hasEq && <div style={g2}>
            <FL label={ar?"حصة المطور (GP)":"Developer Equity (GP)"} hint="0=auto" tip={ar?"مساهمة المطور النقدية. عادة 100% في وضع الدين":"Developer equity. Usually 100% in debt mode"}><Inp type="number" value={cfg.gpEquityManual} onChange={v=>upCfg({gpEquityManual:v})} /></FL>
          </div>}
        </AB>

        {/* ── SECTION: FUND STRUCTURE ── */}
        </SecWrap>
        <SecWrap visible={isFundMode} color="#16a34a">
        <AH id="fund" color="#16a34a" label={ar?"هيكل الصندوق":"Fund Structure"} summary={isFundMode ? `${({fund:ar?"صندوق":"Fund",direct:ar?"مباشر":"Direct",spv:"SPV"})[cfg.vehicleType]||""} · ${cfg.gpIsFundManager===false?(ar?"مدير مستقل":"Sep. Mgr"):(ar?"المطور = المدير":"GP = Mgr")}` : ""} visible={isFundMode} />
        <AB id="fund" visible={isFundMode}>
          <div style={g2}>
            <FL label={ar?"الهيكل القانوني":"Vehicle"} tip={ar?"صندوق: وعاء استثماري منظم من هيئة السوق المالية. فيه اشتراك وإدارة ومراجع — الأكثر حوكمة وتنظيماً\nمباشر: المطور والمستثمر يدخلون مباشرة بعقد مشاركة بدون وعاء رسمي — أبسط وأقل رسوم\nSPV: شركة ذات غرض خاص تُنشأ للمشروع فقط — تعزل المخاطر عن الأطراف":"Fund: CMA-regulated vehicle with subscription, management, auditor — highest governance\nDirect: Developer and investor enter via partnership agreement — simpler, fewer fees\nSPV: Special Purpose Vehicle created for this project only — isolates risk"}><Drp lang={lang} value={cfg.vehicleType} onChange={v=>{const reset=v!=="fund"?{subscriptionFeePct:0,structuringFeePct:0,structuringFeeCap:0,preEstablishmentFee:0,spvFee:0,auditorFeeAnnual:0,mgmtFeeCapAnnual:0,custodyFeeAnnual:0}:{};upCfg({vehicleType:v,...reset});}} options={[{value:"fund",en:"Fund - Regulated (default)",ar:"صندوق - منظم (تلقائي)"},{value:"direct",en:"Direct (Partnership)",ar:"مباشر (شراكة)"},{value:"spv",en:"SPV (Ring-fenced)",ar:"SPV (معزول)"}]} /></FL>
            {cfg.vehicleType==="fund"&&<FL label={ar?"اسم الصندوق":"Fund Name"} tip={ar?"الاسم القانوني أو التشغيلي للصندوق. للعرض والتقارير فقط":"Legal or operating fund name. For display and reports only"}><Inp value={cfg.fundName} onChange={v=>upCfg({fundName:v})} /></FL>}
          </div>
          <div style={g2}>
            {(() => {
              // Compute auto fund start year from project data (independent of financing result)
              const sy = project.startYear || 2026;
              let firstCapexYr = sy;
              if (pc?.capex) {
                for (let y = 0; y < (project.horizon||20); y++) {
                  if (pc.capex[y] > 0) { firstCapexYr = sy + y; break; }
                }
              }
              const autoFundStart = firstCapexYr;
              const displayVal = (cfg.fundStartYear || 0) > 0 ? cfg.fundStartYear : autoFundStart;
              const isAuto = displayVal === autoFundStart;
              return <div>
                <FL label={ar?"سنة بداية الصندوق":"Fund Start Year"} tip={ar?"سنة بدء جمع رأس المال وتسجيل الصندوق. غالباً قبل البناء بسنة":"Year capital raising begins. Usually 1 year before construction."}>
                  <Inp type="number" value={displayVal} onChange={v=>upCfg({fundStartYear:v===autoFundStart?0:v})} />
                </FL>
                <div style={{marginTop:-6,marginBottom:4,fontSize:10,color:"#6b7080",paddingInlineStart:2}}>
                  {ar?`التلقائي: ${autoFundStart} (سنة بداية البناء)`:`Auto: ${autoFundStart} (construction start year)`}
                  {isAuto && <span style={{color:"#16a34a",marginInlineStart:6}}>✓</span>}
                </div>
              </div>;
            })()}
            <FL label={ar?"المطور = مدير الصندوق؟":"GP = Fund Manager?"} tip={ar?"نعم: المطور يدير الصندوق ويستلم كل الرسوم (تطوير + إدارة + هيكلة)\nلا: شركة مالية مستقلة تدير الصندوق. المطور يأخذ رسوم التطوير فقط":"Yes: Developer manages the fund and receives all fees\nNo: Separate financial company manages. Developer gets dev fee only"}>
              <Drp lang={lang} value={cfg.gpIsFundManager===false?"N":"Y"} onChange={v=>upCfg({gpIsFundManager:v==="Y"})} options={[{value:"Y",en:"Yes (GP = Manager)",ar:"نعم (المطور = المدير)"},{value:"N",en:"No (Separate Manager)",ar:"لا (مدير مستقل)"}]} />
            </FL>
          </div>
        </AB>

        {/* ── SECTION: WATERFALL ── */}
        </SecWrap>
        <SecWrap visible={isFundMode} color="#16a34a">
        <AH id="wf" color="#16a34a" label={ar?"حافز الأداء":"Waterfall"} summary={isFundMode ? `Pref ${cfg.prefReturnPct||10}% · Carry ${cfg.carryPct||20}%` : ""} visible={isFundMode} />
        <AB id="wf" visible={isFundMode}>
          <div style={{gridColumn:"1/-1",marginBottom:4}}><HelpLink contentKey="waterfallConcepts" lang={lang} onOpen={setEduModal} label={ar?"اعرف أكثر عن حافز الأداء":"Learn about Waterfall"} /></div>
          <div style={g2}>
            <FL label={ar?"العائد التفضيلي %":"Pref Return %"} tip={ar?"الحد الأدنى للعائد السنوي الذي يحصل عليه المستثمر (LP) قبل أن يشارك المطور (GP) بالأرباح. عادة 8-15%\nيتراكم سنوياً على رأس المال غير المسترد":"Minimum annual return for LP before GP shares profits. Usually 8-15%\nAccrues annually on unreturned capital"} hint={dh("prefReturnPct")}><Inp type="number" value={cfg.prefReturnPct} onChange={v=>upCfg({prefReturnPct:Math.max(0,Math.min(50,v))})} /></FL>
            <FL label={ar?"أتعاب حسن الأداء %":"Performance Carry %"} tip={ar?"نسبة من الأرباح تُدفع للمطور إذا تجاوزت أرباح الصندوق العائد التفضيلي. عادة 20-30%\nمثال: لو العائد التفضيلي 15% والأرباح تجاوزته → 25% من الفائض يروح للمطور كأتعاب حسن أداء":"GP's share of profits after LP receives preferred return. Usually 20-30%\nExample: if pref is 15% and profits exceed it → 25% of excess goes to GP as performance fee"} hint={dh("carryPct")}><Inp type="number" value={cfg.carryPct} onChange={v=>upCfg({carryPct:Math.max(0,Math.min(50,v))})} /></FL>
          </div>
          <div style={g3}>
            <FL label={ar?"نسبة توزيع الممول (LP)":"Investor Split % (LP)"} tip={ar?"نسبة الأرباح المتبقية للمستثمر بعد العائد التفضيلي والـ catch-up. عادة 70-80%\nالباقي يذهب تلقائياً للمطور (GP)":"LP share of remaining profits after pref and catch-up. Usually 70-80%\nRemainder automatically goes to GP"} hint={`GP = ${100-(cfg.lpProfitSplitPct||70)}% · ${dh("lpProfitSplitPct")}`}><Inp type="number" value={cfg.lpProfitSplitPct} onChange={v=>upCfg({lpProfitSplitPct:Math.max(0,Math.min(100,v))})} /></FL>
            <FL label={ar?"تعويض المطور (GP Catch-up)":"Developer Catch-up (GP)"} tip="بعد حصول LP على Pref، يأخذ GP حصة أكبر مؤقتاً حتى يصل للنسبة المتفق عليها\nAfter LP receives pref, GP takes a larger temporary share until agreed economics are reached"><Drp lang={lang} value={cfg.gpCatchup?"Y":"N"} onChange={v=>upCfg({gpCatchup:v==="Y"})} options={["Y","N"]} /></FL>
            <FL label={ar?"معاملة الرسوم":"Fee Treatment"} tip={ar?"رأسمال: الرسوم تُسترد + تحصل عائد تفضيلي\nاسترداد فقط: تُسترد لكن بدون عائد تفضيلي\nمصروف: لا تُسترد ولا تحصل عائد":"Capital: fees earn ROC + Pref\nROC Only: fees returned but no Pref\nExpense: fees not returned, no Pref"}><select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fff",fontSize:13}}><option value="capital">{ar?"رأسمال - استرداد + Pref (تلقائي)":"Capital - ROC + Pref (default)"}</option><option value="rocOnly">{ar?"استرداد فقط (بدون Pref)":"ROC Only (no Pref)"}</option><option value="expense">{ar?"مصروف (لا استرداد)":"Expense (no ROC)"}</option></select></FL>
          </div>
          <div style={g2}>
            <FL label={ar?"توزيع العائد التفضيلي":"Pref Allocation"} tip={ar?"نسبي: العائد التفضيلي يوزع على GP و LP بحسب حصصهم\nللممول فقط: كامل العائد التفضيلي يذهب لـ LP":"Pro Rata: pref distributed to GP and LP by ownership share\nLP Only: all pref goes to LP (default: proRata)"}>
              <Drp lang={lang} value={cfg.prefAllocation||"proRata"} onChange={v=>upCfg({prefAllocation:v})} options={[{value:"proRata",en:"Pro Rata - GP+LP (default)",ar:"نسبي - GP+LP (تلقائي)"},{value:"lpOnly",en:"LP Only",ar:"للممول فقط"}]} />
            </FL>
            <FL label={ar?"طريقة الـ Catch-up":"Catch-up Method"} tip={ar?"سنوي: يُحسب الـ catch-up كل سنة على حدة\nتراكمي: يُحسب على إجمالي التوزيعات التراكمية":"Per Year: catch-up calculated annually (default)\nCumulative: catch-up on total cumulative distributions"}>
              <Drp lang={lang} value={cfg.catchupMethod||"perYear"} onChange={v=>upCfg({catchupMethod:v})} options={[{value:"perYear",en:"Per Year (default)",ar:"سنوي (تلقائي)"},{value:"cumulative",en:"Cumulative",ar:"تراكمي"}]} />
            </FL>
          </div>
        </AB>
        </SecWrap>
        <SecWrap visible={true} color="#f59e0b">
        <AH id="fees" color="#f59e0b" label={ar?"الرسوم":"Fees"} summary={isFundMode && cfg.vehicleType==="fund" ? (ar?"11 رسم":"11 fees") : `${ar?"رسوم تطوير":"Dev Fee"} ${cfg.developerFeePct||10}%`} visible={true} />
        <AB id="fees" visible={true}>{(() => {
          if (isFundMode && cfg.vehicleType==="fund") return <>
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"رسوم لمرة واحدة":"One-time"}</div>
            <div style={g3}>
              <FL label={ar?"اكتتاب %":"Subscription %"} tip="رسوم دخول لمرة واحدة عند اكتتاب المستثمر. عادة 1-2% من المبلغ المستثمر\nOne-time entry fee at subscription. Usually 1-2% of invested capital" hint={autoHint("subscriptionFeePct",ar?"مرة واحدة · عند الاكتتاب":"One-time · at subscription")}><Inp type="number" value={cfg.subscriptionFeePct} onChange={v=>upCfg({subscriptionFeePct:v})} /></FL>
              <FL label={ar?"هيكلة %":"Structuring %"} tip="نسبة من تكلفة التطوير تُدفع لمرة واحدة لمدير الصندوق مقابل ترتيب الفرصة ودراسات الجدوى\nOne-time fee for deal sourcing, due diligence, and fund setup" hint={autoHint("structuringFeePct",ar?"مرة واحدة · من تكلفة التطوير":"One-time · % of dev cost")}><Inp type="number" value={cfg.structuringFeePct} onChange={v=>upCfg({structuringFeePct:v})} /></FL>
              <FL label={ar?"سقف الهيكلة":"Structuring Cap"} tip="الحد الأقصى لرسوم الهيكلة. 0 = بدون سقف\nMax structuring fee amount. 0 = no cap" hint={autoHint("structuringFeeCap",ar?"حد أقصى · 0 = بدون سقف":"Max amount · 0 = no cap")}><Inp type="number" value={cfg.structuringFeeCap} onChange={v=>upCfg({structuringFeeCap:v})} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"ما قبل التأسيس":"Pre-Establishment"} tip="مصاريف إعداد مستندات الصندوق وتقديمها لهيئة السوق المالية. تُدفع مرة واحدة بعد الإقفال الأولي\nFund document preparation and CMA filing. One-time after initial closing" hint={autoHint("preEstablishmentFee",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.preEstablishmentFee} onChange={v=>upCfg({preEstablishmentFee:v})} /></FL>
              <FL label={ar?"إنشاء SPV":"SPV Fee"} tip="رسوم تأسيس الشركة ذات الغرض الخاص. تُدفع مرة واحدة عند بدء التأسيس\nSPV incorporation fee. One-time at setup" hint={autoHint("spvFee",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.spvFee} onChange={v=>upCfg({spvFee:v})} /></FL>
              <div />
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8,gridColumn:"1/-1"}} />
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"رسوم سنوية":"Annual"}</div>
            <div style={g2}>
              <FL label={ar?"إدارة %":"Management %"} tip="أتعاب إدارية سنوية من صافي أصول الصندوق (NAV). تُستحق وتسدد بشكل ربع سنوي\nAnnual management fee based on fund NAV. Paid quarterly" hint={autoHint("annualMgmtFeePct",ar?"سنوي · من صافي الأصول":"Annual · based on NAV")}><Inp type="number" value={cfg.annualMgmtFeePct} onChange={v=>upCfg({annualMgmtFeePct:v})} /></FL>
              <FL label={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} tip="أساس حساب رسوم الإدارة:\n- صافي الأصول (NAV): القيمة الصافية للصندوق\n- CAPEX تراكمي: المبالغ المنفذة فعلياً\n- تكلفة التطوير: إجمالي التكلفة\n- رأس المال: الملكية الإجمالية" hint={ar?"التلقائي: صافي الأصول":"default: NAV"}><Drp lang={lang} value={cfg.mgmtFeeBase||"nav"} onChange={v=>upCfg({mgmtFeeBase:v})} options={[{value:"nav",en:"Fund NAV (default)",ar:"صافي أصول الصندوق (تلقائي)"},{value:"deployed",en:"Deployed CAPEX",ar:"CAPEX المنفذ"},{value:"devCost",en:"Dev Cost",ar:"تكلفة التطوير"},{value:"equity",en:"Equity",ar:"رأس المال"}]} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"سقف الإدارة/سنة":"Mgmt Cap/yr"} tip="الحد الأقصى لرسوم الإدارة سنوياً. 0 = بدون سقف\nMax annual management fee. 0 = no cap" hint={autoHint("mgmtFeeCapAnnual",ar?"حد أقصى سنوي · 0 = بدون سقف":"Max annual · 0 = no cap")}><Inp type="number" value={cfg.mgmtFeeCapAnnual} onChange={v=>upCfg({mgmtFeeCapAnnual:v})} /></FL>
              <FL label={ar?"رسوم الحفظ/سنة":"Custody/yr"} tip="رسوم سنوية لأمين الحفظ. تُدفع نصف سنوي\nAnnual custody fee. Paid semi-annually" hint={autoHint("custodyFeeAnnual",ar?"سنوي · نصف سنوي":"Annual · semi-annual")}><Inp type="number" value={cfg.custodyFeeAnnual} onChange={v=>upCfg({custodyFeeAnnual:v})} /></FL>
              <FL label={ar?"مراجع حسابات/سنة":"Auditor/yr"} tip="أتعاب سنوية لمراجع الحسابات. تُدفع نصف سنوي بعد كل تقييم\nAnnual auditor fee. Paid semi-annually after each valuation" hint={autoHint("auditorFeeAnnual",ar?"سنوي":"Annual")}><Inp type="number" value={cfg.auditorFeeAnnual} onChange={v=>upCfg({auditorFeeAnnual:v})} /></FL>
              <FL label={ar?"أتعاب المشغل %":"Operator Fee %"} tip="أتعاب سنوية لمشغل المشروع. تُحسب كنسبة من حجم الأصول المنفذة. تبدأ بعد انتهاء البناء تلقائياً للمشاريع التأجيرية\nAnnual operator fee as % of completed asset value. Starts after construction. Auto-applied for rental projects" hint={autoHint("operatorFeePct",ar?"سنوي · تأجير فقط":"Annual · rental only")}><Inp type="number" value={cfg.operatorFeePct} onChange={v=>upCfg({operatorFeePct:v})} step={0.01} /></FL>
              <FL label={ar?"سقف المشغل/سنة":"Operator Cap/yr"} tip="الحد الأقصى لأتعاب المشغل سنوياً. 0 = بدون سقف\nMax annual operator fee. 0 = no cap" hint={autoHint("operatorFeeCap",ar?"حد أقصى سنوي":"Max annual")}><Inp type="number" value={cfg.operatorFeeCap} onChange={v=>upCfg({operatorFeeCap:v})} /></FL>
              <FL label={ar?"مصروفات أخرى %":"Misc. Expenses %"} tip="مصروفات متنوعة (تقييم، رقابة شرعية، مجلس إدارة، وغيرها). تُحسب كنسبة من إجمالي الأصول وتُدفع مرة واحدة عند بداية الصندوق\nMiscellaneous expenses (valuation, Sharia, board, etc.). One-time at fund start as % of total assets" hint={autoHint("miscExpensePct",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.miscExpensePct} onChange={v=>upCfg({miscExpensePct:v})} step={0.1} /></FL>
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8,gridColumn:"1/-1"}} />
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"مرتبطة بالبناء":"Construction-linked"}</div>
            <FL label={ar?"رسوم التطوير %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية (عقد المقاول). تُدفع متزامنة مع مستخلصات المقاول\nDeveloper fee as % of construction costs. Paid with contractor draws" hint={autoHint("developerFeePct",ar?"مع مستخلصات البناء":"With construction draws")}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>
          </>;
          if (isFundMode) return <FL label={ar?"رسوم التطوير %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية (عقد المقاول). تُدفع متزامنة مع مستخلصات المقاول\nDeveloper fee as % of construction costs. Paid with contractor draws" hint={autoHint("developerFeePct",ar?"مع مستخلصات البناء":"With construction draws")}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>;
          // Debt + Equity mode (not fund)
          return <FL label={ar?"رسوم التطوير %":"Dev Fee %"} tip="أتعاب المطور كنسبة من CAPEX. عادة 3-7%\nDeveloper fee as % of CAPEX. Usually 3-7%"><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>;
        })()}</AB>

        </SecWrap>
        </div>;
      })()}


    {/* ═══ FINANCING RESULTS (KPIs + tables) ═══ */}
    {!f ? (
      <div style={{textAlign:"center",padding:32,color:"#9ca3af"}}>{ar?"اضبط إعدادات التمويل أعلاه":"Configure financing settings above"}</div>
    ) : (<>

    {/* ── Collapsible Section Helper ── */}
    {(() => {
      const Sec = ({id, icon, title, titleAr, color, children, alwaysOpen, badge}) => {
        const open = alwaysOpen || isOpen(id);
        return <div style={{background:"#fff",borderRadius:10,border:`1px solid ${open?color+"33":"#e5e7ec"}`,marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
          <div onClick={alwaysOpen?undefined:()=>toggle(id)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:alwaysOpen?"default":"pointer",background:open?color+"08":"#f8f9fb",borderBottom:open?`1px solid ${color}22`:"none",userSelect:"none"}}>
            <span style={{fontSize:14}}>{icon}</span>
            <span style={{fontSize:13,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?titleAr:title}</span>
            {badge && <span style={{fontSize:10,fontWeight:600,color:color,background:color+"18",padding:"2px 8px",borderRadius:10}}>{badge}</span>}
            {!alwaysOpen && <span style={{fontSize:11,color:"#9ca3af",transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>{open?"▼":"▶"}</span>}
          </div>
          {open && <div style={{padding:"12px 16px",animation:"zanSlide 0.15s ease"}}>{children}</div>}
        </div>;
      };

      // Get waterfall for selected phase
      const w = (isSinglePhase && phaseWaterfalls?.[singlePhaseName]) ? phaseWaterfalls[singlePhaseName] : waterfall;
      const isFund = cfg.finMode === "fund";
      const isBank = cfg.finMode === "debt" || cfg.finMode === "bank100";
      const isSelf = cfg.finMode === "self";

      // Fee totals from waterfall (if available)
      const feeData = w ? {
        sub: (w.feeSub||[]).reduce((a,b)=>a+b,0),
        mgmt: (w.feeMgmt||[]).reduce((a,b)=>a+b,0),
        custody: (w.feeCustody||[]).reduce((a,b)=>a+b,0),
        dev: (w.feeDev||[]).reduce((a,b)=>a+b,0),
        struct: (w.feeStruct||[]).reduce((a,b)=>a+b,0),
        preEst: (w.feePreEst||[]).reduce((a,b)=>a+b,0),
        spv: (w.feeSpv||[]).reduce((a,b)=>a+b,0),
        auditor: (w.feeAuditor||[]).reduce((a,b)=>a+b,0),
        operator: (w.feeOperator||[]).reduce((a,b)=>a+b,0),
        misc: (w.feeMisc||[]).reduce((a,b)=>a+b,0),
        total: w.totalFees || 0,
        unfunded: (w.unfundedFees||[]).reduce((a,b)=>a+b,0),
      } : null;

      // Total financing cost = interest (includes upfront fee) + fund fees
      const totalFinCost = f.totalInterest + (feeData ? feeData.total : 0);
      const finCostPct = f.devCostInclLand > 0 ? totalFinCost / f.devCostInclLand : 0;

      // Stable income for yield
      const stableIncome = pc.income.find((v,i) => i > (f.constrEnd||0) && v > 0) || 0;
      const cashOnCash = f.totalEquity > 0 && stableIncome > 0 ? stableIncome / f.totalEquity : 0;

      return <>
      {/* LP = 0 warning - only relevant for fund/jv where LP is expected */}
      {f.lpEquity === 0 && (project.finMode === "fund" || project.finMode === "jv") && (
        <div style={{background:"#fef3c7",borderRadius:8,border:"1px solid #fde68a",padding:"12px 16px",marginBottom:14,fontSize:12,color:"#92400e"}}>
          <strong>⚠ {ar?"LP Equity = صفر":"LP Equity = 0"}</strong><br/>
          {ar ? "لا يوجد مستثمرين (LP). لتفعيل LP: فعّل رسملة حق الانتفاع أو أضف استثمار أتعاب التطوير أو استثمار نقدي" : "No investor equity. Enable Leasehold Capitalization, invest dev fee, or add cash investment."}
        </div>
      )}

      {/* ═══ SECTION 1: KEY METRICS (always open) ═══ */}
      <Sec id="kpi" icon="📊" title="Key Metrics" titleAr="المؤشرات الرئيسية" color="#2563eb" alwaysOpen>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(145px, 1fr))",gap:10}}>
          <KPI label={ar?"تكلفة التطوير (شامل الأرض)":"Dev Cost (Incl Land)"} value={fmtM(f.devCostInclLand)} sub={cur} color="#1a1d23" />
          <KPI label={ar?"سقف الدين":"Max Debt (LTV)"} value={fmtM(f.maxDebt)} sub={`${cfg.maxLtvPct||70}% LTV`} color="#ef4444" />
          <KPI label={ar?"إجمالي الملكية":"Total Equity"} value={fmtM(f.totalEquity)} sub={fmtPct((1-(f.totalDebt/(f.devCostInclLand||1)))*100)} color="#3b82f6" />
          <KPI label={ar?"IRR بعد التمويل":"Levered IRR"} value={f.leveredIRR!==null?fmtPct(f.leveredIRR*100):"N/A"} color={getMetricColor("IRR",f.leveredIRR)} />
          <KPI label={ar?"إجمالي تكلفة التمويل":"Total Financing Cost"} value={fmtM(totalFinCost)} sub={finCostPct>0?fmtPct(finCostPct*100)+" "+ar?"من التكلفة":"of cost":""} color="#ef4444" tip={ar?"فوائد (شامل رسوم القرض) + رسوم صندوق\nInterest (incl. upfront fee) + Fund Fees":""} />
          <KPI label={ar?"عائد نقدي سنوي":"Cash-on-Cash Yield"} value={cashOnCash>0?fmtPct(cashOnCash*100):"—"} color={cashOnCash>0.08?"#16a34a":"#f59e0b"} />
          {isFund && feeData && <KPI label={ar?"إجمالي الرسوم":"Total Fund Fees"} value={fmtM(feeData.total)} sub={f.devCostInclLand>0?fmtPct(feeData.total/f.devCostInclLand*100)+" "+ar?"من التكلفة":"of cost":""} color="#f59e0b" />}
          <KPI label={ar?"إجمالي الفوائد":"Total Interest"} value={fmtM(f.totalInterest)} sub={cur} color="#ef4444" />
        </div>
      </Sec>

      {/* ═══ SECTION 2: CAPITAL STRUCTURE (collapsible) ═══ */}
      <Sec id="capital" icon="🏗" title="Capital Structure" titleAr="هيكل رأس المال" color="#3b82f6" badge={`${fmtM(f.devCostInclLand)}`}>
        {/* Sources & Uses */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {f.totalDebt > 0 && <><span style={{color:"#6b7080"}}>{ar?"الدين البنكي":"Bank Debt"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.totalDebt)} <span style={{fontSize:10,color:"#9ca3af"}}>{fmtPct((f.totalDebt/(f.devCostInclLand||1))*100)}</span></span></>}
              {f.gpEquity > 0 && <><span style={{color:"#3b82f6"}}>{ar?"حصة المطور (GP)":"GP Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.gpEquity)} <span style={{fontSize:10,color:"#9ca3af"}}>{fmtPct(f.gpPct*100)}</span></span></>}
              {f.lpEquity > 0 && <><span style={{color:"#8b5cf6"}}>{ar?"حصة الممول (LP)":"LP Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.lpEquity)} <span style={{fontSize:10,color:"#9ca3af"}}>{fmtPct(f.lpPct*100)}</span></span></>}
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.totalDebt + f.gpEquity + f.lpEquity)}</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"الاستخدامات":"USES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"#6b7080"}}>{ar?"تكاليف البناء":"Construction Cost"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.devCostExclLand)}</span>
              {f.landCapValue > 0 && <><span style={{color:"#6b7080"}}>{ar?"رسملة الأرض":"Land Capitalization"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.landCapValue)}</span></>}
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.devCostInclLand)}</span>
            </div>
          </div>
        </div>
        {/* Equation */}
        <div style={{background:"#f0f4ff",borderRadius:6,padding:"8px 14px",fontSize:12}}>
          <strong>{ar?"المعادلة":"Equation"}:</strong>{" "}
          {ar?"دين":"Debt"} ({fmtM(f.totalDebt)}) + GP ({fmtM(f.gpEquity)}){f.lpEquity > 0 ? ` + LP (${fmtM(f.lpEquity)})` : ""} = {fmtM(f.totalDebt + f.gpEquity + f.lpEquity)}{" "}
          {Math.abs((f.totalDebt + f.gpEquity + f.lpEquity) - f.devCostInclLand) < 1000
            ? <span style={{color:"#16a34a",fontWeight:600}}>✓</span>
            : <span style={{color:"#ef4444",fontWeight:600}}>✗ ≠ {fmtM(f.devCostInclLand)}</span>}
        </div>
      </Sec>

      {/* ═══ SECTION 3: FINANCING COSTS (collapsible) ═══ */}
      {!isSelf && <Sec id="costs" icon="💸" title={isFund?"Fund Fees & Financing Costs":"Financing Costs"} titleAr={isFund?"رسوم الصندوق وتكاليف التمويل":"تكاليف التمويل"} color="#f59e0b" badge={fmtM(totalFinCost)}>
        <div style={{display:"grid",gridTemplateColumns:isFund&&!isMobile?"1fr 1fr":"1fr",gap:14}}>
          {/* Bank/Debt Costs */}
          {f.totalDebt > 0 && <div>
            <div style={{fontSize:11,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"تكلفة الدين":"DEBT COSTS"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"#6b7080"}}>{ar?"إجمالي الفوائد":"Total Interest"}</span><span style={{textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmt(f.totalInterest)}</span>
              {(f.upfrontFee||0) > 0 && <><span style={{color:"#9ca3af",fontSize:10,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* incl. upfront fee"}: {fmt(f.upfrontFee)} ({cfg.upfrontFeePct||0}%)</span><span></span></>}
              <span style={{color:"#6b7080"}}>{ar?"معدل التمويل":"Finance Rate"}</span><span style={{textAlign:"right",fontWeight:600}}>{cfg.financeRate||0}%</span>
              <span style={{color:"#6b7080"}}>{ar?"المدة":"Tenor"}</span><span style={{textAlign:"right",fontWeight:500}}>{cfg.loanTenor} {ar?"سنة":"yrs"} ({cfg.debtGrace} {ar?"سماح":"grace"})</span>
              <span style={{color:"#6b7080"}}>{ar?"السداد يبدأ":"Repay Starts"}</span><span style={{textAlign:"right",fontWeight:500}}>{sy + f.repayStart}</span>
              <span style={{color:"#6b7080"}}>{ar?"نوع السداد":"Repay Type"}</span><span style={{textAlign:"right",fontWeight:500}}>{cfg.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700,color:"#ef4444"}}>{ar?"إجمالي تكلفة الدين":"Total Debt Cost"}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700,color:"#ef4444"}}>{fmt(f.totalInterest)}</span>
            </div>
          </div>}

          {/* Fund Fees */}
          {isFund && feeData && <div>
            <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fde68a"}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {[
                {l:ar?"اكتتاب":"Subscription",v:feeData.sub,pct:cfg.subscriptionFeePct,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"إدارة":"Management",v:feeData.mgmt,pct:cfg.annualMgmtFeePct,hint:ar?"سنوي":"annual"},
                {l:ar?"حفظ":"Custody",v:feeData.custody,hint:ar?"سنوي":"annual"},
                {l:ar?"تطوير":"Developer Fee",v:feeData.dev,pct:cfg.developerFeePct,hint:ar?"مع البناء":"with constr."},
                {l:ar?"هيكلة":"Structuring",v:feeData.struct,pct:cfg.structuringFeePct,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"ما قبل التأسيس":"Pre-Establishment",v:feeData.preEst,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"إنشاء SPV":"SPV Setup",v:feeData.spv,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"مراجع حسابات":"Auditor",v:feeData.auditor,hint:ar?"سنوي":"annual"},
                {l:ar?"أتعاب المشغل":"Operator Fee",v:feeData.operator,pct:cfg.operatorFeePct,hint:ar?"سنوي · بعد البناء":"annual · post-constr."},
                {l:ar?"مصروفات أخرى":"Misc. Expenses",v:feeData.misc,pct:cfg.miscExpensePct,hint:ar?"مرة واحدة":"one-time"},
              ].filter(x=>x.v>0).map((x,i)=>[
                <span key={i+"l"} style={{color:"#6b7080"}}>{x.l} <span style={{fontSize:9,color:"#b0b5c0"}}>{x.hint}</span></span>,
                <span key={i+"v"} style={{textAlign:"right",fontWeight:500}}>{fmt(x.v)} {x.pct?<span style={{fontSize:10,color:"#9ca3af"}}>{x.pct}%</span>:""}</span>
              ])}
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700,color:"#f59e0b"}}>{ar?"إجمالي الرسوم":"Total Fees"}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700,color:"#f59e0b"}}>{fmt(feeData.total)}</span>
              {feeData.unfunded > 0 && <><span style={{color:"#92400e",fontSize:11}}>{ar?"رسوم ممولة من Equity":"Equity-Funded Fees"}</span><span style={{textAlign:"right",fontWeight:500,fontSize:11,color:"#92400e"}}>{fmt(feeData.unfunded)}</span></>}
            </div>
          </div>}
        </div>

        {/* Total Financing Cost Summary */}
        <div style={{marginTop:12,background:"#fefce8",borderRadius:6,padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr auto",gap:"6px 20px",fontSize:12,maxWidth:520}}>
          <span style={{fontWeight:700}}>{ar?"إجمالي تكلفة التمويل الكلية":"TOTAL FINANCING COST"}</span>
          <span style={{textAlign:"right",fontWeight:800,fontSize:14,color:"#ef4444"}}>{fmt(totalFinCost)} {cur}</span>
          <span style={{fontSize:11,color:"#6b7080"}}>{ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost"}</span>
          <span style={{textAlign:"right",fontWeight:600,color:"#a16207"}}>{fmtPct(finCostPct*100)}</span>
        </div>
      </Sec>}

      {/* ═══ SECTION 4: DEBT SERVICE & DSCR (collapsible) ═══ */}
      {f.totalDebt > 0 && <Sec id="dscr" icon="🏦" title="Debt Service & DSCR" titleAr="خدمة الدين و DSCR" color="#3b82f6">
        {/* Debt Structure Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,fontSize:12,marginBottom:14}}>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"الهيكل":"Structure"}</span><strong>{cfg.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</strong></div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"المدة":"Tenor"}</span><strong>{cfg.loanTenor} {ar?"سنة":"yrs"}</strong> <span style={{fontSize:10,color:"#9ca3af"}}>({cfg.debtGrace} {ar?"سماح":"grace"} + {f.repayYears} {ar?"سداد":"repay"})</span></div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"بداية السداد":"Repay Starts"}</span><strong>{sy + f.repayStart}</strong></div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"التخارج":"Exit"}</span><strong>{f.exitYear}</strong> ({cfg.exitMultiple}x)</div>
        </div>
        {/* DSCR pills */}
        <div style={{fontSize:12,fontWeight:600,marginBottom:8}}><Tip text={ar?"صافي الدخل التشغيلي / خدمة الدين. البنوك تطلب 1.25x كحد أدنى":"NOI / Debt Service. Banks require min 1.25x"}>DSCR</Tip></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {years.filter(y=>f.dscr[y]!==null).map(y=>{
            const v = f.dscr[y];
            const bg = v >= 1.5 ? "#dcfce7" : v >= 1.2 ? "#fef9c3" : v >= 1.0 ? "#ffedd5" : "#fef2f2";
            const fg = v >= 1.5 ? "#16a34a" : v >= 1.2 ? "#a16207" : v >= 1.0 ? "#c2410c" : "#ef4444";
            return <div key={y} style={{textAlign:"center",padding:"4px 8px",borderRadius:4,background:bg,minWidth:50}}>
              <div style={{fontSize:10,color:"#6b7080"}}>{sy+y}</div>
              <div style={{fontSize:13,fontWeight:700,color:fg}}>{v.toFixed(2)}x</div>
            </div>;
          })}
        </div>
        <div style={{fontSize:10,color:"#9ca3af"}}>🟢 ≥ 1.5x | 🟡 ≥ 1.2x | 🟠 ≥ 1.0x | 🔴 &lt; 1.0x</div>
      </Sec>}

      {/* ═══ SECTION 5: INTEGRATED CASH FLOW (always open) ═══ */}
      <Sec id="cf" icon="📋" title="Integrated Cash Flow" titleAr="التدفق النقدي المتكامل" color="#1e3a5f" alwaysOpen>
        <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:10}}>
          <div style={{flex:1,fontSize:11,color:"#6b7080"}}>{ar?"التدفق النقدي بعد خدمة الدين والرسوم":"Cash flow after debt service and fees"}</div>
          <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:12}}>
            {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"years"}</option>)}
          </select>
        </div>

        <div style={{borderRadius:8,border:"2px solid #1e3a5f",overflow:"hidden"}}>
          <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
            <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:isMobile?110:180}}>{ar?"البند":"Line Item"}</th>
            <th style={{...thSt,textAlign:"right"}}>{ar?"الإجمالي":"Total"}</th>
            {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:80}}>{ar?`سنة ${y+1}`:`Yr ${y+1}`}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
          </tr></thead><tbody>
            {/* ── Project CF ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التدفق التشغيلي":"PROJECT CASH FLOW"}{isFiltered ? ` — ${activePh.join(", ")}` : ""}</td></tr>
            <CFRow label={ar?"الإيرادات":"Revenue"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
            <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pc.landRent} total={pc.totalLandRent} color="#ef4444" negate />
            <CFRow label={ar?"(-) تكاليف التطوير":"(-) CAPEX"} values={pc.capex} total={pc.totalCapex} color="#ef4444" negate />
            {(() => { const unlev = new Array(h).fill(0); for(let y=0;y<h;y++) unlev[y]=(pc.income[y]||0)-(pc.landRent[y]||0)-(pc.capex[y]||0); return <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered Net CF"} values={unlev} total={unlev.reduce((a,b)=>a+b,0)} bold />; })()}

            {/* ── Financing ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#3b82f6",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التمويل":"FINANCING"}</td></tr>
            <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={f.equityCalls} total={f.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" />
            <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={f.drawdown} total={f.totalDebt} color="#3b82f6" />
            <CFRow label={ar?"(-) سداد أصل الدين":"(-) Repayment"} values={f.repayment} total={f.repayment.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
            <CFRow label={ar?"(-) تكلفة التمويل":"(-) Interest / Profit Cost"} values={f.interest} total={f.totalInterest} color="#ef4444" negate />
            <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={f.debtService} total={f.debtService.reduce((a,b)=>a+b,0)} color="#dc2626" negate bold />
            {/* Debt balance */}
            <tr style={{background:"#f0f4ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:400,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>{ar?"رصيد الدين (بداية)":"Debt Balance (Open)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{f.debtBalOpen[y]===0?"—":fmt(f.debtBalOpen[y])}</td>)}
            </tr>
            <tr style={{background:"#f0f4ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:500,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>{ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
            </tr>

            {/* ── Fund Fees (if fund mode and waterfall available) ── */}
            {isFund && w && <>
              <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#f59e0b",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"رسوم الصندوق":"FUND FEES"}</td></tr>
              {(w.feeSub||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) اكتتاب":"(-) Subscription"} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeMgmt||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إدارة":"(-) Management"} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeCustody||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) حفظ":"(-) Custody"} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeDev||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) تطوير":"(-) Developer Fee"} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeStruct||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) هيكلة":"(-) Structuring"} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feePreEst||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) ما قبل التأسيس":"(-) Pre-Establishment"} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeSpv||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إنشاء SPV":"(-) SPV Setup"} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeAuditor||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مراجع حسابات":"(-) Auditor"} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeOperator||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) أتعاب المشغل":"(-) Operator Fee"} values={w.feeOperator} total={(w.feeOperator||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeMisc||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مصروفات أخرى":"(-) Misc. Expenses"} values={w.feeMisc} total={(w.feeMisc||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              <CFRow label={ar?"= إجمالي الرسوم":"= Total Fees"} values={w.fees||[]} total={w.totalFees||0} color="#f59e0b" negate bold />
              {(w.unfundedFees||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
            </>}

            {/* ── Exit ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#8b5cf6",background:"#faf5ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التخارج":"EXIT"}</td></tr>
            <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={f.exitProceeds} total={f.exitProceeds.reduce((a,b)=>a+b,0)} color="#8b5cf6" />

            {/* ── Net Result ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb"}}>{ar?"النتيجة":"NET RESULT"}</td></tr>
            <CFRow label={ar?"= صافي التدفق الممول":"= Levered Net CF"} values={f.leveredCF} total={f.leveredCF.reduce((a,b)=>a+b,0)} bold />
            {(() => { let cum=0; return <tr style={{background:"#fffbeb"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:isMobile?110:180}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
              <td style={tdN}></td>
              {years.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
            </tr>; })()}
            {/* DSCR */}
            <tr style={{background:"#fefce8"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#fefce8",zIndex:1,fontWeight:600,fontSize:11,color:"#a16207"}}>DSCR</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.5?"#16a34a":f.dscr[y]>=1.2?"#a16207":"#ef4444",fontWeight:600,fontSize:11}}>{f.dscr[y]===null?"—":f.dscr[y].toFixed(2)+"x"}</td>)}
            </tr>
          </tbody></table></div>
        </div>
      </Sec>
      </>;
    })()}
    </>)}

    {/* ═══ LEVERED CF TRACER — formula transparency like Excel ═══ */}
    {f && f.leveredCF && (() => {
      const [tracerOpen, setTracerOpen] = useState(false);
      const c = pc; // phase or consolidated
      const adjLR = ir?.adjustedLandRent || c.landRent;
      const isSelfMode = f.mode === "self";
      const exitYrIdx = f.exitYear ? f.exitYear - sy : -1;
      const fSold = (cfg.exitStrategy || "sale") !== "hold" && exitYrIdx >= 0 && exitYrIdx < h;
      const tracerYears = Array.from({length:Math.min(15,h)},(_,i)=>i);
      const tdS = {padding:"3px 6px",fontSize:10,fontFamily:"monospace",textAlign:"right",borderBottom:"1px solid #f0f1f5",whiteSpace:"nowrap"};
      const tdH = {...tdS,fontWeight:700,background:"#f8f9fb",textAlign:"center",fontSize:9,position:"sticky",top:0,zIndex:1};
      const tdL = {...tdS,textAlign:"left",fontWeight:600,position:"sticky",left:0,background:"#fff",zIndex:1,minWidth:isMobile?110:180};
      const fmtC = v => v === 0 ? "—" : (v > 0 ? "+" : "") + (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+"M" : Math.abs(v) >= 1000 ? (v/1000).toFixed(0)+"K" : v.toFixed(0));
      const rowColor = (v) => v > 0 ? "#16a34a" : v < 0 ? "#ef4444" : "#9ca3af";

      return <div style={{marginTop:20}}>
        <div onClick={()=>setTracerOpen(!tracerOpen)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"linear-gradient(135deg,#1e3a5f,#2563eb)",borderRadius:10,color:"#fff",userSelect:"none"}}>
          <span style={{fontSize:16}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,flex:1}}>{ar?"تتبع التدفق الممول — شفافية كاملة":"Levered CF Tracer — Full Transparency"}</span>
          <span style={{fontSize:10,opacity:0.7}}>{ar?"مثل خلية إكسل — شوف من وين جاي كل رقم":"Like an Excel cell — see where every number comes from"}</span>
          <span style={{fontSize:12}}>{tracerOpen?"▼":"▶"}</span>
        </div>
        {tracerOpen && <div style={{border:"1px solid #e5e7ec",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"auto",maxHeight:600}}>
          {/* FORMULA */}
          <div style={{padding:"12px 16px",background:"#f0f4ff",borderBottom:"2px solid #2563eb"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1e3a5f",marginBottom:6}}>{ar?"المعادلة:":"FORMULA:"}</div>
            <div style={{fontFamily:"monospace",fontSize:12,color:"#1e3a5f",lineHeight:1.8}}>
              {isSelfMode
                ? <>{ar?"التدفق الممول":"Levered CF"} = <span style={{color:"#16a34a"}}>{ar?"الدخل":"Income"}</span> − <span style={{color:"#ef4444"}}>{ar?"إيجار أرض (معدّل)":"Adj Land Rent"}</span> − <span style={{color:"#ef4444"}}>CAPEX</span> + <span style={{color:"#16a34a"}}>{ar?"منحة":"Grant"}</span> + <span style={{color:"#16a34a"}}>{ar?"خصم رسوم":"Fee Rebate"}</span> − <span style={{color:"#ef4444"}}>{ar?"رسم المطور":"Dev Fee"}</span> + <span style={{color:"#16a34a"}}>{ar?"تخارج":"Exit"}</span></>
                : <>{ar?"التدفق الممول":"Levered CF"} = <span style={{color:"#16a34a"}}>{ar?"الدخل":"Income"}</span> − <span style={{color:"#ef4444"}}>{ar?"إيجار أرض (معدّل)":"Adj Land Rent"}</span> − <span style={{color:"#ef4444"}}>CAPEX</span> + <span style={{color:"#16a34a"}}>{ar?"منحة":"Grant"}</span> + <span style={{color:"#16a34a"}}>{ar?"خصم رسوم":"Fee Rebate"}</span> − <span style={{color:"#ef4444"}}>{ar?"خدمة دين (معدّلة)":"Adj Debt Service"}</span> + <span style={{color:"#16a34a"}}>{ar?"سحب":"Drawdown"}</span> + <span style={{color:"#16a34a"}}>{ar?"تخارج":"Exit"}</span> − <span style={{color:"#ef4444"}}>{ar?"رسم المطور":"Dev Fee"}</span></>
              }
            </div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:6}}>
              {ar?"المصدر: financing.js سطر ":"Source: financing.js L"}{isSelfMode?"128-177":"545-553"} → {ar?"يُخزن بـ":"stored in "} f.leveredCF → {ar?"يُقرأ مباشرة بكل الصفحات":"read directly by all views"}
            </div>
          </div>
          {/* TABLE */}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead>
              <tr>
                <th style={tdH}>{ar?"المكوّن":"Component"}</th>
                <th style={tdH}>{ar?"المصدر":"Source"}</th>
                {tracerYears.map(y=><th key={y} style={tdH}>{sy+y}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"الدخل":"Income"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>c.income</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#16a34a"}}>{fmtC(c.income[y])}</td>)}</tr>
              <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) إيجار أرض":"(−) Land Rent"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>{ir?.adjustedLandRent?"ir.adjLR":"c.landRent"}</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-adjLR[y])}</td>)}</tr>
              <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) CAPEX":"(−) CAPEX"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>c.capex</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-c.capex[y])}</td>)}</tr>
              {(ir?.capexGrantSchedule||[]).some(v=>v>0) && <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"(+) منحة CAPEX":"(+) CAPEX Grant"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>ir.capexGrant</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#16a34a"}}>{fmtC(ir?.capexGrantSchedule?.[y]||0)}</td>)}</tr>}
              {(ir?.feeRebateSchedule||[]).some(v=>v>0) && <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"(+) خصم رسوم":"(+) Fee Rebate"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>ir.feeRebate</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#16a34a"}}>{fmtC(ir?.feeRebateSchedule?.[y]||0)}</td>)}</tr>}
              {!isSelfMode && <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) خدمة الدين":"(−) Debt Service"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>f.debtService</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-(f.debtService[y]||0))}</td>)}</tr>}
              {!isSelfMode && <tr><td style={{...tdL,color:"#3b82f6"}}>{ar?"(+) سحب القرض":"(+) Drawdown"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>f.drawdown</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#3b82f6"}}>{fmtC(f.drawdown[y]||0)}</td>)}</tr>}
              <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>f.exitProceeds</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:f.exitProceeds[y]>0?"#16a34a":"#9ca3af"}}>{fmtC(f.exitProceeds[y]||0)}</td>)}</tr>
              <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) رسم المطور":"(−) Dev Fee"}</td><td style={{...tdS,fontSize:9,color:"#9ca3af"}}>f.devFeeSchedule</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-(f.devFeeSchedule?.[y]||0))}</td>)}</tr>
              {/* RESULT */}
              <tr style={{background:"#1e3a5f"}}>
                <td style={{...tdL,background:"#1e3a5f",color:"#fff",fontWeight:700,borderTop:"2px solid #2563eb"}}>{ar?"= التدفق الممول":"= Levered CF"}</td>
                <td style={{...tdS,background:"#1e3a5f",color:"#93c5fd",fontSize:9,borderTop:"2px solid #2563eb"}}>f.leveredCF</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,background:"#1e3a5f",color:f.leveredCF[y]>0?"#86efac":f.leveredCF[y]<0?"#fca5a5":"#6b7280",fontWeight:700,borderTop:"2px solid #2563eb"}}>{fmtC(f.leveredCF[y])}</td>)}
              </tr>
              {/* VERIFICATION */}
              <tr style={{background:"#fefce8"}}>
                <td style={{...tdL,background:"#fefce8",color:"#92400e",fontSize:9}}>{ar?"✓ تحقق (حساب مستقل)":"✓ Verify (independent calc)"}</td>
                <td style={{...tdS,background:"#fefce8",fontSize:10,color:"#9ca3af"}}>{ar?"يدوي":"manual"}</td>
                {tracerYears.map(y=>{
                  let exp;
                  if (fSold && y > exitYrIdx) { exp = 0; }
                  else if (isSelfMode) {
                    const adjNetCF = ir?.adjustedNetCF?.[y] ?? (c.income[y] - c.landRent[y] - c.capex[y]);
                    exp = adjNetCF - (f.devFeeSchedule?.[y]||0) + (f.exitProceeds[y]||0);
                  } else {
                    exp = c.income[y] - adjLR[y] - c.capex[y] + (ir?.capexGrantSchedule?.[y]||0) + (ir?.feeRebateSchedule?.[y]||0) - (f.debtService[y]||0) + (f.drawdown[y]||0) + (f.exitProceeds[y]||0) - (f.devFeeSchedule?.[y]||0);
                  }
                  const match = Math.abs((f.leveredCF[y]||0) - exp) < 1;
                  return <td key={y} style={{...tdS,background:match?"#fefce8":"#fef2f2",color:match?"#16a34a":"#ef4444",fontWeight:700,fontSize:9}}>{match?"✓":"✗ "+fmtC(exp)}</td>;
                })}
              </tr>
              {/* CUMULATIVE */}
              {(() => { let cum = 0; return <tr style={{background:"#f0f4ff"}}>
                <td style={{...tdL,background:"#f0f4ff",color:"#2563eb",fontWeight:600}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
                <td style={{...tdS,background:"#f0f4ff"}}></td>
                {tracerYears.map(y => { cum += f.leveredCF[y]||0; return <td key={y} style={{...tdS,background:"#f0f4ff",color:cum>0?"#16a34a":"#ef4444",fontWeight:600}}>{fmtC(cum)}</td>; })}
              </tr>; })()}
            </tbody>
          </table>
          {/* FOOTER */}
          <div style={{padding:"10px 16px",background:"#f8f9fb",borderTop:"1px solid #e5e7ec",display:"flex",gap:20,flexWrap:"wrap",fontSize:10,color:"#6b7080"}}>
            <span>IRR: <strong style={{color:"#2563eb"}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(2)+"%":"N/A"}</strong> <span style={{fontSize:9}}>(calcIRR(f.leveredCF))</span></span>
            <span>{ar?"مجموع":"Sum"}: <strong>{fmtC(f.leveredCF.reduce((a,b)=>a+b,0))}</strong></span>
            {fSold && <span>{ar?"تخارج سنة":"Exit Yr"}: <strong>{f.exitYear}</strong> ({ar?"بعدها = صفر":"post-exit = 0"})</span>}
            <span style={{marginInlineStart:"auto",fontSize:9,color:"#9ca3af"}}>{ar?"كل الأرقام من f.* (financing engine) مباشرة — لا إعادة حساب":"All numbers from f.* (financing engine) directly — no recomputation"}</span>
          </div>
        </div>}
      </div>;
    })()}

    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);

export { FieldGroup, FL, Inp, Drp };
export default FinancingView;
