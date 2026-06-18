import assert from 'node:assert/strict';
import fs from 'node:fs';

const pureRendererFiles = [
  'src/core/rendering/MissionWorldInteractionIntent.js',
  'src/core/rendering/MissionWorldInteractionResult.js',
  'src/core/rendering/MissionPlanningInteractionViewModel.js',
  'src/game/three/ThreeMissionHitTest.js',
  'src/game/three/ThreeMissionInteractionController.js',
  'src/game/three/layers/ThreePlanningInteractionLayer.js',
  'src/game/three/ThreeMissionWorldRenderer.js'
];
const banned = [
  /core\/sim\//,
  /core\\sim\\/,
  /core\/scoring\//,
  /core\\scoring\\/,
  /WaypointPlan/,
  /WaypointPlacementGuard/,
  /MissionWorkspaceScene/
];
const violations = [];
for (const file of pureRendererFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(source)) violations.push(`${file}: banned renderer/planning boundary reference ${pattern}`);
  }
  assert.ok(source.includes('ownsPlanning: false') || source.includes('usesSharedMissionCoordinates: true') || file.includes('MissionWorldInteractionIntent'), `${file} should explicitly avoid planning ownership or expose only coordinate hit-test metadata`);
}
const bridge = fs.readFileSync('src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js', 'utf8');
assert.equal(/WaypointPlan|WaypointPlacementGuard|core\/sim\/|core\\sim\\|core\/scoring\/|core\\scoring\\/.test(bridge), false, 'bridge should route to scene methods instead of importing planning/sim/scoring internals');
assert.deepEqual(violations, [], `Three planning interaction boundary violations:\n${violations.join('\n')}`);
console.log('Three planning interaction boundary audit passed');



