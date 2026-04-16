// KpiTile — Apple Stocks / Numbers-inspired metric tile.
// Large tabular number + label + optional delta chip.
import React from "react";

export default function KpiTile({
  label,
  value,
  sublabel = null,
  delta = null,           // string like "+2.3%" or { value, positive }
  tone = "neutral",       // neutral | positive | negative | warning | info
  size = "md",            // sm | md | lg
  icon = null,
  onClick = null,
  className = "",
  style = {},
}) {
  const valueSize = size === "lg" ? 28 : size === "sm" ? 18 : 22;
  const labelSize = size === "lg" ? 13 : size === "sm" ? 11 : 12;
  const accent = {
    neutral:  "var(--text-primary)",
    positive: "var(--text-positive)",
    negative: "var(--text-negative)",
    warning:  "var(--color-warning-text)",
    info:     "var(--color-info-text)",
  }[tone];

  let deltaNode = null;
  if (delta != null && delta !== "") {
    const positive = typeof delta === "object" ? delta.positive : String(delta).trim().startsWith("+");
    const txt = typeof delta === "object" ? delta.value : delta;
    deltaNode = (
      <span
        className={positive ? "z-kpi-delta z-kpi-delta-pos" : "z-kpi-delta z-kpi-delta-neg"}
        style={{ marginTop: 4 }}
      >
        {positive ? "▲" : "▼"} {txt}
      </span>
    );
  }

  return (
    <div
      className={`z-kpi ${className}`}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
      onClick={onClick || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div className="z-kpi-label" style={{ fontSize: labelSize, margin: 0 }}>{label}</div>
        {icon}
      </div>
      <div
        className="z-kpi-value"
        data-numeric=""
        style={{ fontSize: valueSize, color: accent, lineHeight: 1.1 }}
      >
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3 }}>{sublabel}</div>
      )}
      {deltaNode}
    </div>
  );
}
