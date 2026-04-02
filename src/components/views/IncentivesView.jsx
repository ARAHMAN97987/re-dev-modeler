// Extracted from App.jsx lines 11238-11469
import { useState, useMemo } from "react";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { useIsMobile } from "../shared/hooks.js";

const btnS = { border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" };
const btnSm = { ...btnS, padding: "4px 8px", fontSize: 11, fontWeight: 500, borderRadius: 4 };
const sideInputStyle = { width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #282d3a", background: "#0F2D4F", color: "#d0d4dc", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const mktInputStyle = { padding: "6px 10px", border: "1px solid #e5e7ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fafbfc" };

function NI({ value, onChange, style: sx }) {
  return <input type="number" value={value||""} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...mktInputStyle, ...sx }} />;
}

// Minimal Tip component for standalone use
function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginInlineStart: 4 }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ cursor: "help", fontSize: 10, color: "#9ca3af" }}>ⓘ</span>
      {show && <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "#1a1d23", color: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 10, whiteSpace: "pre-line", zIndex: 999, minWidth: 200, maxWidth: 320, lineHeight: 1.5, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>{text}</div>}
    </span>
  );
}

// Minimal KPI component for standalone use
function KPI({ label, value, sub, color, tip }) {
  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7ec", padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{label}{tip && <Tip text={tip} />}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || "#1a1d23" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Minimal HelpLink component for standalone use
function HelpLink({ contentKey, lang, onOpen, label: customLabel }) {
  return (
    <button onClick={() => onOpen && onOpen(contentKey)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "inherit", textDecoration: "underline" }}>
      {customLabel || (lang === "ar" ? "اعرف أكثر" : "Learn more")}
    </button>
  );
}

// Minimal EducationalModal component for standalone use
function EducationalModal({ contentKey, lang, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 600, maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{contentKey}</div>
        <button onClick={onClose} style={{ ...btnS, background: "#f0f1f5", padding: "8px 16px", marginTop: 12 }}>{lang === "ar" ? "إغلاق" : "Close"}</button>
      </div>
    </div>
  );
}

