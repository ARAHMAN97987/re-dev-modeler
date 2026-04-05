# TASK 7: Cash Flow View Completeness

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

## القواعد الصارمة
- لا تطلب إذن المستخدم — autonomous 100%
- لا تعدل ملفات tests/
- لا تعدل منطق المحرك المالي (engine defaults) — أضف صفوف عرض فقط
- لو فشل أي test ← revert فوراً ← حل بديل
- Brand = "Haseef" أو "حصيف" فقط

---

## المطلوب
إضافة صفوف مفقودة في جدول التدفق النقدي:
- OPEX (المصاريف التشغيلية)
- EBITDA
- GOP (إجمالي الربح التشغيلي)
- Reserves (الاحتياطيات)

## السايكل الكامل

### 1. الفهم (Understand)

#### فهم CashFlowView الحالي
```bash
grep -n "CashFlowView\|CashFlow.*View\|function.*CashFlow" src/App.jsx | head -10
```

اقرأ الـ CashFlowView بالكامل — حدد:
- ما هي الصفوف الحالية؟ (income, CAPEX, land rent, net CF, etc.)
- كيف تُعرض؟ (array of row definitions? hardcoded rows?)
- من أين تأتي البيانات؟ (phaseResults? cashflow arrays?)

```bash
# ما الصفوف المعروضة حالياً؟
grep -A 3 "rowLabel\|rowName\|label.*income\|label.*capex\|label.*rent\|label.*net" src/App.jsx | grep -i "cash.*flow\|CF.*view" | head -20
```

#### فهم مخرجات المحرك
```bash
# ما الحقول المتاحة من المحرك؟
grep -n "opex\|ebitda\|gop\|GOP\|EBITDA\|OPEX\|reserves\|operatingExpense" src/engine/*.js 2>/dev/null | head -20
cat src/engine/cashflow.js 2>/dev/null | head -50
```

```bash
# هل المحرك يحسب OPEX/EBITDA/GOP حالياً؟
grep -n "opex\|ebitda\|gop\|reserves\|operatingCost\|operatingExpense" src/engine/*.js src/App.jsx 2>/dev/null | head -30
```

**سؤال حرج:** هل المحرك يُنتج هذه القيم فعلاً؟
- لو **نعم** → فقط أضف صفوف عرض في CashFlowView
- لو **لا** → لا تعدل المحرك. أضف صفوف محسوبة من البيانات المتاحة (مثل: EBITDA = Income - Operating Expenses إذا كانت Operating Expenses متاحة)

### 2. الخطة (Plan)

**الصفوف المطلوبة وكيفية حسابها:**

| الصف | EN | AR | المصدر |
|------|----|----|--------|
| Gross Revenue | Gross Revenue | إجمالي الإيرادات | موجود عادة: `income[y]` |
| OPEX | Operating Expenses | المصاريف التشغيلية | من المحرك إن وجد، أو مجموع hotel/marina OPEX |
| GOP | Gross Operating Profit | إجمالي الربح التشغيلي | Revenue - OPEX |
| EBITDA | EBITDA | الأرباح قبل الفوائد والضرائب والإهلاك | GOP - Management Fees (تقريبي) |
| Reserves | Reserves / FF&E | الاحتياطيات | عادة 4% من Revenue للفنادق |
| Net Operating Income | NOI | صافي الدخل التشغيلي | EBITDA - Reserves (أو Income - all operating costs) |

**ترتيب الصفوف في الجدول (المنطقي):**
```
═══ Revenue Section ═══
  Gross Revenue
  (Vacancy/Collection Loss)
  Effective Revenue
═══ Operating Section ═══
  OPEX
  GOP
  Reserves
  EBITDA / NOI
═══ Capital Section ═══
  CAPEX
  Land Rent/Cost
═══ Cash Flow Section ═══
  Unlevered Net CF
  Debt Service
  Levered Net CF
```

**مهم:** أضف الصفوف كـ display rows فقط. لو البيانات غير متاحة من المحرك، اعرض "-" أو حوسبها من المتاح **بدون تعديل المحرك**.

