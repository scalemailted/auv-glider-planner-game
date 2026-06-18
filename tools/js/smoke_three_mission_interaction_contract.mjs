import assert from 'node:assert/strict';

import {
  createMissionWorldInteractionIntent,
  validateMissionWorldInteractionIntent,
  MISSION_WORLD_INTERACTION_INTENT_IDS
} from '../../src/core/rendering/MissionWorldInteractionIntent.js';
import {
  createMissionWorldInteractionResult,
  validateMissionWorldInteractionResult
} from '../../src/core/rendering/MissionWorldInteractionResult.js';
import {
  buildMissionPlanningInteractionViewModel,
  missionPlanningInteractionViewModelSummary
} from '../../src/core/rendering/MissionPlanningInteractionViewModel.js';
import {
  createThreeMissionInteractionController,
  threeMissionInteractionControllerSummary,
  disposeThreeMissionInteractionController
} from '../../src/game/three/ThreeMissionInteractionController.js';

for (const id of ['placeWaypoint', 'commitWaypointMove', 'deleteWaypoint', 'placePlanningMarker', 'deletePlanningMarker', 'selectPriorityTarget']) {
  assert.ok(MISSION_WORLD_INTERACTION_INTENT_IDS.includes(id), `${id} must be a supported Three planning intent`);
}

const intent = createMissionWorldInteractionIntent({ intentId: 'placeWaypoint', interactionMode: 'placeWaypoint', gridCell: { x: 3, y: 2 }, sequence: 1 });
assert.equal(validateMissionWorldInteractionIntent(intent).valid, true);
assert.equal(intent.boundaryFlags.requiresCanonicalCommand, true);
assert.equal(intent.boundaryFlags.ownsPlanning, false);

const rejected = createMissionWorldInteractionResult({ intentId: 'placeWaypoint', status: 'rejected', changedCanonicalState: false, userMessage: 'Blocked terrain.' });
assert.equal(validateMissionWorldInteractionResult(rejected).valid, true);
assert.equal(rejected.changedCanonicalState, false);
assert.equal(rejected.boundaryFlags.usesNewPlanner, false);

const interactionVm = buildMissionPlanningInteractionViewModel({
  missionWorldViewModel: { selectedCell: { x: 1, y: 1 }, waypoints: [], gliders: [] },
  interactionState: { interactionMode: 'placeWaypoint', hoveredCell: { x: 2, y: 3 }, placementValidation: { valid: true, message: 'Valid placement cell.' } }
});
const summary = missionPlanningInteractionViewModelSummary(interactionVm);
assert.equal(summary.interactionMode, 'placeWaypoint');
assert.deepEqual(summary.hoveredCell, { x: 2, y: 3, col: 2, row: 3, blocked: false, reason: null });
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.ownsSimulation, false);
assert.equal(summary.ownsScoring, false);

const fakeDom = {
  ownerDocument: { addEventListener() {}, removeEventListener() {} },
  addEventListener() {},
  removeEventListener() {},
  setPointerCapture() {},
  releasePointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 })
};
const controller = createThreeMissionInteractionController({ domElement: fakeDom, emitIntent: () => null, getViewModel: () => ({ missionId: 'test', activeTimeSeconds: 0 }) });
const controllerSummary = threeMissionInteractionControllerSummary(controller);
assert.equal(controllerSummary.ownsPlanning, false);
assert.equal(controllerSummary.ownsSimulationState, false);
assert.equal(controllerSummary.usesRouteOptimizer, false);
disposeThreeMissionInteractionController(controller);
assert.equal(controller.disposed, true);

console.log('Three mission interaction contract smoke passed');
