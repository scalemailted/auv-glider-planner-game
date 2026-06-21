import assert from 'node:assert/strict';
import fs from 'node:fs';

const diagnostics = fs.readFileSync('src/core/simulation/TerrainSimulationDiagnostics.js', 'utf8');
const simulation = fs.readFileSync('src/core/sim/SimulationEngine.js', 'utf8');
const threeSources = [
  'src/game/three/ThreeMissionInteractionController.js',
  'src/game/three/ThreeMissionCameraController.js',
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/layers/ThreeTerrainValidationLayer.js'
].map((path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '').join('\n');

assert.match(diagnostics, /sampleBathymetryContinuous/);
assert.doesNotMatch(diagnostics, /from ['"].*three|Phaser|document|window|requestAnimationFrame/);
assert.match(simulation, /updateTerrainSimulationDiagnostics/);
assert.match(simulation, /recordTerrainSimulationObservation/);
assert.match(simulation, /recordTerrainSimulationSurfacing/);
assert.doesNotMatch(threeSources, /createTerrainSimulationDiagnostics|updateTerrainSimulationDiagnostics|recordTerrainSimulationObservation|recordTerrainSimulationSurfacing/);
assert.doesNotMatch(diagnostics + simulation + threeSources, /changesOfficialScoring:\s*true/);
assert.doesNotMatch(diagnostics + simulation + threeSources, /usesNewPlanner:\s*true|usesMARL:\s*true|usesWebGPUFluid:\s*true/);
assert.doesNotMatch(diagnostics, /usesHiddenTruth:\\s*true|T_hiddenTruth|hiddenTruthField/i);
assert.match(diagnostics, /generatedFromVisualInterpolation:\s*false/);
assert.match(diagnostics, /rendererOwned:\s*false/);

console.log('terrain runtime event boundary audit passed');
