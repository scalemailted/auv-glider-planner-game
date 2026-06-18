import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createMissionWorldFixture, deepClone } from './mission_world_fixture.mjs';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel, missionWorldRenderViewModelSummary } from '../../src/core/rendering/MissionWorldRenderViewModel.js';

const fixture = createMissionWorldFixture();
const originalState = deepClone(fixture.state);
const before = buildMissionWorldRenderViewModel(missionWorldRenderInputFromWorkspace({ app: { state: fixture.state } }));
fixture.state.ui.rendererBackend = 'threeMission3d';
fixture.state.ui.threeMissionInteraction = { dragPreview: { active: true, waypointId: 'alpha-wp-2', gridCell: { x: 5, y: 3 } } };
const during = buildMissionWorldRenderViewModel(missionWorldRenderInputFromWorkspace({ app: { state: fixture.state } }));
fixture.state.ui.rendererBackend = 'legacyPhaser2d';
fixture.state.ui.threeMissionInteraction.dragPreview = null;
const after = buildMissionWorldRenderViewModel(missionWorldRenderInputFromWorkspace({ app: { state: fixture.state } }));

for (const key of ['waypointCount', 'planningMarkerCount', 'activeTimeSeconds']) {
  assert.equal(missionWorldRenderViewModelSummary(after)[key], missionWorldRenderViewModelSummary(before)[key], `${key} preserved across backend switch simulation`);
}
assert.equal(after.selectedAgentId, before.selectedAgentId);
assert.equal(after.selectedWaypointId, before.selectedWaypointId);
assert.deepEqual(fixture.state.plan, originalState.plan, 'render backend switching must not mutate canonical plan');
assert.equal(fixture.state.ui.threeMissionInteraction.dragPreview, null, 'active drag preview can be cleared without touching plan');
assert.equal(missionWorldRenderViewModelSummary(during).waypointCount, missionWorldRenderViewModelSummary(before).waypointCount, 'transient interaction preview is not authoritative plan state');

const source = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.match(source, /disableThreeInteractionSilently/);
assert.match(source, /cancelThreeInteraction/);
assert.equal(/setRendererBackend[\s\S]{0,900}plan\s*=\s*/.test(source), false, 'backend switch path must not replace the plan');

console.log('Mission workspace Three interaction state preservation smoke passed');