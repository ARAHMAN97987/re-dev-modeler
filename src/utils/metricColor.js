/**
 * Shared metric coloring utility
 * Used by: App.jsx, ResultsView, FinancingView, WaterfallView, CashFlowView, ProjectDash, PresentationView
 */

export const METRIC_COLORS = { success: "#10b981", warning: "#f59e0b", error: "#ef4444", neutral: "#6b7080", muted: "#9ca3af" };
export const METRIC_COLORS_DARK = { success: "#4ade80", warning: "#fbbf24", error: "#f87171", neutral: "#8b90a0", muted: "#6b7080" };

/**
 * Returns the functional color for a financial metric based on its value.
 * @param {string} metric - One of: IRR, DSCR, LTV, NPV, MOIC, cashFlow
 * @param {number|null} value - The numeric value (IRR as decimal e.g. 0.15, DSCR as ratio, LTV as %, NPV as amount, MOIC as multiple)
 * @param {object} [opts] - Options: { dark: false, raw: false }
 *   dark=true returns lighter colors for dark backgrounds
 *   raw=true returns 'success'|'warning'|'error' instead of hex
 * @returns {string} hex color or level string
 */
export const getMetricColor = (metric, value, opts = {}) => {
  const { dark = false, raw = false } = opts;
  if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
    return raw ? "neutral" : (dark ? METRIC_COLORS_DARK.muted : METRIC_COLORS.muted);
  }
  const palette = dark ? METRIC_COLORS_DARK : METRIC_COLORS;
  let level = "neutral";
  switch (metric) {
    case "IRR":
      level = value >= 0.15 ? "success" : value >= 0.10 ? "warning" : "error";
      break;
    case "DSCR":
      level = value >= 1.5 ? "success" : value >= 1.2 ? "warning" : "error";
      break;
    case "LTV":
      level = value <= 60 ? "success" : value <= 70 ? "warning" : "error";
      break;
    case "NPV":
      level = value > 0 ? "success" : value === 0 ? "warning" : "error";
      break;
    case "MOIC":
      level = value >= 2.0 ? "success" : value >= 1.5 ? "warning" : "error";
      break;
    case "cashFlow":
      level = value > 0 ? "success" : value === 0 ? "neutral" : "error";
      break;
    default:
      return raw ? "neutral" : palette.neutral;
  }
  return raw ? level : palette[level];
};
