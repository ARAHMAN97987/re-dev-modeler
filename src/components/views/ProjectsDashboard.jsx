// Extracted from App.jsx lines 4163-4454
import { useState } from "react";
import { useIsMobile } from "../shared/hooks";
import { btnS, btnPrim, btnSm } from "../shared/styles";

const PROJECT_TEMPLATES = [
  { id:"waterfront", icon:"🌊", en:"Waterfront Mixed-Use", ar:"واجهة بحرية متعددة الاستخدامات",
    desc_en:"Mall, hotel, office, residential, marina, fuel station", desc_ar:"مول، فندق، مكاتب، سكني، مارينا، محطة وقود",
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
  { id:"residential", icon:"🏘", en:"Residential Compound", ar:"مجمع سكني",
    desc_en:"Tower, villas, amenities, parking", desc_ar:"برج، فلل، مرافق خدمية، مواقف",
    landType:"purchase", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"hold",
    assets:[
      {phase:"Phase 1",category:"Residential",name:"Residential Tower",code:"T1",gfa:24000,footprint:3000,plotArea:5000,revType:"Lease",efficiency:85,leaseRate:900,escalation:1.0,rampUpYears:2,stabilizedOcc:92,costPerSqm:3000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Residential",name:"Villa Cluster",code:"V1",gfa:8000,footprint:4000,plotArea:10000,revType:"Lease",efficiency:90,leaseRate:700,escalation:1.0,rampUpYears:2,stabilizedOcc:88,costPerSqm:2500,constrStart:1,constrDuration:24,opEbitda:0},
      {phase:"Phase 1",category:"Amenity",name:"Amenity Center",code:"AM",gfa:2000,footprint:1500,plotArea:3000,revType:"Lease",efficiency:50,leaseRate:400,escalation:0.5,rampUpYears:1,stabilizedOcc:80,costPerSqm:2200,constrStart:1,constrDuration:18,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Structure",code:"PK",gfa:6000,footprint:3000,plotArea:3000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1800,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"commercial", icon:"🏢", en:"Commercial Center", ar:"مركز تجاري",
    desc_en:"Retail, offices, parking", desc_ar:"محلات، مكاتب، مواقف",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:30,footprint:0}],
    finMode:"debt", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Retail",name:"Retail Mall",code:"RM",gfa:20000,footprint:10000,plotArea:15000,revType:"Lease",efficiency:80,leaseRate:2200,escalation:1.0,rampUpYears:3,stabilizedOcc:90,costPerSqm:4000,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Office",name:"Office Tower",code:"OF",gfa:15000,footprint:2500,plotArea:4000,revType:"Lease",efficiency:88,leaseRate:1100,escalation:1.0,rampUpYears:2,stabilizedOcc:85,costPerSqm:3200,constrStart:1,constrDuration:30,opEbitda:0},
      {phase:"Phase 1",category:"Infrastructure",name:"Parking Podium",code:"PK",gfa:8000,footprint:4000,plotArea:4000,revType:"Lease",efficiency:0,leaseRate:0,escalation:0,rampUpYears:0,stabilizedOcc:100,costPerSqm:1500,constrStart:1,constrDuration:18,opEbitda:0},
    ]},
  { id:"hotel", icon:"🏨", en:"Single Hotel", ar:"فندق منفرد",
    desc_en:"Full hotel with operating P&L", desc_ar:"فندق واحد مع قائمة أرباح وخسائر تشغيلية كاملة",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:42,footprint:0}],
    finMode:"fund", exitStrategy:"sale",
    assets:[
      {phase:"Phase 1",category:"Hospitality",name:"5-Star Hotel",code:"H5",gfa:22000,footprint:5000,plotArea:12000,revType:"Operating",efficiency:0,leaseRate:0,escalation:0.75,rampUpYears:4,stabilizedOcc:100,costPerSqm:12000,constrStart:1,constrDuration:42,opEbitda:47630685},
    ]},
  { id:"blank", icon:"📄", en:"Blank Project", ar:"مشروع فارغ",
    desc_en:"Start from scratch", desc_ar:"ابدأ من الصفر",
    landType:"lease", phases:[{name:"Phase 1",startYearOffset:1,completionMonth:18,footprint:0}],
    finMode:"self", exitStrategy:"hold", assets:[] },
];

