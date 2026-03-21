// Quick parity check: run same project through both paths, compare outputs
const E = require('./helpers/engine.cjs');

const project = E.defaultProject();
project.finMode = 'fund';
project.assets = [
  {phase:'Phase 1',category:'Retail',name:'Mall',code:'M1',gfa:20000,footprint:10000,plotArea:15000,
   revType:'Lease',efficiency:80,leaseRate:2000,escalation:1,rampUpYears:3,stabilizedOcc:90,
   costPerSqm:3500,constrStart:1,constrDuration:30,opEbitda:0}
];

const r = E.runFullModel(project);
if (!r) { console.log("❌ runFullModel returned null"); process.exit(1); }

const checks = [
  ['projectResults', !!r.projectResults],
  ['financing', !!r.financing],
  ['waterfall', !!r.waterfall],
  ['totalCapex > 0', r.projectResults.consolidated.totalCapex > 0],
  ['IRR computed', r.financing.leveredIRR !== null],
  ['lpIRR computed', r.waterfall?.lpIRR !== null],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? '\n✅ Engine parity OK' : '\n❌ Engine parity FAILED');
process.exit(ok ? 0 : 1);
