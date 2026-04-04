# TASK 3: Asset Detail Panel - Structured Side Panel

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
إنشاء Asset Detail Panel كـ side drawer منظم يُفتح عند الضغط على أصل في الجدول. يعرض كل حقول الأصل في sections منظمة مع progressive disclosure. يغطي US-004, US-005, US-006, US-007 من PRD.

## الاعتمادية
تعتمد على Task 1 + Task 2. تحقق إن assetType و isBuilding موجودين.

---

## السايكل الكامل

### 1. الفهم (Understand)

```bash
# تأكد من التغييرات السابقة
grep -n "assetType\|isBuilding\|ASSET_TYPES" src/App.jsx | head -10
ls src/data/assetTypes.js 2>/dev/null

# ابحث عن أي panel/drawer/modal موجود
grep -n "drawer\|panel\|modal\|detail\|sidebar\|expandedAsset" src/App.jsx | head -20

# ابحث عن cfOpen (cash flow expand) - هذا pattern مشابه
grep -n "cfOpen\|setcfOpen\|expandRow" src/App.jsx | head -10

# اقرأ كيف يشتغل isMobile
grep -n "isMobile" src/App.jsx | head -10

# Tests
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

### 2. الخطة (Plan)

**التصميم:**
- Drawer/Panel ينزلق من اليمين (أو يفتح تحت الصف في الجدول)
- عرض: 480px على desktop، full screen على mobile
- يُفتح بالضغط على اسم الأصل أو أيقونة expand
- يُغلق بزر X أو Escape أو الضغط خارجه

**Sections داخل الـ Panel:**

1. **Header** - اسم الأصل + نوعه + المرحلة + summary card صغير
2. **Basics** (US-004) - Asset Name, Type, Subtype, Phase, Plot Reference, Notes
3. **Geometry & Areas** (US-005 + US-006) - Building geometry + area breakdown
4. **Phase & Timeline** (US-007) - Phase, Start Year, Duration, Opening Year, Priority
5. **Financial Summary** (read-only) - CAPEX, Revenue, IRR from engine results

**Progressive Disclosure:**
- Non-building assets: إخفاء Geometry section بالكامل
- الحقول المشتقة تظهر مع label "Derived"
- الحقول الفارغة (0 أو "") تظهر بشكل خافت

### 3. التنفيذ (Execute)

**خطوة 3.1: إنشاء AssetDetailPanel component**

أنشئ ملف جديد: `src/components/AssetDetailPanel.jsx`

```javascript
import React, { useState, useEffect, useRef } from "react";
import { ASSET_TYPES } from "../data/assetTypes.js";

