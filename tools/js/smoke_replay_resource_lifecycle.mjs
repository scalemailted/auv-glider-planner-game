#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/game/phaser/scenes/MissionReplayReviewScene.js', 'utf8');
assert.ok(scene.includes('createThreeMissionSceneLifecycle'), 'replay scene creates lifecycle tracking');
assert.ok(scene.includes('registerThreeMissionSceneResource'), 'replay scene registers renderer resources');
assert.ok(scene.includes('disposeThreeMissionSceneLifecycle'), 'replay scene disposes lifecycle resources');
assert.ok(scene.includes('disposeThreeMissionWorldRenderer'), 'replay scene disposes Three renderer');
assert.ok(scene.includes('disposeThreeReplayReviewController'), 'replay scene disposes replay controller');
assert.ok(scene.includes('clearInterval'), 'replay scene clears playback timer');
assert.ok(scene.includes('ANCHOR_THREE_REPLAY_DEBUG'), 'replay scene publishes debug object');
console.log('smoke_replay_resource_lifecycle: PASS', JSON.stringify({ lifecycle: true, debug: true }));
