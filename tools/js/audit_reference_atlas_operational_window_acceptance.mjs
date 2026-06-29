import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ownerReviewDir = path.resolve(
  root,
  process.env.ANCHOR_REF_ATLAS_OPERATIONAL_WINDOW_OWNER_REVIEW_DIR
    ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR
    ?? 'artifacts/owner-review/ref-atlas-operational-window-r1'
);
const summaryPath = path.join(ownerReviewDir, 'qa-summary.json');

const requiredScreenshots = [
  '01-default-atlas.png',
  '02-local-window-too-small-guidance.png',
  '03-regional-window-ok.png',
  '04-gulf-segment-selected.png',
  '05-gulf-segment-budget-multitile.png',
  '06-gulf-multitile-patch-request-export.png',
  '07-monterey-overlay-selected.png',
  '08-monterey-patch-loaded.png',
  '09-generation-pipeline-still-works.png',
  '10-planning-launch-ready.png'
];

const requiredFields = [
  'status',
  'phase',
  'branch',
  'head',
  'localWindow',
  'regionalWindow',
  'gulfWindow',
  'defaultAtlasVisible',
  'tinyClickCreatesUsableSelection',
  'regionalWindowValid',
  'gulfScaleClass',
  'gulfGenerationAllowed',
  'gulfPatchRequestAllowed',
  'gulfMultiTileRecommended',
  'gulfRecommendedAction',
  'gulfPatchRequestType',
  'gulfPatchRequestDigest',
  'montereyLoadedFixtureId',
  'montereyLoadedFixtureRole',
  'bathymetryArtifactDigest',
  'currentArtifactDigest',
  'environmentArtifactDigest',
  'launchValidationStatus',
  'bathymetryGenerated',
  'fieldsGenerated',
  'environmentComposed',
  'planningLaunchReady',
  'hiddenTruthExposed',
  'rawExternalDataPathExposed',
  'simulationChanged',
  'scoringChanged',
  'pageResponsiveAfterSelections',
  'activeRendererCountAfterCleanup',
  'activeRafCountAfterCleanup',
  'activeCanvasCountAfterCleanup'
];

try {
  assert.ok(existsSync(summaryPath), `operational-window owner-review qa-summary missing: ${summaryPath}`);
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

  for (const field of requiredFields) assert.ok(Object.hasOwn(summary, field), `qa-summary missing ${field}`);
  for (const screenshot of requiredScreenshots) {
    assert.ok(existsSync(path.join(ownerReviewDir, screenshot)), `operational-window owner-review screenshot missing: ${screenshot}`);
  }

  assert.equal(summary.phase, 'REF-ATLAS-INTERACT-R1.3');
  assert.ok(['PASS', 'PASS_WITH_NON_BLOCKING_WARNINGS'].includes(summary.status), `invalid owner-review status ${summary.status}`);
  assert.equal(summary.defaultAtlasVisible, true, 'default atlas visible');
  assert.equal(summary.localWindow?.validSelection, true, 'local window valid');
  assert.equal(summary.regionalWindow?.validSelection, true, 'regional window valid');
  assert.equal(summary.gulfWindow?.validSelection, true, 'Gulf window valid');
  assert.equal(summary.tinyClickCreatesUsableSelection, true, 'tiny click expands or normalizes to usable selection');
  assert.equal(summary.regionalWindowValid, true, 'regional operational window valid');
  assert.equal(summary.gulfScaleClass, 'gulfScale', 'Gulf window scale class');
  assert.equal(summary.gulfGenerationAllowed, false, 'Gulf live generation disabled');
  assert.equal(summary.gulfPatchRequestAllowed, true, 'Gulf patch request allowed');
  assert.equal(summary.gulfMultiTileRecommended, true, 'Gulf multi-tile recommended');
  assert.equal(summary.gulfRecommendedAction, 'exportMultiTilePatchRequest', 'Gulf recommended action');
  assert.equal(summary.gulfPatchRequestType, 'anchor.reference-bathymetry-multitile-patch-request', 'Gulf patch request type');
  assert.match(summary.gulfPatchRequestDigest, /^fnv1a32:/, 'Gulf patch request digest');
  assert.equal(summary.montereyLoadedFixtureId, 'monterey_canyon_15s', 'Monterey fixture still loads');
  assert.equal(summary.montereyLoadedFixtureRole, 'missionReadyPatch', 'Monterey role');
  assert.match(summary.bathymetryArtifactDigest, /fnv1a32:/, 'bathymetry digest');
  assert.match(summary.currentArtifactDigest, /^fnv1a32:/, 'current digest');
  assert.match(summary.environmentArtifactDigest, /^fnv1a32:/, 'environment digest');
  assert.ok(['PASS', 'WARN'].includes(summary.launchValidationStatus), `launch validation status ${summary.launchValidationStatus}`);
  assert.equal(summary.bathymetryGenerated, true, 'bathymetry generated');
  assert.equal(summary.fieldsGenerated, true, 'fields generated');
  assert.equal(summary.environmentComposed, true, 'environment composed');
  assert.equal(summary.planningLaunchReady, true, 'planning launch ready');
  assert.equal(summary.hiddenTruthExposed, false);
  assert.equal(summary.rawExternalDataPathExposed, false);
  assert.equal(summary.simulationChanged, false);
  assert.equal(summary.scoringChanged, false);
  assert.equal(summary.pageResponsiveAfterSelections, true, 'page responsive after selections');
  assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup count');
  assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup count');
  assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup count');

  console.log('audit_reference_atlas_operational_window_acceptance: ok', {
    path: path.relative(root, summaryPath),
    screenshotCount: requiredScreenshots.length,
    gulfPatchRequestDigest: summary.gulfPatchRequestDigest
  });
} catch (error) {
  console.error('REF_ATLAS_OPERATIONAL_WINDOW_R1_ACCEPTANCE_FAIL', error?.message ?? error);
  process.exitCode = 1;
}
