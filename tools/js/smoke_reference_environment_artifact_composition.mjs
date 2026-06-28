import assert from 'node:assert/strict';
import {
  buildReferenceStudioSession,
  publicMetadataText
} from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioProject,
  composeEnvironmentStudioReferenceEnvironment
} from '../../src/core/editor/EnvironmentStudioProject.js';

const { fixture, session } = buildReferenceStudioSession('env-compose-r1-artifact-composition');
const composed = composeEnvironmentStudioReferenceEnvironment(session, { seed: 'env-compose-r1-artifact-composition' });
const project = buildEnvironmentStudioProject(composed);
const field = project.fieldRegenerationResult;
const graph = project.dependencyGraph.nodes;

assert.equal(fixture.fixtureId, 'monterey_canyon_15s');
assert.equal(field.referenceFixtureId, 'monterey_canyon_15s');
assert.equal(field.environmentArtifactStatus, 'CURRENT');
assert.ok(field.environmentArtifactDigest.startsWith('fnv1a32:'));
assert.equal(composed.environmentCompositionResult.status, 'CURRENT');
assert.equal(composed.environmentCompositionResult.environmentArtifactDigest, field.environmentArtifactDigest);
assert.equal(graph.environmentArtifact.state, 'CURRENT');
assert.equal(graph.currentArtifact.state, 'CURRENT');
assert.equal(graph.scalarArtifact.state, 'CURRENT');
assert.equal(graph.hotspots.state, 'CURRENT');
assert.equal(graph.hazards.state, 'CURRENT');
assert.ok(composed.environmentCompositionResult.componentDigests.currentFieldDigestList.length > 0);
assert.ok(composed.environmentCompositionResult.componentDigests.scalarFieldDigestList.length > 0);
assert.equal(composed.environmentCompositionResult.hiddenTruthExposed, false);
assert.equal(composed.environmentCompositionResult.simulationChanged, false);
assert.equal(composed.environmentCompositionResult.scoringChanged, false);

const publicText = publicMetadataText(project);
assert.ok(!/T_hiddenTruth|hiddenTruthExposed"\s*:\s*true|hiddenTruthIncluded"\s*:\s*true/.test(publicText), 'composition metadata must not expose hidden truth');
assert.ok(!/[A-Z]:\\\\|external_data[\\/]/.test(publicText), 'composition metadata must not contain local raw paths');
assert.ok(!/"operationalForecast"\s*:\s*true|"calibratedOceanProduct"\s*:\s*true/.test(publicText), 'composition metadata must not claim operational forecast products');

console.log('smoke_reference_environment_artifact_composition: ok', {
  fixtureId: fixture.fixtureId,
  environmentArtifactDigest: field.environmentArtifactDigest,
  compositionDigest: composed.environmentCompositionResult.compositionDigest
});
