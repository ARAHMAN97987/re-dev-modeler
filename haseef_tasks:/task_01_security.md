# TASK 1: أمان — GitHub Token

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

## المشكلة
GitHub Personal Access Token مكشوف في git remote URL. هذا خطر أمني حرج — أي شخص يقرأ `.git/config` يحصل على التوكن.

## السايكل الكامل

### 1. الفهم (Understand)
```bash
git remote -v
cat .git/config | grep -i url
git log --oneline -5
```
- سجل الـ remote URL الحالي
- تأكد هل التوكن موجود في الـ URL فعلاً
- شيك `.gitignore` — هل في ملفات حساسة مكشوفة؟
- شيك هل في ملفات بالريبو فيها tokens أو secrets:
```bash
grep -r "ghp_\|github_pat_\|sk-\|supabase\|eyJ" --include="*.js" --include="*.jsx" --include="*.json" --include="*.env" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v ".git/" | head -20
```

### 2. الخطة (Plan)
1. إزالة التوكن من git remote URL
2. التحقق من عدم وجود secrets أخرى مكشوفة في الكود
3. إضافة `.env` و `.env.local` لـ `.gitignore` إن لم تكن موجودة
4. التأكد إن الـ push لا زال يشتغل (قد يحتاج credential helper)

### 3. التنفيذ (Execute)
```bash
# إزالة التوكن من remote URL
git remote set-url origin https://github.com/ARAHMAN97987/re-dev-modeler.git

# التحقق
git remote -v

# التأكد إن .gitignore يحتوي على الملفات الحساسة
```

إذا وجدت أي secrets في ملفات الكود:
- انقلها لـ environment variables
- أضف الملفات الحساسة لـ `.gitignore`
- **لا تحذف** ملفات — فقط أضف لـ gitignore

**مهم:** بعد إزالة التوكن من الـ URL، الـ push قد يفشل بدون credentials. هذا متوقع ومقبول — المستخدم سيضيف التوكن يدوياً عند الحاجة. لا تعيد إضافة التوكن.

### 4. الفحص الآلي (Test)
```bash
npm run build
node tests/engine_audit.cjs
node tests/zan_benchmark.cjs
```
كل 427 test لازم ينجحون. هذا التغيير ما يأثر على الكود لكن تحقق للتأكد.

### 5. الفحص البصري (Browse & Verify)
- هذه المهمة لا تتطلب فحص بصري لأنها أمنية فقط
- تحقق فقط إن `git remote -v` يظهر URL بدون token

### 6-7. اكتشاف وإصلاح المشاكل
- لو لقيت secrets أخرى مكشوفة، سجلها وأصلحها
- لو لقيت `.env` files في git history، سجل ذلك في التقرير (لكن لا تحاول rewrite history)

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
```

اكتب تقرير في `docs/TASK1_SECURITY_REPORT.md`:
```markdown
# Task 1: Security Audit Report
Date: [auto]

## Remote URL
- Before: [القديم مع ***مخفي***]
- After: [الجديد بدون token]

## Secrets Scan
- Files scanned: [العدد]
- Secrets found: [القائمة أو "None"]
- Actions taken: [التفاصيل]

## .gitignore
- .env: [موجود/أضيف]
- .env.local: [موجود/أضيف]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
```

```bash
git add -A && git commit -m "security: remove exposed token from remote URL, audit secrets" && git push origin main
```

**ملاحظة:** لو الـ push فشل بسبب عدم وجود credentials، هذا متوقع. سجل ذلك في التقرير واترك الـ commit محلي. المستخدم سيرفع يدوياً.
