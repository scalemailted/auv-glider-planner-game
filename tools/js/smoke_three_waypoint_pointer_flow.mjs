import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');

for (const intent of ['previewWaypointMove', 'commitWaypointMove', 'cancelWaypointMove', 'deleteWaypoint']) {
  assert.ok(controller.includes(intent), `controller must emit ${intent}.`);
}
assert.match(controller, /clickThresholdCssPx/, 'controller must separate click from drag.');
assert.match(controller, /cameraGesture/, 'controller must arbitrate camera gestures.');
for (const command of ['previewWaypointMoveFromThree', 'commitWaypointMoveFromThree', 'cancelWaypointMoveFromThree', 'deleteWaypointById']) {
  assert.ok(scene.includes(command), `scene must commit ${command} through canonical workspace state.`);
}
assert.doesNotMatch(controller, /plan\.agentPlans|waypoints\.push|splice\(/, 'controller must not mutate plan arrays directly.');

console.log('Three waypoint pointer flow smoke passed.');