// Extracted from App.jsx lines 8708-8899
// Academy configuration data: term registry, paths, related sections, demo projects

export const ACADEMY_TERM_REGISTRY = {
  "IRR": { key: "financialMetrics", tab: 0 },
  "NPV": { key: "financialMetrics", tab: 1 },
  "MOIC": { key: "financialMetrics", tab: 2 },
  "DSCR": { key: "financialMetrics", tab: 3 },
  "Leverage": { key: "financialMetrics", tab: 4 },
  "الرافعة المالية": { key: "financialMetrics", tab: 4 },
  "المرابحة": { key: "islamicFinance", tab: 0 },
  "Murabaha": { key: "islamicFinance", tab: 0 },
  "الإجارة": { key: "islamicFinance", tab: 1 },
  "Ijara": { key: "islamicFinance", tab: 1 },
  "Cap Rate": { key: "exitStrategy", tab: 1 },
  "معدل الرسملة": { key: "exitStrategy", tab: 1 },
  "شلال التوزيعات": { key: "waterfallConcepts", tab: 0 },
  "Waterfall": { key: "waterfallConcepts", tab: 0 },
  "العائد المفضل": { key: "waterfallConcepts", tab: 1 },
  "Preferred Return": { key: "waterfallConcepts", tab: 1 },
  "GP Catch-up": { key: "waterfallConcepts", tab: 2 },
  "Profit Split": { key: "waterfallConcepts", tab: 3 },
  "SAIBOR": { key: "islamicFinance", tab: 0 },
  "LTV": { key: "financingMode", tab: 2 },
};

export const ACADEMY_PATHS = [
  {
    id: "quickstart",
    icon: "🚀",
    title: { ar: "البداية السريعة", en: "Quick Start" },
    desc: { ar: "ابدأ هنا: دليل عملي خطوة بخطوة لبناء أول نموذج مالي لك", en: "Start here: step-by-step practical guide to building your first financial model" },
    sections: ["quickStart", "projectTypes"],
    color: "#f59e0b",
  },
  {
    id: "foundations",
    icon: "🧱",
    title: { ar: "أساسيات النمذجة المالية", en: "Financial Modeling Foundations" },
    desc: { ar: "المفاهيم الأساسية: المقاييس المالية، أنواع الأرض، وتحليل السيناريوهات", en: "Core concepts: financial metrics, land types, and scenario analysis" },
    sections: ["financialMetrics", "landType", "scenarioAnalysis"],
    color: "#2563eb",
  },
  {
    id: "structuring",
    icon: "🏗",
    title: { ar: "هيكلة التمويل والاستثمار", en: "Financing & Investment Structuring" },
    desc: { ar: "خيارات التمويل البنكي، الإسلامي، الصناديق، والحوافز الحكومية", en: "Bank debt, Islamic finance, fund structures, and government incentives" },
    sections: ["financingMode", "islamicFinance", "govIncentives", "waterfallConcepts"],
    color: "#8b5cf6",
  },
  {
    id: "exits",
    icon: "🎯",
    title: { ar: "التخارج والتقديم للبنك", en: "Exit & Bank Submission" },
    desc: { ar: "استراتيجيات التخارج، حساب العوائد، وتجهيز حزمة البنك", en: "Exit strategies, return calculations, and bank pack preparation" },
    sections: ["exitStrategy", "bankPack", "financialMetrics"],
    color: "#16a34a",
  },
];

export const ACADEMY_RELATED = {
  financingMode: ["islamicFinance", "financialMetrics", "waterfallConcepts"],
  landType: ["financingMode", "exitStrategy", "projectTypes"],
  exitStrategy: ["financialMetrics", "waterfallConcepts", "bankPack"],
  waterfallConcepts: ["financingMode", "exitStrategy", "financialMetrics"],
  islamicFinance: ["financingMode", "govIncentives", "bankPack"],
  govIncentives: ["financingMode", "islamicFinance", "scenarioAnalysis"],
  financialMetrics: ["exitStrategy", "waterfallConcepts", "bankPack"],
  scenarioAnalysis: ["financialMetrics", "financingMode", "bankPack"],
  projectTypes: ["landType", "financingMode", "quickStart"],
  bankPack: ["financialMetrics", "scenarioAnalysis", "exitStrategy"],
  quickStart: ["projectTypes", "financingMode", "landType"],
};

export const ACADEMY_SECTION_ICONS = {
  financingMode: "🏦",
  landType: "🏗",
  exitStrategy: "🚪",
  waterfallConcepts: "🌊",
  islamicFinance: "☪️",
  govIncentives: "🏛",
  financialMetrics: "📊",
  scenarioAnalysis: "🔄",
  projectTypes: "🏘",
  bankPack: "📋",
  quickStart: "🚀",
};

