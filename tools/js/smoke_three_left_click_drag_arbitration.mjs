import assert from 'node:assert/strict';

import { threeMissionInteractionControllerSummary } from '../../src/game/three/ThreeMissionInteractionController.js';
import { clickPointer, createThreeInteractionHarness, dragPointer } from './three_r1_1c_interaction_harness.mjs';

const harness = createThreeInteractionHarness({ interactionMode: 'placeWaypoint' });
const firstPoint = harness.pointForGridCell(5, 2);
clickPointer(harness.domElement, firstPoint, { jitter: { x: 2, y: 1 } });
assert.equal(harness.emitted.filter((intent) => intent.intentId === 'placeWaypoint').length, 1, 'left click below threshold should emit one waypoint intent');
let summary = threeMissionInteractionControllerSummary(harness.controller);
assert.equal(summary.pointerGestureClassification, 'missionClick', 'below-threshold left input should be classified as mission click');
assert.equal(summary.missionClickSuppressedReason, null, 'mission click should not be suppressed');

const beforePan = harness.cameraController.panChangeCount;
const beforeWaypointIntents = harness.emitted.filter((intent) => intent.intentId === 'placeWaypoint').length;
const dragStart = harness.pointForGridCell(4, 2);
dragPointer(harness.domElement, dragStart, { x: dragStart.x + 34, y: dragStart.y + 10 }, { button: 0, steps: 4 });
summary = threeMissionInteractionControllerSummary(harness.controller);
assert.equal(summary.pointerGestureClassification, 'pan', 'left drag above threshold should be classified as pan');
assert.equal(summary.missionClickSuppressedReason, 'panGesture', 'pan should suppress mission click');
assert.ok(harness.cameraController.panChangeCount > beforePan, 'left drag should move the camera target');
assert.equal(harness.emitted.filter((intent) => intent.intentId === 'placeWaypoint').length, beforeWaypointIntents, 'pan must not emit waypoint intent');
assert.equal(harness.emitted.filter((intent) => intent.intentId === 'cameraChanged').length, 1, 'pan should emit one camera changed intent');

const secondPoint = harness.pointForGridCell(5, 3);
clickPointer(harness.domElement, secondPoint);
assert.equal(harness.emitted.filter((intent) => intent.intentId === 'placeWaypoint').length, 2, 'Add Waypoint mode should still accept a later left click');
assert.equal(new Set(harness.emitted.map((intent) => intent.sequence)).size, harness.emitted.length, 'intent dispatch sequence should not duplicate');

console.log('THREE-R1.1C left click/drag arbitration smoke passed.');
