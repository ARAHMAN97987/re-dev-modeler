/**
 * Haseef Smart Reviewer (المراجع الذكي)
 * 121 rules validating inputs + outputs against Saudi RE market benchmarks.
 * READ-ONLY: never modifies project data, engine calculations, or defaults.
 *
 * Exports:
 *   COST_BENCHMARKS     — 29 construction cost benchmarks (SAR/m² GFA)
 *   matchCostBenchmark  — maps asset → benchmark ID
 *   RULES               — 121 validation rules
 *   runAllRules          — (project, results, financing, waterfall) → { alerts, summary }
 */

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTION COST BENCHMARKS (SAR/m² GFA)
// Sources: AECOM 2025, Compass 2024, JLL 2024, Currie & Brown 2024, Colliers 2021
// ═══════════════════════════════════════════════════════════════
export const COST_BENCHMARKS = [
  { id:'COST-01', category:'Residential', subtype:'Low-rise / Villa Standard', low:3400, high:5625, sources:'AECOM 2025, Compass 2024' },
  { id:'COST-02', category:'Residential', subtype:'Villa Mid-Market', low:4000, high:9000, sources:'AECOM 2025, Compass 2024, JLL 2024, C&B 2024' },
  { id:'COST-03', category:'Residential', subtype:'Villa Upper/Premium/Branded', low:5200, high:12000, sources:'Compass 2024, C&B 2024' },
  { id:'COST-04', category:'Residential', subtype:'Apartment Standard', low:4500, high:5625, sources:'AECOM 2025, Compass 2024' },
  { id:'COST-05', category:'Residential', subtype:'Apartment Mid-Market / Medium-rise', low:4875, high:7500, sources:'AECOM 2025, Compass 2024, C&B 2024' },
  { id:'COST-06', category:'Residential', subtype:'Apartment Premium / High-rise', low:6500, high:11250, sources:'AECOM 2025, Compass 2024, JLL 2024, C&B 2024' },
  { id:'COST-07', category:'Office', subtype:'Low-rise (Shell & Core)', low:3000, high:7000, sources:'AECOM 2025, Compass 2024, C&B 2024' },
  { id:'COST-08', category:'Office', subtype:'Medium-rise (Shell & Core)', low:4875, high:8000, sources:'AECOM 2025, Compass 2024, JLL 2024, C&B 2024' },
  { id:'COST-09', category:'Office', subtype:'High-rise (Shell & Core)', low:6000, high:12375, sources:'AECOM 2025, Compass 2024, C&B 2024' },
  { id:'COST-10', category:'Office', subtype:'Fit-out Basic', low:3750, high:6000, sources:'AECOM 2025, C&B 2024' },
  { id:'COST-11', category:'Office', subtype:'Fit-out Medium', low:5625, high:8625, sources:'AECOM 2025, C&B 2024' },
  { id:'COST-12', category:'Office', subtype:'Fit-out High', low:7500, high:11250, sources:'AECOM 2025, C&B 2024' },
  { id:'COST-13', category:'Retail', subtype:'Community / Strip', low:4500, high:6750, sources:'AECOM 2025, JLL 2024, C&B 2024' },
  { id:'COST-14', category:'Retail', subtype:'Regional Mall', low:5300, high:8250, sources:'AECOM 2025, JLL 2024, C&B 2024' },
  { id:'COST-15', category:'Retail', subtype:'Super Regional Mall', low:6200, high:10125, sources:'AECOM 2025, C&B 2024' },
  { id:'COST-16', category:'Retail', subtype:'F&B / Restaurant', low:7000, high:13000, sources:'Compass 2024' },
  { id:'COST-17', category:'Retail', subtype:'FEC (Entertainment)', low:9000, high:13000, sources:'Compass 2024' },
  { id:'COST-18', category:'Hospitality', subtype:'Budget / 3-star', low:4954, high:11500, sources:'AECOM 2025, Compass 2024, C&B 2024, Colliers 2021' },
  { id:'COST-19', category:'Hospitality', subtype:'Mid-market / 4-star', low:6685, high:13250, sources:'AECOM 2025, Compass 2024, JLL 2024, C&B 2024, Colliers 2021' },
  { id:'COST-20', category:'Hospitality', subtype:'Up-market / 5-star', low:8476, high:18000, sources:'AECOM 2025, Compass 2024, JLL 2024, C&B 2024, Colliers 2021' },
  { id:'COST-21', category:'Hospitality', subtype:'Resort', low:14000, high:24000, sources:'AECOM 2025, JLL 2024, C&B 2024' },
  { id:'COST-22', category:'Industrial', subtype:'Light Industrial', low:2900, high:4500, sources:'AECOM 2025, JLL 2024' },
  { id:'COST-23', category:'Industrial', subtype:'Heavy Duty / Factory', low:4500, high:6750, sources:'AECOM 2025' },
  { id:'COST-24', category:'Industrial', subtype:'Logistics Warehouse', low:6500, high:8900, sources:'JLL 2024' },
  { id:'COST-25', category:'Parking', subtype:'On Grade / Surface', low:500, high:1200, sources:'Compass 2024' },
  { id:'COST-26', category:'Parking', subtype:'Above Ground / Multi-storey', low:2200, high:4125, sources:'AECOM 2025, Compass 2024, JLL 2024' },
  { id:'COST-27', category:'Parking', subtype:'Basement', low:2900, high:4875, sources:'AECOM 2025, Compass 2024, JLL 2024' },
  { id:'COST-28', category:'Education', subtype:'Schools (Primary/Secondary)', low:5250, high:10000, sources:'AECOM 2025, Compass 2024, JLL 2024, C&B 2024' },
  { id:'COST-29', category:'Healthcare', subtype:'District Hospital', low:8625, high:13100, sources:'AECOM 2025, C&B 2024' },
];

