# ZAN Financial Modeler - Master Development Plan
## Based on Evaluation 1 + Evaluation 2 + Evaluation 3

**Document Version:** 3.0
**Date:** March 21, 2026
**Status:** Approved - ready for implementation
**Total Items:** 40 + 2 research
**Sources:**
- Eval 1 (Mar 11) = Visual/UX review → 17 items
- Eval 2 (Mar 21) = Deep UX walkthrough (12,901 lines) → 13 items
- Eval 3 (Mar 21) = Code architecture & financial reliability review → 10 items
- Research items: 2

---

## Design Tokens (from evaluation - approved)

```css
/* === COLOR SYSTEM === */

/* Core Brand */
--zan-navy: #0c1a2e;
--zan-teal: #5fbfbf;
--zan-gold: #d4a574;

/* Functional Colors (NEW - add these) */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* Neutrals */
--text-primary: #ffffff;
--text-secondary: #d0d4dc;
--border-color: #282d3a;
--bg-surface: #0f1117;

/* === SHADOWS === */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
--shadow-teal: 0 10px 25px rgba(95, 191, 191, 0.15);

/* === GRADIENTS === */
--gradient-bg: linear-gradient(135deg, #0c1a2e 0%, #0f2d4f 100%);
--gradient-btn: linear-gradient(135deg, #5fbfbf 0%, #4a9fa0 100%);
--gradient-subtle: 
  radial-gradient(circle at 20% 50%, rgba(95, 191, 191, 0.05) 0%, transparent 50%),
  radial-gradient(circle at 80% 80%, rgba(212, 165, 116, 0.03) 0%, transparent 50%);
```

---

## PHASE 1: Quick Wins (Week 1-2)

### 1.1 Auth Page Redesign [A1]

**User Story:** As a new user, I want the login page to look professional and communicate what ZAN does, so I feel confident using the platform.

**Current:** Simple white card on blue background. No branding, no value proposition.

**Target:** Split-screen layout. Left = Hero with features. Right = Login form.

