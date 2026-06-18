import assert from 'node:assert/strict';
import * as THREE from 'three';

import { createMissionWorldCoordinateTransform, gridCellToWorld, worldToGridCell } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { canvasLocalToNdc, pointerClientToCanvasLocal } from '../../src/core/rendering/MissionWorldPointerCoordinates.js';
import { createThreeMissionCameraController, setThreeMissionCameraPreset, threeMissionCameraControllerSummary } from '../../src/game/three/ThreeMissionCameraController.js';

const tx = createMissionWorldCoordinateTransform({ grid: { width: 12, height: 10 } });
const rect = { left: 100, top: 40, width: 800, height: 600 };
const ndc = canvasLocalToNdc(pointerClientToCanvasLocal({ clientX: 500, clientY: 340 }, rect), rect);
assert.ok(Math.abs(ndc.x) < 0.001, 'center pointer should map near NDC x=0');
assert.ok(Math.abs(ndc.y) < 0.001, 'center pointer should map near NDC y=0');

for (const preset of ['tacticalTopDown', 'obliqueMission', 'waterColumnProfile', 'fleetOverview']) {
  const camera = new THREE.PerspectiveCamera(46, rect.width / rect.height, 0.1, 4000);
  const controller = createThreeMissionCameraController({ camera, presetId: preset, bounds: { minX: -6, maxX: 6, minZ: -5, maxZ: 5, radius: 12 } });
  setThreeMissionCameraPreset(controller, preset);
  const summary = threeMissionCameraControllerSummary(controller);
  assert.equal(summary.cameraPresetId, preset);
  assert.equal(Number.isFinite(summary.lastCameraPosition.x), true, `${preset} camera x finite`);
  for (const cell of [{ x: 0, y: 0 }, { x: 6, y: 5 }, { x: 11, y: 9 }]) {
    const world = gridCellToWorld(tx, cell.x, cell.y, 0);
    const resolved = worldToGridCell(tx, world.x, world.y, world.z);
    assert.equal(resolved.x, cell.x, `${preset} x roundtrip`);
    assert.equal(resolved.y, cell.y, `${preset} y roundtrip`);
  }
}

console.log('Three camera pointer calibration smoke passed.');