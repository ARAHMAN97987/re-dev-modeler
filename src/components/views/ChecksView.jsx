// ChecksView — model validation results.
// Apple HIG: grouped list + status pills + inline Fix buttons.
import React from "react";
import { Badge, Button, Callout, Card } from "../ui";

function ChecksView({ checks, t, lang, onFix }) {
  const ar = lang === "ar";
  const allPass = checks.every(c => c.pass);
  const failCount = checks.filter(c => !c.pass).length;
  const passCount = checks.length - failCount;
  const cats = [...new Set(checks.map(c => c.cat || "General"))];
  const catLabels = {
    T0: ar ? "T0: فحص المدخلات" : "T0: Input Validation",
    T1: ar ? "T1: محرك المشروع" : "T1: Project Engine",
    T2: ar ? "T2: التمويل" : "T2: Financing",
    T3: ar ? "T3: حافز الأداء" : "T3: Waterfall",
    T4: ar ? "T4: الحوافز" : "T4: Incentives",
    T5: ar ? "T5: التكامل" : "T5: Integration",
    General: "General",
  };
  const catFixTab = { T0: "assets", T1: "cashflow", T2: "financing", T3: "waterfall", T4: "incentives", T5: "dashboard" };
  const getFixTab = (c) => {
    if (c.name?.includes("Efficiency") || c.name?.includes("Cost/sqm") || c.name?.includes("GFA")) return "assets";
    if (c.name?.includes("Tenor") || c.name?.includes("Grace") || c.name?.includes("LTV") || c.name?.includes("DSCR")) return "financing";
    if (c.name?.includes("Exit") || c.name?.includes("Horizon")) return "dashboard";
    if (c.name?.includes("GP") || c.name?.includes("LP") || c.name?.includes("Carry") || c.name?.includes("Catch")) return "financing";
    return catFixTab[c.cat] || null;
  };

  return (
    <div style={{ padding: "0 4px" }}>
      {/* ────────── Header ────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 className="z-h3" style={{ margin: 0 }}>{t.modelChecks}</h2>
        <Badge tone={allPass ? "success" : "danger"} dot>
          {allPass ? t.allPass : `${failCount} ${t.errorFound}`}
        </Badge>
        <span className="z-footnote" style={{ color: "var(--text-secondary)" }}>
          {checks.length} {ar ? "اختبار" : "tests"} · {passCount} {ar ? "ناجح" : "passed"}
        </span>
      </div>

      {/* ────────── Failures summary ────────── */}
      {failCount > 0 && (
        <Callout
          tone="danger"
          title={ar ? `${failCount} فحوصات فاشلة تحتاج مراجعة` : `${failCount} failed checks require attention`}
          style={{ marginBottom: 20 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {checks.filter(c => !c.pass).map((c, i) => {
              const fixTab = getFixTab(c);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  <span aria-hidden="true" style={{ fontWeight: 700, fontSize: 11 }}>✗</span>
                  <span style={{ flex: 1 }}>
                    <strong style={{ fontWeight: 600 }}>[{c.cat}]</strong> {c.name}
                    {c.detail && <span style={{ color: "var(--text-tertiary)" }}> — {c.detail}</span>}
                  </span>
                  {fixTab && onFix && (
                    <Button variant="tinted" size="xs" onClick={() => onFix(fixTab)}>
                      {ar ? "إصلاح ←" : "Fix →"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Callout>
      )}

      {/* ────────── Grouped by category ────────── */}
      {cats.map(cat => {
        const catChecks = checks.filter(c => (c.cat || "General") === cat);
        const catPass = catChecks.every(c => c.pass);
        const catPassCount = catChecks.filter(c => c.pass).length;

        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingInline: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: catPass ? "var(--text-positive)" : "var(--text-negative)" }}>
                {catPass ? "✓" : "✗"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                {catLabels[cat] || cat}
              </span>
              <span className="z-caption" style={{ color: "var(--text-tertiary)" }}>
                {catPassCount}/{catChecks.length}
              </span>
            </div>

            <Card padding={0} variant="default">
              <div>
                {catChecks.map((c, i) => {
                  const fixTab = !c.pass ? getFixTab(c) : null;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(180px, 25%) 64px 1fr auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        borderBottom: i < catChecks.length - 1 ? "0.5px solid var(--surface-separator)" : "none",
                        background: c.pass ? "transparent" : "var(--color-danger-bg)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                      <div style={{ textAlign: "center" }}>
                        <Badge tone={c.pass ? "success" : "danger"}>
                          {c.pass ? (ar ? "ناجح" : "PASS") : (ar ? "فاشل" : "FAIL")}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                        {c.desc}
                        {c.detail && <span style={{ color: "var(--text-tertiary)" }}> · {c.detail}</span>}
                      </div>
                      <div style={{ minWidth: 68, textAlign: "end" }}>
                        {fixTab && onFix ? (
                          <Button variant="tinted" size="xs" onClick={() => onFix(fixTab)}>
                            {ar ? "إصلاح ←" : "Fix →"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

export default ChecksView;
