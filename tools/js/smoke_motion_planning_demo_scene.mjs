import assert from 'node:assert/strict';
import fs from 'node:fs';

import { MotionPlanningDemoScene, MOTION_PLANNING_DEMO_VERSION } from '../../src/game/phaser/scenes/MotionPlanningDemoScene.js';

const scene = new MotionPlanningDemoScene();
scene.init({
  motionModelId: 'depthLayerKinematic',
  currentStrength: 1.2,
  crossCurrentStrength: 0.8,
  gliderSpeed: 1,
  headingRateLimit: 8,
  driftGain: 1,
  diveProfileId: 'sawtoothProfile'
});

const phaserGameSource = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
const mainMenuSource = fs.readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const sceneSource = fs.readFileSync('src/game/phaser/scenes/MotionPlanningDemoScene.js', 'utf8');
assert.ok(phaserGameSource.includes('MotionPlanningDemoScene'), 'scene registered in PhaserGame');
assert.ok(mainMenuSource.includes('Motion Planning Demo'), 'Simulation Lab hub contains Motion Planning Demo');
assert.ok(sceneSource.includes('ANCHOR_MOTION_PLANNING_DEMO_DEBUG'), 'scene source defines debug object');
assert.equal(/usesWebGPUFluid:\s*true|usesMARL:\s*true|usesNewPlanner:\s*true/.test(sceneSource), false, 'scene source does not claim WebGPU, MARL, or a new planner');
assert.equal(MOTION_PLANNING_DEMO_VERSION, 'motion-planning-demo-motion-r1', 'scene version');
assert.equal(scene.trace.type, 'anchor.motion.trajectory', 'scene builds trajectory on init');
assert.equal(scene.trace.generatedRoute, false, 'scene does not generate route');
assert.equal(scene.trace.usesNewPlanner, false, 'scene does not add planner');
assert.equal(scene.trace.usesWebGPUFluid, false, 'scene does not use WebGPU');
assert.equal(scene.trace.usesMARL, false, 'scene does not use MARL/RL');
assert.equal(scene.summary.present, true, 'scene summary present');
assert.equal(Number.isFinite(scene.summary.meanTrackError), true, 'scene mean track error finite');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.active, true, 'debug object active after init');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesMotionDynamics, true, 'debug object marks motion dynamics');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesWebGPUFluid, false, 'debug object does not claim WebGPU');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesNewPlanner, false, 'debug object does not claim planner');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.notTopLevelMode, true, 'debug object marks sandbox placement');

console.log('Motion Planning Demo scene smoke passed', {
  realizedTrackPointCount: scene.summary.realizedTrackPointCount,
  sampledPointCount: scene.summary.sampledPointCount
});
