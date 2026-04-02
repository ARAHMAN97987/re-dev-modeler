/**
 * FieldAlertDot — tiny colored circle next to input fields
 * Shows highest severity alert for a field. Click to see details.
 */
import { useState } from "react";

const COLORS = {
  critical: "#ef4444",
  error: "#f87171",
  warning: "#f59e0b",
  info: "#60a5fa",
};

export default function FieldAlertDot({ alerts, lang }) {
  const [show, setShow] = useState(false);
  if (!alerts || alerts.length === 0) return null;

  const ar = lang === "ar";
  // highest severity
  const sev = alerts.find(a => a.severity === "critical")?.severity
    || alerts.find(a => a.severity === "error")?.severity
    || alerts.find(a => a.severity === "warning")?.severity
    || "info";

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        style={{
          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
          background: COLORS[sev], cursor: "pointer", verticalAlign: "middle",
          marginInlineStart: 3, flexShrink: 0,
        }}
        title={alerts[0]?.[ar ? "ar" : "en"] || ""}
      />
      {show && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: 14, [ar ? "right" : "left"]: 0, zIndex: 100,
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)", padding: "8px 12px",
            minWidth: 240, maxWidth: 320, fontSize: 11, lineHeight: 1.5,
          }}
        >
          {alerts.map((a, i) => (
            <div key={i} style={{ marginBottom: i < alerts.length - 1 ? 6 : 0 }}>
              <div style={{ fontWeight: 600, color: COLORS[a.severity] }}>{a.ar}</div>
              <div style={{ color: "#6b7080" }}>{a.en}</div>
              {a.source && <div style={{ fontSize: 9, color: "#9ca3af" }}>📚 {a.source}</div>}
            </div>
          ))}
          <div
            onClick={() => setShow(false)}
            style={{ textAlign: "center", marginTop: 4, fontSize: 9, color: "#9ca3af", cursor: "pointer" }}
          >
            ✕ {ar ? "إغلاق" : "Close"}
          </div>
        </div>
      )}
    </span>
  );
}
