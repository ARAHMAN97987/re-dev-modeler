import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { storage } from "./lib/storage";

// ═══════════════════════════════════════════════════════════════
// RE-DEV MODELER — Phase 1: Project Engine v3 (Stable)
// ═══════════════════════════════════════════════════════════════

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
    title: "RE-DEV MODELER", subtitle: "Real Estate Development Financial Modeling Platform",
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
    constrStart: "Start Yr", constrDur: "Duration (mo)", totalCapex: "Total CAPEX",
    totalIncome: "Total Income",
    // Dashboard
    totalCapexLabel: "Total CAPEX", totalIncomeLabel: "Total Income",
    consolidatedIRR: "Consolidated IRR", totalNetCF: "Total Net CF",
    npv10: "NPV @10%", npv12: "NPV @12%", assetsLabel: "Assets", checksLabel: "Checks",
    phaseSummary: "Phase Summary", landConfig: "Land Configuration",
    assetOverview: "Asset Overview",
    // Cash flow
    unleveredCF: "Unlevered Project Cash Flow", lineItem: "Line Item", total: "Total",
    income: "Income", landRentLabel: "Land Rent", capex: "CAPEX", netCF: "Net Cash Flow",
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
    title: "RE-DEV MODELER", subtitle: "منصة النمذجة المالية للتطوير العقاري",
    newProject: "+ مشروع جديد", projects: "مشاريع", noProjects: "لا توجد مشاريع",
    noProjectsSub: "أنشئ مشروعك الأول للبدء",
    back: "→ رجوع", saved: "تم الحفظ", saving: "جاري الحفظ...", error: "خطأ",
    dashboard: "لوحة التحكم", assetProgram: "برنامج الأصول", cashFlow: "التدفق النقدي", checks: "فحوصات",
    general: "عام", location: "الموقع", startYear: "سنة البداية", horizon: "الأفق (سنوات)",
    currency: "العملة",
    landAcq: "حيازة الأرض", landType: "النوع", landArea: "إجمالي مساحة الأرض (م²)",
    annualRent: "الإيجار السنوي للأرض", escalation: "نسبة الزيادة %", everyN: "كل N سنة",
    grace: "فترة السماح (سنوات)", leaseTerm: "مدة الإيجار (سنوات)", purchasePrice: "سعر الشراء",
    landValuation: "تقييم الأرض", partnerEquity: "نسبة الشريك %", botYears: "فترة التشغيل (سنوات)",
    capexAssumptions: "افتراضات التكاليف", softCost: "تكاليف غير مباشرة %", contingency: "طوارئ %",
    revenueAssumptions: "افتراضات الإيرادات", rentEsc: "الزيادة السنوية للإيجار %",
    defEfficiency: "الكفاءة الافتراضية %", defLeaseRate: "سعر الإيجار الافتراضي", defCostSqm: "تكلفة المتر الافتراضية",
    scenario: "سيناريو", activeScenario: "السيناريو النشط",
    capexMult: "معامل التكاليف %", rentMult: "معامل الإيجار %",
    delayMonths: "التأخير (أشهر)", escAdj: "تعديل الزيادة %",
    phases: "المراحل", startOffset: "بداية المرحلة", footprint: "المسطح البنائي (م²)",
    addPhase: "+ إضافة مرحلة",
    addAsset: "+ إضافة أصل", assets: "أصول", noAssets: "لا توجد أصول. اضغط \"+ إضافة أصل\" للبدء.",
    phase: "المرحلة", category: "التصنيف", assetName: "اسم الأصل", code: "الرمز",
    plotArea: "مساحة القطعة", bldgFootprint: "المسطح البنائي", gfa: "المساحة (م²)", revType: "نوع الإيراد",
    efficiency: "الكفاءة %", leasable: "المساحة التأجيرية", leaseRate: "إيجار/م²", opEbitda: "الأرباح التشغيلية",
    escPct: "الزيادة %", rampYrs: "سنوات النمو", occPct: "الإشغال %", costSqm: "تكلفة/م²",
    constrStart: "سنة البناء", constrDur: "المدة (شهر)", totalCapex: "إجمالي التكاليف",
    totalIncome: "إجمالي الإيرادات",
    totalCapexLabel: "إجمالي تكاليف التطوير", totalIncomeLabel: "إجمالي الإيرادات",
    consolidatedIRR: "العائد الموحد", totalNetCF: "صافي التدفق النقدي",
    npv10: "القيمة الحالية @10%", npv12: "القيمة الحالية @12%",
    assetsLabel: "الأصول", checksLabel: "الفحوصات",
    phaseSummary: "ملخص المراحل", landConfig: "إعدادات الأرض",
    assetOverview: "نظرة عامة على الأصول",
    unleveredCF: "التدفق النقدي غير المرفوع", lineItem: "البند", total: "الإجمالي",
    income: "الإيرادات", landRentLabel: "إيجار الأرض", capex: "تكاليف التطوير", netCF: "صافي التدفق النقدي",
    consolidated: "الإجمالي الموحد",
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
    partner: "أرض كحصة عينية (شراكة)", bot: "بناء-تشغيل-تحويل",
  }
};

const CATEGORIES = ["Hospitality","Retail","Office","Residential","Flexible","Marina","Cultural","Amenity","Open Space","Utilities","Industrial","Infrastructure"];
const REV_TYPES = ["Lease","Operating","Sale"];
const CURRENCIES = ["SAR","USD","AED","EUR","GBP"];
const SCENARIOS = ["Base Case","CAPEX +10%","CAPEX -10%","Rent +10%","Rent -10%","Delay +6 months","Escalation +0.5%","Escalation -0.5%","Custom"];

const LAND_TYPES = [
  { value: "lease", en: "Land Lease (Leasehold)", ar: "إيجار أرض (حق انتفاع)" },
  { value: "purchase", en: "Land Purchase (Freehold)", ar: "شراء أرض (تملك حر)" },
  { value: "partner", en: "Land as Equity (Partner)", ar: "أرض كحصة عينية (شراكة)" },
  { value: "bot", en: "Land Swap / BOT", ar: "بناء-تشغيل-تحويل" },
];

// Hotel presets from ZAN Excel
const HOTEL_PRESETS = {
  "4-Star Hotel": { keys: 230, adr: 548, stabOcc: 70, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 },
  "5-Star Resort": { keys: 175, adr: 920, stabOcc: 73, roomsPct: 64, fbPct: 25, micePct: 7, otherPct: 4, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 55, undistPct: 28, fixedPct: 9 },
};

const MARINA_PRESET = { berths: 80, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 };

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
  phases: [{ name: "Phase 1", startYearOffset: 1, footprint: 0 }],
  assets: [],
  // Financing (Phase 2)
  finMode: "self", // self | debt | fund
  vehicleType: "fund", // fund | direct | spv
  fundName: "",
  fundStrategy: "Develop & Hold",
  fundStartYear: 0, // 0 = auto
  // Land Capitalization
  landCapitalize: false,
  landCapRate: 1000, // SAR/sqm
  landCapTo: "gp", // gp | lp | split
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
  annualMgmtFeePct: 0.9,
  custodyFeeAnnual: 130000,
  mgmtFeeBase: "devCost", // devCost | equity | custom
  developerFeePct: 10,
  structuringFeePct: 0.1,
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
});

