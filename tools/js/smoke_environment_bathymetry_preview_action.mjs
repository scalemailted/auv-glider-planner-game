import assert from 'node:assert/strict';

import {
  deriveAtlasBoundaryActions,
  referenceAtlasStageActionState
} from '../../src/game/phaser/scenes/EnvironmentStudioScene.js';

const NOT_STAGED_REGIONAL_BOUNDS = Object.freeze({
  westLon: -89.6,
  eastLon: -86.3,
  southLat: 27.8,
  northLat: 29.6
});

const GULF_BOUNDS = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});

const MONTEREY_BOUNDS = Object.freeze({
  westLon: -122.75,
  eastLon: -121.9,
  southLat: 36.25,
  northLat: 36.95
});

function validNotStagedSession() {
  return {
    selectedReferenceWindow: { bounds: NOT_STAGED_REGIONAL_BOUNDS },
    selectedReferenceAvailability: {
      available: false,
      status: 'notStaged',
      recommendedAction: 'exportPatchRequest'
    },
    selectedReferenceBoundaryBudget: {
      budgetStatus: 'OK',
      patchRequestAllowed: true,
      recommendedAction: 'exportPatchRequest',
      operationalWindow: { validSelection: true, scaleClass: 'regionalSurvey' }
    }
  };
}

function gulfSession() {
  return {
    selectedReferenceWindow: { bounds: GULF_BOUNDS },
    selectedReferenceAvailability: {
      available: false,
      status: 'requestOnly',
      recommendedAction: 'exportMultiTilePatchRequest'
    },
    selectedReferenceBoundaryBudget: {
      budgetStatus: 'MULTI_TILE_REQUIRED',
      patchRequestAllowed: true,
      multiTileRecommended: true,
      recommendedAction: 'exportMultiTilePatchRequest',
      operationalWindow: { validSelection: true, scaleClass: 'gulfScale' }
    }
  };
}

function montereySession() {
  return {
    selectedReferenceWindow: { bounds: MONTEREY_BOUNDS },
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
        meshLods: [{ lod: 'medium' }]
      }
    },
    selectedReferenceBoundaryBudget: {
      budgetStatus: 'OK',
      patchRequestAllowed: true,
      recommendedAction: 'loadMissionPatch',
      operationalWindow: { validSelection: true, scaleClass: 'localPatch' }
    }
  };
}

const noSelection = referenceAtlasStageActionState({});
assert.equal(noSelection.previewAction.validSelection, false, 'no selection is not valid');
assert.equal(noSelection.openBathymetryPreviewEnabled, false, 'preview disabled without selection');
assert.equal(noSelection.previewMode, 'unavailable', 'no-selection preview mode is unavailable');

const notStaged = referenceAtlasStageActionState(validNotStagedSession());
assert.equal(notStaged.selectedRegionScale.operationalSelectionStatus, 'VALID', 'not-staged regional box is a valid operational selection');
assert.equal(notStaged.openBathymetryPreviewEnabled, true, 'valid not-staged regional box opens preview');
assert.equal(notStaged.actionState.openCoarsePreview.label, 'Open 3D Bathymetry Preview');
assert.equal(notStaged.previewMode, 'coarsePreview', 'not-staged regional box uses coarse preview');
assert.equal(notStaged.previewSource, 'globalOverview', 'not-staged preview source is global overview');
assert.equal(notStaged.continueToBathymetryEnabled, false, 'mission-ready continuation disabled for not-staged');
assert.equal(notStaged.exportPatchRequestEnabled, true, 'patch request remains available');
assert.equal(notStaged.previewAction.stagingRequired, true, 'not-staged preview reports staging required');
assert.equal(notStaged.previewAction.recommendedAction, 'openBathymetryPreview', 'preview is recommended first for not-staged');

const gulf = referenceAtlasStageActionState(gulfSession());
assert.equal(gulf.selectedRegionScale.operationalSelectionStatus, 'VALID', 'Gulf box is a valid operational selection');
assert.equal(gulf.selectedRegionScale.generationBudgetStatus, 'MULTI_TILE_REQUIRED', 'Gulf requires multi-tile staging');
assert.equal(gulf.openBathymetryPreviewEnabled, true, 'Gulf box opens preview');
assert.equal(gulf.previewMode, 'coarsePreview', 'Gulf uses coarse preview until staged');
assert.equal(gulf.previewSource, 'globalOverview', 'Gulf preview source is global overview');
assert.equal(gulf.continueToBathymetryEnabled, false, 'mission-ready continuation disabled for Gulf request-only region');
assert.equal(gulf.exportMultiTileRequestEnabled, true, 'multi-tile request remains available');
assert.equal(gulf.previewAction.multiTileRequired, true, 'Gulf preview reports multi-tile required');

const monterey = referenceAtlasStageActionState(montereySession());
assert.equal(monterey.selectedRegionScale.operationalSelectionStatus, 'VALID', 'Monterey is a valid operational selection');
assert.equal(monterey.openBathymetryPreviewEnabled, true, 'Monterey also exposes preview action');
assert.equal(monterey.continueToBathymetryEnabled, true, 'Monterey continues to mission-ready bathymetry');
assert.equal(monterey.previewMode, 'stagedSingleTile', 'Monterey preview opens staged single-tile mode');
assert.equal(monterey.previewSource, 'hostedMissionReadyTile', 'Monterey preview source is hosted mission-ready tile');
assert.equal(monterey.previewAction.missionReadyTileAvailable, true, 'Monterey reports mission-ready tile available');

const actions = deriveAtlasBoundaryActions(validNotStagedSession());
assert.equal(actions.openCoarsePreview.enabled, true, 'derived action enables preview for valid not-staged');
assert.equal(actions.openCoarsePreview.label, 'Open 3D Bathymetry Preview', 'derived action uses product label');
assert.equal(actions.continueToBathymetry.enabled, false, 'derived continuation remains disabled for not-staged');

console.log('smoke_environment_bathymetry_preview_action: ok', {
  notStagedPreviewMode: notStaged.previewMode,
  gulfPreviewMode: gulf.previewMode,
  montereyPreviewMode: monterey.previewMode
});
