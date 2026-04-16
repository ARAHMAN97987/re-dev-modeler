# Asset-Program Field Inventory (Phase 4)

**Purpose:** enumerate every asset-level field written by the UI vs. consumed by the engine, so we can
identify (a) dead inputs — fields users edit that never affect results, and (b) name mismatches — fields
where UI writes key `A` but engine reads key `B`.

**Scope:** asset records only. Project-level and phase-level fields are out of scope.

**Method:**
- Writes: `grep 'up("…"' src/components/AssetDetailPanel.jsx` + `grep 'upAsset(index, {…})'`
- Reads: `grep 'a\.[a-zA-Z_]*\|asset\.[a-zA-Z_]*' src/engine/*.js`
- Cross-referenced against `src/App.jsx` wherever an asset field is touched outside ADP.

---

## 1. Fields the UI (AssetDetailPanel + App.jsx) writes onto an asset

### 1a. Via `up("key", val)` helper (33 keys)

| Key | UI label | Notes |
|---|---|---|
| `absorptionYears` | Absorption Years | Sale revenue phasing |
| `assetPriority` | Priority | **Dead** — no engine consumer |
| `basementCostMultiplier` | Basement Cost Multiplier | |
| `basementLevels` | Basement Levels | |
| `code` | Asset Code | **Dead** — not consumed |
| `commissionPct` | Commission % | |
| `constrDuration` | Build Duration (months) | |
| `contingencyPctOverride` | Contingency % Override | |
| `costPerSqm` | Cost per Sqm | |
| `coveragePct` | Coverage % | **Dead** — derived elsewhere via `deriveAreas()` |
| `escalation` | Cost Escalation | |
| `far` | FAR | **Dead** — only used in ADP's "Derive GFA from plot×FAR" button |
| `floorsAboveGround` | Floors Above Ground | **Dead in engine** — only used in ADP mismatch warning |
| `footprint` | Footprint | |
| `gla` | GLA | **Dead** — engine derives `leasableArea` from `gfa*efficiency` |
| `leaseRate` | Lease Rate | |
| `name` | Asset Name | |
| `nla` | NLA | **Dead** — not consumed |
| `notes` | Notes | **Dead** — display only |
| `opEbitda` | Operating EBITDA | Hospitality/marina etc. |
| `openArea` | Open Area | **Dead** — not consumed |
| `openingYear` | Opening Year | **⚠ Dead** — engine uses `constrStart + constrDuration` |
| `parkingArea` | Parking Area | |
| `parkingCostPerSqm` | Parking Cost/Sqm | |
| `phase` | Phase | |
| `plotArea` | Plot Area | **Dead in engine** — only for FAR×plot shortcut |
| `plotReference` | Plot Reference | **Dead** — not consumed |
| `preSalePct` | Pre-Sale % | |
| `rampUpYears` | Ramp-up Years | |
| `salePricePerSqm` | Sale Price per Sqm | |
| `softCostPctOverride` | Soft Cost % Override | |
| `stabilizedOcc` | Stabilized Occupancy | |
| `startYear` | Start Year | **⚠ Mismatch** — engine reads `asset.constrStart`, not `asset.startYear` |

### 1b. Via `upAsset(index, {…})` direct writes (3 extra keys)

| Key | UI label / origin | Notes |
|---|---|---|
| `efficiency` | Benchmark button + auto-set on Lease/Sale revType | **Consumed** |
| `gfa` | Derive buttons + manual | **Consumed** |
| `gla` | Re-derived when `gfa`/`efficiency` changes | Dead (see above) |

---

## 2. Fields the engine reads from an asset

| Key | Module(s) | Purpose |
|---|---|---|
| `absorptionYears` | cashflow.js | Spread sale revenue |
| `basementArea` | cashflow.js | Capex basement contribution |
| `basementCostMultiplier` | cashflow.js | Basement capex multiplier |
| `basementLevels` | cashflow.js | Basement capex |
| `capexSchedule` | cashflow.js | Manual capex override |
| `category` | cashflow.js, hospitality.js | Asset type routing |
| `commissionPct` | cashflow.js | Sale commission |
| `constrDuration` | cashflow.js | Build timing |
| `constrStart` | cashflow.js | Construction start offset |
| `contingencyPctOverride` | cashflow.js | Contingency override |
| `costPerSqm` | cashflow.js | Base capex |
| `efficiency` | cashflow.js | GFA→NLA |
| `escalation` | cashflow.js | Cost escalation |
| `footprint` | cashflow.js | Basement area fallback |
| `gfa` | cashflow.js | Main area driver |
| `leasableArea` | cashflow.js | Pre-computed NLA |
| `leaseRate` | cashflow.js | Rent per sqm |
| `name` | all | Diagnostics |
| `opEbitda` | cashflow.js | Operating revenue |
| `parkingArea` | cashflow.js | Parking capex |
| `parkingCostPerSqm` | cashflow.js | Parking capex |
| `phase` | cashflow.js | Phase routing |
| `preSalePct` | cashflow.js | Pre-sale % for sale-type |
| `rampUpYears` | cashflow.js | Revenue ramp |
| `rentStartYear` | cashflow.js | Rent start override |
| `revType` | cashflow.js, hospitality.js | Revenue model (Sale/Lease/Operating) |
| `revenueSchedule` | cashflow.js | Manual revenue override |
| `salePricePerSqm` | cashflow.js | Sale revenue |
| `softCostPctOverride` | cashflow.js | Soft-cost override |
| `stabilizedOcc` | cashflow.js | Occupancy at stabilization |
| `startRule` | cashflow.js | Asset timing rule |
| `totalCapex` | cashflow.js | Schedule total cross-check |
| `totalRevenue` | cashflow.js | Schedule total cross-check |

