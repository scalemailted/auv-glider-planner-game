import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ownerReviewDir = path.resolve(root, process.env.ANCHOR_ENV_COMPOSE_OWNER_REVIEW_DIR ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-ux-r1');
const summaryPath = path.join(ownerReviewDir, 'qa-summary.json');

const requiredScreenshots = [
  '01-global-atlas-default.png',
  '02-global-atlas-zoomed.png',
  '03-mission-ready-patch-overlay.png',
  '04-selected-atlas-region.png',
  '05-patch-request-not-staged.png',
  '06-monterey-patch-loaded.png',
  '07-regional-bathymetry-generated.png',
  '08-fields-generated.png',
  '09-environment-composed.png',
  '10-planning-launch-ready.png'
];

const requiredFields = [
  'status',
  'branch',
  'head',
  'phase',
  'defaultStage',
  'overviewDigest',
  'overviewBounds',
  'overviewIsGlobal',
  'defaultViewIsRegionalPatch',
  'fixtureStatus',
  'missionReadyPatchCount',
  'lowResolutionPatchCount',
  'patchCoverageOverlayCount',
  'selectedRegionAvailability',
  'matchedFixtureId',
  'loadedFixtureId',
  'loadedFixtureRole',
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
assert.equal(summary.phase, 'REF-ATLAS-UX-R1.1');
assert.equal(summary.defaultStage, 'globalAtlasSelector');
assert.equal(summary.overviewIsGlobal, true);
assert.equal(summary.defaultViewIsRegionalPatch, false);
assert.deepEqual(summary.overviewBounds, { westLon: -180, eastLon: 180, southLat: -90, northLat: 90 });
assert.equal(summary.fixtureStatus, 'AVAILABLE');
assert.ok(Number(summary.missionReadyPatchCount) >= 1);
assert.ok(Number(summary.lowResolutionPatchCount) >= 1);
assert.ok(Number(summary.patchCoverageOverlayCount) >= 1);
assert.equal(summary.selectedRegionAvailability, 'missionReadyPatchAvailable');
assert.equal(summary.loadedFixtureId, 'monterey_canyon_15s');
assert.equal(summary.loadedFixtureRole, 'missionReadyPatch');
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
