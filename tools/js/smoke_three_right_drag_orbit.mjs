import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as THREE from 'three';
import { createThreeMissionCameraController, threeMissionCameraControllerSummary } from '../../src/game/three/ThreeMissionCameraController.js';

function createController() {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1000);
  return createThreeMissionCameraController({ camera, bounds: { minX: -8, maxX: 8, minZ: -6, maxZ: 6, radius: 10 }, presetId: 'obliqueMission' });
}

let controller = createController();
controller.beginGesture('orbit', 2);
const startAzimuth = controller.azimuthRadians;
controller.orbitBy(48, 0);
controller.endGesture();
let summary = threeMissionCameraControllerSummary(controller);
assert.ok(Math.abs(summary.cameraAzimuthRadians - startAzimuth) > 0.01, 'horizontal right drag should change azimuth/yaw');
assert.ok(Math.abs(summary.cameraAzimuthDelta) > 0.01, 'horizontal drag should record azimuth delta');
assert.equal(Math.abs(summary.cameraPolarDelta) < 0.000001, true, 'pure horizontal drag should not need polar delta');

controller = createController();
controller.beginGesture('orbit', 2);
const startPolar = controller.polarRadians;
controller.orbitBy(0, 48);
controller.endGesture();
summary = threeMissionCameraControllerSummary(controller);
assert.ok(Math.abs(summary.cameraPolarRadians - startPolar) > 0.01, 'vertical right drag should change polar/pitch');
assert.ok(Math.abs(summary.cameraPolarDelta) > 0.01, 'vertical drag should record polar delta');
assert.ok(controller.polarRadians >= controller.minPolarRadians && controller.polarRadians <= controller.maxPolarRadians, 'polar angle should remain inside limits');

controller = createController();
controller.beginGesture('orbit', 2);
controller.orbitBy(52, 38);
controller.endGesture();
summary = threeMissionCameraControllerSummary(controller);
assert.ok(Math.abs(summary.cameraAzimuthDelta) > 0.01, 'diagonal right drag should change azimuth');
assert.ok(Math.abs(summary.cameraPolarDelta) > 0.01, 'diagonal right drag should change polar angle');
assert.ok(summary.lastCameraPosition.y >= 0.65, 'camera should not pass below the mission plane');

const rendererSource = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
assert.doesNotMatch(rendererSource, /worldGroup\.rotation\s*[.=]/, 'renderer must not rotate the world group as an orbit substitute');

console.log('THREE-R1.1C right-drag orbit smoke passed.');
