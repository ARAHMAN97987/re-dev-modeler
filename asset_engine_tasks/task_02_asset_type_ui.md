# TASK 2: Asset Type Selection UI + Non-Building Toggle

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
إضافة نظام اختيار نوع الأصل (Asset Type) في واجهة المستخدم مع دعم الأصول غير المبنية. يغطي US-001 + US-003 من PRD.

## الاعتمادية
هذه المهمة تعتمد على Task 1 (Schema Extension). تأكد أولاً إن الحقول الجديدة موجودة.

---

## السايكل الكامل

### 1. الفهم (Understand)

```bash
# تأكد إن Task 1 تم تنفيذها
grep -n "assetType\|isBuilding\|ASSET_TYPES" src/App.jsx | head -20
ls src/data/assetTypes.js 2>/dev/null && echo "EXISTS" || echo "MISSING"

# لو src/data/assetTypes.js مو موجود، أنشئه أولاً (راجع task_01)
# لو assetType مو موجود في addAsset، أضفه أولاً (راجع task_01)

# اقرأ الكود الحالي
grep -n "AssetTable\|category.*Retail\|category.*select" src/App.jsx | head -30

# ابحث عن مكان عرض category في الجدول
grep -n "category" src/App.jsx | head -20

# ابحث عن templates
grep -n "template\|hotel5\|hotel4\|mall\|custom" src/App.jsx | head -20

# اقرأ AssetTable component (حوالي 5009-5750)
sed -n '5009,5080p' src/App.jsx

# تأكد من عمل Tests
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 2. الخطة (Plan)

1. **استيراد ASSET_TYPES** من src/data/assetTypes.js في App.jsx
2. **إضافة عمود Asset Type** في جدول الأصول (بجانب أو بدل Category)
3. **إضافة Asset Type Selector** - dropdown مع grouping حسب category
4. **إضافة Non-Building Toggle** (isBuilding) - يظهر بجانب Asset Type
5. **Sync assetType ↔ category** عند التغيير
6. **Progressive Disclosure أولي** - إخفاء حقول GFA/footprint/floors عند isBuilding=false
7. **Badge المرحلة** - إضافة priority badge (anchor/quickWin/standard/optional)

### 3. التنفيذ (Execute)

**خطوة 3.1: التأكد من وجود assetTypes.js**

لو الملف مو موجود، أنشئه:

```bash
ls src/data/assetTypes.js 2>/dev/null || echo "NEED_TO_CREATE"
```

لو NEED_TO_CREATE:
```javascript
// src/data/assetTypes.js
export const ASSET_TYPES = {
  retail_lifestyle: { label: "Retail Lifestyle", labelAr: "تجزئة لايف ستايل", isBuilding: true, category: "Retail", group: "Commercial" },
  mall: { label: "Mall", labelAr: "مول تجاري", isBuilding: true, category: "Retail", group: "Commercial" },
  office: { label: "Office", labelAr: "مكاتب", isBuilding: true, category: "Office", group: "Commercial" },
  residential_villas: { label: "Residential Villas", labelAr: "فلل سكنية", isBuilding: true, category: "Residential", group: "Residential" },
  residential_multifamily: { label: "Residential Multifamily", labelAr: "سكني متعدد", isBuilding: true, category: "Residential", group: "Residential" },
  serviced_apartments: { label: "Serviced Apartments", labelAr: "شقق مخدومة", isBuilding: true, category: "Hospitality", group: "Hospitality" },
  hotel: { label: "Hotel", labelAr: "فندق", isBuilding: true, category: "Hospitality", group: "Hospitality" },
  resort: { label: "Resort", labelAr: "منتجع", isBuilding: true, category: "Hospitality", group: "Hospitality" },
  marina: { label: "Marina", labelAr: "مرسى", isBuilding: true, category: "Marina", group: "Marine" },
  yacht_club: { label: "Yacht Club / Sailing Club", labelAr: "نادي يخوت", isBuilding: true, category: "Marina", group: "Marine" },
  sports_land_lease: { label: "Sports / Land Lease", labelAr: "رياضي / تأجير أرض", isBuilding: false, category: "Other", group: "Non-Building" },
  parking_structure: { label: "Parking Structure", labelAr: "مبنى مواقف", isBuilding: true, category: "Other", group: "Infrastructure" },
  public_realm: { label: "Public Realm", labelAr: "مجال عام", isBuilding: false, category: "Other", group: "Non-Building" },
  infrastructure_package: { label: "Infrastructure Package", labelAr: "حزمة بنية تحتية", isBuilding: false, category: "Other", group: "Non-Building" },
  utility_asset: { label: "Utility Asset", labelAr: "أصل خدمي", isBuilding: false, category: "Other", group: "Non-Building" },
};

export function migrateCategory(category, asset) {
  if (category === "Retail") return "retail_lifestyle";
  if (category === "Office") return "office";
  if (category === "Residential") return "residential_multifamily";
  if (category === "Marina") return "marina";
  if (category === "Hospitality") {
    if (asset?.hotelPL) return "hotel";
    return "serviced_apartments";
  }
  return "retail_lifestyle";
}

