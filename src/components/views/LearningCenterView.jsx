// LearningCenterView.jsx — Haseef Academy (educational/marketing surface).
// Restyled 2026-04-17 with Apple HIG primitives where appropriate, while
// preserving the deliberate brand palette (#0B2341 navy, #2EC4B6 teal,
// #C8A96E gold) on the hero and CTA surfaces — this page is marketing,
// not in-app chrome.
import { useState, useEffect } from "react";
import { EDUCATIONAL_CONTENT } from "../../data/educational-content";
import { useIsMobile } from "../shared/hooks";
import EmptyState from "../shared/EmptyState.jsx";
import { Button } from "../ui";

// ── Brand palette (explicit, not tokens — this is a marketing page) ──
const BRAND = {
  navy: "#0B2341",
  teal: "#2EC4B6",
  tealSoft: "rgba(46,196,182,0.12)",
  tealBorder: "rgba(46,196,182,0.25)",
  gold: "#C8A96E",
};

function HelpLink({ contentKey, lang, onOpen, label: customLabel }) {
  const ar = lang === "ar";
  const label = customLabel || (ar ? "ما الفرق؟" : "What's the difference?");
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(contentKey); }}
      style={{
        fontSize: 11,
        color: "var(--sys-blue)",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 3,
        cursor: "pointer",
        fontWeight: 500,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "color 0.15s var(--ease-quart)",
      }}
      onMouseEnter={(e) => { e.target.style.color = "var(--sys-indigo)"; }}
      onMouseLeave={(e) => { e.target.style.color = "var(--sys-blue)"; }}
    >
      {label}
    </span>
  );
}

function EducationalModal({ contentKey, lang, onClose }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const content = EDUCATIONAL_CONTENT[contentKey]?.[ar ? "ar" : "en"];
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!content) return null;
  const tab = content.tabs[activeTab];

  const renderBlock = (block, i) => {
    if (block.type === "heading") {
      return (
        <div key={i} style={{
          fontSize: 14, fontWeight: 700, color: "var(--text-primary)",
          marginTop: i === 0 ? 0 : 20, marginBottom: 8, letterSpacing: "-0.01em",
        }}>{block.text}</div>
      );
    }
    if (block.type === "text") {
      return (
        <div key={i} style={{
          fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 8,
        }}>{block.text}</div>
      );
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 10 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{
              display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6,
              fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65,
            }}>
              <span style={{ color: "var(--sys-blue)", fontSize: 8, marginTop: 7, flexShrink: 0 }}>●</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 9998, backdropFilter: "blur(12px) saturate(1.2)",
          WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: isMobile ? "96vw" : 620, maxWidth: "96vw", maxHeight: "88vh",
        background: "var(--surface-1)", borderRadius: 18,
        boxShadow: "var(--shadow-xl)",
        zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
        direction: ar ? "rtl" : "ltr",
        border: "0.5px solid var(--hairline)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 22px 14px", borderBottom: "1px solid var(--hairline)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--sys-blue), var(--sys-indigo))",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>📘</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "var(--text-primary)",
              letterSpacing: "-0.012em",
            }}>{content.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
              {content.intro}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">✕</Button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0, borderBottom: "1px solid var(--hairline)", flexShrink: 0,
          overflowX: "auto", WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none", scrollbarWidth: "none",
        }}>
          {content.tabs.map((t, i) => {
            const isActive = i === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: isMobile ? "10px 14px" : "12px 20px",
                  background: "none", border: "none",
                  borderBottom: isActive ? "2px solid var(--sys-blue)" : "2px solid transparent",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--sys-blue)" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  transition: "all 0.18s var(--ease-quart)", flexShrink: 0,
                }}
              >
                <span style={{ marginInlineEnd: 6 }}>{t.icon}</span>{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "18px 20px" : "22px 26px" }}>
          {tab && tab.content.map(renderBlock)}
        </div>

        {/* Footer */}
        {content.cta && (
          <div style={{
            padding: "12px 22px", borderTop: "1px solid var(--hairline)",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
            background: "var(--surface-2)",
          }}>
            {window.__zanOpenAcademy ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => { onClose(); window.__zanOpenAcademy(contentKey); }}
              >
                📚 {ar ? "اقرأ المزيد في الأكاديمية" : "Read more in Academy"}
              </Button>
            ) : <span />}
            <Button variant="primary" size="md" onClick={onClose}>{content.cta}</Button>
          </div>
        )}
      </div>
    </>
  );
}

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
    id: "quickstart", icon: "🚀",
    title: { ar: "البداية السريعة", en: "Quick Start" },
    desc: { ar: "ابدأ هنا: دليل عملي خطوة بخطوة لبناء أول نموذج مالي لك", en: "Start here: step-by-step practical guide to building your first financial model" },
    sections: ["quickStart", "projectTypes"], color: "#FF9500",
  },
  {
    id: "foundations", icon: "🧱",
    title: { ar: "أساسيات النمذجة المالية", en: "Financial Modeling Foundations" },
    desc: { ar: "المفاهيم الأساسية: المقاييس المالية، أنواع الأرض، وتحليل السيناريوهات", en: "Core concepts: financial metrics, land types, and scenario analysis" },
    sections: ["financialMetrics", "landType", "scenarioAnalysis"], color: "#007AFF",
  },
  {
    id: "structuring", icon: "🏗",
    title: { ar: "هيكلة التمويل والاستثمار", en: "Financing & Investment Structuring" },
    desc: { ar: "خيارات التمويل البنكي، الإسلامي، الصناديق، والحوافز الحكومية", en: "Bank debt, Islamic finance, fund structures, and government incentives" },
    sections: ["financingMode", "islamicFinance", "govIncentives", "waterfallConcepts"], color: "#5856D6",
  },
  {
    id: "exits", icon: "🎯",
    title: { ar: "التخارج والتقديم للبنك", en: "Exit & Bank Submission" },
    desc: { ar: "استراتيجيات التخارج، حساب العوائد، وتجهيز حزمة البنك", en: "Exit strategies, return calculations, and bank pack preparation" },
    sections: ["exitStrategy", "bankPack", "financialMetrics"], color: "#34C759",
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
  financingMode: "🏦", landType: "🏗", exitStrategy: "🚪", waterfallConcepts: "🌊",
  islamicFinance: "☪️", govIncentives: "🏛", financialMetrics: "📊",
  scenarioAnalysis: "🔄", projectTypes: "🏘", bankPack: "📋", quickStart: "🚀",
};

