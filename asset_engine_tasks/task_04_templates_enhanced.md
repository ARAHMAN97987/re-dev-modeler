# TASK 4: Enhanced Template System + Non-Building Templates

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

## القواعد الصارمة
- لا تطلب إذن المستخدم — autonomous 100%
- لا تعدل ملفات tests/
- لا تعدل منطق المحرك المالي في src/engine/
- لو فشل أي test ← revert فوراً ← حل بديل
- Brand = "Haseef" أو "حصيف" فقط
- كل التغييرات ADDITIVE فقط

---

## الهدف
توسيع نظام Templates الحالي لدعم كل أنواع الأصول الجديدة مع قيم ابتدائية واقعية للسوق السعودي. يغطي US-002 من PRD.

## الاعتمادية
تعتمد على Task 1 (schema) + Task 2 (asset types).

---

## السايكل الكامل

### 1. الفهم (Understand)

```bash
# اقرأ Templates الحالية
grep -n "hotel5\|hotel4\|mall\|office\|resi\|marina\|custom\|tmpls\|template" src/App.jsx | head -30

# اقرأ الكود الكامل للـ templates (حوالي سطر 5025-5060)
sed -n '5020,5070p' src/App.jsx

# ابحث عن كيف يتم إضافة أصل من template
grep -n "addAsset\|fromTemplate\|applyTemplate" src/App.jsx | head -10

# تأكد من التغييرات السابقة
grep -n "assetType\|ASSET_TYPES" src/data/assetTypes.js | head -5

# Tests
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 2. الخطة (Plan)

**التوسيع:**

أنشئ ملف بيانات: `src/data/assetTemplates.js` يحتوي على template لكل asset type.

كل template يحتوي على:
- الحقول الأساسية (name prefix, category, revType)
- الحقول الجديدة (assetType, isBuilding, areaBasis)
- قيم افتراضية واقعية للسوق السعودي
- وصف مختصر (EN + AR)

**القيم مأخوذة من:**
- Templates الحالية (hotel 5-star, hotel 4-star, mall, office, residential, marina)
- أرقام سوق سعودي معقولة للأنواع الجديدة

### 3. التنفيذ (Execute)

**خطوة 3.1: إنشاء src/data/assetTemplates.js**

```javascript
// Asset Development Engine - Template Definitions
// Realistic defaults for Saudi Arabian real estate development

