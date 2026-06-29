import assert from 'node:assert/strict';
import {
  estimateReferenceAtlasBoundaryBudget,
  estimateReferenceAtlasOperationalWindow,
  referenceAtlasBoundsForOperationalPreset
} from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  referenceAtlasBoundsFromDrag,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  createEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow
} from '../../src/core/editor/EnvironmentStudioProject.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { atlas, manifest, overviewArtifact, overviewRasterArtifact, referenceFixtures } = await loadReferenceAtlasFixtureContext();

const localBounds = referenceAtlasBoundsForOperationalPreset({ centerLon: -122.25, centerLat: 36.6 }, 'localPatch');
const localWindow = estimateReferenceAtlasOperationalWindow(localBounds, { userIntent: 'localPatch' });
const localBudget = estimateReferenceAtlasBoundaryBudget(localBounds, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(localWindow.validSelection, true, 'local operational window is valid');
assert.equal(localWindow.scaleClass, 'localPatch', 'local preset is classified as localPatch');
assert.equal(localBudget.patchRequestAllowed, true, 'local window can export a patch request');
assert.notEqual(localBudget.budgetStatus, 'MULTI_TILE_REQUIRED', 'local window does not require multi-tile preprocessing');

const regionalBounds = referenceAtlasBoundsForOperationalPreset({ centerLon: -122.25, centerLat: 36.6 }, 'regionalSurvey');
const regionalWindow = estimateReferenceAtlasOperationalWindow(regionalBounds, { userIntent: 'regionalSurvey' });
const regionalBudget = estimateReferenceAtlasBoundaryBudget(regionalBounds, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(regionalWindow.validSelection, true, 'regional operational window is valid');
assert.equal(regionalWindow.scaleClass, 'regionalSurvey', 'regional preset is classified as regionalSurvey');
assert.equal(regionalBudget.patchRequestAllowed, true, 'regional window can export a patch request even if live generation warns or blocks');

const gulfBounds = {
  westLon: -94,
  eastLon: -84,
  southLat: 24,
  northLat: 30
};
const gulfWindow = estimateReferenceAtlasOperationalWindow(gulfBounds, { userIntent: 'gulfSegment' });
const gulfBudget = estimateReferenceAtlasBoundaryBudget(gulfBounds, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(gulfWindow.validSelection, true, 'Gulf-scale operational window is valid');
assert.equal(gulfWindow.scaleClass, 'gulfScale', 'Gulf bounds classify as gulfScale');
assert.equal(gulfBudget.budgetStatus, 'MULTI_TILE_REQUIRED', 'Gulf window is a multi-tile request, not a tiny live patch');
assert.equal(gulfBudget.generationAllowed, false, 'Gulf window disables live browser generation');
assert.equal(gulfBudget.patchRequestAllowed, true, 'Gulf window allows patch request export');
assert.equal(gulfBudget.multiTileRecommended, true, 'Gulf window recommends multi-tile preprocessing');
assert.equal(gulfBudget.recommendedAction, 'exportMultiTilePatchRequest', 'Gulf window recommends multi-tile request export');

const tinyClickBounds = referenceAtlasBoundsFromDrag(
  { lon: -90, lat: 25 },
  { lon: -90.00001, lat: 25.00001 },
  { minimumPresetId: 'localPatch' }
);
const tinyExpandedWindow = estimateReferenceAtlasOperationalWindow(tinyClickBounds, { userIntent: 'tiny-click-expanded' });
assert.equal(tinyExpandedWindow.validSelection, true, 'tiny click expands to a valid operational window');
assert.ok(tinyExpandedWindow.widthKm >= 80, `tiny click width expanded to usable scale: ${tinyExpandedWindow.widthKm}`);
assert.ok(tinyExpandedWindow.heightKm >= 80, `tiny click height expanded to usable scale: ${tinyExpandedWindow.heightKm}`);

const montereyAvailability = referenceFixtureAvailabilityForBounds(atlas, {
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
});
assert.equal(montereyAvailability.status, 'missionReadyPatchAvailable', 'Monterey mission-ready patch remains available');
assert.equal(montereyAvailability.boundaryBudget.generationAllowed, true, 'Monterey fixture can still be generated live after load');

let session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures,
  seed: 'reference-atlas-operational-window-budget'
});
session = selectEnvironmentStudioReferenceWindow(session, gulfBounds);
assert.equal(session.selectedReferenceOperationalWindow.scaleClass, 'gulfScale', 'session stores operational window scale');
assert.equal(session.selectedReferenceGenerationBudget.budgetStatus, 'MULTI_TILE_REQUIRED', 'session stores generation budget separately');
assert.equal(session.referencePatchRequest.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf session creates multi-tile request');

console.log('smoke_reference_atlas_operational_window_budget: ok', {
  local: localBudget.budgetStatus,
  regional: regionalBudget.budgetStatus,
  gulf: gulfBudget.budgetStatus,
  tinyWidthKm: tinyExpandedWindow.widthKm,
  monterey: montereyAvailability.boundaryBudget.budgetStatus
});
