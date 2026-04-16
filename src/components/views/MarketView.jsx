// MarketView — market gap analysis & sector supply vs demand.
// Apple HIG: grouped cards, tabular numbers, status pills.
import React from "react";
import { fmt } from "../../utils/format";
import { catL } from "../../data/translations.js";
import { useIsMobile } from "../shared/hooks.js";
import { Badge, Button, Callout, Card, EmptyState, Field, Input, Textarea } from "../ui";

function NI({ value, onChange, style: sx }) {
  return (
    <Input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      size="sm"
      style={sx}
    />
  );
}

function MarketView({ project, results, lang, up }) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  if (!project) return null;
  const m = project.market || {};
  const enabled = m.enabled;

  const upM = (updates) => up((prev) => ({ ...prev, market: { ...prev.market, ...updates } }));
  const upGap = (sector, val) => up((prev) => ({ ...prev, market: { ...prev.market, gaps: { ...prev.market.gaps, [sector]: { ...prev.market.gaps[sector], gap: val } } } }));
  const upThreshold = (sector, field, val) => up((prev) => ({ ...prev, market: { ...prev.market, thresholds: { ...prev.market.thresholds, [sector]: { ...prev.market.thresholds[sector], [field]: val } } } }));
  const upConv = (field, val) => up((prev) => ({ ...prev, market: { ...prev.market, conversionFactors: { ...prev.market.conversionFactors, [field]: val } } }));

  // ────────── Disabled state ──────────
  if (!enabled) {
    return (
      <div style={{ maxWidth: 560, margin: "48px auto" }}>
        <EmptyState
          icon={<span style={{ fontSize: 38 }}>📊</span>}
          title={ar ? "مؤشرات السوق" : "Market Indicators"}
          description={
            ar
              ? "حلّل فجوة السوق وقارن مساحات مشروعك مع الطلب الفعلي. هل المشروع يغطي جزءاً معقولاً من الفجوة أم يفرط في التوريد؟"
              : "Analyze the market gap and compare your project's supply against actual demand. Is the project filling a reasonable portion of the gap, or oversupplying?"
          }
          action={
            <Button variant="primary" size="lg" onClick={() => upM({ enabled: true })}>
              {ar ? "تفعيل مؤشرات السوق" : "Enable Market Indicators"}
            </Button>
          }
        />
      </div>
    );
  }

  // ────────── Data compute ──────────
  const SECTORS = ["Retail", "Office", "Hospitality", "Residential", "Marina", "Industrial"];
  const gaps = m.gaps || {};
  const thresholds = m.thresholds || {};
  const conv = m.conversionFactors || {};
  const phaseNames = [...new Set((project.assets || []).map((a) => a.phase))];

  const getSupply = (sector, phaseFilter) => {
    const assets = (project.assets || []).filter((a) => {
      const cat = (a.category || "").toLowerCase();
      const sec = sector.toLowerCase();
      const matchCat = cat.includes(sec)
        || (sec === "retail" && (cat.includes("retail") || cat.includes("commercial")))
        || (sec === "hospitality" && (cat.includes("hotel") || cat.includes("hospitality") || cat.includes("resort")));
      return matchCat && (!phaseFilter || a.phase === phaseFilter);
    });
    if (sector === "Hospitality") return assets.reduce((s, a) => s + (a.hotelPL?.keys || 0), 0);
    if (sector === "Marina") return assets.reduce((s, a) => s + (a.marinaPL?.berths || 0), 0);
    return assets.reduce((s, a) => s + (a.gfa || 0) * ((a.efficiency || 0) / 100), 0);
  };

  const getRisk = (sector, pctOfGap) => {
    const th = thresholds[sector] || { low: 50, med: 70 };
    const pct = pctOfGap * 100;
    if (pct <= th.low) return { level: "low", tone: "success", label: ar ? "منخفض" : "Low" };
    if (pct <= th.med) return { level: "med", tone: "warning", label: ar ? "متوسط" : "Medium" };
    return { level: "high", tone: "danger", label: ar ? "مرتفع" : "High" };
  };

  const analysis = SECTORS.map((sector) => {
    const gap = gaps[sector]?.gap || 0;
    const unit = gaps[sector]?.unit || "sqm";
    const totalSupply = getSupply(sector, null);
    const pctGap = gap > 0 ? totalSupply / gap : 0;
    const risk = gap > 0 ? getRisk(sector, pctGap) : { level: "none", tone: "neutral", label: "—" };
    const phases = phaseNames.map((pn) => ({ phase: pn, supply: getSupply(sector, pn) }));
    return { sector, unit, gap, totalSupply, pctGap, risk, phases };
  }).filter((r) => r.gap > 0 || r.totalSupply > 0);

  const highRiskSectors = analysis.filter((a) => a.risk.level === "high");

  // ────────── Render ──────────
  return (
    <div style={{ maxWidth: 1040 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div
          aria-hidden="true"
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, var(--sys-blue), var(--sys-indigo))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 20,
          }}
        >📊</div>
        <div style={{ flex: 1 }}>
          <h2 className="z-h3" style={{ margin: 0 }}>{ar ? "مؤشرات السوق" : "Market Indicators"}</h2>
          <div className="z-footnote" style={{ marginTop: 2 }}>
            {ar ? "مقارنة توريد المشروع مع فجوة الطلب في السوق" : "Compare project supply against market demand gap"}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => upM({ enabled: false })}>
          {ar ? "تعطيل" : "Disable"}
        </Button>
      </div>

      {/* ① Market Gap Inputs */}
      <Card
        title={<span>① {ar ? "فجوة السوق (من دراسة السوق)" : "Market Gap (from market study)"}</span>}
        subtitle={ar ? "أدخل الفجوة المتوقعة لكل قطاع حسب سنة الأفق" : "Enter expected gap per sector at horizon year"}
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span className="z-caption" style={{ fontWeight: 600 }}>{ar ? "سنة الأفق:" : "Horizon Year:"}</span>
          <div style={{ width: 100 }}>
            <NI value={m.horizonYear || 2033} onChange={(v) => upM({ horizonYear: v })} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {SECTORS.map((sector) => (
            <div
              key={sector}
              style={{
                background: "var(--surface-input)",
                borderRadius: 10,
                padding: "10px 12px",
                border: "0.5px solid var(--border-default)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                {catL(sector, ar)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <NI value={gaps[sector]?.gap || 0} onChange={(v) => upGap(sector, v)} />
                </div>
                <span className="z-caption" style={{ minWidth: 32, color: "var(--text-tertiary)" }}>
                  {gaps[sector]?.unit || "sqm"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ② Risk Thresholds */}
      <Card
        title={<span>② {ar ? "عتبات المخاطر (% من الفجوة)" : "Risk Thresholds (% of gap)"}</span>}
        subtitle={ar ? "حدّد متى يكون التوريد منخفض/متوسط/مرتفع المخاطر" : "Define when supply is Low/Medium/High risk"}
        style={{ marginBottom: 16 }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="z-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>{ar ? "القطاع" : "Sector"}</th>
                <th style={{ textAlign: "center", background: "var(--color-success-bg)", color: "var(--color-success-text)" }}>{ar ? "منخفض ≤" : "Low ≤"}</th>
                <th style={{ textAlign: "center", background: "var(--color-warning-bg)", color: "var(--color-warning-text)" }}>{ar ? "متوسط ≤" : "Medium ≤"}</th>
                <th style={{ textAlign: "center", background: "var(--color-danger-bg)", color: "var(--color-danger-text)" }}>{ar ? "مرتفع >" : "High >"}</th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map((sector) => {
                const th2 = thresholds[sector] || { low: 50, med: 70 };
                return (
                  <tr key={sector}>
                    <td style={{ fontWeight: 600 }}>{catL(sector, ar)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 64 }}>
                          <Input type="number" value={th2.low} onChange={(e) => upThreshold(sector, "low", parseFloat(e.target.value) || 0)} size="sm" style={{ textAlign: "center" }} />
                        </div>
                        <span className="z-caption">%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 64 }}>
                          <Input type="number" value={th2.med} onChange={(e) => upThreshold(sector, "med", parseFloat(e.target.value) || 0)} size="sm" style={{ textAlign: "center" }} />
                        </div>
                        <span className="z-caption">%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", color: "var(--color-danger-text)", fontWeight: 600 }}>
                      {`> ${th2.med}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ③ Analysis Results */}
      {analysis.length > 0 ? (
        <Card
          title={<span>③ {ar ? "تحليل ملاءمة السوق" : "Market Gap Capacity Analysis"}</span>}
          style={{ marginBottom: 16 }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="z-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>{ar ? "القطاع" : "Sector"}</th>
                  <th>{ar ? "الوحدة" : "Unit"}</th>
                  <th style={{ textAlign: "right" }}>{ar ? "فجوة السوق" : "Market Gap"}</th>
                  <th style={{ textAlign: "right" }}>{ar ? "توريد المشروع" : "Project Supply"}</th>
                  <th style={{ textAlign: "center" }}>% {ar ? "من الفجوة" : "of Gap"}</th>
                  <th style={{ textAlign: "center" }}>{ar ? "المخاطر" : "Risk"}</th>
                  {phaseNames.length > 1 && phaseNames.map((pn) => (
                    <th key={pn} style={{ textAlign: "right", fontSize: 11 }}>{pn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{catL(row.sector, ar)}</td>
                    <td className="text-secondary">{row.unit}</td>
                    <td className="num" style={{ textAlign: "right" }}>{fmt(row.gap)}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{fmt(Math.round(row.totalSupply))}</td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        color: row.risk.tone === "success" ? "var(--color-success-text)"
                             : row.risk.tone === "warning" ? "var(--color-warning-text)"
                             : row.risk.tone === "danger"  ? "var(--color-danger-text)"
                             : "var(--text-tertiary)",
                      }}
                    >
                      {row.gap > 0 ? (row.pctGap * 100).toFixed(0) + "%" : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Badge tone={row.risk.tone} dot={row.risk.tone !== "neutral"}>{row.risk.label}</Badge>
                    </td>
                    {phaseNames.length > 1 && row.phases.map((ph, j) => (
                      <td key={j} className="num" style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                        {ph.supply > 0 ? fmt(Math.round(ph.supply)) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {highRiskSectors.length > 0 && (
            <Callout tone="danger" title={ar ? "⚠ تحذير: خطر فرط التوريد" : "⚠ Warning: Oversupply Risk"} style={{ marginTop: 14 }}>
              {highRiskSectors.map((s, i) => (
                <div key={i}>
                  {catL(s.sector, ar)}: {(s.pctGap * 100).toFixed(0)}% {ar ? "من الفجوة" : "of gap"} ({fmt(Math.round(s.totalSupply))} / {fmt(s.gap)} {s.unit})
                </div>
              ))}
            </Callout>
          )}
        </Card>
      ) : (
        <Callout tone="warning" style={{ marginBottom: 16 }}>
          {ar ? "أدخل فجوات السوق أعلاه لرؤية التحليل" : "Enter market gaps above to see the analysis"}
        </Callout>
      )}

      {/* ④ Conversion Factors */}
      <Card
        title={<span>④ {ar ? "معاملات التحويل" : "Conversion Factors"}</span>}
        subtitle={ar ? "لتحويل الغرف والوحدات والمراسي إلى متر مربع مكافئ" : "For converting keys/units/berths to equivalent sqm"}
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
          <Field label={ar ? "م²/غرفة فندقية" : "sqm / Hotel Key"}>
            <NI value={conv.sqmPerKey || 45} onChange={(v) => upConv("sqmPerKey", v)} />
          </Field>
          <Field label={ar ? "م²/وحدة سكنية" : "sqm / Residential Unit"}>
            <NI value={conv.sqmPerUnit || 200} onChange={(v) => upConv("sqmPerUnit", v)} />
          </Field>
          <Field label={ar ? "م²/مرسى" : "sqm / Marina Berth"}>
            <NI value={conv.sqmPerBerth || 139} onChange={(v) => upConv("sqmPerBerth", v)} />
          </Field>
        </div>
      </Card>

      {/* Notes */}
      <Card title={ar ? "ملاحظات" : "Notes"}>
        <Textarea
          value={m.notes || ""}
          onChange={(e) => upM({ notes: e.target.value })}
          placeholder={ar ? "مصدر البيانات، افتراضات، ملاحظات..." : "Data source, assumptions, notes..."}
          rows={4}
        />
      </Card>
    </div>
  );
}

export default MarketView;
