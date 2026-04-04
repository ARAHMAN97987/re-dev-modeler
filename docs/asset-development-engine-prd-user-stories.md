# PRD Draft
## Asset Development Engine
### تحويل جدول الأصول إلى محرك تطوير عقاري متكامل

> هذا المستند يحول جدول الأصول من نموذج بسيط يعتمد على: مساحة الأرض + الفوت برنت + GFA + متوسط تكلفة البناء/م²، إلى نموذج تطوير عقاري متكامل يعكس منطق الأصل الحقيقي، بما يشمل: نوع الأصل، البرنامج الداخلي، المساحات، الكفاءة، المواقف، ظروف الموقع، البنية التحتية، التكاليف، المرحلية، والمخرجات اللازمة لاتخاذ القرار.

---

# 1) الملخص التنفيذي

الوضع الحالي يتعامل مع الأصل باعتباره كتلة مبنية ذات منطق موحد. هذا لم يعد كافيًا.

الاحتياج الصحيح هو أن يصبح كل أصل داخل المنصة **منتجًا عقاريًا Development Asset** له:
- نوع أصل مختلف
- منطق مساحة مختلف
- برنامج داخلي مختلف
- قاعدة مواقف مختلفة
- ظروف موقع مختلفة
- حزمة تكلفة مختلفة
- أثر مختلف على البنية التحتية
- ارتباط مختلف بالمرحلة

بالتالي، المطلوب ليس مجرد إضافة أعمدة جديدة إلى الجدول، بل **إعادة تعريف الأصل نفسه** داخل المنصة.

---

# 2) المشكلة الحالية

## 2.1 ما الذي يحدث اليوم
الأصل الحالي يُعرّف غالبًا عبر:
- Land Area
- Footprint
- GFA
- Average Construction Cost / sqm

## 2.2 لماذا هذا غير كافٍ
هذا النموذج يفترض ضمنيًا أن:
- جميع الأصول تُبنى بنفس المنطق
- جميع الأصول تعتمد على GFA
- جميع الأصول تقاس بنفس طريقة التأجير أو التشغيل
- جميع الأصول لها نفس احتياج المواقف
- جميع الأصول لها نفس أثر البنية التحتية
- جميع الأصول يمكن تسعيرها برقم واحد متوسط

وهذا غير صحيح.

## 2.3 القصور الناتج
ينتج عن ذلك:
- تضليل في تكلفة الأصل
- غياب أثر المواقف على المساحة والتكلفة
- غياب البنية التحتية كطبقة مستقلة
- خلط بين building cost وsite cost وinfra cost
- عدم القدرة على تمثيل أصول مثل marina أو sports land lease أو public realm
- ضعف القدرة على المقارنة بين السيناريوهات
- ضعف القدرة على دعم phased development

---

# 3) الهدف من المنتج

نريد أن تتحول المنصة من **Asset Table** إلى **Asset Development Engine**.

## الهدف الأساسي
تمكين المستخدم من تعريف الأصل كمنتج تطوير عقاري حقيقي، وليس مجرد مساحة وتكلفة.

## الأهداف الفرعية
1. تمثيل أنواع الأصول المختلفة بشكل صحيح
2. دعم البرنامج الداخلي للأصل
3. دعم المساحات المشتقة والكفاءة
4. دعم منطق المواقف
5. دعم ظروف الموقع والأعمال غير الطبيعية
6. دعم البنية التحتية المنفصلة
7. دعم حزمة تكلفة حقيقية
8. دعم المرحلة الزمنية والتبعيات
9. دعم المرجعيات والافتراضات
10. دعم المقارنة والمخرجات التنفيذية

---

# 4) مبادئ التصميم الحاكمة

## 4.1 لا يوجد أصل واحد يناسب الجميع
كل Asset Type يجب أن يفعّل منطقًا مختلفًا.

## 4.2 لا يجب إظهار جميع الحقول دائمًا
يجب استخدام **progressive disclosure**.

## 4.3 الأصل ليس دائمًا مبنى
بعض الأصول non-building assets.

## 4.4 البنية التحتية ليست جزءًا مخفيًا من تكلفة المبنى
يجب أن تكون طبقة مستقلة وقابلة للتوزيع.

