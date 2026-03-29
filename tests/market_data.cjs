/**
 * Market Data Automation Engine — Test Suite
 *
 * Tests all 4 phases:
 *   Phase 1: Data Collection (formToEntries)
 *   Phase 2: Data Structuring (structureSnapshot, validation)
 *   Phase 3: Data Routing (routeSnapshot)
 *   Phase 4: Application (applyToBenchmarks, getMarketDefaults, etc.)
 *   + Storage, Freshness, Full Pipeline
 *
 * Run: cd re-dev-modeler && node tests/market_data.cjs
 */

const {
  DATA_SOURCES, FIELD_ROUTING, CATEGORY_LABELS,
  structureSnapshot, routeSnapshot, applyToBenchmarks, getMarketDefaults,
  getMarketHotelDefaults, getMarketExitCapRate, checkFreshness,
  formToEntries, snapshotToForm, runMarketDataUpdate,
  saveSnapshot, loadLatestSnapshot, loadHistory,
  BENCHMARKS,
} = require('./helpers/engine.cjs');

let pass = 0, fail = 0;
const t = (name, ok, detail) => {
  if (ok) { pass++; }
  else { fail++; console.log(`  ❌ ${name}: ${detail || 'FAILED'}`); }
};
const near = (a, b, tol = 0.01) => Math.abs(a - b) < tol;

console.log("═══ Market Data Automation Engine Tests ═══\n");

// ─── Registry Tests ─────────────────────────────────────────────

console.log("── Source Registry ──");
t("DATA_SOURCES is array", Array.isArray(DATA_SOURCES));
t("Has 6+ sources", DATA_SOURCES.length >= 6);
t("Each source has id", DATA_SOURCES.every(s => s.id));
t("Each source has category", DATA_SOURCES.every(s => s.category));
t("Each source has fields", DATA_SOURCES.every(s => Array.isArray(s.fields) && s.fields.length > 0));
t("FIELD_ROUTING has entries", Object.keys(FIELD_ROUTING).length > 20);
t("CATEGORY_LABELS has all categories", ["construction_costs","lease_rates","fund_fees","financing_rates","hospitality","exit_rates"].every(c => CATEGORY_LABELS[c]));

// ─── Phase 1: Collection (formToEntries) ────────────────────────

console.log("\n── Phase 1: Data Collection ──");
const formData = {
  "Retail.costPerSqm": 4200,
  "Office.costPerSqm": 3500,
  "subscriptionFeePct": 2.0,
  "financeRate": 7.0,
  "Hotel4.adr": 850,
  "Retail.exitCapRate": 8.5,
};
const entries = formToEntries(formData, "knight-frank-ksa");
t("formToEntries produces correct count", entries.length === 6);
t("Entries have keys", entries.every(e => e.key));
t("Entries have numeric values", entries.every(e => typeof e.value === "number"));
t("Entries have source", entries.every(e => e.source === "knight-frank-ksa"));

const emptyEntries = formToEntries({ "x": null, "y": "", "z": undefined });
t("Empty/null values filtered", emptyEntries.length === 0);

// ─── Phase 2: Structuring ───────────────────────────────────────

console.log("\n── Phase 2: Data Structuring ──");
const snapshot = structureSnapshot(entries, { quarter: "Q1-2026", year: 2026, notes: "Test snapshot" });
t("Snapshot has version", snapshot.version === 1);
t("Snapshot has timestamp", !!snapshot.timestamp);
t("Snapshot has quarter", snapshot.quarter === "Q1-2026");
t("Snapshot has year", snapshot.year === 2026);
t("Snapshot has notes", snapshot.notes === "Test snapshot");
t("Snapshot has correct entry count", snapshot.entryCount === 6);
t("Snapshot data has Retail.costPerSqm", snapshot.data["Retail.costPerSqm"] && snapshot.data["Retail.costPerSqm"].value === 4200);
t("Snapshot data has source", snapshot.data["Retail.costPerSqm"].source === "knight-frank-ksa");

// Invalid entries should be filtered
const badEntries = [
  { key: "Retail.costPerSqm", value: -100, source: "test" },  // negative
  { key: "", value: 100, source: "test" },                     // empty key
  { key: "nonexistent.field", value: 100, source: "test" },   // unknown routing
  { key: null, value: 100, source: "test" },                   // null key
];
const badSnapshot = structureSnapshot(badEntries);
t("Invalid entries filtered", badSnapshot.entryCount === 0);

