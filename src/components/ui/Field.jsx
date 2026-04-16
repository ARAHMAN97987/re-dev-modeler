// Field — Apple-style form row: label + control + hint/error
import React from "react";

export default function Field({
  label = null,
  hint = null,
  error = null,
  trailing = null,
  required = false,
  layout = "stacked", // "stacked" | "inline"
  className = "",
  style = {},
  children,
}) {
  if (layout === "inline") {
    return (
      <div className={`z-field ${className}`} style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
        {label && (
          <label className="z-label" style={{ margin: 0, flex: "0 0 auto", minWidth: 140 }}>
            {label}
            {required && <span style={{ color: "var(--color-danger)" }}> *</span>}
          </label>
        )}
        <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>{children}</div>
          {trailing}
        </div>
        {(hint || error) && (
          <div style={{ flex: "0 0 auto" }}>
            {error
              ? <span className="z-field-error">{error}</span>
              : <span className="z-field-hint">{hint}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`z-field ${className}`} style={style}>
      {label && (
        <label className="z-label">
          {label}
          {required && <span style={{ color: "var(--color-danger)" }}> *</span>}
          {trailing && <span style={{ float: "inline-end" }}>{trailing}</span>}
        </label>
      )}
      {children}
      {error && <div className="z-field-error">{error}</div>}
      {!error && hint && <div className="z-field-hint">{hint}</div>}
    </div>
  );
}
