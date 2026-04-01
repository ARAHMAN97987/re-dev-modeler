// ═══════════════════════════════════════════════════════════════
// Haseef Terms of Service — Bilingual (AR/EN)
// US-1.2.7: Static page at /#/terms
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";

const C = { navy: "#0B2341", teal: "#2EC4B6", gold: "#C8A96E", text: "#1a1d23", textSec: "#6b7080", bg: "#f8f9fb", card: "#fff", border: "#e5e7ec" };

const sections = [
  {
    titleEn: "1. Service Description",
    titleAr: "١. وصف الخدمة",
    en: "Haseef is a financial modeling platform for real estate development projects. The platform provides tools for feasibility analysis, cash flow projections, financing modeling, waterfall distributions, and investment reporting. Haseef is provided by ZAN Destination Development.",
    ar: "حصيف هو منصة نمذجة مالية لمشاريع التطوير العقاري. توفر المنصة أدوات لتحليل الجدوى، وتوقعات التدفقات النقدية، ونمذجة التمويل، وتوزيعات الأرباح، وتقارير الاستثمار. حصيف مقدم من شركة زان لتطوير الوجهات."
  },
  {
    titleEn: "2. User Accounts",
    titleAr: "٢. حسابات المستخدمين",
    en: "Users must provide a valid email address to create an account. You are responsible for maintaining the confidentiality of your login credentials. Each account is personal and should not be shared. We reserve the right to suspend accounts that violate these terms.",
    ar: "يجب على المستخدمين تقديم عنوان بريد إلكتروني صالح لإنشاء حساب. أنت مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول الخاصة بك. كل حساب شخصي ولا يجوز مشاركته. نحتفظ بالحق في تعليق الحسابات التي تنتهك هذه الشروط."
  },
  {
    titleEn: "3. Subscriptions & Billing",
    titleAr: "٣. الاشتراكات والفوترة",
    en: "Haseef offers multiple subscription tiers (Starter, Growth, Pro). Free trial periods may be offered at our discretion. Subscription fees are non-refundable unless otherwise stated. We reserve the right to change pricing with 30 days notice to existing subscribers.",
    ar: "تقدم حصيف عدة مستويات اشتراك (مبتدئ، نمو، احترافي). قد تُقدم فترات تجريبية مجانية وفقًا لتقديرنا. رسوم الاشتراك غير قابلة للاسترداد ما لم يُذكر خلاف ذلك. نحتفظ بالحق في تغيير الأسعار بإشعار مسبق قدره ٣٠ يومًا للمشتركين الحاليين."
  },
  {
    titleEn: "4. Data & Privacy",
    titleAr: "٤. البيانات والخصوصية",
    en: "Your project data is stored securely and associated with your account. We do not sell or share your data with third parties. Data is hosted on secure cloud infrastructure (Supabase/Vercel). You can export your data at any time using the platform's export features. We implement industry-standard security practices to protect your information.",
    ar: "يتم تخزين بيانات مشاريعك بشكل آمن ومرتبط بحسابك. نحن لا نبيع أو نشارك بياناتك مع أطراف ثالثة. تُستضاف البيانات على بنية تحتية سحابية آمنة (Supabase/Vercel). يمكنك تصدير بياناتك في أي وقت باستخدام ميزات التصدير في المنصة. نطبق ممارسات أمنية متوافقة مع معايير الصناعة لحماية معلوماتك."
  },
  {
    titleEn: "5. Support Access",
    titleAr: "٥. الوصول للدعم الفني",
    en: "Haseef administrators may access user project data for the following purposes: technical support and troubleshooting, platform improvement and quality assurance, resolving account issues, and ensuring platform integrity. All administrative access is logged for transparency. Administrators will not modify user data without explicit permission from the account holder.",
    ar: "يجوز لمسؤولي حصيف الوصول إلى بيانات مشاريع المستخدمين للأغراض التالية: الدعم الفني واستكشاف الأخطاء وإصلاحها، تحسين المنصة وضمان الجودة، حل مشكلات الحسابات، وضمان سلامة المنصة. يتم تسجيل جميع عمليات الوصول الإدارية بشفافية. لن يقوم المسؤولون بتعديل بيانات المستخدم دون إذن صريح من صاحب الحساب."
  },
  {
    titleEn: "6. Disclaimer & Limitation of Liability",
    titleAr: "٦. إخلاء المسؤولية وتحديد المسؤولية",
    en: "Haseef provides financial modeling tools for informational and educational purposes only. The platform's outputs do not constitute financial, investment, legal, or tax advice. Users are responsible for verifying all calculations and assumptions before making investment decisions. We are not liable for any financial losses resulting from reliance on platform outputs.",
    ar: "توفر حصيف أدوات النمذجة المالية لأغراض معلوماتية وتعليمية فقط. لا تشكل مخرجات المنصة نصيحة مالية أو استثمارية أو قانونية أو ضريبية. المستخدمون مسؤولون عن التحقق من جميع الحسابات والافتراضات قبل اتخاذ قرارات الاستثمار. لسنا مسؤولين عن أي خسائر مالية ناتجة عن الاعتماد على مخرجات المنصة."
  },
  {
    titleEn: "7. Termination",
    titleAr: "٧. الإنهاء",
    en: "We may terminate or suspend your account if you violate these terms. Upon termination, your access to the platform will cease but your data will be retained for 90 days to allow export. You may request account deletion at any time by contacting support.",
    ar: "يجوز لنا إنهاء أو تعليق حسابك في حالة انتهاك هذه الشروط. عند الإنهاء، سيتوقف وصولك إلى المنصة ولكن سيتم الاحتفاظ ببياناتك لمدة ٩٠ يومًا للسماح بالتصدير. يمكنك طلب حذف الحساب في أي وقت عن طريق الاتصال بالدعم."
  },
];

