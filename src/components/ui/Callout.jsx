// Callout — Apple-style notice banner (info / success / warning / danger).
import React from "react";

const toneClass = {
  info:    "z-callout z-callout-info",
  success: "z-callout z-callout-success",
  warning: "z-callout z-callout-warning",
  danger:  "z-callout z-callout-danger",
};

const defaultIcon = {
  info:    "ⓘ",
  success: "✓",
  warning: "⚠",
  danger:  "⚠",
};

export default function Callout({
  tone = "info",
  title = null,
  icon = null,
  actions = null,
  className = "",
  style = {},
  children,
}) {
  return (
    <div className={`${toneClass[tone] || toneClass.info} ${className}`} style={style}>
      <div aria-hidden="true" style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
        {icon ?? defaultIcon[tone]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: children ? 4 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 12, lineHeight: 1.55 }}>{children}</div>}
        {actions && <div style={{ marginTop: 8, display: "flex", gap: 8 }}>{actions}</div>}
      </div>
    </div>
  );
}
