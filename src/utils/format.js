/**
 * ZAN Financial Engine — Number Formatters
 * @module utils/format
 * 
 * Zero dependencies. Used everywhere in UI and csv export.
 */

export const fmt = (n, d = 0) => { if (n == null || isNaN(n)) return "—"; return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
export const fmtPct = (n) => { if (n == null || isNaN(n)) return "—"; return Number(n).toFixed(2) + "%"; };
export const fmtM = (n) => { if (!n || isNaN(n)) return "—"; const a = Math.abs(n); if (a >= 1e9) return (n/1e9).toFixed(2)+"B"; if (a >= 1e6) return (n/1e6).toFixed(1)+"M"; if (a >= 1e3) return (n/1e3).toFixed(0)+"K"; return fmt(n); };
