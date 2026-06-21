#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const reducer = fs.readFileSync('src/core/replay/ReplayPlaybackReducer.js', 'utf8');
const session = fs.readFileSync('src/core/replay/ReplayReviewSession.js', 'utf8');
const controller = fs.readFileSync('src/game/three/ThreeReplayReviewController.js', 'utf8');
const viewer = fs.readFileSync('src/game/phaser/scenes/HeadlessBundleViewerScene.js', 'utf8');
assert.ok(reducer.includes('export function replayPlaybackReducer'), 'shared reducer is exported');
assert.ok(session.includes('ReplayPlaybackReducer.js'), 'ReplayReviewSession consumes shared reducer');
assert.ok(controller.includes('ReplayReviewSession.js'), 'Three controller consumes reducer through session');
assert.ok(viewer.includes('ReplayPlaybackReducer.js'), 'Headless Bundle Viewer consumes shared reducer');
assert.equal(/from ['"].*SimulationEngine/.test(reducer), false, 'reducer does not import simulation engine');
assert.equal(/from ['"].*Three/.test(reducer), false, 'reducer does not import Three');
assert.equal(/from ['"].*Phaser/.test(reducer), false, 'reducer does not import Phaser');
console.log('audit_shared_replay_reducer_consumers: PASS', JSON.stringify({ session: true, controller: true, headlessBundleViewer: true }));
