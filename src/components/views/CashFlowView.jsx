// Extracted from App.jsx lines 9353-9577
import { useState, useMemo } from "react";
import { fmt, fmtPct, fmtM } from "../../utils/format";

// ── Style objects (copied from App.jsx) ──
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};
const btnPrim={...btnS,background:"#2563eb",color:"#fff",fontWeight:600};
const tblStyle={width:"100%",borderCollapse:"collapse"};
const thSt={padding:"7px 8px",textAlign:"start",fontSize:10,fontWeight:600,color:"#6b7080",background:"#f8f9fb",borderBottom:"1px solid #e5e7ec",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};

// ── Lazy-imported helpers expected from App.jsx context ──
// These are passed as props or imported from engine
import { calcIRR, calcNPV } from "../../engine/math.js";
import { useIsMobile } from "../shared/hooks.js";
import { getMetricColor } from "../../utils/metricColor.js";

// Tip component (minimal, used in KPI)
function Tip({text,children}) {
  return <span title={text} style={{cursor:"help",borderBottom:"1px dashed #9ca3af"}}>{children}</span>;
}

export function KPI({label,value,sub,color,tip}) {
  const isMobile = useIsMobile();
  return <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:isMobile?"10px 12px":"12px 14px"}}>
    <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{tip?<Tip text={tip}>{label}</Tip>:label}</div>
    <div style={{fontSize:isMobile?15:19,fontWeight:700,color:color||"#1a1d23",lineHeight:1.1}}>{value}{sub&&<span style={{fontSize:isMobile?10:11,fontWeight:400,color:"#9ca3af",marginInlineStart:4}}>{sub}</span>}</div>
  </div>;
}

