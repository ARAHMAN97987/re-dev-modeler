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
      background: selected ? "color-mix(in srgb, var(--sys-blue) 8%, transparent)" : "var(--surface-1)",
      border: selected ? "2px solid var(--sys-blue)" : "2px solid var(--hairline)",
      borderRadius: 12, padding: "16px 18px", cursor: "pointer",
      transition: "all 0.18s var(--ease-quart)",
      display: "flex", alignItems: "center", gap: 14, minHeight: 60,
    }} onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "color-mix(in srgb, var(--sys-blue) 35%, transparent)"; }} onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "var(--hairline)"; }}>
      <span style={{fontSize:28}}>{icon}</span>
      <div><div style={{fontSize: 14, fontWeight: 600, color: selected ? "var(--sys-blue)" : "var(--text-primary)", letterSpacing: "-0.01em"}}>{label}</div>
      {desc && <div style={{fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.45}}>{desc}</div>}</div>
      {selected && <span style={{marginInlineStart: "auto", fontSize: 18, color: "var(--sys-blue)"}}>✓</span>}
    </div>
  );

  const steps = [
    // Step 0: Project name + location
    { title: t?"اسم المشروع والموقع":"Project Name & Location", content: (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,fontWeight:500,letterSpacing:"-0.01em"}}>{t?"اسم المشروع":"Project Name"}</div>
        <input value={project.name||""} onChange={e=>onUpdate({name:e.target.value})} placeholder={t?"مثال: مشروع الواجهة البحرية":(lang==="ar"?"مثال: واجهة حصيف البحرية":"e.g. Haseef Waterfront")} style={{width:"100%",padding:"12px 16px",border:"1px solid var(--hairline)",borderRadius:10,fontSize:15,fontWeight:600,fontFamily:"inherit",outline:"none",background:"var(--surface-1)",color:"var(--text-primary)",transition:"border-color 0.15s var(--ease-quart), box-shadow 0.15s var(--ease-quart)"}} autoFocus /></div>
        <div><div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4,fontWeight:500,letterSpacing:"-0.01em"}}>{t?"الموقع":"Location"}</div>
        <input value={project.location||""} onChange={e=>onUpdate({location:e.target.value})} placeholder={t?"مثال: جازان، السعودية":"e.g. Jazan, Saudi Arabia"} style={{width:"100%",padding:"10px 14px",border:"1px solid var(--hairline)",borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",background:"var(--surface-1)",color:"var(--text-primary)"}} /></div>
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
        <Option icon="💰" label={t?"صندوق مدر للدخل":"Income Fund"} desc={t?"شراء/تطوير وتشغيل للدخل الدوري":"Buy/develop & hold for periodic income"} selected={project.finMode==="incomeFund"} onClick={()=>onUpdate({finMode:"incomeFund",debtAllowed:true,maxLtvPct:50,exitStrategy:"hold"})} />
        <Option icon="🏛" label={t?"مختلط (حكومي + صندوق)":"Hybrid (Government + Fund)"} desc={t?"تمويل حكومي/مؤسسي + صندوق على الباقي":"Government financing + fund on remainder"} selected={project.finMode==="hybrid"} onClick={()=>onUpdate({finMode:"hybrid",debtAllowed:true,govFinancingPct:70,govBeneficiary:"project"})} />
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'DM Sans', 'Tajawal', 'Segoe UI', system-ui, sans-serif",backdropFilter:"blur(4px)"}}>
      <div style={{background:"var(--surface-1)",borderRadius:isMobile?16:20,width:520,maxWidth:"94vw",maxHeight:"85vh",padding:0,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Progress */}
        <div style={{padding:isMobile?"14px 16px 0":"20px 28px 0",display:"flex",gap:6}}>
          {activeSteps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?"var(--sys-blue)":"var(--surface-3)",transition:"background 0.3s var(--ease-quart)"}} />)}
        </div>
        {/* Header */}
        <div style={{padding:isMobile?"14px 16px 6px":"20px 28px 8px"}}>
          <div style={{fontSize:11,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:0.8,fontWeight:600,marginBottom:6}}>
            {t?"الخطوة":"Step"} {step+1} {t?"من":"of"} {activeSteps.length}
          </div>
          <div style={{fontSize:isMobile?18:22,fontWeight:700,color:"var(--text-primary)",letterSpacing:"-0.02em"}}>{current.title}</div>
          {current.subtitle&&<div style={{fontSize:13,color:"var(--text-secondary)",marginTop:4,letterSpacing:"-0.01em"}}>{current.subtitle}</div>}
        </div>
        {/* Content — scrollable if step content is tall */}
        <div style={{padding:isMobile?"10px 16px 18px":"12px 28px 24px",minHeight:isMobile?160:200,flex:1,overflowY:"auto"}}>{current.content}</div>
        {/* Footer */}
        <div style={{padding:isMobile?"12px 16px":"16px 28px",borderTop:"1px solid var(--hairline)",display:"flex",gap:10,justifyContent:"space-between",background:"var(--surface-2)"}}>
          <button onClick={()=>step>0?setStep(step-1):onDone()} style={{padding:"10px 20px",borderRadius:10,border:"1px solid var(--hairline)",background:"var(--surface-1)",color:"var(--text-secondary)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s var(--ease-quart)"}}>
            {step>0?(t?"السابق":"Back"):(t?"تخطي":"Skip")}
          </button>
          <button onClick={()=>isLast?onDone():setStep(step+1)} disabled={!canNext} style={{padding:"10px 28px",borderRadius:10,border:"none",background:canNext?"var(--sys-blue)":"var(--surface-3)",color:canNext?"#fff":"var(--text-tertiary)",fontSize:13,fontWeight:600,cursor:canNext?"pointer":"default",fontFamily:"inherit",transition:"all 0.15s var(--ease-quart)",letterSpacing:"-0.01em",boxShadow:canNext?"0 1px 2px rgba(0,122,255,0.25)":"none"}}>
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
