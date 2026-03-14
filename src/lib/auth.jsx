import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function LoadingScreen() {
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0f1117',zIndex:1000}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:'3px solid rgba(95,191,191,0.2)',borderTop:'3px solid #5fbfbf',borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:14}} />
      <div style={{fontSize:28,fontWeight:700,color:'#5fbfbf',letterSpacing:2}}>ZAN</div>
      <p style={{color:'#6b7080',fontSize:12,marginTop:6}}>Financial Modeler</p>
    </div>
  )
}

function PasswordStrength({ strength }) {
  const labels = ['','Weak','Fair','Good','Strong']
  const colors = ['','#ef4444','#f59e0b','#22c55e','#16a34a']
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
      <div style={{display:'flex',gap:3,flex:1}}>
        {[0,1,2,3].map(i=>(<div key={i} style={{height:4,flex:1,borderRadius:2,background:i<strength?colors[strength]:'#1e2230',transition:'background 0.2s'}} />))}
      </div>
      {strength > 0 && <span style={{fontSize:10,fontWeight:600,color:colors[strength]}}>{labels[strength]}</span>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FEATURES DATA
// ═══════════════════════════════════════════════════════════
const features = [
  { icon: "🏗", titleAr: "نمذجة متعددة الأصول", titleEn: "Multi-Asset Modeling",
    descAr: "فنادق، محلات، مكاتب، سكني، مارينا - كلها في مشروع واحد مع تدفقات مستقلة",
    descEn: "Hotels, retail, offices, residential, marina - all in one project with independent cash flows" },
  { icon: "🏦", titleAr: "تمويل متقدم", titleEn: "Advanced Financing",
    descAr: "تمويل ذاتي، بنكي، صندوق GP/LP - مع دعم المرابحة والإجارة",
    descEn: "Self-funded, bank debt, GP/LP fund - with Murabaha and Ijara support" },
  { icon: "📊", titleAr: "شلال توزيعات", titleEn: "Waterfall Distributions",
    descAr: "4 مراحل: رد رأس المال → عائد تفضيلي → تعويض المطور → تقسيم الأرباح",
    descEn: "4-tier: Return of Capital → Preferred Return → GP Catch-up → Profit Split" },
  { icon: "🎯", titleAr: "تحليل السيناريوهات", titleEn: "Scenario Analysis",
    descAr: "8 سيناريوهات + جدول حساسية + تحليل نقطة التعادل",
    descEn: "8 scenarios + sensitivity table + break-even analysis" },
  { icon: "📄", titleAr: "تقارير احترافية", titleEn: "Professional Reports",
    descAr: "حزمة البنك، مذكرة المستثمر، ملخص تنفيذي - PDF و Excel",
    descEn: "Bank pack, investor memo, executive summary - PDF & Excel" },
  { icon: "🌐", titleAr: "ثنائي اللغة", titleEn: "Bilingual AR/EN",
    descAr: "واجهة كاملة بالعربي والإنجليزي مع tooltips تشرح كل مصطلح مالي",
    descEn: "Full Arabic & English interface with tooltips explaining every financial term" },
];

// ═══════════════════════════════════════════════════════════
// FEATURES PANEL (used in both landing and dashboard)
// ═══════════════════════════════════════════════════════════
export function FeaturesPanel({ lang = "ar", compact = false }) {
  const ar = lang === "ar";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:compact?12:16}}>
      {!compact && <>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:"#5fbfbf",letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>ZAN Financial Modeler</div>
          <div style={{fontSize:compact?20:28,fontWeight:800,color:"#fff",lineHeight:1.2,letterSpacing:-0.5}}>
            {ar?"منصة النمذجة المالية\nللتطوير العقاري":"Real Estate Development\nFinancial Modeling Platform"}
          </div>
          <div style={{fontSize:13,color:"#6b7080",marginTop:10,lineHeight:1.6,maxWidth:420}}>
            {ar?"حوّل جداول Excel المعقدة إلى نموذج مالي تفاعلي. صمم، حلل، وصدّر تقارير احترافية بدقائق.":"Transform complex Excel spreadsheets into interactive financial models. Design, analyze, and export professional reports in minutes."}
          </div>
        </div>
      </>}
      <div style={{display:"grid",gridTemplateColumns:compact?"1fr 1fr":"1fr",gap:compact?10:12}}>
        {features.map((f, i) => (
          <div key={i} style={{display:"flex",gap:12,padding:compact?"10px 12px":"14px 16px",background:"rgba(255,255,255,0.04)",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(95,191,191,0.2)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
            <span style={{fontSize:compact?20:24,flexShrink:0}}>{f.icon}</span>
            <div>
              <div style={{fontSize:compact?12:13,fontWeight:600,color:"#fff",marginBottom:2}}>{ar?f.titleAr:f.titleEn}</div>
              <div style={{fontSize:compact?10:11,color:"#6b7080",lineHeight:1.4}}>{ar?f.descAr:f.descEn}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AUTH GATE — Split Screen Landing
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

  const calcPwd = (p) => { let s=0; if(p.length>=8)s++; if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++; if(/[0-9]/.test(p))s++; if(/[^a-zA-Z0-9]/.test(p))s++; setPwdStr(s) }
  const switchMode = (m) => { setMode(m); setError(''); setMessage(''); setConfirm(''); setPwdStr(0) }

  const go = async () => {
    setError(''); setMessage(''); setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        e ? setError(e.message) : setMessage(ar?'تم إرسال رابط الاستعادة! تحقق من بريدك.':'Recovery link sent! Check your email.')
        setBusy(false); return
      }
      if (mode === 'signup') {
        if (password !== confirm) { setError(ar?'كلمات المرور غير متطابقة.':'Passwords don\'t match.'); setBusy(false); return }
        if (pwdStr < 2) { setError(ar?'كلمة المرور ضعيفة.':'Password too weak.'); setBusy(false); return }
        const { error: e } = await supabase.auth.signUp({ email, password })
        if (e) setError(e.message)
        else setMessage(ar?'تم إنشاء حسابك! تحقق من بريدك لتأكيد الحساب.':'Account created! Check email to confirm.')
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) setError(ar?'بيانات الدخول غير صحيحة.':'Invalid credentials.')
      }
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  const inputStyle = {width:'100%',padding:'12px 14px',borderRadius:8,border:'1px solid #282d3a',background:'#161a24',color:'#d0d4dc',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',transition:'border-color 0.15s'}
  const dir = ar ? 'rtl' : 'ltr'

  return (
    <div dir={dir} style={{minHeight:'100vh',display:'flex',fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:'#0f1117'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input::placeholder{color:#4b5060}
        input:focus{border-color:#5fbfbf !important;box-shadow:0 0 0 2px rgba(95,191,191,0.15) !important}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .feat-card{animation:fadeInUp 0.4s ease-out both}
      `}</style>

      {/* ── Features Side ── */}
      <div style={{flex:1,padding:'48px 40px',display:'flex',flexDirection:'column',justifyContent:'center',overflow:'auto'}}>
        <FeaturesPanel lang={lang} />
        <div style={{marginTop:32,display:'flex',gap:16,fontSize:11,color:'#4b5060'}}>
          <span>© 2026 ZAN</span>
          <span>·</span>
          <span>{ar?"جميع الحقوق محفوظة":"All rights reserved"}</span>
        </div>
      </div>

      {/* ── Login Side ── */}
      <div style={{width:420,minWidth:420,background:'#161a24',borderLeft:ar?'none':'1px solid #1e2230',borderRight:ar?'1px solid #1e2230':'none',display:'flex',flexDirection:'column',justifyContent:'center',padding:'48px 36px'}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:28,fontWeight:800,color:'#5fbfbf',letterSpacing:3}}>ZAN</div>
          <div style={{fontSize:11,color:'#6b7080',marginTop:4}}>{ar?"النمذجة المالية":"Financial Modeler"}</div>
        </div>

        {/* Language toggle */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
          <div style={{display:'flex',background:'#1e2230',borderRadius:6,padding:2}}>
            <button onClick={()=>setLang('ar')} style={{padding:'5px 16px',fontSize:11,fontWeight:600,border:'none',borderRadius:4,cursor:'pointer',background:lang==='ar'?'#5fbfbf':'transparent',color:lang==='ar'?'#0f1117':'#6b7080',fontFamily:'inherit'}}>عربي</button>
            <button onClick={()=>setLang('en')} style={{padding:'5px 16px',fontSize:11,fontWeight:600,border:'none',borderRadius:4,cursor:'pointer',background:lang==='en'?'#5fbfbf':'transparent',color:lang==='en'?'#0f1117':'#6b7080',fontFamily:'inherit'}}>EN</button>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:0,marginBottom:24,background:'#1e2230',borderRadius:8,padding:3}}>
          {[{m:'login',l:ar?'تسجيل دخول':'Sign In'},{m:'signup',l:ar?'حساب جديد':'Sign Up'}].map(({m,l})=>(
            <button key={m} onClick={()=>switchMode(m)} style={{flex:1,padding:'10px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit',background:mode===m||mode==='forgot'&&m==='login'?'#0f1117':'transparent',color:mode===m||mode==='forgot'&&m==='login'?'#d0d4dc':'#6b7080',transition:'all 0.15s'}}>{l}</button>
          ))}
        </div>

        {/* Form */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{fontSize:11,color:'#6b7080',marginBottom:4,display:'block',fontWeight:500}}>{ar?'البريد الإلكتروني':'Email'}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={ar?"you@example.com":"you@example.com"} style={inputStyle} onKeyDown={e=>e.key==='Enter'&&go()} />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label style={{fontSize:11,color:'#6b7080',marginBottom:4,display:'block',fontWeight:500}}>{ar?'كلمة المرور':'Password'}</label>
              <input type="password" value={password} onChange={e=>{setPassword(e.target.value);if(mode==='signup')calcPwd(e.target.value)}} placeholder="••••••••" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&go()} />
              {mode === 'signup' && <PasswordStrength strength={pwdStr} />}
            </div>
          )}
          {mode === 'signup' && (
            <div>
              <label style={{fontSize:11,color:'#6b7080',marginBottom:4,display:'block',fontWeight:500}}>{ar?'تأكيد كلمة المرور':'Confirm Password'}</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&go()} />
            </div>
          )}
        </div>

        {/* Error/Message */}
        {error && <div style={{marginTop:12,padding:'10px 14px',borderRadius:6,background:'#2a0a0a',color:'#f87171',fontSize:12,border:'1px solid #7f1d1d'}}>{error}</div>}
        {message && <div style={{marginTop:12,padding:'10px 14px',borderRadius:6,background:'#0a2a1a',color:'#4ade80',fontSize:12,border:'1px solid #166534'}}>{message}</div>}

        {/* Submit */}
        <button onClick={go} disabled={busy} style={{marginTop:18,width:'100%',padding:'13px',borderRadius:8,border:'none',background:busy?'#1e2230':'linear-gradient(135deg,#0f766e,#5fbfbf)',color:'#fff',fontSize:14,fontWeight:700,cursor:busy?'wait':'pointer',fontFamily:'inherit',letterSpacing:0.3,transition:'all 0.15s'}}>
          {busy ? (ar?'جاري...':'Loading...') : mode==='login' ? (ar?'دخول':'Sign In') : mode==='signup' ? (ar?'إنشاء حساب':'Create Account') : (ar?'إرسال رابط الاستعادة':'Send Recovery Link')}
        </button>

        {/* Forgot / Back */}
        <div style={{textAlign:'center',marginTop:14}}>
          {mode === 'login' && <button onClick={()=>switchMode('forgot')} style={{background:'none',border:'none',color:'#5fbfbf',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{ar?'نسيت كلمة المرور؟':'Forgot password?'}</button>}
          {mode === 'forgot' && <button onClick={()=>switchMode('login')} style={{background:'none',border:'none',color:'#5fbfbf',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{ar?'← رجوع لتسجيل الدخول':'← Back to Sign In'}</button>}
        </div>
      </div>
    </div>
  )
}