## 4.5 بعض الحقول مدخلات، وبعضها مشتق، وبعضها يمكن أن يكون الاثنين
يجب توضيح ذلك داخل التجربة.

## 4.6 يجب دعم العمل المفاهيمي دون التحول إلى نموذج هندسي تفصيلي
المنصة تبقى أداة تطوير واستثمار، وليست بديلًا عن BIM أو BOQ تفصيلي.

## 4.7 يجب أن تخدم القرار
كل أصل يجب أن يساعد المستخدم على فهم:
- ماذا نبني
- كم سيكلف
- ماذا يحتاج
- متى يُنفذ
- هل هو مناسب للمرحلة

---

# 5) الشخصيات المستهدفة

## 5.1 مدير التطوير العقاري
يحتاج لفهم الأصل كمنتج وتقييم صلاحيته ومكانه في المرحلة.

## 5.2 المحلل الاستثماري
يحتاج لاشتقاق مساحات ومواقف وتكاليف ومخرجات قابلة للنمذجة.

## 5.3 مدير التصميم أو الهندسة
يحتاج لتمثيل البرنامج والقيود والتبعيات وقيود الموقع.

## 5.4 مدير المالية / فريق النمذجة
يحتاج لفصل التكلفة إلى طبقات منطقية وربطها بالمرحلة.

## 5.5 الإدارة العليا / مجلس الإدارة
تحتاج summary واضح على مستوى الأصل والمرحلة والمشروع.

## 5.6 فريق المنتج
يحتاج متطلبات واضحة لا تعتمد على تفاصيل الكود الحالي.

---

# 6) نطاق المنتج الجديد

## داخل النطاق
- تعريف نوع الأصل
- إنشاء الأصل من template
- دعم building وnon-building assets
- دعم طبقات المساحة
- دعم البرنامج الداخلي
- دعم mix types
- دعم الكفاءة
- دعم منطق المواقف
- دعم ظروف الموقع
- دعم الأعمال غير الطبيعية
- دعم البنية التحتية كطبقة مستقلة
- دعم cost stack
- دعم المرحلة والتبعيات
- دعم المخرجات
- دعم المقارنة
- دعم الحوكمة الأساسية

## خارج النطاق حاليًا
- BOQ تفصيلي
- shop drawings
- detailed engineering design
- structural detailing
- MEP design تفصيلي
- BIM authoring
- authority submission packages الكاملة

---

# 7) الهيكل المستهدف للأصل

كل أصل يجب أن يحتوي على الطبقات التالية:

1. **Basics**
2. **Geometry & Areas**
3. **Program**
4. **Efficiency**
5. **Parking & Mobility**
6. **Site Conditions & Abnormal Works**
7. **Infrastructure**
8. **Cost Stack**
9. **Phase & Dependencies**
10. **Outputs & Review**

---

# 8) الـ Epics والـ User Stories حسب المراحل

---

# Phase 1 — تأسيس محرك الأصل العقاري
## الهدف
تحويل الأصل من صف بسيط إلى أصل له نوع ومنطق مختلف حسب الاستعمال.

---

## US-001 | اختيار نوع الأصل
**الأولوية:** Must

**User Story**  
كمستخدم، أريد اختيار نوع الأصل من قائمة واضحة، حتى يتم تفعيل المنطق المناسب له بدل استخدام نفس الحقول لكل الأصول.

**المطلوب**
- Asset Type واضح
- Subtype عند الحاجة
- تغيير الحقول تلقائيًا حسب النوع

**الأنواع الأساسية**
- Retail Lifestyle
- Mall
- Office
- Residential Villas
- Residential Multifamily
- Serviced Apartments
- Hotel
- Resort
- Marina
- Yacht Club / Sailing Club
- Sports / Academy / Land Lease
- Parking Structure
- Public Realm
- Infrastructure Package
- Utility Asset

**ملاحظات UI/UX**
- عرض النوع كبطاقات أو قائمة واضحة
- وصف مختصر تحت كل نوع
- لا تظهر الحقول غير المناسبة قبل اختيار النوع

---

## US-002 | إنشاء الأصل من Template جاهز
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إنشاء أصل جديد من Template جاهز، حتى أبدأ بسرعة وبافتراضات منطقية بدل البناء من الصفر.

**المطلوب**
- Template لكل نوع أصل
- تحميل افتراضات ابتدائية
- إمكانية تعديل القيم بعد الإنشاء

