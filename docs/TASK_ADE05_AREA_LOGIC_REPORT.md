# Asset Development Engine - Task 5: Area Logic Report
## Date: 2026-04-05
## Status: PASS

### Changes Made
- New file: src/data/areaBenchmarks.js
  - EFFICIENCY_BENCHMARKS: benchmark efficiency % for 11 asset types with appropriate area labels (GLA/NLA/NSA/NUA)
  - AREA_BASES: definitions for gfa/unit/key/berth/land area bases
  - deriveAreas(asset): computes netArea, coveragePct, FAR, leasableArea
  - getBenchmarkEfficiency(assetType): returns benchmark efficiency or 85 default
  - getAreaLabel(assetType, lang): returns appropriate area label per asset type

- Updated: src/components/AssetDetailPanel.jsx
  - Import deriveAreas, getBenchmarkEfficiency, getAreaLabel from areaBenchmarks.js
  - Auto-sync GLA → efficiency: when user enters GLA manually, efficiency updates to (GLA/GFA × 100), capped at 100%
  - Derived Values box after Efficiency field: shows net area, coverage %, FAR, benchmark efficiency
  - "Apply Benchmark" button appears when current efficiency ≠ benchmark; resets efficiency to type default

- Updated: src/components/views/AssetTable.jsx
  - Import deriveAreas from areaBenchmarks.js
  - Added "Net Area" column (key: netArea) — hidden by default, toggleable via column picker
  - Cell renders deriveAreas(a).netArea in blue (#0369a1)

### Test Results
- engine_audit: PASS (267/267)
- zan_benchmark: PASS (160/160)
- Total: 427/427

### Engine Compatibility
- No changes to src/engine/ — engine still computes leasableArea = gfa × efficiency / 100 internally
- areaBenchmarks.js is UI-only derivation layer
- GLA auto-sync updates efficiency field which feeds the engine correctly
