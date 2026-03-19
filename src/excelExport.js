// ═══════════════════════════════════════════════════════════════
// RE-DEV MODELER — Professional Excel Export
// Matches ZAN Waterfront file structure & formatting
// ═══════════════════════════════════════════════════════════════
import ExcelJS from "exceljs";

// ── ZAN Color Palette ──
const C = {
  navy:     "FF001E39", // Title bar background
  navyText: "FF001D39", // Large value text
  dark:     "FF1F2937", // Table headers, section titles
  white:    "FFFFFFFF",
  lightGray:"FFF5F5F5", // KPI backgrounds
  greenBg:  "FFF0FDF4", // Section row backgrounds
  blueBg:   "FFEFF6FF", // Alt section rows
  grayText: "FF6B7280", // Secondary text (years, units)
  black:    "FF000000",
  green:    "FF008000", // Cross-sheet reference text
  red:      "FFDC2626", // Negative values
  gold:     "FFFEF3C7", // Highlight cells
};

const FONT_MAIN = "Calibri";
const FONT_AR   = "Arial";

// ── Style Helpers ──
function titleBar(ws, row, colStart, colEnd, text, arText) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = { name: FONT_MAIN, size: 20, bold: true, color: { argb: C.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  // Arabic on the right
  if (arText) {
    const arCell = ws.getCell(row, colEnd);
    arCell.value = arText;
    arCell.font = { name: FONT_AR, size: 18, bold: true, color: { argb: C.white } };
    arCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
    arCell.alignment = { vertical: "middle", horizontal: "right" };
  }
  ws.getRow(row).height = 42;
}

function subtitleBar(ws, row, colStart, colEnd, text) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = { name: FONT_MAIN, size: 10, color: { argb: C.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(row).height = 20;
}

function sectionHeader(ws, row, colStart, colEnd, text) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = { name: FONT_MAIN, size: 12, bold: true, color: { argb: C.navyText } };
  cell.alignment = { vertical: "middle" };
  ws.getRow(row).height = 22;
}

function tableHeader(ws, row, cols) {
  cols.forEach((label, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = label;
    cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: C.dark } },
    };
  });
  ws.getRow(row).height = 20;
}

function groupRow(ws, row, colStart, colEnd, text, bgColor = C.greenBg) {
  for (let c = colStart; c <= colEnd; c++) {
    ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  }
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
  ws.getRow(row).height = 18;
}

function dataRow(ws, row, values, opts = {}) {
  const { bold, indent, numFmt, bgColor, fontColor } = opts;
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    if (v !== null && v !== undefined) cell.value = v;
    cell.font = {
      name: FONT_MAIN, size: 9,
      bold: !!bold,
      color: { argb: fontColor || (typeof v === "number" && v < 0 ? C.red : C.black) },
    };
    if (i === 0 && indent) cell.alignment = { indent: indent };
    if (i > 0) cell.alignment = { ...(cell.alignment || {}), horizontal: "right" };
    if (numFmt) cell.numFmt = typeof numFmt === "string" ? numFmt : (numFmt[i] || "General");
    if (bgColor) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  });
}

function totalRow(ws, row, values, numFmt) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    if (v !== null && v !== undefined) cell.value = v;
    cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.dark } };
    if (i > 0) cell.alignment = { horizontal: "right" };
    cell.border = { top: { style: "thin", color: { argb: C.dark } }, bottom: { style: "double", color: { argb: C.dark } } };
    if (numFmt) cell.numFmt = typeof numFmt === "string" ? numFmt : (numFmt[i] || "General");
  });
  ws.getRow(row).height = 18;
}

function kpiBlock(ws, row, col, label, value, unit, numFmt) {
  const lbl = ws.getCell(row, col);
  lbl.value = label;
  lbl.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
  lbl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
  lbl.alignment = { horizontal: "center", vertical: "center" };

  if (unit) {
    const u = ws.getCell(row, col + 1);
    u.value = unit;
    u.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
    u.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    u.alignment = { horizontal: "center", vertical: "center" };
  }

  const val = ws.getCell(row + 1, col);
  val.value = value;
  val.font = { name: FONT_MAIN, size: 18, bold: true, color: { argb: C.navyText } };
  val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
  val.alignment = { horizontal: "left", vertical: "center" };
  if (numFmt) val.numFmt = numFmt;
}

