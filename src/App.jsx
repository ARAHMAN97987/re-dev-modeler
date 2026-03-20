import { useState, useEffect, useCallback, useRef, useMemo, memo, Component } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart } from "recharts";
import { storage } from "./lib/storage";
import { generateProfessionalExcel } from "./excelExport";
import { generateFormulaExcel } from "./excelFormulaExport";
import { embeddedFontCSS } from "./embeddedFonts";
import AiAssistant from "./AiAssistant";

// ═══════════════════════════════════════════════════════════════
// ZAN Financial Modeler — Project Engine v3 (Stable)
// ═══════════════════════════════════════════════════════════════

// ── Error Boundary — prevents white screen on runtime errors ─
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ZAN Error Boundary caught:", error, info?.componentStack); }
  render() {
    if (this.state.hasError) {
      const isAr = document.documentElement.lang === "ar";
      return (
        <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",color:"#d0d4dc"}}>
          <div style={{textAlign:"center",maxWidth:460,padding:32}}>
            <div style={{fontSize:28,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif",marginBottom:8}}>زان</div>
            <div style={{fontSize:16,fontWeight:600,color:"#f87171",marginBottom:16}}>{isAr?"حدث خطأ غير متوقع":"An unexpected error occurred"}</div>
            <div style={{fontSize:12,color:"#6b7080",marginBottom:24,lineHeight:1.6}}>{isAr?"يمكنك إعادة المحاولة أو تحميل الصفحة من جديد. بياناتك محفوظة.":"You can retry or reload the page. Your data is saved."}</div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:"10px 24px",background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{isAr?"إعادة المحاولة":"Retry"}</button>
              <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",background:"#1e2230",color:"#d0d4dc",border:"1px solid #282d3a",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{isAr?"تحديث الصفحة":"Reload Page"}</button>
            </div>
            <details style={{marginTop:24,textAlign:"start"}}>
              <summary style={{fontSize:10,color:"#4b5060",cursor:"pointer"}}>{isAr?"تفاصيل الخطأ":"Error details"}</summary>
              <pre style={{fontSize:10,color:"#6b7080",background:"#0F2D4F",padding:12,borderRadius:6,marginTop:8,overflow:"auto",maxHeight:120,whiteSpace:"pre-wrap"}}>{this.state.error?.message || "Unknown error"}{"\n"}{this.state.error?.stack?.split("\n").slice(0,4).join("\n")}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── CSV helpers (always available, no dependencies) ──
function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function csvParse(text) {
  const lines = [];
  let current = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else field += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { current.push(field); field = ""; }
      else if (ch === '\n' || (ch === '\r' && text[i+1] === '\n')) {
        if (ch === '\r') i++;
        current.push(field); field = "";
        if (current.some(c => c.trim() !== "")) lines.push(current);
        current = [];
      } else field += ch;
    }
  }
  current.push(field);
  if (current.some(c => c.trim() !== "")) lines.push(current);
  return lines;
}

// ── Template columns definition ──
const TEMPLATE_COLS = [
  { key: "phase", en: "Phase", ar: "المرحلة" },
  { key: "category", en: "Category", ar: "التصنيف" },
  { key: "name", en: "Asset Name", ar: "اسم الأصل" },
  { key: "code", en: "Code", ar: "الرمز" },
  { key: "notes", en: "Notes", ar: "ملاحظات" },
  { key: "plotArea", en: "Plot Area (sqm)", ar: "مساحة القطعة" },
  { key: "footprint", en: "Building Footprint (sqm)", ar: "المسطح البنائي" },
  { key: "gfa", en: "GFA (sqm)", ar: "إجمالي مساحة البناء" },
  { key: "revType", en: "Revenue Type", ar: "نوع الإيراد" },
  { key: "efficiency", en: "Efficiency %", ar: "نسبة الكفاءة" },
  { key: "leaseRate", en: "Lease Rate (SAR/sqm/yr)", ar: "إيجار المتر سنوياً" },
  { key: "opEbitda", en: "Op EBITDA (SAR/yr)", ar: "الأرباح التشغيلية" },
  { key: "escalation", en: "Escalation %", ar: "نسبة الزيادة السنوية" },
  { key: "rampUpYears", en: "Ramp-Up Years", ar: "سنوات النمو" },
  { key: "stabilizedOcc", en: "Stabilized Occupancy %", ar: "نسبة الإشغال المستقر" },
  { key: "costPerSqm", en: "Cost per sqm (SAR)", ar: "تكلفة المتر المربع" },
  { key: "constrStart", en: "Construction Start (Year #)", ar: "سنة بداية البناء" },
  { key: "constrDuration", en: "Construction Duration (months)", ar: "مدة البناء بالأشهر" },
];

const SAMPLE_ROWS = [
  ["Phase 1","Retail","Marina Mall","C1","Anchor (Mall)",28947,20840,31260,"Lease",0.80,2100,0,0.0075,4,1.0,3900,2,36],
  ["Phase 1","Hospitality","Hotel (4-Star)","H1","configure P&L in app",5133,2072,16577,"Operating",0,0,13901057,0.0075,4,1.0,8000,2,36],
  ["Phase 2","Office","Office Block","O1","Grade A Office",5497,2710,16429,"Lease",0.90,900,0,0.0075,2,1.0,2600,3,36],
  ["Phase 2","Hospitality","Resort (5-Star)","RS","configure P&L in app",33000,15877,16296,"Operating",0,0,47630685,0.0075,4,0.9,10000,3,42],
  ["Phase 2","Marina","Marina Berths","MAR","configure P&L in app",3000,0,2400,"Operating",0,0,1129331,0.0075,4,0.9,16000,4,12],
  ["Phase 1","Retail","Fuel Station","F","Shared utility",6920,3586,3586,"Lease",0.30,900,0,0.0075,4,1.0,1500,2,12],
];

// ── Generate template (pure CSV - no external dependencies) ──
function generateTemplate() {
  const hdr = TEMPLATE_COLS.map(c => c.en);
  const allRows = [hdr, ...SAMPLE_ROWS];
  const csv = allRows.map(r => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "RE-DEV_Asset_Template.csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Parse uploaded file (CSV only - stable, no external deps) ──
function parseAssetFile(file, project) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = csvParse(text);
        if (rows.length < 2) { reject("No data rows found"); return; }
        resolve(mapRowsToAssets(rows[0], rows.slice(1), project));
      } catch(err) { reject(String(err)); }
    };
    reader.onerror = () => reject("Failed to read file");
    reader.readAsText(file);
  });
}

// ── Map parsed rows to asset objects ──
function mapRowsToAssets(headerRow, dataRows, project) {
  const headers = headerRow.map(h => String(h).toLowerCase().replace(/[\n\r]/g, ' ').trim());

  const findIdx = (...keywords) => {
    for (const kw of keywords) {
      const idx = headers.findIndex(h => h.includes(kw.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const colIdx = {
    phase: findIdx('phase', 'المرحلة'),
    category: findIdx('category', 'التصنيف'),
    name: findIdx('asset name', 'اسم الأصل', 'name'),
    code: findIdx('code', 'الرمز'),
    notes: findIdx('notes', 'ملاحظات'),
    plotArea: findIdx('plot area', 'مساحة القطعة'),
    footprint: findIdx('footprint', 'المسطح البنائي', 'building footprint'),
    gfa: findIdx('gfa', 'إجمالي مساحة', 'gross floor'),
    revType: findIdx('revenue type', 'rev type', 'نوع الإيراد'),
    efficiency: findIdx('efficiency', 'الكفاءة', 'eff'),
    leaseRate: findIdx('lease rate', 'إيجار المتر', 'rate'),
    opEbitda: findIdx('ebitda', 'الأرباح التشغيلية', 'op ebitda'),
    escalation: findIdx('escalation', 'الزيادة', 'esc'),
    rampUpYears: findIdx('ramp', 'النمو'),
    stabilizedOcc: findIdx('occupancy', 'الإشغال', 'occ'),
    costPerSqm: findIdx('cost per', 'تكلفة المتر', 'cost/sqm'),
    constrStart: findIdx('construction start', 'سنة بداية', 'start (year'),
    constrDuration: findIdx('duration', 'مدة البناء', 'construction duration'),
  };

  const pn = (row, idx) => { if (idx < 0) return 0; const n = parseFloat(row[idx]); return isNaN(n) ? 0 : n; };
  const ps = (row, idx, def) => { if (idx < 0) return def || ""; return String(row[idx] || def || "").trim(); };

  const assets = dataRows.filter(row => {
    const name = ps(row, colIdx.name, "");
    const gfa = pn(row, colIdx.gfa);
    return name !== "" || gfa > 0;
  }).map(row => {
    const effRaw = pn(row, colIdx.efficiency);
    const occRaw = pn(row, colIdx.stabilizedOcc);
    const escRaw = pn(row, colIdx.escalation);
    return {
      id: crypto.randomUUID(),
      phase: ps(row, colIdx.phase, project.phases[0]?.name || "Phase 1"),
      category: ps(row, colIdx.category, "Retail"),
      name: ps(row, colIdx.name, ""),
      code: ps(row, colIdx.code, ""),
      notes: ps(row, colIdx.notes, ""),
      plotArea: pn(row, colIdx.plotArea),
      footprint: pn(row, colIdx.footprint),
      gfa: pn(row, colIdx.gfa),
      revType: ps(row, colIdx.revType, "Lease"),
      efficiency: effRaw <= 1 && effRaw > 0 ? effRaw * 100 : effRaw,
      leaseRate: pn(row, colIdx.leaseRate),
      opEbitda: pn(row, colIdx.opEbitda),
      escalation: escRaw > 0 && escRaw <= 0.5 ? escRaw * 100 : escRaw,
      rampUpYears: pn(row, colIdx.rampUpYears) || 3,
      stabilizedOcc: occRaw <= 1 && occRaw > 0 ? occRaw * 100 : (occRaw || 100),
      costPerSqm: pn(row, colIdx.costPerSqm),
      constrStart: pn(row, colIdx.constrStart) || 1,
      constrDuration: pn(row, colIdx.constrDuration) || 12,
      hotelPL: null,
      marinaPL: null,
    };
  });

  const importedPhases = [...new Set(assets.map(a => a.phase))];
  const existingPhaseNames = project.phases.map(p => p.name);
  const newPhases = importedPhases.filter(p => !existingPhaseNames.includes(p));
  return { assets, newPhases };
}

// ── Export current assets (pure CSV) ──
function exportAssetsToExcel(project, results) {
  const headers = TEMPLATE_COLS.map(c => c.en).concat(["Leasable Area", "Total CAPEX", "Total Income"]);
  const rows = (project.assets || []).map((a, i) => {
    const comp = results?.assetSchedules?.[i];
    return [a.phase, a.category, a.name, a.code, a.notes||"", a.plotArea, a.footprint, a.gfa,
      a.revType, a.efficiency/100, a.leaseRate, a.opEbitda, a.escalation/100, a.rampUpYears, a.stabilizedOcc/100,
      a.costPerSqm, a.constrStart, a.constrDuration, comp?.leasableArea||0, comp?.totalCapex||0, comp?.totalRevenue||0];
  });
  const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/[^a-zA-Z0-9]/g,'_')}_Assets.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STORAGE_KEY = "redev:projects-index";
const PROJECT_PREFIX = "redev:project:";

const L = {
  en: {
    title: "ZAN", subtitle: "Real Estate Development Financial Modeling Platform",
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
    title: "ZAN", subtitle: "منصة النمذجة المالية لمشاريع التطوير العقاري",
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
const CAT_AR = { Hospitality:"ضيافة", Retail:"تجاري", Office:"مكاتب", Residential:"سكني", Flexible:"مرن", Marina:"مارينا", Cultural:"ثقافي", Amenity:"خدمات", "Open Space":"مساحة مفتوحة", Utilities:"مرافق", Industrial:"صناعي", Infrastructure:"بنية تحتية" };
const REV_AR = { Lease:"إيجار", Operating:"تشغيلي", Sale:"بيع" };
const catL = (c, ar) => ar ? (CAT_AR[c] || c) : c;
const revL = (r, ar) => ar ? (REV_AR[r] || r) : r;
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

// ── Saudi Market Benchmarks (Sprint 1A) ──
const BENCHMARKS = {
  Retail:       { costPerSqm:[3000,5000], leaseRate:[1500,3000], efficiency:[75,85], rampUpYears:4, stabilizedOcc:90, constrDuration:24 },
  "Hospitality":{ costPerSqm:[8000,16000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:70, constrDuration:36 },
  "Hotel 4★":  { costPerSqm:[8000,12000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:70, constrDuration:36 },
  "Hotel 5★":  { costPerSqm:[10000,16000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:65, constrDuration:42 },
  Office:       { costPerSqm:[2500,4500], leaseRate:[800,1500], efficiency:[85,92], rampUpYears:2, stabilizedOcc:85, constrDuration:30 },
  Residential:  { costPerSqm:[2000,3500], leaseRate:[500,1200], efficiency:[82,90], rampUpYears:2, stabilizedOcc:90, constrDuration:24 },
  Marina:       { costPerSqm:[12000,20000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:90, constrDuration:12 },
  Industrial:   { costPerSqm:[1500,2500], leaseRate:[200,500], efficiency:[90,95], rampUpYears:1, stabilizedOcc:85, constrDuration:18 },
  Infrastructure:{ costPerSqm:[1000,3000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:0, stabilizedOcc:100, constrDuration:18 },
};
function getBenchmark(category) {
  if (!category) return null;
  const cat = category.toLowerCase();
  if (cat.includes("hotel") && cat.includes("5")) return BENCHMARKS["Hotel 5★"];
  if (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")) return BENCHMARKS["Hotel 4★"];
  if (cat.includes("retail") || cat.includes("mall") || cat.includes("commercial")) return BENCHMARKS.Retail;
  if (cat.includes("office")) return BENCHMARKS.Office;
  if (cat.includes("residential") || cat.includes("apartment") || cat.includes("villa")) return BENCHMARKS.Residential;
  if (cat.includes("marina")) return BENCHMARKS.Marina;
  if (cat.includes("industrial") || cat.includes("warehouse") || cat.includes("logistics")) return BENCHMARKS.Industrial;
  if (cat.includes("infrastructure") || cat.includes("parking") || cat.includes("utilities")) return BENCHMARKS.Infrastructure;
  return BENCHMARKS.Retail; // fallback
}
// Returns "green" | "yellow" | "red" and a tooltip string
function benchmarkColor(field, value, category) {
  const bm = getBenchmark(category);
  if (!bm) return { color: null, tip: null };
  const range = bm[field];
  if (!range || !Array.isArray(range)) return { color: null, tip: null };
  const [lo, hi] = range;
  if (lo === 0 && hi === 0) return { color: null, tip: null }; // N/A for this category
  if (value <= 0) return { color: null, tip: null };
  const tip = `${lo.toLocaleString()} – ${hi.toLocaleString()}`;
  if (value >= lo && value <= hi) return { color: "#16a34a", tip };
  if (value > hi * 2 || value < lo * 0.5) return { color: "#ef4444", tip };
  return { color: "#eab308", tip };
}

// ── Auto-Fill defaults per category (Sprint 1B) ──
function getAutoFillDefaults(category) {
  const bm = getBenchmark(category);
  if (!bm) return {};
  const mid = (arr) => Array.isArray(arr) ? Math.round((arr[0]+arr[1])/2) : 0;
  const base = {
    costPerSqm: mid(bm.costPerSqm),
    efficiency: Array.isArray(bm.efficiency) ? Math.round((bm.efficiency[0]+bm.efficiency[1])/2) : 85,
    rampUpYears: bm.rampUpYears || 3,
    stabilizedOcc: bm.stabilizedOcc || 90,
    constrDuration: bm.constrDuration || 24,
  };
  if (bm.leaseRate && bm.leaseRate[1] > 0) base.leaseRate = mid(bm.leaseRate);
  const cat = (category||"").toLowerCase();
  if (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")) {
    base.revType = "Operating";
    base.efficiency = 0;
    base.leaseRate = 0;
  } else if (cat.includes("marina")) {
    base.revType = "Operating";
    base.efficiency = 0;
    base.leaseRate = 0;
  } else {
    base.revType = "Lease";
  }
  return base;
}

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

const defaultHotelPL = () => ({ keys: 0, adr: 0, stabOcc: 70, daysYear: 365, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 });
const defaultMarinaPL = () => ({ berths: 0, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 });

function calcHotelEBITDA(h) {
  const roomsRev = (h.keys || 0) * (h.adr || 0) * ((h.stabOcc || 0) / 100) * (h.daysYear || 365);
  const totalRev = (h.roomsPct || 0) > 0 ? roomsRev / ((h.roomsPct || 72) / 100) : 0;
  const fbRev = totalRev * ((h.fbPct || 0) / 100);
  const miceRev = totalRev * ((h.micePct || 0) / 100);
  const otherRev = totalRev * ((h.otherPct || 0) / 100);
  const roomExp = roomsRev * ((h.roomExpPct || 0) / 100);
  const fbExp = fbRev * ((h.fbExpPct || 0) / 100);
  const miceExp = miceRev * ((h.miceExpPct || 0) / 100);
  const otherExp = otherRev * ((h.otherExpPct || 0) / 100);
  const undist = totalRev * ((h.undistPct || 0) / 100);
  const fixed = totalRev * ((h.fixedPct || 0) / 100);
  const totalOpex = roomExp + fbExp + miceExp + otherExp + undist + fixed;
  const ebitda = totalRev - totalOpex;
  return { roomsRev, totalRev, fbRev, miceRev, otherRev, roomExp, fbExp, miceExp, otherExp, undist, fixed, totalOpex, ebitda, margin: totalRev > 0 ? ebitda / totalRev : 0 };
}

function calcMarinaEBITDA(m) {
  const berthingRev = (m.berths || 0) * (m.avgLength || 0) * (m.unitPrice || 0) * ((m.stabOcc || 0) / 100);
  const berthingPct = 100 - (m.fuelPct || 0) - (m.otherRevPct || 0);
  const totalRev = berthingPct > 0 ? berthingRev / (berthingPct / 100) : 0;
  const fuelRev = totalRev * ((m.fuelPct || 0) / 100);
  const otherRev = totalRev * ((m.otherRevPct || 0) / 100);
  const berthingOpex = berthingRev * ((m.berthingOpexPct || 0) / 100);
  const fuelOpex = fuelRev * ((m.fuelOpexPct || 0) / 100);
  const otherOpex = otherRev * ((m.otherOpexPct || 0) / 100);
  const totalOpex = berthingOpex + fuelOpex + otherOpex;
  const ebitda = totalRev - totalOpex;
  return { berthingRev, totalRev, fuelRev, otherRev, berthingOpex, fuelOpex, otherOpex, totalOpex, ebitda, margin: totalRev > 0 ? ebitda / totalRev : 0 };
}

const defaultProject = () => ({
  id: crypto.randomUUID(), name: "New Project", status: "Draft",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  location: "", startYear: new Date().getFullYear(), horizon: 50, currency: "SAR",
  landType: "lease", landArea: 0,
  landRentAnnual: 0, landRentEscalation: 5, landRentEscalationEveryN: 5, landRentGrace: 5, landRentTerm: 50,
  landPurchasePrice: 0, partnerEquityPct: 0, landValuation: 0, botOperationYears: 0,
  softCostPct: 10, contingencyPct: 5,
  rentEscalation: 0.75, vacancyPct: 0, defaultEfficiency: 85, defaultLeaseRate: 700, defaultCostPerSqm: 3500,
  activeScenario: "Base Case", customCapexMult: 100, customRentMult: 100, customDelay: 0, customEscAdj: 0,
  phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 36, footprint: 0 }],
  assets: [],
  // Financing (Phase 2)
  finMode: "self", // self | debt | fund
  vehicleType: "fund", // fund | direct | spv
  gpIsFundManager: true, // true = GP manages the fund (gets all fees). false = separate financial company
  fundName: "",
  fundStrategy: "Develop & Hold",
  fundStartYear: 0, // 0 = auto
  // Land Capitalization
  landCapitalize: false,
  landCapRate: 1000, // SAR/sqm
  landCapTo: "gp", // gp | lp | split
  landRentPaidBy: "auto", // auto | project | gp | lp — who pays ongoing land rent after capitalization
  landRentStartRule: "auto", // auto = MIN(grace, income) | grace = grace end only | income = first income only
  landLeaseStartYear: 0, // 0 = same as project startYear. Otherwise absolute year (e.g. 2025)
  landRentManualAlloc: null, // null = auto (by footprint). Object like {"Phase 1":60,"Phase 2":40} = manual %
  landCapGpBearRent: false, // GP bears land rent alone if capitalized
  // Debt
  debtAllowed: true,
  maxLtvPct: 70,
  financeRate: 6.5,
  loanTenor: 7,
  debtGrace: 3,
  debtGraceStartYear: 0, // 0 = auto (first drawdown year), or specific calendar year e.g. 2027
  upfrontFeePct: 0.5,
  repaymentType: "amortizing", // amortizing | bullet
  islamicMode: "conventional", // conventional | murabaha | ijara
  // Equity (manual override)
  gpEquityManual: 0, // 0 = auto from land cap
  lpEquityManual: 0, // 0 = auto (remainder)
  // Fund Fees (only when vehicleType = fund)
  subscriptionFeePct: 2,
  annualMgmtFeePct: 1.5,
  mgmtFeeCapAnnual: 2000000, // Max annual mgmt fee (0 = no cap)
  custodyFeeAnnual: 100000,
  mgmtFeeBase: "nav", // nav (net asset value) | deployed (ZAN: cumCAPEX) | devCost | equity
  feeTreatment: "capital", // H14: capital (ROC+Pref) | rocOnly (ROC, no Pref) | expense (no ROC, no Pref)
  graceBasis: "cod", // H10: cod | firstDraw
  developerFeePct: 10,
  structuringFeePct: 1,
  structuringFeeCap: 300000, // Max structuring fee (0 = no cap)
  preEstablishmentFee: 200000, // One-time pre-establishment fee
  spvFee: 20000, // One-time SPV setup fee
  auditorFeeAnnual: 50000, // Annual auditor fee
  // Exit
  exitStrategy: "sale", // sale | hold | caprate
  exitYear: 0, // 0 = auto
  exitMultiple: 10,
  exitCapRate: 9, // NOI / Cap Rate %
  exitCostPct: 2,
  // Waterfall (Phase 3)
  prefReturnPct: 15,
  gpCatchup: true,
  carryPct: 30,
  lpProfitSplitPct: 70,
  // Government Incentives
  incentives: {
    capexGrant: { enabled: false, grantPct: 25, maxCap: 50000000, phases: [], timing: "construction" },
    financeSupport: { enabled: false, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation", softLoanAmount: 0, softLoanTenor: 10, softLoanGrace: 3, phases: [] },
    landRentRebate: { enabled: false, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 3, phases: [] },
    feeRebates: { enabled: false, items: [], phases: [] },
  },
  // Sharing
  sharedWith: [], // array of email strings
  // Market Indicators (optional)
  market: {
    enabled: false,
    horizonYear: 2033,
    gaps: {
      Retail: { unit: "sqm", gap: 0 },
      Office: { unit: "sqm", gap: 0 },
      Hospitality: { unit: "keys", gap: 0 },
      Residential: { unit: "sqm", gap: 0 },
      Marina: { unit: "berths", gap: 0 },
      Industrial: { unit: "sqm", gap: 0 },
    },
    thresholds: {
      Retail: { low: 50, med: 70 },
      Office: { low: 50, med: 70 },
      Hospitality: { low: 15, med: 30 },
      Residential: { low: 5, med: 10 },
      Marina: { low: 85, med: 100 },
      Industrial: { low: 50, med: 70 },
    },
    conversionFactors: { sqmPerKey: 45, sqmPerUnit: 200, sqmPerBerth: 139 },
    notes: "",
  },
});

// ── Formatters ──
const fmt = (n, d = 0) => { if (n == null || isNaN(n)) return "—"; return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
const fmtPct = (n) => { if (n == null || isNaN(n)) return "—"; return Number(n).toFixed(2) + "%"; };
const fmtM = (n) => { if (!n || isNaN(n)) return "—"; const a = Math.abs(n); if (a >= 1e9) return (n/1e9).toFixed(2)+"B"; if (a >= 1e6) return (n/1e6).toFixed(1)+"M"; if (a >= 1e3) return (n/1e3).toFixed(0)+"K"; return fmt(n); };

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
    const meta = { id: project.id, name: project.name, status: project.status, updatedAt: project.updatedAt, createdAt: project.createdAt };
    const idx = index.findIndex(p => p.id === project.id);
    if (idx >= 0) index[idx] = meta; else index.push(meta);
    await saveProjectIndex(index);
  }
}
async function deleteProjectStorage(id) { await storage.delete(PROJECT_PREFIX + id); const index = await loadProjectIndex(); await saveProjectIndex(index.filter(p => p.id !== id)); }

// ── Calculation Engine ──
function getScenarioMults(p) {
  let cm=1,rm=1,dm=0,ea=0;
  const s = p.activeScenario;
  if (s==="CAPEX +10%") cm=1.1; else if (s==="CAPEX -10%") cm=0.9;
  else if (s==="Rent +10%") rm=1.1; else if (s==="Rent -10%") rm=0.9;
  else if (s==="Delay +6 months") dm=6;
  else if (s==="Escalation +0.5%") ea=0.5; else if (s==="Escalation -0.5%") ea=-0.5;
  else if (s==="Custom") { cm=(p.customCapexMult??100)/100; rm=(p.customRentMult??100)/100; dm=p.customDelay??0; ea=p.customEscAdj??0; }
  return {cm,rm,dm,ea};
}

function computeAssetCapex(asset, project) {
  const {cm} = getScenarioMults(project);
  return (asset.gfa||0) * (asset.costPerSqm||0) * (1+(project.softCostPct||0)/100) * (1+(project.contingencyPct||0)/100) * cm;
}

function computeProjectCashFlows(project) {
  const {cm,rm,dm,ea} = getScenarioMults(project);
  const horizon = project.horizon || 50;
  const startYear = project.startYear || 2026;
  const projectEsc = (project.rentEscalation ?? 0);

  const assetSchedules = (project.assets || []).map(asset => {
    const assetEsc = (asset.escalation ?? projectEsc);
    const effEsc = Math.max(-0.99, (assetEsc + ea) / 100);
    const totalCapex = computeAssetCapex(asset, project);
    const durYears = Math.ceil((asset.constrDuration||12) / 12); // H12: Duration unchanged by delay
    const delayYears = Math.ceil(dm / 12); // H12: Delay shifts start
    const ramp = Math.max(1, asset.rampUpYears ?? 3);
    const occ = (asset.stabilizedOcc != null ? asset.stabilizedOcc : 100) / 100;
    const eff = (asset.efficiency || 0) / 100;
    const leasableArea = (asset.gfa || 0) * eff;
    const leaseRate = (asset.leaseRate || 0) * rm;
    const opEbitda = (asset.opEbitda || 0) * rm;
    const capexSch = new Array(horizon).fill(0);
    const revSch = new Array(horizon).fill(0);
    const cStart = (() => {
      // NEW: Calculate start from phase completionMonth (all assets in phase finish together)
      const assetPhase = (project.phases || []).find(ph => ph.name === (asset.phase || 'Phase 1'));
      if (assetPhase?.completionMonth) {
        const phaseEndYear = Math.ceil(assetPhase.completionMonth / 12);
        return Math.max(0, phaseEndYear - durYears) + delayYears;
      }
      return (asset.constrStart || 1) - 1 + delayYears; // Legacy fallback
    })();

    if (durYears > 0 && totalCapex > 0) {
      const ann = totalCapex / durYears;
      for (let y = cStart; y < cStart + durYears && y < horizon; y++) if (y >= 0) capexSch[y] = ann;
    }

    const revStart = cStart + durYears;
    // H15: BOT limits revenue to operation period
    const botYrs = project.landType === "bot" ? (project.botOperationYears || horizon) : horizon;
    const revEnd = Math.min(revStart + botYrs, horizon);
    if (asset.revType === "Lease" && leasableArea > 0 && leaseRate > 0) {
      for (let y = revStart; y < revEnd; y++) {
        const yrs = y - revStart;
        revSch[y] = leasableArea * leaseRate * occ * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
      }
    } else if (asset.revType === "Operating" && opEbitda > 0) {
      for (let y = revStart; y < revEnd; y++) {
        const yrs = y - revStart;
        revSch[y] = opEbitda * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
      }
    } else if (asset.revType === "Sale") {
      // H1: Unit sale revenue - absorption over N years after construction
      const salePriceSqm = (asset.salePricePerSqm || 0) * rm;
      const sellableArea = (asset.gfa || 0) * ((asset.efficiency ?? 100) / 100);
      const totalSaleValue = sellableArea * salePriceSqm;
      const absorptionYears = Math.max(1, asset.absorptionYears || 3);
      const commissionPct = Math.min(1, Math.max(0, (asset.commissionPct || 0) / 100));
      const preSalePct = Math.min(1, Math.max(0, (asset.preSalePct || 0) / 100));
      // Pre-sales during construction (last year of construction)
      if (preSalePct > 0 && cStart + durYears - 1 >= 0 && cStart + durYears - 1 < horizon) {
        const preSaleAmt = totalSaleValue * preSalePct * (1 - commissionPct);
        revSch[cStart + durYears - 1] = preSaleAmt;
      }
      // Post-construction absorption
      const remainingValue = totalSaleValue * (1 - preSalePct);
      const annualSales = absorptionYears > 0 ? remainingValue / absorptionYears : remainingValue;
      for (let y = revStart; y < Math.min(revStart + absorptionYears, revEnd); y++) {
        const yrs = y - revStart;
        revSch[y] += annualSales * (1 - commissionPct) * Math.pow(1 + effEsc, yrs);
      }
    }

    return { ...asset, totalCapex, leasableArea, capexSchedule: capexSch, revenueSchedule: revSch, totalRevenue: revSch.reduce((a,b)=>a+b,0) };
  });

  // ── Land Rent (v2: dynamic phase allocation) ──
  const landSch = new Array(horizon).fill(0);
  const phaseAllocLand = {};
  const phaseNames = [...new Set([
    ...(project.assets || []).map(a => a.phase || "Unphased"),
    ...(project.phases || []).map(p => p.name),
  ])];
  phaseNames.forEach(pn => { phaseAllocLand[pn] = new Array(horizon).fill(0); });
  let landRentMeta = { rentStartYear: 0, graceEnd: 0, phaseCompletionYears: {}, phaseShares: {} };

  if (project.landType === "lease" && (project.landRentAnnual || 0) > 0) {
    const base = project.landRentAnnual;
    const gr = project.landRentGrace || 0;
    const eN = Math.max(1, project.landRentEscalationEveryN ?? 5);
    const eP = (project.landRentEscalation || 0) / 100;
    const term = Math.min(project.landRentTerm || 50, horizon);

    // Phase completion years
    const phaseCompYrs = {};
    (project.phases || []).forEach(ph => {
      if (ph.completionMonth && ph.completionMonth > 0) {
        phaseCompYrs[ph.name] = Math.ceil(ph.completionMonth / 12);
      } else {
        const pa = assetSchedules.filter(a => (a.phase || 'Phase 1') === ph.name);
        let mx = 0;
        pa.forEach(a => { const lc = a.capexSchedule.reduce((l,v,i) => v > 0 ? i+1 : l, 0); mx = Math.max(mx, lc); });
        phaseCompYrs[ph.name] = mx;
      }
    });

    // Phase footprints
    const phaseFP = {};
    phaseNames.forEach(pn => { phaseFP[pn] = assetSchedules.filter(a=>(a.phase||"Unphased")===pn).reduce((s,a)=>s+(a.footprint||0),0); });
    const totalFootprint = Object.values(phaseFP).reduce((s,v)=>s+v, 0);

    const sortedPh = Object.entries(phaseCompYrs).sort((a,b) => a[1]-b[1]);
    const phase1Year = sortedPh.length > 0 ? sortedPh[0][1] : 0;

    // Lease contract start (absolute year). 0 = same as project start.
    const leaseStartAbsolute = (project.landLeaseStartYear || 0) > 0 ? project.landLeaseStartYear : startYear;
    // Grace end in model index (0-based from project startYear)
    const graceEndIdx = Math.max(0, (leaseStartAbsolute + gr) - startYear);

    // First income year (when any asset starts generating revenue)
    let firstIncomeYear = horizon;
    assetSchedules.forEach(a => {
      const fy = a.revenueSchedule.findIndex(v => v > 0);
      if (fy >= 0 && fy < firstIncomeYear) firstIncomeYear = fy;
    });
    if (firstIncomeYear >= horizon) firstIncomeYear = phase1Year;

    // Land rent start rule: auto | grace | income
    const startRule = project.landRentStartRule || "auto";
    let rentStartYear;
    if (startRule === "grace") {
      rentStartYear = graceEndIdx;
    } else if (startRule === "income") {
      rentStartYear = firstIncomeYear;
    } else {
      // auto: whichever comes first (MIN)
      rentStartYear = Math.min(graceEndIdx, firstIncomeYear);
    }

    const phaseSharesLog = {};

    // Manual allocation override: user sets percentage per phase
    const manualAlloc = project.landRentManualAlloc; // e.g. {"Phase 1":60,"Phase 2":40}
    const useManual = manualAlloc && typeof manualAlloc === 'object' && Object.keys(manualAlloc).length > 0;
    const manualSum = useManual ? Object.values(manualAlloc).reduce((s,v) => s + (Number(v)||0), 0) : 0;

    for (let y = 0; y < term; y++) {
      if (y < rentStartYear) continue;
      const yrsFromStart = y - rentStartYear;
      const rent = base * Math.pow(1 + eP, Math.floor(yrsFromStart / eN));
      landSch[y] = rent;

      if (useManual) {
        // Manual: user-defined percentages
        phaseNames.forEach(pn => {
          const pct = (Number(manualAlloc[pn]) || 0) / 100;
          phaseAllocLand[pn][y] = rent * pct;
          if (!phaseSharesLog[pn]) phaseSharesLog[pn] = { footprint: phaseFP[pn]||0, completionYear: phaseCompYrs[pn], share: pct, firstRentYear: y, manual: true };
        });
      } else if (totalFootprint > 0) {
        // Auto: all phases by footprint proportion
        phaseNames.forEach(pn => {
          const share = (phaseFP[pn] || 0) / totalFootprint;
          phaseAllocLand[pn][y] = rent * share;
          if (!phaseSharesLog[pn]) phaseSharesLog[pn] = { footprint: phaseFP[pn]||0, completionYear: phaseCompYrs[pn], share, firstRentYear: y };
        });
      } else if (phaseNames.length > 0) {
        const share = 1 / phaseNames.length;
        phaseNames.forEach(pn => {
          phaseAllocLand[pn][y] = rent * share;
          if (!phaseSharesLog[pn]) phaseSharesLog[pn] = { footprint: 0, completionYear: phaseCompYrs[pn], share, firstRentYear: y };
        });
      }
    }
    landRentMeta = { rentStartYear, graceEndIdx, leaseStartAbsolute, phase1CompletionYear: phase1Year, firstIncomeYear, startRule, useManual, manualSum, phaseCompletionYears: phaseCompYrs, phaseFootprints: phaseFP, phaseShares: phaseSharesLog, escalationEveryN: eN, escalationPct: eP*100, annualBase: base, term };
  } else if (project.landType === "purchase") {
    // Purchase price goes to CAPEX (year 0), NOT land rent
    // landSch stays zero — purchase is capital expenditure, not ongoing rent
  }

  // Land purchase CAPEX: added to phase CAPEX in year 0
  const landPurchaseCapex = (project.landType === "purchase") ? (project.landPurchasePrice || 0) : 0;

  // ── Phase Results (using pre-computed land allocations) ──
  const phaseResults = {};
  phaseNames.forEach(pName => {
    const pa = assetSchedules.filter(a => (a.phase || "Unphased") === pName);
    const inc = new Array(horizon).fill(0), cap = new Array(horizon).fill(0);
    pa.forEach(a => { for (let y=0;y<horizon;y++) { inc[y]+=a.revenueSchedule[y]; cap[y]+=a.capexSchedule[y]; }});
    const totalFP = assetSchedules.reduce((s,a)=>s+(a.footprint||0),0);
    const pFP = pa.reduce((s,a)=>s+(a.footprint||0),0);
    const alloc = totalFP > 0 ? pFP/totalFP : phaseNames.length > 0 ? 1/phaseNames.length : 0;
    // Add land purchase CAPEX to year 0 (allocated by footprint)
    if (landPurchaseCapex > 0) cap[0] += landPurchaseCapex * alloc;
    const pLand = phaseAllocLand[pName] || new Array(horizon).fill(0);
    const net = new Array(horizon).fill(0);
    for (let y=0;y<horizon;y++) net[y] = inc[y] - pLand[y] - cap[y];
    phaseResults[pName] = {
      income:inc, capex:cap, landRent:pLand, netCF:net,
      totalCapex: cap.reduce((a,b)=>a+b,0), totalIncome: inc.reduce((a,b)=>a+b,0),
      totalLandRent: pLand.reduce((a,b)=>a+b,0), totalNetCF: net.reduce((a,b)=>a+b,0),
      irr: calcIRR(net), assetCount: pa.length, footprint: pFP, allocPct: alloc,
    };
  });

  const ci = new Array(horizon).fill(0), cc = new Array(horizon).fill(0), cl = new Array(horizon).fill(0), cn = new Array(horizon).fill(0);
  Object.values(phaseResults).forEach(pr => { for (let y=0;y<horizon;y++) { ci[y]+=pr.income[y]; cc[y]+=pr.capex[y]; cl[y]+=pr.landRent[y]; cn[y]+=pr.netCF[y]; }});

  // Payback + Peak Negative
  let cumCF = 0, paybackYear = null, peakNegative = 0, peakNegativeYear = 0, _pbWasNeg = false;
  for (let y = 0; y < horizon; y++) {
    cumCF += cn[y];
    if (cumCF < peakNegative) { peakNegative = cumCF; peakNegativeYear = y; }
    if (cumCF < -1) _pbWasNeg = true;
    if (paybackYear === null && _pbWasNeg && cumCF >= 0) { paybackYear = y; }
  }

  return {
    assetSchedules, phaseResults, landSchedule: landSch, landRentMeta, startYear, horizon,
    consolidated: {
      income:ci, capex:cc, landRent:cl, netCF:cn,
      totalCapex:cc.reduce((a,b)=>a+b,0), totalIncome:ci.reduce((a,b)=>a+b,0),
      totalLandRent:cl.reduce((a,b)=>a+b,0), totalNetCF:cn.reduce((a,b)=>a+b,0),
      irr:calcIRR(cn), npv10:calcNPV(cn,0.10), npv12:calcNPV(cn,0.12), npv14:calcNPV(cn,0.14),
      paybackYear, peakNegative, peakNegativeYear,
    },
  };
}

function calcIRR(cf, guess=0.1, maxIter=200, tol=1e-7) {
  if (!cf.some(c=>c<0) || !cf.some(c=>c>0)) return null;
  let r = guess;
  for (let i=0;i<maxIter;i++) {
    let npv=0,dnpv=0;
    for (let t=0;t<cf.length;t++) { const d=Math.pow(1+r,t); npv+=cf[t]/d; dnpv-=t*cf[t]/(d*(1+r)); }
    if (Math.abs(dnpv)<1e-15) break;
    const nr = r - npv/dnpv;
    if (Math.abs(nr-r)<tol) return nr;
    r = nr;
    if (r<-0.99||r>10) return null;
  }
  // Newton-Raphson did not converge - try bisection fallback
  let lo = -0.5, hi = 5.0;
  const npvAt = (rate) => cf.reduce((s,v,t) => s + v/Math.pow(1+rate,t), 0);
  if (npvAt(lo) * npvAt(hi) > 0) return null; // no root in range
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const nmid = npvAt(mid);
    if (Math.abs(nmid) < Math.max(1, cf.reduce((s,v)=>s+Math.abs(v),0) * 1e-8)) return mid;
    if (npvAt(lo) * nmid < 0) hi = mid; else lo = mid;
  }
  return null; // still no convergence
}
function calcNPV(cf, r) { return cf.reduce((s,v,t)=>s+v/Math.pow(1+r,t),0); }

function runChecks(project, results, financing, waterfall, incentivesResult) {
  const as = results.assetSchedules;
  const c = results.consolidated;
  const h = results.horizon;
  const f = financing;
  const w = waterfall;
  const ir = incentivesResult;
  const tol = 1;
  const phases = results.phaseResults || {};
  const checks = [];
  const add = (cat, name, pass, desc, detail) => checks.push({ cat, name, pass, desc, detail: detail || "" });
  const fmt = n => n != null ? Math.round(n).toLocaleString() : "N/A";
  const fp = n => n != null ? (n*100).toFixed(2)+"%" : "N/A";

  // ═══════════════════════════════════════════════
  // T0: BUSINESS VALIDATION (H16)
  // ═══════════════════════════════════════════════
  if (w && project.finMode === "fund") {
    const gpP = w.gpPct || 0, lpP = w.lpPct || 0;
    add("T0","GP+LP = 100%", Math.abs((gpP+lpP)-1) < 0.001, "Equity split must total 100%", `GP: ${fp(gpP)} + LP: ${fp(lpP)} = ${fp(gpP+lpP)}`);
  }
  const infraCats = ["utilities","parking","landscaping","roads","common","infrastructure"];
  const isInfra = (a) => infraCats.some(ic => (a.category||"").toLowerCase().includes(ic) || (a.name||"").toLowerCase().includes(ic));
  (project.assets||[]).forEach((a,i) => {
    if (a.revType === "Lease" && (a.efficiency||0) === 0 && (a.gfa||0) > 0 && !isInfra(a))
      add("T0",`Asset "${a.name||i}": Efficiency=0`, false, "Lease asset with 0% efficiency generates no revenue");
    if ((a.gfa||0) > 0 && (a.costPerSqm||0) === 0)
      add("T0",`Asset "${a.name||i}": Cost/sqm=0`, false, "Asset has GFA but zero construction cost");
  });
  if (project.exitStrategy === "caprate" && (project.exitCapRate??9) === 0)
    add("T0","Exit Cap Rate = 0", false, "Cap rate exit with 0% cap rate causes division by zero");
  if (f && project.debtAllowed && (project.loanTenor??7) <= (project.debtGrace??3))
    add("T0","Tenor ≤ Grace", false, "Loan tenor must exceed grace period", `Tenor: ${project.loanTenor??7}, Grace: ${project.debtGrace??3}`);
  // K1-K7: Additional validation checks from code audit
  if ((project.landRentEscalationEveryN ?? 5) <= 0 && project.landType === "lease")
    add("T0","Land Esc Interval = 0", false, "Step escalation interval must be > 0");
  if ((project.carryPct ?? 30) >= 100 && project.gpCatchup)
    add("T0","Carry ≥ 100%", false, "Carry percentage must be < 100% when catch-up enabled");
  if ((project.maxLtvPct ?? 70) >= 100 && project.finMode === "fund")
    add("T0","LTV ≥ 100% in Fund", false, "100% LTV in fund mode leaves no equity for investors");
  const maxConstrEnd = Math.max(0, ...as.map(a => a.capexSchedule.reduce((last, v, i) => v > 0 ? i + 1 : last, 0)));
  if (maxConstrEnd > (project.horizon||50))
    add("T0","Horizon < Construction", false, "Horizon doesn't cover full construction period", `Constr ends Y${maxConstrEnd}, Horizon Y${project.horizon||50}`);

  // H11: Exit during ramp-up warning
  if (f && project.exitStrategy !== "hold") {
    const exitYrIdx = f.exitYear ? f.exitYear - (project.startYear||2025) : 0;
    const maxRamp = Math.max(...as.map(a => {
      const lastCapex = a.capexSchedule.reduce((last, v, i) => v > 0 ? i + 1 : last, 0);
      return lastCapex + (a.rampUpYears??3);
    }));
    if (exitYrIdx > 0 && exitYrIdx < maxRamp)
      add("T0","Exit Before Stabilization", true, "Exit year is during ramp-up. Valuation may use unstabilized income", `Exit Y${exitYrIdx}, Full stabilization Y${maxRamp}`);
  }

  // ═══════════════════════════════════════════════
  // T1: PROJECT ENGINE (15 checks)
  // ═══════════════════════════════════════════════
  add("T1","GFA Total Match", Math.abs((project.assets||[]).reduce((s,a)=>s+(a.gfa||0),0) - as.reduce((s,a)=>s+(a.gfa||0),0)) < tol, "Program GFA = Computed GFA");
  add("T1","No Negative GFA", (project.assets||[]).every(a=>(a.gfa||0)>=0), "All GFA values ≥ 0");
  add("T1","Active Assets Have Duration", (project.assets||[]).every(a=>((a.gfa||0)===0&&(a.costPerSqm||0)===0)||(a.constrDuration||0)>0), "Assets with GFA have construction duration");
  // Check: no asset's build duration exceeds its phase completionMonth
  const durationOK = (project.assets||[]).every(a => {
    const ph = (project.phases||[]).find(p => p.name === (a.phase || 'Phase 1'));
    if (!ph?.completionMonth) return true; // legacy project, skip
    return (a.constrDuration || 12) <= ph.completionMonth;
  });
  const badAssets = (project.assets||[]).filter(a => {
    const ph = (project.phases||[]).find(p => p.name === (a.phase || 'Phase 1'));
    return ph?.completionMonth && (a.constrDuration || 12) > ph.completionMonth;
  }).map(a => `${a.name||'?'}(${a.constrDuration}mo>${(project.phases||[]).find(p=>p.name===(a.phase||'Phase 1'))?.completionMonth}mo)`);
  add("T1","Build Duration ≤ Phase Opening", durationOK, "No asset takes longer than its phase to build",
    badAssets.length > 0 ? badAssets.join(', ') : undefined);
  add("T1","No Negative Leasable", as.every(a=>(a.leasableArea||0)>=0), "All leasable areas ≥ 0");
  add("T1","CAPEX Reconciles", Math.abs(as.reduce((s,a)=>s+a.totalCapex,0) - c.totalCapex) < tol, "Sum asset CAPEX = consolidated",
    `Assets: ${fmt(as.reduce((s,a)=>s+a.totalCapex,0))} vs Cons: ${fmt(c.totalCapex)}`);
  add("T1","Revenue Reconciles", Math.abs(as.reduce((s,a)=>s+a.totalRevenue,0) - c.totalIncome) < tol, "Sum asset revenue = consolidated");
  add("T1","Op Assets Have EBITDA", (project.assets||[]).filter(a=>a.revType==="Operating").every(a=>(a.opEbitda||0)>0||(a.gfa||0)===0), "Operating assets have EBITDA");
  const phInc = Object.values(phases).reduce((s,p)=>s+p.totalIncome,0);
  const phCap = Object.values(phases).reduce((s,p)=>s+p.totalCapex,0);
  add("T1","Phase Income = Consolidated", Math.abs(phInc-c.totalIncome)<tol, "Sum phase income = consolidated",
    `Phases: ${fmt(phInc)} vs Cons: ${fmt(c.totalIncome)}`);
  add("T1","Phase CAPEX = Consolidated", Math.abs(phCap-c.totalCapex)<tol, "Sum phase CAPEX = consolidated");
  let cfOk = true;
  for (let y=0;y<h;y++) { if (Math.abs(c.netCF[y]-(c.income[y]-c.capex[y]-c.landRent[y]))>tol) { cfOk=false; break; } }
  add("T1","Net CF = Income - CAPEX - Land", cfOk, "Year-by-year CF equation holds");
  const escOk = as.every(a => a.revenueSchedule[Math.min(9,h-1)]===0 || a.revenueSchedule[Math.min(4,h-1)]===0 || a.revenueSchedule[Math.min(9,h-1)] >= a.revenueSchedule[Math.min(4,h-1)]);
  add("T1","Revenue Escalates", escOk, "Later years revenue ≥ earlier years");
  add("T1","IRR Computed", c.irr !== null || c.totalNetCF <= 0, "IRR computed when CF positive", `IRR: ${fp(c.irr)}`);
  add("T1","NPV@10% Computed", c.npv10 !== undefined, "NPV at 10% computed", `NPV: ${fmt(c.npv10)}`);
  add("T1","Sum Consistency", Math.abs(c.totalNetCF-(c.totalIncome-c.totalCapex-c.totalLandRent))<tol, "Total Net CF = Income - CAPEX - Land");
  if (project.landType === "lease") { add("T1","Lease Land Rent", c.totalLandRent>0||(project.landRentAnnual||0)===0, "Leased land: rent configured correctly"); }
  else if (project.landType === "purchase") { add("T1","Purchase Land Cost", c.capex[0]>=(project.landPurchasePrice||0)||(project.landPurchasePrice||0)===0, "Purchase cost in CAPEX year 0"); }
  else if (project.landType === "partner" || project.landType === "bot") { add("T1","No Land Cost", c.totalLandRent===0, "No cash land cost for partner/BOT"); }
  // Manual allocation sum check
  if (project.landRentManualAlloc && Object.keys(project.landRentManualAlloc).length > 0) {
    const mSum = Object.values(project.landRentManualAlloc).reduce((s,v) => s + (Number(v)||0), 0);
    add("T1","Rent Alloc = 100%", Math.abs(mSum - 100) <= 0.1, "Manual land rent allocation totals 100%", `Sum: ${mSum.toFixed(1)}%`);
  }

  // ═══════════════════════════════════════════════
  // T2: FINANCING ENGINE (12 checks)
  // ═══════════════════════════════════════════════
  if (f && f.mode !== "self") {
    const capTarget = f.totalProjectCost || f.devCostInclLand;
    const capDiff = Math.abs((f.totalDebt+f.gpEquity+f.lpEquity)-capTarget);
    add("T2","Capital Structure Equation", capDiff<10000, "Debt + GP + LP = Total Project Cost",
      `${fmt(f.totalDebt+f.gpEquity+f.lpEquity)} vs ${fmt(capTarget)} (diff: ${fmt(capDiff)})`);
    add("T2","Debt Balance ≥ 0", (f.debtBalClose||[]).every(v=>v>=-0.01), "Debt balance never negative");
    const rpEnd = f.repayStart+f.repayYears-1;
    const balEnd = rpEnd>=0&&rpEnd<h?(f.debtBalClose[rpEnd]||0):0;
    add("T2","Debt Fully Repaid", f.tenor===0||balEnd<1, "Debt repaid by tenor end", `Balance at year ${rpEnd+1}: ${fmt(balEnd)}`);
    let intOk=true;
    const ufPct = (project.upfrontFeePct||0)/100;
    const exitIdx = f.exitYear ? f.exitYear - (project.startYear||2026) : -1;
    for (let y=0;y<Math.min(h,20);y++) {
      if (y === exitIdx) continue; // Balloon repay distorts trueClose at exit year
      if ((f.debtBalOpen[y]||0)>0||(f.debtBalClose[y]||0)>0||(f.drawdown?.[y]||0)>0) {
        const trueClose = Math.max(0,(f.debtBalOpen[y]||0)+(f.drawdown?.[y]||0)-(f.repayment?.[y]||0));
        const exp=Math.max(0,((f.debtBalOpen[y]||0)+trueClose)/2*f.rate + (f.drawdown?.[y]||0)*ufPct);
        const act=Math.abs(f.originalInterest?.[y]||f.interest[y]||0);
        if (exp>0&&Math.abs(act-exp)/exp>0.05) { intOk=false; break; }
      }
    }
    add("T2","Interest = AvgBal × Rate + Draw × Fee%", intOk, "Interest uses (Open+Close)/2 × rate + draw × upfrontFee%");
    const totEqC=(f.equityCalls||[]).reduce((s,v)=>s+v,0);
    add("T2","Equity Calls ≥ Equity", totEqC>=f.totalEquity-10000, "Equity calls cover equity",
      `Calls: ${fmt(totEqC)} vs Equity: ${fmt(f.totalEquity)}`);
    const totDrw=(f.drawdown||[]).reduce((s,v)=>s+v,0);
    add("T2","Drawdown = Total Debt", Math.abs(totDrw-f.totalDebt)<1, "Sum drawdowns = debt drawn");
    let graceOk=true;
    if (f.repayStart>0) { for(let y=0;y<f.repayStart&&y<h;y++) { if((f.repayment?.[y]||0)>1){graceOk=false;break;} } }
    add("T2","Grace Period Respected", graceOk, "No repayment during grace period");
    const adjLR=ir?.adjustedLandRent||c.landRent;
    let levOk=true;
    // Determine if sold (post-exit CF should be zero)
    const fExitStr=project.exitStrategy||"sale";
    const fExitYrIdx=f.exitYear?(f.exitYear-(project.startYear||2026)):-1;
    const fSold=fExitStr!=="hold"&&fExitYrIdx>=0&&fExitYrIdx<h;
    for(let y=0;y<h;y++){
      let exp;
      if(fSold&&y>fExitYrIdx){exp=0;}
      else{exp=c.income[y]-adjLR[y]-c.capex[y]+(ir?.capexGrantSchedule?.[y]||0)+(ir?.feeRebateSchedule?.[y]||0)-f.debtService[y]+f.drawdown[y]+(f.exitProceeds?.[y]||0);}
      if(Math.abs(f.leveredCF[y]-exp)>tol){levOk=false;break;}
    }
    add("T2","Levered CF Equation", levOk, "LevCF = Income - Land - CAPEX + Grants - DS + Draw + Exit");
    let dscrOk=true;
    for(let y=0;y<h;y++){
      if(f.debtService[y]>0&&f.dscr[y]!==null){
        const exp=(c.income[y]-adjLR[y])/f.debtService[y];
        if(Math.abs(f.dscr[y]-exp)>0.01){dscrOk=false;break;}
      }
    }
    add("T2","DSCR = NOI / Debt Service", dscrOk, "DSCR calculation consistent");
    add("T2","GP + LP = Equity", Math.abs(f.gpEquity+f.lpEquity-f.totalEquity)<1, "GP + LP = total equity");
    if (f.leveredIRR!==null&&c.irr!==null) {
      add("T2","Leverage Changes IRR", Math.abs(f.leveredIRR-c.irr)>0.001, "Levered ≠ Unlevered IRR",
        `Unlev: ${fp(c.irr)} Lev: ${fp(f.leveredIRR)}`);
    }
    if (f.interestSubsidyTotal>0) {
      add("T2","Interest Subsidy Active", true, "Finance support reduces interest", `Savings: ${fmt(f.interestSubsidyTotal)}`);
    }
  }

  // ═══════════════════════════════════════════════
  // T3: WATERFALL ENGINE (10 checks)
  // ═══════════════════════════════════════════════
  if (w && w.tier1) {
    let distOk=true;
    for(let y=0;y<h;y++){
      const td=(w.tier1[y]||0)+(w.tier2[y]||0)+(w.tier3[y]||0)+(w.tier4LP[y]||0)+(w.tier4GP[y]||0);
      if(td>(w.cashAvail[y]||0)+tol){distOk=false;break;}
    }
    add("T3","Dist ≤ Cash Available", distOk, "Annual distributions ≤ cash available");
    const firstEqCallYr = (w.equityCalls||[]).findIndex(v => v > 0);
    const unretAfterFirstCall = firstEqCallYr >= 0 ? (w.unreturnedOpen?.[firstEqCallYr] || 0) + (w.equityCalls?.[firstEqCallYr] || 0) : 0;
    add("T3","Unreturned Capital Init", unretAfterFirstCall > 0, "Unreturned capital initialized",
      `Start: ${fmt(unretAfterFirstCall)} (yr ${firstEqCallYr >= 0 ? firstEqCallYr + 1 : '?'})`);
    let lpDOk=true;
    for(let y=0;y<h;y++){
      if(w.lpDist[y]>0&&w.lpPct>0){
        // Option B: T1+T2 both pro-rata
        const exp=(w.tier1[y]+w.tier2[y])*(w.lpPct||0)+(w.tier4LP[y]||0);
        if(Math.abs(w.lpDist[y]-exp)>tol){lpDOk=false;break;}
      }
    }
    add("T3","LP Dist = (T1+T2)*LP% + T4LP", lpDOk, "LP distribution formula correct");
    let gpDOk=true;
    for(let y=0;y<h;y++){
      if(w.gpDist[y]>0&&w.gpPct>0){
        // Option B: T1+T2 pro-rata + T3 + T4GP
        const exp=(w.tier1[y]+w.tier2[y])*(w.gpPct||0)+(w.tier3[y]||0)+(w.tier4GP[y]||0);
        if(Math.abs(w.gpDist[y]-exp)>tol){gpDOk=false;break;}
      }
    }
    add("T3","GP Dist = (T1+T2)*GP% + T3 + T4GP", gpDOk, "GP distribution formula correct");
    if(w.lpTotalInvested>0&&w.lpMOIC){
      const expM=w.lpTotalDist/w.lpTotalInvested;
      add("T3","LP MOIC = Dist/Equity", Math.abs(w.lpMOIC-expM)<0.01, "LP MOIC correct", `${w.lpMOIC.toFixed(2)}x`);
    }
    if(w.gpTotalInvested>0&&w.gpMOIC){
      const expM=w.gpTotalDist/w.gpTotalInvested;
      add("T3","GP MOIC = Dist/Equity", Math.abs(w.gpMOIC-expM)<0.01, "GP MOIC correct", `${w.gpMOIC.toFixed(2)}x`);
    }
    const totROC=(w.tier1||[]).reduce((s,v)=>s+v,0);
    const totCalled=(w.equityCalls||[]).reduce((s,v)=>s+v,0);
    add("T3","ROC ≤ Called Capital", totROC<=totCalled+tol, "Return of capital ≤ called",
      `ROC: ${fmt(totROC)} vs Called: ${fmt(totCalled)}`);
    add("T3","LP IRR Computed", w.lpIRR!==null||w.lpTotalDist===0, "LP IRR computed", `${fp(w.lpIRR)}`);
    add("T3","GP IRR Computed", w.gpIRR!==null||w.gpTotalDist===0||w.gpTotalDist<w.gpTotalInvested, "GP IRR computed (N/A if GP return < equity)", `${fp(w.gpIRR)}`);
  }

  // ═══════════════════════════════════════════════
  // T4: INCENTIVES ENGINE (8 checks)
  // ═══════════════════════════════════════════════
  if (ir) {
    if (ir.capexGrantTotal > 0) {
      add("T4","CAPEX Grant ≤ CAPEX", ir.capexGrantTotal<=c.totalCapex+tol, "Grant ≤ total CAPEX",
        `Grant: ${fmt(ir.capexGrantTotal)} vs CAPEX: ${fmt(c.totalCapex)}`);
      const adjCT=ir.adjustedCapex.reduce((s,v)=>s+v,0);
      add("T4","Adjusted CAPEX = Orig - Grant", Math.abs(adjCT-(c.totalCapex-ir.capexGrantTotal))<tol, "CAPEX reduced by grant",
        `${fmt(adjCT)} = ${fmt(c.totalCapex)} - ${fmt(ir.capexGrantTotal)}`);
      add("T4","CAPEX Grant → IRR Change", ir.adjustedIRR!==c.irr, "Grant changes Unlevered IRR",
        `${fp(c.irr)} → ${fp(ir.adjustedIRR)}`);
    }
    if (ir.landRentSavingTotal > 0) {
      let lrOk=true;
      for(let y=0;y<h;y++){ if(ir.landRentSavingSchedule[y]>Math.abs(c.landRent[y]||0)+tol){lrOk=false;break;} }
      add("T4","Land Rebate ≤ Rent", lrOk, "Rebate never exceeds original rent");
      add("T4","Land Rebate → IRR Change", ir.adjustedIRR!==null&&ir.adjustedIRR!==c.irr, "Rebate changes IRR",
        `Saving: ${fmt(ir.landRentSavingTotal)} → IRR: ${fp(ir.adjustedIRR)}`);
    }
    if (ir.feeRebateTotal > 0) {
      add("T4","Fee Rebate Recorded", true, "Fee rebate value computed", `Total: ${fmt(ir.feeRebateTotal)}`);
      add("T4","Fee Rebate → IRR Change", ir.adjustedIRR!==null&&ir.adjustedIRR!==c.irr, "Fee rebate changes IRR");
    }
    if (ir.totalIncentiveValue > 0) {
      let impOk=true;
      for(let y=0;y<h;y++){
        const exp=(ir.capexGrantSchedule?.[y]||0)+(ir.landRentSavingSchedule?.[y]||0)+(ir.feeRebateSchedule?.[y]||0);
        if(Math.abs((ir.netCFImpact?.[y]||0)-exp)>tol){impOk=false;break;}
      }
      add("T4","Net Impact = Grant+Land+Fee", impOk, "Year-by-year incentive impact reconciles");
    }
  }

  // ═══════════════════════════════════════════════
  // T5: CROSS-ENGINE INTEGRATION (8 checks)
  // ═══════════════════════════════════════════════
  if (f && f.mode !== "self" && ir && ir.capexGrantTotal > 0) {
    const expDev=ir.adjustedCapex.reduce((s,v)=>s+v,0);
    add("T5","Fin Uses Adjusted CAPEX", Math.abs(f.devCostExclLand-expDev)<tol, "Financing uses incentive-adjusted CAPEX",
      `Fin: ${fmt(f.devCostExclLand)} vs Adj: ${fmt(expDev)}`);
  }
  if (f && f.mode !== "self" && ir && ir.totalIncentiveValue > 0) {
    const baseCF=new Array(h).fill(0);
    for(let y=0;y<h;y++) baseCF[y]=c.income[y]-c.landRent[y]-c.capex[y]-(f.debtService[y]||0)+(f.drawdown[y]||0)+(f.exitProceeds?.[y]||0);
    const baseIRR=calcIRR(baseCF);
    add("T5","Incentives Change Levered IRR", baseIRR===null||f.leveredIRR===null||Math.abs(f.leveredIRR-baseIRR)>0.0001,
      "Levered IRR differs with incentives", `Without: ${fp(baseIRR)} With: ${fp(f.leveredIRR)}`);
  }
  if (f && f.mode === "self" && ir && ir.totalIncentiveValue > 0) {
    add("T5","Self-Funded IRR Adjusted", f.leveredIRR!==c.irr||ir.capexGrantTotal===0, "Self-funded IRR includes incentives",
      `Base: ${fp(c.irr)} Adj: ${fp(f.leveredIRR)}`);
  }
  if (w && f) {
    add("T5","Waterfall Has Cash", w.cashAvail.reduce((s,v)=>s+v,0)!==0, "Cash available for distribution");
  }
  if (ir && ir.adjustedIRR !== null && ir.totalIncentiveValue > 0) {
    add("T5","Dashboard Shows Adjusted IRR", true, "Adjusted IRR ready for display", `${fp(ir.adjustedIRR)}`);
  }
  if (f && f.exitProceeds && f.exitProceeds.some(v=>v>0)) {
    add("T5","Exit Proceeds Generated", true, "Exit generates proceeds", `${fmt(f.exitProceeds.reduce((s,v)=>s+v,0))}`);
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: FINANCING ENGINE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// GOVERNMENT INCENTIVES ENGINE
// ═══════════════════════════════════════════════════════════════
function computeIncentives(project, projectResults) {
  if (!project || !projectResults) return null;
  const h = project.horizon || 50;
  const inc = project.incentives || {};
  const c = projectResults.consolidated;

  let constrEnd = 0;
  for (let y = h-1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }

  const result = {
    capexGrantTotal: 0, capexGrantSchedule: new Array(h).fill(0),
    interestSubsidyTotal: 0, interestSubsidySchedule: new Array(h).fill(0),
    softLoanDrawdown: new Array(h).fill(0), softLoanRepay: new Array(h).fill(0), softLoanBalance: new Array(h).fill(0),
    landRentSavingTotal: 0, landRentSavingSchedule: new Array(h).fill(0), adjustedLandRent: [...(c.landRent || [])],
    feeRebateTotal: 0, feeRebateSchedule: new Array(h).fill(0),
    totalIncentiveValue: 0,
    adjustedCapex: [...c.capex],
    netCFImpact: new Array(h).fill(0),
  };

  // ── 1. CAPEX Grant ──
  if (inc.capexGrant?.enabled) {
    const g = inc.capexGrant;
    const rawGrant = c.totalCapex * (g.grantPct || 0) / 100;
    const grantAmt = Math.min(rawGrant, g.maxCap || Infinity);
    result.capexGrantTotal = grantAmt;
    if (g.timing === "construction" && constrEnd >= 0) {
      // FIX#6: Spend-weighted grant distribution (proportional to actual CAPEX)
      const totalEligibleCapex = c.capex.reduce((s, v) => s + (v > 0 ? v : 0), 0);
      if (totalEligibleCapex > 0) {
        for (let y = 0; y < h; y++) {
          if (c.capex[y] > 0) {
            const alloc = grantAmt * (c.capex[y] / totalEligibleCapex);
            result.capexGrantSchedule[y] = alloc;
            result.adjustedCapex[y] -= alloc;
          }
        }
      }
    } else {
      result.capexGrantSchedule[Math.min(constrEnd + 1, h - 1)] = grantAmt;
    }
  }

  // ── 2. Land Rent Rebate ──
  if (inc.landRentRebate?.enabled && project.landType === "lease") {
    const lr = inc.landRentRebate;
    // FIX#7: Find actual construction start from CAPEX schedule
    let constrStart = 0;
    for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { constrStart = y; break; } }
    const constrYrs = lr.constrRebateYears > 0 ? lr.constrRebateYears : constrEnd - constrStart + 1;
    const constrPct = (lr.constrRebatePct || 0) / 100;
    const operPct = (lr.operRebatePct || 0) / 100;
    const operYrs = lr.operRebateYears || 0;
    const constrWindowEnd = constrStart + constrYrs;
    for (let y = 0; y < h; y++) {
      let rebatePct = 0;
      if (y >= constrStart && y < constrWindowEnd) rebatePct = constrPct;
      else if (y >= constrWindowEnd && y < constrWindowEnd + operYrs) rebatePct = operPct;
      const saving = Math.abs(c.landRent[y] || 0) * rebatePct;
      result.landRentSavingSchedule[y] = saving;
      result.adjustedLandRent[y] = Math.max(0, (c.landRent[y] || 0) - saving);
      result.landRentSavingTotal += saving;
    }
  }

  // ── 3. Fee/Tax Rebates ──
  if (inc.feeRebates?.enabled && inc.feeRebates.items?.length > 0) {
    for (const item of inc.feeRebates.items) {
      const amt = item.amount || 0;
      const yr = Math.max(0, Math.min((item.year || 1) - 1, h - 1));
      if (item.type === "rebate") {
        result.feeRebateSchedule[yr] += amt;
        result.feeRebateTotal += amt;
      } else if (item.type === "deferral") {
        const deferYrs = Math.ceil((item.deferralMonths || 12) / 12);
        const newYr = Math.min(yr + deferYrs, h - 1);
        // H5: Actually move cash flow - save at original year, pay at deferred year
        result.feeRebateSchedule[yr] += amt;        // Save the fee at original year
        result.feeRebateSchedule[newYr] -= amt;      // Pay it at deferred year
        // Net benefit = NPV of deferral
        const benefit = amt - amt / Math.pow(1.1, deferYrs);
        result.feeRebateTotal += benefit;
      }
    }
  }

  // ── Net CF Impact ──
  for (let y = 0; y < h; y++) {
    result.netCFImpact[y] = result.capexGrantSchedule[y] + result.landRentSavingSchedule[y] + result.feeRebateSchedule[y];
  }
  result.totalIncentiveValue = result.capexGrantTotal + result.landRentSavingTotal + result.feeRebateTotal;

  // ── Finance Support value (calculated later in computeFinancing, but estimate here for display) ──
  const fs = project.incentives?.financeSupport;
  if (fs?.enabled) {
    if (fs.subType === 'interestSubsidy') {
      // Estimate: subsidy saves subsidyPct of total interest. Rough estimate for KPI card.
      // Actual calculation happens in applyInterestSubsidy inside computeFinancing.
      result.finSupportEstimate = true; // Flag that finance support is active
    } else if (fs.subType === 'softLoan') {
      const slAmt = fs.softLoanAmount || 0;
      result.softLoanAmount = slAmt;
      result.finSupportEstimate = true;
    }
  }

  // ── Adjusted CF with incentives (for correct IRR/NPV) ──
  const adjCF = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    adjCF[y] = c.netCF[y] + result.netCFImpact[y];
  }
  result.adjustedNetCF = adjCF;
  result.adjustedIRR = calcIRR(adjCF);
  result.adjustedNPV10 = calcNPV(adjCF, 0.10);
  result.adjustedNPV12 = calcNPV(adjCF, 0.12);
  result.adjustedTotalNetCF = adjCF.reduce((a, b) => a + b, 0);

  return result;
}

// Interest subsidy AND soft loan applied inside computeFinancing
function applyInterestSubsidy(project, interest, constrEnd, totalDebt, rate) {
  const inc = project.incentives?.financeSupport;
  if (!inc?.enabled) return { adjusted: interest, savings: new Array(interest.length).fill(0), total: 0, softLoanSavings: 0 };
  const h = interest.length;
  const adjusted = [...interest];
  const savings = new Array(h).fill(0);
  let total = 0;

  if (inc.subType === "interestSubsidy") {
    // H3: Start from first year with interest (first drawdown), not year 0
    let firstInterestYr = 0;
    for (let y = 0; y < h; y++) { if (interest[y] > 0) { firstInterestYr = y; break; } }
    const startYr = inc.subsidyStart === "operation" ? constrEnd + 1 : firstInterestYr;
    const endYr = startYr + (inc.subsidyYears ?? 5);
    const pct = (inc.subsidyPct || 0) / 100;
    for (let y = startYr; y < endYr && y < h; y++) {
      savings[y] = interest[y] * pct;
      adjusted[y] = interest[y] * (1 - pct);
      total += savings[y];
    }
  } else if (inc.subType === "softLoan") {
    // Soft loan = government provides 0% loan, reducing commercial interest
    // Benefit = portion of debt that's interest-free × commercial rate
    const slAmt = Math.min(inc.softLoanAmount || 0, totalDebt);
    const slTenor = inc.softLoanTenor ?? 10;
    const slGrace = inc.softLoanGrace ?? 3;
    if (slAmt > 0 && rate > 0) {
      // Soft loan portion doesn't accrue interest
      // Savings each year = (soft loan outstanding) × commercial rate
      let slBalance = slAmt;
      const slRepayYrs = Math.max(1, slTenor - slGrace);
      const slAnnualRepay = slAmt / slRepayYrs;
      for (let y = 0; y < h && slBalance > 0; y++) {
        // Interest saving = soft loan balance × commercial rate (would have paid this)
        const saving = slBalance * rate;
        savings[y] = Math.min(saving, interest[y]); // Can't save more than actual interest
        adjusted[y] = interest[y] - savings[y];
        total += savings[y];
        // Repay soft loan after grace
        if (y >= slGrace) {
          slBalance = Math.max(0, slBalance - slAnnualRepay);
        }
      }
    }
  }

  return { adjusted, savings, total, softLoanSavings: total };
}

function computeFinancing(project, projectResults, incentivesResult) {
  if (!project || !projectResults) return null;
  const h = project.horizon || 50;
  const startYear = project.startYear || 2026;
  const c = projectResults.consolidated;

  const ir = incentivesResult;
  // ── Land Capitalization ──
  const landCapValue = project.landCapitalize ? (project.landArea || 0) * (project.landCapRate || 1000) : 0;
  // H15: Partner land uses landValuation as equity contribution
  const partnerLandValue = project.landType === "partner" ? (project.landValuation || 0) : 0;
  const effectiveLandCap = landCapValue + partnerLandValue;
  const devCostExclLand = ir ? ir.adjustedCapex.reduce((a,b) => a+b, 0) : c.totalCapex;
  const capexGrantTotal = ir?.capexGrantTotal || 0;
  const cashLandCost = (project.landType === "purchase" && !project.landCapitalize) ? (project.landPurchasePrice ?? 0) : 0;
  const devCostInclLand = devCostExclLand + effectiveLandCap + cashLandCost;

  if (project.finMode === "self") {
    // For self-funded: use incentive-adjusted CF if available
    const selfCF = ir && ir.adjustedNetCF ? [...ir.adjustedNetCF] : [...c.netCF];
    // ── Self-funded Exit ──
    let constrEndSelf = 0;
    for (let y = h - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEndSelf = y; break; } }
    const exitProceedsSelf = new Array(h).fill(0);
    const exitStrategySelf = project.exitStrategy || "sale";
    const selfGrace = project.debtGrace ?? 3;
    const exitYrSelf = exitStrategySelf === "hold" ? h - 1 : ((project.exitYear || 0) > 0 ? project.exitYear - startYear : constrEndSelf + selfGrace + 2);
    const selfSold = exitStrategySelf !== "hold" && exitYrSelf >= 0 && exitYrSelf < h;
    if (selfSold) {
      // FIX#1: Per-asset exit valuation - skip Sale assets (already realized)
      let exitVal = 0;
      const exitIdx = Math.min(exitYrSelf, h - 1);
      const fallbackIdx = Math.min(constrEndSelf + 2, h - 1);
      const assetScheds = projectResults.assetSchedules || [];
      if (assetScheds.length > 0) {
        for (const as of assetScheds) {
          if (as.revType === "Sale") continue; // Skip - already realized through sales
          const assetIncome = as.revenueSchedule[exitIdx] ?? as.revenueSchedule[fallbackIdx] ?? 0;
          if (as.revType === "Operating") {
            exitVal += assetIncome * (project.exitMultiple ?? 10);
          } else {
            if (exitStrategySelf === "caprate") {
              const capRate = (project.exitCapRate ?? 9) / 100;
              const totalFP = assetScheds.reduce((s, a) => s + (a.footprint || 0), 0);
              const landShare = (c.landRent[exitIdx] || 0) * ((as.footprint || 0) / Math.max(1, totalFP));
              const assetNOI = assetIncome - landShare;
              exitVal += capRate > 0 ? assetNOI / capRate : 0;
            } else {
              exitVal += assetIncome * (project.exitMultiple ?? 10);
            }
          }
        }
      } else {
        const stabIncome = c.income[exitIdx] || c.income[fallbackIdx] || 0;
        const stabNOI = stabIncome - (c.landRent[exitIdx] || 0);
        if (exitStrategySelf === "caprate") {
          const capRateSelf = (project.exitCapRate ?? 9) / 100;
          exitVal = capRateSelf > 0 ? stabNOI / capRateSelf : 0;
        } else {
          exitVal = stabIncome * (project.exitMultiple ?? 10);
        }
      }
      const exitCost = exitVal * (project.exitCostPct ?? 2) / 100;
      exitProceedsSelf[exitYrSelf] = Math.max(0, exitVal - exitCost);
      selfCF[exitYrSelf] += exitProceedsSelf[exitYrSelf];
      // FIX#1: Zero out post-exit CF
      for (let y = exitYrSelf + 1; y < h; y++) selfCF[y] = 0;
    }
    const selfIRR = calcIRR(selfCF);
    return {
      mode: "self", landCapValue, devCostExclLand, devCostInclLand, totalProjectCost: devCostInclLand, capexGrantTotal,
      gpEquity: devCostInclLand, lpEquity: 0, totalEquity: devCostInclLand, gpPct: 1, lpPct: 0,
      leveredCF: selfCF, debtBalOpen: new Array(h).fill(0), debtBalClose: new Array(h).fill(0),
      debtService: new Array(h).fill(0),
      interest: new Array(h).fill(0), originalInterest: new Array(h).fill(0),
      repayment: new Array(h).fill(0), drawdown: new Array(h).fill(0),
      equityCalls: c.capex.map((v, i) => Math.max(0, v + (c.landRent[i]||0))), dscr: new Array(h).fill(null),
      totalDebt: 0, totalInterest: 0, interestSubsidyTotal: 0, interestSubsidySchedule: new Array(h).fill(0),
      upfrontFee: 0, leveredIRR: selfIRR, exitProceeds: exitProceedsSelf,
      maxDebt: 0, rate: 0, tenor: 0, grace: 0, repayYears: 0, constrEnd: constrEndSelf, repayStart: 0, exitYear: exitYrSelf + startYear,
    };
  }

  // ── Debt ──
  const isBank100 = project.finMode === "bank100";
  const rate = (project.financeRate ?? 6.5) / 100;
  const tenor = project.loanTenor ?? 7;
  const grace = project.debtGrace ?? 3;
  const repayYears = tenor - grace;
  const maxDebt = isBank100 ? devCostInclLand : (project.debtAllowed ? devCostInclLand * (project.maxLtvPct ?? 70) / 100 : 0);

  // ── Equity Structure ──
  // ZAN: upfront fee is per-draw interest cost, NOT part of project cost/equity
  const upfrontFeePct = (project.upfrontFeePct || 0) / 100;
  const totalProjectCost = devCostInclLand;
  let totalEquity = Math.max(0, totalProjectCost - maxDebt);
  let gpEquity, lpEquity;

  // GP Equity: manual > land cap value > partner equity > 50% default
  // H15: landCapTo controls who gets land cap credit (gp/lp/split)
  const landCapTarget = project.landCapTo || "gp";
  if ((project.gpEquityManual ?? 0) > 0) {
    gpEquity = Math.min(project.gpEquityManual, totalEquity);
  } else if (effectiveLandCap > 0) {
    if (landCapTarget === "gp") gpEquity = Math.min(effectiveLandCap, totalEquity);
    else if (landCapTarget === "lp") gpEquity = Math.max(0, totalEquity - effectiveLandCap);
    else gpEquity = totalEquity * 0.5; // split
  } else if (project.landType === "partner" && (project.partnerEquityPct || 0) > 0) {
    gpEquity = totalEquity * ((project.partnerEquityPct || 50) / 100);
  } else {
    gpEquity = totalEquity * 0.5;
  }

  // LP Equity: manual > remainder
  if ((project.lpEquityManual ?? 0) > 0) {
    lpEquity = Math.min(project.lpEquityManual, Math.max(0, totalEquity - gpEquity));
  } else {
    lpEquity = Math.max(0, totalEquity - gpEquity);
  }

  // Safety: if fund mode and LP = 0 and no explicit manual override, force 50/50
  if (project.finMode === "fund" && lpEquity === 0 && !(project.gpEquityManual > 0) && !(effectiveLandCap >= totalEquity)) {
    gpEquity = totalEquity * 0.5;
    lpEquity = totalEquity * 0.5;
  }

  // H6: Reconcile - GP + LP must equal totalEquity
  if (totalEquity > 0 && Math.abs((gpEquity + lpEquity) - totalEquity) > 1) {
    // If both manual, scale proportionally; otherwise adjust the non-manual one
    if ((project.gpEquityManual ?? 0) > 0 && (project.lpEquityManual ?? 0) > 0) {
      const sum = gpEquity + lpEquity;
      if (sum > 0) { gpEquity = totalEquity * (gpEquity / sum); lpEquity = totalEquity - gpEquity; }
    } else if ((project.gpEquityManual ?? 0) > 0) {
      lpEquity = Math.max(0, totalEquity - gpEquity);
    } else {
      gpEquity = Math.max(0, totalEquity - lpEquity);
    }
  }

  let gpPct = isBank100 ? 1 : (totalEquity > 0 ? gpEquity / totalEquity : 0);
  let lpPct = isBank100 ? 0 : (totalEquity > 0 ? lpEquity / totalEquity : 0);

  // ── Construction period ──
  let constrEnd = 0;
  for (let y = h - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }

  // ── Debt drawdown ──
  // FIX#2: Include cash land purchase in Y0 scheduled uses
  const scheduledUses = c.capex.map((v, i) => v + (i === 0 ? cashLandCost : 0));
  const totalScheduledUses = scheduledUses.reduce((a, b) => a + b, 0);
  const drawdown = new Array(h).fill(0);
  const equityCalls = new Array(h).fill(0);
  let totalDrawn = 0;
  // Debt ratio based on financeable uses (scheduled uses only, upfront fee is per-draw interest)
  const financeableUses = totalScheduledUses;
  const actualMaxDebt = Math.min(maxDebt, financeableUses);
  const debtRatio = totalScheduledUses > 0 ? Math.min(actualMaxDebt / totalScheduledUses, 1) : 0;

  for (let y = 0; y < h; y++) {
    if (scheduledUses[y] > 0 && totalDrawn < actualMaxDebt) {
      const draw = Math.min(scheduledUses[y] * debtRatio, actualMaxDebt - totalDrawn);
      drawdown[y] = draw;
      totalDrawn += draw;
    }
    equityCalls[y] = Math.max(0, scheduledUses[y] - drawdown[y]);
  }
  // Land capitalization value added as equity call in year 0 (non-cash but counts as equity)
  if (effectiveLandCap > 0) equityCalls[0] += effectiveLandCap;

  // ── Post-drawdown reconciliation ──
  // When actualMaxDebt < maxDebt (e.g. landCap inflates devCost beyond cash needs),
  // equity must absorb the difference to keep Sources = Uses balanced.
  if (!isBank100 && totalDrawn < maxDebt && totalProjectCost > 0) {
    const prevEquity = totalEquity;
    totalEquity = Math.max(0, totalProjectCost - totalDrawn);
    if (prevEquity > 0 && totalEquity !== prevEquity) {
      // Scale GP/LP proportionally to preserve split ratio
      const scale = totalEquity / prevEquity;
      gpEquity *= scale;
      lpEquity = totalEquity - gpEquity;
      gpPct = totalEquity > 0 ? gpEquity / totalEquity : 0;
      lpPct = totalEquity > 0 ? lpEquity / totalEquity : 0;
    }
  }

  // ── Debt balance + repayment ──
  const debtBalOpen = new Array(h).fill(0);
  const debtBalClose = new Array(h).fill(0);
  const repay = new Array(h).fill(0);
  const interest = new Array(h).fill(0);
  const debtService = new Array(h).fill(0);

  // H10: Grace basis - "firstDraw" / "cod" / "fundStart" (ZAN: from fund start year)
  const graceBasis = project.graceBasis || "cod";
  let graceStartIdx = constrEnd; // default: COD
  if (graceBasis === "fundStart") {
    // ZAN method: grace counts from fund start year
    const fundStartYr = (project.fundStartYear || 0) > 0 ? project.fundStartYear - startYear : Math.max(0, constrEnd - 3);
    graceStartIdx = fundStartYr;
  } else if (graceBasis === "firstDraw") {
    for (let y = 0; y < h; y++) { if (drawdown[y] > 0) { graceStartIdx = y; break; } }
  } else if (project.debtGraceStartYear > 0) {
    graceStartIdx = Math.max(0, project.debtGraceStartYear - startYear);
  }
  // else: graceStartIdx = constrEnd (COD default)
  const repayStart = graceStartIdx + grace;

  // ── Tranche mode: 'single' (default/ZAN) vs 'perDraw' (each drawdown = independent loan) ──
  const trancheMode = project.debtTrancheMode || "single";
  let tranches = null; // Only populated for perDraw mode (for reporting)

  if (trancheMode === "perDraw" && repayYears > 0) {
    // ═══ PER-DRAW TRANCHE MODE ═══
    // Each drawdown becomes an independent loan with its own grace + repayment schedule.
    // Grace starts from the draw year (each tranche's own disbursement date).
    // This matches Saudi bank practice where each facility disbursement starts its own clock.
    tranches = [];
    for (let y = 0; y < h; y++) {
      if (drawdown[y] > 0) {
        tranches.push({
          drawYear: y,
          amount: drawdown[y],
          repayStart: y + grace,
          annualRepay: drawdown[y] / repayYears,
          balOpen: new Array(h).fill(0),
          balClose: new Array(h).fill(0),
          repay: new Array(h).fill(0),
          interest: new Array(h).fill(0),
        });
      }
    }

    // Compute each tranche independently
    for (const tr of tranches) {
      for (let y = 0; y < h; y++) {
        tr.balOpen[y] = y === 0 ? 0 : tr.balClose[y - 1];
        let bal = tr.balOpen[y] + (y === tr.drawYear ? tr.amount : 0);

        if (y >= tr.repayStart && bal > 0 && project.repaymentType === "amortizing") {
          tr.repay[y] = Math.min(tr.annualRepay, bal);
        } else if (project.repaymentType === "bullet") {
          const bulletYear = tr.repayStart + repayYears - 1;
          if (y === bulletYear && bal > 0) tr.repay[y] = bal;
        }

        tr.balClose[y] = bal - tr.repay[y];
        // Interest: average balance × rate + upfront fee on draw year
        tr.interest[y] = (tr.balOpen[y] + tr.balClose[y]) / 2 * rate
          + (y === tr.drawYear ? tr.amount * upfrontFeePct : 0);
        if (tr.interest[y] < 0) tr.interest[y] = 0;
      }
    }

    // Aggregate all tranches
    for (let y = 0; y < h; y++) {
      for (const tr of tranches) {
        debtBalOpen[y] += tr.balOpen[y];
        debtBalClose[y] += tr.balClose[y];
        repay[y] += tr.repay[y];
        interest[y] += tr.interest[y];
      }
      debtService[y] = repay[y] + interest[y];
    }
  } else {
    // ═══ SINGLE BLOCK MODE (default, matches ZAN) ═══
    const annualRepay = repayYears > 0 ? totalDrawn / repayYears : 0;

    for (let y = 0; y < h; y++) {
      debtBalOpen[y] = y === 0 ? 0 : debtBalClose[y - 1];
      let bal = debtBalOpen[y] + drawdown[y];
      if (y >= repayStart && bal > 0 && project.repaymentType === "amortizing") {
        repay[y] = Math.min(annualRepay, bal);
      } else if (project.repaymentType === "bullet" && y === repayStart + repayYears - 1 && bal > 0) {
        repay[y] = bal;
      }
      debtBalClose[y] = bal - repay[y];
      // ZAN interest: average of opening and closing balance × rate + per-draw upfront fee
      interest[y] = (debtBalOpen[y] + debtBalClose[y]) / 2 * rate + drawdown[y] * upfrontFeePct;
      if (interest[y] < 0) interest[y] = 0;
      debtService[y] = repay[y] + interest[y];
    }
  }

  // Total upfront fee = sum of per-draw fees (for reporting)
  const upfrontFee = drawdown.reduce((s, d) => s + d * upfrontFeePct, 0);

  // ── Exit ──
  const exitProceeds = new Array(h).fill(0);
  const exitStrategy = project.exitStrategy || "sale";
  const exitYr = exitStrategy === "hold" ? h - 1 : ((project.exitYear || 0) > 0 ? project.exitYear - startYear : constrEnd + grace + 2);

  if (exitStrategy !== "hold" && exitYr >= 0 && exitYr < h) {
    // H8: Per-component exit valuation
    let exitVal = 0;
    const exitIdx = Math.min(exitYr, h - 1);
    const fallbackIdx = Math.min(constrEnd + 2, h - 1);
    const assetScheds = projectResults.assetSchedules || [];
    if (assetScheds.length > 0) {
      for (const as of assetScheds) {
        const assetIncome = as.revenueSchedule[exitIdx] ?? as.revenueSchedule[fallbackIdx] ?? 0;
        if (as.revType === "Operating") {
          // Operating: EBITDA × multiple
          exitVal += assetIncome * (project.exitMultiple ?? 10);
        } else if (as.revType === "Sale") {
          // Sale: remaining unsold value (skip - already realized through sales)
        } else {
          // Lease: income contributes to NOI-based valuation
          if (exitStrategy === "caprate") {
            const capRate = (project.exitCapRate ?? 9) / 100;
            const landShare = (c.landRent[exitIdx] || 0) * ((as.footprint || 0) / Math.max(1, assetScheds.reduce((s,a)=>s+(a.footprint||0),0)));
            const assetNOI = assetIncome - landShare;
            exitVal += capRate > 0 ? assetNOI / capRate : 0;
          } else {
            exitVal += assetIncome * (project.exitMultiple ?? 10);
          }
        }
      }
    } else {
      // Fallback: old method if no asset schedules
      const stabIncome = c.income[exitIdx] || c.income[fallbackIdx] || 0;
      const stabNOI = stabIncome - (c.landRent[exitIdx] || 0);
      if (exitStrategy === "caprate") {
        const capRate = (project.exitCapRate ?? 9) / 100;
        exitVal = capRate > 0 ? stabNOI / capRate : 0;
      } else {
        exitVal = stabIncome * (project.exitMultiple ?? 10);
      }
    }
    const exitCost = exitVal * (project.exitCostPct ?? 2) / 100;
    // ZAN: Exit proceeds are GROSS (not net of debt)
    // Debt is repaid through normal schedule. If exit before maturity,
    // remaining debt is paid off as balloon repayment in exit year.
    exitProceeds[exitYr] = Math.max(0, exitVal - exitCost);
  }

  // Determine if project was sold (not hold)
  const sold = exitStrategy !== "hold" && exitYr >= 0 && exitYr < h;
  // If exit before debt maturity: force balloon repayment of remaining balance
  if (sold && debtBalClose[exitYr] > 0) {
    const remainingDebt = debtBalClose[exitYr];
    repay[exitYr] += remainingDebt;
    debtBalClose[exitYr] = 0;
    debtService[exitYr] = repay[exitYr] + interest[exitYr];
  }
  // Zero out post-exit debt schedule
  if (sold) {
    for (let y = exitYr + 1; y < h; y++) {
      drawdown[y] = 0;
      repay[y] = 0;
      interest[y] = 0;
      debtBalOpen[y] = 0;
      debtBalClose[y] = 0;
      debtService[y] = 0;
    }
    // Also clean up individual tranches post-exit (for reporting)
    if (tranches) {
      for (const tr of tranches) {
        for (let y = exitYr + 1; y < h; y++) {
          tr.balOpen[y] = 0; tr.balClose[y] = 0; tr.repay[y] = 0; tr.interest[y] = 0;
        }
      }
    }
  }

  // ── Apply interest subsidy ──
  const intSub = applyInterestSubsidy(project, interest, constrEnd, totalDrawn, rate);
  const adjustedInterest = intSub.adjusted;
  const adjustedDebtService = new Array(h).fill(0);
  for (let y = 0; y < h; y++) adjustedDebtService[y] = repay[y] + adjustedInterest[y];

  // ── Levered CF (with incentives) ──
  // landRent is positive (cost amount), income is positive (revenue)
  const adjustedLandRent = ir?.adjustedLandRent || c.landRent;
  const leveredCF = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    if (sold && y > exitYr) { leveredCF[y] = 0; continue; }
    leveredCF[y] = c.income[y] - adjustedLandRent[y] - c.capex[y]
      + (ir?.capexGrantSchedule?.[y] || 0) + (ir?.feeRebateSchedule?.[y] || 0)
      - adjustedDebtService[y] + drawdown[y] + exitProceeds[y];
  }

  // ── DSCR (using adjusted interest) ──
  // NOTE: DSCR uses (Income - Land Rent) as proxy for NOI/CFADS.
  // For lender-grade models, replace with actual NOI after opex deduction per asset.
  const dscr = new Array(h).fill(null);
  for (let y = 0; y < h; y++) {
    if (adjustedDebtService[y] > 0) { dscr[y] = (c.income[y] - adjustedLandRent[y]) / adjustedDebtService[y]; }
  }

  return {
    mode: project.finMode, landCapValue, devCostExclLand, devCostInclLand, totalProjectCost, capexGrantTotal,
    gpEquity, lpEquity, totalEquity, gpPct, lpPct,
    drawdown, equityCalls, debtBalOpen, debtBalClose,
    repayment: repay, interest: adjustedInterest, originalInterest: interest,
    debtService: adjustedDebtService, leveredCF, dscr, exitProceeds,
    totalDebt: totalDrawn, totalInterest: adjustedInterest.reduce((a, b) => a + b, 0),
    interestSubsidyTotal: intSub.total, interestSubsidySchedule: intSub.savings,
    upfrontFee, maxDebt, rate, tenor, grace, repayYears, graceStartIdx,
    leveredIRR: calcIRR(leveredCF), constrEnd, repayStart, exitYear: exitYr + startYear,
    trancheMode, tranches,
  };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: WATERFALL ENGINE
// ═══════════════════════════════════════════════════════════════
function computeWaterfall(project, projectResults, financing, incentivesResult) {
  if (!project || !projectResults || !financing) return null;
  if (project.finMode === "self" || project.finMode === "bank100") return null;
  const h = project.horizon || 50;
  const sy = project.startYear || 2026;
  const c = projectResults.consolidated;
  const f = financing;

  // Use equity from financing engine
  const gpEquity = f.gpEquity;
  const lpEquity = f.lpEquity;
  const totalEquity = f.totalEquity;
  const gpPct = f.gpPct;
  const lpPct = f.lpPct;
  const isFund = project.finMode === "fund" || project.vehicleType === "fund";

  // Fee calculations (only Fund type gets full fees)
  const subFee = isFund ? totalEquity * (project.subscriptionFeePct || 0) / 100 : 0;
  const devFeeTotal = c.totalCapex * (project.developerFeePct || 0) / 100;
  let structFee = isFund ? totalEquity * (project.structuringFeePct || 0) / 100 : 0;
  const structFeeCap = project.structuringFeeCap || 0;
  if (structFeeCap > 0 && structFee > structFeeCap) structFee = structFeeCap;
  const mgmtFeeBase = project.mgmtFeeBase || "nav";
  const mgmtFeeRate = (project.annualMgmtFeePct || 0) / 100;
  const mgmtFeeCap = project.mgmtFeeCapAnnual || 0;
  const annualCustody = isFund ? (project.custodyFeeAnnual || 0) : 0;
  const preEstFee = isFund ? (project.preEstablishmentFee || 0) : 0;
  const spvSetupFee = isFund ? (project.spvFee || 0) : 0;
  const auditorAnnual = isFund ? (project.auditorFeeAnnual || 0) : 0;

  // Fee schedule
  const fees = new Array(h).fill(0);
  const feeSub = new Array(h).fill(0);
  const feeMgmt = new Array(h).fill(0);
  const feeCustody = new Array(h).fill(0);
  const feeDev = new Array(h).fill(0);
  const feeStruct = new Array(h).fill(0);
  const feePreEst = new Array(h).fill(0);
  const feeSpv = new Array(h).fill(0);
  const feeAuditor = new Array(h).fill(0);

  // Find construction period
  let constrStart = h, constrEnd = 0;
  for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { constrStart = Math.min(constrStart, y); constrEnd = Math.max(constrEnd, y); } }

  // Fund start year: user input or auto (1 year before construction)
  const fundStartIdx = (project.fundStartYear || 0) > 0 ? project.fundStartYear - sy : Math.max(0, constrStart - 1);

  // Exit year
  const exitStrategy = project.exitStrategy || "sale";
  const exitYr = exitStrategy === "hold" ? h - 1 : ((project.exitYear || 0) > 0 ? project.exitYear - sy : constrEnd + (project.debtGrace ?? 3) + 2);
  const operYears = exitYr - constrStart + 1;

  // Fee period end
  const feeEndYr = exitStrategy === "hold"
    ? constrEnd + (project.debtGrace ?? 3) + 2
    : exitYr;

  // One-time fees at fund start
  if (fundStartIdx < h) {
    feeSub[fundStartIdx] = subFee;
    feeStruct[fundStartIdx] = structFee;
    feePreEst[fundStartIdx] = preEstFee;
    feeSpv[fundStartIdx] = spvSetupFee;
  }
  // Developer fee spread over construction
  for (let y = constrStart; y <= constrEnd && y < h; y++) {
    if (c.totalCapex > 0) feeDev[y] = devFeeTotal * (c.capex[y] / c.totalCapex);
  }
  // Management + custody + auditor fees from fund start to fee period end
  // NAV = totalEquity - cumCapex + cumIncome (simplified NAV proxy)
  let cumCapex = 0, cumIncome = 0;
  for (let y = fundStartIdx; y <= feeEndYr && y < h; y++) {
    cumCapex += Math.abs(c.capex[y] || 0);
    cumIncome += (c.income[y] || 0);
    if (isFund) {
      let mgmtBase = 0;
      if (mgmtFeeBase === "equity") {
        mgmtBase = totalEquity;
      } else if (mgmtFeeBase === "devCost") {
        mgmtBase = f.devCostInclLand;
      } else if (mgmtFeeBase === "nav") {
        // NAV proxy: equity + cumulative net income - cumulative capex (floor at equity)
        mgmtBase = Math.max(totalEquity, totalEquity + cumIncome - cumCapex);
      } else {
        // "deployed": cumulative CAPEX deployed
        mgmtBase = cumCapex;
      }
      feeMgmt[y] = mgmtBase * mgmtFeeRate;
      if (mgmtFeeCap > 0 && feeMgmt[y] > mgmtFeeCap) feeMgmt[y] = mgmtFeeCap;
    }
    feeCustody[y] = annualCustody;
    feeAuditor[y] = auditorAnnual;
  }
  for (let y = 0; y < h; y++) fees[y] = feeSub[y] + feeMgmt[y] + feeCustody[y] + feeDev[y] + feeStruct[y] + feePreEst[y] + feeSpv[y] + feeAuditor[y];

  const totalFees = fees.reduce((a, b) => a + b, 0);

  // ── ZAN: Unfunded Fees ──
  // Fees that operating CF cannot cover → must be funded from equity
  // ZAN: UnfundedFees[y] = MAX(0, Fees[y] - MAX(0, UnlevCF[y] + DS[y] + Exit[y]))
  // In ZAN: DS is negative. In our code: DS is positive → subtract.
  // UnlevCF = c.netCF = income - landRent - capex
  const unfundedFees = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    if (fees[y] > 0) {
      const operatingCF = c.netCF[y] - (f.debtService[y] || 0) + (f.exitProceeds?.[y] || 0);
      unfundedFees[y] = Math.max(0, fees[y] - Math.max(0, operatingCF));
    }
  }

  // H14: Fee treatment policy
  // "capital" = fees count as invested capital (earn ROC + Pref) - default, current behavior
  // "expense" = fees are expenses (outside capital base - don't earn Pref, smaller unreturned capital)
  const feeTreatment = project.feeTreatment || "capital";
  // ZAN Equity Calls: (CAPEX_yr / Total_CAPEX) × TotalEquity + UnfundedFees
  const equityCalls = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    // Base: equity pro-rata to CAPEX spending
    const capexPortion = c.totalCapex > 0 && c.capex[y] > 0 ? (c.capex[y] / c.totalCapex) * totalEquity : 0;
    // Add unfunded fees (fees not covered by operating CF)
    equityCalls[y] = capexPortion + unfundedFees[y];
  }

  // Exit proceeds - use from financing engine (already net of debt)
  const exitProceeds = [...(f.exitProceeds || new Array(h).fill(0))];

  // Cash available for distribution - ZAN formula:
  // cashAvail[y] = MAX(0, IF(yr in [fundStart..exit], UnlevCF, 0) + DS - Fees + UF + Exit)
  // UnlevCF = c.netCF = income - landRent - CAPEX (already includes CAPEX, unlike NOI-only)
  // DS is positive in our code → subtract. Fees positive → subtract. UF positive → add back.
  const ir = incentivesResult;
  const adjLandRent = ir?.adjustedLandRent || c.landRent;
  // Land rent payer resolution (platform-specific, not in ZAN)
  const lrPaidByRaw = project.landRentPaidBy || "auto";
  let resolvedLandRentPayer = lrPaidByRaw;
  if (lrPaidByRaw === "auto" && project.landCapitalize) {
    resolvedLandRentPayer = project.landCapTo || "gp";
  } else if (lrPaidByRaw === "auto" || lrPaidByRaw === "developer") {
    resolvedLandRentPayer = "project";
  }
  const gpPaysLandRent = resolvedLandRentPayer === "gp" || resolvedLandRentPayer === "split";
  const lpPaysLandRent = resolvedLandRentPayer === "lp" || resolvedLandRentPayer === "split";
  const gpLandRentObligation = new Array(h).fill(0);
  const lpLandRentObligation = new Array(h).fill(0);
  const cashAvail = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    // Track GP/LP land rent obligations (platform feature)
    if (gpPaysLandRent && resolvedLandRentPayer === "gp") {
      gpLandRentObligation[y] = adjLandRent[y];
    } else if (lpPaysLandRent && resolvedLandRentPayer === "lp") {
      lpLandRentObligation[y] = adjLandRent[y];
    } else if (resolvedLandRentPayer === "split") {
      gpLandRentObligation[y] = adjLandRent[y] * gpPct;
      lpLandRentObligation[y] = adjLandRent[y] * lpPct;
    }
    // ZAN Cash Available: MAX(0, UnlevCF - DS - Fees + UF + Exit)
    // Use incentive-adjusted CF if available
    const unlevCF = ir?.adjustedNetCF?.[y] ?? c.netCF[y];
    const inPeriod = y >= fundStartIdx && y <= exitYr;
    cashAvail[y] = Math.max(0,
      (inPeriod ? unlevCF : 0)
      - (f.debtService[y] || 0)
      - fees[y]
      + unfundedFees[y]
      + exitProceeds[y]
    );
  }

  // 4-tier waterfall
  const prefRate = (project.prefReturnPct ?? 15) / 100;
  const carryPct = Math.min(0.9999, Math.max(0, (project.carryPct ?? 30) / 100));
  const lpSplitPct = (project.lpProfitSplitPct ?? 70) / 100;
  const gpSplitPct = 1 - lpSplitPct;

  const tier1 = new Array(h).fill(0); // Return of Capital
  const tier2 = new Array(h).fill(0); // Preferred Return
  const tier3 = new Array(h).fill(0); // GP Catch-up
  const tier4LP = new Array(h).fill(0); // Profit Split LP
  const tier4GP = new Array(h).fill(0); // Profit Split GP
  const lpDist = new Array(h).fill(0);
  const gpDist = new Array(h).fill(0);
  const unreturnedOpen = new Array(h).fill(0);
  const unreturnedClose = new Array(h).fill(0);
  const prefAccrual = new Array(h).fill(0);
  const prefAccumulated = new Array(h).fill(0);

  // Waterfall convention settings
  const prefAlloc = project.prefAllocation || "proRata";   // proRata (ZAN) / lpOnly
  const catchMethod = project.catchupMethod || "perYear";  // perYear (ZAN) / cumulative

  let cumEquityCalled = 0;
  let cumReturned = 0;
  let cumPrefPaid = 0;
  let cumPrefAccrued = 0;
  let cumGPCatchup = 0; // C5: Track cumulative GP catch-up
  let cumFeesCalled = 0; // H14: Track fee portion of equity calls

  for (let y = 0; y < h; y++) {
    cumEquityCalled += equityCalls[y];
    cumFeesCalled += unfundedFees[y]; // Track cumulative fees funded from equity

    // H14: Fee Treatment - 3 modes:
    // "capital"  (ZAN default): fees in ROC + Pref (full invested capital)
    // "rocOnly": fees in ROC (returned to LP) but NO Pref calculated on them
    // "expense": fees excluded from ROC and Pref (gone, not returned)
    const rocBase = feeTreatment === "expense"
      ? cumEquityCalled - cumFeesCalled  // Exclude fees from ROC
      : cumEquityCalled;                 // Include fees in ROC (capital + rocOnly)
    const prefBase = (feeTreatment === "expense" || feeTreatment === "rocOnly")
      ? cumEquityCalled - cumFeesCalled  // Exclude fees from Pref base
      : cumEquityCalled;                 // Include fees in Pref (capital only)

    const unreturned = rocBase - cumReturned;
    unreturnedOpen[y] = unreturned;

    // Pref accrual on pref-eligible capital (may differ from ROC base)
    const prefEligible = Math.max(0, prefBase - cumReturned);
    const yearPref = prefEligible * prefRate;
    cumPrefAccrued += yearPref;
    prefAccrual[y] = yearPref;
    prefAccumulated[y] = cumPrefAccrued - cumPrefPaid;

    let remaining = cashAvail[y];
    if (remaining <= 0) {
      unreturnedClose[y] = unreturned;
      continue;
    }

    // Tier 1: Return of Capital
    if (unreturned > 0 && remaining > 0) {
      const t1 = Math.min(remaining, unreturned);
      tier1[y] = t1;
      remaining -= t1;
      cumReturned += t1;
    }

    // Tier 2: Preferred Return (pay accrued pref)
    const prefOwed = cumPrefAccrued - cumPrefPaid;
    if (prefOwed > 0 && remaining > 0) {
      const t2 = Math.min(remaining, prefOwed);
      tier2[y] = t2;
      remaining -= t2;
      cumPrefPaid += t2;
    }

    // C5: Tier 3: GP Catch-up
    // Convention: waterfallConvention controls T3 + distribution allocation
    // - prefAllocation: "proRata" (GP gets GP% of T2 as investor) / "lpOnly" (T2 all to LP)
    // - catchupMethod: "perYear" (ZAN: based on this year's T2) / "cumulative" (tracked across years)

    if (project.gpCatchup && remaining > 0 && carryPct > 0) {
      if (catchMethod === "perYear") {
        // ZAN method: T3 = MIN(remaining, T2_thisYear × carry/(1-carry))
        // Simple per-year formula. No cumulative tracking. No GP offset.
        const catchup = Math.min(remaining, tier2[y] * carryPct / (1 - carryPct));
        tier3[y] = catchup;
        remaining -= catchup;
      } else {
        // Cumulative method: track GP's pref participation and offset
        const gpProfitFromPref = prefAlloc === "proRata" ? cumPrefPaid * gpPct : 0;
        const targetCatchupOnly = Math.max(0, (carryPct * cumPrefPaid - gpProfitFromPref) / (1 - carryPct));
        const catchupNeeded = Math.max(0, targetCatchupOnly - cumGPCatchup);
        const catchup = Math.min(remaining, catchupNeeded);
        tier3[y] = catchup;
        remaining -= catchup;
        cumGPCatchup += catchup;
      }
    }

    // Tier 4: Profit Split
    if (remaining > 0) {
      tier4LP[y] = remaining * lpSplitPct;
      tier4GP[y] = remaining * gpSplitPct;
      remaining = 0;
    }

    // Allocate distributions based on prefAllocation convention
    // proRata: T1 + T2 split by GP%/LP%. GP wears two hats (investor + manager).
    // lpOnly: T1 pro-rata, T2 100% to LP. GP compensated only via T3 + T4.
    if (prefAlloc === "lpOnly") {
      lpDist[y] = tier1[y] * lpPct + tier2[y] + tier4LP[y];
      gpDist[y] = tier1[y] * gpPct + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);
    } else {
      // proRata (ZAN default): GP gets investor share of T1 + T2
      lpDist[y] = (tier1[y] + tier2[y]) * lpPct + tier4LP[y];
      gpDist[y] = (tier1[y] + tier2[y]) * gpPct + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);
    }

    unreturnedClose[y] = rocBase - cumReturned;
  }

  // LP Net Cash Flow: -equity calls (LP share) + distributions - land rent obligation
  const lpNetCF = new Array(h).fill(0);
  const gpNetCF = new Array(h).fill(0);
  const gpLandRentTotal = gpLandRentObligation.reduce((a,b) => a+b, 0);
  const lpLandRentTotal = lpLandRentObligation.reduce((a,b) => a+b, 0);
  for (let y = 0; y < h; y++) {
    lpNetCF[y] = -equityCalls[y] * lpPct + lpDist[y] - lpLandRentObligation[y];
    gpNetCF[y] = -equityCalls[y] * gpPct + gpDist[y] - gpLandRentObligation[y];
  }

  const lpIRR = calcIRR(lpNetCF);
  const gpIRR = calcIRR(gpNetCF);
  const projIRR = c.irr;
  // MOIC: Total Distributions / Paid-In Capital (industry standard default)
  // Paid-In = actual equity calls × share (cash actually transferred)
  // Committed MOIC = Distributions / Original Equity (secondary metric)
  const lpTotalDist = lpDist.reduce((a, b) => a + b, 0);
  const gpTotalDist = gpDist.reduce((a, b) => a + b, 0);
  const lpNetDist = lpTotalDist - lpLandRentTotal;
  const gpNetDist = gpTotalDist - gpLandRentTotal;
  const lpTotalCalled = equityCalls.reduce((a, b) => a + b, 0) * lpPct;
  const gpTotalCalled = equityCalls.reduce((a, b) => a + b, 0) * gpPct;
  // Default MOIC = Paid-In basis (actual cash contributed)
  const lpMOIC = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpMOIC = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;
  // Committed MOIC = Original equity commitment basis (secondary)
  const lpCommittedMOIC = lpEquity > 0 ? lpNetDist / lpEquity : 0;
  const gpCommittedMOIC = gpEquity > 0 ? gpNetDist / gpEquity : 0;
  // H13: DPI = Total Distributions / Total Equity Called (same as paid-in MOIC for net dist)
  const lpDPI = lpTotalCalled > 0 ? lpNetDist / lpTotalCalled : 0;
  const gpDPI = gpTotalCalled > 0 ? gpNetDist / gpTotalCalled : 0;

  // NPV - Full 3x3 matrix
  const lpNPV10 = calcNPV(lpNetCF, 0.10);
  const lpNPV12 = calcNPV(lpNetCF, 0.12);
  const lpNPV14 = calcNPV(lpNetCF, 0.14);
  const gpNPV10 = calcNPV(gpNetCF, 0.10);
  const gpNPV12 = calcNPV(gpNetCF, 0.12);
  const gpNPV14 = calcNPV(gpNetCF, 0.14);
  const projNPV10 = calcNPV(c.netCF, 0.10);
  const projNPV12 = calcNPV(c.netCF, 0.12);
  const projNPV14 = calcNPV(c.netCF, 0.14);

  return {
    gpEquity, lpEquity, totalEquity, gpPct, lpPct,
    fees, feeSub, feeMgmt, feeCustody, feeDev, feeStruct, feePreEst, feeSpv, feeAuditor, totalFees, unfundedFees,
    equityCalls, exitProceeds, cashAvail,
    tier1, tier2, tier3, tier4LP, tier4GP,
    lpDist, gpDist, lpNetCF, gpNetCF,
    unreturnedOpen, unreturnedClose, prefAccrual, prefAccumulated,
    lpIRR, gpIRR, projIRR, lpMOIC, gpMOIC, lpCommittedMOIC, gpCommittedMOIC, lpDPI, gpDPI,
    lpTotalInvested: lpTotalCalled, gpTotalInvested: gpTotalCalled, // aliases for UI backward compat
    lpTotalDist, gpTotalDist, lpNetDist, gpNetDist, lpTotalCalled, gpTotalCalled,
    gpLandRentObligation, gpLandRentTotal, lpLandRentObligation, lpLandRentTotal,
    gpPaysLandRent, lpPaysLandRent, resolvedLandRentPayer,
    lpNPV10, lpNPV12, lpNPV14, gpNPV10, gpNPV12, gpNPV14,
    projNPV10, projNPV12, projNPV14, isFund,
    prefAllocation: prefAlloc, catchupMethod: catchMethod,
    exitYear: exitYr + sy,
  };
}

// ═══════════════════════════════════════════════════════════════
// PER-PHASE WATERFALL (runs waterfall for each phase independently)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PHASE 3.5: PER-PHASE INDEPENDENT FINANCING & WATERFALL
// ═══════════════════════════════════════════════════════════════

// All financing fields that can be set per-phase
const FINANCING_FIELDS = [
  'finMode','vehicleType','debtAllowed','maxLtvPct','financeRate',
  'loanTenor','debtGrace','graceBasis','upfrontFeePct','repaymentType','debtTrancheMode',
  'islamicMode','gpEquityManual','lpEquityManual',
  'exitStrategy','exitYear','exitCapRate','exitMultiple','exitCostPct',
  'prefReturnPct','gpCatchup','carryPct','lpProfitSplitPct',
  'feeTreatment','prefAllocation','catchupMethod','subscriptionFeePct','annualMgmtFeePct','mgmtFeeCapAnnual','custodyFeeAnnual',
  'developerFeePct','structuringFeePct','structuringFeeCap','mgmtFeeBase',
  'preEstablishmentFee','spvFee','auditorFeeAnnual',
  'fundStartYear','fundName','gpIsFundManager','landCapitalize','landCapRate','landCapTo','landRentPaidBy',
];

/** Get financing settings for a specific phase. Falls back to project-level. */
function getPhaseFinancing(project, phaseName) {
  const phase = (project.phases || []).find(p => p.name === phaseName);
  // Always start with project-level defaults as base
  const base = {};
  FINANCING_FIELDS.forEach(f => { if (project[f] !== undefined) base[f] = project[f]; });
  // Overlay phase-specific settings (if any)
  return { ...base, ...(phase?.financing || {}) };
}

/** Check if project has per-phase financing enabled */
function hasPerPhaseFinancing(project) {
  return (project.phases || []).some(p => p.financing);
}

/** Migrate project: copy project-level settings to each phase */
function migrateToPerPhaseFinancing(project) {
  if (!project.phases || project.phases.length === 0) return project;
  if (hasPerPhaseFinancing(project)) return project; // Already migrated
  const settings = {};
  FINANCING_FIELDS.forEach(f => { if (project[f] !== undefined) settings[f] = project[f]; });
  return {
    ...project,
    phases: project.phases.map(p => ({ ...p, financing: { ...settings } })),
  };
}

/** FIX#4: Allocate consolidated incentives to a single phase */
function buildPhaseIncentives(projectResults, incentivesResult, phaseName) {
  if (!incentivesResult) return null;
  const pr = projectResults.phaseResults[phaseName];
  const c = projectResults.consolidated;
  if (!pr) return null;

  const capexShare = c.totalCapex > 0 ? pr.totalCapex / c.totalCapex : 0;
  const landShare = c.totalLandRent > 0 ? pr.totalLandRent / c.totalLandRent : pr.allocPct || 0;

  const h = incentivesResult.capexGrantSchedule.length;
  const pIr = {
    ...incentivesResult,
    capexGrantTotal: incentivesResult.capexGrantTotal * capexShare,
    capexGrantSchedule: incentivesResult.capexGrantSchedule.map(v => v * capexShare),
    feeRebateTotal: incentivesResult.feeRebateTotal * capexShare,
    feeRebateSchedule: incentivesResult.feeRebateSchedule.map(v => v * capexShare),
    landRentSavingTotal: incentivesResult.landRentSavingTotal * landShare,
    landRentSavingSchedule: incentivesResult.landRentSavingSchedule.map(v => v * landShare),
    adjustedLandRent: pr.landRent.map(
      (lr, y) => Math.max(0, lr - (incentivesResult.landRentSavingSchedule[y] || 0) * landShare)
    ),
    adjustedCapex: pr.capex.map(
      (cx, y) => Math.max(0, cx - (incentivesResult.capexGrantSchedule[y] || 0) * capexShare)
    ),
    adjustedNetCF: pr.netCF.map(
      (cf, y) => cf + (incentivesResult.capexGrantSchedule[y] || 0) * capexShare
        + (incentivesResult.landRentSavingSchedule[y] || 0) * landShare
        + (incentivesResult.feeRebateSchedule[y] || 0) * capexShare
    ),
  };
  return pIr;
}

/** Build a virtual project for a single phase (uses phase financing + phase land allocation) */
function buildPhaseVirtualProject(project, phaseName, phaseResult) {
  const pf = getPhaseFinancing(project, phaseName);
  const allocPct = phaseResult.allocPct || 0;

  return {
    ...project,
    ...pf, // Phase financing settings override project-level
    _isPhaseVirtual: true,
    _phaseName: phaseName,
    // Land: allocate proportionally by footprint
    landArea: (project.landArea || 0) * allocPct,
    // FIX#5: Allocate one-time land economics by phase
    landPurchasePrice: (project.landPurchasePrice || 0) * allocPct,
    landValuation: (project.landValuation || 0) * allocPct,
    landCapRate: project.landCapRate || 1000,
    // Keep land type and other land settings from project
    landRentAnnual: project.landRentAnnual, // Not used directly - comes from phaseResults
    // Override phases to prevent recursion
    phases: project.phases,
  };
}

/** Build synthetic projectResults where "consolidated" = phase data */
function buildPhaseProjectResults(projectResults, phaseName) {
  const pr = projectResults.phaseResults[phaseName];
  if (!pr) return null;
  return {
    ...projectResults,
    consolidated: {
      income: pr.income,
      capex: pr.capex,
      landRent: pr.landRent,
      netCF: pr.netCF,
      totalCapex: pr.totalCapex,
      totalIncome: pr.totalIncome,
      totalLandRent: pr.totalLandRent,
      totalNetCF: pr.totalNetCF,
      irr: pr.irr,
      npv10: calcNPV(pr.netCF, 0.10),
      npv12: calcNPV(pr.netCF, 0.12),
      npv14: calcNPV(pr.netCF, 0.14),
    },
    assetSchedules: projectResults.assetSchedules.filter(a => (a.phase || "Unphased") === phaseName),
  };
}

/** Aggregate per-phase financing results into consolidated view */
function aggregatePhaseFinancings(phaseFinancings, h) {
  const names = Object.keys(phaseFinancings);
  if (names.length === 0) return null;
  const sum = (field) => names.reduce((s, n) => {
    const v = phaseFinancings[n]?.[field];
    return s + (typeof v === 'number' ? v : 0);
  }, 0);
  const sumArr = (field) => {
    const arr = new Array(h).fill(0);
    names.forEach(n => { const a = phaseFinancings[n]?.[field]; if (a) for (let y = 0; y < h; y++) arr[y] += (a[y] || 0); });
    return arr;
  };
  const levCF = sumArr('leveredCF');
  return {
    mode: 'independent',
    totalEquity: sum('totalEquity'), gpEquity: sum('gpEquity'), lpEquity: sum('lpEquity'),
    gpPct: sum('totalEquity') > 0 ? sum('gpEquity') / sum('totalEquity') : 0,
    lpPct: sum('totalEquity') > 0 ? sum('lpEquity') / sum('totalEquity') : 0,
    devCostExclLand: sum('devCostExclLand'), devCostInclLand: sum('devCostInclLand'),
    maxDebt: sum('maxDebt'), totalDebt: sum('totalDebt'),
    landCapValue: sum('landCapValue'), capexGrantTotal: sum('capexGrantTotal'),
    drawdown: sumArr('drawdown'), equityCalls: sumArr('equityCalls'),
    debtBalOpen: sumArr('debtBalOpen'), debtBalClose: sumArr('debtBalClose'),
    repayment: sumArr('repayment'), interest: sumArr('interest'),
    originalInterest: sumArr('originalInterest'),
    debtService: sumArr('debtService'), leveredCF: levCF,
    dscr: (() => { const ds = sumArr('debtService'); const noi = new Array(h).fill(0); names.forEach(n => { const pf = phaseFinancings[n]; if (!pf) return; for (let y = 0; y < h; y++) { if (pf.dscr && pf.dscr[y] !== null && pf.debtService[y] > 0) noi[y] += pf.dscr[y] * pf.debtService[y]; } }); return ds.map((d, y) => d > 0 ? noi[y] / d : null); })(),
    exitProceeds: sumArr('exitProceeds'),
    upfrontFee: sum('upfrontFee'),
    totalInterest: sum('totalInterest'),
    interestSubsidyTotal: sum('interestSubsidyTotal'),
    interestSubsidySchedule: sumArr('interestSubsidySchedule'),
    leveredIRR: calcIRR(levCF),
    constrEnd: Math.max(...names.map(n => phaseFinancings[n]?.constrEnd || 0)),
    rate: 0, tenor: 0, grace: 0, repayYears: 0, repayStart: 0,
    exitYear: Math.max(...names.map(n => phaseFinancings[n]?.exitYear || 0)),
  };
}

/** Aggregate per-phase waterfall results into consolidated view */
function aggregatePhaseWaterfalls(phaseWaterfalls, phaseFinancings, h) {
  const names = Object.keys(phaseWaterfalls);
  if (names.length === 0) return null;
  const sumArr = (field) => {
    const arr = new Array(h).fill(0);
    names.forEach(n => { const a = phaseWaterfalls[n]?.[field]; if (a) for (let y = 0; y < h; y++) arr[y] += (a[y] || 0); });
    return arr;
  };
  const sum = (field) => names.reduce((s, n) => s + (phaseWaterfalls[n]?.[field] || 0), 0);

  const lpNetCF = sumArr('lpNetCF');
  const gpNetCF = sumArr('gpNetCF');
  const totalEquity = Object.keys(phaseFinancings).reduce((s, n) => s + (phaseFinancings[n]?.totalEquity || 0), 0);
  const gpEquity = Object.keys(phaseFinancings).reduce((s, n) => s + (phaseFinancings[n]?.gpEquity || 0), 0);
  const lpEquity = Object.keys(phaseFinancings).reduce((s, n) => s + (phaseFinancings[n]?.lpEquity || 0), 0);

  return {
    mode: 'independent',
    totalEquity, gpEquity, lpEquity,
    gpPct: totalEquity > 0 ? gpEquity / totalEquity : 0,
    lpPct: totalEquity > 0 ? lpEquity / totalEquity : 0,
    equityCalls: sumArr('equityCalls'), fees: sumArr('fees'),
    feeSub: sumArr('feeSub'), feeMgmt: sumArr('feeMgmt'), feeCustody: sumArr('feeCustody'),
    feeDev: sumArr('feeDev'), feeStruct: sumArr('feeStruct'),
    feePreEst: sumArr('feePreEst'), feeSpv: sumArr('feeSpv'), feeAuditor: sumArr('feeAuditor'),
    totalFees: sum('totalFees'), unfundedFees: sumArr('unfundedFees'),
    gpLandRentTotal: sum('gpLandRentTotal'),
    exitProceeds: sumArr('exitProceeds'), exitYear: Math.max(...names.map(n => phaseWaterfalls[n]?.exitYear || 0)),
    cashAvail: sumArr('cashAvail'),
    tier1: sumArr('tier1'), tier2: sumArr('tier2'),
    tier3: sumArr('tier3'), tier4LP: sumArr('tier4LP'), tier4GP: sumArr('tier4GP'),
    lpDist: sumArr('lpDist'), gpDist: sumArr('gpDist'),
    lpNetCF, gpNetCF,
    unreturnedOpen: sumArr('unreturnedOpen'), unreturnedClose: sumArr('unreturnedClose'),
    prefAccrual: sumArr('prefAccrual'), prefAccumulated: sumArr('prefAccumulated'),
    lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
    lpTotalDist: sum('lpTotalDist'), gpTotalDist: sum('gpTotalDist'),
    lpMOIC: lpEquity > 0 ? sum('lpTotalDist') / lpEquity : 0,
    gpMOIC: gpEquity > 0 ? sum('gpTotalDist') / gpEquity : 0,
    // Committed MOIC = same as lpMOIC/gpMOIC here (using original equity)
    lpCommittedMOIC: lpEquity > 0 ? sum('lpTotalDist') / lpEquity : 0,
    gpCommittedMOIC: gpEquity > 0 ? sum('gpTotalDist') / gpEquity : 0,
    // Net distributions (after land rent obligations)
    lpNetDist: sum('lpNetDist') || sum('lpTotalDist'),
    gpNetDist: sum('gpNetDist') || sum('gpTotalDist'),
    // Total called (actual cash contributed)
    lpTotalCalled: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    gpTotalCalled: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    lpTotalInvested: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity)),
    gpTotalInvested: sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity)),
    lpDPI: sum('lpTotalDist') / Math.max(1, sumArr('equityCalls').reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity))),
    gpDPI: sum('gpTotalDist') / Math.max(1, sumArr('equityCalls').reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity))),
    lpNPV10: calcNPV(lpNetCF, 0.10), lpNPV12: calcNPV(lpNetCF, 0.12), lpNPV14: calcNPV(lpNetCF, 0.14),
    gpNPV10: calcNPV(gpNetCF, 0.10), gpNPV12: calcNPV(gpNetCF, 0.12), gpNPV14: calcNPV(gpNetCF, 0.14),
    isFund: true,
  };
}

/** Main orchestrator: runs independent financing + waterfall per phase, then aggregates */
function computeIndependentPhaseResults(project, projectResults, incentivesResult) {
  if (!project || !projectResults) return { phaseFinancings: {}, phaseWaterfalls: {}, consolidatedFinancing: null, consolidatedWaterfall: null };

  const phases = projectResults.phaseResults;
  const phaseNames = Object.keys(phases);
  if (phaseNames.length === 0) return { phaseFinancings: {}, phaseWaterfalls: {}, consolidatedFinancing: null, consolidatedWaterfall: null };

  const h = project.horizon || 50;
  const phaseFinancings = {};
  const phaseWaterfalls = {};

  for (const pName of phaseNames) {
    const pr = phases[pName];
    if (!pr || pr.totalCapex === 0) continue;

    const vProject = buildPhaseVirtualProject(project, pName, pr);
    const vResults = buildPhaseProjectResults(projectResults, pName);
    if (!vResults) continue;

    // Run financing for this phase (FIX#4: pass phase-allocated incentives)
    try {
      const pIr = buildPhaseIncentives(projectResults, incentivesResult, pName);
      const pFinancing = computeFinancing(vProject, vResults, pIr);
      if (pFinancing) {
        phaseFinancings[pName] = pFinancing;
        // Run waterfall (only if fund mode for this phase)
        const pFinMode = vProject.finMode || project.finMode;
        if (pFinMode === "fund" || pFinMode === "jv") {
          try {
            const pWaterfall = computeWaterfall(vProject, vResults, pFinancing, pIr);
            if (pWaterfall) phaseWaterfalls[pName] = pWaterfall;
          } catch (e) { console.error(`Phase waterfall error (${pName}):`, e); }
        }
      }
    } catch (e) { console.error(`Phase financing error (${pName}):`, e); }
  }

  const consolidatedFinancing = aggregatePhaseFinancings(phaseFinancings, h);
  const consolidatedWaterfall = aggregatePhaseWaterfalls(phaseWaterfalls, phaseFinancings, h);

  return { phaseFinancings, phaseWaterfalls, consolidatedFinancing, consolidatedWaterfall };
}

// ═══ Legacy computePhaseWaterfalls (kept for backward compat) ═══
function computePhaseWaterfalls(project, projectResults, financing, waterfallConsolidated) {
  if (!project || !projectResults || !financing || !waterfallConsolidated) return {};
  if (project.finMode === "self" || project.finMode === "bank100") return {};

  const phases = projectResults.phaseResults;
  const phaseNames = Object.keys(phases);
  if (phaseNames.length <= 1) return {}; // No need if single phase

  const h = project.horizon || 50;
  const sy = project.startYear || 2026;
  const c = projectResults.consolidated;
  const f = financing;
  const wc = waterfallConsolidated;

  const result = {};

  for (const pName of phaseNames) {
    const pr = phases[pName];
    const allocPct = pr.allocPct || (1 / phaseNames.length);

    // Phase-level financing allocation (proportional to CAPEX)
    const capexPct = c.totalCapex > 0 ? pr.totalCapex / c.totalCapex : allocPct;

    const pDebt = f.totalDebt * capexPct;
    const pEquity = f.totalEquity * capexPct;
    const pGpEquity = f.gpEquity * capexPct;
    const pLpEquity = f.lpEquity * capexPct;
    const pFees = wc.totalFees * capexPct;

    // Phase exit proceeds (proportional to income at exit)
    const exitYr = wc.exitYear - sy;
    const totalIncomeAtExit = c.income[exitYr] || 1;
    const phaseIncomeAtExit = pr.income[exitYr] || 0;
    const exitPct = totalIncomeAtExit > 0 ? phaseIncomeAtExit / totalIncomeAtExit : capexPct;

    // Phase cash available - ZAN formula: MAX(0, UnlevCF + DS - Fees + UF + Exit)
    const pCashAvail = new Array(h).fill(0);
    const pEquityCalls = new Array(h).fill(0);
    const pUnfundedFees = new Array(h).fill(0);
    for (let y = 0; y < h; y++) {
      pEquityCalls[y] = (wc.equityCalls[y] || 0) * capexPct;
      const unlevCF = pr.netCF[y] || 0; // income - landRent - capex
      const debtSvc = (f.debtService[y] || 0) * capexPct;
      const fees = (wc.fees[y] || 0) * capexPct;
      const exitP = (wc.exitProceeds[y] || 0) * exitPct;
      // Unfunded fees for this phase
      if (fees > 0) {
        const operCF = unlevCF - debtSvc + exitP;
        pUnfundedFees[y] = Math.max(0, fees - Math.max(0, operCF));
      }
      const exitYrIdx = wc.exitYear - sy;
      const inPeriod = y <= exitYrIdx;
      pCashAvail[y] = Math.max(0, (inPeriod ? unlevCF : 0) - debtSvc - fees + pUnfundedFees[y] + exitP);
    }

    // Run 4-tier waterfall for this phase
    const prefRate = (project.prefReturnPct ?? 15) / 100;
    const carryPct = Math.min(0.9999, Math.max(0, (project.carryPct ?? 30) / 100));
    const lpSplitPct = (project.lpProfitSplitPct ?? 70) / 100;
    const gpPct = wc.gpPct;
    const lpPct = wc.lpPct;

    const catchMethod = project.catchupMethod || "perYear";
    const prefAlloc = project.prefAllocation || "proRata";

    const tier1=[],tier2=[],tier3=[],tier4LP=[],tier4GP=[],lpDist=[],gpDist=[];
    for(let i=0;i<h;i++){tier1.push(0);tier2.push(0);tier3.push(0);tier4LP.push(0);tier4GP.push(0);lpDist.push(0);gpDist.push(0);}

    let cumEqCalled=0,cumReturned=0,cumPrefPaid=0,cumPrefAccrued=0,cumGPCatchup=0;
    for(let y=0;y<h;y++){
      cumEqCalled+=pEquityCalls[y];
      const unreturned=cumEqCalled-cumReturned;
      const yearPref=unreturned*prefRate;
      cumPrefAccrued+=yearPref;
      let rem=pCashAvail[y];
      if(rem<=0)continue;
      if(unreturned>0&&rem>0){const t1=Math.min(rem,unreturned);tier1[y]=t1;rem-=t1;cumReturned+=t1;}
      const prefOwed=cumPrefAccrued-cumPrefPaid;
      if(prefOwed>0&&rem>0){const t2=Math.min(rem,prefOwed);tier2[y]=t2;rem-=t2;cumPrefPaid+=t2;}
      if(project.gpCatchup&&rem>0&&carryPct>0){
        if(catchMethod==="perYear"){
          // ZAN method: based on this year's T2 only
          const catchup=Math.min(rem,tier2[y]*carryPct/(1-carryPct));
          tier3[y]=catchup;rem-=catchup;
        }else{
          const gpFromPref=prefAlloc==="proRata"?cumPrefPaid*gpPct:0;
          const targetCU=Math.max(0,(carryPct*cumPrefPaid-gpFromPref)/(1-carryPct));
          const needed=Math.max(0,targetCU-cumGPCatchup);
          const catchup=Math.min(rem,needed);tier3[y]=catchup;rem-=catchup;cumGPCatchup+=catchup;
        }
      }
      if(rem>0){tier4LP[y]=rem*lpSplitPct;tier4GP[y]=rem*(1-lpSplitPct);}
      if(prefAlloc==="lpOnly"){
        lpDist[y]=tier1[y]*lpPct+tier2[y]+tier4LP[y];
        gpDist[y]=tier1[y]*gpPct+tier3[y]+tier4GP[y];
      }else{
        lpDist[y]=(tier1[y]+tier2[y])*lpPct+tier4LP[y];
        gpDist[y]=(tier1[y]+tier2[y])*gpPct+tier3[y]+tier4GP[y];
      }
    }

    const lpNetCF=new Array(h).fill(0),gpNetCF=new Array(h).fill(0);
    for(let y=0;y<h;y++){lpNetCF[y]=-pEquityCalls[y]*lpPct+lpDist[y];gpNetCF[y]=-pEquityCalls[y]*gpPct+gpDist[y];}

    const lpTotalDist=lpDist.reduce((a,b)=>a+b,0);
    const gpTotalDist=gpDist.reduce((a,b)=>a+b,0);
    const lpInv=pEquityCalls.reduce((a,b)=>a+b,0)*lpPct;
    const gpInv=pEquityCalls.reduce((a,b)=>a+b,0)*gpPct;

    result[pName] = {
      debt: pDebt, equity: pEquity, gpEquity: pGpEquity, lpEquity: pLpEquity,
      fees: pFees, capexPct, exitPct, unfundedFees: pUnfundedFees,
      cashAvail: pCashAvail, equityCalls: pEquityCalls,
      tier1, tier2, tier3, tier4LP, tier4GP, lpDist, gpDist, lpNetCF, gpNetCF,
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF), projIRR: pr.irr,
      lpMOIC: lpInv > 0 ? lpTotalDist / lpInv : 0,
      gpMOIC: gpInv > 0 ? gpTotalDist / gpInv : 0,
      lpCommittedMOIC: pLpEquity > 0 ? lpTotalDist / pLpEquity : 0,
      gpCommittedMOIC: pGpEquity > 0 ? gpTotalDist / pGpEquity : 0,
      lpTotalDist, gpTotalDist, lpTotalInvested: lpInv, gpTotalInvested: gpInv,
      lpTotalCalled: lpInv, gpTotalCalled: gpInv,
      lpNetDist: lpTotalDist, gpNetDist: gpTotalDist,
      lpNPV10: calcNPV(lpNetCF, 0.10), gpNPV10: calcNPV(gpNetCF, 0.10),
      totalCashAvail: pCashAvail.reduce((a,b)=>a+b,0),
    };
  }

  return result;
}
function WaterfallView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, t, lang, up }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [showTerms, setShowTerms] = useState(false);
  const [wSec, setWSec] = useState({});  // chart toggle state
  const [kpiOpen, setKpiOpen] = useState({gp:false,lp:false,fund:false}); // expandable KPI cards

  if (!project || !results || !waterfall) return <div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>
    <div style={{fontSize:14,marginBottom:8}}>{lang==="ar"?"يتطلب اختيار هيكل تمويل غير ذاتي":"Requires non-self financing mode"}</div>
    <div style={{fontSize:12}}>{lang==="ar"?"اختر 'دين بنكي' أو 'صندوق استثماري' من لوحة التحكم":"Select 'Bank Debt' or 'Fund Structure' from the control panel"}</div>
  </div>;

  // Per-phase config proxy (same pattern as FinancingView)
  const isPhaseView = selectedPhase !== "all";
  const cfg = isPhaseView ? getPhaseFinancing(project, selectedPhase) : project;
  const upCfg = up ? (isPhaseView
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === selectedPhase
          ? { ...p, financing: { ...getPhaseFinancing(prev, selectedPhase), ...fields } }
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
  const phaseNames = Object.keys(results.phaseResults || {});
  const hasPhases = phaseNames.length > 1 && phaseWaterfalls && Object.keys(phaseWaterfalls).length > 0;
  const _pw = (selectedPhase !== "all" && phaseWaterfalls?.[selectedPhase]) ? phaseWaterfalls[selectedPhase] : null;
  const h0 = new Array(results.horizon || 50).fill(0);
  // New independent phase waterfalls are full waterfall objects - use directly
  const w = _pw ? {
    ..._pw,
    feeSub: _pw.feeSub || h0, feeMgmt: _pw.feeMgmt || h0, feeCustody: _pw.feeCustody || h0,
    feeDev: _pw.feeDev || h0, feeStruct: _pw.feeStruct || h0,
    feePreEst: _pw.feePreEst || h0, feeSpv: _pw.feeSpv || h0, feeAuditor: _pw.feeAuditor || h0, fees: _pw.fees || h0,
    totalFees: _pw.totalFees ?? 0,
    totalEquity: _pw.totalEquity || _pw.equity || 0,
    exitYear: _pw.exitYear || waterfall.exitYear || 0,
    lpNPV12: _pw.lpNPV12 ?? null, lpNPV14: _pw.lpNPV14 ?? null,
    gpNPV12: _pw.gpNPV12 ?? null, gpNPV14: _pw.gpNPV14 ?? null,
    unreturnedClose: _pw.unreturnedClose || h0, unreturnedOpen: _pw.unreturnedOpen || h0,
    prefAccrual: _pw.prefAccrual || h0, prefAccumulated: _pw.prefAccumulated || h0,
    exitProceeds: _pw.exitProceeds || h0,
  } : waterfall;
  const cur = project.currency || "SAR";

  // Phase-aware data sources for table §7 and §8
  const pc = (selectedPhase !== "all" && results.phaseResults?.[selectedPhase]) ? results.phaseResults[selectedPhase] : results.consolidated;
  const f = (selectedPhase !== "all" && phaseFinancings?.[selectedPhase]) ? phaseFinancings[selectedPhase] : financing;

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
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:160}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* Phase selector */}
    {hasPhases && (
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        <button onClick={()=>setSelectedPhase("all")} style={{...btnS,padding:"6px 14px",fontSize:11,fontWeight:600,background:selectedPhase==="all"?"#1e3a5f":"#f0f1f5",color:selectedPhase==="all"?"#fff":"#1a1d23",border:"1px solid "+(selectedPhase==="all"?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
          {lang==="ar"?"الإجمالي":"Consolidated"}
        </button>
        {phaseNames.map(p=>{
          const pw = phaseWaterfalls?.[p];
          const irr = pw?.lpIRR;
          return <button key={p} onClick={()=>setSelectedPhase(p)} style={{...btnS,padding:"6px 14px",fontSize:11,fontWeight:600,background:selectedPhase===p?"#1e3a5f":"#f0f1f5",color:selectedPhase===p?"#fff":"#1a1d23",border:"1px solid "+(selectedPhase===p?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {p}{irr !== null && irr !== undefined ? <span style={{fontSize:10,opacity:0.8}}>{` LP ${(irr*100).toFixed(1)}%`}</span> : ""}
          </button>;
        })}
      </div>
    )}

    {/* ═══ QUICK EDIT: Fund & Waterfall Terms ═══ */}
    {upCfg && cfg.finMode === "fund" && (
      <div style={{background:showTerms?"#fff":"#f8f9fb",borderRadius:10,border:showTerms?"2px solid #8b5cf6":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#faf5ff":"#f8f9fb",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?"تعديل سريع - شروط الصندوق":"Quick Edit - Fund Terms"}</span>
          <span style={{fontSize:10,color:"#6b7080"}}>{ar?"Pref":"Pref"} {cfg.prefReturnPct||15}% · Carry {cfg.carryPct||20}% · LP {cfg.lpProfitSplitPct||75}%</span>
          <span style={{fontSize:11,color:"#9ca3af",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #ede9fe"}}>
          {/* Row 1: Waterfall Terms */}
          <div style={{fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"شروط الشلال":"WATERFALL TERMS"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {[
              {l:ar?"العائد التفضيلي %":"Pref Return %",k:"prefReturnPct",v:cfg.prefReturnPct},
              {l:ar?"حافز الأداء %":"Carry %",k:"carryPct",v:cfg.carryPct},
              {l:ar?"حصة LP %":"LP Split %",k:"lpProfitSplitPct",v:cfg.lpProfitSplitPct},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080",minWidth:90}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:60,padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,textAlign:"center",background:"#fff"}} />
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080"}}>{ar?"GP Catch-up":"Catch-up"}</span>
              <select value={cfg.gpCatchup?"Y":"N"} onChange={e=>upCfg({gpCatchup:e.target.value==="Y"})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="Y">{ar?"نعم":"Yes"}</option><option value="N">{ar?"لا":"No"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#6b7080"}}>{ar?"معاملة الرسوم":"Fee Treatment"}</span>
              <select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{padding:"5px 8px",border:"1px solid #e5e7ec",borderRadius:6,fontSize:12,background:"#fff"}}>
                <option value="capital">{ar?"رأسمال":"Capital"}</option><option value="rocOnly">{ar?"استرداد فقط":"ROC Only"}</option><option value="expense">{ar?"مصروف":"Expense"}</option>
              </select>
            </div>
          </div>
          {/* Row 2: Fund Fees */}
          <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
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
              <span style={{fontSize:10,color:"#6b7080",minWidth:f.wide?68:52}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:f.wide?80:55,padding:"4px 6px",border:"1px solid #e5e7ec",borderRadius:5,fontSize:11,textAlign:"center",background:"#fff"}} />
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
      const gpFeesTotal = gpIsManager ? _feeDev+_feeMgmt+_feeStruct+_feeCustody+_feePreEst+_feeSpv+_feeAuditor : _feeDev;
      const gpNetCash = (w.gpTotalDist||0) + gpFeesTotal - (w.gpLandRentTotal||0);
      const gpNetProfit = gpNetCash - (w.gpTotalInvested||0);
      // Project-level land rent for this phase (shown when not GP-specific obligation)
      const phaseLR = (() => {
        if (selectedPhase !== "all") { const pr = results.phaseResults?.[selectedPhase]; return pr?.totalLandRent || 0; }
        return results.consolidated?.totalLandRent || 0;
      })();
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
      const KR = ({l,v,c,bold}) => <><span style={{color:"#6b7080",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:bold?700:500,fontSize:11,color:c||"#1a1d23"}}>{v}</span></>;
      const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"#9ca3af",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
      return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
        {/* ── GP (Developer) Card ── */}
        <div style={{background:kpiOpen.gp?"#fff":"linear-gradient(135deg, #eff6ff, #f0fdf4)",borderRadius:10,border:kpiOpen.gp?"2px solid #3b82f6":"1px solid #bfdbfe",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,gp:!p.gp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#3b82f6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>GP</span>
            <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"المطور":"Developer"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.gp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.gp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
              {badge(ar?"صافي":"Net", fmtM(gpNetCash), "#16a34a")}
              {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", "#3b82f6")}
              {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", w.gpIRR>0.001?"#16a34a":"#6b7080")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10}}>
              <SecHd text={ar?"كمستثمر":"AS INVESTOR"} />
              <KR l={ar?"استرداد رأسمال (T1)":"Capital Return (T1)"} v={fmt(gpT1)} />
              <KR l={ar?"عائد مفضل (T2)":"Pref Return (T2)"} v={isLpOnlyPref?"—":fmt(gpT2)} />
              <SecHd text={ar?"كمطور":"AS DEVELOPER"} />
              <KR l={ar?"تعويض (T3)":"Catch-up (T3)"} v={fmt(t3Total)} c="#f59e0b" />
              <KR l={ar?"توزيع أرباح (T4)":"Profit Split (T4)"} v={fmt(t4GPTotal)} c="#16a34a" />
              <KR l={ar?"رسوم تطوير":"Dev Fee"} v={fmt(_feeDev)} c="#a16207" />
              {gpIsManager && <>
                <KR l={ar?"رسوم إدارة":"Mgmt Fee"} v={fmt(_feeMgmt)} c="#a16207" />
                <KR l={ar?"رسوم هيكلة":"Struct Fee"} v={fmt(_feeStruct)} c="#a16207" />
                <KR l={ar?"ما قبل التأسيس":"Pre-Est"} v={fmt(_feePreEst)} c="#a16207" />
                <KR l="SPV" v={fmt(_feeSpv)} c="#a16207" />
                <KR l={ar?"مراجع":"Auditor"} v={fmt(_feeAuditor)} c="#a16207" />
              </>}
              {showLandRent && <KR l={ar?((w.gpLandRentTotal||0)>0?"إيجار أرض (GP)":"إيجار أرض (مشروع)"):((w.gpLandRentTotal||0)>0?"Land Rent (GP)":"Land Rent (Project)")} v={`(${fmt((w.gpLandRentTotal||0) > 0 ? w.gpLandRentTotal : phaseLR)})`} c="#ef4444" />}
              <SecHd text={ar?"الملخص":"NET SUMMARY"} />
              <KR l={ar?"حصة GP":"GP Equity"} v={fmt(w.gpTotalInvested)} bold />
              <KR l={ar?"توزيعات الشلال":"Waterfall Dist"} v={fmt(w.gpTotalDist)} />
              <KR l={ar?"رسوم مستلمة":"Fees Received"} v={fmt(gpFeesTotal)} c="#a16207" />
              {(w.gpLandRentTotal||0)>0 && <KR l={ar?"إيجار أرض":"Land Rent"} v={`(${fmt(w.gpLandRentTotal)})`} c="#ef4444" />}
              <KR l={ar?"صافي النقد":"Net Cash"} v={fmtM(gpNetCash)} c="#16a34a" bold />
              <KR l={ar?"صافي الربح":"Net Profit"} v={fmtM(gpNetProfit)} c={gpNetProfit>=0?"#16a34a":"#ef4444"} bold />
              <SecHd text={ar?"المؤشرات":"METRICS"} />
              <div style={{gridColumn:"1/-1",display:"flex",gap:6,flexWrap:"wrap",paddingTop:4}}>
                {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", "#3b82f6")}
                {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", w.gpIRR>0.001?"#16a34a":"#6b7080")}
                {badge(ar?"استرداد":"Payback", gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—", "#6366f1")}
              </div>
            </div>
          )}
        </div>

        {/* ── LP (Investor) Card ── */}
        <div style={{background:kpiOpen.lp?"#fff":"linear-gradient(135deg, #faf5ff, #f5f3ff)",borderRadius:10,border:kpiOpen.lp?"2px solid #8b5cf6":"1px solid #e9d5ff",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,lp:!p.lp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#8b5cf6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>LP</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5b21b6",flex:1}}>{ar?"المستثمر":"Investor"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.lp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.lp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
              {badge("IRR", w.lpIRR!==null?fmtPct(w.lpIRR*100):"—", w.lpIRR>0?"#16a34a":"#6b7080")}
              {badge("MOIC", w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—", "#8b5cf6")}
              {badge(ar?"استرداد":"Payback", lpPayback?`Yr ${lpPayback}`:"—", "#6366f1")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10}}>
              <SecHd text={ar?"مصادر التوزيعات":"DISTRIBUTION SOURCES"} />
              <KR l={ar?"استرداد رأسمال (T1)":"Capital Return (T1)"} v={fmt(lpT1)} />
              <KR l={ar?"عائد مفضل (T2)":"Pref Return (T2)"} v={fmt(lpT2)} c="#8b5cf6" />
              <KR l={ar?"توزيع أرباح (T4)":"Profit Split (T4)"} v={fmt(t4LPTotal)} c="#16a34a" />
              <SecHd text={ar?"الصافي":"NET"} />
              <KR l={ar?"حصة LP":"LP Equity"} v={fmt(w.lpTotalInvested)} bold />
              <KR l={ar?"إجمالي التوزيعات":"Total Distributions"} v={fmt(w.lpTotalDist)} c="#8b5cf6" />
              <KR l={ar?"صافي النقد":"Net Cash"} v={fmtM(lpNetCash)} c={lpNetCash>=0?"#16a34a":"#ef4444"} bold />
              <SecHd text={ar?"المؤشرات":"METRICS"} />
              <KR l="IRR" v={w.lpIRR!==null?fmtPct(w.lpIRR*100):"—"} c={w.lpIRR>0?"#16a34a":"#6b7080"} bold />
              <KR l="MOIC" v={w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"} c="#8b5cf6" bold />
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
        <div style={{background:kpiOpen.fund?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.fund?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,fund:!p.fund}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📊</span>
            <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"الصندوق":"Fund"}</span>
            <span style={{fontSize:10,color:"#6b7080"}}>{kpiOpen.fund?"▲":"▼"}</span>
          </div>
          {!kpiOpen.fund ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
              {badge(ar?"رسوم":"Fees", fmtM(w.totalFees), "#f59e0b")}
              {badge(ar?"ملكية":"Equity", fmtM(w.totalEquity), "#3b82f6")}
              {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${exitYr}`, "#16a34a")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10}}>
              <SecHd text={ar?"الرسوم":"FEES"} />
              <KR l={`${ar?"اكتتاب":"Subscription"} (${ar?"مرة":"once"})`} v={fmt(_feeSub)} c="#f59e0b" />
              <KR l={`${ar?"إدارة":"Management"} (${ar?"سنوي":"annual"})`} v={fmt(_feeMgmt)} c="#f59e0b" />
              <KR l={`${ar?"حفظ":"Custody"} (${ar?"سنوي":"annual"})`} v={fmt(_feeCustody)} c="#f59e0b" />
              <KR l={`${ar?"تطوير":"Developer"} (${ar?"مرة":"once"})`} v={fmt(_feeDev)} c="#f59e0b" />
              <KR l={`${ar?"هيكلة":"Structuring"} (${ar?"مرة+سقف":"once+cap"})`} v={fmt(_feeStruct)} c="#f59e0b" />
              <KR l={`${ar?"ما قبل التأسيس":"Pre-Est"} (${ar?"مرة":"once"})`} v={fmt(_feePreEst)} c="#f59e0b" />
              <KR l={`SPV (${ar?"مرة":"once"})`} v={fmt(_feeSpv)} c="#f59e0b" />
              <KR l={`${ar?"مراجع":"Auditor"} (${ar?"سنوي":"annual"})`} v={fmt(_feeAuditor)} c="#f59e0b" />
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #fde68a",paddingTop:4,marginTop:2,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
                <KR l={ar?"إجمالي الرسوم":"Total Fees"} v={fmtM(w.totalFees)} c="#f59e0b" bold />
              </div>
              <SecHd text={ar?"رأس المال":"CAPITAL"} />
              <KR l={ar?"إجمالي الملكية":"Total Equity"} v={fmtM(w.totalEquity)} bold />
              <KR l="LP / GP" v={`${fmtPct(lpPctVal*100)} / ${fmtPct(gpPctVal*100)}`} />
              <KR l={ar?"دين":"Debt"} v={(() => { const _f = (selectedPhase !== "all" && phaseFinancings?.[selectedPhase]) ? phaseFinancings[selectedPhase] : financing; return _f?.totalDebt ? fmtM(_f.totalDebt) : "—"; })()} c="#ef4444" />
              <SecHd text={ar?"التخارج":"EXIT"} />
              <KR l={ar?"السنة":"Year"} v={exitYr>0?`${exitYr} (${sy+exitYr-1})`:"—"} />
              <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
              <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="#16a34a" />
              <KR l={ar?"تكاليف %":"Cost %"} v={exitCostPct>0?fmtPct(exitCostPct)+"%":"—"} />
              <SecHd text={ar?"إعدادات":"CONFIG"} />
              <KR l={ar?"معاملة الرسوم":"Fee Treatment"} v={({capital:ar?"رأسمالية":"Capital",expense:ar?"مصروفات":"Expense"})[cfg.feeTreatment||"capital"]||cfg.feeTreatment||"Capital"} />
              <KR l={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} v={({equity:ar?"ملكية":"Equity",nav:ar?"صافي الأصول":"NAV",commitment:ar?"الالتزام":"Commitment"})[cfg.mgmtFeeBase||"equity"]||cfg.mgmtFeeBase||"Equity"} />
            </div>
          )}
        </div>
      </div>;
    })()}

    {/* ═══ CHART TOGGLE ═══ */}
    {cfChartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setWSec(p=>({...p,chart:!p.chart}))} style={{...btnS,fontSize:11,padding:"6px 14px",background:wSec.chart?"#f0f4ff":"#f8f9fb",color:wSec.chart?"#2563eb":"#6b7080",border:"1px solid "+(wSec.chart?"#93c5fd":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"عرض الشارت":"Show Chart"} {wSec.chart?"▲":"▼"}
        </button>
        {wSec.chart && <div style={{marginTop:10,background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 18px"}}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cfChartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="lpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="lp" stroke="#8b5cf6" strokeWidth={2} fill="url(#lpG)" name="LP" dot={false} />
              <Area type="monotone" dataKey="gp" stroke="#3b82f6" strokeWidth={2} fill="url(#gpG)" name="GP" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>
    )}

    {/* ═══ UNIFIED TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"تدفقات الصندوق":"Fund Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>Total</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 7. PROJECT CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s7:!p.s7}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{wSec.s7?"▶":"▼"} {ar?"7. تدفقات المشروع (غير ممول)":"7. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!wSec.s7 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
      <CFRow label={ar?"إيجار الأرض":"Land Rent"} values={pc.landRent} total={pc.totalLandRent ?? pc.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      <CFRow label={ar?"تكلفة التطوير (CAPEX)":"Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"صافي التدفق النقدي (غير ممول)":"Net Project CF (Unlevered)"} values={pc.netCF} total={pc.totalNetCF ?? pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 8. FUND CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s8:!p.s8}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#2563eb",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{wSec.s8?"▶":"▼"} {ar?"8. تدفقات الصندوق (ممول)":"8. FUND CASH FLOW (Levered)"}</td></tr>
      {!wSec.s8 && <>
      <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={w.equityCalls} total={w.equityCalls.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
      {f && <>
        <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={f.drawdown} total={f.drawdown?.reduce((a,b)=>a+b,0)||0} />
        <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={f.debtBalOpen} total={null} />
        <CFRow label={ar?"سداد أصل الدين":"Debt Repayment"} values={f.repayment} total={f.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
        <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={f.debtBalClose} total={null} />
        <CFRow label={ar?"تكلفة التمويل (فائدة)":"Interest/Profit"} values={f.interest} total={f.totalInterest||0} negate color="#ef4444" />
        <CFRow label={ar?"إجمالي خدمة الدين":"Total Debt Service"} values={f.debtService} total={f.debtService?.reduce((a,b)=>a+b,0)||0} negate bold color="#ef4444" />
        {/* DSCR */}
        {f.dscr && <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontWeight:500,minWidth:200,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>DSCR</td>
          <td style={tdN}></td>
          {years.map(y=>{const v=f.dscr?.[y];return <td key={y} style={{...tdN,fontSize:10,fontWeight:v&&v<1.2?700:500,color:v===null||v===undefined?"#d0d4dc":v<1?"#ef4444":v<1.2?"#f59e0b":"#16a34a"}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
        </tr>}
      </>}

      {/* Fees sub-section */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"#f59e0b",background:"#fffbeb",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"الرسوم":"FEES"}</td></tr>
      {(w.feeSub||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"اكتتاب":"Subscription Fee"}`} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeMgmt||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"إدارة":"Management Fee"}`} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeCustody||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"حفظ":"Custody Fee"}`} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeDev||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"تطوير":"Developer Fee"}`} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeStruct||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"هيكلة":"Structuring Fee"}`} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feePreEst||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"ما قبل التأسيس":"Pre-Establishment"}`} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeSpv||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"SPV":"SPV Setup"}`} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeAuditor||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مراجع حسابات":"Auditor Fee"}`} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      <CFRow label={ar?"إجمالي الرسوم":"Total Fees"} values={w.fees} total={w.totalFees} bold negate color="#f59e0b" />
      {(w.unfundedFees||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"}`} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
      <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={w.exitProceeds} total={exitProc} color="#16a34a" />
      </>}

      {/* ═══ § 9. DISTRIBUTIONS & WATERFALL ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s9:!p.s9}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#7c3aed",background:"#f5f3ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #8b5cf6",userSelect:"none"}}>{wSec.s9?"▶":"▼"} {ar?"9. التوزيعات وشلال الأرباح":"9. DISTRIBUTIONS & WATERFALL"}</td></tr>
      {!wSec.s9 && <>
      <CFRow label={ar?"النقد المتاح للتوزيع":"Cash Available for Distribution"} values={w.cashAvail} total={w.cashAvail.reduce((a,b)=>a+b,0)} bold color="#16a34a" />

      {/* Unreturned Capital tracking */}
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:20}}>{ar?"رأس المال غير المسترد (بداية)":"Unreturned Capital (Open)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{(w.unreturnedOpen[y]||0)===0?"—":fmt(w.unreturnedOpen[y])}</td>)}
      </tr>
      <CFRow label={ar?"T1: رد رأس المال":"T1: Return of Capital"} values={w.tier1} total={t1Total} color="#2563eb" />
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:20,fontWeight:500}}>{ar?"رأس المال غير المسترد (نهاية)":"Unreturned Capital (Close)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:w.unreturnedClose[y]>0?"#3b82f6":"#16a34a",fontSize:10,fontWeight:w.unreturnedClose[y]===0?600:400}}>{w.unreturnedClose[y]===0?"✓ 0":fmt(w.unreturnedClose[y])}</td>)}
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
        {years.map(y=><td key={y} style={{...tdN,color:(w.prefAccumulated[y]||0)>0?"#7c3aed":"#16a34a",fontSize:10,fontWeight:(w.prefAccumulated[y]||0)===0?600:400}}>{(w.prefAccumulated[y]||0)===0?"✓ 0":fmt(w.prefAccumulated[y])}</td>)}
      </tr>
      <CFRow label={ar?"T2: العائد التفضيلي":"T2: Preferred Return"} values={w.tier2} total={t2Total} color="#8b5cf6" />

      {/* Remaining + T3/T4 */}
      {(() => { const rem = new Array(h).fill(0); for(let y=0;y<h;y++) rem[y]=Math.max(0,(w.cashAvail[y]||0)-(w.tier1[y]||0)-(w.tier2[y]||0)); const tot=rem.reduce((a,b)=>a+b,0); return tot>0?<CFRow label={ar?"المتبقي بعد ROC + Pref":"Remaining After ROC + Pref"} values={rem} total={tot} bold />:null; })()}
      <CFRow label={ar?"T3: تعويض المطور":"T3: GP Catch-up"} values={w.tier3} total={t3Total} color="#f59e0b" />
      <CFRow label={ar?"T4: توزيع الأرباح":"T4: Profit Split"} values={(() => { const a=new Array(h).fill(0); for(let y=0;y<h;y++) a[y]=(w.tier4LP[y]||0)+(w.tier4GP[y]||0); return a; })()} total={t4LPTotal+t4GPTotal} color="#16a34a" />
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#16a34a",paddingInlineStart:24}}>→ LP ({cfg.lpProfitSplitPct||75}%)</td>
        <td style={{...tdN,fontSize:10,color:"#16a34a"}}>{fmt(t4LPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#16a34a"}}>{(w.tier4LP[y]||0)===0?"—":fmt(w.tier4LP[y])}</td>)}
      </tr>
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>→ GP ({100-(cfg.lpProfitSplitPct||75)}%)</td>
        <td style={{...tdN,fontSize:10,color:"#3b82f6"}}>{fmt(t4GPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#3b82f6"}}>{(w.tier4GP[y]||0)===0?"—":fmt(w.tier4GP[y])}</td>)}
      </tr>

      {/* Distribution totals */}
      <CFRow label={ar?"إجمالي توزيعات LP":"Total LP Distributions"} values={w.lpDist} total={w.lpTotalDist} bold color="#8b5cf6" />
      <CFRow label={ar?"إجمالي توزيعات GP":"Total GP Distributions"} values={w.gpDist} total={w.gpTotalDist} bold color="#3b82f6" />
      </>}

      {/* ═══ § 10. INVESTOR RETURNS ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s10:!p.s10}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#92400e",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ca8a04",userSelect:"none"}}>{wSec.s10?"▶":"▼"} {ar?"10. عوائد المستثمر":"10. INVESTOR RETURNS"}</td></tr>
      {!wSec.s10 && <>
      <CFRow label={ar?"صافي CF المستثمر (LP)":"LP Net Cash Flow"} values={w.lpNetCF} total={w.lpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:600,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"↳ تراكمي LP":"↳ LP Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.lpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.lpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>{ar?"عائد نقدي LP %":"LP Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=lpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}

      <CFRow label={ar?"صافي CF المطور (GP)":"GP Net Cash Flow"} values={w.gpNetCF} total={w.gpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:600,fontSize:10,color:"#1e40af",paddingInlineStart:20}}>{ar?"↳ تراكمي GP":"↳ GP Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.gpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.gpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fff",zIndex:1,fontSize:10,color:"#6b7080",paddingInlineStart:20}}>{ar?"عائد نقدي GP %":"GP Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=gpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
      </>}

    </tbody></table></div>
    </div>
  </div>);

}

// ═══════════════════════════════════════════════════════════════
// RESULTS VIEW - Dynamic smart results page based on financing mode
// ═══════════════════════════════════════════════════════════════
function ResultsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up }) {
  const ar = lang === "ar";
  if (!project || !results) return <div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>{ar?"أضف أصول لرؤية النتائج":"Add assets to see results"}</div>;

  const mode = financing?.mode || project.finMode || "self";

  // ── FUND MODE: Render full WaterfallView (exact copy) ──
  if (mode === "fund") {
    return <WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} t={t} lang={lang} up={up} />;
  }

  // ── OTHER MODES: Placeholder (will be built per-scenario) ──
  const modeLabels = {
    self: { icon: "🏠", label: ar?"تمويل ذاتي":"Self-Funded", color: "#16a34a" },
    debt: { icon: "🏦", label: ar?"دين + ملكية":"Debt + Equity", color: "#2563eb" },
    bank100: { icon: "🏦", label: ar?"بنكي 100%":"Bank 100%", color: "#1e40af" },
  };
  const mi = modeLabels[mode] || { icon: "📋", label: mode, color: "#6b7080" };

  return <div style={{padding:40,textAlign:"center"}}>
    <div style={{fontSize:40,marginBottom:12}}>{mi.icon}</div>
    <div style={{fontSize:16,fontWeight:700,color:mi.color,marginBottom:8}}>{mi.label}</div>
    <div style={{fontSize:13,color:"#9ca3af"}}>{ar?"صفحة النتائج لهذا المسار قيد البناء":"Results page for this mode is coming soon"}</div>
  </div>;
}

// ── Financing Panel Input Components (MUST be outside FinancingView to keep focus) ──
const _finInpSt = {padding:"8px 11px",borderRadius:7,border:"1px solid #e0e3ea",background:"#f8f9fb",color:"#1a1d23",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color 0.15s, box-shadow 0.15s"};
const _finSelSt = {..._finInpSt,cursor:"pointer",appearance:"auto"};
function FL({label,children,tip,hint}) {
  return (<div style={{marginBottom:10}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#6b7080",marginBottom:4,fontWeight:500,letterSpacing:0.2}}>{tip?<Tip text={tip}>{label}</Tip>:label}</label>
    {children}
    {hint&&<div style={{fontSize:9,color:"#9ca3af",marginTop:3}}>{hint}</div>}
  </div>);
}
function Inp({value,onChange,type="text",...rest}) {
  return <input type={type} value={value??""} onChange={e=>onChange(type==="number"?+e.target.value:e.target.value)} style={_finInpSt} onFocus={e=>{e.target.style.borderColor="#2563eb";e.target.style.boxShadow="0 0 0 2px rgba(37,99,235,0.12)";e.target.style.background="#fff";}} onBlur={e=>{e.target.style.borderColor="#e0e3ea";e.target.style.boxShadow="none";e.target.style.background="#f8f9fb";}} {...rest} />;
}
function Drp({value,onChange,options,lang:dl}) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={_finSelSt}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[dl]||o.en||o.label}</option>)}</select>;
}

function FinancingView({ project, results, financing, phaseFinancings, waterfall, phaseWaterfalls, t, up, lang }) {
  const isMobile = useIsMobile();
  const [showYrs, setShowYrs] = useState(15);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [collapsed, setCollapsed] = useState({});
  const [cfgSec, setCfgSec] = useState({}); // accordion sections: {debt:false} = collapsed
  const cfgToggle = (id) => setCfgSec(prev => ({...prev, [id]: !prev[id]}));
  const cfgOpen = (id) => !cfgSec[id]; // all open by default
  const ar = lang === "ar";
  const cur = project.currency || "SAR";
  const toggle = (id) => setCollapsed(prev => ({...prev, [id]: !prev[id]}));
  const isOpen = (id) => !collapsed[id]; // all open by default

  // Per-phase financing config proxy
  const isPhaseView = selectedPhase !== "all";
  const cfg = isPhaseView ? getPhaseFinancing(project, selectedPhase) : project;
  const upCfg = isPhaseView
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === selectedPhase
          ? { ...p, financing: { ...getPhaseFinancing(prev, selectedPhase), ...fields } }
          : p)
      }))
    : (fields) => up(prev => ({
        ...fields,
        // Propagate to ALL phases so per-phase overrides don't mask the change
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }));
  const copyFromPhase = (sourceName) => {
    const source = getPhaseFinancing(project, sourceName);
    upCfg({ ...source });
  };

  if (!project || !results) return <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>
    <div style={{fontSize:32,marginBottom:12}}>📊</div>
    <div style={{fontSize:14,fontWeight:500,color:"#6b7080",marginBottom:6}}>{ar?"أكمل برنامج الأصول أولاً":"Complete Asset Program First"}</div>
    <div style={{fontSize:12}}>{ar?"أضف أصول في تاب 'برنامج الأصول' ثم ارجع هنا":"Add assets in the 'Asset Program' tab, then return here"}</div>
  </div>;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = Object.keys(results.phaseResults || {});
  const hasPhases = phaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;
  const f = (selectedPhase !== "all" && phaseFinancings?.[selectedPhase]) ? phaseFinancings[selectedPhase] : financing;
  const c = results.consolidated;

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:140}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE SELECTOR (above settings) ═══ */}
    {hasPhases && (
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setSelectedPhase("all")} style={{...btnS,padding:"7px 16px",fontSize:12,fontWeight:600,background:selectedPhase==="all"?"#1e3a5f":"#f0f1f5",color:selectedPhase==="all"?"#fff":"#1a1d23",border:"1px solid "+(selectedPhase==="all"?"#1e3a5f":"#e5e7ec"),borderRadius:8}}>
          {ar?"الإجمالي":"Consolidated"}
        </button>
        {phaseNames.map(p=>{
          const pf = phaseFinancings?.[p];
          const irr = pf?.leveredIRR;
          return <button key={p} onClick={()=>setSelectedPhase(p)} style={{...btnS,padding:"7px 16px",fontSize:12,fontWeight:600,background:selectedPhase===p?"#1e3a5f":"#f0f1f5",color:selectedPhase===p?"#fff":"#1a1d23",border:"1px solid "+(selectedPhase===p?"#1e3a5f":"#e5e7ec"),borderRadius:8}}>
            {p}{irr !== null && irr !== undefined ? <span style={{fontSize:10,opacity:0.8}}>{` Levered ${(irr*100).toFixed(1)}%`}</span> : ""}
          </button>;
        })}
        {isPhaseView && (
          <select onChange={e => { if (e.target.value) { copyFromPhase(e.target.value); e.target.value = ""; } }} style={{padding:"6px 12px",fontSize:11,borderRadius:6,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1e40af",cursor:"pointer",marginInlineStart:"auto"}}>
            <option value="">{ar?"📋 نسخ الإعدادات من...":"📋 Copy settings from..."}</option>
            {(project.phases||[]).filter(p=>p.name!==selectedPhase).map(p=>
              <option key={p.name} value={p.name}>{p.name}</option>
            )}
          </select>
        )}
      </div>
    )}
    {isPhaseView && (
      <div style={{background:"#eff6ff",borderRadius:8,border:"1px solid #bfdbfe",padding:"10px 16px",marginBottom:12,fontSize:12,color:"#1e40af"}}>
        <strong>{selectedPhase}</strong> — {ar?"إعدادات تمويل مستقلة":"Independent Financing Settings"}
        {f && f.devCostInclLand > 0 && <span style={{marginInlineStart:12,color:"#6b7080"}}>DevCost: {fmtM(f.devCostInclLand)} · Debt: {fmtM(f.maxDebt)} · Equity: {fmtM(f.totalEquity)}</span>}
      </div>
    )}

    {/* ═══ FINANCING CONFIGURATION PANEL ═══ */}
    <div style={{background:showConfig?"#fff":"#f8f9fb",borderRadius:12,border:showConfig?"2px solid #2563eb":"1px solid #e5e7ec",marginBottom:18,overflow:"hidden",boxShadow:showConfig?"0 2px 12px rgba(37,99,235,0.08)":"none",transition:"all 0.2s"}}>
      <div onClick={()=>setShowConfig(!showConfig)} style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:showConfig?"linear-gradient(135deg, #eff6ff, #f0f4ff)":"#f8f9fb",borderBottom:showConfig?"1px solid #dbeafe":"none"}}>
        <div style={{width:32,height:32,borderRadius:8,background:showConfig?"#2563eb":"#e5e7ec",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:showConfig?"#fff":"#6b7080",transition:"all 0.2s"}}>⚙</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1d23"}}>{isPhaseView ? (ar?`إعدادات ${selectedPhase}`:`${selectedPhase} Settings`) : (ar?"إعدادات التمويل والتخارج":"Financing & Exit Settings")}</div>
          {!showConfig && <div style={{fontSize:11,color:"#6b7080",marginTop:2}}>{({self:ar?"ذاتي":"Self-Funded",bank100:ar?"بنكي 100%":"Bank 100%",debt:ar?"دين + ملكية":"Debt + Equity",fund:ar?"صندوق":"Fund"})[cfg.finMode]||""}{cfg.finMode!=="self"?` · ${cfg.maxLtvPct||70}% LTV · ${cfg.financeRate||6.5}%`:""}</div>}
        </div>
        <button onClick={e=>{e.stopPropagation();setShowConfig(!showConfig);}} style={{...btnS,padding:"6px 14px",fontSize:11,fontWeight:600,background:showConfig?"#fff":"#2563eb",color:showConfig?"#6b7080":"#fff",border:showConfig?"1px solid #e5e7ec":"none",borderRadius:6}}>
          {showConfig?(ar?"▲ إغلاق":"▲ Close"):(ar?"✎ تعديل":"✎ Edit")}
        </button>
      </div>
      {showConfig && (() => {
        const hasDbt = cfg.finMode !== "self";
        const hasEq = cfg.finMode !== "self" && cfg.finMode !== "bank100";
        const isFundMode = cfg.finMode === "fund";
        const notHold = (cfg.exitStrategy||"sale") !== "hold";
        // Accordion section header helper
        const AH = ({id, color, icon, label, summary, visible}) => {
          if (visible === false) return null;
          const open = cfgOpen(id);
          return <div onClick={()=>cfgToggle(id)} style={{padding:"9px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #eef0f4",background:open?color+"06":"#fafbfc",userSelect:"none",transition:"background 0.15s"}}>
            <span style={{width:8,height:8,borderRadius:4,background:color,flexShrink:0}} />
            <span style={{fontSize:12,fontWeight:600,color:"#1a1d23",flex:1}}>{label}</span>
            {summary && <span style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>{summary}</span>}
            <span style={{fontSize:10,color:"#9ca3af",transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>{open?"▼":"▶"}</span>
          </div>;
        };
        const AB = ({id, children, visible}) => {
          if (visible === false || !cfgOpen(id)) return null;
          return <div style={{padding:"10px 18px 14px"}}>{children}</div>;
        };
        const g2 = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:6};
        const g3 = {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6};
        return <div>
        {/* ── SECTION: FINANCING MODE (always visible, not collapsible) ── */}
        <div style={{padding:"12px 18px",borderBottom:"1px solid #eef0f4"}}>
          <FL label={ar?"آلية التمويل":"Financing Mode"} tip="يحدد طريقة تمويل المشروع: ذاتي، بنكي، أو عبر صندوق استثماري\nChoose how the project will be funded: self, bank, or fund structure">
            <Drp lang={lang} value={cfg.finMode} onChange={v=>upCfg({finMode:v,...(v==="bank100"?{debtAllowed:true,maxLtvPct:100}:{})})} options={[
              {value:"self",en:"Self-Funded",ar:"تمويل ذاتي"},
              {value:"bank100",en:"100% Bank Debt",ar:"بنكي 100%"},
              {value:"debt",en:"Debt + Equity",ar:"دين + ملكية"},
              {value:"fund",en:"Fund (GP/LP)",ar:"صندوق (GP/LP)"},
            ]} />
          </FL>
        </div>

        {/* ── SECTION: DEBT TERMS ── */}
        <AH id="debt" color="#2563eb" label={ar?"شروط القرض":"Debt Terms"} summary={hasDbt && (cfg.debtAllowed || cfg.finMode==="bank100") ? `${cfg.finMode!=="bank100"?(cfg.maxLtvPct||70)+"% LTV · ":""}${cfg.financeRate||6.5}% · ${cfg.loanTenor||12}yr` : ""} visible={hasDbt} />
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
                {cfg.finMode!=="bank100"&&<FL label={ar?"نسبة التمويل %":"LTV %"} tip="نسبة القرض إلى قيمة المشروع. في السعودية 50-70%\nLoan-to-Value ratio. Saudi: 50-70%"><Inp type="number" value={cfg.maxLtvPct} onChange={v=>upCfg({maxLtvPct:v})} /></FL>}
                <FL label={ar?"معدل %":"Rate %"} tip="معدل تكلفة التمويل السنوي. في السعودية 5-8%\nAnnual financing cost rate. Saudi: 5-8%"><Inp type="number" value={cfg.financeRate} onChange={v=>upCfg({financeRate:v})} /></FL>
              </div>
              <div style={g3}>
                <FL label={ar?"مدة القرض":"Tenor"} tip="مدة القرض الكلية شاملة فترة السماح. عادة 7-15 سنة\nTotal loan period including grace. Usually 7-15 years"><Inp type="number" value={cfg.loanTenor} onChange={v=>upCfg({loanTenor:v})} /></FL>
                <FL label={ar?"فترة السماح":"Grace"} tip="فترة دفع الربح فقط بدون أصل الدين. عادة 2-4 سنوات\nInterest-only period, no principal. Usually 2-4 years"><Inp type="number" value={cfg.debtGrace} onChange={v=>upCfg({debtGrace:v})} /></FL>
                <FL label={ar?"بداية السماح":"Grace Basis"} tip="متى تبدأ فترة السماح: من أول سحب أو من اكتمال البناء\nWhen grace starts: first drawdown or completion of development (COD)"><select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fff",fontSize:13}}><option value="cod">{ar?"اكتمال البناء (COD)":"COD (Completion)"}</option><option value="firstDraw">{ar?"أول سحب":"First Drawdown"}</option></select></FL>
              </div>
              <div style={g2}>
                <FL label={ar?"رسوم %":"Upfront Fee %"} tip="رسوم القرض المقدمة كنسبة من مبلغ التمويل. تُدفع مرة واحدة عند السحب\nUpfront loan fee as percentage of debt amount. Paid once at drawdown"><Inp type="number" value={cfg.upfrontFeePct} onChange={v=>upCfg({upfrontFeePct:v})} /></FL>
                <FL label={ar?"سداد":"Repayment"} tip="Amortizing = أقساط دورية تقلل الرصيد. Bullet = سداد الأصل دفعة واحدة بالنهاية\nAmortizing = regular installments. Bullet = principal at end">
                  <Drp lang={lang} value={cfg.repaymentType} onChange={v=>upCfg({repaymentType:v})} options={[{value:"amortizing",en:"Amortizing",ar:"أقساط"},{value:"bullet",en:"Bullet",ar:"دفعة واحدة"}]} />
                </FL>
              </div>
              <FL label={ar?"هيكل":"Structure"} tip="مرابحة = تكلفة + ربح (الأشيع). إجارة = تأجير منتهي بالتملك\nMurabaha = cost-plus (common). Ijara = lease-to-own">
                <Drp lang={lang} value={cfg.islamicMode} onChange={v=>upCfg({islamicMode:v})} options={[{value:"conventional",en:"Conventional",ar:"تقليدي"},{value:"murabaha",en:"Murabaha",ar:"مرابحة"},{value:"ijara",en:"Ijara",ar:"إجارة"}]} />
              </FL>
            </>}
          </>;
        })()}</AB>

        {/* ── SECTION: EXIT STRATEGY ── */}
        <AH id="exit" color="#8b5cf6" label={ar?"التخارج":"Exit Strategy"} summary={hasDbt ? `${({sale:ar?"بيع":"Sale",caprate:ar?"رسملة":"Cap Rate",hold:ar?"احتفاظ":"Hold"})[cfg.exitStrategy||"sale"]||""}${notHold?` · ${ar?"سنة":"Yr"} ${cfg.exitYear||"auto"}`:""}`  : ""} visible={hasDbt} />
        <AB id="exit" visible={hasDbt}>
          <FL label={ar?"استراتيجية التخارج":"Exit Strategy"} tip="بيع الأصل = تخارج في سنة محددة. احتفاظ بالدخل = بدون بيع\nAsset Sale = exit at a set year. Hold for Income = no sale event">
            <Drp lang={lang} value={cfg.exitStrategy||"sale"} onChange={v=>upCfg({exitStrategy:v})} options={[{value:"sale",en:"Sale (Multiple)",ar:"بيع (مضاعف)"},{value:"caprate",en:"Sale (Cap Rate)",ar:"بيع (رسملة)"},{value:"hold",en:"Hold",ar:"احتفاظ"}]} />
          </FL>
          {notHold&&<>
            <div style={g2}>
              <FL label={ar?"سنة التخارج":"Exit Year"} hint="0 = auto" tip="سنة بيع الأصل. عادة 5-10 سنوات بعد الاستقرار التشغيلي. 0 = تلقائي\nYear of asset sale. Usually 5-10 years after stabilization. 0 = auto"><Inp type="number" value={cfg.exitYear} onChange={v=>upCfg({exitYear:v})} /></FL>
              {(cfg.exitStrategy||"sale")==="sale"&&<FL label={ar?"المضاعف":"Multiple (x)"} tip="قيمة البيع = الإيجار × المضاعف. عادة 8x-15x\nSale price = Rent × Multiple. Usually 8x-15x"><Inp type="number" value={cfg.exitMultiple} onChange={v=>upCfg({exitMultiple:v})} /></FL>}
              {cfg.exitStrategy==="caprate"&&<FL label={ar?"معدل الرسملة %":"Cap Rate %"} tip="قيمة التخارج = NOI / Cap Rate. في السعودية 7-10% للأصول المستقرة\nExit = NOI / Cap Rate. Saudi stabilized: 7-10%"><Inp type="number" value={cfg.exitCapRate} onChange={v=>upCfg({exitCapRate:v})} /></FL>}
            </div>
            <FL label={ar?"تكاليف التخارج %":"Exit Cost %"} tip="تكاليف البيع مثل السمسرة والاستشارات القانونية. عادة 1.5-3% من سعر البيع\nSale costs like brokerage and legal fees. Typically 1.5-3% of sale price"><Inp type="number" value={cfg.exitCostPct} onChange={v=>upCfg({exitCostPct:v})} /></FL>
          </>}
        </AB>

        {/* ── SECTION: LAND & EQUITY ── */}
        <AH id="land" color="#8b5cf6" label={ar?"الأرض والملكية":"Land & Equity"} summary={hasEq ? `${cfg.landCapitalize?(ar?"مرسملة":"Cap"):""} · GP ${cfg.gpEquityManual||"auto"}` : ""} visible={hasEq} />
        <AB id="land" visible={hasEq}>
          <FL label={ar?"رسملة الأرض؟":"Capitalize Land?"} tip="تحويل قيمة الأرض إلى حصة Equity في الحسابات التمويلية\nConvert leasehold land value to equity in financing calculations">
            <Drp lang={lang} value={cfg.landCapitalize?"Y":"N"} onChange={v=>upCfg({landCapitalize:v==="Y"})} options={["Y","N"]} />
          </FL>
          {cfg.landCapitalize&&<>
            <div style={g2}>
              <FL label={ar?"سعر/م²":"Rate/sqm"} tip="سعر تقييم الأرض للمتر المربع عند رسملتها كـ Equity. يفضل أن يكون محافظاً\nLand value per sqm for equity capitalization. Should be based on conservative appraisal" hint={`= ${fmt((project.landArea||0)*(cfg.landCapRate||1000))} ${cur}`}><Inp type="number" value={cfg.landCapRate} onChange={v=>upCfg({landCapRate:v})} /></FL>
              <FL label={ar?"رسملة الأرض لصالح":"Land Cap Credit To"} tip="من يحصل على حصة الأرض المرسملة كـ Equity: المطور (GP) أو المستثمر (LP) أو مقسمة بالتساوي\nWho gets land capitalization as equity credit: Developer (GP), Investor (LP), or split 50/50"><Drp lang={lang} value={cfg.landCapTo||"gp"} onChange={v=>upCfg({landCapTo:v})} options={[{value:"gp",en:"Developer (GP)",ar:"المطور (GP)"},{value:"lp",en:"Investor (LP)",ar:"المستثمر (LP)"},{value:"split",en:"Split 50/50",ar:"مقسمة 50/50"}]} /></FL>
            </div>
            {project.landType==="lease"&&<FL label={ar?"من يدفع إيجار الأرض؟":"Who Pays Land Rent?"} tip="بعد رسملة الأرض: صاحب الأرض = اللي رسمل الأرض يدفع الإيجار تلقائياً. المشروع = الكل يتحمل. أو اختر يدوياً\nAfter capitalizing: Auto = whoever capitalized pays. Project = all bear cost. Or choose manually"><Drp lang={lang} value={cfg.landRentPaidBy||"auto"} onChange={v=>upCfg({landRentPaidBy:v})} options={[{value:"auto",en:"Auto (land cap owner)",ar:"تلقائي (صاحب الأرض)"},{value:"project",en:"Project (all bear cost)",ar:"المشروع (الكل يتحمل)"},{value:"gp",en:"Developer (GP)",ar:"المطور (GP)"},{value:"lp",en:"Investor (LP)",ar:"المستثمر (LP)"}]} /></FL>}
          </>}
          <div style={g2}>
            <FL label={ar?"حصة المطور (GP)":"Developer Equity (GP)"} hint="0=auto" tip="مساهمة المطور النقدية في الصندوق. عادة 5-30% من إجمالي Equity\nDeveloper cash contribution to the fund. Usually 5-30% of total equity"><Inp type="number" value={cfg.gpEquityManual} onChange={v=>upCfg({gpEquityManual:v})} /></FL>
            {isFundMode&&<FL label={ar?"حصة الممول (LP)":"Investor Equity (LP)"} hint="0=auto" tip="رأس مال المستثمرين الخارجيين. عادة 70-95% من Equity مع أولوية عائد تفضيلي\nOutside investor capital. Usually 70-95% of equity with preferred return priority"><Inp type="number" value={cfg.lpEquityManual} onChange={v=>upCfg({lpEquityManual:v})} /></FL>}
          </div>
        </AB>

        {/* ── SECTION: FUND STRUCTURE ── */}
        <AH id="fund" color="#16a34a" label={ar?"هيكل الصندوق":"Fund Structure"} summary={isFundMode ? `${({fund:ar?"صندوق":"Fund",direct:ar?"مباشر":"Direct",spv:"SPV"})[cfg.vehicleType]||""} · ${cfg.gpIsFundManager===false?(ar?"مدير مستقل":"Sep. Mgr"):(ar?"المطور = المدير":"GP = Mgr")}` : ""} visible={isFundMode} />
        <AB id="fund" visible={isFundMode}>
          <div style={g2}>
            <FL label={ar?"الهيكل القانوني":"Vehicle"} tip="نوع الوعاء مثل صندوق خاص أو SPV أو مشروع مشترك. يؤثر على الحوكمة والمتطلبات النظامية\nVehicle type such as private fund, SPV, or JV. Affects governance and regulatory requirements"><Drp lang={lang} value={cfg.vehicleType} onChange={v=>upCfg({vehicleType:v})} options={[{value:"fund",en:"Fund",ar:"صندوق"},{value:"direct",en:"Direct",ar:"مباشر"},{value:"spv",en:"SPV",ar:"SPV"}]} /></FL>
            {cfg.vehicleType==="fund"&&<FL label={ar?"اسم الصندوق":"Fund Name"} tip="الاسم القانوني أو التشغيلي للصندوق. للعرض والتقارير فقط\nLegal or operating fund name. For display and reports only"><Inp value={cfg.fundName} onChange={v=>upCfg({fundName:v})} /></FL>}
          </div>
          <div style={g2}>
            <FL label={ar?"سنة بداية الصندوق":"Fund Start"} hint="0=auto" tip="سنة بدء جمع رأس المال. غالباً قبل البناء بسنة لتغطية التأسيس\nYear capital raising begins. Often one year before construction for setup costs"><Inp type="number" value={cfg.fundStartYear} onChange={v=>upCfg({fundStartYear:v})} /></FL>
            <FL label={ar?"المطور = مدير الصندوق؟":"GP = Fund Manager?"} tip={ar?"نعم: المطور يدير الصندوق ويستلم كل الرسوم (تطوير + إدارة + هيكلة)\nلا: شركة مالية مستقلة تدير الصندوق. المطور يأخذ رسوم التطوير فقط":"Yes: Developer manages the fund and receives all fees\nNo: Separate financial company manages. Developer gets dev fee only"}>
              <Drp lang={lang} value={cfg.gpIsFundManager===false?"N":"Y"} onChange={v=>upCfg({gpIsFundManager:v==="Y"})} options={[{value:"Y",en:"Yes (GP = Manager)",ar:"نعم (المطور = المدير)"},{value:"N",en:"No (Separate Manager)",ar:"لا (مدير مستقل)"}]} />
            </FL>
          </div>
        </AB>

        {/* ── SECTION: WATERFALL ── */}
        <AH id="wf" color="#16a34a" label={ar?"الشلال":"Waterfall"} summary={isFundMode ? `Pref ${cfg.prefReturnPct||10}% · Carry ${cfg.carryPct||20}%` : ""} visible={isFundMode} />
        <AB id="wf" visible={isFundMode}>
          <div style={g2}>
            <FL label={ar?"العائد التفضيلي %":"Pref Return %"} tip="الحد الأدنى للعائد السنوي لـ LP قبل مشاركة GP. عادة 8-15%\nMinimum annual return for LP before GP shares profits. Usually 8-15%"><Inp type="number" value={cfg.prefReturnPct} onChange={v=>upCfg({prefReturnPct:v})} /></FL>
            <FL label={ar?"حافز الأداء % (Carry)":"Performance Carry %"} tip="نسبة أرباح GP بعد تجاوز العائد التفضيلي. عادة 20-30%\nGP profit share after pref return is met. Usually 20-30%"><Inp type="number" value={cfg.carryPct} onChange={v=>upCfg({carryPct:v})} /></FL>
          </div>
          <div style={g3}>
            <FL label={ar?"نسبة توزيع الممول (LP)":"Investor Split % (LP)"} tip="نسبة الأرباح المتبقية للمستثمر بعد Pref و catch-up. عادة 70-80%\nLP share of remaining profits after pref and catch-up. Usually 70-80%"><Inp type="number" value={cfg.lpProfitSplitPct} onChange={v=>upCfg({lpProfitSplitPct:v})} /></FL>
            <FL label={ar?"تعويض المطور (GP Catch-up)":"Developer Catch-up (GP)"} tip="بعد حصول LP على Pref، يأخذ GP حصة أكبر مؤقتاً حتى يصل للنسبة المتفق عليها\nAfter LP receives pref, GP takes a larger temporary share until agreed economics are reached"><Drp lang={lang} value={cfg.gpCatchup?"Y":"N"} onChange={v=>upCfg({gpCatchup:v==="Y"})} options={["Y","N"]} /></FL>
            <FL label={ar?"معاملة الرسوم":"Fee Treatment"} tip={ar?"رأسمال: الرسوم تُسترد + تحصل عائد تفضيلي\nاسترداد فقط: تُسترد لكن بدون عائد تفضيلي\nمصروف: لا تُسترد ولا تحصل عائد":"Capital: fees earn ROC + Pref\nROC Only: fees returned but no Pref\nExpense: fees not returned, no Pref"}><select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fff",fontSize:13}}><option value="capital">{ar?"رأسمال (استرداد + Pref)":"Capital (ROC + Pref)"}</option><option value="rocOnly">{ar?"استرداد فقط (بدون Pref)":"ROC Only (no Pref)"}</option><option value="expense">{ar?"مصروف (لا استرداد)":"Expense (no ROC)"}</option></select></FL>
          </div>
        </AB>

        {/* ── SECTION: FEES ── */}
        <AH id="fees" color="#f59e0b" label={ar?"الرسوم":"Fees"} summary={isFundMode && cfg.vehicleType==="fund" ? (ar?"11 رسم":"11 fees") : hasEq ? (ar?"رسوم التطوير":"Dev Fee") : ""} visible={hasEq || isFundMode} />
        <AB id="fees" visible={hasEq || isFundMode}>{(() => {
          if (isFundMode && cfg.vehicleType==="fund") return <>
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8}}>{ar?"رسوم لمرة واحدة":"One-time"}</div>
            <div style={g3}>
              <FL label={ar?"اكتتاب %":"Subscription %"} tip="رسوم دخول لمرة واحدة عند اكتتاب المستثمر. عادة 1-2% من المبلغ المستثمر\nOne-time entry fee at subscription. Usually 1-2% of invested capital" hint={ar?"مرة واحدة · عند الاكتتاب":"One-time · at subscription"}><Inp type="number" value={cfg.subscriptionFeePct} onChange={v=>upCfg({subscriptionFeePct:v})} /></FL>
              <FL label={ar?"هيكلة %":"Structuring %"} tip="نسبة من حجم الصندوق تُدفع لمرة واحدة لمدير الصندوق مقابل ترتيب الفرصة ودراسات الجدوى\nOne-time fee for deal sourcing, due diligence, and fund setup" hint={ar?"مرة واحدة · من حجم الصندوق":"One-time · % of fund size"}><Inp type="number" value={cfg.structuringFeePct} onChange={v=>upCfg({structuringFeePct:v})} /></FL>
              <FL label={ar?"سقف الهيكلة":"Structuring Cap"} tip="الحد الأقصى لرسوم الهيكلة. 0 = بدون سقف\nMax structuring fee amount. 0 = no cap" hint={ar?"حد أقصى · 0 = بدون سقف":"Max amount · 0 = no cap"}><Inp type="number" value={cfg.structuringFeeCap} onChange={v=>upCfg({structuringFeeCap:v})} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"ما قبل التأسيس":"Pre-Establishment"} tip="مصاريف إعداد مستندات الصندوق وتقديمها لهيئة السوق المالية. تُدفع مرة واحدة بعد الإقفال الأولي\nFund document preparation and CMA filing. One-time after initial closing" hint={ar?"مرة واحدة":"One-time"}><Inp type="number" value={cfg.preEstablishmentFee} onChange={v=>upCfg({preEstablishmentFee:v})} /></FL>
              <FL label={ar?"إنشاء SPV":"SPV Fee"} tip="رسوم تأسيس الشركة ذات الغرض الخاص. تُدفع مرة واحدة عند بدء التأسيس\nSPV incorporation fee. One-time at setup" hint={ar?"مرة واحدة":"One-time"}><Inp type="number" value={cfg.spvFee} onChange={v=>upCfg({spvFee:v})} /></FL>
              <div />
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8}} />
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8}}>{ar?"رسوم سنوية":"Annual"}</div>
            <div style={g2}>
              <FL label={ar?"إدارة %":"Management %"} tip="أتعاب إدارية سنوية من صافي أصول الصندوق (NAV). تُستحق وتسدد بشكل ربع سنوي\nAnnual management fee based on fund NAV. Paid quarterly" hint={ar?"سنوي · من صافي الأصول":"Annual · based on NAV"}><Inp type="number" value={cfg.annualMgmtFeePct} onChange={v=>upCfg({annualMgmtFeePct:v})} /></FL>
              <FL label={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} tip="أساس حساب رسوم الإدارة:\n- صافي الأصول (NAV): القيمة الصافية للصندوق\n- CAPEX تراكمي: المبالغ المنفذة فعلياً\n- تكلفة التطوير: إجمالي التكلفة\n- رأس المال: الملكية الإجمالية"><Drp lang={lang} value={cfg.mgmtFeeBase||"nav"} onChange={v=>upCfg({mgmtFeeBase:v})} options={[{value:"nav",en:"Fund NAV",ar:"صافي أصول الصندوق"},{value:"deployed",en:"Deployed CAPEX",ar:"CAPEX المنفذ"},{value:"devCost",en:"Dev Cost",ar:"تكلفة التطوير"},{value:"equity",en:"Equity",ar:"رأس المال"}]} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"سقف الإدارة/سنة":"Mgmt Cap/yr"} tip="الحد الأقصى لرسوم الإدارة سنوياً. 0 = بدون سقف\nMax annual management fee. 0 = no cap" hint={ar?"حد أقصى سنوي · 0 = بدون سقف":"Max annual · 0 = no cap"}><Inp type="number" value={cfg.mgmtFeeCapAnnual} onChange={v=>upCfg({mgmtFeeCapAnnual:v})} /></FL>
              <FL label={ar?"رسوم الحفظ/سنة":"Custody/yr"} tip="رسوم سنوية لأمين الحفظ. تُدفع نصف سنوي\nAnnual custody fee. Paid semi-annually" hint={ar?"سنوي · نصف سنوي":"Annual · semi-annual"}><Inp type="number" value={cfg.custodyFeeAnnual} onChange={v=>upCfg({custodyFeeAnnual:v})} /></FL>
              <FL label={ar?"مراجع حسابات/سنة":"Auditor/yr"} tip="أتعاب سنوية لمراجع الحسابات. تُدفع نصف سنوي بعد كل تقييم\nAnnual auditor fee. Paid semi-annually after each valuation" hint={ar?"سنوي":"Annual"}><Inp type="number" value={cfg.auditorFeeAnnual} onChange={v=>upCfg({auditorFeeAnnual:v})} /></FL>
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8}} />
            <div style={{fontSize:10,fontWeight:600,color:"#9ca3af",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8}}>{ar?"مرتبطة بالبناء":"Construction-linked"}</div>
            <FL label={ar?"رسوم التطوير %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية (عقد المقاول). تُدفع متزامنة مع مستخلصات المقاول\nDeveloper fee as % of construction costs. Paid with contractor draws" hint={ar?"مع مستخلصات البناء":"With construction draws"}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>
          </>;
          if (isFundMode) return <FL label={ar?"رسوم التطوير %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية (عقد المقاول). تُدفع متزامنة مع مستخلصات المقاول\nDeveloper fee as % of construction costs. Paid with contractor draws" hint={ar?"مع مستخلصات البناء":"With construction draws"}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>;
          // Debt + Equity mode (not fund)
          return <FL label={ar?"رسوم التطوير %":"Dev Fee %"} tip="أتعاب المطور كنسبة من CAPEX. عادة 3-7%\nDeveloper fee as % of CAPEX. Usually 3-7%"><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>;
        })()}</AB>

        {/* Self-funded message */}
        {cfg.finMode === "self" && <div style={{padding:"20px 18px",textAlign:"center",color:"#9ca3af",fontSize:12}}>{ar?"لا يوجد تمويل خارجي":"No external financing"}</div>}
        </div>;
      })()}
    </div>


    {/* ═══ FINANCING RESULTS (KPIs + tables) ═══ */}
    {!f ? (
      <div style={{textAlign:"center",padding:32,color:"#9ca3af"}}>{ar?"اضبط إعدادات التمويل أعلاه":"Configure financing settings above"}</div>
    ) : (<>

    {/* ── Collapsible Section Helper ── */}
    {(() => {
      const Sec = ({id, icon, title, titleAr, color, children, alwaysOpen, badge}) => {
        const open = alwaysOpen || isOpen(id);
        return <div style={{background:"#fff",borderRadius:10,border:`1px solid ${open?color+"33":"#e5e7ec"}`,marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
          <div onClick={alwaysOpen?undefined:()=>toggle(id)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:alwaysOpen?"default":"pointer",background:open?color+"08":"#f8f9fb",borderBottom:open?`1px solid ${color}22`:"none",userSelect:"none"}}>
            <span style={{fontSize:14}}>{icon}</span>
            <span style={{fontSize:13,fontWeight:700,color:"#1a1d23",flex:1}}>{ar?titleAr:title}</span>
            {badge && <span style={{fontSize:10,fontWeight:600,color:color,background:color+"18",padding:"2px 8px",borderRadius:10}}>{badge}</span>}
            {!alwaysOpen && <span style={{fontSize:11,color:"#9ca3af",transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>{open?"▼":"▶"}</span>}
          </div>
          {open && <div style={{padding:"12px 16px"}}>{children}</div>}
        </div>;
      };

      // Get waterfall for selected phase
      const w = (selectedPhase !== "all" && phaseWaterfalls?.[selectedPhase]) ? phaseWaterfalls[selectedPhase] : waterfall;
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
        total: w.totalFees || 0,
        unfunded: (w.unfundedFees||[]).reduce((a,b)=>a+b,0),
      } : null;

      // Total financing cost = interest + fees
      const totalFinCost = f.totalInterest + (feeData ? feeData.total : 0) + (f.upfrontFee || 0);
      const finCostPct = f.devCostInclLand > 0 ? totalFinCost / f.devCostInclLand : 0;

      // Stable income for yield
      const stableIncome = c.income.find((v,i) => i > (f.constrEnd||0) && v > 0) || 0;
      const cashOnCash = f.totalEquity > 0 && stableIncome > 0 ? stableIncome / f.totalEquity : 0;

      return <>
      {/* LP = 0 warning */}
      {f.lpEquity === 0 && project.finMode !== "self" && (
        <div style={{background:"#fef3c7",borderRadius:8,border:"1px solid #fde68a",padding:"12px 16px",marginBottom:14,fontSize:12,color:"#92400e"}}>
          <strong>⚠ {ar?"LP Equity = صفر":"LP Equity = 0"}</strong><br/>
          {ar ? "لا يوجد مستثمرين (LP). لتفعيل LP: فعّل رسملة الأرض أو أدخل GP Equity يدوياً" : "No investor equity. Enable Land Capitalization or enter GP Equity manually."}
        </div>
      )}

      {/* ═══ SECTION 1: KEY METRICS (always open) ═══ */}
      <Sec id="kpi" icon="📊" title="Key Metrics" titleAr="المؤشرات الرئيسية" color="#2563eb" alwaysOpen>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(145px, 1fr))",gap:10}}>
          <KPI label={ar?"تكلفة التطوير (شامل الأرض)":"Dev Cost (Incl Land)"} value={fmtM(f.devCostInclLand)} sub={cur} color="#1a1d23" />
          <KPI label={ar?"سقف الدين":"Max Debt (LTV)"} value={fmtM(f.maxDebt)} sub={`${cfg.maxLtvPct||70}% LTV`} color="#ef4444" />
          <KPI label={ar?"إجمالي الملكية":"Total Equity"} value={fmtM(f.totalEquity)} sub={fmtPct((1-(f.totalDebt/(f.devCostInclLand||1)))*100)} color="#3b82f6" />
          <KPI label={ar?"IRR بعد التمويل":"Levered IRR"} value={f.leveredIRR!==null?fmtPct(f.leveredIRR*100):"N/A"} color={f.leveredIRR>0.12?"#16a34a":"#f59e0b"} />
          <KPI label={ar?"إجمالي تكلفة التمويل":"Total Financing Cost"} value={fmtM(totalFinCost)} sub={finCostPct>0?fmtPct(finCostPct*100)+" "+ar?"من التكلفة":"of cost":""} color="#ef4444" tip={ar?"فوائد + رسوم قرض + رسوم صندوق\nInterest + Upfront Fee + Fund Fees":""} />
          <KPI label={ar?"عائد نقدي سنوي":"Cash-on-Cash Yield"} value={cashOnCash>0?fmtPct(cashOnCash*100):"—"} color={cashOnCash>0.08?"#16a34a":"#f59e0b"} />
          {isFund && feeData && <KPI label={ar?"إجمالي الرسوم":"Total Fund Fees"} value={fmtM(feeData.total)} sub={f.devCostInclLand>0?fmtPct(feeData.total/f.devCostInclLand*100)+" "+ar?"من التكلفة":"of cost":""} color="#f59e0b" />}
          <KPI label={ar?"إجمالي الفوائد":"Total Interest"} value={fmtM(f.totalInterest)} sub={cur} color="#ef4444" />
        </div>
      </Sec>

      {/* ═══ SECTION 2: CAPITAL STRUCTURE (collapsible) ═══ */}
      <Sec id="capital" icon="🏗" title="Capital Structure" titleAr="هيكل رأس المال" color="#3b82f6" badge={`${fmtM(f.devCostInclLand)}`}>
        {/* Sources & Uses */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {f.totalDebt > 0 && <><span style={{color:"#6b7080"}}>{ar?"الدين البنكي":"Bank Debt"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.totalDebt)} <span style={{fontSize:10,color:"#9ca3af"}}>{fmtPct((f.totalDebt/(f.devCostInclLand||1))*100)}</span></span></>}
              {f.gpEquity > 0 && <><span style={{color:"#3b82f6"}}>{ar?"حصة المطور (GP)":"GP Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.gpEquity)} <span style={{fontSize:10,color:"#9ca3af"}}>{fmtPct(f.gpPct*100)}</span></span></>}
              {f.lpEquity > 0 && <><span style={{color:"#8b5cf6"}}>{ar?"حصة الممول (LP)":"LP Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.lpEquity)} <span style={{fontSize:10,color:"#9ca3af"}}>{fmtPct(f.lpPct*100)}</span></span></>}
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.totalDebt + f.gpEquity + f.lpEquity)}</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"الاستخدامات":"USES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"#6b7080"}}>{ar?"تكاليف البناء":"Construction Cost"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.devCostExclLand)}</span>
              {f.landCapValue > 0 && <><span style={{color:"#6b7080"}}>{ar?"رسملة الأرض":"Land Capitalization"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.landCapValue)}</span></>}
              {f.upfrontFee > 0 && <><span style={{color:"#6b7080"}}>{ar?"رسوم القرض":"Upfront Fee"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.upfrontFee)}</span></>}
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.devCostInclLand)}</span>
            </div>
          </div>
        </div>
        {/* Equation */}
        <div style={{background:"#f0f4ff",borderRadius:6,padding:"8px 14px",fontSize:12}}>
          <strong>{ar?"المعادلة":"Equation"}:</strong>{" "}
          {ar?"دين":"Debt"} ({fmtM(f.totalDebt)}) + GP ({fmtM(f.gpEquity)}) + LP ({fmtM(f.lpEquity)}) = {fmtM(f.totalDebt + f.gpEquity + f.lpEquity)}{" "}
          {Math.abs((f.totalDebt + f.gpEquity + f.lpEquity) - f.devCostInclLand) < 1000
            ? <span style={{color:"#16a34a",fontWeight:600}}>✓</span>
            : <span style={{color:"#ef4444",fontWeight:600}}>✗ ≠ {fmtM(f.devCostInclLand)}</span>}
        </div>
      </Sec>

      {/* ═══ SECTION 3: FINANCING COSTS (collapsible) ═══ */}
      {!isSelf && <Sec id="costs" icon="💸" title={isFund?"Fund Fees & Financing Costs":"Financing Costs"} titleAr={isFund?"رسوم الصندوق وتكاليف التمويل":"تكاليف التمويل"} color="#f59e0b" badge={fmtM(totalFinCost)}>
        <div style={{display:"grid",gridTemplateColumns:isFund&&!isMobile?"1fr 1fr":"1fr",gap:14}}>
          {/* Bank/Debt Costs */}
          {f.totalDebt > 0 && <div>
            <div style={{fontSize:11,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"تكلفة الدين":"DEBT COSTS"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"#6b7080"}}>{ar?"إجمالي الفوائد":"Total Interest"}</span><span style={{textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmt(f.totalInterest)}</span>
              <span style={{color:"#6b7080"}}>{ar?"رسوم القرض المقدمة":"Upfront Loan Fee"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.upfrontFee||0)} <span style={{fontSize:10,color:"#9ca3af"}}>{cfg.upfrontFeePct||0}%</span></span>
              <span style={{color:"#6b7080"}}>{ar?"معدل التمويل":"Finance Rate"}</span><span style={{textAlign:"right",fontWeight:600}}>{cfg.financeRate||0}%</span>
              <span style={{color:"#6b7080"}}>{ar?"المدة":"Tenor"}</span><span style={{textAlign:"right",fontWeight:500}}>{cfg.loanTenor} {ar?"سنة":"yrs"} ({cfg.debtGrace} {ar?"سماح":"grace"})</span>
              <span style={{color:"#6b7080"}}>{ar?"السداد يبدأ":"Repay Starts"}</span><span style={{textAlign:"right",fontWeight:500}}>{sy + f.repayStart}</span>
              <span style={{color:"#6b7080"}}>{ar?"نوع السداد":"Repay Type"}</span><span style={{textAlign:"right",fontWeight:500}}>{cfg.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700,color:"#ef4444"}}>{ar?"إجمالي تكلفة الدين":"Total Debt Cost"}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700,color:"#ef4444"}}>{fmt(f.totalInterest + (f.upfrontFee||0))}</span>
            </div>
          </div>}

          {/* Fund Fees */}
          {isFund && feeData && <div>
            <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fde68a"}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
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
              ].filter(x=>x.v>0).map((x,i)=>[
                <span key={i+"l"} style={{color:"#6b7080"}}>{x.l} <span style={{fontSize:9,color:"#b0b5c0"}}>{x.hint}</span></span>,
                <span key={i+"v"} style={{textAlign:"right",fontWeight:500}}>{fmt(x.v)} {x.pct?<span style={{fontSize:10,color:"#9ca3af"}}>{x.pct}%</span>:""}</span>
              ])}
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700,color:"#f59e0b"}}>{ar?"إجمالي الرسوم":"Total Fees"}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700,color:"#f59e0b"}}>{fmt(feeData.total)}</span>
              {feeData.unfunded > 0 && <><span style={{color:"#92400e",fontSize:11}}>{ar?"رسوم ممولة من Equity":"Equity-Funded Fees"}</span><span style={{textAlign:"right",fontWeight:500,fontSize:11,color:"#92400e"}}>{fmt(feeData.unfunded)}</span></>}
            </div>
          </div>}
        </div>

        {/* Total Financing Cost Summary */}
        <div style={{marginTop:12,background:"#fefce8",borderRadius:6,padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr auto",gap:"6px 20px",fontSize:12,maxWidth:520}}>
          <span style={{fontWeight:700}}>{ar?"إجمالي تكلفة التمويل الكلية":"TOTAL FINANCING COST"}</span>
          <span style={{textAlign:"right",fontWeight:800,fontSize:14,color:"#ef4444"}}>{fmt(totalFinCost)} {cur}</span>
          <span style={{fontSize:11,color:"#6b7080"}}>{ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost"}</span>
          <span style={{textAlign:"right",fontWeight:600,color:"#a16207"}}>{fmtPct(finCostPct*100)}</span>
        </div>
      </Sec>}

      {/* ═══ SECTION 4: DEBT SERVICE & DSCR (collapsible) ═══ */}
      {f.totalDebt > 0 && <Sec id="dscr" icon="🏦" title="Debt Service & DSCR" titleAr="خدمة الدين و DSCR" color="#3b82f6">
        {/* Debt Structure Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,fontSize:12,marginBottom:14}}>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"الهيكل":"Structure"}</span><strong>{cfg.islamicMode==="conventional"?(ar?"تقليدي":"Conventional"):(ar?"مرابحة":"Murabaha")} - {cfg.repaymentType==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</strong></div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"المدة":"Tenor"}</span><strong>{cfg.loanTenor} {ar?"سنة":"yrs"}</strong> <span style={{fontSize:10,color:"#9ca3af"}}>({cfg.debtGrace} {ar?"سماح":"grace"} + {f.repayYears} {ar?"سداد":"repay"})</span></div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"بداية السداد":"Repay Starts"}</span><strong>{sy + f.repayStart}</strong></div>
          <div style={{background:"#f8f9fb",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"#6b7080",display:"block"}}>{ar?"التخارج":"Exit"}</span><strong>{f.exitYear}</strong> ({cfg.exitMultiple}x)</div>
        </div>
        {/* DSCR pills */}
        <div style={{fontSize:12,fontWeight:600,marginBottom:8}}><Tip text={ar?"صافي الدخل التشغيلي / خدمة الدين. البنوك تطلب 1.25x كحد أدنى":"NOI / Debt Service. Banks require min 1.25x"}>DSCR</Tip></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {years.filter(y=>f.dscr[y]!==null).map(y=>{
            const v = f.dscr[y];
            const bg = v >= 1.5 ? "#dcfce7" : v >= 1.2 ? "#fef9c3" : v >= 1.0 ? "#ffedd5" : "#fef2f2";
            const fg = v >= 1.5 ? "#16a34a" : v >= 1.2 ? "#a16207" : v >= 1.0 ? "#c2410c" : "#ef4444";
            return <div key={y} style={{textAlign:"center",padding:"4px 8px",borderRadius:4,background:bg,minWidth:50}}>
              <div style={{fontSize:10,color:"#6b7080"}}>{sy+y}</div>
              <div style={{fontSize:13,fontWeight:700,color:fg}}>{v.toFixed(2)}x</div>
            </div>;
          })}
        </div>
        <div style={{fontSize:10,color:"#9ca3af"}}>🟢 ≥ 1.5x | 🟡 ≥ 1.2x | 🟠 ≥ 1.0x | 🔴 &lt; 1.0x</div>
      </Sec>}

      {/* ═══ SECTION 5: INTEGRATED CASH FLOW (always open) ═══ */}
      <Sec id="cf" icon="📋" title="Integrated Cash Flow" titleAr="التدفق النقدي المتكامل" color="#1e3a5f" alwaysOpen>
        <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:10}}>
          <div style={{flex:1,fontSize:11,color:"#6b7080"}}>{ar?"التدفق النقدي بعد خدمة الدين والرسوم":"Cash flow after debt service and fees"}</div>
          <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:12}}>
            {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"years"}</option>)}
          </select>
        </div>

        <div style={{borderRadius:8,border:"2px solid #1e3a5f",overflow:"hidden"}}>
          <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
            <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:180}}>{ar?"البند":"Line Item"}</th>
            <th style={{...thSt,textAlign:"right"}}>{ar?"الإجمالي":"Total"}</th>
            {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:80}}>{ar?`سنة ${y+1}`:`Yr ${y+1}`}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
          </tr></thead><tbody>
            {/* ── Project CF ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التدفق التشغيلي":"PROJECT CASH FLOW"}</td></tr>
            <CFRow label={ar?"الإيرادات":"Revenue"} values={c.income} total={c.totalIncome} color="#16a34a" />
            <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.totalLandRent} color="#ef4444" negate />
            <CFRow label={ar?"(-) تكاليف التطوير":"(-) CAPEX"} values={c.capex} total={c.totalCapex} color="#ef4444" negate />
            {(() => { const unlev = new Array(h).fill(0); for(let y=0;y<h;y++) unlev[y]=c.income[y]-c.landRent[y]-c.capex[y]; return <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered Net CF"} values={unlev} total={unlev.reduce((a,b)=>a+b,0)} bold />; })()}

            {/* ── Financing ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#3b82f6",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التمويل":"FINANCING"}</td></tr>
            <CFRow label={ar?"سحب الملكية":"Equity Calls"} values={f.equityCalls} total={f.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" />
            <CFRow label={ar?"سحب القرض":"Debt Drawdown"} values={f.drawdown} total={f.totalDebt} color="#3b82f6" />
            <CFRow label={ar?"(-) سداد أصل الدين":"(-) Repayment"} values={f.repayment} total={f.repayment.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
            <CFRow label={cfg.islamicMode==="conventional"?(ar?"(-) فوائد":"(-) Interest"):(ar?"(-) تكلفة التمويل":"(-) Profit Cost")} values={f.interest} total={f.totalInterest} color="#ef4444" negate />
            <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={f.debtService} total={f.debtService.reduce((a,b)=>a+b,0)} color="#dc2626" negate bold />
            {/* Debt balance */}
            <tr style={{background:"#f0f4ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:400,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>{ar?"رصيد الدين (بداية)":"Debt Balance (Open)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{f.debtBalOpen[y]===0?"—":fmt(f.debtBalOpen[y])}</td>)}
            </tr>
            <tr style={{background:"#f0f4ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:500,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>{ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
            </tr>

            {/* ── Fund Fees (if fund mode and waterfall available) ── */}
            {isFund && w && <>
              <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#f59e0b",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"رسوم الصندوق":"FUND FEES"}</td></tr>
              {(w.feeSub||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) اكتتاب":"(-) Subscription"} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeMgmt||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إدارة":"(-) Management"} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeCustody||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) حفظ":"(-) Custody"} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeDev||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) تطوير":"(-) Developer Fee"} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeStruct||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) هيكلة":"(-) Structuring"} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feePreEst||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) ما قبل التأسيس":"(-) Pre-Establishment"} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeSpv||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إنشاء SPV":"(-) SPV Setup"} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeAuditor||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مراجع حسابات":"(-) Auditor"} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              <CFRow label={ar?"= إجمالي الرسوم":"= Total Fees"} values={w.fees||[]} total={w.totalFees||0} color="#f59e0b" negate bold />
              {(w.unfundedFees||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
            </>}

            {/* ── Exit ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#8b5cf6",background:"#faf5ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التخارج":"EXIT"}</td></tr>
            <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={f.exitProceeds} total={f.exitProceeds.reduce((a,b)=>a+b,0)} color="#8b5cf6" />

            {/* ── Net Result ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb"}}>{ar?"النتيجة":"NET RESULT"}</td></tr>
            <CFRow label={ar?"= صافي التدفق الممول":"= Levered Net CF"} values={f.leveredCF} total={f.leveredCF.reduce((a,b)=>a+b,0)} bold />
            {(() => { let cum=0; return <tr style={{background:"#fffbeb"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:180}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
              <td style={tdN}></td>
              {years.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
            </tr>; })()}
            {/* DSCR */}
            <tr style={{background:"#fefce8"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#fefce8",zIndex:1,fontWeight:600,fontSize:11,color:"#a16207"}}>DSCR</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.5?"#16a34a":f.dscr[y]>=1.2?"#a16207":"#ef4444",fontWeight:600,fontSize:11}}>{f.dscr[y]===null?"—":f.dscr[y].toFixed(2)+"x"}</td>)}
            </tr>
          </tbody></table></div>
        </div>
      </Sec>
      </>;
    })()}
    </>)}
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

function ReDevModelerInner({ user, signOut, onSignIn }) {
  const isMobile = useIsMobile();
  const [view, setView] = useState("dashboard");
  const [projectIndex, setProjectIndex] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // default closed (mobile-friendly)
  const [activeTab, setActiveTab] = useState("dashboard");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lang, setLang] = useState("ar");
  useEffect(() => { document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  const [aiOpen, setAiOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
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
      catch { setSaveStatus("error"); }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [project, view]);

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
  const checks = useMemo(() => { try { return project && results ? runChecks(project, results, _legacyFinancing, _legacyWaterfall, incentivesResult) : []; } catch(e) { console.error("runChecks error:", e); return []; } }, [project, results, _legacyFinancing, _legacyWaterfall, incentivesResult]);

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
  const duplicateProject = async (id) => { const p = await loadProject(id); if (p) { const d={...p,id:crypto.randomUUID(),name:p.name+" (Copy)",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await saveProject(d); setProjectIndex(await loadProjectIndex()); }};
  const deleteProject = async (id) => { await deleteProjectStorage(id); setProjectIndex(await loadProjectIndex()); if (project?.id===id){setProject(null);setView("dashboard");} };

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
  const addAsset = useCallback(() => setProject(prev => { pushUndo(prev); return {...prev, assets:[...prev.assets, {
    id: crypto.randomUUID(), phase: prev.phases[0]?.name||"Phase 1", category:"Retail", name:"", code:"", notes:"",
    plotArea:0, footprint:0, gfa:0, revType:"Lease", efficiency: prev.defaultEfficiency||85,
    leaseRate:0, opEbitda:0, escalation: prev.rentEscalation||0.75, rampUpYears:3, stabilizedOcc:100,
    costPerSqm:0, constrStart:1, constrDuration:12, hotelPL:null, marinaPL:null,
  }]}; }), [pushUndo]);
  const rmAsset = useCallback((i) => setProject(prev => { pushUndo(prev); return {...prev, assets:prev.assets.filter((_,j)=>j!==i)}; }), [pushUndo]);
  const goBack = () => { setView("dashboard"); setProject(null); window.scrollTo(0,0); };

  if (loading) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:36,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>زان</span><span style={{width:1,height:30,background:"rgba(95,191,191,0.4)"}} /><span style={{fontSize:12,color:"#5fbfbf",fontWeight:300,lineHeight:1.3,textAlign:"start"}}>النمذجة<br/>المالية</span></div></div></div>;
  if (view === "dashboard") return <ProjectsDashboard index={projectIndex} onCreate={createProject} onOpen={openProject} onDup={duplicateProject} onDel={deleteProject} lang={lang} setLang={setLang} t={t} user={user} signOut={signOut} />;
  if (!project) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:"#f87171",letterSpacing:2}}>!</div><div style={{fontSize:14,color:"#d0d4dc",marginTop:8}}>{lang==="ar"?"لم يتم تحميل المشروع":"Project failed to load"}</div><button onClick={goBack} style={{marginTop:16,padding:"8px 20px",background:"#2563eb",color:"#fff",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{lang==="ar"?"رجوع":"Go Back"}</button></div></div>;

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} style={{display:"flex",height:"100vh",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#f8f9fb",color:"#1a1d23",fontSize:13}}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .hero-kpi { animation: fadeInUp 0.4s ease-out both; }
        .hero-kpi:nth-child(1) { animation-delay: 0s; }
        .hero-kpi:nth-child(2) { animation-delay: 0.08s; }
        .hero-kpi:nth-child(3) { animation-delay: 0.16s; }
        .hero-kpi:nth-child(4) { animation-delay: 0.24s; }
        .asset-card { animation: fadeInUp 0.3s ease-out both; transition: box-shadow 0.15s, border-color 0.15s; }
        .kpi-secondary { animation: fadeIn 0.5s ease-out both; animation-delay: 0.3s; }
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
      `}</style>
      {sidebarOpen && !presentMode && (
        <>
        {isMobile && <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:90,backdropFilter:"blur(2px)"}} />}
        <div className="sidebar-slide" style={{width:isMobile?"88vw":340,minWidth:isMobile?"auto":340,maxWidth:isMobile?400:340,background:"#0f1117",color:"#d0d4dc",display:"flex",flexDirection:"column",overflow:"hidden",...(isMobile?{position:"fixed",top:0,bottom:0,[lang==="ar"?"right":"left"]:0,zIndex:91,boxShadow:"4px 0 24px rgba(0,0,0,0.4)"}:{})}}>
          <div style={{padding:isMobile?"12px 14px":"14px 16px",borderBottom:"1px solid #1e2230",display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>زان</span><span style={{width:1,height:18,background:"#5fbfbf",opacity:0.5}} /><span style={{fontSize:9,color:"#5fbfbf",lineHeight:1.3,fontWeight:300}}>{lang==="ar"?"النمذجة":"Financial"}<br/>{lang==="ar"?"المالية":"Modeler"}</span></div>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:saveStatus==="saved"?"#dcfce7":saveStatus==="error"?"#2a0a0a":"#2a2a0a",color:saveStatus==="saved"?"#4ade80":saveStatus==="error"?"#f87171":"#fbbf24"}}>{t[saveStatus]||saveStatus}</span>
            {isMobile && <button onClick={()=>setSidebarOpen(false)} style={{background:"#1e2230",border:"none",borderRadius:6,color:"#9ca3af",fontSize:16,padding:"6px 10px",cursor:"pointer",minHeight:36,display:"flex",alignItems:"center"}}>✕</button>}
          </div>
          <div ref={sidebarRef} style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <ControlPanel project={project} up={up} t={t} lang={lang} results={results} />
          </div>
          <SidebarAdvisor project={project} results={results} financing={financing} waterfall={waterfall} incentivesResult={incentivesResult} lang={lang} setActiveTab={setActiveTab} />
        </div>
        </>
      )}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:48,minHeight:48,background:"#fff",borderBottom:"1px solid #e5e7ec",display:"flex",alignItems:"center",padding:"0 12px",gap:8}}>
          {/* Back to projects */}
          <button onClick={goBack} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"5px 10px",fontSize:11,flexShrink:0,border:"1px solid #e5e7ec"}}>{t.back}</button>
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
            if ((project?.assets||[]).some(a => benchmarkColor("costPerSqm",a.costPerSqm,a.category).color==="#ef4444")) _advWarn++;
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
              <button onClick={()=>setSidebarOpen(!sidebarOpen)} title={sidebarOpen?(lang==="ar"?"إخفاء اللوحة":"Hide Panel"):(lang==="ar"?"إظهار اللوحة":"Show Panel")} style={{...btnS,background:sidebarOpen?"#f0f4ff":"#f0f1f5",color:sidebarOpen?"#2563eb":"#6b7080",padding:"6px 10px",fontSize:14,flexShrink:0,position:"relative",border:sidebarOpen?"1px solid #bfdbfe":"1px solid transparent"}}>
                ☰
                {!sidebarOpen && _advWarn > 0 && <span style={{position:"absolute",top:2,right:2,width:8,height:8,borderRadius:4,background:"#ef4444",border:"1.5px solid #fff"}} />}
              </button>
            );
          })()}
          <div style={{flex:1,minWidth:0}}>
            <EditableCell value={project?.name||""} onChange={v=>up({name:v})} style={{border:"none",fontSize:isMobile?13:15,fontWeight:600,color:"#1a1d23",background:"transparent",width:"100%",padding:"4px 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} placeholder="Project Name" />
          </div>
          {project?._shared && <span style={{fontSize:9,padding:"3px 10px",borderRadius:4,fontWeight:600,background:project._permission==="view"?"#fef3c7":"#dbeafe",color:project._permission==="view"?"#92400e":"#1d4ed8",flexShrink:0}}>{project._permission==="view"?(lang==="ar"?"🔒 قراءة":"🔒 View"):(lang==="ar"?"✏️ مشارك":"✏️ Edit")}</span>}
          {!isMobile && <StatusBadge status={project?.status} onChange={s=>up({status:s})} />}
          {/* Undo */}
          <button onClick={undo} disabled={undoStack.current.length===0} title="Ctrl+Z" style={{...btnS,background:"transparent",color:undoStack.current.length>0?"#6b7080":"#d0d4dc",padding:"5px 8px",fontSize:14,flexShrink:0,border:"none",cursor:undoStack.current.length>0?"pointer":"default"}}>↩</button>
          {/* Primary: Present */}
          <button onClick={()=>{setPresentMode(!presentMode);if(!presentMode){setSidebarOpen(false);setActiveTab("dashboard");setLiveSliders({capex:100,rent:100,exitMult:project?.exitMultiple||10});}else{setSidebarOpen(true);}}} style={{...btnS,background:presentMode?"#16a34a":"#f0f4ff",color:presentMode?"#fff":"#2563eb",padding:"5px 10px",fontSize:10,fontWeight:600,border:presentMode?"none":"1px solid #bfdbfe",flexShrink:0}}>{presentMode?(lang==="ar"?"✏️ تعديل":"✏️ Edit"):(lang==="ar"?"🎯 عرض":"🎯 Present")}</button>
          {/* Dropdown menu */}
          {(() => {
            const [menuOpen, setMenuOpen] = [headerMenuOpen, setHeaderMenuOpen];
            return (
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setMenuOpen(!menuOpen)} style={{...btnS,background:menuOpen?"#f0f1f5":"transparent",color:"#4b5060",padding:"5px 8px",fontSize:16,fontWeight:500,border:"none"}}>⋮</button>
                {menuOpen && <>
                  <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:998}} />
                  <div style={{position:"absolute",top:"100%",marginTop:4,background:"#fff",border:"1px solid #e5e7ec",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:999,minWidth:200,padding:"6px 0",...(lang==="ar"?{left:0}:{right:0})}}>
                    {/* AI */}
                    <button onClick={()=>{setAiOpen(true);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"#1a1d23",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>🤖</span> {lang==="ar"?"مساعد AI":"AI Assistant"}
                    </button>
                    {/* Status (mobile only - hidden from header) */}
                    {isMobile && <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
                      <span style={{fontSize:12,color:"#6b7080"}}>{lang==="ar"?"الحالة":"Status"}</span>
                      <StatusBadge status={project?.status} onChange={s=>{up({status:s});setMenuOpen(false);}} />
                    </div>}
                    {/* User email (mobile only) */}
                    {isMobile && user && <div style={{padding:"4px 16px 8px",fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
                    {/* Divider */}
                    <div style={{height:1,background:"#f0f1f5",margin:"4px 0"}} />
                    {/* Scenario */}
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
                      <span style={{fontSize:12,color:"#6b7080"}}>{lang==="ar"?"السيناريو":"Scenario"}</span>
                      <select value={project?.activeScenario||"Base Case"} onChange={e=>{up({activeScenario:e.target.value});}} style={{flex:1,padding:"4px 6px",fontSize:11,borderRadius:4,border:"1px solid #e5e7ec",background:project?.activeScenario!=="Base Case"?"#fef3c7":"#f8f9fb",color:project?.activeScenario!=="Base Case"?"#92400e":"#4b5060",fontFamily:"inherit",cursor:"pointer"}}>
                        {SCENARIOS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* Language */}
                    <button onClick={()=>{setLang(lang==="en"?"ar":"en");setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"#1a1d23",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>{lang==="en"?"🌐":"🌐"}</span> {lang==="en"?"العربية (Arabic)":"English"}
                    </button>
                    {/* Divider */}
                    <div style={{height:1,background:"#f0f1f5",margin:"4px 0"}} />
                    {/* Share */}
                    {!project?._shared && <button onClick={()=>{setShareModalOpen(true);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"#1a1d23",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>📤</span> {lang==="ar"?"مشاركة":"Share"} {project?.sharedWith?.length>0&&<span style={{marginLeft:"auto",fontSize:10,background:"#dbeafe",color:"#2563eb",padding:"1px 6px",borderRadius:8}}>{project.sharedWith.length}</span>}
                    </button>}
                    {/* Sign Out */}
                    {signOut && <button onClick={()=>{signOut();setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"#ef4444",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>↪</span> {lang==="ar"?"تسجيل خروج":"Sign Out"}
                    </button>}
                  </div>
                </>}
              </div>
            );
          })()}
        </div>
        <div className="tab-bar" style={{background:"#fff",borderBottom:"1px solid #e5e7ec",display:"flex",padding:"0 16px",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          {presentMode ? (
            /* Presentation Mode Tab Bar */
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",width:"100%"}}>
              <span style={{fontSize:12,fontWeight:700,color:"#1a1d23",letterSpacing:0.5}}>{ar?"وضع العرض":"Presentation Mode"}</span>
              <div style={{width:1,height:20,background:"#e5e7ec"}} />
              <button onClick={()=>setAudienceView("bank")} style={{...btnS,padding:"6px 16px",fontSize:11,fontWeight:600,background:audienceView==="bank"?"#1e40af":"#f0f1f5",color:audienceView==="bank"?"#fff":"#6b7080",borderRadius:20,border:"none"}}>{ar?"🏦 عرض البنك":"🏦 Bank View"}</button>
              <button onClick={()=>setAudienceView("investor")} style={{...btnS,padding:"6px 16px",fontSize:11,fontWeight:600,background:audienceView==="investor"?"#7c3aed":"#f0f1f5",color:audienceView==="investor"?"#fff":"#6b7080",borderRadius:20,border:"none"}}>{ar?"📊 عرض المستثمر":"📊 Investor View"}</button>
            </div>
          ) : (<>
          {(() => {
            const tabs = [
              {key:"dashboard",label:t.dashboard,group:"project"},
              {key:"assets",label:t.assetProgram,group:"project"},
              {key:"cashflow",label:t.cashFlow,group:"project"},
              {key:"financing",label:lang==="ar"?"التمويل":"Financing",group:"finance"},
              {key:"waterfall",label:lang==="ar"?"الشلال":"Waterfall",group:"finance"},
              {key:"results",label:lang==="ar"?"النتائج":"Results",group:"finance"},
              {key:"incentives",label:lang==="ar"?"الحوافز":"Incentives",group:"finance"},
              {key:"scenarios",label:lang==="ar"?"السيناريوهات":"Scenarios",group:"analysis"},
              ...(project?.market?.enabled ? [{key:"market",label:lang==="ar"?"السوق":"Market",group:"analysis"}] : []),
              {key:"checks",label:lang==="ar"?"الفحوصات":"Checks",group:"analysis"},
              {key:"reports",label:lang==="ar"?"التقارير":"Reports",group:"export"},
            ];
            const groupColors = {project:"#2563eb",finance:"#8b5cf6",analysis:"#f59e0b",export:"#16a34a"};
            let prevGroup = null;
            return tabs.map(tb=>{
              const gc = groupColors[tb.group];
              const isActive = activeTab===tb.key;
              const showSep = prevGroup && prevGroup !== tb.group;
              prevGroup = tb.group;
              return <span key={tb.key} style={{display:"inline-flex",alignItems:"center"}}>
                {showSep && <span style={{width:1,height:20,background:"#d1d5db",margin:"0 6px",flexShrink:0}} />}
                <button onClick={()=>{setActiveTab(tb.key);if(isMobile)setSidebarOpen(false);}} style={{padding:isMobile?"10px 8px":"10px 12px",fontSize:isMobile?10:11,fontWeight:isActive?600:500,border:"none",cursor:"pointer",background:"none",color:isActive?gc:"#6b7080",borderBottom:isActive?`2px solid ${gc}`:"2px solid transparent",whiteSpace:"nowrap",transition:"all 0.15s"}}>{tb.label}{tb.key==="checks"&&checks.some(c=>!c.pass)?" ⚠":""}</button>
              </span>;
            });
          })()}
          </>)}
        </div>
        <div style={{flex:1,overflow:"hidden",position:"relative"}}>
          {presentMode ? (
            <div style={{overflow:"auto",height:"100%",padding:isMobile?10:24}}>
            <PresentationView project={project} results={results} financing={financing} waterfall={waterfall} incentivesResult={incentivesResult} lang={lang} audienceView={audienceView} liveSliders={liveSliders} setLiveSliders={setLiveSliders} checks={checks} />
            </div>
          ) : (<>
          {[
            ["dashboard", <ProjectDash key="dashboard" project={project} results={results} checks={checks} t={t} financing={financing} lang={lang} incentivesResult={incentivesResult} onGoToAssets={()=>{setActiveTab("assets");addAsset();}} setActiveTab={setActiveTab} />],
            ["assets", <AssetTable key="assets" project={project} upAsset={upAsset} addAsset={addAsset} rmAsset={rmAsset} results={results} t={t} lang={lang} updateProject={up} />],
            ["financing", <FinancingView key="financing" project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} t={t} up={up} lang={lang} />],
            ["waterfall", <WaterfallView key="waterfall" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} t={t} lang={lang} up={up} />],
            ["results", <ResultsView key="results" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} />],
            ["reports", <ReportsView key="reports" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} checks={checks} lang={lang} />],
            ["scenarios", <ScenariosView key="scenarios" project={project} results={results} financing={financing} waterfall={waterfall} lang={lang} />],
            ["market", <MarketView key="market" project={project} results={results} lang={lang} up={up} />],
            ["incentives", <IncentivesView key="incentives" project={project} results={results} incentivesResult={incentivesResult} financing={financing} lang={lang} up={up} />],
            ["cashflow", <CashFlowView key="cashflow" project={project} results={results} t={t} incentivesResult={incentivesResult} />],
            ["checks", <ChecksView key="checks" checks={checks} t={t} lang={lang} />],
          ].map(([tabKey, tabContent]) => (
            <div key={tabKey} style={{display:activeTab===tabKey?"block":"none",overflow:"auto",height:"100%",padding:isMobile?10:18}}>
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
  const [step, setStep] = useState(0);
  const t = lang === "ar";

  const Option = ({icon, label, desc, selected, onClick}) => (
    <div onClick={onClick} style={{
      background:selected?"#eff6ff":"#fff", border:selected?"2px solid #2563eb":"2px solid #e5e7ec",
      borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.15s",
      display:"flex", alignItems:"center", gap:14, minHeight:60,
    }} onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="#c7d2fe";}} onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="#e5e7ec";}}>
      <span style={{fontSize:28}}>{icon}</span>
      <div><div style={{fontSize:14,fontWeight:600,color:selected?"#2563eb":"#1a1d23"}}>{label}</div>
      {desc&&<div style={{fontSize:11,color:"#6b7080",marginTop:2}}>{desc}</div>}</div>
      {selected&&<span style={{marginInlineStart:"auto",fontSize:18,color:"#2563eb"}}>✓</span>}
    </div>
  );

  const steps = [
    // Step 0: Project name + location
    { title: t?"اسم المشروع والموقع":"Project Name & Location", content: (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><div style={{fontSize:11,color:"#6b7080",marginBottom:4,fontWeight:500}}>{t?"اسم المشروع":"Project Name"}</div>
        <input value={project.name||""} onChange={e=>onUpdate({name:e.target.value})} placeholder={t?"مثال: مشروع واجهة زان":"e.g. ZAN Waterfront"} style={{width:"100%",padding:"12px 16px",border:"2px solid #e5e7ec",borderRadius:10,fontSize:15,fontWeight:600,fontFamily:"inherit",outline:"none"}} autoFocus /></div>
        <div><div style={{fontSize:11,color:"#6b7080",marginBottom:4,fontWeight:500}}>{t?"الموقع":"Location"}</div>
        <input value={project.location||""} onChange={e=>onUpdate({location:e.target.value})} placeholder={t?"مثال: جازان، السعودية":"e.g. Jazan, Saudi Arabia"} style={{width:"100%",padding:"10px 14px",border:"1px solid #e5e7ec",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}} /></div>
      </div>
    )},
    // Step 1: Land type
    { title: t?"نوع الأرض":"Land Type", subtitle: t?"كيف ستحصل على الأرض؟":"How will you acquire the land?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="📋" label={t?"إيجار أرض (حق انتفاع)":"Land Lease (Leasehold)"} desc={t?"إيجار سنوي من الحكومة/المالك":"Annual rent from government/owner"} selected={project.landType==="lease"} onClick={()=>onUpdate({landType:"lease"})} />
        <Option icon="🏠" label={t?"شراء أرض (تملك)":"Land Purchase (Freehold)"} desc={t?"شراء الأرض كاملة قبل البناء":"Buy land outright before construction"} selected={project.landType==="purchase"} onClick={()=>onUpdate({landType:"purchase"})} />
        <Option icon="🤝" label={t?"أرض كشريك (حصة عينية)":"Land as Partner (In-kind Equity)"} desc={t?"المالك يساهم بالأرض كحصة":"Landowner contributes as equity"} selected={project.landType==="partner"} onClick={()=>onUpdate({landType:"partner"})} />
      </div>
    )},
    // Step 2: Financing mode
    { title: t?"طريقة التمويل":"Financing Mode", subtitle: t?"كيف سيتم تمويل المشروع؟":"How will the project be funded?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="💰" label={t?"تمويل ذاتي (رأس مال كامل)":"Self-Funded (100% Equity)"} desc={t?"المطور يموّل كل شي من جيبه":"Developer funds everything"} selected={project.finMode==="self"} onClick={()=>onUpdate({finMode:"self"})} />
        <Option icon="🏦" label={t?"تمويل بنكي 100% (ملك المطور)":"100% Bank Debt (Developer-Owned)"} desc={t?"البنك يموّل كامل التكلفة، المطور هو المالك":"Bank finances 100%, developer owns"} selected={project.finMode==="bank100"} onClick={()=>onUpdate({finMode:"bank100",debtAllowed:true,maxLtvPct:100})} />
        <Option icon="🏗" label={t?"دين بنكي + رأس مال المطور":"Bank Debt + Developer Equity"} desc={t?"جزء من البنك وجزء من المطور":"Part bank loan, part developer equity"} selected={project.finMode==="debt"} onClick={()=>onUpdate({finMode:"debt",debtAllowed:true})} />
        <Option icon="📊" label={t?"صندوق استثماري (GP/LP)":"Fund Structure (GP/LP)"} desc={t?"مطور + مستثمرين مع شلال توزيعات":"Developer + investors with waterfall"} selected={project.finMode==="fund"} onClick={()=>onUpdate({finMode:"fund",debtAllowed:true})} />
      </div>
    )},
    // Step 3: Exit strategy
    { title: t?"استراتيجية التخارج":"Exit Strategy", subtitle: t?"ماذا تخطط بعد الانتهاء؟":"What's your plan after completion?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="🏷" label={t?"بيع الأصل":"Sell the Asset"} desc={t?"بيع المشروع كاملاً بعد الاستقرار":"Sell entire project after stabilization"} selected={project.exitStrategy==="sale"||project.exitStrategy==="caprate"} onClick={()=>onUpdate({exitStrategy:"sale"})} />
        <Option icon="💎" label={t?"احتفاظ بالدخل (بدون بيع)":"Hold for Income (No Sale)"} desc={t?"الاستمرار بتحصيل الإيرادات":"Continue collecting income indefinitely"} selected={project.exitStrategy==="hold"} onClick={()=>onUpdate({exitStrategy:"hold"})} />
      </div>
    )},
  ];

  // Skip exit step for self-funded
  const activeSteps = project.finMode === "self" ? steps.filter((_,i) => i !== 3) : steps;
  const current = activeSteps[step];
  const isLast = step === activeSteps.length - 1;
  const canNext = step === 0 ? (project.name && project.name !== "New Project") : true;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"#fff",borderRadius:20,width:520,maxWidth:"94vw",padding:0,boxShadow:"0 24px 80px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        {/* Progress */}
        <div style={{padding:"20px 28px 0",display:"flex",gap:6}}>
          {activeSteps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"#2563eb":"#e5e7ec",transition:"background 0.3s"}} />)}
        </div>
        {/* Header */}
        <div style={{padding:"20px 28px 8px"}}>
          <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:6}}>
            {t?"الخطوة":"Step"} {step+1} {t?"من":"of"} {activeSteps.length}
          </div>
          <div style={{fontSize:20,fontWeight:700,color:"#1a1d23"}}>{current.title}</div>
          {current.subtitle&&<div style={{fontSize:13,color:"#6b7080",marginTop:4}}>{current.subtitle}</div>}
        </div>
        {/* Content */}
        <div style={{padding:"12px 28px 24px",minHeight:200}}>{current.content}</div>
        {/* Footer */}
        <div style={{padding:"16px 28px",borderTop:"1px solid #f0f1f5",display:"flex",gap:10,justifyContent:"space-between",background:"#fafbfc"}}>
          <button onClick={()=>step>0?setStep(step-1):onDone()} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #e5e7ec",background:"#fff",color:"#6b7080",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
            {step>0?(t?"السابق":"Back"):(t?"تخطي":"Skip")}
          </button>
          <button onClick={()=>isLast?onDone():setStep(step+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:8,border:"none",background:canNext?"#2563eb":"#e5e7ec",color:canNext?"#fff":"#9ca3af",fontSize:13,fontWeight:600,cursor:canNext?"pointer":"default",fontFamily:"inherit"}}>
            {isLast?(t?"ابدأ العمل":"Start Working"):(t?"التالي":"Next →")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES GRID (shared between landing page and dashboard)
// ═══════════════════════════════════════════════════════════════
function FeaturesGrid({ lang }) {
  const ar = lang === "ar";
  const features = [
    { icon: "🏗", color: "#2563eb", title: ar?"نمذجة متعددة الأصول":"Multi-Asset Modeling", desc: ar?"فنادق، محلات، مكاتب، مارينا، سكني - كل أنواع العقارات في نموذج واحد مع P&L مفصّل للفنادق والمارينا":"Hotels, retail, offices, marina, residential - all property types in one model with detailed Hotel & Marina P&L" },
    { icon: "🏦", color: "#8b5cf6", title: ar?"تمويل متقدم":"Advanced Financing", desc: ar?"تمويل بنكي، صندوق استثماري GP/LP، تمويل إسلامي (مرابحة/إجارة)، رسملة الأرض، هيكل رأس المال":"Bank debt, GP/LP fund structure, Islamic finance (Murabaha/Ijara), land capitalization, capital structure" },
    { icon: "📊", color: "#16a34a", title: ar?"شلال توزيعات 4 مراحل":"4-Tier Waterfall", desc: ar?"رد رأس المال → العائد التفضيلي → تعويض المطور → تقسيم الأرباح مع IRR وMOIC لكل طرف":"Return of Capital → Preferred Return → GP Catch-up → Profit Split with IRR & MOIC per party" },
    { icon: "📈", color: "#f59e0b", title: ar?"سيناريوهات وتحليل حساسية":"Scenarios & Sensitivity", desc: ar?"8 سيناريوهات جاهزة، جدول حساسية ثنائي المتغيرات، تحليل نقطة التعادل مع ملخص المخاطر":"8 built-in scenarios, 2-variable sensitivity table, break-even analysis with risk summary" },
    { icon: "📄", color: "#ef4444", title: ar?"تقارير جاهزة للبنك والمستثمر":"Bank & Investor Reports", desc: ar?"ملخص تنفيذي، حزمة البنك (مع DSCR)، مذكرة المستثمر - كلها بصيغة PDF وExcel":"Executive summary, Bank pack (with DSCR), Investor memo - all exportable as PDF & Excel" },
    { icon: "🌐", color: "#06b6d4", title: ar?"ثنائي اللغة + حوافز حكومية":"Bilingual + Gov Incentives", desc: ar?"واجهة عربي/إنجليزي كاملة مع دعم منح CAPEX، إعفاء إيجار الأرض، دعم التمويل، واسترداد الرسوم":"Full Arabic/English interface with CAPEX grants, land rent rebates, finance subsidies, and fee waivers" },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:16}}>
      {features.map((f, i) => (
        <div key={i} style={{background:"#f8f7f5",borderRadius:12,border:"1px solid #e5e0d8",padding:"20px 18px",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+"60";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.transform="translateY(0)";}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:f.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{f.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#0f1117"}}>{f.title}</div>
          </div>
          <div style={{fontSize:12,color:"#6b7080",lineHeight:1.6}}>{f.desc}</div>
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
    } catch (e) { setError(e.message || "Error"); }
    setLoading(false);
  };

  const WATERFRONT_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663027980795/PfUcTsRAscFnLMXv.png";

  return (
    <div dir={ar?"rtl":"ltr"} style={{minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#0f1117",position:"relative"}}>
      {/* ── Left: Hero with Waterfront Image ── */}
      {!isMobile && (
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        {/* Background Image */}
        <img src={WATERFRONT_IMG} alt="ZAN Waterfront" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        {/* Overlay */}
        <div style={{position:"absolute",inset:0,background:ar?"linear-gradient(to left, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)":"linear-gradient(to right, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)"}} />
        {/* Dot pattern overlay */}
        <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"radial-gradient(circle at 2px 2px, white 1px, transparent 0)",backgroundSize:"40px 40px"}} />
        {/* Content */}
        <div style={{position:"relative",zIndex:1,padding:"48px 48px"}}>
          <div style={{maxWidth:560}}>
            {/* Badge */}
            <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(95,191,191,0.12)",border:"1px solid rgba(95,191,191,0.25)",borderRadius:20,marginBottom:20}}>
              <span style={{fontSize:12,color:"#5fbfbf",fontWeight:500}}>{ar?"شركة زان لتطوير الوجهات":"Zan Destination Development"}</span>
            </div>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:48,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif",letterSpacing:-1}}>زان</span>
              <span style={{width:1,height:32,background:"rgba(95,191,191,0.4)"}} />
              <span style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.4,fontWeight:300}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            {/* Title */}
            <h1 style={{fontSize:36,fontWeight:900,color:"#fff",lineHeight:1.15,marginBottom:10,fontFamily:"'Tajawal',sans-serif"}}>
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
      <div style={{width:isMobile?"100%":420,minWidth:isMobile?"auto":380,flex:isMobile?1:"none",background:isMobile?"#0f1117":"#161a24",display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"32px 24px":"48px 36px",borderInlineStart:isMobile?"none":(ar?"none":"1px solid rgba(95,191,191,0.1)"),borderInlineEnd:isMobile?"none":(ar?"1px solid rgba(95,191,191,0.1)":"none")}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:32,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>زان</span>
            <span style={{width:1,height:22,background:"rgba(95,191,191,0.4)"}} />
            <span style={{fontSize:11,color:"#5fbfbf",lineHeight:1.3,fontWeight:300,textAlign:"start"}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          {isMobile && <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{ar?"شركة زان لتطوير الوجهات":"Zan Destination Development"}</div>}
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{mode==="signin"?(ar?"تسجيل الدخول":"Sign In"):(ar?"إنشاء حساب":"Create Account")}</div>
        </div>
        {/* Pending share invite banner */}
        {pendingShare && (
          <div style={{background:"rgba(95,191,191,0.08)",border:"1px solid rgba(95,191,191,0.2)",borderRadius:10,padding:"14px 16px",marginBottom:18,textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:6}}>📬</div>
            <div style={{fontSize:13,fontWeight:600,color:"#5fbfbf",marginBottom:4}}>{ar?"تمت دعوتك لمشروع مشترك":"You've been invited to a shared project"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{ar?"سجّل دخول أو أنشئ حساب جديد عشان تشوف المشروع":"Sign in or create an account to access the project"}</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"البريد الإلكتروني":"Email"}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1e2230",background:"rgba(11,35,65,0.6)",color:"#d0d4dc",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"كلمة المرور":"Password"}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1e2230",background:"rgba(11,35,65,0.6)",color:"#d0d4dc",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          {error && <div style={{fontSize:11,color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",padding:"8px 12px",borderRadius:6}}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:"#5fbfbf",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"'Tajawal',sans-serif",transition:"all 0.2s",letterSpacing:0.3}} onMouseEnter={e=>e.currentTarget.style.background="#0f766e"} onMouseLeave={e=>e.currentTarget.style.background="#5fbfbf"}>
            {loading?"...":(mode==="signin"?(ar?"دخول":"Sign In"):(ar?"إنشاء حساب":"Create Account"))}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.4)"}}>
            {mode==="signin"?(
              <span>{ar?"ما عندك حساب؟":"Don't have an account?"} <button onClick={()=>setMode("signup")} style={{color:"#5fbfbf",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"سجّل الآن":"Sign up"}</button></span>
            ):(
              <span>{ar?"عندك حساب؟":"Already have an account?"} <button onClick={()=>setMode("signin")} style={{color:"#5fbfbf",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"دخول":"Sign in"}</button></span>
            )}
          </div>
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#1e2230",color:"rgba(255,255,255,0.5)",padding:"6px 16px",fontSize:11,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
        </div>
        {/* Powered by */}
        <div style={{marginTop:24,textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ar?"شركة زان لتطوير الوجهات":"Zan Destination Development"}</div>
      </div>
    </div>
  );
}

function ProjectsDashboard({ index, onCreate, onOpen, onDup, onDel, lang, setLang, t, user, signOut }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const isMobile = useIsMobile();
  const sorted = [...index].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const ar = lang === "ar";
  return (
    <div style={{minHeight:"100vh",background:"#f5f3f0",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",color:"#1a1d23"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 14px":"48px 24px"}}>
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-start",gap:isMobile?14:0,marginBottom:isMobile?20:32}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:32,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif"}}>زان</span>
              <span style={{width:1,height:24,background:"#5fbfbf"}} />
              <span style={{fontSize:11,color:"#0f1117",lineHeight:1.3,fontWeight:400}}>{ar?"شركة زان":"Zan"}<br/>{ar?"لتطوير الوجهات":"Destination Development"}</span>
            </div>
            <div style={{fontSize:isMobile?22:28,fontWeight:900,color:"#0f1117",letterSpacing:-0.5,fontFamily:"'Tajawal',sans-serif"}}>{ar?"النمذجة المالية":"Financial Modeler"}</div>
            <div style={{fontSize:isMobile?11:13,color:"#6b7080",marginTop:6}}>{t.subtitle}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setShowFeatures(true)} style={{...btnS,background:"#5fbfbf",color:"#fff",padding:"6px 14px",fontSize:11,fontWeight:600,border:"none",borderRadius:6}} title={ar?"اعرف المزايا":"Explore Features"}>✦ {ar?"المزايا":"Features"}</button>
            {!isMobile && user && <div style={{fontSize:11,color:"#6b7080",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
            {signOut && <button onClick={signOut} style={{...btnSm,background:"#fef2f2",color:"#ef4444",padding:"6px 14px",fontSize:11,fontWeight:500}}>Sign Out</button>}
            <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#e8e5e0",color:"#4b5060",padding:"8px 16px",fontSize:12,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
          </div>
        </div>

        {/* Features Modal Overlay */}
        {showFeatures && (
          <><div onClick={()=>setShowFeatures(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9998}} />
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:800,maxWidth:"94vw",maxHeight:"85vh",background:"#fff",borderRadius:16,border:"1px solid #e5e0d8",boxShadow:"0 24px 80px rgba(0,0,0,0.5)",zIndex:9999,overflow:"auto",padding:"28px 32px"}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
              <div style={{flex:1,fontSize:18,fontWeight:700,color:"#0f1117"}}>{ar?"مزايا المنصة":"Platform Features"}</div>
              <button onClick={()=>setShowFeatures(false)} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"6px 12px",fontSize:14,lineHeight:1}}>✕</button>
            </div>
            <FeaturesGrid lang={lang} />
          </div></>
        )}

        <div style={{display:"flex",gap:12,marginBottom:32}}>
          <button onClick={()=>onCreate()} style={{...btnPrim,padding:"10px 24px",fontSize:13}}>{t.newProject}</button>
          <div style={{flex:1}} />
          <div style={{fontSize:12,color:"#6b7080",alignSelf:"center"}}>{sorted.length} {t.projects}</div>
        </div>
        {sorted.length===0 ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🏗</div>
            <div style={{fontSize:20,fontWeight:700,color:"#0f1117",marginBottom:8}}>{lang==="ar"?"ابدأ مشروعك الأول":"Start Your First Project"}</div>
            <div style={{fontSize:13,color:"#6b7080",marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>{lang==="ar"?"أنشئ مشروع جديد أو ابدأ من أحد القوالب الجاهزة":"Create a new project or start from a ready-made template"}</div>
            <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:16,fontWeight:600}}>{lang==="ar"?"اختر قالب":"Choose a Template"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(180px, 1fr))",gap:12,maxWidth:700,margin:"0 auto"}}>
              {PROJECT_TEMPLATES.map((tmpl)=>(
                <div key={tmpl.id} onClick={()=>onCreate(tmpl.id)} style={{background:"#fff",border:"1px solid #e5e0d8",borderRadius:10,padding:"18px 14px",cursor:"pointer",transition:"all 0.15s",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#5fbfbf";e.currentTarget.style.boxShadow="0 4px 12px rgba(95,191,191,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}}>
                  <div style={{fontSize:28,marginBottom:8}}>{tmpl.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#0f1117",marginBottom:4}}>{ar?tmpl.ar:tmpl.en}</div>
                  <div style={{fontSize:10,color:"#6b7080"}}>{ar?tmpl.desc_ar:tmpl.desc_en}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(p=>(
              <div key={p.id} style={{background:"#fff",borderRadius:10,padding:isMobile?"12px 14px":"16px 20px",display:"flex",alignItems:"center",gap:isMobile?10:14,border:"1px solid #e5e0d8",cursor:"pointer",transition:"all 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#5fbfbf";e.currentTarget.style.boxShadow="0 4px 12px rgba(95,191,191,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}} onClick={()=>onOpen(p.id)}>
                <div style={{width:isMobile?32:38,height:isMobile?32:38,borderRadius:6,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"#f0f1f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?13:15,flexShrink:0}}>
                  {p._shared?"👤":p.status==="Complete"?"✓":p.status==="In Progress"?"▶":"◇"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:isMobile?13:14,fontWeight:600,color:"#0f1117",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}{p._shared?<span style={{fontSize:10,color:"#2563eb",marginInlineStart:8,fontWeight:500}}>{lang==="ar"?"(مشارك)":"(Shared)"}</span>:null}</div>
                  <div style={{fontSize:isMobile?10:11,color:"#6b7080",marginTop:2}}>{new Date(p.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",...(!isMobile?{year:"numeric",hour:"2-digit",minute:"2-digit"}:{})})}</div>
                </div>
                <span style={{fontSize:isMobile?9:10,padding:"3px 8px",borderRadius:4,fontWeight:500,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"#f0f1f5",color:p._shared?(p._permission==="view"?"#fbbf24":"#60a5fa"):p.status==="Complete"?"#4ade80":p.status==="In Progress"?"#60a5fa":"#9ca3af",flexShrink:0}}>{p._shared?(p._permission==="view"?(lang==="ar"?"قراءة":"View"):(lang==="ar"?"تعديل":"Edit")):p.status||"Draft"}</span>
                {!isMobile && !p._shared && <button onClick={e=>{e.stopPropagation();onDup(p.id);}} style={{...btnSm,background:"#f0f1f5",color:"#6b7080",padding:"4px 10px"}} title="Duplicate">{lang==="ar"?"نسخ":"Copy"}</button>}
                {!p._shared && <button onClick={e=>{e.stopPropagation();const url=`${window.location.origin}?s=${p.id}&o=${user?.id||""}`;navigator.clipboard?.writeText(url).then(()=>{e.currentTarget.textContent="✓";setTimeout(()=>{e.currentTarget.textContent="🔗";},1500);});}} style={{...btnSm,background:"#dbeafe",color:"#60a5fa",padding:"4px 10px",fontSize:13}} title={lang==="ar"?"نسخ رابط المشاركة":"Copy share link"}>🔗</button>}
                {!p._shared && (confirmDel===p.id ? (
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{onDel(p.id);setConfirmDel(null);}} style={{...btnSm,background:"#fef2f2",color:"#ef4444"}}>Yes</button>
                    <button onClick={()=>setConfirmDel(null)} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}}>No</button>
                  </div>
                ) : (
                  <button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}} title="Delete">✕</button>
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
      ? `مرحباً،\nأود مشاركة نموذج مالي معك على منصة ZAN Financial Modeler.\n\n📋 المشروع: ${projName}\n📊 عدد الأصول: ${assets} | المراحل: ${phases}\n\n🔗 رابط الوصول:\n${shareUrl}\n\nإذا ما عندك حساب، سجّل من نفس الرابط وبيظهر لك المشروع تلقائي.`
      : `Hi,\nI'd like to share a financial model with you on ZAN Financial Modeler.\n\n📋 Project: ${projName}\n📊 Assets: ${assets} | Phases: ${phases}\n\n🔗 Access link:\n${shareUrl}\n\nIf you don't have an account, register from the same link and the project will appear automatically.`;
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
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1d23" }}>{ar ? "مشاركة المشروع" : "Share Project"}</span>
        <button onClick={onClose} style={{ ...sty.btn, background: "#f0f1f5", color: "#6b7080", padding: "6px 12px", fontSize: 16 }}>✕</button>
      </div>

      <div style={sty.body}>
        {/* ── Copy Link Section ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "رابط المشروع" : "Project Link"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flex: 1, padding: "10px 12px", background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 11, color: "#6b7080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", minHeight: 44, display: "flex", alignItems: "center" }}>{shareUrl}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyLink} style={{ ...sty.btn, background: copied === "link" ? "#16a34a" : "#2563eb", color: "#fff", whiteSpace: "nowrap" }}>
                {copied === "link" ? "✓" : "🔗"} {copied === "link" ? (ar ? "تم النسخ" : "Copied!") : (ar ? "نسخ الرابط" : "Copy Link")}
              </button>
              <button onClick={copyInvite} style={{ ...sty.btn, background: copied === "invite" ? "#16a34a" : "#f0f4ff", color: copied === "invite" ? "#fff" : "#2563eb", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                {copied === "invite" ? "✓" : "💬"} {copied === "invite" ? (ar ? "تم" : "Done") : (ar ? "نص دعوة" : "Invite Text")}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}>{ar ? "أي شخص عنده الرابط ومسجل بالمنصة يقدر يفتح المشروع. غير المسجلين يطلب منهم التسجيل أول." : "Anyone with this link who is registered can access the project. Unregistered users will be prompted to sign up."}</div>
        </div>

        {/* ── Add User ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "إضافة مشارك" : "Add Person"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Email address"} 
              style={sty.input} onKeyDown={e => e.key === "Enter" && addUser()} />
            <select value={perm} onChange={e => setPerm(e.target.value)} 
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer", minHeight: 44 }}>
              <option value="view">{ar ? "قراءة فقط" : "View only"}</option>
              <option value="edit">{ar ? "تعديل" : "Can edit"}</option>
            </select>
            <button onClick={addUser} style={{ ...sty.btn, background: "#2563eb", color: "#fff" }}>
              {ar ? "أضف" : "Add"}
            </button>
          </div>
          {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{error}</div>}
        </div>

        {/* ── Shared Users List ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {ar ? "المشاركون" : "Shared With"} {shared.length > 0 && <span style={{ fontSize: 10, background: "#dbeafe", color: "#2563eb", padding: "1px 6px", borderRadius: 8, marginInlineStart: 6 }}>{shared.length}</span>}
          </div>
          {shared.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
              {ar ? "لم تتم المشاركة مع أحد بعد" : "Not shared with anyone yet"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {shared.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7ec" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#2563eb", fontWeight: 600, flexShrink: 0 }}>
                    {(s.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1d23", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    {s.addedAt && <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(s.addedAt).toLocaleDateString()}</div>}
                  </div>
                  <select value={s.permission || "edit"} onChange={e => changePerm(s.email, e.target.value)} 
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7ec", fontSize: 11, fontFamily: "inherit", background: s.permission === "edit" ? "#dbeafe" : "#fef3c7", color: s.permission === "edit" ? "#1d4ed8" : "#92400e", cursor: "pointer", fontWeight: 600, minHeight: 36 }}>
                    <option value="view">{ar ? "قراءة" : "View"}</option>
                    <option value="edit">{ar ? "تعديل" : "Edit"}</option>
                  </select>
                  <button onClick={() => removeUser(s.email)} style={{ ...btnSm, background: "#fef2f2", color: "#ef4444", padding: "6px 10px", minHeight: 36 }} title={ar ? "إزالة" : "Remove"}>✕</button>
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
  const col={Draft:{bg:"#f0f1f5",fg:"#6b7080"},"In Progress":{bg:"#dbeafe",fg:"#2563eb"},Complete:{bg:"#dcfce7",fg:"#16a34a"}};
  const c=col[status]||col.Draft;
  return (<div style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{...btnS,background:c.bg,color:c.fg,padding:"4px 12px",fontSize:11,fontWeight:600}}>{status||"Draft"} ▾</button>
    {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#fff",border:"1px solid #e5e7ec",borderRadius:6,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:100,overflow:"hidden"}}>
      {sts.map(s=><button key={s} onClick={()=>{onChange(s);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 16px",border:"none",background:status===s?"#f0f1f5":"#fff",fontSize:12,cursor:"pointer",textAlign:"start",color:"#1a1d23"}}>{s}</button>)}
    </div>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// CONTROL PANEL
// ═══════════════════════════════════════════════════════════════
// ── Sidebar helper components (defined OUTSIDE ControlPanel to prevent re-creation) ──
function Sec({title,children,def=false,filled,summary}) {
  const [open,setOpen]=useState(def);
  return (<div style={{borderBottom:"1px solid #1e2230"}}>
    <button onClick={e=>{e.preventDefault();setOpen(!open);}} style={{width:"100%",padding:"11px 16px",background:"none",border:"none",color:open?"#d0d4dc":"#8b90a0",fontSize:10,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",textAlign:"start",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"color 0.15s"}}>
      {filled!==undefined&&<span style={{width:7,height:7,borderRadius:4,background:filled?"#16a34a":"#3b4050",flexShrink:0}} />}
      <span style={{flex:1}}>{title}</span>
      {!open&&summary&&<span style={{fontSize:9,color:"#4b5060",fontWeight:400,letterSpacing:0,textTransform:"none",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{summary}</span>}
      <span style={{color:"#3b4050",fontSize:12,transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>▾</span>
    </button>
    {open&&<div style={{padding:"0 16px 14px"}}>{children}</div>}
  </div>);
}

function Fld({label,children,hint,tip}) {
  const [showTip, setShowTip] = useState(false);
  return (<div style={{marginBottom:9,position:"relative"}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7b8094",marginBottom:3}}>
      {label}
      {tip && <span onMouseEnter={()=>setShowTip(true)} onMouseLeave={()=>setShowTip(false)} style={{cursor:"help",fontSize:10,color:"#4b5060",lineHeight:1}}>ⓘ</span>}
    </label>
    {showTip && tip && <div style={{position:"absolute",top:-4,insetInlineStart:0,insetInlineEnd:0,transform:"translateY(-100%)",background:"#1a1d23",color:"#d0d4dc",padding:"8px 10px",borderRadius:6,fontSize:10,lineHeight:1.4,zIndex:99,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",maxWidth:260}}>{tip.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?3:0}}>{line}</div>)}</div>}
    {children}
    {hint&&<div style={{fontSize:10,color:"#4b5060",marginTop:2}}>{hint}</div>}
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
  const irrVal = isPhase ? phaseIRR : (f && f.mode !== "self" && f.leveredIRR !== null ? f.leveredIRR : (ir && ir.adjustedIRR !== null && ir.totalIncentiveValue > 0) ? ir.adjustedIRR : c.irr);
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
      if (exitYr > 0 && exitYr < maxRamp) warnings.push({ icon: "🚪", text: ar ? "التخارج قبل استقرار الإشغال" : "Exit before stabilization", tab: "waterfall", sev: "warn" });
    }
  }
  if (npvVal < 0) warnings.push({ icon: "📉", text: ar ? `NPV سالب (${fmtM(npvVal)})` : `Negative NPV (${fmtM(npvVal)})`, tab: "dashboard", sev: "error" });

  // Asset-level warnings (filtered by phase)
  phaseAssets.forEach((a, i) => {
    const bcCost = benchmarkColor("costPerSqm", a.costPerSqm, a.category);
    const bcRate = benchmarkColor("leaseRate", a.leaseRate, a.category);
    if (bcCost.color === "#ef4444")
      warnings.push({ icon: "🔴", text: ar ? `"${a.name||i+1}": تكلفة/م² (${fmt(a.costPerSqm)}) خارج النطاق` : `"${a.name||i+1}": cost/sqm (${fmt(a.costPerSqm)}) outlier`, tab: "assets", sev: "warn" });
    if (bcRate.color === "#ef4444" && a.revType === "Lease")
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
          <div style={{ fontSize: 9, color: "#6b7080", marginTop: 1 }}>
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
              <button onClick={() => setAdvPhase("all")} style={{ ...btnS, padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 10, background: advPhase === "all" ? "#5fbfbf20" : "#1e2230", color: advPhase === "all" ? "#5fbfbf" : "#6b7080", border: advPhase === "all" ? "1px solid #5fbfbf40" : "1px solid #282d3a" }}>
                {ar ? "الكل" : "All"}
              </button>
              {phaseNames.map(pn => {
                const pWarns = (project.assets || []).filter(a => a.phase === pn).some(a => benchmarkColor("costPerSqm", a.costPerSqm, a.category).color === "#ef4444");
                return (
                  <button key={pn} onClick={() => setAdvPhase(pn)} style={{ ...btnS, padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 10, background: advPhase === pn ? "#2563eb20" : "#1e2230", color: advPhase === pn ? "#60a5fa" : "#6b7080", border: advPhase === pn ? "1px solid #2563eb40" : "1px solid #282d3a" }}>
                    {pn} {pWarns && <span style={{ color: "#f87171" }}>!</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── KPI Strip ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[
              { label: "IRR", value: irrVal !== null ? (irrVal * 100).toFixed(1) + "%" : "—", ok: irrOk },
              { label: isPhase ? "NPV" : (minDscr !== null ? "DSCR" : "NPV"), value: isPhase ? (npvVal >= 1e6 ? fmtM(npvVal) : "—") : (minDscr !== null ? minDscr.toFixed(2) + "x" : (npvVal >= 1e6 ? fmtM(npvVal) : npvVal > 0 ? "+" : "—")), ok: isPhase ? npvOk : (minDscr !== null ? dscrOk : npvOk) },
              { label: ar ? "الاسترداد" : "Payback", value: payback ? payback + (ar ? " سنة" : "yr") : "—", ok: payback && payback <= 7 ? 2 : payback && payback <= 12 ? 1 : 0 },
            ].map((m, i) => (
              <div key={i} style={{ background: "#0F2D4F", borderRadius: 6, padding: "8px 10px", border: "1px solid #1e2230" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <Dot ok={m.ok} />
                  <span style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.3 }}>{m.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.ok >= 2 ? "#4ade80" : m.ok === 1 ? "#fbbf24" : "#f87171" }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ── Warnings ── */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>
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
            <div style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>{ar ? "ملخص" : "Summary"}</div>
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
              <div style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>{ar ? "أصول المرحلة" : "Phase Assets"}</div>
              {phaseSchedules.map((a, i) => {
                const aYoc = a.totalCapex > 0 ? ((a.totalRevenue / Math.max(1, h)) / a.totalCapex * 100).toFixed(1) : "0.0";
                const viable = Number(aYoc) > 8 ? "#4ade80" : Number(aYoc) > 4 ? "#fbbf24" : a.totalRevenue > 0 ? "#f87171" : "#4b5060";
                return (
                  <div key={i} style={{ background: "#0F2D4F", borderRadius: 6, padding: "6px 10px", marginBottom: 4, border: "1px solid #1e2230" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#d0d4dc" }}>{a.name || "—"}</span>
                        <span style={{ fontSize: 9, color: "#6b7080", marginInlineStart: 6 }}>{catL(a.category, ar)}</span>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: viable }}>{aYoc}%</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#6b7080", marginTop: 3 }}>
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

function ControlPanel({ project, up, t, lang, results }) {
  if (!project) return null;
  const [showLandRentDetail, setShowLandRentDetail] = useState(false);

  const cur = project.currency || "SAR";
  const ar = lang==="ar";

  return (<>
    {/* ── 1. GENERAL ── */}
    <Sec title={t.general} def={true} filled={!!(project.location && project.startYear)} summary={project.location ? `${project.startYear} | ${project.horizon}yr` : ""}>
      <Fld label={t.location} tip="موقع المشروع. للعرض والتقارير فقط
Project location. For display and reports only"><SidebarInput value={project.location} onChange={v=>up({location:v})} placeholder="e.g. Jazan, Saudi Arabia" /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.startYear} tip="سنة بداية المشروع. تُحدد توقيت CAPEX والإيرادات
Project start year. Sets the timing for CAPEX and revenue"><SidebarInput type="number" value={project.startYear} onChange={v=>up({startYear:v})} /></Fld>
        <Fld label={t.horizon} tip="أفق النموذج بالسنوات (5-99). يحدد مدى حساب التدفقات النقدية
Model horizon in years (5-99). Determines cash flow projection length"><SidebarInput type="number" value={project.horizon} onChange={v=>up({horizon:v})} /></Fld>
      </div>
      <Fld label={t.currency} tip="عملة النموذج. الافتراضي ريال سعودي
Model currency. Default is SAR"><Sel lang={lang} value={project.currency} onChange={v=>up({currency:v})} options={CURRENCIES} /></Fld>
    </Sec>

    {/* ── 2. LAND ── */}
    <Sec title={t.landAcq} filled={project.landArea > 0} summary={project.landArea > 0 ? `${project.landType} | ${fmt(project.landArea)} m²` : ""}>
      <Fld label={t.landType} tip="نوع حيازة الأرض: شراء، إيجار، شراكة، أو BOT. يؤثر على CAPEX والتدفقات
Land tenure type: purchase, lease, partner equity, or BOT. Affects CAPEX and cash flows"><Sel lang={lang} value={project.landType} onChange={v=>up({landType:v})} options={LAND_TYPES} /></Fld>
      <Fld label={t.landArea} tip="إجمالي مساحة الأرض بالمتر المربع. تُستخدم لحساب إيجار الأرض والرسملة
Total land area in sqm. Used to calculate land rent and capitalization"><SidebarInput type="number" value={project.landArea} onChange={v=>up({landArea:v})} /></Fld>
      {project.landType==="lease"&&<>
        <Fld label={t.annualRent} tip="إيجار الأرض السنوي بالريال. يظهر فقط في نموذج حق الانتفاع
Annual land rent in SAR. Applies only in leasehold model"><SidebarInput type="number" value={project.landRentAnnual} onChange={v=>up({landRentAnnual:v})} /></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label={t.escalation} tip="نسبة الزيادة السنوية في إيجار الأرض
Annual escalation rate for land rent"><SidebarInput type="number" value={project.landRentEscalation} onChange={v=>up({landRentEscalation:v})} /></Fld>
          <Fld label={t.everyN} tip={ar?"تطبيق الزيادة كل N سنة":"Apply escalation every N years"}><SidebarInput type="number" value={project.landRentEscalationEveryN} onChange={v=>up({landRentEscalationEveryN:v})} /></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label={ar?"بداية العقد":"Lease Start"} tip={ar?"سنة بداية عقد الإيجار. 0 = نفس بداية المشروع":"Lease start year. 0 = project start. Grace counts from here"}><SidebarInput type="number" value={project.landLeaseStartYear||0} onChange={v=>up({landLeaseStartYear:v})} placeholder={String(project.startYear||2026)} /></Fld>
          <Fld label={t.grace} tip={ar?"سنوات إعفاء من تاريخ عقد الإيجار":"Grace years from lease start date"}><SidebarInput type="number" value={project.landRentGrace} onChange={v=>up({landRentGrace:v})} /></Fld>
        </div>
        <Fld label={t.leaseTerm} tip={ar?"مدة عقد حق الانتفاع بالسنوات. عادة 25-50 سنة":"Leasehold term in years. Typically 25-50"}><SidebarInput type="number" value={project.landRentTerm} onChange={v=>up({landRentTerm:v})} /></Fld>
        <Fld label={ar?"بداية الإيجار":"Rent Start Rule"} tip={ar?"متى يبدأ إيجار الأرض":"When does land rent begin: Auto / Grace / Income"}>
          <select value={project.landRentStartRule||"auto"} onChange={e=>up({landRentStartRule:e.target.value})} style={{width:"100%",padding:"6px 8px",fontSize:11,borderRadius:6,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit"}}>
            <option value="auto">{ar?"تلقائي (أيهما أسبق)":"Auto (whichever first)"}</option>
            <option value="grace">{ar?"حسب فترة السماح":"After grace period"}</option>
            <option value="income">{ar?"حسب بداية الإيراد":"When income starts"}</option>
          </select>
        </Fld>
        {/* Land Rent Allocation Details */}
        {results?.landRentMeta?.rentStartYear != null && (() => {
          const m = results.landRentMeta;
          return <>
            <button onClick={()=>setShowLandRentDetail(!showLandRentDetail)} style={{fontSize:10,color:"#2563eb",background:"#eef2ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 10px",cursor:"pointer",width:"100%",textAlign:"start",fontFamily:"inherit",marginTop:4}}>
              {showLandRentDetail?"▼":"▶"} {ar?"تفاصيل توزيع الإيجار":"Land Rent Allocation Details"}
            </button>
            {showLandRentDetail && <div style={{background:"#f8faff",border:"1px solid #e0e7ff",borderRadius:8,padding:10,marginTop:4,fontSize:10}}>
              <div style={{marginBottom:6}}>
                <span style={{fontWeight:600}}>{ar?"يبدأ الإيجار: السنة":"Rent starts: Year"} {m.rentStartYear + (results?.startYear||2026)}</span>
                <span style={{color:"#6b7080",marginInlineStart:8}}>({ar?"سنة":"yr"} {m.rentStartYear} {ar?"من المشروع":"from start"})</span>
              </div>
              <div style={{marginBottom:4,color:"#6b7080"}}>
                {ar?"بداية العقد:":"Lease starts:"} {m.leaseStartAbsolute||results?.startYear||2026} | {ar?"فترة السماح:":"Grace:"} {project.landRentGrace||0} {ar?"سنة":"yr"} → {ar?"ينتهي السماح:":"Grace ends:"} {m.graceEndIdx!=null ? (m.graceEndIdx + (results?.startYear||2026)) : '—'}
              </div>
              <div style={{marginBottom:4,color:"#6b7080"}}>
                {ar?"بداية الإيراد:":"1st income:"} {ar?"السنة":"Yr"} {m.firstIncomeYear != null ? (m.firstIncomeYear + (results?.startYear||2026)) : '—'} | {ar?"افتتاح المرحلة 1:":"Phase 1 opens:"} {ar?"السنة":"Yr"} {m.phase1CompletionYear + (results?.startYear||2026)}
              </div>
              <div style={{marginBottom:4,color:"#6b7080"}}>
                {ar?"القاعدة:":"Rule:"} {m.startRule === 'auto' ? (ar?"أيهما أسبق":"Whichever first") : m.startRule === 'grace' ? (ar?"بعد السماح":"After grace") : (ar?"بعد الإيراد":"After income")}
                {m.startRule === 'auto' && <span> → MIN({m.graceEndIdx}, {m.firstIncomeYear}) = {m.rentStartYear}</span>}
              </div>
              {m.phaseShares && Object.keys(m.phaseShares).length > 0 && (() => {
                const phases = Object.entries(m.phaseShares);
                const isManual = !!project.landRentManualAlloc && Object.keys(project.landRentManualAlloc).length > 0;
                const manualSum = isManual ? Object.values(project.landRentManualAlloc).reduce((s,v)=>s+(Number(v)||0),0) : 0;
                const toggleManual = () => {
                  if (isManual) {
                    up({landRentManualAlloc: null});
                  } else {
                    // Initialize manual with current auto values
                    const init = {};
                    phases.forEach(([pn, ps]) => { init[pn] = Math.round((ps.share||0)*100); });
                    up({landRentManualAlloc: init});
                  }
                };
                const setManualPct = (pn, val) => {
                  const cur = {...(project.landRentManualAlloc||{})};
                  cur[pn] = Number(val) || 0;
                  up({landRentManualAlloc: cur});
                };
                return <>
                <div style={{fontWeight:600,marginTop:8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>{ar?"التوزيع بين المراحل:":"Phase allocation:"}</span>
                  <button onClick={toggleManual} style={{fontSize:9,padding:"2px 8px",borderRadius:4,border:"1px solid " + (isManual?"#f59e0b":"#d1d5db"),background:isManual?"#fffbeb":"#fff",color:isManual?"#b45309":"#6b7080",cursor:"pointer",fontFamily:"inherit"}}>
                    {isManual ? (ar?"⚙ يدوي":"⚙ Manual") : (ar?"تلقائي":"Auto")}
                  </button>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead><tr style={{borderBottom:"1px solid #e0e7ff"}}>
                    <th style={{textAlign:"start",padding:"2px 4px"}}>{ar?"المرحلة":"Phase"}</th>
                    <th style={{textAlign:"right",padding:"2px 4px"}}>{ar?"المساحة":"Area"}</th>
                    <th style={{textAlign:"right",padding:"2px 4px"}}>{ar?"الحصة":"Share"}</th>
                  </tr></thead>
                  <tbody>
                    {phases.map(([pn, ps]) => <tr key={pn} style={{borderBottom:"1px solid #f0f1f5"}}>
                      <td style={{padding:"2px 4px",fontWeight:500}}>{pn}</td>
                      <td style={{padding:"2px 4px",textAlign:"right"}}>{(ps.footprint||0).toLocaleString()}</td>
                      <td style={{padding:"2px 4px",textAlign:"right",fontWeight:600}}>
                        {isManual ? (
                          <input type="number" value={project.landRentManualAlloc?.[pn]??""} onChange={e=>setManualPct(pn,e.target.value)}
                            style={{width:42,textAlign:"right",padding:"1px 3px",border:"1px solid #d1d5db",borderRadius:3,fontSize:10,fontWeight:600,fontFamily:"inherit"}} />
                        ) : (
                          <span>{((ps.share)*100).toFixed(0)}%</span>
                        )}
                      </td>
                    </tr>)}
                    {isManual && <tr style={{borderTop:"1px solid #e0e7ff",fontWeight:700}}>
                      <td colSpan={2} style={{padding:"2px 4px",textAlign:"right",fontSize:9}}>{ar?"المجموع":"Total"}</td>
                      <td style={{padding:"2px 4px",textAlign:"right",color:Math.abs(manualSum-100)>0.1?"#ef4444":"#059669"}}>{manualSum}%</td>
                    </tr>}
                  </tbody>
                </table>
                {isManual && Math.abs(manualSum - 100) > 0.1 && (
                  <div style={{marginTop:4,padding:"4px 8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:4,fontSize:9,color:"#dc2626"}}>
                    ⚠ {ar?"مجموع النسب = "+manualSum+"% (يجب أن يكون 100%)":"Total = "+manualSum+"% (should be 100%)"}
                  </div>
                )}
                {m.rentStartYear < m.firstIncomeYear && (
                  <div style={{marginTop:4,padding:"4px 8px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:4,fontSize:9,color:"#b45309"}}>
                    ℹ {ar?"الإيجار يبدأ قبل الإيراد بـ "+(m.firstIncomeYear-m.rentStartYear)+" سنة":"Rent starts "+(m.firstIncomeYear-m.rentStartYear)+"yr before first income"}
                  </div>
                )}
                <div style={{marginTop:4,color:"#6b7080",fontStyle:"italic",fontSize:9}}>
                  {isManual
                    ? (ar?"توزيع يدوي — أدخل النسب حسب الاتفاق":"Manual allocation — enter agreed percentages")
                    : (ar?"كل المراحل تتحمل الإيجار بنسبة مساحتها من الأرض":"All phases share rent by their land area proportion")}
                </div>
                </>;
              })()}
            </div>}
          </>;
        })()}
      </>}
      {project.landType==="purchase"&&<Fld label={t.purchasePrice} tip="سعر شراء الأرض بالريال. يُضاف كـ CAPEX أرض في السنة الأولى
Land purchase price in SAR. Added as land CAPEX in year one"><SidebarInput type="number" value={project.landPurchasePrice} onChange={v=>up({landPurchasePrice:v})} /></Fld>}
      {project.landType==="partner"&&<>
        <Fld label={t.landValuation} tip="قيمة الأرض المتفق عليها عند دخولها كحصة عينية
Agreed land value when contributed as in-kind equity"><SidebarInput type="number" value={project.landValuation} onChange={v=>up({landValuation:v})} /></Fld>
        <Fld label={t.partnerEquity} tip="نسبة الشريك في المشروع مقابل الأرض
Partner equity percentage in exchange for land contribution"><SidebarInput type="number" value={project.partnerEquityPct} onChange={v=>up({partnerEquityPct:v})} /></Fld>
      </>}
      {project.landType==="bot"&&<Fld label={t.botYears} tip="مدة امتياز BOT بالسنوات. يجب استرداد CAPEX والعائد خلالها
BOT concession period in years. Must recover CAPEX and returns within this term"><SidebarInput type="number" value={project.botOperationYears} onChange={v=>up({botOperationYears:v})} /></Fld>}
    </Sec>

    {/* ── 4. ASSUMPTIONS (CAPEX + Revenue merged) ── */}
    <Sec title={ar?"افتراضات التكاليف والإيرادات":"Cost & Revenue Assumptions"} filled={project.softCostPct > 0 || project.rentEscalation > 0} summary={`${project.softCostPct}% soft | ${project.rentEscalation}% esc`}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.softCost} tip="تشمل التصميم، الدراسات، الإشراف، التصاريح وإدارة المشروع. عادة 8-15%\nDesign, studies, supervision, permits, project management. Usually 8-15%: تصميم، إشراف، تصاريح. عادة 8-15%\nIndirect costs: design, supervision, permits. Standard 8-15%"><SidebarInput type="number" value={project.softCostPct} onChange={v=>up({softCostPct:v})} /></Fld>
        <Fld label={t.contingency} tip="هامش احتياطي لزيادات الأسعار أو تغييرات التنفيذ. عادة 5-10%\nReserve for cost overruns or scope changes. Usually 5-10% للمخاطر غير المتوقعة. عادة 5-10%\nRisk reserve for unexpected costs. Standard 5-10%"><SidebarInput type="number" value={project.contingencyPct} onChange={v=>up({contingencyPct:v})} /></Fld>
      </div>
      <Fld label={t.rentEsc} tip="الزيادة السنوية المفترضة في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAssumed annual rent increase. Prime areas 2-5%, secondary 0.5-2% في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAnnual rent increase %. Prime areas: 2-5%, secondary: 0.5-2%"><SidebarInput type="number" value={project.rentEscalation} onChange={v=>up({rentEscalation:v})} /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.defEfficiency} tip="نسبة المساحة المدرة للدخل من GFA. مكاتب 75-85%، تجزئة 80-90%\nIncome-generating share of GFA. Offices 75-85%, Retail 80-90% للتأجير من GFA. مكاتب 80-90%، تجزئة 70-85%\nLeasable % of GFA. Offices 80-90%, Retail 70-85%"><SidebarInput type="number" value={project.defaultEfficiency} onChange={v=>up({defaultEfficiency:v})} /></Fld>
        <Fld label={t.defLeaseRate} tip="معدل الإيجار الافتراضي للأصول الجديدة بالريال/م²/سنة
Default lease rate for new assets in SAR/sqm/year"><SidebarInput type="number" value={project.defaultLeaseRate} onChange={v=>up({defaultLeaseRate:v})} /></Fld>
      </div>
      <Fld label={t.defCostSqm} tip="تكلفة البناء الافتراضية للأصول الجديدة بالريال/م²
Default construction cost for new assets in SAR/sqm"><SidebarInput type="number" value={project.defaultCostPerSqm} onChange={v=>up({defaultCostPerSqm:v})} /></Fld>
    </Sec>
  </>);
}

// ═══════════════════════════════════════════════════════════════
// HOTEL P&L MODAL
// ═══════════════════════════════════════════════════════════════
function HotelPLModal({ data, onSave, onClose, t }) {
  const [h, setH] = useState(data || defaultHotelPL());
  const upH = (u) => setH(prev => ({...prev, ...u}));
  const calc = calcHotelEBITDA(h);

  const applyPreset = (key) => { const p = HOTEL_PRESETS[key]; if (p) setH(prev => ({...prev, ...p})); };

  const Row = ({label, children}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:"#6b7080"}}>{label}</span><div style={{width:120}}>{children}</div></div>;
  const NumIn = ({value, onChange}) => {
    const [loc, setLoc] = useState(String(value ?? ""));
    const ref = useRef(null);
    useEffect(() => { if (document.activeElement !== ref.current) setLoc(String(value ?? "")); }, [value]);
    return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={()=>{const n=parseFloat(loc);onChange(isNaN(n)?0:n);}} style={{...sideInputStyle,background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec",textAlign:"right",width:"100%"}} />;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:10,width:520,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7ec",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.hotelPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          {/* Presets */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {Object.keys(HOTEL_PRESETS).map(k=><button key={k} onClick={()=>applyPreset(k)} style={{...btnS,background:"#eef2ff",color:"#2563eb",padding:"6px 12px",fontSize:11,fontWeight:500}}>{k}</button>)}
          </div>

          <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.keys}</div>
          <Row label={t.keys}><NumIn value={h.keys} onChange={v=>upH({keys:v})} /></Row>
          <Row label={t.adr}><NumIn value={h.adr} onChange={v=>upH({adr:v})} /></Row>
          <Row label={t.stabOcc}><NumIn value={h.stabOcc} onChange={v=>upH({stabOcc:v})} /></Row>
          <Row label={t.daysYear}><NumIn value={h.daysYear} onChange={v=>upH({daysYear:v})} /></Row>

          <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:8}}>{t.revMix}</div>
          <Row label={t.roomsPct}><NumIn value={h.roomsPct} onChange={v=>upH({roomsPct:v})} /></Row>
          <Row label={t.fbPct}><NumIn value={h.fbPct} onChange={v=>upH({fbPct:v})} /></Row>
          <Row label={t.micePct}><NumIn value={h.micePct} onChange={v=>upH({micePct:v})} /></Row>
          <Row label={t.otherPct}><NumIn value={h.otherPct} onChange={v=>upH({otherPct:v})} /></Row>

          <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginTop:14,marginBottom:8}}>{t.opexRatios}</div>
          <Row label={t.roomExpPct}><NumIn value={h.roomExpPct} onChange={v=>upH({roomExpPct:v})} /></Row>
          <Row label={t.fbExpPct}><NumIn value={h.fbExpPct} onChange={v=>upH({fbExpPct:v})} /></Row>
          <Row label={t.miceExpPct}><NumIn value={h.miceExpPct} onChange={v=>upH({miceExpPct:v})} /></Row>
          <Row label={t.otherExpPct}><NumIn value={h.otherExpPct} onChange={v=>upH({otherExpPct:v})} /></Row>
          <Row label={t.undistPct}><NumIn value={h.undistPct} onChange={v=>upH({undistPct:v})} /></Row>
          <Row label={t.fixedPct}><NumIn value={h.fixedPct} onChange={v=>upH({fixedPct:v})} /></Row>

          {/* Calculated results */}
          <div style={{marginTop:16,padding:14,background:"#f8f9fb",borderRadius:8}}>
            <div style={{fontSize:11,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.stabRevenue}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"#6b7080"}}>Rooms Rev</span><span style={{textAlign:"right"}}>{fmt(calc.roomsRev)}</span>
              <span style={{color:"#6b7080"}}>F&B Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fbRev)}</span>
              <span style={{color:"#6b7080"}}>MICE Rev</span><span style={{textAlign:"right"}}>{fmt(calc.miceRev)}</span>
              <span style={{color:"#6b7080"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
            </div>
            <div style={{borderTop:"1px solid #e5e7ec",marginTop:8,paddingTop:8}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
                <span style={{color:"#ef4444"}}>Total OPEX</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(calc.totalOpex)}</span>
                <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"#16a34a"}}>{fmt(calc.ebitda)}</span>
                <span style={{color:"#6b7080"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7ec",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"8px 16px",fontSize:12}}>Cancel</button>
          <button onClick={()=>{onSave(h, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>Save & Apply EBITDA</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MARINA P&L MODAL
// ═══════════════════════════════════════════════════════════════
function MarinaPLModal({ data, onSave, onClose, t }) {
  const [m, setM] = useState(data || defaultMarinaPL());
  const upM = (u) => setM(prev => ({...prev, ...u}));
  const calc = calcMarinaEBITDA(m);

  const Row = ({label, children}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,color:"#6b7080"}}>{label}</span><div style={{width:120}}>{children}</div></div>;
  const NumIn = ({value, onChange}) => {
    const [loc, setLoc] = useState(String(value ?? ""));
    const ref = useRef(null);
    useEffect(() => { if (document.activeElement !== ref.current) setLoc(String(value ?? "")); }, [value]);
    return <input ref={ref} value={loc} onChange={e=>setLoc(e.target.value)} onBlur={()=>{const n=parseFloat(loc);onChange(isNaN(n)?0:n);}} style={{...sideInputStyle,background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec",textAlign:"right",width:"100%"}} />;
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:10,width:480,maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7ec",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{t.marinaPL}</div>
          <button onClick={onClose} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}}>✕</button>
        </div>
        <div style={{padding:"12px 20px"}}>
          <button onClick={()=>setM(prev=>({...prev,...MARINA_PRESET}))} style={{...btnS,background:"#eef2ff",color:"#2563eb",padding:"6px 12px",fontSize:11,fontWeight:500,marginBottom:12}}>ZAN Marina Preset</button>
          <Row label={t.berths}><NumIn value={m.berths} onChange={v=>upM({berths:v})} /></Row>
          <Row label={t.avgLength}><NumIn value={m.avgLength} onChange={v=>upM({avgLength:v})} /></Row>
          <Row label={t.unitPrice}><NumIn value={m.unitPrice} onChange={v=>upM({unitPrice:v})} /></Row>
          <Row label={t.stabOcc||"Occ %"}><NumIn value={m.stabOcc} onChange={v=>upM({stabOcc:v})} /></Row>
          <Row label={t.fuelPct}><NumIn value={m.fuelPct} onChange={v=>upM({fuelPct:v})} /></Row>
          <Row label={t.otherRevPct}><NumIn value={m.otherRevPct} onChange={v=>upM({otherRevPct:v})} /></Row>
          <Row label={t.berthingOpex}><NumIn value={m.berthingOpexPct} onChange={v=>upM({berthingOpexPct:v})} /></Row>
          <Row label={t.fuelOpex}><NumIn value={m.fuelOpexPct} onChange={v=>upM({fuelOpexPct:v})} /></Row>
          <Row label={t.otherOpex}><NumIn value={m.otherOpexPct} onChange={v=>upM({otherOpexPct:v})} /></Row>

          <div style={{marginTop:16,padding:14,background:"#f8f9fb",borderRadius:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:12}}>
              <span style={{color:"#6b7080"}}>Berthing Rev</span><span style={{textAlign:"right"}}>{fmt(calc.berthingRev)}</span>
              <span style={{color:"#6b7080"}}>Fuel Rev</span><span style={{textAlign:"right"}}>{fmt(calc.fuelRev)}</span>
              <span style={{color:"#6b7080"}}>Other Rev</span><span style={{textAlign:"right"}}>{fmt(calc.otherRev)}</span>
              <span style={{fontWeight:600}}>Total Revenue</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(calc.totalRev)}</span>
              <span style={{color:"#ef4444"}}>Total OPEX</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(calc.totalOpex)}</span>
              <span style={{fontWeight:700,fontSize:14}}>{t.ebitda}</span><span style={{textAlign:"right",fontWeight:700,fontSize:14,color:"#16a34a"}}>{fmt(calc.ebitda)}</span>
              <span style={{color:"#6b7080"}}>{t.ebitdaMargin}</span><span style={{textAlign:"right"}}>{fmtPct(calc.margin*100)}</span>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7ec",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"8px 16px",fontSize:12}}>Cancel</button>
          <button onClick={()=>{onSave(m, calc.ebitda);onClose();}} style={{...btnPrim,padding:"8px 16px",fontSize:12}}>Save & Apply EBITDA</button>
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
  const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",label:"✓",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",label:"~",t:ar?"مقبول":"Marginal"}, weak:{bg:"#fef2f2",color:"#991b1b",label:"✗",t:ar?"ضعيف":"Weak"}, none:{bg:"#f0f1f5",color:"#9ca3af",label:"—",t:"—"} }[sc.viable];
  const iCfg = { high:{label:"▲",color:"#1e40af",t:ar?"أثر كبير":"High impact"}, med:{label:"▬",color:"#6b7080",t:ar?"أثر متوسط":"Med impact"}, low:{label:"▼",color:"#9ca3af",t:ar?"أثر محدود":"Low impact"} }[sc.impact];
  const yocPct = (sc.yoc * 100).toFixed(1);
  const wPct = (sc.capexWeight * 100).toFixed(0);
  return (
    <div ref={ref} onMouseEnter={onEnter} onMouseLeave={()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{display:"flex",alignItems:"center",gap:3,cursor:"help"}}>
      <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:vCfg.bg,color:vCfg.color,fontWeight:700}}>{vCfg.label}{yocPct>0?` ${yocPct}%`:""}</span>
      <span style={{fontSize:9,color:iCfg.color,fontWeight:600}}>{iCfg.label}{wPct}%</span>
      {show && <div style={{position:"fixed",top:pos.top,left:Math.max(10, Math.min(pos.left - 150, (typeof window!=="undefined"?window.innerWidth:800) - 310)),transform:"translateY(-100%)",width:300,background:"#1a1d23",color:"#e5e7ec",padding:"14px 16px",borderRadius:10,fontSize:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start",pointerEvents:"none"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#5fbfbf",borderBottom:"1px solid #282d3a",paddingBottom:6}}>{name || (ar?"أصل":"Asset")}</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"#6b7080"}}>{ar?"الجدوى":"Viability"}</span>
          <span style={{fontWeight:600,color:vCfg.color}}>{vCfg.t}</span>
          <span style={{color:"#6b7080"}}>{ar?"العائد على التكلفة":"Yield on Cost"}</span>
          <span style={{fontWeight:600}}>{yocPct}%  <span style={{fontWeight:400,color:"#6b7080"}}>({ar?"إيراد سنوي ÷ CAPEX":"annual rev ÷ CAPEX"})</span></span>
          <span style={{color:"#6b7080"}}>{ar?"إيراد سنوي":"Annual Rev"}</span>
          <span style={{fontWeight:600}}>{fmtM(sc.annualRev)}</span>
          <span style={{color:"#6b7080"}}>CAPEX</span>
          <span style={{fontWeight:600}}>{fmtM(sc.capex)}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"#6b7080"}}>{ar?"الأثر":"Impact"}</span>
          <span style={{fontWeight:600,color:iCfg.color}}>{iCfg.t}</span>
          <span style={{color:"#6b7080"}}>{ar?"وزن CAPEX":"CAPEX Weight"}</span>
          <span style={{fontWeight:600}}>{wPct}% {ar?"من المشروع":"of project"}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,fontSize:10,color:"#9ca3af",fontStyle:"italic"}}>
          {sc.impact==="low"?(ar?"نقل هذا الأصل بين المراحل لن يؤثر كثيراً على المشروع":"Moving this asset between phases won't significantly affect the project"):sc.impact==="high"?(ar?"أصل محوري — أي تغيير في موقعه أو توقيته يؤثر بشكل كبير":"Key asset — any change in timing significantly affects the project"):(ar?"أثر متوسط — يجب مراعاة التوقيت":"Moderate impact — timing matters")}
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSET PROGRAM TABLE
// ═══════════════════════════════════════════════════════════════
function AssetTable({ project, upAsset, addAsset, rmAsset, results, t, lang, updateProject }) {
  const isMobile = useIsMobile();
  const [modal, setModal] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");
  const [editIdx, setEditIdx] = useState(null);
  const fileRef = useRef(null);
  if (!project) return null;
  const assets = project.assets || [];
  const phaseNames = project.phases.map(p => p.name);

  // Auto-open detail modal after adding a new asset
  const handleAddAsset = () => {
    addAsset();
    // Open the newly added asset (will be at end of list)
    setTimeout(() => setEditIdx(assets.length), 50);
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
          updatedPhases.push({ name: pName, startYearOffset: updatedPhases.length + 1, completionMonth: 36, footprint: 0 });
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
      setImportMsg({ type: 'error', text: String(err) });
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
  const ar = lang === "ar";
  const toggleCol = (key) => { setHiddenCols(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; }); };
  const visibleCols = cols.filter(c => !hiddenCols.has(c.key));

  // Phase management
  const addPhase = () => { const n = project.phases.length + 1; const prevMonth = project.phases[project.phases.length-1]?.completionMonth || 36; updateProject({ phases: [...project.phases, { name: `Phase ${n}`, startYearOffset: n, completionMonth: prevMonth + 24, footprint: 0 }] }); };
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

  return (
    <div>
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"8px 12px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:600,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المراحل":"Phases"}</span>
          <div style={{flex:1}} />
          <button onClick={addPhase} style={{...btnS,background:"#f0f4ff",color:"#2563eb",padding:"3px 10px",fontSize:9,fontWeight:600,border:"1px solid #bfdbfe"}}>+ {ar?"مرحلة":"Phase"}</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {project.phases.map((ph, i) => {
            const assetCount = assets.filter(a => a.phase === ph.name).length;
            return (
              <div key={i} style={{background:"#f8f9fb",borderRadius:6,border:"1px solid #e5e7ec",padding:"4px 10px",display:"flex",alignItems:"center",gap:6}}>
                {editingPhase === i ? (
                  <input value={ph.name} onChange={e => renamePhase(i, e.target.value)} onBlur={() => setEditingPhase(null)} onKeyDown={e => { if (e.key === "Enter") setEditingPhase(null); }} autoFocus style={{fontSize:11,fontWeight:600,border:"1px solid #2563eb",borderRadius:3,padding:"1px 5px",width:80,fontFamily:"inherit",outline:"none"}} />
                ) : (
                  <span onClick={() => setEditingPhase(i)} style={{fontSize:11,fontWeight:600,color:"#1a1d23",cursor:"pointer"}} title={ar?"اضغط لإعادة التسمية":"Click to rename"}>{ph.name}</span>
                )}
                <span style={{fontSize:9,color:"#9ca3af",background:"#e5e7ec",borderRadius:8,padding:"1px 5px"}}>{assetCount}</span>
                <span style={{fontSize:9,color:"#6b7080",marginInlineStart:2}} title={ar?"شهر اكتمال المرحلة":"Phase completion month"}>{ar?"افتتاح:":"Opens:"}</span>
                <input type="number" value={ph.completionMonth||36} onChange={e=>{const ph2=[...project.phases];ph2[i]={...ph2[i],completionMonth:parseInt(e.target.value)||36};updateProject({phases:ph2});}} style={{width:38,fontSize:10,fontWeight:600,border:"1px solid #e5e7ec",borderRadius:3,padding:"1px 4px",textAlign:"center",fontFamily:"inherit",background:"#fff"}} min={1} />
                <span style={{fontSize:8,color:"#9ca3af"}}>{ar?"شهر":"mo"}</span>
                {project.phases.length > 1 && (
                  <button onClick={()=>rmPhase(i)} style={{background:"none",border:"none",color:"#d0d4dc",padding:0,fontSize:11,cursor:"pointer",lineHeight:1,fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#d0d4dc"} title={ar?"حذف":"Delete"}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {assets.length > 0 && (
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:600,color:"#6b7080"}}>{ar?"فلترة:":"Filter:"}</span>
          <select value={filterPhase} onChange={e=>setFilterPhase(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit",color:"#1a1d23"}}>
            <option value="all">{ar?"كل المراحل":"All Phases"}</option>
            {phaseNames.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit",color:"#1a1d23"}}>
            <option value="all">{ar?"كل التصنيفات":"All Categories"}</option>
            {[...new Set(assets.map(a=>a.category))].filter(Boolean).map(c=><option key={c} value={c}>{catL(c,ar)}</option>)}
          </select>
          <select value={filterRev} onChange={e=>setFilterRev(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"1px solid #e5e7ec",background:"#fff",fontFamily:"inherit",color:"#1a1d23"}}>
            <option value="all">{ar?"كل أنواع الإيراد":"All Rev Types"}</option>
            {[...new Set(assets.map(a=>a.revType))].filter(Boolean).map(r2=><option key={r2} value={r2}>{revL(r2,ar)}</option>)}
          </select>
          {(filterPhase!=="all"||filterCat!=="all"||filterRev!=="all") && (
            <button onClick={()=>{setFilterPhase("all");setFilterCat("all");setFilterRev("all");}} style={{...btnS,padding:"4px 10px",fontSize:10,background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca"}}>{ar?"مسح الفلتر":"Clear"}</button>
          )}
        </div>
      )}

      {/* ── Asset Header ── */}
      <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:15,fontWeight:600}}>{t.assetProgram}</div>
        <div style={{fontSize:12,color:"#6b7080"}}>{isFiltered?`${filteredIndices.length}/${assets.length}`:assets.length} {t.assets}</div>
        <div style={{flex:1}} />
        <div style={{display:"flex",background:"#f0f1f5",borderRadius:6,padding:2}}>
          <button onClick={()=>setViewMode("cards")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="cards"?"#fff":"transparent",color:viewMode==="cards"?"#1a1d23":"#9ca3af",boxShadow:viewMode==="cards"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>▦ {lang==="ar"?"بطاقات":"Cards"}</button>
          <button onClick={()=>setViewMode("table")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="table"?"#fff":"transparent",color:viewMode==="table"?"#1a1d23":"#9ca3af",boxShadow:viewMode==="table"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>☰ {lang==="ar"?"جدول":"Table"}</button>
        </div>
        {viewMode==="table" && <div style={{position:"relative"}}>
          <button onClick={()=>setShowColPicker(!showColPicker)} style={{...btnS,background:showColPicker?"#e0e7ff":"#f0f1f5",color:"#6b7080",padding:"5px 10px",fontSize:10,fontWeight:500,border:"1px solid #e5e7ec"}} title={ar?"إظهار/إخفاء أعمدة":"Show/Hide Columns"}>⚙ {ar?"أعمدة":"Cols"} ({cols.length - hiddenCols.size}/{cols.length})</button>
          {showColPicker && <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#fff",border:"1px solid #e5e7ec",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,padding:"8px 0",width:180,maxHeight:320,overflowY:"auto"}}>
            {cols.filter(c=>!["#","ops"].includes(c.key)).map(c=>(
              <label key={c.key} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",fontSize:11,cursor:"pointer",color:hiddenCols.has(c.key)?"#9ca3af":"#1a1d23"}} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={!hiddenCols.has(c.key)} onChange={()=>toggleCol(c.key)} style={{accentColor:"#2563eb"}} />
                {ar?c.ar:c.en}
              </label>
            ))}
            <div style={{borderTop:"1px solid #e5e7ec",margin:"4px 0"}} />
            <button onClick={()=>setHiddenCols(new Set())} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"#2563eb",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"إظهار الكل":"Show All"}</button>
            <button onClick={()=>setHiddenCols(new Set(["plotArea","footprint","esc","ramp","occ"]))} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"#6b7080",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"الافتراضي":"Default"}</button>
          </div>}
        </div>}
        <button onClick={()=>generateTemplate()} style={{...btnS,background:"#f0fdf4",color:"#16a34a",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bbf7d0"}} title={lang==='ar'?"تحميل نموذج Excel":"Download Excel Template"}>
          {lang==='ar'?'⬇ تحميل نموذج':'⬇ Template'}
        </button>
        <button onClick={()=>exportAssetsToExcel(project, results)} style={{...btnS,background:"#eff6ff",color:"#2563eb",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bfdbfe"}} title={lang==='ar'?"تصدير الأصول إلى Excel":"Export Assets to Excel"}>
          {lang==='ar'?'⬇ تصدير':'⬇ Export'}
        </button>
        <input type="file" accept=".csv,.tsv" ref={fileRef} onChange={handleUpload} style={{display:"none"}} />
        <button onClick={()=>fileRef.current?.click()} style={{...btnS,background:"#fef3c7",color:"#92400e",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #fde68a"}} title={lang==='ar'?"رفع ملف Excel":"Upload Excel File"}>
          {lang==='ar'?'⬆ رفع ملف':'⬆ Upload'}
        </button>
        <button onClick={handleAddAsset} style={{...btnPrim,padding:"7px 16px",fontSize:12}}>{t.addAsset}</button>
      </div>

      {/* Import message */}
      {importMsg && (
        <div style={{
          marginBottom:12, padding:"10px 14px", borderRadius:6, fontSize:12,
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
        {assets.length===0 ? (
          <div style={{textAlign:"center",padding:48,color:"#9ca3af",background:"#fff",borderRadius:12,border:"2px dashed #e5e7ec"}}>
            <div style={{fontSize:32,marginBottom:8}}>🏗</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{lang==="ar"?"لا توجد أصول":"No assets yet"}</div>
            <div style={{fontSize:12}}>{lang==="ar"?"اضغط '+ إضافة أصل' أو استخدم المساعد الذكي":"Click '+ Add Asset' or use the AI Assistant"}</div>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))",gap:isMobile?8:12}}>
            {filteredIndices.map(i=>{const a=assets[i];const comp=results?.assetSchedules?.[i];const capex=comp?.totalCapex||computeAssetCapex(a,project);const income=comp?.totalRevenue||0;const catC={Hospitality:"#8b5cf6",Retail:"#3b82f6",Office:"#06b6d4",Residential:"#22c55e",Marina:"#0ea5e9",Industrial:"#f59e0b",Cultural:"#ec4899"};const catI={Hospitality:"🏨",Retail:"🛍",Office:"🏢",Residential:"🏠",Marina:"⚓",Industrial:"🏭",Cultural:"🎭","Open Space":"🌳",Utilities:"⚡",Flexible:"🔧"};const cc=catC[a.category]||"#6b7080";
            return <div key={a.id||i} className="asset-card" onClick={()=>setEditIdx(i)} style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7ec",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",animationDelay:i*0.05+"s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
              <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{catI[a.category]||"📦"}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:10,color:"#9ca3af"}}>{a.code?a.code+" · ":""}{a.phase}</div></div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:10,background:cc+"15",color:cc,fontWeight:600}}>{catL(a.category,ar)}</span>
              </div>
              <div style={{padding:"10px 16px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                <div><span style={{color:"#9ca3af"}}>{ar?"GFA":"GFA"}</span><div style={{fontWeight:600}}>{fmt(a.gfa)} m²</div></div>
                <div><span style={{color:"#9ca3af"}}>{a.revType==="Lease"?(ar?"الإيجار":"Rate"):a.revType==="Sale"?(ar?"سعر البيع":"Sale Price"):(ar?"أرباح تشغيلية":"EBITDA")}</span><div style={{fontWeight:600}}>{a.revType==="Lease"?fmt(a.leaseRate)+" /m²":a.revType==="Sale"?fmt(a.salePricePerSqm||0)+" /m²":fmtM(a.opEbitda)}</div></div>
                <div><span style={{color:"#9ca3af"}}>{ar?"CAPEX":"CAPEX"}</span><div style={{fontWeight:700,color:"#ef4444"}}>{fmtM(capex)}</div></div>
                <div><span style={{color:"#9ca3af"}}>{ar?"الإيرادات":"Revenue"}</span><div style={{fontWeight:700,color:"#16a34a"}}>{fmtM(income)}</div></div>
              </div>
            </div>;})}
          </div>
        )}
        {editIdx!==null&&editIdx<assets.length&&(()=>{const a=assets[editIdx],i=editIdx,comp=results?.assetSchedules?.[i],isOp=a.revType==="Operating",isSale=a.revType==="Sale",isH=isOp&&a.category==="Hospitality",isM=isOp&&a.category==="Marina";
        const F2=({label,children})=><div style={{marginBottom:8}}><div style={{fontSize:10,color:"#6b7080",marginBottom:3,fontWeight:500}}>{label}</div>{children}</div>;
        const g3=isMobile?"1fr 1fr":"1fr 1fr 1fr";
        const g2=isMobile?"1fr":"1fr 1fr";
        return <><div onClick={()=>setEditIdx(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:9990}} />
        <div style={{position:"fixed",zIndex:9991,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",...(isMobile?{inset:0,borderRadius:0}:{top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:560,maxWidth:"94vw",maxHeight:"88vh",borderRadius:16})}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7ec",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:11,color:"#9ca3af"}}>{catL(a.category,ar)} · {a.phase}</div></div>
            <button onClick={()=>{rmAsset(i);setEditIdx(null);}} style={{...btnS,background:"#fef2f2",color:"#ef4444",padding:"6px 12px",fontSize:11}}>{ar?"حذف":"Delete"}</button>
            <button onClick={()=>setEditIdx(null)} style={{...btnS,background:"#f0f1f5",padding:"6px 10px",fontSize:16,lineHeight:1}}>✕</button>
          </div>
          <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              <F2 label={ar?"المرحلة":"Phase"}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></F2>
              <F2 label={ar?"التصنيف":"Category"}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></F2>
              <F2 label={ar?"نوع الإيراد":"Rev Type"}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></F2>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <F2 label={ar?"الاسم":"Name"}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"اسم الأصل":"Name"} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"الرمز":"Code"}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{ar?"المساحات":"Areas"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              <F2 label={ar?"مساحة القطعة Plot Area":"Plot Area"}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"المسطح البنائي Footprint":"Footprint"}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"المساحة الطابقية GFA (م²)":"GFA (m²)"}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{ar?"الإيرادات":"Revenue"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              <F2 label={ar?"نسبة الكفاءة Eff %":"Efficiency %"}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"معدل الإيجار Lease Rate /م²":"Lease Rate"}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"EBITDA التشغيلية":"Op EBITDA"}><EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              {isSale && <>
                <F2 label={ar?"سعر البيع/م²":"Sale Price/sqm"}><EditableCell type="number" value={a.salePricePerSqm||0} onChange={v=>upAsset(i,{salePricePerSqm:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
                <F2 label={ar?"سنوات الاستيعاب":"Absorption Yrs"}><EditableCell type="number" value={a.absorptionYears||3} onChange={v=>upAsset(i,{absorptionYears:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
                <F2 label={ar?"ما قبل البيع %":"Pre-Sale %"}><EditableCell type="number" value={a.preSalePct||0} onChange={v=>upAsset(i,{preSalePct:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
                <F2 label={ar?"عمولة البيع %":"Commission %"}><EditableCell type="number" value={a.commissionPct||0} onChange={v=>upAsset(i,{commissionPct:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              </>}
              <F2 label={ar?"نسبة الزيادة Esc %":"Escalation %"}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"سنوات النمو Ramp":"Ramp Years"}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"نسبة الإشغال Occ %":"Occupancy %"}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{ar?"البناء":"Construction"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <F2 label={ar?"تكلفة/م² Cost/sqm":"Cost/m²"}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
              <F2 label={ar?"مدة البناء (شهر)":"Build duration (months)"}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} style={{padding:"7px 10px",border:"1px solid #e5e7ec",borderRadius:6,background:"#fafbfc"}} /></F2>
            </div>
            {(isH||isM)&&<button onClick={()=>setModal({type:isH?"hotel":"marina",idx:i})} style={{...btnPrim,padding:"8px 16px",fontSize:12,marginBottom:12}}>{isH?(ar?"⚙ حساب أرباح الفندق":"⚙ Hotel P&L"):(ar?"⚙ حساب أرباح المارينا":"⚙ Marina P&L")}</button>}
            <div style={{background:"#f8f9fb",borderRadius:8,padding:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:12}}>
              <div><span style={{color:"#6b7080"}}>{ar?"التكاليف:":"CAPEX:"}</span> <strong style={{color:"#ef4444"}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</strong></div>
              <div><span style={{color:"#6b7080"}}>{ar?"الإيرادات:":"Income:"}</span> <strong style={{color:"#16a34a"}}>{fmt(comp?.totalRevenue||0)}</strong></div>
              {(()=>{
                const sc = getAssetScore(a, comp);
                const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",t:ar?"مقبول":"Marginal"}, weak:{bg:"#fef2f2",color:"#991b1b",t:ar?"ضعيف":"Weak"}, none:{bg:"#f0f1f5",color:"#9ca3af",t:"—"} }[sc.viable];
                const wPct = (sc.capexWeight * 100).toFixed(0);
                const impLabel = sc.impact==="high"?(ar?"أثر كبير":"High impact"):sc.impact==="med"?(ar?"أثر متوسط":"Med impact"):(ar?"أثر محدود":"Low impact");
                return <div><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:vCfg.bg,color:vCfg.color,fontWeight:600}}>{vCfg.t}</span> <span style={{fontSize:9,color:"#6b7080"}}>{impLabel} ({wPct}%)</span></div>;
              })()}
            </div>
          </div>
        </div></>;})()}
      </div>)}
      {/* TABLE VIEW */}
      {viewMode === "table" && (<>
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead>
              <tr>
                {visibleCols.map(c=>(
                  <th key={c.key} style={{...thSt,whiteSpace:"nowrap",minWidth:c.w, ...(c.key==="totalCapex"?{background:"#eef2ff"}:c.key==="totalInc"?{background:"#ecfdf5"}:c.key==="score"?{background:"#fefce8"}:{})}}>
                    <div>{c.en}</div>
                    {c.ar!==c.en&&<div style={{fontWeight:400,fontSize:9,color:"#9ca3af"}}>{c.ar}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length===0?(
                <tr><td colSpan={visibleCols.length} style={{...tdSt,textAlign:"center",color:"#9ca3af",padding:32}}>{t.noAssets}</td></tr>
              ):(
                filteredIndices.map(i=>{
                  const a = assets[i];
                  const comp = results?.assetSchedules?.[i];
                  const isOp = a.revType === "Operating";
                  const isHotel = isOp && (a.category === "Hospitality");
                  const isMarina = isOp && (a.category === "Marina");
                  const bg = i%2===0?"#fff":"#fafbfc";
                  const hd = (key) => hiddenCols.has(key) ? {display:"none"} : {};
                  return (
                    <tr key={a.id||i} style={{background:bg}}>
                      <td style={{...tdSt,color:"#9ca3af",fontWeight:500,width:30,...hd("#")}}>{i+1}</td>
                      <td style={{...tdSt,...hd("phase")}}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></td>
                      <td style={{...tdSt,...hd("category")}}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></td>
                      <td style={{...tdSt,...hd("name")}}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"الاسم":"Name"} /></td>
                      <td style={{...tdSt,...hd("code")}}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{width:45}} /></td>
                      <td style={{...tdSt,...hd("plotArea")}}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} /></td>
                      <td style={{...tdSt,...hd("footprint")}}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} /></td>
                      <td style={{...tdSt,...hd("gfa")}}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} /></td>
                      <td style={{...tdSt,...hd("revType")}}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></td>
                      <td style={{...tdSt,...hd("eff")}}>{(()=>{const bc=benchmarkColor("efficiency",a.efficiency,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip}%`:undefined}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,color:"#6b7080",textAlign:"right",fontSize:11,...hd("leasable")}}>{fmt(comp?.leasableArea||(a.gfa||0)*(a.efficiency||0)/100)}</td>
                      <td style={{...tdSt,background:isOp?"#f5f5f5":undefined,...hd("rate")}}>{(()=>{const bc=benchmarkColor("leaseRate",a.leaseRate,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{opacity:isOp?0.3:1,...(bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:{})}} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("opEbitda")}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          {isOp ? (
                            <>
                              <span style={{fontSize:10,color:"#6b7080",minWidth:55,textAlign:"right"}}>{fmtM(a.opEbitda||0)}</span>
                              {(isHotel||isMarina) && <button onClick={()=>setModal({type:isHotel?"hotel":"marina",idx:i})} style={{...btnSm,background:"#eef2ff",color:"#2563eb",fontSize:9,padding:"2px 6px",whiteSpace:"nowrap"}}>{isHotel?"P&L":"P&L"}</button>}
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
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,color:"#16a34a",background:"#f0fdf4",fontSize:11,...hd("totalInc")}}>{fmt(comp?.totalRevenue||0)}</td>
                      <td style={{...tdSt,background:"#fffdf5",overflow:"visible",position:"relative",...hd("score")}}>{(()=>{
                        const sc = getAssetScore(a, comp);
                        return <ScoreCell sc={sc} name={a.name} ar={ar} />;
                      })()}</td>
                      <td style={{...tdSt,...hd("ops")}}><button onClick={()=>rmAsset(i)} style={{...btnSm,background:"#fef2f2",color:"#ef4444",fontSize:10}}>✕</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* Hotel P&L Modal */}
      {modal?.type==="hotel"&&<HotelPLModal
        data={assets[modal.idx]?.hotelPL}
        onSave={(h,ebitda)=>upAsset(modal.idx,{hotelPL:h,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t}
      />}
      {modal?.type==="marina"&&<MarinaPLModal
        data={assets[modal.idx]?.marinaPL}
        onSave={(m,ebitda)=>upAsset(modal.idx,{marinaPL:m,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t}
      />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function ProjectDash({ project, results, checks, t, financing, onGoToAssets, lang, incentivesResult, setActiveTab }) {
  if (!project || !results) return null;
  const isMobile = useIsMobile();
  const c = results.consolidated;
  const cur = project.currency || "SAR";
  const phases = Object.entries(results.phaseResults);
  const fc = checks.filter(ch => !ch.pass).length;
  const f = financing;
  const h = results.horizon;
  const ar = lang === "ar";
  const hasAssets = (project.assets||[]).length > 0;
  const ir = incentivesResult;

  const hasIncentives = (ir && ir.totalIncentiveValue > 0) || (ir && ir.finSupportEstimate) || (f && f.interestSubsidyTotal > 0);
  const displayIRR = (ir && ir.totalIncentiveValue > 0 && ir.adjustedIRR !== null) ? ir.adjustedIRR : c.irr;
  const displayNPV10 = (ir && ir.totalIncentiveValue > 0) ? ir.adjustedNPV10 : c.npv10;
  const displayTotalNetCF = (ir && ir.totalIncentiveValue > 0) ? ir.adjustedTotalNetCF : c.totalNetCF;

  let cumCF = 0, paybackYr = null, _pbNeg = false;
  for (let y = 0; y < h; y++) { cumCF += c.netCF[y]; if (cumCF < -1) _pbNeg = true; if (cumCF > 0 && _pbNeg && paybackYr === null) paybackYr = y + 1; }
  const stabYear = Math.min(10, h - 1);
  const cashYield = f && f.totalEquity > 0 ? (c.income[stabYear] / f.totalEquity * 100) : null;

  // ── Getting Started Guide (no assets) ──
  if (!hasAssets) {
    return (<div>
      <div style={{background:"linear-gradient(135deg, #0f766e08, #1e40af12)",borderRadius:16,border:"1px solid #2563eb20",padding:"32px 28px",textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:12}}>🚀</div>
        <div style={{fontSize:20,fontWeight:700,color:"#1a1d23",marginBottom:8}}>{ar?"مشروعك جاهز. هذه هي الخطوة التالية":"Your Project is Ready! Next Step"}</div>
        <div style={{fontSize:13,color:"#6b7080",marginBottom:24,maxWidth:480,margin:"0 auto 24px"}}>{ar?"أضف أصول مشروعك (محلات، فنادق، مكاتب، سكني...) عشان تبدأ تشوف الأرقام والتحليلات":"Add your project assets (retail, hotels, offices, residential...) to start seeing numbers and analytics"}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGoToAssets} style={{...btnPrim,padding:"12px 28px",fontSize:14,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
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
          <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px",opacity:s.done?0.7:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:s.done?"#16a34a":"#1a1d23"}}>{s.title}{s.done?" ✓":""}</span>
            </div>
            <div style={{fontSize:11,color:"#6b7080",lineHeight:1.5}}>{s.desc}</div>
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

  // ── Sources & Uses ──
  const totalCapex = c.totalCapex;
  const landCost = project.landType === 'purchase' ? (project.landPurchasePrice || 0) : 0;
  const landCap = f ? f.landCapValue || 0 : 0;
  const grantTotal = ir ? ir.capexGrantTotal || 0 : 0;
  const upfrontFee = f ? f.upfrontFee || 0 : 0;
  const totalUses = totalCapex + landCost + landCap + upfrontFee;
  const totalDebt = f ? f.totalDebt || 0 : 0;
  const totalEquity = f ? f.totalEquity || 0 : 0;

  // ── Cash flow chart data (SVG bars) ──
  const chartYears = Math.min(20, h);
  const maxVal = Math.max(...c.income.slice(0, chartYears), ...c.capex.slice(0, chartYears), 1);
  const minCF = Math.min(...c.netCF.slice(0, chartYears), 0);
  const maxCF = Math.max(...c.netCF.slice(0, chartYears), 1);
  const cfRange = Math.max(maxCF, Math.abs(minCF), 1);

  return (<div>
    {/* ═══ SECTION 1: Decision Summary ═══ */}
    <div style={{background:`linear-gradient(135deg, ${healthColor}08, ${healthColor}18)`,borderRadius:14,border:`2px solid ${healthColor}30`,padding:isMobile?"16px 14px":"22px 26px",marginBottom:20,display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?14:20,flexWrap:"wrap"}}>
      {/* Health badge */}
      <div style={{textAlign:"center",minWidth:90}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${healthColor}18`,border:`3px solid ${healthColor}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}>
          <span style={{fontSize:26,fontWeight:800,color:healthColor}}>{irrVal > 0 ? (irrVal*100).toFixed(0)+"%" : "—"}</span>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:healthColor,textTransform:"uppercase",letterSpacing:0.6}}>{healthLabel}</div>
        <div style={{fontSize:9,color:"#6b7080"}}>IRR (Unlevered)</div>
      </div>
      {/* Key numbers */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:12}}>
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"صافي القيمة الحالية":"NPV @10%"}</div>
          <div style={{fontSize:20,fontWeight:800,color:displayNPV10>0?"#16a34a":"#ef4444"}}>{fmtM(displayNPV10)}</div>
          <div style={{fontSize:10,color:"#9ca3af"}}>{cur}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"إجمالي التكاليف":"Total CAPEX"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1a1d23"}}>{fmtM(hasIncentives?(totalCapex-grantTotal):totalCapex)}</div>
          <div style={{fontSize:10,color:"#9ca3af"}}>{cur}{hasIncentives?` (${ar?"بعد المنحة":"net of grant"})`:""}</div>
        </div>
        {f && f.mode !== "self" && <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"IRR بعد التمويل":"Levered IRR"}</div>
          <div style={{fontSize:20,fontWeight:800,color:f.leveredIRR>0.15?"#16a34a":"#8b5cf6"}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(1)+"%":"N/A"}</div>
        </div>}
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"فترة الاسترداد":"Payback"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>{paybackYr ? (ar?`${paybackYr} سنة`:`Yr ${paybackYr}`) : "N/A"}</div>
          {paybackYr && <div style={{fontSize:10,color:"#9ca3af"}}>{results.startYear + paybackYr - 1}</div>}
        </div>
        <div>
          <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{ar?"الفحوصات":"Checks"}</div>
          <div style={{fontSize:20,fontWeight:800,color:fc===0?"#16a34a":"#ef4444"}}>{fc===0?(ar?"✓ سليم":"✓ Pass"):`${fc} ✗`}</div>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 2: Sources & Uses + Key Metrics ═══ */}
    <div style={{display:"grid",gridTemplateColumns:f&&f.mode!=="self"?(isMobile?"1fr":"1fr 1fr"):"1fr",gap:14,marginBottom:20}}>
      {/* Sources & Uses */}
      {f && f.mode !== "self" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15}}>💰</span> {ar?"مصادر واستخدامات التمويل":"Sources & Uses"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Sources */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#16a34a",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                {totalDebt > 0 && [<span key="dl" style={{color:"#6b7080"}}>{ar?"قرض بنكي":"Bank Debt"}</span>,<span key="dv" style={{textAlign:"right",fontWeight:500}}>{fmtM(totalDebt)}</span>]}
                <span style={{color:"#6b7080"}}>{ar?"حقوق ملكية":"Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(totalEquity)}</span>
                {grantTotal > 0 && [<span key="gl" style={{color:"#6b7080"}}>{ar?"منحة حكومية":"CAPEX Grant"}</span>,<span key="gv" style={{textAlign:"right",fontWeight:500,color:"#16a34a"}}>{fmtM(grantTotal)}</span>]}
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(totalDebt + totalEquity + grantTotal)}</span>
              </div>
              {/* LTV bar */}
              {totalDebt > 0 && (() => {
                const ltv = (totalDebt / (totalDebt + totalEquity) * 100);
                return <div style={{marginTop:10}}>
                  <div style={{fontSize:10,color:"#6b7080",marginBottom:3}}>LTV: {ltv.toFixed(0)}%</div>
                  <div style={{height:6,borderRadius:3,background:"#f0f1f5",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ltv}%`,background:ltv>75?"#ef4444":ltv>60?"#f59e0b":"#16a34a",borderRadius:3}} />
                  </div>
                </div>;
              })()}
            </div>
            {/* Uses */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#ef4444",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fee2e2"}}>{ar?"الاستخدامات":"USES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                <span style={{color:"#6b7080"}}>{ar?"تكاليف البناء":"Construction"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(totalCapex)}</span>
                {landCost > 0 && [<span key="ll" style={{color:"#6b7080"}}>{ar?"شراء الأرض":"Land Purchase"}</span>,<span key="lv" style={{textAlign:"right",fontWeight:500}}>{fmtM(landCost)}</span>]}
                {landCap > 0 && [<span key="cl" style={{color:"#6b7080"}}>{ar?"رسملة الأرض":"Land Cap."}</span>,<span key="cv" style={{textAlign:"right",fontWeight:500}}>{fmtM(landCap)}</span>]}
                {upfrontFee > 0 && [<span key="fl" style={{color:"#6b7080"}}>{ar?"رسوم القرض":"Loan Fee"}</span>,<span key="fv" style={{textAlign:"right",fontWeight:500}}>{fmtM(upfrontFee)}</span>]}
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(totalUses)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 20px"}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:15}}>📊</span> {ar?"المؤشرات الرئيسية":"Key Metrics"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:10}}>
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"إجمالي الإيرادات":"Total Income"} ({h}{ar?" سنة":"yr"})</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16a34a"}}>{fmtM(c.totalIncome)}</div>
          </div>
          <div style={{background:displayTotalNetCF>=0?"#f0fdf4":"#fef2f2",borderRadius:8,padding:"10px 12px",border:`1px solid ${displayTotalNetCF>=0?"#dcfce7":"#fee2e2"}`}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"صافي التدفق":"Net CF"}{hasIncentives?` (${ar?"+حوافز":"+inc."})`:""}</div>
            <div style={{fontSize:16,fontWeight:700,color:displayTotalNetCF>=0?"#16a34a":"#ef4444"}}>{fmtM(displayTotalNetCF)}</div>
          </div>
          {f && f.mode !== "self" && <>
            <div style={{background:"#fffbeb",borderRadius:8,padding:"10px 12px",border:"1px solid #fef3c7"}}>
              <div style={{fontSize:10,color:"#6b7080"}}>{ar?"إجمالي الدين":"Total Debt"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#f59e0b"}}>{fmtM(totalDebt)}</div>
            </div>
            <div style={{background:"#f5f3ff",borderRadius:8,padding:"10px 12px",border:"1px solid #ede9fe"}}>
              <div style={{fontSize:10,color:"#6b7080"}}>{ar?"إجمالي الفوائد":"Total Interest"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#8b5cf6"}}>{fmtM(f.totalInterest)}</div>
            </div>
          </>}
          {cashYield !== null && <div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",border:"1px solid #dbeafe"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"العائد النقدي":"Cash Yield"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#2563eb"}}>{fmtPct(cashYield)}</div>
          </div>}
          {hasIncentives && ir && <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",border:"1px solid #bbf7d0"}}>
            <div style={{fontSize:10,color:"#6b7080"}}>{ar?"قيمة الحوافز":"Incentive Value"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16a34a"}}>{fmtM(ir.totalIncentiveValue + (f?.interestSubsidyTotal||0))}</div>
          </div>}
        </div>
        {/* Land info compact */}
        <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #f0f1f5",display:"flex",gap:16,fontSize:11,color:"#6b7080",flexWrap:"wrap"}}>
          <span>{ar?"الأرض":"Land"}: <strong>{({lease:ar?"إيجار":"Lease",purchase:ar?"شراء":"Purchase",partner:ar?"شراكة":"Partner",bot:"BOT"})[project.landType]||project.landType}</strong></span>
          <span>{ar?"المساحة":"Area"}: <strong>{fmt(project.landArea)} m²</strong></span>
          {project.landType==="lease"&&<span>{ar?"إيجار سنوي":"Annual"}: <strong>{fmt(project.landRentAnnual)} {cur}</strong></span>}
          {project.landType==="purchase"&&<span>{ar?"السعر":"Price"}: <strong>{fmt(project.landPurchasePrice)} {cur}</strong></span>}
          {project.landType==="lease"&&<span>{ar?"إجمالي الإيجار":"Total Rent"}: <strong style={{color:"#ef4444"}}>{fmt(c.totalLandRent)} {cur}</strong></span>}
          <span>{ar?"الأصول":"Assets"}: <strong>{project.assets.length}</strong></span>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 3: Cash Flow Chart (SVG) ═══ */}
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 20px",marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>📈</span> {ar?"التدفق النقدي السنوي":"Annual Cash Flow"}
        <span style={{fontSize:10,color:"#9ca3af",marginInlineStart:"auto"}}>{ar?`أول ${chartYears} سنة`:`First ${chartYears} years`}</span>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:16,marginBottom:10,fontSize:11}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#ef4444",display:"inline-block"}} />{ar?"التكاليف":"CAPEX"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#22c55e",display:"inline-block"}} />{ar?"الإيرادات":"Revenue"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:3,borderRadius:2,background:"#3b82f6",display:"inline-block"}} />{ar?"صافي التدفق":"Net CF"}</span>
      </div>
      <svg viewBox={`0 0 ${chartYears * 42 + 20} 180`} style={{width:"100%",height:180}}>
        {/* Grid lines */}
        <line x1="20" y1="90" x2={chartYears*42+20} y2="90" stroke="#e5e7ec" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="20" y1="10" x2={chartYears*42+20} y2="10" stroke="#f0f1f5" strokeWidth="0.5" />
        <line x1="20" y1="170" x2={chartYears*42+20} y2="170" stroke="#f0f1f5" strokeWidth="0.5" />
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42;
          const capH = maxVal > 0 ? (c.capex[y] / maxVal) * 75 : 0;
          const incH = maxVal > 0 ? (c.income[y] / maxVal) * 75 : 0;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <g key={y}>
            {/* CAPEX bar (red, going down from center) */}
            {c.capex[y] > 0 && <rect x={x} y={90} width={16} height={capH} fill="#ef444440" rx="2" stroke="#ef4444" strokeWidth="0.5" />}
            {/* Income bar (green, going up from center) */}
            {c.income[y] > 0 && <rect x={x+18} y={90-incH} width={16} height={incH} fill="#22c55e40" rx="2" stroke="#22c55e" strokeWidth="0.5" />}
            {/* Year label */}
            {y % (chartYears > 15 ? 3 : 2) === 0 && <text x={x+17} y={178} fontSize="8" fill="#9ca3af" textAnchor="middle">{y+1}</text>}
          </g>;
        })}
        {/* Net CF line */}
        <polyline
          fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"
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
          return <circle key={y} cx={x} cy={cfY} r="2.5" fill="#3b82f6" />;
        })}
      </svg>
    </div>

    {/* ═══ SECTION 4: Phase Summary ═══ */}
    {phases.length>0&&<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏗</span> {t.phaseSummary}
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["المرحلة","الأصول","إجمالي التكاليف","إجمالي الإيرادات","إيجار الأرض","صافي التدفق","IRR","نسبة الأرض"]:["Phase","Assets","Total CAPEX","Total Income","Land Rent","Net CF","IRR","Land %"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {phases.map(([n,pr])=>{
          const capexPct = c.totalCapex > 0 ? pr.totalCapex / c.totalCapex * 100 : 0;
          return <tr key={n}>
          <td style={tdSt}><strong>{n}</strong></td>
          <td style={{...tdSt,textAlign:"center"}}>{pr.assetCount}</td>
          <td style={tdN}><div>{fmt(pr.totalCapex)}</div><div style={{height:3,borderRadius:2,background:"#f0f1f5",marginTop:3}}><div style={{height:"100%",borderRadius:2,background:"#ef4444",width:`${capexPct}%`}} /></div></td>
          <td style={tdN}>{fmt(pr.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(pr.totalLandRent)}</td>
          <td style={{...tdN,color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
          <td style={{...tdN,fontWeight:600}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</td>
          <td style={tdN}>{fmtPct(pr.allocPct*100)}</td>
        </tr>;})}
        <tr style={{background:"#f8f9fb",fontWeight:700}}>
          <td style={tdSt}>{t.consolidated}</td>
          <td style={{...tdSt,textAlign:"center"}}>{project.assets.length}</td>
          <td style={tdN}>{fmt(c.totalCapex)}</td><td style={tdN}>{fmt(c.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(c.totalLandRent)}</td>
          <td style={{...tdN,color:displayTotalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(displayTotalNetCF)}</td>
          <td style={{...tdN,fontWeight:700}}>{displayIRR!==null?fmtPct(displayIRR*100):"—"}{hasIncentives?" *":""}</td>
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
        <div style={{background:hasRisk?"#fef2f2":"#f0fdf4",borderRadius:10,border:`1px solid ${hasRisk?"#fecaca":"#bbf7d0"}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setActiveTab("market")}>
          <span style={{fontSize:15}}>📊</span>
          <span style={{fontSize:12,fontWeight:600,color:hasRisk?"#991b1b":"#15803d"}}>{ar?"مؤشرات السوق":"Market Indicators"}</span>
          <div style={{display:"flex",gap:8,fontSize:11}}>
            {low > 0 && <span style={{color:"#16a34a",fontWeight:500}}>{low} {ar?"آمن":"safe"}</span>}
            {med > 0 && <span style={{color:"#eab308",fontWeight:500}}>{med} {ar?"متوسط":"medium"}</span>}
            {high > 0 && <span style={{color:"#ef4444",fontWeight:600}}>{high} {ar?"مرتفع":"high"}: {highNames.join(", ")}</span>}
          </div>
          <span style={{fontSize:10,color:"#9ca3af",marginInlineStart:"auto"}}>{ar?"اضغط للتفاصيل →":"Click for details →"}</span>
        </div>
      );
    })()}

    {/* ═══ SECTION 5: Asset Overview (compact) ═══ */}
    {results.assetSchedules.length>0&&<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏢</span> {t.assetOverview} ({results.assetSchedules.length})
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["#","الأصل","المرحلة","المساحة","التكاليف",`الإيرادات (${project.horizon}ع)`,"النوع"]:["#","Asset","Phase","GFA","CAPEX",`Income (${project.horizon}yr)`,"Type"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {results.assetSchedules.map((a,i)=><tr key={a.id||i}>
          <td style={{...tdSt,color:"#9ca3af",width:30}}>{i+1}</td>
          <td style={tdSt}>{a.name||"—"} <span style={{color:"#9ca3af",fontSize:10}}>({catL(a.category,ar)})</span></td>
          <td style={tdSt}>{a.phase}</td>
          <td style={tdN}>{fmt(a.gfa)}</td><td style={tdN}>{fmt(a.totalCapex)}</td>
          <td style={{...tdN,color:"#16a34a"}}>{fmt(a.totalRevenue)}</td><td style={{...tdSt,fontSize:11}}>{revL(a.revType,ar)}</td>
        </tr>)}
      </tbody></table></div>
    </div>}
  </div>);
}

// ── Inline tooltip component for KPIs and table headers ──
function Tip({text,children}) {
  const [show,setShow]=useState(false);
  const ref=useRef(null);
  const [pos,setPos]=useState({top:0,left:0});
  const onEnter=()=>{
    if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+6,left:r.left+r.width/2});}
    setShow(true);
  };
  return <span style={{display:"inline-flex",alignItems:"center"}}>
    {children}
    <span ref={ref} onMouseEnter={onEnter} onMouseLeave={()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{cursor:"help",fontSize:10,color:"#9ca3af",marginInlineStart:3,lineHeight:1}}>ⓘ</span>
    {show&&<div style={{position:"fixed",top:pos.top,...(document.dir==="rtl"?{right:Math.max(10,Math.min(window.innerWidth-pos.left-140,window.innerWidth-300))}:{left:Math.max(10,Math.min(pos.left-140,window.innerWidth-300))}),width:280,background:"#1a1d23",color:"#d0d4dc",padding:"10px 13px",borderRadius:8,fontSize:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start",pointerEvents:"none"}}>{text.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?4:0}}>{line}</div>)}</div>}
  </span>;
}

function KPI({label,value,sub,color,tip}) {
  return <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"12px 14px"}}>
    <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>{tip?<Tip text={tip}>{label}</Tip>:label}</div>
    <div style={{fontSize:19,fontWeight:700,color:color||"#1a1d23",lineHeight:1.1}}>{value}{sub&&<span style={{fontSize:11,fontWeight:400,color:"#9ca3af",marginInlineStart:4}}>{sub}</span>}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// CASH FLOW VIEW
// ═══════════════════════════════════════════════════════════════
function CashFlowView({ project, results, t, incentivesResult }) {
  if (!project||!results) return <div style={{color:"#9ca3af"}}>Add assets to see projections.</div>;
  const isMobile = useIsMobile();
  const [showYrs,setShowYrs]=useState(15);
  const {horizon,startYear}=results;
  const years=Array.from({length:Math.min(showYrs,horizon)},(_,i)=>i);
  const phases=Object.entries(results.phaseResults);
  const c=results.consolidated;
  const ar = t.dashboard === "لوحة التحكم";

  // ── Period detection: construction vs operating years ──
  let constrEnd = 0;
  for (let y = horizon - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }
  const isConstrYear = y => c.capex[y] > 0;
  const isIncomeYear = y => c.income[y] > 0;

  // ── NOI = Income - Land Rent (operating cash before CAPEX) ──
  const noiArr = new Array(horizon).fill(0);
  for (let y = 0; y < horizon; y++) noiArr[y] = c.income[y] - c.landRent[y];
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);
  // Per-phase NOI
  const phaseNOI = {};
  phases.forEach(([name, pr]) => {
    const noi = new Array(horizon).fill(0);
    for (let y = 0; y < horizon; y++) noi[y] = pr.income[y] - pr.landRent[y];
    phaseNOI[name] = { values: noi, total: noi.reduce((a,b)=>a+b,0) };
  });

  // ── Yield on Cost = Stabilized NOI / Total CAPEX ──
  const stabilizedNOI = noiArr[Math.min(constrEnd + 3, horizon - 1)] || 0;
  const yieldOnCost = c.totalCapex > 0 ? stabilizedNOI / c.totalCapex : 0;

  const CFRow=({label,values,total,bold,color,negate,sub})=>{
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#d0d4dc";};
    return <tr style={st} onMouseEnter={e=>{if(!bold)e.currentTarget.style.background="#fafbff";}} onMouseLeave={e=>{if(!bold)e.currentTarget.style.background="";}}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:150,paddingInlineStart:sub?24:10,fontSize:sub?10:11,color:sub?"#6b7080":undefined}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v),background:v===0?"":"transparent"}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  // Section header row
  const SectionRow=({label,color,bg})=><tr><td colSpan={years.length+2} style={{padding:"6px 10px",fontSize:10,fontWeight:700,color:color||"#6b7080",background:bg||"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"1px solid #e5e7ec"}}>{label}</td></tr>;

  // Cumulative row (always visible)
  const CumRow=({label,values})=>{
    let cum=0;
    return <tr style={{background:"#fffbeb"}}>
      <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:150}}>{label}</td>
      <td style={tdN}></td>
      {years.map(y=>{cum+=values[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
    </tr>;
  };

  // ── Period marker header (construction / operating / payback) ──
  const PeriodHeaderRow = () => <tr>
    <td style={{position:"sticky",left:0,background:"#fff",zIndex:2,padding:0}}></td>
    <td style={{padding:0}}></td>
    {years.map(y => {
      const constr = isConstrYear(y);
      const income = isIncomeYear(y);
      const isPB = c.paybackYear !== null && y === c.paybackYear;
      const bg = constr && !income ? "#fef3c7" : constr && income ? "#fef9c3" : income ? "#dcfce7" : "#f8f9fb";
      const lbl = constr && !income ? (ar?"بناء":"Build") : constr && income ? (ar?"بناء+دخل":"Build+Op") : income ? (ar?"تشغيل":"Oper.") : "";
      return <td key={y} style={{padding:"2px 4px",textAlign:"center",background:bg,fontSize:8,fontWeight:600,color:constr?"#a16207":"#16a34a",borderBottom:isPB?"3px solid #2563eb":"1px solid #e5e7ec",position:"relative"}}>
        {lbl}{isPB && <span style={{display:"block",fontSize:7,color:"#2563eb",fontWeight:700}}>{ar?"استرداد":"Payback"}</span>}
      </td>;
    })}
  </tr>;

  return (<div>
    {/* Disclaimer */}
    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"6px 12px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:14}}>⚠</span>
      {ar ? "هذه المؤشرات قبل احتساب طريقة التمويل وآلية التخارج - ستتغير بعد تحديد التمويل" : "Pre-financing & pre-exit metrics — will change after financing mode and exit strategy are set"}
    </div>
    {/* NPV/IRR Summary */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(130px, 1fr))",gap:10,marginBottom:16}}>
      {[
        {label:ar?"IRR المشروع (قبل التمويل)":"Unlevered IRR",value:c.irr!==null?fmtPct(c.irr*100):"N/A",color:c.irr>0.12?"#16a34a":"#f59e0b"},
        {label:"NPV @10%",value:fmtM(c.npv10),color:c.npv10>0?"#2563eb":"#ef4444"},
        {label:"NPV @12%",value:fmtM(c.npv12),color:c.npv12>0?"#2563eb":"#ef4444"},
        {label:"NPV @14%",value:fmtM(c.npv14),color:c.npv14>0?"#2563eb":"#ef4444"},
        {label:ar?"إجمالي التكاليف":"Total CAPEX",value:fmtM(c.totalCapex),color:"#ef4444"},
        {label:ar?"إجمالي الإيرادات":"Total Income",value:fmtM(c.totalIncome),color:"#16a34a"},
        {label:ar?"صافي الدخل التشغيلي (NOI)":"Net Operating Income",value:fmtM(totalNOI),color:"#2563eb",tip:ar?"الإيرادات - إيجار الأرض (قبل CAPEX)":"Revenue minus Land Rent (before CAPEX)"},
        {label:ar?"عائد على التكلفة":"Yield on Cost",value:yieldOnCost>0?fmtPct(yieldOnCost*100):"—",color:yieldOnCost>0.08?"#16a34a":"#f59e0b",tip:ar?"NOI المستقر / CAPEX":"Stabilized NOI / Total CAPEX"},
        {label:ar?"فترة الاسترداد":"Payback Period",value:c.paybackYear!=null?(c.paybackYear+(ar?" سنة":" yr")):"—",color:c.paybackYear&&c.paybackYear<=10?"#16a34a":c.paybackYear?"#f59e0b":"#9ca3af"},
        {label:ar?"أقصى سحب سلبي":"Peak Negative CF",value:fmtM(c.peakNegative||0),color:"#ef4444",tip:c.peakNegativeYear!=null?(ar?`السنة ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`:`Year ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`):""},
      ].map((k,i) => <div key={i} style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"8px 12px"}}>
        <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{k.label}</div>
        <div style={{fontSize:16,fontWeight:700,color:k.color}}>{k.value}</div>
        {k.tip && <div style={{fontSize:9,color:"#9ca3af",marginTop:2}}>{k.tip}</div>}
      </div>)}
    </div>

    {/* Period Legend */}
    <div style={{display:"flex",gap:14,marginBottom:8,fontSize:10,color:"#6b7080",flexWrap:"wrap",alignItems:"center"}}>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#fef3c7",border:"1px solid #fde68a"}} />{ar?"بناء":"Construction"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#dcfce7",border:"1px solid #bbf7d0"}} />{ar?"تشغيل":"Operating"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:4,borderRadius:1,background:"#2563eb"}} />{ar?"سنة الاسترداد":"Payback Year"}</span>
    </div>

    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12,flexWrap:"wrap"}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.unleveredCF}</div>
      <div style={{flex:1}} />
      <div style={{display:"flex",background:"#f0f1f5",borderRadius:6,padding:2}}>
        {[10,15,20,30,50].map(n=><button key={n} onClick={()=>setShowYrs(n)} style={{...btnS,padding:"4px 10px",fontSize:10,fontWeight:600,background:showYrs===n?"#fff":"transparent",color:showYrs===n?"#1a1d23":"#9ca3af",boxShadow:showYrs===n?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>{n}yr</button>)}
      </div>
    </div>
    {phases.map(([name,pr])=>(
      <div key={name} style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600,display:"flex",justifyContent:"space-between"}}>
          <span>{name}</span><span style={{color:"#6b7080",fontWeight:400,fontSize:11}}>{ar?"IRR قبل التمويل":"Unlevered IRR"}: <strong style={{color:pr.irr!==null?"#2563eb":"#9ca3af"}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</strong></span>
        </div>
        <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
          <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:150}}>{t.lineItem}</th>
          <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
          {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{startYear+y}</span></th>)}
        </tr></thead><tbody>
          <PeriodHeaderRow />
          <SectionRow label={ar?"الإيرادات والتشغيل":"REVENUE & OPERATIONS"} color="#16a34a" bg="#f0fdf4" />
          <CFRow label={t.income} values={pr.income} total={pr.totalIncome} color="#16a34a" />
          <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pr.landRent} total={pr.totalLandRent} color="#ef4444" negate sub />
          <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={phaseNOI[name]?.values||[]} total={phaseNOI[name]?.total||0} bold />
          <SectionRow label={ar?"التكاليف الرأسمالية":"CAPITAL EXPENDITURE"} color="#ef4444" bg="#fef2f2" />
          <CFRow label={ar?"(-) تكاليف التطوير":"(-) Development CAPEX"} values={pr.capex} total={pr.totalCapex} color="#ef4444" negate />
          <SectionRow label={ar?"صافي التدفق النقدي":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
          <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={pr.netCF} total={pr.totalNetCF} bold />
          <CumRow label={ar?"↳ تراكمي":"↳ Cumulative"} values={pr.netCF} />
        </tbody></table></div>
      </div>
    ))}
    <div style={{background:"#fff",borderRadius:8,border:"2px solid #2563eb",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,background:"#f0f4ff",display:"flex",justifyContent:"space-between"}}>
        <span>{t.consolidated}</span><span style={{fontSize:11,fontWeight:400}}>{ar?"IRR قبل التمويل":"Unlevered IRR"}: <strong style={{color:"#2563eb"}}>{(incentivesResult&&incentivesResult.totalIncentiveValue>0&&incentivesResult.adjustedIRR!==null)?fmtPct(incentivesResult.adjustedIRR*100):c.irr!==null?fmtPct(c.irr*100):"—"}</strong></span>
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:150}}>{t.lineItem}</th>
        <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{startYear+y}</span></th>)}
      </tr></thead><tbody>
        <PeriodHeaderRow />
        <SectionRow label={ar?"الإيرادات والتشغيل":"REVENUE & OPERATIONS"} color="#16a34a" bg="#f0fdf4" />
        <CFRow label={t.income} values={c.income} total={c.totalIncome} color="#16a34a" />
        <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.totalLandRent} color="#ef4444" negate sub />
        <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
        <SectionRow label={ar?"التكاليف الرأسمالية":"CAPITAL EXPENDITURE"} color="#ef4444" bg="#fef2f2" />
        <CFRow label={ar?"(-) تكاليف التطوير":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} color="#ef4444" negate />
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

function generateFullModelXLSX(project, results, financing, waterfall) {
  // Load SheetJS from CDN (no npm dependency needed)
  const script = document.createElement('script');
  script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  script.onload = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { alert('Excel export failed.'); return; }
    _buildXLSX(XLSX, project, results, financing, waterfall);
  };
  script.onerror = () => { alert('Could not load Excel library.'); };
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
    s1.push(['  ZAN DESTINATION DEVELOPMENT']);
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
      s1.push(['  LP Equity', fm(f.lpEquity)]);
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
    s1.push(['  Powered by ZAN Development']);
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
  if (!project || !results) return <div style={{color:"#9ca3af"}}>Add assets first.</div>;

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

  // ── ZAN Brand Styles ──
  const zanSec = {fontSize:14,fontWeight:700,color:"#0f1117",marginTop:22,marginBottom:10,paddingBottom:6,...(ar?{paddingRight:10,borderRight:"3px solid #5fbfbf"}:{paddingLeft:10,borderLeft:"3px solid #5fbfbf"}),borderBottom:"1px solid #e5e7ec"};
  const zanTh = {color:"#fff",padding:"6px 8px",textAlign:ar?"right":"left",fontSize:9,textTransform:"uppercase",letterSpacing:0.5};
  const zanTd = {padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:11};
  const numA = ar ? "left" : "right"; // numbers align opposite to text direction
  const zanKpi = (accent) => ({border:"1px solid #e5e7ec",borderRadius:8,padding:"10px 12px",borderTop:`3px solid ${accent||"#5fbfbf"}`});

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
  [dir=rtl] h2.zan-sec { border-left: none; border-right: 3px solid #5fbfbf; padding-left: 0; padding-right: 10px; }
  .zan-cover { page-break-after: always; min-height: 100vh; background: #0f1117; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 60px 40px; position: relative; overflow: hidden; }
  .zan-cover::before { content: ''; position: absolute; top: -120px; right: -120px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(95,191,191,0.15) 0%, transparent 60%); }
  .zan-cover::after { content: ''; position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(15,118,110,0.12) 0%, transparent 60%); }
  .zan-cover .logo-group { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; margin-bottom: 4px; justify-content: center; }
  .zan-cover .logo-name { font-size: 48px; font-weight: 900; color: #fff; font-family: 'Tajawal',sans-serif; letter-spacing: -0.5px; }
  .zan-cover .logo-div { width: 1px; height: 40px; background: rgba(95,191,191,0.4); }
  .zan-cover .logo-sub { font-size: 14px; color: #5fbfbf; font-weight: 300; line-height: 1.3; text-align: ${ar?'right':'left'}; }
  .zan-cover .sub { font-size: 12px; color: #5fbfbf; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; opacity: 0.7; margin-bottom: 56px; position: relative; z-index: 1; }
  .zan-cover .rtype { font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 14px; position: relative; z-index: 1; letter-spacing: -0.3px; }
  .zan-cover .pname { font-size: 20px; color: #d0d4dc; font-weight: 500; margin-bottom: 6px; position: relative; z-index: 1; }
  .zan-cover .ploc { font-size: 13px; color: #6b7080; position: relative; z-index: 1; margin-bottom: 56px; }
  .zan-cover .conf { display: inline-block; padding: 8px 28px; border: 1px solid rgba(95,191,191,0.25); border-radius: 4px; color: #5fbfbf; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; position: relative; z-index: 1; }
  .zan-hdr { background: linear-gradient(135deg, #0f766e, #5fbfbf); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-radius: 0; }
  .zan-hdr .logo-group { display: flex; align-items: center; gap: 8px; }
  .zan-hdr .logo-name { font-size: 22px; font-weight: 900; color: #fff; font-family: 'Tajawal',sans-serif; }
  .zan-hdr .logo-div { width: 1px; height: 20px; background: rgba(255,255,255,0.4); }
  .zan-hdr .logo-sub { font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 300; line-height: 1.3; }
  .zan-hdr .title { font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 500; letter-spacing: 0.3px; }
  .zan-ftr { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7ec; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #9ca3af; }
  .zan-ftr .logo-group { display: flex; align-items: center; gap: 6px; }
  .zan-ftr .logo-name { font-size: 16px; font-weight: 900; color: #0f1117; font-family: 'Tajawal',sans-serif; }
  .zan-ftr .logo-div { width: 1px; height: 14px; background: rgba(95,191,191,0.4); }
  .zan-ftr .logo-sub { font-size: 8px; color: #5fbfbf; font-weight: 300; line-height: 1.3; }
  .report-body { padding: 0 20px 20px 20px; }
  h2.zan-sec { font-size: 14px; font-weight: 700; color: #0f1117; margin: 22px 0 10px 0; padding: 0 0 6px 10px; border-left: 3px solid #5fbfbf; border-bottom: 1px solid #e5e7ec; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
  th { background: #0f1117; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f1f5; font-size: 11px; }
  tr:nth-child(even) { background: #fafbfc; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 18px 0; }
  .kpi-box { border: 1px solid #e5e7ec; border-radius: 8px; padding: 10px 12px; border-top: 3px solid #5fbfbf; }
  .kpi-box .lbl { font-size: 9px; color: #6b7080; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-box .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .tier-strip { display: flex; gap: 8px; margin: 8px 0 16px 0; }
  .tier-card { flex: 1; border-radius: 8px; padding: 10px; text-align: center; }
  .tier-card .tl { font-size: 9px; font-weight: 600; }
  .tier-card .tv { font-size: 15px; font-weight: 700; margin-top: 3px; }
  @media print { .no-print { display: none !important; } }
</style></head><body>
<div class="zan-cover">
  <div class="logo-group"><span class="logo-name">${ar?'زان':'Zan'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'شركة زان':'Zan'}<br>${ar?'لتطوير الوجهات':'Destination Development'}</span></div>
  <div class="sub">Financial Modeler</div>
  <div class="rtype">${reportTitle}</div>
  <div class="pname">${project.name}</div>
  <div class="ploc">${project.location||""} &middot; ${cur} &middot; ${dateStr}</div>
  <div class="conf">${ar?'سري':'CONFIDENTIAL'}</div>
</div>
<div class="zan-hdr"><div class="logo-group"><span class="logo-name">${ar?'زان':'Zan'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'النمذجة':'Financial'}<br>${ar?'المالية':'Modeler'}</span></div><div class="title">${reportTitle} &mdash; ${project.name}</div></div>
<div class="report-body">${el.innerHTML}</div>
<div class="zan-ftr"><div class="logo-group"><span class="logo-name">${ar?'زان':'Zan'}</span><span class="logo-div"></span><span class="logo-sub">${ar?'النمذجة':'Financial'}<br>${ar?'المالية':'Modeler'}</span></div><div>${dateStr} &middot; ${ar?'سري':'Confidential'}</div></div>
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
  };

  // 10-year CF for bank pack
  const bankYears = Array.from({length: Math.min(10, h)}, (_, i) => i);

  return (<div>
    {/* ── Report selector cards ── */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,marginBottom:18}}>
      {Object.entries(reportLabels).map(([key,r]) => (
        <button key={key} onClick={() => setActiveReport(key)}
          style={{background:activeReport===key?"linear-gradient(135deg,#0f766e,#5fbfbf)":"#fff",color:activeReport===key?"#fff":"#1a1d23",
            border:activeReport===key?"none":"1px solid #e5e7ec",borderRadius:10,padding:"18px",cursor:"pointer",textAlign:"start",transition:"all 0.2s",
            boxShadow:activeReport===key?"0 4px 16px rgba(95,191,191,0.25)":"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:26,marginBottom:8}}>{r.icon}</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{r.label}</div>
          <div style={{fontSize:11,opacity:0.75,fontWeight:400}}>{r.desc}</div>
        </button>
      ))}
    </div>

    {/* Phase filter */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:"#6b7080",marginBottom:6}}>{ar?"اختر المراحل للتقرير":"Select phases for report"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"5px 12px",fontSize:11,background:selectedPhases.length===0?"#0f1117":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#0f1117":"#e5e7ec")}}>
            {ar?"الكل":"All"}
          </button>
          {phaseNames.map(p=>(
            <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"5px 12px",fontSize:11,background:activePh.includes(p)&&selectedPhases.length>0?"#0f766e":"#f0f1f5",color:activePh.includes(p)&&selectedPhases.length>0?"#fff":"#1a1d23",border:"1px solid "+(activePh.includes(p)&&selectedPhases.length>0?"#0f766e":"#e5e7ec")}}>
              {p}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Export buttons */}
    <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
      {activeReport && <button onClick={printReport} style={{background:"linear-gradient(135deg,#0f766e,#5fbfbf)",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontSize:12,fontWeight:600,cursor:"pointer",letterSpacing:0.3}}>{ar?"⬇ تحميل التقرير (HTML/PDF)":"⬇ Download Report (HTML/PDF)"}</button>}
      <button onClick={async()=>{try{await generateFormulaExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings);}catch(e){console.error("Formula Excel error:",e);alert("Export error: "+e.message);}}} style={{...btnS,background:"#0f766e",color:"#fff",padding:"8px 18px",fontSize:12,border:"none",fontWeight:600,borderRadius:8}}>
        {ar?"⬇ النموذج الكامل (Excel + معادلات)":"⬇ Full Model (Excel + Formulas)"}
      </button>
      <button onClick={async()=>{try{await generateProfessionalExcel(project, results, financing, waterfall, incentivesResult, checks);}catch(e){console.error("Data Excel error:",e);alert("Export error: "+e.message);}}} style={{...btnS,background:"#f0fdf4",color:"#16a34a",padding:"8px 14px",fontSize:11,border:"1px solid #bbf7d0",fontWeight:500,borderRadius:8}}>
        {ar?"⬇ تقرير بيانات (Excel)":"⬇ Data Report (Excel)"}
      </button>
    </div>

    {/* ── Report content ── */}
    <div ref={reportRef} dir={ar?"rtl":"ltr"} style={{textAlign:ar?"right":"left",fontFamily:ar?"'Tajawal','DM Sans','Segoe UI',system-ui,sans-serif":"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      {activeReport === "exec" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"زان":"Zan"}</span>
            <span style={{width:1,height:28,background:"#5fbfbf",opacity:0.5}} />
            <span style={{fontSize:11,color:"#5fbfbf",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"#0f1117",fontWeight:800,marginTop:8,marginBottom:4,borderBottom:"none"}}>{project.name}</h1>
          <div style={{fontSize:12,color:"#6b7080",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #5fbfbf"}}>{project.location} | {cur} | {sy} - {sy + h} ({h} {ar?"سنة":"years"}) | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4, 1fr)",gap:8,marginBottom:20}}>
            {[
              {l:ar?"إجمالي التكاليف":"Total CAPEX",v:fmtM(fc.totalCapex),ac:"#ef4444"},
              {l:ar?"إجمالي الإيرادات":"Total Income",v:fmtM(fc.totalIncome),ac:"#16a34a"},
              {l:ar?"IRR (قبل التمويل)":"Unlevered IRR",v:fc.irr?fmtPct(fc.irr*100):"N/A",ac:"#2563eb"},
              {l:"NPV @10%",v:fmtM(fc.npv10),ac:"#06b6d4"},
              ...(f&&f.mode!=="self"&&!isFiltered?[{l:ar?"IRR (بعد التمويل)":"Levered IRR",v:f.leveredIRR?fmtPct(f.leveredIRR*100):"N/A",ac:"#8b5cf6"},{l:ar?"إجمالي الدين":"Total Debt",v:fmtM(f.totalDebt),ac:"#f59e0b"}]:[]),
              ...(fw?[{l:ar?"عائد الممول (LP)":"Investor IRR (LP)",v:fw.lpIRR?fmtPct(fw.lpIRR*100):"N/A",ac:"#8b5cf6"},{l:ar?"مضاعف الممول (LP)":"Investor MOIC (LP)",v:fw.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"N/A",ac:"#0f766e"}]:[]),
            ].map((k,i) => (
              <div key={i} style={{...zanKpi(k.ac)}}>
                <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:17,fontWeight:700,color:k.ac,marginTop:3}}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={zanSec}>{ar?"ملخص المراحل":"Phase Summary"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#0f1117"}}>
              {(ar?["المرحلة","الأصول","التكاليف","الإيرادات","صافي التدفق","IRR"]:["Phase","Assets","CAPEX","Revenue","Net CF","IRR"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(results.phaseResults).filter(([name])=>activePh.includes(name)).map(([name,pr],ri)=>(
                <tr key={name} style={{background:ri%2===0?"#fff":"#fafbfc"}}>
                  <td style={{...zanTd,fontWeight:600}}>{name}</td>
                  <td style={{...zanTd,textAlign:numA}}>{pr.assetCount}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(pr.totalCapex)}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(pr.totalIncome)}</td>
                  <td style={{...zanTd,textAlign:numA,color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
                  <td style={{...zanTd,textAlign:numA,fontWeight:700}}>{pr.irr?fmtPct(pr.irr*100):"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{...zanSec,marginTop:24}}>{ar?"برنامج الأصول":"Asset Program"} ({filteredAssets.length} {ar?"أصل":"assets"}){isFiltered?" - "+activePh.join(", "):""}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead><tr style={{background:"#0f1117"}}>
              {(ar?["#","الأصل","التصنيف","المرحلة","المساحة","التكاليف","الإيرادات","النوع"]:["#","Asset","Category","Phase","GFA","CAPEX","Revenue","Type"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredAssets.map((a,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={zanTd}>{i+1}</td>
                  <td style={zanTd}>{a.name}</td>
                  <td style={zanTd}>{catL(a.category,ar)}</td>
                  <td style={zanTd}>{a.phase}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(a.gfa)}</td>
                  <td style={{...zanTd,textAlign:numA}}>{fmt(a.totalCapex)}</td>
                  <td style={{...zanTd,textAlign:numA,color:"#16a34a"}}>{fmt(a.totalRevenue)}</td>
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
                  <div style={{fontWeight:600,color:"#6b7080",textAlign:numA}}>{sy+y}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    {cap>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,cap/maxVal*100)+"%",height:6,background:"#fca5a5",borderRadius:3}} />
                      <span style={{fontSize:8,color:"#ef4444",whiteSpace:"nowrap"}}>{fmtM(cap)}</span>
                    </div>}
                    {inc>0&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,inc/maxVal*100)+"%",height:6,background:"#86efac",borderRadius:3}} />
                      <span style={{fontSize:8,color:"#16a34a",whiteSpace:"nowrap"}}>{fmtM(inc)}</span>
                    </div>}
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:Math.max(2,Math.abs(net)/maxVal*100)+"%",height:6,background:net>=0?"#0f766e":"#dc2626",borderRadius:3}} />
                      <span style={{fontSize:8,color:net>=0?"#0f766e":"#dc2626",fontWeight:600,whiteSpace:"nowrap"}}>{fmtM(net)}</span>
                    </div>
                  </div>
                </div>;
              })}
              <div style={{display:"flex",gap:16,marginTop:6,fontSize:9,color:"#6b7080"}}>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#fca5a5",borderRadius:2,marginRight:3}} />{ar?"التكاليف":"CAPEX"}</span>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#86efac",borderRadius:2,marginRight:3}} />{ar?"الإيرادات":"Income"}</span>
                <span><span style={{display:"inline-block",width:10,height:6,background:"#0f766e",borderRadius:2,marginRight:3}} />{ar?"صافي التدفق":"Net CF"}</span>
              </div>
            </div>;
          })()}

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={{...zanSec,marginTop:24}}>{ar?"الحوافز الحكومية":"Government Incentives"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8,marginBottom:8}}>
              {incentivesResult.capexGrantTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"منحة CAPEX":"CAPEX Grant"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.capexGrantTotal)}</div></div>}
              {incentivesResult.landRentSavingTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"توفير إيجار الأرض":"Land Rent Savings"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.landRentSavingTotal)}</div></div>}
              {incentivesResult.feeRebateTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"خصومات الرسوم":"Fee Rebates"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.feeRebateTotal)}</div></div>}
            </div>
            <div style={{fontSize:11,padding:"8px 12px",background:"#f0fdf4",borderRadius:6,border:"1px solid #bbf7d0"}}>
              {ar?"إجمالي قيمة الحوافز":"Total Incentive Value"}: <strong style={{color:"#0f766e"}}>{fmtM(incentivesResult.totalIncentiveValue)}</strong>
            </div>
          </>}

          <div style={{...zanSec,marginTop:24}}>{ar?"توزيع الإيرادات حسب التصنيف":"Revenue Breakdown by Category"}</div>
          {(() => {
            const catMap = {};
            filteredAssets.forEach(a => { const cat = a.category||"Other"; catMap[cat] = (catMap[cat]||0) + (a.totalRevenue||0); });
            const cats = Object.entries(catMap).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
            const total = cats.reduce((s,[,v])=>s+v,0) || 1;
            const colors = ["#0f766e","#5fbfbf","#2563eb","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899"];
            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",height:24,borderRadius:6,overflow:"hidden",marginBottom:10}}>
                {cats.map(([cat,val],i) => (
                  <div key={cat} style={{width:(val/total*100)+"%",background:colors[i%colors.length],minWidth:2}} title={`${catL(cat,ar)}: ${fmtM(val)} (${(val/total*100).toFixed(1)}%)`} />
                ))}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 16px"}}>
                {cats.map(([cat,val],i) => (
                  <div key={cat} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:colors[i%colors.length]}} />
                    <span style={{color:"#374151"}}>{catL(cat,ar)}</span>
                    <span style={{fontWeight:700}}>{fmtM(val)}</span>
                    <span style={{color:"#9ca3af"}}>({(val/total*100).toFixed(0)}%)</span>
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
            const colors = ["#0f1117","#0f766e","#5fbfbf","#2563eb","#8b5cf6"];
            return <div style={{marginBottom:16}}>
              <div style={{display:"flex",height:24,borderRadius:6,overflow:"hidden",marginBottom:10}}>
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
                    <span style={{color:"#9ca3af"}}>({(pr.totalCapex/total*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>;
          })()}

          <div style={{...zanSec,marginTop:24}}>{ar?"سلامة النموذج":"Model Integrity"}</div>
          <div style={{fontSize:12,padding:"8px 12px",background:failCount===0?"#f0fdf4":"#fef2f2",borderRadius:6,border:failCount===0?"1px solid #bbf7d0":"1px solid #fecaca"}}>
            {failCount === 0 ? (ar?"✅ جميع الفحوصات ناجحة":"✅ All checks passed") : `⚠️ ${failCount} ${ar?"فحص فشل":"check(s) failed"}`}
          </div>
        </div>
      )}

      {activeReport === "bank" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"زان":"Zan"}</span>
            <span style={{width:1,height:28,background:"#5fbfbf",opacity:0.5}} />
            <span style={{fontSize:11,color:"#5fbfbf",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"#0f1117",fontWeight:800,marginTop:8,marginBottom:4}}>{ar?"حزمة تقديم البنك":"Bank Submission Pack"}</h1>
          <div style={{fontSize:12,color:"#6b7080",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #5fbfbf"}}>{project.name} | {project.location} | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>

          {/* ── Bank Hero Strip: What the credit committee sees first ── */}
          {f && f.mode !== "self" && <div style={{background:"#f8f9fb",borderRadius:10,padding:16,marginBottom:22,border:"1px solid #e5e7ec"}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:10}}>
              {[
                {l:ar?"التسهيل المطلوب":"Facility Requested",v:fmtM(f?.maxDebt||0),sub:cur,ac:"#0f766e",big:true},
                {l:ar?"نسبة التمويل":"LTV",v:(project.maxLtvPct||70)+"%",sub:ar?"من تكلفة التطوير":"of dev cost",ac:"#2563eb"},
                {l:ar?"متوسط DSCR":"Avg DSCR",v:(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";})(),sub:(()=>{if(!f?.dscr)return "";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?(ar?"آمن":"Safe"):avg>=1.0?(ar?"حدي":"Marginal"):(ar?"ضعيف":"Weak");})(),ac:(()=>{if(!f?.dscr)return "#9ca3af";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?"#16a34a":avg>=1.0?"#f59e0b":"#ef4444";})()},
                {l:ar?"أقل DSCR":"Min DSCR",v:(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?Math.min(...vals).toFixed(2)+"x":"—";})(),sub:(()=>{if(!f?.dscr)return "";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);if(!vals.length)return "";const yr=f.dscr.indexOf(Math.min(...vals));return yr>=0?(ar?"سنة ":"Year ")+(sy+yr):"";})(),ac:(()=>{if(!f?.dscr)return "#9ca3af";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const mn=vals.length?Math.min(...vals):0;return mn>=1.2?"#16a34a":mn>=1.0?"#f59e0b":"#ef4444";})()},
              ].map((k,i)=>(
                <div key={i} style={{textAlign:"center",padding:"8px 6px"}}>
                  <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3,marginBottom:4}}>{k.l}</div>
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
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}><td style={{...zanTd,color:"#6b7080",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
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
                [ar?"الهيكل":"Structure",project.islamicMode==="conventional"?(ar?"تقليدي":"Conventional"):project.islamicMode==="murabaha"?(ar?"مرابحة":"Murabaha"):(ar?"إجارة":"Ijara")],
              ].map(([k,v],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}><td style={{...zanTd,color:"#6b7080",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"3. المصادر والاستخدامات":"3. Sources & Uses"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:"#0f766e"}}>{ar?"المصادر":"Sources"}</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={zanTd}>{ar?"الدين":"Senior Debt"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalDebt||0)}</td></tr>
                  <tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"حقوق الملكية":"Equity"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalEquity||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"إجمالي المصادر":"Total Sources"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA}}>{fmt((f?.totalDebt||0)+(f?.totalEquity||0))}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6,color:"#0f766e"}}>{ar?"الاستخدامات":"Uses"}</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={zanTd}>{ar?"تكاليف التطوير":"Development CAPEX"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(fc.totalCapex)}</td></tr>
                  {project.landType==="purchase"&&<tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"شراء الأرض":"Land Purchase"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(project.landPurchasePrice)}</td></tr>}
                  <tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"فوائد أثناء البناء":"Interest During Constr."}</td><td style={{...zanTd,textAlign:numA,fontWeight:600}}>{fmt(f?.totalInterest||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"إجمالي الاستخدامات":"Total Uses"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA}}>{fmt(fc.totalCapex+(f?.totalInterest||0))}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={zanSec}>{ar?"4. التدفقات النقدية 10 سنوات وDSCR":"4. 10-Year Cash Flow & DSCR"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:9}}>
            <thead><tr style={{background:"#0f1117"}}>
              <th style={{...zanTh,fontSize:8}}>{ar?"البند":"Item"}</th>
              {bankYears.map(y=><th key={y} style={{...zanTh,textAlign:numA,fontSize:8}}>{sy+y}</th>)}
            </tr></thead>
            <tbody>
              {[
                {l:ar?"الإيرادات":"Revenue",v:fc.income,cl:"#16a34a"},
                {l:ar?"إيجار الأرض":"Land Rent",v:fc.landRent,cl:"#ef4444"},
                {l:ar?"صافي الدخل التشغيلي":"NOI",v:bankYears.map(y=>(fc.income[y]||0)-(fc.landRent[y]||0)),cl:"#0f1117",b:true},
                {l:ar?"تكاليف التطوير":"CAPEX",v:fc.capex,cl:"#ef4444"},
                ...(f&&f.mode!=="self"?[
                  {l:ar?"خدمة الدين":"Debt Service",v:f.debtService,cl:"#ef4444"},
                  {l:ar?"رصيد الدين":"Debt Balance",v:f.debtBalClose,cl:"#3b82f6"},
                  {l:"DSCR",v:bankYears.map(y=>f.dscr[y]),cl:"#0f1117",b:true,isDscr:true},
                ]:[]),
                {l:ar?"صافي التدفق":"Net CF",v:f&&f.mode!=="self"&&!isFiltered?f.leveredCF:fc.netCF,cl:"#0f1117",b:true},
              ].map((row,ri)=>(
                <tr key={ri} style={row.b?{fontWeight:700,background:"#f8f9fb"}:{}}>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",fontSize:9}}>{row.l}</td>
                  {bankYears.map(y=>{
                    const v = Array.isArray(row.v) ? row.v[y] : (row.v?.[y]||0);
                    if (row.isDscr) return <td key={y} style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:numA,fontSize:9,fontWeight:700,color:v===null?"#9ca3af":v>=1.2?"#16a34a":"#ef4444"}}>{v===null?"—":v.toFixed(2)+"x"}</td>;
                    return <td key={y} style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:numA,fontSize:9,color:row.cl}}>{v===0?"—":fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={zanSec}>{ar?"5. تحليل الضغط":"5. Stress Analysis"}</div>
          {(() => {
            const scenarios = [
              {l:ar?"الحالة الأساسية":"Base Case",capM:1,rentM:1,bg:"#f0fdf4",bd:"#bbf7d0",cl:"#16a34a"},
              {l:ar?"CAPEX +10%":"CAPEX +10%",capM:1.1,rentM:1,bg:"#fef2f2",bd:"#fecaca",cl:"#ef4444"},
              {l:ar?"إيرادات -15%":"Revenue -15%",capM:1,rentM:0.85,bg:"#fef2f2",bd:"#fecaca",cl:"#ef4444"},
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
              <thead><tr style={{background:"#0f1117"}}>
                {(ar?["السيناريو","IRR المشروع","IRR بعد التمويل","أقل DSCR","NPV @10%"]:["Scenario","Project IRR","Levered IRR","Min DSCR","NPV @10%"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
              </tr></thead>
              <tbody>{scenarios.map((sc,i)=>(
                <tr key={i} style={{background:sc.bg}}>
                  <td style={{...zanTd,fontWeight:600,color:sc.cl}}>{sc.l}</td>
                  <td style={{...zanTd,textAlign:numA}}>{stressResults[i].irr?fmtPct(stressResults[i].irr*100):"—"}</td>
                  <td style={{...zanTd,textAlign:numA}}>{stressResults[i].levIrr?fmtPct(stressResults[i].levIrr*100):"—"}</td>
                  <td style={{...zanTd,textAlign:numA,fontWeight:700,color:stressResults[i].dscr===null?"#9ca3af":stressResults[i].dscr>=1.2?"#16a34a":"#ef4444"}}>{stressResults[i].dscr!==null?stressResults[i].dscr.toFixed(2)+"x":"—"}</td>
                  <td style={{...zanTd,textAlign:numA,color:(stressResults[i].npv||0)>=0?"#16a34a":"#ef4444"}}>{stressResults[i].npv?fmtM(stressResults[i].npv):"—"}</td>
                </tr>
              ))}</tbody>
            </table>;
          })()}

          {f && f.mode !== "self" && <>
            <div style={zanSec}>{ar?"6. اتجاه DSCR ورصيد الدين":"6. DSCR Trend & Debt Profile"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              {/* DSCR Trend */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#0f766e",marginBottom:8}}>{ar?"اتجاه DSCR":"DSCR Trend"}</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:2,height:80}}>
                  {bankYears.map(y => {
                    const d = f.dscr?.[y]; const val = d===null||d===undefined||d===Infinity ? 0 : d;
                    const h = Math.min(val/3*100, 100);
                    return <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{fontSize:7,fontWeight:700,color:val>=1.2?"#16a34a":val>0?"#ef4444":"#9ca3af"}}>{val>0?val.toFixed(1)+"x":"—"}</div>
                      <div style={{width:"100%",height:h+"%",minHeight:2,background:val>=1.25?"#86efac":val>=1.0?"#fde68a":"#fca5a5",borderRadius:"2px 2px 0 0",transition:"height 0.3s"}} />
                      <div style={{fontSize:7,color:"#9ca3af"}}>{sy+y}</div>
                    </div>;
                  })}
                </div>
                <div style={{borderTop:"2px solid #ef4444",marginTop:0,position:"relative"}}>
                  <span style={{position:"absolute",top:-8,right:0,fontSize:7,color:"#ef4444",fontWeight:600}}>1.0x {ar?"الحد الأدنى":"min"}</span>
                </div>
              </div>
              {/* Debt Balance Profile */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#0f766e",marginBottom:8}}>{ar?"رصيد الدين":"Debt Balance Profile"}</div>
                {(() => {
                  const maxDebt = Math.max(...bankYears.map(y=>f.debtBalClose?.[y]||0),1);
                  return <div style={{display:"flex",alignItems:"flex-end",gap:2,height:80}}>
                    {bankYears.map(y => {
                      const bal = f.debtBalClose?.[y]||0;
                      const pct = bal/maxDebt*100;
                      return <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <div style={{fontSize:7,fontWeight:600,color:"#3b82f6"}}>{bal>0?fmtM(bal):""}</div>
                        <div style={{width:"100%",height:pct+"%",minHeight:bal>0?2:0,background:"linear-gradient(180deg,#3b82f6,#93c5fd)",borderRadius:"2px 2px 0 0"}} />
                        <div style={{fontSize:7,color:"#9ca3af"}}>{sy+y}</div>
                      </div>;
                    })}
                  </div>;
                })()}
              </div>
            </div>
          </>}

          <div style={zanSec}>{ar?"7. تغطية الدين":"7. Debt Coverage Summary"}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
            <thead><tr style={{background:"#0f1117"}}>
              {(ar?["المؤشر","القيمة","الحالة"]:["Metric","Value","Status"]).map(hh=><th key={hh} style={zanTh}>{hh}</th>)}
            </tr></thead>
            <tbody>
              {[
                [ar?"إجمالي خدمة الدين":"Total Debt Service",f?fmt((f.debtService||[]).reduce((a,b)=>a+b,0))+" "+cur:"—","—",""],
                [ar?"إجمالي الفوائد":"Total Interest",f?fmt(f.totalInterest||0)+" "+cur:"—","—",""],
                [ar?"متوسط DSCR":"Average DSCR",(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"#9ca3af"};const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return avg>=1.25?{t:ar?"آمن":"Safe",c:"#16a34a"}:avg>=1.0?{t:ar?"حدي":"Marginal",c:"#f59e0b"}:{t:ar?"ضعيف":"Weak",c:"#ef4444"};})(),"dscr"],
                [ar?"أقل DSCR":"Minimum DSCR",(()=>{if(!f?.dscr)return "—";const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);return vals.length?Math.min(...vals).toFixed(2)+"x":"—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"#9ca3af"};const vals=f.dscr.filter(d=>d!==null&&d!==Infinity&&d>0);const mn=vals.length?Math.min(...vals):0;return mn>=1.2?{t:ar?"مقبول":"Acceptable",c:"#16a34a"}:mn>=1.0?{t:ar?"حدي":"Marginal",c:"#f59e0b"}:{t:ar?"غير كافٍ":"Insufficient",c:"#ef4444"};})(),"dscr"],
                [ar?"فترة استرداد الدين":"Debt Payback",(()=>{let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=(f&&f.mode!=="self"?f.leveredCF[y]:fc.netCF[y])||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return(y+1)+" "+(ar?"سنة":"years");}return "—";})(),(()=>{let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=(f&&f.mode!=="self"?f.leveredCF[y]:fc.netCF[y])||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return y+1<=(project.loanTenor||7)?{t:ar?"ضمن المدة":"Within tenor",c:"#16a34a"}:{t:ar?"يتجاوز المدة":"Exceeds tenor",c:"#f59e0b"};}return {t:"—",c:"#9ca3af"};})(),"dscr"],
                [ar?"نسبة تغطية الفوائد":"Interest Cover (Yr 1 Op)",(()=>{if(!f?.dscr)return "—";for(let y=0;y<h;y++){if((fc.income[y]||0)>0&&f.interest[y]>0)return((fc.income[y]-Math.abs(fc.landRent[y]||0))/f.interest[y]).toFixed(2)+"x";}return "—";})(),(()=>{if(!f?.dscr)return {t:"—",c:"#9ca3af"};for(let y=0;y<h;y++){if((fc.income[y]||0)>0&&f.interest[y]>0){const icr=(fc.income[y]-Math.abs(fc.landRent[y]||0))/f.interest[y];return icr>=2?{t:ar?"قوي":"Strong",c:"#16a34a"}:icr>=1.5?{t:ar?"مقبول":"Adequate",c:"#f59e0b"}:{t:ar?"ضعيف":"Weak",c:"#ef4444"};}}return {t:"—",c:"#9ca3af"};})(),"dscr"],
              ].map(([label,val,status,type],i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={{...zanTd,fontWeight:600}}>{label}</td>
                  <td style={{...zanTd,fontWeight:700,textAlign:numA}}>{val}</td>
                  {type==="dscr"?<td style={{...zanTd,textAlign:"center"}}><span style={{display:"inline-block",padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:600,background:status.c+"18",color:status.c}}>{status.t}</span></td>:<td style={{...zanTd,color:"#9ca3af",textAlign:"center"}}></td>}
                </tr>
              ))}
            </tbody>
          </table>

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={zanSec}>{ar?"8. الحوافز الحكومية":"8. Government Incentives"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:8}}>
              <thead><tr style={{background:"#0f1117"}}>
                {(ar?["نوع الحافز","القيمة","الوصف"]:["Incentive Type","Value","Description"]).map(h=><th key={h} style={zanTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {incentivesResult.capexGrantTotal>0&&<tr><td style={zanTd}>{ar?"منحة CAPEX":"CAPEX Grant"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(incentivesResult.capexGrantTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"خصم على تكاليف التطوير":"Reduction in development costs"}</td></tr>}
                {incentivesResult.landRentSavingTotal>0&&<tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"خصم إيجار الأرض":"Land Rent Rebate"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(incentivesResult.landRentSavingTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"توفير في إيجار الأرض":"Savings on land lease payments"}</td></tr>}
                {f?.interestSubsidyTotal>0&&<tr><td style={zanTd}>{ar?"دعم الفائدة":"Interest Subsidy"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(f.interestSubsidyTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"دعم على تكلفة التمويل":"Subsidy on financing cost"}</td></tr>}
                {incentivesResult.feeRebateTotal>0&&<tr style={{background:"#fafbfc"}}><td style={zanTd}>{ar?"خصم رسوم":"Fee Rebates"}</td><td style={{...zanTd,textAlign:numA,fontWeight:600,color:"#0f766e"}}>{fmt(incentivesResult.feeRebateTotal)}</td><td style={{...zanTd,color:"#6b7080"}}>{ar?"إعفاءات من الرسوم الحكومية":"Government fee waivers"}</td></tr>}
                <tr style={{fontWeight:700,background:"#f0fdf4"}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}}>{ar?"الإجمالي":"Total"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA,color:"#0f766e"}}>{fmt(incentivesResult.totalIncentiveValue+(f?.interestSubsidyTotal||0))}</td><td style={{...zanTd,borderTop:"2px solid #0f1117"}}></td></tr>
              </tbody>
            </table>
          </>}
        </div>
      )}

      {activeReport === "investor" && (
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:30,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:-0.5}}>{ar?"زان":"Zan"}</span>
            <span style={{width:1,height:28,background:"#5fbfbf",opacity:0.5}} />
            <span style={{fontSize:11,color:"#5fbfbf",fontWeight:300,lineHeight:1.3}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          <h1 style={{fontSize:22,color:"#0f1117",fontWeight:800,marginTop:8,marginBottom:4}}>{ar?"مذكرة المستثمر":"Investor Memo"} - {project.name}</h1>
          <div style={{fontSize:12,color:"#6b7080",marginBottom:20,paddingBottom:12,borderBottom:"2px solid #5fbfbf"}}>{project.location} | {cur} | {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} | {ar?"سري":"CONFIDENTIAL"}</div>

          <div style={zanSec}>{ar?"أبرز المؤشرات":"Investment Highlights"}</div>
          {/* Primary LP metrics - big and prominent */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3, 1fr)",gap:10,marginBottom:12}}>
            {[
              {l:ar?"عائد LP المستهدف":"Target LP IRR",v:fw?.lpIRR?fmtPct(fw.lpIRR*100):"N/A",ac:"#0f766e",big:true},
              {l:ar?"مضاعف LP":"LP MOIC",v:fw?.lpMOIC?fw.lpMOIC.toFixed(2)+"x":"N/A",ac:"#0f766e",big:true},
              {l:ar?"فترة الاسترداد":"LP Payback",v:(()=>{if(!fw?.lpNetCF)return "—";let cum=0,wasNeg=false;for(let y=0;y<h;y++){cum+=fw.lpNetCF[y]||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return(y+1)+" "+(ar?"سنة":"yr");}return "—";})(),ac:"#0f766e",big:true},
            ].map((k,i) => (
              <div key={i} style={{...zanKpi(k.ac),textAlign:"center",padding:"14px 12px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
                <div style={{fontSize:28,fontWeight:800,color:k.ac,marginTop:6}}>{k.v}</div>
              </div>
            ))}
          </div>
          {/* Secondary LP metrics */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4, 1fr)",gap:8,marginBottom:18}}>
            {[
              {l:ar?"العائد المفضل":"Preferred Return",v:(project.prefReturnPct||15)+"%",ac:"#2563eb"},
              {l:ar?"سنة التخارج":"Exit Year",v:fw?.exitYear||"TBD",ac:"#f59e0b"},
              {l:"DPI",v:fw?.lpTotalInvested>0?(fw.lpTotalDist/fw.lpTotalInvested).toFixed(2)+"x":"—",ac:"#8b5cf6"},
              {l:ar?"العائد النقدي":"Cash Yield",v:(()=>{if(!fw?.lpDist||!fw?.lpTotalInvested)return "—";const stabYr=Math.min(10,h-1);const dist=fw.lpDist[stabYr]||0;return dist>0&&fw.lpTotalInvested>0?fmtPct(dist/fw.lpTotalInvested*100):"—";})(),ac:"#06b6d4"},
            ].map((k,i) => (
              <div key={i} style={zanKpi(k.ac)}>
                <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.3}}>{k.l}</div>
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
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}><td style={{...zanTd,color:"#6b7080",width:"40%"}}>{k}</td><td style={{...zanTd,fontWeight:600}}>{v}</td></tr>
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
                <div key={i} style={{flex:1,minWidth:isMobile?140:"auto",background:t.bg,borderRadius:8,padding:"12px",textAlign:"center",border:`1px solid ${t.bd}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#374151",letterSpacing:0.3}}>{t.l}</div>
                  <div style={{fontSize:16,fontWeight:800,marginTop:4,color:"#0f1117"}}>{t.v}</div>
                </div>
              ))}
            </div>

            <div style={zanSec}>{ar?"تحليل العوائد":"Return Analysis"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0f1117"}}>
                <th style={zanTh}>{ar?"المؤشر":"Metric"}</th>
                <th style={{...zanTh,textAlign:"center",background:"#0f766e"}}>{ar?"المستثمر (LP)":"LP (Investor)"}</th>
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
                  <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={{...zanTd,fontWeight:700}}>{metric}</td>
                    <td style={{...zanTd,textAlign:"center",fontWeight:700,color:"#0f766e",background:i%2===0?"#f0fdf4":"#ecfdf5"}}>{vals[0]}</td>
                    <td style={{...zanTd,textAlign:"center",color:"#6b7080"}}>{vals[1]}</td>
                    <td style={{...zanTd,textAlign:"center",color:"#9ca3af"}}>{vals[2]}</td>
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
                    <div style={{fontWeight:600,color:"#6b7080",textAlign:numA}}>{sy+d.y}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:Math.max(2,d.lp/maxCum*100)+"%",height:7,background:"linear-gradient(90deg,#8b5cf6,#a78bfa)",borderRadius:3}} />
                        <span style={{fontSize:8,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmtM(d.lp)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:Math.max(2,d.gp/maxCum*100)+"%",height:7,background:"linear-gradient(90deg,#0f766e,#5fbfbf)",borderRadius:3}} />
                        <span style={{fontSize:8,color:"#0f766e",whiteSpace:"nowrap"}}>{fmtM(d.gp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",gap:16,marginTop:6,fontSize:9,color:"#6b7080"}}>
                  <span><span style={{display:"inline-block",width:10,height:6,background:"#8b5cf6",borderRadius:2,marginRight:3}} />LP {ar?"التراكمي":"Cumulative"}</span>
                  <span><span style={{display:"inline-block",width:10,height:6,background:"#0f766e",borderRadius:2,marginRight:3}} />GP {ar?"التراكمي":"Cumulative"}</span>
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
                {l:ar?"سحب الإكوتي":"Equity Calls",from:0,to:constrEnd,color:"#ef4444",icon:"📥"},
                {l:ar?"البناء":"Construction",from:0,to:constrEnd,color:"#f59e0b",icon:"🏗"},
                {l:ar?"الإيرادات":"Income Period",from:firstIncome,to:Math.min(exitYr,h-1),color:"#16a34a",icon:"💰"},
                ...(fw.exitYear?[{l:ar?"التخارج":"Exit",from:exitYr-1,to:exitYr-1,color:"#8b5cf6",icon:"🏦"}]:[]),
              ];
              const totalYrs = Math.min(h, 25);
              return <div style={{marginBottom:16}}>
                {phases.map((p,i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"#374151"}}>{p.icon} {p.l}</div>
                    <div style={{position:"relative",height:16,background:"#f0f1f5",borderRadius:8}}>
                      <div style={{position:"absolute",left:(p.from/totalYrs*100)+"%",width:Math.max(4,(p.to-p.from+1)/totalYrs*100)+"%",height:"100%",background:p.color,borderRadius:8,opacity:0.8}} />
                      <div style={{position:"absolute",left:(p.from/totalYrs*100)+"%",top:-1,fontSize:7,color:p.color,fontWeight:600}}>{sy+p.from}</div>
                      <div style={{position:"absolute",left:Math.min(95,((p.to+1)/totalYrs*100))+"%",top:-1,fontSize:7,color:p.color,fontWeight:600}}>{sy+p.to}</div>
                    </div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#9ca3af",marginTop:4,paddingLeft:128}}>
                  <span>{sy}</span><span>{sy+Math.floor(totalYrs/4)}</span><span>{sy+Math.floor(totalYrs/2)}</span><span>{sy+Math.floor(totalYrs*3/4)}</span><span>{sy+totalYrs-1}</span>
                </div>
              </div>;
            })()}

            <div style={zanSec}>{ar?"ملخص الرسوم":"Fee Summary"}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:12}}>
              <thead><tr style={{background:"#0f1117"}}>
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
                  <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                    <td style={{...zanTd,fontWeight:600}}>{ff}</td>
                    <td style={{...zanTd,color:"#6b7080"}}>{r}</td>
                    <td style={{...zanTd,textAlign:numA,fontWeight:600}}>{t}</td>
                    <td style={{...zanTd,color:"#6b7080"}}>{ti}</td>
                  </tr>
                ))}
                <tr style={{fontWeight:700,background:"#f8f9fb"}}><td style={{...zanTd,borderTop:"2px solid #0f1117"}} colSpan={2}>{ar?"الإجمالي":"Total Fees"}</td><td style={{...zanTd,borderTop:"2px solid #0f1117",textAlign:numA,color:"#0f766e"}}>{fmt(fw.totalFees||fw.fees||0)}</td><td style={{...zanTd,borderTop:"2px solid #0f1117"}}></td></tr>
              </tbody>
            </table>
          </>}

          {incentivesResult && incentivesResult.totalIncentiveValue > 0 && <>
            <div style={zanSec}>{ar?"الحوافز الحكومية":"Government Incentives"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:8,marginBottom:8}}>
              {incentivesResult.capexGrantTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"منحة CAPEX":"CAPEX Grant"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.capexGrantTotal)}</div></div>}
              {incentivesResult.landRentSavingTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"خصم إيجار الأرض":"Land Rent Savings"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.landRentSavingTotal)}</div></div>}
              {f?.interestSubsidyTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"دعم الفائدة":"Interest Subsidy"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(f.interestSubsidyTotal)}</div></div>}
              {incentivesResult.feeRebateTotal>0&&<div style={zanKpi("#0f766e")}><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"خصم رسوم":"Fee Rebates"}</div><div style={{fontSize:16,fontWeight:700,color:"#0f766e",marginTop:3}}>{fmtM(incentivesResult.feeRebateTotal)}</div></div>}
            </div>
            <div style={{fontSize:11,padding:"8px 12px",background:"#f0fdf4",borderRadius:6,border:"1px solid #bbf7d0"}}>
              {ar?"إجمالي قيمة الحوافز":"Total Incentive Value"}: <strong style={{color:"#0f766e"}}>{fmtM(incentivesResult.totalIncentiveValue+(f?.interestSubsidyTotal||0))}</strong>
              {" "}<span style={{color:"#6b7080",fontSize:10}}>({ar?"تعزز عائد المستثمر":"enhances investor returns"})</span>
            </div>
          </>}
        </div>
      )}
    </div>

    {!activeReport && (
      <div style={{textAlign:"center",padding:"56px 24px",background:"#0f1117",borderRadius:12,border:"1px solid #1e2230"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:40,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>{ar?"زان":"Zan"}</span>
          <span style={{width:1,height:36,background:"#5fbfbf",opacity:0.4}} />
          <span style={{fontSize:13,color:"#5fbfbf",fontWeight:300,lineHeight:1.3,textAlign:"start"}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
        </div>
        <div style={{fontSize:13,color:"#4b5060"}}>
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
  if (!project || !results) return <div style={{color:"#9ca3af"}}>Add assets first.</div>;

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
    { name: "Base Case", overrides: { activeScenario: "Base Case" } },
    { name: "CAPEX +10%", overrides: { activeScenario: "CAPEX +10%" } },
    { name: "CAPEX -10%", overrides: { activeScenario: "CAPEX -10%" } },
    { name: "Rent +10%", overrides: { activeScenario: "Rent +10%" } },
    { name: "Rent -10%", overrides: { activeScenario: "Rent -10%" } },
    { name: "Delay +6 months", overrides: { activeScenario: "Delay +6 months" } },
    { name: "Esc +0.5%", overrides: { activeScenario: "Escalation +0.5%" } },
    { name: "Esc -0.5%", overrides: { activeScenario: "Escalation -0.5%" } },
  ];

  const scenarioResults = useMemo(() => {
    return scenarioDefs.map(sd => {
      const s = runScenario(project, sd.overrides);
      return { name: sd.name, ...s };
    });
  }, [project]);

  // ── Section 2: Sensitivity Table ──
  const sensParams = [
    { key: "rentEscalation", label: lang==="ar"?"زيادة الإيجار %":"Rent Escalation %", base: project.rentEscalation, steps: [-0.5, -0.25, 0, 0.25, 0.5] },
    { key: "softCostPct", label: lang==="ar"?"تكاليف غير مباشرة %":"Soft Cost %", base: project.softCostPct, steps: [-3, -1.5, 0, 1.5, 3] },
    { key: "contingencyPct", label: lang==="ar"?"احتياطي %":"Contingency %", base: project.contingencyPct, steps: [-2, -1, 0, 1, 2] },
    { key: "financeRate", label: lang==="ar"?"معدل الربح %":"Finance Rate %", base: project.financeRate, steps: [-1.5, -0.75, 0, 0.75, 1.5] },
    { key: "maxLtvPct", label: "LTV %", base: project.maxLtvPct, steps: [-15, -7.5, 0, 7.5, 15] },
    { key: "landRentAnnual", label: lang==="ar"?"إيجار الأرض":"Land Rent", base: project.landRentAnnual, steps: [-2000000, -1000000, 0, 1000000, 2000000] },
  ];

  const rowParam = sensParams.find(p => p.key === sensRow) || sensParams[0];
  const colParam = sensParams.find(p => p.key === sensCol) || sensParams[1];

  const sensTable = useMemo(() => {
    const table = [];
    for (const rStep of rowParam.steps) {
      const row = [];
      for (const cStep of colParam.steps) {
        const overrides = {
          activeScenario: "Base Case",
          [rowParam.key]: rowParam.base + rStep,
          [colParam.key]: colParam.base + cStep,
        };
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
          rVal: rowParam.base + rStep,
          cVal: colParam.base + cStep,
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
    // Break-even occupancy: find occ where NPV=0
    const filteredAssetPhases = isFiltered ? activePh : null;
    for (let occ = 100; occ >= 0; occ -= 5) {
      const assets = project.assets.map(a => {
        if (filteredAssetPhases && !filteredAssetPhases.includes(a.phase)) return a;
        return { ...a, stabilizedOcc: occ };
      });
      const p2 = { ...project, assets };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.occupancy = occ + 5;
        break;
      }
    }
    // Break-even rent reduction
    for (let mult = 100; mult >= 0; mult -= 5) {
      const p2 = { ...project, activeScenario: "Custom", customRentMult: mult, customCapexMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.rentDrop = 100 - mult - 5;
        break;
      }
    }
    // Break-even CAPEX increase
    for (let mult = 100; mult <= 200; mult += 5) {
      const p2 = { ...project, activeScenario: "Custom", customCapexMult: mult, customRentMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.capexIncrease = mult - 100 - 5;
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
    <div style={{display:"flex",gap:8,marginBottom:18}}>
      {sections.map(s => (
        <button key={s.key} onClick={() => setActiveSection(s.key)}
          style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:500,
            background:activeSection===s.key?"#1e3a5f":"#fff",
            color:activeSection===s.key?"#fff":"#1a1d23",
            border:"1px solid "+(activeSection===s.key?"#1e3a5f":"#e5e7ec")}}>
          {s.label}
        </button>
      ))}
    </div>

    {/* Phase filter */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:"#6b7080",marginBottom:6}}>{lang==="ar"?"اختر المراحل للتحليل":"Select phases for analysis"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"5px 12px",fontSize:11,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec")}}>
            {lang==="ar"?"الكل":"All"}
          </button>
          {phaseNames.map(p=>(
            <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"5px 12px",fontSize:11,background:activePh.includes(p)&&selectedPhases.length>0?"#2563eb":"#f0f1f5",color:activePh.includes(p)&&selectedPhases.length>0?"#fff":"#1a1d23",border:"1px solid "+(activePh.includes(p)&&selectedPhases.length>0?"#2563eb":"#e5e7ec")}}>
              {p}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* ── Scenario Comparison ── */}
    {activeSection === "compare" && (
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600}}>
          {lang==="ar"?"مقارنة 8 سيناريوهات":"8 Scenario Comparison"}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead><tr>
              <th style={{...thSt,minWidth:130,position:"sticky",left:0,background:"#f8f9fb",zIndex:2}}>{lang==="ar"?"المؤشر":"Metric"}</th>
              {scenarioResults.map((s,i) => <th key={i} style={{...thSt,textAlign:"right",minWidth:100}}>{s.name}</th>)}
            </tr></thead>
            <tbody>
              {[
                { label: lang==="ar"?"إجمالي التكاليف":"Total CAPEX", fn: s => getScenarioData(s).totalCapex, fmt: v => fmt(v), color: "#ef4444", tip:"إجمالي البناء + غير مباشرة + طوارئ\nAll construction + soft costs + contingency" },
                { label: lang==="ar"?"إجمالي الإيرادات":"Total Income", fn: s => getScenarioData(s).totalIncome, fmt: v => fmt(v), color: "#16a34a", tip:"مجموع الإيرادات خلال كامل فترة النموذج\nTotal revenue over entire projection period" },
                { label: ar?"IRR قبل التمويل":"Unlevered IRR", fn: s => getScenarioData(s).irr, fmt: v => v !== null ? fmtPct(v*100) : "N/A", color: "#2563eb", tip:"معدل العائد بدون تمويل. فوق 12% قوي\nReturn ignoring debt. Above 12% is strong" },
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
                  <tr key={mi} style={mi%2===0?{}:{background:"#fafbfc"}}>
                    <td style={{...tdSt,position:"sticky",left:0,background:mi%2===0?"#fff":"#fafbfc",zIndex:1,fontWeight:600,fontSize:11}}>{metric.tip?<Tip text={metric.tip}>{metric.label}</Tip>:metric.label}</td>
                    {scenarioResults.map((s, si) => {
                      const val = metric.fn(s);
                      const isBase = si === 0;
                      const isBetter = typeof val === "number" && typeof baseVal === "number" && val > baseVal;
                      const isWorse = typeof val === "number" && typeof baseVal === "number" && val < baseVal;
                      return (
                        <td key={si} style={{...tdN,fontSize:11,fontWeight:isBase?700:400,
                          color: isBase ? (metric.color || "#1a1d23") : isBetter ? "#16a34a" : isWorse ? "#ef4444" : "#6b7080",
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
        <div style={{padding:"10px 16px",fontSize:10,color:"#9ca3af",borderTop:"1px solid #f0f1f5"}}>
          {lang==="ar"?"الأزرق = الحالة الأساسية | الأخضر = أفضل | الأحمر = أسوأ":"Blue = Base Case | Green = Better than base | Red = Worse than base"}
        </div>
      </div>
    )}

    {/* ── Sensitivity Table ── */}
    {activeSection === "sensitivity" && (
      <div>
        <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:11,color:"#6b7080",marginBottom:3}}>{lang==="ar"?"المحور العمودي (الصفوف)":"Row Variable"}</div>
            <select value={sensRow} onChange={e => setSensRow(e.target.value)} style={{padding:"6px 10px",borderRadius:5,border:"1px solid #e5e7ec",fontSize:12}}>
              {sensParams.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:"#6b7080",marginBottom:3}}>{lang==="ar"?"المحور الأفقي (الأعمدة)":"Column Variable"}</div>
            <select value={sensCol} onChange={e => setSensCol(e.target.value)} style={{padding:"6px 10px",borderRadius:5,border:"1px solid #e5e7ec",fontSize:12}}>
              {sensParams.filter(p => p.key !== sensRow).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* IRR Sensitivity */}
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600}}>
            {lang==="ar"?"حساسية العائد (Unlevered IRR)":"Unlevered IRR Sensitivity"}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{...tblStyle,fontSize:11}}>
              <thead><tr>
                <th style={{...thSt,background:"#1e3a5f",color:"#fff",minWidth:100}}>{rowParam.label} \\ {colParam.label}</th>
                {colParam.steps.map((s, i) => <th key={i} style={{...thSt,textAlign:"center",background:s===0?"#2563eb":"#1e3a5f",color:"#fff",minWidth:80}}>{(colParam.base + s).toFixed(colParam.base<10?2:0)}</th>)}
              </tr></thead>
              <tbody>
                {sensTable.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{...tdSt,fontWeight:600,background:rowParam.steps[ri]===0?"#dbeafe":"#f8f9fb",fontSize:11}}>
                      {(rowParam.base + rowParam.steps[ri]).toFixed(rowParam.base<10?2:0)}
                    </td>
                    {row.map((cell, ci) => {
                      const isBase = rowParam.steps[ri] === 0 && colParam.steps[ci] === 0;
                      const irr = cell.irr;
                      const bg = isBase ? "#dbeafe" : irr === null ? "#f8f9fb" : irr >= 0.15 ? "#dcfce7" : irr >= 0.10 ? "#fefce8" : irr >= 0 ? "#ffedd5" : "#fef2f2";
                      const fg = irr === null ? "#9ca3af" : irr >= 0.15 ? "#166534" : irr >= 0.10 ? "#854d0e" : irr >= 0 ? "#9a3412" : "#991b1b";
                      return <td key={ci} style={{...tdN,background:bg,color:fg,fontWeight:isBase?700:500,fontSize:11}}>
                        {irr !== null ? fmtPct(irr * 100) : "N/A"}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:"8px 16px",fontSize:10,color:"#9ca3af"}}>
            {lang==="ar"?"أخضر ≥15% | أصفر ≥10% | برتقالي ≥0% | أحمر < 0% | أزرق = الحالة الأساسية":"Green ≥15% | Yellow ≥10% | Orange ≥0% | Red <0% | Blue = Base Case"}
          </div>
        </div>

        {/* NPV Sensitivity */}
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600}}>
            {lang==="ar"?"حساسية القيمة الحالية (NPV @10%)":"NPV @10% Sensitivity"}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{...tblStyle,fontSize:11}}>
              <thead><tr>
                <th style={{...thSt,background:"#1e3a5f",color:"#fff",minWidth:100}}>{rowParam.label} \\ {colParam.label}</th>
                {colParam.steps.map((s, i) => <th key={i} style={{...thSt,textAlign:"center",background:s===0?"#2563eb":"#1e3a5f",color:"#fff",minWidth:80}}>{(colParam.base + s).toFixed(colParam.base<10?2:0)}</th>)}
              </tr></thead>
              <tbody>
                {sensTable.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{...tdSt,fontWeight:600,background:rowParam.steps[ri]===0?"#dbeafe":"#f8f9fb",fontSize:11}}>
                      {(rowParam.base + rowParam.steps[ri]).toFixed(rowParam.base<10?2:0)}
                    </td>
                    {row.map((cell, ci) => {
                      const isBase = rowParam.steps[ri] === 0 && colParam.steps[ci] === 0;
                      const npv = cell.npv;
                      const bg = isBase ? "#dbeafe" : npv > 0 ? "#dcfce7" : "#fef2f2";
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
          <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:20}}>
            <div style={{fontSize:11,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقل نسبة إشغال تخلي NPV موجب. تحتها المشروع يخسر قيمة&#10;Minimum occupancy where NPV stays positive. Below this, project loses value">{lang==="ar"?"نقطة تعادل الإشغال":"Occupancy Break-Even"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.occupancy?"#f59e0b":"#16a34a"}}>
              {breakeven.occupancy ? breakeven.occupancy + "%" : "> 0%"}
            </div>
            <div style={{fontSize:11,color:"#6b7080",marginTop:6}}>
              {lang==="ar"?"الحد الأدنى للإشغال لتحقيق NPV@10% موجب":"Min occupancy for positive NPV@10%"}
            </div>
            <div style={{marginTop:12,height:8,background:"#f0f1f5",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:(breakeven.occupancy||5)+"%",background:breakeven.occupancy>70?"#ef4444":breakeven.occupancy>50?"#f59e0b":"#16a34a",borderRadius:4,transition:"width 0.3s"}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#9ca3af",marginTop:3}}>
              <span>0%</span><span>{lang==="ar"?"الحالي: ":"Current: "}~{Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1))}%</span><span>100%</span>
            </div>
          </div>

          {/* Rent drop tolerance */}
          <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:20}}>
            <div style={{fontSize:11,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقصى انخفاض بالإيجار قبل ما يصير NPV سالب&#10;Maximum rent decrease before NPV turns negative">{lang==="ar"?"تحمل انخفاض الإيجار":"Rent Drop Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.rentDrop?"#f59e0b":"#16a34a"}}>
              {breakeven.rentDrop ? "-" + breakeven.rentDrop + "%" : "> -100%"}
            </div>
            <div style={{fontSize:11,color:"#6b7080",marginTop:6}}>
              {lang==="ar"?"أقصى انخفاض في الإيجارات مع بقاء NPV@10% موجب":"Max rent reduction keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:8,background:"#f0f1f5",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,breakeven.rentDrop||100)+"%",background:breakeven.rentDrop<15?"#ef4444":breakeven.rentDrop<30?"#f59e0b":"#16a34a",borderRadius:4}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#9ca3af",marginTop:3}}>
              <span>{lang==="ar"?"مخاطرة عالية":"High Risk"}</span><span>{lang==="ar"?"هامش أمان":"Safety Margin"}</span>
            </div>
          </div>

          {/* CAPEX increase tolerance */}
          <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:20}}>
            <div style={{fontSize:11,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              <Tip text="أقصى زيادة بالتكاليف قبل ما يصير NPV سالب&#10;Maximum cost overrun before NPV turns negative">{lang==="ar"?"تحمل زيادة التكاليف":"CAPEX Increase Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.capexIncrease?"#f59e0b":"#16a34a"}}>
              {breakeven.capexIncrease ? "+" + breakeven.capexIncrease + "%" : "> +100%"}
            </div>
            <div style={{fontSize:11,color:"#6b7080",marginTop:6}}>
              {lang==="ar"?"أقصى زيادة في التكاليف مع بقاء NPV@10% موجب":"Max CAPEX increase keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:8,background:"#f0f1f5",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,breakeven.capexIncrease||100)+"%",background:breakeven.capexIncrease<15?"#ef4444":breakeven.capexIncrease<30?"#f59e0b":"#16a34a",borderRadius:4}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#9ca3af",marginTop:3}}>
              <span>{lang==="ar"?"مخاطرة عالية":"High Risk"}</span><span>{lang==="ar"?"هامش أمان":"Safety Margin"}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:18,marginTop:16}}>
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
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{...tdSt,fontWeight:600}}>{r.label}</td>
                  <td style={{...tdSt,textAlign:"center"}}>{r.be}</td>
                  <td style={{...tdSt,textAlign:"center"}}>{r.current}</td>
                  <td style={{...tdSt,textAlign:"center",fontWeight:600}}>{r.margin}</td>
                  <td style={{...tdSt,textAlign:"center"}}>
                    <span style={{padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:600,
                      background:r.risk==="low"?"#dcfce7":r.risk==="med"?"#fefce8":"#fef2f2",
                      color:r.risk==="low"?"#16a34a":r.risk==="med"?"#a16207":"#ef4444"}}>
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
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// INCENTIVES VIEW
// ═══════════════════════════════════════════════════════════════
function IncentivesView({ project, results, incentivesResult, financing, lang, up }) {
  const isMobile = useIsMobile();
  if (!project || !results) return <div style={{color:"#9ca3af"}}>Add assets first.</div>;
  const ir = incentivesResult;
  const inc = project.incentives || {};
  const cur = project.currency || "SAR";
  const c = results.consolidated;

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
  const irrWithout = c.irr;
  const irrWith = financing?.leveredIRR;
  const npvWithout = c.npv10;

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
    {/* Summary KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
      <KPI label={lang === "ar" ? "إجمالي الحوافز" : "Total Incentives"} value={fmtM(ir?.totalIncentiveValue || 0)} sub={cur} color="#16a34a" tip="مجموع كل الحوافز الحكومية (منح + دعم + إعفاءات)\nSum of all government incentives" />
      <KPI label={lang === "ar" ? "منحة CAPEX" : "CAPEX Grant"} value={fmtM(ir?.capexGrantTotal || 0)} sub={inc.capexGrant?.enabled ? "ON" : "OFF"} color={inc.capexGrant?.enabled ? "#2563eb" : "#9ca3af"} tip="الحكومة تغطي نسبة من تكاليف البناء. تقلل رأس المال المطلوب\nGov covers % of construction cost. Reduces equity needed" />
      <KPI label={lang === "ar" ? "وفر إيجار الأرض" : "Land Rent Savings"} value={fmtM(ir?.landRentSavingTotal || 0)} sub={inc.landRentRebate?.enabled ? "ON" : "OFF"} color={inc.landRentRebate?.enabled ? "#f59e0b" : "#9ca3af"} tip="الحكومة تعفي أو تخفض إيجار الأرض لسنوات محددة\nGov waives/reduces land rent for specified years" />
      <KPI label={lang === "ar" ? "دعم التمويل" : "Finance Support"} value={fmtM(financing?.interestSubsidyTotal || 0)} sub={inc.financeSupport?.enabled ? "ON" : "OFF"} color={inc.financeSupport?.enabled ? "#8b5cf6" : "#9ca3af"} tip="الحكومة تدفع جزء من فوائد البنك أو تقدم قرض ميسر\nGov pays portion of bank interest or provides soft loan" />
      <KPI label={lang === "ar" ? "استرداد رسوم" : "Fee Rebates"} value={fmtM(ir?.feeRebateTotal || 0)} sub={inc.feeRebates?.enabled ? "ON" : "OFF"} color={inc.feeRebates?.enabled ? "#06b6d4" : "#9ca3af"} tip="إعفاء أو تخفيض رسوم حكومية (تراخيص، ربط خدمات)\nGov fee waivers/reductions (permits, utility connections)" />
    </div>

    {/* Incentive cards */}
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 1. CAPEX Grant ── */}
      <ToggleCard title="CAPEX Grant (Capital Subsidy)" tip="منحة حكومية تغطي جزءاً من CAPEX الإنشائي. تخفض التكلفة الفعلية وترفع IRR
Government grant covering part of construction CAPEX. Lowers effective cost and improves IRR" titleAr="دعم رأسمالي (منحة CAPEX)" enabled={inc.capexGrant?.enabled} onToggle={() => upInc("capexGrant", { enabled: !inc.capexGrant?.enabled })} color="#2563eb" value={ir?.capexGrantTotal}>
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
          {lang === "ar" ? "القيمة المحسوبة" : "Calculated"}: <strong>{fmt(ir?.capexGrantTotal || 0)} {cur}</strong> = min({inc.capexGrant?.grantPct}% × {fmtM(c.totalCapex)}, {fmt(inc.capexGrant?.maxCap)})
        </div>
      </ToggleCard>

      {/* ── 2. Finance Support ── */}
      <ToggleCard title="Finance Support (Interest Subsidy / Soft Loan)" tip="الجهة الحكومية تتحمل جزءاً من تكلفة التمويل أو تقدم قرضاً بدون ربح. يخفض معدل التمويل الفعلي ويحسن DSCR
Government pays part of financing cost or provides a zero-profit loan. Lowers effective rate and improves DSCR" titleAr="دعم التمويل (تحمل فوائد / قرض حسن)" enabled={inc.financeSupport?.enabled} onToggle={() => upInc("financeSupport", { enabled: !inc.financeSupport?.enabled })} color="#8b5cf6" value={financing?.interestSubsidyTotal}>
        <F label={lang === "ar" ? "نوع الدعم" : "Support Type"}>
          <select value={inc.financeSupport?.subType || "interestSubsidy"} onChange={e => upInc("financeSupport", { subType: e.target.value })} style={{ ...sideInputStyle, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }}>
            <option value="interestSubsidy">{lang === "ar" ? "تحمل فوائد" : "Interest Subsidy"}</option>
            <option value="softLoan">{lang === "ar" ? "قرض حسن" : "Soft Loan"}</option>
          </select>
        </F>
        {inc.financeSupport?.subType === "interestSubsidy" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <F label={lang === "ar" ? "المبلغ (ريال)" : "Amount (SAR)"}><NI value={inc.financeSupport?.softLoanAmount || 0} onChange={v => upInc("financeSupport", { softLoanAmount: v })} /></F>
            <F label={lang === "ar" ? "المدة (سنوات)" : "Tenor (yrs)"}><NI value={inc.financeSupport?.softLoanTenor || 10} onChange={v => upInc("financeSupport", { softLoanTenor: v })} /></F>
            <F label={lang === "ar" ? "سماح (سنوات)" : "Grace (yrs)"}><NI value={inc.financeSupport?.softLoanGrace || 3} onChange={v => upInc("financeSupport", { softLoanGrace: v })} /></F>
          </div>
        )}
      </ToggleCard>

      {/* ── 3. Land Rent Rebate ── */}
      <ToggleCard title="Land Rent Rebate (Exemption/Discount)" tip="تخفيض أو إعفاء إيجار الأرض خلال البناء أو السنوات الأولى. يحسن التدفقات النقدية المبكرة
Reducing or waiving land rent during construction or early years. Improves early cash flows" titleAr="إعفاء/خصم إيجار الأرض" enabled={inc.landRentRebate?.enabled} onToggle={() => upInc("landRentRebate", { enabled: !inc.landRentRebate?.enabled })} color="#f59e0b" value={ir?.landRentSavingTotal}>
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
      <ToggleCard title="Fee/Tax Rebates & Deferrals" tip="استرداد أو تأجيل رسوم بلدية وتصاريح ومدفوعات نظامية. حتى التأجيل له منفعة زمنية تُحسب بمعدل خصم 10%
Rebates or deferrals of municipal charges, permits, and regulatory fees. Even deferrals have time-value benefit at 10% discount" titleAr="استرداد/تأجيل رسوم وضرائب" enabled={inc.feeRebates?.enabled} onToggle={() => upInc("feeRebates", { enabled: !inc.feeRebates?.enabled })} color="#06b6d4" value={ir?.feeRebateTotal}>
        {(inc.feeRebates?.items || []).map((item, i) => (
          <div key={i} style={{ background: "#f8f9fb", borderRadius: 6, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={item.name || ""} onChange={e => updateFeeItem(i, { name: e.target.value })} placeholder={lang === "ar" ? "اسم الرسم" : "Fee name"} style={{ ...sideInputStyle, flex: 1, background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }} />
              <button onClick={() => removeFeeItem(i)} style={{ ...btnSm, background: "#fef2f2", color: "#ef4444" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
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
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// MARKET INDICATORS VIEW
// ═══════════════════════════════════════════════════════════════
// Stable input component for Market view (defined outside to prevent focus loss)
const mktInputStyle = { padding: "6px 10px", border: "1px solid #e5e7ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fafbfc" };
function NI({ value, onChange, style: sx }) {
  return <input type="number" value={value||""} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...mktInputStyle, ...sx }} />;
}

function MarketView({ project, results, lang, up }) {
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
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1d23", marginBottom: 8 }}>{ar ? "مؤشرات السوق" : "Market Indicators"}</div>
        <div style={{ fontSize: 13, color: "#6b7080", marginBottom: 24, maxWidth: 450, margin: "0 auto 24px" }}>
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
    if (pct <= th.low) return { level: "low", color: "#16a34a", bg: "#f0fdf4", label: ar ? "منخفض" : "Low" };
    if (pct <= th.med) return { level: "med", color: "#eab308", bg: "#fefce8", label: ar ? "متوسط" : "Medium" };
    return { level: "high", color: "#ef4444", bg: "#fef2f2", label: ar ? "مرتفع" : "High" };
  };

  // Build analysis table
  const analysis = SECTORS.map(sector => {
    const gap = gaps[sector]?.gap || 0;
    const unit = gaps[sector]?.unit || "sqm";
    const totalSupply = getSupply(sector, null);
    const pctGap = gap > 0 ? totalSupply / gap : 0;
    const risk = gap > 0 ? getRisk(sector, pctGap) : { level: "none", color: "#9ca3af", bg: "#f8f9fb", label: "—" };
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
          <div style={{ fontSize: 11, color: "#6b7080" }}>{ar ? "مقارنة توريد المشروع مع فجوة الطلب في السوق" : "Compare project supply against market demand gap"}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => upM({ enabled: false })} style={{ ...btnS, background: "#fef2f2", color: "#ef4444", padding: "6px 14px", fontSize: 10, border: "1px solid #fecaca" }}>{ar ? "تعطيل" : "Disable"}</button>
      </div>

      {/* ── Section 1: Market Gap Inputs ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "① فجوة السوق (من دراسة السوق)" : "① Market Gap (from market study)"}</div>
        <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 12 }}>{ar ? "أدخل الفجوة المتوقعة لكل قطاع حسب سنة الأفق" : "Enter expected gap per sector at horizon year"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#6b7080", fontWeight: 500 }}>{ar ? "سنة الأفق:" : "Horizon Year:"}</span>
          <NI value={m.horizonYear || 2033} onChange={v => upM({ horizonYear: v })} style={{ width: 80 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {SECTORS.map(sector => (
            <div key={sector} style={{ background: "#f8f9fb", borderRadius: 8, padding: "10px 12px", border: "1px solid #e5e7ec" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1d23", marginBottom: 4 }}>{catL(sector, ar)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NI value={gaps[sector]?.gap || 0} onChange={v => upGap(sector, v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: "#9ca3af", minWidth: 30 }}>{gaps[sector]?.unit || "sqm"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Risk Thresholds ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "② عتبات المخاطر (% من الفجوة)" : "② Risk Thresholds (% of gap)"}</div>
        <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 12 }}>{ar ? "حدّد متى يكون التوريد منخفض/متوسط/مرتفع المخاطر" : "Define when supply is Low/Medium/High risk"}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...tblStyle, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={thSt}>{ar ? "القطاع" : "Sector"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#f0fdf4" }}>{ar ? "منخفض ≤" : "Low ≤"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#fefce8" }}>{ar ? "متوسط ≤" : "Medium ≤"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#fef2f2" }}>{ar ? "مرتفع >" : "High >"}</th>
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
                    <td style={{ ...tdSt, textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{`> ${th2.med}%`}</td>
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
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ ...tdSt, fontWeight: 600 }}>{catL(row.sector, ar)}</td>
                    <td style={{ ...tdSt, color: "#6b7080" }}>{row.unit}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(row.gap)}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Math.round(row.totalSupply))}</td>
                    <td style={{ ...tdSt, textAlign: "center", fontWeight: 700, color: row.risk.color }}>{row.gap > 0 ? (row.pctGap * 100).toFixed(0) + "%" : "—"}</td>
                    <td style={{ ...tdSt, textAlign: "center" }}>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: row.risk.bg, color: row.risk.color, fontWeight: 700 }}>{row.risk.label}</span>
                    </td>
                    {phaseNames.length > 1 && row.phases.map((ph, j) => (
                      <td key={j} style={{ ...tdSt, textAlign: "right", fontSize: 10, color: "#6b7080" }}>{ph.supply > 0 ? fmt(Math.round(ph.supply)) : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {highRiskSectors.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
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
        <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 12 }}>{ar ? "لتحويل الغرف والوحدات والمراسي إلى متر مربع مكافئ" : "For converting keys/units/berths to equivalent sqm"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{ar ? "م²/غرفة فندقية" : "sqm / Hotel Key"}</div>
            <NI value={conv.sqmPerKey || 45} onChange={v => upConv("sqmPerKey", v)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{ar ? "م²/وحدة سكنية" : "sqm / Residential Unit"}</div>
            <NI value={conv.sqmPerUnit || 200} onChange={v => upConv("sqmPerUnit", v)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{ar ? "م²/مرسى" : "sqm / Marina Berth"}</div>
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

function ChecksView({ checks, t, lang }) {
  const ar = lang === "ar";
  const ap = checks.every(c=>c.pass);
  const fc = checks.filter(c=>!c.pass).length;
  const cats = [...new Set(checks.map(c=>c.cat||"General"))];
  const catLabels = {T0:ar?"T0: فحص المدخلات":"T0: Input Validation",T1:ar?"T1: محرك المشروع":"T1: Project Engine",T2:ar?"T2: التمويل":"T2: Financing",T3:ar?"T3: الشلال":"T3: Waterfall",T4:ar?"T4: الحوافز":"T4: Incentives",T5:ar?"T5: التكامل":"T5: Integration",General:"General"};
  return (<div>
    <div style={{display:"flex",alignItems:"center",marginBottom:14,gap:12}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.modelChecks}</div>
      <span style={{fontSize:11,padding:"3px 10px",borderRadius:4,fontWeight:600,background:ap?"#dcfce7":"#fef2f2",color:ap?"#16a34a":"#ef4444"}}>
        {ap?t.allPass:`${fc} ${t.errorFound}`}
      </span>
      <span style={{fontSize:11,color:"#6b7080"}}>{checks.length} {ar?"اختبار":"tests"} · {checks.filter(c=>c.pass).length} {ar?"ناجح":"passed"}</span>
    </div>
    {/* Failed checks summary at top */}
    {fc > 0 && <div style={{background:"#fef2f2",borderRadius:8,border:"1px solid #fecaca",padding:"12px 16px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:"#991b1b",marginBottom:8}}>{ar?`${fc} فحوصات فاشلة تحتاج مراجعة`:`${fc} Failed Checks Require Attention`}</div>
      {checks.filter(c=>!c.pass).map((c,i) => <div key={i} style={{fontSize:11,color:"#b91c1c",padding:"3px 0",display:"flex",gap:6}}>
        <span style={{fontWeight:600}}>✗</span>
        <span><strong>[{c.cat}]</strong> {c.name}</span>
        {c.detail && <span style={{color:"#9ca3af"}}> - {c.detail}</span>}
      </div>)}
    </div>}
    {cats.map(cat => {
      const catChecks = checks.filter(c=>(c.cat||"General")===cat);
      const catPass = catChecks.every(c=>c.pass);
      return (
        <div key={cat} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:catPass?"#16a34a":"#ef4444"}}>{catPass?"✓":"✗"}</span>
            <span style={{fontSize:11,fontWeight:600,color:"#1a1d23"}}>{catLabels[cat]||cat}</span>
            <span style={{fontSize:10,color:"#9ca3af"}}>{catChecks.filter(c=>c.pass).length}/{catChecks.length}</span>
          </div>
          <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
            <table style={tblStyle}><tbody>
              {catChecks.map((c,i)=><tr key={i} style={{background:c.pass?"":"#fef2f2"}}>
                <td style={{...tdSt,fontWeight:500,width:"30%"}}>{c.name}</td>
                <td style={{...tdSt,textAlign:"center",width:70}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:3,fontWeight:600,background:c.pass?"#dcfce7":"#fef2f2",color:c.pass?"#16a34a":"#ef4444"}}>{c.pass?(ar?"ناجح":"PASS"):(ar?"فاشل":"FAIL")}</span></td>
                <td style={{...tdSt,color:"#6b7080",fontSize:11}}>{c.desc}</td>
                {c.detail && <td style={{...tdSt,color:"#9ca3af",fontSize:10,maxWidth:200}}>{c.detail}</td>}
              </tr>)}
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
  const ar = lang === "ar";
  const [activePhase, setActivePhase] = useState("consolidated"); // "consolidated" or phase name
  if (!results || !project) return <div style={{textAlign:"center",padding:60,color:"#6b7080",fontSize:14}}>{ar?"لا توجد بيانات للعرض":"No data to present"}</div>;

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
  const healthColor = score >= maxScore * 0.7 ? "#16a34a" : score >= maxScore * 0.4 ? "#2563eb" : score >= maxScore * 0.15 ? "#eab308" : "#ef4444";
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
    <div className="hero-kpi" style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7ec",padding:"20px 22px",minWidth:140,flex:1,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:11,color:"#6b7080",fontWeight:500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
      <div style={{fontSize:26,fontWeight:700,color:color||"#1a1d23",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:"#9ca3af",marginTop:4}}>{sub}</div>}
    </div>
  );

  const Section = ({ title, children, color }) => (
    <div style={{marginBottom:24}}>
      <div style={{fontSize:14,fontWeight:700,color:color||"#1a1d23",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:4,height:18,borderRadius:2,background:color||"#2563eb"}} />{title}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{maxWidth:1100,margin:"0 auto",paddingBottom:120}}>
      {/* ── Executive Summary Card ── */}
      <div style={{background:"linear-gradient(135deg,#0f1117 0%,#1a1d2e 100%)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:"radial-gradient(circle,rgba(95,191,191,0.08) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:18,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>زان</span><span style={{width:1,height:14,background:"rgba(95,191,191,0.4)"}} /><span style={{fontSize:9,color:"#5fbfbf",fontWeight:300}}>{lang==="ar"?"النمذجة المالية":"Financial Modeler"}</span></div>
            <div style={{fontSize:24,fontWeight:700,letterSpacing:-0.5}}>{project.name || "Untitled"}</div>
            {project.location && <div style={{fontSize:12,color:"#8b90a0",marginTop:4}}>{project.location}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!slidersDefault && <span style={{fontSize:10,padding:"4px 10px",borderRadius:12,background:"#fbbf2430",color:"#fbbf24",fontWeight:600,border:"1px solid #fbbf2440"}}>{ar?"سيناريو مُعدّل":"Adjusted Scenario"}</span>}
            <div style={{padding:"6px 16px",borderRadius:20,background:healthColor+"20",border:`1px solid ${healthColor}40`,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:4,background:healthColor}} />
              <span style={{fontSize:12,fontWeight:700,color:healthColor}}>{ar ? healthLabelAr : healthLabel}</span>
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:"#8b90a0",lineHeight:1.6,marginBottom:16}}>
          {project.currency || "SAR"} {fmtM(displayCapex)} {ar?"مشروع تطوير":"development"} | {displayIRR !== null ? (displayIRR*100).toFixed(1)+"% IRR" : "—"} | {paybackYr ? paybackYr+"yr payback" : "—"} | {minDscr !== null ? minDscr.toFixed(1)+"x DSCR" : "—"}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <KPI label={ar?"إجمالي التكاليف":"Total CAPEX"} value={fmtM(displayCapex)} color="#fff" />
          <KPI label="IRR" value={displayIRR !== null ? (displayIRR*100).toFixed(1)+"%" : "—"} color={irrOk>=2?"#4ade80":irrOk===1?"#fbbf24":"#f87171"} />
          {displayNPV !== null && <KPI label={ar?"صافي القيمة الحالية":"NPV @10%"} value={fmtM(displayNPV)} color={displayNPV>0?"#4ade80":"#f87171"} />}
          {minDscr !== null && !isPhase && <KPI label={ar?"أدنى DSCR":"Min DSCR"} value={minDscr.toFixed(2)+"x"} color={dscrOk>=2?"#4ade80":dscrOk===1?"#fbbf24":"#f87171"} />}
          {w && !isPhase && <KPI label="LP MOIC" value={w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—"} color="#fff" />}
          {isPhase && <KPI label={ar?"إجمالي الإيرادات":"Total Income"} value={fmtM(displayIncome)} color="#4ade80" />}
          {isPhase && <KPI label={ar?"عدد الأصول":"Assets"} value={String(displayAssets.length)} color="#fff" />}
        </div>
      </div>

      {/* ── Phase Selector Tabs ── */}
      {phaseNames.length > 1 && (
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setActivePhase("consolidated")} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase==="consolidated"?"#1a1d23":"#f0f1f5",color:activePhase==="consolidated"?"#fff":"#6b7080",border:"none"}}>{ar?"الموحّد":"Consolidated"}</button>
          {phaseNames.map(pn => (
            <button key={pn} onClick={()=>setActivePhase(pn)} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase===pn?"#2563eb":"#f0f1f5",color:activePhase===pn?"#fff":"#6b7080",border:"none"}}>
              {pn} <span style={{fontSize:9,opacity:0.7}}>({(phaseResults[pn]?.assetCount||0)})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Phase Summary Cards (when consolidated) ── */}
      {!isPhase && phaseNames.length > 1 && (
        <Section title={ar?"ملخص المراحل":"Phase Summary"} color="#0f766e">
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(phaseNames.length, 4)}, 1fr)`,gap:12}}>
            {phaseNames.map(pn => {
              const pd = phaseResults[pn];
              return (
                <div key={pn} onClick={()=>setActivePhase(pn)} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px",cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.boxShadow="0 2px 8px rgba(37,99,235,0.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1d23",marginBottom:8}}>{pn}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>CAPEX</div><div style={{fontSize:14,fontWeight:600}}>{fmtM(pd?.totalCapex)}</div></div>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"الإيرادات":"Revenue"}</div><div style={{fontSize:14,fontWeight:600,color:"#16a34a"}}>{fmtM(pd?.totalIncome)}</div></div>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>IRR</div><div style={{fontSize:14,fontWeight:600,color:pd?.irr>0.12?"#16a34a":"#eab308"}}>{pd?.irr !== null ? (pd.irr*100).toFixed(1)+"%" : "—"}</div></div>
                    <div><div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{ar?"الأصول":"Assets"}</div><div style={{fontSize:14,fontWeight:600}}>{pd?.assetCount||0}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Bank View ── */}
      {audienceView === "bank" && !isPhase && (<>
        <Section title={ar?"ملخص التمويل":"Financing Summary"} color="#1e40af">
          {f ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي الدين":"Total Debt"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#1e40af"}}>{fmtM(f.totalDebt)}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>LTV: {f.totalProjectCost>0?((f.totalDebt/f.totalProjectCost)*100).toFixed(0):0}%</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي حقوق الملكية":"Total Equity"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#16a34a"}}>{fmtM(f.totalEquity)}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>GP: {fmtM(f.gpEquity)} | LP: {fmtM(f.lpEquity)}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"معدل التمويل":"Finance Rate"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#1a1d23"}}>{(f.rate*100).toFixed(1)}%</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{ar?"المدة":"Tenor"}: {liveProject.loanTenor||7}{ar?" سنة":"yr"} | {ar?"سماح":"Grace"}: {liveProject.debtGrace||3}{ar?" سنة":"yr"}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"متوسط DSCR":"Avg DSCR"}</div>
                <div style={{fontSize:20,fontWeight:700,color:dscrOk>=2?"#16a34a":dscrOk===1?"#eab308":"#ef4444"}}>{avgDscr ? avgDscr.toFixed(2)+"x" : "—"}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{ar?"أدنى":"Min"}: {minDscr ? minDscr.toFixed(2)+"x" : "—"}</div>
              </div>
            </div>
          ) : <div style={{color:"#6b7080",fontSize:12}}>{ar?"لا يوجد تمويل مُعدّ":"No financing configured"}</div>}
        </Section>
        {f && dscrVals.length > 0 && (
          <Section title={ar?"جدول DSCR":"DSCR Schedule"} color="#1e40af">
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px",overflowX:"auto"}}>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",minHeight:120,paddingTop:8}}>
                {f.dscr.slice(0, Math.min(liveResults.horizon, 20)).map((d, y) => {
                  if (d === null) return <div key={y} style={{flex:1,minWidth:24}} />;
                  const h = Math.min(100, Math.max(8, d * 40));
                  const clr = d >= 1.4 ? "#16a34a" : d >= 1.2 ? "#eab308" : "#ef4444";
                  return (
                    <div key={y} style={{flex:1,minWidth:24,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:8,color:"#6b7080",fontWeight:600}}>{d.toFixed(1)}x</span>
                      <div style={{width:"80%",height:h,background:clr,borderRadius:3,transition:"height 0.5s"}} />
                      <span style={{fontSize:8,color:"#9ca3af"}}>{(liveProject.startYear||2026)+y}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{borderTop:"2px dashed #ef4444",marginTop:4,position:"relative"}}>
                <span style={{position:"absolute",right:0,top:2,fontSize:8,color:"#ef4444",fontWeight:600}}>1.2x {ar?"حد أدنى":"min"}</span>
              </div>
            </div>
          </Section>
        )}
        {f && (
          <Section title={ar?"المصادر والاستخدامات":"Sources & Uses"} color="#1e40af">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#1a1d23",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المصادر":"Sources"}</div>
                {[
                  { label: ar?"دين بنكي":"Bank Debt", value: f.totalDebt, color: "#1e40af" },
                  { label: ar?"حقوق ملكية GP":"GP Equity", value: f.gpEquity, color: "#16a34a" },
                  { label: ar?"حقوق ملكية LP":"LP Equity", value: f.lpEquity, color: "#8b5cf6" },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f0f1f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:s.color}} /><span style={{fontSize:12}}>{s.label}</span></div>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:700,fontSize:13}}>
                  <span>{ar?"الإجمالي":"Total"}</span><span>{fmtM(f.totalProjectCost||f.devCostInclLand)}</span>
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#1a1d23",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"الاستخدامات":"Uses"}</div>
                {[
                  { label: ar?"تكاليف البناء":"Construction CAPEX", value: c.totalCapex },
                  { label: ar?"إيجار الأرض":"Land Cost/Rent", value: liveProject.landType==="purchase" ? liveProject.landPurchasePrice : 0 },
                  { label: ar?"رسوم التمويل":"Financing Fees", value: (f.upfrontFee||0) },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f0f1f5"}}>
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
                { label: "GP IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—", color: "#16a34a" },
                { label: "LP MOIC", value: w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—", color: "#7c3aed", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.lpTotalInvested)} → ${fmtM(w.lpTotalDist)}` },
                { label: "GP MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—", color: "#16a34a", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.gpTotalInvested)} → ${fmtM(w.gpTotalDist)}` },
                { label: "DPI", value: w.lpTotalInvested > 0 ? (w.lpTotalDist / w.lpTotalInvested).toFixed(2)+"x" : "—", color: "#1a1d23" },
              ].map((item, i) => (
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
                  <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{item.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:item.color}}>{item.value}</div>
                  {item.sub && <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{item.sub}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{color:"#6b7080",fontSize:12}}>{ar?"الشلال غير مُعدّ — اختر صندوق استثماري":"Waterfall not configured - select Fund mode"}</div>}
        </Section>
        {w && w.tier1 && (
          <Section title={ar?"شلال التوزيعات":"Distribution Waterfall"} color="#7c3aed">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:12}}>
              {[
                { label: ar?"رد رأس المال":"T1: Return of Capital", value: (w.tier1||[]).reduce((s,v)=>s+v,0), color: "#1e40af" },
                { label: ar?"العائد التفضيلي":"T2: Pref Return", value: (w.tier2||[]).reduce((s,v)=>s+v,0), color: "#7c3aed" },
                { label: ar?"تعويض المطور":"T3: GP Catch-up", value: (w.tier3||[]).reduce((s,v)=>s+v,0), color: "#16a34a" },
                { label: ar?"تقسيم الأرباح":"T4: Profit Split", value: ((w.tier4LP||[]).reduce((s,v)=>s+v,0))+((w.tier4GP||[]).reduce((s,v)=>s+v,0)), color: "#f59e0b" },
              ].map((tier, i) => (
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px",borderTop:`3px solid ${tier.color}`}}>
                  <div style={{fontSize:10,color:"#6b7080",marginBottom:4}}>{tier.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:tier.color}}>{fmtM(tier.value)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {w && (
          <Section title={ar?"اقتصاديات المطور (GP)":"GP Economics"} color="#16a34a">
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"16px 18px"}}>
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
                    <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#1a1d23"}}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
        {f && liveProject.exitStrategy !== "hold" && (
          <Section title={ar?"تحليل التخارج":"Exit Analysis"} color="#f59e0b">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
              {[
                { label: ar?"سنة التخارج":"Exit Year", value: f.exitYear || "—" },
                { label: ar?"قيمة التخارج":"Exit Value", value: f.exitProceeds ? fmtM(f.exitProceeds.reduce((s,v)=>s+v,0)) : "—" },
                { label: ar?"مضاعف التخارج":"Exit Multiple", value: liveProject.exitMultiple+"x" },
                { label: ar?"تكاليف التخارج":"Exit Cost", value: liveProject.exitCostPct+"%" },
              ].map((item, i) => (
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{item.label}</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1a1d23"}}>{item.value}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </>)}

      {/* ── Asset Overview (both views + phase filtered) ── */}
      <Section title={isPhase ? `${activePhase} — ${ar?"الأصول":"Assets"}` : (ar?"نظرة عامة على الأصول":"Asset Overview")} color="#0f766e">
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7ec",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8f9fb"}}>
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
                  {!isPhase && <td style={{...tdSt,fontSize:11,color:"#6b7080"}}>{a.phase}</td>}
                  <td style={{...tdSt,fontSize:11,color:"#6b7080"}}>{catL(a.category,ar)}</td>
                  <td style={{...tdN,fontSize:12}}>{fmt(a.gfa)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600}}>{fmtM(a.totalCapex)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600,color:"#16a34a"}}>{fmtM(a.totalRevenue)}</td>
                </tr>
              ))}
              <tr style={{background:"#f8f9fb",fontWeight:700}}>
                <td colSpan={isPhase?3:4} style={{...tdSt,fontSize:12}}>{ar?"الإجمالي":"Total"}</td>
                <td style={{...tdN,fontSize:12}}>{fmtM(displayCapex)}</td>
                <td style={{...tdN,fontSize:12,color:"#16a34a"}}>{fmtM(displayIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Live Scenario Sliders ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(15,17,23,0.95)",backdropFilter:"blur(8px)",borderTop:"1px solid #282d3a",padding:"12px 24px",display:"flex",alignItems:"center",gap:24,justifyContent:"center",zIndex:9000,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#5fbfbf",fontWeight:600,minWidth:50}}>CAPEX</span>
          <input type="range" min={80} max={120} value={liveSliders.capex} onChange={e=>setLiveSliders(s=>({...s,capex:+e.target.value}))} style={{width:120,accentColor:"#2563eb"}} />
          <span style={{fontSize:11,color:liveSliders.capex!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.capex}%</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#5fbfbf",fontWeight:600,minWidth:50}}>{ar?"الإيجار":"Rent"}</span>
          <input type="range" min={80} max={120} value={liveSliders.rent} onChange={e=>setLiveSliders(s=>({...s,rent:+e.target.value}))} style={{width:120,accentColor:"#16a34a"}} />
          <span style={{fontSize:11,color:liveSliders.rent!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.rent}%</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#5fbfbf",fontWeight:600,minWidth:50}}>{ar?"المضاعف":"Exit ×"}</span>
          <input type="range" min={6} max={15} step={0.5} value={liveSliders.exitMult} onChange={e=>setLiveSliders(s=>({...s,exitMult:+e.target.value}))} style={{width:120,accentColor:"#f59e0b"}} />
          <span style={{fontSize:11,color:liveSliders.exitMult!==(project.exitMultiple||10)?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.exitMult}x</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <button onClick={()=>setLiveSliders({capex:100,rent:100,exitMult:project.exitMultiple||10})} style={{...btnS,background:slidersDefault?"#1e2230":"#fbbf2430",color:slidersDefault?"#4b5060":"#fbbf24",padding:"6px 14px",fontSize:10,fontWeight:600,border:slidersDefault?"1px solid #282d3a":"1px solid #fbbf2440"}}>{ar?"إعادة تعيين":"Reset"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};
const btnPrim={...btnS,background:"#2563eb",color:"#fff",fontWeight:600};
const btnSm={...btnS,padding:"4px 8px",fontSize:11,fontWeight:500,borderRadius:4};
const sideInputStyle={width:"100%",padding:"7px 10px",borderRadius:5,border:"1px solid #282d3a",background:"#0F2D4F",color:"#d0d4dc",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
const cellInputStyle={padding:"4px 6px",borderRadius:3,border:"1px solid transparent",background:"transparent",color:"#1a1d23",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",width:"100%"};
const tblStyle={width:"100%",borderCollapse:"collapse"};
const thSt={padding:"7px 8px",textAlign:"start",fontSize:10,fontWeight:600,color:"#6b7080",background:"#f8f9fb",borderBottom:"1px solid #e5e7ec",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY WRAPPER
// ═══════════════════════════════════════════════════════════════
export default function ReDevModeler(props) {
  return <AppErrorBoundary><ReDevModelerInner {...props} /></AppErrorBoundary>;
}
