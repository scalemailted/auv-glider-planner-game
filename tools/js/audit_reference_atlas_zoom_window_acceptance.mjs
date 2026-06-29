import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ownerReviewDir = path.resolve(
  root,
  process.env.ANCHOR_REF_ATLAS_ZOOM_WINDOW_OWNER_REVIEW_DIR
    ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR
    ?? 'artifacts/owner-review/ref-atlas-zoom-window-r1'
);
const summaryPath = path.join(ownerReviewDir, 'qa-summary.json');

const requiredScreenshots = [
  '01-default-atlas.png',
  '02-deep-zoom-gulf.png',
  '03-gulf-segment-preset.png',
  '04-gulf-operational-window-large.png',
  '05-gulf-multitile-budget.png',
  '06-gulf-multitile-request-export.png',
  '07-typed-window-editor.png',
  '08-tiny-selection-guidance.png',
  '09-monterey-focused-close-zoom.png',
  '10-monterey-loaded.png',
  '11-generation-pipeline-still-works.png',
  '12-planning-launch-ready.png'
];

const requiredFields = [
  'status',
  'branch',
  'head',
  'maxZoom',
  'zoomReached',
  'resetWorked',
  'gulfPresetWidthKm',
  'gulfPresetHeightKm',
  'gulfScaleClass',
  'gulfGenerationAllowed',
  'gulfPatchRequestAllowed',
  'gulfMultiTileRecommended',
  'gulfPatchRequestDigest',
  'typedWindowWorked',
  'tinySelectionHandled',
  'montereyFocusedZoom',
  'montereyLoadedFixtureId',
  'montereyLoadedFixtureRole',
  'bathymetryArtifactDigest',
  'currentArtifactDigest',
  'environmentArtifactDigest',
  'launchValidationStatus',
  'hiddenTruthExposed',
  'rawExternalDataPathExposed',
  'simulationChanged',
  'scoringChanged',
  'pageResponsiveAfterSelections',
  'activeRendererCountAfterCleanup',
  'activeRafCountAfterCleanup',
  'activeCanvasCountAfterCleanup'
];

assert.ok(existsSync(summaryPath), `zoom-window owner-review qa-summary missing: ${summaryPath}`);
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

for (const field of requiredFields) assert.ok(Object.hasOwn(summary, field), `qa-summary missing ${field}`);
for (const screenshot of requiredScreenshots) {
  assert.ok(existsSync(path.join(ownerReviewDir, screenshot)), `zoom-window owner-review screenshot missing: ${screenshot}`);
}

assert.ok(['PASS', 'PASS_WITH_NON_BLOCKING_WARNINGS'].includes(summary.status), `invalid status ${summary.status}`);
assert.ok(Number(summary.maxZoom) >= 16, `maxZoom ${summary.maxZoom}`);
assert.ok(Number(summary.zoomReached) >= 16, `zoomReached ${summary.zoomReached}`);
assert.equal(summary.resetWorked, true, 'reset worked');
assert.ok(Number(summary.gulfPresetWidthKm) >= 700, `Gulf width ${summary.gulfPresetWidthKm}`);
assert.ok(Number(summary.gulfPresetHeightKm) >= 400, `Gulf height ${summary.gulfPresetHeightKm}`);
assert.equal(summary.gulfScaleClass, 'gulfScale', 'Gulf scale class');
assert.equal(summary.gulfGenerationAllowed, false, 'Gulf generation disabled');
assert.equal(summary.gulfPatchRequestAllowed, true, 'Gulf patch request allowed');
assert.equal(summary.gulfMultiTileRecommended, true, 'Gulf multi-tile recommended');
assert.match(summary.gulfPatchRequestDigest, /^fnv1a32:/, 'Gulf patch request digest');
assert.equal(summary.typedWindowWorked, true, 'typed window worked');
assert.equal(summary.tinySelectionHandled, true, 'tiny selection handled');
assert.ok(Number(summary.montereyFocusedZoom) >= 16, `Monterey focused zoom ${summary.montereyFocusedZoom}`);
assert.equal(summary.montereyLoadedFixtureId, 'monterey_canyon_15s', 'Monterey fixture still loads');
assert.equal(summary.montereyLoadedFixtureRole, 'missionReadyPatch', 'Monterey fixture role');
assert.match(summary.bathymetryArtifactDigest, /fnv1a32:/, 'bathymetry digest');
assert.match(summary.currentArtifactDigest, /^fnv1a32:/, 'current digest');
assert.match(summary.environmentArtifactDigest, /^fnv1a32:/, 'environment digest');
assert.ok(['PASS', 'WARN'].includes(summary.launchValidationStatus), `launch validation status ${summary.launchValidationStatus}`);
assert.equal(summary.hiddenTruthExposed, false, 'no hidden truth exposure');
assert.equal(summary.rawExternalDataPathExposed, false, 'no raw external data path exposure');
assert.equal(summary.simulationChanged, false, 'simulation unchanged');
assert.equal(summary.scoringChanged, false, 'scoring unchanged');
assert.equal(summary.pageResponsiveAfterSelections, true, 'page responsive after selections');
assert.equal(summary.activeRendererCountAfterCleanup, 0, 'renderer cleanup count');
assert.equal(summary.activeRafCountAfterCleanup, 0, 'RAF cleanup count');
assert.equal(summary.activeCanvasCountAfterCleanup, 0, 'canvas cleanup count');

console.log('audit_reference_atlas_zoom_window_acceptance: ok', {
  path: path.relative(root, summaryPath),
  screenshotCount: requiredScreenshots.length,
  zoomReached: summary.zoomReached,
  gulfPatchRequestDigest: summary.gulfPatchRequestDigest
});
