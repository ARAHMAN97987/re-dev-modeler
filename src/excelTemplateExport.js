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

  // ── Helper: force-write a cell, even if it has a formula ──
  // Used ONLY for Program sheet computed inputs (R column) where the template
  // VLOOKUP gives the same startYearOffset for all assets in a phase, but the
  // engine computes per-asset construction starts (completionYear - durYears).
  // This is still an INPUT — not a computed result — it's just that the template
  // formula doesn't support per-asset timing.
  function forceInput(sheetName, cellRef, value) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) return;
    const cell = ws.getCell(cellRef);
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
  // Write effective rent start offset matching engine's auto/grace/income logic.
  // Template formula: IF(year - startYear + 1 <= grace, 0, rent) — uses grace as rent start.
  // Engine computes rentStartYear from landRentStartRule (auto=MIN(grace,firstIncome)).
  // Write the engine-computed effective start offset so template matches.
  const effectiveGrace = (results && results.landRentMeta && results.landRentMeta.rentStartYear !== undefined)
    ? results.landRentMeta.rentStartYear
    : (p.landRentGrace || 5);
  setInput(INP, "C21", effectiveGrace);
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
  // Template formula C64 = C63*1000 (hardcoded rate). Override with correct land cap value
  // matching engine: landCapValue = landCapitalize ? landArea × landCapRate : 0
  const canCapitalize = p.landType === "lease" || p.landType === "bot";
  const landCapValue = (p.landCapitalize && canCapitalize)
    ? (p.landArea || 0) * (p.landCapRate || 1000) : 0;
  forceInput(INP, "C64", landCapValue);

  // Section 8: Debt
  setInput(INP, "C85", pct(p.maxLtvPct));

  // Section 9: Land Type
  const landTypeMap = { lease: "Lease", purchase: "Purchase", partner: "Partner", bot: "BOT" };
  setInput(INP, "C88", landTypeMap[p.landType] || "Lease");
  setInput(INP, "C93", p.landPurchasePrice || 0);
  setInput(INP, "C94", pct(p.partnerEquityPct));
  setInput(INP, "C95", p.botOperationYears || 0);

  // Section 10: Financing Mode
  const finModeMap = { self: "Self", debt: "Bank", fund: "Fund", jv: "JV" };
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

    // Find phase name
    const phaseName = a.phase || phases[0]?.name || "Phase 1";
    // Map to ZAN naming (Phase 1 → ZAN 1, etc.)
    const zanPhase = phaseName.replace(/Phase\s*/i, "ZAN ");

    setInput(PRG, `A${row}`, zanPhase);
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
    // Col N = Escalation per asset. Template formula reads Inputs!C41 (project-level)
    // for most assets, but engine supports per-asset override via asset.escalation.
    // Force-write the effective escalation matching the engine logic.
    const projectEsc = p.rentEscalation ?? 0;
    const assetEsc = a.escalation ?? projectEsc;
    forceInput(PRG, `N${row}`, pct(assetEsc));

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
    // R column: Template has VLOOKUP formula giving same startYearOffset for all
    // assets in a phase. Engine computes per-asset: completionYear - durYears.
    // Must force-write to override the VLOOKUP formula with per-asset timing.
    forceInput(PRG, `R${row}`, actualConstrStart);
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

    // Fund info
    const fundName = f.fundName || p.fundName || `${p.name || "Project"} Fund`;
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
  }

  // ═══════════════════════════════════════════════════════════
  // 6. FILL BANK INPUTS
  // ═══════════════════════════════════════════════════════════
  setInput("Bank", "C4", "[Bank Name]");
  setInput("Bank", "C5", "All");
  setInput("Bank", "C6", 10);
  setInput("Bank", "C22", p.repaymentType === "bullet" ? "Bullet" : "Equal Installment");

  // ═══════════════════════════════════════════════════════════
  // 7. DOWNLOAD
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
