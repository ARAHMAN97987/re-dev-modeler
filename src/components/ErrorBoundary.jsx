/**
 * ErrorBoundary — React class component that catches render errors
 * Shows a bilingual (Arabic + English) error message with a reload button
 */
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || "";

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "32px 24px",
        textAlign: "center",
        fontFamily: "inherit",
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16,
          lineHeight: 1,
        }}>⚠️</div>

        <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
          حدث خطأ غير متوقع
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 16 }}>
          An unexpected error occurred
        </div>

        {msg && (
          <div style={{
            fontSize: 11,
            color: "#6b7280",
            background: "#f3f4f6",
            borderRadius: 6,
            padding: "8px 14px",
            marginBottom: 20,
            maxWidth: 480,
            wordBreak: "break-word",
            fontFamily: "monospace",
          }}>
            {msg}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            إعادة التحميل / Reload
          </button>
          <button
            onClick={() => this.setState({ hasError: false, error: null, info: null })}
            style={{
              padding: "10px 24px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            حاول مجدداً / Try Again
          </button>
        </div>
      </div>
    );
  }
}
