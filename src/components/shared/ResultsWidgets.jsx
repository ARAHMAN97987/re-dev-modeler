/**
 * Shared results display widgets — used across WaterfallView, SelfResultsView, BankResultsView
 * Extracted from App.jsx to eliminate 3x duplication of each component.
 */

/** Colored badge with label + value */
export const Badge = ({ label, value, color }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    background: color + "18", color,
    borderRadius: "var(--radius-sm)", padding: "3px 8px",
    fontSize: 10, fontWeight: 700,
  }}>
    {label} <strong>{value}</strong>
  </span>
);

/** Key-ratio display: label left, value right */
export const KR = ({ l, v, c, bold }) => (
  <>
    <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{l}</span>
    <span style={{ textAlign: "right", fontWeight: bold ? 700 : 500, fontSize: 11, color: c || "var(--text-primary)" }}>{v}</span>
  </>
);

/** Section header — uppercase divider */
export const SecHd = ({ text }) => (
  <div style={{
    gridColumn: "1/-1", fontSize: 10, fontWeight: 700,
    letterSpacing: 0.8, textTransform: "uppercase",
    color: "var(--text-tertiary)", paddingTop: 6,
    borderTop: "0.5px solid var(--surface-separator)", marginTop: 2,
  }}>
    {text}
  </div>
);
