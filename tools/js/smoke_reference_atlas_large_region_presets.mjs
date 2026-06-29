import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  estimateReferenceAtlasBoundaryBudget,
  estimateReferenceAtlasOperationalWindow,
  referenceAtlasBoundsForOperationalPreset
} from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  createReferenceBathymetryMultiTilePatchRequest,
  createReferenceBathymetryPatchRequest
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  createEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow
} from '../../src/core/editor/EnvironmentStudioProject.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { atlas, manifest, overviewArtifact, overviewRasterArtifact, referenceFixtures } = await loadReferenceAtlasFixtureContext();
const center = { centerLon: -91, centerLat: 27 };
const presets = [
  ['localPatch', 100, 100, 'localPatch', false],
  ['regionalSurvey', 250, 200, 'regionalSurvey', false],
  ['fleetSurvey', 500, 350, 'fleetSurvey', false],
  ['gulfSegment', 800, 500, 'gulfScale', true],
  ['basinCampaign', 1200, 800, 'basinCampaign', true]
];

const rows = [];
const requests = [];
let session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures,
  seed: 'reference-atlas-large-region-presets'
});

for (const [presetId, expectedWidthKm, expectedHeightKm, expectedScaleClass, expectMultiTile] of presets) {
  const bounds = referenceAtlasBoundsForOperationalPreset(center, presetId);
  const window = estimateReferenceAtlasOperationalWindow(bounds, { userIntent: presetId });
  const budget = estimateReferenceAtlasBoundaryBudget(bounds, { atlas, sourceResolutionArcSeconds: 15 });
  assert.equal(window.validSelection, true, `${presetId} is valid`);
  assert.equal(window.scaleClass, expectedScaleClass, `${presetId} scale`);
  assert.ok(Math.abs(window.widthKm - expectedWidthKm) < 2, `${presetId} width ${window.widthKm}`);
  assert.ok(Math.abs(window.heightKm - expectedHeightKm) < 2, `${presetId} height ${window.heightKm}`);
  assert.equal(budget.patchRequestAllowed, true, `${presetId} patch request allowed`);
  assert.equal(budget.multiTileRecommended, expectMultiTile, `${presetId} multi-tile policy`);
  assert.equal(budget.generationAllowed, expectMultiTile ? false : budget.generationAllowed, `${presetId} live generation policy stable`);

  session = selectEnvironmentStudioReferenceWindow(session, bounds);
  assert.equal(
    session.referencePatchRequest?.artifactType,
    expectMultiTile
      ? 'anchor.reference-bathymetry-multitile-patch-request'
      : 'anchor.reference-bathymetry-patch-request',
    `${presetId} session request type`
  );

  const request = expectMultiTile
    ? createReferenceBathymetryMultiTilePatchRequest(bounds, atlas, {
        generationBudget: budget,
        operationalWindow: budget.operationalWindow,
        suggestedFixturePrefix: `${presetId}_multitile`
      })
    : createReferenceBathymetryPatchRequest(bounds, atlas, {
        boundaryBudget: budget,
        operationalWindow: budget.operationalWindow,
        suggestedFixtureId: `${presetId}_patch`
      });
  assert.equal(request.generationBudget?.multiTileRecommended ?? request.boundaryBudget?.multiTileRecommended, expectMultiTile, `${presetId} request preserves multi-tile policy`);
  assert.deepEqual(request.typedBounds, request.bounds, `${presetId} request preserves typed bounds`);
  assert.ok(request.approximateSizeKm?.widthKm > 0, `${presetId} request has approximate size`);
  requests.push(request);
  rows.push({
    presetId,
    scaleClass: window.scaleClass,
    widthKm: window.widthKm,
    heightKm: window.heightKm,
    budgetStatus: budget.budgetStatus,
    requestType: request.artifactType
  });
}

const publicText = canonicalJsonStringify({
  rows,
  finalSelection: {
    selectedReferenceWindow: session.selectedReferenceWindow,
    selectedReferenceOperationalWindow: session.selectedReferenceOperationalWindow,
    selectedReferenceGenerationBudget: session.selectedReferenceGenerationBudget,
    referencePatchRequest: session.referencePatchRequest
  },
  requests
});
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'preset metadata exposes no raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'preset metadata exposes no hidden truth');
assert.doesNotMatch(publicText, /"operationalOceanForecast"\s*:\s*true|"calibratedForecastSystem"\s*:\s*true/, 'preset metadata does not claim calibrated forecast');

console.log('smoke_reference_atlas_large_region_presets: ok', { rows });
