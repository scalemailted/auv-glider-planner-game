import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createMissionPlanningToolState, interactionModeForTool, setMissionPlanningTool } from '../../src/core/rendering/MissionPlanningToolState.js';

const waypointTool = setMissionPlanningTool(createMissionPlanningToolState(), 'placeWaypoint', { selectedAgentId: 'glider-alpha' });
assert.equal(waypointTool.activeToolId, 'placeWaypoint');
assert.equal(interactionModeForTool(waypointTool.activeToolId), 'placeWaypoint');
assert.equal(waypointTool.persistent, true);

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const waypointHandler = scene.match(/placeWaypointFromThree\(intent\) \{[\s\S]*?previewWaypointMoveFromThree\(intent\)/)?.[0] ?? '';
assert.ok(waypointHandler.includes('Deploy this glider before adding waypoints.'), 'Waypoint mode should warn when deployment is missing.');
assert.ok(waypointHandler.includes('Use Deploy / Change Start'), 'Waypoint mode should direct the player to the deploy tool.');
assert.doesNotMatch(waypointHandler, /trySelectDeploymentStart\(cell\)/, 'Waypoint placement should not silently deploy the glider.');
assert.ok(waypointHandler.includes('addWaypointForSelected'), 'Waypoint placement should still use canonical scene command.');
assert.ok(scene.includes('waypointPlacementActive'), 'Debug state should expose active waypoint placement.');
assert.ok(scene.includes('waypointCandidateCell'), 'Debug state should expose waypoint candidate cell.');

console.log('Three waypoint player flow smoke passed.');