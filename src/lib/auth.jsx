import { useState } from 'react'
import { supabase } from './supabase'

export function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useState(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription?.unsubscribe()
  }, [])

  if (!supabase) return children({ user: null, userId: 'anonymous', signOut: () => {} })
  if (loading) return (
    <div style={S.container}>
      <div style={{textAlign:'center',color:'#5fbfbf',fontSize:14}}>Loading...</div>
    </div>
  )
  if (session) return children({ user: session.user, userId: session.user.id, signOut: () => supabase.auth.signOut() })

  const go = async () => {
    setError(''); setMessage('')
    if (authMode === 'forgot') {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (e) setError(e.message); else setMessage('Check your email for the reset link')
      return
    }
    if (authMode === 'signup') {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) setError(e.message); else setMessage('Check your email to confirm your account')
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) setError(e.message)
    }
  }

  return (
    <div style={S.container}>
      <div style={S.bgGlow} />
      <div style={S.wrapper}>
        {/* Left - ZAN Branding */}
        <div style={S.brand}>
          <div>
            <div style={S.zanBadge}>ZAN</div>
            <div style={S.brandAr}>شركة زان لتطوير الوجهات</div>
            <div style={S.brandEn}>ZAN Destination Development</div>
            <div style={S.line} />
            <div style={S.product}>RE-DEV MODELER</div>
            <div style={S.descAr}>منصة النمذجة المالية للتطوير العقاري</div>
            <div style={S.descEn}>Real Estate Development Financial Modeling Platform</div>
            <div style={{marginTop:28,display:'flex',flexDirection:'column',gap:12}}>
              {[
                ['📊','تحليل مالي شامل للمشاريع العقارية'],
                ['🏗️','نمذجة التمويل والتدفقات النقدية'],
                ['📈','تحليل العوائد وشلال التوزيعات'],
                ['📋','تقارير جاهزة للبنوك والمستثمرين'],
              ].map(([icon,text],i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'#8aa0bb',direction:'rtl'}}>
                  <span style={{fontSize:14}}>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <div style={S.form}>
          <div style={S.formLogo}>RE-DEV</div>
          <div style={{fontSize:22,fontWeight:700,color:'#0c1a2e',marginBottom:4}}>
            {authMode==='login'?'Welcome back':authMode==='signup'?'Create account':'Reset password'}
          </div>
          <div style={{fontSize:13,color:'#6a7a8e',marginBottom:22}}>
            {authMode==='login'?'Sign in to access your projects':authMode==='signup'?'Start modeling your projects':'Enter your email to receive a reset link'}
          </div>

          <div style={S.tabs}>
            <button onClick={()=>{setAuthMode('login');setError('');setMessage('')}} style={{...S.tab,...(authMode==='login'?S.tabOn:{})}}>Sign In</button>
            <button onClick={()=>{setAuthMode('signup');setError('');setMessage('')}} style={{...S.tab,...(authMode==='signup'?S.tabOn:{})}}>Sign Up</button>
          </div>

          <div onKeyDown={e=>{if(e.key==='Enter')go()}} role="group">
            <div style={S.fld}>
              <label style={S.lbl}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={S.inp} />
            </div>
            {authMode!=='forgot'&&(
              <div style={S.fld}>
                <label style={S.lbl}>Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" style={S.inp} />
              </div>
            )}
            {error&&<div style={S.err}>{error}</div>}
            {message&&<div style={S.ok}>{message}</div>}
            <button onClick={go} style={S.btn}>
              {authMode==='login'?'Sign In':authMode==='signup'?'Create Account':'Send Reset Link'}
            </button>
            {authMode==='login'&&<div style={{textAlign:'center',marginTop:14}}><button onClick={()=>{setAuthMode('forgot');setError('');setMessage('')}} style={S.lnk}>Forgot password?</button></div>}
            {authMode==='forgot'&&<div style={{textAlign:'center',marginTop:14}}><button onClick={()=>{setAuthMode('login');setError('');setMessage('')}} style={S.lnk}>Back to sign in</button></div>}
          </div>

          <div style={{textAlign:'center',marginTop:28,paddingTop:18,borderTop:'1px solid #eef1f5',fontSize:11,color:'#8a9ab5'}}>
            Powered by <span style={{color:'#5fbfbf',fontWeight:600}}>ZAN</span> Development
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  container: { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0c1a2e 0%,#122240 40%,#0e2a3d 100%)',fontFamily:"'IBM Plex Sans Arabic','Tajawal','DM Sans',system-ui,sans-serif",position:'relative',overflow:'hidden' },
  bgGlow: { position:'absolute',top:0,left:0,right:0,bottom:0,background:'radial-gradient(circle at 20% 80%,rgba(95,191,191,0.08) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(95,191,191,0.05) 0%,transparent 50%)',pointerEvents:'none' },
  wrapper: { display:'flex',maxWidth:900,width:'100%',margin:'0 20px',borderRadius:16,overflow:'hidden',boxShadow:'0 25px 80px rgba(0,0,0,0.5)',position:'relative',zIndex:1 },
  brand: { flex:1,background:'linear-gradient(180deg,#0f2438 0%,#143048 50%,#0c1e30 100%)',padding:'40px 32px',display:'flex',flexDirection:'column',justifyContent:'center',borderRight:'1px solid rgba(95,191,191,0.15)',direction:'rtl',textAlign:'right' },
  zanBadge: { display:'inline-block',background:'linear-gradient(135deg,#5fbfbf,#4da8a8)',color:'#0c1a2e',padding:'6px 20px',borderRadius:6,fontSize:15,fontWeight:800,letterSpacing:3,marginBottom:20 },
  brandAr: { fontSize:22,fontWeight:700,color:'#e8edf5',marginBottom:4,fontFamily:"'Tajawal','IBM Plex Sans Arabic',sans-serif" },
  brandEn: { fontSize:12,color:'#6a8aaa',letterSpacing:1,marginBottom:24 },
  line: { width:50,height:2,background:'linear-gradient(90deg,#5fbfbf,transparent)',marginBottom:24,marginLeft:'auto' },
  product: { fontSize:18,fontWeight:700,color:'#5fbfbf',letterSpacing:2,marginBottom:10,fontFamily:"'DM Sans',system-ui,sans-serif",direction:'ltr',textAlign:'right' },
  descAr: { fontSize:13,color:'#a0b4cc',lineHeight:1.6,marginBottom:4 },
  descEn: { fontSize:11,color:'#5a7a9a',direction:'ltr',textAlign:'right' },
  form: { width:360,minWidth:340,background:'#fff',padding:'36px 30px',display:'flex',flexDirection:'column',justifyContent:'center' },
  formLogo: { fontSize:13,fontWeight:700,color:'#5fbfbf',letterSpacing:3,marginBottom:16,fontFamily:"'DM Sans',system-ui,sans-serif" },
  tabs: { display:'flex',gap:4,marginBottom:22,background:'#f0f3f7',borderRadius:8,padding:3 },
  tab: { flex:1,padding:'9px',border:'none',borderRadius:6,background:'transparent',color:'#6a7a8e',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit' },
  tabOn: { background:'#fff',color:'#0c1a2e',fontWeight:600,boxShadow:'0 1px 3px rgba(0,0,0,0.08)' },
  fld: { marginBottom:16 },
  lbl: { display:'block',fontSize:12,color:'#4a5a6e',marginBottom:6,fontWeight:500 },
  inp: { width:'100%',padding:'11px 14px',borderRadius:8,border:'1.5px solid #dde3ec',background:'#fafbfd',color:'#0c1a2e',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box' },
  btn: { width:'100%',padding:'12px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#0c1a2e,#1a3050)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:8 },
  lnk: { background:'none',border:'none',color:'#5fbfbf',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:500 },
  err: { background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',padding:'9px 12px',borderRadius:8,fontSize:12,marginBottom:12 },
  ok: { background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',padding:'9px 12px',borderRadius:8,fontSize:12,marginBottom:12 },
}
