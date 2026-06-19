import assert from 'node:assert/strict';
import { generateScenarioFromConfig } from '../../src/core/generation/ScenarioConfig.js';
import { buildVolumetricMissionWorldViewModel, waterColumnRenderDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeOperationalDepthSlabLayer, updateThreeOperationalDepthSlabLayer, threeOperationalDepthSlabLayerSummary } from '../../src/game/three/layers/ThreeOperationalDepthSlabLayer.js';
import { createThreeWaterColumnVolumeFrameLayer, updateThreeWaterColumnVolumeFrameLayer, threeWaterColumnVolumeFrameLayerSummary } from '../../src/game/three/layers/ThreeWaterColumnVolumeFrameLayer.js';

const { level, mission } = generateScenarioFromConfig({ mode: 'perfectKnowledge', seed: 'visible-stack', width: 12, height: 12, duration: 8, agentCount: 1 });
const grid = level.world.grid;
const baseViewModel = {
  phase: 'planning',
  grid,
  coordinateSystem: createMissionWorldCoordinateTransform({ grid, depthScale: 0.045, verticalExaggeration: 1.35 }),
  scalarFieldLayer: { id: 'sampleValue', values: level.layers.truth.frames[0].roi, width: grid.width, height: grid.height },
  vectorFieldLayer: { id: 'currents', vectors: [] },
  visibility: { depthLayers: true }
};
const viewModel = buildVolumetricMissionWorldViewModel({
  baseViewModel,
  level,
  mission,
  plan: { agentPlans: [] },
  displaySettings: { waterColumn: { verticalDisplayMode: 'explodedLayers', activeDepthLayerId: 'thermocline', hiddenLayerIds: [] } }
});
const slabLayer = createThreeOperationalDepthSlabLayer();
updateThreeOperationalDepthSlabLayer(slabLayer, viewModel, { labels: false });
const frameLayer = createThreeWaterColumnVolumeFrameLayer();
updateThreeWaterColumnVolumeFrameLayer(frameLayer, viewModel);
const rendererSummary = {
  ...threeOperationalDepthSlabLayerSummary(slabLayer, viewModel),
  slabObjectCount: slabLayer.slabs.size,
  slabTextureCount: slabLayer.slabs.size,
  slabLabelCount: slabLayer.labels.size,
  ...threeWaterColumnVolumeFrameLayerSummary(frameLayer, viewModel)
};
const debug = waterColumnRenderDebugPayload(viewModel, rendererSummary, { cameraPresetId: 'obliqueWaterColumn', defaultDisplayModeApplied: true });
assert.equal(debug.fallbackUsed, false);
assert.ok(debug.canonicalLayerCount >= 5);
assert.ok(debug.visibleLayerCount > 1);
assert.equal(debug.uniqueLayerWorldYCount, debug.visibleLayerCount);
assert.ok(debug.minimumLayerWorldYSeparation > 0);
assert.equal(debug.coplanarLayerPairs.length, 0);
assert.ok(debug.waterColumnVolumeHeightWorld > 0);
assert.equal(debug.slabObjectCount, debug.visibleLayerCount);
assert.ok(debug.volumeFrameObjectCount > 0);
assert.equal(debug.modernMissionActuallyVolumetric, true);
console.log('smoke_visible_water_column_stack passed');