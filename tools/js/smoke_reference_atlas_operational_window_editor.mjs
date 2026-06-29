import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM,
  REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM,
  REFERENCE_ATLAS_TINY_SELECTION_MESSAGE,
  estimateReferenceAtlasBoundaryBudget,
  estimateReferenceAtlasOperationalWindow,
  referenceAtlasBoundsForKilometerWindow
} from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  createReferenceBathymetryPatchRequest,
  referenceAtlasBoundsFromDrag
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  createEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow
} from '../../src/core/editor/EnvironmentStudioProject.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { atlas, manifest, overviewArtifact, overviewRasterArtifact, referenceFixtures } = await loadReferenceAtlasFixtureContext();

const typedBounds = referenceAtlasBoundsForKilometerWindow({
  centerLon: -91,
  centerLat: 27,
  widthKm: 250,
  heightKm: 200
});
const typedWindow = estimateReferenceAtlasOperationalWindow(typedBounds, { userIntent: 'typed-editor' });
assert.equal(typedWindow.validSelection, true, 'typed editor creates a valid operational window');
assert.ok(Math.abs(typedWindow.widthKm - 250) < 2, `typed width ${typedWindow.widthKm}`);
assert.ok(Math.abs(typedWindow.heightKm - 200) < 2, `typed height ${typedWindow.heightKm}`);
assert.equal(typedWindow.scaleClass, 'regionalSurvey', 'typed 250 x 200 km window is regional');

const typedBudget = estimateReferenceAtlasBoundaryBudget(typedBounds, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(typedBudget.patchRequestAllowed, true, 'typed window can export patch request');
assert.notEqual(typedBudget.budgetStatus, 'MULTI_TILE_REQUIRED', 'typed regional window is not a multi-tile request');

const tinyRequestedBounds = {
  westLon: -90,
  eastLon: -89.95,
  southLat: 25,
  northLat: 25.05
};
const tinyRequestedWindow = estimateReferenceAtlasOperationalWindow(tinyRequestedBounds);
assert.ok(tinyRequestedWindow.warnings.includes(REFERENCE_ATLAS_TINY_SELECTION_MESSAGE), 'tiny request reports mission-planning guidance');

const tinyDragBounds = referenceAtlasBoundsFromDrag(
  { lon: -90, lat: 25 },
  { lon: -90.00001, lat: 25.00001 },
  { minimumPresetId: 'localPatch' }
);
const tinyExpandedWindow = estimateReferenceAtlasOperationalWindow(tinyDragBounds, { userIntent: 'tiny-expanded' });
assert.equal(tinyExpandedWindow.validSelection, true, 'tiny selection expands to valid window');
assert.ok(tinyExpandedWindow.widthKm >= REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM - 2, `tiny width expanded to local patch: ${tinyExpandedWindow.widthKm}`);
assert.ok(tinyExpandedWindow.heightKm >= REFERENCE_ATLAS_RECOMMENDED_WINDOW_KM - 2, `tiny height expanded to local patch: ${tinyExpandedWindow.heightKm}`);
assert.ok(tinyExpandedWindow.widthKm >= REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM, 'tiny expanded width clears minimum');
assert.ok(tinyExpandedWindow.heightKm >= REFERENCE_ATLAS_MIN_USEFUL_WINDOW_KM, 'tiny expanded height clears minimum');

let session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures,
  seed: 'reference-atlas-operational-window-editor'
});
session = selectEnvironmentStudioReferenceWindow(session, typedBounds);
assert.equal(session.selectedReferenceOperationalWindow.scaleClass, 'regionalSurvey', 'session stores typed operational window scale');
assert.equal(session.selectedReferenceBoundaryBudget.patchRequestAllowed, true, 'session stores typed generation budget');

const patchRequest = createReferenceBathymetryPatchRequest(typedBounds, atlas, {
  boundaryBudget: typedBudget,
  generationBudget: typedBudget,
  operationalWindow: typedBudget.operationalWindow,
  suggestedFixtureId: 'typed_editor_patch_request'
});
assert.equal(patchRequest.artifactType, 'anchor.reference-bathymetry-patch-request', 'typed regional request is a single patch request');
assert.deepEqual(patchRequest.typedBounds, patchRequest.bounds, 'patch request preserves typed bounds');
assert.ok(Math.abs(patchRequest.approximateSizeKm.widthKm - typedWindow.widthKm) < 0.1, 'patch request preserves approximate width');
assert.ok(Math.abs(patchRequest.approximateSizeKm.heightKm - typedWindow.heightKm) < 0.1, 'patch request preserves approximate height');

const publicText = canonicalJsonStringify({
  selectedReferenceWindow: session.selectedReferenceWindow,
  selectedReferenceOperationalWindow: session.selectedReferenceOperationalWindow,
  selectedReferenceGenerationBudget: session.selectedReferenceGenerationBudget,
  patchRequest
});
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'editor metadata exposes no raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'editor metadata exposes no hidden truth');
assert.doesNotMatch(publicText, /"operationalOceanForecast"\s*:\s*true|"calibratedForecastSystem"\s*:\s*true/, 'editor metadata does not claim calibrated forecast');

console.log('smoke_reference_atlas_operational_window_editor: ok', {
  typedScaleClass: typedWindow.scaleClass,
  tinyExpandedKm: [tinyExpandedWindow.widthKm, tinyExpandedWindow.heightKm],
  patchRequestDigest: patchRequest.requestDigest
});
