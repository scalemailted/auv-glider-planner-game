import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildRegionalBathymetryPreviewViewModel,
  REGIONAL_BATHYMETRY_SCENE_VERSION
} from '../../src/game/phaser/scenes/RegionalBathymetryScene.js';
import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  normalizeReferenceTileLibraryManifest
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';

const root = process.cwd();
const sceneSource = readFileSync(path.join(root, 'src/game/phaser/scenes/RegionalBathymetryScene.js'), 'utf8');
const panelsSource = readFileSync(path.join(root, 'css/panels.css'), 'utf8');

for (const requiredText of [
  'createThreeBathymetryRenderer',
  'updateThreeBathymetryScene',
  'setBathymetryCamera',
  'setBathymetryLayerVisibility',
  'data-regional-bathymetry-three-host',
  'regional-bathymetry-three-shell',
  'interactive3dEnabled',
  'cameraControlsEnabled',
  'PREVIEW_MESH_CAP',
  'previewMeshGrid',
  'previewVertexCount',
  'previewTriangleCount',
  'Preview mesh is decimated for browser interaction'
]) {
  assert.ok(sceneSource.includes(requiredText), `RegionalBathymetryScene missing ${requiredText}`);
}
assert.ok(panelsSource.includes('.regional-bathymetry-three-shell'), 'Three preview shell CSS exists');

const largeBounds = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});
const largePreview = buildRegionalBathymetryPreviewViewModel({
  mode: 'coarsePreview',
  meshDetail: 'high',
  selectedBounds: largeBounds,
  overviewMetadata: {
    label: 'ETOPO 2022 Global Overview',
    sourceDataset: 'ETOPO_2022',
    sourceResolution: '60 arc-second overview',
    digest: 'sha256:overview-smoke'
  },
  boundaryBudget: {
    budgetStatus: 'MULTI_TILE_REQUIRED',
    estimatedColumns: 1800,
    estimatedRows: 1080,
    sourceCellCount: 1944000
  },
  sourceDataset: 'ETOPO_2022',
  verticalExaggeration: 2
});

assert.equal(REGIONAL_BATHYMETRY_SCENE_VERSION, 'regional-bathymetry-scene-r1');
assert.equal(largePreview.mode, 'coarsePreview');
assert.equal(largePreview.rendererType, 'three');
assert.equal(largePreview.interactive3dEnabled, true, 'coarse preview is interactive');
assert.equal(largePreview.cameraControlsEnabled, true, 'coarse preview has camera controls');
assert.ok(largePreview.previewMeshGrid.columns <= 240, 'large preview columns are under cap');
assert.ok(largePreview.previewMeshGrid.rows <= 160, 'large preview rows are under cap');
assert.ok(largePreview.previewVertexCount <= 40000, 'large preview vertices are under cap');
assert.ok(largePreview.previewTriangleCount > 0, 'large preview triangles are generated');
assertFiniteMesh(largePreview.terrainMeshGeometry, 'large coarse preview mesh');
assert.ok(largePreview.plannedPath.length >= 5, 'large selected boundary path is present');
assert.ok(largePreview.contourGeometry.segments.length > 0, 'large contour overlay is generated');
assert.equal(largePreview.terrainMeshGeometry.sourceType, 'globalOverviewLod');
assert.equal(largePreview.terrainMeshGeometry.previewDecimated, true);

const manifest = normalizeReferenceTileLibraryManifest(
  JSON.parse(readFileSync(path.join(root, REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH), 'utf8'))
);
const monterey = manifest.tileSets.find((tileSet) => tileSet.tileSetId === 'monterey_canyon_15s');
assert.ok(monterey, 'Monterey staged tile set exists');
const mediumMesh = monterey.meshLods.find((entry) => entry.lod === 'medium');
assert.ok(mediumMesh, 'Monterey medium mesh LOD exists');
const meshArtifact = JSON.parse(readFileSync(path.join(root, mediumMesh.path), 'utf8'));

const stagedPreview = buildRegionalBathymetryPreviewViewModel({
  mode: 'stagedSingleTile',
  meshDetail: 'high',
  selectedBounds: monterey.bounds,
  meshArtifact,
  meshLodRecord: mediumMesh,
  tileSetMetadata: monterey,
  sourceDataset: monterey.sourceDataset,
  sourceDigest: monterey.rasterTiles?.digest,
  verticalExaggeration: 1.8
});

assert.equal(stagedPreview.mode, 'stagedSingleTile');
assert.equal(stagedPreview.interactive3dEnabled, true, 'staged preview is interactive');
assert.equal(stagedPreview.terrainMeshGeometry.sourceType, 'stagedMeshLod');
assert.ok(stagedPreview.previewMeshGrid.columns <= 240, 'staged preview columns are under cap');
assert.ok(stagedPreview.previewMeshGrid.rows <= 160, 'staged preview rows are under cap');
assert.ok(stagedPreview.previewVertexCount <= 40000, 'staged preview vertices are under cap');
assert.ok(stagedPreview.previewTriangleCount > 0, 'staged preview triangles are generated');
assertFiniteMesh(stagedPreview.terrainMeshGeometry, 'staged Monterey mesh');
assert.equal(stagedPreview.terrainMeshGeometry.meshDigest, meshArtifact.digest ?? mediumMesh.digest ?? monterey.rasterTiles?.digest);
assert.equal(meshArtifact.isAuthoritativeForSimulation === true, false, 'staged mesh remains visualization-only');
assert.equal(monterey.claimBoundary?.rasterGridAuthoritativeForBathymetrySampling, true, 'raster remains authoritative');

console.log('smoke_regional_bathymetry_interactive_mesh: ok', {
  largeGrid: largePreview.previewMeshGrid,
  largeVertices: largePreview.previewVertexCount,
  montereyGrid: stagedPreview.previewMeshGrid,
  montereyVertices: stagedPreview.previewVertexCount
});

function assertFiniteMesh(geometry, label) {
  assert.ok(geometry, `${label} exists`);
  assert.ok(Number(geometry.width) > 1, `${label} width`);
  assert.ok(Number(geometry.height) > 1, `${label} height`);
  assert.equal(geometry.vertexCount, geometry.width * geometry.height, `${label} vertex count matches grid`);
  assert.equal(geometry.positions.length, geometry.vertexCount * 3, `${label} positions length`);
  assert.equal(geometry.colors.length, geometry.vertexCount * 3, `${label} colors length`);
  assert.equal(geometry.uvs.length, geometry.vertexCount * 2, `${label} uv length`);
  assert.equal(geometry.indices.length, geometry.triangleCount * 3, `${label} index length`);
  for (const value of [
    ...geometry.positions.slice(0, 60),
    ...geometry.colors.slice(0, 60),
    ...geometry.uvs.slice(0, 40),
    ...geometry.depths.slice(0, 20)
  ]) {
    assert.ok(Number.isFinite(Number(value)), `${label} has finite numeric geometry values`);
  }
}
