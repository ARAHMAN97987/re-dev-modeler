/**
 * InvestorsView — manages project.investors[] and project.fundManager.
 * Part of the simplification campaign (Apr 2026). Replaces the GP/LP /
 * "Developer Investment" sections in FinancingView.
 *
 * Props:
 *   - project       (object)                  current project state
 *   - updateProject (fn: partial => void)     setter that merges into project
 *   - financing     (object | null)           engine output (for live display)
 *   - lang          ("ar" | "en")
 */
import { useState } from "react";
import { useIsMobile } from "../shared/hooks.js";

const CONTRIBUTION_TYPES = [
  { value: "cash",         en: "Cash",                   ar: "نقدي" },
  { value: "devFee",       en: "Developer Fee Reinvest", ar: "إعادة استثمار أتعاب المطور" },
  { value: "landValue",    en: "Landholder Valuation",   ar: "مساهمة أرض (قيمة)" },
  { value: "landCap",      en: "Leasehold Capitalization", ar: "رسملة حق الانتفاع" },
  { value: "landPurchase", en: "Purchased Land",         ar: "شراء أرض" },
];

const ROLES = [
  { value: "developer", en: "Developer", ar: "مطور" },
  { value: "investor",  en: "Investor",  ar: "مستثمر" },
];

const fmt = (n) => {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
};

function randomId() {
  return `inv-${Math.random().toString(36).slice(2, 8)}`;
}

