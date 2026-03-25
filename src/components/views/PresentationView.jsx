// Extracted from App.jsx lines 11768-12135
import { useState, useMemo } from "react";
import { computeProjectCashFlows } from "../../engine/cashflow.js";
import { computeIncentives } from "../../engine/incentives.js";
import { computeFinancing } from "../../engine/financing.js";
import { computeWaterfall } from "../../engine/waterfall.js";
import { fmt, fmtPct, fmtM } from "../../utils/format.js";
import { catL } from "../../data/translations.js";

// ── Metric color helpers (local copy) ──
const METRIC_COLORS = { success: "#10b981", warning: "#f59e0b", error: "#ef4444", neutral: "#6b7080", muted: "#9ca3af" };
const METRIC_COLORS_DARK = { success: "#4ade80", warning: "#fbbf24", error: "#f87171", neutral: "#8b90a0", muted: "#6b7080" };
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

// ── Mobile hook (local copy) ──
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

// ── Styles (from App.jsx lines 12138-12147) ──
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};
const btnPrim={...btnS,background:"#2563eb",color:"#fff",fontWeight:600};
const btnSm={...btnS,padding:"4px 8px",fontSize:11,fontWeight:500,borderRadius:4};
const thSt={padding:"7px 8px",textAlign:"start",fontSize:10,fontWeight:600,color:"#6b7080",background:"#f8f9fb",borderBottom:"1px solid #e5e7ec",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};