export const ASSET_TEMPLATES = [
  // === COMMERCIAL ===
  {
    id: "retail_lifestyle",
    assetType: "retail_lifestyle",
    label: "Retail Lifestyle",
    labelAr: "تجزئة لايف ستايل",
    description: "Open-air lifestyle retail center",
    descAr: "مركز تجزئة مفتوح",
    isBuilding: true,
    category: "Retail",
    revType: "Lease",
    gfa: 25000,
    efficiency: 75,
    leaseRate: 1800,
    costPerSqm: 3200,
    constrDuration: 18,
    rampUpYears: 3,
    stabilizedOcc: 90,
    escalation: 0.75,
    floorsAboveGround: 2,
    basementLevels: 0,
    areaBasis: "gfa",
  },
  {
    id: "mall",
    assetType: "mall",
    label: "Mall",
    labelAr: "مول تجاري",
    description: "Enclosed shopping mall",
    descAr: "مول تجاري مغلق",
    isBuilding: true,
    category: "Retail",
    revType: "Lease",
    gfa: 40000,
    efficiency: 70,
    leaseRate: 2100,
    costPerSqm: 3900,
    constrDuration: 24,
    rampUpYears: 3,
    stabilizedOcc: 85,
    escalation: 0.75,
    floorsAboveGround: 3,
    basementLevels: 1,
    areaBasis: "gfa",
  },
  {
    id: "office",
    assetType: "office",
    label: "Office Tower",
    labelAr: "برج مكاتب",
    description: "Grade A office building",
    descAr: "مبنى مكاتب درجة أولى",
    isBuilding: true,
    category: "Office",
    revType: "Lease",
    gfa: 16000,
    efficiency: 80,
    leaseRate: 900,
    costPerSqm: 2600,
    constrDuration: 20,
    rampUpYears: 3,
    stabilizedOcc: 85,
    escalation: 0.5,
    floorsAboveGround: 8,
    basementLevels: 2,
    areaBasis: "gfa",
  },

  // === RESIDENTIAL ===
  {
    id: "residential_villas",
    assetType: "residential_villas",
    label: "Residential Villas",
    labelAr: "فلل سكنية",
    description: "Luxury villa compound",
    descAr: "مجمع فلل فاخرة",
    isBuilding: true,
    category: "Residential",
    revType: "Sale",
    gfa: 12000,
    efficiency: 90,
    costPerSqm: 3500,
    constrDuration: 18,
    rampUpYears: 2,
    stabilizedOcc: 100,
    escalation: 0,
    floorsAboveGround: 2,
    basementLevels: 0,
    areaBasis: "unit",
  },
  {
    id: "residential_multifamily",
    assetType: "residential_multifamily",
    label: "Residential Tower",
    labelAr: "برج سكني",
    description: "Multi-family residential tower",
    descAr: "برج سكني متعدد الوحدات",
    isBuilding: true,
    category: "Residential",
    revType: "Lease",
    gfa: 14000,
    efficiency: 82,
    leaseRate: 800,
    costPerSqm: 2800,
    constrDuration: 24,
    rampUpYears: 2,
    stabilizedOcc: 90,
    escalation: 0.5,
    floorsAboveGround: 12,
    basementLevels: 2,
    areaBasis: "unit",
  },

  // === HOSPITALITY ===
  {
    id: "hotel5",
    assetType: "hotel",
    assetSubtype: "5-star",
    label: "Hotel 5-Star",
    labelAr: "فندق 5 نجوم",
    description: "Luxury 5-star hotel, 200 keys",
    descAr: "فندق فاخر 5 نجوم، 200 غرفة",
    isBuilding: true,
    category: "Hospitality",
    revType: "Operating",
    gfa: 28000,
    efficiency: 65,
    costPerSqm: 12000,
    opEbitda: 47630685,
    constrDuration: 30,
    rampUpYears: 3,
    stabilizedOcc: 70,
    escalation: 0.75,
    floorsAboveGround: 8,
    basementLevels: 2,
    areaBasis: "key",
    // هيكل hotelPL يجب أن يطابق defaultHotelPL() في src/data/defaults.js
    hotelPL: { keys: 200, adr: 920, stabOcc: 70, daysYear: 365, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 },
  },
  {
    id: "hotel4",
    assetType: "hotel",
    assetSubtype: "4-star",
    label: "Hotel 4-Star",
    labelAr: "فندق 4 نجوم",
    description: "Upper midscale hotel, 230 keys",
    descAr: "فندق متوسط راقي، 230 غرفة",
    isBuilding: true,
    category: "Hospitality",
    revType: "Operating",
    gfa: 20000,
    efficiency: 68,
    costPerSqm: 8000,
    opEbitda: 13901057,
    constrDuration: 24,
    rampUpYears: 3,
    stabilizedOcc: 72,
    escalation: 0.75,
    floorsAboveGround: 6,
    basementLevels: 1,
    areaBasis: "key",
    hotelPL: { keys: 230, adr: 548, stabOcc: 72, daysYear: 365, roomsPct: 72, fbPct: 22, micePct: 4, otherPct: 2, roomExpPct: 20, fbExpPct: 60, miceExpPct: 58, otherExpPct: 50, undistPct: 29, fixedPct: 9 },
  },
  {
    id: "resort",
    assetType: "resort",
    label: "Resort",
    labelAr: "منتجع",
    description: "Beach or nature resort, 150 keys",
    descAr: "منتجع شاطئي أو طبيعي، 150 غرفة",
    isBuilding: true,
    category: "Hospitality",
    revType: "Operating",
    gfa: 35000,
    efficiency: 55,
    costPerSqm: 14000,
    opEbitda: 38000000,
    constrDuration: 36,
    rampUpYears: 3,
    stabilizedOcc: 65,
    escalation: 0.75,
    floorsAboveGround: 4,
    basementLevels: 0,
    areaBasis: "key",
    hotelPL: { keys: 150, adr: 1200, stabOcc: 65, daysYear: 365, roomsPct: 68, fbPct: 24, micePct: 5, otherPct: 3, roomExpPct: 22, fbExpPct: 62, miceExpPct: 58, otherExpPct: 50, undistPct: 31, fixedPct: 10 },
  },
  {
    id: "serviced_apartments",
    assetType: "serviced_apartments",
    label: "Serviced Apartments",
    labelAr: "شقق مخدومة",
    description: "Branded serviced apartments, 120 units",
    descAr: "شقق مخدومة بعلامة تجارية، 120 وحدة",
    isBuilding: true,
    category: "Hospitality",
    revType: "Operating",
    gfa: 15000,
    efficiency: 75,
    costPerSqm: 6500,
    opEbitda: 8500000,
    constrDuration: 20,
    rampUpYears: 2,
    stabilizedOcc: 80,
    escalation: 0.5,
    floorsAboveGround: 10,
    basementLevels: 1,
    areaBasis: "unit",
  },

  // === MARINE ===
  {
    id: "marina",
    assetType: "marina",
    label: "Marina",
    labelAr: "مرسى",
    description: "Marina with 80 berths",
    descAr: "مرسى يخوت 80 رصيف",
    isBuilding: true,
    category: "Marina",
    revType: "Operating",
    gfa: 4000,
    efficiency: 100,
    costPerSqm: 16000,
    opEbitda: 1129331,
    constrDuration: 24,
    rampUpYears: 3,
    stabilizedOcc: 75,
    escalation: 0.75,
    floorsAboveGround: 1,
    basementLevels: 0,
    areaBasis: "berth",
    // هيكل marinaPL يجب أن يطابق defaultMarinaPL() في src/data/defaults.js
    marinaPL: { berths: 80, avgLength: 14, unitPrice: 2063, stabOcc: 90, fuelPct: 25, otherRevPct: 10, berthingOpexPct: 58, fuelOpexPct: 96, otherOpexPct: 30 },
  },
  {
    id: "yacht_club",
    assetType: "yacht_club",
    label: "Yacht Club",
    labelAr: "نادي يخوت",
    description: "Yacht club with F&B and events",
    descAr: "نادي يخوت مع مطاعم وفعاليات",
    isBuilding: true,
    category: "Marina",
    revType: "Operating",
    gfa: 3000,
    efficiency: 70,
    costPerSqm: 8000,
    opEbitda: 2500000,
    constrDuration: 18,
    rampUpYears: 2,
    stabilizedOcc: 80,
    escalation: 0.5,
    floorsAboveGround: 2,
    basementLevels: 0,
    areaBasis: "gfa",
  },

  // === NON-BUILDING ===
  {
    id: "sports_land_lease",
    assetType: "sports_land_lease",
    label: "Sports / Land Lease",
    labelAr: "رياضي / تأجير أرض",
    description: "Sports facility or land lease plot",
    descAr: "منشأة رياضية أو قطعة أرض للتأجير",
    isBuilding: false,
    category: "Other",
    revType: "Lease",
    gfa: 0,
    plotArea: 15000,
    leaseRate: 200,
    costPerSqm: 500,
    constrDuration: 12,
    rampUpYears: 1,
    stabilizedOcc: 100,
    escalation: 0.5,
    areaBasis: "land",
  },
  {
    id: "parking_structure",
    assetType: "parking_structure",
    label: "Parking Structure",
    labelAr: "مبنى مواقف",
    description: "Multi-story parking, 500 bays",
    descAr: "مبنى مواقف متعدد الأدوار، 500 موقف",
    isBuilding: true,
    category: "Other",
    revType: "Operating",
    gfa: 15000,
    efficiency: 95,
    costPerSqm: 2200,
    opEbitda: 1800000,
    constrDuration: 14,
    rampUpYears: 1,
    stabilizedOcc: 85,
    escalation: 0.25,
    floorsAboveGround: 4,
    basementLevels: 0,
    areaBasis: "gfa",
  },
  {
    id: "public_realm",
    assetType: "public_realm",
    label: "Public Realm",
    labelAr: "مجال عام",
    description: "Promenade, plaza, landscaping",
    descAr: "ممشى، ساحة، تنسيق حدائق",
    isBuilding: false,
    category: "Other",
    revType: "Lease",
    gfa: 0,
    plotArea: 20000,
    leaseRate: 0,
    costPerSqm: 800,
    opEbitda: 0,
    constrDuration: 12,
    rampUpYears: 0,
    stabilizedOcc: 0,
    escalation: 0,
    areaBasis: "land",
  },
  {
    id: "infrastructure_package",
    assetType: "infrastructure_package",
    label: "Infrastructure Package",
    labelAr: "حزمة بنية تحتية",
    description: "Roads, utilities, networks",
    descAr: "طرق، شبكات مرافق",
    isBuilding: false,
    category: "Other",
    revType: "Lease",
    gfa: 0,
    plotArea: 0,
    leaseRate: 0,
    costPerSqm: 0,
    opEbitda: 0,
    constrDuration: 18,
    rampUpYears: 0,
    stabilizedOcc: 0,
    escalation: 0,
    areaBasis: "land",
  },
  {
    id: "utility_asset",
    assetType: "utility_asset",
    label: "Utility Asset",
    labelAr: "أصل خدمي",
    description: "STP, substation, district cooling",
    descAr: "محطة معالجة، محطة كهرباء، تبريد مركزي",
    isBuilding: true,
    category: "Other",
    revType: "Operating",
    gfa: 2000,
    efficiency: 100,
    costPerSqm: 4000,
    opEbitda: 500000,
    constrDuration: 12,
    rampUpYears: 1,
    stabilizedOcc: 100,
    escalation: 0.25,
    floorsAboveGround: 1,
    basementLevels: 0,
    areaBasis: "gfa",
  },
  // === CUSTOM ===
  {
    id: "custom",
    assetType: "",
    label: "Custom",
    labelAr: "مخصص",
    description: "Start from scratch",
    descAr: "ابدأ من الصفر",
    isBuilding: true,
    category: "Retail",
    revType: "Lease",
    gfa: 0,
    costPerSqm: 0,
    leaseRate: 0,
    opEbitda: 0,
    constrDuration: 12,
    areaBasis: "gfa",
  },
];
```

```bash
npm run build
```

**خطوة 3.2: تحديث AssetTable لاستخدام ASSET_TEMPLATES**

**مهم جداً:** في AssetTable يوجد مصفوفة templates قديمة (inline) حوالي سطر 5025-5060. ابحث عنها:
```bash
grep -n "hotel5\|hotel4\|tmpls\|const templates\|const TEMPLATES" src/App.jsx src/components/views/AssetTable.jsx 2>/dev/null
```
**يجب استبدالها** بالـ import من الملف الجديد. لا تترك نسختين.

في AssetTable، استبدل مصفوفة templates القديمة بـ ASSET_TEMPLATES:

```javascript
import { ASSET_TEMPLATES } from "../data/assetTemplates.js";
// أو إذا كانت في نفس الملف، أضف import في الأعلى
```

حدّث دالة addAsset لتستقبل template object كامل:

```javascript
// عند اختيار template
const handleAddFromTemplate = (templateId) => {
  const tmpl = ASSET_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return;
  const { id, label, labelAr, description, descAr, ...defaults } = tmpl;
  addAsset(defaults);
};
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.3: تحسين Template Picker UI**

