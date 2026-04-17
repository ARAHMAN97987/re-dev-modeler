// ResultsView.jsx — IncomeFundResultsView (sole live export, used by App.jsx).
// Restyled 2026-04-17 with Apple HIG primitives. No engine/data-logic changes —
// purely presentational swap of inline styles for Card / Badge / Select / KpiTile.
//
// Retained contract:
//   import { IncomeFundResultsView } from "./ResultsView";
//   Props: { project, results, financing, waterfall, phaseFinancings,
//            incentivesResult, t, lang, up, globalExpand }

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { useIsMobile } from "../shared/hooks";
import { fmt, fmtPct, fmtM } from "../../utils/format";
import { tblStyle, thSt, tdSt, tdN } from "../shared/styles";
import { Badge, Card, Select } from "../ui";

function IncomeFundResultsView({
  project, results, financing, waterfall, globalExpand, lang,
}) {
  const isMobile = useIsMobile();
  const ar = lang === "ar";
  const [showYrs, setShowYrs] = useState(15);
  const [showChart, setShowChart] = useState(true);
  const [secOpen, setSecOpen] = useState({ s1: true, s2: true, s3: true });

  useEffect(() => {
    if (globalExpand > 0) {
      const expand = globalExpand % 2 === 1;
      setShowChart(expand);
      setSecOpen(expand ? {} : { s1: true, s2: true, s3: true });
    }
  }, [globalExpand]);

  if (!financing || !waterfall) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        {ar ? "اضبط إعدادات التمويل" : "Configure financing settings"}
      </div>
    );
  }

  const w = waterfall;
  const f = financing;
  const c = results.consolidated;
  const h = project.horizon;
  const sy = results.startYear;
  const years = Array.from({ length: Math.min(showYrs, h) }, (_, i) => i);
  const targetYield = (project.targetYield || 8) / 100;
  const fundLife = project.fundLife || 5;
  const distFreq =
    { annual: ar ? "سنوي" : "Annual", semi: ar ? "نصف سنوي" : "Semi-annual", quarterly: ar ? "ربع سنوي" : "Quarterly" }[
      project.distributionFrequency || "semi"
    ] || "";

  // ── Small helpers local to this view (avoid touching engine data shapes) ──
  const KR = ({ l, v, c: clr, bold: b }) => (
    <>
      <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{l}</span>
      <span
        style={{
          textAlign: "right",
          fontWeight: b ? 600 : 500,
          fontSize: 12,
          color: clr || "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v}
      </span>
    </>
  );
  const SecHd = ({ text }) => (
    <div
      style={{
        gridColumn: "1/-1",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
        paddingTop: 8,
        borderTop: "1px solid var(--hairline)",
        marginTop: 4,
      }}
    >
      {text}
    </div>
  );

  // Distribution yield chart data
  const chartData = years.map(y => ({
    year: sy + y,
    yield: (w.distributionYield?.[y] || 0) * 100,
    target: targetYield * 100,
    nav: (w.navEstimate?.[y] || 0) / 1e6,
  }));

  const CFRow = ({ label, values, total, bold, color, negate }) => {
    const st = bold ? { fontWeight: 600, background: "var(--surface-2)" } : {};
    const nc = (v) => {
      if (color) return color;
      return v < 0 ? "var(--sys-red)" : v > 0 ? "var(--text-primary)" : "var(--text-tertiary)";
    };
    return (
      <tr style={st}>
        <td
          style={{
            ...tdSt,
            position: "sticky",
            left: 0,
            background: bold ? "var(--surface-2)" : "var(--surface-1)",
            zIndex: 1,
            fontWeight: bold ? 600 : 500,
            minWidth: isMobile ? 120 : 200,
          }}
        >
          {label}
        </td>
        <td style={{ ...tdN, fontWeight: 600, color: nc(negate ? -(total || 0) : total || 0) }}>
          {total !== null && total !== undefined ? fmt(total) : ""}
        </td>
        {years.map((y) => {
          const v = values?.[y] || 0;
          return (
            <td key={y} style={{ ...tdN, color: nc(negate ? -v : v) }}>
              {v === 0 ? "—" : fmt(v)}
            </td>
          );
        })}
      </tr>
    );
  };

  // Last stable index for NAV estimate
  const lastStableIdx = Math.min(h - 1, (f.constrEnd || 0) + 5);
  const navVal = w.navEstimate?.[lastStableIdx] || 0;
  const debtVal = f.debtBalClose?.[lastStableIdx] || 0;

  return (
    <div>
      {/* ═══ INCOME FUND HEADER ═══ */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(52,199,89,0.12), rgba(52,199,89,0.04))",
          borderRadius: "var(--radius-lg)",
          padding: "18px 20px",
          marginBottom: 16,
          border: "1px solid rgba(52,199,89,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--sys-green), var(--sys-teal))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(52,199,89,0.28)",
            }}
          >
            💰
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {ar ? "صندوق مدر للدخل" : "Income Fund"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              {distFreq} · {fundLife} {ar ? "سنوات" : "years"} · {ar ? "مستهدف" : "Target"} {(targetYield * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        {/* KPI badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge tone={w.avgDistYield >= targetYield ? "success" : "warning"} dot>
            {ar ? "عائد فعلي" : "Actual Yield"}{" "}
            <strong style={{ marginInlineStart: 4 }}>
              {w.avgDistYield ? (w.avgDistYield * 100).toFixed(1) + "%" : "—"}
            </strong>
          </Badge>
          <Badge tone="info">
            DPI <strong style={{ marginInlineStart: 4 }}>{w.lpDPI ? w.lpDPI.toFixed(2) + "x" : "—"}</strong>
          </Badge>
          <Badge tone="info">
            {ar ? "تراكمي" : "Cumulative"}{" "}
            <strong style={{ marginInlineStart: 4 }}>{fmtM(w.cumDistributions?.[h - 1] || 0)}</strong>
          </Badge>
          <Badge tone="danger">
            {ar ? "رسوم" : "Fees"} <strong style={{ marginInlineStart: 4 }}>{fmtM(w.totalFees)}</strong>
          </Badge>
          {w.lpIRR !== null && (
            <Badge tone="neutral">
              IRR <strong style={{ marginInlineStart: 4 }}>{fmtPct(w.lpIRR * 100)}</strong>
            </Badge>
          )}
        </div>
      </div>

      {/* ═══ KPI DETAIL CARDS ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Distribution Performance */}
        <Card style={{ borderTop: "3px solid var(--sys-green)" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--sys-green)",
              marginBottom: 10,
              letterSpacing: "-0.01em",
            }}
          >
            {ar ? "أداء التوزيعات" : "Distribution Performance"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            <KR l={ar ? "العائد المستهدف" : "Target Yield"} v={(targetYield * 100).toFixed(1) + "%"} c="var(--text-secondary)" />
            <KR
              l={ar ? "العائد الفعلي (متوسط)" : "Actual Yield (avg)"}
              v={w.avgDistYield ? (w.avgDistYield * 100).toFixed(1) + "%" : "—"}
              c={w.avgDistYield >= targetYield ? "var(--sys-green)" : "var(--sys-orange)"}
              bold
            />
            <SecHd text={ar ? "توزيعات المستثمر" : "INVESTOR DISTRIBUTIONS"} />
            <KR l={ar ? "إجمالي التوزيعات" : "Total Distributions"} v={fmtM(w.lpTotalDist)} c="var(--sys-green)" bold />
            <KR l={ar ? "إجمالي المساهمة" : "Total Invested"} v={fmtM(w.lpTotalCalled)} />
            {w.lpIRR !== null && <KR l="IRR" v={fmtPct(w.lpIRR * 100)} c="var(--text-primary)" bold />}
          </div>
        </Card>

        {/* Fund Structure */}
        <Card style={{ borderTop: "3px solid var(--sys-blue)" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--sys-blue)",
              marginBottom: 10,
              letterSpacing: "-0.01em",
            }}
          >
            {ar ? "هيكل الصندوق" : "Fund Structure"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            <KR l={ar ? "حجم الصندوق" : "Fund Size"} v={fmtM(f.devCostInclLand)} bold />
            <KR l={ar ? "الملكية" : "Equity"} v={fmtM(f.totalEquity)} c="var(--sys-blue)" />
            {f.totalDebt > 0 && <KR l={ar ? "الدين" : "Debt"} v={fmtM(f.totalDebt)} c="var(--sys-red)" />}
            {f.totalDebt > 0 && <KR l="LTV" v={fmtPct((f.totalDebt / f.devCostInclLand) * 100)} />}
            <SecHd text={ar ? "الرسوم" : "FEES"} />
            <KR
              l={ar ? "رسوم/ملكية" : "Fees/Equity"}
              v={f.totalEquity > 0 ? fmtPct((w.totalFees / f.totalEquity) * 100) : "—"}
              c="var(--sys-red)"
            />
          </div>
        </Card>

        {/* NAV Estimate */}
        <Card style={{ borderTop: "3px solid var(--sys-orange)" }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--sys-orange)",
              marginBottom: 10,
              letterSpacing: "-0.01em",
            }}
          >
            {ar ? "تقدير القيمة" : "NAV Estimate"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            <KR l={ar ? "قيمة الأصول" : "Asset Value"} v={fmtM(navVal)} c="var(--sys-orange)" bold />
            {debtVal > 0 && <KR l={ar ? "(-) الدين" : "(-) Debt"} v={fmtM(debtVal)} c="var(--sys-red)" />}
            <KR
              l={ar ? "صافي القيمة (NAV)" : "Net Asset Value"}
              v={fmtM(navVal - debtVal)}
              c={navVal - debtVal > 0 ? "var(--sys-green)" : "var(--sys-red)"}
              bold
            />
            <KR
              l={ar ? "NAV / ملكية" : "NAV / Equity"}
              v={f.totalEquity > 0 ? ((navVal - debtVal) / f.totalEquity).toFixed(2) + "x" : "—"}
              c={navVal - debtVal > f.totalEquity ? "var(--sys-green)" : "var(--sys-red)"}
            />
          </div>
        </Card>
      </div>

      {/* ═══ DISTRIBUTION YIELD CHART ═══ */}
      {showChart && chartData.length > 2 && (
        <Card style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 10,
              letterSpacing: "-0.01em",
            }}
          >
            {ar ? "عائد التوزيعات السنوي" : "Annual Distribution Yield"}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="yieldBG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--sys-green)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--sys-green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)" }} unit="%" domain={[0, "auto"]} />
              <Tooltip formatter={(v) => v.toFixed(1) + "%"} />
              <ReferenceLine
                y={targetYield * 100}
                stroke="var(--sys-orange)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `${(targetYield * 100).toFixed(0)}% ${ar ? "مستهدف" : "target"}`,
                  position: "right",
                  fontSize: 9,
                  fill: "var(--sys-orange)",
                }}
              />
              <Area
                type="monotone"
                dataKey="yield"
                stroke="var(--sys-green)"
                strokeWidth={2.5}
                fill="url(#yieldBG)"
                name={ar ? "عائد التوزيعات" : "Dist. Yield"}
                dot={{ fill: "var(--sys-green)", r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ═══ DISTRIBUTION SCHEDULE TABLE ═══ */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            flex: 1,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {ar ? "جدول التوزيعات" : "Distribution Schedule"}
        </div>
        <Select
          value={showYrs}
          onChange={(e) => setShowYrs(parseInt(e.target.value))}
          style={{ width: 120 }}
        >
          {[10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n} {ar ? "سنة" : "yrs"}
            </option>
          ))}
        </Select>
      </div>
      <Card padding={0} style={{ overflow: "hidden" }}>
        <div
          className="table-wrap"
          style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
        >
          <table style={{ ...tblStyle, fontSize: 12 }}>
            <thead>
              <tr>
                <th
                  style={{
                    ...thSt,
                    position: "sticky",
                    left: 0,
                    background: "var(--surface-2)",
                    zIndex: 2,
                    minWidth: isMobile ? 120 : 200,
                  }}
                >
                  {ar ? "البند" : "Line Item"}
                </th>
                <th style={{ ...thSt, textAlign: "right", minWidth: 85 }}>
                  {ar ? "الإجمالي" : "Total"}
                </th>
                {years.map((y) => (
                  <th key={y} style={{ ...thSt, textAlign: "right", minWidth: 78 }}>
                    {ar ? "س" : "Yr"} {y + 1}
                    <br />
                    <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>
                      {sy + y}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Income */}
              <CFRow label={ar ? "الدخل التشغيلي" : "Operating Income"} values={c.income} total={c.totalIncome} color="var(--sys-green)" />
              <CFRow
                label={ar ? "(-) إيجار الأرض" : "(-) Land Rent"}
                values={c.landRent}
                total={c.landRent.reduce((a, b) => a + b, 0)}
                negate
                color="var(--sys-red)"
              />
              <CFRow
                label={ar ? "(-) الرسوم" : "(-) Total Fees"}
                values={w.fees}
                total={w.totalFees}
                negate
                color="var(--sys-red)"
              />
              {f.totalDebt > 0 && (
                <CFRow
                  label={ar ? "(-) خدمة الدين" : "(-) Debt Service"}
                  values={f.debtService}
                  total={f.debtService.reduce((a, b) => a + b, 0)}
                  negate
                  color="var(--sys-red)"
                />
              )}
              <CFRow
                label={ar ? "= النقد المتاح للتوزيع" : "= Cash Available"}
                values={w.cashAvail}
                total={w.cashAvail.reduce((a, b) => a + b, 0)}
                bold
                color="var(--sys-green)"
              />

              {/* Distributions section header */}
              <tr>
                <td
                  colSpan={years.length + 2}
                  style={{
                    padding: "8px 12px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--sys-green)",
                    background: "rgba(52,199,89,0.08)",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    borderTop: "1px solid rgba(52,199,89,0.35)",
                  }}
                >
                  {ar ? "التوزيعات" : "DISTRIBUTIONS"}
                </td>
              </tr>
              <CFRow
                label={ar ? "توزيعات المستثمر" : "Investor Distributions"}
                values={w.lpDist}
                total={w.lpTotalDist}
                color="var(--sys-indigo)"
                bold
              />
              <CFRow
                label={ar ? "توزيعات المطور" : "Developer Distributions"}
                values={w.gpDist}
                total={w.gpTotalDist}
                color="var(--sys-blue)"
              />

              {/* Yield row */}
              {w.distributionYield && (
                <tr style={{ background: "rgba(52,199,89,0.06)" }}>
                  <td
                    style={{
                      ...tdSt,
                      position: "sticky",
                      left: 0,
                      background: "rgba(52,199,89,0.06)",
                      zIndex: 1,
                      fontWeight: 700,
                      color: "var(--sys-green)",
                      fontSize: 12,
                    }}
                  >
                    {ar ? "عائد التوزيعات %" : "Distribution Yield %"}
                  </td>
                  <td style={{ ...tdN, fontWeight: 700, color: "var(--sys-green)" }}>
                    {w.avgDistYield ? (w.avgDistYield * 100).toFixed(1) + "%" : ""}
                  </td>
                  {years.map((y) => {
                    const v = (w.distributionYield[y] || 0) * 100;
                    const ok = v >= targetYield * 100;
                    return (
                      <td
                        key={y}
                        style={{
                          ...tdN,
                          fontWeight: 700,
                          color: v > 0 ? (ok ? "var(--sys-green)" : "var(--sys-orange)") : "var(--text-quaternary)",
                          background: v > 0
                            ? (ok ? "rgba(52,199,89,0.08)" : "rgba(255,149,0,0.08)")
                            : "transparent",
                        }}
                      >
                        {v > 0 ? v.toFixed(1) + "%" : "—"}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Cumulative */}
              {w.cumDistributions && (
                <tr style={{ background: "rgba(52,199,89,0.04)" }}>
                  <td
                    style={{
                      ...tdSt,
                      position: "sticky",
                      left: 0,
                      background: "rgba(52,199,89,0.04)",
                      zIndex: 1,
                      fontWeight: 600,
                      fontSize: 11,
                      color: "var(--sys-green)",
                    }}
                  >
                    {ar ? "↳ تراكمي" : "↳ Cumulative"}
                  </td>
                  <td style={tdN}></td>
                  {years.map((y) => (
                    <td
                      key={y}
                      style={{
                        ...tdN,
                        fontWeight: 600,
                        fontSize: 11,
                        color: "var(--sys-green)",
                      }}
                    >
                      {(w.cumDistributions[y] || 0) > 0 ? fmtM(w.cumDistributions[y]) : "—"}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export { IncomeFundResultsView };
