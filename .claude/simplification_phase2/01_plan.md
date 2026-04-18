# Simplification Campaign #2 — Plan (Draft for user approval)

**Date:** 2026-04-18
**Scope:** Post-Revert-Option-A simplification pass.
**Philosophy:** Delete the rare. Simplify the common. Keep the KSA-specific power under the surface.
**Status:** **PROPOSED — NOT EXECUTED. Every phase needs explicit user approval.**

---

## Executive summary — 3 top-level bets

1. **Kill the dead wood from Simplification #1.** There are six deprecated fields (`prefReturnPct`, `carryPct`, `gpCatchup`, `catchupMethod`, `prefAllocation`, `feeTreatment`) that are hidden in the UI but still have ~130 reference points in the engine + checks. We delete them. And we fix the 14 obsolete tests.
2. **Break the `App.jsx` monolith, starting with the two fattest inline components.** `FinancingView` (1,223 lines) and `WaterfallView` (801 lines) inside `App.jsx` are where ~85% of the "forgot to update both copies" bugs come from (per `feedback_app_jsx_duplication.md`). Extract them to their own files. This alone removes 25% of App.jsx.
3. **One bug fix, three usability wins.** Fix the Advisory Report crash (`alerts.items` → `alerts.top5`). Add a user-facing dark-mode toggle and improve mobile CSS (currently only 3 media queries). Rename UI labels so a first-time KSA developer doesn't see "GP/LP" — they see "المطور / الممول".

**Targets (measured before and after the campaign):**
| Metric | Current | Target |
|---|---|---|
| App.jsx line count | 8,015 | < 5,500 (–31%) |
| Total project fields (defaults.js) | ~142 | < 120 (–15%) |
| Dead/deprecated fields in logic | 6 | 0 |
| finMode branches in code | 67 | < 50 |
| Passing test files (of 53) | 39 | 53 |
| User-facing dark-mode toggle | no | yes |
| Mobile media queries in CSS | 3 | ≥ 12 |
| Advisory Report bug | live | fixed |
| Bundle size (gzip) | 941 KB | < 800 KB |
| Time for a new user to produce first pro-forma | ~15 min (estimated) | < 8 min |

---

## 3 user personas (kept in mind as we decide what to delete)

### Persona A — "المطور الصغير" (Small developer)
- One project, 2–3 assets (maybe one retail + one hotel), self-funded or single bank loan.
- Finmode: `self` or `debt`. Does not touch fund mechanics.
- Needs: IRR, NPV, DSCR, cashflow table, bank-package Excel.
- Touches (estimated): ~25 fields out of 142.
- Pain point today: finMode dropdown shows 6 options, 5 of which are irrelevant to them. The finance tab has land-cap and dev-fee-invest panels that are meaningless in self mode.

### Persona B — "المطور المتوسط" (Mid-size developer — the user's typical profile)
- 2–3 phases, 10–30 assets, fund mode with a partner or LP.
- Finmode: `fund` or `hybrid`. Modest incentive usage.
- Needs: waterfall, per-phase IRR, Excel + markdown memo.
- Touches: ~55 fields out of 142.
- Pain point today: 3-stage waterfall is there but surfacing it requires clicking through Results tab. Performance Incentive settings are buried.

### Persona C — "مدير صندوق" (Fund manager — sometimes this user, often their client)
- Multi-project portfolio, 5+ phases, every fee type active, incentives, Monte Carlo sensitivity.
- Finmode: `fund` or `incomeFund`. Heavy use of scenarios + sensitivity.
- Needs: everything. Plus Bank Package + Investor Memo + Advisory Report.
- Touches: ~90 fields out of 142.
- Pain point today: Advisory Report crashes for any project with a smart-alert (currently blocking).

### Cross-persona takeaway
- **0 personas** use: `prefReturnPct`, `carryPct`, `gpCatchup`, `catchupMethod`, `prefAllocation`, `feeTreatment`, `exitStabilizationYears`, `propertyMgmtFeePct`, `propertyMgmtFeeCap`.
- **All 3 personas** use: assets, phases, finMode, exitStrategy, landType, incentives, and the top-30 fields.
- `self` and `debt` finmodes collectively cover Persona A; `fund` / `hybrid` / `incomeFund` cover Personas B + C. `bank100` is rare (big deals) and `jv` appears to be vestigial.

---

## Feature classification (Core / Useful / Rare / Dead)

