import assert from 'node:assert/strict';

import {
  MISSION_PLANNING_TOOL_STATE_VERSION,
  cancelMissionPlanningTool,
  createMissionPlanningToolState,
  cursorForTool,
  interactionModeForTool,
  missionPlanningToolStateSummary,
  setMissionPlanningTool,
  toolIdForInteractionMode,
  validateMissionPlanningToolState
} from '../../src/core/rendering/MissionPlanningToolState.js';

const initial = createMissionPlanningToolState({ selectedAgentId: 'glider-alpha' });
assert.equal(initial.version, MISSION_PLANNING_TOOL_STATE_VERSION);
assert.equal(initial.activeToolId, 'selectInspect');
assert.equal(interactionModeForTool('selectDeploymentCell'), 'selectDeployment');
assert.equal(toolIdForInteractionMode('placeMarker'), 'placePlanningMarker');

const deployment = setMissionPlanningTool(initial, 'selectDeploymentCell', { selectedAgentId: 'glider-alpha', deploymentDropZoneId: 'zone-a' });
assert.equal(deployment.activeToolId, 'selectDeploymentCell');
assert.equal(deployment.oneShot, true);
assert.equal(deployment.deploymentAgentId, 'glider-alpha');
assert.equal(deployment.deploymentDropZoneId, 'zone-a');
assert.equal(cursorForTool(deployment.activeToolId), 'crosshair');

const waypoint = setMissionPlanningTool(deployment, 'placeWaypoint', { validationReason: 'Valid waypoint cell.', canPlace: true });
assert.equal(waypoint.activeToolId, 'placeWaypoint');
assert.equal(waypoint.persistent, true);
assert.equal(waypoint.validationReason, 'Valid waypoint cell.');
assert.equal(waypoint.canPlace, true);

const cancelled = cancelMissionPlanningTool(waypoint);
assert.equal(cancelled.activeToolId, 'selectInspect');
const validation = validateMissionPlanningToolState(cancelled);
assert.equal(validation.valid, true);
const summary = missionPlanningToolStateSummary(cancelled);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.ownsScoring, false);
assert.equal(summary.interactionMode, 'selectInspect');

console.log('Mission planning tool state smoke passed.');