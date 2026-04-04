// Extracted from App.jsx lines 1271-2252
// ResultsView router + SelfResultsView + BankResultsView + form helpers

import { useState, useEffect, useMemo, useRef, memo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { btnS, btnPrim, sideInputStyle, tblStyle, thSt, tdSt, tdN } from "../shared/styles";
import { FINANCING_FIELDS, getPhaseFinancing, hasPerPhaseFinancing } from "../../engine/phases";
import { calcIRR, calcNPV } from "../../engine/math.js";
import WaterfallView, { ExitAnalysisPanel, IncentivesImpact, HelpLink, EducationalModal } from "./WaterfallView";
import { getMetricColor } from "../../utils/metricColor.js";

function ResultsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand, kpiPhase, setKpiPhase }) {
  const ar = lang === "ar";
  if (!project || !results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:12,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>📊</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1a1d23",marginBottom:6}}>{ar?"أضف أصول لرؤية النتائج":"Add Assets to See Results"}</div>
      <div style={{fontSize:12,color:"#6b7080",maxWidth:360,lineHeight:1.6}}>{ar?"بمجرد إضافة أصول سترى IRR وNPV والتدفقات النقدية التفصيلية":"Once you add assets, you'll see IRR, NPV, and detailed cash flow analysis"}</div>
    </div>
  );

  const mode = project.finMode || financing?.mode || "self";

  // Detect mixed financing modes across phases
  const phaseFinModes = (project.phases || []).map(p => p.financing?.finMode || mode);
  const hasFundPhase = phaseFinModes.some(m => m === "fund" || m === "hybrid" || m === "incomeFund" || m === "jv");
  const hasBankPhase = phaseFinModes.some(m => m === "debt" || m === "bank100");
  const isMixedMode = hasFundPhase && hasBankPhase;

  // Mixed mode: show BOTH views with labels
  if (isMixedMode) {
    const fundPhaseNames = (project.phases || []).filter((p, i) => {
      const m = p.financing?.finMode || mode;
      return m === "fund" || m === "hybrid" || m === "incomeFund" || m === "jv";
    }).map(p => p.name);
    const bankPhaseNames = (project.phases || []).filter((p, i) => {
      const m = p.financing?.finMode || mode;
      return m === "debt" || m === "bank100";
    }).map(p => p.name);

    return (
      <div>
        {/* Banner explaining mixed mode */}
        <div style={{margin:"0 0 16px",padding:"10px 14px",borderRadius:8,background:"#fef3c7",border:"1px solid #fbbf24",fontSize:12,color:"#92400e",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span>{ar
            ? `مشروع متعدد الأنماط: ${bankPhaseNames.join("، ")} (بنكي) + ${fundPhaseNames.join("، ")} (صندوق) — الرسوم والتوزيعات تخص المراحل الصندوقية فقط`
            : `Mixed financing: ${bankPhaseNames.join(", ")} (Bank) + ${fundPhaseNames.join(", ")} (Fund) — fees & distributions apply only to fund phases`
          }</span>
        </div>
        {/* Bank phases results */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1e40af",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <span>🏦</span> {ar?`نتائج المالك — ${bankPhaseNames.join("، ")}`:`Developer Results — ${bankPhaseNames.join(", ")}`}
          </div>
          <BankResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} kpiPhase={kpiPhase} setKpiPhase={setKpiPhase} />
        </div>
        {/* Fund phases results */}
        {waterfall && (
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#7c3aed",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <span>📊</span> {ar?`نتائج الصندوق — ${fundPhaseNames.join("، ")}`:`Fund Results — ${fundPhaseNames.join(", ")}`}
            </div>
            <WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} kpiPhase={kpiPhase} setKpiPhase={setKpiPhase} />
          </div>
        )}
      </div>
    );
  }

  // ── INCOME FUND: Dedicated view with distribution yield focus ──
  if (mode === "incomeFund") {
    return <IncomeFundResultsView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── FUND MODE: WaterfallView (incentives injected inside) ──
  if (mode === "fund" || mode === "hybrid" || mode === "jv") {
    return <WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} kpiPhase={kpiPhase} setKpiPhase={setKpiPhase} />;
  }

  // ── BANK DEBT / BANK 100%: Full bank results ──
  if (mode === "debt" || mode === "bank100") {
    return <BankResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} kpiPhase={kpiPhase} setKpiPhase={setKpiPhase} />;
  }

  // ── SELF: Full self-funded results ──
  return <SelfResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} kpiPhase={kpiPhase} setKpiPhase={setKpiPhase} />;
}

