// Card — Apple HIG grouped container
// variants: default | elevated | flat | compact
import React from "react";

export default function Card({
  variant = "default",
  title = null,
  subtitle = null,
  trailing = null,
  padding = undefined,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const classes = [
    "z-card",
    variant === "elevated" ? "z-card-elevated" : "",
    variant === "flat"     ? "z-card-flat" : "",
    variant === "compact"  ? "z-card-compact" : "",
    className,
  ].filter(Boolean).join(" ");

  const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: subtitle ? 4 : 12 };

  return (
    <div className={classes} style={{ padding, ...style }} {...rest}>
      {(title || trailing) && (
        <div style={headerStyle}>
          <div>
            {title && <div className="z-card-title" style={{ margin: 0 }}>{title}</div>}
            {subtitle && <div className="z-footnote" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
          {trailing && <div>{trailing}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
