import assert from 'node:assert/strict';
import { buildReferenceStudioSession } from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioProject,
  validateEnvironmentStudioReferenceLaunch
} from '../../src/core/editor/EnvironmentStudioProject.js';

const { session } = buildReferenceStudioSession('env-compose-r1-launch-validation');
const validated = validateEnvironmentStudioReferenceLaunch(session, { seed: 'env-compose-r1-launch-validation' });
const project = buildEnvironmentStudioProject(validated);
const launch = validated.launchValidationResult;
const graph = project.dependencyGraph.nodes;

assert.ok(['PASS', 'WARN'].includes(launch.status), `launch status ${launch.status} must be launchable`);
assert.equal(launch.planningLaunchReady, true);
assert.equal(launch.startDropZoneValidation.status, 'CURRENT');
assert.ok(launch.startDropZoneValidation.validCandidateCount > 0);
assert.equal(launch.hazardValidation.status, 'CURRENT');
assert.equal(launch.hazardValidation.publicSafe, true);
assert.ok(launch.environmentArtifactDigest.startsWith('fnv1a32:'));
assert.ok(launch.currentArtifactDigest.startsWith('fnv1a32:'));
assert.ok(launch.scalarArtifactDigest.startsWith('fnv1a32:'));
assert.equal(launch.hiddenTruthExposed, false);
assert.equal(launch.simulationChanged, false);
assert.equal(launch.scoringChanged, false);
assert.equal(graph.startsDropZones.state, 'CURRENT');
assert.equal(graph.benchmarkBundle.state, 'REQUIRES_REGENERATION');

console.log('smoke_reference_environment_launch_validation: ok', {
  launchValidationStatus: launch.status,
  launchValidationDigest: launch.launchValidationDigest,
  validStartDropZones: launch.startDropZoneValidation.validCandidateCount
});