const fm = v => typeof v === "number" ? Math.round(v) : (v || 0);
const fp = v => typeof v === "number" ? v : 0;

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════
export async function generateProfessionalExcel(project, results, financing, waterfall, incentives, checks) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RE-DEV MODELER";
  wb.created = new Date();

  const h = results?.horizon || 50;
  const sy = results?.startYear || 2026;
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;
  const cur = project.currency || "SAR";
  const pName = project.name || "Project";
  const maxYrs = Math.min(h, 50);
  const yrs = Array.from({ length: maxYrs }, (_, i) => i);

  // ═══ SHEET 1: Dashboard ═══
  buildDashboard(wb, project, results, financing, waterfall, cur, h, sy);

  // ═══ SHEET 2: Inputs ═══
  buildInputs(wb, project, cur);

  // ═══ SHEET 3: Asset Program ═══
  buildAssetProgram(wb, project, results, cur, h);

  // ═══ SHEET 4: Project Cash Flow ═══
  buildProjectCashFlow(wb, results, cur, h, sy, maxYrs, yrs);

  // ═══ SHEET 5: Project Outputs ═══
  buildProjectOutputs(wb, results, cur, h, sy);

  // ═══ SHEET 6: Fund / Financing ═══
  if (f && f.mode !== "self") {
    buildFundSheet(wb, project, results, financing, waterfall, cur, h, sy, maxYrs, yrs);
  }

  // ═══ SHEET 7: Bank Summary ═══
  if (f && f.mode !== "self") {
    buildBankSummary(wb, project, results, financing, cur, h, sy);
  }

  // ═══ SHEET 8: Bank Cash Flow ═══
  if (f && f.mode !== "self") {
    buildBankCashFlow(wb, project, results, financing, waterfall, cur, h, sy);
  }

  // ═══ SHEET 9: Checks ═══
  buildChecks(wb, checks);

  // ═══ SHEET 10: Documentation ═══
  buildDocumentation(wb, project, cur, h, sy);

  // ── Generate & Download ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pName.replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, "_")}_Financial_Model.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// SHEET BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildDashboard(wb, project, results, financing, waterfall, cur, h, sy) {
  const ws = wb.addWorksheet("Dashboard", { properties: { tabColor: { argb: C.navy } } });
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;

  // Column widths matching ZAN
  ws.columns = [
    { width: 2 }, { width: 2.5 }, { width: 30 }, { width: 16 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 3 },
    { width: 30 }, { width: 16 }, { width: 20 }, { width: 20 },
    { width: 16 }, { width: 16 },
  ];

  ws.getRow(1).height = 9;

  // Title bar
  titleBar(ws, 2, 3, 14, project.name?.toUpperCase() || "PROJECT", null);

  // Subtitle
  subtitleBar(ws, 3, 3, 14, `Project Financial Model Dashboard  ●  لوحة النموذج المالي للمشروع`);

  ws.getRow(4).height = 4.5;
  ws.getRow(5).height = 7.5;

  // KPI Row - Labels
  const kpiLabels = [
    [3, `Total CAPEX  إجمالي تكاليف التطوير`, cur],
    [5, `Total Income (${h}yr)  إجمالي الإيرادات`, cur],
    [7, "Consolidated IRR", null],
    [9, "Total GFA  إجمالي المساحة المبنية", "m²"],
    [11, "Plot Area  مساحة الأرض", null],
    [12, `Annual Land Rent  الإيجار السنوي`, cur],
  ];
  kpiLabels.forEach(([col, label, unit]) => {
    kpiBlock(ws, 6, col, label, null, unit);
  });

  // KPI Row - Values
  ws.getRow(7).height = 31.5;
  const kpiVals = [
    [3, fm(c?.totalCapex), "#,##0"],
    [5, fm(c?.totalIncome), "#,##0"],
    [7, fp(c?.irr), "0.00%"],
    [9, fm((results?.assetSchedules || []).reduce((s, a) => s + (a.gfa || 0), 0)), "#,##0"],
    [11, fm(project.landArea || 0), "#,##0"],
    [12, fm(project.landRentAnnual || 0), "#,##0"],
  ];
  kpiVals.forEach(([col, val, nf]) => {
    const cell = ws.getCell(7, col);
    cell.value = val;
    cell.font = { name: FONT_MAIN, size: 18, bold: true, color: { argb: C.navyText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    cell.alignment = { horizontal: "left", vertical: "center" };
    cell.numFmt = nf;
  });

  ws.getRow(8).height = 6;
  ws.getRow(9).height = 18;

  // Section: Phase Summary
  sectionHeader(ws, 10, 3, 8, "◆  Phase Summary");
  const arSec = ws.getCell(10, 13);
  arSec.value = "ملخص المراحل  ◆";
  arSec.font = { name: FONT_AR, size: 12, bold: true, color: { argb: C.navyText } };
  arSec.alignment = { horizontal: "right" };

  let row = 12;
  tableHeader(ws, row, ["", "", "Phase", "Assets", `Total CAPEX (${cur})`, `Year 1 Income`, `Total Income (${h}yr)`, "", "IRR", "NPV @10%", "Land Alloc %", "", "", ""]);
  row++;

  const phases = Object.entries(results?.phaseResults || {});
  phases.forEach(([name, pr]) => {
    dataRow(ws, row, [
      null, null, name, pr.assetCount, fm(pr.totalCapex), fm(pr.income?.[0] || 0),
      fm(pr.totalIncome), null, fp(pr.irr), null, fp(pr.allocPct),
    ], { numFmt: { 4: "#,##0", 5: "#,##0", 6: "#,##0", 8: "0.00%", 10: "0.0%" } });
    row++;
  });

  totalRow(ws, row, [
    null, null, "CONSOLIDATED", (project.assets || []).length, fm(c?.totalCapex),
    fm(c?.income?.[0] || 0), fm(c?.totalIncome), null, fp(c?.irr), fm(c?.npv10),
    1,
  ], { 4: "#,##0", 5: "#,##0", 6: "#,##0", 8: "0.00%", 9: "#,##0", 10: "0.0%" });
  row += 2;

  // Financing KPIs (if applicable)
  if (f && f.mode !== "self") {
    sectionHeader(ws, row, 3, 8, "◆  Financing Summary");
    row += 2;
    const finData = [
      ["Total Equity", fm(f.totalEquity), cur, "Max Debt", fm(f.maxDebt), cur],
      ["GP Equity", fm(f.gpEquity), cur, "Finance Rate", fp(f.rate), "%"],
      ["LP Equity", fm(f.lpEquity), cur, "Tenor", f.tenor, "years"],
      ["Dev Cost (excl. land)", fm(f.devCostExclLand), cur, "Grace Period", f.grace, "years"],
      ["Dev Cost (incl. land)", fm(f.devCostInclLand), cur, "Total Interest", fm(f.totalInterest), cur],
      ["Levered IRR", fp(f.leveredIRR), "", "Upfront Fee", fm(f.upfrontFee), cur],
    ];
    finData.forEach(([l1, v1, u1, l2, v2, u2]) => {
      const c3 = ws.getCell(row, 3); c3.value = l1; c3.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
      const c4 = ws.getCell(row, 4); c4.value = v1; c4.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
      c4.numFmt = typeof v1 === "number" && Math.abs(v1) > 1 ? "#,##0" : "0.00%";
      const c5 = ws.getCell(row, 5); c5.value = u1; c5.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
      if (l2) {
        const c9 = ws.getCell(row, 9); c9.value = l2; c9.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
        const c10 = ws.getCell(row, 10); c10.value = v2; c10.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
        c10.numFmt = typeof v2 === "number" && Math.abs(v2) > 1 ? "#,##0" : "0.00%";
        const c11 = ws.getCell(row, 11); c11.value = u2; c11.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
      }
      row++;
    });
    row += 1;
  }

  // Waterfall KPIs
  if (w) {
    sectionHeader(ws, row, 3, 8, "◆  Investor Returns");
    row += 2;
    tableHeader(ws, row, ["", "", "Metric", "", "LP", "GP", "", "", "Project", "", "", "", "", ""]);
    row++;
    const wData = [
      ["Equity Invested", fm(w.lpEquity), fm(w.gpEquity), fm(w.totalEquity), "#,##0"],
      ["Total Distributions", fm(w.lpTotalDist), fm(w.gpTotalDist), null, "#,##0"],
      ["Net IRR", fp(w.lpIRR), fp(w.gpIRR), fp(w.projIRR), "0.00%"],
      ["MOIC", w.lpMOIC, w.gpMOIC, null, "0.00x"],
      ["DPI", w.lpDPI, w.gpDPI, null, "0.00x"],
      ["NPV @10%", fm(w.lpNPV10), fm(w.gpNPV10), fm(w.projNPV10), "#,##0"],
      ["NPV @12%", fm(w.lpNPV12), fm(w.gpNPV12), fm(w.projNPV12), "#,##0"],
      ["NPV @14%", fm(w.lpNPV14), fm(w.gpNPV14), fm(w.projNPV14), "#,##0"],
    ];
    wData.forEach(([label, lp, gp, proj, nf]) => {
      dataRow(ws, row, [null, null, label, null, lp, gp, null, null, proj], { numFmt: { 4: nf, 5: nf, 8: nf } });
      row++;
    });
  }

  // Footer
  row += 2;
  ws.mergeCells(row, 3, row, 14);
  const footer = ws.getCell(row, 3);
  footer.value = "Confidential  |  " + (project.name || "Project") + "  |  RE-DEV MODELER";
  footer.font = { name: FONT_MAIN, size: 8, italic: true, color: { argb: C.grayText } };
  footer.alignment = { horizontal: "center" };
}

// ═══ INPUTS SHEET ═══
function buildInputs(wb, project, cur) {
  const ws = wb.addWorksheet("1_Inputs", { properties: { tabColor: { argb: "FF3B82F6" } } });
  ws.columns = [{ width: 3 }, { width: 36 }, { width: 22 }, { width: 30 }, { width: 3 }, { width: 22 }];

  titleBar(ws, 2, 2, 6, project.name || "Project");
  subtitleBar(ws, 3, 2, 6, "Model Inputs & Assumptions  ●  مدخلات وافتراضات النموذج");

  let row = 5;
  const section = (label) => { sectionHeader(ws, row, 2, 4, label); row++; };
  const inp = (label, val, arLabel, nf) => {
    ws.getCell(row, 2).value = label;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    const vc = ws.getCell(row, 3);
    vc.value = val;
    vc.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: "FF2563EB" } }; // Blue for inputs
    if (nf) vc.numFmt = nf;
    if (arLabel) {
      ws.getCell(row, 4).value = arLabel;
      ws.getCell(row, 4).font = { name: FONT_AR, size: 10, color: { argb: C.grayText } };
      ws.getCell(row, 4).alignment = { horizontal: "right" };
    }
    row++;
  };

  section("GENERAL ASSUMPTIONS  الافتراضات العامة");
  inp("Model Start Year", project.startYear || 2026, "سنة بداية النموذج");
  inp("Projection Horizon (years)", project.horizon || 50, "أفق النموذج (سنوات)");
  inp("Currency", cur, "العملة");
  inp("Location", project.location || "-", "الموقع");
  inp("Rent Escalation (%)", (project.rentEscalation || 0) / 100, "نسبة زيادة الإيجار السنوية", "0.00%");
  inp("Vacancy Allowance (%)", (project.vacancyPct || 0) / 100, "نسبة الشواغر", "0.0%");
  row++;

  section("LAND PARAMETERS  بيانات الأرض");
  const landLabels = { lease: "Leasehold (إيجار)", purchase: "Freehold (تملك)", partner: "Partner (شريك)", bot: "BOT (بناء-تشغيل-تحويل)" };
  inp("Land Type", landLabels[project.landType] || project.landType || "-", "نوع الأرض");
  inp("Land Area (m²)", project.landArea || 0, "مساحة الأرض", "#,##0");
  if (project.landType === "lease") {
    inp("Annual Land Rent (" + cur + ")", project.landRentAnnual || 0, "الإيجار السنوي", "#,##0");
    inp("Rent Escalation", (project.landRentEscalation || 0) / 100, "نسبة الزيادة", "0.0%");
    inp("Escalation Every N Years", project.landRentEscalationEveryN || 5, "كل N سنة");
    inp("Grace Period (years)", project.landRentGrace || 0, "فترة الإعفاء");
    inp("Lease Term (years)", project.landRentTerm || 50, "مدة الإيجار");
  } else if (project.landType === "purchase") {
    inp("Purchase Price (" + cur + ")", project.landPurchasePrice || 0, "سعر الشراء", "#,##0");
  } else if (project.landType === "partner") {
    inp("Land Valuation (" + cur + ")", project.landValuation || 0, "تقييم الأرض", "#,##0");
    inp("Partner Equity %", (project.partnerEquityPct || 0) / 100, "حصة الشريك", "0%");
  } else if (project.landType === "bot") {
    inp("Operation Period (years)", project.botOperationYears || 0, "فترة التشغيل");
  }
  if (project.landCapitalize) {
    inp("Land Capitalization Rate (" + cur + "/m²)", project.landCapRate || 1000, "معدل رسملة الأرض", "#,##0");
    inp("Land Cap Assigned To", project.landCapTo === "lp" ? "LP (المستثمر)" : project.landCapTo === "split" ? "Split (مقسم)" : "GP (المطور)", "الرسملة تُسند لـ");
  }
  row++;

  section("CAPEX ASSUMPTIONS  افتراضات التكاليف");
  inp("Soft Cost %", (project.softCostPct || 0) / 100, "التكاليف غير المباشرة", "0.0%");
  inp("Contingency %", (project.contingencyPct || 0) / 100, "الاحتياطي", "0.0%");
  row++;

  if (project.finMode && project.finMode !== "self") {
    section("FINANCING PARAMETERS  بيانات التمويل");
    inp("Financing Mode", project.finMode === "fund" ? "Fund (GP/LP)" : project.finMode === "bank" ? "Bank Debt" : project.finMode, "نوع التمويل");
    inp("Debt Allowed", project.debtAllowed ? "Yes" : "No", "الدين مسموح");
    inp("Max LTV %", (project.maxLtvPct || 70) / 100, "نسبة القرض للقيمة", "0%");
    inp("Finance Rate (annual)", (project.financeRate ?? 6.5) / 100, "معدل الربح السنوي", "0.0%");
    inp("Loan Tenor (years)", project.loanTenor || 7, "مدة القرض");
    inp("Grace Period (years)", project.debtGrace ?? 3, "فترة السماح");
    inp("Grace Basis", project.graceBasis === "firstDraw" ? "First Drawdown (أول سحب)" : "COD - Completion (اكتمال البناء)", "بداية السماح");
    inp("Upfront Fee %", (project.upfrontFeePct || 0) / 100, "رسوم التأسيس", "0.0%");
    inp("Repayment Type", project.repaymentType || "amortizing", "نوع السداد");
    inp("Islamic Finance", project.islamicFinance || "conventional", "نوع التمويل الإسلامي");
    row++;

    section("EXIT PARAMETERS  بيانات التخارج");
    inp("Exit Strategy", project.exitStrategy || "sale", "استراتيجية التخارج");
    inp("Exit Year", project.exitYear || "-", "سنة التخارج");
    if (project.exitStrategy === "caprate") {
      inp("Exit Cap Rate %", (project.exitCapRate ?? 9) / 100, "معدل الرسملة", "0.0%");
    } else {
      inp("Exit Multiple (x rent)", project.exitMultiple || 10, "مضاعف الإيجار", "0.0x");
    }
    inp("Exit Cost %", (project.exitCostPct ?? 2) / 100, "تكاليف التخارج", "0.0%");
    row++;

    section("WATERFALL PARAMETERS  شلال التوزيع");
    inp("Preferred Return %", (project.prefReturnPct ?? 15) / 100, "العائد التفضيلي", "0.0%");
    inp("GP Catch-up", project.gpCatchup ? "Yes" : "No", "حق اللحاق");
    inp("Carry %", (project.carryPct ?? 30) / 100, "حصة الأداء", "0.0%");
    inp("LP Profit Split %", (project.lpProfitSplitPct ?? 70) / 100, "حصة المستثمرين من الأرباح", "0%");
    inp("Fee Treatment", project.feeTreatment === "expense" ? "Expense (مصروف)" : "Capital (رأسمال)", "معاملة الرسوم");
    row++;

    section("FEES  الرسوم");
    inp("Subscription Fee %", (project.subscriptionFeePct || 0) / 100, "رسوم الاكتتاب", "0.0%");
    inp("Management Fee %", (project.annualMgmtFeePct || 0) / 100, "رسوم الإدارة السنوية", "0.0%");
    inp("Management Fee Base", project.mgmtFeeBase === "equity" ? "Equity" : "Development Cost", "أساس رسوم الإدارة");
    inp("Custody Fee (annual, fixed)", project.custodyFeeAnnual || 0, "رسوم الحفظ", "#,##0");
    inp("Developer Fee % (CAPEX)", (project.developerFeePct || 0) / 100, "رسوم التطوير", "0.0%");
    inp("Structuring Fee %", (project.structuringFeePct || 0) / 100, "رسوم الهيكلة", "0.0%");
  }
}

