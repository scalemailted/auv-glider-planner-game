import assert from 'node:assert/strict';
import { buildReferenceStudioSession, publicMetadataText } from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioProject,
  buildEnvironmentStudioReferencePlanningLaunch
} from '../../src/core/editor/EnvironmentStudioProject.js';

const { session } = buildReferenceStudioSession('env-compose-r1-planning-adapter');
const launch = buildEnvironmentStudioReferencePlanningLaunch(session, { seed: 'env-compose-r1-planning-adapter' });
const project = buildEnvironmentStudioProject(launch.session);

assert.equal(launch.type, 'anchor.reference-environment.planning-launch-result');
assert.equal(launch.source, 'referenceEnvironmentStudioLaunch');
assert.equal(launch.challengeMode, 'forecast');
assert.equal(launch.experienceMode, 'simulationLab');
assert.equal(launch.level.type, 'anchor.level');
assert.equal(launch.level.meta.source, 'referenceEnvironmentStudioLaunch');
assert.equal(launch.mission.type, 'anchor.mission');
assert.equal(launch.mission.agents.length, 1);
assert.equal(launch.mission.agents[0].deployment.mode, 'chooseFromZones');
assert.ok((launch.level.zones ?? []).some((zone) => zone.type === 'deployment'));
assert.ok((launch.level.targets ?? []).length > 0);
assert.ok(launch.level.currentField4D?.digest?.startsWith('fnv1a32:'));
assert.ok(launch.level.scalarField4D?.digest?.startsWith('fnv1a32:'));
assert.equal(launch.launchMetadata.hiddenTruthExposed, false);
assert.equal(launch.launchMetadata.simulationChanged, false);
assert.equal(launch.launchMetadata.scoringChanged, false);
assert.ok(project.planningLaunchResult.levelDigest.startsWith('fnv1a32:'));
assert.equal(project.planningLaunchResult.environmentArtifactDigest, launch.launchMetadata.environmentArtifactDigest);

const publicText = publicMetadataText({ level: launch.level, mission: launch.mission, launchMetadata: launch.launchMetadata });
assert.ok(!/T_hiddenTruth|hiddenTruthExposed"\s*:\s*true|hiddenTruthIncluded"\s*:\s*true/.test(publicText), 'Planning launch must not expose hidden truth');
assert.ok(!/"officialScore"|"scoreReport"/.test(publicText), 'Planning launch must not include pre-run scoring results');

console.log('smoke_reference_environment_planning_adapter: ok', {
  levelDigest: launch.launchMetadata.levelDigest,
  missionDigest: launch.launchMetadata.missionDigest,
  environmentArtifactDigest: launch.launchMetadata.environmentArtifactDigest
});
