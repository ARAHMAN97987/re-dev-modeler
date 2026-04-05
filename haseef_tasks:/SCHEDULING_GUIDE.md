# سكربت جدولة المهام العشر — Haseef Overnight Tasks
# يُنفّذ من داخل Claude Code Desktop App

## الخطوة 1: مهمة تجريبية (بعد 5 دقائق)
اطلب من Claude Code:

```
جدول مهمة تجريبية بعد 5 دقائق من الآن. المحتوى:
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler" && echo "✅ Test task successful - $(date)" > docs/test_task_result.txt && cat docs/test_task_result.txt
```

**وافق على الأذونات لما تطلع** — هذي الخطوة المهمة عشان المهام الحقيقية تشتغل بدون إذن.

---

## الخطوة 2: جدولة المهام العشر
بعد ما المهمة التجريبية تنجح، أعطِ Claude Code هذا الأمر:

```
جدول 10 مهام بفواصل 45 دقيقة. أول مهمة تبدأ بعد 15 دقيقة من الآن.
كل مهمة عبارة عن prompt file أقرأه من المسار المحدد ونفّذه بالكامل.
الأذونات: autonomous بالكامل — لا تسأل إذن.

المهام:
1. بعد 15 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task01_github_token.md
2. بعد 60 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task02_comprehensive_audit.md
3. بعد 105 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task03_financial_validation.md
4. بعد 150 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task04_mobile_responsiveness.md
5. بعد 195 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task05_asset_table_ux.md
6. بعد 240 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task06_empty_states.md
7. بعد 285 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task07_cashflow_view.md
8. بعد 330 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task08_ai_copilot.md
9. بعد 375 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task09_ux_polish.md
10. بعد 420 دقيقة: اقرأ ونفّذ ~/Desktop/السليمان\ /زان/00\ Data\ Room\ ZAN/haseef_tasks/task10_scroll_deploy_report.md
```

---

## الجدول الزمني (لو بدأت الآن)

| # | المهمة | الوقت (تقريبي) | المدة |
|---|--------|----------------|-------|
| 0 | تجريبية | الآن + 5 دقائق | 1 دقيقة |
| 1 | GitHub Token | الآن + 15 دقيقة | 5 دقائق |
| 2 | Comprehensive Audit | الآن + 60 دقيقة | 40 دقيقة |
| 3 | Financial Validation | الآن + 105 دقيقة | 30 دقيقة |
| 4 | Mobile Responsive | الآن + 150 دقيقة | 35 دقيقة |
| 5 | Asset Table UX | الآن + 195 دقيقة | 40 دقيقة |
| 6 | Empty States | الآن + 240 دقيقة | 25 دقيقة |
| 7 | Cash Flow View | الآن + 285 دقيقة | 30 دقيقة |
| 8 | AI Copilot | الآن + 330 دقيقة | 25 دقيقة |
| 9 | UX Polish | الآن + 375 دقيقة | 30 دقيقة |
| 10 | Scroll + Deploy + Report | الآن + 420 دقيقة | 20 دقيقة |

**المدة الكاملة: ~7 ساعات**

---

## قبل ما تنام

1. ✅ وافق على أذونات المهمة التجريبية
2. ✅ تأكد المهمة التجريبية نجحت (شيك docs/test_task_result.txt)
3. ✅ جدول المهام العشر
4. ✅ خلّ الجهاز مفتوح (`caffeinate` أو Settings > Energy > Prevent sleep)
5. ✅ تأكد الإنترنت مستقر
6. ✅ تأكد فيه مساحة كافية على القرص

## الصبح

1. شيك `docs/OVERNIGHT_RUN_REPORT.md` في الريبو
2. شيك كل `docs/task*_REPORT.md`
3. شيك https://re-dev-modeler.vercel.app
4. شيك git log: `git log --oneline -15`
