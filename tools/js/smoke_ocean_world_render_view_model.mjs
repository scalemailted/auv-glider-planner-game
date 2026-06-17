import assert from 'node:assert/strict';
import {
  OCEAN_WORLD_RENDER_VIEW_MODEL_VERSION,
  buildOceanWorldRenderViewModel,
  oceanWorldRenderViewModelSummary
} from '../../src/core/rendering/OceanWorldRenderViewModel.js';

assert.equal(typeof OCEAN_WORLD_RENDER_VIEW_MODEL_VERSION, 'string');
const viewModel = buildOceanWorldRenderViewModel({
  missionConfig: {
    world: { grid: { width: 16, height: 10 } },
    waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] }
  },
  waterColumnSummary: {
    waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' },
    observationCountsByDepth: { surface: 1, thermocline: 1, deep: 1 },
    trackCountsByDepth: { surface: 2, thermocline: 2, deep: 2 },
    verticalCoverage: 'broad',
    publicSafe: true
  },
  bathymetrySummary: { minDepthMeters: 5, maxDepthMeters: 130, meanDepthMeters: 68, source: 'synthetic-smoke' },
  motionTrajectory: {
    plannedWaypoints: [
      { id: 'wp-1', x: 1, y: 8, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0 },
      { id: 'wp-2', x: 7, y: 4, depthLayerId: 'thermocline', depthMeters: 45, timeSeconds: 600 }
    ],
    realizedTrack: [
      { id: 'track-1', x: 1, y: 8, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0, currentAssist: 0.1, crossCurrent: 0.05 },
      { id: 'track-2', x: 6.5, y: 4.2, depthLayerId: 'thermocline', depthMeters: 43, timeSeconds: 600, currentAssist: 0.2, crossCurrent: 0.12 }
    ],
    sampledObservations: [
      { id: 'sample-1', x: 6.5, y: 4.2, depthLayerId: 'thermocline', depthMeters: 43, value: 0.7, truthValue: 0.9, timeSeconds: 600 }
    ],
    T_hiddenTruth: [[1, 2, 3]]
  },
  scienceDiagnostics: { primaryDiagnosis: 'synthetic smoke', recommendedObjective: 'sample thermocline', hiddenTruthIncluded: false },
  options: { id: 'smoke-ocean-world-view-model' }
});

assert.equal(viewModel.type, 'anchor.rendering.ocean-world-view-model');
assert.equal(viewModel.depthLayers.length, 3);
assert.equal(viewModel.plannedPath.length, 2);
assert.equal(viewModel.realizedTrajectory.length, 2);
assert.equal(viewModel.samplingPoints.length, 1);
assert.ok(viewModel.diveProfilePath.length >= 1);
assert.equal(viewModel.boundaryFlags.ownsSimulationState, false);
assert.equal(viewModel.boundaryFlags.ownsScoring, false);
assert.equal(viewModel.boundaryFlags.ownsPlanning, false);
assert.equal(viewModel.boundaryFlags.usesWebGPUFluid, false);
assert.equal(viewModel.boundaryFlags.usesMARL, false);
assert.ok(viewModel.warnings.some((message) => message.includes('hidden truth')));
const serialized = JSON.stringify(viewModel);
assert.equal(serialized.includes('T_hiddenTruth'), false);
assert.equal(serialized.includes('truthValue'), false);

const summary = oceanWorldRenderViewModelSummary(viewModel);
assert.equal(summary.depthLayerCount, 3);
assert.equal(summary.plannedPathPointCount, 2);
assert.equal(summary.realizedTrajectoryPointCount, 2);
assert.equal(summary.samplingPointCount, 1);
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.ownsScoring, false);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.usesWebGPUFluid, false);
assert.equal(summary.usesMARL, false);

console.log('smoke_ocean_world_render_view_model: ok');