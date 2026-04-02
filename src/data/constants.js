/**
 * Shared constants — extracted from App.jsx
 * Used by: App.jsx, AssetTable, FinancingView, SidebarAdvisor
 */

export const CATEGORIES = ["Hospitality","Retail","Office","Residential","Flexible","Marina","Cultural","Amenity","Open Space","Utilities","Industrial","Infrastructure"];
export const REV_TYPES = ["Lease","Operating","Sale"];
export const CURRENCIES = ["SAR","USD","AED","EUR","GBP"];
export const SCENARIOS = ["Base Case","CAPEX +10%","CAPEX -10%","Rent +10%","Rent -10%","Delay +6 months","Escalation +0.5%","Escalation -0.5%","Custom"];

export const LAND_TYPES = [
  { value: "lease", en: "Land Lease (Leasehold)", ar: "إيجار أرض (حق انتفاع)" },
  { value: "purchase", en: "Land Purchase (Freehold)", ar: "شراء أرض (تملك حر)" },
  { value: "partner", en: "Land as Equity (Partner)", ar: "أرض كحصة عينية (شراكة)" },
  { value: "bot", en: "Land Swap / BOT", ar: "مبادلة أرض / BOT" },
];

export const HOTEL_PRESETS = {
  "4-Star Hotel": { keys: 230, adr: 548, stabOcc: 70, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 },
  "5-Star Resort": { keys: 175, adr: 920, stabOcc: 73, roomsPct: 64, fbPct: 25, micePct: 7, otherPct: 4, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 55, undistPct: 28, fixedPct: 9 },
};

export const MARINA_PRESET = { berths: 80, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 };
