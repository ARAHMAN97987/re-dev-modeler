// Extracted from App.jsx lines 11470-11706
import { useState } from "react";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { catL } from "../../data/translations.js";

const btnS = { border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" };
const btnPrim = { ...btnS, background: "#2563eb", color: "#fff", fontWeight: 600 };
const tblStyle = { width: "100%", borderCollapse: "collapse" };
const thSt = { padding: "7px 8px", textAlign: "start", fontSize: 10, fontWeight: 600, color: "#6b7080", background: "#f8f9fb", borderBottom: "1px solid #e5e7ec", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.3 };
const tdSt = { padding: "5px 8px", borderBottom: "1px solid #f0f1f5", fontSize: 12, whiteSpace: "nowrap" };
const mktInputStyle = { padding: "6px 10px", border: "1px solid #e5e7ec", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fafbfc" };

function NI({ value, onChange, style: sx }) {
  return <input type="number" value={value||""} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...mktInputStyle, ...sx }} />;
}

function useIsMobile(breakpoint = 768) {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => setW(window.innerWidth));
  }
  return w < breakpoint;
}

function MarketView({ project, results, lang, up }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  if (!project) return null;
  const m = project.market || {};
  const enabled = m.enabled;

  const upM = (updates) => {
    up(prev => ({ ...prev, market: { ...prev.market, ...updates } }));
  };
  const upGap = (sector, val) => {
    up(prev => ({ ...prev, market: { ...prev.market, gaps: { ...prev.market.gaps, [sector]: { ...prev.market.gaps[sector], gap: val } } } }));
  };
  const upThreshold = (sector, field, val) => {
    up(prev => ({ ...prev, market: { ...prev.market, thresholds: { ...prev.market.thresholds, [sector]: { ...prev.market.thresholds[sector], [field]: val } } } }));
  };
  const upConv = (field, val) => {
    up(prev => ({ ...prev, market: { ...prev.market, conversionFactors: { ...prev.market.conversionFactors, [field]: val } } }));
  };

  if (!enabled) {
    return (
      <div style={{ maxWidth: 700, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1d23", marginBottom: 8 }}>{ar ? "مؤشرات السوق" : "Market Indicators"}</div>
        <div style={{ fontSize: 13, color: "#6b7080", marginBottom: 24, maxWidth: 450, margin: "0 auto 24px" }}>
          {ar ? "حلل فجوة السوق وقارن مساحات مشروعك مع الطلب الفعلي. هل المشروع يغطي جزء معقول من الفجوة أم يفرط في التوريد؟" : "Analyze the market gap and compare your project's supply against actual demand. Is the project filling a reasonable portion of the gap, or oversupplying?"}
        </div>
        <button onClick={() => upM({ enabled: true })} style={{ ...btnPrim, padding: "12px 28px", fontSize: 14 }}>
          {ar ? "تفعيل مؤشرات السوق" : "Enable Market Indicators"}
        </button>
      </div>
    );
  }

  // ── Read project supply per sector ──
  const SECTORS = ["Retail", "Office", "Hospitality", "Residential", "Marina", "Industrial"];
  const gaps = m.gaps || {};
  const thresholds = m.thresholds || {};
  const conv = m.conversionFactors || {};
  const phaseNames = [...new Set((project.assets || []).map(a => a.phase))];

  // Calculate project supply per sector per phase
  const getSupply = (sector, phaseFilter) => {
    const assets = (project.assets || []).filter(a => {
      const cat = (a.category || "").toLowerCase();
      const sec = sector.toLowerCase();
      const matchCat = cat.includes(sec) || (sec === "retail" && (cat.includes("retail") || cat.includes("commercial"))) || (sec === "hospitality" && (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")));
      return matchCat && (!phaseFilter || a.phase === phaseFilter);
    });
    if (sector === "Hospitality") {
      return assets.reduce((s, a) => s + (a.hotelPL?.keys || 0), 0);
    }
    if (sector === "Marina") {
      return assets.reduce((s, a) => s + (a.marinaPL?.berths || 0), 0);
    }
    return assets.reduce((s, a) => s + (a.gfa || 0) * ((a.efficiency || 0) / 100), 0);
  };

  // Risk assessment
  const getRisk = (sector, pctOfGap) => {
    const th = thresholds[sector] || { low: 50, med: 70 };
    const pct = pctOfGap * 100;
    if (pct <= th.low) return { level: "low", color: "#16a34a", bg: "#f0fdf4", label: ar ? "منخفض" : "Low" };
    if (pct <= th.med) return { level: "med", color: "#eab308", bg: "#fefce8", label: ar ? "متوسط" : "Medium" };
    return { level: "high", color: "#ef4444", bg: "#fef2f2", label: ar ? "مرتفع" : "High" };
  };

  // Build analysis table
  const analysis = SECTORS.map(sector => {
    const gap = gaps[sector]?.gap || 0;
    const unit = gaps[sector]?.unit || "sqm";
    const totalSupply = getSupply(sector, null);
    const pctGap = gap > 0 ? totalSupply / gap : 0;
    const risk = gap > 0 ? getRisk(sector, pctGap) : { level: "none", color: "#9ca3af", bg: "#f8f9fb", label: "—" };
    const phases = phaseNames.map(pn => {
      const phSupply = getSupply(sector, pn);
      return { phase: pn, supply: phSupply };
    });
    return { sector, unit, gap, totalSupply, pctGap, risk, phases };
  }).filter(r => r.gap > 0 || r.totalSupply > 0);

  // Warnings for sidebar
  const highRiskSectors = analysis.filter(a => a.risk.level === "high");

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>📊</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{ar ? "مؤشرات السوق" : "Market Indicators"}</div>
          <div style={{ fontSize: 11, color: "#6b7080" }}>{ar ? "مقارنة توريد المشروع مع فجوة الطلب في السوق" : "Compare project supply against market demand gap"}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => upM({ enabled: false })} style={{ ...btnS, background: "#fef2f2", color: "#ef4444", padding: "6px 14px", fontSize: 10, border: "1px solid #fecaca" }}>{ar ? "تعطيل" : "Disable"}</button>
      </div>

      {/* ── Section 1: Market Gap Inputs ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "① فجوة السوق (من دراسة السوق)" : "① Market Gap (from market study)"}</div>
        <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 12 }}>{ar ? "أدخل الفجوة المتوقعة لكل قطاع حسب سنة الأفق" : "Enter expected gap per sector at horizon year"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#6b7080", fontWeight: 500 }}>{ar ? "سنة الأفق:" : "Horizon Year:"}</span>
          <NI value={m.horizonYear || 2033} onChange={v => upM({ horizonYear: v })} style={{ width: 80 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {SECTORS.map(sector => (
            <div key={sector} style={{ background: "#f8f9fb", borderRadius: 8, padding: "10px 12px", border: "1px solid #e5e7ec" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1d23", marginBottom: 4 }}>{catL(sector, ar)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NI value={gaps[sector]?.gap || 0} onChange={v => upGap(sector, v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: "#9ca3af", minWidth: 30 }}>{gaps[sector]?.unit || "sqm"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Risk Thresholds ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "② عتبات المخاطر (% من الفجوة)" : "② Risk Thresholds (% of gap)"}</div>
        <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 12 }}>{ar ? "حدّد متى يكون التوريد منخفض/متوسط/مرتفع المخاطر" : "Define when supply is Low/Medium/High risk"}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...tblStyle, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={thSt}>{ar ? "القطاع" : "Sector"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#f0fdf4" }}>{ar ? "منخفض ≤" : "Low ≤"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#fefce8" }}>{ar ? "متوسط ≤" : "Medium ≤"}</th>
                <th style={{ ...thSt, textAlign: "center", background: "#fef2f2" }}>{ar ? "مرتفع >" : "High >"}</th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map(sector => {
                const th2 = thresholds[sector] || { low: 50, med: 70 };
                return (
                  <tr key={sector}>
                    <td style={{ ...tdSt, fontWeight: 500 }}>{catL(sector, ar)}</td>
                    <td style={{ ...tdSt, textAlign: "center" }}><NI value={th2.low} onChange={v => upThreshold(sector, "low", v)} style={{ width: 60, textAlign: "center" }} /> %</td>
                    <td style={{ ...tdSt, textAlign: "center" }}><NI value={th2.med} onChange={v => upThreshold(sector, "med", v)} style={{ width: 60, textAlign: "center" }} /> %</td>
                    <td style={{ ...tdSt, textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{`> ${th2.med}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Analysis Results ── */}
      {analysis.length > 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{ar ? "③ تحليل ملاءمة السوق" : "③ Market Gap Capacity Analysis"}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tblStyle, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={thSt}>{ar ? "القطاع" : "Sector"}</th>
                  <th style={thSt}>{ar ? "الوحدة" : "Unit"}</th>
                  <th style={{ ...thSt, textAlign: "right" }}>{ar ? "فجوة السوق" : "Market Gap"}</th>
                  <th style={{ ...thSt, textAlign: "right" }}>{ar ? "توريد المشروع" : "Project Supply"}</th>
                  <th style={{ ...thSt, textAlign: "center" }}>% {ar ? "من الفجوة" : "of Gap"}</th>
                  <th style={{ ...thSt, textAlign: "center" }}>{ar ? "المخاطر" : "Risk"}</th>
                  {phaseNames.length > 1 && phaseNames.map(pn => (
                    <th key={pn} style={{ ...thSt, textAlign: "right", fontSize: 9 }}>{pn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ ...tdSt, fontWeight: 600 }}>{catL(row.sector, ar)}</td>
                    <td style={{ ...tdSt, color: "#6b7080" }}>{row.unit}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(row.gap)}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(Math.round(row.totalSupply))}</td>
                    <td style={{ ...tdSt, textAlign: "center", fontWeight: 700, color: row.risk.color }}>{row.gap > 0 ? (row.pctGap * 100).toFixed(0) + "%" : "—"}</td>
                    <td style={{ ...tdSt, textAlign: "center" }}>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: row.risk.bg, color: row.risk.color, fontWeight: 700 }}>{row.risk.label}</span>
                    </td>
                    {phaseNames.length > 1 && row.phases.map((ph, j) => (
                      <td key={j} style={{ ...tdSt, textAlign: "right", fontSize: 10, color: "#6b7080" }}>{ph.supply > 0 ? fmt(Math.round(ph.supply)) : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {highRiskSectors.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>{ar ? "⚠ تحذير: خطر فرط التوريد" : "⚠ Warning: Oversupply Risk"}</div>
              {highRiskSectors.map((s, i) => (
                <div key={i} style={{ fontSize: 10, color: "#991b1b" }}>
                  {catL(s.sector, ar)}: {(s.pctGap * 100).toFixed(0)}% {ar ? "من الفجوة" : "of gap"} ({fmt(Math.round(s.totalSupply))} / {fmt(s.gap)} {s.unit})
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#fefce8", borderRadius: 10, border: "1px solid #fde68a", padding: "20px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#92400e" }}>{ar ? "أدخل فجوات السوق أعلاه لرؤية التحليل" : "Enter market gaps above to see the analysis"}</div>
        </div>
      )}

      {/* ── Conversion Factors ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ar ? "④ معاملات التحويل" : "④ Conversion Factors"}</div>
        <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 12 }}>{ar ? "لتحويل الغرف والوحدات والمراسي إلى متر مربع مكافئ" : "For converting keys/units/berths to equivalent sqm"}</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{ar ? "م²/غرفة فندقية" : "sqm / Hotel Key"}</div>
            <NI value={conv.sqmPerKey || 45} onChange={v => upConv("sqmPerKey", v)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{ar ? "م²/وحدة سكنية" : "sqm / Residential Unit"}</div>
            <NI value={conv.sqmPerUnit || 200} onChange={v => upConv("sqmPerUnit", v)} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6b7080", marginBottom: 4 }}>{ar ? "م²/مرسى" : "sqm / Marina Berth"}</div>
            <NI value={conv.sqmPerBerth || 139} onChange={v => upConv("sqmPerBerth", v)} />
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7ec", padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{ar ? "ملاحظات" : "Notes"}</div>
        <textarea value={m.notes || ""} onChange={e => upM({ notes: e.target.value })} placeholder={ar ? "مصدر البيانات، افتراضات، ملاحظات..." : "Data source, assumptions, notes..."} style={{ width: "100%", minHeight: 60, padding: "10px 12px", border: "1px solid #e5e7ec", borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

export default MarketView;
