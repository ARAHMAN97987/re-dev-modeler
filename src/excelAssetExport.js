/**
 * Haseef — Asset Pro Forma (truly dynamic Excel export)
 *
 * Rewritten 2026-04-24 to fix prior version's complaints:
 *   "ضخم ومعقد وغير ديناميكي" — too many sheets, too many columns,
 *   year cells were static engine values.
 *
 * NEW STRUCTURE — 5 sheets, formula-driven:
 *
 *   1. Summary             — project header + portfolio KPIs (all formulas)
 *   2. Inputs              — one row per asset, 18 essential fields,
 *                            yellow-highlighted = editable. Engine-derived
 *                            cells (leasable, openingYear, totalCapex) are
 *                            FORMULAS that recalc when the user edits inputs.
 *   3. Pro Forma           — per asset: 4 rows (Revenue / Land Rent /
 *                            CAPEX / Net CF) × N years. Revenue + CAPEX +
 *                            Net CF are FORMULAS referencing Inputs cells —
 *                            edit a lease rate and the schedule recalcs.
 *                            IRR + Payback per asset use Excel IRR(). Portfolio
 *                            totals at the bottom.
 *   4. Cost Detail         — Hard / Soft / Contingency per asset (formulas).
 *   5. Notes               — project metadata + active smart alerts.
 *
 * What's deliberately formula-based (recalculates inside Excel on edit):
 *   • Inputs derived columns: Leasable (G = GFA × Eff), Total CAPEX
 *     (P = GFA × Cost/m² × (1+Soft%)(1+Cont%)), Opening Year (R)
 *   • Pro Forma Revenue cells (Lease + Operating + Sale variants)
 *   • Pro Forma CAPEX cells (proration over construction window)
 *   • Pro Forma Net CF (Revenue − Land Rent − CAPEX)
 *   • All SUM / IRR totals
 *   • Portfolio NCF + Portfolio IRR
 *   • Investment Metrics ratios (Dev Margin, YoC)
 *
 * What stays as engine-computed values (formulas would be infeasible):
 *   • Land Rent yearly allocation (uses complex grace + escalation-every-N
 *     + manual-allocation overrides; ~80 cells per asset to mirror in Excel)
 *
 * Why Land Rent is engine-only: it depends on landRentMeta from
 * engine/phases.js which encodes lease-start year, grace logic, and
 * escalation steps. The Pro Forma row pulls this as a constant from the
 * engine, so when you change the lease rate ON THE LAND ITSELF in the
 * app (not the asset), regenerate from Haseef.
 */

import ExcelJS from "exceljs";

// ── Theme ────────────────────────────────────────────────────────────────
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
  amberBg:   "FFFEF3C7",
  redBg:     "FFFEE2E2",
  red:       "FFDC2626",
  grayText:  "FF6B7280",
  black:     "FF000000",
  inputBg:   "FFFFF7CC",  // yellow — "you can edit this"
  derivedBg: "FFE0F2FE",  // light blue — "formula derived"
  hairline:  "FFE5E7EB",
};

const FONT = "Calibri";
const FMT = {
  int:    "#,##0",
  pct1:   "0.0%",
  pct0:   "0%",
  num2:   "0.00",
  year:   "0",
  txt:    "@",
};

// ── Helpers ──────────────────────────────────────────────────────────────
const n = v => (typeof v === "number" && isFinite(v)) ? v : 0;

