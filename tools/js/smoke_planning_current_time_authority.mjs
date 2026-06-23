import assert from 'node:assert/strict';
import { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';

const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-runtime-r1-1-time-authority-smoke', waypointCount: 3, agentCount: 3 });
fixture.state.mode = 'planning';
fixture.state.planningTime = 12;
const { viewModel } = buildNormalGeneratedCurrentViewModel({ fixture });
assert.equal(viewModel.activeTimeSeconds, 12, 'base Planning view model keeps mission timeline units for heatmaps and labels');
assert.equal(viewModel.missionTimelineTimeSeconds, 43200, 'mission timeline seconds are exposed');
assert.equal(viewModel.currentPresentationTimeSeconds, 43200, 'current presentation consumes mission timeline seconds');
assert.equal(viewModel.waterColumnExplorer?.activeTimeSeconds, 43200, 'water-column current explorer samples at mission seconds');
console.log('[smoke_planning_current_time_authority] PASS', viewModel.planningTimelineTimeBridge);
