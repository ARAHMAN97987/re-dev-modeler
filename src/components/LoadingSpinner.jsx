/**
 * LoadingSpinner — simple centered spinner for async loading states
 * Supports an optional label (Arabic/English)
 */
import React from "react";

export default function LoadingSpinner({ label, size = 36, fullScreen = false }) {
  const inner = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    }}>
      <div style={{
        width: size,
        height: size,
        border: `${Math.max(3, size / 10)}px solid #e5e7eb`,
        borderTop: `${Math.max(3, size / 10)}px solid #2563eb`,
        borderRadius: "50%",
        animation: "zanSpin 0.7s linear infinite",
      }} />
      {label && (
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
          {label}
        </div>
      )}
      <style>{`
        @keyframes zanSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.75)",
        zIndex: 9990,
        backdropFilter: "blur(2px)",
      }}>
        {inner}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      {inner}
    </div>
  );
}
