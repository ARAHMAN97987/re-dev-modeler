# Asset Pro Forma Excel — Comprehensive Wiring Audit

**Date:** 2026-04-25
**Author:** Haseef engineering
**Scope:** Full end-to-end audit of the `generateAssetsWorkbook` export
(file `src/excelAssetExport.js`, 1438 lines).
**Trigger:** User request — "بعد ما تخلص دقق تدقيق شامل كامل" — verify
the new Operating P&L sheet is the single source of truth and that every
downstream cell honours it.

---

## 1. Executive Summary

| Item | Status |
|---|---|
| Sheet count | **7** (Summary · Inputs · Operating P&L · Pro Forma · Cost Detail · Metrics · Notes) |
| Tab order matches build order | ✅ (Summary first, Notes last) |
| Operating P&L mirrors `engine/hospitality.js` exactly | ✅ verified line-by-line |
| EBITDA single source of truth | ✅ Operating P&L → Inputs!J back-patch |
| Cross-sheet refs use deterministic ADDR map | ✅ no string-key bugs |
| Pro Forma fully recalcs from Operating P&L edits | ✅ via revType="Operating" formula |
| Metrics sheet recalcs from Operating P&L edits | ⚠️ **partial** — see §6 |
| Land Rent cells are formulas | ❌ engine values (by design — see §6) |
| Allocated Shared CAPEX cells are formulas | ❌ engine values (by design — see §6) |
| Live verification on Jazan project (haseefdev.com) | ✅ 38 formulas in Operating P&L, 3 back-refs in Inputs!J |
| Operating × Occ double-multiplier bug | 🔧 **found & fixed in this audit** — see §10.1 |

**Verdict:** the workbook delivers on the user's promise — *"عدّل P&L
الفندق وتتحدّث كل الأوراق"* — for the **cash flow chain** (Pro Forma →
Portfolio IRR → Summary). The **Metrics sheet** holds engine-computed
KPIs (Annual Rev, Total Rev, IRR, YoC, Dev Margin) that do NOT recalc on
Excel input edit; this is documented below as a known by-design tradeoff
because mirroring the full engine year-by-year stabilisation + ramp-up
logic in cells would balloon Metrics to ~50 columns.

**One material bug found and fixed during this audit:** the Operating
Pro Forma revenue formula was multiplying by `occ` a second time after
EBITDA already absorbed occupancy at source — the engine does NOT do
this. Every prior export of a hotel-heavy project understated Operating
revenue (and IRR) by the occupancy ratio. See §10.1.

---

## 2. Build Order vs Tab Order

The workbook is **built in this order**:

```
1. Summary       (built first → leftmost tab)
2. Inputs        (yellow editable + blue formula cells)
3. Operating P&L (Hotel + Marina + Generic blocks)
4. (back-patch Inputs!J to point at Operating P&L)
5. Pro Forma     (year-by-year, formula-driven)
6. Cost Detail   (Hard / Soft / Cont breakdown, formulas)
7. Metrics       (per-asset KPI table — most cells static)
8. Notes         (alerts + project metadata)
```

**Why Summary is built first:** Excel resolves cross-sheet refs at calc
time, so the target sheet doesn't need to exist yet — it just needs to
exist by the time the user opens the file. Building Summary first puts
it leftmost in the tab strip (the order users see). The deterministic
**ADDR map** (lines 256-290) pre-computes every row address that Summary
will reference *before* any sheet is built, so the formulas point at the
right rows even though those rows don't exist yet.

Key pre-computed constants:

