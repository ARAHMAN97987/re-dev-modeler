/**
 * SmartReviewerPanel — المراجع الذكي
 * Displays Smart Reviewer alerts grouped by severity.
 * READ-ONLY: never modifies any data.
 */
import { useState } from "react";

const SEV = {
  critical: { icon: "⛔", bg: "#fef2f2", border: "#ef4444", text: "#991b1b", label_ar: "حرج", label_en: "Critical" },
  error:    { icon: "❌", bg: "#fef2f2", border: "#f87171", text: "#b91c1c", label_ar: "خطأ", label_en: "Error" },
  warning:  { icon: "⚠️", bg: "#fffbeb", border: "#f59e0b", text: "#92400e", label_ar: "تحذير", label_en: "Warning" },
  info:     { icon: "ℹ️", bg: "#eff6ff", border: "#60a5fa", text: "#1e40af", label_ar: "معلومة", label_en: "Info" },
};

export default function SmartReviewerPanel({ alerts, lang, summary, onAskAI }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const ar = lang === "ar";

  if (!alerts || alerts.length === 0) return null;

  const visible = alerts.filter(a => !dismissed.has(a.id + (a.assetIndex !== undefined ? '-' + a.assetIndex : '')));
  if (visible.length === 0) return null;

  const critCount = visible.filter(a => a.severity === "critical").length;
  const errCount = visible.filter(a => a.severity === "error").length;
  const warnCount = visible.filter(a => a.severity === "warning").length;
  const infoCount = visible.filter(a => a.severity === "info").length;

  const badgeParts = [];
  if (critCount > 0) badgeParts.push(`${critCount} ⛔`);
  if (errCount > 0) badgeParts.push(`${errCount} ❌`);
  if (warnCount > 0) badgeParts.push(`${warnCount} ⚠️`);
  if (infoCount > 0) badgeParts.push(`${infoCount} ℹ️`);

  const dismiss = (alert) => {
    const key = alert.id + (alert.assetIndex !== undefined ? '-' + alert.assetIndex : '');
    setDismissed(prev => new Set([...prev, key]));
  };

  const grouped = ["critical", "error", "warning", "info"].map(sev => ({
    sev,
    items: visible.filter(a => a.severity === sev),
  })).filter(g => g.items.length > 0);

  return (
    <div dir={ar ? "rtl" : "ltr"} style={{ marginBottom: 16 }}>
      {/* Header bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          background: critCount > 0 ? "#fef2f2" : warnCount > 0 ? "#fffbeb" : "#eff6ff",
          border: `1px solid ${critCount > 0 ? "#fca5a5" : warnCount > 0 ? "#fcd34d" : "#93c5fd"}`,
          borderRadius: expanded ? "10px 10px 0 0" : 10,
          cursor: "pointer", userSelect: "none", transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1d23" }}>
          {ar ? "المراجع الذكي" : "Smart Reviewer"}
        </span>
        <span style={{ fontSize: 11, color: "#6b7080" }}>{badgeParts.join("  ")}</span>
        <span style={{ marginInlineStart: "auto", fontSize: 10, color: "#9ca3af" }}>
          {expanded ? (ar ? "إخفاء ▲" : "Hide ▲") : (ar ? "عرض ▼" : "Show ▼")}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{
          border: `1px solid ${critCount > 0 ? "#fca5a5" : warnCount > 0 ? "#fcd34d" : "#93c5fd"}`,
          borderTop: "none", borderRadius: "0 0 10px 10px",
          background: "#fff", maxHeight: 400, overflowY: "auto",
        }}>
          {grouped.map(({ sev, items }) => (
            <div key={sev}>
              <div style={{
                padding: "6px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5, color: SEV[sev].text, background: SEV[sev].bg + "80",
                borderBottom: `0.5px solid ${SEV[sev].border}30`,
              }}>
                {SEV[sev].icon} {ar ? SEV[sev].label_ar : SEV[sev].label_en} ({items.length})
              </div>
              {items.map((alert, i) => (
                <div key={alert.id + '-' + (alert.assetIndex ?? '') + '-' + i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "8px 16px", borderBottom: "0.5px solid #f0f1f5",
                  fontSize: 12, lineHeight: 1.5,
                }}>
                  <div style={{ flex: 1 }}>
                    {alert.assetName && (
                      <span style={{
                        display: "inline-block", fontSize: 9, fontWeight: 600,
                        background: "#e5e7eb", color: "#374151", borderRadius: 3,
                        padding: "1px 6px", marginBottom: 2, marginInlineEnd: 6,
                      }}>
                        {alert.assetName}
                      </span>
                    )}
                    <span style={{ fontWeight: 600, color: "#1a1d23" }}>{alert.ar}</span>
                    <br />
                    <span style={{ color: "#6b7080", fontSize: 11 }}>{alert.en}</span>
                    {alert.source && (
                      <span style={{ display: "block", fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                        📚 {alert.source}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {onAskAI && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAskAI(alert); }}
                        style={{
                          background: "none", border: "1px solid #d1d5db", borderRadius: 4,
                          padding: "2px 8px", fontSize: 10, color: "#6b7280",
                          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        }}
                      >
                        {ar ? "💡 اقترح تعديل" : "💡 Suggest Fix"}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(alert); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 14, color: "#9ca3af", padding: 2, alignSelf: "center",
                      }}
                      title={ar ? "إخفاء" : "Dismiss"}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact badge for KPI bar */
export function SmartReviewerBadge({ alerts, onClick }) {
  if (!alerts || alerts.length === 0) return null;
  const crit = alerts.filter(a => a.severity === "critical").length;
  const warn = alerts.filter(a => a.severity === "warning" || a.severity === "error").length;
  const parts = [];
  if (crit > 0) parts.push(`${crit}⛔`);
  if (warn > 0) parts.push(`${warn}⚠️`);
  if (parts.length === 0) return null;
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 9, fontWeight: 600, padding: "2px 7px",
        background: crit > 0 ? "#fef2f2" : "#fffbeb",
        border: `1px solid ${crit > 0 ? "#fca5a5" : "#fcd34d"}`,
        borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      🔍 {parts.join(" ")}
    </span>
  );
}
