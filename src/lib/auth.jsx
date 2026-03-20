import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// ─── Haseef Design Tokens (from zandestiny.com) ───
const C = {
  navy: "#0B2341", deep: "#071829", teal: "#2EC4B6", gold: "#C8A96E",
  tealDim: "rgba(46,196,182,0.12)", tealBorder: "rgba(46,196,182,0.25)",
  goldDim: "rgba(200,169,110,0.12)", goldBorder: "rgba(200,169,110,0.25)",
  w05: "rgba(255,255,255,0.05)", w10: "rgba(255,255,255,0.10)",
  w15: "rgba(255,255,255,0.15)", w25: "rgba(255,255,255,0.25)",
  w30: "rgba(255,255,255,0.30)", w40: "rgba(255,255,255,0.40)",
  w50: "rgba(255,255,255,0.50)", w70: "rgba(255,255,255,0.70)",
};

const TX = {
  tagline: { en: "Destination Development", ar: "تطوير الوجهات" },
  fm: { en: "Financial Modeler", ar: "النمذجة المالية" },
  signIn: { en: "Sign In", ar: "تسجيل الدخول" },
  signUp: { en: "Sign Up", ar: "إنشاء حساب" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  confirmPw: { en: "Confirm Password", ar: "تأكيد كلمة المرور" },
  forgot: { en: "Forgot password?", ar: "نسيت كلمة المرور؟" },
  backToLogin: { en: "\u2190 Back to Sign In", ar: "\u2190 رجوع لتسجيل الدخول" },
  or: { en: "or", ar: "أو" },
  noAcc: { en: "Don't have an account?", ar: "ليس لديك حساب؟" },
  hasAcc: { en: "Already have an account?", ar: "لديك حساب بالفعل؟" },
  cr: { en: "Haseef Financial Modeler", ar: "حصيف للنمذجة المالية" },
  heroT1: { en: "Model Smarter.", ar: "نمذجة أذكى." },
  heroT2: { en: "Build Faster.", ar: "بناء أسرع." },
  heroP: { en: "The all-in-one financial modeling platform for real estate development. From feasibility to bank pack, in one place.", ar: "منصة النمذجة المالية المتكاملة لتطوير العقارات. من دراسة الجدوى حتى ملف البنك، في مكان واحد." },
  academy: { en: "Haseef Academy", ar: "أكاديمية حصيف" },
  academyP: { en: "Learn real estate financial modeling with interactive lessons, demo projects, and guided learning paths. No account required.", ar: "تعلم النمذجة المالية العقارية مع دروس تفاعلية، مشاريع تجريبية، ومسارات تعليمية موجهة. بدون حساب." },
  academyCta: { en: "Start Learning", ar: "ابدأ التعلم" },
  free: { en: "FREE", ar: "مجاني" },
  emailPh: { en: "you@example.com", ar: "you@example.com" },
  pwPh: { en: "6+ characters", ar: "6 أحرف أو أكثر" },
  poweredBy: { en: "Built for the Saudi real estate market", ar: "مصمم للسوق العقاري السعودي" },
  sendLink: { en: "Send Recovery Link", ar: "إرسال رابط الاستعادة" },
  loading: { en: "Loading...", ar: "جاري..." },
  createAcc: { en: "Create Account", ar: "إنشاء حساب" },
  features: [
    { icon: "chart", t: { en: "Project Engine", ar: "محرك المشاريع" }, d: { en: "Multi-asset CAPEX, revenue projections & unlevered IRR/NPV", ar: "رأس المال المتعدد، توقعات الإيرادات والعائد غير المرفوع" } },
    { icon: "bank", t: { en: "Financing & Debt", ar: "التمويل والدين" }, d: { en: "Bank debt, Islamic finance (Murabaha/Ijara) & DSCR", ar: "تمويل بنكي، إسلامي (مرابحة/إجارة) و DSCR" } },
    { icon: "waterfall", t: { en: "Waterfall Engine", ar: "محرك التوزيعات" }, d: { en: "4-tier GP/LP distribution with configurable pref return", ar: "توزيعات GP/LP بأربع مراحل مع عائد مفضل" } },
    { icon: "file", t: { en: "Bank Pack & Reports", ar: "ملف البنك والتقارير" }, d: { en: "Auto-generated bank packs & investor memos PDF/Excel", ar: "ملفات بنك تلقائية ومذكرات مستثمرين PDF/Excel" } },
    { icon: "grid", t: { en: "Scenario Analysis", ar: "تحليل السيناريوهات" }, d: { en: "Compare 8 scenarios with sensitivity & break-even", ar: "مقارنة 8 سيناريوهات مع حساسية ونقطة تعادل" } },
    { icon: "layers", t: { en: "Gov. Incentives", ar: "الحوافز الحكومية" }, d: { en: "CAPEX grants, interest subsidies & fee waivers", ar: "منح رأس المال، دعم الفائدة والإعفاءات" } },
  ],
  stats: [
    { v: "50+", l: { en: "Year Projections", ar: "سنة توقعات" } },
    { v: "8", l: { en: "Scenarios", ar: "سيناريوهات" } },
    { v: "633", l: { en: "Tests Pass", ar: "اختبار ناجح" } },
    { v: "5", l: { en: "Core Modules", ar: "وحدات أساسية" } },
  ],
};
const t = (o, l) => o[l] || o.en;

const IC = {
  chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 6-10"/></svg>,
  bank: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M12 3l9 7H3z"/><path d="M5 10v11"/><path d="M19 10v11"/><path d="M9 10v11"/><path d="M14 10v11"/></svg>,
  waterfall: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="14" width="4" height="7" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="18" y="3" width="4" height="18" rx="1"/></svg>,
  file: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>,
  grid: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6"/><path d="M12 17v6"/><path d="M4.22 4.22l4.24 4.24"/><path d="M15.54 15.54l4.24 4.24"/><path d="M1 12h6"/><path d="M17 12h6"/></svg>,
  layers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  eye: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>,
  book: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  globe: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  sparkle: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"/></svg>,
};

function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return w;
}