// ═══════════════════════════════════════════════════════════════
// BENCHMARK MATCHING
// ═══════════════════════════════════════════════════════════════
export function matchCostBenchmark(asset) {
  const cat = (asset.category || '').toLowerCase();
  const name = (asset.name || asset.assetName || '').toLowerCase();
  const gfa = asset.gfa || 0;
  const footprint = asset.footprint || 1;
  const floors = footprint > 0 ? gfa / footprint : 1;
  if (cat === 'hospitality' || cat.includes('hotel') || cat.includes('resort') || (asset.revType === 'Operating' && (name.includes('hotel') || name.includes('فندق') || name.includes('resort') || name.includes('منتجع')))) {
    if (name.includes('resort') || name.includes('منتجع')) return 'COST-21';
    if (name.includes('5') || name.includes('خمس') || name.includes('luxury') || name.includes('فاخر')) return 'COST-20';
    if (name.includes('3') || name.includes('budget') || name.includes('اقتصادي')) return 'COST-18';
    return 'COST-19';
  }
  if (cat === 'retail' || cat.includes('تجاري')) {
    if (name.includes('mall') || name.includes('مول') || name.includes('مجمع')) {
      if (gfa > 80000) return 'COST-15';
      if (gfa > 20000) return 'COST-14';
      return 'COST-13';
    }
    if (name.includes('f&b') || name.includes('restaurant') || name.includes('مطعم') || name.includes('cafe') || name.includes('مقهى')) return 'COST-16';
    if (name.includes('entertainment') || name.includes('fec') || name.includes('ترفيه')) return 'COST-17';
    return 'COST-13';
  }
  if (cat === 'office' || cat.includes('مكاتب') || cat.includes('مكتب')) {
    if (floors > 15) return 'COST-09';
    if (floors > 5) return 'COST-08';
    return 'COST-07';
  }
  if (cat === 'residential' || cat === 'flexible' || cat.includes('سكني')) {
    if (name.includes('villa') || name.includes('فيلا') || name.includes('فلل')) {
      if (name.includes('premium') || name.includes('branded') || name.includes('فاخر')) return 'COST-03';
      return 'COST-02';
    }
    if (floors > 10) return 'COST-06';
    if (floors > 4) return 'COST-05';
    return 'COST-04';
  }
  if (cat === 'marina' || name.includes('marina') || name.includes('مارينا') || name.includes('yacht') || name.includes('يخت')) return 'COST-21';
  if (cat === 'utilities' || cat === 'infrastructure' || name.includes('parking') || name.includes('مواقف')) return 'COST-26';
  if (cat === 'cultural' || cat === 'amenity') return 'COST-13';
  if (cat === 'industrial' || cat.includes('صناعي')) {
    if (name.includes('logistics') || name.includes('warehouse') || name.includes('مستودع')) return 'COST-24';
    if (name.includes('heavy') || name.includes('ثقيل')) return 'COST-23';
    return 'COST-22';
  }
  if (cat === 'open space') return 'COST-25';
  return null;
}

// ═══════════════════════════════════════════════════════════════
// RULES (121 total)
// ═══════════════════════════════════════════════════════════════
// severity: 'critical' | 'error' | 'warning' | 'info'
// scope: 'asset' | 'project' | 'financing' | 'fund' | 'output' | 'cross'

