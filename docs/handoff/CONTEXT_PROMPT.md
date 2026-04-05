# Haseef (حصيف) — Full Context Handoff Prompt
# الصق هذا في محادثة جديدة كأول رسالة

---

## من أنا

أنا عبدالرحمن، صاحب مشروع Haseef (حصيف) — منصة نمذجة مالية للتطوير العقاري في السعودية.
أنا أتكلم عربي (سعودي) وأحياناً إنجليزي.

## المشروع

- **الاسم التجاري:** Haseef / حصيف
- **الريبو:** `/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler`
- **GitHub:** github.com/ARAHMAN97987/re-dev-modeler
- **Live:** https://re-dev-modeler.vercel.app
- **Domain:** haseefdev.com (متصل بـ Vercel — A: 76.76.21.21, CNAME: cname.vercel-dns.com)
- **Vercel:** teamId `team_HhGFmKe6CH03aHIbcwOHrTXl`, projectId `prj_O5IAasB3QMZrxKrXBPjJVNPZ22tz`
- **Stack:** React 18 + Vite 5 + Vercel Edge Functions + Supabase (auth/storage) + Claude API (AI copilot)

## هيكل الكود

```
src/App.jsx               ← 7,509 سطر (الملف الرئيسي — يحتاج تقسيم)
src/engine/               ← المحرك المالي (لا تعدله أبداً بدون اختبارات)
  cashflow.js             calcIRR, calcNPV, computeProjectCashFlows
  financing.js            computeFinancing (debt + equity + exit)
  waterfall.js            computeWaterfall (fund/jv فقط)
  phases.js               per-phase financing + waterfall + aggregation
  incentives.js           computeIncentives
  checks.js               runChecks (validation)
  hospitality.js          calcHotelEBITDA, calcMarinaEBITDA
  math.js                 calcIRR, calcNPV
  index.js                barrel + runFullModel orchestrator
src/smartReviewer.js      ← 416 سطر — 121 validation rule ضد benchmarks سعودية (READ-ONLY)
src/reportGenerator.js    ← 76 سطر — AI Advisory Report generator
src/components/
  views/                  ← 14 ملف (AssetTable, ResultsView, FinancingView, WaterfallView, CashFlowView, إلخ)
  shared/                 ← 19 ملف (SmartReviewerPanel, EditableCell, FormWidgets, NI, إلخ)
  layout/                 ← Sidebar.jsx
src/utils/                ← format.js, csv.js, metricColor.js, numberColor.js, payback.js
src/data/                 ← defaults.js, benchmarks.js, translations.js
api/chat.js               ← Edge Function للـ AI copilot (Claude API)
tests/                    ← 34 test file
```

**Pipeline:** `cashflow → incentives → financing → waterfall → per-phase → checks`

