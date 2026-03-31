/**
 * HelpLink — Reusable inline clickable trigger for educational content
 * Extracted from App.jsx during deduplication (2026-03-31)
 */
export default function HelpLink({ contentKey, lang, onOpen, label: customLabel }) {
  const ar = lang === "ar";
  const label = customLabel || (ar ? "ما الفرق؟" : "What's the difference?");
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onOpen(contentKey); }}
      style={{
        fontSize: 11, color: "#2563eb", textDecoration: "underline",
        textDecorationStyle: "dotted", textUnderlineOffset: 3,
        cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
        userSelect: "none", transition: "color 0.15s",
      }}
      onMouseEnter={e => { e.target.style.color = "#1d4ed8"; }}
      onMouseLeave={e => { e.target.style.color = "#2563eb"; }}
    >
      {label}
    </span>
  );
}
