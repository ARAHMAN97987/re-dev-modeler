# Simplification Audit — Phase 0 (read-only)

**Status:** read-only audit. No code changes made. Git clean at `abcd2eb`.
**Scope:** identify dead code, duplicate UI, KPI redundancy, waterfall-correctness concerns.
**Safety:** nothing in this phase touches equations, engine output, or displayed numbers.

---

## 1. Shadow-View Duplication (biggest single simplification win)

### Finding
`App.jsx` defines every major view inline **AND** there are parallel files in `src/components/views/` with the same names. Only 6 of those files are actually imported by live code:

**Imported (live):**
- `ChecksView`, `MarketView`, `IncentivesView`, `ScenariosView`, `LearningCenterView`, `ReportsView`
- Named export `IncomeFundResultsView` from `ResultsView.jsx`

**Inline in `App.jsx` (live via direct function definition, NOT imported):**
- `ProjectsDashboard` (L4489), `ProjectDash` (L6194), `AssetTable` (L5189)
- `ResultsView` (L1448), `SelfResultsView` (L1482), `BankResultsView` (L1854)
- `WaterfallView` (L409), `FinancingView` (L2452), `CashFlowView` (L6874), `PresentationView` (L7516)

**Dead shadow files (zero imports in live graph):**

| File | Lines | Status |
|------|------:|--------|
| `components/views/WaterfallView.jsx` | 1217 | dead |
| `components/views/FinancingView.jsx` | 1205 | dead |
| `components/views/AssetTable.jsx` | 1096 | dead (imports `../AssetDetailPanel.jsx` which is still used by App.jsx) |
| `components/views/ResultsView.jsx` | 1431 | partial — only `IncomeFundResultsView` used; other exports dead |
| `components/views/ProjectDash.jsx` | 478 | dead |
| `components/views/CashFlowView.jsx` | 249 | dead |
| `components/views/PresentationView.jsx` | 388 | dead |
| `components/views/ProjectsDashboard.jsx` | 231 | dead |
| `components/shared/ResultsWidgets.jsx` | 36 | dead |

**Total shadow code:** ~5931 dead lines + ~1300 trimmable from `ResultsView.jsx`.

### Verification commands run
```
grep -r "from.*components/views/WaterfallView"  src/   → only ResultsView.jsx (itself dead)
grep -r "from.*components/views/FinancingView"  src/   → none
grep -r "from.*components/views/AssetTable"     src/   → none
grep -r "from.*components/views/CashFlowView"   src/   → none
grep -r "from.*components/views/PresentationView" src/ → none
grep -r "from.*components/views/ProjectDash"    src/   → none
grep -r "from.*components/views/ProjectsDashboard" src/→ none
grep -r "from.*ResultsWidgets"                  src/   → none
```

### Why this matters for the user's concern
Memory note `feedback_app_jsx_duplication.md` says: *"App.jsx has duplicate UI for every view — root cause of 5+ bugs"*. The dead files are the **wrong copy** — they are stale snapshots of the inline App.jsx versions taken during an incomplete refactor (e.g., `AssetTable.jsx` header: *"Extracted from App.jsx lines 4455-5858"*). Fixes land in the App.jsx copy; the shadow files drift and mislead anyone reading them.

### Two simplification paths (mutually exclusive — user picks one)

