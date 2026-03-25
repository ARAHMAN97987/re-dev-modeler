import { useState, useEffect, useCallback, useRef, useMemo, memo, Component } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { storage } from "./lib/storage";
import { generateProfessionalExcel } from "./excelExport";
import { generateFormulaExcel } from "./excelFormulaExport";
import { generateTemplateExcel } from "./excelTemplateExport";
import { embeddedFontCSS } from "./embeddedFonts";
import AiAssistant from "./AiAssistant";

// ═══════════════════════════════════════════════════════════════
// Haseef Financial Modeler — Project Engine v3 (Stable)
// ═══════════════════════════════════════════════════════════════

// ── Functional Colors — consistent metric coloring across all tabs ──
const METRIC_COLORS = { success: "#10b981", warning: "var(--color-warning)", error: "var(--color-danger)", neutral: "var(--text-secondary)", muted: "var(--text-tertiary)" };
const METRIC_COLORS_DARK = { success: "#4ade80", warning: "#fbbf24", error: "#f87171", neutral: "#8b90a0", muted: "var(--text-secondary)" };

/**
 * Returns the functional color for a financial metric based on its value.
 * @param {string} metric - One of: IRR, DSCR, LTV, NPV, MOIC, cashFlow
 * @param {number|null} value - The numeric value (IRR as decimal e.g. 0.15, DSCR as ratio, LTV as %, NPV as amount, MOIC as multiple)
 * @param {object} [opts] - Options: { dark: false, raw: false }
 *   dark=true returns lighter colors for dark backgrounds
 *   raw=true returns 'success'|'warning'|'error' instead of hex
 * @returns {string} hex color or level string
 */
const getMetricColor = (metric, value, opts = {}) => {
  const { dark = false, raw = false } = opts;
  if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
    return raw ? "neutral" : (dark ? METRIC_COLORS_DARK.muted : METRIC_COLORS.muted);
  }
  const palette = dark ? METRIC_COLORS_DARK : METRIC_COLORS;
  let level = "neutral";
  switch (metric) {
    case "IRR":
      level = value >= 0.15 ? "success" : value >= 0.10 ? "warning" : "error";
      break;
    case "DSCR":
      level = value >= 1.5 ? "success" : value >= 1.2 ? "warning" : "error";
      break;
    case "LTV":
      level = value <= 60 ? "success" : value <= 70 ? "warning" : "error";
      break;
    case "NPV":
      level = value > 0 ? "success" : value === 0 ? "warning" : "error";
      break;
    case "MOIC":
      level = value >= 2.0 ? "success" : value >= 1.5 ? "warning" : "error";
      break;
    case "cashFlow":
      level = value > 0 ? "success" : value === 0 ? "neutral" : "error";
      break;
    default:
      return raw ? "neutral" : palette.neutral;
  }
  return raw ? level : palette[level];
};

// ── Error Boundary — prevents white screen on runtime errors ─
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Haseef Error Boundary caught:", error, info?.componentStack); }
  render() {
    if (this.state.hasError) {
      const isAr = document.documentElement.lang === "ar";
      return (
        <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--zan-navy-900)",fontFamily:"var(--font-family)",color:"var(--text-secondary)"}}>
          <div style={{textAlign:"center",maxWidth:460,padding:32}}>
            <div style={{fontSize:28,fontWeight:900,color:"var(--text-inverse)",fontFamily:"'Tajawal',sans-serif",marginBottom:8}}>{isAr?"حصيف":"Haseef"}</div>
            <div style={{fontSize:16,fontWeight:600,color:"#f87171",marginBottom:16}}>{isAr?"حدث خطأ غير متوقع":"An unexpected error occurred"}</div>
            <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:24,lineHeight:1.6}}>{isAr?"يمكنك إعادة المحاولة أو تحميل الصفحة من جديد. بياناتك محفوظة.":"You can retry or reload the page. Your data is saved."}</div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:"10px 24px",background:"var(--btn-primary-bg)",color:"var(--text-inverse)",border:"none",borderRadius:"var(--radius-md)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{isAr?"إعادة المحاولة":"Retry"}</button>
              <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",background:"var(--surface-active)",color:"var(--text-secondary)",border:"0.5px solid var(--nav-tab-border)",borderRadius:"var(--radius-md)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{isAr?"تحديث الصفحة":"Reload Page"}</button>
            </div>
            <details style={{marginTop:24,textAlign:"start"}}>
              <summary style={{fontSize:10,color:"var(--text-secondary)",cursor:"pointer"}}>{isAr?"تفاصيل الخطأ":"Error details"}</summary>
              <pre style={{fontSize:10,color:"var(--text-secondary)",background:"var(--surface-input)",padding:12,borderRadius:"var(--radius-sm)",marginTop:8,overflow:"auto",maxHeight:120,whiteSpace:"pre-wrap"}}>{this.state.error?.message || "Unknown error"}{"\n"}{this.state.error?.stack?.split("\n").slice(0,4).join("\n")}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── CSV helpers — imported from utils/csv.js ──
import { csvEscape, csvParse, generateTemplate, parseAssetFile, mapRowsToAssets, exportAssetsToExcel, TEMPLATE_COLS } from './utils/csv.js';

const STORAGE_KEY = "redev:projects-index";
const PROJECT_PREFIX = "redev:project:";

const L = {
  en: {
    title: "Haseef", subtitle: "Real Estate Development Financial Modeling Platform",
    newProject: "+ New Project", projects: "projects", noProjects: "No projects yet",
    noProjectsSub: "Create your first project to get started",
    back: "← Back", saved: "Saved", saving: "Saving...", error: "Error",
    dashboard: "Dashboard", assetProgram: "Asset Program", cashFlow: "Cash Flow", checks: "Checks",
    // General
    general: "General", location: "Location", startYear: "Start Year", horizon: "Horizon (years)",
    currency: "Currency",
    // Land
    landAcq: "Land Acquisition", landType: "Type", landArea: "Total Land Area (sqm)",
    annualRent: "Annual Land Rent", escalation: "Escalation %", everyN: "Every N Years",
    grace: "Grace Period (yrs)", leaseTerm: "Lease Term (yrs)", purchasePrice: "Purchase Price",
    landValuation: "Land Valuation", partnerEquity: "Partner Equity %", botYears: "Operation Period (yrs)",
    // CAPEX
    capexAssumptions: "CAPEX Assumptions", softCost: "Soft Cost %", contingency: "Contingency %",
    // Revenue
    revenueAssumptions: "Revenue Assumptions", rentEsc: "Rent Escalation % (annual)",
    defEfficiency: "Default Efficiency %", defLeaseRate: "Default Lease Rate", defCostSqm: "Default Cost/sqm",
    // Scenario
    scenario: "Scenario", activeScenario: "Active Scenario",
    capexMult: "CAPEX Multiplier %", rentMult: "Rent Multiplier %",
    delayMonths: "Delay (months)", escAdj: "Esc. Adjustment %",
    // Phases
    phases: "Phases / Sections", startOffset: "Start Yr Offset", footprint: "Footprint (sqm)",
    addPhase: "+ Add Phase",
    // Asset table
    addAsset: "+ Add Asset", assets: "assets", noAssets: "No assets. Click \"+ Add Asset\" to start building your program.",
    phase: "Phase", category: "Category", assetName: "Asset Name", code: "Code",
    plotArea: "Plot Area", bldgFootprint: "Footprint", gfa: "GFA (sqm)", revType: "Rev Type",
    efficiency: "Eff %", leasable: "Leasable", leaseRate: "Rate/sqm", opEbitda: "Op EBITDA",
    escPct: "Esc %", rampYrs: "Ramp Yrs", occPct: "Occ %", costSqm: "Cost/sqm",
    constrStart: "Start Yr", constrDur: "Build (months)", totalCapex: "Total CAPEX",
    totalIncome: "Total Income",
    // Dashboard
    totalCapexLabel: "Total CAPEX", totalIncomeLabel: "Total Income",
    consolidatedIRR: "Consolidated IRR", totalNetCF: "Total Net CF",
    npv10: "NPV @10%", npv12: "NPV @12%", assetsLabel: "Assets", checksLabel: "Checks",
    phaseSummary: "Phase Summary", landConfig: "Land Configuration",
    assetOverview: "Asset Overview",
    // Cash flow
    unleveredCF: "Unlevered Project Cash Flow", lineItem: "Line Item", total: "Total",
    income: "Revenue", landRentLabel: "Land Rent", capex: "CAPEX", netCF: "Net Cash Flow",
    consolidated: "CONSOLIDATED",
    // Checks
    modelChecks: "Model Integrity Checks", allPass: "ALL PASS", errorFound: "ERRORS FOUND",
    check: "Check", status: "Status", description: "Description",
    // Hotel P&L
    hotelPL: "Hotel / Resort Operating P&L", keys: "Keys (rooms)", adr: "ADR (SAR/night)",
    stabOcc: "Stabilized Occupancy %", daysYear: "Days / Year",
    revMix: "Revenue Mix", roomsPct: "Rooms %", fbPct: "F&B %", micePct: "MICE %", otherPct: "Other %",
    opexRatios: "OPEX Ratios", roomExpPct: "Room Expense %", fbExpPct: "F&B Expense %",
    miceExpPct: "MICE Expense %", otherExpPct: "Other Expense %",
    undistPct: "Undistributed % of Rev", fixedPct: "Fixed Charges % of Rev",
    stabRevenue: "Stabilized Revenue", stabOpex: "Stabilized OPEX",
    ebitda: "EBITDA", ebitdaMargin: "EBITDA Margin",
    // Marina P&L
    marinaPL: "Marina Operating P&L", berths: "Berths", avgLength: "Avg Berth Length (m)",
    unitPrice: "Unit Price (SAR/m/yr)", fuelPct: "Fuel % of Total", otherRevPct: "Other % of Total",
    berthingOpex: "Berthing OPEX %", fuelOpex: "Fuel OPEX %", otherOpex: "Other OPEX %",
    operatingDetails: "Operating Details",
    downloadTemplate: "Download Template", uploadFile: "Upload Excel", exportAssets: "Export to Excel",
    importSuccess: "Imported successfully", importError: "Import error",
    // Land types
    lease: "Land Lease (Leasehold)", purchase: "Land Purchase (Freehold)",
    partner: "Land as Equity (Partner)", bot: "Land Swap / BOT",
  },
  ar: {
    title: "حصيف", subtitle: "منصة النمذجة المالية لمشاريع التطوير العقاري",
    newProject: "+ مشروع جديد", projects: "مشاريع", noProjects: "لا توجد مشاريع",
    noProjectsSub: "أنشئ مشروعك الأول للبدء",
    back: "→ رجوع", saved: "تم الحفظ", saving: "جاري الحفظ...", error: "خطأ",
    dashboard: "لوحة التحكم", assetProgram: "برنامج الأصول", cashFlow: "التدفق النقدي", checks: "فحوصات",
    general: "عام", location: "الموقع", startYear: "سنة البداية", horizon: "الأفق (سنوات)",
    currency: "العملة",
    landAcq: "الاستحواذ على الأرض", landType: "النوع", landArea: "إجمالي مساحة الأرض (م²)",
    annualRent: "الإيجار السنوي للأرض", escalation: "نسبة الزيادة %", everyN: "كل N سنة",
    grace: "فترة السماح (سنوات)", leaseTerm: "مدة الإيجار (سنوات)", purchasePrice: "سعر الشراء",
    landValuation: "تقييم الأرض", partnerEquity: "نسبة الشريك %", botYears: "فترة التشغيل (سنوات)",
    capexAssumptions: "افتراضات التكاليف", softCost: "تكاليف غير مباشرة %", contingency: "احتياطي %",
    revenueAssumptions: "افتراضات الإيرادات", rentEsc: "الزيادة السنوية للإيجار %",
    defEfficiency: "الكفاءة الافتراضية %", defLeaseRate: "سعر الإيجار الافتراضي", defCostSqm: "تكلفة المتر الافتراضية",
    scenario: "سيناريو", activeScenario: "السيناريو النشط",
    capexMult: "معامل التكاليف %", rentMult: "معامل الإيجار %",
    delayMonths: "التأخير (أشهر)", escAdj: "تعديل الزيادة %",
    phases: "المراحل", startOffset: "إزاحة سنة البداية", footprint: "المسطح البنائي (م²)",
    addPhase: "+ إضافة مرحلة",
    addAsset: "+ إضافة أصل", assets: "أصول", noAssets: "لا توجد أصول. اضغط \"+ إضافة أصل\" للبدء.",
    phase: "المرحلة", category: "التصنيف", assetName: "اسم الأصل", code: "الرمز",
    plotArea: "مساحة القطعة Plot Area", bldgFootprint: "المسطح البنائي Footprint", gfa: "المساحة الطابقية GFA (م²)", revType: "نوع الإيراد",
    efficiency: "نسبة الكفاءة Eff %", leasable: "المساحة التأجيرية Leasable", leaseRate: "إيجار/م²", opEbitda: "EBITDA التشغيلية",
    escPct: "الزيادة %", rampYrs: "سنوات النمو", occPct: "الإشغال %", costSqm: "تكلفة/م² Cost/sqm",
    constrStart: "سنة بداية البناء", constrDur: "مدة البناء (شهر)", totalCapex: "إجمالي التكاليف",
    totalIncome: "إجمالي الإيرادات",
    totalCapexLabel: "إجمالي CAPEX", totalIncomeLabel: "إجمالي الدخل",
    consolidatedIRR: "IRR الموحّد", totalNetCF: "صافي التدفق النقدي Net CF",
    npv10: "القيمة الحالية @10%", npv12: "القيمة الحالية @12%",
    assetsLabel: "الأصول", checksLabel: "الفحوصات",
    phaseSummary: "ملخص المراحل", landConfig: "إعدادات الأرض",
    assetOverview: "نظرة عامة على الأصول",
    unleveredCF: "التدفق النقدي قبل التمويل", lineItem: "البند", total: "الإجمالي",
    income: "الإيرادات", landRentLabel: "إيجار الأرض", capex: "CAPEX", netCF: "صافي التدفق النقدي",
    consolidated: "الموحّد",
    modelChecks: "فحوصات سلامة النموذج", allPass: "الكل ناجح", errorFound: "يوجد أخطاء",
    check: "الفحص", status: "الحالة", description: "الوصف",
    hotelPL: "قائمة أرباح وخسائر الفندق / المنتجع", keys: "عدد الغرف", adr: "متوسط سعر الغرفة (ريال/ليلة)",
    stabOcc: "نسبة الإشغال المستقر %", daysYear: "أيام / سنة",
    revMix: "توزيع الإيرادات", roomsPct: "الغرف %", fbPct: "الأطعمة والمشروبات %", micePct: "المؤتمرات %", otherPct: "أخرى %",
    opexRatios: "نسب المصاريف", roomExpPct: "مصاريف الغرف %", fbExpPct: "مصاريف الأطعمة %",
    miceExpPct: "مصاريف المؤتمرات %", otherExpPct: "مصاريف أخرى %",
    undistPct: "مصاريف غير موزعة %", fixedPct: "أعباء ثابتة %",
    stabRevenue: "الإيرادات المستقرة", stabOpex: "المصاريف المستقرة",
    ebitda: "الأرباح التشغيلية", ebitdaMargin: "هامش الأرباح التشغيلية",
    marinaPL: "قائمة أرباح وخسائر المارينا", berths: "المراسي", avgLength: "متوسط طول المرسى (م)",
    unitPrice: "سعر الوحدة (ريال/م/سنة)", fuelPct: "الوقود % من الإجمالي", otherRevPct: "أخرى % من الإجمالي",
    berthingOpex: "مصاريف المراسي %", fuelOpex: "مصاريف الوقود %", otherOpex: "مصاريف أخرى %",
    operatingDetails: "تفاصيل التشغيل",
    downloadTemplate: "تحميل النموذج", uploadFile: "رفع ملف Excel", exportAssets: "تصدير إلى Excel",
    importSuccess: "تم الاستيراد بنجاح", importError: "خطأ في الاستيراد",
    lease: "إيجار أرض (حق انتفاع)", purchase: "شراء أرض (تملك حر)",
    partner: "أرض كحصة عينية (شراكة)", bot: "مبادلة أرض / BOT",
  }
};

const CATEGORIES = ["Hospitality","Retail","Office","Residential","Flexible","Marina","Cultural","Amenity","Open Space","Utilities","Industrial","Infrastructure"];
const REV_TYPES = ["Lease","Operating","Sale"];
import { CAT_AR, REV_AR, catL, revL } from './data/translations.js';
const CURRENCIES = ["SAR","USD","AED","EUR","GBP"];
const SCENARIOS = ["Base Case","CAPEX +10%","CAPEX -10%","Rent +10%","Rent -10%","Delay +6 months","Escalation +0.5%","Escalation -0.5%","Custom"];

const LAND_TYPES = [
  { value: "lease", en: "Land Lease (Leasehold)", ar: "إيجار أرض (حق انتفاع)" },
  { value: "purchase", en: "Land Purchase (Freehold)", ar: "شراء أرض (تملك حر)" },
  { value: "partner", en: "Land as Equity (Partner)", ar: "أرض كحصة عينية (شراكة)" },
  { value: "bot", en: "Land Swap / BOT", ar: "مبادلة أرض / BOT" },
];

// Hotel presets from ZAN Excel
const HOTEL_PRESETS = {
  "4-Star Hotel": { keys: 230, adr: 548, stabOcc: 70, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 },
  "5-Star Resort": { keys: 175, adr: 920, stabOcc: 73, roomsPct: 64, fbPct: 25, micePct: 7, otherPct: 4, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 55, undistPct: 28, fixedPct: 9 },
};

const MARINA_PRESET = { berths: 80, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 };

// ── Saudi Market Benchmarks — imported from data/benchmarks.js ──
import { getBenchmark, benchmarkColor, getAutoFillDefaults, BENCHMARKS } from './data/benchmarks.js';

// ── Project Templates (Sprint 1C) ──
const PROJECT_TEMPLATES = [
  { id:"waterfront", icon:"🌊", en:"Waterfront Mixed-Use", ar:"واجهة بحرية متعددة الاستخدامات",
    desc_en:"Mall, hotel, office, residential, marina, fuel station", desc_ar:"مول، فندق، مكاتب، سكني، مارينا، محطة وقود",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:36,footprint:0},{name:"Phase 2",startYearOffset:3,completionMonth:72,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Marina Mall",code:"C1",gfa:31260,footprint:20840,plotArea:28947,revType:"Lease",efficiency:80,leaseRate:2100,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:3900,constrStart:2,constrDuration:36,opEbitda:0},
      {phase:"Phase 1",category:"Hospitality",name:"Hotel (4-Star)",code:"H1",gfa:16577,footprint:2072,plotArea:5133,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:8000,constrStart:2,constrDuration:36,opEbitda:13901057},
      {phase:"Phase 2",category:"Office",name:"Office Block",code:"O1",gfa:16429,footprint:2710,plotArea:5497,revType:"Lease",efficiency:90,leaseRate:900,escalation:0.75,rampUpYears:2,stabilizedOcc:100,costPerSqm:2600,constrStart:3,constrDuration:36,opEbitda:0},
      {phase:"Phase 2",category:"Residential",name:"Residential Tower",code:"R1",gfa:14000,footprint:2000,plotArea:4000,revType:"Lease",efficiency:85,leaseRate:800,escalation:0.75,rampUpYears:2,stabilizedOcc:92,costPerSqm:2800,constrStart:3,constrDuration:30,opEbitda:0},
      {phase:"Phase 2",category:"Marina",name:"Marina Berths",code:"MAR",gfa:2400,footprint:0,plotArea:3000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:90,costPerSqm:16000,constrStart:4,constrDuration:12,opEbitda:1129331},
      {phase:"Phase 1",category:"Retail",name:"Fuel Station",code:"F",gfa:3586,footprint:3586,plotArea:6920,revType:"Lease",efficiency:30,leaseRate:900,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:1500,constrStart:2,constrDuration:12,opEbitda:0},
    ]},
  { id:"residential", icon:"🏘", en:"Residential Compound", ar:"مجمع سكني",
    desc_en:"Tower, villas, amenities, parking", desc_ar:"برج، فلل، مرافق خدمية، مواقف",
    landType:"purchase", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"hold",
    assets:[
      {phase:"Phase 1",category:"Residential",name:"Residential Tower",code:"T1",gfa:24000,footprint:3000,plotArea:5000,revType:"Lease",efficiency:85,leaseRate:900,escalation:1.0,rampUpYears:2,stabilizedOcc:92,costPerSqm:3000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Residential",name:"Villa Cluster",code:"V1",gfa:8000,footprint:4000,plotArea:10000,revType:"Lease",efficiency:90,leaseRate:700,escalation:1.0,rampUpYears:2,stabilizedOcc:88,costPerSqm:2500,constrStart:1,constrDuration:24,opEbitda:0},
      {phase:"Phase 1",category:"Amenity",name:"Amenity Center",code:"AM",gfa:2000,footprint:1500,plotArea:3000,revType:"Lease",efficiency:50,leaseRate:400,escalation:0.5,rampUpYears:1,stabilizedOcc:80,costPerSqm:2200,constrStart:1,constrDuration:18,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Structure",code:"PK",gfa:6000,footprint:3000,plotArea:3000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1800,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"commercial", icon:"🏢", en:"Commercial Center", ar:"مركز تجاري",
    desc_en:"Retail, offices, parking", desc_ar:"محلات، مكاتب، مواقف",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Retail Mall",code:"RM",gfa:20000,footprint:10000,plotArea:15000,revType:"Lease",efficiency:80,leaseRate:2200,escalation:1.0,rampUpYears:3,stabilizedOcc:90,costPerSqm:4000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Office",name:"Office Tower",code:"OF",gfa:15000,footprint:2500,plotArea:4000,revType:"Lease",efficiency:88,leaseRate:1100,escalation:1.0,rampUpYears:2,stabilizedOcc:85,costPerSqm:3200,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Podium",code:"PK",gfa:8000,footprint:4000,plotArea:4000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1500,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"hotel", icon:"🏨", en:"Single Hotel", ar:"فندق منفرد",
    desc_en:"Full hotel with operating P&L", desc_ar:"فندق واحد مع قائمة أرباح وخسائر تشغيلية كاملة",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:42,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Hospitality",name:"5-Star Hotel",code:"H5",gfa:22000,footprint:5000,plotArea:12000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:12000,constrStart:1,constrDuration:42,opEbitda:47630685},
    ]},
  { id:"blank", icon:"📄", en:"Blank Project", ar:"مشروع فارغ",
    desc_en:"Start from scratch", desc_ar:"ابدأ من الصفر",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:18,footprint:0}],
    finMode:"self", exitStrategy:"hold", assets:[] },
];


// ── Engine imports (extracted from this file — single source of truth) ──
import { calcIRR, calcNPV } from './engine/math.js';
import { calcHotelEBITDA, calcMarinaEBITDA } from './engine/hospitality.js';
import { getScenarioMults, computeAssetCapex, computeProjectCashFlows } from './engine/cashflow.js';
import { computeIncentives, applyInterestSubsidy } from './engine/incentives.js';
import { computeFinancing } from './engine/financing.js';
import { computeWaterfall } from './engine/waterfall.js';
import {
  FINANCING_FIELDS, getPhaseFinancing, hasPerPhaseFinancing, migrateToPerPhaseFinancing,
  buildPhaseIncentives, buildPhaseVirtualProject, buildPhaseProjectResults,
  aggregatePhaseFinancings, aggregatePhaseWaterfalls, computeIndependentPhaseResults
} from './engine/phases.js';
import { computePhaseWaterfalls } from './engine/legacy/phaseWaterfalls.js';
import { runChecks } from './engine/checks.js';
import { defaultProject, defaultHotelPL, defaultMarinaPL } from './data/defaults.js';
import { fmt, fmtPct, fmtM } from './utils/format.js';

// ── Storage ──
async function loadProjectIndex() { try { const r = await storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : []; } catch { return []; } }
async function saveProjectIndex(index) { await storage.set(STORAGE_KEY, JSON.stringify(index)); }
async function loadSharedProjects(email) {
  try {
    const rows = await storage.getSharedProjects(email);
    return rows.map(row => {
      try {
        const proj = JSON.parse(row.value);
        return { id: proj.id, name: proj.name, status: proj.status, updatedAt: proj.updatedAt, createdAt: proj.createdAt, _shared: true, _ownerId: row.ownerId, _permission: row.permission || "edit" };
      } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}
async function loadProject(id, ownerId, permission) {
  try {
    let r;
    if (ownerId) {
      r = await storage.getSharedProject(PROJECT_PREFIX + id, ownerId);
    } else {
      r = await storage.get(PROJECT_PREFIX + id);
    }
    if (!r) return null;
    const p = JSON.parse(r.value);
    const def = defaultProject();
    const migrated = { ...def, ...p };
    // Fee migration: old projects may have fee fields = 0 or missing.
    // Apply defaults for fees that were never explicitly set by the user.
    // We detect "never set" by checking if the field is 0/undefined AND the project
    // was created before these fields existed (no _feesVersion flag).
    if (!migrated._feesVersion) {
      const feeDefaults = {
        subscriptionFeePct: def.subscriptionFeePct,
        annualMgmtFeePct: def.annualMgmtFeePct,
        mgmtFeeCapAnnual: def.mgmtFeeCapAnnual,
        custodyFeeAnnual: def.custodyFeeAnnual,
        developerFeePct: def.developerFeePct,
        structuringFeePct: def.structuringFeePct,
        structuringFeeCap: def.structuringFeeCap,
        preEstablishmentFee: def.preEstablishmentFee,
        spvFee: def.spvFee,
        auditorFeeAnnual: def.auditorFeeAnnual,
        operatorFeePct: def.operatorFeePct,
        operatorFeeCap: def.operatorFeeCap,
        miscExpensePct: def.miscExpensePct,
        upfrontFeePct: def.upfrontFeePct,
        mgmtFeeBase: def.mgmtFeeBase,
      };
      for (const [k, v] of Object.entries(feeDefaults)) {
        if (migrated[k] === undefined || migrated[k] === null || migrated[k] === '') {
          migrated[k] = v;
        }
      }
      migrated._feesVersion = 2;
    }
    // Engine field migration v3: ensure critical engine fields are valid
    if (!migrated._engineVersion || migrated._engineVersion < 3) {
      // Validate exitStrategy is a known value
      if (!['sale', 'caprate', 'hold'].includes(migrated.exitStrategy)) {
        migrated.exitStrategy = def.exitStrategy;
      }
      // Ensure catchupMethod exists (engine needs explicit value)
      if (!migrated.catchupMethod) {
        migrated.catchupMethod = def.catchupMethod; // "perYear"
      }
      // Ensure debtTrancheMode exists
      if (!migrated.debtTrancheMode) {
        migrated.debtTrancheMode = def.debtTrancheMode; // "single"
      }
      // Ensure feeTreatment exists
      if (!migrated.feeTreatment) {
        migrated.feeTreatment = def.feeTreatment; // "capital"
      }
      // Ensure mgmtFeeBase exists
      if (!migrated.mgmtFeeBase) {
        migrated.mgmtFeeBase = def.mgmtFeeBase; // "nav"
      }
      // Fix legacy field name: annualLandRent → landRentAnnual
      if (migrated.annualLandRent !== undefined && !migrated.landRentAnnual) {
        migrated.landRentAnnual = migrated.annualLandRent;
        delete migrated.annualLandRent;
      }
      // Clean phase financing: remove project-level fields that shouldn't be per-phase
      if (migrated.phases) {
        migrated.phases = migrated.phases.map(p => {
          if (p.financing) {
            const cleaned = { ...p.financing };
            // catchupMethod is project-level only
            delete cleaned.catchupMethod;
            return { ...p, financing: cleaned };
          }
          return p;
        });
      }
      migrated._engineVersion = 3;
    }
    if (ownerId) migrated._shared = true;
    if (ownerId) migrated._ownerId = ownerId;
    if (ownerId) migrated._permission = permission || "edit";
    // Deep merge incentives
    if (!migrated.incentives) migrated.incentives = def.incentives;
    else {
      for (const k of Object.keys(def.incentives)) {
        if (!migrated.incentives[k]) migrated.incentives[k] = def.incentives[k];
        else migrated.incentives[k] = { ...def.incentives[k], ...migrated.incentives[k] };
      }
    }
    // Deep merge market
    if (!migrated.market) migrated.market = def.market;
    else migrated.market = { ...def.market, ...migrated.market, gaps: { ...def.market.gaps, ...(migrated.market.gaps||{}) }, thresholds: { ...def.market.thresholds, ...(migrated.market.thresholds||{}) }, conversionFactors: { ...def.market.conversionFactors, ...(migrated.market.conversionFactors||{}) } };
    return migrated;
  } catch { return null; }
}
async function saveProject(project) {
  project.updatedAt = new Date().toISOString();
  if (project._shared && project._ownerId) {
    // Save back to the owner's storage
    const clean = {...project}; delete clean._shared; delete clean._ownerId;
    await storage.setSharedProject(PROJECT_PREFIX + project.id, JSON.stringify(clean), project._ownerId);
  } else {
    await storage.set(PROJECT_PREFIX + project.id, JSON.stringify(project));
    const index = await loadProjectIndex();
    const meta = { id: project.id, name: project.name, status: project.status, updatedAt: project.updatedAt, createdAt: project.createdAt, assetCount: (project.assets||[]).length, finMode: project.finMode||"self", landType: project.landType||"lease", location: project.location||"" };
    const idx = index.findIndex(p => p.id === project.id);
    if (idx >= 0) index[idx] = meta; else index.push(meta);
    await saveProjectIndex(index);
  }
}
async function deleteProjectStorage(id) { await storage.delete(PROJECT_PREFIX + id); const index = await loadProjectIndex(); await saveProjectIndex(index.filter(p => p.id !== id)); }

function WaterfallView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [wSec, setWSec] = useState({});  // chart toggle state
  const [kpiOpen, setKpiOpen] = useState({gp:false,lp:false,fund:false}); // expandable KPI cards
  const [eduModal, setEduModal] = useState(null);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({gp:expand,lp:expand,fund:expand}); setWSec(expand?{chart:true}:{}); }}, [globalExpand]);

  if (!project || !results || !waterfall) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>
    <div style={{fontSize:14,marginBottom:8}}>{lang==="ar"?"يتطلب اختيار هيكل تمويل غير ذاتي":"Requires non-self financing mode"}</div>
    <div style={{fontSize:12}}>{lang==="ar"?"اختر 'دين بنكي' أو 'صندوق استثماري' من لوحة التحكم":"Select 'Bank Debt' or 'Fund Structure' from the control panel"}</div>
  </div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;
  const upCfg = up ? (isSinglePhase
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }))) : null;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;
  const hasPhases = phaseNames.length > 1 && phaseWaterfalls && Object.keys(phaseWaterfalls).length > 0;
  const h0 = new Array(h).fill(0);
  const cur = project.currency || "SAR";

  // ── Filtered waterfall ──
  const w = useMemo(() => {
    if (isSinglePhase && phaseWaterfalls?.[singlePhaseName]) {
      const _pw = phaseWaterfalls[singlePhaseName];
      return { ..._pw,
        feeSub:_pw.feeSub||h0, feeMgmt:_pw.feeMgmt||h0, feeCustody:_pw.feeCustody||h0,
        feeDev:_pw.feeDev||h0, feeStruct:_pw.feeStruct||h0, feePreEst:_pw.feePreEst||h0,
        feeSpv:_pw.feeSpv||h0, feeAuditor:_pw.feeAuditor||h0, feeOperator:_pw.feeOperator||h0,
        feeMisc:_pw.feeMisc||h0, fees:_pw.fees||h0, totalFees:_pw.totalFees??0,
        totalEquity:_pw.totalEquity||_pw.equity||0, exitYear:_pw.exitYear||waterfall.exitYear||0,
        lpNPV12:_pw.lpNPV12??null, lpNPV14:_pw.lpNPV14??null, gpNPV12:_pw.gpNPV12??null, gpNPV14:_pw.gpNPV14??null,
        unreturnedClose:_pw.unreturnedClose||h0, unreturnedOpen:_pw.unreturnedOpen||h0,
        prefAccrual:_pw.prefAccrual||h0, prefAccumulated:_pw.prefAccumulated||h0, exitProceeds:_pw.exitProceeds||h0,
      };
    }
    if (!isFiltered) return waterfall;
    // Multi-phase: aggregate selected phase waterfalls
    const pws = activePh.map(p => phaseWaterfalls?.[p]).filter(Boolean);
    if (pws.length === 0) return waterfall;
    const sumArr = (field) => { const arr = new Array(h).fill(0); pws.forEach(pw => { const a = pw[field]; if (a) for(let y=0;y<h;y++) arr[y]+=(a[y]||0); }); return arr; };
    const sum = (field) => pws.reduce((s,pw) => s + (pw[field]||0), 0);
    const lpNetCF = sumArr('lpNetCF'), gpNetCF = sumArr('gpNetCF');
    const totalEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.totalEquity||0), 0);
    const gpEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.gpEquity||0), 0);
    const lpEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.lpEquity||0), 0);
    const lpTotalDist = sum('lpTotalDist'), gpTotalDist = sum('gpTotalDist');
    const eqCalls = sumArr('equityCalls');
    const lpCalled = eqCalls.reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity));
    const gpCalled = eqCalls.reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity));
    return { ...waterfall, totalEquity, gpEquity, lpEquity, gpPct: totalEquity>0?gpEquity/totalEquity:0, lpPct: totalEquity>0?lpEquity/totalEquity:0,
      equityCalls: eqCalls, fees: sumArr('fees'), feeSub: sumArr('feeSub'), feeMgmt: sumArr('feeMgmt'),
      feeCustody: sumArr('feeCustody'), feeDev: sumArr('feeDev'), feeStruct: sumArr('feeStruct'),
      feePreEst: sumArr('feePreEst'), feeSpv: sumArr('feeSpv'), feeAuditor: sumArr('feeAuditor'),
      feeOperator: sumArr('feeOperator'), feeMisc: sumArr('feeMisc'), totalFees: sum('totalFees'),
      unfundedFees: sumArr('unfundedFees'), exitProceeds: sumArr('exitProceeds'),
      exitYear: Math.max(...pws.map(pw=>pw.exitYear||0)),
      cashAvail: sumArr('cashAvail'), tier1: sumArr('tier1'), tier2: sumArr('tier2'),
      tier3: sumArr('tier3'), tier4LP: sumArr('tier4LP'), tier4GP: sumArr('tier4GP'),
      lpDist: sumArr('lpDist'), gpDist: sumArr('gpDist'), lpNetCF, gpNetCF,
      unreturnedOpen: sumArr('unreturnedOpen'), unreturnedClose: sumArr('unreturnedClose'),
      prefAccrual: sumArr('prefAccrual'), prefAccumulated: sumArr('prefAccumulated'),
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
      lpTotalDist, gpTotalDist, lpNetDist: sum('lpNetDist')||lpTotalDist, gpNetDist: sum('gpNetDist')||gpTotalDist,
      lpTotalCalled: lpCalled, gpTotalCalled: gpCalled, lpTotalInvested: lpCalled, gpTotalInvested: gpCalled,
      lpMOIC: lpCalled>0?(sum('lpNetDist')||lpTotalDist)/lpCalled:0, gpMOIC: gpCalled>0?(sum('gpNetDist')||gpTotalDist)/gpCalled:0,
      lpNPV10: calcNPV(lpNetCF,0.10), lpNPV12: calcNPV(lpNetCF,0.12), lpNPV14: calcNPV(lpNetCF,0.14),
      gpNPV10: calcNPV(gpNetCF,0.10), gpNPV12: calcNPV(gpNetCF,0.12), gpNPV14: calcNPV(gpNetCF,0.14),
      isFund: pws.some(pw=>pw.isFund),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, waterfall, phaseWaterfalls, phaseFinancings, h]);

  // Phase-aware data sources for table §7 and §8
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return results.consolidated;
    const income=new Array(h).fill(0),capex=new Array(h).fill(0),landRent=new Array(h).fill(0),netCF=new Array(h).fill(0);
    activePh.forEach(pName=>{const pr=results.phaseResults?.[pName];if(!pr)return;for(let y=0;y<h;y++){income[y]+=pr.income[y]||0;capex[y]+=pr.capex[y]||0;landRent[y]+=pr.landRent[y]||0;netCF[y]+=pr.netCF[y]||0;}});
    return {income,capex,landRent,netCF,totalCapex:capex.reduce((a,b)=>a+b,0),totalIncome:income.reduce((a,b)=>a+b,0),totalLandRent:landRent.reduce((a,b)=>a+b,0),totalNetCF:netCF.reduce((a,b)=>a+b,0),irr:calcIRR(netCF)};
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h]);
  const f = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p=>phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length===0) return financing;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf2=>{if(pf2.leveredCF)for(let y=0;y<h;y++)leveredCF[y]+=pf2.leveredCF[y]||0;});
    return {...financing, leveredCF, leveredIRR:calcIRR(leveredCF),
      totalDebt:pfs.reduce((s,p2)=>s+(p2.totalDebt||0),0), totalEquity:pfs.reduce((s,p2)=>s+(p2.totalEquity||0),0),
      devCostInclLand:pfs.reduce((s,p2)=>s+(p2.devCostInclLand||0),0), totalInterest:pfs.reduce((s,p2)=>s+(p2.totalInterest||0),0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h]);

  // ── Derived metrics: Payback, Cash Yield, Exit, Attribution ──
  const lpPayback = (() => { if ((w.lpTotalInvested||0) <= 0) return null; let cum = 0, wasNeg = false; for (let y = 0; y < h; y++) { cum += w.lpNetCF[y] || 0; if (cum < -1) wasNeg = true; if (wasNeg && cum >= 0) return y + 1; } return null; })();
  const gpPayback = (() => { if ((w.gpTotalInvested||0) <= 0) return null; let cum = 0, wasNeg = false; for (let y = 0; y < h; y++) { cum += w.gpNetCF[y] || 0; if (cum < -1) wasNeg = true; if (wasNeg && cum >= 0) return y + 1; } return null; })();

  // Exit details
  const exitProc = (w.exitProceeds || []).reduce((a, b) => a + b, 0);
  const exitYr = w.exitYear || 0;
  const exitMult = cfg.exitMultiple || project.exitMultiple || 0;
  const exitCostPct = cfg.exitCostPct || project.exitCostPct || 0;

  const lpCashYield = w.lpTotalInvested > 0 ? (w.lpDist || []).map(d => d / w.lpTotalInvested) : [];
  const gpCashYield = w.gpTotalInvested > 0 ? (w.gpDist || []).map(d => d / w.gpTotalInvested) : [];
  const lpStabYield = lpCashYield.length > 0 && exitYr > 2 ? lpCashYield[Math.min(exitYr - 2, lpCashYield.length - 1)] : 0;
  const gpStabYield = gpCashYield.length > 0 && exitYr > 2 ? gpCashYield[Math.min(exitYr - 2, gpCashYield.length - 1)] : 0;

  // Return attribution (where did distributions come from?)
  const t1Total = w.tier1.reduce((a, b) => a + b, 0);
  const t2Total = w.tier2.reduce((a, b) => a + b, 0);
  const t3Total = w.tier3.reduce((a, b) => a + b, 0);
  const t4LPTotal = w.tier4LP.reduce((a, b) => a + b, 0);
  const t4GPTotal = w.tier4GP.reduce((a, b) => a + b, 0);

  // Cumulative CF chart data
  const cfChartData = (() => {
    let lpCum = 0, gpCum = 0;
    return Array.from({ length: Math.min(showYrs, h) }, (_, y) => {
      lpCum += w.lpNetCF[y] || 0;
      gpCum += w.gpNetCF[y] || 0;
      return { year: sy + y, yr: `Yr ${y + 1}`, lp: Math.round(lpCum), gp: Math.round(gpCum) };
    });
  })();

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"var(--surface-page)"}:{};
    const nc=v=>{if(color)return color;return v<0?"var(--color-danger)":v>0?"var(--text-primary)":"var(--text-tertiary)";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"var(--surface-page)":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?100:160}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* Phase selector (multi-select) */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p=>{
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pw = phaseWaterfalls?.[p];
            const irr = pw?.lpIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>LP {(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && upCfg && (
      <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"var(--color-warning-text)",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}

    {/* ═══ QUICK EDIT: Fund & Waterfall Terms ═══ */}
    {upCfg && cfg.finMode === "fund" && (
      <div style={{background:showTerms?"#fff":"var(--surface-page)",borderRadius:"var(--radius-lg)",border:showTerms?"2px solid #8b5cf6":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#faf5ff":"var(--surface-page)",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تعديل سريع - شروط الصندوق":"Quick Edit - Fund Terms"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"Pref":"Pref"} {cfg.prefReturnPct||15}% · Carry {cfg.carryPct||20}% · LP {cfg.lpProfitSplitPct||75}%</span>
          <span style={{fontSize:11,color:"var(--text-tertiary)",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #ede9fe",animation:"zanSlide 0.15s ease"}}>
          {/* Row 1: Waterfall Terms */}
          <div style={{fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"شروط حافز الأداء":"WATERFALL TERMS"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {[
              {l:ar?"العائد التفضيلي %":"Pref Return %",k:"prefReturnPct",v:cfg.prefReturnPct},
              {l:ar?"أتعاب حسن الأداء %":"Carry %",k:"carryPct",v:cfg.carryPct},
              {l:ar?"حصة LP %":"LP Split %",k:"lpProfitSplitPct",v:cfg.lpProfitSplitPct},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"GP Catch-up":"Catch-up"}</span>
              <select value={cfg.gpCatchup?"Y":"N"} onChange={e=>upCfg({gpCatchup:e.target.value==="Y"})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,background:"var(--surface-card)"}}>
                <option value="Y">{ar?"نعم":"Yes"}</option><option value="N">{ar?"لا":"No"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"معاملة الرسوم":"Fee Treatment"}</span>
              <select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,background:"var(--surface-card)"}}>
                <option value="capital">{ar?"رأسمال":"Capital"}</option><option value="rocOnly">{ar?"استرداد فقط":"ROC Only"}</option><option value="expense">{ar?"مصروف":"Expense"}</option>
              </select>
            </div>
          </div>
          {/* Row 2: Fund Fees */}
          <div style={{fontSize:10,fontWeight:700,color:"var(--color-warning)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {l:ar?"اكتتاب %":"Sub %",k:"subscriptionFeePct",v:cfg.subscriptionFeePct},
              {l:ar?"إدارة %":"Mgmt %",k:"annualMgmtFeePct",v:cfg.annualMgmtFeePct},
              {l:ar?"سقف إدارة":"Mgmt Cap",k:"mgmtFeeCapAnnual",v:cfg.mgmtFeeCapAnnual,wide:true},
              {l:ar?"تطوير %":"Dev %",k:"developerFeePct",v:cfg.developerFeePct},
              {l:ar?"هيكلة %":"Struct %",k:"structuringFeePct",v:cfg.structuringFeePct},
              {l:ar?"سقف هيكلة":"Struct Cap",k:"structuringFeeCap",v:cfg.structuringFeeCap,wide:true},
              {l:ar?"حفظ/سنة":"Custody",k:"custodyFeeAnnual",v:cfg.custodyFeeAnnual,wide:true},
              {l:ar?"ما قبل التأسيس":"Pre-Est.",k:"preEstablishmentFee",v:cfg.preEstablishmentFee,wide:true},
              {l:ar?"SPV":"SPV",k:"spvFee",v:cfg.spvFee},
              {l:ar?"مراجع/سنة":"Auditor",k:"auditorFeeAnnual",v:cfg.auditorFeeAnnual,wide:true},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:10,color:"var(--text-secondary)",minWidth:f.wide?68:52}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:f.wide?80:55,padding:"4px 6px",border:"0.5px solid var(--border-default)",borderRadius:5,fontSize:11,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: GP | LP | Fund ═══ */}
    {(() => {
      const gpIsManager = cfg.gpIsFundManager !== false;
      const _feeDev = (w.feeDev||[]).reduce((a,b)=>a+b,0);
      const _feeMgmt = (w.feeMgmt||[]).reduce((a,b)=>a+b,0);
      const _feeSub = (w.feeSub||[]).reduce((a,b)=>a+b,0);
      const _feeStruct = (w.feeStruct||[]).reduce((a,b)=>a+b,0);
      const _feeCustody = (w.feeCustody||[]).reduce((a,b)=>a+b,0);
      const _feePreEst = (w.feePreEst||[]).reduce((a,b)=>a+b,0);
      const _feeSpv = (w.feeSpv||[]).reduce((a,b)=>a+b,0);
      const _feeAuditor = (w.feeAuditor||[]).reduce((a,b)=>a+b,0);
      const _feeOperator = (w.feeOperator||[]).reduce((a,b)=>a+b,0);
      const _feeMisc = (w.feeMisc||[]).reduce((a,b)=>a+b,0);
      const gpFeesTotal = gpIsManager ? _feeDev+_feeMgmt+_feeStruct+_feeCustody+_feePreEst+_feeSpv+_feeAuditor+_feeOperator+_feeMisc : _feeDev;
      const gpNetCash = (w.gpTotalDist||0) + gpFeesTotal - (w.gpLandRentTotal||0);
      const gpNetProfit = gpNetCash - (w.gpTotalInvested||0);
      // Project-level land rent for this phase (shown when not GP-specific obligation)
      const phaseLR = pc?.totalLandRent || 0;
      const showLandRent = (w.gpLandRentTotal||0) > 0 || phaseLR > 0;
      const gpPctVal = w.gpPct||0;
      const lpPctVal = w.lpPct||0;
      const isLpOnlyPref = (w.prefAllocation||cfg.prefAllocation) === "lpOnly";
      const gpT1 = t1Total * gpPctVal;
      const gpT2 = isLpOnlyPref ? 0 : t2Total * gpPctVal;
      const lpT1 = t1Total * lpPctVal;
      const lpT2 = isLpOnlyPref ? t2Total : t2Total * lpPctVal;
      const lpNetCash = (w.lpTotalDist||0) - (w.lpTotalInvested||0);
      const lpStabYieldVal = lpCashYield.length > 0 && exitYr > 2 ? lpCashYield[Math.min(exitYr - 2, lpCashYield.length - 1)] : 0;
      const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};
      const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
      const KR = ({l,v,c,bold}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:bold?700:500,fontSize:11,color:c||"var(--text-primary)"}}>{v}</span></>;
      const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
      return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
        {/* ── GP (Developer) Card ── */}
        <div style={{background:kpiOpen.gp?"#fff":"linear-gradient(135deg, #eff6ff, #f0fdf4)",borderRadius:"var(--radius-lg)",border:kpiOpen.gp?"2px solid #3b82f6":"1px solid #bfdbfe",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,gp:!p.gp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"var(--color-info)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10,fontWeight:800}}>GP</span>
            <span style={{fontSize:11,fontWeight:700,color:"var(--zan-navy-700)",flex:1}}>{ar?"المطور":"Developer"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.gp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.gp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"صافي":"Net", fmtM(gpNetCash), "var(--color-success-text)")}
              {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
              {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"كمستثمر":"AS INVESTOR"} />
              <KR l={ar?"استرداد رأسمال (T1)":"Capital Return (T1)"} v={fmt(gpT1)} />
              <KR l={ar?"عائد مفضل (T2)":"Pref Return (T2)"} v={isLpOnlyPref?"—":fmt(gpT2)} />
              <SecHd text={ar?"كمطور":"AS DEVELOPER"} />
              <KR l={ar?"تعويض (T3)":"Catch-up (T3)"} v={fmt(t3Total)} c="var(--color-warning)" />
              <KR l={ar?"توزيع أرباح (T4)":"Profit Split (T4)"} v={fmt(t4GPTotal)} c="var(--color-success-text)" />
              <KR l={ar?"رسوم تطوير":"Dev Fee"} v={fmt(_feeDev)} c="var(--color-warning-text)" />
              {gpIsManager && <>
                <KR l={ar?"رسوم إدارة":"Mgmt Fee"} v={fmt(_feeMgmt)} c="var(--color-warning-text)" />
                <KR l={ar?"رسوم هيكلة":"Struct Fee"} v={fmt(_feeStruct)} c="var(--color-warning-text)" />
                <KR l={ar?"ما قبل التأسيس":"Pre-Est"} v={fmt(_feePreEst)} c="var(--color-warning-text)" />
                <KR l="SPV" v={fmt(_feeSpv)} c="var(--color-warning-text)" />
                <KR l={ar?"مراجع":"Auditor"} v={fmt(_feeAuditor)} c="var(--color-warning-text)" />
              </>}
              {showLandRent && <KR l={ar?((w.gpLandRentTotal||0)>0?"إيجار أرض (GP)":"إيجار أرض (مشروع)"):((w.gpLandRentTotal||0)>0?"Land Rent (GP)":"Land Rent (Project)")} v={`(${fmt((w.gpLandRentTotal||0) > 0 ? w.gpLandRentTotal : phaseLR)})`} c="var(--color-danger)" />}
              <SecHd text={ar?"الملخص":"NET SUMMARY"} />
              <KR l={ar?"حصة GP":"GP Equity"} v={fmt(w.gpTotalInvested)} bold />
              <KR l={ar?"توزيعات حافز الأداء":"Waterfall Dist"} v={fmt(w.gpTotalDist)} />
              <KR l={ar?"رسوم مستلمة":"Fees Received"} v={fmt(gpFeesTotal)} c="var(--color-warning-text)" />
              {(w.gpLandRentTotal||0)>0 && <KR l={ar?"إيجار أرض":"Land Rent"} v={`(${fmt(w.gpLandRentTotal)})`} c="var(--color-danger)" />}
              <KR l={ar?"صافي النقد":"Net Cash"} v={fmtM(gpNetCash)} c="var(--color-success-text)" bold />
              <KR l={ar?"صافي الربح":"Net Profit"} v={fmtM(gpNetProfit)} c={gpNetProfit>=0?"var(--color-success-text)":"var(--color-danger)"} bold />
              <SecHd text={ar?"المؤشرات":"METRICS"} />
              <div style={{gridColumn:"1/-1",display:"flex",gap:6,flexWrap:"wrap",paddingTop:4}}>
                {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
                {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
                {badge(ar?"استرداد":"Payback", gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—", "#6366f1")}
              </div>
            </div>
          )}
        </div>

        {/* ── LP (Investor) Card ── */}
        <div style={{background:kpiOpen.lp?"#fff":"linear-gradient(135deg, #faf5ff, #f5f3ff)",borderRadius:"var(--radius-lg)",border:kpiOpen.lp?"2px solid #8b5cf6":"1px solid #e9d5ff",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,lp:!p.lp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#8b5cf6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10,fontWeight:800}}>LP</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5b21b6",flex:1}}>{ar?"المستثمر":"Investor"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.lp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.lp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge("IRR", w.lpIRR!==null?fmtPct(w.lpIRR*100):"—", getMetricColor("IRR",w.lpIRR))}
              {badge("MOIC", w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.lpMOIC))}
              {badge(ar?"استرداد":"Payback", lpPayback?`Yr ${lpPayback}`:"—", "#6366f1")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"مصادر التوزيعات":"DISTRIBUTION SOURCES"} />
              <KR l={ar?"استرداد رأسمال (T1)":"Capital Return (T1)"} v={fmt(lpT1)} />
              <KR l={ar?"عائد مفضل (T2)":"Pref Return (T2)"} v={fmt(lpT2)} c="#8b5cf6" />
              <KR l={ar?"توزيع أرباح (T4)":"Profit Split (T4)"} v={fmt(t4LPTotal)} c="var(--color-success-text)" />
              <SecHd text={ar?"الصافي":"NET"} />
              <KR l={ar?"حصة LP":"LP Equity"} v={fmt(w.lpTotalInvested)} bold />
              <KR l={ar?"إجمالي التوزيعات":"Total Distributions"} v={fmt(w.lpTotalDist)} c="#8b5cf6" />
              <KR l={ar?"صافي النقد":"Net Cash"} v={fmtM(lpNetCash)} c={lpNetCash>=0?"var(--color-success-text)":"var(--color-danger)"} bold />
              <SecHd text={ar?"المؤشرات":"METRICS"} />
              <KR l="IRR" v={w.lpIRR!==null?fmtPct(w.lpIRR*100):"—"} c={getMetricColor("IRR",w.lpIRR)} bold />
              <KR l="MOIC" v={w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.lpMOIC)} bold />
              <KR l="DPI" v={w.lpDPI?w.lpDPI.toFixed(2)+"x":"—"} />
              <KR l={ar?"استرداد":"Payback"} v={lpPayback?`${lpPayback} ${ar?"سنة":"yr"}`:"—"} />
              <KR l={ar?"عائد نقدي":"Cash Yield"} v={lpStabYieldVal>0?fmtPct(lpStabYieldVal*100):"—"} />
              <SecHd text="NPV" />
              <KR l="@10%" v={fmtM(w.lpNPV10)} />
              <KR l="@12%" v={fmtM(w.lpNPV12)} c="#8b5cf6" bold />
              <KR l="@14%" v={fmtM(w.lpNPV14)} />
            </div>
          )}
        </div>

        {/* ── Fund Manager Card ── */}
        <div style={{background:kpiOpen.fund?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:"var(--radius-lg)",border:kpiOpen.fund?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,fund:!p.fund}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"var(--color-warning)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>📊</span>
            <span style={{fontSize:11,fontWeight:700,color:"var(--color-warning-text)",flex:1}}>{ar?"الصندوق":"Fund"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.fund?"▲":"▼"}</span>
          </div>
          {!kpiOpen.fund ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"رسوم":"Fees", fmtM(w.totalFees), "var(--color-warning)")}
              {badge(ar?"ملكية":"Equity", fmtM(w.totalEquity), "var(--color-info)")}
              {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${exitYr}`, "var(--color-success-text)")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"الرسوم":"FEES"} />
              <KR l={`${ar?"اكتتاب":"Subscription"} (${ar?"مرة":"once"})`} v={fmt(_feeSub)} c="var(--color-warning)" />
              <KR l={`${ar?"إدارة":"Management"} (${ar?"سنوي":"annual"})`} v={fmt(_feeMgmt)} c="var(--color-warning)" />
              <KR l={`${ar?"حفظ":"Custody"} (${ar?"سنوي":"annual"})`} v={fmt(_feeCustody)} c="var(--color-warning)" />
              <KR l={`${ar?"تطوير":"Developer"} (${ar?"مرة":"once"})`} v={fmt(_feeDev)} c="var(--color-warning)" />
              <KR l={`${ar?"هيكلة":"Structuring"} (${ar?"مرة+سقف":"once+cap"})`} v={fmt(_feeStruct)} c="var(--color-warning)" />
              <KR l={`${ar?"ما قبل التأسيس":"Pre-Est"} (${ar?"مرة":"once"})`} v={fmt(_feePreEst)} c="var(--color-warning)" />
              <KR l={`SPV (${ar?"مرة":"once"})`} v={fmt(_feeSpv)} c="var(--color-warning)" />
              <KR l={`${ar?"مراجع":"Auditor"} (${ar?"سنوي":"annual"})`} v={fmt(_feeAuditor)} c="var(--color-warning)" />
              {_feeOperator > 0 && <KR l={`${ar?"مشغل":"Operator"} (${ar?"سنوي":"annual"})`} v={fmt(_feeOperator)} c="var(--color-warning)" />}
              {_feeMisc > 0 && <KR l={`${ar?"أخرى":"Misc."} (${ar?"مرة":"once"})`} v={fmt(_feeMisc)} c="var(--color-warning)" />}
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #fde68a",paddingTop:4,marginTop:2,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
                <KR l={ar?"إجمالي الرسوم":"Total Fees"} v={fmtM(w.totalFees)} c="var(--color-warning)" bold />
              </div>
              <SecHd text={ar?"رأس المال":"CAPITAL"} />
              <KR l={ar?"إجمالي الملكية":"Total Equity"} v={fmtM(w.totalEquity)} bold />
              <KR l="LP / GP" v={`${fmtPct(lpPctVal*100)} / ${fmtPct(gpPctVal*100)}`} />
              <KR l={ar?"دين":"Debt"} v={f?.totalDebt ? fmtM(f.totalDebt) : "—"} c="var(--color-danger)" />
              <SecHd text={ar?"التخارج":"EXIT"} />
              <KR l={ar?"السنة":"Year"} v={exitYr>0?`${exitYr} (${sy+exitYr-1})`:"—"} />
              <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
              <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="var(--color-success-text)" />
              <KR l={ar?"تكاليف %":"Cost %"} v={exitCostPct>0?fmtPct(exitCostPct)+"%":"—"} />
              <SecHd text={ar?"إعدادات":"CONFIG"} />
              <KR l={ar?"معاملة الرسوم":"Fee Treatment"} v={({capital:ar?"رأسمالية":"Capital",expense:ar?"مصروفات":"Expense"})[cfg.feeTreatment||"capital"]||cfg.feeTreatment||"Capital"} />
              <KR l={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} v={({equity:ar?"ملكية":"Equity",nav:ar?"صافي الأصول":"NAV",commitment:ar?"الالتزام":"Commitment"})[cfg.mgmtFeeBase||"equity"]||cfg.mgmtFeeBase||"Equity"} />
            </div>
          )}
        </div>
      </div>;
    })()}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} waterfall={w} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT (if active) ═══ */}
    {!isFiltered && incentivesResult && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CHART TOGGLE ═══ */}
    {cfChartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setWSec(p=>({...p,chart:!p.chart}))} style={{...btnS,fontSize:11,padding:"6px 14px",background:wSec.chart?"#f0f4ff":"var(--surface-page)",color:wSec.chart?"var(--zan-teal-500)":"var(--text-secondary)",border:"1px solid "+(wSec.chart?"#93c5fd":"var(--border-default)"),borderRadius:"var(--radius-sm)",fontWeight:600}}>
          📈 {ar?"عرض الشارت":"Show Chart"} {wSec.chart?"▲":"▼"}
        </button>
        {wSec.chart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cfChartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="lpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--color-info)" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sidebar)" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"var(--text-secondary)"}} />
              <YAxis tick={{fontSize:10,fill:"var(--text-secondary)"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="lp" stroke="#8b5cf6" strokeWidth={2} fill="url(#lpG)" name="LP" dot={false} />
              <Area type="monotone" dataKey="gp" stroke="var(--color-info)" strokeWidth={2} fill="url(#gpG)" name="GP" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>
    )}

    {/* ═══ UNIFIED TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"تدفقات الصندوق":"Fund Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 7. PROJECT CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s7:!p.s7}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--color-success-text)",background:"var(--color-success-bg)",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{wSec.s7?"▶":"▼"} {ar?"7. تدفقات المشروع (غير ممول)":"7. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!wSec.s7 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="var(--color-success-text)" />
      <CFRow label={ar?"إيجار الأرض":"Land Rent"} values={pc.landRent} total={pc.totalLandRent ?? pc.landRent.reduce((a,b)=>a+b,0)} negate color="var(--color-danger)" />
      <CFRow label={ar?"تكلفة التطوير (CAPEX)":"Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="var(--color-danger)" />
      <CFRow label={ar?"صافي التدفق النقدي (غير ممول)":"Net Project CF (Unlevered)"} values={pc.netCF} total={pc.totalNetCF ?? pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 8. FUND CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s8:!p.s8}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--zan-teal-500)",background:"var(--color-info-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{wSec.s8?"▶":"▼"} {ar?"8. تدفقات الصندوق (ممول)":"8. FUND CASH FLOW (Levered)"}</td></tr>
      {!wSec.s8 && <>
      <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={w.equityCalls} total={w.equityCalls.reduce((a,b)=>a+b,0)} color="var(--color-danger)" negate />
      {f && <>
        <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={f.drawdown} total={f.drawdown?.reduce((a,b)=>a+b,0)||0} />
        <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={f.debtBalOpen} total={null} />
        <CFRow label={ar?"سداد أصل الدين":"Debt Repayment"} values={f.repayment} total={f.repayment?.reduce((a,b)=>a+b,0)||0} negate color="var(--color-danger)" />
        <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={f.debtBalClose} total={null} />
        <CFRow label={ar?"تكلفة التمويل (فائدة)":"Interest/Profit"} values={f.interest} total={f.totalInterest||0} negate color="var(--color-danger)" />
        <CFRow label={ar?"إجمالي خدمة الدين":"Total Debt Service"} values={f.debtService} total={f.debtService?.reduce((a,b)=>a+b,0)||0} negate bold color="var(--color-danger)" />
        {/* DSCR */}
        {f.dscr && <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontWeight:500,minWidth:isMobile?120:200,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>DSCR</td>
          <td style={tdN}></td>
          {years.map(y=>{const v=f.dscr?.[y];return <td key={y} style={{...tdN,fontSize:10,fontWeight:v&&v<1.2?700:500,color:getMetricColor("DSCR",v)}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
        </tr>}
      </>}

      {/* Fees sub-section */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"var(--color-warning)",background:"var(--color-warning-bg)",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"الرسوم":"FEES"}</td></tr>
      {(w.feeSub||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"اكتتاب":"Subscription Fee"}`} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeMgmt||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"إدارة":"Management Fee"}`} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeCustody||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"حفظ":"Custody Fee"}`} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeDev||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"تطوير":"Developer Fee"}`} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeStruct||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"هيكلة":"Structuring Fee"}`} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feePreEst||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"ما قبل التأسيس":"Pre-Establishment"}`} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeSpv||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"SPV":"SPV Setup"}`} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeAuditor||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مراجع حسابات":"Auditor Fee"}`} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeOperator||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"أتعاب المشغل":"Operator Fee"}`} values={w.feeOperator} total={(w.feeOperator||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      {(w.feeMisc||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مصروفات أخرى":"Misc. Expenses"}`} values={w.feeMisc} total={(w.feeMisc||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
      <CFRow label={ar?"إجمالي الرسوم":"Total Fees"} values={w.fees} total={w.totalFees} bold negate color="var(--color-warning)" />
      {(w.unfundedFees||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"}`} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
      <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={w.exitProceeds} total={exitProc} color="var(--color-success-text)" />
      </>}

      {/* ═══ § 9. DISTRIBUTIONS & WATERFALL ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s9:!p.s9}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#7c3aed",background:"#f5f3ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #8b5cf6",userSelect:"none"}}>{wSec.s9?"▶":"▼"} {ar?"9. التوزيعات وشلال الأرباح":"9. DISTRIBUTIONS & WATERFALL"}</td></tr>
      {!wSec.s9 && <>
      <CFRow label={ar?"النقد المتاح للتوزيع":"Cash Available for Distribution"} values={w.cashAvail} total={w.cashAvail.reduce((a,b)=>a+b,0)} bold color="var(--color-success-text)" />

      {/* Unreturned Capital tracking */}
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"var(--color-info)",paddingInlineStart:20}}>{ar?"رأس المال غير المسترد (بداية)":"Unreturned Capital (Open)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"var(--color-info)",fontSize:10}}>{(w.unreturnedOpen[y]||0)===0?"—":fmt(w.unreturnedOpen[y])}</td>)}
      </tr>
      <CFRow label={ar?"T1: رد رأس المال":"T1: Return of Capital"} values={w.tier1} total={t1Total} color="var(--zan-teal-500)" />
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"var(--color-info)",paddingInlineStart:20,fontWeight:500}}>{ar?"رأس المال غير المسترد (نهاية)":"Unreturned Capital (Close)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:w.unreturnedClose[y]>0?"var(--color-info)":"var(--color-success-text)",fontSize:10,fontWeight:w.unreturnedClose[y]===0?600:400}}>{w.unreturnedClose[y]===0?"✓ 0":fmt(w.unreturnedClose[y])}</td>)}
      </tr>

      {/* Pref tracking */}
      <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontSize:10,color:"#8b5cf6",paddingInlineStart:20}}>{ar?"استحقاق العائد التفضيلي":"Pref Accrual"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"#8b5cf6",fontSize:10}}>{(w.prefAccrual[y]||0)===0?"—":fmt(w.prefAccrual[y])}</td>)}
      </tr>
      <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"العائد التفضيلي المتراكم":"Unpaid Pref (Accumulated)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:(w.prefAccumulated[y]||0)>0?"#7c3aed":"var(--color-success-text)",fontSize:10,fontWeight:(w.prefAccumulated[y]||0)===0?600:400}}>{(w.prefAccumulated[y]||0)===0?"✓ 0":fmt(w.prefAccumulated[y])}</td>)}
      </tr>
      <CFRow label={ar?"T2: العائد التفضيلي":"T2: Preferred Return"} values={w.tier2} total={t2Total} color="#8b5cf6" />

      {/* Remaining + T3/T4 */}
      {(() => { const rem = new Array(h).fill(0); for(let y=0;y<h;y++) rem[y]=Math.max(0,(w.cashAvail[y]||0)-(w.tier1[y]||0)-(w.tier2[y]||0)); const tot=rem.reduce((a,b)=>a+b,0); return tot>0?<CFRow label={ar?"المتبقي بعد ROC + Pref":"Remaining After ROC + Pref"} values={rem} total={tot} bold />:null; })()}
      <CFRow label={ar?"T3: تعويض المطور":"T3: GP Catch-up"} values={w.tier3} total={t3Total} color="var(--color-warning)" />
      <CFRow label={ar?"T4: توزيع الأرباح":"T4: Profit Split"} values={(() => { const a=new Array(h).fill(0); for(let y=0;y<h;y++) a[y]=(w.tier4LP[y]||0)+(w.tier4GP[y]||0); return a; })()} total={t4LPTotal+t4GPTotal} color="var(--color-success-text)" />
      <tr style={{background:"var(--color-success-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-success-bg)",zIndex:1,fontSize:10,color:"var(--color-success-text)",paddingInlineStart:24}}>→ LP ({cfg.lpProfitSplitPct||75}%)</td>
        <td style={{...tdN,fontSize:10,color:"var(--color-success-text)"}}>{fmt(t4LPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"var(--color-success-text)"}}>{(w.tier4LP[y]||0)===0?"—":fmt(w.tier4LP[y])}</td>)}
      </tr>
      <tr style={{background:"var(--color-success-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-success-bg)",zIndex:1,fontSize:10,color:"var(--color-info)",paddingInlineStart:24}}>→ GP ({100-(cfg.lpProfitSplitPct||75)}%)</td>
        <td style={{...tdN,fontSize:10,color:"var(--color-info)"}}>{fmt(t4GPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"var(--color-info)"}}>{(w.tier4GP[y]||0)===0?"—":fmt(w.tier4GP[y])}</td>)}
      </tr>

      {/* Distribution totals */}
      <CFRow label={ar?"إجمالي توزيعات LP":"Total LP Distributions"} values={w.lpDist} total={w.lpTotalDist} bold color="#8b5cf6" />
      <CFRow label={ar?"إجمالي توزيعات GP":"Total GP Distributions"} values={w.gpDist} total={w.gpTotalDist} bold color="var(--color-info)" />
      </>}

      {/* ═══ § 10. INVESTOR RETURNS ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s10:!p.s10}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--color-warning-text)",background:"var(--color-warning-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ca8a04",userSelect:"none"}}>{wSec.s10?"▶":"▼"} {ar?"10. عوائد المستثمر":"10. INVESTOR RETURNS"}</td></tr>
      {!wSec.s10 && <>
      <CFRow label={ar?"صافي CF المستثمر (LP)":"LP Net Cash Flow"} values={w.lpNetCF} total={w.lpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:600,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"↳ تراكمي LP":"↳ LP Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.lpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"var(--color-danger)":"var(--color-success-text)"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.lpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي LP %":"LP Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=lpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"var(--color-success-text)":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}

      <CFRow label={ar?"صافي CF المطور (GP)":"GP Net Cash Flow"} values={w.gpNetCF} total={w.gpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"var(--color-info-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-info-bg)",zIndex:1,fontWeight:600,fontSize:10,color:"var(--zan-navy-700)",paddingInlineStart:20}}>{ar?"↳ تراكمي GP":"↳ GP Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.gpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"var(--color-danger)":"var(--color-success-text)"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.gpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي GP %":"GP Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=gpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"var(--color-success-text)":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
      </>}

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);

}

// ═══════════════════════════════════════════════════════════════
// EXIT ANALYSIS PANEL (shared by all Results views, collapsible)
// ═══════════════════════════════════════════════════════════════
function ExitAnalysisPanel({ project, results, financing, waterfall, lang, globalExpand }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  const f = financing;
  if (!f || !results) return null;

  const c = results.consolidated;
  const h = results.horizon;
  const sy = results.startYear;
  const cur = project.currency || "SAR";
  const strategy = project.exitStrategy || "sale";
  const isHold = strategy === "hold";
  const exitYearAbs = f.exitYear || 0;
  const exitYrIdx = exitYearAbs > 0 ? exitYearAbs - sy : 0;
  const exitProc = f.exitProceeds ? f.exitProceeds.reduce((a,b)=>a+b,0) : 0;

  // If hold and no exit proceeds, still show but with hold info
  if (isHold && exitProc <= 0) {
    return (
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"1px solid #f59e0b22",marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08"}}>
          <span style={{fontSize:14}}>🚪</span>
          <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"استراتيجية التخارج":"Exit Strategy"}</span>
          <span style={{fontSize:10,fontWeight:600,color:"var(--color-warning)",background:"#f59e0b18",padding:"2px 8px",borderRadius:"var(--radius-lg)"}}>{ar?"احتفاظ بالدخل":"Hold for Income"}</span>
        </div>
      </div>
    );
  }
  if (exitProc <= 0) return null;

  // Compute exit details
  const exitMult = project.exitMultiple || 10;
  const exitCostPct = project.exitCostPct || 2;
  const exitCapRate = project.exitCapRate || 9;
  const isSale = strategy === "sale";
  const isCapRate = strategy === "caprate";

  // Stabilized income & NOI at exit
  const stabIncome = exitYrIdx >= 0 && exitYrIdx < h ? (c.income[exitYrIdx] || 0) : 0;
  const stabLandRent = exitYrIdx >= 0 && exitYrIdx < h ? (c.landRent[exitYrIdx] || 0) : 0;
  const stabNOI = stabIncome - stabLandRent;

  // Gross exit value (before cost deduction)
  const grossExit = exitCostPct > 0 ? exitProc / (1 - exitCostPct/100) : exitProc;
  const exitCostAmt = grossExit - exitProc;

  // Implied cap rate and implied multiple
  const impliedCapRate = stabNOI > 0 ? (stabNOI / grossExit) * 100 : 0;
  const impliedMultiple = stabIncome > 0 ? grossExit / stabIncome : 0;

  // Debt remaining at exit
  const debtAtExit = f.debtBalClose ? (exitYrIdx > 0 && exitYrIdx < h ? (f.debtBalClose[Math.max(0,exitYrIdx-1)] || 0) : 0) : 0;
  const netToEquity = exitProc - debtAtExit;

  // Years from construction end to exit
  const constrEnd = f.constrEnd || 0;
  const holdPeriod = exitYrIdx - constrEnd;

  // Dev cost ratio
  const devCost = f.devCostInclLand || c.totalCapex;
  const returnOnCost = devCost > 0 ? exitProc / devCost : 0;

  // Fund-specific: LP/GP exit share
  const w = waterfall;
  const hasWaterfall = w && w.lpTotalDist > 0;

  return (
    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:`1px solid ${open?"#f59e0b33":"#f59e0b22"}`,marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08",borderBottom:open?"1px solid #f59e0b18":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🚪</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تحليل التخارج":"Exit Analysis"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"var(--color-warning)",background:"#f59e0b18",padding:"2px 8px",borderRadius:"var(--radius-lg)"}}>
          {isSale ? `${exitMult}x · ` : isCapRate ? `${exitCapRate}% CR · ` : ""}{exitYearAbs} · {fmtM(exitProc)}
        </span>
        <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Row 1: Strategy + Valuation */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:10,marginBottom:14}}>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"الاستراتيجية":"Strategy"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?(ar?"بيع (مضاعف)":"Sale (Multiple)"):isCapRate?(ar?"بيع (رسملة)":"Sale (Cap Rate)"):(ar?"احتفاظ":"Hold")}</div>
          </div>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"سنة التخارج":"Exit Year"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{exitYearAbs} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>({ar?"سنة":"Yr"} {exitYrIdx+1})</span></div>
          </div>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"فترة الاحتفاظ":"Hold Period"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{holdPeriod > 0 ? `${holdPeriod} ${ar?"سنة بعد البناء":"yr post-build"}` : "—"}</div>
          </div>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{isSale?(ar?"المضاعف":"Multiple"):(ar?"معدل الرسملة":"Cap Rate")}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?`${exitMult}x`:isCapRate?`${exitCapRate}%`:"—"}</div>
          </div>
        </div>

        {/* Row 2: Value breakdown */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
          {/* Valuation */}
          <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",padding:"10px 14px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:10,fontWeight:700,color:"var(--color-warning-text)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"التقييم":"VALUATION"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"دخل مستقر":"Stabilized Income"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(stabIncome)}</span>
              {stabLandRent > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"(-) إيجار أرض":"(-) Land Rent"}</span><span style={{textAlign:"right",fontWeight:500,color:"var(--color-danger)"}}>{fmt(stabLandRent)}</span></>}
              {stabNOI !== stabIncome && <><span style={{color:"var(--text-secondary)"}}>= NOI</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(stabNOI)}</span></>}
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,color:"var(--text-secondary)"}}>{isSale?`× ${exitMult}x`:isCapRate?`÷ ${exitCapRate}%`:""}</span>
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,textAlign:"right",fontWeight:700,color:"var(--text-primary)"}}>{fmtM(grossExit)}</span>
              <span style={{color:"var(--color-danger)",fontSize:11}}>{ar?"(-) تكاليف التخارج":"(-) Exit Costs"} ({exitCostPct}%)</span><span style={{textAlign:"right",color:"var(--color-danger)"}}>{fmt(exitCostAmt)}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,fontWeight:700,color:"var(--color-success-text)"}}>{ar?"= صافي العائد":"= Net Proceeds"}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,textAlign:"right",fontWeight:800,fontSize:14,color:"var(--color-success-text)"}}>{fmtM(exitProc)}</span>
            </div>
          </div>

          {/* Returns */}
          <div style={{background:"var(--color-success-bg)",borderRadius:"var(--radius-md)",padding:"10px 14px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#166534",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"مؤشرات التخارج":"EXIT METRICS"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"العائد / التكلفة":"Proceeds / Dev Cost"}</span><span style={{textAlign:"right",fontWeight:700,color:returnOnCost>1?"var(--color-success-text)":"var(--color-danger)"}}>{returnOnCost.toFixed(2)}x</span>
              {impliedCapRate > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"معدل رسملة ضمني":"Implied Cap Rate"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedCapRate.toFixed(1)}%</span></>}
              {impliedMultiple > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"مضاعف ضمني":"Implied Multiple"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedMultiple.toFixed(1)}x</span></>}
              {debtAtExit > 0 && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"var(--color-danger)"}}>{ar?"دين متبقي عند التخارج":"Debt at Exit"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"var(--color-danger)"}}>{fmtM(debtAtExit)}</span>
                <span style={{color:"var(--color-success-text)",fontWeight:600}}>{ar?"صافي للملكية":"Net to Equity"}</span><span style={{textAlign:"right",fontWeight:700,color:netToEquity>0?"var(--color-success-text)":"var(--color-danger)"}}>{fmtM(netToEquity)}</span>
              </>}
              {f.totalEquity > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"العائد / الملكية":"Proceeds / Equity"}</span><span style={{textAlign:"right",fontWeight:600,color:"var(--color-success-text)"}}>{(exitProc/f.totalEquity).toFixed(2)}x</span></>}
              {hasWaterfall && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"#8b5cf6"}}>{ar?"حصة LP من التخارج":"LP Exit Share"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"#8b5cf6"}}>{fmtM((w.lpDist||[]).slice(exitYrIdx).reduce((a,b)=>a+b,0))}</span>
                <span style={{color:"var(--color-info)"}}>{ar?"حصة GP من التخارج":"GP Exit Share"}</span><span style={{textAlign:"right",fontWeight:500,color:"var(--color-info)"}}>{fmtM((w.gpDist||[]).slice(exitYrIdx).reduce((a,b)=>a+b,0))}</span>
              </>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCENTIVES IMPACT PANEL (shared by all Results views)
// ═══════════════════════════════════════════════════════════════
function IncentivesImpact({ project, results, financing, incentivesResult, lang, globalExpand }) {
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  const ir = incentivesResult;
  if (!ir || !financing) return null;
  const hasAny = (ir.capexGrantTotal||0) > 0 || (ir.interestSubsidyTotal||0) > 0 || (ir.landRentSavingTotal||0) > 0 || (ir.feeRebateTotal||0) > 0;
  if (!hasAny) return null;

  const cur = project.currency || "SAR";
  const c = results.consolidated;
  const f = financing;
  const h = results.horizon;

  // Compute base IRR (WITHOUT incentives) using original CF
  const baseCF = new Array(h).fill(0);
  if (f.mode === "self") {
    // Self: base = raw netCF (no incentive adjustments)
    for (let y = 0; y < h; y++) baseCF[y] = c.income[y] - c.landRent[y] - c.capex[y];
    // Add exit if present
    if (f.exitProceeds) for (let y = 0; y < h; y++) baseCF[y] += f.exitProceeds[y] || 0;
  } else {
    // Debt/Fund: levered base using original (non-adjusted) values
    for (let y = 0; y < h; y++) baseCF[y] = c.income[y] - c.landRent[y] - c.capex[y] - (f.debtService[y]||0) + (f.drawdown[y]||0) + (f.exitProceeds?.[y]||0);
  }
  const baseIRR = calcIRR(baseCF);
  const baseNPV = calcNPV(baseCF, 0.12);
  const withIRR = f.leveredIRR;
  const withNPV = f.leveredCF ? calcNPV(f.leveredCF, 0.12) : null;
  const irrDelta = (withIRR !== null && baseIRR !== null) ? (withIRR - baseIRR) * 100 : null;
  const npvDelta = (withNPV !== null && baseNPV !== null) ? withNPV - baseNPV : null;
  const total = ir.totalIncentiveValue || ((ir.capexGrantTotal||0) + (ir.interestSubsidyTotal||0) + (ir.landRentSavingTotal||0) + (ir.feeRebateTotal||0));

  const items = [
    ir.capexGrantTotal > 0 && { icon: "🏗", label: ar?"منحة CAPEX":"CAPEX Grant", value: ir.capexGrantTotal, color: "var(--color-success)" },
    ir.interestSubsidyTotal > 0 && { icon: "🏦", label: ar?"دعم الفوائد":"Interest Subsidy", value: ir.interestSubsidyTotal, color: "var(--zan-teal-500)" },
    ir.landRentSavingTotal > 0 && { icon: "🏠", label: ar?"وفر إيجار الأرض":"Land Rent Savings", value: ir.landRentSavingTotal, color: "#7c3aed" },
    ir.feeRebateTotal > 0 && { icon: "📋", label: ar?"إعفاء رسوم":"Fee Rebates", value: ir.feeRebateTotal, color: "var(--color-warning)" },
  ].filter(Boolean);

  return (
    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"1px solid #05966933",marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#05966908",borderBottom:open?"1px solid #05966918":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🏛</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"أثر الحوافز الحكومية":"Government Incentives Impact"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"var(--color-success)",background:"#05966918",padding:"2px 8px",borderRadius:"var(--radius-lg)"}}>{fmtM(total)} {cur}</span>
        <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Active incentives */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {items.map((it,i) => (
            <div key={i} style={{display:"inline-flex",alignItems:"center",gap:6,background:it.color+"12",border:`1px solid ${it.color}33`,borderRadius:"var(--radius-sm)",padding:"5px 10px"}}>
              <span style={{fontSize:12}}>{it.icon}</span>
              <span style={{fontSize:11,fontWeight:600,color:it.color}}>{it.label}</span>
              <span style={{fontSize:11,fontWeight:700,color:"var(--text-primary)"}}>{fmtM(it.value)}</span>
            </div>
          ))}
        </div>

        {/* Before/After comparison */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
          {/* Without */}
          <div style={{background:"var(--color-danger-bg)",borderRadius:"var(--radius-md)",padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"var(--color-danger)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"بدون حوافز":"WITHOUT INCENTIVES"}</div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--color-danger)"}}>{baseIRR!==null?fmtPct(baseIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)"}}>{fmtM(baseNPV)}</div>
          </div>

          {/* Arrow + Delta */}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:18,color:"var(--color-success)"}}>→</div>
            {irrDelta !== null && <div style={{fontSize:11,fontWeight:700,color:"var(--color-success)",marginTop:4}}>+{irrDelta.toFixed(2)}%</div>}
            {npvDelta !== null && npvDelta > 0 && <div style={{fontSize:10,color:"var(--color-success)"}}>+{fmtM(npvDelta)}</div>}
          </div>

          {/* With */}
          <div style={{background:"var(--color-success-bg)",borderRadius:"var(--radius-md)",padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"var(--color-success)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"مع حوافز":"WITH INCENTIVES"}</div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--color-success-text)"}}>{withIRR!==null?fmtPct(withIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--color-success-text)"}}>{withNPV!==null?fmtM(withNPV):""}</div>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESULTS VIEW - Dynamic smart results page based on financing mode
// ═══════════════════════════════════════════════════════════════
function ResultsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const ar = lang === "ar";
  if (!project || !results) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>{ar?"أضف أصول لرؤية النتائج":"Add assets to see results"}</div>;

  const mode = project.finMode || financing?.mode || "self";

  // ── FUND MODE: WaterfallView (incentives injected inside) ──
  if (mode === "fund") {
    return <WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── BANK DEBT / BANK 100%: Full bank results ──
  if (mode === "debt" || mode === "bank100") {
    return <BankResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── SELF: Full self-funded results ──
  return <SelfResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
}

// ═══════════════════════════════════════════════════════════════
// SELF-FUNDED RESULTS VIEW
// ═══════════════════════════════════════════════════════════════
function SelfResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [showChart, setShowChart] = useState(false);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  const [kpiOpen, setKpiOpen] = useState({proj:false,cap:false,ret:false});
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowChart(expand); setKpiOpen({proj:expand,cap:expand,ret:expand}); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);

  // ── Phase filter ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const h = results.horizon;
  const sy = results.startYear;
  const cur = project.currency || "SAR";
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);

  // ── Filtered consolidated ──
  const c = useMemo(() => {
    if (!isFiltered) return results.consolidated;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return { ...results.consolidated, income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF, 0.10),
    };
  }, [isFiltered, selectedPhases, results, h]);

  // ── Filtered financing ──
  const f = useMemo(() => {
    if (!isFiltered || !phaseFinancings) return financing;
    const pfs = activePh.map(p => phaseFinancings[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.leveredCF) for (let y=0;y<h;y++) leveredCF[y] += pf.leveredCF[y]||0; });
    const exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.exitProceeds) for (let y=0;y<h;y++) exitProceeds[y] += pf.exitProceeds[y]||0; });
    return { ...financing,
      leveredCF, exitProceeds, leveredIRR: calcIRR(leveredCF),
      devCostInclLand: pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0),
      devCostExclLand: pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0),
      totalDebt: pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0),
      totalEquity: pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0),
      landCapValue: pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0),
      constrEnd: Math.max(...pfs.map(pf => pf.constrEnd || 0)),
      exitYear: Math.max(...pfs.map(pf => pf.exitYear || 0)),
    };
  }, [isFiltered, selectedPhases, financing, phaseFinancings, h]);

  const levIRR = f?.leveredIRR ?? c.irr;
  const exitProc = f?.exitProceeds ? f.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const exitYear = f?.exitYear || 0;
  const totalCapex = c.totalCapex;
  const totalIncome = c.totalIncome;
  const devCost = f?.devCostInclLand || totalCapex;
  const levCF = f?.leveredCF || c.netCF;
  const totalLevCF = levCF.reduce((a,b)=>a+b,0);

  // Payback
  const payback = (() => { let cum=0, wasNeg=false; for(let y=0;y<h;y++){cum+=levCF[y]||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return y+1;} return null; })();

  // NOI
  const noiArr = new Array(h).fill(0);
  for (let y=0;y<h;y++) noiArr[y] = (c.income[y]||0) - (c.landRent[y]||0);
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);

  // Yield on cost & stabilized
  const constrEnd = f?.constrEnd || 0;
  const stabIdx = Math.min(constrEnd+2, h-1);
  const stabNOI = noiArr[stabIdx] || 0;
  const yieldOnCost = totalCapex > 0 ? stabNOI / totalCapex : 0;
  const stabIncome = c.income[stabIdx] || 0;

  // Peak capital deployed (max cumulative negative CF)
  let peakCap = 0, cumCF = 0;
  for (let y=0;y<h;y++) { cumCF += levCF[y]||0; if (cumCF < peakCap) peakCap = cumCF; }
  peakCap = Math.abs(peakCap);

  // Capital deployed per year (cumulative CAPEX - cumulative income, floored at 0)
  const capitalDeployed = new Array(h).fill(0);
  let cumCapex=0, cumInc=0;
  for (let y=0;y<h;y++) { cumCapex+=c.capex[y]||0; cumInc+=c.income[y]||0; capitalDeployed[y]=Math.max(0,cumCapex-cumInc); }

  // Incentives
  const ir = incentivesResult;
  const hasIncentives = ir && ((ir.capexGrantTotal||0) > 0 || (ir.landRentSavingTotal||0) > 0 || (ir.feeRebateTotal||0) > 0);
  const incentiveTotal = hasIncentives ? (ir.capexGrantTotal||0)+(ir.landRentSavingTotal||0)+(ir.feeRebateTotal||0) : 0;

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    income: c.income[y]||0,
    capex: c.capex[y]||0,
    net: levCF[y]||0,
    cumCF: (() => { let s=0; for(let i=0;i<=y;i++) s+=levCF[i]||0; return s; })(),
  }));

  // Shared mini-components (same as Bank/Fund KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c:clr,bold:b}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:clr||"var(--text-primary)"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"var(--surface-page)"} : {};
    const nc = v => { if(color) return color; return v<0?"var(--color-danger)":v>0?"var(--text-primary)":"var(--text-tertiary)"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"var(--surface-page)":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {allPhaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* ═══ EXPANDABLE KPI CARDS: Project | Capital | Returns ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* ── 🏠 Project Card ── */}
      <div style={{background:kpiOpen.proj?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:"var(--radius-lg)",border:kpiOpen.proj?"2px solid #16a34a":"1px solid #86efac",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,proj:!p.proj}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"var(--color-success-text)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>🏠</span>
          <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"المشروع":"Project"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.proj?"▲":"▼"}</span>
        </div>
        {!kpiOpen.proj ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"تكلفة":"Cost", fmtM(devCost), "var(--text-primary)")}
            {badge(ar?"إيرادات":"Revenue", fmtM(totalIncome), "var(--color-success-text)")}
            {badge("NOI", fmtM(totalNOI), "var(--color-success)")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"التكاليف":"COSTS"} />
            <KR l={ar?"تكلفة التطوير":"Dev Cost"} v={fmtM(devCost)} bold />
            <KR l="CAPEX" v={fmtM(totalCapex)} />
            <KR l={ar?"إيجار الأرض":"Land Rent"} v={fmtM(c.totalLandRent)} c="var(--color-danger)" />
            {f?.landCapValue > 0 && <KR l={ar?"رسملة حق الانتفاع":"Leasehold Cap"} v={fmtM(f.landCapValue)} />}
            <SecHd text={ar?"الإيرادات":"REVENUE"} />
            <KR l={ar?"إجمالي الإيرادات":"Total Revenue"} v={fmtM(totalIncome)} c="var(--color-success-text)" bold />
            <KR l={ar?"دخل مستقر (NOI)":"Stabilized NOI"} v={fmt(stabNOI)} c="var(--color-success)" />
            <KR l={ar?"عائد على التكلفة":"Yield on Cost"} v={yieldOnCost>0?fmtPct(yieldOnCost*100):"—"} c={yieldOnCost>0.08?"var(--color-success-text)":"var(--color-warning)"} />
            <KR l={ar?"الأفق":"Horizon"} v={`${h} ${ar?"سنة":"yrs"}`} />
            {hasIncentives && !isFiltered && <><SecHd text={ar?"حوافز":"INCENTIVES"} /><KR l={ar?"إجمالي الحوافز":"Total Incentives"} v={fmtM(incentiveTotal)} c="var(--color-success)" bold /></>}
          </div>
        )}
      </div>

      {/* ── 💰 Capital Card ── */}
      <div style={{background:kpiOpen.cap?"#fff":"linear-gradient(135deg, #eff6ff, #e0f2fe)",borderRadius:"var(--radius-lg)",border:kpiOpen.cap?"2px solid #2563eb":"1px solid #93c5fd",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,cap:!p.cap}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"var(--btn-primary-bg)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>💰</span>
          <span style={{fontSize:11,fontWeight:700,color:"var(--zan-navy-700)",flex:1}}>{ar?"رأس المال":"Capital"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.cap?"▲":"▼"}</span>
        </div>
        {!kpiOpen.cap ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"مطلوب":"Required", fmtM(devCost), "var(--zan-teal-500)")}
            {badge(ar?"ذروة":"Peak", fmtM(peakCap), "#dc2626")}
            {badge(ar?"استرداد":"Payback", payback?`Yr ${payback}`:"—", "#6366f1")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"الحاجة الرأسمالية":"CAPITAL NEEDS"} />
            <KR l={ar?"إجمالي مطلوب":"Total Required"} v={fmtM(devCost)} c="var(--zan-teal-500)" bold />
            <KR l={ar?"ذروة رأس المال المجمد":"Peak Capital Locked"} v={fmtM(peakCap)} c="#dc2626" bold />
            <KR l={ar?"فترة البناء":"Construction"} v={`${constrEnd+1} ${ar?"سنة":"yrs"}`} />
            <SecHd text={ar?"الاسترداد":"RECOVERY"} />
            <KR l={ar?"فترة الاسترداد":"Payback Period"} v={payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"} c="var(--zan-teal-500)" bold />
            <KR l={ar?"صافي التدفق":"Total Net CF"} v={fmtM(totalLevCF)} c={totalLevCF>0?"var(--color-success-text)":"var(--color-danger)"} />
            {exitProc > 0 && <KR l={ar?"عائد التخارج":"Exit Proceeds"} v={fmtM(exitProc)} c="var(--color-success-text)" />}
            <SecHd text={ar?"تكلفة الفرصة البديلة":"OPPORTUNITY COST"} />
            <KR l={ar?"لو استثمرت بـ 5% سنوي":"If invested @5%/yr"} v={fmtM(devCost * Math.pow(1.05, payback||10) - devCost)} c="var(--text-secondary)" />
            <KR l={ar?"لو استثمرت بـ 8% سنوي":"If invested @8%/yr"} v={fmtM(devCost * Math.pow(1.08, payback||10) - devCost)} c="var(--text-secondary)" />
          </div>
        )}
      </div>

      {/* ── 📈 Returns Card ── */}
      <div style={{background:kpiOpen.ret?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:"var(--radius-lg)",border:kpiOpen.ret?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,ret:!p.ret}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"var(--color-warning)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>📈</span>
          <span style={{fontSize:11,fontWeight:700,color:"var(--color-warning-text)",flex:1}}>{ar?"العوائد":"Returns"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.ret?"▲":"▼"}</span>
        </div>
        {!kpiOpen.ret ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge("IRR", levIRR!==null?fmtPct(levIRR*100):"—", getMetricColor("IRR",levIRR))}
            {badge(ar?"صافي":"Net", fmtM(totalLevCF), totalLevCF>0?"var(--color-success-text)":"var(--color-danger)")}
            {exitProc>0 && badge(ar?"تخارج":"Exit", fmtM(exitProc), "var(--color-warning)")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"المؤشرات":"METRICS"} />
            <KR l="IRR" v={levIRR!==null?fmtPct(levIRR*100):"N/A"} c={getMetricColor("IRR",levIRR)} bold />
            <KR l={ar?"عائد على التكلفة":"Yield on Cost"} v={yieldOnCost>0?fmtPct(yieldOnCost*100):"—"} c={yieldOnCost>0.08?"var(--color-success-text)":"var(--text-secondary)"} />
            <KR l={ar?"استرداد":"Payback"} v={payback?`${payback} ${ar?"سنة":"yr"}`:"—"} c="var(--zan-teal-500)" />
            {exitProc>0 && <KR l={ar?"العائد / التكلفة":"Return / Cost"} v={(exitProc/devCost).toFixed(2)+"x"} c={exitProc/devCost>1?"var(--color-success-text)":"var(--color-danger)"} bold />}
            <SecHd text="NPV" />
            <KR l="@10%" v={fmtM(calcNPV(levCF,0.10))} />
            <KR l="@12%" v={fmtM(calcNPV(levCF,0.12))} c="var(--zan-teal-500)" bold />
            <KR l="@14%" v={fmtM(calcNPV(levCF,0.14))} />
            <SecHd text={ar?"فحوصات":"CHECKS"} />
            <KR l="IRR > 12%" v={levIRR>0.12?"✅":"❌"} c={levIRR>0.12?"var(--color-success-text)":"var(--color-danger)"} />
            <KR l="NPV@12% > 0" v={calcNPV(levCF,0.12)>0?"✅":"❌"} c={calcNPV(levCF,0.12)>0?"var(--color-success-text)":"var(--color-danger)"} />
            <KR l={ar?"صافي إيجابي":"Net CF > 0"} v={totalLevCF>0?"✅":"❌"} c={totalLevCF>0?"var(--color-success-text)":"var(--color-danger)"} />
            <KR l={ar?"عائد > 8%":"Yield > 8%"} v={yieldOnCost>0.08?"✅":"❌"} c={yieldOnCost>0.08?"var(--color-success-text)":"var(--color-danger)"} />
          </div>
        )}
      </div>
    </div>
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT ═══ */}
    {!isFiltered && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CF CHART (Revenue + CAPEX + Cumulative) ═══ */}
    {chartData.length > 2 && (
      <div style={{marginBottom:16}}>
        <button onClick={()=>setShowChart(!showChart)} style={{...btnS,fontSize:11,padding:"6px 14px",background:showChart?"#f0fdf4":"var(--surface-page)",color:showChart?"var(--color-success-text)":"var(--text-secondary)",border:"1px solid "+(showChart?"#86efac":"var(--border-default)"),borderRadius:"var(--radius-sm)",fontWeight:600}}>
          📈 {ar?"رسم بياني":"Cash Flow Chart"} {showChart?"▲":"▼"}
        </button>
        {showChart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="incSG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-success-text)" stopOpacity={0.1}/><stop offset="95%" stopColor="var(--color-success-text)" stopOpacity={0}/></linearGradient>
                <linearGradient id="cumSG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--zan-teal-500)" stopOpacity={0.1}/><stop offset="95%" stopColor="var(--zan-teal-500)" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sidebar)" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"var(--text-secondary)"}} />
              <YAxis tick={{fontSize:10,fill:"var(--text-secondary)"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(Math.abs(v))} />
              <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="income" stroke="var(--color-success-text)" strokeWidth={2} fill="url(#incSG)" name={ar?"الإيرادات":"Revenue"} dot={false} />
              <Area type="monotone" dataKey="capex" stroke="var(--color-danger)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="CAPEX" dot={false} />
              <Area type="monotone" dataKey="cumCF" stroke="var(--zan-teal-500)" strokeWidth={2.5} fill="url(#cumSG)" name={ar?"تراكمي":"Cumulative"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10}}>
            <span><span style={{display:"inline-block",width:12,height:3,background:"var(--color-success-text)",borderRadius:2,marginInlineEnd:4}} />{ar?"الإيرادات":"Revenue"}</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"var(--color-danger)",borderRadius:2,marginInlineEnd:4,borderTop:"1px dashed #ef4444"}} />CAPEX</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"var(--btn-primary-bg)",borderRadius:2,marginInlineEnd:4}} />{ar?"تراكمي":"Cumulative CF"}</span>
          </div>
        </div>}
      </div>
    )}

    {/* ═══ COMPREHENSIVE CASH FLOW TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"التدفق النقدي الشامل":"Comprehensive Cash Flow"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 1. PROJECT CF ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s1:!p.s1}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--color-success-text)",background:"var(--color-success-bg)",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{secOpen.s1?"▶":"▼"} {ar?"1. تدفقات المشروع":"1. PROJECT CASH FLOWS"}</td></tr>
      {!secOpen.s1 && <>
      <CFRow label={ar?"الإيرادات":"Revenue"} values={c.income} total={c.totalIncome} color="var(--color-success-text)" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.landRent.reduce((a,b)=>a+b,0)} negate color="var(--color-danger)" />
      <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
      <CFRow label={ar?"(-) تكلفة التطوير (CAPEX)":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} negate color="var(--color-danger)" />
      <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={c.netCF} total={c.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 2. EXIT & INCENTIVES ═══ */}
      {(exitProc > 0 || (hasIncentives && !isFiltered)) && <>
      <tr onClick={()=>setSecOpen(p=>({...p,s2:!p.s2}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--color-warning)",background:"var(--color-warning-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #f59e0b",userSelect:"none"}}>{secOpen.s2?"▶":"▼"} {ar?"2. التخارج والحوافز":"2. EXIT & INCENTIVES"}</td></tr>
      {!secOpen.s2 && <>
      {exitProc > 0 && <CFRow label={ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"} values={f?.exitProceeds||new Array(h).fill(0)} total={exitProc} color="var(--color-success-text)" />}
      {hasIncentives && !isFiltered && ir.capexGrantSchedule && (ir.capexGrantTotal||0)>0 && <CFRow label={ar?"(+) منحة CAPEX":"(+) CAPEX Grant"} values={ir.capexGrantSchedule} total={ir.capexGrantTotal} color="var(--color-success)" />}
      {hasIncentives && !isFiltered && ir.landRentSavingSchedule && (ir.landRentSavingTotal||0)>0 && <CFRow label={ar?"(+) وفر إيجار الأرض":"(+) Land Rent Savings"} values={ir.landRentSavingSchedule} total={ir.landRentSavingTotal} color="var(--color-success)" />}
      </>}
      </>}

      {/* ═══ § 3. NET RESULT & CAPITAL ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s3:!p.s3}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#e0e7ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #1e3a5f",userSelect:"none"}}>{secOpen.s3?"▶":"▼"} {ar?"3. صافي النتيجة ورأس المال":"3. NET RESULT & CAPITAL"}</td></tr>
      {!secOpen.s3 && <>
      <CFRow label={ar?"= صافي التدفق النهائي":"= Final Net Cash Flow"} values={levCF} total={totalLevCF} bold />
      {/* Cumulative */}
      {(() => { let cum=0; const cumArr=levCF.map(v=>{cum+=v;return cum;}); return <tr style={{background:"var(--color-warning-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-warning-bg)",zIndex:1,fontWeight:600,fontSize:10,color:"var(--color-warning-text)",minWidth:isMobile?120:200}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cumArr[y]<0?"var(--color-danger)":"var(--color-success-text)"}}>{fmt(cumArr[y])}</td>)}
      </tr>; })()}
      {/* Capital Deployed */}
      <tr style={{background:"var(--color-info-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-info-bg)",zIndex:1,fontWeight:500,fontSize:10,color:"var(--zan-teal-500)",minWidth:isMobile?120:200}}>{ar?"رأس المال المجمد":"Capital Deployed"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:capitalDeployed[y]>0?"var(--zan-teal-500)":"#d0d4dc"}}>{capitalDeployed[y]>0?fmt(capitalDeployed[y]):"—"}</td>)}
      </tr>
      </>}

      {/* ═══ § 4. DEVELOPER METRICS ═══ */}
      <tr><td colSpan={years.length+2} style={{padding:"8px 12px",fontSize:11,background:"#e0e7ff",borderTop:"2px solid #1e3a5f"}}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontWeight:700,color:"#1e3a5f"}}>{ar?"مؤشرات المطور":"Developer Metrics"}:</span>
          <span>IRR <strong style={{color:getMetricColor("IRR",levIRR)}}>{levIRR!==null?fmtPct(levIRR*100):"N/A"}</strong></span>
          <span>{ar?"استرداد":"Payback"} <strong style={{color:"var(--zan-teal-500)"}}>{payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
          <span>{ar?"عائد/تكلفة":"Yield"} <strong style={{color:yieldOnCost>0.08?"var(--color-success-text)":"var(--color-warning)"}}>{yieldOnCost>0?fmtPct(yieldOnCost*100):"—"}</strong></span>
          <span>NPV@10% <strong>{fmtM(calcNPV(levCF,0.10))}</strong></span>
          <span>NPV@12% <strong style={{color:"var(--zan-teal-500)"}}>{fmtM(calcNPV(levCF,0.12))}</strong></span>
          <span>NPV@14% <strong>{fmtM(calcNPV(levCF,0.14))}</strong></span>
        </div>
      </td></tr>

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// BANK RESULTS VIEW - For debt & bank100 modes
// ═══════════════════════════════════════════════════════════════
function BankResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [eduModal, setEduModal] = useState(null);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true,s4:true,s5:true});
  const [kpiOpen, setKpiOpen] = useState({bank:false,dev:false,proj:false});
  const [showChart, setShowChart] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({bank:expand,dev:expand,proj:expand}); setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true,s4:true,s5:true}); }}, [globalExpand]);

  if (!financing) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>{ar?"اضبط إعدادات التمويل":"Configure financing settings"}</div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const hasPhases = allPhaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;

  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;
  const upCfg = up ? (isSinglePhase
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }))) : null;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;
  const cur = project.currency || "SAR";
  const isBank100 = cfg.finMode === "bank100";

  // ── Filtered financing ──
  const pf = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p => phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0), debtService = new Array(h).fill(0), debtBalClose = new Array(h).fill(0);
    const interest = new Array(h).fill(0), repayment = new Array(h).fill(0), exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf2 => { for (let y=0;y<h;y++) {
      leveredCF[y]+=pf2.leveredCF?.[y]||0; debtService[y]+=pf2.debtService?.[y]||0;
      debtBalClose[y]+=pf2.debtBalClose?.[y]||0; interest[y]+=pf2.interest?.[y]||0;
      repayment[y]+=pf2.repayment?.[y]||0; exitProceeds[y]+=pf2.exitProceeds?.[y]||0;
    }});
    const dscrRaw = new Array(h).fill(null);
    for (let y=0;y<h;y++) { if (debtService[y]>0) { let noi=0; activePh.forEach(p=>{const pr=results.phaseResults?.[p];if(pr)noi+=(pr.income[y]||0)-(pr.landRent[y]||0);}); dscrRaw[y]=noi/debtService[y]; }}
    return { ...financing, leveredCF, debtService, debtBalClose, interest, repayment, exitProceeds, dscr: dscrRaw, leveredIRR: calcIRR(leveredCF),
      totalDebt: pfs.reduce((s,p2)=>s+(p2.totalDebt||0),0), totalEquity: pfs.reduce((s,p2)=>s+(p2.totalEquity||0),0),
      totalInterest: pfs.reduce((s,p2)=>s+(p2.totalInterest||0),0), devCostInclLand: pfs.reduce((s,p2)=>s+(p2.devCostInclLand||0),0),
      maxDebt: pfs.reduce((s,p2)=>s+(p2.maxDebt||0),0), constrEnd: Math.max(...pfs.map(p2=>p2.constrEnd||0)),
      exitYear: Math.max(...pfs.map(p2=>p2.exitYear||0)), gpEquity: pfs.reduce((s,p2)=>s+(p2.gpEquity||0),0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h, results]);

  // ── Filtered cashflow ──
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return results.consolidated;
    const income=new Array(h).fill(0), capex=new Array(h).fill(0), landRent=new Array(h).fill(0), netCF=new Array(h).fill(0);
    activePh.forEach(pName=>{const pr=results.phaseResults?.[pName];if(!pr)return;for(let y=0;y<h;y++){income[y]+=pr.income[y]||0;capex[y]+=pr.capex[y]||0;landRent[y]+=pr.landRent[y]||0;netCF[y]+=pr.netCF[y]||0;}});
    return { income, capex, landRent, netCF, totalCapex:capex.reduce((a,b)=>a+b,0), totalIncome:income.reduce((a,b)=>a+b,0), totalLandRent:landRent.reduce((a,b)=>a+b,0), totalNetCF:netCF.reduce((a,b)=>a+b,0), irr:calcIRR(netCF) };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h]);

  // ── Derived metrics ──
  const dscrVals = pf.dscr ? pf.dscr.filter(v => v !== null && v > 0) : [];
  const dscrMin = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const dscrAvg = dscrVals.length > 0 ? dscrVals.reduce((a,b)=>a+b,0)/dscrVals.length : null;
  const peakDebt = pf.debtBalClose ? Math.max(...pf.debtBalClose) : 0;
  const debtClearYr = (() => { if (!pf.debtBalClose) return null; for (let y=0;y<h;y++) { if (pf.debtBalClose[y]<=0 && y>0 && pf.debtBalClose[y-1]>0) return sy+y; } return null; })();
  const totalDS = pf.debtService ? pf.debtService.reduce((a,b)=>a+b,0) : 0;
  const exitProc = pf.exitProceeds ? pf.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const exitYr = pf.exitYear ? pf.exitYear - sy : 0;
  const exitMult = cfg.exitMultiple || project.exitMultiple || 0;
  const exitCostPct = cfg.exitCostPct || project.exitCostPct || 0;
  const paybackLev = (() => { if (!pf.leveredCF) return null; let cum=0,wasNeg=false; for (let y=0;y<h;y++) { cum+=pf.leveredCF[y]||0; if(cum<-1)wasNeg=true; if(wasNeg&&cum>=0) return y+1; } return null; })();
  const constrEnd = pf.constrEnd || 0;
  const stableIncome = pc.income.find((v,i) => i > constrEnd && v > 0) || 0;
  const cashOnCash = pf.totalEquity > 0 && stableIncome > 0 ? stableIncome / pf.totalEquity : 0;
  const totalFinCost = pf.totalInterest;
  const devNetCF = pf.leveredCF ? pf.leveredCF.reduce((a,b)=>a+b,0) : 0;

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    balance: pf.debtBalClose?.[y] || 0,
    noi: (pc.income[y]||0) - (pc.landRent[y]||0),
    ds: pf.debtService?.[y] || 0,
  }));

  // CFRow (same as WaterfallView)
  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"var(--surface-page)"} : {};
    const nc = v => { if(color) return color; return v<0?"var(--color-danger)":v>0?"var(--text-primary)":"var(--text-tertiary)"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"var(--surface-page)":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  // Shared mini-components (same as WaterfallView KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c,bold:b}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:c||"var(--text-primary)"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  return (<div>
    {/* ═══ Phase Selector (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pff = phaseFinancings?.[p];
            const irr = pff?.leveredIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}{irr!==null&&irr!==undefined?<span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span>:""}
            </button>;
          })}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && upCfg && (
      <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"var(--color-warning-text)",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}

    {/* ═══ Quick Edit - Loan Terms ═══ */}
    {upCfg && (
      <div style={{background:showTerms?"#fff":"var(--surface-page)",borderRadius:"var(--radius-lg)",border:showTerms?"2px solid #2563eb":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#eff6ff":"var(--surface-page)",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تعديل سريع - شروط القرض":"Quick Edit - Loan Terms"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{!isBank100?`${cfg.maxLtvPct||70}% LTV · `:""}{cfg.financeRate||6.5}% · {cfg.loanTenor||7} {ar?"سنة":"yrs"} ({cfg.debtGrace||3} {ar?"سماح":"grace"})</span>
          <span style={{fontSize:11,color:"var(--text-tertiary)",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #bfdbfe",animation:"zanSlide 0.15s ease"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--zan-teal-500)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"شروط القرض":"LOAN TERMS"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {!isBank100 && <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>LTV %</span>
              <input type="number" value={cfg.maxLtvPct||""} onChange={e=>upCfg({maxLtvPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>}
            {[
              {l:ar?"معدل %":"Rate %",k:"financeRate",v:cfg.financeRate},
              {l:ar?"المدة":"Tenor (yr)",k:"loanTenor",v:cfg.loanTenor},
              {l:ar?"سماح":"Grace (yr)",k:"debtGrace",v:cfg.debtGrace},
              {l:ar?"رسوم %":"Fee %",k:"upfrontFeePct",v:cfg.upfrontFeePct},
            ].map(fld=><div key={fld.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{fld.l}</span>
              <input type="number" value={fld.v||""} onChange={e=>upCfg({[fld.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"السداد":"Repay"}</span>
              <select value={cfg.repaymentType||"amortizing"} onChange={e=>upCfg({repaymentType:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,background:"var(--surface-card)"}}>
                <option value="amortizing">{ar?"أقساط":"Amortizing"}</option>
                <option value="bullet">{ar?"دفعة واحدة":"Bullet"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"بداية السماح":"Grace Basis"}</span>
              <select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,background:"var(--surface-card)"}}>
                <option value="cod">COD</option>
                <option value="firstDraw">{ar?"أول سحب":"1st Draw"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"السحب":"Tranche"}</span>
              <select value={cfg.debtTrancheMode||"single"} onChange={e=>upCfg({debtTrancheMode:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,background:"var(--surface-card)"}}>
                <option value="single">{ar?"كتلة واحدة":"Single"}</option>
                <option value="perDraw">{ar?"لكل سحبة":"Per Draw"}</option>
              </select>
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:700,color:"var(--color-warning)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"التخارج":"EXIT STRATEGY"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"الاستراتيجية":"Strategy"}</span>
              <select value={cfg.exitStrategy||"sale"} onChange={e=>upCfg({exitStrategy:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,background:"var(--surface-card)"}}>
                <option value="sale">{ar?"بيع":"Sale"}</option>
                <option value="hold">{ar?"احتفاظ":"Hold"}</option>
                <option value="caprate">Cap Rate</option>
              </select>
            </div>
            {(cfg.exitStrategy||"sale")!=="hold"&&<>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"السنة":"Year"}</span>
                <input type="number" value={cfg.exitYear||""} onChange={e=>upCfg({exitYear:parseFloat(e.target.value)||0})} placeholder="auto" style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
                {pf?.optimalExitYear > 0 && pf?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <span style={{fontSize:10,color:"var(--color-warning-text)",background:"#fef9c3",padding:"2px 6px",borderRadius:4}}>💡 {ar?"يوصى:":"Rec:"} {pf.optimalExitYear} ({(pf.optimalExitIRR*100).toFixed(1)}%)</span>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"المضاعف":"Multiple"}</span>
                <input type="number" value={cfg.exitMultiple||""} onChange={e=>upCfg({exitMultiple:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>}
              {cfg.exitStrategy==="caprate"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"رسملة %":"Cap %"}</span>
                <input type="number" value={cfg.exitCapRate||""} onChange={e=>upCfg({exitCapRate:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"تكلفة %":"Cost %"}</span>
                <input type="number" value={cfg.exitCostPct||""} onChange={e=>upCfg({exitCostPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>
            </>}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: Bank | Developer | Project ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* ── 🏦 Bank (Lender) Card ── */}
      <div style={{background:kpiOpen.bank?"#fff":"linear-gradient(135deg, #eff6ff, #e0f2fe)",borderRadius:"var(--radius-lg)",border:kpiOpen.bank?"2px solid #2563eb":"1px solid #93c5fd",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,bank:!p.bank}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"var(--btn-primary-bg)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>🏦</span>
          <span style={{fontSize:11,fontWeight:700,color:"var(--zan-navy-700)",flex:1}}>{ar?"البنك (المقرض)":"Bank (Lender)"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.bank?"▲":"▼"}</span>
        </div>
        {!kpiOpen.bank ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"دين":"Debt", fmtM(pf.totalDebt), "var(--zan-teal-500)")}
            {badge("DSCR", dscrMin!==null?dscrMin.toFixed(2)+"x":"—", getMetricColor("DSCR",dscrMin))}
            {badge(ar?"فوائد":"Interest", fmtM(pf.totalInterest), "var(--color-danger)")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"هيكل القرض":"LOAN STRUCTURE"} />
            <KR l={ar?"إجمالي القرض":"Total Facility"} v={fmtM(pf.totalDebt)} c="var(--zan-teal-500)" bold />
            <KR l="LTV" v={isBank100?"100%":fmtPct((pf.totalDebt/(pf.devCostInclLand||1))*100)} />
            <KR l={ar?"معدل التمويل":"Finance Rate"} v={`${cfg.financeRate||6.5}%`} />
            <KR l={ar?"المدة":"Tenor"} v={`${cfg.loanTenor||7} ${ar?"سنة":"yrs"}`} />
            <KR l={ar?"فترة السماح":"Grace"} v={`${cfg.debtGrace||3} ${ar?"سنة":"yrs"}`} />
            <KR l={ar?"نوع السداد":"Repay Type"} v={cfg.repaymentType==="bullet"?(ar?"دفعة واحدة":"Bullet"):(ar?"أقساط":"Amortizing")} />
            <SecHd text={ar?"تكلفة الدين":"DEBT COST"} />
            <KR l={ar?"إجمالي الفوائد":"Total Interest"} v={fmtM(pf.totalInterest)} c="var(--color-danger)" bold />
            {(pf.upfrontFee||0) > 0 && <KR l={ar?"* تشمل رسوم قرض":"* incl. upfront fee"} v={fmtM(pf.upfrontFee)} />}
            <KR l={ar?"إجمالي تكلفة الدين":"Total Debt Cost"} v={fmtM(totalFinCost)} c="var(--color-danger)" bold />
            <KR l={ar?"كنسبة من التكلفة":"% of Dev Cost"} v={pf.devCostInclLand>0?fmtPct(totalFinCost/pf.devCostInclLand*100):"—"} />
            <SecHd text="DSCR" />
            <KR l={ar?"أدنى":"Minimum"} v={dscrMin!==null?dscrMin.toFixed(2)+"x":"—"} c={getMetricColor("DSCR",dscrMin)} bold />
            <KR l={ar?"متوسط":"Average"} v={dscrAvg!==null?dscrAvg.toFixed(2)+"x":"—"} c={dscrAvg>=1.5?"var(--color-success-text)":"var(--color-warning)"} />
            <KR l={ar?"ذروة الدين":"Peak Debt"} v={fmtM(peakDebt)} c="#dc2626" />
            <KR l={ar?"تصفية الدين":"Debt Cleared"} v={debtClearYr?`${debtClearYr}`:(ar?"لم يُصفَّ":"Not cleared")} c={debtClearYr?"var(--color-success-text)":"var(--color-danger)"} />
          </div>
        )}
      </div>

      {/* ── 👷 Developer (Borrower) Card ── */}
      <div style={{background:kpiOpen.dev?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:"var(--radius-lg)",border:kpiOpen.dev?"2px solid #16a34a":"1px solid #86efac",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,dev:!p.dev}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"var(--color-success-text)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>👷</span>
          <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"المطور (المقترض)":"Developer (Borrower)"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.dev?"▲":"▼"}</span>
        </div>
        {!kpiOpen.dev ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge("IRR", pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"—", getMetricColor("IRR",pf.leveredIRR))}
            {badge(ar?"صافي":"Net CF", fmtM(devNetCF), devNetCF>0?"var(--color-success-text)":"var(--color-danger)")}
            {badge(ar?"استرداد":"Payback", paybackLev?`Yr ${paybackLev}`:"—", "#6366f1")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"رأس المال":"CAPITAL"} />
            <KR l={ar?"ملكية المطور":"Developer Equity"} v={fmtM(pf.gpEquity||pf.totalEquity)} c="var(--color-info)" bold />
            {pf.lpEquity>0 && <KR l={ar?"ملكية أخرى":"Other Equity"} v={fmtM(pf.lpEquity)} c="#8b5cf6" />}
            <KR l={ar?"تكلفة التطوير":"Dev Cost"} v={fmtM(pf.devCostInclLand)} bold />
            {pf.landCapValue>0 && <KR l={ar?"رسملة أرض":"Land Cap"} v={fmtM(pf.landCapValue)} />}
            <SecHd text={ar?"العوائد":"RETURNS"} />
            <KR l={ar?"IRR بعد التمويل":"Levered IRR"} v={pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"N/A"} c={getMetricColor("IRR",pf.leveredIRR)} bold />
            <KR l={ar?"IRR قبل التمويل":"Unlevered IRR"} v={pc.irr!==null?fmtPct(pc.irr*100):"N/A"} />
            <KR l={ar?"فترة الاسترداد":"Payback"} v={paybackLev?`${paybackLev} ${ar?"سنة":"yr"}`:"—"} c="var(--zan-teal-500)" />
            <KR l={ar?"عائد نقدي":"Cash-on-Cash"} v={cashOnCash>0?fmtPct(cashOnCash*100):"—"} c={cashOnCash>0.08?"var(--color-success-text)":"var(--text-secondary)"} />
            <KR l={ar?"صافي التدفق":"Net CF"} v={fmtM(devNetCF)} c={devNetCF>0?"var(--color-success-text)":"var(--color-danger)"} bold />
            {/* Leverage Effect (debt+equity only) */}
            {!isBank100 && pf.totalEquity > 0 && <>
            <SecHd text={ar?"تأثير الرافعة المالية":"LEVERAGE EFFECT"} />
            <KR l={ar?"IRR بدون دين":"Without Debt"} v={pc.irr!==null?fmtPct(pc.irr*100):"—"} c="var(--text-secondary)" />
            <KR l={ar?"IRR مع دين":"With Debt"} v={pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"—"} c={getMetricColor("IRR",pf.leveredIRR)} bold />
            <KR l={ar?"الفرق (أثر الدين)":"IRR Boost"} v={pc.irr!==null&&pf.leveredIRR!==null?`+${((pf.leveredIRR-pc.irr)*100).toFixed(2)}%`:"—"} c={pf.leveredIRR>pc.irr?"#10b981":"var(--color-danger)"} bold />
            <KR l={ar?"مضاعف الملكية":"Equity Multiple"} v={pf.totalEquity>0?((exitProc+devNetCF)/pf.totalEquity).toFixed(2)+"x":"—"} c={exitProc+devNetCF>pf.totalEquity?"var(--color-success-text)":"var(--color-danger)"} bold />
            </>}
            <SecHd text="NPV" />
            <KR l="@10%" v={fmtM(calcNPV(pf.leveredCF,0.10))} />
            <KR l="@12%" v={fmtM(calcNPV(pf.leveredCF,0.12))} c="var(--zan-teal-500)" bold />
            <KR l="@14%" v={fmtM(calcNPV(pf.leveredCF,0.14))} />
          </div>
        )}
      </div>

      {/* ── 📋 Project Card ── */}
      <div style={{background:kpiOpen.proj?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:"var(--radius-lg)",border:kpiOpen.proj?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,proj:!p.proj}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"var(--color-warning)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-inverse)",fontSize:10}}>📋</span>
          <span style={{fontSize:11,fontWeight:700,color:"var(--color-warning-text)",flex:1}}>{ar?"المشروع":"Project"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.proj?"▲":"▼"}</span>
        </div>
        {!kpiOpen.proj ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"تكلفة":"Cost", fmtM(pf.devCostInclLand), "var(--text-primary)")}
            {badge(ar?"إيرادات":"Revenue", fmtM(pc.totalIncome), "var(--color-success-text)")}
            {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${(pf.exitYear||0)}`, "var(--color-warning)")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"المصادر والاستخدامات":"SOURCES & USES"} />
            <KR l={ar?"دين بنكي":"Bank Debt"} v={fmtM(pf.totalDebt)} c="var(--color-danger)" />
            <KR l={ar?"ملكية":"Equity"} v={fmtM(pf.totalEquity)} c="var(--color-info)" />
            {/* Visual Debt/Equity bar */}
            {!isBank100 && pf.devCostInclLand > 0 && <div style={{gridColumn:"1/-1",marginTop:2,marginBottom:4}}>
              <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:"var(--border-default)"}}>
                <div style={{width:`${(pf.totalDebt/(pf.devCostInclLand||1))*100}%`,background:"var(--color-danger)",borderRadius:"4px 0 0 4px"}} />
                <div style={{width:`${(pf.totalEquity/(pf.devCostInclLand||1))*100}%`,background:"var(--color-info)",borderRadius:"0 4px 4px 0"}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:2}}>
                <span style={{color:"var(--color-danger)",fontWeight:600}}>{ar?"دين":"Debt"} {fmtPct((pf.totalDebt/(pf.devCostInclLand||1))*100)}</span>
                <span style={{color:"var(--color-info)",fontWeight:600}}>{ar?"ملكية":"Equity"} {fmtPct((pf.totalEquity/(pf.devCostInclLand||1))*100)}</span>
              </div>
            </div>}
            <KR l={ar?"تكلفة بناء":"Construction"} v={fmtM(pf.devCostExclLand)} />
            {pf.landCapValue>0 && <KR l={ar?"أرض":"Land"} v={fmtM(pf.landCapValue)} />}
            <KR l={ar?"الإجمالي":"Total"} v={fmtM(pf.devCostInclLand)} bold />
            <SecHd text={ar?"التخارج":"EXIT"} />
            <KR l={ar?"الاستراتيجية":"Strategy"} v={cfg.exitStrategy==="hold"?(ar?"احتفاظ":"Hold"):cfg.exitStrategy==="caprate"?"Cap Rate":(ar?"بيع":"Sale")} />
            <KR l={ar?"السنة":"Year"} v={pf.exitYear?`${pf.exitYear}`:"—"} />
            <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
            <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="var(--color-success-text)" />
            <KR l={ar?"تكلفة التخارج":"Exit Cost"} v={exitCostPct>0?exitCostPct+"%":"—"} />
            <SecHd text={ar?"امتثال بنكي":"BANK COMPLIANCE"} />
            <KR l="Min DSCR ≥ 1.25x" v={dscrMin>=1.25?"✅":"❌"} c={getMetricColor("DSCR",dscrMin)} bold />
            <KR l="Avg DSCR ≥ 1.50x" v={dscrAvg>=1.5?"✅":"❌"} c={dscrAvg>=1.5?"var(--color-success-text)":"var(--color-danger)"} bold />
            <KR l={ar?"الدين مسدد":"Debt Cleared"} v={debtClearYr?"✅":"❌"} c={debtClearYr?"var(--color-success-text)":"var(--color-danger)"} />
            <KR l="IRR > 0" v={pf.leveredIRR>0?"✅":"❌"} c={pf.leveredIRR>0?"#10b981":"var(--color-danger)"} />
          </div>
        )}
      </div>
    </div>
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و DSCR؟":"What do IRR, NPV, DSCR mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={pf} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT ═══ */}
    {!isFiltered && <IncentivesImpact project={project} results={results} financing={pf} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ FINANCING CHARTS (Pie + DSCR Line + Debt Area) ═══ */}
    {pf && pf.totalDebt > 0 && (() => {
      const dscrData = years.map(y => ({
        year: sy + y,
        dscr: pf.dscr?.[y] ?? null,
      })).filter(d => d.dscr !== null && d.dscr > 0);
      const debtData = years.map(y => ({
        year: sy + y,
        balance: pf.debtBalClose?.[y] || 0,
        noi: (pc.income[y]||0) - (pc.landRent[y]||0),
        ds: pf.debtService?.[y] || 0,
      }));
      const pieData = [
        { name: ar ? "دين" : "Debt", value: pf.totalDebt, color: "var(--color-danger)" },
        { name: ar ? "ملكية" : "Equity", value: pf.totalEquity, color: "#2EC4B6" },
      ].filter(d => d.value > 0);
      const effLTV = pf.devCostInclLand > 0 ? ((pf.totalDebt / pf.devCostInclLand) * 100).toFixed(0) : 0;

      return <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,flex:1}}>{ar?"التحليل البصري":"Visual Analysis"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr",gap:12}}>
          {/* Pie: Debt/Equity Split */}
          <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{ar?"هيكل رأس المال":"Capital Structure"}</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((d,idx) => <Cell key={idx} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => fmtM(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{textAlign:"center",fontSize:20,fontWeight:700,color:getMetricColor("LTV",+effLTV),marginTop:-8}}>{effLTV}% LTV</div>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6,fontSize:10}}>
              {pieData.map((d,i) => <span key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:d.color,display:"inline-block"}} />{d.name}: {fmtM(d.value)}</span>)}
            </div>
          </div>

          {/* DSCR Line Chart */}
          {dscrData.length > 1 && <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{ar?"مسار DSCR":"DSCR Trajectory"}</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dscrData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sidebar)" />
                <XAxis dataKey="year" tick={{fontSize:9,fill:"var(--text-secondary)"}} />
                <YAxis tick={{fontSize:9,fill:"var(--text-secondary)"}} domain={[0, 'auto']} tickFormatter={v => v.toFixed(1)+"x"} />
                <Tooltip formatter={v => v.toFixed(2)+"x"} />
                <ReferenceLine y={1.2} stroke="var(--color-danger)" strokeDasharray="4 4" strokeWidth={1.5} label={{value:"1.2x min",position:"right",fontSize:9,fill:"var(--color-danger)"}} />
                <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} label={{value:"1.5x target",position:"right",fontSize:9,fill:"#10b981"}} />
                <Line type="monotone" dataKey="dscr" stroke="var(--zan-teal-500)" strokeWidth={2.5} dot={{fill:"var(--zan-teal-500)",r:3}} activeDot={{r:5}} name="DSCR" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:4,fontSize:10}}>
              <span><span style={{display:"inline-block",width:12,height:3,background:"var(--btn-primary-bg)",borderRadius:2,marginInlineEnd:4}} />DSCR</span>
              <span><span style={{display:"inline-block",width:12,height:1,borderTop:"2px dashed #ef4444",marginInlineEnd:4}} />{ar?"حد أدنى":"Min"} 1.2x</span>
              <span><span style={{display:"inline-block",width:12,height:1,borderTop:"2px dashed #10b981",marginInlineEnd:4}} />{ar?"مستهدف":"Target"} 1.5x</span>
            </div>
          </div>}
        </div>
      </div>;
    })()}

    {/* ═══ CHART TOGGLE (Debt Balance + NOI) ═══ */}
    {chartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setShowChart(!showChart)} style={{...btnS,fontSize:11,padding:"6px 14px",background:showChart?"#eff6ff":"var(--surface-page)",color:showChart?"var(--zan-teal-500)":"var(--text-secondary)",border:"1px solid "+(showChart?"#93c5fd":"var(--border-default)"),borderRadius:"var(--radius-sm)",fontWeight:600}}>
          📈 {ar?"رسم بياني - الدين vs الدخل":"Debt vs Income Chart"} {showChart?"▲":"▼"}
        </button>
        {showChart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="debtBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0}/></linearGradient>
                <linearGradient id="noiBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-success-text)" stopOpacity={0.1}/><stop offset="95%" stopColor="var(--color-success-text)" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-sidebar)" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"var(--text-secondary)"}} />
              <YAxis tick={{fontSize:10,fill:"var(--text-secondary)"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(Math.abs(v))} />
              <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="balance" stroke="var(--color-danger)" strokeWidth={2.5} fill="url(#debtBG)" name={ar?"رصيد الدين":"Debt Balance"} dot={false} />
              <Area type="monotone" dataKey="noi" stroke="var(--color-success-text)" strokeWidth={2} fill="url(#noiBG)" name="NOI" dot={false} />
              <Area type="monotone" dataKey="ds" stroke="var(--color-warning)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name={ar?"خدمة الدين":"Debt Service"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10}}>
            <span><span style={{display:"inline-block",width:12,height:3,background:"var(--color-danger)",borderRadius:2,marginInlineEnd:4}} />{ar?"رصيد الدين":"Debt Balance"}</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"var(--color-success-text)",borderRadius:2,marginInlineEnd:4}} />NOI</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"var(--color-warning)",borderRadius:2,marginInlineEnd:4,borderTop:"1px dashed #f59e0b"}} />{ar?"خدمة الدين":"Debt Service"}</span>
          </div>
        </div>}
      </div>
    )}

    {/* ═══ COMPREHENSIVE CASH FLOW TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"التدفقات النقدية البنكية":"Bank Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 1. PROJECT CF (Unlevered) ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s1:!p.s1}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--color-success-text)",background:"var(--color-success-bg)",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{secOpen.s1?"▶":"▼"} {ar?"1. تدفقات المشروع (قبل التمويل)":"1. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!secOpen.s1 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="var(--color-success-text)" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pc.landRent} total={pc.landRent.reduce((a,b)=>a+b,0)} negate color="var(--color-danger)" />
      {/* NOI */}
      {(() => { const noi=new Array(h).fill(0); for(let y=0;y<h;y++) noi[y]=(pc.income[y]||0)-(pc.landRent[y]||0); return <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noi} total={noi.reduce((a,b)=>a+b,0)} bold />; })()}
      <CFRow label={ar?"(-) تكلفة التطوير (CAPEX)":"(-) Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="var(--color-danger)" />
      <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Net Project CF (Unlevered)"} values={pc.netCF} total={pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 2. BANK FINANCING ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s2:!p.s2}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--zan-teal-500)",background:"var(--color-info-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{secOpen.s2?"▶":"▼"} {ar?"2. التمويل البنكي":"2. BANK FINANCING"}</td></tr>
      {!secOpen.s2 && <>
      {!isBank100 && pf.equityCalls && <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={pf.equityCalls} total={pf.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" negate />}
      {/* Cumulative equity deployed */}
      {!isBank100 && pf.equityCalls && <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:500,fontSize:10,color:"#7c3aed",paddingInlineStart:20,minWidth:isMobile?120:200}}>{ar?"↳ ملكية تراكمية":"↳ Cumulative Equity"}</td>
        <td style={tdN}></td>
        {(() => { let cum=0; return years.map(y => { cum+=pf.equityCalls[y]||0; return <td key={y} style={{...tdN,fontSize:10,fontWeight:500,color:cum>0?"#7c3aed":"#d0d4dc"}}>{cum>0?fmt(cum):"—"}</td>; }); })()}
      </tr>}
      <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={pf.drawdown} total={pf.drawdown?.reduce((a,b)=>a+b,0)||0} />
      <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={pf.debtBalOpen} total={null} />
      <CFRow label={ar?"(-) سداد أصل الدين":"(-) Principal Repayment"} values={pf.repayment} total={pf.repayment?.reduce((a,b)=>a+b,0)||0} negate color="var(--color-danger)" />
      <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={pf.debtBalClose} total={null} />
      <CFRow label={ar?"(-) تكلفة التمويل (فائدة)":"(-) Interest / Profit Cost"} values={pf.interest} total={pf.totalInterest||0} negate color="var(--color-danger)" />
      <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={pf.debtService} total={totalDS} negate bold color="var(--color-danger)" />
      {/* Exit */}
      {exitProc > 0 && <CFRow label={ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"} values={pf.exitProceeds} total={exitProc} color="var(--color-success-text)" />}
      </>}

      {/* ═══ § 3. DSCR & DEBT COVERAGE ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s3:!p.s3}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"var(--zan-navy-700)",background:"var(--color-info-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb",userSelect:"none"}}>{secOpen.s3?"▶":"▼"} {ar?"3. تغطية خدمة الدين (DSCR)":"3. DEBT SERVICE COVERAGE (DSCR)"}</td></tr>
      {!secOpen.s3 && <>
      {/* NOI row */}
      {(() => { const noi=new Array(h).fill(0); for(let y=0;y<h;y++) noi[y]=(pc.income[y]||0)-(pc.landRent[y]||0); return <CFRow label={ar?"صافي الدخل التشغيلي (NOI)":"Net Operating Income (NOI)"} values={noi} total={noi.reduce((a,b)=>a+b,0)} color="var(--color-success-text)" />; })()}
      {/* DS row */}
      <CFRow label={ar?"(÷) خدمة الدين":"(÷) Debt Service"} values={pf.debtService} total={totalDS} color="var(--color-danger)" />
      {/* DSCR = NOI / DS (highlighted) */}
      {pf.dscr && <tr style={{background:"var(--color-info-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-info-bg)",zIndex:1,fontWeight:700,minWidth:isMobile?120:200,fontSize:11,color:"var(--zan-navy-700)",paddingInlineStart:10}}>= DSCR (NOI ÷ DS)</td>
        <td style={{...tdN,fontWeight:700,color:"var(--zan-navy-700)"}}>{dscrAvg!==null?dscrAvg.toFixed(2)+"x":""}</td>
        {years.map(y=>{const v=pf.dscr?.[y];const bg=v===null||v===undefined?"#eff6ff":getMetricColor("DSCR",v,{raw:true})==="error"?"var(--color-danger-bg)":getMetricColor("DSCR",v,{raw:true})==="warning"?"#fefce8":"#f0fdf4";const fg=getMetricColor("DSCR",v);return <td key={y} style={{...tdN,fontSize:11,fontWeight:700,color:fg,background:bg}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
      </tr>}
      {/* Min DSCR indicator */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:10,color:getMetricColor("DSCR",dscrMin),background:dscrMin>=1.25?"#f0fdf4":"var(--color-danger-bg)"}}>
        {dscrMin>=1.25?"✅":"⚠️"} {ar?"الحد الأدنى":"Minimum"}: <strong>{dscrMin!==null?dscrMin.toFixed(2)+"x":"N/A"}</strong> | {ar?"المتوسط":"Average"}: <strong>{dscrAvg!==null?dscrAvg.toFixed(2)+"x":"N/A"}</strong> | {ar?"حد البنك":"Bank Req"}: <strong>1.25x</strong>
      </td></tr>
      </>}

      {/* ═══ § 4. FINANCING COST ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s4:!p.s4}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#dc2626",background:"var(--color-danger-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ef4444",userSelect:"none"}}>{secOpen.s4?"▶":"▼"} {ar?"4. تكلفة التمويل":"4. FINANCING COST"}</td></tr>
      {!secOpen.s4 && <>
      <CFRow label={ar?"إجمالي الفوائد":"Total Interest Paid"} values={pf.interest} total={pf.totalInterest||0} color="var(--color-danger)" />
      {(pf.upfrontFee||0) > 0 && <tr style={{background:"var(--color-danger-bg)"}}><td style={{...tdSt,position:"sticky",left:0,background:"var(--color-danger-bg)",zIndex:1,fontSize:10,color:"var(--text-tertiary)",paddingInlineStart:20,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* includes upfront fee"}: {fmt(pf.upfrontFee)}</td><td colSpan={years.length+1}></td></tr>}
      {/* As % of dev cost */}
      <tr style={{background:"var(--color-danger-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-danger-bg)",zIndex:1,fontSize:10,color:"#dc2626",fontWeight:600,paddingInlineStart:10}}>{ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost"}</td>
        <td style={{...tdN,fontWeight:700,color:"#dc2626"}}>{pf.devCostInclLand>0?fmtPct(totalFinCost/pf.devCostInclLand*100):""}</td>
        <td colSpan={years.length}></td>
      </tr>
      </>}

      {/* ═══ § 5. NET CASH FLOW & DEVELOPER RETURNS ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s5:!p.s5}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#e0e7ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #1e3a5f",userSelect:"none"}}>{secOpen.s5?"▶":"▼"} {ar?"5. صافي التدفق وعوائد المطور":"5. NET CASH FLOW & DEVELOPER RETURNS"}</td></tr>
      {!secOpen.s5 && <>
      <CFRow label={ar?"= صافي التدفق (بعد التمويل)":"= Levered Net Cash Flow"} values={pf.leveredCF} total={devNetCF} bold />
      {/* Cumulative */}
      {(() => { let cum=0; const cumArr=pf.leveredCF.map(v=>{cum+=v;return cum;}); return <tr style={{background:"var(--color-warning-bg)"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-warning-bg)",zIndex:1,fontWeight:600,fontSize:10,color:"var(--color-warning-text)",minWidth:isMobile?120:200}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cumArr[y]<0?"var(--color-danger)":"var(--color-success-text)"}}>{fmt(cumArr[y])}</td>)}
      </tr>; })()}
      {/* Cash Yield */}
      {pf.totalEquity > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي %":"Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const inc=pc.income[y]||0;const eq=pf.totalEquity;const v=eq>0&&inc>0?inc/eq:0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"var(--color-success-text)":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
      {/* IRR / NPV summary row */}
      <tr style={{background:"#e0e7ff"}}>
        <td colSpan={years.length+2} style={{padding:"8px 12px",fontSize:11}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontWeight:700,color:"#1e3a5f"}}>{ar?"مؤشرات المطور":"Developer Metrics"}:</span>
            <span>IRR <strong style={{color:getMetricColor("IRR",pf.leveredIRR)}}>{pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"N/A"}</strong></span>
            <span>{ar?"استرداد":"Payback"} <strong style={{color:"var(--zan-teal-500)"}}>{paybackLev?`${paybackLev} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
            <span>NPV@10% <strong>{fmtM(calcNPV(pf.leveredCF,0.10))}</strong></span>
            <span>NPV@12% <strong style={{color:"var(--zan-teal-500)"}}>{fmtM(calcNPV(pf.leveredCF,0.12))}</strong></span>
            <span>NPV@14% <strong>{fmtM(calcNPV(pf.leveredCF,0.14))}</strong></span>
          </div>
        </td>
      </tr>
      </>}

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ── Financing Panel Input Components (MUST be outside FinancingView to keep focus) ──
const _finInpSt = {padding:"8px 11px",borderRadius:7,border:"1px solid #e0e3ea",background:"var(--surface-page)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s"};
const _finSelSt = {..._finInpSt,cursor:"pointer",appearance:"auto"};
function FieldGroup({icon,title,children,defaultOpen=false,globalExpand}) {
  const [open,setOpen]=useState(defaultOpen);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  return <div style={{marginBottom:12,border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-lg)",overflow:"hidden"}}>
    <button onClick={()=>setOpen(!open)} style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:open?"#fff":"var(--surface-page)",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,color:"var(--text-primary)"}}><span>{icon}</span><span>{title}</span><span style={{marginInlineStart:"auto",fontSize:9,color:"var(--text-tertiary)"}}>{open?"▲":"▼"}</span></button>
    {open&&<div style={{padding:"10px 14px",borderTop:"1px solid #f0f1f5"}}>{children}</div>}
  </div>;
}
function FL({label,children,tip,hint,error}) {
  return (<div style={{marginBottom:10}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:error?"var(--color-danger)":"var(--text-secondary)",marginBottom:4,fontWeight:500,letterSpacing:0.2}}>{tip?<Tip text={tip}>{label}</Tip>:label}</label>
    <div style={error?{borderRadius:"var(--radius-sm)",boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>
    {error&&<div style={{fontSize:9,color:"var(--color-danger)",marginTop:3,fontWeight:500}}>{error}</div>}
    {!error&&hint&&<div style={{fontSize:9,color:"var(--text-tertiary)",marginTop:3}}>{hint}</div>}
  </div>);
}
function Inp({value,onChange,type="text",...rest}) {
  const [local, setLocal] = useState(String(value??""));
  const ref = useRef(null);
  const committed = useRef(value);
  useEffect(() => { if (committed.current !== value && document.activeElement !== ref.current) { setLocal(String(value??"")); committed.current = value; } }, [value]);
  const commit = () => { const v = type==="number" ? +local : local; if (v !== committed.current) { committed.current = v; onChange(v); } };
  return <input ref={ref} type={type} value={local} onChange={e=>setLocal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter"){commit();e.target.blur();}}} style={_finInpSt} onFocus={e=>{e.target.style.borderColor="var(--zan-teal-500)";e.target.style.boxShadow="0 0 0 2px rgba(37,99,235,0.12)";e.target.style.background="#fff";}} {...rest} />;
}
function Drp({value,onChange,options,lang:dl}) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={_finSelSt}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[dl]||o.en||o.label}</option>)}</select>;
}

function FinancingView({ project, results, financing, phaseFinancings, waterfall, phaseWaterfalls, incentivesResult, t, up, lang, globalExpand }) {
  const isMobile = useIsMobile();
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [cfgSec, setCfgSec] = useState({}); // accordion sections: {debt:false} = collapsed
  const cfgToggle = (id) => setCfgSec(prev => ({...prev, [id]: !prev[id]}));
  const cfgOpen = (id) => cfgSec[id] === true; // all closed by default
  const [eduModal, setEduModal] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  const [kpiOpen, setKpiOpen] = useState({bank:false,dev:false,proj:false});
  const [showChart, setShowChart] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; const allSec = {mode:expand,debt:expand,exit:expand,land:expand,fund:expand,wf:expand,fees:expand,dscr:expand,equity:expand,cf:expand}; setCollapsed(expand?allSec:{}); setCfgSec(expand?{debt:true,exit:true,land:true,fund:true,wf:true,fees:true}:{}); setShowTerms(expand); setKpiOpen({bank:expand,dev:expand,proj:expand}); setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);
  const ar = lang === "ar";
  const cur = project.currency || "SAR";
  const toggle = (id) => setCollapsed(prev => ({...prev, [id]: !prev[id]}));
  const isOpen = (id) => collapsed[id] === true; // all closed by default

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results?.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const hasPhases = allPhaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;

  // ── Settings source: single phase → phase settings, multi → first selected, all → project ──
  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;

  // ── Settings writer ──
  const upCfg = isSinglePhase
    // Single phase → write to that phase only
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : isFiltered
    // Multiple phases selected → write to selected phases ONLY (not project-level)
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => activePh.includes(p.name)
          ? { ...p, financing: { ...(p.financing || getPhaseFinancing(prev, p.name)), ...fields } }
          : p)
      }))
    // All → write to project + propagate to all phases
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }));

  const copyFromPhase = (sourceName) => {
    const source = getPhaseFinancing(project, sourceName);
    upCfg({ ...source });
  };

  if (!project || !results) return <div style={{padding:40,textAlign:"center",color:"var(--text-tertiary)"}}>
    <div style={{fontSize:32,marginBottom:12}}>📊</div>
    <div style={{fontSize:14,fontWeight:500,color:"var(--text-secondary)",marginBottom:6}}>{ar?"أكمل برنامج الأصول أولاً":"Complete Asset Program First"}</div>
    <div style={{fontSize:12}}>{ar?"أضف أصول في تاب 'برنامج الأصول' ثم ارجع هنا":"Add assets in the 'Asset Program' tab, then return here"}</div>
  </div>;

  const h = results.horizon;
  const sy = results.startYear;
  const ir = incentivesResult;
  // Fee auto-default hints — shown under field as part of hint text
  const _FD = { subscriptionFeePct:2, annualMgmtFeePct:1.5, mgmtFeeCapAnnual:2000000, custodyFeeAnnual:100000, developerFeePct:10, structuringFeePct:1, structuringFeeCap:300000, preEstablishmentFee:200000, spvFee:20000, auditorFeeAnnual:50000, operatorFeePct:0.15, operatorFeeCap:600000, miscExpensePct:0.5, upfrontFeePct:0.5, maxLtvPct:70, financeRate:6.5, loanTenor:7, debtGrace:3, exitMultiple:10, exitCapRate:9, exitCostPct:2, landCapRate:1000, prefReturnPct:15, carryPct:30, lpProfitSplitPct:70 };
  const _FU = { loanTenor:ar?"سنوات":"yr", debtGrace:ar?"سنوات":"yr", exitMultiple:"x", landCapRate:ar?"ريال/م²":"SAR/sqm" }; // special units
  const autoHint = (field, baseHint) => { const d = _FD[field]; if (d === undefined) return baseHint; const u = _FU[field]; const fmt = u ? d.toLocaleString()+u : d >= 1000 ? (d/1000).toLocaleString()+'K' : d+'%'; const tag = ar ? `التلقائي: ${fmt}` : `default: ${fmt}`; return baseHint ? baseHint + ` · ${tag}` : tag; };
  const dh = (field) => autoHint(field, ""); // shortcut: default hint only
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;

  // ── Filtered financing & cashflow ──
  const f = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p => phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0), debtService = new Array(h).fill(0), debtBalClose = new Array(h).fill(0);
    const interest = new Array(h).fill(0), repayment = new Array(h).fill(0), exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { for (let y=0;y<h;y++) {
      leveredCF[y] += pf.leveredCF?.[y]||0; debtService[y] += pf.debtService?.[y]||0;
      debtBalClose[y] += pf.debtBalClose?.[y]||0; interest[y] += pf.interest?.[y]||0;
      repayment[y] += pf.repayment?.[y]||0; exitProceeds[y] += pf.exitProceeds?.[y]||0;
    }});
    const dscrRaw = new Array(h).fill(null);
    for (let y=0;y<h;y++) { if (debtService[y] > 0) { let noi = 0; activePh.forEach(p => { const pr = results.phaseResults?.[p]; if (pr) noi += (pr.income[y]||0) - (pr.landRent[y]||0); }); dscrRaw[y] = noi / debtService[y]; } }
    return { ...financing, leveredCF, debtService, debtBalClose, interest, repayment, exitProceeds,
      leveredIRR: calcIRR(leveredCF), dscr: dscrRaw,
      totalDebt: pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0),
      totalEquity: pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0),
      totalInterest: pfs.reduce((s,pf) => s + (pf.totalInterest||0), 0),
      devCostInclLand: pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0),
      devCostExclLand: pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0),
      landCapValue: pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0),
      maxDebt: pfs.reduce((s,pf) => s + (pf.maxDebt||0), 0),
      gpEquity: pfs.reduce((s,pf) => s + (pf.gpEquity||0), 0),
      lpEquity: pfs.reduce((s,pf) => s + (pf.lpEquity||0), 0),
      constrEnd: Math.max(...pfs.map(pf => pf.constrEnd || 0)),
      upfrontFee: pfs.reduce((s,pf) => s + (pf.upfrontFee||0), 0),
      devFeeTotal: pfs.reduce((s,pf) => s + (pf.devFeeTotal||0), 0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h, results]);

  const c = results.consolidated;
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return c;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => { const pr = results.phaseResults?.[pName]; if (!pr) return; for (let y=0;y<h;y++) { income[y]+=pr.income[y]||0; capex[y]+=pr.capex[y]||0; landRent[y]+=pr.landRent[y]||0; netCF[y]+=pr.netCF[y]||0; }});
    return { income, capex, landRent, netCF, totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0), totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0), irr: calcIRR(netCF) };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h, c]);

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"var(--surface-page)"}:{};
    const nc=v=>{if(color)return color;return v<0?"var(--color-danger)":v>0?"var(--text-primary)":"var(--text-tertiary)";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"var(--surface-page)":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?100:140}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE SELECTOR (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p=>{
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pf = phaseFinancings?.[p];
            const irr = pf?.leveredIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isSinglePhase && (
            <select onChange={e => { if (e.target.value) { copyFromPhase(e.target.value); e.target.value = ""; } }} style={{padding:"5px 10px",fontSize:10,borderRadius:"var(--radius-sm)",border:"1px solid #93c5fd",background:"var(--color-info-bg)",color:"var(--zan-navy-700)",cursor:"pointer",marginInlineStart:"auto"}}>
              <option value="">{ar?"📋 نسخ من...":"📋 Copy from..."}</option>
              {(project.phases||[]).filter(p=>p.name!==singlePhaseName).map(p=>
                <option key={p.name} value={p.name}>{p.name}</option>
              )}
            </select>
          )}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && (
      <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"var(--color-warning-text)",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}
    {/* Single phase info */}
    {isSinglePhase && (
      <div style={{background:"var(--color-info-bg)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-focus)",padding:"10px 16px",marginBottom:12,fontSize:12,color:"var(--zan-navy-700)"}}>
        <strong>{singlePhaseName}</strong> — {ar?"إعدادات تمويل مستقلة":"Independent Financing Settings"}
        {f && f.devCostInclLand > 0 && <span style={{marginInlineStart:12,color:"var(--text-secondary)"}}>DevCost: {fmtM(f.devCostInclLand)} · Debt: {fmtM(f.maxDebt)} · Equity: {fmtM(f.totalEquity)}</span>}
      </div>
    )}

    {/* ═══ FINANCING KPI STRIP ═══ */}
    {f && f.totalDebt > 0 && (() => {
      const dscrArr = f.dscr ? f.dscr.filter(v => v !== null && v > 0) : [];
      const avgD = dscrArr.length > 0 ? dscrArr.reduce((a,b) => a+b, 0) / dscrArr.length : null;
      const minD = dscrArr.length > 0 ? Math.min(...dscrArr) : null;
      const effLTV = f.devCostInclLand > 0 ? (f.totalDebt / f.devCostInclLand) * 100 : 0;
      const costOfDebt = cfg.financeRate || 0;
      const kpis = [
        { label: ar ? "إجمالي الدين" : "Total Debt", value: fmtM(f.totalDebt), color: "var(--text-primary)" },
        { label: ar ? "إجمالي الملكية" : "Total Equity", value: fmtM(f.totalEquity), color: "var(--text-primary)" },
        { label: ar ? "LTV الفعلي" : "Effective LTV", value: effLTV.toFixed(0) + "%", color: getMetricColor("LTV", effLTV) },
        { label: ar ? "متوسط DSCR" : "Avg DSCR", value: avgD ? avgD.toFixed(2) + "x" : "—", color: getMetricColor("DSCR", avgD), sub: minD ? (ar ? "أدنى: " : "Min: ") + minD.toFixed(2) + "x" : null },
        { label: ar ? "تكلفة الدين" : "Cost of Debt", value: costOfDebt + "%", color: "var(--text-primary)" },
      ];
      return <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {kpis.map((k,i) => <div key={i} style={{flex:"1 1 120px",minWidth:110,background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"10px 14px",boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>
          <div style={{fontSize:9,color:"var(--text-secondary)",fontWeight:500,marginBottom:4,textTransform:"uppercase",letterSpacing:0.3}}>{k.label}</div>
          <div style={{fontSize:18,fontWeight:700,color:k.color,fontVariantNumeric:"tabular-nums"}}>{k.value}</div>
          {k.sub && <div style={{fontSize:9,color:getMetricColor("DSCR",minD),marginTop:2,fontWeight:600}}>{k.sub}</div>}
        </div>)}
      </div>;
    })()}

    {/* ═══ FINANCIAL STRUCTURE SETTINGS ═══ */}
    {(() => {
        const hasDbt = cfg.finMode !== "self";
        const hasEq = cfg.finMode !== "self" && cfg.finMode !== "bank100";
        const isFundMode = cfg.finMode === "fund";
        const notHold = (cfg.exitStrategy||"sale") !== "hold";
        // Accordion section header helper
        const AH = ({id, color, label, summary, visible}) => {
          if (visible === false) return null;
          const open = cfgOpen(id);
          return <div onClick={()=>cfgToggle(id)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:open?"#fff":"var(--surface-page)",userSelect:"none",transition:"all 0.2s"}}>
            <span style={{fontSize:12,fontWeight:600,color:open?color:"var(--text-primary)",flex:1,transition:"color 0.2s"}}>{label}</span>
            {!open && summary && <span style={{fontSize:10,color:"var(--text-tertiary)",fontWeight:500,maxWidth:180,textAlign:"end",lineHeight:1.2}}>{summary}</span>}
            <span style={{fontSize:10,color:"var(--text-tertiary)",transition:"transform 0.25s ease",transform:open?"rotate(0)":"rotate(-90deg)",display:"inline-block"}}>{open?"▼":"▶"}</span>
          </div>;
        };
        const AB = ({id, children, visible}) => {
          if (visible === false || !cfgOpen(id)) return null;
          return <div style={{padding:"8px 14px 14px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6,background:"var(--surface-card)",borderTop:"1px solid #f0f1f5",animation:"zanSlide 0.15s ease"}}>{children}</div>;
        };
        const g2 = {display:"contents"};
        const g3 = {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:6,gridColumn:"1/-1"};
        // Section card wrapper with color accent
        const SecWrap = ({children, visible, color}) => {
          if (visible === false) return null;
          return <div style={{borderRadius:"var(--radius-md)",border:`1px solid ${color||"var(--border-default)"}40`,borderTop:`3px solid ${color||"var(--border-default)"}`,overflow:"hidden",background:"var(--surface-page)",transition:"border-color 0.2s"}}>{children}</div>;
        };
        return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:18}}>
        {/* ── SECTION: FINANCING MODE (always visible, compact) ── */}
        <div style={{padding:"12px 14px",gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",background:"var(--surface-card)"}}>
          <span style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap"}}>{ar?"آلية التمويل":"Financing Mode"}</span>
          <select value={cfg.finMode} onChange={e=>{const v=e.target.value;const wasB100=cfg.finMode==="bank100";const extras=v==="bank100"?{debtAllowed:true,maxLtvPct:100}:{};const bank100Reset=wasB100&&v!=="bank100"?{maxLtvPct:70}:{};const graceReset=v!=="fund"&&cfg.graceBasis==="fundStart"?{graceBasis:"cod"}:{};upCfg({finMode:v,...extras,...bank100Reset,...graceReset});}} style={{padding:"8px 12px",borderRadius:7,border:"1px solid #e0e3ea",background:"var(--surface-page)",fontSize:12,fontFamily:"inherit",minWidth:160,maxWidth:240,position:"relative",zIndex:10}}>
            <option value="self">{ar?"تمويل ذاتي":"Self-Funded"}</option>
            <option value="bank100">{ar?"بنكي 100%":"100% Bank Debt"}</option>
            <option value="debt">{ar?"دين + ملكية":"Debt + Equity"}</option>
            <option value="fund">{ar?"صندوق (GP/LP)":"Fund (GP/LP)"}</option>
          </select>
          <HelpLink contentKey="financingMode" lang={lang} onOpen={setEduModal} />
        </div>

        {/* ── SECTION: DEBT TERMS ── */}
        <SecWrap visible={hasDbt} color="var(--zan-teal-500)">
        <AH id="debt" color="var(--zan-teal-500)" label={ar?"شروط القرض":"Debt Terms"} summary={hasDbt && (cfg.debtAllowed || cfg.finMode==="bank100") ? `${cfg.finMode!=="bank100"?(cfg.maxLtvPct||70)+"% LTV · ":""}${cfg.financeRate||6.5}% · ${cfg.loanTenor||7}yr` : ""} visible={hasDbt} />
        <AB id="debt" visible={hasDbt}>{(() => {
          const showDebtFields = cfg.debtAllowed || cfg.finMode === "bank100";
          return <>
            {cfg.finMode !== "bank100" && (
              <FL label={ar?"هل الدين مسموح؟":"Debt Allowed"} tip="هذا المفتاح يحدد هل النموذج يسمح بتمويل بنكي. عند إيقافه يصبح المشروع ممولاً بالكامل من Equity\nToggles whether bank debt is allowed. If off, the project becomes fully equity-funded">
                <Drp lang={lang} value={cfg.debtAllowed?"Y":"N"} onChange={v=>upCfg({debtAllowed:v==="Y"})} options={["Y","N"]} />
              </FL>
            )}
            {showDebtFields && <>
              <div style={g2}>
                {cfg.finMode!=="bank100"&&<FL label={ar?"نسبة التمويل %":"LTV %"} tip="نسبة القرض إلى قيمة المشروع. في السعودية 50-70%\nLoan-to-Value ratio. Saudi: 50-70%" hint={dh("maxLtvPct")} error={cfg.maxLtvPct>100?(ar?"الحد الأقصى 100%":"Max 100%"):cfg.maxLtvPct<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><Inp type="number" value={cfg.maxLtvPct} onChange={v=>upCfg({maxLtvPct:v})} /></FL>}
                <FL label={ar?"معدل %":"Rate %"} tip="معدل تكلفة التمويل السنوي. في السعودية 5-8%\nAnnual financing cost rate. Saudi: 5-8%" hint={dh("financeRate")} error={cfg.financeRate>30?(ar?"الحد الأقصى 30%":"Max 30%"):cfg.financeRate<0?(ar?"لا يمكن أن يكون سالباً":"Cannot be negative"):null}><Inp type="number" value={cfg.financeRate} onChange={v=>upCfg({financeRate:v})} /></FL>
              </div>
              <div style={g3}>
                <FL label={ar?"مدة القرض":"Tenor"} tip="مدة القرض الكلية شاملة فترة السماح. عادة 7-15 سنة\nTotal loan period including grace. Usually 7-15 years" hint={dh("loanTenor")} error={cfg.loanTenor<1?(ar?"يجب أن تكون سنة واحدة على الأقل":"Must be at least 1 year"):cfg.loanTenor>50?(ar?"الحد الأقصى 50 سنة":"Max 50 years"):null}><Inp type="number" value={cfg.loanTenor} onChange={v=>upCfg({loanTenor:v})} /></FL>
                <FL label={ar?"فترة السماح":"Grace"} tip="فترة دفع الربح فقط بدون أصل الدين. عادة 2-4 سنوات\nInterest-only period, no principal. Usually 2-4 years" hint={dh("debtGrace")} error={cfg.debtGrace>(cfg.loanTenor||7)?(ar?"فترة السماح تتجاوز مدة القرض":"Grace exceeds tenor"):cfg.debtGrace<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><Inp type="number" value={cfg.debtGrace} onChange={v=>upCfg({debtGrace:v})} /></FL>
                <FL label={ar?"بداية السماح":"Grace Basis"} tip={ar?"متى تبدأ فترة السماح: من اكتمال البناء أو أول سحب"+(isFundMode?" أو بداية الصندوق":""):"When grace starts: COD, first drawdown"+(isFundMode?", or fund start year":"")}><select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-card)",fontSize:13}}><option value="cod">{ar?"اكتمال البناء (تلقائي)":"COD (default)"}</option><option value="firstDraw">{ar?"أول سحب":"First Drawdown"}</option>{isFundMode&&<option value="fundStart">{ar?"بداية الصندوق":"Fund Start Year"}</option>}</select></FL>
              </div>
              <div style={g2}>
                <FL label={ar?"رسوم %":"Upfront Fee %"} tip="رسوم القرض المقدمة كنسبة من مبلغ التمويل. تُدفع مرة واحدة عند السحب\nUpfront loan fee as percentage of debt amount. Paid once at drawdown" hint={autoHint("upfrontFeePct",ar?"مرة واحدة · عند السحب":"One-time · at drawdown")}><Inp type="number" value={cfg.upfrontFeePct} onChange={v=>upCfg({upfrontFeePct:v})} /></FL>
                <FL label={ar?"سداد":"Repayment"} tip="Amortizing = أقساط دورية تقلل الرصيد. Bullet = سداد الأصل دفعة واحدة بالنهاية\nAmortizing = regular installments. Bullet = principal at end">
                  <Drp lang={lang} value={cfg.repaymentType} onChange={v=>upCfg({repaymentType:v})} options={[{value:"amortizing",en:"Amortizing (default)",ar:"أقساط (تلقائي)"},{value:"bullet",en:"Bullet",ar:"دفعة واحدة"}]} />
                </FL>
              </div>
              <FL label={ar?"طريقة السحب":"Tranche Mode"} tip="Single: all debt as one block. Per Draw: each drawdown as separate tranche"><Drp lang={lang} value={cfg.debtTrancheMode||"single"} onChange={v=>upCfg({debtTrancheMode:v})} options={[{value:"single",en:"Single Block (default)",ar:"كتلة واحدة (تلقائي)"},{value:"perDraw",en:"Per Drawdown",ar:"لكل سحبة"}]} /></FL>
              <div style={{gridColumn:"1/-1",marginTop:-2,marginBottom:4}}><HelpLink contentKey="islamicFinance" lang={lang} onOpen={setEduModal} label={ar?"المرابحة والإجارة والتقليدي":"Murabaha vs Ijara vs Conventional"} /></div>
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #f0f1f3",paddingTop:8,marginTop:4}}>
                <FL label={ar?"رسملة تكاليف التمويل أثناء البناء (IDC)":"Capitalize Financing Costs (IDC)"} tip={ar?
`خلال البناء، المشروع ما يولّد دخل — لكن القرض يبدأ يراكم فوائد.

السؤال: من يدفع هالفوائد؟

لا (الوضع الافتراضي):
الفوائد تتراكم وتُدفع من أول دخل تشغيلي بعد البناء.
الـ Equity يغطي تكلفة البناء فقط.

نعم (رسملة):
الفوائد + رسوم البنك خلال البناء تُضاف على تكلفة المشروع.
هذا يرفع الـ Equity المطلوب لأن المبلغ الإضافي لازم يجي من المطور أو المستثمر.

متى تستخدمها؟
• لما تبي تعرف التكلفة الحقيقية الكاملة للمشروع
• لما البنك يطلب إدراج IDC بالدراسة
• لما تقارن بين سيناريوهات تمويل مختلفة`:
`During construction, the project generates no income — but the loan accrues interest.

The question: who pays this interest?

No (default):
Interest accrues and is paid from first operating income after construction.
Equity covers construction cost only.

Yes (capitalize):
Interest + bank fees during construction are added to project cost.
This increases equity needed — the extra amount must come from developer or investor.

When to use:
• To see the true all-in project cost
• When the bank requires IDC in the study
• When comparing different financing scenarios`}>
                  <Drp lang={lang} value={cfg.capitalizeIDC?"Y":"N"} onChange={v=>upCfg({capitalizeIDC:v==="Y"})} options={["Y","N"]} />
                </FL>
                {cfg.capitalizeIDC && f?.capitalizedFinCosts > 0 && <div style={{padding:"6px 10px",background:"#fef9c3",borderRadius:"var(--radius-sm)",border:"1px solid #fde68a",fontSize:10,color:"var(--color-warning-text)",marginTop:-4}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span>{ar?"فوائد أثناء البناء (IDC)":"Interest During Construction"}</span>
                    <span style={{fontWeight:600}}>{fmt(f.estimatedIDC)} {cur}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span>{ar?"رسوم بنك أولية":"Upfront Bank Fees"}</span>
                    <span style={{fontWeight:600}}>{fmt(f.estimatedUpfrontFees)} {cur}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #fde68a",paddingTop:2,marginTop:2}}>
                    <span style={{fontWeight:700}}>{ar?"إجمالي مُرسمل (يُضاف على الـ Equity)":"Total Capitalized (added to Equity)"}</span>
                    <span style={{fontWeight:700}}>{fmt(f.capitalizedFinCosts)} {cur}</span>
                  </div>
                </div>}
              </div>
            </>}
          </>;
        })()}</AB>

        {/* ── SECTION: EXIT STRATEGY (visible for ALL modes including self) ── */}
        </SecWrap>
        <SecWrap visible={true} color="#8b5cf6">
        <AH id="exit" color="#8b5cf6" label={ar?"التخارج":"Exit Strategy"} summary={`${({sale:ar?"بيع":"Sale",caprate:ar?"رسملة":"Cap Rate",hold:ar?"احتفاظ":"Hold"})[cfg.exitStrategy||"sale"]||""}${notHold?` · ${ar?"سنة":"Yr"} ${cfg.exitYear||"auto"}`:""}`} visible={true} />
        <AB id="exit" visible={true}>
          <FL label={ar?"استراتيجية التخارج":"Exit Strategy"} tip="بيع الأصل = تخارج في سنة محددة. احتفاظ بالدخل = بدون بيع\nAsset Sale = exit at a set year. Hold for Income = no sale event">
            <Drp lang={lang} value={cfg.exitStrategy||"sale"} onChange={v=>upCfg({exitStrategy:v})} options={[{value:"sale",en:"Sale - Multiple (default)",ar:"بيع - مضاعف (تلقائي)"},{value:"caprate",en:"Sale - Cap Rate",ar:"بيع - رسملة"},{value:"hold",en:"Hold",ar:"احتفاظ"}]} />
          </FL>
          <div style={{gridColumn:"1/-1",marginTop:-6,marginBottom:4}}><HelpLink contentKey="exitStrategy" lang={lang} onOpen={setEduModal} /></div>
          {notHold&&<>
            <div style={g2}>
              <div>
                <FL label={ar?"سنة التخارج":"Exit Year"} hint="0 = auto" tip="سنة بيع الأصل. عادة 5-10 سنوات بعد الاستقرار التشغيلي. 0 = تلقائي\nYear of asset sale. Usually 5-10 years after stabilization. 0 = auto"><Inp type="number" value={cfg.exitYear} onChange={v=>upCfg({exitYear:v})} /></FL>
                {f?.optimalExitYear > 0 && f?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <div style={{marginTop:-6,marginBottom:4,padding:"4px 8px",background:"#fef9c3",borderRadius:5,border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:11}}>💡</span>
                  <span style={{fontSize:10,color:"var(--color-warning-text)"}}>{ar?`أعلى IRR غير ممول (${(f.optimalExitIRR*100).toFixed(1)}%) بسنة: ${f.optimalExitYear}`:`Best unlevered IRR (${(f.optimalExitIRR*100).toFixed(1)}%) at year: ${f.optimalExitYear}`}</span>
                </div>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<FL label={ar?"المضاعف":"Multiple (x)"} tip="قيمة البيع = الإيجار × المضاعف. عادة 8x-15x\nSale price = Rent × Multiple. Usually 8x-15x" hint={dh("exitMultiple")}><Inp type="number" value={cfg.exitMultiple} onChange={v=>upCfg({exitMultiple:v})} /></FL>}
              {cfg.exitStrategy==="caprate"&&<FL label={ar?"معدل الرسملة %":"Cap Rate %"} tip="قيمة التخارج = NOI / Cap Rate. في السعودية 7-10% للأصول المستقرة\nExit = NOI / Cap Rate. Saudi stabilized: 7-10%" hint={dh("exitCapRate")}><Inp type="number" value={cfg.exitCapRate} onChange={v=>upCfg({exitCapRate:v})} /></FL>}
            </div>
            <FL label={ar?"تكاليف التخارج %":"Exit Cost %"} tip="تكاليف البيع مثل السمسرة والاستشارات القانونية. عادة 1.5-3% من سعر البيع\nSale costs like brokerage and legal fees. Typically 1.5-3% of sale price" hint={dh("exitCostPct")}><Inp type="number" value={cfg.exitCostPct} onChange={v=>upCfg({exitCostPct:v})} /></FL>
          </>}
        </AB>

        {/* ── SECTION: LAND & EQUITY ── */}
        </SecWrap>
        <SecWrap visible={hasEq} color="#8b5cf6">
        <AH id="land" color="#8b5cf6" label={ar?"الأرض والملكية":"Land & Equity"} summary={hasEq ? `${cfg.landCapitalize?(ar?"مرسملة":"Cap"):""} · GP ${cfg.gpEquityManual||"auto"}` : ""} visible={hasEq} />
        <AB id="land" visible={hasEq}>
          {(project.landType==="lease"||project.landType==="bot")&&<FL label={ar?"رسملة حق الانتفاع؟":"Capitalize Leasehold?"} tip={ar?"الأرض مؤجرة وليست مملوكة — لكن حق الانتفاع له قيمة مالية. رسملته تعني تحويل هذي القيمة إلى حصة Equity في الصندوق.\nمثال: أرض 50,000 م² × 800 ريال = 40 مليون تُحسب كمساهمة عينية لصاحب الأرض":"The land is leased, not owned — but the leasehold right has financial value. Capitalizing it converts this value into an equity stake in the fund.\nExample: 50,000 sqm × SAR 800 = SAR 40M counted as in-kind equity contribution"}>
            <Drp lang={lang} value={cfg.landCapitalize?"Y":"N"} onChange={v=>upCfg({landCapitalize:v==="Y"})} options={["Y","N"]} />
          </FL>}
          {cfg.landCapitalize&&(project.landType==="lease"||project.landType==="bot")&&<>
            <div style={g2}>
              <FL label={ar?"سعر/م²":"Rate/sqm"} tip="سعر تقييم الأرض للمتر المربع عند رسملتها كـ Equity. يفضل أن يكون محافظاً\nLand value per sqm for equity capitalization. Should be based on conservative appraisal" hint={`= ${fmt((project.landArea||0)*(cfg.landCapRate||1000))} ${cur} · ${dh("landCapRate")}`}><Inp type="number" value={cfg.landCapRate} onChange={v=>upCfg({landCapRate:v})} /></FL>
              <FL label={ar?"رسملة حق الانتفاع لصالح":"Leasehold Cap Credit To"} tip={ar?"من يُحسب له حق الانتفاع كحصة Equity: المطور أو المستثمر أو مقسمة":"Who gets the leasehold capitalization as equity credit: Developer (GP), Investor (LP), or split 50/50"}><Drp lang={lang} value={cfg.landCapTo||"gp"} onChange={v=>upCfg({landCapTo:v})} options={[{value:"gp",en:"Developer - GP (default)",ar:"المطور - GP (تلقائي)"},{value:"lp",en:"Investor (LP)",ar:"المستثمر (LP)"},{value:"split",en:"Split 50/50",ar:"مقسمة 50/50"}]} /></FL>
            </div>
            {project.landType==="lease"&&<FL label={ar?"من يدفع إيجار الأرض؟":"Who Pays Land Rent?"} tip={ar?"بعد رسملة حق الانتفاع: تلقائي = اللي انحسب له حق الانتفاع يدفع الإيجار. المشروع = الكل يتحمل. أو اختر يدوياً":"After leasehold cap: Auto = whoever got the cap credit pays rent. Project = all bear cost. Or choose manually"}><Drp lang={lang} value={cfg.landRentPaidBy||"auto"} onChange={v=>upCfg({landRentPaidBy:v})} options={[{value:"auto",en:"Auto (cap credit owner)",ar:"تلقائي (صاحب حق الانتفاع)"},{value:"project",en:"Project (all bear cost)",ar:"المشروع (الكل يتحمل)"},{value:"gp",en:"Developer (GP)",ar:"المطور (GP)"},{value:"lp",en:"Investor (LP)",ar:"المستثمر (LP)"}]} /></FL>}
          </>}

          {/* ── GP Investment Sources ── */}
          {isFundMode && <>
            <div style={{gridColumn:"1/-1",marginTop:4,marginBottom:2,fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.3,textTransform:"uppercase"}}>{ar?"استثمار المطور (GP)":"Developer Investment (GP)"}</div>

            {/* Source 2: Dev Fee as Investment */}
            <FL label={ar?"إدخال أتعاب التطوير كاستثمار؟":"Invest Dev Fee as Equity?"} tip={ar?"المطور يعيد أتعاب التطوير للصندوق كاستثمار بدل استلامها نقداً":"Developer reinvests dev fee into fund as equity instead of taking cash"}>
              <Drp lang={lang} value={cfg.gpInvestDevFee?"Y":"N"} onChange={v=>upCfg({gpInvestDevFee:v==="Y"})} options={["Y","N"]} />
            </FL>
            {cfg.gpInvestDevFee && <div style={g2}>
              <FL label={ar?"نسبة الإدخال %":"Invest %"} hint={`${ar?"أتعاب التطوير":"Dev Fee"} = ${fmtM(f?.gpEquityBreakdown?.devFeeTotal||0)}`} tip={ar?"نسبة أتعاب التطوير المُعاد استثمارها. 100% = كامل الأتعاب":"% of dev fee reinvested. 100% = all fees"}>
                <Inp type="number" value={cfg.gpDevFeeInvestPct??100} onChange={v=>upCfg({gpDevFeeInvestPct:v})} />
              </FL>
              <div style={{display:"flex",alignItems:"center",fontSize:11,color:"var(--color-success-text)",fontWeight:600,padding:"8px 0"}}>= {fmt((f?.gpEquityBreakdown?.devFeeTotal||0)*((cfg.gpDevFeeInvestPct??100)/100))} {cur}</div>
            </div>}

            {/* Source 3: Cash Investment */}
            <FL label={ar?"استثمار نقدي إضافي؟":"Additional Cash Investment?"} tip={ar?"المطور يضيف مبلغ نقدي من جيبه كاستثمار بالصندوق":"Developer adds cash from own pocket as fund investment"}>
              <Drp lang={lang} value={cfg.gpCashInvest?"Y":"N"} onChange={v=>upCfg({gpCashInvest:v==="Y"})} options={["Y","N"]} />
            </FL>
            {cfg.gpCashInvest && <FL label={ar?"المبلغ":"Amount (SAR)"} tip={ar?"المبلغ النقدي الإضافي":"Cash investment amount"}>
              <Inp type="number" value={cfg.gpCashInvestAmount} onChange={v=>upCfg({gpCashInvestAmount:v})} />
            </FL>}

            {/* Live Summary */}
            {f && <div style={{gridColumn:"1/-1",marginTop:4,padding:"8px 12px",background:"var(--surface-page)",borderRadius:"var(--radius-sm)",border:"0.5px solid var(--border-default)",fontSize:11}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"var(--text-secondary)"}}>{ar?"إجمالي Equity":"Total Equity"}</span>
                <span style={{fontWeight:700}}>{fmt(f.totalEquity)} {cur}</span>
              </div>
              {f.gpEquityBreakdown?.landCap > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"رسملة حق الانتفاع":"Leasehold Cap (GP)"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.landCap)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.partnerLand > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"حصة الشريك":"Partner Land"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.partnerLand)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.devFee > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"أتعاب تطوير":"Dev Fee Invested"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.devFee)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.cash > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"نقدي":"Cash"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.cash)} {cur}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"0.5px solid var(--border-default)",paddingTop:4,marginTop:4}}>
                <span style={{fontWeight:600,color:"#8b5cf6"}}>GP ({fmtPct(f.gpPct*100)})</span>
                <span style={{fontWeight:700,color:"#8b5cf6"}}>{fmt(f.gpEquity)} {cur}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,color:"var(--zan-teal-500)"}}>LP ({fmtPct(f.lpPct*100)})</span>
                <span style={{fontWeight:700,color:"var(--zan-teal-500)"}}>{fmt(f.lpEquity)} {cur}</span>
              </div>
            </div>}
          </>}

          {/* Non-fund modes: just show GP equity */}
          {!isFundMode && hasEq && <div style={g2}>
            <FL label={ar?"حصة المطور (GP)":"Developer Equity (GP)"} hint="0=auto" tip={ar?"مساهمة المطور النقدية. عادة 100% في وضع الدين":"Developer equity. Usually 100% in debt mode"}><Inp type="number" value={cfg.gpEquityManual} onChange={v=>upCfg({gpEquityManual:v})} /></FL>
          </div>}
        </AB>

        {/* ── SECTION: FUND STRUCTURE ── */}
        </SecWrap>
        <SecWrap visible={isFundMode} color="var(--color-success-text)">
        <AH id="fund" color="var(--color-success-text)" label={ar?"هيكل الصندوق":"Fund Structure"} summary={isFundMode ? `${({fund:ar?"صندوق":"Fund",direct:ar?"مباشر":"Direct",spv:"SPV"})[cfg.vehicleType]||""} · ${cfg.gpIsFundManager===false?(ar?"مدير مستقل":"Sep. Mgr"):(ar?"المطور = المدير":"GP = Mgr")}` : ""} visible={isFundMode} />
        <AB id="fund" visible={isFundMode}>
          <div style={g2}>
            <FL label={ar?"الهيكل القانوني":"Vehicle"} tip={ar?"صندوق: وعاء استثماري منظم من هيئة السوق المالية. فيه اشتراك وإدارة ومراجع — الأكثر حوكمة وتنظيماً\nمباشر: المطور والمستثمر يدخلون مباشرة بعقد مشاركة بدون وعاء رسمي — أبسط وأقل رسوم\nSPV: شركة ذات غرض خاص تُنشأ للمشروع فقط — تعزل المخاطر عن الأطراف":"Fund: CMA-regulated vehicle with subscription, management, auditor — highest governance\nDirect: Developer and investor enter via partnership agreement — simpler, fewer fees\nSPV: Special Purpose Vehicle created for this project only — isolates risk"}><Drp lang={lang} value={cfg.vehicleType} onChange={v=>{const reset=v!=="fund"?{subscriptionFeePct:0,structuringFeePct:0,structuringFeeCap:0,preEstablishmentFee:0,spvFee:0,auditorFeeAnnual:0,mgmtFeeCapAnnual:0,custodyFeeAnnual:0}:{};upCfg({vehicleType:v,...reset});}} options={[{value:"fund",en:"Fund - Regulated (default)",ar:"صندوق - منظم (تلقائي)"},{value:"direct",en:"Direct (Partnership)",ar:"مباشر (شراكة)"},{value:"spv",en:"SPV (Ring-fenced)",ar:"SPV (معزول)"}]} /></FL>
            {cfg.vehicleType==="fund"&&<FL label={ar?"اسم الصندوق":"Fund Name"} tip={ar?"الاسم القانوني أو التشغيلي للصندوق. للعرض والتقارير فقط":"Legal or operating fund name. For display and reports only"}><Inp value={cfg.fundName} onChange={v=>upCfg({fundName:v})} /></FL>}
          </div>
          <div style={g2}>
            {(() => {
              // Compute auto fund start year from project data (independent of financing result)
              const sy = project.startYear || 2026;
              let firstCapexYr = sy;
              if (pc?.capex) {
                for (let y = 0; y < (project.horizon||20); y++) {
                  if (pc.capex[y] > 0) { firstCapexYr = sy + y; break; }
                }
              }
              const autoFundStart = firstCapexYr;
              const displayVal = (cfg.fundStartYear || 0) > 0 ? cfg.fundStartYear : autoFundStart;
              const isAuto = displayVal === autoFundStart;
              return <div>
                <FL label={ar?"سنة بداية الصندوق":"Fund Start Year"} tip={ar?"سنة بدء جمع رأس المال وتسجيل الصندوق. غالباً قبل البناء بسنة":"Year capital raising begins. Usually 1 year before construction."}>
                  <Inp type="number" value={displayVal} onChange={v=>upCfg({fundStartYear:v===autoFundStart?0:v})} />
                </FL>
                <div style={{marginTop:-6,marginBottom:4,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:2}}>
                  {ar?`التلقائي: ${autoFundStart} (سنة بداية البناء)`:`Auto: ${autoFundStart} (construction start year)`}
                  {isAuto && <span style={{color:"var(--color-success-text)",marginInlineStart:6}}>✓</span>}
                </div>
              </div>;
            })()}
            <FL label={ar?"المطور = مدير الصندوق؟":"GP = Fund Manager?"} tip={ar?"نعم: المطور يدير الصندوق ويستلم كل الرسوم (تطوير + إدارة + هيكلة)\nلا: شركة مالية مستقلة تدير الصندوق. المطور يأخذ رسوم التطوير فقط":"Yes: Developer manages the fund and receives all fees\nNo: Separate financial company manages. Developer gets dev fee only"}>
              <Drp lang={lang} value={cfg.gpIsFundManager===false?"N":"Y"} onChange={v=>upCfg({gpIsFundManager:v==="Y"})} options={[{value:"Y",en:"Yes (GP = Manager)",ar:"نعم (المطور = المدير)"},{value:"N",en:"No (Separate Manager)",ar:"لا (مدير مستقل)"}]} />
            </FL>
          </div>
        </AB>

        {/* ── SECTION: WATERFALL ── */}
        </SecWrap>
        <SecWrap visible={isFundMode} color="var(--color-success-text)">
        <AH id="wf" color="var(--color-success-text)" label={ar?"حافز الأداء":"Waterfall"} summary={isFundMode ? `Pref ${cfg.prefReturnPct||10}% · Carry ${cfg.carryPct||20}%` : ""} visible={isFundMode} />
        <AB id="wf" visible={isFundMode}>
          <div style={{gridColumn:"1/-1",marginBottom:4}}><HelpLink contentKey="waterfallConcepts" lang={lang} onOpen={setEduModal} label={ar?"اعرف أكثر عن حافز الأداء":"Learn about Waterfall"} /></div>
          <div style={g2}>
            <FL label={ar?"العائد التفضيلي %":"Pref Return %"} tip={ar?"الحد الأدنى للعائد السنوي الذي يحصل عليه المستثمر (LP) قبل أن يشارك المطور (GP) بالأرباح. عادة 8-15%\nيتراكم سنوياً على رأس المال غير المسترد":"Minimum annual return for LP before GP shares profits. Usually 8-15%\nAccrues annually on unreturned capital"} hint={dh("prefReturnPct")}><Inp type="number" value={cfg.prefReturnPct} onChange={v=>upCfg({prefReturnPct:Math.max(0,Math.min(50,v))})} /></FL>
            <FL label={ar?"أتعاب حسن الأداء %":"Performance Carry %"} tip={ar?"نسبة من الأرباح تُدفع للمطور إذا تجاوزت أرباح الصندوق العائد التفضيلي. عادة 20-30%\nمثال: لو العائد التفضيلي 15% والأرباح تجاوزته → 25% من الفائض يروح للمطور كأتعاب حسن أداء":"GP's share of profits after LP receives preferred return. Usually 20-30%\nExample: if pref is 15% and profits exceed it → 25% of excess goes to GP as performance fee"} hint={dh("carryPct")}><Inp type="number" value={cfg.carryPct} onChange={v=>upCfg({carryPct:Math.max(0,Math.min(50,v))})} /></FL>
          </div>
          <div style={g3}>
            <FL label={ar?"نسبة توزيع الممول (LP)":"Investor Split % (LP)"} tip={ar?"نسبة الأرباح المتبقية للمستثمر بعد العائد التفضيلي والـ catch-up. عادة 70-80%\nالباقي يذهب تلقائياً للمطور (GP)":"LP share of remaining profits after pref and catch-up. Usually 70-80%\nRemainder automatically goes to GP"} hint={`GP = ${100-(cfg.lpProfitSplitPct||70)}% · ${dh("lpProfitSplitPct")}`}><Inp type="number" value={cfg.lpProfitSplitPct} onChange={v=>upCfg({lpProfitSplitPct:Math.max(0,Math.min(100,v))})} /></FL>
            <FL label={ar?"تعويض المطور (GP Catch-up)":"Developer Catch-up (GP)"} tip="بعد حصول LP على Pref، يأخذ GP حصة أكبر مؤقتاً حتى يصل للنسبة المتفق عليها\nAfter LP receives pref, GP takes a larger temporary share until agreed economics are reached"><Drp lang={lang} value={cfg.gpCatchup?"Y":"N"} onChange={v=>upCfg({gpCatchup:v==="Y"})} options={["Y","N"]} /></FL>
            <FL label={ar?"معاملة الرسوم":"Fee Treatment"} tip={ar?"رأسمال: الرسوم تُسترد + تحصل عائد تفضيلي\nاسترداد فقط: تُسترد لكن بدون عائد تفضيلي\nمصروف: لا تُسترد ولا تحصل عائد":"Capital: fees earn ROC + Pref\nROC Only: fees returned but no Pref\nExpense: fees not returned, no Pref"}><select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-card)",fontSize:13}}><option value="capital">{ar?"رأسمال - استرداد + Pref (تلقائي)":"Capital - ROC + Pref (default)"}</option><option value="rocOnly">{ar?"استرداد فقط (بدون Pref)":"ROC Only (no Pref)"}</option><option value="expense">{ar?"مصروف (لا استرداد)":"Expense (no ROC)"}</option></select></FL>
          </div>
          <div style={g2}>
            <FL label={ar?"توزيع العائد التفضيلي":"Pref Allocation"} tip={ar?"نسبي: العائد التفضيلي يوزع على GP و LP بحسب حصصهم\nللممول فقط: كامل العائد التفضيلي يذهب لـ LP":"Pro Rata: pref distributed to GP and LP by ownership share\nLP Only: all pref goes to LP (default: proRata)"}>
              <Drp lang={lang} value={cfg.prefAllocation||"proRata"} onChange={v=>upCfg({prefAllocation:v})} options={[{value:"proRata",en:"Pro Rata - GP+LP (default)",ar:"نسبي - GP+LP (تلقائي)"},{value:"lpOnly",en:"LP Only",ar:"للممول فقط"}]} />
            </FL>
            <FL label={ar?"طريقة الـ Catch-up":"Catch-up Method"} tip={ar?"سنوي: يُحسب الـ catch-up كل سنة على حدة\nتراكمي: يُحسب على إجمالي التوزيعات التراكمية":"Per Year: catch-up calculated annually (default)\nCumulative: catch-up on total cumulative distributions"}>
              <Drp lang={lang} value={cfg.catchupMethod||"perYear"} onChange={v=>upCfg({catchupMethod:v})} options={[{value:"perYear",en:"Per Year (default)",ar:"سنوي (تلقائي)"},{value:"cumulative",en:"Cumulative",ar:"تراكمي"}]} />
            </FL>
          </div>
        </AB>
        </SecWrap>
        <SecWrap visible={true} color="var(--color-warning)">
        <AH id="fees" color="var(--color-warning)" label={ar?"الرسوم":"Fees"} summary={isFundMode && cfg.vehicleType==="fund" ? (ar?"11 رسم":"11 fees") : `${ar?"رسوم تطوير":"Dev Fee"} ${cfg.developerFeePct||10}%`} visible={true} />
        <AB id="fees" visible={true}>{(() => {
          if (isFundMode && cfg.vehicleType==="fund") return <>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"رسوم لمرة واحدة":"One-time"}</div>
            <div style={g3}>
              <FL label={ar?"اكتتاب %":"Subscription %"} tip="رسوم دخول لمرة واحدة عند اكتتاب المستثمر. عادة 1-2% من المبلغ المستثمر\nOne-time entry fee at subscription. Usually 1-2% of invested capital" hint={autoHint("subscriptionFeePct",ar?"مرة واحدة · عند الاكتتاب":"One-time · at subscription")}><Inp type="number" value={cfg.subscriptionFeePct} onChange={v=>upCfg({subscriptionFeePct:v})} /></FL>
              <FL label={ar?"هيكلة %":"Structuring %"} tip="نسبة من تكلفة التطوير تُدفع لمرة واحدة لمدير الصندوق مقابل ترتيب الفرصة ودراسات الجدوى\nOne-time fee for deal sourcing, due diligence, and fund setup" hint={autoHint("structuringFeePct",ar?"مرة واحدة · من تكلفة التطوير":"One-time · % of dev cost")}><Inp type="number" value={cfg.structuringFeePct} onChange={v=>upCfg({structuringFeePct:v})} /></FL>
              <FL label={ar?"سقف الهيكلة":"Structuring Cap"} tip="الحد الأقصى لرسوم الهيكلة. 0 = بدون سقف\nMax structuring fee amount. 0 = no cap" hint={autoHint("structuringFeeCap",ar?"حد أقصى · 0 = بدون سقف":"Max amount · 0 = no cap")}><Inp type="number" value={cfg.structuringFeeCap} onChange={v=>upCfg({structuringFeeCap:v})} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"ما قبل التأسيس":"Pre-Establishment"} tip="مصاريف إعداد مستندات الصندوق وتقديمها لهيئة السوق المالية. تُدفع مرة واحدة بعد الإقفال الأولي\nFund document preparation and CMA filing. One-time after initial closing" hint={autoHint("preEstablishmentFee",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.preEstablishmentFee} onChange={v=>upCfg({preEstablishmentFee:v})} /></FL>
              <FL label={ar?"إنشاء SPV":"SPV Fee"} tip="رسوم تأسيس الشركة ذات الغرض الخاص. تُدفع مرة واحدة عند بدء التأسيس\nSPV incorporation fee. One-time at setup" hint={autoHint("spvFee",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.spvFee} onChange={v=>upCfg({spvFee:v})} /></FL>
              <div />
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8,gridColumn:"1/-1"}} />
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"رسوم سنوية":"Annual"}</div>
            <div style={g2}>
              <FL label={ar?"إدارة %":"Management %"} tip="أتعاب إدارية سنوية من صافي أصول الصندوق (NAV). تُستحق وتسدد بشكل ربع سنوي\nAnnual management fee based on fund NAV. Paid quarterly" hint={autoHint("annualMgmtFeePct",ar?"سنوي · من صافي الأصول":"Annual · based on NAV")}><Inp type="number" value={cfg.annualMgmtFeePct} onChange={v=>upCfg({annualMgmtFeePct:v})} /></FL>
              <FL label={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} tip="أساس حساب رسوم الإدارة:\n- صافي الأصول (NAV): القيمة الصافية للصندوق\n- CAPEX تراكمي: المبالغ المنفذة فعلياً\n- تكلفة التطوير: إجمالي التكلفة\n- رأس المال: الملكية الإجمالية" hint={ar?"التلقائي: صافي الأصول":"default: NAV"}><Drp lang={lang} value={cfg.mgmtFeeBase||"nav"} onChange={v=>upCfg({mgmtFeeBase:v})} options={[{value:"nav",en:"Fund NAV (default)",ar:"صافي أصول الصندوق (تلقائي)"},{value:"deployed",en:"Deployed CAPEX",ar:"CAPEX المنفذ"},{value:"devCost",en:"Dev Cost",ar:"تكلفة التطوير"},{value:"equity",en:"Equity",ar:"رأس المال"}]} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"سقف الإدارة/سنة":"Mgmt Cap/yr"} tip="الحد الأقصى لرسوم الإدارة سنوياً. 0 = بدون سقف\nMax annual management fee. 0 = no cap" hint={autoHint("mgmtFeeCapAnnual",ar?"حد أقصى سنوي · 0 = بدون سقف":"Max annual · 0 = no cap")}><Inp type="number" value={cfg.mgmtFeeCapAnnual} onChange={v=>upCfg({mgmtFeeCapAnnual:v})} /></FL>
              <FL label={ar?"رسوم الحفظ/سنة":"Custody/yr"} tip="رسوم سنوية لأمين الحفظ. تُدفع نصف سنوي\nAnnual custody fee. Paid semi-annually" hint={autoHint("custodyFeeAnnual",ar?"سنوي · نصف سنوي":"Annual · semi-annual")}><Inp type="number" value={cfg.custodyFeeAnnual} onChange={v=>upCfg({custodyFeeAnnual:v})} /></FL>
              <FL label={ar?"مراجع حسابات/سنة":"Auditor/yr"} tip="أتعاب سنوية لمراجع الحسابات. تُدفع نصف سنوي بعد كل تقييم\nAnnual auditor fee. Paid semi-annually after each valuation" hint={autoHint("auditorFeeAnnual",ar?"سنوي":"Annual")}><Inp type="number" value={cfg.auditorFeeAnnual} onChange={v=>upCfg({auditorFeeAnnual:v})} /></FL>
              <FL label={ar?"أتعاب المشغل %":"Operator Fee %"} tip="أتعاب سنوية لمشغل المشروع. تُحسب كنسبة من حجم الأصول المنفذة. تبدأ بعد انتهاء البناء تلقائياً للمشاريع التأجيرية\nAnnual operator fee as % of completed asset value. Starts after construction. Auto-applied for rental projects" hint={autoHint("operatorFeePct",ar?"سنوي · تأجير فقط":"Annual · rental only")}><Inp type="number" value={cfg.operatorFeePct} onChange={v=>upCfg({operatorFeePct:v})} step={0.01} /></FL>
              <FL label={ar?"سقف المشغل/سنة":"Operator Cap/yr"} tip="الحد الأقصى لأتعاب المشغل سنوياً. 0 = بدون سقف\nMax annual operator fee. 0 = no cap" hint={autoHint("operatorFeeCap",ar?"حد أقصى سنوي":"Max annual")}><Inp type="number" value={cfg.operatorFeeCap} onChange={v=>upCfg({operatorFeeCap:v})} /></FL>
              <FL label={ar?"مصروفات أخرى %":"Misc. Expenses %"} tip="مصروفات متنوعة (تقييم، رقابة شرعية، مجلس إدارة، وغيرها). تُحسب كنسبة من إجمالي الأصول وتُدفع مرة واحدة عند بداية الصندوق\nMiscellaneous expenses (valuation, Sharia, board, etc.). One-time at fund start as % of total assets" hint={autoHint("miscExpensePct",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.miscExpensePct} onChange={v=>upCfg({miscExpensePct:v})} step={0.1} /></FL>
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8,gridColumn:"1/-1"}} />
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"مرتبطة بالبناء":"Construction-linked"}</div>
            <FL label={ar?"رسوم التطوير %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية (عقد المقاول). تُدفع متزامنة مع مستخلصات المقاول\nDeveloper fee as % of construction costs. Paid with contractor draws" hint={autoHint("developerFeePct",ar?"مع مستخلصات البناء":"With construction draws")}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>
          </>;
          if (isFundMode) return <FL label={ar?"رسوم التطوير %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية (عقد المقاول). تُدفع متزامنة مع مستخلصات المقاول\nDeveloper fee as % of construction costs. Paid with contractor draws" hint={autoHint("developerFeePct",ar?"مع مستخلصات البناء":"With construction draws")}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>;
          // Debt + Equity mode (not fund)
          return <FL label={ar?"رسوم التطوير %":"Dev Fee %"} tip="أتعاب المطور كنسبة من CAPEX. عادة 3-7%\nDeveloper fee as % of CAPEX. Usually 3-7%"><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>;
        })()}</AB>

        </SecWrap>
        </div>;
      })()}


    {/* ═══ FINANCING RESULTS (KPIs + tables) ═══ */}
    {!f ? (
      <div style={{textAlign:"center",padding:32,color:"var(--text-tertiary)"}}>{ar?"اضبط إعدادات التمويل أعلاه":"Configure financing settings above"}</div>
    ) : (<>

    {/* ── Collapsible Section Helper ── */}
    {(() => {
      const Sec = ({id, icon, title, titleAr, color, children, alwaysOpen, badge}) => {
        const open = alwaysOpen || isOpen(id);
        return <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:`1px solid ${open?color+"33":"var(--border-default)"}`,marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
          <div onClick={alwaysOpen?undefined:()=>toggle(id)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:alwaysOpen?"default":"pointer",background:open?color+"08":"var(--surface-page)",borderBottom:open?`1px solid ${color}22`:"none",userSelect:"none"}}>
            <span style={{fontSize:14}}>{icon}</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?titleAr:title}</span>
            {badge && <span style={{fontSize:10,fontWeight:600,color:color,background:color+"18",padding:"2px 8px",borderRadius:"var(--radius-lg)"}}>{badge}</span>}
            {!alwaysOpen && <span style={{fontSize:11,color:"var(--text-tertiary)",transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>{open?"▼":"▶"}</span>}
          </div>
          {open && <div style={{padding:"12px 16px",animation:"zanSlide 0.15s ease"}}>{children}</div>}
        </div>;
      };

      // Get waterfall for selected phase
      const w = (isSinglePhase && phaseWaterfalls?.[singlePhaseName]) ? phaseWaterfalls[singlePhaseName] : waterfall;
      const isFund = cfg.finMode === "fund";
      const isBank = cfg.finMode === "debt" || cfg.finMode === "bank100";
      const isSelf = cfg.finMode === "self";

      // Fee totals from waterfall (if available)
      const feeData = w ? {
        sub: (w.feeSub||[]).reduce((a,b)=>a+b,0),
        mgmt: (w.feeMgmt||[]).reduce((a,b)=>a+b,0),
        custody: (w.feeCustody||[]).reduce((a,b)=>a+b,0),
        dev: (w.feeDev||[]).reduce((a,b)=>a+b,0),
        struct: (w.feeStruct||[]).reduce((a,b)=>a+b,0),
        preEst: (w.feePreEst||[]).reduce((a,b)=>a+b,0),
        spv: (w.feeSpv||[]).reduce((a,b)=>a+b,0),
        auditor: (w.feeAuditor||[]).reduce((a,b)=>a+b,0),
        operator: (w.feeOperator||[]).reduce((a,b)=>a+b,0),
        misc: (w.feeMisc||[]).reduce((a,b)=>a+b,0),
        total: w.totalFees || 0,
        unfunded: (w.unfundedFees||[]).reduce((a,b)=>a+b,0),
      } : null;

      // Total financing cost = interest (includes upfront fee) + fund fees
      const totalFinCost = f.totalInterest + (feeData ? feeData.total : 0);
      const finCostPct = f.devCostInclLand > 0 ? totalFinCost / f.devCostInclLand : 0;

      // Stable income for yield
      const stableIncome = pc.income.find((v,i) => i > (f.constrEnd||0) && v > 0) || 0;
      const cashOnCash = f.totalEquity > 0 && stableIncome > 0 ? stableIncome / f.totalEquity : 0;

      return <>
      {/* LP = 0 warning - only relevant for fund/jv where LP is expected */}
      {f.lpEquity === 0 && (project.finMode === "fund" || project.finMode === "jv") && (
        <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",border:"1px solid #fde68a",padding:"12px 16px",marginBottom:14,fontSize:12,color:"var(--color-warning-text)"}}>
          <strong>⚠ {ar?"LP Equity = صفر":"LP Equity = 0"}</strong><br/>
          {ar ? "لا يوجد مستثمرين (LP). لتفعيل LP: فعّل رسملة حق الانتفاع أو أضف استثمار أتعاب التطوير أو استثمار نقدي" : "No investor equity. Enable Leasehold Capitalization, invest dev fee, or add cash investment."}
        </div>
      )}

      {/* ═══ SECTION 1: KEY METRICS (always open) ═══ */}
      <Sec id="kpi" icon="📊" title="Key Metrics" titleAr="المؤشرات الرئيسية" color="var(--zan-teal-500)" alwaysOpen>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(145px, 1fr))",gap:10}}>
          <KPI label={ar?"تكلفة التطوير (شامل الأرض)":"Dev Cost (Incl Land)"} value={fmtM(f.devCostInclLand)} sub={cur} color="var(--text-primary)" />
          <KPI label={ar?"سقف الدين":"Max Debt (LTV)"} value={fmtM(f.maxDebt)} sub={`${cfg.maxLtvPct||70}% LTV`} color="var(--color-danger)" />
          <KPI label={ar?"إجمالي الملكية":"Total Equity"} value={fmtM(f.totalEquity)} sub={fmtPct((1-(f.totalDebt/(f.devCostInclLand||1)))*100)} color="var(--color-info)" />
          <KPI label={ar?"IRR بعد التمويل":"Levered IRR"} value={f.leveredIRR!==null?fmtPct(f.leveredIRR*100):"N/A"} color={getMetricColor("IRR",f.leveredIRR)} />
          <KPI label={ar?"إجمالي تكلفة التمويل":"Total Financing Cost"} value={fmtM(totalFinCost)} sub={finCostPct>0?fmtPct(finCostPct*100)+" "+ar?"من التكلفة":"of cost":""} color="var(--color-danger)" tip={ar?"فوائد (شامل رسوم القرض) + رسوم صندوق\nInterest (incl. upfront fee) + Fund Fees":""} />
          <KPI label={ar?"عائد نقدي سنوي":"Cash-on-Cash Yield"} value={cashOnCash>0?fmtPct(cashOnCash*100):"—"} color={cashOnCash>0.08?"var(--color-success-text)":"var(--color-warning)"} />
          {isFund && feeData && <KPI label={ar?"إجمالي الرسوم":"Total Fund Fees"} value={fmtM(feeData.total)} sub={f.devCostInclLand>0?fmtPct(feeData.total/f.devCostInclLand*100)+" "+ar?"من التكلفة":"of cost":""} color="var(--color-warning)" />}
          <KPI label={ar?"إجمالي الفوائد":"Total Interest"} value={fmtM(f.totalInterest)} sub={cur} color="var(--color-danger)" />
        </div>
      </Sec>

      {/* ═══ SECTION 2: CAPITAL STRUCTURE (collapsible) ═══ */}
      <Sec id="capital" icon="🏗" title="Capital Structure" titleAr="هيكل رأس المال" color="var(--color-info)" badge={`${fmtM(f.devCostInclLand)}`}>
        {/* Sources & Uses */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--color-success-text)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {f.totalDebt > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"الدين البنكي":"Bank Debt"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.totalDebt)} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{fmtPct((f.totalDebt/(f.devCostInclLand||1))*100)}</span></span></>}
              {f.gpEquity > 0 && <><span style={{color:"var(--color-info)"}}>{ar?"حصة المطور (GP)":"GP Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.gpEquity)} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{fmtPct(f.gpPct*100)}</span></span></>}
              {f.lpEquity > 0 && <><span style={{color:"#8b5cf6"}}>{ar?"حصة الممول (LP)":"LP Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.lpEquity)} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{fmtPct(f.lpPct*100)}</span></span></>}
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.totalDebt + f.gpEquity + f.lpEquity)}</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--color-danger)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"الاستخدامات":"USES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"تكاليف البناء":"Construction Cost"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.devCostExclLand)}</span>
              {f.landCapValue > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"رسملة الأرض":"Land Capitalization"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.landCapValue)}</span></>}
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.devCostInclLand)}</span>
            </div>
          </div>
        </div>
        {/* Equation */}
        <div style={{background:"var(--color-info-bg)",borderRadius:"var(--radius-sm)",padding:"8px 14px",fontSize:12}}>
          <strong>{ar?"المعادلة":"Equation"}:</strong>{" "}
          {ar?"دين":"Debt"} ({fmtM(f.totalDebt)}) + GP ({fmtM(f.gpEquity)}){f.lpEquity > 0 ? ` + LP (${fmtM(f.lpEquity)})` : ""} = {fmtM(f.totalDebt + f.gpEquity + f.lpEquity)}{" "}
          {Math.abs((f.totalDebt + f.gpEquity + f.lpEquity) - f.devCostInclLand) < 1000
            ? <span style={{color:"var(--color-success-text)",fontWeight:600}}>✓</span>
            : <span style={{color:"var(--color-danger)",fontWeight:600}}>✗ ≠ {fmtM(f.devCostInclLand)}</span>}
        </div>
      </Sec>

      {/* ═══ SECTION 3: FINANCING COSTS (collapsible) ═══ */}
      {!isSelf && <Sec id="costs" icon="💸" title={isFund?"Fund Fees & Financing Costs":"Financing Costs"} titleAr={isFund?"رسوم الصندوق وتكاليف التمويل":"تكاليف التمويل"} color="var(--color-warning)" badge={fmtM(totalFinCost)}>
        <div style={{display:"grid",gridTemplateColumns:isFund&&!isMobile?"1fr 1fr":"1fr",gap:14}}>
          {/* Bank/Debt Costs */}
          {f.totalDebt > 0 && <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--color-danger)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"تكلفة الدين":"DEBT COSTS"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"إجمالي الفوائد":"Total Interest"}</span><span style={{textAlign:"right",fontWeight:500,color:"var(--color-danger)"}}>{fmt(f.totalInterest)}</span>
              {(f.upfrontFee||0) > 0 && <><span style={{color:"var(--text-tertiary)",fontSize:10,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* incl. upfront fee"}: {fmt(f.upfrontFee)} ({cfg.upfrontFeePct||0}%)</span><span></span></>}
              <span style={{color:"var(--text-secondary)"}}>{ar?"معدل التمويل":"Finance Rate"}</span><span style={{textAlign:"right",fontWeight:600}}>{cfg.financeRate||0}%</span>
              <span style={{color:"var(--text-secondary)"}}>{ar?"المدة":"Tenor"}</span><span style={{textAlign:"right",fontWeight:500}}>{cfg.loanTenor} {ar?"سنة":"yrs"} ({cfg.debtGrace} {ar?"سماح":"grace"})</span>
              <span style={{color:"var(--text-secondary)"}}>{ar?"السداد يبدأ":"Repay Starts"}</span><span style={{textAlign:"right",fontWeight:500}}>{sy + f.repayStart}</span>
              <span style={{color:"var(--text-secondary)"}}>{ar?"نوع السداد":"Repay Type"}</span><span style={{textAlign:"right",fontWeight:500}}>{cfg.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</span>
              <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,fontWeight:700,color:"var(--color-danger)"}}>{ar?"إجمالي تكلفة الدين":"Total Debt Cost"}</span>
              <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,textAlign:"right",fontWeight:700,color:"var(--color-danger)"}}>{fmt(f.totalInterest)}</span>
            </div>
          </div>}

          {/* Fund Fees */}
          {isFund && feeData && <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--color-warning)",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fde68a"}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {[
                {l:ar?"اكتتاب":"Subscription",v:feeData.sub,pct:cfg.subscriptionFeePct,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"إدارة":"Management",v:feeData.mgmt,pct:cfg.annualMgmtFeePct,hint:ar?"سنوي":"annual"},
                {l:ar?"حفظ":"Custody",v:feeData.custody,hint:ar?"سنوي":"annual"},
                {l:ar?"تطوير":"Developer Fee",v:feeData.dev,pct:cfg.developerFeePct,hint:ar?"مع البناء":"with constr."},
                {l:ar?"هيكلة":"Structuring",v:feeData.struct,pct:cfg.structuringFeePct,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"ما قبل التأسيس":"Pre-Establishment",v:feeData.preEst,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"إنشاء SPV":"SPV Setup",v:feeData.spv,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"مراجع حسابات":"Auditor",v:feeData.auditor,hint:ar?"سنوي":"annual"},
                {l:ar?"أتعاب المشغل":"Operator Fee",v:feeData.operator,pct:cfg.operatorFeePct,hint:ar?"سنوي · بعد البناء":"annual · post-constr."},
                {l:ar?"مصروفات أخرى":"Misc. Expenses",v:feeData.misc,pct:cfg.miscExpensePct,hint:ar?"مرة واحدة":"one-time"},
              ].filter(x=>x.v>0).map((x,i)=>[
                <span key={i+"l"} style={{color:"var(--text-secondary)"}}>{x.l} <span style={{fontSize:9,color:"#b0b5c0"}}>{x.hint}</span></span>,
                <span key={i+"v"} style={{textAlign:"right",fontWeight:500}}>{fmt(x.v)} {x.pct?<span style={{fontSize:10,color:"var(--text-tertiary)"}}>{x.pct}%</span>:""}</span>
              ])}
              <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,fontWeight:700,color:"var(--color-warning)"}}>{ar?"إجمالي الرسوم":"Total Fees"}</span>
              <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,textAlign:"right",fontWeight:700,color:"var(--color-warning)"}}>{fmt(feeData.total)}</span>
              {feeData.unfunded > 0 && <><span style={{color:"var(--color-warning-text)",fontSize:11}}>{ar?"رسوم ممولة من Equity":"Equity-Funded Fees"}</span><span style={{textAlign:"right",fontWeight:500,fontSize:11,color:"var(--color-warning-text)"}}>{fmt(feeData.unfunded)}</span></>}
            </div>
          </div>}
        </div>

        {/* Total Financing Cost Summary */}
        <div style={{marginTop:12,background:"var(--color-warning-bg)",borderRadius:"var(--radius-sm)",padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr auto",gap:"6px 20px",fontSize:12,maxWidth:520}}>
          <span style={{fontWeight:700}}>{ar?"إجمالي تكلفة التمويل الكلية":"TOTAL FINANCING COST"}</span>
          <span style={{textAlign:"right",fontWeight:800,fontSize:14,color:"var(--color-danger)"}}>{fmt(totalFinCost)} {cur}</span>
          <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost"}</span>
          <span style={{textAlign:"right",fontWeight:600,color:"var(--color-warning-text)"}}>{fmtPct(finCostPct*100)}</span>
        </div>
      </Sec>}

      {/* ═══ SECTION 4: DEBT SERVICE & DSCR (collapsible) ═══ */}
      {f.totalDebt > 0 && <Sec id="dscr" icon="🏦" title="Debt Service & DSCR" titleAr="خدمة الدين و DSCR" color="var(--color-info)">
        {/* Debt Structure Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,fontSize:12,marginBottom:14}}>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"الهيكل":"Structure"}</span><strong>{cfg.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</strong></div>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"المدة":"Tenor"}</span><strong>{cfg.loanTenor} {ar?"سنة":"yrs"}</strong> <span style={{fontSize:10,color:"var(--text-tertiary)"}}>({cfg.debtGrace} {ar?"سماح":"grace"} + {f.repayYears} {ar?"سداد":"repay"})</span></div>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"بداية السداد":"Repay Starts"}</span><strong>{sy + f.repayStart}</strong></div>
          <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"التخارج":"Exit"}</span><strong>{f.exitYear}</strong> ({cfg.exitMultiple}x)</div>
        </div>
        {/* DSCR pills */}
        <div style={{fontSize:12,fontWeight:600,marginBottom:8}}><Tip text={ar?"صافي الدخل التشغيلي / خدمة الدين. البنوك تطلب 1.25x كحد أدنى":"NOI / Debt Service. Banks require min 1.25x"}>DSCR</Tip></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {years.filter(y=>f.dscr[y]!==null).map(y=>{
            const v = f.dscr[y];
            const bg = v >= 1.5 ? "#dcfce7" : v >= 1.2 ? "#fef9c3" : v >= 1.0 ? "#ffedd5" : "var(--color-danger-bg)";
            const fg = v >= 1.5 ? "var(--color-success-text)" : v >= 1.2 ? "var(--color-warning-text)" : v >= 1.0 ? "#c2410c" : "var(--color-danger)";
            return <div key={y} style={{textAlign:"center",padding:"4px 8px",borderRadius:4,background:bg,minWidth:50}}>
              <div style={{fontSize:10,color:"var(--text-secondary)"}}>{sy+y}</div>
              <div style={{fontSize:13,fontWeight:700,color:fg}}>{v.toFixed(2)}x</div>
            </div>;
          })}
        </div>
        <div style={{fontSize:10,color:"var(--text-tertiary)"}}>🟢 ≥ 1.5x | 🟡 ≥ 1.2x | 🟠 ≥ 1.0x | 🔴 &lt; 1.0x</div>
      </Sec>}

      {/* ═══ SECTION 5: INTEGRATED CASH FLOW (always open) ═══ */}
      <Sec id="cf" icon="📋" title="Integrated Cash Flow" titleAr="التدفق النقدي المتكامل" color="#1e3a5f" alwaysOpen>
        <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:10}}>
          <div style={{flex:1,fontSize:11,color:"var(--text-secondary)"}}>{ar?"التدفق النقدي بعد خدمة الدين والرسوم":"Cash flow after debt service and fees"}</div>
          <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:12}}>
            {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"years"}</option>)}
          </select>
        </div>

        <div style={{borderRadius:"var(--radius-md)",border:"2px solid #1e3a5f",overflow:"hidden"}}>
          <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
            <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2,minWidth:isMobile?110:180}}>{ar?"البند":"Line Item"}</th>
            <th style={{...thSt,textAlign:"right"}}>{ar?"الإجمالي":"Total"}</th>
            {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:80}}>{ar?`سنة ${y+1}`:`Yr ${y+1}`}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
          </tr></thead><tbody>
            {/* ── Project CF ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"var(--color-success-text)",background:"var(--color-success-bg)",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التدفق التشغيلي":"PROJECT CASH FLOW"}{isFiltered ? ` — ${activePh.join(", ")}` : ""}</td></tr>
            <CFRow label={ar?"الإيرادات":"Revenue"} values={pc.income} total={pc.totalIncome} color="var(--color-success-text)" />
            <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pc.landRent} total={pc.totalLandRent} color="var(--color-danger)" negate />
            <CFRow label={ar?"(-) تكاليف التطوير":"(-) CAPEX"} values={pc.capex} total={pc.totalCapex} color="var(--color-danger)" negate />
            {(() => { const unlev = new Array(h).fill(0); for(let y=0;y<h;y++) unlev[y]=(pc.income[y]||0)-(pc.landRent[y]||0)-(pc.capex[y]||0); return <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered Net CF"} values={unlev} total={unlev.reduce((a,b)=>a+b,0)} bold />; })()}

            {/* ── Financing ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"var(--color-info)",background:"var(--color-info-bg)",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التمويل":"FINANCING"}</td></tr>
            <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={f.equityCalls} total={f.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" />
            <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={f.drawdown} total={f.totalDebt} color="var(--color-info)" />
            <CFRow label={ar?"(-) سداد أصل الدين":"(-) Repayment"} values={f.repayment} total={f.repayment.reduce((a,b)=>a+b,0)} color="var(--color-danger)" negate />
            <CFRow label={ar?"(-) تكلفة التمويل":"(-) Interest / Profit Cost"} values={f.interest} total={f.totalInterest} color="var(--color-danger)" negate />
            <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={f.debtService} total={f.debtService.reduce((a,b)=>a+b,0)} color="#dc2626" negate bold />
            {/* Debt balance */}
            <tr style={{background:"var(--color-info-bg)"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-info-bg)",zIndex:1,fontWeight:400,fontSize:10,color:"var(--color-info)",paddingInlineStart:24}}>{ar?"رصيد الدين (بداية)":"Debt Balance (Open)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"var(--color-info)",fontSize:10}}>{f.debtBalOpen[y]===0?"—":fmt(f.debtBalOpen[y])}</td>)}
            </tr>
            <tr style={{background:"var(--color-info-bg)"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-info-bg)",zIndex:1,fontWeight:500,fontSize:10,color:"var(--color-info)",paddingInlineStart:24}}>{ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"var(--color-info)",fontSize:10}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
            </tr>

            {/* ── Fund Fees (if fund mode and waterfall available) ── */}
            {isFund && w && <>
              <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"var(--color-warning)",background:"var(--color-warning-bg)",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"رسوم الصندوق":"FUND FEES"}</td></tr>
              {(w.feeSub||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) اكتتاب":"(-) Subscription"} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeMgmt||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إدارة":"(-) Management"} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeCustody||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) حفظ":"(-) Custody"} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeDev||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) تطوير":"(-) Developer Fee"} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeStruct||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) هيكلة":"(-) Structuring"} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feePreEst||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) ما قبل التأسيس":"(-) Pre-Establishment"} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeSpv||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إنشاء SPV":"(-) SPV Setup"} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeAuditor||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مراجع حسابات":"(-) Auditor"} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeOperator||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) أتعاب المشغل":"(-) Operator Fee"} values={w.feeOperator} total={(w.feeOperator||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              {(w.feeMisc||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مصروفات أخرى":"(-) Misc. Expenses"} values={w.feeMisc} total={(w.feeMisc||[]).reduce((a,b)=>a+b,0)} color="var(--color-warning-text)" negate />}
              <CFRow label={ar?"= إجمالي الرسوم":"= Total Fees"} values={w.fees||[]} total={w.totalFees||0} color="var(--color-warning)" negate bold />
              {(w.unfundedFees||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
            </>}

            {/* ── Exit ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#8b5cf6",background:"#faf5ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التخارج":"EXIT"}</td></tr>
            <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={f.exitProceeds} total={f.exitProceeds.reduce((a,b)=>a+b,0)} color="#8b5cf6" />

            {/* ── Net Result ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"var(--color-info-bg)",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb"}}>{ar?"النتيجة":"NET RESULT"}</td></tr>
            <CFRow label={ar?"= صافي التدفق الممول":"= Levered Net CF"} values={f.leveredCF} total={f.leveredCF.reduce((a,b)=>a+b,0)} bold />
            {(() => { let cum=0; return <tr style={{background:"var(--color-warning-bg)"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-warning-bg)",zIndex:1,fontWeight:600,fontSize:10,color:"var(--color-warning-text)",minWidth:isMobile?110:180}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
              <td style={tdN}></td>
              {years.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"var(--color-danger)":"var(--color-success-text)"}}>{fmt(cum)}</td>;})}
            </tr>; })()}
            {/* DSCR */}
            <tr style={{background:"var(--color-warning-bg)"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-warning-bg)",zIndex:1,fontWeight:600,fontSize:11,color:"var(--color-warning-text)"}}>DSCR</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"var(--text-tertiary)":f.dscr[y]>=1.5?"var(--color-success-text)":f.dscr[y]>=1.2?"var(--color-warning-text)":"var(--color-danger)",fontWeight:600,fontSize:11}}>{f.dscr[y]===null?"—":f.dscr[y].toFixed(2)+"x"}</td>)}
            </tr>
          </tbody></table></div>
        </div>
      </Sec>
      </>;
    })()}
    </>)}

    {/* ═══ LEVERED CF TRACER — formula transparency like Excel ═══ */}
    {f && f.leveredCF && (() => {
      const [tracerOpen, setTracerOpen] = useState(false);
      const c = pc; // phase or consolidated
      const adjLR = ir?.adjustedLandRent || c.landRent;
      const isSelfMode = f.mode === "self";
      const exitYrIdx = f.exitYear ? f.exitYear - sy : -1;
      const fSold = (cfg.exitStrategy || "sale") !== "hold" && exitYrIdx >= 0 && exitYrIdx < h;
      const tracerYears = Array.from({length:Math.min(15,h)},(_,i)=>i);
      const tdS = {padding:"3px 6px",fontSize:10,fontFamily:"monospace",textAlign:"right",borderBottom:"0.5px solid var(--surface-separator)",whiteSpace:"nowrap"};
      const tdH = {...tdS,fontWeight:700,background:"var(--surface-page)",textAlign:"center",fontSize:9,position:"sticky",top:0,zIndex:1};
      const tdL = {...tdS,textAlign:"left",fontWeight:600,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,minWidth:isMobile?110:180};
      const fmtC = v => v === 0 ? "—" : (v > 0 ? "+" : "") + (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+"M" : Math.abs(v) >= 1000 ? (v/1000).toFixed(0)+"K" : v.toFixed(0));
      const rowColor = (v) => v > 0 ? "var(--color-success-text)" : v < 0 ? "var(--color-danger)" : "var(--text-tertiary)";

      return <div style={{marginTop:20}}>
        <div onClick={()=>setTracerOpen(!tracerOpen)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"linear-gradient(135deg,#1e3a5f,#2563eb)",borderRadius:"var(--radius-lg)",color:"var(--text-inverse)",userSelect:"none"}}>
          <span style={{fontSize:16}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,flex:1}}>{ar?"تتبع التدفق الممول — شفافية كاملة":"Levered CF Tracer — Full Transparency"}</span>
          <span style={{fontSize:10,opacity:0.7}}>{ar?"مثل خلية إكسل — شوف من وين جاي كل رقم":"Like an Excel cell — see where every number comes from"}</span>
          <span style={{fontSize:12}}>{tracerOpen?"▼":"▶"}</span>
        </div>
        {tracerOpen && <div style={{border:"0.5px solid var(--border-default)",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"auto",maxHeight:600}}>
          {/* FORMULA */}
          <div style={{padding:"12px 16px",background:"var(--color-info-bg)",borderBottom:"2px solid #2563eb"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1e3a5f",marginBottom:6}}>{ar?"المعادلة:":"FORMULA:"}</div>
            <div style={{fontFamily:"monospace",fontSize:12,color:"#1e3a5f",lineHeight:1.8}}>
              {isSelfMode
                ? <>{ar?"التدفق الممول":"Levered CF"} = <span style={{color:"var(--color-success-text)"}}>{ar?"الدخل":"Income"}</span> − <span style={{color:"var(--color-danger)"}}>{ar?"إيجار أرض (معدّل)":"Adj Land Rent"}</span> − <span style={{color:"var(--color-danger)"}}>CAPEX</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"منحة":"Grant"}</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"خصم رسوم":"Fee Rebate"}</span> − <span style={{color:"var(--color-danger)"}}>{ar?"رسم المطور":"Dev Fee"}</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"تخارج":"Exit"}</span></>
                : <>{ar?"التدفق الممول":"Levered CF"} = <span style={{color:"var(--color-success-text)"}}>{ar?"الدخل":"Income"}</span> − <span style={{color:"var(--color-danger)"}}>{ar?"إيجار أرض (معدّل)":"Adj Land Rent"}</span> − <span style={{color:"var(--color-danger)"}}>CAPEX</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"منحة":"Grant"}</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"خصم رسوم":"Fee Rebate"}</span> − <span style={{color:"var(--color-danger)"}}>{ar?"خدمة دين (معدّلة)":"Adj Debt Service"}</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"سحب":"Drawdown"}</span> + <span style={{color:"var(--color-success-text)"}}>{ar?"تخارج":"Exit"}</span> − <span style={{color:"var(--color-danger)"}}>{ar?"رسم المطور":"Dev Fee"}</span></>
              }
            </div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:6}}>
              {ar?"المصدر: financing.js سطر ":"Source: financing.js L"}{isSelfMode?"128-177":"545-553"} → {ar?"يُخزن بـ":"stored in "} f.leveredCF → {ar?"يُقرأ مباشرة بكل الصفحات":"read directly by all views"}
            </div>
          </div>
          {/* TABLE */}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead>
              <tr>
                <th style={tdH}>{ar?"المكوّن":"Component"}</th>
                <th style={tdH}>{ar?"المصدر":"Source"}</th>
                {tracerYears.map(y=><th key={y} style={tdH}>{sy+y}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td style={{...tdL,color:"var(--color-success-text)"}}>{ar?"الدخل":"Income"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>c.income</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-success-text)"}}>{fmtC(c.income[y])}</td>)}</tr>
              <tr><td style={{...tdL,color:"var(--color-danger)"}}>{ar?"(−) إيجار أرض":"(−) Land Rent"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>{ir?.adjustedLandRent?"ir.adjLR":"c.landRent"}</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-danger)"}}>{fmtC(-adjLR[y])}</td>)}</tr>
              <tr><td style={{...tdL,color:"var(--color-danger)"}}>{ar?"(−) CAPEX":"(−) CAPEX"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>c.capex</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-danger)"}}>{fmtC(-c.capex[y])}</td>)}</tr>
              {(ir?.capexGrantSchedule||[]).some(v=>v>0) && <tr><td style={{...tdL,color:"var(--color-success-text)"}}>{ar?"(+) منحة CAPEX":"(+) CAPEX Grant"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>ir.capexGrant</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-success-text)"}}>{fmtC(ir?.capexGrantSchedule?.[y]||0)}</td>)}</tr>}
              {(ir?.feeRebateSchedule||[]).some(v=>v>0) && <tr><td style={{...tdL,color:"var(--color-success-text)"}}>{ar?"(+) خصم رسوم":"(+) Fee Rebate"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>ir.feeRebate</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-success-text)"}}>{fmtC(ir?.feeRebateSchedule?.[y]||0)}</td>)}</tr>}
              {!isSelfMode && <tr><td style={{...tdL,color:"var(--color-danger)"}}>{ar?"(−) خدمة الدين":"(−) Debt Service"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.debtService</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-danger)"}}>{fmtC(-(f.debtService[y]||0))}</td>)}</tr>}
              {!isSelfMode && <tr><td style={{...tdL,color:"var(--color-info)"}}>{ar?"(+) سحب القرض":"(+) Drawdown"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.drawdown</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-info)"}}>{fmtC(f.drawdown[y]||0)}</td>)}</tr>}
              <tr><td style={{...tdL,color:"var(--color-success-text)"}}>{ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.exitProceeds</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:f.exitProceeds[y]>0?"var(--color-success-text)":"var(--text-tertiary)"}}>{fmtC(f.exitProceeds[y]||0)}</td>)}</tr>
              <tr><td style={{...tdL,color:"var(--color-danger)"}}>{ar?"(−) رسم المطور":"(−) Dev Fee"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.devFeeSchedule</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"var(--color-danger)"}}>{fmtC(-(f.devFeeSchedule?.[y]||0))}</td>)}</tr>
              {/* RESULT */}
              <tr style={{background:"#1e3a5f"}}>
                <td style={{...tdL,background:"#1e3a5f",color:"var(--text-inverse)",fontWeight:700,borderTop:"2px solid #2563eb"}}>{ar?"= التدفق الممول":"= Levered CF"}</td>
                <td style={{...tdS,background:"#1e3a5f",color:"#93c5fd",fontSize:9,borderTop:"2px solid #2563eb"}}>f.leveredCF</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,background:"#1e3a5f",color:f.leveredCF[y]>0?"#86efac":f.leveredCF[y]<0?"#fca5a5":"#6b7280",fontWeight:700,borderTop:"2px solid #2563eb"}}>{fmtC(f.leveredCF[y])}</td>)}
              </tr>
              {/* VERIFICATION */}
              <tr style={{background:"var(--color-warning-bg)"}}>
                <td style={{...tdL,background:"var(--color-warning-bg)",color:"var(--color-warning-text)",fontSize:9}}>{ar?"✓ تحقق (حساب مستقل)":"✓ Verify (independent calc)"}</td>
                <td style={{...tdS,background:"var(--color-warning-bg)",fontSize:10,color:"var(--text-tertiary)"}}>{ar?"يدوي":"manual"}</td>
                {tracerYears.map(y=>{
                  let exp;
                  if (fSold && y > exitYrIdx) { exp = 0; }
                  else if (isSelfMode) {
                    const adjNetCF = ir?.adjustedNetCF?.[y] ?? (c.income[y] - c.landRent[y] - c.capex[y]);
                    exp = adjNetCF - (f.devFeeSchedule?.[y]||0) + (f.exitProceeds[y]||0);
                  } else {
                    exp = c.income[y] - adjLR[y] - c.capex[y] + (ir?.capexGrantSchedule?.[y]||0) + (ir?.feeRebateSchedule?.[y]||0) - (f.debtService[y]||0) + (f.drawdown[y]||0) + (f.exitProceeds[y]||0) - (f.devFeeSchedule?.[y]||0);
                  }
                  const match = Math.abs((f.leveredCF[y]||0) - exp) < 1;
                  return <td key={y} style={{...tdS,background:match?"#fefce8":"var(--color-danger-bg)",color:match?"var(--color-success-text)":"var(--color-danger)",fontWeight:700,fontSize:9}}>{match?"✓":"✗ "+fmtC(exp)}</td>;
                })}
              </tr>
              {/* CUMULATIVE */}
              {(() => { let cum = 0; return <tr style={{background:"var(--color-info-bg)"}}>
                <td style={{...tdL,background:"var(--color-info-bg)",color:"var(--zan-teal-500)",fontWeight:600}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
                <td style={{...tdS,background:"var(--color-info-bg)"}}></td>
                {tracerYears.map(y => { cum += f.leveredCF[y]||0; return <td key={y} style={{...tdS,background:"var(--color-info-bg)",color:cum>0?"var(--color-success-text)":"var(--color-danger)",fontWeight:600}}>{fmtC(cum)}</td>; })}
              </tr>; })()}
            </tbody>
          </table>
          {/* FOOTER */}
          <div style={{padding:"10px 16px",background:"var(--surface-page)",borderTop:"0.5px solid var(--border-default)",display:"flex",gap:20,flexWrap:"wrap",fontSize:10,color:"var(--text-secondary)"}}>
            <span>IRR: <strong style={{color:"var(--zan-teal-500)"}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(2)+"%":"N/A"}</strong> <span style={{fontSize:9}}>(calcIRR(f.leveredCF))</span></span>
            <span>{ar?"مجموع":"Sum"}: <strong>{fmtC(f.leveredCF.reduce((a,b)=>a+b,0))}</strong></span>
            {fSold && <span>{ar?"تخارج سنة":"Exit Yr"}: <strong>{f.exitYear}</strong> ({ar?"بعدها = صفر":"post-exit = 0"})</span>}
            <span style={{marginInlineStart:"auto",fontSize:9,color:"var(--text-tertiary)"}}>{ar?"كل الأرقام من f.* (financing engine) مباشرة — لا إعادة حساب":"All numbers from f.* (financing engine) directly — no recomputation"}</span>
          </div>
        </div>}
      </div>;
    })()}

    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}
const EditableCell = memo(function EditableCell({ value, onChange, type = "text", options, labelMap, style: sx, placeholder, step }) {
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
    } else {
      onChange(local);
    }
  };

  const handleFocus = () => {
    setFocused(true);
    setLocal(String(value ?? ""));
  };

  if (options) {
    return (
      <select ref={ref} value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...cellInputStyle, ...sx }}>
        {options.map(o => <option key={o} value={o}>{labelMap?.[o] || o}</option>)}
      </select>
    );
  }

  // Show formatted number when not focused
  const displayValue = (!focused && type === "number" && value !== "" && value !== 0 && value != null)
    ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })
    : local;

  return (
    <input
      ref={ref}
      type="text"
      inputMode={type === "number" ? "decimal" : undefined}
      value={focused ? local : displayValue}
      onChange={e => setLocal(e.target.value)}
      onFocus={handleFocus}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { commit(); ref.current?.blur(); } }}
      style={{ ...cellInputStyle, textAlign: type === "number" ? "right" : "left", ...sx }}
      placeholder={placeholder}
    />
  );
});

// Same for sidebar inputs
const SidebarInput = memo(function SidebarInput({ value, onChange, type = "text", placeholder, step, style: sx }) {
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

// ═══════════════════════════════════════════════════════════════
// MOBILE RESPONSIVE HOOK
// ═══════════════════════════════════════════════════════════════
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

function ReDevModelerInner({ user, signOut, onSignIn, publicAcademy, exitAcademy }) {
  const isMobile = useIsMobile();
  // ── Public Academy Mode (no auth required) ──
  const [publicLang, setPublicLang] = useState("ar");
  if (publicAcademy) {
    return <LearningCenterView lang={publicLang} onBack={exitAcademy || (() => {})} onCreateDemo={null} publicMode={true} onLangToggle={() => setPublicLang(l => l === "ar" ? "en" : "ar")} />;
  }
  const [view, setView] = useState("dashboard");
  const [projectIndex, setProjectIndex] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // default closed (mobile-friendly)
  const [activeTab, setActiveTab] = useState("dashboard");
  const [globalExpand, setGlobalExpand] = useState(0); // increment to toggle; odd=expand, even=collapse
  const [kpiPhase, setKpiPhase] = useState("all"); // phase selection for sticky KPI bar
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lang, setLang] = useState("ar");
  useEffect(() => { document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { window.__zanOpenAcademy = () => { setView("academy"); window.scrollTo(0,0); }; return () => { delete window.__zanOpenAcademy; }; }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  const [aiOpen, setAiOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  // ── Toast Notification System ──
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, duration);
  }, []);
  // ── Share Link Detection ──
  const [pendingShare, setPendingShare] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s"), o = params.get("o");
    if (s && o) return { projectId: s, ownerId: o };
    return null;
  });
  // ── Presentation Mode (Sprint 2) ──
  const [presentMode, setPresentMode] = useState(false);
  const [audienceView, setAudienceView] = useState("bank"); // bank | investor
  const [liveSliders, setLiveSliders] = useState({ capex: 100, rent: 100, exitMult: 10 });
  const t = L[lang];
  const ar = lang === "ar";
  const autoSaveTimer = useRef(null);
  const sidebarRef = useRef(null);

  // Show landing page if not logged in
  if (!user && !loading) return <LandingPage onSignIn={onSignIn} lang={lang} setLang={setLang} pendingShare={pendingShare} />;

  useEffect(() => { (async () => {
    const own = await loadProjectIndex();
    const shared = user?.email ? await loadSharedProjects(user.email) : [];
    // Merge: own projects + shared (avoid duplicates)
    const ownIds = new Set(own.map(p => p.id));
    const merged = [...own, ...shared.filter(p => !ownIds.has(p.id))];
    setProjectIndex(merged);
    setLoading(false);
    // ── Handle pending share link ──
    if (pendingShare && user) {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      const { projectId, ownerId } = pendingShare;
      // If it's own project, just open it
      const ownMatch = merged.find(p => p.id === projectId && !p._shared);
      if (ownMatch) { setPendingShare(null); const p = await loadProject(projectId); if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); } return; }
      // Try to open as shared
      try {
        const p = await loadProject(projectId, ownerId, "view");
        if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); }
      } catch (e) { console.error("Share link error:", e); }
      setPendingShare(null);
    }
  })(); }, [user]);

  useEffect(() => {
    if (!project || view !== "editor" || project._permission === "view") return;
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try { await saveProject(project); setProjectIndex(await loadProjectIndex()); setSaveStatus("saved"); }
      catch { setSaveStatus("error"); addToast(ar?"فشل الحفظ التلقائي":"Auto-save failed","error"); }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [project, view]);

  // ── Redirect if active tab becomes hidden (e.g. switching to self mode) ──
  useEffect(() => {
    if (!project || view !== "editor") return;
    const fm = project.finMode || "self";
    const hasDebt = fm === "debt" || fm === "bank100" || fm === "fund";
    const hidden = new Set();
    if (!hasDebt) { hidden.add("financing"); hidden.add("scenarios"); }
    if (hidden.has(activeTab)) setActiveTab("dashboard");
  }, [project?.finMode, activeTab, view]);

  const results = useMemo(() => { try { return project ? computeProjectCashFlows(project) : null; } catch(e) { console.error("computeProjectCashFlows error:", e); return null; } }, [project]);
  const incentivesResult = useMemo(() => { try { return project && results ? computeIncentives(project, results) : null; } catch(e) { console.error("computeIncentives error:", e); return null; } }, [project, results]);
  // Consolidated financing & waterfall (legacy - full field set for UI)
  const _legacyFinancing = useMemo(() => { try { return project && results ? computeFinancing(project, results, incentivesResult) : null; } catch(e) { console.error("computeFinancing error:", e); return null; } }, [project, results, incentivesResult]);
  const _legacyWaterfall = useMemo(() => { try { return project && results && _legacyFinancing ? computeWaterfall(project, results, _legacyFinancing, incentivesResult) : null; } catch(e) { console.error("computeWaterfall error:", e); return null; } }, [project, results, _legacyFinancing, incentivesResult]);
  // Per-phase independent financing & waterfall (new architecture - for phase tabs)
  const independentPhaseResults = useMemo(() => { try { return project && results ? computeIndependentPhaseResults(project, results, incentivesResult) : null; } catch(e) { console.error("independentPhaseResults error:", e); return null; } }, [project, results, incentivesResult]);
  // Consolidated: prefer aggregated sum of per-phase results (ensures Consolidated = ZAN1+ZAN2+ZAN3)
  const financing = useMemo(() => independentPhaseResults?.consolidatedFinancing || _legacyFinancing, [independentPhaseResults, _legacyFinancing]);
  const waterfall = useMemo(() => independentPhaseResults?.consolidatedWaterfall || _legacyWaterfall, [independentPhaseResults, _legacyWaterfall]);
  // Phase waterfalls: prefer independent results for phase tabs
  const phaseWaterfalls = useMemo(() => { try { if (independentPhaseResults?.phaseWaterfalls && Object.keys(independentPhaseResults.phaseWaterfalls).length > 0) return independentPhaseResults.phaseWaterfalls; return computePhaseWaterfalls(project, results, _legacyFinancing, _legacyWaterfall); } catch(e) { console.error("computePhaseWaterfalls error:", e); return null; } }, [project, results, _legacyFinancing, _legacyWaterfall, independentPhaseResults]);
  // Phase financings: from independent results
  const phaseFinancings = useMemo(() => independentPhaseResults?.phaseFinancings || {}, [independentPhaseResults]);
  const checks = useMemo(() => { try { return project && results ? runChecks(project, results, financing, waterfall, incentivesResult) : []; } catch(e) { console.error("runChecks error:", e); return []; } }, [project, results, financing, waterfall, incentivesResult]);

  // ── Debug: expose engine state to browser console for diagnostics ──
  useEffect(() => {
    if (!project) { window.__debugProject = null; return; }
    const phaseW = independentPhaseResults?.phaseWaterfalls || {};
    const phaseF = independentPhaseResults?.phaseFinancings || {};
    window.__debugProject = {
      // Key project fields that affect LP IRR
      exitStrategy: project.exitStrategy,
      exitCapRate: project.exitCapRate,
      exitMultiple: project.exitMultiple,
      catchupMethod: project.catchupMethod,
      finMode: project.finMode,
      prefReturnPct: project.prefReturnPct,
      feeTreatment: project.feeTreatment,
      mgmtFeeBase: project.mgmtFeeBase,
      mgmtFeeCapAnnual: project.mgmtFeeCapAnnual,
      structuringFeeCap: project.structuringFeeCap,
      landRentAnnual: project.landRentAnnual,
      debtTrancheMode: project.debtTrancheMode,
      _feesVersion: project._feesVersion,
      _engineVersion: project._engineVersion,
      // Phase financing overrides
      phaseFinancingOverrides: (project.phases || []).map(p => ({ name: p.name, financing: p.financing })),
      // Results summary
      consolidatedLpIRR: waterfall?.lpIRR,
      legacyLpIRR: _legacyWaterfall?.lpIRR,
      phaseLpIRRs: Object.fromEntries(Object.entries(phaseW).map(([k, w]) => [k, w?.lpIRR])),
      phaseCount: Object.keys(phaseW).length,
      phaseFinancingCount: Object.keys(phaseF).length,
      usesIndependent: !!independentPhaseResults?.consolidatedWaterfall,
      usesLegacy: !independentPhaseResults?.consolidatedWaterfall && !!_legacyWaterfall,
      phaseErrors: independentPhaseResults?.errors || [],
    };
    console.log('%c[ZAN Debug]', 'color:#0ea5e9;font-weight:bold', window.__debugProject);
  }, [project, waterfall, _legacyWaterfall, independentPhaseResults]);

  const createProject = async (templateId) => {
    const p = defaultProject();
    const tmpl = templateId ? PROJECT_TEMPLATES.find(t=>t.id===templateId) : null;
    if (tmpl && tmpl.id !== "blank") {
      p.landType = tmpl.landType;
      p.finMode = tmpl.finMode;
      p.exitStrategy = tmpl.exitStrategy;
      p.phases = tmpl.phases.map(ph=>({...ph}));
      p.assets = tmpl.assets.map(a=>({...a, id:crypto.randomUUID(), hotelPL:null, marinaPL:null}));
    }
    await saveProject(p); setProjectIndex(await loadProjectIndex()); setProject({...p, _setupDone: false}); setView("editor"); setActiveTab("dashboard"); window.scrollTo(0,0);
  };
  const openProject = async (id) => { setLoading(true); const meta = projectIndex.find(p => p.id === id); const p = await loadProject(id, meta?._ownerId, meta?._permission); if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); window.scrollTo(0,0); } setLoading(false); };
  const duplicateProject = async (id) => { const p = await loadProject(id); if (p) { const d={...p,id:crypto.randomUUID(),name:p.name+" (Copy)",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await saveProject(d); setProjectIndex(await loadProjectIndex()); addToast(ar?"تم نسخ المشروع":"Project duplicated","success"); }};
  const deleteProject = async (id) => { await deleteProjectStorage(id); setProjectIndex(await loadProjectIndex()); if (project?.id===id){setProject(null);setView("dashboard");} addToast(ar?"تم حذف المشروع":"Project deleted","info"); };

  // ── Undo History (last 30 states) ──
  const undoStack = useRef([]);
  const pushUndo = useCallback((state) => {
    if (!state) return;
    undoStack.current.push(JSON.stringify(state));
    if (undoStack.current.length > 30) undoStack.current.shift();
  }, []);
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = JSON.parse(undoStack.current.pop());
    setProject(prev);
  }, []);

  // Ctrl+Z handler
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Don't undo if user is typing in an input
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const up = useCallback((u) => {
    const scrollTop = sidebarRef.current?.scrollTop;
    setProject(prev => { pushUndo(prev); return {...prev,...(typeof u === 'function' ? u(prev) : u)}; });
    if (scrollTop != null) {
      requestAnimationFrame(() => {
        if (sidebarRef.current) sidebarRef.current.scrollTop = scrollTop;
      });
    }
  }, [pushUndo]);
  const upAsset = useCallback((i, u) => {
    const scrollTop = sidebarRef.current?.scrollTop;
    setProject(prev => { pushUndo(prev); const a=[...prev.assets]; a[i]={...a[i],...u}; return {...prev,assets:a}; });
    if (scrollTop != null) requestAnimationFrame(() => { if (sidebarRef.current) sidebarRef.current.scrollTop = scrollTop; });
  }, [pushUndo]);
  const addAsset = useCallback((tmplDefaults) => setProject(prev => { pushUndo(prev); const base = {
    id: crypto.randomUUID(), phase: prev.phases[0]?.name||"Phase 1", category:"Retail", name:"", code:"", notes:"",
    plotArea:0, footprint:0, gfa:0, revType:"Lease", efficiency: prev.defaultEfficiency||85,
    leaseRate:0, opEbitda:0, escalation: prev.rentEscalation||0.75, rampUpYears:3, stabilizedOcc:100,
    costPerSqm:0, constrStart:0, constrDuration:12, hotelPL:null, marinaPL:null,
  }; return {...prev, assets:[...prev.assets, tmplDefaults ? {...base,...tmplDefaults} : base]}; }), [pushUndo]);
  const dupAsset = useCallback((i) => setProject(prev => { pushUndo(prev); const src = prev.assets[i]; if(!src) return prev; const copy = {...src, id:crypto.randomUUID(), name:(src.name||"")+" (Copy)"}; return {...prev, assets:[...prev.assets, copy]}; }), [pushUndo]);
  const rmAsset = useCallback((i) => setProject(prev => { pushUndo(prev); return {...prev, assets:prev.assets.filter((_,j)=>j!==i)}; }), [pushUndo]);
  const goBack = () => { setView("dashboard"); setProject(null); window.scrollTo(0,0); };

  if (loading) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--zan-navy-900)",fontFamily:"var(--font-family)"}}><style>{`@keyframes zanShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style><div style={{textAlign:"center",width:360,maxWidth:"90vw"}}><div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:24}}><span style={{fontSize:36,fontWeight:900,color:"var(--text-inverse)",fontFamily:"'Tajawal',sans-serif"}}>Haseef</span><span style={{width:1,height:30,background:"rgba(46,196,182,0.4)"}} /><span style={{fontSize:12,color:"var(--zan-teal-500)",fontWeight:300,lineHeight:1.3,textAlign:"start"}}>النمذجة<br/>المالية</span></div><div style={{display:"flex",flexDirection:"column",gap:12}}>{[200,160,240,180].map((w,i)=><div key={i} style={{height:14,width:w,maxWidth:"100%",borderRadius:"var(--radius-sm)",background:"linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",backgroundSize:"200% 100%",animation:"zanShimmer 1.5s infinite",margin:"0 auto"}} />)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:20}}>{lang==="ar"?"جاري التحميل...":"Loading..."}</div></div></div>;
  if (view === "academy") return <LearningCenterView lang={lang} onBack={() => { setView("dashboard"); window.scrollTo(0,0); }} onCreateDemo={async (demo) => {
    const p = defaultProject();
    const ar = lang === "ar";
    const demoName = ar ? demo.title.ar : demo.title.en;
    p.name = demoName + (ar ? " - نموذج تعليمي" : " - Educational Demo");
    if (demo.overrides) {
      const ov = demo.overrides;
      Object.keys(ov).forEach(k => {
        if (k === "assets") {
          p.assets = ov.assets.map(a => ({ ...a, id: crypto.randomUUID(), hotelPL: null, marinaPL: null }));
        } else if (k === "phases") {
          p.phases = ov.phases.map(ph => ({ ...ph }));
        } else if (k === "incentives") {
          p.incentives = JSON.parse(JSON.stringify(ov.incentives));
        } else if (k !== "name") {
          p[k] = ov[k];
        }
      });
    }
    await saveProject(p); setProjectIndex(await loadProjectIndex()); setProject(p); setView("editor"); setActiveTab("dashboard"); window.scrollTo(0, 0);
  }} />;
  if (view === "dashboard") return <ProjectsDashboard index={projectIndex} onCreate={createProject} onOpen={openProject} onDup={duplicateProject} onDel={deleteProject} lang={lang} setLang={setLang} t={t} user={user} signOut={signOut} onOpenAcademy={() => { setView("academy"); window.scrollTo(0,0); }} />;
  if (!project) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--zan-navy-900)",fontFamily:"var(--font-family)"}}><div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:"#f87171",letterSpacing:2}}>!</div><div style={{fontSize:14,color:"var(--text-secondary)",marginTop:8}}>{lang==="ar"?"لم يتم تحميل المشروع":"Project failed to load"}</div><button onClick={goBack} style={{marginTop:16,padding:"8px 20px",background:"var(--btn-primary-bg)",color:"var(--text-inverse)",border:"none",borderRadius:"var(--radius-sm)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{lang==="ar"?"رجوع":"Go Back"}</button></div></div>;

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} style={{display:"flex",height:"100vh",fontFamily:"var(--font-family)",background:"var(--surface-page)",color:"var(--text-primary)",fontSize:"var(--text-sm)"}}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
        @keyframes zanShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes zanTabFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zanModalIn { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        .zan-shimmer { background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.04) 75%); background-size: 200% 100%; animation: zanShimmer 1.5s infinite; border-radius: 6px; }
        .zan-tab-content { animation: zanTabFade 0.2s ease-out; }
        /* ═══ TYPOGRAPHY SCALE ═══ */
        .zan-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
        .zan-section { font-size: 1.5rem; font-weight: 700; line-height: 1.3; }
        .zan-subsection { font-size: 1.125rem; font-weight: 600; line-height: 1.4; }
        .zan-body { font-size: 0.9375rem; font-weight: 400; line-height: 1.6; }
        .zan-label { font-size: 0.8125rem; font-weight: 500; color: #6b7080; }
        .zan-small { font-size: 0.75rem; color: #9ca3af; }
        .zan-metric { font-size: 1.75rem; font-weight: 700; font-variant-numeric: tabular-nums; }
        /* ═══ CARD SYSTEM ═══ */
        .zan-card { background: #fff; border-radius: 12px; border: 1px solid #e5e7ec; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .zan-card-dark { background: rgba(15,17,23,0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        /* ═══ SPACING HELPERS ═══ */
        .zan-gap-sm { gap: 8px; }
        .zan-gap-md { gap: 12px; }
        .zan-gap-lg { gap: 20px; }
        .zan-section-gap { margin-bottom: 24px; }
        /* ═══ FOCUS RING ═══ */
        input:focus-visible, select:focus-visible, button:focus-visible { outline: 2px solid #2EC4B6; outline-offset: 2px; }
        .hero-kpi { animation: fadeInUp 0.4s ease-out both; }
        .hero-kpi:nth-child(1) { animation-delay: 0s; }
        .hero-kpi:nth-child(2) { animation-delay: 0.08s; }
        .hero-kpi:nth-child(3) { animation-delay: 0.16s; }
        .hero-kpi:nth-child(4) { animation-delay: 0.24s; }
        .asset-card { animation: fadeInUp 0.3s ease-out both; transition: box-shadow 0.15s, border-color 0.15s; }
        .kpi-secondary { animation: fadeIn 0.5s ease-out both; animation-delay: 0.3s; }
        .zan-btn-prim:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .zan-btn-export:hover { filter: brightness(0.97); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        table tbody tr { transition: background 0.1s; }
        [dir="rtl"] { text-align: right; }
        [dir="rtl"] th, [dir="rtl"] td { text-align: start; }
        [dir="rtl"] td[style*="text-align: right"], [dir="rtl"] td[style*="text-align:right"] { text-align: right !important; }
        [dir="rtl"] [style*="position: sticky"], [dir="rtl"] [style*="position:sticky"] { left: auto !important; right: 0 !important; }
        [dir="rtl"] input, [dir="rtl"] select, [dir="rtl"] textarea { text-align: start; }
        [dir="rtl"] label { text-align: start; }
        [dir="rtl"] button { text-align: start; }
        [dir="rtl"] .cm-editor { direction: ltr; }
        /* ═══ MOBILE RESPONSIVE ═══ */
        @media (max-width: 768px) {
          /* Touch targets minimum 44px */
          button, select, input, .touch-target { min-height: 44px; }
          select { font-size: 14px !important; padding: 10px 12px !important; }
          /* Sidebar inputs bigger */
          .sidebar-input { font-size: 14px !important; padding: 10px 12px !important; min-height: 44px !important; }
          /* Tab bar scrollable with momentum */
          .tab-bar { -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; scrollbar-width: none; }
          .tab-bar::-webkit-scrollbar { display: none; }
          .tab-bar button { scroll-snap-align: start; min-height: 44px !important; padding: 10px 14px !important; font-size: 12px !important; }
          /* Tables horizontal scroll */
          .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -10px; padding: 0 10px; }
          .table-wrap table { min-width: 600px; }
          /* Grid layouts stack on mobile */
          .mobile-stack { grid-template-columns: 1fr !important; }
          .mobile-2col { grid-template-columns: 1fr 1fr !important; }
          /* KPI cards */
          .hero-kpi { min-width: 140px !important; }
          /* Modals full width */
          .modal-content { width: 96vw !important; max-width: 96vw !important; padding: 16px !important; }
          /* Hide on mobile */
          .desktop-only { display: none !important; }
          /* Sidebar advisor compact */
          .sidebar-advisor { max-height: 35vh; }
          /* Prevent zoom on input focus (iOS) */
          input[type="text"], input[type="number"], input[type="email"], input[type="password"], select, textarea { font-size: 16px !important; }
        }
        @media (max-width: 480px) {
          .hero-kpi { min-width: 100% !important; }
          .tab-bar button { padding: 10px 10px !important; font-size: 11px !important; }
        }
        /* Smooth sidebar transition */
        .sidebar-slide { transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
        /* ═══ ACCESSIBILITY ═══ */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
        /* ═══ SCROLLBAR POLISH ═══ */
        .table-wrap::-webkit-scrollbar { height: 6px; }
        .table-wrap::-webkit-scrollbar-track { background: #f0f1f5; border-radius: 3px; }
        .table-wrap::-webkit-scrollbar-thumb { background: #c4c8d0; border-radius: 3px; }
        .table-wrap::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        /* ═══ PRINT ═══ */
        @media print { .sidebar-slide, .toast-container, button { display: none !important; } }
      `}</style>
      {/* ── Toast Container ── */}
      {toasts.length > 0 && (
        <div style={{position:"fixed",top:16,right:16,zIndex:99999,display:"flex",flexDirection:"column",gap:8,maxWidth:360,pointerEvents:"none"}}>
          {toasts.map(t=>{
            const bg = {success:"#065f46",error:"#991b1b",warning:"#92400e",info:"var(--zan-navy-700)"}[t.type]||"#065f46";
            const icon = {success:"✓",error:"✕",warning:"⚠",info:"ℹ"}[t.type]||"✓";
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:"var(--radius-lg)",background:bg,color:"var(--text-inverse)",fontSize:13,fontWeight:500,boxShadow:"0 8px 24px rgba(0,0,0,0.3)",animation:t.exiting?"toastOut 0.35s ease forwards":"toastIn 0.3s ease",pointerEvents:"auto",fontFamily:"var(--font-family)"}}>
                <span style={{fontSize:15,fontWeight:700,flexShrink:0,width:22,height:22,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{icon}</span>
                <span style={{flex:1,lineHeight:1.4}}>{t.message}</span>
              </div>
            );
          })}
        </div>
      )}
      {sidebarOpen && !presentMode && (
        <>
        {isMobile && <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:90,backdropFilter:"blur(2px)"}} />}
        <div className="sidebar-slide" style={{width:isMobile?"88vw":320,minWidth:isMobile?"auto":320,maxWidth:isMobile?400:320,background:"var(--surface-nav)",color:"var(--nav-btn-text)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",...(isMobile?{position:"fixed",top:0,bottom:0,[lang==="ar"?"right":"left"]:0,zIndex:91,boxShadow:"4px 0 24px rgba(0,0,0,0.4)"}:{})}}>
          <div style={{padding:isMobile?"12px 14px":"14px 16px",borderBottom:"1px solid var(--nav-tab-border)",display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}><span className="z-nav-logo" style={{fontSize:18,fontWeight:900,letterSpacing:2}}>{lang==="ar"?"حصيف":"Haseef"}</span><span style={{width:1,height:18,background:"var(--zan-teal-500)",opacity:0.6}} /><span style={{fontSize:9,color:"var(--zan-teal-500)",lineHeight:1.3,fontWeight:400}}>{lang==="ar"?"النمذجة":"Financial"}<br/>{lang==="ar"?"المالية":"Modeler"}</span></div>
            <span className={`z-badge ${saveStatus==="saved"?"z-badge-success":saveStatus==="error"?"z-badge-danger":"z-badge-warning"}`}>{t[saveStatus]||saveStatus}</span>
            {isMobile && <button onClick={()=>setSidebarOpen(false)} style={{background:"var(--surface-active)",border:"none",borderRadius:"var(--radius-sm)",color:"var(--text-tertiary)",fontSize:16,padding:"6px 10px",cursor:"pointer",minHeight:36,display:"flex",alignItems:"center"}}>✕</button>}
          </div>
          <div ref={sidebarRef} style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <ControlPanel project={project} up={up} t={t} lang={lang} results={results} globalExpand={globalExpand} />
          </div>
          <SidebarAdvisor project={project} results={results} financing={financing} waterfall={waterfall} incentivesResult={incentivesResult} lang={lang} setActiveTab={setActiveTab} />
        </div>
        </>
      )}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div className="z-nav" style={{height:isMobile?44:48,minHeight:isMobile?44:48,background:"var(--surface-nav)",display:"flex",alignItems:"center",padding:isMobile?"0 8px":"0 var(--space-5)",gap:isMobile?4:8}}>
          {/* Logo + Back */}
          <button onClick={goBack} className="z-nav-btn" style={{padding:isMobile?"4px 8px":"5px 10px",fontSize:isMobile?10:11,flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
            {!isMobile && <><span className="z-nav-logo" style={{fontSize:15,fontWeight:700}}>H<span className="z-nav-logo-accent">aseef</span></span><span style={{width:1,height:16,background:"var(--nav-tab-border)"}} /></>}
            <span>{isMobile?"←":"← " + (ar?"المشاريع":"Projects")}</span>
          </button>
          {(() => {
            // Compute sidebar warning badge
            let _advWarn = 0;
            if (results && financing) {
              const _dv = financing.dscr ? financing.dscr.filter(d=>d!==null) : [];
              const _md = _dv.length > 0 ? Math.min(..._dv) : null;
              if (_md !== null && _md < 1.2) _advWarn++;
              const _npv = results.consolidated?.npv10 || 0;
              if (_npv < 0) _advWarn++;
              if ((project?.maxLtvPct||0) > 80) _advWarn++;
            }
            if ((project?.assets||[]).some(a => benchmarkColor("costPerSqm",a.costPerSqm,a.category).color==="var(--color-danger)")) _advWarn++;
            if (project?.market?.enabled) {
              const _mg=project.market.gaps||{},_mt=project.market.thresholds||{};
              ["Retail","Office","Hospitality","Residential","Marina","Industrial"].forEach(sec=>{
                const gap=_mg[sec]?.gap||0; if(gap<=0) return;
                const aa=(project.assets||[]).filter(a2=>{const c2=(a2.category||"").toLowerCase();return c2.includes(sec.toLowerCase())||(sec==="Retail"&&c2.includes("commercial"))||(sec==="Hospitality"&&(c2.includes("hotel")||c2.includes("resort")));});
                const supply=sec==="Hospitality"?aa.reduce((s,a2)=>s+(a2.hotelPL?.keys||0),0):sec==="Marina"?aa.reduce((s,a2)=>s+(a2.marinaPL?.berths||0),0):aa.reduce((s,a2)=>s+(a2.gfa||0)*((a2.efficiency||0)/100),0);
                if(supply>0&&(supply/gap*100)>(_mt[sec]?.med||70)) _advWarn++;
              });
            }
            return (
              <button onClick={()=>setSidebarOpen(!sidebarOpen)} title={sidebarOpen?(lang==="ar"?"إخفاء اللوحة":"Hide Panel"):(lang==="ar"?"إظهار اللوحة":"Show Panel")} className="z-nav-btn" style={{padding:isMobile?"4px 8px":"6px 10px",fontSize:isMobile?13:14,flexShrink:0,position:"relative",background:sidebarOpen?"var(--nav-btn-hover)":"var(--nav-btn-bg)"}}>
                ☰
                {!sidebarOpen && _advWarn > 0 && <span style={{position:"absolute",top:1,right:1,width:7,height:7,borderRadius:4,background:"var(--color-danger)",border:"1.5px solid var(--surface-nav)"}} />}
              </button>
            );
          })()}
          <div className="z-nav-project" style={{flex:1,minWidth:0,borderLeft:lang==="ar"?"none":"1px solid var(--nav-project-border)",borderRight:lang==="ar"?"1px solid var(--nav-project-border)":"none",paddingLeft:lang==="ar"?0:"var(--space-3)",paddingRight:lang==="ar"?"var(--space-3)":0,marginLeft:lang==="ar"?0:4,marginRight:lang==="ar"?4:0}}>
            <EditableCell value={project?.name||""} onChange={v=>up({name:v})} style={{border:"none",fontSize:isMobile?13:14,fontWeight:500,color:"var(--nav-logo-text)",background:"transparent",width:"100%",padding:"4px 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} placeholder="Project Name" />
          </div>
          {project?._shared && <span className="z-badge z-badge-info" style={{flexShrink:0}}>{project._permission==="view"?(lang==="ar"?"🔒 قراءة":"🔒 View"):(lang==="ar"?"✏️ مشارك":"✏️ Edit")}</span>}
          {!isMobile && <StatusBadge status={project?.status} onChange={s=>up({status:s})} />}
          {/* Undo - desktop only */}
          {!isMobile && <button onClick={undo} disabled={undoStack.current.length===0} title="Ctrl+Z" className="z-nav-btn" style={{padding:"5px 8px",fontSize:14,flexShrink:0,opacity:undoStack.current.length>0?1:0.3}}>↩</button>}
          {/* Theme toggle - desktop only */}
          {!isMobile && <button onClick={()=>{const cur=document.documentElement.getAttribute('data-theme');const next=cur==='dark'?'light':cur==='light'?'auto':'dark';if(next==='auto'){document.documentElement.removeAttribute('data-theme');}else{document.documentElement.setAttribute('data-theme',next);}localStorage.setItem('haseef-theme',next);}} className="z-nav-btn" style={{padding:"5px 8px",fontSize:13,flexShrink:0}} title="Toggle theme">{document.documentElement.getAttribute('data-theme')==='dark'?'☀️':document.documentElement.getAttribute('data-theme')==='light'?'🌙':'🌓'}</button>}
          {/* Present - desktop only */}
          {!isMobile && <button onClick={()=>{setPresentMode(!presentMode);if(!presentMode){setSidebarOpen(false);setActiveTab("dashboard");setLiveSliders({capex:100,rent:100,exitMult:project?.exitMultiple||10});}else{setSidebarOpen(true);}}} className="z-nav-btn" style={{padding:"5px 10px",fontSize:10,fontWeight:600,flexShrink:0,background:presentMode?"var(--color-success)":"var(--nav-btn-bg)",color:presentMode?"#fff":"var(--nav-btn-text)"}}>{presentMode?(lang==="ar"?"✏️ تعديل":"✏️ Edit"):(lang==="ar"?"🎯 عرض":"🎯 Present")}</button>}
          {/* Dropdown menu */}
          {(() => {
            const [menuOpen, setMenuOpen] = [headerMenuOpen, setHeaderMenuOpen];
            return (
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setMenuOpen(!menuOpen)} className="z-nav-btn" style={{padding:isMobile?"4px 6px":"5px 8px",fontSize:isMobile?14:16,fontWeight:500}}>⋮</button>
                {menuOpen && <>
                  <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:998}} />
                  <div style={{position:"absolute",top:"100%",marginTop:4,background:"var(--surface-card)",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-lg)",boxShadow:"var(--shadow-md)",zIndex:999,minWidth:isMobile?120:200,padding:"6px 0",...(lang==="ar"?{left:0}:{right:0})}}>
                    {/* AI */}
                    <button onClick={()=>{setAiOpen(true);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>🤖</span> {lang==="ar"?"مساعد AI":"AI Assistant"}
                    </button>
                    {/* Present mode (mobile only) */}
                    {isMobile && <button onClick={()=>{setPresentMode(!presentMode);if(!presentMode){setSidebarOpen(false);setActiveTab("dashboard");setLiveSliders({capex:100,rent:100,exitMult:project?.exitMultiple||10});}else{setSidebarOpen(true);}setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:presentMode?"var(--color-success-text)":"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>{presentMode?"✏️":"🎯"}</span> {presentMode?(lang==="ar"?"وضع التعديل":"Edit Mode"):(lang==="ar"?"وضع العرض":"Present Mode")}
                    </button>}
                    {/* Undo (mobile only) */}
                    {isMobile && undoStack.current.length>0 && <button onClick={()=>{undo();setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>↩</span> {lang==="ar"?"تراجع":"Undo"}
                    </button>}
                    {/* Status (mobile only - hidden from header) */}
                    {isMobile && <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
                      <span style={{fontSize:12,color:"var(--text-secondary)"}}>{lang==="ar"?"الحالة":"Status"}</span>
                      <StatusBadge status={project?.status} onChange={s=>{up({status:s});setMenuOpen(false);}} />
                    </div>}
                    {/* User email (mobile only) */}
                    {isMobile && user && <div style={{padding:"4px 16px 8px",fontSize:11,color:"var(--text-tertiary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
                    {/* Divider */}
                    <div style={{height:1,background:"var(--surface-separator)",margin:"4px 0"}} />
                    {/* Scenario */}
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
                      <span style={{fontSize:12,color:"var(--text-secondary)"}}>{lang==="ar"?"السيناريو":"Scenario"}</span>
                      <select value={project?.activeScenario||"Base Case"} onChange={e=>{up({activeScenario:e.target.value});}} style={{flex:1,padding:"4px 6px",fontSize:11,borderRadius:4,border:"0.5px solid var(--border-default)",background:project?.activeScenario!=="Base Case"?"#fef3c7":"var(--surface-page)",color:project?.activeScenario!=="Base Case"?"#92400e":"#4b5060",fontFamily:"inherit",cursor:"pointer"}}>
                        {SCENARIOS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* Language */}
                    <button onClick={()=>{setLang(lang==="en"?"ar":"en");setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>{lang==="en"?"🌐":"🌐"}</span> {lang==="en"?"العربية (Arabic)":"English"}
                    </button>
                    {/* Academy */}
                    <button onClick={()=>{setView("academy");setMenuOpen(false);window.scrollTo(0,0);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>📚</span> {lang==="ar"?"أكاديمية حصيف":"Haseef Academy"}
                    </button>
                    {/* Divider */}
                    <div style={{height:1,background:"var(--surface-separator)",margin:"4px 0"}} />
                    {/* Share */}
                    {!project?._shared && <button onClick={()=>{setShareModalOpen(true);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>📤</span> {lang==="ar"?"مشاركة":"Share"} {project?.sharedWith?.length>0&&<span style={{marginLeft:"auto",fontSize:10,background:"var(--color-info-bg)",color:"var(--zan-teal-500)",padding:"1px 6px",borderRadius:"var(--radius-md)"}}>{project.sharedWith.length}</span>}
                    </button>}
                    {/* Sign Out */}
                    {signOut && <button onClick={()=>{signOut();setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--color-danger)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>↪</span> {lang==="ar"?"تسجيل خروج":"Sign Out"}
                    </button>}
                  </div>
                </>}
              </div>
            );
          })()}
        </div>
        <div className="tab-bar z-tab-strip" style={{display:"flex",padding:"0 var(--space-5)",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          {presentMode ? (
            /* Presentation Mode Tab Bar */
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",width:"100%"}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--tab-text-active)",letterSpacing:0.5}}>{ar?"وضع العرض":"Presentation Mode"}</span>
              <div style={{width:1,height:20,background:"var(--nav-tab-border)"}} />
              <button onClick={()=>setAudienceView("bank")} className="z-nav-btn" style={{padding:"6px 16px",fontSize:11,fontWeight:600,borderRadius:20,background:audienceView==="bank"?"var(--zan-teal-500)":"var(--nav-btn-bg)",color:audienceView==="bank"?"#fff":"var(--nav-btn-text)"}}>{ar?"🏦 عرض البنك":"🏦 Bank View"}</button>
              <button onClick={()=>setAudienceView("investor")} className="z-nav-btn" style={{padding:"6px 16px",fontSize:11,fontWeight:600,borderRadius:20,background:audienceView==="investor"?"#7c3aed":"var(--nav-btn-bg)",color:audienceView==="investor"?"#fff":"var(--nav-btn-text)"}}>{ar?"📊 عرض المستثمر":"📊 Investor View"}</button>
            </div>
          ) : (<>
          {(() => {
            const fm = project?.finMode || "self";
            const hasFund = fm === "fund";
            const hasDebt = fm === "debt" || fm === "bank100" || fm === "fund";
            // Smart tab visibility by financing mode
            // Core tabs always visible + conditional tabs based on mode
            const allTabs = [
              {key:"dashboard",label:t.dashboard,show:true},
              {key:"assets",label:t.assetProgram,show:true},
              {key:"cashflow",label:t.cashFlow,show:true},
              {key:"financing",label:lang==="ar"?"التمويل":"Financing",show:hasDebt},
              {key:"results",label:lang==="ar"?"النتائج":"Results",show:true},
              {key:"incentives",label:lang==="ar"?"الحوافز":"Incentives",show:true},
              {key:"scenarios",label:lang==="ar"?"السيناريوهات":"Scenarios",show:hasDebt},
              {key:"market",label:lang==="ar"?"السوق":"Market",show:true},
              {key:"checks",label:lang==="ar"?"الفحوصات":"Checks",show:true},
              {key:"reports",label:lang==="ar"?"التقارير":"Reports",show:true},
            ];
            const tabs = allTabs.filter(tb => tb.show);
            return tabs.map(tb=>{
              const isActive = activeTab===tb.key;
              return <button key={tb.key} onClick={()=>{setActiveTab(tb.key);if(isMobile)setSidebarOpen(false);}} className={`z-tab${isActive?" z-tab-active":""}`} style={{padding:isMobile?"10px 8px":"9px var(--space-4)",fontSize:12}}>{tb.label}</button>;
            });
          })()}
          </>)}
        </div>
        <div style={{flex:1,overflow:"hidden",position:"relative",background:"var(--surface-page)"}}>
          {presentMode ? (
            <div style={{overflow:"auto",height:"100%",padding:isMobile?10:24}}>
            <PresentationView project={project} results={results} financing={financing} waterfall={waterfall} incentivesResult={incentivesResult} lang={lang} audienceView={audienceView} liveSliders={liveSliders} setLiveSliders={setLiveSliders} checks={checks} />
            </div>
          ) : (<>
          {/* ═══ STICKY KPI BAR + Expand/Collapse ═══ */}
          {activeTab !== "dashboard" && results?.consolidated && (() => {
            const ar = lang === "ar";
            const phaseNames = Object.keys(results.phaseResults || {});
            const hasPhases = phaseNames.length > 1;
            const fm = project?.finMode || "self";

            // ── Data sources: phase-aware ──
            const isPhase = kpiPhase !== "all" && !!results.phaseResults?.[kpiPhase];
            const pc = isPhase ? results.phaseResults[kpiPhase] : results.consolidated;
            const f  = isPhase ? phaseFinancings?.[kpiPhase] || financing : financing;
            const w  = isPhase ? phaseWaterfalls?.[kpiPhase] || waterfall : waterfall;

            // ── Derived metrics ──
            const hasDebt   = fm !== "self" && f?.totalDebt > 0;
            const hasFund   = fm === "fund" && w;
            const hasInc    = !isPhase && incentivesResult?.totalIncentiveValue > 0;
            const notHold   = (project?.exitStrategy || "sale") !== "hold";
            const irr       = hasInc && incentivesResult.adjustedIRR != null ? incentivesResult.adjustedIRR : (hasDebt && f?.leveredIRR != null ? f.leveredIRR : pc.irr);
            const dscrArr   = f?.dscr?.filter(v => v != null && v > 0) || [];
            const minDscr   = dscrArr.length ? Math.min(...dscrArr) : null;
            const effLTV    = f?.devCostInclLand > 0 ? (f.totalDebt / f.devCostInclLand) * 100 : 0;
            const exitVal   = f?.exitProceeds || 0;

            // ── Build KPI list ──
            const kpis = [
              { k: "capex",   l: ar ? "التكاليف" : "CAPEX",     v: fmtM(pc.totalCapex || 0), c: "var(--color-danger)" },
              { k: "revenue", l: ar ? "الإيرادات" : "Revenue",   v: fmtM(pc.totalIncome || 0), c: "var(--color-success-text)" },
              { k: "irr",     l: "IRR",                          v: irr != null ? (irr * 100).toFixed(1) + "%" : "—", c: getMetricColor("IRR", irr) },
            ];
            if (fm === "self" && !isPhase)
              kpis.push({ k: "npv", l: "NPV", v: fmtM(calcNPV(pc.netCF, 0.10)), c: getMetricColor("NPV", calcNPV(pc.netCF, 0.10)) });
            if (hasDebt) {
              kpis.push({ k: "dscr", l: "DSCR", v: minDscr != null ? minDscr.toFixed(2) + "x" : "—", c: getMetricColor("DSCR", minDscr) });
              kpis.push({ k: "ltv",  l: "LTV",  v: effLTV > 0 ? effLTV.toFixed(0) + "%" : "—", c: getMetricColor("LTV", effLTV) });
            }
            if (hasFund) {
              kpis.push({ k: "lpirr", l: "LP IRR", v: w.lpIRR != null ? (w.lpIRR * 100).toFixed(1) + "%" : "—", c: getMetricColor("IRR", w.lpIRR) });
              kpis.push({ k: "moic",  l: "MOIC",   v: w.lpMOIC ? w.lpMOIC.toFixed(2) + "x" : "—", c: getMetricColor("MOIC", w.lpMOIC) });
            }
            if (hasDebt && notHold && exitVal > 0)
              kpis.push({ k: "exit", l: ar ? "تخارج" : "Exit", v: fmtM(exitVal), c: "#8b5cf6" });

            // ── Shared tab style ──
            const tabStyle = (active) => ({
              padding: "5px 12px", fontSize: 9, fontWeight: active ? 700 : 500,
              border: "none", borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
              background: "none", color: active ? "var(--zan-teal-500)" : "var(--text-tertiary)",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"
            });

            return <div className="z-status-bar" style={{borderBottom:"0.5px solid var(--border-default)",position:"sticky",top:0,zIndex:"var(--z-sticky)",flexDirection:"column",padding:0}}>
              {hasPhases && (
                <div style={{display:"flex",padding:"0 var(--space-5)",borderBottom:"0.5px solid var(--surface-separator)",overflowX:"auto",gap:0}}>
                  <button onClick={()=>setKpiPhase("all")} className={`z-tab${kpiPhase==="all"?" z-tab-active":""}`} style={{padding:"5px 12px",fontSize:9,background:"var(--surface-card)"}}>{ar?"الإجمالي":"All"}</button>
                  {phaseNames.map(p => <button key={p} onClick={()=>setKpiPhase(p)} className={`z-tab${kpiPhase===p?" z-tab-active":""}`} style={{padding:"5px 12px",fontSize:9,background:"var(--surface-card)"}}>{p}</button>)}
                </div>
              )}
              <div style={{padding:isMobile?"5px 10px":"5px var(--space-5)",display:"flex",alignItems:"center",gap:isMobile?8:16,flexWrap:"wrap"}}>
                {kpis.map(kpi => (
                  <div key={kpi.k} style={{display:"flex",alignItems:"baseline",gap:3,fontSize:"var(--text-xs)"}}>
                    <span style={{color:"var(--text-tertiary)",fontSize:9,fontWeight:500}}>{kpi.l}</span>
                    <span style={{fontWeight:700,color:kpi.c,fontVariantNumeric:"tabular-nums",fontFamily:"var(--font-mono)"}}>{kpi.v}</span>
                  </div>
                ))}
                <div style={{flex:1}} />
                <button onClick={()=>setGlobalExpand(p=>p+1)} className="z-btn z-btn-ghost z-btn-sm" style={{flexShrink:0}}>
                  {globalExpand%2===1?(ar?"▲ طي":"▲ Collapse"):(ar?"▼ توسيع":"▼ Expand")}
                </button>
              </div>
            </div>;
          })()}
          {[
            ["dashboard", <ProjectDash key="dashboard" project={project} results={results} checks={checks} t={t} financing={financing} phaseFinancings={phaseFinancings} lang={lang} incentivesResult={incentivesResult} onGoToAssets={()=>{setActiveTab("assets");addAsset();}} setActiveTab={setActiveTab} />],
            ["assets", <AssetTable key="assets" project={project} upAsset={upAsset} addAsset={addAsset} dupAsset={dupAsset} rmAsset={rmAsset} results={results} t={t} lang={lang} updateProject={up} globalExpand={globalExpand} />],
            ["financing", <FinancingView key="financing" project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} incentivesResult={incentivesResult} t={t} up={up} lang={lang} globalExpand={globalExpand} />],
            ["results", <ResultsView key="results" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />],
            ["reports", <ReportsView key="reports" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} checks={checks} lang={lang} />],
            ["scenarios", <ScenariosView key="scenarios" project={project} results={results} financing={financing} waterfall={waterfall} lang={lang} />],
            ["market", <MarketView key="market" project={project} results={results} lang={lang} up={up} />],
            ["incentives", <IncentivesView key="incentives" project={project} results={results} incentivesResult={incentivesResult} financing={financing} lang={lang} up={up} />],
            ["cashflow", <CashFlowView key="cashflow" project={project} results={results} t={t} incentivesResult={incentivesResult} />],
            ["checks", <ChecksView key="checks" checks={checks} t={t} lang={lang} onFix={(tab)=>{setActiveTab(tab);window.scrollTo(0,0);}} />],
          ].map(([tabKey, tabContent]) => (
            <div key={tabKey} style={{display:activeTab===tabKey?"block":"none",overflow:"auto",height:"100%",padding:isMobile?10:18}} className={activeTab===tabKey?"zan-tab-content":undefined}>
              {tabContent}
            </div>
          ))}
          </>)}
        </div>
      </div>
      {project && project._setupDone === false && (
        <ProjectSetupWizard project={project} lang={lang}
          onUpdate={(u) => setProject(prev => ({...prev,...u}))}
          onDone={() => setProject(prev => { const p = {...prev}; delete p._setupDone; return p; })}
        />
      )}
      <AiAssistant open={aiOpen} onClose={()=>setAiOpen(false)} project={project} onApply={up} lang={lang} projectIndex={projectIndex} loadProjectFn={loadProject} results={results} financing={financing} waterfall={waterfall} />
      {shareModalOpen && project && !project._shared && <ShareModal project={project} up={up} lang={lang} user={user} onClose={()=>setShareModalOpen(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS DASHBOARD
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// QUICK SETUP WIZARD
// ═══════════════════════════════════════════════════════════════
function ProjectSetupWizard({ project, onUpdate, onDone, lang }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [eduModal, setEduModal] = useState(null);
  const t = lang === "ar";

  const Option = ({icon, label, desc, selected, onClick}) => (
    <div onClick={onClick} style={{
      background:selected?"#eff6ff":"#fff", border:selected?"2px solid #2563eb":"2px solid #e5e7ec",
      borderRadius:"var(--radius-xl)", padding:"16px 18px", cursor:"pointer", transition:"all 0.15s",
      display:"flex", alignItems:"center", gap:14, minHeight:60,
    }} onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="#c7d2fe";}} onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="var(--border-default)";}}>
      <span style={{fontSize:28}}>{icon}</span>
      <div><div style={{fontSize:14,fontWeight:600,color:selected?"var(--zan-teal-500)":"var(--text-primary)"}}>{label}</div>
      {desc&&<div style={{fontSize:11,color:"var(--text-secondary)",marginTop:2}}>{desc}</div>}</div>
      {selected&&<span style={{marginInlineStart:"auto",fontSize:18,color:"var(--zan-teal-500)"}}>✓</span>}
    </div>
  );

  const steps = [
    // Step 0: Project name + location
    { title: t?"اسم المشروع والموقع":"Project Name & Location", content: (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,fontWeight:500}}>{t?"اسم المشروع":"Project Name"}</div>
        <input value={project.name||""} onChange={e=>onUpdate({name:e.target.value})} placeholder={t?"مثال: مشروع الواجهة البحرية":(lang==="ar"?"مثال: واجهة حصيف البحرية":"e.g. Haseef Waterfront")} style={{width:"100%",padding:"12px 16px",border:"2px solid #e5e7ec",borderRadius:"var(--radius-lg)",fontSize:15,fontWeight:600,fontFamily:"inherit",outline:"none"}} autoFocus /></div>
        <div><div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,fontWeight:500}}>{t?"الموقع":"Location"}</div>
        <input value={project.location||""} onChange={e=>onUpdate({location:e.target.value})} placeholder={t?"مثال: جازان، السعودية":"e.g. Jazan, Saudi Arabia"} style={{width:"100%",padding:"10px 14px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-md)",fontSize:13,fontFamily:"inherit",outline:"none"}} /></div>
      </div>
    )},
    // Step 1: Land type
    { title: t?"نوع الأرض":"Land Type", subtitle: t?"كيف ستحصل على الأرض؟":"How will you acquire the land?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="📋" label={t?"إيجار أرض (حق انتفاع)":"Land Lease (Leasehold)"} desc={t?"إيجار سنوي من الحكومة/المالك":"Annual rent from government/owner"} selected={project.landType==="lease"} onClick={()=>onUpdate({landType:"lease"})} />
        <Option icon="🏠" label={t?"شراء أرض (تملك)":"Land Purchase (Freehold)"} desc={t?"شراء الأرض كاملة قبل البناء":"Buy land outright before construction"} selected={project.landType==="purchase"} onClick={()=>onUpdate({landType:"purchase"})} />
        <Option icon="🤝" label={t?"أرض كشريك (حصة عينية)":"Land as Partner (In-kind Equity)"} desc={t?"المالك يساهم بالأرض كحصة":"Landowner contributes as equity"} selected={project.landType==="partner"} onClick={()=>onUpdate({landType:"partner"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="landType" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
    // Step 2: Financing mode
    { title: t?"طريقة التمويل":"Financing Mode", subtitle: t?"كيف سيتم تمويل المشروع؟":"How will the project be funded?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="💰" label={t?"تمويل ذاتي (رأس مال كامل)":"Self-Funded (100% Equity)"} desc={t?"المطور يموّل كل شي من جيبه":"Developer funds everything"} selected={project.finMode==="self"} onClick={()=>onUpdate({finMode:"self"})} />
        <Option icon="🏦" label={t?"تمويل بنكي 100% (ملك المطور)":"100% Bank Debt (Developer-Owned)"} desc={t?"البنك يموّل كامل التكلفة، المطور هو المالك":"Bank finances 100%, developer owns"} selected={project.finMode==="bank100"} onClick={()=>onUpdate({finMode:"bank100",debtAllowed:true,maxLtvPct:100})} />
        <Option icon="🏗" label={t?"دين بنكي + رأس مال المطور":"Bank Debt + Developer Equity"} desc={t?"جزء من البنك وجزء من المطور":"Part bank loan, part developer equity"} selected={project.finMode==="debt"} onClick={()=>onUpdate({finMode:"debt",debtAllowed:true})} />
        <Option icon="📊" label={t?"صندوق استثماري (GP/LP)":"Fund Structure (GP/LP)"} desc={t?"مطور + مستثمرين مع شلال توزيعات":"Developer + investors with waterfall"} selected={project.finMode==="fund"} onClick={()=>onUpdate({finMode:"fund",debtAllowed:true})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="financingMode" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
    // Step 3: Exit strategy
    { title: t?"استراتيجية التخارج":"Exit Strategy", subtitle: t?"ماذا تخطط بعد الانتهاء؟":"What's your plan after completion?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="🏷" label={t?"بيع الأصل":"Sell the Asset"} desc={t?"بيع المشروع كاملاً بعد الاستقرار":"Sell entire project after stabilization"} selected={project.exitStrategy==="sale"||project.exitStrategy==="caprate"} onClick={()=>onUpdate({exitStrategy:"sale"})} />
        <Option icon="💎" label={t?"احتفاظ بالدخل (بدون بيع)":"Hold for Income (No Sale)"} desc={t?"الاستمرار بتحصيل الإيرادات":"Continue collecting income indefinitely"} selected={project.exitStrategy==="hold"} onClick={()=>onUpdate({exitStrategy:"hold"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="exitStrategy" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
  ];

  // Exit strategy is relevant for ALL modes (self can sell or hold too)
  const activeSteps = steps;
  const current = activeSteps[step];
  const isLast = step === activeSteps.length - 1;
  const canNext = step === 0 ? (project.name && project.name !== "New Project") : true;

  return (<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-family)"}}>
      <div style={{background:"var(--surface-card)",borderRadius:isMobile?14:20,width:520,maxWidth:"94vw",padding:0,boxShadow:"0 24px 80px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        {/* Progress */}
        <div style={{padding:isMobile?"14px 16px 0":"20px 28px 0",display:"flex",gap:6}}>
          {activeSteps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"var(--zan-teal-500)":"var(--border-default)",transition:"background 0.3s"}} />)}
        </div>
        {/* Header */}
        <div style={{padding:isMobile?"14px 16px 6px":"20px 28px 8px"}}>
          <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:6}}>
            {t?"الخطوة":"Step"} {step+1} {t?"من":"of"} {activeSteps.length}
          </div>
          <div style={{fontSize:isMobile?17:20,fontWeight:700,color:"var(--text-primary)"}}>{current.title}</div>
          {current.subtitle&&<div style={{fontSize:12,color:"var(--text-secondary)",marginTop:4}}>{current.subtitle}</div>}
        </div>
        {/* Content */}
        <div style={{padding:isMobile?"10px 16px 18px":"12px 28px 24px",minHeight:isMobile?160:200}}>{current.content}</div>
        {/* Footer */}
        <div style={{padding:isMobile?"12px 16px":"16px 28px",borderTop:"1px solid #f0f1f5",display:"flex",gap:10,justifyContent:"space-between",background:"var(--surface-page)"}}>
          <button onClick={()=>step>0?setStep(step-1):onDone()} style={{padding:"10px 20px",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",background:"var(--surface-card)",color:"var(--text-secondary)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
            {step>0?(t?"السابق":"Back"):(t?"تخطي":"Skip")}
          </button>
          <button onClick={()=>isLast?onDone():setStep(step+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:"var(--radius-md)",border:"none",background:canNext?"var(--zan-teal-500)":"var(--border-default)",color:canNext?"#fff":"var(--text-tertiary)",fontSize:13,fontWeight:600,cursor:canNext?"pointer":"default",fontFamily:"inherit"}}>
            {isLast?(t?"ابدأ العمل":"Start Working"):(t?"التالي":"Next →")}
          </button>
        </div>
      </div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES GRID (shared between landing page and dashboard)
// ═══════════════════════════════════════════════════════════════
function FeaturesGrid({ lang }) {
  const ar = lang === "ar";
  const features = [
    { icon: "🏗", color: "var(--zan-teal-500)", title: ar?"نمذجة متعددة الأصول":"Multi-Asset Modeling", desc: ar?"فنادق، محلات، مكاتب، مارينا، سكني - كل أنواع العقارات في نموذج واحد مع P&L مفصّل للفنادق والمارينا":"Hotels, retail, offices, marina, residential - all property types in one model with detailed Hotel & Marina P&L" },
    { icon: "🏦", color: "#8b5cf6", title: ar?"تمويل متقدم":"Advanced Financing", desc: ar?"تمويل بنكي، صندوق استثماري GP/LP، تمويل إسلامي (مرابحة/إجارة)، رسملة حق الانتفاع، هيكل رأس المال":"Bank debt, GP/LP fund structure, Islamic finance (Murabaha/Ijara), leasehold capitalization, capital structure" },
    { icon: "📊", color: "var(--color-success-text)", title: ar?"شلال توزيعات 4 مراحل":"4-Tier Waterfall", desc: ar?"رد رأس المال → العائد التفضيلي → تعويض المطور → تقسيم الأرباح مع IRR وMOIC لكل طرف":"Return of Capital → Preferred Return → GP Catch-up → Profit Split with IRR & MOIC per party" },
    { icon: "📈", color: "var(--color-warning)", title: ar?"سيناريوهات وتحليل حساسية":"Scenarios & Sensitivity", desc: ar?"8 سيناريوهات جاهزة، جدول حساسية ثنائي المتغيرات، تحليل نقطة التعادل مع ملخص المخاطر":"8 built-in scenarios, 2-variable sensitivity table, break-even analysis with risk summary" },
    { icon: "📄", color: "var(--color-danger)", title: ar?"تقارير جاهزة للبنك والمستثمر":"Bank & Investor Reports", desc: ar?"ملخص تنفيذي، حزمة البنك (مع DSCR)، مذكرة المستثمر - كلها بصيغة PDF وExcel":"Executive summary, Bank pack (with DSCR), Investor memo - all exportable as PDF & Excel" },
    { icon: "🌐", color: "#06b6d4", title: ar?"ثنائي اللغة + حوافز حكومية":"Bilingual + Gov Incentives", desc: ar?"واجهة عربي/إنجليزي كاملة مع دعم منح CAPEX، إعفاء إيجار الأرض، دعم التمويل، واسترداد الرسوم":"Full Arabic/English interface with CAPEX grants, land rent rebates, finance subsidies, and fee waivers" },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:16}}>
      {features.map((f, i) => (
        <div key={i} style={{background:"#f8f7f5",borderRadius:"var(--radius-xl)",border:"0.5px solid var(--border-default)",padding:"20px 18px",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+"60";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.transform="translateY(0)";}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:"var(--radius-lg)",background:f.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{f.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{f.title}</div>
          </div>
          <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.6}}>{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE (before sign-in: split screen - features + auth)
// ═══════════════════════════════════════════════════════════════
function LandingPage({ onSignIn, lang, setLang, pendingShare }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError(ar?"أدخل البريد وكلمة المرور":"Enter email and password"); return; }
    setLoading(true); setError(null);
    try {
      if (onSignIn) await onSignIn(email, password, mode);
    } catch (e) { setError(e.message || (ar?"فشل تسجيل الدخول. تحقق من الاتصال وحاول مجدداً":"Login failed. Check connection and retry")); }
    setLoading(false);
  };

  const WATERFRONT_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663027980795/PfUcTsRAscFnLMXv.png";

  return (
    <div dir={ar?"rtl":"ltr"} style={{minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row",fontFamily:"var(--font-family)",background:"var(--zan-navy-900)",position:"relative"}}>
      {/* ── Left: Hero with Waterfront Image ── */}
      {!isMobile && (
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        {/* Background Image */}
        <img src={WATERFRONT_IMG} alt="Haseef Waterfront" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        {/* Overlay */}
        <div style={{position:"absolute",inset:0,background:ar?"linear-gradient(to left, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)":"linear-gradient(to right, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)"}} />
        {/* Dot pattern overlay */}
        <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"radial-gradient(circle at 2px 2px, white 1px, transparent 0)",backgroundSize:"40px 40px"}} />
        {/* Content */}
        <div style={{position:"relative",zIndex:1,padding:"48px 48px"}}>
          <div style={{maxWidth:560}}>
            {/* Badge */}
            <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(46,196,182,0.12)",border:"1px solid rgba(46,196,182,0.25)",borderRadius:20,marginBottom:20}}>
              <span style={{fontSize:12,color:"var(--zan-teal-500)",fontWeight:500}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</span>
            </div>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:48,fontWeight:900,color:"var(--text-inverse)",letterSpacing:3}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1,height:32,background:"rgba(46,196,182,0.4)"}} />
              <span style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.4,fontWeight:300}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            {/* Title */}
            <h1 style={{fontSize:36,fontWeight:900,color:"var(--text-inverse)",lineHeight:1.15,marginBottom:10,fontFamily:"'Tajawal',sans-serif"}}>
              {ar?"منصة النمذجة المالية":"Financial Modeling"}<br/>
              <span style={{color:"#C8A96E"}}>{ar?"للتطوير العقاري":"for Real Estate"}</span>
            </h1>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:28,maxWidth:440}}>
              {ar?"صُممت للسوق السعودي. نمذجة مالية متقدمة لمشاريع التطوير العقاري بجميع أنواعها.":"Built for the Saudi market. Advanced financial modeling for all types of real estate development projects."}
            </p>
            {/* Feature badges */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {icon:"📐",text:ar?"5 محركات نمذجة":"5 Engine Modules"},
                {icon:"📊",text:ar?"50+ سنة افتراضات":"50+ Year Projections"},
                {icon:"🤖",text:ar?"مساعد AI مدمج":"Built-in AI"},
              ].map((f,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(255,255,255,0.06)",backdropFilter:"blur(8px)",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)"}}>
                  <span style={{fontSize:12}}>{f.icon}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:500}}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
      {/* ── Right: Auth Form ── */}
      <div style={{width:isMobile?"100%":420,minWidth:isMobile?"auto":380,flex:isMobile?1:"none",background:isMobile?"var(--zan-navy-900)":"#161a24",display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"32px 24px":"48px 36px",borderInlineStart:isMobile?"none":(ar?"none":"1px solid rgba(46,196,182,0.1)"),borderInlineEnd:isMobile?"none":(ar?"1px solid rgba(46,196,182,0.1)":"none")}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:32,fontWeight:900,color:"var(--text-inverse)",letterSpacing:2}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1.5,height:22,background:"rgba(46,196,182,0.5)",borderRadius:1}} />
            <span style={{fontSize:11,color:"var(--zan-teal-500)",lineHeight:1.3,fontWeight:300,textAlign:"start"}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          {isMobile && <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>}
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{mode==="signin"?(ar?"تسجيل الدخول":"Sign In"):(ar?"إنشاء حساب":"Create Account")}</div>
        </div>
        {/* Pending share invite banner */}
        {pendingShare && (
          <div style={{background:"rgba(46,196,182,0.08)",border:"1px solid rgba(46,196,182,0.2)",borderRadius:"var(--radius-lg)",padding:"14px 16px",marginBottom:18,textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:6}}>📬</div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--zan-teal-500)",marginBottom:4}}>{ar?"تمت دعوتك لمشروع مشترك":"You've been invited to a shared project"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{ar?"سجّل دخول أو أنشئ حساب جديد عشان تشوف المشروع":"Sign in or create an account to access the project"}</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"البريد الإلكتروني":"Email"}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={{width:"100%",padding:"12px 14px",borderRadius:"var(--radius-md)",border:"1px solid #1e2230",background:"rgba(11,35,65,0.6)",color:"var(--text-secondary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"كلمة المرور":"Password"}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"12px 14px",borderRadius:"var(--radius-md)",border:"1px solid #1e2230",background:"rgba(11,35,65,0.6)",color:"var(--text-secondary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          {error && <div style={{fontSize:11,color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",padding:"8px 12px",borderRadius:"var(--radius-sm)"}}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:"var(--radius-md)",border:"none",background:"#2EC4B6",color:"var(--text-inverse)",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"'Tajawal',sans-serif",transition:"all 0.2s",letterSpacing:0.3}} onMouseEnter={e=>e.currentTarget.style.background="var(--zan-teal-700)"} onMouseLeave={e=>e.currentTarget.style.background="#2EC4B6"}>
            {loading?"...":(mode==="signin"?(ar?"دخول":"Sign In"):(ar?"إنشاء حساب":"Create Account"))}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.4)"}}>
            {mode==="signin"?(
              <span>{ar?"ما عندك حساب؟":"Don't have an account?"} <button onClick={()=>setMode("signup")} style={{color:"var(--zan-teal-500)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"سجّل الآن":"Sign up"}</button></span>
            ):(
              <span>{ar?"عندك حساب؟":"Already have an account?"} <button onClick={()=>setMode("signin")} style={{color:"var(--zan-teal-500)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"دخول":"Sign in"}</button></span>
            )}
          </div>
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"var(--surface-active)",color:"rgba(255,255,255,0.5)",padding:"6px 16px",fontSize:11,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
        </div>
        {/* Powered by */}
        <div style={{marginTop:24,textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>
      </div>
    </div>
  );
}

function ProjectsDashboard({ index, onCreate, onOpen, onDup, onDel, lang, setLang, t, user, signOut, onOpenAcademy }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const filtered = index.filter(p => !search || (p.name||"").toLowerCase().includes(search.toLowerCase()) || (p.location||"").toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const totalAssets = index.reduce((s,p) => s + (p.assetCount||0), 0);
  const finModes = index.reduce((m,p) => { const k = p.finMode||"self"; m[k] = (m[k]||0)+1; return m; }, {});
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg, #f5f3f0 0%, #ede9e4 100%)",backgroundImage:"radial-gradient(circle at 20% 30%, rgba(46,196,182,0.04) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(200,169,110,0.03) 0%, transparent 40%)",fontFamily:"var(--font-family)",color:"var(--text-primary)"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 14px":"48px 24px"}}>
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-start",gap:isMobile?14:0,marginBottom:isMobile?20:32}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:32,fontWeight:900,color:"var(--text-primary)",fontFamily:"'Tajawal',sans-serif",letterSpacing:2}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1.5,height:24,background:"#2EC4B6",borderRadius:1}} />
              <span style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.3,fontWeight:500}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            <div style={{fontSize:isMobile?22:28,fontWeight:900,color:"var(--text-primary)",letterSpacing:-0.5,fontFamily:"'Tajawal',sans-serif"}}>{ar?"النمذجة المالية":"Financial Modeler"}</div>
            <div style={{fontSize:isMobile?11:13,color:"var(--text-secondary)",marginTop:6}}>{t.subtitle}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setShowFeatures(true)} style={{...btnS,background:"#2EC4B6",color:"var(--text-inverse)",padding:"8px 16px",fontSize:12,fontWeight:600,border:"none",borderRadius:"var(--radius-sm)"}} title={ar?"اعرف المزايا":"Explore Features"}>✦ {ar?"المزايا":"Features"}</button>
            {onOpenAcademy && <button onClick={onOpenAcademy} style={{...btnS,background:"#0B2341",color:"#C8A96E",padding:"8px 16px",fontSize:12,fontWeight:600,border:"1px solid rgba(200,169,110,0.3)",borderRadius:"var(--radius-sm)"}} title={ar?"أكاديمية حصيف":"Haseef Academy"}>📚 {ar?"الأكاديمية":"Academy"}</button>}
            {!isMobile && user && <div style={{fontSize:11,color:"var(--text-secondary)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
            {signOut && <button onClick={signOut} style={{...btnSm,background:"var(--color-danger-bg)",color:"var(--color-danger)",padding:"8px 16px",fontSize:12,fontWeight:500}}>{ar?"خروج":"Sign Out"}</button>}
            <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#e8e5e0",color:"var(--text-secondary)",padding:"8px 16px",fontSize:12,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
          </div>
        </div>

        {/* Features Modal Overlay */}
        {showFeatures && (
          <><div onClick={()=>setShowFeatures(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9998}} />
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:800,maxWidth:"94vw",maxHeight:"85vh",background:"var(--surface-card)",borderRadius:"var(--radius-2xl)",border:"0.5px solid var(--border-default)",boxShadow:"0 24px 80px rgba(0,0,0,0.5)",zIndex:9999,overflow:"auto",padding:"28px 32px"}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
              <div style={{flex:1,fontSize:18,fontWeight:700,color:"var(--text-primary)"}}>{ar?"مزايا المنصة":"Platform Features"}</div>
              <button onClick={()=>setShowFeatures(false)} style={{...btnS,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"6px 12px",fontSize:14,lineHeight:1}}>✕</button>
            </div>
            <FeaturesGrid lang={lang} />
          </div></>
        )}

        {/* KPI Strip (only when projects exist) */}
        {index.length > 0 && !isMobile && (
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {[
              {label:ar?"المشاريع":"Projects",value:index.length,icon:"📁",color:"var(--zan-teal-500)"},
              {label:ar?"الأصول":"Assets",value:totalAssets,icon:"🏗",color:"var(--zan-teal-700)"},
              ...(finModes.fund?[{label:ar?"صناديق":"Funds",value:finModes.fund,icon:"🏦",color:"#8b5cf6"}]:[]),
              ...(finModes.debt?[{label:ar?"تمويل بنكي":"Bank",value:finModes.debt+(finModes.bank100||0),icon:"💳",color:"var(--color-warning)"}]:[]),
            ].map((kpi,i)=>(
              <div key={i} style={{flex:1,background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 16px",boxShadow:"var(--shadow-sm)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{kpi.icon}</span>
                  <div>
                    <div style={{fontSize:20,fontWeight:800,color:kpi.color}}>{kpi.value}</div>
                    <div style={{fontSize:10,color:"var(--text-secondary)"}}>{kpi.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <button className="zan-btn-prim" onClick={()=>onCreate()} style={{...btnPrim,padding:"10px 24px",fontSize:13}}>{t.newProject}</button>
          {index.length > 2 && (
            <div style={{flex:1,minWidth:160,maxWidth:320,position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?"🔍 بحث بالاسم أو الموقع...":"🔍 Search by name or location..."} style={{width:"100%",padding:"9px 14px",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s"}} onFocus={e=>e.target.style.borderColor="#2EC4B6"} onBlur={e=>e.target.style.borderColor="#e5e0d8"} />
              {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text-tertiary)",fontSize:14,cursor:"pointer",padding:0}}>✕</button>}
            </div>
          )}
          <div style={{flex:1}} />
          <div style={{fontSize:12,color:"var(--text-secondary)",alignSelf:"center"}}>{sorted.length}{sorted.length!==index.length?` / ${index.length}`:""} {t.projects}</div>
        </div>
        {sorted.length===0 && search ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:36,marginBottom:12,opacity:0.5}}>🔍</div>
            <div style={{fontSize:16,fontWeight:600,color:"var(--text-primary)",marginBottom:6}}>{ar?"لا توجد نتائج":"No results"}</div>
            <div style={{fontSize:12,color:"var(--text-secondary)"}}>{ar?`لم يتم العثور على مشاريع تطابق "${search}"`:`No projects matching "${search}"`}</div>
            <button onClick={()=>setSearch("")} style={{...btnS,marginTop:16,padding:"8px 20px",fontSize:12,background:"var(--surface-sidebar)",color:"var(--text-secondary)",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)"}}>{ar?"مسح البحث":"Clear search"}</button>
          </div>
        ) : sorted.length===0 ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🏗</div>
            <div style={{fontSize:20,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>{lang==="ar"?"ابدأ مشروعك الأول":"Start Your First Project"}</div>
            <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>{lang==="ar"?"أنشئ مشروع جديد أو ابدأ من أحد القوالب الجاهزة":"Create a new project or start from a ready-made template"}</div>
            <div style={{fontSize:11,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:1,marginBottom:16,fontWeight:600}}>{lang==="ar"?"اختر قالب":"Choose a Template"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(180px, 1fr))",gap:12,maxWidth:700,margin:"0 auto"}}>
              {PROJECT_TEMPLATES.map((tmpl)=>(
                <div key={tmpl.id} onClick={()=>onCreate(tmpl.id)} style={{background:"var(--surface-card)",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-lg)",padding:"18px 14px",cursor:"pointer",transition:"all 0.15s",textAlign:"center",boxShadow:"var(--shadow-sm)"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.boxShadow="0 4px 12px rgba(46,196,182,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}}>
                  <div style={{fontSize:28,marginBottom:8}}>{tmpl.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",marginBottom:4}}>{ar?tmpl.ar:tmpl.en}</div>
                  <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?tmpl.desc_ar:tmpl.desc_en}</div>
                </div>
              ))}
            </div>
            {/* Academy Banner for New Users */}
            {onOpenAcademy && (
              <div onClick={onOpenAcademy} style={{marginTop:32,maxWidth:700,margin:"32px auto 0",background:"linear-gradient(135deg, #0B2341 0%, #163050 100%)",borderRadius:"var(--radius-xl)",padding:"24px 28px",cursor:"pointer",transition:"all 0.2s",border:"1px solid rgba(46,196,182,0.15)"}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 24px rgba(11,35,65,0.3)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:32}}>📚</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:"#C8A96E",fontFamily:"'Tajawal',sans-serif",marginBottom:4}}>{ar?"أكاديمية حصيف المالية":"Haseef Academy"}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.6}}>{ar?"جديد على النمذجة المالية؟ ابدأ بالتعلم أولاً - محتوى عملي + نماذج تفاعلية جاهزة":"New to financial modeling? Start learning first - practical content + ready interactive demos"}</div>
                  </div>
                  <span style={{fontSize:14,color:"var(--zan-teal-500)",fontWeight:600,flexShrink:0}}>{ar?"ادخل ←":"Enter →"}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(p=>(
              <div key={p.id} style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",padding:isMobile?"12px 14px":"16px 20px",display:"flex",alignItems:"center",gap:isMobile?10:14,border:"0.5px solid var(--border-default)",cursor:"pointer",transition:"all 0.15s",boxShadow:"var(--shadow-sm)"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.boxShadow="0 4px 12px rgba(46,196,182,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}} onClick={()=>onOpen(p.id)}>
                <div style={{width:isMobile?32:38,height:isMobile?32:38,borderRadius:"var(--radius-sm)",background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"var(--surface-sidebar)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?13:15,flexShrink:0}}>
                  {p._shared?"👤":p.status==="Complete"?"✓":p.status==="In Progress"?"▶":"◇"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:isMobile?13:14,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}{p._shared?<span style={{fontSize:10,color:"var(--zan-teal-500)",marginInlineStart:8,fontWeight:500}}>{lang==="ar"?"(مشارك)":"(Shared)"}</span>:null}</div>
                  <div style={{fontSize:isMobile?10:11,color:"var(--text-secondary)",marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span>{new Date(p.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",...(!isMobile?{year:"numeric",hour:"2-digit",minute:"2-digit"}:{})})}</span>
                    {!isMobile && p.assetCount > 0 && <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>{p.assetCount} {ar?"أصل":"assets"}</span>}
                    {!isMobile && p.finMode && p.finMode !== "self" && <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:p.finMode==="fund"?"#f3e8ff":"#dbeafe",color:p.finMode==="fund"?"#7c3aed":"var(--zan-teal-500)"}}>{p.finMode==="fund"?(ar?"صندوق":"Fund"):p.finMode==="bank100"?(ar?"بنك 100%":"Bank 100%"):(ar?"بنكي":"Bank")}</span>}
                  </div>
                </div>
                <span style={{fontSize:isMobile?9:10,padding:"3px 8px",borderRadius:4,fontWeight:500,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"var(--surface-sidebar)",color:p._shared?(p._permission==="view"?"#fbbf24":"#60a5fa"):p.status==="Complete"?"#4ade80":p.status==="In Progress"?"#60a5fa":"var(--text-tertiary)",flexShrink:0}}>{p._shared?(p._permission==="view"?(lang==="ar"?"قراءة":"View"):(lang==="ar"?"تعديل":"Edit")):p.status||"Draft"}</span>
                {!isMobile && !p._shared && <button onClick={e=>{e.stopPropagation();onDup(p.id);}} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"4px 10px"}} title="Duplicate">{lang==="ar"?"نسخ":"Copy"}</button>}
                {!p._shared && <button onClick={e=>{e.stopPropagation();const url=`${window.location.origin}?s=${p.id}&o=${user?.id||""}`;navigator.clipboard?.writeText(url).then(()=>{e.currentTarget.textContent="✓";setTimeout(()=>{e.currentTarget.textContent="🔗";},1500);});}} style={{...btnSm,background:"var(--color-info-bg)",color:"#60a5fa",padding:"4px 10px",fontSize:13}} title={lang==="ar"?"نسخ رابط المشاركة":"Copy share link"}>🔗</button>}
                {!p._shared && (confirmDel===p.id ? (
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{onDel(p.id);setConfirmDel(null);}} style={{...btnSm,background:"var(--color-danger-bg)",color:"var(--color-danger)"}}>Yes</button>
                    <button onClick={()=>setConfirmDel(null)} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>No</button>
                  </div>
                ) : (
                  <button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}} title="Delete">✕</button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARE MODAL — Manage shared users, copy link, generate invite
// ═══════════════════════════════════════════════════════════════
function ShareModal({ project, up, lang, user, onClose }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [perm, setPerm] = useState("view");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const shared = (project?.sharedWith || []).map(e => typeof e === "string" ? { email: e, permission: "edit" } : e);
  
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}?s=${project?.id || ""}&o=${user?.id || ""}` 
    : "";

  const addUser = () => {
    setError("");
    const em = email.toLowerCase().trim();
    if (!em || !em.includes("@")) { setError(ar ? "أدخل بريد صحيح" : "Enter a valid email"); return; }
    if (em === user?.email?.toLowerCase()) { setError(ar ? "لا يمكن مشاركة مع نفسك" : "Cannot share with yourself"); return; }
    if (shared.some(e => e.email.toLowerCase() === em)) { setError(ar ? "مشارك مسبقاً" : "Already shared"); return; }
    up({ sharedWith: [...shared, { email: em, permission: perm, addedAt: new Date().toISOString() }] });
    setEmail("");
  };

  const removeUser = (em) => {
    up({ sharedWith: shared.filter(e => e.email.toLowerCase() !== em.toLowerCase()) });
  };

  const changePerm = (em, newPerm) => {
    up({ sharedWith: shared.map(e => e.email.toLowerCase() === em.toLowerCase() ? { ...e, permission: newPerm } : e) });
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => { setCopied("link"); setTimeout(() => setCopied(""), 2000); });
  };

  const copyInvite = () => {
    const projName = project?.name || "—";
    const assets = (project?.assets || []).length;
    const phases = [...new Set((project?.assets || []).map(a => a.phase))].length;
    const text = ar
      ? `مرحباً،\nأود مشاركة نموذج مالي معك على منصة حصيف للنمذجة المالية.\n\n📋 المشروع: ${projName}\n📊 عدد الأصول: ${assets} | المراحل: ${phases}\n\n🔗 رابط الوصول:\n${shareUrl}\n\nإذا ما عندك حساب، سجّل من نفس الرابط وبيظهر لك المشروع تلقائي.`
      : `Hi,\nI'd like to share a financial model with you on Haseef Financial Modeler.\n\n📋 Project: ${projName}\n📊 Assets: ${assets} | Phases: ${phases}\n\n🔗 Access link:\n${shareUrl}\n\nIf you don't have an account, register from the same link and the project will appear automatically.`;
    navigator.clipboard?.writeText(text).then(() => { setCopied("invite"); setTimeout(() => setCopied(""), 2000); });
  };

  const sty = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, backdropFilter: "blur(2px)" },
    modal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? "94vw" : 480, maxWidth: "94vw", maxHeight: "85vh", background: "#fff", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { padding: "18px 22px 14px", borderBottom: "1px solid #e5e7ec", display: "flex", alignItems: "center", gap: 10 },
    body: { flex: 1, overflow: "auto", padding: "16px 22px" },
    input: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 44 },
    btn: { padding: "10px 18px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", minHeight: 44, display: "flex", alignItems: "center", gap: 6 },
  };

  return (<>
    <div onClick={onClose} style={sty.overlay} />
    <div style={sty.modal}>
      {/* Header */}
      <div style={sty.header}>
        <span style={{ fontSize: 18 }}>📤</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{ar ? "مشاركة المشروع" : "Share Project"}</span>
        <button onClick={onClose} style={{ ...sty.btn, background: "var(--surface-sidebar)", color: "var(--text-secondary)", padding: "6px 12px", fontSize: 16 }}>✕</button>
      </div>

      <div style={sty.body}>
        {/* ── Copy Link Section ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "رابط المشروع" : "Project Link"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flex: 1, padding: "10px 12px", background: "var(--surface-page)", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", minHeight: 44, display: "flex", alignItems: "center" }}>{shareUrl}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyLink} style={{ ...sty.btn, background: copied === "link" ? "var(--color-success-text)" : "var(--zan-teal-500)", color: "#fff", whiteSpace: "nowrap" }}>
                {copied === "link" ? "✓" : "🔗"} {copied === "link" ? (ar ? "تم النسخ" : "Copied!") : (ar ? "نسخ الرابط" : "Copy Link")}
              </button>
              <button onClick={copyInvite} style={{ ...sty.btn, background: copied === "invite" ? "var(--color-success-text)" : "#f0f4ff", color: copied === "invite" ? "#fff" : "var(--zan-teal-500)", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                {copied === "invite" ? "✓" : "💬"} {copied === "invite" ? (ar ? "تم" : "Done") : (ar ? "نص دعوة" : "Invite Text")}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6 }}>{ar ? "أي شخص عنده الرابط ومسجل بالمنصة يقدر يفتح المشروع. غير المسجلين يطلب منهم التسجيل أول." : "Anyone with this link who is registered can access the project. Unregistered users will be prompted to sign up."}</div>
        </div>

        {/* ── Add User ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "إضافة مشارك" : "Add Person"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Email address"} 
              style={sty.input} onKeyDown={e => e.key === "Enter" && addUser()} />
            <select value={perm} onChange={e => setPerm(e.target.value)} 
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer", minHeight: 44 }}>
              <option value="view">{ar ? "قراءة فقط" : "View only"}</option>
              <option value="edit">{ar ? "تعديل" : "Can edit"}</option>
            </select>
            <button onClick={addUser} style={{ ...sty.btn, background: "var(--zan-teal-500)", color: "#fff" }}>
              {ar ? "أضف" : "Add"}
            </button>
          </div>
          {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 6 }}>{error}</div>}
        </div>

        {/* ── Shared Users List ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {ar ? "المشاركون" : "Shared With"} {shared.length > 0 && <span style={{ fontSize: 10, background: "#dbeafe", color: "var(--zan-teal-500)", padding: "1px 6px", borderRadius: 8, marginInlineStart: 6 }}>{shared.length}</span>}
          </div>
          {shared.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
              {ar ? "لم تتم المشاركة مع أحد بعد" : "Not shared with anyone yet"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {shared.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface-page)", borderRadius: 8, border: "1px solid #e5e7ec" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--zan-teal-500)", fontWeight: 600, flexShrink: 0 }}>
                    {(s.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    {s.addedAt && <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{new Date(s.addedAt).toLocaleDateString()}</div>}
                  </div>
                  <select value={s.permission || "edit"} onChange={e => changePerm(s.email, e.target.value)} 
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7ec", fontSize: 11, fontFamily: "inherit", background: s.permission === "edit" ? "#dbeafe" : "#fef3c7", color: s.permission === "edit" ? "#1d4ed8" : "#92400e", cursor: "pointer", fontWeight: 600, minHeight: 36 }}>
                    <option value="view">{ar ? "قراءة" : "View"}</option>
                    <option value="edit">{ar ? "تعديل" : "Edit"}</option>
                  </select>
                  <button onClick={() => removeUser(s.email)} style={{ ...btnSm, background: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "6px 10px", minHeight: 36 }} title={ar ? "إزالة" : "Remove"}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </>);
}

function StatusBadge({status,onChange}) {
  const [open,setOpen]=useState(false);
  const sts=["Draft","In Progress","Complete"];
  const col={Draft:{bg:"var(--surface-sidebar)",fg:"var(--text-secondary)"},"In Progress":{bg:"#dbeafe",fg:"var(--zan-teal-500)"},Complete:{bg:"#dcfce7",fg:"var(--color-success-text)"}};
  const c=col[status]||col.Draft;
  return (<div style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{...btnS,background:c.bg,color:c.fg,padding:"4px 12px",fontSize:11,fontWeight:600}}>{status||"Draft"} ▾</button>
    {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"var(--surface-card)",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:100,overflow:"hidden"}}>
      {sts.map(s=><button key={s} onClick={()=>{onChange(s);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 16px",border:"none",background:status===s?"var(--surface-sidebar)":"#fff",fontSize:12,cursor:"pointer",textAlign:"start",color:"var(--text-primary)"}}>{s}</button>)}
    </div>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// CONTROL PANEL
// ═══════════════════════════════════════════════════════════════
// ── Sidebar helper components (defined OUTSIDE ControlPanel to prevent re-creation) ──
function Sec({title,children,def=false,filled,summary,globalExpand}) {
  const [open,setOpen]=useState(def);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  return (<div style={{borderBottom:"0.5px solid var(--nav-tab-border)"}}>
    <button onClick={e=>{e.preventDefault();setOpen(!open);}} style={{width:"100%",padding:"11px 16px",background:"none",border:"none",color:open?"#d0d4dc":"#8b90a0",fontSize:10,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",textAlign:"start",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"color 0.15s"}}>
      {filled!==undefined&&<span style={{width:7,height:7,borderRadius:4,background:filled?"var(--color-success-text)":"#3b4050",flexShrink:0}} />}
      <span style={{flex:1}}>{title}</span>
      {!open&&summary&&<span style={{fontSize:9,color:"var(--text-secondary)",fontWeight:400,letterSpacing:0,textTransform:"none",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{summary}</span>}
      <span style={{color:"#3b4050",fontSize:12,transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>▾</span>
    </button>
    {open&&<div style={{padding:"0 16px 14px"}}>{children}</div>}
  </div>);
}

function Fld({label,children,hint,tip,error}) {
  const [showTip, setShowTip] = useState(false);
  return (<div style={{marginBottom:9,position:"relative"}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:error?"var(--color-danger)":"#7b8094",marginBottom:3}}>
      {label}
      {tip && <span onMouseEnter={()=>setShowTip(true)} onMouseLeave={()=>setShowTip(false)} style={{cursor:"help",fontSize:10,color:"var(--text-secondary)",lineHeight:1}}>ⓘ</span>}
    </label>
    {showTip && tip && <div style={{position:"absolute",top:-4,insetInlineStart:0,insetInlineEnd:0,transform:"translateY(-100%)",background:"var(--text-primary)",color:"var(--text-secondary)",padding:"8px 10px",borderRadius:"var(--radius-sm)",fontSize:10,lineHeight:1.4,zIndex:99,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",maxWidth:260}}>{tip.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?3:0}}>{line}</div>)}</div>}
    <div style={error?{borderRadius:"var(--radius-sm)",boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>
    {error&&<div style={{fontSize:9,color:"var(--color-danger)",marginTop:2,fontWeight:500}}>{error}</div>}
    {!error&&hint&&<div style={{fontSize:10,color:"var(--text-secondary)",marginTop:2}}>{hint}</div>}
  </div>);
}

function Sel({value,onChange,options,lang}) {
  return (<select value={value} onChange={e=>{e.stopPropagation();onChange(e.target.value);}} style={sideInputStyle}>
    {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[lang||"en"]||o.en||o.label}</option>)}
  </select>);
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR ADVISOR PANEL (with Phase Tabs)
// ═══════════════════════════════════════════════════════════════
function SidebarAdvisor({ project, results, financing, waterfall, incentivesResult, lang, setActiveTab }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [advPhase, setAdvPhase] = useState("all"); // "all" or phase name
  const ar = lang === "ar";
  if (!project || !results || !(project.assets||[]).length) return null;
  const c = results.consolidated;
  if (!c) return null;

  const f = financing;
  const w = waterfall;
  const ir = incentivesResult;
  const h = results.horizon;
  const phaseResults = results.phaseResults || {};
  const phaseNames = Object.keys(phaseResults);
  const isPhase = advPhase !== "all";
  const pd = isPhase ? phaseResults[advPhase] : null;
  const phaseAssets = isPhase ? (project.assets||[]).filter(a => a.phase === advPhase) : (project.assets||[]);
  const phaseSchedules = isPhase ? results.assetSchedules.filter(a => a.phase === advPhase) : results.assetSchedules;

  // ── Metrics (consolidated or phase) ──
  const totalCapex = isPhase ? (pd?.totalCapex||0) : c.totalCapex;
  const totalIncome = isPhase ? (pd?.totalIncome||0) : c.totalIncome;
  const totalLandRent = isPhase ? (pd?.totalLandRent||0) : c.totalLandRent;
  const netCF = isPhase ? (pd?.netCF||[]) : c.netCF;
  const phaseIRR = isPhase ? (pd?.irr||null) : null;
  const irrVal = isPhase ? phaseIRR : (f && f.leveredIRR !== null ? f.leveredIRR : (ir && ir.adjustedIRR !== null && ir.totalIncentiveValue > 0) ? ir.adjustedIRR : c.irr);
  const npvVal = isPhase ? calcNPV(netCF, 0.10) : ((ir && ir.totalIncentiveValue > 0) ? ir.adjustedNPV10 : (c.npv10 || 0));
  const dscrVals = !isPhase && f && f.dscr ? f.dscr.filter(d => d !== null) : [];
  const minDscr = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const payback = netCF ? netCF.reduce((acc, v, i) => { acc.cum += v; if (acc.cum < -1) acc.neg = true; if (acc.yr === null && acc.neg && acc.cum > 0) acc.yr = i + 1; return acc; }, { cum: 0, yr: null, neg: false }).yr : null;
  const yoc = totalCapex > 0 ? (totalIncome / Math.max(1, h)) / totalCapex : 0;
  const incomeCapexRatio = totalCapex > 0 ? totalIncome / totalCapex : 0;

  // ── Health ──
  const irrOk = irrVal === null ? 0 : irrVal > 0.15 ? 2 : irrVal > 0.12 ? 1 : 0;
  const dscrOk = minDscr === null ? -1 : minDscr > 1.4 ? 2 : minDscr > 1.25 ? 1 : 0;
  const npvOk = npvVal > 0 ? 2 : 0;
  const score = irrOk + (dscrOk >= 0 ? dscrOk : 0) + npvOk;
  const maxScore = 4 + (dscrOk >= 0 ? 2 : 0);
  const healthPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const health = healthPct >= 70 ? "strong" : healthPct >= 40 ? "moderate" : "weak";
  const hCfg = {
    strong: { color: "#4ade80", bg: "#dcfce7", border: "#16a34a40", label: ar ? "قوي" : "Strong", icon: "✓" },
    moderate: { color: "#fbbf24", bg: "#2a2a0a", border: "#eab30840", label: ar ? "متوسط" : "Moderate", icon: "⚠" },
    weak: { color: "#f87171", bg: "#2a0a0a", border: "#ef444440", label: ar ? "ضعيف" : "Weak", icon: "✗" },
  }[health];

  // ── Warnings ──
  const warnings = [];
  // Consolidated-only warnings
  if (!isPhase) {
    if (minDscr !== null && minDscr < 1.2)
      warnings.push({ icon: "🏦", text: ar ? `DSCR أقل من 1.2x (${minDscr.toFixed(2)}x) — البنك قد يرفض` : `DSCR < 1.2x (${minDscr.toFixed(2)}x) — bank may reject`, tab: "financing", sev: "error" });
    else if (minDscr !== null && minDscr < 1.4)
      warnings.push({ icon: "🏦", text: ar ? `DSCR بين 1.2-1.4x — مقبول لكن ضعيف` : `DSCR 1.2-1.4x — acceptable but tight`, tab: "financing", sev: "warn" });
    if (f && (project.maxLtvPct || 0) > 80)
      warnings.push({ icon: "📊", text: ar ? `LTV عالي ${project.maxLtvPct}%` : `High LTV ${project.maxLtvPct}%`, tab: "financing", sev: "warn" });
    if (irrVal !== null && f && f.rate && irrVal < f.rate)
      warnings.push({ icon: "⚠", text: ar ? `IRR < تكلفة الدين` : `IRR < debt cost`, tab: "dashboard", sev: "error" });
    if (project.debtAllowed && (project.loanTenor || 7) <= (project.debtGrace || 3))
      warnings.push({ icon: "⏰", text: ar ? "مدة القرض ≤ فترة السماح" : "Tenor ≤ grace period", tab: "financing", sev: "error" });
    if (f && project.exitStrategy !== "hold") {
      const exitYr = f.exitYear ? f.exitYear - (project.startYear || 2026) : 0;
      const maxRamp = results?.assetSchedules ? Math.max(0, ...results.assetSchedules.map(a => a.capexSchedule.reduce((l,v,i)=>v>0?i+1:l,0) + (a.rampUpYears||3))) : 0;
      if (exitYr > 0 && exitYr < maxRamp) warnings.push({ icon: "🚪", text: ar ? "التخارج قبل استقرار الإشغال" : "Exit before stabilization", tab: "results", sev: "warn" });
    }
  }
  if (npvVal < 0) warnings.push({ icon: "📉", text: ar ? `NPV سالب (${fmtM(npvVal)})` : `Negative NPV (${fmtM(npvVal)})`, tab: "dashboard", sev: "error" });

  // Asset-level warnings (filtered by phase)
  phaseAssets.forEach((a, i) => {
    const bcCost = benchmarkColor("costPerSqm", a.costPerSqm, a.category);
    const bcRate = benchmarkColor("leaseRate", a.leaseRate, a.category);
    if (bcCost.color === "var(--color-danger)")
      warnings.push({ icon: "🔴", text: ar ? `"${a.name||i+1}": تكلفة/م² (${fmt(a.costPerSqm)}) خارج النطاق` : `"${a.name||i+1}": cost/sqm (${fmt(a.costPerSqm)}) outlier`, tab: "assets", sev: "warn" });
    if (bcRate.color === "var(--color-danger)" && a.revType === "Lease")
      warnings.push({ icon: "🔴", text: ar ? `"${a.name||i+1}": إيجار/م² خارج النطاق` : `"${a.name||i+1}": rate/sqm outlier`, tab: "assets", sev: "warn" });
    if (a.revType === "Lease" && (a.efficiency || 0) === 0 && (a.gfa || 0) > 0 && !["Infrastructure", "Utilities", "Open Space"].includes(a.category))
      warnings.push({ icon: "⚠", text: ar ? `"${a.name||i+1}": كفاءة 0%` : `"${a.name||i+1}": 0% efficiency`, tab: "assets", sev: "error" });
    // Asset with zero revenue but high CAPEX
    const aComp = phaseSchedules.find(s => s.id === a.id || s.name === a.name);
    if (aComp && aComp.totalCapex > 0 && aComp.totalRevenue === 0 && !["Infrastructure", "Utilities", "Open Space", "Amenity"].includes(a.category))
      warnings.push({ icon: "💸", text: ar ? `"${a.name||i+1}": CAPEX ${fmtM(aComp.totalCapex)} بدون إيراد` : `"${a.name||i+1}": ${fmtM(aComp.totalCapex)} CAPEX, zero revenue`, tab: "assets", sev: "warn" });
  });

  // Phase-specific insights
  if (isPhase && pd) {
    const capexShare = c.totalCapex > 0 ? (pd.totalCapex / c.totalCapex * 100).toFixed(0) : 0;
    const incShare = c.totalIncome > 0 ? (pd.totalIncome / c.totalIncome * 100).toFixed(0) : 0;
    if (Number(capexShare) > 50) warnings.push({ icon: "📊", text: ar ? `هذه المرحلة = ${capexShare}% من CAPEX الكلي` : `This phase = ${capexShare}% of total CAPEX`, tab: "assets", sev: "info" });
    if (Number(incShare) < 20 && Number(capexShare) > 30) warnings.push({ icon: "⚠", text: ar ? `CAPEX عالي (${capexShare}%) مقابل إيراد منخفض (${incShare}%)` : `High CAPEX (${capexShare}%) vs low income (${incShare}%)`, tab: "assets", sev: "warn" });
  }

  const errorCount = warnings.filter(w2 => w2.sev === "error").length;
  const warnCount = warnings.filter(w2 => w2.sev === "warn").length;
  const Dot = ({ ok }) => <div style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: ok >= 2 ? "#4ade80" : ok === 1 ? "#fbbf24" : "#f87171" }} />;

  // ── Info items ──
  const info = [];
  info.push({ icon: "📐", text: ar ? `${phaseAssets.length} أصل` : `${phaseAssets.length} assets` });
  info.push({ icon: "🏗", text: `CAPEX: ${fmtM(totalCapex)}` });
  info.push({ icon: "💰", text: `${ar ? "إيرادات" : "Income"}: ${fmtM(totalIncome)}` });
  if (incomeCapexRatio > 0) info.push({ icon: "💎", text: `${ar ? "إيرادات/تكاليف" : "Income/CAPEX"}: ${incomeCapexRatio.toFixed(1)}x` });
  if (yoc > 0) info.push({ icon: "📈", text: `YoC: ${(yoc * 100).toFixed(1)}% ${ar ? "سنوياً" : "annual"}` });
  if (payback) info.push({ icon: "⏱", text: ar ? `استرداد: سنة ${payback}` : `Payback: year ${payback}` });
  if (!isPhase && f && f.mode !== "self") {
    const ltv = f.totalProjectCost > 0 ? (f.totalDebt / f.totalProjectCost * 100).toFixed(0) : 0;
    info.push({ icon: "🏦", text: `${ar ? "دين" : "Debt"}: ${fmtM(f.totalDebt)} (LTV ${ltv}%)` });
  }
  if (!isPhase && w) {
    info.push({ icon: "👤", text: `LP: ${w.lpMOIC?.toFixed(2) || "—"}x · ${w.lpIRR !== null ? (w.lpIRR * 100).toFixed(1) + "%" : "—"}` });
    info.push({ icon: "🏢", text: `GP: ${w.gpMOIC?.toFixed(2) || "—"}x · ${w.gpIRR !== null ? (w.gpIRR * 100).toFixed(1) + "%" : "—"}` });
  }
  // Phase weight
  if (isPhase && c.totalCapex > 0) {
    info.push({ icon: "⚖", text: `${ar ? "وزن المرحلة" : "Phase weight"}: ${(totalCapex / c.totalCapex * 100).toFixed(0)}% CAPEX · ${c.totalIncome > 0 ? (totalIncome / c.totalIncome * 100).toFixed(0) : 0}% ${ar ? "إيراد" : "income"}` });
  }

  // ── Market Indicators (if enabled) ──
  const mkt = project.market;
  if (mkt && mkt.enabled && !isPhase) {
    const mktGaps = mkt.gaps || {};
    const mktTh = mkt.thresholds || {};
    const MSECTORS = ["Retail","Office","Hospitality","Residential","Marina","Industrial"];
    const getMktSupply = (sector) => {
      const assets2 = (project.assets||[]).filter(a2 => {
        const cat2 = (a2.category||"").toLowerCase(); const sec2 = sector.toLowerCase();
        return cat2.includes(sec2) || (sec2==="retail" && cat2.includes("commercial")) || (sec2==="hospitality" && (cat2.includes("hotel")||cat2.includes("resort")));
      });
      if (sector==="Hospitality") return assets2.reduce((s2,a2)=>s2+(a2.hotelPL?.keys||0),0);
      if (sector==="Marina") return assets2.reduce((s2,a2)=>s2+(a2.marinaPL?.berths||0),0);
      return assets2.reduce((s2,a2)=>s2+(a2.gfa||0)*((a2.efficiency||0)/100),0);
    };
    let mktHigh = 0, mktMed = 0;
    MSECTORS.forEach(sec => {
      const gap = mktGaps[sec]?.gap || 0;
      if (gap <= 0) return;
      const supply = getMktSupply(sec);
      if (supply <= 0) return;
      const pct = supply / gap;
      const th3 = mktTh[sec] || { low: 50, med: 70 };
      const pct100 = pct * 100;
      if (pct100 > th3.med) {
        mktHigh++;
        warnings.push({ icon: "📊", text: ar ? `${catL(sec,true)}: ${pct100.toFixed(0)}% من فجوة السوق — فرط توريد` : `${sec}: ${pct100.toFixed(0)}% of gap — oversupply risk`, tab: "market", sev: "error" });
      } else if (pct100 > th3.low) {
        mktMed++;
      }
    });
    if (mktHigh === 0 && mktMed === 0) info.push({ icon: "📊", text: ar ? "السوق: جميع القطاعات ضمن النطاق" : "Market: all sectors within safe range" });
    else if (mktHigh === 0) info.push({ icon: "📊", text: ar ? `السوق: ${mktMed} قطاع متوسط المخاطر` : `Market: ${mktMed} sector(s) medium risk` });
  }

  return (
    <div style={{ borderTop: "1px solid #1e2230", background: "#0a0c10" }}>
      {/* ── Header ── */}
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: hCfg.bg, border: `1px solid ${hCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: hCfg.color, flexShrink: 0 }}>{hCfg.icon}</div>
        <div style={{ flex: 1, textAlign: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: hCfg.color }}>{ar ? "المستشار" : "Advisor"}: {hCfg.label}</div>
          <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 1 }}>
            {errorCount > 0 && <span style={{ color: "#f87171" }}>{errorCount} {ar ? "خطأ" : "error"}{errorCount > 1 && !ar ? "s" : ""}</span>}
            {errorCount > 0 && warnCount > 0 && " · "}
            {warnCount > 0 && <span style={{ color: "#fbbf24" }}>{warnCount} {ar ? "تنبيه" : "warn"}{warnCount > 1 && !ar ? "s" : ""}</span>}
            {errorCount === 0 && warnCount === 0 && <span style={{ color: "#4ade80" }}>{ar ? "لا مشاكل" : "No issues"}</span>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#4b5060", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: "0 12px 14px", maxHeight: 420, overflowY: "auto" }}>
          {/* ── Phase Tabs ── */}
          {phaseNames.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={() => setAdvPhase("all")} style={{ ...btnS, padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 10, background: advPhase === "all" ? "#2EC4B620" : "#1e2230", color: advPhase === "all" ? "#2EC4B6" : "var(--text-secondary)", border: advPhase === "all" ? "1px solid #2EC4B640" : "1px solid #282d3a" }}>
                {ar ? "الكل" : "All"}
              </button>
              {phaseNames.map(pn => {
                const pWarns = (project.assets || []).filter(a => a.phase === pn).some(a => benchmarkColor("costPerSqm", a.costPerSqm, a.category).color === "var(--color-danger)");
                return (
                  <button key={pn} onClick={() => setAdvPhase(pn)} style={{ ...btnS, padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 10, background: advPhase === pn ? "#2563eb20" : "#1e2230", color: advPhase === pn ? "#60a5fa" : "var(--text-secondary)", border: advPhase === pn ? "1px solid #2563eb40" : "1px solid #282d3a" }}>
                    {pn} {pWarns && <span style={{ color: "#f87171" }}>!</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── KPI Strip ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[
              { label: "IRR", value: irrVal !== null ? (irrVal * 100).toFixed(1) + "%" : "—", ok: irrOk },
              { label: isPhase ? "NPV" : (minDscr !== null ? "DSCR" : "NPV"), value: isPhase ? (npvVal >= 1e6 ? fmtM(npvVal) : "—") : (minDscr !== null ? minDscr.toFixed(2) + "x" : (npvVal >= 1e6 ? fmtM(npvVal) : npvVal > 0 ? "+" : "—")), ok: isPhase ? npvOk : (minDscr !== null ? dscrOk : npvOk) },
              { label: ar ? "الاسترداد" : "Payback", value: payback ? payback + (ar ? " سنة" : "yr") : "—", ok: payback && payback <= 7 ? 2 : payback && payback <= 12 ? 1 : 0 },
            ].map((m, i) => (
              <div key={i} style={{ background: "#0F2D4F", borderRadius: 6, padding: "8px 10px", border: "1px solid #1e2230" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <Dot ok={m.ok} />
                  <span style={{ fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.3 }}>{m.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.ok >= 2 ? "#4ade80" : m.ok === 1 ? "#fbbf24" : "#f87171" }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ── Warnings ── */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>
                {ar ? "تنبيهات" : "Warnings"} ({warnings.length})
              </div>
              {warnings.map((w2, i) => (
                <button key={i} onClick={() => setActiveTab(w2.tab)} style={{ width: "100%", background: w2.sev === "error" ? "#1a0a0a" : w2.sev === "warn" ? "#1a1a0a" : "#dbeafe", border: `1px solid ${w2.sev === "error" ? "#ef444430" : w2.sev === "warn" ? "#eab30830" : "#2563eb30"}`, borderRadius: 6, padding: "6px 10px", marginBottom: 4, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 6, fontFamily: "inherit", textAlign: "start", transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  <span style={{ fontSize: 11, flexShrink: 0, lineHeight: 1.4 }}>{w2.icon}</span>
                  <span style={{ fontSize: 10, color: w2.sev === "error" ? "#fca5a5" : w2.sev === "warn" ? "#fde68a" : "#93c5fd", lineHeight: 1.4 }}>{w2.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Quick Summary ── */}
          <div>
            <div style={{ fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>{ar ? "ملخص" : "Summary"}</div>
            {info.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 10, color: "#8b90a0" }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* ── Phase Asset Breakdown (when phase selected) ── */}
          {isPhase && phaseSchedules.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>{ar ? "أصول المرحلة" : "Phase Assets"}</div>
              {phaseSchedules.map((a, i) => {
                const aYoc = a.totalCapex > 0 ? ((a.totalRevenue / Math.max(1, h)) / a.totalCapex * 100).toFixed(1) : "0.0";
                const viable = Number(aYoc) > 8 ? "#4ade80" : Number(aYoc) > 4 ? "#fbbf24" : a.totalRevenue > 0 ? "#f87171" : "#4b5060";
                return (
                  <div key={i} style={{ background: "#0F2D4F", borderRadius: 6, padding: "6px 10px", marginBottom: 4, border: "1px solid #1e2230" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#d0d4dc" }}>{a.name || "—"}</span>
                        <span style={{ fontSize: 9, color: "var(--text-secondary)", marginInlineStart: 6 }}>{catL(a.category, ar)}</span>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: viable }}>{aYoc}%</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 9, color: "var(--text-secondary)", marginTop: 3 }}>
                      <span>CAPEX: {fmtM(a.totalCapex)}</span>
                      <span style={{ color: "#4ade80" }}>{ar ? "إيراد" : "Rev"}: {fmtM(a.totalRevenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ControlPanel({ project, up, t, lang, results, globalExpand }) {
  if (!project) return null;
  const [eduModal, setEduModal] = useState(null);

  const cur = project.currency || "SAR";
  const ar = lang==="ar";

  return (<>
    {/* ── 1. GENERAL ── */}
    <Sec title={t.general} def={false} globalExpand={globalExpand} filled={!!(project.location && project.startYear)} summary={project.location ? `${project.startYear} | ${project.horizon}yr` : ""}>
      <Fld label={t.location} tip="موقع المشروع. للعرض والتقارير فقط
Project location. For display and reports only"><SidebarInput value={project.location} onChange={v=>up({location:v})} placeholder="e.g. Jazan, Saudi Arabia" /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.startYear} tip="سنة بداية المشروع. تُحدد توقيت CAPEX والإيرادات
Project start year. Sets the timing for CAPEX and revenue"><SidebarInput type="number" value={project.startYear} onChange={v=>up({startYear:v})} /></Fld>
        <Fld label={t.horizon} tip="أفق النموذج بالسنوات (5-99). يحدد مدى حساب التدفقات النقدية
Model horizon in years (5-99). Determines cash flow projection length" error={project.horizon<1?(lang==="ar"?"المدة يجب أن تكون 1 على الأقل":"Horizon must be at least 1"):project.horizon>99?(lang==="ar"?"الحد الأقصى 99 سنة":"Max 99 years"):null}><SidebarInput type="number" value={project.horizon} onChange={v=>up({horizon:v})} /></Fld>
      </div>
      <Fld label={t.currency} tip="عملة النموذج. الافتراضي ريال سعودي
Model currency. Default is SAR"><Sel lang={lang} value={project.currency} onChange={v=>up({currency:v})} options={CURRENCIES} /></Fld>
    </Sec>

    {/* ── 4. ASSUMPTIONS (CAPEX + Revenue merged) ── */}
    <Sec title={ar?"افتراضات التكاليف والإيرادات":"Cost & Revenue Assumptions"} globalExpand={globalExpand} filled={project.softCostPct > 0 || project.rentEscalation > 0} summary={`${project.softCostPct}% soft | ${project.rentEscalation}% esc`}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.softCost} tip="تشمل التصميم، الدراسات، الإشراف، التصاريح وإدارة المشروع. عادة 8-15%\nDesign, studies, supervision, permits, project management. Usually 8-15%: تصميم، إشراف، تصاريح. عادة 8-15%\nIndirect costs: design, supervision, permits. Standard 8-15%" error={project.softCostPct<0?(lang==="ar"?"لا يمكن أن تكون سالبة":"Cannot be negative"):project.softCostPct>50?(lang==="ar"?"قيمة عالية جداً (>50%)":"Very high value (>50%)"):null}><SidebarInput type="number" value={project.softCostPct} onChange={v=>up({softCostPct:v})} /></Fld>
        <Fld label={t.contingency} tip="هامش احتياطي لزيادات الأسعار أو تغييرات التنفيذ. عادة 5-10%\nReserve for cost overruns or scope changes. Usually 5-10% للمخاطر غير المتوقعة. عادة 5-10%\nRisk reserve for unexpected costs. Standard 5-10%" error={project.contingencyPct<0?(lang==="ar"?"لا يمكن أن تكون سالبة":"Cannot be negative"):project.contingencyPct>30?(lang==="ar"?"قيمة عالية جداً (>30%)":"Very high value (>30%)"):null}><SidebarInput type="number" value={project.contingencyPct} onChange={v=>up({contingencyPct:v})} /></Fld>
      </div>
      <Fld label={t.rentEsc} tip="الزيادة السنوية المفترضة في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAssumed annual rent increase. Prime areas 2-5%, secondary 0.5-2% في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAnnual rent increase %. Prime areas: 2-5%, secondary: 0.5-2%"><SidebarInput type="number" value={project.rentEscalation} onChange={v=>up({rentEscalation:v})} /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.defEfficiency} tip="نسبة المساحة المدرة للدخل من GFA. مكاتب 75-85%، تجزئة 80-90%\nIncome-generating share of GFA. Offices 75-85%, Retail 80-90% للتأجير من GFA. مكاتب 80-90%، تجزئة 70-85%\nLeasable % of GFA. Offices 80-90%, Retail 70-85%" error={project.defaultEfficiency<0?(lang==="ar"?"لا يمكن أن تكون سالبة":"Cannot be negative"):project.defaultEfficiency>100?(lang==="ar"?"الحد الأقصى 100%":"Max 100%"):null}><SidebarInput type="number" value={project.defaultEfficiency} onChange={v=>up({defaultEfficiency:v})} /></Fld>
        <Fld label={t.defLeaseRate} tip="معدل الإيجار الافتراضي للأصول الجديدة بالريال/م²/سنة
Default lease rate for new assets in SAR/sqm/year"><SidebarInput type="number" value={project.defaultLeaseRate} onChange={v=>up({defaultLeaseRate:v})} /></Fld>
      </div>
      <Fld label={t.defCostSqm} tip="تكلفة البناء الافتراضية للأصول الجديدة بالريال/م²
Default construction cost for new assets in SAR/sqm"><SidebarInput type="number" value={project.defaultCostPerSqm} onChange={v=>up({defaultCostPerSqm:v})} /></Fld>
    </Sec>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </>);
}

// ═══════════════════════════════════════════════════════════════
// HOTEL P&L MODAL
// ═══════════════════════════════════════════════════════════════
function HotelPLModal({ data, onSave, onClose, t, lang }) {
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
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",width:520,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border-default)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.hotelPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          {/* Presets */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {Object.keys(HOTEL_PRESETS).map(k=><button key={k} onClick={()=>applyPreset(k)} style={{...btnS,background:"#eef2ff",color:"var(--zan-teal-500)",padding:"6px 12px",fontSize:11,fontWeight:500}}>{k}</button>)}
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
          <div style={{marginTop:16,padding:14,background:"var(--surface-page)",borderRadius:"var(--radius-md)"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.stabRevenue}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>Rooms Rev</span><span style={{textAlign:"right"}}>{fmt(calc.roomsRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>F&B Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fbRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>MICE Rev</span><span style={{textAlign:"right"}}>{fmt(calc.miceRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
            </div>
            <div style={{borderTop:"0.5px solid var(--border-default)",marginTop:8,paddingTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
                <span style={{color:"var(--color-danger)"}}>Total OPEX</span><span style={{textAlign:"right",color:"var(--color-danger)"}}>{fmt(calc.totalOpex)}</span>
                <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"var(--color-success-text)"}}>{fmt(calc.ebitda)}</span>
                <span style={{color:"var(--text-secondary)"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"0.5px solid var(--border-default)",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"8px 16px",fontSize:12}}>{ar?"إلغاء":"Cancel"}</button>
          <button onClick={()=>{onSave(h, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MARINA P&L MODAL
// ═══════════════════════════════════════════════════════════════
function MarinaPLModal({ data, onSave, onClose, t, lang }) {
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
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",width:480,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border-default)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.marinaPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          <button onClick={()=>setM(prev=>({...prev,...MARINA_PRESET}))} style={{...btnS,background:"#eef2ff",color:"var(--zan-teal-500)",padding:"6px 12px",fontSize:11,fontWeight:500,marginBottom:12}}>Marina Preset</button>
          <Row label={t.berths}><NumIn value={m.berths} onChange={v=>upM({berths:v})} /></Row>
          <Row label={t.avgLength}><NumIn value={m.avgLength} onChange={v=>upM({avgLength:v})} /></Row>
          <Row label={t.unitPrice}><NumIn value={m.unitPrice} onChange={v=>upM({unitPrice:v})} /></Row>
          <Row label={t.stabOcc||"Occ %"}><NumIn value={m.stabOcc} onChange={v=>upM({stabOcc:v})} /></Row>
          <Row label={t.fuelPct}><NumIn value={m.fuelPct} onChange={v=>upM({fuelPct:v})} /></Row>
          <Row label={t.otherRevPct}><NumIn value={m.otherRevPct} onChange={v=>upM({otherRevPct:v})} /></Row>
          <Row label={t.berthingOpex}><NumIn value={m.berthingOpexPct} onChange={v=>upM({berthingOpexPct:v})} /></Row>
          <Row label={t.fuelOpex}><NumIn value={m.fuelOpexPct} onChange={v=>upM({fuelOpexPct:v})} /></Row>
          <Row label={t.otherOpex}><NumIn value={m.otherOpexPct} onChange={v=>upM({otherOpexPct:v})} /></Row>

          <div style={{marginTop:16,padding:14,background:"var(--surface-page)",borderRadius:"var(--radius-md)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>Berthing Rev</span><span style={{textAlign:"right"}}>{fmt(calc.berthingRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>Fuel Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fuelRev)}</span>
              <span style={{color:"var(--text-secondary)"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
              <span style={{color:"var(--color-danger)"}}>Total OPEX</span><span style={{textAlign:"right",color:"var(--color-danger)"}}>{fmt(calc.totalOpex)}</span>
              <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"var(--color-success-text)"}}>{fmt(calc.ebitda)}</span>
              <span style={{color:"var(--text-secondary)"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"0.5px solid var(--border-default)",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"8px 16px",fontSize:12}}>{ar?"إلغاء":"Cancel"}</button>
          <button onClick={()=>{onSave(m, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Score Tooltip Cell (fixed-position, escapes overflow) ──
function ScoreCell({ sc, name, ar }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top - 6, left: r.left + r.width / 2 });
    }
    setShow(true);
  };
  const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",label:"✓",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",label:"~",t:ar?"مقبول":"Marginal"}, weak:{bg:"var(--color-danger-bg)",color:"var(--color-danger-text)",label:"✗",t:ar?"ضعيف":"Weak"}, none:{bg:"var(--surface-sidebar)",color:"var(--text-tertiary)",label:"—",t:"—"} }[sc.viable];
  const iCfg = { high:{label:"▲",color:"var(--zan-navy-700)",t:ar?"أثر كبير":"High impact"}, med:{label:"▬",color:"var(--text-secondary)",t:ar?"أثر متوسط":"Med impact"}, low:{label:"▼",color:"var(--text-tertiary)",t:ar?"أثر محدود":"Low impact"} }[sc.impact];
  const yocPct = (sc.yoc * 100).toFixed(1);
  const wPct = (sc.capexWeight * 100).toFixed(0);
  return (
    <div ref={ref} onMouseEnter={onEnter} onMouseLeave={()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{display:"flex",alignItems:"center",gap:3,cursor:"help"}}>
      <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:vCfg.bg,color:vCfg.color,fontWeight:700}}>{vCfg.label}{yocPct>0?` ${yocPct}%`:""}</span>
      <span style={{fontSize:9,color:iCfg.color,fontWeight:600}}>{iCfg.label}{wPct}%</span>
      {show && <div style={{position:"fixed",top:pos.top,left:Math.max(10, Math.min(pos.left - 150, (typeof window!=="undefined"?window.innerWidth:800) - 310)),transform:"translateY(-100%)",width:300,background:"var(--text-primary)",color:"var(--border-default)",padding:"14px 16px",borderRadius:"var(--radius-lg)",fontSize:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start",pointerEvents:"none"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"var(--zan-teal-500)",borderBottom:"1px solid #282d3a",paddingBottom:6}}>{name || (ar?"أصل":"Asset")}</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"var(--text-secondary)"}}>{ar?"الجدوى":"Viability"}</span>
          <span style={{fontWeight:600,color:vCfg.color}}>{vCfg.t}</span>
          <span style={{color:"var(--text-secondary)"}}>{ar?"العائد على التكلفة":"Yield on Cost"}</span>
          <span style={{fontWeight:600}}>{yocPct}%  <span style={{fontWeight:400,color:"var(--text-secondary)"}}>({ar?"إيراد سنوي ÷ CAPEX":"annual rev ÷ CAPEX"})</span></span>
          <span style={{color:"var(--text-secondary)"}}>{ar?"إيراد سنوي":"Annual Rev"}</span>
          <span style={{fontWeight:600}}>{fmtM(sc.annualRev)}</span>
          <span style={{color:"var(--text-secondary)"}}>CAPEX</span>
          <span style={{fontWeight:600}}>{fmtM(sc.capex)}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"var(--text-secondary)"}}>{ar?"الأثر":"Impact"}</span>
          <span style={{fontWeight:600,color:iCfg.color}}>{iCfg.t}</span>
          <span style={{color:"var(--text-secondary)"}}>{ar?"وزن CAPEX":"CAPEX Weight"}</span>
          <span style={{fontWeight:600}}>{wPct}% {ar?"من المشروع":"of project"}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,fontSize:10,color:"var(--text-tertiary)",fontStyle:"italic"}}>
          {sc.impact==="low"?(ar?"نقل هذا الأصل بين المراحل لن يؤثر كثيراً على المشروع":"Moving this asset between phases won't significantly affect the project"):sc.impact==="high"?(ar?"أصل محوري — أي تغيير في موقعه أو توقيته يؤثر بشكل كبير":"Key asset — any change in timing significantly affects the project"):(ar?"أثر متوسط — يجب مراعاة التوقيت":"Moderate impact — timing matters")}
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSET PROGRAM TABLE
// ═══════════════════════════════════════════════════════════════
function AssetTable({ project, upAsset, addAsset, dupAsset, rmAsset, results, t, lang, updateProject, globalExpand }) {
  const isMobile = useIsMobile();
  const [modal, setModal] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");
  const [editIdx, setEditIdx] = useState(null);
  const [showLandRentDetail, setShowLandRentDetail] = useState(false);
  const [landEduModal, setLandEduModal] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [landOpen, setLandOpen] = useState(false);
  const fileRef = useRef(null);
  if (!project) return null;
  const assets = project.assets || [];
  const phaseNames = project.phases.map(p => p.name);

  // ── Asset Templates (Saudi market defaults) ──
  const _ar = lang === "ar";
  const ASSET_TEMPLATES = [
    { id:"hotel5", icon:"🏨", label:_ar?"فندق 5 نجوم":"5-Star Hotel", defaults:{
      name:_ar?"فندق 5 نجوم":"5-Star Hotel", category:"Hospitality", revType:"Operating", code:"H5",
      plotArea:12000, footprint:5000, gfa:35000, efficiency:0, leaseRate:0,
      costPerSqm:12000, constrStart:1, constrDuration:30, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
      opEbitda:47630685, hotelPL:{keys:200, adr:920, stabOcc:73, daysYear:365, roomsPct:64, fbPct:25, micePct:7, otherPct:4, roomExpPct:20, fbExpPct:60, miceExpPct:58, otherExpPct:55, undistPct:28, fixedPct:9},
    }},
    { id:"hotel4", icon:"🏢", label:_ar?"فندق 4 نجوم":"4-Star Hotel", defaults:{
      name:_ar?"فندق 4 نجوم":"4-Star Hotel", category:"Hospitality", revType:"Operating", code:"H4",
      plotArea:5000, footprint:2000, gfa:16000, efficiency:0, leaseRate:0,
      costPerSqm:8000, constrStart:1, constrDuration:30, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
      opEbitda:13901057, hotelPL:{keys:230, adr:548, stabOcc:70, daysYear:365, roomsPct:72, fbPct:22, micePct:4, otherPct:2, roomExpPct:20, fbExpPct:60, miceExpPct:58, otherExpPct:50, undistPct:29, fixedPct:9},
    }},
    { id:"mall", icon:"🛍️", label:_ar?"مول تجاري":"Retail Mall", defaults:{
      name:_ar?"مول تجاري":"Retail Mall", category:"Retail", revType:"Lease", code:"RM",
      plotArea:28000, footprint:20000, gfa:40000, efficiency:80, leaseRate:2100,
      costPerSqm:3900, constrStart:1, constrDuration:36, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
    }},
    { id:"office", icon:"🏛️", label:_ar?"برج مكاتب":"Office Tower", defaults:{
      name:_ar?"برج مكاتب":"Office Tower", category:"Office", revType:"Lease", code:"OF",
      plotArea:5500, footprint:2700, gfa:16000, efficiency:90, leaseRate:900,
      costPerSqm:2600, constrStart:1, constrDuration:36, rampUpYears:2, stabilizedOcc:100, escalation:0.75,
    }},
    { id:"resi", icon:"🏠", label:_ar?"سكني (أبراج)":"Residential Tower", defaults:{
      name:_ar?"برج سكني":"Residential Tower", category:"Residential", revType:"Lease", code:"R1",
      plotArea:4000, footprint:2000, gfa:14000, efficiency:85, leaseRate:800,
      costPerSqm:2800, constrStart:1, constrDuration:30, rampUpYears:2, stabilizedOcc:92, escalation:0.75,
    }},
    { id:"marina", icon:"⚓", label:_ar?"مارينا":"Marina", defaults:{
      name:_ar?"مارينا":"Marina", category:"Marina", revType:"Operating", code:"MAR",
      plotArea:3000, footprint:0, gfa:2400, efficiency:0, leaseRate:0,
      costPerSqm:16000, constrStart:1, constrDuration:12, rampUpYears:4, stabilizedOcc:90, escalation:0.75,
      opEbitda:1129331, marinaPL:{berths:80, avgLength:14, unitPrice:2063, stabOcc:90, fuelPct:25, otherRevPct:10, berthingOpexPct:58, fuelOpexPct:96, otherOpexPct:30},
    }},
    { id:"custom", icon:"✏️", label:_ar?"مخصص (فارغ)":"Custom (Empty)", defaults:{} },
  ];

  const handleTemplateSelect = (defaults) => {
    addAsset(Object.keys(defaults).length > 0 ? defaults : undefined);
    setShowTemplatePicker(false);
    setTimeout(() => setEditIdx(assets.length), 50);
  };

  // Auto-open detail modal after adding a new asset
  const handleAddAsset = () => {
    setShowTemplatePicker(true);
  };

  // Auto-fill defaults when category changes (Sprint 1B)
  const handleCategoryChange = (i, newCat) => {
    const a = assets[i];
    const defs = getAutoFillDefaults(newCat);
    // Only auto-fill fields that are at zero/default — don't overwrite user-entered values
    const updates = { category: newCat };
    if ((a.costPerSqm || 0) === 0 && defs.costPerSqm) updates.costPerSqm = defs.costPerSqm;
    if ((a.efficiency || 0) === 0 && defs.efficiency != null) updates.efficiency = defs.efficiency;
    if ((a.leaseRate || 0) === 0 && defs.leaseRate) updates.leaseRate = defs.leaseRate;
    if (defs.revType && a.revType === "Lease" && defs.revType !== "Lease") updates.revType = defs.revType;
    if ((a.rampUpYears || 3) === 3 && defs.rampUpYears) updates.rampUpYears = defs.rampUpYears;
    if ((a.stabilizedOcc || 100) === 100 && defs.stabilizedOcc && defs.stabilizedOcc !== 100) updates.stabilizedOcc = defs.stabilizedOcc;
    if ((a.constrDuration || 12) === 12 && defs.constrDuration) updates.constrDuration = defs.constrDuration;
    upAsset(i, updates);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportMsg({ type: 'loading', text: lang === 'ar' ? 'جاري الاستيراد...' : 'Importing...' });
    try {
      const { assets: imported, newPhases } = await parseAssetFile(file, project);
      if (imported.length === 0) {
        setImportMsg({ type: 'error', text: lang === 'ar' ? 'لم يتم العثور على بيانات' : 'No asset data found in file' });
        return;
      }
      // Add new phases if detected
      let updatedPhases = [...project.phases];
      if (newPhases.length > 0) {
        newPhases.forEach((pName, i) => {
          updatedPhases.push({ name: pName, startYearOffset: updatedPhases.length + 1, completionYear: (project.startYear||2026) + 3, footprint: 0 });
        });
      }
      updateProject({ assets: [...project.assets, ...imported], phases: updatedPhases });
      const opCount = imported.filter(a => a.revType === 'Operating').length;
      let msg = lang === 'ar'
        ? `تم استيراد ${imported.length} أصل بنجاح`
        : `Imported ${imported.length} assets successfully`;
      if (opCount > 0) {
        msg += lang === 'ar'
          ? ` (${opCount} أصول تشغيلية - اضغط P&L لضبط التفاصيل)`
          : ` (${opCount} Operating assets - click P&L to configure details)`;
      }
      if (newPhases.length > 0) {
        msg += lang === 'ar'
          ? ` | تمت إضافة ${newPhases.length} مراحل جديدة`
          : ` | Added ${newPhases.length} new phases`;
      }
      setImportMsg({ type: 'success', text: msg });
      setTimeout(() => setImportMsg(null), 8000);
    } catch (err) {
      setImportMsg({ type: 'error', text: (lang==='ar'?'فشل الاستيراد: ':'Import failed: ') + String(err) });
      setTimeout(() => setImportMsg(null), 6000);
    }
  };

  // Bilingual column headers
  // Viability & Impact scoring per asset
  const totalProjectCapex = results?.consolidated?.totalCapex || 1;
  const totalProjectIncome = results?.consolidated?.totalIncome || 1;
  const getAssetScore = (asset, comp) => {
    const capex = comp?.totalCapex || computeAssetCapex(asset, project);
    const income = comp?.totalRevenue || 0;
    const horizon = project.horizon || 50;
    const durYrs = Math.ceil((asset.constrDuration || 12) / 12);
    const revStart = comp?.revenueSchedule ? comp.revenueSchedule.findIndex(v => v > 0) : -1;
    const revYears = revStart >= 0 ? Math.max(1, horizon - revStart) : Math.max(1, horizon - durYrs);
    const annualRev = revYears > 0 ? income / revYears : 0;
    const yoc = capex > 0 ? annualRev / capex : 0; // Yield on Cost
    const capexWeight = capex / totalProjectCapex; // CAPEX weight
    const incomeWeight = income / totalProjectIncome; // Revenue weight
    // Viability: based on yield on cost
    const viable = capex === 0 ? "none" : yoc > 0.08 ? "strong" : yoc > 0.04 ? "ok" : income > 0 ? "weak" : "none";
    // Impact: based on CAPEX share
    const impact = capexWeight > 0.25 ? "high" : capexWeight > 0.10 ? "med" : "low";
    return { yoc, capexWeight, incomeWeight, annualRev, viable, impact, capex, income };
  };

  const cols = [
    { key:"#", en:"#", ar:"#", w:30 },
    { key:"phase", en:"Phase", ar:"المرحلة", w:80 },
    { key:"category", en:"Category", ar:"التصنيف", w:95 },
    { key:"name", en:"Asset Name", ar:"اسم الأصل", w:130 },
    { key:"code", en:"Code", ar:"الرمز", w:42 },
    { key:"plotArea", en:"Plot", ar:"القطعة", w:60 },
    { key:"footprint", en:"Fprint", ar:"المسطح", w:55 },
    { key:"gfa", en:"GFA", ar:"م.ط", w:60 },
    { key:"revType", en:"Type", ar:"النوع", w:65 },
    { key:"eff", en:"Eff%", ar:"كفاءة", w:45 },
    { key:"leasable", en:"Lease.", ar:"تأجير", w:55 },
    { key:"rate", en:"Rate", ar:"إيجار", w:55 },
    { key:"opEbitda", en:"EBITDA", ar:"تشغيلي", w:75 },
    { key:"esc", en:"Esc%", ar:"زيادة", w:40 },
    { key:"ramp", en:"Ramp", ar:"نمو", w:38 },
    { key:"occ", en:"Occ%", ar:"إشغال", w:42 },
    { key:"cost", en:"Cost/sqm", ar:"تكلفة/م²", w:65 },
    { key:"dur", en:"Build (mo)", ar:"مدة البناء", w:70 },
    { key:"totalCapex", en:"CAPEX", ar:"التكاليف", w:80 },
    { key:"totalInc", en:"Revenue", ar:"الإيرادات", w:80 },
    { key:"score", en:"Score", ar:"تقييم", w:90 },
    { key:"ops", en:"", ar:"", w:30 },
  ];

  const [editingPhase, setEditingPhase] = useState(null);
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterRev, setFilterRev] = useState("all");
  const [hiddenCols, setHiddenCols] = useState(() => new Set(["plotArea","footprint","esc","ramp","occ"]));
  const [showColPicker, setShowColPicker] = useState(false);
  const [cfOpen, setCfOpen] = useState({}); // which asset CFs are expanded
  const [cfAllOpen, setCfAllOpen] = useState(false); // global toggle
  const [cfDetail, setCfDetail] = useState(false); // show detail rows
  const [cfYrs, setCfYrs] = useState(15);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setCfAllOpen(expand); setCfDetail(expand); setLandOpen(expand); setShowLandRentDetail(expand); const obj = {}; (project?.assets||[]).forEach((_, i) => { obj[i] = expand; }); setCfOpen(obj); }}, [globalExpand]);
  const ar = lang === "ar";
  const toggleCol = (key) => { setHiddenCols(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; }); };
  const visibleCols = cols.filter(c => !hiddenCols.has(c.key));

  // Phase management
  const addPhase = () => { const n = project.phases.length + 1; const prevYear = project.phases[project.phases.length-1]?.completionYear || ((project.startYear||2026) + 3); updateProject({ phases: [...project.phases, { name: `Phase ${n}`, startYearOffset: n, completionYear: prevYear + 2, footprint: 0 }] }); };
  const renamePhase = (i, name) => { const ph = [...project.phases]; ph[i] = { ...ph[i], name }; updateProject({ phases: ph }); };
  const rmPhase = (i) => { if (project.phases.length <= 1) return; updateProject({ phases: project.phases.filter((_, j) => j !== i) }); };

  // Auto-calculate footprint per phase from assets
  const phaseFootprints = {};
  phaseNames.forEach(pn => { phaseFootprints[pn] = assets.filter(a => a.phase === pn).reduce((s, a) => s + (a.footprint || 0), 0); });

  // Filtered asset indices (display only - editIdx still references original array)
  const filteredIndices = assets.map((_, i) => i).filter(i => {
    const a = assets[i];
    if (filterPhase !== "all" && a.phase !== filterPhase) return false;
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterRev !== "all" && a.revType !== filterRev) return false;
    return true;
  });
  const isFiltered = filterPhase !== "all" || filterCat !== "all" || filterRev !== "all";

  const up = updateProject;
  const cur = project.currency || "SAR";

  return (
    <div>
      {/* ═══ LAND SECTION — REDESIGNED ═══ */}
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-xl)",border:"0.5px solid var(--border-default)",marginBottom:14,overflow:"hidden",boxShadow:"var(--shadow-sm)"}}>
        {/* Header — clickable to collapse */}
        <div onClick={()=>setLandOpen(!landOpen)} style={{padding:"10px 14px",background:"var(--surface-page)",borderBottom:landOpen?"1px solid #e5e7ec":"none",display:"flex",alignItems:"center",gap:6,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"} onMouseLeave={e=>e.currentTarget.style.background="var(--surface-page)"}>
          <span style={{fontSize:10,color:"var(--text-tertiary)",transition:"transform 0.2s",transform:landOpen?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
          <span style={{fontSize:14}}>🏗</span>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{ar?"الأرض":"Land"}</span>
          </div>
          {project.landArea > 0 && <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:9,color:"var(--color-success)",background:"#ecfdf5",padding:"2px 8px",borderRadius:"var(--radius-lg)",fontWeight:600}}>
              {LAND_TYPES.find(lt=>lt.value===project.landType)?.[ar?"ar":"en"]||project.landType}
            </span>
            <span style={{fontSize:9,color:"var(--text-secondary)",background:"#f3f4f6",padding:"2px 8px",borderRadius:"var(--radius-lg)",fontWeight:500}}>
              {fmt(project.landArea)} {ar?"م²":"m²"}
            </span>
          </div>}
        </div>

        {landOpen && <>

        {/* Row 1: Tenure + Area */}
        <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
              {ar?"نوع الحيازة":"Tenure Type"}
              <HelpLink contentKey="landType" lang={lang} onOpen={setLandEduModal} />
            </div>
            <select value={project.landType} onChange={e=>up({landType:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:"var(--radius-sm)",background:"var(--surface-card)",fontSize:12,fontFamily:"inherit",color:"var(--text-primary)",cursor:"pointer"}}>
              {LAND_TYPES.map(lt => <option key={lt.value} value={lt.value}>{ar?lt.ar:lt.en}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:10,color:project.landArea<0?"var(--color-danger)":"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"إجمالي المساحة":"Total Area"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"م²":"sqm"})</span></div>
            <div style={project.landArea<0?{borderRadius:"var(--radius-sm)",boxShadow:"0 0 0 1.5px #ef4444"}:undefined}><SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landArea} onChange={v=>up({landArea:v})} /></div>
            {project.landArea<0&&<div style={{fontSize:9,color:"var(--color-danger)",marginTop:2}}>{ar?"لا يمكن أن تكون سالبة":"Cannot be negative"}</div>}
          </div>
        </div>

        {/* Purchase-specific */}
        {project.landType==="purchase"&&<div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:"1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"سعر الشراء":"Purchase Price"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({cur})</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landPurchasePrice} onChange={v=>up({landPurchasePrice:v})} />
            {project.landPurchasePrice > 0 && project.landArea > 0 && <div style={{fontSize:10,color:"var(--zan-teal-500)",marginTop:4}}>= {fmt(Math.round(project.landPurchasePrice / project.landArea))} {cur}/{ar?"م²":"sqm"}</div>}
          </div>
        </div>}

        {/* Partner-specific */}
        {project.landType==="partner"&&<div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"تقييم الأرض":"Land Valuation"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({cur})</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landValuation} onChange={v=>up({landValuation:v})} />
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"نسبة حصة الشريك":"Partner Equity"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>(%)</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.partnerEquityPct} onChange={v=>up({partnerEquityPct:v})} />
          </div>
        </div>}

        {/* BOT-specific */}
        {project.landType==="bot"&&<div style={{padding:"0 14px 10px"}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"فترة التشغيل":"Operation Period"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنوات":"years"})</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.botOperationYears} onChange={v=>up({botOperationYears:v})} />
          </div>
        </div>}

        {/* ── Lease Details ── */}
        {project.landType==="lease"&&<>
          {/* Sub-header: عقد الإيجار */}
          <div style={{padding:"8px 14px 4px",borderTop:"1px solid #f0f1f5"}}>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:0.5,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:4,height:4,borderRadius:2,background:"#2EC4B6"}} />
              {ar?"تفاصيل عقد الإيجار":"Lease Contract Details"}
            </div>
          </div>

          {/* Lease Row 1: Annual Rent (full width emphasis) */}
          <div style={{padding:"6px 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"الإيجار السنوي":"Annual Rent"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({cur})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentAnnual} onChange={v=>up({landRentAnnual:v})} />
              {project.landRentAnnual > 0 && project.landArea > 0 && <div style={{fontSize:10,color:"var(--zan-teal-500)",marginTop:4}}>= {fmt(Math.round(project.landRentAnnual / project.landArea * 100)/100)} {cur}/{ar?"م²":"sqm"}/{ar?"سنة":"yr"}</div>}
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"مدة العقد":"Term"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentTerm} onChange={v=>up({landRentTerm:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"فترة السماح":"Grace"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentGrace} onChange={v=>up({landRentGrace:v})} />
            </div>
          </div>

          {/* Lease Row 2: Escalation */}
          <div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"نسبة الزيادة":"Escalation"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>(%)</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentEscalation} onChange={v=>up({landRentEscalation:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"كل":"Every"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentEscalationEveryN} onChange={v=>up({landRentEscalationEveryN:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"بداية العقد":"Lease Start"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"year"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landLeaseStartYear||0} onChange={v=>up({landLeaseStartYear:v})} placeholder={String(project.startYear||2026)} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"قاعدة بداية الإيجار":"Rent Start Rule"}</div>
              <select value={project.landRentStartRule||"auto"} onChange={e=>up({landRentStartRule:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:"var(--radius-sm)",background:"var(--surface-card)",fontSize:12,fontFamily:"inherit",color:"var(--text-primary)",cursor:"pointer"}}>
                <option value="auto">{ar?"تلقائي (افتراضي)":"Auto (default)"}</option>
                <option value="grace">{ar?"بعد انتهاء السماح":"After Grace Period"}</option>
                <option value="income">{ar?"بعد أول إيراد":"After First Income"}</option>
              </select>
            </div>
          </div>

          {/* Rent allocation details */}
          {results?.landRentMeta?.rentStartYear != null && <div style={{padding:"0 14px 10px"}}>
            <button onClick={()=>setShowLandRentDetail(!showLandRentDetail)} style={{fontSize:11,color:"var(--zan-teal-500)",background:"#f0fdfa",border:"1px solid #ccfbf1",borderRadius:"var(--radius-md)",padding:"4px 8px",cursor:"pointer",width:"100%",textAlign:"start",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#e6fffa"} onMouseLeave={e=>e.currentTarget.style.background="#f0fdfa"}>
              <span style={{fontSize:10}}>{showLandRentDetail?"▼":"▶"}</span>
              {ar?"تفاصيل توزيع الإيجار بين المراحل":"Land Rent Allocation Details"}
              {results.landRentMeta.rentStartYear != null && <span style={{marginInlineStart:"auto",fontSize:10,color:"var(--color-success)",fontWeight:500}}>{ar?"يبدأ":"Starts"} {results.landRentMeta.rentStartYear + (results?.startYear||2026)}</span>}
            </button>
            {showLandRentDetail && (() => {
              const m = results.landRentMeta;
              const sy = results?.startYear||2026;
              const phases = m.phaseShares ? Object.entries(m.phaseShares) : [];
              const isManual = !!project.landRentManualAlloc && Object.keys(project.landRentManualAlloc).length > 0;
              const manualSum = isManual ? Object.values(project.landRentManualAlloc).reduce((s,v)=>s+(Number(v)||0),0) : 0;
              return <div style={{background:"#f8fffe",border:"1px solid #d1fae5",borderRadius:"var(--radius-md)",padding:10,marginTop:4,fontSize:10}}>
                <div style={{display:"flex",gap:12,marginBottom:6,color:"var(--text-primary)"}}>
                  <span>{ar?"بداية العقد:":"Lease starts:"} <strong>{m.leaseStartAbsolute||sy}</strong></span>
                  <span>{ar?"السماح:":"Grace:"} <strong>{project.landRentGrace||0} {ar?"سنة":"yr"}</strong></span>
                  <span>{ar?"أول إيجار:":"First rent:"} <strong>{m.rentStartYear + sy}</strong></span>
                </div>
                {phases.length > 0 && <>
                  <div style={{fontWeight:700,marginTop:6,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11}}>
                    <span>{ar?"التوزيع بين المراحل:":"Phase allocation:"}</span>
                    <button onClick={()=>{
                      if (isManual) { up({landRentManualAlloc:null}); }
                      else { const init={}; phases.forEach(([pn,ps])=>{init[pn]=Math.round((ps.share||0)*100);}); up({landRentManualAlloc:init}); }
                    }} style={{fontSize:10,padding:"3px 10px",borderRadius:"var(--radius-sm)",border:"1px solid "+(isManual?"var(--color-warning)":"#d1d5db"),background:isManual?"#fffbeb":"#fff",color:isManual?"#b45309":"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                      {isManual ? (ar?"⚙ يدوي":"⚙ Manual") : (ar?"تلقائي":"Auto")}
                    </button>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{borderBottom:"2px solid #d1fae5"}}>
                      <th style={{textAlign:"start",padding:"2px 4px",color:"var(--text-secondary)",fontWeight:600}}>{ar?"المرحلة":"Phase"}</th>
                      <th style={{textAlign:"right",padding:"2px 4px",color:"var(--text-secondary)",fontWeight:600}}>{ar?"المساحة":"Area"}</th>
                      <th style={{textAlign:"right",padding:"2px 4px",color:"var(--text-secondary)",fontWeight:600}}>{ar?"الحصة":"Share"}</th>
                    </tr></thead>
                    <tbody>
                      {phases.map(([pn,ps])=><tr key={pn} style={{borderBottom:"1px solid #ecfdf5"}}>
                        <td style={{padding:"2px 4px",fontWeight:500}}>{pn}</td>
                        <td style={{padding:"2px 4px",textAlign:"right"}}>{(ps.footprint||0).toLocaleString()}</td>
                        <td style={{padding:"2px 4px",textAlign:"right",fontWeight:600}}>
                          {isManual ? <input type="number" value={project.landRentManualAlloc?.[pn]??""} onChange={e=>{const cur={...(project.landRentManualAlloc||{})};cur[pn]=Number(e.target.value)||0;up({landRentManualAlloc:cur});}} style={{width:48,textAlign:"right",padding:"2px 4px",border:"1px solid #d1d5db",borderRadius:4,fontSize:11,fontWeight:600,fontFamily:"inherit"}} /> : <span>{((ps.share)*100).toFixed(0)}%</span>}
                        </td>
                      </tr>)}
                      {isManual && <tr style={{borderTop:"2px solid #d1fae5",fontWeight:700}}>
                        <td colSpan={2} style={{padding:"2px 4px",textAlign:"right",fontSize:10}}>{ar?"المجموع":"Total"}</td>
                        <td style={{padding:"2px 4px",textAlign:"right",color:Math.abs(manualSum-100)>0.1?"var(--color-danger)":"var(--color-success)"}}>{manualSum}%</td>
                      </tr>}
                    </tbody>
                  </table>
                  {isManual && Math.abs(manualSum-100)>0.1 && <div style={{marginTop:6,padding:"4px 8px",background:"var(--color-danger-bg)",border:"1px solid #fecaca",borderRadius:"var(--radius-sm)",fontSize:10,color:"#dc2626",fontWeight:500}}>
                    ⚠ {ar?"المجموع = "+manualSum+"% (يجب 100%)":"Total = "+manualSum+"% (should be 100%)"}
                  </div>}
                </>}
              </div>;
            })()}
          </div>}
        </>}
        </>}
      </div>
      {landEduModal && <EducationalModal contentKey={landEduModal} lang={lang} onClose={()=>setLandEduModal(null)} />}

      {/* ═══ PHASES BAR ═══ */}
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:"8px 12px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المراحل":"Phases"}</span>
          <div style={{flex:1}} />
          <button onClick={addPhase} style={{...btnS,background:"var(--color-info-bg)",color:"var(--zan-teal-500)",padding:"3px 10px",fontSize:9,fontWeight:600,border:"0.5px solid var(--border-focus)"}}>+ {ar?"مرحلة":"Phase"}</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {project.phases.map((ph, i) => {
            const assetCount = assets.filter(a => a.phase === ph.name).length;
            return (
              <div key={i} style={{background:"var(--surface-page)",borderRadius:"var(--radius-sm)",border:"0.5px solid var(--border-default)",padding:"4px 10px",display:"flex",alignItems:"center",gap:6}}>
                {editingPhase === i ? (
                  <input value={ph.name} onChange={e => renamePhase(i, e.target.value)} onBlur={() => setEditingPhase(null)} onKeyDown={e => { if (e.key === "Enter") setEditingPhase(null); }} autoFocus style={{fontSize:11,fontWeight:600,border:"1px solid #2563eb",borderRadius:3,padding:"1px 5px",width:80,fontFamily:"inherit",outline:"none"}} />
                ) : (
                  <span onClick={() => setEditingPhase(i)} style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",cursor:"pointer"}} title={ar?"اضغط لإعادة التسمية":"Click to rename"}>{ph.name}</span>
                )}
                <span style={{fontSize:9,color:"var(--text-tertiary)",background:"var(--border-default)",borderRadius:"var(--radius-md)",padding:"1px 5px"}}>{assetCount}</span>
                <span style={{fontSize:9,color:"var(--text-secondary)",marginInlineStart:2}} title={ar?"سنة افتتاح المرحلة":"Phase opening year"}>{ar?"افتتاح:":"Opens:"}</span>
                <input type="number" value={ph.completionYear||(project.startYear||2026)+Math.ceil((ph.completionMonth||36)/12)} onChange={e=>{const ph2=[...project.phases];ph2[i]={...ph2[i],completionYear:parseInt(e.target.value)||2030};updateProject({phases:ph2});}} style={{width:48,fontSize:10,fontWeight:600,border:"0.5px solid var(--border-default)",borderRadius:3,padding:"1px 4px",textAlign:"center",fontFamily:"inherit",background:"var(--surface-card)"}} min={project.startYear||2026} />
                {project.phases.length > 1 && (
                  <button onClick={()=>rmPhase(i)} style={{background:"none",border:"none",color:"var(--text-secondary)",padding:0,fontSize:11,cursor:"pointer",lineHeight:1,fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.color="var(--color-danger)"} onMouseLeave={e=>e.currentTarget.style.color="#d0d4dc"} title={ar?"حذف":"Delete"}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {assets.length > 0 && (
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:600,color:"var(--text-secondary)"}}>{ar?"فلترة:":"Filter:"}</span>
          <select value={filterPhase} onChange={e=>setFilterPhase(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit",color:"var(--text-primary)"}}>
            <option value="all">{ar?"كل المراحل":"All Phases"}</option>
            {phaseNames.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit",color:"var(--text-primary)"}}>
            <option value="all">{ar?"كل التصنيفات":"All Categories"}</option>
            {[...new Set(assets.map(a=>a.category))].filter(Boolean).map(c=><option key={c} value={c}>{catL(c,ar)}</option>)}
          </select>
          <select value={filterRev} onChange={e=>setFilterRev(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit",color:"var(--text-primary)"}}>
            <option value="all">{ar?"كل أنواع الإيراد":"All Rev Types"}</option>
            {[...new Set(assets.map(a=>a.revType))].filter(Boolean).map(r2=><option key={r2} value={r2}>{revL(r2,ar)}</option>)}
          </select>
          {(filterPhase!=="all"||filterCat!=="all"||filterRev!=="all") && (
            <button onClick={()=>{setFilterPhase("all");setFilterCat("all");setFilterRev("all");}} style={{...btnS,padding:"4px 10px",fontSize:10,background:"var(--color-danger-bg)",color:"var(--color-danger)",border:"1px solid #fecaca"}}>{ar?"مسح الفلتر":"Clear"}</button>
          )}
        </div>
      )}

      {/* ── Asset Header ── */}
      <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:15,fontWeight:600}}>{t.assetProgram}</div>
        <div style={{fontSize:12,color:"var(--text-secondary)"}}>{isFiltered?`${filteredIndices.length}/${assets.length}`:assets.length} {t.assets}</div>
        <div style={{flex:1}} />
        <div style={{display:"flex",background:"var(--surface-sidebar)",borderRadius:"var(--radius-sm)",padding:2}}>
          <button onClick={()=>setViewMode("cards")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="cards"?"#fff":"transparent",color:viewMode==="cards"?"var(--text-primary)":"var(--text-tertiary)",boxShadow:viewMode==="cards"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>▦ {lang==="ar"?"بطاقات":"Cards"}</button>
          <button onClick={()=>setViewMode("table")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="table"?"#fff":"transparent",color:viewMode==="table"?"var(--text-primary)":"var(--text-tertiary)",boxShadow:viewMode==="table"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>☰ {lang==="ar"?"جدول":"Table"}</button>
        </div>
        {viewMode==="table" && <div style={{position:"relative"}}>
          <button onClick={()=>setShowColPicker(!showColPicker)} style={{...btnS,background:showColPicker?"#e0e7ff":"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"5px 10px",fontSize:10,fontWeight:500,border:"0.5px solid var(--border-default)"}} title={ar?"إظهار/إخفاء أعمدة":"Show/Hide Columns"}>⚙ {ar?"أعمدة":"Cols"} ({cols.length - hiddenCols.size}/{cols.length})</button>
          {showColPicker && <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"var(--surface-card)",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-md)",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,padding:"8px 0",width:180,maxHeight:320,overflowY:"auto"}}>
            {cols.filter(c=>!["#","ops"].includes(c.key)).map(c=>(
              <label key={c.key} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",fontSize:11,cursor:"pointer",color:hiddenCols.has(c.key)?"var(--text-tertiary)":"var(--text-primary)"}} onMouseEnter={e=>e.currentTarget.style.background="var(--surface-page)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={!hiddenCols.has(c.key)} onChange={()=>toggleCol(c.key)} style={{accentColor:"var(--zan-teal-500)"}} />
                {ar?c.ar:c.en}
              </label>
            ))}
            <div style={{borderTop:"0.5px solid var(--border-default)",margin:"4px 0"}} />
            <button onClick={()=>setHiddenCols(new Set())} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"var(--zan-teal-500)",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"إظهار الكل":"Show All"}</button>
            <button onClick={()=>setHiddenCols(new Set(["plotArea","footprint","esc","ramp","occ"]))} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"var(--text-secondary)",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"الافتراضي":"Default"}</button>
          </div>}
        </div>}
        <button onClick={()=>{generateTemplate();addToast(ar?"تم تحميل النموذج":"Template downloaded","success");}} style={{...btnS,background:"var(--color-success-bg)",color:"var(--color-success-text)",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bbf7d0"}} title={lang==='ar'?"تحميل نموذج Excel":"Download Excel Template"}>
          {lang==='ar'?'⬇ تحميل نموذج':'⬇ Template'}
        </button>
        <button onClick={()=>{exportAssetsToExcel(project, results);addToast(ar?"تم تصدير الأصول":"Assets exported","success");}} style={{...btnS,background:"var(--color-info-bg)",color:"var(--zan-teal-500)",padding:"7px 14px",fontSize:11,fontWeight:500,border:"0.5px solid var(--border-focus)"}} title={lang==='ar'?"تصدير الأصول إلى Excel":"Export Assets to Excel"}>
          {lang==='ar'?'⬇ تصدير':'⬇ Export'}
        </button>
        <input type="file" accept=".csv,.tsv" ref={fileRef} onChange={handleUpload} style={{display:"none"}} />
        <button onClick={()=>fileRef.current?.click()} style={{...btnS,background:"var(--color-warning-bg)",color:"var(--color-warning-text)",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #fde68a"}} title={lang==='ar'?"رفع ملف Excel":"Upload Excel File"}>
          {lang==='ar'?'⬆ رفع ملف':'⬆ Upload'}
        </button>
        <button onClick={handleAddAsset} style={{...btnPrim,padding:"7px 16px",fontSize:12}}>{t.addAsset}</button>
      </div>

      {/* Import message */}
      {importMsg && (
        <div style={{
          marginBottom:12, padding:"10px 14px", borderRadius:"var(--radius-sm)", fontSize:12,
          background: importMsg.type==='success'?'#f0fdf4':importMsg.type==='error'?'#fef2f2':'#fffbeb',
          color: importMsg.type==='success'?'#16a34a':importMsg.type==='error'?'#ef4444':'#92400e',
          border: `1px solid ${importMsg.type==='success'?'#bbf7d0':importMsg.type==='error'?'#fecaca':'#fde68a'}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span>{importMsg.text}</span>
          <button onClick={()=>setImportMsg(null)} style={{...btnSm,background:"transparent",color:"inherit",fontSize:14,padding:"0 4px"}}>✕</button>
        </div>
      )}
      {/* CARD VIEW */}
      {viewMode === "cards" && (<div>
        {assets.length===0 ? (<>
          {/* Asset Prep Guide */}
          <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 18px",background:"rgba(46,196,182,0.04)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:"var(--radius-lg)",marginBottom:14}}>
            <span style={{fontSize:20,flexShrink:0}}>📋</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"ما تحتاجه لإضافة أصل:":"What you need to add an asset:"}</div>
              <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.8}}>{lang==="ar"?<>
                • مساحة الأرض ومساحة البناء (م²)<br/>• عدد الأدوار والمساحة الإجمالية GFA<br/>• تكلفة البناء لكل م²<br/>• مدة البناء (بالأشهر)<br/>• الإيجار لكل م² أو ADR للفنادق<br/>• نسبة الإشغال المتوقعة
              </>:<>
                • Land area and building footprint (sqm)<br/>• Number of floors and total GFA<br/>• Construction cost per sqm<br/>• Build duration (months)<br/>• Rent per sqm or ADR for hotels<br/>• Expected occupancy rate
              </>}</div>
              <div style={{fontSize:10,color:"var(--zan-teal-500)",marginTop:6,fontWeight:600}}>{lang==="ar"?"💡 اختر قالب جاهز عند الإضافة وسنعبئ معظم القيم تلقائياً":"💡 Pick a template when adding and most values will be pre-filled"}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,background:"rgba(46,196,182,0.03)",borderRadius:"var(--radius-xl)",border:"1px dashed rgba(46,196,182,0.2)",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>🏗</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"لا توجد أصول بعد":"No Assets Yet"}</div>
            <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:20,maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"أضف أصول مشروعك لتبدأ تشوف التدفقات والتحليلات. استخدم الزر أدناه أو استورد من ملف.":"Add your project assets to start seeing cash flows and analytics. Use the button below or import from file."}</div>
            <button onClick={handleAddAsset} style={{background:"linear-gradient(135deg,#0f766e,#2EC4B6)",color:"var(--text-inverse)",border:"none",borderRadius:"var(--radius-md)",padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              ➕ {lang==="ar"?"أضف أول أصل":"Add First Asset"}
            </button>
          </div>
        </>) : (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))",gap:isMobile?8:12}}>
            {filteredIndices.map(i=>{const a=assets[i];const comp=results?.assetSchedules?.[i];const capex=comp?.totalCapex||computeAssetCapex(a,project);const income=comp?.totalRevenue||0;const catC={Hospitality:"#8b5cf6",Retail:"var(--color-info)",Office:"#06b6d4",Residential:"#22c55e",Marina:"#0ea5e9",Industrial:"var(--color-warning)",Cultural:"#ec4899"};const catI={Hospitality:"🏨",Retail:"🛍",Office:"🏢",Residential:"🏠",Marina:"⚓",Industrial:"🏭",Cultural:"🎭","Open Space":"🌳",Utilities:"⚡",Flexible:"🔧"};const cc=catC[a.category]||"var(--text-secondary)";
            return <div key={a.id||i} className="asset-card" onClick={()=>setEditIdx(i)} style={{background:"var(--surface-card)",borderRadius:"var(--radius-xl)",border:"0.5px solid var(--border-default)",cursor:"pointer",boxShadow:"var(--shadow-sm)",animationDelay:i*0.05+"s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
              <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{catI[a.category]||"📦"}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:10,color:"var(--text-tertiary)"}}>{a.code?a.code+" · ":""}{a.phase}</div></div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:"var(--radius-lg)",background:cc+"15",color:cc,fontWeight:600}}>{catL(a.category,ar)}</span>
              </div>
              <div style={{padding:"10px 16px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                <div><span style={{color:"var(--text-tertiary)"}}>{ar?"GFA":"GFA"}</span><div style={{fontWeight:600}}>{fmt(a.gfa)} m²</div></div>
                <div><span style={{color:"var(--text-tertiary)"}}>{a.revType==="Lease"?(ar?"الإيجار":"Rate"):a.revType==="Sale"?(ar?"سعر البيع":"Sale Price"):(ar?"أرباح تشغيلية":"EBITDA")}</span><div style={{fontWeight:600}}>{a.revType==="Lease"?fmt(a.leaseRate)+" /m²":a.revType==="Sale"?fmt(a.salePricePerSqm||0)+" /m²":fmtM(a.opEbitda)}</div></div>
                <div><span style={{color:"var(--text-tertiary)"}}>{ar?"CAPEX":"CAPEX"}</span><div style={{fontWeight:700,color:"var(--color-danger)"}}>{fmtM(capex)}</div></div>
                <div><span style={{color:"var(--text-tertiary)"}}>{ar?"الإيرادات":"Revenue"}</span><div style={{fontWeight:700,color:"var(--color-success-text)"}}>{fmtM(income)}</div></div>
              </div>
            </div>;})}
          </div>
        )}
        {/* ═══ TEMPLATE PICKER MODAL ═══ */}
        {showTemplatePicker && (<>
          <div onClick={()=>setShowTemplatePicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9990}} />
          <div style={{position:"fixed",zIndex:9991,top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:520,maxWidth:"94vw",background:"var(--surface-card)",borderRadius:"var(--radius-2xl)",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",overflow:"hidden",animation:"zanModalIn 0.2s ease-out"}}>
            <div style={{padding:"20px 24px 12px",borderBottom:"0.5px solid var(--surface-separator)"}}>
              <div style={{fontSize:18,fontWeight:700,color:"var(--text-primary)"}}>{ar?"اختر نوع الأصل":"Choose Asset Type"}</div>
              <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:4}}>{ar?"اختر قالب جاهز بقيم السوق السعودي، أو ابدأ فارغ":"Pick a template with Saudi market defaults, or start empty"}</div>
            </div>
            <div style={{padding:"16px 24px 24px",display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
              {ASSET_TEMPLATES.map(tmpl=>(
                <button key={tmpl.id} onClick={()=>handleTemplateSelect(tmpl.defaults)} style={{padding:"16px 12px",background:"var(--surface-page)",border:"2px solid #e5e7ec",borderRadius:"var(--radius-xl)",cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.background="#f0fdfa";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border-default)";e.currentTarget.style.background="var(--surface-page)";}}>
                  <div style={{fontSize:28,marginBottom:6}}>{tmpl.icon}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{tmpl.label}</div>
                </button>
              ))}
            </div>
          </div>
        </>)}
        {editIdx!==null&&editIdx<assets.length&&(()=>{const a=assets[editIdx],i=editIdx,comp=results?.assetSchedules?.[i],isOp=a.revType==="Operating",isSale=a.revType==="Sale",isH=isOp&&a.category==="Hospitality",isM=isOp&&a.category==="Marina";
        const F2=({label,children,error})=><div style={{marginBottom:8}}><div style={{fontSize:10,color:error?"var(--color-danger)":"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{label}</div><div style={error?{borderRadius:"var(--radius-sm)",boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>{error&&<div style={{fontSize:9,color:"var(--color-danger)",marginTop:2}}>{error}</div>}</div>;
        const g3=isMobile?"1fr 1fr":"1fr 1fr 1fr";
        const g2=isMobile?"1fr":"1fr 1fr";
        return <><div onClick={()=>setEditIdx(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:9990}} />
        <div style={{position:"fixed",zIndex:9991,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--surface-card)",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",...(isMobile?{inset:0,borderRadius:0}:{top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:560,maxWidth:"94vw",maxHeight:"88vh",borderRadius:"var(--radius-2xl)",animation:"zanModalIn 0.2s ease-out"})}}>
          <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border-default)",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:11,color:"var(--text-tertiary)"}}>{catL(a.category,ar)} · {a.phase}</div></div>
            <button onClick={()=>{dupAsset(i);setEditIdx(null);setTimeout(()=>setEditIdx(assets.length),80);}} style={{...btnS,background:"var(--color-info-bg)",color:"var(--zan-teal-500)",padding:"6px 12px",fontSize:11}} title={ar?"تكرار":"Duplicate"}>{ar?"📋 تكرار":"📋 Duplicate"}</button>
            <button onClick={()=>{rmAsset(i);setEditIdx(null);}} style={{...btnS,background:"var(--color-danger-bg)",color:"var(--color-danger)",padding:"6px 12px",fontSize:11}}>{ar?"حذف":"Delete"}</button>
            <button onClick={()=>setEditIdx(null)} style={{...btnS,background:"var(--surface-sidebar)",padding:"6px 10px",fontSize:16,lineHeight:1}}>✕</button>
          </div>
          <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
            {/* ── Group 1: Basic Info ── */}
            <FieldGroup icon="📝" title={ar?"أساسي":"Basic Info"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <F2 label={ar?"المرحلة":"Phase"}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></F2>
              <F2 label={ar?"التصنيف":"Category"}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></F2>
              <F2 label={ar?"نوع الإيراد":"Rev Type"}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></F2>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F2 label={ar?"الاسم":"Name"}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"اسم الأصل":"Name"} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"الرمز":"Code"}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 2: Areas & Dimensions ── */}
            <FieldGroup icon="📐" title={ar?"المساحات":"Areas & Dimensions"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <F2 label={ar?"مساحة القطعة Plot Area":"Plot Area"} error={a.plotArea<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"المسطح البنائي Footprint":"Footprint"} error={a.footprint<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"المساحة الطابقية GFA (م²)":"GFA (m²)"} error={a.gfa<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 3: Revenue ── */}
            <FieldGroup icon="💰" title={ar?"الإيرادات":"Revenue"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <F2 label={ar?"نسبة الكفاءة Eff %":"Efficiency %"}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"معدل الإيجار Lease Rate /م²":"Lease Rate"}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"EBITDA التشغيلية":"Op EBITDA"}><EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              {isSale && <>
                <F2 label={ar?"سعر البيع/م²":"Sale Price/sqm"}><EditableCell type="number" value={a.salePricePerSqm||0} onChange={v=>upAsset(i,{salePricePerSqm:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
                <F2 label={ar?"سنوات الاستيعاب":"Absorption Yrs"}><EditableCell type="number" value={a.absorptionYears||3} onChange={v=>upAsset(i,{absorptionYears:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
                <F2 label={ar?"ما قبل البيع %":"Pre-Sale %"}><EditableCell type="number" value={a.preSalePct||0} onChange={v=>upAsset(i,{preSalePct:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
                <F2 label={ar?"عمولة البيع %":"Commission %"}><EditableCell type="number" value={a.commissionPct||0} onChange={v=>upAsset(i,{commissionPct:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              </>}
              <F2 label={ar?"نسبة الزيادة Esc %":"Escalation %"}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"سنوات النمو Ramp":"Ramp Years"}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"نسبة الإشغال Occ %":"Occupancy %"} error={a.stabilizedOcc>100?(ar?"الحد الأقصى 100%":"Max 100%"):a.stabilizedOcc<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 4: Construction & Cost ── */}
            <FieldGroup icon="🏗️" title={ar?"البناء والتكاليف":"Construction & Cost"}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F2 label={ar?"تكلفة/م² Cost/sqm":"Cost/m²"} error={a.costPerSqm<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
              <F2 label={ar?"مدة البناء (شهر)":"Build duration (months)"} error={a.constrDuration<1?(ar?"يجب شهر واحد على الأقل":"Must be at least 1 month"):a.constrDuration>120?(ar?"الحد الأقصى 120 شهر":"Max 120 months"):null}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-sm)",background:"var(--surface-page)"}} /></F2>
            </div>
            {(isH||isM)&&<button onClick={()=>setModal({type:isH?"hotel":"marina",idx:i})} style={{...btnPrim,padding:"8px 16px",fontSize:12,marginTop:8}}>{isH?(ar?"⚙ حساب أرباح الفندق":"⚙ Hotel P&L"):(ar?"⚙ حساب أرباح المارينا":"⚙ Marina P&L")}</button>}
            </FieldGroup>
            <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-md)",padding:12,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:8,fontSize:12}}>
              <div><span style={{color:"var(--text-secondary)"}}>{ar?"التكاليف:":"CAPEX:"}</span> <strong style={{color:"var(--color-danger)"}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</strong></div>
              <div><span style={{color:"var(--text-secondary)"}}>{ar?"الإيرادات:":"Income:"}</span> <strong style={{color:"var(--color-success-text)"}}>{fmt(comp?.totalRevenue||0)}</strong></div>
              {(()=>{
                const sc = getAssetScore(a, comp);
                const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",t:ar?"مقبول":"Marginal"}, weak:{bg:"var(--color-danger-bg)",color:"var(--color-danger-text)",t:ar?"ضعيف":"Weak"}, none:{bg:"var(--surface-sidebar)",color:"var(--text-tertiary)",t:"—"} }[sc.viable];
                const wPct = (sc.capexWeight * 100).toFixed(0);
                const impLabel = sc.impact==="high"?(ar?"أثر كبير":"High impact"):sc.impact==="med"?(ar?"أثر متوسط":"Med impact"):(ar?"أثر محدود":"Low impact");
                return <div><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:vCfg.bg,color:vCfg.color,fontWeight:600}}>{vCfg.t}</span> <span style={{fontSize:9,color:"var(--text-secondary)"}}>{impLabel} ({wPct}%)</span></div>;
              })()}
            </div>
          </div>
        </div></>;})()}
      </div>)}
      {/* TABLE VIEW */}
      {viewMode === "table" && (<>
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead>
              <tr>
                {visibleCols.map(c=>(
                  <th key={c.key} style={{...thSt,whiteSpace:"nowrap",minWidth:c.w, ...(c.key==="totalCapex"?{background:"#eef2ff"}:c.key==="totalInc"?{background:"#ecfdf5"}:c.key==="score"?{background:"var(--color-warning-bg)"}:{})}}>
                    <div>{c.en}</div>
                    {c.ar!==c.en&&<div style={{fontWeight:400,fontSize:9,color:"var(--text-tertiary)"}}>{c.ar}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length===0?(
                <tr><td colSpan={visibleCols.length} style={{...tdSt,textAlign:"center",color:"var(--text-secondary)",padding:"40px 20px"}}>
                  <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>🏗</div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{lang==="ar"?"لا توجد أصول":"No assets yet"}</div>
                  <div style={{fontSize:11,color:"var(--text-tertiary)"}}>{lang==="ar"?"اضغط '+ إضافة أصل' للبدء":"Click '+ Add Asset' to start"}</div>
                </td></tr>
              ):(
                filteredIndices.map(i=>{
                  const a = assets[i];
                  const comp = results?.assetSchedules?.[i];
                  const isOp = a.revType === "Operating";
                  const isHotel = isOp && (a.category === "Hospitality");
                  const isMarina = isOp && (a.category === "Marina");
                  const bg = i%2===0?"#fff":"var(--surface-page)";
                  const hd = (key) => hiddenCols.has(key) ? {display:"none"} : {};
                  return (
                    <tr key={a.id||i} style={{background:bg}}>
                      <td style={{...tdSt,color:"var(--text-tertiary)",fontWeight:500,width:30,...hd("#")}}>{i+1}</td>
                      <td style={{...tdSt,...hd("phase")}}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></td>
                      <td style={{...tdSt,...hd("category")}}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></td>
                      <td style={{...tdSt,...hd("name")}}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"الاسم":"Name"} /></td>
                      <td style={{...tdSt,...hd("code")}}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{width:45}} /></td>
                      <td style={{...tdSt,...hd("plotArea")}}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} /></td>
                      <td style={{...tdSt,...hd("footprint")}}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} /></td>
                      <td style={{...tdSt,...hd("gfa")}}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} /></td>
                      <td style={{...tdSt,...hd("revType")}}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></td>
                      <td style={{...tdSt,...hd("eff")}}>{(()=>{const bc=benchmarkColor("efficiency",a.efficiency,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip}%`:undefined}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,color:"var(--text-secondary)",textAlign:"right",fontSize:11,...hd("leasable")}}>{fmt(comp?.leasableArea||(a.gfa||0)*(a.efficiency||0)/100)}</td>
                      <td style={{...tdSt,background:isOp?"#f5f5f5":undefined,...hd("rate")}}>{(()=>{const bc=benchmarkColor("leaseRate",a.leaseRate,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{opacity:isOp?0.3:1,...(bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:{})}} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("opEbitda")}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          {isOp ? (
                            <>
                              <span style={{fontSize:10,color:"var(--text-secondary)",minWidth:55,textAlign:"right"}}>{fmtM(a.opEbitda||0)}</span>
                              {(isHotel||isMarina) && <button onClick={()=>setModal({type:isHotel?"hotel":"marina",idx:i})} style={{...btnSm,background:"#eef2ff",color:"var(--zan-teal-500)",fontSize:9,padding:"2px 6px",whiteSpace:"nowrap"}}>{isHotel?"P&L":"P&L"}</button>}
                            </>
                          ) : (
                            <EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} />
                          )}
                        </div>
                      </td>
                      <td style={{...tdSt,...hd("esc")}}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} /></td>
                      <td style={{...tdSt,...hd("ramp")}}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} /></td>
                      <td style={{...tdSt,...hd("occ")}}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} /></td>
                      <td style={{...tdSt,...hd("cost")}}>{(()=>{const bc=benchmarkColor("costPerSqm",a.costPerSqm,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("dur")}}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} /></td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,background:"#f5f7ff",fontSize:11,...hd("totalCapex")}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,color:"var(--color-success-text)",background:"var(--color-success-bg)",fontSize:11,...hd("totalInc")}}>{fmt(comp?.totalRevenue||0)}</td>
                      <td style={{...tdSt,background:"#fffdf5",overflow:"visible",position:"relative",...hd("score")}}>{(()=>{
                        const sc = getAssetScore(a, comp);
                        return <ScoreCell sc={sc} name={a.name} ar={ar} />;
                      })()}</td>
                      <td style={{...tdSt,...hd("ops")}}><div style={{display:"flex",gap:3}}><button onClick={(e)=>{e.stopPropagation();dupAsset(i);}} style={{...btnSm,background:"var(--color-info-bg)",color:"var(--zan-teal-500)",fontSize:10}} title={ar?"تكرار":"Dup"}>📋</button><button onClick={()=>rmAsset(i)} style={{...btnSm,background:"var(--color-danger-bg)",color:"var(--color-danger)",fontSize:10}}>✕</button></div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* ═══ ASSET CASH FLOW TABLE ═══ */}
      {results?.assetSchedules?.length > 0 && (() => {
        const h = results.horizon;
        const sy = results.startYear;
        const yrs = Array.from({length: Math.min(cfYrs, h)}, (_, i) => i);
        const phaseRes = results.phaseResults || {};
        // Compute per-asset land rent (proportional by footprint within phase)
        const getAssetLandRent = (idx) => {
          const a = results.assetSchedules[idx];
          const pName = a.phase || "Phase 1";
          const pr = phaseRes[pName];
          if (!pr || !pr.landRent) return new Array(h).fill(0);
          const pFP = pr.footprint || 1;
          const aFP = a.footprint || 0;
          const ratio = pFP > 0 ? aFP / pFP : 0;
          return pr.landRent.map(v => v * ratio);
        };
        // Aggregate for filtered assets
        const aggRev = new Array(h).fill(0), aggCap = new Array(h).fill(0), aggLR = new Array(h).fill(0);
        filteredIndices.forEach(i => {
          const a = results.assetSchedules[i];
          const lr = getAssetLandRent(i);
          if (a) for (let y = 0; y < h; y++) {
            aggRev[y] += a.revenueSchedule[y] || 0;
            aggCap[y] += a.capexSchedule[y] || 0;
            aggLR[y] += lr[y] || 0;
          }
        });
        // Add land purchase CAPEX allocation (project-level, not in assetSchedules)
        const _landPurchase = project.landType === "purchase" ? (project.landPurchasePrice || 0) : 0;
        if (_landPurchase > 0) {
          const _allScheds = results.assetSchedules || [];
          const _totalFP = _allScheds.reduce((s, a) => s + (a.footprint || 0), 0);
          const _filtFP = filteredIndices.reduce((s, i) => s + (_allScheds[i]?.footprint || 0), 0);
          const _alloc = _totalFP > 0 ? _filtFP / _totalFP : 1;
          aggCap[0] += _landPurchase * _alloc;
        }
        const toggleAllCF = () => {
          const next = !cfAllOpen;
          setCfAllOpen(next);
          const obj = {};
          filteredIndices.forEach(i => { obj[i] = next; });
          setCfOpen(obj);
        };
        const tdS = {padding:"3px 6px",fontSize:10,textAlign:"right",borderBottom:"0.5px solid var(--surface-separator)",whiteSpace:"nowrap"};
        const hdS = {padding:"3px 6px",fontSize:9,fontWeight:600,color:"var(--text-secondary)",textAlign:"right",borderBottom:"0.5px solid var(--border-default)",whiteSpace:"nowrap",position:"sticky",top:0,background:"var(--surface-page)",zIndex:1};
        const lblS = {padding:"3px 8px",fontSize:10,fontWeight:500,textAlign:"left",borderBottom:"0.5px solid var(--surface-separator)",whiteSpace:"nowrap",position:"sticky",left:0,background:"var(--surface-card)",zIndex:1};
        const renderCFRows = (rev, cap, lr, label, color) => {
          const netInc = rev.map((v, y) => v - (lr[y]||0));
          const netCF = rev.map((v, y) => v - (lr[y]||0) - (cap[y]||0));
          let cum = 0;
          const cumCF = netCF.map(v => { cum += v; return cum; });
          const rows = [
            {l: ar?"إيرادات":"Revenue", d: rev, c:"var(--color-success-text)", show:true},
            {l: ar?"(-) إيجار أرض":"(-) Land Rent", d: lr, c:"var(--color-warning)", neg:true, show:true},
            {l: ar?"(-) تكاليف تطوير":"(-) CAPEX", d: cap, c:"var(--color-danger)", neg:true, show:true},
            {l: ar?"= صافي التدفق":"= Net CF", d: netCF, c:"var(--text-primary)", bold:true, show:true},
            {l: ar?"صافي دخل":"Net Income", d: netInc, c:"var(--zan-teal-500)", show:cfDetail},
            {l: ar?"تراكمي":"Cumulative", d: cumCF, c:"#8b5cf6", show:cfDetail},
          ];
          return rows.filter(r => r.show).map((r, ri) => (
            <tr key={ri} style={r.bold?{background:"var(--surface-page)"}:undefined}>
              <td style={{...lblS,color:r.c,fontWeight:r.bold?700:500,fontSize:r.bold?11:10}}>{r.l}</td>
              {yrs.map(y => {
                const v = r.d[y]||0;
                return <td key={y} style={{...tdS,color:v<0?"var(--color-danger)":v>0?r.c:"#d0d4dc",fontWeight:r.bold?600:400}}>{v===0?"—":r.neg?fmt(-v):fmt(v)}</td>;
              })}
            </tr>
          ));
        };
        return (
          <div style={{marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{ar?"التدفق النقدي للأصول":"Asset Cash Flows"}</span>
              <button onClick={toggleAllCF} style={{fontSize:9,padding:"3px 10px",borderRadius:5,border:"0.5px solid var(--border-default)",background:cfAllOpen?"#eff6ff":"var(--surface-page)",color:cfAllOpen?"var(--zan-teal-500)":"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {cfAllOpen?(ar?"طي الكل":"Collapse All"):(ar?"توسيع الكل":"Expand All")}
              </button>
              <button onClick={()=>setCfDetail(!cfDetail)} style={{fontSize:9,padding:"3px 10px",borderRadius:5,border:"0.5px solid var(--border-default)",background:cfDetail?"#fef9c3":"var(--surface-page)",color:cfDetail?"#92400e":"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {cfDetail?(ar?"إخفاء التفاصيل":"Hide Details"):(ar?"عرض التفاصيل":"Show Details")}
              </button>
              <div style={{flex:1}}/>
              <select value={cfYrs} onChange={e=>setCfYrs(+e.target.value)} style={{fontSize:9,padding:"2px 6px",borderRadius:4,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit"}}>
                {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
              </select>
            </div>

            {filteredIndices.map(i => {
              const a = results.assetSchedules[i];
              if (!a) return null;
              const asset = assets[i];
              const lr = getAssetLandRent(i);
              const isOpen = cfOpen[i] || false;
              const totalRev = a.revenueSchedule.reduce((s,v)=>s+v,0);
              const totalCap = a.totalCapex||0;
              return (
                <div key={i} style={{marginBottom:6,border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-md)",overflow:"hidden",background:"var(--surface-card)"}}>
                  <div onClick={()=>setCfOpen(p=>({...p,[i]:!p[i]}))} style={{padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:isOpen?"#f0f4ff":"var(--surface-page)",userSelect:"none"}}>
                    <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{isOpen?"▼":"▶"}</span>
                    <span style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",flex:1}}>{asset?.name||`Asset ${i+1}`}</span>
                    <span style={{fontSize:9,color:"var(--text-secondary)",background:"var(--border-default)",borderRadius:"var(--radius-md)",padding:"1px 6px"}}>{asset?.phase}</span>
                    <span style={{fontSize:10,color:"var(--color-success-text)"}}>{fmtM(totalRev)}</span>
                    <span style={{fontSize:10,color:"var(--color-danger)"}}>{fmtM(totalCap)}</span>
                  </div>
                  {isOpen && (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr>
                          <th style={{...hdS,textAlign:"left",minWidth:80}}>{ar?"البند":"Item"}</th>
                          {yrs.map(y=><th key={y} style={hdS}>{sy+y}</th>)}
                        </tr></thead>
                        <tbody>{renderCFRows(a.revenueSchedule, a.capexSchedule, lr, asset?.name, "var(--text-primary)")}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Aggregated Totals ── */}
            <div style={{marginTop:8,border:"2px solid #2563eb",borderRadius:"var(--radius-md)",overflow:"hidden",background:"var(--surface-card)"}}>
              <div style={{padding:"6px 12px",background:"var(--color-info-bg)",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:"var(--zan-navy-700)"}}>{ar?`إجمالي (${filteredIndices.length} أصل)`:`Total (${filteredIndices.length} assets)`}</span>
                <div style={{flex:1}}/>
                <span style={{fontSize:10,color:"var(--color-success-text)",fontWeight:600}}>{fmtM(aggRev.reduce((s,v)=>s+v,0))}</span>
                <span style={{fontSize:10,color:"var(--color-danger)",fontWeight:600}}>{fmtM(aggCap.reduce((s,v)=>s+v,0))}</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={{...hdS,textAlign:"left",minWidth:80}}>{ar?"البند":"Item"}</th>
                    {yrs.map(y=><th key={y} style={hdS}>{sy+y}</th>)}
                  </tr></thead>
                  <tbody>{renderCFRows(aggRev, aggCap, aggLR, "Total", "var(--zan-navy-700)")}</tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hotel P&L Modal */}
      {modal?.type==="hotel"&&<HotelPLModal
        data={assets[modal.idx]?.hotelPL}
        onSave={(h,ebitda)=>upAsset(modal.idx,{hotelPL:h,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t} lang={lang}
      />}
      {modal?.type==="marina"&&<MarinaPLModal
        data={assets[modal.idx]?.marinaPL}
        onSave={(m,ebitda)=>upAsset(modal.idx,{marinaPL:m,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t} lang={lang}
      />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function ProjectDash({ project, results, checks, t, financing, phaseFinancings, onGoToAssets, lang, incentivesResult, setActiveTab }) {
  if (!project || !results) return null;
  const isMobile = useIsMobile();
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const rawC = results.consolidated;
  const cur = project.currency || "SAR";
  const allPhases = Object.entries(results.phaseResults);
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const failedChecks = checks.filter(ch => !ch.pass).length;

  // ── Filtered consolidated: aggregate selected phases only ──
  const c = useMemo(() => {
    if (!isFiltered) return rawC;
    const hLen = results.horizon;
    const income = new Array(hLen).fill(0), capex = new Array(hLen).fill(0), landRent = new Array(hLen).fill(0), netCF = new Array(hLen).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < hLen; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    const totalCapex = capex.reduce((a,b)=>a+b,0);
    const totalIncome = income.reduce((a,b)=>a+b,0);
    const totalLandRent = landRent.reduce((a,b)=>a+b,0);
    const totalNetCF = netCF.reduce((a,b)=>a+b,0);
    let pbCum = 0, pbYr = null, pbNeg = false, peakNeg = 0, peakNegY = null;
    for (let y = 0; y < hLen; y++) { pbCum += netCF[y]; if (pbCum < -1) pbNeg = true; if (pbNeg && pbCum >= 0 && pbYr === null) pbYr = y + 1; if (pbCum < peakNeg) { peakNeg = pbCum; peakNegY = y; } }
    return { ...rawC, income, capex, landRent, netCF, totalCapex, totalIncome, totalLandRent, totalNetCF,
      irr: calcIRR(netCF),
      npv10: calcNPV(netCF, 0.10),
      npv12: calcNPV(netCF, 0.12),
      npv14: calcNPV(netCF, 0.14),
      paybackYear: pbYr, peakNegative: peakNeg, peakNegativeYear: peakNegY,
    };
  }, [isFiltered, selectedPhases, results, rawC]);

  // ── Filtered financing: aggregate selected phase financings ──
  const f = useMemo(() => {
    if (!isFiltered || !phaseFinancings) return financing;
    const pfs = activePh.map(p => phaseFinancings[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const totalDebt = pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0);
    const totalEquity = pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0);
    const totalInterest = pfs.reduce((s,pf) => s + (pf.totalInterest||0), 0);
    const devCostExclLand = pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0);
    const devCostInclLand = pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0);
    const totalProjectCost = pfs.reduce((s,pf) => s + (pf.totalProjectCost||pf.devCostInclLand||0), 0);
    const landCapValue = pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0);
    const capitalizedFinCosts = pfs.reduce((s,pf) => s + (pf.capitalizedFinCosts||0), 0);
    const h = results.horizon;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.leveredCF) for (let y=0;y<h;y++) leveredCF[y] += pf.leveredCF[y]||0; });
    const gpEquity = pfs.reduce((s,pf) => s + (pf.gpEquity||0), 0);
    const lpEquity = pfs.reduce((s,pf) => s + (pf.lpEquity||0), 0);
    const exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.exitProceeds) for (let y=0;y<h;y++) exitProceeds[y] += pf.exitProceeds[y]||0; });
    return { ...financing, totalDebt, totalEquity, totalInterest, devCostExclLand, devCostInclLand, totalProjectCost, landCapValue, capitalizedFinCosts, leveredCF, gpEquity, lpEquity, exitProceeds,
      leveredIRR: calcIRR(leveredCF),
      interestSubsidyTotal: pfs.reduce((s,pf) => s + (pf.interestSubsidyTotal||0), 0),
    };
  }, [isFiltered, selectedPhases, financing, phaseFinancings, results]);

  const h = results.horizon;
  const ar = lang === "ar";
  const hasAssets = (project.assets||[]).length > 0;
  const ir = incentivesResult;

  const hasIncentives = (ir && ir.totalIncentiveValue > 0) || (ir && ir.finSupportEstimate) || (f && f.interestSubsidyTotal > 0);
  const displayIRR = (ir && ir.totalIncentiveValue > 0 && ir.adjustedIRR !== null && !isFiltered) ? ir.adjustedIRR : c.irr;
  const displayNPV10 = (ir && ir.totalIncentiveValue > 0 && !isFiltered) ? ir.adjustedNPV10 : c.npv10;
  const displayTotalNetCF = (ir && ir.totalIncentiveValue > 0 && !isFiltered) ? ir.adjustedTotalNetCF : c.totalNetCF;

  let cumCF = 0, paybackYr = null, _pbNeg = false;
  for (let y = 0; y < h; y++) { cumCF += c.netCF[y]; if (cumCF < -1) _pbNeg = true; if (cumCF > 0 && _pbNeg && paybackYr === null) paybackYr = y + 1; }
  const stabYear = Math.min(10, h - 1);
  const cashYield = f && f.totalEquity > 0 ? (c.income[stabYear] / f.totalEquity * 100) : null;

  // ── Getting Started Guide (no assets) ──
  if (!hasAssets) {
    return (<div>
      <div style={{background:"linear-gradient(135deg, #0f766e08, #1e40af12)",borderRadius:"var(--radius-2xl)",border:"1px solid #2563eb20",padding:"32px 28px",textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:12}}>🚀</div>
        <div style={{fontSize:20,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>{ar?"مشروعك جاهز. هذه هي الخطوة التالية":"Your Project is Ready! Next Step"}</div>
        <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:24,maxWidth:480,margin:"0 auto 24px"}}>{ar?"أضف أصول مشروعك (محلات، فنادق، مكاتب، سكني...) عشان تبدأ تشوف الأرقام والتحليلات":"Add your project assets (retail, hotels, offices, residential...) to start seeing numbers and analytics"}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGoToAssets} style={{...btnPrim,padding:"12px 28px",fontSize:14,borderRadius:"var(--radius-lg)",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>➕</span> {ar?"أضف أصل الآن":"Add Asset Now"}
          </button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:14}}>
        {[
          {icon:"1️⃣",title:ar?"أضف الأصول":"Add Assets",desc:ar?"عرّف كل أصل: نوعه، مساحته، تكلفته، إيراداته":"Define each asset: type, area, cost, revenue",done:false},
          {icon:"2️⃣",title:ar?"راجع الأرقام":"Review Numbers",desc:ar?"شوف التدفقات النقدية، IRR، NPV في لوحة التحكم":"Check cash flows, IRR, NPV in the dashboard",done:false},
          {icon:"3️⃣",title:ar?"اضبط التمويل":"Configure Financing",desc:ar?"عدّل شروط الدين والتمويل من الشريط الجانبي":"Adjust debt terms and financing from sidebar",done:project.finMode!=="self"},
          {icon:"4️⃣",title:ar?"صدّر التقارير":"Export Reports",desc:ar?"حمّل تقارير البنك والمستثمرين بصيغة PDF أو Excel":"Download bank and investor reports as PDF or Excel",done:false},
        ].map((s,i)=>(
          <div key={i} style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px",opacity:s.done?0.7:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:s.done?"var(--color-success-text)":"var(--text-primary)"}}>{s.title}{s.done?" ✓":""}</span>
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.5}}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>);
  }

  // ── Health score ──
  const irrVal = displayIRR || 0;
  const health = irrVal > 0.15 ? 'strong' : irrVal > 0.10 ? 'good' : irrVal > 0.05 ? 'moderate' : 'weak';
  const healthColor = {strong:'#16a34a',good:'#22c55e',moderate:'#f59e0b',weak:'#ef4444'}[health];
  const healthLabel = {strong:ar?'قوي':'Strong',good:ar?'جيد':'Good',moderate:ar?'متوسط':'Moderate',weak:ar?'ضعيف':'Weak'}[health];

  // ── Sources & Uses (read from financing object — single source of truth) ──
  const totalDebt = f ? f.totalDebt || 0 : 0;
  const totalEquity = f ? f.totalEquity || 0 : 0;
  const landCap = f ? f.landCapValue || 0 : 0;
  const grantTotal = ir ? ir.capexGrantTotal || 0 : 0;
  // devCostExclLand = construction CAPEX (includes land purchase for purchase type)
  // devCostInclLand = devCostExclLand + landCapValue (the real "total uses" base)
  // totalProjectCost = devCostInclLand + capitalizedFinCosts (when IDC is capitalized)
  const devCostExcl = f ? f.devCostExclLand || c.totalCapex : c.totalCapex;
  const devCostIncl = f ? (f.totalProjectCost || f.devCostInclLand || c.totalCapex) : c.totalCapex;

  // ── Cash flow chart data (SVG bars) ──
  const chartYears = Math.min(20, h);
  const maxVal = Math.max(...c.income.slice(0, chartYears), ...c.capex.slice(0, chartYears), 1);
  const minCF = Math.min(...c.netCF.slice(0, chartYears), 0);
  const maxCF = Math.max(...c.netCF.slice(0, chartYears), 1);
  const cfRange = Math.max(maxCF, Math.abs(minCF), 1);

  return (<div>
    {/* ═══ Progress Tracker (shows until user completes key steps) ═══ */}
    {(() => {
      const steps = [
        { id:"assets", labelAr:"إضافة أصول", labelEn:"Add Assets", done: (project.assets||[]).length > 0, tab:"assets" },
        { id:"review", labelAr:"مراجعة التدفقات", labelEn:"Review Cash Flows", done: (project.assets||[]).length >= 2 && c.totalCapex > 0, tab:"cashflow" },
        { id:"financing", labelAr:"إعداد التمويل", labelEn:"Setup Financing", done: project.finMode !== "self" || (f && f.totalDebt > 0), tab:"financing" },
        { id:"export", labelAr:"تصدير التقارير", labelEn:"Export Reports", done: false, tab:"reports" },
      ];
      const doneCount = steps.filter(s => s.done).length;
      if (doneCount >= 3) return null;
      return (
        <div style={{background:"rgba(46,196,182,0.04)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:"var(--radius-xl)",padding:"14px 20px",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:600,color:"var(--zan-teal-700)"}}>{ar?`${doneCount}/4 خطوات مكتملة`:`${doneCount}/4 steps complete`}</span>
            <div style={{flex:1,height:4,background:"rgba(0,0,0,0.06)",borderRadius:2}}>
              <div style={{width:`${(doneCount/4)*100}%`,height:"100%",background:"linear-gradient(90deg,#0f766e,#2EC4B6)",borderRadius:2,transition:"width 0.4s ease"}} />
            </div>
          </div>
          <div style={{display:"flex",gap:isMobile?8:10,flexWrap:"wrap"}}>
            {steps.map((step,i) => (
              <button key={step.id} onClick={()=>setActiveTab(step.tab)} style={{flex:1,minWidth:isMobile?120:140,padding:"10px 12px",background:step.done?"rgba(16,185,129,0.06)":"#fff",border:`1px solid ${step.done?"rgba(16,185,129,0.25)":"var(--border-default)"}`,borderRadius:"var(--radius-md)",cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}}
                onMouseEnter={e=>{if(!step.done){e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.background="rgba(46,196,182,0.04)";}}}
                onMouseLeave={e=>{if(!step.done){e.currentTarget.style.borderColor="var(--border-default)";e.currentTarget.style.background="#fff";}}}>
                <div style={{fontSize:16,marginBottom:4}}>{step.done?"✅":`${i+1}`}</div>
                <div style={{fontSize:11,fontWeight:step.done?600:500,color:step.done?"var(--color-success-text)":"#4b5060"}}>{ar?step.labelAr:step.labelEn}</div>
              </button>
            ))}
          </div>
        </div>
      );
    })()}
    {/* ═══ PHASE FILTER (multi-select) ═══ */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${phaseNames.length} مراحل`:`Showing ${activePh.length} of ${phaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* ═══ SECTION 1: Decision Summary ═══ */}
    <div style={{background:`linear-gradient(135deg, ${healthColor}08, ${healthColor}18)`,borderRadius:14,border:`2px solid ${healthColor}30`,padding:isMobile?"16px 14px":"22px 26px",marginBottom:20,display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?14:20,flexWrap:"wrap"}}>
      {/* Health badge */}
      <div style={{textAlign:"center",minWidth:90}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${healthColor}18`,border:`3px solid ${healthColor}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}>
          <span style={{fontSize:26,fontWeight:800,color:healthColor}}>{irrVal > 0 ? (irrVal*100).toFixed(0)+"%" : "—"}</span>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:healthColor,textTransform:"uppercase",letterSpacing:0.6}}>{healthLabel}</div>
        <div style={{fontSize:9,color:"var(--text-secondary)"}}>IRR (Unlevered)</div>
      </div>
      {/* Key numbers */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:12}}>
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"صافي القيمة الحالية":"NPV @10%"}</div>
          <div style={{fontSize:20,fontWeight:800,color:displayNPV10>0?"var(--color-success-text)":"var(--color-danger)"}}>{fmtM(displayNPV10)}</div>
          <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{cur}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"إجمالي التكاليف":"Total CAPEX"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>{fmtM(hasIncentives&&!isFiltered?(c.totalCapex-grantTotal):c.totalCapex)}</div>
          <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{cur}{hasIncentives&&!isFiltered?` (${ar?"بعد المنحة":"net of grant"})`:""}</div>
        </div>
        {f && f.mode !== "self" && <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"IRR بعد التمويل":"Levered IRR"}</div>
          <div style={{fontSize:20,fontWeight:800,color:getMetricColor("IRR",f.leveredIRR)}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(1)+"%":"N/A"}</div>
        </div>}
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"فترة الاسترداد":"Payback"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"var(--color-warning)"}}>{paybackYr ? (ar?`${paybackYr} سنة`:`Yr ${paybackYr}`) : "N/A"}</div>
          {paybackYr && <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{results.startYear + paybackYr - 1}</div>}
        </div>
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"الفحوصات":"Checks"}</div>
          <div style={{fontSize:20,fontWeight:800,color:failedChecks===0?"var(--color-success-text)":"var(--color-danger)"}}>{failedChecks===0?(ar?"✓ سليم":"✓ Pass"):`${failedChecks} ✗`}</div>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 1.5: Financial Metrics Help ═══ */}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ايش معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ SECTION 2: Sources & Uses + Key Metrics ═══ */}
    <div style={{display:"grid",gridTemplateColumns:f&&f.mode!=="self"?(isMobile?"1fr":"1fr 1fr"):"1fr",gap:14,marginBottom:20}}>
      {/* Sources & Uses */}
      {f && f.mode !== "self" && (
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15}}>💰</span> {ar?"مصادر واستخدامات التمويل":"Sources & Uses"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Sources */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--color-success-text)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                {totalDebt > 0 && [<span key="dl" style={{color:"var(--text-secondary)"}}>{ar?"قرض بنكي":"Bank Debt"}</span>,<span key="dv" style={{textAlign:"right",fontWeight:500}}>{fmtM(totalDebt)}</span>]}
                <span style={{color:"var(--text-secondary)"}}>{ar?"حقوق ملكية":"Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(totalEquity)}</span>
                <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(totalDebt + totalEquity)}</span>
                {grantTotal > 0 && !isFiltered && [<span key="gl" style={{color:"var(--color-success-text)",fontSize:10,fontStyle:"italic"}}>{ar?"* تم خصم منحة حكومية":"* CAPEX grant deducted"}: {fmtM(grantTotal)}</span>]}
              </div>
              {/* LTV bar */}
              {totalDebt > 0 && (() => {
                const ltv = (totalDebt / (totalDebt + totalEquity) * 100);
                return <div style={{marginTop:10}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3}}>LTV: {ltv.toFixed(0)}%</div>
                  <div style={{height:6,borderRadius:3,background:"var(--surface-sidebar)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ltv}%`,background:getMetricColor("LTV",ltv),borderRadius:3}} />
                  </div>
                </div>;
              })()}
            </div>
            {/* Uses */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--color-danger)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fee2e2"}}>{ar?"الاستخدامات":"USES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                <span style={{color:"var(--text-secondary)"}}>{ar?"تكاليف البناء":"Construction"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(devCostExcl)}</span>
                {landCap > 0 && [<span key="cl" style={{color:"var(--text-secondary)"}}>{ar?"رسملة الأرض":"Land Cap."}</span>,<span key="cv" style={{textAlign:"right",fontWeight:500}}>{fmtM(landCap)}</span>]}
                {f && f.capitalizedFinCosts > 0 && [<span key="il" style={{color:"var(--text-secondary)"}}>{ar?"تكاليف تمويل مرسملة":"Capitalized IDC"}</span>,<span key="iv" style={{textAlign:"right",fontWeight:500}}>{fmtM(f.capitalizedFinCosts)}</span>]}
                <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"0.5px solid var(--border-default)",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(devCostIncl)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 20px"}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:15}}>📊</span> {ar?"المؤشرات الرئيسية":"Key Metrics"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:10}}>
          <div style={{background:"var(--color-success-bg)",borderRadius:"var(--radius-md)",padding:"10px 12px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"إجمالي الإيرادات":"Total Income"} ({h}{ar?" سنة":"yr"})</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--color-success-text)"}}>{fmtM(c.totalIncome)}</div>
          </div>
          <div style={{background:displayTotalNetCF>=0?"#f0fdf4":"var(--color-danger-bg)",borderRadius:"var(--radius-md)",padding:"10px 12px",border:`1px solid ${displayTotalNetCF>=0?"#dcfce7":"#fee2e2"}`}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"صافي التدفق":"Net CF"}{hasIncentives&&!isFiltered?` (${ar?"+حوافز":"+inc."})`:""}</div>
            <div style={{fontSize:16,fontWeight:700,color:displayTotalNetCF>=0?"var(--color-success-text)":"var(--color-danger)"}}>{fmtM(displayTotalNetCF)}</div>
          </div>
          {f && f.mode !== "self" && <>
            <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",padding:"10px 12px",border:"1px solid #fef3c7"}}>
              <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"إجمالي الدين":"Total Debt"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--color-warning)"}}>{fmtM(totalDebt)}</div>
            </div>
            <div style={{background:"#f5f3ff",borderRadius:"var(--radius-md)",padding:"10px 12px",border:"1px solid #ede9fe"}}>
              <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"إجمالي الفوائد":"Total Interest"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#8b5cf6"}}>{fmtM(f.totalInterest)}</div>
            </div>
          </>}
          {cashYield !== null && <div style={{background:"var(--color-info-bg)",borderRadius:"var(--radius-md)",padding:"10px 12px",border:"1px solid #dbeafe"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"العائد النقدي":"Cash Yield"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-500)"}}>{fmtPct(cashYield)}</div>
          </div>}
          {hasIncentives && !isFiltered && ir && <div style={{background:"var(--color-success-bg)",borderRadius:"var(--radius-md)",padding:"10px 12px",border:"1px solid #bbf7d0"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"قيمة الحوافز":"Incentive Value"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--color-success-text)"}}>{fmtM(ir.totalIncentiveValue + (f?.interestSubsidyTotal||0))}</div>
          </div>}
        </div>
        {/* Land info compact */}
        <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #f0f1f5",display:"flex",gap:16,fontSize:11,color:"var(--text-secondary)",flexWrap:"wrap"}}>
          <span>{ar?"الأرض":"Land"}: <strong>{({lease:ar?"إيجار":"Lease",purchase:ar?"شراء":"Purchase",partner:ar?"شراكة":"Partner",bot:"BOT"})[project.landType]||project.landType}</strong></span>
          <span>{ar?"المساحة":"Area"}: <strong>{fmt(project.landArea)} m²</strong></span>
          {project.landType==="lease"&&<span>{ar?"إيجار سنوي":"Annual"}: <strong>{fmt(project.landRentAnnual)} {cur}</strong></span>}
          {project.landType==="purchase"&&<span>{ar?"السعر":"Price"}: <strong>{fmt(project.landPurchasePrice)} {cur}</strong></span>}
          {project.landType==="lease"&&<span>{ar?"إجمالي الإيجار":"Total Rent"}: <strong style={{color:"var(--color-danger)"}}>{fmt(c.totalLandRent)} {cur}</strong></span>}
          <span>{ar?"الأصول":"Assets"}: <strong>{project.assets.length}</strong></span>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 3: Cash Flow Chart (SVG) ═══ */}
    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 20px",marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>📈</span> {ar?"التدفق النقدي السنوي":"Annual Cash Flow"}
        <span style={{fontSize:10,color:"var(--text-tertiary)",marginInlineStart:"auto"}}>{ar?`أول ${chartYears} سنة`:`First ${chartYears} years`}</span>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:16,marginBottom:10,fontSize:11}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--color-danger)",display:"inline-block"}} />{ar?"التكاليف":"CAPEX"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#22c55e",display:"inline-block"}} />{ar?"الإيرادات":"Revenue"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:3,borderRadius:2,background:"var(--color-info)",display:"inline-block"}} />{ar?"صافي التدفق":"Net CF"}</span>
      </div>
      <svg viewBox={`0 0 ${chartYears * 42 + 20} 180`} style={{width:"100%",height:180}}>
        {/* Grid lines */}
        <line x1="20" y1="90" x2={chartYears*42+20} y2="90" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="20" y1="10" x2={chartYears*42+20} y2="10" stroke="var(--surface-sidebar)" strokeWidth="0.5" />
        <line x1="20" y1="170" x2={chartYears*42+20} y2="170" stroke="var(--surface-sidebar)" strokeWidth="0.5" />
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42;
          const capH = maxVal > 0 ? (c.capex[y] / maxVal) * 75 : 0;
          const incH = maxVal > 0 ? (c.income[y] / maxVal) * 75 : 0;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <g key={y}>
            {/* CAPEX bar (red, going down from center) */}
            {c.capex[y] > 0 && <rect x={x} y={90} width={16} height={capH} fill="#ef444440" rx="2" stroke="var(--color-danger)" strokeWidth="0.5" />}
            {/* Income bar (green, going up from center) */}
            {c.income[y] > 0 && <rect x={x+18} y={90-incH} width={16} height={incH} fill="#22c55e40" rx="2" stroke="#22c55e" strokeWidth="0.5" />}
            {/* Year label */}
            {y % (chartYears > 15 ? 3 : 2) === 0 && <text x={x+17} y={178} fontSize="8" fill="var(--text-tertiary)" textAnchor="middle">{y+1}</text>}
          </g>;
        })}
        {/* Net CF line */}
        <polyline
          fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinejoin="round"
          points={Array.from({length:chartYears}).map((_,y) => {
            const x = 20 + y * 42 + 17;
            const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
            return `${x},${cfY}`;
          }).join(' ')}
        />
        {/* Net CF dots */}
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42 + 17;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <circle key={y} cx={x} cy={cfY} r="2.5" fill="var(--color-info)" />;
        })}
      </svg>
    </div>

    {/* ═══ SECTION 4: Phase Summary ═══ */}
    {allPhases.length>0&&<div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏗</span> {t.phaseSummary}
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["المرحلة","الأصول","إجمالي التكاليف","إجمالي الإيرادات","إيجار الأرض","صافي التدفق","IRR","نسبة الأرض"]:["Phase","Assets","Total CAPEX","Total Income","Land Rent","Net CF","IRR","Land %"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {allPhases.map(([n,pr])=>{
          const capexPct = rawC.totalCapex > 0 ? pr.totalCapex / rawC.totalCapex * 100 : 0;
          const isHighlighted = isFiltered && activePh.includes(n);
          const isDimmed = isFiltered && !activePh.includes(n);
          return <tr key={n} style={{background:isHighlighted?"#f0fdf4":undefined,opacity:isDimmed?0.45:1,transition:"opacity 0.2s"}}>
          <td style={tdSt}><strong>{n}</strong>{isHighlighted && <span style={{marginInlineStart:4,fontSize:9,color:"var(--zan-teal-700)"}}>●</span>}</td>
          <td style={{...tdSt,textAlign:"center"}}>{pr.assetCount}</td>
          <td style={tdN}><div>{fmt(pr.totalCapex)}</div><div style={{height:3,borderRadius:2,background:"var(--surface-sidebar)",marginTop:3}}><div style={{height:"100%",borderRadius:2,background:"var(--color-danger)",width:`${capexPct}%`}} /></div></td>
          <td style={tdN}>{fmt(pr.totalIncome)}</td>
          <td style={{...tdN,color:"var(--color-danger)"}}>{fmt(pr.totalLandRent)}</td>
          <td style={{...tdN,color:pr.totalNetCF>=0?"var(--color-success-text)":"var(--color-danger)"}}>{fmt(pr.totalNetCF)}</td>
          <td style={{...tdN,fontWeight:600}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</td>
          <td style={tdN}>{fmtPct(pr.allocPct*100)}</td>
        </tr>;})}
        <tr style={{background:"var(--surface-page)",fontWeight:700}}>
          <td style={tdSt}>{isFiltered?(ar?"المجموع المختار":"Selected Total"):t.consolidated}</td>
          <td style={{...tdSt,textAlign:"center"}}>{isFiltered ? (project.assets||[]).filter(a=>activePh.includes(a.phase)).length : project.assets.length}</td>
          <td style={tdN}>{fmt(c.totalCapex)}</td><td style={tdN}>{fmt(c.totalIncome)}</td>
          <td style={{...tdN,color:"var(--color-danger)"}}>{fmt(c.totalLandRent)}</td>
          <td style={{...tdN,color:displayTotalNetCF>=0?"var(--color-success-text)":"var(--color-danger)"}}>{fmt(displayTotalNetCF)}</td>
          <td style={{...tdN,fontWeight:700}}>{displayIRR!==null?fmtPct(displayIRR*100):"—"}{hasIncentives&&!isFiltered?" *":""}</td>
          <td style={tdN}></td>
        </tr>
      </tbody></table></div>
    </div>}

    {/* ═══ SECTION 4b: Market Gap Summary (if enabled) ═══ */}
    {project.market?.enabled && (() => {
      const mkt = project.market;
      const mktGaps = mkt.gaps || {};
      const mktTh = mkt.thresholds || {};
      const MSECS = ["Retail","Office","Hospitality","Residential","Marina","Industrial"];
      const getMktSup = (sec) => {
        const aa = (project.assets||[]).filter(a2 => { const c2=(a2.category||"").toLowerCase(),s2=sec.toLowerCase(); return c2.includes(s2)||(s2==="retail"&&c2.includes("commercial"))||(s2==="hospitality"&&(c2.includes("hotel")||c2.includes("resort"))); });
        if (sec==="Hospitality") return aa.reduce((s,a2)=>s+(a2.hotelPL?.keys||0),0);
        if (sec==="Marina") return aa.reduce((s,a2)=>s+(a2.marinaPL?.berths||0),0);
        return aa.reduce((s,a2)=>s+(a2.gfa||0)*((a2.efficiency||0)/100),0);
      };
      let low=0, med=0, high=0; const highNames = [];
      MSECS.forEach(sec => {
        const gap = mktGaps[sec]?.gap || 0; if (gap <= 0) return;
        const supply = getMktSup(sec); if (supply <= 0) { low++; return; }
        const pct = (supply / gap) * 100;
        const th3 = mktTh[sec] || { low: 50, med: 70 };
        if (pct > th3.med) { high++; highNames.push(catL(sec, ar)); }
        else if (pct > th3.low) { med++; }
        else { low++; }
      });
      const total = low + med + high;
      if (total === 0) return null;
      const hasRisk = high > 0;
      return (
        <div style={{background:hasRisk?"var(--color-danger-bg)":"#f0fdf4",borderRadius:"var(--radius-lg)",border:`1px solid ${hasRisk?"#fecaca":"#bbf7d0"}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setActiveTab("market")}>
          <span style={{fontSize:15}}>📊</span>
          <span style={{fontSize:12,fontWeight:600,color:hasRisk?"#991b1b":"#15803d"}}>{ar?"مؤشرات السوق":"Market Indicators"}</span>
          <div style={{display:"flex",gap:8,fontSize:11}}>
            {low > 0 && <span style={{color:"var(--color-success-text)",fontWeight:500}}>{low} {ar?"آمن":"safe"}</span>}
            {med > 0 && <span style={{color:"#eab308",fontWeight:500}}>{med} {ar?"متوسط":"medium"}</span>}
            {high > 0 && <span style={{color:"var(--color-danger)",fontWeight:600}}>{high} {ar?"مرتفع":"high"}: {highNames.join(", ")}</span>}
          </div>
          <span style={{fontSize:10,color:"var(--text-tertiary)",marginInlineStart:"auto"}}>{ar?"اضغط للتفاصيل →":"Click for details →"}</span>
        </div>
      );
    })()}

    {/* ═══ SECTION 5: Asset Overview (compact) ═══ */}
    {results.assetSchedules.length>0&&(()=>{
      const filteredAssets = isFiltered ? results.assetSchedules.filter(a => activePh.includes(a.phase)) : results.assetSchedules;
      return <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏢</span> {t.assetOverview} ({filteredAssets.length}{isFiltered?` / ${results.assetSchedules.length}`:""})
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["#","الأصل","المرحلة","المساحة","التكاليف",`الإيرادات (${project.horizon}ع)`,"النوع"]:["#","Asset","Phase","GFA","CAPEX",`Income (${project.horizon}yr)`,"Type"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {filteredAssets.map((a,i)=><tr key={a.id||i}>
          <td style={{...tdSt,color:"var(--text-tertiary)",width:30}}>{i+1}</td>
          <td style={tdSt}>{a.name||"—"} <span style={{color:"var(--text-tertiary)",fontSize:10}}>({catL(a.category,ar)})</span></td>
          <td style={tdSt}>{a.phase}</td>
          <td style={tdN}>{fmt(a.gfa)}</td><td style={tdN}>{fmt(a.totalCapex)}</td>
          <td style={{...tdN,color:"var(--color-success-text)"}}>{fmt(a.totalRevenue)}</td><td style={{...tdSt,fontSize:11}}>{revL(a.revType,ar)}</td>
        </tr>)}
      </tbody></table></div>
    </div>;})()}
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ── Inline tooltip component for KPIs and table headers ──
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
    <span ref={ref} onMouseEnter={isMobile?undefined:onEnter} onMouseLeave={isMobile?undefined:()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{cursor:"help",fontSize:isMobile?13:10,color:"var(--text-tertiary)",marginInlineStart:3,lineHeight:1,padding:isMobile?"4px":0}}>ⓘ</span>
    {show&&<>{isMobile&&<div onClick={()=>setShow(false)} style={{position:"fixed",inset:0,zIndex:99998}} />}<div style={{position:"fixed",top:pos.top,...(document.dir==="rtl"?{right:Math.max(10,Math.min(window.innerWidth-pos.left-140,window.innerWidth-300))}:{left:Math.max(10,Math.min(pos.left-140,window.innerWidth-300))}),width:isMobile?Math.min(280,window.innerWidth-24):280,background:"var(--text-primary)",color:"var(--text-secondary)",padding:isMobile?"12px 14px":"10px 13px",borderRadius:"var(--radius-md)",fontSize:isMobile?12:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start"}}>{text.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?4:0}}>{line}</div>)}</div></>}
  </span>;
}

// ═══════════════════════════════════════════════════════════════
// EDUCATIONAL HELP SYSTEM — Reusable Modal + HelpLink
// ═══════════════════════════════════════════════════════════════

// Content registry: keyed by section ID. Each entry has title, intro, tabs[].
// This can later be extracted to a separate config file.
const EDUCATIONAL_CONTENT = {
  financingMode: {
    ar: {
      title: "آليات التمويل العقاري",
      intro: "اختيار آلية التمويل يحدد هيكل الصفقة، الأطراف المشاركة، التكاليف، والعوائد. كل آلية لها متطلبات وتأثيرات مختلفة على المشروع.",
      cta: "فهمت",
      tabs: [
        {
          id: "self",
          label: "تمويل ذاتي",
          icon: "💰",
          content: [
            { type: "heading", text: "ما هو التمويل الذاتي؟" },
            { type: "text", text: "يقوم المطور بتمويل المشروع بالكامل من أمواله الخاصة بدون أي تمويل بنكي أو مستثمرين خارجيين." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "المشاريع الصغيرة والمتوسطة التي لا تحتاج رأس مال ضخم",
              "عندما يكون لدى المطور سيولة كافية ولا يريد تحمّل تكاليف تمويل",
              "مشاريع تطوير الأراضي أو البنية التحتية قصيرة المدة",
              "عندما تكون شروط البنوك غير مناسبة أو التمويل غير متاح"
            ]},
            { type: "heading", text: "التأثير على هيكل الصفقة" },
            { type: "text", text: "أبسط هيكل ممكن: لا يوجد أقساط بنكية، ولا التزامات لمستثمرين، ولا رسوم هيكلة أو إدارة صناديق. المطور يملك المشروع 100% ويتحمل المخاطرة كاملة." },
            { type: "heading", text: "المزايا" },
            { type: "list", items: [
              "تحكم كامل بالقرارات بدون شروط مقرضين أو مستثمرين",
              "لا توجد تكاليف تمويل (فوائد، رسوم بنكية، رسوم صندوق)",
              "سرعة في التنفيذ بدون إجراءات موافقات بنكية",
              "كل الأرباح للمطور بدون مشاركة"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "يتطلب سيولة عالية قد تكون محجوزة لفترة طويلة",
              "يحد من القدرة على تنفيذ مشاريع متعددة في نفس الوقت",
              "لا يستفيد من الرافعة المالية (Leverage) التي ترفع العائد على رأس المال",
              "المخاطرة الكاملة على المطور وحده"
            ]}
          ]
        },
        {
          id: "bank100",
          label: "بنكي 100%",
          icon: "🏦",
          content: [
            { type: "heading", text: "ما هو التمويل البنكي 100%؟" },
            { type: "text", text: "البنك يموّل كامل تكلفة المشروع (100% LTV). المطور يملك المشروع لكن بدون مساهمة نقدية مباشرة - الاعتماد الكامل على التمويل البنكي." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "عندما يملك المطور أصولاً كبيرة كضمانات لكن سيولته محدودة",
              "مشاريع مدعومة حكومياً أو ضمن برامج تمويل ميسّرة",
              "عندما يكون للمطور سجل ائتماني قوي وعلاقة قوية مع البنك",
              "مشاريع ذات تدفقات نقدية مضمونة (عقود إيجار مسبقة)"
            ]},
            { type: "heading", text: "المتطلبات الأساسية" },
            { type: "list", items: [
              "ضمانات عينية (رهن عقاري) أو ضمانات شخصية/كفالات",
              "تقييم ائتماني وتصنيف مقبول من البنك",
              "دراسة جدوى مفصلة ونموذج مالي معتمد",
              "نسبة تغطية خدمة الدين (DSCR) مقبولة للبنك",
              "قد يشترط البنك حساب ضمان (Escrow) للتدفقات النقدية"
            ]},
            { type: "heading", text: "التكاليف المتوقعة" },
            { type: "list", items: [
              "معدل ربح/فائدة سنوي (في السعودية عادة SAIBOR + هامش)",
              "رسوم ترتيب القرض (Upfront Fee) - عادة 0.5% إلى 2%",
              "رسوم تقييم والتزام ورسوم قانونية",
              "تكلفة التأمين المطلوب من البنك"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "أعلى مستوى مديونية - أي تأخير بالإيرادات يضغط على DSCR",
              "شروط البنك قد تكون مقيّدة (قيود على التوزيعات، تعهدات مالية)",
              "البنك قد يطلب حق الموافقة على قرارات رئيسية",
              "في حال تعثر المشروع، البنك يأخذ الأولوية في الاسترداد",
              "نادر في السوق السعودي بدون أي مساهمة من المطور"
            ]}
          ]
        },
        {
          id: "debt",
          label: "دين + ملكية",
          icon: "🏗",
          content: [
            { type: "heading", text: "ما هو نموذج الدين + الملكية؟" },
            { type: "text", text: "الهيكل الأكثر شيوعاً في التطوير العقاري: جزء من التمويل يأتي من البنك (قرض) والباقي من رأس مال المطور (Equity). نسبة التمويل البنكي (LTV) عادة 50% إلى 70% في السوق السعودي." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "معظم مشاريع التطوير العقاري المتوسطة والكبيرة",
              "عندما يريد المطور الاستفادة من الرافعة المالية لرفع العائد",
              "مشاريع ذات دراسة جدوى قوية ومقبولة بنكياً",
              "التطوير السكني والتجاري والمختلط"
            ]},
            { type: "heading", text: "كيف يعمل الهيكل؟" },
            { type: "list", items: [
              "المطور يساهم برأس المال أولاً (عادة 30% - 50%)",
              "البنك يسحب القرض تدريجياً مع تقدم البناء",
              "فترة سماح أثناء البناء (الفائدة تتراكم بدون أقساط)",
              "بعد الانتهاء تبدأ أقساط السداد من إيرادات المشروع",
              "المطور يملك المشروع بالكامل بعد سداد القرض"
            ]},
            { type: "heading", text: "التكاليف والأثر المالي" },
            { type: "list", items: [
              "تكلفة التمويل (فائدة + رسوم) تقلل صافي العائد",
              "لكن الرافعة المالية ترفع العائد على رأس المال (ROE)",
              "كلما زادت نسبة الدين زاد العائد والمخاطرة معاً",
              "DSCR هو المؤشر الأهم - يجب أن يبقى فوق 1.2x عادة"
            ]},
            { type: "heading", text: "ملاحظات مهمة" },
            { type: "list", items: [
              "البنك يشترط ضمانات وتعهدات مالية (Covenants)",
              "في التمويل الإسلامي: يكون عبر عقد مرابحة أو إجارة",
              "رأس مال المطور يجب أن يُضخ أولاً قبل سحب القرض",
              "توزيعات الأرباح قد تكون مقيدة حتى يصل DSCR لمستوى معين"
            ]}
          ]
        },
        {
          id: "fund",
          label: "صندوق (GP/LP)",
          icon: "📊",
          content: [
            { type: "heading", text: "ما هو الصندوق الاستثماري (GP/LP)؟" },
            { type: "text", text: "هيكل استثماري يجمع رأس المال من مستثمرين متعددين (LP - شركاء محدودون) ويديره المطور أو مدير استثمار (GP - الشريك العام). يُستخدم للمشاريع الكبيرة التي تحتاج رؤوس أموال تتجاوز قدرة مطور واحد." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "المشاريع الكبيرة (عادة أكثر من 100 مليون ريال)",
              "عندما يحتاج المطور رأس مال أكبر من قدرته الذاتية",
              "لجذب مستثمرين مؤسسيين (صناديق سيادية، شركات تأمين، أوقاف)",
              "مشاريع التطوير والاحتفاظ طويلة المدة (Develop & Hold)"
            ]},
            { type: "heading", text: "الأطراف المطلوبة" },
            { type: "list", items: [
              "GP (الشريك العام): المطور أو مدير الاستثمار - يدير المشروع",
              "LP (الشركاء المحدودون): المستثمرون - يساهمون برأس المال",
              "مدير الصندوق: قد يكون GP نفسه أو جهة مالية مرخصة (CMA)",
              "أمين حفظ (Custodian): يحفظ أصول الصندوق - مطلوب نظامياً",
              "مدقق حسابات: تدقيق سنوي إلزامي",
              "مستشار قانوني: لصياغة وثائق الصندوق والاتفاقيات"
            ]},
            { type: "heading", text: "الرسوم والتكاليف" },
            { type: "list", items: [
              "رسوم هيكلة (Structuring Fee): 1% - 3% مرة واحدة لتأسيس الصندوق",
              "رسوم اشتراك (Subscription Fee): 1% - 2% عند دخول المستثمر",
              "رسوم إدارة سنوية (Management Fee): 1% - 2.5% من صافي الأصول",
              "رسوم أمين الحفظ: 0.05% - 0.15% سنوياً",
              "رسوم تطوير (Developer Fee): 3% - 8% من تكلفة البناء",
              "رسوم ما قبل التأسيس: مصاريف دراسات وتقديم لهيئة السوق المالية",
              "رسوم أداء (Carry): 15% - 25% من الأرباح فوق العائد المفضل"
            ]},
            { type: "heading", text: "آلية توزيع الأرباح (Waterfall)" },
            { type: "list", items: [
              "المرحلة 1: إرجاع رأس المال للمستثمرين أولاً",
              "المرحلة 2: عائد مفضّل (Preferred Return) - عادة 8% - 12% سنوياً",
              "المرحلة 3: تعويض GP (Catch-up) حتى يصل لنسبة الأرباح المتفق عليها",
              "المرحلة 4: توزيع الأرباح المتبقية (عادة 70/30 أو 80/20 لصالح LP)"
            ]},
            { type: "heading", text: "المتطلبات التنظيمية (السعودية)" },
            { type: "list", items: [
              "ترخيص من هيئة السوق المالية (CMA) للصناديق العامة",
              "الصناديق الخاصة: حد أدنى 50 مستثمر أو مستثمرون مؤهلون",
              "تقارير دورية للمستثمرين وهيئة السوق المالية",
              "حوكمة صارمة: لجنة استثمار، تقييمات مستقلة، تدقيق سنوي"
            ]},
            { type: "heading", text: "مخاطر وملاحظات مهمة" },
            { type: "list", items: [
              "تكلفة التأسيس والتشغيل مرتفعة مقارنة بالتمويل المباشر",
              "المطور يفقد جزءاً من السيطرة (قرارات تحتاج موافقة المستثمرين)",
              "الخروج مقيّد بفترة الصندوق وشروط الاسترداد",
              "الشفافية والتقارير الدورية التزام مستمر وليس اختيارياً",
              "مناسب فقط عندما يكون حجم المشروع يبرر تكاليف الهيكلة"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Real Estate Financing Methods",
      intro: "Choosing the financing method defines the deal structure, parties involved, costs, and return distribution. Each method has different requirements and implications.",
      cta: "Got it",
      tabs: [
        {
          id: "self",
          label: "Self-Funded",
          icon: "💰",
          content: [
            { type: "heading", text: "What is Self-Funding?" },
            { type: "text", text: "The developer funds the entire project from their own capital with no external debt or investors." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Small to medium projects that don't require significant capital",
              "When the developer has sufficient liquidity and wants to avoid financing costs",
              "Short-term land development or infrastructure projects",
              "When bank terms are unfavorable or financing is unavailable"
            ]},
            { type: "heading", text: "Impact on Deal Structure" },
            { type: "text", text: "Simplest possible structure: no debt service, no investor obligations, no structuring or management fees. Developer owns 100% and bears all risk." },
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Requires high liquidity that may be locked for extended periods",
              "Limits ability to execute multiple projects simultaneously",
              "Misses leverage benefit that amplifies return on equity",
              "Full risk borne by the developer alone"
            ]}
          ]
        },
        {
          id: "bank100",
          label: "100% Bank Debt",
          icon: "🏦",
          content: [
            { type: "heading", text: "What is 100% Bank Debt?" },
            { type: "text", text: "The bank finances the entire project cost (100% LTV). The developer owns the project but with no direct cash contribution." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Developer has strong collateral assets but limited liquidity",
              "Government-backed or subsidized financing programs",
              "Strong credit history and banking relationship",
              "Projects with secured cash flows (pre-leased)"
            ]},
            { type: "heading", text: "Requirements" },
            { type: "list", items: [
              "Real estate collateral or personal guarantees",
              "Acceptable credit assessment and rating",
              "Detailed feasibility study and financial model",
              "Acceptable DSCR for the bank"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Highest debt level — any revenue delay pressures DSCR",
              "Bank conditions may be restrictive (distribution locks, covenants)",
              "Rare in Saudi market without some developer contribution"
            ]}
          ]
        },
        {
          id: "debt",
          label: "Debt + Equity",
          icon: "🏗",
          content: [
            { type: "heading", text: "What is Debt + Equity?" },
            { type: "text", text: "The most common structure: part bank loan and part developer equity. LTV typically 50-70% in the Saudi market." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Most medium to large real estate developments",
              "When the developer wants to leverage for higher ROE",
              "Projects with strong feasibility accepted by banks"
            ]},
            { type: "heading", text: "How it Works" },
            { type: "list", items: [
              "Developer contributes equity first (usually 30-50%)",
              "Bank draws loan progressively with construction",
              "Grace period during construction (interest accrues)",
              "Repayment starts from project revenue after completion"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Finance cost reduces net return but leverage boosts ROE",
              "DSCR must stay above ~1.2x",
              "Bank covenants may restrict distributions",
              "In Islamic finance: structured as Murabaha or Ijara"
            ]}
          ]
        },
        {
          id: "fund",
          label: "Fund (GP/LP)",
          icon: "📊",
          content: [
            { type: "heading", text: "What is a Fund Structure (GP/LP)?" },
            { type: "text", text: "An investment vehicle pooling capital from multiple investors (LPs) managed by the developer or investment manager (GP). Used for large projects exceeding a single developer's capacity." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Large projects (usually >SAR 100M)",
              "When developer needs more capital than available",
              "To attract institutional investors",
              "Long-term develop-and-hold strategies"
            ]},
            { type: "heading", text: "Parties Required" },
            { type: "list", items: [
              "GP (General Partner): Developer/investment manager",
              "LP (Limited Partners): Investors providing capital",
              "Fund Manager: GP or licensed financial entity (CMA)",
              "Custodian, Auditor, Legal Counsel"
            ]},
            { type: "heading", text: "Fees & Costs" },
            { type: "list", items: [
              "Structuring Fee: 1-3% one-time",
              "Subscription Fee: 1-2% at investor entry",
              "Management Fee: 1-2.5% annual on NAV",
              "Developer Fee: 3-8% of construction cost",
              "Performance Fee (Carry): 15-25% above preferred return"
            ]},
            { type: "heading", text: "Waterfall Distribution" },
            { type: "list", items: [
              "Tier 1: Return of Capital to investors",
              "Tier 2: Preferred Return (8-12% annual)",
              "Tier 3: GP Catch-up",
              "Tier 4: Profit Split (usually 70/30 or 80/20 to LP)"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "High setup and operating costs",
              "Developer loses some control to investors",
              "Regulatory requirements (CMA in Saudi)",
              "Ongoing transparency and reporting obligations"
            ]}
          ]
        }
      ]
    }
  },
  landType: {
    ar: {
      title: "أنواع حيازة الأرض",
      intro: "طريقة الحصول على الأرض تؤثر بشكل مباشر على هيكل التكاليف، المعالجة المحاسبية، حقوق الملكية، ومدة المشروع.",
      cta: "فهمت",
      tabs: [
        {
          id: "lease",
          label: "إيجار (حق انتفاع)",
          icon: "📋",
          content: [
            { type: "heading", text: "ما هو إيجار الأرض؟" },
            { type: "text", text: "المطور يستأجر الأرض من مالكها (حكومة أو قطاع خاص) لمدة محددة مقابل إيجار سنوي. المطور يملك المنشآت فقط وليس الأرض." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "أراضي حكومية أو أوقاف لا تُباع لكن تُؤجر (شائع في السعودية)",
              "مشاريع الواجهات البحرية والمناطق الاقتصادية الخاصة",
              "عندما يكون سعر شراء الأرض مرتفعاً جداً",
              "مشاريع طويلة المدة (25-99 سنة) مثل الفنادق والوجهات السياحية"
            ]},
            { type: "heading", text: "مدد الإيجار الشائعة في السعودية" },
            { type: "list", items: [
              "المناطق الاقتصادية (MODON، كاوست، نيوم): 50 سنة قابلة للتجديد",
              "أراضي أمانات المدن: 25-30 سنة",
              "الأوقاف: 25-50 سنة حسب نوع الوقف",
              "هيئة تطوير المنطقة (مشاريع رؤية 2030): 50-99 سنة",
              "فترة السماح أثناء البناء: عادة 2-5 سنوات بدون إيجار"
            ]},
            { type: "heading", text: "المعالجة المالية" },
            { type: "list", items: [
              "الإيجار = مصروف تشغيلي سنوي (ليس CAPEX)",
              "قد تكون هناك فترة سماح (بدون إيجار أثناء البناء)",
              "الإيجار يتصاعد سنوياً حسب النسبة المتفق عليها",
              "إمكانية رسملة حق الانتفاع (تحويله لـ Equity) لأغراض التمويل",
              "القيمة = مساحة الأرض × سعر التقييم/م²"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "لا يملك المطور الأرض - المنشآت فقط",
              "عند انتهاء العقد قد تعود المنشآت للمالك",
              "تصاعد الإيجار يؤثر على التدفقات النقدية طويلة المدة",
              "شروط التجديد والتخارج المبكر يجب أن تكون واضحة في العقد"
            ]}
          ]
        },
        {
          id: "purchase",
          label: "شراء (تملك)",
          icon: "🏠",
          content: [
            { type: "heading", text: "ما هو شراء الأرض؟" },
            { type: "text", text: "المطور يشتري الأرض بالكامل (Freehold) قبل البناء. يملك الأرض والمنشآت معاً." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "الأراضي الخاصة المعروضة للبيع",
              "مشاريع التطوير السكني والتجاري في المدن",
              "عندما يريد المطور ملكية كاملة وحرية تصرف مطلقة",
              "مشاريع البيع (Strata Sale) التي تُباع فيها الوحدات"
            ]},
            { type: "heading", text: "المعالجة المالية" },
            { type: "list", items: [
              "سعر الشراء = CAPEX أرض في السنة الأولى (قبل البناء)",
              "يُضاف إلى إجمالي تكلفة التطوير",
              "يدخل في قاعدة حساب التمويل البنكي (LTV)",
              "لا يوجد إيجار أرض سنوي - التكلفة لمرة واحدة فقط",
              "تكاليف إضافية: رسوم نقل الملكية 5% (ضريبة التصرفات العقارية) + سمسرة 2.5%"
            ]},
            { type: "heading", text: "المزايا" },
            { type: "list", items: [
              "ملكية كاملة بدون التزامات مستمرة",
              "قيمة الأرض قد ترتفع مع الوقت (مكسب رأسمالي)",
              "حرية كاملة في التصرف: بيع، رهن، تطوير إضافي",
              "أبسط في المعالجة المحاسبية والتمويلية"
            ]},
            { type: "heading", text: "المخاطر" },
            { type: "list", items: [
              "يتطلب رأس مال كبير مقدماً",
              "يقلل السيولة المتاحة لتكاليف البناء",
              "مخاطر انخفاض قيمة الأرض",
              "في بعض المناطق الشراء غير متاح (أراضي حكومية)"
            ]}
          ]
        },
        {
          id: "partner",
          label: "شراكة (حصة عينية)",
          icon: "🤝",
          content: [
            { type: "heading", text: "ما هي الأرض كشريك؟" },
            { type: "text", text: "مالك الأرض يساهم بها كحصة عينية (In-kind Equity) في المشروع أو الصندوق. لا يوجد دفع نقدي للأرض - المالك يحصل على نسبة من الأرباح مقابل الأرض." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "عندما يملك شخص أرضاً لكن ليس لديه سيولة أو خبرة للتطوير",
              "مشاريع حكومية مشتركة (الحكومة تساهم بالأرض)",
              "شراكات استراتيجية بين مالك الأرض والمطور",
              "عندما يكون سعر الأرض مرتفعاً والمطور لا يريد تحمّل تكلفتها نقداً"
            ]},
            { type: "heading", text: "المعالجة المالية" },
            { type: "list", items: [
              "الأرض تُقيّم بتقييم مستقل ثم تُحسب كـ Equity",
              "مالك الأرض يحصل على نسبة ملكية بناءً على (قيمة الأرض / إجمالي قيمة المشروع)",
              "لا يوجد تدفق نقدي خارج للأرض (لا CAPEX ولا إيجار)",
              "حصة الأرض تؤثر على توزيع الأرباح وحقوق التصويت"
            ]},
            { type: "heading", text: "التحديات" },
            { type: "list", items: [
              "يحتاج تقييم مستقل متفق عليه من جميع الأطراف",
              "يقلل حصة المطور في الأرباح",
              "قد تنشأ خلافات على التقييم أو صلاحيات القرار",
              "يحتاج اتفاقية شراكة مفصلة تغطي الحوكمة والتخارج",
              "معقد في حالة الصناديق (يحتاج هيكلة قانونية خاصة)"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Land Acquisition Types",
      intro: "How the land is acquired directly affects cost structure, accounting treatment, ownership rights, and project timeline.",
      cta: "Got it",
      tabs: [
        {
          id: "lease",
          label: "Lease (Leasehold)",
          icon: "📋",
          content: [
            { type: "heading", text: "What is a Land Lease?" },
            { type: "text", text: "Developer leases the land from the owner (government or private) for a set period with annual rent. Developer owns the buildings only, not the land." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Government or waqf land not available for sale (common in Saudi)",
              "Waterfront projects and special economic zones",
              "When land purchase price is prohibitively high",
              "Long-term projects (25-99 years) like hotels and tourism destinations"
            ]},
            { type: "heading", text: "Financial Treatment" },
            { type: "list", items: [
              "Rent = annual operating expense (not CAPEX)",
              "Grace period possible (no rent during construction)",
              "Rent escalates annually per agreed rate",
              "Leasehold can be capitalized (converted to equity) for financing",
              "Value = land area x appraisal rate/sqm"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Developer doesn't own the land",
              "Buildings may revert to owner at lease end",
              "Escalating rent impacts long-term cash flows",
              "Renewal and early exit terms must be clear in the contract"
            ]}
          ]
        },
        {
          id: "purchase",
          label: "Purchase (Freehold)",
          icon: "🏠",
          content: [
            { type: "heading", text: "What is Land Purchase?" },
            { type: "text", text: "Developer buys the land outright (Freehold) before construction. Owns both land and buildings." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Private land available for sale",
              "Residential and commercial urban developments",
              "When full ownership and control is needed",
              "Strata sale projects where units are sold individually"
            ]},
            { type: "heading", text: "Financial Treatment" },
            { type: "list", items: [
              "Purchase price = land CAPEX in year 0",
              "Added to total development cost",
              "Included in bank financing base (LTV)",
              "No annual land rent - one-time cost only"
            ]},
            { type: "heading", text: "Key Risks" },
            { type: "list", items: [
              "Requires large upfront capital",
              "Reduces liquidity for construction costs",
              "Land value depreciation risk",
              "Not available in some areas (government land)"
            ]}
          ]
        },
        {
          id: "partner",
          label: "Partner (In-kind)",
          icon: "🤝",
          content: [
            { type: "heading", text: "What is Land as Partner?" },
            { type: "text", text: "Landowner contributes land as in-kind equity. No cash payment for land - owner gets a profit share instead." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Landowner has land but no liquidity or development expertise",
              "Government joint ventures (government contributes land)",
              "Strategic partnerships between landowner and developer",
              "When land price is high and developer wants to avoid cash outflow"
            ]},
            { type: "heading", text: "Financial Treatment" },
            { type: "list", items: [
              "Land is independently appraised and counted as equity",
              "Owner gets ownership % based on (land value / total project value)",
              "No cash outflow for land (no CAPEX, no rent)",
              "Land share affects profit distribution and voting rights"
            ]},
            { type: "heading", text: "Key Challenges" },
            { type: "list", items: [
              "Requires agreed independent valuation",
              "Reduces developer's profit share",
              "Potential disputes on valuation or decision authority",
              "Needs detailed partnership agreement covering governance and exit"
            ]}
          ]
        }
      ]
    }
  },
  exitStrategy: {
    ar: {
      title: "استراتيجيات التخارج",
      intro: "استراتيجية التخارج تحدد كيف ومتى يسترد المطور والمستثمرون أموالهم وأرباحهم من المشروع.",
      cta: "فهمت",
      tabs: [
        {
          id: "sale",
          label: "بيع (مضاعف)",
          icon: "🏷",
          content: [
            { type: "heading", text: "ما هو البيع بالمضاعف؟" },
            { type: "text", text: "بيع المشروع كاملاً لمشترٍ بسعر يُحسب كمضاعف للإيجار السنوي المستقر. مثلاً: إيجار 10 مليون × مضاعف 12 = سعر بيع 120 مليون." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "الطريقة الأكثر شيوعاً للتخارج في التطوير العقاري",
              "بعد استقرار المشروع تشغيلياً (عادة 2-5 سنوات بعد الافتتاح)",
              "عندما يريد المطور/الصندوق تحويل العائد لسيولة",
              "أصول مدرّة للدخل مثل المكاتب والمحلات والفنادق"
            ]},
            { type: "heading", text: "كيف يُحسب السعر؟" },
            { type: "list", items: [
              "سعر البيع = الإيجار السنوي المستقر × المضاعف",
              "المضاعف يعتمد على: نوع الأصل، الموقع، جودة المستأجرين، مدة العقود",
              "في السعودية: 8x-12x للتجاري، 10x-15x للمكاتب الفاخرة",
              "تُخصم تكاليف البيع (سمسرة + قانوني) عادة 1.5% - 3%"
            ]},
            { type: "heading", text: "ملاحظات مهمة" },
            { type: "list", items: [
              "المضاعف الأعلى = سعر بيع أعلى = عائد أفضل",
              "يعتمد بشكل كبير على ظروف السوق وقت البيع",
              "يحتاج وقت لإتمام الصفقة (6-12 شهر عادة)",
              "في الصناديق: عائدات البيع توزع حسب حافز الأداء (Waterfall)"
            ]}
          ]
        },
        {
          id: "caprate",
          label: "بيع (رسملة)",
          icon: "📈",
          content: [
            { type: "heading", text: "ما هو البيع بالرسملة (Cap Rate)؟" },
            { type: "text", text: "نفس فكرة البيع لكن السعر يُحسب بطريقة معدل الرسملة: سعر البيع = صافي الدخل التشغيلي (NOI) ÷ معدل الرسملة." },
            { type: "heading", text: "الفرق عن المضاعف" },
            { type: "list", items: [
              "المضاعف يُحسب على الإيجار الإجمالي (Gross Rent × Multiple)",
              "الرسملة تُحسب على صافي الدخل بعد المصاريف (NOI ÷ Cap Rate)",
              "الرسملة أدق لأنها تأخذ المصاريف التشغيلية في الحسبان",
              "مثال: NOI = 8 مليون، Cap Rate = 8% → سعر = 100 مليون"
            ]},
            { type: "heading", text: "معدلات الرسملة في السعودية" },
            { type: "list", items: [
              "تجاري (محلات): 7% - 10%",
              "مكاتب: 7% - 9%",
              "سكني: 6% - 8%",
              "فنادق: 8% - 11%",
              "Cap Rate أقل = سعر بيع أعلى (الأصول الممتازة)"
            ]},
            { type: "heading", text: "متى يُفضل؟" },
            { type: "list", items: [
              "الأصول المدرّة للدخل مع مصاريف تشغيلية واضحة (فنادق، مولات)",
              "عندما يكون المشتري مستثمراً مؤسسياً يستخدم Cap Rate كمعيار",
              "المقارنة مع أصول مشابهة في السوق",
              "صناديق REITs التي تقيّم بناءً على NOI"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "النموذج يحسب NOI = إيرادات التشغيل - مصاريف التشغيل (بدون خدمة الدين)",
              "سعر البيع = NOI المستقر ÷ Cap Rate المُدخل",
              "تُخصم تكاليف التخارج (سمسرة + قانوني) من سعر البيع",
              "الفرق عن المضاعف: Cap Rate يعطي نتيجة مختلفة إذا كانت المصاريف التشغيلية عالية"
            ]}
          ]
        },
        {
          id: "hold",
          label: "احتفاظ بالدخل",
          icon: "💎",
          content: [
            { type: "heading", text: "ما هو الاحتفاظ بالدخل؟" },
            { type: "text", text: "المطور لا يبيع المشروع بل يحتفظ به كأصل مدرّ للدخل. العائد يأتي من التدفقات النقدية التشغيلية فقط بدون حدث بيع." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "مطور يريد بناء محفظة أصول طويلة المدة",
              "أصول ذات دخل مستقر ومتصاعد (مثل مراكز التسوق الناجحة)",
              "عندما تكون ظروف البيع غير مناسبة",
              "استراتيجية الأوقاف والصناديق السيادية",
              "في التمويل الذاتي: لا يوجد ضغط من مستثمرين للتخارج"
            ]},
            { type: "heading", text: "التأثير على العائد" },
            { type: "list", items: [
              "IRR عادة أقل من البيع (لأن القيمة لا تتحقق دفعة واحدة)",
              "لكن إجمالي الدخل التراكمي قد يكون أعلى على المدى الطويل",
              "العائد يعتمد على معدل الإشغال واستدامة الإيرادات",
              "MOIC يتراكم ببطء لكن بثبات"
            ]},
            { type: "heading", text: "ملاحظات" },
            { type: "list", items: [
              "لا يوجد حدث تخارج - النموذج يحسب العائد على كامل الأفق الزمني",
              "في الصناديق: يحتاج آلية واضحة لتوزيع الأرباح الدورية",
              "يتطلب إدارة تشغيلية مستمرة",
              "قد يحتاج إعادة تمويل (Refinance) لتوفير سيولة للمستثمرين"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Exit Strategies",
      intro: "The exit strategy determines how and when the developer and investors recover their capital and returns from the project.",
      cta: "Got it",
      tabs: [
        {
          id: "sale",
          label: "Sale (Multiple)",
          icon: "🏷",
          content: [
            { type: "heading", text: "What is Sale by Multiple?" },
            { type: "text", text: "Sell the entire project to a buyer at a price calculated as a multiple of stabilized annual rent. Example: 10M rent x 12x multiple = 120M sale price." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Most common exit method in real estate development",
              "After project stabilization (usually 2-5 years after opening)",
              "When developer/fund wants to convert returns to cash",
              "Income-producing assets like offices, retail, hotels"
            ]},
            { type: "heading", text: "How is the price calculated?" },
            { type: "list", items: [
              "Sale price = Stabilized Annual Rent x Multiple",
              "Multiple depends on: asset type, location, tenant quality, lease terms",
              "Saudi market: 8x-12x commercial, 10x-15x premium offices",
              "Exit costs (brokerage + legal) deducted: typically 1.5-3%"
            ]},
            { type: "heading", text: "Key Notes" },
            { type: "list", items: [
              "Higher multiple = higher sale price = better returns",
              "Heavily dependent on market conditions at time of sale",
              "Typically takes 6-12 months to close",
              "In funds: sale proceeds distributed per waterfall"
            ]}
          ]
        },
        {
          id: "caprate",
          label: "Sale (Cap Rate)",
          icon: "📈",
          content: [
            { type: "heading", text: "What is Cap Rate Exit?" },
            { type: "text", text: "Same concept as sale, but price is calculated using capitalization rate: Sale Price = NOI / Cap Rate." },
            { type: "heading", text: "Difference from Multiple" },
            { type: "list", items: [
              "Multiple uses Gross Rent (Rent x Multiple)",
              "Cap Rate uses Net Operating Income (NOI / Cap Rate)",
              "Cap Rate is more precise as it accounts for operating expenses",
              "Example: NOI = 8M, Cap Rate = 8% -> Price = 100M"
            ]},
            { type: "heading", text: "Saudi Cap Rates" },
            { type: "list", items: [
              "Retail: 7-10%",
              "Office: 7-9%",
              "Residential: 6-8%",
              "Hotels: 8-11%",
              "Lower cap rate = higher price (premium assets)"
            ]},
            { type: "heading", text: "When preferred?" },
            { type: "list", items: [
              "Income assets with clear operating expenses",
              "Institutional buyers who use Cap Rate as benchmark",
              "Comparable asset analysis in the market"
            ]}
          ]
        },
        {
          id: "hold",
          label: "Hold for Income",
          icon: "💎",
          content: [
            { type: "heading", text: "What is Hold for Income?" },
            { type: "text", text: "Developer keeps the project as an income-generating asset. Returns come from operating cash flows only, with no sale event." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Developer building a long-term asset portfolio",
              "Assets with stable, growing income",
              "When market conditions aren't right for a sale",
              "Endowment and sovereign fund strategies"
            ]},
            { type: "heading", text: "Impact on Returns" },
            { type: "list", items: [
              "IRR typically lower than sale (value not realized in lump sum)",
              "But total cumulative income may be higher long-term",
              "Returns depend on occupancy and income sustainability",
              "MOIC accumulates slowly but steadily"
            ]},
            { type: "heading", text: "Key Notes" },
            { type: "list", items: [
              "No exit event - model calculates return over full horizon",
              "In funds: needs clear periodic distribution mechanism",
              "Requires ongoing operational management",
              "May need refinancing to provide investor liquidity"
            ]}
          ]
        }
      ]
    }
  },
  waterfallConcepts: {
    ar: {
      title: "شلال التوزيعات - المفاهيم الأساسية",
      intro: "حافز الأداء (Waterfall) هو الآلية التي تحدد ترتيب وأولوية توزيع الأرباح بين المطور (GP) والمستثمرين (LP). فهم كل مرحلة ضروري لتقييم عدالة الهيكل.",
      cta: "فهمت",
      tabs: [
        {
          id: "overview",
          label: "نظرة عامة",
          icon: "📊",
          content: [
            { type: "heading", text: "ما هو شلال التوزيعات؟" },
            { type: "text", text: "نظام من 4 مراحل متسلسلة يحدد أولوية توزيع الأموال. كل مرحلة يجب أن تكتمل قبل الانتقال للتي بعدها." },
            { type: "heading", text: "لماذا يُستخدم؟" },
            { type: "list", items: [
              "يحمي المستثمرين بضمان استرداد رأس مالهم أولاً",
              "يحفّز المطور على تحقيق عوائد عالية (كلما زاد العائد زادت حصته)",
              "يوازن بين المخاطر والعوائد لجميع الأطراف",
              "معيار صناعي في صناديق الاستثمار العقاري عالمياً"
            ]},
            { type: "heading", text: "ترتيب المراحل" },
            { type: "list", items: [
              "المرحلة 1: إرجاع رأس المال (Return of Capital)",
              "المرحلة 2: العائد التفضيلي (Preferred Return)",
              "المرحلة 3: تعويض المطور (GP Catch-up)",
              "المرحلة 4: تقسيم الأرباح (Profit Split)"
            ]},
            { type: "heading", text: "مثال مبسّط" },
            { type: "text", text: "صندوق بـ 100 مليون Equity، عائد تفضيلي 10%، Carry 20%. بعد 5 سنوات حقق 180 مليون. التوزيع: (1) أول 100 مليون ترجع للمستثمرين، (2) الـ 50 مليون التالية تغطي العائد التفضيلي التراكمي، (3) GP يأخذ catch-up، (4) الباقي يتقسم 80/20." }
          ]
        },
        {
          id: "pref",
          label: "العائد التفضيلي",
          icon: "⭐",
          content: [
            { type: "heading", text: "ما هو العائد التفضيلي (Preferred Return)؟" },
            { type: "text", text: "حد أدنى للعائد السنوي يحصل عليه المستثمرون (LP) قبل أن يشارك المطور (GP) في أي أرباح. يُحسب كنسبة مئوية سنوية على رأس المال غير المسترد." },
            { type: "heading", text: "كيف يعمل؟" },
            { type: "list", items: [
              "يتراكم سنوياً على رأس المال غير المسترد",
              "إذا لم يُدفع في سنة معينة يتراكم للسنة التالية (Accrual)",
              "يجب سداد كامل المبلغ المتراكم قبل الانتقال للمرحلة 3",
              "عادة 8% - 15% سنوياً حسب مستوى المخاطرة"
            ]},
            { type: "heading", text: "نسبي أم للمستثمر فقط؟" },
            { type: "list", items: [
              "نسبي (Pro Rata): العائد التفضيلي يوزع على GP و LP حسب حصصهم في رأس المال",
              "للمستثمر فقط (LP Only): كامل العائد التفضيلي يذهب للمستثمرين",
              "الطريقة المختارة تؤثر على عوائد GP بشكل كبير"
            ]},
            { type: "heading", text: "معدلات شائعة في السعودية" },
            { type: "list", items: [
              "صناديق عقارية مستقرة: 8% - 10%",
              "مشاريع تطوير: 10% - 12%",
              "مشاريع عالية المخاطرة: 12% - 15%",
              "كلما زاد العائد التفضيلي، زادت حماية المستثمر لكن صعب تحقيقه"
            ]}
          ]
        },
        {
          id: "catchup",
          label: "تعويض المطور",
          icon: "🔄",
          content: [
            { type: "heading", text: "ما هو تعويض المطور (GP Catch-up)؟" },
            { type: "text", text: "بعد حصول المستثمرين على العائد التفضيلي، يأخذ المطور حصة أكبر مؤقتاً حتى يصل لنسبة الأرباح المتفق عليها (Carry)." },
            { type: "heading", text: "لماذا يوجد؟" },
            { type: "list", items: [
              "بدونه: المطور يحصل على Carry فقط على الأرباح فوق Pref",
              "معه: المطور يصل لنسبة Carry الكاملة من إجمالي الأرباح",
              "يضمن أن نسبة GP النهائية تعكس الـ Carry المتفق عليه",
              "شائع في معظم الصناديق العقارية المهنية"
            ]},
            { type: "heading", text: "طريقة الحساب" },
            { type: "list", items: [
              "سنوي (Per Year): يُحسب الـ catch-up كل سنة مستقل - أبسط وأوضح",
              "تراكمي (Cumulative): يُحسب على إجمالي التوزيعات من بداية الصندوق - أدق",
              "الطريقة السنوية هي الافتراضية في النموذج المرجعي"
            ]},
            { type: "heading", text: "مثال" },
            { type: "text", text: "أرباح = 100، Pref = 60 ذهبت لـ LP، Carry = 20%. بدون catch-up: GP يأخذ 20% من المتبقي (40 × 20% = 8). مع catch-up: GP يأخذ حتى يصل لـ 20% من إجمالي الأرباح (100 × 20% = 20)." },
            { type: "heading", text: "ملاحظات مهمة" },
            { type: "list", items: [
              "في السعودية: معظم الصناديق تستخدم catch-up بنسبة 100% (GP يأخذ كل شي حتى يتعادل)",
              "بعض الصناديق تستخدم catch-up جزئي (مثلاً 50%) - أبطأ للمطور",
              "بدون catch-up: GP يخسر جزء كبير من حصته خاصة إذا كان Pref عالي",
              "يجب أن يكون واضحاً في وثائق الصندوق لأنه يؤثر بشكل كبير على عوائد GP"
            ]}
          ]
        },
        {
          id: "split",
          label: "تقسيم الأرباح",
          icon: "💰",
          content: [
            { type: "heading", text: "ما هو تقسيم الأرباح (Profit Split)؟" },
            { type: "text", text: "المرحلة الأخيرة: الأرباح المتبقية بعد كل المراحل السابقة تُقسم بنسبة ثابتة بين المستثمرين والمطور." },
            { type: "heading", text: "النسب الشائعة" },
            { type: "list", items: [
              "80/20: المستثمرون 80% والمطور 20% (الأكثر شيوعاً)",
              "70/30: للمطورين ذوي السجل المميز",
              "90/10: صناديق كبيرة بمخاطر منخفضة",
              "60/40: نادر - فقط لمطورين لهم ميزة تنافسية استثنائية"
            ]},
            { type: "heading", text: "Carry (أتعاب حسن الأداء)" },
            { type: "list", items: [
              "Carry = نسبة المطور من الأرباح في هذه المرحلة",
              "عادة 20% - 30%",
              "هذه أهم آلية تحفيز للمطور",
              "كلما حقق المشروع عوائد أعلى، زاد مبلغ Carry للمطور"
            ]},
            { type: "heading", text: "MOIC و IRR" },
            { type: "list", items: [
              "MOIC (مضاعف رأس المال): إجمالي ما حصل عليه الطرف ÷ ما دفعه",
              "MOIC = 2x يعني ضعّف فلوسه، 3x = ثلاثة أضعاف",
              "IRR (معدل العائد الداخلي): يأخذ التوقيت في الاعتبار",
              "IRR أفضل لمقارنة الفرص لأنه يعكس سرعة العائد"
            ]},
            { type: "heading", text: "كيف تختار النسبة المناسبة؟" },
            { type: "list", items: [
              "المشاريع منخفضة المخاطرة: 80/20 أو 90/10 (المستثمر محمي أكثر)",
              "المطور بسجل مميز: يستطيع التفاوض على 70/30",
              "مشاريع التطوير (عالية المخاطرة): 80/20 مع catch-up هو الأكثر عدالة",
              "مشاريع الدخل المستقر: يمكن تقليل Carry لكن رفع رسوم الإدارة",
              "القاعدة: كلما زاد جهد ومخاطرة المطور، زادت حصته من الأرباح"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Waterfall Distribution - Core Concepts",
      intro: "The Waterfall defines the order and priority of profit distribution between developer (GP) and investors (LP). Understanding each tier is essential to evaluate deal fairness.",
      cta: "Got it",
      tabs: [
        {
          id: "overview",
          label: "Overview",
          icon: "📊",
          content: [
            { type: "heading", text: "What is a Distribution Waterfall?" },
            { type: "text", text: "A 4-tier sequential system that prioritizes how funds are distributed. Each tier must complete before moving to the next." },
            { type: "heading", text: "Why is it used?" },
            { type: "list", items: [
              "Protects investors by ensuring capital return first",
              "Incentivizes developer to achieve higher returns",
              "Balances risk and return for all parties",
              "Industry standard in real estate investment funds globally"
            ]},
            { type: "heading", text: "Tier Order" },
            { type: "list", items: [
              "Tier 1: Return of Capital",
              "Tier 2: Preferred Return",
              "Tier 3: GP Catch-up",
              "Tier 4: Profit Split"
            ]}
          ]
        },
        {
          id: "pref",
          label: "Preferred Return",
          icon: "⭐",
          content: [
            { type: "heading", text: "What is Preferred Return?" },
            { type: "text", text: "Minimum annual return to LPs before GP shares in any profits. Calculated as annual % on unreturned capital." },
            { type: "heading", text: "How it works" },
            { type: "list", items: [
              "Accrues annually on unreturned capital",
              "If unpaid in a year, it carries forward (accrual)",
              "Must be fully paid before Tier 3 begins",
              "Typically 8-15% depending on risk level"
            ]},
            { type: "heading", text: "Pro Rata vs LP Only" },
            { type: "list", items: [
              "Pro Rata: Pref distributed to GP and LP by ownership share",
              "LP Only: All pref goes exclusively to investors",
              "Choice significantly impacts GP economics"
            ]}
          ]
        },
        {
          id: "catchup",
          label: "GP Catch-up",
          icon: "🔄",
          content: [
            { type: "heading", text: "What is GP Catch-up?" },
            { type: "text", text: "After LPs receive their preferred return, GP temporarily takes a larger share until reaching their agreed carry percentage of total profits." },
            { type: "heading", text: "Why it exists" },
            { type: "list", items: [
              "Without it: GP only earns carry on profits above pref",
              "With it: GP reaches full carry % of total profits",
              "Ensures GP's final share reflects the agreed carry",
              "Standard in most professional real estate funds"
            ]},
            { type: "heading", text: "Calculation Method" },
            { type: "list", items: [
              "Per Year: catch-up calculated each year independently",
              "Cumulative: calculated on total distributions from fund start",
              "Per Year is simpler, Cumulative is more precise"
            ]}
          ]
        },
        {
          id: "split",
          label: "Profit Split",
          icon: "💰",
          content: [
            { type: "heading", text: "What is Profit Split?" },
            { type: "text", text: "Final tier: remaining profits after all previous tiers are split at a fixed ratio between LP and GP." },
            { type: "heading", text: "Common Ratios" },
            { type: "list", items: [
              "80/20: LP 80% / GP 20% (most common)",
              "70/30: For developers with proven track record",
              "90/10: Large funds with lower risk",
              "Carry = GP's share in this tier (usually 20-30%)"
            ]},
            { type: "heading", text: "MOIC & IRR" },
            { type: "list", items: [
              "MOIC: Total received / Total invested (2x = doubled money)",
              "IRR: Accounts for timing of cash flows",
              "IRR better for comparing opportunities (reflects speed of return)"
            ]}
          ]
        }
      ]
    }
  },
  islamicFinance: {
    ar: {
      title: "هياكل التمويل الإسلامي",
      intro: "في السعودية معظم التمويل البنكي يتم وفق أحكام الشريعة الإسلامية. الفرق ليس فقط في المسمى بل في الهيكل القانوني والملكية وتوزيع المخاطر.",
      cta: "فهمت",
      tabs: [
        {
          id: "murabaha",
          label: "المرابحة",
          icon: "🏦",
          content: [
            { type: "heading", text: "ما هي المرابحة؟" },
            { type: "text", text: "البنك يشتري الأصل (أرض، مواد بناء، معدات) ثم يبيعه للعميل بسعر أعلى يشمل هامش ربح معلوم ومتفق عليه. الدفع يكون بأقساط على فترة محددة." },
            { type: "heading", text: "كيف تعمل في التطوير العقاري؟" },
            { type: "list", items: [
              "البنك يشتري الأرض أو مواد البناء نيابةً عن المطور",
              "يبيعها للمطور بسعر التكلفة + هامش ربح (يعادل نسبة الفائدة)",
              "السداد على أقساط حسب جدول متفق عليه",
              "الملكية تنتقل للمطور فوراً بعد البيع",
              "السحب يتم على دفعات مع تقدم البناء (مثل القرض التقليدي)"
            ]},
            { type: "heading", text: "الفرق عن القرض التقليدي" },
            { type: "list", items: [
              "البنك يملك الأصل لحظة (ولو شكلياً) قبل بيعه - لا يقرض مال مباشرة",
              "الربح ثابت ومعلوم من البداية (لا يتغير مع السوق في المرابحة الثابتة)",
              "في المرابحة المتغيرة: الهامش مرتبط بـ SAIBOR ويتغير دورياً",
              "لا يوجد \"فائدة\" بل \"هامش ربح\" - الأثر المالي مشابه",
              "في النموذج المالي: المعالجة الحسابية متطابقة تقريباً مع القرض التقليدي"
            ]},
            { type: "heading", text: "الاستخدام في السعودية" },
            { type: "list", items: [
              "الأكثر شيوعاً في تمويل شراء الأراضي والعقارات الجاهزة",
              "معتمد من جميع البنوك السعودية (الراجحي، الأهلي، الإنماء، البلاد، الجزيرة)",
              "الهامش عادة SAIBOR + 1.5% إلى 3.5% حسب الملف الائتماني",
              "مقبول من هيئة السوق المالية والبنك المركزي (ساما)"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "المرابحة المتغيرة: ارتفاع SAIBOR يرفع تكلفة التمويل مباشرة",
              "السداد المبكر: بعض البنوك لا تخصم هامش الربح المتبقي بالكامل",
              "التحويل بين البنوك (شراء المديونية) ممكن لكن بتكاليف إضافية",
              "يجب التأكد من موافقة الهيئة الشرعية للبنك على هيكل الصفقة",
              "رسوم الترتيب والتقييم والقانونية تُضاف فوق هامش الربح"
            ]}
          ]
        },
        {
          id: "ijara",
          label: "الإجارة",
          icon: "📄",
          content: [
            { type: "heading", text: "ما هي الإجارة المنتهية بالتمليك؟" },
            { type: "text", text: "البنك يشتري الأصل ويؤجره للعميل لفترة محددة. عند انتهاء الإجارة ينتقل ملكية الأصل للعميل. أثناء الإجارة البنك هو المالك القانوني." },
            { type: "heading", text: "كيف تعمل في التطوير العقاري؟" },
            { type: "list", items: [
              "البنك يشتري العقار أو جزءاً منه (أو يموّل البناء)",
              "يؤجره للمطور بأجرة شهرية/ربع سنوية",
              "الأجرة تشمل جزء إيجار + جزء يُسدد من الأصل",
              "في نهاية المدة: المطور يملك العقار بسعر رمزي أو مجاناً",
              "يمكن هيكلتها كإجارة موصوفة بالذمة (Forward Lease) للمشاريع تحت الإنشاء"
            ]},
            { type: "heading", text: "الفرق عن المرابحة" },
            { type: "list", items: [
              "في الإجارة: البنك يظل مالكاً طوال فترة العقد (مسؤول عن التأمين نظرياً)",
              "في المرابحة: الملكية تنتقل فوراً بعد البيع",
              "الإجارة أنسب للأصول المدرّة للدخل (المطور يستخدم دخل الإيجار للسداد)",
              "المرابحة أنسب لتمويل شراء الأراضي ومواد البناء",
              "الإجارة تسمح بإعادة تسعير الأجرة دورياً (مرونة أكبر)"
            ]},
            { type: "heading", text: "المزايا" },
            { type: "list", items: [
              "مرونة في هيكلة الأقساط (موسمية، متصاعدة، ثابتة)",
              "البنك يتحمل مخاطر ملكية الأصل نظرياً (تأمين، صيانة هيكلية)",
              "إمكانية إعادة تسعير الأجرة دورياً مع تغير SAIBOR",
              "مناسب لمشاريع التأجير والتشغيل طويلة المدة (فنادق، مولات)"
            ]},
            { type: "heading", text: "المخاطر والملاحظات" },
            { type: "list", items: [
              "المطور لا يملك الأصل حتى نهاية العقد - لا يستطيع بيعه أو رهنه",
              "بعض البنوك تحمّل المستأجر (المطور) كل تكاليف الصيانة والتأمين عملياً",
              "إعادة التسعير الدوري قد تزيد الأجرة في حال ارتفاع SAIBOR",
              "التخارج المبكر قد يكون مكلفاً (غرامات أو تعويض للبنك)",
              "يحتاج موافقة الهيئة الشرعية على هيكل العقد"
            ]},
            { type: "heading", text: "في النموذج المالي" },
            { type: "list", items: [
              "الأثر الحسابي مشابه جداً للقرض التقليدي والمرابحة",
              "الفرق في المسمى: \"أجرة\" بدل \"قسط\"، \"ربح\" بدل \"فائدة\"",
              "DSCR والنسب المالية تُحسب بنفس الطريقة",
              "التقارير البنكية تستخدم المصطلحات الشرعية المناسبة"
            ]}
          ]
        },
        {
          id: "conventional",
          label: "تقليدي",
          icon: "💳",
          content: [
            { type: "heading", text: "ما هو التمويل التقليدي؟" },
            { type: "text", text: "قرض مباشر من البنك للعميل بفائدة. البنك لا يملك الأصل - فقط يُقرض المال ويأخذ ضمانات. غير متوافق مع الشريعة الإسلامية." },
            { type: "heading", text: "متى يُستخدم؟" },
            { type: "list", items: [
              "تمويل من بنوك دولية ليس لها نوافذ شرعية (HSBC، Standard Chartered)",
              "تمويل مشاريع خارج السعودية حيث البدائل الإسلامية محدودة",
              "برامج تمويل حكومية أو دولية بشروط خاصة (IFC، EBRD)",
              "عندما تكون الفائدة المتغيرة أفضل من هامش المرابحة الثابت",
              "مشاريع مشتركة مع شركاء أجانب يفضلون الهياكل التقليدية"
            ]},
            { type: "heading", text: "الفرق الجوهري عن الإسلامي" },
            { type: "list", items: [
              "فائدة على المبلغ المقترض (بسيطة أو مركبة) - ليست هامش ربح على بيع",
              "الفائدة قد تكون ثابتة أو متغيرة (مرتبطة بـ LIBOR/SOFR أو SAIBOR)",
              "البنك لا يملك الأصل في أي مرحلة - فقط يرهنه كضمان",
              "لا يحتاج موافقة هيئة شرعية",
              "أبسط قانونياً وأسرع في التنفيذ لكن لا يتوافق مع الشريعة"
            ]},
            { type: "heading", text: "التوفر في السعودية" },
            { type: "list", items: [
              "معظم البنوك السعودية تحولت بالكامل للمنتجات الإسلامية",
              "التمويل التقليدي متاح فقط من بعض الفروع الأجنبية",
              "صناديق الاستثمار العقاري في السعودية ملزمة بالتوافق الشرعي",
              "قد يكون مقبولاً في المناطق الحرة أو المشاريع الدولية"
            ]},
            { type: "heading", text: "في النموذج المالي" },
            { type: "list", items: [
              "الحسابات متطابقة مع المرابحة والإجارة رقمياً",
              "الفرق فقط في المصطلحات: فائدة vs ربح vs أجرة",
              "النموذج يتعامل مع الثلاثة بنفس المنطق الحسابي",
              "الاختيار يؤثر على التقارير والمصطلحات المستخدمة فقط"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Islamic Finance Structures",
      intro: "In Saudi Arabia most bank financing follows Sharia principles. The difference is not just naming but legal structure, ownership, and risk allocation.",
      cta: "Got it",
      tabs: [
        {
          id: "murabaha",
          label: "Murabaha",
          icon: "🏦",
          content: [
            { type: "heading", text: "What is Murabaha?" },
            { type: "text", text: "Bank purchases the asset (land, materials, equipment) then sells it to the client at cost plus an agreed profit margin. Payment is in installments." },
            { type: "heading", text: "How it works in real estate" },
            { type: "list", items: [
              "Bank purchases land or construction materials on behalf of developer",
              "Sells to developer at cost + profit margin (equivalent to interest rate)",
              "Repayment in installments per agreed schedule",
              "Ownership transfers to developer immediately after sale"
            ]},
            { type: "heading", text: "Difference from conventional loan" },
            { type: "list", items: [
              "Bank momentarily owns the asset before selling - doesn't lend money directly",
              "Profit is fixed and known upfront (doesn't fluctuate)",
              "No 'interest' but 'profit margin' - financial impact is similar",
              "In the financial model: calculations are nearly identical"
            ]}
          ]
        },
        {
          id: "ijara",
          label: "Ijara",
          icon: "📄",
          content: [
            { type: "heading", text: "What is Ijara (Lease-to-Own)?" },
            { type: "text", text: "Bank purchases the asset and leases it to the client. At lease end, ownership transfers to client. During the lease, bank remains legal owner." },
            { type: "heading", text: "How it works in real estate" },
            { type: "list", items: [
              "Bank purchases the property or portion of it",
              "Leases to developer at periodic rent",
              "Rent includes lease portion + principal repayment",
              "At end: developer owns at nominal or zero price"
            ]},
            { type: "heading", text: "Difference from Murabaha" },
            { type: "list", items: [
              "Ijara: bank remains owner throughout the contract",
              "Murabaha: ownership transfers immediately after sale",
              "Ijara better for income-producing assets",
              "Murabaha better for land purchase and construction materials"
            ]}
          ]
        },
        {
          id: "conventional",
          label: "Conventional",
          icon: "💳",
          content: [
            { type: "heading", text: "What is Conventional Finance?" },
            { type: "text", text: "Direct loan from bank to client at interest. Bank doesn't own the asset - only lends money against collateral." },
            { type: "heading", text: "When is it used?" },
            { type: "list", items: [
              "Financing from international banks without Sharia windows",
              "Projects outside Saudi Arabia",
              "Government or international programs with special terms"
            ]},
            { type: "heading", text: "In the financial model" },
            { type: "list", items: [
              "Calculations are identical to Murabaha and Ijara numerically",
              "Only difference is terminology: interest vs profit vs rent",
              "Model treats all three with the same calculation logic"
            ]}
          ]
        }
      ]
    }
  },
  govIncentives: {
    ar: {
      title: "الحوافز الحكومية للتطوير العقاري",
      intro: "الحكومة السعودية تقدم عدة أنواع من الحوافز لتشجيع التطوير العقاري في مناطق معينة أو لقطاعات محددة. هذه الحوافز تؤثر مباشرة على جدوى المشروع وعائد المستثمر.",
      cta: "فهمت",
      tabs: [
        {
          id: "capexGrant",
          label: "منحة CAPEX",
          icon: "🏗",
          content: [
            { type: "heading", text: "ما هي منحة CAPEX؟" },
            { type: "text", text: "الحكومة تدفع نسبة من تكاليف البناء مباشرة للمطور. تخفض التكلفة الفعلية للمشروع وترفع العائد على الاستثمار." },
            { type: "heading", text: "كيف تعمل؟" },
            { type: "list", items: [
              "نسبة محددة من تكلفة البناء (عادة 10% - 30%)",
              "حد أقصى بالريال (مثلاً 50 مليون ريال)",
              "تُصرف خلال البناء (مع مستخلصات المقاول) أو عند الإنجاز",
              "تحتاج استيفاء شروط ومعايير محددة من الجهة المانحة"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "تخفض صافي CAPEX المطلوب تمويله",
              "تقلل حجم الدين أو الـ Equity المطلوب",
              "ترفع IRR مباشرة (لأن التكلفة أقل)",
              "لا تؤثر على الإيرادات - فقط على جانب التكاليف"
            ]},
            { type: "heading", text: "أمثلة" },
            { type: "list", items: [
              "هيئة المدن الاقتصادية: منح للمشاريع في المدن الاقتصادية",
              "صندوق التنمية السياحي: دعم مشاريع الضيافة والسياحة",
              "برنامج جدة التاريخية: حوافز لإعادة تطوير المنطقة التاريخية",
              "وزارة الاستثمار: حوافز للمشاريع الأجنبية المشتركة"
            ]}
          ]
        },
        {
          id: "landRent",
          label: "إعفاء إيجار الأرض",
          icon: "🌍",
          content: [
            { type: "heading", text: "ما هو إعفاء إيجار الأرض؟" },
            { type: "text", text: "الحكومة أو الجهة المالكة تعفي المطور من إيجار الأرض لفترة محددة (عادة فترة البناء + سنوات إضافية) أو تخفض النسبة بشكل كبير." },
            { type: "heading", text: "الأنواع الشائعة" },
            { type: "list", items: [
              "إعفاء كامل: بدون إيجار لمدة محددة (مثلاً 5-10 سنوات)",
              "إعفاء جزئي: تخفيض بنسبة (مثلاً 50% لمدة 7 سنوات)",
              "تدريجي: إعفاء كامل أول 3 سنوات ثم 50% ثم السعر الكامل",
              "مرتبط بالإنجاز: الإعفاء يسري حتى اكتمال البناء"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "يقلل المصاريف التشغيلية في السنوات الأولى",
              "يحسّن التدفقات النقدية أثناء فترة التطوير والتشغيل المبكر",
              "يرفع DSCR في السنوات الأولى (مهم للبنك)",
              "يخفض نقطة التعادل (Break-even)"
            ]},
            { type: "heading", text: "ملاحظات" },
            { type: "list", items: [
              "ينطبق فقط على أراضي الإيجار (Leasehold) وليس الشراء",
              "قد تكون هناك شروط أداء (مثل الانتهاء خلال مدة محددة)",
              "الإيجار بعد انتهاء الإعفاء قد يكون بالسعر الكامل فوراً",
              "يجب حساب القيمة الحالية للوفر لتقييم الأثر الحقيقي"
            ]}
          ]
        },
        {
          id: "finSupport",
          label: "دعم التمويل",
          icon: "💜",
          content: [
            { type: "heading", text: "ما هو دعم التمويل؟" },
            { type: "text", text: "الحكومة تتحمل جزءاً من تكلفة التمويل البنكي (فائدة/ربح) أو تقدم قرضاً ميسراً بشروط أفضل من السوق." },
            { type: "heading", text: "الأنواع" },
            { type: "list", items: [
              "دعم الفائدة: الحكومة تدفع جزء من نسبة الربح (مثلاً 2% من 7%)",
              "قرض ميسّر: قرض بنسبة ربح أقل من السوق وفترة أطول",
              "ضمان حكومي: كفالة حكومية تقلل مخاطر البنك وبالتالي النسبة",
              "تمويل بدون أرباح: نادر لكن متاح لبعض المشاريع الاستراتيجية"
            ]},
            { type: "heading", text: "الأثر على النموذج المالي" },
            { type: "list", items: [
              "يقلل تكلفة خدمة الدين سنوياً",
              "يرفع DSCR ويحسّن الموقف أمام البنك",
              "يخفض نقطة التعادل للمشروع",
              "في الصناديق: يرفع العائد للمستثمرين مباشرة"
            ]},
            { type: "heading", text: "مصادر الدعم في السعودية" },
            { type: "list", items: [
              "صندوق التنمية العقارية: للمشاريع السكنية",
              "صندوق التنمية السياحي: للفنادق والمنتجعات",
              "صندوق التنمية الصناعية: للمشاريع الصناعية واللوجستية",
              "بنك التصدير والاستيراد: للمشاريع ذات البعد التصديري"
            ]}
          ]
        },
        {
          id: "feeRebates",
          label: "استرداد الرسوم",
          icon: "🔄",
          content: [
            { type: "heading", text: "ما هو استرداد الرسوم؟" },
            { type: "text", text: "إعفاء أو تخفيض الرسوم الحكومية المرتبطة بالمشروع مثل رسوم التراخيص وربط الخدمات والضرائب البلدية." },
            { type: "heading", text: "الرسوم التي قد تُعفى" },
            { type: "list", items: [
              "رسوم رخصة البناء",
              "رسوم ربط الكهرباء والمياه والصرف",
              "رسوم الطرق والبنية التحتية",
              "رسوم التصنيف الفندقي والتراخيص السياحية",
              "رسوم بلدية سنوية"
            ]},
            { type: "heading", text: "طريقة الاسترداد" },
            { type: "list", items: [
              "إعفاء مباشر: الرسم لا يُطلب من الأساس",
              "استرداد: المطور يدفع ثم يسترد من الجهة الحكومية",
              "تأجيل: دفع الرسم لاحقاً (مثلاً بعد 3 سنوات) بتخفيض",
              "مقاصة: خصم الرسوم من مستحقات أخرى"
            ]},
            { type: "heading", text: "الأثر على النموذج" },
            { type: "list", items: [
              "يقلل التكاليف الأولية (CAPEX) أو التكاليف التشغيلية",
              "قد يكون مبلغ صغير نسبياً لكنه مؤثر في المشاريع الصغيرة",
              "مهم احتسابه في تحليل الجدوى الشامل",
              "يجب التحقق من الاستمرارية (هل الإعفاء مؤقت أم دائم)"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Government Incentives for Real Estate Development",
      intro: "The Saudi government offers several types of incentives to encourage development in specific areas or sectors. These directly impact project feasibility and investor returns.",
      cta: "Got it",
      tabs: [
        {
          id: "capexGrant",
          label: "CAPEX Grant",
          icon: "🏗",
          content: [
            { type: "heading", text: "What is a CAPEX Grant?" },
            { type: "text", text: "Government pays a percentage of construction costs directly to the developer. Reduces effective project cost and improves ROI." },
            { type: "heading", text: "How it works" },
            { type: "list", items: [
              "Set percentage of construction cost (typically 10-30%)",
              "Capped at a maximum SAR amount",
              "Disbursed during construction or at completion",
              "Requires meeting specific criteria from the granting authority"
            ]},
            { type: "heading", text: "Impact on financial model" },
            { type: "list", items: [
              "Reduces net CAPEX requiring financing",
              "Reduces debt or equity needed",
              "Directly improves IRR (lower cost base)",
              "No impact on revenue - cost side only"
            ]}
          ]
        },
        {
          id: "landRent",
          label: "Land Rent Rebate",
          icon: "🌍",
          content: [
            { type: "heading", text: "What is a Land Rent Rebate?" },
            { type: "text", text: "Government or landowner waives/reduces land rent for a specified period (usually construction + additional years)." },
            { type: "heading", text: "Common types" },
            { type: "list", items: [
              "Full waiver: no rent for a set period (e.g. 5-10 years)",
              "Partial: percentage reduction (e.g. 50% for 7 years)",
              "Graduated: full waiver first 3 years, then 50%, then full price",
              "Completion-linked: waiver until construction is complete"
            ]},
            { type: "heading", text: "Impact" },
            { type: "list", items: [
              "Reduces OPEX in early years",
              "Improves cash flow during development and early operations",
              "Raises DSCR in initial years (important for bank)",
              "Only applies to leasehold land, not purchased"
            ]}
          ]
        },
        {
          id: "finSupport",
          label: "Finance Support",
          icon: "💜",
          content: [
            { type: "heading", text: "What is Finance Support?" },
            { type: "text", text: "Government covers part of bank financing cost (interest/profit) or provides a soft loan at below-market terms." },
            { type: "heading", text: "Types" },
            { type: "list", items: [
              "Interest subsidy: gov pays portion of profit rate",
              "Soft loan: below-market rate with longer tenor",
              "Government guarantee: reduces bank risk and rate",
              "Zero-profit financing: rare, for strategic projects"
            ]},
            { type: "heading", text: "Saudi sources" },
            { type: "list", items: [
              "Real Estate Development Fund: residential projects",
              "Tourism Development Fund: hotels and resorts",
              "Industrial Development Fund: industrial/logistics",
              "Saudi EXIM Bank: export-oriented projects"
            ]}
          ]
        },
        {
          id: "feeRebates",
          label: "Fee Rebates",
          icon: "🔄",
          content: [
            { type: "heading", text: "What are Fee Rebates?" },
            { type: "text", text: "Waiver or reduction of government fees related to the project such as construction permits, utility connections, and municipal charges." },
            { type: "heading", text: "Fees that may be waived" },
            { type: "list", items: [
              "Construction permit fees",
              "Electricity, water, sewage connection fees",
              "Road and infrastructure fees",
              "Hotel classification and tourism licenses",
              "Annual municipal fees"
            ]},
            { type: "heading", text: "Impact" },
            { type: "list", items: [
              "Reduces upfront (CAPEX) or operating costs",
              "May be small in absolute terms but impactful for smaller projects",
              "Must verify if waiver is temporary or permanent"
            ]}
          ]
        }
      ]
    }
  },
  financialMetrics: {
    ar: {
      title: "المقاييس المالية الأساسية",
      intro: "هذه المقاييس هي اللغة المشتركة بين المطورين والبنوك والمستثمرين. فهمها ضروري لتقييم أي مشروع عقاري.",
      cta: "فهمت",
      tabs: [
        {
          id: "irr",
          label: "IRR",
          icon: "📈",
          content: [
            { type: "heading", text: "ما هو IRR (معدل العائد الداخلي)؟" },
            { type: "text", text: "النسبة المئوية السنوية اللي تخلي صافي القيمة الحالية (NPV) للتدفقات النقدية تساوي صفر. ببساطة: كم نسبة العائد السنوي اللي يحققه المشروع فعلياً." },
            { type: "heading", text: "لماذا IRR مهم؟" },
            { type: "list", items: [
              "المقياس الأول اللي يسأل عنه أي مستثمر أو بنك",
              "يأخذ توقيت التدفقات النقدية في الاعتبار (فلوس اليوم أهم من فلوس بكرة)",
              "يسمح بمقارنة مشاريع مختلفة الحجم والمدة",
              "IRR أعلى = المشروع يعيد الفلوس أسرع وبعائد أكبر"
            ]},
            { type: "heading", text: "Unlevered IRR vs Levered IRR" },
            { type: "list", items: [
              "Unlevered (قبل التمويل): عائد المشروع نفسه بدون أي دين. يعكس جودة المشروع المجردة",
              "Levered (بعد التمويل): عائد المشروع بعد خصم خدمة الدين. يعكس العائد الفعلي على رأس المال",
              "عادة Levered > Unlevered بسبب الرافعة المالية (لو المشروع ناجح)",
              "لو Levered < Unlevered: تكلفة الدين تأكل العائد (الرافعة سلبية)"
            ]},
            { type: "heading", text: "معدلات شائعة في السوق السعودي" },
            { type: "list", items: [
              "مشروع عقاري تجاري ناجح: Unlevered 12%-18%",
              "صندوق عقاري (LP): 15%-25%",
              "مشروع فندقي/سياحي: 10%-20% (أعلى مخاطرة)",
              "أقل من 8% عادة غير جاذب للمستثمرين"
            ]},
            { type: "heading", text: "محددات IRR" },
            { type: "list", items: [
              "لا يعكس حجم الربح الفعلي (مشروع صغير ممكن يكون IRR عالي لكن الربح قليل)",
              "يفترض إعادة استثمار التدفقات بنفس النسبة (قد لا يكون واقعي)",
              "حساس جداً لتوقيت التدفقات (تأخير 6 أشهر يغير IRR بشكل كبير)",
              "لذلك نستخدمه مع NPV و MOIC معاً وليس وحده"
            ]}
          ]
        },
        {
          id: "npv",
          label: "NPV",
          icon: "💵",
          content: [
            { type: "heading", text: "ما هو NPV (صافي القيمة الحالية)؟" },
            { type: "text", text: "مجموع كل التدفقات النقدية المستقبلية بعد خصمها بمعدل محدد لتحويلها لقيمتها اليوم. لو NPV موجب = المشروع يحقق عائد أعلى من معدل الخصم." },
            { type: "heading", text: "المعادلة" },
            { type: "text", text: "NPV = مجموع (التدفق النقدي في السنة y ÷ (1 + معدل الخصم) أس y) لكل سنة من 0 إلى نهاية الأفق" },
            { type: "heading", text: "ليش نحسب NPV بـ 10% و 12% و 14%؟" },
            { type: "list", items: [
              "كل معدل خصم يمثل توقع مختلف لتكلفة رأس المال أو العائد المطلوب",
              "10%: تكلفة رأس مال متحفظة — لو NPV موجب، المشروع يتجاوز الحد الأدنى",
              "12%: عائد مطلوب متوسط — المعيار الأكثر استخداماً في السوق السعودي",
              "14%: عائد مطلوب مرتفع — يعكس مشاريع عالية المخاطرة أو مستثمرين يطلبون عائد عالي",
              "لو NPV موجب عند 14%: المشروع ممتاز حتى بأعلى توقعات",
              "لو NPV سالب عند 10%: المشروع ما يحقق الحد الأدنى"
            ]},
            { type: "heading", text: "كيف نقرأ NPV؟" },
            { type: "list", items: [
              "NPV > 0: المشروع يخلق قيمة — يحقق أكثر من معدل الخصم",
              "NPV = 0: المشروع يحقق بالضبط معدل الخصم (IRR = معدل الخصم)",
              "NPV < 0: المشروع يخسر قيمة مقارنة بالبديل",
              "NPV يُقاس بالريال — يعطيك حجم القيمة المضافة وليس فقط النسبة"
            ]},
            { type: "heading", text: "الفرق بين NPV و IRR" },
            { type: "list", items: [
              "IRR يعطي النسبة (%) — NPV يعطي المبلغ (ريال)",
              "IRR أفضل للمقارنة بين مشاريع — NPV أفضل لقرار استثماري واحد",
              "مشروعان بنفس IRR ممكن يكون NPV مختلف جداً (حجم مختلف)",
              "القاعدة: استخدم الاثنين معاً. لا تعتمد على مقياس واحد فقط"
            ]}
          ]
        },
        {
          id: "moic",
          label: "MOIC",
          icon: "✖",
          content: [
            { type: "heading", text: "ما هو MOIC (مضاعف رأس المال)؟" },
            { type: "text", text: "كم مرة ضاعف المستثمر فلوسه. MOIC = إجمالي التوزيعات المستلمة ÷ رأس المال المستثمر. لو MOIC = 2.5x يعني حصل 2.5 ريال لكل ريال استثمره." },
            { type: "heading", text: "نوعان من MOIC" },
            { type: "list", items: [
              "Paid-In MOIC: التوزيعات ÷ رأس المال المدفوع فعلياً (equity calls)",
              "Committed MOIC: التوزيعات ÷ رأس المال الملتزم (equity المتفق عليه)",
              "Paid-In أعلى لأن المدفوع عادة أقل من الملتزم (لو ما تم سحب كل الـ equity)",
              "Committed هو المعيار الأكثر استخداماً في تقارير الصناديق"
            ]},
            { type: "heading", text: "لماذا MOIC مهم مع IRR؟" },
            { type: "list", items: [
              "IRR ممكن يكون عالي لكن MOIC منخفض (مشروع سريع لكن ربح قليل)",
              "MOIC ممكن يكون عالي لكن IRR منخفض (مشروع بطيء لكن ربح كبير)",
              "المستثمر المؤسسي يبحث عن IRR > 15% مع MOIC > 2x كحد أدنى",
              "في الصناديق: GP يهتم بـ IRR (يحدد الأداء)، LP يهتم بـ MOIC (يحدد الربح الفعلي)"
            ]},
            { type: "heading", text: "مثال" },
            { type: "text", text: "استثمرت 10 مليون. بعد 7 سنوات حصلت 35 مليون إجمالي. MOIC = 35 ÷ 10 = 3.5x. يعني 3.5 أضعاف رأس المال. الربح الصافي = 25 مليون (250%)." }
          ]
        },
        {
          id: "dscr",
          label: "DSCR",
          icon: "🏦",
          content: [
            { type: "heading", text: "ما هو DSCR (نسبة تغطية خدمة الدين)؟" },
            { type: "text", text: "كم مرة يغطي دخل المشروع أقساط البنك. DSCR = صافي الدخل التشغيلي ÷ خدمة الدين (أقساط + أرباح). DSCR = 1.5x يعني الدخل يغطي القسط مرة ونصف." },
            { type: "heading", text: "لماذا البنك يهتم بـ DSCR؟" },
            { type: "list", items: [
              "DSCR هو المقياس رقم 1 اللي يحدد هل البنك يوافق على التمويل أو لا",
              "يقيس قدرة المشروع على سداد التزاماته من دخله التشغيلي",
              "DSCR < 1.0x يعني المشروع ما يقدر يسدد أقساطه — إفلاس تقني",
              "DSCR بين 1.0x و 1.2x: خطر — أي انخفاض بسيط يسبب تعثر"
            ]},
            { type: "heading", text: "المعادلة في النموذج" },
            { type: "text", text: "DSCR[y] = (الإيرادات[y] - إيجار الأرض[y]) ÷ خدمة الدين[y]. يُحسب فقط في السنوات اللي فيها خدمة دين (أقساط > 0)." },
            { type: "heading", text: "الحدود المطلوبة في السعودية" },
            { type: "list", items: [
              "الحد الأدنى المقبول: 1.2x (معظم البنوك السعودية)",
              "مريح: 1.5x وأكثر",
              "ممتاز: 2.0x+",
              "البنك قد يشترط DSCR أدنى كـ covenant (شرط تعاقدي)",
              "لو نزل تحت الحد: البنك يقدر يمنع توزيعات أو يطلب سداد مبكر"
            ]},
            { type: "heading", text: "كيف ترفع DSCR؟" },
            { type: "list", items: [
              "زيادة الإيرادات: إشغال أعلى، إيجارات أعلى",
              "تقليل خدمة الدين: تمويل أقل (LTV أقل)، فترة سداد أطول",
              "خفض المصاريف التشغيلية: تحسين كفاءة التشغيل",
              "الحوافز الحكومية: دعم الفائدة يقلل خدمة الدين مباشرة"
            ]}
          ]
        },
        {
          id: "leverage",
          label: "الرافعة المالية",
          icon: "⚖",
          content: [
            { type: "heading", text: "ما هي الرافعة المالية (Leverage)؟" },
            { type: "text", text: "استخدام أموال البنك (دين) لتمويل جزء من المشروع. الفكرة: لو عائد المشروع أعلى من تكلفة الدين، الفرق يذهب كاملاً لصاحب رأس المال." },
            { type: "heading", text: "مثال عملي" },
            { type: "list", items: [
              "مشروع 100M يحقق 15% عائد = 15M ربح",
              "بدون رافعة: استثمرت 100M، عائد 15M = 15% على رأس المال",
              "مع رافعة 70%: استثمرت 30M فقط، البنك 70M بتكلفة 7% = 4.9M",
              "ربحك = 15M - 4.9M = 10.1M على 30M = 33.7% على رأس المال!",
              "الرافعة حولت 15% إلى 33.7% — أكثر من ضعف العائد"
            ]},
            { type: "heading", text: "LTV (نسبة القرض للقيمة)" },
            { type: "list", items: [
              "LTV = حجم الدين ÷ قيمة المشروع",
              "LTV 70% = البنك يموّل 70% والمطور 30%",
              "في السعودية: 50%-70% هو المعتاد للتطوير العقاري",
              "LTV أعلى = رافعة أكبر = عائد أعلى + مخاطرة أعلى",
              "بعض البرامج الحكومية تسمح بـ LTV أعلى (80%-100%)"
            ]},
            { type: "heading", text: "Unlevered vs Levered في النموذج" },
            { type: "list", items: [
              "صافي التدفق غير الممول (Unlevered): إيرادات - إيجار أرض - CAPEX",
              "صافي التدفق الممول (Levered): Unlevered - خدمة الدين + عائدات التخارج",
              "Unlevered IRR = جودة المشروع نفسه (ما علاقته بالتمويل)",
              "Levered IRR = العائد الفعلي على رأس مال المطور/المستثمر"
            ]},
            { type: "heading", text: "متى تكون الرافعة سلبية؟" },
            { type: "list", items: [
              "لو تكلفة الدين أعلى من عائد المشروع",
              "مثال: مشروع عائده 6% وتكلفة الدين 7% = الرافعة تقلل العائد",
              "في هذه الحالة Levered IRR < Unlevered IRR (إشارة خطر)",
              "لذلك: لا تفترض دائماً أن الدين يحسّن العائد"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Core Financial Metrics",
      intro: "These metrics are the common language between developers, banks, and investors. Understanding them is essential for evaluating any real estate project.",
      cta: "Got it",
      tabs: [
        {
          id: "irr",
          label: "IRR",
          icon: "📈",
          content: [
            { type: "heading", text: "What is IRR (Internal Rate of Return)?" },
            { type: "text", text: "The annual percentage rate that makes the NPV of all cash flows equal to zero. Simply: the actual annualized return the project delivers." },
            { type: "heading", text: "Why IRR matters" },
            { type: "list", items: [
              "First metric any investor or bank asks for",
              "Accounts for timing of cash flows (money today > money tomorrow)",
              "Allows comparison across projects of different sizes and durations",
              "Higher IRR = project returns money faster with greater yield"
            ]},
            { type: "heading", text: "Unlevered IRR vs Levered IRR" },
            { type: "list", items: [
              "Unlevered (pre-financing): project return with no debt. Reflects pure project quality",
              "Levered (post-financing): return after debt service. Reflects actual return on equity",
              "Usually Levered > Unlevered due to leverage (if project is successful)",
              "If Levered < Unlevered: debt cost is destroying returns (negative leverage)"
            ]},
            { type: "heading", text: "Saudi market ranges" },
            { type: "list", items: [
              "Successful commercial project: Unlevered 12%-18%",
              "RE Fund (LP): 15%-25%",
              "Hospitality/tourism: 10%-20% (higher risk)",
              "Below 8% usually not attractive to investors"
            ]},
            { type: "heading", text: "IRR limitations" },
            { type: "list", items: [
              "Doesn't reflect absolute profit size",
              "Assumes reinvestment at same rate (may not be realistic)",
              "Very sensitive to cash flow timing",
              "Use together with NPV and MOIC, never alone"
            ]}
          ]
        },
        {
          id: "npv",
          label: "NPV",
          icon: "💵",
          content: [
            { type: "heading", text: "What is NPV (Net Present Value)?" },
            { type: "text", text: "Sum of all future cash flows discounted to today's value. If NPV > 0, the project earns more than the discount rate." },
            { type: "heading", text: "Why calculate NPV at 10%, 12%, and 14%?" },
            { type: "list", items: [
              "Each discount rate represents a different cost of capital expectation",
              "10%: conservative cost of capital — NPV > 0 means project exceeds minimum threshold",
              "12%: mid-range required return — most common benchmark in Saudi market",
              "14%: high required return — reflects higher risk or demanding investors",
              "NPV positive at 14%: excellent project even at highest expectations",
              "NPV negative at 10%: project fails minimum threshold"
            ]},
            { type: "heading", text: "How to read NPV" },
            { type: "list", items: [
              "NPV > 0: project creates value above discount rate",
              "NPV = 0: project earns exactly the discount rate (IRR = discount rate)",
              "NPV < 0: project destroys value vs alternative investment",
              "NPV measured in SAR — gives you the size of value created, not just percentage"
            ]},
            { type: "heading", text: "NPV vs IRR" },
            { type: "list", items: [
              "IRR gives percentage (%) — NPV gives amount (SAR)",
              "IRR better for comparing projects — NPV better for single investment decisions",
              "Two projects with same IRR can have very different NPV (different scales)",
              "Rule: use both together. Never rely on one metric alone"
            ]}
          ]
        },
        {
          id: "moic",
          label: "MOIC",
          icon: "✖",
          content: [
            { type: "heading", text: "What is MOIC (Multiple on Invested Capital)?" },
            { type: "text", text: "How many times the investor multiplied their money. MOIC = Total Distributions / Capital Invested. MOIC of 2.5x means SAR 2.50 received for every SAR 1 invested." },
            { type: "heading", text: "Paid-In vs Committed MOIC" },
            { type: "list", items: [
              "Paid-In: distributions / actual cash contributed (equity calls)",
              "Committed: distributions / originally committed equity",
              "Paid-In is higher because actual calls may be less than commitment",
              "Committed is the more common standard in fund reporting"
            ]},
            { type: "heading", text: "Why MOIC matters alongside IRR" },
            { type: "list", items: [
              "High IRR + low MOIC = fast but small return",
              "Low IRR + high MOIC = slow but large return",
              "Institutional investors typically target IRR > 15% with MOIC > 2x minimum",
              "In funds: GP focuses on IRR (performance), LP focuses on MOIC (actual profit)"
            ]}
          ]
        },
        {
          id: "dscr",
          label: "DSCR",
          icon: "🏦",
          content: [
            { type: "heading", text: "What is DSCR (Debt Service Coverage Ratio)?" },
            { type: "text", text: "How many times project income covers bank payments. DSCR = NOI / Debt Service. DSCR of 1.5x means income covers payments 1.5 times." },
            { type: "heading", text: "Why banks care about DSCR" },
            { type: "list", items: [
              "Primary metric determining loan approval",
              "Measures project's ability to service debt from operations",
              "DSCR < 1.0x means project cannot pay its obligations — technical default",
              "Between 1.0x-1.2x: danger zone — any dip causes default"
            ]},
            { type: "heading", text: "Saudi bank requirements" },
            { type: "list", items: [
              "Minimum acceptable: 1.2x (most Saudi banks)",
              "Comfortable: 1.5x+",
              "Excellent: 2.0x+",
              "Bank may set DSCR floor as covenant",
              "Below floor: bank can block distributions or demand early repayment"
            ]}
          ]
        },
        {
          id: "leverage",
          label: "Leverage",
          icon: "⚖",
          content: [
            { type: "heading", text: "What is Financial Leverage?" },
            { type: "text", text: "Using bank debt to finance part of the project. If project return exceeds debt cost, the difference goes entirely to equity holders, amplifying their return." },
            { type: "heading", text: "LTV (Loan-to-Value)" },
            { type: "list", items: [
              "LTV = Debt / Project Value",
              "LTV 70% = bank funds 70%, developer 30%",
              "Saudi standard: 50%-70% for RE development",
              "Higher LTV = more leverage = higher return + higher risk"
            ]},
            { type: "heading", text: "Unlevered vs Levered in the model" },
            { type: "list", items: [
              "Unlevered CF: income - land rent - CAPEX",
              "Levered CF: Unlevered - debt service + exit proceeds",
              "Unlevered IRR = pure project quality",
              "Levered IRR = actual return on equity invested"
            ]},
            { type: "heading", text: "When leverage is negative" },
            { type: "list", items: [
              "If debt cost exceeds project return",
              "Example: 6% project return with 7% debt cost = leverage reduces return",
              "Signal: Levered IRR < Unlevered IRR (red flag)"
            ]}
          ]
        }
      ]
    }
  },
  scenarioAnalysis: {
    ar: {
      title: "تحليل السيناريوهات - الدليل الكامل",
      intro: "تحليل السيناريوهات يجيب على سؤال واحد: ماذا لو؟ يختبر مرونة المشروع أمام التغيرات المحتملة قبل ما تحصل فعلياً.",
      cta: "فهمت",
      tabs: [
        {
          id: "what",
          label: "ما هو؟",
          icon: "📊",
          content: [
            { type: "heading", text: "ما هو تحليل السيناريوهات؟" },
            { type: "text", text: "أداة تختبر أداء المشروع المالي تحت ظروف مختلفة. بدل ما تعتمد على رقم واحد (الحالة الأساسية)، تشوف كيف تتغير النتائج لو تغيرت الافتراضات." },
            { type: "heading", text: "لماذا هو مهم؟" },
            { type: "list", items: [
              "البنك يطلبه قبل الموافقة على التمويل (اختبار إجهاد)",
              "المستثمر يبي يعرف أسوأ حالة قبل ما يستثمر",
              "المطور يحتاجه لتحديد المخاطر الحقيقية واتخاذ قرارات مدروسة",
              "يكشف ايش المتغيرات اللي تأثر أكثر على العائد (أيها أخطر)"
            ]},
            { type: "heading", text: "3 أدوات في هذه الصفحة" },
            { type: "list", items: [
              "مقارنة السيناريوهات: 8 سيناريوهات جاهزة جنب بعض. سريعة وواضحة",
              "جدول الحساسية: يغير متغيرين في نفس الوقت ويعرض الأثر في شبكة ملونة",
              "نقطة التعادل: يحسب الحد الأدنى لكل متغير قبل ما يخسر المشروع"
            ]}
          ]
        },
        {
          id: "scenarios",
          label: "الثمانية",
          icon: "🔢",
          content: [
            { type: "heading", text: "لماذا هذه السيناريوهات بالذات؟" },
            { type: "text", text: "هذه الثمانية تغطي أكثر المخاطر شيوعاً في التطوير العقاري السعودي. كل واحد يختبر متغير مختلف:" },
            { type: "heading", text: "CAPEX +10% (زيادة التكاليف)" },
            { type: "list", items: [
              "ايش يختبر: تكاليف البناء ارتفعت 10% عن المتوقع",
              "متى يحصل: ارتفاع أسعار مواد البناء، تغيير التصاميم، أو ظروف موقع غير متوقعة",
              "الأثر: يقلل IRR ويزيد رأس المال المطلوب",
              "في السعودية: شائع مع ارتفاع أسعار الحديد والخرسانة في فترات الطلب العالي"
            ]},
            { type: "heading", text: "CAPEX -10% (انخفاض التكاليف)" },
            { type: "list", items: [
              "ايش يختبر: التكاليف أقل من المتوقع (تفاوض جيد أو سوق مواد منخفض)",
              "الأثر: يرفع IRR ويقلل الدين المطلوب",
              "مهم لأنه يوضح حجم تأثير التكاليف على الجدوى"
            ]},
            { type: "heading", text: "Rent +10% / -10% (تغير الإيجارات)" },
            { type: "list", items: [
              "ايش يختبر: الإيرادات أعلى أو أقل من المتوقع",
              "متى يحصل: تغير العرض والطلب في السوق، دخول منافسين، تحسن الموقع",
              "الأثر: يؤثر على كامل فترة المشروع (ليس سنة واحدة)",
              "-10% هو اختبار الإجهاد الأهم — لو المشروع ينجح مع إيجارات أقل 10%، فيه هامش أمان"
            ]},
            { type: "heading", text: "Delay +6 months (تأخير البناء)" },
            { type: "list", items: [
              "ايش يختبر: البناء يتأخر 6 أشهر عن الجدول",
              "متى يحصل: مشاكل تصاريح، تأخر مقاول، ظروف طقس",
              "الأثر: يؤخر الإيرادات 6 أشهر لكن التكاليف الثابتة (إيجار أرض، فوائد) تستمر",
              "يقلل IRR بشكل كبير لأن التوقيت مهم جداً في حسابات العائد"
            ]},
            { type: "heading", text: "Esc +0.5% / -0.5% (تغير التصاعد)" },
            { type: "list", items: [
              "ايش يختبر: الزيادة السنوية في الإيجارات أعلى أو أقل بنصف نقطة",
              "الأثر: يبدو صغير لكنه يتراكم على 20-50 سنة (أثر تراكمي ضخم)",
              "+0.5% على 30 سنة ممكن يزيد إجمالي الإيرادات 15-25%",
              "مهم جداً لمشاريع الاحتفاظ طويلة المدة (Hold strategy)"
            ]}
          ]
        },
        {
          id: "read",
          label: "كيف تقرأ",
          icon: "👁",
          content: [
            { type: "heading", text: "كيف تقرأ جدول المقارنة" },
            { type: "list", items: [
              "العمود الأول (أزرق): الحالة الأساسية — هذا المرجع",
              "أخضر: أفضل من الحالة الأساسية",
              "أحمر: أسوأ من الحالة الأساسية",
              "قارن الفرق: كم تغير IRR أو NPV من الحالة الأساسية؟"
            ]},
            { type: "heading", text: "ايش أول شي تشوفه؟" },
            { type: "list", items: [
              "سطر Unlevered IRR: هل يبقى فوق 10% في أسوأ حالة؟",
              "سطر NPV @10%: هل يبقى موجب في كل السيناريوهات؟",
              "لو NPV سالب في أي سيناريو: المشروع حساس لهذا المتغير",
              "لو Levered IRR ينزل تحت 8%: البنك قد يرفض التمويل"
            ]},
            { type: "heading", text: "مثال عملي" },
            { type: "text", text: "IRR الأساسي 15%. في سيناريو CAPEX +10% نزل لـ 12%. في Rent -10% نزل لـ 9%. هذا يعني: المشروع حساس للإيرادات أكثر من التكاليف. لازم تركز على تأمين عقود إيجار قبل البناء." },
            { type: "heading", text: "كيف تقرأ جدول الحساسية" },
            { type: "list", items: [
              "كل خلية = نتيجة تغيير متغيرين في نفس الوقت",
              "الخلية الزرقاء = الحالة الأساسية (بدون تغيير)",
              "أخضر = IRR فوق 15% (ممتاز) أو NPV موجب",
              "أصفر = IRR بين 10%-15% (مقبول)",
              "أحمر = IRR تحت 0% أو NPV سالب (خطر)",
              "الزاوية العليا اليسرى = أسوأ حالة (المتغيرين سلبيين)",
              "الزاوية السفلى اليمنى = أفضل حالة (المتغيرين إيجابيين)"
            ]},
            { type: "heading", text: "كيف تقرأ نقطة التعادل" },
            { type: "list", items: [
              "نقطة تعادل الإشغال 60% يعني: المشروع يربح حتى لو 40% من المساحة فاضية",
              "تحمل انخفاض الإيجار -25% يعني: الإيجارات ممكن تنزل ربع وما يخسر",
              "تحمل زيادة تكاليف +20% يعني: التكاليف ممكن تزيد 20% وما يخسر",
              "القاعدة: هامش أمان فوق 30% = مريح. تحت 15% = خطر"
            ]}
          ]
        },
        {
          id: "bank",
          label: "للبنك",
          icon: "🏦",
          content: [
            { type: "heading", text: "ايش يبي البنك يشوف؟" },
            { type: "text", text: "البنك يستخدم تحليل السيناريوهات كـ 'اختبار إجهاد' (Stress Test). يبي يتأكد إن المشروع يقدر يسدد القرض حتى في أسوأ الظروف." },
            { type: "heading", text: "اختبارات البنك النموذجية" },
            { type: "list", items: [
              "DSCR في سيناريو Rent -10%: هل يبقى فوق 1.2x؟",
              "DSCR في سيناريو Delay +6mo: هل التأخير يكسر covenant؟",
              "NPV في أسوأ حالة: هل المشروع يبقى مجدي؟",
              "Combined stress: ماذا لو CAPEX +10% مع Rent -10% معاً؟"
            ]},
            { type: "heading", text: "كيف تجهز عرض البنك" },
            { type: "list", items: [
              "اعرض الحالة الأساسية أولاً مع IRR و DSCR",
              "ثم اعرض أسوأ حالتين وبيّن أن المشروع يتحمل",
              "أبرز هامش الأمان: الفرق بين الأداء الحالي ونقطة التعادل",
              "لو المشروع يتحمل Rent -15% وما زال DSCR > 1.2x: هذا قوي",
              "استخدم جدول الحساسية لإظهار نطاق واسع من الاحتمالات"
            ]},
            { type: "heading", text: "نصائح عملية" },
            { type: "list", items: [
              "لا تعرض سيناريوهات إيجابية فقط — البنك يفقد الثقة",
              "كن صريح مع المخاطر وبيّن كيف تعالجها",
              "فلتر حسب المرحلة لو عندك مشروع متعدد المراحل — البنك يموّل مرحلة مرحلة",
              "تقرير البنك في تبويب التقارير يسحب هذه البيانات تلقائياً"
            ]}
          ]
        }
      ]
    },
    en: {
      title: "Scenario Analysis - Complete Guide",
      intro: "Scenario analysis answers one question: What if? It tests project resilience against potential changes before they happen.",
      cta: "Got it",
      tabs: [
        {
          id: "what",
          label: "What is it?",
          icon: "📊",
          content: [
            { type: "heading", text: "What is Scenario Analysis?" },
            { type: "text", text: "A tool that tests financial performance under different conditions. Instead of relying on a single number (base case), you see how results change when assumptions change." },
            { type: "heading", text: "Why it matters" },
            { type: "list", items: [
              "Banks require it before loan approval (stress testing)",
              "Investors want to see downside before committing",
              "Developers need it to identify real risks and make informed decisions",
              "Reveals which variables impact returns the most (which are most dangerous)"
            ]},
            { type: "heading", text: "3 tools on this page" },
            { type: "list", items: [
              "Scenario Comparison: 8 built-in scenarios side by side. Quick and clear",
              "Sensitivity Table: changes 2 variables simultaneously in a color-coded grid",
              "Break-Even: calculates the minimum threshold for each variable"
            ]}
          ]
        },
        {
          id: "scenarios",
          label: "The Eight",
          icon: "🔢",
          content: [
            { type: "heading", text: "Why these 8 scenarios?" },
            { type: "text", text: "They cover the most common risks in Saudi RE development. Each tests a different variable:" },
            { type: "heading", text: "CAPEX +10% / -10%" },
            { type: "list", items: [
              "Tests: construction costs higher/lower than expected",
              "When it happens: material price changes, design changes, site conditions",
              "Impact: directly affects IRR and capital requirements",
              "Common in Saudi during high-demand periods (steel/concrete price surges)"
            ]},
            { type: "heading", text: "Rent +10% / -10%" },
            { type: "list", items: [
              "Tests: revenue higher/lower than projected",
              "Impact: affects entire project duration, not just one year",
              "-10% is the most important stress test — if project survives with 10% less rent, there's safety margin"
            ]},
            { type: "heading", text: "Delay +6 months" },
            { type: "list", items: [
              "Tests: construction delayed by 6 months",
              "Impact: delays revenue while fixed costs (land rent, interest) continue",
              "Reduces IRR significantly because timing matters greatly in return calculations"
            ]},
            { type: "heading", text: "Escalation +/-0.5%" },
            { type: "list", items: [
              "Tests: annual rent growth higher/lower by 0.5 percentage points",
              "Seems small but compounds over 20-50 years (massive cumulative effect)",
              "+0.5% over 30 years can increase total revenue 15-25%"
            ]}
          ]
        },
        {
          id: "read",
          label: "How to read",
          icon: "👁",
          content: [
            { type: "heading", text: "Reading the comparison table" },
            { type: "list", items: [
              "First column (blue): Base Case — this is your reference",
              "Green: better than base case",
              "Red: worse than base case",
              "Check: does IRR stay above 10% in worst case? Does NPV stay positive?"
            ]},
            { type: "heading", text: "Reading the sensitivity table" },
            { type: "list", items: [
              "Each cell = result of changing 2 variables simultaneously",
              "Blue cell = base case (no change)",
              "Green = IRR above 15% or NPV positive",
              "Red = IRR below 0% or NPV negative",
              "Top-left corner = worst case. Bottom-right = best case"
            ]},
            { type: "heading", text: "Reading break-even" },
            { type: "list", items: [
              "Occupancy break-even 60% means: project profits even with 40% vacancy",
              "Rent tolerance -25% means: rents can drop 25% without losing money",
              "Rule: safety margin above 30% = comfortable. Below 15% = risky"
            ]}
          ]
        },
        {
          id: "bank",
          label: "For banks",
          icon: "🏦",
          content: [
            { type: "heading", text: "What banks want to see" },
            { type: "text", text: "Banks use scenario analysis as stress testing. They want to confirm the project can service debt even under adverse conditions." },
            { type: "heading", text: "Typical bank stress tests" },
            { type: "list", items: [
              "DSCR in Rent -10% scenario: stays above 1.2x?",
              "DSCR in Delay +6mo: does delay break the covenant?",
              "Combined stress: what if CAPEX +10% AND Rent -10% together?",
              "NPV in worst case: does project remain viable?"
            ]},
            { type: "heading", text: "Preparing a bank presentation" },
            { type: "list", items: [
              "Show base case first with IRR and DSCR",
              "Then show 2 worst cases and prove project survives",
              "Highlight safety margins: gap between current and break-even",
              "Don't show only positive scenarios — banks lose trust",
              "Use sensitivity table to show a wide range of outcomes"
            ]}
          ]
        }
      ]
    }
  },
  // Future: revenueTypes
  projectTypes: {
    ar: {
      title: "أنواع المشاريع العقارية",
      intro: "كل نوع مشروع له نموذج إيرادات مختلف وطريقة حساب مختلفة في النموذج المالي. فهم الفرق أساسي قبل بناء النموذج.",
      cta: "فهمت",
      tabs: [
        { id: "residential", label: "سكني", icon: "🏘", content: [
          { type: "heading", text: "المشاريع السكنية (إيجار)" },
          { type: "text", text: "مجمعات سكنية، أبراج، فلل - الإيراد من الإيجار الشهري/السنوي للوحدات." },
          { type: "heading", text: "المدخلات الأساسية" },
          { type: "list", items: ["سعر الإيجار لكل متر مربع (SAR/sqm/year)", "نسبة الإشغال المستهدفة (عادة 85-95%)", "فترة التأجير التدريجي (Ramp-up) - عادة 2-3 سنوات", "نسبة الكفاءة (المساحة المؤجرة من GFA) - عادة 80-90%", "معدل زيادة الإيجار السنوي (0.5-2%)"] },
          { type: "heading", text: "أرقام مرجعية - السوق السعودي" },
          { type: "list", items: ["إيجار الشقق (الرياض): 600-1,200 SAR/sqm/سنة", "إيجار الفلل (الرياض): 400-800 SAR/sqm/سنة", "نسبة الشغور الطبيعية: 5-15%", "تكلفة البناء: 2,500-3,500 SAR/sqm"] },
          { type: "heading", text: "نصائح للنمذجة" },
          { type: "list", items: ["ابدأ بإشغال منخفض في السنوات الأولى ثم ارفعه تدريجياً", "احسب مصاريف الصيانة (عادة 5-8% من الإيرادات)", "لا تنسَ فترة البناء - لا إيرادات خلالها"] }
        ]},
        { id: "commercial", label: "تجاري", icon: "🏢", content: [
          { type: "heading", text: "المشاريع التجارية (مولات ومكاتب)" },
          { type: "text", text: "مراكز تسوق، أبراج مكتبية - الإيراد من إيجار المساحات التجارية. عادة أعلى إيجار من السكني لكن أبطأ في التأجير." },
          { type: "heading", text: "الفرق عن السكني" },
          { type: "list", items: ["إيجارات أعلى (1,500-3,000 SAR/sqm لمولات رئيسية)", "فترة تأجير أطول (3-5 سنوات لملء المول)", "عقود إيجار أطول (5-10 سنوات) توفر استقرار", "مساهمة المستأجر في التجهيز (Fit-out Contribution) شائعة", "بعض المولات تأخذ نسبة من مبيعات المستأجر (Turnover Rent)"] },
          { type: "heading", text: "تصنيف المكاتب" },
          { type: "list", items: ["Grade A: 900-1,500 SAR/sqm - أبراج رئيسية (KAFD, العليا)", "Grade B: 500-900 SAR/sqm - مباني جيدة في مواقع ثانوية", "Grade C: 300-500 SAR/sqm - مباني قديمة أو مواقع بعيدة"] }
        ]},
        { id: "hospitality", label: "فندقي", icon: "🏨", content: [
          { type: "heading", text: "المشاريع الفندقية" },
          { type: "text", text: "فنادق ومنتجعات - النموذج الأكثر تعقيداً لأنه يتضمن قائمة أرباح وخسائر تشغيلية كاملة (P&L)." },
          { type: "heading", text: "مكونات الإيرادات" },
          { type: "list", items: ["إيرادات الغرف (عادة 65-75% من الإجمالي): عدد الغرف × ADR × الإشغال × 365", "المأكولات والمشروبات F&B (عادة 18-25%)", "المؤتمرات MICE (عادة 3-5%)", "إيرادات أخرى (سبا، مواقف، غسيل) - عادة 2-5%"] },
          { type: "heading", text: "المصاريف التشغيلية" },
          { type: "list", items: ["مصاريف الغرف: 20-25% من إيرادات الغرف", "مصاريف F&B: 55-65% من إيرادات F&B", "المصاريف غير الموزعة: 25-30% من الإيرادات", "المصاريف الثابتة: 8-12% من الإيرادات", "رسوم الإدارة: 3-5% من الإيرادات + حوافز"] },
          { type: "heading", text: "أرقام مرجعية - السعودية" },
          { type: "list", items: ["ADR فندق 5 نجوم (الرياض): 800-1,500 SAR", "ADR فندق 4 نجوم: 400-700 SAR", "إشغال مستقر: 65-75%", "تكلفة بناء فندق 5 نجوم: 10,000-15,000 SAR/sqm", "هامش EBITDA: 30-40% من الإيرادات"] }
        ]},
        { id: "mixeduse", label: "متعدد الاستخدامات", icon: "🌊", content: [
          { type: "heading", text: "المشاريع متعددة الاستخدامات (Mixed-Use)" },
          { type: "text", text: "تجمع عدة أنواع أصول في مشروع واحد - مثل الواجهة البحرية: مول + فندق + مكاتب + سكني + مارينا. كل مكون يُنمذج بشكل مستقل ثم يُجمع." },
          { type: "heading", text: "لماذا المشاريع المختلطة؟" },
          { type: "list", items: ["تنويع مصادر الدخل يقلل المخاطر", "المكونات تدعم بعضها (الفندق يخدم المول والمارينا)", "أفضل استغلال للأرض وتعظيم العائد", "جاذبية أعلى للمستثمرين والبنوك"] },
          { type: "heading", text: "كيف تُنمذج في المنصة" },
          { type: "list", items: ["كل أصل (Asset) يُضاف كصف مستقل في جدول الأصول", "كل أصل ينتمي لمرحلة (Phase) محددة", "المحرك يحسب CAPEX والإيرادات لكل أصل على حدة", "التدفق النقدي يُجمع على مستوى المرحلة ثم المشروع ككل", "مثال: الواجهة البحرية = 6 أصول × مرحلتين = 12 حساب مستقل"] }
        ]}
      ]
    },
    en: {
      title: "Real Estate Project Types",
      intro: "Each project type has a different revenue model and calculation method. Understanding these differences is essential before building a financial model.",
      cta: "Got it",
      tabs: [
        { id: "residential", label: "Residential", icon: "🏘", content: [
          { type: "heading", text: "Residential Projects (Rental)" },
          { type: "text", text: "Compounds, towers, villas - revenue from monthly/annual unit rentals." },
          { type: "heading", text: "Key Inputs" },
          { type: "list", items: ["Rent per sqm (SAR/sqm/year)", "Target occupancy (typically 85-95%)", "Ramp-up period - usually 2-3 years", "Efficiency ratio (leasable area from GFA) - typically 80-90%", "Annual rent escalation (0.5-2%)"] },
          { type: "heading", text: "Saudi Market Benchmarks" },
          { type: "list", items: ["Apartment rent (Riyadh): 600-1,200 SAR/sqm/year", "Villa rent (Riyadh): 400-800 SAR/sqm/year", "Natural vacancy: 5-15%", "Construction cost: 2,500-3,500 SAR/sqm"] },
          { type: "heading", text: "Modeling Tips" },
          { type: "list", items: ["Start with low occupancy in early years, ramp up gradually", "Factor in maintenance costs (typically 5-8% of revenue)", "Remember: no revenue during construction period"] }
        ]},
        { id: "commercial", label: "Commercial", icon: "🏢", content: [
          { type: "heading", text: "Commercial Projects (Malls & Offices)" },
          { type: "text", text: "Shopping centers, office towers - revenue from commercial space leasing. Typically higher rents than residential but slower to fill." },
          { type: "heading", text: "Differences from Residential" },
          { type: "list", items: ["Higher rents (1,500-3,000 SAR/sqm for prime malls)", "Longer lease-up period (3-5 years to fill a mall)", "Longer lease terms (5-10 years) provide stability", "Tenant fit-out contributions are common", "Some malls take turnover rent (% of tenant sales)"] },
          { type: "heading", text: "Office Classification" },
          { type: "list", items: ["Grade A: 900-1,500 SAR/sqm - prime towers (KAFD, Olaya)", "Grade B: 500-900 SAR/sqm - good buildings in secondary locations", "Grade C: 300-500 SAR/sqm - older buildings or distant locations"] }
        ]},
        { id: "hospitality", label: "Hospitality", icon: "🏨", content: [
          { type: "heading", text: "Hospitality Projects" },
          { type: "text", text: "Hotels and resorts - the most complex model type because it includes a full operating P&L statement." },
          { type: "heading", text: "Revenue Components" },
          { type: "list", items: ["Room revenue (usually 65-75% of total): Keys × ADR × Occupancy × 365", "F&B revenue (usually 18-25%)", "MICE/conferences (usually 3-5%)", "Other revenue (spa, parking, laundry) - usually 2-5%"] },
          { type: "heading", text: "Operating Expenses" },
          { type: "list", items: ["Room expenses: 20-25% of room revenue", "F&B expenses: 55-65% of F&B revenue", "Undistributed expenses: 25-30% of revenue", "Fixed charges: 8-12% of revenue", "Management fees: 3-5% of revenue + incentives"] },
          { type: "heading", text: "Saudi Benchmarks" },
          { type: "list", items: ["5-star ADR (Riyadh): 800-1,500 SAR", "4-star ADR: 400-700 SAR", "Stabilized occupancy: 65-75%", "5-star construction cost: 10,000-15,000 SAR/sqm", "EBITDA margin: 30-40% of revenue"] }
        ]},
        { id: "mixeduse", label: "Mixed-Use", icon: "🌊", content: [
          { type: "heading", text: "Mixed-Use Projects" },
          { type: "text", text: "Multiple asset types in one project - like Haseef Waterfront: mall + hotel + offices + residential + marina. Each component is modeled independently then consolidated." },
          { type: "heading", text: "Why Mixed-Use?" },
          { type: "list", items: ["Revenue diversification reduces risk", "Components support each other (hotel serves mall and marina)", "Better land utilization and return maximization", "Higher attractiveness for investors and banks"] },
          { type: "heading", text: "How to Model in the Platform" },
          { type: "list", items: ["Each asset is added as a separate row in the Asset Table", "Each asset belongs to a specific Phase", "Engine calculates CAPEX and revenue per asset independently", "Cash flow is consolidated at phase then project level", "Example: Haseef Waterfront = 6 assets × 2 phases = 12 independent calculations"] }
        ]}
      ]
    }
  },
  bankPack: {
    ar: {
      title: "حزمة تقديم البنك",
      intro: "البنك يحتاج حزمة مستندات مالية محددة قبل الموافقة على التمويل. فهم ما يبحث عنه البنك يساعدك في تجهيز طلب أقوى.",
      cta: "فهمت",
      tabs: [
        { id: "overview", label: "نظرة عامة", icon: "🏦", content: [
          { type: "heading", text: "ما هي حزمة البنك؟" },
          { type: "text", text: "مجموعة مستندات مالية يطلبها البنك لدراسة طلب التمويل. تشمل دراسة المشروع، طلب التمويل، النطاق المالي، والتدفقات النقدية." },
          { type: "heading", text: "المكونات الرئيسية" },
          { type: "list", items: ["1. دراسة المشروع (Project Study): وصف المشروع، الموقع، المكونات، الجدول الزمني", "2. طلب التمويل (Financing Request): المبلغ المطلوب، الشروط المقترحة، الضمانات", "3. النطاق المالي (Financial Scope): إجمالي التكاليف، مصادر التمويل، هيكل رأس المال", "4. التدفقات النقدية (Cash Flow): 10+ سنوات توقعات إيرادات ومصاريف وخدمة دين"] },
          { type: "heading", text: "أول شيء يبحث عنه البنك" },
          { type: "list", items: ["DSCR - نسبة تغطية خدمة الدين (يجب > 1.2x)", "LTV - نسبة القرض إلى القيمة (عادة لا تتجاوز 70%)", "مساهمة المطور - البنك يريد skin in the game", "ضمانات عينية (رهن عقاري) أو كفالات شخصية", "سجل المطور السابق في مشاريع مماثلة"] }
        ]},
        { id: "dscr", label: "DSCR", icon: "📊", content: [
          { type: "heading", text: "نسبة تغطية خدمة الدين (DSCR)" },
          { type: "text", text: "أهم رقم في حزمة البنك. يقيس قدرة المشروع على سداد أقساط القرض من دخله التشغيلي." },
          { type: "heading", text: "كيف تُحسب؟" },
          { type: "text", text: "DSCR = صافي الدخل التشغيلي (NOI) ÷ خدمة الدين السنوية (أصل + ربح)" },
          { type: "heading", text: "ماذا تعني الأرقام؟" },
          { type: "list", items: ["أقل من 1.0x: المشروع لا يغطي أقساطه - مرفوض", "1.0x - 1.2x: يغطي بالكاد - خطر عالي", "1.2x - 1.5x: مقبول لمعظم البنوك السعودية", "1.5x - 2.0x: مريح - شروط أفضل ممكنة", "أكثر من 2.0x: ممتاز - أقل معدل ربح وأقل ضمانات"] },
          { type: "heading", text: "متطلبات البنوك السعودية" },
          { type: "list", items: ["الحد الأدنى عادة 1.2x (بعض البنوك 1.25x)", "البنك قد يشترط الحفاظ على DSCR طوال فترة القرض", "كسر DSCR covenant يعطي البنك حق تسريع السداد", "البنك يختبر DSCR تحت سيناريوهات ضغط (إشغال -10%, إيجار -15%)"] }
        ]},
        { id: "presentation", label: "كيف تقدم", icon: "📋", content: [
          { type: "heading", text: "نصائح لتقديم حزمة بنك ناجحة" },
          { type: "list", items: ["ابدأ بملخص تنفيذي من صفحة واحدة: المشروع، التكلفة، المبلغ المطلوب، DSCR", "قدّم 3 سيناريوهات: أساسي + متفائل + متشائم - أثبت أن المشروع ينجو حتى في الأسوأ", "استخدم جداول حساسية: وضّح كيف يتغير DSCR مع تغير الإشغال والإيجار", "أظهر خبرة المطور: مشاريع سابقة ناجحة تبني ثقة البنك", "كن واقعياً: لا تبالغ في الإشغال أو الإيجارات - البنك سيتحقق من السوق"] },
          { type: "heading", text: "أخطاء شائعة" },
          { type: "list", items: ["تقديم سيناريو واحد فقط (البنك يشك أنك تخفي المخاطر)", "إشغال 100% من السنة الأولى (غير واقعي)", "عدم احتساب فترة البناء بدون دخل", "نسيان رسوم ترتيب القرض وتكاليف التمويل", "عدم إظهار مصدر مساهمة المطور في رأس المال"] }
        ]}
      ]
    },
    en: {
      title: "Bank Submission Pack",
      intro: "Banks require a specific set of financial documents before approving financing. Understanding what banks look for helps you prepare a stronger application.",
      cta: "Got it",
      tabs: [
        { id: "overview", label: "Overview", icon: "🏦", content: [
          { type: "heading", text: "What is a Bank Pack?" },
          { type: "text", text: "A set of financial documents required by banks to evaluate financing requests. Includes project study, financing request, financial scope, and cash flow projections." },
          { type: "heading", text: "Key Components" },
          { type: "list", items: ["1. Project Study: project description, location, components, timeline", "2. Financing Request: amount needed, proposed terms, collateral", "3. Financial Scope: total costs, funding sources, capital structure", "4. Cash Flow: 10+ year projections of revenue, expenses, and debt service"] },
          { type: "heading", text: "What Banks Look For First" },
          { type: "list", items: ["DSCR - Debt Service Coverage Ratio (must be > 1.2x)", "LTV - Loan to Value ratio (typically max 70%)", "Developer contribution - banks want skin in the game", "Collateral (real estate mortgage) or personal guarantees", "Developer's track record in similar projects"] }
        ]},
        { id: "dscr", label: "DSCR Deep Dive", icon: "📊", content: [
          { type: "heading", text: "Debt Service Coverage Ratio (DSCR)" },
          { type: "text", text: "The most important number in a bank pack. Measures the project's ability to pay loan installments from operating income." },
          { type: "heading", text: "Formula" },
          { type: "text", text: "DSCR = Net Operating Income (NOI) ÷ Annual Debt Service (Principal + Profit)" },
          { type: "heading", text: "What the Numbers Mean" },
          { type: "list", items: ["Below 1.0x: Project can't cover payments - rejected", "1.0x - 1.2x: Barely covers - high risk", "1.2x - 1.5x: Acceptable for most Saudi banks", "1.5x - 2.0x: Comfortable - better terms possible", "Above 2.0x: Excellent - lowest rate and fewer covenants"] },
          { type: "heading", text: "Saudi Bank Requirements" },
          { type: "list", items: ["Minimum typically 1.2x (some banks require 1.25x)", "Bank may require maintaining DSCR throughout loan tenor", "Breaking DSCR covenant gives bank right to accelerate repayment", "Banks stress-test DSCR with adverse scenarios (occupancy -10%, rent -15%)"] }
        ]},
        { id: "presentation", label: "How to Present", icon: "📋", content: [
          { type: "heading", text: "Tips for a Successful Bank Submission" },
          { type: "list", items: ["Start with a one-page executive summary: project, cost, amount requested, DSCR", "Present 3 scenarios: base + optimistic + pessimistic - prove project survives the worst case", "Use sensitivity tables: show how DSCR changes with occupancy and rent variations", "Show developer experience: successful past projects build bank confidence", "Be realistic: don't inflate occupancy or rents - the bank will verify with market data"] },
          { type: "heading", text: "Common Mistakes" },
          { type: "list", items: ["Presenting only one scenario (bank suspects you're hiding risks)", "100% occupancy from Year 1 (unrealistic)", "Ignoring construction period with no income", "Forgetting loan arrangement fees and financing costs", "Not showing source of developer's equity contribution"] }
        ]}
      ]
    }
  },
  quickStart: {
    ar: {
      title: "دليل البداية السريعة",
      intro: "خطوات عملية لإنشاء أول نموذج مالي لك في أقل من 10 دقائق.",
      cta: "يلا نبدأ!",
      tabs: [
        { id: "step1", label: "الخطوة 1: المشروع", icon: "1️⃣", content: [
          { type: "heading", text: "أنشئ مشروع جديد" },
          { type: "list", items: ["اضغط \"+ مشروع جديد\" في صفحة المشاريع", "اختر قالب يناسب مشروعك (واجهة بحرية، سكني، تجاري، فندق) أو ابدأ فارغ", "سيفتح المعالج السريع (Quick Setup Wizard) - 4 خطوات سريعة"] },
          { type: "heading", text: "المعالج السريع يسألك عن:" },
          { type: "list", items: ["1. اسم المشروع والموقع", "2. نوع الأرض (إيجار أو شراء أو شراكة)", "3. آلية التمويل (ذاتي، بنكي، دين+ملكية، صندوق)", "4. استراتيجية التخارج (بيع، احتفاظ)"] },
          { type: "heading", text: "نصيحة" },
          { type: "text", text: "لا تقلق من الاختيارات - كل شيء قابل للتعديل لاحقاً من الشريط الجانبي." }
        ]},
        { id: "step2", label: "الخطوة 2: الأصول", icon: "2️⃣", content: [
          { type: "heading", text: "أضف أصولك" },
          { type: "text", text: "انتقل لتبويب \"الأصول\" وأضف المكونات الرئيسية لمشروعك." },
          { type: "heading", text: "لكل أصل، أدخل:" },
          { type: "list", items: ["المرحلة التي ينتمي لها", "التصنيف (سكني، تجاري، فندقي، مكاتب...)", "المساحات: مساحة الأرض، البصمة، GFA", "نوع الإيراد: إيجار أو تشغيل (للفنادق والمارينا)", "معدل الإيجار، الإشغال، فترة التأجير التدريجي", "تكلفة البناء (SAR/sqm) ومدة الإنشاء"] },
          { type: "heading", text: "نصيحة" },
          { type: "text", text: "ابدأ بأصل واحد فقط وتأكد أن الأرقام منطقية في لوحة التحكم قبل إضافة المزيد." }
        ]},
        { id: "step3", label: "الخطوة 3: النتائج", icon: "3️⃣", content: [
          { type: "heading", text: "اقرأ النتائج" },
          { type: "text", text: "فوراً بعد إضافة أصل واحد على الأقل، ستظهر النتائج في لوحة التحكم (Dashboard)." },
          { type: "heading", text: "أهم الأرقام التي تبحث عنها:" },
          { type: "list", items: ["إجمالي CAPEX: التكلفة الإجمالية للمشروع", "IRR: العائد الداخلي - هل المشروع مجدي؟ (أعلى من 10% عادة جيد)", "NPV: صافي القيمة الحالية - هل يضيف قيمة؟ (موجب = جيد)", "DSCR: تغطية الدين - هل يقدر يسدد القرض؟ (أعلى من 1.2x)"] },
          { type: "heading", text: "التبويبات المهمة" },
          { type: "list", items: ["التمويل: اضبط شروط القرض والصندوق", "حافز الأداء: شاهد توزيع الأرباح بين GP و LP", "السيناريوهات: قارن 8 سيناريوهات مختلفة", "الفحوصات: تأكد من عدم وجود أخطاء", "التقارير: صدّر حزمة البنك أو تقرير المستثمر"] }
        ]},
        { id: "tips", label: "نصائح ذهبية", icon: "💡", content: [
          { type: "heading", text: "نصائح من الممارسة" },
          { type: "list", items: ["ابدأ بالأبسط: مشروع واحد، أصل واحد، تمويل ذاتي - ثم عقّد تدريجياً", "استخدم القوالب الجاهزة: فيها أرقام واقعية من السوق السعودي", "تحقق من الفحوصات (Checks): إذا فيها تحذير، عالجه قبل ما تكمل", "جرّب السيناريوهات: غيّر الإيجار -10% وشوف هل المشروع لسا يشتغل", "قارن بين التمويل الذاتي والبنكي: شوف كيف الرافعة المالية تأثر على IRR"] },
          { type: "heading", text: "اختصارات لوحة المفاتيح" },
          { type: "list", items: ["Ctrl+Z: تراجع عن آخر تعديل (30 خطوة)", "مبدّل اللغة: عربي ↔ English في أي وقت", "وضع العرض (Present): لعرض النموذج على البنك أو المستثمر"] }
        ]}
      ]
    },
    en: {
      title: "Quick Start Guide",
      intro: "Practical steps to create your first financial model in under 10 minutes.",
      cta: "Let's go!",
      tabs: [
        { id: "step1", label: "Step 1: Project", icon: "1️⃣", content: [
          { type: "heading", text: "Create a New Project" },
          { type: "list", items: ["Click \"+ New Project\" on the Projects page", "Choose a template (waterfront, residential, commercial, hotel) or start blank", "The Quick Setup Wizard opens - 4 quick steps"] },
          { type: "heading", text: "The Wizard Asks About:" },
          { type: "list", items: ["1. Project name and location", "2. Land type (lease, purchase, or partnership)", "3. Financing mode (self-funded, bank, debt+equity, fund)", "4. Exit strategy (sell, hold)"] },
          { type: "heading", text: "Tip" },
          { type: "text", text: "Don't worry about choices - everything can be changed later from the sidebar." }
        ]},
        { id: "step2", label: "Step 2: Assets", icon: "2️⃣", content: [
          { type: "heading", text: "Add Your Assets" },
          { type: "text", text: "Go to the \"Assets\" tab and add your project's main components." },
          { type: "heading", text: "For Each Asset, Enter:" },
          { type: "list", items: ["Phase assignment", "Category (residential, commercial, hospitality, office...)", "Areas: plot area, footprint, GFA", "Revenue type: lease or operating (for hotels and marinas)", "Lease rate, occupancy, ramp-up period", "Construction cost (SAR/sqm) and duration"] },
          { type: "heading", text: "Tip" },
          { type: "text", text: "Start with just one asset and verify the numbers make sense on the Dashboard before adding more." }
        ]},
        { id: "step3", label: "Step 3: Results", icon: "3️⃣", content: [
          { type: "heading", text: "Read the Results" },
          { type: "text", text: "Immediately after adding at least one asset, results appear on the Dashboard." },
          { type: "heading", text: "Key Numbers to Look For:" },
          { type: "list", items: ["Total CAPEX: total project cost", "IRR: internal rate of return - is the project viable? (above 10% is usually good)", "NPV: net present value - does it add value? (positive = good)", "DSCR: debt coverage - can it repay the loan? (above 1.2x)"] },
          { type: "heading", text: "Important Tabs" },
          { type: "list", items: ["Financing: adjust loan and fund terms", "Waterfall: see profit distribution between GP and LP", "Scenarios: compare 8 different scenarios", "Checks: verify no errors exist", "Reports: export bank pack or investor report"] }
        ]},
        { id: "tips", label: "Pro Tips", icon: "💡", content: [
          { type: "heading", text: "Tips from Practice" },
          { type: "list", items: ["Start simple: one project, one asset, self-funded - then add complexity gradually", "Use ready templates: they contain realistic Saudi market numbers", "Check the Checks tab: if there's a warning, fix it before proceeding", "Try scenarios: reduce rent by -10% and see if the project still works", "Compare self-funded vs bank: see how leverage affects IRR"] },
          { type: "heading", text: "Keyboard Shortcuts" },
          { type: "list", items: ["Ctrl+Z: undo last change (30 steps)", "Language toggle: Arabic ↔ English anytime", "Present mode: for presenting to banks or investors"] }
        ]}
      ]
    }
  }
};

// ── HelpLink: Reusable inline clickable trigger ──
function HelpLink({ contentKey, lang, onOpen, label: customLabel }) {
  const ar = lang === "ar";
  const label = customLabel || (ar ? "ما الفرق؟" : "What's the difference?");
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(contentKey); }}
      style={{
        fontSize: 11,
        color: "var(--zan-teal-500)",
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
      onMouseLeave={e => { e.target.style.color = "var(--zan-teal-500)"; }}
    >
      {label}
    </span>
  );
}

// ── EducationalModal: Reusable full-screen learning modal ──
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
      return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: i === 0 ? 0 : 18, marginBottom: 6 }}>{block.text}</div>;
    }
    if (block.type === "text") {
      return <div key={i} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.75, marginBottom: 6 }}>{block.text}</div>;
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 8 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 12.5, color: "#374151", lineHeight: 1.65 }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 8, marginTop: 6, flexShrink: 0 }}>●</span>
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
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{content.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.5 }}>{content.intro}</div>
        </div>
        <button onClick={onClose} style={{ background: "var(--surface-sidebar)", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontFamily: "inherit", flexShrink: 0 }}>✕</button>
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
              color: isActive ? "var(--zan-teal-500)" : "var(--text-secondary)",
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
            background: "var(--zan-teal-500)", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.target.style.background = "#1d4ed8"; }}
          onMouseLeave={e => { e.target.style.background = "var(--zan-teal-500)"; }}
          >{content.cta}</button>
        </div>
      )}
    </div>
  </>);
}

// ═══════════════════════════════════════════════════════════════
// HASEEF ACADEMY — أكاديمية حصيف المالية
// Consolidated Learning Center — reads from EDUCATIONAL_CONTENT
// ═══════════════════════════════════════════════════════════════

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
    color: "var(--color-warning)",
  },
  {
    id: "foundations",
    icon: "🧱",
    title: { ar: "أساسيات النمذجة المالية", en: "Financial Modeling Foundations" },
    desc: { ar: "المفاهيم الأساسية: المقاييس المالية، أنواع الأرض، وتحليل السيناريوهات", en: "Core concepts: financial metrics, land types, and scenario analysis" },
    sections: ["financialMetrics", "landType", "scenarioAnalysis"],
    color: "var(--zan-teal-500)",
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
    color: "var(--color-success-text)",
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
            style={{ color: "var(--zan-teal-500)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, cursor: "pointer", fontWeight: 600 }}
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
      <div dir={dir} style={{ minHeight: "100vh", background: "var(--surface-page)", fontFamily: "'DM Sans','IBM Plex Sans Arabic','Segoe UI',system-ui,sans-serif", color: "var(--text-primary)" }}>
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
            <span onClick={goHome} style={{ fontSize: 11, color: "var(--zan-teal-500)", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>📚 {ar ? "الأكاديمية" : "Academy"}</span>
            {navStack.map((item, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span style={{ color: "#d1d5db", fontSize: 10 }}>{ar ? "←" : "→"}</span>
                <span onClick={() => { setNavStack(s => s.slice(0, i)); setActiveSection(item.key); setActiveTabIdx(item.tab); }}
                  style={{ fontSize: 11, color: "var(--zan-teal-500)", cursor: "pointer", fontWeight: 500 }}>
                  {EDUCATIONAL_CONTENT[item.key]?.[ar ? "ar" : "en"]?.title}
                </span>
              </span>
            ))}
            <span style={{ color: "#d1d5db", fontSize: 10 }}>{ar ? "←" : "→"}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>{content.title}</span>
          </div>
        )}

        <div style={{ maxWidth: 780, margin: "0 auto", padding: isMobile ? "16px 14px" : "32px 24px" }}>
          {/* Article Header */}
          <div style={{ marginBottom: isMobile ? 20 : 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: 8 }}>
              <span style={{ fontSize: isMobile ? 22 : 28, flexShrink: 0 }}>{ACADEMY_SECTION_ICONS[activeSection] || "📘"}</span>
              <h1 style={{ fontSize: isMobile ? 18 : 28, fontWeight: 900, color: "#0B2341", fontFamily: "'Tajawal',sans-serif", margin: 0, lineHeight: 1.3 }}>{content.title}</h1>
            </div>
            <p style={{ fontSize: isMobile ? 12 : 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{content.intro}</p>
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
                  color: isAct ? "#0B2341" : "var(--text-secondary)",
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
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.boxShadow = "none"; }}
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
    <div dir={dir} style={{ minHeight: "100vh", background: isMobile ? "linear-gradient(180deg, #0B2341 0%, #0B2341 280px, #f8f9fb 280px)" : "linear-gradient(180deg, #0B2341 0%, #0B2341 340px, #f8f9fb 340px)", fontFamily: "'DM Sans','IBM Plex Sans Arabic','Segoe UI',system-ui,sans-serif", color: "var(--text-primary)" }}>
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
            <span style={{ fontSize: 14, color: "var(--text-tertiary)", flexShrink: 0 }}>🔍</span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={ar ? (isMobile ? "ابحث... IRR, المرابحة" : "ابحث عن مفهوم... مثال: IRR, المرابحة, شلال التوزيعات") : (isMobile ? "Search... IRR, DSCR" : "Search concepts... e.g. IRR, Murabaha, Waterfall")}
              style={{ flex: 1, border: "none", outline: "none", fontSize: isMobile ? 13 : 13, color: "#374151", fontFamily: "inherit", padding: isMobile ? "11px 0" : "12px 0", background: "transparent", minWidth: 0 }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "var(--surface-sidebar)", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✕</button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>{ar ? `${searchResults.length} نتيجة` : `${searchResults.length} results`}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => navigateTo(r.key, r.tabIdx)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 18px", background: "#fff", border: "1px solid #e5e7ec",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                  transition: "all 0.15s", width: "100%",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2EC4B6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(46,196,182,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0B2341" }}>{r.title}</div>
                    {r.tabLabel && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{r.tabLabel}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {searchResults && searchResults.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)", fontSize: 13 }}>{ar ? "لا توجد نتائج. جرّب كلمات مختلفة." : "No results. Try different keywords."}</div>
        )}

        {/* Learning Paths */}
        {!searchQuery && ACADEMY_PATHS.map((path, pathIdx) => (
          <div key={path.id} style={{ marginBottom: isMobile ? 28 : 36 }}>
            <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 10, marginBottom: 12, background: isMobile ? "#fff" : "transparent", padding: isMobile ? "12px 14px" : 0, borderRadius: isMobile ? 10 : 0, border: isMobile ? "1px solid #e5e7ec" : "none", boxShadow: isMobile ? "0 1px 3px rgba(0,0,0,0.04)" : "none" }}>
              <span style={{ fontSize: isMobile ? 18 : 22, flexShrink: 0, marginTop: isMobile ? 2 : 0 }}>{path.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: "#0B2341", fontFamily: "'Tajawal',sans-serif", lineHeight: 1.3 }}>{ar ? path.title.ar : path.title.en}</div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{ar ? path.desc.ar : path.desc.en}</div>
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
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sec.intro}</div>
                    {!isMobile && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {sec.tabs?.slice(0, 4).map(t2 => (
                        <span key={t2.id} style={{ fontSize: 10, padding: "3px 8px", background: "var(--surface-sidebar)", borderRadius: 4, color: "#4b5060", fontWeight: 500 }}>{t2.icon} {t2.label}</span>
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
                <div style={{ fontSize: isMobile ? 11 : 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{publicMode ? (ar ? "سجّل حساب مجاني لتجربة هذه النماذج." : "Create a free account to try these demos.") : (ar ? "مشاريع جاهزة بأرقام واقعية. افتحها وعدّل عليها." : "Ready projects with realistic numbers. Open and customize.")}</div>
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
                  <div style={{ fontSize: isMobile ? 11 : 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{ar ? demo.desc.ar : demo.desc.en}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {demo.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 9, padding: "2px 7px", background: "var(--surface-sidebar)", borderRadius: 4, color: "#4b5060", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{tag}</span>
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
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, fontStyle: "italic" }}>
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
                    padding: "8px 14px", background: "var(--surface-page)", border: "1px solid #e5e7ec",
                    borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: 500, color: "#374151", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#2EC4B6"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#2EC4B6"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-page)"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
                  >
                    <span>{ACADEMY_SECTION_ICONS[k]}</span> {s3.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "var(--text-tertiary)" }}>
          {ar ? "أكاديمية حصيف المالية - محتوى تعليمي مصمم للسوق السعودي" : "Haseef Academy - Educational content designed for the Saudi market"}
        </div>
      </div>
    </div>
  );
}

function KPI({label,value,sub,color,tip}) {
  const isMobile = useIsMobile();
  return <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:isMobile?"10px 12px":"12px 14px"}}>
    <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{tip?<Tip text={tip}>{label}</Tip>:label}</div>
    <div style={{fontSize:isMobile?15:19,fontWeight:700,color:color||"var(--text-primary)",lineHeight:1.1}}>{value}{sub&&<span style={{fontSize:isMobile?10:11,fontWeight:400,color:"var(--text-tertiary)",marginInlineStart:4}}>{sub}</span>}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// CASH FLOW VIEW
// ═══════════════════════════════════════════════════════════════
function CashFlowView({ project, results, t, incentivesResult }) {
  if (!project||!results) return <div style={{color:"var(--text-tertiary)"}}>Add assets to see projections.</div>;
  const isMobile = useIsMobile();
  const [showYrs,setShowYrs]=useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const {horizon,startYear}=results;
  const years=Array.from({length:Math.min(showYrs,horizon)},(_,i)=>i);
  const ar = t.dashboard === "لوحة التحكم";

  // ── Phase filter ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  // ── Read from engine results, filtered by selected phases ──
  const phases = allPhaseNames.filter(pName => activePh.includes(pName)).map(pName => {
    const pr = results.phaseResults[pName];
    const noi = new Array(horizon).fill(0);
    for (let y = 0; y < horizon; y++) noi[y] = (pr.income[y]||0) - (pr.landRent[y]||0);
    return [pName, { ...pr, noi, totalNOI: noi.reduce((a,b)=>a+b,0) }];
  });

  // ── Filtered consolidated ──
  const c = useMemo(() => {
    if (!isFiltered) {
      const raw = { ...results.consolidated, noi: new Array(horizon).fill(0) };
      for (let y = 0; y < horizon; y++) raw.noi[y] = (raw.income[y]||0) - (raw.landRent[y]||0);
      return raw;
    }
    const income = new Array(horizon).fill(0), capex = new Array(horizon).fill(0), landRent = new Array(horizon).fill(0), netCF = new Array(horizon).fill(0), noi = new Array(horizon).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < horizon; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    for (let y = 0; y < horizon; y++) noi[y] = income[y] - landRent[y];
    const totalCapex = capex.reduce((a,b)=>a+b,0);
    const totalIncome = income.reduce((a,b)=>a+b,0);
    const totalLandRent = landRent.reduce((a,b)=>a+b,0);
    const totalNetCF = netCF.reduce((a,b)=>a+b,0);
    let pbCum = 0, pbYr = null, pbNeg = false, peakNeg = 0, peakNegY = null;
    for (let y = 0; y < horizon; y++) { pbCum += netCF[y]; if (pbCum < -1) pbNeg = true; if (pbNeg && pbCum >= 0 && pbYr === null) pbYr = y; if (pbCum < peakNeg) { peakNeg = pbCum; peakNegY = y; } }
    return { ...results.consolidated, income, capex, landRent, netCF, noi, totalCapex, totalIncome, totalLandRent, totalNetCF,
      irr: calcIRR(netCF), npv10: calcNPV(netCF, 0.10), npv12: calcNPV(netCF, 0.12), npv14: calcNPV(netCF, 0.14),
      paybackYear: pbYr, peakNegative: peakNeg, peakNegativeYear: peakNegY,
    };
  }, [isFiltered, selectedPhases, results, horizon]);

  // ── Period detection: construction vs operating years ──
  let constrEnd = 0;
  for (let y = horizon - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }
  const isConstrYear = y => c.capex[y] > 0;
  const isIncomeYear = y => c.income[y] > 0;

  // ── NOI already computed as c.noi ──
  const noiArr = c.noi;
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);

  // ── Yield on Cost = Stabilized NOI / Total CAPEX ──
  const stabilizedNOI = noiArr[Math.min(constrEnd + 3, horizon - 1)] || 0;
  const yieldOnCost = c.totalCapex > 0 ? stabilizedNOI / c.totalCapex : 0;

  const CFRow=({label,values,total,bold,color,negate,sub})=>{
    const st=bold?{fontWeight:700,background:"var(--surface-page)"}:{};
    const nc=v=>{if(color)return color;return v<0?"var(--color-danger)":v>0?"var(--text-primary)":"#d0d4dc";};
    return <tr style={st} onMouseEnter={e=>{if(!bold)e.currentTarget.style.background="#fafbff";}} onMouseLeave={e=>{if(!bold)e.currentTarget.style.background="";}}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"var(--surface-page)":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:150,paddingInlineStart:sub?24:10,fontSize:sub?10:11,color:sub?"var(--text-secondary)":undefined}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v),background:v===0?"":"transparent"}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  // Section header row
  const SectionRow=({label,color,bg})=><tr><td colSpan={years.length+2} style={{padding:"6px 10px",fontSize:10,fontWeight:700,color:color||"var(--text-secondary)",background:bg||"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"0.5px solid var(--border-default)"}}>{label}</td></tr>;

  // Cumulative row (always visible)
  const CumRow=({label,values})=>{
    let cum=0;
    return <tr style={{background:"var(--color-warning-bg)"}}>
      <td style={{...tdSt,position:"sticky",left:0,background:"var(--color-warning-bg)",zIndex:1,fontWeight:600,fontSize:10,color:"var(--color-warning-text)",minWidth:150}}>{label}</td>
      <td style={tdN}></td>
      {years.map(y=>{cum+=values[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"var(--color-danger)":"var(--color-success-text)"}}>{fmt(cum)}</td>;})}
    </tr>;
  };

  // ── Period marker header (construction / operating / payback) ──
  const PeriodHeaderRow = () => <tr>
    <td style={{position:"sticky",left:0,background:"var(--surface-card)",zIndex:2,padding:0}}></td>
    <td style={{padding:0}}></td>
    {years.map(y => {
      const constr = isConstrYear(y);
      const income = isIncomeYear(y);
      const isPB = c.paybackYear !== null && y === c.paybackYear;
      const bg = constr && !income ? "#fef3c7" : constr && income ? "#fef9c3" : income ? "#dcfce7" : "var(--surface-page)";
      const lbl = constr && !income ? (ar?"بناء":"Build") : constr && income ? (ar?"بناء+دخل":"Build+Op") : income ? (ar?"تشغيل":"Oper.") : "";
      return <td key={y} style={{padding:"2px 4px",textAlign:"center",background:bg,fontSize:10,fontWeight:600,color:constr?"var(--color-warning-text)":"var(--color-success-text)",borderBottom:isPB?"3px solid #2563eb":"1px solid #e5e7ec",position:"relative"}}>
        {lbl}{isPB && <span style={{display:"block",fontSize:9,color:"var(--zan-teal-500)",fontWeight:700}}>{ar?"استرداد":"Payback"}</span>}
      </td>;
    })}
  </tr>;

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {allPhaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Disclaimer */}
    <div style={{background:"var(--color-warning-bg)",border:"1px solid #fde68a",borderRadius:"var(--radius-md)",padding:"6px 12px",marginBottom:12,fontSize:11,color:"var(--color-warning-text)",display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:14}}>⚠</span>
      {ar ? "هذه المؤشرات قبل احتساب طريقة التمويل وآلية التخارج - ستتغير بعد تحديد التمويل" : "Pre-financing & pre-exit metrics — will change after financing mode and exit strategy are set"}
    </div>
    {/* NPV/IRR Summary */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(130px, 1fr))",gap:10,marginBottom:16}}>
      {[
        {label:ar?"IRR المشروع (قبل التمويل)":"Unlevered IRR",value:c.irr!==null?fmtPct(c.irr*100):"N/A",color:getMetricColor("IRR",c.irr)},
        {label:"NPV @10%",value:fmtM(c.npv10),color:c.npv10>0?"var(--zan-teal-500)":"var(--color-danger)"},
        {label:"NPV @12%",value:fmtM(c.npv12),color:c.npv12>0?"var(--zan-teal-500)":"var(--color-danger)"},
        {label:"NPV @14%",value:fmtM(c.npv14),color:c.npv14>0?"var(--zan-teal-500)":"var(--color-danger)"},
        {label:ar?"إجمالي التكاليف":"Total CAPEX",value:fmtM(c.totalCapex),color:"var(--color-danger)"},
        {label:ar?"إجمالي الإيرادات":"Total Income",value:fmtM(c.totalIncome),color:"var(--color-success-text)"},
        {label:ar?"صافي الدخل التشغيلي (NOI)":"Net Operating Income",value:fmtM(totalNOI),color:"var(--zan-teal-500)",tip:ar?"الإيرادات - إيجار الأرض (قبل CAPEX)":"Revenue minus Land Rent (before CAPEX)"},
        {label:ar?"عائد على التكلفة":"Yield on Cost",value:yieldOnCost>0?fmtPct(yieldOnCost*100):"—",color:yieldOnCost>0.08?"var(--color-success-text)":"var(--color-warning)",tip:ar?"NOI المستقر / CAPEX":"Stabilized NOI / Total CAPEX"},
        {label:ar?"فترة الاسترداد":"Payback Period",value:c.paybackYear!=null?(c.paybackYear+(ar?" سنة":" yr")):"—",color:c.paybackYear&&c.paybackYear<=10?"var(--color-success-text)":c.paybackYear?"var(--color-warning)":"var(--text-tertiary)"},
        {label:ar?"أقصى سحب سلبي":"Peak Negative CF",value:fmtM(c.peakNegative||0),color:"var(--color-danger)",tip:c.peakNegativeYear!=null?(ar?`السنة ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`:`Year ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`):""},
      ].map((k,i) => <div key={i} style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:"8px 12px"}}>
        <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{k.label}</div>
        <div style={{fontSize:16,fontWeight:700,color:k.color}}>{k.value}</div>
        {k.tip && <div style={{fontSize:9,color:"var(--text-tertiary)",marginTop:2}}>{k.tip}</div>}
      </div>)}
    </div>

    {/* Period Legend */}
    <div style={{display:"flex",gap:14,marginBottom:8,fontSize:10,color:"var(--text-secondary)",flexWrap:"wrap",alignItems:"center"}}>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--color-warning-bg)",border:"1px solid #fde68a"}} />{ar?"بناء":"Construction"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"var(--color-success-bg)",border:"1px solid #bbf7d0"}} />{ar?"تشغيل":"Operating"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:4,borderRadius:1,background:"var(--btn-primary-bg)"}} />{ar?"سنة الاسترداد":"Payback Year"}</span>
    </div>

    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12,flexWrap:"wrap"}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.unleveredCF}</div>
      <div style={{flex:1}} />
      <div style={{display:"flex",background:"var(--surface-sidebar)",borderRadius:"var(--radius-sm)",padding:2}}>
        {[10,15,20,30,50].map(n=><button key={n} onClick={()=>setShowYrs(n)} style={{...btnS,padding:"4px 10px",fontSize:10,fontWeight:600,background:showYrs===n?"#fff":"transparent",color:showYrs===n?"var(--text-primary)":"var(--text-tertiary)",boxShadow:showYrs===n?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>{n}yr</button>)}
      </div>
    </div>
    {phases.map(([name,pr])=>(
      <div key={name} style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"10px 14px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:600,display:"flex",justifyContent:"space-between"}}>
          <span>{name}</span><span style={{color:"var(--text-secondary)",fontWeight:400,fontSize:11}}>{ar?"IRR قبل التمويل":"Unlevered IRR"}: <strong style={{color:pr.irr!==null?"var(--zan-teal-500)":"var(--text-tertiary)"}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</strong></span>
        </div>
        <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
          <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2,minWidth:150}}>{t.lineItem}</th>
          <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
          {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{startYear+y}</span></th>)}
        </tr></thead><tbody>
          <PeriodHeaderRow />
          <SectionRow label={ar?"الإيرادات والتشغيل":"REVENUE & OPERATIONS"} color="var(--color-success-text)" bg="#f0fdf4" />
          <CFRow label={t.income} values={pr.income} total={pr.totalIncome} color="var(--color-success-text)" />
          <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pr.landRent} total={pr.totalLandRent} color="var(--color-danger)" negate sub />
          <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={pr.noi} total={pr.totalNOI} bold />
          <SectionRow label={ar?"التكاليف الرأسمالية":"CAPITAL EXPENDITURE"} color="var(--color-danger)" bg="var(--color-danger-bg)" />
          <CFRow label={ar?"(-) تكاليف التطوير":"(-) Development CAPEX"} values={pr.capex} total={pr.totalCapex} color="var(--color-danger)" negate />
          <SectionRow label={ar?"صافي التدفق النقدي":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
          <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={pr.netCF} total={pr.totalNetCF} bold />
          <CumRow label={ar?"↳ تراكمي":"↳ Cumulative"} values={pr.netCF} />
        </tbody></table></div>
      </div>
    ))}
    <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"2px solid #2563eb",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:700,background:"var(--color-info-bg)",display:"flex",justifyContent:"space-between"}}>
        <span>{isFiltered?(ar?"المجموع المختار":"Selected Total"):t.consolidated}</span><span style={{fontSize:11,fontWeight:400}}>{ar?"IRR قبل التمويل":"Unlevered IRR"}: <strong style={{color:"var(--zan-teal-500)"}}>{(!isFiltered&&incentivesResult&&incentivesResult.totalIncentiveValue>0&&incentivesResult.adjustedIRR!==null)?fmtPct(incentivesResult.adjustedIRR*100):c.irr!==null?fmtPct(c.irr*100):"—"}</strong></span>
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2,minWidth:150}}>{t.lineItem}</th>
        <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{startYear+y}</span></th>)}
      </tr></thead><tbody>
        <PeriodHeaderRow />
        <SectionRow label={ar?"الإيرادات والتشغيل":"REVENUE & OPERATIONS"} color="var(--color-success-text)" bg="#f0fdf4" />
        <CFRow label={t.income} values={c.income} total={c.totalIncome} color="var(--color-success-text)" />
        <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.totalLandRent} color="var(--color-danger)" negate sub />
        <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
        <SectionRow label={ar?"التكاليف الرأسمالية":"CAPITAL EXPENDITURE"} color="var(--color-danger)" bg="var(--color-danger-bg)" />
        <CFRow label={ar?"(-) تكاليف التطوير":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} color="var(--color-danger)" negate />
        <SectionRow label={ar?"صافي التدفق النقدي":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
        <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={c.netCF} total={c.totalNetCF} bold />
        <CumRow label={ar?"↳ تراكمي":"↳ Cumulative"} values={c.netCF} />
      </tbody></table></div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// CHECKS VIEW
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PHASE 4: REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

// DOM-based notification for non-React contexts
function _domNotify(msg, type="error") {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {position:"fixed",top:"16px",right:"16px",zIndex:"99999",padding:"12px 20px",borderRadius:"10px",background:type==="error"?"#991b1b":"#065f46",color:"var(--text-inverse)",fontSize:"13px",fontWeight:"500",boxShadow:"0 8px 24px rgba(0,0,0,0.3)",fontFamily:"'DM Sans',system-ui,sans-serif"});
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; setTimeout(() => el.remove(), 300); }, 3000);
}

function generateFullModelXLSX(project, results, financing, waterfall) {
  // Load SheetJS from CDN (no npm dependency needed)
  const script = document.createElement('script');
  script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  script.onload = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { _domNotify('Excel export failed. Reload and try again.'); return; }
    _buildXLSX(XLSX, project, results, financing, waterfall);
  };
  script.onerror = () => { _domNotify('Could not load Excel library. Check internet connection.'); };
  // Only load once
  if (window.XLSX) { _buildXLSX(window.XLSX, project, results, financing, waterfall); return; }
  document.head.appendChild(script);
}

function _buildXLSX(XLSX, project, results, financing, waterfall) {
    const h = results?.horizon || 50;
    const sy = results?.startYear || 2026;
    const c = results?.consolidated;
    const f = financing;
    const w = waterfall;
    const wb = XLSX.utils.book_new();
    const cur = project.currency || "SAR";
    const yrs = Array.from({length: Math.min(30, h)}, (_, i) => i);

    // Format helpers
    const fm = v => typeof v === 'number' ? Math.round(v) : v;
    const fp = v => typeof v === 'number' ? +(v*100).toFixed(2) + '%' : v;

    // ═══ SHEET 1: Executive Summary ═══
    const s1 = [];
    s1.push(['─────────────────────────────────────────']);
    s1.push(['  ' + (project.currency === 'SAR' ? 'حصيف لتطوير الوجهات' : 'HASEEF DESTINATION DEVELOPMENT')]);
    s1.push(['  Financial Model — ' + (project.name || 'Project')]);
    s1.push(['─────────────────────────────────────────']);
    s1.push([]);
    s1.push(['▸ PROJECT INFORMATION', '', '▸ KEY METRICS']);
    s1.push(['  Project Name', project.name, '  Total CAPEX (' + cur + ')', fm(c?.totalCapex||0)]);
    s1.push(['  Location', project.location || '-', '  Total Income (' + h + 'yr)', fm(c?.totalIncome||0)]);
    s1.push(['  Currency', cur, '  Unlevered IRR', c?.irr ? fp(c.irr) : 'N/A']);
    s1.push(['  Start Year', sy, '  NPV @10%', fm(c?.npv10||0)]);
    s1.push(['  Horizon', h + ' years', '  NPV @12%', fm(c?.npv12||0)]);
    s1.push(['  Land Type', project.landType, '  NPV @14%', fm(c?.npv14||0)]);
    s1.push(['  Land Area (sqm)', project.landArea || 0, '  Total Assets', (project.assets||[]).length]);
    s1.push([]);

    if (f && f.mode !== 'self') {
      s1.push(['▸ FINANCING STRUCTURE', '', '▸ DEBT PARAMETERS']);
      s1.push(['  Dev Cost Excl Land', fm(f.devCostExclLand), '  Finance Rate', fp((project.financeRate||0)/100)]);
      s1.push(['  Land Capitalization', fm(f.landCapValue||0), '  Tenor', project.loanTenor + ' yrs (' + project.debtGrace + ' grace)']);
      s1.push(['  Dev Cost Incl Land', fm(f.devCostInclLand), '  Total Interest', fm(f.totalInterest)]);
      s1.push(['  Max Debt (' + (project.maxLtvPct||70) + '% LTV)', fm(f.maxDebt), '  Levered IRR', f.leveredIRR ? fp(f.leveredIRR) : 'N/A']);
      s1.push(['  GP Equity', fm(f.gpEquity), '  Upfront Fee', fm(f.upfrontFee)]);
      if (f.lpEquity > 0) s1.push(['  LP Equity', fm(f.lpEquity)]);
      s1.push(['  Total Equity', fm(f.totalEquity)]);
      s1.push([]);
    }

    if (w) {
      s1.push(['▸ INVESTOR RETURNS', '', 'LP', 'GP']);
      s1.push(['  Equity (' + cur + ')', '', fm(w.lpEquity), fm(w.gpEquity)]);
      s1.push(['  Equity %', '', fp(w.lpPct), fp(w.gpPct)]);
      s1.push(['  Total Distributions', '', fm(w.lpTotalDist), fm(w.gpTotalDist)]);
      s1.push(['  Net IRR', '', w.lpIRR ? fp(w.lpIRR) : 'N/A', w.gpIRR ? fp(w.gpIRR) : 'N/A']);
      s1.push(['  MOIC', '', w.lpMOIC ? w.lpMOIC.toFixed(2) + 'x' : '-', w.gpMOIC ? w.gpMOIC.toFixed(2) + 'x' : '-']);
      s1.push(['  NPV @10%', '', fm(w.lpNPV10), fm(w.gpNPV10)]);
      s1.push(['  Total Fees', '', fm(w.totalFees)]);
      s1.push([]);
    }

    s1.push(['─────────────────────────────────────────']);
    s1.push(['  Powered by ' + (project.currency === 'SAR' ? 'حصيف' : 'Haseef') + ' Development']);
    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1['!cols'] = [{wch:26},{wch:22},{wch:22},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // ═══ SHEET 2: Unlevered Cash Flow ═══
    const s2 = [];
    s2.push(['UNLEVERED PROJECT CASH FLOW', '', '', '', '', '', cur]);
    s2.push([]);
    s2.push(['Year', 'Calendar', 'Income', 'Land Rent', 'CAPEX', 'Net CF', 'Cumulative CF']);
    let cumCF = 0;
    yrs.forEach(y => {
      cumCF += (c?.netCF[y] || 0);
      s2.push([y+1, sy+y, fm(c?.income[y]||0), fm(c?.landRent[y]||0), fm(c?.capex[y]||0), fm(c?.netCF[y]||0), fm(cumCF)]);
    });
    s2.push([]);
    s2.push(['', 'TOTAL', fm(c?.totalIncome||0), fm(c?.totalLandRent||0), fm(c?.totalCapex||0), fm(c?.totalNetCF||0), '']);
    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2['!cols'] = [{wch:6},{wch:10},{wch:18},{wch:18},{wch:18},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Unlevered CF');

    // ═══ SHEET 3: Debt Schedule ═══
    if (f && f.mode !== 'self') {
      const s3 = [];
      s3.push(['FINANCING & DEBT SCHEDULE', '', '', '', '', '', '', '', cur]);
      s3.push([]);
      s3.push(['Year', 'Calendar', 'Drawdown', 'Repayment', 'Interest', 'Debt Balance', 'Levered CF', 'DSCR', 'Exit Proceeds']);
      yrs.forEach(y => {
        const dscr = f.dscr[y] !== null && f.dscr[y] !== undefined ? +f.dscr[y].toFixed(2) + 'x' : '-';
        s3.push([y+1, sy+y, fm(f.drawdown[y]||0), fm(f.repayment?.[y]||0), fm(f.interest[y]||0), fm(f.debtBalClose[y]||0), fm(f.leveredCF[y]||0), dscr, fm(f.exitProceeds[y]||0)]);
      });
      s3.push([]);
      s3.push(['', 'TOTAL', fm(f.drawdown.reduce((a,b)=>a+b,0)), fm((f.repayment||[]).reduce((a,b)=>a+b,0)), fm(f.totalInterest), '', '', '', '']);
      const ws3 = XLSX.utils.aoa_to_sheet(s3);
      ws3['!cols'] = [{wch:6},{wch:10},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:8},{wch:16}];
      XLSX.utils.book_append_sheet(wb, ws3, 'Debt Schedule');
    }

    // ═══ SHEET 4: Waterfall ═══
    if (w) {
      const s4 = [];
      s4.push(['WATERFALL DISTRIBUTIONS', '', '', '', '', '', '', '', '', '', '', '', '', cur]);
      s4.push([]);
      s4.push(['Year','Calendar','Equity Calls','Cash Available','T1: ROC','T2: Pref Return','T3: GP Catch-up','T4: LP Split','T4: GP Split','LP Distribution','GP Distribution','LP Net CF','GP Net CF']);
      yrs.forEach(y => {
        s4.push([y+1, sy+y, fm(w.equityCalls[y]), fm(w.cashAvail[y]), fm(w.tier1[y]), fm(w.tier2[y]), fm(w.tier3[y]), fm(w.tier4LP[y]), fm(w.tier4GP[y]), fm(w.lpDist[y]), fm(w.gpDist[y]), fm(w.lpNetCF[y]), fm(w.gpNetCF[y])]);
      });
      s4.push([]);
      s4.push(['','TOTAL', fm(w.equityCalls.reduce((a,b)=>a+b,0)), fm(w.cashAvail.reduce((a,b)=>a+b,0)),
        fm(w.tier1.reduce((a,b)=>a+b,0)), fm(w.tier2.reduce((a,b)=>a+b,0)), fm(w.tier3.reduce((a,b)=>a+b,0)),
        fm(w.tier4LP.reduce((a,b)=>a+b,0)), fm(w.tier4GP.reduce((a,b)=>a+b,0)),
        fm(w.lpTotalDist), fm(w.gpTotalDist)]);
      const ws4 = XLSX.utils.aoa_to_sheet(s4);
      const w4 = Array(13).fill({wch:15}); w4[0]={wch:6}; w4[1]={wch:10};
      ws4['!cols'] = w4;
      XLSX.utils.book_append_sheet(wb, ws4, 'Waterfall');
    }

    // ═══ SHEET 5: Asset Program ═══
    const s5 = [];
    s5.push(['ASSET PROGRAM', '', '', '', '', '', '', '', '', '', cur]);
    s5.push([]);
    s5.push(['Phase','Category','Asset Name','GFA (sqm)','Rev Type','Lease Rate','Op EBITDA','Cost/sqm','Total CAPEX','Total Income (' + h + 'yr)']);
    (results?.assetSchedules || []).forEach(a => {
      s5.push([a.phase, a.category, a.name, a.gfa, a.revType, fm(a.leaseRate||0), fm(a.opEbitda||0), fm(a.costPerSqm||0), fm(a.totalCapex), fm(a.totalRevenue)]);
    });
    s5.push([]);
    s5.push(['TOTAL','','', (results?.assetSchedules||[]).reduce((s,a)=>s+(a.gfa||0),0), '','','','', fm(c?.totalCapex||0), fm(c?.totalIncome||0)]);
    const ws5 = XLSX.utils.aoa_to_sheet(s5);
    ws5['!cols'] = [{wch:12},{wch:14},{wch:24},{wch:10},{wch:10},{wch:12},{wch:14},{wch:10},{wch:16},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws5, 'Assets');

    // ═══ SHEET 6: Phase Summary ═══
    const phases = Object.entries(results?.phaseResults || {});
    if (phases.length > 0) {
      const s6 = [];
      s6.push(['PHASE SUMMARY', '', '', '', '', '', '', cur]);
      s6.push([]);
      s6.push(['Phase','Assets','Total CAPEX','Total Income','Land Rent','Net CF','IRR','Land Allocation']);
      phases.forEach(([n,pr]) => {
        s6.push([n, pr.assetCount, fm(pr.totalCapex), fm(pr.totalIncome), fm(pr.totalLandRent), fm(pr.totalNetCF), pr.irr ? fp(pr.irr) : 'N/A', fp(pr.allocPct||0)]);
      });
      s6.push([]);
      s6.push(['CONSOLIDATED','', fm(c?.totalCapex||0), fm(c?.totalIncome||0), fm(c?.totalLandRent||0), fm(c?.totalNetCF||0), c?.irr ? fp(c.irr) : 'N/A', '100%']);
      const ws6 = XLSX.utils.aoa_to_sheet(s6);
      ws6['!cols'] = [{wch:14},{wch:8},{wch:16},{wch:18},{wch:16},{wch:18},{wch:10},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws6, 'Phases');
    }

    // ── Download ──
    const fileName = `${(project.name||'Project').replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '_')}_Financial_Model.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// Fallback CSV export (if SheetJS fails to load)
function generateFallbackCSV(project, results, financing, waterfall) {
  const h = results?.horizon || 50;
  const sy = results?.startYear || 2026;
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;
  const sections = [];

  // Section 1: Project Summary
  sections.push(["PROJECT SUMMARY"]);
  sections.push(["Project Name", project.name]);
  sections.push(["Location", project.location]);
  sections.push(["Currency", project.currency]);
  sections.push(["Start Year", sy]);
  sections.push(["Horizon", h + " years"]);
  sections.push(["Land Type", project.landType]);
  sections.push(["Total CAPEX", c?.totalCapex || 0]);
  sections.push(["Total Income (" + h + "yr)", c?.totalIncome || 0]);
  sections.push([ar?"IRR قبل التمويل":"Unlevered IRR", c?.irr ? (c.irr * 100).toFixed(2) + "%" : "N/A"]);
  sections.push(["NPV @10%", c?.npv10 || 0]);
  sections.push(["NPV @12%", c?.npv12 || 0]);
  sections.push(["NPV @14%", c?.npv14 || 0]);
  sections.push([]);

  // Section 2: Financing
  if (f && f.mode !== "self") {
    sections.push(["FINANCING STRUCTURE"]);
    sections.push(["Max Debt (LTV)", f.maxDebt]);
    sections.push(["Total Debt Drawn", f.totalDebt]);
    sections.push(["Total Equity", f.totalEquity]);
    sections.push(["Finance Rate", project.financeRate + "%"]);
    sections.push(["Tenor", project.loanTenor + " yrs"]);
    sections.push(["Grace Period", project.debtGrace + " yrs"]);
    sections.push(["Levered IRR", f.leveredIRR ? (f.leveredIRR * 100).toFixed(2) + "%" : "N/A"]);
    sections.push(["Total Interest", f.totalInterest]);
    sections.push([]);
  }

  // Section 3: Waterfall Returns
  if (w) {
    sections.push(["INVESTOR RETURNS"]);
    sections.push(["", "LP", "GP"]);
    sections.push(["Equity", w.lpEquity, w.gpEquity]);
    sections.push(["Equity %", (w.lpPct * 100).toFixed(1) + "%", (w.gpPct * 100).toFixed(1) + "%"]);
    sections.push(["Total Distributions", w.lpTotalDist, w.gpTotalDist]);
    sections.push(["IRR", w.lpIRR ? (w.lpIRR * 100).toFixed(2) + "%" : "N/A", w.gpIRR ? (w.gpIRR * 100).toFixed(2) + "%" : "N/A"]);
    sections.push(["MOIC", w.lpMOIC ? w.lpMOIC.toFixed(2) + "x" : "N/A", w.gpMOIC ? w.gpMOIC.toFixed(2) + "x" : "N/A"]);
    sections.push(["NPV @10%", w.lpNPV10, w.gpNPV10]);
    sections.push(["Total Fees", w.totalFees]);
    sections.push([]);
  }

  // Section 4: Unlevered Cash Flow
  const yrs = Array.from({length: Math.min(20, h)}, (_, i) => i);
  sections.push(["UNLEVERED CASH FLOW"]);
  sections.push(["Year", "Calendar", "Revenue", "Land Rent", "CAPEX", "Net CF"]);
  yrs.forEach(y => {
    sections.push([y + 1, sy + y, c?.income[y] || 0, c?.landRent[y] || 0, c?.capex[y] || 0, c?.netCF[y] || 0]);
  });
  sections.push([]);

  // Section 5: Levered CF + DSCR
  if (f && f.mode !== "self") {
    sections.push(["LEVERED CASH FLOW"]);
    sections.push(["Year", "Calendar", "Debt Drawdown", "Debt Repay", "Interest", "Debt Balance", "Levered CF", "DSCR"]);
    yrs.forEach(y => {
      sections.push([y + 1, sy + y, f.drawdown[y] || 0, f.repayment[y] || 0, f.interest[y] || 0, f.debtBalClose[y] || 0, f.leveredCF[y] || 0, f.dscr[y] !== null ? f.dscr[y].toFixed(2) + "x" : ""]);
    });
    sections.push([]);
  }

  // Section 6: Waterfall
  if (w) {
    sections.push(["WATERFALL DISTRIBUTIONS"]);
    sections.push(["Year", "Calendar", "Equity Calls", "Cash Available", "T1:ROC", "T2:Pref", "T3:Catchup", "T4:Investor Split (LP)", "T4:Developer Split (GPt", "LP Dist", "GP Dist", "LP Net CF", "GP Net CF"]);
    yrs.forEach(y => {
      sections.push([y + 1, sy + y, w.equityCalls[y], w.cashAvail[y], w.tier1[y], w.tier2[y], w.tier3[y], w.tier4LP[y], w.tier4GP[y], w.lpDist[y], w.gpDist[y], w.lpNetCF[y], w.gpNetCF[y]]);
    });
    sections.push([]);
  }

  // Section 7: Asset list
  sections.push(["ASSET PROGRAM"]);
  sections.push(["Phase", "Category", "Asset Name", "GFA", "Rev Type", "Lease Rate", "EBITDA", "Cost/sqm", "Total CAPEX", "Total Income"]);
  (results?.assetSchedules || []).forEach(a => {
    sections.push([a.phase, a.category, a.name, a.gfa, a.revType, a.leaseRate, a.opEbitda, a.costPerSqm, a.totalCapex, a.totalRevenue]);
  });

  const csv = sections.map(r => r.map(v => csvEscape(v)).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Full_Model.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, checks, lang }) {
  const isMobile = useIsMobile();
  const reportRef = useRef(null);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  if (!project || !results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:"var(--radius-xl)",textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>📄</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"أضف أصول أولاً":"Add Assets First"}</div>
      <div style={{fontSize:12,color:"var(--text-secondary)",maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"التقارير تحتاج بيانات المشروع. أضف أصول من تبويب البرنامج.":"Reports need project data. Add assets from the Program tab."}</div>
    </div>
  );

  const ar = lang === "ar";
  const c = results.consolidated;
  const f = financing;
  const w = waterfall;
  const cur = project.currency || "SAR";
  const sy = results.startYear;
  const h = results.horizon;
  const failCount = (checks||[]).filter(ch => !ch.pass).length;
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;

  // Compute filtered consolidated data based on selected phases
  const fc = useMemo(() => {
    if (!isFiltered) return c;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults[pName];
      if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return {
      income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF,0.10), npv12: calcNPV(netCF,0.12), npv14: calcNPV(netCF,0.14),
    };
  }, [isFiltered, selectedPhases, results, h]);

  // Filtered assets
  const filteredAssets = isFiltered ? results.assetSchedules.filter(a => activePh.includes(a.phase)) : results.assetSchedules;

  // Filtered waterfall (use phaseWaterfalls if single phase selected)
  const fw = useMemo(() => {
    if (!isFiltered || !waterfall) return waterfall;
    if (!phaseWaterfalls || Object.keys(phaseWaterfalls).length === 0) return waterfall;
    const pwList = activePh.map(p => phaseWaterfalls[p]).filter(Boolean);
    if (pwList.length === 0) return waterfall;
    const sumArrays = (key) => { const out = new Array(h).fill(0); pwList.forEach(pw => { const arr = pw[key]; if (arr) for(let y=0;y<h;y++) out[y]+=(arr[y]||0); }); return out; };
    const lpNetCF = sumArrays('lpNetCF'), gpNetCF = sumArrays('gpNetCF');
    return {
      ...waterfall,
      tier1: sumArrays('tier1'), tier2: sumArrays('tier2'), tier3: sumArrays('tier3'),
      tier4LP: sumArrays('tier4LP'), tier4GP: sumArrays('tier4GP'),
      lpDist: sumArrays('lpDist'), gpDist: sumArrays('gpDist'),
      cashAvail: sumArrays('cashAvail'), equityCalls: sumArrays('equityCalls'),
      lpNetCF, gpNetCF,
      lpTotalDist: pwList.reduce((s,pw)=>s+(pw.lpTotalDist||0),0),
      gpTotalDist: pwList.reduce((s,pw)=>s+(pw.gpTotalDist||0),0),
      lpTotalInvested: pwList.reduce((s,pw)=>s+(pw.lpTotalInvested||0),0),
      gpTotalInvested: pwList.reduce((s,pw)=>s+(pw.gpTotalInvested||0),0),
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
      lpMOIC: pwList.reduce((s,pw)=>s+(pw.lpTotalInvested||0),0) > 0 ? pwList.reduce((s,pw)=>s+(pw.lpTotalDist||0),0) / pwList.reduce((s,pw)=>s+(pw.lpTotalInvested||0),0) : 0,
      gpMOIC: pwList.reduce((s,pw)=>s+(pw.gpTotalInvested||0),0) > 0 ? pwList.reduce((s,pw)=>s+(pw.gpTotalDist||0),0) / pwList.reduce((s,pw)=>s+(pw.gpTotalInvested||0),0) : 0,
      lpNPV10: calcNPV(lpNetCF,0.10), gpNPV10: calcNPV(gpNetCF,0.10),
      lpNPV12: calcNPV(lpNetCF,0.12), gpNPV12: calcNPV(gpNetCF,0.12),
      lpNPV14: calcNPV(lpNetCF,0.14), gpNPV14: calcNPV(gpNetCF,0.14),
      gpEquity: pwList.reduce((s,pw)=>s+(pw.gpEquity||0),0),
      lpEquity: pwList.reduce((s,pw)=>s+(pw.lpEquity||0),0),
      totalFees: pwList.reduce((s,pw)=>s+(pw.fees||0),0),
    };
  }, [isFiltered, selectedPhases, waterfall, phaseWaterfalls, h]);

  const togglePhase = (p) => {
    setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  // ── Haseef Brand Styles ──
  const zanSec = {fontSize:14,fontWeight:700,color:"var(--text-primary)",marginTop:22,marginBottom:10,paddingBottom:6,...(ar?{paddingRight:10,borderRight:"3px solid #2EC4B6"}:{paddingLeft:10,borderLeft:"3px solid #2EC4B6"}),borderBottom:"0.5px solid var(--border-default)"};
  const zanTh = {color:"var(--text-inverse)",padding:"6px 8px",textAlign:ar?"right":"left",fontSize:9,textTransform:"uppercase",letterSpacing:0.5};
  const zanTd = {padding:"5px 8px",borderBottom:"0.5px solid var(--surface-separator)",fontSize:11};
  const numA = ar ? "left" : "right"; // numbers align opposite to text direction
  const zanKpi = (accent) => ({border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-md)",padding:"10px 12px",borderTop:`3px solid ${accent||"#2EC4B6"}`});

  const reportLabels = {
    exec: {label:ar?"ملخص تنفيذي":"Executive Summary", desc:ar?"نظرة عامة على المشروع والمؤشرات الرئيسية":"Project overview and key metrics", icon:"📋"},
    bank: {label:ar?"حزمة البنك":"Bank Submission Pack", desc:ar?"دراسة المشروع وطلب التمويل":"Project study and financing request", icon:"🏦"},
    investor: {label:ar?"مذكرة المستثمر":"Investor Memo", desc:ar?"شروط الصندوق والعوائد المستهدفة":"Fund terms and target returns", icon:"💼"},
  };

  const printReport = () => {
    const el = reportRef.current;
    if (!el) return;
    const reportTitle = reportLabels[activeReport]?.label || "Report";
    const dateStr = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    const htmlContent = `<!DOCTYPE html><html dir="${ar?'rtl':'ltr'}" lang="${ar?'ar':'en'}"><head><meta charset="utf-8"><title>${project.name} - ${reportTitle}</title>
<style>
  ${embeddedFontCSS}
  @page { size: A4; margin: 12mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: ${ar?"'Tajawal','DM Sans','Segoe UI',system-ui,sans-serif":"'DM Sans','Segoe UI',system-ui,sans-serif"}; font-size: 11px; color: #1a1d23; line-height: 1.5; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; direction: ${ar?'rtl':'ltr'}; text-align: ${ar?'right':'left'}; }
  [dir=rtl] th { text-align: right; }
  [dir=rtl] .zan-hdr { flex-direction: row-reverse; }
  [dir=rtl] .zan-ftr { flex-direction: row-reverse; }
  [dir=rtl] h2.zan-sec { border-left: none; border-right: 3px solid #2EC4B6; padding-left: 0; padding-right: 10px; }
  .zan-cover { page-break-after: always; min-height: 100vh; background: #0f1117; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 60px 40px; position: relative; overflow: hidden; }
  .zan-cover::before { content: ''; position: absolute; top: -120px; right: -120px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(46,196,182,0.15) 0%, transparent 60%); }
  .zan-cover::after { content: ''; position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(15,118,110,0.12) 0%, transparent 60%); }
  .zan-cover .logo-group { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; margin-bottom: 4px; justify-content: center; }
  .zan-cover .logo-name { font-size: 48px; font-weight: 900; color: #fff; font-family: 'Tajawal',sans-serif; letter-spacing: -0.5px; }
  .zan-cover .logo-div { width: 1px; height: 40px; background: rgba(46,196,182,0.4); }
  .zan-cover .logo-sub { font-size: 14px; color: #2EC4B6; font-weight: 300; line-height: 1.3; text-align: ${ar?'right':'left'}; }
  .zan-cover .sub { font-size: 12px; color: #2EC4B6; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; opacity: 0.7; margin-bottom: 56px; position: relative; z-index: 1; }
  .zan-cover .rtype { font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 14px; position: relative; z-index: 1; letter-spacing: -0.3px; }
  .zan-cover .pname { font-size: 20px; color: #d0d4dc; font-weight: 500; margin-bottom: 6px; position: relative; z-index: 1; }
  .zan-cover .ploc { font-size: 13px; color: #6b7080; position: relative; z-index: 1; margin-bottom: 56px; }
  .zan-cover .conf { display: inline-block; padding: 8px 28px; border: 1px solid rgba(46,196,182,0.25); border-radius: 4px; color: #2EC4B6; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; position: relative; z-index: 1; }
  .zan-hdr { background: linear-gradient(135deg, #0f766e, #2EC4B6); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-radius: 0; }
  .zan-hdr .logo-group { display: flex; align-items: center; gap: 8px; }
  .zan-hdr .logo-name { font-size: 22px; font-weight: 900; color: #fff; font-family: 'Tajawal',sans-serif; }
  .zan-hdr .logo-div { width: 1px; height: 20px; background: rgba(255,255,255,0.4); }
  .zan-hdr .logo-sub { font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 300; line-height: 1.3; }
  .zan-hdr .title { font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 500; letter-spacing: 0.3px; }
  .zan-ftr { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7ec; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #9ca3af; }
  .zan-ftr .logo-group { display: flex; align-items: center; gap: 6px; }
  .zan-ftr .logo-name { font-size: 16px; font-weight: 900; color: #0f1117; font-family: 'Tajawal',sans-serif; }
  .zan-ftr .logo-div { width: 1px; height: 14px; background: rgba(46,196,182,0.4); }
  .zan-ftr .logo-sub { font-size: 8px; color: #2EC4B6; font-weight: 300; line-height: 1.3; }
  .report-body { padding: 0 20px 20px 20px; }
  h2.zan-sec { font-size: 14px; font-weight: 700; color: #0f1117; margin: 22px 0 10px 0; padding: 0 0 6px 10px; border-left: 3px solid #2EC4B6; border-bottom: 1px solid #e5e7ec; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
  th { background: #0f1117; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f1f5; font-size: 11px; }
  tr:nth-child(even) { background: #fafbfc; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 18px 0; }
  .kpi-box { border: 1px solid #e5e7ec; border-radius: 8px; padding: 10px 12px; border-top: 3px solid #2EC4B6; }
  .kpi-box .lbl { font-size: 9px; color: #6b7080; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-box .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .tier-strip { display: flex; gap: 8px; margin: 8px 0 16px 0; }
  .tier-card { flex: 1; border-radius: 8px; padding: 10px; text-align: center; }
  .tier-card .tl { font-size: 9px; font-weight: 600; }
  .tier-card .tv { font-size: 15px; font-weight: 700; margin-top: 3px; }
  @media print { .no-print { display: none !important; } }
</style></head><body>
<div class="zan-cover">
  <div class="logo-group"><span class="logo-name">${ar?'حصيف':'Haseef'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'حصيف':'Haseef'}<br>${ar?'لتطوير الوجهات':'Destination Development'}</span></div>
  <div class="sub">Financial Modeler</div>
  <div class="rtype">${reportTitle}</div>
  <div class="pname">${project.name}</div>
  <div class="ploc">${project.location||""} &middot; ${cur} &middot; ${dateStr}</div>
  <div class="conf">${ar?'سري':'CONFIDENTIAL'}</div>
</div>
<div class="zan-hdr"><div class="logo-group"><span class="logo-name">${ar?'حصيف':'Haseef'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'النمذجة':'Financial'}<br>${ar?'المالية':'Modeler'}</span></div><div class="title">${reportTitle} &mdash; ${project.name}</div></div>
<div class="report-body">${el.innerHTML}</div>
<div class="zan-ftr"><div class="logo-group"><span class="logo-name">${ar?'حصيف':'Haseef'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'النمذجة':'Financial'}<br>${ar?'المالية':'Modeler'}</span></div><div>${dateStr} &middot; ${ar?'سري':'Confidential'}</div></div>
</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}_${activeReport}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(ar?"تم تحميل التقرير":"Report downloaded","success");
  };

  // 10-year CF for bank pack
  const bankYears = Array.from({length: Math.min(10, h)}, (_, i) => i);

  return (<div>
    {/* ── Report selector cards ── */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,marginBottom:18}}>
      {Object.entries(reportLabels).map(([key,r]) => (
        <button key={key} onClick={() => setActiveReport(key)}
          style={{background:activeReport===key?"linear-gradient(135deg,#0f766e,#2EC4B6)":"#fff",color:activeReport===key?"#fff":"var(--text-primary)",
            border:activeReport===key?"none":"1px solid #e5e7ec",borderRadius:"var(--radius-lg)",padding:"18px",cursor:"pointer",textAlign:"start",transition:"all 0.2s",
            boxShadow:activeReport===key?"0 4px 16px rgba(46,196,182,0.25)":"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:26,marginBottom:8}}>{r.icon}</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{r.label}</div>
          <div style={{fontSize:11,opacity:0.75,fontWeight:400}}>{r.desc}</div>
        </button>
      ))}
    </div>

    {/* Phase filter */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:6}}>{ar?"اختر المراحل للتقرير":"Select phases for report"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"5px 12px",fontSize:11,background:selectedPhases.length===0?"var(--zan-navy-900)":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"var(--zan-navy-900)":"var(--border-default)")}}>
            {ar?"الكل":"All"}
          </button>
          {phaseNames.map(p=>(
            <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"5px 12px",fontSize:11,background:activePh.includes(p)&&selectedPhases.length>0?"var(--zan-teal-700)":"var(--surface-sidebar)",color:activePh.includes(p)&&selectedPhases.length>0?"#fff":"var(--text-primary)",border:"1px solid "+(activePh.includes(p)&&selectedPhases.length>0?"var(--zan-teal-700)":"var(--border-default)")}}>
              {p}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Export buttons */}
    <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
      {activeReport && <button className="zan-btn-prim" onClick={printReport} style={{background:"linear-gradient(135deg,#0f766e,#2EC4B6)",color:"var(--text-inverse)",border:"none",borderRadius:"var(--radius-md)",padding:"9px 20px",fontSize:12,fontWeight:600,cursor:"pointer",letterSpacing:0.3}}>{ar?"⬇ تحميل التقرير (HTML/PDF)":"⬇ Download Report (HTML/PDF)"}</button>}
      <button onClick={async()=>{try{await generateFormulaExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings);addToast(ar?"تم تصدير النموذج الكامل (Excel)":"Full Model exported (Excel)","success");}catch(e){console.error("Formula Excel error:",e);addToast((ar?"خطأ في التصدير: ":"Export error: ")+e.message,"error");}}} style={{...btnS,background:"var(--zan-teal-700)",color:"var(--text-inverse)",padding:"8px 18px",fontSize:12,border:"none",fontWeight:600,borderRadius:"var(--radius-md)"}}>
        {ar?"⬇ النموذج الكامل (Excel + معادلات)":"⬇ Full Model (Excel + Formulas)"}
      </button>
      <button onClick={async()=>{try{await generateTemplateExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings);addToast(ar?"تم تصدير النموذج الديناميكي (Excel)":"Dynamic Model exported (Excel)","success");}catch(e){console.error("Template Excel error:",e);addToast((ar?"خطأ في التصدير: ":"Export error: ")+e.message,"error");}}} style={{...btnS,background:"#1B4F72",color:"var(--text-inverse)",padding:"8px 18px",fontSize:12,border:"none",fontWeight:600,borderRadius:"var(--radius-md)"}}>
        {ar?"⬇ النموذج الديناميكي (15 شيت)":"⬇ Dynamic Model (15 sheets)"}
      </button>
      <button onClick={async()=>{try{await generateProfessionalExcel(project, results, financing, waterfall, incentivesResult, checks);addToast(ar?"تم تصدير تقرير البيانات (Excel)":"Data Report exported (Excel)","success");}catch(e){console.error("Data Excel error:",e);addToast((ar?"خطأ في التصدير: ":"Export error: ")+e.message,"error");}}} style={{...btnS,background:"var(--color-success-bg)",color:"var(--color-success-text)",padding:"8px 14px",fontSize:11,border:"1px solid #bbf7d0",fontWeight:500,borderRadius:"var(--radius-md)"}}>
        {ar?"⬇ تقرير بيانات (Excel)":"⬇ Data Report (Excel)"}
      </button>
    </div>

    {/* ── Report content ── */}
    <div ref={reportRef} dir={ar?"rtl":"ltr"} style={{textAlign:ar?"right":"left",fontFamily:ar?"'Tajawal','DM Sans','Segoe UI',system-ui,sans-serif":"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      {activeReport === "exec" && (
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"var(--text-primary)",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1,height:28,background:"#2EC4B6",opacity:0.5}} />
            <span style={{fontSize:11,color:"var(--zan-teal-500)",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"var(--text-primary)",fontWeight:800,marginTop:8,marginBottom:4,borderBottom:"none"}}>{project.name}</h1>
          <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #2EC4B6"}}>{project.location} | {cur} | {sy} - {sy + h} ({h} {ar?"سنة":"years"}) | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4, 1fr)",gap:8,marginBottom:20}}>
            {[
              {l:ar?"إجمالي التكاليف":"Total CAPEX",v:fmtM(fc.totalCapex),ac:"var(--color-danger)"},
              {l:ar?"إجمالي الإيرادات":"Total Income",v:fmtM(fc.totalIncome),ac:"var(--color-success-text)"},
              {l:ar?"IRR (قبل التمويل)":"Unlevered IRR",v:fc.irr?fmtPct(fc.irr*100):"N/A",ac:"var(--zan-teal-500)"},
              {l:"NPV @10%",v:fmtM(fc.npv10),ac:"#06b6d4"},
              ...(f&&f.mode!=="self"&&!isFiltered?[{l:ar?"IRR (بعد التمويل)":"Levered IRR",v:f.leveredIRR?fmtPct(f.leveredIRR*100):"N/A",ac:"#8b5cf6"},{l:ar?"إجمالي الدين":"Total Debt",v:fmtM(f.totalDebt),ac:"var(--color-warning)"}]:[]),
              ...(fw?[{l:ar?"عائد الممول (LP)":"Investor IRR (LP)",v:fw.lpIRR?fmtPct(fw.lpIRR*100):"N/A",ac:"#8b5cf6"},{l:ar?"مضاعف الممول (LP)":"Investor MOIC (LP)",v:fw.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"N/A",ac:"var(--zan-teal-700)"}]:[]),
            ].map((k,i) => (
              <div key={i} style={{...zanKpi(k.ac)}}>
                <div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:17,fontWeight:700,color:k.ac,marginTop:3}}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={zanSec}>{ar?"ملخص المراحل":"Phase Summary"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"var(--zan-navy-900)"}}>
              {(ar?["المرحلة","الأصول","التكاليف","الإيرادات","صافي التدفق","IRR"]:["Phase","Assets","CAPEX","Revenue","Net CF","IRR"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(results.phaseResults).filter(([name])=>activePh.includes(name)).map(([name,pr],ri)=>(
                <tr key={name} style={{background:ri%2===0?"#fff":"var(--surface-page)"}}>
                  <td style={{...zanTd,fontWeight:600}}>{name}</td>
                  <td style={{...zanTd,textAlign:numA}}>{pr.assetCount}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(pr.totalCapex)}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(pr.totalIncome)}</td>
                  <td style={{...zanTd,textAlign:numA,color:pr.totalNetCF>=0?"var(--color-success-text)":"var(--color-danger)"}}>{fmt(pr.totalNetCF)}</td>
                  <td style={{...zanTd,textAlign:numA,fontWeight:700}}>{pr.irr?fmtPct(pr.irr*100):"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{...zanSec,marginTop:24}}>{ar?"برنامج الأصول":"Asset Program"} ({filteredAssets.length} {ar?"أصل":"assets"}){isFiltered?" - "+activePh.join(", "):""}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead><tr style={{background:"var(--zan-navy-900)"}}>
              {(ar?["#","الأصل","التصنيف","المرحلة","المساحة","التكاليف","الإيرادات","النوع"]:["#","Asset","Category","Phase","GFA","CAPEX","Revenue","Type"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredAssets.map((a,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}>
                  <td style={zanTd}>{i+1}</td>
                  <td style={zanTd}>{a.name}</td>
                  <td style={zanTd}>{catL(a.category,ar)}</td>
                  <td style={zanTd}>{a.phase}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(a.gfa)}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(a.totalCapex)}</td>
                  <td style={{...zanTd,textAlign:numA,color:"var(--color-success-text)"}}>{fmt(a.totalRevenue)}</td>
                  <td style={zanTd}>{revL(a.revType,ar)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{...zanSec,marginTop:24}}>{ar?"التدفقات النقدية (10 سنوات)":"Cash Flow Overview (10 Years)"}</div>
          {(() => {
            const yrs = Math.min(10, h);
            const maxVal = Math.max(...Array.from({length:yrs},(_,y)=>Math.max(Math.abs(fc.income[y]||0),Math.abs(fc.capex[y]||0),Math.abs(fc.netCF[y]||0))),1);
            return <div style={{display:"grid",gap:4}}>
              {Array.from({length:yrs},(_,y)=>{
                const inc=fc.income[y]||0, cap=Math.abs(fc.capex[y]||0), net=fc.netCF[y]||0;
                return <div key={y} style={{display:"grid",gridTemplateColumns:"50px 1fr",gap:6,alignItems:"center",fontSize:10}}>
                  <div style={{fontWeight:600,color:"var(--text-secondary)",textAlign:numA}}>{sy+y}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {cap>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,cap/maxVal*100)+"%",height:6,background:"#fca5a5",borderRadius:3}} />
                      <span style={{fontSize:10,color:"var(--color-danger)",whiteSpace:"nowrap"}}>{fmtM(cap)}</span>
                    </div>}
                    {inc>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,inc/maxVal*100)+"%",height:6,background:"#86efac",borderRadius:3}} />
                      <span style={{fontSize:10,color:"var(--color-success-text)",whiteSpace:"nowrap"}}>{fmtM(inc)}</span>
                    </div>}
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,Math.abs(net)/maxVal*100)+"%",height:6,background:net>=0?"var(--zan-teal-700)":"#dc2626",borderRadius:3}} />
                      <span style={{fontSize:10,color:net>=0?"var(--zan-teal-700)":"#dc2626",fontWeight:600,whiteSpace:"nowrap"}}>{fmtM(net)}</span>
                    </div>
                  </div>
                </div>;
              })}
              <div style={{display:"flex",gap:16,marginTop:6,fontSize:9,color:"var(--text-secondary)"}}>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#fca5a5",borderRadius:2,marginRight:3}} />{ar?"التكاليف":"CAPEX"}</span>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#86efac",borderRadius:2,marginRight:3}} />{ar?"الإيرادات":"Income"}</span>
                <span><span style={{display:"inline-block",width:10,height:6,background:"var(--zan-teal-700)",borderRadius:2,marginRight:3}} />{ar?"صافي التدفق":"Net CF"}</span>
              </div>
            </div>;
          })()}

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={{...zanSec,marginTop:24}}>{ar?"الحوافز الحكومية":"Government Incentives"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8,marginBottom:8}}>
              {incentivesResult.capexGrantTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"منحة CAPEX":"CAPEX Grant"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(incentivesResult.capexGrantTotal)}</div></div>}
              {incentivesResult.landRentSavingTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"توفير إيجار الأرض":"Land Rent Savings"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(incentivesResult.landRentSavingTotal)}</div></div>}
              {incentivesResult.feeRebateTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"خصومات الرسوم":"Fee Rebates"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(incentivesResult.feeRebateTotal)}</div></div>}
            </div>
            <div style={{fontSize:11,padding:"8px 12px",background:"var(--color-success-bg)",borderRadius:"var(--radius-sm)",border:"1px solid #bbf7d0"}}>
              {ar?"إجمالي قيمة الحوافز":"Total Incentive Value"}: <strong style={{color:"var(--zan-teal-700)"}}>{fmtM(incentivesResult.totalIncentiveValue)}</strong>
            </div>
          </>}

          <div style={{...zanSec,marginTop:24}}>{ar?"توزيع الإيرادات حسب التصنيف":"Revenue Breakdown by Category"}</div>
          {(() => {
            const catMap = {};
            filteredAssets.forEach(a => { const cat = a.category||"Other"; catMap[cat] = (catMap[cat]||0) + (a.totalRevenue||0); });
            const cats = Object.entries(catMap).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
            const total = cats.reduce((s,[,v])=>s+v,0) || 1;
            const colors = ["var(--zan-teal-700)","#2EC4B6","var(--zan-teal-500)","#8b5cf6","var(--color-warning)","var(--color-danger)","#06b6d4","#ec4899"];
            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",height:24,borderRadius:"var(--radius-sm)",overflow:"hidden",marginBottom:10}}>
                {cats.map(([cat,val],i) => (
                  <div key={cat} style={{width:(val/total*100)+"%",background:colors[i%colors.length],minWidth:2}} title={`${catL(cat,ar)}: ${fmtM(val)} (${(val/total*100).toFixed(1)}%)`} />
                ))}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px"}}>
                {cats.map(([cat,val],i) => (
                  <div key={cat} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:colors[i%colors.length]}} />
                    <span style={{color:"var(--text-primary)"}}>{catL(cat,ar)}</span>
                    <span style={{fontWeight:700}}>{fmtM(val)}</span>
                    <span style={{color:"var(--text-tertiary)"}}>({(val/total*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>;
          })()}

          {/* CAPEX breakdown by phase */}
          <div style={{...zanSec,marginTop:24}}>{ar?"توزيع التكاليف حسب المرحلة":"CAPEX Distribution by Phase"}</div>
          {(() => {
            const phases = Object.entries(results.phaseResults).filter(([name])=>activePh.includes(name));
            const total = phases.reduce((s,[,pr])=>s+(pr.totalCapex||0),0) || 1;
            const colors = ["var(--zan-navy-900)","var(--zan-teal-700)","#2EC4B6","var(--zan-teal-500)","#8b5cf6"];
            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",height:24,borderRadius:"var(--radius-sm)",overflow:"hidden",marginBottom:10}}>
                {phases.map(([name,pr],i) => (
                  <div key={name} style={{width:(pr.totalCapex/total*100)+"%",background:colors[i%colors.length],minWidth:2}} title={`${name}: ${fmtM(pr.totalCapex)}`} />
                ))}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px"}}>
                {phases.map(([name,pr],i) => (
                  <div key={name} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:colors[i%colors.length]}} />
                    <span style={{fontWeight:600}}>{name}</span>
                    <span style={{fontWeight:700}}>{fmtM(pr.totalCapex)}</span>
                    <span style={{color:"var(--text-tertiary)"}}>({(pr.totalCapex/total*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>;
          })()}

          <div style={{...zanSec,marginTop:24}}>{ar?"سلامة النموذج":"Model Integrity"}</div>
          <div style={{fontSize:12,padding:"8px 12px",background:failCount===0?"#f0fdf4":"var(--color-danger-bg)",borderRadius:"var(--radius-sm)",border:failCount===0?"1px solid #bbf7d0":"1px solid #fecaca"}}>
            {failCount === 0 ? (ar?"✅ جميع الفحوصات ناجحة":"✅ All checks passed") : `⚠️ ${failCount} ${ar?"فحص فشل":"check(s) failed"}`}
          </div>
        </div>
      )}

      {activeReport === "bank" && (
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"var(--text-primary)",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1,height:28,background:"#2EC4B6",opacity:0.5}} />
            <span style={{fontSize:11,color:"var(--zan-teal-500)",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"var(--text-primary)",fontWeight:800,marginTop:8,marginBottom:4}}>{ar?"حزمة تقديم البنك":"Bank Submission Pack"}</h1>
          <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #2EC4B6"}}>{project.name} | {project.location} | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>

          {/* ── Bank Hero Strip: What the credit committee sees first ── */}
          {f && f.mode !== "self" && <div style={{background:"var(--surface-page)",borderRadius:"var(--radius-lg)",padding:16,marginBottom:22,border:"0.5px solid var(--border-default)"}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:10}}>
              {[
                {l:ar?"التسهيل المطلوب":"Facility Requested",v:fmtM(f?.maxDebt||0),sub:cur,ac:"var(--zan-teal-700)",big:true},
                {l:ar?"نسبة التمويل":"LTV",v:(project.maxLtvPct||70)+"%",sub:ar?"من تكلفة التطوير":"of dev cost",ac:"var(--zan-teal-500)"},
                {l:ar?"متوسط DSCR":"Avg DSCR",v:(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";})(),sub:(()=>{if(!f?.dscr)return "";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?(ar?"آمن":"Safe"):avg>=1.0?(ar?"حدي":"Marginal"):(ar?"ضعيف":"Weak");})(),ac:(()=>{if(!f?.dscr)return "var(--text-tertiary)";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?"var(--color-success-text)":avg>=1.0?"var(--color-warning)":"var(--color-danger)";})()},
                {l:ar?"أقل DSCR":"Min DSCR",v:(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?Math.min(...vals).toFixed(2)+"x":"—";})(),sub:(()=>{if(!f?.dscr)return "";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);if(!vals.length)return "";const yr=f.dscr.indexOf(Math.min(...vals));return yr>=0?(ar?"سنة ":"Year ")+(sy+yr):"";})(),ac:(()=>{if(!f?.dscr)return "var(--text-tertiary)";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const mn=vals.length?Math.min(...vals):0;return mn>=1.2?"var(--color-success-text)":mn>=1.0?"var(--color-warning)":"var(--color-danger)";})()},
              ].map((k,i)=>(
                <div key={i} style={{textAlign:"center",padding:"8px 6px"}}>
                  <div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.3,marginBottom:4}}>{k.l}</div>
                  <div style={{fontSize:k.big?24:22,fontWeight:800,color:k.ac}}>{k.v}</div>
                  <div style={{fontSize:9,color:k.ac,fontWeight:600,marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>}

          <div style={zanSec}>{ar?"1. دراسة المشروع":"1. Project Study"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              {[
                [ar?"اسم المشروع":"Project Name",project.name],[ar?"الموقع":"Location",project.location],[ar?"مساحة الأرض":"Land Area",fmt(project.landArea)+" sqm"],
                [ar?"نوع الأرض":"Land Type",project.landType],[ar?"إجمالي المساحة المبنية":"Total GFA",fmt(filteredAssets.reduce((s,a)=>s+(a.gfa||0),0))+" sqm"],
                [ar?"عدد الأصول":"Number of Assets",filteredAssets.length],[ar?"إجمالي تكلفة التطوير":"Total Development Cost",fmt(fc.totalCapex)+" "+cur],
                [ar?"الإيرادات السنوية (مستقرة)":"Projected Annual Income (Stabilized)",fmt(fc.income[Math.min(10,h-1)])+" "+cur],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}><td style={{...zanTd,color:"var(--text-secondary)",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"2. طلب التمويل":"2. Financing Request"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              {[
                [ar?"مبلغ التسهيل":"Requested Facility",fmt(f?.maxDebt||0)+" "+cur],
                [ar?"نسبة التمويل":"LTV Ratio",(project.maxLtvPct||70)+"%"],
                [ar?"المعدل المقترح":"Proposed Rate",(project.financeRate||6.5)+"% p.a."],
                [ar?"المدة":"Tenor",(project.loanTenor||7)+" "+(ar?"سنوات (تشمل ":"years (incl. ")+(project.debtGrace||3)+" "+(ar?"فترة سماح)":"grace)")],
                [ar?"نوع السداد":"Repayment",project.repaymentType==="amortizing"?(ar?"أقساط متساوية":"Equal Installments"):(ar?"دفعة واحدة":"Bullet")],
                [ar?"السداد":"Repayment",project.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}><td style={{...zanTd,color:"var(--text-secondary)",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"3. المصادر والاستخدامات":"3. Sources & Uses"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:"var(--zan-teal-700)"}}>{ar?"المصادر":"Sources"}</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={zanTd}>{ar?"الدين":"Senior Debt"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalDebt||0)}</td></tr>
                  <tr style={{background:"var(--surface-page)"}}><td style={zanTd}>{ar?"حقوق الملكية":"Equity"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalEquity||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"إجمالي المصادر":"Total Sources"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA}}>{fmt((f?.totalDebt||0)+(f?.totalEquity||0))}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:"var(--zan-teal-700)"}}>{ar?"الاستخدامات":"Uses"}</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={zanTd}>{ar?"تكاليف التطوير":"Development CAPEX"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(fc.totalCapex)}</td></tr>
                  {project.landType==="purchase"&&<tr style={{background:"var(--surface-page)"}}><td style={zanTd}>{ar?"شراء الأرض":"Land Purchase"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(project.landPurchasePrice)}</td></tr>}
                  <tr style={{background:"var(--surface-page)"}}><td style={zanTd}>{ar?"فوائد أثناء البناء":"Interest During Constr."}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalInterest||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"إجمالي الاستخدامات":"Total Uses"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA}}>{fmt(fc.totalCapex+(f?.totalInterest||0))}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={zanSec}>{ar?"4. التدفقات النقدية 10 سنوات وDSCR":"4. 10-Year Cash Flow & DSCR"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:9}}>
            <thead><tr style={{background:"var(--zan-navy-900)"}}>
              <th style={{...zanTh,fontSize:10}}>{ar?"البند":"Item"}</th>
              {bankYears.map(y=><th key={y} style={{...zanTh,textAlign:numA,fontSize:10}}>{sy+y}</th>)}
            </tr></thead>
            <tbody>
              {[
                {l:ar?"الإيرادات":"Revenue",v:fc.income,cl:"var(--color-success-text)"},
                {l:ar?"إيجار الأرض":"Land Rent",v:fc.landRent,cl:"var(--color-danger)"},
                {l:ar?"صافي الدخل التشغيلي":"NOI",v:bankYears.map(y=>(fc.income[y]||0)-(fc.landRent[y]||0)),cl:"var(--zan-navy-900)",b:true},
                {l:ar?"تكاليف التطوير":"CAPEX",v:fc.capex,cl:"var(--color-danger)"},
                ...(f&&f.mode!=="self"?[
                  {l:ar?"خدمة الدين":"Debt Service",v:f.debtService,cl:"var(--color-danger)"},
                  {l:ar?"رصيد الدين":"Debt Balance",v:f.debtBalClose,cl:"var(--color-info)"},
                  {l:"DSCR",v:bankYears.map(y=>f.dscr[y]),cl:"var(--zan-navy-900)",b:true,isDscr:true},
                ]:[]),
                {l:ar?"صافي التدفق":"Net CF",v:f&&f.mode!=="self"&&!isFiltered?f.leveredCF:fc.netCF,cl:"var(--zan-navy-900)",b:true},
              ].map((row,ri)=>(
                <tr key={ri} style={row.b?{fontWeight:700,background:"var(--surface-page)"}:{}}>
                  <td style={{padding:"3px 6px",borderBottom:"0.5px solid var(--surface-separator)",fontSize:9}}>{row.l}</td>
                  {bankYears.map(y=>{
                    const v = Array.isArray(row.v) ? row.v[y] : (row.v?.[y]||0);
                    if (row.isDscr) return <td key={y} style={{padding:"3px 6px",borderBottom:"0.5px solid var(--surface-separator)",textAlign:numA,fontSize:9,fontWeight:700,color:v===null?"var(--text-tertiary)":v>=1.2?"var(--color-success-text)":"var(--color-danger)"}}>{v===null?"—":v.toFixed(2)+"x"}</td>;
                    return <td key={y} style={{padding:"3px 6px",borderBottom:"0.5px solid var(--surface-separator)",textAlign:numA,fontSize:9,color:row.cl}}>{v===0?"—":fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"5. تحليل الضغط":"5. Stress Analysis"}</div>
          {(() => {
            const scenarios = [
              {l:ar?"الحالة الأساسية":"Base Case",capM:1,rentM:1,bg:"#f0fdf4",bd:"#bbf7d0",cl:"var(--color-success-text)"},
              {l:ar?"CAPEX +10%":"CAPEX +10%",capM:1.1,rentM:1,bg:"var(--color-danger-bg)",bd:"#fecaca",cl:"var(--color-danger)"},
              {l:ar?"إيرادات -15%":"Revenue -15%",capM:1,rentM:0.85,bg:"var(--color-danger-bg)",bd:"#fecaca",cl:"var(--color-danger)"},
              {l:ar?"CAPEX +10% وإيرادات -10%":"CAPEX +10% & Revenue -10%",capM:1.1,rentM:0.9,bg:"#fffbeb",bd:"#fde68a",cl:"#d97706"},
            ];
            const stressResults = scenarios.map(sc => {
              try {
                const p = {...project, customCapexMult:sc.capM, customRentMult:sc.rentM, activeScenario:"Custom"};
                const r = computeProjectCashFlows(p); const ir = computeIncentives(p,r); const sf = computeFinancing(p,r,ir);
                const minDscr = sf?.dscr ? sf.dscr.filter(d=>d!==null&&d!==Infinity).reduce((m,v)=>Math.min(m,v),999) : null;
                return {irr:r.consolidated.irr,npv:r.consolidated.npv10,dscr:minDscr===999?null:minDscr,levIrr:sf?.leveredIRR};
              } catch(e){ return {irr:null,npv:null,dscr:null,levIrr:null}; }
            });
            return <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
              <thead><tr style={{background:"var(--zan-navy-900)"}}>
                {(ar?["السيناريو","IRR المشروع","IRR بعد التمويل","أقل DSCR","NPV @10%"]:["Scenario","Project IRR","Levered IRR","Min DSCR","NPV @10%"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
              </tr></thead>
              <tbody>{scenarios.map((sc,i)=>(
                <tr key={i} style={{background:sc.bg}}>
                  <td style={{...zanTd,fontWeight:600,color:sc.cl}}>{sc.l}</td>
                  <td style={{...zanTd,textAlign:numA}}>{stressResults[i].irr?fmtPct(stressResults[i].irr*100):"—"}</td>
                  <td style={{...zanTd,textAlign:numA}}>{stressResults[i].levIrr?fmtPct(stressResults[i].levIrr*100):"—"}</td>
                  <td style={{...zanTd,textAlign:numA,fontWeight:700,color:stressResults[i].dscr===null?"var(--text-tertiary)":stressResults[i].dscr>=1.2?"var(--color-success-text)":"var(--color-danger)"}}>{stressResults[i].dscr!==null?stressResults[i].dscr.toFixed(2)+"x":"—"}</td>
                  <td style={{...zanTd,textAlign:numA,color:(stressResults[i].npv||0)>=0?"var(--color-success-text)":"var(--color-danger)"}}>{stressResults[i].npv?fmtM(stressResults[i].npv):"—"}</td>
                </tr>
              ))}</tbody>
            </table>;
          })()}

          {f && f.mode !== "self" && <>
            <div style={zanSec}>{ar?"6. اتجاه DSCR ورصيد الدين":"6. DSCR Trend & Debt Profile"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              {/* DSCR Trend */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--zan-teal-700)",marginBottom:8}}>{ar?"اتجاه DSCR":"DSCR Trend"}</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:2,height:80}}>
                  {bankYears.map(y => {
                    const d = f.dscr?.[y]; const val = d===null||d===undefined||d===Infinity ? 0 : d;
                    const h = Math.min(val/3*100, 100);
                    return <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{fontSize:9,fontWeight:700,color:val>=1.2?"var(--color-success-text)":val>0?"var(--color-danger)":"var(--text-tertiary)"}}>{val>0?val.toFixed(1)+"x":"—"}</div>
                      <div style={{width:"100%",height:h+"%",minHeight:2,background:val>=1.25?"#86efac":val>=1.0?"#fde68a":"#fca5a5",borderRadius:"2px 2px 0 0",transition:"height 0.3s"}} />
                      <div style={{fontSize:9,color:"var(--text-tertiary)"}}>{sy+y}</div>
                    </div>;
                  })}
                </div>
                <div style={{borderTop:"2px solid #ef4444",marginTop:0,position:"relative"}}>
                  <span style={{position:"absolute",top:-8,right:0,fontSize:9,color:"var(--color-danger)",fontWeight:600}}>1.0x {ar?"الحد الأدنى":"min"}</span>
                </div>
              </div>
              {/* Debt Balance Profile */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"var(--zan-teal-700)",marginBottom:8}}>{ar?"رصيد الدين":"Debt Balance Profile"}</div>
                {(() => {
                  const maxDebt = Math.max(...bankYears.map(y=>f.debtBalClose?.[y]||0),1);
                  return <div style={{display:"flex",alignItems:"flex-end",gap:2,height:80}}>
                    {bankYears.map(y => {
                      const bal = f.debtBalClose?.[y]||0;
                      const pct = bal/maxDebt*100;
                      return <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <div style={{fontSize:9,fontWeight:600,color:"var(--color-info)"}}>{bal>0?fmtM(bal):""}</div>
                        <div style={{width:"100%",height:pct+"%",minHeight:bal>0?2:0,background:"linear-gradient(180deg,#3b82f6,#93c5fd)",borderRadius:"2px 2px 0 0"}} />
                        <div style={{fontSize:9,color:"var(--text-tertiary)"}}>{sy+y}</div>
                      </div>;
                    })}
                  </div>;
                })()}
              </div>
            </div>
          </>}

          <div style={zanSec}>{ar?"7. تغطية الدين":"7. Debt Coverage Summary"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
            <thead><tr style={{background:"var(--zan-navy-900)"}}>
              {(ar?["المؤشر","القيمة","الحالة"]:["Metric","Value","Status"]).map(hh=><th key={hh} style={zanTh}>{hh}</th>)}
            </tr></thead>
            <tbody>
              {[
                [ar?"إجمالي خدمة الدين":"Total Debt Service",f?fmt((f.debtService||[]).reduce((a,b)=>a+b,0))+" "+cur:"—","—",""],
                [ar?"إجمالي الفوائد":"Total Interest",f?fmt(f.totalInterest||0)+" "+cur:"—","—",""],
                [ar?"متوسط DSCR":"Average DSCR",(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"var(--text-tertiary)"};const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?{t:ar?"آمن":"Safe",c:"var(--color-success-text)"}:avg>=1.0?{t:ar?"حدي":"Marginal",c:"var(--color-warning)"}:{t:ar?"ضعيف":"Weak",c:"var(--color-danger)"};})(),"dscr"],
                [ar?"أقل DSCR":"Minimum DSCR",(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?Math.min(...vals).toFixed(2)+"x":"—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"var(--text-tertiary)"};const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const mn=vals.length?Math.min(...vals):0;return mn>=1.2?{t:ar?"مقبول":"Acceptable",c:"var(--color-success-text)"}:mn>=1.0?{t:ar?"حدي":"Marginal",c:"var(--color-warning)"}:{t:ar?"غير كافٍ":"Insufficient",c:"var(--color-danger)"};})(),"dscr"],
                [ar?"فترة استرداد الدين":"Debt Payback",(()=>{let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=(f&&f.mode!=="self"?f.leveredCF[y]:fc.netCF[y])||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return(y+1)+" "+(ar?"سنة":"years");}return "—";})(),(()=>{let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=(f&&f.mode!=="self"?f.leveredCF[y]:fc.netCF[y])||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return y+1<=(project.loanTenor||7)?{t:ar?"ضمن المدة":"Within tenor",c:"var(--color-success-text)"}:{t:ar?"يتجاوز المدة":"Exceeds tenor",c:"var(--color-warning)"};}return {t:"—",c:"var(--text-tertiary)"};})(),"dscr"],
                [ar?"نسبة تغطية الفوائد":"Interest Cover (Yr 1 Op)",(()=>{if(!f?.dscr)return "—";for(let y=0;y<h;y++){if((fc.income[y]||0)>0&&f.interest[y]>0)return((fc.income[y]-Math.abs(fc.landRent[y]||0))/f.interest[y]).toFixed(2)+"x";}return "—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"var(--text-tertiary)"};for(let y=0;y<h;y++){if((fc.income[y]||0)>0&&f.interest[y]>0){const icr=(fc.income[y]-Math.abs(fc.landRent[y]||0))/f.interest[y];return icr>=2?{t:ar?"قوي":"Strong",c:"var(--color-success-text)"}:icr>=1.5?{t:ar?"مقبول":"Adequate",c:"var(--color-warning)"}:{t:ar?"ضعيف":"Weak",c:"var(--color-danger)"};}}return {t:"—",c:"var(--text-tertiary)"};})(),"dscr"],
              ].map(([label,val,status,type],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}>
                  <td style={{...zanTd,fontWeight:600}}>{label}</td>
                  <td style={{...zanTd,fontWeight:700,textAlign:numA}}>{val}</td>
                  {type==="dscr"?<td style={{...zanTd,textAlign:"center"}}><span style={{display:"inline-block",padding:"2px 10px",borderRadius:"var(--radius-lg)",fontSize:10,fontWeight:600,background:status.c+"18",color:status.c}}>{status.t}</span></td>:<td style={{...zanTd,color:"var(--text-tertiary)",textAlign:"center"}}></td>}
                </tr>
              ))}
            </tbody>
          </table>

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={zanSec}>{ar?"8. الحوافز الحكومية":"8. Government Incentives"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:8}}>
              <thead><tr style={{background:"var(--zan-navy-900)"}}>
                {(ar?["نوع الحافز","القيمة","الوصف"]:["Incentive Type","Value","Description"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {incentivesResult.capexGrantTotal>0&&<tr><td style={zanTd}>{ar?"منحة CAPEX":"CAPEX Grant"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"var(--zan-teal-700)"}}>{fmt(incentivesResult.capexGrantTotal)}</td><td style={{...zanTd,color:"var(--text-secondary)"}}>{ar?"خصم على تكاليف التطوير":"Reduction in development costs"}</td></tr>}
                {incentivesResult.landRentSavingTotal>0&&<tr style={{background:"var(--surface-page)"}}><td style={zanTd}>{ar?"خصم إيجار الأرض":"Land Rent Rebate"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"var(--zan-teal-700)"}}>{fmt(incentivesResult.landRentSavingTotal)}</td><td style={{...zanTd,color:"var(--text-secondary)"}}>{ar?"توفير في إيجار الأرض":"Savings on land lease payments"}</td></tr>}
                {f?.interestSubsidyTotal>0&&<tr><td style={zanTd}>{ar?"دعم الفائدة":"Interest Subsidy"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"var(--zan-teal-700)"}}>{fmt(f.interestSubsidyTotal)}</td><td style={{...zanTd,color:"var(--text-secondary)"}}>{ar?"دعم على تكلفة التمويل":"Subsidy on financing cost"}</td></tr>}
                {incentivesResult.feeRebateTotal>0&&<tr style={{background:"var(--surface-page)"}}><td style={zanTd}>{ar?"خصم رسوم":"Fee Rebates"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"var(--zan-teal-700)"}}>{fmt(incentivesResult.feeRebateTotal)}</td><td style={{...zanTd,color:"var(--text-secondary)"}}>{ar?"إعفاءات من الرسوم الحكومية":"Government fee waivers"}</td></tr>}
                <tr style={{fontWeight:700,background:"var(--color-success-bg)"}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"الإجمالي":"Total"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA,color:"var(--zan-teal-700)"}}>{fmt(incentivesResult.totalIncentiveValue+(f?.interestSubsidyTotal||0))}</td><td style={{...zanTd,borderTop:"2px solid #0f1117"}}></td></tr>
              </tbody>
            </table>
          </>}
        </div>
      )}

      {activeReport === "investor" && (
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"var(--text-primary)",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1,height:28,background:"#2EC4B6",opacity:0.5}} />
            <span style={{fontSize:11,color:"var(--zan-teal-500)",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"var(--text-primary)",fontWeight:800,marginTop:8,marginBottom:4}}>{ar?"مذكرة المستثمر":"Investor Memo"} - {project.name}</h1>
          <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #2EC4B6"}}>{project.location} | {cur} | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} | {ar?"سري":"CONFIDENTIAL"}</div>

          <div style={zanSec}>{ar?"أبرز المؤشرات":"Investment Highlights"}</div>
          {/* Primary LP metrics - big and prominent */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)",gap:10,marginBottom:12}}>
            {[
              {l:ar?"عائد LP المستهدف":"Target LP IRR",v:fw?.lpIRR?fmtPct(fw.lpIRR*100):"N/A",ac:"var(--zan-teal-700)",big:true},
              {l:ar?"مضاعف LP":"LP MOIC",v:fw?.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"N/A",ac:"var(--zan-teal-700)",big:true},
              {l:ar?"فترة الاسترداد":"LP Payback",v:(()=>{if(!fw?.lpNetCF)return "—";let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=fw.lpNetCF[y]||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return(y+1)+" "+(ar?"سنة":"yr");}return "—";})(),ac:"var(--zan-teal-700)",big:true},
            ].map((k,i) => (
              <div key={i} style={{...zanKpi(k.ac),textAlign:"center",padding:"14px 12px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:28,fontWeight:800,color:k.ac,marginTop:6}}>{k.v}</div>
              </div>
            ))}
          </div>
          {/* Secondary LP metrics */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4, 1fr)",gap:8,marginBottom:18}}>
            {[
              {l:ar?"العائد المفضل":"Preferred Return",v:(project.prefReturnPct||15)+"%",ac:"var(--zan-teal-500)"},
              {l:ar?"سنة التخارج":"Exit Year",v:fw?.exitYear||"TBD",ac:"var(--color-warning)"},
              {l:"DPI",v:fw?.lpTotalInvested>0?(fw.lpTotalDist/fw.lpTotalInvested).toFixed(2)+"x":"—",ac:"#8b5cf6"},
              {l:ar?"العائد النقدي":"Cash Yield",v:(()=>{if(!fw?.lpDist||!fw?.lpTotalInvested)return "—";const stabYr=Math.min(10,h-1);const dist=fw.lpDist[stabYr]||0;return dist>0&&fw.lpTotalInvested>0?fmtPct(dist/fw.lpTotalInvested*100):"—";})(),ac:"#06b6d4"},
            ].map((k,i) => (
              <div key={i} style={zanKpi(k.ac)}>
                <div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:18,fontWeight:800,color:k.ac,marginTop:4}}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={zanSec}>{ar?"شروط الصندوق":"Fund Terms"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:16}}>
            <tbody>
              {[
                [ar?"استراتيجية الصندوق":"Fund Strategy",ar?"تطوير واحتفاظ":"Develop & Hold"],[ar?"العملة":"Currency",cur],
                [ar?"حقوق ملكية GP (مساهمة الأرض)":"GP Equity (Land Contribution)",fw?fmt(fw.gpEquity)+" "+cur+" ("+fmtPct(fw.gpPct*100)+")":"—"],
                [ar?"حقوق ملكية LP المطلوبة":"LP Equity Required",fw?fmt(fw.lpEquity)+" "+cur+" ("+fmtPct(fw.lpPct*100)+")":"—"],
                [ar?"العائد المفضل":"Preferred Return",(project.prefReturnPct||15)+"% "+(ar?"سنوي على رأس المال غير المسترد":"p.a. on unreturned capital")],
                [ar?"اللحاق GP":"GP Catch-up",project.gpCatchup?(ar?"نعم":"Yes"):(ar?"لا":"No")],
                [ar?"أداء / حمولة":"Carry / Performance Fee",(project.carryPct||30)+"%"],
                [ar?"تقسيم الأرباح (بعد اللحاق)":"Profit Split (after catch-up)","LP "+(project.lpProfitSplitPct||70)+"% / GP "+(100-(project.lpProfitSplitPct||70))+"%"],
                [ar?"رسوم الاشتراك":"Subscription Fee",(project.subscriptionFeePct||2)+"%"],
                [ar?"رسوم الإدارة السنوية":"Annual Management Fee",(project.annualMgmtFeePct||0.9)+"%"],
                [ar?"رسوم المطور":"Developer Fee",(project.developerFeePct||10)+"% "+(ar?"من التكاليف":"of CAPEX")],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}><td style={{...zanTd,color:"var(--text-secondary)",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          {fw && <>
            <div style={zanSec}>{ar?"ملخص شلال التوزيعات":"Waterfall Distribution Summary"}</div>
            <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:isMobile?"wrap":"nowrap"}}>
              {[
                {l:ar?"إعادة رأس المال":"Return of Capital",v:fmtM(fw.tier1.reduce((a,b)=>a+b,0)),bg:"linear-gradient(135deg,#dbeafe,#eff6ff)",bd:"#93c5fd"},
                {l:ar?"العائد المفضل":"Preferred Return",v:fmtM(fw.tier2.reduce((a,b)=>a+b,0)),bg:"linear-gradient(135deg,#dcfce7,#f0fdf4)",bd:"#86efac"},
                {l:ar?"لحاق GP":"GP Catch-up",v:fmtM(fw.tier3.reduce((a,b)=>a+b,0)),bg:"linear-gradient(135deg,#fef3c7,#fffbeb)",bd:"#fcd34d"},
                {l:ar?"تقسيم الأرباح":"Profit Split",v:fmtM((fw.tier4LP.reduce((a,b)=>a+b,0))+(fw.tier4GP.reduce((a,b)=>a+b,0))),bg:"linear-gradient(135deg,#ede9fe,#f5f3ff)",bd:"#c4b5fd"},
              ].map((t,i)=>(
                <div key={i} style={{flex:1,minWidth:isMobile?140:"auto",background:t.bg,borderRadius:"var(--radius-md)",padding:"12px",textAlign:"center",border:`1px solid ${t.bd}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:"var(--text-primary)",letterSpacing:0.3}}>{t.l}</div>
                  <div style={{fontSize:16,fontWeight:800,marginTop:4,color:"var(--text-primary)"}}>{t.v}</div>
                </div>
              ))}
            </div>

            <div style={zanSec}>{ar?"تحليل العوائد":"Return Analysis"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"var(--zan-navy-900)"}}>
                <th style={zanTh}>{ar?"المؤشر":"Metric"}</th>
                <th style={{...zanTh,textAlign:"center",background:"var(--zan-teal-700)"}}>{ar?"المستثمر (LP)":"LP (Investor)"}</th>
                <th style={{...zanTh,textAlign:"center",opacity:0.7}}>{ar?"المطور (GP)":"GP (Sponsor)"}</th>
                <th style={{...zanTh,textAlign:"center",opacity:0.7}}>{ar?"المشروع":"Project"}</th>
              </tr></thead>
              <tbody>
                {[
                  [ar?"صافي IRR":"Net IRR",fw.lpIRR?fmtPct(fw.lpIRR*100):"—",fw.gpIRR?fmtPct(fw.gpIRR*100):"—",fc.irr?fmtPct(fc.irr*100):"—"],
                  ["MOIC",fw.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"—",fw.gpMOIC?fw.gpMOIC.toFixed(2)+"x":"—","—"],
                  [ar?"إجمالي المستثمر":"Total Invested",fmt(fw.lpTotalInvested),fmt(fw.gpTotalInvested),fmt(fc.totalCapex)],
                  [ar?"إجمالي التوزيعات":"Total Distributions",fmt(fw.lpTotalDist),fmt(fw.gpTotalDist),"—"],
                  ["NPV @10%",fmt(fw.lpNPV10),fmt(fw.gpNPV10),fmt(fw.projNPV10)],
                  ["NPV @12%",fmt(fw.lpNPV12),fmt(fw.gpNPV12),fmt(fw.projNPV12)],
                  ["NPV @14%",fmt(fw.lpNPV14),fmt(fw.gpNPV14),fmt(fw.projNPV14)],
                ].map(([metric,...vals],i)=>(
                  <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}>
                    <td style={{...zanTd,fontWeight:700}}>{metric}</td>
                    <td style={{...zanTd,textAlign:"center",fontWeight:700,color:"var(--zan-teal-700)",background:i%2===0?"#f0fdf4":"#ecfdf5"}}>{vals[0]}</td>
                    <td style={{...zanTd,textAlign:"center",color:"var(--text-secondary)"}}>{vals[1]}</td>
                    <td style={{...zanTd,textAlign:"center",color:"var(--text-tertiary)"}}>{vals[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={zanSec}>{ar?"التوزيعات التراكمية":"Cumulative Distributions"}</div>
            {(() => {
              const yrs = Math.min(h, 20);
              let lpCum=0, gpCum=0;
              const data = Array.from({length:yrs},(_,y)=>{lpCum+=fw.lpDist[y]||0;gpCum+=fw.gpDist[y]||0;return{y,lp:lpCum,gp:gpCum};});
              const maxCum = Math.max(data[data.length-1]?.lp||1, data[data.length-1]?.gp||1);
              return <div style={{marginBottom:16}}>
                {data.filter(d=>d.lp>0||d.gp>0).map(d=>(
                  <div key={d.y} style={{display:"grid",gridTemplateColumns:"50px 1fr",gap:6,marginBottom:3,alignItems:"center",fontSize:10}}>
                    <div style={{fontWeight:600,color:"var(--text-secondary)",textAlign:numA}}>{sy+d.y}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:Math.max(2,d.lp/maxCum*100)+"%",height:7,background:"linear-gradient(90deg,#8b5cf6,#a78bfa)",borderRadius:3}} />
                        <span style={{fontSize:10,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmtM(d.lp)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:Math.max(2,d.gp/maxCum*100)+"%",height:7,background:"linear-gradient(90deg,#0f766e,#2EC4B6)",borderRadius:3}} />
                        <span style={{fontSize:10,color:"var(--zan-teal-700)",whiteSpace:"nowrap"}}>{fmtM(d.gp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",gap:16,marginTop:6,fontSize:9,color:"var(--text-secondary)"}}>
                  <span><span style={{display:"inline-block",width:10,height:6,background:"#8b5cf6",borderRadius:2,marginRight:3}} />LP {ar?"التراكمي":"Cumulative"}</span>
                  <span><span style={{display:"inline-block",width:10,height:6,background:"var(--zan-teal-700)",borderRadius:2,marginRight:3}} />GP {ar?"التراكمي":"Cumulative"}</span>
                </div>
              </div>;
            })()}

            <div style={zanSec}>{ar?"دورة حياة الصندوق":"Fund Lifecycle"}</div>
            {(() => {
              // Determine key milestones
              let constrEnd=0, firstIncome=0, exitYr=fw.exitYear||h;
              for(let y=h-1;y>=0;y--){if((fc.capex[y]||0)>0){constrEnd=y;break;}}
              for(let y=0;y<h;y++){if((fc.income[y]||0)>0){firstIncome=y;break;}}
              const phases = [
                {l:ar?"سحب الإكوتي":"Equity Calls",from:0,to:constrEnd,color:"var(--color-danger)",icon:"📥"},
                {l:ar?"البناء":"Construction",from:0,to:constrEnd,color:"var(--color-warning)",icon:"🏗"},
                {l:ar?"الإيرادات":"Income Period",from:firstIncome,to:Math.min(exitYr,h-1),color:"var(--color-success-text)",icon:"💰"},
                ...(fw.exitYear?[{l:ar?"التخارج":"Exit",from:exitYr-1,to:exitYr-1,color:"#8b5cf6",icon:"🏦"}]:[]),
              ];
              const totalYrs = Math.min(h, 25);
              return <div style={{marginBottom:16}}>
                {phases.map((p,i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"var(--text-primary)"}}>{p.icon} {p.l}</div>
                    <div style={{position:"relative",height:16,background:"var(--surface-sidebar)",borderRadius:"var(--radius-md)"}}>
                      <div style={{position:"absolute",left:(p.from/totalYrs*100)+"%",width:Math.max(4,(p.to-p.from+1)/totalYrs*100)+"%",height:"100%",background:p.color,borderRadius:"var(--radius-md)",opacity:0.8}} />
                      <div style={{position:"absolute",left:(p.from/totalYrs*100)+"%",top:-1,fontSize:9,color:p.color,fontWeight:600}}>{sy+p.from}</div>
                      <div style={{position:"absolute",left:Math.min(95,((p.to+1)/totalYrs*100))+"%",top:-1,fontSize:9,color:p.color,fontWeight:600}}>{sy+p.to}</div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-tertiary)",marginTop:4,paddingLeft:128}}>
                  <span>{sy}</span><span>{sy+Math.floor(totalYrs/4)}</span><span>{sy+Math.floor(totalYrs/2)}</span><span>{sy+Math.floor(totalYrs*3/4)}</span><span>{sy+totalYrs-1}</span>
                </div>
              </div>;
            })()}

            <div style={zanSec}>{ar?"ملخص الرسوم":"Fee Summary"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
              <thead><tr style={{background:"var(--zan-navy-900)"}}>
                {(ar?["الرسم","النسبة/المبلغ","الإجمالي","التوقيت"]:["Fee","Rate/Amount","Total","Timing"]).map(hh=><th key={hh} style={zanTh}>{hh}</th>)}
              </tr></thead>
              <tbody>
                {[
                  [ar?"رسوم الاشتراك":"Subscription",(project.subscriptionFeePct||2)+"%",fmt(fw.feeSubscription||0),ar?"مرة واحدة":"One-time"],
                  [ar?"رسوم الإدارة":"Management",(project.annualMgmtFeePct||0.9)+"%",fmt(fw.feeMgmtTotal||fw.fees||0),ar?"سنوي":"Annual"],
                  [ar?"رسوم المطور":"Developer",(project.developerFeePct||10)+"% "+(ar?"من CAPEX":"of CAPEX"),fmt(fw.feeDeveloper||0),ar?"خلال البناء":"During construction"],
                  [ar?"رسوم الهيكلة":"Structuring",(project.structuringFeePct||1)+"%",fmt(fw.feeStructuring||0),ar?"مرة واحدة":"One-time"],
                  [ar?"رسوم الحفظ":"Custody",fmt(project.custodyFeeAnnual||50000)+"/"+(ar?"سنة":"yr"),fmt(fw.feeCustodyTotal||0),ar?"سنوي":"Annual"],
                ].map(([ff,r,t,ti],i)=>(
                  <tr key={i} style={{background:i%2===0?"#fff":"var(--surface-page)"}}>
                    <td style={{...zanTd,fontWeight:600}}>{ff}</td>
                    <td style={{...zanTd,color:"var(--text-secondary)"}}>{r}</td>
                    <td style={{...zanTd,textAlign:numA,fontWeight:600}}>{t}</td>
                    <td style={{...zanTd,color:"var(--text-secondary)"}}>{ti}</td>
                  </tr>
                ))}
                <tr style={{fontWeight:700,background:"var(--surface-page)"}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}} colSpan={2}>{ar?"الإجمالي":"Total Fees"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA,color:"var(--zan-teal-700)"}}>{fmt(fw.totalFees||fw.fees||0)}</td><td style={{...zanTd,borderTop:"2px solid #0f1117"}}></td></tr>
              </tbody>
            </table>
          </>}

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={zanSec}>{ar?"الحوافز الحكومية":"Government Incentives"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:8,marginBottom:8}}>
              {incentivesResult.capexGrantTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"منحة CAPEX":"CAPEX Grant"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(incentivesResult.capexGrantTotal)}</div></div>}
              {incentivesResult.landRentSavingTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"خصم إيجار الأرض":"Land Rent Savings"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(incentivesResult.landRentSavingTotal)}</div></div>}
              {f?.interestSubsidyTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"دعم الفائدة":"Interest Subsidy"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(f.interestSubsidyTotal)}</div></div>}
              {incentivesResult.feeRebateTotal>0&&<div style={zanKpi("var(--zan-teal-700)")}><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"خصم رسوم":"Fee Rebates"}</div><div style={{fontSize:16,fontWeight:700,color:"var(--zan-teal-700)",marginTop:3}}>{fmtM(incentivesResult.feeRebateTotal)}</div></div>}
            </div>
            <div style={{fontSize:11,padding:"8px 12px",background:"var(--color-success-bg)",borderRadius:"var(--radius-sm)",border:"1px solid #bbf7d0"}}>
              {ar?"إجمالي قيمة الحوافز":"Total Incentive Value"}: <strong style={{color:"var(--zan-teal-700)"}}>{fmtM(incentivesResult.totalIncentiveValue+(f?.interestSubsidyTotal||0))}</strong>
              {" "}<span style={{color:"var(--text-secondary)",fontSize:10}}>({ar?"تعزز عائد المستثمر":"enhances investor returns"})</span>
            </div>
          </>}
        </div>
      )}
    </div>

    {!activeReport && (
      <div style={{textAlign:"center",padding:"56px 24px",background:"var(--zan-navy-900)",borderRadius:"var(--radius-xl)",border:"1px solid #1e2230"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:40,fontWeight:900,color:"var(--text-inverse)",fontFamily:"'Tajawal',sans-serif"}}>{ar?"حصيف":"Haseef"}</span>
          <span style={{width:1,height:36,background:"#2EC4B6",opacity:0.4}} />
          <span style={{fontSize:13,color:"var(--zan-teal-500)",fontWeight:300,lineHeight:1.3,textAlign:"start"}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
        </div>
        <div style={{fontSize:13,color:"var(--text-secondary)"}}>
          {ar?"اختر تقريراً من الأعلى":"Select a report above to preview and download"}
        </div>
      </div>
    )}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: SCENARIO MANAGER
// ═══════════════════════════════════════════════════════════════

function runScenario(project, overrides) {
  try {
    const p = { ...project, ...overrides };
    const r = computeProjectCashFlows(p);
    const ir = computeIncentives(p, r);
    const f = computeFinancing(p, r, ir);
    const w = computeWaterfall(p, r, f, null);
    return { project: p, results: r, financing: f, waterfall: w };
  } catch (e) {
    console.error("runScenario error:", e);
    const r = computeProjectCashFlows({ ...project, ...overrides, activeScenario: "Base Case" });
    return { project: { ...project, ...overrides }, results: r, financing: null, waterfall: null };
  }
}

function ScenariosView({ project, results, financing, waterfall, lang }) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("compare");
  const [sensRow, setSensRow] = useState("rentEscalation");
  const [sensCol, setSensCol] = useState("softCostPct");
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [eduModal, setEduModal] = useState(null);
  if (!project || !results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:"var(--radius-xl)",textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>📊</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"أضف أصول أولاً":"Add Assets First"}</div>
      <div style={{fontSize:12,color:"var(--text-secondary)",maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"السيناريوهات تحتاج بيانات المشروع. أضف أصول من تبويب البرنامج.":"Scenarios need project data. Add assets from the Program tab."}</div>
    </div>
  );

  const cur = project.currency || "SAR";
  const ar = lang === "ar";
  const c = results.consolidated;
  const h = results.horizon;
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;

  const togglePhase = (p) => {
    setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  // Helper: extract phase-level consolidated from scenario result
  const getScenarioData = (s) => {
    if (!isFiltered) return s.results.consolidated;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = s.results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return {
      income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF,0.10), npv12: calcNPV(netCF,0.12), npv14: calcNPV(netCF,0.14),
    };
  };

  // ── Section 1: Scenario Comparison ──
  const scenarioDefs = [
    { name: ar?"الحالة الأساسية":"Base Case", overrides: { activeScenario: "Base Case" } },
    { name: ar?"تكاليف +10%":"CAPEX +10%", overrides: { activeScenario: "CAPEX +10%" } },
    { name: ar?"تكاليف -10%":"CAPEX -10%", overrides: { activeScenario: "CAPEX -10%" } },
    { name: ar?"إيجار +10%":"Rent +10%", overrides: { activeScenario: "Rent +10%" } },
    { name: ar?"إيجار -10%":"Rent -10%", overrides: { activeScenario: "Rent -10%" } },
    { name: ar?"تأخير +6 أشهر":"Delay +6mo", overrides: { activeScenario: "Delay +6 months" } },
    { name: ar?"تصاعد +0.5%":"Esc +0.5%", overrides: { activeScenario: "Escalation +0.5%" } },
    { name: ar?"تصاعد -0.5%":"Esc -0.5%", overrides: { activeScenario: "Escalation -0.5%" } },
  ];

  const scenarioResults = useMemo(() => {
    return scenarioDefs.map(sd => {
      const s = runScenario(project, sd.overrides);
      return { name: sd.name, ...s };
    });
  }, [project]);

  // ── Section 2: Sensitivity Table ──
  const avgOcc = Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/Math.max(1,(project.assets||[]).length));
  const sensParams = [
    { key: "rentEscalation", label: ar?"زيادة الإيجار %":"Rent Escalation %", base: project.rentEscalation, steps: [-0.5, -0.25, 0, 0.25, 0.5], unit: "%" },
    { key: "softCostPct", label: ar?"تكاليف غير مباشرة %":"Soft Cost %", base: project.softCostPct, steps: [-3, -1.5, 0, 1.5, 3], unit: "%" },
    { key: "contingencyPct", label: ar?"احتياطي %":"Contingency %", base: project.contingencyPct, steps: [-2, -1, 0, 1, 2], unit: "%" },
    { key: "financeRate", label: ar?"معدل الربح %":"Finance Rate %", base: project.financeRate, steps: [-1.5, -0.75, 0, 0.75, 1.5], unit: "%" },
    { key: "maxLtvPct", label: "LTV %", base: project.maxLtvPct, steps: [-15, -7.5, 0, 7.5, 15], unit: "%" },
    { key: "landRentAnnual", label: ar?"إيجار الأرض":"Land Rent", base: project.landRentAnnual, steps: [-2000000, -1000000, 0, 1000000, 2000000], unit: ar?"ريال":"SAR" },
    { key: "_occupancy", label: ar?"الإشغال %":"Occupancy %", base: avgOcc, steps: [-20, -10, 0, 10, 20], unit: "%",
      apply: (val) => ({ assets: (project.assets||[]).map(a => ({...a, stabilizedOcc: Math.max(0, Math.min(100, val))})) }) },
    { key: "exitMultiple", label: ar?"مضاعف التخارج":"Exit Multiple", base: project.exitMultiple??10, steps: [-3, -1.5, 0, 1.5, 3], unit: "x" },
    { key: "exitYear", label: ar?"سنة التخارج":"Exit Year", base: project.exitYear||(project.startYear||2026)+7, steps: [-2, -1, 0, 1, 2], unit: ar?"سنة":"yr", decimals: 0 },
  ];

  const rowParam = sensParams.find(p => p.key === sensRow) || sensParams[0];
  const colParam = sensParams.find(p => p.key === sensCol) || sensParams[1];

  const sensTable = useMemo(() => {
    const table = [];
    for (const rStep of rowParam.steps) {
      const row = [];
      for (const cStep of colParam.steps) {
        // Build overrides: use apply() for asset-level params, direct key for project-level
        const rVal = rowParam.base + rStep;
        const cVal = colParam.base + cStep;
        const rOverride = rowParam.apply ? rowParam.apply(rVal) : { [rowParam.key]: rVal };
        const cOverride = colParam.apply ? colParam.apply(cVal) : { [colParam.key]: cVal };
        const overrides = { activeScenario: "Base Case", ...rOverride, ...cOverride };
        // If both params modify assets, merge them
        if (rOverride.assets && cOverride.assets) {
          overrides.assets = cOverride.assets; // column wins (both can't be occupancy since they're different params)
        }
        const s = runScenario(project, overrides);
        const sd = isFiltered ? (() => {
          const income = new Array(h).fill(0), capex = new Array(h).fill(0), netCF = new Array(h).fill(0);
          activePh.forEach(pName => { const pr = s.results.phaseResults?.[pName]; if (!pr) return; for (let y = 0; y < h; y++) { income[y]+=pr.income[y]||0; capex[y]+=pr.capex[y]||0; netCF[y]+=pr.netCF[y]||0; }});
          return { irr: calcIRR(netCF), npv10: calcNPV(netCF,0.10) };
        })() : s.results.consolidated;
        row.push({
          irr: sd.irr,
          npv: sd.npv10,
          levIrr: s.financing?.leveredIRR || null,
          rVal, cVal,
        });
      }
      table.push(row);
    }
    return table;
  }, [project, sensRow, sensCol, selectedPhases]);

  // ── Section 3: Break-even ──
  // Helper to get NPV from scenario result respecting phase filter
  const getFilteredNPV = (r) => {
    if (!isFiltered) return r.consolidated.npv10;
    const netCF = new Array(h).fill(0);
    activePh.forEach(pName => { const pr = r.phaseResults?.[pName]; if (!pr) return; for (let y=0;y<h;y++) netCF[y]+=pr.netCF[y]||0; });
    return calcNPV(netCF, 0.10);
  };

  const breakeven = useMemo(() => {
    const results = {};
    // Break-even occupancy: find occ where NPV=0 (2% steps for accuracy)
    const filteredAssetPhases = isFiltered ? activePh : null;
    for (let occ = 100; occ >= 0; occ -= 2) {
      const assets = project.assets.map(a => {
        if (filteredAssetPhases && !filteredAssetPhases.includes(a.phase)) return a;
        return { ...a, stabilizedOcc: occ };
      });
      const p2 = { ...project, assets };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.occupancy = occ + 2;
        break;
      }
    }
    // Break-even rent reduction (2% steps)
    for (let mult = 100; mult >= 0; mult -= 2) {
      const p2 = { ...project, activeScenario: "Custom", customRentMult: mult, customCapexMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.rentDrop = 100 - mult - 2;
        break;
      }
    }
    // Break-even CAPEX increase (2% steps, up to 300%)
    for (let mult = 100; mult <= 300; mult += 2) {
      const p2 = { ...project, activeScenario: "Custom", customCapexMult: mult, customRentMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.capexIncrease = mult - 100 - 2;
        break;
      }
    }
    // Break-even finance rate: what rate makes NPV=0?
    if (project.finMode !== "self") {
      const baseRate = project.financeRate ?? 6.5;
      for (let rate = baseRate; rate <= 25; rate += 0.5) {
        const p2 = { ...project, financeRate: rate };
        const r = computeProjectCashFlows(p2);
        const ir2 = computeIncentives(p2, r);
        const f2 = computeFinancing(p2, r, ir2);
        if (f2 && f2.leveredIRR !== null && f2.leveredIRR <= 0) {
          results.financeRate = rate - 0.5;
          results.financeRateMargin = (rate - 0.5) - baseRate;
          break;
        }
      }
    }
    // Break-even delay: how many months of delay kills NPV?
    for (let delay = 0; delay <= 36; delay += 3) {
      const p2 = { ...project, activeScenario: "Custom", customDelay: delay, customCapexMult: 100, customRentMult: 100, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.delayMonths = delay - 3;
        break;
      }
    }
    return results;
  }, [project, selectedPhases]);

  const sections = [
    { key: "compare", label: lang==="ar"?"مقارنة السيناريوهات":"Scenario Comparison" },
    { key: "sensitivity", label: lang==="ar"?"جدول الحساسية":"Sensitivity Table" },
    { key: "breakeven", label: lang==="ar"?"تحليل نقطة التعادل":"Break-Even Analysis" },
  ];

  return (<div>
    {/* Sub-nav */}
    <div style={{display:"flex",gap:8,marginBottom:10}}>
      {sections.map(s => (
        <button key={s.key} onClick={() => setActiveSection(s.key)}
          style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:500,
            background:activeSection===s.key?"#1e3a5f":"#fff",
            color:activeSection===s.key?"#fff":"var(--text-primary)",
            border:"1px solid "+(activeSection===s.key?"#1e3a5f":"var(--border-default)")}}>
          {s.label}
        </button>
      ))}
    </div>
    <div style={{marginBottom:14}}><HelpLink contentKey="scenarioAnalysis" lang={lang} onOpen={setEduModal} label={ar?"كيف أستخدم تحليل السيناريوهات؟":"How to use Scenario Analysis?"} /></div>

    {/* Phase filter */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:6}}>{lang==="ar"?"اختر المراحل للتحليل":"Select phases for analysis"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"5px 12px",fontSize:11,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)")}}>
            {lang==="ar"?"الكل":"All"}
          </button>
          {phaseNames.map(p=>(
            <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"5px 12px",fontSize:11,background:activePh.includes(p)&&selectedPhases.length>0?"var(--zan-teal-500)":"var(--surface-sidebar)",color:activePh.includes(p)&&selectedPhases.length>0?"#fff":"var(--text-primary)",border:"1px solid "+(activePh.includes(p)&&selectedPhases.length>0?"var(--zan-teal-500)":"var(--border-default)")}}>
              {p}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* ── Scenario Comparison ── */}
    {activeSection === "compare" && (
      <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:600}}>
          {lang==="ar"?"مقارنة 8 سيناريوهات":"8 Scenario Comparison"}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead><tr>
              <th style={{...thSt,minWidth:130,position:"sticky",left:0,background:"var(--surface-page)",zIndex:2}}>{lang==="ar"?"المؤشر":"Metric"}</th>
              {scenarioResults.map((s,i) => <th key={i} style={{...thSt,textAlign:"right",minWidth:100}}>{s.name}</th>)}
            </tr></thead>
            <tbody>
              {[
                { label: lang==="ar"?"إجمالي التكاليف":"Total CAPEX", fn: s => getScenarioData(s).totalCapex, fmt: v => fmt(v), color: "var(--color-danger)", tip:"إجمالي البناء + غير مباشرة + طوارئ\nAll construction + soft costs + contingency" },
                { label: lang==="ar"?"إجمالي الإيرادات":"Total Income", fn: s => getScenarioData(s).totalIncome, fmt: v => fmt(v), color: "var(--color-success-text)", tip:"مجموع الإيرادات خلال كامل فترة النموذج\nTotal revenue over entire projection period" },
                { label: ar?"IRR قبل التمويل":"Unlevered IRR", fn: s => getScenarioData(s).irr, fmt: v => v !== null ? fmtPct(v*100) : "N/A", color: "var(--zan-teal-500)", tip:"معدل العائد بدون تمويل. فوق 12% قوي\nReturn ignoring debt. Above 12% is strong" },
                { label: "NPV @10%", fn: s => getScenarioData(s).npv10, fmt: v => fmtM(v), color: "#06b6d4", tip:"القيمة الحالية بخصم 10%. موجب = يخلق قيمة\nPresent value at 10% discount. Positive = value-creating" },
                { label: "NPV @12%", fn: s => getScenarioData(s).npv12, fmt: v => fmtM(v), tip:"القيمة الحالية بخصم 12%\nPresent value at 12% discount rate" },
                ...(!isFiltered?[{ label: "Levered IRR", fn: s => s.financing?.leveredIRR, fmt: v => v !== null && v !== undefined ? fmtPct(v*100) : "—", color: "#8b5cf6", tip:"معدل العائد بعد التمويل\nReturn after debt service" }]:[]),
                { label: lang==="ar"?"صافي التدفق":"Total Net CF", fn: s => getScenarioData(s).totalNetCF, fmt: v => fmtM(v), tip:"صافي التدفق = إيرادات - تكاليف - إيجار أرض\nNet CF = Income - CAPEX - Land Rent" },
                ...(!isFiltered?[
                  { label: ar?"عائد الممول (LP)":"Investor IRR (LP)", fn: s => s.waterfall?.lpIRR, fmt: v => v !== null && v !== undefined ? fmtPct(v*100) : "—", color: "#8b5cf6", tip:"معدل عائد المستثمر بعد كل الرسوم\nInvestor return after all fees" },
                  { label: ar?"مضاعف الممول (LP)":"Investor MOIC (LP)", fn: s => s.waterfall?.lpMOIC, fmt: v => v ? v.toFixed(2)+"x" : "—", tip:"مضاعف رأس مال المستثمر. 2x = ضعّف فلوسه\nInvestor multiple. 2x = doubled money" },
                ]:[]),
              ].map((metric, mi) => {
                const baseVal = metric.fn(scenarioResults[0]);
                return (
                  <tr key={mi} style={mi%2===0?{}:{background:"var(--surface-page)"}}>
                    <td style={{...tdSt,position:"sticky",left:0,background:mi%2===0?"#fff":"var(--surface-page)",zIndex:1,fontWeight:600,fontSize:11}}>{metric.tip?<Tip text={metric.tip}>{metric.label}</Tip>:metric.label}</td>
                    {scenarioResults.map((s, si) => {
                      const val = metric.fn(s);
                      const isBase = si === 0;
                      const isBetter = typeof val === "number" && typeof baseVal === "number" && val > baseVal;
                      const isWorse = typeof val === "number" && typeof baseVal === "number" && val < baseVal;
                      return (
                        <td key={si} style={{...tdN,fontSize:11,fontWeight:isBase?700:400,
                          color: isBase ? (metric.color || "var(--text-primary)") : isBetter ? "var(--color-success-text)" : isWorse ? "var(--color-danger)" : "var(--text-secondary)",
                          background: isBase ? "#f0f4ff" : undefined }}>
                          {metric.fmt(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"10px 16px",fontSize:10,color:"var(--text-tertiary)",borderTop:"1px solid #f0f1f5"}}>
          {lang==="ar"?"الأزرق = الحالة الأساسية | الأخضر = أفضل | الأحمر = أسوأ":"Blue = Base Case | Green = Better than base | Red = Worse than base"}
        </div>
      </div>
    )}

    {/* ── Sensitivity Table ── */}
    {activeSection === "sensitivity" && (
      <div>
        <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:3}}>{lang==="ar"?"المحور العمودي (الصفوف)":"Row Variable"}</div>
            <select value={sensRow} onChange={e => setSensRow(e.target.value)} style={{padding:"6px 10px",borderRadius:5,border:"0.5px solid var(--border-default)",fontSize:12}}>
              {sensParams.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:3}}>{lang==="ar"?"المحور الأفقي (الأعمدة)":"Column Variable"}</div>
            <select value={sensCol} onChange={e => setSensCol(e.target.value)} style={{padding:"6px 10px",borderRadius:5,border:"0.5px solid var(--border-default)",fontSize:12}}>
              {sensParams.filter(p => p.key !== sensRow).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* IRR Sensitivity */}
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:600}}>
            {lang==="ar"?"حساسية العائد (Unlevered IRR)":"Unlevered IRR Sensitivity"}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{...tblStyle,fontSize:11}}>
              <thead><tr>
                <th style={{...thSt,background:"#1e3a5f",color:"var(--text-inverse)",minWidth:100}}>{rowParam.label} \\ {colParam.label}</th>
                {colParam.steps.map((s, i) => <th key={i} style={{...thSt,textAlign:"center",background:s===0?"var(--zan-teal-500)":"#1e3a5f",color:"var(--text-inverse)",minWidth:80}}>{(colParam.base + s).toFixed(colParam.decimals??(colParam.steps.some(st=>st%1!==0)?1:colParam.base<10?2:0))}</th>)}
              </tr></thead>
              <tbody>
                {sensTable.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{...tdSt,fontWeight:600,background:rowParam.steps[ri]===0?"#dbeafe":"var(--surface-page)",fontSize:11}}>
                      {(rowParam.base + rowParam.steps[ri]).toFixed(rowParam.decimals??(rowParam.steps.some(st=>st%1!==0)?1:rowParam.base<10?2:0))}
                    </td>
                    {row.map((cell, ci) => {
                      const isBase = rowParam.steps[ri] === 0 && colParam.steps[ci] === 0;
                      const irr = cell.irr;
                      const bg = isBase ? "#dbeafe" : irr === null ? "var(--surface-page)" : irr >= 0.15 ? "#dcfce7" : irr >= 0.10 ? "#fefce8" : irr >= 0 ? "#ffedd5" : "var(--color-danger-bg)";
                      const fg = irr === null ? "var(--text-tertiary)" : irr >= 0.15 ? "#166534" : irr >= 0.10 ? "#854d0e" : irr >= 0 ? "#9a3412" : "#991b1b";
                      return <td key={ci} style={{...tdN,background:bg,color:fg,fontWeight:isBase?700:500,fontSize:11}}>
                        {irr !== null ? fmtPct(irr * 100) : "N/A"}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:"8px 16px",fontSize:10,color:"var(--text-tertiary)"}}>
            {lang==="ar"?"أخضر ≥15% | أصفر ≥10% | برتقالي ≥0% | أحمر < 0% | أزرق = الحالة الأساسية":"Green ≥15% | Yellow ≥10% | Orange ≥0% | Red <0% | Blue = Base Case"}
          </div>
        </div>

        {/* NPV Sensitivity */}
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:600}}>
            {lang==="ar"?"حساسية القيمة الحالية (NPV @10%)":"NPV @10% Sensitivity"}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{...tblStyle,fontSize:11}}>
              <thead><tr>
                <th style={{...thSt,background:"#1e3a5f",color:"var(--text-inverse)",minWidth:100}}>{rowParam.label} \\ {colParam.label}</th>
                {colParam.steps.map((s, i) => <th key={i} style={{...thSt,textAlign:"center",background:s===0?"var(--zan-teal-500)":"#1e3a5f",color:"var(--text-inverse)",minWidth:80}}>{(colParam.base + s).toFixed(colParam.decimals??(colParam.steps.some(st=>st%1!==0)?1:colParam.base<10?2:0))}</th>)}
              </tr></thead>
              <tbody>
                {sensTable.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{...tdSt,fontWeight:600,background:rowParam.steps[ri]===0?"#dbeafe":"var(--surface-page)",fontSize:11}}>
                      {(rowParam.base + rowParam.steps[ri]).toFixed(rowParam.decimals??(rowParam.steps.some(st=>st%1!==0)?1:rowParam.base<10?2:0))}
                    </td>
                    {row.map((cell, ci) => {
                      const isBase = rowParam.steps[ri] === 0 && colParam.steps[ci] === 0;
                      const npv = cell.npv;
                      const bg = isBase ? "#dbeafe" : npv > 0 ? "#dcfce7" : "var(--color-danger-bg)";
                      const fg = npv > 0 ? "#166534" : "#991b1b";
                      return <td key={ci} style={{...tdN,background:bg,color:fg,fontWeight:isBase?700:500,fontSize:11}}>
                        {fmtM(npv)}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* ── Break-Even Analysis ── */}
    {activeSection === "breakeven" && (
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:14}}>
          {/* Occupancy break-even */}
          <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقل نسبة إشغال تخلي NPV موجب. تحتها المشروع يخسر قيمة&#10;Minimum occupancy where NPV stays positive. Below this, project loses value">{lang==="ar"?"نقطة تعادل الإشغال":"Occupancy Break-Even"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.occupancy?"var(--color-warning)":"var(--color-success-text)"}}>
              {breakeven.occupancy ? breakeven.occupancy + "%" : "> 0%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6}}>
              {lang==="ar"?"الحد الأدنى للإشغال لتحقيق NPV@10% موجب":"Min occupancy for positive NPV@10%"}
            </div>
            <div style={{marginTop:12,height:8,background:"var(--surface-sidebar)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:(breakeven.occupancy||5)+"%",background:breakeven.occupancy>70?"var(--color-danger)":breakeven.occupancy>50?"var(--color-warning)":"var(--color-success-text)",borderRadius:4,transition:"width 0.3s"}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text-tertiary)",marginTop:3}}>
              <span>0%</span><span>{lang==="ar"?"الحالي: ":"Current: "}~{Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1))}%</span><span>100%</span>
            </div>
          </div>

          {/* Rent drop tolerance */}
          <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقصى انخفاض بالإيجار قبل ما يصير NPV سالب&#10;Maximum rent decrease before NPV turns negative">{lang==="ar"?"تحمل انخفاض الإيجار":"Rent Drop Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.rentDrop?"var(--color-warning)":"var(--color-success-text)"}}>
              {breakeven.rentDrop ? "-" + breakeven.rentDrop + "%" : "> -100%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6}}>
              {lang==="ar"?"أقصى انخفاض في الإيجارات مع بقاء NPV@10% موجب":"Max rent reduction keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:8,background:"var(--surface-sidebar)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,breakeven.rentDrop||100)+"%",background:breakeven.rentDrop<15?"var(--color-danger)":breakeven.rentDrop<30?"var(--color-warning)":"var(--color-success-text)",borderRadius:4}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text-tertiary)",marginTop:3}}>
              <span>{lang==="ar"?"مخاطرة عالية":"High Risk"}</span><span>{lang==="ar"?"هامش أمان":"Safety Margin"}</span>
            </div>
          </div>

          {/* CAPEX increase tolerance */}
          <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقصى زيادة بالتكاليف قبل ما يصير NPV سالب&#10;Maximum cost overrun before NPV turns negative">{lang==="ar"?"تحمل زيادة التكاليف":"CAPEX Increase Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.capexIncrease?"var(--color-warning)":"var(--color-success-text)"}}>
              {breakeven.capexIncrease ? "+" + breakeven.capexIncrease + "%" : "> +100%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6}}>
              {lang==="ar"?"أقصى زيادة في التكاليف مع بقاء NPV@10% موجب":"Max CAPEX increase keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:8,background:"var(--surface-sidebar)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,breakeven.capexIncrease||100)+"%",background:breakeven.capexIncrease<15?"var(--color-danger)":breakeven.capexIncrease<30?"var(--color-warning)":"var(--color-success-text)",borderRadius:4}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text-tertiary)",marginTop:3}}>
              <span>{lang==="ar"?"مخاطرة عالية":"High Risk"}</span><span>{lang==="ar"?"هامش أمان":"Safety Margin"}</span>
            </div>
          </div>

          {/* Finance rate tolerance (only for debt modes) */}
          {project.finMode !== "self" && <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أعلى معدل ربح بنكي قبل ما يصير العائد سالب&#10;Maximum finance rate before levered IRR turns negative">{lang==="ar"?"تحمل ارتفاع الفائدة":"Finance Rate Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.financeRate?"var(--color-warning)":"var(--color-success-text)"}}>
              {breakeven.financeRate ? breakeven.financeRate.toFixed(1) + "%" : "> 25%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6}}>
              {lang==="ar"?`الحالي: ${project.financeRate??6.5}% · هامش: ${breakeven.financeRateMargin ? "+"+breakeven.financeRateMargin.toFixed(1)+"%" : "واسع"}`:`Current: ${project.financeRate??6.5}% · Margin: ${breakeven.financeRateMargin ? "+"+breakeven.financeRateMargin.toFixed(1)+"%" : "wide"}`}
            </div>
            <div style={{marginTop:12,height:8,background:"var(--surface-sidebar)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,(breakeven.financeRateMargin||20)*5)+"%",background:(breakeven.financeRateMargin||20)<3?"var(--color-danger)":(breakeven.financeRateMargin||20)<6?"var(--color-warning)":"var(--color-success-text)",borderRadius:4}} />
            </div>
          </div>}

          {/* Delay tolerance */}
          <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقصى تأخير بالبناء قبل ما يصير NPV سالب&#10;Maximum construction delay before NPV turns negative">{lang==="ar"?"تحمل التأخير":"Delay Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.delayMonths?"var(--color-warning)":"var(--color-success-text)"}}>
              {breakeven.delayMonths != null ? breakeven.delayMonths + (lang==="ar"?" شهر":" mo") : "> 36" + (lang==="ar"?" شهر":" mo")}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6}}>
              {lang==="ar"?"أقصى تأخير في البناء مع بقاء NPV@10% موجب":"Max construction delay keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:8,background:"var(--surface-sidebar)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,((breakeven.delayMonths||36)/36)*100)+"%",background:(breakeven.delayMonths||36)<6?"var(--color-danger)":(breakeven.delayMonths||36)<12?"var(--color-warning)":"var(--color-success-text)",borderRadius:4}} />
            </div>
          </div>
        </div>
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",padding:18,marginTop:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{lang==="ar"?"ملخص المخاطر":"Risk Summary"}</div>
          <table style={{...tblStyle,fontSize:12}}>
            <thead><tr>
              <th style={thSt}>{lang==="ar"?"المتغير":"Variable"}</th>
              <th style={{...thSt,textAlign:"center"}}><Tip text="القيمة اللي عندها NPV يصير صفر&#10;Value where NPV becomes zero">{lang==="ar"?"نقطة التعادل":"Break-Even"}</Tip></th>
              <th style={{...thSt,textAlign:"center"}}>{lang==="ar"?"القيمة الحالية":"Current Value"}</th>
              <th style={{...thSt,textAlign:"center"}}><Tip text="الفرق بين الوضع الحالي ونقطة التعادل. أكبر = أأمن&#10;Gap between current and break-even. Larger = safer">{lang==="ar"?"هامش الأمان":"Safety Margin"}</Tip></th>
              <th style={{...thSt,textAlign:"center"}}><Tip text="منخفض = هامش أمان كبير. مرتفع = قريب من نقطة التعادل&#10;Low = large safety margin. High = close to break-even">{lang==="ar"?"التقييم":"Assessment"}</Tip></th>
            </tr></thead>
            <tbody>
              {[
                {
                  label: lang==="ar"?"الإشغال":"Occupancy",
                  be: breakeven.occupancy ? breakeven.occupancy+"%" : "< 5%",
                  current: Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1))+"%",
                  margin: breakeven.occupancy ? (Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1)) - breakeven.occupancy) + " pts" : "Wide",
                  risk: !breakeven.occupancy || breakeven.occupancy < 50 ? "low" : breakeven.occupancy < 70 ? "med" : "high",
                },
                {
                  label: lang==="ar"?"انخفاض الإيجار":"Rent Reduction",
                  be: breakeven.rentDrop ? "-"+breakeven.rentDrop+"%" : "> 100%",
                  current: "Base (0%)",
                  margin: breakeven.rentDrop ? breakeven.rentDrop+"%" : "> 100%",
                  risk: !breakeven.rentDrop || breakeven.rentDrop > 30 ? "low" : breakeven.rentDrop > 15 ? "med" : "high",
                },
                {
                  label: lang==="ar"?"زيادة التكاليف":"CAPEX Increase",
                  be: breakeven.capexIncrease ? "+"+breakeven.capexIncrease+"%" : "> 100%",
                  current: "Base (0%)",
                  margin: breakeven.capexIncrease ? breakeven.capexIncrease+"%" : "> 100%",
                  risk: !breakeven.capexIncrease || breakeven.capexIncrease > 30 ? "low" : breakeven.capexIncrease > 15 ? "med" : "high",
                },
                ...(project.finMode !== "self" ? [{
                  label: lang==="ar"?"معدل الربح":"Finance Rate",
                  be: breakeven.financeRate ? breakeven.financeRate.toFixed(1)+"%" : "> 25%",
                  current: (project.financeRate??6.5)+"%",
                  margin: breakeven.financeRateMargin ? "+"+breakeven.financeRateMargin.toFixed(1)+"%" : "> 18%",
                  risk: !breakeven.financeRateMargin || breakeven.financeRateMargin > 6 ? "low" : breakeven.financeRateMargin > 3 ? "med" : "high",
                }] : []),
                {
                  label: lang==="ar"?"تأخير البناء":"Construction Delay",
                  be: breakeven.delayMonths != null ? breakeven.delayMonths+(lang==="ar"?" شهر":" mo") : "> 36"+(lang==="ar"?" شهر":" mo"),
                  current: lang==="ar"?"بدون تأخير":"No delay",
                  margin: breakeven.delayMonths != null ? breakeven.delayMonths+(lang==="ar"?" شهر":" mo") : "> 36"+(lang==="ar"?" شهر":" mo"),
                  risk: breakeven.delayMonths == null || breakeven.delayMonths > 18 ? "low" : breakeven.delayMonths > 9 ? "med" : "high",
                },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{...tdSt,fontWeight:600}}>{r.label}</td>
                  <td style={{...tdSt,textAlign:"center"}}>{r.be}</td>
                  <td style={{...tdSt,textAlign:"center"}}>{r.current}</td>
                  <td style={{...tdSt,textAlign:"center",fontWeight:600}}>{r.margin}</td>
                  <td style={{...tdSt,textAlign:"center"}}>
                    <span style={{padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:600,
                      background:r.risk==="low"?"#dcfce7":r.risk==="med"?"#fefce8":"var(--color-danger-bg)",
                      color:r.risk==="low"?"var(--color-success-text)":r.risk==="med"?"var(--color-warning-text)":"var(--color-danger)"}}>
                      {r.risk==="low"?(lang==="ar"?"مخاطر منخفضة":"LOW RISK"):r.risk==="med"?(lang==="ar"?"مخاطر متوسطة":"MEDIUM"):lang==="ar"?"مخاطر مرتفعة":"HIGH RISK"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// INCENTIVES VIEW
// ═══════════════════════════════════════════════════════════════
function IncentivesView({ project, results, incentivesResult, financing, lang, up }) {
  const isMobile = useIsMobile();
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  if (!project || !results) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",background:"rgba(46,196,182,0.03)",border:"1px dashed rgba(46,196,182,0.2)",borderRadius:"var(--radius-xl)",textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>🏛</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"أضف أصول أولاً":"Add Assets First"}</div>
      <div style={{fontSize:12,color:"var(--text-secondary)",maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"الحوافز تحتاج بيانات المشروع. أضف أصول من تبويب البرنامج.":"Incentives need project data. Add assets from the Program tab."}</div>
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
    <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${enabled ? color : "var(--border-default)"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: enabled ? `1px solid ${color}22` : "none", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? color : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 2, insetInlineStart: enabled ? 18 : 2, transition: "inset-inline-start 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? "var(--text-primary)" : "var(--text-tertiary)" }}>{lang === "ar" ? titleAr : title}{tip && <Tip text={tip} />}</div>
        </div>
        {enabled && value && <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtM(value)}</div>}
      </div>
      {enabled && <div style={{ padding: "12px 16px" }}>{children}</div>}
    </div>
  );

  const F = ({ label, children, hint }) => <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>{label}</div>{children}{hint && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{hint}</div>}</div>;

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"var(--surface-sidebar)",color:selectedPhases.length===0?"#fff":"var(--text-primary)",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"var(--zan-teal-700)":"var(--surface-sidebar)",color:active?"#fff":"var(--text-primary)",border:"1px solid "+(active?"var(--zan-teal-700)":"var(--border-default)"),borderRadius:"var(--radius-sm)"}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`حصة المراحل المختارة: ${(phaseShare.capex*100).toFixed(0)}% من التكاليف`:`Selected phases: ${(phaseShare.capex*100).toFixed(0)}% of CAPEX`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings are always project-level */}
    {hasPhases && isFiltered && (
      <div style={{background:"var(--color-warning-bg)",borderRadius:"var(--radius-md)",border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"var(--color-warning-text)",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {ar ? "إعدادات الحوافز على مستوى المشروع كاملاً. الأرقام المعروضة تعكس حصة المراحل المختارة فقط" : "Incentive settings apply to the entire project. Numbers shown reflect the selected phases' share only"}
      </div>
    )}
    {/* Summary KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
      <KPI label={ar ? "إجمالي الحوافز" : "Total Incentives"} value={fmtM(pIR?.totalIncentiveValue || 0)} sub={cur} color="var(--color-success-text)" tip="مجموع كل الحوافز الحكومية (منح + دعم + إعفاءات)\nSum of all government incentives" />
      <KPI label={ar ? "منحة CAPEX" : "CAPEX Grant"} value={fmtM(pIR?.capexGrantTotal || 0)} sub={inc.capexGrant?.enabled ? "ON" : "OFF"} color={inc.capexGrant?.enabled ? "var(--zan-teal-500)" : "var(--text-tertiary)"} tip="الحكومة تغطي نسبة من تكاليف البناء. تقلل رأس المال المطلوب\nGov covers % of construction cost. Reduces equity needed" />
      <KPI label={ar ? "وفر إيجار الأرض" : "Land Rent Savings"} value={fmtM(pIR?.landRentSavingTotal || 0)} sub={inc.landRentRebate?.enabled ? "ON" : "OFF"} color={inc.landRentRebate?.enabled ? "var(--color-warning)" : "var(--text-tertiary)"} tip="الحكومة تعفي أو تخفض إيجار الأرض لسنوات محددة\nGov waives/reduces land rent for specified years" />
      <KPI label={ar ? "دعم التمويل" : "Finance Support"} value={fmtM(financing?.interestSubsidyTotal || 0)} sub={inc.financeSupport?.enabled ? "ON" : "OFF"} color={inc.financeSupport?.enabled ? "#8b5cf6" : "var(--text-tertiary)"} tip="الحكومة تدفع جزء من فوائد البنك أو تقدم قرض ميسر\nGov pays portion of bank interest or provides soft loan" />
      <KPI label={ar ? "استرداد رسوم" : "Fee Rebates"} value={fmtM(pIR?.feeRebateTotal || 0)} sub={inc.feeRebates?.enabled ? "ON" : "OFF"} color={inc.feeRebates?.enabled ? "#06b6d4" : "var(--text-tertiary)"} tip="إعفاء أو تخفيض رسوم حكومية (تراخيص، ربط خدمات)\nGov fee waivers/reductions (permits, utility connections)" />
    </div>

    {/* Incentive cards */}
    <div style={{ marginBottom: 12 }}><HelpLink contentKey="govIncentives" lang={lang} onOpen={setEduModal} label={lang === "ar" ? "اعرف أكثر عن أنواع الحوافز" : "Learn about incentive types"} /></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 1. CAPEX Grant ── */}
      <ToggleCard title="CAPEX Grant (Capital Subsidy)" tip="منحة حكومية تغطي جزءاً من CAPEX الإنشائي. تخفض التكلفة الفعلية وترفع IRR
Government grant covering part of construction CAPEX. Lowers effective cost and improves IRR" titleAr="دعم رأسمالي (منحة CAPEX)" enabled={inc.capexGrant?.enabled} onToggle={() => upInc("capexGrant", { enabled: !inc.capexGrant?.enabled })} color="var(--zan-teal-500)" value={pIR?.capexGrantTotal}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <F label={lang === "ar" ? "نسبة المنحة %" : "Grant %"}><NI value={inc.capexGrant?.grantPct || 25} onChange={v => upInc("capexGrant", { grantPct: v })} /></F>
          <F label={lang === "ar" ? "الحد الأقصى (ريال)" : "Max Cap (SAR)"}><NI value={inc.capexGrant?.maxCap || 50000000} onChange={v => upInc("capexGrant", { maxCap: v })} /></F>
        </div>
        <F label={lang === "ar" ? "توقيت الاستلام" : "Timing"}>
          <select value={inc.capexGrant?.timing || "construction"} onChange={e => upInc("capexGrant", { timing: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "var(--text-primary)", border: "1px solid #e5e7ec" }}>
            <option value="construction">{lang === "ar" ? "خلال البناء" : "During Construction"}</option>
            <option value="completion">{lang === "ar" ? "عند الإنجاز" : "At Completion"}</option>
          </select>
        </F>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, padding: 8, background: "#f0f4ff", borderRadius: 4 }}>
          {lang === "ar" ? "القيمة المحسوبة" : "Calculated"}: <strong>{fmt(pIR?.capexGrantTotal || 0)} {cur}</strong> = min({inc.capexGrant?.grantPct}% × {fmtM(cTotalCapex)}, {fmt(inc.capexGrant?.maxCap)})
        </div>
      </ToggleCard>

      {/* ── 2. Finance Support ── */}
      <ToggleCard title="Finance Support (Interest Subsidy / Soft Loan)" tip="الجهة الحكومية تتحمل جزءاً من تكلفة التمويل أو تقدم قرضاً بدون ربح. يخفض معدل التمويل الفعلي ويحسن DSCR
Government pays part of financing cost or provides a zero-profit loan. Lowers effective rate and improves DSCR" titleAr="دعم التمويل (تحمل فوائد / قرض حسن)" enabled={inc.financeSupport?.enabled} onToggle={() => upInc("financeSupport", { enabled: !inc.financeSupport?.enabled })} color="#8b5cf6" value={financing?.interestSubsidyTotal}>
        <F label={lang === "ar" ? "نوع الدعم" : "Support Type"}>
          <select value={inc.financeSupport?.subType || "interestSubsidy"} onChange={e => upInc("financeSupport", { subType: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "var(--text-primary)", border: "1px solid #e5e7ec" }}>
            <option value="interestSubsidy">{lang === "ar" ? "تحمل فوائد" : "Interest Subsidy"}</option>
            <option value="softLoan">{lang === "ar" ? "قرض حسن" : "Soft Loan"}</option>
          </select>
        </F>
        {inc.financeSupport?.subType === "interestSubsidy" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "نسبة التحمل %" : "Subsidy %"}><NI value={inc.financeSupport?.subsidyPct || 50} onChange={v => upInc("financeSupport", { subsidyPct: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Duration (yrs)"}><NI value={inc.financeSupport?.subsidyYears || 5} onChange={v => upInc("financeSupport", { subsidyYears: v })} /></F>
            <F label={lang === "ar" ? "البداية" : "Start"}>
              <select value={inc.financeSupport?.subsidyStart || "operation"} onChange={e => upInc("financeSupport", { subsidyStart: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "var(--text-primary)", border: "1px solid #e5e7ec" }}>
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
      <ToggleCard title="Land Rent Rebate (Exemption/Discount)" tip="تخفيض أو إعفاء إيجار الأرض خلال البناء أو السنوات الأولى. يحسن التدفقات النقدية المبكرة
Reducing or waiving land rent during construction or early years. Improves early cash flows" titleAr="إعفاء/خصم إيجار الأرض" enabled={inc.landRentRebate?.enabled} onToggle={() => upInc("landRentRebate", { enabled: !inc.landRentRebate?.enabled })} color="var(--color-warning)" value={pIR?.landRentSavingTotal}>
        {project.landType !== "lease" ? (
          <div style={{ fontSize: 12, color: "var(--color-danger)" }}>{lang === "ar" ? "غير متاح - الأرض ليست مؤجرة" : "Not applicable - land is not leased"}</div>
        ) : (<>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{lang === "ar" ? "فترة البناء" : "Construction Period"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "نسبة الإعفاء %" : "Rebate %"}><NI value={inc.landRentRebate?.constrRebatePct || 100} onChange={v => upInc("landRentRebate", { constrRebatePct: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Duration (yrs)"} hint={lang === "ar" ? "0 = تلقائي من البناء" : "0 = auto from construction"}><NI value={inc.landRentRebate?.constrRebateYears || 0} onChange={v => upInc("landRentRebate", { constrRebateYears: v })} /></F>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginTop: 10, marginBottom: 6 }}>{lang === "ar" ? "فترة ما بعد الافتتاح" : "Post-Opening Period"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "نسبة الخصم %" : "Discount %"}><NI value={inc.landRentRebate?.operRebatePct || 50} onChange={v => upInc("landRentRebate", { operRebatePct: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Duration (yrs)"}><NI value={inc.landRentRebate?.operRebateYears || 3} onChange={v => upInc("landRentRebate", { operRebateYears: v })} /></F>
          </div>
        </>)}
      </ToggleCard>

      {/* ── 4. Fee/Tax Rebates ── */}
      <ToggleCard title="Fee/Tax Rebates & Deferrals" tip="استرداد أو تأجيل رسوم بلدية وتصاريح ومدفوعات نظامية. حتى التأجيل له منفعة زمنية تُحسب بمعدل خصم 10%
Rebates or deferrals of municipal charges, permits, and regulatory fees. Even deferrals have time-value benefit at 10% discount" titleAr="استرداد/تأجيل رسوم وضرائب" enabled={inc.feeRebates?.enabled} onToggle={() => upInc("feeRebates", { enabled: !inc.feeRebates?.enabled })} color="#06b6d4" value={pIR?.feeRebateTotal}>
        {(inc.feeRebates?.items || []).map((item, i) => (
          <div key={i} style={{ background: "var(--surface-page)", borderRadius: 6, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={item.name || ""} onChange={e => updateFeeItem(i, { name: e.target.value })} placeholder={lang === "ar" ? "اسم الرسم" : "Fee name"} style={{ ...sideInputStyle, flex: 1, background: "#fff", color: "var(--text-primary)", border: "1px solid #e5e7ec" }} />
              <button onClick={() => removeFeeItem(i)} style={{ ...btnSm, background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
              <div>
                <div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>{lang === "ar" ? "النوع" : "Type"}</div>
                <select value={item.type || "rebate"} onChange={e => updateFeeItem(i, { type: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "var(--text-primary)", border: "1px solid #e5e7ec", padding: "4px 6px" }}>
                  <option value="rebate">{lang === "ar" ? "استرداد" : "Rebate"}</option>
                  <option value="deferral">{lang === "ar" ? "تأجيل" : "Deferral"}</option>
                </select>
              </div>
              <div><div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>{lang === "ar" ? "المبلغ" : "Amount"}</div><NI value={item.amount || 0} onChange={v => updateFeeItem(i, { amount: v })} /></div>
              <div><div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>{lang === "ar" ? "السنة" : "Year"}</div><NI value={item.year || 1} onChange={v => updateFeeItem(i, { year: v })} /></div>
              {item.type === "deferral" && <div><div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>{lang === "ar" ? "تأجيل (شهر)" : "Defer (mo)"}</div><NI value={item.deferralMonths || 12} onChange={v => updateFeeItem(i, { deferralMonths: v })} /></div>}
            </div>
          </div>
        ))}
        <button onClick={addFeeItem} style={{ ...btnS, width: "100%", background: "#f0fdf4", color: "var(--color-success-text)", padding: "8px", fontSize: 11, border: "1px solid #bbf7d0" }}>
          + {lang === "ar" ? "إضافة رسم" : "Add Fee Item"}
        </button>
      </ToggleCard>

    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// MARKET INDICATORS VIEW
// ═══════════════════════════════════════════════════════════════
// Stable input component for Market view (defined outside to prevent focus loss)
const mktInputStyle = { padding: "6px 10px", border: "1px solid #e5e7ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "var(--surface-page)" };
function NI({ value, onChange, style: sx }) {
  return <input type="number" value={value||""} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...mktInputStyle, ...sx }} />;
}

function MarketView({ project, results, lang, up }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  if (!project) return null;
  const m = project.market || {};
  const enabled = m.enabled;

  const upM = (updates) => {
    up(prev => ({ ...prev, market: { ...prev.market, ...updates } }));
  };
  const upGap = (sector, val) => {
    up(prev => ({ ...prev, market: { ...prev.market, gaps: { ...prev.market.gaps, [sector]: { ...prev.market.gaps[sector], gap: val } } } }));
  };
  const upThreshold = (sector, field, val) => {
    up(prev => ({ ...prev, market: { ...prev.market, thresholds: { ...prev.market.thresholds, [sector]: { ...prev.market.thresholds[sector], [field]: val } } } }));
  };
  const upConv = (field, val) => {
    up(prev => ({ ...prev, market: { ...prev.market, conversionFactors: { ...prev.market.conversionFactors, [field]: val } } }));
  };

  if (!enabled) {
    return (
      <div style={{ maxWidth: 700, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{ar ? "مؤشرات السوق" : "Market Indicators"}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24, maxWidth: 450, margin: "0 auto 24px" }}>
          {ar ? "حلل فجوة السوق وقارن مساحات مشروعك مع الطلب الفعلي. هل المشروع يغطي جزء معقول من الفجوة أم يفرط في التوريد؟" : "Analyze the market gap and compare your project's supply against actual demand. Is the project filling a reasonable portion of the gap, or oversupplying?"}
        </div>
        <button onClick={() => upM({ enabled: true })} style={{ ...btnPrim, padding: "12px 28px", fontSize: 14 }}>
          {ar ? "تفعيل مؤشرات السوق" : "Enable Market Indicators"}
        </button>
      </div>
    );
  }

  // ── Read project supply per sector ──
  const SECTORS = ["Retail", "Office", "Hospitality", "Residential", "Marina", "Industrial"];
  const gaps = m.gaps || {};
  const thresholds = m.thresholds || {};
  const conv = m.conversionFactors || {};
  const phaseNames = [...new Set((project.assets || []).map(a => a.phase))];

  // Calculate project supply per sector per phase
  const getSupply = (sector, phaseFilter) => {
    const assets = (project.assets || []).filter(a => {
      const cat = (a.category || "").toLowerCase();
      const sec = sector.toLowerCase();
      const matchCat = cat.includes(sec) || (sec === "retail" && (cat.includes("retail") || cat.includes("commercial"))) || (sec === "hospitality" && (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")));
      return matchCat && (!phaseFilter || a.phase === phaseFilter);
    });
    if (sector === "Hospitality") {
      return assets.reduce((s, a) => s + (a.hotelPL?.keys || 0), 0);
    }
    if (sector === "Marina") {
      return assets.reduce((s, a) => s + (a.marinaPL?.berths || 0), 0);
    }
    return assets.reduce((s, a) => s + (a.gfa || 0) * ((a.efficiency || 0) / 100), 0);
  };

  // Risk assessment
  const getRisk = (sector, pctOfGap) => {
    const th = thresholds[sector] || { low: 50, med: 70 };
    const pct = pctOfGap * 100;
    if (pct <= th.low) return { level: "low", color: "var(--color-success-text)", bg: "#f0fdf4", label: ar ? "منخفض" : "Low" };
    if (pct <= th.med) return { level: "med", color: "#eab308", bg: "#fefce8", label: ar ? "متوسط" : "Medium" };
    return { level: "high", color: "var(--color-danger)", bg: "var(--color-danger-bg)", label: ar ? "مرتفع" : "High" };
  };

  // Build analysis table
  const analysis = SECTORS.map(sector => {
    const gap = gaps[sector]?.gap || 0;
    const unit = gaps[sector]?.unit || "sqm";
    const totalSupply = getSupply(sector, null);
    const pctGap = gap > 0 ? totalSupply / gap : 0;
    const risk = gap > 0 ? getRisk(sector, pctGap) : { level: "none", color: "var(--text-tertiary)", bg: "var(--surface-page)", label: "—" };
    const phases = phaseNames.map(pn => {
      const phSupply = getSupply(sector, pn);
      return { phase: pn, supply: phSupply };
    });
    return { sector, unit, gap, totalSupply, pctGap, risk, phases };
  }).filter(r => r.gap > 0 || r.totalSupply > 0);

  // Warnings for sidebar
  const highRiskSectors = analysis.filter(a => a.risk.level === "high");

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>📊</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{ar ? "مؤشرات السوق" : "Market Indicators"}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{ar ? "مقارنة توريد المشروع مع فجوة الطلب في السوق" : "Compare project supply against market demand gap"}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => upM({ enabled: false })} style={{ ...btnS, background: "var(--color-danger-bg)", color: "var(--color-danger)", padding: "6px 14px", fontSize: 10, border: "1px solid #fecaca" }}>{ar ? "تعطيل" : "Disable"}</button>
      </div>

      {/* ── Section 1: Market Gap Inputs ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "① فجوة السوق (من دراسة السوق)" : "① Market Gap (from market study)"}</div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 12 }}>{ar ? "أدخل الفجوة المتوقعة لكل قطاع حسب سنة الأفق" : "Enter expected gap per sector at horizon year"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{ar ? "سنة الأفق:" : "Horizon Year:"}</span>
          <NI value={m.horizonYear || 2033} onChange={v => upM({ horizonYear: v })} style={{ width: 80 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {SECTORS.map(sector => (
            <div key={sector} style={{ background: "var(--surface-page)", borderRadius: 8, padding: "10px 12px", border: "1px solid #e5e7ec" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{catL(sector, ar)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NI value={gaps[sector]?.gap || 0} onChange={v => upGap(sector, v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: "var(--text-tertiary)", minWidth: 30 }}>{gaps[sector]?.unit || "sqm"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Risk Thresholds ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "② عتبات المخاطر (% من الفجوة)" : "② Risk Thresholds (% of gap)"}</div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 12 }}>{ar ? "حدّد متى يكون التوريد منخفض/متوسط/مرتفع المخاطر" : "Define when supply is Low/Medium/High risk"}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...tblStyle, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={thSt}>{ar ? "القطاع" : "Sector"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#f0fdf4" }}>{ar ? "منخفض ≤" : "Low ≤"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#fefce8" }}>{ar ? "متوسط ≤" : "Medium ≤"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "var(--color-danger-bg)" }}>{ar ? "مرتفع >" : "High >"}</th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map(sector => {
                const th2 = thresholds[sector] || { low: 50, med: 70 };
                return (
                  <tr key={sector}>
                    <td style={{ ...tdSt, fontWeight: 500 }}>{catL(sector, ar)}</td>
                    <td style={{ ...tdSt, textAlign: "center" }}><NI value={th2.low} onChange={v => upThreshold(sector, "low", v)} style={{ width: 60, textAlign: "center" }} /> %</td>
                    <td style={{ ...tdSt, textAlign: "center" }}><NI value={th2.med} onChange={v => upThreshold(sector, "med", v)} style={{ width: 60, textAlign: "center" }} /> %</td>
                    <td style={{ ...tdSt, textAlign: "center", color: "var(--color-danger)", fontWeight: 600 }}>{`> ${th2.med}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Analysis Results ── */}
      {analysis.length > 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{ar ? "③ تحليل ملاءمة السوق" : "③ Market Gap Capacity Analysis"}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tblStyle, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={thSt}>{ar ? "القطاع" : "Sector"}</th>
                  <th style={thSt}>{ar ? "الوحدة" : "Unit"}</th>
                  <th style={{ ...thSt, textAlign: "right" }}>{ar ? "فجوة السوق" : "Market Gap"}</th>
                  <th style={{ ...thSt, textAlign: "right" }}>{ar ? "توريد المشروع" : "Project Supply"}</th>
                  <th style={{ ...thSt, textAlign: "center" }}>% {ar ? "من الفجوة" : "of Gap"}</th>
                  <th style={{ ...thSt, textAlign: "center" }}>{ar ? "المخاطر" : "Risk"}</th>
                  {phaseNames.length > 1 && phaseNames.map(pn => (
                    <th key={pn} style={{ ...thSt, textAlign: "right", fontSize: 9 }}>{pn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "var(--surface-page)" }}>
                    <td style={{ ...tdSt, fontWeight: 600 }}>{catL(row.sector, ar)}</td>
                    <td style={{ ...tdSt, color: "var(--text-secondary)" }}>{row.unit}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(row.gap)}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Math.round(row.totalSupply))}</td>
                    <td style={{ ...tdSt, textAlign: "center", fontWeight: 700, color: row.risk.color }}>{row.gap > 0 ? (row.pctGap * 100).toFixed(0) + "%" : "—"}</td>
                    <td style={{ ...tdSt, textAlign: "center" }}>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: row.risk.bg, color: row.risk.color, fontWeight: 700 }}>{row.risk.label}</span>
                    </td>
                    {phaseNames.length > 1 && row.phases.map((ph, j) => (
                      <td key={j} style={{ ...tdSt, textAlign: "right", fontSize: 10, color: "var(--text-secondary)" }}>{ph.supply > 0 ? fmt(Math.round(ph.supply)) : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {highRiskSectors.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--color-danger-bg)", borderRadius: 8, border: "1px solid #fecaca" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>{ar ? "⚠ تحذير: خطر فرط التوريد" : "⚠ Warning: Oversupply Risk"}</div>
              {highRiskSectors.map((s, i) => (
                <div key={i} style={{ fontSize: 10, color: "#991b1b" }}>
                  {catL(s.sector, ar)}: {(s.pctGap * 100).toFixed(0)}% {ar ? "من الفجوة" : "of gap"} ({fmt(Math.round(s.totalSupply))} / {fmt(s.gap)} {s.unit})
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#fefce8", borderRadius: 10, border: "1px solid #fde68a", padding: "20px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#92400e" }}>{ar ? "أدخل فجوات السوق أعلاه لرؤية التحليل" : "Enter market gaps above to see the analysis"}</div>
        </div>
      )}

      {/* ── Conversion Factors ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "④ معاملات التحويل" : "④ Conversion Factors"}</div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 12 }}>{ar ? "لتحويل الغرف والوحدات والمراسي إلى متر مربع مكافئ" : "For converting keys/units/berths to equivalent sqm"}</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>{ar ? "م²/غرفة فندقية" : "sqm / Hotel Key"}</div>
            <NI value={conv.sqmPerKey || 45} onChange={v => upConv("sqmPerKey", v)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>{ar ? "م²/وحدة سكنية" : "sqm / Residential Unit"}</div>
            <NI value={conv.sqmPerUnit || 200} onChange={v => upConv("sqmPerUnit", v)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>{ar ? "م²/مرسى" : "sqm / Marina Berth"}</div>
            <NI value={conv.sqmPerBerth || 139} onChange={v => upConv("sqmPerBerth", v)} />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{ar ? "ملاحظات" : "Notes"}</div>
        <textarea value={m.notes || ""} onChange={e => upM({ notes: e.target.value })} placeholder={ar ? "مصدر البيانات، افتراضات، ملاحظات..." : "Data source, assumptions, notes..."} style={{ width: "100%", minHeight: 60, padding: "10px 12px", border: "1px solid #e5e7ec", borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

function ChecksView({ checks, t, lang, onFix }) {
  const ar = lang === "ar";
  const ap = checks.every(c=>c.pass);
  const fc = checks.filter(c=>!c.pass).length;
  const cats = [...new Set(checks.map(c=>c.cat||"General"))];
  const catLabels = {T0:ar?"T0: فحص المدخلات":"T0: Input Validation",T1:ar?"T1: محرك المشروع":"T1: Project Engine",T2:ar?"T2: التمويل":"T2: Financing",T3:ar?"T3: حافز الأداء":"T3: Waterfall",T4:ar?"T4: الحوافز":"T4: Incentives",T5:ar?"T5: التكامل":"T5: Integration",General:"General"};
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
      <span style={{fontSize:11,padding:"3px 10px",borderRadius:4,fontWeight:600,background:ap?"#dcfce7":"var(--color-danger-bg)",color:ap?"var(--color-success-text)":"var(--color-danger)"}}>
        {ap?t.allPass:`${fc} ${t.errorFound}`}
      </span>
      <span style={{fontSize:11,color:"var(--text-secondary)"}}>{checks.length} {ar?"اختبار":"tests"} · {checks.filter(c=>c.pass).length} {ar?"ناجح":"passed"}</span>
    </div>
    {/* Failed checks summary at top */}
    {fc > 0 && <div style={{background:"var(--color-danger-bg)",borderRadius:"var(--radius-md)",border:"1px solid #fecaca",padding:"12px 16px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:"var(--color-danger-text)",marginBottom:8}}>{ar?`${fc} فحوصات فاشلة تحتاج مراجعة`:`${fc} Failed Checks Require Attention`}</div>
      {checks.filter(c=>!c.pass).map((c,i) => {const fixTab=getFixTab(c);return <div key={i} style={{fontSize:11,color:"var(--color-danger-text)",padding:"3px 0",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontWeight:600}}>✗</span>
        <span style={{flex:1}}><strong>[{c.cat}]</strong> {c.name}{c.detail && <span style={{color:"var(--text-tertiary)"}}> - {c.detail}</span>}</span>
        {fixTab && onFix && <button onClick={()=>onFix(fixTab)} style={{padding:"2px 8px",background:"rgba(46,196,182,0.1)",border:"1px solid rgba(46,196,182,0.3)",borderRadius:4,color:"var(--zan-teal-700)",fontSize:9,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{ar?"إصلاح →":"Fix →"}</button>}
      </div>;})}
    </div>}
    {cats.map(cat => {
      const catChecks = checks.filter(c=>(c.cat||"General")===cat);
      const catPass = catChecks.every(c=>c.pass);
      return (
        <div key={cat} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:catPass?"var(--color-success-text)":"var(--color-danger)"}}>{catPass?"✓":"✗"}</span>
            <span style={{fontSize:11,fontWeight:600,color:"var(--text-primary)"}}>{catLabels[cat]||cat}</span>
            <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{catChecks.filter(c=>c.pass).length}/{catChecks.length}</span>
          </div>
          <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-md)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
            <table style={tblStyle}><tbody>
              {catChecks.map((c,i)=>{const fixTab=!c.pass?getFixTab(c):null;return <tr key={i} style={{background:c.pass?"":"var(--color-danger-bg)"}}>
                <td style={{...tdSt,fontWeight:500,width:"30%"}}>{c.name}</td>
                <td style={{...tdSt,textAlign:"center",width:70}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:3,fontWeight:600,background:c.pass?"#dcfce7":"var(--color-danger-bg)",color:c.pass?"var(--color-success-text)":"var(--color-danger)"}}>{c.pass?(ar?"ناجح":"PASS"):(ar?"فاشل":"FAIL")}</span></td>
                <td style={{...tdSt,color:"var(--text-secondary)",fontSize:11}}>{c.desc}</td>
                {c.detail && <td style={{...tdSt,color:"var(--text-tertiary)",fontSize:10,maxWidth:200}}>{c.detail}</td>}
                {fixTab && onFix ? <td style={{...tdSt,width:60,textAlign:"center"}}><button onClick={()=>onFix(fixTab)} style={{padding:"2px 8px",background:"rgba(46,196,182,0.1)",border:"1px solid rgba(46,196,182,0.3)",borderRadius:4,color:"var(--zan-teal-700)",fontSize:9,fontWeight:600,cursor:"pointer"}}>{ar?"إصلاح →":"Fix →"}</button></td> : !c.pass ? <td style={tdSt}></td> : null}
              </tr>;})}
            </tbody></table>
          </div>
        </div>
      );
    })}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// PRESENTATION MODE (Sprint 2)
// ═══════════════════════════════════════════════════════════════
function PresentationView({ project, results, financing, waterfall, incentivesResult, lang, audienceView, liveSliders, setLiveSliders, checks }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [activePhase, setActivePhase] = useState("consolidated"); // "consolidated" or phase name
  if (!results || !project) return <div style={{textAlign:"center",padding:60,color:"var(--text-secondary)",fontSize:14}}>{ar?"لا توجد بيانات للعرض":"No data to present"}</div>;

  // ── Real Engine Recalculation when sliders change ──
  const slidersDefault = liveSliders.capex === 100 && liveSliders.rent === 100 && liveSliders.exitMult === (project.exitMultiple || 10);
  const liveProject = useMemo(() => {
    if (slidersDefault) return project;
    return { ...project, activeScenario: "Custom", customCapexMult: liveSliders.capex, customRentMult: liveSliders.rent, exitMultiple: liveSliders.exitMult };
  }, [project, liveSliders, slidersDefault]);
  const liveResults = useMemo(() => { try { return computeProjectCashFlows(liveProject); } catch(e) { console.error("PresentationView liveResults error:", e); return results; } }, [liveProject]);
  const liveIncentives = useMemo(() => { try { return computeIncentives(liveProject, liveResults); } catch(e) { return incentivesResult; } }, [liveProject, liveResults]);
  const liveFinancing = useMemo(() => { try { return computeFinancing(liveProject, liveResults, liveIncentives); } catch(e) { return financing; } }, [liveProject, liveResults, liveIncentives]);
  const liveWaterfall = useMemo(() => { try { return computeWaterfall(liveProject, liveResults, liveFinancing, liveIncentives); } catch(e) { return waterfall; } }, [liveProject, liveResults, liveFinancing, liveIncentives]);

  // Use live-recalculated data
  const c = liveResults.consolidated;
  const f = liveFinancing;
  const w = liveWaterfall;
  const ir = liveIncentives;
  const phaseResults = liveResults.phaseResults || {};
  const phaseNames = Object.keys(phaseResults);

  // Derived metrics
  const irr = f && f.mode !== "self" && f.leveredIRR !== null ? f.leveredIRR : (ir && ir.adjustedIRR !== null ? ir.adjustedIRR : c.irr);
  const npv = (ir && ir.totalIncentiveValue > 0) ? ir.adjustedNPV10 : (c.npv10 || 0);
  const dscrVals = f && f.dscr ? f.dscr.filter(d => d !== null) : [];
  const minDscr = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const avgDscr = dscrVals.length > 0 ? dscrVals.reduce((a, b) => a + b, 0) / dscrVals.length : null;

  // Health badge
  const irrOk = irr === null ? 0 : irr > 0.15 ? 2 : irr > 0.12 ? 1 : 0;
  const dscrOk = minDscr === null ? -1 : minDscr > 1.4 ? 2 : minDscr > 1.25 ? 1 : 0;
  const npvOk = npv > 0 ? 2 : 0;
  const score = irrOk + (dscrOk >= 0 ? dscrOk : 0) + npvOk;
  const maxScore = 4 + (dscrOk >= 0 ? 2 : 0);
  const healthLabel = score >= maxScore * 0.7 ? "Strong" : score >= maxScore * 0.4 ? "Good" : score >= maxScore * 0.15 ? "Moderate" : "Weak";
  const healthColor = score >= maxScore * 0.7 ? "var(--color-success-text)" : score >= maxScore * 0.4 ? "var(--zan-teal-500)" : score >= maxScore * 0.15 ? "#eab308" : "var(--color-danger)";
  const healthLabelAr = { Strong: "قوي", Good: "جيد", Moderate: "متوسط", Weak: "ضعيف" }[healthLabel];

  // Payback year
  const paybackYr = c.netCF ? c.netCF.reduce((acc, v, i) => { acc.cum += v; if (acc.cum < -1) acc.neg = true; if (acc.yr === null && acc.neg && acc.cum > 0) acc.yr = i + 1; return acc; }, { cum: 0, yr: null, neg: false }).yr : null;

  // Phase-specific data
  const isPhase = activePhase !== "consolidated";
  const phaseData = isPhase ? phaseResults[activePhase] : null;
  const displayCapex = isPhase ? (phaseData?.totalCapex || 0) : c.totalCapex;
  const displayIncome = isPhase ? (phaseData?.totalIncome || 0) : c.totalIncome;
  const displayIRR = isPhase ? (phaseData?.irr || null) : irr;
  const displayNPV = isPhase ? null : npv;
  const displayAssets = isPhase ? liveResults.assetSchedules.filter(a => a.phase === activePhase) : liveResults.assetSchedules;

  const KPI = ({ label, value, sub, color }) => (
    <div className="hero-kpi" style={{background:"var(--surface-card)",borderRadius:"var(--radius-xl)",border:"0.5px solid var(--border-default)",padding:"20px 22px",minWidth:140,flex:1,boxShadow:"var(--shadow-sm)"}}>
      <div style={{fontSize:11,color:"var(--text-secondary)",fontWeight:500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
      <div style={{fontSize:26,fontWeight:700,color:color||"var(--text-primary)",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:4}}>{sub}</div>}
    </div>
  );

  const Section = ({ title, children, color }) => (
    <div style={{marginBottom:24}}>
      <div style={{fontSize:14,fontWeight:700,color:color||"var(--text-primary)",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:4,height:18,borderRadius:2,background:color||"var(--zan-teal-500)"}} />{title}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{maxWidth:1100,margin:"0 auto",paddingBottom:120}}>
      {/* ── Executive Summary Card ── */}
      <div style={{background:"linear-gradient(135deg,#0f1117 0%,#1a1d2e 100%)",borderRadius:"var(--radius-2xl)",padding:"28px 32px",marginBottom:24,color:"var(--text-inverse)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:"radial-gradient(circle,rgba(46,196,182,0.08) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:18,fontWeight:900,color:"var(--text-inverse)",fontFamily:"'Tajawal',sans-serif"}}>{lang==="ar"?"حصيف":"Haseef"}</span><span style={{width:1,height:14,background:"rgba(46,196,182,0.4)"}} /><span style={{fontSize:9,color:"var(--zan-teal-500)",fontWeight:300}}>{lang==="ar"?"النمذجة المالية":"Financial Modeler"}</span></div>
            <div style={{fontSize:24,fontWeight:700,letterSpacing:-0.5}}>{project.name || "Untitled"}</div>
            {project.location && <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:4}}>{project.location}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!slidersDefault && <span style={{fontSize:10,padding:"4px 10px",borderRadius:"var(--radius-xl)",background:"#fbbf2430",color:"#fbbf24",fontWeight:600,border:"1px solid #fbbf2440"}}>{ar?"سيناريو مُعدّل":"Adjusted Scenario"}</span>}
            <div style={{padding:"6px 16px",borderRadius:20,background:healthColor+"20",border:`1px solid ${healthColor}40`,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:4,background:healthColor}} />
              <span style={{fontSize:12,fontWeight:700,color:healthColor}}>{ar ? healthLabelAr : healthLabel}</span>
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.6,marginBottom:16}}>
          {project.currency || "SAR"} {fmtM(displayCapex)} {ar?"مشروع تطوير":"development"} | {displayIRR !== null ? (displayIRR*100).toFixed(1)+"% IRR" : "—"} | {paybackYr ? paybackYr+"yr payback" : "—"} | {minDscr !== null ? minDscr.toFixed(1)+"x DSCR" : "—"}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <KPI label={ar?"إجمالي التكاليف":"Total CAPEX"} value={fmtM(displayCapex)} color="#fff" />
          <KPI label="IRR" value={displayIRR !== null ? (displayIRR*100).toFixed(1)+"%" : "—"} color={getMetricColor("IRR",displayIRR,{dark:true})} />
          {displayNPV !== null && <KPI label={ar?"صافي القيمة الحالية":"NPV @10%"} value={fmtM(displayNPV)} color={getMetricColor("NPV",displayNPV,{dark:true})} />}
          {minDscr !== null && !isPhase && <KPI label={ar?"أدنى DSCR":"Min DSCR"} value={minDscr.toFixed(2)+"x"} color={getMetricColor("DSCR",minDscr,{dark:true})} />}
          {w && !isPhase && <KPI label="LP MOIC" value={w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—"} color={getMetricColor("MOIC",w.lpMOIC,{dark:true})} />}
          {isPhase && <KPI label={ar?"إجمالي الإيرادات":"Total Income"} value={fmtM(displayIncome)} color="#4ade80" />}
          {isPhase && <KPI label={ar?"عدد الأصول":"Assets"} value={String(displayAssets.length)} color="#fff" />}
        </div>
      </div>

      {/* ── Phase Selector Tabs ── */}
      {phaseNames.length > 1 && (
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setActivePhase("consolidated")} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase==="consolidated"?"var(--text-primary)":"var(--surface-sidebar)",color:activePhase==="consolidated"?"#fff":"var(--text-secondary)",border:"none"}}>{ar?"الموحّد":"Consolidated"}</button>
          {phaseNames.map(pn => (
            <button key={pn} onClick={()=>setActivePhase(pn)} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase===pn?"var(--zan-teal-500)":"var(--surface-sidebar)",color:activePhase===pn?"#fff":"var(--text-secondary)",border:"none"}}>
              {pn} <span style={{fontSize:9,opacity:0.7}}>({(phaseResults[pn]?.assetCount||0)})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Phase Summary Cards (when consolidated) ── */}
      {!isPhase && phaseNames.length > 1 && (
        <Section title={ar?"ملخص المراحل":"Phase Summary"} color="var(--zan-teal-700)">
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(phaseNames.length, 4)}, 1fr)`,gap:12}}>
            {phaseNames.map(pn => {
              const pd = phaseResults[pn];
              return (
                <div key={pn} onClick={()=>setActivePhase(pn)} style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px",cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--zan-teal-500)";e.currentTarget.style.boxShadow="0 2px 8px rgba(37,99,235,0.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border-default)";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>{pn}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>CAPEX</div><div style={{fontSize:14,fontWeight:600}}>{fmtM(pd?.totalCapex)}</div></div>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"الإيرادات":"Revenue"}</div><div style={{fontSize:14,fontWeight:600,color:"var(--color-success-text)"}}>{fmtM(pd?.totalIncome)}</div></div>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>IRR</div><div style={{fontSize:14,fontWeight:600,color:pd?.irr>0.12?"var(--color-success-text)":"#eab308"}}>{pd?.irr !== null ? (pd.irr*100).toFixed(1)+"%" : "—"}</div></div>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"الأصول":"Assets"}</div><div style={{fontSize:14,fontWeight:600}}>{pd?.assetCount||0}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Bank View ── */}
      {audienceView === "bank" && !isPhase && (<>
        <Section title={ar?"ملخص التمويل":"Financing Summary"} color="var(--zan-navy-700)">
          {f ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12}}>
              <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي الدين":"Total Debt"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"var(--zan-navy-700)"}}>{fmtM(f.totalDebt)}</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>LTV: {f.totalProjectCost>0?((f.totalDebt/f.totalProjectCost)*100).toFixed(0):0}%</div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي حقوق الملكية":"Total Equity"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"var(--color-success-text)"}}>{fmtM(f.totalEquity)}</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>GP: {fmtM(f.gpEquity)}{f.lpEquity > 0 ? ` | LP: ${fmtM(f.lpEquity)}` : ""}</div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"معدل التمويل":"Finance Rate"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"var(--text-primary)"}}>{(f.rate*100).toFixed(1)}%</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{ar?"المدة":"Tenor"}: {liveProject.loanTenor||7}{ar?" سنة":"yr"} | {ar?"سماح":"Grace"}: {liveProject.debtGrace||3}{ar?" سنة":"yr"}</div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"متوسط DSCR":"Avg DSCR"}</div>
                <div style={{fontSize:20,fontWeight:700,color:getMetricColor("DSCR",avgDscr)}}>{avgDscr ? avgDscr.toFixed(2)+"x" : "—"}</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{ar?"أدنى":"Min"}: {minDscr ? minDscr.toFixed(2)+"x" : "—"}</div>
              </div>
            </div>
          ) : <div style={{color:"var(--text-secondary)",fontSize:12}}>{ar?"لا يوجد تمويل مُعدّ":"No financing configured"}</div>}
        </Section>
        {f && dscrVals.length > 0 && (
          <Section title={ar?"جدول DSCR":"DSCR Schedule"} color="var(--zan-navy-700)">
            <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px",overflowX:"auto"}}>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",minHeight:120,paddingTop:8}}>
                {f.dscr.slice(0, Math.min(liveResults.horizon, 20)).map((d, y) => {
                  if (d === null) return <div key={y} style={{flex:1,minWidth:24}} />;
                  const h = Math.min(100, Math.max(8, d * 40));
                  const clr = d >= 1.4 ? "var(--color-success-text)" : d >= 1.2 ? "#eab308" : "var(--color-danger)";
                  return (
                    <div key={y} style={{flex:1,minWidth:24,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:10,color:"var(--text-secondary)",fontWeight:600}}>{d.toFixed(1)}x</span>
                      <div style={{width:"80%",height:h,background:clr,borderRadius:3,transition:"height 0.5s"}} />
                      <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{(liveProject.startYear||2026)+y}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{borderTop:"2px dashed #ef4444",marginTop:4,position:"relative"}}>
                <span style={{position:"absolute",right:0,top:2,fontSize:10,color:"var(--color-danger)",fontWeight:600}}>1.2x {ar?"حد أدنى":"min"}</span>
              </div>
            </div>
          </Section>
        )}
        {f && (
          <Section title={ar?"المصادر والاستخدامات":"Sources & Uses"} color="var(--zan-navy-700)">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المصادر":"Sources"}</div>
                {[
                  { label: ar?"دين بنكي":"Bank Debt", value: f.totalDebt, color: "var(--zan-navy-700)" },
                  { label: ar?"حقوق ملكية GP":"GP Equity", value: f.gpEquity, color: "var(--color-success-text)" },
                  { label: ar?"حقوق ملكية LP":"LP Equity", value: f.lpEquity, color: "#8b5cf6" },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid var(--surface-separator)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:s.color}} /><span style={{fontSize:12}}>{s.label}</span></div>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:700,fontSize:13}}>
                  <span>{ar?"الإجمالي":"Total"}</span><span>{fmtM(f.totalProjectCost||f.devCostInclLand)}</span>
                </div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"الاستخدامات":"Uses"}</div>
                {[
                  { label: ar?"تكاليف البناء":"Construction CAPEX", value: c.totalCapex },
                  { label: ar?"إيجار الأرض":"Land Cost/Rent", value: liveProject.landType==="purchase" ? liveProject.landPurchasePrice : 0 },
                  { label: ar?"رسوم التمويل":"Financing Fees", value: (f.upfrontFee||0) },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"0.5px solid var(--surface-separator)"}}>
                    <span style={{fontSize:12}}>{s.label}</span>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
      </>)}

      {/* ── Investor View ── */}
      {audienceView === "investor" && !isPhase && (<>
        <Section title={ar?"عوائد المستثمرين":"Investor Returns"} color="#7c3aed">
          {w ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12}}>
              {[
                { label: "LP IRR", value: w.lpIRR !== null ? (w.lpIRR*100).toFixed(1)+"%" : "—", color: "#7c3aed" },
                { label: "GP IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—", color: "var(--color-success-text)" },
                { label: "LP MOIC", value: w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—", color: "#7c3aed", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.lpTotalInvested)} → ${fmtM(w.lpTotalDist)}` },
                { label: "GP MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—", color: "var(--color-success-text)", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.gpTotalInvested)} → ${fmtM(w.gpTotalDist)}` },
                { label: "DPI", value: w.lpTotalInvested > 0 ? (w.lpTotalDist / w.lpTotalInvested).toFixed(2)+"x" : "—", color: "var(--text-primary)" },
              ].map((item, i) => (
                <div key={i} style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{item.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:item.color}}>{item.value}</div>
                  {item.sub && <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{item.sub}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{color:"var(--text-secondary)",fontSize:12}}>{ar?"حافز الأداء غير مُعدّ — اختر صندوق استثماري":"Waterfall not configured - select Fund mode"}</div>}
        </Section>
        {w && w.tier1 && (
          <Section title={ar?"شلال التوزيعات":"Distribution Waterfall"} color="#7c3aed">
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:12}}>
              {[
                { label: ar?"رد رأس المال":"T1: Return of Capital", value: (w.tier1||[]).reduce((s,v)=>s+v,0), color: "var(--zan-navy-700)" },
                { label: ar?"العائد التفضيلي":"T2: Pref Return", value: (w.tier2||[]).reduce((s,v)=>s+v,0), color: "#7c3aed" },
                { label: ar?"تعويض المطور":"T3: GP Catch-up", value: (w.tier3||[]).reduce((s,v)=>s+v,0), color: "var(--color-success-text)" },
                { label: ar?"تقسيم الأرباح":"T4: Profit Split", value: ((w.tier4LP||[]).reduce((s,v)=>s+v,0))+((w.tier4GP||[]).reduce((s,v)=>s+v,0)), color: "var(--color-warning)" },
              ].map((tier, i) => (
                <div key={i} style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 16px",borderTop:`3px solid ${tier.color}`}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:4}}>{tier.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:tier.color}}>{fmtM(tier.value)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {w && (
          <Section title={ar?"اقتصاديات المطور (GP)":"GP Economics"} color="var(--color-success-text)">
            <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
                {[
                  { label: ar?"رأس مال GP":"GP Equity", value: fmtM(w.gpTotalInvested) },
                  { label: ar?"إجمالي توزيعات GP":"GP Distributions", value: fmtM(w.gpTotalDist) },
                  { label: ar?"رسوم المطور":"Developer Fee", value: fmtM(w.developerFeeTotal||0) },
                  { label: ar?"رسوم الإدارة":"Mgmt Fees", value: fmtM(w.mgmtFeeTotal||0) },
                  { label: "GP IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—" },
                  { label: "GP MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—" },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:14,fontWeight:600,color:"var(--text-primary)"}}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
        {f && liveProject.exitStrategy !== "hold" && (
          <Section title={ar?"تحليل التخارج":"Exit Analysis"} color="var(--color-warning)">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
              {[
                { label: ar?"سنة التخارج":"Exit Year", value: f.exitYear || "—" },
                { label: ar?"قيمة التخارج":"Exit Value", value: f.exitProceeds ? fmtM(f.exitProceeds.reduce((s,v)=>s+v,0)) : "—" },
                { label: ar?"مضاعف التخارج":"Exit Multiple", value: liveProject.exitMultiple+"x" },
                { label: ar?"تكاليف التخارج":"Exit Cost", value: liveProject.exitCostPct+"%" },
              ].map((item, i) => (
                <div key={i} style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{item.label}</div>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)"}}>{item.value}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </>)}

      {/* ── Asset Overview (both views + phase filtered) ── */}
      <Section title={isPhase ? `${activePhase} — ${ar?"الأصول":"Assets"}` : (ar?"نظرة عامة على الأصول":"Asset Overview")} color="var(--zan-teal-700)">
        <div style={{background:"var(--surface-card)",borderRadius:"var(--radius-lg)",border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"var(--surface-page)"}}>
                <th style={{...thSt,fontSize:11}}>{ar?"الأصل":"Asset"}</th>
                {!isPhase && <th style={{...thSt,fontSize:11}}>{ar?"المرحلة":"Phase"}</th>}
                <th style={{...thSt,fontSize:11}}>{ar?"التصنيف":"Category"}</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>GFA</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>CAPEX</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>{ar?"الإيرادات":"Revenue"}</th>
              </tr>
            </thead>
            <tbody>
              {displayAssets.map((a, i) => (
                <tr key={i}>
                  <td style={{...tdSt,fontSize:12,fontWeight:500}}>{a.name||"—"}</td>
                  {!isPhase && <td style={{...tdSt,fontSize:11,color:"var(--text-secondary)"}}>{a.phase}</td>}
                  <td style={{...tdSt,fontSize:11,color:"var(--text-secondary)"}}>{catL(a.category,ar)}</td>
                  <td style={{...tdN,fontSize:12}}>{fmt(a.gfa)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600}}>{fmtM(a.totalCapex)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600,color:"var(--color-success-text)"}}>{fmtM(a.totalRevenue)}</td>
                </tr>
              ))}
              <tr style={{background:"var(--surface-page)",fontWeight:700}}>
                <td colSpan={isPhase?3:4} style={{...tdSt,fontSize:12}}>{ar?"الإجمالي":"Total"}</td>
                <td style={{...tdN,fontSize:12}}>{fmtM(displayCapex)}</td>
                <td style={{...tdN,fontSize:12,color:"var(--color-success-text)"}}>{fmtM(displayIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Live Scenario Sliders ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(15,17,23,0.95)",backdropFilter:"blur(8px)",borderTop:"1px solid #282d3a",padding:"12px 24px",display:"flex",alignItems:"center",gap:24,justifyContent:"center",zIndex:9000,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"var(--zan-teal-500)",fontWeight:600,minWidth:50}}>CAPEX</span>
          <input type="range" min={80} max={120} value={liveSliders.capex} onChange={e=>setLiveSliders(s=>({...s,capex:+e.target.value}))} style={{width:120,accentColor:"var(--zan-teal-500)"}} />
          <span style={{fontSize:11,color:liveSliders.capex!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.capex}%</span>
        </div>
        <div style={{width:1,height:24,background:"var(--nav-tab-border)"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"var(--zan-teal-500)",fontWeight:600,minWidth:50}}>{ar?"الإيجار":"Rent"}</span>
          <input type="range" min={80} max={120} value={liveSliders.rent} onChange={e=>setLiveSliders(s=>({...s,rent:+e.target.value}))} style={{width:120,accentColor:"var(--color-success-text)"}} />
          <span style={{fontSize:11,color:liveSliders.rent!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.rent}%</span>
        </div>
        <div style={{width:1,height:24,background:"var(--nav-tab-border)"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"var(--zan-teal-500)",fontWeight:600,minWidth:50}}>{ar?"المضاعف":"Exit ×"}</span>
          <input type="range" min={6} max={15} step={0.5} value={liveSliders.exitMult} onChange={e=>setLiveSliders(s=>({...s,exitMult:+e.target.value}))} style={{width:120,accentColor:"var(--color-warning)"}} />
          <span style={{fontSize:11,color:liveSliders.exitMult!==(project.exitMultiple||10)?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.exitMult}x</span>
        </div>
        <div style={{width:1,height:24,background:"var(--nav-tab-border)"}} />
        <button onClick={()=>setLiveSliders({capex:100,rent:100,exitMult:project.exitMultiple||10})} style={{...btnS,background:slidersDefault?"#1e2230":"#fbbf2430",color:slidersDefault?"#4b5060":"#fbbf24",padding:"6px 14px",fontSize:10,fontWeight:600,border:slidersDefault?"1px solid #282d3a":"1px solid #fbbf2440"}}>{ar?"إعادة تعيين":"Reset"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};
const btnPrim={...btnS,background:"var(--btn-primary-bg)",color:"var(--text-inverse)",fontWeight:600};
const btnSm={...btnS,padding:"4px 8px",fontSize:11,fontWeight:500,borderRadius:4};
const sideInputStyle={width:"100%",padding:"7px 10px",borderRadius:5,border:"0.5px solid var(--nav-tab-border)",background:"var(--surface-input)",color:"var(--text-secondary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
const cellInputStyle={padding:"4px 6px",borderRadius:3,border:"1px solid transparent",background:"transparent",color:"var(--text-primary)",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",width:"100%"};
const tblStyle={width:"100%",borderCollapse:"collapse"};
const thSt={padding:"7px 8px",textAlign:"start",fontSize:10,fontWeight:600,color:"var(--text-secondary)",background:"var(--surface-page)",borderBottom:"0.5px solid var(--border-default)",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"0.5px solid var(--surface-separator)",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY WRAPPER
// ═══════════════════════════════════════════════════════════════
export default function ReDevModeler(props) {
  return <AppErrorBoundary><ReDevModelerInner {...props} /></AppErrorBoundary>;
}
