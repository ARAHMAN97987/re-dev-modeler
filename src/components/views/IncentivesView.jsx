// IncentivesView — government incentives configuration + summary.
// Apple HIG: toggle-driven cards, KPI tiles, inline help.
import React, { useState, useMemo } from "react";
import { fmt, fmtM } from "../../utils/format";
import { useIsMobile } from "../shared/hooks.js";
import SharedEmptyState from "../shared/EmptyState.jsx";
import { Badge, Button, Callout, Card, Field, Input, KpiTile, SegmentedControl, Toggle } from "../ui";
import { Select as UiSelect } from "../ui/Input";

// ────────── Lightweight Tip (tooltip) ──────────
function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-block", marginInlineStart: 4 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ cursor: "help", fontSize: 11, color: "var(--text-tertiary)" }}>ⓘ</span>
      {show && (
        <div
          className="z-tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "pre-line",
            zIndex: 999,
            minWidth: 200,
            maxWidth: 320,
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

function HelpLink({ lang, onOpen, label: customLabel, contentKey }) {
  return (
    <Button variant="link" size="sm" onClick={() => onOpen && onOpen(contentKey)}>
      {customLabel || (lang === "ar" ? "اعرف أكثر" : "Learn more")}
    </Button>
  );
}

function EducationalModal({ contentKey, lang, onClose }) {
  return (
    <div className="z-modal-overlay" onClick={onClose}>
      <div className="z-modal" onClick={(e) => e.stopPropagation()}>
        <div className="z-modal-title">{contentKey}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إغلاق" : "Close"}</Button>
        </div>
      </div>
    </div>
  );
}

function IncentivesView({ project, results, incentivesResult, financing, lang, up }) {
  const _isEmpty = !project || !results;
  const isMobile = useIsMobile();
  const [eduModal, setEduModal] = useState(null);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const ar = lang === "ar";

  // ────────── Hooks (order preserved regardless of early return) ──────────
  const allPhaseNames = Object.keys(results?.phaseResults || {});
  const activePh = selectedPhases.length > 0 ? selectedPhases : allPhaseNames;
  const isFiltered = selectedPhases.length > 0 && selectedPhases.length < allPhaseNames.length;

  const phaseShare = useMemo(() => {
    if (!results || !isFiltered) return { capex: 1, land: 1 };
    const rawC = results.consolidated;
    let capexSum = 0, landSum = 0;
    activePh.forEach((pName) => {
      const pr = results.phaseResults?.[pName];
      if (!pr) return;
      capexSum += pr.totalCapex || 0;
      landSum += pr.totalLandRent || 0;
    });
    return {
      capex: rawC.totalCapex > 0 ? capexSum / rawC.totalCapex : 0,
      land:  rawC.totalLandRent > 0 ? landSum / rawC.totalLandRent : 0,
    };
  }, [isFiltered, selectedPhases, results, activePh]);

  const pIR = useMemo(() => {
    if (!incentivesResult) return null;
    if (!isFiltered) return incentivesResult;
    return {
      ...incentivesResult,
      totalIncentiveValue: (incentivesResult.totalIncentiveValue || 0) * phaseShare.capex,
      capexGrantTotal: (incentivesResult.capexGrantTotal || 0) * phaseShare.capex,
      landRentSavingTotal: (incentivesResult.landRentSavingTotal || 0) * phaseShare.land,
      feeRebateTotal: (incentivesResult.feeRebateTotal || 0) * phaseShare.capex,
    };
  }, [incentivesResult, isFiltered, phaseShare]);

  if (_isEmpty) {
    return (
      <SharedEmptyState
        icon="🏛"
        title={ar ? "أضف أصول أولاً" : "Add Assets First"}
        subtitle={ar ? "الحوافز تحتاج بيانات المشروع. أضف أصول من تبويب البرنامج." : "Incentives need project data. Add assets from the Program tab."}
      />
    );
  }

  const inc = project.incentives || {};
  const cur = project.currency || "SAR";
  const rawC = results.consolidated;
  const cTotalCapex = isFiltered
    ? activePh.reduce((s, p) => s + (results.phaseResults?.[p]?.totalCapex || 0), 0)
    : rawC.totalCapex;
  const hasPhases = allPhaseNames.length > 1;
  const togglePhase = (p) =>
    setSelectedPhases((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const upInc = (key, updates) => {
    const newInc = { ...project.incentives, [key]: { ...project.incentives[key], ...updates } };
    up({ incentives: newInc });
  };

  const addFeeItem = () => {
    const items = [...(inc.feeRebates?.items || []), { name: "", type: "rebate", amount: 0, year: 1, deferralMonths: 12 }];
    upInc("feeRebates", { items });
  };
  const updateFeeItem = (i, u) => {
    const items = [...(inc.feeRebates?.items || [])];
    items[i] = { ...items[i], ...u };
    upInc("feeRebates", { items });
  };
  const removeFeeItem = (i) => {
    upInc("feeRebates", { items: (inc.feeRebates?.items || []).filter((_, j) => j !== i) });
  };

  // ────────── Reusable IncentiveCard (Apple-style toggle card) ──────────
  const IncentiveCard = ({ titleEn, titleAr, enabled, onToggle, value, children, tip, accent }) => (
    <Card
      variant="default"
      padding={0}
      style={{
        borderColor: enabled ? "var(--border-focus)" : "var(--border-default)",
        transition: "border-color 200ms cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: enabled ? "0.5px solid var(--border-default)" : "none",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Toggle checked={!!enabled} onChange={onToggle} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: enabled ? "var(--text-primary)" : "var(--text-secondary)", letterSpacing: "-0.01em" }}>
            {ar ? titleAr : titleEn}
            {tip && <Tip text={tip} />}
          </div>
        </div>
        {enabled && value != null && (
          <div style={{ fontSize: 17, fontWeight: 700, color: accent || "var(--sys-blue)", fontVariantNumeric: "tabular-nums" }}>
            {fmtM(value)}
          </div>
        )}
      </div>
      {enabled && <div style={{ padding: "16px 18px" }}>{children}</div>}
    </Card>
  );

  // ────────── Render ──────────
  return (
    <div>
      {/* Phase filter */}
      {hasPhases && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant={selectedPhases.length === 0 ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedPhases([])}
            >
              {ar ? "كل المراحل" : "All Phases"}
            </Button>
            {allPhaseNames.map((p) => {
              const active = activePh.includes(p) && selectedPhases.length > 0;
              return (
                <Button
                  key={p}
                  variant={active ? "teal" : "secondary"}
                  size="sm"
                  onClick={() => togglePhase(p)}
                >
                  {p}
                </Button>
              );
            })}
            {isFiltered && (
              <span className="z-caption" style={{ marginInlineStart: 8, color: "var(--text-secondary)" }}>
                {ar
                  ? `حصة المراحل المختارة: ${(phaseShare.capex * 100).toFixed(0)}% من التكاليف`
                  : `Selected phases: ${(phaseShare.capex * 100).toFixed(0)}% of CAPEX`}
              </span>
            )}
          </div>
        </div>
      )}

      {hasPhases && isFiltered && (
        <Callout tone="warning" style={{ marginBottom: 14 }}>
          {ar
            ? "إعدادات الحوافز على مستوى المشروع كاملاً. الأرقام المعروضة تعكس حصة المراحل المختارة فقط"
            : "Incentive settings apply to the entire project. Numbers shown reflect the selected phases' share only"}
        </Callout>
      )}

      {/* KPI summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiTile
          label={ar ? "إجمالي الحوافز" : "Total Incentives"}
          value={fmtM(pIR?.totalIncentiveValue || 0)}
          sublabel={cur}
          tone="positive"
        />
        <KpiTile
          label={ar ? "منحة CAPEX" : "CAPEX Grant"}
          value={fmtM(pIR?.capexGrantTotal || 0)}
          sublabel={inc.capexGrant?.enabled ? (ar ? "مفعّل" : "On") : (ar ? "معطّل" : "Off")}
          tone={inc.capexGrant?.enabled ? "info" : "neutral"}
        />
        <KpiTile
          label={ar ? "وفر إيجار الأرض" : "Land Rent Savings"}
          value={fmtM(pIR?.landRentSavingTotal || 0)}
          sublabel={inc.landRentRebate?.enabled ? (ar ? "مفعّل" : "On") : (ar ? "معطّل" : "Off")}
          tone={inc.landRentRebate?.enabled ? "warning" : "neutral"}
        />
        <KpiTile
          label={ar ? "دعم التمويل" : "Finance Support"}
          value={fmtM(financing?.interestSubsidyTotal || 0)}
          sublabel={inc.financeSupport?.enabled ? (ar ? "مفعّل" : "On") : (ar ? "معطّل" : "Off")}
          tone={inc.financeSupport?.enabled ? "info" : "neutral"}
        />
        <KpiTile
          label={ar ? "استرداد رسوم" : "Fee Rebates"}
          value={fmtM(pIR?.feeRebateTotal || 0)}
          sublabel={inc.feeRebates?.enabled ? (ar ? "مفعّل" : "On") : (ar ? "معطّل" : "Off")}
          tone={inc.feeRebates?.enabled ? "info" : "neutral"}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <HelpLink
          contentKey="govIncentives"
          lang={lang}
          onOpen={setEduModal}
          label={ar ? "اعرف أكثر عن أنواع الحوافز" : "Learn about incentive types"}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ① CAPEX Grant */}
        <IncentiveCard
          titleEn="CAPEX Grant (Capital Subsidy)"
          titleAr="دعم رأسمالي (منحة CAPEX)"
          enabled={inc.capexGrant?.enabled}
          onToggle={() => upInc("capexGrant", { enabled: !inc.capexGrant?.enabled })}
          value={pIR?.capexGrantTotal}
          accent="var(--sys-blue)"
          tip={"منحة حكومية تغطي جزءاً من CAPEX الإنشائي. تخفض التكلفة الفعلية وترفع IRR\nGovernment grant covering part of construction CAPEX. Lowers effective cost and improves IRR"}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={ar ? "نسبة المنحة %" : "Grant %"}>
              <Input type="number" size="sm" value={inc.capexGrant?.grantPct || 25} onChange={(e) => upInc("capexGrant", { grantPct: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label={ar ? "الحد الأقصى (ريال)" : "Max Cap (SAR)"}>
              <Input type="number" size="sm" value={inc.capexGrant?.maxCap || 50000000} onChange={(e) => upInc("capexGrant", { maxCap: parseFloat(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label={ar ? "توقيت الاستلام" : "Timing"}>
            <UiSelect size="sm" value={inc.capexGrant?.timing || "construction"} onChange={(e) => upInc("capexGrant", { timing: e.target.value })}>
              <option value="construction">{ar ? "خلال البناء" : "During Construction"}</option>
              <option value="completion">{ar ? "عند الإنجاز" : "At Completion"}</option>
            </UiSelect>
          </Field>
          <div style={{ fontSize: 12, color: "var(--color-info-text)", padding: 10, background: "var(--color-info-bg)", borderRadius: 8, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
            {ar ? "القيمة المحسوبة" : "Calculated"}:{" "}
            <strong>{fmt(pIR?.capexGrantTotal || 0)} {cur}</strong> = min({inc.capexGrant?.grantPct}% × {fmtM(cTotalCapex)}, {fmt(inc.capexGrant?.maxCap)})
          </div>
        </IncentiveCard>

        {/* ② Finance Support */}
        <IncentiveCard
          titleEn="Finance Support (Interest Subsidy / Soft Loan)"
          titleAr="دعم التمويل (تحمل فوائد / قرض حسن)"
          enabled={inc.financeSupport?.enabled}
          onToggle={() => upInc("financeSupport", { enabled: !inc.financeSupport?.enabled })}
          value={financing?.interestSubsidyTotal}
          accent="var(--sys-purple)"
          tip={"الجهة الحكومية تتحمل جزءاً من تكلفة التمويل أو تقدم قرضاً بدون ربح. يخفض معدل التمويل الفعلي ويحسن DSCR\nGovernment pays part of financing cost or provides a zero-profit loan. Lowers effective rate and improves DSCR"}
        >
          <Field label={ar ? "نوع الدعم" : "Support Type"}>
            <SegmentedControl
              size="sm"
              value={inc.financeSupport?.subType || "interestSubsidy"}
              onChange={(v) => upInc("financeSupport", { subType: v })}
              options={[
                { value: "interestSubsidy", label: ar ? "تحمل فوائد" : "Interest Subsidy" },
                { value: "softLoan",         label: ar ? "قرض حسن"    : "Soft Loan" },
              ]}
            />
          </Field>
          {inc.financeSupport?.subType === "softLoan" ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
              <Field label={ar ? "المبلغ (ريال)" : "Amount (SAR)"}>
                <Input type="number" size="sm" value={inc.financeSupport?.softLoanAmount || 0} onChange={(e) => upInc("financeSupport", { softLoanAmount: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label={ar ? "المدة (سنوات)" : "Tenor (yrs)"}>
                <Input type="number" size="sm" value={inc.financeSupport?.softLoanTenor || 10} onChange={(e) => upInc("financeSupport", { softLoanTenor: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label={ar ? "سماح (سنوات)" : "Grace (yrs)"}>
                <Input type="number" size="sm" value={inc.financeSupport?.softLoanGrace || 3} onChange={(e) => upInc("financeSupport", { softLoanGrace: parseFloat(e.target.value) || 0 })} />
              </Field>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
              <Field label={ar ? "نسبة التحمل %" : "Subsidy %"}>
                <Input type="number" size="sm" value={inc.financeSupport?.subsidyPct || 50} onChange={(e) => upInc("financeSupport", { subsidyPct: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label={ar ? "المدة (سنوات)" : "Duration (yrs)"}>
                <Input type="number" size="sm" value={inc.financeSupport?.subsidyYears || 5} onChange={(e) => upInc("financeSupport", { subsidyYears: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label={ar ? "البداية" : "Start"}>
                <UiSelect size="sm" value={inc.financeSupport?.subsidyStart || "operation"} onChange={(e) => upInc("financeSupport", { subsidyStart: e.target.value })}>
                  <option value="drawdown">{ar ? "من السحب" : "From Drawdown"}</option>
                  <option value="operation">{ar ? "من التشغيل" : "From Operation"}</option>
                </UiSelect>
              </Field>
            </div>
          )}
        </IncentiveCard>

        {/* ③ Land Rent Rebate */}
        <IncentiveCard
          titleEn="Land Rent Rebate (Exemption/Discount)"
          titleAr="إعفاء/خصم إيجار الأرض"
          enabled={inc.landRentRebate?.enabled}
          onToggle={() => upInc("landRentRebate", { enabled: !inc.landRentRebate?.enabled })}
          value={pIR?.landRentSavingTotal}
          accent="var(--sys-orange)"
          tip={"تخفيض أو إعفاء إيجار الأرض خلال البناء أو السنوات الأولى. يحسن التدفقات النقدية المبكرة\nReducing or waiving land rent during construction or early years. Improves early cash flows"}
        >
          {project.landType !== "lease" ? (
            <div style={{ fontSize: 13, color: "var(--text-negative)", fontWeight: 500 }}>
              {ar ? "غير متاح - الأرض ليست مؤجرة" : "Not applicable — land is not leased"}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, letterSpacing: "0.01em" }}>
                {ar ? "فترة البناء" : "CONSTRUCTION PERIOD"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={ar ? "نسبة الإعفاء %" : "Rebate %"}>
                  <Input type="number" size="sm" value={inc.landRentRebate?.constrRebatePct || 100} onChange={(e) => upInc("landRentRebate", { constrRebatePct: parseFloat(e.target.value) || 0 })} />
                </Field>
                <Field
                  label={ar ? "المدة (سنوات)" : "Duration (yrs)"}
                  hint={ar ? "0 = تلقائي من البناء" : "0 = auto from construction"}
                >
                  <Input type="number" size="sm" value={inc.landRentRebate?.constrRebateYears || 0} onChange={(e) => upInc("landRentRebate", { constrRebateYears: parseFloat(e.target.value) || 0 })} />
                </Field>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginTop: 14, marginBottom: 8, letterSpacing: "0.01em" }}>
                {ar ? "فترة ما بعد الافتتاح" : "POST-OPENING PERIOD"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label={ar ? "نسبة الخصم %" : "Discount %"}>
                  <Input type="number" size="sm" value={inc.landRentRebate?.operRebatePct || 50} onChange={(e) => upInc("landRentRebate", { operRebatePct: parseFloat(e.target.value) || 0 })} />
                </Field>
                <Field label={ar ? "المدة (سنوات)" : "Duration (yrs)"}>
                  <Input type="number" size="sm" value={inc.landRentRebate?.operRebateYears || 3} onChange={(e) => upInc("landRentRebate", { operRebateYears: parseFloat(e.target.value) || 0 })} />
                </Field>
              </div>
            </>
          )}
        </IncentiveCard>

        {/* ④ Fee/Tax Rebates */}
        <IncentiveCard
          titleEn="Fee/Tax Rebates & Deferrals"
          titleAr="استرداد/تأجيل رسوم وضرائب"
          enabled={inc.feeRebates?.enabled}
          onToggle={() => upInc("feeRebates", { enabled: !inc.feeRebates?.enabled })}
          value={pIR?.feeRebateTotal}
          accent="var(--sys-teal)"
          tip={"استرداد أو تأجيل رسوم بلدية وتصاريح ومدفوعات نظامية. حتى التأجيل له منفعة زمنية تُحسب بمعدل خصم 10%\nRebates or deferrals of municipal charges, permits, and regulatory fees. Even deferrals have time-value benefit at 10% discount"}
        >
          {(inc.feeRebates?.items || []).map((item, i) => (
            <div
              key={i}
              style={{
                background: "var(--surface-input)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                border: "0.5px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    value={item.name || ""}
                    onChange={(e) => updateFeeItem(i, { name: e.target.value })}
                    placeholder={ar ? "اسم الرسم" : "Fee name"}
                    size="sm"
                  />
                </div>
                <Button variant="destructive" size="sm" onClick={() => removeFeeItem(i)}>✕</Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 8 }}>
                <Field label={ar ? "النوع" : "Type"}>
                  <UiSelect size="sm" value={item.type || "rebate"} onChange={(e) => updateFeeItem(i, { type: e.target.value })}>
                    <option value="rebate">{ar ? "استرداد" : "Rebate"}</option>
                    <option value="deferral">{ar ? "تأجيل" : "Deferral"}</option>
                  </UiSelect>
                </Field>
                <Field label={ar ? "المبلغ" : "Amount"}>
                  <Input type="number" size="sm" value={item.amount || 0} onChange={(e) => updateFeeItem(i, { amount: parseFloat(e.target.value) || 0 })} />
                </Field>
                <Field label={ar ? "السنة" : "Year"}>
                  <Input type="number" size="sm" value={item.year || 1} onChange={(e) => updateFeeItem(i, { year: parseFloat(e.target.value) || 0 })} />
                </Field>
                {item.type === "deferral" && (
                  <Field label={ar ? "تأجيل (شهر)" : "Defer (mo)"}>
                    <Input type="number" size="sm" value={item.deferralMonths || 12} onChange={(e) => updateFeeItem(i, { deferralMonths: parseFloat(e.target.value) || 0 })} />
                  </Field>
                )}
              </div>
            </div>
          ))}
          <Button variant="tinted" block onClick={addFeeItem}>
            + {ar ? "إضافة رسم" : "Add Fee Item"}
          </Button>
        </IncentiveCard>
      </div>

      {eduModal && <EducationalModal contentKey={eduModal} lang={lang} onClose={() => setEduModal(null)} />}
    </div>
  );
}

export default IncentivesView;
