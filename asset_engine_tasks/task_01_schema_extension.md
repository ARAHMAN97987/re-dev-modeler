# TASK 1: Asset Schema Extension - Data Layer Foundation

```bash
cd "/Users/abdulrahman/Desktop/السليمان /زان/00 Data Room ZAN/re-dev-modeler"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

## القواعد الصارمة
- لا تطلب إذن المستخدم — autonomous 100%
- لا تعدل ملفات tests/
- لا تعدل منطق المحرك المالي في src/engine/ - لا تغير أي ملف هناك
- لو فشل أي test ← revert فوراً ← حل بديل
- Brand = "Haseef" أو "حصيف" فقط
- كل التغييرات ADDITIVE فقط - لا تحذف أي حقل موجود

---

## الهدف
توسيع بنية بيانات الأصل (asset object) بحقول جديدة تدعم Asset Development Engine بدون كسر أي شيء موجود.

## المبدأ الحاكم
**BACKWARD COMPATIBILITY أولاً.** كل حقل جديد يجب أن يكون له قيمة افتراضية. الأصول الحالية تستمر تشتغل بالضبط كما هي. المحرك المالي (engine/) لا يُمس نهائياً.

---

## السايكل الكامل

### 1. الفهم (Understand)

اقرأ هذه الملفات بالكامل وافهم البنية الحالية:

```bash
# 1. ابحث عن defaultAsset أو addAsset في App.jsx
grep -n "addAsset\|defaultAsset\|const base" src/App.jsx | head -20

# 2. اقرأ دالة addAsset كاملة (حوالي سطر 3770)
sed -n '3760,3790p' src/App.jsx

# 3. ابحث عن أماكن استخدام asset fields في App.jsx
grep -n "\.category\|\.revType\|\.plotArea\|\.footprint\|\.gfa\|\.costPerSqm" src/App.jsx | head -30

# 4. اقرأ asset templates (حوالي سطر 5025-5060)
grep -n "hotel5\|hotel4\|mall\|office\|resi\|marina\|custom\|template" src/App.jsx | head -20

# 5. تأكد من عمل Tests الحالية قبل أي تغيير
node tests/engine_audit.cjs
node tests/zan_benchmark.cjs
```

سجّل:
- بنية الـ asset object الحالية بالضبط (كل الحقول)
- أين يتم إنشاء أصل جديد
- أين يتم حفظ/تحميل المشروع
- أين يتم تصدير الأصول

### 2. الخطة (Plan)

أضف هذه الحقول الجديدة إلى الـ asset object مع قيم افتراضية:

```javascript
// === NEW FIELDS - Asset Development Engine Phase 1 ===

// US-001: Asset Type System
assetType: "",           // سيتم ملؤه من category كـ migration
assetSubtype: "",        // النوع الفرعي
isBuilding: true,        // true = building asset, false = non-building (US-003)

// US-004: Enhanced Basics
plotReference: "",       // Plot/Parcel Reference
assetNotes: "",          // ملاحظات مفصلة (منفصلة عن notes الحالي)

// US-005: Building Geometry Enhancement
floorsAboveGround: 0,   // عدد الأدوار فوق الأرض
basementLevels: 0,       // عدد أدوار البيسمنت
coveragePct: 0,          // نسبة التغطية (%)
far: 0,                  // Floor Area Ratio

// US-006: Area Type Separation
gla: 0,                  // Gross Leasable Area
nla: 0,                  // Net Leasable Area
nsa: 0,                  // Net Sellable Area
nua: 0,                  // Net Usable Area
parkingArea: 0,          // مساحة المواقف
openArea: 0,             // مساحة خارجية مفتوحة
areaBasis: "gfa",        // أساس حساب المساحة: gfa|unit|key|berth|land

// US-007: Phase Assignment Enhancement
startYear: 0,            // سنة البداية (إضافي على constrStart)
openingYear: 0,          // سنة الافتتاح
assetPriority: "standard", // anchor|quickWin|standard|optional