const ASSET_RULES = [
  // --- Occupancy ---
  { id:'OCC-01', field:'stabilizedOcc', scope:'asset', assetFilter:a=>['hospitality'].includes((a.category||'').toLowerCase())||a.revType==='Operating', condition:v=>v>85, severity:'warning', ar:'إشغال فندقي > 85% متفائل. المعدل في السعودية: 55-75%', en:'Hotel occupancy > 85% optimistic. Saudi avg: 55-75%' },
  { id:'OCC-02', field:'rampUpYears', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase().includes('hospitality')||a.revType==='Operating', condition:v=>v<2, severity:'warning', ar:'فنادق جديدة تحتاج 2-4 سنوات للوصول للإشغال المستقر', en:'New hotels need 2-4 years to reach stabilized occupancy' },
  { id:'OCC-03', field:'stabilizedOcc', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase()==='retail', condition:v=>v>95, severity:'warning', ar:'إشغال تجاري > 95% غير واقعي. المعتاد: 80-92%', en:'Retail occupancy > 95% unrealistic. Typical: 80-92%' },
  { id:'OCC-04', field:'stabilizedOcc', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase()==='office', condition:v=>v>92, severity:'warning', ar:'إشغال مكاتب > 92% متفائل. المعتاد: 75-90%', en:'Office occupancy > 92% optimistic. Typical: 75-90%' },
  { id:'OCC-05', field:'stabilizedOcc', scope:'asset', condition:v=>v>0&&v<50, severity:'warning', ar:'إشغال أقل من 50% - جدوى ضعيفة', en:'Occupancy below 50% - weak viability' },
  { id:'OCC-06', field:'stabilizedOcc', scope:'asset', condition:v=>v<=0, severity:'error', ar:'الإشغال يجب أن يكون أكبر من صفر', en:'Occupancy must be > 0' },
  { id:'OCC-07', field:'stabilizedOcc', scope:'asset', condition:v=>v>100, severity:'error', ar:'الإشغال لا يمكن أن يتجاوز 100%', en:'Occupancy cannot exceed 100%' },
  // --- Lease Rate ---
  { id:'RENT-01', field:'leaseRate', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase()==='retail'&&a.revType==='Lease', condition:v=>v>0&&(v<500||v>4000), severity:'warning', ar:'إيجار تجاري خارج النطاق (500-4,000 ر.س/م²/سنة)', en:'Retail rate outside range (SAR 500-4,000/m²/yr)' },
  { id:'RENT-02', field:'leaseRate', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase()==='office'&&a.revType==='Lease', condition:v=>v>0&&(v<400||v>2500), severity:'warning', ar:'إيجار مكاتب خارج النطاق (400-2,500 ر.س/م²/سنة)', en:'Office rate outside range (SAR 400-2,500/m²/yr)' },
  { id:'RENT-03', field:'leaseRate', scope:'asset', assetFilter:a=>['residential','flexible'].includes((a.category||'').toLowerCase())&&a.revType==='Lease', condition:v=>v>0&&(v<300||v>2000), severity:'warning', ar:'إيجار سكني خارج النطاق (300-2,000 ر.س/م²/سنة)', en:'Residential rate outside range (SAR 300-2,000/m²/yr)' },
  { id:'RENT-04', field:'leaseRate', scope:'asset', assetFilter:a=>a.revType==='Lease'&&(a.gfa||0)>0&&(a.efficiency||0)>0, condition:v=>v<=0, severity:'error', ar:'يجب تحديد إيجار للأصول التأجيرية', en:'Lease rate required for lease assets' },
  // --- Escalation ---
  { id:'ESC-01', field:'escalation', scope:'asset', condition:v=>v>5, severity:'warning', ar:'زيادة سنوية > 5% أعلى بكثير من التضخم (2-3%)', en:'Escalation > 5% well above inflation (2-3%)' },
  { id:'ESC-02', field:'escalation', scope:'asset', condition:v=>v>3&&v<=5, severity:'info', ar:'زيادة سنوية > 3% - تأكد من دعم العقود', en:'Escalation > 3% - ensure contracts support this' },
  { id:'ESC-03', field:'escalation', scope:'asset', condition:v=>v<0, severity:'warning', ar:'زيادة سالبة - هل هذا مقصود؟', en:'Negative escalation - intentional?' },
  // --- Duration ---
  { id:'DUR-01', field:'constrDuration', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase().includes('hospitality'), condition:v=>v>0&&v<24, severity:'warning', ar:'مدة بناء فندق < 24 شهر قصيرة جداً', en:'Hotel construction < 24 months very short' },
  { id:'DUR-02', field:'constrDuration', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase()==='retail'&&(a.gfa||0)>20000, condition:v=>v>0&&v<18, severity:'warning', ar:'مدة بناء مول < 18 شهر قصيرة', en:'Mall construction < 18 months short' },
  { id:'DUR-03', field:'constrDuration', scope:'asset', condition:v=>v>60, severity:'warning', ar:'مدة > 5 سنوات طويلة جداً', en:'Duration > 5 years very long' },
  { id:'DUR-04', field:'constrDuration', scope:'asset', condition:v=>v<=0, severity:'error', ar:'مدة البناء يجب أن تكون أكبر من صفر', en:'Duration must be > 0' },
  { id:'DUR-05', field:'constrDuration', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase().includes('hospitality'), condition:v=>v>48, severity:'info', ar:'مدة بناء فندق > 48 شهر - تأكد من المبرر', en:'Hotel construction > 48 months - verify justification' },
  // --- Area/Efficiency ---
  { id:'AREA-01', field:'efficiency', scope:'asset', condition:v=>v>100, severity:'error', ar:'الكفاءة لا تتجاوز 100%', en:'Efficiency cannot exceed 100%' },
  { id:'AREA-02', field:'efficiency', scope:'asset', assetFilter:a=>a.revType==='Lease'&&(a.gfa||0)>0, condition:v=>v>0&&v<50, severity:'warning', ar:'كفاءة < 50% منخفضة جداً', en:'Efficiency < 50% very low' },
  { id:'AREA-03', field:'footprint', scope:'asset', condition:(v,a)=>v>(a.plotArea||Infinity), severity:'error', ar:'البصمة أكبر من القطعة', en:'Footprint exceeds plot area' },
  { id:'AREA-04', field:'gfa', scope:'asset', condition:(v,a)=>(a.plotArea||0)>0&&v/(a.plotArea)>15, severity:'warning', ar:'FAR > 15 - تأكد من التنظيم', en:'FAR > 15 - verify zoning' },
  { id:'AREA-05', field:'gfa', scope:'asset', assetFilter:a=>(a.category||'').toLowerCase()!=='open space', condition:v=>v<=0, severity:'error', ar:'مساحة البناء = صفر', en:'GFA is zero' },
];

