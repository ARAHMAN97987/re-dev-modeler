# Component Inventory — Haseef Financial Modeler
> Created before UI redesign. Total verification target: **187 items**

---

## Components (50)
- [ ] `AppErrorBoundary` (line 60) — Error boundary wrapper, catches runtime errors
- [ ] `getMetricColor` (line 27) — Utility: returns color based on metric value
- [ ] `WaterfallView` (line 438) — Fund waterfall distribution (4-tier), charts, KPIs
- [ ] `ExitAnalysisPanel` (line 1033) — Exit strategy analysis (cap rate, sale, hold)
- [ ] `IncentivesImpact` (line 1176) — Government incentives impact summary
- [ ] `ResultsView` (line 1271) — Router: dispatches to Self/Bank/Waterfall based on finMode
- [ ] `SelfResultsView` (line 1294) — Self-funded project results
- [ ] `BankResultsView` (line 1645) — Bank debt/equity results
- [ ] `FieldGroup` (line 2225) — Collapsible field group wrapper
- [ ] `FL` (line 2233) — Form label wrapper
- [ ] `Inp` (line 2241) — Controlled number/text input with commit-on-blur
- [ ] `Drp` (line 2249) — Dropdown select wrapper
- [ ] `FinancingView` (line 2253) — Full financing configuration + outputs
- [ ] `EditableCell` (line 3160) — memo-wrapped editable table cell
- [ ] `SidebarInput` (line 3219) — memo-wrapped sidebar input field
- [ ] `useIsMobile` (line 3270) — Custom hook: 768px breakpoint
- [ ] `ReDevModelerInner` (line 3284) — Main app shell: state, routing, layout
- [ ] `ProjectSetupWizard` (line 3916) — 4-step onboarding wizard
- [ ] `FeaturesGrid` (line 4016) — Feature showcase grid (modal content)
- [ ] `LandingPage` (line 4044) — Public landing page with sign-in
- [ ] `ProjectsDashboard` (line 4163) — Projects list, KPI strip, templates, search
- [ ] `ShareModal` (line 4319) — Project sharing interface (link generation)
- [ ] `StatusBadge` (line 4455) — Project status badge (active/draft/complete)
- [ ] `Sec` (line 4472) — Collapsible section wrapper
- [ ] `Fld` (line 4486) — Field wrapper with label/hint
- [ ] `Sel` (line 4500) — Select/dropdown component
- [ ] `SidebarAdvisor` (line 4509) — Sidebar AI advisor + warning cards
- [ ] `ControlPanel` (line 4775) — Sidebar settings (General, Cost & Revenue)
- [ ] `HotelPLModal` (line 4819) — Hotel P&L configuration modal
- [ ] `MarinaPLModal` (line 4899) — Marina P&L configuration modal
- [ ] `ScoreCell` (line 4954) — Viability score renderer (Viable/Marginal/Weak)
- [ ] `AssetTable` (line 5002) — Asset CRUD table with templates, filters, import/export
- [ ] `ProjectDash` (line 5859) — Dashboard overview: KPIs, checklist, summaries
- [ ] `Tip` (line 6321) — Tooltip helper component
- [ ] `HelpLink` (line 8562) — Educational content link (opens EducationalModal)
- [ ] `EducationalModal` (line 8589) — Educational content modal (40+ topics)
- [ ] `LearningCenterView` (line 8901) — Academy with 10 sections, search, breadcrumb
- [ ] `KPI` (line 9353) — KPI card display component
- [ ] `CashFlowView` (line 9364) — Cash flow statement display
- [ ] `_domNotify` (line 9578) — DOM notification utility
- [ ] `generateFullModelXLSX` (line 9586) — Excel Full Model export
- [ ] `_buildXLSX` (line 9601) — SheetJS dynamic loader + Excel builder
- [ ] `generateFallbackCSV` (line 9752) — CSV export fallback
- [ ] `ReportsView` (line 9847) — Reports & export interface (3 export types + HTML report)
- [ ] `runScenario` (line 10690) — Scenario calculation engine
- [ ] `ScenariosView` (line 10705) — Scenario comparison interface
- [ ] `IncentivesView` (line 11238) — Incentives configuration interface
- [ ] `NI` (line 11470) — Numeric input component (incentives)
- [ ] `MarketView` (line 11474) — Market gap analysis interface
- [ ] `ChecksView` (line 11707) — Model integrity checks display
- [ ] `PresentationView` (line 11768) — Presentation mode with live sliders
- [ ] `ReDevModeler` (line 12151) — Default export wrapper with ErrorBoundary

