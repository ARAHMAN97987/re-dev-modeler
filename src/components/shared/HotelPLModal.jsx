/**
 * HotelPLModal — extracted from App.jsx
 * Hotel P&L assumptions modal with presets and EBITDA calculation
 */
import React, { useState, useRef, useEffect } from 'react';
import { HOTEL_PRESETS } from '../../data/constants.js';
import { defaultHotelPL } from '../../data/defaults.js';
import { calcHotelEBITDA } from '../../engine/hospitality.js';
import { fmt, fmtPct } from '../../utils/format.js';
import { btnS, btnPrim, btnSm, sideInputStyle } from './styles.js';

export default function HotelPLModal({ data, onSave, onClose, t, lang }) {
  const ar = lang === "ar";
  const [h, setH] = useState(data || defaultHotelPL());
  const upH = (u) => setH(prev => ({...prev, ...u}));
  const calc = calcHotelEBITDA(h);

  const applyPreset = (key) => { const p = HOTEL_PRESETS[key]; if (p) setH(prev => ({...prev, ...p})); };

  const Row = ({label, children}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:"var(--text-secondary)"}}>{label}</span><div style={{width:120}}>{children}</div></div>;
  const NumIn = ({value, onChange}) => {
    const [loc, setLoc] = useState(String(value ?? ""));
    const ref = useRef(null);
    useEffect(() => { if (document.activeElement !== ref.current) setLoc(String(value ?? "")); }, [value]);
    return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={()=>{const n=parseFloat(loc);onChange(isNaN(n)?0:n);}} style={{...sideInputStyle,background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)",textAlign:"right",width:"100%"}} />;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"var(--surface-card)",borderRadius:10,width:520,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border-default)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.hotelPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          {/* Presets */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {Object.keys(HOTEL_PRESETS).map(k=><button key={k} onClick={()=>applyPreset(k)} style={{...btnS,background:"#eef2ff",color:"#2563eb",padding:"6px 12px",fontSize:11,fontWeight:500}}>{k}</button>)}
          </div>

          <div style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.keys}</div>
          <Row label={t.keys}><NumIn value={h.keys} onChange={v=>upH({keys:v})} /></Row>
          <Row label={t.adr}><NumIn value={h.adr} onChange={v=>upH({adr:v})} /></Row>
          <Row label={t.stabOcc}><NumIn value={h.stabOcc} onChange={v=>upH({stabOcc:v})} /></Row>
          <Row label={t.daysYear}><NumIn value={h.daysYear} onChange={v=>upH({daysYear:v})} /></Row>

          <div style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:8}}>{t.revMix}</div>
          <Row label={t.roomsPct}><NumIn value={h.roomsPct} onChange={v=>upH({roomsPct:v})} /></Row>
          <Row label={t.fbPct}><NumIn value={h.fbPct} onChange={v=>upH({fbPct:v})} /></Row>
          <Row label={t.micePct}><NumIn value={h.micePct} onChange={v=>upH({micePct:v})} /></Row>
          <Row label={t.otherPct}><NumIn value={h.otherPct} onChange={v=>upH({otherPct:v})} /></Row>

          <div style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:8}}>{t.opexRatios}</div>
          <Row label={t.roomExpPct}><NumIn value={h.roomExpPct} onChange={v=>upH({roomExpPct:v})} /></Row>
          <Row label={t.fbExpPct}><NumIn value={h.fbExpPct} onChange={v=>upH({fbExpPct:v})} /></Row>
          <Row label={t.miceExpPct}><NumIn value={h.miceExpPct} onChange={v=>upH({miceExpPct:v})} /></Row>
          <Row label={t.otherExpPct}><NumIn value={h.otherExpPct} onChange={v=>upH({otherExpPct:v})} /></Row>
          <Row label={t.undistPct}><NumIn value={h.undistPct} onChange={v=>upH({undistPct:v})} /></Row>
          <Row label={t.fixedPct}><NumIn value={h.fixedPct} onChange={v=>upH({fixedPct:v})} /></Row>

          {/* Calculated results */}
          <div style={{marginTop:16,padding:14,background:"var(--surface-table-header)",borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.stabRevenue}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>Rooms Rev</span><span style={{textAlign:"right"}}>{fmt(calc.roomsRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>F&B Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fbRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>MICE Rev</span><span style={{textAlign:"right"}}>{fmt(calc.miceRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
            </div>
            <div style={{borderTop:"1px solid #e5e7ec",marginTop:8,paddingTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
                <span style={{color:"#ef4444"}}>Total OPEX</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(calc.totalOpex)}</span>
                <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"#16a34a"}}>{fmt(calc.ebitda)}</span>
                <span style={{color:"var(--text-secondary)"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7ec",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"8px 16px",fontSize:12}}>{ar?"إلغاء":"Cancel"}</button>
          <button onClick={()=>{onSave(h, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}</button>
        </div>
      </div>
    </div>
  );
}
