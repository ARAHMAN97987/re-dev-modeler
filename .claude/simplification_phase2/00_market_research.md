# Simplification Campaign #2 — Market Research

**Date:** 2026-04-18
**Purpose:** Ground Phase 2 decisions in the actual Saudi real-estate market context, not assumptions.

---

## 1. Who actually uses a financial modeller for KSA real-estate?

### 1a. Major capital sources (determines what the model must speak to)

- **Public Investment Fund (PIF)** — historically ~50% of giga-project financing; the 2026–2030 strategy is explicitly shifting toward more private-developer participation. Means: private developers are being asked to bring real pro-formas, not just pitch decks.
- **REDF (Real Estate Development Fund)** — homeownership / small-developer financing vehicle. Provides subsidised rates, down-payment support up to **SAR 150k for up to 36 months**, and land-value offset (ضمان وزارة الإسكان). REDF borrowers care more about loan service + monthly cashflow than IRR/waterfalls.
- **Commercial banks + Islamic banks** — dominant source for conventional-structured deals. Underwriting centres on DSCR, LTV, tenor.
- **Sharia-compliant investment funds (صناديق استثمارية)** — e.g. Al Rajhi Capital + Arabian Dyar's **Haramain Projects Fund — SAR 4.5B initial, up to SAR 20B in phases** for Mecca/Madinah (announced March 2026). These funds expect waterfalls with preferred returns and a clear promote/carry (called "حصة المطور" or "حافز الأداء" locally).
- **Family offices / HNWI (أفراد)** — often take passive LP positions in fund structures. Care about preservation + cash yield, not max IRR.

### 1b. Government incentive landscape (what the `incentives` tab should cover)

- **REDF support matrix** — tiered by income bracket, non-refundable down-payment.
- **Ministry of Housing in-kind support** — deducts land value from housing-unit value.
- **Vision 2030 Housing Program** — streamlined project approvals, off-plan sales regulation giving legal protection to buyers/developers.
- **RETT (Real Estate Transaction Tax)** — 5% on sale price (affects exit modelling). VAT 15% applies to brokerage/legal/valuation services, not the deal itself.
- **Islamic finance compliance** — many KSA deals must be Murabaha or Ijara. The app has `islamicMode` but it's minimally used (4 files only).

### 1c. Market indicators developers actually watch (2025 Q3)

Per CBRE Q3 2025 Saudi Arabia Real Estate Market Review:
- **Office (Riyadh Grade A):** 98% occupancy, 15% YoY rental appreciation — extreme landlord market.
- **Residential:** Strongly demand-driven by population growth + Vision 2030 repatriation.
- **Retail:** Under supply in Tier-2 cities; over supply in some Riyadh submarkets.
- **Hospitality:** Driven by religious tourism + entertainment infrastructure.
- **Industrial/Logistics:** Growing with Saudi manufacturing reshoring.
- **Marina:** Niche — relevant for Red Sea / Jazan / Jeddah developers.

---

## 2. What the app's user (this user) is actually doing

From the codebase + user's brief:
- Saudi developer, primary project is Jazan (30 assets, 3 phases, 1.34B SAR CAPEX, fund mode).
- Sometimes serves other developers as an advisory engagement (runs models for clients).
- Geography: Jazan, Riyadh, also the Red Sea / Hajj-corridor economics.
- Does NOT need: per-investor names, per-investor IRR tables (confirmed by Revert Option A).
- DOES need: phased development (multi-phase projects are the norm), hospitality/marina specialised P&L, Arabic-first UX, Excel export for bank packages + fund memos.

---

## 3. What we can learn from competitors

### 3a. ARGUS EstateMaster (desktop, Altus Group)
- Primarily a pro-forma + cashflow tool for developers.
- Extremely flexible but extremely manual — spreadsheet-like interface.
- Strength: every line item is editable.
- Weakness: steep learning curve; no opinions; user assembles everything.
- Licensing: $$, per-seat desktop.

### 3b. ARGUS Enterprise (SaaS, Altus Group)
- Valuation + asset management oriented.
- Targets large funds, REITs.
- Not a feasibility tool.

### 3c. Excel models (custom / Excel Modeling)
- The default for most developers globally — including most KSA developers.
- Every developer has their own Excel model, tuned to their style.
- Strength: total control, total auditability.
- Weakness: error-prone, hard to version, painful for multi-phase or multi-project portfolios.

### 3d. Gap that Haseef fills
- **Arabic-first** (none of the above is).
- **Saudi incentive structures baked in** — REDF, land rent rebates, CAPEX grants, finance support.
- **Opinionated defaults + sensible ranges** — reduces manual work.
- **Multi-phase native** — ZAN 1/2/3 style projects are a first-class concept.
- **Fund structure first** — most KSA dev deals now are fund-structured (not direct balance-sheet).

**Implication:** The right bar for Haseef is **"a KSA developer's first day can produce a bank-ready pro-forma in 30 min"** — not "match ARGUS's flexibility." Phase 2 should cut anything that makes a first-time user hesitate.

---