function IncentivesView({ project, results, incentivesResult, financing, lang, up }) {
  const isMobile = useIsMobile();
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  if (!project || !results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:12,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>🏛</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1a1d23",marginBottom:6}}>{lang==="ar"?"أضف أصول أولاً":"Add Assets First"}</div>
      <div style={{fontSize:12,color:"#6b7080",maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"الحوافز تحتاج بيانات المشروع. أضف أصول من تبويب البرنامج.":"Incentives need project data. Add assets from the Program tab."}</div>
    </div>
  );

  // ── Phase filter ──
  const ar = lang === "ar";
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const hasPhases = allPhaseNames.length > 1;

  // ── Phase share for proportional display ──
  const phaseShare = useMemo(() => {
    if (!isFiltered) return { capex: 1, land: 1 };
    const rawC = results.consolidated;
    let capexSum = 0, landSum = 0;
    activePh.forEach(pName => { const pr = results.phaseResults?.[pName]; if (!pr) return; capexSum += pr.totalCapex || 0; landSum += pr.totalLandRent || 0; });
    return { capex: rawC.totalCapex > 0 ? capexSum / rawC.totalCapex : 0, land: rawC.totalLandRent > 0 ? landSum / rawC.totalLandRent : 0 };
  }, [isFiltered, selectedPhases, results]);

  const ir = incentivesResult;
  const inc = project.incentives || {};
  const cur = project.currency || "SAR";
  const rawC = results.consolidated;
  // Filtered CAPEX for display in formula
  const cTotalCapex = isFiltered ? activePh.reduce((s, p) => s + (results.phaseResults?.[p]?.totalCapex || 0), 0) : rawC.totalCapex;

  // Proportional incentive values
  const pIR = useMemo(() => {
    if (!ir) return null;
    if (!isFiltered) return ir;
    return {
      ...ir,
      totalIncentiveValue: (ir.totalIncentiveValue || 0) * phaseShare.capex,
      capexGrantTotal: (ir.capexGrantTotal || 0) * phaseShare.capex,
      landRentSavingTotal: (ir.landRentSavingTotal || 0) * phaseShare.land,
      feeRebateTotal: (ir.feeRebateTotal || 0) * phaseShare.capex,
    };
  }, [ir, isFiltered, phaseShare, selectedPhases]);

  const upInc = (key, updates) => {
    const newInc = { ...project.incentives, [key]: { ...project.incentives[key], ...updates } };
    up({ incentives: newInc });
  };

  const addFeeItem = () => {
    const items = [...(inc.feeRebates?.items || []), { name: "", type: "rebate", amount: 0, year: 1, deferralMonths: 12 }];
    upInc("feeRebates", { items });
  };
  const updateFeeItem = (i, u) => {
    const items = [...(inc.feeRebates?.items || [])];
    items[i] = { ...items[i], ...u };
    upInc("feeRebates", { items });
  };
  const removeFeeItem = (i) => {
    upInc("feeRebates", { items: (inc.feeRebates?.items || []).filter((_, j) => j !== i) });
  };

  // Without incentives calc (for comparison)
  const irrWithout = rawC.irr;
  const irrWith = financing?.leveredIRR;
  const npvWithout = rawC.npv10;

  const ToggleCard = ({ title, titleAr, enabled, onToggle, color, value, children, tip }) => (
    <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${enabled ? color : "#e5e7ec"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: enabled ? `1px solid ${color}22` : "none", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? color : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 2, insetInlineStart: enabled ? 18 : 2, transition: "inset-inline-start 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? "#1a1d23" : "#9ca3af" }}>{lang === "ar" ? titleAr : title}{tip && <Tip text={tip} />}</div>
        </div>
        {enabled && value && <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtM(value)}</div>}
      </div>
      {enabled && <div style={{ padding: "12px 16px" }}>{children}</div>}
    </div>
  );

  const F = ({ label, children, hint }) => <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "#6b7080", marginBottom: 3 }}>{label}</div>{children}{hint && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{hint}</div>}</div>;

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {hasPhases && (
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
          {isFiltered && <span style={{fontSize:10,color:"#6b7080",marginInlineStart:8}}>{ar?`حصة المراحل المختارة: ${(phaseShare.capex*100).toFixed(0)}% من التكاليف`:`Selected phases: ${(phaseShare.capex*100).toFixed(0)}% of CAPEX`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings are always project-level */}
    {hasPhases && isFiltered && (
      <div style={{background:"#fffbeb",borderRadius:8,border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {ar ? "إعدادات الحوافز على مستوى المشروع كاملاً. الأرقام المعروضة تعكس حصة المراحل المختارة فقط" : "Incentive settings apply to the entire project. Numbers shown reflect the selected phases' share only"}
      </div>
    )}
    {/* Summary KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
      <KPI label={ar ? "إجمالي الحوافز" : "Total Incentives"} value={fmtM(pIR?.totalIncentiveValue || 0)} sub={cur} color="#16a34a" tip="مجموع كل الحوافز الحكومية (منح + دعم + إعفاءات)\nSum of all government incentives" />
      <KPI label={ar ? "منحة CAPEX" : "CAPEX Grant"} value={fmtM(pIR?.capexGrantTotal || 0)} sub={inc.capexGrant?.enabled ? "ON" : "OFF"} color={inc.capexGrant?.enabled ? "#2563eb" : "#9ca3af"} tip="الحكومة تغطي نسبة من تكاليف البناء. تقلل رأس المال المطلوب\nGov covers % of construction cost. Reduces equity needed" />
      <KPI label={ar ? "وفر إيجار الأرض" : "Land Rent Savings"} value={fmtM(pIR?.landRentSavingTotal || 0)} sub={inc.landRentRebate?.enabled ? "ON" : "OFF"} color={inc.landRentRebate?.enabled ? "#f59e0b" : "#9ca3af"} tip="الحكومة تعفي أو تخفض إيجار الأرض لسنوات محددة\nGov waives/reduces land rent for specified years" />
      <KPI label={ar ? "دعم التمويل" : "Finance Support"} value={fmtM(financing?.interestSubsidyTotal || 0)} sub={inc.financeSupport?.enabled ? "ON" : "OFF"} color={inc.financeSupport?.enabled ? "#8b5cf6" : "#9ca3af"} tip="الحكومة تدفع جزء من فوائد البنك أو تقدم قرض ميسر\nGov pays portion of bank interest or provides soft loan" />
      <KPI label={ar ? "استرداد رسوم" : "Fee Rebates"} value={fmtM(pIR?.feeRebateTotal || 0)} sub={inc.feeRebates?.enabled ? "ON" : "OFF"} color={inc.feeRebates?.enabled ? "#06b6d4" : "#9ca3af"} tip="إعفاء أو تخفيض رسوم حكومية (تراخيص، ربط خدمات)\nGov fee waivers/reductions (permits, utility connections)" />
    </div>

    {/* Incentive cards */}
    <div style={{ marginBottom: 12 }}><HelpLink contentKey="govIncentives" lang={lang} onOpen={setEduModal} label={lang === "ar" ? "اعرف أكثر عن أنواع الحوافز" : "Learn about incentive types"} /></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 1. CAPEX Grant ── */}
      <ToggleCard title="CAPEX Grant (Capital Subsidy)" tip={"منحة حكومية تغطي جزءاً من CAPEX الإنشائي. تخفض التكلفة الفعلية وترفع IRR\nGovernment grant covering part of construction CAPEX. Lowers effective cost and improves IRR"} titleAr="دعم رأسمالي (منحة CAPEX)" enabled={inc.capexGrant?.enabled} onToggle={() => upInc("capexGrant", { enabled: !inc.capexGrant?.enabled })} color="#2563eb" value={pIR?.capexGrantTotal}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <F label={lang === "ar" ? "نسبة المنحة %" : "Grant %"}><NI value={inc.capexGrant?.grantPct || 25} onChange={v => upInc("capexGrant", { grantPct: v })} /></F>
          <F label={lang === "ar" ? "الحد الأقصى (ريال)" : "Max Cap (SAR)"}><NI value={inc.capexGrant?.maxCap || 50000000} onChange={v => upInc("capexGrant", { maxCap: v })} /></F>
        </div>
        <F label={lang === "ar" ? "توقيت الاستلام" : "Timing"}>
          <select value={inc.capexGrant?.timing || "construction"} onChange={e => upInc("capexGrant", { timing: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }}>
            <option value="construction">{lang === "ar" ? "خلال البناء" : "During Construction"}</option>
            <option value="completion">{lang === "ar" ? "عند الإنجاز" : "At Completion"}</option>
          </select>
        </F>
        <div style={{ fontSize: 11, color: "#6b7080", marginTop: 6, padding: 8, background: "#f0f4ff", borderRadius: 4 }}>
          {lang === "ar" ? "القيمة المحسوبة" : "Calculated"}: <strong>{fmt(pIR?.capexGrantTotal || 0)} {cur}</strong> = min({inc.capexGrant?.grantPct}% × {fmtM(cTotalCapex)}, {fmt(inc.capexGrant?.maxCap)})
        </div>
      </ToggleCard>

      {/* ── 2. Finance Support ── */}
      <ToggleCard title="Finance Support (Interest Subsidy / Soft Loan)" tip={"الجهة الحكومية تتحمل جزءاً من تكلفة التمويل أو تقدم قرضاً بدون ربح. يخفض معدل التمويل الفعلي ويحسن DSCR\nGovernment pays part of financing cost or provides a zero-profit loan. Lowers effective rate and improves DSCR"} titleAr="دعم التمويل (تحمل فوائد / قرض حسن)" enabled={inc.financeSupport?.enabled} onToggle={() => upInc("financeSupport", { enabled: !inc.financeSupport?.enabled })} color="#8b5cf6" value={financing?.interestSubsidyTotal}>
        <F label={lang === "ar" ? "نوع الدعم" : "Support Type"}>
          <select value={inc.financeSupport?.subType || "interestSubsidy"} onChange={e => upInc("financeSupport", { subType: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }}>
            <option value="interestSubsidy">{lang === "ar" ? "تحمل فوائد" : "Interest Subsidy"}</option>
            <option value="softLoan">{lang === "ar" ? "قرض حسن" : "Soft Loan"}</option>
          </select>
        </F>
        {inc.financeSupport?.subType === "interestSubsidy" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "نسبة التحمل %" : "Subsidy %"}><NI value={inc.financeSupport?.subsidyPct || 50} onChange={v => upInc("financeSupport", { subsidyPct: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Duration (yrs)"}><NI value={inc.financeSupport?.subsidyYears || 5} onChange={v => upInc("financeSupport", { subsidyYears: v })} /></F>
            <F label={lang === "ar" ? "البداية" : "Start"}>
              <select value={inc.financeSupport?.subsidyStart || "operation"} onChange={e => upInc("financeSupport", { subsidyStart: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }}>
                <option value="drawdown">{lang === "ar" ? "من السحب" : "From Drawdown"}</option>
                <option value="operation">{lang === "ar" ? "من التشغيل" : "From Operation"}</option>
              </select>
            </F>
          </div>
        )}
        {inc.financeSupport?.subType === "softLoan" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "المبلغ (ريال)" : "Amount (SAR)"}><NI value={inc.financeSupport?.softLoanAmount || 0} onChange={v => upInc("financeSupport", { softLoanAmount: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Tenor (yrs)"}><NI value={inc.financeSupport?.softLoanTenor || 10} onChange={v => upInc("financeSupport", { softLoanTenor: v })} /></F>
            <F label={lang === "ar" ? "سماح (سنوات)" : "Grace (yrs)"}><NI value={inc.financeSupport?.softLoanGrace || 3} onChange={v => upInc("financeSupport", { softLoanGrace: v })} /></F>
          </div>
        )}
      </ToggleCard>

      {/* ── 3. Land Rent Rebate ── */}
      <ToggleCard title="Land Rent Rebate (Exemption/Discount)" tip={"تخفيض أو إعفاء إيجار الأرض خلال البناء أو السنوات الأولى. يحسن التدفقات النقدية المبكرة\nReducing or waiving land rent during construction or early years. Improves early cash flows"} titleAr="إعفاء/خصم إيجار الأرض" enabled={inc.landRentRebate?.enabled} onToggle={() => upInc("landRentRebate", { enabled: !inc.landRentRebate?.enabled })} color="#f59e0b" value={pIR?.landRentSavingTotal}>
        {project.landType !== "lease" ? (
          <div style={{ fontSize: 12, color: "#ef4444" }}>{lang === "ar" ? "غير متاح - الأرض ليست مؤجرة" : "Not applicable - land is not leased"}</div>
        ) : (<>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", marginBottom: 6 }}>{lang === "ar" ? "فترة البناء" : "Construction Period"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "نسبة الإعفاء %" : "Rebate %"}><NI value={inc.landRentRebate?.constrRebatePct || 100} onChange={v => upInc("landRentRebate", { constrRebatePct: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Duration (yrs)"} hint={lang === "ar" ? "0 = تلقائي من البناء" : "0 = auto from construction"}><NI value={inc.landRentRebate?.constrRebateYears || 0} onChange={v => upInc("landRentRebate", { constrRebateYears: v })} /></F>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", marginTop: 10, marginBottom: 6 }}>{lang === "ar" ? "فترة ما بعد الافتتاح" : "Post-Opening Period"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "نسبة الخصم %" : "Discount %"}><NI value={inc.landRentRebate?.operRebatePct || 50} onChange={v => upInc("landRentRebate", { operRebatePct: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Duration (yrs)"}><NI value={inc.landRentRebate?.operRebateYears || 3} onChange={v => upInc("landRentRebate", { operRebateYears: v })} /></F>
          </div>
        </>)}
      </ToggleCard>

      {/* ── 4. Fee/Tax Rebates ── */}
      <ToggleCard title="Fee/Tax Rebates & Deferrals" tip={"استرداد أو تأجيل رسوم بلدية وتصاريح ومدفوعات نظامية. حتى التأجيل له منفعة زمنية تُحسب بمعدل خصم 10%\nRebates or deferrals of municipal charges, permits, and regulatory fees. Even deferrals have time-value benefit at 10% discount"} titleAr="استرداد/تأجيل رسوم وضرائب" enabled={inc.feeRebates?.enabled} onToggle={() => upInc("feeRebates", { enabled: !inc.feeRebates?.enabled })} color="#06b6d4" value={pIR?.feeRebateTotal}>
        {(inc.feeRebates?.items || []).map((item, i) => (
          <div key={i} style={{ background: "#f8f9fb", borderRadius: 6, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={item.name || ""} onChange={e => updateFeeItem(i, { name: e.target.value })} placeholder={lang === "ar" ? "اسم الرسم" : "Fee name"} style={{ ...sideInputStyle, flex: 1, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }} />
              <button onClick={() => removeFeeItem(i)} style={{ ...btnSm, background: "#fef2f2", color: "#ef4444" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
              <div>
                <div style={{ color: "#6b7080", marginBottom: 2 }}>{lang === "ar" ? "النوع" : "Type"}</div>
                <select value={item.type || "rebate"} onChange={e => updateFeeItem(i, { type: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec", padding: "4px 6px" }}>
                  <option value="rebate">{lang === "ar" ? "استرداد" : "Rebate"}</option>
                  <option value="deferral">{lang === "ar" ? "تأجيل" : "Deferral"}</option>
                </select>
              </div>
              <div><div style={{ color: "#6b7080", marginBottom: 2 }}>{lang === "ar" ? "المبلغ" : "Amount"}</div><NI value={item.amount || 0} onChange={v => updateFeeItem(i, { amount: v })} /></div>
              <div><div style={{ color: "#6b7080", marginBottom: 2 }}>{lang === "ar" ? "السنة" : "Year"}</div><NI value={item.year || 1} onChange={v => updateFeeItem(i, { year: v })} /></div>
              {item.type === "deferral" && <div><div style={{ color: "#6b7080", marginBottom: 2 }}>{lang === "ar" ? "تأجيل (شهر)" : "Defer (mo)"}</div><NI value={item.deferralMonths || 12} onChange={v => updateFeeItem(i, { deferralMonths: v })} /></div>}
            </div>
          </div>
        ))}
        <button onClick={addFeeItem} style={{ ...btnS, width: "100%", background: "#f0fdf4", color: "#16a34a", padding: "8px", fontSize: 11, border: "1px solid #bbf7d0" }}>
          + {lang === "ar" ? "إضافة رسم" : "Add Fee Item"}
        </button>
      </ToggleCard>

    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

export default IncentivesView;
