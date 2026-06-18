import assert from 'node:assert/strict';
import { createMissionWorldFixture } from './mission_world_fixture.mjs';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel, missionWorldRenderViewModelSummary, validateMissionWorldRenderViewModel } from '../../src/core/rendering/MissionWorldRenderViewModel.js';

const fixture = createMissionWorldFixture();
const input = missionWorldRenderInputFromWorkspace({ app: { state: fixture.state } });
const viewModel = buildMissionWorldRenderViewModel(input);
const validation = validateMissionWorldRenderViewModel(viewModel);
const summary = missionWorldRenderViewModelSummary(viewModel);
const categories = {
  terrain: summary.terrainCellCount > 0,
  scalarField: summary.scalarFieldCellCount > 0,
  currentVectors: summary.currentVectorCount > 0,
  hazards: summary.hazardCount > 0,
  dropZones: summary.dropZoneCount >= 2,
  gliders: summary.gliderCount >= 2,
  waypoints: summary.waypointCount >= 2,
  routes: summary.routeCount >= 1,
  planningMarkers: summary.planningMarkerCount >= 1,
  priorityTargets: summary.priorityTargetCount >= 1
};
for (const [category, ok] of Object.entries(categories)) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${category}`);
  assert.equal(ok, true, `${category} should be present in mission render view model`);
}
assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.deepEqual(viewModel.waypoints.map((waypoint) => waypoint.waypointId), ['alpha-wp-1', 'alpha-wp-2', 'bravo-wp-1']);
assert.ok(viewModel.planningMarkers.every((marker) => marker.executable === false));
assert.deepEqual(viewModel.routes.map((route) => route.agentId), ['glider-alpha', 'glider-bravo']);
assert.equal(viewModel.selectedAgentId, 'glider-alpha');
assert.equal(viewModel.activeTimeSeconds, 60);
assert.equal(viewModel.boundaryFlags.includesHiddenTruth, false);
assert.equal(viewModel.boundaryFlags.ownsSimulationState, false);
assert.equal(viewModel.boundaryFlags.ownsPlanning, false);
assert.equal(viewModel.boundaryFlags.ownsScoring, false);
console.log('PASS mission visual parity audit', summary);
