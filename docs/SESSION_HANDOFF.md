# برومبت السيشن الجديدة — RE-DEV MODELER تدقيق التمويل

---

## السياق

أنا صاحب مشروع RE-DEV MODELER (اسم العلامة التجارية: ZAN Financial Modeler) — منصة نمذجة مالية لمشاريع التطوير العقاري.

GitHub: github.com/ARAHMAN97987/re-dev-modeler
Token: [يعطيك إياه عبدالرحمن بأول رسالة]
Live: https://re-dev-modeler.vercel.app/
Vercel: teamId team_HhGFmKe6CH03aHIbcwOHrTXl, projectId prj_O5IAasB3QMZrxKrXBPjJVNPZ22tz

---

## الريبو فيه خطط وتوثيق مهمة — اقرأها أول شي

### 1. docs/plans/README.md
Progress tracker لكل المهام. فيه حالة كل item (done/pending). **اقرأه قبل أي شغل.**

### 2. docs/plans/01_master_development_plan.md
خطة التطوير الشاملة — 40 item من 3 تقييمات (UX visual, deep UX, code/financial). مقسمة لـ:
- Phase 0: Financial Trust (4 items — 4 done)
- Phase 1: UX Quick Wins (9 items — 0 done)
- Phase 2A: Engine Hardening (6 items — E1 done)
- Phase 2B: Core UX Fixes (12 items — 0 done)
- Phase 3: Polish (8 items — 0 done)

**بعد ما ننهي حملة التدقيق الحالية، حنبدأ نشتغل على هالخطة.**

### 3. docs/plans/02_code_splitting_plan.md
خطة تقسيم الكود — 18 خطوة. **مكتملة 100%** + 4 action items من Output Contract **مكتملة 100%**.
فيها dependency graph للمحرك + output contract + reviewer feedback. مرجع مهم لفهم هيكل الكود.

### 4. docs/plans/03_completed_log.md
سجل تفصيلي لكل شي اتسوى ومتى وأي deviations.

### 5. archive/README.md
ملفات غير فاعلة محفوظة للمرجع (App.jsx.backup القديم).

---

## هيكل الكود بعد التقسيم

```
src/engine/          ← المحرك المالي (كل الحسابات)
  math.js            calcIRR, calcNPV
  hospitality.js     calcHotelEBITDA, calcMarinaEBITDA
  cashflow.js        computeProjectCashFlows (الأساس)
  incentives.js      computeIncentives, applyInterestSubsidy
  financing.js       computeFinancing (الدين + الملكية + التخارج)
  waterfall.js       computeWaterfall (الشلال - fund/jv فقط)
  phases.js          Per-phase financing + waterfall + aggregation
  checks.js          runChecks (validation)
  index.js           Barrel + runFullModel orchestrator
  legacy/            computePhaseWaterfalls (deprecated)

src/data/            defaults.js, benchmarks.js, translations.js
src/utils/           format.js, csv.js
src/App.jsx          UI فقط (~10,600 سطر)
tests/helpers/engine.cjs   Import gateway للتيستات
```

Pipeline: `cashflow → incentives → financing → waterfall → per-phase → checks`

---

## اللي سويناه بالسيشن السابقة (تدقيق التمويل)

### أولاً: إكمال تقسيم الكود
- 18/18 خطوة + 4/4 Output Contract action items ✅
- Parity tests (98 تيست) — legacy vs aggregated ✅
- MOIC formula fix في aggregatePhaseWaterfalls ✅

### ثانياً: تدقيق التدفق النقدي (cashflow.js) — سطر بسطر ✅
- كل شي صحيح
- أزلنا dead import (hospitality)
- سجلنا 5 ملاحظات تحسينية (vacancy غير مستخدم, CAPEX خطي, إلخ)

### ثالثاً: تدقيق آلية التمويل (financing modes)
اكتشفنا وأصلحنا:

