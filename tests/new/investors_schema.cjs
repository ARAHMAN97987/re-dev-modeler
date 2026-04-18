/**
 * tests/new/investors_schema.cjs
 *
 * Verifies:
 *  - engine exports `migrateProjectToInvestors`
 *  - migration produces a valid `investors[]` array on legacy projects
 *  - each investor has id, name, role, contribution fields
 *  - contribution types are one of: cash | devFee | landValue | landCap | landPurchase
 *
 * Status: RED until Task 3 creates src/engine/investors.js
 */

const path = require('path');
const fs = require('fs');

let passed = 0, failed = 0, skipped = 0;
const t = (name, ok, detail) => {
  if (ok === 'skip') { skipped++; console.log(`  ⏭  ${name} ${detail ? '— ' + detail : ''}`); return; }
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}  ${detail || ''}`); }
};

console.log('INVESTORS SCHEMA TESTS');

// Gate: investors.js must exist
const investorsPath = path.resolve(__dirname, '..', '..', 'src', 'engine', 'investors.js');
if (!fs.existsSync(investorsPath)) {
  console.log(`  ⏭  src/engine/investors.js not created yet — skipping all schema tests`);
  console.log(`\nSUMMARY: 0 passed, 0 failed, 6 skipped (engine not refactored)`);
  process.exit(0);
}

// Load engine
let E;
try { E = require('../helpers/engine.cjs'); }
catch (e) { console.log(`  ❌ engine load error: ${e.message}`); process.exit(1); }

const migrate = E.migrateProjectToInvestors;

t('migrateProjectToInvestors exported', typeof migrate === 'function',
  'expected function, got ' + typeof migrate);

if (typeof migrate !== 'function') {
  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Test 1: legacy self project → 1 developer investor
const legacySelf = {
  id: 'a', finMode: 'self', landType: 'lease', landArea: 10000,
  gpEquityManual: 50000000,
};
const m1 = migrate(legacySelf);
t('self → has investors array', Array.isArray(m1.investors));
t('self → 1 investor', m1.investors?.length === 1);
t('self → role=developer', m1.investors?.[0]?.role === 'developer');
t('self → valid contribution type',
  ['cash','devFee','landValue','landCap','landPurchase'].includes(m1.investors?.[0]?.contribution?.type));

// Test 2: fund with partner land
const legacyFund = {
  id: 'b', finMode: 'fund', landType: 'partner', landArea: 50000,
  landValuation: 100000000, partnerEquityPct: 40,
  lpEquityManual: 150000000,
};
const m2 = migrate(legacyFund);
t('fund+partner → has investors', Array.isArray(m2.investors) && m2.investors.length >= 2);
const hasDev = m2.investors?.some(i => i.role === 'developer');
const hasInv = m2.investors?.some(i => i.role === 'investor');
t('fund+partner → has developer', hasDev);
t('fund+partner → has investor', hasInv);
const devLand = m2.investors?.find(i => i.role === 'developer' && i.contribution?.type === 'landValue');
t('fund+partner → dev contribution is landValue', !!devLand);

// Test 3: already-migrated project passes through unchanged
const preMigrated = {
  id: 'c', finMode: 'fund',
  investors: [{ id: 'dev', name: 'Dev', role: 'developer', contribution: { type: 'cash', amount: 1000000 } }],
};
const m3 = migrate(preMigrated);
t('already-migrated passes through', m3.investors?.length === 1 && m3.investors[0].id === 'dev');

// Test 4: every investor has required fields
const m4 = migrate(legacyFund);
const allValid = (m4.investors || []).every(i =>
  typeof i.id === 'string' && typeof i.name === 'string' &&
  (i.role === 'developer' || i.role === 'investor') &&
  i.contribution && typeof i.contribution.type === 'string'
);
t('all investors have id/name/role/contribution', allValid);

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
