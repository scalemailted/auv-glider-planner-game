import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  cancelMissionPlanningTool,
  createMissionPlanningToolState,
  interactionModeForTool,
  setMissionPlanningTool
} from '../../src/core/rendering/MissionPlanningToolState.js';

let state = createMissionPlanningToolState({ activeToolId: 'selectInspect', selectedAgentId: 'glider-alpha' });
state = setMissionPlanningTool(state, 'placeWaypoint', { selectedAgentId: 'glider-alpha' });
assert.equal(state.activeToolId, 'placeWaypoint', 'visible Add Waypoint should resolve to placeWaypoint state');
assert.equal(interactionModeForTool(state.activeToolId), 'placeWaypoint', 'placeWaypoint tool should map to Three placeWaypoint mode');
assert.equal(state.persistent, true, 'waypoint tool should survive successive clicks');
state = cancelMissionPlanningTool(state, { reason: 'user' });
assert.equal(state.activeToolId, 'selectInspect', 'explicit cancel should leave waypoint mode');

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');

for (const token of [
  'setPlanningTool(toolId, context = {})',
  'cancelPlanningTool(reason = \'user\')',
  'syncPlanningToolToThreeController()',
  'planningToolStateSummary()',
  'planningToolStateMismatches()',
  'this.activePlanningToolId',
  'setThreeMissionInteractionMode(this.threeInteractionController, mode)'
]) {
  assert.ok(scene.includes(token), `scene should expose ${token}`);
}
assert.ok(overlay.includes('data-action="mission-planning-tool"'), 'Add Waypoint should use stable delegated mission-planning-tool action');
assert.ok(overlay.includes('disabled: !waypointAvailability.enabled'), 'Add Waypoint should be disabled when canonical availability rejects it');
assert.ok(scene.includes('planningToolControlBindCount'), 'scene should track planning tool binding count');
assert.ok(scene.includes('planningToolControlDispatchCount'), 'scene should track planning tool dispatch count');
assert.ok(scene.includes('duplicateToolControlDispatchCount'), 'scene should track duplicate planning tool dispatches');
assert.ok(scene.includes("this.activatePlanningTool('placeWaypoint'"), 'deployment transition should auto-arm Add Waypoint when route is empty');
assert.ok(scene.includes('Click the mission plane to add its first waypoint.'), 'auto-arm message should tell the player what to do next');
assert.ok(scene.includes('Start changed. Existing route has been revalidated.'), 'start-change message should cover existing routes');
assert.ok(scene.includes('waypointToolAvailability(agentId'), 'scene should expose explicit waypoint tool availability');
assert.doesNotMatch(scene, /refreshThreeMissionRenderer\([\s\S]{0,700}setMissionPlanningTool\([^\n]*selectInspect/, 'renderer refresh should not reset the active tool to selectInspect');
assert.doesNotMatch(scene, /renderConsole\([\s\S]{0,700}setMissionPlanningTool\([^\n]*selectInspect/, 'console render should not reset the active tool to selectInspect');

console.log('THREE-R1.1C waypoint tool activation pipeline smoke passed.');
