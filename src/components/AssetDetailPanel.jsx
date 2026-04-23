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

// Inline collapse for "Advanced" groups inside a Section — rarely-edited fields
function CollapseBlock({ label, lang, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "6px 10px",
          background: open ? "#eff6ff" : "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 11,
          color: open ? "#1e40af" : "#64748b",
          fontFamily: "inherit",
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 9, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
        {label}
      </button>
      {open && <div style={{ marginTop: 8, paddingInlineStart: 4 }}>{children}</div>}
    </div>
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
  // ALL hooks must be called unconditionally (React rules of hooks)
  const isRtl = lang === "ar";
  const ar = isRtl;
  const typeInfo = (asset && ASSET_TYPES[asset?.assetType]) || {};

  const assetResult = asset ? (results?.assetSchedules?.find(a => a.id === asset.id)
    || results?.assetSchedules?.[index]) : null;

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
  // Independent logic: each metric computed from first principles with documented formula
  const kpis = useMemo(() => { if (!asset) return { totalCapex:0, totalRev:0, annualRev:0, leasable:0, yoc:0, capRate:8.5, exitValue:0, devProfit:0, devMargin:0, payback:null, breakEvenRate:null, revPerSqm:0, costPerSqmTotal:0 };
    const totalCapex = assetResult?.totalCapex || capexBreakdown?.total || 0;
    const totalRev = assetResult?.totalRevenue || 0;   // from engine (includes commission/pre-sale for Sale)
    const gfa = asset.gfa || 0;
    const eff = (asset.efficiency || 0) / 100;
    const leasable = gfa * eff;

    // ── Annual stabilized revenue ──
    // Lease: leasable × rate × occupancy (at 100% ramp)
    // Operating: EBITDA directly
    // Sale: totalRevenue / absorption (amortized — uses engine's computed total incl. commission)
    let annualRev = 0;
    if (asset.revType === "Lease") {
      const occ = (asset.stabilizedOcc ?? 100) / 100;
      annualRev = leasable * (asset.leaseRate || 0) * occ;
    } else if (asset.revType === "Operating") {
      annualRev = asset.opEbitda || 0;
    } else if (asset.revType === "Sale") {
      // For Sale, use engine's totalRevenue (which includes commission reduction + pre-sale timing)
      // spread over absorption period
      const absYrs = Math.max(1, asset.absorptionYears || 3);
      annualRev = totalRev > 0 ? totalRev / absYrs : 0;
    }

    // ── Yield on Cost (YoC) ──
    // Formula: Annual stabilized NOI ÷ Total development cost
    // Industry benchmark: > 8% strong, 6-8% marginal, < 6% weak
    const yoc = totalCapex > 0 ? (annualRev / totalCapex) * 100 : 0;

    // ── Market cap rate for this asset type (Saudi market typical) ──
    const capRate = CAP_RATES[asset.assetType] || 8.5;

    // ── Exit Value ──
    // Lease/Operating: capitalized value = stabilized NOI ÷ cap rate
    // Sale: total lifetime sale revenue (already net of commission via engine)
    let exitValue = 0;
    if (asset.revType === "Sale") {
      exitValue = totalRev;  // sale proceeds (net of commission) — engine-computed
    } else if (annualRev > 0) {
      exitValue = annualRev / (capRate / 100);
    }

    // ── Development Profit ──
    // = Exit Value - Total Cost
    // For Sale: = totalRev - totalCapex (true dev profit)
    // For Lease/Op: = capitalized value - dev cost (value creation)
    const devProfit = exitValue - totalCapex;
    const devMargin = totalCapex > 0 ? (devProfit / totalCapex) * 100 : 0;

    // ── Simple Payback (years) ──
    // = Total cost ÷ annual revenue (naive, ignores ramp-up & time value)
    // Returns null when annualRev is 0 or negative (meaningless)
    const payback = annualRev > 0 ? totalCapex / annualRev : null;

    // ── Break-even Lease Rate ──
    // The rate at which lease revenue recovers total CAPEX in 10 years at 100% occupancy
    // Formula: (totalCapex / 10yr) / leasable area
    const breakEvenRate = (asset.revType === "Lease" && leasable > 0 && totalCapex > 0)
      ? (totalCapex / 10) / leasable
      : null;

    // ── Unit economics ──
    const revPerSqm = gfa > 0 ? annualRev / gfa : 0;
    const costPerSqmTotal = gfa > 0 ? totalCapex / gfa : 0;

    return {
      totalCapex, totalRev, annualRev, leasable,
      yoc, capRate, exitValue, devProfit, devMargin,
      payback, breakEvenRate, revPerSqm, costPerSqmTotal,
    };
  }, [asset, assetResult, capexBreakdown]);

  // Zoning validation (safe when asset is null — guards with optional chaining)
  const zoning = ZONING_BENCHMARKS[asset?.assetType] || {};
  const derivedNow = asset ? deriveAreas(asset) : { coveragePct: 0, far: 0, netArea: 0, leasableArea: 0 };
  const coverageExceeds = zoning.maxCoverage && derivedNow.coveragePct > zoning.maxCoverage;
  const farExceeds = zoning.maxFar && derivedNow.far > zoning.maxFar;

  // GFA sanity check (vs floors × footprint)
  const expectedGfa = (asset?.footprint || 0) * ((asset?.floorsAboveGround || 0) + (asset?.basementLevels || 0));
  const gfaMismatch = expectedGfa > 0 && (asset?.gfa || 0) > 0 && Math.abs((asset?.gfa || 0) - expectedGfa) / expectedGfa > 0.2;

  // Escape key support
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Early return AFTER all hooks (React rules of hooks)
  if (!asset) return null;

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
    // Distinguish warning (⚑ prefix) from error for styling
    const isWarn = error && typeof error === "string" && error.startsWith("⚑");
    const borderColor = error ? (isWarn ? "#f59e0b" : "#ef4444") : "#d1d5db";
    const msgColor = isWarn ? "#b45309" : "#ef4444";
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, color: "#6b7280", minWidth: 130, flexShrink: 0, fontWeight: 500 }}>
            {tip ? <Tip label={tip}>{lang === "ar" ? labelAr : labelEn}</Tip> : (lang === "ar" ? labelAr : labelEn)}
            {derived && <span style={{ fontSize: 9, color: "#2EC4B6", marginInlineStart: 4, fontWeight: 600 }}>⚡{ar ? "مشتق" : "auto"}</span>}
            {isWarn && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", marginInlineStart: 4, verticalAlign: "middle" }} title={ar ? "قيمة غير افتراضية" : "Non-default value"} />}
          </label>
          {options ? (
            <select
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: 6, border: `${error ? "1.5px" : "1px"} solid ${borderColor}`, background: "#fff", fontFamily: "inherit" }}
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
                  border: `${error ? "1.5px" : "1px"} solid ${borderColor}`,
                  textAlign: type === "number" ? (isRtl ? "left" : "right") : (isRtl ? "right" : "left"),
                  background: disabled ? "#f3f4f6" : (isWarn ? "#fffbeb" : "#fff"),
                  fontFamily: "inherit",
                  direction: type === "number" ? "ltr" : undefined,
                }}
              />
              {suffix && <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", minWidth: 28 }}>{suffix}</span>}
            </div>
          )}
        </div>
        {error && <div style={{ fontSize: 10, color: msgColor, marginTop: 2, paddingInlineStart: 138 }}>{error}</div>}
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
              {field("GFA", "المساحة الإجمالية", asset.gfa, (v) => {
                // When GFA changes, recalculate GLA = GFA × efficiency
                const newGla = v > 0 ? Math.round(v * ((asset.efficiency || 85) / 100)) : (asset.gla || 0);
                upAsset(index, { gfa: v, gla: newGla });
              }, {
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
              {field("Efficiency %", "الكفاءة", asset.efficiency, (v) => {
                // Cross-field: clamp to 0-100 and recalculate GLA
                const clamped = Math.min(100, Math.max(0, v));
                const newGla = (asset.gfa || 0) > 0 ? Math.round((asset.gfa || 0) * clamped / 100) : (asset.gla || 0);
                upAsset(index, { efficiency: clamped, gla: newGla });
              }, {
                type: "number", suffix: "%",
                tip: ar ? `نسبة المساحة القابلة للتأجير/الاستخدام من GFA. المرجع لهذا النوع: ${getBenchmarkEfficiency(asset.assetType)}%` : `Leasable/usable ratio of GFA. Benchmark for this type: ${getBenchmarkEfficiency(asset.assetType)}%`,
                error: (asset.efficiency || 0) > 100 ? (ar ? "الكفاءة لا يمكن أن تتجاوز 100%" : "Efficiency cannot exceed 100%") : null,
              })}
              {(() => {
                const glaVal = asset.gla || Math.round((asset.gfa || 0) * ((asset.efficiency || 85) / 100));
                const glaExceedsGfa = (asset.gfa || 0) > 0 && glaVal > (asset.gfa || 0);
                return field("GLA", "المساحة القابلة للتأجير",
                  glaVal,
                  (v) => {
                    if ((asset.gfa || 0) > 0) {
                      // Clamp GLA to max GFA
                      const clamped = Math.min(asset.gfa, Math.max(0, v));
                      const newEff = Math.round((clamped / asset.gfa) * 100);
                      upAsset(index, { gla: clamped, efficiency: newEff });
                    } else {
                      up("gla", v);
                    }
                  },
                  {
                    type: "number", suffix: "m²", derived: !asset.gla,
                    tip: ar ? "المساحة القابلة للتأجير = GFA × الكفاءة. التعديل يحدّث الكفاءة تلقائياً" : "Gross Leasable Area = GFA × efficiency. Editing this updates efficiency",
                    error: glaExceedsGfa ? (ar ? `⚠ GLA (${fmtNum(glaVal)} م²) يتجاوز GFA (${fmtNum(asset.gfa)} م²)` : `⚠ GLA (${fmtNum(glaVal)} m²) exceeds GFA (${fmtNum(asset.gfa)} m²)`) : null,
                  }
                );
              })()}

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
                {field("Lease Rate / m²", "إيجار / م²", asset.leaseRate, (v) => {
                  if (v < 0) return; // no negative rates
                  up("leaseRate", v);
                }, {
                  type: "number", suffix: "SAR",
                  tip: ar ? "الإيجار السنوي لكل متر مربع قابل للتأجير" : "Annual rent per leasable m²",
                  error: (asset.leaseRate || 0) < 0 ? (ar ? "لا يمكن أن تكون القيمة سالبة" : "Value cannot be negative") : null,
                })}
                {field("Stabilized Occupancy %", "إشغال مستقر %", asset.stabilizedOcc, (v) => up("stabilizedOcc", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة الإشغال المستهدفة بعد فترة النمو (الافتراضي: 95%)" : "Target occupancy after ramp-up (default: 95%)",
                  error: asset.stabilizedOcc != null && asset.stabilizedOcc !== 95 ? (ar ? `⚑ قيمة غير افتراضية (الافتراضي: 95%)` : `⚑ Non-default value (default: 95%)`) : null,
                })}
                {field("Ramp-Up Years", "سنوات النمو", asset.rampUpYears, (v) => up("rampUpYears", v), {
                  type: "number",
                  tip: ar ? "عدد السنوات للوصول للإشغال المستقر (الافتراضي: 1)" : "Years to reach stabilized occupancy (default: 1)",
                  error: asset.rampUpYears != null && asset.rampUpYears !== 1 ? (ar ? `⚑ قيمة غير افتراضية (الافتراضي: 1)` : `⚑ Non-default value (default: 1)`) : null,
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
                  error: (asset.opEbitda || 0) < 0 ? (ar ? "لا يمكن أن تكون القيمة سالبة" : "Value cannot be negative") : null,
                })}
                {field("Stabilized Occupancy %", "إشغال مستقر %", asset.stabilizedOcc, (v) => up("stabilizedOcc", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة الإشغال المستهدفة (الافتراضي: 95%)" : "Target occupancy (default: 95%)",
                  error: asset.stabilizedOcc != null && asset.stabilizedOcc !== 95 ? (ar ? `⚑ قيمة غير افتراضية (الافتراضي: 95%)` : `⚑ Non-default value (default: 95%)`) : null,
                })}
                {field("Ramp-Up Years", "سنوات النمو", asset.rampUpYears, (v) => up("rampUpYears", v), {
                  type: "number",
                  tip: ar ? "عدد السنوات للوصول للتشغيل الكامل (الافتراضي: 1)" : "Years to full operation (default: 1)",
                  error: asset.rampUpYears != null && asset.rampUpYears !== 1 ? (ar ? `⚑ قيمة غير افتراضية (الافتراضي: 1)` : `⚑ Non-default value (default: 1)`) : null,
                })}
              </>
            )}
            {/* Sale fields */}
            {asset.revType === "Sale" && (
              <>
                {field("Sale Price / m²", "سعر البيع / م²", asset.salePricePerSqm, (v) => up("salePricePerSqm", v), {
                  type: "number", suffix: "SAR",
                  tip: ar ? "سعر البيع للمتر المربع القابل للبيع" : "Sale price per sellable m²",
                  error: (asset.salePricePerSqm || 0) < 0 ? (ar ? "لا يمكن أن تكون القيمة سالبة" : "Value cannot be negative") : null,
                })}
                {field("Absorption Years", "سنوات الاستيعاب", asset.absorptionYears, (v) => up("absorptionYears", v), {
                  type: "number",
                  tip: ar ? "عدد السنوات لبيع كل الوحدات (الافتراضي: 2)" : "Years to sell all units (default: 2)",
                  error: asset.absorptionYears != null && asset.absorptionYears !== 2 ? (ar ? `⚑ قيمة غير افتراضية (الافتراضي: 2)` : `⚑ Non-default value (default: 2)`) : null,
                })}
                {field("Pre-Sale %", "نسبة البيع المسبق %", asset.preSalePct, (v) => up("preSalePct", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة الوحدات المباعة قبل انتهاء البناء" : "% sold before construction completes",
                  error: (asset.preSalePct || 0) < 0 ? (ar ? "لا يمكن أن تكون القيمة سالبة" : "Value cannot be negative") : null,
                })}
                {field("Commission %", "نسبة العمولة %", asset.commissionPct, (v) => up("commissionPct", v), {
                  type: "number", suffix: "%",
                  tip: ar ? "نسبة عمولة التسويق والمبيعات" : "Marketing & sales commission",
                  error: (asset.commissionPct || 0) < 0 ? (ar ? "لا يمكن أن تكون القيمة سالبة" : "Value cannot be negative") : null,
                })}
              </>
            )}
          </Section>

          {/* Section 5: Cost */}
          <Section title="Cost Configuration" titleAr="إعدادات التكلفة" lang={lang} defaultOpen={false}>
            {field("Cost / m²", "تكلفة / م²", asset.costPerSqm, (v) => up("costPerSqm", v), {
              type: "number", suffix: "SAR",
              tip: ar ? "تكلفة البناء الصلبة لكل متر مربع (قبل غير المباشرة والاحتياطي)" : "Hard construction cost per m² (before soft & contingency)",
              error: (asset.costPerSqm || 0) < 0 ? (ar ? "لا يمكن أن تكون التكلفة سالبة" : "Cost cannot be negative") : null,
            })}

            {/* Compact one-line CAPEX summary (replaces the old dark panel) */}
            {capexBreakdown && (asset.gfa || 0) > 0 && (asset.costPerSqm || 0) > 0 && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, fontSize: 11, color: "#0369a1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ fontWeight: 600 }}>{ar ? "تفصيل سريع:" : "Quick breakdown:"}</span>
                <span>
                  {ar ? "صلبة" : "Hard"} <strong>{fmtM(capexBreakdown.hardCost)}</strong>
                  {" · "}
                  {ar ? "غير مباشرة+احتياطي" : "Soft+Cont"} <strong>{fmtM(capexBreakdown.softCost + capexBreakdown.contingency)}</strong>
                  {" · "}
                  {ar ? "إجمالي" : "Total"} <strong style={{ color: "#0c4a6e" }}>{fmtM(capexBreakdown.total)}</strong>
                  {" · "}
                  <span style={{ color: "#64748b" }}>
                    {ar ? "متوسط/م²" : "avg/m²"} <strong>{fmtNum(capexBreakdown.total / (asset.gfa || 1))}</strong>
                  </span>
                </span>
              </div>
            )}

            {/* Advanced (hidden overrides) */}
            <CollapseBlock
              label={ar ? "متقدم (تكاليف تفصيلية)" : "Advanced (detailed cost overrides)"}
              lang={lang}
            >
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
            </CollapseBlock>
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