| Bug | الوصف | الملف |
|-----|-------|-------|
| **debt GP/LP** | وضع debt كان يقسم equity 50/50 GP/LP. المفروض GP=100% | financing.js |
| **waterfall for debt** | الشلال كان يُحسب لوضع debt. المفروض fund/jv فقط | waterfall.js |
| **maxLtvPct reset** | التبديل من bank100→debt ما يرجع LTV لـ 70% | App.jsx |
| **LP UI references** | تحذير LP=0 وعرض LP بالمعادلة والتقارير لوضع بدون LP | App.jsx (4 مواقع) |
| **self exitGrace** | وضع self يستخدم debtGrace. أضفنا exitStabilizationYears | financing.js + defaults.js |
| **wizard skip exit** | الويزارد يتخطى التخارج لـ self. الآن يعرضه للكل | App.jsx |
| **land purchase double-count** | سعر شراء الأرض يُحسب مرتين (CAPEX + cashLandCost) | financing.js + 3 test files |
| **repaymentType fallback** | بدون default → الدين ما يُسدد. أضفنا fallback "amortizing" | financing.js |
| **totalProjectCost missing** | ما كان بالتجميع (aggregatePhaseFinancings) | phases.js |

### رابعاً: تدقيق آلية الدين — سطر بسطر ✅
راجعنا كل قسم:
- معاملات الدين (rate, tenor, grace, repayYears, maxDebt) ✅
- السحب والـ Drawdown (pro-rata مع CAPEX) ✅
- فترة السماح (4 خيارات: cod, firstDraw, fundStart, manual) ✅
- السداد (amortizing/bullet) في single block و per-draw ✅
- الفوائد (avg balance × rate + upfront fee) ✅
- التخارج (per-asset valuation, balloon, post-exit cleanup) ✅
- DSCR (proxy NOI, موثق) ✅
- Levered CF formula ✅

### ملاحظة مسجلة لم تُصلح بعد:
- **PresentationView MOIC** (App.jsx:8467): يستخدم TotalDist/TotalInvested (الصيغة القديمة). خارج نطاق التدقيق الحالي.

---

## التيستات

بعد كل تعديل لازم تشغّل:
```bash
node tests/regression.cjs        # 50
node tests/full_suite.cjs        # 205
node tests/input_impact.cjs      # 108
node tests/fin_audit_p1.cjs      # 58
node tests/fin_audit_p2.cjs      # 52
node tests/zan_benchmark.cjs     # 160
node tests/immutability.cjs      # 12
node tests/parity.cjs            # 98
# المجموع: 743 PASSED | 0 FAILED
```

---

## معايير ثابتة لقبول العمل

### 1. التدقيق سطر بسطر
لما أقول "دقق" أقصد: اقرأ كل سطر كود متعلق، تتبع كل متغير من مصدره لاستخدامه، تأكد من الشروط والحدود.

### 2. تدقيق الانعكاسات
بعد أي تعديل:
- ابحث عن كل مكان يستخدم المتغير/الدالة المعدلة (grep)
- دقق كل مكان سطر بسطر
- تأكد إن التعديل ما كسر شي بمكان ثاني
- **ما تقول "✅ آمن" إلا بعد ما تثبت بالكود**

### 3. لا تحذف ملفات
خزّنها في archive/ مع documentation واضح.

### 4. موقع الكود
دائماً لما تتكلم عن أي شي بالكود، حدد الملف والسطر على GitHub.

### 5. التيستات إجبارية
بعد كل تعديل: شغّل كل التيستات (743). Fix failures تلقائياً. لا تسأل.

### 6. ارجع للمحادثات السابقة
إذا احتجت تفهم سياق أو قرار سابق، ابحث بالمحادثات السابقة في هذا المشروع.

---

## المطلوب الآن

نكمل حملة تدقيق صفحة التمويل. اللي اتدقق بالمحرك (engine) مكتمل. الباقي:
**[عبدالرحمن يحدد هنا وش يبي يدقق بعدين]**

أول شي: اسحب آخر نسخة من GitHub وتأكد من الهيكل.