// ═══ ASSET PROGRAM SHEET ═══
function buildAssetProgram(wb, project, results, cur, h) {
  const ws = wb.addWorksheet("2_Program", { properties: { tabColor: { argb: "FF10B981" } } });

  const cols = [
    "Phase\nالمرحلة", "Category\nالفئة", "Asset Name\nاسم الأصل", "Code", "Notes",
    "Plot Area\nمساحة القطعة", "Building FP\nبصمة المبنى", "GFA\nالمساحة المبنية",
    "Rev Type\nنوع الإيراد", "Lease Rate\nمعدل الإيجار", "Efficiency\nالكفاءة", "Occupancy\nالإشغال",
    "Sale Price/sqm\nسعر البيع/م²", "Absorption Yrs\nسنوات الاستيعاب",
    "Cost/sqm\nتكلفة/م²", "Constr. Duration\nمدة البناء", "Constr. Start\nبداية البناء",
    "Total CAPEX\nإجمالي التكلفة", `Total Income (${h}yr)\nإجمالي الإيراد`,
  ];

  ws.columns = cols.map((_, i) => ({
    width: [12, 14, 24, 6, 16, 12, 12, 12, 10, 12, 10, 10, 10, 10, 10, 10, 10, 16, 18][i] || 12,
  }));

  const NCOLS = cols.length;

  // Header
  ws.mergeCells(1, 1, 1, NCOLS);
  const title = ws.getCell(1, 1);
  title.value = "Asset Program Table  جدول برنامج الأصول";
  title.font = { name: FONT_MAIN, size: 14, bold: true, color: { argb: C.dark } };
  title.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  // Category headers
  ws.mergeCells(2, 1, 2, 5);
  ws.getCell(2, 1).value = "Asset Identification";
  ws.getCell(2, 1).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
  ws.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
  ws.mergeCells(2, 6, 2, 8);
  ws.getCell(2, 6).value = "Land & Area Metrics";
  ws.getCell(2, 6).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
  ws.getCell(2, 6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0EA5E9" } };
  ws.mergeCells(2, 9, 2, 14);
  ws.getCell(2, 9).value = "Revenue Structure (Lease / Sale)";
  ws.getCell(2, 9).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
  ws.getCell(2, 9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
  ws.mergeCells(2, 15, 2, 17);
  ws.getCell(2, 15).value = "Development Cost & Timeline";
  ws.getCell(2, 15).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
  ws.getCell(2, 15).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
  ws.mergeCells(2, 18, 2, NCOLS);
  ws.getCell(2, 18).value = "Outputs";
  ws.getCell(2, 18).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
  ws.getCell(2, 18).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };

  tableHeader(ws, 3, cols);

  let row = 4;
  let currentPhase = "";
  const assets = results?.assetSchedules || [];

  assets.forEach((a) => {
    // Phase group row
    if (a.phase !== currentPhase) {
      currentPhase = a.phase;
      groupRow(ws, row, 1, NCOLS, a.phase || "Unphased", C.greenBg);
      row++;
    }

    const isSale = a.revType === "Sale";
    dataRow(ws, row, [
      a.phase || "Unphased", a.category, a.name, a.code || "", a.notes || "",
      a.plotArea || 0, a.footprint || 0, a.gfa || 0,
      a.revType, isSale ? null : (a.leaseRate || 0), (a.efficiency || 0) / 100, (a.stabilizedOcc || 0) / 100,
      isSale ? (a.salePricePerSqm || 0) : null, isSale ? (a.absorptionYears || 3) : null,
      a.costPerSqm || 0, a.constrDuration || 0, a.constrStart || 0,
      fm(a.totalCapex), fm(a.totalRevenue),
    ], {
      numFmt: {
        5: "#,##0", 6: "#,##0", 7: "#,##0", 9: "#,##0",
        10: "0%", 11: "0%", 12: "#,##0", 14: "#,##0", 17: "#,##0", 18: "#,##0",
      },
    });
    row++;
  });

  // Totals
  row++;
  totalRow(ws, row, [
    "TOTAL", null, null, null, null,
    assets.reduce((s, a) => s + (a.plotArea || 0), 0),
    assets.reduce((s, a) => s + (a.footprint || 0), 0),
    assets.reduce((s, a) => s + (a.gfa || 0), 0),
    null, null, null, null, null, null, null, null, null,
    fm(results?.consolidated?.totalCapex || 0),
    fm(results?.consolidated?.totalIncome || 0),
  ], { 5: "#,##0", 6: "#,##0", 7: "#,##0", 17: "#,##0", 18: "#,##0" });
}

// ═══ PROJECT CASH FLOW SHEET ═══
function buildProjectCashFlow(wb, results, cur, h, sy, maxYrs, yrs) {
  const ws = wb.addWorksheet("3_Project_CashFlow", { properties: { tabColor: { argb: "FF059669" } } });
  const c = results?.consolidated;
  const phases = results?.phaseResults || {};

  // Column setup: A=Line Item, B=Unit, C=Total, D onwards = years
  const totalCols = 3 + maxYrs;
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 6;
  ws.getColumn(3).width = 18;
  for (let i = 4; i <= totalCols; i++) ws.getColumn(i).width = 14;

  // Title
  ws.mergeCells(2, 2, 2, 8);
  const title = ws.getCell(2, 2);
  title.value = "Unlevered Project Cash Flow  التدفقات النقدية غير الممولة";
  title.font = { name: FONT_MAIN, size: 13, bold: true, color: { argb: C.dark } };

  // Header row
  let row = 4;
  const hdrVals = ["Line Item  البند", "Unit", "Total"];
  yrs.forEach((y) => hdrVals.push(`Year ${y + 1}`));
  tableHeader(ws, row, hdrVals);

  // Year numbers
  row++;
  const yrRow = [null, null, null];
  yrs.forEach((y) => yrRow.push(sy + y));
  yrRow.forEach((v, i) => {
    if (v !== null) {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
      cell.numFmt = "0";
      cell.alignment = { horizontal: "right" };
    }
  });
  row++;

  const NF = "#,##0;(#,##0);\"-\"";

  // Per-phase data
  Object.entries(phases).forEach(([phaseName, pr]) => {
    row++;
    groupRow(ws, row, 1, totalCols, phaseName, C.greenBg);
    row++;

    // Income
    const incRow = ["  Income  الإيرادات", cur, fm(pr.totalIncome)];
    yrs.forEach(y => incRow.push(fm(pr.income[y])));
    dataRow(ws, row, incRow, { indent: 1, numFmt: NF });
    row++;

    // Land Rent
    const lrRow = ["  Land Rent  إيجار الأرض", cur, fm(-pr.totalLandRent)];
    yrs.forEach(y => lrRow.push(fm(-pr.landRent[y])));
    dataRow(ws, row, lrRow, { indent: 1, numFmt: NF });
    row++;

    // CAPEX
    const cxRow = ["  Development CAPEX  تكاليف التطوير", cur, fm(-pr.totalCapex)];
    yrs.forEach(y => cxRow.push(fm(-pr.capex[y])));
    dataRow(ws, row, cxRow, { indent: 1, numFmt: NF });
    row++;

    // Net CF
    const nRow = ["  Net CF  صافي التدفق", cur, fm(pr.totalNetCF)];
    yrs.forEach(y => nRow.push(fm(pr.netCF[y])));
    dataRow(ws, row, nRow, { bold: true, numFmt: NF });
    // Bottom border
    for (let ci = 1; ci <= totalCols; ci++) {
      ws.getCell(row, ci).border = { bottom: { style: "thin", color: { argb: C.grayText } } };
    }
    row++;
  });

  // Consolidated
  row += 1;
  groupRow(ws, row, 1, totalCols, "CONSOLIDATED  الإجمالي الموحد", "FFE0E7FF");
  row++;

  const consData = [
    ["Income  الإيرادات", c?.totalIncome, c?.income],
    ["Land Rent  إيجار الأرض", -(c?.totalLandRent || 0), c?.landRent?.map(v => -v)],
    ["Development CAPEX  تكاليف التطوير", -(c?.totalCapex || 0), c?.capex?.map(v => -v)],
  ];
  consData.forEach(([label, total, arr]) => {
    const r = [label, cur, fm(total)];
    yrs.forEach(y => r.push(fm(arr?.[y] || 0)));
    dataRow(ws, row, r, { indent: 1, numFmt: NF });
    row++;
  });

  // Net CF (bold)
  const netR = ["Net Project CF (Unlevered)  صافي التدفق النقدي", cur, fm(c?.totalNetCF)];
  yrs.forEach(y => netR.push(fm(c?.netCF?.[y] || 0)));
  totalRow(ws, row, netR, NF);
  row++;

  // Cumulative
  let cumCF = 0;
  const cumR = ["Cumulative Net CF  التراكمي", cur, null];
  yrs.forEach(y => { cumCF += (c?.netCF?.[y] || 0); cumR.push(fm(cumCF)); });
  dataRow(ws, row, cumR, { numFmt: NF, fontColor: C.grayText });
  row += 2;

  // IRR / NPV
  sectionHeader(ws, row, 1, 4, "◆  Return Metrics  مؤشرات العائد");
  row++;
  dataRow(ws, row, ["Unlevered IRR  العائد الداخلي", "", fp(c?.irr)], { bold: true, numFmt: { 2: "0.00%" } });
  row++;
  dataRow(ws, row, ["NPV @10%", cur, fm(c?.npv10)], { numFmt: { 2: "#,##0" } });
  row++;
  dataRow(ws, row, ["NPV @12%", cur, fm(c?.npv12)], { numFmt: { 2: "#,##0" } });
  row++;
  dataRow(ws, row, ["NPV @14%", cur, fm(c?.npv14)], { numFmt: { 2: "#,##0" } });
}

// ═══ PROJECT OUTPUTS SHEET ═══
function buildProjectOutputs(wb, results, cur, h, sy) {
  const ws = wb.addWorksheet("4_Project_Outputs", { properties: { tabColor: { argb: "FF8B5CF6" } } });
  ws.columns = [{ width: 3 }, { width: 20 }, { width: 18 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 16 }];

  ws.mergeCells(2, 2, 2, 8);
  const title = ws.getCell(2, 2);
  title.value = "Project Outputs Summary  ملخص مخرجات المشروع";
  title.font = { name: FONT_MAIN, size: 14, bold: true, color: { argb: C.dark } };

  let row = 4;
  sectionHeader(ws, row, 2, 8, "SUMMARY BY PHASE  ملخص حسب المرحلة");
  row++;
  tableHeader(ws, row, [null, "Phase  المرحلة", `Total CAPEX (${cur})`, "Year 1 Rent", `Year ${h} Rent`, `Total Rent (${h}yr)`, "IRR"]);
  row++;

  const c = results?.consolidated;
  const NF = "#,##0";
  Object.entries(results?.phaseResults || {}).forEach(([name, pr]) => {
    dataRow(ws, row, [
      null, name, fm(pr.totalCapex), fm(pr.income?.[0] || 0),
      fm(pr.income?.[h - 1] || 0), fm(pr.totalIncome), fp(pr.irr),
    ], { numFmt: { 2: NF, 3: NF, 4: NF, 5: NF, 6: "0.00%" } });
    row++;
  });

  totalRow(ws, row, [
    null, "CONSOLIDATED", fm(c?.totalCapex), fm(c?.income?.[0] || 0),
    fm(c?.income?.[h - 1] || 0), fm(c?.totalIncome), fp(c?.irr),
  ], { 2: NF, 3: NF, 4: NF, 5: NF, 6: "0.00%" });
  row += 3;

  // NPV Table
  sectionHeader(ws, row, 2, 8, "NPV ANALYSIS  تحليل صافي القيمة الحالية");
  row++;
  tableHeader(ws, row, [null, "Discount Rate", "Project NPV", "", "", "", ""]);
  row++;
  [[10, c?.npv10], [12, c?.npv12], [14, c?.npv14]].forEach(([r, v]) => {
    dataRow(ws, row, [null, r / 100, fm(v)], { numFmt: { 1: "0%", 2: NF } });
    row++;
  });
}

// ═══ FUND SHEET (matches Fund_ZAN structure) ═══
function buildFundSheet(wb, project, results, financing, waterfall, cur, h, sy, maxYrs, yrs) {
  const ws = wb.addWorksheet("Fund_Model", { properties: { tabColor: { argb: "FFD97706" } } });
  const f = financing;
  const w = waterfall;
  const c = results?.consolidated;

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 46;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 18;
  for (let i = 5; i <= 4 + maxYrs; i++) ws.getColumn(i).width = 14;

  let row = 3;
  const NF = "#,##0;(#,##0);\"-\"";

  // ── Section 1: Fund Information ──
  sectionHeader(ws, row, 1, 10, "1  معلومات الصندوق  FUND INFORMATION");
  row++;
  const info = [
    ["Fund Name  اسم الصندوق", project.name || "Development Fund"],
    ["Vehicle Type  نوع الأداة", project.finMode === "fund" ? "Fund" : "SPV"],
    ["Strategy  الاستراتيجية", "Develop & Hold"],
    ["Currency  العملة", cur],
    ["Fund Start Year  سنة بداية الصندوق", sy],
  ];
  info.forEach(([l, v]) => {
    ws.getCell(row, 2).value = l;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    ws.getCell(row, 3).value = v;
    ws.getCell(row, 3).font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: "FF2563EB" } };
    row++;
  });

  // ── Section 2: Capital Structure ──
  row++;
  sectionHeader(ws, row, 1, 10, "2  هيكل رأس المال  CAPITAL STRUCTURE");
  row++;
  const capStruct = [
    ["GP Equity  حقوق المطور", fm(f.gpEquity), "#,##0"],
    ["LP Equity  حقوق المستثمرين", fm(f.lpEquity), "#,##0"],
    ["Total Equity  إجمالي رأس المال", fm(f.totalEquity), "#,##0"],
    ["Sponsor %", fp(f.gpPct), "0.0%"],
    ["LP %", fp(f.lpPct), "0.0%"],
    ["Dev Cost Excl Land  تكلفة التطوير بدون الأرض", fm(f.devCostExclLand), "#,##0"],
    ["Dev Cost Incl Land  تكلفة التطوير مع الأرض", fm(f.devCostInclLand), "#,##0"],
  ];
  capStruct.forEach(([l, v, nf]) => {
    ws.getCell(row, 2).value = l;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    const vc = ws.getCell(row, 3);
    vc.value = v;
    vc.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
    vc.numFmt = nf;
    row++;
  });

  // ── Section 3: Debt ──
  row++;
  sectionHeader(ws, row, 1, 10, "3  الدين  DEBT");
  row++;
  const debtInfo = [
    ["Debt Allowed  هل الدين مسموح", project.debtAllowed ? "Y" : "N"],
    ["Max Debt (" + cur + ")  سقف الدين", fm(f.maxDebt), "#,##0"],
    ["Annual Financing Rate  معدل الربح السنوي", fp(f.rate), "0.0%"],
    ["Total Loan Tenor  إجمالي مدة القرض", f.tenor, null],
    ["Upfront Fee %  رسوم التأسيس", fp((project.upfrontFeePct || 0) / 100), "0.0%"],
    ["Grace Period  فترة السماح", f.grace, null],
  ];
  debtInfo.forEach(([l, v, nf]) => {
    ws.getCell(row, 2).value = l;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    const vc = ws.getCell(row, 3);
    vc.value = v;
    vc.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
    if (nf) vc.numFmt = nf;
    row++;
  });

  // ── Section 4: Fees ──
  if (w) {
    row++;
    sectionHeader(ws, row, 1, 10, "4  الرسوم  FEES");
    row++;
    const feesInfo = [
      ["Subscription Fee  رسوم الاكتتاب", (project.subscriptionFee || 0) / 100, "0.0%"],
      ["Annual Management Fee  رسوم الإدارة", (project.mgmtFee || 0) / 100, "0.0%"],
      ["Custody Fee (Fixed)  رسوم الحفظ", project.custodyFee || 0, "#,##0"],
      ["Developer Fee % (CAPEX)  رسوم التطوير", (project.devFee || 0) / 100, "0.0%"],
      ["Structuring Fee  رسوم الهيكلة", (project.structFee || 0) / 100, "0.0%"],
    ];
    feesInfo.forEach(([l, v, nf]) => {
      ws.getCell(row, 2).value = l;
      ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
      const vc = ws.getCell(row, 3);
      vc.value = v;
      vc.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
      vc.numFmt = nf;
      row++;
    });

    // ── Section 5: Waterfall ──
    row++;
    sectionHeader(ws, row, 1, 10, "5  شلال التوزيع  WATERFALL");
    row++;
    ws.getCell(row, 2).value = "Preferred Return %  العائد التفضيلي";
    ws.getCell(row, 3).value = (project.prefReturn || 15) / 100;
    ws.getCell(row, 3).numFmt = "0.0%";
    row++;
    ws.getCell(row, 2).value = "GP Catch-up  حق اللحاق";
    ws.getCell(row, 3).value = project.gpCatchup ? "Y" : "N";
    row++;
    ws.getCell(row, 2).value = "Carry %  حصة الأداء";
    ws.getCell(row, 3).value = (project.carryPct || 30) / 100;
    ws.getCell(row, 3).numFmt = "0.0%";
    row++;

    // ── Section 6: Exit ──
    row++;
    sectionHeader(ws, row, 1, 10, "6  التخارج  EXIT");
    row++;
    ws.getCell(row, 2).value = "Exit Year  سنة التخارج";
    ws.getCell(row, 3).value = f.exitYear;
    row++;
    ws.getCell(row, 2).value = "Exit Multiple (x rent)  مضاعف الإيجار";
    ws.getCell(row, 3).value = project.exitMultiple || 10;
    row++;
    ws.getCell(row, 2).value = "Exit Cost %  تكاليف التخارج";
    ws.getCell(row, 3).value = (project.exitCostPct || 2) / 100;
    ws.getCell(row, 3).numFmt = "0.0%";
  }

  // ── Section 7: Project Cash Flows ──
  row += 2;
  sectionHeader(ws, row, 1, 10, "7  تدفقات المشروع  PROJECT CASH FLOWS (Unlevered)");
  row++;

  // Year header
  const yrHdr = [null, null, "Unit", "Total"];
  yrs.forEach(y => yrHdr.push(sy + y));
  yrHdr.forEach((v, i) => {
    if (v !== null) {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
      cell.alignment = { horizontal: "right" };
      if (typeof v === "number") cell.numFmt = "0";
    }
  });
  row++;

  const cfRows = [
    ["Rental Income  إيرادات الإيجار", c?.totalIncome, c?.income],
    ["Land Rent  إيجار الأرض", -(c?.totalLandRent || 0), c?.landRent?.map(v => -v)],
    ["Development CAPEX  تكاليف التطوير", -(c?.totalCapex || 0), c?.capex?.map(v => -v)],
    ["Net Project CF (Unlevered)  صافي التدفق", c?.totalNetCF, c?.netCF],
  ];
  cfRows.forEach(([label, total, arr], idx) => {
    const r = [null, label, cur, fm(total)];
    yrs.forEach(y => r.push(fm(arr?.[y] || 0)));
    const isBold = idx === cfRows.length - 1;
    dataRow(ws, row, r, { bold: isBold, numFmt: NF });
    if (isBold) {
      for (let ci = 1; ci <= 4 + maxYrs; ci++) {
        ws.getCell(row, ci).border = { top: { style: "thin", color: { argb: C.dark } } };
      }
    }
    row++;
  });

  // ── Section 8: Fund Cash Flow (Levered) ──
  if (f && f.mode !== "self") {
    row += 1;
    sectionHeader(ws, row, 1, 10, "8  تدفقات الصندوق  FUND CASH FLOW (Levered)");
    row++;

    // Re-draw year header
    yrHdr.forEach((v, i) => {
      if (v !== null) {
        const cell = ws.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
        cell.alignment = { horizontal: "right" };
        if (typeof v === "number") cell.numFmt = "0";
      }
    });
    row++;

    const fundRows = [
      ["Equity Calls  سحب رأس المال", f.equityCalls?.reduce((a, b) => a + b, 0), f.equityCalls],
      ["Debt Drawdown  سحب القرض", f.drawdown?.reduce((a, b) => a + b, 0), f.drawdown],
      ["Debt Balance (Open)  رصيد الدين (بداية)", null, f.debtBalOpen],
      ["Debt Repayment  سداد أصل الدين", -(f.repayment?.reduce((a, b) => a + b, 0) || 0), f.repayment?.map(v => -v)],
      ["Debt Balance (Close)  رصيد الدين (نهاية)", null, f.debtBalClose],
      ["Interest/Profit  تكلفة التمويل", -f.totalInterest, f.interest?.map(v => -v)],
      ["Total Debt Service  إجمالي خدمة الدين", -(f.debtService?.reduce((a, b) => a + b, 0) || 0), f.debtService?.map(v => -v)],
    ];
    fundRows.forEach(([label, total, arr]) => {
      const r = [null, label, cur, total !== null ? fm(total) : null];
      yrs.forEach(y => r.push(fm(arr?.[y] || 0)));
      dataRow(ws, row, r, { numFmt: NF });
      row++;
    });

    // Fees
    if (w) {
      row++;
      const feeRows = [
        ["Subscription Fee  رسوم الاكتتاب", w.feeSub],
        ["Management Fee  رسوم الإدارة", w.feeMgmt],
        ["Custody Fee  رسوم الحفظ", w.feeCustody],
        ["Developer Fee  رسوم التطوير", w.feeDev],
        ["Structuring Fee  رسوم الهيكلة", w.feeStruct],
        ["Pre-Establishment  ما قبل التأسيس", w.feePreEst],
        ["SPV Setup  إنشاء SPV", w.feeSpv],
        ["Auditor Fee  مراجع الحسابات", w.feeAuditor],
        ["Total Fees  إجمالي الرسوم", w.totalFees],
      ];
      feeRows.forEach(([label, total]) => {
        const r = [null, label, cur, fm(total)];
        // Fees don't have annual arrays in the current model, just totals
        dataRow(ws, row, r, { numFmt: NF });
        row++;
      });

      // Exit
      row++;
      const exitR = [null, "Exit Proceeds  حصيلة التخارج", cur, fm(f.exitProceeds?.reduce((a, b) => a + b, 0))];
      yrs.forEach(y => exitR.push(fm(f.exitProceeds?.[y] || 0)));
      dataRow(ws, row, exitR, { bold: true, numFmt: NF });
      row++;
    }
  }

  // ── Section 9: Distributions & Waterfall ──
  if (w) {
    row += 1;
    sectionHeader(ws, row, 1, 10, "9  التوزيعات وشلال الأرباح  DISTRIBUTIONS & WATERFALL");
    row++;

    yrHdr.forEach((v, i) => {
      if (v !== null) {
        const cell = ws.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
        cell.alignment = { horizontal: "right" };
        if (typeof v === "number") cell.numFmt = "0";
      }
    });
    row++;

    const distRows = [
      ["Cash Available for Distribution  النقد المتاح", w.cashAvail?.reduce((a, b) => a + b, 0), w.cashAvail, false],
      [null, null, null, false], // blank
      ["Unreturned Capital (Open)  رأس المال غير المسترد", null, w.unreturnedOpen, false],
      ["Tier 1: Return of Capital  رد رأس المال", w.tier1?.reduce((a, b) => a + b, 0), w.tier1, false],
      ["Unreturned Capital (Close)", null, w.unreturnedClose, false],
      [null, null, null, false],
      ["Pref Accrual  احتساب العائد التفضيلي", w.prefAccrual?.reduce((a, b) => a + b, 0), w.prefAccrual, false],
      ["Tier 2: Preferred Return Paid  سداد العائد التفضيلي", w.tier2?.reduce((a, b) => a + b, 0), w.tier2, false],
      [null, null, null, false],
      ["Remaining After ROC + Pref", null, null, false],
      ["Tier 3: GP Catch-up", w.tier3?.reduce((a, b) => a + b, 0), w.tier3, false],
      ["Tier 4: Profit Split  تقسيم الأرباح", null, null, false],
      ["  → LP  حصة المستثمرين", w.tier4LP?.reduce((a, b) => a + b, 0), w.tier4LP, false],
      ["  → GP / Carry  حصة الأداء", w.tier4GP?.reduce((a, b) => a + b, 0), w.tier4GP, false],
      [null, null, null, false],
      ["Total Distribution to LP  إجمالي التوزيعات للمستثمرين", w.lpTotalDist, w.lpDist, true],
      ["Total Distribution to GP  إجمالي التوزيعات للمطور", w.gpTotalDist, w.gpDist, true],
      ["Total Distributions  إجمالي التوزيعات", (w.lpTotalDist || 0) + (w.gpTotalDist || 0), null, true],
    ];

    distRows.forEach(([label, total, arr, bold]) => {
      if (!label) { row++; return; }
      const r = [null, label, cur, total !== null ? fm(total) : null];
      if (arr) yrs.forEach(y => r.push(fm(arr[y] || 0)));
      dataRow(ws, row, r, { bold, numFmt: NF, indent: label.startsWith("  ") ? 2 : 0 });
      row++;
    });

    // ── Section 10: Investor Returns ──
    row += 1;
    sectionHeader(ws, row, 1, 10, "10  عوائد المستثمر  INVESTOR RETURNS");
    row++;

    yrHdr.forEach((v, i) => {
      if (v !== null) {
        const cell = ws.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
        cell.alignment = { horizontal: "right" };
        if (typeof v === "number") cell.numFmt = "0";
      }
    });
    row++;

    const retRows = [
      ["LP Net Cash Flow", w.lpNetCF?.reduce((a, b) => a + b, 0), w.lpNetCF, false],
      ["GP Net Cash Flow", w.gpNetCF?.reduce((a, b) => a + b, 0), w.gpNetCF, false],
    ];
    retRows.forEach(([label, total, arr, bold]) => {
      const r = [null, label, cur, fm(total)];
      if (arr) yrs.forEach(y => r.push(fm(arr[y] || 0)));
      dataRow(ws, row, r, { bold, numFmt: NF });
      row++;
    });

    // Summary table
    row += 2;
    const sumHdr = [null, "Returns Summary", "", "LP", "GP", "Project"];
    sumHdr.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    });
    row++;

    const sumRows = [
      ["Net IRR", fp(w.lpIRR), fp(w.gpIRR), fp(w.projIRR), "0.00%"],
      ["MOIC", w.lpMOIC, w.gpMOIC, null, "0.00x"],
      ["DPI", w.lpDPI, w.gpDPI, null, "0.00x"],
      ["NPV @10%", fm(w.lpNPV10), fm(w.gpNPV10), fm(w.projNPV10), "#,##0"],
      ["NPV @12%", fm(w.lpNPV12), fm(w.gpNPV12), fm(w.projNPV12), "#,##0"],
      ["NPV @14%", fm(w.lpNPV14), fm(w.gpNPV14), fm(w.projNPV14), "#,##0"],
    ];
    sumRows.forEach(([label, lp, gp, proj, nf]) => {
      dataRow(ws, row, [null, label, null, lp, gp, proj], { numFmt: { 3: nf, 4: nf, 5: nf } });
      row++;
    });
  }
}

