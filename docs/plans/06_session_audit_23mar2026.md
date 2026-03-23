# تقرير تدقيق جلسة 23 مارس 2026 (الجلسة المسائية)

**المدقق:** Claude
**التاريخ:** 23 مارس 2026
**النطاق:** 18 commit (من `8d2d78d` إلى `c5d928b`)
**الملفات المعدلة:** 6 ملفات | 498 سطر مضاف | 202 سطر محذوف
**الاختبارات:** 634/634 ناجح على كل commit

---

## الملفات التي لم تُمس (تأكيد)

صفر تعديل على الملفات التالية:

| الملف | السبب |
|-------|-------|
| src/engine/cashflow.js | محرك مالي - ممنوع التعديل |
| src/engine/financing.js | محرك مالي - ممنوع التعديل |
| src/engine/waterfall.js | محرك مالي - ممنوع التعديل |
| src/engine/incentives.js | محرك مالي - ممنوع التعديل |
| src/engine/checks.js | محرك مالي - ممنوع التعديل |
| src/engine/phases.js | محرك مالي - ممنوع التعديل |
| src/engine/math.js | محرك مالي - ممنوع التعديل |
| src/engine/hospitality.js | محرك مالي - ممنوع التعديل |
| src/engine/index.js | محرك مالي - ممنوع التعديل |
| src/data/defaults.js | بيانات مرجعية |
| src/data/benchmarks.js | بيانات مرجعية |
| src/data/translations.js | ترجمات |
| src/utils/format.js | أدوات تنسيق |
| src/utils/csv.js | أدوات CSV |
| src/lib/storage.js | طبقة التخزين |
| src/lib/supabase.js | اتصال Supabase |
| tests/* | كل ملفات الاختبارات (16 ملف) |
| src/auth.jsx | ملف مصادقة قديم |

**التحقق:** `git diff 09610b2..c5d928b -- src/engine/ src/data/ src/utils/ src/lib/storage.js tests/` = فارغ

---

## الملفات المعدلة (6)

### 1. src/App.jsx (636 سطر تغيير)
### 2. src/lib/auth.jsx (14 سطر تغيير)
### 3. src/AiAssistant.jsx (2 سطر تغيير)
### 4. src/excelExport.js (14 سطر تغيير)
### 5. src/excelFormulaExport.js (10 سطر تغيير)
### 6. docs/plans/README.md (24 سطر تغيير)

---

## التغييرات بالتفصيل

### A. كود جديد مضاف (لم يكن موجوداً)

#### A1. getMetricColor() - دالة الألوان الوظيفية
**الموقع:** أعلى App.jsx (بعد الـ imports مباشرة)
**الوظيفة:** ترجع لون (أخضر/أصفر/أحمر) بناءً على قيمة مؤشر مالي
**القواعد:**
- IRR: >= 15% أخضر, 10-15% أصفر, < 10% أحمر
- DSCR: >= 1.5 أخضر, 1.2-1.5 أصفر, < 1.2 أحمر
- LTV: <= 60% أخضر, 60-70% أصفر, > 70% أحمر
- NPV: > 0 أخضر, = 0 أصفر, < 0 أحمر
- MOIC: >= 2.0 أخضر, 1.5-2.0 أصفر, < 1.5 أحمر
- cashFlow: > 0 أخضر, < 0 أحمر
**أثر:** لا يغير أي رقم - فقط لون العرض

#### A2. Financing KPI Strip (أعلى تبويب الهيكلة المالية)
**الموقع:** داخل FinancingView، بعد phase selector
**المحتوى:** 5 بطاقات: Total Debt, Total Equity, Effective LTV (ملون), Avg DSCR (ملون + min sub-label), Cost of Debt
**مصدر البيانات:** يقرأ من `financing` object (نفس مصدر البيانات الموجود)
**أثر:** عرض فقط - لا يعدل أي قيمة

#### A3. Financing Charts (Pie + DSCR Line)
**الموقع:** داخل FinancingView، قبل جدول CF
**المحتوى:**
- Pie Chart: Debt vs Equity split (بـ Recharts PieChart)
- DSCR Line Chart: مسار DSCR بالسنوات مع خطوط 1.2x و 1.5x
**imports مضافة:** `PieChart, Pie, Cell, LineChart, Line, Legend` من recharts
**أثر:** عرض فقط

#### A4. _domNotify() - بديل alert()
**الموقع:** قبل generateFullModelXLSX
**الوظيفة:** يعرض notification بالـ DOM بدل alert() المعطلة
**أثر:** يحل مشكلة alert() اللي ما تشتغل بشكل جيد

#### A5. Sticky KPI Bar (شريط المؤشرات الثابت)
**الموقع:** أعلى محتوى كل تبويب (ما عدا Dashboard)
**المحتوى الديناميكي:**
- دائماً: CAPEX + Revenue + IRR
- self mode: + NPV
- debt/bank100: + DSCR + LTV
- fund: + LP IRR + MOIC
- exit sale + proceeds > 0: + Exit value
**Phase tabs:** لو فيه أكثر من مرحلة، يعرض [All] [Phase 1] [Phase 2]... ويغير البيانات حسب المرحلة المختارة
**State مضاف:** `kpiPhase` (useState) - يخزن المرحلة المختارة بالشريط
**أثر:** عرض فقط - يقرأ من results/financing/waterfall

#### A6. Asset Data Prep Guide
**الموقع:** تبويب الأصول، يظهر لما 0 أصول
**المحتوى:** بانر بـ 6 نقاط (مساحة، GFA، تكلفة، مدة بناء، إيجار، إشغال) + تلميح القوالب
**أثر:** عرض فقط

#### A7. Google Sign-in Button
**الموقع:** src/lib/auth.jsx، بعد divider "أو"
**الوظيفة:** `supabase.auth.signInWithOAuth({provider:'google'})`
**أثر:** يضيف خيار تسجيل دخول - لا يحذف أو يغير الخيارات الموجودة

#### A8. CSS Classes (Global Styles)
**المضاف:**
- Typography: `.zan-title`, `.zan-section`, `.zan-subsection`, `.zan-body`, `.zan-label`, `.zan-small`, `.zan-metric`
- Cards: `.zan-card`, `.zan-card-dark`
- Spacing: `.zan-gap-sm/md/lg`, `.zan-section-gap`
- Animations: `@keyframes zanShimmer`, `@keyframes zanTabFade`, `@keyframes zanModalIn`
- Utility: `.zan-shimmer`, `.zan-tab-content`
- Accessibility: `@media (prefers-reduced-motion: reduce)`
- Scrollbar: `.table-wrap::-webkit-scrollbar` polish
- Print: `@media print` hide sidebar/buttons
- Focus: `input:focus-visible` ring
**أثر:** CSS فقط - لا يغير DOM أو بيانات

---

### B. كود معدل (كان موجوداً وتغير)

#### B1. ألوان المؤشرات - 32 موقع
**التغيير:** استبدال hardcoded color ternaries بـ `getMetricColor()`
**مثال قبل:** `levIRR>0.12?"#16a34a":"#f59e0b"`
**مثال بعد:** `getMetricColor("IRR",levIRR)`
**تأثير على العتبات:**
| المؤشر | قبل | بعد |
|--------|------|------|
| IRR | > 12% = أخضر, else أصفر | >= 15% أخضر, 10-15% أصفر, < 10% أحمر |
| DSCR | >= 1.25 = أخضر, else أحمر | >= 1.5 أخضر, 1.2-1.5 أصفر, < 1.2 أحمر |
| MOIC | hardcoded أزرق/بنفسجي | >= 2.0 أخضر, 1.5-2.0 أصفر, < 1.5 أحمر |
| LTV | > 75% أحمر, > 60% أصفر, else أخضر | > 70% أحمر, 60-70% أصفر, <= 60% أخضر |
**ملاحظة مهمة:** العتبات تغيرت. IRR كان binary (12%) والآن ternary (15%/10%). DSCR كان binary (1.25) والآن ternary (1.5/1.2). هذا تغيير سلوكي مقصود حسب الخطة.
**أثر:** لا يغير الأرقام - فقط لون العرض

#### B2. Input Validation - error prop مضاف لـ 4 components
**Components المعدلة:**
| Component | التغيير |
|-----------|---------|
| FL | أضيف `error` prop → red label + red glow + error message |
| Fld | أضيف `error` prop → red label + red glow + error message |
| F2 | أضيف `error` prop → red label + red glow + error message |
| FieldGroup | أضيف `globalExpand` prop |
| Sec | أضيف `globalExpand` prop + useEffect |
| ControlPanel | أضيف `globalExpand` prop (passed through) |

**حقول مع validation مضاف:**
| الحقل | القاعدة |
|-------|---------|
| horizon | 1-99 |
| landArea | >= 0 |
| softCostPct | 0-50% |
| contingencyPct | 0-30% |
| defaultEfficiency | 0-100% |
| cfg.maxLtvPct | 0-100% |
| cfg.financeRate | 0-30% |
| cfg.loanTenor | 1-50 yr |
| cfg.debtGrace | <= tenor |
| asset.plotArea | >= 0 |
| asset.footprint | >= 0 |
| asset.gfa | >= 0 |
| asset.stabilizedOcc | 0-100% |
| asset.costPerSqm | >= 0 |
| asset.constrDuration | 1-120 mo |

**أثر:** لا يمنع الإدخال - فقط يعرض تحذير بصري. المستخدم يقدر يدخل أي قيمة.

#### B3. ثنائي اللغة (Bilingual fixes)
**النصوص المعدلة:**
| قبل | بعد |
|------|------|
| `>Total</th>` (12 مكان) | `{ar?"الإجمالي":"Total"}` |
| `Yr {y+1}` (3 أماكن) | `{ar?"س":"Yr"} {y+1}` |
| `>Sign Out<` | `{ar?"خروج":"Sign Out"}` |
| `>Cancel<` (Hotel modal) | `{ar?"إلغاء":"Cancel"}` |
| `>Save & Apply EBITDA<` (Hotel) | `{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}` |
| `>Cancel<` (Marina modal) | `{ar?"إلغاء":"Cancel"}` |
| `>Save & Apply EBITDA<` (Marina) | `{ar?"حفظ وتطبيق":"Save & Apply EBITDA"}` |
**أثر:** لا يغير وظائف - فقط يعرض النص بلغة المستخدم

#### B4. HotelPLModal + MarinaPLModal - إضافة lang prop
**قبل:** `function HotelPLModal({ data, onSave, onClose, t })`
**بعد:** `function HotelPLModal({ data, onSave, onClose, t, lang })`
**السبب:** لازم يعرف اللغة عشان يعرض Cancel/Save بالعربي
**أثر:** لا يغير وظائف

#### B5. Collapse defaults - كل الأقسام مطوية تلقائياً
**التغييرات:**
| Component / State | قبل | بعد |
|------------------|------|------|
| FieldGroup defaultOpen | true | false |
| ExitAnalysisPanel open | true | false |
| IncentivesImpact open | true | false |
| FinancingView isOpen(id) | `!collapsed[id]` (= all open) | `collapsed[id] === true` (= all closed) |
| FinancingView cfgOpen(id) | `!cfgSec[id]` (= all open) | `cfgSec[id] === true` (= all closed) |
| SelfResultsView secOpen | `{}` (= all open) | `{s1:true,s2:true,s3:true}` (= all closed) |
| BankResultsView secOpen | `{}` (= all open) | `{s1:true,s2:true,s3:true,s4:true,s5:true}` (= all closed) |
| FinancingView secOpen | `{}` (= all open) | `{s1:true,s2:true,s3:true}` (= all closed) |
| Sidebar Sec (General) | `def={true}` | `def={false}` |
| landOpen | `true` | `false` |

**globalExpand wiring مضاف:**
| Component | كان موصول؟ | الآن |
|-----------|-----------|------|
| ExitAnalysisPanel | لا | نعم |
| IncentivesImpact | لا | نعم |
| Sidebar Sec | لا | نعم |
| ControlPanel | لا يمرر | يمرر |
| FieldGroup | لا | نعم |
| landOpen | لا | نعم |
| showLandRentDetail | لا | نعم |
| FinancingView secOpen | لا | نعم |

**أثر:** سلوكي - كل شي مطوي بالبداية. زر "توسيع الكل" يفتح الكل.

#### B6. رسائل الخطأ المحسنة
| الموقع | قبل | بعد |
|--------|------|------|
| Auth login catch | `e.message \|\| "Error"` | `e.message \|\| (ar?"فشل تسجيل الدخول...":"Login failed...")` |
| CSV import catch | `String(err)` | `(lang==='ar'?'فشل الاستيراد: ':'Import failed: ') + String(err)` |
| Excel XLSX load fail | `alert('Excel export failed.')` | `_domNotify('Excel export failed...')` |
| Excel script error | `alert('Could not load...')` | `_domNotify('Could not load...')` |

#### B7. Skeleton Loading Screen
**قبل:** شعار ZAN ثابت فقط
**بعد:** شعار + 4 أشرطة shimmer متحركة + نص "جاري التحميل"
**أثر:** بصري فقط

#### B8. Tab Content Animation
**قبل:** `<div key={tabKey} style={{display:...}}>`
**بعد:** `<div key={tabKey} style={{display:...}} className={activeTab===tabKey?"zan-tab-content":undefined}>`
**أثر:** fade animation 0.2s عند تبديل التبويبات

#### B9. Modal Animation
**المعدل:** Template picker modal + Asset edit modal
**المضاف:** `animation:"zanModalIn 0.2s ease-out"` على الـ modal container
**أثر:** scale-in animation عند فتح المودال

---

### C. كود مخفي (محفوظ لكن لا يعمل)

#### C1. Quick Financing Settings Strip
**الموقع:** FinancingView (كان أعلى الهيكلة المالية)
**طريقة الإخفاء:** `{false && (() => {` - الكود محفوظ بالكامل لكن لا يُنفذ
**السبب:** استُبدل بـ Sticky KPI Bar
**المحتوى المخفي:**
- Max LTV input
- Profit Rate input
- Tenor input
- Grace input
- Exit Year input
- Exit Multiple input (conditional)
- Cap Rate input (conditional)
- Fund Start Year input (conditional)
- Pref Return input (conditional)

**ملاحظة للمدقق:** هذه الحقول لا زالت موجودة وقابلة للتعديل من داخل أقسام الهيكلة المالية (Debt Terms, Exit Strategy, Fund Structure). الفلتر السريع كان ازدواجية - نفس الحقول بمكانين. الآن المستخدم يعدل من مكان واحد فقط.

---

### D. كود محذوف بالكامل

**لا يوجد.** كل التعديلات إما إضافة أو تعديل أو إخفاء. لم يُحذف أي كود نهائياً.

---

### E. إعادة التسمية (Rebrand)

#### E1. ZAN → Haseef (6 ملفات)
**القاعدة:** عربي = حصيف, English = Haseef

| الملف | عدد التغييرات | نوع التغيير |
|-------|-------------|-------------|
| App.jsx | ~40 | لوقو، عناوين، شارات، تقارير، أكاديمية، tooltips، نص المشاركة |
| lib/auth.jsx | 5 | صفحة الدخول، حقوق، أكاديمية، لوقو |
| AiAssistant.jsx | 1 | System prompt |
| excelExport.js | 6 | Headers, footers, platform name |
| excelFormulaExport.js | 4 | Headers, download filename |
| docs/plans/README.md | 0 | Progress tracker only |

**ما لم يتغير:**
- ملفات المحرك (تعليقات تشير لملفات Excel المرجعية)
- CSS class names (zanSlide, zan-card) - داخلية
- "جازان" - اسم مدينة مو براند

---

## ملخص الأثر

### ما تغير بتجربة المستخدم:
1. ألوان المؤشرات المالية (أخضر/أصفر/أحمر بدل أبيض/لون واحد)
2. عتبات الألوان (IRR 15%/10% بدل 12%, DSCR 1.5/1.2 بدل 1.25)
3. كل الأقسام مطوية تلقائياً (كانت مفتوحة)
4. شريط مؤشرات ثابت أعلى كل صفحة
5. الفلتر السريع مخفي (المدخلات لا زالت بالأقسام الداخلية)
6. ZAN → Haseef/حصيف
7. تحذيرات حمراء على حقول الإدخال الخاطئة
8. رسائل خطأ أوضح
9. زر Google Sign-in
10. بانر توجيهي عند 0 أصول
11. animations (tab fade, modal scale, shimmer loading)
12. ثنائية لغة (Total, Yr, Cancel, Save, Sign Out)

### ما لم يتغير:
- أي حساب مالي
- أي رقم بالنتائج
- أي input/output بالمحرك
- أي اختبار (634/634 ناجح)
- هيكل البيانات
- التخزين (Supabase)
- المصادقة (email/password لا زالت تعمل)
- تصدير Excel (نفس المحتوى)
- تصدير PDF/HTML (نفس المحتوى)

---

## قائمة التحقق للمدقق

- [ ] افتح التطبيق - هل يظهر "حصيف" بالعربي و "Haseef" بالإنجليزي؟
- [ ] أنشئ مشروع جديد - هل الشريط الثابت يعرض CAPEX 0 + Revenue 0 + IRR —؟
- [ ] أضف أصل - هل CAPEX و Revenue يتحدثون بالشريط؟
- [ ] غير finMode لـ fund - هل يظهر LP IRR + MOIC بالشريط؟
- [ ] لو فيه مراحل - هل تبويبات المراحل تظهر بالشريط؟
- [ ] هل كل الأقسام مطوية تلقائياً؟
- [ ] اضغط "توسيع الكل" - هل كل شي يفتح (بما فيه الأرض)؟
- [ ] اضغط "طي الكل" - هل كل شي يرجع مطوي؟
- [ ] أدخل horizon = 0 - هل يظهر تحذير أحمر؟
- [ ] أدخل grace > tenor - هل يظهر تحذير أحمر؟
- [ ] هل IRR 14% يظهر أصفر (ليس أخضر)؟ (عتبة جديدة 15%)
- [ ] هل IRR 16% يظهر أخضر؟
- [ ] هل DSCR 1.3 يظهر أصفر (ليس أحمر)؟ (عتبة جديدة 1.2)
- [ ] هل الفلتر السريع مخفي من الهيكلة المالية؟
- [ ] هل المدخلات لا زالت موجودة داخل الأقسام (Debt Terms, Exit)؟
- [ ] صدّر Excel - هل يظهر "Haseef" (مو ZAN)؟
- [ ] هل أي رقم بالنتائج/التدفق/الفحوصات تغير؟ (يجب ألا يتغير)