export const ACADEMY_DEMO_PROJECTS = [
  {
    id: "demo_self_residential",
    icon: "🏘",
    title: { ar: "مجمع سكني - تمويل ذاتي", en: "Residential - Self Funded" },
    desc: { ar: "مشروع سكني بسيط بتمويل ذاتي كامل. أبسط سيناريو للتعلم.", en: "Simple residential project, fully self-funded. Easiest scenario to learn." },
    tags: ["self", "purchase", "hold"],
    overrides: {
      name: "", landType: "purchase", landPurchasePrice: 15000000, landArea: 10000,
      finMode: "self", exitStrategy: "hold", horizon: 25, location: "الرياض - حي النرجس",
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 24, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Residential", name: "برج سكني", code: "T1", gfa: 18000, footprint: 2500, plotArea: 5000, revType: "Lease", efficiency: 85, leaseRate: 900, escalation: 1.0, rampUpYears: 2, stabilizedOcc: 90, costPerSqm: 3000, constrStart: 1, constrDuration: 24, opEbitda: 0 },
        { phase: "Phase 1", category: "Amenity", name: "مرافق خدمية", code: "AM", gfa: 1500, footprint: 1200, plotArea: 2000, revType: "Lease", efficiency: 50, leaseRate: 400, escalation: 0.5, rampUpYears: 1, stabilizedOcc: 80, costPerSqm: 2000, constrStart: 1, constrDuration: 18, opEbitda: 0 },
      ],
    },
  },
  {
    id: "demo_bank_commercial",
    icon: "🏢",
    title: { ar: "مركز تجاري - تمويل بنكي", en: "Commercial Center - Bank Debt" },
    desc: { ar: "مول تجاري مع تمويل بنكي. تعلّم كيف يعمل DSCR وخدمة الدين.", en: "Shopping mall with bank financing. Learn how DSCR and debt service work." },
    tags: ["debt", "lease", "sale"],
    overrides: {
      name: "", landType: "lease", landArea: 15000, landRentAnnual: 3000000, landRentGrace: 3,
      finMode: "debt", debtAllowed: true, maxLtvPct: 65, financeRate: 7, loanTenor: 10, debtGrace: 3, upfrontFeePct: 1,
      exitStrategy: "sale", exitMultiple: 12, exitCostPct: 2, exitYear: 0,
      horizon: 30, location: "جدة - كورنيش",
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 30, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Retail", name: "مول تجاري", code: "RM", gfa: 22000, footprint: 11000, plotArea: 12000, revType: "Lease", efficiency: 80, leaseRate: 2200, escalation: 1.0, rampUpYears: 3, stabilizedOcc: 88, costPerSqm: 4200, constrStart: 1, constrDuration: 30, opEbitda: 0 },
        { phase: "Phase 1", category: "Infrastructure", name: "مواقف", code: "PK", gfa: 6000, footprint: 3000, plotArea: 3000, revType: "Lease", efficiency: 0, leaseRate: 0, escalation: 0, rampUpYears: 0, stabilizedOcc: 100, costPerSqm: 1500, constrStart: 1, constrDuration: 18, opEbitda: 0 },
      ],
    },
  },
  {
    id: "demo_fund_hotel",
    icon: "🏨",
    title: { ar: "فندق 5 نجوم - صندوق استثماري", en: "5-Star Hotel - Investment Fund" },
    desc: { ar: "فندق فاخر بهيكل صندوق GP/LP مع شلال توزيعات. أعقد سيناريو.", en: "Luxury hotel with GP/LP fund structure and waterfall. Most complex scenario." },
    tags: ["fund", "lease", "sale"],
    overrides: {
      name: "", landType: "lease", landArea: 12000, landRentAnnual: 4500000, landRentGrace: 5,
      landCapitalize: true, landCapRate: 1200, landCapTo: "gp",
      finMode: "fund", vehicleType: "fund", debtAllowed: true, maxLtvPct: 60, financeRate: 6.5, loanTenor: 10, debtGrace: 4, upfrontFeePct: 0.75,
      subscriptionFeePct: 2, annualMgmtFeePct: 1.5, developerFeePct: 10, structuringFeePct: 1, custodyFeeAnnual: 100000,
      exitStrategy: "sale", exitMultiple: 14, exitCostPct: 2.5, exitYear: 0,
      prefReturnPct: 12, gpCatchup: true, carryPct: 25, lpProfitSplitPct: 75,
      horizon: 30, location: "الرياض - KAFD",
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 42, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Hospitality", name: "فندق 5 نجوم", code: "H5", gfa: 25000, footprint: 5000, plotArea: 12000, revType: "Operating", efficiency: 0, leaseRate: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 100, costPerSqm: 12000, constrStart: 1, constrDuration: 42, opEbitda: 52000000 },
      ],
    },
  },
  {
    id: "demo_mixed_waterfront",
    icon: "🌊",
    title: { ar: "واجهة بحرية متكاملة", en: "Waterfront Mixed-Use" },
    desc: { ar: "مشروع مختلط: مول + فندق + مكاتب + سكني + مارينا. النموذج الأشمل.", en: "Mixed project: mall + hotel + offices + residential + marina. The most comprehensive model." },
    tags: ["fund", "lease", "sale"],
    overrides: {
      name: "", landType: "lease", landArea: 55000, landRentAnnual: 8000000, landRentGrace: 5, landRentTerm: 50,
      landCapitalize: true, landCapRate: 1000, landCapTo: "gp",
      finMode: "fund", vehicleType: "fund", debtAllowed: true, maxLtvPct: 60, financeRate: 6.5, loanTenor: 8, debtGrace: 3, upfrontFeePct: 0.5,
      subscriptionFeePct: 2, annualMgmtFeePct: 1.5, developerFeePct: 10, structuringFeePct: 1,
      exitStrategy: "sale", exitMultiple: 10, exitCostPct: 2, exitYear: 0,
      prefReturnPct: 15, gpCatchup: true, carryPct: 30, lpProfitSplitPct: 70,
      horizon: 50, location: "جازان - الواجهة البحرية",
      phases: [
        { name: "Phase 1", startYearOffset: 1, completionMonth: 36, footprint: 0 },
        { name: "Phase 2", startYearOffset: 3, completionMonth: 72, footprint: 0 },
      ],
      assets: [
        { phase: "Phase 1", category: "Retail", name: "Marina Mall", code: "C1", gfa: 31000, footprint: 20000, plotArea: 28000, revType: "Lease", efficiency: 80, leaseRate: 2100, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 95, costPerSqm: 3900, constrStart: 2, constrDuration: 36, opEbitda: 0 },
        { phase: "Phase 1", category: "Hospitality", name: "فندق 4 نجوم", code: "H1", gfa: 16000, footprint: 2000, plotArea: 5000, revType: "Operating", efficiency: 0, leaseRate: 0, escalation: 0.75, rampUpYears: 4, stabilizedOcc: 100, costPerSqm: 8000, constrStart: 2, constrDuration: 36, opEbitda: 14000000 },
        { phase: "Phase 2", category: "Office", name: "برج مكاتب", code: "O1", gfa: 16000, footprint: 2700, plotArea: 5500, revType: "Lease", efficiency: 90, leaseRate: 900, escalation: 0.75, rampUpYears: 2, stabilizedOcc: 88, costPerSqm: 2600, constrStart: 3, constrDuration: 36, opEbitda: 0 },
        { phase: "Phase 2", category: "Residential", name: "أبراج سكنية", code: "R1", gfa: 14000, footprint: 2000, plotArea: 4000, revType: "Lease", efficiency: 85, leaseRate: 800, escalation: 0.75, rampUpYears: 2, stabilizedOcc: 90, costPerSqm: 2800, constrStart: 3, constrDuration: 30, opEbitda: 0 },
      ],
    },
  },
  {
    id: "demo_incentives",
    icon: "🏛",
    title: { ar: "مشروع مدعوم حكومياً", en: "Government-Supported Project" },
    desc: { ar: "مشروع يستفيد من حوافز حكومية: دعم CAPEX، إعفاء إيجار أرض، دعم تمويل.", en: "Project benefiting from government incentives: CAPEX grant, land rebate, finance support." },
    tags: ["debt", "lease", "hold"],
    overrides: {
      name: "", landType: "lease", landArea: 20000, landRentAnnual: 2000000, landRentGrace: 5,
      finMode: "debt", debtAllowed: true, maxLtvPct: 70, financeRate: 7, loanTenor: 10, debtGrace: 3,
      exitStrategy: "hold", horizon: 30, location: "جازان - المنطقة الصناعية",
      incentives: {
        capexGrant: { enabled: true, grantPct: 25, maxCap: 30000000, phases: [], timing: "construction" },
        financeSupport: { enabled: true, subType: "interestSubsidy", subsidyPct: 50, subsidyYears: 5, subsidyStart: "operation", softLoanAmount: 0, softLoanTenor: 10, softLoanGrace: 3, phases: [] },
        landRentRebate: { enabled: true, constrRebatePct: 100, constrRebateYears: 0, operRebatePct: 50, operRebateYears: 5, phases: [] },
        feeRebates: { enabled: false, items: [], phases: [] },
      },
      phases: [{ name: "Phase 1", startYearOffset: 1, completionMonth: 24, footprint: 0 }],
      assets: [
        { phase: "Phase 1", category: "Retail", name: "مركز تجاري", code: "RM", gfa: 15000, footprint: 8000, plotArea: 12000, revType: "Lease", efficiency: 80, leaseRate: 1800, escalation: 1.0, rampUpYears: 3, stabilizedOcc: 85, costPerSqm: 3500, constrStart: 1, constrDuration: 24, opEbitda: 0 },
        { phase: "Phase 1", category: "Office", name: "مكاتب", code: "OF", gfa: 8000, footprint: 2000, plotArea: 4000, revType: "Lease", efficiency: 88, leaseRate: 800, escalation: 0.75, rampUpYears: 2, stabilizedOcc: 80, costPerSqm: 2800, constrStart: 1, constrDuration: 24, opEbitda: 0 },
      ],
    },
  },
];
