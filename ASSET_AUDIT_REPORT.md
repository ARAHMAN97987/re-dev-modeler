# تقرير فحص خط الأنابيب: جدول الأصول → التدفقات النقدية

**التاريخ**: 2026-03-26
**الاختبارات**: 634/634 ناجح ✅
**البناء**: ✅ ناجح

---

## 1. فحص التفاعلية (Reactivity)

### النتيجة: ✅ سلسلة التفاعل سليمة بالكامل

سلسلة التحديث:
```
upAsset(i, update) → setProject(prev => {...prev, assets: newArray})
  → project reference changes
  → useMemo([project]) → computeProjectCashFlows(project) recalculates
  → useMemo([project, results]) → computeIncentives recalculates
  → useMemo([project, results, incentives]) → computeFinancing recalculates
  → useMemo([...]) → computeWaterfall recalculates
  → useMemo([...]) → computeIndependentPhaseResults recalculates
  → Dashboard KPIs re-render
```

**نقاط القوة:**
- `upAsset` يستخدم `setProject(prev => ...)` (functional update) — لا مشكلة stale closure ✅
- كل `useMemo` يعتمد على `[project]` كأول dependency — أي تغيير في project يُعيد الحساب فوراً ✅
- Auto-save مؤجل 2 ثانية للحفظ فقط، الحساب فوري ✅
- لا توجد مكونات inline تسبب فقدان التركيز في الحقول ✅

**التحقق:** اختبار `input_impact.cjs` يفحص 109 حقل إدخال فردي — كلها تنتشر بشكل صحيح:
- GFA → CAPEX + Revenue ✅
- Cost/sqm → CAPEX ✅
- Lease rate → Revenue ✅
- Occupancy → Revenue ✅
- Efficiency → Leasable area → Revenue ✅
- Construction duration → CAPEX timing + Revenue start ✅
- Escalation → Long-term revenue ✅
- Ramp-up → Early revenue ✅
- Hotel P&L (ADR, keys, F&B, etc.) → EBITDA → Revenue ✅
- Marina P&L (berths, rates, etc.) → Revenue ✅
- Soft cost % → All asset CAPEX ✅
- Contingency % → All asset CAPEX ✅

---

## 2. صيغة CAPEX

### النتيجة: ✅ الصيغة صحيحة (ضرب متسلسل - Formula A)

**الصيغة الحالية:**
```
CAPEX = GFA × Cost/sqm × (1 + softCost%) × (1 + contingency%) × scenarioMult
```

**الموقع:** `src/engine/cashflow.js:27`

هذه هي الصيغة المعيارية في الصناعة (multiplicative) لأن الاحتياطي يجب أن يُطبق على التكلفة الإجمالية بما فيها التكاليف الناعمة.

**مثال:**
- GFA=10,000, Cost=3,000, Soft=10%, Cont=5%
- 10,000 × 3,000 × 1.10 × 1.05 = **34,650,000 ريال** ✅

**التوزيع الشهري:** `CAPEX × MIN(12, durMonths - yearOffset×12) / durMonths` — يعالج مدد غير قابلة للقسمة على 12 بشكل صحيح ✅

---

## 3. تحسينات UX للتكاليف الناعمة

### التغييرات المنفذة:

#### A. عمود "تكلفة البناء" (Hard Cost)
- أُضيف عمود جديد قبل CAPEX في جدول الأصول
- يعرض: GFA × Cost/sqm (بدون تكاليف ناعمة أو احتياطي)
- يجعل الفرق بين التكلفة الخام والإجمالية واضحاً للمستخدم

#### B. تلميح على CAPEX (Tooltip)
عند مرور المؤشر على خلية CAPEX لأي أصل:
```
تكلفة البناء: 27,000,000 ريال
+ تكاليف ناعمة (10%): 2,700,000 ريال
+ احتياطي (5%): 1,485,000 ريال
= إجمالي: 31,185,000 ريال
```

#### C. مؤشر في رأس العمود
رأس عمود CAPEX يعرض نسب التكاليف الناعمة والاحتياطي:
`(+10% ناعمة +5% احتياطي)` — يتحدث تلقائياً عند تغيير النسب

---

## 4. انتشار الإيرادات → التدفقات

### النتيجة: ✅ سليم

- سنة بدء الإيراد = بدء البناء + CEIL(مدة البناء/12) ✅
- Ramp-up: `MIN(1, (years+1)/rampYears)` — 33%/67%/100% لنمو 3 سنوات ✅
- التصاعد: مركب `(1+esc%)^years` ✅
- فنادق: P&L كامل (Rooms → Total → FB/MICE → OpEx → EBITDA) ✅
- مارينا: Berthing → Total → Fuel/Other → OpEx → EBITDA ✅
- تجميع المراحل = مجموع كل الأصول في المرحلة ✅
- لا أصل مفقود من التجميع ✅

---

## 5. حالات حدية

| # | الحالة | النتيجة |
|---|--------|---------|
| 1 | GFA = 0 | CAPEX = 0, لا NaN ✅ |
| 2 | Cost/sqm = 0 | CAPEX = 0, لا NaN ✅ |
| 3 | Occupancy = 0 | Revenue = 0, IRR = null ✅ |
| 4 | Occupancy = 100% | يعمل بدون سقف ✅ |
| 5 | Duration = 0 | durYears = 0, لا CAPEX ✅ |
| 6 | Soft cost = 0% | CAPEX = Hard Cost × (1+cont%) ✅ |
| 7 | تغيير Lease → Hotel | يتحول لحساب EBITDA ✅ |
| 8 | Marina berthingPct ≤ 0 | Guard: totalRev = 0 ✅ |
| 9 | IRR بدون تغيير إشارة | يرجع null ✅ |
| 10 | 29 أصل | الحساب < 500ms ✅ |

---

## 6. نتائج الاختبارات

| المجموعة | النتيجة |
|----------|---------|
| regression.cjs | 50/50 ✅ |
| full_suite.cjs | 205/205 ✅ |
| input_impact.cjs | 109/109 ✅ |
| fin_audit_p1.cjs | 58/58 ✅ |
| fin_audit_p2.cjs | 52/52 ✅ |
| zan_benchmark.cjs | 160/160 ✅ |
| **المجموع** | **634/634 ✅** |

---

## ملخص

| البند | الحالة |
|-------|--------|
| صيغة CAPEX | ✅ صحيحة (ضرب متسلسل) |
| سلسلة التفاعل | ✅ كل 109 حقل ينتشر بشكل صحيح |
| Ramp-up + Escalation | ✅ مطابق لنموذج ZAN |
| حالات حدية | ✅ كلها مُعالجة |
| UX تكاليف ناعمة | ✅ عمود Hard Cost + Tooltip + Header |
| الاختبارات | ✅ 634/634 |