**Implementation Reference:**
```jsx
// Auth page structure
const AuthGate = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    
    {/* LEFT: Hero Section */}
    <div style={{
      flex: 1,
      background: 'linear-gradient(135deg, #0c1a2e 0%, #0f2d4f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(95,191,191,0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(212,165,116,0.03) 0%, transparent 50%)
        `
      }} />
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
        {/* ZAN Logo */}
        <h1 style={{ 
          fontSize: '2.5rem', fontWeight: 900, color: '#fff',
          marginBottom: '0.5rem' 
        }}>
          ZAN Financial Modeler
        </h1>
        <p style={{ color: '#d0d4dc', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          منصة النمذجة المالية المتكاملة للمشاريع العقارية
        </p>
        
        {/* Feature highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { icon: '📊', text: 'تحليل مالي شامل - CAPEX, IRR, NPV' },
            { icon: '🏗️', text: 'سيناريوهات متعددة ومقارنة فورية' },
            { icon: '📄', text: 'تقارير احترافية وتصدير Excel' }
          ].map((f, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(95,191,191,0.08)',
              borderRadius: '8px',
              borderLeft: '3px solid #5fbfbf'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
              <span style={{ color: '#fff', fontSize: '0.95rem' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* RIGHT: Login Form */}
    <div style={{
      flex: 1, maxWidth: 520,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', padding: '3rem'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h2 style={{ color: '#fff', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          أهلاً بك
        </h2>
        <p style={{ color: '#d0d4dc', marginBottom: '2rem' }}>
          سجل دخولك للوصول إلى مشاريعك
        </p>
        
        {/* Email input */}
        {/* Password input */}
        {/* Login button with gradient */}
        {/* OR divider */}
        {/* Google login */}
        {/* Sign up link */}
        {/* Academy teaser link */}
      </div>
    </div>
  </div>
);
```

**Acceptance Criteria:**
- [ ] Split-screen layout renders correctly
- [ ] Hero section shows ZAN branding + 3 feature highlights
- [ ] Form works identically to current auth (email/password + Google)
- [ ] Responsive: stacks vertically on mobile (hero on top, form below)
- [ ] Academy teaser link still works
- [ ] Bilingual labels maintained

---

### 1.2 Empty States + Progress Tracker [Eval1-A4 + Eval2-A4 merged]

**User Story:** As a new user with no projects, I want clear guidance on what to do next, not a blank screen. After completing the wizard, I want a visual roadmap showing where I am in the setup process.

**Current:** Empty table or blank area when no data exists. After wizard completes, user lands on empty Dashboard with no clear next step.

**Target:** Custom empty state per section with icon + message + CTA button. Dashboard empty state includes a progress tracker showing the full setup journey.

**Progress Tracker (Dashboard - shows after wizard, before first asset):**
```jsx
const ProgressTracker = ({ project, lang }) => {
  const steps = [
    { 
      id: 'assets', 
      labelAr: 'إضافة أصول', labelEn: 'Add Assets',
      done: project.assets?.length > 0,
      tabTarget: 'assets'
    },
    { 
      id: 'review', 
      labelAr: 'مراجعة الأرقام', labelEn: 'Review Numbers',
      done: project.assets?.length > 0 && project.cashFlow?.length > 0,
      tabTarget: 'cashflow'
    },
    { 
      id: 'financing', 
      labelAr: 'إعداد التمويل', labelEn: 'Setup Financing',
      done: project.finMode !== 'self' ? project.debtConfig?.rate > 0 : true,
      tabTarget: 'financing'
    },
    { 
      id: 'export', 
      labelAr: 'تصدير التقارير', labelEn: 'Export Reports',
      done: false, // always last step
      tabTarget: 'reports'
    }
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <div style={{
      background: 'rgba(95,191,191,0.04)',
      border: '1px solid rgba(95,191,191,0.15)',
      borderRadius: '12px',
      padding: '1.5rem 2rem',
      marginBottom: '1.5rem'
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ color: '#5fbfbf', fontWeight: 600, fontSize: '0.85rem' }}>
          {lang === 'ar' ? `${completedCount}/4 خطوات مكتملة` : `${completedCount}/4 steps complete`}
        </span>
        <div style={{
          flex: 1, height: 4, background: 'rgba(255,255,255,0.08)',
          borderRadius: 2, marginLeft: '1rem', marginRight: '1rem'
        }}>
          <div style={{
            width: `${(completedCount / 4) * 100}%`,
            height: '100%', background: '#5fbfbf',
            borderRadius: 2, transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => switchToTab(step.tabTarget)}
            style={{
              flex: 1, minWidth: 140,
              padding: '0.75rem 1rem',
              background: step.done ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${step.done ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              {step.done ? '✅' : `${i + 1}`}
            </div>
            <div style={{ color: step.done ? '#10b981' : '#d0d4dc', fontSize: '0.8rem' }}>
              {lang === 'ar' ? step.labelAr : step.labelEn}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

**Sections needing empty states (unchanged from Eval 1):**
| Section | Message (AR) | Message (EN) | CTA |
|---------|-------------|-------------|-----|
| Dashboard (no projects) | لا توجد مشاريع بعد | No projects yet | أنشئ مشروعك الأول / Create First Project |
| Assets table (no assets) | لم تتم إضافة أصول | No assets added | أضف أصل جديد / Add New Asset |
| Financing (no config) | لم يتم إعداد التمويل | Financing not configured | إعداد التمويل / Setup Financing |
| Waterfall (no fund) | الشلال غير متاح في الوضع الحالي | Waterfall not available in current mode | تفعيل هيكل الصندوق / Enable Fund Structure |
| Scenarios (none saved) | لا توجد سيناريوهات محفوظة | No saved scenarios | إنشاء سيناريو / Create Scenario |

**Implementation Pattern (empty state component):**
```jsx
const EmptyState = ({ icon, titleAr, titleEn, descAr, descEn, ctaAr, ctaEn, onAction, lang }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '3rem 1.5rem',
    background: 'rgba(95,191,191,0.03)',
    border: '1px dashed rgba(95,191,191,0.2)',
    borderRadius: '12px', textAlign: 'center'
  }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.6 }}>{icon}</div>
    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>
      {lang === 'ar' ? titleAr : titleEn}
    </h3>
    <p style={{ color: '#d0d4dc', marginBottom: '1.5rem', maxWidth: 320 }}>
      {lang === 'ar' ? descAr : descEn}
    </p>
    <button onClick={onAction} style={{
      background: 'linear-gradient(135deg, #5fbfbf 0%, #4a9fa0 100%)',
      color: '#fff', border: 'none', borderRadius: '8px',
      padding: '0.6rem 1.5rem', cursor: 'pointer', fontWeight: 600
    }}>
      {lang === 'ar' ? ctaAr : ctaEn}
    </button>
  </div>
);
```

**Acceptance Criteria:**
- [ ] Every section that can be empty shows a proper empty state
- [ ] CTA button triggers the correct action (open wizard, add asset, etc.)
- [ ] Dashboard shows Progress Tracker after wizard completion (when project exists but no assets yet)
- [ ] Progress Tracker steps are clickable and navigate to correct tab
- [ ] Progress auto-updates as user completes each step
- [ ] Bilingual

---

### 1.3 Toast Notification System [A6]

**User Story:** As a user, when I save/export/delete, I want clear visual confirmation that my action succeeded or failed.

**Current:** No feedback. User clicks save and nothing visible happens.

**Target:** Toast system with 4 types: success (green), error (red), warning (yellow), info (blue).

**Implementation:**
```jsx
// Toast state management
const [toasts, setToasts] = useState([]);

const addToast = (message, type = 'success', duration = 3000) => {
  const id = Date.now();
  setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, duration);
};

// Toast container (fixed position, top-right)
const ToastContainer = () => (
  <div style={{
    position: 'fixed', top: 20, right: 20, zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: '0.5rem'
  }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        padding: '0.75rem 1.25rem',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '0.9rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease',
        background: {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6'
        }[t.type]
      }}>
        {t.message}
      </div>
    ))}
  </div>
);

// Usage
addToast('تم الحفظ بنجاح', 'success');
addToast('فشل التصدير - حاول مرة أخرى', 'error');
addToast('DSCR أقل من 1.2 - تحقق من الشروط', 'warning');
```

**Where to trigger:**
| Action | Toast Type | Message AR | Message EN |
|--------|-----------|-----------|-----------|
| Project saved | success | تم حفظ المشروع | Project saved |
| Project deleted | success | تم حذف المشروع | Project deleted |
| Excel exported | success | تم تصدير الملف | File exported |
| Save failed | error | فشل الحفظ - حاول مرة أخرى | Save failed - try again |
| Import failed | error | فشل الاستيراد - تحقق من الملف | Import failed - check file |
| DSCR below threshold | warning | DSCR أقل من الحد الأدنى | DSCR below minimum |
| Scenario saved | success | تم حفظ السيناريو | Scenario saved |
| Undo action | info | تم التراجع | Action undone |

**Acceptance Criteria:**
- [ ] Toasts appear top-right, auto-dismiss after 3s
- [ ] 4 color types working
- [ ] All save/delete/export actions trigger appropriate toast
- [ ] Bilingual messages
- [ ] Does not block interaction

---

### 1.4 Error Messages Improvement [A5]

**User Story:** As a user, when something goes wrong, I want to know exactly what happened and what to do about it.

**Current:** Generic "حدث خطأ" / "Error occurred" messages.

**Target:** Specific messages with context and suggested action.

**Error Message Map:**
| Current | Improved AR | Improved EN |
|---------|------------|------------|
| حدث خطأ | فشل تحميل المشروع. تحقق من الاتصال وحاول مجدداً | Failed to load project. Check connection and retry |
| خطأ في الحفظ | لم يتم حفظ التغييرات. تأكد من الاتصال بالإنترنت | Changes not saved. Check internet connection |
| خطأ | فشل تصدير Excel. حاول مرة أخرى | Excel export failed. Please retry |
| خطأ في البيانات | بيانات غير صالحة في [field]. تحقق من القيم المدخلة | Invalid data in [field]. Check entered values |
| خطأ في الاستيراد | الملف غير متوافق. تأكد من استخدام قالب ZAN | Incompatible file. Use ZAN template |

**Acceptance Criteria:**
- [ ] No generic "حدث خطأ" remains in codebase
- [ ] Every error message tells user what happened + what to do
- [ ] Errors show as toast (error type) not alert()

---

### 1.5 Skeleton Loaders [A6b]

**User Story:** As a user, when data is loading, I want to see placeholder shapes instead of a blank screen or spinner, so I know content is coming.

**Current:** No loading indication, or generic spinner. User sees blank areas while data loads.

**Target:** Skeleton placeholders that match the shape of the content being loaded.

**Where to apply:**
| Section | Skeleton Shape |
|---------|---------------|
| Dashboard project list | Table rows with gray pulsing bars |
| KPI cards | Card outlines with pulsing value placeholder |
| Financing tab | Number blocks + chart placeholder rectangles |
| Asset table | Row placeholders matching column widths |
| Waterfall results | Distribution table skeleton |

**Implementation:**
```jsx
const SkeletonBlock = ({ width = '100%', height = 16, style = {} }) => (
  <div style={{
    width, height, borderRadius: 6,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style
  }} />
);

const SkeletonRow = () => (
  <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
    <SkeletonBlock width={180} height={14} />
    <SkeletonBlock width={80} height={14} />
    <SkeletonBlock width={100} height={14} />
    <SkeletonBlock width={60} height={14} />
  </div>
);

// CSS keyframe
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }

// Usage: show skeleton while loading, switch to real data when ready
{isLoading ? (
  <div>{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
) : (
  <ProjectTable data={projects} />
)}
```

**Acceptance Criteria:**
- [ ] Skeleton loaders appear during all data fetches (project load, save, import)
- [ ] Skeleton shapes match the layout of the actual content
- [ ] Smooth shimmer animation
- [ ] Replaces any existing raw spinners or blank states during loading

---

## PHASE 2: Dashboard & Data Visualization (Week 3-4)

### 2.1 Dashboard KPI Cards [A2]

**User Story:** As a user, when I open my dashboard, I want to see key metrics across all my projects at a glance.

**Current:** Project list table only.

**Target:** KPI card strip above project table.

**KPIs to show:**
| KPI | Source | Format |
|-----|--------|--------|
| Total Projects | Count of user's projects | Number |
| Total CAPEX | Sum of all projects' CAPEX | SAR formatted |
| Average IRR | Mean IRR across projects | Percentage |
| Last Updated | Most recent project edit timestamp | Relative time |

**Card Design:**
```jsx
const KPICard = ({ titleAr, titleEn, value, subtitle, lang }) => (
  <div style={{
    background: 'rgba(95,191,191,0.06)',
    border: '1px solid rgba(95,191,191,0.15)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    flex: 1, minWidth: 180
  }}>
    <p style={{ color: '#d0d4dc', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
      {lang === 'ar' ? titleAr : titleEn}
    </p>
    <p style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700 }}>
      {value}
    </p>
    {subtitle && (
      <p style={{ color: '#5fbfbf', fontSize: '0.75rem', marginTop: '0.25rem' }}>
        {subtitle}
      </p>
    )}
  </div>
);
```

**Acceptance Criteria:**
- [ ] 4 KPI cards displayed above project table
- [ ] Values calculated from actual user data
- [ ] Bilingual labels
- [ ] Responsive: 2x2 grid on mobile

---

### 2.2 Dashboard Search & Filters [A3]

**User Story:** As a user with multiple projects, I want to quickly find a specific project by name, type, or status.

**Current:** No search or filter capability.

**Target:** Search bar + type dropdown + sort options above project table.

**Implementation:**
```jsx
// Filter bar above projects table
<div style={{
  display: 'flex', gap: '0.75rem', marginBottom: '1rem',
  flexWrap: 'wrap'
}}>
  <input 
    type="search"
    placeholder={lang === 'ar' ? 'ابحث عن مشروع...' : 'Search projects...'}
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    style={{
      flex: 1, minWidth: 200,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px', padding: '0.6rem 1rem',
      color: '#fff'
    }}
  />
  <select 
    value={filterType} 
    onChange={e => setFilterType(e.target.value)}
    style={{ /* matching dark style */ }}
  >
    <option value="all">{lang === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
    <option value="residential">{lang === 'ar' ? 'سكني' : 'Residential'}</option>
    <option value="commercial">{lang === 'ar' ? 'تجاري' : 'Commercial'}</option>
    <option value="mixed">{lang === 'ar' ? 'مختلط' : 'Mixed-Use'}</option>
    <option value="hospitality">{lang === 'ar' ? 'ضيافة' : 'Hospitality'}</option>
  </select>
</div>
```

**Acceptance Criteria:**
- [ ] Real-time search by project name
- [ ] Filter by project type
- [ ] Filters persist during session
- [ ] Clear/reset option

---

### 2.3 Financing Tab Charts [A7]

**User Story:** As a user reviewing financing, I want to see charts alongside numbers so I can quickly understand the financial structure.

**Current:** Numbers only, no visual context.

**Target:** 3 mini-charts at top of Financing tab + functional color coding on key metrics.

**Charts:**
| Chart | Type | Data |
|-------|------|------|
| Funding Split | Pie/Donut | Equity vs Debt breakdown |
| DSCR Timeline | Line | DSCR per year with 1.2x threshold line |
| Debt Balance | Area | Outstanding debt over project horizon |

**Color Coding Rules:**
| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| DSCR | >= 1.5 | 1.2 - 1.5 | < 1.2 |
| LTV | <= 60% | 60-70% | > 70% |
| IRR | >= 15% | 10-15% | < 10% |

**Acceptance Criteria:**
- [ ] 3 charts render with real project data
- [ ] Charts update when financing inputs change
- [ ] Key metrics show functional colors (green/yellow/red)
- [ ] Charts are bilingual (axis labels, legends)

---

### 2.4 Background Gradients & Visual Depth [A8]

**User Story:** As a user, the interface should feel polished and professional, not flat.

**Current:** Solid navy backgrounds everywhere.

**Target:** Subtle gradients and depth variation between sections.

**Implementation - apply globally:**
```css
/* Main app background */
.app-container {
  background: linear-gradient(135deg, #0c1a2e 0%, #0f2d4f 100%);
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(95,191,191,0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(212,165,116,0.03) 0%, transparent 50%);
}

/* Card/panel surfaces - slightly elevated */
.card, .panel, .section {
  background: rgba(15, 17, 23, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
}

/* Primary buttons */
.btn-primary {
  background: linear-gradient(135deg, #5fbfbf 0%, #4a9fa0 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover {
  box-shadow: 0 10px 25px rgba(95, 191, 191, 0.15);
  transform: translateY(-1px);
}
```

**Acceptance Criteria:**
- [ ] Main background uses gradient (not solid)
- [ ] Cards have subtle border + backdrop blur
- [ ] Buttons have gradient + hover effect
- [ ] No performance impact (test on low-end device)

---

### 2.5 Functional Colors Audit & Application [A7b]

**User Story:** As a user looking at financial metrics, I want positive numbers to feel green and risky numbers to feel red, so I can scan results quickly without reading every value.

**Current:** Most numbers displayed in white/default text regardless of whether they're good or bad. No color-coded context.

**Target:** All key financial metrics across the platform use functional colors consistently.

**Color Rules:**
```jsx
const getMetricColor = (metric, value) => {
  const rules = {
    IRR:  { green: v => v >= 15, yellow: v => v >= 10, red: v => v < 10 },
    DSCR: { green: v => v >= 1.5, yellow: v => v >= 1.2, red: v => v < 1.2 },
    LTV:  { green: v => v <= 60, yellow: v => v <= 70, red: v => v > 70 },
    NPV:  { green: v => v > 0, yellow: v => v === 0, red: v => v < 0 },
    MOIC: { green: v => v >= 2.0, yellow: v => v >= 1.5, red: v => v < 1.5 },
    cashFlow: { green: v => v > 0, yellow: v => v === 0, red: v => v < 0 },
  };
  const rule = rules[metric];
  if (!rule) return '#fff';
  if (rule.green(value)) return '#10b981';
  if (rule.yellow(value)) return '#f59e0b';
  return '#ef4444';
};
```

**Sections to apply:**
| Section | Metrics to Color |
|---------|-----------------|
| Dashboard KPI cards | IRR, NPV values |
| Project Outputs | IRR, NPV, payback period |
| Financing tab | DSCR per year, LTV, debt balance |
| Waterfall tab | MOIC, LP IRR, GP IRR |
| Results tab | All summary metrics |
| Cash flow tables | Net CF per year (green positive, red negative) |
| Checks tab | Pass = green, Fail = red, Warning = yellow |

**Acceptance Criteria:**
- [ ] All 7 sections above have functional colors applied
- [ ] Colors match the defined thresholds consistently
- [ ] getMetricColor utility function shared across all components
- [ ] Works in both AR and EN views

---

## PHASE 3: Refined Interactions (Week 4-5)

### 3.1 Selective Animations [B1 - Modified]

**User Story:** As a user, I want the interface to feel responsive and alive, without slowing down my workflow.

**Scope (limited - NOT full animation suite):**

| Element | Animation | Duration |
|---------|-----------|----------|
| Tab switch | Fade transition | 200ms |
| Card hover | Lift + shadow | 300ms |
| Save/Load | Subtle pulse on button | 300ms |
| Toast enter | Slide from right | 300ms |
| Modal open | Scale from 0.95 + fade | 200ms |

**NOT adding:** Page scroll animations, icon rotations, text fade-ins, background animations. This is a financial tool, not a marketing site.

```css
/* Tab content transition */
.tab-content {
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Card hover */
.project-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(95, 191, 191, 0.15);
}

/* Toast slide-in */
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

**Acceptance Criteria:**
- [ ] 5 specific animations implemented (no more)
- [ ] All animations < 300ms
- [ ] prefers-reduced-motion respected
- [ ] No jank or performance issues

---

### 3.2 Visual Consistency with ZAN Brand [B2 - Modified]

**Scope:** Color palette + typography alignment ONLY. Not shared headers/footers.

**Actions:**
- [ ] Ensure all teal usage matches #5fbfbf exactly (audit for inconsistencies)
- [ ] Ensure gold accent #d4a574 used consistently for premium/highlight elements
- [ ] Font stack: Tajawal (Arabic), DM Sans (English) - verify loaded everywhere
- [ ] ZAN logo in Auth page and header matches latest brand version

**NOT doing:** Shared navigation, shared footer, OAuth unification, "back to main site" link.

---

### 3.3 Spacing Audit [B4 - Modified]

**Scope:** Fix specific cramped/loose areas, not golden ratio everywhere.

**Known issues to fix:**
- [ ] Financing tab: inputs too close together, add more vertical gap
- [ ] Waterfall tab: distribution table rows cramped
- [ ] Asset table: columns too tight on smaller screens
- [ ] Dashboard: gap between KPI cards and project table needs increase
- [ ] Section headers: need more top margin to separate from previous content

**NOT doing:** Golden ratio calculation. Just visual pass for comfort.

---

### 3.4 Bilingual System Audit [B3 - Modified]

**Scope:** Keep current inline bilingual system. Fix any missing translations.

**Actions:**
- [ ] Audit all user-facing strings for missing AR or EN translation
- [ ] Ensure RTL layout works on all new components (KPIs, empty states, toasts)
- [ ] Fix any hardcoded English-only strings in newer features (Academy, AI Assistant)

**NOT doing:** i18n library migration.

---

### 3.5 Typography Standardization [A8b]

**User Story:** As a user, I want consistent text sizes and weights across the platform, so the hierarchy is clear and the interface feels unified.

**Current:** Font sizes and weights vary inconsistently across tabs and components. Some headers are too large, some labels are too small.

**Target:** Unified type scale applied globally.

**Type Scale (from evaluation):**
```css
/* === TYPOGRAPHY SYSTEM === */

/* Page titles */
h1, .text-title {
  font-size: 2rem;        /* 32px */
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

/* Section headers */
h2, .text-section {
  font-size: 1.5rem;      /* 24px */
  font-weight: 700;
  line-height: 1.3;
}

/* Sub-headers / Tab titles */
h3, .text-subsection {
  font-size: 1.125rem;    /* 18px */
  font-weight: 600;
  line-height: 1.4;
}

/* Body text */
body, .text-body {
  font-size: 0.9375rem;   /* 15px */
  font-weight: 400;
  line-height: 1.6;
}

/* Labels, captions */
.text-label {
  font-size: 0.8125rem;   /* 13px */
  font-weight: 500;
  color: var(--text-secondary);
}

/* Small / helper text */
.text-small {
  font-size: 0.75rem;     /* 12px */
  color: var(--text-secondary);
}

/* Large numbers (KPIs, totals) */
.text-metric {
  font-size: 1.75rem;     /* 28px */
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
```

**Actions:**
- [ ] Define type scale as CSS variables / utility classes
- [ ] Audit all headers and standardize to h1/h2/h3 scale
- [ ] Audit all body text and labels for consistent sizing
- [ ] Ensure tabular-nums on all financial numbers (prevents layout shift)
- [ ] Verify Tajawal (AR) and DM Sans (EN) render at all sizes

**Acceptance Criteria:**
- [ ] No ad-hoc font sizes in the codebase (all use the scale)
- [ ] Clear visual hierarchy: title > section > subsection > body > label
- [ ] Financial numbers use tabular-nums for alignment

---

### 3.6 Button States [A6c]

**User Story:** As a user, when I click a button, I want clear visual feedback that my click registered, especially for save/export actions.

**Current:** Buttons change cursor on hover but no other visual feedback on click or loading.

**Target:** Every button has 4 states: default, hover, active (pressed), and loading.

**Implementation:**
```jsx
const ZanButton = ({ children, onClick, variant = 'primary', loading = false, ...props }) => {
  const baseStyle = {
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    cursor: loading ? 'wait' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: loading ? 0.7 : 1,
    position: 'relative',
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #5fbfbf 0%, #4a9fa0 100%)',
      color: '#fff',
    },
    secondary: {
      background: 'transparent',
      border: '1px solid rgba(95,191,191,0.3)',
      color: '#5fbfbf',
    },
    danger: {
      background: '#ef4444',
      color: '#fff',
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variants[variant] }}
      onClick={loading ? undefined : onClick}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff', borderRadius: '50%',
            animation: 'spin 0.6s linear infinite', display: 'inline-block'
          }} />
          {children}
        </span>
      ) : children}
    </button>
  );
};

// Usage:
// <ZanButton onClick={handleSave} loading={isSaving}>حفظ / Save</ZanButton>
// <ZanButton variant="danger" onClick={handleDelete}>حذف / Delete</ZanButton>
```

**Buttons to update:**
| Button | Variant | Needs Loading State |
|--------|---------|-------------------|
| Save Project | primary | Yes |
| Export Excel | primary | Yes |
| Export PDF | primary | Yes |
| Create Project (wizard) | primary | No |
| Delete Project | danger | Yes |
| Add Asset | secondary | No |
| Run Scenario | primary | Yes |
| Undo | secondary | No |

**Acceptance Criteria:**
- [ ] All primary actions use ZanButton component
- [ ] Hover: shadow lift effect
- [ ] Active/pressed: scale(0.97) press-down feel
- [ ] Loading: spinner + disabled state during async operations
- [ ] 3 variants working: primary, secondary, danger

---

## FROM EVALUATION 2: UX Journey Improvements

### E2-1. Dynamic Tab Visibility by finMode [Eval2-A1] ⚡ HIGH PRIORITY

**User Story:** As a user who selected "self-funded" financing, I don't want to see the Waterfall tab since it doesn't apply to me. Seeing irrelevant tabs makes me confused about what I should focus on.

**Current:** All 11 tabs always visible regardless of financing mode. Irrelevant tabs show empty/disabled content.

**Target:** Tabs dynamically show/hide based on finMode and project state.

**Visibility Rules:**
| Tab | self | debt | fund | Always |
|-----|------|------|------|--------|
| Dashboard | ✅ | ✅ | ✅ | Yes |
| Assets | ✅ | ✅ | ✅ | Yes |
| Cash Flow | ✅ | ✅ | ✅ | Yes |
| Financing | ❌ | ✅ | ✅ | No |
| Waterfall | ❌ | ❌ | ✅ | No |
| Incentives | Show if any incentive toggled ON | | | Conditional |
| Results | ✅ | ✅ | ✅ | Yes |
| Scenarios | ✅ | ✅ | ✅ | Yes |
| Market | Hidden by default. Show via "More" or ⚙ | | | Optional |
| Checks | ✅ | ✅ | ✅ | Yes |
| Reports | ✅ | ✅ | ✅ | Yes |

**Implementation:**
```jsx
const getVisibleTabs = (finMode, project) => {
  const allTabs = [
    { id: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', always: true },
    { id: 'assets', labelAr: 'الأصول', labelEn: 'Assets', always: true },
    { id: 'cashflow', labelAr: 'التدفق النقدي', labelEn: 'Cash Flow', always: true },
    { id: 'financing', labelAr: 'التمويل', labelEn: 'Financing', 
      show: () => finMode === 'debt' || finMode === 'fund' },
    { id: 'waterfall', labelAr: 'الشلال', labelEn: 'Waterfall', 
      show: () => finMode === 'fund' },
    { id: 'incentives', labelAr: 'الحوافز', labelEn: 'Incentives', 
      show: () => hasAnyIncentive(project) },
    { id: 'results', labelAr: 'النتائج', labelEn: 'Results', always: true },
    { id: 'scenarios', labelAr: 'السيناريوهات', labelEn: 'Scenarios', always: true },
    { id: 'market', labelAr: 'السوق', labelEn: 'Market', 
      show: () => project.showMarketTab === true },
    { id: 'checks', labelAr: 'الفحوصات', labelEn: 'Checks', always: true },
    { id: 'reports', labelAr: 'التقارير', labelEn: 'Reports', always: true },
  ];
  
  return allTabs.filter(t => t.always || (t.show && t.show()));
};
```

**Tab group separators (visual improvement):**
```jsx
// Group tabs visually:
// PROJECT: Dashboard | Assets | Cash Flow
// FINANCING: Financing | Waterfall | Incentives
// ANALYSIS: Results | Scenarios | Market | Checks
// OUTPUT: Reports
//
// Add subtle divider between groups (slightly wider gap + thin line)
```

**Acceptance Criteria:**
- [ ] Tabs hide/show dynamically when finMode changes
- [ ] Switching finMode from fund→self hides Waterfall and Financing, redirects to Dashboard if user was on hidden tab
- [ ] Market tab hidden by default, accessible via settings/toggle
- [ ] Incentives tab only shows when at least one incentive is enabled
- [ ] Tab groups have subtle visual separators
- [ ] Tab count drops from 11 to 7-8 for typical self/debt projects

---

### E2-2. Asset Templates [Eval2-A2] ⚡ HIGH PRIORITY

**User Story:** As a user adding a hotel asset, I don't want to fill 18 fields from scratch. I want to pick "5-Star Hotel" and get realistic defaults pre-filled, then adjust what I need.

**Current:** "Add Asset" opens empty modal. Auto-fill only triggers on category change and only fills fields that are 0. No name, no footprint, no GFA defaults.

**Target:** Template picker before the edit modal. Selecting a template pre-fills 80%+ of fields with Saudi market defaults.

**Templates:**
| Template | Category | Default Values |
|----------|----------|---------------|
| فندق 5 نجوم / 5-Star Hotel | hospitality | 200 keys, ADR 800 SAR, Occ 68%, Cost 12,000/sqm, GFA 35,000, 24mo build |
| مول تجاري / Retail Mall | commercial | 50,000 GFA, Rent 1,200/sqm, Occ 85%, Cost 6,000/sqm, 18mo build |
| برج مكاتب / Office Tower | commercial | 30,000 GFA, Rent 800/sqm, Occ 80%, Cost 7,500/sqm, 20mo build |
| سكني (شقق) / Residential Apts | residential | 100 units, Rent 35,000/yr, Occ 90%, Cost 4,500/sqm, 16mo build |
| مارينا / Marina | marina | 120 berths, 800 SAR/m/yr, Occ 70%, Cost 8,000/sqm, 14mo build |
| مخصص / Custom | any | Empty - manual fill |

**Implementation:**
```jsx
const AssetTemplatePicker = ({ onSelect, lang }) => {
  const templates = [
    {
      id: 'hotel5star',
      iconAr: '🏨', labelAr: 'فندق 5 نجوم', labelEn: '5-Star Hotel',
      defaults: {
        name: lang === 'ar' ? 'فندق' : 'Hotel',
        category: 'hospitality',
        revenueType: 'hospitality',
        buildingFootprint: 5000, floors: 7, gfa: 35000,
        costPerSqm: 12000, constructionMonths: 24,
        hotelKeys: 200, adr: 800, occupancy: 68,
        fbPercentOfRoom: 35, micePercentOfRoom: 8,
      }
    },
    {
      id: 'retailMall',
      iconAr: '🛍️', labelAr: 'مول تجاري', labelEn: 'Retail Mall',
      defaults: {
        name: lang === 'ar' ? 'مول تجاري' : 'Retail Mall',
        category: 'commercial',
        revenueType: 'lease',
        buildingFootprint: 25000, floors: 2, gfa: 50000,
        costPerSqm: 6000, constructionMonths: 18,
        ratePerSqm: 1200, occupancy: 85, efficiency: 70,
      }
    },
    {
      id: 'officeTower',
      iconAr: '🏢', labelAr: 'برج مكاتب', labelEn: 'Office Tower',
      defaults: {
        name: lang === 'ar' ? 'برج مكاتب' : 'Office Tower',
        category: 'commercial',
        revenueType: 'lease',
        buildingFootprint: 3000, floors: 10, gfa: 30000,
        costPerSqm: 7500, constructionMonths: 20,
        ratePerSqm: 800, occupancy: 80, efficiency: 65,
      }
    },
    {
      id: 'residential',
      iconAr: '🏠', labelAr: 'سكني (شقق)', labelEn: 'Residential Apts',
      defaults: {
        name: lang === 'ar' ? 'مبنى سكني' : 'Residential Block',
        category: 'residential',
        revenueType: 'lease',
        buildingFootprint: 2000, floors: 6, gfa: 12000,
        costPerSqm: 4500, constructionMonths: 16,
        ratePerSqm: 500, occupancy: 90, efficiency: 75,
      }
    },
    {
      id: 'marina',
      iconAr: '⚓', labelAr: 'مارينا', labelEn: 'Marina',
      defaults: {
        name: lang === 'ar' ? 'مارينا' : 'Marina',
        category: 'marina',
        revenueType: 'marina',
        gfa: 15000, costPerSqm: 8000, constructionMonths: 14,
        marinaBerths: 120, marinaAvgLength: 15,
        marinaPricePerMeterYear: 800, marinaOccupancy: 70,
      }
    },
    {
      id: 'custom',
      iconAr: '✏️', labelAr: 'مخصص', labelEn: 'Custom',
      defaults: {}
    }
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '0.75rem', padding: '1rem'
    }}>
      {templates.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.defaults)}
          style={{
            padding: '1.25rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(95,191,191,0.4)';
            e.currentTarget.style.background = 'rgba(95,191,191,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{t.iconAr}</div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
            {lang === 'ar' ? t.labelAr : t.labelEn}
          </div>
        </button>
      ))}
    </div>
  );
};
```

**Flow:**
1. User clicks "Add Asset"
2. Template picker modal appears (6 cards)
3. User picks template → edit modal opens with defaults pre-filled
4. User adjusts as needed → saves

**Acceptance Criteria:**
- [ ] Template picker appears before asset edit modal
- [ ] 6 templates with realistic Saudi market defaults
- [ ] All pre-filled values editable
- [ ] "Custom" option opens empty modal (current behavior)
- [ ] Template defaults don't overwrite user values on edit (only on new asset creation)
- [ ] Bilingual template names

---

### E2-2b. Asset Data Prep Guide [Eval2-A2 supplement]

**User Story:** As a new user about to add my first asset, I want to know what data I need to prepare before I start, so I don't get stuck halfway through the form.

**Current:** User clicks "Add Asset" and sees 18+ fields with no context on what information to gather beforehand. The wizard doesn't mention what data is needed for the next step.

**Target:** A short prep checklist visible in the Assets tab (as a banner or collapsible guide) that tells the user what to have ready.

**Implementation:**
```jsx
const AssetPrepGuide = ({ lang, onDismiss }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '1rem',
    padding: '1rem 1.25rem',
    background: 'rgba(95,191,191,0.06)',
    border: '1px solid rgba(95,191,191,0.15)',
    borderRadius: '10px',
    marginBottom: '1rem'
  }}>
    <span style={{ fontSize: '1.5rem' }}>📋</span>
    <div style={{ flex: 1 }}>
      <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        {lang === 'ar' ? 'ما تحتاجه لإضافة أصل:' : 'What you need to add an asset:'}
      </p>
      <div style={{ color: '#d0d4dc', fontSize: '0.8rem', lineHeight: 1.8 }}>
        {lang === 'ar' ? (
          <>
            • مساحة الأرض ومساحة البناء (م²)<br/>
            • عدد الأدوار والمساحة الإجمالية<br/>
            • تكلفة البناء لكل م²<br/>
            • مدة البناء (بالأشهر)<br/>
            • الإيجار لكل م² أو ADR للفنادق<br/>
            • نسبة الإشغال المتوقعة
          </>
        ) : (
          <>
            • Land area and building footprint (sqm)<br/>
            • Number of floors and total GFA<br/>
            • Construction cost per sqm<br/>
            • Build duration (months)<br/>
            • Rent per sqm or ADR for hotels<br/>
            • Expected occupancy rate
          </>
        )}
      </div>
      <p style={{ color: '#5fbfbf', fontSize: '0.75rem', marginTop: '0.5rem' }}>
        {lang === 'ar' 
          ? '💡 اختر قالب جاهز عند الإضافة وسنعبئ معظم القيم تلقائياً'
          : '💡 Pick a template when adding and most values will be pre-filled'}
      </p>
    </div>
    <button onClick={onDismiss} style={{
      background: 'none', border: 'none', color: '#d0d4dc',
      cursor: 'pointer', fontSize: '1rem', padding: '0.25rem'
    }}>✕</button>
  </div>
);
```

**Behavior:**
- Shows in Assets tab when project has 0 assets
- Dismissible (user clicks ✕, stays dismissed for this project)
- Links conceptually to Asset Templates (E2-2) - mentions templates exist

**Acceptance Criteria:**
- [ ] Prep guide banner shows in Assets tab when 0 assets exist
- [ ] Lists the 6 key data points needed
- [ ] Dismissible per project (doesn't reappear once closed)
- [ ] Mentions template shortcut
- [ ] Bilingual

---

### E2-2c. Asset Modal Field Grouping [Eval2 supplement]

**User Story:** As a user editing an asset, I want the fields organized in logical groups so I can find what I need quickly instead of scrolling through a flat list.

**Current:** Asset edit modal shows all fields in a single flat list. No visual grouping or section headers.

**Target:** Fields organized into 4 collapsible groups with headers.

**Groups:**
| Group | Fields | Icon |
|-------|--------|------|
| أساسي / Basic Info | Name, Code, Phase, Category, Revenue Type | 📝 |
| المساحات / Areas & Dimensions | Plot Area, Footprint, Floors, GFA, Efficiency | 📐 |
| الإيرادات / Revenue | Rate/sqm, Occupancy, Escalation, ADR, Keys (conditional on type) | 💰 |
| البناء والتكاليف / Construction & Cost | Cost/sqm, Duration, Start Offset, Soft Cost %, Contingency % | 🏗️ |

**Implementation:**
```jsx
const FieldGroup = ({ titleAr, titleEn, icon, lang, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  
  return (
    <div style={{
      marginBottom: '1rem',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 1rem',
          background: 'rgba(255,255,255,0.03)',
          border: 'none', cursor: 'pointer',
          color: '#fff', fontWeight: 600, fontSize: '0.85rem'
        }}
      >
        <span>{icon}</span>
        <span>{lang === 'ar' ? titleAr : titleEn}</span>
        <span style={{ marginLeft: 'auto', color: '#d0d4dc', fontSize: '0.75rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0.75rem 1rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Usage in Asset Edit Modal:
<FieldGroup icon="📝" titleAr="أساسي" titleEn="Basic Info" lang={lang}>
  {/* Name, Code, Phase, Category, Revenue Type fields */}
</FieldGroup>

<FieldGroup icon="📐" titleAr="المساحات" titleEn="Areas & Dimensions" lang={lang}>
  {/* Plot Area, Footprint, Floors, GFA, Efficiency fields */}
</FieldGroup>

<FieldGroup icon="💰" titleAr="الإيرادات" titleEn="Revenue" lang={lang}>
  {/* Rate, Occupancy, ADR, Keys etc - conditional on revenue type */}
</FieldGroup>

<FieldGroup icon="🏗️" titleAr="البناء والتكاليف" titleEn="Construction & Cost" lang={lang}>
  {/* Cost/sqm, Duration, Start Offset fields */}
</FieldGroup>
```

**Acceptance Criteria:**
- [ ] Asset edit modal fields organized in 4 groups
- [ ] Groups are collapsible
- [ ] All groups open by default on new asset
- [ ] Revenue group shows conditional fields based on revenue type (hospitality vs lease vs marina)
- [ ] Bilingual group headers

---

### E2-3. Financing Settings Always Visible [Eval2-A3]

**User Story:** As a user in the Financing tab, I want to see and edit debt settings (rate, tenor, grace, LTV) directly without hunting for a hidden gear icon.

**Current:** Financing settings behind ⚙ button. New users don't discover it.

**Target:** Key financing parameters displayed as editable cards at top of Financing tab.

**Implementation:**
```jsx
const FinancingQuickSettings = ({ config, onChange, lang }) => {
  const fields = [
    { key: 'maxLTV', labelAr: 'الحد الأقصى LTV', labelEn: 'Max LTV', suffix: '%', 
      min: 0, max: 90 },
    { key: 'debtRate', labelAr: 'معدل الربح', labelEn: 'Profit Rate', suffix: '%',
      min: 0, max: 20 },
    { key: 'debtTenor', labelAr: 'مدة القرض', labelEn: 'Loan Tenor', suffix: lang === 'ar' ? 'سنة' : 'yrs',
      min: 1, max: 30 },
    { key: 'gracePeriod', labelAr: 'فترة السماح', labelEn: 'Grace Period', suffix: lang === 'ar' ? 'سنة' : 'yrs',
      min: 0, max: 10 },
    { key: 'upfrontFee', labelAr: 'رسوم مقدمة', labelEn: 'Upfront Fee', suffix: '%',
      min: 0, max: 5 },
  ];

  return (
    <div style={{
      display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
      padding: '1rem', marginBottom: '1rem',
      background: 'rgba(95,191,191,0.04)',
      border: '1px solid rgba(95,191,191,0.12)',
      borderRadius: '10px'
    }}>
      {fields.map(f => (
        <div key={f.key} style={{
          flex: '1 1 140px', minWidth: 120,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px', padding: '0.6rem 0.8rem'
        }}>
          <label style={{ color: '#d0d4dc', fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem' }}>
            {lang === 'ar' ? f.labelAr : f.labelEn}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input
              type="number"
              value={config[f.key] || 0}
              min={f.min} max={f.max}
              onChange={e => onChange({ ...config, [f.key]: +e.target.value })}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: '#fff', fontSize: '1.1rem', fontWeight: 600,
                outline: 'none'
              }}
            />
            <span style={{ color: '#5fbfbf', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {f.suffix}
            </span>
          </div>
        </div>
      ))}
      {/* Link to full settings modal */}
      <button
        onClick={() => openFullSettings()}
        style={{
          alignSelf: 'center', padding: '0.5rem 1rem',
          background: 'transparent', border: '1px solid rgba(95,191,191,0.2)',
          borderRadius: '6px', color: '#5fbfbf', fontSize: '0.75rem',
          cursor: 'pointer'
        }}
      >
        {lang === 'ar' ? 'كل الإعدادات ⚙' : 'All Settings ⚙'}
      </button>
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Top 5 financing parameters visible and editable at top of Financing tab
- [ ] Changes take effect immediately (same as current ⚙ modal)
- [ ] "All Settings" button still opens full modal for advanced options
- [ ] ⚙ button remains for users who know it
- [ ] Bilingual labels

---

### E2-4. Financing At-a-Glance KPI Strip [Eval2-A7]

**User Story:** As a user looking at the Financing tab, I want to see the key debt metrics (total debt, equity, LTV, avg DSCR) at a glance without scrolling through tables.

**Current:** Financial data only in tables. No summary strip.

**Target:** KPI card strip at top of Financing tab (below quick settings, above tables/charts).

**KPIs:**
| KPI | Source | Color Rule |
|-----|--------|-----------|
| Total Debt | Sum of debt draws | White (neutral) |
| Total Equity | Equity calls total | White (neutral) |
| Effective LTV | Debt / (Debt+Equity) | Green ≤60%, Yellow 60-70%, Red >70% |
| Avg DSCR | Mean of annual DSCRs | Green ≥1.5, Yellow 1.2-1.5, Red <1.2 |
| Cost of Debt | Weighted avg rate | White (neutral) |

**Acceptance Criteria:**
- [ ] 5 KPI cards shown at top of Financing tab
- [ ] Values update in real-time when inputs change
- [ ] Functional colors applied per rules above
- [ ] Bilingual

---

### E2-5. Input Validation [Eval2-A5]

**User Story:** As a user, if I enter an invalid value (negative area, 0 year horizon, rate over 100%), I want immediate visual feedback on the field itself.

**Current:** No inline validation. Invalid values accepted silently. Errors only caught by Checks tab downstream.

**Target:** Inline validation with red border + helper text on the field.

**Validation Rules:**
| Field | Rule | Message AR | Message EN |
|-------|------|-----------|-----------|
| horizon | > 0, ≤ 99 | المدة يجب أن تكون 1-99 سنة | Horizon must be 1-99 years |
| landArea | ≥ 0 | المساحة لا يمكن أن تكون سالبة | Area cannot be negative |
| debtRate | 0-30% | المعدل يجب أن يكون 0-30% | Rate must be 0-30% |
| occupancy | 0-100% | الإشغال يجب أن يكون 0-100% | Occupancy must be 0-100% |
| costPerSqm | ≥ 0 | التكلفة لا يمكن أن تكون سالبة | Cost cannot be negative |
| constructionMonths | > 0, ≤ 120 | مدة البناء 1-120 شهر | Build duration 1-120 months |
| exitYear | ≤ horizon | سنة التخارج تتجاوز المدة | Exit year exceeds horizon |
| gracePeriod | ≤ tenor | فترة السماح تتجاوز مدة القرض | Grace exceeds loan tenor |

**Implementation:**
```jsx
const ValidatedInput = ({ value, onChange, rules, lang, ...props }) => {
  const error = rules?.find(r => !r.test(value));
  
  return (
    <div>
      <input
        value={value}
        onChange={onChange}
        style={{
          ...props.style,
          borderColor: error ? '#ef4444' : undefined,
          boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
        }}
        {...props}
      />
      {error && (
        <span style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '2px', display: 'block' }}>
          {lang === 'ar' ? error.messageAr : error.messageEn}
        </span>
      )}
    </div>
  );
};

// Usage:
<ValidatedInput
  value={horizon}
  onChange={e => setHorizon(+e.target.value)}
  rules={[
    { test: v => v > 0, messageAr: 'يجب أن تكون أكبر من صفر', messageEn: 'Must be > 0' },
    { test: v => v <= 99, messageAr: 'الحد الأقصى 99 سنة', messageEn: 'Max 99 years' },
  ]}
  lang={lang}
/>
```

**Acceptance Criteria:**
- [ ] All numeric inputs in sidebar have validation rules
- [ ] Red border + message appears immediately on invalid input
- [ ] Validation doesn't block input (user can still type, just sees warning)
- [ ] Error clears as soon as value becomes valid
- [ ] All asset modal fields validated
- [ ] Bilingual error messages

---

### E2-6. Checks Tab "Fix" Buttons [Eval2-A6]

**User Story:** As a user who sees a failed check, I want to click "Fix" and be taken directly to the field causing the issue.

**Current:** Checks tab shows ✅/❌ with description, but user must manually find and navigate to the problem.

**Target:** Each failed check has a "Fix" button that navigates to the relevant tab and optionally highlights the field.

**Implementation:**
```jsx
const CheckItem = ({ check, onFix, lang }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.6rem 1rem',
    background: check.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
    border: `1px solid ${check.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
    borderRadius: '8px',
    marginBottom: '0.5rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span>{check.passed ? '✅' : '❌'}</span>
      <span style={{ color: '#fff', fontSize: '0.9rem' }}>
        {lang === 'ar' ? check.labelAr : check.labelEn}
      </span>
    </div>
    {!check.passed && check.fixTarget && (
      <button
        onClick={() => onFix(check.fixTarget)}
        style={{
          padding: '0.3rem 0.75rem',
          background: 'rgba(95,191,191,0.1)',
          border: '1px solid rgba(95,191,191,0.3)',
          borderRadius: '6px', color: '#5fbfbf',
          fontSize: '0.75rem', cursor: 'pointer'
        }}
      >
        {lang === 'ar' ? 'إصلاح ←' : 'Fix →'}
      </button>
    )}
  </div>
);

// Fix target mapping:
const fixTargets = {
  'gfa_mismatch': { tab: 'assets', highlight: 'gfa' },
  'negative_cf': { tab: 'cashflow', highlight: null },
  'dscr_low': { tab: 'financing', highlight: 'debtRate' },
  'no_assets': { tab: 'assets', highlight: null },
  'exit_exceeds_horizon': { tab: 'dashboard', highlight: 'exitYear' },
};
```

**Acceptance Criteria:**
- [ ] Every failed check with a fixable target shows "Fix" button
- [ ] Clicking Fix navigates to the correct tab
- [ ] Non-fixable checks (informational) don't show Fix button
- [ ] Bilingual button text

---

### E2-7. Google Login Button Visible [Eval2-C1]

**User Story:** As a new user on the login page, I want to see Google login as a clear option so I don't have to create a new password.

**Current:** Google OAuth is configured in Supabase but the button may not be prominent enough on the auth page.

**Target:** Prominent Google login button on auth page, visually equal to email/password login.

**Note:** This is a SEPARATE item from Auth Page Redesign [1.1]. The Auth Redesign covers layout/hero/branding. This covers specifically ensuring Google button is visible and working.

**Implementation:**
```jsx
// In Auth form section:
<button
  onClick={handleGoogleLogin}
  style={{
    width: '100%',
    padding: '0.7rem 1rem',
    background: '#fff',
    color: '#333',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
    fontSize: '0.95rem'
  }}
>
  <svg width="18" height="18" viewBox="0 0 18 18">
    {/* Google G icon SVG */}
  </svg>
  {lang === 'ar' ? 'الدخول بحساب Google' : 'Sign in with Google'}
</button>

{/* Divider */}
<div style={{
  display: 'flex', alignItems: 'center', gap: '1rem',
  margin: '1rem 0', color: '#d0d4dc', fontSize: '0.8rem'
}}>
  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
  <span>{lang === 'ar' ? 'أو' : 'or'}</span>
  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
</div>

{/* Then email/password fields */}
```

**Acceptance Criteria:**
- [ ] Google button appears prominently on login AND signup views
- [ ] Button positioned ABOVE email/password (Google first, then "or", then email)
- [ ] Working OAuth flow (existing Supabase config)
- [ ] Bilingual label

---

### E2-8. Mobile Basic Improvements [Eval2-B2 - Modified]

**User Story:** As a user checking my project on iPad during a meeting, I want the interface to be readable and navigable without horizontal scrolling on basic views.

**Current:** Mobile rated 4/10. Tables overflow, buttons too small, sidebar covers content.

**Scope (LIMITED - not full mobile redesign):**
- [ ] Sidebar: proper slide-out with overlay, closes on tap outside
- [ ] Tab bar: horizontal scroll with arrow indicators on small screens
- [ ] Buttons: minimum touch target 44x44px on mobile
- [ ] KPI cards: stack vertically on narrow screens
- [ ] Tables: NO redesign (financial tables need width - this is a desktop tool)

**NOT doing:** Responsive table redesign, mobile-first layout, mobile-specific views. This is a desktop-first professional tool.

**Acceptance Criteria:**
- [ ] iPad landscape: fully usable without horizontal scroll on Dashboard, Results, Reports
- [ ] Phone: navigable (read-only acceptable, editing expected on desktop)
- [ ] Sidebar doesn't permanently cover content on small screens
- [ ] All touch targets ≥ 44px

---

### E2-9. Waterfall Tooltips Enhancement [Eval2-B3 - Modified]

**User Story:** As a user unfamiliar with fund distribution terms, I want rich tooltips on Waterfall terms that explain them in plain language and link to Academy for deeper learning.

**Current:** Basic tooltips exist. Terms like "Unreturned Capital", "GP Catch-up" are standard but confusing for non-specialists.

**Scope:** Enhance existing tooltips. Do NOT simplify the terms themselves.

**Enhanced tooltips for:**
| Term | Tooltip AR | Tooltip EN | Academy Link |
|------|-----------|-----------|-------------|
| Unreturned Capital | رأس المال الذي لم يُسترد بعد من المستثمرين | Capital not yet returned to investors | ✅ |
| Preferred Return | العائد الأولوي المستحق للمستثمرين قبل توزيع الأرباح | Priority return owed to investors before profit split | ✅ |
| GP Catch-up | حصة المدير العام التعويضية للوصول لنسبة الأرباح المتفق عليها | GP's compensating share to reach agreed profit percentage | ✅ |
| Carry | نسبة أرباح المدير العام فوق العائد الأولوي | GP's profit share above preferred return | ✅ |
| MOIC | مضاعف رأس المال المستثمر (التوزيعات ÷ رأس المال) | Multiple of invested capital (distributions / capital) | ✅ |

**Each tooltip adds:**
```jsx
// "Learn more" link at bottom of tooltip
<a onClick={() => openAcademy('waterfall-terms')} style={{ color: '#5fbfbf', fontSize: '0.7rem' }}>
  {lang === 'ar' ? 'اعرف أكثر في الأكاديمية ←' : 'Learn more in Academy →'}
</a>
```

**Acceptance Criteria:**
- [ ] All waterfall terms have enhanced bilingual tooltips
- [ ] Each tooltip has "Learn more" link to Academy
- [ ] Terms NOT simplified (industry standard names preserved)

---

### E2-10. CSV Template Download Visibility [Eval2-B4 - Modified]

**User Story:** As a user who wants to import assets via CSV, I want to easily find and download the template before attempting import.

**Current:** CSV template exists but the download link isn't prominent. User might try importing without the right format.

**Target:** Visible "Download Template" button adjacent to "Import CSV" button.

**Implementation:**
```jsx
// In Assets tab header, next to Import button:
<div style={{ display: 'flex', gap: '0.5rem' }}>
  <button onClick={handleCSVImport} style={{ /* primary style */ }}>
    {lang === 'ar' ? '📥 استيراد CSV' : '📥 Import CSV'}
  </button>
  <button onClick={downloadCSVTemplate} style={{
    padding: '0.4rem 0.75rem',
    background: 'transparent',
    border: '1px solid rgba(95,191,191,0.3)',
    borderRadius: '6px', color: '#5fbfbf',
    fontSize: '0.8rem', cursor: 'pointer'
  }}>
    {lang === 'ar' ? '📋 حمّل القالب' : '📋 Download Template'}
  </button>
</div>
```

**Acceptance Criteria:**
- [ ] "Download Template" button visible next to "Import CSV"
- [ ] Template downloads immediately (no extra clicks)
- [ ] Bilingual

---

### E2-11. Report Preview Before Export [Eval2 supplement]

**User Story:** As a user about to export a PDF or Bank Pack, I want to preview the report content before downloading, so I can verify it looks correct.

**Current:** Some reports open PDF directly in a new tab. Others download without preview. User has to export, open, check, and re-export if something is wrong.

**Target:** In-app preview pane for each report type before the user clicks "Download".

**Reports needing preview:**
| Report | Current Behavior | Target |
|--------|-----------------|--------|
| Executive Summary PDF | Direct download | Preview in modal, then download |
| Bank Pack PDF | Direct download | Preview in modal, then download |
| Investor Memo PDF | Direct download | Preview in modal, then download |
| Excel Export | Direct download | No preview needed (keeps current) |

**Implementation:**
```jsx
const ReportPreview = ({ reportType, project, lang, onClose, onDownload }) => {
  const [previewContent, setPreviewContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate report content for preview (same function used for export)
    const content = generateReportContent(reportType, project, lang);
    setPreviewContent(content);
    setLoading(false);
  }, [reportType, project]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        width: '90%', maxWidth: 900, height: '85vh',
        background: '#1a1d24',
        borderRadius: '12px',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ color: '#fff', margin: 0 }}>
            {lang === 'ar' ? 'معاينة التقرير' : 'Report Preview'}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onDownload}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'linear-gradient(135deg, #5fbfbf 0%, #4a9fa0 100%)',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              {lang === 'ar' ? '📥 تحميل' : '📥 Download'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', color: '#d0d4dc',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: '2rem',
          background: '#fff', color: '#000'
        }}>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
          )}
        </div>
      </div>
    </div>
  );
};
```

**Flow:**
1. User clicks "Export PDF" (or Bank Pack, Investor Memo)
2. Preview modal opens showing formatted report on white background
3. User reviews content
4. Clicks "Download" to save, or "✕" to close and adjust inputs

**Acceptance Criteria:**
- [ ] Preview modal shows for PDF-based reports (Exec Summary, Bank Pack, Investor Memo)
- [ ] Preview renders same content that will be exported
- [ ] Download button in preview triggers actual file download
- [ ] Excel export remains direct download (no preview)
- [ ] Modal scrollable for long reports
- [ ] Bilingual header/buttons

---

## FROM EVALUATION 3: Code Architecture & Financial Reliability

> **Context:** This evaluation reviewed the full 12,901-line codebase from an engineering and financial accuracy perspective. It rates code engineering at 4.5/10 and investor-readiness at 5/10. The issues here are MORE CRITICAL than UX improvements because they affect trust in the numbers.

> **Priority:** Items E3-1 through E3-4 should be addressed BEFORE or IN PARALLEL with UX Phase 2. No amount of visual polish matters if the numbers aren't trustworthy.

---

### E3-1. Legacy vs New Engine Conflict [Eval3-A4] 🚨 CRITICAL

**User Story:** As a user reviewing my project, I need to be 100% certain that the numbers I see on screen are the same numbers being validated by the checks system. Any mismatch destroys trust in the entire platform.

**The Problem:**
Around lines 4897-4909 in App.jsx, the UI displays consolidated results from `independentPhaseResults` (the newer per-phase engine). But the Checks tab validates against `_legacyFinancing` and `_legacyWaterfall` (the older single-block engine).

This means:
- User sees **Result A** on the Results tab (from new engine)
- Checks tab validates against **Result B** (from legacy engine)
- If A ≠ B, user gets either false passes or false failures
- User has no way to know which set of numbers is correct

**This is the single most important issue in the entire platform.**

**Root Cause Analysis Needed:**
```
Questions to answer before fixing:
1. Which engine is MORE CORRECT - legacy or new?
   → Compare both against ZAN Excel benchmarks
   
2. Are both engines still needed?
   → If new engine covers all cases, legacy can be removed
   → If legacy handles edge cases new doesn't, we need to merge
   
3. Where exactly do results diverge?
   → Run same inputs through both, diff the outputs
   → Document every field where they disagree
   
4. Which UI components read from which engine?
   → Map every data display to its source
```

**Fix Strategy (phased):**

**Phase A - Audit (before any code changes):**
```javascript
// Step 1: Create a diagnostic function that runs BOTH engines
// and reports differences

const engineDiagnostic = (project) => {
  const legacyResults = runLegacyEngine(project);
  const newResults = runIndependentPhaseEngine(project);
  
  const diffs = [];
  
  // Compare key outputs
  const fields = [
    'totalCapex', 'totalRevenue', 'projectIRR', 'projectNPV',
    'totalDebt', 'totalEquity', 'avgDSCR', 'minDSCR',
    'lpIRR', 'gpIRR', 'lpMOIC', 'gpMOIC',
    'totalDistributions', 'exitProceeds'
  ];
  
  fields.forEach(field => {
    const legacy = extractField(legacyResults, field);
    const newVal = extractField(newResults, field);
    const diff = Math.abs(legacy - newVal);
    const pctDiff = legacy !== 0 ? (diff / Math.abs(legacy)) * 100 : 0;
    
    if (pctDiff > 0.01) { // More than 0.01% difference
      diffs.push({
        field,
        legacy,
        new: newVal,
        diff,
        pctDiff: pctDiff.toFixed(4) + '%',
        severity: pctDiff > 1 ? 'HIGH' : pctDiff > 0.1 ? 'MEDIUM' : 'LOW'
      });
    }
  });
  
  return {
    match: diffs.length === 0,
    diffs,
    recommendation: diffs.some(d => d.severity === 'HIGH') 
      ? 'ENGINES DIVERGE SIGNIFICANTLY - DO NOT SHIP'
      : 'Minor differences - review and align'
  };
};
```

**Phase B - Decide single source of truth:**
- If new engine is more accurate → migrate all Checks to use new engine
- If legacy is more accurate → migrate all UI to use legacy engine
- If mixed → merge best of both into one unified engine

**Phase C - Implement:**
- Remove the losing engine entirely
- All UI reads from ONE engine
- All Checks validate from the SAME engine
- Run full test suite to confirm

**Acceptance Criteria:**
- [ ] Diagnostic function created and run on ZAN benchmark project
- [ ] All differences between engines documented
- [ ] Decision made: which engine becomes the single source of truth
- [ ] All UI components migrated to read from single engine
- [ ] All Checks migrated to validate against single engine
- [ ] Legacy engine code removed or clearly marked as deprecated
- [ ] Full test suite passes after migration
- [ ] ZAN benchmark numbers match Excel within 0.1%

---

### E3-2. DSCR Proxy Replacement [Eval3-A2]

**User Story:** As a developer presenting to a bank, the DSCR calculation must use actual debt service coverage logic, not a proxy. Banks will verify the formula and reject a model with shortcuts.

**Current Problem:**
DSCR currently uses a simplified proxy instead of the standard formula:
```
Standard: DSCR = Net Operating Income / Total Debt Service
Where: Total Debt Service = Principal Repayment + Interest Payment (per period)
```

The proxy may approximate correctly in simple cases but diverges when:
- Grace period transitions to repayment
- Balloon payments occur
- Multiple debt tranches exist
- Interest-only periods apply

**Target Formula:**
```javascript
const computeDSCR = (year, cashflows, debtSchedule) => {
  // Net Operating Income for the year
  const noi = cashflows[year].revenue 
    - cashflows[year].opex 
    - cashflows[year].landRent;
  
  // Total Debt Service for the year
  const principalPayment = debtSchedule[year].principalRepayment;
  const interestPayment = debtSchedule[year].interestPayment;
  const totalDebtService = principalPayment + interestPayment;
  
  // DSCR
  if (totalDebtService === 0) return null; // No debt service = N/A
  return noi / totalDebtService;
};

// Per-year DSCR array
const dscrByYear = project.horizonYears.map(year => ({
  year,
  noi: getNOI(year),
  debtService: getDebtService(year),
  dscr: computeDSCR(year, cashflows, debtSchedule),
  meetsMinimum: computeDSCR(year, cashflows, debtSchedule) >= project.minDSCR
}));

// Summary metrics
const avgDSCR = dscrByYear.filter(d => d.dscr !== null).reduce((s, d) => s + d.dscr, 0) 
  / dscrByYear.filter(d => d.dscr !== null).length;
const minDSCR = Math.min(...dscrByYear.filter(d => d.dscr !== null).map(d => d.dscr));
```

**Validation:**
- Compare against ZAN Bank Model DSCR values year by year
- Must match within 0.1% for every year

**Acceptance Criteria:**
- [ ] DSCR computed using actual NOI / (Principal + Interest)
- [ ] DSCR correctly handles grace period years (interest only → DSCR = NOI / Interest)
- [ ] DSCR correctly handles years with no debt service (returns N/A, not infinity)
- [ ] Year-by-year DSCR matches ZAN Bank Model within 0.1%
- [ ] Average and minimum DSCR displayed in Financing tab
- [ ] Proxy code removed or replaced

---

### E3-3. Management Fee NAV Proxy Fix [Eval3-A3]

**User Story:** As a fund manager, the management fee must be calculated on actual AUM/NAV, not a simplified proxy. Investors will verify fee calculations in detail.

**Current Problem:**
Management fee uses a simplified NAV estimate instead of computing NAV from:
- Initial equity contributions
- Cumulative distributions returned
- Unrealized asset value changes

**Target Formula:**
```javascript
const computeManagementFee = (year, fundConfig, equityCalls, distributions, assetValues) => {
  // Option A: Fee on Committed Capital (simpler, common in early years)
  if (fundConfig.mgmtFeeBase === 'committed') {
    return fundConfig.totalEquity * fundConfig.mgmtFeeRate;
  }
  
  // Option B: Fee on Invested Capital (post-investment period)
  if (fundConfig.mgmtFeeBase === 'invested') {
    const totalInvested = equityCalls
      .filter(c => c.year <= year)
      .reduce((sum, c) => sum + c.amount, 0);
    return totalInvested * fundConfig.mgmtFeeRate;
  }
  
  // Option C: Fee on NAV (most accurate, used in institutional funds)
  if (fundConfig.mgmtFeeBase === 'nav') {
    const totalInvested = equityCalls
      .filter(c => c.year <= year)
      .reduce((sum, c) => sum + c.amount, 0);
    const totalDistributed = distributions
      .filter(d => d.year <= year)
      .reduce((sum, d) => sum + d.amount, 0);
    const unrealizedValue = assetValues[year] || 0;
    
    const nav = totalInvested - totalDistributed + unrealizedValue;
    return Math.max(0, nav) * fundConfig.mgmtFeeRate;
  }
};
```

**Note:** The `mgmtFeeBase` config flag already exists in v4.9 but may not be fully wired. This fix completes the wiring.

**Acceptance Criteria:**
- [ ] Management fee supports 3 bases: committed, invested, NAV
- [ ] Default base configurable in Fund settings
- [ ] Fee calculation matches ZAN Fund Model
- [ ] Progressive fee (if configured) reduces rate after investment period
- [ ] Proxy code replaced with actual calculation

---

### E3-4. Financial Engine Extraction [Eval3-A1 + B1]

**User Story:** As a developer maintaining this platform, I need the financial calculation engine in a separate file from the UI so I can test, debug, and modify calculations without risking UI breakage.

**Current Problem:**
All financial logic (CAPEX, revenue, cash flow, financing, waterfall, exit, incentives) lives inside App.jsx mixed with React components, event handlers, and UI state. This means:
- Can't unit test calculations without rendering React
- A CSS change can accidentally break a formula
- Code review of financial logic requires reading through 12,900 lines
- Two developers can't work on UI and engine simultaneously

**Target Architecture:**
```
src/
├── App.jsx              # UI only: components, state, event handlers
├── engine/
│   ├── index.js         # Main entry: runFullModel(project) → results
│   ├── capex.js         # CAPEX schedule computation
│   ├── revenue.js       # Revenue schedule computation  
│   ├── cashflow.js      # Unlevered cash flow
│   ├── financing.js     # Debt modeling, equity calls, DSCR
│   ├── waterfall.js     # Distribution waterfall, LP/GP returns
│   ├── exit.js          # Exit valuation logic
│   ├── incentives.js    # Government incentive calculations
│   ├── irr.js           # IRR/NPV/XIRR pure math functions
│   └── checks.js        # Validation checks
├── excelExport.js       # Already separated ✅
└── auth.jsx             # Already separated ✅
```

**Extraction Strategy (SAFE - no rewrite):**

```
Step 1: IDENTIFY
  - Tag every function in App.jsx as UI or ENGINE
  - List all ENGINE functions with their dependencies
  
Step 2: EXTRACT (one module at a time)
  - Start with irr.js (pure math, zero dependencies)
  - Then capex.js (depends only on project inputs)
  - Then revenue.js (depends on project inputs + assets)
  - Then cashflow.js (depends on capex + revenue)
  - Then financing.js (depends on cashflow)
  - Then waterfall.js (depends on financing)
  - Then exit.js (depends on waterfall)
  - Then incentives.js (cross-cutting)
  - Finally checks.js (depends on all above)

Step 3: WIRE
  - App.jsx imports from engine/index.js
  - engine/index.js orchestrates: runFullModel(project) → results
  - All UI components read from results object

Step 4: VERIFY
  - After each module extraction:
    → Run full test suite (633 tests)
    → Run ZAN benchmark comparison
    → Verify no number changes
  - Zero tolerance for number drift during extraction
```

**Critical Rule:** This is a MOVE operation, not a REWRITE. Every function moves exactly as-is. No logic changes during extraction. Logic fixes (E3-1, E3-2, E3-3) happen AFTER extraction is complete and tested.

**Implementation - engine/index.js:**
```javascript
// engine/index.js - Main orchestrator
import { computeCapexSchedule } from './capex.js';
import { computeRevenueSchedule } from './revenue.js';
import { computeUnleveredCashFlow } from './cashflow.js';
import { computeFinancing } from './financing.js';
import { computeWaterfall } from './waterfall.js';
import { computeExitValuation } from './exit.js';
import { applyIncentives } from './incentives.js';
import { runChecks } from './checks.js';
import { computeIRR, computeNPV } from './irr.js';

/**
 * Runs the complete financial model for a project.
 * Single entry point. All UI reads from the returned results.
 * 
 * @param {Object} project - Full project state
 * @returns {Object} results - All computed outputs
 */
export const runFullModel = (project) => {
  // Phase 1: Project-level calculations
  const capex = computeCapexSchedule(project);
  const revenue = computeRevenueSchedule(project);
  const incentiveAdjustments = applyIncentives(project, capex, revenue);
  const unleveredCF = computeUnleveredCashFlow(project, capex, revenue, incentiveAdjustments);
  
  // Phase 2: Financing (only if not self-funded)
  const financing = project.finMode !== 'self' 
    ? computeFinancing(project, unleveredCF)
    : null;
  
  // Phase 3: Waterfall (only if fund structure)
  const waterfall = project.finMode === 'fund'
    ? computeWaterfall(project, unleveredCF, financing)
    : null;
  
  // Phase 4: Exit
  const exit = computeExitValuation(project, revenue, financing);
  
  // Phase 5: Returns
  const projectIRR = computeIRR(unleveredCF.netCashFlows);
  const projectNPV = computeNPV(unleveredCF.netCashFlows, project.discountRate || 0.12);
  
  // Phase 6: Checks
  const checks = runChecks(project, { capex, revenue, unleveredCF, financing, waterfall, exit });
  
  return {
    capex,
    revenue,
    incentiveAdjustments,
    unleveredCF,
    financing,
    waterfall,
    exit,
    projectIRR,
    projectNPV,
    checks,
    // Metadata
    engineVersion: '5.0',
    computedAt: new Date().toISOString(),
  };
};
```

**Acceptance Criteria:**
- [ ] All financial functions extracted to src/engine/ directory
- [ ] App.jsx contains ONLY UI code (components, state, event handlers)
- [ ] engine/index.js provides single runFullModel() entry point
- [ ] All 633 tests pass after extraction (zero failures)
- [ ] ZAN benchmark numbers identical before and after extraction
- [ ] No number drift (diff = 0.00%) on any metric
- [ ] Engine can be imported and tested without React

---

### E3-5. isFund Logic Audit [Eval3-B2]

**User Story:** As a user in debt financing mode, I must not be charged fund fees (management fee, subscription fee, etc.) that only apply to fund structures.

**The Concern:**
```javascript
// Current logic in computeWaterfall:
const isFund = project.finMode === "fund" || project.vehicleType === "fund";
```

If `vehicleType` defaults to `"fund"` when not explicitly set, then:
- User selects finMode = "debt"
- vehicleType was never changed (still defaults to "fund")
- isFund = true → fund fees get applied to a debt-only project
- User gets charged management fees, subscription fees, etc. incorrectly

**Audit Actions:**
```javascript
// 1. Check: What is the default value of vehicleType?
// Search App.jsx for vehicleType initialization
// If default is "fund" → this is a BUG

// 2. Check: Where is vehicleType set by the user?
// Is it in the wizard? In financing settings? Never exposed?

// 3. Check: What downstream calculations use isFund?
// List every place isFund or vehicleType affects output numbers

// 4. Fix options:
// Option A: isFund should ONLY check finMode === "fund"
// Option B: vehicleType should default to "" or "spv", not "fund"
// Option C: vehicleType should be explicitly set in wizard step 3
```

**Acceptance Criteria:**
- [ ] vehicleType default value verified (if "fund" → change to "" or "spv")
- [ ] isFund logic reviewed and corrected if needed
- [ ] Confirm: debt-mode projects have ZERO fund fees applied
- [ ] Confirm: self-mode projects have ZERO fund fees applied
- [ ] Add test case: finMode="debt" → no management/subscription/structuring fees
- [ ] Add test case: finMode="self" → no waterfall, no fund fees

---

### E3-6. React Hooks Safety Fix [Eval3-B3]

**User Story:** As a developer, I need to ensure the app doesn't crash due to React Rules of Hooks violations when component state changes.

**The Problem:**
In `ReDevModelerInner`, there's an early return for `publicAcademy` before the rest of the hooks are declared:

```javascript
// CURRENT (dangerous):
const ReDevModelerInner = () => {
  const [publicAcademy, setPublicAcademy] = useState(false);
  
  if (publicAcademy) {
    return <AcademyView />; // ← EARLY RETURN before other hooks
  }
  
  const [projects, setProjects] = useState([]); // ← Hook after conditional return
  const [activeTab, setActiveTab] = useState('dashboard');
  // ... more hooks
};
```

React requires hooks to be called in the same order every render. An early return changes the hook call count.

**Fix:**
```javascript
// FIXED (safe):
const ReDevModelerInner = () => {
  const [publicAcademy, setPublicAcademy] = useState(false);
  const [projects, setProjects] = useState([]); // ← ALL hooks declared first
  const [activeTab, setActiveTab] = useState('dashboard');
  // ... ALL other hooks here
  
  // THEN conditional return
  if (publicAcademy) {
    return <AcademyView />;
  }
  
  // ... rest of component
};
```

**Acceptance Criteria:**
- [ ] All useState/useEffect/useMemo/useCallback calls appear BEFORE any conditional return
- [ ] No React hooks warnings in console
- [ ] Academy mode still works correctly after fix

---

### E3-7. Excel Reconciliation Suite [Eval3-A5 + A6]

**User Story:** As the platform owner, I need proof that every number in the platform matches the reference ZAN Excel models. This is the foundation of financial trust.

**Current State:**
- 633 tests exist across multiple test files
- ZAN benchmark tests exist (160 tests) but may not cover all edge cases
- Tests may be validating against the wrong engine (see E3-1)

**Target:** Comprehensive reconciliation that covers every output number.

**Reconciliation Matrix:**
| Excel File | Sheet | Key Outputs to Match | Status |
|-----------|-------|---------------------|--------|
| ZAN Project Model | 0_Calc | Per-asset CAPEX schedule (29 assets × 50 years) | Needs full check |
| ZAN Project Model | 3_Project_CashFlow | Unlevered CF per zone per year | Needs full check |
| ZAN Project Model | 4_Project_Outputs | IRR per zone, consolidated IRR, NPV | Needs full check |
| ZAN Fund Model | Fund_ZAN1 | Equity calls, debt draws, interest, fees | Needs full check |
| ZAN Fund Model | Fund_ZAN1 | Waterfall: pref accrual, catch-up, profit split | Needs full check |
| ZAN Fund Model | Fund_ZAN1 | LP IRR, GP IRR, MOIC, NPV at 10/12/14% | Needs full check |
| ZAN Bank Model | 02_BANK_SUMMARY | DSCR per year, debt balance, LTV | Needs full check |
| ZAN Bank Model | 03_CASHFLOW_REF | Levered CF matching | Needs full check |

**Test Structure:**
```javascript
// tests/zan_reconciliation.cjs

// Load ZAN benchmark data (extracted from Excel)
const ZAN_BENCHMARK = {
  projectModel: {
    totalCapex: 1348153756,
    consolidatedIRR: 0.1475,
    zan1IRR: 0.XXXX,
    zan2IRR: 0.XXXX,
    zan3IRR: 0.XXXX,
    total50yrRevenue: 13393731935,
    yearlyCapex: { 2026: XXXX, 2027: XXXX, /* ... */ },
    yearlyCashflow: { 2026: XXXX, 2027: XXXX, /* ... */ },
  },
  fundModel: {
    zan1: {
      totalEquity: XXXX,
      maxDebt: XXXX,
      lpIRR: 0.267,
      gpIRR: 0.222,
      lpMOIC: 4.64,
      gpMOIC: 3.88,
      yearlyDSCR: { 2028: XXXX, 2029: XXXX, /* ... */ },
      yearlyDistributions: { /* ... */ },
    },
    // zan2, zan3...
  },
  bankModel: {
    dscrByYear: { /* ... */ },
    debtBalanceByYear: { /* ... */ },
  }
};

// Test: Every number must match within tolerance
const TOLERANCE = 0.001; // 0.1%

describe('ZAN Full Reconciliation', () => {
  const project = loadZANBenchmarkProject();
  const results = runFullModel(project);
  
  test('Total CAPEX matches Excel', () => {
    const diff = Math.abs(results.capex.total - ZAN_BENCHMARK.projectModel.totalCapex);
    const pct = diff / ZAN_BENCHMARK.projectModel.totalCapex;
    expect(pct).toBeLessThan(TOLERANCE);
  });
  
  test('Consolidated IRR matches Excel', () => {
    const diff = Math.abs(results.projectIRR - ZAN_BENCHMARK.projectModel.consolidatedIRR);
    expect(diff).toBeLessThan(0.001); // Within 0.1% absolute
  });
  
  test('LP IRR ZAN1 matches Excel', () => {
    const diff = Math.abs(results.waterfall.zan1.lpIRR - ZAN_BENCHMARK.fundModel.zan1.lpIRR);
    expect(diff).toBeLessThan(0.001);
  });
  
  test('DSCR per year matches Excel', () => {
    Object.entries(ZAN_BENCHMARK.bankModel.dscrByYear).forEach(([year, expected]) => {
      const actual = results.financing.dscrByYear[year];
      const diff = Math.abs(actual - expected);
      expect(diff).toBeLessThan(0.01); // DSCR within 0.01x
    });
  });
  
  // ... test every number in the reconciliation matrix
});
```

**Acceptance Criteria:**
- [ ] ZAN benchmark data extracted from all 3 Excel files (exact numbers)
- [ ] Reconciliation test file covers ALL outputs in the matrix above
- [ ] Every test passes within 0.1% tolerance
- [ ] Year-by-year DSCR matches (not just average)
- [ ] Year-by-year distributions match (not just totals)
- [ ] Reconciliation runs as part of standard test suite
- [ ] Any future code change that breaks reconciliation is immediately caught

---

### E3-8. Proxy Labeling [Eval3-A2/A3 supplement]

**User Story:** Until all proxies are replaced with exact calculations, any approximation in the model must be clearly labeled so users know which numbers are exact and which are estimates.

**Current Problem:**
Proxies exist in the code but are invisible to the user. The user assumes all numbers are exact calculations.

**Target:** Every proxy/approximation gets a visible indicator.

**Implementation:**
```jsx
const ProxyIndicator = ({ tooltipAr, tooltipEn, lang }) => (
  <span 
    title={lang === 'ar' ? tooltipAr : tooltipEn}
    style={{
      display: 'inline-block',
      width: 16, height: 16,
      borderRadius: '50%',
      background: 'rgba(245,158,11,0.2)',
      color: '#f59e0b',
      fontSize: '0.65rem',
      textAlign: 'center',
      lineHeight: '16px',
      marginLeft: '4px',
      cursor: 'help'
    }}
  >
    ≈
  </span>
);

// Usage next to any proxy value:
<span>
  DSCR: {dscr.toFixed(2)}x
  {isProxyDSCR && (
    <ProxyIndicator 
      tooltipAr="قيمة تقريبية - سيتم تحديثها لحساب دقيق"
      tooltipEn="Approximate value - will be updated to exact calculation"
      lang={lang}
    />
  )}
</span>
```

**Fields to label (until E3-2 and E3-3 are completed):**
| Field | Type | Label |
|-------|------|-------|
| DSCR | Proxy | "تقريبي / Approximate" until E3-2 done |
| Management Fee (if NAV-based) | Proxy | "تقريبي / Approximate" until E3-3 done |
| Exit Valuation (fallback) | Fallback | "تقدير مبدئي / Initial estimate" |

**Acceptance Criteria:**
- [ ] ≈ indicator appears next to every proxy value
- [ ] Tooltip explains it's an approximation
- [ ] Indicator automatically removed when proxy is replaced with exact calc
- [ ] Bilingual tooltips

---

### E3-9. Inline Styles Strategy [Eval3-B4]

**User Story:** As a developer, I need a manageable styling system so UI changes don't require hunting through 2,000+ inline style objects.

**Current Problem:**
2,000+ inline style objects throughout App.jsx. No shared style system.

**Strategy (pragmatic - NOT a full rewrite):**

**Step 1: Create shared style constants (do immediately):**
```javascript
// src/styles.js
export const ZAN = {
  // Colors
  colors: {
    navy: '#0c1a2e',
    teal: '#5fbfbf',
    gold: '#d4a574',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    textPrimary: '#ffffff',
    textSecondary: '#d0d4dc',
    border: '#282d3a',
    surface: '#0f1117',
  },
  
  // Common patterns
  card: {
    background: 'rgba(15, 17, 23, 0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '0.6rem 0.8rem',
    color: '#fff',
    fontSize: '0.9rem',
  },
  
  btnPrimary: {
    background: 'linear-gradient(135deg, #5fbfbf 0%, #4a9fa0 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  
  btnSecondary: {
    background: 'transparent',
    border: '1px solid rgba(95,191,191,0.3)',
    color: '#5fbfbf',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    cursor: 'pointer',
  },
};
```

**Step 2: During engine extraction (E3-4), new components use ZAN.styles**

**Step 3: Gradually replace inline styles in existing components when touching them for other reasons**

**NOT doing:** Mass find-and-replace of all 2,000 inline styles. Too risky, too much churn.

**Acceptance Criteria:**
- [ ] src/styles.js created with shared constants
- [ ] All NEW components use shared styles
- [ ] Existing components updated when modified for other items
- [ ] No mass style replacement

---

### E3-10. Undo Memory Monitoring [Eval3-B5]

**User Story:** As a developer, I need to ensure the 30-state undo system doesn't cause memory issues on large projects.

**Current:** Undo stores 30 full snapshots of project state. Each snapshot includes all assets, all computed results.

**Risk:** For a project with 50+ assets and 50-year horizon, each snapshot could be significant.

**Action (monitoring, not fix):**
```javascript
// Add to undo system:
const pushUndo = (state) => {
  const snapshot = JSON.stringify(state);
  const sizeMB = (new Blob([snapshot]).size / 1024 / 1024).toFixed(2);
  
  if (sizeMB > 5) {
    console.warn(`[UNDO] Snapshot size: ${sizeMB}MB - consider optimization`);
  }
  
  // If total undo stack > 50MB, trim older entries
  const totalSize = undoStack.reduce((sum, s) => sum + new Blob([JSON.stringify(s)]).size, 0);
  if (totalSize > 50 * 1024 * 1024) {
    undoStack.shift(); // Remove oldest
    console.warn('[UNDO] Stack trimmed due to memory pressure');
  }
  
  undoStack.push(state);
};
```

**Acceptance Criteria:**
- [ ] Undo snapshots log their size in dev console
- [ ] Warning appears if single snapshot > 5MB
- [ ] Auto-trim if total stack > 50MB
- [ ] No user-facing changes

---

## RESEARCH ITEMS (Needs Analysis Before Decision)

### R1. Dashboard vs Results Overlap [Eval2-B1 + C2]

**Question:** Dashboard, Financing, Waterfall, and Results all show financial metrics. Is there real duplication? Should any be merged or removed?

**Background:** 
- Eval 2 suggests merging Dashboard + Results
- Our position: each tab shows data from a different angle (overview vs debt vs distribution vs consolidated returns)
- User's input: "الشلال ممكن نلغيها لأنه نفسها تظهر بالنتائج. نحتاج نرتب البيانات بين الداشبورد والنتائج أو نلغي أحداهما"

**Analysis needed:**
- [ ] Map exactly which metrics appear on which tabs
- [ ] Identify true duplicates (same number, same presentation)
- [ ] Propose: what's unique to each tab? What can be removed?
- [ ] Consider: if Waterfall tab is removed, where do waterfall configuration controls go?
- [ ] Consider: does Results tab need a "This is the official output" label?

**Possible outcomes:**
1. Keep all tabs, add clear labels explaining each tab's purpose
2. Remove Waterfall tab, move config to Financing, move results to Results tab
3. Remove Dashboard summary metrics, make it purely navigation/onboarding
4. Some other combination

**Decision:** To be made after analysis in a dedicated session.

---

### R2. Waterfall Tab Redundancy [Eval2 - related to R1]

**Question:** Is the Waterfall tab redundant with Results tab when finMode = fund?

**Current state:**
- Waterfall tab: shows distribution mechanics (unreturned capital tracking, pref accrual, catch-up, profit split) + LP/GP returns
- Results tab: shows consolidated returns including LP IRR, GP IRR, MOIC

**Key question:** Can the waterfall distribution detail (year-by-year mechanics) be shown as an expandable section within Results instead of a separate tab?

**Decision:** Linked to R1. Decide together.

---

## BACKLOG (Low Priority)

### Accessibility Basics [C2]

**Priority:** Lowest. Do when other items complete.

**Scope:**
- [ ] Add aria-label to all icon-only buttons
- [ ] Ensure tab navigation works on key flows (login, create project, save)
- [ ] Add role="alert" to toast notifications
- [ ] Test with keyboard-only navigation

---

## Implementation Order

| # | Item | Source | Phase | Effort | Impact |
|---|------|--------|-------|--------|--------|
| | **🚨 PRIORITY 0 - Financial Trust (before UX work)** | | | | |
| P1 | Legacy vs New Engine Conflict | Eval3-A4 | 0 | Large | **🚨 CRITICAL** |
| P2 | isFund Logic Audit | Eval3-B2 | 0 | Small | **🚨 CRITICAL** |
| P3 | React Hooks Safety Fix | Eval3-B3 | 0 | Small | High |
| P4 | Proxy Labeling (temporary) | Eval3-A2/A3 | 0 | Small | High |
| | **PHASE 1 - Quick Wins (UX)** | | | | |
| 1 | Toast System | Eval1-A6 | 1 | Small | High |
| 2 | Error Messages | Eval1-A5 | 1 | Small | High |
| 3 | Empty States + Progress Tracker | Eval1-A4 + Eval2-A4 | 1 | Medium | High |
| 4 | Auth Page Redesign | Eval1-A1 | 1 | Medium | High |
| 5 | Google Login Visibility | Eval2-C1 | 1 | Small | Medium |
| 6 | Background Gradients | Eval1-A8 | 1 | Small | Medium |
| 7 | Skeleton Loaders | Eval1-A6b | 1 | Small | Medium |
| 8 | Button States | Eval1-A6c | 1 | Small | Medium |
| 9 | CSV Template Visibility | Eval2-B4 | 1 | Small | Low |
| | **PHASE 2A - Engine Hardening (parallel with UX Phase 2)** | | | | |
| E1 | Financial Engine Extraction | Eval3-A1+B1 | 2A | X-Large | **🚨 CRITICAL** |
| E2 | Inline Styles Strategy (src/styles.js) | Eval3-B4 | 2A | Small | Medium |
| E3 | Excel Reconciliation Suite | Eval3-A5+A6 | 2A | Large | **🚨 CRITICAL** |
| E4 | DSCR Proxy Replacement | Eval3-A2 | 2A | Medium | High |
| E5 | Management Fee NAV Fix | Eval3-A3 | 2A | Medium | High |
| E6 | Undo Memory Monitoring | Eval3-B5 | 2A | Small | Low |
| | **PHASE 2B - Core UX Fixes (parallel with Engine)** | | | | |
| 10 | Dynamic Tab Visibility ⚡ | Eval2-A1 | 2B | Medium | **Critical** |
| 11 | Asset Templates ⚡ | Eval2-A2 | 2B | Large | **Critical** |
| 12 | Asset Data Prep Guide | Eval2-A2b | 2B | Small | Medium |
| 13 | Asset Modal Field Grouping | Eval2-A2c | 2B | Medium | High |
| 14 | Financing Settings Visible | Eval2-A3 | 2B | Medium | High |
| 15 | Financing KPI Strip | Eval2-A7 | 2B | Medium | High |
| 16 | Financing Charts | Eval1-A7 | 2B | Large | High |
| 17 | Dashboard KPIs | Eval1-A2 | 2B | Medium | High |
| 18 | Dashboard Filters | Eval1-A3 | 2B | Medium | Medium |
| 19 | Functional Colors Audit | Eval1-A7b | 2B | Medium | High |
| 20 | Input Validation | Eval2-A5 | 2B | Medium | High |
| 21 | Checks Fix Buttons | Eval2-A6 | 2B | Small | Medium |
| | **PHASE 3 - Polish** | | | | |
| 22 | Selective Animations | Eval1-B1 | 3 | Small | Medium |
| 23 | Brand Consistency | Eval1-B2 | 3 | Small | Medium |
| 24 | Spacing Audit | Eval1-B4 | 3 | Small | Medium |
| 25 | Typography Standardization | Eval1-A8b | 3 | Medium | Medium |
| 26 | Bilingual Audit | Eval1-B3 | 3 | Medium | Medium |
| 27 | Waterfall Tooltips Enhancement | Eval2-B3 | 3 | Small | Medium |
| 28 | Mobile Basic Improvements | Eval2-B2 | 3 | Medium | Medium |
| 29 | Report Preview Before Export | Eval2 supp | 3 | Medium | Medium |
| | **BACKLOG** | | | | |
| 30 | Accessibility Basics | Eval1-C2 | Backlog | Medium | Low |
| | **RESEARCH** | | | | |
| R1 | Dashboard vs Results Overlap | Eval2 | Research | - | - |
| R2 | Waterfall Tab Redundancy | Eval2 | Research | - | - |

---

## Items Rejected

### From Evaluation 1:
| Item | Reason |
|------|--------|
| Dark/Light Mode (C1) | Single theme is sufficient. High effort, low return. |
| Project Sharing (C3) | Already built - Supabase auth + RLS per user. Evaluator missed it. |
| External API (C4) | Too early. Not needed until scale phase. |
| i18n Library (B3 original) | Current inline system works. Migration cost too high for 2 languages. |
| Golden Ratio Spacing (B4 original) | Theoretical. Practical spacing fixes are better. |
| Full Animation Suite (B1 original) | Financial tool, not marketing site. Limited set only. |
| Shared Header/Footer with ZAN site (B2 original) | Different products, different audiences. Color/font alignment only. |

### From Evaluation 2:
| Item | Reason |
|------|--------|
| "No Google Login" (C1 original claim) | Google OAuth already configured. Issue is button visibility, not functionality. Converted to E2-7. |
| Simplify Waterfall terminology | Industry standard terms must be preserved. Enhanced tooltips + Academy links instead. |
| Full mobile redesign | Desktop-first financial tool. Basic improvements only (E2-8). |
| Merge Dashboard + Results | Tabs serve different purposes. Moved to Research (R1) for analysis. |

### From Evaluation 3:
| Item | Reason |
|------|--------|
| "Code engineering 4.5/10" rating | Doesn't account for context: single developer + AI, months not years. Functional rating is higher (~7/10). Structure rating accepted (~5.5/10). |
| "Not safe for investor decisions" (as absolute) | Platform is a modeling tool, not the final bank submission model. Excel models remain the bank-facing output. But point accepted: if platform aims to REPLACE Excel, numbers must match 100%. |
