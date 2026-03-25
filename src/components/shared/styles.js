// Shared inline style objects — extracted from App.jsx lines 12138-12146
// These are used across many components. Will be replaced with CSS classes in Phase 2.

export const btnS = { border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" };
export const btnPrim = { ...btnS, background: "#2563eb", color: "#fff", fontWeight: 600 };
export const btnSm = { ...btnS, padding: "4px 8px", fontSize: 11, fontWeight: 500, borderRadius: 4 };
export const sideInputStyle = { width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid #282d3a", background: "#0F2D4F", color: "#d0d4dc", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
export const cellInputStyle = { padding: "4px 6px", borderRadius: 3, border: "1px solid transparent", background: "transparent", color: "#1a1d23", fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box", width: "100%" };
export const tblStyle = { width: "100%", borderCollapse: "collapse" };
export const thSt = { padding: "7px 8px", textAlign: "start", fontSize: 10, fontWeight: 600, color: "#6b7080", background: "#f8f9fb", borderBottom: "1px solid #e5e7ec", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.3 };
export const tdSt = { padding: "5px 8px", borderBottom: "1px solid #f0f1f5", fontSize: 12, whiteSpace: "nowrap" };
export const tdN = { ...tdSt, textAlign: "right", fontVariantNumeric: "tabular-nums" };