function PresentationView({ project, results, financing, waterfall, incentivesResult, lang, audienceView, liveSliders, setLiveSliders, checks }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [activePhase, setActivePhase] = useState("consolidated"); // "consolidated" or phase name
  if (!results || !project) return <div style={{textAlign:"center",padding:60,color:"#6b7080",fontSize:14}}>{ar?"لا توجد بيانات للعرض":"No data to present"}</div>;

  // ── Real Engine Recalculation when sliders change ──
  const slidersDefault = liveSliders.capex === 100 && liveSliders.rent === 100 && liveSliders.exitMult === (project.exitMultiple || 10);
  const liveProject = useMemo(() => {
    if (slidersDefault) return project;
    return { ...project, activeScenario: "Custom", customCapexMult: liveSliders.capex, customRentMult: liveSliders.rent, exitMultiple: liveSliders.exitMult };
  }, [project, liveSliders, slidersDefault]);
  const liveResults = useMemo(() => { try { return computeProjectCashFlows(liveProject); } catch(e) { console.error("PresentationView liveResults error:", e); return results; } }, [liveProject]);
  const liveIncentives = useMemo(() => { try { return computeIncentives(liveProject, liveResults); } catch(e) { return incentivesResult; } }, [liveProject, liveResults]);
  const liveFinancing = useMemo(() => { try { return computeFinancing(liveProject, liveResults, liveIncentives); } catch(e) { return financing; } }, [liveProject, liveResults, liveIncentives]);
  const liveWaterfall = useMemo(() => { try { return computeWaterfall(liveProject, liveResults, liveFinancing, liveIncentives); } catch(e) { return waterfall; } }, [liveProject, liveResults, liveFinancing, liveIncentives]);

  // Use live-recalculated data
  const c = liveResults.consolidated;
  const f = liveFinancing;
  const w = liveWaterfall;
  const ir = liveIncentives;
  const phaseResults = liveResults.phaseResults || {};
  const phaseNames = Object.keys(phaseResults);

  // Derived metrics
  const irr = f && f.mode !== "self" && f.leveredIRR !== null ? f.leveredIRR : (ir && ir.adjustedIRR !== null ? ir.adjustedIRR : c.irr);
  const npv = (ir && ir.totalIncentiveValue > 0) ? ir.adjustedNPV10 : (c.npv10 || 0);
  const dscrVals = f && f.dscr ? f.dscr.filter(d => d !== null) : [];
  const minDscr = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const avgDscr = dscrVals.length > 0 ? dscrVals.reduce((a, b) => a + b, 0) / dscrVals.length : null;

  // Health badge
  const irrOk = irr === null ? 0 : irr > 0.15 ? 2 : irr > 0.12 ? 1 : 0;
  const dscrOk = minDscr === null ? -1 : minDscr > 1.4 ? 2 : minDscr > 1.25 ? 1 : 0;
  const npvOk = npv > 0 ? 2 : 0;
  const score = irrOk + (dscrOk >= 0 ? dscrOk : 0) + npvOk;
  const maxScore = 4 + (dscrOk >= 0 ? 2 : 0);
  const healthLabel = score >= maxScore * 0.7 ? "Strong" : score >= maxScore * 0.4 ? "Good" : score >= maxScore * 0.15 ? "Moderate" : "Weak";
  const healthColor = score >= maxScore * 0.7 ? "#16a34a" : score >= maxScore * 0.4 ? "#2563eb" : score >= maxScore * 0.15 ? "#eab308" : "#ef4444";
  const healthLabelAr = { Strong: "قوي", Good: "جيد", Moderate: "متوسط", Weak: "ضعيف" }[healthLabel];

  // Payback year
  const paybackYr = c.netCF ? c.netCF.reduce((acc, v, i) => { acc.cum += v; if (acc.cum < -1) acc.neg = true; if (acc.yr === null && acc.neg && acc.cum > 0) acc.yr = i + 1; return acc; }, { cum: 0, yr: null, neg: false }).yr : null;

  // Phase-specific data
  const isPhase = activePhase !== "consolidated";
  const phaseData = isPhase ? phaseResults[activePhase] : null;
  const displayCapex = isPhase ? (phaseData?.totalCapex || 0) : c.totalCapex;
  const displayIncome = isPhase ? (phaseData?.totalIncome || 0) : c.totalIncome;
  const displayIRR = isPhase ? (phaseData?.irr || null) : irr;
  const displayNPV = isPhase ? null : npv;
  const displayAssets = isPhase ? liveResults.assetSchedules.filter(a => a.phase === activePhase) : liveResults.assetSchedules;

  const KPI = ({ label, value, sub, color }) => (
    <div className="hero-kpi" style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7ec",padding:"20px 22px",minWidth:140,flex:1,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:11,color:"#6b7080",fontWeight:500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
      <div style={{fontSize:26,fontWeight:700,color:color||"#1a1d23",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:"#9ca3af",marginTop:4}}>{sub}</div>}
    </div>
  );

  const Section = ({ title, children, color }) => (
    <div style={{marginBottom:24}}>
      <div style={{fontSize:14,fontWeight:700,color:color||"#1a1d23",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:4,height:18,borderRadius:2,background:color||"#2563eb"}} />{title}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{maxWidth:1100,margin:"0 auto",paddingBottom:120}}>
      {/* ── Executive Summary Card ── */}
      <div style={{background:"linear-gradient(135deg,#0f1117 0%,#1a1d2e 100%)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:"radial-gradient(circle,rgba(46,196,182,0.08) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:18,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>{lang==="ar"?"حصيف":"Haseef"}</span><span style={{width:1,height:14,background:"rgba(46,196,182,0.4)"}} /><span style={{fontSize:9,color:"#2EC4B6",fontWeight:300}}>{lang==="ar"?"النمذجة المالية":"Financial Modeler"}</span></div>
            <div style={{fontSize:24,fontWeight:700,letterSpacing:-0.5}}>{project.name || "Untitled"}</div>
            {project.location && <div style={{fontSize:12,color:"#8b90a0",marginTop:4}}>{project.location}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!slidersDefault && <span style={{fontSize:10,padding:"4px 10px",borderRadius:12,background:"#fbbf2430",color:"#fbbf24",fontWeight:600,border:"1px solid #fbbf2440"}}>{ar?"سيناريو مُعدّل":"Adjusted Scenario"}</span>}
            <div style={{padding:"6px 16px",borderRadius:20,background:healthColor+"20",border:`1px solid ${healthColor}40`,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:4,background:healthColor}} />
              <span style={{fontSize:12,fontWeight:700,color:healthColor}}>{ar ? healthLabelAr : healthLabel}</span>
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:"#8b90a0",lineHeight:1.6,marginBottom:16}}>
          {project.currency || "SAR"} {fmtM(displayCapex)} {ar?"مشروع تطوير":"development"} | {displayIRR !== null ? (displayIRR*100).toFixed(1)+"% IRR" : "—"} | {paybackYr ? paybackYr+"yr payback" : "—"} | {minDscr !== null ? minDscr.toFixed(1)+"x DSCR" : "—"}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <KPI label={ar?"إجمالي التكاليف":"Total CAPEX"} value={fmtM(displayCapex)} color="#fff" />
          <KPI label="IRR" value={displayIRR !== null ? (displayIRR*100).toFixed(1)+"%" : "—"} color={getMetricColor("IRR",displayIRR,{dark:true})} />
          {displayNPV !== null && <KPI label={ar?"صافي القيمة الحالية":"NPV @10%"} value={fmtM(displayNPV)} color={getMetricColor("NPV",displayNPV,{dark:true})} />}
          {minDscr !== null && !isPhase && <KPI label={ar?"أدنى DSCR":"Min DSCR"} value={minDscr.toFixed(2)+"x"} color={getMetricColor("DSCR",minDscr,{dark:true})} />}
          {w && !isPhase && <KPI label="LP MOIC" value={w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—"} color={getMetricColor("MOIC",w.lpMOIC,{dark:true})} />}
          {isPhase && <KPI label={ar?"إجمالي الإيرادات":"Total Income"} value={fmtM(displayIncome)} color="#4ade80" />}
          {isPhase && <KPI label={ar?"عدد الأصول":"Assets"} value={String(displayAssets.length)} color="#fff" />}
        </div>
      </div>

      {/* ── Phase Selector Tabs ── */}
      {phaseNames.length > 1 && (
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setActivePhase("consolidated")} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase==="consolidated"?"#1a1d23":"#f0f1f5",color:activePhase==="consolidated"?"#fff":"#6b7080",border:"none"}}>{ar?"الموحّد":"Consolidated"}</button>
          {phaseNames.map(pn => (
            <button key={pn} onClick={()=>setActivePhase(pn)} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase===pn?"#2563eb":"#f0f1f5",color:activePhase===pn?"#fff":"#6b7080",border:"none"}}>
              {pn} <span style={{fontSize:9,opacity:0.7}}>({(phaseResults[pn]?.assetCount||0)})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Phase Summary Cards (when consolidated) ── */}
      {!isPhase && phaseNames.length > 1 && (
        <Section title={ar?"ملخص المراحل":"Phase Summary"} color="#0f766e">
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(phaseNames.length, 4)}, 1fr)`,gap:12}}>
            {phaseNames.map(pn => {
              const pd = phaseResults[pn];
              return (
                <div key={pn} onClick={()=>setActivePhase(pn)} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px",cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.boxShadow="0 2px 8px rgba(37,99,235,0.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1d23",marginBottom:8}}>{pn}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>CAPEX</div><div style={{fontSize:14,fontWeight:600}}>{fmtM(pd?.totalCapex)}</div></div>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"الإيرادات":"Revenue"}</div><div style={{fontSize:14,fontWeight:600,color:"#16a34a"}}>{fmtM(pd?.totalIncome)}</div></div>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>IRR</div><div style={{fontSize:14,fontWeight:600,color:pd?.irr>0.12?"#16a34a":"#eab308"}}>{pd?.irr !== null ? (pd.irr*100).toFixed(1)+"%" : "—"}</div></div>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"الأصول":"Assets"}</div><div style={{fontSize:14,fontWeight:600}}>{pd?.assetCount||0}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Bank View ── */}
      {audienceView === "bank" && !isPhase && (<>
        <Section title={ar?"ملخص التمويل":"Financing Summary"} color="#1e40af">
          {f ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي الدين":"Total Debt"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#1e40af"}}>{fmtM(f.totalDebt)}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>LTV: {f.totalProjectCost>0?((f.totalDebt/f.totalProjectCost)*100).toFixed(0):0}%</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي حقوق الملكية":"Total Equity"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#16a34a"}}>{fmtM(f.totalEquity)}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>GP: {fmtM(f.gpEquity)}{f.lpEquity > 0 ? ` | LP: ${fmtM(f.lpEquity)}` : ""}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"معدل التمويل":"Finance Rate"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#1a1d23"}}>{(f.rate*100).toFixed(1)}%</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{ar?"المدة":"Tenor"}: {liveProject.loanTenor||7}{ar?" سنة":"yr"} | {ar?"سماح":"Grace"}: {liveProject.debtGrace||3}{ar?" سنة":"yr"}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"متوسط DSCR":"Avg DSCR"}</div>
                <div style={{fontSize:20,fontWeight:700,color:getMetricColor("DSCR",avgDscr)}}>{avgDscr ? avgDscr.toFixed(2)+"x" : "—"}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{ar?"أدنى":"Min"}: {minDscr ? minDscr.toFixed(2)+"x" : "—"}</div>
              </div>
            </div>
          ) : <div style={{color:"#6b7080",fontSize:12}}>{ar?"لا يوجد تمويل مُعدّ":"No financing configured"}</div>}
        </Section>
        {f && dscrVals.length > 0 && (
          <Section title={ar?"جدول DSCR":"DSCR Schedule"} color="#1e40af">
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px",overflowX:"auto"}}>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",minHeight:120,paddingTop:8}}>
                {f.dscr.slice(0, Math.min(liveResults.horizon, 20)).map((d, y) => {
                  if (d === null) return <div key={y} style={{flex:1,minWidth:24}} />;
                  const h = Math.min(100, Math.max(8, d * 40));
                  const clr = d >= 1.4 ? "#16a34a" : d >= 1.2 ? "#eab308" : "#ef4444";
                  return (
                    <div key={y} style={{flex:1,minWidth:24,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:10,color:"#6b7080",fontWeight:600}}>{d.toFixed(1)}x</span>
                      <div style={{width:"80%",height:h,background:clr,borderRadius:3,transition:"height 0.5s"}} />
                      <span style={{fontSize:10,color:"#9ca3af"}}>{(liveProject.startYear||2026)+y}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{borderTop:"2px dashed #ef4444",marginTop:4,position:"relative"}}>
                <span style={{position:"absolute",right:0,top:2,fontSize:10,color:"#ef4444",fontWeight:600}}>1.2x {ar?"حد أدنى":"min"}</span>
              </div>
            </div>
          </Section>
        )}
        {f && (
          <Section title={ar?"المصادر والاستخدامات":"Sources & Uses"} color="#1e40af">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#1a1d23",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المصادر":"Sources"}</div>
                {[
                  { label: ar?"دين بنكي":"Bank Debt", value: f.totalDebt, color: "#1e40af" },
                  { label: ar?"حقوق ملكية GP":"GP Equity", value: f.gpEquity, color: "#16a34a" },
                  { label: ar?"حقوق ملكية LP":"LP Equity", value: f.lpEquity, color: "#8b5cf6" },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f0f1f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:s.color}} /><span style={{fontSize:12}}>{s.label}</span></div>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:700,fontSize:13}}>
                  <span>{ar?"الإجمالي":"Total"}</span><span>{fmtM(f.totalProjectCost||f.devCostInclLand)}</span>
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#1a1d23",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"الاستخدامات":"Uses"}</div>
                {[
                  { label: ar?"تكاليف البناء":"Construction CAPEX", value: c.totalCapex },
                  { label: ar?"إيجار الأرض":"Land Cost/Rent", value: liveProject.landType==="purchase" ? liveProject.landPurchasePrice : 0 },
                  { label: ar?"رسوم التمويل":"Financing Fees", value: (f.upfrontFee||0) },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f0f1f5"}}>
                    <span style={{fontSize:12}}>{s.label}</span>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
      </>)}

      {/* ── Investor View ── */}
      {audienceView === "investor" && !isPhase && (<>
        <Section title={ar?"عوائد المستثمرين":"Investor Returns"} color="#7c3aed">
          {w ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12}}>
              {[
                { label: "LP IRR", value: w.lpIRR !== null ? (w.lpIRR*100).toFixed(1)+"%" : "—", color: "#7c3aed" },
                { label: "GP IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—", color: "#16a34a" },
                { label: "LP MOIC", value: w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—", color: "#7c3aed", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.lpTotalInvested)} → ${fmtM(w.lpTotalDist)}` },
                { label: "GP MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—", color: "#16a34a", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.gpTotalInvested)} → ${fmtM(w.gpTotalDist)}` },
                { label: "DPI", value: w.lpTotalInvested > 0 ? (w.lpTotalDist / w.lpTotalInvested).toFixed(2)+"x" : "—", color: "#1a1d23" },
              ].map((item, i) => (
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                  <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{item.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:item.color}}>{item.value}</div>
                  {item.sub && <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{item.sub}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{color:"#6b7080",fontSize:12}}>{ar?"حافز الأداء غير مُعدّ — اختر صندوق استثماري":"Waterfall not configured - select Fund mode"}</div>}
        </Section>
        {w && w.tier1 && (
          <Section title={ar?"شلال التوزيعات":"Distribution Waterfall"} color="#7c3aed">
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:12}}>
              {[
                { label: ar?"رد رأس المال":"T1: Return of Capital", value: (w.tier1||[]).reduce((s,v)=>s+v,0), color: "#1e40af" },
                { label: ar?"العائد التفضيلي":"T2: Pref Return", value: (w.tier2||[]).reduce((s,v)=>s+v,0), color: "#7c3aed" },
                { label: ar?"تعويض المطور":"T3: GP Catch-up", value: (w.tier3||[]).reduce((s,v)=>s+v,0), color: "#16a34a" },
                { label: ar?"تقسيم الأرباح":"T4: Profit Split", value: ((w.tier4LP||[]).reduce((s,v)=>s+v,0))+((w.tier4GP||[]).reduce((s,v)=>s+v,0)), color: "#f59e0b" },
              ].map((tier, i) => (
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px",borderTop:`3px solid ${tier.color}`}}>
                  <div style={{fontSize:10,color:"#6b7080",marginBottom:4}}>{tier.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:tier.color}}>{fmtM(tier.value)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {w && (
          <Section title={ar?"اقتصاديات المطور (GP)":"GP Economics"} color="#16a34a">
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
                {[
                  { label: ar?"رأس مال GP":"GP Equity", value: fmtM(w.gpTotalInvested) },
                  { label: ar?"إجمالي توزيعات GP":"GP Distributions", value: fmtM(w.gpTotalDist) },
                  { label: ar?"رسوم المطور":"Developer Fee", value: fmtM(w.developerFeeTotal||0) },
                  { label: ar?"رسوم الإدارة":"Mgmt Fees", value: fmtM(w.mgmtFeeTotal||0) },
                  { label: "GP IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—" },
                  { label: "GP MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—" },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#1a1d23"}}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
        {f && liveProject.exitStrategy !== "hold" && (
          <Section title={ar?"تحليل التخارج":"Exit Analysis"} color="#f59e0b">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
              {[
                { label: ar?"سنة التخارج":"Exit Year", value: f.exitYear || "—" },
                { label: ar?"قيمة التخارج":"Exit Value", value: f.exitProceeds ? fmtM(f.exitProceeds.reduce((s,v)=>s+v,0)) : "—" },
                { label: ar?"مضاعف التخارج":"Exit Multiple", value: liveProject.exitMultiple+"x" },
                { label: ar?"تكاليف التخارج":"Exit Cost", value: liveProject.exitCostPct+"%" },
              ].map((item, i) => (
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{item.label}</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1a1d23"}}>{item.value}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </>)}

      {/* ── Asset Overview (both views + phase filtered) ── */}
      <Section title={isPhase ? `${activePhase} — ${ar?"الأصول":"Assets"}` : (ar?"نظرة عامة على الأصول":"Asset Overview")} color="#0f766e">
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8f9fb"}}>
                <th style={{...thSt,fontSize:11}}>{ar?"الأصل":"Asset"}</th>
                {!isPhase && <th style={{...thSt,fontSize:11}}>{ar?"المرحلة":"Phase"}</th>}
                <th style={{...thSt,fontSize:11}}>{ar?"التصنيف":"Category"}</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>GFA</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>CAPEX</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>{ar?"الإيرادات":"Revenue"}</th>
              </tr>
            </thead>
            <tbody>
              {displayAssets.map((a, i) => (
                <tr key={i}>
                  <td style={{...tdSt,fontSize:12,fontWeight:500}}>{a.name||"—"}</td>
                  {!isPhase && <td style={{...tdSt,fontSize:11,color:"#6b7080"}}>{a.phase}</td>}
                  <td style={{...tdSt,fontSize:11,color:"#6b7080"}}>{catL(a.category,ar)}</td>
                  <td style={{...tdN,fontSize:12}}>{fmt(a.gfa)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600}}>{fmtM(a.totalCapex)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600,color:"#16a34a"}}>{fmtM(a.totalRevenue)}</td>
                </tr>
              ))}
              <tr style={{background:"#f8f9fb",fontWeight:700}}>
                <td colSpan={isPhase?3:4} style={{...tdSt,fontSize:12}}>{ar?"الإجمالي":"Total"}</td>
                <td style={{...tdN,fontSize:12}}>{fmtM(displayCapex)}</td>
                <td style={{...tdN,fontSize:12,color:"#16a34a"}}>{fmtM(displayIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Live Scenario Sliders ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(15,17,23,0.95)",backdropFilter:"blur(8px)",borderTop:"1px solid #282d3a",padding:"12px 24px",display:"flex",alignItems:"center",gap:24,justifyContent:"center",zIndex:9000,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600,minWidth:50}}>CAPEX</span>
          <input type="range" min={80} max={120} value={liveSliders.capex} onChange={e=>setLiveSliders(s=>({...s,capex:+e.target.value}))} style={{width:120,accentColor:"#2563eb"}} />
          <span style={{fontSize:11,color:liveSliders.capex!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.capex}%</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600,minWidth:50}}>{ar?"الإيجار":"Rent"}</span>
          <input type="range" min={80} max={120} value={liveSliders.rent} onChange={e=>setLiveSliders(s=>({...s,rent:+e.target.value}))} style={{width:120,accentColor:"#16a34a"}} />
          <span style={{fontSize:11,color:liveSliders.rent!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.rent}%</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600,minWidth:50}}>{ar?"المضاعف":"Exit ×"}</span>
          <input type="range" min={6} max={15} step={0.5} value={liveSliders.exitMult} onChange={e=>setLiveSliders(s=>({...s,exitMult:+e.target.value}))} style={{width:120,accentColor:"#f59e0b"}} />
          <span style={{fontSize:11,color:liveSliders.exitMult!==(project.exitMultiple||10)?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.exitMult}x</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <button onClick={()=>setLiveSliders({capex:100,rent:100,exitMult:project.exitMultiple||10})} style={{...btnS,background:slidersDefault?"#1e2230":"#fbbf2430",color:slidersDefault?"#4b5060":"#fbbf24",padding:"6px 14px",fontSize:10,fontWeight:600,border:slidersDefault?"1px solid #282d3a":"1px solid #fbbf2440"}}>{ar?"إعادة تعيين":"Reset"}</button>
      </div>
    </div>
  );
}

export default PresentationView;
