import assert from 'node:assert/strict';

import { disposeThreeMissionInteractionController, threeMissionInteractionControllerSummary } from '../../src/game/three/ThreeMissionInteractionController.js';
import { THREE_MISSION_CAMERA_MOUSE_MAPPING, threeMissionCameraControllerSummary } from '../../src/game/three/ThreeMissionCameraController.js';
import { createThreeInteractionHarness, dispatchDomEvent } from './three_r1_1c_interaction_harness.mjs';

assert.equal(THREE_MISSION_CAMERA_MOUSE_MAPPING.LEFT, 'PAN', 'left mouse should map to pan after drag arbitration');
assert.equal(THREE_MISSION_CAMERA_MOUSE_MAPPING.MIDDLE, 'DOLLY', 'middle mouse should map to dolly');
assert.equal(THREE_MISSION_CAMERA_MOUSE_MAPPING.RIGHT, 'ROTATE', 'right mouse should map to orbit/rotate');
assert.equal(THREE_MISSION_CAMERA_MOUSE_MAPPING.screenSpacePanning, true, 'screen-space panning should be deliberate');

const harness = createThreeInteractionHarness({ interactionMode: 'placeWaypoint' });
const cameraSummary = threeMissionCameraControllerSummary(harness.cameraController);
assert.equal(cameraSummary.cameraPanEnabled, true, 'pan must be enabled');
assert.equal(cameraSummary.cameraOrbitEnabled, true, 'rotate/orbit must be enabled');
assert.equal(cameraSummary.cameraZoomEnabled, true, 'zoom must be enabled');
assert.equal(cameraSummary.screenSpacePanning, true, 'controller summary should expose screen-space panning');
assert.deepEqual(cameraSummary.cameraMouseMapping, THREE_MISSION_CAMERA_MOUSE_MAPPING, 'summary should expose standard mouse mapping');

const contextListener = harness.domElement.__listeners.find((record) => record.targetName === 'dom' && record.type === 'contextmenu');
assert.ok(contextListener, 'context menu listener should be scoped to the canvas/dom element');
assert.equal(harness.domElement.__listeners.some((record) => record.targetName === 'document' && record.type === 'contextmenu'), false, 'context menu listener must not be global');
const event = dispatchDomEvent(harness.domElement, 'contextmenu', {});
assert.equal(event.defaultPrevented, true, 'canvas context menu should be prevented');
assert.equal(threeMissionInteractionControllerSummary(harness.controller).contextMenuPreventedCount, 1, 'context menu prevention should be counted');

disposeThreeMissionInteractionController(harness.controller);
assert.equal(harness.controller.disposed, true, 'controller should dispose cleanly');
assert.ok(harness.domElement.__removedListeners.some((record) => record.targetName === 'dom' && record.type === 'contextmenu'), 'dispose should remove canvas contextmenu listener');
assert.equal(harness.controller.listeners.length, 0, 'dispose should clear controller listener records');

console.log('THREE-R1.1C standard camera mapping smoke passed.');
