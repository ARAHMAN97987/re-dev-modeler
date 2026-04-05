# Task 9: UX Polish Report
Date: 2026-04-05

## Button Colors
- Buttons audited: All buttons using `btnS` base style
- `btnS` updated: `borderRadius` changed from `var(--radius-sm)` (6px) to `var(--radius-md)` (8px)
- Added `btnDanger`: `{ background: '#ef4444', color: '#fff', fontWeight: 600 }` (uses btnS base)
- Added `btnSecondary`: `{ background: transparent, border: '1px solid var(--border-default)', fontWeight: 500 }` (uses btnS base)
- Primary: `var(--btn-primary-bg)` = `#0C1829` (light) / `#0A84FF` (dark) — already wired via CSS tokens
- Danger: `#ef4444` (new `btnDanger` constant)
- Secondary: transparent + `var(--border-default)` border (new `btnSecondary` constant)

## Border Radius
- Before: cards used `borderRadius:10` (57 occurrences), mixed with 6/8
- After: all `borderRadius:10` updated to `borderRadius:12` (matches `--radius-xl: 12px`)
- Summary: cards=12, buttons=8 (via --radius-md), inputs=6 (via --radius-sm), modals=16 (--radius-2xl, unchanged)
- Total replacements: 57 comma + 4 closing-brace instances = 61 total

## Labels Translated (Top 10)
| # | EN | AR | Location |
|---|----|----|----------|
| 1 | MOIC | مضاعف الربح (MOIC) | Waterfall — LP Investor card |
| 2 | DPI | نسبة التوزيع (DPI) | Waterfall — LP Investor card |
| 3 | MOIC | مضاعف الربح (MOIC) | Waterfall — GP Developer card |
| 4 | CAPEX | إجمالي التكاليف الرأسمالية | Developer financing card |
| 5 | IRR > 12% | IRR أكثر من 12% | Returns checks section |
| 6 | NPV@12% > 0 | صافي القيمة @12% > 0 | Returns checks section |
| 7 | LTV | نسبة القرض للقيمة (LTV) | Bank financing card |
| 8 | Min DSCR ≥ 1.25x | أدنى DSCR ≥ 1.25x | Bank compliance section |
| 9 | Avg DSCR ≥ 1.50x | متوسط DSCR ≥ 1.50x | Bank compliance section |
| 10 | DevCost / Debt / Equity (inline) | تكلفة التطوير / دين / حقوق ملكية | Single-phase info banner |
| 11 | IRR > 0 | عائد موجب (IRR > 0) | Bank card — levered IRR check |

## Loading Transition
- Added: YES
- Appears on recalc: YES — triggered by existing `isRecalculating` state (fires on every `project` change)
- Disappears correctly: YES — auto-clears after 400ms via `recalcTimerRef`
- Design: Fixed bottom-right corner pill badge with animated spinner ring (non-blocking, `pointerEvents:none`)
- Added `@keyframes zanSpin` to the in-component `<style>` block
- Spinner color: `var(--zan-teal-500)` on `var(--border-default)` track

## Tests: 427/427 PASSED
- engine_audit.cjs: 267/267 ✅
- zan_benchmark.cjs: 160/160 ✅

## Build: SUCCESS
- Vite build: ✓ 1183 modules transformed
- Bundle: 3040 kB (unchanged, no new dependencies)

## Deploy: https://haseefdev.com
