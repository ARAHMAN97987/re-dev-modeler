import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const WATERFRONT_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663027980795/PfUcTsRAscFnLMXv.png";

function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const r = () => setM(window.innerWidth < bp); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, [bp]);
  return m;
}

function LoadingScreen() {
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0B2341',zIndex:1000}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:'3px solid rgba(46,196,182,0.2)',borderTop:'3px solid #2EC4B6',borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:14}} />
      <div style={{fontSize:32,fontWeight:900,color:'#fff',fontFamily:"'Tajawal',sans-serif"}}>زان</div>
      <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginTop:6}}>Financial Modeler</p>
    </div>
  )
}

function PasswordStrength({ strength }) {
  const labels = ['','Short','OK','Good','Strong']
  const colors = ['','#ef4444','#f59e0b','#22c55e','#16a34a']
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
      <div style={{display:'flex',gap:3,flex:1}}>
        {[0,1,2,3].map(i=>(<div key={i} style={{height:4,flex:1,borderRadius:2,background:i<strength?colors[strength]:'#163050',transition:'background 0.2s'}} />))}
      </div>
      {strength > 0 && <span style={{fontSize:10,fontWeight:600,color:colors[strength]}}>{labels[strength]}</span>}
    </div>
  )
}

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
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription?.unsubscribe()
  }, [])

  if (!supabase) return children({ user: null, userId: 'anonymous', signOut: () => {} })
  if (loading) return <LoadingScreen />
  if (session) return children({ user: session.user, userId: session.user.id, signOut: () => supabase.auth.signOut() })

  const calcPwd = (p) => { let s=0; if(p.length>=4)s++; if(p.length>=6)s++; if(p.length>=8)s++; if(p.length>=10)s++; setPwdStr(s) }
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
        if (password.length < 6) { setError(ar?'كلمة المرور قصيرة (6 أحرف على الأقل).':'Password too short (min 6 characters).'); setBusy(false); return }
        const { error: e } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (e) setError(e.message)
        else setMessage(ar?'تم إنشاء حسابك! تحقق من بريدك لتأكيد الحساب.':'Account created! Check email to confirm.')
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) setError(ar?'بيانات الدخول غير صحيحة.':'Invalid credentials.')
      }
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  const inputStyle = {width:'100%',padding:'13px 16px',borderRadius:10,border:'1px solid #163050',background:'rgba(11,35,65,0.5)',color:'#e0e5ec',fontSize:14,fontFamily:"'IBM Plex Sans Arabic','Tajawal',sans-serif",outline:'none',boxSizing:'border-box',transition:'border-color 0.2s',minHeight:48}

  return (
    <div dir={ar?'rtl':'ltr'} style={{minHeight:'100vh',display:'flex',flexDirection:isMobile?'column':'row',fontFamily:"'IBM Plex Sans Arabic','Tajawal',system-ui,sans-serif",background:'#0B2341'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        input::placeholder{color:rgba(255,255,255,0.25)}
        input:focus{border-color:#2EC4B6 !important;box-shadow:0 0 0 3px rgba(46,196,182,0.12) !important}
      `}</style>

      {/* ── Left: Hero with Waterfront Image ── */}
      {!isMobile && (
      <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <img src={WATERFRONT_IMG} alt="ZAN Waterfront" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} />
        <div style={{position:'absolute',inset:0,background:ar
          ?'linear-gradient(to left, #0B2341 5%, rgba(11,35,65,0.88) 45%, rgba(11,35,65,0.4) 100%)'
          :'linear-gradient(to right, #0B2341 5%, rgba(11,35,65,0.88) 45%, rgba(11,35,65,0.4) 100%)'}} />
        <div style={{position:'absolute',inset:0,opacity:0.035,backgroundImage:'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',backgroundSize:'40px 40px'}} />

        <div style={{position:'relative',zIndex:1,padding:'48px 52px'}}>
          <div style={{maxWidth:520}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 18px',background:'rgba(46,196,182,0.1)',border:'1px solid rgba(46,196,182,0.2)',borderRadius:24,marginBottom:24}}>
              <span style={{fontSize:12,color:'#2EC4B6',fontWeight:500}}>{ar?'شركة زان لتطوير الوجهات':'Zan Destination Development'}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
              <span style={{fontSize:56,fontWeight:900,color:'#fff',fontFamily:"'Tajawal',sans-serif",letterSpacing:-1}}>زان</span>
              <span style={{width:2,height:36,background:'rgba(46,196,182,0.35)',borderRadius:1}} />
              <span style={{fontSize:15,color:'rgba(255,255,255,0.45)',lineHeight:1.4,fontWeight:300}}>{ar?'النمذجة':'Financial'}<br/>{ar?'المالية':'Modeler'}</span>
            </div>
            <h1 style={{fontSize:38,fontWeight:900,color:'#fff',lineHeight:1.15,marginBottom:14,fontFamily:"'Tajawal',sans-serif"}}>
              {ar?'منصة النمذجة المالية':'Financial Modeling'}<br/>
              <span style={{color:'#C8A96E'}}>{ar?'للتطوير العقاري':'for Real Estate'}</span>
            </h1>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.5)',lineHeight:1.8,marginBottom:32,maxWidth:420}}>
              {ar?'حوّل جداول Excel المعقدة إلى نموذج مالي تفاعلي. صمم، حلل، وصدّر تقارير احترافية بدقائق.':'Transform complex Excel spreadsheets into interactive financial models. Design, analyze, and export professional reports in minutes.'}
            </p>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {[{icon:'📐',t:ar?'5 محركات':'5 Engines'},{icon:'📊',t:ar?'50+ سنة':'50+ Years'},{icon:'🤖',t:ar?'مساعد AI':'AI Assistant'}].map((f,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',background:'rgba(255,255,255,0.06)',backdropFilter:'blur(8px)',borderRadius:24,border:'1px solid rgba(255,255,255,0.08)'}}>
                  <span style={{fontSize:13}}>{f.icon}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.55)',fontWeight:500}}>{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Auth Form ── */}
      <div style={{width:isMobile?'100%':440,minWidth:isMobile?'auto':400,flex:isMobile?1:'none',background:'#071829',display:'flex',flexDirection:'column',justifyContent:'center',padding:isMobile?'36px 24px':'48px 40px'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{fontSize:36,fontWeight:900,color:'#fff',fontFamily:"'Tajawal',sans-serif"}}>زان</span>
            <span style={{width:1,height:24,background:'rgba(46,196,182,0.35)'}} />
            <span style={{fontSize:12,color:'#2EC4B6',lineHeight:1.3,fontWeight:300,textAlign:'start'}}>{ar?'النمذجة':'Financial'}<br/>{ar?'المالية':'Modeler'}</span>
          </div>
          {isMobile && <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:4}}>{ar?'شركة زان لتطوير الوجهات':'Zan Destination Development'}</div>}
        </div>

        <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
          <div style={{display:'flex',background:'#0B2341',borderRadius:8,padding:3,border:'1px solid #163050'}}>
            <button onClick={()=>setLang('ar')} style={{padding:'7px 20px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,cursor:'pointer',background:lang==='ar'?'#2EC4B6':'transparent',color:lang==='ar'?'#071829':'rgba(255,255,255,0.4)',fontFamily:'inherit',transition:'all 0.15s'}}>عربي</button>
            <button onClick={()=>setLang('en')} style={{padding:'7px 20px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,cursor:'pointer',background:lang==='en'?'#2EC4B6':'transparent',color:lang==='en'?'#071829':'rgba(255,255,255,0.4)',fontFamily:'inherit',transition:'all 0.15s'}}>EN</button>
          </div>
        </div>

        <div style={{display:'flex',gap:0,marginBottom:24,background:'#0B2341',borderRadius:10,padding:3,border:'1px solid #163050'}}>
          {[{m:'login',l:ar?'تسجيل دخول':'Sign In'},{m:'signup',l:ar?'حساب جديد':'Sign Up'}].map(({m,l})=>(
            <button key={m} onClick={()=>switchMode(m)} style={{flex:1,padding:'11px',fontSize:13,fontWeight:600,border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',background:mode===m||(mode==='forgot'&&m==='login')?'#163050':'transparent',color:mode===m||(mode==='forgot'&&m==='login')?'#fff':'rgba(255,255,255,0.35)',transition:'all 0.2s'}}>{l}</button>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <label style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:6,display:'block',fontWeight:500}}>{ar?'البريد الإلكتروني':'Email'}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&go()} />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:6,display:'block',fontWeight:500}}>{ar?'كلمة المرور':'Password'}</label>
              <input type="password" value={password} onChange={e=>{setPassword(e.target.value);if(mode==='signup')calcPwd(e.target.value)}} placeholder={ar?'6 أحرف أو أرقام':'6+ characters'} style={inputStyle} onKeyDown={e=>e.key==='Enter'&&go()} />
              {mode === 'signup' && <PasswordStrength strength={pwdStr} />}
            </div>
          )}
          {mode === 'signup' && (
            <div>
              <label style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:6,display:'block',fontWeight:500}}>{ar?'تأكيد كلمة المرور':'Confirm Password'}</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&go()} />
            </div>
          )}
        </div>

        {error && <div style={{marginTop:14,padding:'12px 16px',borderRadius:8,background:'rgba(239,68,68,0.08)',color:'#f87171',fontSize:12,border:'1px solid rgba(239,68,68,0.2)'}}>{error}</div>}
        {message && <div style={{marginTop:14,padding:'12px 16px',borderRadius:8,background:'rgba(74,222,128,0.08)',color:'#4ade80',fontSize:12,border:'1px solid rgba(74,222,128,0.2)'}}>{message}</div>}

        <button onClick={go} disabled={busy} style={{marginTop:20,width:'100%',padding:'14px',borderRadius:10,border:'none',background:busy?'#163050':'#2EC4B6',color:busy?'rgba(255,255,255,0.4)':'#fff',fontSize:15,fontWeight:700,cursor:busy?'wait':'pointer',fontFamily:"'Tajawal',sans-serif",letterSpacing:0.3,transition:'all 0.2s',minHeight:50}}>
          {busy ? (ar?'جاري...':'Loading...') : mode==='login' ? (ar?'دخول':'Sign In') : mode==='signup' ? (ar?'إنشاء حساب':'Create Account') : (ar?'إرسال رابط':'Send Link')}
        </button>

        <div style={{textAlign:'center',marginTop:16}}>
          {mode === 'login' && <button onClick={()=>switchMode('forgot')} style={{background:'none',border:'none',color:'#2EC4B6',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{ar?'نسيت كلمة المرور؟':'Forgot password?'}</button>}
          {mode === 'forgot' && <button onClick={()=>switchMode('login')} style={{background:'none',border:'none',color:'#2EC4B6',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{ar?'← رجوع':'← Back to Sign In'}</button>}
        </div>

        <div style={{marginTop:32,textAlign:'center',fontSize:10,color:'rgba(255,255,255,0.15)'}}>
          {ar?'شركة زان لتطوير الوجهات':'Zan Destination Development'} © 2026
        </div>
      </div>
    </div>
  )
}