// ═══ BANK SUMMARY SHEET ═══
function buildBankSummary(wb, project, results, financing, cur, h, sy) {
  const ws = wb.addWorksheet("Bank_Summary", { properties: { tabColor: { argb: "FFDC2626" } } });
  ws.columns = [{ width: 3 }, { width: 32 }, { width: 8 }, { width: 30 }, { width: 14 }];
  const f = financing;
  const c = results?.consolidated;

  titleBar(ws, 2, 2, 5, (project.name || "PROJECT").toUpperCase());
  subtitleBar(ws, 3, 2, 5, "Bank Financing Summary  |  ملخص طلب التمويل البنكي");

  let row = 5;
  sectionHeader(ws, row, 2, 5, "1. PROJECT SNAPSHOT  لمحة عن المشروع");
  row++;
  const snap = [
    ["Project Name  اسم المشروع", project.name || "-"],
    ["Location  الموقع", project.location || "-"],
    ["Land Tenure  نوع الحيازة", project.landType === "lease" ? `Municipal leasehold (${project.landRentTerm || 50} years)` : "Freehold"],
    ["Site Area (m²)  مساحة الأرض", project.landArea || 0],
    ["Total GFA (m²)  المساحة المبنية", (results?.assetSchedules || []).reduce((s, a) => s + (a.gfa || 0), 0)],
    ["Total CAPEX (" + cur + ")  إجمالي التكلفة", fm(c?.totalCapex)],
    ["Annual Land Rent (" + cur + ")  الإيجار السنوي", project.landRentAnnual || 0],
    ["Lease Term  مدة العقد", (project.landRentTerm || 50) + " years"],
  ];
  snap.forEach(([l, v]) => {
    ws.getCell(row, 2).value = l;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    const vc = ws.getCell(row, 4);
    vc.value = v;
    vc.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
    if (typeof v === "number") vc.numFmt = "#,##0";
    row++;
  });

  row++;
  sectionHeader(ws, row, 2, 5, "2. FINANCING REQUEST  طلب التمويل");
  row++;
  const finReq = [
    ["Facility Type  نوع التمويل", project.islamicFinance === "murabaha" ? "Murabaha" : project.islamicFinance === "ijara" ? "Ijara" : "Term Loan / Project Financing"],
    ["Amount Requested (" + cur + ")  المبلغ المطلوب", fm(f.maxDebt)],
    ["Profit Rate (All-in)  معدل الربح", fp(f.rate)],
    ["Tenor  المدة", f.tenor + " years"],
    ["Grace Period  فترة السماح", f.grace + " years"],
    ["Grace Basis  بداية السماح", project.graceBasis === "firstDraw" ? "From First Drawdown" : "From Completion (COD)"],
    ["Amortization  نوع السداد", project.repaymentType === "bullet" ? "Bullet" : "Equal principal + profit"],
    ["Upfront Fee  رسوم التأسيس", fp((project.upfrontFeePct || 0) / 100)],
    ["Repayment Source  مصدر السداد", "Project operating cash flows"],
  ];
  finReq.forEach(([l, v]) => {
    ws.getCell(row, 2).value = l;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    const vc = ws.getCell(row, 4);
    vc.value = v;
    vc.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.dark } };
    if (typeof v === "number" && v > 1) vc.numFmt = "#,##0";
    else if (typeof v === "number") vc.numFmt = "0.0%";
    row++;
  });

  // Sources & Uses
  row++;
  sectionHeader(ws, row, 2, 5, "3. SOURCES & USES  المصادر والاستخدامات");
  row++;
  tableHeader(ws, row, [null, "Sources  المصادر", null, cur, "%"]);
  row++;
  const totalSources = f.totalEquity + f.maxDebt;
  dataRow(ws, row, [null, "Sponsor Equity  رأس مال المطور", null, fm(f.totalEquity), totalSources > 0 ? f.totalEquity / totalSources : 0], { numFmt: { 3: "#,##0", 4: "0%" } });
  row++;
  dataRow(ws, row, [null, "Bank Financing  التمويل البنكي", null, fm(f.maxDebt), totalSources > 0 ? f.maxDebt / totalSources : 0], { numFmt: { 3: "#,##0", 4: "0%" } });
  row++;
  totalRow(ws, row, [null, "Total Sources  إجمالي المصادر", null, fm(totalSources), 1], { 3: "#,##0", 4: "0%" });
  row += 2;

  tableHeader(ws, row, [null, "Uses  الاستخدامات", null, cur, "%"]);
  row++;
  dataRow(ws, row, [null, "Construction CAPEX  تكاليف البناء", null, fm(c?.totalCapex), totalSources > 0 ? (c?.totalCapex || 0) / totalSources : 0], { numFmt: { 3: "#,##0", 4: "0.0%" } });
  row++;
  const landCost = f.landCapValue || 0;
  dataRow(ws, row, [null, "Land Cost (Allocated)  تكلفة الأرض", null, fm(landCost), totalSources > 0 ? landCost / totalSources : 0], { numFmt: { 3: "#,##0", 4: "0.0%" } });
  row++;
  const fees = totalSources - (c?.totalCapex || 0) - landCost;
  dataRow(ws, row, [null, "Fees & Structuring  الرسوم والهيكلة", null, fm(Math.max(0, fees)), totalSources > 0 ? Math.max(0, fees) / totalSources : 0], { numFmt: { 3: "#,##0", 4: "0.0%" } });
  row++;
  totalRow(ws, row, [null, "Total Uses  إجمالي الاستخدامات", null, fm(totalSources), 1], { 3: "#,##0", 4: "0%" });

  // Footer
  row += 3;
  ws.mergeCells(row, 2, row, 5);
  const footer = ws.getCell(row, 2);
  footer.value = "Confidential  |  " + (project.name || "Project") + "  |  Bank Pack";
  footer.font = { name: FONT_MAIN, size: 8, italic: true, color: { argb: C.grayText } };
  footer.alignment = { horizontal: "center" };
}

