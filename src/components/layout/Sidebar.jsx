// Extracted from App.jsx lines 3219-3265, 4472-4814
// Sidebar components: SidebarInput, Sec, Fld, Sel, ControlPanel, SidebarAdvisor

import { useState, useEffect, useRef, memo } from "react";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { btnS, sideInputStyle } from "../shared/styles";
import { benchmarkColor } from "../../data/benchmarks";
import { catL } from "../../data/translations";
import { calcNPV } from "../../engine/math";

// ── CURRENCIES constant ──
const CURRENCIES = [
  { value: "SAR", en: "SAR (ريال)", ar: "ريال سعودي (SAR)" },
  { value: "USD", en: "USD ($)", ar: "دولار (USD)" },
  { value: "AED", en: "AED (درهم)", ar: "درهم إماراتي (AED)" },
  { value: "EUR", en: "EUR (€)", ar: "يورو (EUR)" },
];

// ── SidebarInput: memo-wrapped input for sidebar fields ──
export const SidebarInput = memo(function SidebarInput({ value, onChange, type = "text", placeholder, step, style: sx }) {
  const [local, setLocal] = useState(String(value ?? ""));
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && !focused) {
      setLocal(String(value ?? ""));
    }
    prevValue.current = value;
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    if (type === "number") {
      const raw = local.replace(/,/g, "");
      const n = parseFloat(raw);
      onChange(isNaN(n) ? 0 : n);
    } else onChange(local);
  };

  const handleFocus = () => {
    setFocused(true);
    setLocal(String(value ?? ""));
  };

  const displayValue = (!focused && type === "number" && value !== "" && value !== 0 && value != null)
    ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })
    : local;

  return (
    <input
      ref={ref}
      className="sidebar-input"
      type="text"
      inputMode={type === "number" ? "decimal" : undefined}
      value={focused ? local : displayValue}
      onChange={e => setLocal(e.target.value)}
      onFocus={handleFocus}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { commit(); ref.current?.blur(); } }}
      style={{ ...sideInputStyle, ...sx }}
      placeholder={placeholder}
    />
  );
});

