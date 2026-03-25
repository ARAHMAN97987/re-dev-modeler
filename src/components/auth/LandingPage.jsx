// Extracted from App.jsx lines 4044-4161
import { useState, useEffect } from "react";

// ── Hook ──
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

// ── Style objects ──
const btnS={border:"none",borderRadius:5,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"};

// ── Constants ──
const PROJECT_TEMPLATES = [
  { id:"waterfront", icon:"\u{1F30A}", en:"Waterfront Mixed-Use", ar:"\u0648\u0627\u062C\u0647\u0629 \u0628\u062D\u0631\u064A\u0629 \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0627\u062A",
    desc_en:"Mall, hotel, office, residential, marina, fuel station", desc_ar:"\u0645\u0648\u0644\u060C \u0641\u0646\u062F\u0642\u060C \u0645\u0643\u0627\u062A\u0628\u060C \u0633\u0643\u0646\u064A\u060C \u0645\u0627\u0631\u064A\u0646\u0627\u060C \u0645\u062D\u0637\u0629 \u0648\u0642\u0648\u062F",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:36,footprint:0},{name:"Phase 2",startYearOffset:3,completionMonth:72,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Marina Mall",code:"C1",gfa:31260,footprint:20840,plotArea:28947,revType:"Lease",efficiency:80,leaseRate:2100,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:3900,constrStart:2,constrDuration:36,opEbitda:0},
      {phase:"Phase 1",category:"Hospitality",name:"Hotel (4-Star)",code:"H1",gfa:16577,footprint:2072,plotArea:5133,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:8000,constrStart:2,constrDuration:36,opEbitda:13901057},
      {phase:"Phase 2",category:"Office",name:"Office Block",code:"O1",gfa:16429,footprint:2710,plotArea:5497,revType:"Lease",efficiency:90,leaseRate:900,escalation:0.75,rampUpYears:2,stabilizedOcc:100,costPerSqm:2600,constrStart:3,constrDuration:36,opEbitda:0},
      {phase:"Phase 2",category:"Residential",name:"Residential Tower",code:"R1",gfa:14000,footprint:2000,plotArea:4000,revType:"Lease",efficiency:85,leaseRate:800,escalation:0.75,rampUpYears:2,stabilizedOcc:92,costPerSqm:2800,constrStart:3,constrDuration:30,opEbitda:0},
      {phase:"Phase 2",category:"Marina",name:"Marina Berths",code:"MAR",gfa:2400,footprint:0,plotArea:3000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:90,costPerSqm:16000,constrStart:4,constrDuration:12,opEbitda:1129331},
      {phase:"Phase 1",category:"Retail",name:"Fuel Station",code:"F",gfa:3586,footprint:3586,plotArea:6920,revType:"Lease",efficiency:30,leaseRate:900,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:1500,constrStart:2,constrDuration:12,opEbitda:0},
    ]},
  { id:"residential", icon:"\u{1F3D8}", en:"Residential Compound", ar:"\u0645\u062C\u0645\u0639 \u0633\u0643\u0646\u064A",
    desc_en:"Tower, villas, amenities, parking", desc_ar:"\u0628\u0631\u062C\u060C \u0641\u0644\u0644\u060C \u0645\u0631\u0627\u0641\u0642 \u062E\u062F\u0645\u064A\u0629\u060C \u0645\u0648\u0627\u0642\u0641",
    landType:"purchase", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"hold",
    assets:[
      {phase:"Phase 1",category:"Residential",name:"Residential Tower",code:"T1",gfa:24000,footprint:3000,plotArea:5000,revType:"Lease",efficiency:85,leaseRate:900,escalation:1.0,rampUpYears:2,stabilizedOcc:92,costPerSqm:3000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Residential",name:"Villa Cluster",code:"V1",gfa:8000,footprint:4000,plotArea:10000,revType:"Lease",efficiency:90,leaseRate:700,escalation:1.0,rampUpYears:2,stabilizedOcc:88,costPerSqm:2500,constrStart:1,constrDuration:24,opEbitda:0},
      {phase:"Phase 1",category:"Amenity",name:"Amenity Center",code:"AM",gfa:2000,footprint:1500,plotArea:3000,revType:"Lease",efficiency:50,leaseRate:400,escalation:0.5,rampUpYears:1,stabilizedOcc:80,costPerSqm:2200,constrStart:1,constrDuration:18,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Structure",code:"PK",gfa:6000,footprint:3000,plotArea:3000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1800,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"commercial", icon:"\u{1F3E2}", en:"Commercial Center", ar:"\u0645\u0631\u0643\u0632 \u062A\u062C\u0627\u0631\u064A",
    desc_en:"Retail, offices, parking", desc_ar:"\u0645\u062D\u0644\u0627\u062A\u060C \u0645\u0643\u0627\u062A\u0628\u060C \u0645\u0648\u0627\u0642\u0641",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Retail Mall",code:"RM",gfa:20000,footprint:10000,plotArea:15000,revType:"Lease",efficiency:80,leaseRate:2200,escalation:1.0,rampUpYears:3,stabilizedOcc:90,costPerSqm:4000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Office",name:"Office Tower",code:"OF",gfa:15000,footprint:2500,plotArea:4000,revType:"Lease",efficiency:88,leaseRate:1100,escalation:1.0,rampUpYears:2,stabilizedOcc:85,costPerSqm:3200,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Podium",code:"PK",gfa:8000,footprint:4000,plotArea:4000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1500,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"hotel", icon:"\u{1F3E8}", en:"Single Hotel", ar:"\u0641\u0646\u062F\u0642 \u0645\u0646\u0641\u0631\u062F",
    desc_en:"Full hotel with operating P&L", desc_ar:"\u0641\u0646\u062F\u0642 \u0648\u0627\u062D\u062F \u0645\u0639 \u0642\u0627\u0626\u0645\u0629 \u0623\u0631\u0628\u0627\u062D \u0648\u062E\u0633\u0627\u0626\u0631 \u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0643\u0627\u0645\u0644\u0629",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:42,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Hospitality",name:"5-Star Hotel",code:"H5",gfa:22000,footprint:5000,plotArea:12000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:12000,constrStart:1,constrDuration:42,opEbitda:47630685},
    ]},
  { id:"blank", icon:"\u{1F4C4}", en:"Blank Project", ar:"\u0645\u0634\u0631\u0648\u0639 \u0641\u0627\u0631\u063A",
    desc_en:"Start from scratch", desc_ar:"\u0627\u0628\u062F\u0623 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:18,footprint:0}],
    finMode:"self", exitStrategy:"hold", assets:[] },
];

// ── Sub-components ──
function FeaturesGrid({ lang }) {
  const ar = lang === "ar";
  const features = [
    { icon: "\u{1F3D7}", color: "#2563eb", title: ar?"\u0646\u0645\u0630\u062C\u0629 \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0623\u0635\u0648\u0644":"Multi-Asset Modeling", desc: ar?"\u0641\u0646\u0627\u062F\u0642\u060C \u0645\u062D\u0644\u0627\u062A\u060C \u0645\u0643\u0627\u062A\u0628\u060C \u0645\u0627\u0631\u064A\u0646\u0627\u060C \u0633\u0643\u0646\u064A - \u0643\u0644 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A \u0641\u064A \u0646\u0645\u0648\u0630\u062C \u0648\u0627\u062D\u062F \u0645\u0639 P&L \u0645\u0641\u0635\u0651\u0644 \u0644\u0644\u0641\u0646\u0627\u062F\u0642 \u0648\u0627\u0644\u0645\u0627\u0631\u064A\u0646\u0627":"Hotels, retail, offices, marina, residential - all property types in one model with detailed Hotel & Marina P&L" },
    { icon: "\u{1F3E6}", color: "#8b5cf6", title: ar?"\u062A\u0645\u0648\u064A\u0644 \u0645\u062A\u0642\u062F\u0645":"Advanced Financing", desc: ar?"\u062A\u0645\u0648\u064A\u0644 \u0628\u0646\u0643\u064A\u060C \u0635\u0646\u062F\u0648\u0642 \u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A GP/LP\u060C \u062A\u0645\u0648\u064A\u0644 \u0625\u0633\u0644\u0627\u0645\u064A (\u0645\u0631\u0627\u0628\u062D\u0629/\u0625\u062C\u0627\u0631\u0629)\u060C \u0631\u0633\u0645\u0644\u0629 \u062D\u0642 \u0627\u0644\u0627\u0646\u062A\u0641\u0627\u0639\u060C \u0647\u064A\u0643\u0644 \u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644":"Bank debt, GP/LP fund structure, Islamic finance (Murabaha/Ijara), leasehold capitalization, capital structure" },
    { icon: "\u{1F4CA}", color: "#16a34a", title: ar?"\u0634\u0644\u0627\u0644 \u062A\u0648\u0632\u064A\u0639\u0627\u062A 4 \u0645\u0631\u0627\u062D\u0644":"4-Tier Waterfall", desc: ar?"\u0631\u062F \u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u2192 \u0627\u0644\u0639\u0627\u0626\u062F \u0627\u0644\u062A\u0641\u0636\u064A\u0644\u064A \u2192 \u062A\u0639\u0648\u064A\u0636 \u0627\u0644\u0645\u0637\u0648\u0631 \u2192 \u062A\u0642\u0633\u064A\u0645 \u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0645\u0639 IRR \u0648MOIC \u0644\u0643\u0644 \u0637\u0631\u0641":"Return of Capital \u2192 Preferred Return \u2192 GP Catch-up \u2192 Profit Split with IRR & MOIC per party" },
    { icon: "\u{1F4C8}", color: "#f59e0b", title: ar?"\u0633\u064A\u0646\u0627\u0631\u064A\u0648\u0647\u0627\u062A \u0648\u062A\u062D\u0644\u064A\u0644 \u062D\u0633\u0627\u0633\u064A\u0629":"Scenarios & Sensitivity", desc: ar?"8 \u0633\u064A\u0646\u0627\u0631\u064A\u0648\u0647\u0627\u062A \u062C\u0627\u0647\u0632\u0629\u060C \u062C\u062F\u0648\u0644 \u062D\u0633\u0627\u0633\u064A\u0629 \u062B\u0646\u0627\u0626\u064A \u0627\u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A\u060C \u062A\u062D\u0644\u064A\u0644 \u0646\u0642\u0637\u0629 \u0627\u0644\u062A\u0639\u0627\u062F\u0644 \u0645\u0639 \u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u062E\u0627\u0637\u0631":"8 built-in scenarios, 2-variable sensitivity table, break-even analysis with risk summary" },
    { icon: "\u{1F4C4}", color: "#ef4444", title: ar?"\u062A\u0642\u0627\u0631\u064A\u0631 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0628\u0646\u0643 \u0648\u0627\u0644\u0645\u0633\u062A\u062B\u0645\u0631":"Bank & Investor Reports", desc: ar?"\u0645\u0644\u062E\u0635 \u062A\u0646\u0641\u064A\u0630\u064A\u060C \u062D\u0632\u0645\u0629 \u0627\u0644\u0628\u0646\u0643 (\u0645\u0639 DSCR)\u060C \u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062B\u0645\u0631 - \u0643\u0644\u0647\u0627 \u0628\u0635\u064A\u063A\u0629 PDF \u0648Excel":"Executive summary, Bank pack (with DSCR), Investor memo - all exportable as PDF & Excel" },
    { icon: "\u{1F310}", color: "#06b6d4", title: ar?"\u062B\u0646\u0627\u0626\u064A \u0627\u0644\u0644\u063A\u0629 + \u062D\u0648\u0627\u0641\u0632 \u062D\u0643\u0648\u0645\u064A\u0629":"Bilingual + Gov Incentives", desc: ar?"\u0648\u0627\u062C\u0647\u0629 \u0639\u0631\u0628\u064A/\u0625\u0646\u062C\u0644\u064A\u0632\u064A \u0643\u0627\u0645\u0644\u0629 \u0645\u0639 \u062F\u0639\u0645 \u0645\u0646\u062D CAPEX\u060C \u0625\u0639\u0641\u0627\u0621 \u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0623\u0631\u0636\u060C \u062F\u0639\u0645 \u0627\u0644\u062A\u0645\u0648\u064A\u0644\u060C \u0648\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0627\u0644\u0631\u0633\u0648\u0645":"Full Arabic/English interface with CAPEX grants, land rent rebates, finance subsidies, and fee waivers" },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:16}}>
      {features.map((f, i) => (
        <div key={i} style={{background:"#f8f7f5",borderRadius:12,border:"1px solid #e5e0d8",padding:"20px 18px",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+"60";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.transform="translateY(0)";}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:f.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{f.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#0f1117"}}>{f.title}</div>
          </div>
          <div style={{fontSize:12,color:"#6b7080",lineHeight:1.6}}>{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──
function LandingPage({ onSignIn, lang, setLang, pendingShare }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
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
      {/* -- Left: Hero with Waterfront Image -- */}
      {!isMobile && (
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"center"}}>
        {/* Background Image */}
        <img src={WATERFRONT_IMG} alt="Haseef Waterfront" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} />
        {/* Overlay */}
        <div style={{position:"absolute",inset:0,background:ar?"linear-gradient(to left, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)":"linear-gradient(to right, #0f1117 0%, rgba(11,35,65,0.85) 40%, rgba(11,35,65,0.5) 100%)"}} />
        {/* Dot pattern overlay */}
        <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"radial-gradient(circle at 2px 2px, white 1px, transparent 0)",backgroundSize:"40px 40px"}} />
        {/* Content */}
        <div style={{position:"relative",zIndex:1,padding:"48px 48px"}}>
          <div style={{maxWidth:560}}>
            {/* Badge */}
            <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(46,196,182,0.12)",border:"1px solid rgba(46,196,182,0.25)",borderRadius:20,marginBottom:20}}>
              <span style={{fontSize:12,color:"#2EC4B6",fontWeight:500}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</span>
            </div>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:48,fontWeight:900,color:"#fff",letterSpacing:3}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1,height:32,background:"rgba(46,196,182,0.4)"}} />
              <span style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.4,fontWeight:300}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            {/* Title */}
            <h1 style={{fontSize:36,fontWeight:900,color:"#fff",lineHeight:1.15,marginBottom:10,fontFamily:"'Tajawal',sans-serif"}}>
              {ar?"منصة النمذجة المالية":"Financial Modeling"}<br/>
              <span style={{color:"#C8A96E"}}>{ar?"للتطوير العقاري":"for Real Estate"}</span>
            </h1>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:28,maxWidth:440}}>
              {ar?"صُممت للسوق السعودي. نمذجة مالية متقدمة لمشاريع التطوير العقاري بجميع أنواعها.":"Built for the Saudi market. Advanced financial modeling for all types of real estate development projects."}
            </p>
            {/* Feature badges */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                {icon:"\u{1F4D0}",text:ar?"5 محركات نمذجة":"5 Engine Modules"},
                {icon:"\u{1F4CA}",text:ar?"50+ سنة افتراضات":"50+ Year Projections"},
                {icon:"\u{1F916}",text:ar?"مساعد AI مدمج":"Built-in AI"},
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
      {/* -- Right: Auth Form -- */}
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
        {/* Pending share invite banner */}
        {pendingShare && (
          <div style={{background:"rgba(46,196,182,0.08)",border:"1px solid rgba(46,196,182,0.2)",borderRadius:10,padding:"14px 16px",marginBottom:18,textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:6}}>{"\u{1F4EC}"}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#2EC4B6",marginBottom:4}}>{ar?"تمت دعوتك لمشروع مشترك":"You've been invited to a shared project"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{ar?"سجّل دخول أو أنشئ حساب جديد عشان تشوف المشروع":"Sign in or create an account to access the project"}</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"البريد الإلكتروني":"Email"}</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1e2230",background:"rgba(11,35,65,0.6)",color:"#d0d4dc",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"block"}}>{ar?"كلمة المرور":"Password"}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #1e2230",background:"rgba(11,35,65,0.6)",color:"#d0d4dc",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          {error && <div style={{fontSize:11,color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",padding:"8px 12px",borderRadius:6}}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:"#2EC4B6",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"'Tajawal',sans-serif",transition:"all 0.2s",letterSpacing:0.3}} onMouseEnter={e=>e.currentTarget.style.background="#0f766e"} onMouseLeave={e=>e.currentTarget.style.background="#2EC4B6"}>
            {loading?"...":(mode==="signin"?(ar?"دخول":"Sign In"):(ar?"إنشاء حساب":"Create Account"))}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.4)"}}>
            {mode==="signin"?(
              <span>{ar?"ما عندك حساب؟":"Don't have an account?"} <button onClick={()=>setMode("signup")} style={{color:"#2EC4B6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"سجّل الآن":"Sign up"}</button></span>
            ):(
              <span>{ar?"عندك حساب؟":"Already have an account?"} <button onClick={()=>setMode("signin")} style={{color:"#2EC4B6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>{ar?"دخول":"Sign in"}</button></span>
            )}
          </div>
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#1e2230",color:"rgba(255,255,255,0.5)",padding:"6px 16px",fontSize:11,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
        </div>
        {/* Powered by */}
        <div style={{marginTop:24,textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}</div>
      </div>
    </div>
  );
}

export default LandingPage;
export { FeaturesGrid, PROJECT_TEMPLATES, useIsMobile, btnS };
