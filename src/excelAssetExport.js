/**
 * Haseef — Asset Program Comprehensive Excel Export
 *
 * Single-button export that packages EVERYTHING in the Asset Program tab into
 * one workbook a bank, fund manager, or partner can trace end-to-end.
 *
 * Sheets:
 *   1. Read Me                — metadata + sheet guide + formula glossary
 *   2. Inputs                 — every asset field (bilingual, editable visual)
 *   3. Geometry               — Plot/Footprint/Floors/Basement/GFA + derived Coverage/FAR/GLA
 *   4. Cost Breakdown         — hard / soft / contingency / basement / parking per asset
 *   5. Land                   — project-level tenure, annual rent schedule with escalation
 *   6. CAPEX Schedule         — year-by-year per asset (engine values)
 *   7. Revenue Schedule       — year-by-year per asset (engine values)
 *   8. Land Rent Schedule     — allocated per asset by footprint, year-by-year
 *   9. Net Cash Flow          — Revenue − Land Rent − CAPEX, with IRR + payback per asset
 *  10. Investment Metrics     — YoC / Cap Rate / Exit Value / Dev Profit/Margin / Break-even
 *  11. Phase Summary          — aggregates per phase (totals + share of project)
 *  12. Smart Alerts           — any active Smart-Reviewer warnings for assets
 *
 * Dynamic: subtotal rows, IRR (Excel IRR formula), phase SUMIFs, metrics ratios
 * recalc live in Excel when a user tweaks an engine-value cell. Year-by-year
 * schedule values come from the engine (results.assetSchedules) because the
 * engine encodes ramp-up curves, phase-start logic, Sale pre-sale + absorption,
 * basement premiums, etc. — logic too complex to mirror in pure Excel.
 */

import ExcelJS from "exceljs";
import { computeAssetCapexBreakdown, computeAssetCapex } from "./engine/cashflow.js";
import { calcIRR } from "./engine/math.js";

// ── Theme / helpers (aligned with existing excelExport.js palette) ──
const C = {
  navy:      "FF001E39",
  navyText:  "FF001D39",
  teal:      "FF2EC4B6",
  tealDark:  "FF0F766E",
  dark:      "FF1F2937",
  white:     "FFFFFFFF",
  lightGray: "FFF5F5F5",
  greenBg:   "FFF0FDF4",
  greenDark: "FF16A34A",
  blueBg:    "FFEFF6FF",
  blueDark:  "FF2563EB",
  indigo:    "FF4F46E5",
  amberBg:   "FFFEF3C7",
  redBg:     "FFFEE2E2",
  red:       "FFDC2626",
  grayText:  "FF6B7280",
  black:     "FF000000",
  purpleBg:  "FFF3E8FF",
  inputBg:   "FFFFFDF5",  // slight yellow — editable input hint
  derivedBg: "FFF0F9FF",  // blue-ish — derived/formula hint
};

const FONT_MAIN = "Calibri";
const FONT_AR   = "Arial";
const FMT = {
  int:    "#,##0",
  sar:    "#,##0 \"SAR\"",
  sarNeg: "#,##0 \"SAR\";[Red]-#,##0 \"SAR\"",
  pct1:   "0.0%",
  pct0:   "0%",
  x2:     "0.00\\x",
  year:   "0",
  txt:    "@",
};

function setCol(ws, idx, width) { ws.getColumn(idx).width = width; }

function titleBar(ws, row, colStart, colEnd, textEn, textAr) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = textEn + (textAr ? `   —   ${textAr}` : "");
  cell.font = { name: FONT_MAIN, size: 18, bold: true, color: { argb: C.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(row).height = 36;
}

function sectionHeader(ws, row, colStart, colEnd, text) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = { name: FONT_MAIN, size: 11, bold: true, color: { argb: C.tealDark } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  cell.border = { bottom: { style: "medium", color: { argb: C.teal } } };
  ws.getRow(row).height = 22;
}

function tableHeader(ws, row, cols, opts = {}) {
  const { firstColLeft = true, height = 30 } = opts;
  cols.forEach((label, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = label;
    cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    cell.alignment = { vertical: "middle", horizontal: firstColLeft && i === 0 ? "left" : "center", wrapText: true, indent: firstColLeft && i === 0 ? 1 : 0 };
    cell.border = { top: { style: "thin", color: { argb: C.dark } }, bottom: { style: "thin", color: { argb: C.dark } } };
  });
  ws.getRow(row).height = height;
}

function writeRow(ws, row, values, opts = {}) {
  const { bold, numFmts = [], bgColor, alternating, rowIdx } = opts;
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    if (v !== null && v !== undefined && !(typeof v === "string" && v === "")) cell.value = v;
    cell.font = {
      name: FONT_MAIN, size: 10,
      bold: !!bold,
      color: { argb: typeof v === "number" && v < 0 ? C.red : C.black },
    };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    if (numFmts[i]) cell.numFmt = numFmts[i];
    // Alternating row color
    if (bgColor) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    else if (alternating && rowIdx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
  });
}

function totalRow(ws, row, values, numFmts = []) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    if (v !== null && v !== undefined && !(typeof v === "string" && v === "")) cell.value = v;
    cell.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.navyText } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", indent: i === 0 ? 1 : 0 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueBg } };
    cell.border = { top: { style: "medium", color: { argb: C.blueDark } }, bottom: { style: "double", color: { argb: C.blueDark } } };
    if (numFmts[i]) cell.numFmt = numFmts[i];
  });
}

