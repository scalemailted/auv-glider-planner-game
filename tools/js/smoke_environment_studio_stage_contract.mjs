import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  ENVIRONMENT_STUDIO_SCENE_VERSION,
  referenceAtlasStageActionState
} from '../../src/game/phaser/scenes/EnvironmentStudioScene.js';

const root = process.cwd();
const scenePath = path.join(root, 'src/game/phaser/scenes/EnvironmentStudioScene.js');
const source = readFileSync(scenePath, 'utf8');

assert.equal(ENVIRONMENT_STUDIO_SCENE_VERSION, 'environment-staging-scene-r1');
for (const requiredText of [
  'Global Reference Bathymetry Atlas',
  'Reference Bathymetry Atlas',
  'Atlas Tools',
  'Operational Window',
  'Boundary Actions',
  'Map Layers',
  'Continue to 3D Bathymetry',
  'Inspect Low-Resolution Fallback',
  'env-reference-continue-bathymetry',
  'atlasStage',
  'Bathymetry Source'
]) {
  assert.ok(source.includes(requiredText), `EnvironmentStudioScene missing ${requiredText}`);
}

const noSelection = referenceAtlasStageActionState({});
assert.equal(noSelection.stage, 'globalAtlasSelector');
assert.equal(noSelection.selected, false);
assert.equal(noSelection.continueToBathymetryEnabled, false);
assert.equal(noSelection.patchRequestEnabled, false);
assert.equal(noSelection.multiTileRequestEnabled, false);
assert.equal(noSelection.selectedRegionNextAction, 'selectBoundary');

const montereySelection = referenceAtlasStageActionState({
  selectedReferenceWindow: {
    bounds: { westLon: -122.75, eastLon: -121.9, southLat: 36.25, northLat: 36.95 }
  },
  selectedReferenceAvailability: {
    available: true,
    status: 'missionReadyPatchAvailable',
    matchedFixtureId: 'monterey_canyon_15s',
    matchedFixtureRole: 'missionReadyPatch',
    matchedFixture: {
      fixtureId: 'monterey_canyon_15s',
      role: 'missionReadyPatch',
      tileLibraryTileSetId: 'monterey_canyon_15s',
      tileLibraryRole: 'missionReadyTileSet',
      sourceDataset: 'ETOPO_2022',
      sourceResolution: '15 arc-second',
      meshLods: [{ lod: 'medium' }]
    }
  },
  selectedReferenceBoundaryBudget: {
    budgetStatus: 'OK',
    patchRequestAllowed: true,
    recommendedAction: 'loadMissionPatch'
  }
});
assert.equal(montereySelection.continueToBathymetryEnabled, true);
assert.equal(montereySelection.patchRequestEnabled, false);
assert.equal(montereySelection.multiTileRequestEnabled, false);
assert.equal(montereySelection.tileSetId, 'monterey_canyon_15s');
assert.equal(montereySelection.tileSetRole, 'missionReadyTileSet');
assert.equal(montereySelection.selectedRegionNextAction, 'continueTo3DBathymetry');

const unstagedSelection = referenceAtlasStageActionState({
  selectedReferenceWindow: {
    bounds: { westLon: -80.8, eastLon: -79.6, southLat: 24.6, northLat: 25.8 }
  },
  selectedReferenceAvailability: {
    available: false,
    status: 'notStaged',
    recommendedAction: 'exportPatchRequest'
  },
  selectedReferenceBoundaryBudget: {
    budgetStatus: 'OK',
    patchRequestAllowed: true,
    recommendedAction: 'exportPatchRequest'
  }
});
assert.equal(unstagedSelection.continueToBathymetryEnabled, false);
assert.equal(unstagedSelection.patchRequestEnabled, true);
assert.equal(unstagedSelection.multiTileRequestEnabled, false);
assert.equal(unstagedSelection.selectedRegionNextAction, 'exportPatchRequest');

const gulfSelection = referenceAtlasStageActionState({
  selectedReferenceWindow: {
    bounds: { westLon: -94, eastLon: -84, southLat: 24, northLat: 30 }
  },
  selectedReferenceAvailability: {
    available: false,
    status: 'requestOnly',
    recommendedAction: 'exportMultiTilePatchRequest'
  },
  selectedReferenceBoundaryBudget: {
    budgetStatus: 'MULTI_TILE_REQUIRED',
    patchRequestAllowed: true,
    multiTileRecommended: true,
    recommendedAction: 'exportMultiTilePatchRequest'
  }
});
assert.equal(gulfSelection.continueToBathymetryEnabled, false);
assert.equal(gulfSelection.patchRequestEnabled, false);
assert.equal(gulfSelection.multiTileRequestEnabled, true);
assert.equal(gulfSelection.selectedRegionNextAction, 'exportMultiTilePatchRequest');

console.log('smoke_environment_studio_stage_contract: ok', {
  version: ENVIRONMENT_STUDIO_SCENE_VERSION,
  montereyNextAction: montereySelection.selectedRegionNextAction,
  unstagedNextAction: unstagedSelection.selectedRegionNextAction,
  gulfNextAction: gulfSelection.selectedRegionNextAction
});
