import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createThreeMissionCameraController, setThreeMissionCameraPreset } from '../../src/game/three/ThreeMissionCameraController.js';

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
const controller = createThreeMissionCameraController({ camera, bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10, minY: -8, maxY: 6, radius: 14 } });
assert.ok(controller.minPolarRadians <= 0.1, 'near top-down polar reachable');
assert.ok(controller.maxPolarRadians >= 1.5, 'near side-profile polar reachable');
setThreeMissionCameraPreset(controller, 'sideProfile');
assert.ok(controller.polarRadians > 1.4, 'side profile preset is near-horizontal');
const before = controller.polarRadians;
controller.orbitBy(0, -80);
assert.notEqual(controller.polarRadians, before, 'vertical drag changes polar angle');
assert.ok(controller.polarRadians <= controller.maxPolarRadians, 'no upside-down flip');
setThreeMissionCameraPreset(controller, 'divePlanningView');
assert.ok(controller.distance > 0, 'selected-dive preset fits with finite distance');
console.log(JSON.stringify({ ok: true, min: controller.minPolarRadians, max: controller.maxPolarRadians, polar: controller.polarRadians }));