## الاختبارات (إجبارية بعد كل تعديل)

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node tests/engine_audit.cjs    # 267 test
node tests/zan_benchmark.cjs   # 160 test
# المجموع: 427 — كلها MUST PASS
```

**لازم تشغل الاختبارات + `npm run build` بعد أي تعديل. لو فشل شي = revert فوراً.**

## آخر حالة Git

```
آخر commit: bc3b05d fix: mobile responsiveness - font sizes, scroll indicators, touch targets
الحالة: 427/427 tests PASSING, build SUCCESS
```

**Commits الأخيرة (الأحدث أولاً):**
- `bc3b05d` fix: mobile responsiveness
- `17cdbc9` feat: add financial validation checks (landCap, DSCR)
- `f9d07e3` security: remove exposed token from remote URL
- `560fc6f` fix: React hooks ordering in ALL components + scroll overflow bug
- `78f68fb` fix: React hooks ordering bugs + improved error boundary
- `6bf0452` fix: robust JSON parser for report
- `0986e29` fix: 3 critical bugs — report 504, broken tables, Hijri date
- `a27437b` feat: opus 4.6 + chat personality + RTL
- `8741aa1` feat: Phase 5 — AI Advisory Report
- `d8e6a99` feat: Smart Reviewer completion — 122 rules
- `9cfd458` feat: Phase 3 — Scenario Optimizer

## ملفات مهمة اقرأها أولاً

1. **`docs/plans/README.md`** — Progress tracker لكل المهام
2. **`docs/plans/01_master_development_plan.md`** — خطة التطوير الشاملة (40 items)
3. **`docs/SESSION_HANDOFF.md`** — سياق الجلسات السابقة (تدقيق المحرك المالي)

## المهام المكتملة اليوم (4 أبريل 2026)

| # | المهمة | التقرير | الحالة |
|---|--------|---------|--------|
| 1 | Security: إزالة GitHub token من remote URL | `docs/TASK1_SECURITY_REPORT.md` | DONE |
| 2 | Comprehensive Audit: top 10 bugs | لا تقرير (نُفذت يدوياً) | DONE |
| 3 | Financial Validation: landCap+area=0, DSCR<1.0x, catchupMethod | `docs/TASK3_FINANCIAL_VALIDATION_REPORT.md` | DONE |
| 4 | Mobile: font min 11px, scroll indicators, touch targets 44px | `docs/TASK4_MOBILE_REPORT.md` | DONE |
| 0 | React hooks ordering fix (WaterfallView early return before hooks) | commit `560fc6f` | DONE |
| 0 | Scroll overflow:hidden → overflow:auto | commit `560fc6f` | DONE |

## المهام المتبقية (لم تُنفذ بعد)

**ملفات التعليمات موجودة في `haseef_tasks:/` — اقرأها قبل التنفيذ:**

| # | المهمة | ملف التعليمات | الأولوية |
|---|--------|---------------|---------|
| 5 | Asset Table UX: resizable columns, long text, xlsx import | `haseef_tasks:/task_05_asset_table.md` | عالية |
| 6 | Empty States: رسائل فارغة ثنائية اللغة + Quick Setup Wizard | `haseef_tasks:/task_06_empty_states.md` | عالية |
| 7 | Cash Flow View: إضافة OPEX, GOP, EBITDA, Reserves | `haseef_tasks:/task_07_cashflow.md` | متوسطة |
| 8 | AI Copilot: system prompt + project context + markdown tables | `haseef_tasks:/task_08_ai_copilot.md` | متوسطة |
| 9 | UX Polish: button colors, border-radius, translations, loading | `haseef_tasks:/task_09_ux_polish.md` | متوسطة |
| 10 | Final: scroll verification + deploy + comprehensive report | `haseef_tasks:/task_10_final.md` | منخفضة |

**مهام Asset Development Engine (ADE) في `asset_engine_tasks/`:**

| # | المهمة | ملف التعليمات |
|---|--------|---------------|
| 1 | Schema Extension: assetType, isBuilding, area types | `asset_engine_tasks/task_01_schema_extension.md` |
| 2 | Asset Type UI: dropdown في جدول الأصول | `asset_engine_tasks/task_02_asset_type_ui.md` |
| 3 | Detail Panel: expandable edit form | `asset_engine_tasks/task_03_detail_panel.md` |
| 4 | Templates: Saudi benchmarks | `asset_engine_tasks/task_04_templates_enhanced.md` |
| 5 | Area Logic: GFA/BUA/NLA sync | `asset_engine_tasks/task_05_area_logic.md` |
| 6 | Verify + Deploy | `asset_engine_tasks/task_06_verify_deploy.md` |

## خطة تقسيم App.jsx (مُعلّقة)

في خطة مفصلة في plan mode (`staged-baking-star.md`) لتقسيم App.jsx من 7,509 → ~1,200 سطر.
- Phase 1-5: مكتملة (shared utilities, views extraction)
- Phase 6: متوقفة — كان فيه bug (React #310 infinite re-renders) لما حاولنا extract views
- **السبب:** Views في `src/components/views/` موجودة لكن App.jsx لا زال يستخدم inline versions — في duplication
- **المطلوب:** مطابقة الـ inline code مع الـ file version ثم swap (واحد بواحد مع commit لكل واحد)

## قواعد عمل ثابتة

1. **لا تعدل `src/engine/`** بدون ما تشغل كل الـ 427 test
2. **لا تحذف ملفات** — خزّنها في `archive/`
3. **Build + Test بعد كل تعديل** — `npm run build && node tests/engine_audit.cjs && node tests/zan_benchmark.cjs`
4. **Brand = "Haseef" أو "حصيف" فقط**
5. **الاختبارات إجبارية** — لو test فشل، أصلحه فوراً أو revert
6. **لا تقول "تم" بدون ما تتحقق فعلياً** — شغّل الأمر وشوف النتيجة
7. **nvm مطلوب** — دائماً شغّل `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"` قبل أي أمر node

## أخطاء معروفة أو محلولة (مرجع)

| المشكلة | السبب | الحل |
|---------|-------|------|
| React Error #310 (infinite re-renders) | `useEffect`/`useState` بعد early return | انقل كل الـ hooks قبل أي early return |
| Build يعطي "command not found: node" | nvm مش محمّل | `export NVM_DIR=...` |
| WaterfallView crash | early return on line 361 before useEffect on line 373 | moved early return after all hooks |
| FinancingView tracerOpen crash | useState inside conditional IIFE | hoisted to function top level |
| الـ scroll ما يوصل لآخر الصفحة | `overflow:hidden` على container رئيسي (line ~4084) | `overflow:auto` |
| land capitalization bug | landArea=0 مع landCapitalize=true | أضفنا check في checks.js |

## حقول المشروع الرئيسية

**Asset fields** (على `project.assets[i]`):
`category, name, gfa, plotArea, footprint, costPerSqm, leaseRate, stabilizedOcc, efficiency, constrDuration, constrStart, rampUpYears, revType, opEbitda, escalation, salePricePerSqm`

**Project fields** (على `project`):
`softCostPct, contingencyPct, rentEscalation, horizon, landArea, landRentAnnual, landRentGrace, landRentEscalation, landRentTerm`

**Financing fields** (على `project`):
`finMode, maxLtvPct, financeRate, debtGrace, loanTenor, upfrontFeePct`

**Fund fields** (على `project`):
`prefReturnPct, carryPct, annualMgmtFeePct, developerFeePct, structuringFeePct, subscriptionFeePct, exitYear, exitCapRate, exitMultiple, exitCostPct, fundLife`

**Engine outputs:**
`results.consolidated.irr, financing.leveredIRR, financing.dscr[], waterfall.lpIRR/gpIRR/lpMOIC/gpMOIC, waterfall.totalFees`

**Update functions:**
`up({field: value})` for project, `upAsset(i, {field: value})` for assets

## Deploy

```bash
npx vercel deploy --prod
```

أو عبر git push (auto-deploy مفعّل على Vercel).

---

## المطلوب الآن

[اكتب هنا وش تبيه يسوي — مثلاً:]

نفّذ المهام المتبقية (5-10) من `haseef_tasks:/` بالترتيب. كل مهمة:
1. اقرأ ملف التعليمات كاملاً
2. نفّذ
3. `npm run build && node tests/engine_audit.cjs && node tests/zan_benchmark.cjs`
4. لو كل شي ناجح → commit + deploy
5. لو فشل → revert + سجل السبب
6. انتقل للمهمة التالية
