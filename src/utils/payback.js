/**
 * Payback year calculation — finds the year when cumulative CF turns positive
 * Used by: SelfResultsView, BankResultsView, WaterfallView, ProjectDash
 * @param {number[]} cf - Annual cash flow array
 * @returns {number|null} Year number (1-based) when payback occurs, or null
 */
export const calcPaybackYear = (cf) => {
  let cum = 0, wasNeg = false;
  for (let y = 0; y < cf.length; y++) {
    cum += cf[y] || 0;
    if (cum < -1) wasNeg = true;
    if (wasNeg && cum >= 0) return y + 1;
  }
  return null;
};