export default function AssetDetailPanel({
  asset,        // الأصل المحدد
  index,        // index في مصفوفة assets
  upAsset,      // دالة التحديث
  results,      // نتائج المحرك (للقراءة فقط)
  phases,       // مراحل المشروع
  lang,         // "en" | "ar"
  t,            // translation function
  onClose,      // دالة الإغلاق
  isMobile,     // boolean
}) {
  if (!asset) return null;

  const isRtl = lang === "ar";
  const typeInfo = ASSET_TYPES[asset.assetType] || {};

  // Find asset results from engine
  const assetResult = results?.assetSchedules?.find(a => a.id === asset.id);

  const panelStyle = {
    position: "fixed",
    top: 0,
    [isRtl ? "left" : "right"]: 0,
    width: isMobile ? "100vw" : 480,
    height: "100vh",
    background: "var(--bg-primary, #fff)",
    borderLeft: isRtl ? "none" : "1px solid var(--border, #e5e7eb)",
    borderRight: isRtl ? "1px solid var(--border, #e5e7eb)" : "none",
    boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
    overflowY: "auto",
    zIndex: 1000,
    direction: isRtl ? "rtl" : "ltr",
    padding: 20,
  };

  const sectionStyle = {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    border: "1px solid var(--border, #e5e7eb)",
  };

  const sectionTitle = (titleEn, titleAr) => (
    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-primary, #1f2937)" }}>
      {lang === "ar" ? titleAr : titleEn}
    </h3>
  );

  const field = (labelEn, labelAr, value, onChange, opts = {}) => {
    const { type = "text", options, disabled, derived, hidden, suffix } = opts;
    if (hidden) return null;
    return (
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 11, color: "#6b7280", minWidth: 120, flexShrink: 0 }}>
          {lang === "ar" ? labelAr : labelEn}
          {derived && <span style={{ fontSize: 9, color: "#2EC4B6", marginLeft: 4 }}>(derived)</span>}
        </label>
        {options ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={{ flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db" }}
          >
            {options.map(o => <option key={o.value} value={o.value}>{lang === "ar" ? (o.labelAr || o.label) : o.label}</option>)}
          </select>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type={type}
              value={type === "number" ? (value || 0) : (value || "")}
              onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
              disabled={disabled}
              style={{
                flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: 4,
                border: "1px solid #d1d5db",
                textAlign: type === "number" ? "right" : "left",
                background: disabled ? "#f3f4f6" : "white",
              }}
            />
            {suffix && <span style={{ fontSize: 10, color: "#9ca3af" }}>{suffix}</span>}
          </div>
        )}
      </div>
    );
  };

  const up = (key, val) => upAsset(index, { [key]: val });

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.3)", zIndex: 999,
      }} />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {asset.name || (lang === "ar" ? "أصل بدون اسم" : "Unnamed Asset")}
            </h2>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {typeInfo.label || asset.category} · {asset.phase}
              {!asset.isBuilding && (
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "#f59e0b20", color: "#d97706", marginLeft: 8 }}>
                  {lang === "ar" ? "غير مبني" : "Non-Building"}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer",
            color: "#6b7280", padding: 4,
          }}>✕</button>
        </div>

        {/* Summary Card */}
        {assetResult && (
          <div style={{
            ...sectionStyle, background: "var(--bg-secondary, #f9fafb)",
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center",
          }}>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{lang === "ar" ? "التكلفة" : "CAPEX"}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{(assetResult.totalCapex / 1e6).toFixed(1)}M</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>{lang === "ar" ? "الإيراد" : "Revenue"}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{(assetResult.totalRevenue / 1e6).toFixed(1)}M</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280" }}>GFA</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{(asset.gfa || 0).toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Section 1: Basics (US-004) */}
        <div style={sectionStyle}>
          {sectionTitle("Basics", "الأساسيات")}
          {field("Asset Name", "اسم الأصل", asset.name, (v) => up("name", v))}
          {field("Code", "الرمز", asset.code, (v) => up("code", v))}
          {field("Phase", "المرحلة", asset.phase, (v) => up("phase", v), {
            options: phases.map(p => ({ value: p.name, label: p.name }))
          })}
          {field("Plot Reference", "مرجع القطعة", asset.plotReference, (v) => up("plotReference", v))}
          {field("Notes", "ملاحظات", asset.notes, (v) => up("notes", v))}
        </div>

        {/* Section 2: Geometry & Areas (US-005 + US-006) */}
        {asset.isBuilding !== false && (
          <div style={sectionStyle}>
            {sectionTitle("Geometry & Areas", "الهندسة والمساحات")}
            {field("Plot Area", "مساحة الأرض", asset.plotArea, (v) => up("plotArea", v), { type: "number", suffix: "m²" })}
            {field("Footprint", "البصمة", asset.footprint, (v) => up("footprint", v), { type: "number", suffix: "m²" })}
            {field("Floors Above Ground", "أدوار فوق الأرض", asset.floorsAboveGround, (v) => up("floorsAboveGround", v), { type: "number" })}
            {field("Basement Levels", "أدوار بيسمنت", asset.basementLevels, (v) => up("basementLevels", v), { type: "number" })}
            {field("GFA", "المساحة الإجمالية", asset.gfa, (v) => up("gfa", v), { type: "number", suffix: "m²" })}
            {field("Coverage %", "نسبة التغطية", asset.coveragePct, (v) => up("coveragePct", v), { type: "number", suffix: "%" })}
            {field("FAR", "معامل البناء", asset.far, (v) => up("far", v), { type: "number" })}

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#6b7280" }}>
              {lang === "ar" ? "تفصيل المساحات" : "Area Breakdown"}
            </div>
            {field("Efficiency %", "الكفاءة", asset.efficiency, (v) => up("efficiency", v), { type: "number", suffix: "%" })}
            {field("GLA", "المساحة القابلة للتأجير", asset.gla || Math.round(asset.gfa * (asset.efficiency || 85) / 100), (v) => up("gla", v), {
              type: "number", suffix: "m²", derived: !asset.gla
            })}
            {field("NLA", "صافي المساحة", asset.nla, (v) => up("nla", v), { type: "number", suffix: "m²" })}
            {field("Parking Area", "مساحة المواقف", asset.parkingArea, (v) => up("parkingArea", v), { type: "number", suffix: "m²" })}
            {field("Open Area", "مساحة مفتوحة", asset.openArea, (v) => up("openArea", v), { type: "number", suffix: "m²" })}
          </div>
        )}

        {/* Non-Building: simplified area section */}
        {asset.isBuilding === false && (
          <div style={sectionStyle}>
            {sectionTitle("Land & Area", "الأرض والمساحة")}
            {field("Plot Area", "مساحة الأرض", asset.plotArea, (v) => up("plotArea", v), { type: "number", suffix: "m²" })}
            {field("Open Area", "مساحة مفتوحة", asset.openArea, (v) => up("openArea", v), { type: "number", suffix: "m²" })}
          </div>
        )}

        {/* Section 3: Phase & Timeline (US-007) */}
        <div style={sectionStyle}>
          {sectionTitle("Phase & Timeline", "المرحلة والجدول الزمني")}
          {field("Phase", "المرحلة", asset.phase, (v) => up("phase", v), {
            options: phases.map(p => ({ value: p.name, label: p.name }))
          })}
          {field("Start Year", "سنة البداية", asset.startYear || asset.constrStart, (v) => up("startYear", v), { type: "number" })}
          {field("Build Duration (months)", "مدة البناء (شهور)", asset.constrDuration, (v) => up("constrDuration", v), { type: "number" })}
          {field("Opening Year", "سنة الافتتاح", asset.openingYear, (v) => up("openingYear", v), { type: "number" })}
          {field("Priority", "الأولوية", asset.assetPriority, (v) => up("assetPriority", v), {
            options: [
              { value: "anchor", label: "Anchor", labelAr: "رئيسي" },
              { value: "quickWin", label: "Quick Win", labelAr: "سريع" },
              { value: "standard", label: "Standard", labelAr: "عادي" },
              { value: "optional", label: "Optional", labelAr: "اختياري" },
            ]
          })}
        </div>

        {/* Section 4: Financial (read-only from engine) */}
        <div style={sectionStyle}>
          {sectionTitle("Financial Summary", "الملخص المالي")}
          {field("Revenue Type", "نوع الإيراد", asset.revType, (v) => up("revType", v), {
            options: [
              { value: "Lease", label: "Lease", labelAr: "تأجير" },
              { value: "Operating", label: "Operating", labelAr: "تشغيل" },
              { value: "Sale", label: "Sale", labelAr: "بيع" },
            ]
          })}
          {field("Cost / m²", "تكلفة / م²", asset.costPerSqm, (v) => up("costPerSqm", v), { type: "number", suffix: "SAR" })}
          {field("Lease Rate / m²", "إيجار / م²", asset.leaseRate, (v) => up("leaseRate", v), {
            type: "number", suffix: "SAR",
            hidden: asset.revType !== "Lease"
          })}
          {field("EBITDA", "الأرباح التشغيلية", asset.opEbitda, (v) => up("opEbitda", v), {
            type: "number", suffix: "SAR",
            hidden: asset.revType !== "Operating"
          })}
        </div>

      </div>
    </>
  );
}
```

```bash
npm run build
```

**خطوة 3.2: إضافة Panel في AssetTable component**

ابحث عن ملف AssetTable. قد يكون في:
- `src/components/views/AssetTable.jsx` (ملف منفصل)
- أو ضمن `src/App.jsx` مباشرة

**لو AssetTable في ملف منفصل:** أضف الـ state والـ Panel داخل AssetTable component نفسه.
**لو AssetTable ضمن App.jsx:** أضف الـ state داخل AssetTable function.

```javascript
// أضف في أعلى AssetTable component (داخل الدالة، مو خارجها):
import AssetDetailPanel from './AssetDetailPanel'; // عدّل المسار حسب موقع الملف
const [selectedAssetIndex, setSelectedAssetIndex] = useState(null);

