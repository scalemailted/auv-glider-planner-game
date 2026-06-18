import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridge = readFileSync('src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');

for (const route of ['selectGliderFromThree', 'selectWaypointById', 'selectPriorityTargetFromThree', 'placeWaypointFromThree']) {
  assert.ok(bridge.includes(route), `bridge must route ${route}.`);
  assert.ok(scene.includes(route), `MissionWorkspaceScene must implement ${route}.`);
}
for (const surface of ['refreshPanels()', 'this.hud?.refresh', 'app.waypointPanel?.refresh', 'app.summaryHud?.refresh', 'app.agentPerformanceHud?.refresh']) {
  assert.ok(scene.includes(surface), `accepted Three planning interactions must refresh ${surface}.`);
}
for (const debugField of ['canonicalWaypointCount', 'threeWaypointCount', 'rightPanelWaypointCount', 'timelineWaypointCount']) {
  assert.ok(scene.includes(debugField), `planning debug must expose ${debugField}.`);
}

console.log('Three planning selection sync smoke passed.');