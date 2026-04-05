# TASK 8: AI Copilot Enhancement

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
1. تحسين system prompt بمعرفة السوق العقاري السعودي
2. إرسال سياق المشروع الكامل مع كل رسالة
3. اختبار 3 أسئلة وإصلاح الردود

## السايكل الكامل

### 1. الفهم (Understand)

#### اقرأ الملفات المعنية بالكامل
```bash
cat api/chat.js
```

```bash
# جد مكون AI Assistant في App.jsx
grep -n "AiAssistant\|AIAssistant\|ai.*chat\|copilot\|ChatPanel" src/App.jsx | head -10
# لو في ملف منفصل:
ls src/Ai*.jsx src/ai*.jsx src/components/Ai* 2>/dev/null
cat src/AiAssistant.jsx 2>/dev/null || echo "Check App.jsx"
```

حدد:
- **System prompt الحالي:** ايش يقول للـ AI؟
- **سياق المشروع:** ايش يُرسل مع كل رسالة؟ (project data, results, settings)
- **Model:** أي موديل مستخدم؟ (claude-opus-4-6, claude-sonnet-4-6?)
- **الشخصية:** هل فيها تعليمات personality؟
- **التنسيق:** هل يستخدم react-markdown؟ هل الجداول تعرض صح؟

```bash
grep -n "system.*prompt\|systemPrompt\|system_prompt\|role.*system\|content.*You are" api/chat.js src/App.jsx src/AiAssistant.jsx 2>/dev/null | head -10
```

```bash
# ايش يُرسل كسياق مشروع؟
grep -n "projectContext\|projectData\|projectSummary\|sendContext\|contextMessage" api/chat.js src/App.jsx src/AiAssistant.jsx 2>/dev/null | head -20
```

### 2. الخطة (Plan)

**التغيير 1: تحسين System Prompt**

System prompt الجديد يجب أن يشمل:

```
أنت مستشار مالي عقاري متخصص في السوق السعودي والخليجي. اسمك مستشار حصيف.

## معرفتك
- التطوير العقاري في المملكة العربية السعودية (رؤية 2030، ROSHN، NEOM، البحر الأحمر)
- هياكل التمويل: مرابحة، إجارة، تمويل تقليدي، صناديق استثمار عقاري (REITs)
- مؤشرات الأداء: IRR، MOIC، DSCR، NOI، Cap Rate، ROE البسيط (المعيار السعودي)
- هيئة السوق المالية (CMA) ومتطلبات الإفصاح
- أنواع الأراضي: صك، منحة، إيجار حكومي (بوابة إيجار)
- الحوافز: دعم تمويل، إعفاء إيجار، قرض حسن

## أسلوبك
- مباشر وعملي — لا مقدمات ولا فلسفة
- تقدم خيارات مع إيجابيات وسلبيات كل خيار
- تشرح بأرقام من المشروع الحالي
- لا تستخدم: "بالتأكيد"، "سؤال ممتاز"، "بالطبع"
- الحد الأقصى: 300 كلمة إلا إذا طُلب تفصيل
- ترد بنفس لغة السؤال (عربي ← عربي، English ← English)

## السياق
ستتلقى بيانات المشروع الحالي مع كل رسالة. استخدمها للإجابة بدقة.
لا تخترع أرقام — استخدم فقط البيانات المقدمة.
```

**التغيير 2: إرسال سياق المشروع الكامل**

السياق اللي لازم يُرسل مع كل رسالة:
```json
{
  "projectName": "...",
  "totalAssets": 30,
  "totalGFA": "1,234,567 sqm",
  "financingMode": "fund",
  "totalCAPEX": "1,348,153,756 SAR",
  "projectIRR": "14.75%",
  "lpIRR": "12.7%",
  "gpIRR": "14.2%",
  "lpMOIC": "1.9x",
  "dscr": { "avg": "1.65x", "min": "0.24x" },
  "exitStrategy": "capRate",
  "exitYear": 2033,
  "phases": ["ZAN 1", "ZAN 2", "ZAN 3"],
  "horizon": 50,
  "debtLTV": "30%",
  "prefReturn": "15%",
  "currency": "SAR"
}
```

**التغيير 3: إصلاح عرض الجداول**
- تأكد react-markdown مع remark-gfm مفعّل
- أضف CSS للجداول داخل الـ chat

### 3. التنفيذ (Execute)

**خطوة 1: تحديث System Prompt في api/chat.js**
جد الـ system prompt وغيّره بالنص أعلاه.

```bash
npm run build
```

