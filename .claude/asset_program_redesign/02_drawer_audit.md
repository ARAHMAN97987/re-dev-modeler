# مراجعة عميقة — زر "التفاصيل الكاملة" (AssetDetailPanel)

**التاريخ:** 2026-04-18
**النطاق:** الإجابة على سؤالك: *"هل أقدر أشتغل بدون ما أفتح الـ drawer، أم الـ drawer إجباري؟ ايش اللي ينكسر لو ما عبيته؟"*
**ماذا لن أعدّل:** لا كود. فقط فهم + توصية. أنت تقرر.

---

## 1. الوضع باختصار (3 جُمل)

- الـ drawer **ليس اختيارياً لكل أنواع الأصول**. بعضها يعمل من الجدول، بعضها **يُجبرك على فتح الـ drawer** وإلا النتائج صفر.
- المحرك يقرأ ~22 حقلاً فعلياً على مستوى الأصل. الباقي (~10 حقول) **مجرد عرض وتحذيرات** — لا يغيّر أي رقم.
- القالب المختار عند الإضافة يحسم الأمر: 6 من 7 قوالب معبّأة ذاتياً بما يكفي ليعمل الجدول وحده. القالب السابع (`custom`) يتركك أمام نموذج فارغ — هنا الـ drawer مُحتّم.

---

## 2. خريطة التحكم الفعلية

### 2a. الحقول التي **يقرأها المحرك** ويأثّر فيها كل حقل

| الحقل | القراءة في المحرك | الافتراضي لو غائب | الأثر الفعلي |
|---|---|---|---|
| **gfa** | `cashflow.js:38,44,120,194` | `0` | إذا صفر → CAPEX صفر + إيراد صفر. **حرج جداً** |
| **efficiency** | `cashflow.js:119,194` | `0` (Lease) / `100` (Sale) / مُهمل (Op) | Lease: صفر إيراد لو صفر. **حرج للـ Lease** |
| **revType** | `cashflow.js:176,184,189` | — (switch) | يحدد المسار الحسابي. **حرج** |
| **leaseRate** | `cashflow.js:121,176,182` | `0` | **حرج للـ Lease** — صفر = صفر إيراد |
| **opEbitda** | `cashflow.js:122,184,187` | `0` | **حرج للـ Operating** — يُشتق من hotelPL/marinaPL إن وُجدا |
| **salePricePerSqm** | `cashflow.js:191,195` | `0` | **حرج للـ Sale** — صفر = صفر إيراد بيع |
| **absorptionYears** | `cashflow.js:197,211` | `3` | توزيع الإيراد على سنوات |
| **preSalePct** | `cashflow.js:199-206` | `0` | بيع مسبق في آخر سنة بناء |
| **commissionPct** | `cashflow.js:198,205,213` | `0` | عمولة البيع — تُخصم من صافي الإيراد |
| **costPerSqm** | `cashflow.js:39,44,51-53` | `0` | **حرج** — CAPEX = GFA × costPerSqm |
| **constrDuration** | `cashflow.js:115,157,161-168` | `12` | توزيع CAPEX على السنوات |
| **stabilizedOcc** | `cashflow.js:118,182` | `100` | Lease: يضرب في الإيراد |
| **rampUpYears** | `cashflow.js:117,182,187` | `3` | منحنى النمو التدريجي |
| **escalation** | `cashflow.js:109,112,182` | `project.rentEscalation` (0.75%) | زيادة سنوية في الإيجار |
| **phase** | `cashflow.js:130,224` | "Phase 1" | يحدد سنة الإيرادات عبر `phase.completionYear` |
| **footprint** | `cashflow.js:43-44,254,348` | `0` | توزيع إيجار الأرض بين المراحل |
| **plotArea** | `cashflow.js:31,39,42` | `0` | يظهر في تقارير + تحذيرات zoning فقط |
| **basementLevels** | `cashflow.js:43,90-91` | `0` | إذا >0 → تكلفة إضافية (علاوة بيسمنت) |
| **basementCostMultiplier** | `cashflow.js:48,52` | `1.6` | فقط لو `basementLevels > 0` |
| **parkingArea** | `cashflow.js:57,59` | `0` | فقط لو `parkingCostPerSqm > 0` |
| **parkingCostPerSqm** | `cashflow.js:58-59` | `0` | فقط إن طُلب صراحةً |
| **softCostPctOverride** | `cashflow.js:64` | `project.softCostPct` (10%) | تجاوز مستوى المشروع |
| **contingencyPctOverride** | `cashflow.js:65` | `project.contingencyPct` (5%) | نفس الشي |

