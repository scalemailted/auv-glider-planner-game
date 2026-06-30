import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  RegionalBathymetryScene,
  REGIONAL_BATHYMETRY_SCENE_VERSION
} from '../../src/game/phaser/scenes/RegionalBathymetryScene.js';

const root = process.cwd();
const source = readFileSync(path.join(root, 'src/game/phaser/scenes/RegionalBathymetryScene.js'), 'utf8');

const selectedBounds = Object.freeze({
  westLon: -89.6,
  eastLon: -86.3,
  southLat: 27.8,
  northLat: 29.6
});

const scene = new RegionalBathymetryScene();
scene.init({
  source: 'environmentStudioAtlas',
  mode: 'coarsePreview',
  selectedBounds,
  previewSource: 'globalOverview',
  sourceDataset: 'ETOPO_2022',
  overviewMetadata: {
    label: 'ETOPO 2022 Global Overview',
    sourceDataset: 'ETOPO_2022',
    sourceResolution: '60 arc-second overview',
    digest: 'sha256:test-overview',
    bounds: { westLon: -180, eastLon: 180, southLat: -90, northLat: 90 }
  },
  boundaryBudget: {
    budgetStatus: 'OK',
    sourceCellCount: 128000,
    fieldGridEstimate: { columns: 200, rows: 110 },
    patchRequestAllowed: true
  },
  missionReady: false,
  fieldGenerationEnabled: false,
  planningLaunchEnabled: false,
  benchmarkExportEnabled: false,
  stagingRequired: true,
  session: {
    selectedReferenceWindow: { bounds: selectedBounds },
    referencePatchRequest: {
      artifactType: 'anchor.reference-bathymetry-patch-request',
      suggestedFixtureId: 'preview_smoke_patch',
      claimBoundary: { hiddenTruthExposed: false }
    }
  }
});
scene.statusMessage = 'Opened coarse bathymetry preview from the app-hosted global overview.';
scene.session = scene.prepareRegionalSession(scene.session);
assert.equal(scene.isCoarsePreview(), true, 'scene identifies coarse preview mode');
scene.publishDebug(true);

const debug = globalThis.ANCHOR_REGIONAL_BATHYMETRY_DEBUG;
assert.equal(REGIONAL_BATHYMETRY_SCENE_VERSION, 'regional-bathymetry-scene-r1');
assert.equal(debug.mode, 'coarsePreview', 'debug mode is coarsePreview');
assert.equal(debug.openedFromAtlasBoundary, true, 'coarse preview opened from atlas boundary');
assert.deepEqual(debug.selectedBounds, selectedBounds, 'selected bounds preserved');
assert.equal(debug.previewSource, 'globalOverview', 'preview source is global overview');
assert.ok(Number(debug.previewGridShape?.columns) > 0, 'preview grid columns are finite');
assert.ok(Number(debug.previewGridShape?.rows) > 0, 'preview grid rows are finite');
assert.ok(Number(debug.previewGridShape?.columns) <= 240, 'preview grid columns are decimated under cap');
assert.ok(Number(debug.previewGridShape?.rows) <= 160, 'preview grid rows are decimated under cap');
assert.ok(Number(debug.previewVertexCount) <= 40000, 'preview vertex count is decimated under cap');
assert.equal(debug.renderedPreview, true, 'debug reports rendered preview');
assert.equal(debug.missionReady, false, 'coarse preview is not mission-ready');
assert.equal(debug.fieldGenerationEnabled, false, 'coarse preview disables field generation');
assert.equal(debug.planningLaunchEnabled, false, 'coarse preview disables Planning launch');
assert.equal(debug.benchmarkExportEnabled, false, 'coarse preview disables benchmark export');
assert.equal(debug.stagingRequired, true, 'coarse preview reports staging required');
assert.equal(debug.rasterAuthoritativeForSimulation, false, 'coarse raster is not simulation-authoritative');
assert.equal(debug.meshAuthoritativeForSimulation, false, 'coarse mesh is not simulation-authoritative');
assert.equal(debug.noaaRuntimeFetchRequired, false, 'no NOAA runtime fetch required');
assert.equal(debug.gebcoRuntimeFetchRequired, false, 'no GEBCO runtime fetch required');
assert.equal(debug.rawExternalDataPathExposed, false, 'raw external data path not exposed');
assert.equal(debug.hiddenTruthExposed, false, 'hidden truth not exposed');
assert.equal(debug.simulationChanged, false, 'simulation unchanged');
assert.equal(debug.scoringChanged, false, 'scoring unchanged');
assert.equal(debug.plannerChanged, false, 'planner unchanged');
assert.equal(debug.fieldEquationsChanged, false, 'field equations unchanged');

for (const requiredText of [
  'Coarse Bathymetry Preview',
  'app-hosted global overview',
  'Export Multi-Tile Request',
  'Export Patch Request',
  'fieldGenerationEnabled',
  'benchmarkExportEnabled',
  'interactive3dEnabled',
  'previewMeshGrid',
  'previewVertexCount',
  'previewTriangleCount',
  'stagingRequired',
  'noaaRuntimeFetchRequired: false',
  'gebcoRuntimeFetchRequired: false'
]) {
  assert.ok(source.includes(requiredText), `RegionalBathymetryScene missing ${requiredText}`);
}
assert.doesNotMatch(source, /https?:\/\/[^"'\s]*(?:noaa|gebco|ngdc|ncei)/i, 'scene source must not fetch NOAA/GEBCO');
assert.doesNotMatch(source, /external_data[\\/]/i, 'scene source must not expose external_data paths');

console.log('smoke_regional_bathymetry_coarse_preview: ok', {
  mode: debug.mode,
  previewSource: debug.previewSource,
  renderedPreview: debug.renderedPreview,
  missionReady: debug.missionReady
});
