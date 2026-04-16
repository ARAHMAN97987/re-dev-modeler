// SegmentedControl — iOS/macOS segmented picker.
// Controlled: pass `value` and `onChange`.
import React from "react";

export default function SegmentedControl({
  value,
  onChange,
  options = [], // [{ value, label, icon? }]
  size = "md",
  block = false,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`z-segmented ${className}`}
      role="tablist"
      style={{ width: block ? "100%" : undefined, ...style }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            className={`z-segmented-item ${active ? "z-segmented-item-active" : ""}`}
            style={{
              flex: block ? 1 : undefined,
              padding: size === "sm" ? "3px 10px" : "5px 12px",
              fontSize: size === "sm" ? 11 : 12,
            }}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.icon && <span aria-hidden="true" style={{ marginInlineEnd: 6 }}>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
