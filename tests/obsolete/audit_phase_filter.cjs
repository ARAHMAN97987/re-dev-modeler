/**
 * AUDIT: Multi-Phase Filter Implementation (Rounds 1-6)
 * 
 * This script reads App.jsx and programmatically verifies EVERY rule
 * from the agreed methodology. No human attention span limitations.
 * 
 * Categories:
 *   A. Zero old variable references (global)
 *   B. Per-component structure verification
 *   C. useMemo dependency completeness
 *   D. No raw data bypass (reading unfiltered sources after useMemo)
 *   E. UI consistency (button colors, labels, warning banners)
 *   F. Incentive guards (!isFiltered)
 *   G. No undefined variable access
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
const lines = src.split('\n');

let pass = 0, fail = 0, warn = 0;
const failures = [];
const warnings = [];

function ok(test, msg) {
  if (test) { pass++; }
  else { fail++; failures.push(`FAIL: ${msg}`); }
}

function wn(test, msg) {
  if (!test) { warn++; warnings.push(`WARN: ${msg}`); }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Extract function body by name
// ═══════════════════════════════════════════════════════════════
function getFunctionBody(name) {
  const startRe = new RegExp(`^function ${name}\\b`);
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startRe.test(lines[i])) { startLine = i; break; }
  }
  if (startLine === -1) return { start: -1, end: -1, text: '', lines: [] };
  
  // Find next top-level function
  let endLine = lines.length - 1;
  for (let i = startLine + 1; i < lines.length; i++) {
    if (/^function \w/.test(lines[i]) || /^const \w+ = function/.test(lines[i])) {
      endLine = i - 1;
      break;
    }
  }
  const bodyLines = lines.slice(startLine, endLine + 1);
  return { start: startLine, end: endLine, text: bodyLines.join('\n'), lines: bodyLines };
}

// ═══════════════════════════════════════════════════════════════
// A. ZERO OLD VARIABLE REFERENCES (GLOBAL)
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('A. ZERO OLD VARIABLE REFERENCES (GLOBAL)');
console.log('══════════════════════════════════════════════');

// Count selectedPhase NOT followed by 's' (i.e., not selectedPhases)
const oldSelectedPhase = [];
lines.forEach((line, i) => {
  // Match selectedPhase but not selectedPhases or singlePhaseName
  const matches = line.match(/selectedPhase(?!s|Name)/g);
  if (matches && !line.includes('//') && !line.includes('singlePhaseName')) {
    oldSelectedPhase.push(i + 1);
  }
});
ok(oldSelectedPhase.length === 0, `selectedPhase (old single-select) found at lines: ${oldSelectedPhase.join(', ')}`);
if (oldSelectedPhase.length === 0) console.log('  ✅ selectedPhase (old) = 0 refs');
else console.log(`  ❌ selectedPhase (old) = ${oldSelectedPhase.length} refs at L${oldSelectedPhase.join(',')}`);

const oldSetSelectedPhase = [];
lines.forEach((line, i) => {
  if (/\bsetSelectedPhase\b/.test(line) && !line.includes('//')) {
    oldSetSelectedPhase.push(i + 1);
  }
});
ok(oldSetSelectedPhase.length === 0, `setSelectedPhase found at lines: ${oldSetSelectedPhase.join(', ')}`);
if (oldSetSelectedPhase.length === 0) console.log('  ✅ setSelectedPhase = 0 refs');
else console.log(`  ❌ setSelectedPhase = ${oldSetSelectedPhase.length} refs at L${oldSetSelectedPhase.join(',')}`);

const oldIsPhaseView = [];
lines.forEach((line, i) => {
  if (/\bisPhaseView\b/.test(line) && !line.includes('//')) {
    oldIsPhaseView.push(i + 1);
  }
});
ok(oldIsPhaseView.length === 0, `isPhaseView found at lines: ${oldIsPhaseView.join(', ')}`);
if (oldIsPhaseView.length === 0) console.log('  ✅ isPhaseView = 0 refs');
else console.log(`  ❌ isPhaseView = ${oldIsPhaseView.length} refs at L${oldIsPhaseView.join(',')}`);

// ═══════════════════════════════════════════════════════════════
// B. PER-COMPONENT STRUCTURE VERIFICATION
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('B. PER-COMPONENT STRUCTURE VERIFICATION');
console.log('══════════════════════════════════════════════');

const COMPONENTS = [
  { name: 'ProjectDash', hasSettings: false, hasWarning: false },
  { name: 'CashFlowView', hasSettings: false, hasWarning: false },
  { name: 'SelfResultsView', hasSettings: false, hasWarning: false },
  { name: 'FinancingView', hasSettings: true, hasWarning: true },
  { name: 'BankResultsView', hasSettings: true, hasWarning: true },
  { name: 'WaterfallView', hasSettings: true, hasWarning: true },
  { name: 'IncentivesView', hasSettings: false, hasWarning: true },
];

for (const comp of COMPONENTS) {
  const body = getFunctionBody(comp.name);
  if (body.start === -1) {
    ok(false, `${comp.name}: function not found`);
    continue;
  }
  console.log(`\n  ── ${comp.name} (L${body.start + 1}-${body.end + 1}) ──`);
  
  // B1. Has selectedPhases state
  const hasSelectedPhases = body.text.includes('const [selectedPhases, setSelectedPhases] = useState([])');
  ok(hasSelectedPhases, `${comp.name}: missing selectedPhases state`);
  console.log(`    ${hasSelectedPhases ? '✅' : '❌'} selectedPhases state`);
  
  // B2. Has activePh
  const hasActivePh = body.text.includes('activePh');
  ok(hasActivePh, `${comp.name}: missing activePh`);
  console.log(`    ${hasActivePh ? '✅' : '❌'} activePh defined`);
  
  // B3. Has isFiltered
  const hasIsFiltered = body.text.includes('const isFiltered');
  ok(hasIsFiltered, `${comp.name}: missing isFiltered`);
  console.log(`    ${hasIsFiltered ? '✅' : '❌'} isFiltered defined`);
  
  // B4. Has togglePhase
  const hasTogglePhase = body.text.includes('togglePhase');
  ok(hasTogglePhase, `${comp.name}: missing togglePhase`);
  console.log(`    ${hasTogglePhase ? '✅' : '❌'} togglePhase function`);
  
  // B5. Has useMemo (at least 1 for filtered data)
  const useMemoCount = (body.text.match(/useMemo\(/g) || []).length;
  ok(useMemoCount >= 1, `${comp.name}: no useMemo found (need at least 1)`);
  console.log(`    ${useMemoCount >= 1 ? '✅' : '❌'} useMemo count = ${useMemoCount}`);
  
  // B6. Has "All Phases" button
  const hasAllButton = body.text.includes('كل المراحل') || body.text.includes('All Phases');
  ok(hasAllButton, `${comp.name}: missing "All Phases" button`);
  console.log(`    ${hasAllButton ? '✅' : '❌'} "All Phases" button`);
  
  // B7. Warning banner (for settings pages)
  if (comp.hasWarning) {
    const hasWarning = body.text.includes('سينتشر') || body.text.includes('سينطبق') || body.text.includes('apply to') || body.text.includes('مستوى المشروع') || body.text.includes('entire project');
    ok(hasWarning, `${comp.name}: missing warning banner`);
    console.log(`    ${hasWarning ? '✅' : '❌'} Warning banner`);
  }
  
  // B8. No old selectedPhase in this component
  const oldRefsInComp = (body.text.match(/selectedPhase(?!s|Name)/g) || []).length;
  ok(oldRefsInComp === 0, `${comp.name}: ${oldRefsInComp} old selectedPhase refs`);
  console.log(`    ${oldRefsInComp === 0 ? '✅' : '❌'} Zero old refs (found ${oldRefsInComp})`);
}

// ═══════════════════════════════════════════════════════════════
// C. useMemo DEPENDENCY COMPLETENESS
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('C. useMemo DEPENDENCY COMPLETENESS');
console.log('══════════════════════════════════════════════');

// For each useMemo, check deps include selectedPhases and isFiltered
const useMemoPattern = /}, \[([^\]]+)\]\);/g;
let match;
let memoIdx = 0;
const REQUIRED_DEPS = ['selectedPhases'];

while ((match = useMemoPattern.exec(src)) !== null) {
  const deps = match[1];
  const lineNum = src.substring(0, match.index).split('\n').length;
  
  // Only check useMemos in our modified components (skip others like useMobile etc)
  if (!deps.includes('isFiltered') && !deps.includes('isSinglePhase') && !deps.includes('phaseShare')) continue;
  
  memoIdx++;
  let depsOk = true;
  for (const req of REQUIRED_DEPS) {
    if (!deps.includes(req)) {
      depsOk = false;
      ok(false, `useMemo at L${lineNum}: missing dep '${req}' in [${deps}]`);
    }
  }
  if (depsOk) {
    ok(true, '');
    console.log(`  ✅ useMemo #${memoIdx} at L${lineNum}: deps OK`);
  } else {
    console.log(`  ❌ useMemo #${memoIdx} at L${lineNum}: MISSING deps`);
  }
}

// ═══════════════════════════════════════════════════════════════
// D. NO RAW DATA BYPASS
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('D. NO RAW DATA BYPASS (post-useMemo reads)');
console.log('══════════════════════════════════════════════');

// Check each component for direct results.consolidated reads after useMemo
for (const compName of ['ProjectDash', 'CashFlowView', 'SelfResultsView']) {
  const body = getFunctionBody(compName);
  if (body.start === -1) continue;
  
  // Find the closing of the LAST useMemo (the }, [deps]) line
  let useMemoEnd = 0;
  for (let i = 0; i < body.lines.length; i++) {
    if (/}, \[.*\]\);/.test(body.lines[i]) && body.lines.slice(Math.max(0, i - 30), i + 1).some(l => l.includes('useMemo'))) {
      useMemoEnd = i;
    }
  }
  
  // Check lines after useMemo for raw reads
  const postMemo = body.lines.slice(useMemoEnd + 5).join('\n');
  const rawConsolidated = (postMemo.match(/results\.consolidated/g) || []).length;
  ok(rawConsolidated === 0, `${compName}: ${rawConsolidated} raw results.consolidated reads after useMemo`);
  console.log(`  ${rawConsolidated === 0 ? '✅' : '❌'} ${compName}: results.consolidated after useMemo = ${rawConsolidated}`);
}

// ═══════════════════════════════════════════════════════════════
// E. UI CONSISTENCY
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('E. UI CONSISTENCY');
console.log('══════════════════════════════════════════════');

// Check button colors in each component
for (const comp of COMPONENTS) {
  const body = getFunctionBody(comp.name);
  if (body.start === -1) continue;
  
  // Check "All" button uses #1e3a5f
  const hasAllColor = body.text.includes('#1e3a5f');
  ok(hasAllColor, `${comp.name}: "All" button missing #1e3a5f color`);
  
  // Check phase button uses #0f766e (teal)
  const hasTeal = body.text.includes('#0f766e');
  ok(hasTeal, `${comp.name}: phase button missing #0f766e teal color`);
  
  console.log(`  ${hasAllColor && hasTeal ? '✅' : '❌'} ${comp.name}: All=#1e3a5f=${hasAllColor}, Phase=#0f766e=${hasTeal}`);
}

// ═══════════════════════════════════════════════════════════════
// F. INCENTIVE GUARDS (!isFiltered)
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('F. INCENTIVE GUARDS (!isFiltered)');
console.log('══════════════════════════════════════════════');

// Components that should hide incentive data when filtered
for (const compName of ['ProjectDash', 'SelfResultsView', 'CashFlowView']) {
  const body = getFunctionBody(compName);
  if (body.start === -1) continue;
  
  const guardCount = (body.text.match(/!isFiltered/g) || []).length;
  ok(guardCount >= 1, `${compName}: no !isFiltered guards for incentives`);
  console.log(`  ${guardCount >= 1 ? '✅' : '❌'} ${compName}: !isFiltered guards = ${guardCount}`);
}

// Check ExitAnalysisPanel + IncentivesImpact hidden when filtered in Waterfall & Bank
for (const compName of ['WaterfallView', 'BankResultsView']) {
  const body = getFunctionBody(compName);
  if (body.start === -1) continue;
  
  // Look for !isFiltered before ExitAnalysisPanel
  const hasExitGuard = body.text.includes('!isFiltered && <ExitAnalysisPanel') || body.text.includes('!isFiltered && <IncentivesImpact');
  ok(hasExitGuard, `${compName}: ExitAnalysisPanel/IncentivesImpact not guarded by !isFiltered`);
  console.log(`  ${hasExitGuard ? '✅' : '❌'} ${compName}: Exit/Incentives panels hidden when filtered`);
}

// ═══════════════════════════════════════════════════════════════
// G. NO UNDEFINED VARIABLE ACCESS
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('G. NO UNDEFINED VARIABLE ACCESS');
console.log('══════════════════════════════════════════════');

// BankResultsView: should use 'pf' not 'f' (f is undefined there)
{
  const body = getFunctionBody('BankResultsView');
  if (body.start !== -1) {
    // Check that 'f' is not used as a variable (allowing f. inside .map(f=> etc)
    const bareF = [];
    body.lines.forEach((line, i) => {
      // Match lines with bare f. that aren't part of pf. or .map(f=> or useMemo internals
      if (/\bf\.(?!ilter|or|rom|ind|unction|lat|oat)/.test(line) && 
          !line.includes('pf.') && !line.includes('cfg.') && 
          !line.includes('.map(f') && !line.includes('const f ') && 
          !line.includes('useMemo') && !line.includes('//') &&
          !line.includes('.financing') && !line.includes('p.f')) {
        bareF.push(body.start + i + 1);
      }
    });
    ok(bareF.length === 0, `BankResultsView: undefined 'f.' at L${bareF.join(',')}`);
    console.log(`  ${bareF.length === 0 ? '✅' : '❌'} BankResultsView: bare f. refs = ${bareF.length}${bareF.length > 0 ? ' at L' + bareF.join(',') : ''}`);
  }
}

// FinancingView: check 'results.consolidated' not used directly after pc useMemo
{
  const body = getFunctionBody('FinancingView');
  if (body.start !== -1) {
    let pcMemoEnd = 0;
    body.lines.forEach((line, i) => {
      if (line.includes('const pc = useMemo')) pcMemoEnd = i;
    });
    const postPc = body.lines.slice(pcMemoEnd + 10).join('\n');
    const directConsolidated = (postPc.match(/results\.consolidated/g) || []).length;
    ok(directConsolidated === 0, `FinancingView: ${directConsolidated} direct results.consolidated after pc useMemo`);
    console.log(`  ${directConsolidated === 0 ? '✅' : '❌'} FinancingView: results.consolidated after pc = ${directConsolidated}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// H. PHASE SYNC INDEPENDENCE (each page has its own state)
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('H. PHASE SYNC INDEPENDENCE');
console.log('══════════════════════════════════════════════');

// Each component should have its OWN useState([]) — not shared
let stateCount = 0;
for (const comp of COMPONENTS) {
  const body = getFunctionBody(comp.name);
  if (body.start === -1) continue;
  const hasOwnState = body.text.includes('const [selectedPhases, setSelectedPhases] = useState([])');
  if (hasOwnState) stateCount++;
}
ok(stateCount === COMPONENTS.length, `Only ${stateCount}/${COMPONENTS.length} components have independent selectedPhases state`);
console.log(`  ${stateCount === COMPONENTS.length ? '✅' : '❌'} ${stateCount}/${COMPONENTS.length} components have independent state`);

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('SUMMARY');
console.log('══════════════════════════════════════════════');
console.log(`  ${pass} PASSED | ${fail} FAILED | ${warn} WARNINGS`);

if (failures.length > 0) {
  console.log('\n  FAILURES:');
  failures.forEach(f => console.log(`    ${f}`));
}
if (warnings.length > 0) {
  console.log('\n  WARNINGS:');
  warnings.forEach(w => console.log(`    ${w}`));
}

console.log('');
process.exit(fail > 0 ? 1 : 0);
