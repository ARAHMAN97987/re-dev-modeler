# TASK 4: Mobile Responsiveness

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
1. إصلاح 88 مكان `fontSize:9` → حد أدنى 11px
2. مؤشر scroll أفقي واضح على الجداول
3. Touch targets أقل من 44px → تكبيرها
4. التحقق من كل صفحة على 375px و 768px

## السايكل الكامل

### 1. الفهم (Understand)

#### مسح كل fontSize الصغيرة
```bash
# كل fontSize أقل من 11
grep -n "fontSize:\s*[0-9]\b\|fontSize:\s*10\b\|fontSize:9\|fontSize:8\|fontSize:7\|fontSize:6" src/App.jsx | wc -l
grep -n "fontSize:\s*[0-9]\b\|fontSize:\s*10\b\|fontSize:9\|fontSize:8\|fontSize:7\|fontSize:6" src/App.jsx > /tmp/small_fonts.txt
cat /tmp/small_fonts.txt
```

#### مسح isMobile الحالي
```bash
grep -n "isMobile\|useMediaQuery\|window\.innerWidth\|matchMedia" src/App.jsx | head -20
```

#### فهم بنية الجداول
```bash
grep -n "<table\|overflow.*scroll\|overflow.*auto\|overflow.*hidden" src/App.jsx | head -30
```

#### مسح أحجام الأزرار والعناصر التفاعلية
```bash
grep -n "minHeight:\|minWidth:\|padding:.*[0-3]px\|height:\s*[12][0-9]\b\|width:\s*[12][0-9]\b" src/App.jsx | head -30
```

### 2. الخطة (Plan)

**المرحلة A: Font Size Fix (الأقل خطورة)**
- كل `fontSize:9` أو أقل → `fontSize:11` (للجداول الكثيفة)
- كل `fontSize:10` → `fontSize:11` (الحد الأدنى المقروء)
- **استثناء:** لو الـ fontSize داخل SVG chart أو icon، اتركها
- **استثناء:** لو تغيير الحجم يكسر layout (يخلي النص يطلع من container)، استخدم `fontSize:11` مع `whiteSpace:'nowrap'` أو `overflow:'hidden'`

**المرحلة B: Table Scroll Indicators**
- كل جدول عريض (`<table>`) اللي ممكن يطلع من الشاشة على الموبايل:
  - لفّه بـ `<div style={{overflowX:'auto', WebkitOverflowScrolling:'touch', position:'relative'}}>` إن لم يكن ملفوف
  - أضف مؤشر scroll: gradient fade على الحافة اليمنى (أو اليسرى بالعربي)

**المرحلة C: Touch Targets**
- كل زر أو عنصر تفاعلي أصغر من 44px:
  - أضف `minHeight:44, minWidth:44` أو `padding` كافي
  - العناصر الأكثر أهمية: أزرار الـ tab، أزرار الحذف/الإضافة، toggles، dropdowns

**المرحلة D: Responsive Verification**
- فحص كل صفحة على 375px (iPhone SE) و 768px (iPad)

### 3. التنفيذ (Execute)

**خطوة 1: Font Sizes**
استخدم sed بحذر أو عدّل يدوياً. **لا تستخدم sed عشوائي** — بعض fontSize:9 قد تكون مقصودة (icons, SVG). افحص كل واحدة:

```bash
# اعرض كل الحالات مع سياقها
grep -n -B1 -A1 "fontSize:\s*[0-9]\b\|fontSize:\s*10\b" src/App.jsx | head -100
```

لكل حالة:
1. اقرأ السياق — هل هي نص عادي؟ label؟ جدول؟ SVG؟
2. لو نص/label/جدول → غيّر لـ 11 (أو 12 للنص العادي)
3. لو SVG/icon/chart → اتركها

بعد كل مجموعة تغييرات (كل 10-15 تغيير):
```bash
npm run build
```
لو فشل ← revert آخر مجموعة.

**خطوة 2: Table Scroll**
```bash
# جد كل الجداول الرئيسية
grep -n "<table\s" src/App.jsx | head -20
```

لكل جدول رئيسي، تحقق هل ملفوف بـ overflow container. لو لا، لفّه:
```jsx
<div style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
  <table ...>
```

**خطوة 3: Touch Targets**
```bash
# جد الأزرار الصغيرة
grep -n "onClick.*style.*height:\|onClick.*style.*padding:\s*[0-3]" src/App.jsx | head -20
```

كل زر مع `height < 36` أو `padding < 6`:
- أضف `minHeight:44` أو زد الـ padding

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
كل 427 test لازم ينجحون. تغييرات الـ CSS/style ما المفروض تأثر على الـ tests لكن تحقق.

### 5. الفحص البصري (Browse & Verify)

**شغل المنصة وافحص كل صفحة على عرضين:**

#### Desktop (1280px)
- تأكد ما في text overflow أو layout breakage من تكبير الخطوط
- تأكد الجداول لا زالت تعرض صح

#### Mobile (375px)
استخدم preview_screenshot مع viewport 375px:
1. Dashboard — هل KPI cards تتراص عمودياً؟
2. Assets table — هل يمكن scroll أفقياً؟ هل المؤشر ظاهر؟
3. Financing — هل الإعدادات قابلة للقراءة؟
4. Results — هل الأرقام مقروءة؟
5. Cash Flow — هل الجدول scrollable؟
6. كل الأزرار — هل تقدر "تضغط" عليها؟ (44px minimum)

#### Tablet (768px)
1. تأكد ما في فراغات كبيرة مضيعة
2. تأكد الـ sidebar يتكيف أو ينطوي

**لكل صفحة، سجل:** عرض الشاشة، هل تظهر صح، أي مشاكل بصرية.

### 6-7. اكتشاف وإصلاح المشاكل
- لو لقيت نص يطلع من container بسبب تكبير الخط → أضف `overflow:hidden` أو `textOverflow:'ellipsis'`
- لو جدول يكسر layout على الموبايل → أضف `minWidth` على الجدول داخل scroll container
- لو زر ما يتضغط → تأكد `zIndex` صحيح

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK4_MOBILE_REPORT.md`:
```markdown
# Task 4: Mobile Responsiveness Report
Date: [auto]

## Font Size Changes
- Total instances found: [العدد]
- Instances changed: [العدد]
- Skipped (SVG/icon): [العدد]
- New minimum: 11px

## Table Scroll
- Tables wrapped with scroll: [العدد]
- Scroll indicator added: [YES/NO]

## Touch Targets
- Small buttons found: [العدد]
- Buttons fixed: [العدد]

## Visual Verification
| Page | Desktop (1280) | Mobile (375) | Tablet (768) |
|------|---------------|-------------|--------------|
| Dashboard | ✓/✗ | ✓/✗ | ✓/✗ |
| Assets | ... | ... | ... |
| Financing | ... | ... | ... |
| ... | ... | ... | ... |

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "fix: mobile responsiveness - font sizes, scroll indicators, touch targets" && git push origin main
```
