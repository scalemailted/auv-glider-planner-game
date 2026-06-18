import assert from 'node:assert/strict';

import { createMissionWorldInteractionIntent } from '../../src/core/rendering/MissionWorldInteractionIntent.js';
import { createMissionWorldInteractionResult } from '../../src/core/rendering/MissionWorldInteractionResult.js';
import { addMarker, removeMarker } from '../../src/core/planning/WaypointPlan.js';
import { createMissionWorkspaceThreeInteractionBridge, handleMissionWorldInteractionIntent } from '../../src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js';

const state = { selectedAgentId: 'glider-alpha', ui: {}, plan: { agentPlans: [{ agentId: 'glider-alpha', waypoints: [{ id: 'wp-1', x: 1, y: 1 }] }], planningMarkers: [] } };
const scene = {
  app: { state },
  placePlanningMarkerFromThree(intent) {
    const marker = addMarker(state.plan, state.selectedAgentId, { x: intent.gridCell.x, y: intent.gridCell.y, t: 60, executable: false });
    state.ui.selectedMarker = { index: state.plan.planningMarkers.length - 1, markerId: marker.id };
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', changedCanonicalState: true, selectedMarkerId: marker.id, committedGridCell: intent.gridCell });
  },
  deletePlanningMarkerFromThree(intent) {
    if (intent.metadata?.selectOnly) {
      state.ui.selectedMarker = { index: 0, markerId: intent.markerId };
      return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', selectedMarkerId: intent.markerId });
    }
    const index = state.plan.planningMarkers.findIndex((marker) => marker.id === intent.markerId);
    if (index >= 0) removeMarker(state.plan, state.selectedAgentId, index);
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: index >= 0 ? 'accepted' : 'rejected', changedCanonicalState: index >= 0, selectedMarkerId: intent.markerId });
  }
};
const initialWaypointCount = state.plan.agentPlans[0].waypoints.length;
const bridge = createMissionWorkspaceThreeInteractionBridge(scene);
let result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'placePlanningMarker', interactionMode: 'placeMarker', gridCell: { x: 3, y: 4 } }));
assert.equal(result.status, 'accepted');
assert.equal(state.plan.planningMarkers.length, 1);
assert.equal(state.plan.planningMarkers[0].executable, false, 'planning marker remains non-executable');
assert.equal(state.plan.agentPlans[0].waypoints.length, initialWaypointCount, 'marker placement does not mutate route waypoints');
const markerId = result.selectedMarkerId;
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'deletePlanningMarker', interactionMode: 'selectInspect', markerId, metadata: { selectOnly: true } }));
assert.equal(result.status, 'accepted');
assert.equal(state.ui.selectedMarker.markerId, markerId);
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'deletePlanningMarker', markerId }));
assert.equal(result.status, 'accepted');
assert.equal(state.plan.planningMarkers.length, 0);
assert.equal(state.plan.agentPlans[0].waypoints.length, initialWaypointCount);

console.log('Three planning marker interaction smoke passed');