/**
 * ZAN Financial Engine — Market Data Source Registry
 * @module data/marketDataSources
 *
 * Defines external data sources, their parsing rules, and where each
 * data point routes inside the platform (benchmarks, fund defaults, etc.).
 *
 * Source types:
 *   "api"   – JSON REST endpoint (auto-fetch)
 *   "pdf"   – PDF report scraped / parsed externally, uploaded as JSON
 *   "email" – Newsletter data extracted and uploaded as JSON
 *   "manual"– Admin enters values through the UI
 */

// ─── Source Definitions ─────────────────────────────────────────────

export const DATA_SOURCES = [
  // ── Construction Cost Reports ──
  {
    id: "knight-frank-ksa",
    name: "Knight Frank — Saudi Construction Cost Report",
    nameAr: "تقرير نايت فرانك — تكاليف البناء في السعودية",
    type: "pdf",
    frequency: "quarterly",          // quarterly | monthly | annual
    url: "",                         // Filled when API is available
    category: "construction_costs",
    fields: [
      { key: "Retail.costPerSqm",        label: "Retail Cost/sqm",        labelAr: "تكلفة البناء/م² — تجاري" },
      { key: "Office.costPerSqm",        label: "Office Cost/sqm",        labelAr: "تكلفة البناء/م² — مكاتب" },
      { key: "Residential.costPerSqm",   label: "Residential Cost/sqm",   labelAr: "تكلفة البناء/م² — سكني" },
      { key: "Hotel4.costPerSqm",        label: "Hotel 4★ Cost/sqm",      labelAr: "تكلفة البناء/م² — فندق 4 نجوم" },
      { key: "Hotel5.costPerSqm",        label: "Hotel 5★ Cost/sqm",      labelAr: "تكلفة البناء/م² — فندق 5 نجوم" },
      { key: "Marina.costPerSqm",        label: "Marina Cost/sqm",        labelAr: "تكلفة البناء/م² — مارينا" },
      { key: "Industrial.costPerSqm",    label: "Industrial Cost/sqm",    labelAr: "تكلفة البناء/م² — صناعي" },
      { key: "Infrastructure.costPerSqm",label: "Infrastructure Cost/sqm", labelAr: "تكلفة البناء/م² — بنية تحتية" },
    ],
  },

  // ── Lease Rate Reports ──
  {
    id: "jll-ksa-leasing",
    name: "JLL — Saudi Leasing Market Report",
    nameAr: "تقرير جيه إل إل — سوق الإيجار في السعودية",
    type: "pdf",
    frequency: "quarterly",
    url: "",
    category: "lease_rates",
    fields: [
      { key: "Retail.leaseRate",      label: "Retail Lease Rate/sqm",      labelAr: "إيجار/م² — تجاري" },
      { key: "Office.leaseRate",      label: "Office Lease Rate/sqm",      labelAr: "إيجار/م² — مكاتب" },
      { key: "Residential.leaseRate", label: "Residential Lease Rate/sqm", labelAr: "إيجار/م² — سكني" },
      { key: "Industrial.leaseRate",  label: "Industrial Lease Rate/sqm",  labelAr: "إيجار/م² — صناعي" },
    ],
  },

  // ── Fund Fee Reports (CMA Prospectuses) ──
  {
    id: "cma-fund-fees",
    name: "CMA — REIT & Fund Fee Benchmarks",
    nameAr: "هيئة السوق المالية — رسوم الصناديق العقارية",
    type: "pdf",
    frequency: "quarterly",
    url: "",
    category: "fund_fees",
    fields: [
      { key: "subscriptionFeePct",  label: "Subscription Fee %",   labelAr: "رسوم الاشتراك %" },
      { key: "annualMgmtFeePct",    label: "Management Fee %",     labelAr: "رسوم الإدارة السنوية %" },
      { key: "structuringFeePct",   label: "Structuring Fee %",    labelAr: "رسوم الهيكلة %" },
      { key: "custodyFeeAnnual",    label: "Custody Fee (SAR)",    labelAr: "رسوم الحفظ السنوية (ريال)" },
      { key: "auditorFeeAnnual",    label: "Auditor Fee (SAR)",    labelAr: "رسوم المراجع السنوية (ريال)" },
      { key: "developerFeePct",     label: "Developer Fee %",      labelAr: "رسوم المطور %" },
      { key: "operatorFeePct",      label: "Operator Fee %",       labelAr: "رسوم المشغل %" },
    ],
  },

  // ── Financing Rate Reports (SAMA / Banks) ──
  {
    id: "sama-financing",
    name: "SAMA — Financing Rate Indicators",
    nameAr: "مؤسسة النقد — مؤشرات أسعار التمويل",
    type: "api",
    frequency: "quarterly",
    url: "",
    category: "financing_rates",
    fields: [
      { key: "financeRate",        label: "Bank Finance Rate %",     labelAr: "نسبة التمويل البنكي %" },
      { key: "govFinanceRate",     label: "Gov Finance Rate %",      labelAr: "نسبة التمويل الحكومي %" },
      { key: "maxLtvPct",          label: "Max LTV %",               labelAr: "نسبة التمويل إلى القيمة %" },
    ],
  },

  // ── Hospitality Performance (STR / Colliers) ──
  {
    id: "str-hospitality",
    name: "STR — Saudi Hospitality Performance",
    nameAr: "تقرير STR — أداء الفنادق في السعودية",
    type: "pdf",
    frequency: "quarterly",
    url: "",
    category: "hospitality",
    fields: [
      { key: "Hotel4.adr",         label: "Hotel 4★ ADR (SAR)",     labelAr: "متوسط سعر الغرفة — 4 نجوم" },
      { key: "Hotel5.adr",         label: "Hotel 5★ ADR (SAR)",     labelAr: "متوسط سعر الغرفة — 5 نجوم" },
      { key: "Hotel4.occupancy",   label: "Hotel 4★ Occupancy %",   labelAr: "نسبة الإشغال — 4 نجوم" },
      { key: "Hotel5.occupancy",   label: "Hotel 5★ Occupancy %",   labelAr: "نسبة الإشغال — 5 نجوم" },
    ],
  },

  // ── Exit / Cap Rate Data ──
  {
    id: "cbre-cap-rates",
    name: "CBRE — Saudi Cap Rate Survey",
    nameAr: "تقرير CBRE — معدلات الرسملة في السعودية",
    type: "pdf",
    frequency: "annual",
    url: "",
    category: "exit_rates",
    fields: [
      { key: "Retail.exitCapRate",      label: "Retail Cap Rate %",      labelAr: "معدل الرسملة — تجاري" },
      { key: "Office.exitCapRate",      label: "Office Cap Rate %",      labelAr: "معدل الرسملة — مكاتب" },
      { key: "Residential.exitCapRate", label: "Residential Cap Rate %", labelAr: "معدل الرسملة — سكني" },
      { key: "Industrial.exitCapRate",  label: "Industrial Cap Rate %",  labelAr: "معدل الرسملة — صناعي" },
      { key: "Hospitality.exitCapRate", label: "Hospitality Cap Rate %", labelAr: "معدل الرسملة — ضيافة" },
    ],
  },
];