// Derived/Computed flags (for UI display)
_isDerived: {},          // tracks which fields are auto-derived
```

**MAPPING من category إلى assetType:**
```
"Retail"      → assetType: "retail_lifestyle"
"Hospitality" → assetType: "hotel" (check hotelPL for subtype)
"Office"      → assetType: "office"
"Residential" → assetType: "residential_multifamily"
"Marina"      → assetType: "marina"
```

**قائمة Asset Types الكاملة (للاستخدام لاحقاً في UI):**
```javascript
const ASSET_TYPES = {
  retail_lifestyle: { label: "Retail Lifestyle", labelAr: "تجزئة لايف ستايل", isBuilding: true, category: "Retail" },
  mall: { label: "Mall", labelAr: "مول تجاري", isBuilding: true, category: "Retail" },
  office: { label: "Office", labelAr: "مكاتب", isBuilding: true, category: "Office" },
  residential_villas: { label: "Residential Villas", labelAr: "فلل سكنية", isBuilding: true, category: "Residential" },
  residential_multifamily: { label: "Residential Multifamily", labelAr: "سكني متعدد", isBuilding: true, category: "Residential" },
  serviced_apartments: { label: "Serviced Apartments", labelAr: "شقق مخدومة", isBuilding: true, category: "Hospitality" },
  hotel: { label: "Hotel", labelAr: "فندق", isBuilding: true, category: "Hospitality" },
  resort: { label: "Resort", labelAr: "منتجع", isBuilding: true, category: "Hospitality" },
  marina: { label: "Marina", labelAr: "مرسى", isBuilding: true, category: "Marina" },
  yacht_club: { label: "Yacht Club", labelAr: "نادي يخوت", isBuilding: true, category: "Marina" },
  sports_land_lease: { label: "Sports / Land Lease", labelAr: "رياضي / تأجير أرض", isBuilding: false, category: "Other" },
  parking_structure: { label: "Parking Structure", labelAr: "مبنى مواقف", isBuilding: true, category: "Other" },
  public_realm: { label: "Public Realm", labelAr: "مجال عام", isBuilding: false, category: "Other" },
  infrastructure_package: { label: "Infrastructure Package", labelAr: "حزمة بنية تحتية", isBuilding: false, category: "Other" },
  utility_asset: { label: "Utility Asset", labelAr: "أصل خدمي", isBuilding: false, category: "Other" },
};
```

### 3. التنفيذ (Execute)

**خطوة 3.1: إنشاء ملف ASSET_TYPES config**

أنشئ ملف جديد: `src/data/assetTypes.js`

```javascript
// Asset Development Engine - Type Definitions
// Phase 1: US-001 Asset Type System

export const ASSET_TYPES = { /* القائمة الكاملة أعلاه */ };

export const ASSET_TYPE_OPTIONS = Object.entries(ASSET_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
  labelAr: val.labelAr,
  isBuilding: val.isBuilding,
  category: val.category,
}));

// Map old category to new assetType (for migration)
export function migrateCategory(category, asset) {
  if (category === "Retail") return "retail_lifestyle";
  if (category === "Office") return "office";
  if (category === "Residential") return "residential_multifamily";
  if (category === "Marina") return "marina";
  if (category === "Hospitality") {
    if (asset?.hotelPL) return "hotel";
    return "serviced_apartments";
  }
  return "retail_lifestyle"; // fallback
}

// Get category from assetType (for backward compatibility with engine)
export function getCategoryFromType(assetType) {
  return ASSET_TYPES[assetType]?.category || "Retail";
}
```

```bash
npm run build
```

**خطوة 3.2: توسيع addAsset في App.jsx**

في دالة addAsset (حوالي سطر 3770)، أضف الحقول الجديدة إلى const base:

```javascript
// بعد الحقول الحالية، أضف:
assetType: "",
assetSubtype: "",
isBuilding: true,
plotReference: "",
assetNotes: "",
floorsAboveGround: 0,
basementLevels: 0,
coveragePct: 0,
far: 0,
gla: 0,
nla: 0,
nsa: 0,
nua: 0,
parkingArea: 0,
openArea: 0,
areaBasis: "gfa",
startYear: 0,
openingYear: 0,
assetPriority: "standard",
```

**مهم جداً:** لا تحذف أي حقل موجود. الحقول القديمة (category, plotArea, footprint, gfa, etc.) تبقى كما هي.

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.3: إضافة migration logic**

ابحث عن المكان الذي يتم فيه تحميل المشروع (load project / setState من JSON). أضف migration function:

```javascript
import { ASSET_TYPES, migrateCategory, getCategoryFromType } from './data/assetTypes.js';

