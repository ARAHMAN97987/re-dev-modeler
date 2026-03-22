# 04 — إعادة هيكلة صفحة التمويل → الهيكلة المالية

**التاريخ:** 2026-03-22
**النوع:** تغيير واجهة فقط — المحرك لا يتغير
**الملفات المتأثرة:** `src/App.jsx` (FinancingView function, tabs array)
**الاختبارات المطلوبة:** 743 PASSED | 0 FAILED بعد كل تعديل

---

## 1. الوضع الحالي

### اسم التاب
```
{key:"financing", label: lang==="ar" ? "التمويل" : "Financing", group:"finance"}
```

### هيكل الإعدادات
كل الإعدادات مخبأة خلف زر ⚙ واحد (showConfig accordion):

```
⚙ إعدادات التمويل والتخارج  [مطوي بالتلقائي]
  ├── آلية التمويل (selector bar - دائماً مرئي)
  ├── 📘 شروط القرض          visible: finMode !== "self"
  ├── 🟣 التخارج              visible: true (دائماً)
  ├── 🟣 الأرض والملكية        visible: finMode !== "self" && finMode !== "bank100"
  ├── 🟢 هيكل الصندوق         visible: finMode === "fund"
  ├── 🟢 حافز الأداء (الشلال)  visible: finMode === "fund"
  └── 🟡 الرسوم               visible: true (محتوى متغير)
```

### المشاكل
1. **⚙ مخفي** — المستخدم لا يرى الإعدادات إلا بالضغط (flagged in UX audit)
2. **التخارج والأرض** مدفونين داخل إعدادات التمويل رغم أنهم مفاهيم مستقلة
3. **كل الأقسام** تحت مظلة واحدة بدل تنظيم حسب آلية التمويل
4. **vehicleType** يمسح الرسوم نهائياً بدل إخفائها (bug معروف)
5. **اسم التاب "التمويل"** ضيق — لا يعبر عن التخارج والملكية والرسوم

---

## 2. الهيكل الجديد

### اسم التاب
```
{key:"financing", label: lang==="ar" ? "الهيكلة المالية" : "Financial Structure", group:"finance"}
```

> ملاحظة: key يبقى "financing" لتجنب كسر أي مراجع بالكود

### المبدأ
الأقسام تظهر مباشرة كـ **sections مستقلة** على الصفحة (بدون ⚙ accordion). كل قسم يُفتح/يُغلق بشكل مستقل. ظهوره مرتبط بآلية التمويل.

### الهيكل الجديد
```
┌─────────────────────────────────────────────────┐
│  [Phase Selector - if multi-phase]              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ① آلية التمويل / Financing Mode               │  ← دائماً مرئي (compact bar)
│     [self] [bank100] [debt] [fund]              │
│                                                 │
│  ② التخارج / Exit Strategy                     │  ← دائماً مرئي
│     exit type, exit year, multiple/caprate,     │
│     exit cost %, stabilization years            │
│                                                 │
│  ③ شروط القرض / Loan Terms                     │  ← شرطي: bank100, debt, fund
│     LTV, rate, tenor, grace, repayment,         │
│     upfront fee, capitalize IDC, Islamic        │
│                                                 │
│  ④ الأرض والملكية / Land & Equity              │  ← شرطي: debt, fund
│     leasehold cap, cap rate/sqm, credit to,     │
│     rent payer, GP equity sources (fund),       │
│     GP manual equity (debt)                     │
│                                                 │
│  ⑤ هيكل الصندوق / Fund Structure              │  ← شرطي: fund فقط
│     vehicle, fund name, start year,             │
│     GP = fund manager                           │
│                                                 │
│  ⑥ حافز الأداء / Performance Incentive         │  ← شرطي: fund فقط
│     pref return, carry, LP split, catch-up,     │
│     fee treatment, pref allocation,             │
│     catch-up method                             │
│                                                 │
│  ⑦ الرسوم / Fees                               │  ← دائماً مرئي (محتوى متغير)
│     - Dev Fee (دائماً)                          │
│     - Fund fees: sub, structuring, pre-est,     │
│       SPV, mgmt, custody, auditor               │
│       (fund + vehicle=fund فقط)                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Results Panel - KPIs, tables, charts]         │  ← لا يتغير (يبقى كما هو)
└─────────────────────────────────────────────────┘
```