**Path A — Safe: delete dead shadow files.**
- Deletes ~6000 lines that nobody runs. Zero risk to equations or displayed numbers.
- Does NOT solve the root duplication problem (App.jsx stays 7910 lines).
- Keeps `ResultsView.jsx` but trims it down to only `IncomeFundResultsView` + its dependencies.
- Estimated 1-2 commits. Tests must still pass (they will — dead code doesn't run).

**Path B — Root fix (big, risky): complete the extraction.**
- Move the inline App.jsx views INTO the component files; wire routing to import them.
- Risk: each extracted view is a 400–1200-line chunk with closures on App.jsx-scope variables and shared callbacks. One missed prop = silent breakage of displayed numbers.
- Requires visual diff on every audience view (self/bank/fund/jv/hybrid/incomeFund) before and after.
- Estimated 8-12 commits with aggressive test gating.

**Recommendation:** Path A now (cleanup), Path B later as a separate project after the correctness audit (Phases 2–3) completes. Path A does NOT touch numbers.

---

## 2. Waterfall Correctness — What the Engine Actually Does

Read `src/engine/waterfall.js` in full. Flow:

1. **`cashAvail[y] = MAX(0, netCF + landRentAddBack − debtService − fees + unfundedFees + exitProceeds)`** — gated non-negative. Loss years distribute nothing. This is correct cash-accounting behavior.
2. **Tier 1 (ROC)**: `min(remaining, unreturned)` where `unreturned = cumEquityCalled − cumReturned`. Fee-treatment modes (`capital` / `rocOnly` / `expense`) adjust whether fees are included in ROC and pref bases.
3. **Tier 2 (Pref)**: accrued on `prefBase − cumReturned` at `prefRate`. Paid from remaining cash.
4. **Tier 3 (Catch-up)**: only if `gpCatchup=true` AND `carryPct>0`. Two methods: `perYear` (based on this year's tier2) or `cumulative` (based on cumulative pref paid).
5. **Tier 4 (Split)**: residual split by `lpSplitPct` / `gpSplitPct`.
6. **Sponsor-Promote Floor** (L365–368): if a promote is configured, `gpSplitPct` is floored at `gpPct` so sponsor is never punished below equity-proportional.
7. **Performance Incentive** (L511–568): clawback from LP's last positive distribution year, capped at that year's `lpDist[settleYear]`.

### User's recurring fears — mapped to code

**Fear #1: "Investor returns less than invested."**
- The engine CAN produce `lpTotalDist < lpTotalCalled` → MOIC < 1.0, negative IRR. This is **correct** if the project loses money (cashAvail = 0 in bad years).
- **But**: the UI may display a rosy IRR (headline) while MOIC quietly sits below 1. Ambiguity in *which IRR* is shown (project/levered/LP) on dashboards is a known risk area worth a KPI-labelling pass in Phase 1.
- **No engine bug confirmed yet.** Need pin-test **PT-1** (loss scenario → verify `lpTotalDist < lpTotalCalled` is displayed clearly, not hidden).

**Fear #2: "Developer-as-investor only gets capital back; investor takes all profit."**
- The Sponsor-Promote Floor (L365–368) was added specifically to prevent this. Verify it fires when:
  - `hasPromoteStructure = gpCatchup && carryPct > 0`
  - AND `gpSplitPct < gpPct` (misconfigured profit split).
- **Edge case not covered**: `gpCatchup=false && carryPct>0`. Here `hasPromoteStructure=false` → `lpSplitPct=lpPct` always (user's carry setting silently ignored). No floor applied. This may be the leak the user is seeing. Pin-test **PT-6** needed.
- **Edge case not covered**: `gpCatchup=true && carryPct=0`. Here `hasPromoteStructure=false` → same as above. Catch-up setting silently ignored when carry=0.

**Fear #3: Performance Incentive interactions.**
- `maxClawback = lpDist[settleYear]` → if excess is huge but that year's dist is small, clawback is artificially capped. Pin-test **PT-5** should quantify.
- Binary-search mode (`hurdleMode = "irr"`) hard-caps at 200 iterations with 1-cent or 0.001% IRR tolerance. Degenerate CFs (non-monotonic IRR) could terminate early. Low risk but worth a stress test.

### Pin-tests to add (Phase 2)

| ID | Scenario | Expected |
|----|----------|----------|
| PT-1 | LP invests 100, project loses 60 | `lpNetDist ≤ 40`, MOIC < 1, IRR negative |
| PT-2 | `gpPct=0.5, gpCatchup=false, carryPct=0`, profitable project | GP gets `~50%` of residual by equity pro-rata |
| PT-3 | Same inputs, `prefAlloc="proRata"` vs `"lpOnly"` | LP+GP sums equal; allocation differs |
| PT-4 | `gpCatchup=true, carryPct=0.99` | tier3 finite; catch-up formula capped |
| PT-5 | `perfIncentive` enabled, excess >> `lpDist[settleYear]` | Clawback = `lpDist[settleYear]` (capped); no negative lpDist |
| PT-6 | `gpCatchup=false, carryPct=30` | Verify carry is silently ignored (current behaviour) OR decide to apply it |

**None of PT-1..PT-6 exist today.** Adding them is pure additive to `tests/` — zero risk to engine output.

---

## 3. KPI Redundancy (displayed to user)

Quick scan of `App.jsx` sticky KPI bar + `ProjectDash` + `PresentationView`:

| KPI | Dashboard | Results | Presentation | Notes |
|-----|:---------:|:-------:|:------------:|-------|
| Project IRR | ✓ | ✓ | ✓ | Same value, 3 places |
| LP/Investor IRR | — | ✓ | ✓ | Duplicated |
| MOIC | ✓ (sticky) | ✓ | ✓ | Duplicated |
| DSCR | ✓ (sticky) | ✓ | ✓ | Already gated to debt modes |
| LTV | ✓ (sticky) | ✓ | — | OK |
| NPV@10/12/14 | — | ✓ (3 rows) | ✓ (1 row) | 3 discount rates often identical direction |
| Payback | — | ✓ | — | OK |
| Peak Negative CF | — | ✓ | — | OK |

**Proposed trim (Phase 1):**
- Remove duplicate IRR/MOIC from Dashboard summary (keep only in sticky bar + Results).
- Remove duplicate NPV row from Presentation (keep only in Results).
- Hide NPV rows where the discount rate < IRR by a tiny margin (label clutter).

**Risk level:** display-only. Does NOT change any engine output. Needs a visual verification per mode.

---

## 4. Asset Program — Field Inventory (first pass)

Files involved:
- `src/components/AssetDetailPanel.jsx` (885 lines, 6 sections)
- `src/components/views/AssetTable.jsx` (dead) — IGNORE
- Inline `AssetTable` in App.jsx L5189 (live)
- `src/data/assetTypes.js`, `src/data/assetTemplates.js`, `src/data/areaBenchmarks.js`, `src/data/benchmarks.js`

**Three overlapping benchmark sources for the same concept:**
1. `ZONING_BENCHMARKS` in `AssetDetailPanel.jsx` (max coverage, max FAR per type).
2. `CAP_RATES` in `AssetDetailPanel.jsx` (cap rate per type).
3. `BENCHMARKS` / `getBenchmark` in `data/benchmarks.js`.
4. `areaBenchmarks.js` for area efficiencies.

These need consolidation — one source of truth per concept. Deferred to Phase 3.

**Fields to verify (Phase 3, after Phase 2 engine audit):**
- Which `AssetDetailPanel` fields are read by the engine (`computeAssetCapex`, `computeAssetCapexBreakdown`)?
- Which are decoration only (no effect on numbers)?
- Duplicate `Phase` field — flagged in user memory but not yet confirmed.

---

## 5. Refined Plan (post-audit)

### Sequence
1. **Phase 0 (this file).** Docs commit + push.
2. **Phase 1 — dead-code deletion (Path A).** Delete the 9 shadow files in `components/views/` + `ResultsWidgets.jsx`. Trim `ResultsView.jsx` to only `IncomeFundResultsView`. Run `npm run build` + `tests/full_suite.cjs` before/after. **Zero risk to numbers.** 1–2 commits.
3. **Phase 2 — pin-tests PT-1..PT-6.** Additive only. If any fails, STOP and review the failing scenario with user before any engine change. Each pin-test = 1 commit.
4. **Phase 3 — KPI display trim.** Based on §3. Per-mode visual diff required. 2–3 commits.
5. **Phase 4 — asset program inventory.** Produce a second audit doc mapping every `AssetDetailPanel` field to its engine consumer. No deletions yet. 1 docs commit.
6. **Phase 5 — final verification.** `git log origin/main..HEAD` empty, all tests green, build clean, screenshots of 3 modes.

### Commit-and-push discipline
Every commit ends with:
```
git push origin HEAD
git log origin/main..HEAD   # must be empty before moving to next step
```

### What this plan will NOT do
- Will not rename engine fields.
- Will not change default values of any project/fund parameter.
- Will not change any formula.
- Will not introduce new UI.
- Will not touch `src/engine/*.js` except to add pin-tests (tests live under `tests/`, not engine).

---

## 6. Awaiting User Decision

Before moving to Phase 1, confirm:
1. **Path A (safe delete) or Path B (full extraction)?** I strongly recommend Path A now, Path B much later.
2. **Any file under `components/views/` you want preserved** even if dead? (e.g. if you plan to return to Path B later, they are a starting point — but they drift as App.jsx gets fixes).
3. **Pin-test PT-6 policy decision**: when `gpCatchup=false && carryPct>0`, should carry be silently ignored (current) or applied? This affects engine behavior.