// ═══ BANK CASH FLOW SHEET ═══
function buildBankCashFlow(wb, project, results, financing, waterfall, cur, h, sy) {
  const ws = wb.addWorksheet("Bank_CashFlow", { properties: { tabColor: { argb: "FFDC2626" } } });
  const f = financing;
  const c = results?.consolidated;
  const bankHorizon = Math.min(10, h); // Bank typically wants 10 years
  const bankYrs = Array.from({ length: bankHorizon }, (_, i) => i);

  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 38;
  ws.getColumn(3).width = 18;
  for (let i = 4; i <= 3 + bankHorizon; i++) ws.getColumn(i).width = 15;

  titleBar(ws, 2, 2, 3 + bankHorizon, `${(project.name || "PROJECT").toUpperCase()}  |  Cash Flow (${sy}–${sy + bankHorizon - 1})`);
  subtitleBar(ws, 3, 2, 3 + bankHorizon, `التدفقات النقدية  |  ${cur}`);

  let row = 5;
  const NF = "#,##0;(#,##0);\"-\"";

  // Year header
  const yrHdr = [null, cur, "Total"];
  bankYrs.forEach(y => yrHdr.push(sy + y));
  yrHdr.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    cell.alignment = { horizontal: "right" };
    if (typeof v === "number") cell.numFmt = "0";
  });
  row += 2;

  // Section A: Unlevered
  sectionHeader(ws, row, 2, 5, "A. PROJECT CASH FLOW (UNLEVERED)");
  row++;

  const sumN = (arr, n) => (arr || []).slice(0, n).reduce((a, b) => a + b, 0);

  const unlevRows = [
    ["Rental Income  إيرادات الإيجار", sumN(c?.income, bankHorizon), c?.income, false],
    ["Ground Rent  إيجار الأرض", -sumN(c?.landRent, bankHorizon), c?.landRent?.map(v => -v), false],
    ["NOI", sumN(c?.income, bankHorizon) - sumN(c?.landRent, bankHorizon), c?.income?.map((v, i) => v - (c?.landRent?.[i] || 0)), false],
    ["Development CAPEX  تكاليف التطوير", -sumN(c?.capex, bankHorizon), c?.capex?.map(v => -v), false],
    ["Net Project CF (Unlevered)  صافي التدفق", sumN(c?.netCF, bankHorizon), c?.netCF, true],
  ];

  let cumCF = 0;
  unlevRows.forEach(([label, total, arr, bold]) => {
    const r = [null, label, fm(total)];
    bankYrs.forEach(y => r.push(fm(arr?.[y] || 0)));
    dataRow(ws, row, r, { bold, numFmt: NF });
    row++;
  });

  // Cumulative
  const cumR = [null, "Cumulative Net CF  التراكمي", null];
  cumCF = 0;
  bankYrs.forEach(y => { cumCF += (c?.netCF?.[y] || 0); cumR.push(fm(cumCF)); });
  dataRow(ws, row, cumR, { numFmt: NF, fontColor: C.grayText });
  row += 2;

  // Section B: Levered
  sectionHeader(ws, row, 2, 5, "B. FINANCING CASH FLOW (LEVERED)");
  row++;

  const levRows = [
    ["Net Project CF (Unlevered)", sumN(c?.netCF, bankHorizon), c?.netCF, false],
    ["Equity Contribution  مساهمة رأس المال", sumN(f?.equityCalls, bankHorizon), f?.equityCalls, false],
    ["Debt Drawdown  سحب القرض", sumN(f?.drawdown, bankHorizon), f?.drawdown, false],
    ["Debt Repayment (Principal)  سداد الأصل", -sumN(f?.repayment, bankHorizon), f?.repayment?.map(v => -v), false],
    ["Interest / Profit  تكلفة التمويل", -sumN(f?.interest, bankHorizon), f?.interest?.map(v => -v), false],
    ["Total Debt Service  إجمالي خدمة الدين", -sumN(f?.debtService, bankHorizon), f?.debtService?.map(v => -v), true],
    ["Debt Balance (Closing)  رصيد الدين", null, f?.debtBalClose, false],
    ["Exit Proceeds  حصيلة التخارج", sumN(f?.exitProceeds, bankHorizon), f?.exitProceeds, false],
  ];

  levRows.forEach(([label, total, arr, bold]) => {
    const r = [null, label, total !== null ? fm(total) : null];
    bankYrs.forEach(y => r.push(fm(arr?.[y] || 0)));
    dataRow(ws, row, r, { bold, numFmt: NF });
    row++;
  });

  // DSCR row
  row++;
  const dscrR = [null, "DSCR  معدل تغطية خدمة الدين", null];
  bankYrs.forEach(y => dscrR.push(f?.dscr?.[y] !== null && f?.dscr?.[y] !== undefined ? +f.dscr[y].toFixed(2) : "-"));
  dataRow(ws, row, dscrR, { bold: true, numFmt: "0.00x" });

  // Footer
  row += 3;
  ws.mergeCells(row, 2, row, 3 + bankHorizon);
  const footer = ws.getCell(row, 2);
  footer.value = "Confidential  |  " + (project.name || "Project") + "  |  Bank Pack";
  footer.font = { name: FONT_MAIN, size: 8, italic: true, color: { argb: C.grayText } };
  footer.alignment = { horizontal: "center" };
}