// ── Formatters ──
const fmt = (n, d = 0) => { if (n == null || isNaN(n)) return "—"; return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
const fmtPct = (n) => { if (n == null || isNaN(n)) return "—"; return Number(n).toFixed(2) + "%"; };
const fmtM = (n) => { if (!n || isNaN(n)) return "—"; const a = Math.abs(n); if (a >= 1e9) return (n/1e9).toFixed(2)+"B"; if (a >= 1e6) return (n/1e6).toFixed(1)+"M"; if (a >= 1e3) return (n/1e3).toFixed(0)+"K"; return fmt(n); };

// ── Storage ──
async function loadProjectIndex() { try { const r = await storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : []; } catch { return []; } }
async function saveProjectIndex(index) { await storage.set(STORAGE_KEY, JSON.stringify(index)); }
async function loadProject(id) {
  try {
    const r = await storage.get(PROJECT_PREFIX + id);
    if (!r) return null;
    const p = JSON.parse(r.value);
    // Migrate: fill missing fields from defaults
    const def = defaultProject();
    const migrated = { ...def, ...p };
    // Deep merge incentives
    if (!migrated.incentives) migrated.incentives = def.incentives;
    else {
      for (const k of Object.keys(def.incentives)) {
        if (!migrated.incentives[k]) migrated.incentives[k] = def.incentives[k];
        else migrated.incentives[k] = { ...def.incentives[k], ...migrated.incentives[k] };
      }
    }
    return migrated;
  } catch { return null; }
}
async function saveProject(project) {
  project.updatedAt = new Date().toISOString();
  await storage.set(PROJECT_PREFIX + project.id, JSON.stringify(project));
  const index = await loadProjectIndex();
  const meta = { id: project.id, name: project.name, status: project.status, updatedAt: project.updatedAt, createdAt: project.createdAt };
  const idx = index.findIndex(p => p.id === project.id);
  if (idx >= 0) index[idx] = meta; else index.push(meta);
  await saveProjectIndex(index);
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
  else if (s==="Custom") { cm=(p.customCapexMult||100)/100; rm=(p.customRentMult||100)/100; dm=p.customDelay||0; ea=p.customEscAdj||0; }
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
  const effEsc = ((project.rentEscalation || 0) + ea) / 100;

  const assetSchedules = (project.assets || []).map(asset => {
    const totalCapex = computeAssetCapex(asset, project);
    const durYears = Math.ceil(((asset.constrDuration||12) + dm) / 12);
    const ramp = asset.rampUpYears || 3;
    const occ = (asset.stabilizedOcc || 100) / 100;
    const eff = (asset.efficiency || 0) / 100;
    const leasableArea = (asset.gfa || 0) * eff;
    const leaseRate = (asset.leaseRate || 0) * rm;
    const opEbitda = (asset.opEbitda || 0) * rm;
    const capexSch = new Array(horizon).fill(0);
    const revSch = new Array(horizon).fill(0);
    const cStart = (asset.constrStart || 1) - 1;

    if (durYears > 0 && totalCapex > 0) {
      const ann = totalCapex / durYears;
      for (let y = cStart; y < cStart + durYears && y < horizon; y++) if (y >= 0) capexSch[y] = ann;
    }

    const revStart = cStart + durYears;
    if (asset.revType === "Lease" && leasableArea > 0 && leaseRate > 0) {
      for (let y = revStart; y < horizon; y++) {
        const yrs = y - revStart;
        revSch[y] = leasableArea * leaseRate * occ * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
      }
    } else if (asset.revType === "Operating" && opEbitda > 0) {
      for (let y = revStart; y < horizon; y++) {
        const yrs = y - revStart;
        revSch[y] = opEbitda * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
      }
    }

    return { ...asset, totalCapex, leasableArea, capexSchedule: capexSch, revenueSchedule: revSch, totalRevenue: revSch.reduce((a,b)=>a+b,0) };
  });

  const landSch = new Array(horizon).fill(0);
  if (project.landType === "lease") {
    const base = project.landRentAnnual || 0;
    const gr = project.landRentGrace || 0;
    const eN = project.landRentEscalationEveryN || 5;
    const eP = (project.landRentEscalation || 0) / 100;
    const term = Math.min(project.landRentTerm || 50, horizon);
    for (let y = 0; y < term; y++) { if (y < gr) continue; landSch[y] = base * Math.pow(1 + eP, Math.floor((y-gr)/eN)); }
  } else if (project.landType === "purchase") { landSch[0] = project.landPurchasePrice || 0; }

  const phaseNames = [...new Set((project.assets || []).map(a => a.phase).filter(Boolean))];
  const phaseResults = {};
  phaseNames.forEach(pName => {
    const pa = assetSchedules.filter(a => a.phase === pName);
    const inc = new Array(horizon).fill(0), cap = new Array(horizon).fill(0);
    pa.forEach(a => { for (let y=0;y<horizon;y++) { inc[y]+=a.revenueSchedule[y]; cap[y]+=a.capexSchedule[y]; }});
    const totalFP = assetSchedules.reduce((s,a)=>s+(a.footprint||0),0);
    const pFP = pa.reduce((s,a)=>s+(a.footprint||0),0);
    const alloc = totalFP > 0 ? pFP/totalFP : phaseNames.length > 0 ? 1/phaseNames.length : 0;
    const pLand = landSch.map(l => l * alloc);
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

  return {
    assetSchedules, phaseResults, landSchedule: landSch, startYear, horizon,
    consolidated: {
      income:ci, capex:cc, landRent:cl, netCF:cn,
      totalCapex:cc.reduce((a,b)=>a+b,0), totalIncome:ci.reduce((a,b)=>a+b,0),
      totalLandRent:cl.reduce((a,b)=>a+b,0), totalNetCF:cn.reduce((a,b)=>a+b,0),
      irr:calcIRR(cn), npv10:calcNPV(cn,0.10), npv12:calcNPV(cn,0.12), npv14:calcNPV(cn,0.14),
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
  return r;
}
function calcNPV(cf, r) { return cf.reduce((s,v,t)=>s+v/Math.pow(1+r,t),0); }

function runChecks(project, results, financing, waterfall) {
  const as = results.assetSchedules;
  const c = results.consolidated;
  const h = results.horizon;

  // Land allocation check
  const phases = results.phaseResults || {};
  const totalAlloc = Object.values(phases).reduce((s, p) => s + (p.allocPct || 0), 0);

  // Footprint check
  const phaseFootprints = {};
  (project.phases || []).forEach(p => { phaseFootprints[p.name] = p.footprint || 0; });
  const assetFootprints = {};
  (project.assets || []).forEach(a => { assetFootprints[a.phase] = (assetFootprints[a.phase] || 0) + (a.buildingFootprint || 0); });

  // Payback period
  let cumCF = 0, paybackYear = null;
  for (let y = 0; y < h; y++) { cumCF += c.netCF[y]; if (cumCF > 0 && paybackYear === null) paybackYear = y; }

  const checks = [
    { name: "GFA Total Match", pass: Math.abs((project.assets||[]).reduce((s,a)=>s+(a.gfa||0),0) - as.reduce((s,a)=>s+(a.gfa||0),0)) < 1, desc: "GFA total matches sum" },
    { name: "No Negative GFA", pass: (project.assets||[]).every(a=>(a.gfa||0)>=0), desc: "No negative GFA" },
    { name: "No Zero Duration (active)", pass: (project.assets||[]).every(a=>((a.gfa||0)===0&&(a.costPerSqm||0)===0)||(a.constrDuration||0)>0), desc: "Active assets have duration > 0" },
    { name: "No Negative Leasable", pass: as.every(a=>(a.leasableArea||0)>=0), desc: "No negative leasable areas" },
    { name: "CAPEX Reconciles", pass: Math.abs(as.reduce((s,a)=>s+a.totalCapex,0) - c.totalCapex) < 1, desc: "Program vs Calc CAPEX match" },
    { name: "Op Assets have EBITDA", pass: (project.assets||[]).filter(a=>a.revType==="Operating").every(a=>(a.opEbitda||0)>0||(a.gfa||0)===0), desc: "Operating assets have EBITDA > 0" },
    { name: "Land Alloc = 100%", pass: Object.keys(phases).length === 0 || Math.abs(totalAlloc - 1) < 0.01, desc: "Land allocation sums to 100%" },
  ];

  // Fund checks
  if (financing && financing.mode !== "self") {
    const f = financing;
    checks.push({ name: "Debt Balance ≥ 0", pass: (f.debtBalClose||[]).every(v => v >= -0.01), desc: "Debt balance never goes negative" });
    checks.push({ name: "Capital Structure", pass: Math.abs((f.totalDebt + f.gpEquity + f.lpEquity) - f.devCostInclLand) < 10000, desc: "Debt + GP + LP = Dev Cost Incl Land" });
    const repaidByEnd = f.tenor > 0 ? (f.debtBalClose[f.repayStart + f.repayYears - 1] || 0) < 1 : true;
    checks.push({ name: "Debt Fully Repaid", pass: repaidByEnd, desc: "Debt repaid by tenor end" });
    if (waterfall) {
      const w = waterfall;
      const totalDist = w.lpTotalDist + w.gpTotalDist;
      const totalCashAvail = w.cashAvail.reduce((a,b)=>a+b,0);
      checks.push({ name: "LP+GP = Total Dist", pass: Math.abs((w.lpTotalDist + w.gpTotalDist) - totalDist) < 1, desc: "LP + GP distributions reconcile" });
      checks.push({ name: "Dist ≤ Cash Available", pass: totalDist <= totalCashAvail + 1, desc: "Distributions don't exceed cash available" });
    }
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
      const constrYears = constrEnd + 1;
      const perYear = grantAmt / constrYears;
      for (let y = 0; y <= constrEnd && y < h; y++) {
        if (c.capex[y] > 0) { result.capexGrantSchedule[y] = perYear; result.adjustedCapex[y] -= perYear; }
      }
    } else {
      result.capexGrantSchedule[Math.min(constrEnd + 1, h - 1)] = grantAmt;
    }
  }

  // ── 2. Land Rent Rebate ──
  if (inc.landRentRebate?.enabled && project.landType === "lease") {
    const lr = inc.landRentRebate;
    const constrYrs = lr.constrRebateYears > 0 ? lr.constrRebateYears : constrEnd + 1;
    const constrPct = (lr.constrRebatePct || 0) / 100;
    const operPct = (lr.operRebatePct || 0) / 100;
    const operYrs = lr.operRebateYears || 0;
    for (let y = 0; y < h; y++) {
      let rebatePct = 0;
      if (y < constrYrs) rebatePct = constrPct;
      else if (y < constrYrs + operYrs) rebatePct = operPct;
      const saving = Math.abs(c.landRent[y] || 0) * rebatePct;
      result.landRentSavingSchedule[y] = saving;
      result.adjustedLandRent[y] = (c.landRent[y] || 0) + saving; // landRent is negative, saving makes it less negative
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
        // NPV benefit of deferral
        const benefit = amt - amt / Math.pow(1.1, deferYrs);
        result.feeRebateSchedule[yr] += benefit;
        result.feeRebateTotal += benefit;
      }
    }
  }

  // ── Net CF Impact ──
  for (let y = 0; y < h; y++) {
    result.netCFImpact[y] = result.capexGrantSchedule[y] + result.landRentSavingSchedule[y] + result.feeRebateSchedule[y];
  }
  result.totalIncentiveValue = result.capexGrantTotal + result.landRentSavingTotal + result.feeRebateTotal;

  return result;
}

// Interest subsidy applied inside computeFinancing
function applyInterestSubsidy(project, interest, constrEnd) {
  const inc = project.incentives?.financeSupport;
  if (!inc?.enabled || inc.subType !== "interestSubsidy") return { adjusted: interest, savings: new Array(interest.length).fill(0), total: 0 };
  const h = interest.length;
  const startYr = inc.subsidyStart === "operation" ? constrEnd + 1 : 0;
  const endYr = startYr + (inc.subsidyYears || 5);
  const pct = (inc.subsidyPct || 0) / 100;
  const adjusted = [...interest];
  const savings = new Array(h).fill(0);
  let total = 0;
  for (let y = startYr; y < endYr && y < h; y++) {
    savings[y] = interest[y] * pct;
    adjusted[y] = interest[y] * (1 - pct);
    total += savings[y];
  }
  return { adjusted, savings, total };
}

function computeFinancing(project, projectResults, incentivesResult) {
  if (!project || !projectResults) return null;
  const h = project.horizon || 50;
  const startYear = project.startYear || 2026;
  const c = projectResults.consolidated;

  const ir = incentivesResult;
  // ── Land Capitalization ──
  const landCapValue = project.landCapitalize ? (project.landArea || 0) * (project.landCapRate || 1000) : 0;
  const devCostExclLand = ir ? ir.adjustedCapex.reduce((a,b) => a+b, 0) : c.totalCapex;
  const capexGrantTotal = ir?.capexGrantTotal || 0;
  const devCostInclLand = devCostExclLand + landCapValue;

  if (project.finMode === "self") {
    return {
      mode: "self", landCapValue, devCostExclLand, devCostInclLand, capexGrantTotal,
      gpEquity: devCostInclLand, lpEquity: 0, totalEquity: devCostInclLand, gpPct: 1, lpPct: 0,
      leveredCF: [...c.netCF], debtBalOpen: new Array(h).fill(0), debtBalClose: new Array(h).fill(0),
      debtService: new Array(h).fill(0),
      interest: new Array(h).fill(0), originalInterest: new Array(h).fill(0),
      repayment: new Array(h).fill(0), drawdown: new Array(h).fill(0),
      equityCalls: c.capex.map((v, i) => Math.max(0, v + (c.landRent[i]||0))), dscr: new Array(h).fill(null),
      totalDebt: 0, totalInterest: 0, interestSubsidyTotal: 0, interestSubsidySchedule: new Array(h).fill(0),
      upfrontFee: 0, leveredIRR: c.irr, exitProceeds: new Array(h).fill(0),
      maxDebt: 0, rate: 0, tenor: 0, grace: 0, repayYears: 0, constrEnd: 0, repayStart: 0, exitYear: 0,
    };
  }

  // ── Debt ──
  const rate = (project.financeRate || 6.5) / 100;
  const tenor = project.loanTenor || 7;
  const grace = project.debtGrace || 3;
  const repayYears = tenor - grace;
  const maxDebt = project.debtAllowed ? devCostInclLand * (project.maxLtvPct || 70) / 100 : 0;
  const upfrontFee = maxDebt * (project.upfrontFeePct || 0) / 100;

  // ── Equity Structure ──
  const totalEquity = Math.max(0, devCostInclLand - maxDebt);
  let gpEquity, lpEquity;

  // GP Equity: manual > land cap value > 50% default
  if ((project.gpEquityManual || 0) > 0) {
    gpEquity = Math.min(project.gpEquityManual, totalEquity);
  } else if (landCapValue > 0) {
    gpEquity = Math.min(landCapValue, totalEquity);
  } else {
    gpEquity = totalEquity * 0.5;
  }

  // LP Equity: manual > remainder
  if ((project.lpEquityManual || 0) > 0) {
    lpEquity = Math.min(project.lpEquityManual, Math.max(0, totalEquity - gpEquity));
  } else {
    lpEquity = Math.max(0, totalEquity - gpEquity);
  }

  // Safety: if fund mode and LP = 0 and no explicit manual override, force 50/50
  if (project.finMode === "fund" && lpEquity === 0 && !(project.gpEquityManual > 0) && !(landCapValue >= totalEquity)) {
    gpEquity = totalEquity * 0.5;
    lpEquity = totalEquity * 0.5;
  }

  const gpPct = totalEquity > 0 ? gpEquity / totalEquity : 0;
  const lpPct = totalEquity > 0 ? lpEquity / totalEquity : 0;

  // ── Construction period ──
  let constrEnd = 0;
  for (let y = h - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }

  // ── Debt drawdown ──
  const drawdown = new Array(h).fill(0);
  const equityCalls = new Array(h).fill(0);
  let totalDrawn = 0;
  const debtRatio = devCostExclLand > 0 ? Math.min(maxDebt / devCostExclLand, 1) : 0;

  for (let y = 0; y < h; y++) {
    if (c.capex[y] > 0 && totalDrawn < maxDebt) {
      const draw = Math.min(c.capex[y] * debtRatio, maxDebt - totalDrawn);
      drawdown[y] = draw;
      totalDrawn += draw;
    }
    equityCalls[y] = Math.max(0, c.capex[y] - drawdown[y]);
  }
  // Upfront fee added to equity calls in first drawdown year
  let firstDrawYear = -1;
  for (let y = 0; y < h; y++) { if (drawdown[y] > 0) { firstDrawYear = y; break; } }
  if (firstDrawYear >= 0) equityCalls[firstDrawYear] += upfrontFee;

  // ── Debt balance + repayment ──
  const debtBalOpen = new Array(h).fill(0);
  const debtBalClose = new Array(h).fill(0);
  const repay = new Array(h).fill(0);
  const interest = new Array(h).fill(0);
  const debtService = new Array(h).fill(0);

  // Grace period starts from first drawdown year
  let graceStartIdx = constrEnd;
  for (let y = 0; y < h; y++) { if (drawdown[y] > 0) { graceStartIdx = y; break; } }
  const repayStart = graceStartIdx + grace;
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
    // Interest on AVERAGE balance (open+close)/2 - matches Excel methodology
    interest[y] = ((debtBalOpen[y] + drawdown[y] + debtBalClose[y]) / 2) * rate;
    debtService[y] = repay[y] + interest[y];
  }

  // ── Exit ──
  const exitProceeds = new Array(h).fill(0);
  const exitStrategy = project.exitStrategy || "sale";
  const exitYr = exitStrategy === "hold" ? h - 1 : ((project.exitYear || 0) > 0 ? project.exitYear - startYear : constrEnd + grace + 2);

  if (exitStrategy !== "hold" && exitYr >= 0 && exitYr < h) {
    const stabIncome = c.income[Math.min(exitYr, h - 1)] || c.income[Math.min(constrEnd + 2, h - 1)] || 0;
    const stabNOI = stabIncome - (c.landRent[Math.min(exitYr, h-1)] || 0);
    let exitVal;
    if (exitStrategy === "caprate") {
      const capRate = (project.exitCapRate || 9) / 100;
      exitVal = capRate > 0 ? stabNOI / capRate : 0;
    } else {
      exitVal = stabIncome * (project.exitMultiple || 10);
    }
    const exitCost = exitVal * (project.exitCostPct || 2) / 100;
    exitProceeds[exitYr] = Math.max(0, exitVal - exitCost - debtBalClose[exitYr]);
  }

  // ── Apply interest subsidy ──
  const intSub = applyInterestSubsidy(project, interest, constrEnd);
  const adjustedInterest = intSub.adjusted;
  const adjustedDebtService = new Array(h).fill(0);
  for (let y = 0; y < h; y++) adjustedDebtService[y] = repay[y] + adjustedInterest[y];

  // ── Levered CF (with incentives) ──
  // landRent is positive (cost amount), income is positive (revenue)
  const adjustedLandRent = ir?.adjustedLandRent || c.landRent;
  const leveredCF = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    leveredCF[y] = c.income[y] - adjustedLandRent[y] - c.capex[y]
      + (ir?.capexGrantSchedule?.[y] || 0) + (ir?.feeRebateSchedule?.[y] || 0)
      - adjustedDebtService[y] + drawdown[y] + exitProceeds[y];
  }

  // ── DSCR (using adjusted interest) ──
  const dscr = new Array(h).fill(null);
  for (let y = 0; y < h; y++) {
    if (adjustedDebtService[y] > 0) { dscr[y] = (c.income[y] - adjustedLandRent[y]) / adjustedDebtService[y]; }
  }

  return {
    mode: project.finMode, landCapValue, devCostExclLand, devCostInclLand, capexGrantTotal,
    gpEquity, lpEquity, totalEquity, gpPct, lpPct,
    drawdown, equityCalls, debtBalOpen, debtBalClose,
    repayment: repay, interest: adjustedInterest, originalInterest: interest,
    debtService: adjustedDebtService, leveredCF, dscr, exitProceeds,
    totalDebt: totalDrawn, totalInterest: adjustedInterest.reduce((a, b) => a + b, 0),
    interestSubsidyTotal: intSub.total, interestSubsidySchedule: intSub.savings,
    upfrontFee, maxDebt, rate, tenor, grace, repayYears, graceStartIdx,
    leveredIRR: calcIRR(leveredCF), constrEnd, repayStart, exitYear: exitYr + startYear,
  };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: WATERFALL ENGINE
// ═══════════════════════════════════════════════════════════════
function computeWaterfall(project, projectResults, financing) {
  if (!project || !projectResults || !financing) return null;
  if (project.finMode === "self") return null;

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
  const isFund = project.vehicleType === "fund";

  // Fee calculations (only Fund type gets full fees)
  const subFee = isFund ? totalEquity * (project.subscriptionFeePct || 0) / 100 : 0;
  const devFeeTotal = c.totalCapex * (project.developerFeePct || 0) / 100;
  const structFee = isFund ? c.totalCapex * (project.structuringFeePct || 0) / 100 : 0;
  const annualMgmt = isFund ? ((project.mgmtFeeBase === "equity" ? totalEquity : f.devCostInclLand) * (project.annualMgmtFeePct || 0) / 100) : 0;
  const annualCustody = isFund ? (project.custodyFeeAnnual || 0) : 0;

  // Fee schedule
  const fees = new Array(h).fill(0);
  const feeSub = new Array(h).fill(0);
  const feeMgmt = new Array(h).fill(0);
  const feeCustody = new Array(h).fill(0);
  const feeDev = new Array(h).fill(0);
  const feeStruct = new Array(h).fill(0);

  // Find construction period
  let constrStart = h, constrEnd = 0;
  for (let y = 0; y < h; y++) { if (c.capex[y] > 0) { constrStart = Math.min(constrStart, y); constrEnd = Math.max(constrEnd, y); } }

  // Fund start year: user input or auto (1 year before construction)
  const fundStartIdx = (project.fundStartYear || 0) > 0 ? project.fundStartYear - sy : Math.max(0, constrStart - 1);

  // Exit year
  const exitStrategy = project.exitStrategy || "sale";
  const exitYr = exitStrategy === "hold" ? h - 1 : ((project.exitYear || 0) > 0 ? project.exitYear - sy : constrEnd + (project.debtGrace || 3) + 2);
  const operYears = exitYr - constrStart + 1;

  // Subscription fee at fund start (not construction start)
  if (fundStartIdx < h) feeSub[fundStartIdx] = subFee;
  // Structuring fee at fund start
  if (fundStartIdx < h) feeStruct[fundStartIdx] = structFee;
  // Developer fee spread over construction
  const constrYears = constrEnd - constrStart + 1;
  for (let y = constrStart; y <= constrEnd && y < h; y++) {
    if (c.totalCapex > 0) feeDev[y] = devFeeTotal * (c.capex[y] / c.totalCapex);
  }
  // Management + custody fees from fund start to exit
  for (let y = fundStartIdx; y <= exitYr && y < h; y++) {
    feeMgmt[y] = annualMgmt;
    feeCustody[y] = annualCustody;
  }
  for (let y = 0; y < h; y++) fees[y] = feeSub[y] + feeMgmt[y] + feeCustody[y] + feeDev[y] + feeStruct[y];

  const totalFees = fees.reduce((a, b) => a + b, 0);

  // Equity calls = CAPEX portion (equity share) + fees funded by equity
  const equityCalls = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    equityCalls[y] = f.equityCalls[y] + fees[y];
  }

  // Exit proceeds - use from financing engine (already net of debt)
  const exitProceeds = [...(f.exitProceeds || new Array(h).fill(0))];

  // Cash available for distribution
  // = NOI - debt service - fees + exit proceeds (at exit year)
  // exitProceeds already has debt subtracted in financing engine
  const cashAvail = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    const noi = c.income[y] - c.landRent[y];
    const debtSvc = f.debtService[y] || 0;
    const netOp = noi - debtSvc - fees[y];
    cashAvail[y] = (y <= exitYr ? netOp : 0) + exitProceeds[y];
    if (cashAvail[y] < 0) cashAvail[y] = 0;
  }

  // 4-tier waterfall
  const prefRate = (project.prefReturnPct || 15) / 100;
  const carryPct = (project.carryPct || 30) / 100;
  const lpSplitPct = (project.lpProfitSplitPct || 70) / 100;
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

  let cumEquityCalled = 0;
  let cumReturned = 0;
  let cumPrefPaid = 0;
  let cumPrefAccrued = 0;

  for (let y = 0; y < h; y++) {
    cumEquityCalled += equityCalls[y];
    const unreturned = cumEquityCalled - cumReturned;
    unreturnedOpen[y] = unreturned;

    // Pref accrual on unreturned capital
    const yearPref = unreturned * prefRate;
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

    // Tier 3: GP Catch-up
    if (project.gpCatchup && remaining > 0) {
      // GP catches up until GP total = carry% of all distributions so far
      const totalDistSoFar = tier1[y] + tier2[y] + remaining;
      const gpTarget = totalDistSoFar * carryPct;
      const gpSoFar = 0; // GP hasn't received from tiers 1-2 (those go to all investors)
      const catchup = Math.min(remaining, Math.max(0, gpTarget - gpSoFar));
      tier3[y] = catchup;
      remaining -= catchup;
    }

    // Tier 4: Profit Split
    if (remaining > 0) {
      tier4LP[y] = remaining * lpSplitPct;
      tier4GP[y] = remaining * gpSplitPct;
      remaining = 0;
    }

    // Allocate distributions
    // Tiers 1 & 2: distributed pro-rata to LP and GP based on equity %
    const lpFromT1T2 = (tier1[y] + tier2[y]) * lpPct;
    const gpFromT1T2 = (tier1[y] + tier2[y]) * gpPct;
    // Tier 4 profit split only if LP has equity
    lpDist[y] = lpPct > 0 ? (lpFromT1T2 + tier4LP[y]) : 0;
    gpDist[y] = gpFromT1T2 + tier3[y] + tier4GP[y] + (lpPct === 0 ? tier4LP[y] : 0);

    unreturnedClose[y] = cumEquityCalled - cumReturned;
  }

  // LP Net Cash Flow: -equity calls (LP share) + distributions
  const lpNetCF = new Array(h).fill(0);
  const gpNetCF = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    lpNetCF[y] = -equityCalls[y] * lpPct + lpDist[y];
    gpNetCF[y] = -equityCalls[y] * gpPct + gpDist[y];
  }

  const lpIRR = calcIRR(lpNetCF);
  const gpIRR = calcIRR(gpNetCF);
  const projIRR = c.irr;
  // MOIC = Total Distributions / Equity Invested (NOT equity calls which include fees)
  const lpTotalDist = lpDist.reduce((a, b) => a + b, 0);
  const gpTotalDist = gpDist.reduce((a, b) => a + b, 0);
  const lpTotalInvested = lpEquity;
  const gpTotalInvested = gpEquity;
  const lpMOIC = lpTotalInvested > 0 ? lpTotalDist / lpTotalInvested : 0;
  const gpMOIC = gpTotalInvested > 0 ? gpTotalDist / gpTotalInvested : 0;

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
    fees, feeSub, feeMgmt, feeCustody, feeDev, feeStruct, totalFees,
    equityCalls, exitProceeds, cashAvail,
    tier1, tier2, tier3, tier4LP, tier4GP,
    lpDist, gpDist, lpNetCF, gpNetCF,
    unreturnedOpen, unreturnedClose, prefAccrual, prefAccumulated,
    lpIRR, gpIRR, projIRR, lpMOIC, gpMOIC,
    lpTotalInvested, gpTotalInvested, lpTotalDist, gpTotalDist,
    lpNPV10, lpNPV12, lpNPV14, gpNPV10, gpNPV12, gpNPV14,
    projNPV10, projNPV12, projNPV14, isFund,
    exitYear: exitYr + sy,
  };
}

