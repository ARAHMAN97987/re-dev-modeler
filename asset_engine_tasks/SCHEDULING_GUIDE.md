# جدولة مهام Asset Development Engine - Phase 1
# يُنفّذ من داخل Claude Code Desktop App

---

## الخطوة 1: مهمة تجريبية (بعد 5 دقائق)
اطلب من Claude Code:

```
جدول مهمة تجريبية بعد 5 دقائق من الآن. المحتوى:
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler" && echo "✅ ADE Test task successful - $(date)" > docs/ade_test_result.txt && cat docs/ade_test_result.txt
```

**وافق على الأذونات لما تطلع.**

---

## الخطوة 2: جدولة المهام الست
بعد ما المهمة التجريبية تنجح، أعطِ Claude Code هذا الأمر:

```
جدول 6 مهام. أول مهمة تبدأ 12:15 ص يوم 5 أبريل 2026 (بتوقيت +03:00)، بفواصل 45 دقيقة.
كل مهمة عبارة عن prompt file أقرأه من المسار المحدد ونفّذه بالكامل.
الأذونات: autonomous بالكامل — لا تسأل إذن.

المهام:
1. الساعة 12:15 ص: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/re-dev-modeler/asset_engine_tasks/task_01_schema_extension.md
2. الساعة 1:00 ص: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/re-dev-modeler/asset_engine_tasks/task_02_asset_type_ui.md
3. الساعة 1:45 ص: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/re-dev-modeler/asset_engine_tasks/task_03_detail_panel.md
4. الساعة 2:30 ص: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/re-dev-modeler/asset_engine_tasks/task_04_templates_enhanced.md
5. الساعة 3:15 ص: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/re-dev-modeler/asset_engine_tasks/task_05_area_logic.md
6. الساعة 4:00 ص: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/re-dev-modeler/asset_engine_tasks/task_06_verify_deploy.md
```

---

## الجدول الزمني

| # | المهمة | الوقت | المدة المتوقعة | الخطورة |
|---|--------|-------|----------------|---------|
| 0 | تجريبية | الآن + 5 دقائق | 1 دقيقة | لا شيء |
| 1 | Schema Extension | 12:15 ص | 20-30 دقيقة | منخفضة |
| 2 | Asset Type UI | 1:00 ص | 30-40 دقيقة | منخفضة |
| 3 | Detail Panel | 1:45 ص | 35-45 دقيقة | منخفضة |
| 4 | Templates | 2:30 ص | 25-35 دقيقة | منخفضة |
| 5 | Area Logic | 3:15 ص | 30-40 دقيقة | متوسطة (efficiency sync) |
| 6 | Verify + Deploy | 4:00 ص | 30-40 دقيقة | منخفضة |

**المدة الكاملة: ~4.5 ساعات**

---

## قبل ما تنام

1. ✅ وافق على أذونات المهمة التجريبية
2. ✅ تأكد المهمة التجريبية نجحت
3. ✅ جدول المهام الست
4. ✅ خلّ الجهاز مفتوح (`caffeinate` أو Settings > Energy > Prevent sleep)
5. ✅ تأكد الإنترنت مستقر
6. ✅ تأكد ما فيه شغل جاري على نفس الـ repo من مكان ثاني

---

## الصبح

1. شيك `docs/ASSET_ENGINE_PHASE1_REPORT.md` - التقرير الشامل
2. شيك `git log --oneline -10` - كل الـ commits
3. شيك https://re-dev-modeler.vercel.app - تأكد يشتغل
4. جرب: أنشئ أصل من template → افتح Detail Panel → عدّل → تأكد الحسابات
5. جرب: حمّل مشروع ZAN Waterfront → تأكد Migration اشتغلت

---

## لو حصلت مشكلة

- لو مهمة فشلت: شيك التقرير المقابل في docs/TASK_ADE0X_*.md
- لو كل المهام فشلت: على الأغلب git conflict أو مشكلة nvm
- لو الاختبارات فشلت: شيك git log ثم `git revert` آخر commit
- لو deploy فشل: `npx vercel deploy --prod` يدوي

---

## مبدأ الأمان

**كل المهام additive فقط:**
- لا حذف حقول
- لا تعديل المحرك المالي
- لا تعديل الاختبارات
- لا تغيير بنية البيانات الحالية
- Backward compatible 100%

المحرك يستمر يستخدم: category, gfa, efficiency, costPerSqm, leaseRate, opEbitda, revType
المهام تضيف فوقها: assetType, isBuilding, area types, templates, detail panel
