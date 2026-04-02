import { useState, useEffect, useCallback, useRef, useMemo, memo, Component } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { storage } from "./lib/storage";
import { generateProfessionalExcel } from "./excelExport";
import { generateFormulaExcel } from "./excelFormulaExport";
import { generateTemplateExcel } from "./excelTemplateExport";
import { embeddedFontCSS } from "./embeddedFonts";
import AiAssistant from "./AiAssistant";
import { IncomeFundResultsView } from "./components/views/ResultsView";
import Tip from "./components/shared/Tip";
import { FieldGroup, FL, Inp, Drp } from "./components/shared/FormWidgets";
import EditableCell from "./components/shared/EditableCell";
import SidebarInput from "./components/shared/SidebarInput";
import { EDUCATIONAL_CONTENT } from "./data/educational-content.js";
import HelpLink from "./components/shared/HelpLink";
import EducationalModal from "./components/shared/EducationalModal";
import { useIsMobile } from "./components/shared/hooks";
import StatusBadge from "./components/shared/StatusBadge";
import FeaturesGrid from "./components/shared/FeaturesGrid";
import NI from "./components/shared/NI";
import HotelPLModal from "./components/shared/HotelPLModal";
import MarinaPLModal from "./components/shared/MarinaPLModal";

// ═══════════════════════════════════════════════════════════════
// Haseef Financial Modeler — Project Engine v3 (Stable)
// ═══════════════════════════════════════════════════════════════

// ── Functional Colors — consistent metric coloring across all tabs ──
const METRIC_COLORS = { success: "#10b981", warning: "#f59e0b", error: "#ef4444", neutral: "#6b7080", muted: "#9ca3af" };
const METRIC_COLORS_DARK = { success: "#4ade80", warning: "#fbbf24", error: "#f87171", neutral: "#8b90a0", muted: "#6b7080" };

/**
 * Returns the functional color for a financial metric based on its value.
 * @param {string} metric - One of: IRR, DSCR, LTV, NPV, MOIC, cashFlow
 * @param {number|null} value - The numeric value (IRR as decimal e.g. 0.15, DSCR as ratio, LTV as %, NPV as amount, MOIC as multiple)
 * @param {object} [opts] - Options: { dark: false, raw: false }
 *   dark=true returns lighter colors for dark backgrounds
 *   raw=true returns 'success'|'warning'|'error' instead of hex
 * @returns {string} hex color or level string
 */
const getMetricColor = (metric, value, opts = {}) => {
  const { dark = false, raw = false } = opts;
  if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
    return raw ? "neutral" : (dark ? METRIC_COLORS_DARK.muted : METRIC_COLORS.muted);
  }
  const palette = dark ? METRIC_COLORS_DARK : METRIC_COLORS;
  let level = "neutral";
  switch (metric) {
    case "IRR":
      level = value >= 0.15 ? "success" : value >= 0.10 ? "warning" : "error";
      break;
    case "DSCR":
      level = value >= 1.5 ? "success" : value >= 1.2 ? "warning" : "error";
      break;
    case "LTV":
      level = value <= 60 ? "success" : value <= 70 ? "warning" : "error";
      break;
    case "NPV":
      level = value > 0 ? "success" : value === 0 ? "warning" : "error";
      break;
    case "MOIC":
      level = value >= 2.0 ? "success" : value >= 1.5 ? "warning" : "error";
      break;
    case "cashFlow":
      level = value > 0 ? "success" : value === 0 ? "neutral" : "error";
      break;
    default:
      return raw ? "neutral" : palette.neutral;
  }
  return raw ? level : palette[level];
};

// ── Error Boundary — prevents white screen on runtime errors ─
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Haseef Error Boundary caught:", error, info?.componentStack); }
  render() {
    if (this.state.hasError) {
      const isAr = document.documentElement.lang === "ar";
      return (
        <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",color:"#d0d4dc"}}>
          <div style={{textAlign:"center",maxWidth:460,padding:32}}>
            <div style={{fontSize:28,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif",marginBottom:8}}>{isAr?"حصيف":"Haseef"}</div>
            <div style={{fontSize:16,fontWeight:600,color:"#f87171",marginBottom:16}}>{isAr?"حدث خطأ غير متوقع":"An unexpected error occurred"}</div>
            <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:24,lineHeight:1.6}}>{isAr?"يمكنك إعادة المحاولة أو تحميل الصفحة من جديد. بياناتك محفوظة.":"You can retry or reload the page. Your data is saved."}</div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:"10px 24px",background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{isAr?"إعادة المحاولة":"Retry"}</button>
              <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",background:"#1e2230",color:"#d0d4dc",border:"1px solid #282d3a",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{isAr?"تحديث الصفحة":"Reload Page"}</button>
            </div>
            <details style={{marginTop:24,textAlign:"start"}}>
              <summary style={{fontSize:10,color:"var(--text-secondary)",cursor:"pointer"}}>{isAr?"تفاصيل الخطأ":"Error details"}</summary>
              <pre style={{fontSize:10,color:"var(--text-secondary)",background:"#0F2D4F",padding:12,borderRadius:6,marginTop:8,overflow:"auto",maxHeight:120,whiteSpace:"pre-wrap"}}>{this.state.error?.message || "Unknown error"}{"\n"}{this.state.error?.stack?.split("\n").slice(0,4).join("\n")}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── CSV helpers — imported from utils/csv.js ──
import { csvEscape, csvParse, generateTemplate, parseAssetFile, mapRowsToAssets, exportAssetsToExcel, TEMPLATE_COLS } from './utils/csv.js';

const STORAGE_KEY = "redev:projects-index";
const PROJECT_PREFIX = "redev:project:";

// ── URL Hash Navigation ──
const VALID_TABS = new Set(["dashboard","assets","cashflow","financing","incentives","results","scenarios","market","checks","reports"]);
function parseNavHash() {
  const h = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#\/?/, "");
  if (!h) return { view: "dashboard", projectId: null, tab: "dashboard" };
  const parts = h.split("/");
  if (parts[0] === "academy") return { view: "academy", projectId: null, tab: "dashboard" };
  if (parts[0] === "project" && parts[1]) {
    const tab = VALID_TABS.has(parts[2]) ? parts[2] : "dashboard";
    return { view: "editor", projectId: parts[1], tab };
  }
  return { view: "dashboard", projectId: null, tab: "dashboard" };
}
function setNavHash(view, projectId, tab) {
  if (typeof window === "undefined") return;
  let hash = "#/";
  if (view === "editor" && projectId) hash = "#/project/" + projectId + (tab && tab !== "dashboard" ? "/" + tab : "");
  else if (view === "academy") hash = "#/academy";
  if (window.location.hash === hash || "#" + window.location.hash.slice(1) === hash) return;
  window.history.replaceState(null, "", hash);
}
function pushNavHash(view, projectId, tab) {
  if (typeof window === "undefined") return;
  let hash = "#/";
  if (view === "editor" && projectId) hash = "#/project/" + projectId + (tab && tab !== "dashboard" ? "/" + tab : "");
  else if (view === "academy") hash = "#/academy";
  if (window.location.hash === hash) return;
  window.history.pushState(null, "", hash);
}

import { L, CAT_AR, REV_AR, catL, revL } from './data/translations.js';
import { CATEGORIES, REV_TYPES, CURRENCIES, SCENARIOS, LAND_TYPES, HOTEL_PRESETS } from './data/constants.js';

// MARINA_PRESET moved to data/constants.js

// ── Saudi Market Benchmarks — imported from data/benchmarks.js ──
import { getBenchmark, benchmarkColor, getAutoFillDefaults, BENCHMARKS } from './data/benchmarks.js';

// ── Project Templates (Sprint 1C) ──
const PROJECT_TEMPLATES = [
  { id:"waterfront", icon:"🌊", en:"Waterfront Mixed-Use", ar:"واجهة بحرية متعددة الاستخدامات",
    desc_en:"Mall, hotel, office, residential, marina, fuel station", desc_ar:"مول، فندق، مكاتب، سكني، مارينا، محطة وقود",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:36,footprint:0},{name:"Phase 2",startYearOffset:3,completionMonth:72,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Marina Mall",code:"C1",gfa:31260,footprint:20840,plotArea:28947,revType:"Lease",efficiency:80,leaseRate:2100,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:3900,constrStart:2,constrDuration:36,opEbitda:0},
      {phase:"Phase 1",category:"Hospitality",name:"Hotel (4-Star)",code:"H1",gfa:16577,footprint:2072,plotArea:5133,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:8000,constrStart:2,constrDuration:36,opEbitda:13901057},
      {phase:"Phase 2",category:"Office",name:"Office Block",code:"O1",gfa:16429,footprint:2710,plotArea:5497,revType:"Lease",efficiency:90,leaseRate:900,escalation:0.75,rampUpYears:2,stabilizedOcc:100,costPerSqm:2600,constrStart:3,constrDuration:36,opEbitda:0},
      {phase:"Phase 2",category:"Residential",name:"Residential Tower",code:"R1",gfa:14000,footprint:2000,plotArea:4000,revType:"Lease",efficiency:85,leaseRate:800,escalation:0.75,rampUpYears:2,stabilizedOcc:92,costPerSqm:2800,constrStart:3,constrDuration:30,opEbitda:0},
      {phase:"Phase 2",category:"Marina",name:"Marina Berths",code:"MAR",gfa:2400,footprint:0,plotArea:3000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:90,costPerSqm:16000,constrStart:4,constrDuration:12,opEbitda:1129331},
      {phase:"Phase 1",category:"Retail",name:"Fuel Station",code:"F",gfa:3586,footprint:3586,plotArea:6920,revType:"Lease",efficiency:30,leaseRate:900,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:1500,constrStart:2,constrDuration:12,opEbitda:0},
    ]},
  { id:"residential", icon:"🏘", en:"Residential Compound", ar:"مجمع سكني",
    desc_en:"Tower, villas, amenities, parking", desc_ar:"برج، فلل، مرافق خدمية، مواقف",
    landType:"purchase", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"hold",
    assets:[
      {phase:"Phase 1",category:"Residential",name:"Residential Tower",code:"T1",gfa:24000,footprint:3000,plotArea:5000,revType:"Lease",efficiency:85,leaseRate:900,escalation:1.0,rampUpYears:2,stabilizedOcc:92,costPerSqm:3000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Residential",name:"Villa Cluster",code:"V1",gfa:8000,footprint:4000,plotArea:10000,revType:"Lease",efficiency:90,leaseRate:700,escalation:1.0,rampUpYears:2,stabilizedOcc:88,costPerSqm:2500,constrStart:1,constrDuration:24,opEbitda:0},
      {phase:"Phase 1",category:"Amenity",name:"Amenity Center",code:"AM",gfa:2000,footprint:1500,plotArea:3000,revType:"Lease",efficiency:50,leaseRate:400,escalation:0.5,rampUpYears:1,stabilizedOcc:80,costPerSqm:2200,constrStart:1,constrDuration:18,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Structure",code:"PK",gfa:6000,footprint:3000,plotArea:3000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1800,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"commercial", icon:"🏢", en:"Commercial Center", ar:"مركز تجاري",
    desc_en:"Retail, offices, parking", desc_ar:"محلات، مكاتب، مواقف",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Retail Mall",code:"RM",gfa:20000,footprint:10000,plotArea:15000,revType:"Lease",efficiency:80,leaseRate:2200,escalation:1.0,rampUpYears:3,stabilizedOcc:90,costPerSqm:4000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Office",name:"Office Tower",code:"OF",gfa:15000,footprint:2500,plotArea:4000,revType:"Lease",efficiency:88,leaseRate:1100,escalation:1.0,rampUpYears:2,stabilizedOcc:85,costPerSqm:3200,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Podium",code:"PK",gfa:8000,footprint:4000,plotArea:4000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1500,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"hotel", icon:"🏨", en:"Single Hotel", ar:"فندق منفرد",
    desc_en:"Full hotel with operating P&L", desc_ar:"فندق واحد مع قائمة أرباح وخسائر تشغيلية كاملة",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:42,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Hospitality",name:"5-Star Hotel",code:"H5",gfa:22000,footprint:5000,plotArea:12000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:12000,constrStart:1,constrDuration:42,opEbitda:47630685},
    ]},
  { id:"blank", icon:"📄", en:"Blank Project", ar:"مشروع فارغ",
    desc_en:"Start from scratch", desc_ar:"ابدأ من الصفر",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:18,footprint:0}],
    finMode:"self", exitStrategy:"hold", assets:[] },
];


// ── Engine imports (extracted from this file — single source of truth) ──
import { calcIRR, calcNPV } from './engine/math.js';
import { calcHotelEBITDA, calcMarinaEBITDA } from './engine/hospitality.js';
import { getScenarioMults, computeAssetCapex, computeProjectCashFlows } from './engine/cashflow.js';
import { computeIncentives, applyInterestSubsidy } from './engine/incentives.js';
import { computeFinancing } from './engine/financing.js';
import { computeWaterfall } from './engine/waterfall.js';
import ChecksView from './components/views/ChecksView';
import MarketView from './components/views/MarketView';
import IncentivesView from './components/views/IncentivesView';
import ScenariosView from './components/views/ScenariosView';
import LearningCenterView from './components/views/LearningCenterView';
import ReportsView from './components/views/ReportsView';
import {
  FINANCING_FIELDS, getPhaseFinancing, hasPerPhaseFinancing, migrateToPerPhaseFinancing,
  buildPhaseIncentives, buildPhaseVirtualProject, buildPhaseProjectResults,
  aggregatePhaseFinancings, aggregatePhaseWaterfalls, computeIndependentPhaseResults
} from './engine/phases.js';
import { computePhaseWaterfalls } from './engine/legacy/phaseWaterfalls.js';
import { runChecks } from './engine/checks.js';
import { defaultProject, defaultHotelPL, defaultMarinaPL } from './data/defaults.js';
import { fmt, fmtPct, fmtM } from './utils/format.js';

// ── Storage ──
async function loadProjectIndex() { try { const r = await storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : []; } catch { return []; } }
async function saveProjectIndex(index) { await storage.set(STORAGE_KEY, JSON.stringify(index)); }
async function loadSharedProjects(email) {
  try {
    const rows = await storage.getSharedProjects(email);
    return rows.map(row => {
      try {
        const proj = JSON.parse(row.value);
        return { id: proj.id, name: proj.name, status: proj.status, updatedAt: proj.updatedAt, createdAt: proj.createdAt, _shared: true, _ownerId: row.ownerId, _permission: row.permission || "edit" };
      } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}
async function loadProject(id, ownerId, permission) {
  try {
    let r;
    if (ownerId) {
      r = await storage.getSharedProject(PROJECT_PREFIX + id, ownerId);
    } else {
      r = await storage.get(PROJECT_PREFIX + id);
    }
    if (!r) return null;
    const p = JSON.parse(r.value);
    const def = defaultProject();
    const migrated = { ...def, ...p };
    // Fee migration: old projects may have fee fields = 0 or missing.
    // Apply defaults for fees that were never explicitly set by the user.
    // We detect "never set" by checking if the field is 0/undefined AND the project
    // was created before these fields existed (no _feesVersion flag).
    if (!p._feesVersion) {
      const feeDefaults = {
        subscriptionFeePct: def.subscriptionFeePct,
        annualMgmtFeePct: def.annualMgmtFeePct,
        mgmtFeeCapAnnual: def.mgmtFeeCapAnnual,
        custodyFeeAnnual: def.custodyFeeAnnual,
        developerFeePct: def.developerFeePct,
        structuringFeePct: def.structuringFeePct,
        structuringFeeCap: def.structuringFeeCap,
        preEstablishmentFee: def.preEstablishmentFee,
        spvFee: def.spvFee,
        auditorFeeAnnual: def.auditorFeeAnnual,
        operatorFeePct: def.operatorFeePct,
        operatorFeeCap: def.operatorFeeCap,
        miscExpensePct: def.miscExpensePct,
        upfrontFeePct: def.upfrontFeePct,
        mgmtFeeBase: def.mgmtFeeBase,
      };
      for (const [k, v] of Object.entries(feeDefaults)) {
        if (migrated[k] === undefined || migrated[k] === null || migrated[k] === '') {
          migrated[k] = v;
        }
      }
      migrated._feesVersion = 2;
    }
    // Waterfall migration: old projects may have legacy 4-tier waterfall settings
    // (prefReturnPct, gpCatchup, carryPct, lpProfitSplitPct) that conflict with
    // the simplified model (performance incentive only). Reset them to defaults.
    // NOTE: We check actual values, not just the flag, because _waterfallVersion:1
    // may have been saved from defaults before the migration code existed.
    const hasLegacyPhaseWaterfall = (migrated.phases || []).some(ph =>
      ph.financing && (ph.financing.prefReturnPct > 0 || ph.financing.carryPct > 0 || (ph.financing.lpProfitSplitPct != null && ph.financing.lpProfitSplitPct < 100))
    );
    const needsWaterfallMigration = !p._waterfallVersion
      || migrated.prefReturnPct > 0
      || migrated.carryPct > 0
      || migrated.lpProfitSplitPct < 100
      || hasLegacyPhaseWaterfall;
    if (needsWaterfallMigration) {
      migrated.prefReturnPct = 0;
      migrated.gpCatchup = false;
      migrated.carryPct = 0;
      migrated.lpProfitSplitPct = 100;
      migrated.prefAllocation = "lpOnly";
      migrated.catchupMethod = "perYear";
      migrated._waterfallVersion = 2;
      // Also clean up per-phase financing that may have inherited old waterfall values
      if (migrated.phases) {
        migrated.phases = migrated.phases.map(ph => {
          if (ph.financing) {
            const f = { ...ph.financing };
            delete f.prefReturnPct;
            delete f.gpCatchup;
            delete f.carryPct;
            delete f.lpProfitSplitPct;
            delete f.prefAllocation;
            return { ...ph, financing: f };
          }
          return ph;
        });
      }
    }
    if (ownerId) migrated._shared = true;
    if (ownerId) migrated._ownerId = ownerId;
    if (ownerId) migrated._permission = permission || "edit";
    // Deep merge incentives
    if (!migrated.incentives) migrated.incentives = def.incentives;
    else {
      for (const k of Object.keys(def.incentives)) {
        if (!migrated.incentives[k]) migrated.incentives[k] = def.incentives[k];
        else migrated.incentives[k] = { ...def.incentives[k], ...migrated.incentives[k] };
      }
    }
    // Deep merge market
    if (!migrated.market) migrated.market = def.market;
    else migrated.market = { ...def.market, ...migrated.market, gaps: { ...def.market.gaps, ...(migrated.market.gaps||{}) }, thresholds: { ...def.market.thresholds, ...(migrated.market.thresholds||{}) }, conversionFactors: { ...def.market.conversionFactors, ...(migrated.market.conversionFactors||{}) } };
    return migrated;
  } catch { return null; }
}
async function saveProject(project) {
  project.updatedAt = new Date().toISOString();
  if (project._shared && project._ownerId) {
    // Save back to the owner's storage
    const clean = {...project}; delete clean._shared; delete clean._ownerId;
    await storage.setSharedProject(PROJECT_PREFIX + project.id, JSON.stringify(clean), project._ownerId);
  } else {
    await storage.set(PROJECT_PREFIX + project.id, JSON.stringify(project));
    const index = await loadProjectIndex();
    const meta = { id: project.id, name: project.name, status: project.status, updatedAt: project.updatedAt, createdAt: project.createdAt, assetCount: (project.assets||[]).length, finMode: project.finMode||"self", landType: project.landType||"lease", location: project.location||"" };
    const idx = index.findIndex(p => p.id === project.id);
    if (idx >= 0) index[idx] = meta; else index.push(meta);
    await saveProjectIndex(index);
  }
}
async function deleteProjectStorage(id) { await storage.delete(PROJECT_PREFIX + id); const index = await loadProjectIndex(); await saveProjectIndex(index.filter(p => p.id !== id)); }

function WaterfallView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [wSec, setWSec] = useState({});  // chart toggle state
  const [kpiOpen, setKpiOpen] = useState({gp:false,lp:false,fund:false,devTotal:false}); // expandable KPI cards
  const [eduModal, setEduModal] = useState(null);
  const [showHybridCF, setShowHybridCF] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({gp:expand,lp:expand,fund:expand,devTotal:expand}); setWSec(expand?{chart:true}:{}); }}, [globalExpand]);

  if (!project || !results || !waterfall) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>
    <div style={{fontSize:14,marginBottom:8}}>{lang==="ar"?"يتطلب اختيار هيكل تمويل غير ذاتي":"Requires non-self financing mode"}</div>
    <div style={{fontSize:12}}>{lang==="ar"?"اختر 'دين بنكي' أو 'صندوق استثماري' من لوحة التحكم":"Select 'Bank Debt' or 'Fund Structure' from the control panel"}</div>
  </div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;
  const upCfg = up ? (isSinglePhase
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }))) : null;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;
  const hasPhases = phaseNames.length > 1 && phaseWaterfalls && Object.keys(phaseWaterfalls).length > 0;
  const h0 = new Array(h).fill(0);
  const cur = project.currency || "SAR";

  // ── Filtered waterfall ──
  const w = useMemo(() => {
    if (isSinglePhase && phaseWaterfalls?.[singlePhaseName]) {
      const _pw = phaseWaterfalls[singlePhaseName];
      return { ..._pw,
        feeSub:_pw.feeSub||h0, feeMgmt:_pw.feeMgmt||h0, feeCustody:_pw.feeCustody||h0,
        feeDev:_pw.feeDev||h0, feeStruct:_pw.feeStruct||h0, feePreEst:_pw.feePreEst||h0,
        feeSpv:_pw.feeSpv||h0, feeAuditor:_pw.feeAuditor||h0, feeOperator:_pw.feeOperator||h0,
        feeMisc:_pw.feeMisc||h0, fees:_pw.fees||h0, totalFees:_pw.totalFees??0,
        totalEquity:_pw.totalEquity||_pw.equity||0, exitYear:_pw.exitYear||waterfall.exitYear||0,
        lpNPV12:_pw.lpNPV12??null, lpNPV14:_pw.lpNPV14??null, gpNPV12:_pw.gpNPV12??null, gpNPV14:_pw.gpNPV14??null,
        unreturnedClose:_pw.unreturnedClose||h0, unreturnedOpen:_pw.unreturnedOpen||h0,
        prefAccrual:_pw.prefAccrual||h0, prefAccumulated:_pw.prefAccumulated||h0, exitProceeds:_pw.exitProceeds||h0,
      };
    }
    if (!isFiltered) return waterfall;
    // Multi-phase: aggregate selected phase waterfalls
    const pws = activePh.map(p => phaseWaterfalls?.[p]).filter(Boolean);
    if (pws.length === 0) return waterfall;
    const sumArr = (field) => { const arr = new Array(h).fill(0); pws.forEach(pw => { const a = pw[field]; if (a) for(let y=0;y<h;y++) arr[y]+=(a[y]||0); }); return arr; };
    const sum = (field) => pws.reduce((s,pw) => s + (pw[field]||0), 0);
    const lpNetCF = sumArr('lpNetCF'), gpNetCF = sumArr('gpNetCF');
    const totalEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.totalEquity||0), 0);
    const gpEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.gpEquity||0), 0);
    const lpEquity = activePh.reduce((s,p) => s + (phaseFinancings?.[p]?.lpEquity||0), 0);
    const lpTotalDist = sum('lpTotalDist'), gpTotalDist = sum('gpTotalDist');
    const eqCalls = sumArr('equityCalls');
    const lpCalled = eqCalls.reduce((a,b)=>a+b,0) * (lpEquity / Math.max(1, totalEquity));
    const gpCalled = eqCalls.reduce((a,b)=>a+b,0) * (gpEquity / Math.max(1, totalEquity));
    return { ...waterfall, totalEquity, gpEquity, lpEquity, gpPct: totalEquity>0?gpEquity/totalEquity:0, lpPct: totalEquity>0?lpEquity/totalEquity:0,
      equityCalls: eqCalls, fees: sumArr('fees'), feeSub: sumArr('feeSub'), feeMgmt: sumArr('feeMgmt'),
      feeCustody: sumArr('feeCustody'), feeDev: sumArr('feeDev'), feeStruct: sumArr('feeStruct'),
      feePreEst: sumArr('feePreEst'), feeSpv: sumArr('feeSpv'), feeAuditor: sumArr('feeAuditor'),
      feeOperator: sumArr('feeOperator'), feeMisc: sumArr('feeMisc'), totalFees: sum('totalFees'),
      unfundedFees: sumArr('unfundedFees'), exitProceeds: sumArr('exitProceeds'),
      exitYear: Math.max(...pws.map(pw=>pw.exitYear||0)),
      cashAvail: sumArr('cashAvail'), tier1: sumArr('tier1'), tier2: sumArr('tier2'),
      tier3: sumArr('tier3'), tier4LP: sumArr('tier4LP'), tier4GP: sumArr('tier4GP'),
      lpDist: sumArr('lpDist'), gpDist: sumArr('gpDist'), lpNetCF, gpNetCF,
      unreturnedOpen: sumArr('unreturnedOpen'), unreturnedClose: sumArr('unreturnedClose'),
      prefAccrual: sumArr('prefAccrual'), prefAccumulated: sumArr('prefAccumulated'),
      lpIRR: calcIRR(lpNetCF), gpIRR: calcIRR(gpNetCF),
      lpTotalDist, gpTotalDist, lpNetDist: sum('lpNetDist')||lpTotalDist, gpNetDist: sum('gpNetDist')||gpTotalDist,
      lpTotalCalled: lpCalled, gpTotalCalled: gpCalled, lpTotalInvested: lpCalled, gpTotalInvested: gpCalled,
      lpMOIC: lpCalled>0?(sum('lpNetDist')||lpTotalDist)/lpCalled:0, gpMOIC: gpCalled>0?(sum('gpNetDist')||gpTotalDist)/gpCalled:0,
      lpSimpleROE: lpCalled>0?((sum('lpNetDist')||lpTotalDist)-lpCalled)/lpCalled:0, gpSimpleROE: gpCalled>0?((sum('gpNetDist')||gpTotalDist)-gpCalled)/gpCalled:0,
      lpNPV10: calcNPV(lpNetCF,0.10), lpNPV12: calcNPV(lpNetCF,0.12), lpNPV14: calcNPV(lpNetCF,0.14),
      gpNPV10: calcNPV(gpNetCF,0.10), gpNPV12: calcNPV(gpNetCF,0.12), gpNPV14: calcNPV(gpNetCF,0.14),
      isFund: pws.some(pw=>pw.isFund),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, waterfall, phaseWaterfalls, phaseFinancings, h]);

  // Phase-aware data sources for table §7 and §8
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return results.consolidated;
    const income=new Array(h).fill(0),capex=new Array(h).fill(0),landRent=new Array(h).fill(0),netCF=new Array(h).fill(0);
    activePh.forEach(pName=>{const pr=results.phaseResults?.[pName];if(!pr)return;for(let y=0;y<h;y++){income[y]+=pr.income[y]||0;capex[y]+=pr.capex[y]||0;landRent[y]+=pr.landRent[y]||0;netCF[y]+=pr.netCF[y]||0;}});
    return {income,capex,landRent,netCF,totalCapex:capex.reduce((a,b)=>a+b,0),totalIncome:income.reduce((a,b)=>a+b,0),totalLandRent:landRent.reduce((a,b)=>a+b,0),totalNetCF:netCF.reduce((a,b)=>a+b,0),irr:calcIRR(netCF)};
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h]);
  const f = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p=>phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length===0) return financing;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf2=>{if(pf2.leveredCF)for(let y=0;y<h;y++)leveredCF[y]+=pf2.leveredCF[y]||0;});
    return {...financing, leveredCF, leveredIRR:calcIRR(leveredCF),
      totalDebt:pfs.reduce((s,p2)=>s+(p2.totalDebt||0),0), totalEquity:pfs.reduce((s,p2)=>s+(p2.totalEquity||0),0),
      devCostInclLand:pfs.reduce((s,p2)=>s+(p2.devCostInclLand||0),0), totalInterest:pfs.reduce((s,p2)=>s+(p2.totalInterest||0),0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h]);

  // ── Derived metrics: Payback, Cash Yield, Exit, Attribution ──
  const lpPayback = (() => { if ((w.lpTotalInvested||0) <= 0) return null; let cum = 0, wasNeg = false; for (let y = 0; y < h; y++) { cum += w.lpNetCF[y] || 0; if (cum < -1) wasNeg = true; if (wasNeg && cum >= 0) return y + 1; } return null; })();
  const gpPayback = (() => { if ((w.gpTotalInvested||0) <= 0) return null; let cum = 0, wasNeg = false; for (let y = 0; y < h; y++) { cum += w.gpNetCF[y] || 0; if (cum < -1) wasNeg = true; if (wasNeg && cum >= 0) return y + 1; } return null; })();

  // Exit details
  const exitProc = (w.exitProceeds || []).reduce((a, b) => a + b, 0);
  const exitYr = w.exitYear || 0;
  const exitMult = cfg.exitMultiple || project.exitMultiple || 0;
  const exitCostPct = cfg.exitCostPct || project.exitCostPct || 0;

  // Simple Return (market convention) — from engine, fallback to local computation
  const lpSimpleROE = w.lpSimpleROE ?? (w.lpTotalInvested > 0 ? ((w.lpNetDist||w.lpTotalDist||0) - w.lpTotalInvested) / w.lpTotalInvested : 0);
  const gpSimpleROE = w.gpSimpleROE ?? (w.gpTotalInvested > 0 ? ((w.gpNetDist||w.gpTotalDist||0) - w.gpTotalInvested) / w.gpTotalInvested : 0);
  const investYears = w.investYears ?? (() => {
    let firstCall = -1, lastDist = 0;
    for (let y = 0; y < h; y++) { if ((w.lpNetCF?.[y]||0) < 0 && firstCall < 0) firstCall = y; if ((w.lpNetCF?.[y]||0) > 0) lastDist = y; }
    return Math.max(1, firstCall >= 0 ? lastDist - firstCall + 1 : (exitYr > sy ? exitYr - sy : h));
  })();
  const lpSimpleAnnual = w.lpSimpleAnnual ?? (investYears > 0 ? lpSimpleROE / investYears : 0);
  const gpSimpleAnnual = w.gpSimpleAnnual ?? (investYears > 0 ? gpSimpleROE / investYears : 0);

  const lpCashYield = w.lpTotalInvested > 0 ? (w.lpDist || []).map(d => d / w.lpTotalInvested) : [];
  const gpCashYield = w.gpTotalInvested > 0 ? (w.gpDist || []).map(d => d / w.gpTotalInvested) : [];
  const lpStabYield = lpCashYield.length > 0 && exitYr > 2 ? lpCashYield[Math.min(exitYr - 2, lpCashYield.length - 1)] : 0;
  const gpStabYield = gpCashYield.length > 0 && exitYr > 2 ? gpCashYield[Math.min(exitYr - 2, gpCashYield.length - 1)] : 0;

  // Return attribution (where did distributions come from?)
  const t1Total = w.tier1.reduce((a, b) => a + b, 0);
  const t2Total = w.tier2.reduce((a, b) => a + b, 0);
  const t3Total = w.tier3.reduce((a, b) => a + b, 0);
  const t4LPTotal = w.tier4LP.reduce((a, b) => a + b, 0);
  const t4GPTotal = w.tier4GP.reduce((a, b) => a + b, 0);

  // Cumulative CF chart data
  const cfChartData = (() => {
    let lpCum = 0, gpCum = 0;
    return Array.from({ length: Math.min(showYrs, h) }, (_, y) => {
      lpCum += w.lpNetCF[y] || 0;
      gpCum += w.gpNetCF[y] || 0;
      return { year: sy + y, yr: `Yr ${y + 1}`, lp: Math.round(lpCum), gp: Math.round(gpCum) };
    });
  })();

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"var(--surface-table-header)"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?100:160}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* Phase selector (multi-select) */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p=>{
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pw = phaseWaterfalls?.[p];
            const irr = pw?.lpIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>Investor {(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && upCfg && (
      <div style={{background:"#fffbeb",borderRadius:8,border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}

    {/* ═══ HYBRID MODE BANNER ═══ */}
    {f?.isHybrid && (() => {
      const govPct = f.govFinancingPct || 70;
      const fundPct = 100 - govPct;
      const isGP = f.govBeneficiary === "gp";
      return <div style={{background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",borderRadius:10,border:"1px solid #86efac",padding:"12px 16px",marginBottom:14,fontSize:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <span style={{fontSize:16}}>🔀</span>
          <span style={{fontWeight:700,color:"#166534"}}>{ar?"مختلط: صندوق + تمويل":"Hybrid: Fund + Financing"}</span>
          <span style={{fontSize:10,color:"#059669",background:"#d1fae5",borderRadius:4,padding:"2px 6px"}}>{govPct}% {ar?"تمويل":"Fin."} + {fundPct}% {ar?"صندوق":"Fund"}</span>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",color:"#374151"}}>
          <span>{ar?"مبلغ التمويل":"Loan Amount"}: <b>{fmtM(f.govLoanAmount)}</b></span>
          <span>{ar?"سعر الفائدة":"Rate"}: <b>{((f.govLoanRate||0)*100).toFixed(1)}%</b></span>
          <span>{ar?"حصة الصندوق":"Fund Portion"}: <b>{fmtM(f.fundPortionCost)}</b></span>
          {isGP && <span style={{color:"#d97706",fontWeight:600}}>⚠ {ar?"القرض على المطور شخصياً":"Personal loan to developer"}</span>}
        </div>
      </div>;
    })()}

    {/* ═══ HYBRID: THREE DETAILED CASH FLOW TABLES ═══ */}
    {f?.isHybrid && (() => {
      const finPct = f.govFinancingPct || 70;
      const fundPctVal = 100 - finPct;
      const maxYr = w.exitYear ? w.exitYear - sy + 2 : Math.min(showYrs || 15, h);
      const hybYears = Array.from({length: Math.min(maxYr + 1, h)}, (_, i) => i);
      // Table builder helper
      const HybTable = ({id, title, titleColor, borderColor, bgColor, children}) => {
        const [open, setOpen] = useState(false);
        return <div style={{marginBottom:10,borderRadius:8,border:`1px solid ${borderColor}`,overflow:"hidden"}}>
          <div onClick={()=>setOpen(!open)} style={{padding:"8px 14px",background:bgColor,cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"}}>
            <span style={{fontSize:10,color:titleColor,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▶</span>
            <span style={{fontSize:11,fontWeight:700,color:titleColor,flex:1}}>{title}</span>
            <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?(ar?"طي":"Collapse"):(ar?"فتح":"Expand")}</span>
          </div>
          {open && <div className="table-wrap" style={{overflowX:"auto",maxHeight:400,overflowY:"auto"}}><table style={{...tblStyle,fontSize:10,width:"100%"}}>{children}</table></div>}
        </div>;
      };
      const HRow = ({label, arr, color, bold, negate, sub}) => {
        const tot = arr.reduce((a,b)=>a+b,0);
        const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
        const nc = v => color || (v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af");
        return <tr style={st}>
          <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:140,fontSize:sub?9:10,paddingInlineStart:sub?24:undefined,color:sub?"var(--text-tertiary)":undefined}}>{label}</td>
          <td style={{...tdN,fontWeight:600,fontSize:10,color:nc(negate?-tot:tot)}}>{fmt(tot)}</td>
          {hybYears.map(y=>{const v=arr[y]||0;return <td key={y} style={{...tdN,fontSize:10,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
        </tr>;
      };
      const THead = () => <thead><tr style={{position:"sticky",top:0,background:"var(--surface-table-header)",zIndex:3}}>
        <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:4,minWidth:140,fontSize:10}}>{ar?"البند":"Item"}</th>
        <th style={{...thSt,textAlign:"right",fontSize:10}}>{ar?"الإجمالي":"Total"}</th>
        {hybYears.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:70,fontSize:9}}>{sy+y}</th>)}
      </tr></thead>;

      return <div style={{marginBottom:14}}>
        {/* ── TABLE 1: Financing Side (Debt Instrument) ── */}
        <HybTable id="hybFin" title={`🏦 ${ar?`التمويل المؤسسي (${finPct}%)`:`Institutional Financing (${finPct}%)`} — ${fmtM(f.govLoanAmount)} @ ${((f.govLoanRate||0)*100).toFixed(1)}%`} titleColor="#1e40af" borderColor="#93c5fd" bgColor="#eff6ff">
          <THead />
          <tbody>
            <HRow label={ar?"سحوبات الدين":"Debt Drawdown"} arr={f.drawdown} color="#3b82f6" />
            <HRow label={ar?"(-) تكلفة التمويل (فائدة)":"(-) Interest / Profit"} arr={f.interest} color="#ef4444" negate />
            <HRow label={ar?"(-) سداد الأصل":"(-) Principal Repayment"} arr={f.repayment} color="#ef4444" negate />
            <HRow label={ar?"= صافي تدفق التمويل":"= Net Financing CF"} arr={f.financingCF || hybYears.map(y => (f.drawdown[y]||0) - (f.debtService[y]||0))} bold />
            <tr style={{background:"#eff6ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:9,color:"#3b82f6",paddingInlineStart:16}}>{ar?"رصيد الدين":"Debt Balance"}</td>
              <td style={tdN}></td>
              {hybYears.map(y=><td key={y} style={{...tdN,fontSize:9,color:"#3b82f6"}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
            </tr>
            <tr style={{background:"#eff6ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:9,color:"#3b82f6",paddingInlineStart:16}}>DSCR</td>
              <td style={tdN}></td>
              {hybYears.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.5?"#16a34a":f.dscr[y]>=1.2?"#a16207":"#ef4444",fontWeight:600,fontSize:9}}>{f.dscr[y]===null?"—":f.dscr[y]?.toFixed(2)+"x"}</td>)}
            </tr>
          </tbody>
        </HybTable>

        {/* ── TABLE 2: Fund Side (Equity Account) ── */}
        {/* Fund sees: full project revenue/costs, debt flows in/out, then its fees + exit */}
        <HybTable id="hybFund" title={`📊 ${ar?`الصندوق (${fundPctVal}% ملكية)`:`Fund (${fundPctVal}% Equity)`} — ${fmtM(f.totalEquity)} | LP IRR: ${w.lpIRR!=null?fmtPct(w.lpIRR*100):"—"} | MOIC: ${w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"}`} titleColor="#6d28d9" borderColor="#c4b5fd" bgColor="#faf5ff">
          <THead />
          <tbody>
            {/* Project operations (fund operates full project) */}
            <HRow label={ar?"الإيرادات":"Revenue"} arr={hybYears.map(y=>pc.income[y]||0)} color="#16a34a" />
            <HRow label={ar?"(-) إيجار أرض":"(-) Land Rent"} arr={hybYears.map(y=>pc.landRent[y]||0)} color="#ef4444" negate />
            <HRow label={ar?"(-) تكاليف تطوير":"(-) CAPEX"} arr={hybYears.map(y=>pc.capex[y]||0)} color="#ef4444" negate />
            {/* Debt flows through the fund (received from lender, paid back) */}
            <HRow label={ar?"(+) سحوبات التمويل":"(+) Financing Drawdown"} arr={f.drawdown} color="#3b82f6" sub />
            <HRow label={ar?"(-) خدمة الدين":"(-) Debt Service"} arr={f.debtService} color="#dc2626" negate sub />
            {/* Fund-specific costs */}
            {f.devFeeSchedule && <HRow label={ar?"(-) أتعاب المطور":"(-) Developer Fee"} arr={f.devFeeSchedule} color="#f59e0b" negate />}
            {w.fees && <HRow label={ar?"(-) رسوم الصندوق":"(-) Fund Fees"} arr={w.fees} color="#f59e0b" negate />}
            {/* Exit */}
            <HRow label={ar?"حصيلة التخارج":"Exit Proceeds"} arr={hybYears.map(y=>f.exitProceeds?.[y]||0)} color="#8b5cf6" />
            {/* Net = leveredCF (correct: full project after all debt & fees) */}
            <HRow label={ar?"= صافي تدفق الصندوق":"= Net Fund CF"} arr={f.fundCF || f.leveredCF} bold />
            {/* Equity & distributions */}
            <HRow label={ar?"طلبات رأس المال":"Equity Calls"} arr={w.equityCalls||f.equityCalls||[]} color="#8b5cf6" />
            {w.lpDist && <HRow label={ar?"توزيعات المستثمر (LP)":"LP Distributions"} arr={w.lpDist} color="#6d28d9" />}
            {w.gpDist && <HRow label={ar?"توزيعات المطور (GP)":"GP Distributions"} arr={w.gpDist} color="#8b5cf6" />}
          </tbody>
        </HybTable>

        {/* ── TABLE 3: Combined (Full Project — Unlevered & Levered) ── */}
        <HybTable id="hybCombined" title={`📋 ${ar?"المشروع الكامل (مجمّع)":"Full Project (Combined)"} — ${fmtM(f.devCostInclLand)}`} titleColor="#1e3a5f" borderColor="#94a3b8" bgColor="#f1f5f9">
          <THead />
          <tbody>
            <HRow label={ar?"الإيرادات":"Revenue"} arr={hybYears.map(y=>pc.income[y]||0)} color="#16a34a" />
            <HRow label={ar?"(-) إيجار أرض":"(-) Land Rent"} arr={hybYears.map(y=>pc.landRent[y]||0)} color="#ef4444" negate />
            <HRow label={ar?"(-) تكاليف تطوير":"(-) CAPEX"} arr={hybYears.map(y=>pc.capex[y]||0)} color="#ef4444" negate />
            {(() => { const u=hybYears.map(y=>(pc.income[y]||0)-(pc.landRent[y]||0)-(pc.capex[y]||0)); return <HRow label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered CF"} arr={u} bold />; })()}
            <HRow label={ar?"سحوبات الدين":"Debt Drawdown"} arr={f.drawdown} color="#3b82f6" />
            <HRow label={ar?"(-) خدمة الدين":"(-) Debt Service"} arr={f.debtService} color="#dc2626" negate />
            {f.devFeeSchedule && <HRow label={ar?"(-) أتعاب المطور":"(-) Developer Fee"} arr={f.devFeeSchedule} color="#f59e0b" negate />}
            {w.fees && <HRow label={ar?"(-) رسوم الصندوق":"(-) Fund Fees"} arr={w.fees} color="#f59e0b" negate />}
            <HRow label={ar?"حصيلة التخارج":"Exit Proceeds"} arr={hybYears.map(y=>f.exitProceeds?.[y]||0)} color="#8b5cf6" />
            <HRow label={ar?"= صافي التدفق الممول":"= Levered Net CF"} arr={f.leveredCF} bold />
            {(() => { let cum=0; return <tr style={{background:"#f1f5f9"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f1f5f9",zIndex:1,fontWeight:600,fontSize:9,color:"#475569",paddingInlineStart:16}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
              <td style={tdN}></td>
              {hybYears.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:9,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
            </tr>; })()}
          </tbody>
        </HybTable>
      </div>;
    })()}

    {/* ═══ QUICK EDIT: Fund & Waterfall Terms ═══ */}
    {upCfg && (cfg.finMode === "fund" || cfg.finMode === "hybrid" || cfg.finMode === "incomeFund") && (
      <div style={{background:showTerms?"#fff":"#f8f9fb",borderRadius:10,border:showTerms?"2px solid #8b5cf6":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#faf5ff":"#f8f9fb",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تعديل سريع - شروط الصندوق":"Quick Edit - Fund Terms"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"العائد المتوقع":"Expected Return"} {cfg.hurdleIRR||15}% · {ar?"الحافز":"Incentive"} {cfg.incentivePct||20}%</span>
          <span style={{fontSize:11,color:"var(--text-tertiary)",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #ede9fe",animation:"zanSlide 0.15s ease"}}>
          {/* Row 1: Performance Incentive Terms */}
          <div style={{fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"حافز حسن الأداء للمطور":"DEVELOPER PERFORMANCE INCENTIVE"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {false && ([
              {l:ar?"العائد التفضيلي %":"Pref Return %",k:"prefReturnPct",v:cfg.prefReturnPct},
              {l:ar?"حصة المطور %":"Dev Profit %",k:"carryPct",v:cfg.carryPct},
              {l:ar?"حصة المستثمر %":"Investor Split %",k:"lpProfitSplitPct",v:cfg.lpProfitSplitPct},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>))}
            {false && (<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"التعويض":"Catch-up"}</span>
              <select value={cfg.gpCatchup?"Y":"N"} onChange={e=>upCfg({gpCatchup:e.target.value==="Y"})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="Y">{ar?"نعم":"Yes"}</option><option value="N">{ar?"لا":"No"}</option>
              </select>
            </div>)}
            {false && (<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"معاملة الرسوم":"Fee Treatment"}</span>
              <select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="capital">{ar?"رأسمال":"Capital"}</option><option value="rocOnly">{ar?"استرداد فقط":"ROC Only"}</option><option value="expense">{ar?"مصروف":"Expense"}</option>
              </select>
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{ar?"تفعيل حافز حسن الأداء للمطور":"Enable Developer Performance Incentive"}</span>
              <select value={cfg.performanceIncentive?"Y":"N"} onChange={e=>upCfg({performanceIncentive:e.target.value==="Y"})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="N">{ar?"لا":"Off"}</option><option value="Y">{ar?"نعم":"On"}</option>
              </select>
            </div>
            {cfg.performanceIncentive && <>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"نوع العتبة":"Hurdle Type"}</span>
              <select value={cfg.hurdleMode||"simple"} onChange={e=>upCfg({hurdleMode:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="simple">{ar?"عائد بسيط (عرف السوق)":"Simple (Market)"}</option>
                <option value="irr">{ar?"IRR مركب":"IRR (Compounded)"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{ar?"العائد المتوقع السنوي للمستثمر %":"Investor Expected Annual Return %"}</span>
              <input type="number" value={cfg.hurdleIRR||""} onChange={e=>upCfg({hurdleIRR:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:90}}>{ar?"نسبة حافز المطور من الفائض %":"Developer Share of Excess %"}</span>
              <input type="number" value={cfg.incentivePct||""} onChange={e=>upCfg({incentivePct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>
            </>}
          </div>
          {/* Row 2: Fund Fees */}
          <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {l:ar?"اكتتاب %":"Sub %",k:"subscriptionFeePct",v:cfg.subscriptionFeePct},
              {l:ar?"إدارة %":"Mgmt %",k:"annualMgmtFeePct",v:cfg.annualMgmtFeePct},
              {l:ar?"سقف إدارة":"Mgmt Cap",k:"mgmtFeeCapAnnual",v:cfg.mgmtFeeCapAnnual,wide:true},
              {l:ar?"تطوير %":"Dev %",k:"developerFeePct",v:cfg.developerFeePct},
              {l:ar?"هيكلة %":"Struct %",k:"structuringFeePct",v:cfg.structuringFeePct},
              {l:ar?"سقف هيكلة":"Struct Cap",k:"structuringFeeCap",v:cfg.structuringFeeCap,wide:true},
              {l:ar?"حفظ/سنة":"Custody",k:"custodyFeeAnnual",v:cfg.custodyFeeAnnual,wide:true},
              {l:ar?"ما قبل التأسيس":"Pre-Est.",k:"preEstablishmentFee",v:cfg.preEstablishmentFee,wide:true},
              {l:ar?"SPV":"SPV",k:"spvFee",v:cfg.spvFee},
              {l:ar?"مراجع/سنة":"Auditor",k:"auditorFeeAnnual",v:cfg.auditorFeeAnnual,wide:true},
            ].map(f=><div key={f.k} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:10,color:"var(--text-secondary)",minWidth:f.wide?68:52}}>{f.l}</span>
              <input type="number" value={f.v||""} onChange={e=>upCfg({[f.k]:parseFloat(e.target.value)||0})} style={{width:f.wide?80:55,padding:"4px 6px",border:"0.5px solid var(--border-default)",borderRadius:5,fontSize:11,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: Investors | Developer | Fund | Total Dev Returns ═══ */}
    {(() => {
      const gpIsManager = w.gpIsFundManager ?? (cfg.gpIsFundManager !== false);
      const _feeDev = w.devFeesTotal ?? (w.feeDev||[]).reduce((a,b)=>a+b,0);
      const _feeMgmt = (w.feeMgmt||[]).reduce((a,b)=>a+b,0);
      const _feeSub = (w.feeSub||[]).reduce((a,b)=>a+b,0);
      const _feeStruct = (w.feeStruct||[]).reduce((a,b)=>a+b,0);
      const _feeCustody = (w.feeCustody||[]).reduce((a,b)=>a+b,0);
      const _feePreEst = (w.feePreEst||[]).reduce((a,b)=>a+b,0);
      const _feeSpv = (w.feeSpv||[]).reduce((a,b)=>a+b,0);
      const _feeAuditor = (w.feeAuditor||[]).reduce((a,b)=>a+b,0);
      const _feeOperator = (w.feeOperator||[]).reduce((a,b)=>a+b,0);
      const _feeMisc = (w.feeMisc||[]).reduce((a,b)=>a+b,0);
      const gpPctVal = w.gpPct||0;
      const lpPctVal = w.lpPct||0;
      const isLpOnlyPref = (w.prefAllocation||cfg.prefAllocation) === "lpOnly";
      const lpT1 = t1Total * lpPctVal;
      const lpT2 = isLpOnlyPref ? t2Total : t2Total * lpPctVal;
      const gpT1 = t1Total * gpPctVal;
      const gpT2 = isLpOnlyPref ? 0 : t2Total * gpPctVal;
      const lpNetCash = (w.lpTotalDist||0) - (w.lpTotalInvested||0);
      const lpStabYieldVal = lpCashYield.length > 0 && exitYr > 2 ? lpCashYield[Math.min(exitYr - 2, lpCashYield.length - 1)] : 0;
      // Developer as investor distributions
      const devAsInvestor = w.developerAsInvestor ?? ((w.gpTotalDist||0) - (w.perfIncentiveAmount||0));
      // Total invested across both parties
      const totalInvested = (w.lpTotalInvested||0) + (w.gpTotalInvested||0);
      const totalDist = (w.lpTotalDist||0) + devAsInvestor;
      // Developer card: non-investor income only
      const devFeeTotal = w.developerDevFees ?? (w.devFeesTotal || _feeDev);
      const perfIncentive = w.developerPerfIncentive ?? (w.perfIncentiveAmount||0);
      const devRoleIncome = devFeeTotal + (w.perfIncentiveEnabled && perfIncentive > 0 ? perfIncentive : 0);
      // Card 4: total developer economics
      const devTotalEconomics = w.developerTotalEconomics ?? (devAsInvestor + devFeeTotal + (w.perfIncentiveEnabled && perfIncentive > 0 ? perfIncentive : 0));
      const devNetProfit = devTotalEconomics - (w.gpTotalInvested||0);

      const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};
      const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:"var(--radius-sm)",padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
      const KR = ({l,v,c,bold}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:bold?700:500,fontSize:11,color:c||"var(--text-primary)"}}>{v}</span></>;
      const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:10,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"0.5px solid var(--surface-separator)",marginTop:2}}>{text}</div>;
      return <>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:12}}>

        {/* ── Card 1: Investors (All Equity) ── */}
        <div style={{background:kpiOpen.lp?"#fff":"linear-gradient(135deg, #faf5ff, #f5f3ff)",borderRadius:10,border:kpiOpen.lp?"2px solid #8b5cf6":"1px solid #e9d5ff",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,lp:!p.lp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#8b5cf6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Inv</span>
            <span style={{fontSize:11,fontWeight:700,color:"#5b21b6",flex:1}}>{ar?"المستثمرون":"Investors"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.lp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.lp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"عائد بسيط (سنوي)":"Simple (Ann.)", lpSimpleAnnual?fmtPct(lpSimpleAnnual*100):"—", "#8b5cf6")}
              {badge("IRR", w.lpIRR!==null?fmtPct(w.lpIRR*100):"—", getMetricColor("IRR",w.lpIRR))}
              {badge("MOIC", w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.lpMOIC))}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"المساهمات":"CONTRIBUTIONS"} />
              <KR l={ar?"مساهمة المستثمر":"Investor Contribution"} v={fmt(w.lpTotalInvested)} c="#8b5cf6" />
              <KR l={ar?"مساهمة المطور (كمستثمر)":"Developer Contribution"} v={fmt(w.gpTotalInvested)} c="#3b82f6" />
              <KR l={ar?"إجمالي المستثمر":"Total Invested"} v={fmt(totalInvested)} bold />
              <SecHd text={ar?"التوزيعات":"DISTRIBUTIONS"} />
              <KR l={ar?"توزيعات المستثمر":"Investor Distributions"} v={fmt(w.lpTotalDist)} c="#8b5cf6" />
              <KR l={ar?"توزيعات المطور (كمستثمر)":"Developer Dist. (as Inv.)"} v={fmt(devAsInvestor)} c="#3b82f6" />
              <KR l={ar?"إجمالي التوزيعات":"Total Distributions"} v={fmt(totalDist)} bold />
              <SecHd text={ar?"مؤشرات المستثمر":"INVESTOR METRICS"} />
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={lpSimpleROE?fmtPct(lpSimpleROE*100):"—"} c="#8b5cf6" bold />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={lpSimpleAnnual?fmtPct(lpSimpleAnnual*100):"—"} c="#8b5cf6" />
              {(w.lpIRR > 0 && lpSimpleAnnual > 0 && w.lpIRR > lpSimpleAnnual * 1.05) ? <div style={{gridColumn:"1/-1",fontSize:9,color:"#6b7280",fontStyle:"italic",margin:"-2px 0 2px",lineHeight:1.3}}>{ar?"⚡ IRR أعلى من العائد البسيط لأن طلبات رأس المال موزعة على سنوات — IRR يحسب توقيت كل دفعة":"⚡ IRR > Simple because capital calls are staggered — IRR accounts for timing of each call"}</div> : null}
              <KR l={ar?"صافي IRR (مركب)":"Net IRR (Compounded)"} v={w.lpIRR!==null?fmtPct(w.lpIRR*100):"—"} c={getMetricColor("IRR",w.lpIRR)} bold />
              {w.lpCashIRR != null && w.lpCashIRR !== w.lpIRR ? <KR l={ar?"IRR نقدي":"Cash IRR"} v={fmtPct(w.lpCashIRR*100)} c={getMetricColor("IRR",w.lpCashIRR)} /> : null}
              <KR l="MOIC" v={w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.lpMOIC)} bold />
              {w.lpCashMOIC && w.lpCashMOIC !== w.lpMOIC ? <KR l={ar?"MOIC نقدي":"Cash MOIC"} v={w.lpCashMOIC.toFixed(2)+"x"} c={getMetricColor("MOIC",w.lpCashMOIC)} /> : null}
              <KR l="DPI" v={w.lpDPI?w.lpDPI.toFixed(2)+"x":"—"} />
              <KR l={ar?"استرداد":"Payback"} v={lpPayback?`${lpPayback} ${ar?"سنة":"yr"}`:"—"} />
              <KR l={ar?"عائد نقدي":"Cash Yield"} v={lpStabYieldVal>0?fmtPct(lpStabYieldVal*100):"—"} />
              <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${investYears} ${ar?"سنة":"yr"}`} />
              <SecHd text={ar?"مؤشرات المطور (كمستثمر)":"DEV. METRICS (AS INVESTOR)"} />
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={gpSimpleROE?fmtPct(gpSimpleROE*100):"—"} c="#3b82f6" />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={gpSimpleAnnual?fmtPct(gpSimpleAnnual*100):"—"} c="#3b82f6" />
              <KR l={ar?"صافي IRR (مركب)":"Net IRR (Compounded)"} v={w.gpIRR!==null?fmtPct(w.gpIRR*100):"—"} c={getMetricColor("IRR",w.gpIRR)} bold />
              {w.gpCashIRR != null && w.gpCashIRR !== w.gpIRR ? <KR l={ar?"IRR نقدي":"Cash IRR"} v={fmtPct(w.gpCashIRR*100)} c={getMetricColor("IRR",w.gpCashIRR)} /> : null}
              <KR l="MOIC" v={w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—"} c={getMetricColor("MOIC",w.gpMOIC)} bold />
              {w.gpCashMOIC && w.gpCashMOIC !== w.gpMOIC ? <KR l={ar?"MOIC نقدي":"Cash MOIC"} v={w.gpCashMOIC.toFixed(2)+"x"} c={getMetricColor("MOIC",w.gpCashMOIC)} /> : null}
              <KR l={ar?"استرداد":"Payback"} v={gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—"} />
              <SecHd text="NPV" />
              <KR l="@10%" v={fmtM(w.lpNPV10)} />
              <KR l="@12%" v={fmtM(w.lpNPV12)} c="#8b5cf6" bold />
              <KR l="@14%" v={fmtM(w.lpNPV14)} />
            </div>
          )}
        </div>

        {/* ── Card 2: Developer (Fees + Incentive Only) ── */}
        <div style={{background:kpiOpen.gp?"#fff":"linear-gradient(135deg, #eff6ff, #f0fdf4)",borderRadius:10,border:kpiOpen.gp?"2px solid #3b82f6":"1px solid #bfdbfe",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,gp:!p.gp}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#3b82f6",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Dev</span>
            <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"المطور":"Developer"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.gp?"▲":"▼"}</span>
          </div>
          {!kpiOpen.gp ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"دخل المطور":"Dev Income", fmtM(devRoleIncome), "#3b82f6")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"دخل الدور":"ROLE INCOME"} />
              <KR l={ar?"رسوم المطور":"Developer Fee"} v={fmt(devFeeTotal)} c="#a16207" />
              {w.perfIncentiveEnabled && perfIncentive > 0 && <KR l={ar?"حافز حسن الأداء":"Performance Incentive"} v={fmt(perfIncentive)} c="#059669" />}
              <div style={{gridColumn:"1/-1",height:1,background:"#e5e7ec",margin:"2px 0"}} />
              <KR l={ar?"إجمالي دخل المطور":"Total Developer Income"} v={fmtM(devRoleIncome)} c="#3b82f6" bold />
            </div>
          )}
        </div>

        {/* ── Card 3: Fund Manager ── */}
        <div style={{background:kpiOpen.fund?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.fund?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,fund:!p.fund}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📊</span>
            <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"مدير الصندوق":"Fund Manager"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.fund?"▲":"▼"}</span>
          </div>
          {!kpiOpen.fund ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"رسوم":"Fees", fmtM(w.totalFees), "#f59e0b")}
              {badge(ar?"ملكية":"Equity", fmtM(w.totalEquity), "#3b82f6")}
              {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${exitYr}`, "#16a34a")}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"الرسوم":"FEES"} />
              <KR l={`${ar?"اكتتاب":"Subscription"} (${ar?"مرة":"once"})`} v={fmt(_feeSub)} c="#f59e0b" />
              <KR l={`${ar?"إدارة":"Management"} (${ar?"سنوي":"annual"})`} v={fmt(_feeMgmt)} c="#f59e0b" />
              <KR l={`${ar?"حفظ":"Custody"} (${ar?"سنوي":"annual"})`} v={fmt(_feeCustody)} c="#f59e0b" />
              <KR l={`${ar?"تطوير":"Developer"} (${ar?"مرة":"once"})`} v={fmt(_feeDev)} c="#f59e0b" />
              <KR l={`${ar?"هيكلة":"Structuring"} (${ar?"مرة+سقف":"once+cap"})`} v={fmt(_feeStruct)} c="#f59e0b" />
              <KR l={`${ar?"ما قبل التأسيس":"Pre-Est"} (${ar?"مرة":"once"})`} v={fmt(_feePreEst)} c="#f59e0b" />
              <KR l={`SPV (${ar?"مرة":"once"})`} v={fmt(_feeSpv)} c="#f59e0b" />
              <KR l={`${ar?"مراجع":"Auditor"} (${ar?"سنوي":"annual"})`} v={fmt(_feeAuditor)} c="#f59e0b" />
              {_feeOperator > 0 && <KR l={`${ar?"مشغل":"Operator"} (${ar?"سنوي":"annual"})`} v={fmt(_feeOperator)} c="#f59e0b" />}
              {_feeMisc > 0 && <KR l={`${ar?"أخرى":"Misc."} (${ar?"مرة":"once"})`} v={fmt(_feeMisc)} c="#f59e0b" />}
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #fde68a",paddingTop:4,marginTop:2,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px"}}>
                <KR l={ar?"إجمالي الرسوم":"Total Fees"} v={fmtM(w.totalFees)} c="#f59e0b" bold />
              </div>
              <SecHd text={ar?"رأس المال":"CAPITAL"} />
              <KR l={f?.isHybrid?(ar?"ملكية الصندوق":"Fund Equity"):(ar?"إجمالي الملكية":"Total Equity")} v={fmtM(w.totalEquity)} bold />
              <KR l={ar?"المستثمر / المطور":"Investor / Developer"} v={`${fmtPct(lpPctVal*100)} / ${fmtPct(gpPctVal*100)}`} />
              {f?.isHybrid && <KR l={ar?"تمويل مؤسسي":"Inst. Financing"} v={fmtM(f.govLoanAmount)} c="#059669" />}
              <KR l={ar?"دين":"Debt"} v={f?.totalDebt ? fmtM(f.totalDebt) : "—"} c="#ef4444" />
              <SecHd text={ar?"التخارج":"EXIT"} />
              <KR l={ar?"السنة":"Year"} v={exitYr>0?`${exitYr} (${sy+exitYr-1})`:"—"} />
              <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
              <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="#16a34a" />
              <KR l={ar?"تكاليف %":"Cost %"} v={exitCostPct>0?fmtPct(exitCostPct)+"%":"—"} />
              <SecHd text={ar?"إعدادات":"CONFIG"} />
              <KR l={ar?"معاملة الرسوم":"Fee Treatment"} v={({capital:ar?"رأسمالية":"Capital",expense:ar?"مصروفات":"Expense"})[cfg.feeTreatment||"capital"]||cfg.feeTreatment||"Capital"} />
              <KR l={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} v={({nav:ar?"صافي قيمة الأصول":"NAV",devCost:ar?"إجمالي الأصول":"GAV",equity:ar?"حجم الصندوق":"Fund Size",deployed:ar?"CAPEX منفذ":"Deployed"})[cfg.mgmtFeeBase||"nav"]||cfg.mgmtFeeBase||"NAV"} />
            </div>
          )}
        </div>

      </div>

      {/* ── Card 4: Total Developer Returns (full-width) ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:16}}>
        <div style={{background:kpiOpen.devTotal?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:10,border:kpiOpen.devTotal?"2px solid #16a34a":"1px solid #bbf7d0",padding:"12px 16px",transition:"all 0.2s"}}>
          <div onClick={()=>setKpiOpen(p=>({...p,devTotal:!p.devTotal}))} style={cardHd}>
            <span style={{width:22,height:22,borderRadius:5,background:"#16a34a",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>Σ</span>
            <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"إجمالي عوائد المطور":"Total Developer Returns"}</span>
            <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.devTotal?"▲":"▼"}</span>
          </div>
          {!kpiOpen.devTotal ? (
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
              {badge(ar?"إجمالي":"Total", fmtM(devTotalEconomics), "#16a34a")}
              {badge(ar?"عائد بسيط":"Simple", gpSimpleROE?fmtPct(gpSimpleROE*100):"—", "#3b82f6")}
              {badge("IRR", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
              {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:"3px 16px",marginTop:10,animation:"zanScale 0.15s ease"}}>
              <SecHd text={ar?"مكونات العائد":"RETURN COMPONENTS"} />
              <KR l={ar?"① كمستثمر (توزيعات)":"① As Investor (distributions)"} v={fmt(devAsInvestor)} c="#8b5cf6" />
              <KR l={ar?"② رسوم المطور":"② Developer Fee"} v={fmt(devFeeTotal)} c="#a16207" />
              {w.perfIncentiveEnabled && perfIncentive > 0 && <KR l={ar?"③ حافز حسن الأداء":"③ Performance Incentive"} v={fmt(perfIncentive)} c="#059669" />}
              <div style={{gridColumn:"1/-1",height:1,background:"#bbf7d0",margin:"2px 0"}} />
              <KR l={ar?"إجمالي العوائد":"Total Returns"} v={fmtM(devTotalEconomics)} c="#16a34a" bold />
              <KR l={ar?"مساهمة (حق انتفاع)":"Contribution (Usufruct)"} v={fmt(w.gpTotalInvested)} />
              <KR l={ar?"صافي الربح":"Net Profit"} v={fmtM(devNetProfit)} c={devNetProfit>=0?"#16a34a":"#ef4444"} bold />
              <SecHd text={ar?"المؤشرات":"METRICS"} />
              <div style={{gridColumn:"1/-1",display:"flex",gap:6,flexWrap:"wrap",paddingTop:4}}>
                {badge(ar?"عائد بسيط (إجمالي)":"Simple (Total)", gpSimpleROE?fmtPct(gpSimpleROE*100):"—", "#3b82f6")}
                {badge(ar?"عائد بسيط (سنوي)":"Simple (Annual)", gpSimpleAnnual?fmtPct(gpSimpleAnnual*100):"—", "#3b82f6")}
                {badge(ar?"IRR مركب":"IRR (Net)", w.gpIRR!==null?fmtPct(w.gpIRR*100):"—", getMetricColor("IRR",w.gpIRR))}
                {badge("MOIC", w.gpMOIC?w.gpMOIC.toFixed(2)+"x":"—", getMetricColor("MOIC",w.gpMOIC))}
                {badge(ar?"استرداد":"Payback", gpPayback?`${gpPayback} ${ar?"سنة":"yr"}`:"—", "#6366f1")}
              </div>
            </div>
          )}
        </div>
      </div>
      </>;
    })()}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} waterfall={w} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT (if active) ═══ */}
    {!isFiltered && incentivesResult && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CHART TOGGLE ═══ */}
    {cfChartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setWSec(p=>({...p,chart:!p.chart}))} style={{...btnS,fontSize:11,padding:"6px 14px",background:wSec.chart?"#f0f4ff":"#f8f9fb",color:wSec.chart?"#2563eb":"#6b7080",border:"1px solid "+(wSec.chart?"#93c5fd":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"عرض الرسم البياني":"Show Chart"} {wSec.chart?"▲":"▼"}
        </button>
        {wSec.chart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cfChartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="lpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gpG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="lp" stroke="#8b5cf6" strokeWidth={2} fill="url(#lpG)" name={ar?"مستثمر":"Investor"} dot={false} />
              <Area type="monotone" dataKey="gp" stroke="#3b82f6" strokeWidth={2} fill="url(#gpG)" name={ar?"مطور":"Developer"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>
    )}

    {/* ═══ UNIFIED TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"تدفقات الصندوق":"Fund Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 7. PROJECT CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s7:!p.s7}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{wSec.s7?"▶":"▼"} {ar?"7. تدفقات المشروع (غير ممول)":"7. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!wSec.s7 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
      <CFRow label={ar?"إيجار الأرض":"Land Rent"} values={pc.landRent} total={pc.totalLandRent ?? pc.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      <CFRow label={ar?"تكلفة التطوير (CAPEX)":"Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"صافي التدفق النقدي (غير ممول)":"Net Project CF (Unlevered)"} values={pc.netCF} total={pc.totalNetCF ?? pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 8. FUND CF ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s8:!p.s8}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#2563eb",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{wSec.s8?"▶":"▼"} {ar?"8. تدفقات الصندوق (ممول)":"8. FUND CASH FLOW (Levered)"}</td></tr>
      {!wSec.s8 && <>
      <CFRow label={ar?"طلبات رأس المال":"Equity Calls"} values={w.equityCalls} total={w.equityCalls.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
      {f && <>
        <CFRow label={ar?"سحوبات الدين":"Debt Drawdown"} values={f.drawdown} total={f.drawdown?.reduce((a,b)=>a+b,0)||0} />
        <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={f.debtBalOpen} total={null} />
        <CFRow label={ar?"سداد أصل الدين":"Debt Repayment"} values={f.repayment} total={f.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
        <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={f.debtBalClose} total={null} />
        <CFRow label={ar?"تكلفة التمويل (Profit / Interest)":"Interest/Profit"} values={f.interest} total={f.totalInterest||0} negate color="#ef4444" />
        <CFRow label={ar?"إجمالي خدمة الدين":"Total Debt Service"} values={f.debtService} total={f.debtService?.reduce((a,b)=>a+b,0)||0} negate bold color="#ef4444" />
        {/* DSCR */}
        {f.dscr && <tr>
          <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontWeight:500,minWidth:isMobile?120:200,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>DSCR</td>
          <td style={tdN}></td>
          {years.map(y=>{const v=f.dscr?.[y];return <td key={y} style={{...tdN,fontSize:10,fontWeight:v&&v<1.2?700:500,color:getMetricColor("DSCR",v)}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
        </tr>}
      </>}

      {/* Fees sub-section */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:"#f59e0b",background:"#fffbeb",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"الرسوم":"FEES"}</td></tr>
      {(w.feeSub||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"اكتتاب":"Subscription Fee"}`} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeMgmt||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"إدارة":"Management Fee"}`} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeCustody||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"حفظ":"Custody Fee"}`} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeDev||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"تطوير":"Developer Fee"}`} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeStruct||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"هيكلة":"Structuring Fee"}`} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feePreEst||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"ما قبل التأسيس":"Pre-Establishment"}`} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeSpv||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"SPV":"SPV Setup"}`} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeAuditor||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مراجع حسابات":"Auditor Fee"}`} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeOperator||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"أتعاب المشغل":"Operator Fee"}`} values={w.feeOperator} total={(w.feeOperator||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      {(w.feeMisc||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"مصروفات أخرى":"Misc. Expenses"}`} values={w.feeMisc} total={(w.feeMisc||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
      <CFRow label={ar?"إجمالي الرسوم":"Total Fees"} values={w.fees} total={w.totalFees} bold negate color="#f59e0b" />
      {(w.unfundedFees||[]).reduce((a,b)=>a+b,0)>0 && <CFRow label={`  ${ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"}`} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
      <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={w.exitProceeds} total={exitProc} color="#16a34a" />
      </>}

      {/* ═══ § 9. DISTRIBUTIONS & WATERFALL ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s9:!p.s9}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#7c3aed",background:"#f5f3ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #8b5cf6",userSelect:"none"}}>{wSec.s9?"▶":"▼"} {ar?"9. التوزيعات وشلال الأرباح":"9. DISTRIBUTIONS & WATERFALL"}</td></tr>
      {!wSec.s9 && <>
      <CFRow label={ar?"النقد المتاح للتوزيع":"Cash Available for Distribution"} values={w.cashAvail} total={w.cashAvail.reduce((a,b)=>a+b,0)} bold color="#16a34a" />

      {/* Unreturned Capital tracking */}
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:20}}>{ar?"رأس المال غير المسترد (بداية)":"Unreturned Capital (Open)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{(w.unreturnedOpen[y]||0)===0?"—":fmt(w.unreturnedOpen[y])}</td>)}
      </tr>
      <CFRow label={ar?"رد رأس المال":"Return of Capital"} values={w.tier1} total={t1Total} color="#2563eb" />
      <tr style={{background:"#fafbff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fafbff",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:20,fontWeight:500}}>{ar?"رأس المال غير المسترد (نهاية)":"Unreturned Capital (Close)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:w.unreturnedClose[y]>0?"#3b82f6":"#16a34a",fontSize:10,fontWeight:w.unreturnedClose[y]===0?600:400}}>{w.unreturnedClose[y]===0?"✓ 0":fmt(w.unreturnedClose[y])}</td>)}
      </tr>

      {/* Pref tracking - only show if prefReturnPct > 0 */}
      {t2Total > 0 && <>
      <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontSize:10,color:"#8b5cf6",paddingInlineStart:20}}>{ar?"استحقاق العائد التفضيلي":"Pref Accrual"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:"#8b5cf6",fontSize:10}}>{(w.prefAccrual[y]||0)===0?"—":fmt(w.prefAccrual[y])}</td>)}
      </tr>
      <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"العائد التفضيلي المتراكم":"Unpaid Pref (Accumulated)"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,color:(w.prefAccumulated[y]||0)>0?"#7c3aed":"#16a34a",fontSize:10,fontWeight:(w.prefAccumulated[y]||0)===0?600:400}}>{(w.prefAccumulated[y]||0)===0?"✓ 0":fmt(w.prefAccumulated[y])}</td>)}
      </tr>
      <CFRow label={ar?"العائد التفضيلي":"Preferred Return"} values={w.tier2} total={t2Total} color="#8b5cf6" />
      </>}

      {/* Remaining + T3/T4 */}
      {(() => { const rem = new Array(h).fill(0); for(let y=0;y<h;y++) rem[y]=Math.max(0,(w.cashAvail[y]||0)-(w.tier1[y]||0)-(w.tier2[y]||0)); const tot=rem.reduce((a,b)=>a+b,0); return tot>0?<CFRow label={ar?"المتبقي بعد ROC + Pref":"Remaining After ROC + Pref"} values={rem} total={tot} bold />:null; })()}
      {w.tier3?.some(v=>v>0) && <CFRow label={ar?"T3: تعويض":"T3: Catch-up"} values={w.tier3} total={t3Total} color="#f59e0b" />}
      {(t4LPTotal+t4GPTotal) > 0 && <>
      <CFRow label={ar?"توزيع الأرباح":"Profit Split"} values={(() => { const a=new Array(h).fill(0); for(let y=0;y<h;y++) a[y]=(w.tier4LP[y]||0)+(w.tier4GP[y]||0); return a; })()} total={t4LPTotal+t4GPTotal} color="#16a34a" />
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#16a34a",paddingInlineStart:24}}>→ {ar?"مستثمر":"Investor"} ({cfg.lpProfitSplitPct||75}%)</td>
        <td style={{...tdN,fontSize:10,color:"#16a34a"}}>{fmt(t4LPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#16a34a"}}>{(w.tier4LP[y]||0)===0?"—":fmt(w.tier4LP[y])}</td>)}
      </tr>
      <tr style={{background:"#f0fdf4"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#f0fdf4",zIndex:1,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>→ {ar?"مطور":"Developer"} ({100-(cfg.lpProfitSplitPct||75)}%)</td>
        <td style={{...tdN,fontSize:10,color:"#3b82f6"}}>{fmt(t4GPTotal)}</td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:"#3b82f6"}}>{(w.tier4GP[y]||0)===0?"—":fmt(w.tier4GP[y])}</td>)}
      </tr>
      </>}

      {/* Distribution totals */}
      <CFRow label={ar?"إجمالي توزيعات المستثمر":"Total Investor Distributions"} values={w.lpDist} total={w.lpTotalDist} bold color="#8b5cf6" />
      <CFRow label={ar?"إجمالي توزيعات المطور":"Total Developer Distributions"} values={w.gpDist} total={w.gpTotalDist} bold color="#3b82f6" />
      </>}

      {/* ═══ § 10. INVESTOR RETURNS ═══ */}
      <tr onClick={()=>setWSec(p=>({...p,s10:!p.s10}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#92400e",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ca8a04",userSelect:"none"}}>{wSec.s10?"▶":"▼"} {ar?"10. عوائد المستثمر":"10. INVESTOR RETURNS"}</td></tr>
      {!wSec.s10 && <>
      <CFRow label={ar?"صافي CF المستثمر":"Investor Net Cash Flow"} values={w.lpNetCF} total={w.lpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:600,fontSize:10,color:"#7c3aed",paddingInlineStart:20}}>{ar?"↳ تراكمي المستثمر":"↳ Investor Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.lpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.lpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي المستثمر %":"Investor Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=lpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}

      <CFRow label={ar?"صافي CF المطور":"Developer Net Cash Flow"} values={w.gpNetCF} total={w.gpNetCF.reduce((a,b)=>a+b,0)} bold />
      {(() => { let cum=0; return <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:600,fontSize:10,color:"#1e40af",paddingInlineStart:20}}>{ar?"↳ تراكمي المطور":"↳ Developer Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=>{cum+=w.gpNetCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
      </tr>; })()}
      {w.gpTotalInvested > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي المطور %":"Developer Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const v=gpCashYield[y]||0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
      </>}

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);

}

// ═══════════════════════════════════════════════════════════════
// EXIT ANALYSIS PANEL (shared by all Results views, collapsible)
// ═══════════════════════════════════════════════════════════════
function ExitAnalysisPanel({ project, results, financing, waterfall, lang, globalExpand }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  const f = financing;
  if (!f || !results) return null;

  const c = results.consolidated;
  const h = results.horizon;
  const sy = results.startYear;
  const cur = project.currency || "SAR";
  const strategy = project.exitStrategy || "sale";
  const isHold = strategy === "hold";
  const exitYearAbs = f.exitYear || 0;
  const exitYrIdx = exitYearAbs > 0 ? exitYearAbs - sy : 0;
  const exitProc = f.exitProceeds ? f.exitProceeds.reduce((a,b)=>a+b,0) : 0;

  // If hold and no exit proceeds, still show but with hold info
  if (isHold && exitProc <= 0) {
    return (
      <div style={{background:"var(--surface-card)",borderRadius:10,border:"1px solid #f59e0b22",marginBottom:16,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08"}}>
          <span style={{fontSize:14}}>🚪</span>
          <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"استراتيجية التخارج":"Exit Strategy"}</span>
          <span style={{fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 8px",borderRadius:10}}>{ar?"احتفاظ بالدخل":"Hold for Income"}</span>
        </div>
      </div>
    );
  }
  if (exitProc <= 0) return null;

  // Compute exit details
  const exitMult = project.exitMultiple || 10;
  const exitCostPct = project.exitCostPct || 2;
  const exitCapRate = project.exitCapRate || 9;
  const isSale = strategy === "sale";
  const isCapRate = strategy === "caprate";

  // Stabilized income & NOI at exit
  const stabIncome = exitYrIdx >= 0 && exitYrIdx < h ? (c.income[exitYrIdx] || 0) : 0;
  const stabLandRent = exitYrIdx >= 0 && exitYrIdx < h ? (c.landRent[exitYrIdx] || 0) : 0;
  const stabNOI = stabIncome - stabLandRent;

  // Gross exit value (before cost deduction)
  const grossExit = exitCostPct > 0 ? exitProc / (1 - exitCostPct/100) : exitProc;
  const exitCostAmt = grossExit - exitProc;

  // Implied cap rate and implied multiple
  const impliedCapRate = stabNOI > 0 ? (stabNOI / grossExit) * 100 : 0;
  const impliedMultiple = stabIncome > 0 ? grossExit / stabIncome : 0;

  // Debt remaining at exit
  const debtAtExit = f.debtBalClose ? (exitYrIdx > 0 && exitYrIdx < h ? (f.debtBalClose[Math.max(0,exitYrIdx-1)] || 0) : 0) : 0;
  const netToEquity = exitProc - debtAtExit;

  // Years from construction end to exit
  const constrEnd = f.constrEnd || 0;
  const holdPeriod = exitYrIdx - constrEnd;

  // Dev cost ratio
  const devCost = f.devCostInclLand || c.totalCapex;
  const returnOnCost = devCost > 0 ? exitProc / devCost : 0;

  // Fund-specific: LP/GP exit share
  const w = waterfall;
  const hasWaterfall = w && w.lpTotalDist > 0;

  return (
    <div style={{background:"var(--surface-card)",borderRadius:10,border:`1px solid ${open?"#f59e0b33":"#f59e0b22"}`,marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#f59e0b08",borderBottom:open?"1px solid #f59e0b18":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🚪</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تحليل التخارج":"Exit Analysis"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#f59e0b",background:"#f59e0b18",padding:"2px 8px",borderRadius:10}}>
          {isSale ? `${exitMult}x · ` : isCapRate ? `${exitCapRate}% CR · ` : ""}{exitYearAbs} · {fmtM(exitProc)}
        </span>
        <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Row 1: Strategy + Valuation */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:10,marginBottom:14}}>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"الاستراتيجية":"Strategy"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?(ar?"بيع (مضاعف)":"Sale (Multiple)"):isCapRate?(ar?"بيع (رسملة)":"Sale (Cap Rate)"):(ar?"احتفاظ":"Hold")}</div>
          </div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"سنة التخارج":"Exit Year"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{exitYearAbs} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>({ar?"سنة":"Yr"} {exitYrIdx+1})</span></div>
          </div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"فترة الاحتفاظ":"Hold Period"}</div>
            <div style={{fontSize:13,fontWeight:700}}>{holdPeriod > 0 ? `${holdPeriod} ${ar?"سنة بعد البناء":"yr post-build"}` : "—"}</div>
          </div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{isSale?(ar?"المضاعف":"Multiple"):(ar?"معدل الرسملة":"Cap Rate")}</div>
            <div style={{fontSize:13,fontWeight:700}}>{isSale?`${exitMult}x`:isCapRate?`${exitCapRate}%`:"—"}</div>
          </div>
        </div>

        {/* Row 2: Value breakdown */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
          {/* Valuation */}
          <div style={{background:"#fffbeb",borderRadius:8,padding:"10px 14px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400e",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"التقييم":"VALUATION"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"دخل مستقر":"Stabilized Income"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(stabIncome)}</span>
              {stabLandRent > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"(-) إيجار أرض":"(-) Land Rent"}</span><span style={{textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmt(stabLandRent)}</span></>}
              {stabNOI !== stabIncome && <><span style={{color:"var(--text-secondary)"}}>= NOI</span><span style={{textAlign:"right",fontWeight:600}}>{fmt(stabNOI)}</span></>}
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,color:"var(--text-secondary)"}}>{isSale?`× ${exitMult}x`:isCapRate?`÷ ${exitCapRate}%`:""}</span>
              <span style={{borderTop:"1px solid #fde68a",paddingTop:4,textAlign:"right",fontWeight:700,color:"var(--text-primary)"}}>{fmtM(grossExit)}</span>
              <span style={{color:"#ef4444",fontSize:11}}>{ar?"(-) تكاليف التخارج":"(-) Exit Costs"} ({exitCostPct}%)</span><span style={{textAlign:"right",color:"#ef4444"}}>{fmt(exitCostAmt)}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,fontWeight:700,color:"#16a34a"}}>{ar?"= صافي العائد":"= Net Proceeds"}</span>
              <span style={{borderTop:"2px solid #f59e0b",paddingTop:4,textAlign:"right",fontWeight:800,fontSize:14,color:"#16a34a"}}>{fmtM(exitProc)}</span>
            </div>
          </div>

          {/* Returns */}
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#166534",letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{ar?"مؤشرات التخارج":"EXIT METRICS"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 12px",fontSize:12}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"العائد / التكلفة":"Proceeds / Dev Cost"}</span><span style={{textAlign:"right",fontWeight:700,color:returnOnCost>1?"#16a34a":"#ef4444"}}>{returnOnCost.toFixed(2)}x</span>
              {impliedCapRate > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"معدل رسملة ضمني":"Implied Cap Rate"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedCapRate.toFixed(1)}%</span></>}
              {impliedMultiple > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"مضاعف ضمني":"Implied Multiple"}</span><span style={{textAlign:"right",fontWeight:500}}>{impliedMultiple.toFixed(1)}x</span></>}
              {debtAtExit > 0 && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"#ef4444"}}>{ar?"دين متبقي عند التخارج":"Debt at Exit"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmtM(debtAtExit)}</span>
                <span style={{color:"#16a34a",fontWeight:600}}>{ar?"صافي للملكية":"Net to Equity"}</span><span style={{textAlign:"right",fontWeight:700,color:netToEquity>0?"#16a34a":"#ef4444"}}>{fmtM(netToEquity)}</span>
              </>}
              {f.totalEquity > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"العائد / الملكية":"Proceeds / Equity"}</span><span style={{textAlign:"right",fontWeight:600,color:"#16a34a"}}>{(exitProc/f.totalEquity).toFixed(2)}x</span></>}
              {hasWaterfall && <>
                <span style={{borderTop:"1px solid #dcfce7",paddingTop:4,color:"#8b5cf6"}}>{ar?"حصة المستثمر من التخارج":"Investor Exit Share"}</span><span style={{borderTop:"1px solid #dcfce7",paddingTop:4,textAlign:"right",fontWeight:500,color:"#8b5cf6"}}>{fmtM((w.lpDist||[]).slice(exitYrIdx).reduce((a,b)=>a+b,0))}</span>
                <span style={{color:"#3b82f6"}}>{ar?"حصة المطور من التخارج":"Developer Exit Share"}</span><span style={{textAlign:"right",fontWeight:500,color:"#3b82f6"}}>{fmtM((w.gpDist||[]).slice(exitYrIdx).reduce((a,b)=>a+b,0))}</span>
              </>}
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCENTIVES IMPACT PANEL (shared by all Results views)
// ═══════════════════════════════════════════════════════════════
function IncentivesImpact({ project, results, financing, incentivesResult, lang, globalExpand }) {
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  const ir = incentivesResult;
  if (!ir || !financing) return null;
  const hasAny = (ir.capexGrantTotal||0) > 0 || (ir.interestSubsidyTotal||0) > 0 || (ir.landRentSavingTotal||0) > 0 || (ir.feeRebateTotal||0) > 0;
  if (!hasAny) return null;

  const cur = project.currency || "SAR";
  const c = results.consolidated;
  const f = financing;
  const h = results.horizon;

  // Compute base IRR (WITHOUT incentives) using original CF
  const baseCF = new Array(h).fill(0);
  if (f.mode === "self") {
    // Self: base = raw netCF (no incentive adjustments)
    for (let y = 0; y < h; y++) baseCF[y] = c.income[y] - c.landRent[y] - c.capex[y];
    // Add exit if present
    if (f.exitProceeds) for (let y = 0; y < h; y++) baseCF[y] += f.exitProceeds[y] || 0;
  } else {
    // Debt/Fund: levered base using original (non-adjusted) values
    for (let y = 0; y < h; y++) baseCF[y] = c.income[y] - c.landRent[y] - c.capex[y] - (f.debtService[y]||0) + (f.drawdown[y]||0) + (f.exitProceeds?.[y]||0);
  }
  const baseIRR = calcIRR(baseCF);
  const baseNPV = calcNPV(baseCF, 0.12);
  const withIRR = f.leveredIRR;
  const withNPV = f.leveredCF ? calcNPV(f.leveredCF, 0.12) : null;
  const irrDelta = (withIRR !== null && baseIRR !== null) ? (withIRR - baseIRR) * 100 : null;
  const npvDelta = (withNPV !== null && baseNPV !== null) ? withNPV - baseNPV : null;
  const total = ir.totalIncentiveValue || ((ir.capexGrantTotal||0) + (ir.interestSubsidyTotal||0) + (ir.landRentSavingTotal||0) + (ir.feeRebateTotal||0));

  const items = [
    ir.capexGrantTotal > 0 && { icon: "🏗", label: ar?"منحة CAPEX":"CAPEX Grant", value: ir.capexGrantTotal, color: "#059669" },
    ir.interestSubsidyTotal > 0 && { icon: "🏦", label: ar?"دعم الفوائد":"Interest Subsidy", value: ir.interestSubsidyTotal, color: "#2563eb" },
    ir.landRentSavingTotal > 0 && { icon: "🏠", label: ar?"وفر إيجار الأرض":"Land Rent Savings", value: ir.landRentSavingTotal, color: "#7c3aed" },
    ir.feeRebateTotal > 0 && { icon: "📋", label: ar?"إعفاء رسوم":"Fee Rebates", value: ir.feeRebateTotal, color: "#f59e0b" },
  ].filter(Boolean);

  return (
    <div style={{background:"var(--surface-card)",borderRadius:10,border:"1px solid #05966933",marginBottom:16,overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,background:"#05966908",borderBottom:open?"1px solid #05966918":"none",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:14}}>🏛</span>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"أثر الحوافز الحكومية":"Government Incentives Impact"}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#059669",background:"#05966918",padding:"2px 8px",borderRadius:10}}>{fmtM(total)} {cur}</span>
        <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?"▼":"▶"}</span>
      </div>
      {open && <div style={{padding:"14px 16px",animation:"zanSlide 0.15s ease"}}>
        {/* Active incentives */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {items.map((it,i) => (
            <div key={i} style={{display:"inline-flex",alignItems:"center",gap:6,background:it.color+"12",border:`1px solid ${it.color}33`,borderRadius:6,padding:"5px 10px"}}>
              <span style={{fontSize:12}}>{it.icon}</span>
              <span style={{fontSize:11,fontWeight:600,color:it.color}}>{it.label}</span>
              <span style={{fontSize:11,fontWeight:700,color:"var(--text-primary)"}}>{fmtM(it.value)}</span>
            </div>
          ))}
        </div>

        {/* Before/After comparison */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
          {/* Without */}
          <div style={{background:"#fef2f2",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"بدون حوافز":"WITHOUT INCENTIVES"}</div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"#ef4444"}}>{baseIRR!==null?fmtPct(baseIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)"}}>{fmtM(baseNPV)}</div>
          </div>

          {/* Arrow + Delta */}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:18,color:"#059669"}}>→</div>
            {irrDelta !== null && <div style={{fontSize:11,fontWeight:700,color:"#059669",marginTop:4}}>+{irrDelta.toFixed(2)}%</div>}
            {npvDelta !== null && npvDelta > 0 && <div style={{fontSize:10,color:"#059669"}}>+{fmtM(npvDelta)}</div>}
          </div>

          {/* With */}
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#059669",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{ar?"مع حوافز":"WITH INCENTIVES"}</div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>IRR</div>
            <div style={{fontSize:16,fontWeight:800,color:"#16a34a"}}>{withIRR!==null?fmtPct(withIRR*100):"N/A"}</div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:4}}>NPV@12%</div>
            <div style={{fontSize:12,fontWeight:600,color:"#16a34a"}}>{withNPV!==null?fmtM(withNPV):""}</div>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESULTS VIEW - Dynamic smart results page based on financing mode
// ═══════════════════════════════════════════════════════════════
function ResultsView({ project, results, financing, waterfall, phaseWaterfalls, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const ar = lang === "ar";
  if (!project || !results) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>{ar?"أضف أصول لرؤية النتائج":"Add assets to see results"}</div>;

  const mode = project.finMode || financing?.mode || "self";

  // ── INCOME FUND: Dedicated view ──
  if (mode === "incomeFund") {
    return <IncomeFundResultsView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── FUND MODE: WaterfallView (incentives injected inside) ──
  if (mode === "fund" || mode === "hybrid") {
    return <WaterfallView project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── BANK DEBT / BANK 100%: Full bank results ──
  if (mode === "debt" || mode === "bank100") {
    return <BankResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
  }

  // ── SELF: Full self-funded results ──
  return <SelfResultsView project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} />;
}

// ═══════════════════════════════════════════════════════════════
// SELF-FUNDED RESULTS VIEW
// ═══════════════════════════════════════════════════════════════
function SelfResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [showChart, setShowChart] = useState(false);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  const [kpiOpen, setKpiOpen] = useState({proj:false,cap:false,ret:false});
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowChart(expand); setKpiOpen({proj:expand,cap:expand,ret:expand}); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);

  // ── Phase filter ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const h = results.horizon;
  const sy = results.startYear;
  const cur = project.currency || "SAR";
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);

  // ── Filtered consolidated ──
  const c = useMemo(() => {
    if (!isFiltered) return results.consolidated;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return { ...results.consolidated, income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF, 0.10),
    };
  }, [isFiltered, selectedPhases, results, h]);

  // ── Filtered financing ──
  const f = useMemo(() => {
    if (!isFiltered || !phaseFinancings) return financing;
    const pfs = activePh.map(p => phaseFinancings[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.leveredCF) for (let y=0;y<h;y++) leveredCF[y] += pf.leveredCF[y]||0; });
    const exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.exitProceeds) for (let y=0;y<h;y++) exitProceeds[y] += pf.exitProceeds[y]||0; });
    return { ...financing,
      leveredCF, exitProceeds, leveredIRR: calcIRR(leveredCF),
      devCostInclLand: pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0),
      devCostExclLand: pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0),
      totalDebt: pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0),
      totalEquity: pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0),
      landCapValue: pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0),
      constrEnd: Math.max(...pfs.map(pf => pf.constrEnd || 0)),
      exitYear: Math.max(...pfs.map(pf => pf.exitYear || 0)),
    };
  }, [isFiltered, selectedPhases, financing, phaseFinancings, h]);

  const levIRR = f?.leveredIRR ?? c.irr;
  const exitProc = f?.exitProceeds ? f.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const exitYear = f?.exitYear || 0;
  const totalCapex = c.totalCapex;
  const totalIncome = c.totalIncome;
  const devCost = f?.devCostInclLand || totalCapex;
  const levCF = f?.leveredCF || c.netCF;
  const totalLevCF = levCF.reduce((a,b)=>a+b,0);

  // Payback
  const payback = (() => { let cum=0, wasNeg=false; for(let y=0;y<h;y++){cum+=levCF[y]||0;if(cum<-1)wasNeg=true;if(wasNeg&&cum>=0)return y+1;} return null; })();

  // Simple Return (market convention: ROE / years)
  const selfTotalInvested = Math.abs(levCF.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const selfSimpleROE = selfTotalInvested > 0 ? totalLevCF / selfTotalInvested : 0;
  const selfInvestYears = (() => {
    let first = -1, last = 0;
    for (let y = 0; y < h; y++) { if (levCF[y] < 0 && first < 0) first = y; if (levCF[y] > 0) last = y; }
    return Math.max(1, first >= 0 ? last - first + 1 : h);
  })();
  const selfSimpleAnnual = selfInvestYears > 0 ? selfSimpleROE / selfInvestYears : 0;

  // NOI
  const noiArr = new Array(h).fill(0);
  for (let y=0;y<h;y++) noiArr[y] = (c.income[y]||0) - (c.landRent[y]||0);
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);

  // Yield on cost & stabilized
  const constrEnd = f?.constrEnd || 0;
  const stabIdx = Math.min(constrEnd+2, h-1);
  const stabNOI = noiArr[stabIdx] || 0;
  const yieldOnCost = totalCapex > 0 ? stabNOI / totalCapex : 0;
  const stabIncome = c.income[stabIdx] || 0;

  // Peak capital deployed (max cumulative negative CF)
  let peakCap = 0, cumCF = 0;
  for (let y=0;y<h;y++) { cumCF += levCF[y]||0; if (cumCF < peakCap) peakCap = cumCF; }
  peakCap = Math.abs(peakCap);

  // Capital deployed per year (cumulative CAPEX - cumulative income, floored at 0)
  const capitalDeployed = new Array(h).fill(0);
  let cumCapex=0, cumInc=0;
  for (let y=0;y<h;y++) { cumCapex+=c.capex[y]||0; cumInc+=c.income[y]||0; capitalDeployed[y]=Math.max(0,cumCapex-cumInc); }

  // Incentives
  const ir = incentivesResult;
  const hasIncentives = ir && ((ir.capexGrantTotal||0) > 0 || (ir.landRentSavingTotal||0) > 0 || (ir.feeRebateTotal||0) > 0);
  const incentiveTotal = hasIncentives ? (ir.capexGrantTotal||0)+(ir.landRentSavingTotal||0)+(ir.feeRebateTotal||0) : 0;

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    income: c.income[y]||0,
    capex: c.capex[y]||0,
    net: levCF[y]||0,
    cumCF: (() => { let s=0; for(let i=0;i<=y;i++) s+=levCF[i]||0; return s; })(),
  }));

  // Shared mini-components (same as Bank/Fund KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c:clr,bold:b}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:clr||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
    const nc = v => { if(color) return color; return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {allPhaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* ═══ EXPANDABLE KPI CARDS: Project | Capital | Returns ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* ── 🏠 Project Card ── */}
      <div style={{background:kpiOpen.proj?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:10,border:kpiOpen.proj?"2px solid #16a34a":"1px solid #86efac",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,proj:!p.proj}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#16a34a",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>🏠</span>
          <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"المشروع":"Project"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.proj?"▲":"▼"}</span>
        </div>
        {!kpiOpen.proj ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"تكلفة":"Cost", fmtM(devCost), "#1a1d23")}
            {badge(ar?"إيرادات":"Revenue", fmtM(totalIncome), "#16a34a")}
            {badge("NOI", fmtM(totalNOI), "#059669")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"التكاليف":"COSTS"} />
            <KR l={ar?"تكلفة التطوير":"Dev Cost"} v={fmtM(devCost)} bold />
            <KR l="CAPEX" v={fmtM(totalCapex)} />
            <KR l={ar?"إيجار الأرض":"Land Rent"} v={fmtM(c.totalLandRent)} c="#ef4444" />
            {f?.landCapValue > 0 && <KR l={ar?"رسملة حق الانتفاع":"Leasehold Cap"} v={fmtM(f.landCapValue)} />}
            <SecHd text={ar?"الإيرادات":"REVENUE"} />
            <KR l={ar?"إجمالي الإيرادات":"Total Revenue"} v={fmtM(totalIncome)} c="#16a34a" bold />
            <KR l={ar?"دخل مستقر (NOI)":"Stabilized NOI"} v={fmt(stabNOI)} c="#059669" />
            <KR l={ar?"عائد على التكلفة":"Yield on Cost"} v={yieldOnCost>0?fmtPct(yieldOnCost*100):"—"} c={yieldOnCost>0.08?"#16a34a":"#f59e0b"} />
            <KR l={ar?"الأفق":"Horizon"} v={`${h} ${ar?"سنة":"yrs"}`} />
            {hasIncentives && !isFiltered && <><SecHd text={ar?"حوافز":"INCENTIVES"} /><KR l={ar?"إجمالي الحوافز":"Total Incentives"} v={fmtM(incentiveTotal)} c="#059669" bold /></>}
          </div>
        )}
      </div>

      {/* ── 💰 Capital Card ── */}
      <div style={{background:kpiOpen.cap?"#fff":"linear-gradient(135deg, #eff6ff, #e0f2fe)",borderRadius:10,border:kpiOpen.cap?"2px solid #2563eb":"1px solid #93c5fd",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,cap:!p.cap}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#2563eb",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>💰</span>
          <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"رأس المال":"Capital"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.cap?"▲":"▼"}</span>
        </div>
        {!kpiOpen.cap ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"مطلوب":"Required", fmtM(devCost), "#2563eb")}
            {badge(ar?"ذروة":"Peak", fmtM(peakCap), "#dc2626")}
            {badge(ar?"استرداد":"Payback", payback?`Yr ${payback}`:"—", "#6366f1")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"الحاجة الرأسمالية":"CAPITAL NEEDS"} />
            <KR l={ar?"إجمالي مطلوب":"Total Required"} v={fmtM(devCost)} c="#2563eb" bold />
            <KR l={ar?"ذروة رأس المال المجمد":"Peak Capital Locked"} v={fmtM(peakCap)} c="#dc2626" bold />
            <KR l={ar?"فترة البناء":"Construction"} v={`${constrEnd+1} ${ar?"سنة":"yrs"}`} />
            <SecHd text={ar?"الاسترداد":"RECOVERY"} />
            <KR l={ar?"فترة الاسترداد":"Payback Period"} v={payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"} c="#2563eb" bold />
            <KR l={ar?"صافي التدفق":"Total Net CF"} v={fmtM(totalLevCF)} c={totalLevCF>0?"#16a34a":"#ef4444"} />
            {exitProc > 0 && <KR l={ar?"عائد التخارج":"Exit Proceeds"} v={fmtM(exitProc)} c="#16a34a" />}
            <SecHd text={ar?"تكلفة الفرصة البديلة":"OPPORTUNITY COST"} />
            <KR l={ar?"لو استثمرت بـ 5% سنوي":"If invested @5%/yr"} v={fmtM(devCost * Math.pow(1.05, payback||10) - devCost)} c="#6b7080" />
            <KR l={ar?"لو استثمرت بـ 8% سنوي":"If invested @8%/yr"} v={fmtM(devCost * Math.pow(1.08, payback||10) - devCost)} c="#6b7080" />
          </div>
        )}
      </div>

      {/* ── 📈 Returns Card ── */}
      <div style={{background:kpiOpen.ret?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.ret?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,ret:!p.ret}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📈</span>
          <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"العوائد":"Returns"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.ret?"▲":"▼"}</span>
        </div>
        {!kpiOpen.ret ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"عائد بسيط":"Simple", selfSimpleROE?fmtPct(selfSimpleROE*100):"—", "#f59e0b")}
            {badge("IRR", levIRR!==null?fmtPct(levIRR*100):"—", getMetricColor("IRR",levIRR))}
            {exitProc>0 && badge(ar?"تخارج":"Exit", fmtM(exitProc), "#16a34a")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"العائد البسيط (عرف السوق)":"SIMPLE RETURN (MARKET CONVENTION)"} />
            <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={selfSimpleROE?fmtPct(selfSimpleROE*100):"N/A"} c="#f59e0b" bold />
            <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={selfSimpleAnnual?fmtPct(selfSimpleAnnual*100):"N/A"} c="#f59e0b" />
            <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${selfInvestYears} ${ar?"سنة":"yr"}`} />
            <SecHd text={ar?"المؤشرات الدقيقة":"PRECISE METRICS"} />
            <KR l={ar?"صافي IRR (مركب)":"Net IRR (Compounded)"} v={levIRR!==null?fmtPct(levIRR*100):"N/A"} c={getMetricColor("IRR",levIRR)} bold />
            <KR l={ar?"عائد على التكلفة":"Yield on Cost"} v={yieldOnCost>0?fmtPct(yieldOnCost*100):"—"} c={yieldOnCost>0.08?"#16a34a":"#6b7080"} />
            <KR l={ar?"استرداد":"Payback"} v={payback?`${payback} ${ar?"سنة":"yr"}`:"—"} c="#2563eb" />
            {exitProc>0 && <KR l={ar?"العائد / التكلفة":"Return / Cost"} v={(exitProc/devCost).toFixed(2)+"x"} c={exitProc/devCost>1?"#16a34a":"#ef4444"} bold />}
            <SecHd text="NPV" />
            <KR l="@10%" v={fmtM(calcNPV(levCF,0.10))} />
            <KR l="@12%" v={fmtM(calcNPV(levCF,0.12))} c="#2563eb" bold />
            <KR l="@14%" v={fmtM(calcNPV(levCF,0.14))} />
            <SecHd text={ar?"فحوصات":"CHECKS"} />
            <KR l="IRR > 12%" v={levIRR>0.12?"✅":"❌"} c={levIRR>0.12?"#16a34a":"#ef4444"} />
            <KR l="NPV@12% > 0" v={calcNPV(levCF,0.12)>0?"✅":"❌"} c={calcNPV(levCF,0.12)>0?"#16a34a":"#ef4444"} />
            <KR l={ar?"صافي إيجابي":"Net CF > 0"} v={totalLevCF>0?"✅":"❌"} c={totalLevCF>0?"#16a34a":"#ef4444"} />
            <KR l={ar?"عائد > 8%":"Yield > 8%"} v={yieldOnCost>0.08?"✅":"❌"} c={yieldOnCost>0.08?"#16a34a":"#ef4444"} />
          </div>
        )}
      </div>
    </div>
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}
    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={f} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT ═══ */}
    {!isFiltered && <IncentivesImpact project={project} results={results} financing={f} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ CF CHART (Revenue + CAPEX + Cumulative) ═══ */}
    {chartData.length > 2 && (
      <div style={{marginBottom:16}}>
        <button onClick={()=>setShowChart(!showChart)} style={{...btnS,fontSize:11,padding:"6px 14px",background:showChart?"#f0fdf4":"#f8f9fb",color:showChart?"#16a34a":"#6b7080",border:"1px solid "+(showChart?"#86efac":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"رسم بياني":"Cash Flow Chart"} {showChart?"▲":"▼"}
        </button>
        {showChart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="incSG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                <linearGradient id="cumSG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(Math.abs(v))} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} fill="url(#incSG)" name={ar?"الإيرادات":"Revenue"} dot={false} />
              <Area type="monotone" dataKey="capex" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="CAPEX" dot={false} />
              <Area type="monotone" dataKey="cumCF" stroke="#2563eb" strokeWidth={2.5} fill="url(#cumSG)" name={ar?"تراكمي":"Cumulative"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10}}>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#16a34a",borderRadius:2,marginInlineEnd:4}} />{ar?"الإيرادات":"Revenue"}</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#ef4444",borderRadius:2,marginInlineEnd:4,borderTop:"1px dashed #ef4444"}} />CAPEX</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#2563eb",borderRadius:2,marginInlineEnd:4}} />{ar?"تراكمي":"Cumulative CF"}</span>
          </div>
        </div>}
      </div>
    )}

    {/* ═══ COMPREHENSIVE CASH FLOW TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"التدفق النقدي الشامل":"Comprehensive Cash Flow"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 1. PROJECT CF ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s1:!p.s1}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{secOpen.s1?"▶":"▼"} {ar?"1. تدفقات المشروع":"1. PROJECT CASH FLOWS"}</td></tr>
      {!secOpen.s1 && <>
      <CFRow label={ar?"الإيرادات":"Revenue"} values={c.income} total={c.totalIncome} color="#16a34a" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
      <CFRow label={ar?"(-) تكلفة التطوير (CAPEX)":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={c.netCF} total={c.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 2. EXIT & INCENTIVES ═══ */}
      {(exitProc > 0 || (hasIncentives && !isFiltered)) && <>
      <tr onClick={()=>setSecOpen(p=>({...p,s2:!p.s2}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#f59e0b",background:"#fffbeb",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #f59e0b",userSelect:"none"}}>{secOpen.s2?"▶":"▼"} {ar?"2. التخارج والحوافز":"2. EXIT & INCENTIVES"}</td></tr>
      {!secOpen.s2 && <>
      {exitProc > 0 && <CFRow label={ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"} values={f?.exitProceeds||new Array(h).fill(0)} total={exitProc} color="#16a34a" />}
      {hasIncentives && !isFiltered && ir.capexGrantSchedule && (ir.capexGrantTotal||0)>0 && <CFRow label={ar?"(+) منحة CAPEX":"(+) CAPEX Grant"} values={ir.capexGrantSchedule} total={ir.capexGrantTotal} color="#059669" />}
      {hasIncentives && !isFiltered && ir.landRentSavingSchedule && (ir.landRentSavingTotal||0)>0 && <CFRow label={ar?"(+) وفر إيجار الأرض":"(+) Land Rent Savings"} values={ir.landRentSavingSchedule} total={ir.landRentSavingTotal} color="#059669" />}
      </>}
      </>}

      {/* ═══ § 3. NET RESULT & CAPITAL ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s3:!p.s3}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#e0e7ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #1e3a5f",userSelect:"none"}}>{secOpen.s3?"▶":"▼"} {ar?"3. صافي النتيجة ورأس المال":"3. NET RESULT & CAPITAL"}</td></tr>
      {!secOpen.s3 && <>
      <CFRow label={ar?"= صافي التدفق النهائي":"= Final Net Cash Flow"} values={levCF} total={totalLevCF} bold />
      {/* Cumulative */}
      {(() => { let cum=0; const cumArr=levCF.map(v=>{cum+=v;return cum;}); return <tr style={{background:"#fffbeb"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:isMobile?120:200}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cumArr[y]<0?"#ef4444":"#16a34a"}}>{fmt(cumArr[y])}</td>)}
      </tr>; })()}
      {/* Capital Deployed */}
      <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:10,color:"#2563eb",minWidth:isMobile?120:200}}>{ar?"رأس المال المجمد":"Capital Deployed"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontSize:10,color:capitalDeployed[y]>0?"#2563eb":"#d0d4dc"}}>{capitalDeployed[y]>0?fmt(capitalDeployed[y]):"—"}</td>)}
      </tr>
      </>}

      {/* ═══ § 4. DEVELOPER METRICS ═══ */}
      <tr><td colSpan={years.length+2} style={{padding:"8px 12px",fontSize:11,background:"#e0e7ff",borderTop:"2px solid #1e3a5f"}}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontWeight:700,color:"#1e3a5f"}}>{ar?"مؤشرات المطور":"Developer Metrics"}:</span>
          <span>{ar?"عائد بسيط":"Simple"} <strong style={{color:"#f59e0b"}}>{selfSimpleROE?fmtPct(selfSimpleROE*100):"—"}</strong> <span style={{fontSize:9,color:"var(--text-secondary)"}}>({ar?"سنوي":"ann."} {selfSimpleAnnual?fmtPct(selfSimpleAnnual*100):"—"})</span></span>
          <span>IRR <strong style={{color:getMetricColor("IRR",levIRR)}}>{levIRR!==null?fmtPct(levIRR*100):"N/A"}</strong></span>
          <span>{ar?"استرداد":"Payback"} <strong style={{color:"#2563eb"}}>{payback?`${payback} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
          <span>NPV@12% <strong style={{color:"#2563eb"}}>{fmtM(calcNPV(levCF,0.12))}</strong></span>
        </div>
      </td></tr>

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// BANK RESULTS VIEW - For debt & bank100 modes
// ═══════════════════════════════════════════════════════════════
function BankResultsView({ project, results, financing, phaseFinancings, incentivesResult, t, lang, up, globalExpand }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  const [eduModal, setEduModal] = useState(null);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true,s4:true,s5:true});
  const [kpiOpen, setKpiOpen] = useState({bank:false,dev:false,proj:false});
  const [showChart, setShowChart] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setShowTerms(expand); setKpiOpen({bank:expand,dev:expand,proj:expand}); setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true,s4:true,s5:true}); }}, [globalExpand]);

  if (!financing) return <div style={{padding:32,textAlign:"center",color:"var(--text-tertiary)"}}>{ar?"اضبط إعدادات التمويل":"Configure financing settings"}</div>;

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const hasPhases = allPhaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;

  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;
  const upCfg = up ? (isSinglePhase
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }))) : null;

  const h = results.horizon;
  const sy = results.startYear;
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;
  const cur = project.currency || "SAR";
  const isBank100 = cfg.finMode === "bank100";

  // ── Filtered financing ──
  const pf = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p => phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0), debtService = new Array(h).fill(0), debtBalClose = new Array(h).fill(0);
    const interest = new Array(h).fill(0), repayment = new Array(h).fill(0), exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf2 => { for (let y=0;y<h;y++) {
      leveredCF[y]+=pf2.leveredCF?.[y]||0; debtService[y]+=pf2.debtService?.[y]||0;
      debtBalClose[y]+=pf2.debtBalClose?.[y]||0; interest[y]+=pf2.interest?.[y]||0;
      repayment[y]+=pf2.repayment?.[y]||0; exitProceeds[y]+=pf2.exitProceeds?.[y]||0;
    }});
    const dscrRaw = new Array(h).fill(null);
    for (let y=0;y<h;y++) { if (debtService[y]>0) { let noi=0; activePh.forEach(p=>{const pr=results.phaseResults?.[p];if(pr)noi+=(pr.income[y]||0)-(pr.landRent[y]||0);}); dscrRaw[y]=noi/debtService[y]; }}
    return { ...financing, leveredCF, debtService, debtBalClose, interest, repayment, exitProceeds, dscr: dscrRaw, leveredIRR: calcIRR(leveredCF),
      totalDebt: pfs.reduce((s,p2)=>s+(p2.totalDebt||0),0), totalEquity: pfs.reduce((s,p2)=>s+(p2.totalEquity||0),0),
      totalInterest: pfs.reduce((s,p2)=>s+(p2.totalInterest||0),0), devCostInclLand: pfs.reduce((s,p2)=>s+(p2.devCostInclLand||0),0),
      maxDebt: pfs.reduce((s,p2)=>s+(p2.maxDebt||0),0), constrEnd: Math.max(...pfs.map(p2=>p2.constrEnd||0)),
      exitYear: Math.max(...pfs.map(p2=>p2.exitYear||0)), gpEquity: pfs.reduce((s,p2)=>s+(p2.gpEquity||0),0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h, results]);

  // ── Filtered cashflow ──
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return results.consolidated;
    const income=new Array(h).fill(0), capex=new Array(h).fill(0), landRent=new Array(h).fill(0), netCF=new Array(h).fill(0);
    activePh.forEach(pName=>{const pr=results.phaseResults?.[pName];if(!pr)return;for(let y=0;y<h;y++){income[y]+=pr.income[y]||0;capex[y]+=pr.capex[y]||0;landRent[y]+=pr.landRent[y]||0;netCF[y]+=pr.netCF[y]||0;}});
    return { income, capex, landRent, netCF, totalCapex:capex.reduce((a,b)=>a+b,0), totalIncome:income.reduce((a,b)=>a+b,0), totalLandRent:landRent.reduce((a,b)=>a+b,0), totalNetCF:netCF.reduce((a,b)=>a+b,0), irr:calcIRR(netCF) };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h]);

  // ── Derived metrics ──
  const dscrVals = pf.dscr ? pf.dscr.filter(v => v !== null && v > 0) : [];
  const dscrMin = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const dscrAvg = dscrVals.length > 0 ? dscrVals.reduce((a,b)=>a+b,0)/dscrVals.length : null;
  const peakDebt = pf.debtBalClose ? Math.max(...pf.debtBalClose) : 0;
  const debtClearYr = (() => { if (!pf.debtBalClose) return null; for (let y=0;y<h;y++) { if (pf.debtBalClose[y]<=0 && y>0 && pf.debtBalClose[y-1]>0) return sy+y; } return null; })();
  const totalDS = pf.debtService ? pf.debtService.reduce((a,b)=>a+b,0) : 0;
  const exitProc = pf.exitProceeds ? pf.exitProceeds.reduce((a,b)=>a+b,0) : 0;
  const exitYr = pf.exitYear ? pf.exitYear - sy : 0;
  const exitMult = cfg.exitMultiple || project.exitMultiple || 0;
  const exitCostPct = cfg.exitCostPct || project.exitCostPct || 0;
  const paybackLev = (() => { if (!pf.leveredCF) return null; let cum=0,wasNeg=false; for (let y=0;y<h;y++) { cum+=pf.leveredCF[y]||0; if(cum<-1)wasNeg=true; if(wasNeg&&cum>=0) return y+1; } return null; })();
  const constrEnd = pf.constrEnd || 0;
  const stableIncome = pc.income.find((v,i) => i > constrEnd && v > 0) || 0;
  const cashOnCash = pf.totalEquity > 0 && stableIncome > 0 ? stableIncome / pf.totalEquity : 0;
  const totalFinCost = pf.totalInterest;
  const devNetCF = pf.leveredCF ? pf.leveredCF.reduce((a,b)=>a+b,0) : 0;

  // Simple Return (market convention)
  const bankLevCF = pf.leveredCF || [];
  const bankTotalInvested = Math.abs(bankLevCF.filter(v => v < 0).reduce((a,b) => a+b, 0));
  const bankSimpleROE = bankTotalInvested > 0 ? devNetCF / bankTotalInvested : 0;
  const bankInvestYears = (() => {
    let first = -1, last = 0;
    for (let y = 0; y < h; y++) { if ((bankLevCF[y]||0) < 0 && first < 0) first = y; if ((bankLevCF[y]||0) > 0) last = y; }
    return Math.max(1, first >= 0 ? last - first + 1 : h);
  })();
  const bankSimpleAnnual = bankInvestYears > 0 ? bankSimpleROE / bankInvestYears : 0;
  const isHoldMode = (cfg.exitStrategy || "sale") === "hold" || cfg.finMode === "incomeFund";
  const isLongHold = isHoldMode && bankInvestYears > 20;

  // Chart data
  const chartData = years.map(y => ({
    year: sy+y, yr: `Yr ${y+1}`,
    balance: pf.debtBalClose?.[y] || 0,
    noi: (pc.income[y]||0) - (pc.landRent[y]||0),
    ds: pf.debtService?.[y] || 0,
  }));

  // CFRow (same as WaterfallView)
  const CFRow = ({label, values, total, bold, color, negate}) => {
    const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
    const nc = v => { if(color) return color; return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af"; };
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?120:200}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-(total||0):(total||0))}}>{total!==null&&total!==undefined?fmt(total):""}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  // Shared mini-components (same as WaterfallView KPI cards)
  const badge = (label, value, color) => <span style={{display:"inline-flex",alignItems:"center",gap:4,background:color+"18",color,borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700}}>{label} <strong>{value}</strong></span>;
  const KR = ({l,v,c,bold:b}) => <><span style={{color:"var(--text-secondary)",fontSize:11}}>{l}</span><span style={{textAlign:"right",fontWeight:b?700:500,fontSize:11,color:c||"#1a1d23"}}>{v}</span></>;
  const SecHd = ({text}) => <div style={{gridColumn:"1/-1",fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",color:"var(--text-tertiary)",paddingTop:6,borderTop:"1px solid #f0f1f5",marginTop:2}}>{text}</div>;
  const cardHd = {cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"};

  return (<div>
    {/* ═══ Phase Selector (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pff = phaseFinancings?.[p];
            const irr = pff?.leveredIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}{irr!==null&&irr!==undefined?<span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span>:""}
            </button>;
          })}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && upCfg && (
      <div style={{background:"#fffbeb",borderRadius:8,border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}

    {/* ═══ Quick Edit - Loan Terms ═══ */}
    {upCfg && (
      <div style={{background:showTerms?"#fff":"#f8f9fb",borderRadius:10,border:showTerms?"2px solid #2563eb":"1px solid #e5e7ec",marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setShowTerms(!showTerms)} style={{padding:"10px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:showTerms?"#eff6ff":"#f8f9fb",userSelect:"none"}}>
          <span style={{fontSize:13}}>⚡</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?"تعديل سريع - شروط القرض":"Quick Edit - Loan Terms"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{!isBank100?`${cfg.maxLtvPct||70}% LTV · `:""}{cfg.financeRate||6.5}% · {cfg.loanTenor||7} {ar?"سنة":"yrs"} ({cfg.debtGrace||3} {ar?"سماح":"grace"})</span>
          <span style={{fontSize:11,color:"var(--text-tertiary)",marginInlineStart:8}}>{showTerms?"▲":"▼"}</span>
        </div>
        {showTerms && <div style={{padding:"12px 16px",borderTop:"1px solid #bfdbfe",animation:"zanSlide 0.15s ease"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2563eb",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"شروط القرض":"LOAN TERMS"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            {!isBank100 && <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>LTV %</span>
              <input type="number" value={cfg.maxLtvPct||""} onChange={e=>upCfg({maxLtvPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>}
            {[
              {l:ar?"معدل %":"Rate %",k:"financeRate",v:cfg.financeRate},
              {l:ar?"المدة":"Tenor (yr)",k:"loanTenor",v:cfg.loanTenor},
              {l:ar?"سماح":"Grace (yr)",k:"debtGrace",v:cfg.debtGrace},
              {l:ar?"رسوم %":"Fee %",k:"upfrontFeePct",v:cfg.upfrontFeePct},
            ].map(fld=><div key={fld.k} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{fld.l}</span>
              <input type="number" value={fld.v||""} onChange={e=>upCfg({[fld.k]:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"السداد":"Repay"}</span>
              <select value={cfg.repaymentType||"amortizing"} onChange={e=>upCfg({repaymentType:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="amortizing">{ar?"أقساط":"Amortizing"}</option>
                <option value="bullet">{ar?"دفعة واحدة":"Bullet"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"بداية السماح":"Grace Basis"}</span>
              <select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="cod">COD</option>
                <option value="firstDraw">{ar?"أول سحب":"1st Draw"}</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"السحب":"Tranche"}</span>
              <select value={cfg.debtTrancheMode||"single"} onChange={e=>upCfg({debtTrancheMode:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="single">{ar?"كتلة واحدة":"Single"}</option>
                <option value="perDraw">{ar?"لكل سحبة":"Per Draw"}</option>
              </select>
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{ar?"التخارج":"EXIT STRATEGY"}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:70}}>{ar?"الاستراتيجية":"Strategy"}</span>
              <select value={cfg.exitStrategy||"sale"} onChange={e=>upCfg({exitStrategy:e.target.value})} style={{padding:"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,background:"var(--surface-card)"}}>
                <option value="sale">{ar?"بيع":"Sale"}</option>
                <option value="hold">{ar?"احتفاظ":"Hold"}</option>
                <option value="caprate">Cap Rate</option>
              </select>
            </div>
            {(cfg.exitStrategy||"sale")!=="hold"&&<>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"السنة":"Year"}</span>
                <input type="number" value={cfg.exitYear||""} onChange={e=>upCfg({exitYear:parseFloat(e.target.value)||0})} placeholder="auto" style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
                {pf?.optimalExitYear > 0 && pf?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <span style={{fontSize:10,color:"#92400e",background:"#fef9c3",padding:"2px 6px",borderRadius:4}}>💡 {ar?"يوصى:":"Rec:"} {pf.optimalExitYear} ({(pf.optimalExitIRR*100).toFixed(1)}%)</span>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"المضاعف":"Multiple"}</span>
                <input type="number" value={cfg.exitMultiple||""} onChange={e=>upCfg({exitMultiple:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>}
              {cfg.exitStrategy==="caprate"&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"رسملة %":"Cap %"}</span>
                <input type="number" value={cfg.exitCapRate||""} onChange={e=>upCfg({exitCapRate:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:60}}>{ar?"تكلفة %":"Cost %"}</span>
                <input type="number" value={cfg.exitCostPct||""} onChange={e=>upCfg({exitCostPct:parseFloat(e.target.value)||0})} style={{width:isMobile?80:60,padding:isMobile?"8px 10px":"5px 8px",border:"0.5px solid var(--border-default)",borderRadius:6,fontSize:12,textAlign:"center",background:"var(--surface-card)"}} />
              </div>
            </>}
          </div>
        </div>}
      </div>
    )}

    {/* ═══ EXPANDABLE KPI CARDS: Bank | Developer | Project ═══ */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      {/* ── 🏦 Bank (Lender) Card ── */}
      <div style={{background:kpiOpen.bank?"#fff":"linear-gradient(135deg, #eff6ff, #e0f2fe)",borderRadius:10,border:kpiOpen.bank?"2px solid #2563eb":"1px solid #93c5fd",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,bank:!p.bank}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#2563eb",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>🏦</span>
          <span style={{fontSize:11,fontWeight:700,color:"#1e40af",flex:1}}>{ar?"البنك (المقرض)":"Bank (Lender)"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.bank?"▲":"▼"}</span>
        </div>
        {!kpiOpen.bank ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"دين":"Debt", fmtM(pf.totalDebt), "#2563eb")}
            {badge("DSCR", dscrMin!==null?dscrMin.toFixed(2)+"x":"—", getMetricColor("DSCR",dscrMin))}
            {badge(ar?"فوائد":"Interest", fmtM(pf.totalInterest), "#ef4444")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"هيكل القرض":"LOAN STRUCTURE"} />
            <KR l={ar?"إجمالي القرض":"Total Facility"} v={fmtM(pf.totalDebt)} c="#2563eb" bold />
            <KR l="LTV" v={isBank100?"100%":fmtPct((pf.totalDebt/(pf.devCostInclLand||1))*100)} />
            <KR l={ar?"معدل التمويل":"Finance Rate"} v={`${cfg.financeRate||6.5}%`} />
            <KR l={ar?"المدة":"Tenor"} v={`${cfg.loanTenor||7} ${ar?"سنة":"yrs"}`} />
            <KR l={ar?"فترة السماح":"Grace"} v={`${cfg.debtGrace||3} ${ar?"سنة":"yrs"}`} />
            <KR l={ar?"نوع السداد":"Repay Type"} v={cfg.repaymentType==="bullet"?(ar?"دفعة واحدة":"Bullet"):(ar?"أقساط":"Amortizing")} />
            <KR l={ar?"أولوية السحب":"Draw Order"} v={cfg.finMode==="hybrid"?((cfg.hybridDrawOrder||"finFirst")==="finFirst"?(ar?"التمويل أولاً":"Financing First"):(ar?"متزامن":"Pro-Rata")):((cfg.capitalCallOrder||"prorata")==="debtFirst"?(ar?"الدين أولاً":"Debt First"):(ar?"متزامن":"Pro-Rata"))} />
            <SecHd text={ar?"تكلفة الدين":"DEBT COST"} />
            <KR l={ar?"إجمالي الفوائد":"Total Interest"} v={fmtM(pf.totalInterest)} c="#ef4444" bold />
            {(pf.upfrontFee||0) > 0 && <KR l={ar?"* تشمل رسوم قرض":"* incl. upfront fee"} v={fmtM(pf.upfrontFee)} />}
            <KR l={ar?"إجمالي تكلفة الدين":"Total Debt Cost"} v={fmtM(totalFinCost)} c="#ef4444" bold />
            <KR l={ar?"كنسبة من التكلفة":"% of Dev Cost"} v={pf.devCostInclLand>0?fmtPct(totalFinCost/pf.devCostInclLand*100):"—"} />
            <SecHd text="DSCR" />
            <KR l={ar?"أدنى":"Minimum"} v={dscrMin!==null?dscrMin.toFixed(2)+"x":"—"} c={getMetricColor("DSCR",dscrMin)} bold />
            <KR l={ar?"متوسط":"Average"} v={dscrAvg!==null?dscrAvg.toFixed(2)+"x":"—"} c={dscrAvg>=1.5?"#16a34a":"#f59e0b"} />
            <KR l={ar?"ذروة الدين":"Peak Debt"} v={fmtM(peakDebt)} c="#dc2626" />
            <KR l={ar?"تصفية الدين":"Debt Cleared"} v={debtClearYr?`${debtClearYr}`:(ar?"لم يُصفَّ":"Not cleared")} c={debtClearYr?"#16a34a":"#ef4444"} />
          </div>
        )}
      </div>

      {/* ── 👷 Developer (Borrower) Card ── */}
      <div style={{background:kpiOpen.dev?"#fff":"linear-gradient(135deg, #f0fdf4, #ecfdf5)",borderRadius:10,border:kpiOpen.dev?"2px solid #16a34a":"1px solid #86efac",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,dev:!p.dev}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#16a34a",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>👷</span>
          <span style={{fontSize:11,fontWeight:700,color:"#166534",flex:1}}>{ar?"المطور (المقترض)":"Developer (Borrower)"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.dev?"▲":"▼"}</span>
        </div>
        {!kpiOpen.dev ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {isLongHold
              ? badge(ar?"عائد نقدي":"Cash Yield", cashOnCash>0?fmtPct(cashOnCash*100):"—", "#f59e0b")
              : badge(ar?"عائد بسيط":"Simple", bankSimpleROE?fmtPct(bankSimpleROE*100):"—", "#f59e0b")}
            {badge("IRR", pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"—", getMetricColor("IRR",pf.leveredIRR))}
            {badge(ar?"استرداد":"Payback", paybackLev?`Yr ${paybackLev}`:"—", "#6366f1")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"رأس المال":"CAPITAL"} />
            <KR l={ar?"ملكية المطور":"Developer Equity"} v={fmtM(pf.gpEquity||pf.totalEquity)} c="#3b82f6" bold />
            {pf.lpEquity>0 && <KR l={ar?"ملكية أخرى":"Other Equity"} v={fmtM(pf.lpEquity)} c="#8b5cf6" />}
            <KR l={ar?"تكلفة التطوير":"Dev Cost"} v={fmtM(pf.devCostInclLand)} bold />
            {pf.landCapValue>0 && <KR l={ar?"رسملة أرض":"Land Cap"} v={fmtM(pf.landCapValue)} />}
            {isLongHold ? <>
              <SecHd text={ar?"عائد الاحتفاظ":"HOLD RETURN"} />
              <KR l={ar?"عائد نقدي سنوي (مستقر)":"Stabilized Cash Yield"} v={cashOnCash>0?fmtPct(cashOnCash*100):"N/A"} c="#f59e0b" bold />
              <KR l={ar?"فترة الاحتفاظ":"Hold Period"} v={`${bankInvestYears} ${ar?"سنة":"yr"}`} />
            </> : <>
              <SecHd text={ar?"العائد البسيط (عرف السوق)":"SIMPLE RETURN (MARKET CONVENTION)"} />
              <KR l={ar?"العائد البسيط (إجمالي)":"Simple Return (Total)"} v={bankSimpleROE?fmtPct(bankSimpleROE*100):"N/A"} c="#f59e0b" bold />
              <KR l={ar?"العائد البسيط (سنوي)":"Simple Return (Annual)"} v={bankSimpleAnnual?fmtPct(bankSimpleAnnual*100):"N/A"} c="#f59e0b" />
              <KR l={ar?"فترة الاستثمار":"Investment Period"} v={`${bankInvestYears} ${ar?"سنة":"yr"}`} />
            </>}
            <SecHd text={ar?"المؤشرات الدقيقة":"PRECISE METRICS"} />
            <KR l={ar?"صافي IRR (مركب) بعد التمويل":"Levered IRR (Compounded)"} v={pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"N/A"} c={getMetricColor("IRR",pf.leveredIRR)} bold />
            <KR l={ar?"IRR قبل التمويل":"Unlevered IRR"} v={pc.irr!==null?fmtPct(pc.irr*100):"N/A"} />
            <KR l={ar?"فترة الاسترداد":"Payback"} v={paybackLev?`${paybackLev} ${ar?"سنة":"yr"}`:"—"} c="#2563eb" />
            <KR l={ar?"عائد نقدي":"Cash-on-Cash"} v={cashOnCash>0?fmtPct(cashOnCash*100):"—"} c={cashOnCash>0.08?"#16a34a":"#6b7080"} />
            <KR l={ar?"صافي التدفق":"Net CF"} v={fmtM(devNetCF)} c={devNetCF>0?"#16a34a":"#ef4444"} bold />
            {/* Leverage Effect (debt+equity only) */}
            {!isBank100 && pf.totalEquity > 0 && <>
            <SecHd text={ar?"تأثير الرافعة المالية":"LEVERAGE EFFECT"} />
            <KR l={ar?"IRR بدون دين":"Without Debt"} v={pc.irr!==null?fmtPct(pc.irr*100):"—"} c="#6b7080" />
            <KR l={ar?"IRR مع دين":"With Debt"} v={pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"—"} c={getMetricColor("IRR",pf.leveredIRR)} bold />
            <KR l={ar?"الفرق (أثر الدين)":"IRR Boost"} v={pc.irr!==null&&pf.leveredIRR!==null?`+${((pf.leveredIRR-pc.irr)*100).toFixed(2)}%`:"—"} c={pf.leveredIRR>pc.irr?"#10b981":"#ef4444"} bold />
            {!isLongHold && <KR l={ar?"مضاعف الملكية":"Equity Multiple"} v={pf.totalEquity>0?((exitProc+devNetCF)/pf.totalEquity).toFixed(2)+"x":"—"} c={exitProc+devNetCF>pf.totalEquity?"#16a34a":"#ef4444"} bold />}
            </>}
            <SecHd text="NPV" />
            <KR l="@10%" v={fmtM(calcNPV(pf.leveredCF,0.10))} />
            <KR l="@12%" v={fmtM(calcNPV(pf.leveredCF,0.12))} c="#2563eb" bold />
            <KR l="@14%" v={fmtM(calcNPV(pf.leveredCF,0.14))} />
          </div>
        )}
      </div>

      {/* ── 📋 Project Card ── */}
      <div style={{background:kpiOpen.proj?"#fff":"linear-gradient(135deg, #fefce8, #fff7ed)",borderRadius:10,border:kpiOpen.proj?"2px solid #f59e0b":"1px solid #fde68a",padding:"12px 16px",transition:"all 0.2s"}}>
        <div onClick={()=>setKpiOpen(p=>({...p,proj:!p.proj}))} style={cardHd}>
          <span style={{width:22,height:22,borderRadius:5,background:"#f59e0b",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10}}>📋</span>
          <span style={{fontSize:11,fontWeight:700,color:"#92400e",flex:1}}>{ar?"المشروع":"Project"}</span>
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>{kpiOpen.proj?"▲":"▼"}</span>
        </div>
        {!kpiOpen.proj ? (
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap",alignItems:"center",animation:"zanFade 0.15s ease"}}>
            {badge(ar?"تكلفة":"Cost", fmtM(pf.devCostInclLand), "#1a1d23")}
            {badge(ar?"إيرادات":"Revenue", fmtM(pc.totalIncome), "#16a34a")}
            {exitProc>0 && badge(ar?"تخارج":"Exit", `${fmtM(exitProc)} Yr${(pf.exitYear||0)}`, "#f59e0b")}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 12px",marginTop:10,animation:"zanScale 0.15s ease"}}>
            <SecHd text={ar?"المصادر والاستخدامات":"SOURCES & USES"} />
            <KR l={ar?"دين بنكي":"Bank Debt"} v={fmtM(pf.totalDebt)} c="#ef4444" />
            <KR l={ar?"ملكية":"Equity"} v={fmtM(pf.totalEquity)} c="#3b82f6" />
            {/* Visual Debt/Equity bar */}
            {!isBank100 && pf.devCostInclLand > 0 && <div style={{gridColumn:"1/-1",marginTop:2,marginBottom:4}}>
              <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:"#e5e7ec"}}>
                <div style={{width:`${(pf.totalDebt/(pf.devCostInclLand||1))*100}%`,background:"#ef4444",borderRadius:"4px 0 0 4px"}} />
                <div style={{width:`${(pf.totalEquity/(pf.devCostInclLand||1))*100}%`,background:"#3b82f6",borderRadius:"0 4px 4px 0"}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:2}}>
                <span style={{color:"#ef4444",fontWeight:600}}>{ar?"دين":"Debt"} {fmtPct((pf.totalDebt/(pf.devCostInclLand||1))*100)}</span>
                <span style={{color:"#3b82f6",fontWeight:600}}>{ar?"ملكية":"Equity"} {fmtPct((pf.totalEquity/(pf.devCostInclLand||1))*100)}</span>
              </div>
            </div>}
            <KR l={ar?"تكلفة بناء":"Construction"} v={fmtM(pf.devCostExclLand)} />
            {pf.landCapValue>0 && <KR l={ar?"أرض":"Land"} v={fmtM(pf.landCapValue)} />}
            <KR l={ar?"الإجمالي":"Total"} v={fmtM(pf.devCostInclLand)} bold />
            <SecHd text={ar?"التخارج":"EXIT"} />
            <KR l={ar?"الاستراتيجية":"Strategy"} v={cfg.exitStrategy==="hold"?(ar?"احتفاظ":"Hold"):cfg.exitStrategy==="caprate"?"Cap Rate":(ar?"بيع":"Sale")} />
            <KR l={ar?"السنة":"Year"} v={pf.exitYear?`${pf.exitYear}`:"—"} />
            <KR l={ar?"المضاعف":"Multiple"} v={exitMult>0?exitMult+"x":"—"} />
            <KR l={ar?"العائد":"Proceeds"} v={exitProc>0?fmtM(exitProc):"—"} c="#16a34a" />
            <KR l={ar?"تكلفة التخارج":"Exit Cost"} v={exitCostPct>0?exitCostPct+"%":"—"} />
            <SecHd text={ar?"امتثال بنكي":"BANK COMPLIANCE"} />
            <KR l="Min DSCR ≥ 1.25x" v={dscrMin>=1.25?"✅":"❌"} c={getMetricColor("DSCR",dscrMin)} bold />
            <KR l="Avg DSCR ≥ 1.50x" v={dscrAvg>=1.5?"✅":"❌"} c={dscrAvg>=1.5?"#16a34a":"#ef4444"} bold />
            <KR l={ar?"الدين مسدد":"Debt Cleared"} v={debtClearYr?"✅":"❌"} c={debtClearYr?"#16a34a":"#ef4444"} />
            <KR l="IRR > 0" v={pf.leveredIRR>0?"✅":"❌"} c={pf.leveredIRR>0?"#10b981":"#ef4444"} />
          </div>
        )}
      </div>
    </div>
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و DSCR؟":"What do IRR, NPV, DSCR mean?"} /></div>

    {/* ═══ EXIT ANALYSIS ═══ */}    {!isFiltered && <ExitAnalysisPanel project={project} results={results} financing={pf} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ INCENTIVES IMPACT ═══ */}
    {!isFiltered && <IncentivesImpact project={project} results={results} financing={pf} incentivesResult={incentivesResult} lang={lang} globalExpand={globalExpand} />}

    {/* ═══ FINANCING CHARTS (Pie + DSCR Line + Debt Area) ═══ */}
    {pf && pf.totalDebt > 0 && (() => {
      const dscrData = years.map(y => ({
        year: sy + y,
        dscr: pf.dscr?.[y] != null && pf.dscr[y] > 0 ? Math.min(pf.dscr[y], 50) : null,
      })).filter(d => d.dscr !== null);
      const debtData = years.map(y => ({
        year: sy + y,
        balance: pf.debtBalClose?.[y] || 0,
        noi: (pc.income[y]||0) - (pc.landRent[y]||0),
        ds: pf.debtService?.[y] || 0,
      }));
      const pieData = [
        { name: ar ? "دين" : "Debt", value: pf.totalDebt, color: "#ef4444" },
        { name: ar ? "ملكية" : "Equity", value: pf.totalEquity, color: "#2EC4B6" },
      ].filter(d => d.value > 0);
      const effLTV = pf.devCostInclLand > 0 ? ((pf.totalDebt / pf.devCostInclLand) * 100).toFixed(0) : 0;

      return <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,flex:1}}>{ar?"التحليل البصري":"Visual Analysis"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr",gap:12}}>
          {/* Pie: Debt/Equity Split */}
          <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{ar?"هيكل رأس المال":"Capital Structure"}</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((d,idx) => <Cell key={idx} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={v => fmtM(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{textAlign:"center",fontSize:20,fontWeight:700,color:getMetricColor("LTV",+effLTV),marginTop:-8}}>{effLTV}% LTV</div>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6,fontSize:10}}>
              {pieData.map((d,i) => <span key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:2,background:d.color,display:"inline-block"}} />{d.name}: {fmtM(d.value)}</span>)}
            </div>
          </div>

          {/* DSCR Line Chart */}
          {dscrData.length > 1 && <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>{ar?"مسار DSCR":"DSCR Trajectory"}</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dscrData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
                <XAxis dataKey="year" tick={{fontSize:9,fill:"#6b7080"}} />
                <YAxis tick={{fontSize:9,fill:"#6b7080"}} domain={[0, dataMax => Math.min(Math.max(dataMax * 1.1, 3), 50)]} tickFormatter={v => v.toFixed(1)+"x"} />
                <Tooltip formatter={v => v.toFixed(2)+"x"} />
                <ReferenceLine y={1.2} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{value:"1.2x min",position:"right",fontSize:9,fill:"#ef4444"}} />
                <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} label={{value:"1.5x target",position:"right",fontSize:9,fill:"#10b981"}} />
                <Line type="monotone" dataKey="dscr" stroke="#2563eb" strokeWidth={2.5} dot={{fill:"#2563eb",r:3}} activeDot={{r:5}} name="DSCR" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:4,fontSize:10}}>
              <span><span style={{display:"inline-block",width:12,height:3,background:"#2563eb",borderRadius:2,marginInlineEnd:4}} />DSCR</span>
              <span><span style={{display:"inline-block",width:12,height:1,borderTop:"2px dashed #ef4444",marginInlineEnd:4}} />{ar?"حد أدنى":"Min"} 1.2x</span>
              <span><span style={{display:"inline-block",width:12,height:1,borderTop:"2px dashed #10b981",marginInlineEnd:4}} />{ar?"مستهدف":"Target"} 1.5x</span>
            </div>
          </div>}
        </div>
      </div>;
    })()}

    {/* ═══ CHART TOGGLE (Debt Balance + NOI) ═══ */}
    {chartData.length > 2 && (
      <div style={{marginBottom:14}}>
        <button onClick={()=>setShowChart(!showChart)} style={{...btnS,fontSize:11,padding:"6px 14px",background:showChart?"#eff6ff":"#f8f9fb",color:showChart?"#2563eb":"#6b7080",border:"1px solid "+(showChart?"#93c5fd":"#e5e7ec"),borderRadius:6,fontWeight:600}}>
          📈 {ar?"رسم بياني - الدين vs الدخل":"Debt vs Income Chart"} {showChart?"▲":"▼"}
        </button>
        {showChart && <div style={{marginTop:10,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 18px",animation:"zanSlide 0.15s ease"}}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
              <defs>
                <linearGradient id="debtBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                <linearGradient id="noiBG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f5" />
              <XAxis dataKey="year" tick={{fontSize:10,fill:"#6b7080"}} />
              <YAxis tick={{fontSize:10,fill:"#6b7080"}} tickFormatter={v => v>=1e6?`${(v/1e6).toFixed(0)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v} />
              <Tooltip formatter={(v) => fmt(Math.abs(v))} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={2.5} fill="url(#debtBG)" name={ar?"رصيد الدين":"Debt Balance"} dot={false} />
              <Area type="monotone" dataKey="noi" stroke="#16a34a" strokeWidth={2} fill="url(#noiBG)" name="NOI" dot={false} />
              <Area type="monotone" dataKey="ds" stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name={ar?"خدمة الدين":"Debt Service"} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10}}>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#ef4444",borderRadius:2,marginInlineEnd:4}} />{ar?"رصيد الدين":"Debt Balance"}</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#16a34a",borderRadius:2,marginInlineEnd:4}} />NOI</span>
            <span><span style={{display:"inline-block",width:12,height:3,background:"#f59e0b",borderRadius:2,marginInlineEnd:4,borderTop:"1px dashed #f59e0b"}} />{ar?"خدمة الدين":"Debt Service"}</span>
          </div>
        </div>}
      </div>
    )}

    {/* ═══ COMPREHENSIVE CASH FLOW TABLE ═══ */}
    <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:8}}>
      <div style={{fontSize:14,fontWeight:700,flex:1}}>{ar?"التدفقات النقدية البنكية":"Bank Cash Flows"}</div>
      <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:11}}>
        {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
      </select>
    </div>

    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
    <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
      <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?120:200}}>{ar?"البند":"Line Item"}</th>
      <th style={{...thSt,textAlign:"right",minWidth:85}}>{ar?"الإجمالي":"Total"}</th>
      {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:78}}>{ar?"س":"Yr"} {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
    </tr></thead><tbody>

      {/* ═══ § 1. PROJECT CF (Unlevered) ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s1:!p.s1}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase",userSelect:"none"}}>{secOpen.s1?"▶":"▼"} {ar?"1. تدفقات المشروع (قبل التمويل)":"1. PROJECT CASH FLOWS (Unlevered)"}</td></tr>
      {!secOpen.s1 && <>
      <CFRow label={ar?"الإيرادات":"Rental Income"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
      <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pc.landRent} total={pc.landRent.reduce((a,b)=>a+b,0)} negate color="#ef4444" />
      {/* NOI */}
      {(() => { const noi=new Array(h).fill(0); for(let y=0;y<h;y++) noi[y]=(pc.income[y]||0)-(pc.landRent[y]||0); return <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noi} total={noi.reduce((a,b)=>a+b,0)} bold />; })()}
      <CFRow label={ar?"(-) تكلفة التطوير (CAPEX)":"(-) Development CAPEX"} values={pc.capex} total={pc.totalCapex} negate color="#ef4444" />
      <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Net Project CF (Unlevered)"} values={pc.netCF} total={pc.netCF.reduce((a,b)=>a+b,0)} bold />
      </>}

      {/* ═══ § 2. BANK FINANCING ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s2:!p.s2}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#2563eb",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #3b82f6",userSelect:"none"}}>{secOpen.s2?"▶":"▼"} {ar?"2. التمويل البنكي":"2. BANK FINANCING"}</td></tr>
      {!secOpen.s2 && <>
      {!isBank100 && pf.equityCalls && <CFRow label={ar?"طلبات رأس المال":"Equity Calls"} values={pf.equityCalls} total={pf.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" negate />}
      {/* Cumulative equity deployed */}
      {!isBank100 && pf.equityCalls && <tr style={{background:"#faf5ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#faf5ff",zIndex:1,fontWeight:500,fontSize:10,color:"#7c3aed",paddingInlineStart:20,minWidth:isMobile?120:200}}>{ar?"↳ ملكية تراكمية":"↳ Cumulative Equity"}</td>
        <td style={tdN}></td>
        {(() => { let cum=0; return years.map(y => { cum+=pf.equityCalls[y]||0; return <td key={y} style={{...tdN,fontSize:10,fontWeight:500,color:cum>0?"#7c3aed":"#d0d4dc"}}>{cum>0?fmt(cum):"—"}</td>; }); })()}
      </tr>}
      <CFRow label={ar?"سحوبات الدين":"Debt Drawdown"} values={pf.drawdown} total={pf.drawdown?.reduce((a,b)=>a+b,0)||0} />
      <CFRow label={ar?"رصيد الدين (بداية)":"Debt Balance (Open)"} values={pf.debtBalOpen} total={null} />
      <CFRow label={ar?"(-) سداد أصل الدين":"(-) Principal Repayment"} values={pf.repayment} total={pf.repayment?.reduce((a,b)=>a+b,0)||0} negate color="#ef4444" />
      <CFRow label={ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"} values={pf.debtBalClose} total={null} />
      <CFRow label={ar?"(-) تكلفة التمويل (Profit / Interest)":"(-) Interest / Profit Cost"} values={pf.interest} total={pf.totalInterest||0} negate color="#ef4444" />
      <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={pf.debtService} total={totalDS} negate bold color="#ef4444" />
      {/* Exit */}
      {exitProc > 0 && <CFRow label={ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"} values={pf.exitProceeds} total={exitProc} color="#16a34a" />}
      </>}

      {/* ═══ § 3. DSCR & DEBT COVERAGE ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s3:!p.s3}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e40af",background:"#dbeafe",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb",userSelect:"none"}}>{secOpen.s3?"▶":"▼"} {ar?"3. تغطية خدمة الدين (DSCR)":"3. DEBT SERVICE COVERAGE (DSCR)"}</td></tr>
      {!secOpen.s3 && <>
      {/* NOI row */}
      {(() => { const noi=new Array(h).fill(0); for(let y=0;y<h;y++) noi[y]=(pc.income[y]||0)-(pc.landRent[y]||0); return <CFRow label={ar?"صافي الدخل التشغيلي (NOI)":"Net Operating Income (NOI)"} values={noi} total={noi.reduce((a,b)=>a+b,0)} color="#16a34a" />; })()}
      {/* DS row */}
      <CFRow label={ar?"(÷) خدمة الدين":"(÷) Debt Service"} values={pf.debtService} total={totalDS} color="#ef4444" />
      {/* DSCR = NOI / DS (highlighted) */}
      {pf.dscr && <tr style={{background:"#eff6ff"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:700,minWidth:isMobile?120:200,fontSize:11,color:"#1e40af",paddingInlineStart:10}}>= DSCR (NOI ÷ DS)</td>
        <td style={{...tdN,fontWeight:700,color:"#1e40af"}}>{dscrAvg!==null?dscrAvg.toFixed(2)+"x":""}</td>
        {years.map(y=>{const v=pf.dscr?.[y];const bg=v===null||v===undefined?"#eff6ff":getMetricColor("DSCR",v,{raw:true})==="error"?"#fef2f2":getMetricColor("DSCR",v,{raw:true})==="warning"?"#fefce8":"#f0fdf4";const fg=getMetricColor("DSCR",v);return <td key={y} style={{...tdN,fontSize:11,fontWeight:700,color:fg,background:bg}}>{v===null||v===undefined?"—":v.toFixed(2)+"x"}</td>;})}
      </tr>}
      {/* Min DSCR indicator */}
      <tr><td colSpan={years.length+2} style={{padding:"4px 12px",fontSize:10,color:getMetricColor("DSCR",dscrMin),background:dscrMin>=1.25?"#f0fdf4":"#fef2f2"}}>
        {dscrMin>=1.25?"✅":"⚠️"} {ar?"الحد الأدنى":"Minimum"}: <strong>{dscrMin!==null?dscrMin.toFixed(2)+"x":"N/A"}</strong> | {ar?"المتوسط":"Average"}: <strong>{dscrAvg!==null?dscrAvg.toFixed(2)+"x":"N/A"}</strong> | {ar?"حد البنك":"Bank Req"}: <strong>1.25x</strong>
      </td></tr>
      </>}

      {/* ═══ § 4. FINANCING COST ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s4:!p.s4}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#dc2626",background:"#fef2f2",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #ef4444",userSelect:"none"}}>{secOpen.s4?"▶":"▼"} {ar?"4. تكلفة التمويل":"4. FINANCING COST"}</td></tr>
      {!secOpen.s4 && <>
      <CFRow label={ar?"إجمالي الفوائد":"Total Interest Paid"} values={pf.interest} total={pf.totalInterest||0} color="#ef4444" />
      {(pf.upfrontFee||0) > 0 && <tr style={{background:"#fef2f2"}}><td style={{...tdSt,position:"sticky",left:0,background:"#fef2f2",zIndex:1,fontSize:10,color:"var(--text-tertiary)",paddingInlineStart:20,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* includes upfront fee"}: {fmt(pf.upfrontFee)}</td><td colSpan={years.length+1}></td></tr>}
      {/* As % of dev cost */}
      <tr style={{background:"#fef2f2"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fef2f2",zIndex:1,fontSize:10,color:"#dc2626",fontWeight:600,paddingInlineStart:10}}>{ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost"}</td>
        <td style={{...tdN,fontWeight:700,color:"#dc2626"}}>{pf.devCostInclLand>0?fmtPct(totalFinCost/pf.devCostInclLand*100):""}</td>
        <td colSpan={years.length}></td>
      </tr>
      </>}

      {/* ═══ § 5. NET CASH FLOW & DEVELOPER RETURNS ═══ */}
      <tr onClick={()=>setSecOpen(p=>({...p,s5:!p.s5}))} style={{cursor:"pointer"}}><td colSpan={years.length+2} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#e0e7ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #1e3a5f",userSelect:"none"}}>{secOpen.s5?"▶":"▼"} {ar?"5. صافي التدفق وعوائد المطور":"5. NET CASH FLOW & DEVELOPER RETURNS"}</td></tr>
      {!secOpen.s5 && <>
      <CFRow label={ar?"= صافي التدفق (بعد التمويل)":"= Levered Net Cash Flow"} values={pf.leveredCF} total={devNetCF} bold />
      {/* Cumulative */}
      {(() => { let cum=0; const cumArr=pf.leveredCF.map(v=>{cum+=v;return cum;}); return <tr style={{background:"#fffbeb"}}>
        <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:isMobile?120:200}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
        <td style={tdN}></td>
        {years.map(y=><td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cumArr[y]<0?"#ef4444":"#16a34a"}}>{fmt(cumArr[y])}</td>)}
      </tr>; })()}
      {/* Cash Yield */}
      {pf.totalEquity > 0 && <tr>
        <td style={{...tdSt,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:20}}>{ar?"عائد نقدي %":"Cash Yield %"}</td>
        <td style={tdN}></td>
        {years.map(y=>{const inc=pc.income[y]||0;const eq=pf.totalEquity;const v=eq>0&&inc>0?inc/eq:0;return <td key={y} style={{...tdN,fontSize:10,fontWeight:v>0?600:400,color:v>=0.08?"#16a34a":v>0?"#ca8a04":"#d0d4dc"}}>{v>0?fmtPct(v*100):"—"}</td>;})}
      </tr>}
      {/* IRR / NPV summary row */}
      <tr style={{background:"#e0e7ff"}}>
        <td colSpan={years.length+2} style={{padding:"8px 12px",fontSize:11}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontWeight:700,color:"#1e3a5f"}}>{ar?"مؤشرات المطور":"Developer Metrics"}:</span>
            {isLongHold
              ? <span>{ar?"عائد نقدي":"Cash Yield"} <strong style={{color:"#f59e0b"}}>{cashOnCash>0?fmtPct(cashOnCash*100):"—"}</strong></span>
              : <span>{ar?"عائد بسيط":"Simple"} <strong style={{color:"#f59e0b"}}>{bankSimpleROE?fmtPct(bankSimpleROE*100):"—"}</strong> <span style={{fontSize:9,color:"var(--text-secondary)"}}>({ar?"سنوي":"ann."} {bankSimpleAnnual?fmtPct(bankSimpleAnnual*100):"—"})</span></span>
            }
            <span>IRR <strong style={{color:getMetricColor("IRR",pf.leveredIRR)}}>{pf.leveredIRR!==null?fmtPct(pf.leveredIRR*100):"N/A"}</strong></span>
            <span>{ar?"استرداد":"Payback"} <strong style={{color:"#2563eb"}}>{paybackLev?`${paybackLev} ${ar?"سنة":"yr"}`:"N/A"}</strong></span>
            <span>NPV@12% <strong style={{color:"#2563eb"}}>{fmtM(calcNPV(pf.leveredCF,0.12))}</strong></span>
          </div>
        </td>
      </tr>
      </>}

    </tbody></table></div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// FieldGroup, FL, Inp, Drp — imported from ./components/shared/FormWidgets.jsx

function FinancingView({ project, results, financing, phaseFinancings, waterfall, phaseWaterfalls, incentivesResult, t, up, lang, globalExpand }) {
  const isMobile = useIsMobile();
  const [showYrs, setShowYrs] = useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [cfgSec, setCfgSec] = useState({}); // accordion sections: {debt:false} = collapsed
  const cfgToggle = (id) => setCfgSec(prev => ({...prev, [id]: !prev[id]}));
  const cfgOpen = (id) => cfgSec[id] === true; // all closed by default
  const [eduModal, setEduModal] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [secOpen, setSecOpen] = useState({s1:true,s2:true,s3:true});
  const [kpiOpen, setKpiOpen] = useState({bank:false,dev:false,proj:false});
  const [showChart, setShowChart] = useState(false);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; const allSec = {mode:expand,debt:expand,exit:expand,land:expand,fund:expand,wf:expand,fees:expand,dscr:expand,equity:expand,cf:expand}; setCollapsed(expand?allSec:{}); setCfgSec(expand?{debt:true,exit:true,land:true,fund:true,wf:true,fees:true}:{}); setShowTerms(expand); setKpiOpen({bank:expand,dev:expand,proj:expand}); setShowChart(expand); setSecOpen(expand?{}:{s1:true,s2:true,s3:true}); }}, [globalExpand]);
  const ar = lang === "ar";
  const cur = project.currency || "SAR";
  const toggle = (id) => setCollapsed(prev => ({...prev, [id]: !prev[id]}));
  const isOpen = (id) => collapsed[id] === true; // all closed by default

  // ── Phase filter (multi-select) ──
  const allPhaseNames = Object.keys(results?.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const isSinglePhase = selectedPhases.length === 1;
  const singlePhaseName = isSinglePhase ? selectedPhases[0] : null;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const hasPhases = allPhaseNames.length > 1 && phaseFinancings && Object.keys(phaseFinancings).length > 0;

  // ── Settings source: single phase → phase settings, multi → first selected, all → project ──
  const cfg = isSinglePhase ? getPhaseFinancing(project, singlePhaseName)
    : (isFiltered && activePh.length > 0) ? getPhaseFinancing(project, activePh[0])
    : project;

  // ── Settings writer ──
  const upCfg = isSinglePhase
    // Single phase → write to that phase only
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => p.name === singlePhaseName
          ? { ...p, financing: { ...getPhaseFinancing(prev, singlePhaseName), ...fields } }
          : p)
      }))
    : isFiltered
    // Multiple phases selected → write to selected phases ONLY (not project-level)
    ? (fields) => up(prev => ({
        phases: (prev.phases||[]).map(p => activePh.includes(p.name)
          ? { ...p, financing: { ...(p.financing || getPhaseFinancing(prev, p.name)), ...fields } }
          : p)
      }))
    // All → write to project + propagate to all phases
    : (fields) => up(prev => ({
        ...fields,
        phases: (prev.phases||[]).map(p => p.financing
          ? { ...p, financing: { ...p.financing, ...fields } }
          : p)
      }));

  const copyFromPhase = (sourceName) => {
    const source = getPhaseFinancing(project, sourceName);
    upCfg({ ...source });
  };

  if (!project || !results) return <div style={{padding:40,textAlign:"center",color:"var(--text-tertiary)"}}>
    <div style={{fontSize:32,marginBottom:12}}>📊</div>
    <div style={{fontSize:14,fontWeight:500,color:"var(--text-secondary)",marginBottom:6}}>{ar?"أكمل برنامج الأصول أولاً":"Complete Asset Program First"}</div>
    <div style={{fontSize:12}}>{ar?"أضف أصول في تاب 'برنامج الأصول' ثم ارجع هنا":"Add assets in the 'Asset Program' tab, then return here"}</div>
  </div>;

  const h = results.horizon;
  const sy = results.startYear;
  const ir = incentivesResult;
  // Fee auto-default hints — shown under field as part of hint text
  const _FD = { subscriptionFeePct:2, annualMgmtFeePct:0.9, mgmtFeeCapAnnual:0, custodyFeeAnnual:130000, developerFeePct:12, structuringFeePct:0.1, structuringFeeCap:0, preEstablishmentFee:0, spvFee:0, auditorFeeAnnual:40000, operatorFeePct:0, operatorFeeCap:0, miscExpensePct:0, upfrontFeePct:0.5, maxLtvPct:70, financeRate:6.5, loanTenor:7, debtGrace:3, exitMultiple:10, exitCapRate:9, exitCostPct:2, landCapRate:1000, prefReturnPct:15, carryPct:30, lpProfitSplitPct:70, hurdleIRR:15, incentivePct:20, govFinancingPct:70, govFinanceRate:3, govLoanTenor:15, govGrace:5, govUpfrontFeePct:0 };
  const _FU = { loanTenor:ar?"سنوات":"yr", debtGrace:ar?"سنوات":"yr", govLoanTenor:ar?"سنوات":"yr", govGrace:ar?"سنوات":"yr", exitMultiple:"x", landCapRate:ar?"ريال/م²":"SAR/sqm", custodyFeeAnnual:ar?" ريال":" SAR", auditorFeeAnnual:ar?" ريال":" SAR" }; // special units
  const autoHint = (field, baseHint) => { const d = _FD[field]; if (d === undefined) return baseHint; const u = _FU[field]; const fmt = u ? d.toLocaleString()+u : d >= 1000 ? (d/1000).toLocaleString()+'K' : d+'%'; const tag = ar ? `التلقائي: ${fmt}` : `default: ${fmt}`; return baseHint ? baseHint + ` · ${tag}` : tag; };
  const dh = (field) => autoHint(field, ""); // shortcut: default hint only
  const years = Array.from({length:Math.min(showYrs,h)},(_,i)=>i);
  const phaseNames = allPhaseNames;

  // ── Filtered financing & cashflow ──
  const f = useMemo(() => {
    if (isSinglePhase && phaseFinancings?.[singlePhaseName]) return phaseFinancings[singlePhaseName];
    if (!isFiltered) return financing;
    const pfs = activePh.map(p => phaseFinancings?.[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const leveredCF = new Array(h).fill(0), debtService = new Array(h).fill(0), debtBalClose = new Array(h).fill(0);
    const interest = new Array(h).fill(0), repayment = new Array(h).fill(0), exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { for (let y=0;y<h;y++) {
      leveredCF[y] += pf.leveredCF?.[y]||0; debtService[y] += pf.debtService?.[y]||0;
      debtBalClose[y] += pf.debtBalClose?.[y]||0; interest[y] += pf.interest?.[y]||0;
      repayment[y] += pf.repayment?.[y]||0; exitProceeds[y] += pf.exitProceeds?.[y]||0;
    }});
    const dscrRaw = new Array(h).fill(null);
    for (let y=0;y<h;y++) { if (debtService[y] > 0) { let noi = 0; activePh.forEach(p => { const pr = results.phaseResults?.[p]; if (pr) noi += (pr.income[y]||0) - (pr.landRent[y]||0); }); dscrRaw[y] = noi / debtService[y]; } }
    return { ...financing, leveredCF, debtService, debtBalClose, interest, repayment, exitProceeds,
      leveredIRR: calcIRR(leveredCF), dscr: dscrRaw,
      totalDebt: pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0),
      totalEquity: pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0),
      totalInterest: pfs.reduce((s,pf) => s + (pf.totalInterest||0), 0),
      devCostInclLand: pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0),
      devCostExclLand: pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0),
      landCapValue: pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0),
      maxDebt: pfs.reduce((s,pf) => s + (pf.maxDebt||0), 0),
      gpEquity: pfs.reduce((s,pf) => s + (pf.gpEquity||0), 0),
      lpEquity: pfs.reduce((s,pf) => s + (pf.lpEquity||0), 0),
      constrEnd: Math.max(...pfs.map(pf => pf.constrEnd || 0)),
      upfrontFee: pfs.reduce((s,pf) => s + (pf.upfrontFee||0), 0),
      devFeeTotal: pfs.reduce((s,pf) => s + (pf.devFeeTotal||0), 0),
    };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, financing, phaseFinancings, h, results]);

  const c = results.consolidated;
  const pc = useMemo(() => {
    if (isSinglePhase && results.phaseResults?.[singlePhaseName]) return results.phaseResults[singlePhaseName];
    if (!isFiltered) return c;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => { const pr = results.phaseResults?.[pName]; if (!pr) return; for (let y=0;y<h;y++) { income[y]+=pr.income[y]||0; capex[y]+=pr.capex[y]||0; landRent[y]+=pr.landRent[y]||0; netCF[y]+=pr.netCF[y]||0; }});
    return { income, capex, landRent, netCF, totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0), totalLandRent: landRent.reduce((a,b)=>a+b,0), totalNetCF: netCF.reduce((a,b)=>a+b,0), irr: calcIRR(netCF) };
  }, [isSinglePhase, singlePhaseName, isFiltered, selectedPhases, results, h, c]);

  const CFRow=({label,values,total,bold,color,negate})=>{
    const st=bold?{fontWeight:700,background:"var(--surface-table-header)"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af";};
    return <tr style={st}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:500,minWidth:isMobile?100:140}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmt(total)}</td>
      {years.map(y=>{const v=values?.[y]||0;return <td key={y} style={{...tdN,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
    </tr>;
  };

  return (<div>
    {/* ═══ PHASE SELECTOR (multi-select) ═══ */}
    {hasPhases && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p=>{
            const active = activePh.includes(p) && selectedPhases.length > 0;
            const pf = phaseFinancings?.[p];
            const irr = pf?.leveredIRR;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}{irr !== null && irr !== undefined ? <span style={{fontSize:9,opacity:0.8,marginInlineStart:4}}>{(irr*100).toFixed(1)}%</span> : ""}
            </button>;
          })}
          {isSinglePhase && (
            <select onChange={e => { if (e.target.value) { copyFromPhase(e.target.value); e.target.value = ""; } }} style={{padding:"5px 10px",fontSize:10,borderRadius:6,border:"1px solid #93c5fd",background:"#eff6ff",color:"#1e40af",cursor:"pointer",marginInlineStart:"auto"}}>
              <option value="">{ar?"📋 نسخ من...":"📋 Copy from..."}</option>
              {(project.phases||[]).filter(p=>p.name!==singlePhaseName).map(p=>
                <option key={p.name} value={p.name}>{p.name}</option>
              )}
            </select>
          )}
          {isFiltered && !isSinglePhase && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Warning: settings propagation */}
    {hasPhases && !isSinglePhase && (
      <div style={{background:"#fffbeb",borderRadius:8,border:"1px solid #fde68a",padding:"8px 14px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>⚠</span>
        {isFiltered
          ? (ar ? `أي تعديل سينطبق على: ${activePh.join("، ")}` : `Changes apply to: ${activePh.join(", ")}`)
          : (ar ? "أي تعديل هنا سينتشر في جميع المراحل" : "Changes here apply to ALL phases")}
      </div>
    )}
    {/* Single phase info */}
    {isSinglePhase && (
      <div style={{background:"#eff6ff",borderRadius:8,border:"1px solid #bfdbfe",padding:"10px 16px",marginBottom:12,fontSize:12,color:"#1e40af"}}>
        <strong>{singlePhaseName}</strong> — {ar?"إعدادات تمويل مستقلة":"Independent Financing Settings"}
        {f && f.devCostInclLand > 0 && <span style={{marginInlineStart:12,color:"var(--text-secondary)"}}>DevCost: {fmtM(f.devCostInclLand)} · Debt: {fmtM(f.maxDebt)} · Equity: {fmtM(f.totalEquity)}</span>}
      </div>
    )}

    {/* ═══ FINANCING KPI STRIP ═══ */}
    {f && f.totalDebt > 0 && (() => {
      const dscrArr = f.dscr ? f.dscr.filter(v => v !== null && v > 0) : [];
      const avgD = dscrArr.length > 0 ? dscrArr.reduce((a,b) => a+b, 0) / dscrArr.length : null;
      const minD = dscrArr.length > 0 ? Math.min(...dscrArr) : null;
      const effLTV = f.devCostInclLand > 0 ? (f.totalDebt / f.devCostInclLand) * 100 : 0;
      const costOfDebt = cfg.financeRate || 0;
      const kpis = [
        { label: ar ? "إجمالي الدين" : "Total Debt", value: fmtM(f.totalDebt), color: "#1a1d23" },
        { label: ar ? "إجمالي الملكية" : "Total Equity", value: fmtM(f.totalEquity), color: "#1a1d23" },
        { label: ar ? "LTV الفعلي" : "Effective LTV", value: effLTV.toFixed(0) + "%", color: getMetricColor("LTV", effLTV) },
        { label: ar ? "متوسط DSCR" : "Avg DSCR", value: avgD ? avgD.toFixed(2) + "x" : "—", color: getMetricColor("DSCR", avgD), sub: minD ? (ar ? "أدنى: " : "Min: ") + minD.toFixed(2) + "x" : null },
        { label: ar ? "تكلفة الدين" : "Cost of Debt", value: costOfDebt + "%", color: "#1a1d23" },
      ];
      return <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {kpis.map((k,i) => <div key={i} style={{flex:"1 1 120px",minWidth:110,background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"10px 14px",boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>
          <div style={{fontSize:9,color:"var(--text-secondary)",fontWeight:500,marginBottom:4,textTransform:"uppercase",letterSpacing:0.3}}>{k.label}</div>
          <div style={{fontSize:18,fontWeight:700,color:k.color,fontVariantNumeric:"tabular-nums"}}>{k.value}</div>
          {k.sub && <div style={{fontSize:9,color:getMetricColor("DSCR",minD),marginTop:2,fontWeight:600}}>{k.sub}</div>}
        </div>)}
      </div>;
    })()}

    {/* ═══ FINANCIAL STRUCTURE SETTINGS ═══ */}
    {(() => {
        const isHybridMode = cfg.finMode === "hybrid";
        const isIncomeFund = cfg.finMode === "incomeFund";
        const hasDbt = cfg.finMode !== "self" && cfg.finMode !== "hybrid" && !isIncomeFund;
        const hasFundDebt = isHybridMode && cfg.debtAllowed;
        const hasEq = cfg.finMode !== "self" && cfg.finMode !== "bank100";
        const isFundMode = cfg.finMode === "fund" || isHybridMode || isIncomeFund;
        const notHold = !isIncomeFund && (cfg.exitStrategy||"sale") !== "hold";
        // Accordion section header helper
        const AH = ({id, color, label, summary, visible}) => {
          if (visible === false) return null;
          const open = cfgOpen(id);
          return <div onClick={()=>cfgToggle(id)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:open?"#fff":"#fafbfc",userSelect:"none",transition:"all 0.2s"}}>
            <span style={{fontSize:12,fontWeight:600,color:open?color:"var(--text-primary)",flex:1,transition:"color 0.2s"}}>{label}</span>
            {!open && summary && <span style={{fontSize:10,color:"var(--text-tertiary)",fontWeight:500,maxWidth:180,textAlign:"end",lineHeight:1.2}}>{summary}</span>}
            <span style={{fontSize:10,color:"var(--text-tertiary)",transition:"transform 0.25s ease",transform:open?"rotate(0)":"rotate(-90deg)",display:"inline-block"}}>{open?"▼":"▶"}</span>
          </div>;
        };
        const AB = ({id, children, visible}) => {
          if (visible === false || !cfgOpen(id)) return null;
          return <div style={{padding:"8px 14px 14px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6,background:"var(--surface-card)",borderTop:"1px solid #f0f1f5",animation:"zanSlide 0.15s ease"}}>{children}</div>;
        };
        const g2 = {display:"contents"};
        const g3 = {display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:6,gridColumn:"1/-1"};
        // Section card wrapper with color accent
        const SecWrap = ({children, visible, color}) => {
          if (visible === false) return null;
          return <div style={{borderRadius:"var(--radius-lg)",border:`0.5px solid ${color||"var(--border-default)"}40`,borderTop:`3px solid ${color||"var(--border-default)"}`,overflow:"hidden",background:"var(--surface-hover)",transition:"border-color 0.2s"}}>{children}</div>;
        };
        return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:18}}>
        {/* ── HYBRID MODE: Visual separator header ── */}
        {isHybridMode && <div style={{gridColumn:"1/-1",background:"linear-gradient(135deg,#ecfdf5,#f0fdf4)",borderRadius:10,border:"1px solid #86efac",padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🔀</span>
          <span style={{fontWeight:700,fontSize:13,color:"#166534"}}>{ar?"وضع مختلط: تمويل مؤسسي + صندوق استثماري":"Hybrid: Institutional Financing + Investment Fund"}</span>
          <span style={{fontSize:10,color:"#059669",background:"#d1fae5",borderRadius:4,padding:"2px 8px",fontWeight:600}}>{cfg.govFinancingPct||70}% {ar?"تمويل":"Financing"} + {100-(cfg.govFinancingPct||70)}% {ar?"صندوق":"Fund"}</span>
        </div>}

        {/* ── SECTION: FINANCING MODE (always visible, compact) ── */}
        <div className="z-card" style={{padding:"12px 14px",gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap"}}>{ar?"آلية التمويل":"Financing Mode"}</span>
          <select value={cfg.finMode} onChange={e=>{const v=e.target.value;const wasB100=cfg.finMode==="bank100";const extras=v==="bank100"?{debtAllowed:true,maxLtvPct:100}:v==="hybrid"?{debtAllowed:true,govFinancingPct:cfg.govFinancingPct||70,govBeneficiary:cfg.govBeneficiary||"project"}:v==="incomeFund"?{exitStrategy:"hold",maxLtvPct:50,debtAllowed:true}:{};const bank100Reset=wasB100&&v!=="bank100"?{maxLtvPct:70}:{};const graceReset=v!=="fund"&&v!=="hybrid"&&v!=="incomeFund"&&cfg.graceBasis==="fundStart"?{graceBasis:"cod"}:{};upCfg({finMode:v,...extras,...bank100Reset,...graceReset});}} className="z-input z-select" style={{minWidth:160,maxWidth:240,position:"relative",zIndex:10}}>
            <option value="self">{ar?"تمويل ذاتي":"Self-Funded"}</option>
            <option value="bank100">{ar?"بنكي 100%":"100% Bank Debt"}</option>
            <option value="debt">{ar?"دين + ملكية":"Debt + Equity"}</option>
            <option value="fund">{ar?"صندوق (مطور/مستثمر)":"Fund (Developer/Investor)"}</option>
            <option value="incomeFund">{ar?"صندوق مدر للدخل":"Income Fund"}</option>
            <option value="hybrid">{ar?"مختلط (صندوق + تمويل)":"Hybrid (Fund + Financing)"}</option>
          </select>
          <HelpLink contentKey="financingMode" lang={lang} onOpen={setEduModal} />
        </div>

        {/* ── HYBRID: GROUP HEADER — Financing Side ── */}
        {isHybridMode && <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,padding:"8px 0 2px"}}>
          <div style={{width:4,height:20,borderRadius:2,background:"#059669"}} />
          <span style={{fontSize:12,fontWeight:800,color:"#059669",letterSpacing:0.3}}>{ar?"① إعدادات التمويل":"① FINANCING SETTINGS"}</span>
          <span style={{fontSize:10,color:"#6b7280",fontWeight:500}}>({cfg.govFinancingPct||70}% {ar?"من تكلفة المشروع — شروط القرض":"of project cost — loan terms"})</span>
          <div style={{flex:1,height:1,background:"#d1fae5"}} />
        </div>}

        {/* ── HYBRID FINANCING TERMS (appears first in hybrid mode) ── */}
        <SecWrap visible={isHybridMode} color="#059669">
        <AH id="govFin" color="#059669" label={ar?"شروط التمويل":"Financing Terms"} summary={isHybridMode ? `${cfg.govFinancingPct||70}% · ${cfg.govFinanceRate||3}% · ${cfg.govLoanTenor||15}yr` : ""} visible={isHybridMode} />
        <AB id="govFin" visible={isHybridMode}>{(() => {
          return <>
            <div style={g3}>
              <FL label={ar?"نسبة التمويل (%)":"Financing %"} tip="نسبة تكلفة المشروع المموّلة من جهة التمويل (بنك، حكومة، مؤسسة). الباقي يموّله الصندوق (GP/LP)\nPercentage of project cost covered by financing (bank, government, institution). Remainder funded by fund (GP/LP)" hint={dh("govFinancingPct")}>
                <Inp type="number" value={cfg.govFinancingPct??70} onChange={v=>upCfg({govFinancingPct:v})} min={0} max={100} step={5} />
              </FL>
              <FL label={ar?"القرض لصالح":"Loan Beneficiary"} tip="المشروع (SPV): الدين على مستوى الشركة، خدمة الدين تُخصم قبل التوزيعات\nالمطور: المطور يقترض شخصياً ويدخل الصندوق بالمبلغ المقترض\n\nProject (SPV): Debt at entity level, DS deducted before distributions\nDeveloper: Developer borrows personally and enters fund with borrowed amount">
                <select className="z-input z-select" value={cfg.govBeneficiary||"project"} onChange={e=>upCfg({govBeneficiary:e.target.value})} style={{minWidth:140}}>
                  <option value="project">{ar?"المشروع (SPV)":"Project (SPV)"}</option>
                  <option value="gp">{ar?"المطور شخصياً":"Developer (Personal)"}</option>
                </select>
              </FL>
              <FL label={ar?"سعر الفائدة (%)":"Rate %"} tip="سعر الفائدة على التمويل — يختلف حسب الجهة المموّلة\nFinancing interest rate — varies by lender" hint={dh("govFinanceRate")}>
                <Inp type="number" value={cfg.govFinanceRate??3} onChange={v=>upCfg({govFinanceRate:v})} step={0.5} />
              </FL>
            </div>
            <div style={g3}>
              <FL label={ar?"مدة القرض (سنوات)":"Tenor (years)"} tip="مدة القرض الإجمالية بما فيها فترة السماح\nTotal loan duration including grace period" hint={dh("govLoanTenor")}>
                <Inp type="number" value={cfg.govLoanTenor??15} onChange={v=>upCfg({govLoanTenor:v})} min={1} max={50} />
              </FL>
              <FL label={ar?"فترة السماح (سنوات)":"Grace (years)"} tip="فترة السماح قبل بدء سداد الأصل. خلالها يُدفع الفائدة فقط\nGrace period before principal repayment begins. Interest-only during this period" hint={dh("govGrace")}>
                <Inp type="number" value={cfg.govGrace??5} onChange={v=>upCfg({govGrace:v})} min={0} max={30} />
              </FL>
              <FL label={ar?"رسوم مقدمة (%)":"Upfront Fee %"} tip="رسوم لمرة واحدة على التمويل\nOne-time fee on financing" hint={dh("govUpfrontFeePct")}>
                <Inp type="number" value={cfg.govUpfrontFeePct??0} onChange={v=>upCfg({govUpfrontFeePct:v})} step={0.25} />
              </FL>
            </div>
            <div style={g3}>
              <FL label={ar?"نوع السداد":"Repayment Type"} tip="أقساط متساوية: سداد الأصل بالتساوي على مدة السداد\nدفعة واحدة: الأصل كامل في نهاية المدة\n\nAmortizing: equal principal payments over repayment period\nBullet: full principal at maturity">
                <Drp lang={lang} value={cfg.govRepaymentType||"amortizing"} onChange={v=>upCfg({govRepaymentType:v})} options={[{value:"amortizing",en:"Amortizing (default)",ar:"أقساط متساوية (تلقائي)"},{value:"bullet",en:"Bullet (lump sum)",ar:"دفعة واحدة"}]} />
              </FL>
              <FL label={ar?"أساس فترة السماح":"Grace Basis"} tip="متى تبدأ فترة السماح؟\nإتمام البناء: من نهاية آخر مرحلة بناء\nأول سحب: من أول سحب فعلي\nبداية الصندوق: من سنة تأسيس الصندوق\n\nWhen does grace period start?\nCOD: from end of last construction phase\nFirst Draw: from first actual drawdown\nFund Start: from fund establishment year">
                <Drp lang={lang} value={cfg.graceBasis||"cod"} onChange={v=>upCfg({graceBasis:v})} options={[{value:"cod",en:"COD - Completion (default)",ar:"إتمام البناء (تلقائي)"},{value:"firstDraw",en:"First Draw",ar:"أول سحب"},{value:"fundStart",en:"Fund Start",ar:"بداية الصندوق"}]} />
              </FL>
              <FL label={ar?"أولوية السحب":"Draw Order"} tip={ar?"تحدد كيف يتم سحب التمويل وأموال الصندوق:\n\nالتمويل أولاً (تلقائي): استنفاد كامل التمويل المؤسسي (الأرخص) قبل طلب أموال الصندوق — يؤخر طلبات رأس المال ويحسّن IRR\n\nمتزامن: كل سنة يُسحب تمويل + ملكية بنفس النسبة":"Controls how financing and fund equity are drawn:\n\nFinancing First (default): exhaust all institutional financing (cheaper) before calling fund equity — delays capital calls and boosts IRR\n\nPro-Rata: financing + equity drawn proportionally each year"}>
                <Drp lang={lang} value={cfg.hybridDrawOrder||"finFirst"} onChange={v=>upCfg({hybridDrawOrder:v})} options={[{value:"finFirst",en:"Financing First (default)",ar:"التمويل أولاً (تلقائي)"},{value:"prorata",en:"Pro-Rata",ar:"متزامن"}]} />
              </FL>
            </div>
            <div style={g3}>
              <FL label={ar?"طريقة السحب":"Tranche Mode"} tip={ar?"كتلة واحدة: كل التمويل ككتلة واحدة\nلكل سحبة: كل سحبة شريحة منفصلة بجدول خاص":"Single: all financing as one block\nPer Draw: each drawdown as separate tranche"}>
                <Drp lang={lang} value={cfg.debtTrancheMode||"single"} onChange={v=>upCfg({debtTrancheMode:v})} options={[{value:"single",en:"Single Block (default)",ar:"كتلة واحدة (تلقائي)"},{value:"perDraw",en:"Per Drawdown",ar:"لكل سحبة"}]} />
              </FL>
              <FL label={ar?"رسملة فوائد البناء؟":"Capitalize IDC?"} tip={ar?"إضافة فوائد فترة البناء إلى تكلفة المشروع. يزيد الـ Equity المطلوب لكن يعكس التكلفة الحقيقية\nمتى تستخدمها؟ لما تبي تعرف التكلفة الحقيقية الكاملة":"Add construction-period interest to project cost. Increases equity needed but reflects true cost\nUse when you want to see the all-in project cost"}>
                <Drp lang={lang} value={cfg.capitalizeIDC?"Y":"N"} onChange={v=>upCfg({capitalizeIDC:v==="Y"})} options={["Y","N"]} />
              </FL>
              <div />
            </div>
            {cfg.capitalizeIDC && financing?.capitalizedFinCosts > 0 && <div style={{padding:"6px 10px",background:"#ecfdf5",borderRadius:6,border:"1px solid #a7f3d0",fontSize:10,color:"#065f46",marginTop:-4,gridColumn:"1/-1"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span>{ar?"فوائد أثناء البناء (IDC)":"Interest During Construction"}</span>
                <span style={{fontWeight:600}}>{fmt(financing.estimatedIDC)} {cur}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span>{ar?"رسوم مقدمة":"Upfront Fees"}</span>
                <span style={{fontWeight:600}}>{fmt(financing.estimatedUpfrontFees)} {cur}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #a7f3d0",paddingTop:2,marginTop:2}}>
                <span style={{fontWeight:700}}>{ar?"إجمالي مُرسمل":"Total Capitalized"}</span>
                <span style={{fontWeight:700}}>{fmt(financing.capitalizedFinCosts)} {cur}</span>
              </div>
            </div>}
            {/* Hybrid summary */}
            {financing && financing.isHybrid && <div style={{marginTop:8,padding:"8px 12px",background:"var(--surface-sunken)",borderRadius:8,fontSize:11,color:"var(--text-secondary)"}}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                <span>{ar?"مبلغ التمويل":"Financing Amount"}: <b>{fmtM(financing.govLoanAmount)}</b></span>
                <span>{ar?"حصة الصندوق":"Fund Portion"}: <b>{fmtM(financing.fundPortionCost)}</b></span>
                {financing.govBeneficiary === "gp" && <span style={{color:"#d97706"}}>{ar?"⚠ القرض على المطور شخصياً":"⚠ Personal loan to developer"}</span>}
              </div>
            </div>}
          </>;
        })()}</AB>
        </SecWrap>

        {/* ── HYBRID: GROUP HEADER — Fund Side ── */}
        {isHybridMode && <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,padding:"8px 0 2px"}}>
          <div style={{width:4,height:20,borderRadius:2,background:"#7c3aed"}} />
          <span style={{fontSize:12,fontWeight:800,color:"#7c3aed",letterSpacing:0.3}}>{ar?"② إعدادات الصندوق":"② FUND SETTINGS"}</span>
          <span style={{fontSize:10,color:"#6b7280",fontWeight:500}}>({100-(cfg.govFinancingPct||70)}% {ar?"من تكلفة المشروع — هيكل وملكية ورسوم وتوزيعات":"of project cost — structure, equity, fees, distributions"})</span>
          <div style={{flex:1,height:1,background:"#ede9fe"}} />
        </div>}

        {/* ── SECTION 1: FUND STRUCTURE (Fund mode only) ── */}
        <SecWrap visible={isFundMode} color="#16a34a">
        <AH id="fund" color="#16a34a" label={ar?"هيكل الصندوق":"Fund Structure"} summary={isFundMode ? `${({fund:ar?"صندوق":"Fund",direct:ar?"مباشر":"Direct",spv:"SPV"})[cfg.vehicleType]||""}` : ""} visible={isFundMode} />
        <AB id="fund" visible={isFundMode}>
          <div style={g2}>
            <FL label={ar?"الهيكل القانوني":"Vehicle"} tip={ar?"صندوق: وعاء استثماري منظم من هيئة السوق المالية. فيه اشتراك وإدارة ومراجع — الأكثر حوكمة وتنظيماً\nمباشر: المطور والمستثمر يدخلون مباشرة بعقد مشاركة بدون وعاء رسمي — أبسط وأقل رسوم\nSPV: شركة ذات غرض خاص تُنشأ للمشروع فقط — تعزل المخاطر عن الأطراف":"Fund: CMA-regulated vehicle with subscription, management, auditor — highest governance\nDirect: Developer and investor enter via partnership agreement — simpler, fewer fees\nSPV: Special Purpose Vehicle created for this project only — isolates risk"}><Drp lang={lang} value={cfg.vehicleType} onChange={v=>{const reset=v!=="fund"?{subscriptionFeePct:0,structuringFeePct:0,structuringFeeCap:0,preEstablishmentFee:0,spvFee:0,auditorFeeAnnual:0,mgmtFeeCapAnnual:0,custodyFeeAnnual:0}:{};upCfg({vehicleType:v,...reset});}} options={[{value:"fund",en:"Fund - Regulated (default)",ar:"صندوق - منظم (تلقائي)"},{value:"direct",en:"Direct (Partnership)",ar:"مباشر (شراكة)"},{value:"spv",en:"SPV (Ring-fenced)",ar:"SPV (معزول)"}]} /></FL>
            {cfg.vehicleType==="fund"&&<FL label={ar?"اسم الصندوق":"Fund Name"} tip={ar?"الاسم القانوني أو التشغيلي للصندوق. للعرض والتقارير فقط":"Legal or operating fund name. For display and reports only"}><Inp value={cfg.fundName} onChange={v=>upCfg({fundName:v})} /></FL>}
          </div>
          <div style={g2}>
            {(() => {
              const sy = project.startYear || 2026;
              let firstCapexYr = sy;
              if (pc?.capex) {
                for (let y = 0; y < (project.horizon||20); y++) {
                  if (pc.capex[y] > 0) { firstCapexYr = sy + y; break; }
                }
              }
              const autoFundStart = firstCapexYr;
              const displayVal = (cfg.fundStartYear || 0) > 0 ? cfg.fundStartYear : autoFundStart;
              const isAuto = displayVal === autoFundStart;
              return <div>
                <FL label={ar?"سنة بداية الصندوق":"Fund Start Year"} tip={ar?"سنة بدء جمع رأس المال وتسجيل الصندوق. غالباً قبل البناء بسنة":"Year capital raising begins. Usually 1 year before construction."}>
                  <Inp type="number" value={displayVal} onChange={v=>upCfg({fundStartYear:v===autoFundStart?0:v})} />
                </FL>
                <div style={{marginTop:-6,marginBottom:4,fontSize:10,color:"var(--text-secondary)",paddingInlineStart:2}}>
                  {ar?`التلقائي: ${autoFundStart} (سنة بداية البناء)`:`Auto: ${autoFundStart} (construction start year)`}
                  {isAuto && <span style={{color:"#16a34a",marginInlineStart:6}}>✓</span>}
                </div>
              </div>;
            })()}
            {false && (<FL label={ar?"المطور = مدير الصندوق؟":"Developer = Fund Manager?"} tip={ar?"نعم: المطور يدير الصندوق ويستلم كل الرسوم (تطوير + إدارة + هيكلة)\nلا: شركة مالية مستقلة تدير الصندوق. المطور يأخذ رسوم التطوير فقط":"Yes: Developer manages the fund and receives all fees\nNo: Separate financial company manages. Developer gets dev fee only"}>
              <Drp lang={lang} value={cfg.gpIsFundManager===false?"N":"Y"} onChange={v=>upCfg({gpIsFundManager:v==="Y"})} options={[{value:"Y",en:"Yes (Developer = Manager)",ar:"نعم (المطور = المدير)"},{value:"N",en:"No (Separate Manager)",ar:"لا (مدير مستقل)"}]} />
            </FL>)}
          </div>
        </AB>
        </SecWrap>

        {/* ── SECTION 2: LAND & EQUITY ── */}
        <SecWrap visible={hasEq} color="#8b5cf6">
        <AH id="land" color="#8b5cf6" label={ar?"الأرض والملكية":"Land & Equity"} summary={hasEq ? `${cfg.landCapitalize?(ar?"مرسملة":"Cap"):""} · Dev ${cfg.gpEquityManual||"auto"}` : ""} visible={hasEq} />
        <AB id="land" visible={hasEq}>
          {(project.landType==="lease"||project.landType==="bot")&&<FL label={ar?"رسملة حق الانتفاع؟":"Capitalize Leasehold?"} tip={ar?"الأرض مؤجرة وليست مملوكة — لكن حق الانتفاع له قيمة مالية. رسملته تعني تحويل هذي القيمة إلى حصة Equity في الصندوق.\nمثال: أرض 50,000 م² × 800 ري��ل = 40 مليون تُحسب كمساهمة عينية لصاحب الأرض":"The land is leased, not owned — but the leasehold right has financial value. Capitalizing it converts this value into an equity stake in the fund.\nExample: 50,000 sqm × SAR 800 = SAR 40M counted as in-kind equity contribution"}>
            <Drp lang={lang} value={cfg.landCapitalize?"Y":"N"} onChange={v=>upCfg({landCapitalize:v==="Y"})} options={["Y","N"]} />
          </FL>}
          {cfg.landCapitalize&&(project.landType==="lease"||project.landType==="bot")&&<>
            <div style={g2}>
              <FL label={ar?"سعر/م²":"Rate/sqm"} tip="سعر تقييم الأرض للمتر المربع عند رسملتها ضمن حقوق الملكية (Equity). يُفضّل أن يكون التقييم محافظاً\nLand value per sqm for equity capitalization. Should be based on conservative appraisal" hint={`= ${fmt((project.landArea||0)*(cfg.landCapRate||1000))} ${cur} · ${dh("landCapRate")}`}><Inp type="number" value={cfg.landCapRate} onChange={v=>upCfg({landCapRate:v})} /></FL>
              <FL label={ar?"رسملة حق الانتفاع لصالح":"Leasehold Cap Credit To"} tip={ar?"من يُحسب له حق الانتفاع كحصة Equity: المطور أو المستثمر أو مقسمة":"Who gets the leasehold capitalization as equity credit: Developer, Investor, or split 50/50"}><Drp lang={lang} value={cfg.landCapTo||"gp"} onChange={v=>upCfg({landCapTo:v})} options={[{value:"gp",en:"Developer (default)",ar:"المطور (تلقائي)"},{value:"lp",en:"Investor",ar:"المستثمر"},{value:"split",en:"Split 50/50",ar:"مقسمة 50/50"}]} /></FL>
            </div>
            {project.landType==="lease"&&<FL label={ar?"من يدفع إيجار الأرض؟":"Who Pays Land Rent?"} tip={ar?"بعد رسملة حق الانتفاع: تلقائي = اللي انحسب له حق الانتفاع يدفع الإيجار. المشروع = الكل يتحمل. أو اختر يدوياً":"After leasehold cap: Auto = whoever got the cap credit pays rent. Project = all bear cost. Or choose manually"}><Drp lang={lang} value={cfg.landRentPaidBy||"auto"} onChange={v=>upCfg({landRentPaidBy:v})} options={[{value:"auto",en:"Auto (cap credit owner)",ar:"تلقائي (صاحب حق الانتفاع)"},{value:"project",en:"Project (all bear cost)",ar:"المشروع (الكل يتحمل)"},{value:"gp",en:"Developer",ar:"المطور"},{value:"lp",en:"Investor",ar:"المستثمر"}]} /></FL>}
          </>}

          {/* ── GP Investment Sources ── */}
          {isFundMode && <>
            <div style={{gridColumn:"1/-1",marginTop:4,marginBottom:2,fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:0.3,textTransform:"uppercase"}}>{ar?"استثمار المطور":"Developer Investment"}</div>

            {/* Source 2: Dev Fee as Investment */}
            <FL label={ar?"إدخال أتعاب التطوير كاستثمار؟":"Invest Developer Fee as Equity?"} tip={ar?"المطور يعيد أتعاب التطوير للصندوق كاستثمار بدل استلامها نقداً":"Developer reinvests dev fee into fund as equity instead of taking cash"}>
              <Drp lang={lang} value={cfg.gpInvestDevFee?"Y":"N"} onChange={v=>upCfg({gpInvestDevFee:v==="Y"})} options={["Y","N"]} />
            </FL>
            {cfg.gpInvestDevFee && <div style={g2}>
              <FL label={ar?"نسبة الإدخال %":"Invest %"} hint={`${ar?"أتعاب التطوير":"Developer Fee"} = ${fmtM(f?.gpEquityBreakdown?.devFeeTotal||0)}`} tip={ar?"نسبة أتعاب التطوير المُعاد استثمارها. 100% = كامل الأتعاب":"% of dev fee reinvested. 100% = all fees"}>
                <Inp type="number" value={cfg.gpDevFeeInvestPct??100} onChange={v=>upCfg({gpDevFeeInvestPct:v})} />
              </FL>
              <div style={{display:"flex",alignItems:"center",fontSize:11,color:"#16a34a",fontWeight:600,padding:"8px 0"}}>= {fmt((f?.gpEquityBreakdown?.devFeeTotal||0)*((cfg.gpDevFeeInvestPct??100)/100))} {cur}</div>
            </div>}

            {/* Source 3: Cash Investment */}
            <FL label={ar?"استثمار نقدي إضافي؟":"Additional Cash Investment?"} tip={ar?"المطور يضيف مبلغ نقدي من جيبه كاستثمار بالصندوق":"Developer adds cash from own pocket as fund investment"}>
              <Drp lang={lang} value={cfg.gpCashInvest?"Y":"N"} onChange={v=>upCfg({gpCashInvest:v==="Y"})} options={["Y","N"]} />
            </FL>
            {cfg.gpCashInvest && <FL label={ar?"المبلغ":"Amount (SAR)"} tip={ar?"المبلغ النقدي الإضافي":"Cash investment amount"}>
              <Inp type="number" value={cfg.gpCashInvestAmount} onChange={v=>upCfg({gpCashInvestAmount:v})} />
            </FL>}

            {/* Live Summary */}
            {f && <div style={{gridColumn:"1/-1",marginTop:4,padding:"8px 12px",background:"var(--surface-table-header)",borderRadius:6,border:"0.5px solid var(--border-default)",fontSize:11}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"var(--text-secondary)"}}>{isHybridMode?(ar?"إجمالي Equity الصندوق":"Fund Equity"):(ar?"إجمالي Equity":"Total Equity")}</span>
                <span style={{fontWeight:700}}>{fmt(f.totalEquity)} {cur}</span>
              </div>
              {isHybridMode && f.fundPortionCost && <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:"#059669",fontSize:10}}>{ar?`حصة الصندوق (${100-(cfg.govFinancingPct||70)}% من المشروع)`:`Fund portion (${100-(cfg.govFinancingPct||70)}% of project)`}</span>
                <span style={{color:"#059669",fontSize:10,fontWeight:600}}>{fmtM(f.fundPortionCost)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.landCap > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"رسملة حق الانتفاع":"Leasehold Cap (Developer)"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.landCap)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.partnerLand > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"حصة الشريك":"Partner Land"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.partnerLand)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.devFee > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"أتعاب تطوير":"Developer Fee Invested"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.devFee)} {cur}</span>
              </div>}
              {f.gpEquityBreakdown?.cash > 0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"var(--text-secondary)",paddingInlineStart:8}}>↳ {ar?"نقدي":"Cash"}</span>
                <span style={{color:"#8b5cf6"}}>{fmt(f.gpEquityBreakdown.cash)} {cur}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #e5e7ec",paddingTop:4,marginTop:4}}>
                <span style={{fontWeight:600,color:"#8b5cf6"}}>Developer ({fmtPct(f.gpPct*100)})</span>
                <span style={{fontWeight:700,color:"#8b5cf6"}}>{fmt(f.gpEquity)} {cur}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,color:"#2563eb"}}>Investor ({fmtPct(f.lpPct*100)})</span>
                <span style={{fontWeight:700,color:"#2563eb"}}>{fmt(f.lpEquity)} {cur}</span>
              </div>
            </div>}
          </>}

          {/* Non-fund modes: just show GP equity */}
          {!isFundMode && hasEq && <div style={g2}>
            <FL label={ar?"مساهمة المطور":"Developer Equity"} hint="0=auto" tip={ar?"مساهمة المطور النقدية. عادة 100% في وضع الدين":"Developer equity contribution. Usually 100% in debt mode"}><Inp type="number" value={cfg.gpEquityManual} onChange={v=>upCfg({gpEquityManual:v})} /></FL>
          </div>}
        </AB>
        </SecWrap>

        {/* ── SECTION 3: DEBT TERMS (fund-level debt for hybrid, or standard debt) ── */}
        <SecWrap visible={hasDbt || isHybridMode} color="#2563eb">
        <AH id="debt" color="#2563eb" label={isHybridMode?(ar?"قرض الصندوق (اختياري)":"Fund Debt (optional)"):(ar?"شروط القرض":"Debt Terms")} summary={(hasDbt || hasFundDebt) && (cfg.debtAllowed || cfg.finMode==="bank100") ? `${cfg.finMode!=="bank100"?(cfg.maxLtvPct||70)+"% LTV · ":""}${cfg.financeRate||6.5}% · ${cfg.loanTenor||7}yr` : isHybridMode && !cfg.debtAllowed ? (ar?"معطل":"Disabled") : ""} visible={hasDbt || isHybridMode} />
        <AB id="debt" visible={hasDbt || isHybridMode}>{(() => {
          const showDebtFields = cfg.debtAllowed || cfg.finMode === "bank100";
          return <>
            {isHybridMode && <div style={{gridColumn:"1/-1",padding:"6px 10px",background:"#eff6ff",borderRadius:6,border:"1px solid #bfdbfe",fontSize:10,color:"#1e40af",marginBottom:4}}>
              {ar?`قرض بنكي إضافي على حصة الصندوق (${100-(cfg.govFinancingPct||70)}%). مستقل عن التمويل الرئيسي.`:`Optional bank debt on the fund portion (${100-(cfg.govFinancingPct||70)}%). Independent of the primary financing.`}
            </div>}
            {cfg.finMode !== "bank100" && (
              <FL label={isHybridMode?(ar?"قرض بنكي إضافي؟":"Additional Bank Debt?"):(ar?"هل الدين مسموح؟":"Debt Allowed")} tip={isHybridMode?(ar?"تفعيل قرض بنكي إضافي على حصة الصندوق فقط. يُضاف فوق التمويل الرئيسي":"Enable additional bank debt on the fund portion only. Added on top of primary financing"):"يحدد هذا الخيار ما إذا كان النموذج يسمح بتمويل بنكي. عند إيقافه يصبح المشروع ممولاً بالكامل من حقوق الملكية (Equity)\nToggles whether bank debt is allowed. If off, the project becomes fully equity-funded"}>
                <Drp lang={lang} value={cfg.debtAllowed?"Y":"N"} onChange={v=>upCfg({debtAllowed:v==="Y"})} options={["Y","N"]} />
              </FL>
            )}
            {showDebtFields && <>
              <div style={g2}>
                {cfg.finMode!=="bank100"&&<FL label={ar?"نسبة التمويل %":"LTV %"} tip="نسبة القرض إلى القيمة (LTV). في السعودية تكون غالباً 50%-70%\nLoan-to-Value ratio (LTV). Saudi market: 50%-70%" hint={dh("maxLtvPct")} error={cfg.maxLtvPct>100?(ar?"الحد الأقصى 100%":"Max 100%"):cfg.maxLtvPct<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><Inp type="number" value={cfg.maxLtvPct} onChange={v=>upCfg({maxLtvPct:v})} /></FL>}
                <FL label={ar?"معدل %":"Rate %"} tip="معدل تكلفة التمويل السنوي. في السعودية 5-8%\nAnnual financing cost rate. Saudi: 5-8%" hint={dh("financeRate")} error={cfg.financeRate>30?(ar?"الحد الأقصى 30%":"Max 30%"):cfg.financeRate<0?(ar?"لا يمكن أن يكون سالباً":"Cannot be negative"):null}><Inp type="number" value={cfg.financeRate} onChange={v=>upCfg({financeRate:v})} /></FL>
              </div>
              <div style={g3}>
                <FL label={ar?"مدة القرض":"Tenor"} tip="مدة القرض الكلية شاملة فترة السماح. عادة 7-15 سنة\nTotal loan period including grace. Usually 7-15 years" hint={dh("loanTenor")} error={cfg.loanTenor<1?(ar?"يجب أن تكون سنة واحدة على الأقل":"Must be at least 1 year"):cfg.loanTenor>50?(ar?"الحد الأقصى 50 سنة":"Max 50 years"):null}><Inp type="number" value={cfg.loanTenor} onChange={v=>upCfg({loanTenor:v})} /></FL>
                <FL label={ar?"فترة السماح":"Grace"} tip="فترة دفع الربح فقط بدون أصل الدين. عادة 2-4 سنوات\nInterest-only period, no principal. Usually 2-4 years" hint={dh("debtGrace")} error={cfg.debtGrace>(cfg.loanTenor||7)?(ar?"فترة السماح تتجاوز مدة القرض":"Grace exceeds tenor"):cfg.debtGrace<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><Inp type="number" value={cfg.debtGrace} onChange={v=>upCfg({debtGrace:v})} /></FL>
                <FL label={ar?"بداية السماح":"Grace Basis"} tip={ar?"متى تبدأ فترة السماح: من اكتمال البناء أو أول سحب"+(isFundMode?" أو بداية الصندوق":""):"When grace starts: COD, first drawdown"+(isFundMode?", or fund start year":"")}><select value={cfg.graceBasis||"cod"} onChange={e=>upCfg({graceBasis:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-card)",fontSize:13}}><option value="cod">{ar?"اكتمال البناء (تلقائي)":"COD (default)"}</option><option value="firstDraw">{ar?"أول سحب":"First Drawdown"}</option>{isFundMode&&<option value="fundStart">{ar?"بداية الصندوق":"Fund Start Year"}</option>}</select></FL>
              </div>
              <div style={g2}>
                <FL label={ar?"رسوم %":"Upfront Fee %"} tip="رسوم القرض المقدمة كنسبة من مبلغ التمويل. تُدفع مرة واحدة عند السحب\nUpfront loan fee as percentage of debt amount. Paid once at drawdown" hint={autoHint("upfrontFeePct",ar?"مرة واحدة · عند السحب":"One-time · at drawdown")}><Inp type="number" value={cfg.upfrontFeePct} onChange={v=>upCfg({upfrontFeePct:v})} /></FL>
                <FL label={ar?"سداد":"Repayment"} tip="Amortizing = أقساط دورية تقلل الرصيد. Bullet = سداد الأصل دفعة واحدة بالنهاية\nAmortizing = regular installments. Bullet = principal at end">
                  <Drp lang={lang} value={cfg.repaymentType} onChange={v=>upCfg({repaymentType:v})} options={[{value:"amortizing",en:"Amortizing (default)",ar:"أقساط (تلقائي)"},{value:"bullet",en:"Bullet",ar:"دفعة واحدة"}]} />
                </FL>
                <FL label={ar?"أولوية السحب":"Draw Order"} tip={ar?"تحدد كيف يتم سحب الدين والملكية:\n\nمتزامن: كل سنة يُسحب دين + ملكية بنفس النسبة (تلقائي)\n\nالدين أولاً: استنفاد كامل الدين قبل طلب أموال المستثمرين — يُؤخر طلبات رأس المال ويرفع IRR":"Controls how debt and equity are drawn:\n\nPro-Rata: debt + equity drawn proportionally each year (default)\n\nDebt First: exhaust all debt before calling investor equity — delays capital calls and boosts IRR"}>
                  <Drp lang={lang} value={cfg.capitalCallOrder||"prorata"} onChange={v=>upCfg({capitalCallOrder:v})} options={[{value:"prorata",en:"Pro-Rata (default)",ar:"متزامن (تلقائي)"},{value:"debtFirst",en:"Debt First",ar:"الدين أولاً"}]} />
                </FL>
              </div>
              <FL label={ar?"طريقة السحب":"Tranche Mode"} tip="Single: all debt as one block. Per Draw: each drawdown as separate tranche"><Drp lang={lang} value={cfg.debtTrancheMode||"single"} onChange={v=>upCfg({debtTrancheMode:v})} options={[{value:"single",en:"Single Block (default)",ar:"كتلة واحدة (تلقائي)"},{value:"perDraw",en:"Per Drawdown",ar:"لكل سحبة"}]} /></FL>
              <div style={{gridColumn:"1/-1",marginTop:-2,marginBottom:4}}><HelpLink contentKey="islamicFinance" lang={lang} onOpen={setEduModal} label={ar?"المرابحة والإجارة والتقليدي":"Murabaha vs Ijara vs Conventional"} /></div>
              <div style={{gridColumn:"1/-1",borderTop:"1px solid #f0f1f3",paddingTop:8,marginTop:4}}>
                <FL label={ar?"رسملة تكاليف التمويل أثناء البناء (IDC)":"Capitalize Financing Costs (IDC)"} tip={ar?
`خلال البناء، المشروع ما يولّد دخل — لكن القرض يبدأ يراكم فوائد.

السؤال: من يدفع هالفوائد؟

لا (الوضع الافتراضي):
الفوائد تتراكم وتُدفع من أول دخل تشغيلي بعد البناء.
الـ Equity يغطي تكلفة البناء فقط.

نعم (رسملة):
الفوائد + رسوم البنك خلال البناء تُضاف على تكلفة المشروع.
هذا يرفع الـ Equity المطلوب لأن المبلغ الإضافي لازم يجي من المطور أو المستثمر.

متى تستخدمها؟
• لما تبي تعرف التكلفة الحقيقية الكاملة للمشروع
• لما البنك يطلب إدراج IDC بالدراسة
• لما تقارن بين سيناريوهات تمويل مختلفة`:
`During construction, the project generates no income — but the loan accrues interest.

The question: who pays this interest?

No (default):
Interest accrues and is paid from first operating income after construction.
Equity covers construction cost only.

Yes (capitalize):
Interest + bank fees during construction are added to project cost.
This increases equity needed — the extra amount must come from developer or investor.

When to use:
• To see the true all-in project cost
• When the bank requires IDC in the study
• When comparing different financing scenarios`}>
                  <Drp lang={lang} value={cfg.capitalizeIDC?"Y":"N"} onChange={v=>upCfg({capitalizeIDC:v==="Y"})} options={["Y","N"]} />
                </FL>
                {cfg.capitalizeIDC && f?.capitalizedFinCosts > 0 && <div style={{padding:"6px 10px",background:"#fef9c3",borderRadius:6,border:"1px solid #fde68a",fontSize:10,color:"#92400e",marginTop:-4}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span>{ar?"فوائد أثناء البناء (IDC)":"Interest During Construction"}</span>
                    <span style={{fontWeight:600}}>{fmt(f.estimatedIDC)} {cur}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span>{ar?"رسوم بنك أولية":"Upfront Bank Fees"}</span>
                    <span style={{fontWeight:600}}>{fmt(f.estimatedUpfrontFees)} {cur}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #fde68a",paddingTop:2,marginTop:2}}>
                    <span style={{fontWeight:700}}>{ar?"إجمالي مُرسمل (يُضاف على الـ Equity)":"Total Capitalized (added to Equity)"}</span>
                    <span style={{fontWeight:700}}>{fmt(f.capitalizedFinCosts)} {cur}</span>
                  </div>
                </div>}
              </div>
            </>}
          </>;
        })()}</AB>

        {/* ── (old EXIT, LAND sections moved — see new order above) ── */}
        </SecWrap>

        {/* ── SECTION 4: FEES ── */}
        <SecWrap visible={true} color="#f59e0b">
        <AH id="fees" color="#f59e0b" label={ar?"الرسوم":"Fees"} summary={isFundMode && cfg.vehicleType==="fund" ? (ar?"11 رسم":"11 fees") : `${ar?"رسوم المطور":"Developer Fee"} ${cfg.developerFeePct||12}%`} visible={true} />
        <AB id="fees" visible={true}>{(() => {
          if (isFundMode && cfg.vehicleType==="fund") return <>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"رسوم لمرة واحدة":"One-time"}</div>
            <div style={g3}>
              <FL label={ar?"اكتتاب %":"Subscription %"} tip="رسوم دخول لمرة واحدة عند اكتتاب المستثمر. عادة 1-2% من المبلغ المستثمر\nOne-time entry fee at subscription. Usually 1-2% of invested capital" hint={autoHint("subscriptionFeePct",ar?"مرة واحدة · عند الاكتتاب":"One-time · at subscription")}><Inp type="number" value={cfg.subscriptionFeePct} onChange={v=>upCfg({subscriptionFeePct:v})} /></FL>
              <FL label={ar?"هيكلة %":"Structuring %"} tip="نسبة من تكلفة التطوير تُدفع لمرة واحدة لمدير الصندوق مقابل ترتيب الفرصة ودراسات الجدوى\nOne-time fee for deal sourcing, due diligence, and fund setup" hint={autoHint("structuringFeePct",ar?"مرة واحدة · من تكلفة التطوير":"One-time · % of dev cost")}><Inp type="number" value={cfg.structuringFeePct} onChange={v=>upCfg({structuringFeePct:v})} /></FL>
              <FL label={ar?"سقف الهيكلة":"Structuring Cap"} tip="الحد الأقصى لرسوم الهيكلة. 0 = بدون سقف\nMax structuring fee amount. 0 = no cap" hint={autoHint("structuringFeeCap",ar?"حد أقصى · 0 = بدون سقف":"Max amount · 0 = no cap")}><Inp type="number" value={cfg.structuringFeeCap} onChange={v=>upCfg({structuringFeeCap:v})} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"ما قبل التأسيس":"Pre-Establishment"} tip="مصاريف إعداد مستندات الصندوق وتقديمها لهيئة السوق المالية. تُدفع مرة واحدة بعد الإقفال الأولي\nFund document preparation and CMA filing. One-time after initial closing" hint={autoHint("preEstablishmentFee",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.preEstablishmentFee} onChange={v=>upCfg({preEstablishmentFee:v})} /></FL>
              <FL label={ar?"إنشاء SPV":"SPV Fee"} tip="رسوم تأسيس الشركة ذات الغرض الخاص. تُدفع مرة واحدة عند بدء التأسيس\nSPV incorporation fee. One-time at setup" hint={autoHint("spvFee",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.spvFee} onChange={v=>upCfg({spvFee:v})} /></FL>
              <div />
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8,gridColumn:"1/-1"}} />
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"رسوم سنوية":"Annual"}</div>
            <div style={g2}>
              <FL label={ar?"إدارة %":"Management %"} tip="أتعاب إدارية سنوية من صافي أصول الصندوق (NAV). تُستحق وتسدد بشكل ربع سنوي\nAnnual management fee based on fund NAV. Paid quarterly" hint={autoHint("annualMgmtFeePct",ar?"سنوي · من صافي الأصول":"Annual · based on NAV")}><Inp type="number" value={cfg.annualMgmtFeePct} onChange={v=>upCfg({annualMgmtFeePct:v})} /></FL>
              <FL label={ar?"أساس رسوم الإدارة":"Mgmt Fee Base"} tip="أساس حساب رسوم الإدارة:\n- صافي الأصول (NAV): القيمة الصافية للصندوق\n- CAPEX تراكمي: المبالغ المنفذة فعلياً\n- تكلفة التطوير: إجمالي التكلفة\n- رأس المال: الملكية الإجمالية" hint={ar?"التلقائي: صافي الأصول":"default: NAV"}><Drp lang={lang} value={cfg.mgmtFeeBase||"nav"} onChange={v=>upCfg({mgmtFeeBase:v})} options={[{value:"nav",en:"NAV - Net Asset Value (default)",ar:"صافي قيمة الأصول NAV (تلقائي)"},{value:"devCost",en:"GAV - Total Fund Assets",ar:"إجمالي قيمة الأصول GAV"},{value:"equity",en:"Fund Size (Equity)",ar:"حجم الصندوق (رأس المال)"},{value:"deployed",en:"Deployed CAPEX (Cumulative)",ar:"CAPEX المنفذ (تراكمي)"}]} /></FL>
            </div>
            <div style={g3}>
              <FL label={ar?"سقف الإدارة/سنة":"Mgmt Cap/yr"} tip="الحد الأقصى لرسوم الإدارة سنوياً. 0 = بدون سقف\nMax annual management fee. 0 = no cap" hint={autoHint("mgmtFeeCapAnnual",ar?"حد أقصى سنوي · 0 = بدون سقف":"Max annual · 0 = no cap")}><Inp type="number" value={cfg.mgmtFeeCapAnnual} onChange={v=>upCfg({mgmtFeeCapAnnual:v})} /></FL>
              <FL label={ar?"رسوم الحفظ/سنة":"Custody/yr"} tip="رسوم سنوية لأمين الحفظ. تُدفع نصف سنوي\nAnnual custody fee. Paid semi-annually" hint={autoHint("custodyFeeAnnual",ar?"سنوي · نصف سنوي":"Annual · semi-annual")}><Inp type="number" value={cfg.custodyFeeAnnual} onChange={v=>upCfg({custodyFeeAnnual:v})} /></FL>
              <FL label={ar?"مراجع حسابات/سنة":"Auditor/yr"} tip="أتعاب سنوية لمراجع الحسابات. تُدفع نصف سنوي بعد كل تقييم\nAnnual auditor fee. Paid semi-annually after each valuation" hint={autoHint("auditorFeeAnnual",ar?"سنوي":"Annual")}><Inp type="number" value={cfg.auditorFeeAnnual} onChange={v=>upCfg({auditorFeeAnnual:v})} /></FL>
              <FL label={ar?"أتعاب المشغل %":"Operator Fee %"} tip="أتعاب سنوية لمشغل المشروع. تُحسب كنسبة من حجم الأصول المنفذة. تبدأ بعد انتهاء البناء تلقائياً للمشاريع التأجيرية\nAnnual operator fee as % of completed asset value. Starts after construction. Auto-applied for rental projects" hint={autoHint("operatorFeePct",ar?"سنوي · تأجير فقط":"Annual · rental only")}><Inp type="number" value={cfg.operatorFeePct} onChange={v=>upCfg({operatorFeePct:v})} step={0.01} /></FL>
              <FL label={ar?"سقف المشغل/سنة":"Operator Cap/yr"} tip="الحد الأقصى لأتعاب المشغل سنوياً. 0 = بدون سقف\nMax annual operator fee. 0 = no cap" hint={autoHint("operatorFeeCap",ar?"حد أقصى سنوي":"Max annual")}><Inp type="number" value={cfg.operatorFeeCap} onChange={v=>upCfg({operatorFeeCap:v})} /></FL>
              <FL label={ar?"مصروفات أخرى %":"Misc. Expenses %"} tip="مصروفات متنوعة (تقييم، رقابة شرعية، مجلس إدارة، وغيرها). تُحسب كنسبة من إجمالي الأصول وتُدفع مرة واحدة عند بداية الصندوق\nMiscellaneous expenses (valuation, Sharia, board, etc.). One-time at fund start as % of total assets" hint={autoHint("miscExpensePct",ar?"مرة واحدة":"One-time")}><Inp type="number" value={cfg.miscExpensePct} onChange={v=>upCfg({miscExpensePct:v})} step={0.1} /></FL>
            </div>
            <div style={{borderTop:"1px solid #eef0f4",marginTop:8,paddingTop:8,gridColumn:"1/-1"}} />
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase",marginBottom:8,gridColumn:"1/-1"}}>{ar?"مرتبطة بالبناء":"Construction-linked"}</div>
            <FL label={ar?"رسوم المطور %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية. المدى السوقي: 7%-15% (الوسيط 12%)\nDeveloper fee as % of construction costs. Market range: 7%-15% (median 12%)" hint={autoHint("developerFeePct",ar?"مع مستخلصات البناء · السوق 7%-15%":"With construction draws · Market 7%-15%")}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL>
            <FL label={ar?"أساس احتساب رسوم المطور":"Developer Fee Basis"} tip={ar?"بدون أرض: رسوم التطوير على تكلفة البناء فقط\nمع الأرض: رسوم التطوير على تكلفة البناء + الأرض":"Excl. Land: fee on construction cost only\nIncl. Land: fee on construction + land cost"}><Drp lang={lang} value={cfg.developerFeeBasis||"exclLand"} onChange={v=>upCfg({developerFeeBasis:v})} options={[{value:"exclLand",en:"Development Costs excluding land",ar:"تكاليف التطوير بدون الأرض"},{value:"inclLand",en:"Development Costs including land",ar:"تكاليف التطوير مع الأرض"}]} /></FL>
          </>;
          if (isFundMode) return <><FL label={ar?"رسوم المطور %":"Developer Fee %"} tip="أتعاب المطور كنسبة من التكاليف الإنشائية. المدى السوقي: 7%-15% (الوسيط 12%)\nDeveloper fee as % of construction costs. Market range: 7%-15% (median 12%)" hint={autoHint("developerFeePct",ar?"مع مستخلصات البناء · السوق 7%-15%":"With construction draws · Market 7%-15%")}><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL><FL label={ar?"أساس احتساب رسوم المطور":"Developer Fee Basis"} tip={ar?"بدون أرض: رسوم التطوير على تكلفة البناء فقط\nمع الأرض: رسوم التطوير على تكلفة البناء + الأرض":"Excl. Land: fee on construction cost only\nIncl. Land: fee on construction + land cost"}><Drp lang={lang} value={cfg.developerFeeBasis||"exclLand"} onChange={v=>upCfg({developerFeeBasis:v})} options={[{value:"exclLand",en:"Development Costs excluding land",ar:"تكاليف التطوير بدون الأرض"},{value:"inclLand",en:"Development Costs including land",ar:"تكاليف التطوير مع الأرض"}]} /></FL></>;
          return <><FL label={ar?"رسوم المطور %":"Developer Fee %"} tip="أتعاب المطور كنسبة من CAPEX. المدى السوقي: 7%-15%\nDeveloper fee as % of CAPEX. Market range: 7%-15%"><Inp type="number" value={cfg.developerFeePct} onChange={v=>upCfg({developerFeePct:v})} /></FL><FL label={ar?"أساس احتساب رسوم المطور":"Developer Fee Basis"} tip={ar?"بدون أرض: رسوم التطوير على تكلفة البناء فقط\nمع الأرض: رسوم التطوير على تكلفة البناء + الأرض":"Excl. Land: fee on construction cost only\nIncl. Land: fee on construction + land cost"}><Drp lang={lang} value={cfg.developerFeeBasis||"exclLand"} onChange={v=>upCfg({developerFeeBasis:v})} options={[{value:"exclLand",en:"Development Costs excluding land",ar:"تكاليف التطوير بدون الأرض"},{value:"inclLand",en:"Development Costs including land",ar:"تكاليف التطوير مع الأرض"}]} /></FL></>;
        })()}</AB>
        </SecWrap>

        {/* ── SECTION 5: PROFIT DISTRIBUTION / WATERFALL (Fund mode only) ── */}
        <SecWrap visible={isFundMode} color="#16a34a">
        <AH id="wf" color="#16a34a" label={ar?"توزيع الأرباح":"Profit Distribution"} summary={isFundMode ? `${ar?"العائد المتوقع":"Expected Return"} ${cfg.hurdleIRR||15}% · ${ar?"الحافز":"Incentive"} ${cfg.incentivePct||20}%` : ""} visible={isFundMode} />
        <AB id="wf" visible={isFundMode}>
          <div style={{gridColumn:"1/-1",marginBottom:4}}><HelpLink contentKey="waterfallConcepts" lang={lang} onOpen={setEduModal} label={ar?"اعرف أكثر عن توزيع الأرباح":"Learn about Profit Distribution"} /></div>
          {false && (<div style={g2}>
            <FL label={ar?"العائد التفضيلي %":"Pref Return %"} tip={ar?"الحد الأدنى للعائد السنوي الذي يحصل عليه المستثمر قبل أن يشارك المطور بالأرباح. عادة 8-15%\nيتراكم سنوياً على رأس المال غير المسترد":"Minimum annual return for Investor before Developer shares profits. Usually 8-15%\nAccrues annually on unreturned capital"} hint={dh("prefReturnPct")}><Inp type="number" value={cfg.prefReturnPct} onChange={v=>upCfg({prefReturnPct:Math.max(0,Math.min(50,v))})} /></FL>
            <FL label={ar?"حصة المطور من الأرباح %":"Developer Profit Share %"} tip={ar?"حصة المطور من الأرباح بعد حصول المستثمر على العائد التفضيلي. عادة 20-30%\nمثال: لو العائد التفضيلي 15% والأرباح تجاوزته → 25% من الفائض يروح للمطور":"Developer's share of profits after investor gets preferred return. Usually 20-30%"} hint={dh("carryPct")}><Inp type="number" value={cfg.carryPct} onChange={v=>upCfg({carryPct:Math.max(0,Math.min(50,v))})} /></FL>
          </div>)}
          {false && (<div style={g3}>
            <FL label={ar?"نسبة توزيع المستثمر":"Investor Split %"} tip={ar?"نسبة الأرباح المتبقية للمستثمر بعد العائد التفضيلي والـ catch-up. عادة 70-80%\nالباقي يذهب تلقائياً للمطور":"Investor share of remaining profits after pref and catch-up. Usually 70-80%\nRemainder automatically goes to Developer"} hint={`${ar?"مطور":"Dev"} = ${100-(cfg.lpProfitSplitPct||70)}% · ${dh("lpProfitSplitPct")}`}><Inp type="number" value={cfg.lpProfitSplitPct} onChange={v=>upCfg({lpProfitSplitPct:Math.max(0,Math.min(100,v))})} /></FL>
            {false && (<FL label={ar?"التعويض (Catch-up)":"Catch-up"} tip={ar?"بعد حصول المستثمر على العائد التفضيلي، يتم تعويض الطرف المستحق بحصة أكبر مؤقتاً حتى يصل للنسبة المتفق عليها":"After investor receives preferred return, the entitled party takes a larger temporary share until agreed economics are reached"}><Drp lang={lang} value={cfg.gpCatchup?"Y":"N"} onChange={v=>upCfg({gpCatchup:v==="Y"})} options={["Y","N"]} /></FL>)}
            {false && (<FL label={ar?"معاملة الرسوم":"Fee Treatment"} tip={ar?"رأسمال: الرسوم تُسترد + تحصل عائد تفضيلي\nاسترداد فقط: تُسترد لكن بدون عائد تفضيلي\nمصروف: لا تُسترد ولا تحصل عائد":"Capital: fees earn ROC + Pref\nROC Only: fees returned but no Pref\nExpense: fees not returned, no Pref"}><select value={cfg.feeTreatment||"capital"} onChange={e=>upCfg({feeTreatment:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-card)",fontSize:13}}><option value="capital">{ar?"رأسمال - استرداد + Pref (تلقائي)":"Capital - ROC + Pref (default)"}</option><option value="rocOnly">{ar?"استرداد فقط (بدون Pref)":"ROC Only (no Pref)"}</option><option value="expense">{ar?"مصروف (لا استرداد)":"Expense (no ROC)"}</option></select></FL>)}
          </div>)}
          {false && (<div style={g2}>
            <FL label={ar?"توزيع العائد التفضيلي":"Pref Allocation"} tip={ar?"نسبي: العائد التفضيلي يوزع على المطور و المستثمر بحسب حصصهم\nللمستثمر فقط: كامل العائد التفضيلي يذهب للمستثمر":"Pro Rata: pref distributed to Developer and Investor by ownership share\nInvestor Only: all pref goes to Investor (default: proRata)"}>
              <Drp lang={lang} value={cfg.prefAllocation||"proRata"} onChange={v=>upCfg({prefAllocation:v})} options={[{value:"proRata",en:"Pro Rata - Developer+Investor (default)",ar:"نسبي - المطور+المستثمر (تلقائي)"},{value:"lpOnly",en:"Investor Only",ar:"للمستثمر فقط"}]} />
            </FL>
            <FL label={ar?"طريقة الـ Catch-up":"Catch-up Method"} tip={ar?"سنوي: يُحسب الـ catch-up كل سنة على حدة\nتراكمي: يُحسب على إجمالي التوزيعات التراكمية":"Per Year: catch-up calculated annually (default)\nCumulative: catch-up on total cumulative distributions"}>
              <Drp lang={lang} value={cfg.catchupMethod||"perYear"} onChange={v=>upCfg({catchupMethod:v})} options={[{value:"perYear",en:"Per Year (default)",ar:"سنوي (تلقائي)"},{value:"cumulative",en:"Cumulative",ar:"تراكمي"}]} />
            </FL>
          </div>)}
          {/* Performance Incentive (IRR-based hurdle) */}
          <div style={{borderTop:"1px solid #eef0f4",marginTop:10,paddingTop:10}} />
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",letterSpacing:0.3,textTransform:"uppercase"}}>{ar?"حافز حسن الأداء للمطور":"DEVELOPER PERFORMANCE INCENTIVE"}</span>
          </div>
          <div style={g3}>
            <FL label={ar?"تفعيل حافز حسن الأداء للمطور":"Enable Developer Performance Incentive"} tip={ar?"تفعيل حافز الأداء: إذا تجاوز عائد المستثمر (IRR) الحد الأدنى، يحصل المطور على نسبة من الفائض\nمختلف تماماً عن الـ Catch-up":"Enable IRR-based incentive: if investor IRR exceeds hurdle, developer gets a share of excess distributions\nCompletely separate from T3 catch-up"}><Drp lang={lang} value={cfg.performanceIncentive?"Y":"N"} onChange={v=>upCfg({performanceIncentive:v==="Y"})} options={[{value:"N",en:"Off",ar:"معطل"},{value:"Y",en:"On",ar:"مفعل"}]} /></FL>
            <FL label={ar?"نوع العتبة":"Hurdle Type"} tip={ar?"عائد سنوي بسيط (عرف السوق السعودي) = رأس المال × النسبة × السنوات\nIRR مركب = معدل العائد الداخلي المركب على التدفقات النقدية":"Simple Annual Return (Saudi market convention) = Capital × Rate × Years\nCompounded IRR = Internal rate of return on actual cash flows"}><Drp lang={lang} value={cfg.hurdleMode||"simple"} onChange={v=>upCfg({hurdleMode:v})} options={[{value:"simple",en:"Simple Annual (Market Convention)",ar:"عائد سنوي بسيط (عرف السوق)"},{value:"irr",en:"Compounded IRR",ar:"IRR مركب"}]} /></FL>
            <FL label={ar?"العائد المتوقع السنوي للمستثمر %":"Investor Expected Annual Return %"} tip={ar?"الحد الأدنى لعائد المستثمر الذي يجب تجاوزه قبل احتساب حافز الأداء. عادة 10-15%":"Minimum investor return threshold before incentive applies. Usually 10-15%"} hint={dh("hurdleIRR")}><Inp type="number" value={cfg.hurdleIRR} onChange={v=>upCfg({hurdleIRR:Math.max(0,Math.min(50,v))})} /></FL>
            <FL label={ar?"نسبة حافز المطور من الفائض %":"Developer Share of Excess %"} tip={ar?"نسبة الفائض فوق الحد الأدنى التي يحصل عليها المطور. مثال: 20% يعني المطور يأخذ 20% من التوزيعات الزائدة عن الحد":"Developer's share of distributions exceeding the hurdle threshold. Example: 20% means developer gets 20% of excess"} hint={dh("incentivePct")}><Inp type="number" value={cfg.incentivePct} onChange={v=>upCfg({incentivePct:Math.max(0,Math.min(100,v))})} /></FL>
          </div>
        </AB>
        </SecWrap>

        {/* ── SECTION 6: EXIT STRATEGY (visible for ALL modes) ── */}
        <SecWrap visible={true} color="#8b5cf6">
        <AH id="exit" color="#8b5cf6" label={ar?"التخارج":"Exit Strategy"} summary={`${({sale:ar?"بيع":"Sale",caprate:ar?"رسملة":"Cap Rate",hold:ar?"احتفاظ":"Hold"})[cfg.exitStrategy||"sale"]||""}${notHold?` · ${ar?"سنة":"Yr"} ${cfg.exitYear||"auto"}`:""}`} visible={true} />
        <AB id="exit" visible={true}>
          <FL label={ar?"استراتيجية التخارج":"Exit Strategy"} tip="بيع الأصل = تخارج في سنة محددة. احتفاظ بالدخل = بدون بيع\nAsset Sale = exit at a set year. Hold for Income = no sale event">
            <Drp lang={lang} value={cfg.exitStrategy||"sale"} onChange={v=>upCfg({exitStrategy:v})} options={[{value:"sale",en:"Sale - Multiple (default)",ar:"بيع - مضاعف (تلقائي)"},{value:"caprate",en:"Sale - Cap Rate",ar:"بيع - رسملة"},{value:"hold",en:"Hold",ar:"احتفاظ"}]} />
          </FL>
          <div style={{gridColumn:"1/-1",marginTop:-6,marginBottom:4}}><HelpLink contentKey="exitStrategy" lang={lang} onOpen={setEduModal} /></div>
          {notHold&&<>
            <div style={g2}>
              <div>
                <FL label={ar?"سنة التخارج":"Exit Year"} hint="0 = auto" tip="سنة بيع الأصل. عادة 5-10 سنوات بعد الاستقرار التشغيلي. 0 = تلقائي\nYear of asset sale. Usually 5-10 years after stabilization. 0 = auto"><Inp type="number" value={cfg.exitYear} onChange={v=>upCfg({exitYear:v})} /></FL>
                {f?.optimalExitYear > 0 && f?.optimalExitIRR > 0 && (project.exitStrategy||"sale") !== "hold" && <div style={{marginTop:-6,marginBottom:4,padding:"4px 8px",background:"#fef9c3",borderRadius:5,border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:11}}>💡</span>
                  <span style={{fontSize:10,color:"#92400e"}}>{ar?`أعلى IRR غير ممول (${(f.optimalExitIRR*100).toFixed(1)}%) بسنة: ${f.optimalExitYear}`:`Best unlevered IRR (${(f.optimalExitIRR*100).toFixed(1)}%) at year: ${f.optimalExitYear}`}</span>
                </div>}
              </div>
              {(cfg.exitStrategy||"sale")==="sale"&&<FL label={ar?"المضاعف":"Multiple (x)"} tip="قيمة البيع = الإيجار × المضاعف. عادة 8x-15x\nSale price = Rent × Multiple. Usually 8x-15x" hint={dh("exitMultiple")}><Inp type="number" value={cfg.exitMultiple} onChange={v=>upCfg({exitMultiple:v})} /></FL>}
              {cfg.exitStrategy==="caprate"&&<FL label={ar?"معدل الرسملة %":"Cap Rate %"} tip="قيمة التخارج = صافي الدخل التشغيلي (NOI) ÷ معدل الرسملة (Cap Rate). في السعودية 7%-10% للأصول المستقرة\nExit Value = NOI ÷ Cap Rate. Saudi stabilized assets: 7%-10%" hint={dh("exitCapRate")}><Inp type="number" value={cfg.exitCapRate} onChange={v=>upCfg({exitCapRate:v})} /></FL>}
            </div>
            <FL label={ar?"تكاليف التخارج %":"Exit Cost %"} tip="تكاليف البيع مثل السمسرة والاستشارات القانونية. عادة 1.5-3% من سعر البيع\nSale costs like brokerage and legal fees. Typically 1.5-3% of sale price" hint={dh("exitCostPct")}><Inp type="number" value={cfg.exitCostPct} onChange={v=>upCfg({exitCostPct:v})} /></FL>
          </>}
        </AB>
        </SecWrap>
        </div>;
      })()}


    {/* ═══ FINANCING RESULTS (KPIs + tables) ═══ */}
    {!f ? (
      <div style={{textAlign:"center",padding:32,color:"var(--text-tertiary)"}}>{ar?"اضبط إعدادات التمويل أعلاه":"Configure financing settings above"}</div>
    ) : (<>

    {/* ── Collapsible Section Helper ── */}
    {(() => {
      const Sec = ({id, icon, title, titleAr, color, children, alwaysOpen, badge}) => {
        const open = alwaysOpen || isOpen(id);
        return <div style={{background:"var(--surface-card)",borderRadius:10,border:`1px solid ${open?color+"33":"#e5e7ec"}`,marginBottom:14,overflow:"hidden",transition:"all 0.2s"}}>
          <div onClick={alwaysOpen?undefined:()=>toggle(id)} style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:alwaysOpen?"default":"pointer",background:open?color+"08":"#f8f9fb",borderBottom:open?`1px solid ${color}22`:"none",userSelect:"none"}}>
            <span style={{fontSize:14}}>{icon}</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",flex:1}}>{ar?titleAr:title}</span>
            {badge && <span style={{fontSize:10,fontWeight:600,color:color,background:color+"18",padding:"2px 8px",borderRadius:10}}>{badge}</span>}
            {!alwaysOpen && <span style={{fontSize:11,color:"var(--text-tertiary)",transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>{open?"▼":"▶"}</span>}
          </div>
          {open && <div style={{padding:"12px 16px",animation:"zanSlide 0.15s ease"}}>{children}</div>}
        </div>;
      };

      // Get waterfall for selected phase
      const w = (isSinglePhase && phaseWaterfalls?.[singlePhaseName]) ? phaseWaterfalls[singlePhaseName] : waterfall;
      const isFund = cfg.finMode === "fund" || cfg.finMode === "hybrid" || cfg.finMode === "incomeFund";
      const isBank = cfg.finMode === "debt" || cfg.finMode === "bank100";
      const isSelf = cfg.finMode === "self";

      // For hybrid mode: fees are on fund portion only, so use fundPortionCost as denominator for %
      const isHybrid = cfg.finMode === "hybrid";
      const fundBasis = isHybrid ? (f.fundPortionCost || f.devCostInclLand) : f.devCostInclLand;

      // Fee totals from waterfall (if available)
      const feeData = w ? {
        sub: (w.feeSub||[]).reduce((a,b)=>a+b,0),
        mgmt: (w.feeMgmt||[]).reduce((a,b)=>a+b,0),
        custody: (w.feeCustody||[]).reduce((a,b)=>a+b,0),
        dev: (w.feeDev||[]).reduce((a,b)=>a+b,0),
        struct: (w.feeStruct||[]).reduce((a,b)=>a+b,0),
        preEst: (w.feePreEst||[]).reduce((a,b)=>a+b,0),
        spv: (w.feeSpv||[]).reduce((a,b)=>a+b,0),
        auditor: (w.feeAuditor||[]).reduce((a,b)=>a+b,0),
        operator: (w.feeOperator||[]).reduce((a,b)=>a+b,0),
        misc: (w.feeMisc||[]).reduce((a,b)=>a+b,0),
        total: w.totalFees || 0,
        unfunded: (w.unfundedFees||[]).reduce((a,b)=>a+b,0),
      } : null;

      // Total financing cost = interest (includes upfront fee) + fund fees
      const totalFinCost = f.totalInterest + (feeData ? feeData.total : 0);
      // For hybrid: fund fees measured against fund portion, gov interest against full project
      const finCostPct = fundBasis > 0 ? totalFinCost / fundBasis : 0;

      // Stable income for yield
      const stableIncome = pc.income.find((v,i) => i > (f.constrEnd||0) && v > 0) || 0;
      const cashOnCash = f.totalEquity > 0 && stableIncome > 0 ? stableIncome / f.totalEquity : 0;

      return <>
      {/* LP = 0 warning - only relevant for fund/jv where LP is expected */}
      {f.lpEquity === 0 && (project.finMode === "fund" || project.finMode === "jv" || project.finMode === "hybrid" || project.finMode === "incomeFund") && (
        <div style={{background:"#fef3c7",borderRadius:8,border:"1px solid #fde68a",padding:"12px 16px",marginBottom:14,fontSize:12,color:"#92400e"}}>
          <strong>⚠ {ar?"حصة المستثمر = صفر":"Investor Equity = 0"}</strong><br/>
          {ar ? "لا يوجد مستثمرين. لتفعيل حصة المستثمر: فعّل رسملة حق الانتفاع أو أضف استثمار أتعاب التطوير أو استثمار نقدي" : "No investor equity. Enable Leasehold Capitalization, invest dev fee, or add cash investment."}
        </div>
      )}

      {/* ═══ SECTION 1: KEY METRICS (always open) ═══ */}
      <Sec id="kpi" icon="📊" title="Key Metrics" titleAr="المؤشرات الرئيسية" color="#2563eb" alwaysOpen>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(145px, 1fr))",gap:10}}>
          <KPI label={ar?"تكلفة التطوير (شامل الأرض)":"Dev Cost (Incl Land)"} value={fmtM(f.devCostInclLand)} sub={cur} color="#1a1d23" />
          <KPI label={isHybrid?(ar?"التمويل المؤسسي":"Inst. Financing"):(ar?"سقف الدين":"Max Debt (LTV)")} value={fmtM(f.maxDebt)} sub={isHybrid?`${cfg.govFinancingPct||70}%`:`${cfg.maxLtvPct||70}% LTV`} color="#ef4444" />
          <KPI label={isHybrid?(ar?"ملكية الصندوق":"Fund Equity"):(ar?"إجمالي الملكية":"Total Equity")} value={fmtM(f.totalEquity)} sub={isHybrid?`${100-(cfg.govFinancingPct||70)}%`:fmtPct((1-(f.totalDebt/((f.totalProjectCost||f.devCostInclLand)||1)))*100)} color="#3b82f6" />
          <KPI label={ar?"IRR بعد التمويل":"Levered IRR"} value={f.leveredIRR!==null?fmtPct(f.leveredIRR*100):"N/A"} color={getMetricColor("IRR",f.leveredIRR)} />
          <KPI label={ar?"إجمالي تكلفة التمويل":"Total Financing Cost"} value={fmtM(totalFinCost)} sub={finCostPct>0?fmtPct(finCostPct*100)+" "+ar?"من التكلفة":"of cost":""} color="#ef4444" tip={ar?"فوائد (شامل رسوم القرض) + رسوم صندوق\nInterest (incl. upfront fee) + Fund Fees":""} />
          <KPI label={ar?"عائد نقدي سنوي":"Cash-on-Cash Yield"} value={cashOnCash>0?fmtPct(cashOnCash*100):"—"} color={cashOnCash>0.08?"#16a34a":"#f59e0b"} />
          {isFund && feeData && <KPI label={ar?"إجمالي الرسوم":"Total Fund Fees"} value={fmtM(feeData.total)} sub={fundBasis>0?fmtPct(feeData.total/fundBasis*100)+" "+(ar?"من حصة الصندوق":"of fund portion"):""} color="#f59e0b" />}
          <KPI label={ar?"إجمالي الفوائد":"Total Interest"} value={fmtM(f.totalInterest)} sub={cur} color="#ef4444" />
        </div>
      </Sec>

      {/* ═══ SECTION 2: CAPITAL STRUCTURE (collapsible) ═══ */}
      <Sec id="capital" icon="🏗" title="Capital Structure" titleAr="هيكل رأس المال" color="#3b82f6" badge={`${fmtM(f.devCostInclLand)}`}>
        {/* Sources & Uses */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {f.totalDebt > 0 && <><span style={{color:"var(--text-secondary)"}}>{isHybrid?(ar?"تمويل مؤسسي":"Institutional Financing"):(ar?"الدين البنكي":"Bank Debt")}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.totalDebt)} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{fmtPct((f.totalDebt/(f.devCostInclLand||1))*100)}</span></span></>}
              {f.gpEquity > 0 && <><span style={{color:"#3b82f6"}}>{ar?"مساهمة المطور":"Developer Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.gpEquity)} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{fmtPct(f.gpPct*100)}</span></span></>}
              {f.lpEquity > 0 && <><span style={{color:"#8b5cf6"}}>{ar?"مساهمة المستثمر":"Investor Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.lpEquity)} <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{fmtPct(f.lpPct*100)}</span></span></>}
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #16a34a",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.totalDebt + f.gpEquity + f.lpEquity)}</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{ar?"الاستخدامات":"USES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"تكاليف البناء":"Construction Cost"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.devCostExclLand)}</span>
              {f.landCapValue > 0 && <><span style={{color:"var(--text-secondary)"}}>{ar?"رسملة الأرض":"Land Capitalization"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmt(f.landCapValue)}</span></>}
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
              <span style={{borderTop:"2px solid #ef4444",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmt(f.devCostInclLand)}</span>
            </div>
          </div>
        </div>
        {/* Equation */}
        <div style={{background:"#f0f4ff",borderRadius:6,padding:"8px 14px",fontSize:12}}>
          <strong>{ar?"المعادلة":"Equation"}:</strong>{" "}
          {ar?"دين":"Debt"} ({fmtM(f.totalDebt)}) + {ar?"المطور":"Developer"} ({fmtM(f.gpEquity)}){f.lpEquity > 0 ? ` + ${ar?"المستثمر":"Investor"} (${fmtM(f.lpEquity)})` : ""} = {fmtM(f.totalDebt + f.gpEquity + f.lpEquity)}{" "}
          {Math.abs((f.totalDebt + f.gpEquity + f.lpEquity) - (f.totalProjectCost || f.devCostInclLand)) < 1000
            ? <span style={{color:"#16a34a",fontWeight:600}}>✓</span>
            : <span style={{color:"#ef4444",fontWeight:600}}>✗ ≠ {fmtM(f.totalProjectCost || f.devCostInclLand)}</span>}
        </div>
      </Sec>

      {/* ═══ SECTION 3: FINANCING COSTS (collapsible) ═══ */}
      {!isSelf && <Sec id="costs" icon="💸" title={isFund?"Fund Fees & Financing Costs":"Financing Costs"} titleAr={isFund?"رسوم الصندوق وتكاليف التمويل":"تكاليف التمويل"} color="#f59e0b" badge={fmtM(totalFinCost)}>
        <div style={{display:"grid",gridTemplateColumns:isFund&&!isMobile?"1fr 1fr":"1fr",gap:14}}>
          {/* Bank/Debt Costs */}
          {f.totalDebt > 0 && <div>
            <div style={{fontSize:11,fontWeight:700,color:"#ef4444",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fecaca"}}>{isHybrid?(ar?"تكلفة التمويل المؤسسي":"INSTITUTIONAL FINANCING COSTS"):(ar?"تكلفة الدين":"DEBT COSTS")}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              <span style={{color:"var(--text-secondary)"}}>{ar?"إجمالي الفوائد":"Total Interest"}</span><span style={{textAlign:"right",fontWeight:500,color:"#ef4444"}}>{fmt(f.totalInterest)}</span>
              {(f.upfrontFee||0) > 0 && <><span style={{color:"var(--text-tertiary)",fontSize:10,fontStyle:"italic"}}>{ar?"* تشمل رسوم قرض":"* incl. upfront fee"}: {fmt(f.upfrontFee)} ({isHybrid?(cfg.govUpfrontFeePct||0):(cfg.upfrontFeePct||0)}%)</span><span></span></>}
              <span style={{color:"var(--text-secondary)"}}>{ar?"معدل التمويل":"Finance Rate"}</span><span style={{textAlign:"right",fontWeight:600}}>{isHybrid?(cfg.govFinanceRate||3):(cfg.financeRate||0)}%</span>
              <span style={{color:"var(--text-secondary)"}}>{ar?"المدة":"Tenor"}</span><span style={{textAlign:"right",fontWeight:500}}>{isHybrid?(cfg.govLoanTenor||15):(cfg.loanTenor)} {ar?"سنة":"yrs"} ({isHybrid?(cfg.govGrace||5):(cfg.debtGrace)} {ar?"سماح":"grace"})</span>
              <span style={{color:"var(--text-secondary)"}}>{ar?"السداد يبدأ":"Repay Starts"}</span><span style={{textAlign:"right",fontWeight:500}}>{sy + f.repayStart}</span>
              <span style={{color:"var(--text-secondary)"}}>{ar?"نوع السداد":"Repay Type"}</span><span style={{textAlign:"right",fontWeight:500}}>{(isHybrid?(cfg.govRepaymentType||"amortizing"):(cfg.repaymentType))==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700,color:"#ef4444"}}>{ar?"إجمالي تكلفة الدين":"Total Debt Cost"}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700,color:"#ef4444"}}>{fmt(f.totalInterest)}</span>
            </div>
          </div>}

          {/* Fund Fees */}
          {isFund && feeData && <div>
            <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fde68a"}}>{ar?"رسوم الصندوق":"FUND FEES"}</div>
            <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"4px 20px",rowGap:6,maxWidth:420}}>
              {[
                {l:ar?"اكتتاب":"Subscription",v:feeData.sub,pct:cfg.subscriptionFeePct,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"إدارة":"Management",v:feeData.mgmt,pct:cfg.annualMgmtFeePct,hint:ar?"سنوي":"annual"},
                {l:ar?"حفظ":"Custody",v:feeData.custody,hint:ar?"سنوي":"annual"},
                {l:ar?"تطوير":"Developer Fee",v:feeData.dev,pct:cfg.developerFeePct,hint:ar?"مع البناء":"with constr."},
                {l:ar?"هيكلة":"Structuring",v:feeData.struct,pct:cfg.structuringFeePct,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"ما قبل التأسيس":"Pre-Establishment",v:feeData.preEst,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"إنشاء SPV":"SPV Setup",v:feeData.spv,hint:ar?"مرة واحدة":"one-time"},
                {l:ar?"مراجع حسابات":"Auditor",v:feeData.auditor,hint:ar?"سنوي":"annual"},
                {l:ar?"أتعاب المشغل":"Operator Fee",v:feeData.operator,pct:cfg.operatorFeePct,hint:ar?"سنوي · بعد البناء":"annual · post-constr."},
                {l:ar?"مصروفات أخرى":"Misc. Expenses",v:feeData.misc,pct:cfg.miscExpensePct,hint:ar?"مرة واحدة":"one-time"},
              ].filter(x=>x.v>0).map((x,i)=>[
                <span key={i+"l"} style={{color:"var(--text-secondary)"}}>{x.l} <span style={{fontSize:9,color:"#b0b5c0"}}>{x.hint}</span></span>,
                <span key={i+"v"} style={{textAlign:"right",fontWeight:500}}>{fmt(x.v)} {x.pct?<span style={{fontSize:10,color:"var(--text-tertiary)"}}>{x.pct}%</span>:""}</span>
              ])}
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700,color:"#f59e0b"}}>{ar?"إجمالي الرسوم":"Total Fees"}</span>
              <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700,color:"#f59e0b"}}>{fmt(feeData.total)}</span>
              {feeData.unfunded > 0 && <><span style={{color:"#92400e",fontSize:11}}>{ar?"رسوم ممولة من Equity":"Equity-Funded Fees"}</span><span style={{textAlign:"right",fontWeight:500,fontSize:11,color:"#92400e"}}>{fmt(feeData.unfunded)}</span></>}
            </div>
          </div>}
        </div>

        {/* Total Financing Cost Summary */}
        <div style={{marginTop:12,background:"#fefce8",borderRadius:6,padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr auto",gap:"6px 20px",fontSize:12,maxWidth:520}}>
          <span style={{fontWeight:700}}>{ar?"إجمالي تكلفة التمويل الكلية":"TOTAL FINANCING COST"}</span>
          <span style={{textAlign:"right",fontWeight:800,fontSize:14,color:"#ef4444"}}>{fmt(totalFinCost)} {cur}</span>
          <span style={{fontSize:11,color:"var(--text-secondary)"}}>{isHybrid?(ar?"كنسبة من حصة الصندوق":"As % of Fund Portion"):(ar?"كنسبة من تكلفة التطوير":"As % of Dev Cost")}</span>
          <span style={{textAlign:"right",fontWeight:600,color:"#a16207"}}>{fmtPct(finCostPct*100)}</span>
        </div>
      </Sec>}

      {/* ═══ SECTION 4: DEBT SERVICE & DSCR (collapsible) ═══ */}
      {f.totalDebt > 0 && <Sec id="dscr" icon="🏦" title="Debt Service & DSCR" titleAr="خدمة الدين و DSCR" color="#3b82f6">
        {/* Debt Structure Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,fontSize:12,marginBottom:14}}>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"الهيكل":"Structure"}</span><strong>{(isHybrid?(cfg.govRepaymentType||"amortizing"):(cfg.repaymentType))==="amortizing"?(ar?"أقساط":"Amortizing"):(ar?"دفعة واحدة":"Bullet")}</strong></div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"المدة":"Tenor"}</span><strong>{isHybrid?(cfg.govLoanTenor||15):(cfg.loanTenor)} {ar?"سنة":"yrs"}</strong> <span style={{fontSize:10,color:"var(--text-tertiary)"}}>({isHybrid?(cfg.govGrace||5):(cfg.debtGrace)} {ar?"سماح":"grace"} + {f.repayYears} {ar?"سداد":"repay"})</span></div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"بداية السداد":"Repay Starts"}</span><strong>{sy + f.repayStart}</strong></div>
          <div style={{background:"var(--surface-table-header)",borderRadius:6,padding:"8px 12px"}}><span style={{fontSize:10,color:"var(--text-secondary)",display:"block"}}>{ar?"التخارج":"Exit"}</span><strong>{f.exitYear}</strong> ({cfg.exitMultiple}x)</div>
        </div>
        {/* DSCR pills */}
        <div style={{fontSize:12,fontWeight:600,marginBottom:8}}><Tip text={ar?"صافي الدخل التشغيلي / خدمة الدين. البنوك تطلب 1.25x كحد أدنى":"NOI / Debt Service. Banks require min 1.25x"}>DSCR</Tip></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {years.filter(y=>f.dscr[y]!==null).map(y=>{
            const v = f.dscr[y];
            const bg = v >= 1.5 ? "#dcfce7" : v >= 1.2 ? "#fef9c3" : v >= 1.0 ? "#ffedd5" : "#fef2f2";
            const fg = v >= 1.5 ? "#16a34a" : v >= 1.2 ? "#a16207" : v >= 1.0 ? "#c2410c" : "#ef4444";
            return <div key={y} style={{textAlign:"center",padding:"4px 8px",borderRadius:4,background:bg,minWidth:50}}>
              <div style={{fontSize:10,color:"var(--text-secondary)"}}>{sy+y}</div>
              <div style={{fontSize:13,fontWeight:700,color:fg}}>{v.toFixed(2)}x</div>
            </div>;
          })}
        </div>
        <div style={{fontSize:10,color:"var(--text-tertiary)"}}>🟢 ≥ 1.5x | 🟡 ≥ 1.2x | 🟠 ≥ 1.0x | 🔴 &lt; 1.0x</div>
      </Sec>}

      {/* ═══ HYBRID: THREE DETAILED CF TABLES (FinancingView) ═══ */}
      {isHybrid && f && w && pc && (() => {
        const finPct = f.govFinancingPct || 70;
        const fundPctVal = 100 - finPct;
        const maxYr = f.exitYear ? f.exitYear - sy + 2 : Math.min(showYrs || 15, h);
        const hybYears = Array.from({length: Math.min(maxYr + 1, h)}, (_, i) => i);
        const HybTbl = ({id, title, titleColor, borderColor, bgColor, children}) => {
          const [open, setOpen] = useState(false);
          return <div style={{marginBottom:10,borderRadius:8,border:`1px solid ${borderColor}`,overflow:"hidden"}}>
            <div onClick={()=>setOpen(!open)} style={{padding:"8px 14px",background:bgColor,cursor:"pointer",display:"flex",alignItems:"center",gap:8,userSelect:"none"}}>
              <span style={{fontSize:10,color:titleColor,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s"}}>▶</span>
              <span style={{fontSize:11,fontWeight:700,color:titleColor,flex:1}}>{title}</span>
              <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{open?(ar?"طي":"Collapse"):(ar?"فتح":"Expand")}</span>
            </div>
            {open && <div className="table-wrap" style={{overflowX:"auto",maxHeight:400,overflowY:"auto"}}><table style={{...tblStyle,fontSize:10,width:"100%"}}>{children}</table></div>}
          </div>;
        };
        const HRw = ({label, arr, color, bold, negate, sub}) => {
          const tot = arr.reduce((a,b)=>a+b,0);
          const st = bold ? {fontWeight:700,background:"var(--surface-table-header)"} : {};
          const nc = v => color || (v<0?"#ef4444":v>0?"#1a1d23":"#9ca3af");
          return <tr style={st}>
            <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:140,fontSize:sub?9:10,paddingInlineStart:sub?24:undefined,color:sub?"var(--text-tertiary)":undefined}}>{label}</td>
            <td style={{...tdN,fontWeight:600,fontSize:10,color:nc(negate?-tot:tot)}}>{fmt(tot)}</td>
            {hybYears.map(y=>{const v=arr[y]||0;return <td key={y} style={{...tdN,fontSize:10,color:nc(negate?-v:v)}}>{v===0?"—":fmt(v)}</td>;})}
          </tr>;
        };
        const THd = () => <thead><tr style={{position:"sticky",top:0,background:"var(--surface-table-header)",zIndex:3}}>
          <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:4,minWidth:140,fontSize:10}}>{ar?"البند":"Item"}</th>
          <th style={{...thSt,textAlign:"right",fontSize:10}}>{ar?"الإجمالي":"Total"}</th>
          {hybYears.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:70,fontSize:9}}>{sy+y}</th>)}
        </tr></thead>;

        return <Sec id="hybridCF" icon="🔀" title="Hybrid Cash Flows (3 Views)" titleAr="التدفقات النقدية المختلطة (3 عروض)" color="#059669">
          {/* Table 1: Financing (Debt Instrument) */}
          <HybTbl id="hfFin" title={`🏦 ${ar?`التمويل المؤسسي (${finPct}%)`:`Institutional Financing (${finPct}%)`} — ${fmtM(f.govLoanAmount)} @ ${((f.govLoanRate||0)*100).toFixed(1)}%`} titleColor="#1e40af" borderColor="#93c5fd" bgColor="#eff6ff">
            <THd />
            <tbody>
              <HRw label={ar?"سحوبات الدين":"Debt Drawdown"} arr={f.drawdown} color="#3b82f6" />
              <HRw label={ar?"(-) تكلفة التمويل (فائدة)":"(-) Interest / Profit"} arr={f.interest} color="#ef4444" negate />
              <HRw label={ar?"(-) سداد الأصل":"(-) Principal Repayment"} arr={f.repayment} color="#ef4444" negate />
              <HRw label={ar?"= صافي تدفق التمويل":"= Net Financing CF"} arr={f.financingCF || hybYears.map(y => (f.drawdown[y]||0) - (f.debtService[y]||0))} bold />
              <tr style={{background:"#eff6ff"}}>
                <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:9,color:"#3b82f6",paddingInlineStart:16}}>{ar?"رصيد الدين":"Debt Balance"}</td>
                <td style={tdN}></td>
                {hybYears.map(y=><td key={y} style={{...tdN,fontSize:9,color:"#3b82f6"}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
              </tr>
              <tr style={{background:"#eff6ff"}}>
                <td style={{...tdSt,position:"sticky",left:0,background:"#eff6ff",zIndex:1,fontWeight:500,fontSize:9,color:"#3b82f6",paddingInlineStart:16}}>DSCR</td>
                <td style={tdN}></td>
                {hybYears.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.5?"#16a34a":f.dscr[y]>=1.2?"#a16207":"#ef4444",fontWeight:600,fontSize:9}}>{f.dscr[y]===null?"—":f.dscr[y]?.toFixed(2)+"x"}</td>)}
              </tr>
            </tbody>
          </HybTbl>

          {/* Table 2: Fund (Equity Account) */}
          <HybTbl id="hfFund" title={`📊 ${ar?`الصندوق (${fundPctVal}% ملكية)`:`Fund (${fundPctVal}% Equity)`} — ${fmtM(f.totalEquity)} | LP IRR: ${w.lpIRR!=null?fmtPct(w.lpIRR*100):"—"} | MOIC: ${w.lpMOIC?w.lpMOIC.toFixed(2)+"x":"—"}`} titleColor="#6d28d9" borderColor="#c4b5fd" bgColor="#faf5ff">
            <THd />
            <tbody>
              <HRw label={ar?"الإيرادات":"Revenue"} arr={hybYears.map(y=>pc.income[y]||0)} color="#16a34a" />
              <HRw label={ar?"(-) إيجار أرض":"(-) Land Rent"} arr={hybYears.map(y=>pc.landRent[y]||0)} color="#ef4444" negate />
              <HRw label={ar?"(-) تكاليف تطوير":"(-) CAPEX"} arr={hybYears.map(y=>pc.capex[y]||0)} color="#ef4444" negate />
              <HRw label={ar?"(+) سحوبات التمويل":"(+) Financing Drawdown"} arr={f.drawdown} color="#3b82f6" sub />
              <HRw label={ar?"(-) خدمة الدين":"(-) Debt Service"} arr={f.debtService} color="#dc2626" negate sub />
              {f.devFeeSchedule && <HRw label={ar?"(-) أتعاب المطور":"(-) Developer Fee"} arr={f.devFeeSchedule} color="#f59e0b" negate />}
              {w.fees && <HRw label={ar?"(-) رسوم الصندوق":"(-) Fund Fees"} arr={w.fees} color="#f59e0b" negate />}
              <HRw label={ar?"حصيلة التخارج":"Exit Proceeds"} arr={hybYears.map(y=>f.exitProceeds?.[y]||0)} color="#8b5cf6" />
              <HRw label={ar?"= صافي تدفق الصندوق":"= Net Fund CF"} arr={f.fundCF || f.leveredCF} bold />
              <HRw label={ar?"طلبات رأس المال":"Equity Calls"} arr={w.equityCalls||f.equityCalls||[]} color="#8b5cf6" />
              {w.lpDist && <HRw label={ar?"توزيعات المستثمر (LP)":"LP Distributions"} arr={w.lpDist} color="#6d28d9" />}
              {w.gpDist && <HRw label={ar?"توزيعات المطور (GP)":"GP Distributions"} arr={w.gpDist} color="#8b5cf6" />}
            </tbody>
          </HybTbl>

          {/* Table 3: Combined */}
          <HybTbl id="hfCombined" title={`📋 ${ar?"المشروع الكامل (مجمّع)":"Full Project (Combined)"} — ${fmtM(f.devCostInclLand)}`} titleColor="#1e3a5f" borderColor="#94a3b8" bgColor="#f1f5f9">
            <THd />
            <tbody>
              <HRw label={ar?"الإيرادات":"Revenue"} arr={hybYears.map(y=>pc.income[y]||0)} color="#16a34a" />
              <HRw label={ar?"(-) إيجار أرض":"(-) Land Rent"} arr={hybYears.map(y=>pc.landRent[y]||0)} color="#ef4444" negate />
              <HRw label={ar?"(-) تكاليف تطوير":"(-) CAPEX"} arr={hybYears.map(y=>pc.capex[y]||0)} color="#ef4444" negate />
              {(() => { const u=hybYears.map(y=>(pc.income[y]||0)-(pc.landRent[y]||0)-(pc.capex[y]||0)); return <HRw label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered CF"} arr={u} bold />; })()}
              <HRw label={ar?"سحوبات الدين":"Debt Drawdown"} arr={f.drawdown} color="#3b82f6" />
              <HRw label={ar?"(-) خدمة الدين":"(-) Debt Service"} arr={f.debtService} color="#dc2626" negate />
              {f.devFeeSchedule && <HRw label={ar?"(-) أتعاب المطور":"(-) Developer Fee"} arr={f.devFeeSchedule} color="#f59e0b" negate />}
              {w.fees && <HRw label={ar?"(-) رسوم الصندوق":"(-) Fund Fees"} arr={w.fees} color="#f59e0b" negate />}
              <HRw label={ar?"حصيلة التخارج":"Exit Proceeds"} arr={hybYears.map(y=>f.exitProceeds?.[y]||0)} color="#8b5cf6" />
              <HRw label={ar?"= صافي التدفق الممول":"= Levered Net CF"} arr={f.leveredCF} bold />
              {(() => { let cum=0; return <tr style={{background:"#f1f5f9"}}>
                <td style={{...tdSt,position:"sticky",left:0,background:"#f1f5f9",zIndex:1,fontWeight:600,fontSize:9,color:"#475569",paddingInlineStart:16}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
                <td style={tdN}></td>
                {hybYears.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:9,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
              </tr>; })()}
            </tbody>
          </HybTbl>
        </Sec>;
      })()}

      {/* ═══ SECTION 5: INTEGRATED CASH FLOW (always open) ═══ */}
      <Sec id="cf" icon="📋" title="Integrated Cash Flow" titleAr="التدفق النقدي المتكامل" color="#1e3a5f" alwaysOpen>
        <div style={{display:"flex",alignItems:"center",marginBottom:10,gap:10}}>
          <div style={{flex:1,fontSize:11,color:"var(--text-secondary)"}}>{ar?"التدفق النقدي بعد خدمة الدين والرسوم":"Cash flow after debt service and fees"}</div>
          <select value={showYrs} onChange={e=>setShowYrs(parseInt(e.target.value))} style={{padding:"4px 8px",borderRadius:4,border:"0.5px solid var(--border-default)",fontSize:12}}>
            {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"years"}</option>)}
          </select>
        </div>

        <div style={{borderRadius:8,border:"2px solid #1e3a5f",overflow:"hidden"}}>
          <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
            <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:isMobile?110:180}}>{ar?"البند":"Line Item"}</th>
            <th style={{...thSt,textAlign:"right"}}>{ar?"الإجمالي":"Total"}</th>
            {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:80}}>{ar?`سنة ${y+1}`:`Yr ${y+1}`}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{sy+y}</span></th>)}
          </tr></thead><tbody>
            {/* ── Project CF ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0fdf4",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التدفق التشغيلي":"PROJECT CASH FLOW"}{isFiltered ? ` — ${activePh.join(", ")}` : ""}</td></tr>
            <CFRow label={ar?"الإيرادات":"Revenue"} values={pc.income} total={pc.totalIncome} color="#16a34a" />
            <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pc.landRent} total={pc.totalLandRent} color="#ef4444" negate />
            <CFRow label={ar?"(-) تكاليف التطوير":"(-) CAPEX"} values={pc.capex} total={pc.totalCapex} color="#ef4444" negate />
            {(() => { const unlev = new Array(h).fill(0); for(let y=0;y<h;y++) unlev[y]=(pc.income[y]||0)-(pc.landRent[y]||0)-(pc.capex[y]||0); return <CFRow label={ar?"= صافي التدفق (قبل التمويل)":"= Unlevered Net CF"} values={unlev} total={unlev.reduce((a,b)=>a+b,0)} bold />; })()}

            {/* ── Financing ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#3b82f6",background:"#eff6ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التمويل":"FINANCING"}</td></tr>
            <CFRow label={ar?"طلبات رأس المال":"Equity Calls"} values={f.equityCalls} total={f.equityCalls.reduce((a,b)=>a+b,0)} color="#8b5cf6" />
            <CFRow label={ar?"سحوبات الدين":"Debt Drawdown"} values={f.drawdown} total={f.totalDebt} color="#3b82f6" />
            <CFRow label={ar?"(-) سداد أصل الدين":"(-) Repayment"} values={f.repayment} total={f.repayment.reduce((a,b)=>a+b,0)} color="#ef4444" negate />
            <CFRow label={ar?"(-) تكلفة التمويل":"(-) Interest / Profit Cost"} values={f.interest} total={f.totalInterest} color="#ef4444" negate />
            <CFRow label={ar?"= إجمالي خدمة الدين":"= Total Debt Service"} values={f.debtService} total={f.debtService.reduce((a,b)=>a+b,0)} color="#dc2626" negate bold />
            {/* Debt balance */}
            <tr style={{background:"#f0f4ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:400,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>{ar?"رصيد الدين (بداية)":"Debt Balance (Open)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{f.debtBalOpen[y]===0?"—":fmt(f.debtBalOpen[y])}</td>)}
            </tr>
            <tr style={{background:"#f0f4ff"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#f0f4ff",zIndex:1,fontWeight:500,fontSize:10,color:"#3b82f6",paddingInlineStart:24}}>{ar?"رصيد الدين (نهاية)":"Debt Balance (Close)"}</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:"#3b82f6",fontSize:10}}>{f.debtBalClose[y]===0?"—":fmt(f.debtBalClose[y])}</td>)}
            </tr>

            {/* ── Fund Fees (if fund mode and waterfall available) ── */}
            {isFund && w && <>
              <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#f59e0b",background:"#fefce8",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"رسوم الصندوق":"FUND FEES"}</td></tr>
              {(w.feeSub||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) اكتتاب":"(-) Subscription"} values={w.feeSub} total={(w.feeSub||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeMgmt||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إدارة":"(-) Management"} values={w.feeMgmt} total={(w.feeMgmt||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeCustody||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) حفظ":"(-) Custody"} values={w.feeCustody} total={(w.feeCustody||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeDev||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) تطوير":"(-) Developer Fee"} values={w.feeDev} total={(w.feeDev||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeStruct||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) هيكلة":"(-) Structuring"} values={w.feeStruct} total={(w.feeStruct||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feePreEst||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) ما قبل التأسيس":"(-) Pre-Establishment"} values={w.feePreEst} total={(w.feePreEst||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeSpv||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) إنشاء SPV":"(-) SPV Setup"} values={w.feeSpv} total={(w.feeSpv||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeAuditor||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مراجع حسابات":"(-) Auditor"} values={w.feeAuditor} total={(w.feeAuditor||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeOperator||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) أتعاب المشغل":"(-) Operator Fee"} values={w.feeOperator} total={(w.feeOperator||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              {(w.feeMisc||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"(-) مصروفات أخرى":"(-) Misc. Expenses"} values={w.feeMisc} total={(w.feeMisc||[]).reduce((a,b)=>a+b,0)} color="#a16207" negate />}
              <CFRow label={ar?"= إجمالي الرسوم":"= Total Fees"} values={w.fees||[]} total={w.totalFees||0} color="#f59e0b" negate bold />
              {(w.unfundedFees||[]).reduce((a,b)=>a+b,0) > 0 && <CFRow label={ar?"رسوم ممولة من Equity":"Unfunded Fees (Equity)"} values={w.unfundedFees} total={(w.unfundedFees||[]).reduce((a,b)=>a+b,0)} color="#92400e" />}
            </>}

            {/* ── Exit ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#8b5cf6",background:"#faf5ff",letterSpacing:0.5,textTransform:"uppercase"}}>{ar?"التخارج":"EXIT"}</td></tr>
            <CFRow label={ar?"حصيلة التخارج":"Exit Proceeds"} values={f.exitProceeds} total={f.exitProceeds.reduce((a,b)=>a+b,0)} color="#8b5cf6" />

            {/* ── Net Result ── */}
            <tr><td colSpan={years.length+2} style={{padding:"5px 10px",fontSize:10,fontWeight:700,color:"#1e3a5f",background:"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"2px solid #2563eb"}}>{ar?"النتيجة":"NET RESULT"}</td></tr>
            <CFRow label={ar?"= صافي التدفق الممول":"= Levered Net CF"} values={f.leveredCF} total={f.leveredCF.reduce((a,b)=>a+b,0)} bold />
            {(() => { let cum=0; return <tr style={{background:"#fffbeb"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:isMobile?110:180}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
              <td style={tdN}></td>
              {years.map(y=>{cum+=f.leveredCF[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
            </tr>; })()}
            {/* DSCR */}
            <tr style={{background:"#fefce8"}}>
              <td style={{...tdSt,position:"sticky",left:0,background:"#fefce8",zIndex:1,fontWeight:600,fontSize:11,color:"#a16207"}}>DSCR</td>
              <td style={tdN}></td>
              {years.map(y=><td key={y} style={{...tdN,color:f.dscr[y]===null?"#9ca3af":f.dscr[y]>=1.5?"#16a34a":f.dscr[y]>=1.2?"#a16207":"#ef4444",fontWeight:600,fontSize:11}}>{f.dscr[y]===null?"—":f.dscr[y].toFixed(2)+"x"}</td>)}
            </tr>
          </tbody></table></div>
        </div>
      </Sec>
      </>;
    })()}
    </>)}

    {/* ═══ LEVERED CF TRACER — formula transparency like Excel ═══ */}
    {f && f.leveredCF && (() => {
      const [tracerOpen, setTracerOpen] = useState(false);
      const c = pc; // phase or consolidated
      const adjLR = ir?.adjustedLandRent || c.landRent;
      const isSelfMode = f.mode === "self";
      const exitYrIdx = f.exitYear ? f.exitYear - sy : -1;
      const fSold = (cfg.exitStrategy || "sale") !== "hold" && exitYrIdx >= 0 && exitYrIdx < h;
      const tracerYears = Array.from({length:Math.min(15,h)},(_,i)=>i);
      const tdS = {padding:"3px 6px",fontSize:10,fontFamily:"monospace",textAlign:"right",borderBottom:"1px solid #f0f1f5",whiteSpace:"nowrap"};
      const tdH = {...tdS,fontWeight:700,background:"var(--surface-table-header)",textAlign:"center",fontSize:9,position:"sticky",top:0,zIndex:1};
      const tdL = {...tdS,textAlign:"left",fontWeight:600,position:"sticky",left:0,background:"var(--surface-card)",zIndex:1,minWidth:isMobile?110:180};
      const fmtC = v => v === 0 ? "—" : (v > 0 ? "+" : "") + (Math.abs(v) >= 1e6 ? (v/1e6).toFixed(2)+"M" : Math.abs(v) >= 1000 ? (v/1000).toFixed(0)+"K" : v.toFixed(0));
      const rowColor = (v) => v > 0 ? "#16a34a" : v < 0 ? "#ef4444" : "#9ca3af";

      return <div style={{marginTop:20}}>
        <div onClick={()=>setTracerOpen(!tracerOpen)} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"linear-gradient(135deg,#1e3a5f,#2563eb)",borderRadius:10,color:"#fff",userSelect:"none"}}>
          <span style={{fontSize:16}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,flex:1}}>{ar?"تتبع التدفق الممول — شفافية كاملة":"Levered CF Tracer — Full Transparency"}</span>
          <span style={{fontSize:10,opacity:0.7}}>{ar?"مثل خلية إكسل — شوف من وين جاي كل رقم":"Like an Excel cell — see where every number comes from"}</span>
          <span style={{fontSize:12}}>{tracerOpen?"▼":"▶"}</span>
        </div>
        {tracerOpen && <div style={{border:"0.5px solid var(--border-default)",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"auto",maxHeight:600}}>
          {/* FORMULA */}
          <div style={{padding:"12px 16px",background:"#f0f4ff",borderBottom:"2px solid #2563eb"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1e3a5f",marginBottom:6}}>{ar?"المعادلة:":"FORMULA:"}</div>
            <div style={{fontFamily:"monospace",fontSize:12,color:"#1e3a5f",lineHeight:1.8}}>
              {isSelfMode
                ? <>{ar?"التدفق الممول":"Levered CF"} = <span style={{color:"#16a34a"}}>{ar?"الدخل":"Income"}</span> − <span style={{color:"#ef4444"}}>{ar?"إيجار أرض (معدّل)":"Adj Land Rent"}</span> − <span style={{color:"#ef4444"}}>CAPEX</span> + <span style={{color:"#16a34a"}}>{ar?"منحة":"Grant"}</span> + <span style={{color:"#16a34a"}}>{ar?"خصم رسوم":"Fee Rebate"}</span> − <span style={{color:"#ef4444"}}>{ar?"رسم المطور":"Developer Fee"}</span> + <span style={{color:"#16a34a"}}>{ar?"تخارج":"Exit"}</span></>
                : <>{ar?"التدفق الممول":"Levered CF"} = <span style={{color:"#16a34a"}}>{ar?"الدخل":"Income"}</span> − <span style={{color:"#ef4444"}}>{ar?"إيجار أرض (معدّل)":"Adj Land Rent"}</span> − <span style={{color:"#ef4444"}}>CAPEX</span> + <span style={{color:"#16a34a"}}>{ar?"منحة":"Grant"}</span> + <span style={{color:"#16a34a"}}>{ar?"خصم رسوم":"Fee Rebate"}</span> − <span style={{color:"#ef4444"}}>{ar?"خدمة دين (معدّلة)":"Adj Debt Service"}</span> + <span style={{color:"#16a34a"}}>{ar?"سحب":"Drawdown"}</span> + <span style={{color:"#16a34a"}}>{ar?"تخارج":"Exit"}</span> − <span style={{color:"#ef4444"}}>{ar?"رسم المطور":"Developer Fee"}</span></>
              }
            </div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:6}}>
              {ar?"المصدر: financing.js سطر ":"Source: financing.js L"}{isSelfMode?"128-177":"545-553"} → {ar?"يُخزن بـ":"stored in "} f.leveredCF → {ar?"يُقرأ مباشرة بكل الصفحات":"read directly by all views"}
            </div>
          </div>
          {/* TABLE */}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead>
              <tr>
                <th style={tdH}>{ar?"المكوّن":"Component"}</th>
                <th style={tdH}>{ar?"المصدر":"Source"}</th>
                {tracerYears.map(y=><th key={y} style={tdH}>{sy+y}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"الدخل":"Income"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>c.income</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#16a34a"}}>{fmtC(c.income[y])}</td>)}</tr>
              <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) إيجار أرض":"(−) Land Rent"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>{ir?.adjustedLandRent?"ir.adjLR":"c.landRent"}</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-adjLR[y])}</td>)}</tr>
              <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) CAPEX":"(−) CAPEX"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>c.capex</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-c.capex[y])}</td>)}</tr>
              {(ir?.capexGrantSchedule||[]).some(v=>v>0) && <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"(+) منحة CAPEX":"(+) CAPEX Grant"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>ir.capexGrant</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#16a34a"}}>{fmtC(ir?.capexGrantSchedule?.[y]||0)}</td>)}</tr>}
              {(ir?.feeRebateSchedule||[]).some(v=>v>0) && <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"(+) خصم رسوم":"(+) Fee Rebate"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>ir.feeRebate</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#16a34a"}}>{fmtC(ir?.feeRebateSchedule?.[y]||0)}</td>)}</tr>}
              {!isSelfMode && <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) خدمة الدين":"(−) Debt Service"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.debtService</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-(f.debtService[y]||0))}</td>)}</tr>}
              {!isSelfMode && <tr><td style={{...tdL,color:"#3b82f6"}}>{ar?"(+) سحب القرض":"(+) Drawdown"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.drawdown</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#3b82f6"}}>{fmtC(f.drawdown[y]||0)}</td>)}</tr>}
              <tr><td style={{...tdL,color:"#16a34a"}}>{ar?"(+) حصيلة التخارج":"(+) Exit Proceeds"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.exitProceeds</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:f.exitProceeds[y]>0?"#16a34a":"#9ca3af"}}>{fmtC(f.exitProceeds[y]||0)}</td>)}</tr>
              <tr><td style={{...tdL,color:"#ef4444"}}>{ar?"(−) رسم المطور":"(−) Developer Fee"}</td><td style={{...tdS,fontSize:9,color:"var(--text-tertiary)"}}>f.devFeeSchedule</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,color:"#ef4444"}}>{fmtC(-(f.devFeeSchedule?.[y]||0))}</td>)}</tr>
              {/* RESULT */}
              <tr style={{background:"#1e3a5f"}}>
                <td style={{...tdL,background:"#1e3a5f",color:"#fff",fontWeight:700,borderTop:"2px solid #2563eb"}}>{ar?"= التدفق الممول":"= Levered CF"}</td>
                <td style={{...tdS,background:"#1e3a5f",color:"#93c5fd",fontSize:9,borderTop:"2px solid #2563eb"}}>f.leveredCF</td>
                {tracerYears.map(y=><td key={y} style={{...tdS,background:"#1e3a5f",color:f.leveredCF[y]>0?"#86efac":f.leveredCF[y]<0?"#fca5a5":"#6b7280",fontWeight:700,borderTop:"2px solid #2563eb"}}>{fmtC(f.leveredCF[y])}</td>)}
              </tr>
              {/* VERIFICATION */}
              <tr style={{background:"#fefce8"}}>
                <td style={{...tdL,background:"#fefce8",color:"#92400e",fontSize:9}}>{ar?"✓ تحقق (حساب مستقل)":"✓ Verify (independent calc)"}</td>
                <td style={{...tdS,background:"#fefce8",fontSize:10,color:"var(--text-tertiary)"}}>{ar?"يدوي":"manual"}</td>
                {tracerYears.map(y=>{
                  let exp;
                  if (fSold && y > exitYrIdx) { exp = 0; }
                  else if (isSelfMode) {
                    const adjNetCF = ir?.adjustedNetCF?.[y] ?? (c.income[y] - c.landRent[y] - c.capex[y]);
                    exp = adjNetCF - (f.devFeeSchedule?.[y]||0) + (f.exitProceeds[y]||0);
                  } else {
                    exp = c.income[y] - adjLR[y] - c.capex[y] + (ir?.capexGrantSchedule?.[y]||0) + (ir?.feeRebateSchedule?.[y]||0) - (f.debtService[y]||0) + (f.drawdown[y]||0) + (f.exitProceeds[y]||0) - (f.devFeeSchedule?.[y]||0);
                  }
                  const match = Math.abs((f.leveredCF[y]||0) - exp) < 1;
                  return <td key={y} style={{...tdS,background:match?"#fefce8":"#fef2f2",color:match?"#16a34a":"#ef4444",fontWeight:700,fontSize:9}}>{match?"✓":"✗ "+fmtC(exp)}</td>;
                })}
              </tr>
              {/* CUMULATIVE */}
              {(() => { let cum = 0; return <tr style={{background:"#f0f4ff"}}>
                <td style={{...tdL,background:"#f0f4ff",color:"#2563eb",fontWeight:600}}>{ar?"↳ تراكمي":"↳ Cumulative"}</td>
                <td style={{...tdS,background:"#f0f4ff"}}></td>
                {tracerYears.map(y => { cum += f.leveredCF[y]||0; return <td key={y} style={{...tdS,background:"#f0f4ff",color:cum>0?"#16a34a":"#ef4444",fontWeight:600}}>{fmtC(cum)}</td>; })}
              </tr>; })()}
            </tbody>
          </table>
          {/* FOOTER */}
          <div style={{padding:"10px 16px",background:"var(--surface-table-header)",borderTop:"1px solid #e5e7ec",display:"flex",gap:20,flexWrap:"wrap",fontSize:10,color:"var(--text-secondary)"}}>
            <span>IRR: <strong style={{color:"#2563eb"}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(2)+"%":"N/A"}</strong> <span style={{fontSize:9}}>(calcIRR(f.leveredCF))</span></span>
            <span>{ar?"مجموع":"Sum"}: <strong>{fmtC(f.leveredCF.reduce((a,b)=>a+b,0))}</strong></span>
            {fSold && <span>{ar?"تخارج سنة":"Exit Yr"}: <strong>{f.exitYear}</strong> ({ar?"بعدها = صفر":"post-exit = 0"})</span>}
            <span style={{marginInlineStart:"auto",fontSize:9,color:"var(--text-tertiary)"}}>{ar?"كل الأرقام من f.* (financing engine) مباشرة — لا إعادة حساب":"All numbers from f.* (financing engine) directly — no recomputation"}</span>
          </div>
        </div>}
      </div>;
    })()}

    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}
// EditableCell — imported from ./components/shared/EditableCell.jsx

// SidebarInput — imported from ./components/shared/SidebarInput.jsx

// ═══════════════════════════════════════════════════════════════
// MOBILE RESPONSIVE HOOK
// useIsMobile — imported from ./components/shared/hooks

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

function ReDevModelerInner({ user, signOut, onSignIn, publicAcademy, exitAcademy, adminProject, readOnly }) {
  const isMobile = useIsMobile();
  // ── Public Academy Mode state (hook must run unconditionally) ──
  const [publicLang, setPublicLang] = useState("ar");
  // NOTE: publicAcademy early return moved AFTER all hooks (line ~3674) to avoid React hooks violation
  // ── Initialize navigation from URL hash (unless share link is pending) ──
  const _initNav = useMemo(() => {
    if (typeof window === "undefined") return { view: "dashboard", projectId: null, tab: "dashboard" };
    const params = new URLSearchParams(window.location.search);
    if (params.get("s") && params.get("o")) return { view: "dashboard", projectId: null, tab: "dashboard" }; // share link takes priority
    return parseNavHash();
  }, []);
  const _initProjectId = useRef(_initNav.view === "editor" ? _initNav.projectId : null);
  const [view, setView] = useState(adminProject ? "editor" : (_initNav.view === "editor" ? "editor" : _initNav.view));
  const [projectIndex, setProjectIndex] = useState([]);
  const [project, setProject] = useState(adminProject || null);
  const [loading, setLoading] = useState(!adminProject);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(_initNav.tab || "dashboard");
  const [globalExpand, setGlobalExpand] = useState(0); // increment to toggle; odd=expand, even=collapse
  const [kpiPhase, setKpiPhase] = useState("all"); // phase selection for sticky KPI bar
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lang, setLang] = useState("ar");
  useEffect(() => { document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { window.__zanOpenAcademy = () => { setView("academy"); pushNavHash("academy",null,null); window.scrollTo(0,0); }; return () => { delete window.__zanOpenAcademy; }; }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  // ── Sync URL hash with navigation state ──
  useEffect(() => { setNavHash(view, project?.id || null, activeTab); }, [view, project?.id, activeTab]);
  // ── Browser back/forward button support ──
  useEffect(() => {
    const onPopState = () => {
      const nav = parseNavHash();
      if (nav.view === "dashboard") { setView("dashboard"); setProject(null); setActiveTab("dashboard"); }
      else if (nav.view === "academy") { setView("academy"); }
      else if (nav.view === "editor" && nav.projectId) {
        if (project?.id !== nav.projectId) {
          // Different project — need to load it
          const meta = projectIndex.find(p => p.id === nav.projectId);
          if (meta) {
            loadProject(nav.projectId, meta._ownerId, meta._permission).then(p => {
              if (p) { setProject(p); setView("editor"); setActiveTab(nav.tab || "dashboard"); }
              else { setView("dashboard"); setProject(null); }
            });
          } else { setView("dashboard"); setProject(null); }
        } else { setActiveTab(nav.tab || "dashboard"); }
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [project?.id, projectIndex]);
  const [aiOpen, setAiOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  // ── Toast Notification System ──
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, duration);
  }, []);
  // ── Share Link Detection ──
  const [pendingShare, setPendingShare] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s"), o = params.get("o");
    if (s && o) return { projectId: s, ownerId: o };
    return null;
  });
  // ── Presentation Mode (Sprint 2) ──
  const [presentMode, setPresentMode] = useState(false);
  const [audienceView, setAudienceView] = useState("bank"); // bank | investor
  const [liveSliders, setLiveSliders] = useState({ capex: 100, rent: 100, exitMult: 10 });
  const t = L[lang];
  const ar = lang === "ar";
  const autoSaveTimer = useRef(null);
  const sidebarRef = useRef(null);

  // NOTE: LandingPage early return moved AFTER all hooks (line ~3770) to avoid React hooks violation

  useEffect(() => { (async () => {
    const own = await loadProjectIndex();
    const shared = user?.email ? await loadSharedProjects(user.email) : [];
    // Merge: own projects + shared (avoid duplicates)
    const ownIds = new Set(own.map(p => p.id));
    const merged = [...own, ...shared.filter(p => !ownIds.has(p.id))];
    setProjectIndex(merged);
    setLoading(false);
    // ── Handle pending share link ──
    if (pendingShare && user) {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      const { projectId, ownerId } = pendingShare;
      // If it's own project, just open it
      const ownMatch = merged.find(p => p.id === projectId && !p._shared);
      if (ownMatch) { setPendingShare(null); const p = await loadProject(projectId); if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); } return; }
      // Try to open as shared
      try {
        const p = await loadProject(projectId, ownerId, "view");
        if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); }
      } catch (e) { console.error("Share link error:", e); }
      setPendingShare(null);
    }
    // ── Handle hash-based project restore (if no share link) ──
    if (!pendingShare && _initProjectId.current) {
      const targetId = _initProjectId.current;
      _initProjectId.current = null;
      const meta = merged.find(p => p.id === targetId);
      if (meta) {
        const p = await loadProject(targetId, meta._ownerId, meta._permission);
        if (p) { setProject(p); setView("editor"); }
        else { setView("dashboard"); setActiveTab("dashboard"); setNavHash("dashboard", null, null); }
      } else { setView("dashboard"); setActiveTab("dashboard"); setNavHash("dashboard", null, null); }
    }
  })(); }, [user]);

  useEffect(() => {
    if (!project || view !== "editor" || project._permission === "view") return;
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try { await saveProject(project); setProjectIndex(await loadProjectIndex()); setSaveStatus("saved"); }
      catch { setSaveStatus("error"); addToast(ar?"فشل الحفظ التلقائي":"Auto-save failed","error"); }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [project, view]);

  // ── Redirect if active tab becomes hidden (e.g. switching to self mode) ──
  useEffect(() => {
    if (!project || view !== "editor") return;
    const fm = project.finMode || "self";
    const hidden = new Set();
    if (fm === "self") hidden.add("financing");
    if (hidden.has(activeTab)) setActiveTab("dashboard");
  }, [project?.finMode, activeTab, view]);

  const results = useMemo(() => { try { return project ? computeProjectCashFlows(project) : null; } catch(e) { console.error("computeProjectCashFlows error:", e); return null; } }, [project]);
  const incentivesResult = useMemo(() => { try { return project && results ? computeIncentives(project, results) : null; } catch(e) { console.error("computeIncentives error:", e); return null; } }, [project, results]);
  // Consolidated financing & waterfall (legacy - full field set for UI)
  const _legacyFinancing = useMemo(() => { try { return project && results ? computeFinancing(project, results, incentivesResult) : null; } catch(e) { console.error("computeFinancing error:", e); return null; } }, [project, results, incentivesResult]);
  const _legacyWaterfall = useMemo(() => { try { return project && results && _legacyFinancing ? computeWaterfall(project, results, _legacyFinancing, incentivesResult) : null; } catch(e) { console.error("computeWaterfall error:", e); return null; } }, [project, results, _legacyFinancing, incentivesResult]);
  // Per-phase independent financing & waterfall (new architecture - for phase tabs)
  const independentPhaseResults = useMemo(() => { try { return project && results ? computeIndependentPhaseResults(project, results, incentivesResult) : null; } catch(e) { console.error("independentPhaseResults error:", e); return null; } }, [project, results, incentivesResult]);
  // Consolidated: prefer aggregated sum of per-phase results (ensures Consolidated = ZAN1+ZAN2+ZAN3)
  const financing = useMemo(() => independentPhaseResults?.consolidatedFinancing || _legacyFinancing, [independentPhaseResults, _legacyFinancing]);
  const waterfall = useMemo(() => independentPhaseResults?.consolidatedWaterfall || _legacyWaterfall, [independentPhaseResults, _legacyWaterfall]);
  // Phase waterfalls: prefer independent results for phase tabs
  const phaseWaterfalls = useMemo(() => { try { if (independentPhaseResults?.phaseWaterfalls && Object.keys(independentPhaseResults.phaseWaterfalls).length > 0) return independentPhaseResults.phaseWaterfalls; return computePhaseWaterfalls(project, results, _legacyFinancing, _legacyWaterfall); } catch(e) { console.error("computePhaseWaterfalls error:", e); return null; } }, [project, results, _legacyFinancing, _legacyWaterfall, independentPhaseResults]);
  // Phase financings: from independent results
  const phaseFinancings = useMemo(() => independentPhaseResults?.phaseFinancings || {}, [independentPhaseResults]);
  const checks = useMemo(() => { try { return project && results ? runChecks(project, results, financing, waterfall, incentivesResult) : []; } catch(e) { console.error("runChecks error:", e); return []; } }, [project, results, financing, waterfall, incentivesResult]);

  const createProject = async (templateId) => {
    const p = defaultProject();
    const tmpl = templateId ? PROJECT_TEMPLATES.find(t=>t.id===templateId) : null;
    if (tmpl && tmpl.id !== "blank") {
      p.landType = tmpl.landType;
      p.finMode = tmpl.finMode;
      p.exitStrategy = tmpl.exitStrategy;
      p.phases = tmpl.phases.map(ph=>({...ph}));
      p.assets = tmpl.assets.map(a=>({...a, id:crypto.randomUUID(), hotelPL:null, marinaPL:null}));
    }
    await saveProject(p); setProjectIndex(await loadProjectIndex()); setProject({...p, _setupDone: false}); setView("editor"); setActiveTab("dashboard"); pushNavHash("editor", p.id, "dashboard"); window.scrollTo(0,0);
  };
  const openProject = async (id) => { setLoading(true); const meta = projectIndex.find(p => p.id === id); const p = await loadProject(id, meta?._ownerId, meta?._permission); if (p) { setProject(p); setView("editor"); setActiveTab("dashboard"); pushNavHash("editor", p.id, "dashboard"); window.scrollTo(0,0); } setLoading(false); };
  const duplicateProject = async (id) => { const p = await loadProject(id); if (p) { const d={...p,id:crypto.randomUUID(),name:p.name+" (Copy)",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await saveProject(d); setProjectIndex(await loadProjectIndex()); addToast(ar?"تم نسخ المشروع":"Project duplicated","success"); }};
  const deleteProject = async (id) => { await deleteProjectStorage(id); setProjectIndex(await loadProjectIndex()); if (project?.id===id){setProject(null);setView("dashboard");setNavHash("dashboard",null,null);} addToast(ar?"تم حذف المشروع":"Project deleted","info"); };

  // ── Undo History (last 30 states) ──
  const undoStack = useRef([]);
  const pushUndo = useCallback((state) => {
    if (!state) return;
    undoStack.current.push(JSON.stringify(state));
    if (undoStack.current.length > 30) undoStack.current.shift();
  }, []);
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = JSON.parse(undoStack.current.pop());
    setProject(prev);
  }, []);

  // Ctrl+Z handler
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Don't undo if user is typing in an input
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  const up = useCallback((u) => {
    if (readOnly) return; // Admin read-only mode — block all edits
    const scrollTop = sidebarRef.current?.scrollTop;
    setProject(prev => { pushUndo(prev); return {...prev,...(typeof u === 'function' ? u(prev) : u)}; });
    if (scrollTop != null) {
      requestAnimationFrame(() => {
        if (sidebarRef.current) sidebarRef.current.scrollTop = scrollTop;
      });
    }
  }, [pushUndo, readOnly]);
  const upAsset = useCallback((i, u) => {
    if (readOnly) return;
    const scrollTop = sidebarRef.current?.scrollTop;
    setProject(prev => { pushUndo(prev); const a=[...prev.assets]; a[i]={...a[i],...u}; return {...prev,assets:a}; });
    if (scrollTop != null) requestAnimationFrame(() => { if (sidebarRef.current) sidebarRef.current.scrollTop = scrollTop; });
  }, [pushUndo, readOnly]);
  const addAsset = useCallback((tmplDefaults) => setProject(prev => { pushUndo(prev); const base = {
    id: crypto.randomUUID(), phase: prev.phases[0]?.name||"Phase 1", category:"Retail", name:"", code:"", notes:"",
    plotArea:0, footprint:0, gfa:0, revType:"Lease", efficiency: prev.defaultEfficiency||85,
    leaseRate:0, opEbitda:0, escalation: prev.rentEscalation||0.75, rampUpYears:3, stabilizedOcc:100,
    costPerSqm:0, constrStart:0, constrDuration:12, hotelPL:null, marinaPL:null,
  }; return {...prev, assets:[...prev.assets, tmplDefaults ? {...base,...tmplDefaults} : base]}; }), [pushUndo]);
  const dupAsset = useCallback((i) => setProject(prev => { pushUndo(prev); const src = prev.assets[i]; if(!src) return prev; const copy = {...src, id:crypto.randomUUID(), name:(src.name||"")+" (Copy)"}; return {...prev, assets:[...prev.assets, copy]}; }), [pushUndo]);
  const rmAsset = useCallback((i) => setProject(prev => { pushUndo(prev); return {...prev, assets:prev.assets.filter((_,j)=>j!==i)}; }), [pushUndo]);
  const goBack = () => { setView("dashboard"); setProject(null); pushNavHash("dashboard", null, null); window.scrollTo(0,0); };

  // ── Landing page (no auth) — moved here to run AFTER all hooks ──
  // Skip landing page if admin is viewing a project (adminProject prop)
  if (!user && !loading && !adminProject) return <LandingPage onSignIn={onSignIn} lang={lang} setLang={setLang} pendingShare={pendingShare} />;

  // ── Public Academy Mode (no auth required) — moved here to run AFTER all hooks ──
  if (publicAcademy) {
    return <LearningCenterView lang={publicLang} onBack={exitAcademy || (() => {})} onCreateDemo={null} publicMode={true} onLangToggle={() => setPublicLang(l => l === "ar" ? "en" : "ar")} />;
  }

  if (loading) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}><style>{`@keyframes zanShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style><div style={{textAlign:"center",width:360,maxWidth:"90vw"}}><div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:24}}><span style={{fontSize:36,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>Haseef</span><span style={{width:1,height:30,background:"rgba(46,196,182,0.4)"}} /><span style={{fontSize:12,color:"#2EC4B6",fontWeight:300,lineHeight:1.3,textAlign:"start"}}>النمذجة<br/>المالية</span></div><div style={{display:"flex",flexDirection:"column",gap:12}}>{[200,160,240,180].map((w,i)=><div key={i} style={{height:14,width:w,maxWidth:"100%",borderRadius:6,background:"linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",backgroundSize:"200% 100%",animation:"zanShimmer 1.5s infinite",margin:"0 auto"}} />)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:20}}>{lang==="ar"?"جاري التحميل...":"Loading..."}</div></div></div>;
  if (view === "academy") return <LearningCenterView lang={lang} onBack={() => { setView("dashboard"); pushNavHash("dashboard",null,null); window.scrollTo(0,0); }} onCreateDemo={async (demo) => {
    const p = defaultProject();
    const ar = lang === "ar";
    const demoName = ar ? demo.title.ar : demo.title.en;
    p.name = demoName + (ar ? " - نموذج تعليمي" : " - Educational Demo");
    if (demo.overrides) {
      const ov = demo.overrides;
      Object.keys(ov).forEach(k => {
        if (k === "assets") {
          p.assets = ov.assets.map(a => ({ ...a, id: crypto.randomUUID(), hotelPL: null, marinaPL: null }));
        } else if (k === "phases") {
          p.phases = ov.phases.map(ph => ({ ...ph }));
        } else if (k === "incentives") {
          p.incentives = JSON.parse(JSON.stringify(ov.incentives));
        } else if (k !== "name") {
          p[k] = ov[k];
        }
      });
    }
    await saveProject(p); setProjectIndex(await loadProjectIndex()); setProject(p); setView("editor"); setActiveTab("dashboard"); window.scrollTo(0, 0);
  }} />;
  if (view === "dashboard") return <ProjectsDashboard index={projectIndex} onCreate={createProject} onOpen={openProject} onDup={duplicateProject} onDel={deleteProject} lang={lang} setLang={setLang} t={t} user={user} signOut={signOut} onOpenAcademy={() => { setView("academy"); window.scrollTo(0,0); }} />;
  if (!project) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1117",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:"#f87171",letterSpacing:2}}>!</div><div style={{fontSize:14,color:"#d0d4dc",marginTop:8}}>{lang==="ar"?"لم يتم تحميل المشروع":"Project failed to load"}</div><button onClick={goBack} style={{marginTop:16,padding:"8px 20px",background:"#2563eb",color:"#fff",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{lang==="ar"?"رجوع":"Go Back"}</button></div></div>;

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} style={{display:"flex",height:"100vh",fontFamily:"var(--font-family)",background:"var(--surface-page)",color:"var(--text-primary)",fontSize:13}}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
        @keyframes zanShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes zanTabFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zanModalIn { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        .zan-shimmer { background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.04) 75%); background-size: 200% 100%; animation: zanShimmer 1.5s infinite; border-radius: 6px; }
        .zan-tab-content { animation: zanTabFade 0.2s ease-out; }
        /* ═══ TYPOGRAPHY SCALE ═══ */
        .zan-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
        .zan-section { font-size: 1.5rem; font-weight: 700; line-height: 1.3; }
        .zan-subsection { font-size: 1.125rem; font-weight: 600; line-height: 1.4; }
        .zan-body { font-size: 0.9375rem; font-weight: 400; line-height: 1.6; }
        .zan-label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); }
        .zan-small { font-size: 0.75rem; color: var(--text-tertiary); }
        .zan-metric { font-size: 1.75rem; font-weight: 700; font-variant-numeric: tabular-nums; }
        /* ═══ CARD SYSTEM ═══ */
        .zan-card { background: var(--surface-card); border-radius: var(--radius-xl); border: 0.5px solid var(--border-default); box-shadow: var(--shadow-sm); }
        .zan-card-dark { background: rgba(15,17,23,0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
        /* ═══ SPACING HELPERS ═══ */
        .zan-gap-sm { gap: 8px; }
        .zan-gap-md { gap: 12px; }
        .zan-gap-lg { gap: 20px; }
        .zan-section-gap { margin-bottom: 24px; }
        /* ═══ FOCUS RING ═══ */
        input:focus-visible, select:focus-visible, button:focus-visible { outline: 2px solid var(--zan-teal-500); outline-offset: 2px; }
        .hero-kpi { animation: fadeInUp 0.4s ease-out both; }
        .hero-kpi:nth-child(1) { animation-delay: 0s; }
        .hero-kpi:nth-child(2) { animation-delay: 0.08s; }
        .hero-kpi:nth-child(3) { animation-delay: 0.16s; }
        .hero-kpi:nth-child(4) { animation-delay: 0.24s; }
        .asset-card { animation: fadeInUp 0.3s ease-out both; transition: box-shadow 0.15s, border-color 0.15s; }
        .kpi-secondary { animation: fadeIn 0.5s ease-out both; animation-delay: 0.3s; }
        .zan-btn-prim:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .zan-btn-export:hover { filter: brightness(0.97); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        table tbody tr { transition: background 0.1s; }
        [dir="rtl"] { text-align: right; }
        [dir="rtl"] th, [dir="rtl"] td { text-align: start; }
        [dir="rtl"] td[style*="text-align: right"], [dir="rtl"] td[style*="text-align:right"] { text-align: right !important; }
        [dir="rtl"] [style*="position: sticky"], [dir="rtl"] [style*="position:sticky"] { left: auto !important; right: 0 !important; }
        [dir="rtl"] input, [dir="rtl"] select, [dir="rtl"] textarea { text-align: start; }
        [dir="rtl"] label { text-align: start; }
        [dir="rtl"] button { text-align: start; }
        [dir="rtl"] .cm-editor { direction: ltr; }
        /* ═══ MOBILE RESPONSIVE ═══ */
        @media (max-width: 768px) {
          /* Touch targets minimum 44px */
          button, select, input, .touch-target { min-height: 44px; }
          select { font-size: 14px !important; padding: 10px 12px !important; }
          /* Sidebar inputs bigger */
          .sidebar-input { font-size: 14px !important; padding: 10px 12px !important; min-height: 44px !important; }
          /* Tab bar scrollable with momentum */
          .tab-bar { -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity; scrollbar-width: none; }
          .tab-bar::-webkit-scrollbar { display: none; }
          .tab-bar button { scroll-snap-align: start; min-height: 44px !important; padding: 10px 14px !important; font-size: 12px !important; }
          /* Tables horizontal scroll */
          .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -10px; padding: 0 10px; }
          .table-wrap table { min-width: 600px; }
          /* Grid layouts stack on mobile */
          .mobile-stack { grid-template-columns: 1fr !important; }
          .mobile-2col { grid-template-columns: 1fr 1fr !important; }
          /* KPI cards */
          .hero-kpi { min-width: 140px !important; }
          /* Modals full width */
          .modal-content { width: 96vw !important; max-width: 96vw !important; padding: 16px !important; }
          /* Hide on mobile */
          .desktop-only { display: none !important; }
          /* Sidebar advisor compact */
          .sidebar-advisor { max-height: 35vh; }
          /* Prevent zoom on input focus (iOS) */
          input[type="text"], input[type="number"], input[type="email"], input[type="password"], select, textarea { font-size: 16px !important; }
        }
        @media (max-width: 480px) {
          .hero-kpi { min-width: 100% !important; }
          .tab-bar button { padding: 10px 10px !important; font-size: 11px !important; }
        }
        /* Smooth sidebar transition */
        .sidebar-slide { transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
        /* ═══ ACCESSIBILITY ═══ */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
        /* ═══ SCROLLBAR POLISH ═══ */
        .table-wrap::-webkit-scrollbar { height: 6px; }
        .table-wrap::-webkit-scrollbar-track { background: #f0f1f5; border-radius: 3px; }
        .table-wrap::-webkit-scrollbar-thumb { background: #c4c8d0; border-radius: 3px; }
        .table-wrap::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        /* ═══ PRINT ═══ */
        @media print { .sidebar-slide, .toast-container, button { display: none !important; } }
      `}</style>
      {/* ── Toast Container ── */}
      {toasts.length > 0 && (
        <div style={{position:"fixed",top:16,right:16,zIndex:99999,display:"flex",flexDirection:"column",gap:8,maxWidth:360,pointerEvents:"none"}}>
          {toasts.map(t=>{
            const bg = {success:"#065f46",error:"#991b1b",warning:"#92400e",info:"#1e40af"}[t.type]||"#065f46";
            const icon = {success:"✓",error:"✕",warning:"⚠",info:"ℹ"}[t.type]||"✓";
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:10,background:bg,color:"#fff",fontSize:13,fontWeight:500,boxShadow:"0 8px 24px rgba(0,0,0,0.3)",animation:t.exiting?"toastOut 0.35s ease forwards":"toastIn 0.3s ease",pointerEvents:"auto",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
                <span style={{fontSize:15,fontWeight:700,flexShrink:0,width:22,height:22,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{icon}</span>
                <span style={{flex:1,lineHeight:1.4}}>{t.message}</span>
              </div>
            );
          })}
        </div>
      )}
      {sidebarOpen && !presentMode && (
        <>
        {isMobile && <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:90,backdropFilter:"blur(2px)"}} />}
        <div className="sidebar-slide" style={{width:isMobile?"88vw":340,minWidth:isMobile?"auto":340,maxWidth:isMobile?400:340,background:"linear-gradient(180deg, #0f1117 0%, #0B2341 100%)",color:"#d0d4dc",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",...(isMobile?{position:"fixed",top:0,bottom:0,[lang==="ar"?"right":"left"]:0,zIndex:91,boxShadow:"4px 0 24px rgba(0,0,0,0.4)"}:{})}}>
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 30% 20%, rgba(46,196,182,0.04) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(200,169,110,0.03) 0%, transparent 50%)",pointerEvents:"none"}} />
          <div style={{padding:isMobile?"12px 14px":"14px 16px",borderBottom:"1px solid #1e2230",display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,fontWeight:900,color:"#fff",letterSpacing:2}}>{lang==="ar"?"حصيف":"Haseef"}</span><span style={{width:1,height:18,background:"#2EC4B6",opacity:0.6}} /><span style={{fontSize:9,color:"#2EC4B6",lineHeight:1.3,fontWeight:400}}>{lang==="ar"?"النمذجة":"Financial"}<br/>{lang==="ar"?"المالية":"Modeler"}</span></div>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,background:saveStatus==="saved"?"#dcfce7":saveStatus==="error"?"#2a0a0a":"#2a2a0a",color:saveStatus==="saved"?"#4ade80":saveStatus==="error"?"#f87171":"#fbbf24"}}>{t[saveStatus]||saveStatus}</span>
            {isMobile && <button onClick={()=>setSidebarOpen(false)} style={{background:"#1e2230",border:"none",borderRadius:6,color:"var(--text-tertiary)",fontSize:16,padding:"6px 10px",cursor:"pointer",minHeight:36,display:"flex",alignItems:"center"}}>✕</button>}
          </div>
          <div ref={sidebarRef} style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <ControlPanel project={project} up={up} t={t} lang={lang} results={results} globalExpand={globalExpand} />
          </div>
          <SidebarAdvisor project={project} results={results} financing={financing} waterfall={waterfall} incentivesResult={incentivesResult} lang={lang} setActiveTab={setActiveTab} />
        </div>
        </>
      )}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:isMobile?44:48,minHeight:isMobile?44:48,background:"var(--surface-nav)",borderBottom:"1px solid var(--nav-tab-border)",display:"flex",alignItems:"center",padding:isMobile?"0 8px":"0 12px",gap:isMobile?4:8}}>
          {/* Back to projects */}
          <button onClick={goBack} className="z-nav-btn" style={{padding:isMobile?"8px 10px":"5px 10px",fontSize:isMobile?11:11,minHeight:isMobile?36:undefined,flexShrink:0}}>{isMobile?"→":t.back}</button>
          {(() => {
            // Compute sidebar warning badge
            let _advWarn = 0;
            if (results && financing) {
              const _dv = financing.dscr ? financing.dscr.filter(d=>d!==null) : [];
              const _md = _dv.length > 0 ? Math.min(..._dv) : null;
              if (_md !== null && _md < 1.2) _advWarn++;
              const _npv = results.consolidated?.npv10 || 0;
              if (_npv < 0) _advWarn++;
              if ((project?.maxLtvPct||0) > 80) _advWarn++;
            }
            if ((project?.assets||[]).some(a => benchmarkColor("costPerSqm",a.costPerSqm,a.category).color==="#ef4444")) _advWarn++;
            if (project?.market?.enabled) {
              const _mg=project.market.gaps||{},_mt=project.market.thresholds||{};
              ["Retail","Office","Hospitality","Residential","Marina","Industrial"].forEach(sec=>{
                const gap=_mg[sec]?.gap||0; if(gap<=0) return;
                const aa=(project.assets||[]).filter(a2=>{const c2=(a2.category||"").toLowerCase();return c2.includes(sec.toLowerCase())||(sec==="Retail"&&c2.includes("commercial"))||(sec==="Hospitality"&&(c2.includes("hotel")||c2.includes("resort")));});
                const supply=sec==="Hospitality"?aa.reduce((s,a2)=>s+(a2.hotelPL?.keys||0),0):sec==="Marina"?aa.reduce((s,a2)=>s+(a2.marinaPL?.berths||0),0):aa.reduce((s,a2)=>s+(a2.gfa||0)*((a2.efficiency||0)/100),0);
                if(supply>0&&(supply/gap*100)>(_mt[sec]?.med||70)) _advWarn++;
              });
            }
            return (
              <button onClick={()=>setSidebarOpen(!sidebarOpen)} title={sidebarOpen?(lang==="ar"?"إخفاء اللوحة":"Hide Panel"):(lang==="ar"?"إظهار اللوحة":"Show Panel")} className="z-nav-btn" style={{padding:isMobile?"4px 8px":"6px 10px",fontSize:isMobile?13:14,flexShrink:0,position:"relative",background:sidebarOpen?"var(--nav-btn-hover)":"var(--nav-btn-bg)",border:sidebarOpen?"1px solid var(--zan-teal-500)":"0.5px solid var(--nav-btn-border)"}}>
                ☰
                {!sidebarOpen && _advWarn > 0 && <span style={{position:"absolute",top:1,right:1,width:7,height:7,borderRadius:4,background:"#ef4444",border:"1.5px solid var(--surface-nav)"}} />}
              </button>
            );
          })()}
          <div style={{flex:1,minWidth:0}}>
            <EditableCell value={project?.name||""} onChange={v=>up({name:v})} style={{border:"none",fontSize:isMobile?13:15,fontWeight:600,color:"var(--nav-logo-text)",background:"transparent",width:"100%",padding:"4px 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} placeholder="Project Name" />
          </div>
          {project?._shared && <span className={project._permission==="view"?"z-badge z-badge-warning":"z-badge z-badge-info"} style={{fontSize:9,flexShrink:0}}>{project._permission==="view"?(lang==="ar"?"🔒 قراءة":"🔒 View"):(lang==="ar"?"✏️ مشارك":"✏️ Edit")}</span>}
          {!isMobile && <StatusBadge status={project?.status} onChange={s=>up({status:s})} />}
          {/* Undo - desktop only */}
          {!isMobile && <button onClick={undo} disabled={undoStack.current.length===0} title="Ctrl+Z" style={{...btnS,background:"transparent",color:undoStack.current.length>0?"var(--nav-btn-text)":"var(--nav-tab-border)",padding:"5px 8px",fontSize:14,flexShrink:0,border:"none",cursor:undoStack.current.length>0?"pointer":"default"}}>↩</button>}
          {/* Present - desktop only */}
          {!isMobile && <button onClick={()=>{setPresentMode(!presentMode);if(!presentMode){setSidebarOpen(false);setActiveTab("dashboard");setLiveSliders({capex:100,rent:100,exitMult:project?.exitMultiple||10});}else{setSidebarOpen(true);}}} style={{...btnS,background:presentMode?"var(--color-success)":"var(--nav-btn-bg)",color:presentMode?"#fff":"var(--zan-teal-300)",padding:"5px 10px",fontSize:10,fontWeight:600,border:presentMode?"none":"0.5px solid var(--nav-btn-border)",flexShrink:0,borderRadius:6}}>{presentMode?(lang==="ar"?"✏️ تعديل":"✏️ Edit"):(lang==="ar"?"🎯 عرض":"🎯 Present")}</button>}
          {/* Dropdown menu */}
          {(() => {
            const [menuOpen, setMenuOpen] = [headerMenuOpen, setHeaderMenuOpen];
            return (
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setMenuOpen(!menuOpen)} style={{...btnS,background:menuOpen?"var(--nav-btn-hover)":"transparent",color:"var(--nav-btn-text)",padding:isMobile?"4px 6px":"5px 8px",fontSize:isMobile?14:16,fontWeight:500,border:"none",borderRadius:6}}>⋮</button>
                {menuOpen && <>
                  <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:998}} />
                  <div style={{position:"absolute",top:"100%",marginTop:4,background:"var(--surface-card)",border:"0.5px solid var(--border-default)",borderRadius:"var(--radius-xl)",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:999,minWidth:isMobile?120:200,padding:"6px 0",...(lang==="ar"?{left:0}:{right:0})}}>
                    {/* AI */}
                    <button onClick={()=>{setAiOpen(true);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>🤖</span> {lang==="ar"?"مساعد AI":"AI Assistant"}
                    </button>
                    {/* Present mode (mobile only) */}
                    {isMobile && <button onClick={()=>{setPresentMode(!presentMode);if(!presentMode){setSidebarOpen(false);setActiveTab("dashboard");setLiveSliders({capex:100,rent:100,exitMult:project?.exitMultiple||10});}else{setSidebarOpen(true);}setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:presentMode?"#16a34a":"#1a1d23",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>{presentMode?"✏️":"🎯"}</span> {presentMode?(lang==="ar"?"وضع التعديل":"Edit Mode"):(lang==="ar"?"وضع العرض":"Present Mode")}
                    </button>}
                    {/* Undo (mobile only) */}
                    {isMobile && undoStack.current.length>0 && <button onClick={()=>{undo();setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>↩</span> {lang==="ar"?"تراجع":"Undo"}
                    </button>}
                    {/* Status (mobile only - hidden from header) */}
                    {isMobile && <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
                      <span style={{fontSize:12,color:"var(--text-secondary)"}}>{lang==="ar"?"الحالة":"Status"}</span>
                      <StatusBadge status={project?.status} onChange={s=>{up({status:s});setMenuOpen(false);}} />
                    </div>}
                    {/* User email (mobile only) */}
                    {isMobile && user && <div style={{padding:"4px 16px 8px",fontSize:11,color:"var(--text-tertiary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
                    {/* Divider */}
                    <div style={{height:1,background:"var(--surface-sidebar)",margin:"4px 0"}} />
                    {/* Scenario */}
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
                      <span style={{fontSize:12,color:"var(--text-secondary)"}}>{lang==="ar"?"السيناريو":"Scenario"}</span>
                      <select value={project?.activeScenario||"Base Case"} onChange={e=>{up({activeScenario:e.target.value});}} style={{flex:1,padding:"4px 6px",fontSize:11,borderRadius:4,border:"0.5px solid var(--border-default)",background:project?.activeScenario!=="Base Case"?"#fef3c7":"#f8f9fb",color:project?.activeScenario!=="Base Case"?"#92400e":"#4b5060",fontFamily:"inherit",cursor:"pointer"}}>
                        {SCENARIOS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* Language */}
                    <button onClick={()=>{setLang(lang==="en"?"ar":"en");setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>{lang==="en"?"🌐":"🌐"}</span> {lang==="en"?"العربية (Arabic)":"English"}
                    </button>
                    {/* Academy */}
                    <button onClick={()=>{setView("academy");setMenuOpen(false);window.scrollTo(0,0);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>📚</span> {lang==="ar"?"أكاديمية حصيف":"Haseef Academy"}
                    </button>
                    {/* Divider */}
                    <div style={{height:1,background:"var(--surface-sidebar)",margin:"4px 0"}} />
                    {/* Share */}
                    {!project?._shared && <button onClick={()=>{setShareModalOpen(true);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>📤</span> {lang==="ar"?"مشاركة":"Share"} {project?.sharedWith?.length>0&&<span style={{marginLeft:"auto",fontSize:10,background:"#dbeafe",color:"#2563eb",padding:"1px 6px",borderRadius:8}}>{project.sharedWith.length}</span>}
                    </button>}
                    {/* Sign Out */}
                    {signOut && <button onClick={()=>{signOut();setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"none",border:"none",fontSize:12,color:"#ef4444",cursor:"pointer",fontFamily:"inherit",textAlign:"start"}}>
                      <span style={{fontSize:14}}>↪</span> {lang==="ar"?"تسجيل خروج":"Sign Out"}
                    </button>}
                  </div>
                </>}
              </div>
            );
          })()}
        </div>
        <div className="tab-bar" style={{background:"var(--surface-tab-bar)",borderBottom:"1px solid var(--nav-tab-border)",display:"flex",padding:"0 16px",gap:0,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          {presentMode ? (
            /* Presentation Mode Tab Bar */
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",width:"100%"}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--tab-text-active)",letterSpacing:0.5}}>{ar?"وضع العرض":"Presentation Mode"}</span>
              <div style={{width:1,height:20,background:"var(--nav-tab-border)"}} />
              <button onClick={()=>setAudienceView("bank")} style={{...btnS,padding:"6px 16px",fontSize:11,fontWeight:600,background:audienceView==="bank"?"var(--zan-teal-500)":"var(--nav-btn-bg)",color:audienceView==="bank"?"#fff":"var(--tab-text)",borderRadius:20,border:"none"}}>{ar?"🏦 عرض البنك":"🏦 Bank View"}</button>
              <button onClick={()=>setAudienceView("investor")} style={{...btnS,padding:"6px 16px",fontSize:11,fontWeight:600,background:audienceView==="investor"?"#7c3aed":"var(--nav-btn-bg)",color:audienceView==="investor"?"#fff":"var(--tab-text)",borderRadius:20,border:"none"}}>{ar?"📊 عرض المستثمر":"📊 Investor View"}</button>
            </div>
          ) : (<>
          {(() => {
            const fm = project?.finMode || "self";
            const inc = project?.incentives || {};
            const hasAnyIncentive = inc.capexGrant?.enabled || inc.landRentRebate?.enabled || inc.financeSupport?.enabled || inc.feeRebates?.enabled;
            const hasFund = fm === "fund" || fm === "hybrid";
            const hasDebt = fm === "debt" || fm === "bank100" || fm === "fund" || fm === "hybrid";
            const allTabs = [
              {key:"dashboard",label:t.dashboard,group:"project"},
              {key:"assets",label:t.assetProgram,group:"project"},
              {key:"cashflow",label:t.cashFlow,group:"project"},
              {key:"financing",label:lang==="ar"?"الهيكلة المالية":"Financial Structure",group:"finance",hide:fm==="self"},
              {key:"incentives",label:lang==="ar"?"الحوافز":"Incentives",group:"finance"},
              {key:"results",label:lang==="ar"?"النتائج":"Results",group:"finance"},
              {key:"scenarios",label:lang==="ar"?"السيناريوهات":"Scenarios",group:"analysis"},
              {key:"market",label:lang==="ar"?"السوق":"Market",group:"analysis"},
              {key:"checks",label:lang==="ar"?"الفحوصات":"Checks",group:"analysis"},
              {key:"reports",label:lang==="ar"?"التقارير":"Reports",group:"export"},
            ];
            const tabs = allTabs.filter(tb => !tb.hide);
            let prevGroup = null;
            return tabs.map(tb=>{
              const isActive = activeTab===tb.key;
              const showSep = prevGroup && prevGroup !== tb.group;
              prevGroup = tb.group;
              return <span key={tb.key} style={{display:"inline-flex",alignItems:"center"}}>
                {showSep && <span style={{width:1,height:20,background:"var(--nav-tab-border)",margin:"0 6px",flexShrink:0}} />}
                <button onClick={()=>{setActiveTab(tb.key);if(isMobile)setSidebarOpen(false);}} style={{padding:isMobile?"10px 8px":"10px 12px",fontSize:isMobile?10:11,fontWeight:isActive?600:400,border:"none",cursor:"pointer",background:"none",color:isActive?"var(--tab-text-active)":"var(--tab-text)",borderBottom:isActive?"2.5px solid var(--zan-gold-500)":"2.5px solid transparent",whiteSpace:"nowrap",transition:"all 0.15s",borderRadius:"4px 4px 0 0",fontFamily:"inherit",position:"relative"}}>{tb.label}{tb.key==="checks"&&checks.some(c=>!c.pass)?" ⚠":""}</button>
              </span>;
            });
          })()}
          </>)}
        </div>
        <div style={{flex:1,overflow:"hidden",position:"relative"}}>
          {presentMode ? (
            <div style={{overflow:"auto",height:"100%",padding:isMobile?10:24}}>
            <PresentationView project={project} results={results} financing={financing} waterfall={waterfall} incentivesResult={incentivesResult} lang={lang} audienceView={audienceView} liveSliders={liveSliders} setLiveSliders={setLiveSliders} checks={checks} />
            </div>
          ) : (<>
          {/* ═══ STICKY KPI BAR + Expand/Collapse ═══ */}
          {activeTab !== "dashboard" && results?.consolidated && (() => {
            const ar = lang === "ar";
            const phaseNames = Object.keys(results.phaseResults || {});
            const hasPhases = phaseNames.length > 1;
            const fm = project?.finMode || "self";

            // ── Data sources: phase-aware ──
            const isPhase = kpiPhase !== "all" && !!results.phaseResults?.[kpiPhase];
            const pc = isPhase ? results.phaseResults[kpiPhase] : results.consolidated;
            const f  = isPhase ? phaseFinancings?.[kpiPhase] || financing : financing;
            const w  = isPhase ? phaseWaterfalls?.[kpiPhase] || waterfall : waterfall;

            // ── Derived metrics ──
            const hasDebt   = fm !== "self" && f?.totalDebt > 0;
            const hasFund   = (fm === "fund" || fm === "hybrid") && w;
            const hasInc    = !isPhase && incentivesResult?.totalIncentiveValue > 0;
            const notHold   = (project?.exitStrategy || "sale") !== "hold";
            const irr       = hasInc && incentivesResult.adjustedIRR != null ? incentivesResult.adjustedIRR : (hasDebt && f?.leveredIRR != null ? f.leveredIRR : pc.irr);
            const dscrArr   = f?.dscr?.filter(v => v != null && v > 0) || [];
            const minDscr   = dscrArr.length ? Math.min(...dscrArr) : null;
            const effLTV    = f?.devCostInclLand > 0 ? (f.totalDebt / f.devCostInclLand) * 100 : 0;
            const exitVal   = f?.exitProceeds || 0;

            // ── Build KPI list ──
            const kpis = [
              { k: "capex",   l: ar ? "التكاليف" : "CAPEX",     v: fmtM(pc.totalCapex || 0), c: "#ef4444" },
              { k: "revenue", l: ar ? "الإيرادات" : "Revenue",   v: fmtM(pc.totalIncome || 0), c: "#16a34a" },
              { k: "irr",     l: "IRR",                          v: irr != null ? (irr * 100).toFixed(1) + "%" : "—", c: getMetricColor("IRR", irr) },
            ];
            if (fm === "self" && !isPhase)
              kpis.push({ k: "npv", l: "NPV", v: fmtM(calcNPV(pc.netCF, 0.10)), c: getMetricColor("NPV", calcNPV(pc.netCF, 0.10)) });
            if (hasDebt) {
              kpis.push({ k: "dscr", l: "DSCR", v: minDscr != null ? minDscr.toFixed(2) + "x" : "—", c: getMetricColor("DSCR", minDscr) });
              kpis.push({ k: "ltv",  l: "LTV",  v: effLTV > 0 ? effLTV.toFixed(0) + "%" : "—", c: getMetricColor("LTV", effLTV) });
            }
            if (hasFund) {
              kpis.push({ k: "lpirr", l: ar?"عائد المستثمر":"Investor IRR", v: w.lpIRR != null ? (w.lpIRR * 100).toFixed(1) + "%" : "—", c: getMetricColor("IRR", w.lpIRR) });
              kpis.push({ k: "moic",  l: "MOIC",   v: w.lpMOIC ? w.lpMOIC.toFixed(2) + "x" : "—", c: getMetricColor("MOIC", w.lpMOIC) });
            }
            if (hasDebt && notHold && exitVal > 0)
              kpis.push({ k: "exit", l: ar ? "تخارج" : "Exit", v: fmtM(exitVal), c: "#8b5cf6" });

            // ── Shared tab style ──
            const tabStyle = (active) => ({
              padding: "5px 12px", fontSize: 9, fontWeight: active ? 700 : 500,
              border: "none", borderBottom: active ? "2px solid var(--zan-teal-500)" : "2px solid transparent",
              background: "none", color: active ? "var(--zan-teal-500)" : "var(--text-tertiary)",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"
            });

            return <div style={{background:"var(--surface-table-header)",borderBottom:"0.5px solid var(--border-default)",position:"sticky",top:0,zIndex:20}}>
              <div style={{padding:isMobile?"5px 10px":"5px 18px",display:"flex",alignItems:"center",gap:isMobile?8:16,flexWrap:"nowrap",overflowX:"auto"}}>
                {hasPhases && (
                  <select value={kpiPhase} onChange={e=>setKpiPhase(e.target.value)} style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:5,border:"1px solid var(--border-default)",background:"var(--surface-card)",color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",minWidth:0,flexShrink:0}}>
                    <option value="all">{ar?"الإجمالي":"All Phases"}</option>
                    {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                {kpis.map(kpi => (
                  <div key={kpi.k} style={{display:"flex",alignItems:"baseline",gap:3,fontSize:11,flexShrink:0}}>
                    <span style={{color:"var(--text-tertiary)",fontSize:9,fontWeight:500}}>{kpi.l}</span>
                    <span style={{fontWeight:700,color:kpi.c,fontVariantNumeric:"tabular-nums"}}>{kpi.v}</span>
                  </div>
                ))}
                <div style={{flex:1}} />
                <button onClick={()=>setGlobalExpand(p=>p+1)} className="z-btn z-btn-secondary z-btn-sm" style={{fontSize:9,flexShrink:0,background:globalExpand%2===1?"var(--color-info-bg)":"var(--surface-card)",color:globalExpand%2===1?"var(--zan-teal-500)":"var(--text-secondary)"}}>
                  {globalExpand%2===1?(ar?"▲ طي":"▲ Collapse"):(ar?"▼ توسيع":"▼ Expand")}
                </button>
              </div>
            </div>;
          })()}
          {[
            ["dashboard", <ProjectDash key="dashboard" project={project} results={results} checks={checks} t={t} financing={financing} phaseFinancings={phaseFinancings} lang={lang} incentivesResult={incentivesResult} onGoToAssets={()=>{setActiveTab("assets");addAsset();}} setActiveTab={setActiveTab} />],
            ["assets", <AssetTable key="assets" project={project} upAsset={upAsset} addAsset={addAsset} dupAsset={dupAsset} rmAsset={rmAsset} results={results} t={t} lang={lang} updateProject={up} globalExpand={globalExpand} />],
            ["financing", <FinancingView key="financing" project={project} results={results} financing={financing} phaseFinancings={phaseFinancings} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} incentivesResult={incentivesResult} t={t} up={up} lang={lang} globalExpand={globalExpand} />],
            ["results", <ResultsView key="results" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} t={t} lang={lang} up={up} globalExpand={globalExpand} kpiPhase={kpiPhase} setKpiPhase={setKpiPhase} />],
            ["reports", <ReportsView key="reports" project={project} results={results} financing={financing} waterfall={waterfall} phaseWaterfalls={phaseWaterfalls} phaseFinancings={phaseFinancings} incentivesResult={incentivesResult} checks={checks} lang={lang} />],
            ["scenarios", <ScenariosView key="scenarios" project={project} results={results} financing={financing} waterfall={waterfall} lang={lang} />],
            ["market", <MarketView key="market" project={project} results={results} lang={lang} up={up} />],
            ["incentives", <IncentivesView key="incentives" project={project} results={results} incentivesResult={incentivesResult} financing={financing} lang={lang} up={up} />],
            ["cashflow", <CashFlowView key="cashflow" project={project} results={results} t={t} incentivesResult={incentivesResult} financing={financing} />],
            ["checks", <ChecksView key="checks" checks={checks} t={t} lang={lang} onFix={(tab)=>{setActiveTab(tab);window.scrollTo(0,0);}} />],
          ].map(([tabKey, tabContent]) => (
            <div key={tabKey} style={{display:activeTab===tabKey?"block":"none",overflow:"auto",height:"100%",padding:isMobile?10:18,paddingBottom:isMobile?70:80}} className={activeTab===tabKey?"zan-tab-content":undefined}>
              {tabContent}
            </div>
          ))}
          </>)}
        </div>
      </div>
      {project && project._setupDone === false && (
        <ProjectSetupWizard project={project} lang={lang}
          onUpdate={(u) => setProject(prev => ({...prev,...u}))}
          onDone={() => setProject(prev => { const p = {...prev}; delete p._setupDone; return p; })}
        />
      )}
      <AiAssistant open={aiOpen} onClose={()=>setAiOpen(false)} project={project} onApply={up} lang={lang} projectIndex={projectIndex} loadProjectFn={loadProject} results={results} financing={financing} waterfall={waterfall} />
      {shareModalOpen && project && !project._shared && <ShareModal project={project} up={up} lang={lang} user={user} onClose={()=>setShareModalOpen(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS DASHBOARD
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// QUICK SETUP WIZARD
// ═══════════════════════════════════════════════════════════════
function ProjectSetupWizard({ project, onUpdate, onDone, lang }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [eduModal, setEduModal] = useState(null);
  const t = lang === "ar";

  const Option = ({icon, label, desc, selected, onClick}) => (
    <div onClick={onClick} style={{
      background:selected?"#eff6ff":"#fff", border:selected?"2px solid #2563eb":"2px solid #e5e7ec",
      borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.15s",
      display:"flex", alignItems:"center", gap:14, minHeight:60,
    }} onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="#c7d2fe";}} onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="#e5e7ec";}}>
      <span style={{fontSize:28}}>{icon}</span>
      <div><div style={{fontSize:14,fontWeight:600,color:selected?"#2563eb":"#1a1d23"}}>{label}</div>
      {desc&&<div style={{fontSize:11,color:"var(--text-secondary)",marginTop:2}}>{desc}</div>}</div>
      {selected&&<span style={{marginInlineStart:"auto",fontSize:18,color:"#2563eb"}}>✓</span>}
    </div>
  );

  const steps = [
    // Step 0: Project name + location
    { title: t?"اسم المشروع والموقع":"Project Name & Location", content: (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,fontWeight:500}}>{t?"اسم المشروع":"Project Name"}</div>
        <input value={project.name||""} onChange={e=>onUpdate({name:e.target.value})} placeholder={t?"مثال: مشروع الواجهة البحرية":(lang==="ar"?"مثال: واجهة حصيف البحرية":"e.g. Haseef Waterfront")} style={{width:"100%",padding:"12px 16px",border:"2px solid #e5e7ec",borderRadius:10,fontSize:15,fontWeight:600,fontFamily:"inherit",outline:"none"}} autoFocus /></div>
        <div><div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,fontWeight:500}}>{t?"الموقع":"Location"}</div>
        <input value={project.location||""} onChange={e=>onUpdate({location:e.target.value})} placeholder={t?"مثال: جازان، السعودية":"e.g. Jazan, Saudi Arabia"} style={{width:"100%",padding:"10px 14px",border:"0.5px solid var(--border-default)",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}} /></div>
      </div>
    )},
    // Step 1: Land type
    { title: t?"نوع الأرض":"Land Type", subtitle: t?"كيف ستحصل على الأرض؟":"How will you acquire the land?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="📋" label={t?"إيجار أرض (حق انتفاع)":"Land Lease (Leasehold)"} desc={t?"إيجار سنوي من الحكومة/المالك":"Annual rent from government/owner"} selected={project.landType==="lease"} onClick={()=>onUpdate({landType:"lease"})} />
        <Option icon="🏠" label={t?"شراء أرض (تملك)":"Land Purchase (Freehold)"} desc={t?"شراء الأرض كاملة قبل البناء":"Buy land outright before construction"} selected={project.landType==="purchase"} onClick={()=>onUpdate({landType:"purchase"})} />
        <Option icon="🤝" label={t?"أرض كشريك (حصة عينية)":"Land as Partner (In-kind Equity)"} desc={t?"المالك يساهم بالأرض كحصة":"Landowner contributes as equity"} selected={project.landType==="partner"} onClick={()=>onUpdate({landType:"partner"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="landType" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
    // Step 2: Financing mode
    { title: t?"طريقة التمويل":"Financing Mode", subtitle: t?"كيف سيتم تمويل المشروع؟":"How will the project be funded?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="💰" label={t?"تمويل ذاتي (رأس مال كامل)":"Self-Funded (100% Equity)"} desc={t?"المطور يموّل كل شي من جيبه":"Developer funds everything"} selected={project.finMode==="self"} onClick={()=>onUpdate({finMode:"self"})} />
        <Option icon="🏦" label={t?"تمويل بنكي 100% (ملك المطور)":"100% Bank Debt (Developer-Owned)"} desc={t?"البنك يموّل كامل التكلفة، المطور هو المالك":"Bank finances 100%, developer owns"} selected={project.finMode==="bank100"} onClick={()=>onUpdate({finMode:"bank100",debtAllowed:true,maxLtvPct:100})} />
        <Option icon="🏗" label={t?"دين بنكي + رأس مال المطور":"Bank Debt + Developer Equity"} desc={t?"جزء من البنك وجزء من المطور":"Part bank loan, part developer equity"} selected={project.finMode==="debt"} onClick={()=>onUpdate({finMode:"debt",debtAllowed:true})} />
        <Option icon="📊" label={t?"صندوق استثماري (مطور/مستثمر)":"Fund Structure (Developer/Investor)"} desc={t?"مطور + مستثمرين مع شلال توزيعات":"Developer + investors with waterfall"} selected={project.finMode==="fund"} onClick={()=>onUpdate({finMode:"fund",debtAllowed:true})} />
        <Option icon="💰" label={t?"صندوق مدر للدخل":"Income Fund"} desc={t?"شراء/تطوير وتشغيل للدخل الدوري":"Buy/develop & hold for periodic income"} selected={project.finMode==="incomeFund"} onClick={()=>onUpdate({finMode:"incomeFund",debtAllowed:true,maxLtvPct:50,exitStrategy:"hold"})} />
        <Option icon="🔀" label={t?"مختلط (صندوق + تمويل)":"Hybrid (Fund + Financing)"} desc={t?"تمويل مؤسسي (بنك/حكومة) + صندوق استثماري على الباقي":"Institutional financing + fund structure on remainder"} selected={project.finMode==="hybrid"} onClick={()=>onUpdate({finMode:"hybrid",debtAllowed:true,govFinancingPct:70,govBeneficiary:"project"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="financingMode" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
    // Step 3: Exit strategy
    { title: t?"استراتيجية التخارج":"Exit Strategy", subtitle: t?"ماذا تخطط بعد الانتهاء؟":"What's your plan after completion?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="🏷" label={t?"بيع الأصل":"Sell the Asset"} desc={t?"بيع المشروع كاملاً بعد الاستقرار":"Sell entire project after stabilization"} selected={project.exitStrategy==="sale"||project.exitStrategy==="caprate"} onClick={()=>onUpdate({exitStrategy:"sale"})} />
        <Option icon="💎" label={t?"احتفاظ بالدخل (بدون بيع)":"Hold for Income (No Sale)"} desc={t?"الاستمرار بتحصيل الإيرادات":"Continue collecting income indefinitely"} selected={project.exitStrategy==="hold"} onClick={()=>onUpdate({exitStrategy:"hold"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="exitStrategy" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
  ];

  // Exit strategy is relevant for ALL modes (self can sell or hold too)
  const activeSteps = steps;
  const current = activeSteps[step];
  const isLast = step === activeSteps.length - 1;
  const canNext = step === 0 ? (project.name && project.name !== "New Project") : true;

  return (<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"var(--surface-card)",borderRadius:isMobile?14:20,width:520,maxWidth:"94vw",padding:0,boxShadow:"0 24px 80px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        {/* Progress */}
        <div style={{padding:isMobile?"14px 16px 0":"20px 28px 0",display:"flex",gap:6}}>
          {activeSteps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"#2563eb":"#e5e7ec",transition:"background 0.3s"}} />)}
        </div>
        {/* Header */}
        <div style={{padding:isMobile?"14px 16px 6px":"20px 28px 8px"}}>
          <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:6}}>
            {t?"الخطوة":"Step"} {step+1} {t?"من":"of"} {activeSteps.length}
          </div>
          <div style={{fontSize:isMobile?17:20,fontWeight:700,color:"var(--text-primary)"}}>{current.title}</div>
          {current.subtitle&&<div style={{fontSize:12,color:"var(--text-secondary)",marginTop:4}}>{current.subtitle}</div>}
        </div>
        {/* Content */}
        <div style={{padding:isMobile?"10px 16px 18px":"12px 28px 24px",minHeight:isMobile?160:200}}>{current.content}</div>
        {/* Footer */}
        <div style={{padding:isMobile?"12px 16px":"16px 28px",borderTop:"1px solid #f0f1f5",display:"flex",gap:10,justifyContent:"space-between",background:"var(--surface-hover)"}}>
          <button onClick={()=>step>0?setStep(step-1):onDone()} style={{padding:"10px 20px",borderRadius:8,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",color:"var(--text-secondary)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
            {step>0?(t?"السابق":"Back"):(t?"تخطي":"Skip")}
          </button>
          <button onClick={()=>isLast?onDone():setStep(step+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:8,border:"none",background:canNext?"#2563eb":"#e5e7ec",color:canNext?"#fff":"#9ca3af",fontSize:13,fontWeight:600,cursor:canNext?"pointer":"default",fontFamily:"inherit"}}>
            {isLast?(t?"ابدأ العمل":"Start Working"):(t?"التالي":"Next →")}
          </button>
        </div>
      </div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
    </>
  );
}

// FeaturesGrid extracted to ./components/shared/FeaturesGrid.jsx

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE (before sign-in: split screen - features + auth)
// ═══════════════════════════════════════════════════════════════
function LandingPage({ onSignIn, lang, setLang, pendingShare }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError(ar?"أدخل البريد وكلمة المرور":"Enter email and password"); return; }
    setLoading(true); setError(null);
    try {
      if (onSignIn) await onSignIn(email, password, mode);
    } catch (e) { setError(e.message || (ar?"فشل تسجيل الدخول. تحقق من الاتصال وحاول مجدداً":"Login failed. Check connection and retry")); }
    setLoading(false);
  };

  const WATERFRONT_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663027980795/PfUcTsRAscFnLMXv.png";

  return (
    <div dir={ar?"rtl":"ltr"} style={{minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#0f1117",position:"relative"}}>
      {/* ── Left: Hero with Waterfront Image ── */}
      {!isMobile && (
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        {/* Background Image */}
        <img src={WATERFRONT_IMG} alt="Haseef Waterfront" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        {/* Overlay */}
        <div style={{position:"absolute",inset:0,background:ar?"linear-gradient(to left, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)":"linear-gradient(to right, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)"}} />
        {/* Dot pattern overlay */}
        <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"radial-gradient(circle at 2px 2px, white 1px, transparent 0)",backgroundSize:"40px 40px"}} />
        {/* Content */}
        <div style={{position:"relative",zIndex:1,padding:"48px 48px"}}>
          <div style={{maxWidth:560}}>
            {/* Badge */}
            <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(46,196,182,0.12)",border:"1px solid rgba(46,196,182,0.25)",borderRadius:20,marginBottom:20}}>
              <span style={{fontSize:12,color:"#2EC4B6",fontWeight:500}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</span>
            </div>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:48,fontWeight:900,color:"#fff",letterSpacing:3}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1,height:32,background:"rgba(46,196,182,0.4)"}} />
              <span style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.4,fontWeight:300}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            {/* Title */}
            <h1 style={{fontSize:36,fontWeight:900,color:"#fff",lineHeight:1.15,marginBottom:10,fontFamily:"'Tajawal',sans-serif"}}>
              {ar?"منصة النمذجة المالية":"Financial Modeling"}<br/>
              <span style={{color:"#C8A96E"}}>{ar?"للتطوير العقاري":"for Real Estate"}</span>
            </h1>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:28,maxWidth:440}}>
              {ar?"صُممت للسوق السعودي. نمذجة مالية متقدمة لمشاريع التطوير العقاري بجميع أنواعها.":"Built for the Saudi market. Advanced financial modeling for all types of real estate development projects."}
            </p>
            {/* Feature badges */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {icon:"📐",text:ar?"5 محركات نمذجة":"5 Engine Modules"},
                {icon:"📊",text:ar?"50+ سنة افتراضات":"50+ Year Projections"},
                {icon:"🤖",text:ar?"مساعد AI مدمج":"Built-in AI"},
              ].map((f,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(255,255,255,0.06)",backdropFilter:"blur(8px)",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)"}}>
                  <span style={{fontSize:12}}>{f.icon}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:500}}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
      {/* ── Right: Auth Form ── */}
      <div style={{width:isMobile?"100%":420,minWidth:isMobile?"auto":380,flex:isMobile?1:"none",background:isMobile?"#0f1117":"#161a24",display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"32px 24px":"48px 36px",borderInlineStart:isMobile?"none":(ar?"none":"1px solid rgba(46,196,182,0.1)"),borderInlineEnd:isMobile?"none":(ar?"1px solid rgba(46,196,182,0.1)":"none")}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:2}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1.5,height:22,background:"rgba(46,196,182,0.5)",borderRadius:1}} />
            <span style={{fontSize:11,color:"#2EC4B6",lineHeight:1.3,fontWeight:300,textAlign:"start"}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          {isMobile && <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>}
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{mode==="signin"?(ar?"تسجيل الدخول":"Sign In"):(ar?"إنشاء حساب":"Create Account")}</div>
        </div>
        {/* Pending share invite banner */}
        {pendingShare && (
          <div style={{background:"rgba(46,196,182,0.08)",border:"1px solid rgba(46,196,182,0.2)",borderRadius:10,padding:"14px 16px",marginBottom:18,textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:6}}>📬</div>
            <div style={{fontSize:13,fontWeight:600,color:"#2EC4B6",marginBottom:4}}>{ar?"تمت دعوتك لمشروع مشترك":"You've been invited to a shared project"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{ar?"سجّل الدخول أو أنشئ حساباً جديداً للوصول إلى المشروع":"Sign in or create an account to access the project"}</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"البريد الإلكتروني":"Email"}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={ar?"example@company.com":"example@company.com"} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1b3a5c",background:"#0d1f35",color:"#e0e4ea",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"كلمة المرور":"Password"}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={ar?"أدخل كلمة المرور":"Enter your password"} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1b3a5c",background:"#0d1f35",color:"#e0e4ea",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          {error && <div style={{fontSize:11,color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",padding:"8px 12px",borderRadius:6}}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:"#2EC4B6",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"'Tajawal',sans-serif",transition:"all 0.2s",letterSpacing:0.3}} onMouseEnter={e=>e.currentTarget.style.background="#0f766e"} onMouseLeave={e=>e.currentTarget.style.background="#2EC4B6"}>
            {loading?"...":(mode==="signin"?(ar?"دخول":"Sign In"):(ar?"إنشاء حساب":"Create Account"))}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.4)"}}>
            {mode==="signin"?(
              <span>{ar?"ليس لديك حساب؟":"Don't have an account?"} <button onClick={()=>setMode("signup")} style={{color:"#2EC4B6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"سجّل الآن":"Sign up"}</button></span>
            ):(
              <span>{ar?"لديك حساب؟":"Already have an account?"} <button onClick={()=>setMode("signin")} style={{color:"#2EC4B6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"دخول":"Sign in"}</button></span>
            )}
          </div>
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#1e2230",color:"rgba(255,255,255,0.5)",padding:"6px 16px",fontSize:11,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
        </div>
        {/* Powered by */}
        <div style={{marginTop:24,textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>
      </div>
    </div>
  );
}

function ProjectsDashboard({ index, onCreate, onOpen, onDup, onDel, lang, setLang, t, user, signOut, onOpenAcademy }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const filtered = index.filter(p => !search || (p.name||"").toLowerCase().includes(search.toLowerCase()) || (p.location||"").toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const totalAssets = index.reduce((s,p) => s + (p.assetCount||0), 0);
  const finModes = index.reduce((m,p) => { const k = p.finMode||"self"; m[k] = (m[k]||0)+1; return m; }, {});
  return (
    <div style={{minHeight:"100vh",background:"var(--surface-page)",fontFamily:"var(--font-family)",color:"var(--text-primary)"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 14px":"48px 24px"}}>
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-start",gap:isMobile?14:0,marginBottom:isMobile?20:32}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:32,fontWeight:900,color:"var(--zan-navy-700)",fontFamily:"'Tajawal',sans-serif",letterSpacing:2}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1.5,height:24,background:"var(--zan-teal-500)",borderRadius:1}} />
              <span style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.3,fontWeight:500}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            <div style={{fontSize:isMobile?22:28,fontWeight:900,color:"var(--zan-navy-700)",letterSpacing:-0.5,fontFamily:"'Tajawal',sans-serif"}}>{ar?"النمذجة المالية":"Financial Modeler"}</div>
            <div style={{fontSize:isMobile?11:13,color:"var(--text-secondary)",marginTop:6}}>{t.subtitle}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setShowFeatures(true)} className="z-btn z-btn-teal" title={ar?"اعرف المزايا":"Explore Features"}>✦ {ar?"المزايا":"Features"}</button>
            <span style={{fontSize:10,padding:"3px 8px",borderRadius:10,background:"#dcfce7",color:"#166534",fontWeight:600,border:"1px solid #86efac"}}>{ar?"تجربة مجانية":"Free Trial"}</span>
            {onOpenAcademy && <button onClick={onOpenAcademy} className="z-btn z-btn-primary" style={{background:"var(--zan-navy-700)",border:"1px solid var(--zan-gold-700)"}} title={ar?"أكاديمية حصيف":"Haseef Academy"}>📚 <span style={{color:"var(--zan-gold-500)"}}>{ar?"الأكاديمية":"Academy"}</span></button>}
            {!isMobile && user && <div style={{fontSize:11,color:"var(--text-secondary)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
            {signOut && <button onClick={signOut} className="z-btn z-btn-danger">{ar?"خروج":"Sign Out"}</button>}
            <button onClick={()=>setLang(lang==="en"?"ar":"en")} className="z-btn z-btn-secondary">{lang==="en"?"عربي":"English"}</button>
          </div>
        </div>

        {/* Features Modal Overlay */}
        {showFeatures && (
          <><div onClick={()=>setShowFeatures(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9998}} />
          <div className="z-modal" style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:800,maxWidth:"94vw",maxHeight:"85vh",zIndex:9999}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
              <div className="z-modal-title" style={{flex:1,marginBottom:0}}>{ar?"مزايا المنصة":"Platform Features"}</div>
              <button onClick={()=>setShowFeatures(false)} className="z-btn z-btn-ghost" style={{fontSize:14}}>✕</button>
            </div>
            <FeaturesGrid lang={lang} />
          </div></>
        )}

        {/* KPI Strip (only when projects exist) */}
        {index.length > 0 && !isMobile && (
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {[
              {label:ar?"المشاريع":"Projects",value:index.length,icon:"📁",color:"#2563eb"},
              {label:ar?"الأصول":"Assets",value:totalAssets,icon:"🏗",color:"#0f766e"},
              ...((finModes.fund||finModes.hybrid||finModes.incomeFund)?[{label:ar?"صناديق":"Funds",value:(finModes.fund||0)+(finModes.hybrid||0)+(finModes.incomeFund||0),icon:"🏦",color:"#8b5cf6"}]:[]),
              ...(finModes.debt?[{label:ar?"تمويل بنكي":"Bank",value:finModes.debt+(finModes.bank100||0),icon:"💳",color:"#f59e0b"}]:[]),
            ].map((kpi,i)=>(
              <div key={i} className="z-kpi" style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{kpi.icon}</span>
                  <div>
                    <div style={{fontSize:20,fontWeight:800,color:kpi.color,fontVariantNumeric:"tabular-nums"}}>{kpi.value}</div>
                    <div className="z-kpi-label">{kpi.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <button className="z-btn z-btn-teal z-btn-lg" onClick={()=>onCreate()}>{t.newProject}</button>
          {index.length > 2 && (
            <div style={{flex:1,minWidth:160,maxWidth:320,position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?"🔍 بحث بالاسم أو الموقع...":"🔍 Search by name or location..."} className="z-input" style={{paddingRight:search?32:undefined}} onFocus={e=>{e.target.style.borderColor="var(--border-focus)";e.target.style.boxShadow="var(--shadow-focus)";}} onBlur={e=>{e.target.style.borderColor="";e.target.style.boxShadow="";}} />
              {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text-tertiary)",fontSize:14,cursor:"pointer",padding:0}}>✕</button>}
            </div>
          )}
          <div style={{flex:1}} />
          <div style={{fontSize:12,color:"var(--text-secondary)",alignSelf:"center"}}>{sorted.length}{sorted.length!==index.length?` / ${index.length}`:""} {t.projects}</div>
        </div>
        {sorted.length===0 && search ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:36,marginBottom:12,opacity:0.5}}>🔍</div>
            <div style={{fontSize:16,fontWeight:600,color:"var(--text-primary)",marginBottom:6}}>{ar?"لا توجد نتائج":"No results"}</div>
            <div style={{fontSize:12,color:"var(--text-secondary)"}}>{ar?`لم يتم العثور على مشاريع تطابق "${search}"`:`No projects matching "${search}"`}</div>
            <button onClick={()=>setSearch("")} style={{...btnS,marginTop:16,padding:"8px 20px",fontSize:12,background:"var(--surface-sidebar)",color:"var(--text-secondary)",border:"0.5px solid var(--border-default)",borderRadius:6}}>{ar?"مسح البحث":"Clear search"}</button>
          </div>
        ) : sorted.length===0 ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🏗</div>
            <div style={{fontSize:20,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>{lang==="ar"?"ابدأ مشروعك الأول":"Start Your First Project"}</div>
            <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>{lang==="ar"?"أنشئ مشروع جديد أو ابدأ من أحد القوالب الجاهزة":"Create a new project or start from a ready-made template"}</div>
            <div style={{fontSize:11,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:1,marginBottom:16,fontWeight:600}}>{lang==="ar"?"اختر قالب":"Choose a Template"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(180px, 1fr))",gap:12,maxWidth:700,margin:"0 auto"}}>
              {PROJECT_TEMPLATES.map((tmpl)=>(
                <div key={tmpl.id} onClick={()=>onCreate(tmpl.id)} className="z-template" style={{textAlign:"center",padding:"18px 14px"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--zan-teal-500)";e.currentTarget.style.boxShadow="0 4px 12px rgba(27,107,147,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="";e.currentTarget.style.boxShadow="";}}>
                  <div style={{fontSize:28,marginBottom:8}}>{tmpl.icon}</div>
                  <div className="z-template-name">{ar?tmpl.ar:tmpl.en}</div>
                  <div className="z-template-desc">{ar?tmpl.desc_ar:tmpl.desc_en}</div>
                </div>
              ))}
            </div>
            {/* Academy Banner for New Users */}
            {onOpenAcademy && (
              <div onClick={onOpenAcademy} style={{marginTop:32,maxWidth:700,margin:"32px auto 0",background:`linear-gradient(135deg, var(--zan-navy-900) 0%, var(--zan-navy-700) 100%)`,borderRadius:"var(--radius-xl)",padding:"24px 28px",cursor:"pointer",transition:"all 0.2s",border:"1px solid rgba(27,107,147,0.2)"}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 24px rgba(11,35,65,0.3)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:32}}>📚</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--zan-gold-500)",fontFamily:"'Tajawal',sans-serif",marginBottom:4}}>{ar?"أكاديمية حصيف المالية":"Haseef Academy"}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.6}}>{ar?"جديد على النمذجة المالية؟ ابدأ بالتعلم أولاً - محتوى عملي + نماذج تفاعلية جاهزة":"New to financial modeling? Start learning first - practical content + ready interactive demos"}</div>
                  </div>
                  <span style={{fontSize:14,color:"var(--zan-teal-300)",fontWeight:600,flexShrink:0}}>{ar?"ادخل ←":"Enter →"}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(p=>(
              <div key={p.id} className="z-card" style={{padding:isMobile?"12px 14px":"16px 20px",display:"flex",alignItems:"center",gap:isMobile?10:14,cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--zan-teal-500)";e.currentTarget.style.boxShadow="0 4px 12px rgba(27,107,147,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="";e.currentTarget.style.boxShadow="";}} onClick={()=>onOpen(p.id)}>
                <div style={{width:isMobile?32:38,height:isMobile?32:38,borderRadius:6,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"#f0f1f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?13:15,flexShrink:0}}>
                  {p._shared?"👤":p.status==="Complete"?"✓":p.status==="In Progress"?"▶":"◇"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:isMobile?13:14,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}{p._shared?<span style={{fontSize:10,color:"#2563eb",marginInlineStart:8,fontWeight:500}}>{lang==="ar"?"(مشارك)":"(Shared)"}</span>:null}</div>
                  <div style={{fontSize:isMobile?10:11,color:"var(--text-secondary)",marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span>{new Date(p.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",...(!isMobile?{year:"numeric",hour:"2-digit",minute:"2-digit"}:{})})}</span>
                    {!isMobile && p.assetCount > 0 && <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>{p.assetCount} {ar?"أصل":"assets"}</span>}
                    {!isMobile && p.finMode && p.finMode !== "self" && <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:p.finMode==="fund"||p.finMode==="hybrid"||p.finMode==="incomeFund"?"#f3e8ff":"#dbeafe",color:p.finMode==="fund"||p.finMode==="hybrid"||p.finMode==="incomeFund"?"#7c3aed":"#2563eb"}}>{p.finMode==="fund"?(ar?"صندوق":"Fund"):p.finMode==="incomeFund"?(ar?"صندوق دخل":"Income"):p.finMode==="hybrid"?(ar?"مختلط":"Hybrid"):p.finMode==="bank100"?(ar?"بنك 100%":"Bank 100%"):(ar?"بنكي":"Bank")}</span>}
                  </div>
                </div>
                <span style={{fontSize:isMobile?9:10,padding:"3px 8px",borderRadius:4,fontWeight:500,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"#f0f1f5",color:p._shared?(p._permission==="view"?"#fbbf24":"#60a5fa"):p.status==="Complete"?"#4ade80":p.status==="In Progress"?"#60a5fa":"#9ca3af",flexShrink:0}}>{p._shared?(p._permission==="view"?(lang==="ar"?"قراءة":"View"):(lang==="ar"?"تعديل":"Edit")):p.status||"Draft"}</span>
                {!isMobile && !p._shared && <button onClick={e=>{e.stopPropagation();onDup(p.id);}} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)",padding:"4px 10px"}} title="Duplicate">{lang==="ar"?"نسخ":"Copy"}</button>}
                {!p._shared && <button onClick={e=>{e.stopPropagation();const url=`${window.location.origin}?s=${p.id}&o=${user?.id||""}`;navigator.clipboard?.writeText(url).then(()=>{e.currentTarget.textContent="✓";setTimeout(()=>{e.currentTarget.textContent="🔗";},1500);});}} style={{...btnSm,background:"#dbeafe",color:"#60a5fa",padding:"4px 10px",fontSize:13}} title={lang==="ar"?"نسخ رابط المشاركة":"Copy share link"}>🔗</button>}
                {!p._shared && (confirmDel===p.id ? (
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{onDel(p.id);setConfirmDel(null);}} style={{...btnSm,background:"#fef2f2",color:"#ef4444"}}>Yes</button>
                    <button onClick={()=>setConfirmDel(null)} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}}>No</button>
                  </div>
                ) : (
                  <button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{...btnSm,background:"var(--surface-sidebar)",color:"var(--text-secondary)"}} title="Delete">✕</button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARE MODAL — Manage shared users, copy link, generate invite
// ═══════════════════════════════════════════════════════════════
function ShareModal({ project, up, lang, user, onClose }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [perm, setPerm] = useState("view");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const shared = (project?.sharedWith || []).map(e => typeof e === "string" ? { email: e, permission: "edit" } : e);
  
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}?s=${project?.id || ""}&o=${user?.id || ""}` 
    : "";

  const addUser = () => {
    setError("");
    const em = email.toLowerCase().trim();
    if (!em || !em.includes("@")) { setError(ar ? "أدخل بريد صحيح" : "Enter a valid email"); return; }
    if (em === user?.email?.toLowerCase()) { setError(ar ? "لا يمكن مشاركة مع نفسك" : "Cannot share with yourself"); return; }
    if (shared.some(e => e.email.toLowerCase() === em)) { setError(ar ? "مشارك مسبقاً" : "Already shared"); return; }
    up({ sharedWith: [...shared, { email: em, permission: perm, addedAt: new Date().toISOString() }] });
    setEmail("");
  };

  const removeUser = (em) => {
    up({ sharedWith: shared.filter(e => e.email.toLowerCase() !== em.toLowerCase()) });
  };

  const changePerm = (em, newPerm) => {
    up({ sharedWith: shared.map(e => e.email.toLowerCase() === em.toLowerCase() ? { ...e, permission: newPerm } : e) });
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => { setCopied("link"); setTimeout(() => setCopied(""), 2000); });
  };

  const copyInvite = () => {
    const projName = project?.name || "—";
    const assets = (project?.assets || []).length;
    const phases = [...new Set((project?.assets || []).map(a => a.phase))].length;
    const text = ar
      ? `مرحباً،\nأود مشاركة نموذج مالي معك على منصة حصيف للنمذجة المالية.\n\n📋 المشروع: ${projName}\n📊 عدد الأصول: ${assets} | المراحل: ${phases}\n\n🔗 رابط الوصول:\n${shareUrl}\n\nإذا ما عندك حساب، سجّل من نفس الرابط وبيظهر لك المشروع تلقائي.`
      : `Hi,\nI'd like to share a financial model with you on Haseef Financial Modeler.\n\n📋 Project: ${projName}\n📊 Assets: ${assets} | Phases: ${phases}\n\n🔗 Access link:\n${shareUrl}\n\nIf you don't have an account, register from the same link and the project will appear automatically.`;
    navigator.clipboard?.writeText(text).then(() => { setCopied("invite"); setTimeout(() => setCopied(""), 2000); });
  };

  const sty = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, backdropFilter: "blur(2px)" },
    modal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? "94vw" : 480, maxWidth: "94vw", maxHeight: "85vh", background: "var(--surface-card)", borderRadius: "var(--radius-2xl)", boxShadow: "0 24px 80px rgba(0,0,0,0.2)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { padding: "18px 22px 14px", borderBottom: "0.5px solid var(--border-default)", display: "flex", alignItems: "center", gap: 10 },
    body: { flex: 1, overflow: "auto", padding: "16px 22px" },
    input: { flex: 1, padding: "10px 12px", borderRadius: "var(--radius-md)", border: "0.5px solid var(--border-default)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 44 },
    btn: { padding: "10px 18px", borderRadius: "var(--radius-md)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", minHeight: 44, display: "flex", alignItems: "center", gap: 6 },
  };

  return (<>
    <div onClick={onClose} style={sty.overlay} />
    <div style={sty.modal}>
      {/* Header */}
      <div style={sty.header}>
        <span style={{ fontSize: 18 }}>📤</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1d23" }}>{ar ? "مشاركة المشروع" : "Share Project"}</span>
        <button onClick={onClose} style={{ ...sty.btn, background: "#f0f1f5", color: "#6b7080", padding: "6px 12px", fontSize: 16 }}>✕</button>
      </div>

      <div style={sty.body}>
        {/* ── Copy Link Section ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "رابط المشروع" : "Project Link"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flex: 1, padding: "10px 12px", background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 11, color: "#6b7080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", minHeight: 44, display: "flex", alignItems: "center" }}>{shareUrl}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyLink} style={{ ...sty.btn, background: copied === "link" ? "#16a34a" : "#2563eb", color: "#fff", whiteSpace: "nowrap" }}>
                {copied === "link" ? "✓" : "🔗"} {copied === "link" ? (ar ? "تم النسخ" : "Copied!") : (ar ? "نسخ الرابط" : "Copy Link")}
              </button>
              <button onClick={copyInvite} style={{ ...sty.btn, background: copied === "invite" ? "#16a34a" : "#f0f4ff", color: copied === "invite" ? "#fff" : "#2563eb", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                {copied === "invite" ? "✓" : "💬"} {copied === "invite" ? (ar ? "تم" : "Done") : (ar ? "نص دعوة" : "Invite Text")}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}>{ar ? "أي شخص عنده الرابط ومسجل بالمنصة يقدر يفتح المشروع. غير المسجلين يطلب منهم التسجيل أول." : "Anyone with this link who is registered can access the project. Unregistered users will be prompted to sign up."}</div>
        </div>

        {/* ── Add User ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "إضافة مشارك" : "Add Person"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Email address"} 
              style={sty.input} onKeyDown={e => e.key === "Enter" && addUser()} />
            <select value={perm} onChange={e => setPerm(e.target.value)} 
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer", minHeight: 44 }}>
              <option value="view">{ar ? "قراءة فقط" : "View only"}</option>
              <option value="edit">{ar ? "تعديل" : "Can edit"}</option>
            </select>
            <button onClick={addUser} style={{ ...sty.btn, background: "#2563eb", color: "#fff" }}>
              {ar ? "أضف" : "Add"}
            </button>
          </div>
          {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{error}</div>}
        </div>

        {/* ── Shared Users List ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {ar ? "المشاركون" : "Shared With"} {shared.length > 0 && <span style={{ fontSize: 10, background: "#dbeafe", color: "#2563eb", padding: "1px 6px", borderRadius: 8, marginInlineStart: 6 }}>{shared.length}</span>}
          </div>
          {shared.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
              {ar ? "لم تتم المشاركة مع أحد بعد" : "Not shared with anyone yet"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {shared.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7ec" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#2563eb", fontWeight: 600, flexShrink: 0 }}>
                    {(s.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1d23", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    {s.addedAt && <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(s.addedAt).toLocaleDateString()}</div>}
                  </div>
                  <select value={s.permission || "edit"} onChange={e => changePerm(s.email, e.target.value)} 
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7ec", fontSize: 11, fontFamily: "inherit", background: s.permission === "edit" ? "#dbeafe" : "#fef3c7", color: s.permission === "edit" ? "#1d4ed8" : "#92400e", cursor: "pointer", fontWeight: 600, minHeight: 36 }}>
                    <option value="view">{ar ? "قراءة" : "View"}</option>
                    <option value="edit">{ar ? "تعديل" : "Edit"}</option>
                  </select>
                  <button onClick={() => removeUser(s.email)} style={{ ...btnSm, background: "#fef2f2", color: "#ef4444", padding: "6px 10px", minHeight: 36 }} title={ar ? "إزالة" : "Remove"}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </>);
}

// StatusBadge extracted to ./components/shared/StatusBadge.jsx

// ═══════════════════════════════════════════════════════════════
// CONTROL PANEL
// ═══════════════════════════════════════════════════════════════
// ── Sidebar helper components (defined OUTSIDE ControlPanel to prevent re-creation) ──
function Sec({title,children,def=false,filled,summary,globalExpand}) {
  const [open,setOpen]=useState(def);
  useEffect(() => { if (globalExpand > 0) setOpen(globalExpand % 2 === 1); }, [globalExpand]);
  return (<div style={{borderBottom:"1px solid #1e2230"}}>
    <button onClick={e=>{e.preventDefault();setOpen(!open);}} style={{width:"100%",padding:"11px 16px",background:"none",border:"none",color:open?"#d0d4dc":"#8b90a0",fontSize:10,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",textAlign:"start",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"color 0.15s"}}>
      {filled!==undefined&&<span style={{width:7,height:7,borderRadius:4,background:filled?"#16a34a":"#3b4050",flexShrink:0}} />}
      <span style={{flex:1}}>{title}</span>
      {!open&&summary&&<span style={{fontSize:9,color:"var(--text-secondary)",fontWeight:400,letterSpacing:0,textTransform:"none",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{summary}</span>}
      <span style={{color:"#3b4050",fontSize:12,transition:"transform 0.2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>▾</span>
    </button>
    {open&&<div style={{padding:"0 16px 14px"}}>{children}</div>}
  </div>);
}

function Fld({label,children,hint,tip,error}) {
  const [showTip, setShowTip] = useState(false);
  return (<div style={{marginBottom:9,position:"relative"}}>
    <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:error?"#ef4444":"#7b8094",marginBottom:3}}>
      {label}
      {tip && <span onMouseEnter={()=>setShowTip(true)} onMouseLeave={()=>setShowTip(false)} style={{cursor:"help",fontSize:10,color:"var(--text-secondary)",lineHeight:1}}>ⓘ</span>}
    </label>
    {showTip && tip && <div style={{position:"absolute",top:-4,insetInlineStart:0,insetInlineEnd:0,transform:"translateY(-100%)",background:"#1a1d23",color:"#d0d4dc",padding:"8px 10px",borderRadius:6,fontSize:10,lineHeight:1.4,zIndex:99,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",maxWidth:260}}>{tip.split("\n").map((line,i)=><div key={i} dir={/[\u0600-\u06FF]/.test(line)?"rtl":"ltr"} style={{marginBottom:i===0?3:0}}>{line}</div>)}</div>}
    <div style={error?{borderRadius:6,boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>
    {error&&<div style={{fontSize:9,color:"#ef4444",marginTop:2,fontWeight:500}}>{error}</div>}
    {!error&&hint&&<div style={{fontSize:10,color:"var(--text-secondary)",marginTop:2}}>{hint}</div>}
  </div>);
}

function Sel({value,onChange,options,lang}) {
  return (<select value={value} onChange={e=>{e.stopPropagation();onChange(e.target.value);}} style={sideInputStyle}>
    {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o[lang||"en"]||o.en||o.label}</option>)}
  </select>);
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR ADVISOR PANEL (with Phase Tabs)
// ═══════════════════════════════════════════════════════════════
function SidebarAdvisor({ project, results, financing, waterfall, incentivesResult, lang, setActiveTab }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [advPhase, setAdvPhase] = useState("all"); // "all" or phase name
  const ar = lang === "ar";
  if (!project || !results || !(project.assets||[]).length) return null;
  const c = results.consolidated;
  if (!c) return null;

  const f = financing;
  const w = waterfall;
  const ir = incentivesResult;
  const h = results.horizon;
  const phaseResults = results.phaseResults || {};
  const phaseNames = Object.keys(phaseResults);
  const isPhase = advPhase !== "all";
  const pd = isPhase ? phaseResults[advPhase] : null;
  const phaseAssets = isPhase ? (project.assets||[]).filter(a => a.phase === advPhase) : (project.assets||[]);
  const phaseSchedules = isPhase ? results.assetSchedules.filter(a => a.phase === advPhase) : results.assetSchedules;

  // ── Metrics (consolidated or phase) ──
  const totalCapex = isPhase ? (pd?.totalCapex||0) : c.totalCapex;
  const totalIncome = isPhase ? (pd?.totalIncome||0) : c.totalIncome;
  const totalLandRent = isPhase ? (pd?.totalLandRent||0) : c.totalLandRent;
  const netCF = isPhase ? (pd?.netCF||[]) : c.netCF;
  const phaseIRR = isPhase ? (pd?.irr||null) : null;
  const irrVal = isPhase ? phaseIRR : (f && f.leveredIRR !== null ? f.leveredIRR : (ir && ir.adjustedIRR !== null && ir.totalIncentiveValue > 0) ? ir.adjustedIRR : c.irr);
  const npvVal = isPhase ? calcNPV(netCF, 0.10) : ((ir && ir.totalIncentiveValue > 0) ? ir.adjustedNPV10 : (c.npv10 || 0));
  const dscrVals = !isPhase && f && f.dscr ? f.dscr.filter(d => d !== null) : [];
  const minDscr = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const payback = netCF ? netCF.reduce((acc, v, i) => { acc.cum += v; if (acc.cum < -1) acc.neg = true; if (acc.yr === null && acc.neg && acc.cum > 0) acc.yr = i + 1; return acc; }, { cum: 0, yr: null, neg: false }).yr : null;
  const yoc = totalCapex > 0 ? (totalIncome / Math.max(1, h)) / totalCapex : 0;
  const incomeCapexRatio = totalCapex > 0 ? totalIncome / totalCapex : 0;

  // ── Health ──
  const irrOk = irrVal === null ? 0 : irrVal > 0.15 ? 2 : irrVal > 0.12 ? 1 : 0;
  const dscrOk = minDscr === null ? -1 : minDscr > 1.4 ? 2 : minDscr > 1.25 ? 1 : 0;
  const npvOk = npvVal > 0 ? 2 : 0;
  const score = irrOk + (dscrOk >= 0 ? dscrOk : 0) + npvOk;
  const maxScore = 4 + (dscrOk >= 0 ? 2 : 0);
  const healthPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const health = healthPct >= 70 ? "strong" : healthPct >= 40 ? "moderate" : "weak";
  const hCfg = {
    strong: { color: "#4ade80", bg: "#dcfce7", border: "#16a34a40", label: ar ? "قوي" : "Strong", icon: "✓" },
    moderate: { color: "#fbbf24", bg: "#2a2a0a", border: "#eab30840", label: ar ? "متوسط" : "Moderate", icon: "⚠" },
    weak: { color: "#f87171", bg: "#2a0a0a", border: "#ef444440", label: ar ? "ضعيف" : "Weak", icon: "✗" },
  }[health];

  // ── Warnings ──
  const warnings = [];
  // Consolidated-only warnings
  if (!isPhase) {
    if (minDscr !== null && minDscr < 1.2)
      warnings.push({ icon: "🏦", text: ar ? `DSCR أقل من 1.2x (${minDscr.toFixed(2)}x) — البنك قد يرفض` : `DSCR < 1.2x (${minDscr.toFixed(2)}x) — bank may reject`, tab: "financing", sev: "error" });
    else if (minDscr !== null && minDscr < 1.4)
      warnings.push({ icon: "🏦", text: ar ? `DSCR بين 1.2-1.4x — مقبول لكن ضعيف` : `DSCR 1.2-1.4x — acceptable but tight`, tab: "financing", sev: "warn" });
    if (f && (project.maxLtvPct || 0) > 80)
      warnings.push({ icon: "📊", text: ar ? `LTV عالي ${project.maxLtvPct}%` : `High LTV ${project.maxLtvPct}%`, tab: "financing", sev: "warn" });
    if (irrVal !== null && f && f.rate && irrVal < f.rate)
      warnings.push({ icon: "⚠", text: ar ? `IRR < تكلفة الدين` : `IRR < debt cost`, tab: "dashboard", sev: "error" });
    if (project.debtAllowed && (project.loanTenor || 7) <= (project.debtGrace || 3))
      warnings.push({ icon: "⏰", text: ar ? "مدة القرض ≤ فترة السماح" : "Tenor ≤ grace period", tab: "financing", sev: "error" });
    if (f && project.exitStrategy !== "hold") {
      const exitYr = f.exitYear ? f.exitYear - (project.startYear || 2026) : 0;
      const maxRamp = results?.assetSchedules ? Math.max(0, ...results.assetSchedules.map(a => a.capexSchedule.reduce((l,v,i)=>v>0?i+1:l,0) + (a.rampUpYears||3))) : 0;
      if (exitYr > 0 && exitYr < maxRamp) warnings.push({ icon: "🚪", text: ar ? "التخارج قبل استقرار الإشغال" : "Exit before stabilization", tab: "results", sev: "warn" });
    }
  }
  if (npvVal < 0) warnings.push({ icon: "📉", text: ar ? `NPV سالب (${fmtM(npvVal)})` : `Negative NPV (${fmtM(npvVal)})`, tab: "dashboard", sev: "error" });

  // Asset-level warnings (filtered by phase)
  phaseAssets.forEach((a, i) => {
    const bcCost = benchmarkColor("costPerSqm", a.costPerSqm, a.category);
    const bcRate = benchmarkColor("leaseRate", a.leaseRate, a.category);
    if (bcCost.color === "#ef4444")
      warnings.push({ icon: "🔴", text: ar ? `"${a.name||i+1}": تكلفة/م² (${fmt(a.costPerSqm)}) خارج النطاق` : `"${a.name||i+1}": cost/sqm (${fmt(a.costPerSqm)}) outlier`, tab: "assets", sev: "warn" });
    if (bcRate.color === "#ef4444" && a.revType === "Lease")
      warnings.push({ icon: "🔴", text: ar ? `"${a.name||i+1}": إيجار/م² خارج النطاق` : `"${a.name||i+1}": rate/sqm outlier`, tab: "assets", sev: "warn" });
    if (a.revType === "Lease" && (a.efficiency || 0) === 0 && (a.gfa || 0) > 0 && !["Infrastructure", "Utilities", "Open Space"].includes(a.category))
      warnings.push({ icon: "⚠", text: ar ? `"${a.name||i+1}": كفاءة 0%` : `"${a.name||i+1}": 0% efficiency`, tab: "assets", sev: "error" });
    // Asset with zero revenue but high CAPEX
    const aComp = phaseSchedules.find(s => s.id === a.id || s.name === a.name);
    if (aComp && aComp.totalCapex > 0 && aComp.totalRevenue === 0 && !["Infrastructure", "Utilities", "Open Space", "Amenity"].includes(a.category))
      warnings.push({ icon: "💸", text: ar ? `"${a.name||i+1}": CAPEX ${fmtM(aComp.totalCapex)} بدون إيراد` : `"${a.name||i+1}": ${fmtM(aComp.totalCapex)} CAPEX, zero revenue`, tab: "assets", sev: "warn" });
  });

  // Phase-specific insights
  if (isPhase && pd) {
    const capexShare = c.totalCapex > 0 ? (pd.totalCapex / c.totalCapex * 100).toFixed(0) : 0;
    const incShare = c.totalIncome > 0 ? (pd.totalIncome / c.totalIncome * 100).toFixed(0) : 0;
    if (Number(capexShare) > 50) warnings.push({ icon: "📊", text: ar ? `هذه المرحلة = ${capexShare}% من CAPEX الكلي` : `This phase = ${capexShare}% of total CAPEX`, tab: "assets", sev: "info" });
    if (Number(incShare) < 20 && Number(capexShare) > 30) warnings.push({ icon: "⚠", text: ar ? `CAPEX عالي (${capexShare}%) مقابل إيراد منخفض (${incShare}%)` : `High CAPEX (${capexShare}%) vs low income (${incShare}%)`, tab: "assets", sev: "warn" });
  }

  const errorCount = warnings.filter(w2 => w2.sev === "error").length;
  const warnCount = warnings.filter(w2 => w2.sev === "warn").length;
  const Dot = ({ ok }) => <div style={{ width: 6, height: 6, borderRadius: 3, flexShrink: 0, background: ok >= 2 ? "#4ade80" : ok === 1 ? "#fbbf24" : "#f87171" }} />;

  // ── Info items ──
  const info = [];
  info.push({ icon: "📐", text: ar ? `${phaseAssets.length} أصل` : `${phaseAssets.length} assets` });
  info.push({ icon: "🏗", text: `CAPEX: ${fmtM(totalCapex)}` });
  info.push({ icon: "💰", text: `${ar ? "إيرادات" : "Income"}: ${fmtM(totalIncome)}` });
  if (incomeCapexRatio > 0) info.push({ icon: "💎", text: `${ar ? "إيرادات/تكاليف" : "Income/CAPEX"}: ${incomeCapexRatio.toFixed(1)}x` });
  if (yoc > 0) info.push({ icon: "📈", text: `YoC: ${(yoc * 100).toFixed(1)}% ${ar ? "سنوياً" : "annual"}` });
  if (payback) info.push({ icon: "⏱", text: ar ? `استرداد: سنة ${payback}` : `Payback: year ${payback}` });
  if (!isPhase && f && f.mode !== "self") {
    const ltv = f.totalProjectCost > 0 ? (f.totalDebt / f.totalProjectCost * 100).toFixed(0) : 0;
    info.push({ icon: "🏦", text: `${ar ? "دين" : "Debt"}: ${fmtM(f.totalDebt)} (LTV ${ltv}%)` });
  }
  if (!isPhase && w) {
    info.push({ icon: "👤", text: `Investor: ${w.lpMOIC?.toFixed(2) || "—"}x · ${w.lpIRR !== null ? (w.lpIRR * 100).toFixed(1) + "%" : "—"}` });
    info.push({ icon: "🏢", text: `Developer: ${w.gpMOIC?.toFixed(2) || "—"}x · ${w.gpIRR !== null ? (w.gpIRR * 100).toFixed(1) + "%" : "—"}` });
  }
  // Phase weight
  if (isPhase && c.totalCapex > 0) {
    info.push({ icon: "⚖", text: `${ar ? "وزن المرحلة" : "Phase weight"}: ${(totalCapex / c.totalCapex * 100).toFixed(0)}% CAPEX · ${c.totalIncome > 0 ? (totalIncome / c.totalIncome * 100).toFixed(0) : 0}% ${ar ? "إيراد" : "income"}` });
  }

  // ── Market Indicators (if enabled) ──
  const mkt = project.market;
  if (mkt && mkt.enabled && !isPhase) {
    const mktGaps = mkt.gaps || {};
    const mktTh = mkt.thresholds || {};
    const MSECTORS = ["Retail","Office","Hospitality","Residential","Marina","Industrial"];
    const getMktSupply = (sector) => {
      const assets2 = (project.assets||[]).filter(a2 => {
        const cat2 = (a2.category||"").toLowerCase(); const sec2 = sector.toLowerCase();
        return cat2.includes(sec2) || (sec2==="retail" && cat2.includes("commercial")) || (sec2==="hospitality" && (cat2.includes("hotel")||cat2.includes("resort")));
      });
      if (sector==="Hospitality") return assets2.reduce((s2,a2)=>s2+(a2.hotelPL?.keys||0),0);
      if (sector==="Marina") return assets2.reduce((s2,a2)=>s2+(a2.marinaPL?.berths||0),0);
      return assets2.reduce((s2,a2)=>s2+(a2.gfa||0)*((a2.efficiency||0)/100),0);
    };
    let mktHigh = 0, mktMed = 0;
    MSECTORS.forEach(sec => {
      const gap = mktGaps[sec]?.gap || 0;
      if (gap <= 0) return;
      const supply = getMktSupply(sec);
      if (supply <= 0) return;
      const pct = supply / gap;
      const th3 = mktTh[sec] || { low: 50, med: 70 };
      const pct100 = pct * 100;
      if (pct100 > th3.med) {
        mktHigh++;
        warnings.push({ icon: "📊", text: ar ? `${catL(sec,true)}: ${pct100.toFixed(0)}% من فجوة السوق — فرط توريد` : `${sec}: ${pct100.toFixed(0)}% of gap — oversupply risk`, tab: "market", sev: "error" });
      } else if (pct100 > th3.low) {
        mktMed++;
      }
    });
    if (mktHigh === 0 && mktMed === 0) info.push({ icon: "📊", text: ar ? "السوق: جميع القطاعات ضمن النطاق" : "Market: all sectors within safe range" });
    else if (mktHigh === 0) info.push({ icon: "📊", text: ar ? `السوق: ${mktMed} قطاع متوسط المخاطر` : `Market: ${mktMed} sector(s) medium risk` });
  }

  return (
    <div style={{ borderTop: "1px solid #1e2230", background: "#0a0c10" }}>
      {/* ── Header ── */}
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: hCfg.bg, border: `1px solid ${hCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: hCfg.color, flexShrink: 0 }}>{hCfg.icon}</div>
        <div style={{ flex: 1, textAlign: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: hCfg.color }}>{ar ? "المستشار" : "Advisor"}: {hCfg.label}</div>
          <div style={{ fontSize: 9, color: "#6b7080", marginTop: 1 }}>
            {errorCount > 0 && <span style={{ color: "#f87171" }}>{errorCount} {ar ? "خطأ" : "error"}{errorCount > 1 && !ar ? "s" : ""}</span>}
            {errorCount > 0 && warnCount > 0 && " · "}
            {warnCount > 0 && <span style={{ color: "#fbbf24" }}>{warnCount} {ar ? "تنبيه" : "warn"}{warnCount > 1 && !ar ? "s" : ""}</span>}
            {errorCount === 0 && warnCount === 0 && <span style={{ color: "#4ade80" }}>{ar ? "لا مشاكل" : "No issues"}</span>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#4b5060", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: "0 12px 14px", maxHeight: 420, overflowY: "auto" }}>
          {/* ── Phase Tabs ── */}
          {phaseNames.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={() => setAdvPhase("all")} style={{ ...btnS, padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 10, background: advPhase === "all" ? "#2EC4B620" : "#1e2230", color: advPhase === "all" ? "#2EC4B6" : "#6b7080", border: advPhase === "all" ? "1px solid #2EC4B640" : "1px solid #282d3a" }}>
                {ar ? "الكل" : "All"}
              </button>
              {phaseNames.map(pn => {
                const pWarns = (project.assets || []).filter(a => a.phase === pn).some(a => benchmarkColor("costPerSqm", a.costPerSqm, a.category).color === "#ef4444");
                return (
                  <button key={pn} onClick={() => setAdvPhase(pn)} style={{ ...btnS, padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 10, background: advPhase === pn ? "#2563eb20" : "#1e2230", color: advPhase === pn ? "#60a5fa" : "#6b7080", border: advPhase === pn ? "1px solid #2563eb40" : "1px solid #282d3a" }}>
                    {pn} {pWarns && <span style={{ color: "#f87171" }}>!</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── KPI Strip ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[
              { label: "IRR", value: irrVal !== null ? (irrVal * 100).toFixed(1) + "%" : "—", ok: irrOk },
              { label: isPhase ? "NPV" : (minDscr !== null ? "DSCR" : "NPV"), value: isPhase ? (npvVal >= 1e6 ? fmtM(npvVal) : "—") : (minDscr !== null ? minDscr.toFixed(2) + "x" : (npvVal >= 1e6 ? fmtM(npvVal) : npvVal > 0 ? "+" : "—")), ok: isPhase ? npvOk : (minDscr !== null ? dscrOk : npvOk) },
              { label: ar ? "الاسترداد" : "Payback", value: payback ? payback + (ar ? " سنة" : "yr") : "—", ok: payback && payback <= 7 ? 2 : payback && payback <= 12 ? 1 : 0 },
            ].map((m, i) => (
              <div key={i} style={{ background: "#0F2D4F", borderRadius: 6, padding: "8px 10px", border: "1px solid #1e2230" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <Dot ok={m.ok} />
                  <span style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.3 }}>{m.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.ok >= 2 ? "#4ade80" : m.ok === 1 ? "#fbbf24" : "#f87171" }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* ── Warnings ── */}
          {warnings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>
                {ar ? "تنبيهات" : "Warnings"} ({warnings.length})
              </div>
              {warnings.map((w2, i) => (
                <button key={i} onClick={() => setActiveTab(w2.tab)} style={{ width: "100%", background: w2.sev === "error" ? "#1a0a0a" : w2.sev === "warn" ? "#1a1a0a" : "#dbeafe", border: `1px solid ${w2.sev === "error" ? "#ef444430" : w2.sev === "warn" ? "#eab30830" : "#2563eb30"}`, borderRadius: 6, padding: "6px 10px", marginBottom: 4, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 6, fontFamily: "inherit", textAlign: "start", transition: "background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  <span style={{ fontSize: 11, flexShrink: 0, lineHeight: 1.4 }}>{w2.icon}</span>
                  <span style={{ fontSize: 10, color: w2.sev === "error" ? "#fca5a5" : w2.sev === "warn" ? "#fde68a" : "#93c5fd", lineHeight: 1.4 }}>{w2.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Quick Summary ── */}
          <div>
            <div style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>{ar ? "ملخص" : "Summary"}</div>
            {info.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 10, color: "#8b90a0" }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* ── Phase Asset Breakdown (when phase selected) ── */}
          {isPhase && phaseSchedules.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>{ar ? "أصول المرحلة" : "Phase Assets"}</div>
              {phaseSchedules.map((a, i) => {
                const _stabRev = a.revenueSchedule ? a.revenueSchedule.find((v,i)=>i>0&&v>0&&a.revenueSchedule[i-1]>0) || Math.max(...(a.revenueSchedule||[0])) : (a.totalRevenue/Math.max(1,h));
                const aYoc = a.totalCapex > 0 ? (_stabRev / a.totalCapex * 100).toFixed(1) : "0.0";
                const viable = Number(aYoc) > 8 ? "#4ade80" : Number(aYoc) > 4 ? "#fbbf24" : a.totalRevenue > 0 ? "#f87171" : "#4b5060";
                return (
                  <div key={i} style={{ background: "#0F2D4F", borderRadius: 6, padding: "6px 10px", marginBottom: 4, border: "1px solid #1e2230" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#d0d4dc" }}>{a.name || "—"}</span>
                        <span style={{ fontSize: 9, color: "#6b7080", marginInlineStart: 6 }}>{catL(a.category, ar)}</span>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, color: viable }}>{aYoc}%</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#6b7080", marginTop: 3 }}>
                      <span>CAPEX: {fmtM(a.totalCapex)}</span>
                      <span style={{ color: "#4ade80" }}>{ar ? "إيراد" : "Rev"}: {fmtM(a.totalRevenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ControlPanel({ project, up, t, lang, results, globalExpand }) {
  if (!project) return null;
  const [eduModal, setEduModal] = useState(null);

  const cur = project.currency || "SAR";
  const ar = lang==="ar";

  return (<>
    {/* ── 1. GENERAL ── */}
    <Sec title={t.general} def={false} globalExpand={globalExpand} filled={!!(project.location && project.startYear)} summary={project.location ? `${project.startYear} | ${project.horizon}yr` : ""}>
      <Fld label={t.location} tip="موقع المشروع. للعرض والتقارير فقط
Project location. For display and reports only"><SidebarInput value={project.location} onChange={v=>up({location:v})} placeholder="e.g. Jazan, Saudi Arabia" /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.startYear} tip="سنة بداية المشروع. تُحدد توقيت CAPEX والإيرادات
Project start year. Sets the timing for CAPEX and revenue"><SidebarInput type="number" value={project.startYear} onChange={v=>up({startYear:v})} /></Fld>
        <Fld label={t.horizon} tip="أفق النموذج بالسنوات (5-99). يحدد مدى حساب التدفقات النقدية
Model horizon in years (5-99). Determines cash flow projection length" error={project.horizon<1?(lang==="ar"?"المدة يجب أن تكون 1 على الأقل":"Horizon must be at least 1"):project.horizon>99?(lang==="ar"?"الحد الأقصى 99 سنة":"Max 99 years"):null}><SidebarInput type="number" value={project.horizon} onChange={v=>up({horizon:v})} /></Fld>
      </div>
      <Fld label={t.currency} tip="عملة النموذج. الافتراضي ريال سعودي
Model currency. Default is SAR"><Sel lang={lang} value={project.currency} onChange={v=>up({currency:v})} options={CURRENCIES} /></Fld>
    </Sec>

    {/* ── 4. ASSUMPTIONS (CAPEX + Revenue merged) ── */}
    <Sec title={ar?"افتراضات التكاليف والإيرادات":"Cost & Revenue Assumptions"} globalExpand={globalExpand} filled={project.softCostPct > 0 || project.rentEscalation > 0} summary={`${project.softCostPct}% soft | ${project.rentEscalation}% esc`}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.softCost} tip="تشمل التصميم، الدراسات، الإشراف، التصاريح وإدارة المشروع. عادة 8-15%\nDesign, studies, supervision, permits, project management. Usually 8-15%: تصميم، إشراف، تصاريح. عادة 8-15%\nIndirect costs: design, supervision, permits. Standard 8-15%" error={project.softCostPct<0?(lang==="ar"?"لا يمكن أن تكون سالبة":"Cannot be negative"):project.softCostPct>50?(lang==="ar"?"قيمة عالية جداً (>50%)":"Very high value (>50%)"):null}><SidebarInput type="number" value={project.softCostPct} onChange={v=>up({softCostPct:v})} /></Fld>
        <Fld label={t.contingency} tip="هامش احتياطي لزيادات الأسعار أو تغييرات التنفيذ. عادة 5-10%\nReserve for cost overruns or scope changes. Usually 5-10% للمخاطر غير المتوقعة. عادة 5-10%\nRisk reserve for unexpected costs. Standard 5-10%" error={project.contingencyPct<0?(lang==="ar"?"لا يمكن أن تكون سالبة":"Cannot be negative"):project.contingencyPct>30?(lang==="ar"?"قيمة عالية جداً (>30%)":"Very high value (>30%)"):null}><SidebarInput type="number" value={project.contingencyPct} onChange={v=>up({contingencyPct:v})} /></Fld>
      </div>
      <Fld label={t.rentEsc} tip="الزيادة السنوية المفترضة في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAssumed annual rent increase. Prime areas 2-5%, secondary 0.5-2% في الإيجار. المناطق الرئيسية 2-5%، الثانوية 0.5-2%\nAnnual rent increase %. Prime areas: 2-5%, secondary: 0.5-2%"><SidebarInput type="number" value={project.rentEscalation} onChange={v=>up({rentEscalation:v})} /></Fld>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Fld label={t.defEfficiency} tip="نسبة المساحة المدرة للدخل من GFA. مكاتب 75-85%، تجزئة 80-90%\nIncome-generating share of GFA. Offices 75-85%, Retail 80-90% للتأجير من GFA. مكاتب 80-90%، تجزئة 70-85%\nLeasable % of GFA. Offices 80-90%, Retail 70-85%" error={project.defaultEfficiency<0?(lang==="ar"?"لا يمكن أن تكون سالبة":"Cannot be negative"):project.defaultEfficiency>100?(lang==="ar"?"الحد الأقصى 100%":"Max 100%"):null}><SidebarInput type="number" value={project.defaultEfficiency} onChange={v=>up({defaultEfficiency:v})} /></Fld>
        <Fld label={t.defLeaseRate} tip="معدل الإيجار الافتراضي للأصول الجديدة بالريال/م²/سنة
Default lease rate for new assets in SAR/sqm/year"><SidebarInput type="number" value={project.defaultLeaseRate} onChange={v=>up({defaultLeaseRate:v})} /></Fld>
      </div>
      <Fld label={t.defCostSqm} tip="تكلفة البناء الافتراضية للأصول الجديدة بالريال/م²
Default construction cost for new assets in SAR/sqm"><SidebarInput type="number" value={project.defaultCostPerSqm} onChange={v=>up({defaultCostPerSqm:v})} /></Fld>
    </Sec>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </>);
}

// ═══════════════════════════════════════════════════════════════
// HOTEL P&L MODAL
// ═══════════════════════════════════════════════════════════════
// HotelPLModal — imported from ./components/shared/HotelPLModal.jsx

// MarinaPLModal — imported from ./components/shared/MarinaPLModal.jsx

// ── Score Tooltip Cell (fixed-position, escapes overflow) ──
function ScoreCell({ sc, name, ar }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top - 6, left: r.left + r.width / 2 });
    }
    setShow(true);
  };
  const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",label:"✓",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",label:"~",t:ar?"مقبول":"Marginal"}, weak:{bg:"#fef2f2",color:"#991b1b",label:"✗",t:ar?"ضعيف":"Weak"}, none:{bg:"#f0f1f5",color:"var(--text-tertiary)",label:"—",t:"—"} }[sc.viable];
  const iCfg = { high:{label:"▲",color:"#1e40af",t:ar?"أثر كبير":"High impact"}, med:{label:"▬",color:"var(--text-secondary)",t:ar?"أثر متوسط":"Med impact"}, low:{label:"▼",color:"var(--text-tertiary)",t:ar?"أثر محدود":"Low impact"} }[sc.impact];
  const yocPct = (sc.yoc * 100).toFixed(1);
  const wPct = (sc.capexWeight * 100).toFixed(0);
  return (
    <div ref={ref} onMouseEnter={onEnter} onMouseLeave={()=>setShow(false)} onClick={()=>{if(!show)onEnter();else setShow(false);}} style={{display:"flex",alignItems:"center",gap:3,cursor:"help"}}>
      <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:vCfg.bg,color:vCfg.color,fontWeight:700}}>{vCfg.label}{yocPct>0?` ${yocPct}%`:""}</span>
      <span style={{fontSize:9,color:iCfg.color,fontWeight:600}}>{iCfg.label}{wPct}%</span>
      {show && <div style={{position:"fixed",top:pos.top,left:Math.max(10, Math.min(pos.left - 150, (typeof window!=="undefined"?window.innerWidth:800) - 310)),transform:"translateY(-100%)",width:300,background:"#1a1d23",color:"#e5e7ec",padding:"14px 16px",borderRadius:10,fontSize:11,lineHeight:1.6,zIndex:99999,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",whiteSpace:"normal",textAlign:"start",pointerEvents:"none"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:"#2EC4B6",borderBottom:"1px solid #282d3a",paddingBottom:6}}>{name || (ar?"أصل":"Asset")}</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"var(--text-secondary)"}}>{ar?"الجدوى":"Viability"}</span>
          <span style={{fontWeight:600,color:vCfg.color}}>{vCfg.t}</span>
          <span style={{color:"var(--text-secondary)"}}>{ar?"العائد على التكلفة":"Yield on Cost"}</span>
          <span style={{fontWeight:600}}>{yocPct}%  <span style={{fontWeight:400,color:"var(--text-secondary)"}}>({ar?"إيراد سنوي ÷ CAPEX":"annual rev ÷ CAPEX"})</span></span>
          <span style={{color:"var(--text-secondary)"}}>{ar?"إيراد سنوي":"Annual Rev"}</span>
          <span style={{fontWeight:600}}>{fmtM(sc.annualRev)}</span>
          <span style={{color:"var(--text-secondary)"}}>CAPEX</span>
          <span style={{fontWeight:600}}>{fmtM(sc.capex)}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",marginBottom:8}}>
          <span style={{color:"var(--text-secondary)"}}>{ar?"الأثر":"Impact"}</span>
          <span style={{fontWeight:600,color:iCfg.color}}>{iCfg.t}</span>
          <span style={{color:"var(--text-secondary)"}}>{ar?"وزن CAPEX":"CAPEX Weight"}</span>
          <span style={{fontWeight:600}}>{wPct}% {ar?"من المشروع":"of project"}</span>
        </div>
        <div style={{borderTop:"1px solid #282d3a",paddingTop:6,fontSize:10,color:"var(--text-tertiary)",fontStyle:"italic"}}>
          {sc.impact==="low"?(ar?"نقل هذا الأصل بين المراحل لن يؤثر كثيراً على المشروع":"Moving this asset between phases won't significantly affect the project"):sc.impact==="high"?(ar?"أصل محوري — أي تغيير في موقعه أو توقيته يؤثر بشكل كبير":"Key asset — any change in timing significantly affects the project"):(ar?"أثر متوسط — يجب مراعاة التوقيت":"Moderate impact — timing matters")}
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSET PROGRAM TABLE
// ═══════════════════════════════════════════════════════════════
function AssetTable({ project, upAsset, addAsset, dupAsset, rmAsset, results, t, lang, updateProject, globalExpand }) {
  const isMobile = useIsMobile();
  const [modal, setModal] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [viewMode, setViewMode] = useState(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");
  const [editIdx, setEditIdx] = useState(null);
  const [showLandRentDetail, setShowLandRentDetail] = useState(false);
  const [landEduModal, setLandEduModal] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [landOpen, setLandOpen] = useState(false);
  const fileRef = useRef(null);
  if (!project) return null;
  const assets = project.assets || [];
  const phaseNames = project.phases.map(p => p.name);

  // ── Asset Templates (Saudi market defaults) ──
  const _ar = lang === "ar";
  const ASSET_TEMPLATES = [
    { id:"hotel5", icon:"🏨", label:_ar?"فندق 5 نجوم":"5-Star Hotel", defaults:{
      name:_ar?"فندق 5 نجوم":"5-Star Hotel", category:"Hospitality", revType:"Operating", code:"H5",
      plotArea:12000, footprint:5000, gfa:35000, efficiency:0, leaseRate:0,
      costPerSqm:12000, constrStart:1, constrDuration:30, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
      opEbitda:47630685, hotelPL:{keys:200, adr:920, stabOcc:73, daysYear:365, roomsPct:64, fbPct:25, micePct:7, otherPct:4, roomExpPct:20, fbExpPct:60, miceExpPct:58, otherExpPct:55, undistPct:28, fixedPct:9},
    }},
    { id:"hotel4", icon:"🏢", label:_ar?"فندق 4 نجوم":"4-Star Hotel", defaults:{
      name:_ar?"فندق 4 نجوم":"4-Star Hotel", category:"Hospitality", revType:"Operating", code:"H4",
      plotArea:5000, footprint:2000, gfa:16000, efficiency:0, leaseRate:0,
      costPerSqm:8000, constrStart:1, constrDuration:30, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
      opEbitda:13901057, hotelPL:{keys:230, adr:548, stabOcc:70, daysYear:365, roomsPct:72, fbPct:22, micePct:4, otherPct:2, roomExpPct:20, fbExpPct:60, miceExpPct:58, otherExpPct:50, undistPct:29, fixedPct:9},
    }},
    { id:"mall", icon:"🛍️", label:_ar?"مول تجاري":"Retail Mall", defaults:{
      name:_ar?"مول تجاري":"Retail Mall", category:"Retail", revType:"Lease", code:"RM",
      plotArea:28000, footprint:20000, gfa:40000, efficiency:80, leaseRate:2100,
      costPerSqm:3900, constrStart:1, constrDuration:36, rampUpYears:4, stabilizedOcc:100, escalation:0.75,
    }},
    { id:"office", icon:"🏛️", label:_ar?"برج مكاتب":"Office Tower", defaults:{
      name:_ar?"برج مكاتب":"Office Tower", category:"Office", revType:"Lease", code:"OF",
      plotArea:5500, footprint:2700, gfa:16000, efficiency:90, leaseRate:900,
      costPerSqm:2600, constrStart:1, constrDuration:36, rampUpYears:2, stabilizedOcc:100, escalation:0.75,
    }},
    { id:"resi", icon:"🏠", label:_ar?"سكني (أبراج)":"Residential Tower", defaults:{
      name:_ar?"برج سكني":"Residential Tower", category:"Residential", revType:"Lease", code:"R1",
      plotArea:4000, footprint:2000, gfa:14000, efficiency:85, leaseRate:800,
      costPerSqm:2800, constrStart:1, constrDuration:30, rampUpYears:2, stabilizedOcc:92, escalation:0.75,
    }},
    { id:"marina", icon:"⚓", label:_ar?"مارينا":"Marina", defaults:{
      name:_ar?"مارينا":"Marina", category:"Marina", revType:"Operating", code:"MAR",
      plotArea:3000, footprint:0, gfa:2400, efficiency:0, leaseRate:0,
      costPerSqm:16000, constrStart:1, constrDuration:12, rampUpYears:4, stabilizedOcc:90, escalation:0.75,
      opEbitda:1129331, marinaPL:{berths:80, avgLength:14, unitPrice:2063, stabOcc:90, fuelPct:25, otherRevPct:10, berthingOpexPct:58, fuelOpexPct:96, otherOpexPct:30},
    }},
    { id:"custom", icon:"✏️", label:_ar?"مخصص (فارغ)":"Custom (Empty)", defaults:{} },
  ];

  const handleTemplateSelect = (defaults) => {
    addAsset(Object.keys(defaults).length > 0 ? defaults : undefined);
    setShowTemplatePicker(false);
    setTimeout(() => setEditIdx(assets.length), 50);
  };

  // Auto-open detail modal after adding a new asset
  const handleAddAsset = () => {
    setShowTemplatePicker(true);
  };

  // Auto-fill defaults when category changes (Sprint 1B)
  const handleCategoryChange = (i, newCat) => {
    const a = assets[i];
    const defs = getAutoFillDefaults(newCat);
    // Only auto-fill fields that are at zero/default — don't overwrite user-entered values
    const updates = { category: newCat };
    if ((a.costPerSqm || 0) === 0 && defs.costPerSqm) updates.costPerSqm = defs.costPerSqm;
    if ((a.efficiency || 0) === 0 && defs.efficiency != null) updates.efficiency = defs.efficiency;
    if ((a.leaseRate || 0) === 0 && defs.leaseRate) updates.leaseRate = defs.leaseRate;
    if (defs.revType && a.revType === "Lease" && defs.revType !== "Lease") updates.revType = defs.revType;
    if ((a.rampUpYears || 3) === 3 && defs.rampUpYears) updates.rampUpYears = defs.rampUpYears;
    if ((a.stabilizedOcc || 100) === 100 && defs.stabilizedOcc && defs.stabilizedOcc !== 100) updates.stabilizedOcc = defs.stabilizedOcc;
    if ((a.constrDuration || 12) === 12 && defs.constrDuration) updates.constrDuration = defs.constrDuration;
    upAsset(i, updates);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportMsg({ type: 'loading', text: lang === 'ar' ? 'جاري الاستيراد...' : 'Importing...' });
    try {
      const { assets: imported, newPhases } = await parseAssetFile(file, project);
      if (imported.length === 0) {
        setImportMsg({ type: 'error', text: lang === 'ar' ? 'لم يتم العثور على بيانات' : 'No asset data found in file' });
        return;
      }
      // Add new phases if detected
      let updatedPhases = [...project.phases];
      if (newPhases.length > 0) {
        newPhases.forEach((pName, i) => {
          updatedPhases.push({ name: pName, startYearOffset: updatedPhases.length + 1, completionYear: (project.startYear||2026) + 3, footprint: 0 });
        });
      }
      updateProject({ assets: [...project.assets, ...imported], phases: updatedPhases });
      const opCount = imported.filter(a => a.revType === 'Operating').length;
      let msg = lang === 'ar'
        ? `تم استيراد ${imported.length} أصل بنجاح`
        : `Imported ${imported.length} assets successfully`;
      if (opCount > 0) {
        msg += lang === 'ar'
          ? ` (${opCount} أصول تشغيلية - اضغط P&L لضبط التفاصيل)`
          : ` (${opCount} Operating assets - click P&L to configure details)`;
      }
      if (newPhases.length > 0) {
        msg += lang === 'ar'
          ? ` | تمت إضافة ${newPhases.length} مراحل جديدة`
          : ` | Added ${newPhases.length} new phases`;
      }
      setImportMsg({ type: 'success', text: msg });
      setTimeout(() => setImportMsg(null), 8000);
    } catch (err) {
      setImportMsg({ type: 'error', text: (lang==='ar'?'فشل الاستيراد: ':'Import failed: ') + String(err) });
      setTimeout(() => setImportMsg(null), 6000);
    }
  };

  // Bilingual column headers
  // Viability & Impact scoring per asset
  const totalProjectCapex = results?.consolidated?.totalCapex || 1;
  const totalProjectIncome = results?.consolidated?.totalIncome || 1;
  const getAssetScore = (asset, comp) => {
    const capex = comp?.totalCapex || computeAssetCapex(asset, project);
    const income = comp?.totalRevenue || 0;
    const horizon = project.horizon || 50;
    const durYrs = Math.ceil((asset.constrDuration || 12) / 12);
    const revStart = comp?.revenueSchedule ? comp.revenueSchedule.findIndex(v => v > 0) : -1;
    const revYears = revStart >= 0 ? Math.max(1, horizon - revStart) : Math.max(1, horizon - durYrs);
    const annualRev = revYears > 0 ? income / revYears : 0;
    const yoc = capex > 0 ? annualRev / capex : 0; // Yield on Cost
    const capexWeight = capex / totalProjectCapex; // CAPEX weight
    const incomeWeight = income / totalProjectIncome; // Revenue weight
    // Viability: based on yield on cost
    const viable = capex === 0 ? "none" : yoc > 0.08 ? "strong" : yoc > 0.04 ? "ok" : income > 0 ? "weak" : "none";
    // Impact: based on CAPEX share
    const impact = capexWeight > 0.25 ? "high" : capexWeight > 0.10 ? "med" : "low";
    return { yoc, capexWeight, incomeWeight, annualRev, viable, impact, capex, income };
  };

  const cols = [
    { key:"#", en:"#", ar:"#", w:28 },
    { key:"phase", en:"Phase", ar:"المرحلة", w:70 },
    { key:"name", en:"Asset Name", ar:"اسم الأصل", w:120 },
    { key:"category", en:"Category", ar:"التصنيف", w:85 },
    { key:"code", en:"Code", ar:"الرمز", w:40 },
    { key:"gfa", en:"GFA", ar:"م.إجمالية", w:60 },
    { key:"eff", en:"Eff%", ar:"كفاءة%", w:44 },
    { key:"leasable", en:"Leasable", ar:"م.تأجير", w:58 },
    { key:"plotArea", en:"Plot", ar:"القطعة", w:58 },
    { key:"footprint", en:"Footprint", ar:"البصمة", w:58 },
    { key:"revType", en:"Rev Type", ar:"نوع الدخل", w:68 },
    { key:"rate", en:"Rate", ar:"إيجار/م²", w:58 },
    { key:"opEbitda", en:"EBITDA", ar:"تشغيلي", w:72 },
    { key:"occ", en:"Occ%", ar:"إشغال%", w:42 },
    { key:"esc", en:"Esc%", ar:"زيادة%", w:40 },
    { key:"ramp", en:"Ramp", ar:"نمو", w:38 },
    { key:"cost", en:"Cost/m²", ar:"تكلفة/م²", w:62 },
    { key:"dur", en:"Build", ar:"بناء(شهر)", w:52 },
    { key:"hardCost", en:"Hard Cost", ar:"تكلفة صلبة", w:78 },
    { key:"addons", en:"Soft+Cont", ar:"غير مباشرة", w:74 },
    { key:"totalCapex", en:"Total CAPEX", ar:"إجمالي", w:82 },
    { key:"totalInc", en:"Revenue", ar:"الإيرادات", w:78 },
    { key:"score", en:"Score", ar:"تقييم", w:88 },
    { key:"ops", en:"", ar:"", w:28 },
  ];

  const [editingPhase, setEditingPhase] = useState(null);
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterRev, setFilterRev] = useState("all");
  const [hiddenCols, setHiddenCols] = useState(() => new Set(["plotArea","footprint","esc","ramp","occ","code","hardCost"]));
  const [showColPicker, setShowColPicker] = useState(false);
  const [cfOpen, setCfOpen] = useState({}); // which asset CFs are expanded
  const [cfAllOpen, setCfAllOpen] = useState(false); // global toggle
  const [cfDetail, setCfDetail] = useState(false); // show detail rows
  const [cfYrs, setCfYrs] = useState(15);
  useEffect(() => { if (globalExpand > 0) { const expand = globalExpand % 2 === 1; setCfAllOpen(expand); setCfDetail(expand); setLandOpen(expand); setShowLandRentDetail(expand); const obj = {}; (project?.assets||[]).forEach((_, i) => { obj[i] = expand; }); setCfOpen(obj); }}, [globalExpand]);
  const ar = lang === "ar";
  const toggleCol = (key) => { setHiddenCols(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; }); };
  const visibleCols = cols.filter(c => !hiddenCols.has(c.key));

  // Phase management
  const addPhase = () => { const n = project.phases.length + 1; const prevYear = project.phases[project.phases.length-1]?.completionYear || ((project.startYear||2026) + 3); updateProject({ phases: [...project.phases, { name: `Phase ${n}`, startYearOffset: n, completionYear: prevYear + 2, footprint: 0 }] }); };
  const renamePhase = (i, name) => { const ph = [...project.phases]; ph[i] = { ...ph[i], name }; updateProject({ phases: ph }); };
  const rmPhase = (i) => { if (project.phases.length <= 1) return; updateProject({ phases: project.phases.filter((_, j) => j !== i) }); };

  // Auto-calculate footprint per phase from assets
  const phaseFootprints = {};
  phaseNames.forEach(pn => { phaseFootprints[pn] = assets.filter(a => a.phase === pn).reduce((s, a) => s + (a.footprint || 0), 0); });

  // Filtered asset indices (display only - editIdx still references original array)
  const filteredIndices = assets.map((_, i) => i).filter(i => {
    const a = assets[i];
    if (filterPhase !== "all" && a.phase !== filterPhase) return false;
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterRev !== "all" && a.revType !== filterRev) return false;
    return true;
  });
  const isFiltered = filterPhase !== "all" || filterCat !== "all" || filterRev !== "all";

  const up = updateProject;
  const cur = project.currency || "SAR";

  return (
    <div>
      {/* ═══ LAND SECTION — REDESIGNED ═══ */}
      <div style={{background:"var(--surface-card)",borderRadius:12,border:"0.5px solid var(--border-default)",marginBottom:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        {/* Header — clickable to collapse */}
        <div onClick={()=>setLandOpen(!landOpen)} style={{padding:"10px 14px",background:"var(--surface-table-header)",borderBottom:landOpen?"1px solid #e5e7ec":"none",display:"flex",alignItems:"center",gap:6,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"} onMouseLeave={e=>e.currentTarget.style.background="#f8f9fb"}>
          <span style={{fontSize:10,color:"var(--text-tertiary)",transition:"transform 0.2s",transform:landOpen?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
          <span style={{fontSize:14}}>🏗</span>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{ar?"الأرض":"Land"}</span>
          </div>
          {project.landArea > 0 && <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:9,color:"#059669",background:"#ecfdf5",padding:"2px 8px",borderRadius:10,fontWeight:600}}>
              {LAND_TYPES.find(lt=>lt.value===project.landType)?.[ar?"ar":"en"]||project.landType}
            </span>
            <span style={{fontSize:9,color:"var(--text-secondary)",background:"#f3f4f6",padding:"2px 8px",borderRadius:10,fontWeight:500}}>
              {fmt(project.landArea)} {ar?"م²":"m²"}
            </span>
          </div>}
        </div>

        {landOpen && <>

        {/* Row 1: Tenure + Area */}
        <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
              {ar?"نوع الحيازة":"Tenure Type"}
              <HelpLink contentKey="landType" lang={lang} onOpen={setLandEduModal} />
            </div>
            <select value={project.landType} onChange={e=>up({landType:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"var(--surface-card)",fontSize:12,fontFamily:"inherit",color:"var(--text-primary)",cursor:"pointer"}}>
              {LAND_TYPES.map(lt => <option key={lt.value} value={lt.value}>{ar?lt.ar:lt.en}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:10,color:project.landArea<0?"#ef4444":"#6b7080",marginBottom:3,fontWeight:500}}>{ar?"إجمالي المساحة":"Total Area"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"م²":"sqm"})</span></div>
            <div style={project.landArea<0?{borderRadius:6,boxShadow:"0 0 0 1.5px #ef4444"}:undefined}><SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landArea} onChange={v=>up({landArea:v})} /></div>
            {project.landArea<0&&<div style={{fontSize:9,color:"#ef4444",marginTop:2}}>{ar?"لا يمكن أن تكون سالبة":"Cannot be negative"}</div>}
          </div>
        </div>

        {/* Purchase-specific */}
        {project.landType==="purchase"&&<div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:"1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"سعر الشراء":"Purchase Price"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({cur})</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landPurchasePrice} onChange={v=>up({landPurchasePrice:v})} />
            {project.landPurchasePrice > 0 && project.landArea > 0 && <div style={{fontSize:10,color:"#2EC4B6",marginTop:4}}>= {fmt(Math.round(project.landPurchasePrice / project.landArea))} {cur}/{ar?"م²":"sqm"}</div>}
          </div>
        </div>}

        {/* Partner-specific */}
        {project.landType==="partner"&&<div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"تقييم الأرض":"Land Valuation"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({cur})</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landValuation} onChange={v=>up({landValuation:v})} />
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"نسبة حصة الشريك":"Partner Equity"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>(%)</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.partnerEquityPct} onChange={v=>up({partnerEquityPct:v})} />
          </div>
        </div>}

        {/* BOT-specific */}
        {project.landType==="bot"&&<div style={{padding:"0 14px 10px"}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"فترة التشغيل":"Operation Period"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنوات":"years"})</span></div>
            <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.botOperationYears} onChange={v=>up({botOperationYears:v})} />
          </div>
        </div>}

        {/* ── Lease Details ── */}
        {project.landType==="lease"&&<>
          {/* Sub-header: عقد الإيجار */}
          <div style={{padding:"8px 14px 4px",borderTop:"1px solid #f0f1f5"}}>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-tertiary)",textTransform:"uppercase",letterSpacing:0.5,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:4,height:4,borderRadius:2,background:"#2EC4B6"}} />
              {ar?"تفاصيل عقد الإيجار":"Lease Contract Details"}
            </div>
          </div>

          {/* Lease Row 1: Annual Rent (full width emphasis) */}
          <div style={{padding:"6px 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"الإيجار السنوي":"Annual Rent"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({cur})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentAnnual} onChange={v=>up({landRentAnnual:v})} />
              {project.landRentAnnual > 0 && project.landArea > 0 && <div style={{fontSize:10,color:"#2EC4B6",marginTop:4}}>= {fmt(Math.round(project.landRentAnnual / project.landArea * 100)/100)} {cur}/{ar?"م²":"sqm"}/{ar?"سنة":"yr"}</div>}
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"مدة العقد":"Term"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentTerm} onChange={v=>up({landRentTerm:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"فترة السماح":"Grace"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentGrace} onChange={v=>up({landRentGrace:v})} />
            </div>
          </div>

          {/* Lease Row 2: Escalation */}
          <div style={{padding:"0 14px 10px",display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"نسبة الزيادة":"Escalation"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>(%)</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentEscalation} onChange={v=>up({landRentEscalation:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"كل":"Every"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"yrs"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landRentEscalationEveryN} onChange={v=>up({landRentEscalationEveryN:v})} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"بداية العقد":"Lease Start"} <span style={{fontWeight:400,color:"var(--text-tertiary)"}}>({ar?"سنة":"year"})</span></div>
              <SidebarInput style={{background:"var(--surface-card)",color:"var(--text-primary)",border:"0.5px solid var(--border-default)"}} type="number" value={project.landLeaseStartYear||0} onChange={v=>up({landLeaseStartYear:v})} placeholder={String(project.startYear||2026)} />
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3,fontWeight:500}}>{ar?"قاعدة بداية الإيجار":"Rent Start Rule"}</div>
              <select value={project.landRentStartRule||"auto"} onChange={e=>up({landRentStartRule:e.target.value})} style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"var(--surface-card)",fontSize:12,fontFamily:"inherit",color:"var(--text-primary)",cursor:"pointer"}}>
                <option value="auto">{ar?"تلقائي (افتراضي)":"Auto (default)"}</option>
                <option value="grace">{ar?"بعد انتهاء السماح":"After Grace Period"}</option>
                <option value="income">{ar?"بعد أول إيراد":"After First Income"}</option>
              </select>
            </div>
          </div>

          {/* Rent allocation details */}
          {results?.landRentMeta?.rentStartYear != null && <div style={{padding:"0 14px 10px"}}>
            <button onClick={()=>setShowLandRentDetail(!showLandRentDetail)} style={{fontSize:11,color:"#2EC4B6",background:"#f0fdfa",border:"1px solid #ccfbf1",borderRadius:8,padding:"4px 8px",cursor:"pointer",width:"100%",textAlign:"start",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#e6fffa"} onMouseLeave={e=>e.currentTarget.style.background="#f0fdfa"}>
              <span style={{fontSize:10}}>{showLandRentDetail?"▼":"▶"}</span>
              {ar?"تفاصيل توزيع الإيجار بين المراحل":"Land Rent Allocation Details"}
              {results.landRentMeta.rentStartYear != null && <span style={{marginInlineStart:"auto",fontSize:10,color:"#059669",fontWeight:500}}>{ar?"يبدأ":"Starts"} {results.landRentMeta.rentStartYear + (results?.startYear||2026)}</span>}
            </button>
            {showLandRentDetail && (() => {
              const m = results.landRentMeta;
              const sy = results?.startYear||2026;
              const phases = m.phaseShares ? Object.entries(m.phaseShares) : [];
              const isManual = !!project.landRentManualAlloc && Object.keys(project.landRentManualAlloc).length > 0;
              const manualSum = isManual ? Object.values(project.landRentManualAlloc).reduce((s,v)=>s+(Number(v)||0),0) : 0;
              return <div style={{background:"#f8fffe",border:"1px solid #d1fae5",borderRadius:8,padding:10,marginTop:4,fontSize:10}}>
                <div style={{display:"flex",gap:12,marginBottom:6,color:"#374151"}}>
                  <span>{ar?"بداية العقد:":"Lease starts:"} <strong>{m.leaseStartAbsolute||sy}</strong></span>
                  <span>{ar?"السماح:":"Grace:"} <strong>{project.landRentGrace||0} {ar?"سنة":"yr"}</strong></span>
                  <span>{ar?"أول إيجار:":"First rent:"} <strong>{m.rentStartYear + sy}</strong></span>
                </div>
                {phases.length > 0 && <>
                  <div style={{fontWeight:700,marginTop:6,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11}}>
                    <span>{ar?"التوزيع بين المراحل:":"Phase allocation:"}</span>
                    <button onClick={()=>{
                      if (isManual) { up({landRentManualAlloc:null}); }
                      else { const init={}; phases.forEach(([pn,ps])=>{init[pn]=Math.round((ps.share||0)*100);}); up({landRentManualAlloc:init}); }
                    }} style={{fontSize:10,padding:"3px 10px",borderRadius:6,border:"1px solid "+(isManual?"#f59e0b":"#d1d5db"),background:isManual?"#fffbeb":"#fff",color:isManual?"#b45309":"#6b7080",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                      {isManual ? (ar?"⚙ يدوي":"⚙ Manual") : (ar?"تلقائي":"Auto")}
                    </button>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{borderBottom:"2px solid #d1fae5"}}>
                      <th style={{textAlign:"start",padding:"2px 4px",color:"var(--text-secondary)",fontWeight:600}}>{ar?"المرحلة":"Phase"}</th>
                      <th style={{textAlign:"right",padding:"2px 4px",color:"var(--text-secondary)",fontWeight:600}}>{ar?"المساحة":"Area"}</th>
                      <th style={{textAlign:"right",padding:"2px 4px",color:"var(--text-secondary)",fontWeight:600}}>{ar?"الحصة":"Share"}</th>
                    </tr></thead>
                    <tbody>
                      {phases.map(([pn,ps])=><tr key={pn} style={{borderBottom:"1px solid #ecfdf5"}}>
                        <td style={{padding:"2px 4px",fontWeight:500}}>{pn}</td>
                        <td style={{padding:"2px 4px",textAlign:"right"}}>{(ps.footprint||0).toLocaleString()}</td>
                        <td style={{padding:"2px 4px",textAlign:"right",fontWeight:600}}>
                          {isManual ? <input type="number" value={project.landRentManualAlloc?.[pn]??""} onChange={e=>{const cur={...(project.landRentManualAlloc||{})};cur[pn]=Number(e.target.value)||0;up({landRentManualAlloc:cur});}} style={{width:48,textAlign:"right",padding:"2px 4px",border:"1px solid #d1d5db",borderRadius:4,fontSize:11,fontWeight:600,fontFamily:"inherit"}} /> : <span>{((ps.share)*100).toFixed(0)}%</span>}
                        </td>
                      </tr>)}
                      {isManual && <tr style={{borderTop:"2px solid #d1fae5",fontWeight:700}}>
                        <td colSpan={2} style={{padding:"2px 4px",textAlign:"right",fontSize:10}}>{ar?"المجموع":"Total"}</td>
                        <td style={{padding:"2px 4px",textAlign:"right",color:Math.abs(manualSum-100)>0.1?"#ef4444":"#059669"}}>{manualSum}%</td>
                      </tr>}
                    </tbody>
                  </table>
                  {isManual && Math.abs(manualSum-100)>0.1 && <div style={{marginTop:6,padding:"4px 8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,fontSize:10,color:"#dc2626",fontWeight:500}}>
                    ⚠ {ar?"المجموع = "+manualSum+"% (يجب 100%)":"Total = "+manualSum+"% (should be 100%)"}
                  </div>}
                </>}
              </div>;
            })()}
          </div>}
        </>}
        </>}
      </div>
      {landEduModal && <EducationalModal contentKey={landEduModal} lang={lang} onClose={()=>setLandEduModal(null)} />}

      {/* ═══ PHASES BAR ═══ */}
      <div style={{background:"var(--surface-card)",borderRadius:8,border:"0.5px solid var(--border-default)",padding:"8px 12px",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المراحل":"Phases"}</span>
          <div style={{flex:1}} />
          <button onClick={addPhase} style={{...btnS,background:"#f0f4ff",color:"#2563eb",padding:"3px 10px",fontSize:9,fontWeight:600,border:"1px solid #bfdbfe"}}>+ {ar?"مرحلة":"Phase"}</button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {project.phases.map((ph, i) => {
            const assetCount = assets.filter(a => a.phase === ph.name).length;
            return (
              <div key={i} style={{background:"var(--surface-table-header)",borderRadius:6,border:"0.5px solid var(--border-default)",padding:"4px 10px",display:"flex",alignItems:"center",gap:6}}>
                {editingPhase === i ? (
                  <input value={ph.name} onChange={e => renamePhase(i, e.target.value)} onBlur={() => setEditingPhase(null)} onKeyDown={e => { if (e.key === "Enter") setEditingPhase(null); }} autoFocus style={{fontSize:11,fontWeight:600,border:"1px solid #2563eb",borderRadius:3,padding:"1px 5px",width:80,fontFamily:"inherit",outline:"none"}} />
                ) : (
                  <span onClick={() => setEditingPhase(i)} style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",cursor:"pointer"}} title={ar?"اضغط لإعادة التسمية":"Click to rename"}>{ph.name}</span>
                )}
                <span style={{fontSize:9,color:"var(--text-tertiary)",background:"#e5e7ec",borderRadius:8,padding:"1px 5px"}}>{assetCount}</span>
                <span style={{fontSize:9,color:"var(--text-secondary)",marginInlineStart:2}} title={ar?"سنة افتتاح المرحلة":"Phase opening year"}>{ar?"افتتاح:":"Opens:"}</span>
                <input type="number" value={ph.completionYear||(project.startYear||2026)+Math.ceil((ph.completionMonth||36)/12)} onChange={e=>{const ph2=[...project.phases];ph2[i]={...ph2[i],completionYear:parseInt(e.target.value)||2030};updateProject({phases:ph2});}} style={{width:48,fontSize:10,fontWeight:600,border:"0.5px solid var(--border-default)",borderRadius:3,padding:"1px 4px",textAlign:"center",fontFamily:"inherit",background:"var(--surface-card)"}} min={project.startYear||2026} />
                {project.phases.length > 1 && (
                  <button onClick={()=>rmPhase(i)} style={{background:"none",border:"none",color:"#d0d4dc",padding:0,fontSize:11,cursor:"pointer",lineHeight:1,fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#d0d4dc"} title={ar?"حذف":"Delete"}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {assets.length > 0 && (
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:600,color:"var(--text-secondary)"}}>{ar?"فلترة:":"Filter:"}</span>
          <select value={filterPhase} onChange={e=>setFilterPhase(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit",color:"var(--text-primary)"}}>
            <option value="all">{ar?"كل المراحل":"All Phases"}</option>
            {phaseNames.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit",color:"var(--text-primary)"}}>
            <option value="all">{ar?"كل التصنيفات":"All Categories"}</option>
            {[...new Set(assets.map(a=>a.category))].filter(Boolean).map(c=><option key={c} value={c}>{catL(c,ar)}</option>)}
          </select>
          <select value={filterRev} onChange={e=>setFilterRev(e.target.value)} style={{padding:"5px 10px",fontSize:10,borderRadius:5,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit",color:"var(--text-primary)"}}>
            <option value="all">{ar?"كل أنواع الإيراد":"All Rev Types"}</option>
            {[...new Set(assets.map(a=>a.revType))].filter(Boolean).map(r2=><option key={r2} value={r2}>{revL(r2,ar)}</option>)}
          </select>
          {(filterPhase!=="all"||filterCat!=="all"||filterRev!=="all") && (
            <button onClick={()=>{setFilterPhase("all");setFilterCat("all");setFilterRev("all");}} style={{...btnS,padding:"4px 10px",fontSize:10,background:"#fef2f2",color:"#ef4444",border:"1px solid #fecaca"}}>{ar?"مسح الفلتر":"Clear"}</button>
          )}
        </div>
      )}

      {/* ── Asset Header ── */}
      <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:15,fontWeight:600}}>{t.assetProgram}</div>
        <div style={{fontSize:12,color:"var(--text-secondary)"}}>{isFiltered?`${filteredIndices.length}/${assets.length}`:assets.length} {t.assets}</div>
        <div style={{flex:1}} />
        <div style={{display:"flex",background:"var(--surface-sidebar)",borderRadius:6,padding:2}}>
          <button onClick={()=>setViewMode("cards")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="cards"?"#fff":"transparent",color:viewMode==="cards"?"#1a1d23":"#9ca3af",boxShadow:viewMode==="cards"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>▦ {lang==="ar"?"بطاقات":"Cards"}</button>
          <button onClick={()=>setViewMode("table")} style={{...btnS,padding:"5px 10px",fontSize:10,fontWeight:600,background:viewMode==="table"?"#fff":"transparent",color:viewMode==="table"?"#1a1d23":"#9ca3af",boxShadow:viewMode==="table"?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>☰ {lang==="ar"?"جدول":"Table"}</button>
        </div>
        {viewMode==="table" && <div style={{position:"relative"}}>
          <button onClick={()=>setShowColPicker(!showColPicker)} style={{...btnS,background:showColPicker?"#e0e7ff":"#f0f1f5",color:"var(--text-secondary)",padding:"5px 10px",fontSize:10,fontWeight:500,border:"0.5px solid var(--border-default)"}} title={ar?"إظهار/إخفاء أعمدة":"Show/Hide Columns"}>⚙ {ar?"أعمدة":"Cols"} ({cols.length - hiddenCols.size}/{cols.length})</button>
          {showColPicker && <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"var(--surface-card)",border:"0.5px solid var(--border-default)",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:200,padding:"8px 0",width:180,maxHeight:320,overflowY:"auto"}}>
            {cols.filter(c=>!["#","ops"].includes(c.key)).map(c=>(
              <label key={c.key} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",fontSize:11,cursor:"pointer",color:hiddenCols.has(c.key)?"#9ca3af":"#1a1d23"}} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={!hiddenCols.has(c.key)} onChange={()=>toggleCol(c.key)} style={{accentColor:"#2563eb"}} />
                {ar?c.ar:c.en}
              </label>
            ))}
            <div style={{borderTop:"1px solid #e5e7ec",margin:"4px 0"}} />
            <button onClick={()=>setHiddenCols(new Set())} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"#2563eb",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"إظهار الكل":"Show All"}</button>
            <button onClick={()=>setHiddenCols(new Set(["plotArea","footprint","esc","ramp","occ","code","hardCost"]))} style={{width:"100%",padding:"5px 14px",fontSize:10,color:"var(--text-secondary)",background:"none",border:"none",cursor:"pointer",textAlign:"start",fontFamily:"inherit"}}>{ar?"الافتراضي":"Default"}</button>
          </div>}
        </div>}
        {/* Quick Soft Cost & Contingency inputs */}
        <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:"#faf5ff",borderRadius:6,border:"1px solid #e9d5ff"}}>
          <span style={{fontSize:9,color:"#7c3aed",fontWeight:600,whiteSpace:"nowrap"}}>{ar?"غ.مباشرة":"Soft"}</span>
          <input type="number" value={project.softCostPct??10} onChange={e=>up({softCostPct:parseFloat(e.target.value)||0})} style={{width:38,padding:"2px 4px",fontSize:11,border:"1px solid #d8b4fe",borderRadius:4,textAlign:"center",background:"#fff",fontFamily:"inherit"}} title={ar?"تكاليف غير مباشرة % (تصميم، إشراف، تصاريح)":"Soft Cost % (design, supervision, permits)"} />
          <span style={{fontSize:9,color:"#7c3aed"}}>%</span>
          <span style={{color:"#d8b4fe",fontSize:10}}>|</span>
          <span style={{fontSize:9,color:"#7c3aed",fontWeight:600,whiteSpace:"nowrap"}}>{ar?"احتياطي":"Cont"}</span>
          <input type="number" value={project.contingencyPct??5} onChange={e=>up({contingencyPct:parseFloat(e.target.value)||0})} style={{width:38,padding:"2px 4px",fontSize:11,border:"1px solid #d8b4fe",borderRadius:4,textAlign:"center",background:"#fff",fontFamily:"inherit"}} title={ar?"احتياطي % (طوارئ وتغييرات)":"Contingency % (overruns & changes)"} />
          <span style={{fontSize:9,color:"#7c3aed"}}>%</span>
        </div>
        <button onClick={()=>{generateTemplate();addToast(ar?"تم تحميل القالب":"Template downloaded","success");}} style={{...btnS,background:"#f0fdf4",color:"#16a34a",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bbf7d0"}} title={lang==='ar'?"تحميل قالب Excel":"Download Excel Template"}>
          {lang==='ar'?'⬇ تحميل نموذج':'⬇ Template'}
        </button>
        <button onClick={()=>{exportAssetsToExcel(project, results);addToast(ar?"تم تصدير الأصول":"Assets exported","success");}} style={{...btnS,background:"#eff6ff",color:"#2563eb",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #bfdbfe"}} title={lang==='ar'?"تصدير الأصول إلى Excel":"Export Assets to Excel"}>
          {lang==='ar'?'⬇ تصدير':'⬇ Export'}
        </button>
        <input type="file" accept=".csv,.tsv" ref={fileRef} onChange={handleUpload} style={{display:"none"}} />
        <button onClick={()=>fileRef.current?.click()} style={{...btnS,background:"#fef3c7",color:"#92400e",padding:"7px 14px",fontSize:11,fontWeight:500,border:"1px solid #fde68a"}} title={lang==='ar'?"رفع ملف Excel":"Upload Excel File"}>
          {lang==='ar'?'⬆ رفع ملف':'⬆ Upload'}
        </button>
        <button onClick={handleAddAsset} style={{...btnPrim,padding:"7px 16px",fontSize:12}}>{t.addAsset}</button>
      </div>

      {/* Import message */}
      {importMsg && (
        <div style={{
          marginBottom:12, padding:"10px 14px", borderRadius:6, fontSize:12,
          background: importMsg.type==='success'?'#f0fdf4':importMsg.type==='error'?'#fef2f2':'#fffbeb',
          color: importMsg.type==='success'?'#16a34a':importMsg.type==='error'?'#ef4444':'#92400e',
          border: `1px solid ${importMsg.type==='success'?'#bbf7d0':importMsg.type==='error'?'#fecaca':'#fde68a'}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span>{importMsg.text}</span>
          <button onClick={()=>setImportMsg(null)} style={{...btnSm,background:"transparent",color:"inherit",fontSize:14,padding:"0 4px"}}>✕</button>
        </div>
      )}
      {/* CARD VIEW */}
      {viewMode === "cards" && (<div>
        {assets.length===0 ? (<>
          {/* Asset Prep Guide */}
          <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 18px",background:"rgba(46,196,182,0.04)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:10,marginBottom:14}}>
            <span style={{fontSize:20,flexShrink:0}}>📋</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"ما تحتاجه لإضافة أصل:":"What you need to add an asset:"}</div>
              <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.8}}>{lang==="ar"?<>
                • مساحة الأرض ومساحة البناء (م²)<br/>• عدد الأدوار والمساحة الإجمالية GFA<br/>• تكلفة البناء لكل م²<br/>• مدة البناء (بالأشهر)<br/>• الإيجار لكل م² أو ADR للفنادق<br/>• نسبة الإشغال المتوقعة
              </>:<>
                • Land area and building footprint (sqm)<br/>• Number of floors and total GFA<br/>• Construction cost per sqm<br/>• Build duration (months)<br/>• Rent per sqm or ADR for hotels<br/>• Expected occupancy rate
              </>}</div>
              <div style={{fontSize:10,color:"#2EC4B6",marginTop:6,fontWeight:600}}>{lang==="ar"?"💡 اختر قالب جاهز عند الإضافة وسنعبئ معظم القيم تلقائياً":"💡 Pick a template when adding and most values will be pre-filled"}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,background:"rgba(46,196,182,0.03)",borderRadius:12,border:"1px dashed rgba(46,196,182,0.2)",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12,opacity:0.6}}>🏗</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{lang==="ar"?"لا توجد أصول بعد":"No Assets Yet"}</div>
            <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:20,maxWidth:360,lineHeight:1.6}}>{lang==="ar"?"أضف أصول مشروعك لبدء عرض التدفقات والتحليلات. استخدم الزر أدناه أو استورد من ملف.":"Add your project assets to start seeing cash flows and analytics. Use the button below or import from file."}</div>
            <button onClick={handleAddAsset} style={{background:"linear-gradient(135deg,#0f766e,#2EC4B6)",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              ➕ {lang==="ar"?"أضف أول أصل":"Add First Asset"}
            </button>
          </div>
        </>) : (
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill, minmax(280px, 1fr))",gap:isMobile?8:12}}>
            {filteredIndices.map(i=>{const a=assets[i];const comp=results?.assetSchedules?.[i];const capex=comp?.totalCapex||computeAssetCapex(a,project);const income=comp?.totalRevenue||0;const catC={Hospitality:"#8b5cf6",Retail:"#3b82f6",Office:"#06b6d4",Residential:"#22c55e",Marina:"#0ea5e9",Industrial:"#f59e0b",Cultural:"#ec4899"};const catI={Hospitality:"🏨",Retail:"🛍",Office:"🏢",Residential:"🏠",Marina:"⚓",Industrial:"🏭",Cultural:"🎭","Open Space":"🌳",Utilities:"⚡",Flexible:"🔧"};const cc=catC[a.category]||"#6b7080";
            return <div key={a.id||i} className="asset-card" onClick={()=>setEditIdx(i)} style={{background:"var(--surface-card)",borderRadius:12,border:"0.5px solid var(--border-default)",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",animationDelay:i*0.05+"s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
              <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{catI[a.category]||"📦"}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:10,color:"var(--text-tertiary)"}}>{a.code?a.code+" · ":""}{a.phase}</div></div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:10,background:cc+"15",color:cc,fontWeight:600}}>{catL(a.category,ar)}</span>
              </div>
              <div style={{padding:"10px 16px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                <div><span style={{color:"var(--text-tertiary)"}}>{ar?"GFA":"GFA"}</span><div style={{fontWeight:600}}>{fmt(a.gfa)} m²</div></div>
                <div><span style={{color:"var(--text-tertiary)"}}>{a.revType==="Lease"?(ar?"الإيجار":"Rate"):a.revType==="Sale"?(ar?"سعر البيع":"Sale Price"):(ar?"أرباح تشغيلية":"EBITDA")}</span><div style={{fontWeight:600}}>{a.revType==="Lease"?fmt(a.leaseRate)+" /m²":a.revType==="Sale"?fmt(a.salePricePerSqm||0)+" /m²":fmtM(a.opEbitda)}</div></div>
                <div><span style={{color:"var(--text-tertiary)"}}>{ar?"CAPEX":"CAPEX"}</span><div style={{fontWeight:700,color:"#ef4444"}}>{fmtM(capex)}</div></div>
                <div><span style={{color:"var(--text-tertiary)"}}>{ar?"الإيرادات":"Revenue"}</span><div style={{fontWeight:700,color:"#16a34a"}}>{fmtM(income)}</div></div>
              </div>
            </div>;})}
          </div>
        )}
        {/* ═══ TEMPLATE PICKER MODAL ═══ */}
        {showTemplatePicker && (<>
          <div onClick={()=>setShowTemplatePicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9990}} />
          <div style={{position:"fixed",zIndex:9991,top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:520,maxWidth:"94vw",background:"var(--surface-card)",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",overflow:"hidden",animation:"zanModalIn 0.2s ease-out"}}>
            <div style={{padding:"20px 24px 12px",borderBottom:"1px solid #f0f1f5"}}>
              <div style={{fontSize:18,fontWeight:700,color:"var(--text-primary)"}}>{ar?"اختر نوع الأصل":"Choose Asset Type"}</div>
              <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:4}}>{ar?"اختر قالب جاهز بقيم السوق السعودي، أو ابدأ فارغ":"Pick a template with Saudi market defaults, or start empty"}</div>
            </div>
            <div style={{padding:"16px 24px 24px",display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
              {ASSET_TEMPLATES.map(tmpl=>(
                <button key={tmpl.id} onClick={()=>handleTemplateSelect(tmpl.defaults)} style={{padding:"16px 12px",background:"var(--surface-hover)",border:"2px solid #e5e7ec",borderRadius:12,cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.background="#f0fdfa";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.background="#fafbfc";}}>
                  <div style={{fontSize:28,marginBottom:6}}>{tmpl.icon}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{tmpl.label}</div>
                </button>
              ))}
            </div>
          </div>
        </>)}
        {editIdx!==null&&editIdx<assets.length&&(()=>{const a=assets[editIdx],i=editIdx,comp=results?.assetSchedules?.[i],isOp=a.revType==="Operating",isSale=a.revType==="Sale",isH=isOp&&a.category==="Hospitality",isM=isOp&&a.category==="Marina";
        const F2=({label,children,error})=><div style={{marginBottom:8}}><div style={{fontSize:10,color:error?"#ef4444":"#6b7080",marginBottom:3,fontWeight:500}}>{label}</div><div style={error?{borderRadius:6,boxShadow:"0 0 0 1.5px #ef4444"}:undefined}>{children}</div>{error&&<div style={{fontSize:9,color:"#ef4444",marginTop:2}}>{error}</div>}</div>;
        const g3=isMobile?"1fr 1fr":"1fr 1fr 1fr";
        const g2=isMobile?"1fr":"1fr 1fr";
        return <><div onClick={()=>setEditIdx(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:9990}} />
        <div style={{position:"fixed",zIndex:9991,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--surface-card)",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",...(isMobile?{inset:0,borderRadius:0}:{top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:560,maxWidth:"94vw",maxHeight:"88vh",borderRadius:16,animation:"zanModalIn 0.2s ease-out"})}}>
          <div style={{padding:"16px 20px",borderBottom:"0.5px solid var(--border-default)",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{a.name||"Asset "+(i+1)}</div><div style={{fontSize:11,color:"var(--text-tertiary)"}}>{catL(a.category,ar)} · {a.phase}</div></div>
            <button onClick={()=>{dupAsset(i);setEditIdx(null);setTimeout(()=>setEditIdx(assets.length),80);}} style={{...btnS,background:"#eff6ff",color:"#2563eb",padding:"6px 12px",fontSize:11}} title={ar?"تكرار":"Duplicate"}>{ar?"📋 تكرار":"📋 Duplicate"}</button>
            <button onClick={()=>{rmAsset(i);setEditIdx(null);}} style={{...btnS,background:"#fef2f2",color:"#ef4444",padding:"6px 12px",fontSize:11}}>{ar?"حذف":"Delete"}</button>
            <button onClick={()=>setEditIdx(null)} style={{...btnS,background:"var(--surface-sidebar)",padding:"6px 10px",fontSize:16,lineHeight:1}}>✕</button>
          </div>
          <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
            {/* ── Group 1: Basic Info ── */}
            <FieldGroup icon="📝" title={ar?"أساسي":"Basic Info"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <F2 label={ar?"المرحلة":"Phase"}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></F2>
              <F2 label={ar?"التصنيف":"Category"}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></F2>
              <F2 label={ar?"نوع الإيراد":"Rev Type"}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></F2>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F2 label={ar?"الاسم":"Name"}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"اسم الأصل":"Name"} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"الرمز":"Code"}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 2: Areas & Dimensions ── */}
            <FieldGroup icon="📐" title={ar?"المساحات":"Areas & Dimensions"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <F2 label={ar?"مساحة القطعة Plot Area":"Plot Area"} error={a.plotArea<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"المسطح البنائي Footprint":"Footprint"} error={a.footprint<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"المساحة الطابقية GFA (م²)":"GFA (m²)"} error={a.gfa<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 3: Revenue ── */}
            <FieldGroup icon="💰" title={ar?"الإيرادات":"Revenue"}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <F2 label={ar?"نسبة الكفاءة Eff %":"Efficiency %"}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"معدل الإيجار Lease Rate /م²":"Lease Rate"}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"EBITDA التشغيلية":"Op EBITDA"}><EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              {isSale && <>
                <F2 label={ar?"سعر البيع/م²":"Sale Price/sqm"}><EditableCell type="number" value={a.salePricePerSqm||0} onChange={v=>upAsset(i,{salePricePerSqm:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
                <F2 label={ar?"سنوات الاستيعاب":"Absorption Yrs"}><EditableCell type="number" value={a.absorptionYears||3} onChange={v=>upAsset(i,{absorptionYears:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
                <F2 label={ar?"ما قبل البيع %":"Pre-Sale %"}><EditableCell type="number" value={a.preSalePct||0} onChange={v=>upAsset(i,{preSalePct:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
                <F2 label={ar?"عمولة البيع %":"Commission %"}><EditableCell type="number" value={a.commissionPct||0} onChange={v=>upAsset(i,{commissionPct:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              </>}
              <F2 label={ar?"نسبة الزيادة Esc %":"Escalation %"}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"سنوات النمو Ramp":"Ramp Years"}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"نسبة الإشغال Occ %":"Occupancy %"} error={a.stabilizedOcc>100?(ar?"الحد الأقصى 100%":"Max 100%"):a.stabilizedOcc<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
            </div>
</FieldGroup>
            {/* ── Group 4: Construction & Cost ── */}
            <FieldGroup icon="🏗️" title={ar?"البناء والتكاليف":"Construction & Cost"}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F2 label={ar?"تكلفة/م² Cost/sqm":"Cost/m²"} error={a.costPerSqm<0?(ar?"لا يمكن أن تكون سالبة":"Cannot be negative"):null}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
              <F2 label={ar?"مدة البناء (شهر)":"Build duration (months)"} error={a.constrDuration<1?(ar?"يجب شهر واحد على الأقل":"Must be at least 1 month"):a.constrDuration>120?(ar?"الحد الأقصى 120 شهر":"Max 120 months"):null}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} style={{padding:"7px 10px",border:"0.5px solid var(--border-default)",borderRadius:6,background:"var(--surface-hover)"}} /></F2>
            </div>
            {(isH||isM)&&<button onClick={()=>setModal({type:isH?"hotel":"marina",idx:i})} style={{...btnPrim,padding:"8px 16px",fontSize:12,marginTop:8}}>{isH?(ar?"⚙ حساب أرباح الفندق":"⚙ Hotel P&L"):(ar?"⚙ حساب أرباح المارينا":"⚙ Marina P&L")}</button>}
            </FieldGroup>
            <div style={{background:"var(--surface-table-header)",borderRadius:8,padding:12,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:8,fontSize:12}}>
              <div><span style={{color:"var(--text-secondary)"}}>{ar?"التكاليف:":"CAPEX:"}</span> <strong style={{color:"#ef4444"}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</strong></div>
              <div><span style={{color:"var(--text-secondary)"}}>{ar?"الإيرادات:":"Income:"}</span> <strong style={{color:"#16a34a"}}>{fmt(comp?.totalRevenue||0)}</strong></div>
              {(()=>{
                const sc = getAssetScore(a, comp);
                const vCfg = { strong:{bg:"#dcfce7",color:"#15803d",t:ar?"مجدي":"Viable"}, ok:{bg:"#fef9c3",color:"#854d0e",t:ar?"مقبول":"Marginal"}, weak:{bg:"#fef2f2",color:"#991b1b",t:ar?"ضعيف":"Weak"}, none:{bg:"#f0f1f5",color:"var(--text-tertiary)",t:"—"} }[sc.viable];
                const wPct = (sc.capexWeight * 100).toFixed(0);
                const impLabel = sc.impact==="high"?(ar?"أثر كبير":"High impact"):sc.impact==="med"?(ar?"أثر متوسط":"Med impact"):(ar?"أثر محدود":"Low impact");
                return <div><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:vCfg.bg,color:vCfg.color,fontWeight:600}}>{vCfg.t}</span> <span style={{fontSize:9,color:"var(--text-secondary)"}}>{impLabel} ({wPct}%)</span></div>;
              })()}
            </div>
          </div>
        </div></>;})()}
      </div>)}
      {/* TABLE VIEW */}
      {viewMode === "table" && (<>
      <div style={{background:"var(--surface-card)",borderRadius:8,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
        <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{...tblStyle,fontSize:11,tableLayout:"auto"}}>
            <thead>
              <tr>
                {visibleCols.map(c=>(
                  <th key={c.key} style={{...thSt,whiteSpace:"nowrap",minWidth:c.w,maxWidth:c.w*2.5, ...(c.key==="hardCost"?{background:"#f8fafc"}:c.key==="addons"?{background:"#faf5ff"}:c.key==="totalCapex"?{background:"#eef2ff"}:c.key==="totalInc"?{background:"#ecfdf5"}:c.key==="score"?{background:"#fefce8"}:{})}}>
                    <div style={{fontSize:11}}>{ar?c.ar:c.en}</div>
                    {c.ar!==c.en&&!ar&&<div style={{fontWeight:400,fontSize:8,color:"var(--text-tertiary)",lineHeight:1.1}}>{c.ar}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length===0?(
                <tr><td colSpan={visibleCols.length} style={{...tdSt,textAlign:"center",color:"var(--text-secondary)",padding:"40px 20px"}}>
                  <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>🏗</div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{lang==="ar"?"لا توجد أصول":"No assets yet"}</div>
                  <div style={{fontSize:11,color:"var(--text-tertiary)"}}>{lang==="ar"?"اضغط '+ إضافة أصل' للبدء":"Click '+ Add Asset' to start"}</div>
                </td></tr>
              ):(
                filteredIndices.map(i=>{
                  const a = assets[i];
                  const comp = results?.assetSchedules?.[i];
                  const isOp = a.revType === "Operating";
                  const isHotel = isOp && (a.category === "Hospitality");
                  const isMarina = isOp && (a.category === "Marina");
                  const bg = i%2===0?"#fff":"#fafbfc";
                  const hd = (key) => hiddenCols.has(key) ? {display:"none"} : {};
                  return (
                    <tr key={a.id||i} style={{background:bg}}>
                      <td style={{...tdSt,color:"var(--text-tertiary)",fontWeight:500,width:28,...hd("#")}}>{i+1}</td>
                      <td style={{...tdSt,...hd("phase")}}><EditableCell options={phaseNames} value={a.phase} onChange={v=>upAsset(i,{phase:v})} /></td>
                      <td style={{...tdSt,...hd("name")}}><EditableCell value={a.name} onChange={v=>upAsset(i,{name:v})} placeholder={ar?"الاسم":"Name"} /></td>
                      <td style={{...tdSt,...hd("category")}}><EditableCell options={CATEGORIES} labelMap={ar?CAT_AR:null} value={a.category} onChange={v=>handleCategoryChange(i,v)} /></td>
                      <td style={{...tdSt,...hd("code")}}><EditableCell value={a.code} onChange={v=>upAsset(i,{code:v})} style={{width:40}} /></td>
                      <td style={{...tdSt,...hd("gfa")}}><EditableCell type="number" value={a.gfa} onChange={v=>upAsset(i,{gfa:v})} /></td>
                      <td style={{...tdSt,...hd("eff")}}>{(()=>{const bc=benchmarkColor("efficiency",a.efficiency,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip}%`:undefined}><EditableCell type="number" value={a.efficiency} onChange={v=>upAsset(i,{efficiency:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,color:"var(--text-secondary)",textAlign:"right",fontSize:11,...hd("leasable")}}>{fmt(comp?.leasableArea||(a.gfa||0)*(a.efficiency||0)/100)}</td>
                      <td style={{...tdSt,...hd("plotArea")}}><EditableCell type="number" value={a.plotArea} onChange={v=>upAsset(i,{plotArea:v})} /></td>
                      <td style={{...tdSt,...hd("footprint")}}><EditableCell type="number" value={a.footprint} onChange={v=>upAsset(i,{footprint:v})} /></td>
                      <td style={{...tdSt,...hd("revType")}}><EditableCell options={REV_TYPES} labelMap={ar?REV_AR:null} value={a.revType} onChange={v=>upAsset(i,{revType:v})} /></td>
                      <td style={{...tdSt,background:isOp?"#f5f5f5":undefined,...hd("rate")}}>{(()=>{const bc=benchmarkColor("leaseRate",a.leaseRate,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.leaseRate} onChange={v=>upAsset(i,{leaseRate:v})} style={{opacity:isOp?0.3:1,...(bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:{})}} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("opEbitda")}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          {isOp ? (
                            <>
                              <span style={{fontSize:10,color:"var(--text-secondary)",minWidth:55,textAlign:"right"}}>{fmtM(a.opEbitda||0)}</span>
                              {(isHotel||isMarina) && <button onClick={()=>setModal({type:isHotel?"hotel":"marina",idx:i})} style={{...btnSm,background:"#eef2ff",color:"#2563eb",fontSize:9,padding:"2px 6px",whiteSpace:"nowrap"}}>{isHotel?"P&L":"P&L"}</button>}
                            </>
                          ) : (
                            <EditableCell type="number" value={a.opEbitda} onChange={v=>upAsset(i,{opEbitda:v})} />
                          )}
                        </div>
                      </td>
                      <td style={{...tdSt,...hd("occ")}}><EditableCell type="number" value={a.stabilizedOcc} onChange={v=>upAsset(i,{stabilizedOcc:v})} /></td>
                      <td style={{...tdSt,...hd("esc")}}><EditableCell type="number" value={a.escalation} onChange={v=>upAsset(i,{escalation:v})} /></td>
                      <td style={{...tdSt,...hd("ramp")}}><EditableCell type="number" value={a.rampUpYears} onChange={v=>upAsset(i,{rampUpYears:v})} /></td>
                      <td style={{...tdSt,...hd("cost")}}>{(()=>{const bc=benchmarkColor("costPerSqm",a.costPerSqm,a.category);return <span title={bc.tip?`Benchmark: ${bc.tip} SAR/sqm`:undefined}><EditableCell type="number" value={a.costPerSqm} onChange={v=>upAsset(i,{costPerSqm:v})} style={bc.color?{borderLeft:`3px solid ${bc.color}`,paddingLeft:4}:undefined} /></span>;})()}</td>
                      <td style={{...tdSt,...hd("dur")}}><EditableCell type="number" value={a.constrDuration} onChange={v=>upAsset(i,{constrDuration:v})} /></td>
                      {/* Hard Cost = GFA × Cost/m² (before soft cost & contingency) */}
                      <td style={{...tdSt,textAlign:"right",fontSize:11,color:"var(--text-secondary)",...hd("hardCost")}}>{fmt((a.gfa||0)*(a.costPerSqm||0))}</td>
                      {/* Soft Cost + Contingency addon amount */}
                      <td style={{...tdSt,textAlign:"right",fontSize:10,color:"#7c3aed",background:"#faf5ff",...hd("addons")}} title={`${ar?"غير مباشرة":"Soft"}: ${project.softCostPct||0}% + ${ar?"احتياطي":"Cont"}: ${project.contingencyPct||0}%`}>{fmt((comp?.totalCapex||computeAssetCapex(a,project)) - (a.gfa||0)*(a.costPerSqm||0))}</td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,background:"#f5f7ff",fontSize:11,...hd("totalCapex")}}>{fmt(comp?.totalCapex||computeAssetCapex(a,project))}</td>
                      <td style={{...tdSt,textAlign:"right",fontWeight:600,color:"#16a34a",background:"#f0fdf4",fontSize:11,...hd("totalInc")}}>{fmt(comp?.totalRevenue||0)}</td>
                      <td style={{...tdSt,background:"#fffdf5",overflow:"visible",position:"relative",...hd("score")}}>{(()=>{
                        const sc = getAssetScore(a, comp);
                        return <ScoreCell sc={sc} name={a.name} ar={ar} />;
                      })()}</td>
                      <td style={{...tdSt,...hd("ops")}}><div style={{display:"flex",gap:3}}><button onClick={(e)=>{e.stopPropagation();dupAsset(i);}} style={{...btnSm,background:"#eff6ff",color:"#2563eb",fontSize:10}} title={ar?"تكرار":"Dup"}>📋</button><button onClick={()=>rmAsset(i)} style={{...btnSm,background:"#fef2f2",color:"#ef4444",fontSize:10}}>✕</button></div></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* ═══ ASSET CASH FLOW TABLE ═══ */}
      {results?.assetSchedules?.length > 0 && (() => {
        const h = results.horizon;
        const sy = results.startYear;
        const yrs = Array.from({length: Math.min(cfYrs, h)}, (_, i) => i);
        const phaseRes = results.phaseResults || {};
        // Compute per-asset land rent (proportional by footprint within phase)
        const getAssetLandRent = (idx) => {
          const a = results.assetSchedules[idx];
          const pName = a.phase || "Phase 1";
          const pr = phaseRes[pName];
          if (!pr || !pr.landRent) return new Array(h).fill(0);
          const pFP = pr.footprint || 1;
          const aFP = a.footprint || 0;
          const ratio = pFP > 0 ? aFP / pFP : 0;
          return pr.landRent.map(v => v * ratio);
        };
        // Aggregate for filtered assets
        const aggRev = new Array(h).fill(0), aggCap = new Array(h).fill(0), aggLR = new Array(h).fill(0);
        filteredIndices.forEach(i => {
          const a = results.assetSchedules[i];
          const lr = getAssetLandRent(i);
          if (a) for (let y = 0; y < h; y++) {
            aggRev[y] += a.revenueSchedule[y] || 0;
            aggCap[y] += a.capexSchedule[y] || 0;
            aggLR[y] += lr[y] || 0;
          }
        });
        // Add land purchase CAPEX allocation (project-level, not in assetSchedules)
        const _landPurchase = project.landType === "purchase" ? (project.landPurchasePrice || 0) : 0;
        if (_landPurchase > 0) {
          const _allScheds = results.assetSchedules || [];
          const _totalFP = _allScheds.reduce((s, a) => s + (a.footprint || 0), 0);
          const _filtFP = filteredIndices.reduce((s, i) => s + (_allScheds[i]?.footprint || 0), 0);
          const _alloc = _totalFP > 0 ? _filtFP / _totalFP : 1;
          aggCap[0] += _landPurchase * _alloc;
        }
        const toggleAllCF = () => {
          const next = !cfAllOpen;
          setCfAllOpen(next);
          const obj = {};
          filteredIndices.forEach(i => { obj[i] = next; });
          setCfOpen(obj);
        };
        const tdS = {padding:"3px 6px",fontSize:10,textAlign:"right",borderBottom:"1px solid #f0f1f3",whiteSpace:"nowrap"};
        const hdS = {padding:"3px 6px",fontSize:9,fontWeight:600,color:"var(--text-secondary)",textAlign:"right",borderBottom:"0.5px solid var(--border-default)",whiteSpace:"nowrap",position:"sticky",top:0,background:"var(--surface-hover)",zIndex:1};
        const lblS = {padding:"3px 8px",fontSize:10,fontWeight:500,textAlign:"left",borderBottom:"1px solid #f0f1f3",whiteSpace:"nowrap",position:"sticky",left:0,background:"var(--surface-card)",zIndex:1};
        const renderCFRows = (rev, cap, lr, label, color) => {
          const netInc = rev.map((v, y) => v - (lr[y]||0));
          const netCF = rev.map((v, y) => v - (lr[y]||0) - (cap[y]||0));
          let cum = 0;
          const cumCF = netCF.map(v => { cum += v; return cum; });
          const rows = [
            {l: ar?"إيرادات":"Revenue", d: rev, c:"#16a34a", show:true},
            {l: ar?"(-) إيجار أرض":"(-) Land Rent", d: lr, c:"#f59e0b", neg:true, show:true},
            {l: ar?"(-) تكاليف تطوير":"(-) CAPEX", d: cap, c:"#ef4444", neg:true, show:true},
            {l: ar?"= صافي التدفق":"= Net CF", d: netCF, c:"#1a1d23", bold:true, show:true},
            {l: ar?"صافي دخل":"Net Income", d: netInc, c:"#2563eb", show:cfDetail},
            {l: ar?"تراكمي":"Cumulative", d: cumCF, c:"#8b5cf6", show:cfDetail},
          ];
          return rows.filter(r => r.show).map((r, ri) => (
            <tr key={ri} style={r.bold?{background:"var(--surface-table-header)"}:undefined}>
              <td style={{...lblS,color:r.c,fontWeight:r.bold?700:500,fontSize:r.bold?11:10}}>{r.l}</td>
              {yrs.map(y => {
                const v = r.d[y]||0;
                return <td key={y} style={{...tdS,color:v<0?"#ef4444":v>0?r.c:"#d0d4dc",fontWeight:r.bold?600:400}}>{v===0?"—":r.neg?fmt(-v):fmt(v)}</td>;
              })}
            </tr>
          ));
        };
        return (
          <div style={{marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{ar?"التدفق النقدي للأصول":"Asset Cash Flows"}</span>
              <button onClick={toggleAllCF} style={{fontSize:9,padding:"3px 10px",borderRadius:5,border:"0.5px solid var(--border-default)",background:cfAllOpen?"#eff6ff":"#f8f9fb",color:cfAllOpen?"#2563eb":"#6b7080",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {cfAllOpen?(ar?"طي الكل":"Collapse All"):(ar?"توسيع الكل":"Expand All")}
              </button>
              <button onClick={()=>setCfDetail(!cfDetail)} style={{fontSize:9,padding:"3px 10px",borderRadius:5,border:"0.5px solid var(--border-default)",background:cfDetail?"#fef9c3":"#f8f9fb",color:cfDetail?"#92400e":"#6b7080",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                {cfDetail?(ar?"إخفاء التفاصيل":"Hide Details"):(ar?"عرض التفاصيل":"Show Details")}
              </button>
              <div style={{flex:1}}/>
              <select value={cfYrs} onChange={e=>setCfYrs(+e.target.value)} style={{fontSize:9,padding:"2px 6px",borderRadius:4,border:"0.5px solid var(--border-default)",background:"var(--surface-card)",fontFamily:"inherit"}}>
                {[10,15,20,30,50].map(n=><option key={n} value={n}>{n} {ar?"سنة":"yrs"}</option>)}
              </select>
            </div>

            {filteredIndices.map(i => {
              const a = results.assetSchedules[i];
              if (!a) return null;
              const asset = assets[i];
              const lr = getAssetLandRent(i);
              const isOpen = cfOpen[i] || false;
              const totalRev = a.revenueSchedule.reduce((s,v)=>s+v,0);
              const totalCap = a.totalCapex||0;
              return (
                <div key={i} style={{marginBottom:6,border:"0.5px solid var(--border-default)",borderRadius:8,overflow:"hidden",background:"var(--surface-card)"}}>
                  <div onClick={()=>setCfOpen(p=>({...p,[i]:!p[i]}))} style={{padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:isOpen?"#f0f4ff":"#fafbfc",userSelect:"none"}}>
                    <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{isOpen?"▼":"▶"}</span>
                    <span style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",flex:1}}>{asset?.name||`Asset ${i+1}`}</span>
                    <span style={{fontSize:9,color:"var(--text-secondary)",background:"#e5e7ec",borderRadius:8,padding:"1px 6px"}}>{asset?.phase}</span>
                    <span style={{fontSize:10,color:"#16a34a"}}>{fmtM(totalRev)}</span>
                    <span style={{fontSize:10,color:"#ef4444"}}>{fmtM(totalCap)}</span>
                  </div>
                  {isOpen && (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr>
                          <th style={{...hdS,textAlign:"left",minWidth:80}}>{ar?"البند":"Item"}</th>
                          {yrs.map(y=><th key={y} style={hdS}>{sy+y}</th>)}
                        </tr></thead>
                        <tbody>{renderCFRows(a.revenueSchedule, a.capexSchedule, lr, asset?.name, "#1a1d23")}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Aggregated Totals ── */}
            <div style={{marginTop:8,border:"2px solid #2563eb",borderRadius:8,overflow:"hidden",background:"var(--surface-card)"}}>
              <div style={{padding:"6px 12px",background:"#eff6ff",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:"#1e40af"}}>{ar?`إجمالي (${filteredIndices.length} أصل)`:`Total (${filteredIndices.length} assets)`}</span>
                <div style={{flex:1}}/>
                <span style={{fontSize:10,color:"#16a34a",fontWeight:600}}>{fmtM(aggRev.reduce((s,v)=>s+v,0))}</span>
                <span style={{fontSize:10,color:"#ef4444",fontWeight:600}}>{fmtM(aggCap.reduce((s,v)=>s+v,0))}</span>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={{...hdS,textAlign:"left",minWidth:80}}>{ar?"البند":"Item"}</th>
                    {yrs.map(y=><th key={y} style={hdS}>{sy+y}</th>)}
                  </tr></thead>
                  <tbody>{renderCFRows(aggRev, aggCap, aggLR, "Total", "#1e40af")}</tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hotel P&L Modal */}
      {modal?.type==="hotel"&&<HotelPLModal
        data={assets[modal.idx]?.hotelPL}
        onSave={(h,ebitda)=>upAsset(modal.idx,{hotelPL:h,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t} lang={lang}
      />}
      {modal?.type==="marina"&&<MarinaPLModal
        data={assets[modal.idx]?.marinaPL}
        onSave={(m,ebitda)=>upAsset(modal.idx,{marinaPL:m,opEbitda:ebitda})}
        onClose={()=>setModal(null)} t={t} lang={lang}
      />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function ProjectDash({ project, results, checks, t, financing, phaseFinancings, onGoToAssets, lang, incentivesResult, setActiveTab }) {
  if (!project || !results) return null;
  const isMobile = useIsMobile();
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const rawC = results.consolidated;
  const cur = project.currency || "SAR";
  const allPhases = Object.entries(results.phaseResults);
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const failedChecks = checks.filter(ch => !ch.pass).length;

  // ── Filtered consolidated: aggregate selected phases only ──
  const c = useMemo(() => {
    if (!isFiltered) return rawC;
    const hLen = results.horizon;
    const income = new Array(hLen).fill(0), capex = new Array(hLen).fill(0), landRent = new Array(hLen).fill(0), netCF = new Array(hLen).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < hLen; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    const totalCapex = capex.reduce((a,b)=>a+b,0);
    const totalIncome = income.reduce((a,b)=>a+b,0);
    const totalLandRent = landRent.reduce((a,b)=>a+b,0);
    const totalNetCF = netCF.reduce((a,b)=>a+b,0);
    let pbCum = 0, pbYr = null, pbNeg = false, peakNeg = 0, peakNegY = null;
    for (let y = 0; y < hLen; y++) { pbCum += netCF[y]; if (pbCum < -1) pbNeg = true; if (pbNeg && pbCum >= 0 && pbYr === null) pbYr = y + 1; if (pbCum < peakNeg) { peakNeg = pbCum; peakNegY = y; } }
    return { ...rawC, income, capex, landRent, netCF, totalCapex, totalIncome, totalLandRent, totalNetCF,
      irr: calcIRR(netCF),
      npv10: calcNPV(netCF, 0.10),
      npv12: calcNPV(netCF, 0.12),
      npv14: calcNPV(netCF, 0.14),
      paybackYear: pbYr, peakNegative: peakNeg, peakNegativeYear: peakNegY,
    };
  }, [isFiltered, selectedPhases, results, rawC]);

  // ── Filtered financing: aggregate selected phase financings ──
  const f = useMemo(() => {
    if (!isFiltered || !phaseFinancings) return financing;
    const pfs = activePh.map(p => phaseFinancings[p]).filter(Boolean);
    if (pfs.length === 0) return financing;
    const totalDebt = pfs.reduce((s,pf) => s + (pf.totalDebt||0), 0);
    const totalEquity = pfs.reduce((s,pf) => s + (pf.totalEquity||0), 0);
    const totalInterest = pfs.reduce((s,pf) => s + (pf.totalInterest||0), 0);
    const devCostExclLand = pfs.reduce((s,pf) => s + (pf.devCostExclLand||0), 0);
    const devCostInclLand = pfs.reduce((s,pf) => s + (pf.devCostInclLand||0), 0);
    const totalProjectCost = pfs.reduce((s,pf) => s + (pf.totalProjectCost||pf.devCostInclLand||0), 0);
    const landCapValue = pfs.reduce((s,pf) => s + (pf.landCapValue||0), 0);
    const capitalizedFinCosts = pfs.reduce((s,pf) => s + (pf.capitalizedFinCosts||0), 0);
    const h = results.horizon;
    const leveredCF = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.leveredCF) for (let y=0;y<h;y++) leveredCF[y] += pf.leveredCF[y]||0; });
    const gpEquity = pfs.reduce((s,pf) => s + (pf.gpEquity||0), 0);
    const lpEquity = pfs.reduce((s,pf) => s + (pf.lpEquity||0), 0);
    const exitProceeds = new Array(h).fill(0);
    pfs.forEach(pf => { if (pf.exitProceeds) for (let y=0;y<h;y++) exitProceeds[y] += pf.exitProceeds[y]||0; });
    return { ...financing, totalDebt, totalEquity, totalInterest, devCostExclLand, devCostInclLand, totalProjectCost, landCapValue, capitalizedFinCosts, leveredCF, gpEquity, lpEquity, exitProceeds,
      leveredIRR: calcIRR(leveredCF),
      interestSubsidyTotal: pfs.reduce((s,pf) => s + (pf.interestSubsidyTotal||0), 0),
    };
  }, [isFiltered, selectedPhases, financing, phaseFinancings, results]);

  const h = results.horizon;
  const ar = lang === "ar";
  const hasAssets = (project.assets||[]).length > 0;
  const ir = incentivesResult;

  const hasIncentives = (ir && ir.totalIncentiveValue > 0) || (ir && ir.finSupportEstimate) || (f && f.interestSubsidyTotal > 0);
  const displayIRR = (ir && ir.totalIncentiveValue > 0 && ir.adjustedIRR !== null && !isFiltered) ? ir.adjustedIRR : c.irr;
  const displayNPV10 = (ir && ir.totalIncentiveValue > 0 && !isFiltered) ? ir.adjustedNPV10 : c.npv10;
  const displayTotalNetCF = (ir && ir.totalIncentiveValue > 0 && !isFiltered) ? ir.adjustedTotalNetCF : c.totalNetCF;

  let cumCF = 0, paybackYr = null, _pbNeg = false;
  for (let y = 0; y < h; y++) { cumCF += c.netCF[y]; if (cumCF < -1) _pbNeg = true; if (cumCF > 0 && _pbNeg && paybackYr === null) paybackYr = y + 1; }
  const stabYear = Math.min(10, h - 1);
  const cashYield = f && f.totalEquity > 0 ? (c.income[stabYear] / f.totalEquity * 100) : null;

  // ── Getting Started Guide (no assets) ──
  if (!hasAssets) {
    return (<div>
      <div style={{background:"linear-gradient(135deg, #0f766e08, #1e40af12)",borderRadius:16,border:"1px solid #2563eb20",padding:"32px 28px",textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:36,marginBottom:12}}>🚀</div>
        <div style={{fontSize:20,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>{ar?"مشروعك جاهز. هذه هي الخطوة التالية":"Your Project is Ready! Next Step"}</div>
        <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:24,maxWidth:480,margin:"0 auto 24px"}}>{ar?"أضف أصول مشروعك (تجزئة، فنادق، مكاتب، سكني...) لبدء عرض الأرقام والتحليلات":"Add your project assets (retail, hotels, offices, residential...) to start seeing numbers and analytics"}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGoToAssets} style={{...btnPrim,padding:"12px 28px",fontSize:14,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>➕</span> {ar?"أضف أصل الآن":"Add Asset Now"}
          </button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit, minmax(220px, 1fr))",gap:14}}>
        {[
          {icon:"1️⃣",title:ar?"أضف الأصول":"Add Assets",desc:ar?"عرّف كل أصل: نوعه، مساحته، تكلفته، إيراداته":"Define each asset: type, area, cost, revenue",done:false},
          {icon:"2️⃣",title:ar?"راجع الأرقام":"Review Numbers",desc:ar?"راجع التدفقات النقدية والعائد الداخلي (IRR) وصافي القيمة الحالية (NPV)":"Check cash flows, IRR, NPV in the dashboard",done:false},
          {icon:"3️⃣",title:ar?"اضبط التمويل":"Configure Financing",desc:ar?"عدّل شروط الدين والتمويل من الشريط الجانبي":"Adjust debt terms and financing from sidebar",done:project.finMode!=="self"},
          {icon:"4️⃣",title:ar?"صدّر التقارير":"Export Reports",desc:ar?"حمّل تقارير البنك والمستثمرين بصيغة PDF أو Excel":"Download bank and investor reports as PDF or Excel",done:false},
        ].map((s,i)=>(
          <div key={i} style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px",opacity:s.done?0.7:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:s.done?"#16a34a":"#1a1d23"}}>{s.title}{s.done?" ✓":""}</span>
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.5}}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>);
  }

  // ── Health score ──
  const irrVal = displayIRR || 0;
  const health = irrVal > 0.15 ? 'strong' : irrVal > 0.10 ? 'good' : irrVal > 0.05 ? 'moderate' : 'weak';
  const healthColor = {strong:'#16a34a',good:'#22c55e',moderate:'#f59e0b',weak:'#ef4444'}[health];
  const healthLabel = {strong:ar?'قوي':'Strong',good:ar?'جيد':'Good',moderate:ar?'متوسط':'Moderate',weak:ar?'ضعيف':'Weak'}[health];

  // ── Sources & Uses (read from financing object — single source of truth) ──
  const totalDebt = f ? f.totalDebt || 0 : 0;
  const totalEquity = f ? f.totalEquity || 0 : 0;
  const landCap = f ? f.landCapValue || 0 : 0;
  const grantTotal = ir ? ir.capexGrantTotal || 0 : 0;
  // devCostExclLand = construction CAPEX (includes land purchase for purchase type)
  // devCostInclLand = devCostExclLand + landCapValue (the real "total uses" base)
  // totalProjectCost = devCostInclLand + capitalizedFinCosts (when IDC is capitalized)
  const devCostExcl = f ? f.devCostExclLand || c.totalCapex : c.totalCapex;
  const devCostIncl = f ? (f.totalProjectCost || f.devCostInclLand || c.totalCapex) : c.totalCapex;

  // ── Cash flow chart data (SVG bars) ──
  const chartYears = Math.min(20, h);
  const maxVal = Math.max(...c.income.slice(0, chartYears), ...c.capex.slice(0, chartYears), 1);
  const minCF = Math.min(...c.netCF.slice(0, chartYears), 0);
  const maxCF = Math.max(...c.netCF.slice(0, chartYears), 1);
  const cfRange = Math.max(maxCF, Math.abs(minCF), 1);

  return (<div>
    {/* ═══ Progress Tracker (shows until user completes key steps) ═══ */}
    {(() => {
      const steps = [
        { id:"assets", labelAr:"إضافة أصول", labelEn:"Add Assets", done: (project.assets||[]).length > 0, tab:"assets" },
        { id:"review", labelAr:"مراجعة التدفقات", labelEn:"Review Cash Flows", done: (project.assets||[]).length >= 2 && c.totalCapex > 0, tab:"cashflow" },
        { id:"financing", labelAr:"إعداد التمويل", labelEn:"Setup Financing", done: project.finMode !== "self" || (f && f.totalDebt > 0), tab:"financing" },
        { id:"export", labelAr:"تصدير التقارير", labelEn:"Export Reports", done: false, tab:"reports" },
      ];
      const doneCount = steps.filter(s => s.done).length;
      if (doneCount >= 3) return null;
      return (
        <div style={{background:"rgba(46,196,182,0.04)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:12,padding:"14px 20px",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:600,color:"#0f766e"}}>{ar?`${doneCount}/4 خطوات مكتملة`:`${doneCount}/4 steps complete`}</span>
            <div style={{flex:1,height:4,background:"rgba(0,0,0,0.06)",borderRadius:2}}>
              <div style={{width:`${(doneCount/4)*100}%`,height:"100%",background:"linear-gradient(90deg,#0f766e,#2EC4B6)",borderRadius:2,transition:"width 0.4s ease"}} />
            </div>
          </div>
          <div style={{display:"flex",gap:isMobile?8:10,flexWrap:"wrap"}}>
            {steps.map((step,i) => (
              <button key={step.id} onClick={()=>setActiveTab(step.tab)} style={{flex:1,minWidth:isMobile?120:140,padding:"10px 12px",background:step.done?"rgba(16,185,129,0.06)":"#fff",border:`1px solid ${step.done?"rgba(16,185,129,0.25)":"#e5e7ec"}`,borderRadius:8,cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}}
                onMouseEnter={e=>{if(!step.done){e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.background="rgba(46,196,182,0.04)";}}}
                onMouseLeave={e=>{if(!step.done){e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.background="#fff";}}}>
                <div style={{fontSize:16,marginBottom:4}}>{step.done?"✅":`${i+1}`}</div>
                <div style={{fontSize:11,fontWeight:step.done?600:500,color:step.done?"#16a34a":"#4b5060"}}>{ar?step.labelAr:step.labelEn}</div>
              </button>
            ))}
          </div>
        </div>
      );
    })()}
    {/* ═══ PHASE FILTER (multi-select) ═══ */}
    {phaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {phaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${phaseNames.length} مراحل`:`Showing ${activePh.length} of ${phaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* ═══ SECTION 1: Decision Summary ═══ */}
    <div style={{background:`linear-gradient(135deg, ${healthColor}08, ${healthColor}18)`,borderRadius:14,border:`2px solid ${healthColor}30`,padding:isMobile?"16px 14px":"22px 26px",marginBottom:20,display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?14:20,flexWrap:"wrap"}}>
      {/* Health badge */}
      <div style={{textAlign:"center",minWidth:90}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${healthColor}18`,border:`3px solid ${healthColor}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}>
          <span style={{fontSize:26,fontWeight:800,color:healthColor}}>{irrVal > 0 ? (irrVal*100).toFixed(0)+"%" : "—"}</span>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:healthColor,textTransform:"uppercase",letterSpacing:0.6}}>{healthLabel}</div>
        <div style={{fontSize:9,color:"var(--text-secondary)"}}>IRR (Unlevered)</div>
      </div>
      {/* Key numbers */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:12}}>
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"صافي القيمة الحالية":"NPV @10%"}</div>
          <div style={{fontSize:20,fontWeight:800,color:displayNPV10>0?"#16a34a":"#ef4444"}}>{fmtM(displayNPV10)}</div>
          <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{cur}</div>
        </div>
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"إجمالي التكاليف":"Total CAPEX"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>{fmtM(hasIncentives&&!isFiltered?(c.totalCapex-grantTotal):c.totalCapex)}</div>
          <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{cur}{hasIncentives&&!isFiltered?` (${ar?"بعد المنحة":"net of grant"})`:""}</div>
        </div>
        {f && f.mode !== "self" && <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"IRR بعد التمويل":"Levered IRR"}</div>
          <div style={{fontSize:20,fontWeight:800,color:getMetricColor("IRR",f.leveredIRR)}}>{f.leveredIRR!==null?(f.leveredIRR*100).toFixed(1)+"%":"N/A"}</div>
        </div>}
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"فترة الاسترداد":"Payback"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#f59e0b"}}>{paybackYr ? (ar?`${paybackYr} سنة`:`Yr ${paybackYr}`) : "N/A"}</div>
          {paybackYr && <div style={{fontSize:10,color:"var(--text-tertiary)"}}>{results.startYear + paybackYr - 1}</div>}
        </div>
        <div>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{ar?"الفحوصات":"Checks"}</div>
          <div style={{fontSize:20,fontWeight:800,color:failedChecks===0?"#16a34a":"#ef4444"}}>{failedChecks===0?(ar?"✓ سليم":"✓ Pass"):`${failedChecks} ✗`}</div>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 1.5: Financial Metrics Help ═══ */}
    <div style={{marginBottom:12}}><HelpLink contentKey="financialMetrics" lang={lang} onOpen={setEduModal} label={ar?"ما معنى IRR و NPV و MOIC؟":"What do IRR, NPV, MOIC mean?"} /></div>

    {/* ═══ SECTION 2: Sources & Uses + Key Metrics ═══ */}
    <div style={{display:"grid",gridTemplateColumns:f&&f.mode!=="self"?(isMobile?"1fr":"1fr 1fr"):"1fr",gap:14,marginBottom:20}}>
      {/* Sources & Uses */}
      {f && f.mode !== "self" && (
        <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15}}>💰</span> {ar?"مصادر واستخدامات التمويل":"Sources & Uses"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Sources */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#16a34a",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #dcfce7"}}>{ar?"المصادر":"SOURCES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                {totalDebt > 0 && [<span key="dl" style={{color:"var(--text-secondary)"}}>{ar?"قرض بنكي":"Bank Debt"}</span>,<span key="dv" style={{textAlign:"right",fontWeight:500}}>{fmtM(totalDebt)}</span>]}
                <span style={{color:"var(--text-secondary)"}}>{ar?"حقوق ملكية":"Equity"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(totalEquity)}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(totalDebt + totalEquity)}</span>
                {grantTotal > 0 && !isFiltered && [<span key="gl" style={{color:"#16a34a",fontSize:10,fontStyle:"italic"}}>{ar?"* تم خصم منحة حكومية":"* CAPEX grant deducted"}: {fmtM(grantTotal)}</span>]}
              </div>
              {/* LTV bar */}
              {totalDebt > 0 && (() => {
                const ltv = (totalDebt / (totalDebt + totalEquity) * 100);
                return <div style={{marginTop:10}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:3}}>LTV: {ltv.toFixed(0)}%</div>
                  <div style={{height:6,borderRadius:3,background:"var(--surface-sidebar)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ltv}%`,background:getMetricColor("LTV",ltv),borderRadius:3}} />
                  </div>
                </div>;
              })()}
            </div>
            {/* Uses */}
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#ef4444",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,paddingBottom:4,borderBottom:"2px solid #fee2e2"}}>{ar?"الاستخدامات":"USES"}</div>
              <div style={{fontSize:12,display:"grid",gridTemplateColumns:"1fr auto",gap:"3px 16px",rowGap:5,maxWidth:420}}>
                <span style={{color:"var(--text-secondary)"}}>{ar?"تكاليف البناء":"Construction"}</span><span style={{textAlign:"right",fontWeight:500}}>{fmtM(devCostExcl)}</span>
                {landCap > 0 && [<span key="cl" style={{color:"var(--text-secondary)"}}>{ar?"رسملة الأرض":"Land Cap."}</span>,<span key="cv" style={{textAlign:"right",fontWeight:500}}>{fmtM(landCap)}</span>]}
                {f && f.capitalizedFinCosts > 0 && [<span key="il" style={{color:"var(--text-secondary)"}}>{ar?"تكاليف تمويل مرسملة":"Capitalized IDC"}</span>,<span key="iv" style={{textAlign:"right",fontWeight:500}}>{fmtM(f.capitalizedFinCosts)}</span>]}
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,fontWeight:700}}>{ar?"الإجمالي":"Total"}</span>
                <span style={{borderTop:"1px solid #e5e7ec",paddingTop:4,textAlign:"right",fontWeight:700}}>{fmtM(devCostIncl)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 20px"}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:15}}>📊</span> {ar?"المؤشرات الرئيسية":"Key Metrics"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:10}}>
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",border:"1px solid #dcfce7"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"إجمالي الإيرادات":"Total Income"} ({h}{ar?" سنة":"yr"})</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16a34a"}}>{fmtM(c.totalIncome)}</div>
          </div>
          <div style={{background:displayTotalNetCF>=0?"#f0fdf4":"#fef2f2",borderRadius:8,padding:"10px 12px",border:`1px solid ${displayTotalNetCF>=0?"#dcfce7":"#fee2e2"}`}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"صافي التدفق":"Net CF"}{hasIncentives&&!isFiltered?` (${ar?"+حوافز":"+inc."})`:""}</div>
            <div style={{fontSize:16,fontWeight:700,color:displayTotalNetCF>=0?"#16a34a":"#ef4444"}}>{fmtM(displayTotalNetCF)}</div>
          </div>
          {f && f.mode !== "self" && <>
            <div style={{background:"#fffbeb",borderRadius:8,padding:"10px 12px",border:"1px solid #fef3c7"}}>
              <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"إجمالي الدين":"Total Debt"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#f59e0b"}}>{fmtM(totalDebt)}</div>
            </div>
            <div style={{background:"#f5f3ff",borderRadius:8,padding:"10px 12px",border:"1px solid #ede9fe"}}>
              <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"إجمالي الفوائد":"Total Interest"}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#8b5cf6"}}>{fmtM(f.totalInterest)}</div>
            </div>
          </>}
          {cashYield !== null && <div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",border:"1px solid #dbeafe"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"العائد النقدي":"Cash Yield"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#2563eb"}}>{fmtPct(cashYield)}</div>
          </div>}
          {hasIncentives && !isFiltered && ir && <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",border:"1px solid #bbf7d0"}}>
            <div style={{fontSize:10,color:"var(--text-secondary)"}}>{ar?"قيمة الحوافز":"Incentive Value"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#16a34a"}}>{fmtM(ir.totalIncentiveValue + (f?.interestSubsidyTotal||0))}</div>
          </div>}
        </div>
        {/* Land info compact */}
        <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #f0f1f5",display:"flex",gap:16,fontSize:11,color:"var(--text-secondary)",flexWrap:"wrap"}}>
          <span>{ar?"الأرض":"Land"}: <strong>{({lease:ar?"إيجار":"Lease",purchase:ar?"شراء":"Purchase",partner:ar?"شراكة":"Partner",bot:"BOT"})[project.landType]||project.landType}</strong></span>
          <span>{ar?"المساحة":"Area"}: <strong>{fmt(project.landArea)} m²</strong></span>
          {project.landType==="lease"&&<span>{ar?"إيجار سنوي":"Annual"}: <strong>{fmt(project.landRentAnnual)} {cur}</strong></span>}
          {project.landType==="purchase"&&<span>{ar?"السعر":"Price"}: <strong>{fmt(project.landPurchasePrice)} {cur}</strong></span>}
          {project.landType==="lease"&&<span>{ar?"إجمالي الإيجار":"Total Rent"}: <strong style={{color:"#ef4444"}}>{fmt(c.totalLandRent)} {cur}</strong></span>}
          <span>{ar?"الأصول":"Assets"}: <strong>{project.assets.length}</strong></span>
        </div>
      </div>
    </div>

    {/* ═══ SECTION 3: Cash Flow Chart (SVG) ═══ */}
    <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 20px",marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>📈</span> {ar?"التدفق النقدي السنوي":"Annual Cash Flow"}
        <span style={{fontSize:10,color:"var(--text-tertiary)",marginInlineStart:"auto"}}>{ar?`أول ${chartYears} سنة`:`First ${chartYears} years`}</span>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:16,marginBottom:10,fontSize:11}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#ef4444",display:"inline-block"}} />{ar?"التكاليف":"CAPEX"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#22c55e",display:"inline-block"}} />{ar?"الإيرادات":"Revenue"}</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:3,borderRadius:2,background:"#3b82f6",display:"inline-block"}} />{ar?"صافي التدفق":"Net CF"}</span>
      </div>
      <svg viewBox={`0 0 ${chartYears * 42 + 20} 180`} style={{width:"100%",height:180}}>
        {/* Grid lines */}
        <line x1="20" y1="90" x2={chartYears*42+20} y2="90" stroke="#e5e7ec" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="20" y1="10" x2={chartYears*42+20} y2="10" stroke="#f0f1f5" strokeWidth="0.5" />
        <line x1="20" y1="170" x2={chartYears*42+20} y2="170" stroke="#f0f1f5" strokeWidth="0.5" />
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42;
          const capH = maxVal > 0 ? (c.capex[y] / maxVal) * 75 : 0;
          const incH = maxVal > 0 ? (c.income[y] / maxVal) * 75 : 0;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <g key={y}>
            {/* CAPEX bar (red, going down from center) */}
            {c.capex[y] > 0 && <rect x={x} y={90} width={16} height={capH} fill="#ef444440" rx="2" stroke="#ef4444" strokeWidth="0.5" />}
            {/* Income bar (green, going up from center) */}
            {c.income[y] > 0 && <rect x={x+18} y={90-incH} width={16} height={incH} fill="#22c55e40" rx="2" stroke="#22c55e" strokeWidth="0.5" />}
            {/* Year label */}
            {y % (chartYears > 15 ? 3 : 2) === 0 && <text x={x+17} y={178} fontSize="8" fill="#9ca3af" textAnchor="middle">{y+1}</text>}
          </g>;
        })}
        {/* Net CF line */}
        <polyline
          fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"
          points={Array.from({length:chartYears}).map((_,y) => {
            const x = 20 + y * 42 + 17;
            const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
            return `${x},${cfY}`;
          }).join(' ')}
        />
        {/* Net CF dots */}
        {Array.from({length:chartYears}).map((_,y) => {
          const x = 20 + y * 42 + 17;
          const cfY = cfRange > 0 ? 90 - (c.netCF[y] / cfRange) * 75 : 90;
          return <circle key={y} cx={x} cy={cfY} r="2.5" fill="#3b82f6" />;
        })}
      </svg>
    </div>

    {/* ═══ SECTION 4: Phase Summary ═══ */}
    {allPhases.length>0&&<div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏗</span> {t.phaseSummary}
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["المرحلة","الأصول","إجمالي التكاليف","إجمالي الإيرادات","إيجار الأرض","صافي التدفق","IRR","نسبة الأرض"]:["Phase","Assets","Total CAPEX","Total Income","Land Rent","Net CF","IRR","Land %"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {allPhases.map(([n,pr])=>{
          const capexPct = rawC.totalCapex > 0 ? pr.totalCapex / rawC.totalCapex * 100 : 0;
          const isHighlighted = isFiltered && activePh.includes(n);
          const isDimmed = isFiltered && !activePh.includes(n);
          return <tr key={n} style={{background:isHighlighted?"#f0fdf4":undefined,opacity:isDimmed?0.45:1,transition:"opacity 0.2s"}}>
          <td style={tdSt}><strong>{n}</strong>{isHighlighted && <span style={{marginInlineStart:4,fontSize:9,color:"#0f766e"}}>●</span>}</td>
          <td style={{...tdSt,textAlign:"center"}}>{pr.assetCount}</td>
          <td style={tdN}><div>{fmt(pr.totalCapex)}</div><div style={{height:3,borderRadius:2,background:"var(--surface-sidebar)",marginTop:3}}><div style={{height:"100%",borderRadius:2,background:"#ef4444",width:`${capexPct}%`}} /></div></td>
          <td style={tdN}>{fmt(pr.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(pr.totalLandRent)}</td>
          <td style={{...tdN,color:pr.totalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(pr.totalNetCF)}</td>
          <td style={{...tdN,fontWeight:600}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</td>
          <td style={tdN}>{fmtPct(pr.allocPct*100)}</td>
        </tr>;})}
        <tr style={{background:"var(--surface-table-header)",fontWeight:700}}>
          <td style={tdSt}>{isFiltered?(ar?"المجموع المختار":"Selected Total"):t.consolidated}</td>
          <td style={{...tdSt,textAlign:"center"}}>{isFiltered ? (project.assets||[]).filter(a=>activePh.includes(a.phase)).length : project.assets.length}</td>
          <td style={tdN}>{fmt(c.totalCapex)}</td><td style={tdN}>{fmt(c.totalIncome)}</td>
          <td style={{...tdN,color:"#ef4444"}}>{fmt(c.totalLandRent)}</td>
          <td style={{...tdN,color:displayTotalNetCF>=0?"#16a34a":"#ef4444"}}>{fmt(displayTotalNetCF)}</td>
          <td style={{...tdN,fontWeight:700}}>{displayIRR!==null?fmtPct(displayIRR*100):"—"}{hasIncentives&&!isFiltered?" *":""}</td>
          <td style={tdN}></td>
        </tr>
      </tbody></table></div>
    </div>}

    {/* ═══ SECTION 4b: Market Gap Summary (if enabled) ═══ */}
    {project.market?.enabled && (() => {
      const mkt = project.market;
      const mktGaps = mkt.gaps || {};
      const mktTh = mkt.thresholds || {};
      const MSECS = ["Retail","Office","Hospitality","Residential","Marina","Industrial"];
      const getMktSup = (sec) => {
        const aa = (project.assets||[]).filter(a2 => { const c2=(a2.category||"").toLowerCase(),s2=sec.toLowerCase(); return c2.includes(s2)||(s2==="retail"&&c2.includes("commercial"))||(s2==="hospitality"&&(c2.includes("hotel")||c2.includes("resort"))); });
        if (sec==="Hospitality") return aa.reduce((s,a2)=>s+(a2.hotelPL?.keys||0),0);
        if (sec==="Marina") return aa.reduce((s,a2)=>s+(a2.marinaPL?.berths||0),0);
        return aa.reduce((s,a2)=>s+(a2.gfa||0)*((a2.efficiency||0)/100),0);
      };
      let low=0, med=0, high=0; const highNames = [];
      MSECS.forEach(sec => {
        const gap = mktGaps[sec]?.gap || 0; if (gap <= 0) return;
        const supply = getMktSup(sec); if (supply <= 0) { low++; return; }
        const pct = (supply / gap) * 100;
        const th3 = mktTh[sec] || { low: 50, med: 70 };
        if (pct > th3.med) { high++; highNames.push(catL(sec, ar)); }
        else if (pct > th3.low) { med++; }
        else { low++; }
      });
      const total = low + med + high;
      if (total === 0) return null;
      const hasRisk = high > 0;
      return (
        <div style={{background:hasRisk?"#fef2f2":"#f0fdf4",borderRadius:10,border:`1px solid ${hasRisk?"#fecaca":"#bbf7d0"}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setActiveTab("market")}>
          <span style={{fontSize:15}}>📊</span>
          <span style={{fontSize:12,fontWeight:600,color:hasRisk?"#991b1b":"#15803d"}}>{ar?"مؤشرات السوق":"Market Indicators"}</span>
          <div style={{display:"flex",gap:8,fontSize:11}}>
            {low > 0 && <span style={{color:"#16a34a",fontWeight:500}}>{low} {ar?"آمن":"safe"}</span>}
            {med > 0 && <span style={{color:"#eab308",fontWeight:500}}>{med} {ar?"متوسط":"medium"}</span>}
            {high > 0 && <span style={{color:"#ef4444",fontWeight:600}}>{high} {ar?"مرتفع":"high"}: {highNames.join(", ")}</span>}
          </div>
          <span style={{fontSize:10,color:"var(--text-tertiary)",marginInlineStart:"auto"}}>{ar?"اضغط للتفاصيل →":"Click for details →"}</span>
        </div>
      );
    })()}

    {/* ═══ SECTION 5: Asset Overview (compact) ═══ */}
    {results.assetSchedules.length>0&&(()=>{
      const filteredAssets = isFiltered ? results.assetSchedules.filter(a => activePh.includes(a.phase)) : results.assetSchedules;
      return <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:15}}>🏢</span> {t.assetOverview} ({filteredAssets.length}{isFiltered?` / ${results.assetSchedules.length}`:""})
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={tblStyle}><thead><tr>
        {(ar?["#","الأصل","المرحلة","المساحة","التكاليف",`الإيرادات (${project.horizon}ع)`,"النوع"]:["#","Asset","Phase","GFA","CAPEX",`Income (${project.horizon}yr)`,"Type"]).map(h=><th key={h} style={thSt}>{h}</th>)}
      </tr></thead><tbody>
        {filteredAssets.map((a,i)=><tr key={a.id||i}>
          <td style={{...tdSt,color:"var(--text-tertiary)",width:30}}>{i+1}</td>
          <td style={tdSt}>{a.name||"—"} <span style={{color:"var(--text-tertiary)",fontSize:10}}>({catL(a.category,ar)})</span></td>
          <td style={tdSt}>{a.phase}</td>
          <td style={tdN}>{fmt(a.gfa)}</td><td style={tdN}>{fmt(a.totalCapex)}</td>
          <td style={{...tdN,color:"#16a34a"}}>{fmt(a.totalRevenue)}</td><td style={{...tdSt,fontSize:11}}>{revL(a.revType,ar)}</td>
        </tr>)}
      </tbody></table></div>
    </div>;})()}
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

// Tip — imported from ./components/shared/Tip.jsx

// ═══════════════════════════════════════════════════════════════
// EDUCATIONAL HELP SYSTEM — Reusable Modal + HelpLink
// ═══════════════════════════════════════════════════════════════

// EDUCATIONAL_CONTENT — imported from ./data/educational-content.js (removed 2,218 lines)

// HelpLink — imported from ./components/shared/HelpLink.jsx

// EducationalModal — imported from ./components/shared/EducationalModal.jsx

// ═══════════════════════════════════════════════════════════════
// HASEEF ACADEMY — أكاديمية حصيف المالية
// Consolidated Learning Center — reads from EDUCATIONAL_CONTENT
// ═══════════════════════════════════════════════════════════════

const ACADEMY_TERM_REGISTRY = {
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
  "Developer Catch-up": { key: "waterfallConcepts", tab: 2 },
  "Profit Split": { key: "waterfallConcepts", tab: 3 },
  "SAIBOR": { key: "islamicFinance", tab: 0 },
  "LTV": { key: "financingMode", tab: 2 },
};

const ACADEMY_PATHS = [
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

const ACADEMY_RELATED = {
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

const ACADEMY_SECTION_ICONS = {
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

// ── Demo Projects for Academy ──
const ACADEMY_DEMO_PROJECTS = [
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
    desc: { ar: "فندق فاخر بهيكل صندوق (مطور/مستثمر) مع شلال توزيعات. أعقد سيناريو.", en: "Luxury hotel with Developer/Investor fund structure and waterfall. Most complex scenario." },
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

// LearningCenterView extracted to ./components/views/LearningCenterView.jsx (Phase 2.5)

function KPI({label,value,sub,color,tip}) {
  const isMobile = useIsMobile();
  return <div className="z-kpi">
    <div className="z-kpi-label">{tip?<Tip text={tip}>{label}</Tip>:label}</div>
    <div style={{fontSize:isMobile?15:19,fontWeight:700,color:color||"var(--text-primary)",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}{sub&&<span style={{fontSize:isMobile?10:11,fontWeight:400,color:"var(--text-tertiary)",marginInlineStart:4}}>{sub}</span>}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// CASH FLOW VIEW
// ═══════════════════════════════════════════════════════════════
function CashFlowView({ project, results, t, incentivesResult, financing }) {
  if (!project||!results) return <div style={{color:"var(--text-tertiary)"}}>Add assets to see projections.</div>;
  const isMobile = useIsMobile();
  const [showYrs,setShowYrs]=useState(15);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const {horizon,startYear}=results;
  const years=Array.from({length:Math.min(showYrs,horizon)},(_,i)=>i);
  const ar = t.dashboard === "لوحة التحكم";

  // ── Phase filter ──
  const allPhaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;
  const togglePhase = (p) => setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  // ── Read from engine results, filtered by selected phases ──
  const phases = allPhaseNames.filter(pName => activePh.includes(pName)).map(pName => {
    const pr = results.phaseResults[pName];
    const noi = new Array(horizon).fill(0);
    for (let y = 0; y < horizon; y++) noi[y] = (pr.income[y]||0) - (pr.landRent[y]||0);
    return [pName, { ...pr, noi, totalNOI: noi.reduce((a,b)=>a+b,0) }];
  });

  // ── Filtered consolidated ──
  const c = useMemo(() => {
    if (!isFiltered) {
      const raw = { ...results.consolidated, noi: new Array(horizon).fill(0) };
      for (let y = 0; y < horizon; y++) raw.noi[y] = (raw.income[y]||0) - (raw.landRent[y]||0);
      return raw;
    }
    const income = new Array(horizon).fill(0), capex = new Array(horizon).fill(0), landRent = new Array(horizon).fill(0), netCF = new Array(horizon).fill(0), noi = new Array(horizon).fill(0);
    activePh.forEach(pName => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      for (let y = 0; y < horizon; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    for (let y = 0; y < horizon; y++) noi[y] = income[y] - landRent[y];
    const totalCapex = capex.reduce((a,b)=>a+b,0);
    const totalIncome = income.reduce((a,b)=>a+b,0);
    const totalLandRent = landRent.reduce((a,b)=>a+b,0);
    const totalNetCF = netCF.reduce((a,b)=>a+b,0);
    let pbCum = 0, pbYr = null, pbNeg = false, peakNeg = 0, peakNegY = null;
    for (let y = 0; y < horizon; y++) { pbCum += netCF[y]; if (pbCum < -1) pbNeg = true; if (pbNeg && pbCum >= 0 && pbYr === null) pbYr = y; if (pbCum < peakNeg) { peakNeg = pbCum; peakNegY = y; } }
    return { ...results.consolidated, income, capex, landRent, netCF, noi, totalCapex, totalIncome, totalLandRent, totalNetCF,
      irr: calcIRR(netCF), npv10: calcNPV(netCF, 0.10), npv12: calcNPV(netCF, 0.12), npv14: calcNPV(netCF, 0.14),
      paybackYear: pbYr, peakNegative: peakNeg, peakNegativeYear: peakNegY,
    };
  }, [isFiltered, selectedPhases, results, horizon]);

  // ── Period detection: construction vs operating years ──
  let constrEnd = 0;
  for (let y = horizon - 1; y >= 0; y--) { if (c.capex[y] > 0) { constrEnd = y; break; } }
  const isConstrYear = y => c.capex[y] > 0;
  const isIncomeYear = y => c.income[y] > 0;

  // ── NOI already computed as c.noi ──
  const noiArr = c.noi;
  const totalNOI = noiArr.reduce((a,b)=>a+b,0);

  // ── Yield on Cost = Stabilized NOI / Total CAPEX ──
  const stabilizedNOI = noiArr[Math.min(constrEnd + 3, horizon - 1)] || 0;
  const yieldOnCost = c.totalCapex > 0 ? stabilizedNOI / c.totalCapex : 0;

  const fmtFin=(v)=>{if(v==null||isNaN(v))return "—";if(v===0)return "—";return v<0?`(${fmt(Math.abs(v))})`:fmt(v);};
  const CFRow=({label,values,total,bold,color,negate,sub,pct})=>{
    const st=bold?{fontWeight:700,background:"var(--surface-table-header)"}:{};
    const nc=v=>{if(color)return color;return v<0?"#ef4444":v>0?"var(--text-primary)":"#d0d4dc";};
    if(pct){return <tr style={{background:"#fafbfc"}}>
      <td style={{...tdSt,position:"sticky",left:0,background:"#fafbfc",zIndex:1,fontSize:10,color:"var(--text-tertiary)",paddingInlineStart:24,fontStyle:"italic",minWidth:150}}>{label}</td>
      <td style={{...tdN,fontSize:10,color:"var(--text-tertiary)"}}>{total!=null?fmtPct(total):"—"}</td>
      {years.map(y=>{const v=values?.[y];return <td key={y} style={{...tdN,fontSize:10,color:"var(--text-tertiary)"}}>{v!=null&&!isNaN(v)?fmtPct(v):"—"}</td>;})}
    </tr>;}
    return <tr style={st} onMouseEnter={e=>{if(!bold)e.currentTarget.style.background="#fafbff";}} onMouseLeave={e=>{if(!bold)e.currentTarget.style.background="";}}>
      <td style={{...tdSt,position:"sticky",left:0,background:bold?"#f8f9fb":"#fff",zIndex:1,fontWeight:bold?700:sub?400:500,minWidth:150,paddingInlineStart:sub?24:10,fontSize:sub?10:11,color:sub?"#6b7080":undefined}}>{label}</td>
      <td style={{...tdN,fontWeight:600,color:nc(negate?-total:total)}}>{fmtFin(negate?-total:total)}</td>
      {years.map(y=>{const v=values[y]||0;const dv=negate?-v:v;return <td key={y} style={{...tdN,color:nc(dv)}}>{v===0?"—":fmtFin(dv)}</td>;})}
    </tr>;
  };

  // Section header row
  const SectionRow=({label,color,bg})=><tr><td colSpan={years.length+2} style={{padding:"6px 10px",fontSize:10,fontWeight:700,color:color||"#6b7080",background:bg||"#f0f4ff",letterSpacing:0.5,textTransform:"uppercase",borderTop:"1px solid #e5e7ec"}}>{label}</td></tr>;

  // Cumulative row (always visible)
  const CumRow=({label,values})=>{
    let cum=0;
    return <tr style={{background:"#fffbeb"}}>
      <td style={{...tdSt,position:"sticky",left:0,background:"#fffbeb",zIndex:1,fontWeight:600,fontSize:10,color:"#92400e",minWidth:150}}>{label}</td>
      <td style={tdN}></td>
      {years.map(y=>{cum+=values[y]||0;return <td key={y} style={{...tdN,fontWeight:600,fontSize:10,color:cum<0?"#ef4444":"#16a34a"}}>{fmt(cum)}</td>;})}
    </tr>;
  };

  // ── Period marker header (construction / operating / payback) ──
  const PeriodHeaderRow = () => <tr>
    <td style={{position:"sticky",left:0,background:"var(--surface-card)",zIndex:2,padding:0}}></td>
    <td style={{padding:0}}></td>
    {years.map(y => {
      const constr = isConstrYear(y);
      const income = isIncomeYear(y);
      const isPB = c.paybackYear !== null && y === c.paybackYear;
      const bg = constr && !income ? "#fef3c7" : constr && income ? "#fef9c3" : income ? "#dcfce7" : "#f8f9fb";
      const lbl = constr && !income ? (ar?"بناء":"Build") : constr && income ? (ar?"بناء+دخل":"Build+Op") : income ? (ar?"تشغيل":"Oper.") : "";
      return <td key={y} style={{padding:"2px 4px",textAlign:"center",background:bg,fontSize:10,fontWeight:600,color:constr?"#a16207":"#16a34a",borderBottom:isPB?"3px solid #2563eb":"1px solid #e5e7ec",position:"relative"}}>
        {lbl}{isPB && <span style={{display:"block",fontSize:9,color:"#2563eb",fontWeight:700}}>{ar?"استرداد":"Payback"}</span>}
      </td>;
    })}
  </tr>;

  return (<div>
    {/* ═══ PHASE FILTER ═══ */}
    {allPhaseNames.length > 1 && (
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setSelectedPhases([])} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:selectedPhases.length===0?"#1e3a5f":"#f0f1f5",color:selectedPhases.length===0?"#fff":"#1a1d23",border:"1px solid "+(selectedPhases.length===0?"#1e3a5f":"#e5e7ec"),borderRadius:6}}>
            {ar?"كل المراحل":"All Phases"}
          </button>
          {allPhaseNames.map(p => {
            const active = activePh.includes(p) && selectedPhases.length > 0;
            return <button key={p} onClick={()=>togglePhase(p)} style={{...btnS,padding:"8px 16px",fontSize:12,fontWeight:600,background:active?"#0f766e":"#f0f1f5",color:active?"#fff":"#1a1d23",border:"1px solid "+(active?"#0f766e":"#e5e7ec"),borderRadius:6}}>
              {p}
            </button>;
          })}
          {isFiltered && <span style={{fontSize:10,color:"var(--text-secondary)",marginInlineStart:8}}>{ar?`عرض ${activePh.length} من ${allPhaseNames.length} مراحل`:`Showing ${activePh.length} of ${allPhaseNames.length} phases`}</span>}
        </div>
      </div>
    )}
    {/* Disclaimer */}
    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"6px 12px",marginBottom:12,fontSize:11,color:"#92400e",display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:14}}>⚠</span>
      {ar ? "هذه المؤشرات قبل احتساب طريقة التمويل وآلية التخارج - ستتغير بعد تحديد التمويل" : "Pre-financing & pre-exit metrics — will change after financing mode and exit strategy are set"}
    </div>
    {/* NPV/IRR Summary */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(130px, 1fr))",gap:10,marginBottom:16}}>
      {[
        {label:ar?"IRR المشروع (قبل التمويل)":"Unlevered IRR",value:c.irr!==null?fmtPct(c.irr*100):"N/A",color:getMetricColor("IRR",c.irr)},
        {label:"NPV @10%",value:fmtM(c.npv10),color:c.npv10>0?"#2563eb":"#ef4444"},
        {label:"NPV @12%",value:fmtM(c.npv12),color:c.npv12>0?"#2563eb":"#ef4444"},
        {label:"NPV @14%",value:fmtM(c.npv14),color:c.npv14>0?"#2563eb":"#ef4444"},
        {label:ar?"إجمالي التكاليف":"Total CAPEX",value:fmtM(c.totalCapex),color:"#ef4444"},
        {label:ar?"إجمالي الإيرادات":"Total Income",value:fmtM(c.totalIncome),color:"#16a34a"},
        {label:ar?"صافي الدخل التشغيلي (NOI)":"Net Operating Income",value:fmtM(totalNOI),color:"#2563eb",tip:ar?"الإيرادات - إيجار الأرض (قبل CAPEX)":"Revenue minus Land Rent (before CAPEX)"},
        {label:ar?"عائد على التكلفة":"Yield on Cost",value:yieldOnCost>0?fmtPct(yieldOnCost*100):"—",color:yieldOnCost>0.08?"#16a34a":"#f59e0b",tip:ar?"NOI المستقر / CAPEX":"Stabilized NOI / Total CAPEX"},
        {label:ar?"فترة الاسترداد":"Payback Period",value:c.paybackYear!=null?(c.paybackYear+(ar?" سنة":" yr")):"—",color:c.paybackYear&&c.paybackYear<=10?"#16a34a":c.paybackYear?"#f59e0b":"#9ca3af"},
        {label:ar?"أقصى سحب سلبي":"Peak Negative CF",value:fmtM(c.peakNegative||0),color:"#ef4444",tip:c.peakNegativeYear!=null?(ar?`السنة ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`:`Year ${c.peakNegativeYear+1} (${startYear+c.peakNegativeYear})`):""},
        ...(financing?.effectiveLandCap > 0 ? [{label:ar?"رسملة حق الانتفاع":"Land Cap (In-Kind)",value:fmtM(financing.effectiveLandCap),color:"#7c3aed",tip:`${project.landArea||0} m² × ${project.landCapRate||1000} SAR/m²`}] : []),
      ].map((k,i) => <div key={i} style={{background:"var(--surface-card)",borderRadius:8,border:"0.5px solid var(--border-default)",padding:"8px 12px"}}>
        <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{k.label}</div>
        <div style={{fontSize:16,fontWeight:700,color:k.color}}>{k.value}</div>
        {k.tip && <div style={{fontSize:9,color:"var(--text-tertiary)",marginTop:2}}>{k.tip}</div>}
      </div>)}
    </div>

    {/* Period Legend */}
    <div style={{display:"flex",gap:14,marginBottom:8,fontSize:10,color:"var(--text-secondary)",flexWrap:"wrap",alignItems:"center"}}>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#fef3c7",border:"1px solid #fde68a"}} />{ar?"بناء":"Construction"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#dcfce7",border:"1px solid #bbf7d0"}} />{ar?"تشغيل":"Operating"}</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:4,borderRadius:1,background:"#2563eb"}} />{ar?"سنة الاسترداد":"Payback Year"}</span>
    </div>

    <div style={{display:"flex",alignItems:"center",marginBottom:12,gap:12,flexWrap:"wrap"}}>
      <div style={{fontSize:15,fontWeight:600}}>{t.unleveredCF}</div>
      <div style={{flex:1}} />
      <div style={{display:"flex",background:"var(--surface-sidebar)",borderRadius:6,padding:2}}>
        {[10,15,20,30,50].map(n=><button key={n} onClick={()=>setShowYrs(n)} style={{...btnS,padding:"4px 10px",fontSize:10,fontWeight:600,background:showYrs===n?"#fff":"transparent",color:showYrs===n?"#1a1d23":"#9ca3af",boxShadow:showYrs===n?"0 1px 3px rgba(0,0,0,0.08)":"none",border:"none"}}>{n}yr</button>)}
      </div>
    </div>
    {phases.map(([name,pr])=>(
      <div key={name} style={{background:"var(--surface-card)",borderRadius:8,border:"0.5px solid var(--border-default)",overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"10px 14px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:600,display:"flex",justifyContent:"space-between"}}>
          <span>{name}</span><span style={{color:"var(--text-secondary)",fontWeight:400,fontSize:11}}>{ar?"IRR قبل التمويل":"Unlevered IRR"}: <strong style={{color:pr.irr!==null?"#2563eb":"#9ca3af"}}>{pr.irr!==null?fmtPct(pr.irr*100):"—"}</strong></span>
        </div>
        <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
          <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:150}}>{t.lineItem}</th>
          <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
          {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{startYear+y}</span></th>)}
        </tr></thead><tbody>
          <PeriodHeaderRow />
          <SectionRow label={ar?"الإيرادات والتشغيل":"REVENUE & OPERATIONS"} color="#16a34a" bg="#f0fdf4" />
          <CFRow label={t.income} values={pr.income} total={pr.totalIncome} color="#16a34a" />
          <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={pr.landRent} total={pr.totalLandRent} color="#ef4444" negate sub />
          <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={pr.noi} total={pr.totalNOI} bold />
          <CFRow label={ar?"هامش NOI %":"NOI Margin %"} pct values={years.map(y=>pr.income[y]>0?(pr.noi[y]/pr.income[y])*100:null)} total={pr.totalIncome>0?(pr.totalNOI/pr.totalIncome)*100:null} />
          <SectionRow label={ar?"التكاليف الرأسمالية":"CAPITAL EXPENDITURE"} color="#ef4444" bg="#fef2f2" />
          <CFRow label={ar?"(-) تكاليف التطوير":"(-) Development CAPEX"} values={pr.capex} total={pr.totalCapex} color="#ef4444" negate />
          <SectionRow label={ar?"صافي التدفق النقدي":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
          <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={pr.netCF} total={pr.totalNetCF} bold />
          <CumRow label={ar?"↳ تراكمي":"↳ Cumulative"} values={pr.netCF} />
        </tbody></table></div>
      </div>
    ))}
    <div style={{background:"var(--surface-card)",borderRadius:8,border:"2px solid #2563eb",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"0.5px solid var(--border-default)",fontSize:13,fontWeight:700,background:"#f0f4ff",display:"flex",justifyContent:"space-between"}}>
        <span>{isFiltered?(ar?"المجموع المختار":"Selected Total"):t.consolidated}</span><span style={{fontSize:11,fontWeight:400}}>{ar?"IRR قبل التمويل":"Unlevered IRR"}: <strong style={{color:"#2563eb"}}>{(!isFiltered&&incentivesResult&&incentivesResult.totalIncentiveValue>0&&incentivesResult.adjustedIRR!==null)?fmtPct(incentivesResult.adjustedIRR*100):c.irr!==null?fmtPct(c.irr*100):"—"}</strong></span>
      </div>
      <div className="table-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{...tblStyle,fontSize:11}}><thead><tr>
        <th style={{...thSt,position:"sticky",left:0,background:"var(--surface-table-header)",zIndex:2,minWidth:150}}>{t.lineItem}</th>
        <th style={{...thSt,textAlign:"right"}}>{t.total}</th>
        {years.map(y=><th key={y} style={{...thSt,textAlign:"right",minWidth:75}}>Yr {y+1}<br/><span style={{fontWeight:400,color:"var(--text-tertiary)"}}>{startYear+y}</span></th>)}
      </tr></thead><tbody>
        <PeriodHeaderRow />
        <SectionRow label={ar?"الإيرادات والتشغيل":"REVENUE & OPERATIONS"} color="#16a34a" bg="#f0fdf4" />
        <CFRow label={t.income} values={c.income} total={c.totalIncome} color="#16a34a" />
        <CFRow label={ar?"(-) إيجار الأرض":"(-) Land Rent"} values={c.landRent} total={c.totalLandRent} color="#ef4444" negate sub />
        <CFRow label={ar?"= صافي الدخل التشغيلي (NOI)":"= NOI (Net Operating Income)"} values={noiArr} total={totalNOI} bold />
        <CFRow label={ar?"هامش NOI %":"NOI Margin %"} pct values={years.map(y=>c.income[y]>0?(noiArr[y]/c.income[y])*100:null)} total={c.totalIncome>0?(totalNOI/c.totalIncome)*100:null} />
        <SectionRow label={ar?"التكاليف الرأسمالية":"CAPITAL EXPENDITURE"} color="#ef4444" bg="#fef2f2" />
        <CFRow label={ar?"(-) تكاليف التطوير":"(-) Development CAPEX"} values={c.capex} total={c.totalCapex} color="#ef4444" negate />
        {financing?.effectiveLandCap > 0 && (() => {
          const elc = financing.effectiveLandCap;
          const fsi = Math.max(0, (project.fundStartYear || project.startYear || 2026) - startYear);
          const lcArr = new Array(horizon).fill(0); lcArr[Math.min(fsi, horizon-1)] = elc;
          return <CFRow label={ar?"رسملة حق الانتفاع":"Land Capitalization (In-Kind)"} values={lcArr} total={elc} color="#7c3aed" sub />;
        })()}
        <SectionRow label={ar?"صافي التدفق النقدي":"NET CASH FLOW"} color="#1e3a5f" bg="#f0f4ff" />
        <CFRow label={ar?"= صافي التدفق النقدي":"= Net Cash Flow"} values={c.netCF} total={c.totalNetCF} bold />
        <CumRow label={ar?"↳ تراكمي":"↳ Cumulative"} values={c.netCF} />
      </tbody></table></div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// CHECKS VIEW
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PHASE 4: REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

// DOM-based notification for non-React contexts
function _domNotify(msg, type="error") {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {position:"fixed",top:"16px",right:"16px",zIndex:"99999",padding:"12px 20px",borderRadius:"10px",background:type==="error"?"#991b1b":"#065f46",color:"#fff",fontSize:"13px",fontWeight:"500",boxShadow:"0 8px 24px rgba(0,0,0,0.3)",fontFamily:"'DM Sans',system-ui,sans-serif"});
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 0.3s"; setTimeout(() => el.remove(), 300); }, 3000);
}

function generateFullModelXLSX(project, results, financing, waterfall) {
  // Load SheetJS from CDN (no npm dependency needed)
  const script = document.createElement('script');
  script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  script.onload = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { _domNotify('Excel export failed. Reload and try again.'); return; }
    _buildXLSX(XLSX, project, results, financing, waterfall);
  };
  script.onerror = () => { _domNotify('Could not load Excel library. Check internet connection.'); };
  // Only load once
  if (window.XLSX) { _buildXLSX(window.XLSX, project, results, financing, waterfall); return; }
  document.head.appendChild(script);
}

function _buildXLSX(XLSX, project, results, financing, waterfall) {
    const h = results?.horizon || 50;
    const sy = results?.startYear || 2026;
    const c = results?.consolidated;
    const f = financing;
    const w = waterfall;
    const wb = XLSX.utils.book_new();
    const cur = project.currency || "SAR";
    const yrs = Array.from({length: Math.min(30, h)}, (_, i) => i);

    // Format helpers
    const fm = v => typeof v === 'number' ? Math.round(v) : v;
    const fp = v => typeof v === 'number' ? +(v*100).toFixed(2) + '%' : v;

    // ═══ SHEET 1: Executive Summary ═══
    const s1 = [];
    s1.push(['─────────────────────────────────────────']);
    s1.push(['  ' + (project.currency === 'SAR' ? 'حصيف لتطوير الوجهات' : 'HASEEF DESTINATION DEVELOPMENT')]);
    s1.push(['  Financial Model — ' + (project.name || 'Project')]);
    s1.push(['─────────────────────────────────────────']);
    s1.push([]);
    s1.push(['▸ PROJECT INFORMATION', '', '▸ KEY METRICS']);
    s1.push(['  Project Name', project.name, '  Total CAPEX (' + cur + ')', fm(c?.totalCapex||0)]);
    s1.push(['  Location', project.location || '-', '  Total Income (' + h + 'yr)', fm(c?.totalIncome||0)]);
    s1.push(['  Currency', cur, '  Unlevered IRR', c?.irr ? fp(c.irr) : 'N/A']);
    s1.push(['  Start Year', sy, '  NPV @10%', fm(c?.npv10||0)]);
    s1.push(['  Horizon', h + ' years', '  NPV @12%', fm(c?.npv12||0)]);
    s1.push(['  Land Type', project.landType, '  NPV @14%', fm(c?.npv14||0)]);
    s1.push(['  Land Area (sqm)', project.landArea || 0, '  Total Assets', (project.assets||[]).length]);
    s1.push([]);

    if (f && f.mode !== 'self') {
      s1.push(['▸ FINANCING STRUCTURE', '', '▸ DEBT PARAMETERS']);
      s1.push(['  Dev Cost Excl Land', fm(f.devCostExclLand), '  Finance Rate', fp((project.financeRate||0)/100)]);
      s1.push(['  Land Capitalization', fm(f.landCapValue||0), '  Tenor', project.loanTenor + ' yrs (' + project.debtGrace + ' grace)']);
      s1.push(['  Dev Cost Incl Land', fm(f.devCostInclLand), '  Total Interest', fm(f.totalInterest)]);
      s1.push(['  Max Debt (' + (project.maxLtvPct||70) + '% LTV)', fm(f.maxDebt), '  Levered IRR', f.leveredIRR ? fp(f.leveredIRR) : 'N/A']);
      s1.push(['  Developer Equity', fm(f.gpEquity), '  Upfront Fee', fm(f.upfrontFee)]);
      if (f.lpEquity > 0) s1.push(['  Investor Equity', fm(f.lpEquity)]);
      s1.push(['  Total Equity', fm(f.totalEquity)]);
      s1.push([]);
    }

    if (w) {
      s1.push(['▸ INVESTOR RETURNS', '', 'Investor', 'Developer']);
      s1.push(['  Equity (' + cur + ')', '', fm(w.lpEquity), fm(w.gpEquity)]);
      s1.push(['  Equity %', '', fp(w.lpPct), fp(w.gpPct)]);
      s1.push(['  Total Distributions', '', fm(w.lpTotalDist), fm(w.gpTotalDist)]);
      s1.push(['  Net IRR', '', w.lpIRR ? fp(w.lpIRR) : 'N/A', w.gpIRR ? fp(w.gpIRR) : 'N/A']);
      s1.push(['  MOIC', '', w.lpMOIC ? w.lpMOIC.toFixed(2) + 'x' : '-', w.gpMOIC ? w.gpMOIC.toFixed(2) + 'x' : '-']);
      s1.push(['  NPV @10%', '', fm(w.lpNPV10), fm(w.gpNPV10)]);
      s1.push(['  Total Fees', '', fm(w.totalFees)]);
      s1.push([]);
    }

    s1.push(['─────────────────────────────────────────']);
    s1.push(['  Powered by ' + (project.currency === 'SAR' ? 'حصيف' : 'Haseef') + ' Development']);
    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1['!cols'] = [{wch:26},{wch:22},{wch:22},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // ═══ SHEET 2: Unlevered Cash Flow ═══
    const s2 = [];
    s2.push(['UNLEVERED PROJECT CASH FLOW', '', '', '', '', '', cur]);
    s2.push([]);
    s2.push(['Year', 'Calendar', 'Income', 'Land Rent', 'CAPEX', 'Net CF', 'Cumulative CF']);
    let cumCF = 0;
    yrs.forEach(y => {
      cumCF += (c?.netCF[y] || 0);
      s2.push([y+1, sy+y, fm(c?.income[y]||0), fm(c?.landRent[y]||0), fm(c?.capex[y]||0), fm(c?.netCF[y]||0), fm(cumCF)]);
    });
    s2.push([]);
    s2.push(['', 'TOTAL', fm(c?.totalIncome||0), fm(c?.totalLandRent||0), fm(c?.totalCapex||0), fm(c?.totalNetCF||0), '']);
    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2['!cols'] = [{wch:6},{wch:10},{wch:18},{wch:18},{wch:18},{wch:18},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Unlevered CF');

    // ═══ SHEET 3: Debt Schedule ═══
    if (f && f.mode !== 'self') {
      const s3 = [];
      s3.push(['FINANCING & DEBT SCHEDULE', '', '', '', '', '', '', '', cur]);
      s3.push([]);
      s3.push(['Year', 'Calendar', 'Drawdown', 'Repayment', 'Interest', 'Debt Balance', 'Levered CF', 'DSCR', 'Exit Proceeds']);
      yrs.forEach(y => {
        const dscr = f.dscr[y] !== null && f.dscr[y] !== undefined ? +f.dscr[y].toFixed(2) + 'x' : '-';
        s3.push([y+1, sy+y, fm(f.drawdown[y]||0), fm(f.repayment?.[y]||0), fm(f.interest[y]||0), fm(f.debtBalClose[y]||0), fm(f.leveredCF[y]||0), dscr, fm(f.exitProceeds[y]||0)]);
      });
      s3.push([]);
      s3.push(['', 'TOTAL', fm(f.drawdown.reduce((a,b)=>a+b,0)), fm((f.repayment||[]).reduce((a,b)=>a+b,0)), fm(f.totalInterest), '', '', '', '']);
      const ws3 = XLSX.utils.aoa_to_sheet(s3);
      ws3['!cols'] = [{wch:6},{wch:10},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16},{wch:8},{wch:16}];
      XLSX.utils.book_append_sheet(wb, ws3, 'Debt Schedule');
    }

    // ═══ SHEET 4: Waterfall ═══
    if (w) {
      const s4 = [];
      s4.push(['WATERFALL DISTRIBUTIONS', '', '', '', '', '', '', '', '', '', '', '', '', cur]);
      s4.push([]);
      s4.push(['Year','Calendar','Equity Calls','Cash Available','T1: ROC','T2: Preferred Return','T3: Catch-up','T4: Investor Split','T4: Developer Split','Investor Distribution','Developer Distribution','Investor Net CF','Developer Net CF']);
      yrs.forEach(y => {
        s4.push([y+1, sy+y, fm(w.equityCalls[y]), fm(w.cashAvail[y]), fm(w.tier1[y]), fm(w.tier2[y]), fm(w.tier3[y]), fm(w.tier4LP[y]), fm(w.tier4GP[y]), fm(w.lpDist[y]), fm(w.gpDist[y]), fm(w.lpNetCF[y]), fm(w.gpNetCF[y])]);
      });
      s4.push([]);
      s4.push(['','TOTAL', fm(w.equityCalls.reduce((a,b)=>a+b,0)), fm(w.cashAvail.reduce((a,b)=>a+b,0)),
        fm(w.tier1.reduce((a,b)=>a+b,0)), fm(w.tier2.reduce((a,b)=>a+b,0)), fm(w.tier3.reduce((a,b)=>a+b,0)),
        fm(w.tier4LP.reduce((a,b)=>a+b,0)), fm(w.tier4GP.reduce((a,b)=>a+b,0)),
        fm(w.lpTotalDist), fm(w.gpTotalDist)]);
      const ws4 = XLSX.utils.aoa_to_sheet(s4);
      const w4 = Array(13).fill({wch:15}); w4[0]={wch:6}; w4[1]={wch:10};
      ws4['!cols'] = w4;
      XLSX.utils.book_append_sheet(wb, ws4, 'Waterfall');
    }

    // ═══ SHEET 5: Asset Program ═══
    const s5 = [];
    s5.push(['ASSET PROGRAM', '', '', '', '', '', '', '', '', '', cur]);
    s5.push([]);
    s5.push(['Phase','Category','Asset Name','GFA (sqm)','Rev Type','Lease Rate','Op EBITDA','Cost/sqm','Total CAPEX','Total Income (' + h + 'yr)']);
    (results?.assetSchedules || []).forEach(a => {
      s5.push([a.phase, a.category, a.name, a.gfa, a.revType, fm(a.leaseRate||0), fm(a.opEbitda||0), fm(a.costPerSqm||0), fm(a.totalCapex), fm(a.totalRevenue)]);
    });
    s5.push([]);
    s5.push(['TOTAL','','', (results?.assetSchedules||[]).reduce((s,a)=>s+(a.gfa||0),0), '','','','', fm(c?.totalCapex||0), fm(c?.totalIncome||0)]);
    const ws5 = XLSX.utils.aoa_to_sheet(s5);
    ws5['!cols'] = [{wch:12},{wch:14},{wch:24},{wch:10},{wch:10},{wch:12},{wch:14},{wch:10},{wch:16},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws5, 'Assets');

    // ═══ SHEET 6: Phase Summary ═══
    const phases = Object.entries(results?.phaseResults || {});
    if (phases.length > 0) {
      const s6 = [];
      s6.push(['PHASE SUMMARY', '', '', '', '', '', '', cur]);
      s6.push([]);
      s6.push(['Phase','Assets','Total CAPEX','Total Income','Land Rent','Net CF','IRR','Land Allocation']);
      phases.forEach(([n,pr]) => {
        s6.push([n, pr.assetCount, fm(pr.totalCapex), fm(pr.totalIncome), fm(pr.totalLandRent), fm(pr.totalNetCF), pr.irr ? fp(pr.irr) : 'N/A', fp(pr.allocPct||0)]);
      });
      s6.push([]);
      s6.push(['CONSOLIDATED','', fm(c?.totalCapex||0), fm(c?.totalIncome||0), fm(c?.totalLandRent||0), fm(c?.totalNetCF||0), c?.irr ? fp(c.irr) : 'N/A', '100%']);
      const ws6 = XLSX.utils.aoa_to_sheet(s6);
      ws6['!cols'] = [{wch:14},{wch:8},{wch:16},{wch:18},{wch:16},{wch:18},{wch:10},{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws6, 'Phases');
    }

    // ── Download ──
    const fileName = `${(project.name||'Project').replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '_')}_Financial_Model.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// Fallback CSV export (if SheetJS fails to load)
function generateFallbackCSV(project, results, financing, waterfall) {
  const h = results?.horizon || 50;
  const sy = results?.startYear || 2026;
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;
  const sections = [];

  // Section 1: Project Summary
  sections.push(["PROJECT SUMMARY"]);
  sections.push(["Project Name", project.name]);
  sections.push(["Location", project.location]);
  sections.push(["Currency", project.currency]);
  sections.push(["Start Year", sy]);
  sections.push(["Horizon", h + " years"]);
  sections.push(["Land Type", project.landType]);
  sections.push(["Total CAPEX", c?.totalCapex || 0]);
  sections.push(["Total Income (" + h + "yr)", c?.totalIncome || 0]);
  sections.push([ar?"IRR قبل التمويل":"Unlevered IRR", c?.irr ? (c.irr * 100).toFixed(2) + "%" : "N/A"]);
  sections.push(["NPV @10%", c?.npv10 || 0]);
  sections.push(["NPV @12%", c?.npv12 || 0]);
  sections.push(["NPV @14%", c?.npv14 || 0]);
  sections.push([]);

  // Section 2: Financing
  if (f && f.mode !== "self") {
    sections.push(["FINANCING STRUCTURE"]);
    sections.push(["Max Debt (LTV)", f.maxDebt]);
    sections.push(["Total Debt Drawn", f.totalDebt]);
    sections.push(["Total Equity", f.totalEquity]);
    sections.push(["Finance Rate", project.financeRate + "%"]);
    sections.push(["Tenor", project.loanTenor + " yrs"]);
    sections.push(["Grace Period", project.debtGrace + " yrs"]);
    sections.push(["Levered IRR", f.leveredIRR ? (f.leveredIRR * 100).toFixed(2) + "%" : "N/A"]);
    sections.push(["Total Interest", f.totalInterest]);
    sections.push([]);
  }

  // Section 3: Waterfall Returns
  if (w) {
    sections.push(["INVESTOR RETURNS"]);
    sections.push(["", "Investor", "Developer"]);
    sections.push(["Equity", w.lpEquity, w.gpEquity]);
    sections.push(["Equity %", (w.lpPct * 100).toFixed(1) + "%", (w.gpPct * 100).toFixed(1) + "%"]);
    sections.push(["Total Distributions", w.lpTotalDist, w.gpTotalDist]);
    sections.push(["IRR", w.lpIRR ? (w.lpIRR * 100).toFixed(2) + "%" : "N/A", w.gpIRR ? (w.gpIRR * 100).toFixed(2) + "%" : "N/A"]);
    sections.push(["MOIC", w.lpMOIC ? w.lpMOIC.toFixed(2) + "x" : "N/A", w.gpMOIC ? w.gpMOIC.toFixed(2) + "x" : "N/A"]);
    sections.push(["NPV @10%", w.lpNPV10, w.gpNPV10]);
    sections.push(["Total Fees", w.totalFees]);
    sections.push([]);
  }

  // Section 4: Unlevered Cash Flow
  const yrs = Array.from({length: Math.min(20, h)}, (_, i) => i);
  sections.push(["UNLEVERED CASH FLOW"]);
  sections.push(["Year", "Calendar", "Revenue", "Land Rent", "CAPEX", "Net CF"]);
  yrs.forEach(y => {
    sections.push([y + 1, sy + y, c?.income[y] || 0, c?.landRent[y] || 0, c?.capex[y] || 0, c?.netCF[y] || 0]);
  });
  sections.push([]);

  // Section 5: Levered CF + DSCR
  if (f && f.mode !== "self") {
    sections.push(["LEVERED CASH FLOW"]);
    sections.push(["Year", "Calendar", "Debt Drawdown", "Debt Repay", "Interest", "Debt Balance", "Levered CF", "DSCR"]);
    yrs.forEach(y => {
      sections.push([y + 1, sy + y, f.drawdown[y] || 0, f.repayment[y] || 0, f.interest[y] || 0, f.debtBalClose[y] || 0, f.leveredCF[y] || 0, f.dscr[y] !== null ? f.dscr[y].toFixed(2) + "x" : ""]);
    });
    sections.push([]);
  }

  // Section 6: Waterfall
  if (w) {
    sections.push(["WATERFALL DISTRIBUTIONS"]);
    sections.push(["Year", "Calendar", "Equity Calls", "Cash Available", "T1:ROC", "T2:Preferred Return", "T3:Catch-up", "T4:Investor Split", "T4:Developer Split", "Investor Dist", "Developer Dist", "Investor Net CF", "Developer Net CF"]);
    yrs.forEach(y => {
      sections.push([y + 1, sy + y, w.equityCalls[y], w.cashAvail[y], w.tier1[y], w.tier2[y], w.tier3[y], w.tier4LP[y], w.tier4GP[y], w.lpDist[y], w.gpDist[y], w.lpNetCF[y], w.gpNetCF[y]]);
    });
    sections.push([]);
  }

  // Section 7: Asset list
  sections.push(["ASSET PROGRAM"]);
  sections.push(["Phase", "Category", "Asset Name", "GFA", "Rev Type", "Lease Rate", "EBITDA", "Cost/sqm", "Total CAPEX", "Total Income"]);
  (results?.assetSchedules || []).forEach(a => {
    sections.push([a.phase, a.category, a.name, a.gfa, a.revType, a.leaseRate, a.opEbitda, a.costPerSqm, a.totalCapex, a.totalRevenue]);
  });

  const csv = sections.map(r => r.map(v => csvEscape(v)).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Full_Model.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ReportsView extracted to ./components/views/ReportsView.jsx (Phase 2.6)

function runScenario(project, overrides) {
  try {
    const p = { ...project, ...overrides };
    const r = computeProjectCashFlows(p);
    const ir = computeIncentives(p, r);
    const f = computeFinancing(p, r, ir);
    const w = computeWaterfall(p, r, f, null);
    return { project: p, results: r, financing: f, waterfall: w };
  } catch (e) {
    console.error("runScenario error:", e);
    const r = computeProjectCashFlows({ ...project, ...overrides, activeScenario: "Base Case" });
    return { project: { ...project, ...overrides }, results: r, financing: null, waterfall: null };
  }
}

// ScenariosView extracted to ./components/views/ScenariosView.jsx (Phase 2.4)

// IncentivesView extracted to ./components/views/IncentivesView.jsx (Phase 2.3)


// ═══════════════════════════════════════════════════════════════
// MARKET INDICATORS VIEW
// ═══════════════════════════════════════════════════════════════
// NI (NumberInput) extracted to ./components/shared/NI.jsx

// MarketView extracted to ./components/views/MarketView.jsx (Phase 2.2)

/*--- MarketView body removed (Phase 2.2) ---*/
// ChecksView extracted to ./components/views/ChecksView.jsx (Phase 2.1)

// ═══════════════════════════════════════════════════════════════
// PRESENTATION MODE (Sprint 2)
// ═══════════════════════════════════════════════════════════════
function PresentationView({ project, results, financing, waterfall, incentivesResult, lang, audienceView, liveSliders, setLiveSliders, checks }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [activePhase, setActivePhase] = useState("consolidated"); // "consolidated" or phase name
  if (!results || !project) return <div style={{textAlign:"center",padding:60,color:"var(--text-secondary)",fontSize:14}}>{ar?"لا توجد بيانات للعرض":"No data to present"}</div>;

  // ── Real Engine Recalculation when sliders change ──
  const slidersDefault = liveSliders.capex === 100 && liveSliders.rent === 100 && liveSliders.exitMult === (project.exitMultiple || 10);
  const liveProject = useMemo(() => {
    if (slidersDefault) return project;
    return { ...project, activeScenario: "Custom", customCapexMult: liveSliders.capex, customRentMult: liveSliders.rent, exitMultiple: liveSliders.exitMult };
  }, [project, liveSliders, slidersDefault]);
  const liveResults = useMemo(() => { try { return computeProjectCashFlows(liveProject); } catch(e) { console.error("PresentationView liveResults error:", e); return results; } }, [liveProject]);
  const liveIncentives = useMemo(() => { try { return computeIncentives(liveProject, liveResults); } catch(e) { return incentivesResult; } }, [liveProject, liveResults]);
  const liveFinancing = useMemo(() => { try { return computeFinancing(liveProject, liveResults, liveIncentives); } catch(e) { return financing; } }, [liveProject, liveResults, liveIncentives]);
  const liveWaterfall = useMemo(() => { try { return computeWaterfall(liveProject, liveResults, liveFinancing, liveIncentives); } catch(e) { return waterfall; } }, [liveProject, liveResults, liveFinancing, liveIncentives]);

  // Use live-recalculated data
  const c = liveResults.consolidated;
  const f = liveFinancing;
  const w = liveWaterfall;
  const ir = liveIncentives;
  const phaseResults = liveResults.phaseResults || {};
  const phaseNames = Object.keys(phaseResults);

  // Derived metrics
  const irr = f && f.mode !== "self" && f.leveredIRR !== null ? f.leveredIRR : (ir && ir.adjustedIRR !== null ? ir.adjustedIRR : c.irr);
  const npv = (ir && ir.totalIncentiveValue > 0) ? ir.adjustedNPV10 : (c.npv10 || 0);
  const dscrVals = f && f.dscr ? f.dscr.filter(d => d !== null) : [];
  const minDscr = dscrVals.length > 0 ? Math.min(...dscrVals) : null;
  const avgDscr = dscrVals.length > 0 ? dscrVals.reduce((a, b) => a + b, 0) / dscrVals.length : null;

  // Health badge
  const irrOk = irr === null ? 0 : irr > 0.15 ? 2 : irr > 0.12 ? 1 : 0;
  const dscrOk = minDscr === null ? -1 : minDscr > 1.4 ? 2 : minDscr > 1.25 ? 1 : 0;
  const npvOk = npv > 0 ? 2 : 0;
  const score = irrOk + (dscrOk >= 0 ? dscrOk : 0) + npvOk;
  const maxScore = 4 + (dscrOk >= 0 ? 2 : 0);
  const healthLabel = score >= maxScore * 0.7 ? "Strong" : score >= maxScore * 0.4 ? "Good" : score >= maxScore * 0.15 ? "Moderate" : "Weak";
  const healthColor = score >= maxScore * 0.7 ? "#16a34a" : score >= maxScore * 0.4 ? "#2563eb" : score >= maxScore * 0.15 ? "#eab308" : "#ef4444";
  const healthLabelAr = { Strong: "قوي", Good: "جيد", Moderate: "متوسط", Weak: "ضعيف" }[healthLabel];

  // Payback year
  const paybackYr = c.netCF ? c.netCF.reduce((acc, v, i) => { acc.cum += v; if (acc.cum < -1) acc.neg = true; if (acc.yr === null && acc.neg && acc.cum > 0) acc.yr = i + 1; return acc; }, { cum: 0, yr: null, neg: false }).yr : null;

  // Phase-specific data
  const isPhase = activePhase !== "consolidated";
  const phaseData = isPhase ? phaseResults[activePhase] : null;
  const displayCapex = isPhase ? (phaseData?.totalCapex || 0) : c.totalCapex;
  const displayIncome = isPhase ? (phaseData?.totalIncome || 0) : c.totalIncome;
  const displayIRR = isPhase ? (phaseData?.irr || null) : irr;
  const displayNPV = isPhase ? null : npv;
  const displayAssets = isPhase ? liveResults.assetSchedules.filter(a => a.phase === activePhase) : liveResults.assetSchedules;

  const KPI = ({ label, value, sub, color }) => (
    <div className="hero-kpi" style={{background:"var(--surface-card)",borderRadius:12,border:"0.5px solid var(--border-default)",padding:"20px 22px",minWidth:140,flex:1,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div style={{fontSize:11,color:"var(--text-secondary)",fontWeight:500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
      <div style={{fontSize:26,fontWeight:700,color:color||"#1a1d23",lineHeight:1.1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:4}}>{sub}</div>}
    </div>
  );

  const Section = ({ title, children, color }) => (
    <div style={{marginBottom:24}}>
      <div style={{fontSize:14,fontWeight:700,color:color||"#1a1d23",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:4,height:18,borderRadius:2,background:color||"#2563eb"}} />{title}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{maxWidth:1100,margin:"0 auto",paddingBottom:120}}>
      {/* ── Executive Summary Card ── */}
      <div style={{background:"linear-gradient(135deg,#0f1117 0%,#1a1d2e 100%)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:"radial-gradient(circle,rgba(46,196,182,0.08) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:18,fontWeight:900,color:"#fff",fontFamily:"'Tajawal',sans-serif"}}>{lang==="ar"?"حصيف":"Haseef"}</span><span style={{width:1,height:14,background:"rgba(46,196,182,0.4)"}} /><span style={{fontSize:9,color:"#2EC4B6",fontWeight:300}}>{lang==="ar"?"النمذجة المالية":"Financial Modeler"}</span></div>
            <div style={{fontSize:24,fontWeight:700,letterSpacing:-0.5}}>{project.name || "Untitled"}</div>
            {project.location && <div style={{fontSize:12,color:"#8b90a0",marginTop:4}}>{project.location}</div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!slidersDefault && <span style={{fontSize:10,padding:"4px 10px",borderRadius:12,background:"#fbbf2430",color:"#fbbf24",fontWeight:600,border:"1px solid #fbbf2440"}}>{ar?"سيناريو مُعدّل":"Adjusted Scenario"}</span>}
            <div style={{padding:"6px 16px",borderRadius:20,background:healthColor+"20",border:`1px solid ${healthColor}40`,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:4,background:healthColor}} />
              <span style={{fontSize:12,fontWeight:700,color:healthColor}}>{ar ? healthLabelAr : healthLabel}</span>
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:"#8b90a0",lineHeight:1.6,marginBottom:16}}>
          {project.currency || "SAR"} {fmtM(displayCapex)} {ar?"مشروع تطوير":"development"} | {displayIRR !== null ? (displayIRR*100).toFixed(1)+"% IRR" : "—"} | {paybackYr ? paybackYr+"yr payback" : "—"} | {minDscr !== null ? minDscr.toFixed(1)+"x DSCR" : "—"}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <KPI label={ar?"إجمالي التكاليف":"Total CAPEX"} value={fmtM(displayCapex)} color="#fff" />
          <KPI label="IRR" value={displayIRR !== null ? (displayIRR*100).toFixed(1)+"%" : "—"} color={getMetricColor("IRR",displayIRR,{dark:true})} />
          {displayNPV !== null && <KPI label={ar?"صافي القيمة الحالية":"NPV @10%"} value={fmtM(displayNPV)} color={getMetricColor("NPV",displayNPV,{dark:true})} />}
          {minDscr !== null && !isPhase && <KPI label={ar?"أدنى DSCR":"Min DSCR"} value={minDscr.toFixed(2)+"x"} color={getMetricColor("DSCR",minDscr,{dark:true})} />}
          {w && !isPhase && <KPI label={ar?"مضاعف المستثمر":"Investor MOIC"} value={w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—"} color={getMetricColor("MOIC",w.lpMOIC,{dark:true})} />}
          {isPhase && <KPI label={ar?"إجمالي الإيرادات":"Total Income"} value={fmtM(displayIncome)} color="#4ade80" />}
          {isPhase && <KPI label={ar?"عدد الأصول":"Assets"} value={String(displayAssets.length)} color="#fff" />}
        </div>
      </div>

      {/* ── Phase Selector Tabs ── */}
      {phaseNames.length > 1 && (
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          <button onClick={()=>setActivePhase("consolidated")} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase==="consolidated"?"#1a1d23":"#f0f1f5",color:activePhase==="consolidated"?"#fff":"#6b7080",border:"none"}}>{ar?"الموحّد":"Consolidated"}</button>
          {phaseNames.map(pn => (
            <button key={pn} onClick={()=>setActivePhase(pn)} style={{...btnS,padding:"8px 18px",fontSize:11,fontWeight:600,borderRadius:20,background:activePhase===pn?"#2563eb":"#f0f1f5",color:activePhase===pn?"#fff":"#6b7080",border:"none"}}>
              {pn} <span style={{fontSize:9,opacity:0.7}}>({(phaseResults[pn]?.assetCount||0)})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Phase Summary Cards (when consolidated) ── */}
      {!isPhase && phaseNames.length > 1 && (
        <Section title={ar?"ملخص المراحل":"Phase Summary"} color="#0f766e">
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":`repeat(${Math.min(phaseNames.length, 4)}, 1fr)`,gap:12}}>
            {phaseNames.map(pn => {
              const pd = phaseResults[pn];
              return (
                <div key={pn} onClick={()=>setActivePhase(pn)} style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px",cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.boxShadow="0 2px 8px rgba(37,99,235,0.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7ec";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:8}}>{pn}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>CAPEX</div><div style={{fontSize:14,fontWeight:600}}>{fmtM(pd?.totalCapex)}</div></div>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"الإيرادات":"Revenue"}</div><div style={{fontSize:14,fontWeight:600,color:"#16a34a"}}>{fmtM(pd?.totalIncome)}</div></div>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>IRR</div><div style={{fontSize:14,fontWeight:600,color:pd?.irr>0.12?"#16a34a":"#eab308"}}>{pd?.irr !== null ? (pd.irr*100).toFixed(1)+"%" : "—"}</div></div>
                    <div><div style={{fontSize:9,color:"var(--text-secondary)",textTransform:"uppercase"}}>{ar?"الأصول":"Assets"}</div><div style={{fontSize:14,fontWeight:600}}>{pd?.assetCount||0}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Bank View ── */}
      {audienceView === "bank" && !isPhase && (<>
        <Section title={ar?"ملخص التمويل":"Financing Summary"} color="#1e40af">
          {f ? (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit, minmax(200px, 1fr))",gap:12}}>
              <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي الدين":"Total Debt"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#1e40af"}}>{fmtM(f.totalDebt)}</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>LTV: {f.totalProjectCost>0?((f.totalDebt/f.totalProjectCost)*100).toFixed(0):0}%</div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"إجمالي حقوق الملكية":"Total Equity"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#16a34a"}}>{fmtM(f.totalEquity)}</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{ar?"المطور":"Developer"}: {fmtM(f.gpEquity)}{f.lpEquity > 0 ? ` | ${ar?"المستثمر":"Investor"}: ${fmtM(f.lpEquity)}` : ""}</div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"معدل التمويل":"Finance Rate"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"var(--text-primary)"}}>{(f.rate*100).toFixed(1)}%</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{ar?"المدة":"Tenor"}: {liveProject.loanTenor||7}{ar?" سنة":"yr"} | {ar?"سماح":"Grace"}: {liveProject.debtGrace||3}{ar?" سنة":"yr"}</div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{ar?"متوسط DSCR":"Avg DSCR"}</div>
                <div style={{fontSize:20,fontWeight:700,color:getMetricColor("DSCR",avgDscr)}}>{avgDscr ? avgDscr.toFixed(2)+"x" : "—"}</div>
                <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{ar?"أدنى":"Min"}: {minDscr ? minDscr.toFixed(2)+"x" : "—"}</div>
              </div>
            </div>
          ) : <div style={{color:"var(--text-secondary)",fontSize:12}}>{ar?"لا يوجد تمويل مُعدّ":"No financing configured"}</div>}
        </Section>
        {f && dscrVals.length > 0 && (
          <Section title={ar?"جدول DSCR":"DSCR Schedule"} color="#1e40af">
            <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px",overflowX:"auto"}}>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",minHeight:120,paddingTop:8}}>
                {f.dscr.slice(0, Math.min(liveResults.horizon, 20)).map((d, y) => {
                  if (d === null) return <div key={y} style={{flex:1,minWidth:24}} />;
                  const h = Math.min(100, Math.max(8, d * 40));
                  const clr = d >= 1.4 ? "#16a34a" : d >= 1.2 ? "#eab308" : "#ef4444";
                  return (
                    <div key={y} style={{flex:1,minWidth:24,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:10,color:"var(--text-secondary)",fontWeight:600}}>{d.toFixed(1)}x</span>
                      <div style={{width:"80%",height:h,background:clr,borderRadius:3,transition:"height 0.5s"}} />
                      <span style={{fontSize:10,color:"var(--text-tertiary)"}}>{(liveProject.startYear||2026)+y}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{borderTop:"2px dashed #ef4444",marginTop:4,position:"relative"}}>
                <span style={{position:"absolute",right:0,top:2,fontSize:10,color:"#ef4444",fontWeight:600}}>1.2x {ar?"حد أدنى":"min"}</span>
              </div>
            </div>
          </Section>
        )}
        {f && (
          <Section title={ar?"المصادر والاستخدامات":"Sources & Uses"} color="#1e40af">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"المصادر":"Sources"}</div>
                {[
                  { label: ar?"دين بنكي":"Bank Debt", value: f.totalDebt, color: "#1e40af" },
                  { label: ar?"مساهمة المطور":"Developer Equity", value: f.gpEquity, color: "#16a34a" },
                  { label: ar?"مساهمة المستثمر":"Investor Equity", value: f.lpEquity, color: "#8b5cf6" },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f0f1f5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:s.color}} /><span style={{fontSize:12}}>{s.label}</span></div>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:700,fontSize:13}}>
                  <span>{ar?"الإجمالي":"Total"}</span><span>{fmtM(f.totalProjectCost||f.devCostInclLand)}</span>
                </div>
              </div>
              <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>{ar?"الاستخدامات":"Uses"}</div>
                {[
                  { label: ar?"تكاليف البناء":"Construction CAPEX", value: c.totalCapex },
                  { label: ar?"إيجار الأرض":"Land Cost/Rent", value: liveProject.landType==="purchase" ? liveProject.landPurchasePrice : 0 },
                  { label: ar?"رسوم التمويل":"Financing Fees", value: (f.upfrontFee||0) },
                ].filter(s => s.value > 0).map((s, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #f0f1f5"}}>
                    <span style={{fontSize:12}}>{s.label}</span>
                    <span style={{fontSize:12,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtM(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
      </>)}

      {/* ── Investor View ── */}
      {audienceView === "investor" && !isPhase && (<>
        <Section title={ar?"عوائد المستثمرين":"Investor Returns"} color="#7c3aed">
          {w ? (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit, minmax(180px, 1fr))",gap:12}}>
              {[
                { label: ar?"عائد المستثمر":"Investor IRR", value: w.lpIRR !== null ? (w.lpIRR*100).toFixed(1)+"%" : "—", color: "#7c3aed" },
                { label: ar?"عائد المطور":"Developer IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—", color: "#16a34a" },
                { label: ar?"مضاعف المستثمر":"Investor MOIC", value: w.lpMOIC ? w.lpMOIC.toFixed(2)+"x" : "—", color: "#7c3aed", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.lpTotalInvested)} → ${fmtM(w.lpTotalDist)}` },
                { label: ar?"مضاعف المطور":"Developer MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—", color: "#16a34a", sub: `${ar?"الاستثمار":"Invested"}: ${fmtM(w.gpTotalInvested)} → ${fmtM(w.gpTotalDist)}` },
                { label: "DPI", value: w.lpTotalInvested > 0 ? (w.lpTotalDist / w.lpTotalInvested).toFixed(2)+"x" : "—", color: "#1a1d23" },
              ].map((item, i) => (
                <div key={i} style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{item.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:item.color}}>{item.value}</div>
                  {item.sub && <div style={{fontSize:10,color:"var(--text-tertiary)",marginTop:2}}>{item.sub}</div>}
                </div>
              ))}
            </div>
          ) : <div style={{color:"var(--text-secondary)",fontSize:12}}>{ar?"حافز حسن الأداء غير مُعدّ — اختر صندوق استثماري":"Waterfall not configured - select Fund mode"}</div>}
        </Section>
        {w && w.tier1 && (
          <Section title={ar?"شلال التوزيعات":"Distribution Waterfall"} color="#7c3aed">
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4, 1fr)",gap:12}}>
              {[
                { label: ar?"رد رأس المال":"T1: Return of Capital", value: (w.tier1||[]).reduce((s,v)=>s+v,0), color: "#1e40af" },
                ...((w.tier2||[]).reduce((s,v)=>s+v,0) > 0 ? [{ label: ar?"العائد التفضيلي":"T2: Preferred Return", value: (w.tier2||[]).reduce((s,v)=>s+v,0), color: "#7c3aed" }] : []),
                ...((w.tier3||[]).reduce((s,v)=>s+v,0) > 0 ? [{ label: ar?"التعويض":"T3: Catch-up", value: (w.tier3||[]).reduce((s,v)=>s+v,0), color: "#16a34a" }] : []),
                ...(((w.tier4LP||[]).reduce((s,v)=>s+v,0))+((w.tier4GP||[]).reduce((s,v)=>s+v,0)) > 0 ? [{ label: ar?"تقسيم الأرباح":"T4: Profit Split", value: ((w.tier4LP||[]).reduce((s,v)=>s+v,0))+((w.tier4GP||[]).reduce((s,v)=>s+v,0)), color: "#f59e0b" }] : []),
              ].map((tier, i) => (
                <div key={i} style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 16px",borderTop:`3px solid ${tier.color}`}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:4}}>{tier.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:tier.color}}>{fmtM(tier.value)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
        {w && (
          <Section title={ar?"اقتصاديات المطور":"Developer Economics"} color="#16a34a">
            <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"16px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
                {[
                  { label: ar?"مساهمة المطور":"Developer Equity", value: fmtM(w.gpTotalInvested) },
                  { label: ar?"توزيعات المطور":"Developer Distributions", value: fmtM(w.gpTotalDist) },
                  { label: ar?"رسوم المطور":"Developer Fee", value: fmtM(w.developerFeeTotal||0) },
                  { label: ar?"رسوم الإدارة":"Mgmt Fees", value: fmtM(w.mgmtFeeTotal||0) },
                  { label: ar?"عائد المطور":"Developer IRR", value: w.gpIRR !== null ? (w.gpIRR*100).toFixed(1)+"%" : "—" },
                  { label: ar?"مضاعف المطور":"Developer MOIC", value: w.gpMOIC ? w.gpMOIC.toFixed(2)+"x" : "—" },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:14,fontWeight:600,color:"var(--text-primary)"}}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}
        {f && liveProject.exitStrategy !== "hold" && (
          <Section title={ar?"تحليل التخارج":"Exit Analysis"} color="#f59e0b">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:12}}>
              {[
                { label: ar?"سنة التخارج":"Exit Year", value: f.exitYear || "—" },
                { label: ar?"قيمة التخارج":"Exit Value", value: f.exitProceeds ? fmtM(f.exitProceeds.reduce((s,v)=>s+v,0)) : "—" },
                { label: ar?"مضاعف التخارج":"Exit Multiple", value: liveProject.exitMultiple+"x" },
                { label: ar?"تكاليف التخارج":"Exit Cost", value: liveProject.exitCostPct+"%" },
              ].map((item, i) => (
                <div key={i} style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:2}}>{item.label}</div>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)"}}>{item.value}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </>)}

      {/* ── Asset Overview (both views + phase filtered) ── */}
      <Section title={isPhase ? `${activePhase} — ${ar?"الأصول":"Assets"}` : (ar?"نظرة عامة على الأصول":"Asset Overview")} color="#0f766e">
        <div style={{background:"var(--surface-card)",borderRadius:10,border:"0.5px solid var(--border-default)",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"var(--surface-table-header)"}}>
                <th style={{...thSt,fontSize:11}}>{ar?"الأصل":"Asset"}</th>
                {!isPhase && <th style={{...thSt,fontSize:11}}>{ar?"المرحلة":"Phase"}</th>}
                <th style={{...thSt,fontSize:11}}>{ar?"التصنيف":"Category"}</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>GFA</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>CAPEX</th>
                <th style={{...thSt,fontSize:11,textAlign:"right"}}>{ar?"الإيرادات":"Revenue"}</th>
              </tr>
            </thead>
            <tbody>
              {displayAssets.map((a, i) => (
                <tr key={i}>
                  <td style={{...tdSt,fontSize:12,fontWeight:500}}>{a.name||"—"}</td>
                  {!isPhase && <td style={{...tdSt,fontSize:11,color:"var(--text-secondary)"}}>{a.phase}</td>}
                  <td style={{...tdSt,fontSize:11,color:"var(--text-secondary)"}}>{catL(a.category,ar)}</td>
                  <td style={{...tdN,fontSize:12}}>{fmt(a.gfa)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600}}>{fmtM(a.totalCapex)}</td>
                  <td style={{...tdN,fontSize:12,fontWeight:600,color:"#16a34a"}}>{fmtM(a.totalRevenue)}</td>
                </tr>
              ))}
              <tr style={{background:"var(--surface-table-header)",fontWeight:700}}>
                <td colSpan={isPhase?3:4} style={{...tdSt,fontSize:12}}>{ar?"الإجمالي":"Total"}</td>
                <td style={{...tdN,fontSize:12}}>{fmtM(displayCapex)}</td>
                <td style={{...tdN,fontSize:12,color:"#16a34a"}}>{fmtM(displayIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Live Scenario Sliders ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(15,17,23,0.95)",backdropFilter:"blur(8px)",borderTop:"1px solid #282d3a",padding:isMobile?"8px 12px":"12px 24px",display:"flex",alignItems:"center",gap:isMobile?12:24,justifyContent:"center",zIndex:9000,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600,minWidth:50}}>CAPEX</span>
          <input type="range" min={80} max={120} value={liveSliders.capex} onChange={e=>setLiveSliders(s=>({...s,capex:+e.target.value}))} style={{width:isMobile?80:120,accentColor:"#2563eb"}} />
          <span style={{fontSize:11,color:liveSliders.capex!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.capex}%</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600,minWidth:50}}>{ar?"الإيجار":"Rent"}</span>
          <input type="range" min={80} max={120} value={liveSliders.rent} onChange={e=>setLiveSliders(s=>({...s,rent:+e.target.value}))} style={{width:isMobile?80:120,accentColor:"#16a34a"}} />
          <span style={{fontSize:11,color:liveSliders.rent!==100?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.rent}%</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600,minWidth:50}}>{ar?"المضاعف":"Exit ×"}</span>
          <input type="range" min={6} max={15} step={0.5} value={liveSliders.exitMult} onChange={e=>setLiveSliders(s=>({...s,exitMult:+e.target.value}))} style={{width:isMobile?80:120,accentColor:"#f59e0b"}} />
          <span style={{fontSize:11,color:liveSliders.exitMult!==(project.exitMultiple||10)?"#fbbf24":"#d0d4dc",fontWeight:600,minWidth:36,fontVariantNumeric:"tabular-nums"}}>{liveSliders.exitMult}x</span>
        </div>
        <div style={{width:1,height:24,background:"#282d3a"}} />
        <button onClick={()=>setLiveSliders({capex:100,rent:100,exitMult:project.exitMultiple||10})} style={{...btnS,background:slidersDefault?"#1e2230":"#fbbf2430",color:slidersDefault?"#4b5060":"#fbbf24",padding:"6px 14px",fontSize:10,fontWeight:600,border:slidersDefault?"1px solid #282d3a":"1px solid #fbbf2440"}}>{ar?"إعادة تعيين":"Reset"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const btnS={border:"none",borderRadius:"var(--radius-sm)",cursor:"pointer",fontFamily:"inherit",transition:"all var(--transition-normal)"};
const btnPrim={...btnS,background:"var(--btn-primary-bg)",color:"var(--btn-primary-text)",fontWeight:600};
const btnSm={...btnS,padding:"4px 8px",fontSize:11,fontWeight:500,borderRadius:"var(--radius-sm)"};
const sideInputStyle={width:"100%",padding:"7px 10px",borderRadius:"var(--radius-sm)",border:"0.5px solid var(--nav-btn-border)",background:"var(--nav-btn-bg)",color:"var(--nav-btn-text)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
const cellInputStyle={padding:"4px 6px",borderRadius:3,border:"1px solid transparent",background:"transparent",color:"var(--text-primary)",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",width:"100%"};
const tblStyle={width:"100%",borderCollapse:"collapse"};
const thSt={padding:"7px 8px",textAlign:"start",fontSize:11,fontWeight:600,color:"var(--text-secondary)",background:"var(--surface-table-header)",borderBottom:"0.5px solid var(--border-default)",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.3};
const tdSt={padding:"5px 8px",borderBottom:"0.5px solid var(--surface-separator)",fontSize:12,whiteSpace:"nowrap"};
const tdN={...tdSt,textAlign:"right",fontVariantNumeric:"tabular-nums"};

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY WRAPPER
// ═══════════════════════════════════════════════════════════════
export default function ReDevModeler(props) {
  return <AppErrorBoundary><ReDevModelerInner {...props} /></AppErrorBoundary>;
}
