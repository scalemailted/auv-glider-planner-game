import assert from 'node:assert/strict';
import fs from 'node:fs';

const simulationScene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const missionScene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const viewModel = fs.readFileSync('src/core/rendering/VolumetricMissionWorldViewModel.js', 'utf8');

for (const field of [
  'currentVisualizationAvailable',
  'currentPresentationRequested',
  'currentPresentationEnabled',
  'currentDisplayMode',
  'currentActiveLayerId',
  'currentActiveDepthMeters',
  'currentActiveTimeSeconds',
  'currentVectorSampleCount',
  'currentVectorValidCount'
]) {
  assert.ok(viewModel.includes(field), `volumetric render view model exposes ${field}`);
  assert.ok(simulationScene.includes(field), `Simulation render debug exposes ${field}`);
}
assert.match(simulationScene, /volumetricCurrentDebugPayload\(viewModel/, 'Simulation publishes compact volumetric current debug');
assert.match(missionScene, /volumetricCurrentDebugPayload\(viewModel/, 'Planning publishes compact volumetric current debug');
assert.match(simulationScene, /currentDisplay'\) !== 'safe'/, 'Simulation current layer visibility honors explicit safe query');
assert.match(missionScene, /currentDisplay'\) !== 'safe'/, 'Planning current layer visibility honors explicit safe query');
assert.doesNotMatch(viewModel, /eastVelocityCube|northVelocityCube|verticalVelocityCube/, 'render view model does not expose full current cube arrays');

console.log('audit_current_simulation_render_plumbing: ok');