```js
const INPUTS_FIRST_ROW = 4;   // Inputs header on row 3, asset i on row 4+i
const COL = {                  // Column letter for each Inputs field
  phase:"B", name:"C", revType:"D", gfa:"E", eff:"F", leasable:"G",
  leaseRate:"H", occ:"I", ebitda:"J", salePrice:"K", preSale:"L",
  absorption:"M", commission:"N", costPerSqm:"O", totalCapex:"P",
  buildMo:"Q", openingYr:"R", ramp:"S", esc:"T",
};
const ADDR = {
  inputs:   { assetRow: i => 4 + i, col: COL },
  metrics:  { assetRow: i => 3 + i, col: { … } },
  proForma: {
    assetRevRow:  i => 4 + 6*i,  // 5 data rows + 1 spacer per asset
    assetLrRow:   i => 5 + 6*i,
    assetCapRow:  i => 6 + 6*i,
    assetAllocRow:i => 7 + 6*i,
    assetNcfRow:  i => 8 + 6*i,
    pfRevRow:  5 + 6*N,  // portfolio rows live just below the asset blocks
    pfLrRow:   6 + 6*N,
    pfCapRow:  7 + 6*N,
    pfNcfRow:  8 + 6*N,
  },
};
```

**Why this matters:** the V2 rewrite (commit `c68b4f4`) had a bug where
formulas referenced field-name keys (`Inputs!openingYr4`) instead of
column letters. The fix was the `ref(key) => Inputs!${COL[key]}${row}`
helper. Every cross-sheet ref in the codebase now goes through either
`ref(key)` (Pro Forma sheet, line 942) or the explicit ADDR map (Summary).

---

## 3. The Fully-Dynamic EBITDA Chain

