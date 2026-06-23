import assert from 'node:assert/strict';
import { buildSimulationWorldRenderViewModel, simulationWorldRenderViewModelSummary } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';
import { augmentMissionWorldWithVolumetricModel, volumetricCurrentDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';
import { makeFlowR2A1Level, makeFlowR2A1Mission, makeFlowR2A1Plan } from './flow_r2a1_test_helpers.mjs';

const level = makeFlowR2A1Level();
const mission = makeFlowR2A1Mission();
const plan = makeFlowR2A1Plan();
const displaySettings = {
  rendererBackend: 'threeMission3d',
  showCurrents: true,
  waterColumn: {
    activeDepthLayerId: 'thermocline',
    currentDisplayMode: 'activeSlice',
    currentLayerMode: 'followSelectedGlider',
    currentVectorDensity: 'balanced',
    currentMagnitudeScale: 1.8,
    showContextCurrents: false
  }
};
const flat = buildSimulationWorldRenderViewModel({
  level,
  mission,
  plan,
  activeTimeSeconds: 600,
  selectedAgentId: 'glider-1',
  displaySettings,

  simulationStatus: { status: 'paused', timeSeconds: 600 },
  options: { phase: 'simulation', gliders: [{ ...mission.agents[0], agentId: 'glider-1', id: 'glider-1', x: 2, y: 2, depthMeters: 35, selected: true }], routes: plan.agentPlans }
});
const viewModel = augmentMissionWorldWithVolumetricModel(flat, {
  level,
  mission,
  plan,
  displaySettings,
  waterColumn: displaySettings.waterColumn
});
const summary = simulationWorldRenderViewModelSummary(viewModel);
const debug = volumetricCurrentDebugPayload(viewModel, { visibleVectorInstanceCount: 12, glyphInstanceCount: 12 });
const json = JSON.stringify(viewModel);

assert.equal(viewModel.type, 'anchor.rendering.simulation-world', 'simulation view model type survives volumetric augmentation');
assert.equal(viewModel.currentVisualizationAvailable, true, 'Simulation receives current visualization summary');
assert.equal(viewModel.currentPresentationRequested, true, 'Simulation requests current presentation');
assert.equal(viewModel.currentVectorSampleCount > 0, true, 'Simulation current sample count is nonzero');
assert.equal(viewModel.currentVectorValidCount > 0, true, 'Simulation valid current count is nonzero');
assert.equal(viewModel.currentActiveLayerId, 'thermocline', 'Simulation active current layer is preserved');
assert.equal(Number.isFinite(Number(viewModel.currentActiveTimeSeconds)), true, 'Simulation active current time is finite');
assert.equal(debug.sourceVectorSampleCount > 0, true, 'compact debug payload has source samples');
assert.equal(json.includes('eastVelocityCube'), false, 'view model does not clone full current cube arrays');
assert.equal(json.includes('northVelocityCube'), false, 'view model does not clone full current cube arrays');

console.log('smoke_simulation_current_view_model: ok', {
  simulationTimeSeconds: summary.simulationTimeSeconds,
  activeLayerId: viewModel.currentActiveLayerId,
  sampleCount: viewModel.currentVectorSampleCount
});
