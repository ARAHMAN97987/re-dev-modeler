// Button — Apple HIG push-button
// variants: primary | secondary | tinted | ghost | danger | destructive | link
// sizes:    xs | sm | md | lg | xl
// Accepts `className` to extend; use `block` for full-width, `pill` for rounded.
import React from "react";

const variantClass = {
  primary:      "z-btn z-btn-primary",
  secondary:    "z-btn z-btn-secondary",
  tinted:       "z-btn z-btn-tinted",
  ghost:        "z-btn z-btn-ghost",
  danger:       "z-btn z-btn-danger",
  destructive:  "z-btn z-btn-destructive-ghost",
  link:         "z-btn z-btn-link",
  teal:         "z-btn z-btn-teal",
};

const sizeClass = {
  xs: "z-btn-xs",
  sm: "z-btn-sm",
  md: "",
  lg: "z-btn-lg",
  xl: "z-btn-xl",
};

export default function Button({
  variant = "secondary",
  size = "md",
  pill = false,
  block = false,
  leadingIcon = null,
  trailingIcon = null,
  className = "",
  children,
  ...rest
}) {
  const cls = [
    variantClass[variant] || variantClass.secondary,
    sizeClass[size] || "",
    pill ? "z-btn-pill" : "",
    block ? "z-btn-block" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} {...rest}>
      {leadingIcon && <span aria-hidden="true">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
}