---

## 3. مصفوفة الظهور

| # | القسم | self | bank100 | debt | fund |
|---|-------|------|---------|------|------|
| ① | آلية التمويل | ✅ | ✅ | ✅ | ✅ |
| ② | التخارج | ✅ | ✅ | ✅ | ✅ |
| ③ | شروط القرض | ❌ | ✅ | ✅ | ✅ |
| ④ | الأرض والملكية | ❌ | ❌ | ✅ | ✅ |
| ⑤ | هيكل الصندوق | ❌ | ❌ | ❌ | ✅ |
| ⑥ | حافز الأداء | ❌ | ❌ | ❌ | ✅ |
| ⑦ | الرسوم (dev fee) | ✅ | ✅ | ✅ | ✅ |
| ⑦b | الرسوم (fund fees) | ❌ | ❌ | ❌ | ✅* |

\* fund fees تظهر فقط عند vehicleType === "fund" (المنظم)

### ما يراه المستخدم حسب الآلية:

**self (ذاتي):**
```
① آلية التمويل
② التخارج
⑦ الرسوم (dev fee فقط)
```

**bank100 (بنكي 100%):**
```
① آلية التمويل
② التخارج
③ شروط القرض
⑦ الرسوم (dev fee فقط)
```

**debt (دين + ملكية):**
```
① آلية التمويل
② التخارج
③ شروط القرض
④ الأرض والملكية (GP equity)
⑦ الرسوم (dev fee فقط)
```

**fund (صندوق):**
```
① آلية التمويل
② التخارج
③ شروط القرض
④ الأرض والملكية (capitalization + GP sources)
⑤ هيكل الصندوق
⑥ حافز الأداء
⑦ الرسوم (كل الرسوم)
```

---

## 4. تفصيل كل قسم

### ① آلية التمويل / Financing Mode
**الحقول:** finMode (select)
**اللون:** #2563eb (أزرق)
**ملاحظة:** يبقى كـ compact bar (ليس accordion). التبديل يُظهر/يُخفي الأقسام مباشرة.

**تأثير التبديل:**
| من → إلى | السلوك |
|-----------|--------|
| أي → bank100 | debtAllowed=true, maxLtvPct=100 |
| bank100 → أي آخر | maxLtvPct=70 |
| fund → غيره | **إخفاء** رسوم الصندوق (لا تُمسح - يتغير فقط visible) |
| غيره → fund | **إظهار** رسوم الصندوق (القيم المحفوظة ترجع) |

> ⚠ **إصلاح مطلوب:** حالياً fundReset يصفّر الرسوم. يجب تغييره لإخفاء فقط.

### ② التخارج / Exit Strategy
**الحقول:**
- exitStrategy (sale/hold/caprate)
- exitYear (عند sale/caprate)
- exitMultiple (عند sale)
- exitCapRate (عند caprate)
- exitCostPct (عند sale/caprate)
- exitStabilizationYears (عند self mode — بدل debtGrace)

**اللون:** #8b5cf6 (بنفسجي)
**دائماً مرئي**

**ملاحظة:** exitStabilizationYears حالياً غير موجود في الواجهة. يُستخدم بالمحرك (financing.js) لوضع self فقط. يجب إضافة حقل له عند finMode === "self".

### ③ شروط القرض / Loan Terms
**الحقول:**
- debtAllowed (Y/N — فقط عند debt/fund، bank100 دائماً Y)
- maxLtvPct (ليس عند bank100 — مثبت 100%)
- financeRate
- loanTenor
- debtGrace
- graceBasis (cod/firstDraw/fundStart) — fundStart فقط عند fund
- repaymentType (amortizing/bullet)
- debtTrancheMode (single/perDraw) — حالياً بالمحرك بدون UI
- upfrontFeePct
- islamicFinance toggle
- capitalizeIDC