// ═══════════════════════════════════════════════════════════════
// SELF-FUNDED RESULTS VIEW
// ═══════════════════════════════════════════════════════════════
function SelfResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand, kpiPhase, setKpiPhase }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [showChart, setShowChart] = useState(false);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  const [kpiOpen, setKpiOpen] = useState({proj:false,cap:false,ret:false});
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowChart(expand); setKpiOpen({proj:expand,cap:expand,ret:expand}); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);

  // ── Phase filter ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => {
    setSelectedPhases(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
      // Sync KPI bar: single phase → show that phase, otherwise "all"
      if (setKpiPhase) setKpiPhase(next.length === 1 ? next[0] : "all");
      return next;
    });
  };
  // Sync from KPI bar dropdown to local phase selection
  useEffect(() => {
    if (!kpiPhase || allPhaseNames.length <= 1) return;
    if (kpiPhase === "all") { setSelectedPhases([]); }
    else if (allPhaseNames.includes(kpiPhase)) { setSelectedPhases([kpiPhase]); }
  }, [kpiPhase]);

  const h = results.horizon;
  const sy = results.startYear;
  const cur = project.currency || "SAR";
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);

  // ── Filtered consolidated ──
  const c = useMemo(() => {
    if (!isFiltered) return results.consolidated;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return { ...results.consolidated, income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF, 0.10),
    };
  }, [isFiltered, selectedPhases, results, h]);

  // ── Filtered financing ──
  const f = useMemo(() => {
    if (!isFiltered || !phaseFinancings) return financing;
    const pfs = activePh.map(p => phaseFinancings[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.leveredCF) for (let y=0;y<h;y++) leveredCF[y] += pf.leveredCF[y]||0; });
    const exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.exitProceeds) for (let y=0;y<h;y++) exitProceeds[y] += pf.exitProceeds[y]||0; });
    return { ...financing,
      leveredCF, exitProceeds, leveredIRR: calcIRR(leveredCF),
      devCostInclLand: pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0),
      devCostExclLand: pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0),
      totalDebt: pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0),
      totalEquity: pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0),
      landCapValue: pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0),
      constrEnd: Math.max(...pfs.map(pf => pf.constrEnd || 0)),
      exitYear: Math.max(...pfs.map(pf => pf.exitYear || 0)),
    };
  }, [isFiltered, selectedPhases, financing, phaseFinancings, h]);

  const levIRR = f?.leveredIRR ?? c.irr;
  const exitProc = f?.exitProceeds ? f.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const exitYear = f?.exitYear || 0;
  const totalCapex = c.totalCapex;
  const totalIncome = c.totalIncome;
  const devCost = f?.devCostInclLand || totalCapex;
  const levCF = f?.leveredCF || c.netCF;
  const totalLevCF = levCF.reduce((a,b)=>a+b,0);

  // Payback
  const payback = (() => { let cum=0, wasNeg=false; for(let y=0;y<h;y++){cum+=levCF[y]||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return y+1;} return null; })();

  // Simple Return (market convention: ROE / years)
  const totalInvested = Math.abs(levCF.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const simpleROE = totalInvested > 0 ? totalLevCF / totalInvested : 0;
  const investYears = (() => {
    let first = -1, last = 0;
    for (let y = 0; y < h; y++) { if (levCF[y] < 0 && first < 0) first = y; if (levCF[y] > 0) last = y; }
    return Math.max(1, first >= 0 ? last - first + 1 : h);
  })();
  const simpleAnnual = investYears > 0 ? simpleROE / investYears : 0;

  // NOI
  const noiArr = new Array(h).fill(0);
  for (let y=0;y<h;y++) noiArr[y] = (c.income[y]||0) - (c.landRent[y]||0);
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);

  // Yield on cost & stabilized
  const constrEnd = f?.constrEnd || 0;
  const stabIdx = Math.min(constrEnd+2, h-1);
  const stabNOI = noiArr[stabIdx] || 0;
  const yieldOnCost = totalCapex > 0 ? stabNOI / totalCapex : 0;
  const stabIncome = c.income[stabIdx] || 0;

  // Peak capital deployed (max cumulative negative CF)
  let peakCap = 0, cumCF = 0;
  for (let y=0;y<h;y++) { cumCF += levCF[y]||0; if (cumCF < peakCap) peakCap = cumCF; }
  peakCap = Math.abs(peakCap);

  // Capital deployed per year (cumulative CAPEX - cumulative income, floored at 0)
  const capitalDeployed = new Array(h).fill(0);
  let cumCapex=0, cumInc=0;
  for (let y=0;y<h;y++) { cumCapex+=c.capex[y]||0; cumInc+=c.income[y]||0; capitalDeployed[y]=Math.max(0,cumCapex-cumInc); }

  // Incentives
  const ir = incentivesResult;
  const hasIncentives = ir && ((ir.capexGrantTotal||0) > 0 || (ir.landRentSavingTotal||0) > 0 || (ir.feeRebateTotal||0) > 0);
  const incentiveTotal = hasIncentives ? (ir.capexGrantTotal||0)+(ir.landRentSavingTotal||0)+(ir.feeRebateTotal||0) : 0;

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    income: c.income[y]||0,
    capex: c.capex[y]||0,
    net: levCF[y]||0,
    cumCF: (() => { let s=0; for(let i=0;i<=y;i++) s+=levCF[i]||0; return s; })(),
  }));

  // Shared mini-components (same as Bank/Fund KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c:clr,bold:b}) => <><span style={{color:"#6b7080",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:clr||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#9ca3af",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"#f8f9fb"} : {};
    const nc = v => { if(color) return color; return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {allPhaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>{setSelectedPhases([]);if(setKpiPhase)setKpiPhase("all");}} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"#6b7080",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* ═══ EXPANDABLE KPI CARDS: Project | Capital | Returns ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* ── 🏠 Project Card ── */}
      <div style={{background:kpiOpen.proj?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:10,border:kpiOpen.proj?"2px solid #16a34a":"1px solid #86efac",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,proj:!p.proj}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#16a34a",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>🏠</span>
          <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"المشروع":"Project"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.proj?"▲":"▼"}</span>
        </div>
        {!kpiOpen.proj ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"تكلفة":"Cost", fmtM(devCost), "#1a1d23")}
            {badge(ar?"إيرادات":"Revenue", fmtM(totalIncome), "#16a34a")}
            {badge("NOI", fmtM(totalNOI), "#059669")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"التكاليف":"COSTS"} />
            <KR l={ar?"تكلفة التطوير":"Dev Cost"} v={fmtM(devCost)} bold />
            <KR l="CAPEX" v={fmtM(totalCapex)} />
            <KR l={ar?"إيجار الأرض":"Land Rent"} v={fmtM(c.totalLandRent)} c="#ef4444" />
            {f?.landCapValue > 0 && <KR l={ar?"رسملة حق الانتفاع":"Leasehold Cap"} v={fmtM(f.landCapValue)} />}
            <SecHd text={ar?"الإيرادات":"REVENUE"} />
            <KR l={ar?"إجمالي الإيرادات":"Total Revenue"} v={fmtM(totalIncome)} c="#16a34a" bold />
            <KR l={ar?"دخل مستقر (NOI)":"Stabilized NOI"} v={fmt(stabNOI)} c="#059669" />
            <KR l={ar?"عائد على التكلفة":"Yield on Cost"} v={yieldOnCost>0?fmtPct(yieldOnCost*100):"—"} c={yieldOnCost>0.08?"#16a34a":"#f59e0b"} />
            <KR l={ar?"الأفق":"Horizon"} v={`${h} ${ar?"سنة":"yrs"}`} />
            {hasIncentives && !isFiltered && <><SecHd text={ar?"حوافز":"INCENTIVES"} /><KR l={ar?"إجمالي الحوافز":"Total Incentives"} v={fmtM(incentiveTotal)} c="#059669" bold /></>}
          </div>
        )}
      </div>

      {/* ── 💰 Capital Card ── */}
      <div style={{background:kpiOpen.cap?"#fff":"linear-gradient(135deg, #eff6ff, #e0f2fe)",borderRadius:10,border:kpiOpen.cap?"2px solid #2563eb":"1px solid #93c5fd",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,cap:!p.cap}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#2563eb",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>💰</span>
          <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"رأس المال":"Capital"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.cap?"▲":"▼"}</span>
        </div>
        {!kpiOpen.cap ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"مطلوب":"Required", fmtM(devCost), "#2563eb")}
            {badge(ar?"ذروة":"Peak", fmtM(peakCap), "#dc2626")}
            {badge(ar?"استرداد":"Payback", payback?`Yr ${payback}`:"—", "#6366f1")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"الحاجة الرأسمالية":"CAPITAL NEEDS"} />
            <KR l={ar?"إجمالي مطلوب":"Total Required"} v={fmtM(devCost)} c="#2563eb" bold />
            <KR l={ar?"ذروة رأس المال المجمد":"Peak Capital Locked"} v={fmtM(peakCap)} c="#dc2626" bold />
            <KR l={ar?"فترة البناء":"Construction"} v={`${constrEnd+1} ${ar?"سنة":"yrs"}`} />
            <SecHd text={ar?"الاسترداد":"RECOVERY"} />
            <KR l={ar?"فترة الاسترداد":"Payback Period"} v={payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"} c="#2563eb" bold />
            <KR l={ar?"صافي التدفق":"Total Net CF"} v={fmtM(totalLevCF)} c={totalLevCF>0?"#16a34a":"#ef4444"} />
            {exitProc > 0 && <KR l={ar?"عائد التخارج":"Exit Proceeds"} v={fmtM(exitProc)} c="#16a34a" />}
            <SecHd text={ar?"تكلفة الفرصة البديلة":"OPPORTUNITY COST"} />
            <KR l={ar?"لو استثمرت بـ 5% سنوي":"If invested @5%/yr"} v={fmtM(devCost * Math.pow(1.05, payback||10) - devCost)} c="#6b7080" />
            <KR l={ar?"لو استثمرت بـ 8% سنوي":"If invested @8%/yr"} v={fmtM(devCost * Math.pow(1.08, payback||10) - devCost)} c="#6b7080" />
          </div>
        )}
      </div>

      {/* ── 📈 Returns Card ── */}
      <div style={{background:kpiOpen.ret?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.ret?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,ret:!p.ret}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📈</span>
          <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"العوائد":"Returns"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.ret?"▲":"▼"}</span>
        </div>
        {!kpiOpen.ret ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"عائد بسيط":"Simple", simpleROE?fmtPct(simpleROE*100):"—", "#f59e0b")}
            {badge("IRR", levIRR!==null?fmtPct(levIRR*100):"—", getMetricColor("IRR",levIRR))}
            {exitProc>0 && badge(ar?"تخارج":"Exit", fmtM(exitProc), "#16a34a")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"العائد البسيط (عرف السوق)":"SIMPLE RETURN (MARKET CONVENTION)"} />
            <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={simpleROE?fmtPct(simpleROE*100):"N/A"} c="#f59e0b" bold />
            <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={simpleAnnual?fmtPct(simpleAnnual*100):"N/A"} c="#f59e0b" />
            <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${investYears} ${ar?"سنة":"yr"}`} />
            <SecHd text={ar?"المؤشرات الدقيقة":"PRECISE METRICS"} />
            <KR l={ar?"صافي IRR (مركب)":"Net IRR (Compounded)"} v={levIRR!==null?fmtPct(levIRR*100):"N/A"} c={getMetricColor("IRR",levIRR)} bold />
            <KR l={ar?"عائد على التكلفة":"Yield on Cost"} v={yieldOnCost>0?fmtPct(yieldOnCost*100):"—"} c={yieldOnCost>0.08?"#16a34a":"#6b7080"} />
            <KR l={ar?"استرداد":"Payback"} v={payback?`${payback} ${ar?"سنة":"yr"}`:"—"} c="#2563eb" />
            {exitProc>0 && <KR l={ar?"العائد / التكلفة":"Return / Cost"} v={(exitProc/devCost).toFixed(2)+"x"} c={exitProc/devCost>1?"#16a34a":"#ef4444"} bold />}
            <SecHd text="NPV" />
            <KR l="@10%" v={fmtM(calcNPV(levCF,0.10))} />
            <KR l="@12%" v={fmtM(calcNPV(levCF,0.12))} c="#2563eb" bold />
            <KR l="@14%" v={fmtM(calcNPV(levCF,0.14))} />
            <SecHd text={ar?"فحوصات":"CHECKS"} />
            <KR l="IRR > 12%" v={levIRR>0.12?"✅":"❌"} c={levIRR>0.12?"#16a34a":"#ef4444"} />
            <KR l="NPV@12% > 0" v={calcNPV(levCF,0.12)>0?"✅":"❌"} c={calcNPV(levCF,0.12)>0?"#16a34a":"#ef4444"} />
            <KR l={ar?"صافي إيجابي":"Net CF > 0"} v={totalLevCF>0?"✅":"❌"} c={totalLevCF>0?"#16a34a":"#ef4444"} />
            <KR l={ar?"عائد > 8%":"Yield > 8%"} v={yieldOnCost>0.08?"✅":"❌"} c={yieldOnCost>0.08?"#16a34a":"#ef4444"} />
          </div>
        )}
      </div>
    </div>
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT ═══ */}
    {!isFiltered && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CF CHART (Revenue + CAPEX + Cumulative) ═══ */}
    {chartData.length > 2 && (
      <div style={{marginBottom:16}}>
        <button onClick={()=>setShowChart(!showChart)} style={{...btnS,fontSize:11,padding:"6px 14px",background:showChart?"#f0fdf4":"#f8f9fb",color:showChart?"#16a34a":"#6b7080",border:"1px solid "+(showChart?"#86efac":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"رسم بياني":"Cash Flow Chart"} {showChart?"▲":"▼"}
        </button>
        {showChart && <div style={{marginTop:10,background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="incSG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                <linearGradient id="cumSG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(Math.abs(v))} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} fill="url(#incSG)" name={ar?"الإيرادات":"Revenue"} dot={false} />
              <Area type="monotone" dataKey="capex" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="CAPEX" dot={false} />
              <Area type="monotone" dataKey="cumCF" stroke="#2563eb" strokeWidth={2.5} fill="url(#cumSG)" name={ar?"تراكمي":"Cumulative"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10}}>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#16a34a",borderRadius:2,marginInlineEnd:4}} />{ar?"الإيرادات":"Revenue"}</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#ef4444",borderRadius:2,marginInlineEnd:4,borderTop:"1px dashed #ef4444"}} />CAPEX</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#2563eb",borderRadius:2,marginInlineEnd:4}} />{ar?"تراكمي":"Cumulative CF"}</span>
          </div>
        </div>}
      </div>
    )}

    {/* ═══ COMPREHENSIVE CASH FLOW TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"التدفق النقدي الشامل":"Comprehensive Cash Flow"}</div>
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

      {/* ═══ § 1. PROJECT CF ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s1:!p.s1}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{secOpen.s1?"▶":"▼"} {ar?"1. تدفقات المشروع":"1. PROJECT CASH FLOWS"}</td></tr>
      {!secOpen.s1 && <>
      <CFRow label={ar?"الإيرادات":"Revenue"} values={c.income} total={c.totalIncome} color="#16a34a" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
      <CFRow label={ar?"(-) تكلفة التطوير (CAPEX)":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={c.netCF} total={c.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 2. EXIT & INCENTIVES ═══ */}
      {(exitProc > 0 || (hasIncentives && !isFiltered)) && <>
      <tr onClick={()=>setSecOpen(p=>({...p,s2:!p.s2}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#f59e0b",background:"#fffbeb",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #f59e0b",userSelect:"none"}}>{secOpen.s2?"▶":"▼"} {ar?"2. التخارج والحوافز":"2. EXIT & INCENTIVES"}</td></tr>
      {!secOpen.s2 && <>
      {exitProc > 0 && <CFRow label={ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"} values={f?.exitProceeds||new Array(h).fill(0)} total={exitProc} color="#16a34a" />}
      {hasIncentives && !isFiltered && ir.capexGrantSchedule && (ir.capexGrantTotal||0)>0 && <CFRow label={ar?"(+) منحة CAPEX":"(+) CAPEX Grant"} values={ir.capexGrantSchedule} total={ir.capexGrantTotal} color="#059669" />}
      {hasIncentives && !isFiltered && ir.landRentSavingSchedule && (ir.landRentSavingTotal||0)>0 && <CFRow label={ar?"(+) وفر إيجار الأرض":"(+) Land Rent Savings"} values={ir.landRentSavingSchedule} total={ir.landRentSavingTotal} color="#059669" />}
      </>}
      </>}

      {/* ═══ § 3. NET RESULT & CAPITAL ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s3:!p.s3}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#e0e7ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #1e3a5f",userSelect:"none"}}>{secOpen.s3?"▶":"▼"} {ar?"3. صافي النتيجة ورأس المال":"3. NET RESULT & CAPITAL"}</td></tr>
      {!secOpen.s3 && <>
      <CFRow label={ar?"= صافي التدفق النهائي":"= Final Net Cash Flow"} values={levCF} total={totalLevCF} bold />
      {/* Cumulative */}
      {(() => { let cum=0; const cumArr=levCF.map(v=>{cum+=v;return cum;}); return <tr style={{background:"#fffbeb"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:isMobile?120:200}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cumArr[y]<0?"#ef4444":"#16a34a"}}>{fmt(cumArr[y])}</td>)}
      </tr>; })()}
      {/* Capital Deployed */}
      <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:10,color:"#2563eb",minWidth:isMobile?120:200}}>{ar?"رأس المال المجمد":"Capital Deployed"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:capitalDeployed[y]>0?"#2563eb":"#d0d4dc"}}>{capitalDeployed[y]>0?fmt(capitalDeployed[y]):"—"}</td>)}
      </tr>
      </>}

      {/* ═══ § 4. DEVELOPER METRICS ═══ */}
      <tr><td colSpan={years.length+2} style={{padding:"8px 12px",fontSize:11,background:"#e0e7ff",borderTop:"2px solid #1e3a5f"}}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontWeight:700,color:"#1e3a5f"}}>{ar?"مؤشرات المطور":"Developer Metrics"}:</span>
          <span>{ar?"عائد بسيط":"Simple"} <strong style={{color:"#f59e0b"}}>{simpleROE?fmtPct(simpleROE*100):"—"}</strong> <span style={{fontSize:9,color:"#6b7080"}}>({ar?"سنوي":"ann."} {simpleAnnual?fmtPct(simpleAnnual*100):"—"})</span></span>
          <span>IRR <strong style={{color:getMetricColor("IRR",levIRR)}}>{levIRR!==null?fmtPct(levIRR*100):"N/A"}</strong></span>
          <span>{ar?"استرداد":"Payback"} <strong style={{color:"#2563eb"}}>{payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
          <span>{ar?"عائد/تكلفة":"Yield"} <strong style={{color:yieldOnCost>0.08?"#16a34a":"#f59e0b"}}>{yieldOnCost>0?fmtPct(yieldOnCost*100):"—"}</strong></span>
          <span>NPV@12% <strong style={{color:"#2563eb"}}>{fmtM(calcNPV(levCF,0.12))}</strong></span>
        </div>
      </td></tr>

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// BANK RESULTS VIEW - For debt & bank100 modes
// ═══════════════════════════════════════════════════════════════
function BankResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand, kpiPhase, setKpiPhase }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [eduModal, setEduModal] = useState(null);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true,s4:true,s5:true});
  const [kpiOpen, setKpiOpen] = useState({bank:false,dev:false,proj:false});
  const [showChart, setShowChart] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({bank:expand,dev:expand,proj:expand}); setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true,s4:true,s5:true}); }}, [globalExpand]);

  if (!financing) return <div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>{ar?"اضبط إعدادات التمويل":"Configure financing settings"}</div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => {
    setSelectedPhases(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
      if (setKpiPhase) setKpiPhase(next.length === 1 ? next[0] : "all");
      return next;
    });
  };
  // Sync from KPI bar dropdown
  useEffect(() => {
    if (!kpiPhase || allPhaseNames.length <= 1) return;
    if (kpiPhase === "all") { setSelectedPhases([]); }
    else if (allPhaseNames.includes(kpiPhase)) { setSelectedPhases([kpiPhase]); }
  }, [kpiPhase]);
  const hasPhases = allPhaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;

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
  const cur = project.currency || "SAR";
  const isBank100 = cfg.finMode === "bank100";

  // ── Filtered financing ──
  const pf = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p => phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0), debtService = new Array(h).fill(0), debtBalClose = new Array(h).fill(0);
    const interest = new Array(h).fill(0), repayment = new Array(h).fill(0), exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf2 => { for (let y=0;y<h;y++) {
      leveredCF[y]+=pf2.leveredCF?.[y]||0; debtService[y]+=pf2.debtService?.[y]||0;
      debtBalClose[y]+=pf2.debtBalClose?.[y]||0; interest[y]+=pf2.interest?.[y]||0;
      repayment[y]+=pf2.repayment?.[y]||0; exitProceeds[y]+=pf2.exitProceeds?.[y]||0;
    }});
    const dscrRaw = new Array(h).fill(null);
    for (let y=0;y<h;y++) { if (debtService[y]>0) { let noi=0; activePh.forEach(p=>{const pr=results.phaseResults?.[p];if(pr)noi+=(pr.income[y]||0)-(pr.landRent[y]||0);}); dscrRaw[y]=noi/debtService[y]; }}
    return { ...financing, leveredCF, debtService, debtBalClose, interest, repayment, exitProceeds, dscr: dscrRaw, leveredIRR: calcIRR(leveredCF),
      totalDebt: pfs.reduce((s,p2)=>s+(p2.totalDebt||0),0), totalEquity: pfs.reduce((s,p2)=>s+(p2.totalEquity||0),0),
      totalInterest: pfs.reduce((s,p2)=>s+(p2.totalInterest||0),0), devCostInclLand: pfs.reduce((s,p2)=>s+(p2.devCostInclLand||0),0),
      maxDebt: pfs.reduce((s,p2)=>s+(p2.maxDebt||0),0), constrEnd: Math.max(...pfs.map(p2=>p2.constrEnd||0)),
      exitYear: Math.max(...pfs.map(p2=>p2.exitYear||0)), gpEquity: pfs.reduce((s,p2)=>s+(p2.gpEquity||0),0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h, results]);

  // ── Filtered cashflow ──
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return results.consolidated;
    const income=new Array(h).fill(0), capex=new Array(h).fill(0), landRent=new Array(h).fill(0), netCF=new Array(h).fill(0);
    activePh.forEach(pName=>{const pr=results.phaseResults?.[pName];if(!pr)return;for(let y=0;y<h;y++){income[y]+=pr.income[y]||0;capex[y]+=pr.capex[y]||0;landRent[y]+=pr.landRent[y]||0;netCF[y]+=pr.netCF[y]||0;}});
    return { income, capex, landRent, netCF, totalCapex:capex.reduce((a,b)=>a+b,0), totalIncome:income.reduce((a,b)=>a+b,0), totalLandRent:landRent.reduce((a,b)=>a+b,0), totalNetCF:netCF.reduce((a,b)=>a+b,0), irr:calcIRR(netCF) };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h]);

  // ── Derived metrics ──
  const dscrVals = pf.dscr ? pf.dscr.filter(v => v !== null && v > 0) : [];
  const dscrMin = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const dscrAvg = dscrVals.length > 0 ? dscrVals.reduce((a,b)=>a+b,0)/dscrVals.length : null;
  const peakDebt = pf.debtBalClose ? Math.max(...pf.debtBalClose) : 0;
  const debtClearYr = (() => { if (!pf.debtBalClose) return null; for (let y=0;y<h;y++) { if (pf.debtBalClose[y]<=0 && y>0 && pf.debtBalClose[y-1]>0) return sy+y; } return null; })();
  const totalDS = pf.debtService ? pf.debtService.reduce((a,b)=>a+b,0) : 0;
  const exitProc = pf.exitProceeds ? pf.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const exitYr = pf.exitYear ? pf.exitYear - sy : 0;
  const exitMult = cfg.exitMultiple || project.exitMultiple || 0;
  const exitCostPct = cfg.exitCostPct || project.exitCostPct || 0;
  const paybackLev = (() => { if (!pf.leveredCF) return null; let cum=0,wasNeg=false; for (let y=0;y<h;y++) { cum+=pf.leveredCF[y]||0; if(cum<-1)wasNeg=true; if(wasNeg&&cum>=0) return y+1; } return null; })();
  const constrEnd = pf.constrEnd || 0;
  const stableIncome = pc.income.find((v,i) => i > constrEnd && v > 0) || 0;
  const cashOnCash = pf.totalEquity > 0 && stableIncome > 0 ? stableIncome / pf.totalEquity : 0;
  const totalFinCost = pf.totalInterest;
  const devNetCF = pf.leveredCF ? pf.leveredCF.reduce((a,b)=>a+b,0) : 0;

  // Simple Return (market convention)
  const levCFArr = pf.leveredCF || [];
  const bankTotalInvested = Math.abs(levCFArr.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const bankSimpleROE = bankTotalInvested > 0 ? devNetCF / bankTotalInvested : 0;
  const bankInvestYears = (() => {
    let first = -1, last = 0;
    for (let y = 0; y < h; y++) { if ((levCFArr[y]||0) < 0 && first < 0) first = y; if ((levCFArr[y]||0) > 0) last = y; }
    return Math.max(1, first >= 0 ? last - first + 1 : h);
  })();
  const bankSimpleAnnual = bankInvestYears > 0 ? bankSimpleROE / bankInvestYears : 0;
  // For hold mode with very long horizons (>20yr), simple return is misleading (e.g. 7341%).
  // Show stabilized annual yield instead, which is more useful for income-producing assets.
  const isHoldMode = (project.exitStrategy || "sale") === "hold" || project.finMode === "incomeFund";
  const isLongHold = isHoldMode && bankInvestYears > 20;

  // ── Developer Feasibility Metrics ──
  const cumLevCF = useMemo(() => {
    if (!pf.leveredCF) return [];
    let cum = 0;
    return pf.leveredCF.map(v => { cum += v; return cum; });
  }, [pf.leveredCF]);
  // Break-even year: first year cumulative CF ≥ 0 after being negative
  const breakEvenYr = (() => { let wasNeg = false; for (let y = 0; y < h; y++) { if (cumLevCF[y] < -1) wasNeg = true; if (wasNeg && cumLevCF[y] >= 0) return sy + y; } return null; })();
  // Free cash years: years where levered CF > 0 after construction
  const freeCashStartYr = (() => { for (let y = constrEnd; y < h; y++) { if ((pf.leveredCF?.[y] || 0) > 0) return sy + y; } return null; })();
  // Cumulative profit at exit
  const cumProfitAtExit = exitYr > 0 && exitYr < h ? cumLevCF[exitYr] : cumLevCF[h - 1];
  // Years of negative cash flow
  const negCFYears = pf.leveredCF ? pf.leveredCF.filter((v, i) => i < h && v < -1).length : 0;
  // Annual free cash after debt service (average of operational years)
  const opYears = pf.leveredCF ? pf.leveredCF.slice(constrEnd).filter(v => v > 0) : [];
  const avgFreeCash = opYears.length > 0 ? opYears.reduce((a, b) => a + b, 0) / opYears.length : 0;
  // Owner equity build-up: cumulative NOI - cumulative DS = owner's growing equity
  const ownerEquityData = useMemo(() => {
    const data = [];
    let cumNOI = 0, cumDS = 0;
    for (let y = 0; y < Math.min(showYrs, h); y++) {
      const noi = (pc.income[y] || 0) - (pc.landRent[y] || 0);
      cumNOI += noi;
      cumDS += (pf.debtService?.[y] || 0);
      const debtBal = pf.debtBalClose?.[y] || 0;
      // Rough project value = stable NOI / cap rate (or dev cost if no income yet)
      const projValue = noi > 0 ? noi / 0.08 : (pf.devCostInclLand || 0);
      data.push({ year: sy + y, debt: debtBal, projValue, netEquity: projValue - debtBal, cumCF: cumLevCF[y] || 0 });
    }
    return data;
  }, [pc, pf, showYrs, h, sy, cumLevCF]);

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    balance: pf.debtBalClose?.[y] || 0,
    noi: (pc.income[y]||0) - (pc.landRent[y]||0),
    ds: pf.debtService?.[y] || 0,
  }));

  // CFRow (same as WaterfallView)
  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"#f8f9fb"} : {};
    const nc = v => { if(color) return color; return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  // Shared mini-components (same as WaterfallView KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c,bold:b}) => <><span style={{color:"#6b7080",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:c||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#9ca3af",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  return (<div>
    {/* ═══ Phase Selector (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>{setSelectedPhases([]);if(setKpiPhase)setKpiPhase("all");}} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pff = phaseFinancings?.[p];
            const irr = pff?.leveredIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}{irr!==null&&irr!==undefined?<span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span>:""}
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

    {/* ═══ Quick Edit - Loan Terms ═══ */}
    {upCfg && (
      <div style={{background:showTerms?"#fff":"#f8f9fb",borderRadius:10,border:showTerms?"2px solid #2563eb":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#eff6ff":"#f8f9fb",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?"تعديل سريع - شروط القرض":"Quick Edit - Loan Terms"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{!isBank100?`${cfg.maxLtvPct||70}% LTV · `:""}{cfg.financeRate||6.5}% · {cfg.loanTenor||7} {ar?"سنة":"yrs"} ({cfg.debtGrace||3} {ar?"سماح":"grace"})</span>
          <span style={{fontSize:11,color:"#9ca3af",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #bfdbfe",animation:"zanSlide 0.15s ease"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2563eb",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"شروط القرض":"LOAN TERMS"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {!isBank100 && <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:70}}>LTV %</span>
              <input type="number" value={cfg.maxLtvPct||""} onChange={e=>upCfg({maxLtvPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
            </div>}
            {[
              {l:ar?"معدل %":"Rate %",k:"financeRate",v:cfg.financeRate},
              {l:ar?"المدة":"Tenor (yr)",k:"loanTenor",v:cfg.loanTenor},
              {l:ar?"سماح":"Grace (yr)",k:"debtGrace",v:cfg.debtGrace},
              {l:ar?"رسوم %":"Fee %",k:"upfrontFeePct",v:cfg.upfrontFeePct},
            ].map(fld=><div key={fld.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:70}}>{fld.l}</span>
              <input type="number" value={fld.v||""} onChange={e=>upCfg({[fld.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:70}}>{ar?"السداد":"Repay"}</span>
              <select value={cfg.repaymentType||"amortizing"} onChange={e=>upCfg({repaymentType:e.target.value})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="amortizing">{ar?"أقساط":"Amortizing"}</option>
                <option value="bullet">{ar?"دفعة واحدة":"Bullet"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:70}}>{ar?"بداية السماح":"Grace Basis"}</span>
              <select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="cod">COD</option>
                <option value="firstDraw">{ar?"أول سحب":"1st Draw"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:70}}>{ar?"السحب":"Tranche"}</span>
              <select value={cfg.debtTrancheMode||"single"} onChange={e=>upCfg({debtTrancheMode:e.target.value})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="single">{ar?"كتلة واحدة":"Single"}</option>
                <option value="perDraw">{ar?"لكل سحبة":"Per Draw"}</option>
              </select>
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"التخارج":"EXIT STRATEGY"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:70}}>{ar?"الاستراتيجية":"Strategy"}</span>
              <select value={cfg.exitStrategy||"sale"} onChange={e=>upCfg({exitStrategy:e.target.value})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="sale">{ar?"بيع":"Sale"}</option>
                <option value="hold">{ar?"احتفاظ":"Hold"}</option>
                <option value="caprate">Cap Rate</option>
              </select>
            </div>
            {(cfg.exitStrategy||"sale")!=="hold"&&<>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#6b7080",minWidth:60}}>{ar?"السنة":"Year"}</span>
                <input type="number" value={cfg.exitYear||""} onChange={e=>upCfg({exitYear:parseFloat(e.target.value)||0})} placeholder="auto" style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
                {pf?.optimalExitYear > 0 && pf?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <span style={{fontSize:10,color:"#92400e",background:"#fef9c3",padding:"2px 6px",borderRadius:4}}>💡 {ar?"يوصى:":"Rec:"} {pf.optimalExitYear} ({(pf.optimalExitIRR*100).toFixed(1)}%)</span>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#6b7080",minWidth:60}}>{ar?"المضاعف":"Multiple"}</span>
                <input type="number" value={cfg.exitMultiple||""} onChange={e=>upCfg({exitMultiple:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
              </div>}
              {cfg.exitStrategy==="caprate"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#6b7080",minWidth:60}}>{ar?"رسملة %":"Cap %"}</span>
                <input type="number" value={cfg.exitCapRate||""} onChange={e=>upCfg({exitCapRate:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
              </div>}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#6b7080",minWidth:60}}>{ar?"تكلفة %":"Cost %"}</span>
                <input type="number" value={cfg.exitCostPct||""} onChange={e=>upCfg({exitCostPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
              </div>
            </>}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: Bank | Developer | Project ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* ── 🏦 Bank (Lender) Card ── */}
      <div style={{background:kpiOpen.bank?"#fff":"linear-gradient(135deg, #eff6ff, #e0f2fe)",borderRadius:10,border:kpiOpen.bank?"2px solid #2563eb":"1px solid #93c5fd",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,bank:!p.bank}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#2563eb",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>🏦</span>
          <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"البنك (المقرض)":"Bank (Lender)"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.bank?"▲":"▼"}</span>
        </div>
        {!kpiOpen.bank ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"دين":"Debt", fmtM(pf.totalDebt), "#2563eb")}
            {badge("DSCR", dscrMin!==null?dscrMin.toFixed(2)+"x":"—", getMetricColor("DSCR",dscrMin))}
            {badge(ar?"فوائد":"Interest", fmtM(pf.totalInterest), "#ef4444")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"هيكل القرض":"LOAN STRUCTURE"} />
            <KR l={ar?"إجمالي القرض":"Total Facility"} v={fmtM(pf.totalDebt)} c="#2563eb" bold />
            <KR l="LTV" v={isBank100?"100%":fmtPct((pf.totalDebt/(pf.devCostInclLand||1))*100)} />
            <KR l={ar?"معدل التمويل":"Finance Rate"} v={`${cfg.financeRate||6.5}%`} />
            <KR l={ar?"المدة":"Tenor"} v={`${cfg.loanTenor||7} ${ar?"سنة":"yrs"}`} />
            <KR l={ar?"فترة السماح":"Grace"} v={`${cfg.debtGrace||3} ${ar?"سنة":"yrs"}`} />
            <KR l={ar?"نوع السداد":"Repay Type"} v={cfg.repaymentType==="bullet"?(ar?"دفعة واحدة":"Bullet"):(ar?"أقساط":"Amortizing")} />
            <SecHd text={ar?"تكلفة الدين":"DEBT COST"} />
            <KR l={ar?"إجمالي الفوائد":"Total Interest"} v={fmtM(pf.totalInterest)} c="#ef4444" bold />
            {(pf.upfrontFee||0) > 0 && <KR l={ar?"* تشمل رسوم قرض":"* incl. upfront fee"} v={fmtM(pf.upfrontFee)} />}
            <KR l={ar?"إجمالي تكلفة الدين":"Total Debt Cost"} v={fmtM(totalFinCost)} c="#ef4444" bold />
            <KR l={ar?"كنسبة من التكلفة":"% of Dev Cost"} v={pf.devCostInclLand>0?fmtPct(totalFinCost/pf.devCostInclLand*100):"—"} />
            <SecHd text="DSCR" />
            <KR l={ar?"أدنى":"Minimum"} v={dscrMin!==null?dscrMin.toFixed(2)+"x":"—"} c={getMetricColor("DSCR",dscrMin)} bold />
            <KR l={ar?"متوسط":"Average"} v={dscrAvg!==null?dscrAvg.toFixed(2)+"x":"—"} c={dscrAvg>=1.5?"#16a34a":"#f59e0b"} />
            <KR l={ar?"ذروة الدين":"Peak Debt"} v={fmtM(peakDebt)} c="#dc2626" />
            <KR l={ar?"تصفية الدين":"Debt Cleared"} v={debtClearYr?`${debtClearYr}`:(ar?"لم يُصفَّ":"Not cleared")} c={debtClearYr?"#16a34a":"#ef4444"} />
          </div>
        )}
      </div>

      {/* ── 👷 Developer (Borrower) Card ── */}
      <div style={{background:kpiOpen.dev?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:10,border:kpiOpen.dev?"2px solid #16a34a":"1px solid #86efac",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,dev:!p.dev}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#16a34a",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>👷</span>
          <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"المطور (المقترض)":"Developer (Borrower)"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.dev?"▲":"▼"}</span>
        </div>
        {!kpiOpen.dev ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {isLongHold
              ? badge(ar?"عائد نقدي":"Cash Yield", cashOnCash>0?fmtPct(cashOnCash*100):"—", "#f59e0b")
              : badge(ar?"عائد بسيط":"Simple", bankSimpleROE?fmtPct(bankSimpleROE*100):"—", "#f59e0b")}
            {badge("IRR", pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"—", getMetricColor("IRR",pf.leveredIRR))}
            {badge(ar?"استرداد":"Payback", paybackLev?`Yr ${paybackLev}`:"—", "#6366f1")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"رأس المال":"CAPITAL"} />
            <KR l={ar?"ملكية المطور":"Developer Equity"} v={fmtM(pf.gpEquity||pf.totalEquity)} c="#3b82f6" bold />
            {pf.lpEquity>0 && <KR l={ar?"ملكية أخرى":"Other Equity"} v={fmtM(pf.lpEquity)} c="#8b5cf6" />}
            <KR l={ar?"تكلفة التطوير":"Dev Cost"} v={fmtM(pf.devCostInclLand)} bold />
            {pf.landCapValue>0 && <KR l={ar?"رسملة أرض":"Land Cap"} v={fmtM(pf.landCapValue)} />}
            <SecHd text={ar?"العائد البسيط (عرف السوق)":"SIMPLE RETURN (MARKET CONVENTION)"} />
            {isLongHold ? <>
              <KR l={ar?"عائد نقدي سنوي (مستقر)":"Stabilized Cash Yield"} v={cashOnCash>0?fmtPct(cashOnCash*100):"N/A"} c="#f59e0b" bold />
              <KR l={ar?"فترة الاحتفاظ":"Hold Period"} v={`${bankInvestYears} ${ar?"سنة":"yr"}`} c="#6b7080" />
            </> : <>
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={bankSimpleROE?fmtPct(bankSimpleROE*100):"N/A"} c="#f59e0b" bold />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={bankSimpleAnnual?fmtPct(bankSimpleAnnual*100):"N/A"} c="#f59e0b" />
            </>}
            <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${bankInvestYears} ${ar?"سنة":"yr"}`} />
            <SecHd text={ar?"المؤشرات الدقيقة":"PRECISE METRICS"} />
            <KR l={ar?"صافي IRR (مركب) بعد التمويل":"Levered IRR (Compounded)"} v={pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"N/A"} c={getMetricColor("IRR",pf.leveredIRR)} bold />
            <KR l={ar?"IRR قبل التمويل":"Unlevered IRR"} v={pc.irr!==null?fmtPct(pc.irr*100):"N/A"} />
            <KR l={ar?"فترة الاسترداد":"Payback"} v={paybackLev?`${paybackLev} ${ar?"سنة":"yr"}`:"—"} c="#2563eb" />
            <KR l={ar?"عائد نقدي":"Cash-on-Cash"} v={cashOnCash>0?fmtPct(cashOnCash*100):"—"} c={cashOnCash>0.08?"#16a34a":"#6b7080"} />
            <KR l={ar?"صافي التدفق":"Net CF"} v={fmtM(devNetCF)} c={devNetCF>0?"#16a34a":"#ef4444"} bold />
            {/* Leverage Effect (debt+equity only) */}
            {!isBank100 && pf.totalEquity > 0 && <>
            <SecHd text={ar?"تأثير الرافعة المالية":"LEVERAGE EFFECT"} />
            <KR l={ar?"IRR بدون دين":"Without Debt"} v={pc.irr!==null?fmtPct(pc.irr*100):"—"} c="#6b7080" />
            <KR l={ar?"IRR مع دين":"With Debt"} v={pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"—"} c={getMetricColor("IRR",pf.leveredIRR)} bold />
            <KR l={ar?"الفرق (أثر الدين)":"IRR Boost"} v={pc.irr!==null&&pf.leveredIRR!==null?`+${((pf.leveredIRR-pc.irr)*100).toFixed(2)}%`:"—"} c={pf.leveredIRR>pc.irr?"#10b981":"#ef4444"} bold />
            {!isLongHold && <KR l={ar?"مضاعف الملكية":"Equity Multiple"} v={pf.totalEquity>0?((exitProc+devNetCF)/pf.totalEquity).toFixed(2)+"x":"—"} c={exitProc+devNetCF>pf.totalEquity?"#16a34a":"#ef4444"} bold />}
            </>}
            <SecHd text="NPV" />
            <KR l="@10%" v={fmtM(calcNPV(pf.leveredCF,0.10))} />
            <KR l="@12%" v={fmtM(calcNPV(pf.leveredCF,0.12))} c="#2563eb" bold />
            <KR l="@14%" v={fmtM(calcNPV(pf.leveredCF,0.14))} />
          </div>
        )}
      </div>

      {/* ── 📋 Project Card ── */}
      <div style={{background:kpiOpen.proj?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.proj?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,proj:!p.proj}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📋</span>
          <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"المشروع":"Project"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.proj?"▲":"▼"}</span>
        </div>
        {!kpiOpen.proj ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"تكلفة":"Cost", fmtM(pf.devCostInclLand), "#1a1d23")}
            {badge(ar?"إيرادات":"Revenue", fmtM(pc.totalIncome), "#16a34a")}
            {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${(pf.exitYear||0)}`, "#f59e0b")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"المصادر والاستخدامات":"SOURCES & USES"} />
            <KR l={ar?"دين بنكي":"Bank Debt"} v={fmtM(pf.totalDebt)} c="#ef4444" />
            <KR l={ar?"ملكية":"Equity"} v={fmtM(pf.totalEquity)} c="#3b82f6" />
            {/* Visual Debt/Equity bar */}
            {!isBank100 && pf.devCostInclLand > 0 && <div style={{gridColumn:"1/-1",marginTop:2,marginBottom:4}}>
              <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:"#e5e7ec"}}>
                <div style={{width:`${(pf.totalDebt/(pf.devCostInclLand||1))*100}%`,background:"#ef4444",borderRadius:"4px 0 0 4px"}} />
                <div style={{width:`${(pf.totalEquity/(pf.devCostInclLand||1))*100}%`,background:"#3b82f6",borderRadius:"0 4px 4px 0"}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:2}}>
                <span style={{color:"#ef4444",fontWeight:600}}>{ar?"دين":"Debt"} {fmtPct((pf.totalDebt/(pf.devCostInclLand||1))*100)}</span>
                <span style={{color:"#3b82f6",fontWeight:600}}>{ar?"ملكية":"Equity"} {fmtPct((pf.totalEquity/(pf.devCostInclLand||1))*100)}</span>
              </div>
            </div>}
            <KR l={ar?"تكلفة بناء":"Construction"} v={fmtM(pf.devCostExclLand)} />
            {pf.landCapValue>0 && <KR l={ar?"أرض":"Land"} v={fmtM(pf.landCapValue)} />}
            <KR l={ar?"الإجمالي":"Total"} v={fmtM(pf.devCostInclLand)} bold />
            <SecHd text={ar?"التخارج":"EXIT"} />
            <KR l={ar?"الاستراتيجية":"Strategy"} v={cfg.exitStrategy==="hold"?(ar?"احتفاظ":"Hold"):cfg.exitStrategy==="caprate"?"Cap Rate":(ar?"بيع":"Sale")} />
            <KR l={ar?"السنة":"Year"} v={pf.exitYear?`${pf.exitYear}`:"—"} />
            <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
            <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="#16a34a" />
            <KR l={ar?"تكلفة التخارج":"Exit Cost"} v={exitCostPct>0?exitCostPct+"%":"—"} />
            <SecHd text={ar?"امتثال بنكي":"BANK COMPLIANCE"} />
            <KR l="Min DSCR ≥ 1.25x" v={dscrMin>=1.25?"✅":"❌"} c={getMetricColor("DSCR",dscrMin)} bold />
            <KR l="Avg DSCR ≥ 1.50x" v={dscrAvg>=1.5?"✅":"❌"} c={dscrAvg>=1.5?"#16a34a":"#ef4444"} bold />
            <KR l={ar?"الدين مسدد":"Debt Cleared"} v={debtClearYr?"✅":"❌"} c={debtClearYr?"#16a34a":"#ef4444"} />
            <KR l="IRR > 0" v={pf.leveredIRR>0?"✅":"❌"} c={pf.leveredIRR>0?"#10b981":"#ef4444"} />
          </div>
        )}
      </div>
    </div>
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و DSCR؟":"What do IRR, NPV, DSCR mean?"} /></div>

    {/* ═══ DEVELOPER FEASIBILITY TIMELINE ═══ */}
    {pf.leveredCF && (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1e3a5f",marginBottom:10}}>{ar?"جدوى المشروع للمالك":"Owner Feasibility Timeline"}</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:10}}>
          {/* Milestone 1: First positive CF */}
          <div style={{background:"linear-gradient(135deg, #ecfdf5, #d1fae5)",borderRadius:10,padding:"12px 14px",border:"1px solid #86efac"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"أول دخل صافي":"First Positive CF"}</div>
            <div style={{fontSize:18,fontWeight:800,color:freeCashStartYr?"#059669":"#9ca3af"}}>{freeCashStartYr || "—"}</div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:2}}>{freeCashStartYr ? (ar?`بعد ${freeCashStartYr-sy} سنة`:`After ${freeCashStartYr-sy} years`) : (ar?"لا يوجد":"None")}</div>
          </div>
          {/* Milestone 2: Debt cleared */}
          <div style={{background:"linear-gradient(135deg, #eff6ff, #dbeafe)",borderRadius:10,padding:"12px 14px",border:"1px solid #93c5fd"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#2563eb",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"تصفية الدين":"Debt Cleared"}</div>
            <div style={{fontSize:18,fontWeight:800,color:debtClearYr?"#2563eb":"#ef4444"}}>{debtClearYr || (ar?"لم يُصفَّ":"Not cleared")}</div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:2}}>{debtClearYr ? (ar?`بعد ${debtClearYr-sy} سنة`:`After ${debtClearYr-sy} years`) : (ar?"خلال الأفق":"Within horizon")}</div>
          </div>
          {/* Milestone 3: Break-even */}
          <div style={{background:"linear-gradient(135deg, #fefce8, #fef9c3)",borderRadius:10,padding:"12px 14px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#ca8a04",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"نقطة التعادل":"Break-even"}</div>
            <div style={{fontSize:18,fontWeight:800,color:breakEvenYr?"#ca8a04":"#9ca3af"}}>{breakEvenYr || "—"}</div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:2}}>{breakEvenYr ? (ar?`استرداد في ${breakEvenYr-sy} سنة`:`Recovery in ${breakEvenYr-sy} years`) : (ar?"لم يتحقق":"Not reached")}</div>
          </div>
          {/* Milestone 4: Total profit */}
          <div style={{background:"linear-gradient(135deg, #fdf2f8, #fce7f3)",borderRadius:10,padding:"12px 14px",border:"1px solid #f9a8d4"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#be185d",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"صافي الربح":"Net Profit"}</div>
            <div style={{fontSize:18,fontWeight:800,color:cumProfitAtExit>0?"#059669":"#ef4444"}}>{fmtM(cumProfitAtExit||0)}</div>
            <div style={{fontSize:10,color:"#6b7080",marginTop:2}}>{ar?`متوسط سنوي: ${fmtM(avgFreeCash)}`:`Avg annual: ${fmtM(avgFreeCash)}`}</div>
          </div>
        </div>
        {/* J-Curve (cumulative CF) */}
        {cumLevCF.length > 2 && (
          <div style={{marginTop:12,background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#1a1d23",marginBottom:8}}>{ar?"منحنى الاستثمار (التدفق التراكمي)":"Investment J-Curve (Cumulative Cash Flow)"}</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={years.map(y => ({ year: sy+y, cum: cumLevCF[y]||0 }))} margin={{top:5,right:10,left:10,bottom:5}}>
                <defs>
                  <linearGradient id="jcPos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                  <linearGradient id="jcNeg" x1="0" y1="1" x2="0" y2="0"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
                <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
                <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v<=-1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:Math.round(v)} />
                <Tooltip formatter={(v) => fmt(v)} />
                <ReferenceLine y={0} stroke="#1a1d23" strokeWidth={1.5} strokeDasharray="4 4" />
                {breakEvenYr && <ReferenceLine x={breakEvenYr} stroke="#ca8a04" strokeDasharray="4 4" strokeWidth={1} label={{value:ar?"تعادل":"Break-even",position:"top",fontSize:9,fill:"#ca8a04"}} />}
                <Area type="monotone" dataKey="cum" stroke="#1e3a5f" strokeWidth={2.5} fill="url(#jcPos)" name={ar?"تراكمي":"Cumulative"} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    )}

    {/* ═══ EXIT ANALYSIS ═══ */}    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={pf} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT ═══ */}
    {!isFiltered && <IncentivesImpact project={project} results={results} financing={pf} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ FINANCING CHARTS (Pie + DSCR Line + Debt Area) ═══ */}
    {pf && pf.totalDebt > 0 && (() => {
      const dscrData = years.map(y => ({
        year: sy + y,
        dscr: pf.dscr?.[y] ?? null,
      })).filter(d => d.dscr !== null && d.dscr > 0);
      const debtData = years.map(y => ({
        year: sy + y,
        balance: pf.debtBalClose?.[y] || 0,
        noi: (pc.income[y]||0) - (pc.landRent[y]||0),
        ds: pf.debtService?.[y] || 0,
      }));
      const pieData = [
        { name: ar ? "دين" : "Debt", value: pf.totalDebt, color: "#ef4444" },
        { name: ar ? "ملكية" : "Equity", value: pf.totalEquity, color: "#2EC4B6" },
      ].filter(d => d.value > 0);
      const effLTV = pf.devCostInclLand > 0 ? ((pf.totalDebt / pf.devCostInclLand) * 100).toFixed(0) : 0;

      return <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,flex:1}}>{ar?"التحليل البصري":"Visual Analysis"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr",gap:12}}>
          {/* Pie: Debt/Equity Split */}
          <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#1a1d23",marginBottom:8}}>{ar?"هيكل رأس المال":"Capital Structure"}</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((d,idx) => <Cell key={idx} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => fmtM(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{textAlign:"center",fontSize:20,fontWeight:700,color:getMetricColor("LTV",+effLTV),marginTop:-8}}>{effLTV}% LTV</div>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6,fontSize:10}}>
              {pieData.map((d,i) => <span key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:d.color,display:"inline-block"}} />{d.name}: {fmtM(d.value)}</span>)}
            </div>
          </div>

          {/* DSCR Line Chart */}
          {dscrData.length > 1 && <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#1a1d23",marginBottom:8}}>{ar?"مسار DSCR":"DSCR Trajectory"}</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dscrData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
                <XAxis dataKey="year" tick={{fontSize:9,fill:"#6b7080"}} />
                <YAxis tick={{fontSize:9,fill:"#6b7080"}} domain={[0, 'auto']} tickFormatter={v => v.toFixed(1)+"x"} />
                <Tooltip formatter={v => v.toFixed(2)+"x"} />
                <ReferenceLine y={1.2} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{value:"1.2x min",position:"right",fontSize:9,fill:"#ef4444"}} />
                <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} label={{value:"1.5x target",position:"right",fontSize:9,fill:"#10b981"}} />
                <Line type="monotone" dataKey="dscr" stroke="#2563eb" strokeWidth={2.5} dot={{fill:"#2563eb",r:3}} activeDot={{r:5}} name="DSCR" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:4,fontSize:10}}>
              <span><span style={{display:"inline-block",width:12,height:3,background:"#2563eb",borderRadius:2,marginInlineEnd:4}} />DSCR</span>
              <span><span style={{display:"inline-block",width:12,height:1,borderTop:"2px dashed #ef4444",marginInlineEnd:4}} />{ar?"حد أدنى":"Min"} 1.2x</span>
              <span><span style={{display:"inline-block",width:12,height:1,borderTop:"2px dashed #10b981",marginInlineEnd:4}} />{ar?"مستهدف":"Target"} 1.5x</span>
            </div>
          </div>}
        </div>
      </div>;
    })()}

    {/* ═══ CHART TOGGLE (Debt Balance + NOI) ═══ */}
    {chartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setShowChart(!showChart)} style={{...btnS,fontSize:11,padding:"6px 14px",background:showChart?"#eff6ff":"#f8f9fb",color:showChart?"#2563eb":"#6b7080",border:"1px solid "+(showChart?"#93c5fd":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"رسم بياني - الدين vs الدخل":"Debt vs Income Chart"} {showChart?"▲":"▼"}
        </button>
        {showChart && <div style={{marginTop:10,background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="debtBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                <linearGradient id="noiBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(Math.abs(v))} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={2.5} fill="url(#debtBG)" name={ar?"رصيد الدين":"Debt Balance"} dot={false} />
              <Area type="monotone" dataKey="noi" stroke="#16a34a" strokeWidth={2} fill="url(#noiBG)" name="NOI" dot={false} />
              <Area type="monotone" dataKey="ds" stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name={ar?"خدمة الدين":"Debt Service"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10}}>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#ef4444",borderRadius:2,marginInlineEnd:4}} />{ar?"رصيد الدين":"Debt Balance"}</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#16a34a",borderRadius:2,marginInlineEnd:4}} />NOI</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#f59e0b",borderRadius:2,marginInlineEnd:4,borderTop:"1px dashed #f59e0b"}} />{ar?"خدمة الدين":"Debt Service"}</span>
          </div>
        </div>}
      </div>
    )}

    {/* ═══ COMPREHENSIVE CASH FLOW TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"التدفقات النقدية البنكية":"Bank Cash Flows"}</div>
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

      {/* ═══ § 1. PROJECT CF (Unlevered) ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s1:!p.s1}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{secOpen.s1?"▶":"▼"} {ar?"1. تدفقات المشروع (قبل التمويل)":"1. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!secOpen.s1 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pc.landRent} total={pc.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      {/* NOI */}
      {(() => { const noi=new Array(h).fill(0); for(let y=0;y<h;y++) noi[y]=(pc.income[y]||0)-(pc.landRent[y]||0); return <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noi} total={noi.reduce((a,b)=>a+b,0)} bold />; })()}
      <CFRow label={ar?"(-) تكلفة التطوير (CAPEX)":"(-) Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Net Project CF (Unlevered)"} values={pc.netCF} total={pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 2. BANK FINANCING ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s2:!p.s2}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#2563eb",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{secOpen.s2?"▶":"▼"} {ar?"2. التمويل البنكي":"2. BANK FINANCING"}</td></tr>
      {!secOpen.s2 && <>
      {!isBank100 && pf.equityCalls && <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={pf.equityCalls} total={pf.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" negate />}
      {/* Cumulative equity deployed */}
      {!isBank100 && pf.equityCalls && <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:500,fontSize:10,color:"#7c3aed",paddingInlineStart:20,minWidth:isMobile?120:200}}>{ar?"↳ ملكية تراكمية":"↳ Cumulative Equity"}</td>
        <td style={tdN}></td>
        {(() => { let cum=0; return years.map(y => { cum+=pf.equityCalls[y]||0; return <td key={y} style={{...tdN,fontSize:10,fontWeight:500,color:cum>0?"#7c3aed":"#d0d4dc"}}>{cum>0?fmt(cum):"—"}</td>; }); })()}
      </tr>}
      <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={pf.drawdown} total={pf.drawdown?.reduce((a,b)=>a+b,0)||0} />
      <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={pf.debtBalOpen} total={null} />
      <CFRow label={ar?"(-) سداد أصل الدين":"(-) Principal Repayment"} values={pf.repayment} total={pf.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
      <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={pf.debtBalClose} total={null} />
      <CFRow label={ar?"(-) تكلفة التمويل (فائدة)":"(-) Interest / Profit Cost"} values={pf.interest} total={pf.totalInterest||0} negate color="#ef4444" />
      <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={pf.debtService} total={totalDS} negate bold color="#ef4444" />
      {/* Exit */}
      {exitProc > 0 && <CFRow label={ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"} values={pf.exitProceeds} total={exitProc} color="#16a34a" />}
      </>}

      {/* ═══ § 3. DSCR & DEBT COVERAGE ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s3:!p.s3}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e40af",background:"#dbeafe",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb",userSelect:"none"}}>{secOpen.s3?"▶":"▼"} {ar?"3. تغطية خدمة الدين (DSCR)":"3. DEBT SERVICE COVERAGE (DSCR)"}</td></tr>
      {!secOpen.s3 && <>
      {/* NOI row */}
      {(() => { const noi=new Array(h).fill(0); for(let y=0;y<h;y++) noi[y]=(pc.income[y]||0)-(pc.landRent[y]||0); return <CFRow label={ar?"صافي الدخل التشغيلي (NOI)":"Net Operating Income (NOI)"} values={noi} total={noi.reduce((a,b)=>a+b,0)} color="#16a34a" />; })()}
      {/* DS row */}
      <CFRow label={ar?"(÷) خدمة الدين":"(÷) Debt Service"} values={pf.debtService} total={totalDS} color="#ef4444" />
      {/* DSCR = NOI / DS (highlighted) */}
      {pf.dscr && <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:700,minWidth:isMobile?120:200,fontSize:11,color:"#1e40af",paddingInlineStart:10}}>= DSCR (NOI ÷ DS)</td>
        <td style={{...tdN,fontWeight:700,color:"#1e40af"}}>{dscrAvg!==null?dscrAvg.toFixed(2)+"x":""}</td>
        {years.map(y=>{const v=pf.dscr?.[y];const bg=v===null||v===undefined?"#eff6ff":getMetricColor("DSCR",v,{raw:true})==="error"?"#fef2f2":getMetricColor("DSCR",v,{raw:true})==="warning"?"#fefce8":"#f0fdf4";const fg=getMetricColor("DSCR",v);return <td key={y} style={{...tdN,fontSize:11,fontWeight:700,color:fg,background:bg}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
      </tr>}
      {/* Min DSCR indicator */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:10,color:getMetricColor("DSCR",dscrMin),background:dscrMin>=1.25?"#f0fdf4":"#fef2f2"}}>
        {dscrMin>=1.25?"✅":"⚠️"} {ar?"الحد الأدنى":"Minimum"}: <strong>{dscrMin!==null?dscrMin.toFixed(2)+"x":"N/A"}</strong> | {ar?"المتوسط":"Average"}: <strong>{dscrAvg!==null?dscrAvg.toFixed(2)+"x":"N/A"}</strong> | {ar?"حد البنك":"Bank Req"}: <strong>1.25x</strong>
      </td></tr>
      </>}

      {/* ═══ § 4. FINANCING COST ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s4:!p.s4}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#dc2626",background:"#fef2f2",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ef4444",userSelect:"none"}}>{secOpen.s4?"▶":"▼"} {ar?"4. تكلفة التمويل":"4. FINANCING COST"}</td></tr>
      {!secOpen.s4 && <>
      <CFRow label={ar?"إجمالي الفوائد":"Total Interest Paid"} values={pf.interest} total={pf.totalInterest||0} color="#ef4444" />
      {(pf.upfrontFee||0) > 0 && <tr style={{background:"#fef2f2"}}><td style={{...tdSt,position:"sticky",left:0,background:"#fef2f2",zIndex:1,fontSize:10,color:"#9ca3af",paddingInlineStart:20,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* includes upfront fee"}: {fmt(pf.upfrontFee)}</td><td colSpan={years.length+1}></td></tr>}
      {/* As % of dev cost */}
      <tr style={{background:"#fef2f2"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fef2f2",zIndex:1,fontSize:10,color:"#dc2626",fontWeight:600,paddingInlineStart:10}}>{ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost"}</td>
        <td style={{...tdN,fontWeight:700,color:"#dc2626"}}>{pf.devCostInclLand>0?fmtPct(totalFinCost/pf.devCostInclLand*100):""}</td>
        <td colSpan={years.length}></td>
      </tr>
      </>}

      {/* ═══ § 5. NET CASH FLOW & DEVELOPER RETURNS ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s5:!p.s5}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#e0e7ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #1e3a5f",userSelect:"none"}}>{secOpen.s5?"▶":"▼"} {ar?"5. صافي التدفق وعوائد المطور":"5. NET CASH FLOW & DEVELOPER RETURNS"}</td></tr>
      {!secOpen.s5 && <>
      <CFRow label={ar?"= صافي التدفق (بعد التمويل)":"= Levered Net Cash Flow"} values={pf.leveredCF} total={devNetCF} bold />
      {/* Cumulative */}
      {(() => { let cum=0; const cumArr=pf.leveredCF.map(v=>{cum+=v;return cum;}); return <tr style={{background:"#fffbeb"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:isMobile?120:200}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cumArr[y]<0?"#ef4444":"#16a34a"}}>{fmt(cumArr[y])}</td>)}
      </tr>; })()}
      {/* Cash Yield */}
      {pf.totalEquity > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>{ar?"عائد نقدي %":"Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const inc=pc.income[y]||0;const eq=pf.totalEquity;const v=eq>0&&inc>0?inc/eq:0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
      {/* IRR / NPV summary row */}
      <tr style={{background:"#e0e7ff"}}>
        <td colSpan={years.length+2} style={{padding:"8px 12px",fontSize:11}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontWeight:700,color:"#1e3a5f"}}>{ar?"مؤشرات المطور":"Developer Metrics"}:</span>
            {isLongHold
              ? <span>{ar?"عائد نقدي":"Cash Yield"} <strong style={{color:"#f59e0b"}}>{cashOnCash>0?fmtPct(cashOnCash*100):"—"}</strong></span>
              : <span>{ar?"عائد بسيط":"Simple"} <strong style={{color:"#f59e0b"}}>{bankSimpleROE?fmtPct(bankSimpleROE*100):"—"}</strong> <span style={{fontSize:9,color:"#6b7080"}}>({ar?"سنوي":"ann."} {bankSimpleAnnual?fmtPct(bankSimpleAnnual*100):"—"})</span></span>
            }
            <span>IRR <strong style={{color:getMetricColor("IRR",pf.leveredIRR)}}>{pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"N/A"}</strong></span>
            <span>{ar?"استرداد":"Payback"} <strong style={{color:"#2563eb"}}>{paybackLev?`${paybackLev} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
            <span>NPV@12% <strong style={{color:"#2563eb"}}>{fmtM(calcNPV(pf.leveredCF,0.12))}</strong></span>
          </div>
        </td>
      </tr>
      </>}

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// INCOME FUND RESULTS VIEW - For incomeFund mode
// ═══════════════════════════════════════════════════════════════
function IncomeFundResultsView({ project, results, financing, waterfall, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [showChart, setShowChart] = useState(true);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);

  if (!financing || !waterfall) return <div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>{ar?"اضبط إعدادات التمويل":"Configure financing settings"}</div>;

  const w = waterfall;
  const f = financing;
  const c = results.consolidated;
  const h = project.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const cur = project.currency || "SAR";
  const targetYield = (project.targetYield || 8) / 100;
  const fundLife = project.fundLife || 5;
  const distFreq = {annual:ar?"سنوي":"Annual",semi:ar?"نصف سنوي":"Semi-annual",quarterly:ar?"ربع سنوي":"Quarterly"}[project.distributionFrequency||"semi"]||"";

  // KPI badge helper
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c:clr,bold:b}) => <><span style={{color:"#6b7080",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:clr||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#9ca3af",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;

  // Distribution yield chart data
  const chartData = years.map(y => ({
    year: sy + y,
    yield: (w.distributionYield?.[y] || 0) * 100,
    target: targetYield * 100,
    nav: (w.navEstimate?.[y] || 0) / 1e6,
  }));

  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"#f8f9fb"} : {};
    const nc = v => { if(color) return color; return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ INCOME FUND HEADER ═══ */}
    <div style={{background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",borderRadius:12,padding:"16px 20px",marginBottom:16,border:"1px solid #86efac"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <span style={{fontSize:20}}>💰</span>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#065f46"}}>{ar?"صندوق مدر للدخل":"Income Fund"}</div>
          <div style={{fontSize:11,color:"#059669"}}>{distFreq} · {fundLife} {ar?"سنوات":"years"} · {ar?"مستهدف":"Target"} {(targetYield*100).toFixed(0)}%</div>
        </div>
      </div>
      {/* KPI badges */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {badge(ar?"عائد فعلي":"Actual Yield", w.avgDistYield ? (w.avgDistYield*100).toFixed(1)+"%" : "—", w.avgDistYield >= targetYield ? "#059669" : "#f59e0b")}
        {badge("DPI", w.lpDPI ? w.lpDPI.toFixed(2)+"x" : "—", "#2563eb")}
        {badge(ar?"تراكمي":"Cumulative", fmtM(w.cumDistributions?.[h-1] || 0), "#7c3aed")}
        {badge(ar?"رسوم":"Fees", fmtM(w.totalFees), "#ef4444")}
        {w.lpIRR !== null && badge("IRR", fmtPct(w.lpIRR*100), "#1e3a5f")}
      </div>
    </div>

    {/* ═══ KPI DETAIL CARDS ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* Distribution Performance */}
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #86efac",borderTop:"3px solid #059669",padding:"12px 16px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:8}}>{ar?"أداء التوزيعات":"Distribution Performance"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
          <KR l={ar?"العائد المستهدف":"Target Yield"} v={(targetYield*100).toFixed(1)+"%"} c="#6b7080" />
          <KR l={ar?"العائد الفعلي (متوسط)":"Actual Yield (avg)"} v={w.avgDistYield?(w.avgDistYield*100).toFixed(1)+"%":"—"} c={w.avgDistYield>=targetYield?"#059669":"#f59e0b"} bold />
          <SecHd text={ar?"توزيعات المستثمر":"INVESTOR DISTRIBUTIONS"} />
          <KR l={ar?"إجمالي التوزيعات":"Total Distributions"} v={fmtM(w.lpTotalDist)} c="#059669" bold />
          <KR l={ar?"إجمالي المساهمة":"Total Invested"} v={fmtM(w.lpTotalCalled)} />
          <KR l="DPI" v={w.lpDPI?w.lpDPI.toFixed(2)+"x":"—"} c="#2563eb" bold />
          {w.lpIRR !== null && <KR l="IRR" v={fmtPct(w.lpIRR*100)} c="#1e3a5f" bold />}
        </div>
      </div>

      {/* Fund Structure */}
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #93c5fd",borderTop:"3px solid #2563eb",padding:"12px 16px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#2563eb",marginBottom:8}}>{ar?"هيكل الصندوق":"Fund Structure"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
          <KR l={ar?"حجم الصندوق":"Fund Size"} v={fmtM(f.devCostInclLand)} bold />
          <KR l={ar?"الملكية":"Equity"} v={fmtM(f.totalEquity)} c="#2563eb" />
          {f.totalDebt > 0 && <KR l={ar?"الدين":"Debt"} v={fmtM(f.totalDebt)} c="#ef4444" />}
          {f.totalDebt > 0 && <KR l="LTV" v={fmtPct((f.totalDebt/f.devCostInclLand)*100)} />}
          <SecHd text={ar?"الرسوم":"FEES"} />
          <KR l={ar?"إجمالي الرسوم":"Total Fees"} v={fmtM(w.totalFees)} c="#ef4444" />
          <KR l={ar?"رسوم/ملكية":"Fees/Equity"} v={f.totalEquity>0?fmtPct(w.totalFees/f.totalEquity*100):"—"} />
        </div>
      </div>

      {/* NAV Estimate */}
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #fde68a",borderTop:"3px solid #f59e0b",padding:"12px 16px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",marginBottom:8}}>{ar?"تقدير القيمة":"NAV Estimate"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
          {(() => {
            const lastStableIdx = Math.min(h-1, (f.constrEnd||0) + 5);
            const nav = w.navEstimate?.[lastStableIdx] || 0;
            const debt = f.debtBalClose?.[lastStableIdx] || 0;
            return <>
              <KR l={ar?"قيمة الأصول":"Asset Value"} v={fmtM(nav)} c="#f59e0b" bold />
              {debt > 0 && <KR l={ar?"(-) الدين":"(-) Debt"} v={fmtM(debt)} c="#ef4444" />}
              <KR l={ar?"صافي القيمة (NAV)":"Net Asset Value"} v={fmtM(nav - debt)} c={nav-debt>0?"#059669":"#ef4444"} bold />
              <KR l={ar?"NAV / ملكية":"NAV / Equity"} v={f.totalEquity>0?((nav-debt)/f.totalEquity).toFixed(2)+"x":"—"} c={(nav-debt)>f.totalEquity?"#059669":"#ef4444"} />
            </>;
          })()}
        </div>
      </div>
    </div>

    {/* ═══ DISTRIBUTION YIELD CHART ═══ */}
    {showChart && chartData.length > 2 && (
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:"#1a1d23",marginBottom:8}}>{ar?"عائد التوزيعات السنوي":"Annual Distribution Yield"}</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{top:5,right:10,left:0,bottom:5}}>
            <defs>
              <linearGradient id="yieldBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.15}/><stop offset="95%" stopColor="#059669" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
            <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
            <YAxis tick={{fontSize:10,fill:"#6b7080"}} unit="%" domain={[0,'auto']} />
            <Tooltip formatter={v=>v.toFixed(1)+"%"} />
            <ReferenceLine y={targetYield*100} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{value:`${(targetYield*100).toFixed(0)}% ${ar?"مستهدف":"target"}`,position:"right",fontSize:9,fill:"#f59e0b"}} />
            <Area type="monotone" dataKey="yield" stroke="#059669" strokeWidth={2.5} fill="url(#yieldBG)" name={ar?"عائد التوزيعات":"Dist. Yield"} dot={{fill:"#059669",r:3}} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}

    {/* ═══ DISTRIBUTION SCHEDULE TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"جدول التوزيعات":"Distribution Schedule"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:11}}>
        {[10,15,20,30].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* Income */}
      <CFRow label={ar?"الدخل التشغيلي":"Operating Income"} values={c.income} total={c.totalIncome} color="#16a34a" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      <CFRow label={ar?"(-) الرسوم":"(-) Total Fees"} values={w.fees} total={w.totalFees} negate color="#ef4444" />
      {f.totalDebt > 0 && <CFRow label={ar?"(-) خدمة الدين":"(-) Debt Service"} values={f.debtService} total={f.debtService.reduce((a,b)=>a+b,0)} negate color="#ef4444" />}
      <CFRow label={ar?"= النقد المتاح للتوزيع":"= Cash Available"} values={w.cashAvail} total={w.cashAvail.reduce((a,b)=>a+b,0)} bold color="#059669" />

      {/* Distributions */}
      <tr><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#059669",background:"#ecfdf5",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #059669"}}>{ar?"التوزيعات":"DISTRIBUTIONS"}</td></tr>
      <CFRow label={ar?"توزيعات المستثمر":"Investor Distributions"} values={w.lpDist} total={w.lpTotalDist} color="#8b5cf6" bold />
      <CFRow label={ar?"توزيعات المطور":"Developer Distributions"} values={w.gpDist} total={w.gpTotalDist} color="#3b82f6" />

      {/* Yield row */}
      {w.distributionYield && <tr style={{background:"#ecfdf5"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#ecfdf5",zIndex:1,fontWeight:700,color:"#059669",fontSize:11}}>{ar?"عائد التوزيعات %":"Distribution Yield %"}</td>
        <td style={{...tdN,fontWeight:700,color:"#059669"}}>{w.avgDistYield?(w.avgDistYield*100).toFixed(1)+"%":""}</td>
        {years.map(y=>{const v=(w.distributionYield[y]||0)*100;const ok=v>=targetYield*100;return <td key={y} style={{...tdN,fontWeight:700,color:v>0?(ok?"#059669":"#f59e0b"):"#d0d4dc",background:v>0?(ok?"#f0fdf4":"#fffbeb"):"transparent"}}>{v>0?v.toFixed(1)+"%":"—"}</td>;})}
      </tr>}

      {/* Cumulative */}
      {w.cumDistributions && <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontWeight:600,fontSize:10,color:"#065f46"}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:"#059669"}}>{(w.cumDistributions[y]||0)>0?fmtM(w.cumDistributions[y]):"—"}</td>)}
      </tr>}

    </tbody></table></div>
    </div>
  </div>);
}

