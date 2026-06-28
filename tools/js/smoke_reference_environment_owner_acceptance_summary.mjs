import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ownerReviewDir = path.resolve(root, process.env.ANCHOR_ENV_COMPOSE_OWNER_REVIEW_DIR ?? 'test-results/env-compose-launch-r1-1-owner-review');
const summaryPath = path.join(ownerReviewDir, 'qa-summary.json');

const requiredScreenshots = [
  '01-environment-studio-reference-source.png',
  '02-reference-bathymetry-generated.png',
  '03-currents-and-science-fields-generated.png',
  '04-environment-artifact-composed.png',
  '05-launch-validation-report.png',
  '06-planning-launch-ready.png',
  '07-mission-workspace-reference-environment.png',
  '08-planning-current-layer-visible.png',
  '09-planning-scalar-hotspot-layer-visible.png',
  '10-waypoint-placement-on-reference-environment.png',
  '11-execute-mission-from-reference-environment.png',
  '12-debrief-reference-environment-result.png',
  '13-public-benchmark-bundle-export.png',
  '14-project-export-import-roundtrip.png',
  '15-main-menu-cleanup.png'
];

const requiredFields = [
  'status',
  'branch',
  'head',
  'referenceFixtureId',
  'referenceFixtureDigest',
  'bathymetryArtifactDigest',
  'currentArtifactDigest',
  'scalarArtifactDigest',
  'hotspotArtifactDigest',
  'environmentArtifactDigest',
  'launchValidationStatus',
  'planningLaunchReady',
  'warningSummary',
  'blockingWarningCount',
  'failureCount',
  'benchmarkBundleStatus',
  'benchmarkBundleDigest',
  'exportedProjectDigest',
  'launchedPlanningEnvironmentDigest',
  'missionExecuted',
  'debriefReached',
  'hiddenTruthExposed',
  'rawExternalDataPathExposed',
  'simulationChanged',
  'scoringChanged',
  'activeRendererCountAfterCleanup',
  'activeRafCountAfterCleanup',
  'activeCanvasCountAfterCleanup'
];

assert.ok(existsSync(summaryPath), `owner review qa-summary missing: ${summaryPath}`);
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const fnvDigestPattern = /(?:^|-)fnv1a32:/;

for (const field of requiredFields) assert.ok(Object.hasOwn(summary, field), `qa-summary missing ${field}`);
for (const screenshot of requiredScreenshots) {
  assert.ok(existsSync(path.join(ownerReviewDir, screenshot)), `owner review screenshot missing: ${screenshot}`);
}

assert.ok(['PASS', 'PASS_WITH_NON_BLOCKING_WARNINGS'].includes(summary.status), `invalid owner-review status ${summary.status}`);
assert.equal(summary.referenceFixtureId, 'monterey_canyon_15s');
assert.ok(String(summary.referenceFixtureDigest).startsWith('sha256:'), 'reference fixture digest must be SHA-256');
for (const field of [
  'bathymetryArtifactDigest',
  'currentArtifactDigest',
  'scalarArtifactDigest',
  'hotspotArtifactDigest',
  'environmentArtifactDigest',
  'benchmarkBundleDigest',
  'exportedProjectDigest',
  'launchedPlanningEnvironmentDigest'
]) {
  assert.ok(fnvDigestPattern.test(String(summary[field])), `${field} must be a stable fnv1a32 digest`);
}
assert.ok(['PASS', 'WARN'].includes(summary.launchValidationStatus), 'launch status must be PASS or WARN');
assert.equal(summary.planningLaunchReady, true);
assert.equal(Number(summary.blockingWarningCount), 0);
assert.equal(Number(summary.failureCount), 0);
assert.equal(summary.benchmarkBundleStatus, 'CURRENT');
assert.equal(summary.missionExecuted, true);
assert.equal(summary.debriefReached, true);
assert.equal(summary.hiddenTruthExposed, false);
assert.equal(summary.rawExternalDataPathExposed, false);
assert.equal(summary.simulationChanged, false);
assert.equal(summary.scoringChanged, false);
assert.equal(Number(summary.activeRendererCountAfterCleanup), 0);
assert.equal(Number(summary.activeRafCountAfterCleanup), 0);
assert.equal(Number(summary.activeCanvasCountAfterCleanup), 0);
assert.ok(summary.warningSummary && typeof summary.warningSummary === 'object', 'warning summary must be preserved');
assert.equal(Number(summary.warningSummary.blockingWarningCount ?? 0), 0);
assert.equal(Number(summary.warningSummary.failureCount ?? 0), 0);

console.log('smoke_reference_environment_owner_acceptance_summary: ok', {
  path: path.relative(root, summaryPath),
  status: summary.status,
  launchValidationStatus: summary.launchValidationStatus,
  benchmarkBundleDigest: summary.benchmarkBundleDigest,
  screenshotCount: requiredScreenshots.length
});
