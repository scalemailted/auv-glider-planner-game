import assert from 'node:assert/strict';
import {
  buildEnvironmentStudioReferenceBenchmarkBundle,
  buildEnvironmentStudioReferencePlanningLaunch,
  composeEnvironmentStudioReferenceEnvironment,
  createEnvironmentStudioSession,
  generateEnvironmentStudioRegionFromReferenceWindow,
  loadEnvironmentStudioReferenceFixture,
  regenerateEnvironmentStudioFields,
  selectEnvironmentStudioReferenceWindow,
  validateEnvironmentStudioReferenceLaunch
} from '../../src/core/editor/EnvironmentStudioProject.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { manifest, overviewArtifact, overviewRasterArtifact, referenceFixtures } = await loadReferenceAtlasFixtureContext();

const baseSession = createEnvironmentStudioSession({
  referenceBathymetryManifest: manifest,
  overviewArtifact,
  overviewRasterArtifact,
  referenceFixtures,
  seed: 'reference-atlas-budget-gate'
});

let blocked = selectEnvironmentStudioReferenceWindow(baseSession, {
  westLon: -80.8,
  eastLon: -77.8,
  southLat: 24.6,
  northLat: 26.6
});
assert.equal(blocked.selectedReferenceAvailability.status, 'notStaged', 'large test region is unstaged');
assert.equal(blocked.selectedReferenceBoundaryBudget.budgetStatus, 'BLOCKED', 'large region is budget-blocked');
assert.equal(blocked.referencePatchRequest.boundaryBudget.budgetStatus, 'BLOCKED', 'blocked patch request remains exportable');
assert.equal(blocked.referencePatchRequest.boundaryBudget.patchRequestAllowed, true, 'blocked valid region allows patch request');

assert.throws(
  () => loadEnvironmentStudioReferenceFixture(blocked),
  /REFERENCE_PATCH_NOT_STAGED|Export a patch request/,
  'unstaged selected region cannot silently load another fixture'
);
assert.throws(
  () => generateEnvironmentStudioRegionFromReferenceWindow(blocked, { allowUnloadedReferencePatch: true }),
  /Region is too large|REFERENCE_ATLAS_BOUNDARY_BUDGET_BLOCKED/,
  'blocked selected region cannot generate bathymetry'
);

let monterey = selectEnvironmentStudioReferenceWindow(baseSession, {
  westLon: -123,
  eastLon: -121.5,
  southLat: 36,
  northLat: 37.2
});
assert.ok(['OK', 'WARN'].includes(monterey.selectedReferenceBoundaryBudget.budgetStatus), 'Monterey remains under live-generation budget');
monterey = loadEnvironmentStudioReferenceFixture(monterey);
assert.equal(monterey.loadedReferenceFixtureId, 'monterey_canyon_15s', 'mission-ready Monterey fixture loads');
monterey = generateEnvironmentStudioRegionFromReferenceWindow(monterey, { seed: 'reference-atlas-budget-gate' });
assert.match(monterey.bathymetryArtifactDigest, /fnv1a32:/, 'bathymetry generated under budget gate');
monterey = regenerateEnvironmentStudioFields(monterey, { seed: 'reference-atlas-budget-gate' });
assert.equal(monterey.fieldRegenerationResult.status, 'CURRENT', 'fields generated under budget gate');
monterey = composeEnvironmentStudioReferenceEnvironment(monterey, { seed: 'reference-atlas-budget-gate' });
assert.equal(monterey.environmentCompositionResult.status, 'CURRENT', 'environment composed under budget gate');
monterey = validateEnvironmentStudioReferenceLaunch(monterey, { seed: 'reference-atlas-budget-gate' });
assert.equal(monterey.launchValidationResult.planningLaunchReady, true, 'launch validation remains available under budget gate');

const launch = buildEnvironmentStudioReferencePlanningLaunch(monterey, { seed: 'reference-atlas-budget-gate' });
assert.equal(launch.launchMetadata.referenceFixtureId, 'monterey_canyon_15s', 'planning launch uses Monterey fixture');
assert.equal(launch.session.planningLaunchResult.hiddenTruthExposed, false, 'planning launch summary exposes no hidden truth');

const benchmark = buildEnvironmentStudioReferenceBenchmarkBundle(monterey, { seed: 'reference-atlas-budget-gate' });
assert.equal(benchmark.bundle.containsHiddenTruth, false, 'benchmark bundle remains public');
assert.equal(benchmark.session.benchmarkBundleResult.status, 'CURRENT', 'benchmark bundle exported under budget gate');

console.log('smoke_reference_atlas_generation_budget_gate: ok', {
  blockedStatus: blocked.selectedReferenceBoundaryBudget.budgetStatus,
  montereyFixture: monterey.loadedReferenceFixtureId,
  launchReady: monterey.launchValidationResult.planningLaunchReady,
  benchmarkStatus: benchmark.session.benchmarkBundleResult.status
});
