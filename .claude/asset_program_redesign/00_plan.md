# Asset Program — Redesign Plan (for user approval BEFORE any code change)

**Date:** 2026-04-18
**Scope:** The "برنامج الأصول / Asset Program" tab only. Engine (`engine/cashflow.js`, `engine/phases.js`) is **not touched** — the redesign is UI + state + removal of dead code.
**Philosophy:** The user's tool for feasibility is the Asset Program. It must be **fast to enter**, **one clear flow**, and **no hidden duplication**. Every knob that doesn't directly change IRR/CAPEX/Revenue by ≥1% should not be in the default view.

---

## 1. What exists today (inventory)

### 1a. File surface
- `src/App.jsx:5225-6302` — inline `AssetTable` (1,077 LOC) — the whole Asset tab
- `src/components/AssetDetailPanel.jsx` — separate 885-LOC drawer — opened by "›" button
- `src/components/shared/HotelPLModal.jsx` + `MarinaPLModal.jsx` — specialised sub-modals
- `src/data/assetTypes.js` — 6 categories × sub-types
- `src/data/areaBenchmarks.js` — efficiency / coverage / FAR benchmarks
- `src/engine/cashflow.js:computeAssetCapexBreakdown` — CAPEX math
- Supabase save/load — unchanged by this redesign

### 1b. Every sub-component inside AssetTable (in render order)
| Block | Lines (approx) | Purpose | User-facing clutter level |
|---|---|---|---|
| Land section (collapsible header) | 5451-5628 | Tenure + area + purchase/partner/bot/lease fields + lease sub-details + rent-allocation detail expandable | **Medium** — most projects only edit this once |
| Phases bar | 5631-5658 | Add/rename/remove phases + opening year input | Low — works well |
| Filter bar | 5661-5680 | phase / category / revType dropdowns + clear | Low |
| Header (title + count + view toggle + column picker + soft/cont inputs + template/export/upload/add buttons) | 5683-5726 | Control surface | **High** — too many buttons, view toggle is redundant |
| Import success/error toast | 5729-5740 | Status | Low |
| **Cards view** (empty state + prep guide + grid of cards with `›` button + template picker + inline edit modal) | 5741-5893 | One of two ways to view/edit assets | **High — USER WANTS REMOVED** |
| Table view (24 columns, resizable, column picker, benchmark colour bars, score cell) | 5894-6002 | The primary grid | Medium — some columns add noise |
| Per-asset cash-flow expandables (one row per asset, click to expand a year-by-year CF table with aggregated totals at the bottom) | 6004-6270 | Year-by-year CF with Revenue / Land Rent / CAPEX / Net CF / Net Income / Cumulative | Low but has redundant toggle ("Expand All" + "Show Details" + year selector) |
| Hotel + Marina P&L modals | 6272-6282 | Specialised P&L builders | **Keep** — essential |
| `AssetDetailPanel` drawer (6 sections: Metrics / Basics / Geometry / Timeline / Revenue / Cost, with ~40 editable fields) | separate file | **The REAL editing surface** | **Medium — has "Advanced (optional)" clutter** |

### 1c. Two parallel edit paths (root cause of the "confusing" feeling)
| Path | Trigger | Where it lives | Fields it edits |
|---|---|---|---|
| **Inline Edit Modal** | `setEditIdx(i)` from card click OR row interactions | `App.jsx:5821-5892` — 72 lines of JSX | Basic / Areas / Revenue / Construction |
| **AssetDetailPanel drawer** | `setSelectedAssetIndex(i)` from "›" button (in card AND table) | `AssetDetailPanel.jsx` | Metrics / Basics / Geometry / Timeline / Revenue / Cost — ~40 fields |

Both write to `upAsset(i, {...})`, but the two forms **disagree on what's shown and what's hidden**:
- Inline modal has all fields flat (no advanced toggle).
- Drawer has "Advanced (optional)" section hiding 4 cost fields, plus zoning warnings, plus live CAPEX breakdown.

This is why the user says the cost-details arrow/button is "مخربطة" — clicking it sometimes opens the drawer, sometimes the inline modal, and they disagree.

---

## 2. What the user said + what I also found

### 2a. Direct asks
- **"الاستعراض بالبطاقات بدل الجدول ما احتاجها"** → Cards view goes. One view (table). All mobile responsiveness via the table's existing horizontal scroll.
- **"السهم أو الزر اللي بودي لتفاصيل تكاليف البناء ... مش مفهومة ومخربطة وفيها تفاصيل مو متاكد اذا نحاتجها"** → Cost Configuration section of `AssetDetailPanel` is the culprit. The "Advanced (optional)" block (basementCostMultiplier, parkingCostPerSqm, softCostPctOverride, contingencyPctOverride) is the noise. The "Live CAPEX Breakdown" dark panel shows 7 rows for a value already visible in the table as a single "Total CAPEX" cell.

