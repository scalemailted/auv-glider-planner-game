import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const requiredFiles = [
  'src/game/phaser/scenes/MainMenuScene.js',
  'src/core/science/WaterColumnSchema.js',
  'src/core/science/DiveProfileModel.js',
  'src/core/science/WaterColumnObservationModel.js',
  'src/game/phaser/scenes/HeadlessBundleViewerScene.js',
  'src/ui/headless/HeadlessBundleViewerPanel.js',
  'ROADMAP.md'
];

for (const file of requiredFiles) {
  assert.equal(exists(file), true, `${file} should exist for the post-P11/UI-R1 checkpoint`);
}

const mainMenu = read('src/game/phaser/scenes/MainMenuScene.js');
const waterColumnSchema = read('src/core/science/WaterColumnSchema.js');
const diveProfiles = read('src/core/science/DiveProfileModel.js');
const observationModel = read('src/core/science/WaterColumnObservationModel.js');
const viewerScene = read('src/game/phaser/scenes/HeadlessBundleViewerScene.js');
const viewerPanel = read('src/ui/headless/HeadlessBundleViewerPanel.js');
const roadmap = read('ROADMAP.md');

assert.ok(mainMenu.includes('ANCHOR_MAIN_MENU_DEBUG'), 'MainMenuScene exposes ANCHOR_MAIN_MENU_DEBUG');
for (const label of ['Challenge Mode', 'Simulation Lab', 'Learning Labs']) {
  assert.ok(mainMenu.includes(label), `MainMenuScene includes hub label ${label}`);
}
for (const label of ['Headless Bundle Viewer', 'Adaptive Benchmark', 'Planner Benchmark', 'Full Autonomy Benchmark']) {
  assert.ok(mainMenu.includes(label), `Simulation Lab includes ${label}`);
}

for (const layer of ['surface', 'thermocline', 'deep']) {
  assert.ok(waterColumnSchema.includes(`'${layer}'`), `WaterColumnSchema includes canonical layer ${layer}`);
}
for (const profile of ['surfaceOnly', 'thermoclineDive', 'deepDive', 'fullProfile', 'sawtoothProfile', 'adaptiveVerticalProfile']) {
  assert.ok(waterColumnSchema.includes(`'${profile}'`) || diveProfiles.includes(`'${profile}'`), `dive profile ${profile} is declared`);
}
for (const field of ['depthLayerId', 'depthMeters', 'diveProfileId']) {
  assert.ok(observationModel.includes(field), `WaterColumnObservationModel preserves ${field}`);
}

assert.ok(viewerScene.includes('ANCHOR_HEADLESS_BUNDLE_DEBUG'), 'HeadlessBundleViewerScene exposes debug object');
assert.ok(viewerPanel.includes('Water Column'), 'HeadlessBundleViewerPanel renders Water Column section');
assert.ok(viewerPanel.includes('2.5D means the tactical map remains top-down'), 'Water Column panel states 2.5D boundary');

for (const text of ['Blind Discovery / Hidden-State Mode', 'Node/OceanBox-JS', 'Browser ANCHOR', '2.5D', 'Full Autonomy Benchmark']) {
  assert.ok(roadmap.includes(text), `ROADMAP.md mentions ${text}`);
}

const docs = [
  'ROADMAP.md',
  'README.md',
  'HOWPLAY.md',
  'docs/water_column_2p5d_sampling_model.md',
  'docs/headless_node_oceanbox_runtime.md',
  'docs/headless_bundle_loader.md',
  'docs/headless_solver_packet_roundtrip.md',
  'docs/hidden_event_forecast_correction_lifecycle.md',
  'docs/adaptive_science_diagnosis_handoff.md',
  'docs/testing.md',
  'docs/development_versions.md',
  'docs/model_stack_integration_notes.md'
];

for (const file of docs) {
  if (!exists(file)) continue;
  auditDocBoundaries(file, read(file));
}

for (const file of [
  'docs/examples/headless_oceanbox_js_public_bundle.example.json',
  'docs/examples/headless_solver_roundtrip_bundle.example.json'
]) {
  if (!exists(file)) continue;
  const payload = JSON.parse(read(file));
  assert.equal(payload.hiddenFields == null, true, `${file} should omit public hiddenFields payload`);
  assert.equal(Object.hasOwn(payload.visibleFields?.fields ?? {}, 'T_hiddenTruth'), false, `${file} visible fields must omit T_hiddenTruth`);
  assert.equal(payload.manifest?.files?.some((entry) => entry?.path === 'hidden_fields.json'), false, `${file} public manifest must omit hidden_fields.json`);
}

console.log('audit_post_p11_ui_r1_checkpoint: ok');

function auditDocBoundaries(file, text) {
  text.split(/\r?\n/).forEach((line, index) => {
    const normalized = line.trim();
    if (!normalized) return;
    const location = `${file}:${index + 1}`;
    if (/Python simulator/i.test(normalized) && !isNegatedBoundary(normalized)) {
      assert.fail(`${location} appears to claim a Python simulator: ${normalized}`);
    }
    if (/(implements?|implemented|adds?|added|trains?|training).{0,40}(MARL|RL)|\b(MARL|RL).{0,40}(implements?|implemented|training)/i.test(normalized) && !isNegatedBoundary(normalized)) {
      assert.fail(`${location} appears to claim MARL/RL implementation: ${normalized}`);
    }
    if (/full 3D planning/i.test(normalized) && !isNegatedBoundary(normalized)) {
      assert.fail(`${location} appears to claim full 3D planning implementation: ${normalized}`);
    }
  });
}

function isNegatedBoundary(line) {
  return /\b(no|not|does not|do not|without|is not|are not|must not|doesn'?t|neither|nor|future|planned|roadmap)\b/i.test(line);
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}
