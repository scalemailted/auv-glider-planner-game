import assert from 'node:assert/strict';

import {
  deriveAtlasBoundaryActions,
  referenceAtlasStageActionState
} from '../../src/game/phaser/scenes/EnvironmentStudioScene.js';

function missionReadySession() {
  return {
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
  };
}

function unstagedSession() {
  return {
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
  };
}

function gulfSession() {
  return {
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
  };
}

const noSelection = referenceAtlasStageActionState({});
assert.equal(noSelection.primaryAction, 'none');
assert.equal(noSelection.continueToBathymetryEnabled, false);
assert.equal(noSelection.loadMissionPatchEnabled, false);
assert.equal(noSelection.exportPatchRequestEnabled, false);
assert.equal(noSelection.exportMultiTileRequestEnabled, false);
assert.equal(noSelection.actionState.continueToBathymetry.variant, 'disabled');

const monterey = referenceAtlasStageActionState(missionReadySession());
assert.equal(monterey.primaryAction, 'continueToBathymetry');
assert.equal(monterey.continueToBathymetryEnabled, true);
assert.equal(monterey.loadMissionPatchEnabled, true);
assert.equal(monterey.exportPatchRequestEnabled, false);
assert.equal(monterey.exportMultiTileRequestEnabled, false);
assert.equal(monterey.actionState.continueToBathymetry.variant, 'primary');
assert.equal(monterey.actionState.loadMissionPatch.variant, 'secondary');

const unstaged = referenceAtlasStageActionState(unstagedSession());
assert.equal(unstaged.primaryAction, 'exportPatchRequest');
assert.equal(unstaged.continueToBathymetryEnabled, false);
assert.equal(unstaged.loadMissionPatchEnabled, false);
assert.equal(unstaged.exportPatchRequestEnabled, true);
assert.equal(unstaged.exportMultiTileRequestEnabled, false);
assert.equal(unstaged.actionState.continueToBathymetry.variant, 'disabled');
assert.equal(unstaged.actionState.loadMissionPatch.variant, 'disabled');
assert.equal(unstaged.actionState.exportPatchRequest.variant, 'warning');

const gulf = referenceAtlasStageActionState(gulfSession());
assert.equal(gulf.primaryAction, 'exportMultiTileRequest');
assert.equal(gulf.continueToBathymetryEnabled, false);
assert.equal(gulf.loadMissionPatchEnabled, false);
assert.equal(gulf.exportPatchRequestEnabled, false);
assert.equal(gulf.exportMultiTileRequestEnabled, true);
assert.equal(gulf.actionState.continueToBathymetry.variant, 'disabled');
assert.equal(gulf.actionState.loadMissionPatch.variant, 'disabled');
assert.equal(gulf.actionState.exportMultiTileRequest.variant, 'warning');

const directActions = deriveAtlasBoundaryActions(gulfSession());
assert.equal(directActions.primaryAction, 'exportMultiTileRequest');
assert.equal(directActions.exportMultiTileRequest.enabled, true);
assert.match(directActions.continueToBathymetry.reason, /Multi-tile preprocessing/);

console.log('smoke_environment_studio_action_state: ok', {
  noSelectionPrimaryAction: noSelection.primaryAction,
  montereyPrimaryAction: monterey.primaryAction,
  unstagedPrimaryAction: unstaged.primaryAction,
  gulfPrimaryAction: gulf.primaryAction
});