**اللون:** #2563eb (أزرق)
**مرئي عند:** bank100, debt, fund

**ملاحظة:** debtTrancheMode موجود بالمحرك بلا toggle بالواجهة. مسجل بالـ backlog (fin_audit findings item 3).

### ④ الأرض والملكية / Land & Equity
**الحقول (تعتمد على السياق):**

**عند lease/bot landType:**
- landCapitalize (Y/N)
- landCapRate (سعر/م²)
- landCapTo (gp/lp/split)
- landRentPaidBy (auto/project/gp/lp) — فقط عند lease

**عند fund mode:**
- gpInvestDevFee (Y/N) + gpDevFeeInvestPct
- gpCashInvest (Y/N) + gpCashInvestAmount
- Live summary (Total Equity breakdown)

**عند debt mode:**
- gpEquityManual (Developer Equity amount)

**اللون:** #8b5cf6 (بنفسجي)
**مرئي عند:** debt, fund

### ⑤ هيكل الصندوق / Fund Structure
**الحقول:**
- vehicleType (fund/direct/spv)
- fundName (عند vehicle=fund)
- fundStartYear
- gpIsFundManager (Y/N)

**اللون:** #16a34a (أخضر)
**مرئي عند:** fund فقط

### ⑥ حافز الأداء / Performance Incentive (Waterfall)
**الحقول:**
- prefReturnPct
- carryPct
- lpProfitSplitPct + auto GP calculation
- gpCatchup (Y/N)
- feeTreatment (capital/rocOnly/expense)
- prefAllocation (proRata/lpOnly)
- catchupMethod (perYear/cumulative)

**اللون:** #16a34a (أخضر)
**مرئي عند:** fund فقط

### ⑦ الرسوم / Fees
**محتوى متغير:**

**كل الأوضاع:** developerFeePct (% من CAPEX البناء بدون الأرض)

**fund + vehicle=fund إضافة:**
- One-time: subscriptionFeePct, structuringFeePct, structuringFeeCap, preEstablishmentFee, spvFee
- Annual: annualMgmtFeePct, mgmtFeeBase, mgmtFeeCapAnnual, custodyFeeAnnual, auditorFeeAnnual

**اللون:** #f59e0b (أصفر)
**دائماً مرئي** (المحتوى يتغير)

---

## 5. التغييرات على الكود

### 5.1 تغييرات مطلوبة

| # | التغيير | الملف | السطور التقريبية |
|---|---------|-------|-----------------|
| C1 | إعادة تسمية التاب | App.jsx | ~3087 |
| C2 | إزالة ⚙ accordion wrapper — الأقسام تظهر مباشرة | App.jsx | ~1975-1990 |
| C3 | تحويل AH/AB sections لـ standalone SecWrap cards | App.jsx | ~1995-2450 |
| C4 | إصلاح fundReset: حذف التصفير بالكامل | App.jsx | ~2019 |
| C5 | تبديل SecWrap visible حسب finMode | App.jsx | أقسام ①-⑦ |
| C6 | graceBasis: إخفاء خيار fundStart لغير fund | App.jsx | قسم ③ |
| C7 | حذف رسالة "لا يوجد تمويل خارجي" لوضع self | App.jsx | ~2408 |

### 5.2 لا يتغير
- المحرك (financing.js, waterfall.js, phases.js) — لا تعديل
- Results panel — يبقى كما هو
- Per-phase logic — يبقى كما هو
- الحقول الحالية — لا إضافة ولا حذف
- exitStabilizationYears — خارج النطاق (كود ميت)
- islamicMode — خارج النطاق (بلا تأثير حسابي)

### 5.3 خطة التنفيذ
```
Step 1: إعادة تسمية التاب (C1) — تغيير سطر واحد
Step 2: إزالة ⚙ accordion وتحويل لـ sections مباشرة (C2, C3)
Step 3: تطبيق مصفوفة الظهور (C5)
Step 4: حذف fundReset التصفير (C4)
Step 5: تنظيم graceBasis options حسب mode (C6)
Step 6: حذف رسالة self mode (C7)
Step 7: تشغيل 743 تيست → fix any failures
Step 8: Push + deploy
```

