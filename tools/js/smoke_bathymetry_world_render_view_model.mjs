import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import {
  buildBathymetryWorldRenderViewModel,
  bathymetryWorldRenderViewModelSummary
} from '../../src/core/rendering/BathymetryWorldRenderViewModel.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'gfx-r2-view-model-smoke', width: 24, height: 16 });
const viewModel = buildBathymetryWorldRenderViewModel({
  bathymetry,
  waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' },
  plan: { waypoints: [{ x: 3, y: 12 }, { x: 12, y: 8, depthLayerId: 'thermocline', depthMeters: 35 }, { x: 20, y: 4, depthLayerId: 'surface', depthMeters: 0 }] },
  tracks: [{ x: 3, y: 12, depthLayerId: 'surface' }, { x: 12, y: 8, depthLayerId: 'thermocline', depthMeters: 35 }],
  observations: [{ observationId: 'obs-1', x: 12, y: 8, depthLayerId: 'thermocline', depthMeters: 35, observedValue: 0.7 }]
});
const summary = bathymetryWorldRenderViewModelSummary(viewModel);
assert.equal(viewModel.type, 'anchor.rendering.bathymetry-world-view-model');
assert.ok(viewModel.terrainGrid.length > 0, 'terrainGrid present');
assert.ok(viewModel.landMask.length > 0, 'landMask present');
assert.ok(viewModel.coastlineEdges.length > 0, 'coastlineEdges present');
assert.ok(viewModel.depthLayers.length >= 3, 'depthLayers present');
assert.ok(viewModel.surfaceWaypoints.length >= 2, 'surfaceWaypoints present');
assert.ok(viewModel.samplingPoints.length >= 1, 'samplingPoints present');
assert.ok(viewModel.plannedPath.length >= 2, 'plannedPath present');
assert.equal(viewModel.boundaryFlags.ownsSimulationState, false);
assert.equal(viewModel.boundaryFlags.ownsScoring, false);
assert.equal(viewModel.boundaryFlags.ownsPlanning, false);
assert.equal(viewModel.boundaryFlags.usesFull3DPlanning, false);
assert.equal(viewModel.boundaryFlags.usesWebGPUFluid, false);
assert.equal(viewModel.boundaryFlags.usesMARL, false);
assert.equal(JSON.stringify(viewModel).includes('T_hiddenTruth'), false, 'view model omits hidden truth identifier');
assert.ok(summary.terrainVertexCount > 0, 'summary includes terrain vertices');
console.log('smoke_bathymetry_world_render_view_model: ok');