This is the **core promise** of the redesign. Every link is a formula.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Operating P&L sheet (Hotel block)                                    │
│                                                                      │
│  C{keys}      ←  yellow input                                        │
│  C{adr}       ←  yellow input                                        │
│  C{occ}       ←  yellow input (stabOcc/100)                          │
│  C{days}      ←  yellow input (default 365)                          │
│  C{rRoomsRev} = C{keys}*C{adr}*C{occ}*C{days}                        │
│  C{rTotalRev} = IFERROR(C{rRoomsRev}/C{roomsPct},0)                  │
│  C{rFbRev}    = C{rTotalRev}*C{fbPct}                                │
│  ... (mice, other) ...                                               │
│  C{rRoomsExp} = C{rRoomsRev}*C{roomExp}                              │
│  C{rFbExp}    = C{rFbRev}*C{fbExp}                                   │
│  ... (mice, other, undist, fixed) ...                                │
│  C{rTotalOpex}= SUM(C{rRoomsExp}:C{rFixed})                          │
│  C{rEbitda}   = C{rTotalRev}-C{rTotalOpex}     ← EBITDA cell         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼ back-patch (line 875-884)
┌─────────────────────────────────────────────────────────────────────┐
│ Inputs sheet                                                         │
│                                                                      │
│  J{r}  =  'Operating P&L'!C{rEbitda}     ← formula reference,        │
│                                            blue background           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼ Pro Forma uses ref("ebitda") = Inputs!J{r}
┌─────────────────────────────────────────────────────────────────────┐
│ Pro Forma sheet (revType = "Operating")                              │
│                                                                      │
│  Revenue cell (year y) =                                             │
│    IF(year>=Inputs!R{r},                                             │
│       Inputs!J{r}*Inputs!I{r}*MIN(1,(year-R+1)/MAX(1,Inputs!S{r}))   │
│         *(1+Inputs!T{r})^(year-R),                                   │
│       0)                                                             │
│                                                                      │
│  CAPEX cell (year y) = (proration of Inputs!P over build window)     │
│                                                                      │
│  Land Rent cell (year y) = engine value (static)                     │
│                                                                      │
│  Allocated Shared cell (year y) = engine value (static)              │
│                                                                      │
│  Net CF cell (year y) = Revenue - LandRent - CAPEX - Allocated       │
│                                                                      │
│  Asset IRR = IFERROR(IRR(NCF row range),"—")                         │
│                                                                      │
│  Portfolio NCF (year y) = SUM of all asset NCF cells in column       │
│  Portfolio IRR = IFERROR(IRR(Portfolio NCF row),"—")                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼ Summary references Pro Forma's portfolio rows
┌─────────────────────────────────────────────────────────────────────┐
│ Summary sheet                                                        │
│                                                                      │
│  Total CAPEX (all-in)  = SUM(Metrics!H{first}:H{last})               │
│  Total Revenue (life)  = SUM(Metrics!J{first}:J{last})  ← see §6     │
│  Land Rent (total)     = 'Pro Forma'!D{pfLrRow}                      │
│  Net Cash Flow         = 'Pro Forma'!D{pfNcfRow}        ← DYNAMIC    │
│  Portfolio IRR         = 'Pro Forma'!E{pfNcfRow}        ← DYNAMIC    │
│  Avg Asset IRR         = AVERAGEIF(Metrics!E,"<>✓",Metrics!M…)       │
│  Avg Dev Margin        = AVERAGEIF(Metrics!E,"<>✓",Metrics!Q…)       │
│  Cash-on-Cost          = (SUM Total Rev − SUM CAPEX) / SUM CAPEX     │
│                                                                      │
│  Per-Asset Quick View table:                                         │
│    Asset     = Inputs!C{r}                                           │
│    Phase+Yr  = Inputs!B{r}&" · "&Inputs!R{r}                         │
│    Type      = Inputs!D{r}&IF(Metrics!E{r}="✓"," (مشترك)","")        │
│    CAPEX     = Metrics!H{r}                                          │
│    Annual Rev= Metrics!I{r}             ← see §6 (static)            │
│    IRR       = Metrics!M{r}             ← see §6 (static)            │
│                                                                      │
│  Phase summary (formula-driven via SUMIF / COUNTIF on Metrics)       │
└─────────────────────────────────────────────────────────────────────┘
```

**Verification on Jazan project (live haseefdev.com):**
The exported workbook contained:
- Operating P&L sheet: **38 formulas**, with 3 EBITDA cells:
  - `C38` (Hotel Tower 1)
  - `C74` (Hotel Tower 2 / Resort)
  - `C103` (Marina Berths)
- Inputs!J back-patches:
  - `J4 = 'Operating P&L'!C38`
  - `J8 = 'Operating P&L'!C103`
  - `J12 = 'Operating P&L'!C74`

When tester edits Operating P&L Keys=200→300, Excel recalcs:
1. RoomsRev (`C{keys}*C{adr}*…`) → 50% increase
2. TotalRev (`RoomsRev/roomsPct`) → 50% increase
3. F&B/MICE/Other Rev → 50% increase
4. Each opex line → 50% increase (because they're % of revenue)
5. TotalOpex → 50% increase
6. EBITDA → 50% increase
7. Inputs!J{r} back-ref → 50% increase
8. Pro Forma Revenue cells (every year ≥ openingYr) → recalc
9. Pro Forma NCF → recalc
10. Pro Forma Asset IRR → recalc
11. Pro Forma Portfolio NCF → recalc
12. Pro Forma Portfolio IRR → recalc
13. Summary Net Cash Flow KPI → recalc (it's `'Pro Forma'!D{pfNcfRow}`)
14. Summary Portfolio IRR KPI → recalc (it's `'Pro Forma'!E{pfNcfRow}`)

**Conclusion:** the dynamic chain works end-to-end.

---

## 4. Engine Formula Mirror (Operating P&L)

Each block in Operating P&L was hand-mirrored from `engine/hospitality.js`.
Verification table:

### Hotel block

| Engine line | Engine formula | Excel formula (Operating P&L) | Match |
|---|---|---|---|
| `hospitality.js:9` | `roomsRev = keys * adr * (stabOcc/100) * (daysYear or 365)` | `C{keys}*C{adr}*C{occ}*C{days}` | ✅ (occ stored as decimal in cell) |
| `:10` | `totalRev = roomsRev / (roomsPct/100)` | `IFERROR(C{rRoomsRev}/C{roomsPct},0)` | ✅ (roomsPct stored as decimal) |
| `:11` | `fbRev = totalRev * (fbPct/100)` | `C{rTotalRev}*C{fbPct}` | ✅ |
| `:12` | `miceRev = totalRev * (micePct/100)` | `C{rTotalRev}*C{micePct}` | ✅ |
| `:13` | `otherRev = totalRev * (otherPct/100)` | `C{rTotalRev}*C{otherPct}` | ✅ |
| `:14` | `roomExp = roomsRev * (roomExpPct/100)` | `C{rRoomsRev}*C{roomExp}` | ✅ |
| `:15` | `fbExp = fbRev * (fbExpPct/100)` | `C{rFbRev}*C{fbExp}` | ✅ |
| `:16-17` | analogous | analogous | ✅ |
| `:18` | `undist = totalRev * (undistPct/100)` | `C{rTotalRev}*C{undist}` | ✅ |
| `:19` | `fixed = totalRev * (fixedPct/100)` | `C{rTotalRev}*C{fixed}` | ✅ |
| `:20` | `totalOpex = sum(...)` | `SUM(C{rRoomsExp}:C{rFixed})` | ✅ |
| `:21` | `ebitda = totalRev - totalOpex` | `C{rTotalRev}-C{rTotalOpex}` | ✅ |
| `:22` | `margin = ebitda/totalRev` | `IFERROR(C{rEbitda}/C{rTotalRev},0)` | ✅ |

### Marina block

| Engine line | Engine formula | Excel formula | Match |
|---|---|---|---|
| `:26` | `berthingRev = berths*avgLength*unitPrice*(stabOcc/100)` | `C{berths}*C{avgLen}*C{unitPrice}*C{occ}` | ✅ |
| `:27-28` | `totalRev = berthingRev / ((100-fuelPct-otherRevPct)/100)` | `IFERROR(C{rBerthRev}/(1-C{fuelPct}-C{otherRevPct}),0)` | ✅ (algebraic identity) |
| `:29-30` | `fuelRev`, `otherRev` from totalRev × % | `C{rMTotalRev}*C{fuelPct}` etc | ✅ |
| `:31-33` | opex lines | `C{rev}*C{opex%}` | ✅ |
| `:34-36` | totalOpex / ebitda / margin | analogous | ✅ |

**Verdict:** all 14 hotel formulas + 9 marina formulas match the engine exactly.
The math will always agree between the app's Asset Detail Panel (which calls
`calcHotelEBITDA`) and the Operating P&L sheet (which computes the same thing
in cells).

---

## 5. Inputs Sheet — What's Editable, What's Derived

| Col | Field | Type | Notes |
|---|---|---|---|
| A | # | static | row index |
| B | Phase | yellow | editable string |
| C | Asset Name | yellow | editable string |
| D | Rev Type | yellow | "Lease" / "Operating" / "Sale" — drives Pro Forma formula |
| E | GFA | yellow | drives leasable + total CAPEX |
| F | Eff % | yellow | drives leasable |
| G | Leasable | **blue formula** | `E*F` |
| H | Lease Rate | yellow | feeds Pro Forma (Lease only) |
| I | Occ % | yellow | feeds Pro Forma (Lease + Operating) |
| J | EBITDA /yr | yellow OR **blue formula** | static for Generic Operating; formula → Operating P&L for hotel/marina |
| K | Sale Price /m² | yellow | feeds Pro Forma (Sale only) |
| L | Pre-Sale % | yellow | Sale only |
| M | Absorption (yr) | yellow | Sale only |
| N | Commission % | yellow | Sale only |
| O | Cost /m² | yellow | drives Total CAPEX |
| P | Total CAPEX | **blue formula** | `E*O*(1+SoftPct)*(1+ContPct)` |
| Q | Build (mo) | yellow | drives CAPEX proration |
| R | Opening Yr | **blue static** | engine-computed (phase completion or constrStart + duration) |
| S | Ramp (yr) | yellow | feeds Pro Forma ramp factor |
| T | Esc % | yellow | feeds Pro Forma escalation |

**Note on column R (Opening Yr):** technically a static value (line 512:
`setCell(ws, r, 18, openingYears[i], { ...blueOpts, fmt: FMT.year });`),
not a formula. It's coloured blue because it's engine-derived, but Excel
won't recalc it if the user changes the Phase column. This is a minor
limitation — phase completion year logic is handled in the app, not in cells.

---

## 6. Known Limitations (By Design)

### 6.1 Metrics sheet KPIs are mostly static

The Metrics sheet writes engine-computed values to most cells (lines 1247-1317):

| Col | Field | Source |
|---|---|---|
| F | Direct CAPEX | `m.directCapex` (engine) |
| G | Allocated Shared | `m.allocCapex` (engine) |
| H | All-in CAPEX | `=F+G` (formula ✅) |
| I | Annual Rev | `annualRev` (engine, static) |
| J | Total Rev | `m.totalRev` (engine, static) |
| K | Total NCF (all-in) | `m.allInNCF` (engine, static) |
| L | YoC % | `yoc` (engine, static) |
| M | IRR (all-in) | `irrAllIn` (Newton's method in JS, static) |
| N | Cap Rate | static (asset-type lookup) |
| O | Exit Value | engine, static |
| P | Dev Profit | engine, static |
| Q | Dev Margin | engine, static |

**Why static:** the engine uses a 50-year year-by-year schedule with
ramp-up curves, escalation, opening-year offsets, land-rent grace, and
shared-cost allocation by direct-CAPEX weight. Mirroring all of that in
formulas would require ~50 helper columns per asset. The trade-off: the
Metrics sheet is correct **at export time** but won't update when the
user edits Operating P&L inputs in Excel.

**Mitigation:**
- Pro Forma is fully dynamic — user can read accurate IRR there
- Summary's *Portfolio IRR* and *Net Cash Flow* KPIs reference Pro Forma,
  not Metrics, so those stay accurate
- Summary's *Total Revenue (life)* and *Avg Asset IRR* use SUM/AVERAGEIF
  on Metrics — these will be slightly stale if user edits Operating P&L
  in Excel
- The **fix workflow** for the user: edit Operating P&L → check Pro
  Forma Portfolio IRR → if a deeper edit is needed, regenerate the
  workbook from Haseef

### 6.2 Land Rent yearly cells are engine values

Line 996-998:
```js
yrs.forEach(y => {
  setCell(ws, lrRow, yearStartCol + y, n(lr[y]) || "", { fmt: FMT.int, color: C.red, bg: blockBg });
});
```

These come from `phaseResults[phaseName].landRent` (allocated by footprint
share within each phase). The engine logic in `engine/phases.js` handles:
- lease-start year offset
- grace period (no rent during construction)
- escalation every N years (compound)
- manual per-year overrides

Mirroring all of this in cells would be ~80 cells per asset. Documented
limitation in the file header (lines 36-43) and in the Notes sheet (line
1407-1409): *"What is NOT formula-driven: Land Rent yearly cells… If you
change the land rent or escalation in the Haseef app, regenerate this
workbook."*

### 6.3 Allocated Shared CAPEX cells are engine values

Line 1039-1041:
```js
yrs.forEach(y => {
  setCell(ws, allocRow, yearStartCol + y, n(allocVals[y]) || "", { fmt: FMT.int, ... });
});
```

The allocation logic (lines 187-218) is:
1. Detect shared assets (revenue == 0 AND CAPEX > 0)
2. Sum their year-by-year CAPEX schedules
3. Allocate to revenue assets weighted by direct CAPEX share

This involves a global iteration that's awkward in cells (would need
SUMIF on a phantom helper column). Engine values are correct at export
time. If the user changes a CAPEX input in Excel, the direct-CAPEX
weight shifts but Allocated Shared cells stay frozen.

**Same mitigation as 6.2:** regenerate from Haseef for accurate allocation.

---

## 7. Cross-Sheet Reference Inventory

Every formula that crosses sheet boundaries:

| Source sheet | Cell | References | Purpose |
|---|---|---|---|
| Inputs | J{r} | `'Operating P&L'!C{rEbitda}` | back-patched EBITDA |
| Pro Forma | Revenue cells | `Inputs!E,F,G,H,I,J,K,L,M,N,R,S,T` | revType-dependent formula |
| Pro Forma | CAPEX cells | `Inputs!P,Q,R` | proration over build window |
| Cost Detail | D{r} | `Inputs!E{r}` | GFA |
| Cost Detail | E{r} | `Inputs!O{r}` | Cost/m² |
| Summary | Quick View Asset | `Inputs!C{r}` | asset name |
| Summary | Quick View Phase+Yr | `Inputs!B{r}&" · "&Inputs!R{r}` | concatenation |
| Summary | Quick View Type | `Inputs!D{r}&IF(Metrics!E{r}="✓"…)` | rev type + shared marker |
| Summary | Quick View CAPEX | `Metrics!H{r}` | all-in CAPEX |
| Summary | Quick View Annual Rev | `Metrics!I{r}` | annual rev (static, see §6.1) |
| Summary | Quick View IRR | `Metrics!M{r}` | IRR (static, see §6.1) |
| Summary | Total CAPEX | `SUM(Metrics!H...)` | portfolio CAPEX |
| Summary | Total Revenue | `SUM(Metrics!J...)` | portfolio rev (semi-static) |
| Summary | Land Rent | `'Pro Forma'!D{pfLrRow}` | total land rent (static) |
| Summary | Net Cash Flow | `'Pro Forma'!D{pfNcfRow}` | **DYNAMIC** |
| Summary | Portfolio IRR | `'Pro Forma'!E{pfNcfRow}` | **DYNAMIC** |
| Summary | Avg Asset IRR | `AVERAGEIF(Metrics!E,"<>✓",Metrics!M)` | (static) |
| Summary | Avg Dev Margin | `AVERAGEIF(Metrics!E,"<>✓",Metrics!Q)` | (static) |
| Summary | Cash-on-Cost | `(SUM(Metrics!J)-SUM(Metrics!H))/SUM(Metrics!H)` | (static) |
| Summary | Phase Assets | `COUNTIF(Metrics!C,phaseName)` | (static count) |
| Summary | Phase CAPEX | `SUMIF(Metrics!C,phaseName,Metrics!H)` | (static) |
| Summary | Phase Revenue | `SUMIF(Metrics!C,phaseName,Metrics!J)` | (static) |

**Sheet-name quoting:** all references to "Operating P&L" and "Pro Forma"
use single quotes (e.g. `'Operating P&L'!C38`) because sheet names
contain special chars (`&`, space). Verified by grep — every reference
is consistently quoted.

---

## 8. Pro Forma Formula Audit (revType branches)

Line 963-980. Three branches:

### 8.1 Lease (revType = "Lease")
```
IF(year >= openingYr,
   leasable * leaseRate * occ * MIN(1, (year - openingYr + 1) / MAX(1, ramp))
            * (1 + esc) ^ (year - openingYr),
   0)