**ملاحظات UI/UX**
- زر: Create from Template
- Preview بسيط لما سيضاف
- Badge يوضح أن الأصل مبني على Template

---

## US-003 | دعم الأصول غير المبنية
**الأولوية:** Must

**User Story**  
كمستخدم، أريد أن أتمكن من إنشاء أصل غير مبني، حتى أستطيع نمذجة أصول مثل land lease أو public realm أو utility package أو marina zone.

**المطلوب**
- دعم أصل بدون GFA
- دعم أصل مبني أو غير مبني
- السماح بأصول cost center أو activation element

**ملاحظات UI/UX**
- Toggle واضح:
  - Building Asset
  - Non-Building Asset
- عند اختيار Non-Building تختفي الحقول غير اللازمة

---

## US-004 | تعريف أساسيات الأصل
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إدخال الأساسيات الرئيسية للأصل، حتى أتمكن من تعريفه بشكل أولي من ناحية المساحة والمرحلة والموقع داخل المشروع.

**المطلوب**
- Asset Name
- Asset Type
- Subtype
- Phase
- Land Allocated Area
- Plot / Parcel Reference
- Notes

**ملاحظات UI/UX**
- هذه هي أول شاشة بعد إنشاء الأصل
- يجب أن تبقى مختصرة جدًا

---

## US-005 | تعريف هندسة الكتلة الأساسية
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إدخال عناصر الكتلة الأساسية مثل footprint وعدد الأدوار وGFA، حتى أستطيع وصف الشكل الأولي للأصل.

**المطلوب**
- Footprint
- Floors Above Ground
- Basement Levels
- GFA
- Coverage %
- FAR عند الحاجة

**ملاحظات UI/UX**
- الحقول الأساسية فقط
- أي قيمة مشتقة تظهر مباشرة أسفل الحقول

---

## US-006 | فصل أنواع المساحات
**الأولوية:** Must

**User Story**  
كمستخدم، أريد فصل أنواع المساحات داخل الأصل، حتى لا أخلط بين مساحة الأرض، ومساحة البناء، والمساحات القابلة للتأجير، والمواقف، والخدمات.

**المطلوب**
- Land Area
- Footprint
- GFA
- GLA / NLA / NSA / NUA بحسب الأصل
- Parking Area
- Open / External Area

**ملاحظات UI/UX**
- إظهار شرح مختصر للمصطلحات
- السماح بإخفاء المساحات غير المستخدمة حسب نوع الأصل

---

## US-007 | وضع الأصل ضمن مرحلة تطوير
**الأولوية:** Must

**User Story**  
كمستخدم، أريد ربط الأصل بمرحلة تطوير محددة، حتى أستطيع استخدامه في التخطيط المرحلي والتكلفة والتمويل.

**المطلوب**
- Phase assignment
- Start year
- Build duration
- Opening year
- Anchor / Quick Win / Optional

**ملاحظات UI/UX**
- Badge واضح على الأصل يوضح المرحلة
- Mini timeline بسيط

---

# Phase 2 — منطق البرنامج العقاري الحقيقي
## الهدف
ربط الأصل ببرنامجه الداخلي وكفاءته واستعماله الفعلي.

---

## US-008 | تعريف البرنامج الداخلي للأصل
**الأولوية:** Must

**User Story**  
كمستخدم، أريد تعريف البرنامج الداخلي للأصل، حتى لا يكون الأصل مجرد رقم مساحي واحد.

**المطلوب**
بحسب النوع:
- Retail mix
- Hotel key mix
- Residential unit mix
- Marina berth mix
- Amenities / support components

**ملاحظات UI/UX**
- Mix builder بسيط
- إمكانية الإدخال بالنسبة أو المساحة أو العدد
- إظهار مجموع المكونات دائمًا

---

## US-009 | دعم مزيج الوحدات
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إدخال unit mix أو key mix أو berth mix، حتى يكون الأصل أقرب إلى منطق التطوير الفعلي.

**المطلوب**
- Unit type
- Count
- Average size
- % of mix
- Optional rent/ADR per subtype لاحقًا

**ملاحظات UI/UX**
- جدول قابل للتكرار
- تنبيه إذا كان المجموع ناقصًا أو زائدًا

---