function note(ws, row, colStart, colEnd, text) {
  ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = text;
  cell.font = { name: FONT_MAIN, size: 9, italic: true, color: { argb: C.grayText } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  ws.getRow(row).height = 30;
}

// Column-letter helper for 1-based index (handles A-Z, AA-ZZ)
function colLetter(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const n = v => (typeof v === "number" && isFinite(v)) ? v : 0;

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export async function generateAssetsWorkbook(project, results, smartAlerts = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Haseef Financial Modeler";
  wb.created = new Date();
  wb.lastModifiedBy = "Haseef";

  const projectName = project?.name || "Project";
  const currency   = project?.currency || "SAR";
  const startYear  = project?.startYear || results?.startYear || new Date().getFullYear();
  const horizon    = Math.min(project?.horizon || 50, results?.horizon || 50);
  const assets     = project?.assets || [];
  const phases     = project?.phases || [];
  const schedules  = results?.assetSchedules || [];
  const phaseResults = results?.phaseResults || {};
  const consolidated = results?.consolidated || {};
  const yrs = Array.from({ length: horizon }, (_, i) => i);

  // Pre-compute per-asset derived numbers once (used across multiple sheets)
  const breakdowns = assets.map(a => {
    try { return computeAssetCapexBreakdown(a, project || {}); } catch { return null; }
  });

  // Per-asset land rent share, year-by-year (same logic as UI's getAssetLandRent)
  const assetLandRent = assets.map((a, i) => {
    const phaseName = a.phase || phases[0]?.name || "Phase 1";
    const pr = phaseResults[phaseName];
    if (!pr || !pr.landRent) return new Array(horizon).fill(0);
    const pFP = pr.footprint || 1;
    const aFP = a.footprint || 0;
    const ratio = pFP > 0 ? aFP / pFP : 0;
    return pr.landRent.map(v => v * ratio);
  });

  // ═══════════════════════════════════════════════════════════════
  // SHEET 1: Read Me
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Read Me", { views: [{ showGridLines: false }], properties: { tabColor: { argb: C.teal } } });
    setCol(ws, 1, 3); setCol(ws, 2, 95);
    titleBar(ws, 1, 2, 2, `Asset Program Export — ${projectName}`, `برنامج الأصول`);

    const meta = [
      [`Project`,          projectName],
      [`المشروع`,           projectName],
      [`Currency / العملة`, currency],
      [`Start Year / سنة البداية`, startYear],
      [`Horizon / الأفق`,   horizon + " yrs"],
      [`Phases / المراحل`,  phases.map(p => p.name).join(", ")],
      [`Assets / الأصول`,   assets.length],
      [`Active Scenario / السيناريو`, project?.activeScenario || "Base Case"],
      [`Generated / تاريخ الإصدار`, new Date().toLocaleString()],
    ];
    let r = 3;
    meta.forEach(([k, v]) => {
      ws.getCell(r, 2).value = `${k}:  ${v}`;
      ws.getCell(r, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
      r++;
    });
    r += 1;
    sectionHeader(ws, r, 2, 2, "Sheets in this workbook / الأوراق في هذا الملف");
    r += 1;
    const guide = [
      ["1. Inputs",               "All per-asset inputs in one table (editable)."],
      ["2. Geometry",             "Plot/Footprint/Floors/GFA + auto-derived Coverage, FAR, GLA."],
      ["3. Cost Breakdown",       "Hard cost, basement premium, parking, soft cost, contingency."],
      ["4. Land",                 "Project-level land type + year-by-year rent schedule."],
      ["5. CAPEX Schedule",       "Year-by-year CAPEX per asset (engine values)."],
      ["6. Revenue Schedule",     "Year-by-year revenue per asset (engine values)."],
      ["7. Land Rent Schedule",   "Land rent allocated per asset by footprint ratio."],
      ["8. Net Cash Flow",        "Revenue − Land Rent − CAPEX, with IRR + payback per asset."],
      ["9. Investment Metrics",   "YoC, Cap Rate, Exit Value, Dev Profit/Margin, Break-even rent."],
      ["10. Phase Summary",       "Aggregates per phase (SUMIF-based, recalculates if values change)."],
      ["11. Smart Alerts",        "Active Smart-Reviewer alerts (if any)."],
    ];
    guide.forEach(([a, b]) => {
      ws.getCell(r, 2).value = `${a}  —  ${b}`;
      ws.getCell(r, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.black } };
      r++;
    });

    r += 1;
    sectionHeader(ws, r, 2, 2, "Dynamic Formulas / الصيغ الديناميكية");
    r += 1;
    const formulaNotes = [
      "• Subtotals (SUM) on every schedule sheet — change a year's value and the row/column totals update.",
      "• Per-asset IRR uses Excel's IRR function on the Net Cash Flow row — live recalculation.",
      "• Phase Summary uses SUMIF — editing CAPEX/Revenue in Inputs updates phase totals.",
      "• Investment Metrics ratios (Dev Margin, YoC) compute from the values in this workbook.",
      "• Year-by-year schedules are engine-computed because ramp-up curves, Sale pre-sale +",
      "  absorption logic, basement premiums, and land-rent allocation are too complex to",
      "  mirror in spreadsheet cells. If you tweak an Inputs cell, regenerate the workbook",
      "  from Haseef to get an updated schedule. The summary totals update inside Excel.",
    ];
    formulaNotes.forEach(line => {
      ws.getCell(r, 2).value = line;
      ws.getCell(r, 2).font = { name: FONT_MAIN, size: 9.5, color: { argb: C.grayText } };
      r++;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 2: Inputs
  // ═══════════════════════════════════════════════════════════════
  const inputsCols = [
    { key: "num",       label: "#",                                  w: 4 },
    { key: "phase",     label: "Phase\nالمرحلة",                       w: 12 },
    { key: "name",      label: "Asset Name\nاسم الأصل",                w: 22 },
    { key: "code",      label: "Code\nالرمز",                          w: 8 },
    { key: "category",  label: "Category\nالتصنيف",                     w: 14 },
    { key: "assetType", label: "Asset Type\nنوع الأصل",                 w: 18 },
    { key: "revType",   label: "Rev Type\nنوع الإيراد",                 w: 10 },
    { key: "gfa",       label: "GFA (m²)\nالمساحة الإجمالية",            w: 11, fmt: FMT.int },
    { key: "efficiency",label: "Efficiency %\nالكفاءة",                 w: 10, fmt: FMT.pct0, transform: v => n(v)/100 },
    { key: "leaseRate", label: "Lease Rate\nإيجار /م²",                  w: 11, fmt: FMT.int },
    { key: "opEbitda",  label: "EBITDA /yr\nأرباح تشغيلية",              w: 13, fmt: FMT.int },
    { key: "salePricePerSqm", label: "Sale Price /m²\nسعر البيع",      w: 11, fmt: FMT.int },
    { key: "absorptionYears", label: "Absorption\nاستيعاب",             w: 8 },
    { key: "preSalePct", label: "Pre-Sale %\nبيع مسبق",                 w: 9, fmt: FMT.pct0, transform: v => n(v)/100 },
    { key: "commissionPct", label: "Commission %\nعمولة",               w: 9, fmt: FMT.pct0, transform: v => n(v)/100 },
    { key: "stabilizedOcc", label: "Occupancy %\nالإشغال",              w: 10, fmt: FMT.pct0, transform: v => n(v)/100 },
    { key: "rampUpYears", label: "Ramp-Up (yr)\nسنوات النمو",            w: 9 },
    { key: "escalation", label: "Escalation %\nزيادة سنوية",             w: 10, fmt: FMT.pct1, transform: v => n(v)/100 },
    { key: "costPerSqm", label: "Cost /m²\nتكلفة",                      w: 10, fmt: FMT.int },
    { key: "constrDuration", label: "Build (mo)\nمدة البناء",            w: 10 },
    { key: "plotArea",  label: "Plot Area\nمساحة الأرض",                w: 11, fmt: FMT.int },
    { key: "footprint", label: "Footprint\nالمسطح البنائي",              w: 11, fmt: FMT.int },
  ];
  {
    const ws = wb.addWorksheet("Inputs", { views: [{ showGridLines: false, state: "frozen", xSplit: 4, ySplit: 3 }], properties: { tabColor: { argb: "FF3B82F6" } } });
    inputsCols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, inputsCols.length, "Asset Inputs", "مدخلات الأصول");
    tableHeader(ws, 2, inputsCols.map(c => c.label));

    assets.forEach((a, i) => {
      const r = 3 + i;
      const vals = inputsCols.map(c => {
        if (c.key === "num") return i + 1;
        const raw = a[c.key];
        if (c.transform) return c.transform(raw);
        return (raw === undefined || raw === null) ? "" : raw;
      });
      const fmts = inputsCols.map(c => c.fmt || null);
      writeRow(ws, r, vals, { numFmts: fmts, alternating: true, rowIdx: i });
    });
    // Store range info for cross-sheet references
    ws.inputsFirstDataRow = 3;
    ws.inputsLastDataRow = 3 + assets.length - 1;
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 3: Geometry
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Geometry", { views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 3 }], properties: { tabColor: { argb: "FF06B6D4" } } });
    const cols = [
      { label: "#", w: 4 },
      { label: "Asset\nالأصل", w: 22 },
      { label: "Phase\nالمرحلة", w: 10 },
      { label: "Plot Area (m²)\nمساحة الأرض", w: 13 },
      { label: "Footprint (m²)\nالمسطح", w: 13 },
      { label: "Floors Above\nأدوار فوق الأرض", w: 11 },
      { label: "Basement\nأدوار بيسمنت", w: 11 },
      { label: "GFA (m²)\nإجمالي البناء", w: 13 },
      { label: "Efficiency\nالكفاءة", w: 10 },
      { label: "GLA (m²)\nمساحة تأجيرية", w: 13 },
      { label: "Coverage %\nنسبة التغطية", w: 11 },
      { label: "FAR\nمعامل البناء", w: 9 },
      { label: "Parking Area\nمواقف", w: 11 },
    ];
    cols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, cols.length, "Geometry & Derivations", "الهندسة والمساحات المشتقة");
    tableHeader(ws, 2, cols.map(c => c.label));

    assets.forEach((a, i) => {
      const r = 3 + i;
      const plot = n(a.plotArea), fp = n(a.footprint), gfa = n(a.gfa), eff = n(a.efficiency);
      const gla = a.gla || (gfa * eff / 100);
      const coverage = plot > 0 ? fp / plot : null;
      const far = plot > 0 ? gfa / plot : null;
      const vals = [
        i + 1, a.name || `Asset ${i+1}`, a.phase || "",
        plot, fp,
        n(a.floorsAboveGround) || "", n(a.basementLevels) || "",
        gfa, eff/100, gla, coverage, far,
        n(a.parkingArea) || "",
      ];
      const fmts = [null, null, null, FMT.int, FMT.int, FMT.int, FMT.int, FMT.int, FMT.pct0, FMT.int, FMT.pct0, "0.00", FMT.int];
      writeRow(ws, r, vals, { numFmts: fmts, alternating: true, rowIdx: i });

      // Highlight warnings (coverage > 80% or FAR > 6) — rule of thumb
      if (coverage !== null && coverage > 0.8) {
        ws.getCell(r, 11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.amberBg } };
      }
      if (far !== null && far > 6) {
        ws.getCell(r, 12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.amberBg } };
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 4: Cost Breakdown
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Cost Breakdown", { views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 3 }], properties: { tabColor: { argb: "FFF59E0B" } } });
    const cols = [
      { label: "#", w: 4 },
      { label: "Asset\nالأصل", w: 22 },
      { label: "Phase\nالمرحلة", w: 10 },
      { label: "Cost /m²\nتكلفة", w: 11 },
      { label: "Above Ground\nفوق الأرض", w: 13 },
      { label: "Basement\nبيسمنت", w: 12 },
      { label: "Parking\nمواقف", w: 11 },
      { label: "Hard Cost\nصلبة", w: 13 },
      { label: "Soft %\nغير مباشرة", w: 10 },
      { label: "Soft Cost\nغير مباشرة", w: 13 },
      { label: "Cont. %\nاحتياطي", w: 10 },
      { label: "Contingency\nاحتياطي", w: 13 },
      { label: "Subtotal\nمجموع", w: 13 },
      { label: "Scen. Mult\nمضاعف", w: 10 },
      { label: "Total CAPEX\nإجمالي CAPEX", w: 14 },
      { label: "Avg /m²\nمتوسط", w: 10 },
    ];
    cols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, cols.length, "Cost Breakdown", "تفصيل التكلفة الرأسمالية");
    tableHeader(ws, 2, cols.map(c => c.label));

    let totHard = 0, totSoft = 0, totCont = 0, totTotal = 0, totGfa = 0;
    assets.forEach((a, i) => {
      const bd = breakdowns[i];
      const r = 3 + i;
      const softPct = (a.softCostPctOverride != null ? a.softCostPctOverride : (project.softCostPct || 0));
      const contPct = (a.contingencyPctOverride != null ? a.contingencyPctOverride : (project.contingencyPct || 0));
      const gfa = n(a.gfa);
      const avgPerSqm = bd && gfa > 0 ? bd.total / gfa : null;
      const vals = [
        i + 1, a.name || `Asset ${i+1}`, a.phase || "",
        n(a.costPerSqm),
        bd?.hardCostAbove || 0,
        bd?.hardCostBasement || 0,
        bd?.parkingCost || 0,
        bd?.hardCost || 0,
        softPct / 100,
        bd?.softCost || 0,
        contPct / 100,
        bd?.contingency || 0,
        bd?.subtotal || 0,
        bd?.scenarioMult || 1,
        bd?.total || 0,
        avgPerSqm,
      ];
      const fmts = [null, null, null, FMT.int, FMT.int, FMT.int, FMT.int, FMT.int, FMT.pct1, FMT.int, FMT.pct1, FMT.int, FMT.int, "0.00", FMT.int, FMT.int];
      writeRow(ws, r, vals, { numFmts: fmts, alternating: true, rowIdx: i });
      totHard += bd?.hardCost || 0;
      totSoft += bd?.softCost || 0;
      totCont += bd?.contingency || 0;
      totTotal += bd?.total || 0;
      totGfa += gfa;
    });
    // Total row
    const totRow = 3 + assets.length;
    const firstR = 3, lastR = 3 + assets.length - 1;
    const totalVals = [
      "", "Total / الإجمالي", "",
      "",
      { formula: `SUM(E${firstR}:E${lastR})` },
      { formula: `SUM(F${firstR}:F${lastR})` },
      { formula: `SUM(G${firstR}:G${lastR})` },
      { formula: `SUM(H${firstR}:H${lastR})` },
      "",
      { formula: `SUM(J${firstR}:J${lastR})` },
      "",
      { formula: `SUM(L${firstR}:L${lastR})` },
      { formula: `SUM(M${firstR}:M${lastR})` },
      "",
      { formula: `SUM(O${firstR}:O${lastR})` },
      totGfa > 0 ? { formula: `O${totRow}/SUMIF(H${firstR}:H${lastR},">0",H${firstR}:H${lastR})*0+O${totRow}/${totGfa}` } : "",
    ];
    totalRow(ws, totRow, totalVals, [null, null, null, null, FMT.int, FMT.int, FMT.int, FMT.int, null, FMT.int, null, FMT.int, FMT.int, null, FMT.int, FMT.int]);
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 5: Land
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Land", { views: [{ showGridLines: false }], properties: { tabColor: { argb: "FF84CC16" } } });
    setCol(ws, 1, 3); setCol(ws, 2, 26); setCol(ws, 3, 22);
    for (let i = 0; i < horizon; i++) setCol(ws, 4 + i, 11);
    titleBar(ws, 1, 1, 3 + horizon, "Land — Project Level", "الأرض — مستوى المشروع");

    const landRows = [
      ["Land Type / نوع الحيازة", project?.landType || ""],
      ["Land Area (m²) / المساحة", n(project?.landArea)],
      ["Land Purchase Price / سعر الشراء", project?.landType === "purchase" ? n(project?.landPurchasePrice) : ""],
      ["Partner Land Valuation / تقييم الشريك", project?.landType === "partner" ? n(project?.landValuation) : ""],
      ["Partner Equity %", project?.landType === "partner" ? n(project?.partnerEquityPct)/100 : ""],
      ["BOT Operation Years", project?.landType === "bot" ? n(project?.botOperationYears) : ""],
      ["Annual Rent / إيجار سنوي", project?.landType === "lease" ? n(project?.landRentAnnual) : ""],
      ["Lease Term (yrs) / مدة العقد", project?.landType === "lease" ? n(project?.landRentTerm) : ""],
      ["Grace Period (yrs) / السماح", project?.landType === "lease" ? n(project?.landRentGrace) : ""],
      ["Escalation %", project?.landType === "lease" ? n(project?.landRentEscalation)/100 : ""],
      ["Escalation Every N Yrs", project?.landType === "lease" ? n(project?.landRentEscalationEveryN) : ""],
      ["Rent /m² /yr (implied)", project?.landType === "lease" && n(project?.landArea) > 0 ? n(project?.landRentAnnual) / n(project?.landArea) : ""],
    ];
    let r = 3;
    landRows.forEach(([label, v]) => {
      ws.getCell(r, 2).value = label;
      ws.getCell(r, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.grayText } };
      ws.getCell(r, 2).alignment = { indent: 1, vertical: "middle" };
      const valCell = ws.getCell(r, 3);
      valCell.value = v;
      valCell.font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.navyText } };
      valCell.alignment = { horizontal: "right", vertical: "middle" };
      if (typeof v === "number") {
        if (label.includes("%")) valCell.numFmt = FMT.pct1;
        else valCell.numFmt = FMT.int;
      }
      r++;
    });
    r += 1;
    sectionHeader(ws, r, 1, 3 + horizon, "Annual Land Rent — Project Total (from engine)");
    r++;
    // Year headers
    ws.getCell(r, 2).value = "Year / السنة";
    ws.getCell(r, 2).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
    ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    ws.getCell(r, 2).alignment = { horizontal: "left", indent: 1 };
    ws.getCell(r, 3).value = "Total";
    ws.getCell(r, 3).font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
    ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    ws.getCell(r, 3).alignment = { horizontal: "center" };
    yrs.forEach(y => {
      const cell = ws.getCell(r, 4 + y);
      cell.value = startYear + y;
      cell.font = { name: FONT_MAIN, size: 9, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
      cell.alignment = { horizontal: "center" };
    });
    ws.getRow(r).height = 20;
    r++;

    // Land rent row: sum of per-phase land rent for "project total"
    const projectLandRent = new Array(horizon).fill(0);
    Object.values(phaseResults).forEach(pr => {
      if (pr && pr.landRent) pr.landRent.forEach((v, y) => { if (y < horizon) projectLandRent[y] += n(v); });
    });
    ws.getCell(r, 2).value = "Land Rent (SAR)";
    ws.getCell(r, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.dark } };
    ws.getCell(r, 2).alignment = { horizontal: "left", indent: 1 };
    // Total formula
    const startCol = 4;
    const endCol = 3 + horizon;
    ws.getCell(r, 3).value = { formula: `SUM(${colLetter(startCol)}${r}:${colLetter(endCol)}${r})` };
    ws.getCell(r, 3).font = { name: FONT_MAIN, size: 10, bold: true, color: { argb: C.navyText } };
    ws.getCell(r, 3).numFmt = FMT.int;
    ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueBg } };
    ws.getCell(r, 3).alignment = { horizontal: "right" };
    yrs.forEach(y => {
      const cell = ws.getCell(r, 4 + y);
      cell.value = projectLandRent[y] || 0;
      cell.font = { name: FONT_MAIN, size: 10, color: { argb: C.black } };
      cell.numFmt = FMT.int;
      cell.alignment = { horizontal: "right" };
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Helper: build a generic per-asset year-by-year matrix sheet
  // ═══════════════════════════════════════════════════════════════
  function buildScheduleSheet(title, titleAr, tabColor, getRow) {
    const ws = wb.addWorksheet(title, {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 4 }],
      properties: { tabColor: { argb: tabColor } },
    });
    setCol(ws, 1, 4); setCol(ws, 2, 24); setCol(ws, 3, 14);
    for (let i = 0; i < horizon; i++) setCol(ws, 4 + i, 11);
    titleBar(ws, 1, 1, 3 + horizon, title, titleAr);

    // Year header row
    const hdr = ["#", "Asset / الأصل", "Total"].concat(yrs.map(y => startYear + y));
    tableHeader(ws, 3, hdr);
    // Build rows
    const firstR = 4;
    assets.forEach((a, i) => {
      const r = firstR + i;
      const seq = getRow(a, i); // array of length horizon
      const row = [i + 1, a.name || `Asset ${i+1}`];
      // Total column = SUM formula across year cells
      const startColLetter = colLetter(4);
      const endColLetter = colLetter(3 + horizon);
      row.push({ formula: `SUM(${startColLetter}${r}:${endColLetter}${r})` });
      for (let y = 0; y < horizon; y++) row.push(n(seq[y]));
      const fmts = [null, null, FMT.int, ...new Array(horizon).fill(FMT.int)];
      writeRow(ws, r, row, { numFmts: fmts, alternating: true, rowIdx: i });
    });
    // Total row across assets
    const totR = firstR + assets.length;
    const totRow = ["", "Total Portfolio / الإجمالي", { formula: `SUM(${colLetter(3)}${firstR}:${colLetter(3)}${firstR + assets.length - 1})` }];
    for (let y = 0; y < horizon; y++) {
      const col = colLetter(4 + y);
      totRow.push({ formula: `SUM(${col}${firstR}:${col}${firstR + assets.length - 1})` });
    }
    totalRow(ws, totR, totRow, [null, null, FMT.int, ...new Array(horizon).fill(FMT.int)]);
    return { ws, firstR, lastR: firstR + assets.length - 1, totR };
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEETS 6-8: CAPEX / Revenue / Land Rent schedules
  // ═══════════════════════════════════════════════════════════════
  const capexSheet   = buildScheduleSheet("CAPEX Schedule",   "جدول التكاليف الرأسمالية", "FFEF4444", (_, i) => schedules[i]?.capexSchedule || new Array(horizon).fill(0));
  const revSheet     = buildScheduleSheet("Revenue Schedule", "جدول الإيرادات",         "FF16A34A", (_, i) => schedules[i]?.revenueSchedule || new Array(horizon).fill(0));
  const rentSheet    = buildScheduleSheet("Land Rent Schedule","جدول إيجار الأرض",      "FFF59E0B", (_, i) => assetLandRent[i]);

  // ═══════════════════════════════════════════════════════════════
  // SHEET 9: Net Cash Flow + IRR + Payback
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Net Cash Flow", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 4 }],
      properties: { tabColor: { argb: C.indigo } },
    });
    setCol(ws, 1, 4); setCol(ws, 2, 24); setCol(ws, 3, 14); setCol(ws, 4, 11); setCol(ws, 5, 11);
    for (let i = 0; i < horizon; i++) setCol(ws, 6 + i, 11);
    titleBar(ws, 1, 1, 5 + horizon, "Net Cash Flow + IRR + Payback", "صافي التدفق النقدي + IRR");

    const hdr = ["#", "Asset / الأصل", "Total NCF", "IRR", "Payback (yr)"].concat(yrs.map(y => startYear + y));
    tableHeader(ws, 3, hdr);

    const firstR = 4;
    const cfRowStart = firstR;
    const cfRowEnd = firstR + assets.length - 1;
    const yearStartCol = 6;
    const yearEndCol = 5 + horizon;

    assets.forEach((a, i) => {
      const r = firstR + i;
      const rev = schedules[i]?.revenueSchedule || new Array(horizon).fill(0);
      const cap = schedules[i]?.capexSchedule || new Array(horizon).fill(0);
      const lr  = assetLandRent[i] || new Array(horizon).fill(0);

      const netCF = yrs.map(y => n(rev[y]) - n(lr[y]) - n(cap[y]));
      const irr = calcIRR(netCF);
      // Simple payback: first year cumCF >= 0 after an outflow
      let cum = 0, paybackYr = null, spent = false;
      for (let y = 0; y < horizon; y++) {
        cum += netCF[y];
        if (netCF[y] < 0) spent = true;
        if (spent && cum >= 0 && paybackYr === null) { paybackYr = y + 1; break; }
      }

      const startLetter = colLetter(yearStartCol);
      const endLetter = colLetter(yearEndCol);
      // Row: [i+1, name, total SUM formula, IRR formula, payback, year values...]
      const row = [
        i + 1,
        a.name || `Asset ${i+1}`,
        { formula: `SUM(${startLetter}${r}:${endLetter}${r})` },
        { formula: `IFERROR(IRR(${startLetter}${r}:${endLetter}${r}),"—")` },
        paybackYr != null ? paybackYr : "—",
        ...netCF,
      ];
      const fmts = [null, null, FMT.int, FMT.pct1, null, ...new Array(horizon).fill(FMT.int)];
      writeRow(ws, r, row, { numFmts: fmts, alternating: true, rowIdx: i });
    });

    // Portfolio total row: column-wise SUM, then IRR of the totals
    const totR = cfRowEnd + 1;
    const startL = colLetter(yearStartCol);
    const endL = colLetter(yearEndCol);
    const totRow = [
      "", "Portfolio / المحفظة",
      { formula: `SUM(C${cfRowStart}:C${cfRowEnd})` },
      { formula: `IFERROR(IRR(${startL}${totR}:${endL}${totR}),"—")` },
      "",
    ];
    for (let y = 0; y < horizon; y++) {
      const col = colLetter(yearStartCol + y);
      totRow.push({ formula: `SUM(${col}${cfRowStart}:${col}${cfRowEnd})` });
    }
    totalRow(ws, totR, totRow, [null, null, FMT.int, FMT.pct1, null, ...new Array(horizon).fill(FMT.int)]);
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 10: Investment Metrics
  // ═══════════════════════════════════════════════════════════════
  const CAP_RATES = { retail_lifestyle:8.5, mall:7.5, office:8.0, residential_villas:7.0, residential_multifamily:7.5, serviced_apartments:7.0, hotel:8.5, resort:9.0, marina:9.5, yacht_club:9.0, parking_structure:9.5 };
  {
    const ws = wb.addWorksheet("Investment Metrics", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 3 }],
      properties: { tabColor: { argb: "FFF59E0B" } },
    });
    const cols = [
      { label: "#", w: 4 },
      { label: "Asset\nالأصل", w: 22 },
      { label: "Phase\nالمرحلة", w: 10 },
      { label: "Rev Type", w: 10 },
      { label: "Total CAPEX\nإجمالي CAPEX", w: 14 },
      { label: "Annual Rev\nإيراد مستقر", w: 14 },
      { label: "YoC %\nعائد على التكلفة", w: 11 },
      { label: "Cap Rate %\nمعدل الرسملة", w: 11 },
      { label: "Exit Value\nقيمة الخروج", w: 14 },
      { label: "Dev Profit\nربح التطوير", w: 14 },
      { label: "Dev Margin %\nهامش", w: 11 },
      { label: "Revenue /m²\nإيراد /م²", w: 11 },
      { label: "Cost /m²\nتكلفة /م²", w: 11 },
      { label: "Break-even Rent\nإيجار التعادل", w: 13 },
    ];
    cols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, cols.length, "Investment Metrics", "مؤشرات الاستثمار");
    tableHeader(ws, 2, cols.map(c => c.label));

    assets.forEach((a, i) => {
      const r = 3 + i;
      const sched = schedules[i];
      const totalCapex = sched?.totalCapex || breakdowns[i]?.total || 0;
      const totalRev = sched?.totalRevenue || 0;
      const gfa = n(a.gfa), eff = n(a.efficiency)/100;
      const leasable = gfa * eff;
      let annualRev = 0;
      if (a.revType === "Lease") annualRev = leasable * n(a.leaseRate) * (n(a.stabilizedOcc)||100)/100;
      else if (a.revType === "Operating") annualRev = n(a.opEbitda);
      else if (a.revType === "Sale") annualRev = Math.max(1, n(a.absorptionYears)||3) > 0 ? totalRev / Math.max(1, n(a.absorptionYears)||3) : 0;
      const capRate = (CAP_RATES[a.assetType] || 8.5);
      let exitValue = 0;
      if (a.revType === "Sale") exitValue = totalRev;
      else if (annualRev > 0) exitValue = annualRev / (capRate/100);
      const devProfit = exitValue - totalCapex;
      const devMargin = totalCapex > 0 ? devProfit / totalCapex : 0;
      const yoc = totalCapex > 0 ? annualRev / totalCapex : 0;
      const revPerSqm = gfa > 0 ? annualRev / gfa : 0;
      const costPerSqmTotal = gfa > 0 ? totalCapex / gfa : 0;
      const breakEvenRent = (a.revType === "Lease" && leasable > 0 && totalCapex > 0) ? (totalCapex / 10) / leasable : null;

      const vals = [
        i + 1, a.name || `Asset ${i+1}`, a.phase || "", a.revType || "",
        totalCapex, annualRev, yoc, capRate/100, exitValue, devProfit, devMargin, revPerSqm, costPerSqmTotal, breakEvenRent,
      ];
      const fmts = [null, null, null, null, FMT.int, FMT.int, FMT.pct1, FMT.pct1, FMT.int, FMT.int, FMT.pct1, FMT.int, FMT.int, FMT.int];
      writeRow(ws, r, vals, { numFmts: fmts, alternating: true, rowIdx: i });

      // Colour-code Dev Margin
      const mCell = ws.getCell(r, 11);
      if (devMargin >= 0.25) mCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
      else if (devMargin >= 0.15) mCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.amberBg } };
      else if (totalCapex > 0) mCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
    });

    // Total row (portfolio): SUMs + computed margin
    const totR = 3 + assets.length;
    const firstR = 3, lastR = 2 + assets.length;
    const portfolioTotalCapex = `SUM(E${firstR}:E${lastR})`;
    const portfolioAnnualRev = `SUM(F${firstR}:F${lastR})`;
    const portfolioExit = `SUM(I${firstR}:I${lastR})`;
    const vals = [
      "", "Portfolio / المحفظة", "", "",
      { formula: portfolioTotalCapex },
      { formula: portfolioAnnualRev },
      { formula: `IFERROR(${portfolioAnnualRev}/${portfolioTotalCapex},0)` },
      "", // cap rate blended — skip
      { formula: portfolioExit },
      { formula: `${portfolioExit}-${portfolioTotalCapex}` },
      { formula: `IFERROR((${portfolioExit}-${portfolioTotalCapex})/${portfolioTotalCapex},0)` },
      "", "", "",
    ];
    totalRow(ws, totR, vals, [null, null, null, null, FMT.int, FMT.int, FMT.pct1, null, FMT.int, FMT.int, FMT.pct1, null, null, null]);
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 11: Phase Summary
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Phase Summary", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: 3 }],
      properties: { tabColor: { argb: "FF8B5CF6" } },
    });
    const cols = [
      { label: "#", w: 4 },
      { label: "Phase\nالمرحلة", w: 16 },
      { label: "Opening Yr\nسنة الافتتاح", w: 12 },
      { label: "Assets\nعدد الأصول", w: 10 },
      { label: "GFA (m²)\nمساحة", w: 13 },
      { label: "Footprint\nمسطح", w: 13 },
      { label: "Total CAPEX\nCAPEX", w: 14 },
      { label: "Total Revenue\nإيرادات", w: 14 },
      { label: "% of CAPEX\nحصة CAPEX", w: 11 },
      { label: "% of Revenue\nحصة الإيراد", w: 11 },
      { label: "Land Rent\nإيجار أرض", w: 13 },
    ];
    cols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, cols.length, "Phase Summary", "ملخص المراحل");
    tableHeader(ws, 2, cols.map(c => c.label));

    let portfolioCapex = 0, portfolioRev = 0;
    assets.forEach((a, i) => {
      portfolioCapex += schedules[i]?.totalCapex || 0;
      portfolioRev += schedules[i]?.totalRevenue || 0;
    });

    phases.forEach((ph, i) => {
      const r = 3 + i;
      const pAssets = assets.filter(a => a.phase === ph.name);
      const pIndices = assets.map((a, idx) => a.phase === ph.name ? idx : -1).filter(idx => idx >= 0);
      const pGfa = pAssets.reduce((s, a) => s + n(a.gfa), 0);
      const pFp  = pAssets.reduce((s, a) => s + n(a.footprint), 0);
      const pCapex = pIndices.reduce((s, idx) => s + (schedules[idx]?.totalCapex || 0), 0);
      const pRev   = pIndices.reduce((s, idx) => s + (schedules[idx]?.totalRevenue || 0), 0);
      const pRent  = phaseResults[ph.name]?.landRent?.reduce((s, v) => s + n(v), 0) || 0;
      const vals = [
        i + 1, ph.name,
        ph.completionYear || "",
        pAssets.length, pGfa, pFp,
        pCapex, pRev,
        portfolioCapex > 0 ? pCapex / portfolioCapex : 0,
        portfolioRev > 0 ? pRev / portfolioRev : 0,
        pRent,
      ];
      const fmts = [null, null, null, null, FMT.int, FMT.int, FMT.int, FMT.int, FMT.pct1, FMT.pct1, FMT.int];
      writeRow(ws, r, vals, { numFmts: fmts, alternating: true, rowIdx: i });
    });
    const totR = 3 + phases.length;
    const firstR = 3, lastR = 2 + phases.length;
    const vals = [
      "", "Portfolio / المحفظة", "",
      { formula: `SUM(D${firstR}:D${lastR})` },
      { formula: `SUM(E${firstR}:E${lastR})` },
      { formula: `SUM(F${firstR}:F${lastR})` },
      { formula: `SUM(G${firstR}:G${lastR})` },
      { formula: `SUM(H${firstR}:H${lastR})` },
      "", "",
      { formula: `SUM(K${firstR}:K${lastR})` },
    ];
    totalRow(ws, totR, vals, [null, null, null, null, FMT.int, FMT.int, FMT.int, FMT.int, null, null, FMT.int]);
  }

  // ═══════════════════════════════════════════════════════════════
  // SHEET 12: Smart Alerts (if any)
  // ═══════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Smart Alerts", {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: C.red } },
    });
    setCol(ws, 1, 4); setCol(ws, 2, 18); setCol(ws, 3, 10); setCol(ws, 4, 22); setCol(ws, 5, 80);
    titleBar(ws, 1, 1, 5, "Smart Reviewer Alerts", "تنبيهات المراجع الذكي");
    tableHeader(ws, 2, ["#", "Asset\nالأصل", "Severity\nالخطورة", "Rule ID", "Message / الرسالة"]);

    // smartAlerts is a separate React state — passed in from the caller.
    // Accept either {alerts:[], summary:{}} or an array shape defensively.
    const alerts = Array.isArray(smartAlerts?.alerts) ? smartAlerts.alerts
                 : Array.isArray(smartAlerts) ? smartAlerts
                 : [];
    if (alerts.length === 0) {
      ws.getCell(3, 2).value = "✓ No active alerts — all asset inputs look reasonable.";
      ws.getCell(3, 2).font = { name: FONT_MAIN, size: 10, color: { argb: C.greenDark }, italic: true };
      ws.mergeCells(3, 2, 3, 5);
    } else {
      alerts.forEach((al, i) => {
        const r = 3 + i;
        const aName = al.assetIndex != null ? (assets[al.assetIndex]?.name || `Asset ${al.assetIndex + 1}`) : "Project";
        const sev = al.severity || "info";
        const vals = [i + 1, aName, sev, al.id || "", (al.ar ? `${al.ar} — ` : "") + (al.en || "")];
        writeRow(ws, r, vals, { alternating: true, rowIdx: i });
        const sevCell = ws.getCell(r, 3);
        if (sev === "critical") sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        else if (sev === "warning") sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.amberBg } };
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════════
  const safeName = (projectName || "Project").replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, "_");
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_Assets_Full.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
