// Toggle — iOS-style switch.
import React from "react";

export default function Toggle({
  checked = false,
  onChange,
  disabled = false,
  size = "md", // "sm" | "md"
  label = null,
  description = null,
  className = "",
  id,
}) {
  const handleClick = () => { if (!disabled) onChange?.(!checked); };
  const btn = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`z-toggle ${size === "sm" ? "z-toggle-sm" : ""} ${checked ? "active" : ""} ${className}`}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    />
  );

  if (!label) return btn;

  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
        {description && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{description}</span>}
      </div>
      {btn}
    </label>
  );
}
