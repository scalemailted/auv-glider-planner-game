import assert from 'node:assert/strict';
import fs from 'node:fs';

const phaserGame = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
const debrief = fs.readFileSync('src/game/phaser/scenes/DebriefScene.js', 'utf8');
const missionConsole = fs.readFileSync('src/ui/MissionConsole.js', 'utf8');
const viewerScene = fs.readFileSync('src/game/phaser/scenes/HeadlessBundleViewerScene.js', 'utf8');
const viewerPanel = fs.readFileSync('src/ui/headless/HeadlessBundleViewerPanel.js', 'utf8');
const replayScene = fs.readFileSync('src/game/phaser/scenes/MissionReplayReviewScene.js', 'utf8');
const renderer = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');

assert.ok(phaserGame.includes('MissionReplayReviewScene'), 'PhaserGame registers MissionReplayReviewScene');
assert.ok(phaserGame.includes("replayReview: 'MissionReplayReviewScene'"), 'PhaserGame exposes replayReview alias');
assert.ok(debrief.includes('buildReplayReviewSourceFromResult'), 'Debrief builds replay review source from result');
assert.ok(debrief.includes('data-action="review-replay"'), 'Debrief overlay exposes Review Replay action');
assert.ok(missionConsole.includes('data-action="review-replay"'), 'Debrief console exposes Review Replay action');
assert.ok(viewerScene.includes('buildReplayReviewSourceFromBundle'), 'Headless viewer builds replay source from bundle');
assert.ok(viewerPanel.includes('open-three-replay-review'), 'Headless viewer panel exposes Three review action');
assert.ok(replayScene.includes('ANCHOR_THREE_REPLAY_DEBUG'), 'Replay scene publishes debug object');
assert.ok(replayScene.includes('disposeThreeMissionWorldRenderer'), 'Replay scene disposes Three renderer');
assert.ok(renderer.includes("viewModel.phase === 'replay'"), 'Three renderer treats replay observations as simulation-style observation layer input');
console.log('smoke_three_replay_debrief_integration: PASS');