### 🟢 Core (touch gently, only rename/polish)
- `assets`, `phases`, `finMode`, `exitStrategy`, `landType`, `incentives`
- Top 30 fields by usage count (see `00_market_research.md` + code inspection table)
- The 3-stage waterfall
- Hospitality + Marina specialised P&L (`engine/hospitality.js`)
- All 4 scenario modes (comparison, sensitivity, tornado, goal seek)
- Excel + PDF + markdown advisory report generation
- Arabic ↔ English toggle

### 🟡 Useful (simplify or hide by default)
- `finMode` dropdown — currently 6 options visible. Proposal: **3 visible** (`self`, `debt`, `fund`) + an "advanced" expand for `bank100`, `incomeFund`, `hybrid`. Keep all 6 functional in engine.
- `landCapPct` (split allocation % for `landCapTo='split'`) — not in UI but engine uses default 50. Either expose or remove.
- `_structureVersion` — written once, never read. Remove safely.
- Sub-menus deep inside FinancingView — many fields would be better hidden unless a parent toggle is on.
- `islamicMode` — 4 uses, niche but relevant to some KSA deals. Keep for now.

### 🔴 Rare (propose deleting)
- `prefReturnPct` (41 engine uses but all in hidden waterfall branches — Performance Incentive fully replaces)
- `carryPct` (38 engine uses — same)
- `gpCatchup` (24 uses — same)
- `catchupMethod` (11 uses — same)
- `prefAllocation` (9 uses — always `lpOnly`, no UI)
- `exitStabilizationYears` (1 use — never flows)
- `propertyMgmtFeePct` / `propertyMgmtFeeCap` (2 files each, income-fund only — kept only if income-fund stays a feature)
- `hurdleMode` (8 uses, but "simple" and "irr" are barely differentiated)
- `feeTreatment` (marked `H14`, no engine reads found)
- `jv` finMode value (6 uses only in `checks.js`, never default)

