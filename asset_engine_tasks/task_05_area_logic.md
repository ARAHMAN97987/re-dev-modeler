# TASK 5: Area Derivation Logic + Efficiency System

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
- كل التغييرات ADDITIVE فقط

---

## الهدف
إضافة منطق اشتقاق المساحات تلقائياً (GFA → GLA/NLA/NSA) مع دعم أساس حساب مختلف لكل نوع أصل. يغطي US-006, US-010, US-011 من PRD.

## الاعتمادية
تعتمد على Task 1 (schema) + Task 2 (asset types) + Task 3 (detail panel).

## المبدأ الحاكم
**المحرك المالي يستخدم حقل `efficiency` و `gfa` و `leasableArea` (المشتق).** لا نغير هذا. نضيف طبقة اشتقاق في الـ UI تحسب المساحات الجديدة (gla, nla, nsa, nua) وتحدّث `leasableArea` الموجود لتغذية المحرك.

---

## السايكل الكامل

### 1. الفهم (Understand)

```bash
# كيف يحسب المحرك leasableArea
grep -n "leasableArea\|efficiency\|gla\|nla" src/engine/cashflow.js | head -20

# كيف يستخدم المحرك leasableArea في الإيراد
grep -n "leasableArea\|leaseRate" src/engine/cashflow.js | head -20

# هل leasableArea محسوب في المحرك أم في App.jsx
grep -n "leasableArea" src/App.jsx | head -20

# Efficiency defaults
grep -n "defaultEfficiency\|efficiency" src/App.jsx | head -20

# ASSET_TYPES إذا موجود
cat src/data/assetTypes.js 2>/dev/null | head -20

# Tests
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**ملاحظة حرجة:** اقرأ بالضبط كيف يحسب المحرك `leasableArea`:
```
leasableArea = gfa * efficiency / 100  (في cashflow.js)
```
هذا الحساب يجب أن يبقى كما هو. نحن نضيف مساحات إضافية في UI فقط.

### 2. الخطة (Plan)

**Benchmark Defaults حسب نوع الأصل:**
```javascript
const EFFICIENCY_BENCHMARKS = {
  retail_lifestyle: { efficiency: 75, areaLabel: "GLA", labelAr: "مساحة قابلة للتأجير" },
  mall: { efficiency: 70, areaLabel: "GLA", labelAr: "مساحة قابلة للتأجير" },
  office: { efficiency: 80, areaLabel: "NLA", labelAr: "صافي المساحة" },
  residential_villas: { efficiency: 90, areaLabel: "NSA", labelAr: "صافي مساحة البيع" },
  residential_multifamily: { efficiency: 82, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  serviced_apartments: { efficiency: 75, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  hotel: { efficiency: 65, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  resort: { efficiency: 55, areaLabel: "NUA", labelAr: "صافي مساحة الاستخدام" },
  marina: { efficiency: 100, areaLabel: "Berth Area", labelAr: "مساحة الأرصفة" },
  yacht_club: { efficiency: 70, areaLabel: "NUA", labelAr: "صافي المساحة" },
  parking_structure: { efficiency: 95, areaLabel: "Parking NUA", labelAr: "صافي مساحة المواقف" },
};
```

**منطق الاشتقاق:**
1. لو المستخدم ما أدخل gla/nla/nsa/nua → اشتقها من GFA × efficiency
2. لو المستخدم أدخل gla مباشرة → استخدمها وحدّث efficiency
3. Coverage % = footprint / plotArea × 100
4. FAR = gfa / plotArea

**ربط مع المحرك:**
- المحرك يحسب `leasableArea = gfa * efficiency / 100` داخلياً
- نحن نعرض المساحات المشتقة في الـ UI كقراءة فقط (أو editable مع sync)
- لو المستخدم غيّر efficiency → تتحدث كل المساحات المشتقة
- لو المستخدم أدخل GLA يدوياً → efficiency يتحدث → المحرك يحسب نفس الرقم

### 3. التنفيذ (Execute)

**خطوة 3.1: إنشاء src/data/areaBenchmarks.js**

```javascript
// Area Benchmarks and Derivation Logic
// Asset Development Engine

export const EFFICIENCY_BENCHMARKS = {
  // ... القائمة أعلاه
};

// Area basis definitions
export const AREA_BASES = {
  gfa: { label: "Per GFA (m²)", labelAr: "لكل م² إجمالي", field: "gfa" },
  unit: { label: "Per Unit", labelAr: "لكل وحدة", field: "unitCount" },
  key: { label: "Per Key", labelAr: "لكل غرفة", field: "keyCount" },
  berth: { label: "Per Berth", labelAr: "لكل رصيف", field: "berthCount" },
  land: { label: "Per Land Area (m²)", labelAr: "لكل م² أرض", field: "plotArea" },
};

// Derive areas from base inputs
export function deriveAreas(asset) {
  const eff = (asset.efficiency || 85) / 100;
  const gfa = asset.gfa || 0;
  const plotArea = asset.plotArea || 0;
  const footprint = asset.footprint || 0;

  return {
    // Net area = GFA × efficiency (same as engine calculates)
    netArea: Math.round(gfa * eff),

    // Coverage
    coveragePct: plotArea > 0 ? Math.round((footprint / plotArea) * 100 * 10) / 10 : 0,

    // FAR
    far: plotArea > 0 ? Math.round((gfa / plotArea) * 100) / 100 : 0,

    // Leasable area (for display - engine calculates its own)
    leasableArea: Math.round(gfa * eff),
  };
}

// Get benchmark efficiency for asset type
export function getBenchmarkEfficiency(assetType) {
  return EFFICIENCY_BENCHMARKS[assetType]?.efficiency || 85;
}

// Get appropriate area label for asset type
export function getAreaLabel(assetType, lang = "en") {
  const bench = EFFICIENCY_BENCHMARKS[assetType];
  if (!bench) return lang === "ar" ? "صافي المساحة" : "Net Area";
  return lang === "ar" ? bench.labelAr : bench.areaLabel;
}
```

```bash
npm run build
```

**خطوة 3.2: إضافة Area Derivation Display في AssetDetailPanel**

في src/components/AssetDetailPanel.jsx (أو حيث يتم عرض مساحات الأصل):

```javascript
import { deriveAreas, getBenchmarkEfficiency, getAreaLabel } from "../data/areaBenchmarks.js";

// داخل Panel:
const derived = deriveAreas(asset);
const benchEff = getBenchmarkEfficiency(asset.assetType);

// في قسم Geometry & Areas:
// بعد حقل Efficiency، أضف:
<div style={{ padding: "8px 12px", background: "#f0f9ff", borderRadius: 6, marginTop: 8 }}>
  <div style={{ fontSize: 10, color: "#0369a1", marginBottom: 4 }}>
    {lang === "ar" ? "قيم مشتقة" : "Derived Values"}
  </div>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
    <div>{getAreaLabel(asset.assetType, lang)}: <b>{derived.netArea.toLocaleString()}</b> m²</div>
    <div>{lang === "ar" ? "نسبة التغطية" : "Coverage"}: <b>{derived.coveragePct}%</b></div>
    <div>FAR: <b>{derived.far}</b></div>
    <div>{lang === "ar" ? "المرجعية" : "Benchmark"}: <b>{benchEff}%</b></div>
  </div>
  {asset.efficiency !== benchEff && (
    <button
      onClick={() => upAsset(index, { efficiency: benchEff })}
      style={{
        marginTop: 6, fontSize: 10, padding: "2px 8px",
        background: "#2EC4B620", color: "#2EC4B6", border: "1px solid #2EC4B6",
        borderRadius: 4, cursor: "pointer",
      }}
    >
      {lang === "ar" ? "تطبيق المرجعية" : "Apply Benchmark"}
    </button>
  )}
</div>
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.3: إضافة Area Summary في جدول الأصول**

في AssetTable، أضف عمود "Net Area" أو عدّل عمود "Leasable Area":

```javascript
// أضف عمود يعرض الـ derived net area
{
  key: "derivedNetArea",
  label: lang === "ar" ? "صافي المساحة" : "Net Area",
  render: (asset) => {
    const d = deriveAreas(asset);
    return d.netArea.toLocaleString();
  }
}
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.4: Auto-sync efficiency ↔ GLA**

في upAsset أو في الـ Panel:
- لو المستخدم أدخل GLA يدوياً وعنده GFA > 0:
  ```javascript
  // حدّث efficiency
  if (field === "gla" && asset.gfa > 0) {
    const newEff = Math.round((value / asset.gfa) * 100);
    upAsset(i, { gla: value, efficiency: newEff });
  }
  ```
- لو غيّر efficiency:
  ```javascript
  // حدّث GLA display (لكن GLA الفعلي يتم حسابه في المحرك)
  ```

**مهم:** لا تغير كيف المحرك يحسب. Sync هو للعرض فقط في الـ UI.

**تحذير: منع infinite loop:**
- لو المستخدم غيّر GLA → حدّث efficiency فقط (لا ترسل update لـ GLA مرة ثانية)
- لو المستخدم غيّر efficiency → اعرض القيمة المشتقة في UI بدون تعديل asset.gla
- لا تربط الاتجاهين في نفس الـ upAsset call
- أضف validation: efficiency لا يمكن أن يتجاوز 100%
```javascript
if (field === "gla" && asset.gfa > 0) {
  const newEff = Math.min(100, Math.round((value / asset.gfa) * 100));
  upAsset(i, { gla: value, efficiency: newEff });
  return; // لا تكمل - خلاص
}
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 4. الفحص الآلي (Test)
```bash
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```
**كل 427 test لازم ينجحون.** لو فشل أي test → المشكلة في الـ sync logic. تأكد إنك ما تغير efficiency أو gfa بشكل غير مقصود.

### 5. الفحص البصري بالمتصفح (Browse & Verify)

```
preview_start
preview_screenshot على 1280px
```

تحقق من:
- [ ] فتح Asset Detail Panel يعرض Derived Values
- [ ] Net Area محسوبة صح (GFA × efficiency / 100)
- [ ] Coverage % محسوبة صح (footprint / plotArea × 100)
- [ ] FAR محسوب صح (GFA / plotArea)
- [ ] Benchmark button يشتغل ويحدّث efficiency
- [ ] تغيير efficiency يحدّث Net Area فوراً
- [ ] الأرقام في Results (CAPEX, Revenue, IRR) لم تتغير
- [ ] Net Area عمود في الجدول يعرض القيم

### 6-7. اكتشاف وإصلاح المشاكل
- لو Derived Values يعرض NaN → تحقق من division by zero
- لو الأرقام تتغير → تأكد ما غيّرت efficiency بدون قصد
- أعد الاختبارات بعد كل إصلاح

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs

cat > docs/TASK_ADE05_AREA_LOGIC_REPORT.md << REPORT
# Asset Development Engine - Task 5: Area Logic Report
## Date: $(date)
## Status: [PASS/FAIL]

### Changes Made
- New file: src/data/areaBenchmarks.js
- Area derivation in AssetDetailPanel
- Benchmark efficiency defaults per asset type
- Apply Benchmark button
- Net Area column in asset table
- Auto-sync efficiency ↔ GLA

### Test Results
- engine_audit: [PASS/FAIL]
- zan_benchmark: [PASS/FAIL]
REPORT

git add src/data/areaBenchmarks.js src/components/AssetDetailPanel.jsx src/App.jsx docs/TASK_ADE05_AREA_LOGIC_REPORT.md
git commit -m "feat: add area derivation logic with benchmark efficiency system

- Efficiency benchmarks for each asset type (Saudi market defaults)
- Auto-derive net area, coverage %, FAR from base inputs
- Apply Benchmark button in detail panel
- Net Area column in asset table
- Auto-sync efficiency and GLA
- Engine compatibility maintained (no engine changes)
- All 427 tests passing"
git push origin main
```