---

## Tabs (11)
- [ ] **dashboard** — ProjectDash (KPIs, checklist, summaries)
- [ ] **assets** — AssetTable (CRUD, templates, import/export)
- [ ] **cashflow** — CashFlowView (annual cash flow statement)
- [ ] **financing** — FinancingView (debt/equity/fund config + outputs)
- [ ] **results** — ResultsView → dispatches to Self/Bank/Waterfall
- [ ] **incentives** — IncentivesView (government incentives config)
- [ ] **scenarios** — ScenariosView (scenario comparison)
- [ ] **market** — MarketView (market gap analysis)
- [ ] **checks** — ChecksView (model integrity checks)
- [ ] **reports** — ReportsView (export Excel/HTML/CSV)
- [ ] **presentation** — PresentationView (bank/investor audience, live sliders)

---

## Buttons (42)
### Navigation
- [ ] "← Back" / "→ رجوع" — go back to projects dashboard
- [ ] "+ New Project" / "+ مشروع جديد" — create new project
- [ ] "✦ Features" / "✦ المزايا" — open features modal
- [ ] "📚 Academy" / "📚 الأكاديمية" — open learning center
- [ ] "Sign Out" / "خروج" — sign out
- [ ] "عربي" / "English" — language toggle (appears in dashboard, landing, header)

### Header Bar (Editor)
- [ ] Sidebar toggle (☰) — open/close sidebar
- [ ] Undo button (↩) — undo last action (also Ctrl+Z)
- [ ] Present mode toggle — enter/exit presentation mode
- [ ] Header dropdown menu (⋮) — opens menu with AI, Share, Language, Academy, Sign Out
- [ ] "🤖 AI" — open AI assistant
- [ ] "🔗 Share" — open share modal
- [ ] "🌐 Language" — toggle AR/EN
- [ ] "🎓 Academy" — open learning center
- [ ] "🚪 Sign Out" — sign out

### Asset Table
- [ ] "+ Add Asset" / "+ إضافة أصل" — add blank asset
- [ ] "Download Template" / "تحميل النموذج" — download CSV template
- [ ] "Upload Excel" / "رفع ملف Excel" — import assets from file
- [ ] "Export to Excel" / "تصدير إلى Excel" — export assets to Excel
- [ ] Column picker button — show/hide columns
- [ ] "Show All" columns
- [ ] "Reset to Default" columns
- [ ] Per-asset: Edit, Duplicate (📋), Delete (🗑)
- [ ] Per-asset: "P&L" button (Hotel/Marina only)
- [ ] Cards/Table view toggle
- [ ] Phase/Category/Type filter buttons
- [ ] Clear filters button
- [ ] 6 asset templates (Hotel 5★, Hotel 4★, Retail, Office, Resi, Marina) + Custom

### Reports/Export
- [ ] "⬇ Full Model (Excel)" — Professional Excel export
- [ ] "⬇ Full Model (Excel + Formulas)" — Formula Excel export
- [ ] "⬇ Dynamic Model (15 sheets)" — Template Excel export
- [ ] "⬇ Data Report (Excel)" — Simple data export
- [ ] "⬇ Download Report (HTML/PDF)" — HTML report generation
- [ ] "Copy to Clipboard" — copy report as text

### Other
- [ ] "Expand All" / "Collapse All" — global expand/collapse toggle
- [ ] Phase filter chips (All Phases + per-phase) — in Results, Waterfall, Financing
- [ ] "Quick Edit - Fund Terms" — waterfall config panel toggle
- [ ] "Show Chart" / "Hide Chart" — toggle chart visibility
- [ ] Years selector (dropdown: 5/10/15/20/25/30/35/40)
- [ ] Presentation "Reset" — reset live sliders

---