export default function TermsOfService({ onBack }) {
  const [lang, setLang] = useState("ar");
  const ar = lang === "ar";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", direction: ar ? "rtl" : "ltr" }}>
      {/* Header */}
      <div style={{ background: C.navy, color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Tajawal',sans-serif" }}>حصيف</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>{ar ? "شروط الاستخدام" : "Terms of Service"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setLang(l => l === "ar" ? "en" : "ar")} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            {ar ? "English" : "عربي"}
          </button>
          {onBack && <button onClick={onBack} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            {ar ? "← رجوع" : "← Back"}
          </button>}
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: ar ? "'Tajawal',sans-serif" : "inherit" }}>
          {ar ? "شروط الاستخدام" : "Terms of Service"}
        </h1>
        <div style={{ fontSize: 12, color: C.textSec, marginBottom: 24 }}>
          {ar ? "آخر تحديث: أبريل ٢٠٢٦" : "Last updated: April 2026"}
        </div>
        <div style={{ fontSize: 12, color: C.textSec, marginBottom: 24, lineHeight: 1.8 }}>
          {ar
            ? "باستخدامك لمنصة حصيف أو إنشاء حساب فيها، فإنك توافق على الشروط والأحكام التالية. يرجى قراءتها بعناية."
            : "By using the Haseef platform or creating an account, you agree to the following terms and conditions. Please read them carefully."}
        </div>

        {sections.map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 10, fontFamily: ar ? "'Tajawal',sans-serif" : "inherit" }}>
              {ar ? s.titleAr : s.titleEn}
            </h2>
            <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.9, margin: 0 }}>
              {ar ? s.ar : s.en}
            </p>
          </div>
        ))}

        <div style={{ textAlign: "center", fontSize: 11, color: C.textSec, marginTop: 32, paddingBottom: 32 }}>
          © 2026 Haseef — ZAN Destination Development
        </div>
      </div>
    </div>
  );
}