// ─── Category Labels ────────────────────────────────────────────────

export const CATEGORY_LABELS = {
  construction_costs: { en: "Construction Costs",     ar: "تكاليف البناء" },
  lease_rates:        { en: "Lease Rates",            ar: "أسعار الإيجار" },
  fund_fees:          { en: "Fund Fees & Charges",    ar: "رسوم الصندوق" },
  financing_rates:    { en: "Financing Rates",        ar: "أسعار التمويل" },
  hospitality:        { en: "Hospitality Performance", ar: "أداء الضيافة" },
  exit_rates:         { en: "Exit / Cap Rates",       ar: "معدلات الرسملة" },
};

// ─── Field → Platform Target Mapping ────────────────────────────────
// Maps each market data field to where it should appear in the platform.

export const FIELD_ROUTING = {
  // Construction costs → benchmarks.js BENCHMARKS + asset defaults
  "Retail.costPerSqm":         { target: "benchmark", assetType: "Retail",       field: "costPerSqm" },
  "Office.costPerSqm":         { target: "benchmark", assetType: "Office",       field: "costPerSqm" },
  "Residential.costPerSqm":    { target: "benchmark", assetType: "Residential",  field: "costPerSqm" },
  "Hotel4.costPerSqm":         { target: "benchmark", assetType: "Hotel 4★",     field: "costPerSqm" },
  "Hotel5.costPerSqm":         { target: "benchmark", assetType: "Hotel 5★",     field: "costPerSqm" },
  "Marina.costPerSqm":         { target: "benchmark", assetType: "Marina",       field: "costPerSqm" },
  "Industrial.costPerSqm":     { target: "benchmark", assetType: "Industrial",   field: "costPerSqm" },
  "Infrastructure.costPerSqm": { target: "benchmark", assetType: "Infrastructure", field: "costPerSqm" },

  // Lease rates → benchmarks.js BENCHMARKS
  "Retail.leaseRate":      { target: "benchmark", assetType: "Retail",      field: "leaseRate" },
  "Office.leaseRate":      { target: "benchmark", assetType: "Office",      field: "leaseRate" },
  "Residential.leaseRate": { target: "benchmark", assetType: "Residential", field: "leaseRate" },
  "Industrial.leaseRate":  { target: "benchmark", assetType: "Industrial",  field: "leaseRate" },

  // Fund fees → defaults.js project defaults
  "subscriptionFeePct":  { target: "projectDefault", field: "subscriptionFeePct" },
  "annualMgmtFeePct":    { target: "projectDefault", field: "annualMgmtFeePct" },
  "structuringFeePct":   { target: "projectDefault", field: "structuringFeePct" },
  "custodyFeeAnnual":    { target: "projectDefault", field: "custodyFeeAnnual" },
  "auditorFeeAnnual":    { target: "projectDefault", field: "auditorFeeAnnual" },
  "developerFeePct":     { target: "projectDefault", field: "developerFeePct" },
  "operatorFeePct":      { target: "projectDefault", field: "operatorFeePct" },

  // Financing rates → defaults.js project defaults
  "financeRate":    { target: "projectDefault", field: "financeRate" },
  "govFinanceRate": { target: "projectDefault", field: "govFinanceRate" },
  "maxLtvPct":      { target: "projectDefault", field: "maxLtvPct" },

  // Hospitality → hotel P&L defaults
  "Hotel4.adr":       { target: "hotelDefault", grade: "4", field: "adr" },
  "Hotel5.adr":       { target: "hotelDefault", grade: "5", field: "adr" },
  "Hotel4.occupancy": { target: "hotelDefault", grade: "4", field: "stabOcc" },
  "Hotel5.occupancy": { target: "hotelDefault", grade: "5", field: "stabOcc" },

  // Exit cap rates → per-asset-type exit defaults
  "Retail.exitCapRate":      { target: "exitDefault", assetType: "Retail",      field: "exitCapRate" },
  "Office.exitCapRate":      { target: "exitDefault", assetType: "Office",      field: "exitCapRate" },
  "Residential.exitCapRate": { target: "exitDefault", assetType: "Residential", field: "exitCapRate" },
  "Industrial.exitCapRate":  { target: "exitDefault", assetType: "Industrial",  field: "exitCapRate" },
  "Hospitality.exitCapRate": { target: "exitDefault", assetType: "Hospitality", field: "exitCapRate" },
};
