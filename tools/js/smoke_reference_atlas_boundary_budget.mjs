import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  REFERENCE_ATLAS_ALPHA_BUDGET,
  estimateReferenceAtlasBoundaryBudget
} from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  createReferenceBathymetryPatchRequest,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  createEnvironmentStudioSession,
  selectEnvironmentStudioReferenceWindow
} from '../../src/core/editor/EnvironmentStudioProject.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { atlas, manifest, overviewArtifact, overviewRasterArtifact, referenceFixtures } = await loadReferenceAtlasFixtureContext();

const small = estimateReferenceAtlasBoundaryBudget({
  westLon: -80.8,
  eastLon: -80.2,
  southLat: 24.6,
  northLat: 25.2
}, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(small.budgetStatus, 'OK', 'small selected region is OK');
assert.equal(small.generationAllowed, true, 'small selected region can generate if staged');
assert.equal(small.patchRequestAllowed, true, 'small selected region can export patch request');
assert.ok(small.sourceCellCount <= REFERENCE_ATLAS_ALPHA_BUDGET.okSourceCellsMax, 'small source cells are under OK limit');

const medium = estimateReferenceAtlasBoundaryBudget({
  westLon: -40,
  eastLon: -38,
  southLat: 20,
  northLat: 21.3
}, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(medium.budgetStatus, 'WARN', 'medium selected region warns before hard block');
assert.equal(medium.generationAllowed, true, 'WARN region remains generatable when staged');
assert.ok(medium.budgetReasons.some((reason) => /near|decimat|OK budget/i.test(reason)), 'WARN carries useful reason');

const large = estimateReferenceAtlasBoundaryBudget({
  westLon: -80.8,
  eastLon: -77.8,
  southLat: 24.6,
  northLat: 26.6
}, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(large.budgetStatus, 'BLOCKED', 'large selected region is blocked');
assert.equal(large.generationAllowed, false, 'blocked region cannot generate live');
assert.equal(large.patchRequestAllowed, true, 'blocked valid region can export patch request');
assert.ok(large.budgetReasons.length >= 1, 'blocked region carries reasons');

const antimeridian = estimateReferenceAtlasBoundaryBudget({
  westLon: 179,
  eastLon: -179,
  southLat: -1,
  northLat: 1
}, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(antimeridian.budgetStatus, 'BLOCKED', 'antimeridian region is blocked');
assert.equal(antimeridian.patchRequestAllowed, false, 'unsupported antimeridian selection does not export patch request');

const montereyAvailability = referenceFixtureAvailabilityForBounds(atlas, {
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
});
assert.equal(montereyAvailability.status, 'missionReadyPatchAvailable', 'Monterey defaults to missionReadyPatch');
assert.ok(['OK', 'WARN'].includes(montereyAvailability.boundaryBudget.budgetStatus), 'Monterey mission patch stays within live-generation budget');
assert.equal(montereyAvailability.boundaryBudget.sourceResolutionArcSeconds, 15, 'Monterey mission patch uses 15s budget source resolution');

const lowResolutionAvailability = referenceFixtureAvailabilityForBounds(atlas, {
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
}, { preferredFixtureId: 'monterey_canyon' });
assert.equal(lowResolutionAvailability.status, 'lowResolutionReferencePatchAvailable', 'explicit fallback remains low-resolution');
assert.equal(lowResolutionAvailability.matchedFixtureRole, 'lowResolutionReferencePatch', 'fallback is not silently mission-ready');
assert.equal(lowResolutionAvailability.boundaryBudget.sourceResolutionArcSeconds, 60, 'fallback uses 60s source resolution');

let session = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures
});
session = selectEnvironmentStudioReferenceWindow(session, large.bounds);
assert.equal(session.selectedReferenceBoundaryBudget.budgetStatus, 'BLOCKED', 'session stores blocked budget');
assert.equal(session.referencePatchRequest.boundaryBudget.budgetStatus, 'BLOCKED', 'patch request includes blocked budget');

const request = createReferenceBathymetryPatchRequest(large.bounds, atlas, { boundaryBudget: large });
assert.equal(request.boundaryBudget.budgetStatus, 'BLOCKED', 'standalone patch request includes budget');
assert.equal(request.claimBoundary.hiddenTruthExposed, false, 'patch request exposes no hidden truth');
const publicText = canonicalJsonStringify(request);
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'patch request budget export has no raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'patch request budget export has no hidden truth true');

console.log('smoke_reference_atlas_boundary_budget: ok', {
  small: small.budgetStatus,
  medium: medium.budgetStatus,
  large: large.budgetStatus,
  monterey: montereyAvailability.boundaryBudget.budgetStatus,
  fallbackResolution: lowResolutionAvailability.boundaryBudget.sourceResolutionArcSeconds
});
