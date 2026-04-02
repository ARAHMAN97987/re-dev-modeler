// LandingPage — extracted from App.jsx (EXACT COPY of live inline version)
import { useState } from "react";
import { useIsMobile } from "../shared/hooks.js";
import { btnS } from "../shared/styles.js";

export default function LandingPage({ onSignIn, lang, setLang, pendingShare }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError(ar?"أدخل البريد وكلمة المرور":"Enter email and password"); return; }
    setLoading(true); setError(null);
    try {
      if (onSignIn) await onSignIn(email, password, mode);
    } catch (e) { setError(e.message || (ar?"فشل تسجيل الدخول. تحقق من الاتصال وحاول مجدداً":"Login failed. Check connection and retry")); }
    setLoading(false);
  };

  const WATERFRONT_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663027980795/PfUcTsRAscFnLMXv.png";

  return (
    <div dir={ar?"rtl":"ltr"} style={{minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#0f1117",position:"relative"}}>
      {!isMobile && (
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <img src={WATERFRONT_IMG} alt="Haseef Waterfront" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        <div style={{position:"absolute",inset:0,background:ar?"linear-gradient(to left, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)":"linear-gradient(to right, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)"}} />
        <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"radial-gradient(circle at 2px 2px, white 1px, transparent 0)",backgroundSize:"40px 40px"}} />
        <div style={{position:"relative",zIndex:1,padding:"48px 48px"}}>
          <div style={{maxWidth:560}}>
            <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(46,196,182,0.12)",border:"1px solid rgba(46,196,182,0.25)",borderRadius:20,marginBottom:20}}>
              <span style={{fontSize:12,color:"#2EC4B6",fontWeight:500}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:48,fontWeight:900,color:"#fff",letterSpacing:3}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1,height:32,background:"rgba(46,196,182,0.4)"}} />
              <span style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.4,fontWeight:300}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            <h1 style={{fontSize:36,fontWeight:900,color:"#fff",lineHeight:1.15,marginBottom:10,fontFamily:"'Tajawal',sans-serif"}}>
              {ar?"منصة النمذجة المالية":"Financial Modeling"}<br/>
              <span style={{color:"#C8A96E"}}>{ar?"للتطوير العقاري":"for Real Estate"}</span>
            </h1>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:28,maxWidth:440}}>
              {ar?"صُممت للسوق السعودي. نمذجة مالية متقدمة لمشاريع التطوير العقاري بجميع أنواعها.":"Built for the Saudi market. Advanced financial modeling for all types of real estate development projects."}
            </p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {icon:"📐",text:ar?"5 محركات نمذجة":"5 Engine Modules"},
                {icon:"📊",text:ar?"50+ سنة افتراضات":"50+ Year Projections"},
                {icon:"🤖",text:ar?"مساعد AI مدمج":"Built-in AI"},
              ].map((f,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(255,255,255,0.06)",backdropFilter:"blur(8px)",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)"}}>
                  <span style={{fontSize:12}}>{f.icon}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:500}}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
      <div style={{width:isMobile?"100%":420,minWidth:isMobile?"auto":380,flex:isMobile?1:"none",background:isMobile?"#0f1117":"#161a24",display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"32px 24px":"48px 36px",borderInlineStart:isMobile?"none":(ar?"none":"1px solid rgba(46,196,182,0.1)"),borderInlineEnd:isMobile?"none":(ar?"1px solid rgba(46,196,182,0.1)":"none")}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:2}}>{ar?"حصيف":"Haseef"}</span>
            <span style={{width:1.5,height:22,background:"rgba(46,196,182,0.5)",borderRadius:1}} />
            <span style={{fontSize:11,color:"#2EC4B6",lineHeight:1.3,fontWeight:300,textAlign:"start"}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
          </div>
          {isMobile && <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>}
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{mode==="signin"?(ar?"تسجيل الدخول":"Sign In"):(ar?"إنشاء حساب":"Create Account")}</div>
        </div>
        {pendingShare && (
          <div style={{background:"rgba(46,196,182,0.08)",border:"1px solid rgba(46,196,182,0.2)",borderRadius:10,padding:"14px 16px",marginBottom:18,textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:6}}>📬</div>
            <div style={{fontSize:13,fontWeight:600,color:"#2EC4B6",marginBottom:4}}>{ar?"تمت دعوتك لمشروع مشترك":"You've been invited to a shared project"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{ar?"سجّل الدخول أو أنشئ حساباً جديداً للوصول إلى المشروع":"Sign in or create an account to access the project"}</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"البريد الإلكتروني":"Email"}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={ar?"example@company.com":"example@company.com"} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1b3a5c",background:"#0d1f35",color:"#e0e4ea",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"كلمة المرور":"Password"}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={ar?"أدخل كلمة المرور":"Enter your password"} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1b3a5c",background:"#0d1f35",color:"#e0e4ea",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          {error && <div style={{fontSize:11,color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",padding:"8px 12px",borderRadius:6}}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:"#2EC4B6",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"'Tajawal',sans-serif",transition:"all 0.2s",letterSpacing:0.3}} onMouseEnter={e=>e.currentTarget.style.background="#0f766e"} onMouseLeave={e=>e.currentTarget.style.background="#2EC4B6"}>
            {loading?"...":(mode==="signin"?(ar?"دخول":"Sign In"):(ar?"إنشاء حساب":"Create Account"))}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.4)"}}>
            {mode==="signin"?(
              <span>{ar?"ليس لديك حساب؟":"Don't have an account?"} <button onClick={()=>setMode("signup")} style={{color:"#2EC4B6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"سجّل الآن":"Sign up"}</button></span>
            ):(
              <span>{ar?"لديك حساب؟":"Already have an account?"} <button onClick={()=>setMode("signin")} style={{color:"#2EC4B6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"دخول":"Sign in"}</button></span>
            )}
          </div>
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#1e2230",color:"rgba(255,255,255,0.5)",padding:"6px 16px",fontSize:11,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
        </div>
        <div style={{marginTop:24,textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>
      </div>
    </div>
  );
}
