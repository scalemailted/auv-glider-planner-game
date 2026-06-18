import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  THREE_MISSION_CAMERA_CONTROLLER_VERSION,
  createThreeMissionCameraController,
  focusThreeMissionCamera,
  resetThreeMissionCamera,
  setThreeMissionCameraPreset,
  threeMissionCameraControllerSummary,
  updateThreeMissionCameraBounds
} from '../../src/game/three/ThreeMissionCameraController.js';

const camera = new THREE.PerspectiveCamera(46, 1.4, 0.1, 4000);
const renderer = { cameraState: {} };
const controller = createThreeMissionCameraController({ camera, renderer, presetId: 'obliqueMission', bounds: { minX: -5, maxX: 5, minZ: -4, maxZ: 4, radius: 8 } });
assert.equal(controller.version, THREE_MISSION_CAMERA_CONTROLLER_VERSION);
let summary = threeMissionCameraControllerSummary(controller);
for (const key of ['cameraAzimuthRadians', 'cameraPolarRadians', 'cameraDistance']) {
  assert.equal(Number.isFinite(summary[key]), true, `${key} should be finite`);
}
assert.deepEqual(summary.cameraTarget, { x: 0, y: 0, z: 0 });

controller.beginGesture('orbit', 0);
controller.orbitBy(24, -12);
controller.endGesture();
controller.beginGesture('pan', 2);
controller.panBy(40, 16);
controller.endGesture();
controller.beginGesture('zoom', null);
controller.zoomByDelta(-120);
controller.endGesture();
summary = threeMissionCameraControllerSummary(controller);
assert.equal(summary.cameraOrbitChangeCount, 1);
assert.equal(summary.cameraPanChangeCount, 1);
assert.equal(summary.cameraZoomChangeCount, 1);
assert.equal(summary.cameraOrbitEnabled, true);
assert.equal(summary.cameraPanEnabled, true);
assert.equal(summary.cameraZoomEnabled, true);
for (const key of ['x', 'y', 'z']) assert.equal(Number.isFinite(summary.lastCameraPosition[key]), true, `camera position ${key} finite`);

focusThreeMissionCamera(controller, { x: 3, y: 0, z: -2 });
assert.equal(threeMissionCameraControllerSummary(controller).lastCameraTarget.x, 3);
setThreeMissionCameraPreset(controller, 'fleetOverview');
assert.equal(threeMissionCameraControllerSummary(controller).cameraPresetId, 'fleetOverview');
updateThreeMissionCameraBounds(controller, { minX: -2, maxX: 2, minZ: -2, maxZ: 2, radius: 6 });
resetThreeMissionCamera(controller);
assert.equal(threeMissionCameraControllerSummary(controller).cameraPresetId, 'obliqueMission');
assert.equal(renderer.cameraState.manual, false);

console.log('Three mission camera controller smoke passed.');