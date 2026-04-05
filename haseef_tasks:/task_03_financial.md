# TASK 3: Financial Validation & Warnings

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

## القواعد الصارمة
- لا تطلب إذن المستخدم — autonomous 100%
- لا تعدل ملفات tests/
- لا تعدل منطق المحرك المالي (engine defaults) — التغييرات هنا هي UI warnings فقط
- لو فشل أي test ← revert فوراً ← حل بديل
- Brand = "Haseef" أو "حصيف" فقط

---

## المطلوب
1. تنبيه أحمر لما `landCapitalize=Y` و `landArea=0`
2. تحذير DSCR أقل من 1.0x مع اقتراح تعديل LTV
3. التحقق من فرق ZAN 3 GP IRR (14% vs 21%) — هل catchupMethod هو السبب؟
4. التأكد إن Exit Strategy ظاهرة في كل أوضاع التمويل

## السايكل الكامل

### 1. الفهم (Understand)

#### فهم نظام الفحوصات الحالي (Checks)
```bash
grep -n "function.*[Cc]heck\|runChecks\|checks\s*=" src/App.jsx | head -20
grep -n "ChecksView\|checksData\|checkResults" src/App.jsx | head -20
```

#### فهم landCapitalize و landArea
```bash
grep -n "landCapitalize\|landArea\|landCap" src/App.jsx src/engine/*.js 2>/dev/null | head -20
```

#### فهم DSCR
```bash
grep -n "dscr\|DSCR\|debtService" src/App.jsx src/engine/*.js 2>/dev/null | head -20
```

#### فهم catchupMethod و GP IRR
```bash
grep -n "catchupMethod\|catchUp\|gpIrr\|GP.*IRR" src/App.jsx src/engine/*.js 2>/dev/null | head -20
```

#### فهم Exit Strategy و finMode
```bash
grep -n "exitStrategy\|exitType\|exitYear\|exitMult" src/App.jsx | head -30
grep -n "finMode.*self\|self.*finMode\|mode.*self" src/App.jsx | head -20
```

اقرأ ملف checks بالكامل لو موجود:
```bash
cat src/engine/checks.js 2>/dev/null || grep -A 50 "function runChecks\|const runChecks" src/App.jsx | head -60
```

### 2. الخطة (Plan)

**التغيير 1: تنبيه landCapitalize + landArea=0**
- الموقع: داخل نظام الـ checks الموجود
- المنطق: `if (project.landCapitalize === true && (!project.landArea || project.landArea === 0))`
- الرسالة EN: "Land capitalization is enabled but land area is 0. This will produce incorrect equity calculations."
- الرسالة AR: "رسملة الأرض مفعّلة لكن مساحة الأرض = 0. هذا سيعطي حسابات ملكية خاطئة."
- Severity: Critical (أحمر)
- Category: T0 (Input Validation)

**التغيير 2: تحذير DSCR < 1.0x**
- الموقع: داخل نظام الـ checks
- المنطق: لو أي سنة DSCR < 1.0 بعد فترة البناء
- الرسالة EN: "DSCR falls below 1.0x in year [Y] ([value]x). Consider reducing LTV or extending tenor."
- الرسالة AR: "معدل تغطية خدمة الدين أقل من 1.0 في سنة [Y] ([value]). فكر في تقليل نسبة التمويل أو تمديد المدة."
- Severity: High (برتقالي/أحمر)
- Category: T2 (Financing)

**التغيير 3: تحقق من catchupMethod وأثره على GP IRR**
- هذا تحقيق فقط — **لا تعدل المحرك**
- شغل المحرك مع catchupMethod = "perYear" ثم "cumulative"
- سجل الفرق في GP IRR
- لو الفرق يفسر 14% vs 21%، سجل ذلك في التقرير
- أضف تعليق في الكود يوثق هذا

**التغيير 4: Exit Strategy في self mode**
- جد القسم اللي يخفي Exit Strategy
- غيّره عشان يظهر في كل أوضاع التمويل
- تأكد المحرك يقرأ exitStrategy في كل الأوضاع

### 3. التنفيذ (Execute)