## US-010 | تعريف الكفاءة
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إدخال أو اعتماد نسبة الكفاءة، حتى تشتق المنصة المساحات الصافية أو القابلة للتأجير تلقائيًا.

**المطلوب**
- Efficiency %
- Derived net area
- إمكانية اعتماد benchmark default
- إمكانية override

**ملاحظات UI/UX**
- إظهار benchmark suggested value
- زر Apply Benchmark
- إظهار net area مباشرة

---

## US-011 | دعم أنواع مختلفة من قواعد احتساب المساحة
**الأولوية:** Should

**User Story**  
كمستخدم، أريد أن يكون أساس الأصل مختلفًا حسب النوع، حتى لا أفترض أن كل الأصول تعتمد على GFA فقط.

**المطلوب**
- Basis by area
- Basis by unit
- Basis by key
- Basis by berth
- Basis by lease land
- Hybrid basis

**ملاحظات UI/UX**
- اختيار basis في أعلى قسم البرنامج
- بقية الحقول تتغير تبعًا له

---

## US-012 | دعم مكونات الدعم الداخلي للأصل
**الأولوية:** Should

**User Story**  
كمستخدم، أريد تعريف مكونات الدعم الداخلي للأصل مثل BOH وFOH والخدمات، حتى تكون التكاليف والمساحات أكثر دقة.

**المطلوب**
بحسب النوع:
- FOH
- BOH
- F&B
- Wellness
- MICE
- Admin / service areas
- Utility rooms

**ملاحظات UI/UX**
- لا تظهر إلا للأصول المناسبة
- إمكانية إدخالها كنسبة أو مساحة مباشرة

---

# Phase 3 — المواقف، ظروف الموقع، البنية التحتية، وحزمة التكلفة
## الهدف
إدخال أهم ما يجعل الأصل واقعيًا ماليًا وتطويريًا.

---

## US-013 | تعريف قاعدة احتساب المواقف
**الأولوية:** Must

**User Story**  
كمستخدم، أريد تحديد قاعدة احتساب المواقف، حتى يتم حساب عدد المواقف المطلوبة بطريقة صحيحة لكل أصل.

**المطلوب**
- Parking basis:
  - per GLA
  - per unit
  - per key
  - per berth
  - manual
- Parking ratio
- Required bays

**ملاحظات UI/UX**
- حقل rule basis واضح
- Required bays يظهر فورًا

---

## US-014 | اختيار نوع حل المواقف
**الأولوية:** Must

**User Story**  
كمستخدم، أريد اختيار نوع حل المواقف، حتى أعرف أثره على المساحة والتكلفة.

**المطلوب**
- Surface
- Podium
- Basement
- Parking structure
- Shared
- Offsite

**ملاحظات UI/UX**
- عرض impact على:
  - المساحة
  - التكلفة
  - الجدوى
- warning إذا كان الخيار غير مناسب

---

## US-015 | تعريف ظروف الموقع
**الأولوية:** Must

**User Story**  
كمستخدم، أريد ربط الأصل بظروف الموقع، حتى تنعكس تحديات الأرض أو البحر أو التربة على الأصل.

**المطلوب**
- Site condition
- Soft soil
- Waterlogged
- Coastal
- Shallow water
- Drainage challenge
- Access limitation
- Basement allowed / discouraged

**ملاحظات UI/UX**
- Section مستقل بعنوان Site Conditions
- استخدام toggles وبطاقات بسيطة

---

## US-016 | تعريف الأعمال غير الطبيعية
**الأولوية:** Must

**User Story**  
كمستخدم، أريد تحديد الأعمال غير الطبيعية الناتجة عن الموقع، حتى لا تضيع هذه التكاليف داخل متوسط البناء العام.

**المطلوب**
- Dewatering
- Ground improvement
- Dredging
- Marine edge works
- Drainage upgrades
- Enabling works
- Flood mitigation
- Environmental mitigation

**ملاحظات UI/UX**
- كل بند له:
  - on/off
  - cost basis
  - note
- دعم quantity-based أو lump sum

---

## US-017 | تعريف البنية التحتية العامة للمشروع
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إدخال تكلفة البنية التحتية العامة للمشروع بشكل مستقل، حتى لا تختلط مع تكلفة المباني.

