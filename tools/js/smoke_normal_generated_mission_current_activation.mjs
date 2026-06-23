import assert from 'node:assert/strict';
import { validateOceanCurrentField4D } from '../../src/core/science/OceanCurrentField4D.js';
import { getSyntheticCurrentCubeFromMissionWorld } from '../../src/core/science/SyntheticCurrentCubeAdapter.js';
import { buildNormalGeneratedCurrentViewModel, summarizeIdleAgents } from './flow_r2a4_production_helpers.mjs';

const fixture = buildNormalGeneratedCurrentViewModel({ seed: 'flow-r2a4-normal-current-activation' });
const field = getSyntheticCurrentCubeFromMissionWorld({ level: fixture.level, waterColumnConfig: fixture.level.world.waterColumnConfig ?? fixture.mission.waterColumnConfig });
const validation = validateOceanCurrentField4D(field);

assert.equal(validation.valid, true, validation.errors?.join('; ') ?? 'current field validates');
assert.equal(fixture.viewModel.currentVisualizationAvailable, true, 'normal generated challenge exposes current visualization');
assert.equal(fixture.viewModel.currentPresentationRequested, true, 'normal generated challenge requests current vectors by default');
assert.equal(fixture.viewModel.currentVectorSampleCount > 0, true, 'normal generated challenge has source current samples');
assert.equal(fixture.viewModel.currentVectorValidCount > 0, true, 'normal generated challenge has finite current samples');
assert.equal(fixture.currentDebug.depthDependent, true, 'normal generated challenge uses depth-dependent currents');
assert.equal(fixture.currentDebug.timeDependent, true, 'normal generated challenge uses time-dependent currents');
assert.equal(fixture.presentationDebug.currentPresentationEnabled, true, 'presentation debug enables visible currents');
assert.equal(fixture.presentationDebug.runtimeShell, 'default');
assert.equal(fixture.presentationDebug.noVisibleVectorsReason, null);
assert.deepEqual(summarizeIdleAgents(fixture.plan, fixture.activeAgentId).map((agent) => agent.waypointCount), [0, 0], 'optional gliders are intentionally idle');

console.log('smoke_normal_generated_mission_current_activation: ok', {
  activeAgentId: fixture.activeAgentId,
  currentSamples: fixture.viewModel.currentVectorSampleCount,
  activeLayer: fixture.viewModel.currentActiveLayerId
});
