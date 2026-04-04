// Extracted from App.jsx lines 4455-5858
// AssetTable + StatusBadge + ScoreCell + HotelPLModal + MarinaPLModal

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { btnS, btnPrim, btnSm, cellInputStyle, tblStyle, thSt, tdSt, tdN } from "../shared/styles";
import { csvEscape, csvParse, generateTemplate, parseAssetFile, mapRowsToAssets, exportAssetsToExcel, TEMPLATE_COLS } from "../../utils/csv";
import { getBenchmark, benchmarkColor, getAutoFillDefaults, BENCHMARKS } from "../../data/benchmarks";
import { CAT_AR, REV_AR, catL, revL } from "../../data/translations";
import { calcHotelEBITDA, calcMarinaEBITDA } from "../../engine/hospitality";
import { defaultHotelPL, defaultMarinaPL } from "../../data/defaults";
import { getMetricColor } from "../../utils/metricColor.js";
import AssetDetailPanel from "../AssetDetailPanel.jsx";

function StatusBadge({status,onChange}) {
  const [open,setOpen]=useState(false);
  const sts=["Draft","In Progress","Complete"];
  const col={Draft:{bg:"#f0f1f5",fg:"#6b7080"},"In Progress":{bg:"#dbeafe",fg:"#2563eb"},Complete:{bg:"#dcfce7",fg:"#16a34a"}};
  const c=col[status]||col.Draft;
  return (<div style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{...btnS,background:c.bg,color:c.fg,padding:"4px 12px",fontSize:11,fontWeight:600}}>{status||"Draft"} ▾</button>
    {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#fff",border:"1px solid #e5e7ec",borderRadius:6,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:100,overflow:"hidden"}}>
      {sts.map(s=><button key={s} onClick={()=>{onChange(s);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 16px",border:"none",background:status===s?"#f0f1f5":"#fff",fontSize:12,cursor:"pointer",textAlign:"start",color:"#1a1d23"}}>{s}</button>)}
    </div>}
  </div>);
}

function HotelPLModal({ data, onSave, onClose, t, lang }) {
  const ar = lang === "ar";
  const [h, setH] = useState(data || defaultHotelPL());
  const upH = (u) => setH(prev => ({...prev, ...u}));
  const calc = calcHotelEBITDA(h);

  const applyPreset = (key) => { const p = HOTEL_PRESETS[key]; if (p) setH(prev => ({...prev, ...p})); };

  const Row = ({label, children}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:"#6b7080"}}>{label}</span><div style={{width:120}}>{children}</div></div>;
  const NumIn = ({value, onChange}) => {
    const [loc, setLoc] = useState(String(value ?? ""));
    const ref = useRef(null);
    useEffect(() => { if (document.activeElement !== ref.current) setLoc(String(value ?? "")); }, [value]);
    return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={()=>{const n=parseFloat(loc);onChange(isNaN(n)?0:n);}} style={{...sideInputStyle,background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec",textAlign:"right",width:"100%"}} />;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:10,width:520,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7ec",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.hotelPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          {/* Presets */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {Object.keys(HOTEL_PRESETS).map(k=><button key={k} onClick={()=>applyPreset(k)} style={{...btnS,background:"#eef2ff",color:"#2563eb",padding:"6px 12px",fontSize:11,fontWeight:500}}>{k}</button>)}
          </div>

          <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.keys}</div>
          <Row label={t.keys}><NumIn value={h.keys} onChange={v=>upH({keys:v})} /></Row>
          <Row label={t.adr}><NumIn value={h.adr} onChange={v=>upH({adr:v})} /></Row>
          <Row label={t.stabOcc}><NumIn value={h.stabOcc} onChange={v=>upH({stabOcc:v})} /></Row>
          <Row label={t.daysYear}><NumIn value={h.daysYear} onChange={v=>upH({daysYear:v})} /></Row>

          <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:8}}>{t.revMix}</div>
          <Row label={t.roomsPct}><NumIn value={h.roomsPct} onChange={v=>upH({roomsPct:v})} /></Row>
          <Row label={t.fbPct}><NumIn value={h.fbPct} onChange={v=>upH({fbPct:v})} /></Row>
          <Row label={t.micePct}><NumIn value={h.micePct} onChange={v=>upH({micePct:v})} /></Row>
          <Row label={t.otherPct}><NumIn value={h.otherPct} onChange={v=>upH({otherPct:v})} /></Row>

          <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:8}}>{t.opexRatios}</div>
          <Row label={t.roomExpPct}><NumIn value={h.roomExpPct} onChange={v=>upH({roomExpPct:v})} /></Row>
          <Row label={t.fbExpPct}><NumIn value={h.fbExpPct} onChange={v=>upH({fbExpPct:v})} /></Row>
          <Row label={t.miceExpPct}><NumIn value={h.miceExpPct} onChange={v=>upH({miceExpPct:v})} /></Row>
          <Row label={t.otherExpPct}><NumIn value={h.otherExpPct} onChange={v=>upH({otherExpPct:v})} /></Row>
          <Row label={t.undistPct}><NumIn value={h.undistPct} onChange={v=>upH({undistPct:v})} /></Row>
          <Row label={t.fixedPct}><NumIn value={h.fixedPct} onChange={v=>upH({fixedPct:v})} /></Row>

          {/* Calculated results */}
          <div style={{marginTop:16,padding:14,background:"#f8f9fb",borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.stabRevenue}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"#6b7080"}}>Rooms Rev</span><span style={{textAlign:"right"}}>{fmt(calc.roomsRev)}</span>
              <span style={{color:"#6b7080"}}>F&B Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fbRev)}</span>
              <span style={{color:"#6b7080"}}>MICE Rev</span><span style={{textAlign:"right"}}>{fmt(calc.miceRev)}</span>
              <span style={{color:"#6b7080"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
            </div>
            <div style={{borderTop:"1px solid #e5e7ec",marginTop:8,paddingTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
                <span style={{color:"#ef4444"}}>Total OPEX</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(calc.totalOpex)}</span>
                <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"#16a34a"}}>{fmt(calc.ebitda)}</span>
                <span style={{color:"#6b7080"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7ec",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"8px 16px",fontSize:12}}>{ar?"إلغاء":"Cancel"}</button>
          <button onClick={()=>{onSave(h, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MARINA P&L MODAL
// ═══════════════════════════════════════════════════════════════
function MarinaPLModal({ data, onSave, onClose, t, lang }) {
  const ar = lang === "ar";
  const [m, setM] = useState(data || defaultMarinaPL());
  const upM = (u) => setM(prev => ({...prev, ...u}));
  const calc = calcMarinaEBITDA(m);

  const Row = ({label, children}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:"#6b7080"}}>{label}</span><div style={{width:120}}>{children}</div></div>;
  const NumIn = ({value, onChange}) => {
    const [loc, setLoc] = useState(String(value ?? ""));
    const ref = useRef(null);
    useEffect(() => { if (document.activeElement !== ref.current) setLoc(String(value ?? "")); }, [value]);
    return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={()=>{const n=parseFloat(loc);onChange(isNaN(n)?0:n);}} style={{...sideInputStyle,background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec",textAlign:"right",width:"100%"}} />;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:10,width:480,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7ec",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.marinaPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          <button onClick={()=>setM(prev=>({...prev,...MARINA_PRESET}))} style={{...btnS,background:"#eef2ff",color:"#2563eb",padding:"6px 12px",fontSize:11,fontWeight:500,marginBottom:12}}>Marina Preset</button>
          <Row label={t.berths}><NumIn value={m.berths} onChange={v=>upM({berths:v})} /></Row>
          <Row label={t.avgLength}><NumIn value={m.avgLength} onChange={v=>upM({avgLength:v})} /></Row>
          <Row label={t.unitPrice}><NumIn value={m.unitPrice} onChange={v=>upM({unitPrice:v})} /></Row>
          <Row label={t.stabOcc||"Occ %"}><NumIn value={m.stabOcc} onChange={v=>upM({stabOcc:v})} /></Row>
          <Row label={t.fuelPct}><NumIn value={m.fuelPct} onChange={v=>upM({fuelPct:v})} /></Row>
          <Row label={t.otherRevPct}><NumIn value={m.otherRevPct} onChange={v=>upM({otherRevPct:v})} /></Row>
          <Row label={t.berthingOpex}><NumIn value={m.berthingOpexPct} onChange={v=>upM({berthingOpexPct:v})} /></Row>
          <Row label={t.fuelOpex}><NumIn value={m.fuelOpexPct} onChange={v=>upM({fuelOpexPct:v})} /></Row>
          <Row label={t.otherOpex}><NumIn value={m.otherOpexPct} onChange={v=>upM({otherOpexPct:v})} /></Row>

          <div style={{marginTop:16,padding:14,background:"#f8f9fb",borderRadius:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"#6b7080"}}>Berthing Rev</span><span style={{textAlign:"right"}}>{fmt(calc.berthingRev)}</span>
              <span style={{color:"#6b7080"}}>Fuel Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fuelRev)}</span>
              <span style={{color:"#6b7080"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
              <span style={{color:"#ef4444"}}>Total OPEX</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(calc.totalOpex)}</span>
              <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"#16a34a"}}>{fmt(calc.ebitda)}</span>
              <span style={{color:"#6b7080"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7ec",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"8px 16px",fontSize:12}}>{ar?"إلغاء":"Cancel"}</button>
          <button onClick={()=>{onSave(m, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Score Tooltip Cell (fixed-position, escapes overflow) ──
function ScoreCell({ sc, name, ar }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top - 6, left: r.left + r.width / 2 });
    }
    setShow(true);
  };
  const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",label:"✓",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",label:"~",t:ar?"مقبول":"Marginal"}, weak:{bg:"#fef2f2",color:"#991b1b",label:"✗",t:ar?"ضعيف":"Weak"}, none:{bg:"#f0f1f5",color:"#9ca3af",label:"—",t:"—"} }[sc.viable];
  const iCfg = { high:{label:"▲",color:"#1e40af",t:ar?"أثر كبير":"High impact"}, med:{label:"▬",color:"#6b7080",t:ar?"أثر متوسط":"Med impact"}, low:{label:"▼",color:"#9ca3af",t:ar?"أثر محدود":"Low impact"} }[sc.impact];
  const yocPct = (sc.yoc * 100).toFixed(1);
  const wPct = (sc.capexWeight * 100).toFixed(0);
  return (
    <div ref={ref} onMouseEnter={onEnter} onMouseLeave={()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{display:"flex",alignItems:"center",gap:3,cursor:"help"}}>
      <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:vCfg.bg,color:vCfg.color,fontWeight:700}}>{vCfg.label}{yocPct>0?` ${yocPct}%`:""}</span>
      <span style={{fontSize:9,color:iCfg.color,fontWeight:600}}>{iCfg.label}{wPct}%</span>
      {show && <div style={{position:"fixed",top:pos.top,left:Math.max(10, Math.min(pos.left - 150, (typeof window!=="undefined"?window.innerWidth:800) - 310)),transform:"translateY(-100%)",width:300,background:"#1a1d23",color:"#e5e7ec",padding:"14px 16px",borderRadius:10,fontSize:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start",pointerEvents:"none"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#2EC4B6",borderBottom:"1px solid #282d3a",paddingBottom:6}}>{name || (ar?"أصل":"Asset")}</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"#6b7080"}}>{ar?"الجدوى":"Viability"}</span>
          <span style={{fontWeight:600,color:vCfg.color}}>{vCfg.t}</span>
          <span style={{color:"#6b7080"}}>{ar?"العائد على التكلفة":"Yield on Cost"}</span>
          <span style={{fontWeight:600}}>{yocPct}%  <span style={{fontWeight:400,color:"#6b7080"}}>({ar?"إيراد سنوي ÷ CAPEX":"annual rev ÷ CAPEX"})</span></span>
          <span style={{color:"#6b7080"}}>{ar?"إيراد سنوي":"Annual Rev"}</span>
          <span style={{fontWeight:600}}>{fmtM(sc.annualRev)}</span>
          <span style={{color:"#6b7080"}}>CAPEX</span>
          <span style={{fontWeight:600}}>{fmtM(sc.capex)}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"#6b7080"}}>{ar?"الأثر":"Impact"}</span>
          <span style={{fontWeight:600,color:iCfg.color}}>{iCfg.t}</span>
          <span style={{color:"#6b7080"}}>{ar?"وزن CAPEX":"CAPEX Weight"}</span>
          <span style={{fontWeight:600}}>{wPct}% {ar?"من المشروع":"of project"}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,fontSize:10,color:"#9ca3af",fontStyle:"italic"}}>
          {sc.impact==="low"?(ar?"نقل هذا الأصل بين المراحل لن يؤثر كثيراً على المشروع":"Moving this asset between phases won't significantly affect the project"):sc.impact==="high"?(ar?"أصل محوري — أي تغيير في موقعه أو توقيته يؤثر بشكل كبير":"Key asset — any change in timing significantly affects the project"):(ar?"أثر متوسط — يجب مراعاة التوقيت":"Moderate impact — timing matters")}
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSET PROGRAM TABLE
// ═══════════════════════════════════════════════════════════════
function AssetTable({ project, upAsset, addAsset, dupAsset, rmAsset, results, t, lang, updateProject, globalExpand }) {
  const isMobile = useIsMobile();
  const [modal, setModal] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");
  const [editIdx, setEditIdx] = useState(null);
  const [showLandRentDetail, setShowLandRentDetail] = useState(false);
  const [landEduModal, setLandEduModal] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [landOpen, setLandOpen] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState(null);
  const fileRef = useRef(null);
  if (!project) return null;
  const assets = project.assets || [];
  const phaseNames = project.phases.map(p => p.name);

  // ── Asset Templates (Saudi market defaults) ──
  const _ar = lang === "ar";
  const ASSET_TEMPLATES = [
    { id:"hotel5", icon:"🏨", label:_ar?"فندق 5 نجوم":"5-Star Hotel", defaults:{
      name:_ar?"فندق 5 نجوم":"5-Star Hotel", category:"Hospitality", revType:"Operating", code:"H5",
      plotArea:12000, footprint:5000, gfa:35000, efficiency:0, leaseRate:0,
      costPerSqm:12000, constrStart:1, constrDuration:30, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
      opEbitda:47630685, hotelPL:{keys:200, adr:920, stabOcc:73, daysYear:365, roomsPct:64, fbPct:25, micePct:7, otherPct:4, roomExpPct:20, fbExpPct:60, miceExpPct:58, otherExpPct:55, undistPct:28, fixedPct:9},
    }},
    { id:"hotel4", icon:"🏢", label:_ar?"فندق 4 نجوم":"4-Star Hotel", defaults:{
      name:_ar?"فندق 4 نجوم":"4-Star Hotel", category:"Hospitality", revType:"Operating", code:"H4",
      plotArea:5000, footprint:2000, gfa:16000, efficiency:0, leaseRate:0,
      costPerSqm:8000, constrStart:1, constrDuration:30, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
      opEbitda:13901057, hotelPL:{keys:230, adr:548, stabOcc:70, daysYear:365, roomsPct:72, fbPct:22, micePct:4, otherPct:2, roomExpPct:20, fbExpPct:60, miceExpPct:58, otherExpPct:50, undistPct:29, fixedPct:9},
    }},
    { id:"mall", icon:"🛍️", label:_ar?"مول تجاري":"Retail Mall", defaults:{
      name:_ar?"مول تجاري":"Retail Mall", category:"Retail", revType:"Lease", code:"RM",
      plotArea:28000, footprint:20000, gfa:40000, efficiency:80, leaseRate:2100,
      costPerSqm:3900, constrStart:1, constrDuration:36, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
    }},
    { id:"office", icon:"🏛️", label:_ar?"برج مكاتب":"Office Tower", defaults:{
      name:_ar?"برج مكاتب":"Office Tower", category:"Office", revType:"Lease", code:"OF",
      plotArea:5500, footprint:2700, gfa:16000, efficiency:90, leaseRate:900,
      costPerSqm:2600, constrStart:1, constrDuration:36, rampUpYears:2, stabilizedOcc:100, escalation:0.75,
    }},
    { id:"resi", icon:"🏠", label:_ar?"سكني (أبراج)":"Residential Tower", defaults:{
      name:_ar?"برج سكني":"Residential Tower", category:"Residential", revType:"Lease", code:"R1",
      plotArea:4000, footprint:2000, gfa:14000, efficiency:85, leaseRate:800,
      costPerSqm:2800, constrStart:1, constrDuration:30, rampUpYears:2, stabilizedOcc:92, escalation:0.75,
    }},
    { id:"marina", icon:"⚓", label:_ar?"مارينا":"Marina", defaults:{
      name:_ar?"مارينا":"Marina", category:"Marina", revType:"Operating", code:"MAR",
      plotArea:3000, footprint:0, gfa:2400, efficiency:0, leaseRate:0,
      costPerSqm:16000, constrStart:1, constrDuration:12, rampUpYears:4, stabilizedOcc:90, escalation:0.75,
      opEbitda:1129331, marinaPL:{berths:80, avgLength:14, unitPrice:2063, stabOcc:90, fuelPct:25, otherRevPct:10, berthingOpexPct:58, fuelOpexPct:96, otherOpexPct:30},
    }},
    { id:"custom", icon:"✏️", label:_ar?"مخصص (فارغ)":"Custom (Empty)", defaults:{} },
  ];

  const handleTemplateSelect = (defaults) => {
    addAsset(Object.keys(defaults).length > 0 ? defaults : undefined);
    setShowTemplatePicker(false);
    setTimeout(() => setEditIdx(assets.length), 50);
  };

  // Auto-open detail modal after adding a new asset
  const handleAddAsset = () => {
    setShowTemplatePicker(true);
  };

  // Auto-fill defaults when category changes (Sprint 1B)
  const handleCategoryChange = (i, newCat) => {
    const a = assets[i];
    const defs = getAutoFillDefaults(newCat);
    // Only auto-fill fields that are at zero/default — don't overwrite user-entered values
    const updates = { category: newCat };
    if ((a.costPerSqm || 0) === 0 && defs.costPerSqm) updates.costPerSqm = defs.costPerSqm;
    if ((a.efficiency || 0) === 0 && defs.efficiency != null) updates.efficiency = defs.efficiency;
    if ((a.leaseRate || 0) === 0 && defs.leaseRate) updates.leaseRate = defs.leaseRate;
    if (defs.revType && a.revType === "Lease" && defs.revType !== "Lease") updates.revType = defs.revType;
    if ((a.rampUpYears || 3) === 3 && defs.rampUpYears) updates.rampUpYears = defs.rampUpYears;
    if ((a.stabilizedOcc || 100) === 100 && defs.stabilizedOcc && defs.stabilizedOcc !== 100) updates.stabilizedOcc = defs.stabilizedOcc;
    if ((a.constrDuration || 12) === 12 && defs.constrDuration) updates.constrDuration = defs.constrDuration;
    upAsset(i, updates);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportMsg({ type: 'loading', text: lang === 'ar' ? 'جاري الاستيراد...' : 'Importing...' });
    try {
      const { assets: imported, newPhases } = await parseAssetFile(file, project);
      if (imported.length === 0) {
        setImportMsg({ type: 'error', text: lang === 'ar' ? 'لم يتم العثور على بيانات' : 'No asset data found in file' });
        return;
      }
      // Add new phases if detected
      let updatedPhases = [...project.phases];
      if (newPhases.length > 0) {
        newPhases.forEach((pName, i) => {
          updatedPhases.push({ name: pName, startYearOffset: updatedPhases.length + 1, completionYear: (project.startYear||2026) + 3, footprint: 0 });
        });
      }
      updateProject({ assets: [...project.assets, ...imported], phases: updatedPhases });
      const opCount = imported.filter(a => a.revType === 'Operating').length;
      let msg = lang === 'ar'
        ? `تم استيراد ${imported.length} أصل بنجاح`
        : `Imported ${imported.length} assets successfully`;
      if (opCount > 0) {
        msg += lang === 'ar'
          ? ` (${opCount} أصول تشغيلية - اضغط P&L لضبط التفاصيل)`
          : ` (${opCount} Operating assets - click P&L to configure details)`;
      }
      if (newPhases.length > 0) {
        msg += lang === 'ar'
          ? ` | تمت إضافة ${newPhases.length} مراحل جديدة`
          : ` | Added ${newPhases.length} new phases`;
      }
      setImportMsg({ type: 'success', text: msg });
      setTimeout(() => setImportMsg(null), 8000);
    } catch (err) {
      setImportMsg({ type: 'error', text: (lang==='ar'?'فشل الاستيراد: ':'Import failed: ') + String(err) });
      setTimeout(() => setImportMsg(null), 6000);
    }
  };

  // Bilingual column headers
  // Viability & Impact scoring per asset
  const totalProjectCapex = results?.consolidated?.totalCapex || 1;
  const totalProjectIncome = results?.consolidated?.totalIncome || 1;
  const getAssetScore = (asset, comp) => {
    const capex = comp?.totalCapex || computeAssetCapex(asset, project);
    const income = comp?.totalRevenue || 0;
    const horizon = project.horizon || 50;
    const durYrs = Math.ceil((asset.constrDuration || 12) / 12);
    const revStart = comp?.revenueSchedule ? comp.revenueSchedule.findIndex(v => v > 0) : -1;
    const revYears = revStart >= 0 ? Math.max(1, horizon - revStart) : Math.max(1, horizon - durYrs);
    const annualRev = revYears > 0 ? income / revYears : 0;
    const yoc = capex > 0 ? annualRev / capex : 0; // Yield on Cost
    const capexWeight = capex / totalProjectCapex; // CAPEX weight
    const incomeWeight = income / totalProjectIncome; // Revenue weight
    // Viability: based on yield on cost
    const viable = capex === 0 ? "none" : yoc > 0.08 ? "strong" : yoc > 0.04 ? "ok" : income > 0 ? "weak" : "none";
    // Impact: based on CAPEX share
    const impact = capexWeight > 0.25 ? "high" : capexWeight > 0.10 ? "med" : "low";
    return { yoc, capexWeight, incomeWeight, annualRev, viable, impact, capex, income };
  };

  const cols = [
    { key:"#", en:"#", ar:"#", w:30 },
    { key:"phase", en:"Phase", ar:"المرحلة", w:80 },
    { key:"category", en:"Category", ar:"التصنيف", w:95 },
    { key:"name", en:"Asset Name", ar:"اسم الأصل", w:130 },
    { key:"code", en:"Code", ar:"الرمز", w:42 },
    { key:"plotArea", en:"Plot", ar:"القطعة", w:60 },
    { key:"footprint", en:"Fprint", ar:"المسطح", w:55 },
    { key:"gfa", en:"GFA", ar:"م.ط", w:60 },
    { key:"revType", en:"Type", ar:"النوع", w:65 },
    { key:"eff", en:"Eff%", ar:"كفاءة", w:45 },
    { key:"leasable", en:"Lease.", ar:"تأجير", w:55 },
    { key:"rate", en:"Rate", ar:"إيجار", w:55 },
    { key:"opEbitda", en:"EBITDA", ar:"تشغيلي", w:75 },
    { key:"esc", en:"Esc%", ar:"زيادة", w:40 },
    { key:"ramp", en:"Ramp", ar:"نمو", w:38 },
    { key:"occ", en:"Occ%", ar:"إشغال", w:42 },
    { key:"cost", en:"Cost/sqm", ar:"تكلفة/م²", w:65 },
    { key:"dur", en:"Build (mo)", ar:"مدة البناء", w:70 },
    { key:"totalCapex", en:"CAPEX", ar:"التكاليف", w:80 },
    { key:"totalInc", en:"Revenue", ar:"الإيرادات", w:80 },
    { key:"score", en:"Score", ar:"تقييم", w:90 },
    { key:"ops", en:"", ar:"", w:30 },
  ];

  const [editingPhase, setEditingPhase] = useState(null);
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterRev, setFilterRev] = useState("all");
  const [hiddenCols, setHiddenCols] = useState(() => new Set(["plotArea","footprint","esc","ramp","occ"]));
  const [showColPicker, setShowColPicker] = useState(false);
  const [cfOpen, setCfOpen] = useState({}); // which asset CFs are expanded
  const [cfAllOpen, setCfAllOpen] = useState(false); // global toggle
  const [cfDetail, setCfDetail] = useState(false); // show detail rows
  const [cfYrs, setCfYrs] = useState(15);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setCfAllOpen(expand); setCfDetail(expand); setLandOpen(expand); setShowLandRentDetail(expand); const obj = {}; (project?.assets||[]).forEach((_, i) => { obj[i] = expand; }); setCfOpen(obj); }}, [globalExpand]);
  const ar = lang === "ar";
  const toggleCol = (key) => { setHiddenCols(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; }); };
  const visibleCols = cols.filter(c => !hiddenCols.has(c.key));

  // Phase management
  const addPhase = () => { const n = project.phases.length + 1; const prevYear = project.phases[project.phases.length-1]?.completionYear || ((project.startYear||2026) + 3); updateProject({ phases: [...project.phases, { name: `Phase ${n}`, startYearOffset: n, completionYear: prevYear + 2, footprint: 0 }] }); };
  const renamePhase = (i, name) => { const ph = [...project.phases]; ph[i] = { ...ph[i], name }; updateProject({ phases: ph }); };
  const rmPhase = (i) => { if (project.phases.length <= 1) return; updateProject({ phases: project.phases.filter((_, j) => j !== i) }); };

  // Auto-calculate footprint per phase from assets
  const phaseFootprints = {};
  phaseNames.forEach(pn => { phaseFootprints[pn] = assets.filter(a => a.phase === pn).reduce((s, a) => s + (a.footprint || 0), 0); });

  // Filtered asset indices (display only - editIdx still references original array)
  const filteredIndices = assets.map((_, i) => i).filter(i => {
    const a = assets[i];
    if (filterPhase !== "all" && a.phase !== filterPhase) return false;
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterRev !== "all" && a.revType !== filterRev) return false;
    return true;
  });
  const isFiltered = filterPhase !== "all" || filterCat !== "all" || filterRev !== "all";

  const up = updateProject;
  const cur = project.currency || "SAR";

  return (
    <div>
      {/* ═══ LAND SECTION — REDESIGNED ═══ */}
      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        {/* Header — clickable to collapse */}
        <div onClick={()=>setLandOpen(!landOpen)} style={{padding:"10px 14px",background:"#f8f9fb",borderBottom:landOpen?"1px solid #e5e7ec":"none",display:"flex",alignItems:"center",gap:6,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"} onMouseLeave={e=>e.currentTarget.style.background="#f8f9fb"}>
          <span style={{fontSize:10,color:"#9ca3af",transition:"transform 0.2s",transform:landOpen?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
          <span style={{fontSize:14}}>🏗</span>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:700,color:"#1a1d23"}}>{ar?"الأرض":"Land"}</span>
          </div>
          {project.landArea > 0 && <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:9,color:"#059669",background:"#ecfdf5",padding:"2px 8px",borderRadius:10,fontWeight:600}}>
              {LAND_TYPES.find(lt=>lt.value===project.landType)?.[ar?"ar":"en"]||project.landType}
            </span>
            <span style={{fontSize:9,color:"#6b7080",background:"#f3f4f6",padding:"2px 8px",borderRadius:10,fontWeight:500}}>
              {fmt(project.landArea)} {ar?"م²":"m²"}
            </span>
          </div>}
        </div>

        {landOpen && <>

        {/* Row 1: Tenure + Area */}
        <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
              {ar?"نوع الحيازة":"Tenure Type"}
              <HelpLink contentKey="landType" lang={lang} onOpen={setLandEduModal} />
            </div>
            <select value={project.landType} onChange={e=>up({landType:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"#fff",fontSize:12,fontFamily:"inherit",color:"#1a1d23",cursor:"pointer"}}>
              {LAND_TYPES.map(lt => <option key={lt.value} value={lt.value}>{ar?lt.ar:lt.en}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:10,color:project.landArea<0?"#ef4444":"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"إجمالي المساحة":"Total Area"} <span style={{fontWeight:400,color:"#9ca3af"}}>({ar?"م²":"sqm"})</span></div>
            <div style={project.landArea<0?{borderRadius:6,boxShadow:"0 0 0 1.5px #ef4444"}:undefined}><SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landArea} onChange={v=>up({landArea:v})} /></div>
            {project.landArea<0&&<div style={{fontSize:9,color:"#ef4444",marginTop:2}}>{ar?"لا يمكن أن تكون سالبة":"Cannot be negative"}</div>}
          </div>
        </div>

        {/* Purchase-specific */}
        {project.landType==="purchase"&&<div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:"1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"سعر الشراء":"Purchase Price"} <span style={{fontWeight:400,color:"#9ca3af"}}>({cur})</span></div>
            <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landPurchasePrice} onChange={v=>up({landPurchasePrice:v})} />
            {project.landPurchasePrice > 0 && project.landArea > 0 && <div style={{fontSize:10,color:"#2EC4B6",marginTop:4}}>= {fmt(Math.round(project.landPurchasePrice / project.landArea))} {cur}/{ar?"م²":"sqm"}</div>}
          </div>
        </div>}

        {/* Partner-specific */}
        {project.landType==="partner"&&<div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"تقييم الأرض":"Land Valuation"} <span style={{fontWeight:400,color:"#9ca3af"}}>({cur})</span></div>
            <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landValuation} onChange={v=>up({landValuation:v})} />
          </div>
          <div>
            <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"نسبة حصة الشريك":"Partner Equity"} <span style={{fontWeight:400,color:"#9ca3af"}}>(%)</span></div>
            <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.partnerEquityPct} onChange={v=>up({partnerEquityPct:v})} />
          </div>
        </div>}

        {/* BOT-specific */}
        {project.landType==="bot"&&<div style={{padding:"0 14px 10px"}}>
          <div>
            <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"فترة التشغيل":"Operation Period"} <span style={{fontWeight:400,color:"#9ca3af"}}>({ar?"سنوات":"years"})</span></div>
            <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.botOperationYears} onChange={v=>up({botOperationYears:v})} />
          </div>
        </div>}

        {/* ── Lease Details ── */}
        {project.landType==="lease"&&<>
          {/* Sub-header: عقد الإيجار */}
          <div style={{padding:"8px 14px 4px",borderTop:"1px solid #f0f1f5"}}>
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:0.5,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:4,height:4,borderRadius:2,background:"#2EC4B6"}} />
              {ar?"تفاصيل عقد الإيجار":"Lease Contract Details"}
            </div>
          </div>

          {/* Lease Row 1: Annual Rent (full width emphasis) */}
          <div style={{padding:"6px 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"الإيجار السنوي":"Annual Rent"} <span style={{fontWeight:400,color:"#9ca3af"}}>({cur})</span></div>
              <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landRentAnnual} onChange={v=>up({landRentAnnual:v})} />
              {project.landRentAnnual > 0 && project.landArea > 0 && <div style={{fontSize:10,color:"#2EC4B6",marginTop:4}}>= {fmt(Math.round(project.landRentAnnual / project.landArea * 100)/100)} {cur}/{ar?"م²":"sqm"}/{ar?"سنة":"yr"}</div>}
            </div>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"مدة العقد":"Term"} <span style={{fontWeight:400,color:"#9ca3af"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landRentTerm} onChange={v=>up({landRentTerm:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"فترة السماح":"Grace"} <span style={{fontWeight:400,color:"#9ca3af"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landRentGrace} onChange={v=>up({landRentGrace:v})} />
            </div>
          </div>

          {/* Lease Row 2: Escalation */}
          <div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"نسبة الزيادة":"Escalation"} <span style={{fontWeight:400,color:"#9ca3af"}}>(%)</span></div>
              <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landRentEscalation} onChange={v=>up({landRentEscalation:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"كل":"Every"} <span style={{fontWeight:400,color:"#9ca3af"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landRentEscalationEveryN} onChange={v=>up({landRentEscalationEveryN:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"بداية العقد":"Lease Start"} <span style={{fontWeight:400,color:"#9ca3af"}}>({ar?"سنة":"year"})</span></div>
              <SidebarInput style={{background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec"}} type="number" value={project.landLeaseStartYear||0} onChange={v=>up({landLeaseStartYear:v})} placeholder={String(project.startYear||2026)} />
            </div>
            <div>
              <div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"قاعدة بداية الإيجار":"Rent Start Rule"}</div>
              <select value={project.landRentStartRule||"auto"} onChange={e=>up({landRentStartRule:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"#fff",fontSize:12,fontFamily:"inherit",color:"#1a1d23",cursor:"pointer"}}>
                <option value="auto">{ar?"تلقائي (افتراضي)":"Auto (default)"}</option>
                <option value="grace">{ar?"بعد انتهاء السماح":"After Grace Period"}</option>
                <option value="income">{ar?"بعد أول إيراد":"After First Income"}</option>
              </select>
            </div>
          </div>

          {/* Rent allocation details */}
          {results?.landRentMeta?.rentStartYear != null && <div style={{padding:"0 14px 10px"}}>
            <button onClick={()=>setShowLandRentDetail(!showLandRentDetail)} style={{fontSize:11,color:"#2EC4B6",background:"#f0fdfa",border:"1px solid #ccfbf1",borderRadius:8,padding:"4px 8px",cursor:"pointer",width:"100%",textAlign:"start",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#e6fffa"} onMouseLeave={e=>e.currentTarget.style.background="#f0fdfa"}>
              <span style={{fontSize:10}}>{showLandRentDetail?"▼":"▶"}</span>
              {ar?"تفاصيل توزيع الإيجار بين المراحل":"Land Rent Allocation Details"}
              {results.landRentMeta.rentStartYear != null && <span style={{marginInlineStart:"auto",fontSize:10,color:"#059669",fontWeight:500}}>{ar?"يبدأ":"Starts"} {results.landRentMeta.rentStartYear + (results?.startYear||2026)}</span>}
            </button>
            {showLandRentDetail && (() => {
              const m = results.landRentMeta;
              const sy = results?.startYear||2026;
              const phases = m.phaseShares ? Object.entries(m.phaseShares) : [];
              const isManual = !!project.landRentManualAlloc && Object.keys(project.landRentManualAlloc).length > 0;
              const manualSum = isManual ? Object.values(project.landRentManualAlloc).reduce((s,v)=>s+(Number(v)||0),0) : 0;
              return <div style={{background:"#f8fffe",border:"1px solid #d1fae5",borderRadius:8,padding:10,marginTop:4,fontSize:10}}>
                <div style={{display:"flex",gap:12,marginBottom:6,color:"#374151"}}>
                  <span>{ar?"بداية العقد:":"Lease starts:"} <strong>{m.leaseStartAbsolute||sy}</strong></span>
                  <span>{ar?"السماح:":"Grace:"} <strong>{project.landRentGrace||0} {ar?"سنة":"yr"}</strong></span>
                  <span>{ar?"أول إيجار:":"First rent:"} <strong>{m.rentStartYear + sy}</strong></span>
                </div>
                {phases.length > 0 && <>
                  <div style={{fontWeight:700,marginTop:6,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11}}>
                    <span>{ar?"التوزيع بين المراحل:":"Phase allocation:"}</span>
                    <button onClick={()=>{
                      if (isManual) { up({landRentManualAlloc:null}); }
                      else { const init={}; phases.forEach(([pn,ps])=>{init[pn]=Math.round((ps.share||0)*100);}); up({landRentManualAlloc:init}); }
                    }} style={{fontSize:10,padding:"3px 10px",borderRadius:6,border:"1px solid "+(isManual?"#f59e0b":"#d1d5db"),background:isManual?"#fffbeb":"#fff",color:isManual?"#b45309":"#6b7080",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                      {isManual ? (ar?"⚙ يدوي":"⚙ Manual") : (ar?"تلقائي":"Auto")}
                    </button>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{borderBottom:"2px solid #d1fae5"}}>
                      <th style={{textAlign:"start",padding:"2px 4px",color:"#6b7080",fontWeight:600}}>{ar?"المرحلة":"Phase"}</th>
                      <th style={{textAlign:"right",padding:"2px 4px",color:"#6b7080",fontWeight:600}}>{ar?"المساحة":"Area"}</th>
                      <th style={{textAlign:"right",padding:"2px 4px",color:"#6b7080",fontWeight:600}}>{ar?"الحصة":"Share"}</th>
                    </tr></thead>
                    <tbody>
                      {phases.map(([pn,ps])=><tr key={pn} style={{borderBottom:"1px solid #ecfdf5"}}>
                        <td style={{padding:"2px 4px",fontWeight:500}}>{pn}</td>
                        <td style={{padding:"2px 4px",textAlign:"right"}}>{(ps.footprint||0).toLocaleString()}</td>
                        <td style={{padding:"2px 4px",textAlign:"right",fontWeight:600}}>
                          {isManual ? <input type="number" value={project.landRentManualAlloc?.[pn]??""} onChange={e=>{const cur={...(project.landRentManualAlloc||{})};cur[pn]=Number(e.target.value)||0;up({landRentManualAlloc:cur});}} style={{width:48,textAlign:"right",padding:"2px 4px",border:"1px solid #d1d5db",borderRadius:4,fontSize:11,fontWeight:600,fontFamily:"inherit"}} /> : <span>{((ps.share)*100).toFixed(0)}%</span>}
                        </td>
                      </tr>)}
                      {isManual && <tr style={{borderTop:"2px solid #d1fae5",fontWeight:700}}>
                        <td colSpan={2} style={{padding:"2px 4px",textAlign:"right",fontSize:10}}>{ar?"المجموع":"Total"}</td>
                        <td style={{padding:"2px 4px",textAlign:"right",color:Math.abs(manualSum-100)>0.1?"#ef4444":"#059669"}}>{manualSum}%</td>
                      </tr>}
                    </tbody>
                  </table>
                  {isManual && Math.abs(manualSum-100)>0.1 && <div style={{marginTop:6,padding:"4px 8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,fontSize:10,color:"#dc2626",fontWeight:500}}>
                    ⚠ {ar?"المجموع = "+manualSum+"% (يجب 100%)":"Total = "+manualSum+"% (should be 100%)"}
                  </div>}
                </>}
              </div>;
            })()}
          </div>}
        </>}
        </>}
      </div>
      {landEduModal && <EducationalModal contentKey={landEduModal} lang={lang} onClose={()=>setLandEduModal(null)} />}

      {/* ═══ PHASES BAR ═══ */}
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"8px 12px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المراحل":"Phases"}</span>
          <div style={{flex:1}} />
          <button onClick={addPhase} style={{...btnS,background:"#f0f4ff",color:"#2563eb",padding:"3px 10px",fontSize:9,fontWeight:600,border:"1px solid #bfdbfe"}}>+ {ar?"مرحلة":"Phase"}</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {project.phases.map((ph, i) => {
            const assetCount = assets.filter(a => a.phase === ph.name).length;
            return (
              <div key={i} style={{background:"#f8f9fb",borderRadius:6,border:"1px solid #e5e7ec",padding:"4px 10px",display:"flex",alignItems:"center",gap:6}}>
                {editingPhase === i ? (
                  <input value={ph.name} onChange={e => renamePhase(i, e.target.value)} onBlur={() => setEditingPhase(null)} onKeyDown={e => { if (e.key === "Enter") setEditingPhase(null); }} autoFocus style={{fontSize:11,fontWeight:600,border:"1px solid #2563eb",borderRadius:3,padding:"1px 5px",width:80,fontFamily:"inherit",outline:"none"}} />
                ) : (
                  <span onClick={() => setEditingPhase(i)} style={{fontSize:11,fontWeight:600,color:"#1a1d23",cursor:"pointer"}} title={ar?"اضغط لإعادة التسمية":"Click to rename"}>{ph.name}</span>
                )}
                <span style={{fontSize:9,color:"#9ca3af",background:"#e5e7ec",borderRadius:8,padding:"1px 5px"}}>{assetCount}</span>
                <span style={{fontSize:9,color:"#6b7080",marginInlineStart:2}} title={ar?"سنة افتتاح المرحلة":"Phase opening year"}>{ar?"افتتاح:":"Opens:"}</span>
                <input type="number" value={ph.completionYear||(project.startYear||2026)+Math.ceil((ph.completionMonth||36)/12)} onChange={e=>{const ph2=[...project.phases];ph2[i]={...ph2[i],completionYear:parseInt(e.target.value)||2030};updateProject({phases:ph2});}} style={{width:48,fontSize:10,fontWeight:600,border:"1px solid #e5e7ec",borderRadius:3,padding:"1px 4px",textAlign:"center",fontFamily:"inherit",background:"#fff"}} min={project.startYear||2026} />
                {project.phases.length > 1 && (
                  <button onClick={()=>rmPhase(i)} style={{background:"none",border:"none",color:"#d0d4dc",padding:0,fontSize:11,cursor:"pointer",lineHeight:1,fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#d0d4dc"} title={ar?"حذف":"Delete"}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {assets.length > 0 && (
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:600,color:"#6b7080"}}>{ar?"فلترة:":"Filter:"}</span>
          <select value={filterPhase} onChange={e=>setFilterPhase(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit",color:"#1a1d23"}}>
            <option value="all">{ar?"كل المراحل":"All Phases"}</option>
            {phaseNames.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit",color:"#1a1d23"}}>
            <option value="all">{ar?"كل التصنيفات":"All Categories"}</option>
            {[...new Set(assets.map(a=>a.category))].filter(Boolean).map(c=><option key={c} value={c}>{catL(c,ar)}</option>)}
          </select>
          <select value={filterRev} onChange={e=>setFilterRev(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit",color:"#1a1d23"}}>
            <option value="all">{ar?"كل أنواع الإيراد":"All Rev Types"}</option>
            {[...new Set(assets.map(a=>a.revType))].filter(Boolean).map(r2=><option key={r2} value={r2}>{revL(r2,ar)}</option>)}
          </select>
          {(filterPhase!=="all"||filterCat!=="all"||filterRev!=="all") && (
            <button onClick={()=>{setFilterPhase("all");setFilterCat("all");setFilterRev("all");}} style={{...btnS,padding:"4px 10px",fontSize:10,background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca"}}>{ar?"مسح الفلتر":"Clear"}</button>
          )}
        </div>
      )}

      {/* ── Asset Header ── */}
      <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:15,fontWeight:600}}>{t.assetProgram}</div>
        <div style={{fontSize:12,color:"#6b7080"}}>{isFiltered?`${filteredIndices.length}/${assets.length}`:assets.length} {t.assets}</div>
        <div style={{flex:1}} />
        <div style={{display:"flex",background:"#f0f1f5",borderRadius:6,padding:2}}>
          <button onClick={()=>setViewMode("cards")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="cards"?"#fff":"transparent",color:viewMode==="cards"?"#1a1d23":"#9ca3af",boxShadow:viewMode==="cards"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>▦ {lang==="ar"?"بطاقات":"Cards"}</button>
          <button onClick={()=>setViewMode("table")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="table"?"#fff":"transparent",color:viewMode==="table"?"#1a1d23":"#9ca3af",boxShadow:viewMode==="table"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>☰ {lang==="ar"?"جدول":"Table"}</button>
        </div>
        {viewMode==="table" && <div style={{position:"relative"}}>
          <button onClick={()=>setShowColPicker(!showColPicker)} style={{...btnS,background:showColPicker?"#e0e7ff":"#f0f1f5",color:"#6b7080",padding:"5px 10px",fontSize:10,fontWeight:500,border:"1px solid #e5e7ec"}} title={ar?"إظهار/إخفاء أعمدة":"Show/Hide Columns"}>⚙ {ar?"أعمدة":"Cols"} ({cols.length - hiddenCols.size}/{cols.length})</button>
          {showColPicker && <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#fff",border:"1px solid #e5e7ec",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,padding:"8px 0",width:180,maxHeight:320,overflowY:"auto"}}>
            {cols.filter(c=>!["#","ops"].includes(c.key)).map(c=>(
              <label key={c.key} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",fontSize:11,cursor:"pointer",color:hiddenCols.has(c.key)?"#9ca3af":"#1a1d23"}} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={!hiddenCols.has(c.key)} onChange={()=>toggleCol(c.key)} style={{accentColor:"#2563eb"}} />
                {ar?c.ar:c.en}
              </label>
            ))}
            <div style={{borderTop:"1px solid #e5e7ec",margin:"4px 0"}} />
            <button onClick={()=>setHiddenCols(new Set())} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"#2563eb",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"إظهار الكل":"Show All"}</button>
            <button onClick={()=>setHiddenCols(new Set(["plotArea","footprint","esc","ramp","occ"]))} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"#6b7080",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"الافتراضي":"Default"}</button>
          </div>}
        </div>}
        <button onClick={()=>{generateTemplate();addToast(ar?"تم تحميل النموذج":"Template downloaded","success");}} style={{...btnS,background:"#f0fdf4",color:"#16a34a",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bbf7d0"}} title={lang==='ar'?"تحميل نموذج Excel":"Download Excel Template"}>
          {lang==='ar'?'⬇ تحميل نموذج':'⬇ Template'}
        </button>
        <button onClick={()=>{exportAssetsToExcel(project, results);addToast(ar?"تم تصدير الأصول":"Assets exported","success");}} style={{...btnS,background:"#eff6ff",color:"#2563eb",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bfdbfe"}} title={lang==='ar'?"تصدير الأصول إلى Excel":"Export Assets to Excel"}>
          {lang==='ar'?'⬇ تصدير':'⬇ Export'}
        </button>
        <input type="file" accept=".csv,.tsv" ref={fileRef} onChange={handleUpload} style={{display:"none"}} />
        <button onClick={()=>fileRef.current?.click()} style={{...btnS,background:"#fef3c7",color:"#92400e",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #fde68a"}} title={lang==='ar'?"رفع ملف Excel":"Upload Excel File"}>
          {lang==='ar'?'⬆ رفع ملف':'⬆ Upload'}
        </button>
        <button onClick={handleAddAsset} style={{...btnPrim,padding:"7px 16px",fontSize:12}}>{t.addAsset}</button>
      </div>

      {/* Import message */}
      {importMsg && (
        <div style={{
          marginBottom:12, padding:"10px 14px", borderRadius:6, fontSize:12,
          background: importMsg.type==='success'?'#f0fdf4':importMsg.type==='error'?'#fef2f2':'#fffbeb',
          color: importMsg.type==='success'?'#16a34a':importMsg.type==='error'?'#ef4444':'#92400e',
          border: `1px solid ${importMsg.type==='success'?'#bbf7d0':importMsg.type==='error'?'#fecaca':'#fde68a'}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span>{importMsg.text}</span>
          <button onClick={()=>setImportMsg(null)} style={{...btnSm,background:"transparent",color:"inherit",fontSize:14,padding:"0 4px"}}>✕</button>
        </div>
      )}
      {/* CARD VIEW */}
      {viewMode === "cards" && (<div>
        {assets.length===0 ? (<>
          {/* Asset Prep Guide */}
          <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 18px",background:"rgba(46,196,182,0.04)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:10,marginBottom:14}}>
            <span style={{fontSize:20,flexShrink:0}}>📋</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1a1d23",marginBottom:6}}>{lang==="ar"?"ما تحتاجه لإضافة أصل:":"What you need to add an asset:"}</div>
              <div style={{fontSize:11,color:"#6b7080",lineHeight:1.8}}>{lang==="ar"?<>
                • مساحة الأرض ومساحة البناء (م²)<br/>• عدد الأدوار والمساحة الإجمالية GFA<br/>• تكلفة البناء لكل م²<br/>• مدة البناء (بالأشهر)<br/>• الإيجار لكل م² أو ADR للفنادق<br/>• نسبة الإشغال المتوقعة
              </>:<>
                • Land area and building footprint (sqm)<br/>• Number of floors and total GFA<br/>• Construction cost per sqm<br/>• Build duration (months)<br/>• Rent per sqm or ADR for hotels<br/>• Expected occupancy rate
              </>}</div>
              <div style={{fontSize:10,color:"#2EC4B6",marginTop:6,fontWeight:600}}>{lang==="ar"?"💡 اختر قالب جاهز عند الإضافة وسنعبئ معظم القيم تلقائياً":"💡 Pick a template when adding and most values will be pre-filled"}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,background:"rgba(46,196,182,0.03)",borderRadius:12,border:"1px dashed rgba(46,196,182,0.2)",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>🏗</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1a1d23",marginBottom:6}}>{lang==="ar"?"لا توجد أصول بعد":"No Assets Yet"}</div>
            <div style={{fontSize:12,color:"#6b7080",marginBottom:20,maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"أضف أصول مشروعك لتبدأ تشوف التدفقات والتحليلات. استخدم الزر أدناه أو استورد من ملف.":"Add your project assets to start seeing cash flows and analytics. Use the button below or import from file."}</div>
            <button onClick={handleAddAsset} style={{background:"linear-gradient(135deg,#0f766e,#2EC4B6)",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              ➕ {lang==="ar"?"أضف أول أصل":"Add First Asset"}
            </button>
          </div>
        </>) : (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))",gap:isMobile?8:12}}>
            {filteredIndices.map(i=>{const a=assets[i];const comp=results?.assetSchedules?.[i];const capex=comp?.totalCapex||computeAssetCapex(a,project);const income=comp?.totalRevenue||0;const catC={Hospitality:"#8b5cf6",Retail:"#3b82f6",Office:"#06b6d4",Residential:"#22c55e",Marina:"#0ea5e9",Industrial:"#f59e0b",Cultural:"#ec4899"};const catI={Hospitality:"🏨",Retail:"🛍",Office:"🏢",Residential:"🏠",Marina:"⚓",Industrial:"🏭",Cultural:"🎭","Open Space":"🌳",Utilities:"⚡",Flexible:"🔧"};const cc=catC[a.category]||"#6b7080";
            return <div key={a.id||i} className="asset-card" onClick={()=>setEditIdx(i)} style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7ec",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",animationDelay:i*0.05+"s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
              <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{catI[a.category]||"📦"}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:10,color:"#9ca3af"}}>{a.code?a.code+" · ":""}{a.phase}</div></div>
                <button onClick={(e)=>{e.stopPropagation();setSelectedAssetIndex(i);}} title={ar?"تفاصيل":"Details"} style={{background:"none",border:"none",cursor:"pointer",color:"#2EC4B6",fontSize:14,padding:"2px 4px",lineHeight:1,borderRadius:4,flexShrink:0}}>↗</button>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:10,background:cc+"15",color:cc,fontWeight:600}}>{catL(a.category,ar)}</span>
              </div>
              <div style={{padding:"10px 16px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                <div><span style={{color:"#9ca3af"}}>{ar?"GFA":"GFA"}</span><div style={{fontWeight:600}}>{fmt(a.gfa)} m²</div></div>
                <div><span style={{color:"#9ca3af"}}>{a.revType==="Lease"?(ar?"الإيجار":"Rate"):a.revType==="Sale"?(ar?"سعر البيع":"Sale Price"):(ar?"أرباح تشغيلية":"EBITDA")}</span><div style={{fontWeight:600}}>{a.revType==="Lease"?fmt(a.leaseRate)+" /m²":a.revType==="Sale"?fmt(a.salePricePerSqm||0)+" /m²":fmtM(a.opEbitda)}</div></div>
                <div><span style={{color:"#9ca3af"}}>{ar?"CAPEX":"CAPEX"}</span><div style={{fontWeight:700,color:"#ef4444"}}>{fmtM(capex)}</div></div>
                <div><span style={{color:"#9ca3af"}}>{ar?"الإيرادات":"Revenue"}</span><div style={{fontWeight:700,color:"#16a34a"}}>{fmtM(income)}</div></div>
              </div>
            </div>;})}
          </div>
        )}
        {/* ═══ TEMPLATE PICKER MODAL ═══ */}
        {showTemplatePicker && (<>
          <div onClick={()=>setShowTemplatePicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9990}} />
          <div style={{position:"fixed",zIndex:9991,top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:520,maxWidth:"94vw",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",overflow:"hidden",animation:"zanModalIn 0.2s ease-out"}}>
            <div style={{padding:"20px 24px 12px",borderBottom:"1px solid #f0f1f5"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#1a1d23"}}>{ar?"اختر نوع الأصل":"Choose Asset Type"}</div>
              <div style={{fontSize:12,color:"#6b7080",marginTop:4}}>{ar?"اختر قالب جاهز بقيم السوق السعودي، أو ابدأ فارغ":"Pick a template with Saudi market defaults, or start empty"}</div>
            </div>
            <div style={{padding:"16px 24px 24px",display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
              {ASSET_TEMPLATES.map(tmpl=>(
                <button key={tmpl.id} onClick={()=>handleTemplateSelect(tmpl.defaults)} style={{padding:"16px 12px",background:"#fafbfc",border:"2px solid #e5e7ec",borderRadius:12,cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.background="#f0fdfa";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.background="#fafbfc";}}>
                  <div style={{fontSize:28,marginBottom:6}}>{tmpl.icon}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#1a1d23"}}>{tmpl.label}</div>
                </button>
              ))}
            </div>
          </div>
        </>)}
        {editIdx!==null&&editIdx<assets.length&&(()=>{const a=assets[editIdx],i=editIdx,comp=results?.assetSchedules?.[i],isOp=a.revType==="Operating",isSale=a.revType==="Sale",isH=isOp&&a.category==="Hospitality",isM=isOp&&a.category==="Marina";
        const F2=({label,children,error})=><div style={{marginBottom:8}}><div style={{fontSize:10,color:error?"#ef4444":"#6b7080",marginBottom:3,fontWeight:500}}>{label}</div><div style={error?{borderRadius:6,boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>{error&&<div style={{fontSize:9,color:"#ef4444",marginTop:2}}>{error}</div>}</div>;
        const g3=isMobile?"1fr 1fr":"1fr 1fr 1fr";
        const g2=isMobile?"1fr":"1fr 1fr";
        return <><div onClick={()=>setEditIdx(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:9990}} />
        <div style={{position:"fixed",zIndex:9991,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",...(isMobile?{inset:0,borderRadius:0}:{top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:560,maxWidth:"94vw",maxHeight:"88vh",borderRadius:16,animation:"zanModalIn 0.2s ease-out"})}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7ec",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:11,color:"#9ca3af"}}>{catL(a.category,ar)} · {a.phase}</div></div>
            <button onClick={()=>{dupAsset(i);setEditIdx(null);setTimeout(()=>setEditIdx(assets.length),80);}} style={{...btnS,background:"#eff6ff",color:"#2563eb",padding:"6px 12px",fontSize:11}} title={ar?"تكرار":"Duplicate"}>{ar?"📋 تكرار":"📋 Duplicate"}</button>
            <button onClick={()=>{rmAsset(i);setEditIdx(null);}} style={{...btnS,background:"#fef2f2",color:"#ef4444",padding:"6px 12px",fontSize:11}}>{ar?"حذف":"Delete"}</button>
            <button onClick={()=>setEditIdx(null)} style={{...btnS,background:"#f0f1f5",padding:"6px 10px",fontSize:16,lineHeight:1}}>✕</button>
          </div>
          <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
            {/* ── Group 1: Basic Info ── */}
            <FieldGroup icon="📝" title={ar?"أساسي":"Basic Info"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <F2 label={ar?"المرحلة":"Phase"}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></F2>
              <F2 label={ar?"التصنيف":"Category"}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></F2>
              <F2 label={ar?"نوع الإيراد":"Rev Type"}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></F2>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F2 label={ar?"الاسم":"Name"}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"اسم الأصل":"Name"} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"الرمز":"Code"}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 2: Areas & Dimensions ── */}
            <FieldGroup icon="📐" title={ar?"المساحات":"Areas & Dimensions"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <F2 label={ar?"مساحة القطعة Plot Area":"Plot Area"} error={a.plotArea<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"المسطح البنائي Footprint":"Footprint"} error={a.footprint<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"المساحة الطابقية GFA (م²)":"GFA (m²)"} error={a.gfa<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 3: Revenue ── */}
            <FieldGroup icon="💰" title={ar?"الإيرادات":"Revenue"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <F2 label={ar?"نسبة الكفاءة Eff %":"Efficiency %"}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"معدل الإيجار Lease Rate /م²":"Lease Rate"}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"EBITDA التشغيلية":"Op EBITDA"}><EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              {isSale && <>
                <F2 label={ar?"سعر البيع/م²":"Sale Price/sqm"}><EditableCell type="number" value={a.salePricePerSqm||0} onChange={v=>upAsset(i,{salePricePerSqm:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
                <F2 label={ar?"سنوات الاستيعاب":"Absorption Yrs"}><EditableCell type="number" value={a.absorptionYears||3} onChange={v=>upAsset(i,{absorptionYears:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
                <F2 label={ar?"ما قبل البيع %":"Pre-Sale %"}><EditableCell type="number" value={a.preSalePct||0} onChange={v=>upAsset(i,{preSalePct:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
                <F2 label={ar?"عمولة البيع %":"Commission %"}><EditableCell type="number" value={a.commissionPct||0} onChange={v=>upAsset(i,{commissionPct:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              </>}
              <F2 label={ar?"نسبة الزيادة Esc %":"Escalation %"}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"سنوات النمو Ramp":"Ramp Years"}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"نسبة الإشغال Occ %":"Occupancy %"} error={a.stabilizedOcc>100?(ar?"الحد الأقصى 100%":"Max 100%"):a.stabilizedOcc<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 4: Construction & Cost ── */}
            <FieldGroup icon="🏗️" title={ar?"البناء والتكاليف":"Construction & Cost"}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F2 label={ar?"تكلفة/م² Cost/sqm":"Cost/m²"} error={a.costPerSqm<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"مدة البناء (شهر)":"Build duration (months)"} error={a.constrDuration<1?(ar?"يجب شهر واحد على الأقل":"Must be at least 1 month"):a.constrDuration>120?(ar?"الحد الأقصى 120 شهر":"Max 120 months"):null}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
            {(isH||isM)&&<button onClick={()=>setModal({type:isH?"hotel":"marina",idx:i})} style={{...btnPrim,padding:"8px 16px",fontSize:12,marginTop:8}}>{isH?(ar?"⚙ حساب أرباح الفندق":"⚙ Hotel P&L"):(ar?"⚙ حساب أرباح المارينا":"⚙ Marina P&L")}</button>}
            </FieldGroup>
            <div style={{background:"#f8f9fb",borderRadius:8,padding:12,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:8,fontSize:12}}>
              <div><span style={{color:"#6b7080"}}>{ar?"التكاليف:":"CAPEX:"}</span> <strong style={{color:"#ef4444"}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</strong></div>
              <div><span style={{color:"#6b7080"}}>{ar?"الإيرادات:":"Income:"}</span> <strong style={{color:"#16a34a"}}>{fmt(comp?.totalRevenue||0)}</strong></div>
              {(()=>{
                const sc = getAssetScore(a, comp);
                const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",t:ar?"مقبول":"Marginal"}, weak:{bg:"#fef2f2",color:"#991b1b",t:ar?"ضعيف":"Weak"}, none:{bg:"#f0f1f5",color:"#9ca3af",t:"—"} }[sc.viable];
                const wPct = (sc.capexWeight * 100).toFixed(0);
                const impLabel = sc.impact==="high"?(ar?"أثر كبير":"High impact"):sc.impact==="med"?(ar?"أثر متوسط":"Med impact"):(ar?"أثر محدود":"Low impact");
                return <div><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:vCfg.bg,color:vCfg.color,fontWeight:600}}>{vCfg.t}</span> <span style={{fontSize:9,color:"#6b7080"}}>{impLabel} ({wPct}%)</span></div>;
              })()}
            </div>
          </div>
        </div></>;})()}
      </div>)}
      {/* TABLE VIEW */}
      {viewMode === "table" && (<>
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead>
              <tr>
                {visibleCols.map(c=>(
                  <th key={c.key} style={{...thSt,whiteSpace:"nowrap",minWidth:c.w, ...(c.key==="totalCapex"?{background:"#eef2ff"}:c.key==="totalInc"?{background:"#ecfdf5"}:c.key==="score"?{background:"#fefce8"}:{})}}>
                    <div>{c.en}</div>
                    {c.ar!==c.en&&<div style={{fontWeight:400,fontSize:9,color:"#9ca3af"}}>{c.ar}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length===0?(
                <tr><td colSpan={visibleCols.length} style={{...tdSt,textAlign:"center",color:"#6b7080",padding:"40px 20px"}}>
                  <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>🏗</div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{lang==="ar"?"لا توجد أصول":"No assets yet"}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{lang==="ar"?"اضغط '+ إضافة أصل' للبدء":"Click '+ Add Asset' to start"}</div>
                </td></tr>
              ):(
                filteredIndices.map(i=>{
                  const a = assets[i];
                  const comp = results?.assetSchedules?.[i];
                  const isOp = a.revType === "Operating";
                  const isHotel = isOp && (a.category === "Hospitality");
                  const isMarina = isOp && (a.category === "Marina");
                  const bg = i%2===0?"#fff":"#fafbfc";
                  const hd = (key) => hiddenCols.has(key) ? {display:"none"} : {};
                  return (
                    <tr key={a.id||i} style={{background:bg}}>
                      <td style={{...tdSt,color:"#9ca3af",fontWeight:500,width:30,...hd("#")}}>{i+1}</td>
                      <td style={{...tdSt,...hd("phase")}}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></td>
                      <td style={{...tdSt,...hd("category")}}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></td>
                      <td style={{...tdSt,...hd("name")}}><div style={{display:"flex",alignItems:"center",gap:3}}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"الاسم":"Name"} /><button onClick={(e)=>{e.stopPropagation();setSelectedAssetIndex(i);}} title={ar?"تفاصيل":"Details"} style={{background:"none",border:"none",cursor:"pointer",color:"#2EC4B6",fontSize:12,padding:"1px 3px",lineHeight:1,borderRadius:3,flexShrink:0}}>↗</button></div></td>
                      <td style={{...tdSt,...hd("code")}}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{width:45}} /></td>
                      <td style={{...tdSt,...hd("plotArea")}}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} /></td>
                      <td style={{...tdSt,...hd("footprint")}}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} /></td>
                      <td style={{...tdSt,...hd("gfa")}}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} /></td>
                      <td style={{...tdSt,...hd("revType")}}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></td>
                      <td style={{...tdSt,...hd("eff")}}>{(()=>{const bc=benchmarkColor("efficiency",a.efficiency,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip}%`:undefined}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,color:"#6b7080",textAlign:"right",fontSize:11,...hd("leasable")}}>{fmt(comp?.leasableArea||(a.gfa||0)*(a.efficiency||0)/100)}</td>
                      <td style={{...tdSt,background:isOp?"#f5f5f5":undefined,...hd("rate")}}>{(()=>{const bc=benchmarkColor("leaseRate",a.leaseRate,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{opacity:isOp?0.3:1,...(bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:{})}} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("opEbitda")}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          {isOp ? (
                            <>
                              <span style={{fontSize:10,color:"#6b7080",minWidth:55,textAlign:"right"}}>{fmtM(a.opEbitda||0)}</span>
                              {(isHotel||isMarina) && <button onClick={()=>setModal({type:isHotel?"hotel":"marina",idx:i})} style={{...btnSm,background:"#eef2ff",color:"#2563eb",fontSize:9,padding:"2px 6px",whiteSpace:"nowrap"}}>{isHotel?"P&L":"P&L"}</button>}
                            </>
                          ) : (
                            <EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} />
                          )}
                        </div>
                      </td>
                      <td style={{...tdSt,...hd("esc")}}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} /></td>
                      <td style={{...tdSt,...hd("ramp")}}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} /></td>
                      <td style={{...tdSt,...hd("occ")}}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} /></td>
                      <td style={{...tdSt,...hd("cost")}}>{(()=>{const bc=benchmarkColor("costPerSqm",a.costPerSqm,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("dur")}}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} /></td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,background:"#f5f7ff",fontSize:11,...hd("totalCapex")}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,color:"#16a34a",background:"#f0fdf4",fontSize:11,...hd("totalInc")}}>{fmt(comp?.totalRevenue||0)}</td>
                      <td style={{...tdSt,background:"#fffdf5",overflow:"visible",position:"relative",...hd("score")}}>{(()=>{
                        const sc = getAssetScore(a, comp);
                        return <ScoreCell sc={sc} name={a.name} ar={ar} />;
                      })()}</td>
                      <td style={{...tdSt,...hd("ops")}}><div style={{display:"flex",gap:3}}><button onClick={(e)=>{e.stopPropagation();dupAsset(i);}} style={{...btnSm,background:"#eff6ff",color:"#2563eb",fontSize:10}} title={ar?"تكرار":"Dup"}>📋</button><button onClick={()=>rmAsset(i)} style={{...btnSm,background:"#fef2f2",color:"#ef4444",fontSize:10}}>✕</button></div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* ═══ ASSET CASH FLOW TABLE ═══ */}
      {results?.assetSchedules?.length > 0 && (() => {
        const h = results.horizon;
        const sy = results.startYear;
        const yrs = Array.from({length: Math.min(cfYrs, h)}, (_, i) => i);
        const phaseRes = results.phaseResults || {};
        // Compute per-asset land rent (proportional by footprint within phase)
        const getAssetLandRent = (idx) => {
          const a = results.assetSchedules[idx];
          const pName = a.phase || "Phase 1";
          const pr = phaseRes[pName];
          if (!pr || !pr.landRent) return new Array(h).fill(0);
          const pFP = pr.footprint || 1;
          const aFP = a.footprint || 0;
          const ratio = pFP > 0 ? aFP / pFP : 0;
          return pr.landRent.map(v => v * ratio);
        };
        // Aggregate for filtered assets
        const aggRev = new Array(h).fill(0), aggCap = new Array(h).fill(0), aggLR = new Array(h).fill(0);
        filteredIndices.forEach(i => {
          const a = results.assetSchedules[i];
          const lr = getAssetLandRent(i);
          if (a) for (let y = 0; y < h; y++) {
            aggRev[y] += a.revenueSchedule[y] || 0;
            aggCap[y] += a.capexSchedule[y] || 0;
            aggLR[y] += lr[y] || 0;
          }
        });
        // Add land purchase CAPEX allocation (project-level, not in assetSchedules)
        const _landPurchase = project.landType === "purchase" ? (project.landPurchasePrice || 0) : 0;
        if (_landPurchase > 0) {
          const _allScheds = results.assetSchedules || [];
          const _totalFP = _allScheds.reduce((s, a) => s + (a.footprint || 0), 0);
          const _filtFP = filteredIndices.reduce((s, i) => s + (_allScheds[i]?.footprint || 0), 0);
          const _alloc = _totalFP > 0 ? _filtFP / _totalFP : 1;
          aggCap[0] += _landPurchase * _alloc;
        }
        const toggleAllCF = () => {
          const next = !cfAllOpen;
          setCfAllOpen(next);
          const obj = {};
          filteredIndices.forEach(i => { obj[i] = next; });
          setCfOpen(obj);
        };
        const tdS = {padding:"3px 6px",fontSize:10,textAlign:"right",borderBottom:"1px solid #f0f1f3",whiteSpace:"nowrap"};
        const hdS = {padding:"3px 6px",fontSize:9,fontWeight:600,color:"#6b7080",textAlign:"right",borderBottom:"1px solid #e5e7ec",whiteSpace:"nowrap",position:"sticky",top:0,background:"#fafbfc",zIndex:1};
        const lblS = {padding:"3px 8px",fontSize:10,fontWeight:500,textAlign:"left",borderBottom:"1px solid #f0f1f3",whiteSpace:"nowrap",position:"sticky",left:0,background:"#fff",zIndex:1};
        const renderCFRows = (rev, cap, lr, label, color) => {
          const netInc = rev.map((v, y) => v - (lr[y]||0));
          const netCF = rev.map((v, y) => v - (lr[y]||0) - (cap[y]||0));
          let cum = 0;
          const cumCF = netCF.map(v => { cum += v; return cum; });
          const rows = [
            {l: ar?"إيرادات":"Revenue", d: rev, c:"#16a34a", show:true},
            {l: ar?"(-) إيجار أرض":"(-) Land Rent", d: lr, c:"#f59e0b", neg:true, show:true},
            {l: ar?"(-) تكاليف تطوير":"(-) CAPEX", d: cap, c:"#ef4444", neg:true, show:true},
            {l: ar?"= صافي التدفق":"= Net CF", d: netCF, c:"#1a1d23", bold:true, show:true},
            {l: ar?"صافي دخل":"Net Income", d: netInc, c:"#2563eb", show:cfDetail},
            {l: ar?"تراكمي":"Cumulative", d: cumCF, c:"#8b5cf6", show:cfDetail},
          ];
          return rows.filter(r => r.show).map((r, ri) => (
            <tr key={ri} style={r.bold?{background:"#f8f9fb"}:undefined}>
              <td style={{...lblS,color:r.c,fontWeight:r.bold?700:500,fontSize:r.bold?11:10}}>{r.l}</td>
              {yrs.map(y => {
                const v = r.d[y]||0;
                return <td key={y} style={{...tdS,color:v<0?"#ef4444":v>0?r.c:"#d0d4dc",fontWeight:r.bold?600:400}}>{v===0?"—":r.neg?fmt(-v):fmt(v)}</td>;
              })}
            </tr>
          ));
        };
        return (
          <div style={{marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:"#1a1d23"}}>{ar?"التدفق النقدي للأصول":"Asset Cash Flows"}</span>
              <button onClick={toggleAllCF} style={{fontSize:9,padding:"3px 10px",borderRadius:5,border:"1px solid #e5e7ec",background:cfAllOpen?"#eff6ff":"#f8f9fb",color:cfAllOpen?"#2563eb":"#6b7080",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {cfAllOpen?(ar?"طي الكل":"Collapse All"):(ar?"توسيع الكل":"Expand All")}
              </button>
              <button onClick={()=>setCfDetail(!cfDetail)} style={{fontSize:9,padding:"3px 10px",borderRadius:5,border:"1px solid #e5e7ec",background:cfDetail?"#fef9c3":"#f8f9fb",color:cfDetail?"#92400e":"#6b7080",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {cfDetail?(ar?"إخفاء التفاصيل":"Hide Details"):(ar?"عرض التفاصيل":"Show Details")}
              </button>
              <div style={{flex:1}}/>
              <select value={cfYrs} onChange={e=>setCfYrs(+e.target.value)} style={{fontSize:9,padding:"2px 6px",borderRadius:4,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit"}}>
                {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
              </select>
            </div>

            {filteredIndices.map(i => {
              const a = results.assetSchedules[i];
              if (!a) return null;
              const asset = assets[i];
              const lr = getAssetLandRent(i);
              const isOpen = cfOpen[i] || false;
              const totalRev = a.revenueSchedule.reduce((s,v)=>s+v,0);
              const totalCap = a.totalCapex||0;
              return (
                <div key={i} style={{marginBottom:6,border:"1px solid #e5e7ec",borderRadius:8,overflow:"hidden",background:"#fff"}}>
                  <div onClick={()=>setCfOpen(p=>({...p,[i]:!p[i]}))} style={{padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:isOpen?"#f0f4ff":"#fafbfc",userSelect:"none"}}>
                    <span style={{fontSize:10,color:"#9ca3af"}}>{isOpen?"▼":"▶"}</span>
                    <span style={{fontSize:11,fontWeight:600,color:"#1a1d23",flex:1}}>{asset?.name||`Asset ${i+1}`}</span>
                    <span style={{fontSize:9,color:"#6b7080",background:"#e5e7ec",borderRadius:8,padding:"1px 6px"}}>{asset?.phase}</span>
                    <span style={{fontSize:10,color:"#16a34a"}}>{fmtM(totalRev)}</span>
                    <span style={{fontSize:10,color:"#ef4444"}}>{fmtM(totalCap)}</span>
                  </div>
                  {isOpen && (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr>
                          <th style={{...hdS,textAlign:"left",minWidth:80}}>{ar?"البند":"Item"}</th>
                          {yrs.map(y=><th key={y} style={hdS}>{sy+y}</th>)}
                        </tr></thead>
                        <tbody>{renderCFRows(a.revenueSchedule, a.capexSchedule, lr, asset?.name, "#1a1d23")}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Aggregated Totals ── */}
            <div style={{marginTop:8,border:"2px solid #2563eb",borderRadius:8,overflow:"hidden",background:"#fff"}}>
              <div style={{padding:"6px 12px",background:"#eff6ff",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:"#1e40af"}}>{ar?`إجمالي (${filteredIndices.length} أصل)`:`Total (${filteredIndices.length} assets)`}</span>
                <div style={{flex:1}}/>
                <span style={{fontSize:10,color:"#16a34a",fontWeight:600}}>{fmtM(aggRev.reduce((s,v)=>s+v,0))}</span>
                <span style={{fontSize:10,color:"#ef4444",fontWeight:600}}>{fmtM(aggCap.reduce((s,v)=>s+v,0))}</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={{...hdS,textAlign:"left",minWidth:80}}>{ar?"البند":"Item"}</th>
                    {yrs.map(y=><th key={y} style={hdS}>{sy+y}</th>)}
                  </tr></thead>
                  <tbody>{renderCFRows(aggRev, aggCap, aggLR, "Total", "#1e40af")}</tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hotel P&L Modal */}
      {modal?.type==="hotel"&&<HotelPLModal
        data={assets[modal.idx]?.hotelPL}
        onSave={(h,ebitda)=>upAsset(modal.idx,{hotelPL:h,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t} lang={lang}
      />}
      {modal?.type==="marina"&&<MarinaPLModal
        data={assets[modal.idx]?.marinaPL}
        onSave={(m,ebitda)=>upAsset(modal.idx,{marinaPL:m,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t} lang={lang}
      />}
      {selectedAssetIndex !== null && assets[selectedAssetIndex] && (
        <AssetDetailPanel
          asset={assets[selectedAssetIndex]}
          index={selectedAssetIndex}
          upAsset={upAsset}
          results={results}
          phases={project.phases}
          lang={lang}
          t={t}
          onClose={() => setSelectedAssetIndex(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT DASHBOARD
// ═══════════════════════════════════════════════════════════════

export { StatusBadge, ScoreCell, HotelPLModal, MarinaPLModal };
export default AssetTable;
