/**
 * FormWidgets — Financing Panel Input Components
 * Extracted from App.jsx during deduplication (2026-03-31).
 * MUST be outside FinancingView to keep focus on inputs.
 * (FieldGroup removed 2026-04-18 — its only consumer, the inline Edit
 *  Modal in AssetTable, was deleted in Asset Program Redesign Phase 2.)
 */
import { useState, useEffect, useRef } from "react";
import Tip from "./Tip";

const _finInpSt = {padding:"8px 11px",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",background:"var(--surface-card)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s"};
const _finSelSt = {..._finInpSt,cursor:"pointer",appearance:"auto"};

export function FL({label,children,tip,hint,error}) {
  return (<div style={{marginBottom:10}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:error?"var(--color-danger-text)":"var(--text-secondary)",marginBottom:4,fontWeight:500,letterSpacing:0.2}}>{tip?<Tip text={tip}>{label}</Tip>:label}</label>
    <div style={error?{borderRadius:"var(--radius-sm)",boxShadow:"0 0 0 1.5px var(--color-danger)"}:undefined}>{children}</div>
    {error&&<div style={{fontSize:9,color:"var(--color-danger-text)",marginTop:3,fontWeight:500}}>{error}</div>}
    {!error&&hint&&<div style={{fontSize:9,color:"var(--text-tertiary)",marginTop:3}}>{hint}</div>}
  </div>);
}

export function Inp({value,onChange,type="text",...rest}) {
  const [local, setLocal] = useState(String(value??""));
  const ref = useRef(null);
  const committed = useRef(value);
  useEffect(() => { if (committed.current !== value && document.activeElement !== ref.current) { setLocal(String(value??"")); committed.current = value; } }, [value]);
  const commit = () => { const v = type==="number" ? +local : local; if (v !== committed.current) { committed.current = v; onChange(v); } };
  return <input ref={ref} type={type} value={local} onChange={e=>setLocal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter"){commit();e.target.blur();}}} style={_finInpSt} onFocus={e=>{e.target.style.borderColor="var(--border-focus)";e.target.style.boxShadow="var(--shadow-focus)";e.target.style.background="var(--surface-card)";}} {...rest} />;
}

export function Drp({value,onChange,options,lang:dl}) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={_finSelSt}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[dl]||o.en||o.label}</option>)}</select>;
}
