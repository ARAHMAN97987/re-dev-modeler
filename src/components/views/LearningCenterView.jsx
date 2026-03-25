// Extracted from App.jsx lines 6321-6336, 8562-9352
// Tip, HelpLink, EducationalModal, LearningCenterView + Academy data

import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../shared/hooks";
import { EDUCATIONAL_CONTENT } from "../../data/educational-content";

// ── Tip: Tooltip component ──
function Tip({text,children}) {
  const isMobile = useIsMobile();
  const [show,setShow]=useState(false);
  const ref=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  const onEnter=()=>{
    if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+6,left:r.left+r.width/2});}
    setShow(true);
  };
  useEffect(()=>{ if(show && isMobile){ const t=setTimeout(()=>setShow(false),4000); return ()=>clearTimeout(t); } },[show,isMobile]);
  return <span style={{display:"inline-flex",alignItems:"center"}}>
    {children}
    <span ref={ref} onMouseEnter={isMobile?undefined:onEnter} onMouseLeave={isMobile?undefined:()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{cursor:"help",fontSize:isMobile?13:10,color:"#9ca3af",marginInlineStart:3,lineHeight:1,padding:isMobile?"4px":0}}>ⓘ</span>
    {show&&<>{isMobile&&<div onClick={()=>setShow(false)} style={{position:"fixed",inset:0,zIndex:99998}} />}<div style={{position:"fixed",top:pos.top,...(document.dir==="rtl"?{right:Math.max(10,Math.min(window.innerWidth-pos.left-140,window.innerWidth-300))}:{left:Math.max(10,Math.min(pos.left-140,window.innerWidth-300))}),width:isMobile?Math.min(280,window.innerWidth-24):280,background:"#1a1d23",color:"#d0d4dc",padding:isMobile?"12px 14px":"10px 13px",borderRadius:8,fontSize:isMobile?12:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start"}}>{text.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?4:0}}>{line}</div>)}</div></>}
  </span>;
}

// ── HelpLink: Inline educational link ──
function HelpLink({ contentKey, lang, onOpen, label: customLabel }) {
  const ar = lang === "ar";
  const label = customLabel || (ar ? "ما الفرق؟" : "What's the difference?");
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(contentKey); }}
      style={{
        fontSize: 11,
        color: "#2563eb",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 3,
        cursor: "pointer",
        fontWeight: 500,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "color 0.15s",
      }}
      onMouseEnter={e => { e.target.style.color = "#1d4ed8"; }}
      onMouseLeave={e => { e.target.style.color = "#2563eb"; }}
    >
      {label}
    </span>
  );
}

