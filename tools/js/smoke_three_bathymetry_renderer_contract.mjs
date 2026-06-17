import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  THREE_BATHYMETRY_RENDERER_VERSION,
  createThreeBathymetryRenderer,
  disposeThreeBathymetryRenderer,
  setBathymetryCamera,
  setBathymetryLayerVisibility,
  threeBathymetryRendererSummary,
  updateThreeBathymetryScene
} from '../../src/game/three/ThreeBathymetryRenderer.js';

const source = fs.readFileSync('src/game/three/ThreeBathymetryRenderer.js', 'utf8');
const enable3dImplementationPattern = /from\s+['"][^'"]*(enable3d|ammo)[^'"]*['"]|import\s+[^;]*(Enable3D|Ammo)|new\s+(Enable3D|Ammo)|extends\s+(Enable3D|Ammo)/i;
assert.equal(typeof THREE_BATHYMETRY_RENDERER_VERSION, 'string');
assert.equal(typeof createThreeBathymetryRenderer, 'function');
assert.equal(typeof disposeThreeBathymetryRenderer, 'function');
assert.equal(typeof updateThreeBathymetryScene, 'function');
assert.equal(typeof setBathymetryLayerVisibility, 'function');
assert.equal(typeof setBathymetryCamera, 'function');
assert.equal(typeof threeBathymetryRendererSummary, 'function');
assert.match(source, /three\/build\/three\.module\.js|from ['"]three['"]/i, 'renderer imports Three.js');
assert.doesNotMatch(source, enable3dImplementationPattern, 'renderer does not implement Enable3D/Ammo');
assert.match(source, /usesEnable3D:\s*false/, 'renderer explicitly excludes Enable3D');
assert.match(source, /disposeThreeBathymetryRenderer/, 'renderer exposes dispose path');
assert.match(source, /ownsSimulationState:\s*false/, 'renderer boundary excludes simulation ownership');
assert.match(source, /ownsScoring:\s*false/, 'renderer boundary excludes scoring ownership');
assert.match(source, /ownsPlanning:\s*false/, 'renderer boundary excludes planning ownership');
assert.match(source, /usesFull3DPlanning:\s*false/, 'renderer boundary excludes full 3D planning');
assert.match(source, /usesWebGPUFluid:\s*false/, 'renderer boundary excludes WebGPU fluid');
assert.match(source, /usesMARL:\s*false/, 'renderer boundary excludes MARL/RL');
console.log('smoke_three_bathymetry_renderer_contract: ok');