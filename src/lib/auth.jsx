/**
 * ZAN Financial Modeler — AuthGate (Final Clean Version)
 */
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS (outside AuthGate to prevent re-mount bugs)
// ═══════════════════════════════════════════════════════════
const inpSt = {width:'100%',padding:'13px 16px',borderRadius:10,border:'1.5px solid #dde3ec',background:'#fafbfd',color:'#0c1a2e',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',transition:'border-color 0.2s'}

function Inp({type,value,onChange,placeholder,dir}) {
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} dir={dir||'ltr'} style={inpSt}
    onFocus={e=>{e.target.style.borderColor='#5fbfbf';e.target.style.boxShadow='0 0 0 3px rgba(95,191,191,0.1)'}}
    onBlur={e=>{e.target.style.borderColor='#dde3ec';e.target.style.boxShadow='none'}} />
}

function PwdStrength({ strength }) {
  if (strength === 0) return null
  const labels = ['','ضعيفة | Weak','مقبولة | Fair','قوية | Strong','ممتازة! | Very Strong']
  const colors = ['#e74c3c','#f39c12','#f1c40f','#2ecc71','#27ae60']
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
      <div style={{display:'flex',gap:3,flex:1}}>
        {[0,1,2,3].map(i=>(<div key={i} style={{height:4,flex:1,borderRadius:2,background:i<strength?colors[strength]:'#e8eef5',transition:'background 0.2s'}} />))}
      </div>
      <span style={{fontSize:10,fontWeight:600,color:colors[strength],minWidth:70,textAlign:'right'}}>{labels[strength]}</span>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0c1a2e,#122240)',zIndex:1000}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:'3px solid rgba(95,191,191,0.2)',borderTop:'3px solid #5fbfbf',borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:14}} />
      <p style={{color:'#5fbfbf',fontSize:13,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>جاري التحضير...</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// AUTH GATE — Main Component
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
        e ? setError(e.message) : setMessage('تم إرسال رابط الاستعادة! تحقق من بريدك.\nRecovery link sent! Check your email.')
        setBusy(false); return
      }
      if (mode === 'signup') {
        if (password !== confirm) { setError('كلمات المرور غير متطابقة.\nPasswords don\'t match.'); setBusy(false); return }
        if (pwdStr < 2) { setError('كلمة المرور ضعيفة. استخدم 8 أحرف مع أحرف كبيرة وأرقام.\nPassword too weak.'); setBusy(false); return }
        const { error: e } = await supabase.auth.signUp({ email, password })
        if (e) setError(e.message.includes('already') ? 'هذا البريد مسجل. سجل دخولك بدلاً من ذلك.\nEmail already registered.' : e.message)
        else { setMessage('تم إنشاء حسابك! تحقق من بريدك لتأكيد الحساب.\nAccount created! Check email to confirm.'); setEmail(''); setPassword(''); setConfirm('') }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) setError(e.message.includes('Invalid') ? 'البريد أو كلمة المرور غير صحيحة.\nIncorrect email or password.' : e.message)
      }
    } catch { setError('حدث خطأ غير متوقع. حاول مرة أخرى.') }
    finally { setBusy(false) }
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      `}</style>

      {/* Animated BG */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#0c1a2e 0%,#0a1220 25%,#122240 50%,#0e2235 75%,#0c1a2e 100%)',backgroundSize:'400% 400%',animation:'gradShift 20s ease infinite'}} />
      <div style={{position:'absolute',width:450,height:450,borderRadius:'50%',background:'radial-gradient(circle,rgba(95,191,191,0.12) 0%,transparent 70%)',top:'-10%',left:'-8%',animation:'float 7s ease-in-out infinite',pointerEvents:'none'}} />
      <div style={{position:'absolute',width:350,height:350,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,165,116,0.06) 0%,transparent 70%)',bottom:'-8%',right:'-5%',animation:'float 9s ease-in-out infinite 2s',pointerEvents:'none'}} />

      {/* Card */}
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:440,margin:'0 16px',animation:'slideUp 0.6s ease-out'}}>
        <div style={S.card}>
          {/* Header */}
          <div style={{textAlign:'center',marginBottom:28}}>
            <div style={{display:'inline-block',background:'linear-gradient(135deg,#5fbfbf,#48a5a5)',color:'#0a1828',padding:'8px 24px',borderRadius:8,fontSize:17,fontWeight:800,letterSpacing:4,marginBottom:14,boxShadow:'0 4px 20px rgba(95,191,191,0.25)',fontFamily:"'DM Sans',sans-serif"}}>ZAN</div>
            <div style={{fontSize:13,color:'#5fbfbf',letterSpacing:2,fontWeight:600,marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>FINANCIAL MODELER</div>
            <div style={{fontSize:13,color:'#8a9ab5',lineHeight:1.5,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>نمذجة مالية عقارية متقدمة</div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:4,marginBottom:22,background:'#f2f4f8',borderRadius:10,padding:3}}>
            {[{m:'login',l:'تسجيل الدخول | Sign In'},{m:'signup',l:'حساب جديد | Sign Up'}].map(t=>(
              <button key={t.m} onClick={()=>switchMode(t.m)} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:mode===t.m?'#fff':'transparent',color:mode===t.m?'#0c1a2e':'#6a7a8e',fontSize:12,fontWeight:mode===t.m?600:500,cursor:'pointer',fontFamily:'inherit',boxShadow:mode===t.m?'0 2px 8px rgba(0,0,0,0.06)':'none',transition:'all 0.15s'}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Messages */}
          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',padding:'10px 14px',borderRadius:10,fontSize:12,marginBottom:14,lineHeight:1.5,whiteSpace:'pre-line'}}>{error}</div>}
          {message && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',padding:'10px 14px',borderRadius:10,fontSize:12,marginBottom:14,lineHeight:1.5,whiteSpace:'pre-line'}}>{message}</div>}

          {/* Form */}
          <div onKeyDown={e=>{if(e.key==='Enter'&&!busy)go()}} role="group" style={{direction:'rtl'}}>
            {/* Forgot password help text */}
            {mode==='forgot'&&(
              <div style={{fontSize:12,color:'#6a7a8e',lineHeight:1.7,marginBottom:14}}>
                أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.
              </div>
            )}

            {/* Email */}
            <div style={S.fld}>
              <label style={S.lbl}>البريد الإلكتروني</label>
              <Inp type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
            </div>

            {/* Password */}
            {mode!=='forgot'&&(
              <div style={S.fld}>
                <label style={S.lbl}>كلمة المرور</label>
                <Inp type="password" value={password} onChange={v=>{setPassword(v);if(mode==='signup')calcPwd(v)}} placeholder="••••••••" />
                {mode==='signup'&&password.length>0&&<PwdStrength strength={pwdStr} />}
              </div>
            )}

            {/* Confirm Password */}
            {mode==='signup'&&(
              <div style={S.fld}>
                <label style={S.lbl}>تأكيد كلمة المرور</label>
                <Inp type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
              </div>
            )}

            {/* Submit button */}
            <button onClick={go} disabled={busy}
              style={{width:'100%',padding:'13px',borderRadius:10,border:'none',background:busy?'#8a9ab5':'linear-gradient(135deg,#0c1a2e,#1a3050)',color:'#fff',fontSize:14,fontWeight:600,cursor:busy?'not-allowed':'pointer',fontFamily:'inherit',marginTop:6,boxShadow:'0 4px 15px rgba(12,26,46,0.3)',opacity:busy?0.7:1,transition:'all 0.2s'}}>
              {mode==='login'?(busy?'جاري الدخول...':'دخول إلى حسابي | Access My Account'):
               mode==='signup'?(busy?'جاري الإنشاء...':'إنشاء حسابي مجاناً | Create Free Account'):
               (busy?'جاري الإرسال...':'أرسل رابط الاستعادة | Send Recovery Link')}
            </button>

            {/* Bottom links */}
            <div style={{textAlign:'center',marginTop:16,fontSize:12}}>
              {mode==='login'&&<>
                <button onClick={()=>switchMode('forgot')} style={S.lnk}>نسيت كلمة المرور؟ | Forgot password?</button>
                <div style={{marginTop:10,color:'#8a9ab5'}}>
                  جديد على المنصة؟{' '}
                  <button onClick={()=>switchMode('signup')} style={{...S.lnk,fontWeight:600}}>أنشئ حساباً مجاناً</button>
                </div>
              </>}
              {mode==='signup'&&<div style={{color:'#8a9ab5'}}>
                لديك حساب؟{' '}
                <button onClick={()=>switchMode('login')} style={{...S.lnk,fontWeight:600}}>دخول مباشرة | Sign In</button>
              </div>}
              {mode==='forgot'&&<button onClick={()=>switchMode('login')} style={S.lnk}>العودة لتسجيل الدخول | Back to Sign In</button>}
            </div>
          </div>

          {/* Footer */}
          <div style={{textAlign:'center',marginTop:24,paddingTop:16,borderTop:'1px solid #f0f2f5',fontSize:11,color:'#aab5c8'}}>
            Powered by <span style={{color:'#5fbfbf',fontWeight:600}}>ZAN</span> Development
            <div style={{marginTop:4,fontSize:10,color:'#c0c8d8'}}>© {new Date().getFullYear()} ZAN Destination Development</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic','Tajawal','DM Sans',system-ui,sans-serif",position:'relative',overflow:'hidden' },
  card: { background:'#fff',borderRadius:20,boxShadow:'0 25px 80px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08)',padding:'40px 36px' },
  fld: { marginBottom:16 },
  lbl: { display:'block',fontSize:13,fontWeight:600,color:'#0c1a2e',marginBottom:6,fontFamily:"'IBM Plex Sans Arabic',sans-serif" },
  lnk: { background:'none',border:'none',color:'#5fbfbf',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500,padding:0 },
}
