// Minimal ResultsView.jsx — contains only IncomeFundResultsView, the sole live export
// used by App.jsx (src/App.jsx:9).
//
// The previous 1431-line file also defined SelfResultsView, BankResultsView, ResultsView,
// and FieldGroup/FL/Inp/Drp — but App.jsx defines those inline (lines 1448, 1482, 1854)
// and imports Form widgets from components/shared/FormWidgets.jsx. None of the other
// exports were imported anywhere in the live codebase. Verified via repo-wide grep:
//   grep -r "from.*components/views/ResultsView" src/   → only App.jsx (named import)
// and the removed exports' downstream consumers (WaterfallView, FinancingView, etc.)
// were themselves dead shadow files deleted in the same commit.

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { tblStyle, thSt, tdSt, tdN } from "../shared/styles";

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

export { IncomeFundResultsView };