// ═══════════════════════════════════════════════════════════════
// PER-PHASE WATERFALL (runs waterfall for each phase independently)
// ═══════════════════════════════════════════════════════════════
function computePhaseWaterfalls(project, projectResults, financing, waterfallConsolidated) {
  if (!project || !projectResults || !financing || !waterfallConsolidated) return {};
  if (project.finMode === "self") return {};

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

    // Phase cash available
    const pCashAvail = new Array(h).fill(0);
    const pEquityCalls = new Array(h).fill(0);
    for (let y = 0; y < h; y++) {
      pEquityCalls[y] = (wc.equityCalls[y] || 0) * capexPct;
      const noi = pr.income[y] - pr.landRent[y];
      const debtSvc = (f.debtService[y] || 0) * capexPct;
      const fees = (wc.fees[y] || 0) * capexPct;
      const exitP = (wc.exitProceeds[y] || 0) * exitPct;
      pCashAvail[y] = (y <= exitYr ? (noi - debtSvc - fees) : 0) + exitP;
      if (pCashAvail[y] < 0) pCashAvail[y] = 0;
    }

    // Run 4-tier waterfall for this phase
    const prefRate = (project.prefReturnPct || 15) / 100;
    const carryPct = (project.carryPct || 30) / 100;
    const lpSplitPct = (project.lpProfitSplitPct || 70) / 100;
    const gpPct = wc.gpPct;
    const lpPct = wc.lpPct;

    const tier1=[],tier2=[],tier3=[],tier4LP=[],tier4GP=[],lpDist=[],gpDist=[];
    for(let i=0;i<h;i++){tier1.push(0);tier2.push(0);tier3.push(0);tier4LP.push(0);tier4GP.push(0);lpDist.push(0);gpDist.push(0);}

    let cumEqCalled=0,cumReturned=0,cumPrefPaid=0,cumPrefAccrued=0;
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
      if(project.gpCatchup&&rem>0){const gpTarget=(tier1[y]+tier2[y]+rem)*carryPct;const catchup=Math.min(rem,Math.max(0,gpTarget));tier3[y]=catchup;rem-=catchup;}
      if(rem>0){tier4LP[y]=rem*lpSplitPct;tier4GP[y]=rem*(1-lpSplitPct);}
      lpDist[y]=(tier1[y]+tier2[y])*lpPct+tier4LP[y];
      gpDist[y]=(tier1[y]+tier2[y])*gpPct+tier3[y]+tier4GP[y];
    }

    const lpNetCF=new Array(h).fill(0),gpNetCF=new Array(h).fill(0);
    for(let y=0;y<h;y++){lpNetCF[y]=-pEquityCalls[y]*lpPct+lpDist[y];gpNetCF[y]=-pEquityCalls[y]*gpPct+gpDist[y];}

    const lpTotalDist=lpDist.reduce((a,b)=>a+b,0);
    const gpTotalDist=gpDist.reduce((a,b)=>a+b,0);
    const lpInv=pEquityCalls.reduce((a,b)=>a+b,0)*lpPct;
    const gpInv=pEquityCalls.reduce((a,b)=>a+b,0)*gpPct;

    result[pName] = {
      debt: pDebt, equity: pEquity, gpEquity: pGpEquity, lpEquity: pLpEquity,
      fees: pFees, capexPct, exitPct,
      cashAvail: pCashAvail, equityCalls: pEquityCalls,
      tier1, tier2, tier3, tier4LP, tier4GP, lpDist, gpDist, lpNetCF, gpNetCF,
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF), projIRR: pr.irr,
      lpMOIC: lpInv > 0 ? lpTotalDist / lpInv : 0,
      gpMOIC: gpInv > 0 ? gpTotalDist / gpInv : 0,
      lpTotalDist, gpTotalDist, lpTotalInvested: lpInv, gpTotalInvested: gpInv,
      lpNPV10: calcNPV(lpNetCF, 0.10), gpNPV10: calcNPV(gpNetCF, 0.10),
      totalCashAvail: pCashAvail.reduce((a,b)=>a+b,0),
    };
  }

  return result;
}
function WaterfallView({ project, results, financing, waterfall, phaseWaterfalls, t, lang }) {
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhase, setSelectedPhase] = useState("all");
  if (!project || !results || !waterfall) return <div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>
    <div style={{fontSize:14,marginBottom:8}}>{lang==="ar"?"يتطلب اختيار هيكل تمويل غير ذاتي":"Requires non-self financing mode"}</div>
    <div style={{fontSize:12}}>{lang==="ar"?"اختر 'دين بنكي' أو 'صندوق استثماري' من لوحة التحكم":"Select 'Bank Debt' or 'Fund Structure' from the control panel"}</div>
  </div>;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = Object.keys(results.phaseResults || {});
  const hasPhases = phaseNames.length > 1 && phaseWaterfalls && Object.keys(phaseWaterfalls).length > 0;
  const w = (selectedPhase !== "all" && phaseWaterfalls?.[selectedPhase]) ? phaseWaterfalls[selectedPhase] : waterfall;
  const cur = project.currency || "SAR";

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
        <button onClick={()=>setSelectedPhase("all")} style={{...btnS,padding:"6px 14px",fontSize:11,fontWeight:500,background:selectedPhase==="all"?"#1e3a5f":"#f0f1f5",color:selectedPhase==="all"?"#fff":"#1a1d23",border:"1px solid "+(selectedPhase==="all"?"#1e3a5f":"#e5e7ec")}}>
          {lang==="ar"?"الإجمالي":"Consolidated"}
        </button>
        {phaseNames.map(p=>(
          <button key={p} onClick={()=>setSelectedPhase(p)} style={{...btnS,padding:"6px 14px",fontSize:11,fontWeight:500,background:selectedPhase===p?"#1e3a5f":"#f0f1f5",color:selectedPhase===p?"#fff":"#1a1d23",border:"1px solid "+(selectedPhase===p?"#1e3a5f":"#e5e7ec")}}>
            {p}
          </button>
        ))}
      </div>
    )}

    {/* Returns KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,marginBottom:18}}>
      <KPI label="LP Equity" value={fmtM(w.lpEquity)} sub={`${fmtPct(w.lpPct*100)}`} color="#8b5cf6" />
      <KPI label="GP Equity" value={fmtM(w.gpEquity)} sub={`${fmtPct(w.gpPct*100)}`} color="#3b82f6" />
      <KPI label="LP IRR" value={w.lpIRR!==null?fmtPct(w.lpIRR*100):"N/A"} color="#16a34a" />
      <KPI label="GP IRR" value={w.gpIRR!==null?fmtPct(w.gpIRR*100):"N/A"} color="#2563eb" />
      <KPI label="LP MOIC" value={w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"N/A"} color="#8b5cf6" />
      <KPI label="GP MOIC" value={w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"N/A"} color="#3b82f6" />
      <KPI label="Total Fees" value={fmtM(w.totalFees)} sub={cur} color="#f59e0b" />
      <KPI label="Exit Year" value={w.exitYear} color="#6b7080" />
    </div>

    {/* Capital structure & returns */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"14px 18px"}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{lang==="ar"?"هيكل رأس المال":"Capital Structure"}</div>
        <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <span style={{color:"#6b7080"}}>Total Equity</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(w.totalEquity)} {cur}</span>
          <span style={{color:"#6b7080"}}>GP Equity (Land)</span><span style={{textAlign:"right"}}>{fmt(w.gpEquity)} ({fmtPct(w.gpPct*100)})</span>
          <span style={{color:"#6b7080"}}>LP Equity</span><span style={{textAlign:"right"}}>{fmt(w.lpEquity)} ({fmtPct(w.lpPct*100)})</span>
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"14px 18px"}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{lang==="ar"?"عوائد المستثمرين":"Investor Returns"}</div>
        <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          <span></span><span style={{fontWeight:600,color:"#8b5cf6",textAlign:"center"}}>LP</span><span style={{fontWeight:600,color:"#3b82f6",textAlign:"center"}}>GP</span>
          <span style={{color:"#6b7080"}}>Invested</span><span style={{textAlign:"center"}}>{fmtM(w.lpTotalInvested)}</span><span style={{textAlign:"center"}}>{fmtM(w.gpTotalInvested)}</span>
          <span style={{color:"#6b7080"}}>Distributions</span><span style={{textAlign:"center",color:"#16a34a"}}>{fmtM(w.lpTotalDist)}</span><span style={{textAlign:"center",color:"#16a34a"}}>{fmtM(w.gpTotalDist)}</span>
          <span style={{color:"#6b7080"}}>Net IRR</span><span style={{textAlign:"center",fontWeight:700}}>{w.lpIRR!==null?fmtPct(w.lpIRR*100):"—"}</span><span style={{textAlign:"center",fontWeight:700}}>{w.gpIRR!==null?fmtPct(w.gpIRR*100):"—"}</span>
          <span style={{color:"#6b7080"}}>MOIC</span><span style={{textAlign:"center",fontWeight:700}}>{w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"}</span><span style={{textAlign:"center",fontWeight:700}}>{w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—"}</span>
          <span style={{color:"#6b7080"}}>NPV @10%</span><span style={{textAlign:"center"}}>{fmtM(w.lpNPV10)}</span><span style={{textAlign:"center"}}>{fmtM(w.gpNPV10)}</span>
              <span style={{color:"#6b7080"}}>NPV @12%</span><span style={{textAlign:"center"}}>{fmtM(w.lpNPV12)}</span><span style={{textAlign:"center"}}>{fmtM(w.gpNPV12)}</span>
              <span style={{color:"#6b7080"}}>NPV @14%</span><span style={{textAlign:"center"}}>{fmtM(w.lpNPV14)}</span><span style={{textAlign:"center"}}>{fmtM(w.gpNPV14)}</span>
        </div>
      </div>
    </div>

    {/* Waterfall breakdown visual */}
    <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"14px 18px",marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{lang==="ar"?"شلال التوزيعات":"Distribution Waterfall"}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {label: lang==="ar"?"رد رأس المال":"Tier 1: Return of Capital", val: w.tier1.reduce((a,b)=>a+b,0), bg:"#dbeafe", fg:"#1e40af"},
          {label: lang==="ar"?"العائد التفضيلي":"Tier 2: Preferred Return", val: w.tier2.reduce((a,b)=>a+b,0), bg:"#dcfce7", fg:"#166534"},
          {label: lang==="ar"?"تعويض المطور":"Tier 3: GP Catch-up", val: w.tier3.reduce((a,b)=>a+b,0), bg:"#fef3c7", fg:"#92400e"},
          {label: lang==="ar"?"تقسيم الأرباح (LP)":"Tier 4: LP Profit Split", val: w.tier4LP.reduce((a,b)=>a+b,0), bg:"#ede9fe", fg:"#5b21b6"},
          {label: lang==="ar"?"تقسيم الأرباح (GP)":"Tier 4: GP Profit Split", val: w.tier4GP.reduce((a,b)=>a+b,0), bg:"#e0f2fe", fg:"#075985"},
        ].map((t,i)=>(
          <div key={i} style={{background:t.bg,borderRadius:6,padding:"10px 14px",flex:"1 1 150px",minWidth:150}}>
            <div style={{fontSize:10,color:t.fg,fontWeight:600,marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:16,fontWeight:700,color:t.fg}}>{fmtM(t.val)}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Fee breakdown */}
    <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"14px 18px",marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{lang==="ar"?"تحليل الرسوم":"Fee Breakdown"}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:8,fontSize:12}}>
        {[
          {label:lang==="ar"?"رسوم اكتتاب":"Subscription Fee", val:w.feeSub.reduce((a,b)=>a+b,0)},
          {label:lang==="ar"?"رسوم إدارة":"Management Fee", val:w.feeMgmt.reduce((a,b)=>a+b,0)},
          {label:lang==="ar"?"رسوم حفظ":"Custody Fee", val:w.feeCustody.reduce((a,b)=>a+b,0)},
          {label:lang==="ar"?"رسوم تطوير":"Developer Fee", val:w.feeDev.reduce((a,b)=>a+b,0)},
          {label:lang==="ar"?"رسوم هيكلة":"Structuring Fee", val:w.feeStruct.reduce((a,b)=>a+b,0)},
          {label:lang==="ar"?"الإجمالي":"Total Fees", val:w.totalFees, bold:true},
        ].map((f,i)=>(
          <div key={i}><span style={{color:"#6b7080"}}>{f.label}</span><br/><span style={{fontWeight:f.bold?700:500,color:f.bold?"#ef4444":"#1a1d23"}}>{fmt(f.val)}</span></div>
        ))}
      </div>
    </div>

    {/* Phase comparison table */}
    {hasPhases && selectedPhase === "all" && (
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:18}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600}}>{lang==="ar"?"مقارنة المراحل":"Phase Comparison"}</div>
        <div style={{overflowX:"auto"}}><table style={{...tblStyle,fontSize:11}}>
          <thead><tr>
            <th style={{...thSt,minWidth:100}}>{lang==="ar"?"المرحلة":"Phase"}</th>
            <th style={{...thSt,textAlign:"right"}}>CAPEX %</th>
            <th style={{...thSt,textAlign:"right"}}>LP IRR</th>
            <th style={{...thSt,textAlign:"right"}}>GP IRR</th>
            <th style={{...thSt,textAlign:"right"}}>LP MOIC</th>
            <th style={{...thSt,textAlign:"right"}}>GP MOIC</th>
            <th style={{...thSt,textAlign:"right"}}>LP Dist</th>
            <th style={{...thSt,textAlign:"right"}}>GP Dist</th>
          </tr></thead>
          <tbody>
            {phaseNames.map(p => {
              const pw = phaseWaterfalls[p];
              if (!pw) return null;
              return <tr key={p}>
                <td style={{...tdSt,fontWeight:600}}>{p}</td>
                <td style={tdN}>{fmtPct(pw.capexPct*100)}</td>
                <td style={{...tdN,color:"#8b5cf6",fontWeight:600}}>{pw.lpIRR?fmtPct(pw.lpIRR*100):"—"}</td>
                <td style={{...tdN,color:"#3b82f6",fontWeight:600}}>{pw.gpIRR?fmtPct(pw.gpIRR*100):"—"}</td>
                <td style={tdN}>{pw.lpMOIC?pw.lpMOIC.toFixed(2)+"x":"—"}</td>
                <td style={tdN}>{pw.gpMOIC?pw.gpMOIC.toFixed(2)+"x":"—"}</td>
                <td style={{...tdN,color:"#16a34a"}}>{fmtM(pw.lpTotalDist)}</td>
                <td style={{...tdN,color:"#16a34a"}}>{fmtM(pw.gpTotalDist)}</td>
              </tr>;
            })}
          </tbody>
        </table></div>
      </div>
    )}

    {/* Year selector + tables */}
    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12}}>
      <div style={{fontSize:15,fontWeight:600}}>{lang==="ar"?"التوزيعات السنوية":"Annual Distributions"}</div><div style={{flex:1}} />
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:12}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} years</option>)}
      </select>
    </div>

    <div style={{background:"#fff",borderRadius:8,border:"2px solid #8b5cf6",overflow:"hidden",marginBottom:18}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,background:"#f5f3ff"}}>
        {lang==="ar"?"شلال التوزيعات":"Waterfall Distributions"}
      </div>
      <div style={{overflowX:"auto"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:160}}>Line Item</th>
        <th style={{...thSt,textAlign:"right"}}>Total</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:80}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
      </tr></thead><tbody>
        <CFRow label={lang==="ar"?"سحب رأس المال":"Equity Calls"} values={w.equityCalls} total={w.equityCalls.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
        <CFRow label={lang==="ar"?"النقد المتاح":"Cash Available"} values={w.cashAvail} total={w.cashAvail.reduce((a,b)=>a+b,0)} color="#16a34a" />
        <CFRow label={lang==="ar"?"رد رأس المال":"T1: Return of Capital"} values={w.tier1} total={w.tier1.reduce((a,b)=>a+b,0)} color="#2563eb" />
        <CFRow label={lang==="ar"?"العائد التفضيلي":"T2: Preferred Return"} values={w.tier2} total={w.tier2.reduce((a,b)=>a+b,0)} color="#16a34a" />
        <CFRow label={lang==="ar"?"تعويض المطور":"T3: GP Catch-up"} values={w.tier3} total={w.tier3.reduce((a,b)=>a+b,0)} color="#f59e0b" />
        <CFRow label={lang==="ar"?"حصة LP من الأرباح":"T4: LP Profit Split"} values={w.tier4LP} total={w.tier4LP.reduce((a,b)=>a+b,0)} color="#8b5cf6" />
        <CFRow label={lang==="ar"?"حصة GP من الأرباح":"T4: GP Profit Split"} values={w.tier4GP} total={w.tier4GP.reduce((a,b)=>a+b,0)} color="#3b82f6" />
        <tr style={{background:"#f0f4ff"}}><td colSpan={years.length+2} style={{padding:"4px 10px",fontSize:10,fontWeight:600,color:"#6b7080"}}>{lang==="ar"?"التوزيعات الصافية":"NET DISTRIBUTIONS"}</td></tr>
        <CFRow label={lang==="ar"?"توزيعات LP":"LP Distributions"} values={w.lpDist} total={w.lpTotalDist} bold color="#8b5cf6" />
        <CFRow label={lang==="ar"?"توزيعات GP":"GP Distributions"} values={w.gpDist} total={w.gpTotalDist} bold color="#3b82f6" />
        <tr style={{background:"#fefce8"}}><td colSpan={years.length+2} style={{padding:"4px 10px",fontSize:10,fontWeight:600,color:"#6b7080"}}>{lang==="ar"?"صافي التدفق النقدي":"NET CASH FLOW"}</td></tr>
        <CFRow label={lang==="ar"?"صافي CF للمستثمر":"LP Net CF"} values={w.lpNetCF} total={w.lpNetCF.reduce((a,b)=>a+b,0)} bold />
        <CFRow label={lang==="ar"?"صافي CF للمطور":"GP Net CF"} values={w.gpNetCF} total={w.gpNetCF.reduce((a,b)=>a+b,0)} bold />
        <tr style={{background:"#f0fdf4"}}>
          <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontWeight:500,fontSize:11,color:"#6b7080"}}>{lang==="ar"?"رأس المال غير المسترد":"Unreturned Capital"}</td>
          <td style={tdN}></td>
          {years.map(y=><td key={y} style={{...tdN,color:"#6b7080",fontSize:11}}>{w.unreturnedClose[y]===0?"—":fmt(w.unreturnedClose[y])}</td>)}
        </tr>
      </tbody></table></div>
    </div>
  </div>);
}

