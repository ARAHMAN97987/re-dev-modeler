# Phase 1 Verification Audit — Post Revert Option A

**Date:** 2026-04-18
**Auditor:** Fresh-eye pass (Claude)
**Scope:** Verify that commit `165c88a refactor(ui): revert to legacy Financing UI (Option A)` left the codebase in a coherent, working state.
**Verdict:** ✅ **SAFE TO PROCEED TO PHASE 2** — with 3 minor caveats and **one real (pre-existing, non-revert) bug to flag**.

---

## Executive summary

The revert is clean. The engine retained the stronger `investors[]` core from the simplification campaign; the UI went back to legacy field controls (finMode × 6, landCapTo, gpInvestDevFee, gpCashInvest, gpEquityManual). All data-flow paths between UI → state → Supabase → engine are intact. Engine invariants hold across every financing scenario tested. Build is green.

**Three caveats** — none block Phase 2:
1. **14 test files fail** — but this is **pre-existing** from the simplification campaign itself, not from the revert. The FINAL_REPORT.md claim of "52 tests all passing" was incorrect.
2. **Memory file `project_simplification_campaign.md`** is out of date — still claims the campaign shipped successfully; should reflect the revert.
3. **Advisory Report crashes on projects with active smart-alerts** — pre-existing bug since commit `8741aa1`, key mismatch `alerts.items` vs `alerts.top5`. Full trace and one-line fix in §3e. Not a revert regression. Blocker only for the Advisory Report feature.

**Browser walk-through DONE** (§3 below): all 10 tabs green, 43/43 engine checks pass live, reactivity verified, Excel export works, i18n works. Only the Advisory Report bug was found.

---

## 1. Code integrity checks

### 1a. No dead references to reverted components
```
grep InvestorsView|_investorsEditedByUser → no matches anywhere in src/
```
✅ Clean. No orphan imports, no dangling state fields.

### 1b. Legacy UI fields — all wired end-to-end

| Field | UI control | Reads from | Writes to | Status |
|---|---|---|---|---|
| `landCapTo` | `FinancingView`, App.jsx L2870 (dropdown gp/lp/split) | `cfg.landCapTo \|\| "gp"` | `upCfg({landCapTo:v})` | ✅ |
| `landCapitalize` | L2865 (Y/N toggle) | `cfg.landCapitalize` | `upCfg({landCapitalize: v==="Y"})` | ✅ |
| `landCapRate` | L2869 (SAR/sqm) | `cfg.landCapRate ?? 1000` | `upCfg({landCapRate:v})` | ✅ |
| `landCapPct` | — | — | — | ⚠️ Referenced in engine/defaults only; no UI control. Engine default `50` used if `landCapTo==='split'`. Not a bug — legacy rare field. |
| `gpInvestDevFee` | L2895 (Y/N) | `cfg.gpInvestDevFee` | `upCfg` | ✅ |
| `gpDevFeeInvestPct` | L2899 (%) | `cfg.gpDevFeeInvestPct ?? 100` | `upCfg` | ✅ |
| `gpCashInvest` | L2906 (Y/N) | `cfg.gpCashInvest` | `upCfg` | ✅ |
| `gpCashInvestAmount` | L2909 (SAR) | `cfg.gpCashInvestAmount` | `upCfg` | ✅ |
| `gpEquityManual` | L2951 (SAR, 0=auto) | `cfg.gpEquityManual` | `upCfg` | ✅ |
| `lpEquityManual` | **no UI control** | read only (engine) | — | ⚠️ Intentional — computed as remainder. Engine line `financing.js:424` still respects manual override if user sets it via API/storage. |
| `finMode` | L2720 (6 options) | `cfg.finMode` | `upCfg({finMode, ...})` | ✅ |

### 1c. migrateProjectToInvestors — all call sites alive

| Site | File:line | Purpose |
|---|---|---|
| Project load | `App.jsx:358` | Every loadProject call |
| Financing | `engine/financing.js:19` | Before `computeFinancing` |
| Waterfall | `engine/waterfall.js:39` | Before `computeWaterfall` |
| Phases | `engine/phases.js:405` | Before independent phase results |

✅ Every compute path that needs `investors[]` populates it. Projects saved with legacy-only fields still load and migrate correctly.

### 1d. allocateEquity / equityByRole — still the core equity engine

- **Definition:** `engine/investors.js:204-272` (exported via `engine/index.js:20-21`)
- **Callers (5):** `financing.js:379, 396, 841`, `waterfall.js:64`, `phases.js:451`
- ✅ Both helpers are actively used and remain the single source of truth for equity split.

