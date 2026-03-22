# 05 — Core Data Integrity Audit Plan

**التاريخ:** 2026-03-22
**الهدف:** التأكد إن كل طبقة بيانات (من الأصل للتدفق النهائي) صحيحة 100%، نظيفة، وتُقرأ من مكان واحد.

---

## السياق

النموذج المالي يتكون من 6 طبقات متسلسلة:

```
بيانات الأصول → Unlevered CF → هيكل رأس المال → خدمة الدين → رسوم الصندوق → التخارج → Levered CF
```

كل طبقة يجب أن:
1. تُحسب مرة واحدة
2. تُخزن في مكان واحد
3. تُقرأ من ذلك المكان فقط (لا إعادة حساب)
4. تكون مطابقة لنتيجة حساب مستقل (cross-check)

---

## الأجزاء الستة

### جزء 1: Unlevered Cash Flow
**النطاق:** assetSchedules → phaseResults → consolidated
**المصدر:** cashflow.js
**الفحوصات:**
- كل أصل: totalCapex = GFA × cost/sqm × (1+soft%) × (1+cont%) × scenarioMult ✓
- كل أصل: revenue[y] = leasableArea × rate × occ × rampUp × escalation ✓
- كل مرحلة: sum of asset capex = phase capex ✓
- كل مرحلة: sum of asset revenue = phase income ✓
- consolidated = sum of phases ✓
- IRR matches manual calculation ✓
- CashFlowView reads from results (not re-computes) ← **مشكلة معروفة**

### جزء 2: هيكل رأس المال (Capital Structure)
**النطاق:** devCost + landCap + debt + GP + LP
**المصدر:** financing.js (أول 230 سطر)
**الفحوصات:**
- devCostExclLand = totalCapex (from results) ✓
- landCapValue = landArea × landCapRate (lease/bot only) ✓
- devCostInclLand = devCostExclLand + landCapValue ✓
- maxDebt = devCostInclLand × LTV% (or 100% for bank100) ✓
- totalEquity = devCostInclLand - maxDebt + capitalizedFinCosts ✓
- gpEquity = landCap + devFee + cash (fund) or totalEquity (debt) ✓
- lpEquity = totalEquity - gpEquity ✓
- **Debt + GP + LP = devCostInclLand** ← المعادلة الذهبية

### جزء 3: خدمة الدين (Debt Service)
**النطاق:** drawdown + interest + repayment + DSCR
**المصدر:** financing.js (سطر 300-560)
**الفحوصات:**
- drawdown pro-rata with CAPEX ✓
- sum(drawdown) = totalDebt ✓
- grace period: no repayment during grace ✓
- interest = avg(open+close)/2 × rate ✓
- amortizing: equal annual repayment ✓
- bullet: all repayment in last year ✓
- debtBalance[end] = 0 (fully repaid or balloon at exit) ✓
- DSCR = NOI / debtService per year ✓

### جزء 4: رسوم الصندوق (Fund Fees)
**النطاق:** كل رسم × جدوله الزمني
**المصدر:** waterfall.js (أول 120 سطر)
**الفحوصات:**
- subscription = totalEquity × % (one-time, year 0) ✓
- structuring = devCost × % (capped) ✓
- management = base × % (per year, capped) ✓
- custody = fixed/year ✓
- auditor = fixed/year ✓
- preEst + SPV = one-time ✓
- devFee = buildCapex × % (with construction) ✓
- totalFees = sum of all ✓
- fees only for fund mode (isFund guard) ✓

### جزء 5: التخارج (Exit)
**النطاق:** exit value + cost + net + balloon + post-exit zeroing
**المصدر:** financing.js (سطر 80-180 scanner + 415-470 exit calc)
**الفحوصات:**
- sale: exitValue = income[exitYear] × multiple ✓
- caprate: exitValue = NOI / capRate ✓
- hold: no exit proceeds ✓
- exitCost = exitValue × exitCostPct ✓
- netExit = exitValue - exitCost ✓
- balloon = remaining debt at exit ✓
- exitProceeds[exitYear] = netExit - balloon ✓
- post-exit: leveredCF[y>exit] = 0 ✓

### جزء 6: Levered CF النهائي
**النطاق:** المعادلة الكاملة
**المصدر:** financing.js (سطر 490-560)
**الفحوصات:**
- leveredCF = unleveredCF - debtService - devFee + drawdown + exitProceeds ✓
- leveredIRR = IRR(leveredCF) ✓
- waterfall cashAvail = leveredCF adjusted for fees ✓
- LP IRR, GP IRR, MOIC from waterfall ✓
- **Per-phase levered = phase unlevered - phase debt - phase fees + phase exit** ✓
- **Consolidated levered = sum of phase levered** ✓

---

## فحص التطابق المستقل (Integrity Checker)

**المكان:** صفحة الفحوصات (Checks tab) — قسم قابل للطي
**المنهج:** يحسب كل شي من الصفر باستخدام بيانات المشروع فقط، ثم يقارن مع مخرجات المحرك.

```
┌──────────────────────────────────────────────┐
│ 🔍 مدقق سلامة النموذج / Model Integrity     │
│    ▼ (قابل للطي)                             │
│                                              │
│ ✅ Unlevered CF: متطابق (0.00% فرق)         │
│ ✅ هيكل رأس المال: D+GP+LP = DevCost        │
│ ✅ خدمة الدين: الرصيد يصل صفر               │
│ ✅ رسوم الصندوق: مطابقة                     │
│ ✅ التخارج: صافي = إجمالي - تكاليف - دين    │
│ ✅ Levered CF: مطابق                         │
│                                              │
│ [▶ تفاصيل] — يعرض الأرقام سطر بسطر         │
└──────────────────────────────────────────────┘
```

كل سطر يحسب النتيجة المتوقعة بشكل مستقل ويقارنها بمخرج المحرك.
لو فيه فرق > 0.01% يظهر ❌ مع التفاصيل.

---

## ترتيب التنفيذ

```
السيشن 1: جزء 1 (Unlevered) — تدقيق + اختبار + إصلاح CashFlowView
السيشن 2: جزء 2+3 (Capital + Debt) — مرتبطين
السيشن 3: جزء 4+5 (Fees + Exit) — مرتبطين
السيشن 4: جزء 6 (Levered Final) + بناء Integrity Checker بالواجهة
```

---

## المبدأ الأساسي

> **كل رقم يُحسب مرة واحدة في المحرك، يُخزن في مكان واحد، ويُقرأ من ذلك المكان فقط.**
> **لا إعادة حساب. لا نسخ. لا اشتقاق.**
> **الـ Integrity Checker يحسب من الصفر ويقارن — لا يقرأ من المحرك.**
