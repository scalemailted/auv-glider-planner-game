import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  ENVIRONMENT_STUDIO_SCENE_VERSION,
  deriveAtlasBoundaryActions,
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
  'Continue to Mission-Ready Bathymetry',
  'Open 3D Bathymetry Preview',
  'Inspect Low-Resolution Fallback',
  'env-reference-continue-bathymetry',
  'env-reference-open-coarse-preview',
  'atlasStage',
  'Bathymetry Source',
  'Every valid boundary can open an interactive 3D bathymetry preview',
  'This is a valid large operational window. Multi-tile preprocessing is required before mission-ready browser loading.'
]) {
  assert.ok(source.includes(requiredText), `EnvironmentStudioScene missing ${requiredText}`);
}

const noSelection = referenceAtlasStageActionState({});
assert.equal(noSelection.stage, 'globalAtlasSelector');
assert.equal(noSelection.selected, false);
assert.equal(noSelection.continueToBathymetryEnabled, false);
assert.equal(noSelection.openBathymetryPreviewEnabled, false);
assert.equal(noSelection.openCoarsePreviewEnabled, false);
assert.equal(noSelection.patchRequestEnabled, false);
assert.equal(noSelection.multiTileRequestEnabled, false);
assert.equal(noSelection.loadMissionPatchEnabled, false);
assert.equal(noSelection.exportMultiTileRequestEnabled, false);
assert.equal(noSelection.primaryAction, 'none');
assert.equal(noSelection.actionState.continueToBathymetry.variant, 'disabled');
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
assert.equal(montereySelection.openBathymetryPreviewEnabled, true);
assert.equal(montereySelection.openCoarsePreviewEnabled, true);
assert.equal(montereySelection.previewMode, 'stagedSingleTile');
assert.equal(montereySelection.previewSource, 'hostedMissionReadyTile');
assert.equal(montereySelection.previewAction.recommendedAction, 'continueToMissionReadyBathymetry');
assert.equal(montereySelection.patchRequestEnabled, false);
assert.equal(montereySelection.multiTileRequestEnabled, false);
assert.equal(montereySelection.tileSetId, 'monterey_canyon_15s');
assert.equal(montereySelection.tileSetRole, 'missionReadyTileSet');
assert.equal(montereySelection.loadMissionPatchEnabled, true);
assert.equal(montereySelection.primaryAction, 'continueToBathymetry');
assert.equal(montereySelection.actionState.continueToBathymetry.variant, 'primary');
assert.equal(montereySelection.actionState.loadMissionPatch.variant, 'secondary');
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
assert.equal(unstagedSelection.openBathymetryPreviewEnabled, true);
assert.equal(unstagedSelection.openCoarsePreviewEnabled, true);
assert.equal(unstagedSelection.previewMode, 'coarsePreview');
assert.equal(unstagedSelection.previewSource, 'globalOverview');
assert.equal(unstagedSelection.previewAction.recommendedAction, 'openBathymetryPreview');
assert.equal(unstagedSelection.patchRequestEnabled, true);
assert.equal(unstagedSelection.multiTileRequestEnabled, false);
assert.equal(unstagedSelection.loadMissionPatchEnabled, false);
assert.equal(unstagedSelection.primaryAction, 'exportPatchRequest');
assert.equal(unstagedSelection.actionState.continueToBathymetry.variant, 'disabled');
assert.equal(unstagedSelection.actionState.loadMissionPatch.variant, 'disabled');
assert.equal(unstagedSelection.actionState.exportPatchRequest.variant, 'warning');
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
assert.equal(gulfSelection.openBathymetryPreviewEnabled, true);
assert.equal(gulfSelection.openCoarsePreviewEnabled, true);
assert.equal(gulfSelection.previewMode, 'coarsePreview');
assert.equal(gulfSelection.previewSource, 'globalOverview');
assert.equal(gulfSelection.patchRequestEnabled, false);
assert.equal(gulfSelection.multiTileRequestEnabled, true);
assert.equal(gulfSelection.loadMissionPatchEnabled, false);
assert.equal(gulfSelection.exportMultiTileRequestEnabled, true);
assert.equal(gulfSelection.primaryAction, 'exportMultiTileRequest');
assert.equal(gulfSelection.actionState.continueToBathymetry.variant, 'disabled');
assert.equal(gulfSelection.actionState.loadMissionPatch.variant, 'disabled');
assert.equal(gulfSelection.actionState.exportMultiTileRequest.variant, 'warning');
assert.equal(gulfSelection.selectedRegionNextAction, 'exportMultiTilePatchRequest');
assert.equal(gulfSelection.selectedRegionScale.operationalSelectionStatus, 'VALID');
assert.equal(gulfSelection.selectedRegionScale.generationBudgetStatus, 'MULTI_TILE_REQUIRED');
assert.equal(gulfSelection.selectedRegionScale.multiTileRequired, true);
assert.equal(gulfSelection.selectedRegionScale.coarsePreviewAvailable, true);
assert.equal(gulfSelection.previewAction.multiTileRequired, true);

const gulfActions = deriveAtlasBoundaryActions({
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
assert.equal(gulfActions.primaryAction, 'exportMultiTileRequest');
assert.equal(gulfActions.openCoarsePreview.enabled, true);
assert.equal(gulfActions.openCoarsePreview.label, 'Open 3D Bathymetry Preview');
assert.equal(gulfActions.exportMultiTileRequest.enabled, true);

console.log('smoke_environment_studio_stage_contract: ok', {
  version: ENVIRONMENT_STUDIO_SCENE_VERSION,
  montereyNextAction: montereySelection.selectedRegionNextAction,
  unstagedNextAction: unstagedSelection.selectedRegionNextAction,
  gulfNextAction: gulfSelection.selectedRegionNextAction
});