### 1e. Supabase save/load path
- **Save:** `App.jsx:401-414` — serializes full project JSON. **No field filtering.**
- **Load:** `App.jsx:274-399` — runs three migration passes in order: fees (`_feesVersion`), waterfall (`_waterfallVersion`), investors (`_structureVersion=3`).
- ✅ Legacy fields pass through cleanly. Migration is idempotent (guarded by version flags).

### 1f. Tab order (read from `App.jsx:4261-4273`)
```
dashboard → assets → cashflow → financing (hidden if self) → incentives
         → results → scenarios → market → checks → reports
```
Plus Academy via `/academy` URL or button at L4226.
✅ Matches the specification in the task brief.

### 1g. App.jsx duplication check
Per the earlier memory note, App.jsx historically duplicated view UI. Cross-checking legacy equity fields (`landCapitalize`, `gpEquityManual`, etc.):
- `src/App.jsx` — sole UI source (FinancingView inline function, L2483-3700)
- `src/engine/*` — compute only, no UI
- `src/components/views/*.jsx` — no matches

✅ No duplication for legacy financing fields. Single authoritative path.

---

## 2. Build & tests

### 2a. `npm run build`
```
vite v5.4.21 building for production
✓ 1197 modules transformed
dist/assets/index-Dlcb66M9.js  3,099.94 kB │ gzip: 941.68 kB
✓ built in 11.43s
```
✅ Clean. One warning (chunk > 500 kB) — pre-existing, not caused by revert. Candidate for Phase 2.

### 2b. Test suite — 39/53 pass, 14 fail
Ran all `tests/*.cjs` + `tests/new/*.cjs` (53 files total).

**Pre-existing failures** (confirmed by rerun at commit `fc3418c`, before the revert, which also yielded 39 pass / 14 fail — identical result):

| Test file | Root cause |
|---|---|
| `waterfall_sponsor_floor.cjs` | Asserts old `lpProfitSplitPct` catchup behavior — removed in simplification |
| `waterfall_hybrid_gp_moic.cjs` | Asserts old hybrid waterfall math |
| `zan_benchmark.cjs` | Asserts old pref + catchup numbers |
| `engine_audit.cjs` (6 sub-assertions) | Pref accrual, catchup Tier 3, unreturned capital — all removed |
| `input_impact.cjs` (8 sub-assertions) | `prefReturn`, `carryPct`, `lpSplit`, `catchup=off`, `feeTreat` — deprecated inputs |
| `financing_settings_audit.cjs` | Asserts old pref logic |
| `scenario_deep_audit.cjs` | Same category |
| `fin_audit_p2.cjs` | Same |
| `rounds_18_20.cjs` | Same |
| `audit_round10_e2e.cjs` | Same |
| `audit_phase_filter.cjs` | Same |
| `extraction_parity.cjs` | Asserts legacy extraction |
| `ui_display_audit.cjs` | References old UI assertions |
| `full_suite.cjs` | Aggregator — fails because subsuites fail |

**All `tests/new/*.cjs`** (investors-era tests) **pass** — 82 assertions across 6 files.

✅ **The revert did not introduce any test regression.** All failing tests predate it.

⚠️ **Historical note:** `.claude/simplification/FINAL_REPORT.md` and `TASK_09_DONE.md` both claim "52/52 passing" — this was inaccurate at the time it was written.

### 2c. Engine invariant harness (11 scenarios, ad-hoc)
Confirmed the three golden equations across all scenarios:
- **Identity:** `gpEquity + lpEquity ≡ totalEquity`
- **Formula:** `totalEquity ≡ max(0, totalProjectCost − maxDebt)`
- **Golden:** `gpEquity + lpEquity + totalDebt ≡ totalProjectCost`

```
✅ self                 TPC=138,600,000  Debt=         0  Eq=138,600,000  GP=138.6M LP=0
✅ bank100              TPC=138,600,000  Debt=138,600,000 Eq=         0
✅ debt                 TPC=138,600,000  Debt= 83,160,000 Eq= 55,440,000  GP=55.4M LP=0
✅ fund                 TPC=138,600,000  Debt= 83,160,000 Eq= 55,440,000  GP=0     LP=55.4M
✅ incomeFund           TPC=138,600,000  Debt= 83,160,000 Eq= 55,440,000  GP=0     LP=55.4M
✅ hybrid               TPC=138,600,000  Debt= 97,020,000 Eq= 41,580,000  GP=0     LP=41.6M
✅ fund+landCap(gp)     TPC=188,600,000  Debt=113,160,000 Eq= 75,440,000  GP=50M   LP=25.4M
✅ fund+landCap(lp)     TPC=188,600,000  Debt=113,160,000 Eq= 75,440,000  GP=0     LP=75.4M
✅ fund+landCap(split)  TPC=188,600,000  Debt=113,160,000 Eq= 75,440,000  GP=25M   LP=50.4M
✅ fund+devFee+cash     TPC=138,600,000  Debt= 83,160,000 Eq= 55,440,000  GP=15.9M LP=39.6M
✅ partner+fund         TPC=143,600,000  Debt= 86,160,000 Eq= 57,440,000  GP=5M    LP=52.4M
```
✅ **11/11 invariants hold.** (Test script was temporary, removed after run.)