// ── Demo Projects for Academy (unchanged) ──
const ACADEMY_DEMO_PROJECTS = [
  {
    id: "demo_self_residential", icon: "🏘",
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
    id: "demo_bank_commercial", icon: "🏢",
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
    id: "demo_fund_hotel", icon: "🏨",
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
    id: "demo_mixed_waterfront", icon: "🌊",
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
    id: "demo_incentives", icon: "🏛",
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
      setNavStack((prev) => [...prev, { key: activeSection, tab: activeTabIdx }]);
    }
    setActiveSection(contentKey);
    setActiveTabIdx(tabIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBackInStack = () => {
    if (navStack.length > 0) {
      const prev = navStack[navStack.length - 1];
      setNavStack((s) => s.slice(0, -1));
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
    const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const entry = ACADEMY_TERM_REGISTRY[part];
      if (entry && entry.key !== activeSection) {
        return (
          <span
            key={i}
            onClick={(e) => { e.stopPropagation(); navigateTo(entry.key, entry.tab); }}
            style={{
              color: "var(--sys-blue)", textDecoration: "underline",
              textDecorationStyle: "dotted", textUnderlineOffset: 3,
              cursor: "pointer", fontWeight: 600,
            }}
          >{part}</span>
        );
      }
      return part;
    });
  };

  const renderBlock = (block, i) => {
    if (block.type === "heading") {
      return (
        <div key={i} style={{
          fontSize: isMobile ? 14 : 16,
          fontWeight: 700,
          color: BRAND.navy,
          marginTop: i === 0 ? 0 : (isMobile ? 16 : 22),
          marginBottom: 8,
          fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          letterSpacing: "-0.01em",
        }}>{renderWithLinks(block.text)}</div>
      );
    }
    if (block.type === "text") {
      return (
        <div key={i} style={{
          fontSize: isMobile ? 13 : 14,
          color: "var(--text-secondary)",
          lineHeight: 1.8,
          marginBottom: 8,
        }}>{renderWithLinks(block.text)}</div>
      );
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 10 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{
              display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6,
              fontSize: isMobile ? 13 : 14, color: "var(--text-secondary)", lineHeight: 1.7,
            }}>
              <span style={{ color: BRAND.teal, fontSize: 7, marginTop: 8, flexShrink: 0 }}>●</span>
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
    Object.keys(EDUCATIONAL_CONTENT).forEach((key) => {
      const sec = EDUCATIONAL_CONTENT[key]?.[langKey];
      if (!sec) return;
      const titleMatch = sec.title?.toLowerCase().includes(q);
      const introMatch = sec.intro?.toLowerCase().includes(q);
      sec.tabs?.forEach((tab, tabIdx) => {
        const labelMatch = tab.label?.toLowerCase().includes(q);
        const contentMatch = tab.content?.some(
          (b) =>
            (b.text && b.text.toLowerCase().includes(q)) ||
            (b.items && b.items.some((it) => it.toLowerCase().includes(q)))
        );
        if (titleMatch || introMatch || labelMatch || contentMatch) {
          if (!results.find((r) => r.key === key && r.tabIdx === tabIdx)) {
            results.push({
              key, tabIdx, title: sec.title,
              tabLabel: sec.tabs?.[tabIdx]?.label,
              icon: ACADEMY_SECTION_ICONS[key],
            });
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
      <div dir={dir} style={{
        minHeight: "100vh", background: "var(--surface-2)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Tajawal', 'IBM Plex Sans Arabic', system-ui, sans-serif",
        color: "var(--text-primary)",
      }}>
        {/* Top Bar */}
        <div style={{
          background: BRAND.navy,
          padding: isMobile ? "10px 14px" : "14px 32px",
          position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 1px 0 rgba(255,255,255,0.05), 0 2px 12px rgba(0,0,0,0.15)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
            <button
              onClick={goBackInStack}
              style={{
                background: BRAND.tealSoft,
                border: `1px solid ${BRAND.tealBorder}`,
                borderRadius: 8,
                padding: isMobile ? "6px 12px" : "7px 14px",
                color: BRAND.teal,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                transition: "all 0.18s var(--ease-quart)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(46,196,182,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BRAND.tealSoft; }}
            >
              <span>{ar ? "→" : "←"}</span>
              {isMobile
                ? (parentStack ? (ar ? "رجوع" : "Back") : "📚")
                : (parentStack ? (ar ? "ارجع" : "Back") : (ar ? "الأكاديمية" : "Academy"))}
            </button>
            {parentStack && !isMobile && (
              <span style={{
                fontSize: 12, color: "rgba(255,255,255,0.45)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240,
              }}>
                {ar ? "من:" : "from:"} {EDUCATIONAL_CONTENT[parentStack.key]?.[ar ? "ar" : "en"]?.title}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {!isMobile && (
              <button
                onClick={goHome}
                style={{
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.55)", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                }}
              >📚 {ar ? "الرئيسية" : "Home"}</button>
            )}
            {publicMode && onLangToggle && (
              <button
                onClick={onLangToggle}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "5px 11px",
                  color: "rgba(255,255,255,0.6)", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                }}
              >{ar ? "EN" : "عربي"}</button>
            )}
            <button
              onClick={onBack}
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.55)", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", fontWeight: 500, flexShrink: 0,
              }}
            >{publicMode ? (ar ? "تسجيل →" : "Sign Up") : "✕"}</button>
          </div>
        </div>

        {/* Breadcrumbs */}
        {navStack.length > 0 && (
          <div style={{
            background: "var(--surface-1)", borderBottom: "1px solid var(--hairline)",
            padding: isMobile ? "8px 16px" : "10px 32px",
            display: "flex", alignItems: "center", gap: 8,
            overflowX: "auto", flexWrap: "nowrap",
          }}>
            <span
              onClick={goHome}
              style={{ fontSize: 12, color: "var(--sys-blue)", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}
            >📚 {ar ? "الأكاديمية" : "Academy"}</span>
            {navStack.map((item, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--text-quaternary)", fontSize: 10 }}>{ar ? "←" : "→"}</span>
                <span
                  onClick={() => {
                    setNavStack((s) => s.slice(0, i));
                    setActiveSection(item.key);
                    setActiveTabIdx(item.tab);
                  }}
                  style={{ fontSize: 12, color: "var(--sys-blue)", cursor: "pointer", fontWeight: 500 }}
                >
                  {EDUCATIONAL_CONTENT[item.key]?.[ar ? "ar" : "en"]?.title}
                </span>
              </span>
            ))}
            <span style={{ color: "var(--text-quaternary)", fontSize: 10 }}>{ar ? "←" : "→"}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {content.title}
            </span>
          </div>
        )}

        <div style={{ maxWidth: 780, margin: "0 auto", padding: isMobile ? "18px 16px" : "36px 24px" }}>
          {/* Article Header */}
          <div style={{ marginBottom: isMobile ? 22 : 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12, marginBottom: 10 }}>
              <span style={{ fontSize: isMobile ? 26 : 32, flexShrink: 0 }}>{ACADEMY_SECTION_ICONS[activeSection] || "📘"}</span>
              <h1 style={{
                fontSize: isMobile ? 22 : 32, fontWeight: 800,
                color: BRAND.navy,
                fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                margin: 0, lineHeight: 1.2, letterSpacing: "-0.018em",
              }}>{content.title}</h1>
            </div>
            <p style={{
              fontSize: isMobile ? 13 : 15,
              color: "var(--text-secondary)", lineHeight: 1.7, margin: 0,
            }}>{content.intro}</p>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 0,
            borderBottom: "1px solid var(--hairline)",
            marginBottom: 24,
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", msOverflowStyle: "none",
          }}>
            {content.tabs.map((t, i) => {
              const isAct = i === activeTabIdx;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTabIdx(i)}
                  style={{
                    padding: isMobile ? "10px 14px" : "14px 22px",
                    background: "none", border: "none",
                    borderBottom: isAct ? `2.5px solid ${BRAND.teal}` : "2.5px solid transparent",
                    fontSize: isMobile ? 12 : 13, fontWeight: isAct ? 700 : 500,
                    color: isAct ? BRAND.navy : "var(--text-secondary)",
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    transition: "all 0.18s var(--ease-quart)",
                    flexShrink: 0, marginBottom: -1,
                  }}
                >
                  <span style={{ marginInlineEnd: 6 }}>{t.icon}</span>{t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div style={{
            background: "var(--surface-1)",
            borderRadius: 14,
            border: "1px solid var(--hairline)",
            padding: isMobile ? "18px 16px" : "28px 32px",
            marginBottom: isMobile ? 22 : 32,
            boxShadow: "var(--shadow-sm)",
          }}>
            {tab && tab.content.map(renderBlock)}
          </div>

          {/* Related Topics */}
          {related.length > 0 && (
            <div style={{ marginBottom: isMobile ? 24 : 40 }}>
              <div style={{
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                color: BRAND.navy, marginBottom: 12,
                fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                letterSpacing: "-0.01em",
              }}>
                {ar ? "📎 مواضيع ذات صلة" : "📎 Related Topics"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {related.filter((k) => EDUCATIONAL_CONTENT[k]).map((k) => {
                  const s2 = EDUCATIONAL_CONTENT[k][ar ? "ar" : "en"];
                  return (
                    <button
                      key={k}
                      onClick={() => navigateTo(k, 0)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: isMobile ? "9px 14px" : "10px 16px",
                        background: "var(--surface-1)",
                        border: "1px solid var(--hairline)",
                        borderRadius: 10,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.18s var(--ease-quart)",
                        fontSize: isMobile ? 12 : 13, fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = BRAND.teal;
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,196,182,0.12)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--hairline)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
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
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: isMobile
          ? `linear-gradient(180deg, ${BRAND.navy} 0%, ${BRAND.navy} 280px, var(--surface-2) 280px)`
          : `linear-gradient(180deg, ${BRAND.navy} 0%, ${BRAND.navy} 340px, var(--surface-2) 340px)`,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Tajawal', 'IBM Plex Sans Arabic', system-ui, sans-serif",
        color: "var(--text-primary)",
      }}
    >
      {/* Hero */}
      <div style={{ padding: isMobile ? "16px 16px 56px" : "24px 32px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 20 : 40, position: "relative", zIndex: 1 }}>
          <button
            onClick={onBack}
            style={{
              background: BRAND.tealSoft,
              border: `1px solid ${BRAND.tealBorder}`,
              borderRadius: 10,
              padding: isMobile ? "7px 12px" : "8px 16px",
              color: BRAND.teal,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              transition: "all 0.18s var(--ease-quart)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(46,196,182,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = BRAND.tealSoft; }}
          >
            {publicMode ? (ar ? "→ تسجيل" : "← Sign In") : (ar ? "→ المشاريع" : "← Projects")}
          </button>
          {publicMode && onLangToggle && (
            <button
              onClick={onLangToggle}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "8px 14px",
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >{ar ? "EN" : "عربي"}</button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: isMobile ? 22 : 26, fontWeight: 900, color: "#fff",
              fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              letterSpacing: "-0.02em",
            }}>{ar ? "حصيف" : "Haseef"}</span>
            {!isMobile && (
              <>
                <span style={{ width: 1, height: 20, background: "rgba(46,196,182,0.35)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>
                  {ar ? "النمذجة" : "Financial"}<br />{ar ? "المالية" : "Modeler"}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Title */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            display: "inline-block", padding: "7px 20px",
            background: BRAND.tealSoft, border: `1px solid ${BRAND.tealBorder}`,
            borderRadius: 999, marginBottom: 18,
          }}>
            <span style={{ fontSize: 13, color: BRAND.teal, fontWeight: 600, letterSpacing: "-0.005em" }}>
              📚 {ar ? "أكاديمية حصيف المالية" : "Haseef Academy"}
            </span>
          </div>
          <h1 style={{
            fontSize: isMobile ? 26 : 42, fontWeight: 800, color: "#fff",
            lineHeight: 1.1, marginBottom: 14,
            fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            letterSpacing: "-0.024em",
          }}>
            {ar ? "تعلّم النمذجة المالية العقارية" : "Learn Real Estate Financial Modeling"}
          </h1>
          <p style={{
            fontSize: isMobile ? 13 : 16, color: "rgba(255,255,255,0.55)",
            lineHeight: 1.65, maxWidth: 520, margin: "0 auto",
          }}>
            {ar ? "محتوى عملي مصمم للسوق السعودي." : "Practical content designed for the Saudi market."}
          </p>
        </div>
      </div>

      {/* Main */}
      <div style={{
        maxWidth: 920, margin: isMobile ? "-24px auto 0" : "-40px auto 0",
        padding: isMobile ? "0 16px 40px" : "0 24px 60px", position: "relative", zIndex: 1,
      }}>
        {/* Search */}
        <div style={{ marginBottom: isMobile ? 24 : 32 }}>
          <div style={{
            background: "var(--surface-1)", borderRadius: 14,
            border: "1px solid var(--hairline)",
            boxShadow: "var(--shadow-md)",
            padding: isMobile ? "4px 4px 4px 14px" : "6px 6px 6px 18px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16, color: "var(--text-tertiary)", flexShrink: 0 }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                ar
                  ? (isMobile ? "ابحث... IRR, المرابحة" : "ابحث عن مفهوم... مثال: IRR, المرابحة, شلال التوزيعات")
                  : (isMobile ? "Search... IRR, DSCR" : "Search concepts... e.g. IRR, Murabaha, Waterfall")
              }
              style={{
                flex: 1, border: "none", outline: "none",
                fontSize: isMobile ? 14 : 14,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                padding: isMobile ? "12px 0" : "13px 0",
                background: "transparent", minWidth: 0,
              }}
            />
            {searchQuery && (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery("")}>✕</Button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
              {ar ? `${searchResults.length} نتيجة` : `${searchResults.length} results`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => navigateTo(r.key, r.tabIdx)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 18px",
                    background: "var(--surface-1)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 12,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                    transition: "all 0.18s var(--ease-quart)", width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = BRAND.teal;
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,196,182,0.1)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--hairline)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span style={{ fontSize: 22 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy, letterSpacing: "-0.008em" }}>
                      {r.title}
                    </div>
                    {r.tabLabel && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {r.tabLabel}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {searchResults && searchResults.length === 0 && (
          <EmptyState
            icon="🔍"
            title={ar ? "لا توجد نتائج" : "No Results"}
            subtitle={ar ? "لا توجد نتائج. جرّب كلمات مختلفة." : "No results. Try different keywords."}
          />
        )}

        {/* Learning Paths */}
        {!searchQuery && ACADEMY_PATHS.map((path) => (
          <div key={path.id} style={{ marginBottom: isMobile ? 28 : 36 }}>
            <div style={{
              display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12,
              marginBottom: 14,
              background: isMobile ? "var(--surface-1)" : "transparent",
              padding: isMobile ? "14px 16px" : 0,
              borderRadius: isMobile ? 12 : 0,
              border: isMobile ? "1px solid var(--hairline)" : "none",
              boxShadow: isMobile ? "var(--shadow-sm)" : "none",
            }}>
              <span style={{ fontSize: isMobile ? 20 : 26, flexShrink: 0, marginTop: isMobile ? 2 : 0 }}>
                {path.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 15 : 20, fontWeight: 800, color: BRAND.navy,
                  fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                  lineHeight: 1.25, letterSpacing: "-0.018em",
                }}>
                  {ar ? path.title.ar : path.title.en}
                </div>
                <div style={{
                  fontSize: isMobile ? 12 : 13, color: "var(--text-secondary)",
                  marginTop: 3, lineHeight: 1.55,
                }}>
                  {ar ? path.desc.ar : path.desc.en}
                </div>
              </div>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(path.sections.length, 3)}, 1fr)`,
              gap: 12,
            }}>
              {path.sections.filter((k) => EDUCATIONAL_CONTENT[k]).map((sectionKey, idx) => {
                const sec = EDUCATIONAL_CONTENT[sectionKey][ar ? "ar" : "en"];
                if (!sec) return null;
                const tabCount = sec.tabs?.length || 0;
                return (
                  <button
                    key={sectionKey + "-" + idx}
                    onClick={() => navigateTo(sectionKey, 0)}
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--hairline)",
                      borderRadius: 14,
                      padding: isMobile ? "16px 14px" : "22px 20px",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                      transition: "all 0.22s var(--ease-quart)",
                      display: "flex", flexDirection: "column", gap: 10,
                      borderTop: `3px solid ${path.color}`,
                      boxShadow: "var(--shadow-sm)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: isMobile ? 20 : 24 }}>{ACADEMY_SECTION_ICONS[sectionKey]}</span>
                      <span style={{
                        fontSize: isMobile ? 14 : 16, fontWeight: 700, color: BRAND.navy,
                        fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                        lineHeight: 1.25, letterSpacing: "-0.012em",
                      }}>{sec.title}</span>
                    </div>
                    <div style={{
                      fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{sec.intro}</div>
                    {!isMobile && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {sec.tabs?.slice(0, 4).map((t2) => (
                          <span
                            key={t2.id}
                            style={{
                              fontSize: 11, padding: "3px 9px",
                              background: "var(--surface-3)",
                              borderRadius: 6, color: "var(--text-secondary)",
                              fontWeight: 500,
                            }}
                          >{t2.icon} {t2.label}</span>
                        ))}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11, color: path.color, fontWeight: 600, marginTop: isMobile ? 2 : 4,
                    }}>
                      {tabCount} {ar ? "مواضيع" : "topics"} {ar ? "←" : "→"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Interactive Demo Projects ── */}
        {!searchQuery && (onCreateDemo || publicMode) && (
          <div style={{ marginTop: 8, marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 26 }}>🎮</span>
              <div>
                <div style={{
                  fontSize: isMobile ? 15 : 20, fontWeight: 800, color: BRAND.navy,
                  fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                  letterSpacing: "-0.018em",
                }}>
                  {ar ? "نماذج تعليمية تفاعلية" : "Interactive Demo Projects"}
                </div>
                <div style={{
                  fontSize: isMobile ? 12 : 13, color: "var(--text-secondary)",
                  marginTop: 2, lineHeight: 1.55,
                }}>
                  {publicMode
                    ? (ar ? "سجّل حساب مجاني لتجربة هذه النماذج." : "Create a free account to try these demos.")
                    : (ar ? "مشاريع جاهزة بأرقام واقعية. افتحها وعدّل عليها." : "Ready projects with realistic numbers. Open and customize.")}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {ACADEMY_DEMO_PROJECTS.map((demo) => (
                <div
                  key={demo.id}
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 14,
                    padding: isMobile ? "16px 14px" : "20px 18px",
                    display: "flex", flexDirection: "column", gap: 10,
                    borderInlineStart: `4px solid ${BRAND.gold}`,
                    boxShadow: "var(--shadow-sm)",
                    transition: "all 0.22s var(--ease-quart)",
                    opacity: publicMode ? 0.88 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: isMobile ? 20 : 24, flexShrink: 0 }}>{demo.icon}</span>
                    <span style={{
                      fontSize: isMobile ? 13 : 15, fontWeight: 700, color: BRAND.navy,
                      fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                      lineHeight: 1.25, letterSpacing: "-0.012em",
                    }}>{ar ? demo.title.ar : demo.title.en}</span>
                  </div>
                  <div style={{ fontSize: isMobile ? 12 : 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {ar ? demo.desc.ar : demo.desc.en}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {demo.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10, padding: "3px 8px",
                          background: "var(--surface-3)",
                          borderRadius: 6, color: "var(--text-secondary)",
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4,
                        }}
                      >{tag}</span>
                    ))}
                  </div>
                  {onCreateDemo ? (
                    <button
                      onClick={() => onCreateDemo(demo)}
                      style={{
                        marginTop: 6, padding: "10px 20px",
                        background: BRAND.navy, color: BRAND.gold,
                        border: `1px solid rgba(200,169,110,0.3)`,
                        borderRadius: 10,
                        fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.18s var(--ease-quart)", alignSelf: "flex-start",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = BRAND.gold;
                        e.currentTarget.style.color = BRAND.navy;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = BRAND.navy;
                        e.currentTarget.style.color = BRAND.gold;
                      }}
                    >
                      {ar ? "🚀 افتح النموذج التعليمي" : "🚀 Open Demo Project"}
                    </button>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, fontStyle: "italic" }}>
                      🔒 {ar ? "سجّل مجاناً لتجربة هذا النموذج" : "Sign up free to try this demo"}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {publicMode && (
              <div style={{ textAlign: "center", marginTop: 18 }}>
                <button
                  onClick={onBack}
                  style={{
                    padding: "14px 36px", background: BRAND.teal, color: "#fff", border: "none",
                    borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                    letterSpacing: "-0.012em",
                    transition: "all 0.22s var(--ease-quart)",
                    boxShadow: "0 8px 20px rgba(46,196,182,0.28)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#25a89c";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = BRAND.teal;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {ar ? "سجّل حساب مجاني الآن ←" : "Create Free Account Now →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Topics */}
        {!searchQuery && (
          <div style={{
            marginTop: 16, padding: "24px",
            background: "var(--surface-1)", borderRadius: 14,
            border: "1px solid var(--hairline)",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 14,
              fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              letterSpacing: "-0.012em",
            }}>
              {ar ? "📖 جميع المواضيع" : "📖 All Topics"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allSectionKeys.map((k) => {
                const s3 = EDUCATIONAL_CONTENT[k][ar ? "ar" : "en"];
                if (!s3) return null;
                return (
                  <button
                    key={k}
                    onClick={() => navigateTo(k, 0)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "9px 14px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--hairline)",
                      borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                      transition: "all 0.18s var(--ease-quart)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = BRAND.teal;
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = BRAND.teal;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--surface-2)";
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "var(--hairline)";
                    }}
                  >
                    <span>{ACADEMY_SECTION_ICONS[k]}</span> {s3.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 44, fontSize: 12, color: "var(--text-tertiary)" }}>
          {ar ? "أكاديمية حصيف المالية - محتوى تعليمي مصمم للسوق السعودي" : "Haseef Academy - Educational content designed for the Saudi market"}
        </div>
      </div>
    </div>
  );
}

export default LearningCenterView;
export { HelpLink, EducationalModal };