// ═══ CHECKS SHEET ═══
function buildChecks(wb, checks) {
  const ws = wb.addWorksheet("9_Checks", { properties: { tabColor: { argb: "FF059669" } } });
  ws.columns = [{ width: 3 }, { width: 30 }, { width: 12 }, { width: 50 }];

  ws.mergeCells(2, 2, 2, 4);
  const title = ws.getCell(2, 2);
  title.value = "Model Integrity Checks  فحوصات سلامة النموذج";
  title.font = { name: FONT_MAIN, size: 14, bold: true, color: { argb: C.dark } };

  let row = 4;
  tableHeader(ws, row, [null, "Check  الفحص", "Status  الحالة", "Description  الوصف"]);
  row++;

  (checks || []).forEach((chk) => {
    const status = chk.pass ? "PASS" : "FAIL";
    const statusColor = chk.pass ? "FF059669" : "FFDC2626";
    ws.getCell(row, 2).value = chk.name;
    ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    ws.getCell(row, 3).value = status;
    ws.getCell(row, 3).font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: statusColor } };
    ws.getCell(row, 3).alignment = { horizontal: "center" };
    ws.getCell(row, 4).value = chk.desc || chk.detail || "";
    ws.getCell(row, 4).font = { name: FONT_MAIN, size: 9, color: { argb: C.grayText } };
    row++;
  });
}

