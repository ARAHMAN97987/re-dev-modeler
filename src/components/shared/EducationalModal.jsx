/**
 * EducationalModal — Full-screen learning modal for educational content
 * Extracted from App.jsx during deduplication (2026-03-31)
 */
import { useState, useEffect } from "react";
import { useIsMobile } from "./hooks";
import { EDUCATIONAL_CONTENT } from "../../data/educational-content.js";

export default function EducationalModal({ contentKey, lang, onClose }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const content = EDUCATIONAL_CONTENT[contentKey]?.[ar ? "ar" : "en"];
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!content) return null;

  const tab = content.tabs[activeTab];

  const renderBlock = (block, i) => {
    if (block.type === "heading") {
      return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: "#1a1d23", marginTop: i === 0 ? 0 : 18, marginBottom: 6 }}>{block.text}</div>;
    }
    if (block.type === "text") {
      return <div key={i} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.75, marginBottom: 6 }}>{block.text}</div>;
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 8 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 12.5, color: "#374151", lineHeight: 1.65 }}>
              <span style={{ color: "#9ca3af", fontSize: 8, marginTop: 6, flexShrink: 0 }}>●</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (<>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(2px)" }} />
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      width: isMobile ? "96vw" : 620, maxWidth: "96vw", maxHeight: "88vh",
      background: "#fff", borderRadius: 16,
      boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
      zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
      direction: ar ? "rtl" : "ltr",
    }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e5e7ec", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>📘</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1d23" }}>{content.title}</div>
          <div style={{ fontSize: 12, color: "#6b7080", marginTop: 3, lineHeight: 1.5 }}>{content.intro}</div>
        </div>
        <button onClick={onClose} style={{ background: "#f0f1f5", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7080", fontFamily: "inherit", flexShrink: 0 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7ec", flexShrink: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {content.tabs.map((t, i) => {
          const isActive = i === activeTab;
          return (
            <button key={t.id} onClick={() => setActiveTab(i)} style={{
              padding: isMobile ? "10px 12px" : "12px 18px",
              background: "none", border: "none", borderBottom: isActive ? "2.5px solid #2563eb" : "2.5px solid transparent",
              fontSize: isMobile ? 11 : 12, fontWeight: isActive ? 700 : 500,
              color: isActive ? "#2563eb" : "#6b7080",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "all 0.15s", flexShrink: 0,
            }}>
              <span style={{ marginInlineEnd: 5 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 18px" : "20px 24px" }}>
        {tab && tab.content.map(renderBlock)}
      </div>
      {content.cta && (
        <div style={{ padding: "12px 22px", borderTop: "1px solid #e5e7ec", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          {window.__zanOpenAcademy ? (
            <button onClick={() => { onClose(); window.__zanOpenAcademy(contentKey); }} style={{
              background: "none", border: "none", color: "#C8A96E", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
            }}>📚 {ar ? "اقرأ المزيد في الأكاديمية" : "Read more in Academy"}</button>
          ) : <span />}
          <button onClick={onClose} style={{
            padding: "9px 28px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.target.style.background = "#1d4ed8"; }}
          onMouseLeave={e => { e.target.style.background = "#2563eb"; }}
          >{content.cta}</button>
        </div>
      )}
    </div>
  </>);
}
