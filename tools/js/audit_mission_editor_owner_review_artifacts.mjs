import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('test-results/three-r2b-owner-review');
const summaryPath = path.join(dir, 'qa-summary.json');
const requiredScreenshots = [
  '01-editor-open.png',
  '02-editor-terrain.png',
  '03-editor-drop-zone.png',
  '04-editor-hazard.png',
  '05-editor-objective.png',
  '06-editor-sampling-target.png',
  '07-editor-water-column.png',
  '08-editor-invalid-validation.png',
  '09-editor-repaired-validation.png',
  '10-editor-preview-planning.png',
  '11-editor-export-reimport.png',
  '12-main-menu-cleanup.png',
  '13-compact-editor-layout.png'
];

assert.ok(fs.existsSync(summaryPath), 'three-r2b owner review qa-summary.json must exist');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
assert.equal(summary.phase, 'THREE-R2B Mission Editor Acceptance');
assert.equal(summary.pass, true, 'qa summary pass flag must be true');
assert.equal(summary.roundtrip?.valid, true, 'roundtrip should validate');
assert.equal(summary.blocked?.allowed, false, 'invalid preview should be blocked');
assert.equal(summary.repaired?.valid, true, 'repair should restore a valid editor document');
assert.equal(summary.debug?.normalEditorUsesThree, true, 'normal editor uses Three');
assert.equal(summary.debug?.usesLegacyPhaserWorldRenderer, false, 'legacy Phaser editor world not active');
assert.equal(summary.cleanup?.canvasCount, 0, 'canvas cleanup count should be zero after return to menu');
assert.equal(summary.cleanup?.hostCount, 0, 'host cleanup count should be zero after return to menu');
assert.ok(Array.isArray(summary.screenshots), 'owner review should include screenshot package');
assert.ok(summary.screenshots.length >= requiredScreenshots.length, 'owner review should include the required 13 screenshots');
const listedNames = new Set(summary.screenshots.map((screenshot) => path.basename(screenshot)));
for (const fileName of requiredScreenshots) {
  assert.ok(listedNames.has(fileName), `qa summary missing ${fileName}`);
  const file = path.join(dir, fileName);
  assert.ok(fs.existsSync(file), `missing screenshot ${fileName}`);
  assert.ok(fs.statSync(file).size > 0, `empty screenshot ${fileName}`);
}
const performance = summary.performance ?? {};
assert.ok(Number(performance.sampleCount) > 10, 'headed editor performance sample should include more than 10 frames');
assert.ok(Number(performance.averageFrameMilliseconds) <= 50, 'average frame interval should be <= 50 ms');
assert.ok(Number(performance.p95FrameMilliseconds) <= 100, 'p95 frame interval should be <= 100 ms');
assert.ok(Number(performance.renderedFramesPerSecond) >= 20, 'rendered FPS should be >= 20');
assert.ok(Number.isFinite(Number(performance.p50FrameMilliseconds)), 'p50 frame interval should be reported');
assert.ok(Number.isFinite(Number(performance.p99FrameMilliseconds)), 'p99 frame interval should be reported');
assert.ok(Number.isFinite(Number(performance.maximumFrameMilliseconds)), 'max frame interval should be reported');
console.log('audit_mission_editor_owner_review_artifacts: PASS', JSON.stringify({ screenshots: summary.screenshots.length, performance }));
