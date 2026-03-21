/**
 * ZAN Financial Engine — Saudi Market Benchmarks
 * @module data/benchmarks
 * 
 * Depends on: data/defaults.js (defaultHotelPL, defaultMarinaPL)
 * Used by: UI (asset creation, validation badges)
 */

import { defaultHotelPL, defaultMarinaPL } from './defaults.js';

const BENCHMARKS = {
  Retail:       { costPerSqm:[3000,5000], leaseRate:[1500,3000], efficiency:[75,85], rampUpYears:4, stabilizedOcc:90, constrDuration:24 },
  "Hospitality":{ costPerSqm:[8000,16000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:70, constrDuration:36 },
  "Hotel 4★":  { costPerSqm:[8000,12000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:70, constrDuration:36 },
  "Hotel 5★":  { costPerSqm:[10000,16000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:65, constrDuration:42 },
  Office:       { costPerSqm:[2500,4500], leaseRate:[800,1500], efficiency:[85,92], rampUpYears:2, stabilizedOcc:85, constrDuration:30 },
  Residential:  { costPerSqm:[2000,3500], leaseRate:[500,1200], efficiency:[82,90], rampUpYears:2, stabilizedOcc:90, constrDuration:24 },
  Marina:       { costPerSqm:[12000,20000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:4, stabilizedOcc:90, constrDuration:12 },
  Industrial:   { costPerSqm:[1500,2500], leaseRate:[200,500], efficiency:[90,95], rampUpYears:1, stabilizedOcc:85, constrDuration:18 },
  Infrastructure:{ costPerSqm:[1000,3000], leaseRate:[0,0], efficiency:[0,0], rampUpYears:0, stabilizedOcc:100, constrDuration:18 },
};

export function getBenchmark(category) {
  if (!category) return null;
  const cat = category.toLowerCase();
  if (cat.includes("hotel") && cat.includes("5")) return BENCHMARKS["Hotel 5★"];
  if (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")) return BENCHMARKS["Hotel 4★"];
  if (cat.includes("retail") || cat.includes("mall") || cat.includes("commercial")) return BENCHMARKS.Retail;
  if (cat.includes("office")) return BENCHMARKS.Office;
  if (cat.includes("residential") || cat.includes("apartment") || cat.includes("villa")) return BENCHMARKS.Residential;
  if (cat.includes("marina")) return BENCHMARKS.Marina;
  if (cat.includes("industrial") || cat.includes("warehouse") || cat.includes("logistics")) return BENCHMARKS.Industrial;
  if (cat.includes("infrastructure") || cat.includes("parking") || cat.includes("utilities")) return BENCHMARKS.Infrastructure;
  return BENCHMARKS.Retail; // fallback
}

export function benchmarkColor(field, value, category) {
  const bm = getBenchmark(category);
  if (!bm) return { color: null, tip: null };
  const range = bm[field];
  if (!range || !Array.isArray(range)) return { color: null, tip: null };
  const [lo, hi] = range;
  if (lo === 0 && hi === 0) return { color: null, tip: null }; // N/A for this category
  if (value <= 0) return { color: null, tip: null };
  const tip = `${lo.toLocaleString()} – ${hi.toLocaleString()}`;
  if (value >= lo && value <= hi) return { color: "#16a34a", tip };
  if (value > hi * 2 || value < lo * 0.5) return { color: "#ef4444", tip };
  return { color: "#eab308", tip };
}

export function getAutoFillDefaults(category) {
  const bm = getBenchmark(category);
  if (!bm) return {};
  const mid = (arr) => Array.isArray(arr) ? Math.round((arr[0]+arr[1])/2) : 0;
  const base = {
    costPerSqm: mid(bm.costPerSqm),
    efficiency: Array.isArray(bm.efficiency) ? Math.round((bm.efficiency[0]+bm.efficiency[1])/2) : 85,
    rampUpYears: bm.rampUpYears || 3,
    stabilizedOcc: bm.stabilizedOcc || 90,
    constrDuration: bm.constrDuration || 24,
  };
  if (bm.leaseRate && bm.leaseRate[1] > 0) base.leaseRate = mid(bm.leaseRate);
  const cat = (category||"").toLowerCase();
  if (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")) {
    base.revType = "Operating";
    base.efficiency = 0;
    base.leaseRate = 0;
  } else if (cat.includes("marina")) {
    base.revType = "Operating";
    base.efficiency = 0;
    base.leaseRate = 0;
  } else {
    base.revType = "Lease";
  }
  return base;
}

export { BENCHMARKS };
