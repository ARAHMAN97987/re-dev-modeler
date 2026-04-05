# TASK 5: Asset Table UX

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
1. أعمدة قابلة لتغيير العرض بالسحب (column resize)
2. خلايا تستوعب النص الطويل
3. دعم رفع ملفات xlsx (بدل CSV فقط) عبر SheetJS

## السايكل الكامل

### 1. الفهم (Understand)

#### فهم بنية جدول الأصول
```bash
grep -n "AssetTable\|function.*Asset.*Table\|const.*Asset.*Table" src/App.jsx | head -10
```

اقرأ الـ AssetTable component بالكامل — حدد:
- كيف الأعمدة معرّفة (array of columns? hardcoded headers?)
- كيف الخلايا تعرض (EditableCell? inline inputs?)
- كيف الـ CSV import يشتغل حالياً
- عرض الأعمدة الحالي (fixed? percentage? auto?)

```bash
grep -n "EditableCell\|columns\s*=\|colDef\|colWidth\|columnWidth" src/App.jsx | head -20
grep -n "csv\|CSV\|import.*file\|handleFile\|readFile\|FileReader" src/App.jsx | head -20
grep -n "xlsx\|XLSX\|SheetJS\|exceljs\|read.*excel" src/App.jsx | head -10
```

#### فهم EditableCell
```bash
grep -n "function EditableCell\|const EditableCell" src/App.jsx | head -5
```
اقرأ الـ component — كيف تعرض النص؟ هل فيها `overflow:hidden`؟ `textOverflow:ellipsis`؟

### 2. الخطة (Plan)

**التغيير 1: Column Resize (الأعقد)**

**الطريقة:** أضف resize handle على حافة كل عمود header. عند السحب، يتغير عرض العمود.

التنفيذ:
- أضف state: `columnWidths` — object يحفظ عرض كل عمود بالـ key
- أضف resize handle: `<div>` شفاف بعرض 4px على حافة كل `<th>`
- عند `onMouseDown` على الـ handle → track mouse movement → update width
- احفظ الأعراض في localStorage عشان تبقى بين الجلسات
- cursor يتغير لـ `col-resize` عند hover على الـ handle

**مهم:** هذا تغيير UI فقط — لا يأثر على البيانات أو المحرك.

**التغيير 2: Long Text in Cells**
- الخلايا الحالية غالباً تقطع النص الطويل
- الحل: `overflow:hidden` + `textOverflow:ellipsis` + `whiteSpace:nowrap` للعرض العادي
- عند hover أو click: tooltip أو expand يعرض النص الكامل
- الخلايا القابلة للتعديل (EditableCell): عند الدخول بوضع التعديل، توسّع لتعرض النص الكامل

**التغيير 3: XLSX Import via SheetJS**
- تحقق هل SheetJS (xlsx package) موجود في dependencies:
```bash
grep "xlsx" package.json
```
- لو موجود → استخدمه مباشرة
- لو غير موجود → `npm install xlsx`
- عدّل دالة import الحالية عشان تقبل .xlsx بالإضافة لـ .csv
- استخدم `XLSX.read(data, {type:'binary'})` لقراءة الملف
- حوّل أول sheet لـ JSON array
- طابق الأعمدة مع أعمدة الأصول الموجودة (بالاسم أو بالترتيب)

### 3. التنفيذ (Execute)

**خطوة 1: Column Resize**

أضف الكود التالي في مكانه المناسب:

1. State للأعراض:
```jsx
const [colWidths, setColWidths] = useState(() => {
  try { return JSON.parse(localStorage.getItem('haseef-col-widths') || '{}'); } 
  catch { return {}; }
});
```

2. Resize handler:
```jsx
const handleColumnResize = (colKey, startX, startWidth) => {
  const onMove = (e) => {
    const diff = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + diff);
    setColWidths(prev => {
      const next = {...prev, [colKey]: newWidth};
      localStorage.setItem('haseef-col-widths', JSON.stringify(next));
      return next;
    });
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};
```

3. في كل `<th>`:
```jsx
<th style={{width: colWidths[colKey] || defaultWidth, position:'relative'}}>
  {headerLabel}
  <div 
    style={{position:'absolute', right:0, top:0, bottom:0, width:4, cursor:'col-resize', background:'transparent'}}
    onMouseDown={(e) => handleColumnResize(colKey, e.clientX, colWidths[colKey] || defaultWidth)}
  />
</th>
```

```bash
npm run build
```
لو فشل ← revert.

**خطوة 2: Long Text Handling**
في EditableCell أو في `<td>` styles:
```jsx
style={{
  maxWidth: colWidths[colKey] || 150,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}}
title={fullTextValue} // tooltip on hover
```

```bash
npm run build
```

**خطوة 3: XLSX Import**
```bash
# تحقق من وجود xlsx package
grep "xlsx" package.json
# لو غير موجود:
npm install xlsx --save
```

جد دالة CSV import الحالية وعدّلها:
```bash
grep -n "handleCSV\|importCSV\|handleFileUpload\|csv.*import\|import.*csv" src/App.jsx | head -10
```

عدّل الدالة لتقبل .xlsx:
```jsx
const handleFileImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  
  if (isExcel) {
    reader.onload = (evt) => {
      const XLSX = require('xlsx');
      const wb = XLSX.read(evt.target.result, {type:'binary'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      // map rows to assets...
      processImportedRows(rows);
    };
    reader.readAsBinaryString(file);
  } else {
    // existing CSV logic
    reader.onload = (evt) => { /* existing code */ };
    reader.readAsText(file);
  }
};
```

عدّل `accept` في الـ input:
```jsx
<input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileImport} />
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
شغل المنصة وافحص:

1. **Column Resize:** افتح Assets tab → حاول سحب حافة عمود → هل يتغير العرض؟ هل يحفظ بعد refresh؟
2. **Long Text:** أدخل نص طويل في اسم أصل → هل يظهر مقطوع مع `...`؟ هل يظهر كامل عند hover؟
3. **XLSX Import:** (لو تقدر تختبر) هل زر Import يظهر `.xlsx` في file picker؟

افحص على desktop (1280px) و mobile (375px):
- على الموبايل: هل resize handle يتعارض مع scroll؟
- على الموبايل: هل الجدول لا زال scrollable أفقياً؟

### 6-7. اكتشاف وإصلاح
- لو resize يتعارض مع touch scroll → أضف `onTouchStart` بديل أو أخفِ resize handles على الموبايل
- لو XLSX import يكسر build → revert وسجل الخطأ (قد يكون مشكلة bundling)

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK5_ASSET_TABLE_REPORT.md`:
```markdown
# Task 5: Asset Table UX Report
Date: [auto]

## Column Resize
- Implemented: [YES/NO]
- Persists in localStorage: [YES/NO]
- Mobile behavior: [HIDDEN/ENABLED/CONFLICT]

## Long Text
- Ellipsis on overflow: [YES/NO]
- Tooltip on hover: [YES/NO]
- Expand on edit: [YES/NO]

## XLSX Import
- SheetJS installed: [YES/ALREADY EXISTED]
- Import accepts .xlsx: [YES/NO]
- Column mapping: [AUTO/MANUAL/BY ORDER]
- Tested with sample file: [YES/NO]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "feat: asset table UX - column resize, long text, xlsx import" && git push origin main
```