### 2b. Things I found that I recommend cutting (and will explicitly list for your sign-off)

| Item | Where | Why cut |
|---|---|---|
| **Entire "Cards" view mode** | `App.jsx:5229` (viewMode state) + 5687-5689 toggle + 5741-5893 render block | User doesn't use it, ~150 LOC of parallel UI |
| **Inline Edit Modal** (`editIdx`) | `App.jsx:5230, 5821-5892` | Redundant with `AssetDetailPanel`. One drawer is clearer than two modals. |
| **"Asset Prep Guide" card** (empty state) | `App.jsx:5745-5756` | Shown only when `assets.length===0`; template picker itself is enough |
| **`plotReference` field** | `AssetDetailPanel.jsx:545-548` | Nearly always empty. Moves to "Advanced" or gets deleted. |
| **`notes` field** | `AssetDetailPanel.jsx:549` | Same — rarely used in feasibility pro-formas. |
| **`basementCostMultiplier`** | `AssetDetailPanel.jsx:818-822` + `engine/cashflow.js` (consumer) | Per-asset override. The project has a sensible default. Hide behind advanced. |
| **`parkingCostPerSqm`** | `AssetDetailPanel.jsx:823-827` | Same — hide behind advanced. |
| **`softCostPctOverride`** | `AssetDetailPanel.jsx:828-831` | Per-asset override of project-level softCostPct. Rare. Hide. |
| **`contingencyPctOverride`** | `AssetDetailPanel.jsx:832-835` | Same. Hide. |
| **`NLA` field** | `AssetDetailPanel.jsx:679` | GLA is enough for lease income; NLA is an architect's metric. Hide. |
| **`openArea` field** | `AssetDetailPanel.jsx:684` (and again 692) | Not used in engine. Hide or delete. |
| **`parkingArea` field** | `AssetDetailPanel.jsx:680-683` | Used only when `parkingCostPerSqm>0`. Tie to that (hidden together). |
| **Live CAPEX Breakdown dark panel** | `AssetDetailPanel.jsx:837-869` (33 lines) | Replace with a compact 3-line summary inline with cost input: Hard / Soft+Cont / Total. |
| **Cash-flow "Show Details" toggle** (Net Income + Cumulative extra rows) | `App.jsx:6093-6095` | Rarely flipped; can be a tooltip or just always-on. Collapses 2 rows. |
| **`Hard Cost` and `Soft+Cont` columns in table** | `App.jsx:5387-5388` + 5983-5986 | Sum to Total CAPEX which is already a column. Remove these two. |
| **Column resize handlers** (mouse drag handles) | `App.jsx:5405-5419, 5905` | Complex to maintain; user rarely resizes. The column picker covers width preference. |
| **Per-asset `assetPriority`** badge display | `App.jsx:5944-5945` | Small badge in table row that just labels the asset. Keep the field (useful in AssetDetailPanel) but drop the inline badge to reduce visual noise. |
| **Land-rent allocation details inline expandable** | `App.jsx:5570-5625` (55 lines) | The auto/manual toggle + per-phase % table is a power feature. Move to an "Advanced land rent allocation" modal triggered by a small link. Keep the math, move the UI. |

### 2c. Things I will **not** touch (explicit keep list)
- `Investment Metrics` section in AssetDetailPanel (ROI, cap rate, exit value, dev margin, break-even rate, revenue/m², cost/m²) — these are what the user actually uses.
- Per-asset cash-flow expandable (one row per asset with yearly CF table and IRR pill) — this is a core value-prop.
- Hotel + Marina P&L modals.
- Template picker.
- Import / Export to Excel.
- Filter bar.
- Phases bar.
- Smart-Reviewer alert dots next to asset names.
- Benchmark-color indicator bars on rate / cost / efficiency cells.
- Zoning warnings (coverage / FAR exceedances).
- GFA-vs-floors sanity check warning.
- Score cell (viability + impact).

---

## 3. Proposed redesign — the new Asset Program (5 parts)