**المطلوب**
- Roads
- Power backbone
- Water network
- Sewer
- Stormwater
- Telecom
- Irrigation
- Fire network
- District cooling
- Grading / site prep
- Marine infrastructure
- Public realm backbone

**ملاحظات UI/UX**
- قسم مستقل بالكامل باسم Infrastructure Packages
- لا يتم دفنها داخل building cost

---

## US-018 | تعريف البنية التحتية المرتبطة بمرحلة أو أصل
**الأولوية:** Must

**User Story**  
كمستخدم، أريد أن أربط بعض عناصر البنية التحتية بمرحلة أو أصل معين، حتى أعرف ما هو مشترك وما هو مباشر.

**المطلوب**
- Project-level infra
- Phase-level infra
- Asset-linked infra
- Direct vs shared tagging

**ملاحظات UI/UX**
- Tag واضح على كل package
- إظهار مرجعية الربط

---

## US-019 | توزيع تكلفة البنية التحتية
**الأولوية:** Must

**User Story**  
كمستخدم، أريد توزيع تكلفة البنية التحتية على الأصول أو المراحل بطريقة واضحة، حتى أعرف التكلفة الفعلية لكل أصل.

**المطلوب**
طرق توزيع مثل:
- by land area
- by GFA
- by phase
- by asset type
- manual allocation

**ملاحظات UI/UX**
- Allocation panel مستقل
- إظهار:
  - allocated
  - unallocated
  - total

---

## US-020 | بناء Cost Stack حقيقي للأصل
**الأولوية:** Must

**User Story**  
كمستخدم، أريد رؤية تكلفة الأصل ضمن Cost Stack واضح، حتى لا أعتمد على رقم متوسط واحد مضلل.

**المطلوب**
- Base building cost
- Fit-out
- FF&E
- Parking cost
- External works
- Infrastructure share
- Abnormal/site cost
- Soft cost
- Contingency
- Escalation

**ملاحظات UI/UX**
- sections مرتبة
- subtotal لكل section
- total ثابت في الأعلى أو الأسفل

---

## US-021 | دعم أكثر من أساس للتكلفة
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إدخال التكلفة بأكثر من basis، حتى أستخدم المنطق المناسب لكل أصل.

**المطلوب**
- Cost / sqm
- Cost / key
- Cost / unit
- Cost / berth
- Lump sum
- Hybrid

**ملاحظات UI/UX**
- dropdown لتحديد basis
- الحقول تتبدل تلقائيًا حسب الاختيار

---

## US-022 | فصل Hard Cost وSoft Cost
**الأولوية:** Should

**User Story**  
كمستخدم، أريد الفصل بين hard cost وsoft cost، حتى يكون التحليل أوضح وأقرب لطريقة عمل التطوير الحقيقي.

**المطلوب**
- Hard cost
- Soft cost
- Pre-development cost
- Studies and permits
- Design/consultants
- Pre-opening where relevant

**ملاحظات UI/UX**
- group واضح
- summary by category

---

# Phase 4 — النتائج، المقارنات، المرجعيات، والحوكمة
## الهدف
تحويل الأداة من إدخال فقط إلى أداة قرار.

---

## US-023 | إظهار مخرجات الأصل تلقائيًا
**الأولوية:** Must

**User Story**  
كمستخدم، أريد أن أرى مخرجات الأصل الأساسية تلقائيًا، حتى أقيّمه بسرعة دون الرجوع لكل التفاصيل.

**المطلوب**
- Net area
- Required parking
- Parking area
- Total development cost
- Cost / sqm
- Cost / key
- Cost / unit
- Cost / berth
- Infrastructure share
- Abnormal cost share

**ملاحظات UI/UX**
- summary card أعلى الأصل
- أهم 6 إلى 8 أرقام فقط

---

## US-024 | إظهار مخرجات المرحلة
**الأولوية:** Must

**User Story**  
كمستخدم، أريد رؤية مخرجات مجمعة على مستوى المرحلة، حتى أستخدمها في التخطيط والميزانية والتمويل.

**المطلوب**
- total GFA by phase
- total net area by phase
- total parking by phase
- total infra by phase
- total CAPEX by phase
- anchor assets in phase

**ملاحظات UI/UX**
- phase dashboard
- filters حسب phase/type

---

## US-025 | إظهار مخرجات المشروع بالكامل
**الأولوية:** Must

