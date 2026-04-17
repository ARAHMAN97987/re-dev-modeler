/**
 * SmartReviewerPanel — المراجع الذكي
 * Displays Smart Reviewer alerts grouped by severity.
 * READ-ONLY: never modifies any data.
 */
import { useState } from "react";

// Apple HIG — uses CSS vars for accent; tints built at call-site via color-mix.
const SEV = {
  critical: { icon: "⛔", accent: "var(--sys-red)",    label_ar: "حرج",    label_en: "Critical" },
  error:    { icon: "❌", accent: "var(--sys-red)",    label_ar: "خطأ",    label_en: "Error"    },
  warning:  { icon: "⚠️", accent: "var(--sys-orange)", label_ar: "تحذير",  label_en: "Warning"  },
  info:     { icon: "ℹ️", accent: "var(--sys-blue)",   label_ar: "معلومة", label_en: "Info"     },
};

/** Scan results object for NaN/Infinity in key financial metrics and return extra alerts */
function detectCalcErrors(results, ar) {
  if (!results) return [];
  const checks = [
    { key: "irr", field: results.irr, label_ar: "IRR المشروع", label_en: "Project IRR" },
    { key: "npv", field: results.npv, label_ar: "NPV", label_en: "NPV" },
    { key: "moic", field: results.moic, label_ar: "MOIC", label_en: "MOIC" },
    { key: "dscr", field: results.minDSCR, label_ar: "الحد الأدنى DSCR", label_en: "Min DSCR" },
    { key: "totalRev", field: results.totalRevenue, label_ar: "إجمالي الإيرادات", label_en: "Total Revenue" },
  ];
  return checks
    .filter(c => !Number.isFinite(c.field))
    .map(c => ({
      id: `calc-err-${c.key}`,
      severity: "error",
      ar: `خطأ حساب: ${c.label_ar} = ${c.field}`,
      en: `Calculation error: ${c.label_en} = ${c.field}`,
      source: "Engine",
    }));
}

export default function SmartReviewerPanel({ alerts, lang, summary, onAskAI, results }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const ar = lang === "ar";

  const calcErrAlerts = detectCalcErrors(results, ar);
  const allAlerts = [...calcErrAlerts, ...(alerts || [])];

  if (allAlerts.length === 0) return null;

  const visible = allAlerts.filter(a => !dismissed.has(a.id + (a.assetIndex !== undefined ? '-' + a.assetIndex : '')));
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
      {(() => {
        const headAccent = critCount > 0 ? "var(--sys-red)" : warnCount > 0 ? "var(--sys-orange)" : "var(--sys-blue)";
        const headBg = `color-mix(in srgb, ${headAccent} 8%, transparent)`;
        const headBorder = `color-mix(in srgb, ${headAccent} 22%, transparent)`;
        return (<>
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
              background: headBg,
              border: `1px solid ${headBorder}`,
              borderRadius: expanded ? "10px 10px 0 0" : 10,
              cursor: "pointer", userSelect: "none",
              transition: "all 0.2s var(--ease-quart)",
            }}
          >
            <span style={{ fontSize: 16 }}>🔍</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              {ar ? "المراجع الذكي" : "Smart Reviewer"}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{badgeParts.join("  ")}</span>
            <span style={{ marginInlineStart: "auto", fontSize: 10, color: "var(--text-tertiary)" }}>
              {expanded ? (ar ? "إخفاء ▲" : "Hide ▲") : (ar ? "عرض ▼" : "Show ▼")}
            </span>
          </div>

          {/* Expanded content */}
          {expanded && (
            <div style={{
              border: `1px solid ${headBorder}`,
              borderTop: "none", borderRadius: "0 0 10px 10px",
              background: "var(--surface-1)", maxHeight: 400, overflowY: "auto",
            }}>
          {grouped.map(({ sev, items }) => (
            <div key={sev}>
              <div style={{
                padding: "6px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5,
                color: SEV[sev].accent,
                background: `color-mix(in srgb, ${SEV[sev].accent} 6%, transparent)`,
                borderBottom: `0.5px solid color-mix(in srgb, ${SEV[sev].accent} 20%, transparent)`,
              }}>
                {SEV[sev].icon} {ar ? SEV[sev].label_ar : SEV[sev].label_en} ({items.length})
              </div>
              {items.map((alert, i) => (
                <div key={alert.id + '-' + (alert.assetIndex ?? '') + '-' + i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "8px 16px", borderBottom: "0.5px solid var(--hairline)",
                  fontSize: 12, lineHeight: 1.5,
                }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    {alert.assetName && (
                      <span style={{
                        display: "inline-block", fontSize: 9, fontWeight: 600,
                        background: "var(--surface-2)",
                        color: "var(--text-secondary)",
                        borderRadius: 4,
                        padding: "1px 6px", marginBottom: 2, marginInlineEnd: 6,
                        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={alert.assetName}>
                        {alert.assetName}
                      </span>
                    )}
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={alert.ar || alert.en}>{alert.ar}</span>
                    <br />
                    <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{alert.en}</span>
                    {alert.source && (
                      <span style={{ display: "block", fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                        📚 {alert.source}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {onAskAI && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAskAI(alert); }}
                        style={{
                          background: "none",
                          border: "1px solid var(--hairline)", borderRadius: 6,
                          padding: "3px 10px", fontSize: 10,
                          color: "var(--text-secondary)",
                          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                          transition: "all 0.15s var(--ease-quart)",
                        }}
                      >
                        {ar ? "💡 اقترح تعديل" : "💡 Suggest Fix"}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(alert); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 14, color: "var(--text-tertiary)", padding: 2, alignSelf: "center",
                      }}
                      title={ar ? "إخفاء" : "Dismiss"}
                      aria-label={ar ? "إخفاء التنبيه" : "Dismiss alert"}
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
        </>);
      })()}
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
  const accent = crit > 0 ? "var(--sys-red)" : "var(--sys-orange)";
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 9, fontWeight: 600, padding: "2px 7px",
        background: `color-mix(in srgb, ${accent} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
        color: accent,
        borderRadius: 12, cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      🔍 {parts.join(" ")}
    </span>
  );
}