---

## 3. Browser walk-through on haseefdev.com — DONE (2026-04-18, late evening)

Executed via Claude-in-Chrome MCP on `haseefdev.com`, signed in as `arahman97987@gmail.com`, tested project `ea43981b-18d3-4403-8d04-58dd3f7c3683` (مشروع جازان — 30 assets, 3 phases, fund mode, 1.34B SAR CAPEX).

### 3a. Full tab walkthrough — all 10 tabs render cleanly, zero console errors
| Tab | Loads | KPI display | Notes |
|---|---|---|---|
| Dashboard | ✅ | 13% IRR unlevered, 413.1M NPV@10%, 1.34B CAPEX, 22.79% cash yield, 10.04B net CF, 13yr payback | Sources & Uses breakdown visible, LTV bar correct |
| Assets (برنامج الأصول) | ✅ | Per-asset IRR column, 30 rows | Header KPIs: 1.73x MOIC, 13.3% investor, 0.59x DSCR |
| Cashflow (التدفق النقدي) | ✅ | Year-by-year table, NPV@10/12/14 | NOI 11.38B, min cash -1.26B (Y7) |
| Financing (الهيكلة المالية) | ✅ | Debt 446.7M / Equity 1.04B / LTV 30% / DSCR 1.81x avg · 0.59x min | Fund mode, 11 fees, exit Y2034 |
| Incentives (الحوافز) | ✅ | 4 toggle categories, all disabled on Jazan | — |
| Results (النتائج) | ✅ | 3-stage waterfall: Investors 13.34% / Dev 14.57% / Fund mgr 1.04B equity + 215.4M fees | Per-phase IRR (ZAN1 10.8%, ZAN2 13.6%, ZAN3 15.6%) |
| Scenarios (السيناريوهات) | ✅ | 8-scenario grid (±10% cost, ±10% rent, ±6mo delay, ±0.5% escalation) | Rendered LP/GP column headers — legacy naming still intact |
| Market (السوق) | ✅ | 6 sector gap inputs (retail/office/hospitality/residential/marina/industrial) | Risk thresholds per sector |
| Checks (الفحوصات) | ✅ | **43/43 passing** (T0 inputs 3/3, T1 engine 15/15, + more) | Invariant `GP+LP=100%` passes live: GP 14.51% + LP 85.49% = 100.00% ✓ |
| Reports (التقارير) | ✅ | 3 report cards (Exec summary / Bank pkg / Investor memo) + Excel download | Reports button triggers markdown generation |

### 3b. Live reactivity test — ✅ PASS
Changed `maxLtvPct` from 30% → 40% on Financing tab; all eight KPIs in header + 4 cards updated within ~500 ms:
- Total Debt: 446.7M → **595.6M**
- Total Equity: 1.04B → **893.5M**
- DSCR avg/min: 1.81x/0.59x → **1.39x/0.44x**
- Levered IRR: 16.7% → **19.1%**
- Investor return: 13.3% → **15.4%**
- MOIC: 1.73x → **1.84x**
- Per-phase IRR (ZAN1/2/3): 16.8%/18.8%/22.2%
- Effective LTV: 30% → **40%**

Reverted to 30% before proceeding. Auto-save badge (✓ on name bar) tracked both edits. State fully reactive.

### 3c. Excel export — ✅ PASS (with one observation)
Download triggered; file: `مشروع جازان_Full_Model.xlsx` (346 KB).
**16 sheets present**: `Read Me, Inputs, Program, CAPEX, Revenue, CashFlow, Operating_PL, Fund_Summary, Fund_ZAN 1, Fund_ZAN 2, …, Fund_ZAN 6, Bank, 9_Checks`.

⚠️ **Observation:** 6 `Fund_ZAN` sheets exist though the project has only 3 phases. Either the export template always generates 6 (padding for future phases) or extra empty sheets are stale. Not a blocker; worth a quick check in Phase 2.

