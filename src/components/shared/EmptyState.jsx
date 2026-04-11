/**
 * EmptyState — reusable empty/zero-data placeholder.
 * Use in place of ad-hoc inline empty divs so the visual language stays
 * consistent across views.
 */

export default function EmptyState({ icon = "📭", title, subtitle, action }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center",
      background: "rgba(46,196,182,0.03)",
      border: "1px dashed rgba(46,196,182,0.2)",
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>{icon}</div>
      {title && (
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1d23", marginBottom: 6 }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 12, color: "#6b7080", maxWidth: 360, lineHeight: 1.6 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
