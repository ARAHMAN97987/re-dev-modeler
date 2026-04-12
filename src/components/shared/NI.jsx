/**
 * NI — Simple numeric input for market/table cells (no formatting, immediate onChange).
 *
 * Use NI for:
 *   - Table cells that update on every keystroke (MarketView)
 *   - Inputs where raw number display is preferred (e.g. percentage fields)
 *
 * Use SidebarInput (type="number") for:
 *   - Sidebar fields that should show formatted display (e.g. 1,500,000)
 *   - Inputs where the commit-on-blur pattern is needed
 *
 * Use the local NumIn in HotelPLModal/MarinaPLModal for:
 *   - Modal inputs with controlled local state and onBlur commit
 */
import React from "react";

const mktInputStyle = { padding: "6px 10px", border: "1px solid #e5e7ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fafbfc" };

export default function NI({ value, onChange, style: sx }) {
  return <input type="number" value={value || ""} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...mktInputStyle, ...sx }} />;
}
