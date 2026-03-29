/**
 * ZAN Financial Engine — Market Data Automation Engine
 * @module engine/marketData
 *
 * Four-phase pipeline:
 *   Phase 1 – Collection:   Fetch data from APIs / accept uploaded JSON
 *   Phase 2 – Structuring:  Validate, normalize, timestamp, version
 *   Phase 3 – Routing:      Map each field to its platform target
 *   Phase 4 – Application:  Merge into benchmarks & project defaults
 *
 * Storage key: "marketData:latest"  (JSON blob in kv_store)
 * Storage key: "marketData:history" (array of past snapshots)
 *
 * Depends on: data/marketDataSources.js, data/benchmarks.js
 */

import { DATA_SOURCES, FIELD_ROUTING } from '../data/marketDataSources.js';
import { BENCHMARKS } from '../data/benchmarks.js';

// ─── Constants ──────────────────────────────────────────────────────

const STORAGE_KEY_LATEST  = "marketData:latest";
const STORAGE_KEY_HISTORY = "marketData:history";
const MAX_HISTORY = 20;  // Keep last 20 quarterly snapshots (5 years)

// ─── Phase 1: Data Collection ───────────────────────────────────────

/**
 * Fetch data from an API source.
 * Returns raw JSON response or null on failure.
 */
