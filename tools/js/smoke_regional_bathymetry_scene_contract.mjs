import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { REGIONAL_BATHYMETRY_SCENE_VERSION } from '../../src/game/phaser/scenes/RegionalBathymetryScene.js';
import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  normalizeReferenceTileLibraryManifest
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';

const root = process.cwd();
const scenePath = path.join(root, 'src/game/phaser/scenes/RegionalBathymetryScene.js');
const sceneSource = readFileSync(scenePath, 'utf8');
const phaserSource = readFileSync(path.join(root, 'src/game/phaser/PhaserGame.js'), 'utf8');
const manifest = normalizeReferenceTileLibraryManifest(
  JSON.parse(readFileSync(path.join(root, REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH), 'utf8'))
);
const monterey = manifest.tileSets.find((tileSet) => tileSet.tileSetId === 'monterey_canyon_15s');

assert.equal(REGIONAL_BATHYMETRY_SCENE_VERSION, 'regional-bathymetry-scene-r1');
assert.ok(monterey, 'monterey_canyon_15s tile set must exist');
assert.equal(monterey.role, 'missionReadyTileSet', 'Monterey tile must remain mission-ready');
assert.equal(monterey.staged, true, 'Monterey tile must remain staged');
assert.equal(monterey.rasterTiles?.digest, 'sha256:e246e8dd8100a46c553f6a4bf9d42213afe303d6f1d308dadf79e016cd28db1f');
assert.equal(monterey.claimBoundary?.rasterGridAuthoritativeForBathymetrySampling, true);

const mediumMesh = monterey.meshLods.find((entry) => entry.lod === 'medium');
assert.ok(mediumMesh, 'Monterey medium mesh LOD is registered');
assert.equal(mediumMesh.digest, 'sha256:99c4491fa16b151c6a911e2f35c5c7d50015165b99d3161531698d3f8d769436');
assert.equal(mediumMesh.isAuthoritativeForSimulation, false);
const meshArtifact = JSON.parse(readFileSync(path.join(root, mediumMesh.path), 'utf8'));
assert.equal(meshArtifact.lod, 'medium');
assert.equal(meshArtifact.derivedFromRasterDigest, monterey.rasterTiles.digest);
assert.ok(Number(meshArtifact.vertexCount) > 0, 'mesh vertex count is finite');
assert.ok(Number(meshArtifact.triangleCount) > 0, 'mesh triangle count is finite');
assert.equal(meshArtifact.isAuthoritativeForSimulation === true, false, 'mesh artifact is not authoritative');

for (const requiredText of [
  'RegionalBathymetryScene',
  'Regional 3D Bathymetry Workspace',
  'Loaded Bathymetry Region',
  'Coarse Bathymetry Preview',
  'coarsePreview',
  'stagedSingleTile',
  'stagedMultiTile',
  'Not mission-ready. Not suitable for official simulation/scoring.',
  'This preview uses the app-hosted global overview. It is not mission-ready.',
  'interactive3dEnabled',
  'cameraControlsEnabled',
  'previewMeshGrid',
  'previewVertexCount',
  'previewTriangleCount',
  'Generate 3D Bathymetry / Confirm Bathymetry',
  'Generate Currents & Science Fields',
  'renderedPreview',
  'missionReady',
  'fieldGenerationEnabled',
  'benchmarkExportEnabled',
  'stagingRequired',
  'previewSource',
  'previewGridShape',
  'rasterAuthoritativeForSimulation',
  'meshAuthoritativeForSimulation: false',
  'planningLaunchEnabled',
  'noaaRuntimeFetchRequired: false',
  'gebcoRuntimeFetchRequired: false',
  'rawExternalDataPathExposed: false',
  'localAbsolutePathExposed: false',
  'hiddenTruthExposed: false',
  'simulationChanged: false',
  'scoringChanged: false',
  'plannerChanged: false',
  'fieldEquationsChanged: false'
]) {
  assert.ok(sceneSource.includes(requiredText), `RegionalBathymetryScene missing ${requiredText}`);
}

assert.ok(phaserSource.includes("import { RegionalBathymetryScene }"), 'PhaserGame imports RegionalBathymetryScene');
assert.ok(phaserSource.includes('RegionalBathymetryScene,'), 'PhaserGame registers RegionalBathymetryScene');
assert.ok(phaserSource.includes("regionalBathymetry: 'RegionalBathymetryScene'"), 'PhaserGame exposes regionalBathymetry alias');
assert.doesNotMatch(sceneSource, /external_data[\\/]/i, 'scene source must not expose external_data path');
assert.doesNotMatch(sceneSource, /https?:\/\/[^"'\s]*(?:noaa|gebco|ngdc|ncei)/i, 'scene source must not fetch NOAA/GEBCO');

console.log('smoke_regional_bathymetry_scene_contract: ok', {
  version: REGIONAL_BATHYMETRY_SCENE_VERSION,
  tileSetId: monterey.tileSetId,
  rasterDigest: monterey.rasterTiles.digest,
  meshDigest: mediumMesh.digest,
  vertexCount: meshArtifact.vertexCount,
  triangleCount: meshArtifact.triangleCount
});