const PROJECT_RULES = [
  // --- Soft Cost & Contingency ---
  { id:'SC-01', field:'softCostPct', scope:'project', condition:v=>v<5&&v>=0, severity:'warning', ar:'تكاليف لينة < 5% منخفضة. المعتاد: 8-15%', en:'Soft costs < 5% low. Typical: 8-15%' },
  { id:'SC-02', field:'softCostPct', scope:'project', condition:v=>v>20, severity:'warning', ar:'تكاليف لينة > 20% مرتفعة', en:'Soft costs > 20% high' },
  { id:'SC-03', field:'contingencyPct', scope:'project', condition:v=>v<3&&v>=0, severity:'warning', ar:'احتياطي < 3% محفوف بالمخاطر', en:'Contingency < 3% risky' },
  { id:'SC-04', field:'contingencyPct', scope:'project', condition:v=>v>15, severity:'info', ar:'احتياطي > 15% محافظ', en:'Contingency > 15% conservative' },
  { id:'SC-05', field:'softCostPct', scope:'project', condition:(v,p)=>(v+(p.contingencyPct||0))>30, severity:'warning', ar:'إجمالي التكاليف اللينة والطوارئ > 30%', en:'Total soft + contingency > 30%' },
  // --- Land ---
  { id:'LAND-01', field:'landRentAnnual', scope:'project', condition:(v,p)=>(p.landArea||0)>0&&v/(p.landArea)>100, severity:'warning', ar:'إيجار أرض > 100 ر.س/م²/سنة مرتفع', en:'Land rent > SAR 100/m²/yr high' },
  { id:'LAND-02', field:'landRentGrace', scope:'project', condition:(v,p)=>{const maxC=Math.max(...(p.assets||[]).map(a=>Math.ceil((a.constrDuration||24)/12)));return v<maxC;}, severity:'warning', ar:'السماح أقصر من البناء - إيجار أرض أثناء البناء', en:'Grace < construction - rent during build' },
  { id:'LAND-03', field:'landRentEscalation', scope:'project', condition:v=>v>10, severity:'warning', ar:'زيادة إيجار الأرض > 10% مرتفعة جداً', en:'Land rent escalation > 10% very high' },
  { id:'LAND-04', field:'landRentTerm', scope:'project', condition:(v,p)=>v>0&&v<(p.horizon||50), severity:'info', ar:'عقد الأرض أقصر من أفق المشروع', en:'Lease term < projection horizon' },
  // --- Escalation (project-level) ---
  { id:'ESC-04', field:'rentEscalation', scope:'project', condition:v=>(v||0)===0, severity:'info', ar:'بدون زيادة إيجار - الإيرادات ثابتة', en:'Zero escalation - flat revenue' },
];

const FINANCING_RULES = [
  { id:'DEBT-01', field:'maxLtvPct', scope:'financing', condition:v=>v>75, severity:'warning', ar:'تمويل > 75% أعلى من المعتاد بالسعودية (50-65%)', en:'LTV > 75% above Saudi typical (50-65%)' },
  { id:'DEBT-02', field:'maxLtvPct', scope:'financing', condition:v=>v>65&&v<=75, severity:'info', ar:'تمويل > 65% - تأكد من قبول البنك', en:'LTV > 65% - verify bank acceptance' },
  { id:'DEBT-03', field:'financeRate', scope:'financing', condition:v=>v>9, severity:'warning', ar:'معدل تمويل > 9% مرتفع', en:'Financing rate > 9% high' },
  { id:'DEBT-04', field:'financeRate', scope:'financing', condition:v=>v>0&&v<4, severity:'warning', ar:'معدل تمويل < 4% منخفض جداً', en:'Financing rate < 4% very low' },
  { id:'DEBT-05', field:'debtGrace', scope:'financing', condition:v=>v>5, severity:'warning', ar:'سماح > 5 سنوات غير معتاد', en:'Grace > 5 years unusual' },
  { id:'DEBT-06', field:'debtGrace', scope:'financing', condition:(v,p)=>{const maxC=Math.max(...(p.assets||[]).map(a=>Math.ceil((a.constrDuration||24)/12)));return v<maxC;}, severity:'warning', ar:'سداد أصل قبل الإيرادات', en:'Principal repayment before revenue' },
  { id:'DEBT-07', field:'loanTenor', scope:'financing', condition:v=>v>15, severity:'info', ar:'مدة القرض > 15 سنة - تأكد من البنك', en:'Tenor > 15 years - verify bank' },
  { id:'DEBT-08', field:'loanTenor', scope:'financing', condition:(v,p)=>v>0&&(v-(p.debtGrace||0))<2, severity:'warning', ar:'فترة سداد قصيرة جداً (< سنتين)', en:'Repayment period very short (< 2 years)' },
  { id:'DEBT-09', field:'upfrontFeePct', scope:'financing', condition:v=>v>2, severity:'info', ar:'رسوم تأسيس > 2%', en:'Upfront fee > 2%' },
];

const DSCR_RULES = [
  { id:'DSCR-01', field:'minDSCR', scope:'output', condition:v=>v!==null&&v<1.0, severity:'critical', ar:'DSCR < 1.0 - لا يغطي خدمة الدين', en:'DSCR < 1.0 - cannot cover debt service' },
  { id:'DSCR-02', field:'minDSCR', scope:'output', condition:v=>v!==null&&v>=1.0&&v<1.2, severity:'warning', ar:'DSCR < 1.2 - أقل من الحد البنكي السعودي', en:'DSCR < 1.2 - below Saudi bank minimum' },
  { id:'DSCR-03', field:'minDSCR', scope:'output', condition:v=>v!==null&&v>=1.2&&v<1.3, severity:'info', ar:'DSCR < 1.3 - هامش أمان ضيق', en:'DSCR < 1.3 - tight safety margin' },
  { id:'DSCR-04', field:'avgDSCR', scope:'output', condition:v=>v!==null&&v<1.5, severity:'info', ar:'متوسط DSCR < 1.5 - البنوك تفضل 1.5+', en:'Average DSCR < 1.5 - banks prefer 1.5+' },
];

