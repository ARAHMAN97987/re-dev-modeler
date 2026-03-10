import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════════
// PASSWORD STRENGTH INDICATOR
// ═══════════════════════════════════════════════════════════
function PwdStrength({ strength }) {
  const L = [
    {ar:'ضعيفة جداً',en:'Too Weak',c:'#e74c3c'},
    {ar:'ضعيفة',en:'Weak',c:'#f39c12'},
    {ar:'مقبولة',en:'Fair',c:'#f1c40f'},
    {ar:'قوية',en:'Strong',c:'#2ecc71'},
    {ar:'ممتازة',en:'Very Strong',c:'#27ae60'},
  ]
  const s = L[strength] || L[0]
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
      <div style={{display:'flex',gap:3,flex:1}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{height:3,flex:1,borderRadius:2,background:i<strength?s.c:'#e8eef5',transition:'background 0.2s'}} />
        ))}
      </div>
      <span style={{fontSize:10,fontWeight:600,color:s.c,minWidth:70,textAlign:'right'}}>{s.ar}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════════════════
function LoadingScreen() {
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0c1a2e,#122240)',zIndex:1000}}>
      <div style={{width:36,height:36,border:'3px solid rgba(95,191,191,0.2)',borderTop:'3px solid #5fbfbf',borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:14}} />
      <p style={{color:'#5fbfbf',fontSize:13,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>جاري التحضير...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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

  const sw = (m) => { setMode(m); setError(''); setMessage(''); setConfirm('') }

  const go = async () => {
    setError(''); setMessage(''); setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (e) setError(e.message)
        else { setMessage('تم إرسال رابط الاستعادة! تحقق من بريدك الإلكتروني (تحقق أيضاً من مجلد البريد المزعج).'); setEmail('') }
      } else if (mode === 'signup') {
        if (password !== confirm) { setError('كلمات المرور غير متطابقة. تأكد من كتابتهما بنفس الطريقة.'); setBusy(false); return }
        if (pwdStr < 2) { setError('كلمة المرور ضعيفة جداً. استخدم 8 أحرف على الأقل مع أحرف كبيرة وأرقام.'); setBusy(false); return }
        const { error: e } = await supabase.auth.signUp({ email, password })
        if (e) { if (e.message.includes('already')) setError('هذا البريد مسجل بالفعل. هل تريد تسجيل الدخول بدلاً من ذلك؟'); else setError(e.message) }
        else { setMessage('تم إنشاء حسابك بنجاح! تحقق من بريدك الإلكتروني وانقر على الرابط لتأكيد حسابك.'); setEmail(''); setPassword(''); setConfirm('') }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        if (e) { if (e.message.includes('Invalid')) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق وحاول مرة أخرى.'); else setError(e.message) }
      }
    } catch { setError('حدث خطأ غير متوقع. حاول مرة أخرى.') }
    finally { setBusy(false) }
  }



  return (
    <div style={S.page}>
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Animated Background */}
      <div style={S.bg} />
      <div style={S.orb1} />
      <div style={S.orb2} />
      <div style={S.orb3} />

      {/* Floating Feature Pills (desktop) */}
      <div style={{position:'absolute',top:40,left:40,display:'flex',flexDirection:'column',gap:10,zIndex:2}}>
        {['Financial Modeling','Multi-Scenario','Institutional Grade','Bank Ready'].map((t,i)=>(
          <div key={i} style={{padding:'6px 16px',borderRadius:20,background:'rgba(95,191,191,0.08)',border:'1px solid rgba(95,191,191,0.12)',color:'rgba(95,191,191,0.5)',fontSize:11,fontWeight:500,animation:`float ${3+i*0.5}s ease-in-out infinite ${i*0.3}s`,fontFamily:"'DM Sans',sans-serif"}}>{t}</div>
        ))}
      </div>

      {/* Main Card */}
      <div style={S.card}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={S.logo}>ZAN</div>
          <div style={{fontSize:13,color:'#8a9ab5',marginTop:8,fontFamily:"'IBM Plex Sans Arabic',sans-serif"}}>نمذجة مالية عقارية متقدمة</div>
          <div style={{fontSize:11,color:'#aab5c8',marginTop:2,fontFamily:"'DM Sans',sans-serif",letterSpacing:0.5}}>Advanced Real Estate Financial Modeling</div>
        </div>

        {/* Mode Title */}
        <div style={{textAlign:'center',marginBottom:20,direction:'rtl'}}>
          <div style={{fontSize:20,fontWeight:700,color:'#0c1a2e',fontFamily:"'Tajawal',sans-serif"}}>
            {mode==='login'?'مرحباً بعودتك':mode==='signup'?'إنشاء حساب جديد':'استعادة كلمة المرور'}
          </div>
          <div style={{fontSize:12,color:'#6a7a8e',marginTop:4}}>
            {mode==='login'?'سجل دخولك للوصول لمشاريعك':mode==='signup'?'ابدأ بنمذجة مشاريعك العقارية':'أدخل بريدك الإلكتروني لإعادة التعيين'}
          </div>
        </div>

        {/* Tab Switcher */}
        {mode!=='forgot'&&(
          <div style={S.tabs}>
            <button onClick={()=>sw('login')} style={{...S.tab,...(mode==='login'?S.tabOn:{})}}>تسجيل الدخول</button>
            <button onClick={()=>sw('signup')} style={{...S.tab,...(mode==='signup'?S.tabOn:{})}}>حساب جديد</button>
          </div>
        )}

        {/* Messages */}
        {error&&<div style={S.err}>{error}</div>}
        {message&&<div style={S.ok}>{message}</div>}

        {/* Form */}
        <div onKeyDown={e=>{if(e.key==='Enter'&&!busy)go()}} role="group" style={{direction:'rtl'}}>
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

          {/* Confirm Password (signup only) */}
          {mode==='signup'&&(
            <div style={S.fld}>
              <label style={S.lbl}>تأكيد كلمة المرور</label>
              <Inp type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
            </div>
          )}

          {/* Forgot password help text */}
          {mode==='forgot'&&(
            <div style={{fontSize:12,color:'#6a7a8e',lineHeight:1.7,marginBottom:14,direction:'rtl'}}>
              أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.
            </div>
          )}

          {/* Submit Button */}
          <button onClick={go} disabled={busy} style={{...S.btn,opacity:busy?0.7:1,cursor:busy?'wait':'pointer'}}>
            {busy
              ? (mode==='login'?'جاري الدخول...':mode==='signup'?'جاري الإنشاء...':'جاري الإرسال...')
              : (mode==='login'?'دخول إلى حسابي':mode==='signup'?'إنشاء حسابي':'أرسل رابط الاستعادة')
            }
          </button>

          {/* Secondary Links */}
          <div style={{textAlign:'center',marginTop:14}}>
            {mode==='login'&&(
              <button onClick={()=>sw('forgot')} style={S.lnk}>هل تحتاج إلى مساعدة؟</button>
            )}
            {mode==='forgot'&&(
              <button onClick={()=>sw('login')} style={S.lnk}>تذكرت كلمة المرور؟ عودة</button>
            )}
          </div>

          {/* Switch mode */}
          {mode==='login'&&(
            <div style={{textAlign:'center',marginTop:16,fontSize:12,color:'#8a9ab5'}}>
              جديد على المنصة؟{' '}
              <button onClick={()=>sw('signup')} style={{...S.lnk,fontWeight:600}}>أنشئ حساباً مجاناً</button>
            </div>
          )}
          {mode==='signup'&&(
            <div style={{textAlign:'center',marginTop:16,fontSize:12,color:'#8a9ab5'}}>
              لديك حساب؟{' '}
              <button onClick={()=>sw('login')} style={{...S.lnk,fontWeight:600}}>دخول مباشرة</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{textAlign:'center',marginTop:24,paddingTop:16,borderTop:'1px solid #f0f2f5',fontSize:11,color:'#aab5c8'}}>
          Powered by <span style={{color:'#5fbfbf',fontWeight:600}}>ZAN</span> Development
        </div>
      </div>

      {/* Bottom right credit */}
      <div style={{position:'absolute',bottom:16,right:20,fontSize:10,color:'rgba(95,191,191,0.25)',zIndex:2,fontFamily:"'DM Sans',sans-serif"}}>
        © {new Date().getFullYear()} ZAN Destination Development
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const S = {
  page: { position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',fontFamily:"'IBM Plex Sans Arabic','Tajawal','DM Sans',sans-serif" },
  bg: { position:'absolute',inset:0,background:'linear-gradient(135deg,#0c1a2e 0%,#0a1220 25%,#122240 50%,#0a1220 75%,#0c1a2e 100%)',backgroundSize:'400% 400%',animation:'gradientShift 15s ease infinite' },
  orb1: { position:'absolute',width:450,height:450,background:'radial-gradient(circle,rgba(95,191,191,0.12) 0%,transparent 70%)',borderRadius:'50%',top:'-10%',left:'-5%',animation:'float 6s ease-in-out infinite',pointerEvents:'none' },
  orb2: { position:'absolute',width:350,height:350,background:'radial-gradient(circle,rgba(212,165,116,0.06) 0%,transparent 70%)',borderRadius:'50%',bottom:'-5%',right:'-3%',animation:'float 8s ease-in-out infinite 1s',pointerEvents:'none' },
  orb3: { position:'absolute',width:250,height:250,background:'radial-gradient(circle,rgba(95,191,191,0.08) 0%,transparent 70%)',borderRadius:'50%',top:'40%',right:'15%',animation:'float 7s ease-in-out infinite 2s',pointerEvents:'none' },

  card: { position:'relative',zIndex:10,background:'#fff',borderRadius:20,boxShadow:'0 24px 80px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.05)',padding:'40px 36px',width:'100%',maxWidth:420,margin:'0 16px',animation:'slideUp 0.5s ease-out',backdropFilter:'blur(10px)' },

  logo: { display:'inline-block',background:'linear-gradient(135deg,#5fbfbf,#48a5a5)',color:'#0a1828',padding:'8px 24px',borderRadius:8,fontSize:18,fontWeight:800,letterSpacing:4,boxShadow:'0 4px 20px rgba(95,191,191,0.25)',fontFamily:"'DM Sans',sans-serif" },

  tabs: { display:'flex',gap:4,marginBottom:20,background:'#f2f4f8',borderRadius:10,padding:3 },
  tab: { flex:1,padding:'10px',border:'none',borderRadius:8,background:'transparent',color:'#6a7a8e',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s' },
  tabOn: { background:'#fff',color:'#0c1a2e',fontWeight:600,boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },

  fld: { marginBottom:16 },
  lbl: { display:'block',fontSize:12,color:'#3a4a5e',marginBottom:6,fontWeight:600 },

  btn: { width:'100%',padding:'13px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#5fbfbf 0%,#48a5a5 100%)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:10,boxShadow:'0 4px 16px rgba(95,191,191,0.3)',transition:'all 0.2s',letterSpacing:0.3 },

  lnk: { background:'none',border:'none',color:'#5fbfbf',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500,padding:0 },

  err: { background:'#fef2f2',border:'1px solid #fecaca',color:'#c33',padding:'10px 14px',borderRadius:10,fontSize:12,marginBottom:14,lineHeight:1.6,direction:'rtl',animation:'slideUp 0.3s ease-out' },
  ok: { background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',padding:'10px 14px',borderRadius:10,fontSize:12,marginBottom:14,lineHeight:1.6,direction:'rtl',animation:'slideUp 0.3s ease-out' },
}

export default AuthGate
