// Extracted from App.jsx lines 4319-4453
import { useState } from "react";
import { useIsMobile } from "./hooks";
import { btnS, btnSm } from "./styles";

function ShareModal({ project, up, lang, user, onClose }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [perm, setPerm] = useState("view");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const shared = (project?.sharedWith || []).map(e => typeof e === "string" ? { email: e, permission: "edit" } : e);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}?s=${project?.id || ""}&o=${user?.id || ""}`
    : "";

  const addUser = () => {
    setError("");
    const em = email.toLowerCase().trim();
    if (!em || !em.includes("@")) { setError(ar ? "أدخل بريد صحيح" : "Enter a valid email"); return; }
    if (em === user?.email?.toLowerCase()) { setError(ar ? "لا يمكن مشاركة مع نفسك" : "Cannot share with yourself"); return; }
    if (shared.some(e => e.email.toLowerCase() === em)) { setError(ar ? "مشارك مسبقاً" : "Already shared"); return; }
    up({ sharedWith: [...shared, { email: em, permission: perm, addedAt: new Date().toISOString() }] });
    setEmail("");
  };

  const removeUser = (em) => {
    up({ sharedWith: shared.filter(e => e.email.toLowerCase() !== em.toLowerCase()) });
  };

  const changePerm = (em, newPerm) => {
    up({ sharedWith: shared.map(e => e.email.toLowerCase() === em.toLowerCase() ? { ...e, permission: newPerm } : e) });
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => { setCopied("link"); setTimeout(() => setCopied(""), 2000); });
  };

  const copyInvite = () => {
    const projName = project?.name || "—";
    const assets = (project?.assets || []).length;
    const phases = [...new Set((project?.assets || []).map(a => a.phase))].length;
    const text = ar
      ? `مرحباً،\nأود مشاركة نموذج مالي معك على منصة حصيف للنمذجة المالية.\n\n📋 المشروع: ${projName}\n📊 عدد الأصول: ${assets} | المراحل: ${phases}\n\n🔗 رابط الوصول:\n${shareUrl}\n\nإذا ما عندك حساب، سجّل من نفس الرابط وبيظهر لك المشروع تلقائي.`
      : `Hi,\nI'd like to share a financial model with you on Haseef Financial Modeler.\n\n📋 Project: ${projName}\n📊 Assets: ${assets} | Phases: ${phases}\n\n🔗 Access link:\n${shareUrl}\n\nIf you don't have an account, register from the same link and the project will appear automatically.`;
    navigator.clipboard?.writeText(text).then(() => { setCopied("invite"); setTimeout(() => setCopied(""), 2000); });
  };

  const sty = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, backdropFilter: "blur(2px)" },
    modal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? "94vw" : 480, maxWidth: "94vw", maxHeight: "85vh", background: "#fff", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { padding: "18px 22px 14px", borderBottom: "1px solid #e5e7ec", display: "flex", alignItems: "center", gap: 10 },
    body: { flex: 1, overflow: "auto", padding: "16px 22px" },
    input: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 44 },
    btn: { padding: "10px 18px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", minHeight: 44, display: "flex", alignItems: "center", gap: 6 },
  };

  return (<>
    <div onClick={onClose} style={sty.overlay} />
    <div style={sty.modal}>
      {/* Header */}
      <div style={sty.header}>
        <span style={{ fontSize: 18 }}>📤</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#1a1d23" }}>{ar ? "مشاركة المشروع" : "Share Project"}</span>
        <button onClick={onClose} style={{ ...sty.btn, background: "#f0f1f5", color: "#6b7080", padding: "6px 12px", fontSize: 16 }}>✕</button>
      </div>

      <div style={sty.body}>
        {/* ── Copy Link Section ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "رابط المشروع" : "Project Link"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flex: 1, padding: "10px 12px", background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 11, color: "#6b7080", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", minHeight: 44, display: "flex", alignItems: "center" }}>{shareUrl}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyLink} style={{ ...sty.btn, background: copied === "link" ? "#16a34a" : "#2563eb", color: "#fff", whiteSpace: "nowrap" }}>
                {copied === "link" ? "✓" : "🔗"} {copied === "link" ? (ar ? "تم النسخ" : "Copied!") : (ar ? "نسخ الرابط" : "Copy Link")}
              </button>
              <button onClick={copyInvite} style={{ ...sty.btn, background: copied === "invite" ? "#16a34a" : "#f0f4ff", color: copied === "invite" ? "#fff" : "#2563eb", border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                {copied === "invite" ? "✓" : "💬"} {copied === "invite" ? (ar ? "تم" : "Done") : (ar ? "نص دعوة" : "Invite Text")}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}>{ar ? "أي شخص عنده الرابط ومسجل بالمنصة يقدر يفتح المشروع. غير المسجلين يطلب منهم التسجيل أول." : "Anyone with this link who is registered can access the project. Unregistered users will be prompted to sign up."}</div>
        </div>

        {/* ── Add User ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "إضافة مشارك" : "Add Person"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Email address"}
              style={sty.input} onKeyDown={e => e.key === "Enter" && addUser()} />
            <select value={perm} onChange={e => setPerm(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7ec", fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer", minHeight: 44 }}>
              <option value="view">{ar ? "قراءة فقط" : "View only"}</option>
              <option value="edit">{ar ? "تعديل" : "Can edit"}</option>
            </select>
            <button onClick={addUser} style={{ ...sty.btn, background: "#2563eb", color: "#fff" }}>
              {ar ? "أضف" : "Add"}
            </button>
          </div>
          {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{error}</div>}
        </div>

        {/* ── Shared Users List ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7080", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {ar ? "المشاركون" : "Shared With"} {shared.length > 0 && <span style={{ fontSize: 10, background: "#dbeafe", color: "#2563eb", padding: "1px 6px", borderRadius: 8, marginInlineStart: 6 }}>{shared.length}</span>}
          </div>
          {shared.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
              {ar ? "لم تتم المشاركة مع أحد بعد" : "Not shared with anyone yet"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {shared.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8f9fb", borderRadius: 8, border: "1px solid #e5e7ec" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#2563eb", fontWeight: 600, flexShrink: 0 }}>
                    {(s.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1d23", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    {s.addedAt && <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(s.addedAt).toLocaleDateString()}</div>}
                  </div>
                  <select value={s.permission || "edit"} onChange={e => changePerm(s.email, e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7ec", fontSize: 11, fontFamily: "inherit", background: s.permission === "edit" ? "#dbeafe" : "#fef3c7", color: s.permission === "edit" ? "#1d4ed8" : "#92400e", cursor: "pointer", fontWeight: 600, minHeight: 36 }}>
                    <option value="view">{ar ? "قراءة" : "View"}</option>
                    <option value="edit">{ar ? "تعديل" : "Edit"}</option>
                  </select>
                  <button onClick={() => removeUser(s.email)} style={{ ...btnSm, background: "#fef2f2", color: "#ef4444", padding: "6px 10px", minHeight: 36 }} title={ar ? "إزالة" : "Remove"}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </>);
}

export default ShareModal;