**User Story**  
كمستخدم إداري أو استثماري، أريد dashboard على مستوى المشروع، حتى أفهم توزيع المساحات والتكلفة والتطوير بشكل سريع.

**المطلوب**
- area mix
- CAPEX mix
- infra vs building cost
- total parking
- phase summary
- cost center breakdown
- public realm and marine exposure

**ملاحظات UI/UX**
- visual summary خفيف
- لا يكون مزدحمًا

---

## US-026 | اعتماد Benchmark Defaults
**الأولوية:** Should

**User Story**  
كمستخدم، أريد الاستفادة من benchmark defaults حسب نوع الأصل، حتى أسرع النمذجة الأولية.

**المطلوب**
- efficiency defaults
- parking defaults
- room/unit size defaults
- mix defaults
- cost defaults
- abnormal flags by site type

**ملاحظات UI/UX**
- Apply Benchmark
- Show Source / Default label
- إمكانية التعديل بعد التطبيق

---

## US-027 | تمييز القيم الافتراضية عن المعدلة
**الأولوية:** Should

**User Story**  
كمستخدم، أريد معرفة ما هو default وما هو user override وما هو مشتق، حتى أراجع النموذج بسهولة.

**المطلوب**
- Default label
- Edited label
- Derived label

**ملاحظات UI/UX**
- ألوان أو badges بسيطة
- بدون ازدحام بصري

---

## US-028 | توثيق الافتراضات والملاحظات
**الأولوية:** Must

**User Story**  
كمستخدم، أريد إضافة افتراضات وملاحظات لكل أصل، حتى لا تضيع خلفية القرار.

**المطلوب**
- assumptions notes
- rationale
- cost note
- market note
- engineering note

**ملاحظات UI/UX**
- Notes drawer أو panel
- indicator إذا يوجد notes

---

## US-029 | مقارنة سيناريوهات للأصل
**الأولوية:** Should

**User Story**  
كمستخدم، أريد مقارنة أكثر من سيناريو لنفس الأصل، حتى أقرر بين بدائل التصميم والتكلفة.

**المطلوب**
أمثلة:
- basement vs no basement
- hotel only vs hotel + serviced apartments
- mall vs lifestyle retail
- marina light vs marina heavy

**ملاحظات UI/UX**
- duplicate scenario
- compare side by side
- show differences only

---

## US-030 | مقارنة سيناريوهات على مستوى المرحلة أو المشروع
**الأولوية:** Should

**User Story**  
كمستخدم، أريد مقارنة سيناريوهات على مستوى المرحلة أو المشروع، حتى أفهم أثر القرارات الكبرى.

**المطلوب**
- compare totals
- compare CAPEX
- compare infra burden
- compare parking demand

**ملاحظات UI/UX**
- scenario selector
- delta view

---

## US-031 | تتبع حالة الأصل
**الأولوية:** Must

**User Story**  
كمستخدم إداري، أريد معرفة حالة كل أصل، حتى أميز بين الأصل الأولي والمراجع والمعتمد.

**المطلوب**
- Draft
- Under Review
- Benchmarked
- Approved for Modeling
- Approved for Board Pack

**ملاحظات UI/UX**
- status badge واضح
- filter by status

---

## US-032 | استخراج ملخص أصل قابل للمراجعة
**الأولوية:** Should

**User Story**  
كمستخدم، أريد استخراج ملخص منظم للأصل، حتى أراجعه أو أشاركه داخليًا مع الفريق.

**المطلوب**
- basic identity
- phase
- program summary
- area summary
- parking summary
- cost summary
- infrastructure share
- notes

**ملاحظات UI/UX**
- printable clean view
- summary mode

---

# Phase 5 — التحسينات المتقدمة
## الهدف
رفع جودة الاستخدام ومنع الأخطاء وتحسين تجربة القرار.

---

## US-033 | إظهار الحقول بالتدرج
**الأولوية:** Must

**User Story**  
كمستخدم، أريد أن تظهر الحقول بالتدرج وليس كلها دفعة واحدة، حتى تبقى التجربة واضحة وسهلة.

**المطلوب**
- Basic mode
- Advanced mode
- Progressive disclosure
- إظهار الحقول المناسبة فقط

