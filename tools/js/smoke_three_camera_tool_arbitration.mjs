import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const camera = readFileSync('src/game/three/ThreeMissionCameraController.js', 'utf8');

assert.ok(controller.includes('cameraGestureTypeForEvent'), 'Interaction controller should centralize camera gesture arbitration.');
assert.ok(controller.includes("if (event.button === 2) return 'orbit'"), 'Right button should orbit.');
assert.ok(controller.includes("if (event.button === 1) return 'dolly'"), 'Middle button should dolly.');
assert.ok(controller.includes("controller.pointerDown.cameraGestureType = 'pan'"), 'Left drag over threshold should promote to pan.');
assert.ok(controller.includes('controller.pointerDown.movementPixels = movementPixels'), 'Pointer movement should be measured in CSS pixels.');
assert.ok(controller.includes('controller.clickThresholdCssPx'), 'Click/drag arbitration should use a threshold.');
assert.ok(controller.includes("classification: 'missionClick'"), 'Below-threshold left click should remain a mission click.');
assert.ok(controller.includes("missionClickSuppressedReason: cameraMoved || pointerDown.cameraGesture ? `${classification}Gesture`"), 'Camera gestures should suppress mission clicks.');
assert.ok(controller.includes("contextmenu"), 'Controller should prevent context menu on the canvas only.');
assert.ok(camera.includes("LEFT: 'PAN'"), 'Camera mapping should document left drag as pan.');
assert.ok(camera.includes("RIGHT: 'ROTATE'"), 'Camera mapping should document right drag as rotate/orbit.');
assert.ok(camera.includes("MIDDLE: 'DOLLY'"), 'Camera mapping should document middle drag as dolly.');
assert.ok(controller.includes('cameraController?.orbitBy'), 'Camera orbit should delegate to camera controller.');
assert.ok(controller.includes('cameraController?.panBy'), 'Camera pan should delegate to camera controller.');
assert.ok(controller.includes('cameraController?.zoomByDelta'), 'Wheel and middle dolly should delegate to camera controller.');
assert.ok(scene.includes('setPlanningTool(toolId, context = {})'), 'Scene should own visible planning tool state.');
assert.ok(scene.includes('syncPlanningToolToThreeController()'), 'Scene should keep Three controller mode in sync.');
assert.doesNotMatch(controller, /addWaypoint\(|setSelectedStart\(|removeWaypoint\(|updateWaypoint\(/, 'Interaction controller must not mutate canonical planning state.');

console.log('Three camera tool arbitration smoke passed.');
