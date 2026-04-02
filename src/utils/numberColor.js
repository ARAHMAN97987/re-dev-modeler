/**
 * Number coloring utility — red for negative, green/dark for positive, gray for zero
 * Used by: WaterfallView, ResultsView, FinancingView, App.jsx tables
 * @param {number} v - The numeric value
 * @param {boolean} dark - Use dark theme colors (CSS vars)
 * @returns {string} CSS color value
 */
export const nc = (v, dark = false) => {
  if (dark) {
    return v < 0 ? "#ef4444" : v > 0 ? "var(--text-primary)" : "#d0d4dc";
  }
  return v < 0 ? "#ef4444" : v > 0 ? "#1a1d23" : "#9ca3af";
};