## 4. Terminology / vocabulary notes for KSA

| English (current app) | Arabic the app uses | What KSA professionals actually say | Phase 2 recommendation |
|---|---|---|---|
| GP / LP | "المطور" / "المستثمر" | المطور / الممول / المستثمر / الصندوق | Keep current — the revert already landed the right choice |
| Preferred return | العائد التفضيلي | عائد الحد الأدنى / hurdle | Remove from UI (already hidden); still appears in engine — see Phase 2 task |
| Carry / promote | كاري / حصة الأداء | "حصة المطور فوق الحد" / "حافز الأداء" | Already renamed "Performance Incentive" — good |
| Waterfall | شلال التوزيعات | نموذج التوزيعات / هيكل العوائد | Consider renaming UI to "هيكل التوزيعات" |
| Catchup | تعويض الشريك | "التعويض الكامل" | Already hidden — confirm fully remove in Phase 2 |
| DSCR | نسبة تغطية خدمة الدين | DSCR (English abbreviation widely used) | Keep as-is |
| Land partner | شراكة أرض | شريك أرض / مالك أرض / شراكة عينية | Keep |
| Land capitalization | رسملة الأرض | رسملة / قيمة حق الانتفاع | Keep |

---

## 5. What the Saudi market asks from a model (priorities)

Ranked by how often they appear in fund memos / bank submissions we see in this codebase's output:

1. **Phased cashflow** (مشروع متعدد المراحل) — 3-5 years construction, with debt drawdown schedule.
2. **DSCR sensitivity** — banks require min DSCR > 1.0x in every year of operation.
3. **NPV @ multiple discount rates** — typically 10%, 12%, 14% for KSA deals.
4. **Land-rent capitalisation** — حق الانتفاع is common; needs to be modelled as equity-equivalent.
5. **Islamic-compliant structure option** — relevant for a growing share of deals (but still minority).
6. **Incentive impact quantification** — "how much does the CAPEX grant add to IRR?"
7. **Sensitivity to CAPEX + rent + escalation** — the three levers that dominate IRR variance.
8. **Exit scenarios** — sale, hold, cap-rate. Sale Absorption for residential developments.
9. **Bank-package output** — Excel with debt schedule, DSCR table, drawdown.
10. **Investor memo output** — waterfall, IRR, hurdle, promote.

The current app covers **all ten**. Simplification #2 shouldn't remove any of these. What it can do: reduce how many clicks/fields it takes to reach them.

---

## 6. What is rarely asked for in KSA deals (thus fair game for Phase 2)

- Per-investor names and IRR tables (confirmed — removed already).
- Multiple preferred-return tiers / waterfall catchups (confirmed — Performance Incentive is simpler and dominant).
- Currency conversion (the market is SAR-only for domestic deals).
- US-style tax shield modelling (not applicable).
- BOT-specific operation revenue modelling beyond the basics (narrow use).
- Multiple debt tranches beyond senior + gov-subsidised (rare in KSA except for PIF-backed deals).

---

## Sources

- [Alternative Financing Models for Real Estate and Infrastructure in Saudi Arabia — King & Spalding](https://www.kslaw.com/news-and-insights/alternative-financing-models-for-real-estate-and-infrastructure-in-saudi-arabia)
- [PIF 2026–2030 Strategy — Public Investment Fund](https://www.pif.gov.sa/en/news-and-insights/press-releases/2026/chaired-by-hrh-crown-prince-pif-board-of-directors-approves-pif-2026-2030-strategy/)
- [Saudi Bank, Developer Start $1.2 Billion Fund For Mecca, Madinah — Bloomberg (March 2026)](https://www.bloomberg.com/news/articles/2026-03-18/saudi-bank-developer-start-1-2-billion-fund-for-holy-cities)
- [Real Estate Development Fund — NDF](https://ndf.gov.sa/en/fund/redf/)
- [Saudi Real Estate Fund boosts homeownership with $257m for Sakani program — Arab News](https://www.arabnews.com/node/2482026/business-economy)
- [Saudi Arabia Real Estate Market Review Q3 2025 — CBRE](https://www.cbre.sa/press-releases/saudi-arabia-real-estate-market-review-q3-2025)
- [KSA Living Market Dynamics Q2 2025 — JLL Research](https://www.jll.com/en-ae/insights/market-dynamics/ksa-living)
- [KSA Real Estate Report H1 2025 Review and H2 2025 Outlook — Argaam](https://argaamplus.s3.amazonaws.com/87931c16-68d0-4715-bd6b-3de06172558f.pdf)
- [Vision 2030 Housing Program](https://vision2030.ai/vision/programmes/housing-program/)
- [Real Estate Fees and Taxes in Saudi Arabia — ARAB MLS](https://arabmls.org/real-estate-fees-and-taxes-in-saudi-arabia/)
- [ARGUS EstateMaster — Property Development Feasibility Software](https://www.altusgroup.com/solutions/argus-estatemaster/)
- [ARGUS Enterprise — Commercial Property Valuation Software](https://www.altusgroup.com/solutions/argus-enterprise/)
