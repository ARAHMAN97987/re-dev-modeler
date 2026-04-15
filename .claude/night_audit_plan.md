# Night Audit Plan (Overnight autonomous work)

Authorized by user: "اعمل خطة متكاملة ... ابدا فيها ... احول ان تستمر لاطول فترة ممكنة ... التاكد انه كل شي عملته وعدلته رفعته فعلا على قيت هب"

Baseline: all 7 UI-cleanup passes landed on main (ending f3c210e); full_suite + absorption_equivalence pass; scenario_deep_audit has 1 Fee/equity > 40% warning (parameter sanity, not a correctness bug).

## User's explicit concerns
1. Asset-table "More Details" arrow area is complex, messy, needs organization
2. Waterfall correctness — recurring bugs (e.g., LP receives back less than invested capital; developer-as-investor only gets capital back while LP takes all profit)

## Workflow rule
EVERY commit: `build → commit → git push origin HEAD`. No local-only commits. Final phase verifies `git status` is clean AND origin/main matches HEAD.

---

## Phase 1 — Discovery
- Map `src/engine/waterfall.js` structure
- Map `src/App.jsx` asset-table row + expand (around AssetsTable / AssetManager)
- Write a findings file at `.claude/findings_waterfall.md` and `.claude/findings_asset_table.md`

## Phase 2 — Waterfall correctness hunt
Focus on specific edge cases the user flagged:

### 2A — "Investor gets back less than invested"
Hypotheses:
- Tier 1 (Return of Capital) capped by period cash before carry, so if exit is small, LP RoC is under-filled
- Developer-held LP units aren't pro-rata inside tier 1
- Cash IRR vs. Full IRR double-count / net negative
- Pre-established fees / SPV fees drain LP capital before distribution

Tests to add:
- Small-loss scenario: total distributions < total equity → LP distributions should == LP equity × (distributions/equity) ratio (not less than capped)
- Zero-profit scenario: distributions = equity → everyone RoC, no carry, no pref

### 2B — "Developer-as-investor only gets capital back"
Hypotheses:
- GP-cash-invest path classifies GP's LP units as GP tier, bypassing pro-rata LP tier 4 (profit split)
- GP catch-up consumes what should be pro-rata profit
- `gpInvestDevFee` and `gpCashInvest` flags don't route developer LP units into tier 1 / tier 4 alongside other LPs

Tests to add:
- Developer invests 20% of LP pool via gpCashInvest. Expect Dev LP share of tier-4 profit == 20% of LP-side profit pool, separate from any GP carry
- Compare: no-GP-invest vs. GP-invests-via-LP — developer's economics should increase by LP share

### 2C — Pref/carry boundary
- hurdleIRR barely met: catch-up should equal "carry on (profit − pref)"
- pref achieves but no leftover for carry: tier 3 = 0, tier 4 = 0
- No pref (prefReturnPct=0): tier 2 skipped, all above-RoC goes to carry split

## Phase 3 — Asset-table reorganization
Target: the row-expand "More Details" in the asset list inside AssetsTable (App.jsx). Reorganize the dense content into clear sections:
- **Design** (GFA, efficiency, footprint, plot, phase)
- **Revenue basis** (lease or sale inputs)
- **Costs** (cost/sqm, construction start/duration, ramp-up)
- **Operations** (stabilized occupancy, escalation, opEbitda if Hotel, etc.)

Must NOT change engine inputs or calculation behavior — pure UI regrouping. Build-test and eye-test in tests layer.

## Phase 4 — Final audit & push verification
1. Run `full_suite.cjs` → expect all PASS
2. Run `absorption_equivalence.cjs` → expect 23/23
3. Run any new pin-tests → all pass
4. `npm run build` clean
5. `git status` == clean
6. `git log origin/main..HEAD` empty (everything pushed)
7. Write a short `.claude/night_report.md` with what was done, tests added, commits pushed (SHAs), and known-open items.

## Commit discipline
One logical change per commit. Commit-message format:
- `fix(waterfall): ...` for correctness
- `test(waterfall): ...` for new tests
- `refactor(ui): ...` for asset-table reorg
- `docs: ...` for findings/report files
