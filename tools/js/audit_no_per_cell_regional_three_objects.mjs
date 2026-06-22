import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scalarLayer = readFileSync('src/game/three/layers/ThreeScalarFieldLayer.js', 'utf8');
const volumetricLayer = readFileSync('src/game/three/layers/ThreeVolumetricScalarFieldLayer.js', 'utf8');
const terrainLayer = readFileSync('src/game/three/layers/ThreeBathymetryTerrainLayer.js', 'utf8');
const regionalGenerator = readFileSync('src/core/generation/RegionalMissionDefaults.js', 'utf8');

assert.ok(scalarLayer.includes('new THREE.DataTexture'), 'scalar fields should render through textures');
assert.equal((scalarLayer.match(/new THREE\.Mesh\(/g) ?? []).length, 1, 'scalar field layer should use one mesh, not per-cell meshes');
assert.ok(volumetricLayer.includes('textures: new Map()'), 'volumetric fields should track textures by layer');
assert.ok(terrainLayer.includes('BufferGeometry'), 'terrain should use indexed/buffer geometry');
assert.ok(terrainLayer.includes('indexedGeometry: true'), 'terrain layer should report indexed geometry');
assert.equal(/from ['"]three['"]|from ['"][^'"]*phaser/i.test(regionalGenerator), false, 'regional generator must not import renderer runtimes');
assert.equal(/sourceArraysDrivePerCellRenderObjects:\s*true/.test(regionalGenerator), false, 'regional generator must not opt into source-array per-cell render objects');

console.log('audit_no_per_cell_regional_three_objects: ok');
