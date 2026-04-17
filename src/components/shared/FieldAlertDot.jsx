/**
 * FieldAlertDot — tiny colored circle next to input fields
 * Shows highest severity alert for a field. Click to see details.
 */
import { useState } from "react";

const COLORS = {
  critical: "var(--sys-red)",
  error:    "var(--sys-red)",
  warning:  "var(--sys-orange)",
  info:     "var(--sys-blue)",
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
            background: "var(--surface-1)",
            border: "1px solid var(--hairline)", borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: "8px 12px",
            minWidth: 240, maxWidth: 320, fontSize: 11, lineHeight: 1.5,
          }}
        >
          {alerts.map((a, i) => (
            <div key={i} style={{ marginBottom: i < alerts.length - 1 ? 6 : 0 }}>
              <div style={{ fontWeight: 600, color: COLORS[a.severity] }}>{a.ar}</div>
              <div style={{ color: "var(--text-secondary)" }}>{a.en}</div>
              {a.source && <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>📚 {a.source}</div>}
            </div>
          ))}
          <div
            onClick={() => setShow(false)}
            style={{ textAlign: "center", marginTop: 4, fontSize: 9, color: "var(--text-tertiary)", cursor: "pointer" }}
          >
            ✕ {ar ? "إغلاق" : "Close"}
          </div>
        </div>
      )}
    </span>
  );
}
