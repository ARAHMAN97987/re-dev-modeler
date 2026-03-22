import { useState, useRef, useEffect, useCallback } from "react";

// ── System prompt that teaches Claude the project state structure ──
const SYSTEM_PROMPT = `You are the AI assistant for ZAN (زان), a real estate development financial modeling platform based in Saudi Arabia.
Your job: take the user's project description, build complete JSON immediately using smart assumptions, AND ask only about things you truly cannot guess.

SMART BEHAVIOR - ASSUME + INFORM + ASK:

1. ALWAYS OUTPUT JSON on the first message. Never delay JSON output to ask questions first.

2. ASSUME with confidence (and TELL the user what you assumed):
   Use the following REAL MARKET DATA for construction costs (SAR/sqm, includes soft costs + hard costs).
   Source: AECOM 2025, Compass 2024, JLL 2024, Currie & Brown 2024, Colliers 2021, Knight Frank 2025.
   Use MID-RANGE values by default. Mention you're using market benchmark data.

   CONSTRUCTION COST REFERENCE TABLE (SAR/sqm - ALL-IN including soft costs):
   
   RESIDENTIAL:
   - Low-rise apartments/townhouse: 4,500 - 6,000 (mid: 5,250)
   - Medium-rise apartments: 5,500 - 7,500 (mid: 6,500)
   - High-rise apartments: 7,000 - 11,000 (mid: 9,000)
   - Villas standard: 4,000 - 5,500 (mid: 4,750)
   - Villas mid-market: 4,500 - 7,000 (mid: 5,750)
   - Villas high-end: 5,500 - 9,000 (mid: 7,250)
   
   COMMERCIAL (OFFICE):
   - Low-rise shell & core: 4,000 - 6,000 (mid: 5,000)
   - Medium-rise shell & core: 5,000 - 7,000 (mid: 6,000)
   - High-rise shell & core: 6,000 - 12,000 (mid: 9,000)
   - Fit-out basic: 3,750 - 6,000 (mid: 4,875)
   - Fit-out medium: 5,500 - 8,500 (mid: 7,000)
   - Fit-out high: 7,500 - 11,000 (mid: 9,250)
   
   RETAIL:
   - Community retail: 5,000 - 6,750 (mid: 5,875)
   - Regional mall: 5,500 - 8,250 (mid: 6,875)
   - Super regional mall: 6,375 - 10,125 (mid: 8,250)
   - Strip retail: 4,500 - 5,000 (mid: 4,750)
   
   HOSPITALITY:
   - Budget hotel: 6,750 - 10,500 (mid: 8,625)
   - 3-star hotel: 5,000 - 11,500 (mid: 8,250)
   - 4-star hotel: 8,700 - 13,250 (mid: 10,975)
   - 5-star hotel: 12,000 - 17,000 (mid: 14,500)
   - 5-star resort: 14,600 - 24,000 (mid: 19,300)
   
   HEALTHCARE & EDUCATION:
   - Schools (primary/secondary): 5,250 - 10,000 (mid: 7,625)
   - District hospital: 8,625 - 13,100 (mid: 10,862)
   
   INDUSTRIAL:
   - Light duty factory: 2,800 - 4,500 (mid: 3,650)
   - Heavy duty factory: 4,500 - 6,750 (mid: 5,625)
   - Logistics warehouse: 3,000 - 8,900 (mid: 5,950)
   
   CAR PARKING:
   - Basement: 2,900 - 4,875 (mid: 3,887)
   - Multi-storey/above grade: 2,200 - 4,125 (mid: 3,162)
   - On grade/surface: 500 - 1,200 (mid: 850)

   NOTE: These costs ALREADY include soft costs and hard costs combined. So when using these in the model, set softCostPct = 0 and contingencyPct = 0 since they're baked in. ALWAYS mention this to the user.

   OTHER DEFAULTS TO ASSUME:
   - Lease rates (residential ~700, retail ~1,200-2,000, office ~900, based on city)
   - Efficiency ratios (residential 85%, retail 80%, office 90%)
   - Rent escalation (0.75% annual default)
   - Ramp-up years (3 years default)
   - Stabilized occupancy (retail 95%, office 90%, residential 95%, hotel 70%)
   - If debt mentioned without rate: assume 6.5%, 7yr tenor, 3yr grace
   - Land lease defaults: 5% escalation every 5 years, 5yr grace
   - Construction duration: low-rise ~18mo, medium-rise ~24mo, high-rise towers ~30mo, malls ~24mo, hotels ~36mo

3. MUST ASK (cannot assume - too project-specific):
   - Financing mode (if not mentioned): "التمويل: ذاتي؟ بنكي؟ صندوق استثماري؟"
   - Exit strategy (if not mentioned): "الخروج: تحتفظ بالمشروع للدخل؟ ولا تبيع بعد فترة؟"
   - Islamic or conventional finance (if debt mentioned but not specified)
   - Waterfall terms (if fund mode mentioned but no details)

4. RESPONSE FORMAT - always this structure:
   a) Brief acknowledgment of the project
   b) JSON block with all data (assumed + stated)
   c) "افتراضاتي:" / "My assumptions:" section listing what you assumed with values, so user can review
   d) 1-3 questions ONLY for things you truly cannot assume (financing mode, exit strategy)
   e) Remind user: "طبّق البيانات وعدّل أي شي تبي من الموديل مباشرة" / "Apply and adjust anything directly in the model"

5. Use the user's language (Arabic if they write Arabic, English if English).
6. When user answers follow-up questions, output a NEW JSON with only the additional/changed fields.
7. When user says "طبّق" / "apply" / "كفاية" / "enough" / "تمام", output final JSON.

JSON OUTPUT RULES:
- Wrap JSON in \`\`\`json ... \`\`\` code fences.
- Only include fields with actual data.
- All monetary values in SAR unless stated otherwise.
- "مليون" or "million" = x1,000,000. "مليار" or "billion" = x1,000,000,000.
- Support incremental updates: "_action": "add_assets" to append assets without replacing.

PROJECT STATE SCHEMA:
{
  "name": "string - project name",
  "location": "string - city/area",
  "startYear": "number - e.g. 2025",
  "horizon": "number - projection years, default 50",
  "currency": "SAR",
  "landType": "lease | purchase | partner | bot",
  "landArea": "number - sqm",
  "landRentAnnual": "number - SAR/year (if lease)",
  "landRentEscalation": "number - % every N years (if lease), default 5",
  "landRentEscalationEveryN": "number - years between escalations, default 5",
  "landRentGrace": "number - grace years, default 5",
  "landRentTerm": "number - lease term years",
  "landPurchasePrice": "number - SAR (if purchase)",
  "partnerEquityPct": "number - % (if partner)",
  "landValuation": "number - SAR (if partner)",
  "botOperationYears": "number - (if bot)",
  "softCostPct": "number - default 10",
  "contingencyPct": "number - default 5",
  "rentEscalation": "number - annual % default 0.75",
  "defaultEfficiency": "number - % default 85",
  "defaultLeaseRate": "number - SAR/sqm",
  "defaultCostPerSqm": "number - SAR/sqm",
  "phases": [{ "name": "string", "startYearOffset": "number", "footprint": "number sqm" }],
  "assets": [{
    "id": "auto-generated UUID",
    "phase": "string - must match a phase name",
    "category": "Hospitality|Retail|Office|Residential|Flexible|Marina|Cultural|Amenity|Open Space|Utilities|Industrial|Infrastructure",
    "name": "string",
    "code": "string - short code e.g. T1, M1, H1",
    "notes": "string",
    "plotArea": "number sqm",
    "footprint": "number sqm - building footprint",
    "gfa": "number sqm - gross floor area (floors x footprint)",
    "revType": "Lease|Sale|Operating",
    "efficiency": "number % - net leasable ratio",
    "leaseRate": "number SAR/sqm/year (if Lease)",
    "opEbitda": "number SAR/year (if Operating, for custom EBITDA)",
    "escalation": "number - annual rent escalation %",
    "rampUpYears": "number - years to reach stabilized occupancy, default 3",
    "stabilizedOcc": "number % - target occupancy, default 100",
    "costPerSqm": "number SAR/sqm - construction cost",
    "constrStart": "number - year offset from project start",
    "constrDuration": "number - months",
    "hotelPL": "object or null - only for hotels/resorts",
    "marinaPL": "object or null - only for marinas"
  }],
  "finMode": "self|debt|fund",
  "vehicleType": "fund|direct|spv",
  "debtAllowed": "boolean",
  "maxLtvPct": "number %",
  "financeRate": "number %",
  "loanTenor": "number years",
  "debtGrace": "number years",
  "upfrontFeePct": "number %",
  "repaymentType": "amortizing|bullet",
  "islamicMode": "conventional|murabaha|ijara",
  "exitStrategy": "sale|hold|caprate",
  "exitYear": "number - 0 for auto",
  "exitMultiple": "number - x annual rent",
  "exitCostPct": "number %",
  "prefReturnPct": "number % - preferred return for waterfall",
  "gpCatchup": "boolean",
  "carryPct": "number % - GP carry",
  "lpProfitSplitPct": "number % - LP share of profits"
}

HOTEL P&L OBJECT (hotelPL):
{ "keys": rooms, "adr": SAR/night, "stabOcc": %, "daysYear": 365,
  "roomsPct": % of total rev, "fbPct": %, "micePct": %, "otherPct": %,
  "roomExpPct": %, "fbExpPct": %, "miceExpPct": %, "otherExpPct": %,
  "undistPct": %, "fixedPct": % }

MARINA P&L OBJECT (marinaPL):
{ "berths": count, "avgLength": meters, "unitPrice": SAR/m/year, "stabOcc": %,
  "fuelPct": %, "otherRevPct": %, "berthingOpexPct": %, "fuelOpexPct": %, "otherOpexPct": % }

EXAMPLE - Smart assume + ask:

User: "مشروع سكني تجاري في جدة، أرض 30,000 م² إيجار 1.5 مليون، برجين سكنيين + مول"
Response:
تم بناء الموديل. إليك البيانات:
\`\`\`json
{
  "name": "مشروع سكني تجاري - جدة",
  "location": "جدة",
  "landType": "lease",
  "landArea": 30000,
  "landRentAnnual": 1500000,
  "landRentEscalation": 5,
  "landRentEscalationEveryN": 5,
  "landRentGrace": 5,
  "landRentTerm": 30,
  "softCostPct": 10,
  "contingencyPct": 5,
  "rentEscalation": 0.75,
  "phases": [{ "name": "Phase 1", "startYearOffset": 1, "footprint": 0 }],
  "assets": [
    { "phase": "Phase 1", "category": "Residential", "name": "برج سكني 1", "code": "R1", "plotArea": 10000, "footprint": 2500, "gfa": 50000, "revType": "Lease", "efficiency": 85, "leaseRate": 700, "stabilizedOcc": 95, "rampUpYears": 3, "escalation": 0.75, "costPerSqm": 3500, "constrStart": 1, "constrDuration": 30 },
    { "phase": "Phase 1", "category": "Residential", "name": "برج سكني 2", "code": "R2", "plotArea": 10000, "footprint": 2500, "gfa": 50000, "revType": "Lease", "efficiency": 85, "leaseRate": 700, "stabilizedOcc": 95, "rampUpYears": 3, "escalation": 0.75, "costPerSqm": 3500, "constrStart": 1, "constrDuration": 30 },
    { "phase": "Phase 1", "category": "Retail", "name": "مول تجاري", "code": "M1", "plotArea": 10000, "footprint": 8000, "gfa": 24000, "revType": "Lease", "efficiency": 80, "leaseRate": 1500, "stabilizedOcc": 95, "rampUpYears": 3, "escalation": 0.75, "costPerSqm": 4000, "constrStart": 1, "constrDuration": 24 }
  ]
}
\`\`\`

**افتراضاتي** (عدّل أي شي تبي من الموديل مباشرة):
- تكلفة بناء: سكني 3,500 ر.س/م² | تجاري 4,000 ر.س/م²
- إيجار: سكني 700 ر.س/م² | تجاري 1,500 ر.س/م²
- مدة بناء: أبراج 30 شهر | مول 24 شهر
- إيجار الأرض: زيادة 5% كل 5 سنوات، سماح 5 سنوات
- إشغال مستقر 95%، فترة تصاعد 3 سنوات

**أحتاج أعرف:**
1. **التمويل** - ذاتي؟ بنكي؟ صندوق استثماري؟
2. **الخروج** - تحتفظ بالمشروع للدخل؟ ولا تبيع بعد فترة؟

IMPORTANT:
- When "_action" is "add_assets", only append the new assets to existing ones.
- When "_action" is absent, it's a full/initial project setup - replace all fields provided.
- Use Arabic names if user writes in Arabic, English if English.
- ALWAYS output JSON immediately. NEVER delay JSON to ask questions first.
- ALWAYS list your assumptions clearly after the JSON so user knows what to verify.
- Only ASK about financing mode and exit strategy if not mentioned - these are the only things you cannot assume.

ROLE 2: FINANCIAL ADVISOR & STRATEGIC ANALYST

When the user asks for analysis, advice, or says "حلل" / "شو رأيك" / "analyze" / "evaluate" / "recommendations", switch to advisor mode.
You will receive the model results (IRR, NPV, DSCR, CAPEX, Revenue, etc.) in the project context.

ANALYSIS FRAMEWORK:

1. **PROJECT HEALTH CHECK** - Traffic light assessment:
   - 🟢 IRR > 15% = Strong | 🟡 12-15% = Acceptable | 🔴 < 12% = Weak
   - 🟢 DSCR > 1.4 = Safe | 🟡 1.25-1.4 = Tight | 🔴 < 1.25 = Risky (banks likely reject)
   - 🟢 NPV positive = Value creating | 🔴 NPV negative = Destroying value
   - 🟢 Payback < 7 years = Good | 🟡 7-12 = Moderate | 🔴 > 12 = Long
   - Check: Is total CAPEX reasonable for the location and asset types?

2. **CAPITAL STRUCTURE OPTIMIZATION** - Proactively analyze and suggest:
   - If self-funded: "Have you considered bank financing? At 60% LTV, your equity IRR could jump from X% to Y% due to leverage"
   - If heavily debt: "DSCR is tight. Consider reducing LTV from 70% to 55%, or bringing in equity investors"
   - If fund structure: "With LP preferred return at 15%, the GP carry only kicks in above that. Consider if 12% pref is more realistic for this project type"
   - Compare: What if you switch from debt to fund? Or from fund to debt + self-equity?
   - Always quantify: "Reducing LTV by 10% would improve DSCR from 1.1 to 1.35"

3. **GOVERNMENT INCENTIVES DISCOVERY** - ALWAYS ask about and suggest:
   Saudi government programs the project might qualify for:
   - **CAPEX Grants**: Tourism Development Fund (TDF) for hospitality, NHC for residential, RCRC for heritage areas
   - **Interest Rate Subsidies**: Kafalah guarantee program, Saudi Industrial Development Fund (SIDF)
   - **Land Rent Rebates**: Economic Cities Authority, MODON for industrial, Royal Commission areas
   - **Tax/Fee Exemptions**: Special Economic Zones, NEOM, Qiddiya, Red Sea Global zones
   - **Soft Loans**: Tourism Development Fund, Real Estate Development Fund (REDF) for residential
   - Ask: "هل المشروع في منطقة اقتصادية خاصة؟" / "Is the project in a special economic zone?"
   - Ask: "هل فيه دعم حكومي متاح لهذا النوع من المشاريع؟" / "Have you explored government support programs?"
   - If hospitality: suggest TDF support explicitly
   - If residential: suggest NHC/REDF programs
   - If industrial: suggest MODON/SIDF programs

4. **REVENUE OPTIMIZATION** - Check and suggest:
   - Are lease rates below market? Compare with benchmarks
   - Occupancy assumptions realistic? Compare with market
   - Is there a better revenue mix? (e.g., add F&B to retail, add co-working to office)
   - Rent escalation too low? Saudi market supports 3-5% for commercial in prime areas
   - Suggest value-add: "Adding a gym/pool amenity could increase residential rent by 10-15%"

5. **COST OPTIMIZATION** - Check and flag:
   - Construction cost vs market benchmarks (from the AECOM/JLL/Compass data)
   - "Your hotel cost at 15,000/sqm is above the 4-star market range (8,700-13,250). Consider value engineering"
   - Phasing strategy: "Building in 2 phases reduces upfront CAPEX and improves cash flow timing"
   - Soft costs seem high/low?

6. **EXIT STRATEGY EVALUATION** - Compare options:
   - Hold vs sell: "If you hold for income, your yield is X%. If you sell at year 7 at 9% cap rate, your IRR jumps to Y%"
   - Partial exit: "Consider selling the retail component and holding the residential for rental income"
   - Refinance: "After stabilization, refinancing at a lower rate could free up X million in equity"

7. **SCENARIO SUGGESTIONS** - Proactively suggest:
   - "Run these 3 scenarios: Base case / CAPEX +15% / Rent -10% to stress-test the project"
   - "What if construction delays 6 months? Your carrying cost increases by X million"

RESPONSE STYLE FOR ANALYSIS:
- Be direct and decisive, like a senior financial advisor
- Use numbers and percentages, not vague statements
- Prioritize the 2-3 most impactful recommendations
- Use the user's language (Arabic/English)
- Format with clear sections and bold key numbers
- End with "Next actions" listing 2-3 specific steps`;