function migrateAssets(assets) {
  if (!assets) return assets;
  return assets.map(asset => {
    // أولاً: spread الأصل الموجود فوق الـ defaults
    const migrated = {
      assetType: "",
      assetSubtype: "",
      isBuilding: true,
      plotReference: "",
      assetNotes: "",
      floorsAboveGround: 0,
      basementLevels: 0,
      coveragePct: 0,
      far: 0,
      gla: 0,
      nla: 0,
      nsa: 0,
      nua: 0,
      parkingArea: 0,
      openArea: 0,
      areaBasis: "gfa",
      startYear: 0,
      openingYear: 0,
      assetPriority: "standard",
      ...asset, // ← الحقول الموجودة تأخذ أولوية على الـ defaults
    };
    // ثانياً: لو ما عنده assetType بعد الـ spread، اشتقه من category
    if (!migrated.assetType && migrated.category) {
      migrated.assetType = migrateCategory(migrated.category, migrated);
      migrated.isBuilding = ASSET_TYPES[migrated.assetType]?.isBuilding ?? true;
    }
    return migrated;
  });
}
```

**مهم - أين تضيف الـ import:**
أضف سطر الـ import في أعلى App.jsx (حوالي سطر 220، بعد import defaults):
```javascript
import { ASSET_TYPES, migrateCategory, getCategoryFromType } from './data/assetTypes.js';
```

**مهم - أين تستدعي migrateAssets:**
ابحث عن دالة تحميل المشروع. في App.jsx حوالي سطر 224 (`loadProjectIndex`). عند تحميل مشروع، بعد `JSON.parse`:
```javascript
// ابحث عن المكان اللي يحمّل المشروع ويعمل setState
// أضف هذا السطر بعد ما يتم تحويل JSON إلى object:
if (p.assets) p.assets = migrateAssets(p.assets);
```
ابحث عن كل مكان يتم فيه `setProject` أو `JSON.parse` لمشروع محمّل.

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.4: حافظ على category متزامن**

في دالة upAsset، أضف sync logic:
- لو تغير assetType → حدّث category تلقائياً (عبر getCategoryFromType)
- لو تغير category → حدّث assetType تلقائياً (عبر migrateCategory)
- هذا يضمن إن المحرك المالي اللي يعتمد على category يفضل يشتغل

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 4. الفحص الآلي (Test)
```bash
node tests/engine_audit.cjs
node tests/zan_benchmark.cjs
```
**كل 427 test لازم ينجحون.** لو فشل أي test:
1. `git diff` - شوف ايش تغير
2. `git checkout -- src/App.jsx` - ارجع التغيير المسبب
3. جرب حل بديل
4. أعد الاختبارات

### 5. الفحص البصري بالمتصفح (Browse & Verify)

```
preview_start — شغل dev server
preview_screenshot على 1280px — تأكد الصفحة تحمّل بدون أخطاء
preview_console_logs — تأكد ما فيه errors
```

تحقق من:
- إنشاء مشروع جديد يشتغل (أصل جديد يحتوي على الحقول الجديدة)
- تحميل مشروع موجود يشتغل (migration تشتغل)
- الجدول يعرض بدون أخطاء
- الحسابات ما تغيرت

### 6-7. اكتشاف وإصلاح المشاكل
- لو لقيت مشاكل من الفحص البصري سجلها وأصلحها
- لو migration ما اشتغلت صح → أصلحها
- أعد الاختبارات بعد كل إصلاح

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs

# تقرير
cat > docs/TASK_ADE01_SCHEMA_REPORT.md << REPORT
# Asset Development Engine - Task 1: Schema Extension Report
## Date: $(date)
## Status: [PASS/FAIL]

### Changes Made
- [list of files changed]

### New Fields Added
- [list with defaults]

### Migration Logic
- [description]

### Test Results
- engine_audit: [PASS/FAIL] [count]
- zan_benchmark: [PASS/FAIL] [count]

### Known Issues
- [any issues found]
REPORT

git add src/data/assetTypes.js src/App.jsx docs/TASK_ADE01_SCHEMA_REPORT.md
git commit -m "feat: extend asset schema for Asset Development Engine Phase 1

- Add 19 new fields to asset object (assetType, isBuilding, geometry, areas, phase details)
- Create ASSET_TYPES configuration with 15 asset types (bilingual labels)
- Add backward-compatible migration for existing projects
- Sync assetType <-> category for engine compatibility
- All 427 tests passing"
git push origin main
```

---

## ملخص التأثير
- **ملفات جديدة:** src/data/assetTypes.js
- **ملفات معدلة:** src/App.jsx (addAsset + migration + upAsset sync)
- **ملفات لا تُمس:** src/engine/*, tests/*, أي ملف آخر
- **خطورة:** منخفضة - كل التغييرات additive مع قيم افتراضية
