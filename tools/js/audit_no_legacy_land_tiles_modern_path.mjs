import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modernTerrainFiles = [
  'src/core/generation/RegionalMissionDefaults.js',
  'src/core/science/SignedTerrainSurfaceModel.js',
  'src/core/rendering/MissionWorldRenderViewModel.js',
  'src/game/three/layers/ThreeBathymetryTerrainLayer.js',
  'src/game/three/layers/ThreeLandmassLayer.js'
];

for (const file of modernTerrainFiles) {
  const text = readFileSync(file, 'utf8');
  assert.equal(/new\s+THREE\.BoxGeometry/.test(text), false, `${file} must not create per-cell terrain or land boxes`);
  assert.equal(/makeBoxCell\(/.test(text), false, `${file} must not route modern terrain through box-cell helpers`);
  assert.equal(/land tile|blockedTile|cellWall|tileWall|createLandTile|renderLandTile/i.test(text), false, `${file} must not reference legacy land-tile rendering`);
}

const regional = readFileSync('src/core/generation/RegionalMissionDefaults.js', 'utf8');
assert.ok(regional.includes('createSignedTerrainSurfaceFromBathymetry'), 'regional generator must create signed terrain from bathymetry');
assert.ok(regional.includes('sampleSignedTerrainSurfaceAtUv'), 'regional field masks must sample signed terrain authority');
assert.ok(regional.includes('signedTerrainSurface.digest'), 'regional source digests must come from signed terrain');
const renderViewModel = readFileSync('src/core/rendering/MissionWorldRenderViewModel.js', 'utf8');
assert.ok(renderViewModel.includes('terrainAuthority.usesSignedTerrainAuthority === true'), 'signed terrain missions must suppress legacy constraint-cell terrain boxes');
assert.equal(/Math\.random\(|randomLand|generateLand/i.test(regional), false, 'regional generator must not create an independent random land mask');

const landmass = readFileSync('src/game/three/layers/ThreeLandmassLayer.js', 'utf8');
assert.ok(landmass.includes('canonical-landmass-display-mesh'), 'landmass display must use a canonical mesh');
assert.ok(landmass.includes('landTileMeshCount: 0'), 'landmass summary must report zero land-tile meshes');
assert.ok(landmass.includes('usesPerCellLandMeshes: false'), 'landmass summary must reject per-cell land meshes');

console.log('audit_no_legacy_land_tiles_modern_path: ok');
