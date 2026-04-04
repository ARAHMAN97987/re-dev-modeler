// Area Benchmarks and Derivation Logic
// Asset Development Engine - Task 5

export const EFFICIENCY_BENCHMARKS = {
  retail_lifestyle: { efficiency: 75, areaLabel: "GLA", labelAr: "مساحة قابلة للتأجير" },
  mall:             { efficiency: 70, areaLabel: "GLA", labelAr: "مساحة قابلة للتأجير" },
  office:           { efficiency: 80, areaLabel: "NLA", labelAr: "صافي المساحة" },
  residential_villas:      { efficiency: 90, areaLabel: "NSA", labelAr: "صافي مساحة البيع" },
  residential_multifamily: { efficiency: 82, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  serviced_apartments:     { efficiency: 75, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  hotel:            { efficiency: 65, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  resort:           { efficiency: 55, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  marina:           { efficiency: 100, areaLabel: "Berth Area", labelAr: "مساحة الأرصفة" },
  yacht_club:       { efficiency: 70, areaLabel: "NUA", labelAr: "صافي المساحة" },
  parking_structure: { efficiency: 95, areaLabel: "Parking NUA", labelAr: "صافي مساحة المواقف" },
};

// Area basis definitions
export const AREA_BASES = {
  gfa:   { label: "Per GFA (m²)", labelAr: "لكل م² إجمالي", field: "gfa" },
  unit:  { label: "Per Unit",     labelAr: "لكل وحدة",       field: "unitCount" },
  key:   { label: "Per Key",      labelAr: "لكل غرفة",       field: "keyCount" },
  berth: { label: "Per Berth",    labelAr: "لكل رصيف",       field: "berthCount" },
  land:  { label: "Per Land Area (m²)", labelAr: "لكل م² أرض", field: "plotArea" },
};

// Derive areas from base inputs
export function deriveAreas(asset) {
  const eff = (asset.efficiency || 85) / 100;
  const gfa = asset.gfa || 0;
  const plotArea = asset.plotArea || 0;
  const footprint = asset.footprint || 0;

  return {
    // Net area = GFA × efficiency (same as engine calculates)
    netArea: Math.round(gfa * eff),

    // Coverage
    coveragePct: plotArea > 0 ? Math.round((footprint / plotArea) * 100 * 10) / 10 : 0,

    // FAR
    far: plotArea > 0 ? Math.round((gfa / plotArea) * 100) / 100 : 0,

    // Leasable area (for display - engine calculates its own)
    leasableArea: Math.round(gfa * eff),
  };
}

// Get benchmark efficiency for asset type
export function getBenchmarkEfficiency(assetType) {
  return EFFICIENCY_BENCHMARKS[assetType]?.efficiency || 85;
}

// Get appropriate area label for asset type
export function getAreaLabel(assetType, lang = "en") {
  const bench = EFFICIENCY_BENCHMARKS[assetType];
  if (!bench) return lang === "ar" ? "صافي المساحة" : "Net Area";
  return lang === "ar" ? bench.labelAr : bench.areaLabel;
}
