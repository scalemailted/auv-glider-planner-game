import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rendererFiles = [
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/layers/ThreeOperationalDepthSlabLayer.js',
  'src/game/three/layers/ThreeWaterColumnVolumeFrameLayer.js',
  'src/game/three/ThreeMissionHitTest.js'
];
for (const file of rendererFiles) {
  const source = readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /new\s+SimulationEngine/);
  assert.doesNotMatch(source, /summarizeScore|computeScore|scoreMission/);
  assert.doesNotMatch(source, /RouteScopedViewHost|AnchorBrowserRuntime|src\/app\/main\.js/);
  assert.doesNotMatch(source, /navigator\.gpu|requestAdapter\s*\(|GPUCanvasContext|GPUTextureUsage|GPUBufferUsage/);
}
const index = readFileSync('index.html', 'utf8');
assert.match(index, /src\/game\/main\.js/);
assert.doesNotMatch(index, /src\/app\/main\.js/);
const defaults = readFileSync('src/core/science/WaterColumnMissionDefaults.js', 'utf8');
assert.match(defaults, /calibrated:\s*false/);
assert.match(defaults, /surfaceOnly/);
assert.doesNotMatch(defaults, /operational ocean forecast|operational forecast model/i);
assert.match(defaults, /not a calibrated ocean forecast/i);
console.log('audit_volumetric_activation_boundaries passed');