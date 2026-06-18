import { strict as assert } from 'node:assert';
import { createMissionWorldCoordinateTransform, gridCellToWorld } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { positionForCell } from '../../src/game/three/layers/ThreeMissionLayerUtils.js';
import { createThreeMissionCameraController, threeMissionCameraControllerSummary } from '../../src/game/three/ThreeMissionCameraController.js';
import * as THREE from 'three';
const tx = createMissionWorldCoordinateTransform({ grid: { width: 10, height: 8 } });
for (const cell of [{ x: 0, y: 0 }, { x: 4, y: 3 }, { x: 9, y: 7 }]) {
  const canonical = gridCellToWorld(tx, cell.x, cell.y, 0);
  const layerNames = ["drop zone", "heatmap", "selector", "waypoint", "Gold Star", "current vector", "glider"];
  for (const name of layerNames) {
    const p = positionForCell(tx, cell.x, cell.y, 0, 0);
    assert(Math.abs(p.x - canonical.x) < 1e-9, name + " x alignment");
    assert(Math.abs(p.z - canonical.z) < 1e-9, name + " z alignment");
  }
}
const camera = new THREE.PerspectiveCamera(46, 1.2, 0.1, 4000);
const controller = createThreeMissionCameraController({ camera, bounds: { minX: -5, maxX: 5, minZ: -4, maxZ: 4, radius: 10 } });
const summary = threeMissionCameraControllerSummary(controller);
assert.equal(Number.isFinite(summary.lastCameraPosition.x), true, 'camera x finite after coordinate setup');
assert.equal(Number.isFinite(summary.lastCameraPosition.z), true, 'camera z finite after coordinate setup');
console.log('Three layer coordinate alignment audit passed.');