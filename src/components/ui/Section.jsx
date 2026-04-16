// Section — Apple-style collapsible group (like Settings panels).
import React, { useState } from "react";

export default function Section({
  title,
  subtitle = null,
  trailing = null,
  defaultOpen = true,
  collapsible = true,
  className = "",
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const header = (
    <div
      onClick={collapsible ? () => setOpen(!open) : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: collapsible ? "pointer" : "default",
        padding: "10px 14px",
        borderBottom: open ? "0.5px solid var(--border-default)" : "none",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {collapsible && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 10,
              fontSize: 10,
              color: "var(--text-tertiary)",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 120ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >▶</span>
        )}
        <div>
          <div className="z-headline" style={{ margin: 0, fontSize: 15 }}>{title}</div>
          {subtitle && <div className="z-footnote" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {trailing && <div onClick={(e) => e.stopPropagation()}>{trailing}</div>}
    </div>
  );

  return (
    <div
      className={className}
      style={{
        background: "var(--surface-card)",
        border: "0.5px solid var(--border-default)",
        borderRadius: 12,
        boxShadow: "var(--shadow-xs)",
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {header}
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}