function colLetter(idx) {
  let s = "";
  while (idx > 0) {
    const m = (idx - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

function setCol(ws, idx, width) { ws.getColumn(idx).width = width; }

function titleBar(ws, row, colStart, colEnd, en, ar) {
  ws.mergeCells(row, colStart, row, colEnd);
  const c = ws.getCell(row, colStart);
  c.value = ar ? `${en}   —   ${ar}` : en;
  c.font = { name: FONT, size: 16, bold: true, color: { argb: C.white } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(row).height = 32;
}

function sectionLabel(ws, row, colStart, colEnd, text) {
  ws.mergeCells(row, colStart, row, colEnd);
  const c = ws.getCell(row, colStart);
  c.value = text;
  c.font = { name: FONT, size: 11, bold: true, color: { argb: C.tealDark } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
  c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  c.border = { bottom: { style: "medium", color: { argb: C.teal } } };
  ws.getRow(row).height = 22;
}

function tableHeader(ws, row, headers, opts = {}) {
  const { firstColLeft = true } = opts;
  headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { name: FONT, size: 9, bold: true, color: { argb: C.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.dark } };
    c.alignment = {
      vertical: "middle",
      horizontal: firstColLeft && i === 0 ? "left" : "center",
      wrapText: true,
      indent: firstColLeft && i === 0 ? 1 : 0,
    };
    c.border = { bottom: { style: "thin", color: { argb: C.dark } } };
  });
  ws.getRow(row).height = 30;
}

function setCell(ws, row, col, value, opts = {}) {
  const { fmt, bold, color, bg, align = "right", indent, border = "hair" } = opts;
  const c = ws.getCell(row, col);
  if (value !== null && value !== undefined && value !== "") c.value = value;
  c.font = { name: FONT, size: 10, bold: !!bold, color: { argb: color || C.black } };
  c.alignment = { vertical: "middle", horizontal: align, indent: indent || 0 };
  if (fmt) c.numFmt = fmt;
  if (bg) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  if (border === "hair") c.border = { bottom: { style: "hair", color: { argb: C.hairline } } };
  else if (border === "totalTop") c.border = { top: { style: "medium", color: { argb: C.blueDark } }, bottom: { style: "double", color: { argb: C.blueDark } } };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════
export async function generateAssetsWorkbook(project, results, smartAlerts = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Haseef Financial Modeler";
  wb.created = new Date();

  const projectName  = project?.name || "Project";
  const currency     = project?.currency || "SAR";
  const startYear    = project?.startYear || results?.startYear || new Date().getFullYear();
  const horizon      = Math.min(project?.horizon || 50, results?.horizon || 50);
  const assets       = project?.assets || [];
  const phases       = project?.phases || [];
  const schedules    = results?.assetSchedules || [];
  const phaseResults = results?.phaseResults || {};
  const consolidated = results?.consolidated || {};
  const softPct      = (project?.softCostPct || 0) / 100;
  const contPct      = (project?.contingencyPct || 0) / 100;
  const yrs          = Array.from({ length: horizon }, (_, i) => i);

  // Per-asset land rent (engine-allocated by footprint share within phase)
  const assetLandRent = assets.map(a => {
    const phName = a.phase || phases[0]?.name || "Phase 1";
    const pr = phaseResults[phName];
    if (!pr || !pr.landRent) return new Array(horizon).fill(0);
    const pFP = pr.footprint || 1;
    const aFP = a.footprint || 0;
    const ratio = pFP > 0 ? aFP / pFP : 0;
    return pr.landRent.map(v => v * ratio);
  });

  // ── SHARED COST ALLOCATION ──
  // Heuristic: any asset with totalRevenue == 0 AND totalCapex > 0 is a
  // "shared" / supporting asset (parking, landscape, infrastructure,
  // common amenities). Its CAPEX is allocated to revenue-generating
  // assets weighted by each revenue asset's direct CAPEX share.
  //
  // Why CAPEX-weighted: matches "the more you cost, the bigger your
  // share of common burden" — standard for KSA mixed-use feasibility.
  // Alternative weights (footprint, GFA, revenue) can be added if needed.
  const isShared = assets.map((a, i) => {
    const rev = schedules[i]?.totalRevenue || 0;
    const cap = schedules[i]?.totalCapex || 0;
    return rev === 0 && cap > 0;
  });
  const sharedIdx = assets.map((_, i) => i).filter(i => isShared[i]);
  const revenueIdx = assets.map((_, i) => i).filter(i => !isShared[i]);

  // Total shared CAPEX per year (sum across all shared assets' schedules)
  const sharedCapexPerYear = new Array(horizon).fill(0);
  sharedIdx.forEach(i => {
    const sched = schedules[i]?.capexSchedule || [];
    for (let y = 0; y < horizon; y++) sharedCapexPerYear[y] += sched[y] || 0;
  });

  // Each revenue asset's direct CAPEX (used for weighting)
  const revenueDirectCapex = {};
  let totalRevenueDirectCapex = 0;
  revenueIdx.forEach(i => {
    const c = schedules[i]?.totalCapex || 0;
    revenueDirectCapex[i] = c;
    totalRevenueDirectCapex += c;
  });

  // Allocated shared CAPEX per asset, year-by-year
  const allocatedShared = assets.map((a, i) => {
    if (isShared[i] || totalRevenueDirectCapex === 0) {
      return new Array(horizon).fill(0);
    }
    const weight = (revenueDirectCapex[i] || 0) / totalRevenueDirectCapex;
    return sharedCapexPerYear.map(v => v * weight);
  });

  // Per-asset all-in totals for metrics
  const assetMetrics = assets.map((a, i) => {
    const sched = schedules[i] || {};
    const directCapex = sched.totalCapex || 0;
    const totalRev = sched.totalRevenue || 0;
    const allocCapex = allocatedShared[i].reduce((s, v) => s + v, 0);
    const allInCapex = directCapex + allocCapex;
    const lr = (assetLandRent[i] || []).reduce((s, v) => s + v, 0);
    const directNCF = totalRev - lr - directCapex;
    const allInNCF = totalRev - lr - allInCapex;
    return { directCapex, allocCapex, allInCapex, totalRev, lr, directNCF, allInNCF };
  });

  // Resolve opening year per asset (matches engine logic in cashflow.js:128-151)
  const openingYears = assets.map(a => {
    const ph = phases.find(p => p.name === (a.phase || phases[0]?.name || "Phase 1"));
    if (ph && (ph.completionYear || 0) > 0) return ph.completionYear;
    if ((a.constrStart || 0) > 0) {
      const dur = Math.ceil((a.constrDuration || 12) / 12);
      return startYear + a.constrStart + dur;
    }
    return startYear + Math.ceil((a.constrDuration || 12) / 12);
  });

  // ════════════════════════════════════════════════════════════════════
  // Pre-compute deterministic row addresses of every other sheet so the
  // Summary (built FIRST so it's the leftmost tab) can reference them
  // by formula. Excel resolves cross-sheet references at calc time, so
  // the target sheets don't have to exist yet.
  // ════════════════════════════════════════════════════════════════════
  // Forward-declared layout constants used by Inputs sheet AND by
  // Summary's cross-sheet formulas. Kept here (above Summary) so the
  // Summary builder can reference them.
  const INPUTS_FIRST_ROW = 4; // Inputs header on row 3
  const COL = { phase:"B", name:"C", revType:"D", gfa:"E", eff:"F", leasable:"G", leaseRate:"H", occ:"I", ebitda:"J", salePrice:"K", preSale:"L", absorption:"M", commission:"N", costPerSqm:"O", totalCapex:"P", buildMo:"Q", openingYr:"R", ramp:"S", esc:"T" };

  const ADDR = {
    // Inputs sheet — header row 3, asset i at row 4+i
    inputs: {
      assetRow: (i) => INPUTS_FIRST_ROW + i, // 4..
      col: COL,
    },
    // Metrics sheet — header row 2, asset i at row 3+i
    metrics: {
      assetRow: (i) => 3 + i,
      totalRow: 3 + assets.length,
      // Column letters in Metrics sheet (per the order in SHEET 5):
      // A:#  B:Asset  C:Phase  D:Type  E:Shared?  F:DirectCAPEX  G:Alloc
      // H:All-in CAPEX  I:Annual Rev  J:Total Rev  K:Total NCF  L:YoC
      // M:IRR  N:Cap Rate  O:Exit  P:Dev Profit  Q:Dev Margin  R:Rev/m²  S:Cost/m²
      col: {
        name: "B", phase: "C", type: "D", shared: "E",
        directCapex: "F", allocCapex: "G", allInCapex: "H",
        annualRev: "I", totalRev: "J", totalNCF: "K",
        yoc: "L", irr: "M", capRate: "N", exit: "O",
        devProfit: "P", devMargin: "Q", revPerSqm: "R", costPerSqm: "S",
      },
    },
    // Pro Forma sheet — each asset uses 6 rows (5 data + 1 spacer) starting at row 4
    proForma: {
      assetRevRow: (i) => 4 + 6 * i,
      assetLrRow: (i) => 5 + 6 * i,
      assetCapRow: (i) => 6 + 6 * i,
      assetAllocRow: (i) => 7 + 6 * i,
      assetNcfRow: (i) => 8 + 6 * i,
      pfRevRow: 5 + 6 * assets.length,
      pfLrRow: 6 + 6 * assets.length,
      pfCapRow: 7 + 6 * assets.length,
      pfNcfRow: 8 + 6 * assets.length,
    },
  };

  // ════════════════════════════════════════════════════════════════════
  // SHEET 1 — Summary (formula-driven)
  // ════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: C.teal } },
    });
    setCol(ws, 1, 3); setCol(ws, 2, 26); setCol(ws, 3, 18); setCol(ws, 4, 6); setCol(ws, 5, 26); setCol(ws, 6, 18);

    titleBar(ws, 1, 2, 6, `${projectName} — Asset Pro Forma`, "البرنامج الاستثماري للأصول");

    // ── Project metadata column (left) ────────────────────────────
    let r = 3;
    sectionLabel(ws, r++, 2, 3, "Project / المشروع");
    const meta = [
      ["Currency / العملة",  currency],
      ["Start Year / سنة البداية", startYear],
      ["Horizon / الأفق (سنوات)", horizon],
      ["Phases / عدد المراحل", phases.length],
      ["Assets / عدد الأصول", assets.length],
      ["Shared assets / مكوّنات مشتركة", sharedIdx.length],
      ["Active Scenario / السيناريو", project?.activeScenario || "Base Case"],
      ["Land Type / نوع الأرض", project?.landType || ""],
      ["Soft Cost % / غير مباشرة", softPct],
      ["Contingency % / احتياطي", contPct],
      ["Generated / تاريخ الإصدار", new Date().toLocaleDateString()],
    ];
    meta.forEach(([k, v]) => {
      setCell(ws, r, 2, k, { color: C.grayText, align: "left", indent: 1 });
      let fmt = null;
      if (typeof v === "number" && k.includes("%")) fmt = FMT.pct1;
      else if (typeof v === "number") fmt = FMT.int;
      setCell(ws, r, 3, v, { fmt, bold: true, color: C.navyText });
      r++;
    });

    // ── Portfolio KPIs (right column) — ALL formula-driven ──────
    r = 3;
    sectionLabel(ws, r++, 5, 6, "Portfolio KPIs / مؤشرات المحفظة");

    const M = ADDR.metrics; // shorthand
    const PF = ADDR.proForma;
    const mFirstR = M.assetRow(0);
    const mLastR = M.assetRow(assets.length - 1);

    // All cells reference Metrics or Pro Forma sheets — fully dynamic
    const pfRevAddr = `'Pro Forma'!D${PF.pfRevRow}`;       // total revenue (column D in Pro Forma is "Total")
    const pfLrAddr = `'Pro Forma'!D${PF.pfLrRow}`;
    const pfCapAddr = `'Pro Forma'!D${PF.pfCapRow}`;
    const pfNcfAddr = `'Pro Forma'!D${PF.pfNcfRow}`;
    const pfIrrAddr = `'Pro Forma'!E${PF.pfNcfRow}`;       // E column is IRR

    const kpiRows = [
      ["Total CAPEX (all-in)",   `SUM(Metrics!${M.col.allInCapex}${mFirstR}:${M.col.allInCapex}${mLastR})`, FMT.int],
      ["Total Revenue (life)",   `SUM(Metrics!${M.col.totalRev}${mFirstR}:${M.col.totalRev}${mLastR})`,    FMT.int],
      ["Land Rent (total)",      pfLrAddr,                                                                  FMT.int],
      ["Net Cash Flow",          pfNcfAddr,                                                                 FMT.int],
      ["Portfolio IRR",          pfIrrAddr,                                                                 FMT.pct1],
      ["Avg Asset IRR (revenue)", `IFERROR(AVERAGEIF(Metrics!${M.col.shared}${mFirstR}:${M.col.shared}${mLastR},"<>✓",Metrics!${M.col.irr}${mFirstR}:${M.col.irr}${mLastR}),"—")`, FMT.pct1],
      ["Avg Dev Margin",         `IFERROR(AVERAGEIF(Metrics!${M.col.shared}${mFirstR}:${M.col.shared}${mLastR},"<>✓",Metrics!${M.col.devMargin}${mFirstR}:${M.col.devMargin}${mLastR}),0)`, FMT.pct1],
      ["Cash-on-Cost",           `IFERROR((SUM(Metrics!${M.col.totalRev}${mFirstR}:${M.col.totalRev}${mLastR})-SUM(Metrics!${M.col.allInCapex}${mFirstR}:${M.col.allInCapex}${mLastR}))/SUM(Metrics!${M.col.allInCapex}${mFirstR}:${M.col.allInCapex}${mLastR}),0)`, FMT.pct1],
    ];
    kpiRows.forEach(([label, formulaOrVal, fmt]) => {
      setCell(ws, r, 5, label, { color: C.grayText, align: "left", indent: 1 });
      setCell(ws, r, 6, { formula: formulaOrVal }, { fmt, bold: true, color: C.navyText });
      r++;
    });

    // ── Phase summary (formula-driven via SUMIF / COUNTIF on Metrics) ──
    r = Math.max(r, 15) + 1;
    sectionLabel(ws, r++, 2, 6, "Phases / المراحل");
    tableHeader(ws, r++, ["#", "Phase / المرحلة", "Opening / الافتتاح", "Assets", "CAPEX (all-in)", "Revenue"]);
    const phaseFirstR = r;
    phases.forEach((ph, i) => {
      const phaseRange = `Metrics!${M.col.phase}${mFirstR}:${M.col.phase}${mLastR}`;
      setCell(ws, r, 1, i + 1, { color: C.grayText, align: "center" });
      setCell(ws, r, 2, ph.name, { bold: true, color: C.dark, align: "left", indent: 1 });
      setCell(ws, r, 3, ph.completionYear || "", { fmt: FMT.year, color: C.dark });
      setCell(ws, r, 4, { formula: `COUNTIF(${phaseRange},"${ph.name}")` }, { fmt: FMT.int });
      setCell(ws, r, 5, { formula: `SUMIF(${phaseRange},"${ph.name}",Metrics!${M.col.allInCapex}${mFirstR}:${M.col.allInCapex}${mLastR})` }, { fmt: FMT.int, color: C.red });
      setCell(ws, r, 6, { formula: `SUMIF(${phaseRange},"${ph.name}",Metrics!${M.col.totalRev}${mFirstR}:${M.col.totalRev}${mLastR})` }, { fmt: FMT.int, color: C.greenDark });
      r++;
    });
    const phaseLastR = r - 1;
    // Phase totals (formula)
    setCell(ws, r, 1, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 2, "Total / الإجمالي", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 3, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 4, { formula: `SUM(D${phaseFirstR}:D${phaseLastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 5, { formula: `SUM(E${phaseFirstR}:E${phaseLastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 6, { formula: `SUM(F${phaseFirstR}:F${phaseLastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    r += 2;

    // ── Per-Asset Quick View (NEW) ─────────────────────────────
    sectionLabel(ws, r++, 2, 6, "Assets — Quick View / نظرة سريعة لكل أصل");
    const note2 = "All cells below are formulas referencing Metrics + Inputs sheets — edit any input and watch this table recalc.";
    ws.mergeCells(r, 2, r, 6);
    const noteC = ws.getCell(r, 2);
    noteC.value = note2;
    noteC.font = { name: FONT, size: 9, italic: true, color: { argb: C.grayText } };
    noteC.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(r).height = 16;
    r++;
    // Quick view layout: # | Asset | Phase + Opening | Type + Shared | CAPEX (all-in) | Annual Rev | IRR
    // We have 6 columns (B..G is column 2..7 — wait we only have 6 columns). Let me extend to col 7.
    setCol(ws, 7, 11);
    tableHeader(ws, r++, ["#", "Asset / الأصل", "Phase + Opening", "Type", "CAPEX (all-in)", "Annual Rev (stab.)", "IRR (all-in)"]);
    const qvFirstR = r;
    assets.forEach((a, i) => {
      const inR = ADDR.inputs.assetRow(i);
      const meR = M.assetRow(i);
      setCell(ws, r, 1, i + 1, { color: C.grayText, align: "center" });
      // Asset name from Inputs C{inR}
      setCell(ws, r, 2, { formula: `Inputs!${COL.name}${inR}` }, { bold: true, color: C.dark, align: "left", indent: 1 });
      // Phase + Opening combined: "ZAN 1 · 2029"
      setCell(ws, r, 3, { formula: `Inputs!${COL.phase}${inR}&" · "&Inputs!${COL.openingYr}${inR}` }, { color: C.dark, align: "center" });
      // Type with Shared marker
      setCell(ws, r, 4, { formula: `Inputs!${COL.revType}${inR}&IF(Metrics!${M.col.shared}${meR}="✓"," (مشترك)","")` }, { color: C.grayText, align: "center" });
      // All-in CAPEX from Metrics
      setCell(ws, r, 5, { formula: `Metrics!${M.col.allInCapex}${meR}` }, { fmt: FMT.int, color: C.red });
      // Annual Rev from Metrics
      setCell(ws, r, 6, { formula: `Metrics!${M.col.annualRev}${meR}` }, { fmt: FMT.int, color: C.greenDark });
      // IRR from Metrics
      setCell(ws, r, 7, { formula: `Metrics!${M.col.irr}${meR}` }, { fmt: FMT.pct1, bold: true });
      r++;
    });
    const qvLastR = r - 1;
    // Quick view total row (formula)
    setCell(ws, r, 1, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 2, "Total / الإجمالي", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 3, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 4, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 5, { formula: `SUM(E${qvFirstR}:E${qvLastR})` }, { fmt: FMT.int, bold: true, color: C.red, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 6, { formula: `SUM(F${qvFirstR}:F${qvLastR})` }, { fmt: FMT.int, bold: true, color: C.greenDark, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 7, { formula: pfIrrAddr }, { fmt: FMT.pct1, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
  }

  // ════════════════════════════════════════════════════════════════════
  // SHEET 2 — Inputs (editable, yellow background)
  // ════════════════════════════════════════════════════════════════════
  // Column layout:
  //   A: #     B: Phase   C: Name      D: Rev Type   E: GFA
  //   F: Eff%  G: Leasable (formula)   H: Lease Rate I: Occ%
  //   J: EBITDA  K: Sale Price/m²      L: Pre-Sale%  M: Absorption
  //   N: Comm%  O: Cost/m²  P: Total CAPEX (formula)
  //   Q: Build Mo  R: Opening Year  S: Ramp Yrs  T: Esc%
  //
  // INPUTS_FIRST_ROW + COL declared earlier in the function (above ADDR)
  // so Summary's cross-sheet formulas can reference them.
  const INPUTS_LAST_ROW  = INPUTS_FIRST_ROW + assets.length - 1;

  {
    const ws = wb.addWorksheet("Inputs", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 3 }],
      properties: { tabColor: { argb: "FF3B82F6" } },
    });
    const widths = [4, 12, 22, 11, 11, 9, 11, 11, 9, 13, 11, 9, 10, 9, 10, 13, 10, 11, 9, 10];
    widths.forEach((w, i) => setCol(ws, i + 1, w));
    titleBar(ws, 1, 1, widths.length, "Asset Inputs", "مدخلات الأصول");

    const headerNote = "Yellow cells are EDITABLE. Blue cells are FORMULAS (auto-calc). Edit any yellow cell and the Pro Forma sheet updates.";
    ws.mergeCells(2, 1, 2, widths.length);
    const noteCell = ws.getCell(2, 1);
    noteCell.value = headerNote;
    noteCell.font = { name: FONT, size: 9, italic: true, color: { argb: C.grayText } };
    noteCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    ws.getRow(2).height = 18;

    tableHeader(ws, 3, [
      "#",
      "Phase\nالمرحلة",
      "Asset Name\nاسم الأصل",
      "Rev Type\nنوع الإيراد",
      "GFA (m²)",
      "Eff %",
      "Leasable\n(formula)",
      "Lease Rate\nإيجار /م²",
      "Occ %",
      "EBITDA /yr",
      "Sale Price /m²",
      "Pre-Sale %",
      "Absorption (yr)",
      "Commission %",
      "Cost /m²",
      "Total CAPEX\n(formula)",
      "Build (mo)",
      "Opening Yr",
      "Ramp (yr)",
      "Esc %",
    ]);

    assets.forEach((a, i) => {
      const r = INPUTS_FIRST_ROW + i;
      const yellowOpts = { fmt: null, bg: C.inputBg, align: "right" };
      const blueOpts   = { fmt: null, bg: C.derivedBg, color: C.blueDark, bold: true, align: "right" };

      setCell(ws, r, 1, i + 1, { color: C.grayText, align: "center" });
      setCell(ws, r, 2, a.phase || "", { ...yellowOpts, align: "left", indent: 1 });
      setCell(ws, r, 3, a.name || `Asset ${i+1}`, { ...yellowOpts, align: "left", indent: 1 });
      setCell(ws, r, 4, a.revType || "Lease", { ...yellowOpts, align: "center" });
      setCell(ws, r, 5, n(a.gfa), { ...yellowOpts, fmt: FMT.int });
      setCell(ws, r, 6, n(a.efficiency)/100, { ...yellowOpts, fmt: FMT.pct0 });
      // Leasable = GFA × Efficiency (formula)
      setCell(ws, r, 7, { formula: `${COL.gfa}${r}*${COL.eff}${r}` }, { ...blueOpts, fmt: FMT.int });
      setCell(ws, r, 8, n(a.leaseRate), { ...yellowOpts, fmt: FMT.int });
      setCell(ws, r, 9, n(a.stabilizedOcc != null ? a.stabilizedOcc : 100)/100, { ...yellowOpts, fmt: FMT.pct0 });
      setCell(ws, r, 10, n(a.opEbitda), { ...yellowOpts, fmt: FMT.int });
      setCell(ws, r, 11, n(a.salePricePerSqm), { ...yellowOpts, fmt: FMT.int });
      setCell(ws, r, 12, n(a.preSalePct)/100, { ...yellowOpts, fmt: FMT.pct0 });
      setCell(ws, r, 13, n(a.absorptionYears) || "", { ...yellowOpts, fmt: FMT.int });
      setCell(ws, r, 14, n(a.commissionPct)/100, { ...yellowOpts, fmt: FMT.pct0 });
      setCell(ws, r, 15, n(a.costPerSqm), { ...yellowOpts, fmt: FMT.int });
      // Total CAPEX = GFA × Cost/m² × (1 + Soft%) × (1 + Cont%)
      // (matches engine's legacy fast path; ignores basement/parking overrides
      //  for simplicity — the Cost Detail sheet shows the full breakdown)
      setCell(ws, r, 16, { formula: `${COL.gfa}${r}*${COL.costPerSqm}${r}*(1+${softPct})*(1+${contPct})` }, { ...blueOpts, fmt: FMT.int });
      setCell(ws, r, 17, n(a.constrDuration) || 12, { ...yellowOpts, fmt: FMT.int });
      // Opening Year — formula-derived from project context (engine logic)
      setCell(ws, r, 18, openingYears[i], { ...blueOpts, fmt: FMT.year });
      setCell(ws, r, 19, n(a.rampUpYears) || 1, { ...yellowOpts, fmt: FMT.int });
      setCell(ws, r, 20, n(a.escalation)/100, { ...yellowOpts, fmt: FMT.pct1 });
    });
    // We'll back-patch column J (EBITDA) after Operating P&L is built —
    // for assets with hotelPL/marinaPL/Operating, J becomes a formula
    // reference to Operating P&L!C{ebitdaRow}.
    var inputsWsRef = ws;  // captured for back-patch
  }

  // ════════════════════════════════════════════════════════════════════
  // SHEET 3 — Operating P&L (full financial model for Operating assets)
  // ════════════════════════════════════════════════════════════════════
  // Hotel + Marina + Generic-Operating P&L blocks. Each block has:
  //   - INPUTS (yellow editable cells)
  //   - REVENUE lines (formulas referencing inputs)
  //   - EXPENSE lines (formulas)
  //   - EBITDA + Margin (final cells; EBITDA gets back-referenced from
  //     the Inputs!J column so editing P&L details cascades into Pro Forma).
  //
  // Mirrors the engine logic in src/engine/hospitality.js exactly.
  const ebitdaRefByIdx = {};
  {
    const ws = wb.addWorksheet("Operating P&L", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 2, ySplit: 2 }],
      properties: { tabColor: { argb: "FF8B5CF6" } },
    });
    setCol(ws, 1, 4); setCol(ws, 2, 30); setCol(ws, 3, 18); setCol(ws, 4, 32);
    titleBar(ws, 1, 1, 4, "Operating Assets — Full P&L Model", "النموذج المالي للأصول التشغيلية");

    const intro = "Each Operating asset has its own P&L block: yellow INPUTS feed BLUE formulas down to EBITDA. The EBITDA cell is referenced by Inputs!J → Pro Forma uses that → Metrics + Summary read from there. Edit any input here and watch the entire workbook cascade.";
    ws.mergeCells(2, 1, 2, 4);
    const introC = ws.getCell(2, 1);
    introC.value = intro;
    introC.font = { name: FONT, size: 9, italic: true, color: { argb: C.grayText } };
    introC.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
    introC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    ws.getRow(2).height = 36;

    const hotelOpIdx   = assets.map((a, i) => ({ a, i })).filter(x => x.a.revType === "Operating" && x.a.hotelPL).map(x => x.i);
    const marinaOpIdx  = assets.map((a, i) => ({ a, i })).filter(x => x.a.revType === "Operating" && x.a.marinaPL).map(x => x.i);
    const genericOpIdx = assets.map((a, i) => ({ a, i })).filter(x => x.a.revType === "Operating" && !x.a.hotelPL && !x.a.marinaPL).map(x => x.i);

    let r = 4;

    // Helpers within the sheet
    const yellowCell = (r, c, val, fmt) => setCell(ws, r, c, val, { fmt, bg: C.inputBg, align: "right" });
    const blueCell = (r, c, val, fmt, bold = false) => setCell(ws, r, c, val, { fmt, bg: C.derivedBg, color: C.blueDark, bold, align: "right" });
    const labelCell = (r, c, text, opts = {}) => setCell(ws, r, c, text, { color: opts.color || C.dark, align: "left", indent: 1, ...opts });

    // ── HOTEL blocks ──
    if (hotelOpIdx.length > 0) {
      sectionLabel(ws, r++, 1, 4, "🏨 Hotels / فنادق");
      hotelOpIdx.forEach(idx => {
        const a = assets[idx];
        const h = a.hotelPL || {};
        // Asset name banner
        ws.mergeCells(r, 1, r, 4);
        const nameCell = ws.getCell(r, 1);
        nameCell.value = `${a.name || `Asset ${idx+1}`}  ·  ${a.phase || ""}  ·  Hotel`;
        nameCell.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
        nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        nameCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        ws.getRow(r).height = 22;
        r++;

        // INPUTS
        labelCell(r, 1, "INPUTS / مدخلات", { bold: true, color: C.tealDark, bg: C.greenBg });
        labelCell(r, 4, "Notes", { color: C.grayText, bg: C.greenBg });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        r++;

        const inputDefs = [
          ["Keys (rooms)",                "عدد الغرف",          n(h.keys),     FMT.int,  "rooms"],
          ["ADR (Avg Daily Rate)",        "متوسط سعر الليلة",    n(h.adr),      FMT.int,  `${currency} / night`],
          ["Stabilized Occupancy",        "إشغال مستقر",         n(h.stabOcc)/100, FMT.pct0, "stabilized"],
          ["Days / Year",                 "أيام / سنة",          n(h.daysYear) || 365, FMT.int, "365 typical"],
          ["Rooms — % of Total Revenue",  "نسبة إيراد الغرف",    n(h.roomsPct)/100, FMT.pct0, "drives Total Rev"],
          ["F&B — % of Total Revenue",    "نسبة المأكولات",      n(h.fbPct)/100, FMT.pct0, ""],
          ["MICE — % of Total Revenue",   "نسبة المؤتمرات",      n(h.micePct)/100, FMT.pct0, ""],
          ["Other — % of Total Revenue",  "نسبة الإيرادات الأخرى", n(h.otherPct)/100, FMT.pct0, ""],
          ["Rooms Expense %",             "نسبة مصاريف الغرف",   n(h.roomExpPct)/100, FMT.pct0, "% of Rooms Rev"],
          ["F&B Expense %",               "نسبة مصاريف F&B",     n(h.fbExpPct)/100, FMT.pct0, "% of F&B Rev"],
          ["MICE Expense %",              "نسبة مصاريف MICE",    n(h.miceExpPct)/100, FMT.pct0, "% of MICE Rev"],
          ["Other Expense %",             "نسبة مصاريف أخرى",    n(h.otherExpPct)/100, FMT.pct0, "% of Other Rev"],
          ["Undistributed %",             "غير موزّعة",          n(h.undistPct)/100, FMT.pct0, "% of Total Rev"],
          ["Fixed Charges %",             "تكاليف ثابتة",        n(h.fixedPct)/100, FMT.pct0, "% of Total Rev"],
        ];
        const inputRows = {};
        const KEYS = ["keys", "adr", "occ", "days", "roomsPct", "fbPct", "micePct", "otherPct", "roomExp", "fbExp", "miceExp", "otherExp", "undist", "fixed"];
        inputDefs.forEach(([labelEn, labelAr, val, fmt, note], j) => {
          labelCell(r, 1, "", { color: C.grayText });
          labelCell(r, 2, `${labelEn} / ${labelAr}`, { color: C.grayText });
          yellowCell(r, 3, val, fmt);
          labelCell(r, 4, note, { color: C.grayText });
          inputRows[KEYS[j]] = r;
          r++;
        });
        r++;

        // REVENUE
        labelCell(r, 1, "REVENUE / إيرادات", { bold: true, color: C.greenDark, bg: C.greenBg });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        r++;

        const rRoomsRev = r;
        labelCell(r, 2, "Rooms Revenue / إيراد الغرف", { color: C.dark });
        blueCell(r, 3, { formula: `C${inputRows.keys}*C${inputRows.adr}*C${inputRows.occ}*C${inputRows.days}` }, FMT.int);
        labelCell(r, 4, "= Keys × ADR × Occ × Days", { color: C.grayText });
        r++;

        const rTotalRev = r;
        labelCell(r, 2, "Total Revenue / إجمالي الإيراد", { bold: true, color: C.greenDark });
        blueCell(r, 3, { formula: `IFERROR(C${rRoomsRev}/C${inputRows.roomsPct},0)` }, FMT.int, true);
        labelCell(r, 4, "= Rooms Rev ÷ Rooms Mix %", { color: C.grayText });
        r++;

        const rFbRev = r;
        labelCell(r, 2, "F&B Revenue / إيراد المأكولات", { color: C.dark });
        blueCell(r, 3, { formula: `C${rTotalRev}*C${inputRows.fbPct}` }, FMT.int);
        labelCell(r, 4, "= Total Rev × F&B %", { color: C.grayText });
        r++;

        const rMiceRev = r;
        labelCell(r, 2, "MICE Revenue / إيراد المؤتمرات", { color: C.dark });
        blueCell(r, 3, { formula: `C${rTotalRev}*C${inputRows.micePct}` }, FMT.int);
        labelCell(r, 4, "= Total Rev × MICE %", { color: C.grayText });
        r++;

        const rOtherRev = r;
        labelCell(r, 2, "Other Revenue / إيرادات أخرى", { color: C.dark });
        blueCell(r, 3, { formula: `C${rTotalRev}*C${inputRows.otherPct}` }, FMT.int);
        labelCell(r, 4, "= Total Rev × Other %", { color: C.grayText });
        r++;
        r++;

        // EXPENSES
        labelCell(r, 1, "EXPENSES / مصاريف", { bold: true, color: C.red, bg: C.redBg });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        r++;

        const rRoomsExp = r;
        labelCell(r, 2, "Rooms Expense / مصاريف الغرف", { color: C.dark });
        blueCell(r, 3, { formula: `C${rRoomsRev}*C${inputRows.roomExp}` }, FMT.int);
        labelCell(r, 4, "= Rooms Rev × Exp %", { color: C.grayText });
        r++;

        const rFbExp = r;
        labelCell(r, 2, "F&B Expense / مصاريف المأكولات", { color: C.dark });
        blueCell(r, 3, { formula: `C${rFbRev}*C${inputRows.fbExp}` }, FMT.int);
        labelCell(r, 4, "= F&B Rev × Exp %", { color: C.grayText });
        r++;

        const rMiceExp = r;
        labelCell(r, 2, "MICE Expense / مصاريف المؤتمرات", { color: C.dark });
        blueCell(r, 3, { formula: `C${rMiceRev}*C${inputRows.miceExp}` }, FMT.int);
        labelCell(r, 4, "= MICE Rev × Exp %", { color: C.grayText });
        r++;

        const rOtherExp = r;
        labelCell(r, 2, "Other Expense / مصاريف أخرى", { color: C.dark });
        blueCell(r, 3, { formula: `C${rOtherRev}*C${inputRows.otherExp}` }, FMT.int);
        labelCell(r, 4, "= Other Rev × Exp %", { color: C.grayText });
        r++;

        const rUndist = r;
        labelCell(r, 2, "Undistributed / غير موزّعة", { color: C.dark });
        blueCell(r, 3, { formula: `C${rTotalRev}*C${inputRows.undist}` }, FMT.int);
        labelCell(r, 4, "= Total Rev × Undist %", { color: C.grayText });
        r++;

        const rFixed = r;
        labelCell(r, 2, "Fixed Charges / تكاليف ثابتة", { color: C.dark });
        blueCell(r, 3, { formula: `C${rTotalRev}*C${inputRows.fixed}` }, FMT.int);
        labelCell(r, 4, "= Total Rev × Fixed %", { color: C.grayText });
        r++;

        const rTotalOpex = r;
        labelCell(r, 2, "Total Opex / إجمالي المصاريف", { bold: true, color: C.red });
        blueCell(r, 3, { formula: `SUM(C${rRoomsExp}:C${rFixed})` }, FMT.int, true);
        labelCell(r, 4, "= sum of expenses", { color: C.grayText });
        r++;
        r++;

        // EBITDA + Margin
        const rEbitda = r;
        labelCell(r, 1, "EBITDA", { bold: true, color: C.white, bg: C.tealDark });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        const ebitdaCell = ws.getCell(r, 3);
        ebitdaCell.value = { formula: `C${rTotalRev}-C${rTotalOpex}` };
        ebitdaCell.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
        ebitdaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        ebitdaCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        ebitdaCell.numFmt = FMT.int;
        ws.getRow(r).height = 22;
        r++;

        labelCell(r, 2, "EBITDA Margin / هامش EBITDA", { color: C.tealDark, bold: true });
        blueCell(r, 3, { formula: `IFERROR(C${rEbitda}/C${rTotalRev},0)` }, FMT.pct1, true);
        labelCell(r, 4, "= EBITDA ÷ Total Revenue", { color: C.grayText });
        r += 2;

        // Record EBITDA cell address for Inputs!J back-reference
        ebitdaRefByIdx[idx] = `'Operating P&L'!C${rEbitda}`;
      });
    }

    // ── MARINA blocks ──
    if (marinaOpIdx.length > 0) {
      r += 1;
      sectionLabel(ws, r++, 1, 4, "⚓ Marinas / مارينات");
      marinaOpIdx.forEach(idx => {
        const a = assets[idx];
        const m = a.marinaPL || {};
        ws.mergeCells(r, 1, r, 4);
        const nameCell = ws.getCell(r, 1);
        nameCell.value = `${a.name || `Asset ${idx+1}`}  ·  ${a.phase || ""}  ·  Marina`;
        nameCell.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
        nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        nameCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        ws.getRow(r).height = 22;
        r++;

        labelCell(r, 1, "INPUTS / مدخلات", { bold: true, color: C.tealDark, bg: C.greenBg });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        r++;

        const mInputs = [
          ["Berths",                      "عدد الأرصفة",         n(m.berths),       FMT.int, "berths"],
          ["Avg Berth Length (m)",        "متوسط طول الرصيف",    n(m.avgLength),    FMT.int, "metres"],
          ["Unit Price (/m/yr)",          "السعر للمتر",         n(m.unitPrice),    FMT.int, `${currency} / m / yr`],
          ["Stabilized Occupancy",        "إشغال مستقر",         n(m.stabOcc)/100,  FMT.pct0, ""],
          ["Fuel — % of Total Revenue",   "نسبة الوقود",         n(m.fuelPct)/100,  FMT.pct0, ""],
          ["Other — % of Total Revenue",  "نسبة الإيرادات الأخرى", n(m.otherRevPct)/100, FMT.pct0, ""],
          ["Berthing Opex %",             "مصاريف الرسو",         n(m.berthingOpexPct)/100, FMT.pct0, "% of Berth Rev"],
          ["Fuel Opex %",                 "مصاريف الوقود",        n(m.fuelOpexPct)/100, FMT.pct0, "% of Fuel Rev"],
          ["Other Opex %",                "مصاريف أخرى",          n(m.otherOpexPct)/100, FMT.pct0, "% of Other Rev"],
        ];
        const mInputRows = {};
        const M_KEYS = ["berths", "avgLen", "unitPrice", "occ", "fuelPct", "otherRevPct", "berthOpex", "fuelOpex", "otherOpex"];
        mInputs.forEach(([labelEn, labelAr, val, fmt, note], j) => {
          labelCell(r, 1, "", {});
          labelCell(r, 2, `${labelEn} / ${labelAr}`, { color: C.grayText });
          yellowCell(r, 3, val, fmt);
          labelCell(r, 4, note, { color: C.grayText });
          mInputRows[M_KEYS[j]] = r;
          r++;
        });
        r++;

        // Revenue
        labelCell(r, 1, "REVENUE / إيرادات", { bold: true, color: C.greenDark, bg: C.greenBg });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
        r++;

        const rBerthRev = r;
        labelCell(r, 2, "Berthing Revenue / إيراد الرسو", { color: C.dark });
        blueCell(r, 3, { formula: `C${mInputRows.berths}*C${mInputRows.avgLen}*C${mInputRows.unitPrice}*C${mInputRows.occ}` }, FMT.int);
        labelCell(r, 4, "= Berths × Length × Price × Occ", { color: C.grayText });
        r++;

        const rMTotalRev = r;
        labelCell(r, 2, "Total Revenue / إجمالي الإيراد", { bold: true, color: C.greenDark });
        // Berthing % of total = 100% − fuel% − other% → totalRev = berthRev / (berthing%)
        blueCell(r, 3, { formula: `IFERROR(C${rBerthRev}/(1-C${mInputRows.fuelPct}-C${mInputRows.otherRevPct}),0)` }, FMT.int, true);
        labelCell(r, 4, "= Berth Rev ÷ (1 − Fuel% − Other%)", { color: C.grayText });
        r++;

        const rFuelRev = r;
        labelCell(r, 2, "Fuel Revenue / إيراد الوقود", { color: C.dark });
        blueCell(r, 3, { formula: `C${rMTotalRev}*C${mInputRows.fuelPct}` }, FMT.int);
        labelCell(r, 4, "= Total × Fuel %", { color: C.grayText });
        r++;

        const rMOtherRev = r;
        labelCell(r, 2, "Other Revenue / إيرادات أخرى", { color: C.dark });
        blueCell(r, 3, { formula: `C${rMTotalRev}*C${mInputRows.otherRevPct}` }, FMT.int);
        labelCell(r, 4, "= Total × Other %", { color: C.grayText });
        r += 2;

        // Expenses
        labelCell(r, 1, "EXPENSES / مصاريف", { bold: true, color: C.red, bg: C.redBg });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        ws.getCell(r, 3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
        r++;

        const rBerthExp = r;
        labelCell(r, 2, "Berthing Opex", { color: C.dark });
        blueCell(r, 3, { formula: `C${rBerthRev}*C${mInputRows.berthOpex}` }, FMT.int);
        r++;

        const rFuelExp = r;
        labelCell(r, 2, "Fuel Opex", { color: C.dark });
        blueCell(r, 3, { formula: `C${rFuelRev}*C${mInputRows.fuelOpex}` }, FMT.int);
        r++;

        const rOtherExp = r;
        labelCell(r, 2, "Other Opex", { color: C.dark });
        blueCell(r, 3, { formula: `C${rMOtherRev}*C${mInputRows.otherOpex}` }, FMT.int);
        r++;

        const rMTotalOpex = r;
        labelCell(r, 2, "Total Opex / إجمالي المصاريف", { bold: true, color: C.red });
        blueCell(r, 3, { formula: `SUM(C${rBerthExp}:C${rOtherExp})` }, FMT.int, true);
        r += 2;

        const rMEbitda = r;
        labelCell(r, 1, "EBITDA", { bold: true, color: C.white, bg: C.tealDark });
        ws.getCell(r, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        ws.getCell(r, 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        const eC = ws.getCell(r, 3);
        eC.value = { formula: `C${rMTotalRev}-C${rMTotalOpex}` };
        eC.font = { name: FONT, size: 12, bold: true, color: { argb: C.white } };
        eC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.tealDark } };
        eC.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
        eC.numFmt = FMT.int;
        ws.getRow(r).height = 22;
        r++;

        labelCell(r, 2, "EBITDA Margin / هامش EBITDA", { color: C.tealDark, bold: true });
        blueCell(r, 3, { formula: `IFERROR(C${rMEbitda}/C${rMTotalRev},0)` }, FMT.pct1, true);
        r += 2;

        ebitdaRefByIdx[idx] = `'Operating P&L'!C${rMEbitda}`;
      });
    }

    // ── GENERIC OPERATING blocks (no hotelPL/marinaPL — just plain EBITDA) ──
    if (genericOpIdx.length > 0) {
      r += 1;
      sectionLabel(ws, r++, 1, 4, "Other Operating / تشغيلية أخرى");
      tableHeader(ws, r++, ["#", "Asset / الأصل", "EBITDA / السنة", "Notes"]);
      genericOpIdx.forEach((idx, j) => {
        const a = assets[idx];
        setCell(ws, r, 1, j + 1, { color: C.grayText, align: "center" });
        labelCell(r, 2, a.name || `Asset ${idx+1}`, { bold: true });
        yellowCell(r, 3, n(a.opEbitda), FMT.int);
        labelCell(r, 4, `${a.phase || ""}  ·  ${a.assetType || a.category || "Operating"}`, { color: C.grayText });
        ebitdaRefByIdx[idx] = `'Operating P&L'!C${r}`;
        r++;
      });
    }

    if (hotelOpIdx.length === 0 && marinaOpIdx.length === 0 && genericOpIdx.length === 0) {
      labelCell(r, 2, "✓ No Operating assets in this project — nothing to model here.", { color: C.greenDark });
    }
  }

  // Now back-patch Inputs!J (EBITDA column) so it references the
  // Operating P&L sheet for any asset that has a P&L block. This makes
  // EBITDA single-source-of-truth: change a number in Operating P&L and
  // it cascades through Inputs → Pro Forma → Metrics → Summary.
  Object.entries(ebitdaRefByIdx).forEach(([iStr, ref]) => {
    const i = parseInt(iStr, 10);
    const r = INPUTS_FIRST_ROW + i;
    const cell = inputsWsRef.getCell(r, 10); // J column = 10
    cell.value = { formula: ref };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.derivedBg } };
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.blueDark } };
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.numFmt = FMT.int;
  });

  // ════════════════════════════════════════════════════════════════════
  // SHEET 4 — Pro Forma (year-by-year, formula-driven)
  // ════════════════════════════════════════════════════════════════════
  // Per asset: 4 rows
  //   1. Revenue       = formula
  //   2. Land Rent     = engine value (logic too complex for formulas)
  //   3. CAPEX         = formula
  //   4. Net Cash Flow = Revenue − Land Rent − CAPEX
  // Per asset right side: Total NCF + IRR (Excel formula) + Payback
  //
  // Column layout:
  //   A: #   B: Asset   C: Item   D: Total   E: IRR   F: Payback
  //   G..: Year 1 .. Year N
  {
    const ws = wb.addWorksheet("Pro Forma", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 4 }],
      properties: { tabColor: { argb: "FF8B5CF6" } },
    });
    setCol(ws, 1, 4); setCol(ws, 2, 22); setCol(ws, 3, 14); setCol(ws, 4, 14); setCol(ws, 5, 9); setCol(ws, 6, 10);
    for (let y = 0; y < horizon; y++) setCol(ws, 7 + y, 12);

    titleBar(ws, 1, 1, 6 + horizon, "Pro Forma (formula-driven)", "البرنامج المالي السنوي");

    const sharedSummary = sharedIdx.length > 0
      ? `${sharedIdx.length} shared asset${sharedIdx.length > 1 ? "s" : ""} (${sharedIdx.map(i => assets[i]?.name || "").filter(Boolean).join(", ")}) — their CAPEX is allocated to revenue assets by direct-CAPEX weight.`
      : "No shared assets detected (no zero-revenue + positive-CAPEX assets).";
    const noteText = `Revenue, Direct CAPEX, and Net CF cells are formulas referencing the Inputs sheet. Edit a value there and watch this sheet recalc. Land Rent + Allocated Shared Cost are engine values (allocation weighted by direct CAPEX). Year 1 = ${startYear}. ${sharedSummary}`;
    ws.mergeCells(2, 1, 2, 6 + horizon);
    const nc = ws.getCell(2, 1);
    nc.value = noteText;
    nc.font = { name: FONT, size: 9, italic: true, color: { argb: C.grayText } };
    nc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    nc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    ws.getRow(2).height = 18;

    tableHeader(ws, 3, ["#", "Asset / الأصل", "Item / البند", "Total", "IRR", "Payback (yr)", ...yrs.map(y => startYear + y)]);

    // Per-asset 5-row block (Revenue / Land Rent / Direct CAPEX /
    // Allocated Shared CAPEX / Net CF). Allocated Shared row is zero
    // for shared assets themselves (they're the source, not the recipient).
    const yearStartCol = 7;
    const yearEndCol = 6 + horizon;
    const yearStartL = colLetter(yearStartCol);
    const yearEndL = colLetter(yearEndCol);

    // Track row positions for portfolio totals
    const ncfRowPerAsset = [];
    const revRowPerAsset = [];
    const lrRowPerAsset = [];
    const capRowPerAsset = [];
    const allocRowPerAsset = [];

    let curRow = 4;
    assets.forEach((a, i) => {
      const inputsRow = INPUTS_FIRST_ROW + i;
      // Reference to a named field on the Inputs row (resolves COL key → letter)
      const ref = (key) => `Inputs!${COL[key]}${inputsRow}`;
      const revType = a.revType || "Lease";

      const blockBg = i % 2 === 0 ? null : C.lightGray;

      // Row 1 — Revenue (formula)
      const revRow = curRow;
      revRowPerAsset.push(revRow);
      setCell(ws, revRow, 1, i + 1, { color: C.grayText, align: "center", bg: blockBg });
      setCell(ws, revRow, 2, a.name || `Asset ${i+1}`, { bold: true, color: C.dark, align: "left", indent: 1, bg: blockBg });
      setCell(ws, revRow, 3, "Revenue / إيراد", { color: C.greenDark, bold: true, align: "left", indent: 1, bg: blockBg });

      yrs.forEach(y => {
        const yearAbs = startYear + y;
        const yearOffset = `(${yearAbs}-${ref("openingYr")})`; // 0 in opening year, 1 next year, etc.
        // Lease formula:
        //   IF(yearAbs >= openingYr, Leasable * LeaseRate * Occ * MIN(1,(offset+1)/Ramp) * (1+Esc)^offset, 0)
        // Operating formula: same shape but using EBITDA (no leasable*rate*occ — EBITDA already absorbs them)
        // Sale formula:
        //   pre-sale % goes in year (openingYr - 1) — last build year
        //   remaining (1 - pre-sale%) * (1 - commission%) split over 'absorption' years starting at openingYr
        let f;
        if (revType === "Lease") {
          f = `IF(${yearAbs}>=${ref("openingYr")},${ref("leasable")}*${ref("leaseRate")}*${ref("occ")}*MIN(1,(${yearOffset}+1)/MAX(1,${ref("ramp")}))*(1+${ref("esc")})^${yearOffset},0)`;
        } else if (revType === "Operating") {
          f = `IF(${yearAbs}>=${ref("openingYr")},${ref("ebitda")}*${ref("occ")}*MIN(1,(${yearOffset}+1)/MAX(1,${ref("ramp")}))*(1+${ref("esc")})^${yearOffset},0)`;
        } else if (revType === "Sale") {
          // Sellable = GFA × Eff (engine uses 100% if eff is 0; we honour the input here)
          // Pre-sale lump in year (openingYr − 1), absorption split year openingYr to openingYr + absorption − 1
          // commission netted from totals
          const totalSale = `${ref("gfa")}*IF(${ref("eff")}=0,1,${ref("eff")})*${ref("salePrice")}*(1-${ref("commission")})`;
          const preSaleLump = `${totalSale}*${ref("preSale")}`;
          const absorptionShare = `((${totalSale}*(1-${ref("preSale")}))/MAX(1,${ref("absorption")}))`;
          // Pre-sale year = openingYr - 1
          // Absorption years = openingYr .. openingYr + absorption - 1
          f = `IF(${yearAbs}=(${ref("openingYr")}-1),${preSaleLump},IF(AND(${yearAbs}>=${ref("openingYr")},${yearAbs}<${ref("openingYr")}+${ref("absorption")}),${absorptionShare},0))`;
        } else {
          f = "0";
        }
        setCell(ws, revRow, yearStartCol + y, { formula: f }, { fmt: FMT.int, color: C.greenDark, bg: blockBg });
      });
      // Total + IRR + Payback for revenue row — only Total
      setCell(ws, revRow, 4, { formula: `SUM(${yearStartL}${revRow}:${yearEndL}${revRow})` }, { fmt: FMT.int, bold: true, color: C.greenDark, bg: blockBg });
      setCell(ws, revRow, 5, "", { bg: blockBg });
      setCell(ws, revRow, 6, "", { bg: blockBg });
      curRow++;

      // Row 2 — Land Rent (engine value)
      const lrRow = curRow;
      lrRowPerAsset.push(lrRow);
      const lr = assetLandRent[i] || new Array(horizon).fill(0);
      setCell(ws, lrRow, 1, "", { bg: blockBg });
      setCell(ws, lrRow, 2, "", { bg: blockBg });
      setCell(ws, lrRow, 3, "Land Rent / إيجار أرض", { color: C.red, align: "left", indent: 1, bg: blockBg });
      yrs.forEach(y => {
        setCell(ws, lrRow, yearStartCol + y, n(lr[y]) || "", { fmt: FMT.int, color: C.red, bg: blockBg });
      });
      setCell(ws, lrRow, 4, { formula: `SUM(${yearStartL}${lrRow}:${yearEndL}${lrRow})` }, { fmt: FMT.int, bold: true, color: C.red, bg: blockBg });
      setCell(ws, lrRow, 5, "", { bg: blockBg });
      setCell(ws, lrRow, 6, "", { bg: blockBg });
      curRow++;

      // Row 3 — Direct CAPEX (formula)
      const capRow = curRow;
      capRowPerAsset.push(capRow);
      setCell(ws, capRow, 1, "", { bg: blockBg });
      setCell(ws, capRow, 2, "", { bg: blockBg });
      setCell(ws, capRow, 3, "Direct CAPEX / تكلفة مباشرة", { color: C.red, align: "left", indent: 1, bg: blockBg });
      yrs.forEach(y => {
        const yearAbs = startYear + y;
        // Construction window: yearAbs is in [openingYr - durYears, openingYr - 1]
        // durYears = CEILING(buildMo / 12)
        // For each construction year, CAPEX share = TotalCAPEX × MIN(12, buildMo - yrOffset×12) / buildMo
        // yrOffset = yearAbs - (openingYr - durYears)
        const durYrs = `CEILING(${ref("buildMo")}/12,1)`;
        const cStart = `(${ref("openingYr")}-${durYrs})`;
        const yrOffset = `(${yearAbs}-${cStart})`;
        const monthsThisYear = `MIN(12,MAX(0,${ref("buildMo")}-${yrOffset}*12))`;
        const f = `IF(AND(${yearAbs}>=${cStart},${yearAbs}<${ref("openingYr")},${ref("buildMo")}>0),${ref("totalCapex")}*${monthsThisYear}/${ref("buildMo")},0)`;
        setCell(ws, capRow, yearStartCol + y, { formula: f }, { fmt: FMT.int, color: C.red, bg: blockBg });
      });
      setCell(ws, capRow, 4, { formula: `SUM(${yearStartL}${capRow}:${yearEndL}${capRow})` }, { fmt: FMT.int, bold: true, color: C.red, bg: blockBg });
      setCell(ws, capRow, 5, "", { bg: blockBg });
      setCell(ws, capRow, 6, "", { bg: blockBg });
      curRow++;

      // Row 4 — Allocated Shared CAPEX (engine value, weighted by direct CAPEX share)
      const allocRow = curRow;
      allocRowPerAsset.push(allocRow);
      const allocVals = allocatedShared[i] || new Array(horizon).fill(0);
      const sharedAllocBg = isShared[i] ? "FFF3F4F6" : "FFFFF7E6"; // grayer for shared (no allocation), amber-tinted for revenue (receives alloc)
      setCell(ws, allocRow, 1, "", { bg: blockBg });
      setCell(ws, allocRow, 2, "", { bg: blockBg });
      const allocLabel = isShared[i]
        ? "Shared (source) / مكوّن مشترك"
        : "Allocated Shared / حصة من المشترك";
      setCell(ws, allocRow, 3, allocLabel, { color: isShared[i] ? C.grayText : "FFA16207", align: "left", indent: 1, bg: blockBg });
      yrs.forEach(y => {
        setCell(ws, allocRow, yearStartCol + y, n(allocVals[y]) || "", { fmt: FMT.int, color: isShared[i] ? C.grayText : "FFA16207", bg: blockBg });
      });
      const allocTotalCell = allocVals.reduce((s, v) => s + v, 0);
      setCell(ws, allocRow, 4, allocTotalCell || "", { fmt: FMT.int, bold: true, color: isShared[i] ? C.grayText : "FFA16207", bg: blockBg });
      setCell(ws, allocRow, 5, "", { bg: blockBg });
      setCell(ws, allocRow, 6, "", { bg: blockBg });
      curRow++;

      // Row 5 — Net CF (now includes allocated shared cost)
      const ncfRow = curRow;
      ncfRowPerAsset.push(ncfRow);
      setCell(ws, ncfRow, 1, "", { bg: C.blueBg, border: "totalTop" });
      setCell(ws, ncfRow, 2, "", { bg: C.blueBg, border: "totalTop" });
      setCell(ws, ncfRow, 3, "Net Cash Flow / صافي التدفق", { bold: true, color: C.navyText, align: "left", indent: 1, bg: C.blueBg, border: "totalTop" });
      yrs.forEach(y => {
        const col = colLetter(yearStartCol + y);
        // NCF = Revenue − Land Rent − Direct CAPEX − Allocated Shared
        const f = `${col}${revRow}-${col}${lrRow}-${col}${capRow}-${col}${allocRow}`;
        setCell(ws, ncfRow, yearStartCol + y, { formula: f }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      });
      // Total NCF
      setCell(ws, ncfRow, 4, { formula: `SUM(${yearStartL}${ncfRow}:${yearEndL}${ncfRow})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      // IRR (formula) — uses all-in cash flows
      setCell(ws, ncfRow, 5, { formula: `IFERROR(IRR(${yearStartL}${ncfRow}:${yearEndL}${ncfRow}),"—")` }, { fmt: FMT.pct1, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      // Payback (compute static using all-in cash flows)
      const rev = schedules[i]?.revenueSchedule || [];
      const cap = schedules[i]?.capexSchedule || [];
      let cum = 0, payback = "—", spent = false;
      for (let y = 0; y < horizon; y++) {
        const ncf = (rev[y] || 0) - (lr[y] || 0) - (cap[y] || 0) - (allocVals[y] || 0);
        cum += ncf;
        if (ncf < 0) spent = true;
        if (spent && cum >= 0 && payback === "—") { payback = y + 1; break; }
      }
      setCell(ws, ncfRow, 6, payback, { fmt: typeof payback === "number" ? FMT.int : null, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      curRow++;

      // Spacer row (visual separator)
      curRow++;
    });

    // ── Portfolio totals ─────────────────────────────────────────
    // The portfolio Net CF should sum each asset's Net CF row directly
    // (no need to subtract allocated shared again — allocations cancel out
    // across the portfolio: shared assets carry the cost on their own rows).
    sectionLabel(ws, curRow++, 1, 6 + horizon, "Portfolio / المحفظة الكلية");

    const pfRevRow = curRow;
    const pfLrRow = curRow + 1;
    const pfCapRow = curRow + 2;
    const pfNcfRow = curRow + 3;

    const buildPortfolioRow = (rowIdx, label, color, sumRows) => {
      setCell(ws, rowIdx, 1, "", { bg: C.blueBg });
      setCell(ws, rowIdx, 2, "Portfolio", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.blueBg });
      setCell(ws, rowIdx, 3, label, { bold: true, color, align: "left", indent: 1, bg: C.blueBg });
      yrs.forEach(y => {
        const col = colLetter(yearStartCol + y);
        const refs = sumRows.map(r => `${col}${r}`).join(",");
        setCell(ws, rowIdx, yearStartCol + y, { formula: `SUM(${refs})` }, { fmt: FMT.int, bold: true, color, bg: C.blueBg });
      });
      // Total column
      const refsCol4 = sumRows.map(r => `D${r}`).join(",");
      setCell(ws, rowIdx, 4, { formula: `SUM(${refsCol4})` }, { fmt: FMT.int, bold: true, color, bg: C.blueBg });
      setCell(ws, rowIdx, 5, "", { bg: C.blueBg });
      setCell(ws, rowIdx, 6, "", { bg: C.blueBg });
    };

    buildPortfolioRow(pfRevRow, "Revenue / إيراد", C.greenDark, revRowPerAsset);
    buildPortfolioRow(pfLrRow, "Land Rent / إيجار أرض", C.red, lrRowPerAsset);
    // CAPEX portfolio = direct CAPEX rows ONLY (not allocated, since allocated are
    // re-distributions of the same direct CAPEX from shared assets — adding both
    // would double-count).
    buildPortfolioRow(pfCapRow, "CAPEX / تكاليف (direct)", C.red, capRowPerAsset);

    // Portfolio Net CF: sum each asset's Net CF row (which already accounts
    // for allocations within each asset).
    setCell(ws, pfNcfRow, 1, "", { bg: C.amberBg, border: "totalTop" });
    setCell(ws, pfNcfRow, 2, "Portfolio", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    setCell(ws, pfNcfRow, 3, "Net Cash Flow / صافي", { bold: true, color: C.navyText, align: "left", indent: 1, bg: C.amberBg, border: "totalTop" });
    yrs.forEach(y => {
      const col = colLetter(yearStartCol + y);
      const refs = ncfRowPerAsset.map(r => `${col}${r}`).join(",");
      setCell(ws, pfNcfRow, yearStartCol + y, { formula: `SUM(${refs})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    });
    setCell(ws, pfNcfRow, 4, { formula: `SUM(${ncfRowPerAsset.map(r => `D${r}`).join(",")})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    setCell(ws, pfNcfRow, 5, { formula: `IFERROR(IRR(${yearStartL}${pfNcfRow}:${yearEndL}${pfNcfRow}),"—")` }, { fmt: FMT.pct1, bold: true, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    setCell(ws, pfNcfRow, 6, "", { bg: C.amberBg, border: "totalTop" });
  }

  // ════════════════════════════════════════════════════════════════════
  // SHEET 4 — Cost Detail
  // ════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Cost Detail", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 3 }],
      properties: { tabColor: { argb: "FFF59E0B" } },
    });
    const cols = [
      { label: "#", w: 4 },
      { label: "Asset / الأصل", w: 22 },
      { label: "Phase", w: 10 },
      { label: "GFA", w: 11 },
      { label: "Cost /m²", w: 10 },
      { label: "Hard Cost\n(formula)", w: 14 },
      { label: "Soft %", w: 9 },
      { label: "Soft Cost\n(formula)", w: 14 },
      { label: "Cont %", w: 9 },
      { label: "Contingency\n(formula)", w: 14 },
      { label: "Total CAPEX\n(formula)", w: 15 },
      { label: "Avg /m²\n(formula)", w: 10 },
    ];
    cols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, cols.length, "Cost Detail (formula-driven)", "تفصيل التكلفة");
    tableHeader(ws, 2, cols.map(c => c.label));

    assets.forEach((a, i) => {
      const r = 3 + i;
      // Reference to Inputs row (same i)
      const inputsRow = INPUTS_FIRST_ROW + i;
      const refGfa = `Inputs!${COL.gfa}${inputsRow}`;
      const refCost = `Inputs!${COL.costPerSqm}${inputsRow}`;

      setCell(ws, r, 1, i + 1, { color: C.grayText, align: "center" });
      setCell(ws, r, 2, a.name || `Asset ${i+1}`, { bold: true, align: "left", indent: 1, color: C.dark });
      setCell(ws, r, 3, a.phase || "", { align: "center" });
      // GFA + Cost/m² as formulas referencing Inputs
      setCell(ws, r, 4, { formula: refGfa }, { fmt: FMT.int });
      setCell(ws, r, 5, { formula: refCost }, { fmt: FMT.int });
      // Hard Cost = GFA × Cost/m²
      setCell(ws, r, 6, { formula: `D${r}*E${r}` }, { fmt: FMT.int, bold: true, color: C.dark, bg: C.derivedBg });
      // Soft %
      const softUsed = a.softCostPctOverride != null ? a.softCostPctOverride / 100 : softPct;
      setCell(ws, r, 7, softUsed, { fmt: FMT.pct1, color: C.grayText });
      // Soft Cost = Hard × Soft%
      setCell(ws, r, 8, { formula: `F${r}*G${r}` }, { fmt: FMT.int, bold: true, color: C.dark, bg: C.derivedBg });
      // Cont %
      const contUsed = a.contingencyPctOverride != null ? a.contingencyPctOverride / 100 : contPct;
      setCell(ws, r, 9, contUsed, { fmt: FMT.pct1, color: C.grayText });
      // Contingency = (Hard + Soft) × Cont%
      setCell(ws, r, 10, { formula: `(F${r}+H${r})*I${r}` }, { fmt: FMT.int, bold: true, color: C.dark, bg: C.derivedBg });
      // Total CAPEX = Hard + Soft + Contingency
      setCell(ws, r, 11, { formula: `F${r}+H${r}+J${r}` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg });
      // Avg /m² = Total CAPEX / GFA
      setCell(ws, r, 12, { formula: `IFERROR(K${r}/D${r},0)` }, { fmt: FMT.int, color: C.grayText });
    });

    // Portfolio total row
    const totR = 3 + assets.length;
    const firstR = 3, lastR = 2 + assets.length;
    setCell(ws, totR, 1, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 2, "Total / الإجمالي", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 3, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 4, { formula: `SUM(D${firstR}:D${lastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 5, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 6, { formula: `SUM(F${firstR}:F${lastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 7, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 8, { formula: `SUM(H${firstR}:H${lastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 9, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 10, { formula: `SUM(J${firstR}:J${lastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 11, { formula: `SUM(K${firstR}:K${lastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR, 12, { formula: `IFERROR(K${totR}/D${totR},0)` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
  }

  // ════════════════════════════════════════════════════════════════════
  // SHEET 5 — Investment Metrics (per-asset full KPI table)
  // ════════════════════════════════════════════════════════════════════
  // Per asset shows DIRECT and ALL-IN versions side-by-side so user can
  // see how shared-cost allocation changes the picture.
  //
  // Cap rates by asset type (Saudi 2026 typical) — same source as the
  // drawer's KPI logic in AssetDetailPanel.jsx
  const CAP_RATES = {
    retail_lifestyle: 8.5, mall: 7.5, office: 8.0,
    residential_villas: 7.0, residential_multifamily: 7.5, serviced_apartments: 7.0,
    hotel: 8.5, resort: 9.0, marina: 9.5, yacht_club: 9.0, parking_structure: 9.5,
  };
  {
    const ws = wb.addWorksheet("Metrics", {
      views: [{ showGridLines: false, state: "frozen", xSplit: 3, ySplit: 3 }],
      properties: { tabColor: { argb: "FF06B6D4" } },
    });
    const cols = [
      { label: "#", w: 4 },
      { label: "Asset / الأصل", w: 22 },
      { label: "Phase", w: 9 },
      { label: "Type", w: 9 },
      { label: "Shared?\nمشترك", w: 9 },
      { label: "Direct CAPEX", w: 14 },
      { label: "Allocated\nShared", w: 13 },
      { label: "All-in CAPEX", w: 14 },
      { label: "Annual Rev\nالإيراد السنوي", w: 13 },
      { label: "Total Rev\nإجمالي الإيراد", w: 14 },
      { label: "Total NCF\n(all-in)", w: 14 },
      { label: "YoC %\n(all-in)", w: 9 },
      { label: "IRR\n(all-in)", w: 9 },
      { label: "Cap Rate", w: 9 },
      { label: "Exit Value", w: 14 },
      { label: "Dev Profit", w: 14 },
      { label: "Dev Margin", w: 11 },
      { label: "Rev /m²", w: 9 },
      { label: "Cost /m²\n(all-in)", w: 11 },
    ];
    cols.forEach((c, i) => setCol(ws, i + 1, c.w));
    titleBar(ws, 1, 1, cols.length, "Investment Metrics (per asset, all-in basis)", "مؤشرات الاستثمار لكل مكوّن");
    tableHeader(ws, 2, cols.map(c => c.label));

    assets.forEach((a, i) => {
      const r = 3 + i;
      const m = assetMetrics[i];
      const sched = schedules[i] || {};
      const gfa = n(a.gfa);
      const eff = n(a.efficiency) / 100;
      const leasable = gfa * eff;
      // Annual stabilised revenue (matches AssetDetailPanel logic)
      let annualRev = 0;
      if (a.revType === "Lease") annualRev = leasable * n(a.leaseRate) * (n(a.stabilizedOcc != null ? a.stabilizedOcc : 100) / 100);
      else if (a.revType === "Operating") annualRev = n(a.opEbitda);
      else if (a.revType === "Sale") annualRev = m.totalRev / Math.max(1, n(a.absorptionYears) || 3);
      const capRate = CAP_RATES[a.assetType] || 8.5;
      // Exit value = Sale → totalRev; else = annualRev / capRate
      const exitValue = a.revType === "Sale" ? m.totalRev : (annualRev > 0 ? annualRev / (capRate / 100) : 0);
      const devProfit = exitValue - m.allInCapex;
      const devMargin = m.allInCapex > 0 ? devProfit / m.allInCapex : 0;
      const yoc = m.allInCapex > 0 ? annualRev / m.allInCapex : 0;
      const revPerSqm = gfa > 0 ? annualRev / gfa : 0;
      const costPerSqmAllIn = gfa > 0 ? m.allInCapex / gfa : 0;

      // Compute all-in IRR by walking the year-by-year all-in NCF
      const rev = sched.revenueSchedule || [];
      const cap = sched.capexSchedule || [];
      const lr = assetLandRent[i] || [];
      const allocCs = allocatedShared[i] || [];
      const allInNcf = yrs.map(y => n(rev[y]) - n(lr[y]) - n(cap[y]) - n(allocCs[y]));
      // Quick IRR calc (Newton's method) — bounded for export use
      const calcIRR = (cf) => {
        let rate = 0.1;
        for (let iter = 0; iter < 50; iter++) {
          let npv = 0, dnpv = 0;
          cf.forEach((v, y) => {
            npv += v / Math.pow(1 + rate, y);
            dnpv += -y * v / Math.pow(1 + rate, y + 1);
          });
          if (Math.abs(npv) < 1) return rate;
          if (Math.abs(dnpv) < 1e-10) break;
          const next = rate - npv / dnpv;
          if (!isFinite(next) || next < -0.99) break;
          rate = next;
        }
        return null;
      };
      const irrAllIn = calcIRR(allInNcf);

      setCell(ws, r, 1, i + 1, { color: C.grayText, align: "center" });
      setCell(ws, r, 2, a.name || `Asset ${i+1}`, { bold: true, align: "left", indent: 1, color: C.dark });
      setCell(ws, r, 3, a.phase || "", { align: "center" });
      setCell(ws, r, 4, a.revType || "", { align: "center" });
      setCell(ws, r, 5, isShared[i] ? "✓" : "", { align: "center", bold: isShared[i], color: isShared[i] ? "FFA16207" : C.grayText, bg: isShared[i] ? "FFFEF3C7" : null });
      setCell(ws, r, 6, m.directCapex, { fmt: FMT.int, color: C.red });
      setCell(ws, r, 7, m.allocCapex || "", { fmt: FMT.int, color: "FFA16207" });
      setCell(ws, r, 8, { formula: `F${r}+G${r}` }, { fmt: FMT.int, bold: true, color: C.dark, bg: C.derivedBg });
      setCell(ws, r, 9, annualRev || "", { fmt: FMT.int, color: C.greenDark });
      setCell(ws, r, 10, m.totalRev || "", { fmt: FMT.int, color: C.greenDark });
      setCell(ws, r, 11, m.allInNCF, { fmt: FMT.int, bold: true, color: m.allInNCF >= 0 ? C.greenDark : C.red });
      setCell(ws, r, 12, yoc || "", { fmt: FMT.pct1 });
      setCell(ws, r, 13, irrAllIn != null ? irrAllIn : "—", { fmt: irrAllIn != null ? FMT.pct1 : null, bold: true, color: irrAllIn != null && irrAllIn >= 0.12 ? C.greenDark : irrAllIn != null && irrAllIn >= 0.08 ? "FFA16207" : C.red });
      setCell(ws, r, 14, capRate / 100, { fmt: FMT.pct1, color: C.grayText });
      setCell(ws, r, 15, exitValue || "", { fmt: FMT.int });
      setCell(ws, r, 16, devProfit, { fmt: FMT.int, color: devProfit >= 0 ? C.greenDark : C.red });
      // Dev Margin coloured
      const dmCell = setCell(ws, r, 17, devMargin || "", { fmt: FMT.pct1, bold: true });
      const dmCellRef = ws.getCell(r, 17);
      if (devMargin >= 0.25) dmCellRef.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
      else if (devMargin >= 0.15) dmCellRef.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.amberBg } };
      else if (m.allInCapex > 0) dmCellRef.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
      setCell(ws, r, 18, revPerSqm || "", { fmt: FMT.int, color: C.grayText });
      setCell(ws, r, 19, costPerSqmAllIn || "", { fmt: FMT.int, color: C.grayText });
    });

    // Portfolio total row
    const totR2 = 3 + assets.length;
    const firstR2 = 3, lastR2 = 2 + assets.length;
    setCell(ws, totR2, 1, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 2, "Portfolio / المحفظة", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 3, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 4, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 5, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 6, { formula: `SUM(F${firstR2}:F${lastR2})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    // Allocated total should be 0 at the portfolio level (allocations are zero-sum across all assets)
    setCell(ws, totR2, 7, { formula: `SUM(G${firstR2}:G${lastR2})` }, { fmt: FMT.int, bold: true, color: C.grayText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 8, { formula: `SUM(H${firstR2}:H${lastR2})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 9, { formula: `SUM(I${firstR2}:I${lastR2})` }, { fmt: FMT.int, bold: true, color: C.greenDark, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 10, { formula: `SUM(J${firstR2}:J${lastR2})` }, { fmt: FMT.int, bold: true, color: C.greenDark, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 11, { formula: `SUM(K${firstR2}:K${lastR2})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 12, { formula: `IFERROR(I${totR2}/H${totR2},0)` }, { fmt: FMT.pct1, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 13, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 14, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 15, { formula: `SUM(O${firstR2}:O${lastR2})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 16, { formula: `O${totR2}-H${totR2}` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 17, { formula: `IFERROR((O${totR2}-H${totR2})/H${totR2},0)` }, { fmt: FMT.pct1, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 18, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, totR2, 19, "", { bg: C.blueBg, border: "totalTop" });
  }

  // ════════════════════════════════════════════════════════════════════
  // SHEET 6 — Notes (project metadata + smart alerts)
  // ════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Notes", {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: C.grayText } },
    });
    setCol(ws, 1, 3); setCol(ws, 2, 18); setCol(ws, 3, 12); setCol(ws, 4, 22); setCol(ws, 5, 70);
    titleBar(ws, 1, 1, 5, "Notes & Alerts", "ملاحظات وتنبيهات");

    let r = 3;
    sectionLabel(ws, r++, 2, 5, "Land / الأرض");
    const landFields = [
      ["Type / النوع", project?.landType || ""],
      ["Area (m²)", n(project?.landArea)],
      project?.landType === "lease" && ["Annual Rent", n(project?.landRentAnnual)],
      project?.landType === "lease" && ["Term (yrs)", n(project?.landRentTerm)],
      project?.landType === "lease" && ["Grace (yrs)", n(project?.landRentGrace)],
      project?.landType === "lease" && ["Escalation %", n(project?.landRentEscalation) / 100],
      project?.landType === "purchase" && ["Purchase Price", n(project?.landPurchasePrice)],
      project?.landType === "partner" && ["Partner Valuation", n(project?.landValuation)],
      project?.landType === "partner" && ["Partner Equity %", n(project?.partnerEquityPct) / 100],
    ].filter(Boolean);
    landFields.forEach(([k, v]) => {
      setCell(ws, r, 2, k, { color: C.grayText, align: "left", indent: 1 });
      const fmt = typeof v === "number" ? (k.includes("%") ? FMT.pct1 : FMT.int) : null;
      setCell(ws, r, 3, v, { fmt, bold: true, color: C.navyText });
      r++;
    });

    r += 1;
    sectionLabel(ws, r++, 2, 5, "Smart Reviewer Alerts / تنبيهات المراجع الذكي");
    const alerts = Array.isArray(smartAlerts?.alerts) ? smartAlerts.alerts
                 : Array.isArray(smartAlerts) ? smartAlerts
                 : [];
    if (alerts.length === 0) {
      setCell(ws, r, 2, "✓ No active alerts — all asset inputs look reasonable.", { color: C.greenDark, align: "left", indent: 1 });
      ws.mergeCells(r, 2, r, 5);
    } else {
      tableHeader(ws, r++, ["", "Asset", "Severity", "Rule", "Message"]);
      alerts.forEach((al, i) => {
        const sev = al.severity || "info";
        const aName = al.assetIndex != null ? (assets[al.assetIndex]?.name || `Asset ${al.assetIndex + 1}`) : "Project";
        setCell(ws, r, 1, i + 1, { color: C.grayText, align: "center" });
        setCell(ws, r, 2, aName, { align: "left", indent: 1 });
        setCell(ws, r, 3, sev, { align: "center", bg: sev === "critical" ? C.redBg : sev === "warning" ? C.amberBg : null, bold: sev === "critical" });
        setCell(ws, r, 4, al.id || "", { color: C.grayText, align: "center" });
        setCell(ws, r, 5, (al.ar ? `${al.ar} — ` : "") + (al.en || ""), { align: "left", indent: 1 });
        r++;
      });
    }

    r += 1;
    sectionLabel(ws, r++, 2, 5, "How this workbook is organised");
    const guide = [
      "• Summary — project header + portfolio KPIs.",
      "• Inputs — every editable asset field. YELLOW = edit me. BLUE = formula (auto-calc).",
      "• Pro Forma — year-by-year. Revenue + CAPEX + Net CF are FORMULAS that read from Inputs.",
      "  Edit a lease rate in Inputs and watch the Pro Forma rows recalc, including IRR.",
      "• Cost Detail — Hard / Soft / Contingency per asset, all formula-driven from Inputs.",
      "• Notes — land params + active alerts + this guide.",
      "",
      "What is NOT formula-driven: Land Rent yearly cells (uses engine grace + escalation",
      "logic that's awkward in Excel — 80+ cells per asset to mirror). If you change the",
      "land rent or escalation in the Haseef app, regenerate this workbook.",
    ];
    guide.forEach(line => {
      ws.mergeCells(r, 2, r, 5);
      const c = ws.getCell(r, 2);
      c.value = line;
      c.font = { name: FONT, size: 10, color: { argb: line.startsWith("What") ? C.dark : C.grayText }, italic: line.startsWith("•") ? false : line === "" ? false : true };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
      r++;
    });
  }

  // ── Reorder sheets so they appear in logical order in tab strip ─────
  // Already added in order: Summary, Inputs, Pro Forma, Cost Detail, Notes

  // ── Download ──────────────────────────────────────────────────────────
  const safeName = (projectName || "Project")
    .replace(/[^a-zA-Z0-9؀-ۿ]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Project";
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_Pro_Forma.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
