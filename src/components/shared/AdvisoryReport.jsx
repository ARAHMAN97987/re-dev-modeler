/**
 * AdvisoryReport — Full-screen overlay with AI-generated feasibility report
 * Uses /api/report for AI narrative + engine data for tables
 */
import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { collectReportData } from "../../reportGenerator.js";
import { fmt, fmtPct, fmtM } from "../../utils/format.js";

const SECTIONS = [
  { key: "executiveSummary", icon: "📋", ar: "الملخص التنفيذي", en: "Executive Summary" },
  { key: "projectDescription", icon: "🏗️", ar: "وصف المشروع", en: "Project Description" },
  { key: "financialAnalysis", icon: "📊", ar: "التحليل المالي", en: "Financial Analysis" },
  { key: "capitalStructure", icon: "🏦", ar: "هيكل رأس المال", en: "Capital Structure" },
  { key: "riskAnalysis", icon: "⚠️", ar: "تحليل المخاطر", en: "Risk Analysis" },
  { key: "marketComparison", icon: "📈", ar: "مقارنة السوق", en: "Market Comparison" },
  { key: "recommendations", icon: "💡", ar: "التوصيات", en: "Recommendations" },
  { key: "conclusion", icon: "✅", ar: "الخلاصة", en: "Conclusion" },
];

const STEPS = [
  { ar: "جمع بيانات المشروع", en: "Collecting project data" },
  { ar: "تحليل النتائج المالية", en: "Analyzing financial results" },
  { ar: "كتابة التحليل الاستشاري...", en: "Writing advisory analysis..." },
  { ar: "تنسيق التقرير", en: "Formatting report" },
];

