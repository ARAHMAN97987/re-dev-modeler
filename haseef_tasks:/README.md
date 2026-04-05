# Haseef Overnight Tasks Package

## الملفات
| الملف | الوصف |
|-------|-------|
| `task_00_test.md` | مهمة تجريبية — تحقق من الأذونات والبيئة |
| `task_01_security.md` | أمان — إزالة GitHub Token المكشوف |
| `task_02_audit.md` | فحص شامل + إصلاح أسوأ 10 bugs |
| `task_03_financial.md` | تحقق مالي + تنبيهات (landCap, DSCR, Exit) |
| `task_04_mobile.md` | توافق الموبايل (fonts, scroll, touch) |
| `task_05_asset_table.md` | UX جدول الأصول (resize, long text, xlsx) |
| `task_06_empty_states.md` | حالات فارغة + Quick Setup Wizard |
| `task_07_cashflow.md` | صفوف Cash Flow المفقودة (OPEX, EBITDA, GOP) |
| `task_08_ai_copilot.md` | تحسين AI Copilot (prompt, context, tables) |
| `task_09_ux_polish.md` | تناسق بصري (ألوان, radius, ترجمات, loading) |
| `task_10_final.md` | إصلاح Scroll + Deploy نهائي + تقرير شامل |
| `run_overnight.sh` | سكربت الجدولة (Bash) |

## الجدول الزمني
| الوقت | المهمة | المدة المتوقعة |
|-------|--------|---------------|
| +5 دقائق | Task 0: Test | 5 دقائق |
| +50 دقيقة | Task 1: Security | 5 دقائق |
| +1:35 | Task 2: Audit | 40 دقيقة |
| +2:20 | Task 3: Financial | 30 دقيقة |
| +3:05 | Task 4: Mobile | 35 دقيقة |
| +3:50 | Task 5: Asset Table | 40 دقيقة |
| +4:35 | Task 6: Empty States | 25 دقيقة |
| +5:20 | Task 7: Cash Flow | 30 دقيقة |
| +6:05 | Task 8: AI Copilot | 25 دقيقة |
| +6:50 | Task 9: UX Polish | 30 دقيقة |
| +7:35 | Task 10: Final | 20 دقيقة |

## طريقة الاستخدام

### الطريقة 1: MCP Scheduled Tasks (المفضلة)
افتح Claude Code وقله:
```
اقرأ الملفات في [مسار الملفات] وجدول كل مهمة كالتالي:
- Task 0: بعد 5 دقائق من الآن
- Task 1: بعد 50 دقيقة
- Task 2: بعد 95 دقيقة
... وهكذا بفواصل 45 دقيقة
```

### الطريقة 2: Bash Script
```bash
# 1. انسخ الملفات لمكان ثابت
cp -r overnight_tasks ~/haseef-overnight
cd ~/haseef-overnight

# 2. شغّل (مع caffeinate عشان الماك ما ينام)
chmod +x run_overnight.sh
caffeinate -i ./run_overnight.sh
```

### الطريقة 3: يدوي (مهمة مهمة)
افتح Claude Code واعطيه محتوى كل ملف `.md` كبرومبت منفصل.

## الصبح تشيك
1. `docs/OVERNIGHT_FINAL_REPORT.md` — التقرير الشامل
2. `docs/TASK*_REPORT.md` — تقرير كل مهمة
3. `logs/` — سجلات التنفيذ
4. https://re-dev-modeler.vercel.app — الموقع

## ملاحظات
- Task 1 يزيل التوكن من git remote — بعدها الـ push قد يحتاج token يدوي
- كل task يسوي `git pull` ضمني عبر git push (يشوف تعديلات اللي قبله)
- لو task فشل، اللي بعده يكمل مستقل
- الـ tests (427) لازم تنجح بعد كل task — لو فشلت يرجع (revert)