### 2b. الحقول التي **لا يقرأها المحرك** — عرض/تحذير فقط

هذه **لا تؤثر على أي رقم (IRR, CAPEX, Revenue)**. إن لم تعبّيها → ولا شي يكسر.

| الحقل | أين يظهر | الغرض |
|---|---|---|
| `floorsAboveGround` | Geometry | حساب افتراضي للـ GFA المتوقع (تحذير فقط) |
| `coveragePct`, `far` | Geometry | تحذيرات zoning (coverage > 60%؟ FAR > 2؟) |
| `gla` | Geometry | يُحسب تلقائياً = GFA × efficiency (عرض) |
| `nla` | Geometry → متقدم | تفصيل معماري (لا يدخل المحرك) |
| `openArea` | Geometry → متقدم | نفسه |
| `assetPriority` | Phase & Timeline | شارة "رئيسي / سريع / اختياري" — زينة |
| `openingYear` | Phase & Timeline | حقل legacy — المحرك يستخدم `phase.completionYear` |
| `startYear` | Phase & Timeline | حقل legacy — المحرك يستخدم `phase.completionYear` أو `constrStart` |
| `isBuilding` | مشتق من نوع الأصل | يتحكم في إظهار/إخفاء قسم Geometry للأنواع غير-المباني |

**عدد الحقول الميتة engine-wise: 9 حقول**. وجودها في الـ drawer لا يسبب ضرراً، لكن إذا تركتها فارغة لا يتغير شيء.

### 2c. الحقول التي **يمكن التعديل عليها من الجدول**

من `cols` array في `App.jsx:5368-5393`:

✅ **قابل للتعديل في الجدول:** `phase`, `name`, `category`/`assetType`, `code`, `gfa`, `efficiency`, `plotArea`, `footprint`, `revType`, `leaseRate` ("المعدل"), `stabilizedOcc` ("الإشغال%"), `escalation` ("زيادة الإيجار %"), `rampUpYears` ("النمو"), `costPerSqm` ("تكلفة/م²"), `constrDuration` ("مدة البناء")

❌ **يُعرض في الجدول لكن قراءة فقط:**
- `opEbitda` — لأصول **Operating** تظهر كنص ثابت. زر "P&L" يفتح Hotel/Marina modal فقط. **لأصل Operating من نوع آخر (مثلاً مطعم، محطة وقود، مدرسة) لا يوجد طريق لتعديل EBITDA من الجدول.**

❌ **غير موجود في الجدول إطلاقاً (drawer-only):**
- `salePricePerSqm`, `absorptionYears`, `preSalePct`, `commissionPct` — كلها لأصول **Sale**
- `floorsAboveGround`, `basementLevels`, `coveragePct`, `far`, `gla`, `nla`, `parkingArea`, `openArea`
- `basementCostMultiplier`, `parkingCostPerSqm`, `softCostPctOverride`, `contingencyPctOverride`
- `assetPriority`, `openingYear`, `startYear`

---

## 3. الحكم النهائي — هل الـ drawer اختياري؟

### الإجابة بصيغة مباشرة:

| نوع الأصل + القالب | هل الجدول وحده يكفي؟ | لماذا |
|---|---|---|
| **Lease** من قالب (Mall/Office/Residential) | ✅ **نعم** — كل الحقول الحرجة في الجدول + القالب يملؤها | leaseRate + occ + ramp + esc + gfa + cost كلها editable في الجدول |
| **Lease** من قالب `custom` (فارغ) | ⚠️ نعم، لكن **تحتاج تعبئ leaseRate يدوياً من الجدول** (عمود "المعدل") | لا افتراضي جاهز — لكن الحقل في الجدول |
| **Operating** قالب فندق 5/4 نجوم | ✅ نعم — زر P&L في الجدول يفتح modal يعبّي opEbitda تلقائياً | hotelPL يُشتق ويحسب opEbitda |
| **Operating** قالب مارينا | ✅ نعم — نفس الشي مع marinaPL | |
| **Operating** نوع آخر (مدرسة، محطة، مستشفى...) | ❌ **لا** — EBITDA قراءة فقط في الجدول، ولا يوجد P&L modal لغير Hotel/Marina | **يجب فتح الـ drawer** |
| **Sale** من أي قالب (لا يوجد قالب Sale أصلاً) | ❌ **لا** — 4 حقول حرجة drawer-only (salePricePerSqm, absorption, preSale, commission) | **يجب فتح الـ drawer** بالكامل |

