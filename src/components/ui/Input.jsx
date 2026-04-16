// Input — Apple-style text input wrapper. Forwards all props to native input.
import React, { forwardRef } from "react";

const Input = forwardRef(function Input(
  { size = "md", blue = false, className = "", type = "text", ...rest },
  ref
) {
  const cls = [
    "z-input",
    blue ? "z-input-blue" : "",
    size === "sm" ? "z-input-sm" : "",
    size === "lg" ? "z-input-lg" : "",
    className,
  ].filter(Boolean).join(" ");
  return <input ref={ref} type={type} className={cls} {...rest} />;
});

export default Input;

// Select variant (adds chevron)
export const Select = forwardRef(function Select(
  { size = "md", blue = false, className = "", options = null, children, ...rest },
  ref
) {
  const cls = [
    "z-input z-select",
    blue ? "z-input-blue" : "",
    size === "sm" ? "z-input-sm" : "",
    size === "lg" ? "z-input-lg" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <select ref={ref} className={cls} {...rest}>
      {options
        ? options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))
        : children}
    </select>
  );
});

// Textarea variant
export const Textarea = forwardRef(function Textarea(
  { className = "", rows = 3, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`z-input ${className}`}
      style={{ height: "auto", padding: "8px 12px", resize: "vertical", lineHeight: 1.5 }}
      {...rest}
    />
  );
});
