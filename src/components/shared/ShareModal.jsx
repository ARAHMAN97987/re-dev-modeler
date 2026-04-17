// Extracted from App.jsx lines 4319-4453
import { useState, useEffect } from "react";
import { useIsMobile } from "./hooks";
import { btnS, btnSm } from "./styles";

function ShareModal({ project, up, lang, user, onClose }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [perm, setPerm] = useState("view");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
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
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9998, backdropFilter: "blur(4px)" },
    modal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: isMobile ? "94vw" : 480, maxWidth: "94vw", maxHeight: "85vh", background: "var(--surface-1)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { padding: "18px 22px 14px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 10 },
    body: { flex: 1, overflow: "auto", padding: "16px 22px" },
    input: { flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 44, transition: "border-color 0.15s var(--ease-quart), box-shadow 0.15s var(--ease-quart)", background: "var(--surface-1)", color: "var(--text-primary)" },
    btn: { padding: "10px 18px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", minHeight: 44, display: "flex", alignItems: "center", gap: 6, transition: "all 0.18s var(--ease-quart)" },
  };

  return (<>
    <div onClick={onClose} style={sty.overlay} />
    <div style={sty.modal}>
      {/* Header */}
      <div style={sty.header}>
        <span style={{ fontSize: 18 }}>📤</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{ar ? "مشاركة المشروع" : "Share Project"}</span>
        <button onClick={onClose} style={{ ...sty.btn, background: "var(--surface-2)", color: "var(--text-secondary)", padding: "6px 12px", fontSize: 16, minHeight: 36 }}>✕</button>
      </div>

      <div style={sty.body}>
        {/* ── Copy Link Section ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "رابط المشروع" : "Project Link"}</div>
          <div style={{ display: "flex", gap: 8, alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ flex: 1, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "ltr", minHeight: 44, display: "flex", alignItems: "center" }}>{shareUrl}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyLink} style={{ ...sty.btn, background: copied === "link" ? "var(--sys-green)" : "var(--sys-blue)", color: "#fff", whiteSpace: "nowrap" }}>
                {copied === "link" ? "✓" : "🔗"} {copied === "link" ? (ar ? "تم النسخ" : "Copied!") : (ar ? "نسخ الرابط" : "Copy Link")}
              </button>
              <button onClick={copyInvite} style={{ ...sty.btn, background: copied === "invite" ? "var(--sys-green)" : "color-mix(in srgb, var(--sys-blue) 10%, transparent)", color: copied === "invite" ? "#fff" : "var(--sys-blue)", border: "1px solid color-mix(in srgb, var(--sys-blue) 22%, transparent)", whiteSpace: "nowrap" }}>
                {copied === "invite" ? "✓" : "💬"} {copied === "invite" ? (ar ? "تم" : "Done") : (ar ? "نص دعوة" : "Invite Text")}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6, lineHeight: 1.5 }}>{ar ? "أي شخص عنده الرابط ومسجل بالمنصة يقدر يفتح المشروع. غير المسجلين يطلب منهم التسجيل أول." : "Anyone with this link who is registered can access the project. Unregistered users will be prompted to sign up."}</div>
        </div>

        {/* ── Add User ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{ar ? "إضافة مشارك" : "Add Person"}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ar ? "البريد الإلكتروني" : "Email address"}
              style={sty.input} onKeyDown={e => e.key === "Enter" && addUser()} />
            <select value={perm} onChange={e => setPerm(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 12, fontFamily: "inherit", background: "var(--surface-1)", color: "var(--text-primary)", cursor: "pointer", minHeight: 44 }}>
              <option value="view">{ar ? "قراءة فقط" : "View only"}</option>
              <option value="edit">{ar ? "تعديل" : "Can edit"}</option>
            </select>
            <button onClick={addUser} style={{ ...sty.btn, background: "var(--sys-blue)", color: "#fff" }}>
              {ar ? "أضف" : "Add"}
            </button>
          </div>
          {error && <div style={{ fontSize: 11, color: "var(--sys-red)", marginTop: 6 }}>{error}</div>}
        </div>

        {/* ── Shared Users List ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {ar ? "المشاركون" : "Shared With"} {shared.length > 0 && <span style={{ fontSize: 10, background: "color-mix(in srgb, var(--sys-blue) 12%, transparent)", color: "var(--sys-blue)", padding: "1px 6px", borderRadius: 8, marginInlineStart: 6, fontWeight: 600 }}>{shared.length}</span>}
          </div>
          {shared.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
              {ar ? "لم تتم المشاركة مع أحد بعد" : "Not shared with anyone yet"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {shared.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--hairline)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "color-mix(in srgb, var(--sys-blue) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--sys-blue)", fontWeight: 600, flexShrink: 0 }}>
                    {(s.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    {s.addedAt && <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{new Date(s.addedAt).toLocaleDateString()}</div>}
                  </div>
                  <select value={s.permission || "edit"} onChange={e => changePerm(s.email, e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--hairline)", fontSize: 11, fontFamily: "inherit",
                      background: s.permission === "edit" ? "color-mix(in srgb, var(--sys-blue) 14%, transparent)" : "color-mix(in srgb, var(--sys-orange) 14%, transparent)",
                      color: s.permission === "edit" ? "var(--sys-blue)" : "var(--sys-orange)",
                      cursor: "pointer", fontWeight: 600, minHeight: 36 }}>
                    <option value="view">{ar ? "قراءة" : "View"}</option>
                    <option value="edit">{ar ? "تعديل" : "Edit"}</option>
                  </select>
                  <button onClick={() => removeUser(s.email)} style={{ ...btnSm, background: "color-mix(in srgb, var(--sys-red) 10%, transparent)", color: "var(--sys-red)", padding: "6px 10px", minHeight: 36, border: "none", fontFamily: "inherit", borderRadius: 8, cursor: "pointer" }} title={ar ? "إزالة" : "Remove"}>✕</button>
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
