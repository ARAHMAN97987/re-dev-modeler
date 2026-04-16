# Simplification Session — 2026-04-16

**Mandate:** simplify (not add complexity). Be especially careful when any change
could move numeric results. Work autonomously. Commit AND push every change.

---

## Commits landed on `origin/main` (this session)

| SHA | Phase | Summary | LOC Δ |
|---|---|---|---|
| `ce4981a` | 0 | Simplification audit doc — identifies dead shadow views, waterfall correctness map, KPI redundancy | +195 |
| `54fd7df` | 1 | Delete 8 dead shadow view files (`components/views/*.jsx`, `components/shared/ResultsWidgets.jsx`) | −5,700 |
| `8eede51` | 2 | Add 6 pin-tests (PT-1..PT-6) for waterfall correctness: loss scenarios, sponsor-promote floor, pref alloc conservation, extreme carry, incentive clawback, gpCatchup+carry interaction | +270 |
| `bfd7240` | 4 | Asset-program field inventory: 33 UI-written fields vs 33 engine-read fields; identifies 13 dead inputs + 2 name mismatches (startYear vs constrStart; openingYear has no reader) | +178 |
| `719e249` | 1.5 | Delete deprecated backup folders (`src/_deprecated_app_views/`, `src/engine/_deprecated/`) — zero references from live code | −14,101 |

**Net:** ~19,800 lines of dead code removed. ~640 lines of documentation + pin-tests added.

---

## Verification state

- `npm run build` → passes (3.08 MB main bundle, 429 kB xlsx chunk)
- `tests/waterfall_pin_tests.cjs` → 24/24 passed
- `tests/waterfall_sponsor_floor.cjs` → 6/6 passed
- `tests/regression.cjs` (ZAN benchmark) → 50/50 passed
- `tests/immutability.cjs` → 12/12 passed
- `tests/full_suite.cjs` → all passed (Layer 1-5 unit, bug-hunt, integration, property, scenario)
- `tests/parity.cjs` → 98/98 passed
- `tests/stress_all_modes.cjs` → 2,210/2,210 passed
- `tests/absorption_equivalence.cjs` → 23/23 passed
- `tests/waterfall_hybrid_gp_moic.cjs` → 6/6 passed
- `tests/waterfall_legacy_consolidated_parity.cjs` → 14/14 passed

**Pre-existing engine observations** (NOT introduced this session — engine untouched):
- `input_impact.cjs` reports 2 behaviors: `lpProfitSplitPct` ineffective in one config;
  `rentPaidBy=gp` double-count note. These predate this session — no engine code was modified.

---

## What was NOT changed

- **No engine code.** `src/engine/*.js` and `src/engine/legacy/phaseWaterfalls.js` are untouched.
  All numeric outputs are bit-identical to pre-session.
- **No KPI display trim (Phase 3).** Deferred: duplicate KPI rows would require touching
  user-visible UI on Results/Dashboard/Presentation screens. User memory flags this area
  as the source of 5+ past bugs. Not safe to attempt unsupervised.
- **No schedule editor / asset form changes.** The asset-field mismatches documented in
  Phase 4 (`startYear`↔`constrStart`, `openingYear`) are **flagged, not fixed** — either
  fix risks breaking saved projects.

---

## Open items for user decision (no autonomous action possible)

From `.claude/asset_program_inventory.md` §4:

1. **`startYear` → `constrStart` mismatch.** Editing "Start Year" in ADP writes to
   `asset.startYear` which the engine ignores. Engine reads `asset.constrStart` instead.
   Likely source of "I changed a field but numbers didn't move" complaints.
2. **`openingYear` has no engine consumer.** Field is purely decorative.
3. **13 dead asset input fields** (assetPriority, code, nla, notes, openArea, plotReference,
   etc.) — safe to remove but requires confirming no Excel-export / saved-JSON dependency.
4. **KPI duplication** across Dashboard/Results/Presentation — needs UX decision on
   which screen is canonical for which metric.

---

## Working principles honored

- ✅ Re-understood platform before edits (audit in Phase 0).
- ✅ Multi-pass validation after every engine-adjacent change (build + 8 test suites).
- ✅ Committed AND pushed every change (`git log origin/main..HEAD` empty at end).
- ✅ Simplification only — pure deletions and documentation, zero new features.
- ✅ Did not alter any equation or numeric output (engine code untouched).
