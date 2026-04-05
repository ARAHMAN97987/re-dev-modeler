# TASK 9: UX Polish & Visual Consistency

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
1. توحيد ألوان الأزرار (primary/secondary/danger)
2. توحيد border-radius و padding على الـ cards
3. إصلاح أهم 10 تسميات إنجليزية بدون ترجمة عربية
4. إضافة loading transition وقت إعادة حساب المحرك

## السايكل الكامل

### 1. الفهم (Understand)

#### مسح ألوان الأزرار الحالية
```bash
# كل ألوان الأزرار المختلفة
grep -n "background.*#.*onClick\|backgroundColor.*#.*onClick" src/App.jsx | head -30
grep -n "btn.*primary\|btn.*secondary\|btn.*danger\|button.*style" src/App.jsx | head -30
```

#### مسح border-radius
```bash
grep -n "borderRadius:" src/App.jsx | sort -t: -k3 -n | uniq -c | sort -rn | head -20
```

#### مسح padding على cards/containers
```bash
grep -n "padding:.*background\|background.*padding" src/App.jsx | head -20
```

#### جد labels إنجليزية بدون ترجمة عربية
```bash
# labels اللي ما تستخدم ar/lang ternary
grep -n "label:\s*['\"]" src/App.jsx | grep -v "ar\s*?\|lang\s*==\|t\." | head -30
# عناوين بدون ترجمة
grep -n ">{['\"][A-Z]" src/App.jsx | grep -v "ar\s*?\|lang\|t\." | head -30
```

#### فهم حالة recalculation
```bash
grep -n "loading\|isLoading\|calculating\|recalc\|recompute\|spinner" src/App.jsx | head -20
```

### 2. الخطة (Plan)

**المعايير البصرية (Design Tokens):**

| العنصر | القيمة المعتمدة |
|--------|----------------|
| Primary Button BG (Light) | `#0C1829` (navy) |
| Primary Button BG (Dark) | `#0A84FF` (Apple blue) |
| Secondary Button BG | transparent + border `#d1d5db` |
| Danger Button BG | `#ef4444` |
| Success/Green | `#16a34a` |
| border-radius (cards) | `12px` |
| border-radius (buttons) | `8px` |
| border-radius (inputs) | `6px` |
| padding (cards) | `20px` أو `24px` |
| padding (buttons) | `10px 20px` |
| Gold accent | `#C8A951` (لا يتغير بين light/dark) |

**الأهم 10 labels للترجمة:**
سأحدد الـ 10 الأكثر ظهوراً بعد المسح.

**Loading Transition:**
- عند إعادة حساب المحرك: overlay شفاف مع spinner
- مدة: يظهر فقط لو الحساب يأخذ > 200ms
- لا يمنع التفاعل مع الـ UI (غير blocking)

### 3. التنفيذ (Execute)

**خطوة 1: توحيد ألوان الأزرار**

أنشئ button style constants:
```jsx
const btnStyles = {
  primary: { background:'#0C1829', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:600, fontSize:14 },
  secondary: { background:'transparent', color:'#374151', border:'1px solid #d1d5db', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:500, fontSize:14 },
  danger: { background:'#ef4444', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:600, fontSize:14 },
  small: { padding:'6px 14px', fontSize:12 },
};
```

**لا تعدل كل الأزرار مرة واحدة.** عدّل 5-10 أزرار في المرة، ثم build:
```bash
npm run build
```

**خطوة 2: توحيد border-radius و padding**
```bash
# جد أكثر القيم شيوعاً
grep -o "borderRadius:[0-9]*" src/App.jsx | sort | uniq -c | sort -rn | head -10
```

وحّد:
- Cards: `borderRadius:12`
- Buttons: `borderRadius:8`
- Inputs: `borderRadius:6`
- Modals: `borderRadius:16`

**خطوة 3: ترجمة أهم 10 labels**

بعد المسح في الخطوة 1، حدد الـ 10 labels الأكثر ظهوراً. لكل واحد:
```jsx
// Before:
<label>Total CAPEX</label>
// After:
<label>{ar ? 'إجمالي التكاليف' : 'Total CAPEX'}</label>
```