### 3a. Header row (simpler)
```
[برنامج الأصول]   [30/30 أصول]                                    [⬇ نموذج] [⬇ تصدير] [⬆ رفع] [+ أصل]
Filters:  [المرحلة ▾]  [التصنيف ▾]  [نوع الإيراد ▾]  [🔽 أعمدة (17/22)]
Indirect: غ.مباشرة [10]% · احتياطي [5]%
```
- **Removed:** Cards/Table toggle (no cards mode), column resize handles.
- **Moved to secondary row:** Soft/Contingency inputs (they set a project default; don't deserve button-row real estate).

### 3b. Land section (unchanged visually, power features moved)
```
▶ 🏗 الأرض   [إيجار]  [302,473 m²]                                ← collapsed by default
```
Expanded state is the same as today minus:
- "تفاصيل توزيع الإيجار بين المراحل" expandable → replaced by a small link "⚙ توزيع متقدم للإيجار" that opens a modal. Math identical.

### 3c. Phases bar — unchanged.

### 3d. Assets table (one mode only)
Default visible columns (11):
```
#  Phase  Name [›]  Type  GFA  RevType  Rate  Occ%  Cost/m²  Total CAPEX  Revenue  Score  ···
```
Hidden by default (in the "Cols" picker, available on demand):
```
Code  Plot Area  Footprint  Eff%  Leasable  Esc%  Ramp  Build(mo)  EBITDA
```
**Removed permanently:**
- `Hard Cost` column (redundant with Total CAPEX)
- `Soft+Cont` column (redundant)
- Column-resize drag handles (replaced by the column picker for width control)

**Click behaviour unified:**
- Click a cell → edit that cell in place (as today)
- Click the `›` button next to the name → open the drawer (as today)
- The OLD "click row to open inline modal" path is **deleted** — nothing happens on row click; the row stays as a spreadsheet.

### 3e. AssetDetailPanel drawer — reshaped sections
```
┌─────────────────────────────────────┐
│  Asset: Mall                   ✕    │
│  Retail · ZAN 1                     │
├─────────────────────────────────────┤
│  📊 Investment Metrics      (open)  │  ← unchanged
│  ─ Annual Rev / Exit Value /        │
│    Dev Profit / Dev Margin /        │
│    Rev/m² / Cost/m²                 │
├─────────────────────────────────────┤
│  📝 Basics                 (open)  │
│  ─ Name · Code · Phase             │   ← removed: plotReference, notes
├─────────────────────────────────────┤
│  📐 Geometry & Areas      (open)   │
│  ─ Plot / Footprint / Floors        │
│    / Basement / GFA                 │
│  ─ Auto-derived: Coverage · FAR     │
│    · Leasable (GLA) · Benchmark     │
│  ─ Efficiency (editable)            │
│  ─ Warnings: zoning · GFA mismatch  │
│                                     │
│  [▶ متقدم]                          │   ← collapsed by default
│  — NLA · Parking Area · Open Area   │
├─────────────────────────────────────┤
│  📅 Phase & Timeline   (collapsed) │   ← unchanged
├─────────────────────────────────────┤
│  💰 Revenue         (collapsed)    │   ← unchanged (branches by revType)
├─────────────────────────────────────┤
│  🏗 Cost              (collapsed)   │
│  ─ Cost/m²                          │
│  ─ Build Duration (months)          │
│  ─ Compact breakdown (1 line):       │
│      Hard 120M · Soft+Cont 18M ·    │
│      Total 138M · avg 2,300 /m²     │
│                                     │
│  [▶ متقدم]                          │   ← collapsed by default
│  — Basement Cost Multiplier         │
│  — Parking Cost / m²                │
│  — Soft Cost % (override)           │
│  — Contingency % (override)         │
└─────────────────────────────────────┘
```
**What changed from today:**
1. `Basics` loses `plotReference` + `notes` (both rarely used — deleted from defaults.js and schema).
2. `Geometry` keeps everything but wraps `NLA / Parking Area / Open Area` in an "Advanced" collapse.
3. `Cost` moves the four overrides behind an "Advanced" collapse. Replaces the 33-line dark "Live CAPEX Breakdown" panel with a **single compact line** just under the Cost/m² input.
4. Section defaultOpen booleans reshuffled so the user sees Metrics + Basics + Geometry on first open (currently Metrics + Basics are open, Geometry is open, Timeline/Revenue/Cost are closed — I'd leave this as-is actually; no change to defaults).

### 3f. Per-asset cash-flow expandables (keep but tidy)
- "Expand All" button — keep.
- "Show Details" toggle (adds Net Income + Cumulative rows) → **delete**; show both always. Two extra rows per asset when expanded is not a burden.
- Year selector (10/15/20/30/50) — keep.
- Per-row `⚙ Full Settings` button → keep, opens drawer.

---

## 4. Fields being deleted (and their engine/storage impact)

For each deletion I will grep the whole codebase before removing, update tests, and note downstream changes:

| Field | defaults.js | engine reads | UI reads | Tests | Action |
|---|---|---|---|---|---|
| `plotReference` (asset-level) | no default | none | `AssetDetailPanel.jsx:545` only | none | Safe delete |
| `notes` (asset-level) | no default | none | `AssetDetailPanel.jsx:549` only | none | Safe delete |
| `openArea` (asset-level) | no default | none | 2 places in AssetDetailPanel | none | Safe delete, or keep as "advanced" |
| Inline `editIdx` state machine in AssetTable | — | — | ~72 lines of JSX | — | Safe delete — drawer replaces it |
| `viewMode` state + localStorage | — | — | ~5 places in AssetTable | — | Delete, assume "table" always |
| Column resize handlers (`onResizeStart`, `colWidths`, `resizingRef`) | — | — | AssetTable | — | Safe delete |
| `Hard Cost` + `Soft+Cont` table cols | — | computed inline via `computeAssetCapexBreakdown` (used elsewhere too) | AssetTable only | none | Safe delete column defs + cells only — engine function stays |

**Fields I will hide but not delete** (they may be used by power users later):
- `basementCostMultiplier`
- `parkingCostPerSqm`
- `parkingArea`
- `softCostPctOverride`
- `contingencyPctOverride`
- `nla`

These stay in the schema; they just move into an "Advanced" collapse that is closed by default. If the user later says "delete these too", we do a second pass.

---

## 5. Execution plan (phased, each with gate verification)

| Phase | What | Files touched | Gate |
|---|---|---|---|
| **P1 — Remove Cards view** | Delete `viewMode` state, toggle buttons, cards render block, empty-state prep-guide card | `App.jsx` (~180 LOC removed) | Build ✅ · tests 39/0 · open Jazan project → Assets tab renders as table |
| **P2 — Remove Inline Edit Modal** | Delete `editIdx` state + the 72-line inline modal; click paths redirect to drawer | `App.jsx` | Same gates + verify `›` button still opens drawer |
| **P3 — Cost "Advanced" collapse** | In AssetDetailPanel, wrap basementCostMultiplier/parkingCostPerSqm/softCostPctOverride/contingencyPctOverride in a collapsed "Advanced" section; replace dark CAPEX panel with 1-line summary | `AssetDetailPanel.jsx` | Same + verify edits still propagate to engine numbers |
| **P4 — Geometry "Advanced" collapse** | Wrap NLA/Parking Area/Open Area in Advanced | `AssetDetailPanel.jsx` | Same |
| **P5 — Delete plotReference + notes** | Remove from AssetDetailPanel; grep engine + tests to ensure no reads | `AssetDetailPanel.jsx` | Same + grep confirms no reads |
| ~~**P6 — Remove Hard Cost + Soft+Cont columns**~~ | **SKIPPED by user request 2026-04-18** — columns stay in the table. | — | — |
| ~~**P7 — Remove column resize**~~ | **SKIPPED by user request 2026-04-18** — drag handles stay. | — | — |
| **P8 — Land rent allocation → modal** | Replace inline expandable with a "⚙ توزيع متقدم" button that opens a modal; same math | `App.jsx` (~55 LOC move) | Same |
| **P9 — Cash-flow "Show Details" toggle → always on** | Delete toggle + make both extra rows always visible | `App.jsx` | Same |
| **P10 — Cleanup pass** | Grep for dead references, remove unused imports / state | `App.jsx` + `AssetDetailPanel.jsx` | `npm run build` clean · tests 39/0 · live Jazan walkthrough |

**Each phase is a separate commit** so reverting any one phase is trivial if something feels off.

---

## 6. Line-by-line review protocol (per the user's "اخيرا والقاعدة الاهم" request)

For every change in every phase:
1. Print the diff in the response.
2. For every function I touch, state: what it does, what I changed, why it's safe.
3. Before `git push`, grep the codebase for every identifier I'm removing; confirm zero references.
4. Run the test suite after every phase; refuse to commit if any test fails.
5. After every phase, browser-verify by opening the Jazan project on haseefdev.com and walking the Asset tab.

---

## 7. What the user needs to approve

1. The **removal list** in §2b (12 items) — any of these the user wants to keep?
2. The **deletion list** in §4 (the 2 hard deletions — `plotReference` and `notes`) — OK?
3. The **execution order** in §5 (10 phases) — OK or reorder?
4. The **HTML mockup** (file `01_mockup.html`) — is this the visual you want?
5. The **one-commit-per-phase** rhythm — OK or prefer bigger/smaller batches?

**Nothing will be executed until you say "موافق" / "نفّذ" / "go ahead" with these answers.**
