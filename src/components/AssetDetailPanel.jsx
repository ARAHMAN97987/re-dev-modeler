import React, { useState, useEffect, useRef, useMemo } from "react";
import { ASSET_TYPES } from "../data/assetTypes.js";
import { deriveAreas, getBenchmarkEfficiency, getAreaLabel } from "../data/areaBenchmarks.js";
import { computeAssetCapexBreakdown } from "../engine/cashflow.js";

// Coverage & FAR benchmarks (Saudi market — typical)
const ZONING_BENCHMARKS = {
  retail_lifestyle: { maxCoverage: 60, maxFar: 2.5 },
  mall:             { maxCoverage: 60, maxFar: 2.0 },
  office:           { maxCoverage: 50, maxFar: 5.0 },
  residential_villas:      { maxCoverage: 50, maxFar: 1.5 },
  residential_multifamily: { maxCoverage: 60, maxFar: 4.0 },
  serviced_apartments:     { maxCoverage: 55, maxFar: 5.0 },
  hotel:            { maxCoverage: 55, maxFar: 6.0 },
  resort:           { maxCoverage: 30, maxFar: 1.0 },
  marina:           { maxCoverage: 100, maxFar: 1.0 },
  yacht_club:       { maxCoverage: 40, maxFar: 1.5 },
  parking_structure: { maxCoverage: 90, maxFar: 4.0 },
};

// Typical cap rates (Saudi market) — for exit value calculation
const CAP_RATES = {
  retail_lifestyle: 8.5,
  mall:             7.5,
  office:           8.0,
  residential_villas:      7.0,
  residential_multifamily: 7.5,
  serviced_apartments:     7.0,
  hotel:            8.5,
  resort:           9.0,
  marina:           9.5,
  yacht_club:       9.0,
  parking_structure: 9.5,
};

