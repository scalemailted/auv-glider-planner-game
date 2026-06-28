import assert from 'node:assert/strict';
import { buildReferenceStudioSession, publicMetadataText } from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioProject,
  validateEnvironmentStudioReferenceLaunch
} from '../../src/core/editor/EnvironmentStudioProject.js';
import {
  REFERENCE_ENVIRONMENT_WARNING_SEVERITIES,
  classifyReferenceEnvironmentWarning,
  summarizeReferenceEnvironmentWarnings
} from '../../src/core/generation/ReferenceEnvironmentLaunchWarningTaxonomy.js';

const { session } = buildReferenceStudioSession('env-compose-r1-1-warning-taxonomy');
const validated = validateEnvironmentStudioReferenceLaunch(session, { seed: 'env-compose-r1-1-warning-taxonomy' });
const project = buildEnvironmentStudioProject(validated);
const launch = validated.launchValidationResult;

assert.equal(launch.artifactType, 'anchor.reference-environment-launch-validation-report');
assert.equal(launch.planningLaunchReady, true);
assert.ok(['PASS', 'WARN'].includes(launch.status));
assert.ok(launch.warningSummary, 'launch warning summary must exist');
assert.equal(launch.warningSummary.blockingWarningCount, 0);
assert.equal(launch.warningSummary.failureCount, 0);
assert.equal(launch.warningSummary.launchAllowed, true);
assert.ok(Array.isArray(launch.warnings) && launch.warnings.length > 0, 'launch warnings must be classified');

for (const warning of launch.warnings) {
  assert.ok(warning.warningId, 'warningId is required');
  assert.ok(REFERENCE_ENVIRONMENT_WARNING_SEVERITIES.includes(warning.severity), `${warning.warningId} severity must be valid`);
  assert.ok(warning.title, `${warning.warningId} title is required`);
  assert.ok(warning.explanation, `${warning.warningId} explanation is required`);
  assert.ok(warning.userImpact, `${warning.warningId} userImpact is required`);
  assert.equal(typeof warning.launchBlocking, 'boolean', `${warning.warningId} launchBlocking must be boolean`);
  assert.ok(warning.recommendedAction, `${warning.warningId} recommendedAction is required`);
  assert.ok(warning.scientificClaimBoundary, `${warning.warningId} scientific claim boundary is required`);
  assert.equal(warning.scientificClaimBoundary.hiddenTruthExposed, false);
  assert.equal(warning.scientificClaimBoundary.operationalForecast, false);
  assert.equal(warning.scientificClaimBoundary.certifiedForNavigation, false);
}

const blocking = classifyReferenceEnvironmentWarning({
  warningId: 'start-zone-separation-low',
  severity: 'BLOCKING_WARN',
  launchBlocking: true
});
const summary = summarizeReferenceEnvironmentWarnings([blocking], []);
assert.equal(summary.launchAllowed, false, 'blocking warnings must prevent launch');
assert.equal(summary.blockingWarningCount, 1);

assert.equal(project.launchValidationResult.warningSummary.blockingWarningCount, 0);
assert.equal(project.launchValidationResult.warningSummary.failureCount, 0);
assert.equal(project.launchValidationResult.planningLaunchReady, true);

const publicText = publicMetadataText(project.launchValidationResult);
assert.ok(!/operationalForecast"\s*:\s*true|certifiedForNavigation"\s*:\s*true|hiddenTruthExposed"\s*:\s*true/.test(publicText), 'warnings must not suppress claim boundaries');

console.log('audit_reference_environment_launch_warning_taxonomy: ok', {
  status: launch.status,
  planningLaunchReady: launch.planningLaunchReady,
  warningCount: launch.warningSummary.totalWarningCount,
  blockingWarningCount: launch.warningSummary.blockingWarningCount,
  launchValidationDigest: launch.launchValidationDigest
});
