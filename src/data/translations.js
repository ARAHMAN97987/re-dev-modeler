/**
 * ZAN Financial Engine — Translation Maps
 * @module data/translations
 * 
 * Zero dependencies. Used by UI for bilingual display.
 */

export const CAT_AR = { Hospitality:"ضيافة", Retail:"تجاري", Office:"مكاتب", Residential:"سكني", Flexible:"مرن", Marina:"مارينا", Cultural:"ثقافي", Amenity:"خدمات", "Open Space":"مساحة مفتوحة", Utilities:"مرافق", Industrial:"صناعي", Infrastructure:"بنية تحتية" };
export const REV_AR = { Lease:"إيجار", Operating:"تشغيلي", Sale:"بيع" };
export const catL = (c, ar) => ar ? (CAT_AR[c] || c) : c;
export const revL = (r, ar) => ar ? (REV_AR[r] || r) : r;
