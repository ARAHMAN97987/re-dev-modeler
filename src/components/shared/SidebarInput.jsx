/**
 * SidebarInput — Memo'd input for sidebar fields (numbers with formatting)
 * Extracted from App.jsx during deduplication (2026-03-31)
 */
import { useState, useEffect, useRef, memo } from "react";
import { sideInputStyle } from "./styles";

const SidebarInput = memo(function SidebarInput({ value, onChange, type = "text", placeholder, step, style: sx }) {
  const [local, setLocal] = useState(String(value ?? ""));
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && !focused) {
      setLocal(String(value ?? ""));
    }
    prevValue.current = value;
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    if (type === "number") {
      const raw = local.replace(/,/g, "");
      const n = parseFloat(raw);
      onChange(isNaN(n) ? 0 : n);
    } else onChange(local);
  };

  const handleFocus = () => {
    setFocused(true);
    setLocal(String(value ?? ""));
  };

  const displayValue = (!focused && type === "number" && value !== "" && value !== 0 && value != null)
    ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })
    : local;

  return (
    <input
      ref={ref}
      className="sidebar-input"
      type="text"
      inputMode={type === "number" ? "decimal" : undefined}
      value={focused ? local : displayValue}
      onChange={e => setLocal(e.target.value)}
      onFocus={handleFocus}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { commit(); ref.current?.blur(); } }}
      style={{ ...sideInputStyle, ...sx }}
      placeholder={placeholder}
    />
  );
});

export default SidebarInput;
