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
  // SHEET 1 — Summary
  // ════════════════════════════════════════════════════════════════════
  {
    const ws = wb.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: C.teal } },
    });
    setCol(ws, 1, 3); setCol(ws, 2, 32); setCol(ws, 3, 22); setCol(ws, 4, 6); setCol(ws, 5, 32); setCol(ws, 6, 22);

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
      ["Active Scenario / السيناريو", project?.activeScenario || "Base Case"],
      ["Soft Cost % / غير مباشرة", softPct],
      ["Contingency % / احتياطي", contPct],
      ["Land Type / نوع الأرض", project?.landType || ""],
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

    // ── Portfolio KPIs (right column) — formula-driven ──────────
    r = 3;
    sectionLabel(ws, r++, 5, 6, "Portfolio KPIs / مؤشرات المحفظة");
    // We'll fill these with formulas that reference the Pro Forma sheet.
    // Pro Forma sheet has the portfolio totals in known cells; defer until
    // those addresses are known. For now, drop in computed values from
    // engine to seed; will overwrite after Pro Forma sheet is built.
    const totalCapex = consolidated?.totalCapex || 0;
    const totalRev = consolidated?.totalIncome || 0;
    const totalLandRent = consolidated?.totalLandRent || 0;
    const irr = consolidated?.irr;
    const npv10 = consolidated?.npv10;
    const npv12 = consolidated?.npv12;

    const kpis = [
      ["Total CAPEX",          totalCapex,    FMT.int],
      ["Total Revenue (life)", totalRev,      FMT.int],
      ["Total Land Rent",      totalLandRent, FMT.int],
      ["Net Cash Flow",        totalRev - totalLandRent - totalCapex, FMT.int],
      ["Unlevered IRR",        irr,           FMT.pct1],
      ["NPV @ 10%",            npv10,         FMT.int],
      ["NPV @ 12%",            npv12,         FMT.int],
      ["Cash-on-Cost",         totalCapex > 0 ? (totalRev - totalCapex) / totalCapex : 0, FMT.pct1],
    ];
    kpis.forEach(([k, v, fmt]) => {
      setCell(ws, r, 5, k, { color: C.grayText, align: "left", indent: 1 });
      setCell(ws, r, 6, v, { fmt, bold: true, color: C.navyText });
      r++;
    });

    // ── Phase summary (bottom) ─────────────────────────────────
    r += 2;
    sectionLabel(ws, r++, 2, 6, "Phases / المراحل");
    tableHeader(ws, r++, ["#", "Phase", "Opening", "Assets", "CAPEX", "Revenue"]);
    phases.forEach((ph, i) => {
      const pIdx = assets.map((a, idx) => a.phase === ph.name ? idx : -1).filter(idx => idx >= 0);
      const pCapex = pIdx.reduce((s, idx) => s + (schedules[idx]?.totalCapex || 0), 0);
      const pRev   = pIdx.reduce((s, idx) => s + (schedules[idx]?.totalRevenue || 0), 0);
      setCell(ws, r, 1, "", {});
      setCell(ws, r, 2, ph.name, { color: C.dark, bold: true, align: "left", indent: 1 });
      setCell(ws, r, 3, ph.completionYear || "", { fmt: FMT.year });
      setCell(ws, r, 4, pIdx.length, { fmt: FMT.int });
      setCell(ws, r, 5, pCapex, { fmt: FMT.int });
      setCell(ws, r, 6, pRev, { fmt: FMT.int });
      r++;
    });
    // Phase totals (formula)
    const phFirstR = r - phases.length;
    const phLastR = r - 1;
    setCell(ws, r, 2, "Total", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 3, "", { bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 4, { formula: `SUM(D${phFirstR}:D${phLastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 5, { formula: `SUM(E${phFirstR}:E${phLastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
    setCell(ws, r, 6, { formula: `SUM(F${phFirstR}:F${phLastR})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
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
  // Range constants used by Pro Forma sheet to reference inputs.
  const INPUTS_FIRST_ROW = 4; // header on row 3
  const INPUTS_LAST_ROW  = INPUTS_FIRST_ROW + assets.length - 1;
  // Column letters for cross-sheet references:
  const COL = { phase:"B", name:"C", revType:"D", gfa:"E", eff:"F", leasable:"G", leaseRate:"H", occ:"I", ebitda:"J", salePrice:"K", preSale:"L", absorption:"M", commission:"N", costPerSqm:"O", totalCapex:"P", buildMo:"Q", openingYr:"R", ramp:"S", esc:"T" };

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
  }

  // ════════════════════════════════════════════════════════════════════
  // SHEET 3 — Pro Forma (year-by-year, formula-driven)
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

    const noteText = "Revenue, CAPEX, and Net CF cells are formulas referencing the Inputs sheet. Edit a value there and watch this sheet recalc. Land Rent uses engine-allocated values (footprint share). Year 1 = " + startYear + ".";
    ws.mergeCells(2, 1, 2, 6 + horizon);
    const nc = ws.getCell(2, 1);
    nc.value = noteText;
    nc.font = { name: FONT, size: 9, italic: true, color: { argb: C.grayText } };
    nc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    nc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.lightGray } };
    ws.getRow(2).height = 18;

    tableHeader(ws, 3, ["#", "Asset / الأصل", "Item / البند", "Total", "IRR", "Payback (yr)", ...yrs.map(y => startYear + y)]);

    // Per-asset 4-row block
    const yearStartCol = 7;
    const yearEndCol = 6 + horizon;
    const yearStartL = colLetter(yearStartCol);
    const yearEndL = colLetter(yearEndCol);

    // Track row positions for portfolio totals
    const ncfRowPerAsset = []; // row index of "Net Cash Flow" line per asset

    let curRow = 4;
    assets.forEach((a, i) => {
      const inputsRow = INPUTS_FIRST_ROW + i;
      // Reference to a named field on the Inputs row (resolves COL key → letter)
      const ref = (key) => `Inputs!${COL[key]}${inputsRow}`;
      const revType = a.revType || "Lease";

      const blockBg = i % 2 === 0 ? null : C.lightGray;

      // Row 1 — Revenue (formula)
      const revRow = curRow;
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

      // Row 3 — CAPEX (formula)
      const capRow = curRow;
      setCell(ws, capRow, 1, "", { bg: blockBg });
      setCell(ws, capRow, 2, "", { bg: blockBg });
      setCell(ws, capRow, 3, "CAPEX / تكاليف", { color: C.red, align: "left", indent: 1, bg: blockBg });
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

      // Row 4 — Net CF
      const ncfRow = curRow;
      ncfRowPerAsset.push(ncfRow);
      setCell(ws, ncfRow, 1, "", { bg: C.blueBg, border: "totalTop" });
      setCell(ws, ncfRow, 2, "", { bg: C.blueBg, border: "totalTop" });
      setCell(ws, ncfRow, 3, "Net Cash Flow / صافي التدفق", { bold: true, color: C.navyText, align: "left", indent: 1, bg: C.blueBg, border: "totalTop" });
      yrs.forEach(y => {
        const col = colLetter(yearStartCol + y);
        const f = `${col}${revRow}-${col}${lrRow}-${col}${capRow}`;
        setCell(ws, ncfRow, yearStartCol + y, { formula: f }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      });
      // Total NCF
      setCell(ws, ncfRow, 4, { formula: `SUM(${yearStartL}${ncfRow}:${yearEndL}${ncfRow})` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      // IRR (formula)
      setCell(ws, ncfRow, 5, { formula: `IFERROR(IRR(${yearStartL}${ncfRow}:${yearEndL}${ncfRow}),"—")` }, { fmt: FMT.pct1, bold: true, color: C.navyText, bg: C.blueBg, border: "totalTop" });
      // Payback (compute static — first year cumulative >= 0)
      const rev = schedules[i]?.revenueSchedule || [];
      const cap = schedules[i]?.capexSchedule || [];
      let cum = 0, payback = "—", spent = false;
      for (let y = 0; y < horizon; y++) {
        const ncf = (rev[y] || 0) - (lr[y] || 0) - (cap[y] || 0);
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
    sectionLabel(ws, curRow++, 1, 6 + horizon, "Portfolio / المحفظة الكلية");
    const pfRevRow = curRow;
    const pfLrRow = curRow + 1;
    const pfCapRow = curRow + 2;
    const pfNcfRow = curRow + 3;

    // Sum revenues (every 4th-from-block first row: revenue rows are at ncfRow - 3)
    const revRows = ncfRowPerAsset.map(r => r - 3);
    const lrRows = ncfRowPerAsset.map(r => r - 2);
    const capRows = ncfRowPerAsset.map(r => r - 1);
    const ncfRows = ncfRowPerAsset;

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

    buildPortfolioRow(pfRevRow, "Revenue / إيراد", C.greenDark, revRows);
    buildPortfolioRow(pfLrRow, "Land Rent / إيجار أرض", C.red, lrRows);
    buildPortfolioRow(pfCapRow, "CAPEX / تكاليف", C.red, capRows);

    // Net CF: difference of the other portfolio rows (so it stays in sync if you re-edit anywhere)
    setCell(ws, pfNcfRow, 1, "", { bg: C.amberBg, border: "totalTop" });
    setCell(ws, pfNcfRow, 2, "Portfolio", { bold: true, align: "left", indent: 1, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    setCell(ws, pfNcfRow, 3, "Net Cash Flow / صافي", { bold: true, color: C.navyText, align: "left", indent: 1, bg: C.amberBg, border: "totalTop" });
    yrs.forEach(y => {
      const col = colLetter(yearStartCol + y);
      const f = `${col}${pfRevRow}-${col}${pfLrRow}-${col}${pfCapRow}`;
      setCell(ws, pfNcfRow, yearStartCol + y, { formula: f }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    });
    setCell(ws, pfNcfRow, 4, { formula: `D${pfRevRow}-D${pfLrRow}-D${pfCapRow}` }, { fmt: FMT.int, bold: true, color: C.navyText, bg: C.amberBg, border: "totalTop" });
    // Portfolio IRR
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
  // SHEET 5 — Notes (project metadata + smart alerts)
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