**ملاحظات UI/UX**
- هذا مهم جدًا
- لا يجب أن يرى المستخدم marina fields داخل office asset

---

## US-034 | تنبيهات ذكية عند التعارضات
**الأولوية:** Must

**User Story**  
كمستخدم، أريد تنبيهات ذكية عند وجود تعارض أو نقص جوهري في البيانات، حتى لا أبني أصلًا غير منطقي.

**المطلوب**
تنبيهات مثل:
- Hotel بدون keys
- Parking rule missing
- Infra غير موزعة
- Net area أكبر من GFA
- أصل غير مبني لكن فيه fields متعارضة
- Basements مع site conditions غير ملائمة

**ملاحظات UI/UX**
- warning banners قصيرة
- no blocking إلا للحالات الحرجة

---

## US-035 | شرح المصطلحات داخل الواجهة
**الأولوية:** Should

**User Story**  
كمستخدم، أريد شرحًا مختصرًا للمصطلحات، حتى أفهم المقصود دون الرجوع لوثائق خارجية.

**المطلوب**
- GFA
- GLA
- NLA
- NSA
- NUA
- Efficiency
- FOH / BOH
- FF&E
- Abnormal cost
- Shared infrastructure
- Public realm
- Enabling works

**ملاحظات UI/UX**
- tooltips قصيرة
- examples حسب نوع الأصل

---

## US-036 | دعم الاعتماديات بين الأصول والمراحل
**الأولوية:** Should

**User Story**  
كمستخدم، أريد ربط الأصل باعتمادياته، حتى أعرف هل يمكن تنفيذه منفردًا أم يحتاج عناصر قبله.

**المطلوب**
- infra dependency
- access dependency
- anchor dependency
- parking dependency
- public realm dependency

**ملاحظات UI/UX**
- dependency chips
- warning إذا الأصل غير قابل للتنفيذ وحده

---

## US-037 | دعم الأصول المشتركة أو الخدمية
**الأولوية:** Should

**User Story**  
كمستخدم، أريد إنشاء أصول مشتركة أو خدمية لا تهدف للإيراد المباشر، حتى أستطيع تمثيلها بشكل صحيح داخل المشروع.

**المطلوب**
- public realm assets
- shared parking assets
- utility buildings
- promenade/shading/cooling elements
- enabling packages

**ملاحظات UI/UX**
- تصنيفها بوضوح كـ non-revenue أو shared asset

---

## US-038 | تلخيص تكلفة المشروع بطريقة تنفيذية
**الأولوية:** Should

**User Story**  
كمستخدم إداري، أريد تلخيص التكلفة بطريقة تنفيذية، حتى أفهم أين تذهب الأموال فعليًا.

**المطلوب**
- Buildings
- Infrastructure
- Public realm
- Marine
- Parking
- Abnormal
- Soft cost
- Shared vs direct

**ملاحظات UI/UX**
- executive summary view
- أولوية للأرقام وليس الرسومات

---

# 9) التقسيم التنفيذي حسب المراحل

## Phase 1 — Must Go Live First
- US-001 إلى US-007

## Phase 2 — Core Development Logic
- US-008 إلى US-012

## Phase 3 — Cost / Parking / Site / Infra
- US-013 إلى US-022

## Phase 4 — Outputs / Compare / Governance
- US-023 إلى US-032

## Phase 5 — Advanced UX & Control
- US-033 إلى US-038

---

# 10) الترتيب الأكثر واقعية للتنفيذ

## Wave 1
- نوع الأصل
- template
- الأساسيات
- المساحات
- المرحلة

## Wave 2
- البرنامج
- mix
- الكفاءة
- المواقف

## Wave 3
- site conditions
- abnormal works
- infrastructure packages
- allocation
- cost stack

## Wave 4
- outputs
- phase/project dashboard
- notes
- status

## Wave 5
- benchmark defaults
- compare scenarios
- dependencies
- smart warnings
- executive summaries

---

# 11) المتطلبات الخاصة بالبنية التحتية

هذه نقطة مستقلة وحاسمة.

## يجب أن تدعم المنصة نوعين من البنية التحتية

### أ) بنية تحتية عامة للمشروع
- الطرق الرئيسية
- المداخل
- شبكات الكهرباء
- شبكات المياه
- الصرف
- تصريف الأمطار
- الاتصالات
- التبريد المركزي إن وجد
- الأعمال البحرية العامة
- الخدمات التأسيسية
- شبكات الري
- البنية التحتية للمجال العام