### ⚫ Dead (delete immediately, zero risk)
- `_structureVersion` field
- `_legacyFinancing` / `_legacyWaterfall` fallbacks in App.jsx (after checking load path)
- The 5 obsolete test-assertion stubs mentioned in `TASK_09_DONE.md` (if they're actually stubs, not live)
- Excel's 6 `Fund_ZAN` sheets — investigate; if always 6 regardless of phase count, pad down to actual phase count.

---

## Phased execution plan (14 phases — each a single approve/reject gate)

### Phase 0 — Decisions & prep (no code changes)
- [ ] User approves this plan (or edits it).
- [ ] Create a backup branch: `git branch backup-before-simpl2-$(date +%Y%m%d)`.
- [ ] Decide on naming: do we keep "GP/LP" in UI or rename to "المطور / الممول"? (Market research says the latter is more natural but also heavier to change.)

### Phase 1 — Fix the Advisory Report crash (10 min, 1 file)
- **File:** `src/components/shared/AdvisoryReport.jsx:284`.
- **Change:** `rd.alerts.items.slice(0,5)` → `(rd.alerts.top5 || []).slice(0,5).map((msg, i) => ({severity: ..., en: msg, ar: msg}))` (adapter) — OR unify both sides to `items`.
- **Gate verification:** Re-run Advisory Report on Jazan project; must produce a PDF with smart-alerts section rendered.
- **Risk:** Very low. No UX change.
- **Test impact:** None (no tests on this component).

### Phase 2 — Kill the 6 deprecated waterfall fields (2–3 hours)
- **Files touched:**
  - `src/data/defaults.js` — remove 6 field defaults.
  - `src/engine/waterfall.js` — remove all `prefReturnPct`/`carryPct`/`gpCatchup`/etc. branches (~60 loc reduction).
  - `src/engine/checks.js` — remove the 9+ deprecated-field reads and the stale warnings (e.g. FIX#18).
  - `src/App.jsx` — delete the migration code that zeroes these fields (lines 323–335) once all projects are migrated.
  - Remove `engine/legacy/phaseWaterfalls.js` (32 lines, marked `@deprecated`).
- **Gate verification:**
  1. All 6 `tests/new/*.cjs` still pass.
  2. Re-run all `tests/*.cjs` — triage: either delete or update the 14 pre-existing failures. **Target: 53/53 pass.**
  3. Open Jazan project — IRR/MOIC/waterfall numbers must not change.
- **Risk:** Medium. Might silently break a hidden code path. Mitigate by running invariant harness (the one we built during the audit) before and after.
- **Commit message:** `refactor(engine): delete prefReturn/carry/catchup dead paths (Performance Incentive is the single source)`.

### Phase 3 — Extract FinancingView from App.jsx (3–4 hours)
- **Goal:** Move the 1,223-line inline `FinancingView` function into `src/components/views/FinancingView.jsx`.
- **Why:** The memory note `feedback_app_jsx_duplication.md` says duplication between App.jsx inline and `components/views/` caused 5+ bugs. Current state: only App.jsx has a copy. We extract so future edits land in one place.
- **Gate verification:** All tests pass; Jazan finance tab renders identically; reactivity confirmed (change LTV 30→40, verify 8 KPIs update).
- **Risk:** Medium — import graph, props plumbing.
- **Commit:** `refactor(ui): extract FinancingView from App.jsx monolith`.

### Phase 4 — Extract WaterfallView from App.jsx (2 hours)
- Same treatment for the 801-line WaterfallView.
- Target file: `src/components/views/WaterfallView.jsx`.
- Gate: Results tab identical before/after; console still zero errors.

### Phase 5 — Extract SelfResultsView + BankResultsView (2 hours)
- The remaining two big inline components (372 + 598 lines).
- Target folder: `src/components/views/results/`.
- Gate: Dashboard + Results render identically for `self`, `debt`, `bank100` projects.

### Phase 6 — Simplify the finMode UI (1 hour)
- Default dropdown shows 3 values: `self` (ذاتي), `debt` (بنك), `fund` (صندوق).
- Behind an "خيارات متقدمة" link → show the other 3: `bank100`, `incomeFund`, `hybrid`.
- Engine keeps all 6.
- Gate: new projects default to `fund`; existing projects keep whatever they have.
- **If the user agrees:** delete the `jv` value from the finMode enum (6 legacy references in `checks.js`).

### Phase 7 — Hide UI fields conditionally on finMode (2 hours)
- Today the Financing tab shows all sub-panels regardless of mode. Proposed:
  - Self mode: hide fund-structure card, fees card (except developer fee), distribution card.
  - Debt mode: hide fund-structure card, distribution card, fee-rebate card.
  - Fund mode: show everything.
- Gate: Persona A flow (new user, self mode) sees a dramatically cleaner Financing tab.

### Phase 8 — Triage the 14 failing test files (2 hours)
- For each, decide:
  1. **Update** — rewrite assertions to match current 3-stage waterfall + investors[] model.
  2. **Delete** — if the behaviour being asserted has been permanently removed.
- End state: 53/53 passing.
- Gate: clean `PASS=53 FAIL=0` from the test sweep script used in the audit.

### Phase 9 — Add user-facing dark-mode toggle (1 hour)
- Add a toggle (sun/moon icon) in the header next to the English/عربي toggle.
- Persist choice in localStorage.
- Gate: flip, reload page, still dark; flip back, reload, still light.

### Phase 10 — Mobile CSS pass (3–4 hours)
- Today: only 3 media queries (`max-width: 768px` × 2, `max-width: 480px` × 1).
- Add breakpoints at 768 and 480 for:
  - Tab bar (currently horizontal; should wrap or become a dropdown on <768).
  - Dashboard KPI row (currently 6 cards side-by-side; stack on <768).
  - Asset-program table (currently horizontal scroll; add a collapsed card view on <480).
  - Financing tab 4-card grid (stack on <768).
- Gate: open haseefdev.com on 375×812, every primary flow is usable without horizontal scroll.

### Phase 11 — Excel export: Fund_ZAN sheets match phase count (30 min)
- Today: always generates 6 `Fund_ZAN` sheets regardless of phase count.
- Proposal: generate exactly N sheets where N = project phase count.
- Gate: Jazan exports 3 Fund_ZAN sheets (ZAN 1, 2, 3); a 6-phase project exports 6; a 1-phase exports 1.

### Phase 12 — Rename UI labels for KSA-native vocabulary (1 hour)
- `LP` → "الممول" in Scenarios + Results headers.
- `GP` → "المطور" where still showing as GP.
- Keep English-mode labels as `Financier` / `Developer` instead of LP/GP.
- Engine field names stay `gpXxx` / `lpXxx` (zero refactor risk).
- Gate: Arabic screenshots of Scenarios table + Results cards show no "GP"/"LP" in the visible text.

### Phase 13 — Bundle size pass (2 hours)
- Current gzip: 941 KB; Vite warns > 500 KB.
- Use `build.rollupOptions.output.manualChunks` to split:
  - `react` + `react-dom` → `vendor-react`
  - `exceljs` → `vendor-xlsx` (already separate, good)
  - `react-markdown` + report rendering → `vendor-reports` (lazy-load)
  - Engine + scenarios could also be a chunk (lazy loaded when first-clicked).
- Gate: gzip < 800 KB; initial page load faster per Lighthouse.

### Phase 14 — Documentation sweep (30 min)
- Update `.claude/architecture.md` + `CLAUDE.md` (if it exists) to reflect post-#2 state.
- Update memory files.
- Write `FINAL_REPORT_PHASE_2.md`.

---

## What we explicitly will NOT touch

- **Engine correctness.** All 10 bug fixes from audit rounds `fc3418c` + `67367a7` stay.
- **Investors[] as the single source of truth.** Aliases (`gpEquity`, `lpIRR`, etc.) stay.
- **Hospitality + Marina specialised P&L.** Specialised, used, small, stay.
- **Multi-phase support.** Central to the user's workflow.
- **The 4 scenario analysis modes.** All four are used and tested.
- **Supabase schema.** No migration needed for Phase 2.
- **Arabic RTL rendering.** It works.
- **API key handling / Advisory Report's AI integration.** Only the render side.

---

## Risks & mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Extracting inline components breaks state | Medium | Run invariant harness + browser walk-through between phases |
| Deleting deprecated fields breaks a live saved project | Low | Migration on load zeroes these anyway; double-check with user's saved projects |
| Bundle-splitting breaks Vercel prod build | Low | Test locally first; staged deploy |
| finMode UI simplification confuses Persona C | Low | "advanced" expand preserves all options |
| Mobile CSS breaks existing desktop layout | Medium | Only add `@media (max-width: X)` rules; desktop CSS untouched |
| Test rewrite hides a real regression | Medium | When updating assertions, preserve the original intent comment; cross-check with engine invariants |

---

## Execution rhythm proposal

- **Gate between every phase.** I report the diff + gate test results; you approve before the next phase.
- **One commit per phase.** Clear commit messages; easy to revert one phase without unwinding the others.
- **Each commit is pushed to `origin/main`** after your approval (per your instruction: "احذر انك تعدل على كود لوكل دون رفعه").
- **Full test sweep + browser smoke at phases 2, 5, 8, 10, 14.** Catches late-introduced regressions.
- **Total estimated effort:** ~25 engineering hours. Can be spread over several sessions; no single phase is blocking.

---

## Success metrics (re-measured after Phase 14)

- Line count for `App.jsx`: target < 5,500 (vs. 8,015 today).
- Total project fields: target < 120 (vs. ~142).
- Passing tests: 53/53 (vs. 39/53).
- `finMode` branches in code: < 50 (vs. 67).
- Mobile-viewport Lighthouse "Usability" score: > 90.
- Bundle gzip: < 800 KB (vs. 941 KB).
- Advisory Report works on projects with alerts.
- User-facing dark-mode toggle exists.

---

## Open questions for you before Phase 1

1. **UI renaming:** do you want `GP/LP` → `المطور/الممول` everywhere in the UI (Phase 12), or is the current Arabic ("مطور / مستثمر") fine?
2. **Finmode simplification:** keep 6 visible vs. 3 + advanced-expand? Or keep all 6 as today?
3. **Test triage:** when a `tests/*.cjs` file's whole purpose is testing deleted behaviour, do you prefer I delete the file outright or stub every assertion with `// OBSOLETE-KEEP-FOR-HISTORY`? (Deleting is cleaner; stubs preserve history.)
4. **`islamicMode`:** keep or kill? It's used in 4 files only. If KSA Islamic deals matter to you or your clients, we keep. If not, it goes.
5. **`jv` finMode value:** it appears in 6 checks in `checks.js` but is not a default. Is this dead or intentional?
6. **Bundle splitting:** OK to lazy-load Reports and Scenarios tabs (so first paint is faster but first-click on those tabs has a brief load)? Or must everything be loaded upfront?

**Nothing is executed until you answer these + approve the plan.** Phases can also be reordered, skipped, or expanded at your direction.
