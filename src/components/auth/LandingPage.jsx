// LandingPage — fallback landing/login rendered by App.jsx when supabase is
// unconfigured. The live flow goes through lib/auth.jsx AuthGate; this file is
// kept for local-only / no-backend development. Restyled 2026-04-17 to Apple
// HIG light theme so it matches the rest of the platform.

import { useState } from "react";
import { useIsMobile } from "../shared/hooks.js";

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
    } catch (e) {
      setError(e.message || (ar?"فشل تسجيل الدخول. تحقق من الاتصال وحاول مجدداً":"Login failed. Check connection and retry"));
    }
    setLoading(false);
  };

  const inputSty = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid var(--hairline)",
    background: "var(--surface-1)", color: "var(--text-primary)",
    fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s var(--ease-quart), box-shadow 0.15s var(--ease-quart)",
  };

  const labelSty = {
    fontSize: 12, color: "var(--text-secondary)",
    marginBottom: 6, display: "block", fontWeight: 500,
    letterSpacing: "-0.01em",
  };

  return (
    <div dir={ar?"rtl":"ltr"} style={{
      minHeight: "100vh",
      display: "flex", flexDirection: isMobile ? "column" : "row",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'DM Sans', 'Tajawal', 'Segoe UI', system-ui, sans-serif",
      background: "var(--bg, #F5F5F7)",
      position: "relative",
    }}>
      <style>{`
        input::placeholder { color: var(--text-tertiary); }
        input:focus {
          border-color: var(--sys-blue) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--sys-blue) 18%, transparent) !important;
        }
      `}</style>

      {/* ── Hero Side ── */}
      {!isMobile && (
        <div style={{
          flex: 1, position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "center",
          background: `
            radial-gradient(ellipse 1200px 800px at ${ar?"90%":"10%"} 20%, color-mix(in srgb, var(--sys-blue) 6%, transparent), transparent 60%),
            radial-gradient(ellipse 1000px 700px at ${ar?"10%":"90%"} 80%, color-mix(in srgb, var(--sys-indigo) 5%, transparent), transparent 60%),
            var(--bg, #F5F5F7)
          `,
        }}>
          <div style={{ position: "relative", zIndex: 1, padding: "48px 48px" }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{
                display: "inline-block", padding: "6px 16px",
                background: "color-mix(in srgb, var(--sys-blue) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--sys-blue) 22%, transparent)",
                borderRadius: 20, marginBottom: 24,
              }}>
                <span style={{ fontSize: 12, color: "var(--sys-blue)", fontWeight: 600, letterSpacing: 0.5 }}>
                  {ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <span style={{
                  fontSize: 52, fontWeight: 800, color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                  fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                }}>
                  {ar?"حصيف":"Haseef"}
                </span>
                <span style={{ width: 1, height: 32, background: "var(--hairline)" }} />
                <span style={{
                  fontSize: 13, color: "var(--text-secondary)",
                  lineHeight: 1.4, fontWeight: 400,
                }}>
                  {ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}
                </span>
              </div>
              <h1 style={{
                fontSize: 38, fontWeight: 700, color: "var(--text-primary)",
                lineHeight: 1.15, marginBottom: 14,
                letterSpacing: "-0.02em",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Tajawal', sans-serif",
              }}>
                {ar?"منصة النمذجة المالية":"Financial Modeling"}<br/>
                <span style={{ color: "var(--sys-blue)" }}>
                  {ar?"للتطوير العقاري":"for Real Estate"}
                </span>
              </h1>
              <p style={{
                fontSize: 15, color: "var(--text-secondary)",
                lineHeight: 1.65, marginBottom: 28, maxWidth: 460,
              }}>
                {ar
                  ? "صُممت للسوق السعودي. نمذجة مالية متقدمة لمشاريع التطوير العقاري بجميع أنواعها."
                  : "Built for the Saudi market. Advanced financial modeling for all types of real estate development projects."}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { icon: "📐", text: ar?"5 محركات نمذجة":"5 Engine Modules" },
                  { icon: "📊", text: ar?"50+ سنة افتراضات":"50+ Year Projections" },
                  { icon: "🤖", text: ar?"مساعد AI مدمج":"Built-in AI" },
                ].map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px",
                    background: "var(--surface-1)",
                    borderRadius: 20,
                    border: "1px solid var(--hairline)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                    <span style={{ fontSize: 13 }}>{f.icon}</span>
                    <span style={{
                      fontSize: 12, color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Auth Side ── */}
      <div style={{
        width: isMobile ? "100%" : 420,
        minWidth: isMobile ? "auto" : 380,
        flex: isMobile ? 1 : "none",
        background: "var(--surface-1)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: isMobile ? "32px 24px" : "48px 44px",
        borderInlineStart: isMobile ? "none" : (ar ? "none" : "1px solid var(--hairline)"),
        borderInlineEnd: isMobile ? "none" : (ar ? "1px solid var(--hairline)" : "none"),
        boxShadow: isMobile ? "none" : "-8px 0 32px rgba(0,0,0,0.02)",
      }}>
        <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, marginBottom: 8,
            }}>
              <span style={{
                fontSize: 34, fontWeight: 800, color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              }}>
                {ar?"حصيف":"Haseef"}
              </span>
              <span style={{ width: 1, height: 22, background: "var(--hairline)" }} />
              <span style={{
                fontSize: 11, color: "var(--text-secondary)",
                lineHeight: 1.3, fontWeight: 500, textAlign: "start",
              }}>
                {ar?"النمذجة":"Financial"}<br/>{ar?"المالية":"Modeler"}
              </span>
            </div>
            <div style={{
              fontSize: 13, color: "var(--text-secondary)",
              letterSpacing: "-0.01em",
            }}>
              {mode === "signin"
                ? (ar?"تسجيل الدخول":"Sign in to your account")
                : (ar?"إنشاء حساب جديد":"Create your account")}
            </div>
          </div>

          {pendingShare && (
            <div style={{
              background: "color-mix(in srgb, var(--sys-blue) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--sys-blue) 22%, transparent)",
              borderRadius: 12, padding: "14px 16px",
              marginBottom: 22, textAlign: "center",
            }}>
              <div style={{ fontSize: 16, marginBottom: 6 }}>📬</div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: "var(--sys-blue)", marginBottom: 4,
              }}>
                {ar?"تمت دعوتك لمشروع مشترك":"You've been invited to a shared project"}
              </div>
              <div style={{
                fontSize: 12, color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}>
                {ar
                  ? "سجّل الدخول أو أنشئ حساباً جديداً للوصول إلى المشروع"
                  : "Sign in or create an account to access the project"}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelSty}>{ar?"البريد الإلكتروني":"Email"}</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@company.com"
                style={inputSty}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoComplete="email"
              />
            </div>
            <div>
              <label style={labelSty}>{ar?"كلمة المرور":"Password"}</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={ar?"أدخل كلمة المرور":"Enter your password"}
                style={inputSty}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            {error && (
              <div style={{
                fontSize: 12.5, color: "var(--sys-red)",
                background: "color-mix(in srgb, var(--sys-red) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--sys-red) 22%, transparent)",
                padding: "10px 14px", borderRadius: 10, lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", padding: "12px 16px",
                borderRadius: 10, border: "none",
                background: loading ? "var(--surface-3)" : "var(--sys-blue)",
                color: loading ? "var(--text-tertiary)" : "#fff",
                fontSize: 15, fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                transition: "all 0.15s var(--ease-quart)",
                boxShadow: loading ? "none" : "0 1px 2px rgba(0,122,255,0.25)",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "color-mix(in srgb, var(--sys-blue) 92%, black)"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "var(--sys-blue)"; }}
            >
              {loading
                ? (ar?"جاري المعالجة…":"Loading…")
                : (mode === "signin"
                    ? (ar?"دخول":"Sign In")
                    : (ar?"إنشاء حساب":"Create Account"))}
            </button>
            <div style={{
              textAlign: "center", fontSize: 13,
              color: "var(--text-secondary)",
            }}>
              {mode === "signin" ? (
                <span>
                  {ar?"ليس لديك حساب؟":"Don't have an account?"}{" "}
                  <button onClick={() => setMode("signup")} style={{
                    color: "var(--sys-blue)", background: "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 600,
                  }}>
                    {ar?"سجّل الآن":"Sign up"}
                  </button>
                </span>
              ) : (
                <span>
                  {ar?"لديك حساب؟":"Already have an account?"}{" "}
                  <button onClick={() => setMode("signin")} style={{
                    color: "var(--sys-blue)", background: "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 600,
                  }}>
                    {ar?"دخول":"Sign in"}
                  </button>
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 32, textAlign: "center" }}>
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                padding: "6px 16px", fontSize: 11, fontWeight: 600,
                borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s var(--ease-quart)",
              }}
            >
              {lang === "en" ? "عربي" : "English"}
            </button>
          </div>
          <div style={{
            marginTop: 24, textAlign: "center",
            fontSize: 11, color: "var(--text-tertiary)",
          }}>
            {ar?"حصيف للنمذجة المالية":"Haseef Financial Modeler"}
          </div>
        </div>
      </div>
    </div>
  );
}