---

## 6. نقاط تحتاج قرار

| # | النقطة | الخيارات | التوصية |
|---|--------|---------|---------|
| D1 | الأرض والملكية لـ self/bank100 | (A) إخفاء كامل (B) عرض معلومات الأرض فقط readonly | **A: إخفاء** — لا حاجة لقرارات ملكية بدون equity split |
| D2 | تاب "حافز الأداء" المستقل | (A) يبقى كتاب مستقل (B) يدمج بالنتائج | **A: يبقى** — خارج نطاق هذا التغيير |
| D3 | vehicleType reset behavior | (A) إخفاء الرسوم (B) تصفير الرسوم | **A: إخفاء** — حسب الـ backlog |
| D4 | debtTrancheMode UI | (A) إضافة toggle (B) تأجيل | **B: تأجيل** — ليس من نطاق التغيير الحالي |
| D5 | gpIsFundManager تأثير | (A) ربطه بالحسابات (B) يبقى عرض | **B: يبقى** — ليس من نطاق التغيير |

---

## 7. المخاطر

| # | الخطر | الاحتمال | التأثير | التخفيف |
|---|-------|---------|---------|--------|
| R1 | كسر المشاريع القديمة (constrStart/completionMonth) | منخفض | عالي | لا نغير المحرك — UI فقط |
| R2 | focus loss عند إعادة هيكلة الـ JSX | متوسط | متوسط | التأكد من تعريف components خارج render |
| R3 | cfg/upCfg proxy logic ينكسر | منخفض | عالي | لا نغير proxy logic — فقط ترتيب العرض |
| R4 | حجم App.jsx كبير → drag-and-drop upload | مؤكد | منخفض | رفع عبر GitHub UI كالعادة |
| R5 | vehicleType إخفاء بدل تصفير → رسوم قديمة تعود | منخفض | متوسط | التحقق من defaults.js عند التبديل الأول |

---

## 8. ملاحظات مكتشفة أثناء بناء الهيكلة (مُحدّثة بعد الدراسة)

1. **exitStabilizationYears** — ~~موجود بالمحرك~~ **كود ميت**: موجود في defaults.js:76 فقط. financing.js:95 يستخدم hard-coded `+3` ولا يقرأ هذا الحقل. **قرار: خارج النطاق** — لا نضيف UI ولا نعدل المحرك.

2. **graceBasis: "fundStart"** — خيار منطقي فقط لوضع fund. حالياً يظهر لكل الأوضاع. يجب تصفيته.

3. **islamicMode** — موجود بـ defaults.js و FINANCING_FIELDS لكن: (أ) لا يوجد toggle بالواجهة، (ب) الاختبارات تثبت صفر تأثير حسابي (conventional = murabaha = ijara). **قرار: خارج النطاق** — لا نضيف toggle. يبقى حقل مستقبلي.

4. **تاب "حافز الأداء" المستقل** (waterfall tab) — يعرض نتائج الشلال. **قرار: يبقى** — خارج نطاق التغيير.

5. **رسائل الأوضاع البسيطة** — self mode "لا يوجد تمويل خارجي". **قرار: نحذفها** — الأقسام المعروضة تشرح نفسها بالهيكل الجديد.

6. **fundReset يمسح 8 حقول** — الإصلاح أبسط مما توقعنا: **نحذف fundReset بالكامل**. القيم تبقى بالـ project object. المحرك يتجاهلها تلقائياً (waterfall.js → null لغير fund، financing.js لا يقرأ fund fees لغير fund).

7. **Results panel already adapts** — يعرض sections مختلفة حسب isFund/isBank/isSelf. لا يحتاج تعديل.

8. **SecWrap/AH/AB** — معرفين داخل render function (closures على cfgOpen/cfgToggle). يبقون كما هم — نعيد ترتيبهم فقط.

9. **lpEquityManual/gpEquityManual** — لا زالوا بـ FINANCING_FIELDS رغم استبدالهم بنظام 3 مصادر GP. **تنظيف مستقبلي** — لا يأثر على التغيير الحالي.
