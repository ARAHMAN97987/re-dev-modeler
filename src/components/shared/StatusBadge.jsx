import React, { useState } from "react";
import { btnS } from "./styles";

export default function StatusBadge({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const sts = ["Draft", "In Progress", "Complete"];
  const col = { Draft: { bg: "#f0f1f5", fg: "#6b7080" }, "In Progress": { bg: "#dbeafe", fg: "#2563eb" }, Complete: { bg: "#dcfce7", fg: "#16a34a" } };
  const c = col[status] || col.Draft;
  return (<div style={{ position: "relative" }}>
    <button onClick={() => setOpen(!open)} style={{ ...btnS, background: c.bg, color: c.fg, padding: "4px 12px", fontSize: 11, fontWeight: 600 }}>{status || "Draft"} ▾</button>
    {open && <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--surface-card)", border: "0.5px solid var(--border-default)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" }}>
      {sts.map(s => <button key={s} onClick={() => { onChange(s); setOpen(false); }} style={{ display: "block", width: "100%", padding: "8px 16px", border: "none", background: status === s ? "#f0f1f5" : "#fff", fontSize: 12, cursor: "pointer", textAlign: "start", color: "var(--text-primary)" }}>{s}</button>)}
    </div>}
  </div>);
}