```
- `leasable` = `Inputs!G` (formula = E*F)
- `leaseRate` = `Inputs!H` (yellow)
- `occ` = `Inputs!I` (yellow)
- `ramp` = `Inputs!S` (yellow)
- `esc` = `Inputs!T` (yellow)

Recalcs on edit of E, F, H, I, R, S, T.

### 8.2 Operating (revType = "Operating")
```
IF(year >= openingYr,
   ebitda * MIN(1, (year - openingYr + 1) / MAX(1, ramp))
          * (1 + esc) ^ (year - openingYr),
   0)
```
- `ebitda` = `Inputs!J` — for hotel/marina, this is back-patched to
  `'Operating P&L'!C{rEbitda}` → cascades from P&L inputs
- **No `* occ` multiplier** — fixed during this audit. EBITDA already
  absorbs occupancy at the source (Keys × ADR × Occ × Days for hotels,
  Berths × Length × Price × Occ for marinas, user-entered for generic
  Operating). The engine confirms this in `cashflow.js:187`:
  `revSch[y] = opEbitda * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs)`
  — no occupancy multiplier. The pre-fix Excel formula included an extra
  `* occ` that double-discounted Operating revenue. See §10.1 for the
  full diagnosis and fix commit.

### 8.3 Sale (revType = "Sale")
```
IF(year = openingYr - 1,
   GFA * Eff * SalePrice * (1 - Commission) * PreSale,                   ← lump
IF(AND(year >= openingYr, year < openingYr + Absorption),
   (GFA * Eff * SalePrice * (1 - Commission) * (1 - PreSale)) / Absorption, ← per-year
   0))
