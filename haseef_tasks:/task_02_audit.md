# TASK 2: Comprehensive Audit + Bug Hunt

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

## القواعد الصارمة
- لا تطلب إذن المستخدم — autonomous 100%
- لا تعدل ملفات tests/
- لا تعدل منطق المحرك المالي (engine defaults)
- لو فشل أي test ← revert فوراً ← حل بديل
- Brand = "Haseef" أو "حصيف" فقط

---

## المطلوب
فتح كل تاب، تجربة كل وضع تمويل (self, bank, fund, hybrid, incomeFund)، إنشاء مشروع تجريبي بـ 5 أصول متنوعة، تجربة save/reload، تجربة edge cases. تسجيل كل الأخطاء + إصلاح أسوأ 10.

## السايكل الكامل

### 1. الفهم (Understand)

اقرأ وافهم البنية الحالية:
```bash
wc -l src/App.jsx
head -100 src/App.jsx
```

حدد كل الـ views/tabs الموجودة:
```bash
grep -n "function.*View\|const.*View\s*=" src/App.jsx | head -30
```

حدد أوضاع التمويل:
```bash
grep -n "finMode\|financingMode" src/App.jsx | head -20
```

حدد الـ tabs والـ navigation:
```bash
grep -n "activeTab\|setActiveTab\|tabList\|tabs\s*=" src/App.jsx | head -20
```

افهم كيف يشتغل save/load:
```bash
grep -n "saveProject\|loadProject\|localStorage\|supabase.*insert\|supabase.*select" src/App.jsx src/lib/*.js src/lib/*.jsx 2>/dev/null | head -20
```

### 2. الخطة (Plan)

شغّل المنصة محلياً:
```bash
npm run dev &
sleep 5
```

**خطة الفحص (بالترتيب):**

#### Round 1: فحص كل tab بالحالة الافتراضية
استخدم أدوات التصفح (preview_start, preview_screenshot, preview_click, preview_fill) لفحص:
1. صفحة تسجيل الدخول — هل تظهر صحيح؟ هل الأزرار تشتغل؟
2. Dashboard — هل يعرض بيانات أو empty state؟
3. Assets tab — هل الجدول يظهر؟ هل إضافة أصل تشتغل؟
4. Financing tab — هل الإعدادات تظهر حسب finMode؟
5. Waterfall tab — هل يظهر في fund mode فقط؟
6. Results tab — هل الأرقام منطقية؟
7. Cash Flow tab — هل الجدول يعرض كل السنوات؟
8. Scenarios tab — هل المقارنة تشتغل؟
9. Reports tab — هل الأزرار تشتغل؟
10. Checks tab — هل الفحوصات تمر؟
11. Academy tab — هل يفتح بدون مشاكل؟
12. AI Assistant — هل يرسل ويستقبل رسائل؟

**لكل صفحة، سجل:**
- هل تظهر بدون crash؟ ✓/✗
- هل فيها أخطاء console؟ ✓/✗
- هل النصوص ثنائية اللغة؟ ✓/✗
- هل التفاعلات تشتغل (أزرار، inputs)؟ ✓/✗

#### Round 2: إنشاء مشروع تجريبي
أنشئ مشروع تجريبي برمجياً أو عبر الـ UI بالمواصفات:
- اسم: "Test Project"
- 5 أصول متنوعة:
  1. Residential (إيجار) — 10,000 sqm GFA
  2. Commercial (إيجار) — 5,000 sqm GFA
  3. Hotel — 150 مفتاح
  4. Marina — 50 مرسى
  5. Residential (بيع) — 8,000 sqm GFA
- Horizon: 20 سنة

#### Round 3: جرب كل وضع تمويل
لكل وضع من الخمسة (self, bank, fund, hybrid, incomeFund):
1. غيّر الوضع
2. شيك هل الـ UI يتكيف (tabs تظهر/تختفي)
3. شيك هل الحسابات تتغير
4. شيك هل فيه crash أو NaN أو undefined

#### Round 4: Edge Cases
جرب:
1. مشروع بدون أصول (0 assets) — هل يعطي crash أو رسالة مناسبة؟
2. Horizon = 1 سنة — هل يشتغل؟
3. أرقام ضخمة (CAPEX = 10 billion) — هل يعرض صحيح بدون overflow؟
4. أرقام صفرية (rent = 0, cost = 0) — هل يعطي division by zero؟
5. تغيير اللغة أثناء العمل — هل كل شي يتبدل؟
6. Dark mode ↔ Light mode — هل كل شي قابل للقراءة؟

#### Round 5: Save/Reload
1. أضف بيانات → Save
2. أغلق وأعد فتح → Load
3. تأكد البيانات نفسها

### 3. التنفيذ (Execute)

سجّل كل bug تلقيه في قائمة مرتبة:
```
BUG-001: [Critical/High/Medium/Low] [الوصف] [الصفحة] [خطوات إعادة الإنتاج]
```

بعد ما تسجل كل الأخطاء، رتبها حسب الخطورة.

**أصلح أسوأ 10 فقط.** لكل إصلاح:
1. سجل السطر الحالي
2. عدّل
3. `npm run build` — لو فشل ارجع فوراً
4. `node tests/engine_audit.cjs && node tests/zan_benchmark.cjs` — لو فشل ارجع فوراً

### 4. الفحص الآلي (Test)
```bash
npm run build
node tests/engine_audit.cjs
node tests/zan_benchmark.cjs
```
كل 427 test لازم ينجحون.

### 5. الفحص البصري (Browse & Verify)
أعد فتح المنصة وتحقق إن الـ 10 bugs المصلحة فعلاً اتصلحت:
- خذ screenshot قبل وبعد لكل bug
- تأكد ما صار regression في صفحات ثانية

### 6-7. اكتشاف وإصلاح المشاكل الجانبية
لو الإصلاحات سببت مشاكل جديدة، أصلحها. لو ما تقدر تصلحها بدون كسر tests، ارجع (revert) وسجلها للمهمة الجاية.

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK2_AUDIT_REPORT.md`:
```markdown
# Task 2: Comprehensive Audit Report
Date: [auto]

## Summary
- Total bugs found: [العدد]
- Critical: [العدد]
- High: [العدد]
- Medium: [العدد]
- Low: [العدد]
- Fixed: 10
- Remaining: [العدد]

## Bugs Found (All)
| # | Severity | Tab/Page | Description | Status |
|---|----------|----------|-------------|--------|
| BUG-001 | Critical | ... | ... | FIXED |
| BUG-002 | High | ... | ... | FIXED |
| ... | ... | ... | ... | DEFERRED |

## Bugs Fixed (Top 10 - Details)
### BUG-001: [العنوان]
- **Before:** [الوصف]
- **After:** [الإصلاح]
- **Lines changed:** [أرقام الأسطر]

## Edge Cases Tested
| Scenario | Result |
|----------|--------|
| 0 assets | [PASS/FAIL - details] |
| Horizon=1 | [PASS/FAIL] |
| ...

## finMode Switching
| Mode | UI adapts | Calculations | Crashes |
|------|-----------|-------------|---------|
| self | ✓/✗ | ✓/✗ | ✓/✗ |
| bank | ... | ... | ... |
| fund | ... | ... | ... |
| hybrid | ... | ... | ... |
| incomeFund | ... | ... | ... |

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "audit: comprehensive platform audit, fix top 10 bugs" && git push origin main
```
