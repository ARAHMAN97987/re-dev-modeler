import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════
// LOADING SCREEN — Apple HIG
// ═══════════════════════════════════════════════════════════
function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #F5F5F7)', zIndex: 1000,
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--surface-3, #E5E5EA)',
        borderTop: '3px solid var(--sys-blue, #007AFF)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 14,
      }} />
      <div style={{
        fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #1D1D1F)',
        letterSpacing: '-0.02em',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Tajawal', sans-serif",
      }}>
        Haseef
      </div>
      <p style={{
        color: 'var(--text-secondary, #86868B)', fontSize: 12, marginTop: 4,
      }}>Financial Modeler</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// PASSWORD STRENGTH — Apple HIG
// ═══════════════════════════════════════════════════════════
function PasswordStrength({ strength, lang }) {
  const ar = lang === 'ar'
  const labels = ar
    ? ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية']
    : ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = [
    '',
    'var(--sys-red, #FF3B30)',
    'var(--sys-orange, #FF9500)',
    'var(--sys-green, #34C759)',
    'var(--sys-green, #34C759)',
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i < strength ? colors[strength] : 'var(--surface-3, #E5E5EA)',
            transition: 'background 0.2s var(--ease-quart, cubic-bezier(0.25,1,0.5,1))',
          }} />
        ))}
      </div>
      {strength > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, color: colors[strength] }}>
          {labels[strength]}
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FEATURES DATA
// ═══════════════════════════════════════════════════════════
const features = [
  {
    icon: "🏗", titleAr: "نمذجة متعددة الأصول", titleEn: "Multi-Asset Modeling",
    descAr: "فنادق، محلات، مكاتب، سكني، مارينا — كلها في مشروع واحد مع تدفقات مستقلة",
    descEn: "Hotels, retail, offices, residential, marina — all in one project with independent cash flows",
  },
  {
    icon: "🏦", titleAr: "تمويل متقدم", titleEn: "Advanced Financing",
    descAr: "تمويل ذاتي، بنكي، صندوق مطور/مستثمر — مع دعم المرابحة والإجارة",
    descEn: "Self-funded, bank debt, Developer/Investor fund — with Murabaha and Ijara support",
  },
  {
    icon: "📊", titleAr: "شلال توزيعات", titleEn: "Waterfall Distributions",
    descAr: "4 مراحل: رد رأس المال → عائد تفضيلي → تعويض المطور → تقسيم الأرباح",
    descEn: "4-tier: Return of Capital → Preferred Return → Catch-up → Profit Split",
  },
  {
    icon: "🎯", titleAr: "تحليل السيناريوهات", titleEn: "Scenario Analysis",
    descAr: "8 سيناريوهات + جدول حساسية + تحليل نقطة التعادل",
    descEn: "8 scenarios + sensitivity table + break-even analysis",
  },
  {
    icon: "📄", titleAr: "تقارير احترافية", titleEn: "Professional Reports",
    descAr: "حزمة البنك، مذكرة المستثمر، ملخص تنفيذي — PDF و Excel",
    descEn: "Bank pack, investor memo, executive summary — PDF & Excel",
  },
  {
    icon: "🌐", titleAr: "ثنائي اللغة", titleEn: "Bilingual AR/EN",
    descAr: "واجهة كاملة بالعربي والإنجليزي مع tooltips تشرح كل مصطلح مالي",
    descEn: "Full Arabic & English interface with tooltips explaining every financial term",
  },
]

