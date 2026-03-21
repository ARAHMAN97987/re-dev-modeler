# ZAN Development Plans - Tracking System

## ⚠️ CRITICAL: Read Before Working

### For ANY AI model (Claude, GPT, or other) starting work on these plans:

1. **Code in these plans is REFERENCE ONLY.** It was written based on a specific snapshot of App.jsx (March 21, 2026, 12,901 lines). The actual codebase may have changed since then. **ALWAYS check the current code before applying any snippet.**

2. **Never copy-paste code from these plans directly into the app.** Always:
   - Read the current version of the relevant function/file first
   - Understand what changed since the plan was written
   - Adapt the plan's approach to the current code
   - Test after every change

3. **Line numbers are approximate.** They were accurate on March 21, 2026. If the file has been modified since, search by function name instead.

4. **Check the progress tracker below.** Items marked ✅ are done. Items marked 🔄 are in progress. Items marked ⬜ are not started. Don't redo completed work.

5. **After completing any item**, update the progress tracker in this file and commit.

---

## How to Use This System

```
docs/plans/
├── README.md                      ← YOU ARE HERE (progress tracker + instructions)
├── 01_master_development_plan.md  ← UX + Engine improvements (40 items)
├── 02_code_splitting_plan.md      ← Engine extraction (19 steps)
└── 03_completed_log.md            ← Detailed log of what was done, when, and any deviations
```

### Starting a new session:
1. Read this README first - check what's done and what's next
2. Open the relevant plan file for details on the next item
3. **Pull latest code** (`git pull origin main`)
4. Check if the code still matches the plan's assumptions
5. Do the work
6. Test (633 tests must pass)
7. Update progress below
8. Commit and push

### If you're on a new branch:
```bash
git checkout feature/engine-extraction  # or whatever branch
git pull origin feature/engine-extraction
```

---

## Progress Tracker

### Legend
- ⬜ Not started
- 🔄 In progress
- ✅ Completed
- ❌ Blocked
- 🔬 Research needed

**Last updated:** March 21, 2026
**Updated by:** Claude (engine extraction complete)

---

### PHASE 0: Financial Trust (do FIRST)

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| P1 | Legacy vs New Engine Conflict | ⬜ | | REVERTED: aggregated financing has schema gaps (rate=0, MOIC diff). Fix requires engine reconciliation first |
| P2 | isFund Logic Bug | ✅ | 2026-03-21 | isFund now only checks finMode==="fund", not vehicleType default |
| P3 | React Hooks Safety Fix | ✅ | 2026-03-21 | Both early returns moved after all hooks |
| P4 | Proxy Labeling (≈ indicator) | ✅ | 2026-03-21 | ≈ added to DSCR (7 locations) + Mgmt Fee (3 locations) |

---

### ENGINE EXTRACTION (Phase 2A - see 02_code_splitting_plan.md)

| Step | Item | Status | Date | Notes |
|------|------|--------|------|-------|
| 1 | engine/math.js | ✅ | 2026-03-21 | calcIRR, calcNPV — character-exact match |
| 2 | engine/hospitality.js | ✅ | 2026-03-21 | calcHotelEBITDA, calcMarinaEBITDA — exact match |
| 3 | data/defaults.js | ✅ | 2026-03-21 | defaultProject, defaultHotelPL, defaultMarinaPL — exact match |
| 4 | data/benchmarks.js | ✅ | 2026-03-21 | BENCHMARKS + 3 functions — exact match |
| 5 | data/translations.js | ✅ | 2026-03-21 | CAT_AR, REV_AR, catL, revL — exact match |
| 6 | utils/format.js | ✅ | 2026-03-21 | fmt, fmtPct, fmtM — exact match |
| 7 | utils/csv.js | ✅ | 2026-03-21 | 6 functions + TEMPLATE_COLS + SAMPLE_ROWS — exact match |
| 8 | engine/cashflow.js | ✅ | 2026-03-21 | getScenarioMults + computeAssetCapex + computeProjectCashFlows — exact match |
| 9 | engine/incentives.js | ✅ | 2026-03-21 | computeIncentives + applyInterestSubsidy — exact match |
| 10 | engine/financing.js | ✅ | 2026-03-21 | computeFinancing (429 lines) — exact match |
| 11 | engine/waterfall.js | ✅ | 2026-03-21 | computeWaterfall (374 lines) — exact match |
| 12 | engine/phases.js | ✅ | 2026-03-21 | FINANCING_FIELDS + 9 phase functions — exact match |
| 12b | engine/legacy/phaseWaterfalls.js | ✅ | 2026-03-21 | DEPRECATED — exact match, isolated in legacy/ |
| 13 | engine/checks.js | ✅ | 2026-03-21 | runChecks (284 lines) — exact match |
| 14 | engine/index.js | ✅ | 2026-03-21 | Barrel file + runFullModel orchestrator |
| 15 | tests/helpers/engine.cjs | ✅ | 2026-03-21 | New shim reads from engine/ — 633/633 pass |
| 16 | Update App.jsx imports | ✅ | 2026-03-21 | 12901→10608 lines — Vite build + 633 tests pass |
| 17 | Immutability tests | ✅ | 2026-03-21 | 12/12 — no mutations detected |
| 18 | runFullModel orchestrator | ✅ | 2026-03-21 | 27/27 parity — identical to useMemo chain |

