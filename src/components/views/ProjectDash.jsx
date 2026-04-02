// Extracted from App.jsx lines 5859-6320
// ProjectDash: Dashboard overview with KPIs, checklist, summaries

import { useState, useMemo } from "react";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { btnS, btnPrim, tblStyle, thSt, tdSt, tdN } from "../shared/styles";
import { calcIRR, calcNPV } from "../../engine/math";
import { catL, revL } from "../../data/translations";
import { HelpLink, EducationalModal } from "./LearningCenterView";
import { catL, revL } from "../../data/translations";
import { calcIRR, calcNPV } from "../../engine/math";
import { getMetricColor } from "../../utils/metricColor.js";

function ProjectDash({ project, results, checks, t, financing, phaseFinancings, onGoToAssets, lang, incentivesResult, setActiveTab }) {
  if (!project || !results) return null;
  const isMobile = useIsMobile();
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const rawC = results.consolidated;
  const cur = project.currency || "SAR";
  const allPhases = Object.entries(results.phaseResults);
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const failedChecks = checks.filter(ch => !ch.pass).length;

  // ── Filtered consolidated: aggregate selected phases only ──
  const c = useMemo(() => {
    if (!isFiltered) return rawC;
    const hLen = results.horizon;
    const income = new Array(hLen).fill(0), capex = new Array(hLen).fill(0), landRent = new Array(hLen).fill(0), netCF = new Array(hLen).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < hLen; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    const totalCapex = capex.reduce((a,b)=>a+b,0);
    const totalIncome = income.reduce((a,b)=>a+b,0);
    const totalLandRent = landRent.reduce((a,b)=>a+b,0);
    const totalNetCF = netCF.reduce((a,b)=>a+b,0);
    let pbCum = 0, pbYr = null, pbNeg = false, peakNeg = 0, peakNegY = null;
    for (let y = 0; y < hLen; y++) { pbCum += netCF[y]; if (pbCum < -1) pbNeg = true; if (pbNeg && pbCum >= 0 && pbYr === null) pbYr = y + 1; if (pbCum < peakNeg) { peakNeg = pbCum; peakNegY = y; } }
    return { ...rawC, income, capex, landRent, netCF, totalCapex, totalIncome, totalLandRent, totalNetCF,
      irr: calcIRR(netCF),
      npv10: calcNPV(netCF, 0.10),
      npv12: calcNPV(netCF, 0.12),
      npv14: calcNPV(netCF, 0.14),
      paybackYear: pbYr, peakNegative: peakNeg, peakNegativeYear: peakNegY,
    };
  }, [isFiltered, selectedPhases, results, rawC]);

  // ── Filtered financing: aggregate selected phase financings ──
  const f = useMemo(() => {
    if (!isFiltered || !phaseFinancings) return financing;
    const pfs = activePh.map(p => phaseFinancings[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const totalDebt = pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0);
    const totalEquity = pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0);
    const totalInterest = pfs.reduce((s,pf) => s + (pf.totalInterest||0), 0);
    const devCostExclLand = pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0);
    const devCostInclLand = pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0);
    const totalProjectCost = pfs.reduce((s,pf) => s + (pf.totalProjectCost||pf.devCostInclLand||0), 0);
    const landCapValue = pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0);
    const capitalizedFinCosts = pfs.reduce((s,pf) => s + (pf.capitalizedFinCosts||0), 0);
    const h = results.horizon;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.leveredCF) for (let y=0;y<h;y++) leveredCF[y] += pf.leveredCF[y]||0; });
    const gpEquity = pfs.reduce((s,pf) => s + (pf.gpEquity||0), 0);
    const lpEquity = pfs.reduce((s,pf) => s + (pf.lpEquity||0), 0);
    const exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.exitProceeds) for (let y=0;y<h;y++) exitProceeds[y] += pf.exitProceeds[y]||0; });
    return { ...financing, totalDebt, totalEquity, totalInterest, devCostExclLand, devCostInclLand, totalProjectCost, landCapValue, capitalizedFinCosts, leveredCF, gpEquity, lpEquity, exitProceeds,
      leveredIRR: calcIRR(leveredCF),
      interestSubsidyTotal: pfs.reduce((s,pf) => s + (pf.interestSubsidyTotal||0), 0),
    };
  }, [isFiltered, selectedPhases, financing, phaseFinancings, results]);

  const h = results.horizon;
  const ar = lang === "ar";
  const hasAssets = (project.assets||[]).length > 0;
  const ir = incentivesResult;

  const hasIncentives = (ir && ir.totalIncentiveValue > 0) || (ir && ir.finSupportEstimate) || (f && f.interestSubsidyTotal > 0);
  const displayIRR = (ir && ir.totalIncentiveValue > 0 && ir.adjustedIRR !== null && !isFiltered) ? ir.adjustedIRR : c.irr;
  const displayNPV10 = (ir && ir.totalIncentiveValue > 0 && !isFiltered) ? ir.adjustedNPV10 : c.npv10;
  const displayTotalNetCF = (ir && ir.totalIncentiveValue > 0 && !isFiltered) ? ir.adjustedTotalNetCF : c.totalNetCF;

  let cumCF = 0, paybackYr = null, _pbNeg = false;
  for (let y = 0; y < h; y++) { cumCF += c.netCF[y]; if (cumCF < -1) _pbNeg = true; if (cumCF > 0 && _pbNeg && paybackYr === null) paybackYr = y + 1; }
  const stabYear = Math.min(10, h - 1);
  const cashYield = f && f.totalEquity > 0 ? (c.income[stabYear] / f.totalEquity * 100) : null;

  // ── Getting Started Guide (no assets) ──
  if (!hasAssets) {
    return (<div>
      <div style={{background:"linear-gradient(135deg, #0f766e08, #1e40af12)",borderRadius:16,border:"1px solid #2563eb20",padding:"32px 28px",textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:12}}>🚀</div>
        <div style={{fontSize:20,fontWeight:700,color:"#1a1d23",marginBottom:8}}>{ar?"مشروعك جاهز. هذه هي الخطوة التالية":"Your Project is Ready! Next Step"}</div>
        <div style={{fontSize:13,color:"#6b7080",marginBottom:24,maxWidth:480,margin:"0 auto 24px"}}>{ar?"أضف أصول مشروعك (محلات، فنادق، مكاتب، سكني...) عشان تبدأ تشوف الأرقام والتحليلات":"Add your project assets (retail, hotels, offices, residential...) to start seeing numbers and analytics"}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGoToAssets} style={{...btnPrim,padding:"12px 28px",fontSize:14,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>➕</span> {ar?"أضف أصل الآن":"Add Asset Now"}
          </button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:14}}>
        {[
          {icon:"1️⃣",title:ar?"أضف الأصول":"Add Assets",desc:ar?"عرّف كل أصل: نوعه، مساحته، تكلفته، إيراداته":"Define each asset: type, area, cost, revenue",done:false},
          {icon:"2️⃣",title:ar?"راجع الأرقام":"Review Numbers",desc:ar?"شوف التدفقات النقدية، IRR، NPV في لوحة التحكم":"Check cash flows, IRR, NPV in the dashboard",done:false},
          {icon:"3️⃣",title:ar?"اضبط التمويل":"Configure Financing",desc:ar?"عدّل شروط الدين والتمويل من الشريط الجانبي":"Adjust debt terms and financing from sidebar",done:project.finMode!=="self"},
          {icon:"4️⃣",title:ar?"صدّر التقارير":"Export Reports",desc:ar?"حمّل تقارير البنك والمستثمرين بصيغة PDF أو Excel":"Download bank and investor reports as PDF or Excel",done:false},
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px",opacity:s.done?0.7:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:s.done?"#16a34a":"#1a1d23"}}>{s.title}{s.done?" ✓":""}</span>
            </div>
            <div style={{fontSize:11,color:"#6b7080",lineHeight:1.5}}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>);
  }

  // ── Health score ──
  const irrVal = displayIRR || 0;
  const health = irrVal > 0.15 ? 'strong' : irrVal > 0.10 ? 'good' : irrVal > 0.05 ? 'moderate' : 'weak';
  const healthColor = {strong:'#16a34a',good:'#22c55e',moderate:'#f59e0b',weak:'#ef4444'}[health];
  const healthLabel = {strong:ar?'قوي':'Strong',good:ar?'جيد':'Good',moderate:ar?'متوسط':'Moderate',weak:ar?'ضعيف':'Weak'}[health];

  // ── Sources & Uses (read from financing object — single source of truth) ──
  const totalDebt = f ? f.totalDebt || 0 : 0;
  const totalEquity = f ? f.totalEquity || 0 : 0;
  const landCap = f ? f.landCapValue || 0 : 0;
  const grantTotal = ir ? ir.capexGrantTotal || 0 : 0;
  // devCostExclLand = construction CAPEX (includes land purchase for purchase type)
  // devCostInclLand = devCostExclLand + landCapValue (the real "total uses" base)
  // totalProjectCost = devCostInclLand + capitalizedFinCosts (when IDC is capitalized)
  const devCostExcl = f ? f.devCostExclLand || c.totalCapex : c.totalCapex;
  const devCostIncl = f ? (f.totalProjectCost || f.devCostInclLand || c.totalCapex) : c.totalCapex;

  // ── Cash flow chart data (SVG bars) ──
  const chartYears = Math.min(20, h);
  const maxVal = Math.max(...c.income.slice(0, chartYears), ...c.capex.slice(0, chartYears), 1);
  const minCF = Math.min(...c.netCF.slice(0, chartYears), 0);
  const maxCF = Math.max(...c.netCF.slice(0, chartYears), 1);
  const cfRange = Math.max(maxCF, Math.abs(minCF), 1);

  return (<div>
    {/* ═══ Progress Tracker (shows until user completes key steps) ═══ */}
    {(() => {
      const steps = [
        { id:"assets", labelAr:"إضافة أصول", labelEn:"Add Assets", done: (project.assets||[]).length > 0, tab:"assets" },
        { id:"review", labelAr:"مراجعة التدفقات", labelEn:"Review Cash Flows", done: (project.assets||[]).length >= 2 && c.totalCapex > 0, tab:"cashflow" },
        { id:"financing", labelAr:"إعداد التمويل", labelEn:"Setup Financing", done: project.finMode !== "self" || (f && f.totalDebt > 0), tab:"financing" },
        { id:"export", labelAr:"تصدير التقارير", labelEn:"Export Reports", done: false, tab:"reports" },
      ];
      const doneCount = steps.filter(s => s.done).length;
      if (doneCount >= 3) return null;
      return (
        <div style={{background:"rgba(46,196,182,0.04)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:12,padding:"14px 20px",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:600,color:"#0f766e"}}>{ar?`${doneCount}/4 خطوات مكتملة`:`${doneCount}/4 steps complete`}</span>
            <div style={{flex:1,height:4,background:"rgba(0,0,0,0.06)",borderRadius:2}}>
              <div style={{width:`${(doneCount/4)*100}%`,height:"100%",background:"linear-gradient(90deg,#0f766e,#2EC4B6)",borderRadius:2,transition:"width 0.4s ease"}} />
            </div>
          </div>
          <div style={{display:"flex",gap:isMobile?8:10,flexWrap:"wrap"}}>
            {steps.map((step,i) => (
              <button key={step.id} onClick={()=>setActiveTab(step.tab)} style={{flex:1,minWidth:isMobile?120:140,padding:"10px 12px",background:step.done?"rgba(16,185,129,0.06)":"#fff",border:`1px solid ${step.done?"rgba(16,185,129,0.25)":"#e5e7ec"}`,borderRadius:8,cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}}
                onMouseEnter={e=>{if(!step.done){e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.background="rgba(46,196,182,0.04)";}}}
                onMouseLeave={e=>{if(!step.done){e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.background="#fff";}}}>
                <div style={{fontSize:16,marginBottom:4}}>{step.done?"✅":`${i+1}`}</div>
                <div style={{fontSize:11,fontWeight:step.done?600:500,color:step.done?"#16a34a":"#4b5060"}}>{ar?step.labelAr:step.labelEn}</div>
              </button>
            ))}
          </div>
        </div>
      );
    })()}
    {/* ═══ PHASE FILTER (multi-select) ═══ */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"#6b7080",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${phaseNames.length} مراحل`:`Showing ${activePh.length} of ${phaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* ═══ SECTION 1: Decision Summary ═══ */}
    <div style={{background:`linear-gradient(135deg, ${healthColor}08, ${healthColor}18)`,borderRadius:14,border:`2px solid ${healthColor}30`,padding:isMobile?"16px 14px":"22px 26px",marginBottom:20,display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?14:20,flexWrap:"wrap"}}>
      {/* Health badge */}
      <div style={{textAlign:"center",minWidth:90}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${healthColor}18`,border:`3px solid ${healthColor}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}>
          <span style={{fontSize:26,fontWeight:800,color:healthColor}}>{irrVal > 0 ? (irrVal*100).toFixed(0)+"%" : "—"}</span>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:healthColor,textTransform:"uppercase",letterSpacing:0.6}}>{healthLabel}</div>
        <div style={{fontSize:9,color:"#6b7080"}}>IRR (Unlevered)</div>
      </div>
      {/* Key numbers */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:12}}>
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"صافي القيمة الحالية":"NPV @10%"}</div>
          <div style={{fontSize:20,fontWeight:800,color:displayNPV10>0?"#16a34a":"#ef4444"}}>{fmtM(displayNPV10)}</div>
          <div style={{fontSize:10,color:"#9ca3af"}}>{cur}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"إجمالي التكاليف":"Total CAPEX"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1a1d23"}}>{fmtM(hasIncentives&&!isFiltered?(c.totalCapex-grantTotal):c.totalCapex)}</div>
          <div style={{fontSize:10,color:"#9ca3af"}}>{cur}{hasIncentives&&!isFiltered?` (${ar?"بعد المنحة":"net of grant"})`:""}</div>
        </div>
        {f && f.mode !== "self" && <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"IRR بعد التمويل":"Levered IRR"}</div>
          <div style={{fontSize:20,fontWeight:800,color:getMetricColor("IRR",f.leveredIRR)}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(1)+"%":"N/A"}</div>
        </div>}
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"فترة الاسترداد":"Payback"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>{paybackYr ? (ar?`${paybackYr} سنة`:`Yr ${paybackYr}`) : "N/A"}</div>
          {paybackYr && <div style={{fontSize:10,color:"#9ca3af"}}>{results.startYear + paybackYr - 1}</div>}
        </div>
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"الفحوصات":"Checks"}</div>
          <div style={{fontSize:20,fontWeight:800,color:failedChecks===0?"#16a34a":"#ef4444"}}>{failedChecks===0?(ar?"✓ سليم":"✓ Pass"):`${failedChecks} ✗`}</div>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 1.5: Financial Metrics Help ═══ */}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ SECTION 2: Sources & Uses + Key Metrics ═══ */}
    <div style={{display:"grid",gridTemplateColumns:f&&f.mode!=="self"?(isMobile?"1fr":"1fr 1fr"):"1fr",gap:14,marginBottom:20}}>
      {/* Sources & Uses */}
      {f && f.mode !== "self" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15}}>💰</span> {ar?"مصادر واستخدامات التمويل":"Sources & Uses"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Sources */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#16a34a",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                {totalDebt > 0 && [<span key="dl" style={{color:"#6b7080"}}>{ar?"قرض بنكي":"Bank Debt"}</span>,<span key="dv" style={{textAlign:"right",fontWeight:500}}>{fmtM(totalDebt)}</span>]}
                <span style={{color:"#6b7080"}}>{ar?"حقوق ملكية":"Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(totalEquity)}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(totalDebt + totalEquity)}</span>
                {grantTotal > 0 && !isFiltered && [<span key="gl" style={{color:"#16a34a",fontSize:10,fontStyle:"italic"}}>{ar?"* تم خصم منحة حكومية":"* CAPEX grant deducted"}: {fmtM(grantTotal)}</span>]}
              </div>
              {/* LTV bar */}
              {totalDebt > 0 && (() => {
                const ltv = (totalDebt / (totalDebt + totalEquity) * 100);
                return <div style={{marginTop:10}}>
                  <div style={{fontSize:10,color:"#6b7080",marginBottom:3}}>LTV: {ltv.toFixed(0)}%</div>
                  <div style={{height:6,borderRadius:3,background:"#f0f1f5",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ltv}%`,background:getMetricColor("LTV",ltv),borderRadius:3}} />
                  </div>
                </div>;
              })()}
            </div>
            {/* Uses */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#ef4444",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fee2e2"}}>{ar?"الاستخدامات":"USES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                <span style={{color:"#6b7080"}}>{ar?"تكاليف البناء":"Construction"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(devCostExcl)}</span>
                {landCap > 0 && [<span key="cl" style={{color:"#6b7080"}}>{ar?"رسملة الأرض":"Land Cap."}</span>,<span key="cv" style={{textAlign:"right",fontWeight:500}}>{fmtM(landCap)}</span>]}
                {f && f.capitalizedFinCosts > 0 && [<span key="il" style={{color:"#6b7080"}}>{ar?"تكاليف تمويل مرسملة":"Capitalized IDC"}</span>,<span key="iv" style={{textAlign:"right",fontWeight:500}}>{fmtM(f.capitalizedFinCosts)}</span>]}
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(devCostIncl)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 20px"}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:15}}>📊</span> {ar?"المؤشرات الرئيسية":"Key Metrics"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:10}}>
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"إجمالي الإيرادات":"Total Income"} ({h}{ar?" سنة":"yr"})</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16a34a"}}>{fmtM(c.totalIncome)}</div>
          </div>
          <div style={{background:displayTotalNetCF>=0?"#f0fdf4":"#fef2f2",borderRadius:8,padding:"10px 12px",border:`1px solid ${displayTotalNetCF>=0?"#dcfce7":"#fee2e2"}`}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"صافي التدفق":"Net CF"}{hasIncentives&&!isFiltered?` (${ar?"+حوافز":"+inc."})`:""}</div>
            <div style={{fontSize:16,fontWeight:700,color:displayTotalNetCF>=0?"#16a34a":"#ef4444"}}>{fmtM(displayTotalNetCF)}</div>
          </div>
          {f && f.mode !== "self" && <>
            <div style={{background:"#fffbeb",borderRadius:8,padding:"10px 12px",border:"1px solid #fef3c7"}}>
              <div style={{fontSize:10,color:"#6b7080"}}>{ar?"إجمالي الدين":"Total Debt"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#f59e0b"}}>{fmtM(totalDebt)}</div>
            </div>
            <div style={{background:"#f5f3ff",borderRadius:8,padding:"10px 12px",border:"1px solid #ede9fe"}}>
              <div style={{fontSize:10,color:"#6b7080"}}>{ar?"إجمالي الفوائد":"Total Interest"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#8b5cf6"}}>{fmtM(f.totalInterest)}</div>
            </div>
          </>}
          {cashYield !== null && <div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",border:"1px solid #dbeafe"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"العائد النقدي":"Cash Yield"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#2563eb"}}>{fmtPct(cashYield)}</div>
          </div>}
          {hasIncentives && !isFiltered && ir && <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",border:"1px solid #bbf7d0"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"قيمة الحوافز":"Incentive Value"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16a34a"}}>{fmtM(ir.totalIncentiveValue + (f?.interestSubsidyTotal||0))}</div>
          </div>}
        </div>
        {/* Land info compact */}
        <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #f0f1f5",display:"flex",gap:16,fontSize:11,color:"#6b7080",flexWrap:"wrap"}}>
          <span>{ar?"الأرض":"Land"}: <strong>{({lease:ar?"إيجار":"Lease",purchase:ar?"شراء":"Purchase",partner:ar?"شراكة":"Partner",bot:"BOT"})[project.landType]||project.landType}</strong></span>
          <span>{ar?"المساحة":"Area"}: <strong>{fmt(project.landArea)} m²</strong></span>
          {project.landType==="lease"&&<span>{ar?"إيجار سنوي":"Annual"}: <strong>{fmt(project.landRentAnnual)} {cur}</strong></span>}
          {project.landType==="purchase"&&<span>{ar?"السعر":"Price"}: <strong>{fmt(project.landPurchasePrice)} {cur}</strong></span>}
          {project.landType==="lease"&&<span>{ar?"إجمالي الإيجار":"Total Rent"}: <strong style={{color:"#ef4444"}}>{fmt(c.totalLandRent)} {cur}</strong></span>}
          <span>{ar?"الأصول":"Assets"}: <strong>{project.assets.length}</strong></span>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 3: Cash Flow Chart (SVG) ═══ */}
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 20px",marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>📈</span> {ar?"التدفق النقدي السنوي":"Annual Cash Flow"}
        <span style={{fontSize:10,color:"#9ca3af",marginInlineStart:"auto"}}>{ar?`أول ${chartYears} سنة`:`First ${chartYears} years`}</span>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:16,marginBottom:10,fontSize:11}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#ef4444",display:"inline-block"}} />{ar?"التكاليف":"CAPEX"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#22c55e",display:"inline-block"}} />{ar?"الإيرادات":"Revenue"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:3,borderRadius:2,background:"#3b82f6",display:"inline-block"}} />{ar?"صافي التدفق":"Net CF"}</span>
      </div>
      <svg viewBox={`0 0 ${chartYears * 42 + 20} 180`} style={{width:"100%",height:180}}>
        {/* Grid lines */}
        <line x1="20" y1="90" x2={chartYears*42+20} y2="90" stroke="#e5e7ec" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="20" y1="10" x2={chartYears*42+20} y2="10" stroke="#f0f1f5" strokeWidth="0.5" />
        <line x1="20" y1="170" x2={chartYears*42+20} y2="170" stroke="#f0f1f5" strokeWidth="0.5" />
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42;
          const capH = maxVal > 0 ? (c.capex[y] / maxVal) * 75 : 0;
          const incH = maxVal > 0 ? (c.income[y] / maxVal) * 75 : 0;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <g key={y}>
            {/* CAPEX bar (red, going down from center) */}
            {c.capex[y] > 0 && <rect x={x} y={90} width={16} height={capH} fill="#ef444440" rx="2" stroke="#ef4444" strokeWidth="0.5" />}
            {/* Income bar (green, going up from center) */}
            {c.income[y] > 0 && <rect x={x+18} y={90-incH} width={16} height={incH} fill="#22c55e40" rx="2" stroke="#22c55e" strokeWidth="0.5" />}
            {/* Year label */}
            {y % (chartYears > 15 ? 3 : 2) === 0 && <text x={x+17} y={178} fontSize="8" fill="#9ca3af" textAnchor="middle">{y+1}</text>}
          </g>;
        })}
        {/* Net CF line */}
        <polyline
          fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"
          points={Array.from({length:chartYears}).map((_,y) => {
            const x = 20 + y * 42 + 17;
            const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
            return `${x},${cfY}`;
          }).join(' ')}
        />
        {/* Net CF dots */}
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42 + 17;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <circle key={y} cx={x} cy={cfY} r="2.5" fill="#3b82f6" />;
        })}
      </svg>
    </div>

    {/* ═══ SECTION 4: Phase Summary ═══ */}
    {allPhases.length>0&&<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏗</span> {t.phaseSummary}
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["المرحلة","الأصول","إجمالي التكاليف","إجمالي الإيرادات","إيجار الأرض","صافي التدفق","IRR","نسبة الأرض"]:["Phase","Assets","Total CAPEX","Total Income","Land Rent","Net CF","IRR","Land %"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {allPhases.map(([n,pr])=>{
          const capexPct = rawC.totalCapex > 0 ? pr.totalCapex / rawC.totalCapex * 100 : 0;
          const isHighlighted = isFiltered && activePh.includes(n);
          const isDimmed = isFiltered && !activePh.includes(n);
          return <tr key={n} style={{background:isHighlighted?"#f0fdf4":undefined,opacity:isDimmed?0.45:1,transition:"opacity 0.2s"}}>
          <td style={tdSt}><strong>{n}</strong>{isHighlighted && <span style={{marginInlineStart:4,fontSize:9,color:"#0f766e"}}>●</span>}</td>
          <td style={{...tdSt,textAlign:"center"}}>{pr.assetCount}</td>
          <td style={tdN}><div>{fmt(pr.totalCapex)}</div><div style={{height:3,borderRadius:2,background:"#f0f1f5",marginTop:3}}><div style={{height:"100%",borderRadius:2,background:"#ef4444",width:`${capexPct}%`}} /></div></td>
          <td style={tdN}>{fmt(pr.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(pr.totalLandRent)}</td>
          <td style={{...tdN,color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
          <td style={{...tdN,fontWeight:600}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</td>
          <td style={tdN}>{fmtPct(pr.allocPct*100)}</td>
        </tr>;})}
        <tr style={{background:"#f8f9fb",fontWeight:700}}>
          <td style={tdSt}>{isFiltered?(ar?"المجموع المختار":"Selected Total"):t.consolidated}</td>
          <td style={{...tdSt,textAlign:"center"}}>{isFiltered ? (project.assets||[]).filter(a=>activePh.includes(a.phase)).length : project.assets.length}</td>
          <td style={tdN}>{fmt(c.totalCapex)}</td><td style={tdN}>{fmt(c.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(c.totalLandRent)}</td>
          <td style={{...tdN,color:displayTotalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(displayTotalNetCF)}</td>
          <td style={{...tdN,fontWeight:700}}>{displayIRR!==null?fmtPct(displayIRR*100):"—"}{hasIncentives&&!isFiltered?" *":""}</td>
          <td style={tdN}></td>
        </tr>
      </tbody></table></div>
    </div>}

    {/* ═══ SECTION 4b: Market Gap Summary (if enabled) ═══ */}
    {project.market?.enabled && (() => {
      const mkt = project.market;
      const mktGaps = mkt.gaps || {};
      const mktTh = mkt.thresholds || {};
      const MSECS = ["Retail","Office","Hospitality","Residential","Marina","Industrial"];
      const getMktSup = (sec) => {
        const aa = (project.assets||[]).filter(a2 => { const c2=(a2.category||"").toLowerCase(),s2=sec.toLowerCase(); return c2.includes(s2)||(s2==="retail"&&c2.includes("commercial"))||(s2==="hospitality"&&(c2.includes("hotel")||c2.includes("resort"))); });
        if (sec==="Hospitality") return aa.reduce((s,a2)=>s+(a2.hotelPL?.keys||0),0);
        if (sec==="Marina") return aa.reduce((s,a2)=>s+(a2.marinaPL?.berths||0),0);
        return aa.reduce((s,a2)=>s+(a2.gfa||0)*((a2.efficiency||0)/100),0);
      };
      let low=0, med=0, high=0; const highNames = [];
      MSECS.forEach(sec => {
        const gap = mktGaps[sec]?.gap || 0; if (gap <= 0) return;
        const supply = getMktSup(sec); if (supply <= 0) { low++; return; }
        const pct = (supply / gap) * 100;
        const th3 = mktTh[sec] || { low: 50, med: 70 };
        if (pct > th3.med) { high++; highNames.push(catL(sec, ar)); }
        else if (pct > th3.low) { med++; }
        else { low++; }
      });
      const total = low + med + high;
      if (total === 0) return null;
      const hasRisk = high > 0;
      return (
        <div style={{background:hasRisk?"#fef2f2":"#f0fdf4",borderRadius:10,border:`1px solid ${hasRisk?"#fecaca":"#bbf7d0"}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setActiveTab("market")}>
          <span style={{fontSize:15}}>📊</span>
          <span style={{fontSize:12,fontWeight:600,color:hasRisk?"#991b1b":"#15803d"}}>{ar?"مؤشرات السوق":"Market Indicators"}</span>
          <div style={{display:"flex",gap:8,fontSize:11}}>
            {low > 0 && <span style={{color:"#16a34a",fontWeight:500}}>{low} {ar?"آمن":"safe"}</span>}
            {med > 0 && <span style={{color:"#eab308",fontWeight:500}}>{med} {ar?"متوسط":"medium"}</span>}
            {high > 0 && <span style={{color:"#ef4444",fontWeight:600}}>{high} {ar?"مرتفع":"high"}: {highNames.join(", ")}</span>}
          </div>
          <span style={{fontSize:10,color:"#9ca3af",marginInlineStart:"auto"}}>{ar?"اضغط للتفاصيل →":"Click for details →"}</span>
        </div>
      );
    })()}

    {/* ═══ SECTION 5: Asset Overview (compact) ═══ */}
    {results.assetSchedules.length>0&&(()=>{
      const filteredAssets = isFiltered ? results.assetSchedules.filter(a => activePh.includes(a.phase)) : results.assetSchedules;
      return <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏢</span> {t.assetOverview} ({filteredAssets.length}{isFiltered?` / ${results.assetSchedules.length}`:""})
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["#","الأصل","المرحلة","المساحة","التكاليف",`الإيرادات (${project.horizon}ع)`,"النوع"]:["#","Asset","Phase","GFA","CAPEX",`Income (${project.horizon}yr)`,"Type"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {filteredAssets.map((a,i)=><tr key={a.id||i}>
          <td style={{...tdSt,color:"#9ca3af",width:30}}>{i+1}</td>
          <td style={tdSt}>{a.name||"—"} <span style={{color:"#9ca3af",fontSize:10}}>({catL(a.category,ar)})</span></td>
          <td style={tdSt}>{a.phase}</td>
          <td style={tdN}>{fmt(a.gfa)}</td><td style={tdN}>{fmt(a.totalCapex)}</td>
          <td style={{...tdN,color:"#16a34a"}}>{fmt(a.totalRevenue)}</td><td style={{...tdSt,fontSize:11}}>{revL(a.revType,ar)}</td>
        </tr>)}
      </tbody></table></div>
    </div>;})()}
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ── Inline tooltip component for KPIs and table headers ──

export default ProjectDash;