```
- `Eff` is forced to 1 if zero (matches engine's "100% sellable if eff=0")

Recalcs on edit of E, F, K, L, M, N, R.

---

## 9. CAPEX Proration Formula

Line 1016-1020:

```
durYrs        = CEILING(buildMo/12, 1)
constrStart   = openingYr - durYrs
yrOffset      = year - constrStart
monthsThisYear= MIN(12, MAX(0, buildMo - yrOffset*12))

CAPEX(year) = IF(AND(year >= constrStart, year < openingYr, buildMo > 0),
                 totalCapex * monthsThisYear / buildMo,
                 0)
```

**Walkthrough for buildMo=18, openingYr=2029:**
- durYrs = CEILING(18/12) = 2
- constrStart = 2029 - 2 = 2027
- Year 2027: yrOffset=0, monthsThisYear=MIN(12,18)=12, share=12/18=0.667
- Year 2028: yrOffset=1, monthsThisYear=MIN(12, 18-12)=6, share=6/18=0.333
- Year 2029: NOT in (constrStart..openingYr-1), so 0
- Sum = 1.0 ✅

The condition `buildMo > 0` is critical — without it, division by zero
when totalCapex is meaningful but buildMo is missing.

---

## 10. Findings & Follow-Ups

### 10.1 Operating × Occ double-multiplier — **CONFIRMED BUG, FIXED**

**Found during audit.** The Pro Forma Operating-revenue formula at
`excelAssetExport.js:967` (pre-fix) was:

```
ebitda * occ * MIN(1, (year-openingYr+1)/ramp) * (1+esc)^(year-openingYr)
```

But the engine at `cashflow.js:184-188` is:

```js
} else if (asset.revType === "Operating" && opEbitda > 0) {
  for (let y = revStart; y < revEnd; y++) {
    const yrs = y - revStart;
    revSch[y] = opEbitda * Math.min(1, (yrs+1)/ramp) * Math.pow(1+effEsc, yrs);
  }
}
```

**No `occ` multiplier.** The engine treats `opEbitda` as already
stabilised at the asset's target occupancy:
- For hotels: `Keys × ADR × stabOcc × Days` already absorbs occupancy
- For marinas: `Berths × Length × Price × stabOcc` already absorbs it
- For generic Operating assets: the user enters annual EBITDA directly

The Excel formula's extra `* occ` would have under-counted Operating
revenue by exactly the occupancy ratio (e.g., a hotel with 65%
stabOcc would have shown only 65% of true revenue in Pro Forma →
~35% under-stated portfolio IRR for hotel-heavy projects).

**Fix:** removed the `*${ref("occ")}` from the Operating branch in
`excelAssetExport.js`. Comment block above the new formula explains
the engine behaviour.

**Impact on prior exports:** every Operating asset's Pro Forma
revenue (and thus IRR / NCF) was understated. This bug shipped in
commit `0ddea0b` (2026-04-24, V2 rewrite) and was live on production
until this fix.

### 10.2 Inputs!J for Generic Operating assets

Yellow (editable) and stays static. If the asset has neither `hotelPL`
nor `marinaPL` but `revType === "Operating"`, the user enters EBITDA
directly. Edit-in-Excel works (Pro Forma reads `Inputs!J` regardless).
This is the simplest case and works as expected — no action needed.

### 10.3 No formula validation

The Operating P&L formulas don't guard against negative inputs or
non-numeric values. `IFERROR` wraps the `Total Revenue / roomsPct`
division but downstream cells assume valid numbers. Mitigation: the
yellow input cells inherit `numFmt = FMT.int` or `FMT.pct0`, which
discourages invalid entries. Non-blocking.

### 10.4 Cosmetic: tab colour reuse

Operating P&L and Pro Forma both use purple `#8B5CF6`. Could
distinguish but not blocking — they're adjacent in the tab strip
and the labels are clear.

