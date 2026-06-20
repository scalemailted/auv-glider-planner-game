import fs from 'node:fs';
import assert from 'node:assert/strict';

const productionFiles = [
  'index.html',
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/ThreeBathymetryRenderer.js',
  'src/core/rendering/BathymetryWorldRenderViewModel.js',
  'src/game/phaser/scenes/MissionWorkspaceScene.js',
  'src/game/phaser/scenes/SimulationScene.js',
  'src/game/phaser/scenes/BathymetryWorldViewScene.js'
];

const rows = [];
for (const file of productionFiles) {
  const text = fs.readFileSync(file, 'utf8');
  rows.push({
    file,
    importsSharedTerrainLayer: /ThreeBathymetryTerrainLayer/.test(text),
    importsLegacyTerrainMeshData: /bathymetryToTerrainMeshData/.test(text),
    activeRevertedRuntimeReference: /AnchorBrowserRuntime|RouteScopedViewHost|src\/app\/main\.js/.test(text),
    boxedTerrainConstruction: /bathymetry|terrain/i.test(file) && /new\s+THREE\.BoxGeometry/.test(text),
    staleStandaloneTerrainHelper: /function\s+addTerrain|function\s+addCoastline/.test(text)
  });
}

const index = fs.readFileSync('index.html', 'utf8');
assert.match(index, /src\/game\/main\.js/, 'index.html must use the production game runtime');
assert.doesNotMatch(index, /src\/app\/main\.js/, 'index.html must not use the reverted DOM runtime');

const missionRenderer = rows.find((row) => row.file.endsWith('ThreeMissionWorldRenderer.js'));
const bathymetryRenderer = rows.find((row) => row.file.endsWith('ThreeBathymetryRenderer.js'));
assert.equal(missionRenderer.importsSharedTerrainLayer, true, 'Mission renderer must import the shared terrain layer family');
assert.equal(bathymetryRenderer.importsSharedTerrainLayer, true, 'Bathymetric world renderer must import the shared terrain layer family');

for (const row of rows) {
  assert.equal(row.activeRevertedRuntimeReference, false, `${row.file} references the reverted runtime`);
  assert.equal(row.importsLegacyTerrainMeshData, false, `${row.file} imports bathymetryToTerrainMeshData in production`);
  assert.equal(row.boxedTerrainConstruction, false, `${row.file} contains boxed terrain construction`);
  assert.equal(row.staleStandaloneTerrainHelper, false, `${row.file} contains stale standalone terrain helpers`);
}

console.log(JSON.stringify({
  ok: true,
  checkedFiles: rows.length,
  productionSharedTerrainFiles: rows.filter((row) => row.importsSharedTerrainLayer).map((row) => row.file),
  legacyProductionImportCount: rows.filter((row) => row.importsLegacyTerrainMeshData || row.boxedTerrainConstruction || row.staleStandaloneTerrainHelper).length
}));
