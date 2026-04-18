// Extracted from App.jsx lines 10690-11237
// Restyled 2026-04-17: design tokens + Apple HIG primitives where non-disruptive.
// Engine logic (runScenario, breakeven search, tornado/goalseek/optimizer loops)
// is unchanged — only presentational layer touched.
import { useState, useMemo, useRef, useEffect } from "react";
import EmptyState from "../shared/EmptyState.jsx";
import Tip from "../shared/Tip.jsx";
import HelpLink from "../shared/HelpLink.jsx";
import EducationalModal from "../shared/EducationalModal.jsx";
import { computeProjectCashFlows } from "../../engine/cashflow.js";
import { computeIncentives } from "../../engine/incentives.js";
import { computeFinancing } from "../../engine/financing.js";
import { computeWaterfall } from "../../engine/waterfall.js";
import { calcIRR, calcNPV } from "../../engine/math.js";
import { fmt, fmtPct, fmtM } from "../../utils/format.js";
import { useIsMobile } from "../shared/hooks.js";
import { Button, SegmentedControl, Select, Input, Badge, Card } from "../ui";

// ── Styles (HIG-polished; preserving original export surface) ──
const btnS  = { border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s var(--ease-quart)" };
const btnPrim = { ...btnS, background: "var(--sys-blue)", color: "#fff", fontWeight: 600 };
const btnSm = { ...btnS, padding: "5px 10px", fontSize: 11, fontWeight: 500, borderRadius: 6 };
const tblStyle = { width: "100%", borderCollapse: "collapse" };
const thSt = { padding: "8px 10px", textAlign: "start", fontSize: 10.5, fontWeight: 600, color: "var(--text-secondary)", background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.4 };
const tdSt = { padding: "6px 10px", borderBottom: "1px solid var(--hairline)", fontSize: 12, whiteSpace: "nowrap" };
const tdN  = { ...tdSt, textAlign: "right", fontVariantNumeric: "tabular-nums" };

// ── runScenario helper (extracted from App.jsx line 10690) ──
export function runScenario(project, overrides) {
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

function ScenariosView({ project, results, financing, waterfall, lang, up }) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("compare");
  const [sensRow, setSensRow] = useState("rentEscalation");
  const [sensCol, setSensCol] = useState("softCostPct");
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [eduModal, setEduModal] = useState(null);
  // Tornado
  const [tornadoMetric, setTornadoMetric] = useState("irr");
  const [tornadoData, setTornadoData] = useState(null);
  const [tornadoLoading, setTornadoLoading] = useState(false);
  // Goal Seeker
  const [gsMetric, setGsMetric] = useState("irr");
  const [gsTarget, setGsTarget] = useState(15);
  const [gsVariable, setGsVariable] = useState("leaseRate");
  const [gsResult, setGsResult] = useState(null);
  const [gsLoading, setGsLoading] = useState(false);
  // Optimizer
  const [optMetric, setOptMetric] = useState("lpIRR");
  const [optVars, setOptVars] = useState(["maxLtvPct", "prefReturnPct"]);
  const [optResults, setOptResults] = useState(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const optCancelRef = useRef(false);
  // Custom Scenarios
  const [customScenarios, setCustomScenarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem('haseef_custom_scenarios_' + (project?.id || 'default')) || '[]'); } catch { return []; }
  });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customOverrides, setCustomOverrides] = useState({});
  // Ranking
  const [rankMetric, setRankMetric] = useState("irr");
  const [showRanking, setShowRanking] = useState(false);

  // Empty state flag — used for conditional rendering AFTER all hooks
  const _isEmpty = !project || !results || !(project?.assets?.length);

  const cur = _isEmpty ? "SAR" : (project.currency || "SAR");
  const ar = lang === "ar";
  const c = results.consolidated;
  const h = results.horizon;
  const phaseNames = Object.keys(results.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : phaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < phaseNames.length;

  const togglePhase = (p) => {
    setSelectedPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  // Helper: extract phase-level consolidated from scenario result
  const getScenarioData = (s) => { if (!isFiltered) return s.results.consolidated;
    const income = new Array(h).fill(0), capex = new Array(h).fill(0), landRent = new Array(h).fill(0), netCF = new Array(h).fill(0);
    activePh.forEach(pName => {
      const pr = s.results.phaseResults?.[pName]; if (!pr) return;
      for (let y = 0; y < h; y++) { income[y] += pr.income[y]||0; capex[y] += pr.capex[y]||0; landRent[y] += pr.landRent[y]||0; netCF[y] += pr.netCF[y]||0; }
    });
    return {
      income, capex, landRent, netCF,
      totalCapex: capex.reduce((a,b)=>a+b,0), totalIncome: income.reduce((a,b)=>a+b,0),
      totalNetCF: netCF.reduce((a,b)=>a+b,0),
      irr: calcIRR(netCF), npv10: calcNPV(netCF,0.10), npv12: calcNPV(netCF,0.12), npv14: calcNPV(netCF,0.14),
    };
  };

  // ── Section 1: Scenario Comparison ──
  const scenarioDefs = [
    { name: ar?"الحالة الأساسية":"Base Case", overrides: { activeScenario: "Base Case" } },
    { name: ar?"تكاليف +10%":"CAPEX +10%", overrides: { activeScenario: "CAPEX +10%" } },
    { name: ar?"تكاليف -10%":"CAPEX -10%", overrides: { activeScenario: "CAPEX -10%" } },
    { name: ar?"إيجار +10%":"Rent +10%", overrides: { activeScenario: "Rent +10%" } },
    { name: ar?"إيجار -10%":"Rent -10%", overrides: { activeScenario: "Rent -10%" } },
    { name: ar?"تأخير +6 أشهر":"Delay +6mo", overrides: { activeScenario: "Delay +6 months" } },
    { name: ar?"تصاعد +0.5%":"Esc +0.5%", overrides: { activeScenario: "Escalation +0.5%" } },
    { name: ar?"تصاعد -0.5%":"Esc -0.5%", overrides: { activeScenario: "Escalation -0.5%" } },
  ];

  const scenarioResults = useMemo(() => { if (_isEmpty) return [];
    return scenarioDefs.map(sd => {
      const s = runScenario(project, sd.overrides);
      return { name: sd.name, ...s };
    });
  }, [project, _isEmpty]);

  // ── Section 2: Sensitivity Table ──
  const avgOcc = _isEmpty ? 100 : Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/Math.max(1,(project.assets||[]).length));
  const sensParams = [
    { key: "rentEscalation", label: ar?"زيادة الإيجار %":"Rent Escalation %", base: project.rentEscalation, steps: [-0.5, -0.25, 0, 0.25, 0.5], unit: "%" },
    { key: "softCostPct", label: ar?"تكاليف غير مباشرة %":"Soft Cost %", base: project.softCostPct, steps: [-3, -1.5, 0, 1.5, 3], unit: "%" },
    { key: "contingencyPct", label: ar?"احتياطي %":"Contingency %", base: project.contingencyPct, steps: [-2, -1, 0, 1, 2], unit: "%" },
    { key: "financeRate", label: ar?"معدل الربح %":"Finance Rate %", base: project.financeRate, steps: [-1.5, -0.75, 0, 0.75, 1.5], unit: "%" },
    { key: "maxLtvPct", label: "LTV %", base: project.maxLtvPct, steps: [-15, -7.5, 0, 7.5, 15], unit: "%" },
    { key: "landRentAnnual", label: ar?"إيجار الأرض":"Land Rent", base: project.landRentAnnual, steps: [-2000000, -1000000, 0, 1000000, 2000000], unit: ar?"ريال":"SAR" },
    { key: "_occupancy", label: ar?"الإشغال %":"Occupancy %", base: avgOcc, steps: [-20, -10, 0, 10, 20], unit: "%",
      apply: (val) => ({ assets: (project.assets||[]).map(a => ({...a, stabilizedOcc: Math.max(0, Math.min(100, val))})) }) },
    { key: "exitMultiple", label: ar?"مضاعف التخارج":"Exit Multiple", base: project.exitMultiple??10, steps: [-3, -1.5, 0, 1.5, 3], unit: "x" },
    { key: "exitYear", label: ar?"سنة التخارج":"Exit Year", base: project.exitYear||(project.startYear||2026)+7, steps: [-2, -1, 0, 1, 2], unit: ar?"سنة":"yr", decimals: 0 },
  ];

  const rowParam = sensParams.find(p => p.key === sensRow) || sensParams[0];
  const colParam = sensParams.find(p => p.key === sensCol) || sensParams[1];

  const sensTable = useMemo(() => { if (_isEmpty) return [];
    const table = [];
    for (const rStep of rowParam.steps) {
      const row = [];
      for (const cStep of colParam.steps) {
        const rVal = rowParam.base + rStep;
        const cVal = colParam.base + cStep;
        const rOverride = rowParam.apply ? rowParam.apply(rVal) : { [rowParam.key]: rVal };
        const cOverride = colParam.apply ? colParam.apply(cVal) : { [colParam.key]: cVal };
        const overrides = { activeScenario: "Base Case", ...rOverride, ...cOverride };
        if (rOverride.assets && cOverride.assets) {
          overrides.assets = cOverride.assets;
        }
        const s = runScenario(project, overrides);
        const sd = isFiltered ? (() => {
          const income = new Array(h).fill(0), capex = new Array(h).fill(0), netCF = new Array(h).fill(0);
          activePh.forEach(pName => { const pr = s.results.phaseResults?.[pName]; if (!pr) return; for (let y = 0; y < h; y++) { income[y]+=pr.income[y]||0; capex[y]+=pr.capex[y]||0; netCF[y]+=pr.netCF[y]||0; }});
          return { irr: calcIRR(netCF), npv10: calcNPV(netCF,0.10) };
        })() : s.results.consolidated;
        row.push({
          irr: sd.irr,
          npv: sd.npv10,
          levIrr: s.financing?.leveredIRR || null,
          rVal, cVal,
        });
      }
      table.push(row);
    }
    return table;
  }, [project, sensRow, sensCol, selectedPhases]);

  // ── Section 3: Break-even ──
  const getFilteredNPV = (r) => { if (!isFiltered) return r.consolidated.npv10;
    const netCF = new Array(h).fill(0);
    activePh.forEach(pName => { const pr = r.phaseResults?.[pName]; if (!pr) return; for (let y=0;y<h;y++) netCF[y]+=pr.netCF[y]||0; });
    return calcNPV(netCF, 0.10);
  };

  const breakeven = useMemo(() => {
    if (_isEmpty) return {};
    const results = {};
    const filteredAssetPhases = isFiltered ? activePh : null;
    for (let occ = 100; occ >= 0; occ -= 2) {
      const assets = project.assets.map(a => {
        if (filteredAssetPhases && !filteredAssetPhases.includes(a.phase)) return a;
        return { ...a, stabilizedOcc: occ };
      });
      const p2 = { ...project, assets };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.occupancy = occ + 2;
        break;
      }
    }
    for (let mult = 100; mult >= 0; mult -= 2) {
      const p2 = { ...project, activeScenario: "Custom", customRentMult: mult, customCapexMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.rentDrop = 100 - mult - 2;
        break;
      }
    }
    for (let mult = 100; mult <= 300; mult += 2) {
      const p2 = { ...project, activeScenario: "Custom", customCapexMult: mult, customRentMult: 100, customDelay: 0, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.capexIncrease = mult - 100 - 2;
        break;
      }
    }
    if (project.finMode !== "self") {
      const baseRate = project.financeRate ?? 6.5;
      for (let rate = baseRate; rate <= 25; rate += 0.5) {
        const p2 = { ...project, financeRate: rate };
        const r = computeProjectCashFlows(p2);
        const ir2 = computeIncentives(p2, r);
        const f2 = computeFinancing(p2, r, ir2);
        if (f2 && f2.leveredIRR !== null && f2.leveredIRR <= 0) {
          results.financeRate = rate - 0.5;
          results.financeRateMargin = (rate - 0.5) - baseRate;
          break;
        }
      }
    }
    for (let delay = 0; delay <= 36; delay += 3) {
      const p2 = { ...project, activeScenario: "Custom", customDelay: delay, customCapexMult: 100, customRentMult: 100, customEscAdj: 0 };
      const r = computeProjectCashFlows(p2);
      if (getFilteredNPV(r) <= 0) {
        results.delayMonths = delay - 3;
        break;
      }
    }
    return results;
  }, [project, selectedPhases]);

  const sections = [
    { key: "compare", label: ar?"مقارنة السيناريوهات":"Scenario Comparison" },
    { key: "sensitivity", label: ar?"جدول الحساسية":"Sensitivity Table" },
    { key: "breakeven", label: ar?"تحليل نقطة التعادل":"Break-Even Analysis" },
    { key: "tornado", label: ar?"مخطط التأثير":"Tornado Chart" },
    { key: "goalseek", label: ar?"🎯 البحث عن الهدف":"🎯 Goal Seeker" },
    { key: "optimizer", label: ar?"المحسّن":"Optimizer" },
  ];

  // Empty state — rendered AFTER all hooks (React rules of hooks)
  if (_isEmpty) return (
    <EmptyState
      icon="🔀"
      title={lang === "ar" ? "لا توجد سيناريوهات بعد" : "No Scenarios Yet"}
      subtitle={lang === "ar" ? "أنشئ سيناريوهات لمقارنة افتراضات مختلفة. أضف أصولاً من تبويب البرنامج أولاً." : "Create scenarios to compare different assumptions. Add assets from the Program tab first."}
    />
  );

  return (<div>
    {/* Sub-nav — Apple segmented control */}
    <div style={{ marginBottom: 14, overflowX: "auto" }}>
      <SegmentedControl
        value={activeSection}
        onChange={setActiveSection}
        options={sections.map(s => ({ value: s.key, label: s.label }))}
      />
    </div>
    <div style={{ marginBottom: 14 }}>
      <HelpLink
        contentKey="scenarioAnalysis"
        lang={lang}
        onOpen={setEduModal}
        label={ar ? "كيف أستخدم تحليل السيناريوهات؟" : "How to use Scenario Analysis?"}
      />
    </div>

    {/* Phase filter */}
    {phaseNames.length > 1 && (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          {lang === "ar" ? "اختر المراحل للتحليل" : "Select phases for analysis"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button
            variant={selectedPhases.length === 0 ? "primary" : "secondary"}
            size="xs"
            onClick={() => setSelectedPhases([])}
          >
            {lang === "ar" ? "الكل" : "All"}
          </Button>
          {phaseNames.map(p => (
            <Button
              key={p}
              variant={activePh.includes(p) && selectedPhases.length > 0 ? "tinted" : "secondary"}
              size="xs"
              onClick={() => togglePhase(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
    )}

    {/* ── Scenario Comparison ── */}
    {activeSection === "compare" && (
      <div style={{background:"var(--surface-1)",borderRadius:10,border:"1px solid var(--hairline)",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--hairline)",fontSize:13,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-0.01em"}}>
          {lang==="ar"?"مقارنة 8 سيناريوهات":"8 Scenario Comparison"}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{...tblStyle,fontSize:11}}>
            <thead><tr>
              <th style={{...thSt,minWidth:130,position:"sticky",left:0,background:"var(--surface-2)",zIndex:2}}>{lang==="ar"?"المؤشر":"Metric"}</th>
              {scenarioResults.map((s,i) => <th key={i} style={{...thSt,textAlign:"right",minWidth:100}}>{s.name}</th>)}
            </tr></thead>
            <tbody>
              {[
                { label: lang==="ar"?"إجمالي التكاليف":"Total CAPEX", fn: s => getScenarioData(s).totalCapex, fmt: v => fmt(v), color: "var(--sys-red)", tip:"إجمالي البناء + غير مباشرة + طوارئ\nAll construction + soft costs + contingency" },
                { label: lang==="ar"?"إجمالي الإيرادات":"Total Income", fn: s => getScenarioData(s).totalIncome, fmt: v => fmt(v), color: "var(--sys-green)", tip:"مجموع الإيرادات خلال كامل فترة النموذج\nTotal revenue over entire projection period" },
                { label: ar?"IRR قبل التمويل":"Unlevered IRR", fn: s => getScenarioData(s).irr, fmt: v => v !== null ? fmtPct(v*100) : "N/A", color: "var(--sys-blue)", tip:"معدل العائد بدون تمويل. فوق 12% قوي\nReturn ignoring debt. Above 12% is strong" },
                { label: "NPV @10%", fn: s => getScenarioData(s).npv10, fmt: v => fmtM(v), color: "var(--sys-teal)", tip:"القيمة الحالية بخصم 10%. موجب = يخلق قيمة\nPresent value at 10% discount. Positive = value-creating" },
                { label: "NPV @12%", fn: s => getScenarioData(s).npv12, fmt: v => fmtM(v), tip:"القيمة الحالية بخصم 12%\nPresent value at 12% discount rate" },
                ...(!isFiltered?[{ label: "Levered IRR", fn: s => s.financing?.leveredIRR, fmt: v => v !== null && v !== undefined ? fmtPct(v*100) : "—", color: "var(--sys-indigo)", tip:"معدل العائد بعد التمويل\nReturn after debt service" }]:[]),
                { label: lang==="ar"?"صافي التدفق":"Total Net CF", fn: s => getScenarioData(s).totalNetCF, fmt: v => fmtM(v), tip:"صافي التدفق = إيرادات - تكاليف - إيجار أرض\nNet CF = Income - CAPEX - Land Rent" },
                ...(!isFiltered?[
                  { label: ar?"عائد الممول":"Financier IRR", fn: s => s.waterfall?.lpIRR, fmt: v => v !== null && v !== undefined ? fmtPct(v*100) : "—", color: "var(--sys-indigo)", tip:"معدل عائد المستثمر بعد كل الرسوم\nInvestor return after all fees" },
                  { label: ar?"مضاعف الممول":"Financier MOIC", fn: s => s.waterfall?.lpMOIC, fmt: v => v ? v.toFixed(2)+"x" : "—", tip:"مضاعف رأس مال المستثمر. 2x = ضعّف فلوسه\nInvestor multiple. 2x = doubled money" },
                ]:[]),
              ].map((metric, mi) => {
                const baseVal = metric.fn(scenarioResults[0]);
                return (
                  <tr key={mi} style={mi%2===0?{}:{background:"var(--surface-2)"}}>
                    <td style={{...tdSt,position:"sticky",left:0,background:mi%2===0?"var(--surface-1)":"var(--surface-2)",zIndex:1,fontWeight:600,fontSize:11}}>{metric.tip?<Tip text={metric.tip}>{metric.label}</Tip>:metric.label}</td>
                    {scenarioResults.map((s, si) => {
                      const val = metric.fn(s);
                      const isBase = si === 0;
                      const isBetter = typeof val === "number" && typeof baseVal === "number" && val > baseVal;
                      const isWorse = typeof val === "number" && typeof baseVal === "number" && val < baseVal;
                      return (
                        <td key={si} style={{...tdN,fontSize:11,fontWeight:isBase?700:400,
                          color: isBase ? (metric.color || "var(--text-primary)") : isBetter ? "var(--sys-green)" : isWorse ? "var(--sys-red)" : "var(--text-secondary)",
                          background: isBase ? "color-mix(in srgb, var(--sys-blue) 10%, transparent)" : undefined }}>
                          {metric.fmt(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"10px 16px",fontSize:10,color:"var(--text-tertiary)",borderTop:"1px solid var(--hairline)"}}>
          {lang==="ar"?"الأزرق = الحالة الأساسية | الأخضر = أفضل | الأحمر = أسوأ":"Blue = Base Case | Green = Better than base | Red = Worse than base"}
        </div>
      </div>
    )}

    {/* ── Sensitivity Table ── */}
    {activeSection === "sensitivity" && (
      <div>
        <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,letterSpacing:"-0.01em"}}>{lang==="ar"?"المحور العمودي (الصفوف)":"Row Variable"}</div>
            <select value={sensRow} onChange={e => setSensRow(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid var(--hairline)",fontSize:12,background:"var(--surface-1)",color:"var(--text-primary)",fontFamily:"inherit"}}>
              {sensParams.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,letterSpacing:"-0.01em"}}>{lang==="ar"?"المحور الأفقي (الأعمدة)":"Column Variable"}</div>
            <select value={sensCol} onChange={e => setSensCol(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid var(--hairline)",fontSize:12,background:"var(--surface-1)",color:"var(--text-primary)",fontFamily:"inherit"}}>
              {sensParams.filter(p => p.key !== sensRow).map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* IRR Sensitivity */}
        <div style={{background:"var(--surface-1)",borderRadius:10,border:"1px solid var(--hairline)",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--hairline)",fontSize:13,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-0.01em"}}>
            {lang==="ar"?"حساسية العائد (Unlevered IRR)":"Unlevered IRR Sensitivity"}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{...tblStyle,fontSize:11}}>
              <thead><tr>
                <th style={{...thSt,background:"var(--text-primary)",color:"var(--surface-1)",minWidth:100,textTransform:"none",letterSpacing:0}}>{rowParam.label} \ {colParam.label}</th>
                {colParam.steps.map((s, i) => <th key={i} style={{...thSt,textAlign:"center",background:s===0?"var(--sys-blue)":"var(--text-primary)",color:"var(--surface-1)",minWidth:80,textTransform:"none",letterSpacing:0}}>{(colParam.base + s).toFixed(colParam.decimals??(colParam.steps.some(st=>st%1!==0)?1:colParam.base<10?2:0))}</th>)}
              </tr></thead>
              <tbody>
                {sensTable.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{...tdSt,fontWeight:600,background:rowParam.steps[ri]===0?"color-mix(in srgb, var(--sys-blue) 14%, transparent)":"var(--surface-2)",fontSize:11,color:"var(--text-primary)"}}>
                      {(rowParam.base + rowParam.steps[ri]).toFixed(rowParam.decimals??(rowParam.steps.some(st=>st%1!==0)?1:rowParam.base<10?2:0))}
                    </td>
                    {row.map((cell, ci) => {
                      const isBase = rowParam.steps[ri] === 0 && colParam.steps[ci] === 0;
                      const irr = cell.irr;
                      const bg = isBase
                        ? "color-mix(in srgb, var(--sys-blue) 18%, transparent)"
                        : irr === null
                          ? "var(--surface-2)"
                          : irr >= 0.15
                            ? "color-mix(in srgb, var(--sys-green) 14%, transparent)"
                            : irr >= 0.10
                              ? "color-mix(in srgb, var(--sys-yellow, #FFCC00) 18%, transparent)"
                              : irr >= 0
                                ? "color-mix(in srgb, var(--sys-orange) 14%, transparent)"
                                : "color-mix(in srgb, var(--sys-red) 12%, transparent)";
                      const fg = irr === null
                        ? "var(--text-tertiary)"
                        : irr >= 0.15
                          ? "var(--sys-green)"
                          : irr >= 0.10
                            ? "color-mix(in srgb, var(--sys-orange) 80%, black)"
                            : irr >= 0
                              ? "var(--sys-orange)"
                              : "var(--sys-red)";
                      return <td key={ci} style={{...tdN,background:bg,color:fg,fontWeight:isBase?700:500,fontSize:11}}>
                        {irr !== null ? fmtPct(irr * 100) : "N/A"}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:"8px 16px",fontSize:10,color:"var(--text-tertiary)",lineHeight:1.5}}>
            {lang==="ar"?"أخضر ≥15% | أصفر ≥10% | برتقالي ≥0% | أحمر < 0% | أزرق = الحالة الأساسية":"Green ≥15% | Yellow ≥10% | Orange ≥0% | Red <0% | Blue = Base Case"}
          </div>
        </div>

        {/* NPV Sensitivity */}
        <div style={{background:"var(--surface-1)",borderRadius:10,border:"1px solid var(--hairline)",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid var(--hairline)",fontSize:13,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-0.01em"}}>
            {lang==="ar"?"حساسية القيمة الحالية (NPV @10%)":"NPV @10% Sensitivity"}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{...tblStyle,fontSize:11}}>
              <thead><tr>
                <th style={{...thSt,background:"var(--text-primary)",color:"var(--surface-1)",minWidth:100,textTransform:"none",letterSpacing:0}}>{rowParam.label} \ {colParam.label}</th>
                {colParam.steps.map((s, i) => <th key={i} style={{...thSt,textAlign:"center",background:s===0?"var(--sys-blue)":"var(--text-primary)",color:"var(--surface-1)",minWidth:80,textTransform:"none",letterSpacing:0}}>{(colParam.base + s).toFixed(colParam.decimals??(colParam.steps.some(st=>st%1!==0)?1:colParam.base<10?2:0))}</th>)}
              </tr></thead>
              <tbody>
                {sensTable.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{...tdSt,fontWeight:600,background:rowParam.steps[ri]===0?"color-mix(in srgb, var(--sys-blue) 14%, transparent)":"var(--surface-2)",fontSize:11,color:"var(--text-primary)"}}>
                      {(rowParam.base + rowParam.steps[ri]).toFixed(rowParam.decimals??(rowParam.steps.some(st=>st%1!==0)?1:rowParam.base<10?2:0))}
                    </td>
                    {row.map((cell, ci) => {
                      const isBase = rowParam.steps[ri] === 0 && colParam.steps[ci] === 0;
                      const npv = cell.npv;
                      const bg = isBase
                        ? "color-mix(in srgb, var(--sys-blue) 18%, transparent)"
                        : npv > 0
                          ? "color-mix(in srgb, var(--sys-green) 14%, transparent)"
                          : "color-mix(in srgb, var(--sys-red) 12%, transparent)";
                      const fg = npv > 0 ? "var(--sys-green)" : "var(--sys-red)";
                      return <td key={ci} style={{...tdN,background:bg,color:fg,fontWeight:isBase?700:500,fontSize:11}}>
                        {fmtM(npv)}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* ── Break-Even Analysis ── */}
    {activeSection === "breakeven" && (
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:14}}>
          {/* Occupancy break-even */}
          <div style={{background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--hairline)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontWeight:600}}>
              <Tip text={"أقل نسبة إشغال تخلي NPV موجب. تحتها المشروع يخسر قيمة\nMinimum occupancy where NPV stays positive. Below this, project loses value"}>{lang==="ar"?"نقطة تعادل الإشغال":"Occupancy Break-Even"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.occupancy?"var(--sys-orange)":"var(--sys-green)",letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
              {breakeven.occupancy ? breakeven.occupancy + "%" : "> 0%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6,lineHeight:1.45}}>
              {lang==="ar"?"الحد الأدنى للإشغال لتحقيق NPV@10% موجب":"Min occupancy for positive NPV@10%"}
            </div>
            <div style={{marginTop:12,height:6,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:(breakeven.occupancy||5)+"%",background:breakeven.occupancy>70?"var(--sys-red)":breakeven.occupancy>50?"var(--sys-orange)":"var(--sys-green)",borderRadius:3,transition:"width 0.3s var(--ease-quart)"}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text-tertiary)",marginTop:4,fontVariantNumeric:"tabular-nums"}}>
              <span>0%</span><span>{lang==="ar"?"الحالي: ":"Current: "}~{Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1))}%</span><span>100%</span>
            </div>
          </div>

          {/* Rent drop tolerance */}
          <div style={{background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--hairline)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontWeight:600}}>
              <Tip text={"أقصى انخفاض بالإيجار قبل ما يصير NPV سالب\nMaximum rent decrease before NPV turns negative"}>{lang==="ar"?"تحمل انخفاض الإيجار":"Rent Drop Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.rentDrop?"var(--sys-orange)":"var(--sys-green)",letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
              {breakeven.rentDrop ? "-" + breakeven.rentDrop + "%" : "> -100%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6,lineHeight:1.45}}>
              {lang==="ar"?"أقصى انخفاض في الإيجارات مع بقاء NPV@10% موجب":"Max rent reduction keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:6,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,breakeven.rentDrop||100)+"%",background:breakeven.rentDrop<15?"var(--sys-red)":breakeven.rentDrop<30?"var(--sys-orange)":"var(--sys-green)",borderRadius:3}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text-tertiary)",marginTop:4}}>
              <span>{lang==="ar"?"مخاطرة عالية":"High Risk"}</span><span>{lang==="ar"?"هامش أمان":"Safety Margin"}</span>
            </div>
          </div>

          {/* CAPEX increase tolerance */}
          <div style={{background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--hairline)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontWeight:600}}>
              <Tip text={"أقصى زيادة بالتكاليف قبل ما يصير NPV سالب\nMaximum cost overrun before NPV turns negative"}>{lang==="ar"?"تحمل زيادة التكاليف":"CAPEX Increase Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.capexIncrease?"var(--sys-orange)":"var(--sys-green)",letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
              {breakeven.capexIncrease ? "+" + breakeven.capexIncrease + "%" : "> +100%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6,lineHeight:1.45}}>
              {lang==="ar"?"أقصى زيادة في التكاليف مع بقاء NPV@10% موجب":"Max CAPEX increase keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:6,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,breakeven.capexIncrease||100)+"%",background:breakeven.capexIncrease<15?"var(--sys-red)":breakeven.capexIncrease<30?"var(--sys-orange)":"var(--sys-green)",borderRadius:3}} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text-tertiary)",marginTop:4}}>
              <span>{lang==="ar"?"مخاطرة عالية":"High Risk"}</span><span>{lang==="ar"?"هامش أمان":"Safety Margin"}</span>
            </div>
          </div>

          {/* Finance rate tolerance (only for debt modes) */}
          {project.finMode !== "self" && <div style={{background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--hairline)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontWeight:600}}>
              <Tip text={"أعلى معدل ربح بنكي قبل ما يصير العائد سالب\nMaximum finance rate before levered IRR turns negative"}>{lang==="ar"?"تحمل ارتفاع الفائدة":"Finance Rate Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.financeRate?"var(--sys-orange)":"var(--sys-green)",letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
              {breakeven.financeRate ? breakeven.financeRate.toFixed(1) + "%" : "> 25%"}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6,lineHeight:1.45}}>
              {lang==="ar"?`الحالي: ${project.financeRate??6.5}% · هامش: ${breakeven.financeRateMargin ? "+"+breakeven.financeRateMargin.toFixed(1)+"%" : "واسع"}`:`Current: ${project.financeRate??6.5}% · Margin: ${breakeven.financeRateMargin ? "+"+breakeven.financeRateMargin.toFixed(1)+"%" : "wide"}`}
            </div>
            <div style={{marginTop:12,height:6,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,(breakeven.financeRateMargin||20)*5)+"%",background:(breakeven.financeRateMargin||20)<3?"var(--sys-red)":(breakeven.financeRateMargin||20)<6?"var(--sys-orange)":"var(--sys-green)",borderRadius:3}} />
            </div>
          </div>}

          {/* Delay tolerance */}
          <div style={{background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--hairline)",padding:20}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontWeight:600}}>
              <Tip text={"أقصى تأخير بالبناء قبل ما يصير NPV سالب\nMaximum construction delay before NPV turns negative"}>{lang==="ar"?"تحمل التأخير":"Delay Tolerance"}</Tip>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:breakeven.delayMonths?"var(--sys-orange)":"var(--sys-green)",letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
              {breakeven.delayMonths != null ? breakeven.delayMonths + (lang==="ar"?" شهر":" mo") : "> 36" + (lang==="ar"?" شهر":" mo")}
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6,lineHeight:1.45}}>
              {lang==="ar"?"أقصى تأخير في البناء مع بقاء NPV@10% موجب":"Max construction delay keeping NPV@10% positive"}
            </div>
            <div style={{marginTop:12,height:6,background:"var(--surface-3)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.min(100,((breakeven.delayMonths||36)/36)*100)+"%",background:(breakeven.delayMonths||36)<6?"var(--sys-red)":(breakeven.delayMonths||36)<12?"var(--sys-orange)":"var(--sys-green)",borderRadius:3}} />
            </div>
          </div>
        </div>
        <div style={{background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--hairline)",padding:18,marginTop:16}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:"var(--text-primary)",letterSpacing:"-0.01em"}}>{lang==="ar"?"ملخص المخاطر":"Risk Summary"}</div>
          <table style={{...tblStyle,fontSize:12}}>
            <thead><tr>
              <th style={thSt}>{lang==="ar"?"المتغير":"Variable"}</th>
              <th style={{...thSt,textAlign:"center"}}><Tip text={"القيمة اللي عندها NPV يصير صفر\nValue where NPV becomes zero"}>{lang==="ar"?"نقطة التعادل":"Break-Even"}</Tip></th>
              <th style={{...thSt,textAlign:"center"}}>{lang==="ar"?"القيمة الحالية":"Current Value"}</th>
              <th style={{...thSt,textAlign:"center"}}><Tip text={"الفرق بين الوضع الحالي ونقطة التعادل. أكبر = أأمن\nGap between current and break-even. Larger = safer"}>{lang==="ar"?"هامش الأمان":"Safety Margin"}</Tip></th>
              <th style={{...thSt,textAlign:"center"}}><Tip text={"منخفض = هامش أمان كبير. مرتفع = قريب من نقطة التعادل\nLow = large safety margin. High = close to break-even"}>{lang==="ar"?"التقييم":"Assessment"}</Tip></th>
            </tr></thead>
            <tbody>
              {[
                {
                  label: lang==="ar"?"الإشغال":"Occupancy",
                  be: breakeven.occupancy ? breakeven.occupancy+"%" : "< 5%",
                  current: Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1))+"%",
                  margin: breakeven.occupancy ? (Math.round((project.assets||[]).reduce((s,a)=>s+(a.stabilizedOcc||100),0)/(project.assets.length||1)) - breakeven.occupancy) + " pts" : "Wide",
                  risk: !breakeven.occupancy || breakeven.occupancy < 50 ? "low" : breakeven.occupancy < 70 ? "med" : "high",
                },
                {
                  label: lang==="ar"?"انخفاض الإيجار":"Rent Reduction",
                  be: breakeven.rentDrop ? "-"+breakeven.rentDrop+"%" : "> 100%",
                  current: "Base (0%)",
                  margin: breakeven.rentDrop ? breakeven.rentDrop+"%" : "> 100%",
                  risk: !breakeven.rentDrop || breakeven.rentDrop > 30 ? "low" : breakeven.rentDrop > 15 ? "med" : "high",
                },
                {
                  label: lang==="ar"?"زيادة التكاليف":"CAPEX Increase",
                  be: breakeven.capexIncrease ? "+"+breakeven.capexIncrease+"%" : "> 100%",
                  current: "Base (0%)",
                  margin: breakeven.capexIncrease ? breakeven.capexIncrease+"%" : "> 100%",
                  risk: !breakeven.capexIncrease || breakeven.capexIncrease > 30 ? "low" : breakeven.capexIncrease > 15 ? "med" : "high",
                },
                ...(project.finMode !== "self" ? [{
                  label: lang==="ar"?"معدل الربح":"Finance Rate",
                  be: breakeven.financeRate ? breakeven.financeRate.toFixed(1)+"%" : "> 25%",
                  current: (project.financeRate??6.5)+"%",
                  margin: breakeven.financeRateMargin ? "+"+breakeven.financeRateMargin.toFixed(1)+"%" : "> 18%",
                  risk: !breakeven.financeRateMargin || breakeven.financeRateMargin > 6 ? "low" : breakeven.financeRateMargin > 3 ? "med" : "high",
                }] : []),
                {
                  label: lang==="ar"?"تأخير البناء":"Construction Delay",
                  be: breakeven.delayMonths != null ? breakeven.delayMonths+(lang==="ar"?" شهر":" mo") : "> 36"+(lang==="ar"?" شهر":" mo"),
                  current: lang==="ar"?"بدون تأخير":"No delay",
                  margin: breakeven.delayMonths != null ? breakeven.delayMonths+(lang==="ar"?" شهر":" mo") : "> 36"+(lang==="ar"?" شهر":" mo"),
                  risk: breakeven.delayMonths == null || breakeven.delayMonths > 18 ? "low" : breakeven.delayMonths > 9 ? "med" : "high",
                },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{...tdSt,fontWeight:600}}>{r.label}</td>
                  <td style={{...tdSt,textAlign:"center"}}>{r.be}</td>
                  <td style={{...tdSt,textAlign:"center"}}>{r.current}</td>
                  <td style={{...tdSt,textAlign:"center",fontWeight:600}}>{r.margin}</td>
                  <td style={{...tdSt,textAlign:"center"}}>
                    <span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,
                      background:r.risk==="low"?"color-mix(in srgb, var(--sys-green) 14%, transparent)":r.risk==="med"?"color-mix(in srgb, var(--sys-orange) 14%, transparent)":"color-mix(in srgb, var(--sys-red) 12%, transparent)",
                      color:r.risk==="low"?"var(--sys-green)":r.risk==="med"?"var(--sys-orange)":"var(--sys-red)"}}>
                      {r.risk==="low"?(lang==="ar"?"مخاطر منخفضة":"LOW RISK"):r.risk==="med"?(lang==="ar"?"مخاطر متوسطة":"MEDIUM"):lang==="ar"?"مخاطر مرتفعة":"HIGH RISK"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    {/* ═══ TORNADO CHART ═══ */}
    {activeSection === "tornado" && (() => {
      const metricOpts = [
        { k:"irr", l:ar?"IRR المشروع":"Project IRR" },
        { k:"npv10", l:ar?"القيمة الحالية @10%":"NPV @10%" },
        { k:"leveredIRR", l:ar?"IRR بعد التمويل":"Levered IRR" },
        { k:"lpIRR", l:ar?"IRR الممول":"Financier IRR" },{ k:"gpIRR", l:ar?"IRR المطور":"Developer IRR" },
        { k:"lpMOIC", l:ar?"مضاعف الممول":"Financier MOIC" },{ k:"gpMOIC", l:ar?"مضاعف المطور":"Developer MOIC" },
        { k:"minDSCR", l:ar?"أقل DSCR":"Min DSCR" },
      ];
      const extractM = (s, mk) => {
        if (!s) return null;
        const c = s.results?.consolidated;
        if (mk==="irr") return c?.irr;
        if (mk==="npv10") return c?.npv10;
        if (mk==="leveredIRR") return s.financing?.leveredIRR;
        if (mk==="lpIRR") return s.waterfall?.lpIRR;
        if (mk==="gpIRR") return s.waterfall?.gpIRR;
        if (mk==="lpMOIC") return s.waterfall?.lpMOIC;
        if (mk==="gpMOIC") return s.waterfall?.gpMOIC;
        if (mk==="minDSCR") { const d=(s.financing?.dscr||[]).filter(v=>v!=null&&v>0); return d.length?Math.min(...d):null; }
        return null;
      };
      const fmtMV = (v,mk) => v==null?'-':['irr','leveredIRR','lpIRR','gpIRR'].includes(mk)?fmtPct(v):(mk.includes('MOIC')||mk==='minDSCR')?(v?.toFixed(2)+'x'):fmtM(v);
      const runTornado = () => {
        setTornadoLoading(true);
        setTimeout(() => {
          const params = [
            { key:"costPerSqm", l:ar?"تكلفة البناء/م²":"Build Cost/m²", loMult:0.85, hiMult:1.15, isAsset:true },
            { key:"leaseRate", l:ar?"سعر الإيجار/م²":"Lease Rate/m²", loMult:0.85, hiMult:1.15, isAsset:true },
            { key:"stabilizedOcc", l:ar?"الإشغال":"Occupancy", loDelta:-10, hiDelta:10, isAsset:true },
            { key:"constrDuration", l:ar?"مدة البناء":"Build Duration", loDelta:-6, hiDelta:6, isAsset:true },
            { key:"rentEscalation", l:ar?"زيادة الإيجار":"Rent Escalation", loMult:0.5, hiMult:1.5 },
            { key:"softCostPct", l:ar?"تكاليف لينة":"Soft Cost", loMult:0.5, hiMult:1.5 },
            { key:"contingencyPct", l:ar?"احتياطي":"Contingency", loMult:0.5, hiMult:1.5 },
            { key:"landRentAnnual", l:ar?"إيجار الأرض":"Land Rent", loMult:0.8, hiMult:1.2 },
            { key:"maxLtvPct", l:"LTV %", loDelta:-10, hiDelta:10 },
            { key:"financeRate", l:ar?"معدل التمويل":"Finance Rate", loDelta:-2, hiDelta:2 },
            { key:"exitYear", l:ar?"سنة التخارج":"Exit Year", loDelta:-2, hiDelta:2 },
            { key:"exitMultiple", l:ar?"مضاعف التخارج":"Exit Multiple", loMult:0.8, hiMult:1.2 },
            { key:"prefReturnPct", l:ar?"العائد المفضل":"Pref Return", loDelta:-3, hiDelta:3 },
          ];
          const base = runScenario(project, { activeScenario:"Base Case" });
          const baseVal = extractM(base, tornadoMetric);
          const rows = params.map(p => {
            const mkOverride = (delta) => {
              if (p.isAsset) {
                const assets = (project.assets||[]).map(a => {
                  const v = a[p.key]||0;
                  const nv = p.loMult!==undefined ? v*delta : v+delta;
                  return { ...a, [p.key]: Math.max(0, nv) };
                });
                return { assets, activeScenario:"Base Case" };
              }
              const v = project[p.key]||0;
              const nv = p.loMult!==undefined ? v*delta : v+delta;
              return { [p.key]: Math.max(0, nv), activeScenario:"Base Case" };
            };
            try {
              const loRun = runScenario(project, mkOverride(p.loMult!==undefined?p.loMult:p.loDelta));
              const hiRun = runScenario(project, mkOverride(p.hiMult!==undefined?p.hiMult:p.hiDelta));
              const loVal = extractM(loRun, tornadoMetric);
              const hiVal = extractM(hiRun, tornadoMetric);
              return { ...p, loVal, hiVal, spread: Math.abs((hiVal||0)-(loVal||0)) };
            } catch { return { ...p, loVal:null, hiVal:null, spread:0 }; }
          }).filter(r=>r.spread>0).sort((a,b)=>b.spread-a.spread);
          setTornadoData({ baseVal, rows });
          setTornadoLoading(false);
        }, 50);
      };
      const maxSpread = tornadoData?.rows?.[0]?.spread || 1;
      return <div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            {ar ? "المقياس المستهدف:" : "Target Metric:"}
          </span>
          <Select value={tornadoMetric} onChange={e => setTornadoMetric(e.target.value)} style={{ width: 200 }}>
            {metricOpts.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
          </Select>
          <Button variant="primary" size="sm" onClick={runTornado} disabled={tornadoLoading}>
            {tornadoLoading ? (ar ? "جاري التحليل..." : "Analyzing...") : (ar ? "▶ تحليل" : "▶ Run")}
          </Button>
        </div>
        {tornadoData && <Card>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
            {ar ? "القيمة الأساسية:" : "Base value:"} <strong style={{ color: "var(--text-primary)" }}>{fmtMV(tornadoData.baseVal, tornadoMetric)}</strong>
          </div>
          {tornadoData.rows.map((r,i) => {
            const pctLo = r.spread>0 ? Math.abs((r.loVal||0)-tornadoData.baseVal)/maxSpread*100 : 0;
            const pctHi = r.spread>0 ? Math.abs((r.hiVal||0)-tornadoData.baseVal)/maxSpread*100 : 0;
            const loGood = (r.loVal||0)>(tornadoData.baseVal||0);
            const hiGood = (r.hiVal||0)>(tornadoData.baseVal||0);
            return <div key={r.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,fontSize:11}}>
              <div style={{width:130,textAlign:"right",color:"var(--text-secondary)",fontWeight:500,flexShrink:0}}>{r.l}</div>
              <div style={{flex:1,display:"flex",alignItems:"center",height:22}}>
                <div style={{flex:1,display:"flex",justifyContent:"flex-end"}}><div style={{height:18,borderRadius:3,background:loGood?"var(--sys-green)":"var(--sys-red)",width:pctLo+"%",minWidth:pctLo>0?2:0,transition:"width 0.3s var(--ease-quart)"}} /></div>
                <div style={{width:1,height:22,background:"var(--text-primary)",margin:"0 2px",flexShrink:0,opacity:0.5}} />
                <div style={{flex:1}}><div style={{height:18,borderRadius:3,background:hiGood?"var(--sys-green)":"var(--sys-red)",width:pctHi+"%",minWidth:pctHi>0?2:0,transition:"width 0.3s var(--ease-quart)"}} /></div>
              </div>
              <div style={{ width: 80, fontSize: 10, color: "var(--text-secondary)", textAlign: "center" }}>
                {fmtMV(r.loVal, tornadoMetric)} — {fmtMV(r.hiVal, tornadoMetric)}
              </div>
            </div>;
          })}
        </Card>}
      </div>;
    })()}

    {/* ═══ GOAL SEEKER ═══ */}
    {activeSection === "goalseek" && (() => {
      const metricOpts = [
        { k:"irr", l:ar?"IRR المشروع":"Project IRR", pct:true },
        { k:"leveredIRR", l:ar?"IRR بعد التمويل":"Levered IRR", pct:true },
        { k:"lpIRR", l:ar?"IRR الممول":"Financier IRR", pct:true },{ k:"gpIRR", l:ar?"IRR المطور":"Developer IRR", pct:true },
        { k:"lpMOIC", l:ar?"مضاعف الممول":"Financier MOIC" },{ k:"minDSCR", l:ar?"أقل DSCR":"Min DSCR" },
        { k:"npv10", l:"NPV @10%" },
      ];
      const varOpts = [
        { k:"leaseRate", l:ar?"سعر الإيجار/م²":"Lease Rate/m²", isAsset:true },
        { k:"costPerSqm", l:ar?"تكلفة البناء/م²":"Build Cost/m²", isAsset:true },
        { k:"stabilizedOcc", l:ar?"الإشغال %":"Occupancy %", isAsset:true },
        { k:"maxLtvPct", l:"LTV %" },{ k:"financeRate", l:ar?"معدل التمويل":"Finance Rate" },
        { k:"exitMultiple", l:ar?"مضاعف التخارج":"Exit Multiple" },
        { k:"exitYear", l:ar?"سنة التخارج":"Exit Year" },
        { k:"prefReturnPct", l:ar?"العائد المفضل":"Pref Return" },
        { k:"carryPct", l:ar?"الحافز":"Carry %" },{ k:"exitCapRate", l:"Exit Cap Rate" },
      ];
      const extractM = (s, mk) => {
        if (!s) return null; const c=s.results?.consolidated;
        if (mk==="irr") return c?.irr; if (mk==="npv10") return c?.npv10;
        if (mk==="leveredIRR") return s.financing?.leveredIRR;
        if (mk==="lpIRR") return s.waterfall?.lpIRR; if (mk==="gpIRR") return s.waterfall?.gpIRR;
        if (mk==="lpMOIC") return s.waterfall?.lpMOIC;
        if (mk==="minDSCR") { const d=(s.financing?.dscr||[]).filter(v=>v!=null&&v>0); return d.length?Math.min(...d):null; }
        return null;
      };
      const runGoalSeek = () => {
        setGsLoading(true); setGsResult(null);
        setTimeout(() => {
          const vOpt = varOpts.find(v=>v.k===gsVariable);
          const isPct = metricOpts.find(m=>m.k===gsMetric)?.pct;
          const target = isPct ? gsTarget/100 : gsTarget;
          const getCurrent = () => vOpt?.isAsset ? ((project.assets||[])[0]?.[gsVariable]||0) : (project[gsVariable]||0);
          const current = getCurrent();
          let lo = current*0.1||0.1, hi = current*3||100;
          if (gsVariable==='exitYear') { lo=project.startYear+2; hi=project.startYear+20; }
          const buildOv = (val) => {
            if (vOpt?.isAsset) { return { assets:(project.assets||[]).map(a=>({...a,[gsVariable]:val})), activeScenario:"Base Case" }; }
            return { [gsVariable]:val, activeScenario:"Base Case" };
          };
          const loM = extractM(runScenario(project,buildOv(lo)),gsMetric);
          const hiM = extractM(runScenario(project,buildOv(hi)),gsMetric);
          const inc = (hiM||0)>(loM||0);
          for (let i=0;i<50;i++) {
            const mid=(lo+hi)/2;
            const midM = extractM(runScenario(project,buildOv(mid)),gsMetric);
            if (midM!=null && Math.abs(midM-target)<0.001) { setGsResult({found:true,value:mid,metric:midM,current,iter:i+1}); setGsLoading(false); return; }
            if ((inc&&(midM||0)<target)||(!inc&&(midM||0)>target)) lo=mid; else hi=mid;
          }
          const finalVal=(lo+hi)/2;
          const finalM=extractM(runScenario(project,buildOv(finalVal)),gsMetric);
          setGsResult({found:Math.abs((finalM||0)-target)<0.01,value:finalVal,metric:finalM,current,iter:50});
          setGsLoading(false);
        }, 50);
      };
      const applyGS = () => {
        if (!gsResult||!up) return;
        const vOpt = varOpts.find(v=>v.k===gsVariable);
        if (vOpt?.isAsset) { up(prev=>({...prev,assets:(prev.assets||[]).map(a=>({...a,[gsVariable]:Math.round(gsResult.value*100)/100}))})); }
        else { up({[gsVariable]:Math.round(gsResult.value*100)/100}); }
      };
      return <div style={{ maxWidth: 520 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.012em", color: "var(--text-primary)" }}>
            🎯 {ar ? "البحث عن الهدف" : "Goal Seeker"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 12, alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "var(--text-secondary)" }}>{ar ? "المقياس:" : "Metric:"}</span>
            <Select value={gsMetric} onChange={e => setGsMetric(e.target.value)}>
              {metricOpts.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
            </Select>
            <span style={{ color: "var(--text-secondary)" }}>{ar ? "القيمة المطلوبة:" : "Target:"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input
                type="number"
                value={gsTarget}
                onChange={e => setGsTarget(Number(e.target.value))}
                style={{ width: 120 }}
              />
              <span style={{ color: "var(--text-secondary)" }}>
                {metricOpts.find(m => m.k === gsMetric)?.pct ? "%" : "x"}
              </span>
            </div>
            <span style={{ color: "var(--text-secondary)" }}>{ar ? "المتغير:" : "Variable:"}</span>
            <Select value={gsVariable} onChange={e => setGsVariable(e.target.value)}>
              {varOpts.map(v => <option key={v.k} value={v.k}>{v.l}</option>)}
            </Select>
          </div>
          <Button
            variant="primary"
            size="md"
            block
            onClick={runGoalSeek}
            disabled={gsLoading}
            style={{ marginTop: 16 }}
          >
            {gsLoading ? (ar ? "جاري البحث..." : "Searching...") : (ar ? "🔍 ابحث" : "🔍 Find")}
          </Button>
          {gsResult && <div style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 10,
            background: gsResult.found ? "rgba(52,199,89,0.08)" : "rgba(255,149,0,0.08)",
            border: "1px solid " + (gsResult.found ? "rgba(52,199,89,0.25)" : "rgba(255,149,0,0.25)"),
          }}>
            <div style={{
              fontWeight: 700, fontSize: 13,
              color: gsResult.found ? "var(--sys-green)" : "var(--sys-orange)",
              marginBottom: 6,
            }}>
              {gsResult.found ? (ar ? "✅ تم العثور على القيمة" : "✅ Value Found") : (ar ? "⚠️ أقرب قيمة" : "⚠️ Closest Value")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
              <strong>{varOpts.find(v => v.k === gsVariable)?.l}:</strong> {fmt(gsResult.value)}{" "}
              <span style={{ color: "var(--text-secondary)" }}>(current: {fmt(gsResult.current)})</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 4 }}>
              {metricOpts.find(m => m.k === gsMetric)?.l}:{" "}
              {metricOpts.find(m => m.k === gsMetric)?.pct ? fmtPct(gsResult.metric) : (gsResult.metric?.toFixed(2) + "x")}
            </div>
            {up && (
              <Button variant="primary" size="sm" onClick={applyGS} style={{ marginTop: 10 }}>
                {ar ? "⚡ تطبيق" : "⚡ Apply"}
              </Button>
            )}
          </div>}
        </Card>
      </div>;
    })()}

    {/* ═══ OPTIMIZER ═══ */}
    {activeSection === "optimizer" && (() => {
      const metricOpts = [
        { k:"lpIRR", l:ar?"IRR الممول":"Financier IRR" },{ k:"gpIRR", l:ar?"IRR المطور":"Developer IRR" },{ k:"irr", l:ar?"IRR المشروع":"Project IRR" },
        { k:"minDSCR", l:ar?"أقل DSCR":"Min DSCR" },{ k:"lpMOIC", l:ar?"مضاعف الممول":"Financier MOIC" },{ k:"npv10", l:"NPV @10%" },
      ];
      const varDefs = [
        { k:"maxLtvPct", l:"LTV %", lo:0, hi:80, step:5 },
        { k:"hurdleIRR", l:ar?"عائد الحد الأدنى":"Hurdle IRR %", lo:8, hi:20, step:1 },
        { k:"exitYear", l:ar?"سنة التخارج":"Exit Year", lo:(project.startYear||2026)+3, hi:(project.startYear||2026)+15, step:1 },
        { k:"exitMultiple", l:ar?"مضاعف التخارج":"Exit Multiple", lo:6, hi:15, step:1 },
        { k:"financeRate", l:ar?"معدل التمويل":"Finance Rate %", lo:4, hi:10, step:0.5 },
        { k:"incentivePct", l:ar?"حافز الأداء":"Performance Incentive %", lo:15, hi:40, step:5 },
        { k:"exitCapRate", l:"Exit Cap Rate %", lo:5, hi:12, step:1 },
        { k:"annualMgmtFeePct", l:ar?"رسوم الإدارة":"Mgmt Fee %", lo:0.5, hi:2.0, step:0.25 },
        { k:"developerFeePct", l:ar?"رسوم المطور":"Dev Fee %", lo:7, hi:15, step:2 },
      ];
      const extractM = (s, mk) => {
        if (!s) return null; const c=s.results?.consolidated;
        if (mk==="irr") return c?.irr; if (mk==="npv10") return c?.npv10;
        if (mk==="leveredIRR") return s.financing?.leveredIRR;
        if (mk==="lpIRR") return s.waterfall?.lpIRR; if (mk==="gpIRR") return s.waterfall?.gpIRR;
        if (mk==="lpMOIC") return s.waterfall?.lpMOIC; if (mk==="gpMOIC") return s.waterfall?.gpMOIC;
        if (mk==="minDSCR") { const d=(s.financing?.dscr||[]).filter(v=>v!=null&&v>0); return d.length?Math.min(...d):null; }
        return null;
      };
      const toggleVar = k => setOptVars(prev => prev.includes(k) ? prev.filter(v=>v!==k) : prev.length<3 ? [...prev,k] : prev);
      const runOptimizer = async () => {
        setOptLoading(true); setOptResults(null); setOptProgress(0); optCancelRef.current=false;
        const selected = varDefs.filter(v=>optVars.includes(v.k));
        if (selected.length===0) { setOptLoading(false); return; }
        // Generate combinations
        const ranges = selected.map(v => { const r=[]; for(let x=v.lo;x<=v.hi;x+=v.step) r.push(Math.round(x*100)/100); return r; });
        let combos = ranges[0].map(v=>[v]);
        for (let i=1;i<ranges.length;i++) { const next=[]; for(const c of combos) for(const v of ranges[i]) next.push([...c,v]); combos=next; }
        if (combos.length>500) { const step=Math.ceil(combos.length/500); combos=combos.filter((_,i)=>i%step===0); }
        const total=combos.length;
        const allResults=[];
        const BATCH=30;
        for(let b=0;b<combos.length;b+=BATCH) {
          if(optCancelRef.current) break;
          const batch=combos.slice(b,b+BATCH);
          for(const combo of batch) {
            const ov={activeScenario:"Base Case"};
            selected.forEach((v,i)=>ov[v.k]=combo[i]);
            try {
              const s=runScenario(project,ov);
              const row={};
              selected.forEach((v,i)=>row[v.k]=combo[i]);
              row._target=extractM(s,optMetric);
              row._irr=s.results?.consolidated?.irr;
              row._levIRR=s.financing?.leveredIRR;
              row._lpIRR=s.waterfall?.lpIRR; row._gpIRR=s.waterfall?.gpIRR;
              row._lpMOIC=s.waterfall?.lpMOIC; row._gpMOIC=s.waterfall?.gpMOIC;
              row._minDSCR=extractM(s,"minDSCR");
              if(row._target!=null) allResults.push(row);
            } catch {}
          }
          setOptProgress(Math.min(b+BATCH,total));
          await new Promise(r=>setTimeout(r,0));
        }
        allResults.sort((a,b)=>(b._target||0)-(a._target||0));
        // Labels
        const top10=allResults.slice(0,10);
        const best=top10[0]; const safest=top10.sort((a,b)=>(b._minDSCR||0)-(a._minDSCR||0))[0];
        const bestGP=top10.sort((a,b)=>(b._gpIRR||0)-(a._gpIRR||0))[0];
        const balanced=top10.sort((a,b)=>((b._irr||0)*(b._minDSCR||0))-((a._irr||0)*(a._minDSCR||0)))[0];
        allResults.sort((a,b)=>(b._target||0)-(a._target||0));
        setOptResults({all:allResults.slice(0,20),total,best,safest,bestGP,balanced,selected});
        setOptLoading(false);
      };
      const fmtV=(v,isPct)=>v==null?'-':isPct?fmtPct(v):(v?.toFixed(2)+'x');
      const applyOpt = (row) => { if(!up) return; const ov={}; varDefs.filter(v=>optVars.includes(v.k)).forEach(v=>{ if(row[v.k]!=null) ov[v.k]=row[v.k]; }); up(ov); };
      return <div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            {ar ? "المقياس:" : "Target:"}
          </span>
          <Select value={optMetric} onChange={e => setOptMetric(e.target.value)} style={{ width: 180 }}>
            {metricOpts.map(m => <option key={m.k} value={m.k}>{m.l}</option>)}
          </Select>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
          {ar ? "اختر المتغيرات (1-3):" : "Select variables (1-3):"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {varDefs.map(v => (
            <Button
              key={v.k}
              variant={optVars.includes(v.k) ? "primary" : "secondary"}
              size="xs"
              onClick={() => toggleVar(v.k)}
            >
              {v.l}
            </Button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="primary"
            size="md"
            onClick={runOptimizer}
            disabled={optLoading || optVars.length === 0}
          >
            {optLoading ? (ar ? `جاري التحليل ${optProgress}...` : `Analyzing ${optProgress}...`) : (ar ? "▶ تحسين" : "▶ Optimize")}
          </Button>
          {optLoading && (
            <Button variant="danger" size="md" onClick={() => { optCancelRef.current = true; }}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
          )}
        </div>
        {optLoading && (
          <div style={{ marginTop: 12, height: 6, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: "var(--sys-blue)",
              width: (optProgress / ((optResults?.total) || 1) * 100) + "%",
              transition: "width 0.2s var(--ease-quart)",
            }} />
          </div>
        )}
        {optResults && <div style={{marginTop:20}}>
          {/* Perspective labels */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginBottom:16}}>
            {[
              {r:optResults.best,   icon:"✅",l:ar?"الأفضل":"Best",         c:"var(--sys-green)"},
              {r:optResults.safest, icon:"🛡️",l:ar?"الأكثر أماناً":"Safest", c:"var(--sys-blue)"},
              {r:optResults.bestGP, icon:"💰",l:ar?"الأعلى عائد للمطور":"Best Developer",c:"var(--sys-orange)"},
              {r:optResults.balanced,icon:"⚖️",l:ar?"الأكثر توازناً":"Balanced",c:"var(--sys-indigo)"},
            ].filter(x=>x.r).map(x=><div key={x.l} style={{padding:12,borderRadius:12,background:`color-mix(in srgb, ${x.c} 8%, transparent)`,border:`1px solid color-mix(in srgb, ${x.c} 22%, transparent)`}}>
              <div style={{fontSize:12,fontWeight:700,color:x.c,marginBottom:4,letterSpacing:"-0.01em"}}>{x.icon} {x.l}</div>
              <div style={{fontSize:11,color:"var(--text-primary)"}}>{optResults.selected.map(v=><span key={v.k}>{v.l}: <strong>{x.r[v.k]}</strong> </span>)}</div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginTop:2}}>Target: {fmtV(x.r._target,['irr','leveredIRR','lpIRR','gpIRR'].includes(optMetric))} | DSCR: {x.r._minDSCR?.toFixed(2)||'-'}</div>
              {up && <button onClick={()=>applyOpt(x.r)} style={{...btnS,padding:"3px 10px",fontSize:10,marginTop:6,background:"var(--sys-blue)",color:"#fff",border:"none",borderRadius:6,fontWeight:600}}>{ar?"تطبيق":"Apply"}</button>}
            </div>)}
          </div>
          {/* Top results table */}
          <div style={{overflowX:"auto"}}>
            <table style={tblStyle}><thead><tr>
              <th style={thSt}>#</th>
              {optResults.selected.map(v=><th key={v.k} style={thSt}>{v.l}</th>)}
              <th style={thSt}>{metricOpts.find(m=>m.k===optMetric)?.l}</th>
              <th style={thSt}>DSCR</th>
              <th style={thSt}></th>
            </tr></thead><tbody>
              {optResults.all.slice(0,10).map((r,i)=><tr key={i}>
                <td style={tdN}>{i+1}</td>
                {optResults.selected.map(v=><td key={v.k} style={tdN}>{r[v.k]}</td>)}
                <td style={{...tdN,fontWeight:700,color:i===0?"var(--sys-green)":"var(--text-primary)"}}>{fmtV(r._target,['irr','leveredIRR','lpIRR','gpIRR'].includes(optMetric))}</td>
                <td style={tdN}>{r._minDSCR?.toFixed(2)||'-'}</td>
                <td style={tdSt}>{up && <button onClick={()=>applyOpt(r)} style={{...btnS,padding:"3px 10px",fontSize:10,background:"color-mix(in srgb, var(--sys-blue) 10%, transparent)",color:"var(--sys-blue)",border:"1px solid color-mix(in srgb, var(--sys-blue) 22%, transparent)",borderRadius:6,fontWeight:600}}>{ar?"تطبيق":"Apply"}</button>}</td>
              </tr>)}
            </tbody></table>
          </div>
        </div>}
      </div>;
    })()}

    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
  </div>);
}

export default ScenariosView;