function FeaturesGrid({ lang }) {
  const ar = lang === "ar";
  const features = [
    { icon: "🏗", color: "#2563eb", title: ar?"نمذجة متعددة الأصول":"Multi-Asset Modeling", desc: ar?"فنادق، محلات، مكاتب، مارينا، سكني - كل أنواع العقارات في نموذج واحد مع P&L مفصّل للفنادق والمارينا":"Hotels, retail, offices, marina, residential - all property types in one model with detailed Hotel & Marina P&L" },
    { icon: "🏦", color: "#8b5cf6", title: ar?"تمويل متقدم":"Advanced Financing", desc: ar?"تمويل بنكي، صندوق استثماري GP/LP، تمويل إسلامي (مرابحة/إجارة)، رسملة حق الانتفاع، هيكل رأس المال":"Bank debt, GP/LP fund structure, Islamic finance (Murabaha/Ijara), leasehold capitalization, capital structure" },
    { icon: "📊", color: "#16a34a", title: ar?"شلال توزيعات 4 مراحل":"4-Tier Waterfall", desc: ar?"رد رأس المال → العائد التفضيلي → تعويض المطور → تقسيم الأرباح مع IRR وMOIC لكل طرف":"Return of Capital → Preferred Return → GP Catch-up → Profit Split with IRR & MOIC per party" },
    { icon: "📈", color: "#f59e0b", title: ar?"سيناريوهات وتحليل حساسية":"Scenarios & Sensitivity", desc: ar?"8 سيناريوهات جاهزة، جدول حساسية ثنائي المتغيرات، تحليل نقطة التعادل مع ملخص المخاطر":"8 built-in scenarios, 2-variable sensitivity table, break-even analysis with risk summary" },
    { icon: "📄", color: "#ef4444", title: ar?"تقارير جاهزة للبنك والمستثمر":"Bank & Investor Reports", desc: ar?"ملخص تنفيذي، حزمة البنك (مع DSCR)، مذكرة المستثمر - كلها بصيغة PDF وExcel":"Executive summary, Bank pack (with DSCR), Investor memo - all exportable as PDF & Excel" },
    { icon: "🌐", color: "#06b6d4", title: ar?"ثنائي اللغة + حوافز حكومية":"Bilingual + Gov Incentives", desc: ar?"واجهة عربي/إنجليزي كاملة مع دعم منح CAPEX، إعفاء إيجار الأرض، دعم التمويل، واسترداد الرسوم":"Full Arabic/English interface with CAPEX grants, land rent rebates, finance subsidies, and fee waivers" },
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

function ProjectsDashboard({ index, onCreate, onOpen, onDup, onDel, lang, setLang, t, user, signOut, onOpenAcademy }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const filtered = index.filter(p => !search || (p.name||"").toLowerCase().includes(search.toLowerCase()) || (p.location||"").toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const totalAssets = index.reduce((s,p) => s + (p.assetCount||0), 0);
  const finModes = index.reduce((m,p) => { const k = p.finMode||"self"; m[k] = (m[k]||0)+1; return m; }, {});
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg, #f5f3f0 0%, #ede9e4 100%)",backgroundImage:"radial-gradient(circle at 20% 30%, rgba(46,196,182,0.04) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(200,169,110,0.03) 0%, transparent 40%)",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",color:"#1a1d23"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:isMobile?"20px 14px":"48px 24px"}}>
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-start",gap:isMobile?14:0,marginBottom:isMobile?20:32}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:32,fontWeight:900,color:"#0f1117",fontFamily:"'Tajawal',sans-serif",letterSpacing:2}}>{ar?"حصيف":"Haseef"}</span>
              <span style={{width:1.5,height:24,background:"#2EC4B6",borderRadius:1}} />
              <span style={{fontSize:11,color:"#6b7080",lineHeight:1.3,fontWeight:500}}>{ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}</span>
            </div>
            <div style={{fontSize:isMobile?22:28,fontWeight:900,color:"#0f1117",letterSpacing:-0.5,fontFamily:"'Tajawal',sans-serif"}}>{ar?"النمذجة المالية":"Financial Modeler"}</div>
            <div style={{fontSize:isMobile?11:13,color:"#6b7080",marginTop:6}}>{t.subtitle}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setShowFeatures(true)} style={{...btnS,background:"#2EC4B6",color:"#fff",padding:"8px 16px",fontSize:12,fontWeight:600,border:"none",borderRadius:6}} title={ar?"اعرف المزايا":"Explore Features"}>✦ {ar?"المزايا":"Features"}</button>
            {onOpenAcademy && <button onClick={onOpenAcademy} style={{...btnS,background:"#0B2341",color:"#C8A96E",padding:"8px 16px",fontSize:12,fontWeight:600,border:"1px solid rgba(200,169,110,0.3)",borderRadius:6}} title={ar?"أكاديمية حصيف":"Haseef Academy"}>📚 {ar?"الأكاديمية":"Academy"}</button>}
            {!isMobile && user && <div style={{fontSize:11,color:"#6b7080",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>}
            {signOut && <button onClick={signOut} style={{...btnSm,background:"#fef2f2",color:"#ef4444",padding:"8px 16px",fontSize:12,fontWeight:500}}>{ar?"خروج":"Sign Out"}</button>}
            <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{...btnS,background:"#e8e5e0",color:"#4b5060",padding:"8px 16px",fontSize:12,fontWeight:600}}>{lang==="en"?"عربي":"English"}</button>
          </div>
        </div>

        {/* Features Modal Overlay */}
        {showFeatures && (
          <><div onClick={()=>setShowFeatures(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9998}} />
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:800,maxWidth:"94vw",maxHeight:"85vh",background:"#fff",borderRadius:16,border:"1px solid #e5e0d8",boxShadow:"0 24px 80px rgba(0,0,0,0.5)",zIndex:9999,overflow:"auto",padding:"28px 32px"}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
              <div style={{flex:1,fontSize:18,fontWeight:700,color:"#0f1117"}}>{ar?"مزايا المنصة":"Platform Features"}</div>
              <button onClick={()=>setShowFeatures(false)} style={{...btnS,background:"#f0f1f5",color:"#6b7080",padding:"6px 12px",fontSize:14,lineHeight:1}}>✕</button>
            </div>
            <FeaturesGrid lang={lang} />
          </div></>
        )}

        {/* KPI Strip (only when projects exist) */}
        {index.length > 0 && !isMobile && (
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {[
              {label:ar?"المشاريع":"Projects",value:index.length,icon:"📁",color:"#2563eb"},
              {label:ar?"الأصول":"Assets",value:totalAssets,icon:"🏗",color:"#0f766e"},
              ...(finModes.fund?[{label:ar?"صناديق":"Funds",value:finModes.fund,icon:"🏦",color:"#8b5cf6"}]:[]),
              ...(finModes.debt?[{label:ar?"تمويل بنكي":"Bank",value:finModes.debt+(finModes.bank100||0),icon:"💳",color:"#f59e0b"}]:[]),
            ].map((kpi,i)=>(
              <div key={i} style={{flex:1,background:"#fff",borderRadius:10,border:"1px solid #e5e0d8",padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{kpi.icon}</span>
                  <div>
                    <div style={{fontSize:20,fontWeight:800,color:kpi.color}}>{kpi.value}</div>
                    <div style={{fontSize:10,color:"#6b7080"}}>{kpi.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <button className="zan-btn-prim" onClick={()=>onCreate()} style={{...btnPrim,padding:"10px 24px",fontSize:13}}>{t.newProject}</button>
          {index.length > 2 && (
            <div style={{flex:1,minWidth:160,maxWidth:320,position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?"🔍 بحث بالاسم أو الموقع...":"🔍 Search by name or location..."} style={{width:"100%",padding:"9px 14px",borderRadius:8,border:"1px solid #e5e0d8",background:"#fff",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s"}} onFocus={e=>e.target.style.borderColor="#2EC4B6"} onBlur={e=>e.target.style.borderColor="#e5e0d8"} />
              {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#9ca3af",fontSize:14,cursor:"pointer",padding:0}}>✕</button>}
            </div>
          )}
          <div style={{flex:1}} />
          <div style={{fontSize:12,color:"#6b7080",alignSelf:"center"}}>{sorted.length}{sorted.length!==index.length?` / ${index.length}`:""} {t.projects}</div>
        </div>
        {sorted.length===0 && search ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:36,marginBottom:12,opacity:0.5}}>🔍</div>
            <div style={{fontSize:16,fontWeight:600,color:"#1a1d23",marginBottom:6}}>{ar?"لا توجد نتائج":"No results"}</div>
            <div style={{fontSize:12,color:"#6b7080"}}>{ar?`لم يتم العثور على مشاريع تطابق "${search}"`:`No projects matching "${search}"`}</div>
            <button onClick={()=>setSearch("")} style={{...btnS,marginTop:16,padding:"8px 20px",fontSize:12,background:"#f0f1f5",color:"#4b5060",border:"1px solid #e5e7ec",borderRadius:6}}>{ar?"مسح البحث":"Clear search"}</button>
          </div>
        ) : sorted.length===0 ? (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🏗</div>
            <div style={{fontSize:20,fontWeight:700,color:"#0f1117",marginBottom:8}}>{lang==="ar"?"ابدأ مشروعك الأول":"Start Your First Project"}</div>
            <div style={{fontSize:13,color:"#6b7080",marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>{lang==="ar"?"أنشئ مشروع جديد أو ابدأ من أحد القوالب الجاهزة":"Create a new project or start from a ready-made template"}</div>
            <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:16,fontWeight:600}}>{lang==="ar"?"اختر قالب":"Choose a Template"}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fit, minmax(180px, 1fr))",gap:12,maxWidth:700,margin:"0 auto"}}>
              {PROJECT_TEMPLATES.map((tmpl)=>(
                <div key={tmpl.id} onClick={()=>onCreate(tmpl.id)} style={{background:"#fff",border:"1px solid #e5e0d8",borderRadius:10,padding:"18px 14px",cursor:"pointer",transition:"all 0.15s",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.boxShadow="0 4px 12px rgba(46,196,182,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}}>
                  <div style={{fontSize:28,marginBottom:8}}>{tmpl.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#0f1117",marginBottom:4}}>{ar?tmpl.ar:tmpl.en}</div>
                  <div style={{fontSize:10,color:"#6b7080"}}>{ar?tmpl.desc_ar:tmpl.desc_en}</div>
                </div>
              ))}
            </div>
            {/* Academy Banner for New Users */}
            {onOpenAcademy && (
              <div onClick={onOpenAcademy} style={{marginTop:32,maxWidth:700,margin:"32px auto 0",background:"linear-gradient(135deg, #0B2341 0%, #163050 100%)",borderRadius:12,padding:"24px 28px",cursor:"pointer",transition:"all 0.2s",border:"1px solid rgba(46,196,182,0.15)"}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 24px rgba(11,35,65,0.3)";e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:32}}>📚</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:"#C8A96E",fontFamily:"'Tajawal',sans-serif",marginBottom:4}}>{ar?"أكاديمية حصيف المالية":"Haseef Academy"}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.6}}>{ar?"جديد على النمذجة المالية؟ ابدأ بالتعلم أولاً - محتوى عملي + نماذج تفاعلية جاهزة":"New to financial modeling? Start learning first - practical content + ready interactive demos"}</div>
                  </div>
                  <span style={{fontSize:14,color:"#2EC4B6",fontWeight:600,flexShrink:0}}>{ar?"ادخل ←":"Enter →"}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(p=>(
              <div key={p.id} style={{background:"#fff",borderRadius:10,padding:isMobile?"12px 14px":"16px 20px",display:"flex",alignItems:"center",gap:isMobile?10:14,border:"1px solid #e5e0d8",cursor:"pointer",transition:"all 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#2EC4B6";e.currentTarget.style.boxShadow="0 4px 12px rgba(46,196,182,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e0d8";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)";}} onClick={()=>onOpen(p.id)}>
                <div style={{width:isMobile?32:38,height:isMobile?32:38,borderRadius:6,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"#f0f1f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?13:15,flexShrink:0}}>
                  {p._shared?"👤":p.status==="Complete"?"✓":p.status==="In Progress"?"▶":"◇"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:isMobile?13:14,fontWeight:600,color:"#0f1117",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}{p._shared?<span style={{fontSize:10,color:"#2563eb",marginInlineStart:8,fontWeight:500}}>{lang==="ar"?"(مشارك)":"(Shared)"}</span>:null}</div>
                  <div style={{fontSize:isMobile?10:11,color:"#6b7080",marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span>{new Date(p.updatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",...(!isMobile?{year:"numeric",hour:"2-digit",minute:"2-digit"}:{})})}</span>
                    {!isMobile && p.assetCount > 0 && <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:"#f0f1f5",color:"#6b7080"}}>{p.assetCount} {ar?"أصل":"assets"}</span>}
                    {!isMobile && p.finMode && p.finMode !== "self" && <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,background:p.finMode==="fund"?"#f3e8ff":"#dbeafe",color:p.finMode==="fund"?"#7c3aed":"#2563eb"}}>{p.finMode==="fund"?(ar?"صندوق":"Fund"):p.finMode==="bank100"?(ar?"بنك 100%":"Bank 100%"):(ar?"بنكي":"Bank")}</span>}
                  </div>
                </div>
                <span style={{fontSize:isMobile?9:10,padding:"3px 8px",borderRadius:4,fontWeight:500,background:p._shared?"#dbeafe":p.status==="Complete"?"#dcfce7":p.status==="In Progress"?"#dbeafe":"#f0f1f5",color:p._shared?(p._permission==="view"?"#fbbf24":"#60a5fa"):p.status==="Complete"?"#4ade80":p.status==="In Progress"?"#60a5fa":"#9ca3af",flexShrink:0}}>{p._shared?(p._permission==="view"?(lang==="ar"?"قراءة":"View"):(lang==="ar"?"تعديل":"Edit")):p.status||"Draft"}</span>
                {!isMobile && !p._shared && <button onClick={e=>{e.stopPropagation();onDup(p.id);}} style={{...btnSm,background:"#f0f1f5",color:"#6b7080",padding:"4px 10px"}} title="Duplicate">{lang==="ar"?"نسخ":"Copy"}</button>}
                {!p._shared && <button onClick={e=>{e.stopPropagation();const url=`${window.location.origin}?s=${p.id}&o=${user?.id||""}`;navigator.clipboard?.writeText(url).then(()=>{e.currentTarget.textContent="✓";setTimeout(()=>{e.currentTarget.textContent="🔗";},1500);});}} style={{...btnSm,background:"#dbeafe",color:"#60a5fa",padding:"4px 10px",fontSize:13}} title={lang==="ar"?"نسخ رابط المشاركة":"Copy share link"}>🔗</button>}
                {!p._shared && (confirmDel===p.id ? (
                  <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{onDel(p.id);setConfirmDel(null);}} style={{...btnSm,background:"#fef2f2",color:"#ef4444"}}>Yes</button>
                    <button onClick={()=>setConfirmDel(null)} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}}>No</button>
                  </div>
                ) : (
                  <button onClick={e=>{e.stopPropagation();setConfirmDel(p.id);}} style={{...btnSm,background:"#f0f1f5",color:"#6b7080"}} title="Delete">✕</button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsDashboard;
