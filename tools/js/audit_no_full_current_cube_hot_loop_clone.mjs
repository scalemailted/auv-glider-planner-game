import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'src/core/sim/TruthWorld.js',
  'src/core/rendering/WaterColumnLayerExplorerViewModel.js',
  'src/core/rendering/VolumetricMissionWorldViewModel.js',
  'src/game/three/ThreeMissionWorldRenderer.js'
];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  assert.equal(/JSON\.parse\(JSON\.stringify\([^)]*current|structuredClone\([^)]*currentCube|structuredClone\([^)]*currentField4D/.test(source), false, `${file} must not clone full current cubes in hot paths`);
}
console.log('[audit_no_full_current_cube_hot_loop_clone] PASS');