// ── Styles ──
const panelStyle = {
  position: "fixed", top: 0, right: 0, width: 480, maxWidth: "92vw", height: "100vh",
  background: "#0c0f16", color: "#d0d4dc", display: "flex", flexDirection: "column",
  zIndex: 9999, boxShadow: "-4px 0 32px rgba(0,0,0,0.5)",
  fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
  borderLeft: "1px solid #1a1f2e",
};
const headerStyle = {
  padding: "14px 18px", borderBottom: "1px solid #1a1f2e",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};
const msgAreaStyle = {
  flex: 1, overflowY: "auto", padding: "16px 18px",
  display: "flex", flexDirection: "column", gap: 12,
};
const inputBarStyle = {
  padding: "12px 16px", borderTop: "1px solid #1a1f2e",
  display: "flex", gap: 8, alignItems: "flex-end",
};
const btnStyle = {
  border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
};

// ── Simple Markdown to JSX renderer ──
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Empty line = spacing
    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: 6 }} />);
      continue;
    }

    // Numbered list: "1. text" or "١. text"
    const numMatch = line.match(/^\s*(\d+[\.\)٫])\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, padding: "2px 0", marginRight: 8 }}>
          <span style={{ color: "#2EC4B6", fontWeight: 600, minWidth: 18 }}>{numMatch[1]}</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Bullet: "- text"
    const bulletMatch = line.match(/^\s*[-•]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, padding: "2px 0", paddingRight: 4, marginRight: 8 }}>
          <span style={{ color: "#2EC4B6", marginTop: 2 }}>●</span>
          <span>{renderInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Sub-bullet: "  - text"
    const subBulletMatch = line.match(/^\s{2,}[-•]\s+(.*)/);
    if (subBulletMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, padding: "1px 0", paddingRight: 16 }}>
          <span style={{ color: "#4a5568", marginTop: 2 }}>○</span>
          <span>{renderInline(subBulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Regular line
    elements.push(<div key={key++} style={{ padding: "1px 0" }}>{renderInline(line)}</div>);
  }

  return elements;
}