// ═══════════════════════════════════════════════════════════
// FEATURES PANEL — exported for reuse in dashboard
// ═══════════════════════════════════════════════════════════
export function FeaturesPanel({ lang = "ar", compact = false }) {
  const ar = lang === "ar"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 18 }}>
      {!compact && (
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontSize: 11, color: "var(--sys-blue, #007AFF)", letterSpacing: 1.5,
            textTransform: "uppercase", fontWeight: 600, marginBottom: 10,
          }}>
            Haseef Financial Modeler
          </div>
          <div style={{
            fontSize: 28, fontWeight: 700, color: "var(--text-primary, #1D1D1F)",
            lineHeight: 1.15, letterSpacing: "-0.02em", whiteSpace: "pre-line",
          }}>
            {ar
              ? "منصة النمذجة المالية\nللتطوير العقاري"
              : "Real Estate Development\nFinancial Modeling Platform"}
          </div>
          <div style={{
            fontSize: 14, color: "var(--text-secondary, #86868B)",
            marginTop: 12, lineHeight: 1.55, maxWidth: 440,
          }}>
            {ar
              ? "حوّل جداول Excel المعقدة إلى نموذج مالي تفاعلي. صمّم، حلّل، وصدّر تقارير احترافية في دقائق."
              : "Transform complex Excel spreadsheets into an interactive financial model. Design, analyze, and export professional reports in minutes."}
          </div>
        </div>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "1fr",
        gap: compact ? 10 : 10,
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            className="feat-card"
            style={{
              display: "flex", gap: 12,
              padding: compact ? "10px 12px" : "14px 16px",
              background: "var(--surface-1, #FFFFFF)",
              borderRadius: 12,
              border: "1px solid var(--hairline, rgba(0,0,0,0.08))",
              transition: "all 0.18s var(--ease-quart, cubic-bezier(0.25,1,0.5,1))",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--sys-blue, #007AFF) 30%, transparent)"
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--hairline, rgba(0,0,0,0.08))"
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            <span style={{ fontSize: compact ? 20 : 22, flexShrink: 0, lineHeight: 1 }}>{f.icon}</span>
            <div>
              <div style={{
                fontSize: compact ? 12 : 13, fontWeight: 600,
                color: "var(--text-primary, #1D1D1F)", marginBottom: 3,
                letterSpacing: "-0.01em",
              }}>
                {ar ? f.titleAr : f.titleEn}
              </div>
              <div style={{
                fontSize: compact ? 11 : 12,
                color: "var(--text-secondary, #86868B)", lineHeight: 1.5,
              }}>
                {ar ? f.descAr : f.descEn}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// AUTH GATE — Apple HIG split-screen
// ═══════════════════════════════════════════════════════════
export function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [pwdStr, setPwdStr] = useState(0)
  const [lang, setLang] = useState('ar')
  const ar = lang === 'ar'

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription?.unsubscribe()
  }, [])

  if (!supabase) return children({ user: null, userId: 'anonymous', signOut: () => {} })
  if (loading) return <LoadingScreen />
  if (session) return children({ user: session.user, userId: session.user.id, signOut: () => supabase.auth.signOut() })

  const calcPwd = (p) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    setPwdStr(s)
  }
  const switchMode = (m) => {
    setMode(m); setError(''); setMessage(''); setConfirm(''); setPwdStr(0)
  }

  const go = async () => {
    setError(''); setMessage(''); setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        e ? setError(e.message) : setMessage(ar ? 'تم إرسال رابط الاستعادة! تحقق من بريدك.' : 'Recovery link sent! Check your email.')
        setBusy(false); return
      }
      if (mode === 'signup') {
        if (password !== confirm) { setError(ar ? 'كلمات المرور غير متطابقة.' : 'Passwords don\'t match.'); setBusy(false); return }
        if (pwdStr < 2) { setError(ar ? 'كلمة المرور ضعيفة.' : 'Password too weak.'); setBusy(false); return }
        const { error: e } = await supabase.auth.signUp({ email, password })
        if (e) setError(e.message)
        else setMessage(ar ? 'تم إنشاء حسابك! تحقق من بريدك لتأكيد الحساب.' : 'Account created! Check email to confirm.')
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) setError(ar ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.')
      }
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  const dir = ar ? 'rtl' : 'ltr'

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--hairline, rgba(0,0,0,0.12))',
    background: 'var(--surface-1, #FFFFFF)',
    color: 'var(--text-primary, #1D1D1F)',
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s var(--ease-quart), box-shadow 0.15s var(--ease-quart)',
    fontVariantNumeric: 'tabular-nums',
  }

  const labelStyle = {
    fontSize: 12, color: 'var(--text-secondary, #86868B)',
    marginBottom: 6, display: 'block', fontWeight: 500,
    letterSpacing: "-0.01em",
  }

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr minmax(380px, 440px)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'DM Sans', 'Tajawal', 'Segoe UI', system-ui, sans-serif",
        background: 'var(--bg, #F5F5F7)',
        color: 'var(--text-primary, #1D1D1F)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: var(--text-tertiary, #AEAEB2); }
        input:focus {
          border-color: var(--sys-blue, #007AFF) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--sys-blue, #007AFF) 18%, transparent) !important;
        }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .feat-card { animation: fadeInUp 0.35s var(--ease-quart, cubic-bezier(0.25,1,0.5,1)) both; }
        .feat-card:nth-child(2) { animation-delay: 0.04s; }
        .feat-card:nth-child(3) { animation-delay: 0.08s; }
        .feat-card:nth-child(4) { animation-delay: 0.12s; }
        .feat-card:nth-child(5) { animation-delay: 0.16s; }
        .feat-card:nth-child(6) { animation-delay: 0.20s; }
        @media (max-width: 860px) {
          .zan-auth-grid { grid-template-columns: 1fr !important; }
          .zan-auth-features { display: none !important; }
        }
      `}</style>

      {/* ── Features Side (hidden on mobile) ── */}
      <div
        className="zan-auth-features"
        style={{
          padding: '56px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          overflow: 'auto',
          background: `
            radial-gradient(ellipse 1200px 800px at ${ar ? '90%' : '10%'} 20%, color-mix(in srgb, var(--sys-blue, #007AFF) 6%, transparent), transparent 60%),
            radial-gradient(ellipse 1000px 700px at ${ar ? '10%' : '90%'} 80%, color-mix(in srgb, var(--sys-indigo, #5856D6) 5%, transparent), transparent 60%),
            var(--bg, #F5F5F7)
          `,
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <FeaturesPanel lang={lang} />
          <div style={{
            marginTop: 40, display: 'flex', gap: 12,
            fontSize: 11, color: 'var(--text-tertiary, #AEAEB2)',
          }}>
            <span>© 2026 Haseef</span>
            <span>·</span>
            <span>{ar ? "جميع الحقوق محفوظة" : "All rights reserved"}</span>
          </div>
        </div>
      </div>

      {/* ── Login Side ── */}
      <div style={{
        background: 'var(--surface-1, #FFFFFF)',
        borderInlineStart: '1px solid var(--hairline, rgba(0,0,0,0.06))',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 44px',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.02)',
      }}>
        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              fontSize: 32, fontWeight: 800,
              color: 'var(--text-primary, #1D1D1F)',
              letterSpacing: '-0.03em',
              fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            }}>
              Haseef
            </div>
            <div style={{
              fontSize: 13, color: 'var(--text-secondary, #86868B)', marginTop: 4,
              letterSpacing: "-0.01em",
            }}>
              {mode === 'signup'
                ? (ar ? "إنشاء حساب جديد" : "Create your account")
                : mode === 'forgot'
                  ? (ar ? "استعادة كلمة المرور" : "Reset your password")
                  : (ar ? "تسجيل الدخول" : "Sign in to your account")}
            </div>
          </div>

          {/* Language toggle (segmented control, Apple style) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'flex',
              background: 'var(--surface-2, #F2F2F7)',
              borderRadius: 8, padding: 2,
            }}>
              {[{ v: 'ar', l: 'العربية' }, { v: 'en', l: 'English' }].map(({ v, l }) => {
                const on = lang === v
                return (
                  <button
                    key={v}
                    onClick={() => setLang(v)}
                    style={{
                      padding: '6px 16px', fontSize: 12, fontWeight: 600,
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      background: on ? 'var(--surface-1, #FFFFFF)' : 'transparent',
                      color: on ? 'var(--text-primary, #1D1D1F)' : 'var(--text-secondary, #86868B)',
                      fontFamily: 'inherit',
                      boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.15s var(--ease-quart, cubic-bezier(0.25,1,0.5,1))',
                    }}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mode tabs (sign in / sign up) */}
          {mode !== 'forgot' && (
            <div style={{
              display: 'flex', gap: 0, marginBottom: 24,
              background: 'var(--surface-2, #F2F2F7)',
              borderRadius: 10, padding: 3,
            }}>
              {[{ m: 'login', l: ar ? 'تسجيل دخول' : 'Sign In' },
                { m: 'signup', l: ar ? 'حساب جديد' : 'Sign Up' }].map(({ m, l }) => {
                const on = mode === m
                return (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    style={{
                      flex: 1, padding: '10px', fontSize: 13, fontWeight: 600,
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'inherit',
                      background: on ? 'var(--surface-1, #FFFFFF)' : 'transparent',
                      color: on ? 'var(--text-primary, #1D1D1F)' : 'var(--text-secondary, #86868B)',
                      boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.15s var(--ease-quart, cubic-bezier(0.25,1,0.5,1))',
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          )}

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>{ar ? 'البريد الإلكتروني' : 'Email'}</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && go()}
                autoComplete="email"
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <label style={labelStyle}>{ar ? 'كلمة المرور' : 'Password'}</label>
                <input
                  type="password" value={password}
                  onChange={e => { setPassword(e.target.value); if (mode === 'signup') calcPwd(e.target.value) }}
                  placeholder="••••••••"
                  style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && go()}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                {mode === 'signup' && <PasswordStrength strength={pwdStr} lang={lang} />}
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>{ar ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                <input
                  type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && go()}
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          {/* Error / Success callout (Apple style) */}
          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 10,
              background: 'color-mix(in srgb, var(--sys-red, #FF3B30) 8%, transparent)',
              color: 'var(--sys-red, #FF3B30)',
              fontSize: 12.5, lineHeight: 1.4,
              border: '1px solid color-mix(in srgb, var(--sys-red, #FF3B30) 20%, transparent)',
            }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 10,
              background: 'color-mix(in srgb, var(--sys-green, #34C759) 8%, transparent)',
              color: 'var(--sys-green, #34C759)',
              fontSize: 12.5, lineHeight: 1.4,
              border: '1px solid color-mix(in srgb, var(--sys-green, #34C759) 20%, transparent)',
            }}>
              {message}
            </div>
          )}

          {/* Submit button (Apple system blue, filled) */}
          <button
            onClick={go}
            disabled={busy}
            style={{
              marginTop: 20, width: '100%', padding: '12px 16px',
              borderRadius: 10, border: 'none',
              background: busy
                ? 'var(--surface-3, #E5E5EA)'
                : 'var(--sys-blue, #007AFF)',
              color: busy ? 'var(--text-tertiary, #AEAEB2)' : '#FFFFFF',
              fontSize: 15, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              transition: 'all 0.15s var(--ease-quart, cubic-bezier(0.25,1,0.5,1))',
              boxShadow: busy ? 'none' : '0 1px 2px rgba(0,122,255,0.25)',
            }}
            onMouseEnter={e => {
              if (!busy) {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--sys-blue, #007AFF) 92%, black)'
                e.currentTarget.style.transform = 'translateY(-0.5px)'
              }
            }}
            onMouseLeave={e => {
              if (!busy) {
                e.currentTarget.style.background = 'var(--sys-blue, #007AFF)'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {busy
              ? (ar ? 'جاري المعالجة…' : 'Loading…')
              : mode === 'login'
                ? (ar ? 'دخول' : 'Sign In')
                : mode === 'signup'
                  ? (ar ? 'إنشاء حساب' : 'Create Account')
                  : (ar ? 'إرسال رابط الاستعادة' : 'Send Recovery Link')}
          </button>

          {/* Forgot / Back link (Apple tinted button) */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {mode === 'login' && (
              <button
                onClick={() => switchMode('forgot')}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--sys-blue, #007AFF)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                {ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </button>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => switchMode('login')}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--sys-blue, #007AFF)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                {ar ? '← رجوع لتسجيل الدخول' : '← Back to Sign In'}
              </button>
            )}
          </div>

          {/* Legal footer */}
          <div style={{
            marginTop: 32, paddingTop: 16,
            borderTop: '1px solid var(--hairline, rgba(0,0,0,0.06))',
            textAlign: 'center', fontSize: 11,
            color: 'var(--text-tertiary, #AEAEB2)', lineHeight: 1.5,
          }}>
            {ar
              ? "بالمتابعة، فأنت توافق على شروط الاستخدام وسياسة الخصوصية"
              : "By continuing, you agree to our Terms of Service and Privacy Policy"}
          </div>
        </div>
      </div>
    </div>
  )
}