## Modals & Dialogs (7)
- [ ] **ProjectSetupWizard** — 4-step wizard on new project (name/location, land type, financing, exit)
- [ ] **EducationalModal** — Educational content (40+ topics, bilingual, tabbed)
- [ ] **HotelPLModal** — Hotel P&L configuration (keys, ADR, occ, rev mix, expenses)
- [ ] **MarinaPLModal** — Marina P&L configuration (berths, pricing, fuel, ops)
- [ ] **ShareModal** — Generate share link, manage permissions
- [ ] **FeaturesGrid modal** — Platform features showcase
- [ ] **Delete confirmation** — "Are you sure?" for project deletion

---

## Sidebar Fields (ControlPanel) (10)
- [ ] Location (text) → `project.location`
- [ ] Start Year (number) → `project.startYear`
- [ ] Horizon in Years (number) → `project.horizon`
- [ ] Currency (select: SAR/USD/AED/EUR) → `project.currency`
- [ ] Soft Cost % (number) → `project.softCostPct`
- [ ] Contingency % (number) → `project.contingencyPct`
- [ ] Rent Escalation % (number) → `project.rentEscalation`
- [ ] Default Efficiency % (number) → `project.defaultEfficiency`
- [ ] Default Lease Rate (number) → `project.defaultLeaseRate`
- [ ] Default Cost/sqm (number) → `project.defaultCostPerSqm`

---

## Wizard Steps (4)
- [ ] Step 0: Project Name + Location
- [ ] Step 1: Land Type (lease/purchase/partner) with HelpLink
- [ ] Step 2: Financing Mode (self/bank100/debt/fund) with HelpLink
- [ ] Step 3: Exit Strategy (sale/hold) with HelpLink

---

## Asset Table Columns (22)
- [ ] # (row number)
- [ ] Phase (select)
- [ ] Category (select with auto-fill from benchmarks)
- [ ] Asset Name (text)
- [ ] Code (text)
- [ ] Plot Area (number, hidden by default)
- [ ] Footprint (number, hidden by default)
- [ ] GFA (number)
- [ ] Revenue Type (select: Lease/Operating/Sale)
- [ ] Efficiency % (number)
- [ ] Leasable Area (computed)
- [ ] Lease Rate (number)
- [ ] Op EBITDA (number)
- [ ] Escalation % (number, hidden by default)
- [ ] Ramp Years (number, hidden by default)
- [ ] Occupancy % (number, hidden by default)
- [ ] Cost/sqm (number)
- [ ] Build Duration (number, months)
- [ ] Total CAPEX (computed)
- [ ] Total Income (computed)
- [ ] Score (Viable/Marginal/Weak)
- [ ] Operations (edit/dup/delete)

---

## Features (19)
- [ ] **30-state undo system** — undoStack ref, Ctrl+Z globally, skips when input focused
- [ ] **Bilingual EN/AR** — `lang` state, `L` translation object (~107 keys), RTL support
- [ ] **Auto-save** — 2-second debounce, status indicator (saved/saving/error)
- [ ] **CSV import/export** — Download template, upload assets, export to Excel
- [ ] **Excel export: Professional** — `excelExport.js` → formatted Excel
- [ ] **Excel export: Formula** — `excelFormulaExport.js` → Excel with formulas
- [ ] **Excel export: Dynamic Model** — `excelTemplateExport.js` → 15-sheet template
- [ ] **HTML Report generation** — In-browser report with print/PDF
- [ ] **AI Assistant** — `AiAssistant.jsx` + `api/chat.js`
- [ ] **Academy/Learning Center** — 10 educational sections, search, demos, public mode
- [ ] **Supabase auth** — via `lib/auth.jsx` + `lib/supabase.js`
- [ ] **Storage abstraction** — `lib/storage.js` (handles local + shared projects)
- [ ] **Project sharing** — Share links with ownerId/projectId params
- [ ] **Presentation mode** — Bank/Investor audience views with live sliders
- [ ] **Scenario comparison** — Side-by-side scenario analysis with saved scenarios
- [ ] **Government incentives** — MODON, Kafalah, interest subsidy, zakat exemption
- [ ] **Market gap analysis** — Supply vs demand, absorption rates
- [ ] **Model integrity checks** — Automated checks (pass/fail/warning)
- [ ] **Toast notification system** — Success/error/info toasts with auto-dismiss

