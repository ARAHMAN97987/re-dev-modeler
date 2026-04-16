// EmptyState — Apple-style placeholder when no data.
import React from "react";

export default function EmptyState({
  icon = "∅",
  title,
  description = null,
  action = null,
  className = "",
  style = {},
}) {
  return (
    <div className={`z-empty ${className}`} style={style}>
      <div className="z-empty-icon" aria-hidden="true" style={{ fontSize: 22 }}>{icon}</div>
      <div className="z-empty-title">{title}</div>
      {description && <div className="z-empty-desc">{description}</div>}
      {action}
    </div>
  );
}
