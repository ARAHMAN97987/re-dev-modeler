/**
 * formatCurrency — locale-aware currency formatter
 * Uses Intl.NumberFormat for proper Arabic/English formatting
 */
export function formatCurrency(value, lang = 'ar', currency = 'SAR') {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