// ── EducationalModal: Full educational content modal ──
function EducationalModal({ contentKey, lang, onClose }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const content = EDUCATIONAL_CONTENT[contentKey]?.[ar ? "ar" : "en"];
  const [activeTab, setActiveTab] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!content) return null;

  const tab = content.tabs[activeTab];

  const renderBlock = (block, i) => {
    if (block.type === "heading") {
      return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23", marginTop: i === 0 ? 0 : 18, marginBottom: 6 }}>{block.text}</div>;
    }
    if (block.type === "text") {
      return <div key={i} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.75, marginBottom: 6 }}>{block.text}</div>;
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 8 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 12.5, color: "#374151", lineHeight: 1.65 }}>
              <span style={{ color: "#9ca3af", fontSize: 8, marginTop: 6, flexShrink: 0 }}>●</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (<>
    {/* Overlay */}
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(2px)" }} />

    {/* Modal */}
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      width: isMobile ? "96vw" : 620, maxWidth: "96vw", maxHeight: "88vh",
      background: "#fff", borderRadius: 16,
      boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
      zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
      direction: ar ? "rtl" : "ltr",
    }}>

      {/* Header */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e5e7ec", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>📘</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1d23" }}>{content.title}</div>
          <div style={{ fontSize: 12, color: "#6b7080", marginTop: 3, lineHeight: 1.5 }}>{content.intro}</div>
        </div>
        <button onClick={onClose} style={{ background: "#f0f1f5", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7080", fontFamily: "inherit", flexShrink: 0 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 0, borderBottom: "1px solid #e5e7ec", flexShrink: 0,
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {content.tabs.map((t, i) => {
          const isActive = i === activeTab;
          return (
            <button key={t.id} onClick={() => setActiveTab(i)} style={{
              padding: isMobile ? "10px 12px" : "12px 18px",
              background: "none", border: "none", borderBottom: isActive ? "2.5px solid #2563eb" : "2.5px solid transparent",
              fontSize: isMobile ? 11 : 12, fontWeight: isActive ? 700 : 500,
              color: isActive ? "#2563eb" : "#6b7080",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "all 0.15s", flexShrink: 0,
            }}>
              <span style={{ marginInlineEnd: 5 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 18px" : "20px 24px" }}>
        {tab && tab.content.map(renderBlock)}
      </div>

      {/* Footer CTA */}
      {content.cta && (
        <div style={{ padding: "12px 22px", borderTop: "1px solid #e5e7ec", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          {window.__zanOpenAcademy ? (
            <button onClick={() => { onClose(); window.__zanOpenAcademy(contentKey); }} style={{
              background: "none", border: "none", color: "#C8A96E", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
            }}>📚 {ar ? "اقرأ المزيد في الأكاديمية" : "Read more in Academy"}</button>
          ) : <span />}
          <button onClick={onClose} style={{
            padding: "9px 28px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.target.style.background = "#1d4ed8"; }}
          onMouseLeave={e => { e.target.style.background = "#2563eb"; }}
          >{content.cta}</button>
        </div>
      )}
    </div>
  </>);
}

// ── Academy Configuration Data ──
const ACADEMY_TERM_REGISTRY = {
  "IRR": { key: "financialMetrics", tab: 0 },
  "NPV": { key: "financialMetrics", tab: 1 },
  "MOIC": { key: "financialMetrics", tab: 2 },
  "DSCR": { key: "financialMetrics", tab: 3 },
  "Leverage": { key: "financialMetrics", tab: 4 },
  "الرافعة المالية": { key: "financialMetrics", tab: 4 },
  "المرابحة": { key: "islamicFinance", tab: 0 },
  "Murabaha": { key: "islamicFinance", tab: 0 },
  "الإجارة": { key: "islamicFinance", tab: 1 },
  "Ijara": { key: "islamicFinance", tab: 1 },
  "Cap Rate": { key: "exitStrategy", tab: 1 },
  "معدل الرسملة": { key: "exitStrategy", tab: 1 },
  "شلال التوزيعات": { key: "waterfallConcepts", tab: 0 },
  "Waterfall": { key: "waterfallConcepts", tab: 0 },
  "العائد المفضل": { key: "waterfallConcepts", tab: 1 },
  "Preferred Return": { key: "waterfallConcepts", tab: 1 },
  "GP Catch-up": { key: "waterfallConcepts", tab: 2 },
  "Profit Split": { key: "waterfallConcepts", tab: 3 },
  "SAIBOR": { key: "islamicFinance", tab: 0 },
  "LTV": { key: "financingMode", tab: 2 },
};

const ACADEMY_PATHS = [
  {
    id: "quickstart",
    icon: "🚀",
    title: { ar: "البداية السريعة", en: "Quick Start" },
    desc: { ar: "ابدأ هنا: دليل عملي خطوة بخطوة لبناء أول نموذج مالي لك", en: "Start here: step-by-step practical guide to building your first financial model" },
    sections: ["quickStart", "projectTypes"],
    color: "#f59e0b",
  },
  {
    id: "foundations",
    icon: "🧱",
    title: { ar: "أساسيات النمذجة المالية", en: "Financial Modeling Foundations" },
    desc: { ar: "المفاهيم الأساسية: المقاييس المالية، أنواع الأرض، وتحليل السيناريوهات", en: "Core concepts: financial metrics, land types, and scenario analysis" },
    sections: ["financialMetrics", "landType", "scenarioAnalysis"],
    color: "#2563eb",
  },
  {
    id: "structuring",
    icon: "🏗",
    title: { ar: "هيكلة التمويل والاستثمار", en: "Financing & Investment Structuring" },
    desc: { ar: "خيارات التمويل البنكي، الإسلامي، الصناديق، والحوافز الحكومية", en: "Bank debt, Islamic finance, fund structures, and government incentives" },
    sections: ["financingMode", "islamicFinance", "govIncentives", "waterfallConcepts"],
    color: "#8b5cf6",
  },
  {
    id: "exits",
    icon: "🎯",
    title: { ar: "التخارج والتقديم للبنك", en: "Exit & Bank Submission" },
    desc: { ar: "استراتيجيات التخارج، حساب العوائد، وتجهيز حزمة البنك", en: "Exit strategies, return calculations, and bank pack preparation" },
    sections: ["exitStrategy", "bankPack", "financialMetrics"],
    color: "#16a34a",
  },
];

const ACADEMY_RELATED = {
  financingMode: ["islamicFinance", "financialMetrics", "waterfallConcepts"],
  landType: ["financingMode", "exitStrategy", "projectTypes"],
  exitStrategy: ["financialMetrics", "waterfallConcepts", "bankPack"],
  waterfallConcepts: ["financingMode", "exitStrategy", "financialMetrics"],
  islamicFinance: ["financingMode", "govIncentives", "bankPack"],
  govIncentives: ["financingMode", "islamicFinance", "scenarioAnalysis"],
  financialMetrics: ["exitStrategy", "waterfallConcepts", "bankPack"],
  scenarioAnalysis: ["financialMetrics", "financingMode", "bankPack"],
  projectTypes: ["landType", "financingMode", "quickStart"],
  bankPack: ["financialMetrics", "scenarioAnalysis", "exitStrategy"],
  quickStart: ["projectTypes", "financingMode", "landType"],
};

const ACADEMY_SECTION_ICONS = {
  financingMode: "🏦",
  landType: "🏗",
  exitStrategy: "🚪",
  waterfallConcepts: "🌊",
  islamicFinance: "☪️",
  govIncentives: "🏛",
  financialMetrics: "📊",
  scenarioAnalysis: "🔄",
  projectTypes: "🏘",
  bankPack: "📋",
  quickStart: "🚀",
};

// ── Demo Projects for Academy ──
const ACADEMY_DEMO_PROJECTS = [
  {
    id: "demo_self_residential",
    icon: "🏘",
    title: { ar: "مجمع سكني - تمويل ذاتي", en: "Residential - Self Funded" },
    desc: { ar: "مشروع سكني بسيط بتمويل ذاتي كامل. أبسط سيناريو للتعلم.", en: "Simple residential project, fully self-funded. Easiest scenario to learn." },
    tags: ["self", "purchase", "hold"],
    overrides: {
      name: "", landType: "purchase", landPurchasePrice: 15000000, landArea: 10000,
      finMode: "self", exitStrategy: "hold", horizon: 25, location: "الرياض - حي النرجس",
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 24, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Residential", name: "برج سكني", code: "T1", gfa: 18000, footprint: 2500, plotArea: 5000, revType: "Lease", efficiency: 85, leaseRate: 900, escalation: 1.0, rampUpYears: 2, stabilizedOcc: 90, costPerSqm: 3000, constrStart: 1, constrDuration: 24, opEbitda: 0 },
        { phase: "Phase 1", category: "Amenity", name: "مرافق خدمية", code: "AM", gfa: 1500, footprint: 1200, plotArea: 2000, revType: "Lease", efficiency: 50, leaseRate: 400, escalation: 0.5, rampUpYears: 1, stabilizedOcc: 80, costPerSqm: 2000, constrStart: 1, constrDuration: 18, opEbitda: 0 },
      ],
    },
  },
  {
    id: "demo_bank_commercial",
    icon: "🏢",
    title: { ar: "مركز تجاري - تمويل بنكي", en: "Commercial Center - Bank Debt" },
    desc: { ar: "مول تجاري مع تمويل بنكي. تعلّم كيف يعمل DSCR وخدمة الدين.", en: "Shopping mall with bank financing. Learn how DSCR and debt service work." },
    tags: ["debt", "lease", "sale"],
    overrides: {
      name: "", landType: "lease", landArea: 15000, landRentAnnual: 3000000, landRentGrace: 3,
      finMode: "debt", debtAllowed: true, maxLtvPct: 65, financeRate: 7, loanTenor: 10, debtGrace: 3, upfrontFeePct: 1,
      exitStrategy: "sale", exitMultiple: 12, exitCostPct: 2, exitYear: 0,
      horizon: 30, location: "جدة - كورنيش",
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 30, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Retail", name: "مول تجاري", code: "RM", gfa: 22000, footprint: 11000, plotArea: 12000, revType: "Lease", efficiency: 80, leaseRate: 2200, escalation: 1.0, rampUpYears: 3, stabilizedOcc: 88, costPerSqm: 4200, constrStart: 1, constrDuration: 30, opEbitda: 0 },
        { phase: "Phase 1", category: "Infrastructure", name: "مواقف", code: "PK", gfa: 6000, footprint: 3000, plotArea: 3000, revType: "Lease", efficiency: 0, leaseRate: 0, escalation: 0, rampUpYears: 0, stabilizedOcc: 100, costPerSqm: 1500, constrStart: 1, constrDuration: 18, opEbitda: 0 },
      ],
    },
  },
  {
    id: "demo_fund_hotel",
    icon: "🏨",
    title: { ar: "فندق 5 نجوم - صندوق استثماري", en: "5-Star Hotel - Investment Fund" },
    desc: { ar: "فندق فاخر بهيكل صندوق GP/LP مع شلال توزيعات. أعقد سيناريو.", en: "Luxury hotel with GP/LP fund structure and waterfall. Most complex scenario." },
    tags: ["fund", "lease", "sale"],
    overrides: {
      name: "", landType: "lease", landArea: 12000, landRentAnnual: 4500000, landRentGrace: 5,
      landCapitalize: true, landCapRate: 1200, landCapTo: "gp",
      finMode: "fund", vehicleType: "fund", debtAllowed: true, maxLtvPct: 60, financeRate: 6.5, loanTenor: 10, debtGrace: 4, upfrontFeePct: 0.75,
      subscriptionFeePct: 2, annualMgmtFeePct: 1.5, developerFeePct: 10, structuringFeePct: 1, custodyFeeAnnual: 100000,
      exitStrategy: "sale", exitMultiple: 14, exitCostPct: 2.5, exitYear: 0,
      prefReturnPct: 12, gpCatchup: true, carryPct: 25, lpProfitSplitPct: 75,
      horizon: 30, location: "الرياض - KAFD",
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 42, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Hospitality", name: "فندق 5 نجوم", code: "H5", gfa: 25000, footprint: 5000, plotArea: 12000, revType: "Operating", efficiency: 0, leaseRate: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 100, costPerSqm: 12000, constrStart: 1, constrDuration: 42, opEbitda: 52000000 },
      ],
    },
  },
  {
    id: "demo_mixed_waterfront",
    icon: "🌊",
    title: { ar: "واجهة بحرية متكاملة", en: "Waterfront Mixed-Use" },
    desc: { ar: "مشروع مختلط: مول + فندق + مكاتب + سكني + مارينا. النموذج الأشمل.", en: "Mixed project: mall + hotel + offices + residential + marina. The most comprehensive model." },
    tags: ["fund", "lease", "sale"],
    overrides: {
      name: "", landType: "lease", landArea: 55000, landRentAnnual: 8000000, landRentGrace: 5, landRentTerm: 50,
      landCapitalize: true, landCapRate: 1000, landCapTo: "gp",
      finMode: "fund", vehicleType: "fund", debtAllowed: true, maxLtvPct: 60, financeRate: 6.5, loanTenor: 8, debtGrace: 3, upfrontFeePct: 0.5,
      subscriptionFeePct: 2, annualMgmtFeePct: 1.5, developerFeePct: 10, structuringFeePct: 1,
      exitStrategy: "sale", exitMultiple: 10, exitCostPct: 2, exitYear: 0,
      prefReturnPct: 15, gpCatchup: true, carryPct: 30, lpProfitSplitPct: 70,
      horizon: 50, location: "جازان - الواجهة البحرية",
      phases: [
        { name: "Phase 1", startYearOffset: 1, completionMonth: 36, footprint: 0 },
        { name: "Phase 2", startYearOffset: 3, completionMonth: 72, footprint: 0 },
      ],
      assets: [
        { phase: "Phase 1", category: "Retail", name: "Marina Mall", code: "C1", gfa: 31000, footprint: 20000, plotArea: 28000, revType: "Lease", efficiency: 80, leaseRate: 2100, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 95, costPerSqm: 3900, constrStart: 2, constrDuration: 36, opEbitda: 0 },
        { phase: "Phase 1", category: "Hospitality", name: "فندق 4 نجوم", code: "H1", gfa: 16000, footprint: 2000, plotArea: 5000, revType: "Operating", efficiency: 0, leaseRate: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 100, costPerSqm: 8000, constrStart: 2, constrDuration: 36, opEbitda: 14000000 },
        { phase: "Phase 2", category: "Office", name: "برج مكاتب", code: "O1", gfa: 16000, footprint: 2700, plotArea: 5500, revType: "Lease", efficiency: 90, leaseRate: 900, escalation: 0.75, rampUpYears: 2, stabilizedOcc: 88, costPerSqm: 2600, constrStart: 3, constrDuration: 36, opEbitda: 0 },
        { phase: "Phase 2", category: "Residential", name: "أبراج سكنية", code: "R1", gfa: 14000, footprint: 2000, plotArea: 4000, revType: "Lease", efficiency: 85, leaseRate: 800, escalation: 0.75, rampUpYears: 2, stabilizedOcc: 90, costPerSqm: 2800, constrStart: 3, constrDuration: 30, opEbitda: 0 },
      ],
    },
  },
  {
    id: "demo_incentives",
    icon: "🏛",
    title: { ar: "مشروع مدعوم حكومياً", en: "Government-Supported Project" },
    desc: { ar: "مشروع يستفيد من حوافز حكومية: دعم CAPEX، إعفاء إيجار أرض، دعم تمويل.", en: "Project benefiting from government incentives: CAPEX grant, land rebate, finance support." },
    tags: ["debt", "lease", "hold"],
    overrides: {
      name: "", landType: "lease", landArea: 20000, landRentAnnual: 2000000, landRentGrace: 5,
      finMode: "debt", debtAllowed: true, maxLtvPct: 70, financeRate: 7, loanTenor: 10, debtGrace: 3,
      exitStrategy: "hold", horizon: 30, location: "جازان - المنطقة الصناعية",
      incentives: {
        capexGrant: { enabled: true, grantPct: 25, maxCap: 30000000, phases: [], timing: "construction" },
        financeSupport: { enabled: true, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation", softLoanAmount: 0, softLoanTenor: 10, softLoanGrace: 3, phases: [] },
        landRentRebate: { enabled: true, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 5, phases: [] },
        feeRebates: { enabled: false, items: [], phases: [] },
      },
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 24, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Retail", name: "مركز تجاري", code: "RM", gfa: 15000, footprint: 8000, plotArea: 12000, revType: "Lease", efficiency: 80, leaseRate: 1800, escalation: 1.0, rampUpYears: 3, stabilizedOcc: 85, costPerSqm: 3500, constrStart: 1, constrDuration: 24, opEbitda: 0 },
        { phase: "Phase 1", category: "Office", name: "مكاتب", code: "OF", gfa: 8000, footprint: 2000, plotArea: 4000, revType: "Lease", efficiency: 88, leaseRate: 800, escalation: 0.75, rampUpYears: 2, stabilizedOcc: 80, costPerSqm: 2800, constrStart: 1, constrDuration: 24, opEbitda: 0 },
      ],
    },
  },
];

// ── LearningCenterView ──
function LearningCenterView({ lang, onBack, onCreateDemo, publicMode, onLangToggle }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState(null);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [navStack, setNavStack] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const dir = ar ? "rtl" : "ltr";

  const navigateTo = (contentKey, tabIndex = 0) => {
    if (activeSection) {
      setNavStack(prev => [...prev, { key: activeSection, tab: activeTabIdx }]);
    }
    setActiveSection(contentKey);
    setActiveTabIdx(tabIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBackInStack = () => {
    if (navStack.length > 0) {
      const prev = navStack[navStack.length - 1];
      setNavStack(s => s.slice(0, -1));
      setActiveSection(prev.key);
      setActiveTabIdx(prev.tab);
    } else {
      setActiveSection(null);
      setActiveTabIdx(0);
    }
  };

  const goHome = () => {
    setActiveSection(null);
    setActiveTabIdx(0);
    setNavStack([]);
    setSearchQuery("");
  };

  // Cross-link text renderer
  const renderWithLinks = (text) => {
    if (!text || typeof text !== "string") return text;
    const terms = Object.keys(ACADEMY_TERM_REGISTRY).sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const entry = ACADEMY_TERM_REGISTRY[part];
      if (entry && entry.key !== activeSection) {
        return (
          <span key={i} onClick={(e) => { e.stopPropagation(); navigateTo(entry.key, entry.tab); }}
            style={{ color: "#2563eb", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, cursor: "pointer", fontWeight: 600 }}
          >{part}</span>
        );
      }
      return part;
    });
  };

  const renderBlock = (block, i) => {
    if (block.type === "heading") {
      return <div key={i} style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: "#0B2341", marginTop: i === 0 ? 0 : (isMobile ? 16 : 22), marginBottom: 6, fontFamily: "'Tajawal',sans-serif" }}>{renderWithLinks(block.text)}</div>;
    }
    if (block.type === "text") {
      return <div key={i} style={{ fontSize: isMobile ? 12.5 : 13.5, color: "#374151", lineHeight: 1.8, marginBottom: 6 }}>{renderWithLinks(block.text)}</div>;
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 8 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: isMobile ? 12.5 : 13.5, color: "#374151", lineHeight: 1.7 }}>
              <span style={{ color: "#2EC4B6", fontSize: 7, marginTop: 7, flexShrink: 0 }}>●</span>
              <span>{renderWithLinks(item)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Search
  const searchResults = (() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const results = [];
    const langKey = ar ? "ar" : "en";
    Object.keys(EDUCATIONAL_CONTENT).forEach(key => {
      const sec = EDUCATIONAL_CONTENT[key]?.[langKey];
      if (!sec) return;
      const titleMatch = sec.title?.toLowerCase().includes(q);
      const introMatch = sec.intro?.toLowerCase().includes(q);
      sec.tabs?.forEach((tab, tabIdx) => {
        const labelMatch = tab.label?.toLowerCase().includes(q);
        const contentMatch = tab.content?.some(b =>
          (b.text && b.text.toLowerCase().includes(q)) ||
          (b.items && b.items.some(it => it.toLowerCase().includes(q)))
        );
        if (titleMatch || introMatch || labelMatch || contentMatch) {
          if (!results.find(r => r.key === key && r.tabIdx === tabIdx)) {
            results.push({ key, tabIdx, title: sec.title, tabLabel: sec.tabs?.[tabIdx]?.label, icon: ACADEMY_SECTION_ICONS[key] });
          }
        }
      });
    });
    return results;
  })();

  const allSectionKeys = Object.keys(EDUCATIONAL_CONTENT);

  // ── ARTICLE VIEW ──
  if (activeSection) {
    const content = EDUCATIONAL_CONTENT[activeSection]?.[ar ? "ar" : "en"];
    if (!content) { setActiveSection(null); return null; }
    const tab = content.tabs[activeTabIdx];
    const related = ACADEMY_RELATED[activeSection] || [];
    const parentStack = navStack.length > 0 ? navStack[navStack.length - 1] : null;

    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans','IBM Plex Sans Arabic','Segoe UI',system-ui,sans-serif", color: "#1a1d23" }}>
        {/* Top Bar */}
        <div style={{ background: "#0B2341", padding: isMobile ? "10px 12px" : "16px 32px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 12 }}>
            <button onClick={goBackInStack} style={{ background: "rgba(46,196,182,0.12)", border: "1px solid rgba(46,196,182,0.25)", borderRadius: 8, padding: isMobile ? "6px 10px" : "7px 14px", color: "#2EC4B6", fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span>{ar ? "→" : "←"}</span>
              {isMobile ? (parentStack ? (ar ? "رجوع" : "Back") : "📚") : (parentStack ? (ar ? "ارجع" : "Back") : (ar ? "الأكاديمية" : "Academy"))}
            </button>
            {parentStack && !isMobile && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                {ar ? "من:" : "from:"} {EDUCATIONAL_CONTENT[parentStack.key]?.[ar ? "ar" : "en"]?.title}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {!isMobile && <button onClick={goHome} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>📚 {ar ? "الرئيسية" : "Home"}</button>}
            {publicMode && onLangToggle && <button onClick={onLangToggle} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 10px", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{ar ? "EN" : "عربي"}</button>}
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, flexShrink: 0 }}>{publicMode ? (ar ? "تسجيل →" : "Sign Up") : (ar ? "✕" : "✕")}</button>
          </div>
        </div>

        {/* Breadcrumbs */}
        {navStack.length > 0 && (
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7ec", padding: isMobile ? "8px 16px" : "8px 32px", display: "flex", alignItems: "center", gap: 6, overflowX: "auto", flexWrap: "nowrap" }}>
            <span onClick={goHome} style={{ fontSize: 11, color: "#2563eb", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>📚 {ar ? "الأكاديمية" : "Academy"}</span>
            {navStack.map((item, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span style={{ color: "#d1d5db", fontSize: 10 }}>{ar ? "←" : "→"}</span>
                <span onClick={() => { setNavStack(s => s.slice(0, i)); setActiveSection(item.key); setActiveTabIdx(item.tab); }}
                  style={{ fontSize: 11, color: "#2563eb", cursor: "pointer", fontWeight: 500 }}>
                  {EDUCATIONAL_CONTENT[item.key]?.[ar ? "ar" : "en"]?.title}
                </span>
              </span>
            ))}
            <span style={{ color: "#d1d5db", fontSize: 10 }}>{ar ? "←" : "→"}</span>
            <span style={{ fontSize: 11, color: "#6b7080", fontWeight: 600, whiteSpace: "nowrap" }}>{content.title}</span>
          </div>
        )}

        <div style={{ maxWidth: 780, margin: "0 auto", padding: isMobile ? "16px 14px" : "32px 24px" }}>
          {/* Article Header */}
          <div style={{ marginBottom: isMobile ? 20 : 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: 8 }}>
              <span style={{ fontSize: isMobile ? 22 : 28, flexShrink: 0 }}>{ACADEMY_SECTION_ICONS[activeSection] || "📘"}</span>
              <h1 style={{ fontSize: isMobile ? 18 : 28, fontWeight: 900, color: "#0B2341", fontFamily: "'Tajawal',sans-serif", margin: 0, lineHeight: 1.3 }}>{content.title}</h1>
            </div>
            <p style={{ fontSize: isMobile ? 12 : 14, color: "#6b7080", lineHeight: 1.7, margin: 0 }}>{content.intro}</p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7ec", marginBottom: 24, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {content.tabs.map((t, i) => {
              const isAct = i === activeTabIdx;
              return (
                <button key={t.id} onClick={() => setActiveTabIdx(i)} style={{
                  padding: isMobile ? "10px 12px" : "14px 22px",
                  background: "none", border: "none",
                  borderBottom: isAct ? "3px solid #2EC4B6" : "3px solid transparent",
                  fontSize: isMobile ? 11 : 13, fontWeight: isAct ? 700 : 500,
                  color: isAct ? "#0B2341" : "#6b7080",
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  transition: "all 0.15s", flexShrink: 0, marginBottom: -2,
                }}>
                  <span style={{ marginInlineEnd: 4 }}>{t.icon}</span>{t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{ background: "#fff", borderRadius: isMobile ? 10 : 12, border: "1px solid #e5e7ec", padding: isMobile ? "16px 14px" : "28px 32px", marginBottom: isMobile ? 20 : 32, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {tab && tab.content.map(renderBlock)}
          </div>

          {/* Related Topics */}
          {related.length > 0 && (
            <div style={{ marginBottom: isMobile ? 24 : 40 }}>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: "#0B2341", marginBottom: 10, fontFamily: "'Tajawal',sans-serif" }}>
                {ar ? "📎 مواضيع ذات صلة" : "📎 Related Topics"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {related.filter(k => EDUCATIONAL_CONTENT[k]).map(k => {
                  const s2 = EDUCATIONAL_CONTENT[k][ar ? "ar" : "en"];
                  return (
                    <button key={k} onClick={() => navigateTo(k, 0)} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: isMobile ? "8px 12px" : "10px 16px", background: "#fff", border: "1px solid #e5e7ec",
                      borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s", fontSize: isMobile ? 11 : 12, fontWeight: 500, color: "#374151",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#2EC4B6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(46,196,182,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7ec"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <span>{ACADEMY_SECTION_ICONS[k]}</span>
                      <span>{s2?.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PATHS OVERVIEW (HOME) ──
  return (
    <div dir={dir} style={{ minHeight: "100vh", background: isMobile ? "linear-gradient(180deg, #0B2341 0%, #0B2341 280px, #f8f9fb 280px)" : "linear-gradient(180deg, #0B2341 0%, #0B2341 340px, #f8f9fb 340px)", fontFamily: "'DM Sans','IBM Plex Sans Arabic','Segoe UI',system-ui,sans-serif", color: "#1a1d23" }}>
      {/* Hero Header */}
      <div style={{ padding: isMobile ? "16px 14px 56px" : "24px 32px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 20 : 40, position: "relative", zIndex: 1 }}>
          <button onClick={onBack} style={{ background: "rgba(46,196,182,0.12)", border: "1px solid rgba(46,196,182,0.25)", borderRadius: 8, padding: isMobile ? "6px 10px" : "7px 14px", color: "#2EC4B6", fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            {publicMode ? (ar ? "→ تسجيل" : "← Sign In") : (ar ? "→ المشاريع" : "← Projects")}
          </button>
          {publicMode && onLangToggle && (
            <button onClick={onLangToggle} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {ar ? "EN" : "عربي"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: "#fff", fontFamily: "'Tajawal',sans-serif" }}>{ar?"حصيف":"Haseef"}</span>
            {!isMobile && <>
              <span style={{ width: 1, height: 18, background: "rgba(46,196,182,0.35)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.3 }}>{ar ? "النمذجة" : "Financial"}<br />{ar ? "المالية" : "Modeler"}</span>
            </>}
          </div>
        </div>
        {/* Title */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "inline-block", padding: "6px 18px", background: "rgba(46,196,182,0.1)", border: "1px solid rgba(46,196,182,0.2)", borderRadius: 20, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "#2EC4B6", fontWeight: 600 }}>📚 {ar ? "أكاديمية حصيف المالية" : "Haseef Academy"}</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 22 : 36, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 10, fontFamily: "'Tajawal',sans-serif" }}>
            {ar ? "تعلّم النمذجة المالية العقارية" : "Learn Real Estate Financial Modeling"}
          </h1>
          <p style={{ fontSize: isMobile ? 12 : 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            {ar ? "محتوى عملي مصمم للسوق السعودي." : "Practical content designed for the Saudi market."}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: isMobile ? "-24px auto 0" : "-40px auto 0", padding: isMobile ? "0 14px 40px" : "0 24px 60px", position: "relative", zIndex: 1 }}>
        {/* Search */}
        <div style={{ marginBottom: isMobile ? 24 : 32 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", padding: isMobile ? "2px 2px 2px 12px" : "4px 4px 4px 16px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, color: "#9ca3af", flexShrink: 0 }}>🔍</span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={ar ? (isMobile ? "ابحث... IRR, المرابحة" : "ابحث عن مفهوم... مثال: IRR, المرابحة, شلال التوزيعات") : (isMobile ? "Search... IRR, DSCR" : "Search concepts... e.g. IRR, Murabaha, Waterfall")}
              style={{ flex: 1, border: "none", outline: "none", fontSize: isMobile ? 13 : 13, color: "#374151", fontFamily: "inherit", padding: isMobile ? "11px 0" : "12px 0", background: "transparent", minWidth: 0 }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "#f0f1f5", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 11, color: "#6b7080", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✕</button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7080", marginBottom: 12 }}>{ar ? `${searchResults.length} نتيجة` : `${searchResults.length} results`}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => navigateTo(r.key, r.tabIdx)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 18px", background: "#fff", border: "1px solid #e5e7ec",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                  transition: "all 0.15s", width: "100%",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2EC4B6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(46,196,182,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7ec"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0B2341" }}>{r.title}</div>
                    {r.tabLabel && <div style={{ fontSize: 11, color: "#6b7080", marginTop: 2 }}>{r.tabLabel}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {searchResults && searchResults.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 13 }}>{ar ? "لا توجد نتائج. جرّب كلمات مختلفة." : "No results. Try different keywords."}</div>
        )}

        {/* Learning Paths */}
        {!searchQuery && ACADEMY_PATHS.map((path, pathIdx) => (
          <div key={path.id} style={{ marginBottom: isMobile ? 28 : 36 }}>
            <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 10, marginBottom: 12, background: isMobile ? "#fff" : "transparent", padding: isMobile ? "12px 14px" : 0, borderRadius: isMobile ? 10 : 0, border: isMobile ? "1px solid #e5e7ec" : "none", boxShadow: isMobile ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}>
              <span style={{ fontSize: isMobile ? 18 : 22, flexShrink: 0, marginTop: isMobile ? 2 : 0 }}>{path.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: "#0B2341", fontFamily: "'Tajawal',sans-serif", lineHeight: 1.3 }}>{ar ? path.title.ar : path.title.en}</div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#6b7080", marginTop: 2, lineHeight: 1.5 }}>{ar ? path.desc.ar : path.desc.en}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(path.sections.length, 3)}, 1fr)`, gap: 12 }}>
              {path.sections.filter(k => EDUCATIONAL_CONTENT[k]).map((sectionKey, idx) => {
                const sec = EDUCATIONAL_CONTENT[sectionKey][ar ? "ar" : "en"];
                if (!sec) return null;
                const tabCount = sec.tabs?.length || 0;
                return (
                  <button key={sectionKey + "-" + idx} onClick={() => navigateTo(sectionKey, 0)} style={{
                    background: "#fff", border: "1px solid #e5e7ec", borderRadius: isMobile ? 10 : 12,
                    padding: isMobile ? "14px 12px" : "22px 20px",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                    transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 8,
                    borderTop: `3px solid ${path.color}`,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: isMobile ? 18 : 22 }}>{ACADEMY_SECTION_ICONS[sectionKey]}</span>
                      <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: "#0B2341", fontFamily: "'Tajawal',sans-serif", lineHeight: 1.3 }}>{sec.title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7080", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sec.intro}</div>
                    {!isMobile && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {sec.tabs?.slice(0, 4).map(t2 => (
                        <span key={t2.id} style={{ fontSize: 10, padding: "3px 8px", background: "#f0f1f5", borderRadius: 4, color: "#4b5060", fontWeight: 500 }}>{t2.icon} {t2.label}</span>
                      ))}
                    </div>}
                    <div style={{ fontSize: 10, color: path.color, fontWeight: 600, marginTop: isMobile ? 2 : 4 }}>{tabCount} {ar ? "مواضيع" : "topics"} {ar ? "←" : "→"}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Interactive Demo Projects ── */}
        {!searchQuery && (onCreateDemo || publicMode) && (
          <div style={{ marginTop: 8, marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>🎮</span>
              <div>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: "#0B2341", fontFamily: "'Tajawal',sans-serif" }}>{ar ? "نماذج تعليمية تفاعلية" : "Interactive Demo Projects"}</div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#6b7080", marginTop: 2, lineHeight: 1.5 }}>{publicMode ? (ar ? "سجّل حساب مجاني لتجربة هذه النماذج." : "Create a free account to try these demos.") : (ar ? "مشاريع جاهزة بأرقام واقعية. افتحها وعدّل عليها." : "Ready projects with realistic numbers. Open and customize.")}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {ACADEMY_DEMO_PROJECTS.map(demo => (
                <div key={demo.id} style={{
                  background: "#fff", border: "1px solid #e5e7ec", borderRadius: 12,
                  padding: isMobile ? "16px 14px" : "20px 18px",
                  display: "flex", flexDirection: "column", gap: 8,
                  borderInlineStart: "4px solid #C8A96E",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "all 0.2s", opacity: publicMode ? 0.85 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: isMobile ? 18 : 22, flexShrink: 0 }}>{demo.icon}</span>
                    <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: "#0B2341", fontFamily: "'Tajawal',sans-serif", lineHeight: 1.3 }}>{ar ? demo.title.ar : demo.title.en}</span>
                  </div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: "#6b7080", lineHeight: 1.5 }}>{ar ? demo.desc.ar : demo.desc.en}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {demo.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 9, padding: "2px 7px", background: "#f0f1f5", borderRadius: 4, color: "#4b5060", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{tag}</span>
                    ))}
                  </div>
                  {onCreateDemo ? (
                    <button onClick={() => onCreateDemo(demo)} style={{
                      marginTop: 4, padding: "9px 18px", background: "#0B2341", color: "#C8A96E",
                      border: "1px solid rgba(200,169,110,0.3)", borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s", alignSelf: "flex-start",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#C8A96E"; e.currentTarget.style.color = "#0B2341"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#0B2341"; e.currentTarget.style.color = "#C8A96E"; }}
                    >
                      {ar ? "🚀 افتح النموذج التعليمي" : "🚀 Open Demo Project"}
                    </button>
                  ) : (
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontStyle: "italic" }}>
                      🔒 {ar ? "سجّل مجاناً لتجربة هذا النموذج" : "Sign up free to try this demo"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {publicMode && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button onClick={onBack} style={{
                  padding: "12px 32px", background: "#2EC4B6", color: "#fff", border: "none",
                  borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Tajawal',sans-serif", transition: "all 0.2s",
                  boxShadow: "0 4px 12px rgba(46,196,182,0.2)",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#25a89c"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#2EC4B6"; }}
                >
                  {ar ? "سجّل حساب مجاني الآن ←" : "Create Free Account Now →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Topics */}
        {!searchQuery && (
          <div style={{ marginTop: 16, padding: "24px", background: "#fff", borderRadius: 12, border: "1px solid #e5e7ec" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0B2341", marginBottom: 14, fontFamily: "'Tajawal',sans-serif" }}>{ar ? "📖 جميع المواضيع" : "📖 All Topics"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allSectionKeys.map(k => {
                const s3 = EDUCATIONAL_CONTENT[k][ar ? "ar" : "en"];
                if (!s3) return null;
                return (
                  <button key={k} onClick={() => navigateTo(k, 0)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", background: "#f8f9fb", border: "1px solid #e5e7ec",
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: 500, color: "#374151", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#2EC4B6"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#2EC4B6"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f8f9fb"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.borderColor = "#e5e7ec"; }}
                  >
                    <span>{ACADEMY_SECTION_ICONS[k]}</span> {s3.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "#9ca3af" }}>
          {ar ? "أكاديمية حصيف المالية - محتوى تعليمي مصمم للسوق السعودي" : "Haseef Academy - Educational content designed for the Saudi market"}
        </div>
      </div>
    </div>
  );
}


export { Tip, HelpLink, EducationalModal };
export default LearningCenterView;
