/**
 * Tip — Inline tooltip component for KPIs and table headers
 * Extracted from App.jsx during deduplication (2026-03-31)
 */
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "./hooks";

export default function Tip({text, children}) {
  const isMobile = useIsMobile();
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({top:0, left:0});
  const onEnter = () => {
    if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({top:r.bottom+6, left:r.left+r.width/2}); }
    setShow(true);
  };
  useEffect(() => { if (show && isMobile) { const t = setTimeout(() => setShow(false), 4000); return () => clearTimeout(t); } }, [show, isMobile]);
  return <span style={{display:"inline-flex",alignItems:"center"}}>
    {children}
    <span ref={ref} onMouseEnter={isMobile?undefined:onEnter} onMouseLeave={isMobile?undefined:()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{cursor:"help",fontSize:isMobile?13:10,color:"var(--text-tertiary)",marginInlineStart:3,lineHeight:1,padding:isMobile?"4px":0}}>ⓘ</span>
    {show&&<>{isMobile&&<div onClick={()=>setShow(false)} style={{position:"fixed",inset:0,zIndex:99998}} />}<div style={{position:"fixed",top:pos.top,...(document.dir==="rtl"?{right:Math.max(10,Math.min(window.innerWidth-pos.left-140,window.innerWidth-300))}:{left:Math.max(10,Math.min(pos.left-140,window.innerWidth-300))}),width:isMobile?Math.min(280,window.innerWidth-24):280,background:"#1a1d23",color:"#d0d4dc",padding:isMobile?"12px 14px":"10px 13px",borderRadius:8,fontSize:isMobile?12:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start"}}>{text.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?4:0}}>{line}</div>)}</div></>}
  </span>;
}
