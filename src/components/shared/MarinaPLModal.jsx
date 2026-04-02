/**
 * MarinaPLModal — extracted from App.jsx
 * Marina P&L assumptions modal with preset and EBITDA calculation
 */
import React, { useState, useRef, useEffect } from 'react';
import { MARINA_PRESET } from '../../data/constants.js';
import { defaultMarinaPL } from '../../data/defaults.js';
import { calcMarinaEBITDA } from '../../engine/hospitality.js';
import { fmt, fmtPct } from '../../utils/format.js';
import { btnS, btnPrim, btnSm, sideInputStyle } from './styles.js';

export default function MarinaPLModal({ data, onSave, onClose, t, lang }) {
  const ar = lang === "ar";
  const [m, setM] = useState(data || defaultMarinaPL());
  const upM = (u) => setM(prev => ({...prev, ...u}));
  const calc = calcMarinaEBITDA(m);

  const Row = ({label, children}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:"var(--text-secondary)"}}>{label}</span><div style={{width:120}}>{children}</div></div>;
  const NumIn = ({value, onChange}) => {
    const [loc, setLoc] = useState(String(value ?? ""));
    const ref = useRef(null);
    useEffect(() => { if (document.activeElement !== ref.current) setLoc(String(value ?? "")); }, [value]);
    return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={()=>{const n=parseFloat(loc);onChange(isNaN(n)?0:n);}} style={{...sideInputStyle,background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)",textAlign:"right",width:"100%"}} />;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"var(--surface-card)",borderRadius:10,width:480,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border-default)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.marinaPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>✕</button>
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

          <div style={{marginTop:16,padding:14,background:"var(--surface-table-header)",borderRadius:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>Berthing Rev</span><span style={{textAlign:"right"}}>{fmt(calc.berthingRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>Fuel Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fuelRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
              <span style={{color:"#ef4444"}}>Total OPEX</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(calc.totalOpex)}</span>
              <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"#16a34a"}}>{fmt(calc.ebitda)}</span>
              <span style={{color:"var(--text-secondary)"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7ec",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"8px 16px",fontSize:12}}>{ar?"إلغاء":"Cancel"}</button>
          <button onClick={()=>{onSave(m, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}</button>
        </div>
      </div>
    </div>
  );
}
