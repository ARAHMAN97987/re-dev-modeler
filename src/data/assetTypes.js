// Asset Development Engine - Type Definitions
// Phase 1: US-001 Asset Type System

export const ASSET_TYPES = {
  retail_lifestyle: { label: "Retail Lifestyle", labelAr: "تجزئة لايف ستايل", isBuilding: true, category: "Retail" },
  mall: { label: "Mall", labelAr: "مول تجاري", isBuilding: true, category: "Retail" },
  office: { label: "Office", labelAr: "مكاتب", isBuilding: true, category: "Office" },
  residential_villas: { label: "Residential Villas", labelAr: "فلل سكنية", isBuilding: true, category: "Residential" },
  residential_multifamily: { label: "Residential Multifamily", labelAr: "سكني متعدد", isBuilding: true, category: "Residential" },
  serviced_apartments: { label: "Serviced Apartments", labelAr: "شقق مخدومة", isBuilding: true, category: "Hospitality" },
  hotel: { label: "Hotel", labelAr: "فندق", isBuilding: true, category: "Hospitality" },
  resort: { label: "Resort", labelAr: "منتجع", isBuilding: true, category: "Hospitality" },
  marina: { label: "Marina", labelAr: "مرسى", isBuilding: true, category: "Marina" },
  yacht_club: { label: "Yacht Club", labelAr: "نادي يخوت", isBuilding: true, category: "Marina" },
  sports_land_lease: { label: "Sports / Land Lease", labelAr: "رياضي / تأجير أرض", isBuilding: false, category: "Other" },
  parking_structure: { label: "Parking Structure", labelAr: "مبنى مواقف", isBuilding: true, category: "Other" },
  public_realm: { label: "Public Realm", labelAr: "مجال عام", isBuilding: false, category: "Other" },
  infrastructure_package: { label: "Infrastructure Package", labelAr: "حزمة بنية تحتية", isBuilding: false, category: "Other" },
  utility_asset: { label: "Utility Asset", labelAr: "أصل خدمي", isBuilding: false, category: "Other" },
};

export const ASSET_TYPE_OPTIONS = Object.entries(ASSET_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
  labelAr: val.labelAr,
  isBuilding: val.isBuilding,
  category: val.category,
}));

// Map old category to new assetType (for migration)
export function migrateCategory(category, asset) {
  if (category === "Retail") return "retail_lifestyle";
  if (category === "Office") return "office";
  if (category === "Residential") return "residential_multifamily";
  if (category === "Marina") return "marina";
  if (category === "Hospitality") {
    if (asset?.hotelPL) return "hotel";
    return "serviced_apartments";
  }
  return "retail_lifestyle"; // fallback
}

// Get category from assetType (for backward compatibility with engine)
export function getCategoryFromType(assetType) {
  return ASSET_TYPES[assetType]?.category || "Retail";
}
