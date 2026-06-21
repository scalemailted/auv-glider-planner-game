import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/game/phaser/scenes/MissionReplayReviewScene.js', 'utf8');
const controller = fs.readFileSync('src/game/three/ThreeReplayReviewController.js', 'utf8');
const renderer = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');

assert.ok(scene.includes('createThreeMissionSceneLifecycle'), 'Replay scene creates a Three lifecycle tracker');
assert.ok(scene.includes('registerThreeMissionSceneResource'), 'Replay scene registers Three resources');
assert.ok(scene.includes('disposeThreeMissionSceneLifecycle'), 'Replay scene disposes lifecycle resources');
assert.ok(scene.includes('clearInterval'), 'Replay scene clears playback interval');
assert.ok(scene.includes('disposeThreeReplayReviewController'), 'Replay scene disposes replay controller');
assert.ok(scene.includes('disposeThreeMissionWorldRenderer'), 'Replay scene disposes Three renderer');
assert.ok(scene.includes('threeMissionSceneLifecycleSummary'), 'Replay scene exposes lifecycle summary in debug');
assert.ok(controller.includes('ownsSimulation: false'), 'Replay controller boundary says no simulation ownership');
assert.ok(controller.includes('changesOfficialBrowserScoring: false'), 'Replay controller boundary says no scoring changes');
assert.ok(renderer.includes("viewModel.type === 'anchor.rendering.replay-world'"), 'Renderer recognizes replay world observation path');
console.log('audit_three_replay_renderer_lifecycle: PASS');
