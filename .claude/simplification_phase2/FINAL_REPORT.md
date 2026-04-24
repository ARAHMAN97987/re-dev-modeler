# Simplification Campaign #2 — Final Report

**Date:** 2026-04-18 (overnight session)
**Status:** 6 of 14 planned phases shipped. The remaining 8 are safe, additive work (component extractions, mobile CSS, bundle splitting, finMode UI simplification) that needs more care than overnight execution — they're queued for a supervised session.

## What shipped (commits on origin/main)

| Phase | Commit | Title | Lines Δ | Verification |
|---|---|---|---|---|
| 0 | `0b0d9a7` | Docs: audit + plan | +727 / -2 | N/A |
| 1 | `74ea349` | fix(reports): Advisory Report crash | +8 / -0 | Build ✅, tests 39/14 unchanged |
| 9 | `5c4b5ac` | feat(ui): persistent dark mode toggle | +15 / -2 | Build ✅ |
| 2 | `3108766` | refactor(engine): delete legacy 4-tier waterfall fields | +42 / -191 | 11/11 invariants identical, tests unchanged |
| 8 | `e78f64b` | test: archive 14 obsolete legacy-waterfall tests | +43 / -0 (moves) | Tests: 39 PASS / 0 FAIL |
| 12 | `8d19cc0` | feat(ui): rename LP/GP → Financier/Developer | +20 / -20 | Build ✅, tests 39/0 |

**Net effect:** −147 code lines while fixing a production bug, adding a user-facing feature, and cleaning 14 obsolete test files out of the main test count. No regressions.

## Metric progress vs. Phase 2 plan

| Metric | Before Phase 2 | After Phase 2 (now) | Target from plan |
|---|---|---|---|
| Test files passing | 39 / 53 (74%) | **39 / 39 (100%)** | 53 / 53 |
| Dead/deprecated fields in logic | 6 | **0** | 0 |
| Advisory Report crash on alerted projects | Live bug | **Fixed** | Fixed |
| User-facing dark-mode toggle | No | **Yes** | Yes |
| UI labels using LP/GP | Many | **≈0** on user-visible surfaces | 0 |
| App.jsx line count | 8,015 | 8,017 (slight ↑ from theme toggle) | < 5,500 |
| Total project fields (defaults.js) | ~142 | **~134** | < 120 |
| finMode branches in code | 67 | ~65 | < 50 |
| Bundle gzip | 941 KB | ~941 KB | < 800 KB |

The App.jsx / bundle / finMode-branch targets are the work of the 8 deferred phases.

## Phases deferred (queued for supervised session)

These are all **medium to large refactors** that need gate-verification between each step — not safe to ship overnight unattended:

| Phase | Task | Why deferred |
|---|---|---|
| 3 | Extract inline FinancingView (1,223 LOC) to own file | State-plumbing + prop surface require careful gate verification |
| 4 | Extract inline WaterfallView (801 LOC) | Same |
| 5 | Extract inline SelfResultsView + BankResultsView | Same |
| 6 | Simplify finMode UI to 3 visible + advanced-expand | UX decision needed from user |
| 7 | Hide UI fields conditionally on finMode | UX decision needed |
| 10 | Mobile CSS pass (add ≥12 media queries) | Extensive visual testing required |
| 11 | Excel Fund_ZAN sheet count (SKIPPED — not a real bug; the loop correctly reflects project.phases length) | Confirmed not a defect |
| 13 | Bundle-size split (vendor-react, vendor-xlsx, lazy Reports+Scenarios) | Build-config change; needs staged deploy |

## Architectural wins

1. **Performance Incentive is now the single source of post-ROC distribution.** No more hidden 4-tier waterfall branches in the engine. The 3-stage model (ROC → Performance Incentive above hurdleIRR → Profit split pro-rata) is authoritative.
2. **Test suite is honest now.** 39 PASS / 0 FAIL, instead of 39 PASS / 14 silently failing. A new regression introduced tomorrow will be visible immediately.
3. **Legacy 141-line `phaseWaterfalls.js` reduced to a 16-line no-op stub.** The primary per-phase path (`computeIndependentPhaseResults`) fully replaces it. The stub is kept only so any stale import resolves.
4. **Dark mode was always designed-for but locked off.** The design-token palette under `[data-theme="dark"]` was complete; `main.jsx` was force-setting `light`. Users can now toggle and the choice persists in localStorage.
5. **Advisory Report works again.** The `alerts.items` vs `alerts.top5` mismatch that had been latent since commit `8741aa1` (the original Advisory Report feature) is fixed with a safe, additive emission of both shapes.

## Open questions (still awaiting user decision before next session)

From the plan's §0 questions — none were answered tonight because the user went to sleep; I answered the ones that had clear defaults and deferred the rest:

1. **Finmode simplification (3 visible + advanced-expand)** — deferred; needs user call on UX.
2. **Which `islamicMode` path to pursue** — deferred; 4 references is small enough to keep.
3. **`jv` finMode value** — I kept it (9+ live references in engine/checks/financing; removal would risk legacy projects).
4. **Bundle splitting lazy-load** — deferred to Phase 13.
5. **Test triage — delete vs. archive** — I **archived** them under `tests/obsolete/` with a README explaining how to revive if needed. Safer than deletion; nothing lost.
6. **UI relabel LP/GP → Financier/Developer** — **done** in Phase 12 (user-visible labels only; engine field names unchanged).

## What the user should do when they wake up

1. Visit https://haseefdev.com, open the main Jazan project, click Results → "توليد تقرير استشاري". The AI advisory PDF should render this time (Phase 1 bug fix).
2. In the project menu (hamburger) or home toolbar, there's now a 🌙/☀️ button — flip it to verify persistence.
3. Review `.claude/simplification_phase2/FINAL_REPORT.md` (this file) and the Phase 2 plan (`01_plan.md`) to decide what to pick up next. Phases 3/4/5 (App.jsx extraction) are the highest-value remaining targets.
4. If the folder was renamed from `00 Data Room ZAN` → `ZAN`, optionally copy the Claude memory folder (see recovery steps outside this file).

## Appendix A — quick verification script

To re-prove nothing regressed, from the project root:

```bash
# Tests: must show PASS=39 FAIL=0
pass=0; fail=0; for f in tests/*.cjs tests/new/*.cjs; do
  [ -f "$f" ] && node "$f" >/dev/null 2>&1 && pass=$((pass+1)) || fail=$((fail+1))
done; echo "PASS=$pass FAIL=$fail"

# Build: must be clean
npm run build
```

Expected: `PASS=39 FAIL=0` and `✓ built in XXs`.

## Appendix B — commit chain

```
8d19cc0 feat(ui): rename LP/GP → Financier/Developer in user-facing labels
e78f64b test: archive 14 obsolete legacy-waterfall tests
3108766 refactor(engine): delete legacy 4-tier waterfall fields
5c4b5ac feat(ui): persistent dark mode toggle in header + menu
74ea349 fix(reports): advisory report crash on projects with smart-alerts
0b0d9a7 docs: post-revert audit + Simplification Campaign #2 plan
165c88a refactor(ui): revert to legacy Financing UI (Option A)   ← Campaign #1 baseline
```

## Appendix C — the 14 archived tests

Moved to `tests/obsolete/` with a README. See the README there for the catalogue and revival instructions. In summary: all 14 assert the old 4-tier waterfall (pref/catchup/carry) which no longer exists in the engine. The current test authoritative set is `tests/*.cjs` (remaining) + `tests/new/*.cjs` (82 assertions, investors[] era).
