/**
 * ZAN Financial Engine — CSV Import/Export Utilities
 * @module utils/csv
 * 
 * Dependencies: none (uses browser APIs: Blob, URL, FileReader, document)
 * Used by: UI for asset import/export
 */

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

export function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function csvParse(text) {
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

export function generateTemplate() {
  const hdr = TEMPLATE_COLS.map(c => c.en);
  const allRows = [hdr, ...SAMPLE_ROWS];
  const csv = allRows.map(r => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Haseef_Asset_Template.csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAssetFile(file, project) {
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

export function mapRowsToAssets(headerRow, dataRows, project) {
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

export function exportAssetsToExcel(project, results) {
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

export { TEMPLATE_COLS };
