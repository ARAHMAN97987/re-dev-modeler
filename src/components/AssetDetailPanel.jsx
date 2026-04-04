import React, { useState, useEffect, useRef } from "react";
import { ASSET_TYPES } from "../data/assetTypes.js";
import { deriveAreas, getBenchmarkEfficiency, getAreaLabel } from "../data/areaBenchmarks.js";

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
}) {
  if (!asset) return null;

  const isRtl = lang === "ar";
  const typeInfo = ASSET_TYPES[asset.assetType] || {};

  const assetResult = results?.assetSchedules?.find(a => a.id === asset.id)
    || results?.assetSchedules?.[index];

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
    width: isMobile ? "100vw" : 480,
    height: "100vh",
    background: "var(--bg-primary, #fff)",
    borderLeft: isRtl ? "none" : "1px solid var(--border, #e5e7eb)",
    borderRight: isRtl ? "1px solid var(--border, #e5e7eb)" : "none",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
    overflowY: "auto",
    zIndex: 9995,
    direction: isRtl ? "rtl" : "ltr",
    padding: 20,
    boxSizing: "border-box",
  };

  const sectionStyle = {
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  };

  const sectionTitle = (titleEn, titleAr) => (
    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, marginTop: 0, color: "#1f2937" }}>
      {lang === "ar" ? titleAr : titleEn}
    </h3>
  );

  const field = (labelEn, labelAr, value, onChange, opts = {}) => {
    const { type = "text", options, disabled, derived, hidden, suffix } = opts;
    if (hidden) return null;
    return (
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 11, color: "#6b7280", minWidth: 120, flexShrink: 0 }}>
          {lang === "ar" ? labelAr : labelEn}
          {derived && <span style={{ fontSize: 9, color: "#2EC4B6", marginInlineStart: 4 }}>(derived)</span>}
        </label>
        {options ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={{ flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff" }}
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
              type={type}
              value={type === "number" ? (value || 0) : (value || "")}
              onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
              disabled={disabled}
              style={{
                flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: 4,
                border: "1px solid #d1d5db",
                textAlign: type === "number" ? "right" : "left",
                background: disabled ? "#f3f4f6" : "#fff",
              }}
            />
            {suffix && <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>{suffix}</span>}
          </div>
        )}
      </div>
    );
  };

  const up = (key, val) => upAsset(index, { [key]: val });

  const phasesArr = Array.isArray(phases) ? phases : [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.3)", zIndex: 9994,
        }}
      />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0, marginInlineEnd: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {asset.name || (lang === "ar" ? "أصل بدون اسم" : "Unnamed Asset")}
            </h2>
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
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280", padding: 4, lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Summary Card */}
        {assetResult && (
          <div style={{
            ...sectionStyle, background: "#f9fafb",
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center",
            marginBottom: 14,
          }}>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{lang === "ar" ? "التكلفة" : "CAPEX"}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{((assetResult.totalCapex || 0) / 1e6).toFixed(1)}M</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{lang === "ar" ? "الإيراد" : "Revenue"}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{((assetResult.totalRevenue || 0) / 1e6).toFixed(1)}M</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>GFA</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{(asset.gfa || 0).toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Section 1: Basics (US-004) */}
        <div style={sectionStyle}>
          {sectionTitle("Basics", "الأساسيات")}
          {field("Asset Name", "اسم الأصل", asset.name, (v) => up("name", v))}
          {field("Code", "الرمز", asset.code, (v) => up("code", v))}
          {field("Phase", "المرحلة", asset.phase, (v) => up("phase", v), {
            options: phasesArr.map(p => ({ value: p.name, label: p.name }))
          })}
          {field("Plot Reference", "مرجع القطعة", asset.plotReference, (v) => up("plotReference", v))}
          {field("Notes", "ملاحظات", asset.notes, (v) => up("notes", v))}
        </div>

        {/* Section 2: Geometry & Areas (US-005 + US-006) - Buildings only */}
        {asset.isBuilding !== false && (
          <div style={sectionStyle}>
            {sectionTitle("Geometry & Areas", "الهندسة والمساحات")}
            {field("Plot Area", "مساحة الأرض", asset.plotArea, (v) => up("plotArea", v), { type: "number", suffix: "m²" })}
            {field("Footprint", "البصمة", asset.footprint, (v) => up("footprint", v), { type: "number", suffix: "m²" })}
            {field("Floors Above Ground", "أدوار فوق الأرض", asset.floorsAboveGround, (v) => up("floorsAboveGround", v), { type: "number" })}
            {field("Basement Levels", "أدوار بيسمنت", asset.basementLevels, (v) => up("basementLevels", v), { type: "number" })}
            {field("GFA", "المساحة الإجمالية", asset.gfa, (v) => up("gfa", v), { type: "number", suffix: "m²" })}
            {field("Coverage %", "نسبة التغطية", asset.coveragePct, (v) => up("coveragePct", v), { type: "number", suffix: "%" })}
            {field("FAR", "معامل البناء", asset.far, (v) => up("far", v), { type: "number" })}

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#6b7280" }}>
              {lang === "ar" ? "تفصيل المساحات" : "Area Breakdown"}
            </div>
            {field("Efficiency %", "الكفاءة", asset.efficiency, (v) => up("efficiency", v), { type: "number", suffix: "%" })}
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
              { type: "number", suffix: "m²", derived: !asset.gla }
            )}
            {/* Derived Values Box */}
            {(() => {
              const derived = deriveAreas(asset);
              const benchEff = getBenchmarkEfficiency(asset.assetType);
              return (
                <div style={{ padding: "8px 12px", background: "#f0f9ff", borderRadius: 6, marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: "#0369a1", marginBottom: 4 }}>
                    {lang === "ar" ? "قيم مشتقة" : "Derived Values"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                    <div>{getAreaLabel(asset.assetType, lang)}: <b>{derived.netArea.toLocaleString()}</b> m²</div>
                    <div>{lang === "ar" ? "نسبة التغطية" : "Coverage"}: <b>{derived.coveragePct}%</b></div>
                    <div>FAR: <b>{derived.far}</b></div>
                    <div>{lang === "ar" ? "المرجعية" : "Benchmark"}: <b>{benchEff}%</b></div>
                  </div>
                  {asset.efficiency !== benchEff && (
                    <button
                      onClick={() => upAsset(index, { efficiency: benchEff })}
                      style={{
                        marginTop: 6, fontSize: 10, padding: "2px 8px",
                        background: "#2EC4B620", color: "#2EC4B6", border: "1px solid #2EC4B6",
                        borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      {lang === "ar" ? "تطبيق المرجعية" : "Apply Benchmark"}
                    </button>
                  )}
                </div>
              );
            })()}
            {field("NLA", "صافي المساحة", asset.nla, (v) => up("nla", v), { type: "number", suffix: "m²" })}
            {field("Parking Area", "مساحة المواقف", asset.parkingArea, (v) => up("parkingArea", v), { type: "number", suffix: "m²" })}
            {field("Open Area", "مساحة مفتوحة", asset.openArea, (v) => up("openArea", v), { type: "number", suffix: "m²" })}
          </div>
        )}

        {/* Non-Building: simplified area section */}
        {asset.isBuilding === false && (
          <div style={sectionStyle}>
            {sectionTitle("Land & Area", "الأرض والمساحة")}
            {field("Plot Area", "مساحة الأرض", asset.plotArea, (v) => up("plotArea", v), { type: "number", suffix: "m²" })}
            {field("Open Area", "مساحة مفتوحة", asset.openArea, (v) => up("openArea", v), { type: "number", suffix: "m²" })}
          </div>
        )}

        {/* Section 3: Phase & Timeline (US-007) */}
        <div style={sectionStyle}>
          {sectionTitle("Phase & Timeline", "المرحلة والجدول الزمني")}
          {field("Phase", "المرحلة", asset.phase, (v) => up("phase", v), {
            options: phasesArr.map(p => ({ value: p.name, label: p.name }))
          })}
          {field("Start Year", "سنة البداية", asset.startYear || asset.constrStart, (v) => up("startYear", v), { type: "number" })}
          {field("Build Duration (months)", "مدة البناء (شهور)", asset.constrDuration, (v) => up("constrDuration", v), { type: "number" })}
          {field("Opening Year", "سنة الافتتاح", asset.openingYear, (v) => up("openingYear", v), { type: "number" })}
          {field("Priority", "الأولوية", asset.assetPriority, (v) => up("assetPriority", v), {
            options: [
              { value: "anchor", label: "Anchor", labelAr: "رئيسي" },
              { value: "quickWin", label: "Quick Win", labelAr: "سريع" },
              { value: "standard", label: "Standard", labelAr: "عادي" },
              { value: "optional", label: "Optional", labelAr: "اختياري" },
            ]
          })}
        </div>

        {/* Section 4: Financial */}
        <div style={sectionStyle}>
          {sectionTitle("Financial Summary", "الملخص المالي")}
          {field("Revenue Type", "نوع الإيراد", asset.revType, (v) => up("revType", v), {
            options: [
              { value: "Lease", label: "Lease", labelAr: "تأجير" },
              { value: "Operating", label: "Operating", labelAr: "تشغيل" },
              { value: "Sale", label: "Sale", labelAr: "بيع" },
            ]
          })}
          {field("Cost / m²", "تكلفة / م²", asset.costPerSqm, (v) => up("costPerSqm", v), { type: "number", suffix: "SAR" })}
          {field("Lease Rate / m²", "إيجار / م²", asset.leaseRate, (v) => up("leaseRate", v), {
            type: "number", suffix: "SAR",
            hidden: asset.revType !== "Lease"
          })}
          {field("EBITDA", "الأرباح التشغيلية", asset.opEbitda, (v) => up("opEbitda", v), {
            type: "number", suffix: "SAR",
            hidden: asset.revType !== "Operating"
          })}
        </div>
      </div>
    </>
  );
}
