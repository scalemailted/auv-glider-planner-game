#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'test-results/three-r2a-owner-review';
const docPath = 'docs/three_r2a_visual_acceptance.md';
const expectedScreenshots = [
  '01-debrief-summary.png',
  '02-replay-initial-state.png',
  '03-replay-playing.png',
  '04-replay-planned-predicted-realized.png',
  '05-replay-depth-observation.png',
  '06-replay-terrain-event.png',
  '07-replay-side-profile.png',
  '08-replay-multi-agent-glider-01.png',
  '09-replay-multi-agent-glider-02.png',
  '10-replay-checkpoint-navigation.png',
  '11-replay-terminal-state.png',
  '12-debrief-after-replay.png',
  '13-main-menu-cleanup.png',
  '14-compact-replay-layout.png'
];
assert.ok(fs.existsSync(dir), `${dir} must exist`);
for (const file of expectedScreenshots) {
  const full = path.join(dir, file);
  assert.ok(fs.existsSync(full), `missing screenshot ${full}`);
  assert.ok(fs.statSync(full).size > 1024, `screenshot ${full} is unexpectedly small`);
}
const summaryPath = path.join(dir, 'qa-summary.json');
assert.ok(fs.existsSync(summaryPath), 'qa-summary.json must exist');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
assert.equal(summary.phase, 'THREE-R2A.1 Replay Review Acceptance');
assert.equal(summary.integrityStatus, 'PASS');
assert.equal(summary.status, 'PASS');
assert.ok(Number(summary.performance?.averageFrameMilliseconds) <= 50, 'average frame gate failed');
assert.ok(Number(summary.performance?.p95FrameMilliseconds) <= 100, 'p95 frame gate failed');
assert.ok(Number(summary.performance?.renderedFramesPerSecond) >= 20, 'FPS gate failed');
assert.equal(summary.lifecycle?.finalRendererCount, 0);
assert.equal(summary.lifecycle?.finalRafCount, 0);
for (const file of expectedScreenshots) assert.ok((summary.screenshots ?? []).includes(path.join(dir, file).replace(/\\/g, '/')) || (summary.screenshots ?? []).includes(file), `qa-summary missing ${file}`);
assert.ok(fs.existsSync(docPath), `${docPath} must exist`);
const doc = fs.readFileSync(docPath, 'utf8');
for (const file of expectedScreenshots) assert.match(doc, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `doc missing ${file}`);
for (const box of ['Debrief summary accepted', 'Replay controls accepted', 'Ready to begin THREE-R2B']) assert.match(doc, new RegExp(`- \\[ \\] ${box}`), `owner box must remain unchecked: ${box}`);
console.log('audit_replay_owner_review_artifacts: PASS', JSON.stringify({ screenshots: expectedScreenshots.length, summaryPath }));
