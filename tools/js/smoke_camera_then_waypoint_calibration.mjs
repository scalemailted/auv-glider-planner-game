import assert from 'node:assert/strict';

import { resetThreeMissionCamera } from '../../src/game/three/ThreeMissionCameraController.js';
import { clickPointer, createThreeInteractionHarness, dispatchDomEvent, dragPointer } from './three_r1_1c_interaction_harness.mjs';

const harness = createThreeInteractionHarness({ interactionMode: 'placeWaypoint' });
const placements = [];
harness.controller.emitIntent = (intent) => {
  harness.emitted.push(intent);
  if (intent.intentId === 'placeWaypoint') placements.push({ x: intent.gridCell?.x, y: intent.gridCell?.y });
  return { status: 'accepted', changedCanonicalState: intent.intentId === 'placeWaypoint' };
};

function placeExpectedCell(label, cell) {
  const point = harness.pointForGridCell(cell.x, cell.y);
  clickPointer(harness.domElement, point);
  const actual = placements.at(-1);
  assert.deepEqual(actual, cell, `${label}: pointer projection should still hit expected cell`);
}

placeExpectedCell('baseline', { x: 5, y: 2 });
const panStart = harness.pointForGridCell(4, 2);
dragPointer(harness.domElement, panStart, { x: panStart.x + 42, y: panStart.y + 18 }, { button: 0, steps: 4 });
placeExpectedCell('after pan', { x: 5, y: 3 });

const orbitStart = harness.pointForGridCell(4, 3);
dragPointer(harness.domElement, orbitStart, { x: orbitStart.x + 46, y: orbitStart.y }, { button: 2, steps: 4 });
placeExpectedCell('after horizontal orbit', { x: 6, y: 3 });

dispatchDomEvent(harness.domElement, 'wheel', { deltaY: -180, clientX: orbitStart.x, clientY: orbitStart.y, button: 0 });
placeExpectedCell('after zoom', { x: 4, y: 4 });

const diagonalStart = harness.pointForGridCell(3, 3);
dragPointer(harness.domElement, diagonalStart, { x: diagonalStart.x + 38, y: diagonalStart.y + 32 }, { button: 2, steps: 4 });
placeExpectedCell('after diagonal orbit', { x: 5, y: 4 });

resetThreeMissionCamera(harness.cameraController);
placeExpectedCell('after reset', { x: 3, y: 2 });

assert.equal(harness.emitted.filter((intent) => intent.intentId === 'placeWaypoint').length, 6, 'camera moves should not create extra waypoint intents');
assert.ok(harness.cameraController.panChangeCount > 0, 'calibration smoke should include a pan');
assert.ok(harness.cameraController.orbitChangeCount > 0, 'calibration smoke should include orbit');
assert.ok(harness.cameraController.zoomChangeCount > 0, 'calibration smoke should include zoom');

console.log('THREE-R1.1C camera-then-waypoint calibration smoke passed.');
