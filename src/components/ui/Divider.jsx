// Divider — Apple-style separator (horizontal or vertical).
import React from "react";

export default function Divider({
  orientation = "horizontal",
  spacing = 16,
  label = null,
  className = "",
  style = {},
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={className}
        style={{
          width: "0.5px",
          background: "var(--border-default)",
          margin: `0 ${spacing}px`,
          alignSelf: "stretch",
          ...style,
        }}
      />
    );
  }

  if (label) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: `${spacing}px 0`,
          ...style,
        }}
      >
        <div style={{ flex: 1, height: "0.5px", background: "var(--border-default)" }} />
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <div style={{ flex: 1, height: "0.5px", background: "var(--border-default)" }} />
      </div>
    );
  }

  return (
    <hr
      className={`z-divider ${className}`}
      style={{ margin: `${spacing}px 0`, ...style }}
    />
  );
}