// أضف trigger: عند الضغط على اسم الأصل
// في عمود Asset Name في الجدول، حوّله لـ clickable:
<span
  onClick={() => setSelectedAssetIndex(i)}
  style={{ cursor: "pointer", textDecoration: "underline dotted", color: "var(--accent, #2EC4B6)" }}
>
  {asset.name || "—"}
</span>

// أضف الـ Panel في نهاية AssetTable return:
{selectedAssetIndex !== null && assets[selectedAssetIndex] && (
  <AssetDetailPanel
    asset={assets[selectedAssetIndex]}
    index={selectedAssetIndex}
    upAsset={upAsset}
    results={results}
    phases={project.phases}
    lang={lang}
    t={t}
    onClose={() => setSelectedAssetIndex(null)}
    isMobile={isMobile}
  />
)}
```

```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

**خطوة 3.3: Keyboard support**

```javascript
// في AssetDetailPanel، أضف Escape handler
useEffect(() => {
  const handleKey = (e) => { if (e.key === "Escape") onClose(); };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [onClose]);
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

### 5. الفحص البصري بالمتصفح (Browse & Verify)

```
preview_start
```

على desktop (1280px):
```
preview_screenshot
```
- [ ] اضغط على اسم أصل → Panel يفتح من اليمين
- [ ] كل الـ sections ظاهرة ومنظمة
- [ ] الحقول تقبل تعديل
- [ ] Summary card يعرض أرقام صحيحة
- [ ] زر X يغلق الـ Panel
- [ ] Escape يغلق الـ Panel
- [ ] الضغط على backdrop يغلق الـ Panel

```
preview_click على اسم أصل
preview_screenshot
```

على mobile (375px):
```
preview_screenshot على 375px
```
- [ ] Panel يأخذ كامل الشاشة
- [ ] الحقول مقروءة
- [ ] يمكن التمرير

### 6-7. اكتشاف وإصلاح المشاكل
- لو Panel ما يفتح → تحقق من import وstate
- لو z-index مشكلة → ارفعه
- لو scroll ما يشتغل داخل Panel → overflowY: auto
- أعد الاختبارات بعد كل إصلاح

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs

cat > docs/TASK_ADE03_DETAIL_PANEL_REPORT.md << REPORT
# Asset Development Engine - Task 3: Detail Panel Report
## Date: $(date)
## Status: [PASS/FAIL]

### Changes Made
- New component: src/components/AssetDetailPanel.jsx
- Panel opens from asset name click in table
- 4 organized sections: Basics, Geometry, Phase, Financial
- Progressive disclosure for non-building assets
- Full keyboard and mobile support

### Test Results
- engine_audit: [PASS/FAIL]
- zan_benchmark: [PASS/FAIL]
REPORT

git add src/components/AssetDetailPanel.jsx src/App.jsx docs/TASK_ADE03_DETAIL_PANEL_REPORT.md
git commit -m "feat: add Asset Detail Panel with structured sections

- Side drawer panel opens on asset name click
- 4 sections: Basics, Geometry & Areas, Phase & Timeline, Financial
- Progressive disclosure: non-building assets show simplified view
- Summary card with CAPEX, Revenue, GFA from engine results
- Full keyboard (Escape) and mobile (full screen) support
- Bilingual labels (AR/EN)
- All 427 tests passing"
git push origin main
```
