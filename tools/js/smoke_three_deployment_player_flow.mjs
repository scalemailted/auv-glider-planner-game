import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { setSelectedStart } from '../../src/core/deployment/DeploymentZones.js';
import { createMissionPlanningToolState, interactionModeForTool, setMissionPlanningTool } from '../../src/core/rendering/MissionPlanningToolState.js';

const level = {
  levelId: 'three-r11b-deploy-flow',
  world: { grid: { width: 6, height: 5 }, time: { dt: 1, duration: 12 } },
  zones: [{ id: 'drop-alpha', type: 'deployment', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }] }],
  layers: { terrain: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0)) }
};
const mission = { missionId: 'three-r11b-mission', agents: [{ id: 'glider-alpha', deployment: { mode: 'chooseFromZone', zoneId: 'drop-alpha', selectedStart: null }, battery: 100 }] };
const plan = { agentPlans: [{ agentId: 'glider-alpha', selectedStart: null, waypoints: [{ id: 'wp-before', x: 3, y: 2 }] }], planningMarkers: [] };
const beforeWaypoints = plan.agentPlans[0].waypoints.length;
const armed = setMissionPlanningTool(createMissionPlanningToolState(), 'selectDeploymentCell', { selectedAgentId: 'glider-alpha' });
assert.equal(interactionModeForTool(armed.activeToolId), 'selectDeployment');
const accepted = setSelectedStart(level, mission, plan, 'glider-alpha', { x: 2, y: 1 });
assert.equal(accepted.valid, true);
assert.equal(plan.agentPlans[0].waypoints.length, beforeWaypoints, 'deployment must not add route waypoints');
assert.equal(plan.agentPlans[0].selectedStart.x, 2);
assert.equal(plan.agentPlans[0].selectedStart.y, 1);

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.ok(scene.includes("activatePlanningTool('selectDeploymentCell'"), 'Right-panel deploy/change should activate the deployment tool.');
assert.ok(scene.includes('completeOneShotPlanningTool()'), 'Successful deployment should return to select/edit through shared tool state.');
assert.doesNotMatch(scene, /clearThreeHoverIntent[\s\S]*deploymentSelectionActive = false[\s\S]*threeMissionInteractionMode = this\.app\.state\.ui\.threeMissionInteraction\.previousInteractionMode/, 'hover clear must not cancel deployment selection.');

console.log('Three deployment player flow smoke passed.');