async function fetchApiSource(source) {
  if (!source.url) return null;
  try {
    const res = await fetch(source.url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[MarketData] Failed to fetch ${source.id}:`, err.message);
    return null;
  }
}

/**
 * Collect data from all auto-fetchable sources.
 * Returns { [sourceId]: rawData } for sources that have URLs.
 */
export async function collectFromApis() {
  const results = {};
  const apiSources = DATA_SOURCES.filter(s => s.type === "api" && s.url);
  const fetches = apiSources.map(async (src) => {
    const data = await fetchApiSource(src);
    if (data) results[src.id] = data;
  });
  await Promise.all(fetches);
  return results;
}

// ─── Phase 2: Data Structuring ──────────────────────────────────────

/**
 * Validate and normalize a single data entry.
 * Each entry is: { key: "Retail.costPerSqm", value: 4200, source: "knight-frank-ksa" }
 */
function validateEntry(entry) {
  if (!entry.key || typeof entry.key !== "string") return null;
  if (entry.value === null || entry.value === undefined) return null;
  const numVal = Number(entry.value);
  if (isNaN(numVal) || numVal < 0) return null;
  // Verify the key exists in FIELD_ROUTING
  if (!FIELD_ROUTING[entry.key]) return null;
  return { key: entry.key, value: numVal, source: entry.source || "manual" };
}

/**
 * Create a structured snapshot from raw field entries.
 * @param {Array} entries - Array of { key, value, source }
 * @param {object} [meta] - Optional metadata (quarter, notes)
 * @returns {object} MarketDataSnapshot
 */
export function structureSnapshot(entries, meta = {}) {
  const validated = entries.map(validateEntry).filter(Boolean);
  const data = {};
  for (const e of validated) {
    data[e.key] = { value: e.value, source: e.source };
  }

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    quarter: meta.quarter || getCurrentQuarter(),
    year: meta.year || new Date().getFullYear(),
    notes: meta.notes || "",
    entryCount: validated.length,
    data,
  };
}

/**
 * Returns current quarter string like "Q1-2026"
 */
function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q}-${now.getFullYear()}`;
}

// ─── Phase 3: Data Routing ──────────────────────────────────────────

/**
 * Route a snapshot's data to the correct platform targets.
 * Returns a structured routing result:
 * {
 *   benchmarkUpdates:     { "Retail": { costPerSqm: [low, high] } },
 *   projectDefaults:      { subscriptionFeePct: 2.0, ... },
 *   hotelDefaults:        { "4": { adr: 800 }, "5": { adr: 1200 } },
 *   exitDefaults:         { "Retail": { exitCapRate: 8.5 } },
 * }
 */
export function routeSnapshot(snapshot) {
  const result = {
    benchmarkUpdates: {},
    projectDefaults: {},
    hotelDefaults: {},
    exitDefaults: {},
  };

  if (!snapshot || !snapshot.data) return result;

  for (const [key, entry] of Object.entries(snapshot.data)) {
    const route = FIELD_ROUTING[key];
    if (!route) continue;

    const val = entry.value;

    switch (route.target) {
      case "benchmark": {
        const at = route.assetType;
        if (!result.benchmarkUpdates[at]) result.benchmarkUpdates[at] = {};
        // Store as midpoint; the range will be ±15% around it
        result.benchmarkUpdates[at][route.field] = val;
        break;
      }
      case "projectDefault":
        result.projectDefaults[route.field] = val;
        break;
      case "hotelDefault": {
        const grade = route.grade;
        if (!result.hotelDefaults[grade]) result.hotelDefaults[grade] = {};
        result.hotelDefaults[grade][route.field] = val;
        break;
      }
      case "exitDefault": {
        const at = route.assetType;
        if (!result.exitDefaults[at]) result.exitDefaults[at] = {};
        result.exitDefaults[at][route.field] = val;
        break;
      }
    }
  }

  return result;
}

// ─── Phase 4: Application — Merge into Platform ─────────────────────

/**
 * Apply routed market data to BENCHMARKS object (in-memory).
 * Updates the costPerSqm and leaseRate ranges to ±15% of market midpoint.
 */
export function applyToBenchmarks(routedData) {
  const updates = routedData.benchmarkUpdates;
  const applied = [];

  for (const [assetType, fields] of Object.entries(updates)) {
    if (!BENCHMARKS[assetType]) continue;
    for (const [field, midVal] of Object.entries(fields)) {
      if (!BENCHMARKS[assetType][field]) continue;
      const low  = Math.round(midVal * 0.85);
      const high = Math.round(midVal * 1.15);
      BENCHMARKS[assetType][field] = [low, high];
      applied.push({ assetType, field, range: [low, high] });
    }
  }

  return applied;
}

/**
 * Get suggested project defaults from market data.
 * Returns an object that can be spread into a project.
 * These are SUGGESTIONS — user can override.
 */
export function getMarketDefaults(snapshot) {
  if (!snapshot || !snapshot.data) return {};
  const routed = routeSnapshot(snapshot);
  return {
    ...routed.projectDefaults,
    _marketDataQuarter: snapshot.quarter,
    _marketDataTimestamp: snapshot.timestamp,
  };
}

/**
 * Get suggested hotel P&L defaults from market data.
 * @param {string} grade - "4" or "5"
 */
export function getMarketHotelDefaults(snapshot, grade) {
  if (!snapshot || !snapshot.data) return {};
  const routed = routeSnapshot(snapshot);
  return routed.hotelDefaults[grade] || {};
}

/**
 * Get suggested exit cap rate for an asset type.
 */
export function getMarketExitCapRate(snapshot, assetType) {
  if (!snapshot || !snapshot.data) return null;
  const routed = routeSnapshot(snapshot);
  const exitData = routed.exitDefaults[assetType];
  return exitData ? exitData.exitCapRate : null;
}

// ─── Storage Operations ─────────────────────────────────────────────

/**
 * Save a snapshot as the latest market data.
 * Also appends to history (keeps last MAX_HISTORY snapshots).
 * @param {object} storage - StorageAdapter instance
 * @param {object} snapshot - MarketDataSnapshot
 */
export async function saveSnapshot(storage, snapshot) {
  // Save latest
  await storage.set(STORAGE_KEY_LATEST, JSON.stringify(snapshot));

  // Append to history
  const histRaw = await storage.get(STORAGE_KEY_HISTORY);
  let history = [];
  try {
    if (histRaw && histRaw.value) history = JSON.parse(histRaw.value);
  } catch { /* start fresh */ }

  history.unshift(snapshot);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  await storage.set(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

/**
 * Load the latest market data snapshot.
 * @param {object} storage - StorageAdapter instance
 * @returns {object|null} MarketDataSnapshot
 */
export async function loadLatestSnapshot(storage) {
  const raw = await storage.get(STORAGE_KEY_LATEST);
  if (!raw || !raw.value) return null;
  try {
    return JSON.parse(raw.value);
  } catch {
    return null;
  }
}

/**
 * Load market data history.
 * @param {object} storage - StorageAdapter instance
 * @returns {Array} Array of MarketDataSnapshot
 */
export async function loadHistory(storage) {
  const raw = await storage.get(STORAGE_KEY_HISTORY);
  if (!raw || !raw.value) return [];
  try {
    return JSON.parse(raw.value);
  } catch {
    return [];
  }
}

// ─── Freshness Check ────────────────────────────────────────────────

/**
 * Check if market data is stale (older than 90 days).
 * @param {object} snapshot - MarketDataSnapshot
 * @returns {{ isStale: boolean, daysSinceUpdate: number, quarter: string }}
 */
export function checkFreshness(snapshot) {
  if (!snapshot) return { isStale: true, daysSinceUpdate: Infinity, quarter: "N/A" };
  const updated = new Date(snapshot.timestamp);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  return {
    isStale: daysSinceUpdate > 90,
    daysSinceUpdate,
    quarter: snapshot.quarter,
  };
}

// ─── Full Pipeline ──────────────────────────────────────────────────

/**
 * Run the complete market data update pipeline.
 * This is the main entry point for quarterly updates.
 *
 * @param {object} storage - StorageAdapter instance
 * @param {Array}  manualEntries - Array of { key, value, source } from admin UI or parsed data
 * @param {object} [meta] - Optional { quarter, year, notes }
 * @returns {object} { snapshot, routed, benchmarkChanges }
 */
export async function runMarketDataUpdate(storage, manualEntries, meta = {}) {
  // Phase 1: Collect from APIs (if any are configured)
  const apiData = await collectFromApis();

  // Convert API results to entries (source-specific parsing would go here)
  const apiEntries = [];
  for (const [sourceId, rawData] of Object.entries(apiData)) {
    const src = DATA_SOURCES.find(s => s.id === sourceId);
    if (!src) continue;
    // Generic: if API returns { [fieldKey]: value } format
    for (const field of src.fields) {
      if (rawData[field.key] !== undefined) {
        apiEntries.push({ key: field.key, value: rawData[field.key], source: sourceId });
      }
    }
  }

  // Combine API entries with manual entries (manual takes precedence)
  const allEntries = [...apiEntries];
  const manualKeys = new Set(manualEntries.map(e => e.key));
  for (const apiEntry of apiEntries) {
    if (manualKeys.has(apiEntry.key)) continue; // manual overrides API
  }
  for (const manual of manualEntries) {
    allEntries.push(manual);
  }

  // Phase 2: Structure
  const snapshot = structureSnapshot(allEntries, meta);

  // Phase 3: Route
  const routed = routeSnapshot(snapshot);

  // Phase 4: Apply to benchmarks (in-memory)
  const benchmarkChanges = applyToBenchmarks(routed);

  // Persist
  await saveSnapshot(storage, snapshot);

  return { snapshot, routed, benchmarkChanges };
}

// ─── Utility: Build entries from flat object ────────────────────────

/**
 * Helper to convert a flat admin form into entries.
 * Input: { "Retail.costPerSqm": 4200, "subscriptionFeePct": 2.0, ... }
 * Output: [{ key: "Retail.costPerSqm", value: 4200, source: "manual" }, ...]
 */
export function formToEntries(formData, source = "manual") {
  return Object.entries(formData)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([key, value]) => ({ key, value: Number(value), source }));
}

/**
 * Helper to convert a snapshot back to flat form data (for editing).
 */
export function snapshotToForm(snapshot) {
  if (!snapshot || !snapshot.data) return {};
  const form = {};
  for (const [key, entry] of Object.entries(snapshot.data)) {
    form[key] = entry.value;
  }
  return form;
}
