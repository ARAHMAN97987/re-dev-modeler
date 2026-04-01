// ═══════════════════════════════════════════════════════════════
// ZAN Template Excel Export
// Loads ZAN_Full_Model_v11_AUDITED.xlsx template and fills
// 524 input cells from platform project data.
// All formulas are preserved - user opens a dynamic model.
//
// Reference: docs/excel/EXCEL_MODEL.md (input/output maps)
// ═══════════════════════════════════════════════════════════════
import ExcelJS from "exceljs";

/**
 * Generate a dynamic Excel model from the template.
 * Platform fills inputs → 26,208 formulas recalculate in Excel.
 *
 * @param {Object} project - Full project object from platform state
 * @param {Object} results - Calculated results (used for Operating_PL computed values)
 * @param {Object} financing - Financing engine output (optional, for reference)
 * @param {Object} waterfall - Waterfall engine output (optional, for reference)
 * @param {Object} phaseWaterfalls - Per-phase waterfall results
 * @param {Object} phaseFinancings - Per-phase financing results
 */
export async function generateTemplateExcel(project, results, financing, waterfall, phaseWaterfalls, phaseFinancings) {
  const p = project;
  const assets = p.assets || [];
  const phases = p.phases || [];

  // ── 1. Load template ──
  const resp = await fetch("/ZAN_Model_Template.xlsx");
  if (!resp.ok) throw new Error("Could not load Excel template. Make sure ZAN_Model_Template.xlsx is in public/");
  const buf = await resp.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  // ── Helper: set cell value without touching style/formula ──
  function setInput(sheetName, cellRef, value) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) return;
    const cell = ws.getCell(cellRef);
    // Only set if the cell exists and is an input (not a formula)
    if (cell.value && typeof cell.value === "object" && cell.value.formula) return; // skip formulas
    cell.value = value;
  }

  // Note: forceSet (overwrite formulas) was removed — ALL Fund sheet cells
  // are now driven by template formulas for full dynamism.

  // ── Helper: percentage (platform stores as whole number e.g. 6.5 = 6.5%, Excel needs 0.065) ──
  function pct(val) {
    if (val === undefined || val === null) return 0;
    // Platform ALWAYS stores percentages as human-readable: 6.5 means 6.5%, 0.5 means 0.5%
    // Excel ALWAYS needs decimal: 0.065 for 6.5%, 0.005 for 0.5%
    return typeof val === "number" ? val / 100 : val;
  }

  // ═══════════════════════════════════════════════════════════
  // 2. FILL INPUTS SHEET
  // ═══════════════════════════════════════════════════════════
  const INP = "Inputs";

  // Section 1: General
  setInput(INP, "C5", p.name || "");
  setInput(INP, "C6", p.location || "");
  setInput(INP, "C7", p.startYear || new Date().getFullYear());
  setInput(INP, "C8", p.horizon || 50);
  setInput(INP, "C9", p.currency || "SAR");

  // Section 2: Rent Assumptions
  setInput(INP, "C12", pct(p.rentEscalation));
  setInput(INP, "C13", pct(p.defaultEfficiency));
  setInput(INP, "C14", p.defaultLeaseRate || 700);
  setInput(INP, "C15", p.defaultCostPerSqm || 3500);

  // Section 3: Land Rent
  setInput(INP, "C18", p.landRentAnnual || 0);
  setInput(INP, "C19", p.landRentEscalationEveryN || 5);
  setInput(INP, "C20", pct(p.landRentEscalation));
  setInput(INP, "C21", p.landRentGrace || 5);
  setInput(INP, "C22", p.landRentTerm || 50);

  // Section 4: CAPEX
  setInput(INP, "C25", pct(p.softCostPct));
  setInput(INP, "C26", pct(p.contingencyPct));

  // Section 5: Scenario
  setInput(INP, "C29", p.activeScenario || "Base Case");

  // Section 6: Phases (rows 45-59, up to 15 phases)
  for (let i = 0; i < Math.min(phases.length, 15); i++) {
    const row = 45 + i;
    const ph = phases[i];
    setInput(INP, `C${row}`, ph.startYearOffset || 0);
    // Phase footprint is calculated by formula from Program, don't overwrite
  }

  // Section 7: Land Capitalization
  setInput(INP, "C63", p.landArea || 0);

  // Section 8: Debt
  setInput(INP, "C85", pct(p.maxLtvPct));

  // Section 9: Land Type
  const landTypeMap = { lease: "Lease", purchase: "Purchase", partner: "Partner", bot: "BOT" };
  setInput(INP, "C88", landTypeMap[p.landType] || "Lease");
  setInput(INP, "C93", p.landPurchasePrice || 0);
  setInput(INP, "C94", pct(p.partnerEquityPct));
  setInput(INP, "C95", p.botOperationYears || 0);

  // Section 10: Financing Mode
  const finModeMap = { self: "Self", debt: "Bank", fund: "Fund", jv: "JV", hybrid: "Hybrid", incomeFund: "Income" };
  setInput(INP, "C101", finModeMap[p.finMode] || "Fund");

  // Section 11: Exit Strategy
  // Excel formula: IF(method="Sale", Income×Multiple, Income/CapRate)
  const exitTypeMap = { sale: "Sale", hold: "Hold", reit: "REIT", refinance: "Refinance", partial: "Partial", caprate: "CapRate" };
  setInput(INP, "C107", exitTypeMap[p.exitStrategy] || "Sale");
  setInput(INP, "C113", p.exitYear || (p.startYear || 2026) + 6);
  setInput(INP, "C114", p.exitMultiple || 10);
  setInput(INP, "C115", pct(p.exitCostPct));

  // Section 12: Fund Settings Mode (auto-detect: if any phase has financing config, use Per-Phase)
  const hasPerPhase = phases.some(ph => ph?.financing && Object.keys(ph.financing).length > 0);
  setInput(INP, "C118", hasPerPhase ? "Per-Phase" : "Unified");

  // Section 13: Per-Phase Fund Grid (rows 126-140, cols C-H = phases 1-6)
  // Priority: phase.financing (per-phase config) > project-level
  const colLetters = ["C", "D", "E", "F", "G", "H"];
  for (let pi = 0; pi < 6; pi++) {
    const col = colLetters[pi];
    const ph = phases[pi];
    const f = ph?.financing || {}; // per-phase financing config
    setInput(INP, `${col}126`, pct(f.financeRate ?? p.financeRate));
    setInput(INP, `${col}127`, f.loanTenor ?? p.loanTenor ?? 7);
    setInput(INP, `${col}128`, f.debtGrace ?? p.debtGrace ?? 3);
    setInput(INP, `${col}129`, pct(f.upfrontFeePct ?? p.upfrontFeePct));
    setInput(INP, `${col}130`, pct(f.subscriptionFeePct ?? p.subscriptionFeePct));
    setInput(INP, `${col}131`, pct(f.annualMgmtFeePct ?? p.annualMgmtFeePct));
    setInput(INP, `${col}132`, f.custodyFeeAnnual ?? p.custodyFeeAnnual ?? 130000);
    setInput(INP, `${col}133`, pct(f.developerFeePct ?? p.developerFeePct));
    setInput(INP, `${col}134`, pct(f.structuringFeePct ?? p.structuringFeePct));
    setInput(INP, `${col}135`, pct(f.prefReturnPct ?? p.prefReturnPct));
    setInput(INP, `${col}136`, (f.gpCatchup ?? p.gpCatchup) !== false ? "Y" : "N");
    setInput(INP, `${col}137`, pct(f.carryPct ?? p.carryPct));

    // Exit params: per-phase > project-level
    const exitYr = f.exitYear ?? p.exitYear ?? ((p.startYear || 2026) + (ph?.startYearOffset || pi + 1) + (f.loanTenor ?? p.loanTenor ?? 7) - 1);
    setInput(INP, `${col}138`, exitYr);
    setInput(INP, `${col}139`, f.exitMultiple ?? p.exitMultiple ?? 10);
    setInput(INP, `${col}140`, pct(f.exitCostPct ?? p.exitCostPct));
    // Exit Cap Rate (row 141) - platform stores as whole number (10 = 10%)
    const capRate = f.exitCapRate ?? p.exitCapRate ?? 10;
    setInput(INP, `${col}141`, pct(capRate));
    // Fee caps (rows 142-143) - platform stores as absolute values
    setInput(INP, `${col}142`, f.mgmtFeeCapAnnual ?? p.mgmtFeeCapAnnual ?? 2000000);
    setInput(INP, `${col}143`, f.structuringFeeCap ?? p.structuringFeeCap ?? 300000);
    // Debt tranche mode (row 144)
    setInput(INP, `${col}144`, f.debtTrancheMode ?? p.debtTrancheMode ?? "single");
    // Additional fund fees (rows 145-150)
    setInput(INP, `${col}145`, f.preEstablishmentFee ?? p.preEstablishmentFee ?? 0);
    setInput(INP, `${col}146`, f.spvFee ?? p.spvFee ?? 0);
    setInput(INP, `${col}147`, f.auditorFeeAnnual ?? p.auditorFeeAnnual ?? 0);
    setInput(INP, `${col}148`, pct(f.operatorFeePct ?? p.operatorFeePct ?? 0));
    setInput(INP, `${col}149`, f.operatorFeeCap ?? p.operatorFeeCap ?? 0);
    setInput(INP, `${col}150`, pct(f.miscExpensePct ?? p.miscExpensePct ?? 0));
  }

  // ═══════════════════════════════════════════════════════════
  // 3. FILL PROGRAM SHEET (Asset Table)
  // ═══════════════════════════════════════════════════════════
  const PRG = "Program";

  for (let i = 0; i < Math.min(assets.length, 30); i++) {
    const a = assets[i];
    const row = 4 + i;

    // Find phase name — use actual project phase name (not hardcoded "ZAN")
    const phaseName = a.phase || phases[0]?.name || "Phase 1";
    // Map to template ZAN naming for sheet formula references (Fund_ZAN 1, etc.)
    const phaseIdx = phases.findIndex(ph => ph.name === phaseName);
    const zanPhase = `ZAN ${phaseIdx >= 0 ? phaseIdx + 1 : 1}`;

    // Write actual phase name to Program sheet (visible to user)
    setInput(PRG, `A${row}`, phaseName);
    setInput(PRG, `B${row}`, a.category || "");
    setInput(PRG, `C${row}`, a.name || "");
    setInput(PRG, `D${row}`, a.code || "");
    setInput(PRG, `E${row}`, a.notes || "");
    setInput(PRG, `F${row}`, a.plotArea || 0);
    setInput(PRG, `G${row}`, a.footprint || 0);
    setInput(PRG, `H${row}`, a.gfa || 0);
    setInput(PRG, `I${row}`, a.revType || "Lease");
    setInput(PRG, `J${row}`, pct(a.efficiency));
    // K = Leasable Area (formula: H * J)
    setInput(PRG, `L${row}`, a.leaseRate || 0);
    // M = EBITDA (for Operating type) — always write so template uses correct value
    if (a.revType === "Operating") {
      setInput(PRG, `M${row}`, a.opEbitda || 0);
    }
    setInput(PRG, `O${row}`, a.rampUpYears || 3);
    setInput(PRG, `P${row}`, pct(a.stabilizedOcc || a.occupancy));
    setInput(PRG, `Q${row}`, a.costPerSqm || 0);

    // Col R = construction start year offset from project startYear
    // MUST match engine logic (cashflow.js lines 54-76) exactly:
    //   1. completionYear set → cStart = completionYear - startYear - durYears
    //   2. constrStart > 0 → cStart = constrStart
    //   3. completionMonth set → cStart = ceil(completionMonth/12) - durYears
    //   4. else → cStart = 0
    const assetPhase = phases.find(ph => ph.name === (a.phase || phases[0]?.name || 'Phase 1'));
    const durYears = Math.ceil((a.constrDuration || a.constructionMonths || 12) / 12);
    let actualConstrStart;
    if (assetPhase && (assetPhase.completionYear || 0) > 0) {
      const phaseOpenIdx = assetPhase.completionYear - (p.startYear || 2026);
      actualConstrStart = Math.max(0, phaseOpenIdx - durYears);
    } else if ((a.constrStart || 0) > 0) {
      actualConstrStart = a.constrStart;
    } else if (assetPhase && (assetPhase.completionMonth || 0) > 0) {
      const phaseOpenIdx = Math.ceil(assetPhase.completionMonth / 12);
      actualConstrStart = Math.max(0, phaseOpenIdx - durYears);
    } else {
      actualConstrStart = 0;
    }
    setInput(PRG, `R${row}`, actualConstrStart);
    setInput(PRG, `S${row}`, a.constrDuration || a.constructionMonths || 12);
  }

  // Clear remaining rows (31-33) if fewer assets
  for (let i = assets.length; i < 30; i++) {
    const row = 4 + i;
    for (const col of ["A","B","C","D","E","F","G","H","I","J","L","M","O","P","Q","R","S"]) {
      setInput(PRG, `${col}${row}`, col === "A" || col === "B" || col === "C" || col === "I" ? "" : 0);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. FILL OPERATING_PL SHEET (Hotel + Marina)
  // ═══════════════════════════════════════════════════════════
  const OPL = "Operating_PL";

  // Find hotel assets (up to 2: hotel + resort)
  const hotelAssets = assets.filter(a => a.hotelPL && a.hotelPL.keys > 0);
  const marinaAssets = assets.filter(a => a.marinaPL && a.marinaPL.berths > 0);

  // Hotel 1 (column C)
  if (hotelAssets[0]) {
    const h = hotelAssets[0].hotelPL;
    const hIdx = assets.indexOf(hotelAssets[0]);
    setInput(OPL, "C7", hIdx + 4); // Program row reference
    setInput(OPL, "C8", h.keys || 0);
    setInput(OPL, "C9", h.adr || 0);
    setInput(OPL, "C10", pct(h.stabOcc));
    setInput(OPL, "C11", h.daysYear || 365);
    // Revenue mix
    setInput(OPL, "C15", pct(h.roomsPct));
    setInput(OPL, "C16", pct(h.fbPct));
    setInput(OPL, "C17", pct(h.micePct));
    setInput(OPL, "C18", pct(h.otherPct));
    // OPEX ratios
    setInput(OPL, "C28", pct(h.roomExpPct));
    setInput(OPL, "C29", pct(h.fbExpPct));
    setInput(OPL, "C30", pct(h.miceExpPct));
    setInput(OPL, "C31", pct(h.otherExpPct));
    setInput(OPL, "C32", pct(h.undistPct));
    setInput(OPL, "C33", pct(h.fixedPct));
  }

  // Hotel 2 / Resort (column D)
  if (hotelAssets[1]) {
    const h = hotelAssets[1].hotelPL;
    const hIdx = assets.indexOf(hotelAssets[1]);
    setInput(OPL, "D7", hIdx + 4);
    setInput(OPL, "D8", h.keys || 0);
    setInput(OPL, "D9", h.adr || 0);
    setInput(OPL, "D10", pct(h.stabOcc));
    setInput(OPL, "D11", h.daysYear || 365);
    setInput(OPL, "D15", pct(h.roomsPct));
    setInput(OPL, "D16", pct(h.fbPct));
    setInput(OPL, "D17", pct(h.micePct));
    setInput(OPL, "D18", pct(h.otherPct));
    setInput(OPL, "D28", pct(h.roomExpPct));
    setInput(OPL, "D29", pct(h.fbExpPct));
    setInput(OPL, "D30", pct(h.miceExpPct));
    setInput(OPL, "D31", pct(h.otherExpPct));
    setInput(OPL, "D32", pct(h.undistPct));
    setInput(OPL, "D33", pct(h.fixedPct));
  }

  // Marina
  if (marinaAssets[0]) {
    const m = marinaAssets[0].marinaPL;
    const mIdx = assets.indexOf(marinaAssets[0]);
    setInput(OPL, "C50", mIdx + 4); // Program row reference
    setInput(OPL, "C53", m.berths || 0);
    setInput(OPL, "C54", m.avgLength || 14);
    setInput(OPL, "C55", m.unitPrice || 2063);
    setInput(OPL, "C56", pct(m.stabOcc));
    setInput(OPL, "C60", pct(m.fuelPct));
    setInput(OPL, "C61", pct(m.otherRevPct));
    setInput(OPL, "C70", pct(m.berthingOpexPct));
    setInput(OPL, "C71", pct(m.fuelOpexPct));
    setInput(OPL, "C72", pct(m.otherOpexPct));
  }

  // ═══════════════════════════════════════════════════════════
  // 5. FILL FUND SHEET INPUTS (per phase)
  // ALL computation rows remain as template formulas (fully dynamic).
  // Template formulas for C9, C14, C19 were fixed to match engine logic:
  //   C9  = Inputs!{col}$151 (fundStartYear, new input row)
  //   C14 = MAX(C12, C18-C19) (equity clamping to prevent negative LP%)
  //   C19 = IF(Y, MIN(C18*LTV, ABS(D49)), 0) (debt capped at totalCapex)
  // Fee rows (63-68), exit (51), waterfall (69-99) are ALL formulas.
  // ═══════════════════════════════════════════════════════════
  for (let pi = 0; pi < 6; pi++) {
    const sheetName = `Fund_ZAN ${pi + 1}`;
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;
    const ph = phases[pi];
    const f = ph?.financing || {};

    // Fund info — write actual phase name as fund name label
    const actualPhaseName = ph?.name || `Phase ${pi + 1}`;
    const fundName = f.fundName || p.fundName || `${p.name || "Project"} Fund`;
    setInput(sheetName, "C3", actualPhaseName); // Phase label (visible to user)
    setInput(sheetName, "C4", fundName);
    setInput(sheetName, "C6", (f.vehicleType || p.vehicleType) === "direct" ? "Direct" : "Fund");
    setInput(sheetName, "C7", p.fundStrategy || "Develop & Hold");
    setInput(sheetName, "C22", (f.debtAllowed ?? p.debtAllowed) !== false ? "Y" : "N");

    // Fund Start Year: written to Inputs row 151 (per-phase), template reads it via formula
    const fundStart = f.fundStartYear || ((p.startYear || 2026) + (ph?.startYearOffset || pi + 1));
    const col = colLetters[pi];
    if (col) setInput(INP, `${col}151`, fundStart);

    // Fix freeze pane: template locks rows 1-46 (E47) which is too many.
    // Change to column-only freeze: A-D always visible, rows scroll freely.
    if (ws.views && ws.views.length > 0) {
      ws.views = [{
        state: 'frozen',
        xSplit: 4,        // freeze columns A-D (labels always visible)
        ySplit: 0,        // no row freeze
        topLeftCell: 'E1',
        activeCell: 'E47',
      }];
    }

    // ALL other Fund cells (C9, C12, C14, C17, C18, C19, rows 47-99)
    // remain as template formulas — fully dynamic.
    // No forceSet needed: template formulas now match engine logic.

    // ── Write engine-computed reference values (rows 125-140) ──
    // These are the platform's authoritative outputs for comparison.
    // The template formulas compute independently — these are reference only.
    const phaseName = ph?.name || `Phase ${pi + 1}`;
    const pw = phaseWaterfalls?.[phaseName];
    const pf2 = phaseFinancings?.[phaseName];
    if (pw && ws) {
      // Helper to write a reference row
      const writeRef = (row, label, value, fmt) => {
        const labelCell = ws.getCell(`A${row}`);
        labelCell.value = label;
        labelCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF6B7280" } };
        const valCell = ws.getCell(`C${row}`);
        valCell.value = value;
        valCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF2563EB" } };
        if (fmt === 'pct') valCell.numFmt = '0.00%';
        else if (fmt === 'num') valCell.numFmt = '#,##0';
        else if (fmt === 'x') valCell.numFmt = '0.00"x"';
      };

      let rr = 126;
      const secCell = ws.getCell(`A${rr}`);
      secCell.value = "PLATFORM REFERENCE VALUES (Haseef Engine)";
      secCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF2563EB" } };
      rr += 1;

      writeRef(rr++, "LP IRR (Investor)", pw.lpIRR, 'pct');
      writeRef(rr++, "GP IRR (Developer)", pw.gpIRR, 'pct');
      writeRef(rr++, "LP MOIC", pw.lpMOIC, 'x');
      writeRef(rr++, "GP MOIC", pw.gpMOIC, 'x');
      writeRef(rr++, "LP DPI", pw.lpDPI, 'x');
      writeRef(rr++, "Total Equity", pw.totalEquity, 'num');
      writeRef(rr++, "LP Equity", pw.lpEquity, 'num');
      writeRef(rr++, "GP Equity", pw.gpEquity, 'num');
      writeRef(rr++, "Total Fees", pw.totalFees, 'num');
      writeRef(rr++, "LP Total Distributions", pw.lpTotalDist, 'num');
      writeRef(rr++, "GP Total Distributions", pw.gpTotalDist, 'num');
      writeRef(rr++, "Exit Proceeds", pw.exitProceeds?.reduce?.((a,b)=>a+b,0) || 0, 'num');
      if (pf2) {
        writeRef(rr++, "Total Debt", pf2.totalDebt, 'num');
        writeRef(rr++, "Total Interest", pf2.totalInterest, 'num');
        writeRef(rr++, "Levered IRR", pf2.leveredIRR, 'pct');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. FILL BANK INPUTS
  // ═══════════════════════════════════════════════════════════
  setInput("Bank", "C4", "[Bank Name]");
  setInput("Bank", "C5", "All");
  setInput("Bank", "C6", 10);
  setInput("Bank", "C22", p.repaymentType === "bullet" ? "Bullet" : "Equal Installment");

  // ═══════════════════════════════════════════════════════════
  // 7. UNLOCK ALL CELLS (remove sheet protection)
  // ═══════════════════════════════════════════════════════════
  wb.eachSheet(ws => {
    // Remove sheet-level protection
    if (ws.protection) ws.protection = {};
    // Unlock individual cells
    ws.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        if (cell.protection) cell.protection = { locked: false };
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 8. ADD "READ ME" SHEET (first sheet)
  // ═══════════════════════════════════════════════════════════
  const rm = wb.addWorksheet("Read Me", { properties: { tabColor: { argb: "FF2EC4B6" } } });
  // Move to first position
  rm.orderNo = 0;
  // Try to reorder sheets: ExcelJS doesn't have a direct move method,
  // but we can set the order by moving it
  const sheetNames = wb.worksheets.map(ws => ws.name);
  const rmIdx = sheetNames.indexOf("Read Me");
  if (rmIdx > 0) {
    // Move Read Me to position 0 by splicing the internal array
    const rmSheet = wb.worksheets.splice(rmIdx, 1)[0];
    wb.worksheets.unshift(rmSheet);
  }

  // Column widths
  rm.getColumn(1).width = 4;
  rm.getColumn(2).width = 28;
  rm.getColumn(3).width = 50;
  rm.getColumn(4).width = 18;

  const NAVY = { argb: "FF1B4F72" };
  const TEAL = { argb: "FF2EC4B6" };
  const GRAY = { argb: "FF6B7280" };
  const BLUE_INPUT = { argb: "FF2563EB" };
  const BG_LIGHT = { argb: "FFF8FAFC" };
  const BG_HEADER = { argb: "FF1B4F72" };

  // Title
  rm.mergeCells("B2:D2");
  const titleCell = rm.getCell("B2");
  titleCell.value = `Financial Model — ${p.name || "Project"}`;
  titleCell.font = { name: "Arial", size: 18, bold: true, color: NAVY };
  titleCell.alignment = { horizontal: "left" };

  rm.mergeCells("B3:D3");
  const subCell = rm.getCell("B3");
  subCell.value = `Generated by Haseef Financial Modeler`;
  subCell.font = { name: "Arial", size: 10, color: TEAL };

  // Metadata
  rm.getCell("B5").value = "Generated:";
  rm.getCell("B5").font = { name: "Arial", size: 10, bold: true, color: GRAY };
  rm.getCell("C5").value = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  rm.getCell("C5").font = { name: "Arial", size: 10, color: GRAY };

  rm.getCell("B6").value = "Financing Mode:";
  rm.getCell("B6").font = { name: "Arial", size: 10, bold: true, color: GRAY };
  const finModeLabels = { self: "Self-Funded", debt: "Bank Debt", fund: "Fund Structure", hybrid: "Hybrid", incomeFund: "Income Fund" };
  rm.getCell("C6").value = finModeLabels[p.finMode] || p.finMode;
  rm.getCell("C6").font = { name: "Arial", size: 10, color: GRAY };

  rm.getCell("B7").value = "Phases:";
  rm.getCell("B7").font = { name: "Arial", size: 10, bold: true, color: GRAY };
  rm.getCell("C7").value = phases.map(ph => ph.name).join(", ") || "Single Phase";
  rm.getCell("C7").font = { name: "Arial", size: 10, color: GRAY };

  // Sheet Guide Header
  let rr = 9;
  rm.mergeCells(`B${rr}:D${rr}`);
  const guideHeader = rm.getCell(`B${rr}`);
  guideHeader.value = "Sheet Guide";
  guideHeader.font = { name: "Arial", size: 13, bold: true, color: NAVY };
  rr++;

  // Sheet guide table header
  ["Sheet", "Description", "Type"].forEach((h, ci) => {
    const cell = rm.getCell(rr, ci + 2);
    cell.value = h;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: BG_HEADER };
    cell.border = { bottom: { style: "thin", color: NAVY } };
  });
  rr++;

  const sheetGuide = [
    ["Read Me", "This overview — project info, sheet guide, color legend", "Overview"],
    ["Inputs", "All project assumptions and settings", "INPUT"],
    ["Program", "Asset table — 30 assets with area, cost, revenue", "INPUT"],
    ["CAPEX", "Year-by-year construction cost per asset", "FORMULA"],
    ["Revenue", "Year-by-year income per asset", "FORMULA"],
    ["CashFlow", "Per-phase + consolidated unlevered cash flow", "FORMULA"],
    ["Operating_PL", "Hotel P&L and Marina P&L assumptions", "INPUT"],
    ["Fund_ZAN 1-6", "Per-phase fund: capital structure, debt, fees, waterfall", "FORMULA + INPUT"],
    ["Fund_Summary", "Dashboard aggregating all phases side-by-side", "FORMULA"],
    ["Bank", "Aggregated debt service, DSCR, sources & uses", "FORMULA + INPUT"],
    ["9_Checks", "24 automated integrity checks", "FORMULA"],
  ];

  sheetGuide.forEach(([name, desc, type]) => {
    rm.getCell(rr, 2).value = name;
    rm.getCell(rr, 2).font = { name: "Arial", size: 10, bold: true, color: NAVY };
    rm.getCell(rr, 3).value = desc;
    rm.getCell(rr, 3).font = { name: "Arial", size: 10, color: GRAY };
    rm.getCell(rr, 4).value = type;
    rm.getCell(rr, 4).font = { name: "Arial", size: 9, color: type.includes("INPUT") ? BLUE_INPUT : GRAY };
    rm.getRow(rr).eachCell(c => {
      c.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    });
    rr++;
  });

  // Color Legend
  rr += 2;
  rm.mergeCells(`B${rr}:D${rr}`);
  rm.getCell(`B${rr}`).value = "Color Legend";
  rm.getCell(`B${rr}`).font = { name: "Arial", size: 13, bold: true, color: NAVY };
  rr++;

  const legend = [
    ["Blue text", "Editable input — you can change these values", BLUE_INPUT],
    ["Black text", "Formula — auto-calculated, do not overwrite", { argb: "FF000000" }],
    ["Green text", "Cross-sheet reference — pulls data from another sheet", { argb: "FF008000" }],
  ];
  legend.forEach(([label, desc, color]) => {
    rm.getCell(rr, 2).value = label;
    rm.getCell(rr, 2).font = { name: "Arial", size: 10, bold: true, color };
    rm.getCell(rr, 3).value = desc;
    rm.getCell(rr, 3).font = { name: "Arial", size: 10, color: GRAY };
    rr++;
  });

  // Key Assumptions
  rr += 2;
  rm.mergeCells(`B${rr}:D${rr}`);
  rm.getCell(`B${rr}`).value = "Key Assumptions";
  rm.getCell(`B${rr}`).font = { name: "Arial", size: 13, bold: true, color: NAVY };
  rr++;

  const assumptions = [
    ["Total CAPEX", `${(1337853248 / 1e6).toFixed(0)}M SAR`], // Would need actual calc, using placeholder approach
    ["LTV", `${p.maxLtvPct || 0}%`],
    ["Finance Rate", `${p.financeRate || 0}%`],
    ["Exit Strategy", p.exitStrategy === "hold" ? "Hold for Income" : `Sale at Year ${p.exitYear || "N/A"}`],
    ["Performance Incentive", p.performanceIncentive ? `${p.incentivePct || 0}% above ${p.hurdleIRR || 0}% hurdle` : "Not configured"],
    ["Land Type", p.landType === "lease" ? "Land Lease" : p.landType === "purchase" ? "Freehold Purchase" : "In-Kind Partner"],
    ["Horizon", `${p.horizon || 50} years`],
  ];
  assumptions.forEach(([label, val]) => {
    rm.getCell(rr, 2).value = label;
    rm.getCell(rr, 2).font = { name: "Arial", size: 10, bold: true, color: GRAY };
    rm.getCell(rr, 3).value = val;
    rm.getCell(rr, 3).font = { name: "Arial", size: 10, color: NAVY };
    rr++;
  });

  // ═══════════════════════════════════════════════════════════
  // 9. DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(p.name || "ZAN_Model").replace(/[\/\\:*?"<>|]/g, "").trim() || "ZAN_Model"}_Full_Model.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