const FUND_FEE_RULES = [
  { id:'FUND-FEE-01', field:'subscriptionFeePct', scope:'fund', condition:v=>v>2.5, severity:'warning', ar:'رسوم اشتراك > 2.5% أعلى من جميع الصناديق السعودية (المعيار: 2%)', en:'Subscription > 2.5% above all Saudi funds (standard: 2%)' },
  { id:'FUND-FEE-02', field:'annualMgmtFeePct', scope:'fund', condition:v=>v>1.5, severity:'warning', ar:'رسوم إدارة > 1.5% أعلى من الغالبية. المتوسط: 1.32%', en:'Mgmt fee > 1.5% above majority. Average: 1.32%' },
  { id:'FUND-FEE-03', field:'annualMgmtFeePct', scope:'fund', condition:v=>v>2, severity:'critical', ar:'رسوم إدارة > 2% تتجاوز أعلى مستوى مرصود في السوق', en:'Mgmt fee > 2% exceeds all observed funds' },
  { id:'FUND-FEE-04', field:'developerFeePct', scope:'fund', condition:v=>v>15, severity:'warning', ar:'رسوم مطور > 15% أعلى من السوق. المدى: 7-15%، المتوسط: 12.1%', en:'Dev fee > 15% above market. Range: 7-15%, avg: 12.1%' },
  { id:'FUND-FEE-05', field:'developerFeePct', scope:'fund', condition:v=>v>0&&v<7, severity:'info', ar:'رسوم مطور < 7% أقل من أدنى مستوى مرصود (طويق: 7%)', en:'Dev fee < 7% below lowest observed (Tuwaiq: 7%)' },
  { id:'FUND-FEE-06', field:'structuringFeePct', scope:'fund', condition:v=>v>2, severity:'warning', ar:'رسوم هيكلة > 2% أعلى من المعتاد. المتوسط: 1-1.5%', en:'Structuring > 2% above typical. Average: 1-1.5%' },
  { id:'FUND-FEE-07', field:'structuringFeePct', scope:'fund', condition:v=>v>3, severity:'critical', ar:'رسوم هيكلة > 3% مرتفعة جداً', en:'Structuring > 3% very high' },
  { id:'FUND-FEE-08', field:'totalFeesOverEquity', scope:'fund', condition:v=>v>0.50, severity:'critical', ar:'إجمالي الرسوم > 50% من الإكوتي - يأكل العوائد', en:'Total fees > 50% of equity - erodes returns' },
  { id:'FUND-FEE-09', field:'totalFeesOverEquity', scope:'fund', condition:v=>v>0.30&&v<=0.50, severity:'warning', ar:'إجمالي الرسوم > 30% من الإكوتي - عبء مرتفع', en:'Total fees > 30% of equity - high burden' },
];

const FUND_PERF_RULES = [
  { id:'FUND-PERF-01', field:'carryPct', scope:'fund', condition:v=>v>30, severity:'warning', ar:'حافز أداء > 30% في الشريحة العليا. المدى: 15-30%', en:'Carry > 30% in top tier. Range: 15-30%' },
  { id:'FUND-PERF-02', field:'carryPct', scope:'fund', condition:v=>v>40, severity:'critical', ar:'حافز أداء > 40% يتجاوز جميع الصناديق المرصودة', en:'Carry > 40% exceeds all observed funds' },
  { id:'FUND-PERF-03', field:'carryPct', scope:'fund', condition:v=>v>0&&v<15, severity:'info', ar:'حافز أداء < 15% أقل من أدنى مستوى مرصود', en:'Carry < 15% below lowest observed' },
  { id:'FUND-PERF-04', field:'prefReturnPct', scope:'fund', condition:v=>v>18, severity:'warning', ar:'عتبة أداء > 18% مرتفعة. المعتاد: 14-16%', en:'Hurdle > 18% high. Typical: 14-16%' },
  { id:'FUND-PERF-05', field:'prefReturnPct', scope:'fund', condition:v=>v>0&&v<8, severity:'warning', ar:'عتبة < 8% منخفضة جداً. أدنى مرصود: 8% (صندوق دخل)', en:'Hurdle < 8% very low. Lowest: 8% (income fund)' },
  { id:'FUND-PERF-06', field:'prefReturnPct', scope:'fund', condition:v=>v>20, severity:'critical', ar:'عائد مفضل > 20% يضغط بشدة على عوائد المطور', en:'Pref > 20% severely compresses GP returns' },
];

const FUND_EXIT_RULES = [
  { id:'FUND-EXIT-01', field:'exitCapRate', scope:'fund', condition:v=>v>0&&v<6, severity:'warning', ar:'Cap Rate < 6% متفائل للسعودية. المعتاد: 7-10%', en:'Cap rate < 6% optimistic for Saudi. Typical: 7-10%' },
  { id:'FUND-EXIT-02', field:'exitCapRate', scope:'fund', condition:v=>v>12, severity:'warning', ar:'Cap Rate > 12% - قيمة تخارج منخفضة', en:'Cap rate > 12% - low exit value' },
  { id:'FUND-EXIT-03', field:'exitYear', scope:'fund', condition:(v,p)=>{const sy=p.startYear||2026;const maxC=Math.max(...(p.assets||[]).map(a=>Math.ceil((a.constrDuration||24)/12)+(a.constrStart||0)));return v>0&&(v-sy)<maxC+1;}, severity:'warning', ar:'تخارج قبل الاستقرار', en:'Exit before stabilization' },
  { id:'FUND-EXIT-04', field:'exitMultiple', scope:'fund', condition:v=>v>15, severity:'warning', ar:'مضاعف تخارج > 15x مرتفع جداً', en:'Exit multiple > 15x very high' },
  { id:'FUND-EXIT-05', field:'exitMultiple', scope:'fund', condition:v=>v>0&&v<6, severity:'warning', ar:'مضاعف تخارج < 6x منخفض', en:'Exit multiple < 6x low' },
  { id:'FUND-EXIT-06', field:'exitCostPct', scope:'fund', condition:v=>v>5, severity:'info', ar:'تكاليف تخارج > 5%', en:'Exit costs > 5%' },
];

