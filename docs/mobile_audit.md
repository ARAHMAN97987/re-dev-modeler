# تقرير تدقيق التوافق مع الهاتف — حصيف (Haseef Financial Modeler)
**التاريخ:** 23 مارس 2026
**الملف:** src/App.jsx (12,065 سطر)
**Breakpoint:** 768px (useIsMobile hook)

---

## التقييم العام: 6.5 / 10

التطبيق **يعمل** على الهاتف لكن **ليس مُحسَّن** له. البنية التحتية موجودة (isMobile hook, media queries, responsive grids) لكن فيه ثغرات كثيرة.

---

## ✅ ما يشتغل صح (البنية التحتية)

| العنصر | التفاصيل |
|--------|----------|
| Viewport meta | ✅ `width=device-width, initial-scale=1.0` |
| useIsMobile hook | ✅ 153 استخدام — breakpoint 768px |
| Sidebar | ✅ fixed overlay على الهاتف (88vw) مع backdrop blur |
| Tab bar | ✅ scroll أفقي + scroll-snap + min-height 44px |
| Tables | ✅ `table-wrap` class مع `overflow-x: auto` + sticky first column |
| Media queries | ✅ 768px (touch targets 44px) + 480px (compact tabs) + reduced-motion + print |
| Responsive grids | ✅ ~30 grid يتحول من multi-column لـ 1fr على الهاتف |
| Wizard modal | ✅ `maxWidth: 94vw` |
| Charts | ✅ يستخدم `ResponsiveContainer` (recharts) |
| Touch targets | ✅ CSS media query يفرض `min-height: 44px` على buttons/select/input |

---

## 🔴 مشاكل حرجة (P0 — تؤثر على الاستخدام)

### P0-1: 10 grids ثابتة لا تستجيب للهاتف
3 أعمدة أو 4 أعمدة بدون `isMobile` check → تنضغط لدرجة ما تنقرأ.

| السطر | المكون | Grid | الإصلاح |
|-------|--------|------|---------|
| 5485 | AssetTable (أساسيات) | `1fr 1fr 1fr` | → `isMobile?"1fr":"1fr 1fr 1fr"` |
| 5497 | AssetTable (مساحات) | `1fr 1fr 1fr` | → نفسه |
| 5505 | AssetTable (تكاليف) | `1fr 1fr 1fr` | → نفسه |
| 5528 | AssetTable (فندق) | `1fr 1fr 1fr` | → نفسه |
| 11307 | Incentives (دعم فائدة) | `1fr 1fr 1fr` | → `isMobile?"1fr":"1fr 1fr 1fr"` |
| 11319 | Incentives (قرض حسن) | `1fr 1fr 1fr` | → نفسه |
| 11355 | Incentives (رسوم) | `1fr 1fr 1fr 1fr` | → `isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr"` |
| 11595 | MarketView (تحويل) | `1fr 1fr 1fr` | → `isMobile?"1fr":"1fr 1fr 1fr"` |
| 11931 | PresentationView | `repeat(4, 1fr)` | → `isMobile?"1fr 1fr":"repeat(4,1fr)"` |
| 4620 | SidebarAdvisor | `1fr 1fr 1fr` | → `isMobile?"1fr 1fr":"1fr 1fr 1fr"` |

### P0-2: خطوط fontSize:7-8 غير قابلة للقراءة
21 موضع بـ fontSize 7-8px — أقل من الحد الأدنى المقروء (10px) على الهاتف.
**الإصلاح:** استبدال كل `fontSize:7` و `fontSize:8` بـ `fontSize:isMobile?10:7` أو حذفها.

### P0-3: fontSize:9 في 95 موضع
على شاشة الهاتف، 9px صعبة القراءة خاصة بالعربي.
**الإصلاح:** `fontSize:isMobile?11:9` في الأماكن الحرجة (أزرار، labels، بيانات).

---

## 🟡 مشاكل متوسطة (P1 — تؤثر على التجربة)

### P1-1: أزرار فلتر المراحل — لا padding كافي على الهاتف
`padding:"6px 14px"` + `fontSize:11` — الأزرار صغيرة جداً للمس.
**الإصلاح:** `padding:isMobile?"10px 16px":"6px 14px"` + `fontSize:isMobile?13:11`
**المكونات:** 7 مكونات (كل الجولات)

### P1-2: جداول CF — minWidth:200 للعمود الأول
41 عمود أول بـ `minWidth:200` + sticky → يأخذ أكثر من نصف شاشة الهاتف (375px).
**الإصلاح:** `minWidth:isMobile?120:200`
**المكونات:** WaterfallView, BankResultsView, FinancingView, SelfResultsView, CashFlowView

### P1-3: Wizard padding ثابت
`padding:"20px 28px"` — يأخذ مساحة زائدة.
**الإصلاح:** `padding:isMobile?"14px 16px":"20px 28px"`

### P1-4: KPI cards — fontSize:19 للقيمة
كبيرة جداً على الهاتف، تضغط البقية.
**الإصلاح:** `fontSize:isMobile?15:19`

### P1-5: Phase filter — عداد "عرض X من Y" يتداخل مع الأزرار
`marginInlineStart:8` — على الهاتف يمكن ينزل لسطر جديد بدون مسافة كافية.
**الإصلاح:** يتحول لسطر كامل على الهاتف.

---

## 🟢 مشاكل بسيطة (P2 — تحسينات)

### P2-1: Table header text "Yr 1\n2026" — السطر الثاني صغير جداً
`fontWeight:400,color:"#9ca3af"` بحجم 11px — يضيع على الهاتف.

### P2-2: Sidebar advisor grid ثابت (L4620)
3 أعمدة بدون responsive → النصوص تنقطع.

### P2-3: ToggleCard tip text — Tooltip ما يشتغل بالمس
`<Tip>` يعتمد على hover — الهاتف ما فيه hover.

### P2-4: Quick Edit sections (Loan Terms / Fund Terms) — حقول ضيقة
`width:60` / `width:55` — صعب الكتابة فيها على الهاتف.

### P2-5: PDF/Excel export buttons — لا indication إن الملف قيد التحميل
على الهاتف التحميل أبطأ ولازم spinner.

---

## 📊 إحصائيات

| المقياس | القيمة | الحكم |
|---------|--------|-------|
| isMobile checks | 153 | ✅ جيد |
| Responsive grids | ~30 | ✅ جيد |
| Fixed grids (no mobile) | 10 | 🔴 يحتاج إصلاح |
| fontSize ≤ 8 | 21 | 🔴 غير مقروء |
| fontSize = 9 | 95 | 🟡 صعب القراءة |
| Tables with scroll | 14 (table-wrap) | ✅ |
| Sticky columns | 41 | 🟡 minWidth كبير |
| Touch target 44px | ✅ CSS enforced | ✅ |
| Modals maxWidth:94vw | ✅ | ✅ |

---

## خطة الإصلاح المقترحة (3 مراحل)

### المرحلة A: الأساسيات (30 دقيقة)
1. إصلاح 10 grids ثابتة → `isMobile?"1fr":"..."` 
2. استبدال fontSize:7-8 → min 10
3. تكبير أزرار فلتر المراحل على الهاتف

### المرحلة B: التحسينات (45 دقيقة)
4. تصغير minWidth الأعمدة الأولى في الجداول
5. تحسين Wizard padding
6. تصغير KPI values font
7. تحسين Quick Edit field widths

### المرحلة C: اللمسات (30 دقيقة)
8. Tooltip → tap-to-show على الهاتف
9. Loading spinner للتحميلات
10. تحسين phase filter عداد على الهاتف