**خطوة 1: أضف check لـ landCapitalize + landArea**
جد نظام الـ checks وأضف check جديد. **التزم بنفس بنية الـ checks الموجودة** — نفس الـ object shape، نفس الـ categories.

```bash
npm run build
```
لو فشل ← revert فوراً.

**خطوة 2: أضف check لـ DSCR < 1.0**
جد أين يُحسب DSCR في النتائج. أضف check يمر على كل سنة بعد البناء ويتحقق.

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```
لو فشل ← revert فوراً.

**خطوة 3: تحقيق catchupMethod**
```bash
# شغل المحرك بـ perYear
node -e "
const { runEngine } = require('./tests/helpers/engine.cjs');
const project = require('./tests/helpers/jazan_project.cjs');
project.financing = project.financing || {};
project.financing.catchupMethod = 'perYear';
const r1 = runEngine(project);
console.log('perYear GP IRR:', r1.phaseResults?.ZAN3?.gpNetIrr || r1.phases?.[2]?.gpNetIrr || 'NOT FOUND');

project.financing.catchupMethod = 'cumulative';
const r2 = runEngine(project);
console.log('cumulative GP IRR:', r2.phaseResults?.ZAN3?.gpNetIrr || r2.phases?.[2]?.gpNetIrr || 'NOT FOUND');
"
```

سجل النتائج. لو ما تقدر تشغل المحرك مباشرة، اقرأ الكود وحلل نظرياً.

**خطوة 4: إظهار Exit Strategy في self mode**
جد الشرط اللي يخفي Exit Strategy:
```bash
grep -n "exitStrategy\|exit.*section\|exit.*visible\|showExit" src/App.jsx | head -20
grep -B5 -A5 "self.*exit\|exit.*self\|finMode.*exit" src/App.jsx | head -30
```

عدّل الشرط عشان Exit Strategy يظهر في كل الأوضاع. **لا تعدل المحرك** — فقط الـ UI visibility.

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 4. الفحص الآلي (Test)
```bash
npm run build
node tests/engine_audit.cjs
node tests/zan_benchmark.cjs
```
كل 427 test لازم ينجحون.

### 5. الفحص البصري (Browse & Verify)
شغل المنصة وتحقق:

1. **landCapitalize check:** فعّل landCapitalize واجعل landArea = 0 → هل التنبيه الأحمر يظهر في Checks tab؟
2. **DSCR check:** في bank mode بـ LTV عالي (80%) → هل التحذير يظهر في Checks tab؟
3. **Exit Strategy:** حوّل لـ self mode → هل قسم Exit Strategy ظاهر في الـ sidebar/settings؟
4. **تأكد الـ checks الحالية ما تأثرت** — افتح Checks tab وتأكد كلها تمر مع مشروع سليم

افحص على desktop (1280px) و mobile (375px).

### 6-7. اكتشاف وإصلاح المشاكل
- لو الـ check الجديد يظهر بشكل غلط (مثلاً يظهر أحمر وهو مفروض يكون أخضر)، أصلحه
- لو Exit Strategy يظهر بس ما يأثر في self mode، سجل ذلك — ما عندك صلاحية تعدل المحرك

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK3_FINANCIAL_VALIDATION_REPORT.md`:
```markdown
# Task 3: Financial Validation Report
Date: [auto]

## New Checks Added
| Check | Category | Severity | Condition | Message (EN/AR) |
|-------|----------|----------|-----------|-----------------|
| Land Cap + 0 Area | T0 | Critical | ... | ... |
| DSCR < 1.0 | T2 | High | ... | ... |

## CatchupMethod Investigation
- perYear GP IRR (ZAN3): [VALUE]
- cumulative GP IRR (ZAN3): [VALUE]
- Difference: [VALUE]
- Explains 14% vs 21% gap? [YES/NO/PARTIALLY]
- Details: [التحليل]

## Exit Strategy Visibility
- Before: Hidden in [أوضاع]
- After: Visible in all finModes
- Engine reads exitStrategy in self mode? [YES/NO]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "feat: add financial validation checks (landCap, DSCR), show exit strategy in all modes" && git push origin main
```
