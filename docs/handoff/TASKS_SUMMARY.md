# ملخص المهام المتبقية — Quick Reference

## Haseef Tasks (5-10)

### Task 5: Asset Table UX
- **Resizable columns:** أضف `colWidths` state + resize handle (div 4px) على كل `<th>` + `onMouseDown` drag + localStorage persist
- **Long text:** `overflow:hidden` + `textOverflow:ellipsis` + `title={fullText}` tooltip
- **XLSX import:** `npm install xlsx` + تعديل handleFileImport لقبول .xlsx عبر `XLSX.read()` + `XLSX.utils.sheet_to_json()`
- **ملاحظة:** resizable columns تم تنفيذها جزئياً في الجلسة السابقة لكن لم يتم commit

### Task 6: Empty States
- أنشئ `EmptyState` component (icon + title + subtitle + action button)
- أضف empty state لكل view: Dashboard, Assets, Financing, Waterfall, Results, CashFlow, Scenarios, Reports
- رسائل ثنائية اللغة (ar/en)
- فعّل Quick Setup Wizard (حالياً مخفي بـ `false &&`)
- الـ Wizard يظهر فقط لمشروع جديد بدون أصول

### Task 7: Cash Flow View
- أضف صفوف: OPEX, GOP, EBITDA, Reserves
- **أولاً** تحقق هل المحرك يُنتج هذه القيم (grep `opex|ebitda|gop|reserves` في engine files)
- لو موجودة → عرض مباشر
- لو غير موجودة → حساب من المتاح (display-only) **بدون تعديل المحرك**
- تنسيق: إيرادات بالأخضر، مصاريف بالأحمر، subtotals بخط عريض

### Task 8: AI Copilot
- تحسين system prompt في `api/chat.js` (خبرة عقارية سعودية، شخصية مباشرة، حد 300 كلمة)
- إرسال سياق المشروع الكامل مع كل رسالة (projectName, totalGFA, IRR, MOIC, DSCR, finMode, إلخ)
- تأكد `remark-gfm` مثبت + CSS للجداول في الـ chat
- اختبر 3 أسئلة: "ما إجمالي التكاليف؟" + "What's the IRR?" + "كيف أحسن العوائد؟"

### Task 9: UX Polish
- توحيد ألوان الأزرار: primary `#0C1829`, danger `#ef4444`, secondary transparent+border
- توحيد border-radius: cards=12, buttons=8, inputs=6
- ترجمة أهم 10 labels إنجليزية للعربية
- إضافة loading spinner وقت حساب المحرك (يظهر فقط لو > 200ms)

### Task 10: Final
- تأكد scroll يشتغل في كل الـ tabs (10 tabs)
- فحص شامل لكل تغييرات المهام 1-9
- `npm run build && tests && npx vercel deploy --prod`
- كتابة `docs/OVERNIGHT_FINAL_REPORT.md` شامل

---

## ADE Tasks (1-6) — Asset Development Engine

### ADE Task 1: Schema Extension
- أضف حقول جديدة: `assetType`, `isBuilding`, `builtUpArea`, `netLeasableArea`, `commonArea`
- أضف في `src/data/defaults.js` فقط — لا تعدل engine logic
- Migration: المشاريع القديمة تشتغل بدون الحقول الجديدة

### ADE Task 2: Asset Type UI
- أضف dropdown لاختيار `assetType` في جدول الأصول
- القائمة: Office, Retail, Hotel, Residential, F&B, Entertainment, Parking, Marina, Mixed-Use
- اختيار الـ type يضبط `category` + `isBuilding` تلقائياً

### ADE Task 3: Detail Panel
- أضف expandable panel تحت كل صف أصل
- يعرض كل حقول الأصل في form منظم (General, Financial, Construction, Revenue)
- click على صف → يفتح/يقفل الـ panel

### ADE Task 4: Enhanced Templates
- templates محسّنة بـ Saudi benchmarks (من AECOM, JLL, Colliers)
- عند اختيار template: يملأ كل الحقول بقيم واقعية
- 10+ templates لأنواع أصول مختلفة

### ADE Task 5: Area Logic
- sync تلقائي: GFA = BUA / efficiency
- BUA = GFA * efficiency
- NLA = BUA * (1 - commonAreaPct)
- حسابات الإيجار تستخدم NLA بدل GFA لما تكون متاحة

### ADE Task 6: Verify + Deploy
- تشغيل كل الاختبارات
- فحص بصري
- deploy
- كتابة `docs/ASSET_ENGINE_PHASE1_REPORT.md`

---

## القاعدة الذهبية لكل مهمة

```
1. اقرأ ملف التعليمات الكامل
2. افهم الكود الحالي (grep + read)
3. نفّذ
4. npm run build
5. node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
6. لو PASS → commit + deploy
7. لو FAIL → revert + حل بديل
```