### خلاصة (للحفظ):

```
┌─────────────────────────────────────────────────────────┐
│  الـ drawer اختياري في 4 حالات فقط:                      │
│    1. قالب Mall + تعديل في الجدول                        │
│    2. قالب Office + تعديل في الجدول                      │
│    3. قالب Residential + تعديل في الجدول                 │
│    4. قالب Hotel 5/4 أو Marina (مع زر P&L)               │
│                                                         │
│  الـ drawer إجباري في:                                   │
│    - أي أصل Sale                                        │
│    - أصل Operating غير Hotel/Marina                     │
│    - أي أصل فيه basement أو parking cost مخصص          │
│    - أي أصل يحتاج تجاوز soft%/contingency% لمستوى        │
│      المشروع                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 4. المشاكل التي وجدتها (لك تقرر أيها يستحق الإصلاح)

### 🔴 مشكلة حقيقية #1 — أصول Sale بلا قالب
**الأعراض:** لو المستخدم يريد نمذجة مشروع سكني للبيع، لا يوجد قالب جاهز. لو اختار `custom` + غيّر revType إلى Sale، الحقول الأربعة الحرجة (`salePricePerSqm`, `absorptionYears`, `preSalePct`, `commissionPct`) **غير موجودة في الجدول أصلاً**. أي يضغط "›" إجبارياً.

**الإصلاح المقترح:**
- **خيار A (الأقل تدخلاً):** إضافة قالب `resi_sale` (سكني للبيع) إلى Template Picker يُعبّي salePricePerSqm/absorptionYears بقيم سوقية افتراضية.
- **خيار B (أقوى):** إضافة أعمدة Sale إلى الجدول تظهر فقط لو revType=Sale.
- **خيار C (الأخف):** على الأقل، لو المستخدم يغيّر revType إلى Sale من الجدول، نفتح الـ drawer تلقائياً على قسم Revenue.

### 🔴 مشكلة حقيقية #2 — أصول Operating غير Hotel/Marina
**الأعراض:** مشاريع حقيقية (محطة وقود، مطعم، مستشفى، مركز رياضي، موقف سيارات تشغيلي) كلها Operating لكن ليست Hotel/Marina. في الجدول `opEbitda` يظهر **قراءة فقط** ولا يوجد P&L modal. المستخدم يُحشر في الـ drawer.

**الإصلاح المقترح:**
- جعل خلية EBITDA قابلة للتعديل في الجدول دائماً. زر P&L يبقى لـ Hotel/Marina فقط، لكن الخلية نفسها تكون editable للجميع.
- هذا تعديل سطر واحد في `App.jsx:5965-5975`.

### 🟡 ملاحظة — قسمان في الـ drawer شبه-ميت
- **Section 3: Phase & Timeline** — يعرض `startYear` و `openingYear` وهما legacy fields. المحرك يستخدم `phase.completionYear` بدلاً منهما. إن غيّر المستخدم `startYear` أو `openingYear` في الـ drawer، **لا يتغير أي رقم**.
  - توصية: إما إزالة الحقلين أو ربطهما فعلياً بالمحرك.
- **Section 2 (Geometry) → متقدم** — NLA + Open Area لا يستخدمهما المحرك. تركتهما في "متقدم" لأن قد يراها المستخدم مفيدة توثيقياً، لكن للتذكير فقط: صفر أثر مالي.

### 🔴 مشكلة حقيقية #3 — حقول سنة البدء/الافتتاح ميتة فعلياً (مؤكد)

بعد التحقق في `src/engine/cashflow.js:128-151`، ترتيب المحرك لتحديد توقيت الأصل هو:
```
1. phase.completionYear (الأولوية الأولى)
2. asset.constrStart      (legacy fallback)
3. phase.completionMonth  (legacy fallback أقدم)
4. delayYears             (لو كل ما سبق فارغ)
```

**`asset.startYear` و `asset.openingYear` غير مقروءَين في المحرك مطلقاً** (grep مؤكد).

- الـ drawer (`AssetDetailPanel.jsx:729`) يعرض "Start Year" = `asset.startYear || asset.constrStart` لكنه يكتب إلى `asset.startYear` — **قيمة لا يقرأها أحد**.
- نفس الشي للـ "Opening Year" (`AssetDetailPanel.jsx:737`) — يكتب إلى `asset.openingYear` الميت.

**النتيجة:** المستخدم قد يعدّل هذين الحقلين ظنّاً أنه يغيّر توقيت المشروع، والأرقام لا تتحرك. هذا bug حقيقي.

**الإصلاح:**
- **خيار A (الأنظف):** حذف الحقلين من الـ drawer. التوقيت الفعلي محكوم بـ `phase.completionYear` (يُعدَّل من "شريط المراحل" أعلى الجدول) و `constrDuration` (عمود "مدة البناء" في الجدول). لا حاجة لحقلين إضافيين.
- **خيار B:** ربط `asset.startYear` بـ `asset.constrStart` لجعله فعلياً. لكن هذا ازدواج مع `phase.completionYear`.
- توصيتي: **الخيار A** — حذف نظيف.

---

## 5. توصيتي

### الخطة المقترحة (3 phases صغيرة، كل واحدة commit منفصل، لك القرار):

**P1 — إصلاح EBITDA في الجدول (دقائق، أمان عالي):**
- تعديل `App.jsx:5965-5975` ليجعل خلية EBITDA قابلة للتعديل دائماً، مع زر P&L يبقى للفنادق/المارينا.
- يحل مشكلة Operating-غير-Hotel/Marina.

**P2 — إضافة قالب "سكني للبيع" (Sale):**
- إضافة قالب ثامن إلى ASSET_TEMPLATES في `App.jsx:5240`.
- يعبّي revType=Sale + salePricePerSqm + absorptionYears + preSalePct + commissionPct افتراضياً.
- لا يحل كل حالات Sale، لكن يغطي السيناريو الأشيع.

**P3 — تدقيق startYear/openingYear (تحقق فقط أولاً):**
- grep لتأكيد: هل `asset.startYear` مربوط بالمحرك أم ميت؟
- لو ميت: حذفه من الـ drawer لتبسيط Phase & Timeline section.

**ما لا أقترحه بعد:**
- إضافة أعمدة Sale إلى الجدول — ازدحام بصري عالٍ، غير مبرّر قبل تقييم استخدامك الفعلي لـ Sale.

---

## 6. إجابة سؤالك الأصلي — للحفظ

> **"اذا مثلا ماعبيته هل يشتغل برنامج الاصول ولا انا بالخيار؟"**

### إجابة حرفية:
- **أنت بالخيار** لأصول Lease من قوالب Mall/Office/Residential، أو Operating من قوالب Hotel/Marina.
- **الـ drawer إجباري** لأصول Sale، وأصول Operating من أنواع أخرى، وأي أصل يحتاج basement/parking/override cost.

### المحرك:
- **لا ينكسر** لو تركت حقلاً فارغاً — يستخدم افتراضيات آمنة (0 للقيم النقدية، 3 للرمب، 100 للإشغال، إلخ).
- **لكن الأرقام قد تصبح غير منطقية:** لو GFA=40k و costPerSqm=3900 لكن leaseRate=0 → IRR سالب ضخم، رغم أن "الحساب صحيح".

### كيف تُدار حالياً:
- القوالب (Templates) هي خط الدفاع الأول — تملأ القيم الشائعة.
- زر P&L في الجدول هو خط الدفاع الثاني — لـ Hotel/Marina فقط.
- الـ drawer هو الحصن الأخير — يفتح كل شي، لكنه يسبب الإحساس بـ"المخربطة" لأن كثيراً من حقوله مكررة مع الجدول أو ميتة engine-wise.

---

## 7. ما أنتظر قرارك فيه

1. **P1 (إصلاح EBITDA في الجدول)** — أنفّذ الآن؟
2. **P2 (قالب Sale)** — مفيد لك؟ (تطويره + أسعار/إشغال سعودية افتراضية)
3. **P3 (تدقيق startYear/openingYear)** — أبدأ التحقيق؟
4. **مشكلة الحقول الميتة في Phase & Timeline** — أحذفها أم أتركها كتوثيق؟
5. **NLA / openArea** — نفس السؤال.

قل لي ماذا تريد، وأكمل. **لن أتحرك بدون إذن صريح.**
