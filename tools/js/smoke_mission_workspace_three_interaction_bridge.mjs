import assert from 'node:assert/strict';

import { createMissionWorldInteractionIntent } from '../../src/core/rendering/MissionWorldInteractionIntent.js';
import { createMissionWorldInteractionResult } from '../../src/core/rendering/MissionWorldInteractionResult.js';
import {
  createMissionWorkspaceThreeInteractionBridge,
  handleMissionWorldInteractionIntent,
  missionWorkspaceThreeInteractionBridgeSummary,
  disposeMissionWorkspaceThreeInteractionBridge
} from '../../src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js';

const calls = [];
const scene = {
  app: { state: { ui: {}, selectedAgentId: 'glider-alpha' } },
  placeWaypointFromThree(intent) {
    calls.push(['placeWaypointFromThree', intent.gridCell]);
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', changedCanonicalState: true, committedGridCell: intent.gridCell, selectedAgentId: 'glider-alpha' });
  },
  deletePlanningMarkerFromThree(intent) {
    calls.push(['deletePlanningMarkerFromThree', intent.markerId, intent.metadata?.selectOnly === true]);
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: intent.metadata?.selectOnly ? 'accepted' : 'rejected', selectedMarkerId: intent.markerId, userMessage: 'marker route' });
  }
};

const bridge = createMissionWorkspaceThreeInteractionBridge(scene);
const placeIntent = createMissionWorldInteractionIntent({ intentId: 'placeWaypoint', interactionMode: 'placeWaypoint', gridCell: { x: 2, y: 3 }, sequence: 1 });
const placeResult = handleMissionWorldInteractionIntent(bridge, placeIntent);
assert.equal(placeResult.status, 'accepted');
assert.equal(placeResult.changedCanonicalState, true);
assert.deepEqual(calls[0], ['placeWaypointFromThree', { x: 2, y: 3, col: 2, row: 3, blocked: false, reason: null }]);

const markerIntent = createMissionWorldInteractionIntent({ intentId: 'deletePlanningMarker', interactionMode: 'selectInspect', markerId: 'marker-1', metadata: { selectOnly: true }, sequence: 2 });
const markerResult = handleMissionWorldInteractionIntent(bridge, markerIntent);
assert.equal(markerResult.status, 'accepted');
assert.equal(scene.app.state.ui.threeMissionInteraction.lastInteractionIntents.length, 2);

const summary = missionWorkspaceThreeInteractionBridgeSummary(bridge);
assert.equal(summary.handledCount, 2);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.usesRouteOptimizer, false);
disposeMissionWorkspaceThreeInteractionBridge(bridge);
assert.equal(bridge.disposed, true);

console.log('Mission workspace Three interaction bridge smoke passed');
