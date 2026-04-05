# TASK 6: Empty States & Onboarding

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
1. رسائل فارغة ثنائية اللغة لكل تاب بدون بيانات
2. "أضف أصول عشان تشوف النتائج" / "ابدأ من هنا"
3. تشغيل Quick Setup Wizard (حالياً مخفي بـ `false &&`)

## السايكل الكامل

### 1. الفهم (Understand)

#### فهم الحالات الفارغة الحالية
```bash
# هل في empty states حالياً؟
grep -n "empty\|no.*data\|no.*assets\|لا.*بيانات\|لا.*أصول\|ابدأ\|get started" src/App.jsx | head -20
```

#### فهم كل view — ايش يصير لما ما في بيانات؟
لكل View component، اقرأ أول 30 سطر وشوف هل فيها guard clause:
```bash
grep -n "function.*View\|\.length\s*===\s*0\|!results\|!assets\|assets\.length" src/App.jsx | head -30
```

#### جد Quick Setup Wizard
```bash
grep -n "false &&.*[Ww]izard\|false &&.*[Ss]etup\|QuickSetup\|SetupWizard" src/App.jsx | head -10
```
اقرأ الـ Wizard component بالكامل — افهم ماذا يفعل، هل هو مكتمل؟

#### فهم نظام اللغة
```bash
grep -n "const t\s*=\|const lang\s*=\|i18n\|translations\|ar:\|en:" src/App.jsx | head -20
```
افهم كيف تضاف النصوص ثنائية اللغة (هل في object `t` مركزي؟ أو inline ternary `ar ? "عربي" : "English"`؟)

### 2. الخطة (Plan)

**Views اللي تحتاج empty states:**

| View | الشرط | الرسالة EN | الرسالة AR |
|------|--------|-----------|-----------|
| Dashboard | لا أصول | Add assets to see your project dashboard | أضف أصول لعرض لوحة معلومات المشروع |
| Assets Table | لا أصول | Start by adding your first asset | ابدأ بإضافة أول أصل |
| Financing | لا أصول | Add assets first to configure financing | أضف أصول أولاً لإعداد التمويل |
| Waterfall | لا أصول أو self mode | Add assets and select Fund mode to see waterfall | أضف أصول واختر وضع الصندوق لعرض الشلال |
| Results | لا نتائج | Add assets and run the model to see results | أضف أصول وشغّل النموذج لعرض النتائج |
| Cash Flow | لا بيانات | Your cash flow will appear here after adding assets | سيظهر التدفق النقدي هنا بعد إضافة الأصول |
| Scenarios | لا سيناريوهات | Create scenarios to compare different assumptions | أنشئ سيناريوهات لمقارنة افتراضات مختلفة |
| Reports | لا بيانات | Complete your model first to generate reports | أكمل نموذجك أولاً لتوليد التقارير |
| Checks | — | عادة يعرض فحوصات — لا يحتاج empty state |

**تصميم الـ Empty State Component:**
```jsx
function EmptyState({ icon, title, subtitle, actionLabel, onAction, lang }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:300, padding:40, textAlign:'center', color:'var(--text-secondary, #6b7280)'
    }}>
      <div style={{fontSize:48, marginBottom:16, opacity:0.4}}>{icon || '📊'}</div>
      <div style={{fontSize:18, fontWeight:600, marginBottom:8, color:'var(--text-primary, #1a1d23)'}}>{title}</div>
      <div style={{fontSize:14, marginBottom:20, maxWidth:400, lineHeight:1.6}}>{subtitle}</div>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer',
          background:'var(--btn-primary-bg, #0C1829)', color:'#fff', fontSize:14, fontWeight:600
        }}>{actionLabel}</button>
      )}
    </div>
  );
}
```

**Quick Setup Wizard:**
- جد `false &&` وشيله
- تحقق إن الـ Wizard component شغال ومكتمل
- لو فيه مشاكل، أصلحها
- الـ Wizard لازم يظهر عند أول فتح لمشروع جديد فقط (لا يظهر كل مرة)

### 3. التنفيذ (Execute)

**خطوة 1: أنشئ EmptyState component**
أضفه قبل أول View function في App.jsx.
```bash
npm run build
```

**خطوة 2: أضف empty states لكل View**
لكل View، أضف guard في أول الـ return:
```jsx
if (!assets || assets.length === 0) {
  return <EmptyState 
    icon="📋" 
    title={ar ? "لا توجد أصول" : "No Assets Yet"}
    subtitle={ar ? "أضف أصول لعرض النتائج" : "Add assets to see results"}
    actionLabel={ar ? "أضف أصل" : "Add Asset"}
    onAction={() => setActiveTab('assets')}
    lang={lang}
  />;
}
```

بعد كل 2-3 views:
```bash
npm run build
```
لو فشل ← revert آخر مجموعة.

**خطوة 3: تشغيل Quick Setup Wizard**
```bash
# جد السطر
grep -n "false &&" src/App.jsx | head -10
```

- احذف `false &&` اللي قبل الـ Wizard
- تأكد الـ Wizard يظهر فقط عند الحاجة (مشروع جديد بدون أصول)
- تأكد الـ Wizard يمكن إغلاقه (X أو "تخطي")

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

**سيناريو 1: مشروع فارغ (بدون أصول)**
- افتح المنصة بمشروع جديد
- زر كل tab → هل الـ empty state يظهر مع رسالة ثنائية اللغة؟
- هل زر "أضف أصل" يوديك للـ Assets tab؟

**سيناريو 2: Quick Setup Wizard**
- أنشئ مشروع جديد → هل الـ Wizard يظهر؟
- أكمل الخطوات → هل يضيف أصول؟
- أغلق الـ Wizard → هل يختفي؟
- ارجع للمشروع → هل الـ Wizard لا يظهر مرة ثانية؟

**سيناريو 3: مشروع بأصول**
- أضف أصل واحد → هل الـ empty states تختفي وتظهر البيانات؟

افحص على desktop (1280px) و mobile (375px).

### 6-7. اكتشاف وإصلاح
- لو الـ Wizard مكسور أو غير مكتمل → أصلح اللي تقدر، خلي الباقي مخفي وسجل
- لو empty state يظهر فوق بيانات موجودة → الشرط غلط، أصلحه

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK6_EMPTY_STATES_REPORT.md`:
```markdown
# Task 6: Empty States & Onboarding Report
Date: [auto]

## Empty States Added
| View | Icon | Has Action Button | Bilingual |
|------|------|-------------------|-----------|
| Dashboard | 📊 | ✓ | ✓ |
| Assets | 📋 | ✓ | ✓ |
| ... | ... | ... | ... |

## Quick Setup Wizard
- Was hidden: [YES with `false &&`]
- Now enabled: [YES/NO]
- Wizard complete: [YES/PARTIAL - details]
- Shows only on new project: [YES/NO]
- Can be dismissed: [YES/NO]
- Issues found: [list or None]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "feat: empty states for all views, enable quick setup wizard" && git push origin main
```