// ─── Phase 3: Routing ───────────────────────────────────────────

console.log("\n── Phase 3: Data Routing ──");
const routed = routeSnapshot(snapshot);
t("Routed has benchmarkUpdates", !!routed.benchmarkUpdates);
t("Routed has projectDefaults", !!routed.projectDefaults);
t("Routed has hotelDefaults", !!routed.hotelDefaults);
t("Routed has exitDefaults", !!routed.exitDefaults);

// Benchmark routing
t("Retail costPerSqm → benchmark", routed.benchmarkUpdates["Retail"] && routed.benchmarkUpdates["Retail"].costPerSqm === 4200);
t("Office costPerSqm → benchmark", routed.benchmarkUpdates["Office"] && routed.benchmarkUpdates["Office"].costPerSqm === 3500);

// Project defaults routing
t("subscriptionFeePct → projectDefault", routed.projectDefaults.subscriptionFeePct === 2.0);
t("financeRate → projectDefault", routed.projectDefaults.financeRate === 7.0);

// Hotel defaults routing
t("Hotel4 ADR → hotelDefault", routed.hotelDefaults["4"] && routed.hotelDefaults["4"].adr === 850);

// Exit defaults routing
t("Retail exitCapRate → exitDefault", routed.exitDefaults["Retail"] && routed.exitDefaults["Retail"].exitCapRate === 8.5);

// Null snapshot
const emptyRouted = routeSnapshot(null);
t("Null snapshot returns empty", Object.keys(emptyRouted.benchmarkUpdates).length === 0);

// ─── Phase 4: Application ───────────────────────────────────────

console.log("\n── Phase 4: Application ──");

// Save original benchmark values for restoration
const origRetailCost = [...BENCHMARKS.Retail.costPerSqm];
const origOfficeCost = [...BENCHMARKS.Office.costPerSqm];

const changes = applyToBenchmarks(routed);
t("applyToBenchmarks returns changes", changes.length > 0);
t("Retail benchmark updated", BENCHMARKS.Retail.costPerSqm[0] === Math.round(4200 * 0.85) && BENCHMARKS.Retail.costPerSqm[1] === Math.round(4200 * 1.15));
t("Office benchmark updated", BENCHMARKS.Office.costPerSqm[0] === Math.round(3500 * 0.85) && BENCHMARKS.Office.costPerSqm[1] === Math.round(3500 * 1.15));

// Restore benchmarks
BENCHMARKS.Retail.costPerSqm = origRetailCost;
BENCHMARKS.Office.costPerSqm = origOfficeCost;

// Market defaults
const mktDefaults = getMarketDefaults(snapshot);
t("getMarketDefaults includes subscriptionFeePct", mktDefaults.subscriptionFeePct === 2.0);
t("getMarketDefaults includes financeRate", mktDefaults.financeRate === 7.0);
t("getMarketDefaults includes quarter stamp", mktDefaults._marketDataQuarter === "Q1-2026");

// Hotel defaults
const hotelDef = getMarketHotelDefaults(snapshot, "4");
t("Hotel4 market defaults include ADR", hotelDef.adr === 850);
const noHotel = getMarketHotelDefaults(snapshot, "3");
t("Unknown grade returns empty", Object.keys(noHotel).length === 0);

// Exit cap rate
const capRate = getMarketExitCapRate(snapshot, "Retail");
t("Exit cap rate for Retail", capRate === 8.5);
const noCapRate = getMarketExitCapRate(snapshot, "Unknown");
t("Unknown asset type returns null", noCapRate === null);

// ─── Snapshot ↔ Form Roundtrip ──────────────────────────────────

console.log("\n── Form Roundtrip ──");
const form = snapshotToForm(snapshot);
t("snapshotToForm has entries", Object.keys(form).length === 6);
t("Form value matches", form["Retail.costPerSqm"] === 4200);
const reEntries = formToEntries(form);
const reSnapshot = structureSnapshot(reEntries);
t("Roundtrip preserves count", reSnapshot.entryCount === snapshot.entryCount);