const FUND_STRUCT_RULES = [
  { id:'FUND-STRUCT-01', field:'maxLtvPct', scope:'fund', condition:(v,p)=>['fund','jv','hybrid'].includes(p.finMode)&&v>70, severity:'warning', ar:'تمويل صندوق > 70%. المدى الآمن لصناديق CMA: 60-70%', en:'Fund LTV > 70%. Safe CMA range: 60-70%' },
  { id:'FUND-STRUCT-02', field:'maxLtvPct', scope:'fund', condition:v=>v>100, severity:'critical', ar:'رافعة مالية > 100% - خطر مفرط', en:'Leverage > 100% - excessive risk' },
  { id:'FUND-STRUCT-03', field:'maxLtvPct', scope:'fund', condition:(v,p)=>['fund','jv','hybrid'].includes(p.finMode)&&v>0&&v<40, severity:'info', ar:'تمويل < 40% محافظ. قد يحد من العوائد لكنه يقلل المخاطر', en:'LTV < 40% conservative. May limit returns but reduces risk' },
  { id:'FUND-STRUCT-04', field:'fundLife', scope:'fund', condition:v=>v>0&&v<2, severity:'warning', ar:'مدة صندوق < سنتين قصيرة جداً للتطوير', en:'Fund duration < 2 years very short' },
  { id:'FUND-STRUCT-05', field:'fundLife', scope:'fund', condition:v=>v>7, severity:'info', ar:'مدة صندوق > 7 سنوات طويلة. الأطول مرصود: 5+2 سنوات', en:'Fund duration > 7 years long. Longest observed: 5+2 years' },
  { id:'FUND-STRUCT-06', field:'finMode', scope:'fund', condition:(v,p)=>v==='fund'&&(p.exitStrategy||'hold')==='hold', severity:'warning', ar:'هيكل صندوق بدون خطة تخارج محددة', en:'Fund structure with no defined exit strategy' },
];

const FUND_RET_RULES = [
  { id:'FUND-RET-01', field:'lpIRR', scope:'output', condition:(v,p)=>v!==null&&(p.prefReturnPct||0)>0&&v<(p.prefReturnPct/100), severity:'warning', ar:'عائد المستثمر أقل من العائد المفضل', en:'LP IRR below preferred return' },
  { id:'FUND-RET-02', field:'gpMOIC', scope:'output', condition:v=>v!==null&&v<1.0, severity:'critical', ar:'المطور يخسر - MOIC < 1x', en:'GP losing money - MOIC < 1x' },
  { id:'FUND-RET-03', field:'lpMOIC', scope:'output', condition:v=>v!==null&&v<1.5&&v>0, severity:'warning', ar:'MOIC المستثمر < 1.5x - عائد ضعيف', en:'LP MOIC < 1.5x - weak return' },
  { id:'FUND-RET-04', field:'simpleROE', scope:'output', condition:v=>v!==null&&v<0.08, severity:'warning', ar:'العائد البسيط < 8% - أقل من البدائل', en:'Simple ROE < 8% - below alternatives' },
  { id:'FUND-RET-05', field:'targetReturn', scope:'output', condition:(v,p)=>(p.prefReturnPct||0)>25, severity:'warning', ar:'عائد مستهدف > 25% متفائل. المدى المرصود: 14-20% سنوياً', en:'Target > 25% optimistic. Observed: 14-20% annually' },
];