**ترجمات شائعة:**
| EN | AR |
|----|----|
| Total CAPEX | إجمالي التكاليف الرأسمالية |
| Net Income | صافي الدخل |
| Debt Service | خدمة الدين |
| Exit Proceeds | عوائد الخروج |
| Preferred Return | العائد المفضل |
| GP Catch-up | تعويض المدير العام |
| Profit Split | توزيع الأرباح |
| Unreturned Capital | رأس المال غير المسترد |
| Construction Period | فترة البناء |
| Stabilized Year | سنة الاستقرار |

```bash
npm run build
```

**خطوة 4: Loading Transition**
أضف state:
```jsx
const [isCalculating, setIsCalculating] = useState(false);
```

في المكان اللي يشغل المحرك:
```jsx
setIsCalculating(true);
requestAnimationFrame(() => {
  // run engine
  const results = runEngine(project);
  setResults(results);
  setIsCalculating(false);
});
```

أضف overlay:
```jsx
{isCalculating && (
  <div style={{
    position:'fixed', inset:0, background:'rgba(255,255,255,0.6)',
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:9999, transition:'opacity 0.2s'
  }}>
    <div style={{
      padding:20, borderRadius:12, background:'#fff',
      boxShadow:'0 4px 20px rgba(0,0,0,0.1)',
      display:'flex', alignItems:'center', gap:12
    }}>
      <div className="spinner" style={{
        width:20, height:20, border:'3px solid #e5e7eb',
        borderTopColor:'#0C1829', borderRadius:'50%',
        animation:'spin 0.8s linear infinite'
      }} />
      <span style={{fontSize:14, color:'#374151'}}>
        {ar ? 'جاري الحساب...' : 'Calculating...'}
      </span>
    </div>
  </div>
)}
```

أضف CSS animation:
```jsx
// في أعلى الملف أو في <style>
const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;
```

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
كل 427 test لازم ينجحون.

### 5. الفحص البصري (Browse & Verify)

**ألوان الأزرار:**
- افتح كل صفحة وشيك الأزرار — هل primary كلها navy؟ هل danger كلها أحمر؟
- شيك dark mode — هل primary تتحول لـ Apple blue؟

**border-radius:**
- هل كل الـ cards بنفس الزوايا (12px)؟
- هل فيه cards بزوايا مختلفة بشكل واضح؟

**الترجمة:**
- حوّل اللغة للعربي
- زر كل الـ tabs — هل الـ 10 labels المترجمة ظاهرة بالعربي؟

**Loading:**
- عدّل قيمة (rent مثلاً) → هل الـ spinner يظهر لحظياً؟
- هل يختفي بسرعة؟

افحص على desktop (1280px) و mobile (375px).

### 6-7. اكتشاف وإصلاح
- لو زر يظهر بلون غلط → أصلحه
- لو الـ spinner يظل ظاهر (لا يختفي) → مشكلة في setIsCalculating(false)
- لو الترجمة تقطع layout → قصّر النص العربي أو وسّع الـ container

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK9_UX_POLISH_REPORT.md`:
```markdown
# Task 9: UX Polish Report
Date: [auto]

## Button Colors
- Buttons audited: [العدد]
- Buttons standardized: [العدد]
- Primary: #0C1829 (light) / #0A84FF (dark)
- Danger: #ef4444
- Secondary: transparent + border

## Border Radius
- Before: [mixed values]
- After: cards=12, buttons=8, inputs=6

## Labels Translated (Top 10)
| # | EN | AR | Location |
|---|----|----|----------|
| 1 | Total CAPEX | إجمالي التكاليف الرأسمالية | Dashboard |
| ... | ... | ... | ... |

## Loading Transition
- Added: [YES/NO]
- Appears on recalc: [YES/NO]
- Disappears correctly: [YES/NO]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "fix: UX polish - button colors, border-radius, translations, loading state" && git push origin main
```
