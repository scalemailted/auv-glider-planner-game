import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');

assert.ok(controller.includes('cameraGestureTypeForEvent'), 'Interaction controller should centralize camera gesture arbitration.');
assert.ok(controller.includes("controller.interactionMode === 'navigate' && isPrimaryButton(event)"), 'Navigate tool should allow primary-button orbit.');
assert.ok(controller.includes("event.button === 2") && controller.includes("event.shiftKey"), 'Right button and Shift should pan.');
assert.ok(controller.includes('cameraController?.orbitBy'), 'Camera orbit should delegate to camera controller.');
assert.ok(controller.includes('cameraController?.panBy'), 'Camera pan should delegate to camera controller.');
assert.ok(controller.includes('cameraController?.zoomByDelta'), 'Wheel zoom should delegate to camera controller.');
assert.ok(scene.includes('setMissionPlanningTool'), 'Scene should map visible tools to interaction modes.');
assert.ok(scene.includes('setThreeMissionInteractionMode(this.threeInteractionController'), 'Scene should keep Three controller mode in sync.');
assert.doesNotMatch(controller, /addWaypoint\(|setSelectedStart\(|removeWaypoint\(|updateWaypoint\(/, 'Interaction controller must not mutate canonical planning state.');

console.log('Three camera tool arbitration smoke passed.');