**خطوة 2: تحسين سياق المشروع**
جد المكان اللي يجمع سياق المشروع ويرسله. وسّعه ليشمل كل المؤشرات المذكورة.

في الـ frontend (App.jsx أو AiAssistant.jsx):
```jsx
const buildProjectContext = () => {
  const summary = {
    projectName: project.name || 'Untitled',
    totalAssets: assets.length,
    financingMode: project.finMode,
    // ... collect from results
  };
  return `\n\n--- بيانات المشروع الحالي ---\n${JSON.stringify(summary, null, 2)}`;
};
```

أضف هذا السياق لرسالة المستخدم أو كـ system message.

```bash
npm run build
```

**خطوة 3: إصلاح Markdown Tables**
```bash
# هل remark-gfm موجود؟
grep "remark-gfm\|remarkGfm" package.json src/App.jsx src/AiAssistant.jsx 2>/dev/null
```

لو مفقود:
```bash
npm install remark-gfm --save
```

في الـ chat rendering component:
```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown remarkPlugins={[remarkGfm]} 
  components={{
    table: ({children}) => <div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse', width:'100%', fontSize:13}}>{children}</table></div>,
    th: ({children}) => <th style={{border:'1px solid #e5e7eb', padding:'8px 12px', background:'#f3f4f6', fontWeight:600, textAlign:'left'}}>{children}</th>,
    td: ({children}) => <td style={{border:'1px solid #e5e7eb', padding:'8px 12px'}}>{children}</td>,
  }}
>{message.content}</ReactMarkdown>
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

شغل المنصة واختبر الـ AI Copilot بـ 3 أسئلة:

**سؤال 1 (عربي، رقمي):** "ما إجمالي التكاليف؟"
- المتوقع: يرد بالرقم الحقيقي من بيانات المشروع
- الفحص: هل الرقم صحيح؟ هل بالعربي؟

**سؤال 2 (إنجليزي، رقمي):** "What's the IRR?"
- المتوقع: يرد بالإنجليزي مع أرقام IRR (project, LP, GP)
- الفحص: هل الأرقام من المشروع الفعلي؟

**سؤال 3 (عربي، استشاري):** "كيف أحسن العوائد؟"
- المتوقع: يعطي خيارات عملية مبنية على بيانات المشروع (مثل: تقليل LTV، تغيير exit strategy)
- الفحص: هل الرد عملي ومبني على أرقام؟ هل < 300 كلمة؟

**فحص عرض الجداول:**
- اسأل سؤال يحتاج جدول في الرد (مثل: "قارن بين مراحل المشروع")
- هل الجدول يعرض بشكل منسق (borders, alignment) ولا كنص خام؟

**ملاحظة:** لو الـ API ما تستجيب (timeout أو خطأ)، سجل ذلك لكن لا تعتبره فشل — قد يكون مشكلة rate limit أو API key.

### 6-7. اكتشاف وإصلاح
- لو الـ copilot يرد بـ "لا أملك بيانات" → السياق ما يوصل → تحقق من الـ request body
- لو الجداول لا زالت خام → remark-gfm ما اتثبت أو ما اُستخدم
- لو الـ API ترجع 504 → مشكلة timeout معروفة → سجل في التقرير

### 8. التسليم (Deliver)
```bash
npm run build
node tests/engine_audit.cjs && node tests/zan_benchmark.cjs
npx vercel deploy --prod
```

اكتب تقرير في `docs/TASK8_AI_COPILOT_REPORT.md`:
```markdown
# Task 8: AI Copilot Enhancement Report
Date: [auto]

## System Prompt
- Before: [summary of old prompt]
- After: [summary of new prompt - Saudi market, personality, 300 word limit]

## Project Context
- Fields sent before: [list]
- Fields sent now: [full list]
- Context format: [JSON in user message / system message / separate field]

## Markdown Tables
- remark-gfm installed: [YES/ALREADY/NO]
- Table CSS added: [YES/NO]
- Tables render correctly: [YES/NO/PARTIAL]

## Test Questions
| Question | Language | Expected | Actual | Pass? |
|----------|----------|----------|--------|-------|
| ما إجمالي التكاليف؟ | AR | CAPEX number | ... | ✓/✗ |
| What's the IRR? | EN | IRR values | ... | ✓/✗ |
| كيف أحسن العوائد؟ | AR | Practical advice | ... | ✓/✗ |

## Known Issues
- [list any remaining issues]

## Tests: [427/427 PASSED]
## Build: [SUCCESS]
## Deploy: [URL]
```

```bash
git add -A && git commit -m "feat: enhance AI copilot - Saudi market prompt, full project context, markdown tables" && git push origin main
```
