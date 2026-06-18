import assert from 'node:assert/strict';

import { createMissionWorldInteractionIntent } from '../../src/core/rendering/MissionWorldInteractionIntent.js';
import { createMissionWorldInteractionResult } from '../../src/core/rendering/MissionWorldInteractionResult.js';
import { addWaypoint, getAgentPlan, removeWaypoint, updateWaypoint } from '../../src/core/planning/WaypointPlan.js';
import { createMissionWorkspaceThreeInteractionBridge, handleMissionWorldInteractionIntent } from '../../src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js';

const state = { selectedAgentId: 'glider-alpha', ui: {}, plan: { agentPlans: [{ agentId: 'glider-alpha', waypoints: [] }], planningMarkers: [] } };
const scene = {
  app: { state },
  placeWaypointFromThree(intent) {
    if (intent.gridCell?.x === 0) return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'rejected', warnings: ['blocked'], userMessage: 'blocked' });
    const waypoint = addWaypoint(state.plan, state.selectedAgentId, { x: intent.gridCell.x, y: intent.gridCell.y, t: 60, action: 'sample' });
    state.ui.selectedWaypoint = { agentId: state.selectedAgentId, index: getAgentPlan(state.plan, state.selectedAgentId).waypoints.length - 1 };
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', changedCanonicalState: true, selectedWaypointId: waypoint.id, committedGridCell: intent.gridCell });
  },
  selectWaypointById(waypointId, intent) {
    const index = getAgentPlan(state.plan, state.selectedAgentId).waypoints.findIndex((waypoint) => waypoint.id === waypointId);
    state.ui.selectedWaypoint = { agentId: state.selectedAgentId, index };
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: index >= 0 ? 'accepted' : 'rejected', selectedWaypointId: waypointId });
  },
  previewWaypointMoveFromThree(intent) {
    state.ui.threeMissionInteraction ??= {};
    state.ui.threeMissionInteraction.dragPreview = { active: true, waypointId: intent.waypointId, gridCell: intent.gridCell };
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'preview', preview: state.ui.threeMissionInteraction.dragPreview });
  },
  commitWaypointMoveFromThree(intent) {
    const agentPlan = getAgentPlan(state.plan, state.selectedAgentId);
    const index = agentPlan.waypoints.findIndex((waypoint) => waypoint.id === intent.waypointId);
    if (intent.gridCell?.x === 0) return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'rejected', warnings: ['blocked'], userMessage: 'blocked' });
    const waypoint = updateWaypoint(state.plan, state.selectedAgentId, index, { x: intent.gridCell.x, y: intent.gridCell.y });
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'accepted', changedCanonicalState: true, selectedWaypointId: waypoint.id, committedGridCell: intent.gridCell });
  },
  cancelWaypointMoveFromThree(intent) {
    state.ui.threeMissionInteraction.dragPreview = null;
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: 'cancelled' });
  },
  deleteWaypointById(waypointId, intent) {
    const agentPlan = getAgentPlan(state.plan, state.selectedAgentId);
    const index = agentPlan.waypoints.findIndex((waypoint) => waypoint.id === waypointId);
    if (index >= 0) removeWaypoint(state.plan, state.selectedAgentId, index);
    return createMissionWorldInteractionResult({ intentId: intent.intentId, status: index >= 0 ? 'accepted' : 'rejected', changedCanonicalState: index >= 0, selectedWaypointId: waypointId });
  }
};
const bridge = createMissionWorkspaceThreeInteractionBridge(scene);
let result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'placeWaypoint', interactionMode: 'placeWaypoint', gridCell: { x: 2, y: 2 } }));
assert.equal(result.status, 'accepted');
assert.equal(getAgentPlan(state.plan, 'glider-alpha').waypoints.length, 1);
const waypointId = result.selectedWaypointId;
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'selectWaypoint', waypointId }));
assert.equal(result.status, 'accepted');
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'previewWaypointMove', waypointId, gridCell: { x: 3, y: 2 } }));
assert.equal(result.status, 'preview');
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'cancelWaypointMove', waypointId }));
assert.equal(result.status, 'cancelled');
assert.deepEqual({ x: getAgentPlan(state.plan, 'glider-alpha').waypoints[0].x, y: getAgentPlan(state.plan, 'glider-alpha').waypoints[0].y }, { x: 2, y: 2 });
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'commitWaypointMove', waypointId, gridCell: { x: 4, y: 3 } }));
assert.equal(result.status, 'accepted');
assert.equal(getAgentPlan(state.plan, 'glider-alpha').waypoints[0].id, waypointId, 'move preserves waypoint id');
assert.deepEqual({ x: getAgentPlan(state.plan, 'glider-alpha').waypoints[0].x, y: getAgentPlan(state.plan, 'glider-alpha').waypoints[0].y }, { x: 4, y: 3 });
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'commitWaypointMove', waypointId, gridCell: { x: 0, y: 0 } }));
assert.equal(result.status, 'rejected');
assert.equal(getAgentPlan(state.plan, 'glider-alpha').waypoints.length, 1);
result = handleMissionWorldInteractionIntent(bridge, createMissionWorldInteractionIntent({ intentId: 'deleteWaypoint', waypointId }));
assert.equal(result.status, 'accepted');
assert.equal(getAgentPlan(state.plan, 'glider-alpha').waypoints.length, 0);

console.log('Three waypoint interaction smoke passed');