const mdComps = {
  h1: ({children}) => <h3 style={{fontSize:16,fontWeight:700,color:"#111",margin:"16px 0 8px",borderBottom:"2px solid #2EC4B6",paddingBottom:4}}>{children}</h3>,
  h2: ({children}) => <h4 style={{fontSize:14,fontWeight:600,color:"#1a1d23",margin:"12px 0 6px"}}>{children}</h4>,
  h3: ({children}) => <h5 style={{fontSize:13,fontWeight:600,color:"#374151",margin:"10px 0 4px"}}>{children}</h5>,
  p: ({children}) => <p style={{margin:"6px 0",lineHeight:1.8,color:"#374151"}}>{children}</p>,
  strong: ({children}) => <strong style={{fontWeight:700,color:"#111"}}>{children}</strong>,
  ul: ({children}) => <ul style={{margin:"6px 0",paddingInlineStart:20}}>{children}</ul>,
  ol: ({children}) => <ol style={{margin:"6px 0",paddingInlineStart:20}}>{children}</ol>,
  li: ({children}) => <li style={{margin:"4px 0",lineHeight:1.7,color:"#374151"}}>{children}</li>,
  table: ({children}) => <div style={{overflowX:"auto",margin:"10px 0"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>{children}</table></div>,
  thead: ({children}) => <thead style={{background:"#f0fdf4"}}>{children}</thead>,
  th: ({children}) => <th style={{padding:"8px 12px",textAlign:"start",fontWeight:600,color:"#166534",borderBottom:"2px solid #2EC4B6",fontSize:11}}>{children}</th>,
  td: ({children}) => <td style={{padding:"6px 12px",borderBottom:"1px solid #e5e7eb",color:"#374151"}}>{children}</td>,
  hr: () => <hr style={{border:"none",borderTop:"1px solid #e5e7eb",margin:"12px 0"}} />,
  blockquote: ({children}) => <div style={{borderInlineStart:"3px solid #2EC4B6",paddingInlineStart:14,margin:"8px 0",color:"#6b7280",fontStyle:"italic"}}>{children}</div>,
};

export default function AdvisoryReport({ project, results, financing, waterfall, incentivesResult, smartAlerts, lang, onClose }) {
  const [state, setState] = useState("idle"); // idle | generating | ready | error
  const [step, setStep] = useState(0);
  const [aiSections, setAiSections] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const reportRef = useRef(null);
  const ar = lang === "ar";

  const fmtDate = () => {
    const opts = { year: "numeric", month: "long", day: "numeric" };
    if (ar) return new Date().toLocaleDateString("ar-EG", opts); // ar-EG = Gregorian by default
    return new Date().toLocaleDateString("en-US", opts);
  };

  useEffect(() => { generate(); }, []);

  const generate = async () => {
    setState("generating"); setStep(0); setError(null); setWordCount(0);

    // Step 1: Collect data
    const data = collectReportData(project, results, financing, waterfall, incentivesResult, smartAlerts);
    setReportData(data);
    setStep(1);
    await new Promise(r => setTimeout(r, 300));
    setStep(2);

    // Step 2: Call AI (streaming)
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: data, lang }),
      });

      if (!res.ok) {
        let errMsg = `Error ${res.status}`;
        try { const ed = await res.json(); errMsg = ed.error || ed.details || errMsg; } catch {}
        throw new Error(errMsg);
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (!d || d === "[DONE]") continue;
          try {
            const ev = JSON.parse(d);
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
              fullText += ev.delta.text;
              setWordCount(fullText.split(/\s+/).length);
            }
          } catch {}
        }
      }

      // Stream done — parse JSON
      setStep(3);
      let sections;
      try {
        sections = JSON.parse(fullText.replace(/```json\s*/g, "").replace(/```/g, "").trim());
      } catch {
        sections = { executiveSummary: fullText };
      }
      setAiSections(sections);
      setState("ready");
    } catch (e) {
      setError(e.message);
      setState("error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const rd = reportData;
  const f = rd?.financing;
  const w = rd?.waterfall;

  return (
    <div className="advisory-report-overlay" style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.6)",display:"flex",justifyContent:"center",overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:900,minHeight:"100vh",background:"#fff",boxShadow:"0 0 60px rgba(0,0,0,0.3)"}}>

        {/* Action bar */}
        <div className="report-actions" style={{position:"sticky",top:0,zIndex:10,background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:20}}>📄</span>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{ar ? "التقرير الاستشاري" : "Advisory Report"}</div>
              <div style={{fontSize:10,color:"#6b7280"}}>{rd?.project?.name || project?.name}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {state === "ready" && <button onClick={handlePrint} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #2EC4B6",background:"#f0fdfa",color:"#0d9488",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📥 {ar ? "تحميل PDF" : "Download PDF"}</button>}
            {state === "ready" && <button onClick={generate} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",color:"#374151",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>🔄 {ar ? "إعادة" : "Regenerate"}</button>}
            <button onClick={onClose} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",color:"#6b7280",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div ref={reportRef} className="report-container" dir={ar ? "rtl" : "ltr"} style={{padding:"40px 48px",fontFamily:"'DM Sans','Tajawal',sans-serif",color:"#1a1d23",lineHeight:1.7}}>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:40}}>
            <div style={{fontSize:28,fontWeight:900,color:"#2EC4B6",letterSpacing:2,fontFamily:"'Tajawal',sans-serif"}}>{ar ? "حصيف" : "Haseef"}</div>
            <div style={{fontSize:11,color:"#6b7280",letterSpacing:1,textTransform:"uppercase",marginTop:2}}>{ar ? "التقرير الاستشاري للجدوى المالية" : "Financial Feasibility Advisory Report"}</div>
            <hr style={{border:"none",borderTop:"2px solid #2EC4B6",width:80,margin:"16px auto"}} />
            <div style={{fontSize:18,fontWeight:700,color:"#111",marginTop:12}}>{rd?.project?.name || project?.name}</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>{rd?.project?.location} | {fmtDate()}</div>
          </div>

          {/* Loading state */}
          {state === "generating" && (
            <div style={{textAlign:"center",padding:"60px 0"}}>
              <div style={{fontSize:32,marginBottom:16}}>📝</div>
              <div style={{fontSize:16,fontWeight:600,color:"#111",marginBottom:24}}>{ar ? "جاري إعداد التقرير..." : "Preparing your report..."}</div>
              <div style={{maxWidth:300,margin:"0 auto"}}>
                {STEPS.map((s, i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",opacity:i<=step?1:0.3}}>
                    <span style={{fontSize:14}}>{i<step?"✅":i===step?"🔄":"⏳"}</span>
                    <span style={{fontSize:13,color:i<=step?"#111":"#9ca3af"}}>{ar ? s.ar : s.en}</span>
                  </div>
                ))}
              </div>
              {wordCount > 0 && <div style={{fontSize:12,color:"#2EC4B6",fontWeight:600,marginTop:12}}>{ar ? `${wordCount.toLocaleString()} كلمة...` : `${wordCount.toLocaleString()} words...`}</div>}
              <div style={{fontSize:11,color:"#9ca3af",marginTop:8}}>{ar ? "يستغرق 15-30 ثانية" : "Takes 15-30 seconds"}</div>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div style={{textAlign:"center",padding:"60px 0"}}>
              <div style={{fontSize:32,marginBottom:12}}>❌</div>
              <div style={{fontSize:14,color:"#ef4444",marginBottom:8}}>{error}</div>
              <button onClick={generate} style={{padding:"8px 20px",borderRadius:8,border:"none",background:"#2EC4B6",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>🔄 {ar ? "حاول مرة أخرى" : "Try Again"}</button>
            </div>
          )}

          {/* Ready — Full Report */}
          {state === "ready" && aiSections && rd && (<>

            {/* Key Metrics Bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:32,padding:20,background:"#f8fafc",borderRadius:12,border:"1px solid #e2e8f0"}}>
              {[
                { l: ar?"CAPEX":"CAPEX", v: fmtM(rd.financials.totalCAPEX), c:"#1e3a5f" },
                { l: ar?"IRR المشروع":"Project IRR", v: rd.financials.projectIRR!=null?fmtPct(rd.financials.projectIRR*100):"—", c: (rd.financials.projectIRR||0)>=0.15?"#16a34a":(rd.financials.projectIRR||0)>=0.12?"#f59e0b":"#ef4444" },
                { l: "NPV @10%", v: fmtM(rd.financials.npv10), c: (rd.financials.npv10||0)>0?"#16a34a":"#ef4444" },
                ...(f?[{ l: "DSCR", v: f.minDSCR!=null?f.minDSCR.toFixed(2)+"x":"—", c: (f.minDSCR||0)>=1.5?"#16a34a":(f.minDSCR||0)>=1.2?"#f59e0b":"#ef4444" }]:[]),
                ...(w?[{ l: "LP IRR", v: w.lpIRR!=null?fmtPct(w.lpIRR*100):"—", c:"#7c3aed" }]:[]),
                ...(w?[{ l: "LP MOIC", v: w.lpMOIC!=null?w.lpMOIC.toFixed(2)+"x":"—", c:"#7c3aed" }]:[]),
              ].map((m,i) => (
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{m.l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:m.c,marginTop:2}}>{m.v}</div>
                </div>
              ))}
            </div>

            {/* AI Sections */}
            {SECTIONS.map((sec, idx) => (
              aiSections[sec.key] ? (
                <div key={sec.key} className="report-section" style={{marginBottom:28,pageBreakInside:"avoid"}}>
                  <h2 className="report-section-title" style={{fontSize:16,fontWeight:700,color:"#111",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #2EC4B6",display:"flex",alignItems:"center",gap:8,pageBreakAfter:"avoid"}}>
                    <span>{sec.icon}</span> <span>{idx+1}. {ar ? sec.ar : sec.en}</span>
                  </h2>
                  <Markdown components={mdComps}>{aiSections[sec.key]}</Markdown>

                  {/* Data tables after specific sections */}
                  {sec.key === "projectDescription" && rd.assets.length > 0 && (
                    <div style={{overflowX:"auto",margin:"16px 0"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead style={{background:"#f0fdf4"}}><tr>
                          <th style={thS}>{ar?"الأصل":"Asset"}</th><th style={thS}>{ar?"النوع":"Type"}</th>
                          <th style={thS}>GFA</th><th style={thS}>{ar?"التكلفة/م²":"Cost/m²"}</th>
                          <th style={thS}>{ar?"الإيجار/م²":"Rate/m²"}</th><th style={thS}>{ar?"المرحلة":"Phase"}</th>
                        </tr></thead>
                        <tbody>{rd.assets.map((a,i) => (
                          <tr key={i}><td style={tdS}>{a.name}</td><td style={tdS}>{a.category}</td>
                          <td style={tdN}>{fmt(a.gfa)}</td><td style={tdN}>{fmt(a.costPerSqm)}</td>
                          <td style={tdN}>{a.revType==="Lease"?fmt(a.leaseRate):a.revType==="Operating"?fmtM(a.opEbitda):"—"}</td>
                          <td style={tdS}>{a.phase}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}

                  {sec.key === "capitalStructure" && f && (
                    <div style={{overflowX:"auto",margin:"16px 0"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead style={{background:"#f0fdf4"}}><tr><th style={thS}>{ar?"المصدر":"Source"}</th><th style={thS}>{ar?"المبلغ":"Amount"}</th><th style={thS}>{ar?"النسبة":"Share"}</th></tr></thead>
                        <tbody>
                          {f.totalDebt>0 && <tr><td style={tdS}>{ar?"قرض بنكي":"Bank Debt"}</td><td style={tdN}>{fmtM(f.totalDebt)}</td><td style={tdN}>{f.ltvActual}</td></tr>}
                          {f.gpEquity>0 && <tr><td style={tdS}>{ar?"حقوق المطور":"GP Equity"}</td><td style={tdN}>{fmtM(f.gpEquity)}</td><td style={tdN}>{f.totalEquity>0?(f.gpEquity/f.totalEquity*100).toFixed(0)+"%":"—"}</td></tr>}
                          {f.lpEquity>0 && <tr><td style={tdS}>{ar?"حقوق المستثمر":"LP Equity"}</td><td style={tdN}>{fmtM(f.lpEquity)}</td><td style={tdN}>{f.totalEquity>0?(f.lpEquity/f.totalEquity*100).toFixed(0)+"%":"—"}</td></tr>}
                          <tr style={{fontWeight:700,borderTop:"2px solid #2EC4B6"}}><td style={tdS}>{ar?"الإجمالي":"Total"}</td><td style={tdN}>{fmtM((f.totalDebt||0)+(f.totalEquity||0))}</td><td style={tdN}>100%</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sec.key === "riskAnalysis" && rd.alerts.total > 0 && (
                    <div style={{margin:"12px 0",padding:12,background:"#fef3c7",borderRadius:8,border:"1px solid #fbbf24",fontSize:11}}>
                      <div style={{fontWeight:700,marginBottom:6}}>⚠ {ar?"تنبيهات المراجع الذكي":"Smart Reviewer Alerts"}: {rd.alerts.critical} {ar?"حرج":"critical"}, {rd.alerts.warning} {ar?"تحذير":"warning"}</div>
                      {rd.alerts.items.slice(0,5).map((a,i) => <div key={i} style={{padding:"2px 0"}}>• [{a.severity}] {ar?a.ar:a.en}{a.assetName?` (${a.assetName})`:""}</div>)}
                    </div>
                  )}
                </div>
              ) : null
            ))}

            {/* Footer */}
            <div style={{marginTop:40,paddingTop:20,borderTop:"2px solid #e5e7eb",textAlign:"center",color:"#9ca3af",fontSize:10}}>
              <div style={{color:"#2EC4B6",fontWeight:700,fontSize:12,marginBottom:4}}>Haseef | حصيف</div>
              <div>Generated by Haseef Financial Modeler | haseefdev.com</div>
              <div>{fmtDate()}</div>
              <div style={{marginTop:8,fontStyle:"italic"}}>{ar?"هذا التقرير تم إعداده آلياً ولا يُعد استشارة مالية رسمية":"This report is auto-generated and does not constitute formal financial advice"}</div>
            </div>
          </>)}
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body > *:not(.advisory-report-overlay) { display: none !important; }
          .advisory-report-overlay { position: static !important; background: none !important; }
          .report-actions { display: none !important; }
          .report-container { padding: 20mm !important; max-width: 100% !important; }
          .report-section { page-break-inside: avoid; }
          .report-section-title { page-break-after: avoid; }
          @page { margin: 15mm; }
        }
      `}</style>
    </div>
  );
}

const thS = { padding:"8px 12px", textAlign:"start", fontWeight:600, color:"#166534", borderBottom:"2px solid #2EC4B6", fontSize:10, textTransform:"uppercase", letterSpacing:0.3 };
const tdS = { padding:"6px 12px", borderBottom:"1px solid #e5e7eb", fontSize:12, color:"#374151" };
const tdN = { ...tdS, textAlign:"right", fontVariantNumeric:"tabular-nums" };