### ب) بنية تحتية مرتبطة بأصل أو مرحلة
- ربط أصل معين بالشبكات
- access works
- utility extension
- marina servicing
- hotel utility upgrade
- special drainage
- public realm around anchor asset

## ويجب أن تدعم المنصة 4 طرق للتعامل معها
1. Project-level cost only  
2. Phase-level cost only  
3. Asset-allocated shared cost  
4. Direct asset cost  

---

# 12) التوجيهات العامة للـ UI/UX

- الأصل يجب أن يفتح كـ side panel أو detail drawer منظم
- العرض الأساسي يجب أن يبقى مختصرًا
- التفاصيل تظهر على شكل sections
- لا يجب أن يرى المستخدم كل الحقول من البداية
- يجب أن يكون هناك summary دائم في الأعلى:
  - نوع الأصل
  - المرحلة
  - المساحات الأساسية
  - المواقف
  - التكلفة الكلية
- يجب أن يكون هناك شعور واضح بالفرق بين:
  - building cost
  - infrastructure cost
  - abnormal cost
  - shared cost
- المقارنة بين السيناريوهات يجب أن تكون سهلة جدًا
- التعديلات اليدوية يجب أن تكون ظاهرة وليست مخفية

---

# 13) Acceptance Direction

هذا القسم ليس technical acceptance criteria، لكنه يوضح اتجاه القبول المطلوب.

## يُعتبر التغيير ناجحًا إذا:
1. أصبح المستخدم قادرًا على إنشاء أصول مختلفة بمنطق مختلف
2. لم يعد GFA هو الأساس الوحيد لكل أصل
3. أصبح من الممكن تعريف non-building assets
4. أصبحت المواقف جزءًا من منطق الأصل وليس رقمًا خارجيًا
5. أصبحت البنية التحتية مستقلة وواضحة وقابلة للتوزيع
6. أصبحت التكاليف مقسمة إلى طبقات مفهومة
7. أصبح الأصل مرتبطًا بمرحلة وتبعيات واضحة
8. أصبحت المخرجات التنفيذية متاحة على مستوى الأصل والمرحلة والمشروع
9. أصبحت المقارنة بين السيناريوهات ممكنة
10. بقيت التجربة سهلة وموجهة وغير مزدحمة

---

# 14) Out of Scope في هذه المرحلة

حتى لا يتم توسيع النطاق بشكل غير منضبط:
- Detailed QS line items
- BOQ detailed breakdown
- IFC packages
- Full BIM workflows
- Detailed authority submission workflows
- Contractor execution tracking
- Live site construction progress tools

---

# 15) الخلاصة النهائية

المطلوب ليس توسيع جدول الأصول فقط.

المطلوب هو إنشاء **Asset Development Engine** داخل المنصة، بحيث يصبح الأصل:
- أصلًا معرفًا بالنوع
- مرتبطًا ببرنامج ومساحات وكفاءة
- له منطق مواقف واضح
- مرتبطًا بظروف الموقع
- متأثرًا بالبنية التحتية
- له cost stack حقيقي
- مربوطًا بالمرحلة والزمن
- قابلًا للمقارنة والمراجعة واتخاذ القرار

وأهم نقطة حاكمة في هذا المستند:

**تكلفة البنية التحتية يجب أن تكون طبقة مستقلة، واضحة، قابلة للتوزيع، وغير مدفونة داخل تكلفة البناء.**

---

# 16) مصادر مرجعية بنيوية لهذا التصور

- الدراسة الفنية للموقع المرفق: توضح أن القرار التطويري لا يعتمد فقط على المساحة، بل على التوزيع، نسب التغطية، عدد الأدوار، المواقف، القبو، الخدمات، والبدائل.  
- دراسة HBU لجازان: توضح اختلاف منطق الأصول بين retail, mall, office, hotel, resort, marina, residential، واختلاف أسس المساحات والكفاءة والمواقف.  
- ملفات الموقع والمخطط العام لجازان: تؤكد أثر الظروف الساحلية، المياه الضحلة، الأراضي المغمورة، وأهمية الأعمال البحرية والعامة والـ public realm.  