### 3. التنفيذ (Execute)

**خطوة 1: حدد البيانات المتاحة**
شغل المحرك وشوف ايش يرجع:
```bash
node -e "
const { runEngine } = require('./tests/helpers/engine.cjs');
const project = require('./tests/helpers/jazan_project.cjs');
const results = runEngine(project);
const p = results.phaseResults ? Object.values(results.phaseResults)[0] : (results.phases ? results.phases[0] : results);
console.log('Available keys:', Object.keys(p).filter(k => Array.isArray(p[k])).join(', '));
// Show first 5 years of each array
Object.keys(p).filter(k => Array.isArray(p[k])).forEach(k => {
  console.log(k + ':', JSON.stringify(p[k].slice(0,5)));
});
" 2>&1 | head -50
```

**خطوة 2: أضف صفوف جديدة في CashFlowView**

جد المكان اللي يعرض فيه الصفوف وأضف الصفوف الجديدة. **التزم بنفس بنية الصفوف الموجودة.**

لو الصفوف معرّفة كـ array:
```jsx
const rows = [
  // ... existing rows ...
  { key: 'opex', label: ar ? 'المصاريف التشغيلية' : 'Operating Expenses', data: results.opex || [], style: 'expense' },
  { key: 'gop', label: ar ? 'إجمالي الربح التشغيلي' : 'Gross Operating Profit', data: results.gop || [], style: 'subtotal' },
  { key: 'ebitda', label: 'EBITDA', data: results.ebitda || [], style: 'subtotal' },
  { key: 'reserves', label: ar ? 'الاحتياطيات' : 'Reserves', data: results.reserves || [], style: 'expense' },
];
```

لو البيانات غير متاحة، احسبها:
```jsx
// Computed from available data
const computedOpex = results.income?.map((inc, y) => {
  // Approximate: if hotel assets, OPEX ~ 65-70% of revenue
  // This is display-only estimate
  return results.operatingCosts?.[y] || 0;
}) || [];
```

**خطوة 3: تنسيق الصفوف**
- صفوف الإيرادات: خط أخضر
- صفوف المصاريف: خط أحمر (أرقام سالبة بين قوسين)
- صفوف Subtotal (GOP, EBITDA): خط عريض مع خط فاصل
- تنسيق الأرقام: `#,##0` بدون كسور

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
كل 427 test لازم ينجحون. هذا تغيير display فقط.

### 5. الفحص البصري (Browse & Verify)
- افتح Cash Flow tab مع مشروع فيه أصول
- تأكد الصفوف الجديدة ظاهرة في المكان الصحيح
- تأكد الأرقام منطقية (OPEX < Revenue, GOP > 0 عادة)
- تأكد التنسيق متناسق مع الصفوف الحالية
- تأكد الـ scroll يشتغل مع الصفوف الإضافية
- افحص على mobile — هل الجدول لا زال scrollable؟

### 6-7. اكتشاف وإصلاح
- لو صف يعرض 0 في كل السنوات → البيانات غير متاحة → أخفِ الصف أو اعرض "-"
- لو الجدول صار طويل جداً → أضف قسم collapsible

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK7_CASHFLOW_REPORT.md`:
```markdown
# Task 7: Cash Flow View Completeness Report
Date: [auto]

## Rows Before
[list existing rows]

## Rows Added
| Row | Source | Available from Engine? | Computed? |
|-----|--------|-----------------------|-----------|
| OPEX | results.opex | YES/NO | YES/NO |
| GOP | computed | - | Revenue - OPEX |
| EBITDA | computed | - | GOP - MgmtFees |
| Reserves | results.reserves | YES/NO | YES/NO |

## Row Order (Final)
1. [list final order]

## Visual Verification
- Desktop: [screenshot description]
- Mobile: [screenshot description]
- Numbers logical: [YES/NO]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "feat: add OPEX, GOP, EBITDA, reserves rows to cash flow view" && git push origin main
```