// Number formatter with thousand separators
const fmtNum = (n) => {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
};
const fmtM = (n) => {
  if (!n || isNaN(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.round(n).toString();
};
const fmtPct = (n, dec = 1) => (n == null || isNaN(n)) ? "—" : `${n.toFixed(dec)}%`;

// Tooltip component
function Tip({ children, label }) {
  const [show, setShow] = useState(false);
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
    >
      {children}
      <span style={{ fontSize: 10, color: "#9ca3af", marginInlineStart: 3 }}>ⓘ</span>
      {show && (
        <span style={{
          position: "absolute",
          bottom: "100%",
          insetInlineStart: 0,
          marginBottom: 4,
          background: "#1f2937",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 4,
          fontSize: 10,
          whiteSpace: "normal",
          width: 220,
          zIndex: 10000,
          lineHeight: 1.5,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>
          {label}
        </span>
      )}
    </span>
  );
}

// Section with collapse/expand
function Section({ title, titleAr, lang, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: open ? "#f9fafb" : "#fff",
          border: "none",
          borderBottom: open ? "1px solid #e5e7eb" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "#1f2937",
          fontFamily: "inherit",
          textAlign: lang === "ar" ? "right" : "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#6b7280", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
          {lang === "ar" ? titleAr : title}
          {badge}
        </span>
      </button>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
}

export default function AssetDetailPanel({
  asset,
  index,
  upAsset,
  results,
  phases,
  lang,
  t,
  onClose,
  isMobile,
  project,
}) {
  if (!asset) return null;

  const isRtl = lang === "ar";
  const ar = isRtl;
  const typeInfo = ASSET_TYPES[asset.assetType] || {};

  const assetResult = results?.assetSchedules?.find(a => a.id === asset.id)
    || results?.assetSchedules?.[index];

  // Save indicator state
  const [saveFlash, setSaveFlash] = useState(false);
  const prevAssetRef = useRef(asset);
  useEffect(() => {
    if (prevAssetRef.current !== asset) {
      setSaveFlash(true);
      const id = setTimeout(() => setSaveFlash(false), 1000);
      prevAssetRef.current = asset;
      return () => clearTimeout(id);
    }
  }, [asset]);

  // Live CAPEX breakdown — recomputed on every field change
  const capexBreakdown = useMemo(() => {
    try {
      return computeAssetCapexBreakdown(asset, project || {});
    } catch { return null; }
  }, [asset, project]);

  // Derived financial metrics (per-asset KPIs)
  const kpis = useMemo(() => {
    const totalCapex = assetResult?.totalCapex || capexBreakdown?.total || 0;
    const totalRev = assetResult?.totalRevenue || 0;
    const gfa = asset.gfa || 0;
    const eff = (asset.efficiency || 0) / 100;
    const leasable = gfa * eff;

    // Annual stabilized revenue
    let annualRev = 0;
    if (asset.revType === "Lease") {
      const occ = (asset.stabilizedOcc ?? 100) / 100;
      annualRev = leasable * (asset.leaseRate || 0) * occ;
    } else if (asset.revType === "Operating") {
      annualRev = asset.opEbitda || 0;
    } else if (asset.revType === "Sale") {
      const saleEff = (asset.efficiency && asset.efficiency > 0) ? asset.efficiency : 100;
      const sellable = gfa * (saleEff / 100);
      annualRev = sellable * (asset.salePricePerSqm || 0) / Math.max(1, asset.absorptionYears || 3);
    }

    // Yield on Cost = annual stabilized rev / total cost
    const yoc = totalCapex > 0 ? (annualRev / totalCapex) * 100 : 0;

    // Cap rate from market (for exit value)
    const capRate = CAP_RATES[asset.assetType] || 8.5;

    // Exit value = stabilized NOI / cap rate (only for Lease / Operating)
    const exitValue = (asset.revType !== "Sale" && annualRev > 0)
      ? (annualRev / (capRate / 100))
      : (asset.revType === "Sale" ? (gfa * ((asset.efficiency || 100) / 100) * (asset.salePricePerSqm || 0)) : 0);

    // Development profit
    const devProfit = exitValue - totalCapex;
    const devMargin = totalCapex > 0 ? (devProfit / totalCapex) * 100 : 0;

    // Simple payback (years)
    const payback = annualRev > 0 ? totalCapex / annualRev : null;

    // Break-even lease rate (covers CAPEX in reasonable time — 10yr hurdle)
    const breakEvenRate = (asset.revType === "Lease" && leasable > 0)
      ? (totalCapex / 10) / leasable  // lease rate that pays back CAPEX in 10 years at 100% occ
      : null;

    // Revenue per m² (stabilized)
    const revPerSqm = gfa > 0 ? annualRev / gfa : 0;
    // Cost per m² (total incl. soft+contingency)
    const costPerSqmTotal = gfa > 0 ? totalCapex / gfa : 0;

    return {
      totalCapex, totalRev, annualRev, leasable,
      yoc, capRate, exitValue, devProfit, devMargin,
      payback, breakEvenRate, revPerSqm, costPerSqmTotal,
    };
  }, [asset, assetResult, capexBreakdown]);

  // Zoning validation
  const zoning = ZONING_BENCHMARKS[asset.assetType] || {};
  const derivedNow = deriveAreas(asset);
  const coverageExceeds = zoning.maxCoverage && derivedNow.coveragePct > zoning.maxCoverage;
  const farExceeds = zoning.maxFar && derivedNow.far > zoning.maxFar;

  // GFA sanity check (vs floors × footprint)
  const expectedGfa = (asset.footprint || 0) * ((asset.floorsAboveGround || 0) + (asset.basementLevels || 0));
  const gfaMismatch = expectedGfa > 0 && asset.gfa > 0 && Math.abs(asset.gfa - expectedGfa) / expectedGfa > 0.2;

  // Escape key support
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const panelStyle = {
    position: "fixed",
    top: 0,
    [isRtl ? "left" : "right"]: 0,
    width: isMobile ? "100vw" : 520,
    height: "100vh",
    background: "#f8fafc",
    borderLeft: isRtl ? "none" : "1px solid #e5e7eb",
    borderRight: isRtl ? "1px solid #e5e7eb" : "none",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
    overflowY: "auto",
    zIndex: 9995,
    direction: isRtl ? "rtl" : "ltr",
    boxSizing: "border-box",
  };

  const field = (labelEn, labelAr, value, onChange, opts = {}) => {
    const { type = "text", options, disabled, derived, hidden, suffix, tip, error, placeholder } = opts;
    if (hidden) return null;
    const displayValue = type === "number" && value != null && value !== ""
      ? (typeof value === "number" && value >= 1000 ? fmtNum(value) : value)
      : (value || "");
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, color: "#6b7280", minWidth: 130, flexShrink: 0, fontWeight: 500 }}>
            {tip ? <Tip label={tip}>{lang === "ar" ? labelAr : labelEn}</Tip> : (lang === "ar" ? labelAr : labelEn)}
            {derived && <span style={{ fontSize: 9, color: "#2EC4B6", marginInlineStart: 4, fontWeight: 600 }}>⚡{ar ? "مشتق" : "auto"}</span>}
          </label>
          {options ? (
            <select
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 6, border: error ? "1.5px solid #ef4444" : "1px solid #d1d5db", background: "#fff", fontFamily: "inherit" }}
            >
              {options.map(o => (
                <option key={o.value} value={o.value}>
                  {lang === "ar" ? (o.labelAr || o.label) : o.label}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type={type === "number" ? "text" : type}
                value={type === "number" ? displayValue : (value || "")}
                placeholder={placeholder}
                onChange={(e) => {
                  if (type === "number") {
                    // strip commas and parse
                    const raw = e.target.value.replace(/,/g, "");
                    const n = parseFloat(raw);
                    onChange(isNaN(n) ? 0 : n);
                  } else {
                    onChange(e.target.value);
                  }
                }}
                disabled={disabled}
                style={{
                  flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 6,
                  border: error ? "1.5px solid #ef4444" : "1px solid #d1d5db",
                  textAlign: type === "number" ? (isRtl ? "left" : "right") : (isRtl ? "right" : "left"),
                  background: disabled ? "#f3f4f6" : "#fff",
                  fontFamily: "inherit",
                  direction: type === "number" ? "ltr" : undefined,
                }}
              />
              {suffix && <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", minWidth: 28 }}>{suffix}</span>}
            </div>
          )}
        </div>
        {error && <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2, paddingInlineStart: 138 }}>{error}</div>}
      </div>
    );
  };

  const up = (key, val) => upAsset(index, { [key]: val });

  // When switching revType to Sale, ensure efficiency is not 0 (would give 0 revenue)
  const handleRevTypeChange = (v) => {
    const updates = { revType: v };
    if (v === "Sale" && (!asset.efficiency || asset.efficiency === 0)) {
      updates.efficiency = 100; // default: sell full GFA
    }
    if (v === "Lease" && (!asset.efficiency || asset.efficiency === 0)) {
      updates.efficiency = getBenchmarkEfficiency(asset.assetType) || 85;
    }
    upAsset(index, updates);
  };

  const phasesArr = Array.isArray(phases) ? phases : [];

  // KPI card component
  const KpiCard = ({ label, labelAr, value, color = "#1f2937", suffix, tip, alert }) => (
    <div style={{
      background: alert ? "#fef2f2" : "#fff",
      border: alert ? "1px solid #fecaca" : "1px solid #e5e7eb",
      borderRadius: 6,
      padding: "8px 10px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2, fontWeight: 500 }}>
        {tip ? <Tip label={tip}>{lang === "ar" ? labelAr : label}</Tip> : (lang === "ar" ? labelAr : label)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: alert ? "#dc2626" : color }}>
        {value}{suffix && <span style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", marginInlineStart: 2 }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 9994,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div style={panelStyle}>
        {/* STICKY HEADER */}
        <div style={{
          position: "sticky",
          top: 0,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 18px",
          zIndex: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, marginInlineEnd: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {asset.name || (lang === "ar" ? "أصل بدون اسم" : "Unnamed Asset")}
                </h2>
                {saveFlash && (
                  <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 600, animation: "fadeInOut 1s" }}>
                    ✓ {lang === "ar" ? "تم الحفظ" : "Saved"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                {typeInfo.label || asset.category || "—"} · {asset.phase || "—"}
                {asset.isBuilding === false && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "#f59e0b20", color: "#d97706", marginInlineStart: 8 }}>
                    {lang === "ar" ? "غير مبني" : "Non-Building"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "#f3f4f6", border: "none", fontSize: 14, cursor: "pointer",
                color: "#6b7280", padding: "6px 10px", borderRadius: 6, lineHeight: 1, flexShrink: 0,
                fontWeight: 600,
              }}
              title={lang === "ar" ? "إغلاق (Esc)" : "Close (Esc)"}
            >✕</button>
          </div>

          {/* Sticky KPI strip — always visible */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            <KpiCard
              label="CAPEX" labelAr="التكلفة"
              value={fmtM(kpis.totalCapex)}
              color="#ef4444"
              tip={lang === "ar" ? "إجمالي التكلفة الرأسمالية (يشمل التكلفة الصلبة + غير المباشرة + الاحتياطي)" : "Total capital cost (hard + soft + contingency)"}
            />
            <KpiCard
              label="Revenue" labelAr="الإيرادات"
              value={fmtM(kpis.totalRev)}
              color="#16a34a"
              tip={lang === "ar" ? "إجمالي الإيرادات على مدى العمر الافتراضي" : "Total lifetime revenue"}
            />
            <KpiCard
              label="YoC" labelAr="عائد/تكلفة"
              value={fmtPct(kpis.yoc)}
              color={kpis.yoc >= 8 ? "#16a34a" : kpis.yoc >= 6 ? "#f59e0b" : "#ef4444"}
              alert={kpis.yoc > 0 && kpis.yoc < 6}
              tip={lang === "ar" ? "الإيراد السنوي المستقر ÷ إجمالي التكلفة. يجب أن يتجاوز معدل الفائدة + هامش المخاطرة" : "Stabilized annual revenue ÷ total cost. Should exceed interest rate + risk margin (typically > 8%)"}
            />
            <KpiCard
              label="Payback" labelAr="الاسترداد"
              value={kpis.payback ? `${kpis.payback.toFixed(1)}y` : "—"}
              color={kpis.payback && kpis.payback <= 10 ? "#16a34a" : kpis.payback && kpis.payback <= 15 ? "#f59e0b" : "#ef4444"}
              tip={lang === "ar" ? "عدد السنوات لاسترداد التكلفة من الإيرادات السنوية" : "Years to recover cost from annual revenue"}
            />
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div style={{ padding: 14 }}>
          {/* Quick Actions bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                const benchEff = getBenchmarkEfficiency(asset.assetType) || 85;
                upAsset(index, { efficiency: benchEff });
              }}
              style={{ fontSize: 10, padding: "5px 10px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", borderRadius: 20, cursor: "pointer", fontWeight: 600 }}
            >
              {ar ? "⚡ تطبيق الكفاءة المرجعية" : "⚡ Apply benchmark efficiency"}
            </button>
            {(asset.footprint || 0) > 0 && (asset.floorsAboveGround || 0) > 0 && (
              <button
                onClick={() => {
                  const above = (asset.footprint || 0) * (asset.floorsAboveGround || 0);
                  const below = (asset.footprint || 0) * (asset.basementLevels || 0);
                  upAsset(index, { gfa: above + below });
                }}
                style={{ fontSize: 10, padding: "5px 10px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 20, cursor: "pointer", fontWeight: 600 }}
              >
                {ar ? "⚡ احسب GFA من الأدوار" : "⚡ GFA from floors"}
              </button>
            )}
            {(asset.plotArea || 0) > 0 && (asset.far || 0) > 0 && (
              <button
                onClick={() => upAsset(index, { gfa: Math.round((asset.plotArea || 0) * (asset.far || 0)) })}
                style={{ fontSize: 10, padding: "5px 10px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 20, cursor: "pointer", fontWeight: 600 }}
              >
                {ar ? "⚡ GFA من FAR" : "⚡ GFA from FAR"}
              </button>
            )}
          </div>

          {/* Section: Investment Metrics — NEW */}
          <Section title="Investment Metrics" titleAr="مؤشرات الاستثمار" lang={lang} defaultOpen={true}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <KpiCard
                label="Annual Revenue (stabilized)" labelAr="إيراد سنوي (مستقر)"
                value={fmtM(kpis.annualRev)}
                tip={lang === "ar" ? "الإيراد السنوي بعد اكتمال سنوات النمو والإشغال المستقر" : "Annual revenue after ramp-up and at stabilized occupancy"}
              />
              <KpiCard
                label="Exit Value (est.)" labelAr="قيمة الخروج (تقديرية)"
                value={fmtM(kpis.exitValue)}
                color="#0369a1"
                tip={ar ? `الإيراد السنوي ÷ Cap Rate (${kpis.capRate}% للسوق السعودي)` : `Annual NOI ÷ cap rate (${kpis.capRate}% typical Saudi)`}
              />
              <KpiCard
                label="Development Profit" labelAr="ربح التطوير"
                value={fmtM(kpis.devProfit)}
                color={kpis.devProfit >= 0 ? "#16a34a" : "#ef4444"}
                tip={ar ? "قيمة الخروج - إجمالي التكلفة" : "Exit value - total cost"}
              />
              <KpiCard
                label="Dev. Margin" labelAr="هامش التطوير"
                value={fmtPct(kpis.devMargin)}
                color={kpis.devMargin >= 25 ? "#16a34a" : kpis.devMargin >= 15 ? "#f59e0b" : "#ef4444"}
                alert={kpis.devMargin < 15 && kpis.totalCapex > 0}
                tip={ar ? "ربح التطوير / التكلفة. المستهدف >20-25%" : "Dev profit / cost. Target > 20-25%"}
              />
              <KpiCard
                label="Revenue / m²" labelAr="إيراد / م²"
                value={fmtNum(kpis.revPerSqm)}
                suffix="SAR"
                tip={ar ? "الإيراد السنوي ÷ GFA" : "Annual revenue per m² GFA"}
              />
              <KpiCard
                label="Total Cost / m²" labelAr="تكلفة كاملة / م²"
                value={fmtNum(kpis.costPerSqmTotal)}
                suffix="SAR"
                tip={ar ? "التكلفة الكاملة ÷ GFA (شامل غير المباشرة والاحتياطي)" : "Total cost per m² (incl. soft+contingency)"}
              />
            </div>
            {kpis.breakEvenRate && (
              <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, fontSize: 11, color: "#854d0e" }}>
                💡 {ar ? `إيجار التعادل (استرداد خلال 10 سنوات): ${fmtNum(kpis.breakEvenRate)} ر.س/م². الحالي: ${fmtNum(asset.leaseRate || 0)} ر.س/م²` : `Break-even rent (10yr payback): ${fmtNum(kpis.breakEvenRate)} SAR/m². Current: ${fmtNum(asset.leaseRate || 0)} SAR/m²`}
              </div>
            )}
          </Section>

          {/* Section 1: Basics */}
          <Section title="Basics" titleAr="الأساسيات" lang={lang} defaultOpen={true}>
            {field("Asset Name", "اسم الأصل", asset.name, (v) => up("name", v), { placeholder: ar ? "مثال: فندق الواجهة" : "e.g. Waterfront Hotel" })}
            {field("Code", "الرمز", asset.code, (v) => up("code", v), { placeholder: "H1, R2..." })}
            {field("Phase", "المرحلة", asset.phase, (v) => up("phase", v), {
              options: phasesArr.map(p => ({ value: p.name, label: p.name }))
            })}
            {field("Plot Reference", "مرجع القطعة", asset.plotReference, (v) => up("plotReference", v), {
              placeholder: ar ? "رقم القطعة في المخطط" : "Plot # in masterplan",
              tip: ar ? "رقم القطعة في مخطط المشروع الكلي لربط الأصل بموقعه" : "Plot number in the masterplan to link asset to its location",
            })}
            {field("Notes", "ملاحظات", asset.notes, (v) => up("notes", v))}
          </Section>

          {/* Section 2: Geometry & Areas — Buildings only */}
          {asset.isBuilding !== false && (
            <Section
              title="Geometry & Areas"
              titleAr="الهندسة والمساحات"
              lang={lang}
              defaultOpen={true}
              badge={(coverageExceeds || farExceeds || gfaMismatch) && (
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 600 }}>
                  ⚠ {ar ? "تحذير" : "Warning"}
                </span>
              )}
            >
              {field("Plot Area", "مساحة الأرض", asset.plotArea, (v) => up("plotArea", v), {
                type: "number", suffix: "m²",
                tip: ar ? "مساحة قطعة الأرض الكاملة" : "Total land plot area",
              })}
              {field("Footprint", "البصمة", asset.footprint, (v) => up("footprint", v), {
                type: "number", suffix: "m²",
                tip: ar ? "مساحة قاعدة المبنى على الأرض (Plot × Coverage%)" : "Building ground footprint (Plot × Coverage%)",
              })}
              {field("Floors Above Ground", "أدوار فوق الأرض", asset.floorsAboveGround, (v) => up("floorsAboveGround", v), {
                type: "number",
                tip: ar ? "عدد الأدوار المبنية فوق مستوى الأرض" : "Number of floors above ground level",
              })}
              {field("Basement Levels", "أدوار بيسمنت", asset.basementLevels, (v) => up("basementLevels", v), {
                type: "number",
                tip: ar ? "عدد أدوار البيسمنت (يُحسب بتكلفة أعلى بسبب الحفريات والعزل)" : "Basement floors (costs more due to excavation & waterproofing)",
              })}
              {field("GFA", "المساحة الإجمالية", asset.gfa, (v) => up("gfa", v), {
                type: "number", suffix: "m²",
                tip: ar ? "المساحة الإجمالية للبناء (Gross Floor Area) = مجموع كل الأدوار" : "Gross Floor Area = sum of all floor plates",
                error: gfaMismatch ? (ar ? `⚠ متوقع ~${fmtNum(expectedGfa)} م² من ${asset.floorsAboveGround + (asset.basementLevels || 0)} أدوار × ${fmtNum(asset.footprint)} م²` : `⚠ Expected ~${fmtNum(expectedGfa)} m² from ${asset.floorsAboveGround + (asset.basementLevels || 0)} floors × ${fmtNum(asset.footprint)} m²`) : null,
              })}
              {field("Coverage %", "نسبة التغطية", asset.coveragePct, (v) => up("coveragePct", v), {
                type: "number", suffix: "%",
                tip: ar ? `البصمة ÷ مساحة الأرض × 100. المحسوب: ${derivedNow.coveragePct}%. المرجعية للمنطقة: ≤${zoning.maxCoverage || "—"}%` : `Footprint ÷ plot × 100. Current: ${derivedNow.coveragePct}%. Typical max: ${zoning.maxCoverage || "—"}%`,
              })}
              {field("FAR", "معامل البناء", asset.far, (v) => up("far", v), {
                type: "number",
                tip: ar ? `GFA ÷ مساحة الأرض. المحسوب: ${derivedNow.far}. المرجعية: ≤${zoning.maxFar || "—"}` : `GFA ÷ plot. Current: ${derivedNow.far}. Typical max: ${zoning.maxFar || "—"}`,
              })}

              {/* Zoning warnings */}
              {(coverageExceeds || farExceeds) && (
                <div style={{ padding: "10px 12px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 6, marginTop: 4, marginBottom: 8, fontSize: 11, color: "#92400e" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ {lang === "ar" ? "تحذيرات التخطيط" : "Zoning Warnings"}</div>
                  {coverageExceeds && (
                    <div>• {lang === "ar" ? `نسبة التغطية ${derivedNow.coveragePct}% تتجاوز المرجعية ${zoning.maxCoverage}% لهذا النوع` : `Coverage ${derivedNow.coveragePct}% exceeds typical ${zoning.maxCoverage}% for this type`}</div>
                  )}
                  {farExceeds && (
                    <div>• {lang === "ar" ? `معامل البناء ${derivedNow.far} يتجاوز المرجعية ${zoning.maxFar}` : `FAR ${derivedNow.far} exceeds typical ${zoning.maxFar}`}</div>
                  )}
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#6b7280" }}>
                {lang === "ar" ? "تفصيل المساحات" : "Area Breakdown"}
              </div>
              {field("Efficiency %", "الكفاءة", asset.efficiency, (v) => up("efficiency", v), {
                type: "number", suffix: "%",
                tip: ar ? `نسبة المساحة القابلة للتأجير/الاستخدام من GFA. المرجع لهذا النوع: ${getBenchmarkEfficiency(asset.assetType)}%` : `Leasable/usable ratio of GFA. Benchmark for this type: ${getBenchmarkEfficiency(asset.assetType)}%`,
              })}
              {field("GLA", "المساحة القابلة للتأجير",
                asset.gla || Math.round((asset.gfa || 0) * ((asset.efficiency || 85) / 100)),
                (v) => {
                  if (asset.gfa > 0) {
                    const newEff = Math.min(100, Math.round((v / asset.gfa) * 100));
                    upAsset(index, { gla: v, efficiency: newEff });
                  } else {
                    up("gla", v);
                  }
                },
                {
                  type: "number", suffix: "m²", derived: !asset.gla,
                  tip: ar ? "المساحة القابلة للتأجير = GFA × الكفاءة. التعديل يحدّث الكفاءة تلقائياً" : "Gross Leasable Area = GFA × efficiency. Editing this updates efficiency",
                }
              )}

              {/* Derived Values Box */}
              {(() => {
                const derived = deriveAreas(asset);
                const benchEff = getBenchmarkEfficiency(asset.assetType);
                return (
                  <div style={{ padding: "10px 12px", background: "#f0f9ff", borderRadius: 6, marginTop: 8, border: "1px solid #bae6fd" }}>
                    <div style={{ fontSize: 10, color: "#0369a1", marginBottom: 6, fontWeight: 600 }}>
                      {lang === "ar" ? "📐 قيم مشتقة تلقائياً" : "📐 Auto-Derived Values"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                      <div>{getAreaLabel(asset.assetType, lang)}: <b>{fmtNum(derived.netArea)}</b> m²</div>
                      <div>{lang === "ar" ? "نسبة التغطية" : "Coverage"}: <b>{derived.coveragePct}%</b></div>
                      <div>FAR: <b>{derived.far}</b></div>
                      <div>{lang === "ar" ? "المرجعية" : "Benchmark"}: <b>{benchEff}%</b></div>
                    </div>
                    {asset.efficiency !== benchEff && benchEff > 0 && (
                      <button
                        onClick={() => upAsset(index, { efficiency: benchEff })}
                        style={{
                          marginTop: 8, fontSize: 10, padding: "4px 10px",
                          background: "#2EC4B620", color: "#0f766e", border: "1px solid #2EC4B6",
                          borderRadius: 4, cursor: "pointer", fontWeight: 600,
                        }}
                      >
                        {lang === "ar" ? `تطبيق المرجعية (${benchEff}%)` : `Apply Benchmark (${benchEff}%)`}
                      </button>
                    )}
                  </div>
                );
              })()}
              {field("NLA", "صافي المساحة", asset.nla, (v) => up("nla", v), { type: "number", suffix: "m²" })}
              {field("Parking Area", "مساحة المواقف", asset.parkingArea, (v) => up("parkingArea", v), {
                type: "number", suffix: "m²",
                tip: ar ? "إجمالي مساحة مواقف السيارات (سطحية أو منظمة)" : "Total parking area (surface or structured)",
              })}
              {field("Open Area", "مساحة مفتوحة", asset.openArea, (v) => up("openArea", v), { type: "number", suffix: "m²" })}
            </Section>
          )}

          {/* Non-Building: simplified area section */}
          {asset.isBuilding === false && (
            <Section title="Land & Area" titleAr="الأرض والمساحة" lang={lang}>
              {field("Plot Area", "مساحة الأرض", asset.plotArea, (v) => up("plotArea", v), { type: "number", suffix: "m²" })}
              {field("Open Area", "مساحة مفتوحة", asset.openArea, (v) => up("openArea", v), { type: "number", suffix: "m²" })}
            </Section>
          )}

          {/* Section 3: Phase & Timeline */}
          <Section title="Phase & Timeline" titleAr="المرحلة والجدول الزمني" lang={lang} defaultOpen={false}>
            {field("Phase", "المرحلة", asset.phase, (v) => up("phase", v), {
              options: phasesArr.map(p => ({ value: p.name, label: p.name }))
            })}
            {field("Start Year", "سنة البداية", asset.startYear || asset.constrStart, (v) => up("startYear", v), {
              type: "number",
              tip: ar ? "السنة النسبية لبدء البناء (0 = سنة بدء المشروع)" : "Relative year to start construction (0 = project start)",
            })}
            {field("Build Duration (months)", "مدة البناء (شهور)", asset.constrDuration, (v) => up("constrDuration", v), {
              type: "number",
              tip: ar ? "عدد أشهر البناء. يُستخدم لتوزيع التكلفة على السنوات" : "Construction months. Used to distribute cost across years",
            })}
            {field("Opening Year", "سنة الافتتاح", asset.openingYear, (v) => up("openingYear", v), {
              type: "number",
              tip: ar ? "السنة المطلقة لبدء الإيرادات" : "Absolute year to start generating revenue",
            })}
            {field("Priority", "الأولوية", asset.assetPriority, (v) => up("assetPriority", v), {
              options: [
                { value: "anchor", label: "Anchor (pivotal)", labelAr: "رئيسي (محوري)" },
                { value: "quickWin", label: "Quick Win (fast ROI)", labelAr: "سريع (عائد سريع)" },
                { value: "standard", label: "Standard", labelAr: "عادي" },
                { value: "optional", label: "Optional (phase-out ok)", labelAr: "اختياري (يمكن إلغاؤه)" },
              ]
            })}
          </Section>

          {/* Section 4: Revenue */}
          <Section title="Revenue Configuration" titleAr="إعدادات الإيرادات" lang={lang} defaultOpen={false}>
            {field("Revenue Type", "نوع الإيراد", asset.revType, handleRevTypeChange, {
              options: [
                { value: "Lease", label: "Lease (rent per m²)", labelAr: "تأجير (لكل م²)" },
                { value: "Operating", label: "Operating (EBITDA)", labelAr: "تشغيل (EBITDA)" },
                { value: "Sale", label: "Sale (sell units)", labelAr: "بيع (وحدات)" },
              ],
              tip: ar ? "طريقة توليد الإيرادات" : "How this asset generates revenue",
            })}
            {/* Lease fields */}
            {asset.revType === "Lease" && (
              <>
                {field("Lease Rate / m²", "إيجار / م²", asset.leaseRate, (v) => up("leaseRate", v), {
                  type: "number", suffix: "SAR",
                  tip: ar ? "الإيجار السنوي لكل متر مربع قابل للتأجير" : "Annual rent per leasable m²",
                })}
                {field("Stabilized Occupancy %", "إشغال مستقر %", asset.stabilizedOcc, (v) => up("stabilizedOcc", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة الإشغال المستهدفة بعد فترة النمو" : "Target occupancy after ramp-up",
                })}
                {field("Ramp-Up Years", "سنوات النمو", asset.rampUpYears, (v) => up("rampUpYears", v), {
                  type: "number",
                  tip: ar ? "عدد السنوات للوصول للإشغال المستقر" : "Years to reach stabilized occupancy",
                })}
                {field("Escalation %/year", "زيادة سنوية %", asset.escalation, (v) => up("escalation", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة الزيادة السنوية في الإيجار" : "Annual rent escalation",
                })}
              </>
            )}
            {/* Operating fields */}
            {asset.revType === "Operating" && (
              <>
                {field("Annual EBITDA", "EBITDA سنوي", asset.opEbitda, (v) => up("opEbitda", v), {
                  type: "number", suffix: "SAR",
                  tip: ar ? "الأرباح التشغيلية السنوية قبل الفوائد والضرائب والإهلاك" : "Annual Earnings Before Interest, Taxes, Depreciation, Amortization",
                })}
                {field("Stabilized Occupancy %", "إشغال مستقر %", asset.stabilizedOcc, (v) => up("stabilizedOcc", v), {
                  type: "number", suffix: "%",
                })}
                {field("Ramp-Up Years", "سنوات النمو", asset.rampUpYears, (v) => up("rampUpYears", v), { type: "number" })}
              </>
            )}
            {/* Sale fields */}
            {asset.revType === "Sale" && (
              <>
                {field("Sale Price / m²", "سعر البيع / م²", asset.salePricePerSqm, (v) => up("salePricePerSqm", v), {
                  type: "number", suffix: "SAR",
                  tip: ar ? "سعر البيع للمتر المربع القابل للبيع" : "Sale price per sellable m²",
                })}
                {field("Absorption Years", "سنوات الاستيعاب", asset.absorptionYears, (v) => up("absorptionYears", v), {
                  type: "number",
                  tip: ar ? "عدد السنوات لبيع كل الوحدات" : "Years to sell all units",
                })}
                {field("Pre-Sale %", "نسبة البيع المسبق %", asset.preSalePct, (v) => up("preSalePct", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة الوحدات المباعة قبل انتهاء البناء" : "% sold before construction completes",
                })}
                {field("Commission %", "نسبة العمولة %", asset.commissionPct, (v) => up("commissionPct", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة عمولة التسويق والمبيعات" : "Marketing & sales commission",
                })}
              </>
            )}
          </Section>

          {/* Section 5: Cost */}
          <Section title="Cost Configuration" titleAr="إعدادات التكلفة" lang={lang} defaultOpen={false}>
            {field("Cost / m²", "تكلفة / م²", asset.costPerSqm, (v) => up("costPerSqm", v), {
              type: "number", suffix: "SAR",
              tip: ar ? "تكلفة البناء الصلبة لكل متر مربع (قبل غير المباشرة والاحتياطي)" : "Hard construction cost per m² (before soft & contingency)",
            })}
            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#6b7280" }}>
              {lang === "ar" ? "تفاصيل إضافية (اختيارية)" : "Advanced (optional)"}
            </div>
            {field("Basement Cost Multiplier", "مضاعف تكلفة البيسمنت", asset.basementCostMultiplier, (v) => up("basementCostMultiplier", v), {
              type: "number", suffix: "×",
              hidden: (asset.basementLevels || 0) === 0,
              tip: ar ? "مضاعف التكلفة للبيسمنت (عادة 1.4-1.8 بسبب الحفريات والعزل)" : "Cost multiplier for basement (typically 1.4-1.8 due to excavation & waterproofing)",
            })}
            {field("Parking Cost / m²", "تكلفة مواقف / م²", asset.parkingCostPerSqm, (v) => up("parkingCostPerSqm", v), {
              type: "number", suffix: "SAR",
              hidden: (asset.parkingArea || 0) === 0,
              tip: ar ? "تكلفة بناء المواقف لكل م² (إذا لم تُحتسب ضمن GFA)" : "Parking construction cost per m² (if not in GFA)",
            })}
            {field("Soft Cost % (override)", "تكلفة غير مباشرة % (تجاوز)", asset.softCostPctOverride, (v) => up("softCostPctOverride", v), {
              type: "number", suffix: "%",
              tip: ar ? `تجاوز نسبة المشروع (${project?.softCostPct || 0}%). اتركه فارغاً لاستخدام قيمة المشروع` : `Override project value (${project?.softCostPct || 0}%). Leave empty to inherit`,
            })}
            {field("Contingency % (override)", "احتياطي % (تجاوز)", asset.contingencyPctOverride, (v) => up("contingencyPctOverride", v), {
              type: "number", suffix: "%",
              tip: ar ? `تجاوز نسبة المشروع (${project?.contingencyPct || 0}%)` : `Override project value (${project?.contingencyPct || 0}%)`,
            })}

            {/* Live CAPEX breakdown */}
            {capexBreakdown && (asset.gfa || 0) > 0 && (asset.costPerSqm || 0) > 0 && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#0f172a", color: "#e5e7eb", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: "#2EC4B6", fontSize: 12 }}>
                  {lang === "ar" ? "📊 تفصيل التكلفة الرأسمالية (حي)" : "📊 Live CAPEX Breakdown"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontFamily: "'SF Mono', Consolas, monospace", fontSize: 10.5 }}>
                  <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "فوق الأرض" : "Above Ground"}</span>
                  <span>{fmtM(capexBreakdown.hardCostAbove)}</span>
                  {capexBreakdown.hardCostBasement > 0 && (<>
                    <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "بيسمنت (مع علاوة)" : "Basement (+premium)"}</span>
                    <span>{fmtM(capexBreakdown.hardCostBasement)}</span>
                  </>)}
                  {capexBreakdown.parkingCost > 0 && (<>
                    <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "مواقف" : "Parking"}</span>
                    <span>{fmtM(capexBreakdown.parkingCost)}</span>
                  </>)}
                  <span style={{ borderTop: "1px solid #334155", paddingTop: 4, color: "#e5e7eb", fontWeight: 600 }}>{lang === "ar" ? "تكلفة صلبة" : "Hard Cost"}</span>
                  <span style={{ borderTop: "1px solid #334155", paddingTop: 4, fontWeight: 600 }}>{fmtM(capexBreakdown.hardCost)}</span>
                  <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "غير مباشرة" : "Soft Cost"}</span>
                  <span>{fmtM(capexBreakdown.softCost)}</span>
                  <span style={{ color: "#94a3b8" }}>{lang === "ar" ? "احتياطي" : "Contingency"}</span>
                  <span>{fmtM(capexBreakdown.contingency)}</span>
                  <span style={{ borderTop: "2px solid #2EC4B6", paddingTop: 5, fontWeight: 700, color: "#2EC4B6" }}>{lang === "ar" ? "الإجمالي" : "Total CAPEX"}</span>
                  <span style={{ borderTop: "2px solid #2EC4B6", paddingTop: 5, fontWeight: 700, color: "#2EC4B6" }}>{fmtM(capexBreakdown.total)}</span>
                </div>
                {/* Per-m² implied */}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #334155", fontSize: 10, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
                  <span>{ar ? "متوسط / م² GFA:" : "Avg / m² GFA:"}</span>
                  <span style={{ color: "#e5e7eb" }}>{fmtNum(capexBreakdown.total / (asset.gfa || 1))} SAR</span>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-4px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
