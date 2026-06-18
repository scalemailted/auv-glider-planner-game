import assert from 'node:assert/strict';

import {
  MISSION_WORLD_INTERACTION_INTENT_IDS,
  MISSION_WORLD_INTERACTION_MODE_IDS,
  createMissionWorldInteractionIntent,
  missionWorldInteractionIntentSummary,
  normalizeMissionWorldInteractionIntentId,
  normalizeMissionWorldInteractionMode,
  validateMissionWorldInteractionIntent
} from '../../src/core/rendering/MissionWorldInteractionIntent.js';

for (const mode of ['navigate', 'selectInspect', 'placeWaypoint', 'editWaypoint', 'placeMarker']) {
  assert.ok(MISSION_WORLD_INTERACTION_MODE_IDS.includes(mode), `missing interaction mode ${mode}`);
  assert.equal(normalizeMissionWorldInteractionMode(mode), mode);
}
for (const id of ['hoverCell', 'clearHover', 'selectAgent', 'selectWaypoint', 'selectPriorityTarget', 'placeWaypoint', 'previewWaypointMove', 'commitWaypointMove', 'cancelWaypointMove', 'deleteWaypoint', 'placePlanningMarker', 'deletePlanningMarker', 'requestRoutePreview', 'clearRoutePreview', 'cameraChanged', 'cancelInteraction']) {
  assert.ok(MISSION_WORLD_INTERACTION_INTENT_IDS.includes(id), `missing intent id ${id}`);
  assert.equal(normalizeMissionWorldInteractionIntentId(id), id);
}
assert.equal(normalizeMissionWorldInteractionMode('bogus'), 'selectInspect');
assert.equal(normalizeMissionWorldInteractionIntentId('bogus'), 'cancelInteraction');

const input = {
  intentId: 'placeWaypoint',
  interactionMode: 'placeWaypoint',
  pointerId: 7,
  gridCell: { col: 3, row: 4 },
  worldPoint: { x: 1.2, y: 0, z: 2.3 },
  metadata: { nested: { value: 1 } },
  sequence: 12
};
const snapshot = JSON.stringify(input);
const intent = createMissionWorldInteractionIntent(input);
assert.equal(JSON.stringify(input), snapshot, 'intent creation must not mutate input');
assert.notEqual(intent.metadata, input.metadata, 'metadata is cloned');
assert.equal(validateMissionWorldInteractionIntent(intent).valid, true);
assert.equal(intent.boundaryFlags.mutatesRendererStateOnly, false);
assert.equal(intent.boundaryFlags.requiresCanonicalCommand, true);
assert.equal(intent.boundaryFlags.ownsPlanning, false);
assert.equal(intent.boundaryFlags.ownsSimulation, false);
assert.equal(intent.boundaryFlags.ownsScoring, false);
assert.deepEqual(intent.gridCell, { x: 3, y: 4, col: 3, row: 4, blocked: false, reason: null });

const invalid = { ...intent, intentId: 'invalidIntent' };
assert.equal(validateMissionWorldInteractionIntent(invalid).valid, false);
const summary = missionWorldInteractionIntentSummary(intent);
assert.equal(summary.intentId, 'placeWaypoint');
assert.equal(summary.requiresCanonicalCommand, true);
assert.equal(summary.ownsPlanning, false);

console.log('Mission world interaction intent smoke passed');