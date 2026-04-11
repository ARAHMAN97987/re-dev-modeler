/**
 * formatDate — locale-aware date formatter
 * Converts ISO date string to localized long-form date
 */
export function formatDate(iso, lang = 'ar') {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