// ═══ DOCUMENTATION SHEET ═══
function buildDocumentation(wb, project, cur, h, sy) {
  const ws = wb.addWorksheet("10_Documentation", { properties: { tabColor: { argb: C.grayText } } });
  ws.columns = [{ width: 3 }, { width: 28 }, { width: 50 }];

  ws.mergeCells(2, 2, 2, 3);
  const title = ws.getCell(2, 2);
  title.value = "Model Documentation  توثيق النموذج";
  title.font = { name: FONT_MAIN, size: 14, bold: true, color: { argb: C.dark } };

  let row = 4;
  const doc = [
    ["Project  المشروع", project.name || "-"],
    ["Model Type  نوع النموذج", project.finMode === "self" ? "Pure Development Model (Unlevered)" : "Development + Fund Model (Levered)"],
    ["Version  الإصدار", "RE-DEV MODELER v3"],
    ["Generated  تاريخ التصدير", new Date().toISOString().split("T")[0]],
    ["Currency  العملة", cur],
    ["Horizon  الأفق", h + " years (" + sy + "–" + (sy + h - 1) + ")"],
    ["Platform  المنصة", "RE-DEV MODELER (zandestiny.com)"],
    ["", ""],
    ["CALCULATION METHODOLOGY  منهجية الحساب", ""],
    ["IRR", "Newton-Raphson iterative method (tolerance 1e-7)"],
    ["NPV", "Standard discounted cash flow at 10%, 12%, 14%"],
    ["CAPEX", "Total cost = GFA × cost/sqm × (1 + soft%) × (1 + contingency%)"],
    ["Revenue (Lease)", "Leasable area × rate × occupancy × ramp-up × escalation"],
    ["Revenue (Operating)", "EBITDA × ramp-up × escalation"],
    ["Revenue (Sale)", "Sellable area × price/sqm × (1-commission) over absorption period"],
    ["DSCR", "NOI / Total Debt Service (principal + interest)"],
    ["MOIC", "Total Distributions / Equity Invested"],
    ["DPI", "Total Distributions / Total Equity Called (paid-in capital, incl. fees if capital treatment)"],
    ["Land Rent", "Base rent with N-year step escalation, grace period applied"],
    ["Waterfall", "4-tier: ROC → Preferred Return → GP Catch-up → Profit Split"],
    ["Interest Calc", "Rate × Average of (Opening Balance + Drawdown + Closing Balance) / 2"],
    ["", ""],
    ["DISCLAIMER  إخلاء المسؤولية", ""],
    ["", "This model is for financial planning purposes only. Actual results may vary."],
    ["", "All projections are based on assumptions that may not reflect actual market conditions."],
    ["", "هذا النموذج لأغراض التخطيط المالي فقط. النتائج الفعلية قد تختلف."],
  ];

  doc.forEach(([l, v]) => {
    if (l) {
      ws.getCell(row, 2).value = l;
      ws.getCell(row, 2).font = { name: FONT_MAIN, size: 10, bold: l === l.toUpperCase() || l.includes("METHODOLOGY") || l.includes("DISCLAIMER"), color: { argb: C.dark } };
    }
    if (v) {
      ws.getCell(row, 3).value = v;
      ws.getCell(row, 3).font = { name: FONT_MAIN, size: 10, color: { argb: C.grayText } };
    }
    row++;
  });
}
