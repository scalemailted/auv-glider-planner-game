import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/ThreeBathymetryRenderer.js',
  'src/game/three/layers/ThreeBathymetryTerrainLayer.js',
  'src/game/three/layers/ThreeLandmassLayer.js',
  'src/game/three/layers/ThreeCoastlineLayer.js',
  'src/core/rendering/BathymetryMeshGeometry.js'
];
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

assert.doesNotMatch(source, /navigator\.gpu|WebGPURenderer|GPUCanvasContext/i, 'no WebGPU terrain path');
assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|GEBCO|ETOPO|Copernicus|Natural Earth|NOAA/i, 'no external bathymetry fetch or operational data claim');
assert.doesNotMatch(source, /raycast.*(collision|physics|score|feasibility)/i, 'visual terrain raycast does not own physics/scoring');
assert.match(source, /rendererOwnsBathymetry:\s*false/, 'renderer boundary excludes bathymetry ownership');
assert.match(source, /usesVisualMeshForPhysics:\s*false/, 'visual mesh is not physics authority');
assert.doesNotMatch(source, /free.?flight|arbitrary XYZ planner/i, 'no arbitrary XYZ planner added');
console.log('audit_bathymetry_renderer_boundaries_v2: ok');
