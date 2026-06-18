import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const rightPanel = readFileSync('src/ui/RightWaypointPanel.js', 'utf8');

for (const label of ['Planning Tools', 'Deploy / Change Start', 'Add Waypoint', 'Add Marker']) {
  assert.ok(overlay.includes(label), `Mission console should render ${label}.`);
}
for (const tool of ['navigate', 'selectInspect', 'selectDeploymentCell', 'placeWaypoint', 'placePlanningMarker']) {
  assert.ok(overlay.includes(`planningToolButton('${tool}'`) || overlay.includes(`data-tool="${tool}"`), `Mission console should expose ${tool} button.`);
}
assert.ok(overlay.includes("'mission-planning-tool'"), 'Mission console action map should dispatch planning tool controls.');
assert.ok(scene.includes('setMissionPlanningTool: (toolId)'), 'Scene should wire planning tool handler into the HTML overlay.');
assert.ok(scene.includes('activatePlanningTool(toolId'), 'Scene should own planning tool activation through shared state.');
assert.ok(rightPanel.includes('Deploy Glider'), 'Right panel should show Deploy Glider when start is missing.');
assert.ok(rightPanel.includes('Change Start'), 'Right panel should show Change Start after deployment exists.');

for (const preset of ['tacticalTopDown', 'obliqueMission', 'waterColumnProfile', 'fleetOverview', 'focusSelectedGlider', 'focusRoute', 'resetCamera']) {
  assert.ok(overlay.includes(`data-preset="${preset}"`) || overlay.includes(`'${preset}'`), `Camera control ${preset} should be available.`);
}

console.log('Three planning tool controls smoke passed.');