// ── Sec: Collapsible section wrapper ──
export function Sec({ title, children, def = false, filled, summary, globalExpand }) {
  const [open, setOpen] = useState(def);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  return (
    <div style={{ borderBottom: "1px solid #1e2230" }}>
      <button onClick={e => { e.preventDefault(); setOpen(!open); }} style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", color: open ? "#d0d4dc" : "#8b90a0", fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", textAlign: "start", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "color 0.15s" }}>
        {filled !== undefined && <span style={{ width: 7, height: 7, borderRadius: 4, background: filled ? "#16a34a" : "#3b4050", flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{title}</span>
        {!open && summary && <span style={{ fontSize: 9, color: "#4b5060", fontWeight: 400, letterSpacing: 0, textTransform: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>}
        <span style={{ color: "#3b4050", fontSize: 12, transition: "transform 0.2s", transform: open ? "rotate(0)" : "rotate(-90deg)" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 16px 14px" }}>{children}</div>}
    </div>
  );
}

// ── Fld: Field wrapper with label, hint, error ──
export function Fld({ label, children, hint, tip, error }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div style={{ marginBottom: 9, position: "relative" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: error ? "#ef4444" : "#7b8094", marginBottom: 3 }}>
        {label}
        {tip && <span onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)} style={{ cursor: "help", fontSize: 10, color: "#4b5060", lineHeight: 1 }}>ⓘ</span>}
      </label>
      {showTip && tip && <div style={{ position: "absolute", top: -4, insetInlineStart: 0, insetInlineEnd: 0, transform: "translateY(-100%)", background: "#1a1d23", color: "#d0d4dc", padding: "8px 10px", borderRadius: 6, fontSize: 10, lineHeight: 1.4, zIndex: 99, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", maxWidth: 260 }}>{tip.split("\n").map((line, i) => <div key={i} dir={/[\u0600-\u06FF]/.test(line) ? "rtl" : "ltr"} style={{ marginBottom: i === 0 ? 3 : 0 }}>{line}</div>)}</div>}
      <div style={error ? { borderRadius: 6, boxShadow: "0 0 0 1.5px #ef4444" } : undefined}>{children}</div>
      {error && <div style={{ fontSize: 9, color: "#ef4444", marginTop: 2, fontWeight: 500 }}>{error}</div>}
      {!error && hint && <div style={{ fontSize: 10, color: "#4b5060", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

// ── Sel: Select dropdown ──
export function Sel({ value, onChange, options, lang }) {
  return (
    <select value={value} onChange={e => { e.stopPropagation(); onChange(e.target.value); }} style={sideInputStyle}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o[lang || "en"] || o.en || o.label}</option>)}
    </select>
  );
}

// ── ControlPanel: Sidebar settings panel ──
export function ControlPanel({ project, up, t, lang, results, globalExpand, EducationalModal }) {
  if (!project) return null;
  const [eduModal, setEduModal] = useState(null);

  const cur = project.currency || "SAR";
  const ar = lang === "ar";

  return (<>
    {/* ── 1. GENERAL ── */}
    <Sec title={t.general} def={false} globalExpand={globalExpand} filled={!!(project.location && project.startYear)} summary={project.location ? `${project.startYear} | ${project.horizon}yr` : ""}>
      <Fld label={t.location} tip="موقع المشروع. للعرض والتقارير فقط\nProject location. For display and reports only"><SidebarInput value={project.location} onChange={v => up({ location: v })} placeholder="e.g. Jazan, Saudi Arabia" /></Fld>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Fld label={t.startYear} tip="سنة بداية المشروع. تُحدد توقيت CAPEX والإيرادات\nProject start year. Sets the timing for CAPEX and revenue"><SidebarInput type="number" value={project.startYear} onChange={v => up({ startYear: v })} /></Fld>
        <Fld label={t.horizon} tip="أفق النموذج بالسنوات (5-99). يحدد مدى حساب التدفقات النقدية\nModel horizon in years (5-99). Determines cash flow projection length" error={project.horizon < 1 ? (lang === "ar" ? "المدة يجب أن تكون 1 على الأقل" : "Horizon must be at least 1") : project.horizon > 99 ? (lang === "ar" ? "الحد الأقصى 99 سنة" : "Max 99 years") : null}><SidebarInput type="number" value={project.horizon} onChange={v => up({ horizon: v })} /></Fld>
      </div>
      <Fld label={t.currency} tip="عملة النموذج. الافتراضي ريال سعودي\nModel currency. Default is SAR"><Sel lang={lang} value={project.currency} onChange={v => up({ currency: v })} options={CURRENCIES} /></Fld>
    </Sec>

    {/* ── 4. ASSUMPTIONS (CAPEX + Revenue merged) ── */}
    <Sec title={ar ? "افتراضات التكاليف والإيرادات" : "Cost & Revenue Assumptions"} globalExpand={globalExpand} filled={project.softCostPct > 0 || project.rentEscalation > 0} summary={`${project.softCostPct}% soft | ${project.rentEscalation}% esc`}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Fld label={t.softCost} tip="تشمل التصميم، الدراسات، الإشراف، التصاريح وإدارة المشروع. عادة 8-15%\nDesign, studies, supervision, permits, project management. Usually 8-15%" error={project.softCostPct < 0 ? (lang === "ar" ? "لا يمكن أن تكون سالبة" : "Cannot be negative") : project.softCostPct > 50 ? (lang === "ar" ? "قيمة عالية جداً (>50%)" : "Very high value (>50%)") : null}><SidebarInput type="number" value={project.softCostPct} onChange={v => up({ softCostPct: v })} /></Fld>
        <Fld label={t.contingency} tip="هامش احتياطي لزيادات الأسعار أو تغييرات التنفيذ. عادة 5-10%\nReserve for cost overruns or scope changes. Usually 5-10%" error={project.contingencyPct < 0 ? (lang === "ar" ? "لا يمكن أن تكون سالبة" : "Cannot be negative") : project.contingencyPct > 30 ? (lang === "ar" ? "قيمة عالية جداً (>30%)" : "Very high value (>30%)") : null}><SidebarInput type="number" value={project.contingencyPct} onChange={v => up({ contingencyPct: v })} /></Fld>
      </div>
      <Fld label={t.rentEsc} tip="الزيادة السنوية المفترضة في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAssumed annual rent increase. Prime areas 2-5%, secondary 0.5-2%"><SidebarInput type="number" value={project.rentEscalation} onChange={v => up({ rentEscalation: v })} /></Fld>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Fld label={t.defEfficiency} tip="نسبة المساحة المدرة للدخل من GFA. مكاتب 75-85%، تجزئة 80-90%\nIncome-generating share of GFA. Offices 75-85%, Retail 80-90%" error={project.defaultEfficiency < 0 ? (lang === "ar" ? "لا يمكن أن تكون سالبة" : "Cannot be negative") : project.defaultEfficiency > 100 ? (lang === "ar" ? "الحد الأقصى 100%" : "Max 100%") : null}><SidebarInput type="number" value={project.defaultEfficiency} onChange={v => up({ defaultEfficiency: v })} /></Fld>
        <Fld label={t.defLeaseRate} tip="معدل الإيجار الافتراضي للأصول الجديدة بالريال/م²/سنة\nDefault lease rate for new assets in SAR/sqm/year"><SidebarInput type="number" value={project.defaultLeaseRate} onChange={v => up({ defaultLeaseRate: v })} /></Fld>
      </div>
      <Fld label={t.defCostSqm} tip="تكلفة البناء الافتراضية للأصول الجديدة بالريال/م²\nDefault construction cost for new assets in SAR/sqm"><SidebarInput type="number" value={project.defaultCostPerSqm} onChange={v => up({ defaultCostPerSqm: v })} /></Fld>
    </Sec>
    {eduModal && EducationalModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </>);
}

// ── SidebarAdvisor is too large to include here — it will be imported from App.jsx ──
// SidebarAdvisor stays in App.jsx during Phase 1 (will be extracted in a later pass)

export default ControlPanel;