بدل dropdown بسيط، أنشئ template picker أفضل:

```javascript
// Template grid - يظهر عند الضغط على "Add Asset"
// كل template كـ card صغير مع:
// - اسم (bilingual)
// - وصف مختصر
// - badge: Building / Non-Building
// - أهم 3 أرقام (GFA, Cost, Revenue type)
```

التنفيذ:
- عدّل زر "Add Asset" ليفتح dropdown أو modal بالـ templates
- قسّم Templates حسب group (Commercial, Residential, Hospitality, Marine, Non-Building)
- خيار "Custom" في الأخير

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 4. الفحص الآلي (Test)
```bash
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 5. الفحص البصري بالمتصفح (Browse & Verify)

```
preview_start
preview_screenshot على 1280px
```

تحقق من:
- [ ] زر Add Asset يعرض كل Templates
- [ ] Templates مقسمة حسب groups
- [ ] إضافة أصل من كل نوع template يشتغل
- [ ] القيم الافتراضية تظهر صحيحة
- [ ] Non-building templates تنشئ أصول بـ isBuilding=false
- [ ] الحسابات تشتغل مع الأصول الجديدة

```
preview_screenshot على 375px
```
- [ ] Template picker يشتغل على الموبايل

### 6-7. اكتشاف وإصلاح المشاكل
- لو template ما يُنشئ الحقول الصحيحة → تحقق من spread operator
- لو hotelPL/marinaPL ما تتنقل → تأكد من copy
- أعد الاختبارات بعد كل إصلاح

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs

cat > docs/TASK_ADE04_TEMPLATES_REPORT.md << REPORT
# Asset Development Engine - Task 4: Enhanced Templates Report
## Date: $(date)
## Status: [PASS/FAIL]

### Changes Made
- New file: src/data/assetTemplates.js (17 templates)
- Updated template picker in AssetTable
- Templates organized by group
- Non-building templates included

### Test Results
- engine_audit: [PASS/FAIL]
- zan_benchmark: [PASS/FAIL]
REPORT

git add src/data/assetTemplates.js src/App.jsx docs/TASK_ADE04_TEMPLATES_REPORT.md
git commit -m "feat: expand template system to 17 asset types with Saudi defaults

- 17 pre-configured templates across 6 groups
- New types: Resort, Serviced Apartments, Yacht Club, Villas, Sports/Land Lease, Public Realm, Infrastructure, Utility
- Realistic Saudi market defaults (costs, rates, occupancy)
- Non-building templates with appropriate field defaults
- Template picker organized by category group
- All 427 tests passing"
git push origin main
```