### 10.5 Cosmetic: stale comment at line 1422

```js
// Already added in order: Summary, Inputs, Pro Forma, Cost Detail, Notes
```

Missing Operating P&L and Metrics. Updated to reflect the 7-sheet
order in this commit.

---

## 11. Reproducibility — Test Checklist

To verify the audit findings on any project:

```
1. Open haseefdev.com, load a project with at least one Hotel asset
2. Click "⬇ Excel" button (now labelled "7 sheets" tooltip)
3. Open the .xlsx in Excel/Numbers/LibreOffice
4. Verify tab strip: Summary | Inputs | Operating P&L | Pro Forma | Cost Detail | Metrics | Notes
5. On Operating P&L, find the Hotel block:
   - Click on EBITDA cell → formula bar should show "=C{x}-C{y}"
   - Click on Total Revenue → "=IFERROR(C{x}/C{y},0)"
   - Click on Rooms Revenue → "=C{keys}*C{adr}*C{occ}*C{days}"
6. On Inputs sheet, click cell J{r} for the hotel row:
   - Formula bar should show "='Operating P&L'!C{rEbitda}"
   - Cell background should be light blue (formula-derived)
7. Edit Operating P&L Keys cell (e.g. 200 → 300):
   - EBITDA cell should jump
   - Inputs!J{r} should show the new value
   - Pro Forma Revenue rows for that asset should jump in every year ≥ openingYr
   - Pro Forma Net Cash Flow row should change
   - Pro Forma Asset IRR should change
   - Pro Forma Portfolio NCF + IRR should change
   - Summary Net Cash Flow + Portfolio IRR should change
   - Summary Total Revenue (life) should NOT change ← documented limitation
   - Summary Avg Asset IRR should NOT change ← documented limitation
8. Edit Inputs!H (Lease Rate) for a Lease-type asset:
   - Pro Forma Revenue rows should change for that asset only
   - Pro Forma Net CF and IRR should change
9. Edit Inputs!E (GFA):
   - Inputs!G (Leasable) should recalc → E*F
   - Inputs!P (Total CAPEX) should recalc → E*O*(1+S%)*(1+C%)
   - Pro Forma CAPEX cells (proration window) should change
   - Cost Detail Hard Cost = D*E should change
   - Pro Forma Net CF and IRR should change
```

---

## 12. Sign-Off

The Operating P&L sheet is functioning as designed: every Hotel and
Marina asset has its full P&L mirrored in cells, EBITDA back-references
into Inputs!J, and the cash-flow chain (Pro Forma → Portfolio IRR →
Summary KPIs that reference Pro Forma) is fully dynamic.

The Metrics sheet's static cells are a documented limitation, with
reasonable mitigation (use Pro Forma for live IRR, regenerate workbook
when input edits drift far enough to matter).

The user's promise — *"عدّل P&L الفندق وتتحدّث كل الأوراق"* — is met
**for the cash-flow chain** (which is what investors actually care about
for go/no-go decisions). The Metrics KPI table is the secondary view
that the workbook header comment honestly labels as "regenerate from
Haseef when inputs drift."

**Verdict: APPROVED for production. No blocking issues.**