function LoadingScreen() {
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:C.navy,zIndex:1000}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:`3px solid ${C.tealDim}`,borderTop:`3px solid ${C.teal}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:14}} />
      <div style={{fontSize:32,fontWeight:900,color:'#fff',fontFamily:"'Tajawal',sans-serif"}}>حصيف</div>
      <p style={{color:C.w40,fontSize:12,marginTop:6}}>Financial Modeler</p>
    </div>
  )
}

function PasswordStrength({ strength }) {
  const labels = ['','Short','OK','Good','Strong']
  const colors = ['','#ef4444','#f59e0b','#22c55e','#16a34a']
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
      <div style={{display:'flex',gap:3,flex:1}}>
        {[0,1,2,3].map(i=>(<div key={i} style={{height:4,flex:1,borderRadius:2,background:i<strength?colors[strength]:C.w10,transition:'background 0.2s'}} />))}
      </div>
      {strength > 0 && <span style={{fontSize:10,fontWeight:600,color:colors[strength]}}>{labels[strength]}</span>}
    </div>
  )
}

function Orbs() {
  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
      {[{w:500,top:'-10%',left:'-8%',c:C.teal,dur:25,o:0.07},{w:400,top:'50%',right:'-5%',c:C.gold,dur:30,o:0.06},{w:350,bottom:'-5%',left:'30%',c:C.teal,dur:22,o:0.05}].map((orb,i)=>(
        <div key={i} style={{position:'absolute',width:orb.w,height:orb.w,borderRadius:'50%',background:`radial-gradient(circle,${orb.c} 0%,transparent 70%)`,opacity:orb.o,top:orb.top,left:orb.left,right:orb.right,bottom:orb.bottom,animation:`orb${i} ${orb.dur}s ease-in-out infinite`}} />
      ))}
      <style>{`@keyframes orb0{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-30px)}}@keyframes orb1{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,40px)}}@keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(25px,20px)}}`}</style>
    </div>
  );
}

function FeatCard({icon,title,desc,idx,rtl,compact}) {
  const isTeal=idx%2===0; const ac=isTeal?C.teal:C.gold; const bg=isTeal?C.tealDim:C.goldDim; const bd=isTeal?C.tealBorder:C.goldBorder;
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?`${ac}18`:bg,border:`1px solid ${hov?ac:bd}`,borderRadius:14,padding:compact?'14px 16px':'18px 20px',display:'flex',alignItems:'flex-start',gap:compact?12:14,direction:rtl?'rtl':'ltr',transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',transform:hov?'translateY(-3px)':'translateY(0)',boxShadow:hov?`0 8px 30px ${ac}20`:'none',cursor:'default'}}>
      <div style={{width:compact?36:42,height:compact?36:42,borderRadius:10,background:`${ac}20`,color:ac,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'transform 0.3s',transform:hov?'scale(1.1)':'scale(1)'}}>{IC[icon]}</div>
      <div style={{minWidth:0}}>
        <div style={{color:'#fff',fontSize:compact?13:14.5,fontWeight:700,marginBottom:3,fontFamily:"'Tajawal',sans-serif"}}>{title}</div>
        <div style={{color:C.w40,fontSize:compact?11.5:12.5,lineHeight:1.55}}>{desc}</div>
      </div>
    </div>
  );
}

function AcademyCard({lang,isRTL,isMobile,onEnter}) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?`linear-gradient(135deg,rgba(200,169,110,0.18) 0%,rgba(200,169,110,0.06) 100%)`:`linear-gradient(135deg,${C.goldDim} 0%,rgba(200,169,110,0.03) 100%)`,border:`1px solid ${hov?C.gold:C.goldBorder}`,borderRadius:16,padding:isMobile?'20px':'24px 28px',display:'flex',alignItems:isMobile?'flex-start':'center',gap:isMobile?14:20,cursor:'pointer',transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',transform:hov?'translateY(-2px)':'translateY(0)',boxShadow:hov?'0 12px 40px rgba(200,169,110,0.15)':'none',flexDirection:isMobile?'column':'row'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,width:'100%'}}>
        <div style={{width:48,height:48,borderRadius:14,background:`${C.gold}20`,color:C.gold,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'transform 0.3s',transform:hov?'scale(1.08)':'scale(1)'}}>{IC.book}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{color:'#fff',fontSize:15,fontWeight:800,fontFamily:"'Tajawal',sans-serif"}}>{t(TX.academy,lang)}</span>
            <span style={{padding:'2px 10px',borderRadius:20,background:`linear-gradient(135deg,${C.gold},#d4b87a)`,color:C.deep,fontSize:10,fontWeight:800,letterSpacing:'0.5px'}}>{t(TX.free,lang)}</span>
          </div>
          <p style={{color:C.w40,fontSize:12.5,lineHeight:1.5,margin:0}}>{t(TX.academyP,lang)}</p>
        </div>
      </div>
      <button onClick={onEnter} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,background:hov?`${C.gold}35`:`${C.gold}25`,border:`1px solid ${C.goldBorder}`,color:C.gold,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Tajawal',sans-serif",transition:'all 0.3s',alignSelf:isMobile?'stretch':'center',justifyContent:'center'}}>
        {t(TX.academyCta,lang)}
        <span style={{transform:isRTL?'rotate(180deg)':'none',display:'flex'}}>{IC.arrow}</span>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AUTH GATE
// ═══════════════════════════════════════════════════════════
export function AuthGate({ children }) {
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [mode,setMode]=useState('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [pwdStr,setPwdStr]=useState(0)
  const [lang,setLang]=useState('ar')
  const [showPublicAcademy,setShowPublicAcademy]=useState(false)
  const [showPw,setShowPw]=useState(false)
  const [mounted,setMounted]=useState(false)
  const width=useWidth()
  const ar=lang==='ar'; const isRTL=ar; const dir=ar?'rtl':'ltr'; const isMobile=width<900;

  useEffect(()=>{setTimeout(()=>setMounted(true),50)},[])
  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data:{session:s}})=>{setSession(s);setLoading(false);window.scrollTo(0,0)})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);window.scrollTo(0,0)})
    return()=>subscription?.unsubscribe()
  },[])

  if(!supabase)return children({user:null,userId:'anonymous',signOut:()=>{}})
  if(loading)return <LoadingScreen/>
  if(session)return children({user:session.user,userId:session.user.id,signOut:()=>supabase.auth.signOut()})
  if(showPublicAcademy)return children({user:null,userId:'anonymous',signOut:null,publicAcademy:true,exitAcademy:()=>setShowPublicAcademy(false)})

  const calcPwd=(p)=>{let s=0;if(p.length>=4)s++;if(p.length>=6)s++;if(p.length>=8)s++;if(p.length>=10)s++;setPwdStr(s)}
  const switchMode=(m)=>{setMode(m);setError('');setMessage('');setConfirm('');setPwdStr(0)}

  const go=async()=>{
    setError('');setMessage('');setBusy(true)
    try{
      if(mode==='forgot'){
        const{error:e}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin})
        e?setError(e.message):setMessage(ar?'تم إرسال رابط الاستعادة! تحقق من بريدك.':'Recovery link sent! Check your email.')
        setBusy(false);return
      }
      if(mode==='signup'){
        if(password!==confirm){setError(ar?'كلمات المرور غير متطابقة.':'Passwords don\'t match.');setBusy(false);return}
        if(password.length<6){setError(ar?'كلمة المرور قصيرة (6 أحرف على الأقل).':'Password too short (min 6 characters).');setBusy(false);return}
        const{error:e}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}})
        if(e)setError(e.message);else setMessage(ar?'تم إنشاء حسابك! تحقق من بريدك لتأكيد الحساب.':'Account created! Check email to confirm.')
      }else{
        const{error:e}=await supabase.auth.signInWithPassword({email,password})
        if(e)setError(ar?'بيانات الدخول غير صحيحة.':'Invalid credentials.')
      }
    }catch(e){setError(e.message)}
    setBusy(false)
  }

  const inp={width:'100%',padding:'13px 16px',background:C.w05,border:`1px solid ${C.w15}`,borderRadius:10,color:'#fff',fontSize:14,outline:'none',transition:'border-color 0.3s,box-shadow 0.3s',fontFamily:"'Tajawal',sans-serif",direction:dir,boxSizing:'border-box'}
  const lbl={display:'block',color:C.w50,fontSize:12.5,marginBottom:6,fontFamily:"'Tajawal',sans-serif",textAlign:isRTL?'right':'left'}
  const focusIn=(e)=>{e.target.style.borderColor=C.teal;e.target.style.boxShadow=`0 0 0 3px ${C.tealDim}`}
  const blurIn=(e)=>{e.target.style.borderColor=C.w15;e.target.style.boxShadow='none'}

  const Showcase=()=>(
    <div style={{display:'flex',flexDirection:'column',gap:isMobile?20:28,opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(30px)',transition:'all 0.8s cubic-bezier(0.4,0,0.2,1) 0.1s'}}>
      <div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 14px',borderRadius:20,background:C.tealDim,border:`1px solid ${C.tealBorder}`,color:C.teal,fontSize:12,fontWeight:600,marginBottom:16,fontFamily:"'Tajawal',sans-serif"}}>{IC.sparkle}{t(TX.poweredBy,lang)}</div>
        <h1 style={{fontSize:isMobile?30:'clamp(32px,3.5vw,50px)',fontWeight:900,color:'#fff',lineHeight:1.15,margin:'0 0 14px 0',fontFamily:"'Tajawal',sans-serif"}}>{t(TX.heroT1,lang)}{' '}<span style={{color:C.teal}}>{t(TX.heroT2,lang)}</span></h1>
        <p style={{color:C.w50,fontSize:isMobile?14:16,lineHeight:1.7,maxWidth:520,margin:0}}>{t(TX.heroP,lang)}</p>
      </div>
      <div style={{display:'flex',background:C.w05,borderRadius:14,border:`1px solid ${C.w10}`,overflow:'hidden'}}>
        {TX.stats.map((s,i)=>(<div key={i} style={{flex:'1 1 0',minWidth:0,padding:isMobile?'12px 6px':'16px 10px',textAlign:'center',borderRight:i<TX.stats.length-1?`1px solid ${C.w10}`:'none'}}><div style={{color:C.teal,fontSize:isMobile?18:22,fontWeight:900,fontFamily:"'Tajawal',sans-serif"}}>{s.v}</div><div style={{color:C.w30,fontSize:isMobile?9.5:11,marginTop:2}}>{t(s.l,lang)}</div></div>))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',gap:isMobile?10:12}}>
        {TX.features.map((f,i)=>(<FeatCard key={i} idx={i} icon={f.icon} title={t(f.t,lang)} desc={t(f.d,lang)} rtl={isRTL} compact={isMobile}/>))}
      </div>
      <AcademyCard lang={lang} isRTL={isRTL} isMobile={isMobile} onEnter={()=>setShowPublicAcademy(true)}/>
    </div>
  );

  const Auth=()=>(
    <div style={{opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(30px)',transition:'all 0.8s cubic-bezier(0.4,0,0.2,1) 0.25s'}}>
      <div style={{background:'rgba(11,35,65,0.55)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${C.w10}`,borderRadius:22,padding:isMobile?'28px 22px 24px':'36px 32px 30px',boxShadow:'0 24px 64px rgba(0,0,0,0.35)'}}>
        <div style={{display:'flex',background:C.w05,borderRadius:12,padding:3.5,marginBottom:24}}>
          {['login','signup'].map(m=>(<button key={m} onClick={()=>switchMode(m)} style={{flex:1,padding:'11px 0',borderRadius:9,border:'none',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:"'Tajawal',sans-serif",transition:'all 0.35s',background:(mode===m||(mode==='forgot'&&m==='login'))?`linear-gradient(135deg,${C.navy},#0d2d4a)`:'transparent',color:(mode===m||(mode==='forgot'&&m==='login'))?'#fff':C.w40,boxShadow:(mode===m||(mode==='forgot'&&m==='login'))?'0 2px 10px rgba(0,0,0,0.25)':'none'}}>{t(m==='login'?TX.signIn:TX.signUp,lang)}</button>))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div><label style={lbl}>{t(TX.email,lang)}</label><input type="email" placeholder={t(TX.emailPh,lang)} value={email} onChange={e=>setEmail(e.target.value)} style={inp} onFocus={focusIn} onBlur={blurIn} onKeyDown={e=>e.key==='Enter'&&go()}/></div>
          {mode!=='forgot'&&(<div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><label style={lbl}>{t(TX.password,lang)}</label>{mode==='login'&&<button onClick={()=>switchMode('forgot')} style={{background:'none',border:'none',color:C.teal,fontSize:11.5,cursor:'pointer',fontFamily:"'Tajawal',sans-serif",fontWeight:600,opacity:0.8}}>{t(TX.forgot,lang)}</button>}</div>
            <div style={{position:'relative'}}>
              <input type={showPw?'text':'password'} placeholder={t(TX.pwPh,lang)} value={password} onChange={e=>{setPassword(e.target.value);if(mode==='signup')calcPwd(e.target.value)}} style={{...inp,[isRTL?'paddingLeft':'paddingRight']:44}} onFocus={focusIn} onBlur={blurIn} onKeyDown={e=>e.key==='Enter'&&go()}/>
              <button onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',...(isRTL?{left:12}:{right:12}),background:'none',border:'none',color:C.w30,cursor:'pointer',display:'flex',alignItems:'center',padding:4}}>{showPw?IC.eyeOff:IC.eye}</button>
            </div>
            {mode==='signup'&&<PasswordStrength strength={pwdStr}/>}
          </div>)}
          {mode==='signup'&&(<div><label style={lbl}>{t(TX.confirmPw,lang)}</label><input type="password" placeholder="••••••••" value={confirm} onChange={e=>setConfirm(e.target.value)} style={inp} onFocus={focusIn} onBlur={blurIn} onKeyDown={e=>e.key==='Enter'&&go()}/></div>)}
        </div>
        {error&&<div style={{marginTop:14,padding:'12px 16px',borderRadius:10,background:'rgba(239,68,68,0.08)',color:'#f87171',fontSize:12,border:'1px solid rgba(239,68,68,0.2)'}}>{error}</div>}
        {message&&<div style={{marginTop:14,padding:'12px 16px',borderRadius:10,background:'rgba(74,222,128,0.08)',color:'#4ade80',fontSize:12,border:'1px solid rgba(74,222,128,0.2)'}}>{message}</div>}
        <button onClick={go} disabled={busy} style={{marginTop:20,width:'100%',padding:'14px 0',borderRadius:12,border:'none',background:busy?`${C.teal}80`:`linear-gradient(135deg,${C.teal} 0%,#25a89c 100%)`,color:C.deep,fontSize:15,fontWeight:800,fontFamily:"'Tajawal',sans-serif",cursor:busy?'wait':'pointer',transition:'all 0.35s',boxShadow:`0 4px 20px ${C.tealDim}`,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {busy&&<div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${C.deep}40`,borderTopColor:C.deep,animation:'spin 0.7s linear infinite'}}/>}
          {busy?t(TX.loading,lang):mode==='login'?t(TX.signIn,lang):mode==='signup'?t(TX.createAcc,lang):t(TX.sendLink,lang)}
        </button>
        <div style={{textAlign:'center',marginTop:14}}>
          {mode==='login'&&<span style={{color:C.w30,fontSize:12.5}}>{t(TX.noAcc,lang)}{' '}<button onClick={()=>switchMode('signup')} style={{background:'none',border:'none',color:C.teal,cursor:'pointer',fontWeight:700,fontSize:12.5,fontFamily:"'Tajawal',sans-serif"}}>{t(TX.signUp,lang)}</button></span>}
          {mode==='signup'&&<span style={{color:C.w30,fontSize:12.5}}>{t(TX.hasAcc,lang)}{' '}<button onClick={()=>switchMode('login')} style={{background:'none',border:'none',color:C.teal,cursor:'pointer',fontWeight:700,fontSize:12.5,fontFamily:"'Tajawal',sans-serif"}}>{t(TX.signIn,lang)}</button></span>}
          {mode==='forgot'&&<button onClick={()=>switchMode('login')} style={{background:'none',border:'none',color:C.teal,fontSize:12.5,cursor:'pointer',fontFamily:"'Tajawal',sans-serif",fontWeight:600}}>{t(TX.backToLogin,lang)}</button>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,margin:'22px 0 18px'}}><div style={{flex:1,height:1,background:C.w10}}/><span style={{color:C.w25,fontSize:11.5}}>{t(TX.or,lang)}</span><div style={{flex:1,height:1,background:C.w10}}/></div>
        <button onClick={()=>setShowPublicAcademy(true)} style={{width:'100%',padding:'12px 0',borderRadius:11,border:`1px solid ${C.goldBorder}`,background:C.goldDim,color:C.gold,fontSize:13.5,fontWeight:700,fontFamily:"'Tajawal',sans-serif",cursor:'pointer',transition:'all 0.3s',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{IC.book}{t(TX.academy,lang)}<span style={{padding:'1px 8px',borderRadius:20,background:`${C.gold}30`,fontSize:10,fontWeight:800}}>{t(TX.free,lang)}</span></button>
        {isMobile&&<div style={{marginTop:20,display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>{TX.features.map((f,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:i%2===0?C.tealDim:C.goldDim,border:`1px solid ${i%2===0?C.tealBorder:C.goldBorder}`}}><span style={{color:i%2===0?C.teal:C.gold,display:'flex'}}>{IC.check}</span><span style={{color:C.w70,fontSize:11.5,fontWeight:600,fontFamily:"'Tajawal',sans-serif"}}>{t(f.t,lang)}</span></div>))}</div>}
      </div>
      <div style={{textAlign:'center',color:C.w25,fontSize:11,marginTop:18,opacity:0.8}}>© 2026 {t(TX.cr,lang)}</div>
    </div>
  );

  return (
    <div dir={dir} style={{minHeight:'100vh',background:`linear-gradient(145deg,${C.deep} 0%,${C.navy} 40%,#0e3050 100%)`,fontFamily:"'Tajawal','IBM Plex Sans Arabic',sans-serif",direction:dir,overflowX:'hidden',position:'relative'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');input::placeholder{color:rgba(255,255,255,0.22)}@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
      <Orbs/>
      <div style={{position:'relative',zIndex:20,display:'flex',alignItems:'center',justifyContent:'space-between',padding:isMobile?'14px 16px':'18px 32px',maxWidth:1400,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:isMobile?28:34,fontWeight:900,color:'#fff',fontFamily:"'Tajawal',sans-serif"}}>حصيف</span>
          <span style={{width:1,height:isMobile?22:28,background:`${C.teal}50`}}/>
          <div style={{lineHeight:1.25}}><div style={{color:C.teal,fontSize:isMobile?11:12.5,fontWeight:700}}>{t(TX.fm,lang)}</div><div style={{color:C.w30,fontSize:isMobile?9:10}}>{t(TX.tagline,lang)}</div></div>
        </div>
        <button onClick={()=>setLang(l=>l==='en'?'ar':'en')} style={{display:'flex',alignItems:'center',gap:5,padding:isMobile?'6px 12px':'8px 14px',borderRadius:8,border:`1px solid ${C.w15}`,background:C.w05,color:C.w70,fontSize:isMobile?12:13,cursor:'pointer',transition:'all 0.3s',fontFamily:"'Tajawal',sans-serif"}}>{IC.globe}<span style={{fontWeight:600}}>{lang==='en'?'عربي':'EN'}</span></button>
      </div>
      <div style={{position:'relative',zIndex:10,maxWidth:1400,margin:'0 auto',padding:isMobile?'0 16px 40px':'10px 32px 60px'}}>
        {isMobile?(<div style={{display:'flex',flexDirection:'column',gap:32}}><Auth/><Showcase/></div>):(<div style={{display:'flex',gap:50,alignItems:'flex-start'}}><div style={{flex:'1 1 560px',minWidth:0,paddingTop:10}}><Showcase/></div><div style={{flex:'0 0 400px',width:400,position:'sticky',top:20}}><Auth/></div></div>)}
      </div>
    </div>
  )
}