---

## External Imports (21)
- [ ] React: useState, useEffect, useCallback, useRef, useMemo, memo, Component
- [ ] Recharts: XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line, Legend
- [ ] `./lib/storage` — storage adapter
- [ ] `./excelExport` — generateProfessionalExcel
- [ ] `./excelFormulaExport` — generateFormulaExcel
- [ ] `./excelTemplateExport` — generateTemplateExcel
- [ ] `./embeddedFonts` — embeddedFontCSS
- [ ] `./AiAssistant` — AiAssistant component
- [ ] `./utils/csv.js` — csvEscape, csvParse, generateTemplate, parseAssetFile, mapRowsToAssets, exportAssetsToExcel, TEMPLATE_COLS
- [ ] `./data/translations.js` — CAT_AR, REV_AR, catL, revL
- [ ] `./data/benchmarks.js` — getBenchmark, benchmarkColor, getAutoFillDefaults, BENCHMARKS
- [ ] `./data/defaults.js` — defaultProject, defaultHotelPL, defaultMarinaPL
- [ ] `./utils/format.js` — fmt, fmtPct, fmtM
- [ ] `./engine/math.js` — calcIRR, calcNPV
- [ ] `./engine/hospitality.js` — calcHotelEBITDA, calcMarinaEBITDA
- [ ] `./engine/cashflow.js` — getScenarioMults, computeAssetCapex, computeProjectCashFlows
- [ ] `./engine/incentives.js` — computeIncentives, applyInterestSubsidy
- [ ] `./engine/financing.js` — computeFinancing
- [ ] `./engine/waterfall.js` — computeWaterfall
- [ ] `./engine/phases.js` — FINANCING_FIELDS, getPhaseFinancing, hasPerPhaseFinancing, migrateToPerPhaseFinancing, buildPhaseIncentives, buildPhaseVirtualProject, buildPhaseProjectResults, aggregatePhaseFinancings, aggregatePhaseWaterfalls, computeIndependentPhaseResults
- [ ] `./engine/legacy/phaseWaterfalls.js` — computePhaseWaterfalls
- [ ] `./engine/checks.js` — runChecks

---

## Supabase/Auth Integration Points (3)
- [ ] `src/lib/auth.jsx` — Auth gate component (login/signup)
- [ ] `src/lib/supabase.js` — Supabase client initialization
- [ ] `src/lib/storage.js` — Storage adapter (local + shared via Supabase RLS)

---

## CSS Animations (7)
- [ ] `fadeInUp` — opacity 0→1, translateY(8px)→0
- [ ] `fadeIn` — opacity 0→1
- [ ] `toastIn` — opacity 0→1, translateX(40px)→0
- [ ] `toastOut` — opacity 1→0, translateX(0)→40px
- [ ] `zanShimmer` — background-position -200%→200% (loading skeleton)
- [ ] `zanTabFade` — opacity 0→1, translateY(4px)→0
- [ ] `zanModalIn` — opacity 0→1, scale(0.96)→1

---

## Style Objects (8)
- [ ] `btnS` — Small button base style
- [ ] `btnSm` — Smaller button variant
- [ ] `btnPrim` — Primary button style
- [ ] `sideInputStyle` — Sidebar input style
- [ ] `cellInputStyle` — Table cell input style
- [ ] `tblStyle` — Table base style
- [ ] `thSt` — Table header cell style
- [ ] `tdSt` / `tdN` — Table data cell styles

---

## Constants & Config
- [ ] `STORAGE_KEY` = "redev:projects-index"
- [ ] `PROJECT_PREFIX` = "redev:project:"
- [ ] `METRIC_COLORS` / `METRIC_COLORS_DARK` — color palettes
- [ ] `PROJECT_TEMPLATES` (5) — waterfront, residential, commercial, hotel, blank
- [ ] `HOTEL_PRESETS` / `MARINA_PRESET` — default P&L values
- [ ] `L` object — ~107 translation keys (EN/AR)
- [ ] `ACADEMY_TERM_REGISTRY` — cross-reference terms for academy
- [ ] `ACADEMY_SECTION_ICONS` — icon mapping for academy sections

---

## Total: 187 items
