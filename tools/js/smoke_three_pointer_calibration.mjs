import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { createMissionWorldCoordinateTransform, gridCellToWorld, worldToGridCell } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { pointerClientToCanvasLocal, canvasLocalToNdc } from '../../src/core/rendering/MissionWorldPointerCoordinates.js';
const tx = createMissionWorldCoordinateTransform({ grid: { width: 12, height: 12 } });
for (const preset of ["topDown", "oblique"]) {
  const camera = new THREE.PerspectiveCamera(46, 800 / 600, 0.1, 4000);
  if (preset === "topDown") camera.position.set(0, 20, 0.001);
  else camera.position.set(-10, 16, 12);
  camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  for (const cell of [{ x: 0, y: 0 }, { x: 6, y: 6 }, { x: 11, y: 11 }]) {
    const world = gridCellToWorld(tx, cell.x, cell.y, 0);
    const resolved = worldToGridCell(tx, world.x, world.y, world.z);
    assert.equal(resolved.x, cell.x); assert.equal(resolved.y, cell.y);
  }
}
const rect = { left: 240, top: 64, width: 720, height: 512 };
const ndc = canvasLocalToNdc(pointerClientToCanvasLocal({ clientX: 600, clientY: 320 }, rect), rect);
assert(Math.abs(ndc.x) < 0.001); assert(Math.abs(ndc.y) < 0.001);
console.log('Three pointer calibration smoke passed.');