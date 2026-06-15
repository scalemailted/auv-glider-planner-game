import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildFlowDemoDiagnostics,
  createDemoTerrain,
  FLOW_DEMO_GRID,
  FLOW_DEMO_PRESET_CHOICES
} from '../../src/core/demo/FlowFieldDemo.js';
import {
  getVectorPresetScientificMetadata,
  validateVectorPresetScientificMetadata
} from '../../src/core/generation/VectorFieldPresets.js';
import { FlowFieldDemoScene } from '../../src/game/phaser/scenes/FlowFieldDemoScene.js';

assert.ok(FLOW_DEMO_PRESET_CHOICES.length >= 5, 'Flow demo preset options exist');

const terrain = createDemoTerrain({
  mode: 'blendedCoastal',
  seed: 'flow-demo-smoke',
  grid: FLOW_DEMO_GRID
});

for (const presetId of FLOW_DEMO_PRESET_CHOICES) {
  const metadata = getVectorPresetScientificMetadata(presetId);
  const metadataValidation = validateVectorPresetScientificMetadata(metadata);
  assert.equal(metadataValidation.valid, true, `${presetId} metadata should be complete: ${metadataValidation.errors.join('; ')}`);
  assert.ok(metadata.notA, `${presetId} metadata includes a notA claim boundary`);
  const diagnostics = buildFlowDemoDiagnostics({
    fieldMode: 'dynamic',
    primaryPreset: presetId,
    terrain,
    directionVariation: 'medium',
    magnitudeVariation: 'medium',
    dynamicComplexity: 'medium',
    evolutionPattern: 'composite',
    evolutionBehavior: 'continuous',
    cycleDuration: 60,
    spatialMotion: 'none',
    spatialMotionSpeed: 1,
    boundaryMode: 'deflectAlongShore'
  }, 12, {
    deterministicSeed: 'flow-demo-smoke',
    presetMetadata: metadata
  });
  assert.equal(diagnostics.invalidVectorCount, 0, `${presetId} diagnostics should have no invalid vectors`);
  assert.ok(Number.isFinite(diagnostics.speedStats.mean), `${presetId} speed diagnostics should be finite`);
}

const scene = new FlowFieldDemoScene();
scene.init({
  fieldMode: 'dynamic',
  preset: 'uniformDrift',
  terrainMode: 'blendedCoastal',
  terrainSeed: 'flow-demo-smoke',
  exportMode: 'currentFrame'
});
const artifact = scene.buildDemoArtifactExport();
assert.equal(artifact.type, 'anchor.demo.flow-field', 'Flow demo export type is stable');
assert.ok(artifact.flowFieldDiagnostics, 'Flow demo export includes flowFieldDiagnostics');
assert.ok(artifact.flowFieldModel, 'Flow demo export includes flowFieldModel');
assert.ok(artifact.frames?.[0]?.flowFieldDiagnostics, 'Flow demo export frame includes diagnostics');
assert.equal(artifact.flowFieldModel.presetId, 'uniformDrift', 'Flow model metadata preserves preset id');
assert.ok(artifact.flowFieldModel.notA, 'Flow model metadata preserves notA claim boundary');

const consoleSource = fs.readFileSync('src/ui/MissionConsole.js', 'utf8');
for (const label of ['Playback Speed', 'Flow Evolution Speed', 'Particle Speed', 'Magnitude Scale', 'Current Field Diagnostics']) {
  assert.ok(consoleSource.includes(label), `Flow demo UI label is present: ${label}`);
}
assert.ok(/synthetic/i.test(consoleSource), 'Flow demo UI includes synthetic claim boundary language');

console.log('Flow field demo smoke passed');
