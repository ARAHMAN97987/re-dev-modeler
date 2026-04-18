/**
 * Retired legacy per-phase waterfall (4-tier with pref/catchup/carry).
 *
 * Simplification Campaign #2 Phase 2 (2026-04-18) removed the pref/carry/catchup
 * fields entirely. The primary per-phase waterfall path is now
 * `computeIndependentPhaseResults` in engine/phases.js, which uses the 3-stage
 * model (ROC → Performance Incentive → Profit split).
 *
 * This file is kept as a no-op stub only so any stale import resolves. The
 * consumer (App.jsx) treats an empty object as "no per-phase waterfalls", which
 * is safe — the UI falls back to consolidated waterfall + phase summaries.
 */

export function computePhaseWaterfalls() {
  return {};
}