function CashFlowView({ project, results, t, incentivesResult }) {
  if (!project||!results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:12,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>📈</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1a1d23",marginBottom:6}}>{ar?"أضف أصول لرؤية التدفقات":"Add Assets to See Projections"}</div>
      <div style={{fontSize:12,color:"#6b7080",maxWidth:360,lineHeight:1.6}}>{ar?"أضف أصول من تبويب 'برنامج الأصول' لعرض التدفقات النقدية السنوية":"Add assets from the Asset Program tab to view annual cash flow projections"}</div>
    </div>
  );
  const isMobile = useIsMobile();
  const [showYrs,setShowYrs]=useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const {horizon,startYear}=results;
  const years=Array.from({length:Math.min(showYrs,horizon)},(_,i)=>i);
  const ar = t.dashboard === "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645";

  // ── Phase filter ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  // ── Read from engine results, filtered by selected phases ──
  const phases = allPhaseNames.filter(pName => activePh.includes(pName)).map(pName => {
    const pr = results.phaseResults[pName];
    const noi = new Array(horizon).fill(0);
    for (let y = 0; y < horizon; y++) noi[y] = (pr.income[y]||0) - (pr.landRent[y]||0);
    return [pName, { ...pr, noi, totalNOI: noi.reduce((a,b)=>a+b,0) }];
  });

  // ── Filtered consolidated ──
  const c = useMemo(() => {
    if (!isFiltered) {
      const raw = { ...results.consolidated, noi: new Array(horizon).fill(0) };
      for (let y = 0; y < horizon; y++) raw.noi[y] = (raw.income[y]||0) - (raw.landRent[y]||0);
      return raw;
    }
    const income = new Array(horizon).fill(0), capex = new Array(horizon).fill(0), landRent = new Array(horizon).fill(0), netCF = new Array(horizon).fill(0), noi = new Array(horizon).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < horizon; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    for (let y = 0; y < horizon; y++) noi[y] = income[y] - landRent[y];
    const totalCapex = capex.reduce((a,b)=>a+b,0);
    const totalIncome = income.reduce((a,b)=>a+b,0);
    const totalLandRent = landRent.reduce((a,b)=>a+b,0);
    const totalNetCF = netCF.reduce((a,b)=>a+b,0);
    let pbCum = 0, pbYr = null, pbNeg = false, peakNeg = 0, peakNegY = null;
    for (let y = 0; y < horizon; y++) { pbCum += netCF[y]; if (pbCum < -1) pbNeg = true; if (pbNeg && pbCum >= 0 && pbYr === null) pbYr = y; if (pbCum < peakNeg) { peakNeg = pbCum; peakNegY = y; } }
    return { ...results.consolidated, income, capex, landRent, netCF, noi, totalCapex, totalIncome, totalLandRent, totalNetCF,
      irr: calcIRR(netCF), npv10: calcNPV(netCF, 0.10), npv12: calcNPV(netCF, 0.12), npv14: calcNPV(netCF, 0.14),
      paybackYear: pbYr, peakNegative: peakNeg, peakNegativeYear: peakNegY,
    };
  }, [isFiltered, selectedPhases, results, horizon]);

  // ── Period detection: construction vs operating years ──
  let constrEnd = 0;
  for (let y = horizon - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }
  const isConstrYear = y => c.capex[y] > 0;
  const isIncomeYear = y => c.income[y] > 0;

  // ── NOI already computed as c.noi ──
  const noiArr = c.noi;
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);

  // ── Yield on Cost = Stabilized NOI / Total CAPEX ──
  const stabilizedNOI = noiArr[Math.min(constrEnd + 3, horizon - 1)] || 0;
  const yieldOnCost = c.totalCapex > 0 ? stabilizedNOI / c.totalCapex : 0;

  const CFRow=({label,values,total,bold,color,negate,sub})=>{
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#d0d4dc";};
    return <tr style={st} onMouseEnter={e=>{if(!bold)e.currentTarget.style.background="#fafbff";}} onMouseLeave={e=>{if(!bold)e.currentTarget.style.background="";}}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:150,paddingInlineStart:sub?24:10,fontSize:sub?10:11,color:sub?"#6b7080":undefined}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v),background:v===0?"":"transparent"}}>{v===0?"\u2014":fmt(v)}</td>;})}
    </tr>;
  };

  // Section header row
  const SectionRow=({label,color,bg})=><tr><td colSpan={years.length+2} style={{padding:"6px 10px",fontSize:10,fontWeight:700,color:color||"#6b7080",background:bg||"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"1px solid #e5e7ec"}}>{label}</td></tr>;

  // Cumulative row (always visible)
  const CumRow=({label,values})=>{
    let cum=0;
    return <tr style={{background:"#fffbeb"}}>
      <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:150}}>{label}</td>
      <td style={tdN}></td>
      {years.map(y=>{cum+=values[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
    </tr>;
  };

  // ── Period marker header (construction / operating / payback) ──
  const PeriodHeaderRow = () => <tr>
    <td style={{position:"sticky",left:0,background:"#fff",zIndex:2,padding:0}}></td>
    <td style={{padding:0}}></td>
    {years.map(y => {
      const constr = isConstrYear(y);
      const income = isIncomeYear(y);
      const isPB = c.paybackYear !== null && y === c.paybackYear;
      const bg = constr && !income ? "#fef3c7" : constr && income ? "#fef9c3" : income ? "#dcfce7" : "#f8f9fb";
      const lbl = constr && !income ? (ar?"\u0628\u0646\u0627\u0621":"Build") : constr && income ? (ar?"\u0628\u0646\u0627\u0621+\u062f\u062e\u0644":"Build+Op") : income ? (ar?"\u062a\u0634\u063a\u064a\u0644":"Oper.") : "";
      return <td key={y} style={{padding:"2px 4px",textAlign:"center",background:bg,fontSize:10,fontWeight:600,color:constr?"#a16207":"#16a34a",borderBottom:isPB?"3px solid #2563eb":"1px solid #e5e7ec",position:"relative"}}>
        {lbl}{isPB && <span style={{display:"block",fontSize:9,color:"#2563eb",fontWeight:700}}>{ar?"\u0627\u0633\u062a\u0631\u062f\u0627\u062f":"Payback"}</span>}
      </td>;
    })}
  </tr>;

  return (<div>
    {/* Phase Filter */}
    {allPhaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"\u0643\u0644 \u0627\u0644\u0645\u0631\u0627\u062d\u0644":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"#6b7080",marginInlineStart:8}}>{ar?`\u0639\u0631\u0636 ${activePh.length} \u0645\u0646 ${allPhaseNames.length} \u0645\u0631\u0627\u062d\u0644`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Disclaimer */}
    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"6px 12px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:14}}>{"\u26A0"}</span>
      {ar ? "\u0647\u0630\u0647 \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a \u0642\u0628\u0644 \u0627\u062d\u062a\u0633\u0627\u0628 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0645\u0648\u064a\u0644 \u0648\u0622\u0644\u064a\u0629 \u0627\u0644\u062a\u062e\u0627\u0631\u062c - \u0633\u062a\u062a\u063a\u064a\u0631 \u0628\u0639\u062f \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u062a\u0645\u0648\u064a\u0644" : "Pre-financing & pre-exit metrics \u2014 will change after financing mode and exit strategy are set"}
    </div>
    {/* NPV/IRR Summary */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(130px, 1fr))",gap:10,marginBottom:16}}>
      {[
        {label:ar?"\u0049\u0052\u0052 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 (\u0642\u0628\u0644 \u0627\u0644\u062a\u0645\u0648\u064a\u0644)":"Unlevered IRR",value:c.irr!==null?fmtPct(c.irr*100):"N/A",color:getMetricColor("IRR",c.irr)},
        {label:"NPV @10%",value:fmtM(c.npv10),color:c.npv10>0?"#2563eb":"#ef4444"},
        {label:"NPV @12%",value:fmtM(c.npv12),color:c.npv12>0?"#2563eb":"#ef4444"},
        {label:"NPV @14%",value:fmtM(c.npv14),color:c.npv14>0?"#2563eb":"#ef4444"},
        {label:ar?"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641":"Total CAPEX",value:fmtM(c.totalCapex),color:"#ef4444"},
        {label:ar?"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a":"Total Income",value:fmtM(c.totalIncome),color:"#16a34a"},
        {label:ar?"\u0635\u0627\u0641\u064a \u0627\u0644\u062f\u062e\u0644 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a (NOI)":"Net Operating Income",value:fmtM(totalNOI),color:"#2563eb",tip:ar?"\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a - \u0625\u064a\u062c\u0627\u0631 \u0627\u0644\u0623\u0631\u0636 (\u0642\u0628\u0644 CAPEX)":"Revenue minus Land Rent (before CAPEX)"},
        {label:ar?"\u0639\u0627\u0626\u062f \u0639\u0644\u0649 \u0627\u0644\u062a\u0643\u0644\u0641\u0629":"Yield on Cost",value:yieldOnCost>0?fmtPct(yieldOnCost*100):"\u2014",color:yieldOnCost>0.08?"#16a34a":"#f59e0b",tip:ar?"NOI \u0627\u0644\u0645\u0633\u062a\u0642\u0631 / CAPEX":"Stabilized NOI / Total CAPEX"},
        {label:ar?"\u0641\u062a\u0631\u0629 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f":"Payback Period",value:c.paybackYear!=null?(c.paybackYear+(ar?" \u0633\u0646\u0629":" yr")):"\u2014",color:c.paybackYear&&c.paybackYear<=10?"#16a34a":c.paybackYear?"#f59e0b":"#9ca3af"},
        {label:ar?"\u0623\u0642\u0635\u0649 \u0633\u062d\u0628 \u0633\u0644\u0628\u064a":"Peak Negative CF",value:fmtM(c.peakNegative||0),color:"#ef4444",tip:c.peakNegativeYear!=null?(ar?`\u0627\u0644\u0633\u0646\u0629 ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`:`Year ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`):""},
      ].map((k,i) => <div key={i} style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"8px 12px"}}>
        <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{k.label}</div>
        <div style={{fontSize:16,fontWeight:700,color:k.color}}>{k.value}</div>
        {k.tip && <div style={{fontSize:9,color:"#9ca3af",marginTop:2}}>{k.tip}</div>}
      </div>)}
    </div>

    {/* Period Legend */}
    <div style={{display:"flex",gap:14,marginBottom:8,fontSize:10,color:"#6b7080",flexWrap:"wrap",alignItems:"center"}}>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#fef3c7",border:"1px solid #fde68a"}} />{ar?"\u0628\u0646\u0627\u0621":"Construction"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#dcfce7",border:"1px solid #bbf7d0"}} />{ar?"\u062a\u0634\u063a\u064a\u0644":"Operating"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:4,borderRadius:1,background:"#2563eb"}} />{ar?"\u0633\u0646\u0629 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f":"Payback Year"}</span>
    </div>

    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12,flexWrap:"wrap"}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.unleveredCF}</div>
      <div style={{flex:1}} />
      <div style={{display:"flex",background:"#f0f1f5",borderRadius:6,padding:2}}>
        {[10,15,20,30,50].map(n=><button key={n} onClick={()=>setShowYrs(n)} style={{...btnS,padding:"4px 10px",fontSize:10,fontWeight:600,background:showYrs===n?"#fff":"transparent",color:showYrs===n?"#1a1d23":"#9ca3af",boxShadow:showYrs===n?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>{n}yr</button>)}
      </div>
    </div>
    {phases.map(([name,pr])=>(
      <div key={name} style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600,display:"flex",justifyContent:"space-between"}}>
          <span>{name}</span><span style={{color:"#6b7080",fontWeight:400,fontSize:11}}>{ar?"IRR \u0642\u0628\u0644 \u0627\u0644\u062a\u0645\u0648\u064a\u0644":"Unlevered IRR"}: <strong style={{color:pr.irr!==null?"#2563eb":"#9ca3af"}}>{pr.irr!==null?fmtPct(pr.irr*100):"\u2014"}</strong></span>
        </div>
        <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
          <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:150}}>{t.lineItem}</th>
          <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
          {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{startYear+y}</span></th>)}
        </tr></thead><tbody>
          <PeriodHeaderRow />
          <SectionRow label={ar?"\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a \u0648\u0627\u0644\u062a\u0634\u063a\u064a\u0644":"REVENUE & OPERATIONS"} color="#16a34a" bg="#f0fdf4" />
          <CFRow label={t.income} values={pr.income} total={pr.totalIncome} color="#16a34a" />
          <CFRow label={ar?"(-) \u0625\u064a\u062c\u0627\u0631 \u0627\u0644\u0623\u0631\u0636":"(-) Land Rent"} values={pr.landRent} total={pr.totalLandRent} color="#ef4444" negate sub />
          <CFRow label={ar?"= \u0635\u0627\u0641\u064a \u0627\u0644\u062f\u062e\u0644 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a (NOI)":"= NOI (Net Operating Income)"} values={pr.noi} total={pr.totalNOI} bold />
          <SectionRow label={ar?"\u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064a\u0629":"CAPITAL EXPENDITURE"} color="#ef4444" bg="#fef2f2" />
          <CFRow label={ar?"(-) \u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u062a\u0637\u0648\u064a\u0631":"(-) Development CAPEX"} values={pr.capex} total={pr.totalCapex} color="#ef4444" negate />
          <SectionRow label={ar?"\u0635\u0627\u0641\u064a \u0627\u0644\u062a\u062f\u0641\u0642 \u0627\u0644\u0646\u0642\u062f\u064a":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
          <CFRow label={ar?"= \u0635\u0627\u0641\u064a \u0627\u0644\u062a\u062f\u0641\u0642 \u0627\u0644\u0646\u0642\u062f\u064a":"= Net Cash Flow"} values={pr.netCF} total={pr.totalNetCF} bold />
          <CumRow label={ar?"\u21B3 \u062a\u0631\u0627\u0643\u0645\u064a":"\u21B3 Cumulative"} values={pr.netCF} />
        </tbody></table></div>
      </div>
    ))}
    <div style={{background:"#fff",borderRadius:8,border:"2px solid #2563eb",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,background:"#f0f4ff",display:"flex",justifyContent:"space-between"}}>
        <span>{isFiltered?(ar?"\u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0645\u062e\u062a\u0627\u0631":"Selected Total"):t.consolidated}</span><span style={{fontSize:11,fontWeight:400}}>{ar?"IRR \u0642\u0628\u0644 \u0627\u0644\u062a\u0645\u0648\u064a\u0644":"Unlevered IRR"}: <strong style={{color:"#2563eb"}}>{(!isFiltered&&incentivesResult&&incentivesResult.totalIncentiveValue>0&&incentivesResult.adjustedIRR!==null)?fmtPct(incentivesResult.adjustedIRR*100):c.irr!==null?fmtPct(c.irr*100):"\u2014"}</strong></span>
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:150}}>{t.lineItem}</th>
        <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{startYear+y}</span></th>)}
      </tr></thead><tbody>
        <PeriodHeaderRow />
        <SectionRow label={ar?"\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a \u0648\u0627\u0644\u062a\u0634\u063a\u064a\u0644":"REVENUE & OPERATIONS"} color="#16a34a" bg="#f0fdf4" />
        <CFRow label={t.income} values={c.income} total={c.totalIncome} color="#16a34a" />
        <CFRow label={ar?"(-) \u0625\u064a\u062c\u0627\u0631 \u0627\u0644\u0623\u0631\u0636":"(-) Land Rent"} values={c.landRent} total={c.totalLandRent} color="#ef4444" negate sub />
        <CFRow label={ar?"= \u0635\u0627\u0641\u064a \u0627\u0644\u062f\u062e\u0644 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
        <SectionRow label={ar?"\u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u0631\u0623\u0633\u0645\u0627\u0644\u064a\u0629":"CAPITAL EXPENDITURE"} color="#ef4444" bg="#fef2f2" />
        <CFRow label={ar?"(-) \u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u062a\u0637\u0648\u064a\u0631":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} color="#ef4444" negate />
        <SectionRow label={ar?"\u0635\u0627\u0641\u064a \u0627\u0644\u062a\u062f\u0641\u0642 \u0627\u0644\u0646\u0642\u062f\u064a":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
        <CFRow label={ar?"= \u0635\u0627\u0641\u064a \u0627\u0644\u062a\u062f\u0641\u0642 \u0627\u0644\u0646\u0642\u062f\u064a":"= Net Cash Flow"} values={c.netCF} total={c.totalNetCF} bold />
        <CumRow label={ar?"\u21B3 \u062a\u0631\u0627\u0643\u0645\u064a":"\u21B3 Cumulative"} values={c.netCF} />
      </tbody></table></div>
    </div>
  </div>);
}

export default CashFlowView;
