#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const scenePath = 'src/game/phaser/scenes/MissionReplayReviewScene.js';
const text = fs.readFileSync(scenePath, 'utf8');
const match = text.match(/setCameraPreset\(preset\) \{([\s\S]*?)\n  \}\n\n  selectReplayAgent/);
assert.ok(match, 'setCameraPreset method should exist');
const body = match[1];
assert.match(body, /replayInvariantSnapshot\(this\)/, 'camera preset must snapshot replay invariants');
assert.match(body, /setThreeMissionWorldCamera/, 'camera preset should only update the renderer camera');
assert.doesNotMatch(body, /applyReplayAction|reduceReplayReviewSession|updateThreeReplayReviewController/, 'camera preset must not reduce replay state');
for (const field of ['cameraReplayInvariantStatus', 'cameraReplayInvariantFailures', 'eventListRenderCountDuringCameraGesture', 'terrainBuildCount']) {
  assert.match(text, new RegExp(field), `debug field ${field} should be exposed`);
}
console.log('audit_replay_camera_invariants: PASS', JSON.stringify({ checked: scenePath }));