const CROSS_RULES = [
  { id:'CROSS-01', field:'projectIRR', scope:'cross', condition:(v,ctx)=>v!==null&&ctx.finRate>0&&v<ctx.finRate, severity:'critical', ar:'عائد المشروع أقل من تكلفة التمويل - يدمر القيمة', en:'Project IRR below financing cost - destroys value' },
  { id:'CROSS-02', field:'totalCAPEX', scope:'cross', condition:(v,ctx)=>v>0&&ctx.tenYearRevenue>0&&v>ctx.tenYearRevenue, severity:'warning', ar:'التكلفة أعلى من إيرادات 10 سنوات - فترة استرداد طويلة', en:'CAPEX exceeds 10yr revenue - long payback' },
  { id:'CROSS-03', field:'totalLandRent50yr', scope:'cross', condition:(v,ctx)=>v>0&&ctx.totalCAPEX>0&&v>ctx.totalCAPEX*0.5, severity:'warning', ar:'إيجار الأرض > 50% من تكلفة التطوير', en:'Land rent > 50% of development cost' },
  { id:'CROSS-04', field:'feesOverEquity', scope:'cross', condition:v=>v>0.50, severity:'critical', ar:'إجمالي الرسوم > 50% من الإكوتي - يأكل العوائد', en:'Total fees > 50% of equity - erodes returns' },
  { id:'CROSS-05', field:'feesOverEquity', scope:'cross', condition:v=>v>0.30&&v<=0.50, severity:'warning', ar:'إجمالي الرسوم > 30% من الإكوتي - عبء مرتفع', en:'Total fees > 30% of equity - high burden' },
  { id:'STRUCT-01', field:'assetsCount', scope:'cross', condition:v=>v===0, severity:'error', ar:'لا توجد أصول - أضف أصل واحد على الأقل', en:'No assets - add at least one' },
  { id:'STRUCT-02', field:'emptyPhases', scope:'cross', condition:v=>v&&v.length>0, severity:'warning', ar:'مراحل فارغة', en:'Empty phases detected' },
  { id:'STRUCT-03', field:'finMode', scope:'cross', condition:(v,ctx)=>(v==='fund'||v==='jv')&&ctx.exitStrategy==='hold', severity:'warning', ar:'هيكل صندوق بدون خطة تخارج', en:'Fund structure with no exit plan' },
  { id:'STRUCT-04', field:'finMode', scope:'cross', condition:(v,ctx)=>v==='self'&&(ctx.ltv||0)>0, severity:'info', ar:'وضع ذاتي مع نسبة تمويل - هل تقصد وضع البنك؟', en:'Self-funded with LTV - did you mean bank mode?' },
  { id:'FUND-GOV-01', field:'finMode', scope:'cross', condition:(v,ctx)=>(v==='fund'||v==='jv')&&!ctx.hasWaterfall, severity:'warning', ar:'صندوق بدون شلال توزيع', en:'Fund without distribution waterfall' },
  { id:'FUND-GOV-02', field:'year1Fees', scope:'cross', condition:(v,ctx)=>ctx.totalEquity>0&&v/ctx.totalEquity>0.20, severity:'warning', ar:'رسوم السنة الأولى > 20% من الإكوتي', en:'Year 1 fees > 20% of equity' },
  { id:'CROSS-06', field:'lpMOIC', scope:'cross', condition:(v)=>v!==null&&v>0&&v<1.5, severity:'warning', ar:'عائد ضعيف للمستثمر - MOIC < 1.5x', en:'Weak LP return - MOIC < 1.5x' },
  { id:'CROSS-07', field:'latePhases', scope:'cross', condition:(v,ctx)=>v>0, severity:'warning', ar:'بعض المراحل تبدأ في آخر 5 سنوات', en:'Some phases start in last 5 years' },
];

export const RULES = [
  ...ASSET_RULES,
  ...PROJECT_RULES,
  ...FINANCING_RULES,
  ...DSCR_RULES,
  ...FUND_FEE_RULES,
  ...FUND_PERF_RULES,
  ...FUND_EXIT_RULES,
  ...FUND_STRUCT_RULES,
  ...FUND_RET_RULES,
  ...CROSS_RULES,
];

