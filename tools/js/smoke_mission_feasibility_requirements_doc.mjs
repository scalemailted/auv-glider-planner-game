import assert from 'node:assert/strict';
import fs from 'node:fs';

const docPath = 'docs/mission_feasibility_simulator_requirements.md';
assert.equal(fs.existsSync(docPath), true, 'mission feasibility requirements doc exists');
const doc = fs.readFileSync(docPath, 'utf8');
const roadmap = fs.readFileSync('ROADMAP.md', 'utf8');
const testing = fs.readFileSync('docs/testing.md', 'utf8');
const docsToScan = [
  docPath,
  'ROADMAP.md',
  'README.md',
  'HOWPLAY.md',
  'docs/game_design_scientific_auv_planning.md',
  'docs/headless_node_oceanbox_runtime.md',
  'docs/headless_solver_packet_roundtrip.md',
  'docs/headless_bundle_loader.md',
  'docs/export_formats.md',
  'docs/testing.md',
  'tools/js/README.md',
  'tools/python/README.md',
  'tools/python/notebooks/oceanbox_js_colab_quickstart.md'
];

for (const phrase of [
  '4D current',
  'battery',
  'mission duration',
  'distance traveled',
  'planned vs realized',
  'payload',
  'cost graph',
  'adjacency matrix',
  'validation tiers',
  'not a Python simulator',
  'not a calibrated',
  'not MARL/RL'
]) {
  assert.ok(doc.includes(phrase), `requirements doc contains ${phrase}`);
}
assert.ok(roadmap.includes('mission_feasibility_simulator_requirements.md'), 'ROADMAP links mission feasibility requirements doc');
assert.ok(roadmap.includes('SIM-R1 - Mission Feasibility Simulator and Cost-Matrix Benchmark Layer'), 'ROADMAP includes SIM-R1 milestone');
assert.ok(testing.includes('Mission Feasibility Validation Tiers'), 'testing docs mention Mission Feasibility Validation Tiers');

const seaExplorerViolations = [];
for (const file of docsToScan) {
  const text = fs.readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    if (/SeaExplorer/i.test(line) && !/target|not|does not|without claiming|before evidence|specific/i.test(line)) {
      seaExplorerViolations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}
assert.deepEqual(seaExplorerViolations, [], `Docs claim SeaExplorer-specific validation:\n${seaExplorerViolations.join('\n')}`);
console.log('smoke_mission_feasibility_requirements_doc: ok');