function FinancingView({ project, results, financing, t, up, lang }) {
  const [showYrs, setShowYrs] = useState(15);
  if (!project || !results || !financing) return <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>
    <div style={{fontSize:32,marginBottom:12}}>📊</div>
    <div style={{fontSize:14,fontWeight:500,color:"#6b7080",marginBottom:6}}>{lang==="ar"?"أكمل برنامج الأصول أولاً":"Complete Asset Program First"}</div>
    <div style={{fontSize:12}}>{lang==="ar"?"أضف أصول في تاب 'برنامج الأصول' ثم ارجع هنا":"Add assets in the 'Asset Program' tab, then return here"}</div>
  </div>;
  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const c = results.consolidated;
  const f = financing;
  const cur = project.currency || "SAR";

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
    {/* Financing KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(155px, 1fr))",gap:10,marginBottom:18}}>
      <KPI label={lang==="ar"?"تكلفة التطوير بدون الأرض":"Dev Cost Excl Land"} value={fmtM(f.devCostExclLand)} sub={cur} color="#6b7080" />
      {f.landCapValue > 0 && <KPI label={lang==="ar"?"رسملة الأرض":"Land Capitalization"} value={fmtM(f.landCapValue)} sub={cur} color="#f59e0b" />}
      <KPI label={lang==="ar"?"تكلفة التطوير مع الأرض":"Dev Cost Incl Land"} value={fmtM(f.devCostInclLand)} sub={cur} color="#1a1d23" />
      <KPI label={lang==="ar"?"سقف الدين":"Max Debt (LTV)"} value={fmtM(f.maxDebt)} sub={`${project.maxLtvPct}%`} color="#ef4444" />
      <KPI label="GP Equity" value={fmtM(f.gpEquity)} sub={fmtPct(f.gpPct*100)} color="#3b82f6" />
      <KPI label="LP Equity" value={fmtM(f.lpEquity)} sub={fmtPct(f.lpPct*100)} color="#8b5cf6" />
      <KPI label={lang==="ar"?"إجمالي الفوائد":"Total Interest"} value={fmtM(f.totalInterest)} sub={cur} color="#ef4444" />
      <KPI label="Levered IRR" value={f.leveredIRR!==null?fmtPct(f.leveredIRR*100):"N/A"} color="#16a34a" />
    </div>

    {/* Equation check */}
    <div style={{background:"#f0f4ff",borderRadius:8,border:"1px solid #bfdbfe",padding:"10px 16px",marginBottom:18,fontSize:12}}>
      <strong>{lang==="ar"?"معادلة هيكل رأس المال":"Capital Structure Equation"}:</strong>{" "}
      Debt ({fmtM(f.totalDebt)}) + GP ({fmtM(f.gpEquity)}) + LP ({fmtM(f.lpEquity)}) = {fmtM(f.totalDebt + f.gpEquity + f.lpEquity)}{" "}
      {Math.abs((f.totalDebt + f.gpEquity + f.lpEquity) - f.devCostInclLand) < 1000
        ? <span style={{color:"#16a34a",fontWeight:600}}>✓ = Dev Cost Incl Land</span>
        : <span style={{color:"#ef4444",fontWeight:600}}>✗ ≠ Dev Cost ({fmtM(f.devCostInclLand)})</span>}
    </div>

    {/* LP = 0 warning */}
    {f.lpEquity === 0 && project.finMode !== "self" && (
      <div style={{background:"#fef3c7",borderRadius:8,border:"1px solid #fde68a",padding:"12px 16px",marginBottom:18,fontSize:12,color:"#92400e"}}>
        <strong>⚠ {lang==="ar"?"LP Equity = صفر":"LP Equity = 0"}</strong><br/>
        {lang==="ar"
          ? "لا يوجد مستثمرين (LP). لتفعيل LP: فعّل رسملة الأرض (GP = قيمة الأرض، LP = الباقي) أو أدخل GP Equity يدوياً في قسم هيكل رأس المال في الشريط الجانبي."
          : "No investor equity. To enable LP: activate Land Capitalization (GP = land value, LP = remainder) or enter GP Equity manually in the Equity Structure section of the sidebar."}
      </div>
    )}

    {/* Debt summary */}
    <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"14px 18px",marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>
        {project.islamicMode==="conventional"?"Debt Structure":"Islamic Finance Structure"} - {project.repaymentType==="amortizing"?"Amortizing":"Bullet"} Repayment
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:10,fontSize:12}}>
        <div><span style={{color:"#6b7080"}}>Tenor:</span> <strong>{project.loanTenor} yrs</strong> ({project.debtGrace} grace + {f.repayYears} repay)</div>
        <div><span style={{color:"#6b7080"}}>Rate:</span> <strong>{project.financeRate}%</strong></div>
        <div><span style={{color:"#6b7080"}}>Upfront Fee:</span> <strong>{project.upfrontFeePct}%</strong></div>
        <div><span style={{color:"#6b7080"}}>Repay Starts:</span> <strong>{sy + f.repayStart}</strong></div>
        <div><span style={{color:"#6b7080"}}>Exit Year:</span> <strong>{f.exitYear}</strong></div>
        <div><span style={{color:"#6b7080"}}>Exit Multiple:</span> <strong>{project.exitMultiple}x rent</strong></div>
      </div>
    </div>

    {/* DSCR chart-like display */}
    <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"14px 18px",marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>DSCR (Debt Service Coverage Ratio)</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
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
      <div style={{marginTop:8,fontSize:10,color:"#9ca3af"}}>Green ≥ 1.5x (Strong) | Yellow ≥ 1.2x (Adequate) | Orange ≥ 1.0x (Tight) | Red &lt; 1.0x (Risk)</div>
    </div>

    {/* Year selector */}
    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12}}>
      <div style={{fontSize:15,fontWeight:600}}>Levered Cash Flow</div><div style={{flex:1}} />
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"1px solid #e5e7ec",fontSize:12}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} years</option>)}
      </select>
    </div>

    {/* Levered CF table */}
    <div style={{background:"#fff",borderRadius:8,border:"2px solid #8b5cf6",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,background:"#f5f3ff"}}>
        Fund Cash Flow (Levered)
      </div>
      <div style={{overflowX:"auto"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:140}}>Line Item</th>
        <th style={{...thSt,textAlign:"right"}}>Total</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:80}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{sy+y}</span></th>)}
      </tr></thead><tbody>
        <CFRow label="Rental Income" values={c.income} total={c.totalIncome} color="#16a34a" />
        <CFRow label="Land Rent" values={c.landRent} total={c.totalLandRent} color="#ef4444" negate />
        <CFRow label="CAPEX" values={c.capex} total={c.totalCapex} color="#ef4444" negate />
        <CFRow label="Debt Drawdown" values={f.drawdown} total={f.totalDebt} color="#3b82f6" />
        <CFRow label="Debt Repayment" values={f.repayment} total={f.repayment.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
        <CFRow label={project.islamicMode==="conventional"?"Interest":"Profit Cost"} values={f.interest} total={f.totalInterest} color="#ef4444" negate />
        <CFRow label="Total Debt Service" values={f.debtService} total={f.debtService.reduce((a,b)=>a+b,0)} color="#dc2626" negate />
        <CFRow label="Exit Proceeds" values={f.exitProceeds} total={f.exitProceeds.reduce((a,b)=>a+b,0)} color="#8b5cf6" />
        <CFRow label="Levered Net CF" values={f.leveredCF} total={f.leveredCF.reduce((a,b)=>a+b,0)} bold />
        {/* Debt balance row */}
        <tr style={{background:"#f0f4ff"}}>
          <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:500,fontSize:11,color:"#3b82f6"}}>Debt Balance (Close)</td>
          <td style={tdN}></td>
          {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:11}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
        </tr>
        <tr style={{background:"#fefce8"}}>
          <td style={{...tdSt,position:"sticky",left:0,background:"#fefce8",zIndex:1,fontWeight:600,fontSize:11,color:"#a16207"}}>DSCR</td>
          <td style={tdN}></td>
          {years.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.2?"#16a34a":"#ef4444",fontWeight:600,fontSize:11}}>{f.dscr[y]===null?"—":f.dscr[y].toFixed(2)+"x"}</td>)}
        </tr>
      </tbody></table></div>
    </div>
  </div>);
}
const EditableCell = memo(function EditableCell({ value, onChange, type = "text", options, style: sx, placeholder, step }) {
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
        {options.map(o => <option key={o} value={o}>{o}</option>)}
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
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function ReDevModeler({ user, signOut }) {
  const [view, setView] = useState("dashboard");
  const [projectIndex, setProjectIndex] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lang, setLang] = useState("en");
  const t = L[lang];
  const autoSaveTimer = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => { (async () => { setProjectIndex(await loadProjectIndex()); setLoading(false); })(); }, []);

  useEffect(() => {
    if (!project || view !== "editor") return;
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try { await saveProject(project); setProjectIndex(await loadProjectIndex()); setSaveStatus("saved"); }
      catch { setSaveStatus("error"); }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [project, view]);

  const results = useMemo(() => project ? computeProjectCashFlows(project) : null, [project]);
  const incentivesResult = useMemo(() => project && results ? computeIncentives(project, results) : null, [project, results]);
  const financing = useMemo(() => project && results ? computeFinancing(project, results, incentivesResult) : null, [project, results, incentivesResult]);
  const waterfall = useMemo(() => project && results && financing ? computeWaterfall(project, results, financing) : null, [project, results, financing]);
  const phaseWaterfalls = useMemo(() => computePhaseWaterfalls(project, results, financing, waterfall), [project, results, financing, waterfall]);
  const checks = useMemo(() => project && results ? runChecks(project, results, financing, waterfall) : [], [project, results, financing, waterfall]);

  const createProject = async () => { const p = defaultProject(); await saveProject(p); setProjectIndex(await loadProjectIndex()); setProject(p); setView("editor"); setActiveTab("dashboard"); };
  const openProject = async (id) => { setLoading(true); const p = await loadProject(id); if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); } setLoading(false); };
  const duplicateProject = async (id) => { const p = await loadProject(id); if (p) { const d={...p,id:crypto.randomUUID(),name:p.name+" (Copy)",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await saveProject(d); setProjectIndex(await loadProjectIndex()); }};
  const deleteProject = async (id) => { await deleteProjectStorage(id); setProjectIndex(await loadProjectIndex()); if (project?.id===id){setProject(null);setView("dashboard");} };

  const up = useCallback((u) => {
    // Preserve sidebar scroll position during state updates
    const scrollTop = sidebarRef.current?.scrollTop;
    setProject(prev => ({...prev,...u}));
    if (scrollTop != null) {
      requestAnimationFrame(() => {
        if (sidebarRef.current) sidebarRef.current.scrollTop = scrollTop;
      });
    }
  }, []);
  const upAsset = useCallback((i, u) => {
    const scrollTop = sidebarRef.current?.scrollTop;
    setProject(prev => { const a=[...prev.assets]; a[i]={...a[i],...u}; return {...prev,assets:a}; });
    if (scrollTop != null) requestAnimationFrame(() => { if (sidebarRef.current) sidebarRef.current.scrollTop = scrollTop; });
  }, []);
  const addAsset = useCallback(() => setProject(prev => ({...prev, assets:[...prev.assets, {
    id: crypto.randomUUID(), phase: prev.phases[0]?.name||"Phase 1", category:"Retail", name:"", code:"", notes:"",
    plotArea:0, footprint:0, gfa:0, revType:"Lease", efficiency: prev.defaultEfficiency||85,
    leaseRate:0, opEbitda:0, escalation: prev.rentEscalation||0.75, rampUpYears:3, stabilizedOcc:100,
    costPerSqm:0, constrStart:1, constrDuration:12, hotelPL:null, marinaPL:null,
  }]})), []);
  const rmAsset = useCallback((i) => setProject(prev => ({...prev, assets:prev.assets.filter((_,j)=>j!==i)})), []);
  const goBack = () => { setView("dashboard"); setProject(null); };

  if (loading) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:"#fff",letterSpacing:-0.5}}>RE-DEV MODELER</div><div style={{fontSize:13,color:"#6b7080",marginTop:8}}>Loading...</div></div></div>;
  if (view === "dashboard") return <ProjectsDashboard index={projectIndex} onCreate={createProject} onOpen={openProject} onDup={duplicateProject} onDel={deleteProject} lang={lang} setLang={setLang} t={t} user={user} signOut={signOut} />;

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} style={{display:"flex",height:"100vh",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#f8f9fb",color:"#1a1d23",fontSize:13}}>
      {sidebarOpen && (
        <div style={{width:340,minWidth:340,background:"#0f1117",color:"#d0d4dc",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1e2230",display:"flex",alignItems:"center",gap:8}}>
            <button onClick={goBack} style={{...btnS,background:"#1e2230",color:"#8b90a0",padding:"5px 10px",fontSize:11}}>{t.back}</button>
            <div style={{flex:1}}><div style={{fontSize:10,color:"#4ade80",letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>RE-DEV MODELER</div></div>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:saveStatus==="saved"?"#0a2a1a":saveStatus==="error"?"#2a0a0a":"#2a2a0a",color:saveStatus==="saved"?"#4ade80":saveStatus==="error"?"#f87171":"#fbbf24"}}>{t[saveStatus]||saveStatus}</span>
          </div>
          <div ref={sidebarRef} style={{flex:1,overflowY:"auto"}}><ControlPanel project={project} up={up} t={t} lang={lang} /></div>
        </div>
      )}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:50,minHeight:50,background:"#fff",borderBottom:"1px solid #e5e7ec",display:"flex",alignItems:"center",padding:"0 16px",gap:10}}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{...btnS,background:"#f0f1f5",padding:"6px 10px",fontSize:13}}>{sidebarOpen?"◁":"▷"}</button>
          <div style={{flex:1}}>
            <EditableCell value={project?.name||""} onChange={v=>up({name:v})} style={{border:"none",fontSize:16,fontWeight:600,color:"#1a1d23",background:"transparent",width:"100%",padding:"4px 0"}} placeholder="Project Name" />
          </div>
          <StatusBadge status={project?.status} onChange={s=>up({status:s})} />
          <div style={{fontSize:11,color:"#9ca3af"}}>{project?.currency||"SAR"}</div>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"5px 10px",fontSize:11,fontWeight:600}}>{lang==="en"?"عربي":"EN"}</button>
          <button onClick={()=>{const email=prompt(lang==="ar"?"أدخل إيميل المستخدم للمشاركة:":"Enter email to share with:");if(email&&email.includes("@")){const shared=[...(project.sharedWith||[])];if(!shared.includes(email)){shared.push(email);up({sharedWith:shared});alert(lang==="ar"?"تمت المشاركة مع "+email:"Shared with "+email);}else{alert(lang==="ar"?"مشارك مسبقاً":"Already shared");}}}} style={{...btnS,background:"#f0f4ff",color:"#2563eb",padding:"4px 10px",fontSize:10,fontWeight:500,border:"1px solid #bfdbfe"}}>{lang==="ar"?"مشاركة":"Share"}</button>
          {user && <div style={{fontSize:10,color:"#9ca3af",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
          {signOut && <button onClick={signOut} style={{...btnS,background:"#fef2f2",color:"#ef4444",padding:"4px 10px",fontSize:10,fontWeight:500}}>Sign Out</button>}
        </div>
        <div style={{background:"#fff",borderBottom:"1px solid #e5e7ec",display:"flex",padding:"0 16px",gap:0,overflowX:"auto"}}>
          {/* Progress steps */}
          <div style={{display:"flex",alignItems:"center",gap:2,padding:"8px 12px 8px 0",borderRight:"1px solid #f0f1f5",marginRight:4}}>
            {[
              {n:"1",done:(project.assets||[]).length>0},
              {n:"2",done:project.finMode!=="self"},
              {n:"3",done:!!waterfall},
              {n:"4",done:false},
            ].map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
                <div style={{width:18,height:18,borderRadius:9,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",background:s.done?"#16a34a":"#e5e7ec",color:s.done?"#fff":"#9ca3af"}}>{s.done?"✓":s.n}</div>
                {i<3&&<div style={{width:12,height:1,background:s.done?"#16a34a":"#e5e7ec"}} />}
              </div>
            ))}
          </div>
          {[{key:"dashboard",label:t.dashboard},{key:"assets",label:t.assetProgram},{key:"financing",label:lang==="ar"?"التمويل":"Financing"},{key:"waterfall",label:lang==="ar"?"شلال التوزيعات":"Waterfall"},{key:"incentives",label:lang==="ar"?"الحوافز":"Incentives"},{key:"reports",label:lang==="ar"?"التقارير":"Reports"},{key:"scenarios",label:lang==="ar"?"السيناريوهات":"Scenarios"},{key:"cashflow",label:t.cashFlow},{key:"checks",label:t.checks}].map(tb=>(
            <button key={tb.key} onClick={()=>setActiveTab(tb.key)} style={{padding:"10px 14px",fontSize:11,fontWeight:500,border:"none",cursor:"pointer",background:"none",color:activeTab===tb.key?"#2563eb":"#6b7080",borderBottom:activeTab===tb.key?"2px solid #2563eb":"2px solid transparent",whiteSpace:"nowrap"}}>{tb.label}{tb.key==="checks"&&checks.some(c=>!c.pass)?" ⚠":""}</button>
          ))}
        </div>
        <div style={{flex:1,overflow:"auto",padding:18}}>
          {activeTab==="dashboard"&&<ProjectDash project={project} results={results} checks={checks} t={t} financing={financing} />}
          {activeTab==="assets"&&<AssetTable project={project} upAsset={upAsset} addAsset={addAsset} rmAsset={rmAsset} results={results} t={t} lang={lang} updateProject={up} />}
          {activeTab==="financing"&&<FinancingView project={project} results={results} financing={financing} t={t} up={up} lang={lang} />}
          {activeTab==="waterfall"&&<WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} t={t} lang={lang} />}
          {activeTab==="reports"&&<ReportsView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} checks={checks} lang={lang} />}
          {activeTab==="scenarios"&&<ScenariosView project={project} results={results} financing={financing} waterfall={waterfall} lang={lang} />}
          {activeTab==="incentives"&&<IncentivesView project={project} results={results} incentivesResult={incentivesResult} financing={financing} lang={lang} up={up} />}
          {activeTab==="cashflow"&&<CashFlowView project={project} results={results} t={t} />}
          {activeTab==="checks"&&<ChecksView checks={checks} t={t} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS DASHBOARD
// ═══════════════════════════════════════════════════════════════
function ProjectsDashboard({ index, onCreate, onOpen, onDup, onDel, lang, setLang, t, user, signOut }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const sorted = [...index].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  return (
    <div style={{minHeight:"100vh",background:"#0f1117",fontFamily:"'DM Sans',system-ui,sans-serif",color:"#d0d4dc"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"48px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:48}}>
          <div>
            <div style={{fontSize:11,color:"#4ade80",letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Real Estate Development</div>
            <div style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:-1}}>{t.title}</div>
            <div style={{fontSize:14,color:"#6b7080",marginTop:8}}>{t.subtitle}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {user && <div style={{fontSize:11,color:"#6b7080",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
            {signOut && <button onClick={signOut} style={{...btnS,background:"#2a0a0a",color:"#f87171",padding:"6px 14px",fontSize:11,fontWeight:500}}>Sign Out</button>}
            <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#1e2230",color:"#9ca3af",padding:"8px 16px",fontSize:12,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:32}}>
          <button onClick={onCreate} style={{...btnPrim,padding:"10px 24px",fontSize:13}}>{t.newProject}</button>
          <div style={{flex:1}} />
          <div style={{fontSize:12,color:"#6b7080",alignSelf:"center"}}>{sorted.length} {t.projects}</div>
        </div>
        {sorted.length===0 ? (
          <div style={{textAlign:"center",padding:64,border:"1px dashed #1e2230",borderRadius:8}}><div style={{fontSize:15,color:"#6b7080"}}>{t.noProjects}</div><div style={{fontSize:12,color:"#4b5060",marginTop:6}}>{t.noProjectsSub}</div></div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(p=>(
              <div key={p.id} style={{background:"#161a24",borderRadius:8,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,border:"1px solid #1e2230",cursor:"pointer",transition:"border-color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#2e3340"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e2230"} onClick={()=>onOpen(p.id)}>
                <div style={{width:38,height:38,borderRadius:6,background:p.status==="Complete"?"#0a2a1a":p.status==="In Progress"?"#0a1a2a":"#1e2230",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                  {p.status==="Complete"?"✓":p.status==="In Progress"?"▶":"◇"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#6b7080",marginTop:2}}>{new Date(p.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
                <span style={{fontSize:10,padding:"3px 10px",borderRadius:4,fontWeight:500,background:p.status==="Complete"?"#0a2a1a":p.status==="In Progress"?"#0a1a2a":"#1e2230",color:p.status==="Complete"?"#4ade80":p.status==="In Progress"?"#60a5fa":"#9ca3af"}}>{p.status||"Draft"}</span>
                <button onClick={e=>{e.stopPropagation();onDup(p.id);}} style={{...btnSm,background:"#1e2230",color:"#9ca3af",padding:"4px 10px"}} title="Duplicate">{lang==="ar"?"نسخ":"Copy"}</button>
                {confirmDel===p.id ? (
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{onDel(p.id);setConfirmDel(null);}} style={{...btnSm,background:"#7f1d1d",color:"#fca5a5"}}>Yes</button>
                    <button onClick={()=>setConfirmDel(null)} style={{...btnSm,background:"#1e2230",color:"#9ca3af"}}>No</button>
                  </div>
                ) : (
                  <button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{...btnSm,background:"#1e2230",color:"#6b7080"}} title="Delete">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({status,onChange}) {
  const [open,setOpen]=useState(false);
  const sts=["Draft","In Progress","Complete"];
  const col={Draft:{bg:"#f0f1f5",fg:"#6b7080"},"In Progress":{bg:"#dbeafe",fg:"#2563eb"},Complete:{bg:"#dcfce7",fg:"#16a34a"}};
  const c=col[status]||col.Draft;
  return (<div style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{...btnS,background:c.bg,color:c.fg,padding:"4px 12px",fontSize:11,fontWeight:600}}>{status||"Draft"} ▾</button>
    {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"#fff",border:"1px solid #e5e7ec",borderRadius:6,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:100,overflow:"hidden"}}>
      {sts.map(s=><button key={s} onClick={()=>{onChange(s);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 16px",border:"none",background:status===s?"#f0f1f5":"#fff",fontSize:12,cursor:"pointer",textAlign:"left",color:"#1a1d23"}}>{s}</button>)}
    </div>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// CONTROL PANEL
// ═══════════════════════════════════════════════════════════════
// ── Sidebar helper components (defined OUTSIDE ControlPanel to prevent re-creation) ──
function Sec({title,children,def=true}) {
  const [open,setOpen]=useState(def);
  return (<div style={{borderBottom:"1px solid #1e2230"}}>
    <button onClick={e=>{e.preventDefault();setOpen(!open);}} style={{width:"100%",padding:"11px 16px",background:"none",border:"none",color:"#8b90a0",fontSize:10,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between"}}>{title}<span style={{color:"#3b4050"}}>{open?"−":"+"}</span></button>
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
    {showTip && tip && <div style={{position:"absolute",top:-4,left:0,right:0,transform:"translateY(-100%)",background:"#1a1d23",color:"#d0d4dc",padding:"8px 10px",borderRadius:6,fontSize:10,lineHeight:1.4,zIndex:99,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",maxWidth:260}}>{tip}</div>}
    {children}
    {hint&&<div style={{fontSize:10,color:"#4b5060",marginTop:2}}>{hint}</div>}
  </div>);
}

function Sel({value,onChange,options,lang}) {
  return (<select value={value} onChange={e=>{e.stopPropagation();onChange(e.target.value);}} style={sideInputStyle}>
    {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[lang||"en"]||o.en||o.label}</option>)}
  </select>);
}

function ControlPanel({ project, up, t, lang }) {
  if (!project) return null;

  const addPhase=()=>{const n=project.phases.length+1;up({phases:[...project.phases,{name:`Phase ${n}`,startYearOffset:n,footprint:0}]});};
  const upPhase=(i,u)=>{const ph=[...project.phases];ph[i]={...ph[i],...u};up({phases:ph});};
  const rmPhase=(i)=>up({phases:project.phases.filter((_,j)=>j!==i)});

  return (<>
    <Sec title={t.general}>
      <Fld label={t.location}><SidebarInput value={project.location} onChange={v=>up({location:v})} placeholder="e.g. Jazan, Saudi Arabia" /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.startYear}><SidebarInput type="number" value={project.startYear} onChange={v=>up({startYear:v})} /></Fld>
        <Fld label={t.horizon}><SidebarInput type="number" value={project.horizon} onChange={v=>up({horizon:v})} /></Fld>
      </div>
      <Fld label={t.currency}><Sel lang={lang} value={project.currency} onChange={v=>up({currency:v})} options={CURRENCIES} /></Fld>
    </Sec>

    <Sec title={t.landAcq}>
      <Fld label={t.landType}><Sel lang={lang} value={project.landType} onChange={v=>up({landType:v})} options={LAND_TYPES} /></Fld>
      <Fld label={t.landArea}><SidebarInput type="number" value={project.landArea} onChange={v=>up({landArea:v})} /></Fld>
      {project.landType==="lease"&&<>
        <Fld label={t.annualRent}><SidebarInput type="number" value={project.landRentAnnual} onChange={v=>up({landRentAnnual:v})} /></Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label={t.escalation}><SidebarInput type="number" value={project.landRentEscalation} onChange={v=>up({landRentEscalation:v})} /></Fld>
          <Fld label={t.everyN}><SidebarInput type="number" value={project.landRentEscalationEveryN} onChange={v=>up({landRentEscalationEveryN:v})} /></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label={t.grace}><SidebarInput type="number" value={project.landRentGrace} onChange={v=>up({landRentGrace:v})} /></Fld>
          <Fld label={t.leaseTerm}><SidebarInput type="number" value={project.landRentTerm} onChange={v=>up({landRentTerm:v})} /></Fld>
        </div>
      </>}
      {project.landType==="purchase"&&<Fld label={t.purchasePrice}><SidebarInput type="number" value={project.landPurchasePrice} onChange={v=>up({landPurchasePrice:v})} /></Fld>}
      {project.landType==="partner"&&<>
        <Fld label={t.landValuation}><SidebarInput type="number" value={project.landValuation} onChange={v=>up({landValuation:v})} /></Fld>
        <Fld label={t.partnerEquity}><SidebarInput type="number" value={project.partnerEquityPct} onChange={v=>up({partnerEquityPct:v})} /></Fld>
      </>}
      {project.landType==="bot"&&<Fld label={t.botYears}><SidebarInput type="number" value={project.botOperationYears} onChange={v=>up({botOperationYears:v})} /></Fld>}
    </Sec>

    <Sec title={t.capexAssumptions}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.softCost} tip="Indirect costs: design, supervision, permits. Standard 8-12%"><SidebarInput type="number" value={project.softCostPct} onChange={v=>up({softCostPct:v})} /></Fld>
        <Fld label={t.contingency} tip="Risk reserve for unexpected costs. Standard 3-7%"><SidebarInput type="number" value={project.contingencyPct} onChange={v=>up({contingencyPct:v})} /></Fld>
      </div>
    </Sec>

    <Sec title={t.revenueAssumptions}>
      <Fld label={t.rentEsc}><SidebarInput type="number" value={project.rentEscalation} onChange={v=>up({rentEscalation:v})} /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.defEfficiency} tip="Leasable % of GFA. Offices 80-90%, Retail 70-85%"><SidebarInput type="number" value={project.defaultEfficiency} onChange={v=>up({defaultEfficiency:v})} /></Fld>
        <Fld label={t.defLeaseRate}><SidebarInput type="number" value={project.defaultLeaseRate} onChange={v=>up({defaultLeaseRate:v})} /></Fld>
      </div>
      <Fld label={t.defCostSqm}><SidebarInput type="number" value={project.defaultCostPerSqm} onChange={v=>up({defaultCostPerSqm:v})} /></Fld>
    </Sec>

    <Sec title={t.scenario}>
      <Fld label={t.activeScenario}><Sel lang={lang} value={project.activeScenario} onChange={v=>up({activeScenario:v})} options={SCENARIOS} /></Fld>
      {project.activeScenario==="Custom"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label={t.capexMult}><SidebarInput type="number" value={project.customCapexMult} onChange={v=>up({customCapexMult:v})} /></Fld>
          <Fld label={t.rentMult}><SidebarInput type="number" value={project.customRentMult} onChange={v=>up({customRentMult:v})} /></Fld>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Fld label={t.delayMonths}><SidebarInput type="number" value={project.customDelay} onChange={v=>up({customDelay:v})} /></Fld>
          <Fld label={t.escAdj}><SidebarInput type="number" value={project.customEscAdj} onChange={v=>up({customEscAdj:v})} /></Fld>
        </div>
      </>}
    </Sec>

    <Sec title={lang==="ar"?"التمويل":"Financing"} def={false}>
      <Fld label={lang==="ar"?"نوع التمويل":"Financing Mode"}>
        <Sel lang={lang} value={project.finMode} onChange={v=>up({finMode:v})} options={[
          {value:"self",en:"Self-Funded (100% Equity)",ar:"تمويل ذاتي"},
          {value:"debt",en:"Bank Debt + Equity",ar:"دين بنكي + رأس مال"},
          {value:"fund",en:"Fund Structure (GP/LP)",ar:"صندوق استثماري"},
        ]} />
      </Fld>
      {project.finMode !== "self" && <>
        {/* Vehicle Type */}
        <Fld label={lang==="ar"?"نوع الأداة":"Vehicle Type"}>
          <Sel lang={lang} value={project.vehicleType} onChange={v=>up({vehicleType:v})} options={[
            {value:"fund",en:"Fund (full fees)",ar:"صندوق (رسوم كاملة)"},
            {value:"direct",en:"Direct Investors (no fund fees)",ar:"مستثمرين مباشرين"},
            {value:"spv",en:"SPV (limited fees)",ar:"شركة ذات غرض خاص"},
          ]} />
        </Fld>
        {/* Fund info */}
        {project.vehicleType === "fund" && <>
          <Fld label={lang==="ar"?"اسم الصندوق":"Fund Name"}><SidebarInput value={project.fundName} onChange={v=>up({fundName:v})} placeholder="e.g. ZAN Infrastructure Fund" /></Fld>
          <Fld label={lang==="ar"?"الاستراتيجية":"Strategy"}>
            <Sel lang={lang} value={project.fundStrategy} onChange={v=>up({fundStrategy:v})} options={["Develop & Hold","Develop & Sell","Develop & Operate"]} />
          </Fld>
        </>}
        {/* ── Land Capitalization ── */}
        <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:600,color:"#8b90a0",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{lang==="ar"?"رسملة الأرض":"Land Capitalization"}</div>
          <Fld label={lang==="ar"?"هل ترسمل الأرض؟":"Capitalize Land?"} tip="Convert leasehold right to equity contribution">
            <Sel lang={lang} value={project.landCapitalize?"Y":"N"} onChange={v=>up({landCapitalize:v==="Y"})} options={["Y","N"]} />
          </Fld>
          {project.landCapitalize && <>
            <Fld label={lang==="ar"?"سعر الرسملة (ريال/م²)":"Cap Rate (SAR/sqm)"} hint={`${lang==="ar"?"القيمة":"Value"}: ${fmt((project.landArea||0)*(project.landCapRate||1000))} ${project.currency}`}>
              <SidebarInput type="number" value={project.landCapRate} onChange={v=>up({landCapRate:v})} />
            </Fld>
            <Fld label={lang==="ar"?"ترسمل لصالح":"Capitalize To"}>
              <Sel lang={lang} value={project.landCapTo} onChange={v=>up({landCapTo:v})} options={[
                {value:"gp",en:"GP (as in-kind equity)",ar:"المطور (كحصة عينية)"},
                {value:"lp",en:"LP (investor equity)",ar:"المستثمرين"},
                {value:"split",en:"Split pro-rata",ar:"توزع بالتساوي"},
              ]} />
            </Fld>
            {project.landType==="lease" && (
              <Fld label={lang==="ar"?"GP يتحمل إيجار الأرض وحده؟":"GP bears land rent alone?"}>
                <Sel lang={lang} value={project.landCapGpBearRent?"Y":"N"} onChange={v=>up({landCapGpBearRent:v==="Y"})} options={["Y","N"]} />
              </Fld>
            )}
          </>}
        </div>
        {/* ── Equity Structure ── */}
        <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:600,color:"#8b90a0",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{lang==="ar"?"هيكل رأس المال":"Equity Structure"}</div>
          <Fld label={lang==="ar"?"GP Equity (ريال)":"GP Equity (SAR)"} hint={`0 = ${lang==="ar"?"تلقائي من رسملة الأرض":"auto from land cap"}`}>
            <SidebarInput type="number" value={project.gpEquityManual} onChange={v=>up({gpEquityManual:v})} />
          </Fld>
          <Fld label={lang==="ar"?"LP Equity (ريال)":"LP Equity (SAR)"} hint={`0 = ${lang==="ar"?"الباقي تلقائياً":"auto remainder"}`}>
            <SidebarInput type="number" value={project.lpEquityManual} onChange={v=>up({lpEquityManual:v})} />
          </Fld>
        </div>
        {/* ── Debt ── */}
        <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:600,color:"#8b90a0",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{lang==="ar"?"الدين":"Debt"}</div>
          <Fld label={lang==="ar"?"هل الدين مسموح؟":"Debt Allowed"}>
            <Sel lang={lang} value={project.debtAllowed?"Y":"N"} onChange={v=>up({debtAllowed:v==="Y"})} options={["Y","N"]} />
          </Fld>
          {project.debtAllowed && <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Fld label="Max LTV %" tip="Loan-to-Value ratio. Saudi banks: 50-70%"><SidebarInput type="number" value={project.maxLtvPct} onChange={v=>up({maxLtvPct:v})} /></Fld>
              <Fld label={lang==="ar"?"معدل الربح %":"Finance Rate %"} tip="Annual profit/interest rate. Saudi market: 5-8%"><SidebarInput type="number" value={project.financeRate} onChange={v=>up({financeRate:v})} /></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Fld label={lang==="ar"?"مدة القرض":"Tenor (yrs)"}><SidebarInput type="number" value={project.loanTenor} onChange={v=>up({loanTenor:v})} /></Fld>
              <Fld label={lang==="ar"?"فترة السماح":"Grace (yrs)"}><SidebarInput type="number" value={project.debtGrace} onChange={v=>up({debtGrace:v})} /></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Fld label={lang==="ar"?"رسوم تأسيس %":"Upfront Fee %"} tip="One-time loan fee at first drawdown"><SidebarInput type="number" value={project.upfrontFeePct} onChange={v=>up({upfrontFeePct:v})} /></Fld>
              <Fld label={lang==="ar"?"نوع السداد":"Repayment"}>
                <Sel lang={lang} value={project.repaymentType} onChange={v=>up({repaymentType:v})} options={[
                  {value:"amortizing",en:"Amortizing",ar:"أقساط"},
                  {value:"bullet",en:"Bullet",ar:"دفعة واحدة"},
                ]} />
              </Fld>
            </div>
            <Fld label={lang==="ar"?"هيكل التمويل":"Finance Structure"}>
              <Sel lang={lang} value={project.islamicMode} onChange={v=>up({islamicMode:v})} options={[
                {value:"conventional",en:"Conventional",ar:"تقليدي"},
                {value:"murabaha",en:"Murabaha (مرابحة)",ar:"مرابحة"},
                {value:"ijara",en:"Ijara (إجارة)",ar:"إجارة"},
              ]} />
            </Fld>
          </>}
        </div>
        {/* ── Exit ── */}
        <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:600,color:"#8b90a0",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{lang==="ar"?"التخارج":"Exit"}</div>
          <Fld label={lang==="ar"?"استراتيجية التخارج":"Exit Strategy"}>
            <Sel lang={lang} value={project.exitStrategy||"sale"} onChange={v=>up({exitStrategy:v})} options={[
              {value:"sale",en:"Asset Sale (Multiple)",ar:"بيع الأصل (مضاعف)"},
              {value:"caprate",en:"Asset Sale (Cap Rate)",ar:"بيع الأصل (معدل رسملة)"},
              {value:"hold",en:"Hold for Income (No Sale)",ar:"احتفاظ بالدخل (بدون بيع)"},
            ]} />
          </Fld>
          {(project.exitStrategy||"sale") !== "hold" && <>
            <Fld label={lang==="ar"?"سنة التخارج":"Exit Year"} hint="0 = auto"><SidebarInput type="number" value={project.exitYear} onChange={v=>up({exitYear:v})} /></Fld>
            {(project.exitStrategy||"sale") === "sale" && (
              <Fld label={lang==="ar"?"مضاعف الإيجار":"Exit Multiple (x)"} tip="Sale price = Annual Rent × Multiple"><SidebarInput type="number" value={project.exitMultiple} onChange={v=>up({exitMultiple:v})} /></Fld>
            )}
            {project.exitStrategy === "caprate" && (
              <Fld label={lang==="ar"?"معدل الرسملة %":"Cap Rate %"}><SidebarInput type="number" value={project.exitCapRate} onChange={v=>up({exitCapRate:v})} /></Fld>
            )}
            <Fld label={lang==="ar"?"تكاليف التخارج %":"Exit Cost %"}><SidebarInput type="number" value={project.exitCostPct} onChange={v=>up({exitCostPct:v})} /></Fld>
          </>}
          {project.vehicleType === "fund" && (
            <Fld label={lang==="ar"?"سنة بداية الصندوق":"Fund Start Year"} tip="Fund establishment year. Usually 1 year before construction" hint={`0 = ${lang==="ar"?"تلقائي (سنة قبل البناء)":"auto (1yr before construction)"}`}>
              <SidebarInput type="number" value={project.fundStartYear} onChange={v=>up({fundStartYear:v})} />
            </Fld>
          )}
        </div>
        {/* ── Waterfall ── */}
        <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:600,color:"#8b90a0",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{lang==="ar"?"شلال التوزيعات":"Waterfall"}</div>
          <Fld label={lang==="ar"?"العائد التفضيلي %":"Preferred Return %"} tip="Priority return to investors before profit split. Standard 8-15%"><SidebarInput type="number" value={project.prefReturnPct} onChange={v=>up({prefReturnPct:v})} /></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label={lang==="ar"?"حصة الأداء %":"Carry %"} tip="Developer profit share after preferred return. Standard 20-30%"><SidebarInput type="number" value={project.carryPct} onChange={v=>up({carryPct:v})} /></Fld>
            <Fld label={lang==="ar"?"حصة LP %":"LP Split %"} tip="Investor share of remaining profits. Standard 70-80%"><SidebarInput type="number" value={project.lpProfitSplitPct} onChange={v=>up({lpProfitSplitPct:v})} /></Fld>
          </div>
          <Fld label={lang==="ar"?"تعويض المطور؟":"GP Catch-up"}>
            <Sel lang={lang} value={project.gpCatchup?"Y":"N"} onChange={v=>up({gpCatchup:v==="Y"})} options={["Y","N"]} />
          </Fld>
        </div>
        {/* ── Fees (fund only) ── */}
        {project.vehicleType === "fund" && (
          <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
            <div style={{fontSize:10,fontWeight:600,color:"#8b90a0",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{lang==="ar"?"رسوم الصندوق":"Fund Fees"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Fld label={lang==="ar"?"اكتتاب %":"Subscription %"} tip="One-time fund entry fee. Standard 1-3%"><SidebarInput type="number" value={project.subscriptionFeePct} onChange={v=>up({subscriptionFeePct:v})} /></Fld>
              <Fld label={lang==="ar"?"إدارة %":"Mgmt Fee %"} tip="Annual management fee. Standard 0.5-2%"><SidebarInput type="number" value={project.annualMgmtFeePct} onChange={v=>up({annualMgmtFeePct:v})} /></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Fld label={lang==="ar"?"تطوير %":"Developer Fee %"}><SidebarInput type="number" value={project.developerFeePct} onChange={v=>up({developerFeePct:v})} /></Fld>
              <Fld label={lang==="ar"?"هيكلة %":"Structuring %"} tip="One-time deal structuring fee. Standard 0.1-1%"><SidebarInput type="number" value={project.structuringFeePct} onChange={v=>up({structuringFeePct:v})} /></Fld>
            </div>
            <Fld label={lang==="ar"?"رسوم حفظ سنوية":"Custody Fee (annual)"} tip="Annual custody & admin (fixed SAR). Standard 100-200K"><SidebarInput type="number" value={project.custodyFeeAnnual} onChange={v=>up({custodyFeeAnnual:v})} /></Fld>
          </div>
        )}
        {/* Developer fee for non-fund */}
        {project.vehicleType !== "fund" && (
          <div style={{borderTop:"1px solid #262a35",marginTop:10,paddingTop:10}}>
            <Fld label={lang==="ar"?"رسوم تطوير %":"Developer Fee %"}><SidebarInput type="number" value={project.developerFeePct} onChange={v=>up({developerFeePct:v})} /></Fld>
          </div>
        )}
      </>}
    </Sec>

    <Sec title={t.phases}>
      {project.phases.map((ph,i)=>(
        <div key={i} style={{background:"#161a24",borderRadius:6,padding:10,marginBottom:8}}>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <SidebarInput value={ph.name} onChange={v=>upPhase(i,{name:v})} style={{flex:1,fontWeight:600}} placeholder="Phase name" />
            {project.phases.length>1&&<button onClick={()=>rmPhase(i)} style={{...btnSm,background:"#2a0a0a",color:"#f87171"}}>✕</button>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div><div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{t.startOffset}</div><SidebarInput type="number" value={ph.startYearOffset} onChange={v=>upPhase(i,{startYearOffset:v})} /></div>
            <div><div style={{fontSize:10,color:"#6b7080",marginBottom:2}}>{t.footprint}</div><SidebarInput type="number" value={ph.footprint} onChange={v=>upPhase(i,{footprint:v})} /></div>
          </div>
        </div>
      ))}
      <button onClick={addPhase} style={{...btnS,width:"100%",background:"#1e2230",color:"#9ca3af",padding:"8px",fontSize:11}}>{t.addPhase}</button>
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

// ═══════════════════════════════════════════════════════════════
// ASSET PROGRAM TABLE
// ═══════════════════════════════════════════════════════════════
function AssetTable({ project, upAsset, addAsset, rmAsset, results, t, lang, updateProject }) {
  const [modal, setModal] = useState(null); // {type:'hotel'|'marina', idx}
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef(null);
  if (!project) return null;
  const assets = project.assets || [];
  const phaseNames = project.phases.map(p => p.name);

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
          updatedPhases.push({ name: pName, startYearOffset: updatedPhases.length + 1, footprint: 0 });
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
  const cols = [
    { key:"#", en:"#", ar:"#" },
    { key:"phase", en:"Phase", ar:"المرحلة" },
    { key:"category", en:"Category", ar:"التصنيف" },
    { key:"name", en:"Asset Name", ar:"اسم الأصل" },
    { key:"code", en:"Code", ar:"الرمز" },
    { key:"plotArea", en:"Plot Area", ar:"مساحة القطعة" },
    { key:"footprint", en:"Footprint", ar:"المسطح البنائي" },
    { key:"gfa", en:"GFA (sqm)", ar:"المساحة (م²)" },
    { key:"revType", en:"Rev Type", ar:"نوع الإيراد" },
    { key:"eff", en:"Eff %", ar:"الكفاءة %" },
    { key:"leasable", en:"Leasable", ar:"التأجيرية" },
    { key:"rate", en:"Rate/sqm", ar:"إيجار/م²" },
    { key:"opEbitda", en:"Op EBITDA", ar:"أرباح تشغيلية" },
    { key:"esc", en:"Esc %", ar:"الزيادة %" },
    { key:"ramp", en:"Ramp", ar:"النمو" },
    { key:"occ", en:"Occ %", ar:"الإشغال %" },
    { key:"cost", en:"Cost/sqm", ar:"تكلفة/م²" },
    { key:"start", en:"Constr. Start (Yr)", ar:"بداية البناء (سنة)" },
    { key:"dur", en:"Constr. Duration (mo)", ar:"مدة البناء (شهر)" },
    { key:"totalCapex", en:"Total CAPEX", ar:"إجمالي التكاليف" },
    { key:"totalInc", en:"Total Income", ar:"إجمالي الإيرادات" },
    { key:"ops", en:"", ar:"" },
  ];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:15,fontWeight:600}}>{t.assetProgram}</div>
        <div style={{fontSize:12,color:"#6b7080"}}>{assets.length} {t.assets}</div>
        <div style={{flex:1}} />
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
        <button onClick={addAsset} style={{...btnPrim,padding:"7px 16px",fontSize:12}}>{t.addAsset}</button>
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
      <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead>
              <tr>
                {cols.map(c=>(
                  <th key={c.key} style={{...thSt,minWidth:c.key==="name"?130:c.key==="#"||c.key==="ops"?30:undefined, ...(c.key==="totalCapex"?{background:"#eef2ff"}:c.key==="totalInc"?{background:"#ecfdf5"}:{})}}>
                    <div>{c.en}</div>
                    {c.ar!==c.en&&<div style={{fontWeight:400,fontSize:9,color:"#9ca3af"}}>{c.ar}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length===0?(
                <tr><td colSpan={cols.length} style={{...tdSt,textAlign:"center",color:"#9ca3af",padding:32}}>{t.noAssets}</td></tr>
              ):(
                assets.map((a,i)=>{
                  const comp = results?.assetSchedules?.[i];
                  const isOp = a.revType === "Operating";
                  const isHotel = isOp && (a.category === "Hospitality");
                  const isMarina = isOp && (a.category === "Marina");
                  const bg = i%2===0?"#fff":"#fafbfc";
                  return (
                    <tr key={a.id||i} style={{background:bg}}>
                      <td style={{...tdSt,color:"#9ca3af",fontWeight:500,width:30}}>{i+1}</td>
                      <td style={tdSt}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></td>
                      <td style={tdSt}><EditableCell options={CATEGORIES} value={a.category} onChange={v=>upAsset(i,{category:v})} /></td>
                      <td style={tdSt}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder="Name" /></td>
                      <td style={tdSt}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{width:45}} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} /></td>
                      <td style={tdSt}><EditableCell options={REV_TYPES} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} /></td>
                      <td style={{...tdSt,color:"#6b7080",textAlign:"right",fontSize:11}}>{fmt(comp?.leasableArea||(a.gfa||0)*(a.efficiency||0)/100)}</td>
                      <td style={{...tdSt,background:isOp?"#f5f5f5":undefined}}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{opacity:isOp?0.3:1}} /></td>
                      <td style={tdSt}>
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
                      <td style={tdSt}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.constrStart} onChange={v=>upAsset(i,{constrStart:v})} /></td>
                      <td style={tdSt}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} /></td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,background:"#f5f7ff",fontSize:11}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,color:"#16a34a",background:"#f0fdf4",fontSize:11}}>{fmt(comp?.totalRevenue||0)}</td>
                      <td style={tdSt}><button onClick={()=>rmAsset(i)} style={{...btnSm,background:"#fef2f2",color:"#ef4444",fontSize:10}}>✕</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
function ProjectDash({ project, results, checks, t, financing }) {
  if (!project || !results) return null;
  const c = results.consolidated;
  const cur = project.currency || "SAR";
  const phases = Object.entries(results.phaseResults);
  const fc = checks.filter(ch => !ch.pass).length;
  const f = financing;
  const h = results.horizon;

  // Payback period
  let cumCF = 0, paybackYr = null;
  for (let y = 0; y < h; y++) { cumCF += c.netCF[y]; if (cumCF > 0 && paybackYr === null) paybackYr = y + 1; }

  // Cash Yield (stabilized year income / total equity)
  const stabYear = Math.min(10, h - 1);
  const cashYield = f && f.totalEquity > 0 ? (c.income[stabYear] / f.totalEquity * 100) : null;

  return (<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:10,marginBottom:20}}>
      <KPI label={t.totalCapexLabel} value={fmtM(c.totalCapex)} sub={cur} color="#ef4444" />
      <KPI label={t.totalIncomeLabel+` (${project.horizon}yr)`} value={fmtM(c.totalIncome)} sub={cur} color="#22c55e" />
      <KPI label={t.consolidatedIRR+" (Unlevered)"} value={c.irr!==null?fmtPct(c.irr*100):"N/A"} color="#3b82f6" />
      {f && f.mode !== "self" && <KPI label="Levered IRR" value={f.leveredIRR!==null?fmtPct(f.leveredIRR*100):"N/A"} color="#8b5cf6" />}
      {f && f.mode !== "self" && <KPI label="Total Debt" value={fmtM(f.totalDebt)} sub={cur} color="#f59e0b" />}
      <KPI label={t.totalNetCF} value={fmtM(c.totalNetCF)} sub={cur} color="#8b5cf6" />
      <KPI label={t.npv10} value={fmtM(c.npv10)} sub={cur} color="#06b6d4" />
      <KPI label="Payback" value={paybackYr ? `Year ${paybackYr}` : "N/A"} sub={paybackYr ? `${results.startYear + paybackYr - 1}` : ""} color="#f59e0b" />
      {cashYield !== null && <KPI label="Cash Yield" value={fmtPct(cashYield)} sub="on equity" color="#16a34a" />}
      <KPI label={t.assetsLabel} value={project.assets.length} color="#f59e0b" />
      <KPI label={t.checksLabel} value={fc===0?t.allPass:`${fc} FAIL`} color={fc===0?"#22c55e":"#ef4444"} />
    </div>

    {phases.length>0&&<div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600}}>{t.phaseSummary}</div>
      <div style={{overflowX:"auto"}}><table style={tblStyle}><thead><tr>
        {["Phase","Assets","Total CAPEX","Total Income","Land Rent","Net CF","IRR","Footprint","Land %"].map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {phases.map(([n,pr])=><tr key={n}>
          <td style={tdSt}><strong>{n}</strong></td>
          <td style={{...tdSt,textAlign:"center"}}>{pr.assetCount}</td>
          <td style={tdN}>{fmt(pr.totalCapex)}</td>
          <td style={tdN}>{fmt(pr.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(pr.totalLandRent)}</td>
          <td style={{...tdN,color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
          <td style={{...tdN,fontWeight:600}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</td>
          <td style={tdN}>{fmt(pr.footprint)}</td>
          <td style={tdN}>{fmtPct(pr.allocPct*100)}</td>
        </tr>)}
        <tr style={{background:"#f8f9fb",fontWeight:700}}>
          <td style={tdSt}>{t.consolidated}</td>
          <td style={{...tdSt,textAlign:"center"}}>{project.assets.length}</td>
          <td style={tdN}>{fmt(c.totalCapex)}</td><td style={tdN}>{fmt(c.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(c.totalLandRent)}</td>
          <td style={{...tdN,color:c.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(c.totalNetCF)}</td>
          <td style={{...tdN,fontWeight:700}}>{c.irr!==null?fmtPct(c.irr*100):"—"}</td>
          <td style={tdN}></td><td style={tdN}></td>
        </tr>
      </tbody></table></div>
    </div>}

    <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"12px 16px",marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>{t.landConfig}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,fontSize:12}}>
        <div><span style={{color:"#6b7080"}}>Type:</span> <strong>{LAND_TYPES.find(l=>l.value===project.landType)?.en}</strong></div>
        <div><span style={{color:"#6b7080"}}>Area:</span> <strong>{fmt(project.landArea)} sqm</strong></div>
        {project.landType==="lease"&&<>
          <div><span style={{color:"#6b7080"}}>Annual Rent:</span> <strong>{fmt(project.landRentAnnual)} {cur}</strong></div>
          <div><span style={{color:"#6b7080"}}>Grace:</span> <strong>{project.landRentGrace} yrs</strong></div>
          <div><span style={{color:"#6b7080"}}>Land Rent Total:</span> <strong style={{color:"#ef4444"}}>{fmt(c.totalLandRent)} {cur}</strong></div>
        </>}
        {project.landType==="purchase"&&<div><span style={{color:"#6b7080"}}>Price:</span> <strong>{fmt(project.landPurchasePrice)} {cur}</strong></div>}
      </div>
    </div>

    {results.assetSchedules.length>0&&<div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600}}>{t.assetOverview} ({results.assetSchedules.length})</div>
      <div style={{overflowX:"auto"}}><table style={tblStyle}><thead><tr>
        {["#","Asset","Category","Phase","GFA","CAPEX",`Income (${project.horizon}yr)`,"Rev Type"].map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {results.assetSchedules.map((a,i)=><tr key={a.id||i}>
          <td style={{...tdSt,color:"#9ca3af",width:30}}>{i+1}</td>
          <td style={tdSt}>{a.name||"—"}</td><td style={tdSt}>{a.category}</td><td style={tdSt}>{a.phase}</td>
          <td style={tdN}>{fmt(a.gfa)}</td><td style={tdN}>{fmt(a.totalCapex)}</td>
          <td style={{...tdN,color:"#16a34a"}}>{fmt(a.totalRevenue)}</td><td style={tdSt}>{a.revType}</td>
        </tr>)}
      </tbody></table></div>
    </div>}
  </div>);
}

function KPI({label,value,sub,color}) {
  return <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:"12px 14px"}}>
    <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>{label}</div>
    <div style={{fontSize:19,fontWeight:700,color:color||"#1a1d23",lineHeight:1.1}}>{value}{sub&&<span style={{fontSize:11,fontWeight:400,color:"#9ca3af",marginLeft:4}}>{sub}</span>}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// CASH FLOW VIEW
// ═══════════════════════════════════════════════════════════════
function CashFlowView({ project, results, t }) {
  if (!project||!results) return <div style={{color:"#9ca3af"}}>Add assets to see projections.</div>;
  const [showYrs,setShowYrs]=useState(15);
  const {horizon,startYear}=results;
  const years=Array.from({length:Math.min(showYrs,horizon)},(_,i)=>i);
  const phases=Object.entries(results.phaseResults);
  const c=results.consolidated;

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"#f8f9fb"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.unleveredCF}</div><div style={{flex:1}} />
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{...sideInputStyle,background:"#fff",color:"#1a1d23",border:"1px solid #e5e7ec",width:"auto",padding:"4px 8px"}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} years</option>)}
      </select>
    </div>
    {phases.map(([name,pr])=>(
      <div key={name} style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:600,display:"flex",justifyContent:"space-between"}}>
          <span>{name}</span><span style={{color:"#6b7080",fontWeight:400,fontSize:11}}>IRR: <strong style={{color:pr.irr!==null?"#2563eb":"#9ca3af"}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</strong></span>
        </div>
        <div style={{overflowX:"auto"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
          <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:100}}>{t.lineItem}</th>
          <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
          {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{startYear+y}</span></th>)}
        </tr></thead><tbody>
          <CFRow label={t.income} values={pr.income} total={pr.totalIncome} color="#16a34a" />
          <CFRow label={t.landRentLabel} values={pr.landRent} total={pr.totalLandRent} color="#ef4444" negate />
          <CFRow label={t.capex} values={pr.capex} total={pr.totalCapex} color="#ef4444" negate />
          <CFRow label={t.netCF} values={pr.netCF} total={pr.totalNetCF} bold />
        </tbody></table></div>
      </div>
    ))}
    <div style={{background:"#fff",borderRadius:8,border:"2px solid #2563eb",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7ec",fontSize:13,fontWeight:700,background:"#f0f4ff",display:"flex",justifyContent:"space-between"}}>
        <span>{t.consolidated}</span><span style={{fontSize:11,fontWeight:400}}>IRR: <strong style={{color:"#2563eb"}}>{c.irr!==null?fmtPct(c.irr*100):"—"}</strong></span>
      </div>
      <div style={{overflowX:"auto"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"#f8f9fb",zIndex:2,minWidth:100}}>{t.lineItem}</th>
        <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"#9ca3af"}}>{startYear+y}</span></th>)}
      </tr></thead><tbody>
        <CFRow label={t.income} values={c.income} total={c.totalIncome} color="#16a34a" />
        <CFRow label={t.landRentLabel} values={c.landRent} total={c.totalLandRent} color="#ef4444" negate />
        <CFRow label={t.capex} values={c.capex} total={c.totalCapex} color="#ef4444" negate />
        <CFRow label={t.netCF} values={c.netCF} total={c.totalNetCF} bold />
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

function generateFullModelCSV(project, results, financing, waterfall) {
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
  sections.push(["Unlevered IRR", c?.irr ? (c.irr * 100).toFixed(2) + "%" : "N/A"]);
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
  sections.push(["Year", "Calendar", "Income", "Land Rent", "CAPEX", "Net CF"]);
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
    sections.push(["Year", "Calendar", "Equity Calls", "Cash Available", "T1:ROC", "T2:Pref", "T3:Catchup", "T4:LP Split", "T4:GP Split", "LP Dist", "GP Dist", "LP Net CF", "GP Net CF"]);
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

function ReportsView({ project, results, financing, waterfall, phaseWaterfalls, checks, lang }) {
  const reportRef = useRef(null);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  if (!project || !results) return <div style={{color:"#9ca3af"}}>Add assets first.</div>;

  const c = results.consolidated;
  const f = financing;
  const w = waterfall;
  const cur = project.currency || "SAR";
  const sy = results.startYear;
  const h = results.horizon;
  const failCount = checks.filter(ch => !ch.pass).length;
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;

  const togglePhase = (p) => {
    setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const printReport = () => {
    const el = reportRef.current;
    if (!el) return;
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.name} - Report</title><style>
      @page { size: A4; margin: 15mm; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1d23; line-height: 1.5; margin: 0; padding: 20px; }
      h1 { font-size: 20px; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; }
      h2 { font-size: 14px; color: #1e3a5f; margin-top: 18px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
      th { background: #1e3a5f; color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      td { padding: 4px 6px; border-bottom: 1px solid #e5e7ec; }
      div[style] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style></head><body onload="window.print()">${el.innerHTML}</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${activeReport}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reports = [
    { key: "exec", label: lang === "ar" ? "ملخص تنفيذي" : "Executive Summary", icon: "📋" },
    { key: "bank", label: lang === "ar" ? "حزمة البنك" : "Bank Submission Pack", icon: "🏦" },
    { key: "investor", label: lang === "ar" ? "مذكرة المستثمر" : "Investor Memo", icon: "💼" },
  ];

  // 10-year CF for bank pack
  const bankYears = Array.from({length: Math.min(10, h)}, (_, i) => i);

  return (<div>
    {/* Report selector */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12,marginBottom:18}}>
      {reports.map(r => (
        <button key={r.key} onClick={() => setActiveReport(r.key)}
          style={{background:activeReport===r.key?"#1e3a5f":"#fff",color:activeReport===r.key?"#fff":"#1a1d23",
            border:"1px solid #e5e7ec",borderRadius:8,padding:"16px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
          <div style={{fontSize:24,marginBottom:6}}>{r.icon}</div>
          <div style={{fontSize:13,fontWeight:600}}>{r.label}</div>
        </button>
      ))}
    </div>

    {/* Phase filter */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:"#6b7080",marginBottom:6}}>{lang==="ar"?"اختر المراحل للتقرير":"Select phases for report"}</div>
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

    {/* Export buttons */}
    <div style={{display:"flex",gap:10,marginBottom:18}}>
      {activeReport && <button onClick={printReport} style={{...btnPrim,padding:"8px 18px",fontSize:12}}>{lang==="ar"?"⬇ تحميل التقرير (HTML/PDF)":"⬇ Download Report (HTML/PDF)"}</button>}
      <button onClick={() => generateFullModelCSV(project, results, financing, waterfall)} style={{...btnS,background:"#f0fdf4",color:"#16a34a",padding:"8px 18px",fontSize:12,border:"1px solid #bbf7d0",fontWeight:500}}>
        {lang==="ar"?"⬇ تصدير النموذج الكامل (CSV)":"⬇ Export Full Model (CSV)"}
      </button>
    </div>

    {/* Report content */}
    <div ref={reportRef}>
      {activeReport === "exec" && (
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:24}}>
          <h1 style={{fontSize:20,color:"#1e3a5f",borderBottom:"2px solid #1e3a5f",paddingBottom:6,marginTop:0}}>{project.name} - Executive Summary</h1>
          <div style={{fontSize:11,color:"#6b7080",marginBottom:16}}>{project.location} | {cur} | {sy} - {sy + h} ({h} years) | {new Date().toLocaleDateString()}</div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8,marginBottom:18}}>
            {[
              {l:"Total CAPEX",v:fmtM(c.totalCapex),c:"#ef4444"},
              {l:"Total Income",v:fmtM(c.totalIncome),c:"#16a34a"},
              {l:"Unlevered IRR",v:c.irr?fmtPct(c.irr*100):"N/A",c:"#2563eb"},
              {l:"NPV @10%",v:fmtM(c.npv10),c:"#06b6d4"},
              ...(f&&f.mode!=="self"?[{l:"Levered IRR",v:f.leveredIRR?fmtPct(f.leveredIRR*100):"N/A",c:"#8b5cf6"},{l:"Total Debt",v:fmtM(f.totalDebt),c:"#f59e0b"}]:[]),
              ...(w?[{l:"LP IRR",v:w.lpIRR?fmtPct(w.lpIRR*100):"N/A",c:"#8b5cf6"},{l:"LP MOIC",v:w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"N/A",c:"#8b5cf6"}]:[]),
            ].map((k,i) => (
              <div key={i} style={{border:"1px solid #e5e7ec",borderRadius:6,padding:"8px 10px"}}>
                <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{k.l}</div>
                <div style={{fontSize:16,fontWeight:700,color:k.c,marginTop:2}}>{k.v}</div>
              </div>
            ))}
          </div>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>Phase Summary</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#1e3a5f"}}>
              {["Phase","Assets","CAPEX","Income","Net CF","IRR"].map(h=><th key={h} style={{color:"#fff",padding:"5px 6px",textAlign:"left",fontSize:9,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(results.phaseResults).map(([name,pr])=>(
                <tr key={name}>
                  <td style={{padding:"4px 6px",borderBottom:"1px solid #e5e7ec",fontWeight:600}}>{name}</td>
                  <td style={{padding:"4px 6px",borderBottom:"1px solid #e5e7ec",textAlign:"right"}}>{pr.assetCount}</td>
                  <td style={{padding:"4px 6px",borderBottom:"1px solid #e5e7ec",textAlign:"right"}}>{fmt(pr.totalCapex)}</td>
                  <td style={{padding:"4px 6px",borderBottom:"1px solid #e5e7ec",textAlign:"right"}}>{fmt(pr.totalIncome)}</td>
                  <td style={{padding:"4px 6px",borderBottom:"1px solid #e5e7ec",textAlign:"right",color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
                  <td style={{padding:"4px 6px",borderBottom:"1px solid #e5e7ec",textAlign:"right",fontWeight:600}}>{pr.irr?fmtPct(pr.irr*100):"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4,marginTop:18}}>Asset Program ({results.assetSchedules.length} assets)</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead><tr style={{background:"#1e3a5f"}}>
              {["#","Asset","Category","Phase","GFA","CAPEX","Income","Type"].map(h=><th key={h} style={{color:"#fff",padding:"4px 6px",fontSize:9,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {results.assetSchedules.map((a,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#fafbfc"}}>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>{i+1}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>{a.name}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>{a.category}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>{a.phase}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(a.gfa)}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(a.totalCapex)}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right",color:"#16a34a"}}>{fmt(a.totalRevenue)}</td>
                  <td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>{a.revType}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4,marginTop:18}}>Model Integrity</h2>
          <div style={{fontSize:12}}>{failCount === 0 ? "✅ All checks passed" : `⚠️ ${failCount} check(s) failed`}</div>
        </div>
      )}

      {activeReport === "bank" && (
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:24}}>
          <h1 style={{fontSize:20,color:"#1e3a5f",borderBottom:"2px solid #1e3a5f",paddingBottom:6,marginTop:0}}>Bank Submission Pack</h1>
          <div style={{fontSize:11,color:"#6b7080",marginBottom:16}}>{project.name} | {project.location} | {new Date().toLocaleDateString()}</div>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>1. Project Study</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              {[
                ["Project Name",project.name],["Location",project.location],["Land Area",fmt(project.landArea)+" sqm"],
                ["Land Type",project.landType],["Total GFA",fmt(results.assetSchedules.reduce((s,a)=>s+(a.gfa||0),0))+" sqm"],
                ["Number of Assets",results.assetSchedules.length],["Total Development Cost",fmt(c.totalCapex)+" "+cur],
                ["Projected Annual Income (Stabilized)",fmt(c.income[Math.min(10,h-1)])+" "+cur],
              ].map(([k,v],i)=>(
                <tr key={i}><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",color:"#6b7080",width:"40%"}}>{k}</td><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",fontWeight:500}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>2. Financing Request</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:12}}>
            <tbody>
              {[
                ["Requested Facility",fmt(f?.maxDebt||0)+" "+cur],
                ["LTV Ratio",(project.maxLtvPct||70)+"%"],
                ["Proposed Rate",(project.financeRate||6.5)+"% p.a."],
                ["Tenor",(project.loanTenor||7)+" years (incl. "+(project.debtGrace||3)+" grace)"],
                ["Repayment",project.repaymentType==="amortizing"?"Equal Installments":"Bullet"],
                ["Structure",project.islamicMode==="conventional"?"Conventional":project.islamicMode==="murabaha"?"Murabaha":"Ijara"],
              ].map(([k,v],i)=>(
                <tr key={i}><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",color:"#6b7080",width:"40%"}}>{k}</td><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",fontWeight:500}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>3. Sources & Uses</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>Sources</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>Senior Debt</td><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(f?.totalDebt||0)}</td></tr>
                  <tr><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>Equity</td><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(f?.totalEquity||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{padding:"3px 6px",borderTop:"2px solid #1e3a5f"}}>Total Sources</td><td style={{padding:"3px 6px",borderTop:"2px solid #1e3a5f",textAlign:"right"}}>{fmt((f?.totalDebt||0)+(f?.totalEquity||0))}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>Uses</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <tbody>
                  <tr><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>Development CAPEX</td><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(c.totalCapex)}</td></tr>
                  {project.landType==="purchase"&&<tr><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>Land Purchase</td><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(project.landPurchasePrice)}</td></tr>}
                  <tr><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5"}}>Interest During Constr.</td><td style={{padding:"3px 6px",borderBottom:"1px solid #f0f1f5",textAlign:"right"}}>{fmt(f?.totalInterest||0)}</td></tr>
                  <tr style={{fontWeight:700}}><td style={{padding:"3px 6px",borderTop:"2px solid #1e3a5f"}}>Total Uses</td><td style={{padding:"3px 6px",borderTop:"2px solid #1e3a5f",textAlign:"right"}}>{fmt(c.totalCapex+(f?.totalInterest||0))}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>4. 10-Year Cash Flow & DSCR</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:9}}>
            <thead><tr style={{background:"#1e3a5f"}}>
              <th style={{color:"#fff",padding:"4px 5px",textAlign:"left",fontSize:8}}>Item</th>
              {bankYears.map(y=><th key={y} style={{color:"#fff",padding:"4px 5px",textAlign:"right",fontSize:8}}>{sy+y}</th>)}
            </tr></thead>
            <tbody>
              {[
                {l:"Income",v:c.income,cl:"#16a34a"},
                {l:"Land Rent",v:c.landRent,cl:"#ef4444"},
                {l:"NOI",v:bankYears.map(y=>c.income[y]-c.landRent[y]),cl:"#1a1d23",b:true},
                {l:"CAPEX",v:c.capex,cl:"#ef4444"},
                ...(f&&f.mode!=="self"?[
                  {l:"Debt Service",v:f.debtService,cl:"#ef4444"},
                  {l:"Debt Balance",v:f.debtBalClose,cl:"#3b82f6"},
                  {l:"DSCR",v:bankYears.map(y=>f.dscr[y]),cl:"#1a1d23",b:true,isDscr:true},
                ]:[]),
                {l:"Net CF",v:f&&f.mode!=="self"?f.leveredCF:c.netCF,cl:"#1a1d23",b:true},
              ].map((row,ri)=>(
                <tr key={ri} style={row.b?{fontWeight:700,background:"#f8f9fb"}:{}}>
                  <td style={{padding:"3px 5px",borderBottom:"1px solid #f0f1f5",fontSize:9}}>{row.l}</td>
                  {bankYears.map(y=>{
                    const v = Array.isArray(row.v) ? row.v[y] : (row.v?.[y]||0);
                    if (row.isDscr) return <td key={y} style={{padding:"3px 5px",borderBottom:"1px solid #f0f1f5",textAlign:"right",fontSize:9,fontWeight:700,color:v===null?"#9ca3af":v>=1.2?"#16a34a":"#ef4444"}}>{v===null?"—":v.toFixed(2)+"x"}</td>;
                    return <td key={y} style={{padding:"3px 5px",borderBottom:"1px solid #f0f1f5",textAlign:"right",fontSize:9,color:row.cl}}>{v===0?"—":fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === "investor" && (
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",padding:24}}>
          <h1 style={{fontSize:20,color:"#1e3a5f",borderBottom:"2px solid #1e3a5f",paddingBottom:6,marginTop:0}}>Investor Memo - {project.name}</h1>
          <div style={{fontSize:11,color:"#6b7080",marginBottom:16}}>{project.location} | {cur} | {new Date().toLocaleDateString()} | CONFIDENTIAL</div>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>Investment Highlights</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8,marginBottom:16}}>
            {[
              {l:"Target LP IRR",v:w?.lpIRR?fmtPct(w.lpIRR*100):"N/A"},{l:"Target LP MOIC",v:w?.lpMOIC?w.lpMOIC.toFixed(2)+"x":"N/A"},
              {l:"Preferred Return",v:(project.prefReturnPct||15)+"%"},{l:"Exit Timeline",v:w?w.exitYear:"TBD"},
            ].map((k,i) => (
              <div key={i} style={{border:"1px solid #e5e7ec",borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#6b7080",textTransform:"uppercase"}}>{k.l}</div>
                <div style={{fontSize:18,fontWeight:700,color:"#1e3a5f",marginTop:4}}>{k.v}</div>
              </div>
            ))}
          </div>

          <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>Fund Terms</h2>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:16}}>
            <tbody>
              {[
                ["Fund Strategy","Develop & Hold"],["Currency",cur],
                ["GP Equity (Land Contribution)",w?fmt(w.gpEquity)+" "+cur+" ("+fmtPct(w.gpPct*100)+")":"—"],
                ["LP Equity Required",w?fmt(w.lpEquity)+" "+cur+" ("+fmtPct(w.lpPct*100)+")":"—"],
                ["Preferred Return",(project.prefReturnPct||15)+"% p.a. on unreturned capital"],
                ["GP Catch-up",project.gpCatchup?"Yes":"No"],
                ["Carry / Performance Fee",(project.carryPct||30)+"%"],
                ["Profit Split (after catch-up)","LP "+(project.lpProfitSplitPct||70)+"% / GP "+(100-(project.lpProfitSplitPct||70))+"%"],
                ["Subscription Fee",(project.subscriptionFeePct||2)+"%"],
                ["Annual Management Fee",(project.annualMgmtFeePct||0.9)+"%"],
                ["Developer Fee",(project.developerFeePct||10)+"% of CAPEX"],
              ].map(([k,v],i)=>(
                <tr key={i}><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",color:"#6b7080",width:"40%"}}>{k}</td><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",fontWeight:500}}>{v}</td></tr>
              ))}
            </tbody>
          </table>

          {w && <>
            <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>Waterfall Distribution Summary</h2>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[
                {l:"Return of Capital",v:fmtM(w.tier1.reduce((a,b)=>a+b,0)),bg:"#dbeafe"},
                {l:"Preferred Return",v:fmtM(w.tier2.reduce((a,b)=>a+b,0)),bg:"#dcfce7"},
                {l:"GP Catch-up",v:fmtM(w.tier3.reduce((a,b)=>a+b,0)),bg:"#fef3c7"},
                {l:"Profit Split",v:fmtM((w.tier4LP.reduce((a,b)=>a+b,0))+(w.tier4GP.reduce((a,b)=>a+b,0))),bg:"#ede9fe"},
              ].map((t,i)=>(
                <div key={i} style={{flex:1,background:t.bg,borderRadius:6,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:9,fontWeight:600}}>{t.l}</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:3}}>{t.v}</div>
                </div>
              ))}
            </div>

            <h2 style={{fontSize:14,color:"#1e3a5f",borderBottom:"1px solid #ddd",paddingBottom:4}}>Return Analysis</h2>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#1e3a5f"}}>
                <th style={{color:"#fff",padding:"5px 8px",fontSize:10}}>Metric</th>
                <th style={{color:"#fff",padding:"5px 8px",fontSize:10,textAlign:"center"}}>LP (Investor)</th>
                <th style={{color:"#fff",padding:"5px 8px",fontSize:10,textAlign:"center"}}>GP (Sponsor)</th>
                <th style={{color:"#fff",padding:"5px 8px",fontSize:10,textAlign:"center"}}>Project</th>
              </tr></thead>
              <tbody>
                {[
                  ["Net IRR",w.lpIRR?fmtPct(w.lpIRR*100):"—",w.gpIRR?fmtPct(w.gpIRR*100):"—",c.irr?fmtPct(c.irr*100):"—"],
                  ["MOIC",w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—",w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—","—"],
                  ["Total Invested",fmt(w.lpTotalInvested),fmt(w.gpTotalInvested),fmt(c.totalCapex)],
                  ["Total Distributions",fmt(w.lpTotalDist),fmt(w.gpTotalDist),"—"],
                  ["NPV @10%",fmt(w.lpNPV10),fmt(w.gpNPV10),fmt(w.projNPV10)],
                  ["NPV @12%",fmt(w.lpNPV12),fmt(w.gpNPV12),fmt(w.projNPV12)],
                  ["NPV @14%",fmt(w.lpNPV14),fmt(w.gpNPV14),fmt(w.projNPV14)],
                ].map(([metric,...vals],i)=>(
                  <tr key={i}><td style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",fontWeight:600}}>{metric}</td>
                    {vals.map((v,j)=><td key={j} style={{padding:"4px 8px",borderBottom:"1px solid #f0f1f5",textAlign:"center"}}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </>}
        </div>
      )}
    </div>

    {!activeReport && (
      <div style={{textAlign:"center",padding:40,color:"#9ca3af",fontSize:13}}>
        {lang==="ar"?"اختر تقريراً من الأعلى":"Select a report above to preview and print"}
      </div>
    )}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: SCENARIO MANAGER
// ═══════════════════════════════════════════════════════════════

function runScenario(project, overrides) {
  const p = { ...project, ...overrides };
  const r = computeProjectCashFlows(p);
  const ir = computeIncentives(p, r);
  const f = computeFinancing(p, r, ir);
  const w = computeWaterfall(p, r, f);
  return { project: p, results: r, financing: f, waterfall: w };
}

function ScenariosView({ project, results, financing, waterfall, lang }) {
  const [activeSection, setActiveSection] = useState("compare");
  const [sensRow, setSensRow] = useState("rentEscalation");
  const [sensCol, setSensCol] = useState("softCostPct");
  if (!project || !results) return <div style={{color:"#9ca3af"}}>Add assets first.</div>;

  const cur = project.currency || "SAR";
  const c = results.consolidated;

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
    { key: "contingencyPct", label: lang==="ar"?"طوارئ %":"Contingency %", base: project.contingencyPct, steps: [-2, -1, 0, 1, 2] },
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
        row.push({
          irr: s.results.consolidated.irr,
          npv: s.results.consolidated.npv10,
          levIrr: s.financing?.leveredIRR || null,
          rVal: rowParam.base + rStep,
          cVal: colParam.base + cStep,
        });
      }
      table.push(row);
    }
    return table;
  }, [project, sensRow, sensCol]);

  // ── Section 3: Break-even ──
  const breakeven = useMemo(() => {
    const results = {};
    // Break-even occupancy: find occ where NPV=0
    // We adjust all asset occupancy proportionally
    for (let occ = 100; occ >= 0; occ -= 5) {
      const p2 = { ...project, assets: project.assets.map(a => ({ ...a, stabilizedOcc: occ })) };
      const r = computeProjectCashFlows(p2);
      if (r.consolidated.npv10 <= 0) {
        results.occupancy = occ + 5;
        break;
      }
    }
    // Break-even rent reduction: how much can rent drop
    for (let mult = 100; mult >= 0; mult -= 5) {
      const p2 = { ...project, activeScenario: "Custom", customRentMult: mult, customCapexMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (r.consolidated.npv10 <= 0) {
        results.rentDrop = 100 - mult - 5;
        break;
      }
    }
    // Break-even CAPEX increase
    for (let mult = 100; mult <= 200; mult += 5) {
      const p2 = { ...project, activeScenario: "Custom", customCapexMult: mult, customRentMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (r.consolidated.npv10 <= 0) {
        results.capexIncrease = mult - 100 - 5;
        break;
      }
    }
    return results;
  }, [project]);

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
                { label: lang==="ar"?"إجمالي التكاليف":"Total CAPEX", fn: s => s.results.consolidated.totalCapex, fmt: v => fmt(v), color: "#ef4444" },
                { label: lang==="ar"?"إجمالي الإيرادات":"Total Income", fn: s => s.results.consolidated.totalIncome, fmt: v => fmt(v), color: "#16a34a" },
                { label: "Unlevered IRR", fn: s => s.results.consolidated.irr, fmt: v => v !== null ? fmtPct(v*100) : "N/A", color: "#2563eb" },
                { label: "NPV @10%", fn: s => s.results.consolidated.npv10, fmt: v => fmtM(v), color: "#06b6d4" },
                { label: "NPV @12%", fn: s => s.results.consolidated.npv12, fmt: v => fmtM(v) },
                { label: "Levered IRR", fn: s => s.financing?.leveredIRR, fmt: v => v !== null && v !== undefined ? fmtPct(v*100) : "—", color: "#8b5cf6" },
                { label: lang==="ar"?"صافي التدفق":"Total Net CF", fn: s => s.results.consolidated.totalNetCF, fmt: v => fmtM(v) },
                { label: "LP IRR", fn: s => s.waterfall?.lpIRR, fmt: v => v !== null && v !== undefined ? fmtPct(v*100) : "—", color: "#8b5cf6" },
                { label: "LP MOIC", fn: s => s.waterfall?.lpMOIC, fmt: v => v ? v.toFixed(2)+"x" : "—" },
              ].map((metric, mi) => {
                const baseVal = metric.fn(scenarioResults[0]);
                return (
                  <tr key={mi} style={mi%2===0?{}:{background:"#fafbfc"}}>
                    <td style={{...tdSt,position:"sticky",left:0,background:mi%2===0?"#fff":"#fafbfc",zIndex:1,fontWeight:600,fontSize:11}}>{metric.label}</td>
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
              {lang==="ar"?"نقطة تعادل الإشغال":"Occupancy Break-Even"}
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
              {lang==="ar"?"تحمل انخفاض الإيجار":"Rent Drop Tolerance"}
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
              {lang==="ar"?"تحمل زيادة التكاليف":"CAPEX Increase Tolerance"}
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
              <th style={{...thSt,textAlign:"center"}}>{lang==="ar"?"نقطة التعادل":"Break-Even"}</th>
              <th style={{...thSt,textAlign:"center"}}>{lang==="ar"?"القيمة الحالية":"Current Value"}</th>
              <th style={{...thSt,textAlign:"center"}}>{lang==="ar"?"هامش الأمان":"Safety Margin"}</th>
              <th style={{...thSt,textAlign:"center"}}>{lang==="ar"?"التقييم":"Assessment"}</th>
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
                      {r.risk==="low"?(lang==="ar"?"منخفض":"LOW RISK"):r.risk==="med"?(lang==="ar"?"متوسط":"MEDIUM"):lang==="ar"?"مرتفع":"HIGH RISK"}
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

  const ToggleCard = ({ title, titleAr, enabled, onToggle, color, value, children }) => (
    <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${enabled ? color : "#e5e7ec"}`, overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: enabled ? `1px solid ${color}22` : "none", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? color : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 2, left: enabled ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? "#1a1d23" : "#9ca3af" }}>{lang === "ar" ? titleAr : title}</div>
        </div>
        {enabled && value && <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtM(value)}</div>}
      </div>
      {enabled && <div style={{ padding: "12px 16px" }}>{children}</div>}
    </div>
  );

  const F = ({ label, children, hint }) => <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "#6b7080", marginBottom: 3 }}>{label}</div>{children}{hint && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{hint}</div>}</div>;
  const NI = ({ value, onChange }) => <SidebarInput type="number" value={value} onChange={onChange} style={{ background: "#fff", color: "#1a1d23", border: "1px solid #e5e7ec" }} />;

  return (<div>
    {/* Summary KPIs */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
      <KPI label={lang === "ar" ? "إجمالي الحوافز" : "Total Incentives"} value={fmtM(ir?.totalIncentiveValue || 0)} sub={cur} color="#16a34a" />
      <KPI label={lang === "ar" ? "منحة CAPEX" : "CAPEX Grant"} value={fmtM(ir?.capexGrantTotal || 0)} sub={inc.capexGrant?.enabled ? "ON" : "OFF"} color={inc.capexGrant?.enabled ? "#2563eb" : "#9ca3af"} />
      <KPI label={lang === "ar" ? "وفر إيجار الأرض" : "Land Rent Savings"} value={fmtM(ir?.landRentSavingTotal || 0)} sub={inc.landRentRebate?.enabled ? "ON" : "OFF"} color={inc.landRentRebate?.enabled ? "#f59e0b" : "#9ca3af"} />
      <KPI label={lang === "ar" ? "دعم التمويل" : "Finance Support"} value={fmtM(financing?.interestSubsidyTotal || 0)} sub={inc.financeSupport?.enabled ? "ON" : "OFF"} color={inc.financeSupport?.enabled ? "#8b5cf6" : "#9ca3af"} />
      <KPI label={lang === "ar" ? "استرداد رسوم" : "Fee Rebates"} value={fmtM(ir?.feeRebateTotal || 0)} sub={inc.feeRebates?.enabled ? "ON" : "OFF"} color={inc.feeRebates?.enabled ? "#06b6d4" : "#9ca3af"} />
    </div>

    {/* Incentive cards */}
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 1. CAPEX Grant ── */}
      <ToggleCard title="CAPEX Grant (Capital Subsidy)" titleAr="دعم رأسمالي (منحة CAPEX)" enabled={inc.capexGrant?.enabled} onToggle={() => upInc("capexGrant", { enabled: !inc.capexGrant?.enabled })} color="#2563eb" value={ir?.capexGrantTotal}>
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
      <ToggleCard title="Finance Support (Interest Subsidy / Soft Loan)" titleAr="دعم التمويل (تحمل فوائد / قرض حسن)" enabled={inc.financeSupport?.enabled} onToggle={() => upInc("financeSupport", { enabled: !inc.financeSupport?.enabled })} color="#8b5cf6" value={financing?.interestSubsidyTotal}>
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
      <ToggleCard title="Land Rent Rebate (Exemption/Discount)" titleAr="إعفاء/خصم إيجار الأرض" enabled={inc.landRentRebate?.enabled} onToggle={() => upInc("landRentRebate", { enabled: !inc.landRentRebate?.enabled })} color="#f59e0b" value={ir?.landRentSavingTotal}>
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
      <ToggleCard title="Fee/Tax Rebates & Deferrals" titleAr="استرداد/تأجيل رسوم وضرائب" enabled={inc.feeRebates?.enabled} onToggle={() => upInc("feeRebates", { enabled: !inc.feeRebates?.enabled })} color="#06b6d4" value={ir?.feeRebateTotal}>
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

function ChecksView({ checks, t }) {
  const ap = checks.every(c=>c.pass);
  return (<div>
    <div style={{display:"flex",alignItems:"center",marginBottom:14,gap:12}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.modelChecks}</div>
      <span style={{fontSize:11,padding:"3px 10px",borderRadius:4,fontWeight:600,background:ap?"#dcfce7":"#fef2f2",color:ap?"#16a34a":"#ef4444"}}>{ap?t.allPass:t.errorFound}</span>
    </div>
    <div style={{background:"#fff",borderRadius:8,border:"1px solid #e5e7ec",overflow:"hidden"}}>
      <table style={tblStyle}><thead><tr>
        <th style={thSt}>{t.check}</th><th style={{...thSt,width:80,textAlign:"center"}}>{t.status}</th><th style={thSt}>{t.description}</th>
      </tr></thead><tbody>
        {checks.map((c,i)=><tr key={i}>
          <td style={{...tdSt,fontWeight:500}}>{c.name}</td>
          <td style={{...tdSt,textAlign:"center"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:3,fontWeight:600,background:c.pass?"#dcfce7":"#fef2f2",color:c.pass?"#16a34a":"#ef4444"}}>{c.pass?"PASS":"FAIL"}</span></td>
          <td style={{...tdSt,color:"#6b7080"}}>{c.desc}</td>
        </tr>)}
      </tbody></table>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};
const btnPrim={...btnS,background:"#2563eb",color:"#fff",fontWeight:600};
const btnSm={...btnS,padding:"4px 8px",fontSize:11,fontWeight:500,borderRadius:4};
const sideInputStyle={width:"100%",padding:"7px 10px",borderRadius:5,border:"1px solid #282d3a",background:"#161a24",color:"#d0d4dc",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
const cellInputStyle={padding:"4px 6px",borderRadius:3,border:"1px solid transparent",background:"transparent",color:"#1a1d23",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",width:"100%"};
const tblStyle={width:"100%",borderCollapse:"collapse"};
const thSt={padding:"7px 8px",textAlign:"left",fontSize:10,fontWeight:600,color:"#6b7080",background:"#f8f9fb",borderBottom:"1px solid #e5e7ec",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"1px solid #f0f1f5",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};
