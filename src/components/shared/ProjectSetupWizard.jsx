// Extracted from App.jsx lines 3916-4015
// ProjectSetupWizard: 4-step onboarding wizard

import { useState } from "react";
import { btnS, btnPrim } from "../shared/styles";

function ProjectSetupWizard({ project, onUpdate, onDone, lang }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [eduModal, setEduModal] = useState(null);
  const t = lang === "ar";

  const Option = ({icon, label, desc, selected, onClick}) => (
    <div onClick={onClick} style={{
      background:selected?"#eff6ff":"#fff", border:selected?"2px solid #2563eb":"2px solid #e5e7ec",
      borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.15s",
      display:"flex", alignItems:"center", gap:14, minHeight:60,
    }} onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="#c7d2fe";}} onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="#e5e7ec";}}>
      <span style={{fontSize:28}}>{icon}</span>
      <div><div style={{fontSize:14,fontWeight:600,color:selected?"#2563eb":"#1a1d23"}}>{label}</div>
      {desc&&<div style={{fontSize:11,color:"#6b7080",marginTop:2}}>{desc}</div>}</div>
      {selected&&<span style={{marginInlineStart:"auto",fontSize:18,color:"#2563eb"}}>✓</span>}
    </div>
  );

  const steps = [
    // Step 0: Project name + location
    { title: t?"اسم المشروع والموقع":"Project Name & Location", content: (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><div style={{fontSize:11,color:"#6b7080",marginBottom:4,fontWeight:500}}>{t?"اسم المشروع":"Project Name"}</div>
        <input value={project.name||""} onChange={e=>onUpdate({name:e.target.value})} placeholder={t?"مثال: مشروع الواجهة البحرية":(lang==="ar"?"مثال: واجهة حصيف البحرية":"e.g. Haseef Waterfront")} style={{width:"100%",padding:"12px 16px",border:"2px solid #e5e7ec",borderRadius:10,fontSize:15,fontWeight:600,fontFamily:"inherit",outline:"none"}} autoFocus /></div>
        <div><div style={{fontSize:11,color:"#6b7080",marginBottom:4,fontWeight:500}}>{t?"الموقع":"Location"}</div>
        <input value={project.location||""} onChange={e=>onUpdate({location:e.target.value})} placeholder={t?"مثال: جازان، السعودية":"e.g. Jazan, Saudi Arabia"} style={{width:"100%",padding:"10px 14px",border:"1px solid #e5e7ec",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}} /></div>
      </div>
    )},
    // Step 1: Land type
    { title: t?"نوع الأرض":"Land Type", subtitle: t?"كيف ستحصل على الأرض؟":"How will you acquire the land?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="📋" label={t?"إيجار أرض (حق انتفاع)":"Land Lease (Leasehold)"} desc={t?"إيجار سنوي من الحكومة/المالك":"Annual rent from government/owner"} selected={project.landType==="lease"} onClick={()=>onUpdate({landType:"lease"})} />
        <Option icon="🏠" label={t?"شراء أرض (تملك)":"Land Purchase (Freehold)"} desc={t?"شراء الأرض كاملة قبل البناء":"Buy land outright before construction"} selected={project.landType==="purchase"} onClick={()=>onUpdate({landType:"purchase"})} />
        <Option icon="🤝" label={t?"أرض كشريك (حصة عينية)":"Land as Partner (In-kind Equity)"} desc={t?"المالك يساهم بالأرض كحصة":"Landowner contributes as equity"} selected={project.landType==="partner"} onClick={()=>onUpdate({landType:"partner"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="landType" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
    // Step 2: Financing mode
    { title: t?"طريقة التمويل":"Financing Mode", subtitle: t?"كيف سيتم تمويل المشروع؟":"How will the project be funded?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="💰" label={t?"تمويل ذاتي (رأس مال كامل)":"Self-Funded (100% Equity)"} desc={t?"المطور يموّل كل شي من جيبه":"Developer funds everything"} selected={project.finMode==="self"} onClick={()=>onUpdate({finMode:"self"})} />
        <Option icon="🏦" label={t?"تمويل بنكي 100% (ملك المطور)":"100% Bank Debt (Developer-Owned)"} desc={t?"البنك يموّل كامل التكلفة، المطور هو المالك":"Bank finances 100%, developer owns"} selected={project.finMode==="bank100"} onClick={()=>onUpdate({finMode:"bank100",debtAllowed:true,maxLtvPct:100})} />
        <Option icon="🏗" label={t?"دين بنكي + رأس مال المطور":"Bank Debt + Developer Equity"} desc={t?"جزء من البنك وجزء من المطور":"Part bank loan, part developer equity"} selected={project.finMode==="debt"} onClick={()=>onUpdate({finMode:"debt",debtAllowed:true})} />
        <Option icon="📊" label={t?"صندوق استثماري (GP/LP)":"Fund Structure (GP/LP)"} desc={t?"مطور + مستثمرين مع شلال توزيعات":"Developer + investors with waterfall"} selected={project.finMode==="fund"} onClick={()=>onUpdate({finMode:"fund",debtAllowed:true})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="financingMode" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
    // Step 3: Exit strategy
    { title: t?"استراتيجية التخارج":"Exit Strategy", subtitle: t?"ماذا تخطط بعد الانتهاء؟":"What's your plan after completion?", content: (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Option icon="🏷" label={t?"بيع الأصل":"Sell the Asset"} desc={t?"بيع المشروع كاملاً بعد الاستقرار":"Sell entire project after stabilization"} selected={project.exitStrategy==="sale"||project.exitStrategy==="caprate"} onClick={()=>onUpdate({exitStrategy:"sale"})} />
        <Option icon="💎" label={t?"احتفاظ بالدخل (بدون بيع)":"Hold for Income (No Sale)"} desc={t?"الاستمرار بتحصيل الإيرادات":"Continue collecting income indefinitely"} selected={project.exitStrategy==="hold"} onClick={()=>onUpdate({exitStrategy:"hold"})} />
        <div style={{textAlign:"center",marginTop:4}}><HelpLink contentKey="exitStrategy" lang={lang} onOpen={setEduModal} /></div>
      </div>
    )},
  ];

  // Exit strategy is relevant for ALL modes (self can sell or hold too)
  const activeSteps = steps;
  const current = activeSteps[step];
  const isLast = step === activeSteps.length - 1;
  const canNext = step === 0 ? (project.name && project.name !== "New Project") : true;

  return (<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"#fff",borderRadius:isMobile?14:20,width:520,maxWidth:"94vw",padding:0,boxShadow:"0 24px 80px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        {/* Progress */}
        <div style={{padding:isMobile?"14px 16px 0":"20px 28px 0",display:"flex",gap:6}}>
          {activeSteps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"#2563eb":"#e5e7ec",transition:"background 0.3s"}} />)}
        </div>
        {/* Header */}
        <div style={{padding:isMobile?"14px 16px 6px":"20px 28px 8px"}}>
          <div style={{fontSize:10,color:"#6b7080",textTransform:"uppercase",letterSpacing:1,fontWeight:600,marginBottom:6}}>
            {t?"الخطوة":"Step"} {step+1} {t?"من":"of"} {activeSteps.length}
          </div>
          <div style={{fontSize:isMobile?17:20,fontWeight:700,color:"#1a1d23"}}>{current.title}</div>
          {current.subtitle&&<div style={{fontSize:12,color:"#6b7080",marginTop:4}}>{current.subtitle}</div>}
        </div>
        {/* Content */}
        <div style={{padding:isMobile?"10px 16px 18px":"12px 28px 24px",minHeight:isMobile?160:200}}>{current.content}</div>
        {/* Footer */}
        <div style={{padding:isMobile?"12px 16px":"16px 28px",borderTop:"1px solid #f0f1f5",display:"flex",gap:10,justifyContent:"space-between",background:"#fafbfc"}}>
          <button onClick={()=>step>0?setStep(step-1):onDone()} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #e5e7ec",background:"#fff",color:"#6b7080",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
            {step>0?(t?"السابق":"Back"):(t?"تخطي":"Skip")}
          </button>
          <button onClick={()=>isLast?onDone():setStep(step+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:8,border:"none",background:canNext?"#2563eb":"#e5e7ec",color:canNext?"#fff":"#9ca3af",fontSize:13,fontWeight:600,cursor:canNext?"pointer":"default",fontFamily:"inherit"}}>
            {isLast?(t?"ابدأ العمل":"Start Working"):(t?"التالي":"Next →")}
          </button>
        </div>
      </div>
    </div>
    {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES GRID (shared between landing page and dashboard)
// ═══════════════════════════════════════════════════════════════

export default ProjectSetupWizard;