**Extraction gate:** ALL 633 tests pass + ZAN benchmark 0.00% diff before proceeding.

---

### PHASE 1: UX Quick Wins (see 01_master_development_plan.md)

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| 1 | Toast System | ⬜ | | 4 types: success/error/warning/info |
| 2 | Error Messages | ⬜ | | Replace generic "حدث خطأ" |
| 3 | Empty States + Progress Tracker | ⬜ | | Per-section empty states + dashboard tracker |
| 4 | Auth Page Redesign | ⬜ | | Split-screen hero + form |
| 5 | Google Login Visibility | ⬜ | | Prominent Google button on auth |
| 6 | Background Gradients | ⬜ | | Subtle gradients + depth |
| 7 | Skeleton Loaders | ⬜ | | Loading placeholders |
| 8 | Button States | ⬜ | | ZanButton component with 3 variants |
| 9 | CSV Template Visibility | ⬜ | | Download template button next to import |

---

### PHASE 2A: Engine Hardening

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| E1 | Financial Engine Extraction | ✅ | 2026-03-21 | 18/18 steps complete, 672 tests pass |
| E2 | Inline Styles Strategy (src/styles.js) | ⬜ | | Shared style constants |
| E3 | Excel Reconciliation Suite | ⬜ | | Full ZAN benchmark verification |
| E4 | DSCR Proxy Replacement | ⬜ | | Real NOI / (Principal + Interest) |
| E5 | Management Fee NAV Fix | ⬜ | | 3 bases: committed/invested/NAV |
| E6 | Undo Memory Monitoring | ⬜ | | Log snapshot sizes, auto-trim |

---

### PHASE 2B: Core UX Fixes

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| 10 | Dynamic Tab Visibility | ⬜ | | Hide tabs by finMode |
| 11 | Asset Templates | ⬜ | | 6 templates with Saudi defaults |
| 12 | Asset Data Prep Guide | ⬜ | | Checklist banner in Assets tab |
| 13 | Asset Modal Field Grouping | ⬜ | | 4 collapsible groups |
| 14 | Financing Settings Visible | ⬜ | | Quick settings at top of tab |
| 15 | Financing KPI Strip | ⬜ | | Total Debt / Equity / LTV / DSCR |
| 16 | Financing Charts | ⬜ | | Pie + Line + Bar charts |
| 17 | Dashboard KPIs | ⬜ | | Project count / CAPEX / IRR / updated |
| 18 | Dashboard Filters | ⬜ | | Search + type filter |
| 19 | Functional Colors Audit | ⬜ | | Green/yellow/red on all metrics |
| 20 | Input Validation | ⬜ | | Inline red border + message |
| 21 | Checks Fix Buttons | ⬜ | | Navigate to problem field |

---

### PHASE 3: Polish

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| 22 | Selective Animations | ⬜ | | 5 specific animations only |
| 23 | Brand Consistency | ⬜ | | Color + font audit |
| 24 | Spacing Audit | ⬜ | | Fix cramped/loose areas |
| 25 | Typography Standardization | ⬜ | | Unified type scale |
| 26 | Bilingual Audit | ⬜ | | Fix missing translations |
| 27 | Waterfall Tooltips Enhancement | ⬜ | | Rich tooltips + Academy links |
| 28 | Mobile Basic Improvements | ⬜ | | Sidebar + touch targets |
| 29 | Report Preview Before Export | ⬜ | | Preview modal for PDFs |

---

### BACKLOG

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| 30 | Accessibility Basics | ⬜ | | aria-labels, keyboard nav |

---

### RESEARCH

| # | Item | Status | Date | Notes |
|---|------|--------|------|-------|
| R1 | Dashboard vs Results Overlap | 🔬 | | Map metrics per tab, find true dupes |
| R2 | Waterfall Tab Redundancy | 🔬 | | Can waterfall be section in Results? |

---

## Recommended Execution Order

```
Session 1: P1 + P2 + P3 + P4 (critical bugs - 30 min)
Session 2: Extraction Steps 1-7 (utils + data - 30 min)
Session 3: Extraction Steps 8-13 (engine core - 1-2 hours)
Session 4: Extraction Steps 14-18 (wiring + tests - 1 hour)
Session 5: UX Phase 1 items 1-5 (quick wins - 1 session)
Session 6: UX Phase 1 items 6-9 (quick wins - 1 session)
Session 7+: Phase 2A + 2B in parallel
```

This is a suggestion. Adjust based on priorities and available time.

---

## Files in This Folder

| File | Content | Lines |
|------|---------|-------|
| README.md | This file - instructions + progress tracker | ~200 |
| 01_master_development_plan.md | Full UX + Engine plan from 3 evaluations | ~2,700 |
| 02_code_splitting_plan.md | Engine extraction plan (19 steps) | ~850 |
| 03_completed_log.md | Log of completed work + deviations | grows over time |
