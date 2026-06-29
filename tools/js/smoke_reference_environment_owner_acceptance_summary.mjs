import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ownerReviewDir = path.resolve(root, process.env.ANCHOR_ENV_COMPOSE_OWNER_REVIEW_DIR ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-interact-r1-1');
const summaryPath = path.join(ownerReviewDir, 'qa-summary.json');

const requiredScreenshots = [
  '01-atlas-loaded.png',
  '02-after-pan.png',
  '03-after-wheel-zoom.png',
  '04-boundary-drawing.png',
  '05-boundary-selected.png',
  '06-patch-request-visible.png',
  '07-after-reset.png',
  '08-monterey-focused.png',
  '09-monterey-loaded.png',
  '10-planning-launch-ready.png'
];

const requiredFields = [
  'status',
  'branch',
  'head',
  'phase',
  'atlasLoaded',
  'initialLoadMs',
  'panResponsive',
  'wheelZoomResponsive',
  'boundaryDrawResponsive',
  'patchRequestVisible',
  'resetResponsive',
  'montereyFocusResponsive',
  'selectedPatchLoaded',
  'planningLaunchReady',
  'planningWorkspaceReached',
  'sceneRestartCountDuringInteraction',
  'maxLongTaskMs',
  'rasterRenderCount',
  'fullRasterRenderCount',
  'cacheHitCount',
  'cacheMissCount',
  'listenerAttachCount',
  'listenerDetachCount',
  'activeReferenceAtlasListenersAfterCleanup',
  'selectedAvailability',
  'loadedFixtureId',
  'environmentDigest',
  'hiddenTruthExposed',
  'rawExternalDataPathExposed',
  'simulationChanged',
  'scoringChanged'
];

assert.ok(existsSync(summaryPath), `owner review qa-summary missing: ${summaryPath}`);
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const fnvDigestPattern = /(?:^|-)fnv1a32:/;

for (const field of requiredFields) assert.ok(Object.hasOwn(summary, field), `qa-summary missing ${field}`);
for (const screenshot of requiredScreenshots) {
  assert.ok(existsSync(path.join(ownerReviewDir, screenshot)), `owner review screenshot missing: ${screenshot}`);
}

assert.ok(['PASS', 'PASS_WITH_NON_BLOCKING_WARNINGS'].includes(summary.status), `invalid owner-review status ${summary.status}`);
assert.equal(summary.phase, 'REF-ATLAS-INTERACT-R1.1');
assert.equal(summary.atlasLoaded, true, 'atlas loaded');
assert.ok(Number(summary.initialLoadMs) >= 0, 'initial load timing recorded');
assert.equal(summary.panResponsive, true, 'pan interaction responsive');
assert.equal(summary.wheelZoomResponsive, true, 'wheel zoom responsive');
assert.equal(summary.boundaryDrawResponsive, true, 'boundary drawing responsive');
assert.equal(summary.patchRequestVisible, true, 'patch request visible for unstaged boundary');
assert.equal(summary.resetResponsive, true, 'reset responsive');
assert.equal(summary.montereyFocusResponsive, true, 'Monterey focus responsive');
assert.equal(summary.selectedPatchLoaded, true, 'selected patch loaded');
assert.equal(summary.planningLaunchReady, true, 'planning launch ready');
assert.equal(summary.planningWorkspaceReached, true, 'planning workspace reached');
assert.equal(Number(summary.sceneRestartCountDuringInteraction), 0, 'no scene restart during interaction');
assert.ok(Number(summary.maxLongTaskMs) < 500, `max interaction frame ${summary.maxLongTaskMs}ms must be under 500ms`);
assert.ok(Number(summary.rasterRenderCount) >= 1, 'raster render count recorded');
assert.ok(Number(summary.fullRasterRenderCount) >= 1, 'full raster cache build recorded');
assert.ok(Number(summary.cacheHitCount) >= 1, 'raster cache hits recorded');
assert.ok(Number(summary.listenerAttachCount) >= 1, 'listener attachments recorded');
assert.ok(Number(summary.listenerDetachCount) >= 1, 'listener detachments recorded');
assert.equal(Number(summary.activeReferenceAtlasListenersAfterCleanup), 0, 'reference atlas listeners cleaned up');
assert.equal(summary.selectedAvailability, 'missionReadyPatchAvailable', 'selected availability reaches mission patch');
assert.equal(summary.loadedFixtureId, 'monterey_canyon_15s', 'Monterey fixture loaded');
assert.ok(fnvDigestPattern.test(String(summary.environmentDigest)), 'environment digest recorded');
assert.equal(summary.hiddenTruthExposed, false);
assert.equal(summary.rawExternalDataPathExposed, false);
assert.equal(summary.simulationChanged, false);
assert.equal(summary.scoringChanged, false);

console.log('smoke_reference_environment_owner_acceptance_summary: ok', {
  path: path.relative(root, summaryPath),
  status: summary.status,
  maxLongTaskMs: summary.maxLongTaskMs,
  screenshotCount: requiredScreenshots.length
});