// ── Tip: tooltip component used by FL ──
function Tip({text,children}) {
  const isMobile = useIsMobile();
  const [show,setShow]=useState(false);
  const ref=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  const onEnter=()=>{
    if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+6,left:r.left+r.width/2});}
    setShow(true);
  };
  useEffect(()=>{ if(show && isMobile){ const t=setTimeout(()=>setShow(false),4000); return ()=>clearTimeout(t); } },[show,isMobile]);
  return <span style={{display:"inline-flex",alignItems:"center"}}>
    {children}
    <span ref={ref} onMouseEnter={isMobile?undefined:onEnter} onMouseLeave={isMobile?undefined:()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{cursor:"help",fontSize:isMobile?13:10,color:"#9ca3af",marginInlineStart:3,lineHeight:1,padding:isMobile?"4px":0}}>ⓘ</span>
    {show&&<>{isMobile&&<div onClick={()=>setShow(false)} style={{position:"fixed",inset:0,zIndex:99998}} />}<div style={{position:"fixed",top:pos.top,...(document.dir==="rtl"?{right:Math.max(10,Math.min(window.innerWidth-pos.left-140,window.innerWidth-300))}:{left:Math.max(10,Math.min(pos.left-140,window.innerWidth-300))}),width:isMobile?Math.min(280,window.innerWidth-24):280,background:"#1a1d23",color:"#d0d4dc",padding:isMobile?"12px 14px":"10px 13px",borderRadius:8,fontSize:isMobile?12:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start"}}>{text.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?4:0}}>{line}</div>)}</div></>}
  </span>;
}

// ── Financing Panel Input Components (MUST be outside FinancingView to keep focus) ──
const _finInpSt = {padding:"8px 11px",borderRadius:7,border:"1px solid #e0e3ea",background:"#f8f9fb",color:"#1a1d23",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s"};
const _finSelSt = {..._finInpSt,cursor:"pointer",appearance:"auto"};
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


export { SelfResultsView, BankResultsView, IncomeFundResultsView, FieldGroup, FL, Inp, Drp };
export default ResultsView;
// build-bust: 1774662598
