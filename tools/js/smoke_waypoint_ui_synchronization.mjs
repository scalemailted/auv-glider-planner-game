import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { addWaypoint, getWaypointCount } from '../../src/core/planning/WaypointPlan.js';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel, missionWorldRenderViewModelSummary } from '../../src/core/rendering/MissionWorldRenderViewModel.js';
import { updateThreeWaypointLayer } from '../../src/game/three/layers/ThreeWaypointLayer.js';
import { createMissionWorldFixture, deepClone } from './mission_world_fixture.mjs';

const fixture = createMissionWorldFixture();
const state = deepClone(fixture.state);
state.plan = deepClone(fixture.plan);
const before = getWaypointCount(state.plan);
addWaypoint(state.plan, 'glider-alpha', { x: 5, y: 2, action: 'sample', t: 180 });
addWaypoint(state.plan, 'glider-alpha', { x: 5, y: 3, action: 'sample', t: 240 });
const canonicalCount = getWaypointCount(state.plan);
assert.equal(canonicalCount, before + 2, 'canonical plan should contain successive accepted waypoints');

const viewModel = buildMissionWorldRenderViewModel(missionWorldRenderInputFromWorkspace({ app: { state } }));
const summary = missionWorldRenderViewModelSummary(viewModel);
assert.equal(summary.waypointCount, canonicalCount, 'render view model should mirror canonical waypoint count');
const group = new THREE.Group();
updateThreeWaypointLayer(group, viewModel);
assert.equal(group.children.length, canonicalCount, 'Three waypoint layer should mirror canonical waypoint count');

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
for (const field of ['canonicalWaypointCount', 'threeWaypointCount', 'rightPanelWaypointCount', 'timelineWaypointCount', 'waypointCountMismatch']) {
  assert.ok(scene.includes(field), `debug state should expose ${field}`);
}
assert.ok(scene.includes('rightPanelWaypointCount: summary.waypointCount'), 'right panel debug count should derive from canonical summary');
assert.ok(scene.includes('timelineWaypointCount: summary.waypointCount'), 'timeline debug count should derive from canonical summary');

console.log('THREE-R1.1C waypoint UI synchronization smoke passed.');
