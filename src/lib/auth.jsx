import { useState } from 'react'
import { supabase } from './supabase'

export function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Check session on mount
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
  if (loading) return <div style={styles.container}><div style={styles.card}><div style={{textAlign:'center',color:'#6b7080'}}>Loading...</div></div></div>
  if (session) return children({ user: session.user, userId: session.user.id, signOut: () => supabase.auth.signOut() })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (authMode === 'forgot') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (err) setError(err.message)
      else setMessage('Check your email for the reset link')
      return
    }

    if (authMode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else setMessage('Check your email to confirm your account')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{color:'#4ade80',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase'}}>Real Estate Development</span>
          <div style={{fontSize:26,fontWeight:700,color:'#fff',marginTop:4}}>RE-DEV MODELER</div>
        </div>

        <div style={styles.tabs}>
          <button onClick={()=>{setAuthMode('login');setError('');setMessage('')}} style={{...styles.tab,...(authMode==='login'?styles.tabActive:{})}}>Login</button>
          <button onClick={()=>{setAuthMode('signup');setError('');setMessage('')}} style={{...styles.tab,...(authMode==='signup'?styles.tabActive:{})}}>Sign Up</button>
        </div>

        <div onKeyDown={e=>{if(e.key==='Enter')handleSubmit(e)}} role="group">
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" style={styles.input} />
          </div>

          {authMode !== 'forgot' && (
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" style={styles.input} />
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <button onClick={handleSubmit} style={styles.button}>
            {authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>

          {authMode === 'login' && (
            <div style={{textAlign:'center',marginTop:12}}>
              <button onClick={()=>{setAuthMode('forgot');setError('');setMessage('')}} style={styles.link}>Forgot password?</button>
            </div>
          )}
          {authMode === 'forgot' && (
            <div style={{textAlign:'center',marginTop:12}}>
              <button onClick={()=>{setAuthMode('login');setError('');setMessage('')}} style={styles.link}>Back to login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)', fontFamily:"'DM Sans', system-ui, sans-serif" },
  card: { width:380, background:'#1a1d23', borderRadius:12, padding:'32px 28px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' },
  logo: { textAlign:'center', marginBottom:28, paddingBottom:20, borderBottom:'1px solid #262a35' },
  tabs: { display:'flex', gap:4, marginBottom:20, background:'#0f1117', borderRadius:8, padding:3 },
  tab: { flex:1, padding:'8px', border:'none', borderRadius:6, background:'transparent', color:'#6b7080', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit' },
  tabActive: { background:'#262a35', color:'#fff' },
  field: { marginBottom:14 },
  label: { display:'block', fontSize:12, color:'#7b8094', marginBottom:5, fontWeight:500 },
  input: { width:'100%', padding:'10px 12px', borderRadius:6, border:'1px solid #282d3a', background:'#0f1117', color:'#d0d4dc', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
  button: { width:'100%', padding:'11px', borderRadius:6, border:'none', background:'#2563eb', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:8 },
  link: { background:'none', border:'none', color:'#6b7080', fontSize:12, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' },
  error: { background:'#2a0a0a', border:'1px solid #7f1d1d', color:'#fca5a5', padding:'8px 12px', borderRadius:6, fontSize:12, marginBottom:10 },
  success: { background:'#052e16', border:'1px solid #166534', color:'#86efac', padding:'8px 12px', borderRadius:6, fontSize:12, marginBottom:10 },
}