### 3d. Internationalization & theming
- **Arabic ↔ English toggle** — ✅ PASS. Flipped via header button; UI chrome retranslates, RTL → LTR layout flip correct, project data (names) stays in original language.
- **Dark mode** — ⚠️ PARTIAL. Theme works when `data-theme="dark"` is set on `<html>` (rendered palette clean, good contrast), but **no user-facing toggle exists in the UI**. Users cannot switch themes without devtools. Candidate for Phase 2.
- **Mobile viewport** — ⚠️ MINIMAL. Only **3 media-query rules** (`max-width: 768px` × 2, `max-width: 480px` × 1) across the entire ~33 KB CSS bundle. An 8,015-line SPA with this little responsive styling will need a mobile layout pass. Not a blocker.

### 3e. 🚨 Bug found — Advisory Report crashes on projects with active smart-alerts

**Symptom:** Clicking "توليد تقرير استشاري" on Results tab → AI generation completes (words count grew 127 → 477) → render crashes in Error Boundary with:
```
TypeError: Cannot read properties of undefined (reading 'slice')
  at Ume → Array.map → …  (AdvisoryReport render path)
```

**Root cause (traced in source):**
- `src/reportGenerator.js:69-74` builds the `alerts` object with keys `{ total, critical, warning, top5 }`.
- `src/components/shared/AdvisoryReport.jsx:284` reads `rd.alerts.items.slice(0,5)` — **key mismatch** (`items` vs. `top5`).
- The guard on line 281 only checks `rd.alerts.total > 0`; it does not validate `items`.

**Pre-existing (not a revert regression):** Both strings were introduced in the **same commit `8741aa1` "feat: Phase 5 — AI Advisory Report"** (original feature commit). Latent until a project had enough smart-alerts to trigger the `total > 0` branch. The Jazan project has an active smart-alert (badge "⚠ 1" in the top bar) → triggers it.

**Impact:** Advisory Report is broken for **any project with at least one smart-alert**. This is a live-production blocker for the AI Report feature; the ability to walk through tabs and export Excel are not affected.

**Error Boundary caught it cleanly** — the rest of the app continued working after I clicked "تحديث الصفحة" (refresh).

**Recommended trivial fix (one line, not applying now without your approval):** In `AdvisoryReport.jsx:284`, either rename to `rd.alerts.top5.slice(...)` or, safer, change the reference to `(rd.alerts.items || rd.alerts.top5 || []).slice(...)` to be forward-compatible.

### 3f. Console & network
- **Zero console errors or warnings** during the normal tab walkthrough (Dashboard → Assets → Cashflow → Financing → Incentives → Results → Scenarios → Market → Checks → Reports).
- **2 captured errors** came from the Advisory Report crash only (Error Boundary caught both).
- No failed XHR/network requests observed in the background activity.

---

## 4. Memory / documentation hygiene

Things that should be updated after this audit is accepted:

| File | Issue | Suggested action |
|---|---|---|
| `~/.claude/…/memory/project_simplification_campaign.md` | Still says "COMPLETE" — does not reflect the Option-A revert | Update: add a `Reverted` section, note that UI is legacy + engine kept investors[] + 14 obsolete tests outstanding |
| `.claude/simplification/FINAL_REPORT.md` | Claims "52/52 passing" | Amend: "14 legacy assertions obsolete; tests/new/* (82 assertions) all green" |
| `.claude/simplification/TASK_09_DONE.md` | Same inaccuracy | Same amendment |
| `.claude/` | No record of the revert itself | Create `revert_option_a.md` documenting what was reverted and why |

---

## 5. Minor observations (not blockers, just noted)

1. **`lpEquityManual` has no UI** — still readable by engine. If you want this to be truly "dead" UI, it can stay; but it's worth a one-line comment in defaults.js explaining why it exists but isn't exposed.
2. **Bundle size 3.1 MB** — expected (App.jsx is 8,015 lines). Phase 2 is the right place to attack this.
3. **`prefReturnPct`, `gpCatchup`, `carryPct`, `catchupMethod`, `prefAllocation`, `feeTreatment`** — these are still in `defaults.js` but read by nothing meaningful after the simplification. Candidates for Phase 2 removal.
4. **`_feesVersion` and `_waterfallVersion` migration flags** — set on load, never torn down. Fine to keep for backward compat, but worth a pass in Phase 2 to confirm which migrations are still load-bearing.
5. **Phase 2 audit of test suite** — the 14 failing test files should be classified: either update assertions to new behavior (keep the coverage) OR mark obsolete + delete. Don't leave them silently failing — they mask real regressions.

---

## Recommendation

**Proceed to Phase 2 planning.** The revert is clean enough to build on. Before Phase 2 kickoff, please:

1. (5 min) Confirm a quick browser smoke test on haseefdev.com passes for your Jazan project.
2. (Optional) Approve me to update `FINAL_REPORT.md` and memory files to reflect reality.

No fix is strictly required first. The 14 failing tests are not blockers — they're inherited noise from Simplification #1 that Phase 2 should address.