// ═══════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════
export function runAllRules(project, results, financing, waterfall) {
  if (!project) return { alerts: [], summary: { critical: 0, error: 0, warning: 0, info: 0, total: 0 } };
  const alerts = [];
  const p = project;
  const assets = p.assets || [];
  const c = results?.consolidated;
  const f = financing;
  const w = waterfall;
  const isFund = ['fund','jv','hybrid','incomeFund'].includes(p.finMode);
  const hasDebt = p.debtAllowed && ['debt','bank100','fund','jv','hybrid','incomeFund'].includes(p.finMode);

  // --- Cost benchmark alerts ---
  assets.forEach((a, i) => {
    if ((a.costPerSqm || 0) <= 0 || (a.gfa || 0) <= 0) return;
    const bmId = matchCostBenchmark(a);
    if (!bmId) return;
    const bm = COST_BENCHMARKS.find(b => b.id === bmId);
    if (!bm) return;
    const cost = a.costPerSqm;
    if (cost < bm.low) {
      alerts.push({ id: bmId + '-LOW', severity: 'warning', assetIndex: i, assetName: a.name || `Asset ${i+1}`,
        ar: `تكلفة ${a.name||'الأصل'} (${cost.toLocaleString()} ر.س/م²) أقل من النطاق المرجعي (${bm.low.toLocaleString()}-${bm.high.toLocaleString()}) لـ ${bm.subtype}`,
        en: `${a.name||'Asset'} cost (SAR ${cost.toLocaleString()}/m²) below benchmark (${bm.low.toLocaleString()}-${bm.high.toLocaleString()}) for ${bm.subtype}`,
        source: bm.sources });
    } else if (cost > bm.high) {
      alerts.push({ id: bmId + '-HIGH', severity: 'warning', assetIndex: i, assetName: a.name || `Asset ${i+1}`,
        ar: `تكلفة ${a.name||'الأصل'} (${cost.toLocaleString()} ر.س/م²) أعلى من النطاق المرجعي (${bm.low.toLocaleString()}-${bm.high.toLocaleString()}) لـ ${bm.subtype}`,
        en: `${a.name||'Asset'} cost (SAR ${cost.toLocaleString()}/m²) above benchmark (${bm.low.toLocaleString()}-${bm.high.toLocaleString()}) for ${bm.subtype}`,
        source: bm.sources });
    }
  });

  // --- Asset rules ---
  ASSET_RULES.forEach(rule => {
    assets.forEach((a, i) => {
      if (rule.assetFilter && !rule.assetFilter(a)) return;
      const v = a[rule.field];
      if (v === undefined || v === null) return;
      try {
        if (rule.condition(v, a)) {
          alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, assetIndex: i, assetName: a.name || `Asset ${i+1}`, field: rule.field });
        }
      } catch(e) {}
    });
  });

  // --- Project rules ---
  PROJECT_RULES.forEach(rule => {
    const v = p[rule.field];
    if (v === undefined || v === null) return;
    try { if (rule.condition(v, p)) alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field }); } catch(e) {}
  });

  // --- Financing rules ---
  if (hasDebt) {
    FINANCING_RULES.forEach(rule => {
      const v = p[rule.field];
      if (v === undefined || v === null) return;
      try { if (rule.condition(v, p)) alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field }); } catch(e) {}
    });
  }

  // --- DSCR rules ---
  if (f && f.dscr) {
    const dscrArr = f.dscr.filter(v => v != null && isFinite(v) && v > 0);
    const minDSCR = dscrArr.length ? Math.min(...dscrArr) : null;
    const avgDSCR = dscrArr.length ? dscrArr.reduce((a,b)=>a+b,0)/dscrArr.length : null;
    DSCR_RULES.forEach(rule => {
      const v = rule.field === 'minDSCR' ? minDSCR : avgDSCR;
      try { if (rule.condition(v)) alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field }); } catch(e) {}
    });
  }

  // --- Fund rules ---
  if (isFund) {
    const feesOverEquity = (w && f?.totalEquity > 0) ? (w.totalFees / f.totalEquity) : 0;
    [...FUND_FEE_RULES, ...FUND_PERF_RULES, ...FUND_EXIT_RULES, ...FUND_STRUCT_RULES].forEach(rule => {
      let v = p[rule.field];
      if (rule.field === 'totalFeesOverEquity') v = feesOverEquity;
      if (rule.field === 'finMode') v = p.finMode;
      if (v === undefined || v === null) return;
      try { if (rule.condition(v, p)) alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field }); } catch(e) {}
    });
    // Fund return rules (from engine output)
    if (w) {
      FUND_RET_RULES.forEach(rule => {
        let v;
        if (rule.field === 'lpIRR') v = w.lpIRR;
        else if (rule.field === 'gpMOIC') v = w.gpMOIC;
        else if (rule.field === 'lpMOIC') v = w.lpMOIC;
        else if (rule.field === 'simpleROE') v = w.gpSimpleAnnual;
        else if (rule.field === 'targetReturn') v = p.prefReturnPct;
        try { if (rule.condition(v, p)) alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field }); } catch(e) {}
      });
    }
  }

  // --- Cross-field rules ---
  const ctx = {
    finRate: hasDebt ? (p.financeRate || 0) / 100 : 0,
    tenYearRevenue: c ? c.income.slice(0, 10).reduce((a,b)=>a+b, 0) : 0,
    totalCAPEX: c?.totalCapex || 0,
    totalLandRent50yr: c?.totalLandRent || 0,
    exitStrategy: p.exitStrategy || 'hold',
    ltv: p.maxLtvPct || 0,
    hasWaterfall: !!w,
    totalEquity: f?.totalEquity || 0,
    year1Fees: w?.fees?.[0] || 0,
    feesOverEquity: (w && f?.totalEquity > 0) ? (w.totalFees / f.totalEquity) : 0,
    assetsCount: assets.length,
    emptyPhases: (p.phases || []).filter(ph => !assets.some(a => a.phase === ph.name)),
    latePhases: (p.phases || []).filter(ph => {
      const phAssets = assets.filter(a => a.phase === ph.name);
      const maxStart = Math.max(0, ...phAssets.map(a => a.constrStart || 0));
      return maxStart > (p.horizon || 50) - 5;
    }).length,
  };
  CROSS_RULES.forEach(rule => {
    let v;
    if (rule.field === 'projectIRR') v = c?.irr ?? null;
    else if (rule.field === 'totalCAPEX') v = ctx.totalCAPEX;
    else if (rule.field === 'totalLandRent50yr') v = ctx.totalLandRent50yr;
    else if (rule.field === 'feesOverEquity') v = ctx.feesOverEquity;
    else if (rule.field === 'assetsCount') v = ctx.assetsCount;
    else if (rule.field === 'emptyPhases') v = ctx.emptyPhases;
    else if (rule.field === 'finMode') v = p.finMode;
    else if (rule.field === 'year1Fees') v = ctx.year1Fees;
    else if (rule.field === 'latePhases') v = ctx.latePhases;
    else if (rule.field === 'lpMOIC') v = w?.lpMOIC ?? null;
    else return;
    try { if (rule.condition(v, ctx)) alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field }); } catch(e) {}
  });

  // Deduplicate by id+assetIndex
  const seen = new Set();
  const deduped = alerts.filter(a => {
    const key = a.id + (a.assetIndex !== undefined ? '-' + a.assetIndex : '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const summary = { critical: 0, error: 0, warning: 0, info: 0, total: deduped.length };
  deduped.forEach(a => { summary[a.severity] = (summary[a.severity] || 0) + 1; });

  return { alerts: deduped, summary };
}

/**
 * Run rules for a single field — returns alerts for that field only.
 * Useful for inline validation (FieldAlertDot).
 */
export function runFieldRules(fieldName, value, context = {}) {
  const alerts = [];
  const allFieldRules = RULES.filter(r => r.field === fieldName);
  allFieldRules.forEach(rule => {
    if (rule.assetFilter && context.asset && !rule.assetFilter(context.asset)) return;
    try {
      if (rule.condition(value, context.asset || context.project || context)) {
        alerts.push({ id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, field: rule.field });
      }
    } catch(e) {}
  });
  return alerts;
}
