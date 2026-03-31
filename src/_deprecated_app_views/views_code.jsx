function WaterfallView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [wSec, setWSec] = useState({});  // chart toggle state
  const [kpiOpen, setKpiOpen] = useState({gp:false,lp:false,fund:false,devTotal:false}); // expandable KPI cards
  const [eduModal, setEduModal] = useState(null);
  const [showHybridCF, setShowHybridCF] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({gp:expand,lp:expand,fund:expand,devTotal:expand}); setWSec(expand?{chart:true}:{}); }}, [globalExpand]);

  if (!project || !results || !waterfall) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>
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
      lpSimpleROE: lpCalled>0?((sum('lpNetDist')||lpTotalDist)-lpCalled)/lpCalled:0, gpSimpleROE: gpCalled>0?((sum('gpNetDist')||gpTotalDist)-gpCalled)/gpCalled:0,
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

  // Simple Return (market convention) — from engine, fallback to local computation
  const lpSimpleROE = w.lpSimpleROE ?? (w.lpTotalInvested > 0 ? ((w.lpNetDist||w.lpTotalDist||0) - w.lpTotalInvested) / w.lpTotalInvested : 0);
  const gpSimpleROE = w.gpSimpleROE ?? (w.gpTotalInvested > 0 ? ((w.gpNetDist||w.gpTotalDist||0) - w.gpTotalInvested) / w.gpTotalInvested : 0);
  const investYears = w.investYears ?? (() => {
    let firstCall = -1, lastDist = 0;
    for (let y = 0; y < h; y++) { if ((w.lpNetCF?.[y]||0) < 0 && firstCall < 0) firstCall = y; if ((w.lpNetCF?.[y]||0) > 0) lastDist = y; }
    return Math.max(1, firstCall >= 0 ? lastDist - firstCall + 1 : (exitYr > sy ? exitYr - sy : h));
  })();
  const lpSimpleAnnual = w.lpSimpleAnnual ?? (investYears > 0 ? lpSimpleROE / investYears : 0);
  const gpSimpleAnnual = w.gpSimpleAnnual ?? (investYears > 0 ? gpSimpleROE / investYears : 0);

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
    const st=bold?{fontWeight:700,background:"var(--surface-table-header)"}:{};
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
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>Investor {(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
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

    {/* ═══ HYBRID MODE BANNER ═══ */}
    {f?.isHybrid && (() => {
      const govPct = f.govFinancingPct || 70;
      const fundPct = 100 - govPct;
      const isGP = f.govBeneficiary === "gp";
      return <div style={{background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",borderRadius:10,border:"1px solid #86efac",padding:"12px 16px",marginBottom:14,fontSize:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <span style={{fontSize:16}}>🔀</span>
          <span style={{fontWeight:700,color:"#166534"}}>{ar?"مختلط: صندوق + تمويل":"Hybrid: Fund + Financing"}</span>
          <span style={{fontSize:10,color:"#059669",background:"#d1fae5",borderRadius:4,padding:"2px 6px"}}>{govPct}% {ar?"تمويل":"Fin."} + {fundPct}% {ar?"صندوق":"Fund"}</span>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",color:"#374151"}}>
          <span>{ar?"مبلغ التمويل":"Loan Amount"}: <b>{fmtM(f.govLoanAmount)}</b></span>
          <span>{ar?"سعر الفائدة":"Rate"}: <b>{((f.govLoanRate||0)*100).toFixed(1)}%</b></span>
          <span>{ar?"حصة الصندوق":"Fund Portion"}: <b>{fmtM(f.fundPortionCost)}</b></span>
          {isGP && <span style={{color:"#d97706",fontWeight:600}}>⚠ {ar?"القرض على المطور شخصياً":"Personal loan to developer"}</span>}
        </div>
      </div>;
    })()}

    {/* ═══ HYBRID: THREE DETAILED CASH FLOW TABLES ═══ */}
    {f?.isHybrid && (() => {
      const finPct = f.govFinancingPct || 70;
      const fundPctVal = 100 - finPct;
      const maxYr = w.exitYear ? w.exitYear - sy + 2 : Math.min(showYrs || 15, h);
      const hybYears = Array.from({length: Math.min(maxYr + 1, h)}, (_, i) => i);
      // Table builder helper
      const HybTable = ({id, title, titleColor, borderColor, bgColor, children}) => {
        const [open, setOpen] = useState(false);
        return <div style={{marginBottom:10,borderRadius:8,border:`1px solid ${borderColor}`,overflow:"hidden"}}>
          <div onClick={()=>setOpen(!open)} style={{padding:"8px 14px",background:bgColor,cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"}}>
            <span style={{fontSize:10,color:titleColor,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▶</span>
            <span style={{fontSize:11,fontWeight:700,color:titleColor,flex:1}}>{title}</span>
            <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?(ar?"طي":"Collapse"):(ar?"فتح":"Expand")}</span>
          </div>
          {open && <div className="table-wrap" style={{overflowX:"auto",maxHeight:400,overflowY:"auto"}}><table style={{...tblStyle,fontSize:10,width:"100%"}}>{children}</table></div>}
        </div>;
      };
      const HRow = ({label, arr, color, bold, negate, sub}) => {
        const tot = arr.reduce((a,b)=>a+b,0);
        const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
        const nc = v => color || (v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af");
        return <tr style={st}>
          <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:140,fontSize:sub?9:10,paddingInlineStart:sub?24:undefined,color:sub?"var(--text-tertiary)":undefined}}>{label}</td>
          <td style={{...tdN,fontWeight:600,fontSize:10,color:nc(negate?-tot:tot)}}>{fmt(tot)}</td>
          {hybYears.map(y=>{const v=arr[y]||0;return <td key={y} style={{...tdN,fontSize:10,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
        </tr>;
      };
      const THead = () => <thead><tr style={{position:"sticky",top:0,background:"var(--surface-table-header)",zIndex:3}}>
        <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:4,minWidth:140,fontSize:10}}>{ar?"البند":"Item"}</th>
        <th style={{...thSt,textAlign:"right",fontSize:10}}>{ar?"الإجمالي":"Total"}</th>
        {hybYears.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:70,fontSize:9}}>{sy+y}</th>)}
      </tr></thead>;

      return <div style={{marginBottom:14}}>
        {/* ── TABLE 1: Financing Side (Debt Instrument) ── */}
        <HybTable id="hybFin" title={`🏦 ${ar?`التمويل المؤسسي (${finPct}%)`:`Institutional Financing (${finPct}%)`} — ${fmtM(f.govLoanAmount)} @ ${((f.govLoanRate||0)*100).toFixed(1)}%`} titleColor="#1e40af" borderColor="#93c5fd" bgColor="#eff6ff">
          <THead />
          <tbody>
            <HRow label={ar?"سحوبات الدين":"Debt Drawdown"} arr={f.drawdown} color="#3b82f6" />
            <HRow label={ar?"(-) تكلفة التمويل (فائدة)":"(-) Interest / Profit"} arr={f.interest} color="#ef4444" negate />
            <HRow label={ar?"(-) سداد الأصل":"(-) Principal Repayment"} arr={f.repayment} color="#ef4444" negate />
            <HRow label={ar?"= صافي تدفق التمويل":"= Net Financing CF"} arr={f.financingCF || hybYears.map(y => (f.drawdown[y]||0) - (f.debtService[y]||0))} bold />
            <tr style={{background:"#eff6ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:9,color:"#3b82f6",paddingInlineStart:16}}>{ar?"رصيد الدين":"Debt Balance"}</td>
              <td style={tdN}></td>
              {hybYears.map(y=><td key={y} style={{...tdN,fontSize:9,color:"#3b82f6"}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
            </tr>
            <tr style={{background:"#eff6ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:9,color:"#3b82f6",paddingInlineStart:16}}>DSCR</td>
              <td style={tdN}></td>
              {hybYears.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.5?"#16a34a":f.dscr[y]>=1.2?"#a16207":"#ef4444",fontWeight:600,fontSize:9}}>{f.dscr[y]===null?"—":f.dscr[y]?.toFixed(2)+"x"}</td>)}
            </tr>
          </tbody>
        </HybTable>

        {/* ── TABLE 2: Fund Side (Equity Account) ── */}
        {/* Fund sees: full project revenue/costs, debt flows in/out, then its fees + exit */}
        <HybTable id="hybFund" title={`📊 ${ar?`الصندوق (${fundPctVal}% ملكية)`:`Fund (${fundPctVal}% Equity)`} — ${fmtM(f.totalEquity)} | LP IRR: ${w.lpIRR!=null?fmtPct(w.lpIRR*100):"—"} | MOIC: ${w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"}`} titleColor="#6d28d9" borderColor="#c4b5fd" bgColor="#faf5ff">
          <THead />
          <tbody>
            {/* Project operations (fund operates full project) */}
            <HRow label={ar?"الإيرادات":"Revenue"} arr={hybYears.map(y=>pc.income[y]||0)} color="#16a34a" />
            <HRow label={ar?"(-) إيجار أرض":"(-) Land Rent"} arr={hybYears.map(y=>pc.landRent[y]||0)} color="#ef4444" negate />
            <HRow label={ar?"(-) تكاليف تطوير":"(-) CAPEX"} arr={hybYears.map(y=>pc.capex[y]||0)} color="#ef4444" negate />
            {/* Debt flows through the fund (received from lender, paid back) */}
            <HRow label={ar?"(+) سحوبات التمويل":"(+) Financing Drawdown"} arr={f.drawdown} color="#3b82f6" sub />
            <HRow label={ar?"(-) خدمة الدين":"(-) Debt Service"} arr={f.debtService} color="#dc2626" negate sub />
            {/* Fund-specific costs */}
            {f.devFeeSchedule && <HRow label={ar?"(-) أتعاب المطور":"(-) Developer Fee"} arr={f.devFeeSchedule} color="#f59e0b" negate />}
            {w.fees && <HRow label={ar?"(-) رسوم الصندوق":"(-) Fund Fees"} arr={w.fees} color="#f59e0b" negate />}
            {/* Exit */}
            <HRow label={ar?"حصيلة التخارج":"Exit Proceeds"} arr={hybYears.map(y=>f.exitProceeds?.[y]||0)} color="#8b5cf6" />
            {/* Net = leveredCF (correct: full project after all debt & fees) */}
            <HRow label={ar?"= صافي تدفق الصندوق":"= Net Fund CF"} arr={f.fundCF || f.leveredCF} bold />
            {/* Equity & distributions */}
            <HRow label={ar?"طلبات رأس المال":"Equity Calls"} arr={w.equityCalls||f.equityCalls||[]} color="#8b5cf6" />
            {w.lpDist && <HRow label={ar?"توزيعات المستثمر (LP)":"LP Distributions"} arr={w.lpDist} color="#6d28d9" />}
            {w.gpDist && <HRow label={ar?"توزيعات المطور (GP)":"GP Distributions"} arr={w.gpDist} color="#8b5cf6" />}
          </tbody>
        </HybTable>

        {/* ── TABLE 3: Combined (Full Project — Unlevered & Levered) ── */}
        <HybTable id="hybCombined" title={`📋 ${ar?"المشروع الكامل (مجمّع)":"Full Project (Combined)"} — ${fmtM(f.devCostInclLand)}`} titleColor="#1e3a5f" borderColor="#94a3b8" bgColor="#f1f5f9">
          <THead />
          <tbody>
            <HRow label={ar?"الإيرادات":"Revenue"} arr={hybYears.map(y=>pc.income[y]||0)} color="#16a34a" />
            <HRow label={ar?"(-) إيجار أرض":"(-) Land Rent"} arr={hybYears.map(y=>pc.landRent[y]||0)} color="#ef4444" negate />
            <HRow label={ar?"(-) تكاليف تطوير":"(-) CAPEX"} arr={hybYears.map(y=>pc.capex[y]||0)} color="#ef4444" negate />
            {(() => { const u=hybYears.map(y=>(pc.income[y]||0)-(pc.landRent[y]||0)-(pc.capex[y]||0)); return <HRow label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered CF"} arr={u} bold />; })()}
            <HRow label={ar?"سحوبات الدين":"Debt Drawdown"} arr={f.drawdown} color="#3b82f6" />
            <HRow label={ar?"(-) خدمة الدين":"(-) Debt Service"} arr={f.debtService} color="#dc2626" negate />
            {f.devFeeSchedule && <HRow label={ar?"(-) أتعاب المطور":"(-) Developer Fee"} arr={f.devFeeSchedule} color="#f59e0b" negate />}
            {w.fees && <HRow label={ar?"(-) رسوم الصندوق":"(-) Fund Fees"} arr={w.fees} color="#f59e0b" negate />}
            <HRow label={ar?"حصيلة التخارج":"Exit Proceeds"} arr={hybYears.map(y=>f.exitProceeds?.[y]||0)} color="#8b5cf6" />
            <HRow label={ar?"= صافي التدفق الممول":"= Levered Net CF"} arr={f.leveredCF} bold />
            {(() => { let cum=0; return <tr style={{background:"#f1f5f9"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f1f5f9",zIndex:1,fontWeight:600,fontSize:9,color:"#475569",paddingInlineStart:16}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
              <td style={tdN}></td>
              {hybYears.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:9,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
            </tr>; })()}
          </tbody>
        </HybTable>
      </div>;
    })()}

    {/* ═══ QUICK EDIT: Fund & Waterfall Terms ═══ */}
    {upCfg && (cfg.finMode === "fund" || cfg.finMode === "hybrid" || cfg.finMode === "incomeFund") && (
      <div style={{background:showTerms?"#fff":"#f8f9fb",borderRadius:10,border:showTerms?"2px solid #8b5cf6":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#faf5ff":"#f8f9fb",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تعديل سريع - شروط الصندوق":"Quick Edit - Fund Terms"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"العائد المتوقع":"Expected Return"} {cfg.hurdleIRR||15}% · {ar?"الحافز":"Incentive"} {cfg.incentivePct||20}%</span>
          <span style={{fontSize:11,color:"var(--text-tertiary)",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #ede9fe",animation:"zanSlide 0.15s ease"}}>
          {/* Row 1: Performance Incentive Terms */}
          <div style={{fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"حافز حسن الأداء للمطور":"DEVELOPER PERFORMANCE INCENTIVE"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {false && ([
              {l:ar?"العائد التفضيلي %":"Pref Return %",k:"prefReturnPct",v:cfg.prefReturnPct},
              {l:ar?"حصة المطور %":"Dev Profit %",k:"carryPct",v:cfg.carryPct},
              {l:ar?"حصة المستثمر %":"Investor Split %",k:"lpProfitSplitPct",v:cfg.lpProfitSplitPct},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>))}
            {false && (<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"التعويض":"Catch-up"}</span>
              <select value={cfg.gpCatchup?"Y":"N"} onChange={e=>upCfg({gpCatchup:e.target.value==="Y"})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="Y">{ar?"نعم":"Yes"}</option><option value="N">{ar?"لا":"No"}</option>
              </select>
            </div>)}
            {false && (<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"معاملة الرسوم":"Fee Treatment"}</span>
              <select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="capital">{ar?"رأسمال":"Capital"}</option><option value="rocOnly">{ar?"استرداد فقط":"ROC Only"}</option><option value="expense">{ar?"مصروف":"Expense"}</option>
              </select>
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"تفعيل حافز حسن الأداء للمطور":"Enable Developer Performance Incentive"}</span>
              <select value={cfg.performanceIncentive?"Y":"N"} onChange={e=>upCfg({performanceIncentive:e.target.value==="Y"})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="N">{ar?"لا":"Off"}</option><option value="Y">{ar?"نعم":"On"}</option>
              </select>
            </div>
            {cfg.performanceIncentive && <>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"نوع العتبة":"Hurdle Type"}</span>
              <select value={cfg.hurdleMode||"simple"} onChange={e=>upCfg({hurdleMode:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="simple">{ar?"عائد بسيط (عرف السوق)":"Simple (Market)"}</option>
                <option value="irr">{ar?"IRR مركب":"IRR (Compounded)"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{ar?"العائد المتوقع السنوي للمستثمر %":"Investor Expected Annual Return %"}</span>
              <input type="number" value={cfg.hurdleIRR||""} onChange={e=>upCfg({hurdleIRR:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{ar?"نسبة حافز المطور من الفائض %":"Developer Share of Excess %"}</span>
              <input type="number" value={cfg.incentivePct||""} onChange={e=>upCfg({incentivePct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
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
              <span style={{fontSize:10,color:"var(--text-secondary)",minWidth:f.wide?68:52}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:f.wide?80:55,padding:"4px 6px",border:"0.5px solid var(--border-default)",borderRadius:5,fontSize:11,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: Investors | Developer | Fund | Total Dev Returns ═══ */}
    {(() => {
      const gpIsManager = w.gpIsFundManager ?? (cfg.gpIsFundManager !== false);
      const _feeDev = w.devFeesTotal ?? (w.feeDev||[]).reduce((a,b)=>a+b,0);
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
      const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:"var(--radius-sm)",padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
      const KR = ({l,v,c,bold}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:bold?700:500,fontSize:11,color:c||"var(--text-primary)"}}>{v}</span></>;
      const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:10,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"0.5px solid var(--surface-separator)",marginTop:2}}>{text}</div>;
      return <>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:12}}>

        {/* ── Card 1: Investors (All Equity) ── */}
        <div style={{background:kpiOpen.lp?"#fff":"linear-gradient(135deg, #faf5ff, #f5f3ff)",borderRadius:10,border:kpiOpen.lp?"2px solid #8b5cf6":"1px solid #e9d5ff",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,lp:!p.lp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#8b5cf6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Inv</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5b21b6",flex:1}}>{ar?"المستثمرون":"Investors"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.lp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.lp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"عائد بسيط (سنوي)":"Simple (Ann.)", lpSimpleAnnual?fmtPct(lpSimpleAnnual*100):"—", "#8b5cf6")}
              {badge("IRR", w.lpIRR!==null?fmtPct(w.lpIRR*100):"—", getMetricColor("IRR",w.lpIRR))}
              {badge("MOIC", w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.lpMOIC))}
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
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={lpSimpleROE?fmtPct(lpSimpleROE*100):"—"} c="#8b5cf6" bold />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={lpSimpleAnnual?fmtPct(lpSimpleAnnual*100):"—"} c="#8b5cf6" />
              {(w.lpIRR > 0 && lpSimpleAnnual > 0 && w.lpIRR > lpSimpleAnnual * 1.05) ? <div style={{gridColumn:"1/-1",fontSize:9,color:"#6b7280",fontStyle:"italic",margin:"-2px 0 2px",lineHeight:1.3}}>{ar?"⚡ IRR أعلى من العائد البسيط لأن طلبات رأس المال موزعة على سنوات — IRR يحسب توقيت كل دفعة":"⚡ IRR > Simple because capital calls are staggered — IRR accounts for timing of each call"}</div> : null}
              <KR l={ar?"صافي IRR (مركب)":"Net IRR (Compounded)"} v={w.lpIRR!==null?fmtPct(w.lpIRR*100):"—"} c={getMetricColor("IRR",w.lpIRR)} bold />
              {w.lpCashIRR != null && w.lpCashIRR !== w.lpIRR ? <KR l={ar?"IRR نقدي":"Cash IRR"} v={fmtPct(w.lpCashIRR*100)} c={getMetricColor("IRR",w.lpCashIRR)} /> : null}
              <KR l="MOIC" v={w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.lpMOIC)} bold />
              {w.lpCashMOIC && w.lpCashMOIC !== w.lpMOIC ? <KR l={ar?"MOIC نقدي":"Cash MOIC"} v={w.lpCashMOIC.toFixed(2)+"x"} c={getMetricColor("MOIC",w.lpCashMOIC)} /> : null}
              <KR l="DPI" v={w.lpDPI?w.lpDPI.toFixed(2)+"x":"—"} />
              <KR l={ar?"استرداد":"Payback"} v={lpPayback?`${lpPayback} ${ar?"سنة":"yr"}`:"—"} />
              <KR l={ar?"عائد نقدي":"Cash Yield"} v={lpStabYieldVal>0?fmtPct(lpStabYieldVal*100):"—"} />
              <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${investYears} ${ar?"سنة":"yr"}`} />
              <SecHd text={ar?"مؤشرات المطور (كمستثمر)":"DEV. METRICS (AS INVESTOR)"} />
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={gpSimpleROE?fmtPct(gpSimpleROE*100):"—"} c="#3b82f6" />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={gpSimpleAnnual?fmtPct(gpSimpleAnnual*100):"—"} c="#3b82f6" />
              <KR l={ar?"صافي IRR (مركب)":"Net IRR (Compounded)"} v={w.gpIRR!==null?fmtPct(w.gpIRR*100):"—"} c={getMetricColor("IRR",w.gpIRR)} bold />
              {w.gpCashIRR != null && w.gpCashIRR !== w.gpIRR ? <KR l={ar?"IRR نقدي":"Cash IRR"} v={fmtPct(w.gpCashIRR*100)} c={getMetricColor("IRR",w.gpCashIRR)} /> : null}
              <KR l="MOIC" v={w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.gpMOIC)} bold />
              {w.gpCashMOIC && w.gpCashMOIC !== w.gpMOIC ? <KR l={ar?"MOIC نقدي":"Cash MOIC"} v={w.gpCashMOIC.toFixed(2)+"x"} c={getMetricColor("MOIC",w.gpCashMOIC)} /> : null}
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
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.gp?"▲":"▼"}</span>
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
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.fund?"▲":"▼"}</span>
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
              <KR l={f?.isHybrid?(ar?"ملكية الصندوق":"Fund Equity"):(ar?"إجمالي الملكية":"Total Equity")} v={fmtM(w.totalEquity)} bold />
              <KR l={ar?"المستثمر / المطور":"Investor / Developer"} v={`${fmtPct(lpPctVal*100)} / ${fmtPct(gpPctVal*100)}`} />
              {f?.isHybrid && <KR l={ar?"تمويل مؤسسي":"Inst. Financing"} v={fmtM(f.govLoanAmount)} c="#059669" />}
              <KR l={ar?"دين":"Debt"} v={f?.totalDebt ? fmtM(f.totalDebt) : "—"} c="#ef4444" />
              <SecHd text={ar?"التخارج":"EXIT"} />
              <KR l={ar?"السنة":"Year"} v={exitYr>0?`${exitYr} (${sy+exitYr-1})`:"—"} />
              <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
              <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="#16a34a" />
              <KR l={ar?"تكاليف %":"Cost %"} v={exitCostPct>0?fmtPct(exitCostPct)+"%":"—"} />
              <SecHd text={ar?"إعدادات":"CONFIG"} />
              <KR l={ar?"معاملة الرسوم":"Fee Treatment"} v={({capital:ar?"رأسمالية":"Capital",expense:ar?"مصروفات":"Expense"})[cfg.feeTreatment||"capital"]||cfg.feeTreatment||"Capital"} />
              <KR l={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} v={({nav:ar?"صافي قيمة الأصول":"NAV",devCost:ar?"إجمالي الأصول":"GAV",equity:ar?"حجم الصندوق":"Fund Size",deployed:ar?"CAPEX منفذ":"Deployed"})[cfg.mgmtFeeBase||"nav"]||cfg.mgmtFeeBase||"NAV"} />
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
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.devTotal?"▲":"▼"}</span>
          </div>
          {!kpiOpen.devTotal ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"إجمالي":"Total", fmtM(devTotalEconomics), "#16a34a")}
              {badge(ar?"عائد بسيط":"Simple", gpSimpleROE?fmtPct(gpSimpleROE*100):"—", "#3b82f6")}
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
                {badge(ar?"عائد بسيط (إجمالي)":"Simple (Total)", gpSimpleROE?fmtPct(gpSimpleROE*100):"—", "#3b82f6")}
                {badge(ar?"عائد بسيط (سنوي)":"Simple (Annual)", gpSimpleAnnual?fmtPct(gpSimpleAnnual*100):"—", "#3b82f6")}
                {badge(ar?"IRR مركب":"IRR (Net)", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
                {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
                {badge(ar?"استرداد":"Payback", gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—", "#6366f1")}
              </div>
            </div>
          )}
        </div>
      </div>
      </>;
    })()}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} waterfall={w} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT (if active) ═══ */}
    {!isFiltered && incentivesResult && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CHART TOGGLE ═══ */}
    {cfChartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setWSec(p=>({...p,chart:!p.chart}))} style={{...btnS,fontSize:11,padding:"6px 14px",background:wSec.chart?"#f0f4ff":"#f8f9fb",color:wSec.chart?"#2563eb":"#6b7080",border:"1px solid "+(wSec.chart?"#93c5fd":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"عرض الرسم البياني":"Show Chart"} {wSec.chart?"▲":"▼"}
        </button>
        {wSec.chart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
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
              <Area type="monotone" dataKey="lp" stroke="#8b5cf6" strokeWidth={2} fill="url(#lpG)" name={ar?"مستثمر":"Investor"} dot={false} />
              <Area type="monotone" dataKey="gp" stroke="#3b82f6" strokeWidth={2} fill="url(#gpG)" name={ar?"مطور":"Developer"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>
    )}

    {/* ═══ UNIFIED TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"تدفقات الصندوق":"Fund Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
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
      <CFRow label={ar?"طلبات رأس المال":"Equity Calls"} values={w.equityCalls} total={w.equityCalls.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
      {f && <>
        <CFRow label={ar?"سحوبات الدين":"Debt Drawdown"} values={f.drawdown} total={f.drawdown?.reduce((a,b)=>a+b,0)||0} />
        <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={f.debtBalOpen} total={null} />
        <CFRow label={ar?"سداد أصل الدين":"Debt Repayment"} values={f.repayment} total={f.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
        <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={f.debtBalClose} total={null} />
        <CFRow label={ar?"تكلفة التمويل (Profit / Interest)":"Interest/Profit"} values={f.interest} total={f.totalInterest||0} negate color="#ef4444" />
        <CFRow label={ar?"إجمالي خدمة الدين":"Total Debt Service"} values={f.debtService} total={f.debtService?.reduce((a,b)=>a+b,0)||0} negate bold color="#ef4444" />
        {/* DSCR */}
        {f.dscr && <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontWeight:500,minWidth:isMobile?120:200,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>DSCR</td>
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

      {/* ═══ § 9. DISTRIBUTIONS & WATERFALL ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s9:!p.s9}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#7c3aed",background:"#f5f3ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #8b5cf6",userSelect:"none"}}>{wSec.s9?"▶":"▼"} {ar?"9. التوزيعات وشلال الأرباح":"9. DISTRIBUTIONS & WATERFALL"}</td></tr>
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

      {/* Pref tracking - only show if prefReturnPct > 0 */}
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
      {w.tier3?.some(v=>v>0) && <CFRow label={ar?"T3: تعويض":"T3: Catch-up"} values={w.tier3} total={t3Total} color="#f59e0b" />}
      {(t4LPTotal+t4GPTotal) > 0 && <>
      <CFRow label={ar?"توزيع الأرباح":"Profit Split"} values={(() => { const a=new Array(h).fill(0); for(let y=0;y<h;y++) a[y]=(w.tier4LP[y]||0)+(w.tier4GP[y]||0); return a; })()} total={t4LPTotal+t4GPTotal} color="#16a34a" />
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#16a34a",paddingInlineStart:24}}>→ {ar?"مستثمر":"Investor"} ({cfg.lpProfitSplitPct||75}%)</td>
        <td style={{...tdN,fontSize:10,color:"#16a34a"}}>{fmt(t4LPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#16a34a"}}>{(w.tier4LP[y]||0)===0?"—":fmt(w.tier4LP[y])}</td>)}
      </tr>
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>→ {ar?"مطور":"Developer"} ({100-(cfg.lpProfitSplitPct||75)}%)</td>
        <td style={{...tdN,fontSize:10,color:"#3b82f6"}}>{fmt(t4GPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#3b82f6"}}>{(w.tier4GP[y]||0)===0?"—":fmt(w.tier4GP[y])}</td>)}
      </tr>
      </>}

      {/* Distribution totals */}
      <CFRow label={ar?"إجمالي توزيعات المستثمر":"Total Investor Distributions"} values={w.lpDist} total={w.lpTotalDist} bold color="#8b5cf6" />
      <CFRow label={ar?"إجمالي توزيعات المطور":"Total Developer Distributions"} values={w.gpDist} total={w.gpTotalDist} bold color="#3b82f6" />
      </>}

      {/* ═══ § 10. INVESTOR RETURNS ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s10:!p.s10}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#92400e",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ca8a04",userSelect:"none"}}>{wSec.s10?"▶":"▼"} {ar?"10. عوائد المستثمر":"10. INVESTOR RETURNS"}</td></tr>
      {!wSec.s10 && <>
      <CFRow label={ar?"صافي CF المستثمر":"Investor Net Cash Flow"} values={w.lpNetCF} total={w.lpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:600,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"↳ تراكمي المستثمر":"↳ Investor Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.lpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.lpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي المستثمر %":"Investor Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=lpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}

      <CFRow label={ar?"صافي CF المطور":"Developer Net Cash Flow"} values={w.gpNetCF} total={w.gpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:600,fontSize:10,color:"#1e40af",paddingInlineStart:20}}>{ar?"↳ تراكمي المطور":"↳ Developer Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.gpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.gpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي المطور %":"Developer Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=gpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
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
      <div style={{background:"var(--surface-card)",borderRadius:10,border:"1px solid #f59e0b22",marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08"}}>
          <span style={{fontSize:14}}>🚪</span>
          <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"استراتيجية التخارج":"Exit Strategy"}</span>
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
    <div style={{background:"var(--surface-card)",borderRadius:10,border:`1px solid ${open?"#f59e0b33":"#f59e0b22"}`,marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08",borderBottom:open?"1px solid #f59e0b18":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🚪</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تحليل التخارج":"Exit Analysis"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 8px",borderRadius:10}}>
          {isSale ? `${exitMult}x · ` : isCapRate ? `${exitCapRate}% CR · ` : ""}{exitYearAbs} · {fmtM(exitProc)}
        </span>
        <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Row 1: Strategy + Valuation */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:10,marginBottom:14}}>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"الاستراتيجية":"Strategy"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?(ar?"بيع (مضاعف)":"Sale (Multiple)"):isCapRate?(ar?"بيع (رسملة)":"Sale (Cap Rate)"):(ar?"احتفاظ":"Hold")}</div>
          </div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"سنة التخارج":"Exit Year"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{exitYearAbs} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>({ar?"سنة":"Yr"} {exitYrIdx+1})</span></div>
          </div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"فترة الاحتفاظ":"Hold Period"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{holdPeriod > 0 ? `${holdPeriod} ${ar?"سنة بعد البناء":"yr post-build"}` : "—"}</div>
          </div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{isSale?(ar?"المضاعف":"Multiple"):(ar?"معدل الرسملة":"Cap Rate")}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?`${exitMult}x`:isCapRate?`${exitCapRate}%`:"—"}</div>
          </div>
        </div>

        {/* Row 2: Value breakdown */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
          {/* Valuation */}
          <div style={{background:"#fffbeb",borderRadius:8,padding:"10px 14px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400e",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"التقييم":"VALUATION"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"دخل مستقر":"Stabilized Income"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(stabIncome)}</span>
              {stabLandRent > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"(-) إيجار أرض":"(-) Land Rent"}</span><span style={{textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmt(stabLandRent)}</span></>}
              {stabNOI !== stabIncome && <><span style={{color:"var(--text-secondary)"}}>= NOI</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(stabNOI)}</span></>}
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,color:"var(--text-secondary)"}}>{isSale?`× ${exitMult}x`:isCapRate?`÷ ${exitCapRate}%`:""}</span>
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,textAlign:"right",fontWeight:700,color:"var(--text-primary)"}}>{fmtM(grossExit)}</span>
              <span style={{color:"#ef4444",fontSize:11}}>{ar?"(-) تكاليف التخارج":"(-) Exit Costs"} ({exitCostPct}%)</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(exitCostAmt)}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,fontWeight:700,color:"#16a34a"}}>{ar?"= صافي العائد":"= Net Proceeds"}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,textAlign:"right",fontWeight:800,fontSize:14,color:"#16a34a"}}>{fmtM(exitProc)}</span>
            </div>
          </div>

          {/* Returns */}
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#166534",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"مؤشرات التخارج":"EXIT METRICS"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"العائد / التكلفة":"Proceeds / Dev Cost"}</span><span style={{textAlign:"right",fontWeight:700,color:returnOnCost>1?"#16a34a":"#ef4444"}}>{returnOnCost.toFixed(2)}x</span>
              {impliedCapRate > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"معدل رسملة ضمني":"Implied Cap Rate"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedCapRate.toFixed(1)}%</span></>}
              {impliedMultiple > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"مضاعف ضمني":"Implied Multiple"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedMultiple.toFixed(1)}x</span></>}
              {debtAtExit > 0 && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"#ef4444"}}>{ar?"دين متبقي عند التخارج":"Debt at Exit"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmtM(debtAtExit)}</span>
                <span style={{color:"#16a34a",fontWeight:600}}>{ar?"صافي للملكية":"Net to Equity"}</span><span style={{textAlign:"right",fontWeight:700,color:netToEquity>0?"#16a34a":"#ef4444"}}>{fmtM(netToEquity)}</span>
              </>}
              {f.totalEquity > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"العائد / الملكية":"Proceeds / Equity"}</span><span style={{textAlign:"right",fontWeight:600,color:"#16a34a"}}>{(exitProc/f.totalEquity).toFixed(2)}x</span></>}
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
    <div style={{background:"var(--surface-card)",borderRadius:10,border:"1px solid #05966933",marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#05966908",borderBottom:open?"1px solid #05966918":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🏛</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"أثر الحوافز الحكومية":"Government Incentives Impact"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#059669",background:"#05966918",padding:"2px 8px",borderRadius:10}}>{fmtM(total)} {cur}</span>
        <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Active incentives */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {items.map((it,i) => (
            <div key={i} style={{display:"inline-flex",alignItems:"center",gap:6,background:it.color+"12",border:`1px solid ${it.color}33`,borderRadius:6,padding:"5px 10px"}}>
              <span style={{fontSize:12}}>{it.icon}</span>
              <span style={{fontSize:11,fontWeight:600,color:it.color}}>{it.label}</span>
              <span style={{fontSize:11,fontWeight:700,color:"var(--text-primary)"}}>{fmtM(it.value)}</span>
            </div>
          ))}
        </div>

        {/* Before/After comparison */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
          {/* Without */}
          <div style={{background:"#fef2f2",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"بدون حوافز":"WITHOUT INCENTIVES"}</div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"#ef4444"}}>{baseIRR!==null?fmtPct(baseIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)"}}>{fmtM(baseNPV)}</div>
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
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"#16a34a"}}>{withIRR!==null?fmtPct(withIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:4}}>NPV@12%</div>
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
function ResultsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const ar = lang === "ar";
  if (!project || !results) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>{ar?"أضف أصول لرؤية النتائج":"Add assets to see results"}</div>;

  const mode = project.finMode || financing?.mode || "self";

  // ── INCOME FUND: Dedicated view ──
  if (mode === "incomeFund") {
    return <IncomeFundResultsView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── FUND MODE: WaterfallView (incentives injected inside) ──
  if (mode === "fund" || mode === "hybrid") {
    return <WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── BANK DEBT / BANK 100%: Full bank results ──
  if (mode === "debt" || mode === "bank100") {
    return <BankResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── SELF: Full self-funded results ──
  return <SelfResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
}

// ═══════════════════════════════════════════════════════════════
// SELF-FUNDED RESULTS VIEW
// ═══════════════════════════════════════════════════════════════
function SelfResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
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
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

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
  const selfTotalInvested = Math.abs(levCF.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const selfSimpleROE = selfTotalInvested > 0 ? totalLevCF / selfTotalInvested : 0;
  const selfInvestYears = (() => {
    let first = -1, last = 0;
    for (let y = 0; y < h; y++) { if (levCF[y] < 0 && first < 0) first = y; if (levCF[y] > 0) last = y; }
    return Math.max(1, first >= 0 ? last - first + 1 : h);
  })();
  const selfSimpleAnnual = selfInvestYears > 0 ? selfSimpleROE / selfInvestYears : 0;

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
  const KR = ({l,v,c:clr,bold:b}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:clr||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
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
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
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
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.proj?"▲":"▼"}</span>
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
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.cap?"▲":"▼"}</span>
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
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.ret?"▲":"▼"}</span>
        </div>
        {!kpiOpen.ret ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"عائد بسيط":"Simple", selfSimpleROE?fmtPct(selfSimpleROE*100):"—", "#f59e0b")}
            {badge("IRR", levIRR!==null?fmtPct(levIRR*100):"—", getMetricColor("IRR",levIRR))}
            {exitProc>0 && badge(ar?"تخارج":"Exit", fmtM(exitProc), "#16a34a")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"العائد البسيط (عرف السوق)":"SIMPLE RETURN (MARKET CONVENTION)"} />
            <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={selfSimpleROE?fmtPct(selfSimpleROE*100):"N/A"} c="#f59e0b" bold />
            <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={selfSimpleAnnual?fmtPct(selfSimpleAnnual*100):"N/A"} c="#f59e0b" />
            <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${selfInvestYears} ${ar?"سنة":"yr"}`} />
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
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

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
        {showChart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
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
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
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
          <span>{ar?"عائد بسيط":"Simple"} <strong style={{color:"#f59e0b"}}>{selfSimpleROE?fmtPct(selfSimpleROE*100):"—"}</strong> <span style={{fontSize:9,color:"var(--text-secondary)"}}>({ar?"سنوي":"ann."} {selfSimpleAnnual?fmtPct(selfSimpleAnnual*100):"—"})</span></span>
          <span>IRR <strong style={{color:getMetricColor("IRR",levIRR)}}>{levIRR!==null?fmtPct(levIRR*100):"N/A"}</strong></span>
          <span>{ar?"استرداد":"Payback"} <strong style={{color:"#2563eb"}}>{payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
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
function BankResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
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

  if (!financing) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>{ar?"اضبط إعدادات التمويل":"Configure financing settings"}</div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
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
  const bankLevCF = pf.leveredCF || [];
  const bankTotalInvested = Math.abs(bankLevCF.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const bankSimpleROE = bankTotalInvested > 0 ? devNetCF / bankTotalInvested : 0;
  const bankInvestYears = (() => {
    let first = -1, last = 0;
    for (let y = 0; y < h; y++) { if ((bankLevCF[y]||0) < 0 && first < 0) first = y; if ((bankLevCF[y]||0) > 0) last = y; }
    return Math.max(1, first >= 0 ? last - first + 1 : h);
  })();
  const bankSimpleAnnual = bankInvestYears > 0 ? bankSimpleROE / bankInvestYears : 0;
  const isHoldMode = (cfg.exitStrategy || "sale") === "hold" || cfg.finMode === "incomeFund";
  const isLongHold = isHoldMode && bankInvestYears > 20;

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    balance: pf.debtBalClose?.[y] || 0,
    noi: (pc.income[y]||0) - (pc.landRent[y]||0),
    ds: pf.debtService?.[y] || 0,
  }));

  // CFRow (same as WaterfallView)
  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
    const nc = v => { if(color) return color; return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  // Shared mini-components (same as WaterfallView KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c,bold:b}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:c||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  return (<div>
    {/* ═══ Phase Selector (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
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
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
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
          <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تعديل سريع - شروط القرض":"Quick Edit - Loan Terms"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{!isBank100?`${cfg.maxLtvPct||70}% LTV · `:""}{cfg.financeRate||6.5}% · {cfg.loanTenor||7} {ar?"سنة":"yrs"} ({cfg.debtGrace||3} {ar?"سماح":"grace"})</span>
          <span style={{fontSize:11,color:"var(--text-tertiary)",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #bfdbfe",animation:"zanSlide 0.15s ease"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2563eb",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"شروط القرض":"LOAN TERMS"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {!isBank100 && <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>LTV %</span>
              <input type="number" value={cfg.maxLtvPct||""} onChange={e=>upCfg({maxLtvPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>}
            {[
              {l:ar?"معدل %":"Rate %",k:"financeRate",v:cfg.financeRate},
              {l:ar?"المدة":"Tenor (yr)",k:"loanTenor",v:cfg.loanTenor},
              {l:ar?"سماح":"Grace (yr)",k:"debtGrace",v:cfg.debtGrace},
              {l:ar?"رسوم %":"Fee %",k:"upfrontFeePct",v:cfg.upfrontFeePct},
            ].map(fld=><div key={fld.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{fld.l}</span>
              <input type="number" value={fld.v||""} onChange={e=>upCfg({[fld.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"السداد":"Repay"}</span>
              <select value={cfg.repaymentType||"amortizing"} onChange={e=>upCfg({repaymentType:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="amortizing">{ar?"أقساط":"Amortizing"}</option>
                <option value="bullet">{ar?"دفعة واحدة":"Bullet"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"بداية السماح":"Grace Basis"}</span>
              <select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="cod">COD</option>
                <option value="firstDraw">{ar?"أول سحب":"1st Draw"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"السحب":"Tranche"}</span>
              <select value={cfg.debtTrancheMode||"single"} onChange={e=>upCfg({debtTrancheMode:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="single">{ar?"كتلة واحدة":"Single"}</option>
                <option value="perDraw">{ar?"لكل سحبة":"Per Draw"}</option>
              </select>
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"التخارج":"EXIT STRATEGY"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"الاستراتيجية":"Strategy"}</span>
              <select value={cfg.exitStrategy||"sale"} onChange={e=>upCfg({exitStrategy:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="sale">{ar?"بيع":"Sale"}</option>
                <option value="hold">{ar?"احتفاظ":"Hold"}</option>
                <option value="caprate">Cap Rate</option>
              </select>
            </div>
            {(cfg.exitStrategy||"sale")!=="hold"&&<>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"السنة":"Year"}</span>
                <input type="number" value={cfg.exitYear||""} onChange={e=>upCfg({exitYear:parseFloat(e.target.value)||0})} placeholder="auto" style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
                {pf?.optimalExitYear > 0 && pf?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <span style={{fontSize:10,color:"#92400e",background:"#fef9c3",padding:"2px 6px",borderRadius:4}}>💡 {ar?"يوصى:":"Rec:"} {pf.optimalExitYear} ({(pf.optimalExitIRR*100).toFixed(1)}%)</span>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"المضاعف":"Multiple"}</span>
                <input type="number" value={cfg.exitMultiple||""} onChange={e=>upCfg({exitMultiple:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>}
              {cfg.exitStrategy==="caprate"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"رسملة %":"Cap %"}</span>
                <input type="number" value={cfg.exitCapRate||""} onChange={e=>upCfg({exitCapRate:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"تكلفة %":"Cost %"}</span>
                <input type="number" value={cfg.exitCostPct||""} onChange={e=>upCfg({exitCostPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
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
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.bank?"▲":"▼"}</span>
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
            <KR l={ar?"أولوية السحب":"Draw Order"} v={cfg.finMode==="hybrid"?((cfg.hybridDrawOrder||"finFirst")==="finFirst"?(ar?"التمويل أولاً":"Financing First"):(ar?"متزامن":"Pro-Rata")):((cfg.capitalCallOrder||"prorata")==="debtFirst"?(ar?"الدين أولاً":"Debt First"):(ar?"متزامن":"Pro-Rata"))} />
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
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.dev?"▲":"▼"}</span>
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
            {isLongHold ? <>
              <SecHd text={ar?"عائد الاحتفاظ":"HOLD RETURN"} />
              <KR l={ar?"عائد نقدي سنوي (مستقر)":"Stabilized Cash Yield"} v={cashOnCash>0?fmtPct(cashOnCash*100):"N/A"} c="#f59e0b" bold />
              <KR l={ar?"فترة الاحتفاظ":"Hold Period"} v={`${bankInvestYears} ${ar?"سنة":"yr"}`} />
            </> : <>
              <SecHd text={ar?"العائد البسيط (عرف السوق)":"SIMPLE RETURN (MARKET CONVENTION)"} />
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={bankSimpleROE?fmtPct(bankSimpleROE*100):"N/A"} c="#f59e0b" bold />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={bankSimpleAnnual?fmtPct(bankSimpleAnnual*100):"N/A"} c="#f59e0b" />
              <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${bankInvestYears} ${ar?"سنة":"yr"}`} />
            </>}
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
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.proj?"▲":"▼"}</span>
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
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و DSCR؟":"What do IRR, NPV, DSCR mean?"} /></div>

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
          <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{ar?"هيكل رأس المال":"Capital Structure"}</div>
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
          {dscrData.length > 1 && <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{ar?"مسار DSCR":"DSCR Trajectory"}</div>
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
        {showChart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
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
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
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
      {!isBank100 && pf.equityCalls && <CFRow label={ar?"طلبات رأس المال":"Equity Calls"} values={pf.equityCalls} total={pf.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" negate />}
      {/* Cumulative equity deployed */}
      {!isBank100 && pf.equityCalls && <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:500,fontSize:10,color:"#7c3aed",paddingInlineStart:20,minWidth:isMobile?120:200}}>{ar?"↳ ملكية تراكمية":"↳ Cumulative Equity"}</td>
        <td style={tdN}></td>
        {(() => { let cum=0; return years.map(y => { cum+=pf.equityCalls[y]||0; return <td key={y} style={{...tdN,fontSize:10,fontWeight:500,color:cum>0?"#7c3aed":"#d0d4dc"}}>{cum>0?fmt(cum):"—"}</td>; }); })()}
      </tr>}
      <CFRow label={ar?"سحوبات الدين":"Debt Drawdown"} values={pf.drawdown} total={pf.drawdown?.reduce((a,b)=>a+b,0)||0} />
      <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={pf.debtBalOpen} total={null} />
      <CFRow label={ar?"(-) سداد أصل الدين":"(-) Principal Repayment"} values={pf.repayment} total={pf.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
      <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={pf.debtBalClose} total={null} />
      <CFRow label={ar?"(-) تكلفة التمويل (Profit / Interest)":"(-) Interest / Profit Cost"} values={pf.interest} total={pf.totalInterest||0} negate color="#ef4444" />
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
      {(pf.upfrontFee||0) > 0 && <tr style={{background:"#fef2f2"}}><td style={{...tdSt,position:"sticky",left:0,background:"#fef2f2",zIndex:1,fontSize:10,color:"var(--text-tertiary)",paddingInlineStart:20,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* includes upfront fee"}: {fmt(pf.upfrontFee)}</td><td colSpan={years.length+1}></td></tr>}
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
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي %":"Cash Yield %"}</td>
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
              : <span>{ar?"عائد بسيط":"Simple"} <strong style={{color:"#f59e0b"}}>{bankSimpleROE?fmtPct(bankSimpleROE*100):"—"}</strong> <span style={{fontSize:9,color:"var(--text-secondary)"}}>({ar?"سنوي":"ann."} {bankSimpleAnnual?fmtPct(bankSimpleAnnual*100):"—"})</span></span>
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

// ── Financing Panel Input Components (MUST be outside FinancingView to keep focus) ──
const _finInpSt = {padding:"8px 11px",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",background:"var(--surface-card)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s"};
const _finSelSt = {..._finInpSt,cursor:"pointer",appearance:"auto"};
function FieldGroup({icon,title,children,defaultOpen=false,globalExpand}) {
  const [open,setOpen]=useState(defaultOpen);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  return <div style={{marginBottom:12,border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
    <button onClick={()=>setOpen(!open)} style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:open?"var(--surface-card)":"var(--surface-hover)",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,color:"var(--text-primary)"}}><span>{icon}</span><span>{title}</span><span style={{marginInlineStart:"auto",fontSize:9,color:"var(--text-tertiary)"}}>{open?"▲":"▼"}</span></button>
    {open&&<div style={{padding:"10px 14px",borderTop:"0.5px solid var(--surface-separator)"}}>{children}</div>}
  </div>;
}
function FL({label,children,tip,hint,error}) {
  return (<div style={{marginBottom:10}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:error?"var(--color-danger-text)":"var(--text-secondary)",marginBottom:4,fontWeight:500,letterSpacing:0.2}}>{tip?<Tip text={tip}>{label}</Tip>:label}</label>
    <div style={error?{borderRadius:"var(--radius-sm)",boxShadow:"0 0 0 1.5px var(--color-danger)"}:undefined}>{children}</div>
    {error&&<div style={{fontSize:9,color:"var(--color-danger-text)",marginTop:3,fontWeight:500}}>{error}</div>}
    {!error&&hint&&<div style={{fontSize:9,color:"var(--text-tertiary)",marginTop:3}}>{hint}</div>}
  </div>);
}
function Inp({value,onChange,type="text",...rest}) {
  const [local, setLocal] = useState(String(value??""));
  const ref = useRef(null);
  const committed = useRef(value);
  useEffect(() => { if (committed.current !== value && document.activeElement !== ref.current) { setLocal(String(value??"")); committed.current = value; } }, [value]);
  const commit = () => { const v = type==="number" ? +local : local; if (v !== committed.current) { committed.current = v; onChange(v); } };
  return <input ref={ref} type={type} value={local} onChange={e=>setLocal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter"){commit();e.target.blur();}}} style={_finInpSt} onFocus={e=>{e.target.style.borderColor="var(--border-focus)";e.target.style.boxShadow="var(--shadow-focus)";e.target.style.background="var(--surface-card)";}} {...rest} />;
}
function Drp({value,onChange,options,lang:dl}) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={_finSelSt}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[dl]||o.en||o.label}</option>)}</select>;
}

