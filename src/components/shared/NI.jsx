import React from "react";

const mktInputStyle = { padding: "6px 10px", border: "1px solid #e5e7ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fafbfc" };

export default function NI({ value, onChange, style: sx }) {
  return <input type="number" value={value || ""} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...mktInputStyle, ...sx }} />;
}
