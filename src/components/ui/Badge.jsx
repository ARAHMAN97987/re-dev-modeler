// Badge — Apple-style status pill.
import React from "react";

const toneClass = {
  neutral: "z-badge z-badge-neutral",
  success: "z-badge z-badge-success",
  danger:  "z-badge z-badge-danger",
  warning: "z-badge z-badge-warning",
  info:    "z-badge z-badge-info",
};

export default function Badge({
  tone = "neutral",
  dot = false,
  className = "",
  style = {},
  children,
}) {
  const dotColor = {
    neutral: "var(--gray-1)",
    success: "var(--color-success)",
    danger:  "var(--color-danger)",
    warning: "var(--color-warning)",
    info:    "var(--color-info)",
  }[tone];

  return (
    <span className={`${toneClass[tone] || toneClass.neutral} ${className}`} style={style}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block" }} />}
      {children}
    </span>
  );
}
