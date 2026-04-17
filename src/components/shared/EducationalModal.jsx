/**
 * EducationalModal — Full-screen learning modal for educational content
 * Extracted from App.jsx during deduplication (2026-03-31)
 * Restyled 2026-04-17 — Apple HIG tokens.
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
      return <div key={i} style={{
        fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
        marginTop: i === 0 ? 0 : 18, marginBottom: 6,
        letterSpacing: "-0.01em",
      }}>{block.text}</div>;
    }
    if (block.type === "text") {
      return <div key={i} style={{
        fontSize: 12.5, color: "var(--text-secondary)",
        lineHeight: 1.75, marginBottom: 6,
      }}>{block.text}</div>;
    }
    if (block.type === "list") {
      return (
        <div key={i} style={{ marginBottom: 8 }}>
          {block.items.map((item, j) => (
            <div key={j} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              marginBottom: 5, fontSize: 12.5,
              color: "var(--text-secondary)", lineHeight: 1.65,
            }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 8, marginTop: 6, flexShrink: 0 }}>●</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (<>
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      zIndex: 9998, backdropFilter: "blur(4px)",
    }} />
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      width: isMobile ? "96vw" : 620, maxWidth: "96vw", maxHeight: "88vh",
      background: "var(--surface-1)", borderRadius: 16,
      boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
      zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden",
      direction: ar ? "rtl" : "ltr",
    }}>
      <div style={{
        padding: "18px 22px 14px",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 20 }}>📘</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}>{content.title}</div>
          <div style={{
            fontSize: 12, color: "var(--text-secondary)",
            marginTop: 3, lineHeight: 1.5,
          }}>{content.intro}</div>
        </div>
        <button onClick={onClose} style={{
          background: "var(--surface-2)", border: "none", borderRadius: 8,
          width: 34, height: 34, fontSize: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-secondary)", fontFamily: "inherit", flexShrink: 0,
          transition: "background 0.15s var(--ease-quart)",
        }}>✕</button>
      </div>
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--hairline)",
        flexShrink: 0, overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {content.tabs.map((t, i) => {
          const isActive = i === activeTab;
          return (
            <button key={t.id} onClick={() => setActiveTab(i)} style={{
              padding: isMobile ? "10px 12px" : "12px 18px",
              background: "none", border: "none",
              borderBottom: isActive ? "2.5px solid var(--sys-blue)" : "2.5px solid transparent",
              fontSize: isMobile ? 11 : 12,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--sys-blue)" : "var(--text-secondary)",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              transition: "all 0.15s var(--ease-quart)", flexShrink: 0,
              letterSpacing: "-0.01em",
            }}>
              <span style={{ marginInlineEnd: 5 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>
      <div style={{
        flex: 1, overflow: "auto",
        padding: isMobile ? "16px 18px" : "20px 24px",
      }}>
        {tab && tab.content.map(renderBlock)}
      </div>
      {content.cta && (
        <div style={{
          padding: "12px 22px",
          borderTop: "1px solid var(--hairline)",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexShrink: 0,
        }}>
          {window.__zanOpenAcademy ? (
            <button onClick={() => { onClose(); window.__zanOpenAcademy(contentKey); }} style={{
              background: "none", border: "none",
              color: "#C8A96E", fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 4,
            }}>📚 {ar ? "اقرأ المزيد في الأكاديمية" : "Read more in Academy"}</button>
          ) : <span />}
          <button onClick={onClose} style={{
            padding: "9px 28px", borderRadius: 10, border: "none",
            background: "var(--sys-blue)", color: "#fff",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s var(--ease-quart)",
            letterSpacing: "-0.01em",
            boxShadow: "0 1px 2px rgba(0,122,255,0.25)",
          }}
          onMouseEnter={e => { e.target.style.background = "color-mix(in srgb, var(--sys-blue) 92%, black)"; }}
          onMouseLeave={e => { e.target.style.background = "var(--sys-blue)"; }}
          >{content.cta}</button>
        </div>
      )}
    </div>
  </>);
}
