// Stat — inline label: value row (for dense tables, e.g., "Equity Multiple: 1.8×")
import React from "react";

export default function Stat({
  label,
  value,
  unit = null,
  tone = "neutral",
  size = "md",
  mono = true,
  className = "",
  style = {},
}) {
  const valueColor = {
    neutral:  "var(--text-primary)",
    positive: "var(--text-positive)",
    negative: "var(--text-negative)",
    warning:  "var(--color-warning-text)",
    info:     "var(--color-info-text)",
    muted:    "var(--text-secondary)",
  }[tone];

  const valueSize = size === "lg" ? 17 : size === "sm" ? 12 : 14;
  const labelSize = size === "lg" ? 13 : size === "sm" ? 11 : 12;

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "6px 0", ...style }}
    >
      <span style={{ fontSize: labelSize, color: "var(--text-secondary)" }}>{label}</span>
      <span
        data-numeric={mono ? "" : undefined}
        style={{
          fontSize: valueSize,
          fontWeight: 600,
          color: valueColor,
          fontFamily: mono ? "var(--font-family)" : undefined,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
        {unit && <span style={{ fontWeight: 400, color: "var(--text-tertiary)", marginInlineStart: 3 }}>{unit}</span>}
      </span>
    </div>
  );
}