export function getCategoryFromType(assetType) {
  return ASSET_TYPES[assetType]?.category || "Retail";
}
```

```bash
npm run build
```

**خطوة 3.2: إضافة Asset Type Selector في AssetTable**

في AssetTable component، ابحث عن عمود Category (dropdown مع خيارات Retail/Hospitality/Office/Residential/Marina).

استبدل أو أضف بجانبه Asset Type dropdown:

```javascript
// Asset Type dropdown with groups
// استخدم <select> مع <optgroup> لكل group
const assetTypeGroups = {};
Object.entries(ASSET_TYPES).forEach(([key, val]) => {
  const g = val.group;
  if (!assetTypeGroups[g]) assetTypeGroups[g] = [];
  assetTypeGroups[g].push({ value: key, label: lang === "ar" ? val.labelAr : val.label });
});

// في العمود:
<select
  value={asset.assetType || migrateCategory(asset.category, asset)}
  onChange={(e) => {
    const newType = e.target.value;
    const newCat = getCategoryFromType(newType);
    const newIsBuilding = ASSET_TYPES[newType]?.isBuilding ?? true;
    upAsset(i, {
      assetType: newType,
      category: newCat,
      isBuilding: newIsBuilding
    });
  }}
  style={{ fontSize: 11, padding: "2px 4px", minWidth: 120 }}
>
  {Object.entries(assetTypeGroups).map(([group, types]) => (
    <optgroup key={group} label={group}>
      {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
    </optgroup>
  ))}
</select>
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.3: إضافة Non-Building Toggle**

في نفس المنطقة (بعد Asset Type أو في صف منفصل):

```javascript
// Non-Building indicator / toggle
{!asset.isBuilding && (
  <span style={{
    fontSize: 9,
    padding: "1px 4px",
    borderRadius: 3,
    background: "#f59e0b20",
    color: "#d97706",
    marginLeft: 4,
  }}>
    {lang === "ar" ? "غير مبني" : "Non-Building"}
  </span>
)}
```

```bash
npm run build
```

**خطوة 3.4: Progressive Disclosure الأولي**

عند عرض أعمدة الجدول، أخفِ الأعمدة غير المناسبة للأصول غير المبنية:

```javascript
// في الأعمدة التي تعتمد على building (GFA, Footprint, Floors, etc.)
// أضف شرط: لو isBuilding === false، اعرض "-" أو اخف الحقل
{asset.isBuilding !== false ? (
  <EditableCell value={asset.gfa} onChange={(v) => upAsset(i, { gfa: v })} type="number" />
) : (
  <span style={{ color: "#999", fontSize: 10 }}>—</span>
)}
```

طبّق هذا على: gfa, footprint, efficiency, costPerSqm (للأصول غير المبنية)

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.5: Priority Badge**

أضف عمود أو badge لـ assetPriority:

```javascript
// Priority badge colors
const priorityColors = {
  anchor: { bg: "#dc262620", color: "#dc2626", label: "Anchor", labelAr: "رئيسي" },
  quickWin: { bg: "#16a34a20", color: "#16a34a", label: "Quick Win", labelAr: "سريع" },
  standard: { bg: "#6b728020", color: "#6b7280", label: "Standard", labelAr: "عادي" },
  optional: { bg: "#8b5cf620", color: "#8b5cf6", label: "Optional", labelAr: "اختياري" },
};
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 4. الفحص الآلي (Test)
```bash
node tests/engine_audit.cjs
node tests/zan_benchmark.cjs
```
**كل 427 test لازم ينجحون.**

### 5. الفحص البصري بالمتصفح (Browse & Verify)

```
preview_start
preview_screenshot على 1280px
```

تحقق من:
- [ ] Asset Type dropdown يظهر ويشتغل
- [ ] تغيير Asset Type يحدّث category
- [ ] Non-Building badge يظهر للأصول غير المبنية
- [ ] GFA/footprint يختفي أو يتحول لـ "—" للأصول غير المبنية
- [ ] الحسابات لم تتغير (IRR, CAPEX, Revenue نفس الأرقام)
- [ ] المشروع يحفظ ويحمل بدون مشاكل

```
preview_screenshot على 375px (mobile)
```
- [ ] Asset Type dropdown يشتغل على الموبايل

```
preview_console_logs
```
- [ ] لا يوجد أخطاء JavaScript

### 6-7. اكتشاف وإصلاح المشاكل
- لو الـ dropdown واسع جداً → قلل minWidth
- لو الألوان ما تناسب dark mode → عدّلها
- لو فيه console errors → أصلحها
- أعد الاختبارات بعد كل إصلاح

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs

cat > docs/TASK_ADE02_ASSET_TYPE_REPORT.md << REPORT
# Asset Development Engine - Task 2: Asset Type UI Report
## Date: $(date)
## Status: [PASS/FAIL]

### Changes Made
- Asset Type dropdown with 15 types in 6 groups
- Non-Building toggle/badge
- Progressive disclosure for non-building assets
- Priority badge (anchor/quickWin/standard/optional)
- Backward compatible: category synced with assetType

### Visual Verification
- Desktop: [screenshot description]
- Mobile: [screenshot description]

### Test Results
- engine_audit: [PASS/FAIL]
- zan_benchmark: [PASS/FAIL]
REPORT

git add -A
git commit -m "feat: add Asset Type selection UI with non-building support

- 15 asset types organized in 6 groups (Commercial, Residential, Hospitality, Marine, Infrastructure, Non-Building)
- Bilingual labels (AR/EN)
- Non-building asset badge with progressive field disclosure
- Asset priority badges (Anchor, Quick Win, Standard, Optional)
- Backward compatible: assetType syncs with category for engine
- All 427 tests passing"
git push origin main
```