// ─── Freshness Check ────────────────────────────────────────────

console.log("\n── Freshness Check ──");
const fresh = checkFreshness(snapshot);
t("Recent snapshot is not stale", !fresh.isStale);
t("Days since update is small", fresh.daysSinceUpdate < 2);

const oldSnapshot = { ...snapshot, timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() };
const stale = checkFreshness(oldSnapshot);
t("Old snapshot is stale", stale.isStale);
t("Days > 90", stale.daysSinceUpdate > 90);

const nullFresh = checkFreshness(null);
t("Null snapshot is stale", nullFresh.isStale);

// ─── Storage Mock & Full Pipeline ───────────────────────────────

console.log("\n── Storage & Full Pipeline ──");

// Mock storage adapter
class MockStorage {
  constructor() { this.store = {}; }
  async get(key) {
    return this.store[key] ? { key, value: this.store[key] } : null;
  }
  async set(key, value) {
    this.store[key] = value;
    return { key, value };
  }
}

async function runStorageTests() {
  const store = new MockStorage();

  // Save and load
  await saveSnapshot(store, snapshot);
  const loaded = await loadLatestSnapshot(store);
  t("Save & load snapshot", loaded && loaded.quarter === "Q1-2026");
  t("Loaded data matches", loaded.data["Retail.costPerSqm"].value === 4200);

  // History
  const history = await loadHistory(store);
  t("History has 1 entry", history.length === 1);

  // Save another
  const snapshot2 = structureSnapshot(
    formToEntries({ "Retail.costPerSqm": 4500 }),
    { quarter: "Q2-2026" }
  );
  await saveSnapshot(store, snapshot2);
  const history2 = await loadHistory(store);
  t("History has 2 entries", history2.length === 2);
  t("Latest in history is Q2", history2[0].quarter === "Q2-2026");

  // Full pipeline
  const store2 = new MockStorage();
  const pipelineEntries = formToEntries({
    "Retail.costPerSqm": 4800,
    "Office.costPerSqm": 3800,
    "subscriptionFeePct": 1.75,
    "annualMgmtFeePct": 1.25,
    "financeRate": 6.0,
    "Hotel4.adr": 900,
    "Retail.exitCapRate": 9.0,
  }, "manual");

  // Save original benchmarks
  const origR = [...BENCHMARKS.Retail.costPerSqm];
  const origO = [...BENCHMARKS.Office.costPerSqm];

  const result = await runMarketDataUpdate(store2, pipelineEntries, { quarter: "Q1-2026", notes: "Full pipeline test" });
  t("Pipeline returns snapshot", !!result.snapshot);
  t("Pipeline returns routed", !!result.routed);
  t("Pipeline returns benchmarkChanges", Array.isArray(result.benchmarkChanges));
  t("Pipeline snapshot saved", result.snapshot.entryCount === 7);

  // Check benchmarks were updated
  t("Retail benchmark via pipeline", BENCHMARKS.Retail.costPerSqm[0] === Math.round(4800 * 0.85));

  // Verify storage
  const pipeLoaded = await loadLatestSnapshot(store2);
  t("Pipeline saved to storage", pipeLoaded && pipeLoaded.quarter === "Q1-2026");

  // Restore benchmarks
  BENCHMARKS.Retail.costPerSqm = origR;
  BENCHMARKS.Office.costPerSqm = origO;
}

runStorageTests().then(() => {
  // ─── Comprehensive Routing Coverage ───────────────────────────
  console.log("\n── Routing Coverage ──");
  const allKeys = Object.keys(FIELD_ROUTING);
  const allTargets = new Set(allKeys.map(k => FIELD_ROUTING[k].target));
  t("All 4 targets covered", allTargets.has("benchmark") && allTargets.has("projectDefault") && allTargets.has("hotelDefault") && allTargets.has("exitDefault"));

  // Every source field should have a routing
  let unmapped = 0;
  for (const src of DATA_SOURCES) {
    for (const f of src.fields) {
      if (!FIELD_ROUTING[f.key]) unmapped++;
    }
  }
  t("All source fields have routing", unmapped === 0, `${unmapped} unmapped fields`);

  // ─── Summary ──────────────────────────────────────────────────
  console.log(`\n═══ Results: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail > 0 ? 1 : 0);
});