---

## 3. Diffs

### 3a. Dead input fields (UI writes, engine ignores)

13 fields that a user can edit without affecting any numeric result:

1. `assetPriority`
2. `code`
3. `coveragePct` (engine derives via `deriveAreas`)
4. `far` (UI-only helper)
5. `floorsAboveGround` (UI-only warning)
6. `gla` (engine derives `leasableArea`)
7. `nla`
8. `notes`
9. `openArea`
10. `openingYear` ← user thinks this drives revenue; engine uses `constrStart + constrDuration`
11. `plotArea` (UI-only helper for FAR shortcut)
12. `plotReference`
13. `startYear` ← user thinks this drives timing; engine reads `constrStart`

### 3b. Name mismatches (CRITICAL — UI disconnected from engine)

Two ADP input fields silently do not reach the engine:

| ADP writes | Engine reads | User-visible effect |
|---|---|---|
| `asset.startYear` | `asset.constrStart` | Changing "Start Year" in UI has **no effect** on capex timing unless `constrStart` also happens to be set. The display fallback `asset.startYear \|\| asset.constrStart` masks the issue because a freshly-edited `startYear` still shows. |
| `asset.openingYear` | (none — engine computes `constrStart + constrDuration/12`) | Changing "Opening Year" has **no effect** on revenue start. |

At ADP L701 the field even displays `asset.startYear \|\| asset.constrStart`, meaning the UI shows `constrStart` when `startYear` is unset — so first edit writes to `startYear`, subsequent reads see `startYear`, and the engine continues to use the old `constrStart`. This is the most likely class of bug behind user complaints where "editing a field doesn't change the numbers."

### 3c. Engine-only fields (no UI writer in ADP)

Fields the engine reads that ADP does not write — likely populated elsewhere in App.jsx or by defaults:

- `asset.basementArea` (engine reads; ADP only writes `basementLevels` + `basementCostMultiplier`; engine falls back to `footprint × basementLevels` when `basementArea` absent — so OK)
- `asset.capexSchedule`, `asset.revenueSchedule` — manual-schedule overrides (App.jsx schedule editor)
- `asset.category` — set at asset creation in App.jsx
- `asset.leasableArea`, `asset.totalCapex`, `asset.totalRevenue` — pre-computed totals written by schedule editor
- `asset.rentStartYear`, `asset.startRule` — advanced timing overrides set elsewhere in App.jsx

---

## 4. Recommendations (deferred — require user decision)

**Do not act on these without explicit approval** — any consolidation here changes user-visible field behavior.

1. **Fix the `startYear`→`constrStart` mismatch.**
   Option A: change ADP to write `constrStart` (1-line fix, but invalidates any saved project where users edited `startYear`).
   Option B: change engine to read `asset.startYear ?? asset.constrStart`.
   Option A is correct for new projects but breaks backward compatibility. Option B is safer.

2. **Fix or remove `openingYear`.**
   Currently decorative. Either feed it into engine as a revenue-start override, or delete the field.

3. **Remove the 11 pure-dead input fields** (`assetPriority`, `code`, `nla`, `notes`, `openArea`, `plotReference`, etc.).
   Each deletion reduces UI confusion but requires confirming no external integration (Excel import/export, saved JSONs) depends on them.

4. **Deduplicate area fields.**
   `gla` and `leasableArea` compute to the same number (`gfa × efficiency`). Pick one and make the engine and UI use it consistently.

---

## 5. What was NOT changed in Phase 4

Nothing. This file is documentation only. No code, no tests, no equations, no schedules were touched.
The 3 commits on `main` since the audit began are:

- `ce4981a` — Phase 0 audit
- `54fd7df` — Phase 1 dead-view deletion
- `8eede51` — Phase 2 waterfall pin-tests

Phase 4 adds this document only.
