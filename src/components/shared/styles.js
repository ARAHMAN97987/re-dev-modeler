// Shared inline style objects — harmonized with App.jsx (CSS custom properties)
// Used across: ChecksView, IncentivesView, MarketView, ResultsView, FinancingView, etc.

export const btnS = { border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit", transition: "all var(--transition-normal)" };
export const btnPrim = { ...btnS, background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", fontWeight: 600 };
export const btnSm = { ...btnS, padding: "4px 8px", fontSize: 11, fontWeight: 500, borderRadius: "var(--radius-sm)" };
export const sideInputStyle = { width: "100%", padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "0.5px solid var(--nav-btn-border)", background: "var(--nav-btn-bg)", color: "var(--nav-btn-text)", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
export const cellInputStyle = { padding: "4px 6px", borderRadius: 3, border: "1px solid transparent", background: "transparent", color: "var(--text-primary)", fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box", width: "100%" };
export const tblStyle = { width: "100%", borderCollapse: "collapse" };
export const thSt = { padding: "7px 8px", textAlign: "start", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", background: "var(--surface-table-header)", borderBottom: "0.5px solid var(--border-default)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.3 };
export const tdSt = { padding: "5px 8px", borderBottom: "0.5px solid var(--surface-separator)", fontSize: 12, whiteSpace: "nowrap" };
export const tdN = { ...tdSt, textAlign: "right", fontVariantNumeric: "tabular-nums" };
