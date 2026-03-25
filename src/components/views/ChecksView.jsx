// Extracted from App.jsx lines 11707-11766
import { useState } from "react";

const tblStyle = { width: "100%", borderCollapse: "collapse" };
const thSt = { padding: "7px 8px", textAlign: "start", fontSize: 10, fontWeight: 600, color: "#6b7080", background: "#f8f9fb", borderBottom: "1px solid #e5e7ec", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.3 };
const tdSt = { padding: "5px 8px", borderBottom: "1px solid #f0f1f5", fontSize: 12, whiteSpace: "nowrap" };

function ChecksView({ checks, t, lang, onFix }) {
  const ar = lang === "ar";
  const ap = checks.every(c=>c.pass);
  const fc = checks.filter(c=>!c.pass).length;
  const cats = [...new Set(checks.map(c=>c.cat||"General"))];
  const catLabels = {T0:ar?"T0: \u0641\u062D\u0635 \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A":"T0: Input Validation",T1:ar?"T1: \u0645\u062D\u0631\u0643 \u0627\u0644\u0645\u0634\u0631\u0648\u0639":"T1: Project Engine",T2:ar?"T2: \u0627\u0644\u062A\u0645\u0648\u064A\u0644":"T2: Financing",T3:ar?"T3: \u062D\u0627\u0641\u0632 \u0627\u0644\u0623\u062F\u0627\u0621":"T3: Waterfall",T4:ar?"T4: \u0627\u0644\u062D\u0648\u0627\u0641\u0632":"T4: Incentives",T5:ar?"T5: \u0627\u0644\u062A\u0643\u0627\u0645\u0644":"T5: Integration",General:"General"};
  const catFixTab = {T0:"assets",T1:"cashflow",T2:"financing",T3:"waterfall",T4:"incentives",T5:"dashboard"};
  const getFixTab = (c) => {
    if (c.name?.includes("Efficiency") || c.name?.includes("Cost/sqm") || c.name?.includes("GFA")) return "assets";
    if (c.name?.includes("Tenor") || c.name?.includes("Grace") || c.name?.includes("LTV") || c.name?.includes("DSCR")) return "financing";
    if (c.name?.includes("Exit") || c.name?.includes("Horizon")) return "dashboard";
    if (c.name?.includes("GP") || c.name?.includes("LP") || c.name?.includes("Carry") || c.name?.includes("Catch")) return "financing";
    return catFixTab[c.cat] || null;
  };
  return (<div>
    <div style={{display:"flex",alignItems:"center",marginBottom:14,gap:12}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.modelChecks}</div>
      <span style={{fontSize:11,padding:"3px 10px",borderRadius:4,fontWeight:600,background:ap?"#dcfce7":"#fef2f2",color:ap?"#16a34a":"#ef4444"}}>
        {ap?t.allPass:`${fc} ${t.errorFound}`}
      </span>
      <span style={{fontSize:11,color:"#6b7080"}}>{checks.length} {ar?"\u0627\u062E\u062A\u0628\u0627\u0631":"tests"} \u00B7 {checks.filter(c=>c.pass).length} {ar?"\u0646\u0627\u062C\u062D":"passed"}</span>
    </div>
    {/* Failed checks summary at top */}
    {fc > 0 && <div style={{background:"#fef2f2",borderRadius:8,border:"1px solid #fecaca",padding:"12px 16px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:"#991b1b",marginBottom:8}}>{ar?`${fc} \u0641\u062D\u0648\u0635\u0627\u062A \u0641\u0627\u0634\u0644\u0629 \u062A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639\u0629`:`${fc} Failed Checks Require Attention`}</div>
      {checks.filter(c=>!c.pass).map((c,i) => {const fixTab=getFixTab(c);return <div key={i} style={{fontSize:11,color:"#b91c1c",padding:"3px 0",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontWeight:600}}>\u2717</span>
        <span style={{flex:1}}><strong>[{c.cat}]</strong> {c.name}{c.detail && <span style={{color:"#9ca3af"}}> - {c.detail}</span>}</span>
        {fixTab && onFix && <button onClick={()=>onFix(fixTab)} style={{padding:"2px 8px",background:"rgba(46,196,182,0.1)",border:"1px solid rgba(46,196,182,0.3)",borderRadius:4,color:"#0f766e",fontSize:9,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{ar?"\u0625\u0635\u0644\u0627\u062D \u2192":"Fix \u2192"}</button>}
      </div>;})}
    </div>}
    {cats.map(cat => {
      const catChecks = checks.filter(c=>(c.cat||"General")===cat);
      const catPass = catChecks.every(c=>c.pass);
      return (
        <div key={cat} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:catPass?"#16a34a":"#ef4444"}}>{catPass?"\u2713":"\u2717"}</span>
            <span style={{fontSize:11,fontWeight:600,color:"#1a1d23"}}>{catLabels[cat]||cat}</span>
            <span style={{fontSize:10,color:"#9ca3af"}}>{catChecks.filter(c=>c.pass).length}/{catChecks.length}</span>
          </div>
          <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
            <table style={tblStyle}><tbody>
              {catChecks.map((c,i)=>{const fixTab=!c.pass?getFixTab(c):null;return <tr key={i} style={{background:c.pass?"":"#fef2f2"}}>
                <td style={{...tdSt,fontWeight:500,width:"30%"}}>{c.name}</td>
                <td style={{...tdSt,textAlign:"center",width:70}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:3,fontWeight:600,background:c.pass?"#dcfce7":"#fef2f2",color:c.pass?"#16a34a":"#ef4444"}}>{c.pass?(ar?"\u0646\u0627\u062C\u062D":"PASS"):(ar?"\u0641\u0627\u0634\u0644":"FAIL")}</span></td>
                <td style={{...tdSt,color:"#6b7080",fontSize:11}}>{c.desc}</td>
                {c.detail && <td style={{...tdSt,color:"#9ca3af",fontSize:10,maxWidth:200}}>{c.detail}</td>}
                {fixTab && onFix ? <td style={{...tdSt,width:60,textAlign:"center"}}><button onClick={()=>onFix(fixTab)} style={{padding:"2px 8px",background:"rgba(46,196,182,0.1)",border:"1px solid rgba(46,196,182,0.3)",borderRadius:4,color:"#0f766e",fontSize:9,fontWeight:600,cursor:"pointer"}}>{ar?"\u0625\u0635\u0644\u0627\u062D \u2192":"Fix \u2192"}</button></td> : !c.pass ? <td style={tdSt}></td> : null}
              </tr>;})}
            </tbody></table>
          </div>
        </div>
      );
    })}
  </div>);
}

export default ChecksView;
