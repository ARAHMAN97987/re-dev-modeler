import React from "react";
import { useIsMobile } from "./hooks";

export default function FeaturesGrid({ lang }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const features = [
    { icon: "\u{1F3D7}", color: "var(--sys-blue)",   title: ar?"نمذجة متعددة الأصول":"Multi-Asset Modeling", desc: ar?"فنادق، محلات، مكاتب، مارينا، سكني - كل أنواع العقارات في نموذج واحد مع P&L مفصّل للفنادق والمارينا":"Hotels, retail, offices, marina, residential - all property types in one model with detailed Hotel & Marina P&L" },
    { icon: "\u{1F3E6}", color: "var(--sys-indigo)", title: ar?"تمويل متقدم":"Advanced Financing",           desc: ar?"تمويل بنكي، صندوق استثماري (مطور/مستثمر)، تمويل إسلامي (مرابحة/إجارة)، رسملة حق الانتفاع، هيكل رأس المال":"Bank debt, Developer/Investor fund structure, Islamic finance (Murabaha/Ijara), leasehold capitalization, capital structure" },
    { icon: "\u{1F4CA}", color: "var(--sys-green)",  title: ar?"توزيع الأرباح":"Profit Distribution",         desc: ar?"رد رأس المال → العائد التفضيلي → تقسيم الأرباح مع IRR وMOIC لكل طرف":"Return of Capital → Preferred Return → Profit Split with IRR & MOIC per party" },
    { icon: "\u{1F4C8}", color: "var(--sys-orange)", title: ar?"سيناريوهات وتحليل حساسية":"Scenarios & Sensitivity", desc: ar?"8 سيناريوهات جاهزة، جدول حساسية ثنائي المتغيرات، تحليل نقطة التعادل مع ملخص المخاطر":"8 built-in scenarios, 2-variable sensitivity table, break-even analysis with risk summary" },
    { icon: "\u{1F4C4}", color: "var(--sys-red)",    title: ar?"تقارير جاهزة للبنك والمستثمر":"Bank & Investor Reports", desc: ar?"ملخص تنفيذي، حزمة البنك (مع DSCR)، مذكرة المستثمر - كلها بصيغة PDF وExcel":"Executive summary, Bank pack (with DSCR), Investor memo - all exportable as PDF & Excel" },
    { icon: "\u{1F310}", color: "var(--sys-teal)",   title: ar?"ثنائي اللغة + حوافز حكومية":"Bilingual + Gov Incentives", desc: ar?"واجهة عربي/إنجليزي كاملة مع دعم منح CAPEX، إعفاء إيجار الأرض، دعم التمويل، واسترداد الرسوم":"Full Arabic/English interface with CAPEX grants, land rent rebates, finance subsidies, and fee waivers" },
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit, minmax(260px, 1fr))",gap:16}}>
      {features.map((f, i) => (
        <div key={i} style={{
          background: "var(--surface-1)",
          borderRadius: 12,
          border: "1px solid var(--hairline)",
          padding: "20px 18px",
          transition: "all 0.2s var(--ease-quart)",
        }} onMouseEnter={e => {
          e.currentTarget.style.borderColor = `color-mix(in srgb, ${f.color} 30%, transparent)`;
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)";
        }} onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--hairline)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{
              width:40,height:40,borderRadius:10,
              background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
              color: f.color,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
            }}>{f.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)",letterSpacing:"-0.01em"}}>{f.title}</div>
          </div>
          <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.6}}>{f.desc}</div>
        </div>
      ))}
    </div>
  );
}