// Inline markdown: **bold**, *italic*, `code`
function renderInline(text) {
  if (!text) return text;
  const parts = [];
  let remaining = text;
  let k = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0]);
      if (idx > 0) parts.push(<span key={k++}>{remaining.substring(0, idx)}</span>);
      parts.push(<span key={k++} style={{ fontWeight: 700, color: "#e2e8f0" }}>{boldMatch[1]}</span>);
      remaining = remaining.substring(idx + boldMatch[0].length);
      continue;
    }
    // Code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch) {
      const idx = remaining.indexOf(codeMatch[0]);
      if (idx > 0) parts.push(<span key={k++}>{remaining.substring(0, idx)}</span>);
      parts.push(<span key={k++} style={{ background: "#1e2230", padding: "1px 5px", borderRadius: 3, fontSize: "0.9em", color: "#2EC4B6" }}>{codeMatch[1]}</span>);
      remaining = remaining.substring(idx + codeMatch[0].length);
      continue;
    }
    // No more matches
    parts.push(<span key={k++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Component ──
export default function AiAssistant({ open, onClose, project, onApply, lang, projectIndex, loadProjectFn, results, financing, waterfall }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attachments, setAttachments] = useState([]); // {file, preview, type}
  const [isRecording, setIsRecording] = useState(false);
  const msgEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const isAr = lang === "ar";

  // Auto-scroll to bottom
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // ── File Processing ──
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      const isImage = file.type.startsWith("image/");
      const isPDF = ext === "pdf";
      const isCSV = ext === "csv" || ext === "tsv";
      const isExcel = ext === "xlsx" || ext === "xls";

      if (isImage || isPDF) {
        // Convert to base64 for Claude API
        const base64 = await fileToBase64(file);
        setAttachments(prev => [...prev, {
          file, type: isImage ? "image" : "pdf",
          base64, mediaType: file.type || (isPDF ? "application/pdf" : "image/png"),
          preview: isImage ? URL.createObjectURL(file) : null,
        }]);
      } else if (isCSV) {
        const text = await file.text();
        const preview = text.split("\n").slice(0, 5).join("\n");
        setAttachments(prev => [...prev, { file, type: "csv", textContent: text, preview }]);
      } else if (isExcel) {
        // Read Excel using SheetJS (available in project)
        try {
          const buf = await file.arrayBuffer();
          // Dynamic import to avoid issues if not available
          const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
          const wb = XLSX.read(buf, { type: "array" });
          let allText = "";
          for (const sn of wb.SheetNames) {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn]);
            allText += `\n=== Sheet: ${sn} ===\n${csv}`;
          }
          setAttachments(prev => [...prev, { file, type: "excel", textContent: allText, preview: `${wb.SheetNames.length} sheets` }]);
        } catch {
          setError(isAr ? "خطأ في قراءة ملف Excel" : "Error reading Excel file");
        }
      } else {
        setError(isAr ? "نوع ملف غير مدعوم" : "Unsupported file type");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Voice Recording (Web Speech API) ──
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(isAr ? "المتصفح لا يدعم التعرف على الصوت" : "Browser doesn't support speech recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = isAr ? "ar-SA" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = input;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim = t;
        }
      }
      setInput(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (e) => {
      if (e.error !== "aborted") setError(`Speech error: ${e.error}`);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // Reset on new open with no messages
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: isAr
          ? "مرحباً! أنا مساعد النمذجة المالية.\n\nصِف مشروعك وسأعبّي البيانات تلقائياً في الموديل.\n\nيمكنك أيضاً:\n- إرفاق ملفات (Excel, PDF, صور, CSV)\n- تسجيل صوتي بالضغط على 🎤\n\nمثال: \"مشروع سكني في الرياض، أرض 20,000 م² شراء بـ 50 مليون، 3 أبراج سكنية، تكلفة بناء 300 مليون، تمويل بنكي 60%\""
          : "Hello! I'm the financial modeling assistant.\n\nDescribe your project and I'll auto-fill the model.\n\nYou can also:\n- Attach files (Excel, PDF, images, CSV)\n- Voice record by pressing 🎤\n\nExample: \"Mixed-use project in Riyadh, 20,000 sqm land purchased for 50M SAR, 3 residential towers, 300M construction cost, 60% bank financing\"",
        parsed: null,
      }]);
    }
  }, [open]);

  const extractJSON = (text) => {
    // Try to find JSON in code fences
    const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
    }
    // Try to find raw JSON object
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch { /* fall through */ }
    }
    return null;
  };

  const applyToProject = useCallback((parsed) => {
    if (!parsed || !onApply) return;

    // Handle incremental asset additions
    if (parsed._action === "add_assets" && parsed.assets) {
      const newAssets = parsed.assets.map(a => ({
        id: crypto.randomUUID(),
        phase: a.phase || project?.phases?.[0]?.name || "Phase 1",
        category: a.category || "Retail",
        name: a.name || "",
        code: a.code || "",
        notes: a.notes || "",
        plotArea: a.plotArea || 0,
        footprint: a.footprint || 0,
        gfa: a.gfa || 0,
        revType: a.revType || "Lease",
        efficiency: a.efficiency || 85,
        leaseRate: a.leaseRate || 0,
        opEbitda: a.opEbitda || 0,
        escalation: a.escalation ?? 0.75,
        rampUpYears: a.rampUpYears ?? 3,
        stabilizedOcc: a.stabilizedOcc ?? 100,
        costPerSqm: a.costPerSqm || 0,
        constrStart: a.constrStart || 1,
        constrDuration: a.constrDuration || 24,
        hotelPL: a.hotelPL || null,
        marinaPL: a.marinaPL || null,
      }));
      onApply({ assets: [...(project?.assets || []), ...newAssets] });
      return;
    }

    // Full project setup - build the update object
    const update = {};
    const directFields = [
      "name", "location", "startYear", "horizon", "currency",
      "landType", "landArea", "landRentAnnual", "landRentEscalation",
      "landRentEscalationEveryN", "landRentGrace", "landRentTerm",
      "landPurchasePrice", "partnerEquityPct", "landValuation", "botOperationYears",
      "softCostPct", "contingencyPct", "rentEscalation", "vacancyPct",
      "defaultEfficiency", "defaultLeaseRate", "defaultCostPerSqm",
      "finMode", "vehicleType", "debtAllowed", "maxLtvPct", "financeRate",
      "loanTenor", "debtGrace", "upfrontFeePct", "repaymentType", "islamicMode",
      "exitStrategy", "exitYear", "exitMultiple", "exitCapRate", "exitCostPct",
      "prefReturnPct", "gpCatchup", "carryPct", "lpProfitSplitPct",
      "fundName", "fundStrategy",
      "landCapitalize", "landCapRate", "landCapTo",
      "subscriptionFeePct", "annualMgmtFeePct", "custodyFeeAnnual",
      "developerFeePct", "structuringFeePct",
    ];

    for (const f of directFields) {
      if (parsed[f] !== undefined) update[f] = parsed[f];
    }

    // Phases
    if (parsed.phases && Array.isArray(parsed.phases)) {
      update.phases = parsed.phases.map((p, i) => ({
        name: p.name || `Phase ${i + 1}`,
        startYearOffset: p.startYearOffset ?? (i + 1),
        footprint: p.footprint || 0,
      }));
    }

    // Assets - full replace
    if (parsed.assets && Array.isArray(parsed.assets)) {
      update.assets = parsed.assets.map(a => ({
        id: crypto.randomUUID(),
        phase: a.phase || update.phases?.[0]?.name || project?.phases?.[0]?.name || "Phase 1",
        category: a.category || "Retail",
        name: a.name || "",
        code: a.code || "",
        notes: a.notes || "",
        plotArea: a.plotArea || 0,
        footprint: a.footprint || 0,
        gfa: a.gfa || 0,
        revType: a.revType || "Lease",
        efficiency: a.efficiency ?? 85,
        leaseRate: a.leaseRate || 0,
        opEbitda: a.opEbitda || 0,
        escalation: a.escalation ?? 0.75,
        rampUpYears: a.rampUpYears ?? 3,
        stabilizedOcc: a.stabilizedOcc ?? 100,
        costPerSqm: a.costPerSqm || 0,
        constrStart: a.constrStart || 1,
        constrDuration: a.constrDuration || 24,
        hotelPL: a.hotelPL || null,
        marinaPL: a.marinaPL || null,
      }));
    }

    if (Object.keys(update).length > 0) {
      onApply(update);
    }
  }, [project, onApply]);

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;

    setInput("");
    setError(null);

    // Build display message for user
    const fileNames = attachments.map(a => a.file.name).join(", ");
    const displayContent = text + (fileNames ? `\n📎 ${fileNames}` : "");
    const userMsg = { role: "user", content: displayContent };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Build the API message content (multimodal)
    const contentParts = [];

    // Add file attachments
    for (const att of attachments) {
      if (att.type === "image") {
        contentParts.push({
          type: "image",
          source: { type: "base64", media_type: att.mediaType, data: att.base64 },
        });
      } else if (att.type === "pdf") {
        contentParts.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: att.base64 },
        });
      } else if (att.type === "csv" || att.type === "excel") {
        contentParts.push({
          type: "text",
          text: `[File: ${att.file.name}]\n${att.textContent}`,
        });
      }
    }

    // Add user text
    contentParts.push({ type: "text", text: text || (isAr ? "حلل الملف المرفق" : "Analyze the attached file") });

    // Clear attachments after sending
    const sentAttachments = [...attachments];
    setAttachments([]);

    // Build conversation history
    const apiMessages = [...messages.filter((m, idx) => idx > 0), { role: "user", content: contentParts.length === 1 ? text : contentParts }]
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => {
        // For history messages, keep only text content
        if (typeof m.content === "string") return { role: m.role, content: m.content };
        if (Array.isArray(m.content)) return { role: m.role, content: m.content };
        return { role: m.role, content: String(m.content) };
      });

    // Build context: current project + model results + other saved projects
    const projectContext = project
      ? `\nCurrent project context: ${JSON.stringify({
          name: project.name,
          location: project.location,
          landType: project.landType,
          landArea: project.landArea,
          landRentAnnual: project.landRentAnnual,
          landPurchasePrice: project.landPurchasePrice,
          phases: project.phases,
          assetsCount: (project.assets || []).length,
          existingAssets: (project.assets || []).map(a => ({ name: a.name, category: a.category, phase: a.phase, gfa: a.gfa, costPerSqm: a.costPerSqm, leaseRate: a.leaseRate, revType: a.revType })),
          finMode: project.finMode,
          debtAllowed: project.debtAllowed,
          maxLtvPct: project.maxLtvPct,
          financeRate: project.financeRate,
          exitStrategy: project.exitStrategy,
          exitYear: project.exitYear,
          prefReturnPct: project.prefReturnPct,
          carryPct: project.carryPct,
          incentives: project.incentives,
        })}` +
        (results ? `\n\nMODEL RESULTS (use these for analysis):\n${JSON.stringify({
          totalCAPEX: results.totalCapex,
          totalRevenue50yr: results.totalRevenue,
          consolidatedIRR: results.consolidatedIRR,
          consolidatedNPV: results.consolidatedNPV,
          year1Income: results.year1Income,
          stabilizedIncome: results.stabilizedIncome,
          phaseResults: results.phaseResults?.map(p => ({
            phase: p.phase,
            capex: p.totalCapex,
            irr: p.irr,
            npv: p.npv,
            year1Income: p.year1Income,
          })),
        })}` : "") +
        (financing ? `\n\nFINANCING RESULTS:\n${JSON.stringify({
          totalEquity: financing.totalEquity,
          totalDebt: financing.totalDebt,
          ltvActual: financing.ltvActual,
          avgDSCR: financing.avgDSCR,
          minDSCR: financing.minDSCR,
          totalInterest: financing.totalInterest,
          leveredIRR: financing.leveredIRR,
        })}` : "") +
        (waterfall ? `\n\nWATERFALL RESULTS:\n${JSON.stringify({
          lpIRR: waterfall.lpIRR,
          gpIRR: waterfall.gpIRR,
          lpMOIC: waterfall.lpMOIC,
          gpMOIC: waterfall.gpMOIC,
          totalDistributions: waterfall.totalDistributions,
        })}` : "")
      : "";

    // Include other saved projects as reference
    const otherProjects = (projectIndex || [])
      .filter(p => p.id !== project?.id)
      .map(p => ({ id: p.id, name: p.name, status: p.status, updatedAt: p.updatedAt }));
    const projectsListContext = otherProjects.length > 0
      ? `\n\nOther saved projects the user has (can reference or copy from):\n${JSON.stringify(otherProjects)}\nIf the user wants to reference or copy from another project, respond with: \`\`\`json\n{"_action": "load_project", "projectId": "THE_ID"}\n\`\`\`\nThe app will load that project's data and send it back to you in the next message so you can adapt it.`
      : "";

    // Check if we need to load a referenced project's data
    let referencedProjectData = "";
    if (loadProjectFn && text.match(/مشابه|مثل|زي|نسخة|copy|similar|like|based on|reference/i)) {
      // Find if any project name matches
      for (const p of otherProjects) {
        if (text.includes(p.name) || text.includes(p.id)) {
          try {
            const refProj = await loadProjectFn(p.id);
            if (refProj) {
              referencedProjectData = `\n\nREFERENCED PROJECT DATA (user wants something similar to "${p.name}"):\n${JSON.stringify({
                name: refProj.name, location: refProj.location, landType: refProj.landType, landArea: refProj.landArea,
                landRentAnnual: refProj.landRentAnnual, landRentEscalation: refProj.landRentEscalation,
                softCostPct: refProj.softCostPct, contingencyPct: refProj.contingencyPct,
                phases: refProj.phases,
                assets: (refProj.assets || []).map(a => ({
                  phase: a.phase, category: a.category, name: a.name, plotArea: a.plotArea,
                  footprint: a.footprint, gfa: a.gfa, revType: a.revType, leaseRate: a.leaseRate,
                  costPerSqm: a.costPerSqm, constrDuration: a.constrDuration, efficiency: a.efficiency,
                  hotelPL: a.hotelPL, marinaPL: a.marinaPL,
                })),
                finMode: refProj.finMode, debtAllowed: refProj.debtAllowed, maxLtvPct: refProj.maxLtvPct,
                financeRate: refProj.financeRate, exitStrategy: refProj.exitStrategy,
                prefReturnPct: refProj.prefReturnPct, carryPct: refProj.carryPct,
              })}\nUse this as a template. Adapt the location, name, and any specifics the user mentioned. Keep the structure and parameters similar unless the user says otherwise.`;
            }
          } catch { /* ignore load errors */ }
          break;
        }
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT + projectContext + projectsListContext + referencedProjectData,
          messages: apiMessages.length > 0 ? apiMessages : [{ role: "user", content: text }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errData.error || `API Error ${res.status}`);
      }

      const data = await res.json();
      const assistantText = data.content?.map(c => c.text || "").join("") || "";

      // Try to extract and parse JSON
      const parsed = extractJSON(assistantText);

      // Clean display text (remove JSON block for display)
      const displayText = assistantText.replace(/```json[\s\S]*?```/g, "").trim();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: assistantText,
        displayText: displayText || (isAr ? "تم تحليل البيانات ✓" : "Data parsed ✓"),
        parsed,
      }]);

    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: isAr ? "حدث خطأ في الاتصال. حاول مرة أخرى." : "Connection error. Please try again.",
        parsed: null,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }} />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2EC4B6, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{isAr ? "مساعد الذكاء الاصطناعي" : "AI Assistant"}</div>
              <div style={{ fontSize: 10, color: "#6b7080" }}>{isAr ? "وصف مشروعك وسأعبّي البيانات" : "Describe your project to auto-fill"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ ...btnStyle, background: "#1a1f2e", color: "#6b7080", padding: "6px 10px", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={msgAreaStyle}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
              {/* Message bubble */}
              <div style={{
                maxWidth: "92%", padding: "12px 16px", borderRadius: 14,
                background: m.role === "user" ? "#1e3a5f" : "#151922",
                color: m.role === "user" ? "#93c5fd" : "#c8cdd8",
                fontSize: 13, lineHeight: 1.65,
                border: m.role === "user" ? "1px solid #2a4a6f" : "1px solid #1e2230",
              }}>
                {m.role === "user"
                  ? (m.displayText || m.content)
                  : renderMarkdown(m.displayText || m.content)
                }
              </div>

              {/* Apply button for parsed responses */}
              {m.parsed && m.role === "assistant" && (
                <button
                  onClick={() => {
                    applyToProject(m.parsed);
                    setMessages(prev => prev.map((msg, j) =>
                      j === i ? { ...msg, applied: true } : msg
                    ));
                  }}
                  disabled={m.applied}
                  style={{
                    ...btnStyle,
                    background: m.applied ? "#0a2a1a" : "linear-gradient(135deg, #16a34a, #15803d)",
                    color: m.applied ? "#4ade80" : "#fff",
                    padding: "7px 16px", fontSize: 11, fontWeight: 600,
                    opacity: m.applied ? 0.7 : 1,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {m.applied
                    ? (isAr ? "✓ تم التطبيق" : "✓ Applied")
                    : (isAr ? "⚡ طبّق على المشروع" : "⚡ Apply to Project")}
                </button>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#151922", borderRadius: 12, border: "1px solid #1e2230", alignSelf: "flex-start" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: 3, background: "#2EC4B6",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "#6b7080" }}>{isAr ? "جاري التحليل..." : "Analyzing..."}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: "8px 12px", background: "#2a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, fontSize: 11, color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <div ref={msgEndRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length <= 1 && (
          <div style={{ padding: "0 16px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(isAr ? [
              "مشروع فندقي 5 نجوم في نيوم",
              "مجمع سكني في الرياض",
              "مول تجاري + أبراج مكتبية في جدة",
            ] : [
              "5-star hotel resort in NEOM",
              "Residential compound in Riyadh",
              "Mall + office towers in Jeddah",
            ]).map((s, i) => (
              <button key={i} onClick={() => setInput(s)} style={{
                ...btnStyle, background: "#1a1f2e", color: "#8b90a0", padding: "5px 10px",
                fontSize: 10.5, border: "1px solid #252a3a",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.target.style.background = "#252a3a"; e.target.style.color = "#c8cdd8"; }}
                onMouseLeave={e => { e.target.style.background = "#1a1f2e"; e.target.style.color = "#8b90a0"; }}
              >{s}</button>
            ))}
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div style={{ padding: "8px 16px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {attachments.map((att, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 8px",
                background: "#1a1f2e", borderRadius: 8, border: "1px solid #252a3a", fontSize: 11,
              }}>
                {att.type === "image" && att.preview && (
                  <img src={att.preview} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />
                )}
                <span style={{ color: "#8b90a0" }}>
                  {att.type === "pdf" ? "📄" : att.type === "excel" ? "📊" : att.type === "csv" ? "📋" : "🖼️"}
                </span>
                <span style={{ color: "#c8cdd8", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.file.name}</span>
                <button onClick={() => removeAttachment(i)} style={{ ...btnStyle, background: "none", color: "#6b7080", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={inputBarStyle}>
          {/* File upload button */}
          <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.tsv,.xlsx,.xls" multiple onChange={handleFileSelect} style={{ display: "none" }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            title={isAr ? "إرفاق ملف" : "Attach file"}
            style={{ ...btnStyle, background: "#1a1f2e", color: "#6b7080", padding: "8px 10px", fontSize: 16, border: "1px solid #252a3a", minWidth: 40, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}
          >📎</button>

          {/* Voice recording button */}
          <button
            onClick={toggleRecording}
            title={isAr ? "تسجيل صوتي" : "Voice input"}
            style={{
              ...btnStyle,
              background: isRecording ? "#7f1d1d" : "#1a1f2e",
              color: isRecording ? "#f87171" : "#6b7080",
              padding: "8px 10px", fontSize: 16, border: isRecording ? "1px solid #ef4444" : "1px solid #252a3a",
              minWidth: 40, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
              animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          >{isRecording ? "⏹" : "🎤"}</button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAr ? "صف مشروعك هنا..." : "Describe your project here..."}
            dir="auto"
            rows={1}
            style={{
              flex: 1, resize: "none", border: "1px solid #252a3a", borderRadius: 10,
              background: "#151922", color: "#d0d4dc", padding: "10px 14px",
              fontSize: 12.5, fontFamily: "inherit", outline: "none",
              maxHeight: 120, lineHeight: 1.5,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && attachments.length === 0) || loading}
            style={{
              ...btnStyle,
              background: (input.trim() || attachments.length > 0) && !loading ? "linear-gradient(135deg, #2EC4B6, #2563eb)" : "#1a1f2e",
              color: (input.trim() || attachments.length > 0) && !loading ? "#fff" : "#4a4f5e",
              padding: "10px 14px", fontSize: 14, fontWeight: 700,
              transition: "all 0.2s",
              minWidth: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}