export default function InvestorsView({ project, updateProject, financing, lang }) {
  const ar = lang === "ar";
  const isMobile = useIsMobile();
  const investors = project.investors || [];
  const [adding, setAdding] = useState(false);

  const totalEquity = financing?.totalEquity || 0;
  const devEquity   = financing?.gpEquity || 0;
  const invEquity   = financing?.lpEquity || 0;
  const totalDebt   = financing?.totalDebt || 0;
  const totalCost   = financing?.totalProjectCost || financing?.devCostInclLand || 0;

  const setInvestors = (next) => updateProject({ investors: next });

  const addInvestor = (preset) => {
    const id = randomId();
    const base = { id, name: preset.name, role: preset.role, contribution: preset.contribution };
    setInvestors([...investors, base]);
    setAdding(false);
  };

  const updateInvestor = (id, patch) => {
    setInvestors(investors.map(i => i.id === id ? { ...i, ...patch } : i));
  };
  const updateContribution = (id, patch) => {
    setInvestors(investors.map(i =>
      i.id === id ? { ...i, contribution: { ...i.contribution, ...patch } } : i));
  };
  const removeInvestor = (id) => {
    setInvestors(investors.filter(i => i.id !== id));
  };

  const presets = [
    { label: ar ? "مستثمر نقدي" : "Cash Investor",
      name: ar ? "مستثمر" : "Investor", role: "investor",
      contribution: { type: "cash", amount: 0 } },
    { label: ar ? "مطور (نقدي)" : "Developer (Cash)",
      name: ar ? "المطور" : "Developer", role: "developer",
      contribution: { type: "cash", amount: 0 } },
    { label: ar ? "مطور (إعادة استثمار الأتعاب)" : "Developer (Dev Fee Reinvest)",
      name: ar ? "المطور" : "Developer", role: "developer",
      contribution: { type: "devFee", investPct: 100 } },
    { label: ar ? "شريك أرض (قيمة)" : "Land Partner (Valuation)",
      name: ar ? "شريك الأرض" : "Land Partner", role: "investor",
      contribution: { type: "landValue", valuation: 0, equityPct: 0 } },
    { label: ar ? "مالك حق انتفاع" : "Leasehold Holder",
      name: ar ? "مالك حق الانتفاع" : "Leasehold Holder", role: "investor",
      contribution: { type: "landCap", valuation: 0 } },
  ];

  const cardStyle = {
    background: "var(--surface-1, #FFFFFF)",
    border: "1px solid var(--hairline, rgba(0,0,0,0.08))",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 10,
  };

  // ── Header summary ──
  const Summary = () => (
    <div style={{
      ...cardStyle,
      background: "var(--surface-2, #F7F7F8)",
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
      gap: 14,
      marginBottom: 16,
    }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{ar?"إجمالي تكلفة المشروع":"Total Project Cost"}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totalCost)}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{ar?"إجمالي الملكية":"Total Equity"}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totalEquity)}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{ar?"حصة المطور":"Developer Share"}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--sys-blue, #007AFF)" }}>{fmt(devEquity)}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{ar?"حصة المستثمرين":"Investor Share"}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--sys-indigo, #5856D6)" }}>{fmt(invEquity)}</div>
      </div>
      {totalDebt > 0 && (
        <div style={{ gridColumn: "1 / -1", paddingTop: 8, borderTop: "1px solid var(--hairline)", fontSize: 12, color: "var(--text-secondary)" }}>
          + {ar?"دين":"Debt"}: <strong style={{ color: "var(--text-primary)" }}>{fmt(totalDebt)}</strong>
        </div>
      )}
    </div>
  );

  // ── Add-investor modal ──
  const AddModal = () => (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(2px)",
    }} onClick={() => setAdding(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface-1, #FFFFFF)", borderRadius: 14,
        padding: 20, width: isMobile ? "92vw" : 420, maxHeight: "86vh",
        overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>
          {ar ? "إضافة مستثمر" : "Add Investor"}
        </div>
        {presets.map((p, i) => (
          <button key={i} onClick={() => addInvestor(p)} style={{
            display: "block", width: "100%", textAlign: "start", padding: "10px 14px",
            background: "var(--surface-2, #F7F7F8)", border: "1px solid var(--hairline)",
            borderRadius: 10, marginBottom: 8, cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, color: "var(--text-primary)",
            transition: "background 0.15s",
          }} onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-3, #EEEEF1)"; }}
             onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2, #F7F7F8)"; }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setAdding(false)} style={{
          marginTop: 10, width: "100%", padding: "10px 14px",
          background: "transparent", border: "1px solid var(--hairline)",
          borderRadius: 10, cursor: "pointer", color: "var(--text-secondary)",
          fontFamily: "inherit", fontSize: 13,
        }}>
          {ar ? "إلغاء" : "Cancel"}
        </button>
      </div>
    </div>
  );

  // ── Per-investor row ──
  const InvestorRow = ({ inv }) => {
    const allocated = (financing?.perInvestorEquity || []).find(p => p.investorId === inv.id);
    const equityAmount = allocated?.amount || 0;
    const equityPct = totalEquity > 0 ? (equityAmount / totalEquity) * 100 : 0;
    const c = inv.contribution || {};

    return (
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1.5fr 1fr auto", gap: 10, alignItems: "center" }}>
          {/* Name */}
          <input
            value={inv.name || ""}
            onChange={e => updateInvestor(inv.id, { name: e.target.value })}
            placeholder={ar ? "الاسم" : "Name"}
            style={{
              padding: "6px 10px", border: "1px solid var(--hairline)",
              borderRadius: 8, background: "var(--surface-1)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
            }}
          />
          {/* Role */}
          <select
            value={inv.role || "investor"}
            onChange={e => updateInvestor(inv.id, { role: e.target.value })}
            style={{
              padding: "6px 10px", border: "1px solid var(--hairline)",
              borderRadius: 8, background: "var(--surface-1)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
            }}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{ar ? r.ar : r.en}</option>)}
          </select>
          {/* Contribution type */}
          <select
            value={c.type || "cash"}
            onChange={e => updateContribution(inv.id, { type: e.target.value })}
            style={{
              padding: "6px 10px", border: "1px solid var(--hairline)",
              borderRadius: 8, background: "var(--surface-1)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
            }}
          >
            {CONTRIBUTION_TYPES.map(t => <option key={t.value} value={t.value}>{ar ? t.ar : t.en}</option>)}
          </select>
          {/* Amount / valuation */}
          {c.type === "cash" && (
            <input type="number" value={c.amount ?? 0}
              onChange={e => updateContribution(inv.id, { amount: parseFloat(e.target.value) || 0 })}
              placeholder={ar ? "مبلغ (0=يملأ الباقي)" : "Amount (0=fill rest)"}
              style={{ padding: "6px 10px", border: "1px solid var(--hairline)",
                borderRadius: 8, background: "var(--surface-1)", fontSize: 13, fontFamily: "inherit",
                textAlign: "right", fontVariantNumeric: "tabular-nums" }} />
          )}
          {c.type === "devFee" && (
            <input type="number" value={c.investPct ?? 100}
              onChange={e => updateContribution(inv.id, { investPct: parseFloat(e.target.value) || 0 })}
              placeholder="%"
              style={{ padding: "6px 10px", border: "1px solid var(--hairline)",
                borderRadius: 8, background: "var(--surface-1)", fontSize: 13, fontFamily: "inherit",
                textAlign: "right" }} />
          )}
          {(c.type === "landValue" || c.type === "landCap" || c.type === "landPurchase") && (
            <input type="number" value={c.valuation ?? c.amount ?? 0}
              onChange={e => updateContribution(inv.id,
                c.type === "landPurchase"
                  ? { amount: parseFloat(e.target.value) || 0 }
                  : { valuation: parseFloat(e.target.value) || 0 })}
              placeholder={ar ? "قيمة" : "Valuation"}
              style={{ padding: "6px 10px", border: "1px solid var(--hairline)",
                borderRadius: 8, background: "var(--surface-1)", fontSize: 13, fontFamily: "inherit",
                textAlign: "right", fontVariantNumeric: "tabular-nums" }} />
          )}
          {/* Remove */}
          <button onClick={() => removeInvestor(inv.id)} title={ar ? "إزالة" : "Remove"} style={{
            padding: "6px 10px", background: "transparent", border: "1px solid var(--hairline)",
            borderRadius: 8, cursor: "pointer", color: "var(--sys-red, #FF3B30)",
            fontSize: 14, fontFamily: "inherit",
          }}>✕</button>
        </div>
        {/* Resulting equity line */}
        <div style={{
          marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hairline)",
          display: "flex", flexWrap: "wrap", gap: 18, fontSize: 11.5, color: "var(--text-secondary)",
        }}>
          <span>{ar?"الملكية الفعلية":"Resulting Equity"}: <strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(equityAmount)}</strong></span>
          <span>{ar?"النسبة":"Equity %"}: <strong style={{ color: "var(--text-primary)" }}>{equityPct.toFixed(2)}%</strong></span>
        </div>
      </div>
    );
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} style={{ padding: isMobile ? "12px" : "16px 20px" }}>
      {/* Banner: transition notice */}
      <div style={{
        background: "color-mix(in srgb, var(--sys-blue, #007AFF) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--sys-blue, #007AFF) 22%, transparent)",
        color: "var(--sys-blue, #007AFF)",
        padding: "8px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 14,
        lineHeight: 1.5,
      }}>
        {ar
          ? "نسخة جديدة من إدارة المستثمرين. كل من يضخ مال = مستثمر. قريباً ستحل محل إعدادات المطور والشريك في تبويب التمويل."
          : "New investor management. Everyone contributing capital is an investor. Will replace the Developer Investment / Partner Land sections in Financing soon."}
      </div>

      <Summary />

      {/* Investor list */}
      {investors.length === 0 && (
        <div style={{
          ...cardStyle, textAlign: "center",
          color: "var(--text-secondary)", padding: "24px 16px",
        }}>
          {ar ? "لم يتم إضافة مستثمرين بعد" : "No investors added yet"}
        </div>
      )}
      {investors.map(inv => <InvestorRow key={inv.id} inv={inv} />)}

      {/* Add button */}
      <button onClick={() => setAdding(true)} style={{
        marginTop: 10, padding: "10px 18px",
        background: "var(--sys-blue, #007AFF)", color: "#FFFFFF",
        border: "none", borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        transition: "all 0.15s",
      }}>
        {ar ? "+ إضافة مستثمر" : "+ Add Investor"}
      </button>

      {/* Leasehold credit hint */}
      {project.landType === "lease" && project.landCapitalize && (
        <div style={{ marginTop: 16, padding: "10px 14px",
          background: "color-mix(in srgb, var(--sys-orange, #FF9500) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--sys-orange, #FF9500) 22%, transparent)",
          borderRadius: 10, fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6,
        }}>
          💡 {ar
            ? "رسملة حق الانتفاع مُفعّلة. اختر مستثمراً ليحصل على حق الانتفاع (بنوع الحصة landCap)."
            : "Leasehold capitalization is enabled. Pick an investor to receive the leasehold credit (contribution type: landCap)."}
        </div>
      )}

      {adding && <AddModal />}
    </div>
  );
}
