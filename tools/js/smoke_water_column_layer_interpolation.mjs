import assert from 'node:assert/strict';

import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { sampleScalarFieldContinuous } from '../../src/core/science/VolumetricFieldSampler.js';
import { waterColumnLayerMetadata } from '../../src/core/science/WaterColumnSchema.js';

const depthLayerIds = ['surface', 'shallow', 'thermocline', 'deep'];
const depthCoordinates = depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0));
const grid = { width: 4, height: 4 };
const field = depthLayerIds.map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => Number((0.2 + z * 0.17 + row * 0.03 + col * 0.02).toFixed(6)))));
const level = {
  levelId: 'water-column-layer-interpolation-smoke',
  world: { grid, waterColumnConfig: { depthLayerIds, defaultLayerIds: depthLayerIds, source: 'generatedModernMission' } },
  layers: {
    terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)),
    waterColumn: { sampleValue: field, depthCoordinates, timeCoordinates: [0] }
  },
  bathymetry: { depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) }
};
const shallowDepth = Number(waterColumnLayerMetadata('shallow').nominalDepthMeters);
const thermoclineDepth = Number(waterColumnLayerMetadata('thermocline').nominalDepthMeters);
const depthMeters = (shallowDepth + thermoclineDepth) / 2;
const explorer = buildWaterColumnLayerExplorerViewModel({ level, grid, selectedLocation: { x: 1.3, y: 1.7, depthMeters }, displayMode: 'verticalProfile' });
const sample = sampleScalarFieldContinuous({ field, x: 1.3, y: 1.7, depthMeters, timeSeconds: 0, depthCoordinates, timeCoordinates: [0], interpolationProfileId: 'trilinearVolumeV1' });
const shallow = sampleScalarFieldContinuous({ field, x: 1.3, y: 1.7, depthMeters: shallowDepth, timeSeconds: 0, depthCoordinates, timeCoordinates: [0], interpolationProfileId: 'trilinearVolumeV1' }).value;
const thermocline = sampleScalarFieldContinuous({ field, x: 1.3, y: 1.7, depthMeters: thermoclineDepth, timeSeconds: 0, depthCoordinates, timeCoordinates: [0], interpolationProfileId: 'trilinearVolumeV1' }).value;
assert.equal(explorer.lowerInterpolationLayerId, 'shallow');
assert.equal(explorer.upperInterpolationLayerId, 'thermocline');
assert.equal(explorer.interpolationFraction > 0 && explorer.interpolationFraction < 1, true);
assert.equal(Number.isFinite(sample.value), true);
assert.equal(sample.value >= Math.min(shallow, thermocline) - 1e-9 && sample.value <= Math.max(shallow, thermocline) + 1e-9, true, 'interpolated value lies between adjacent layer values');
assert.equal(explorer.boundaryFlags.slabsSnapCanonicalDepth, false, 'display slabs do not replace continuous canonical depth sampling');

console.log('smoke_water_column_layer_interpolation: ok', { lower: explorer.lowerInterpolationLayerId, upper: explorer.upperInterpolationLayerId, fraction: explorer.interpolationFraction, value: sample.value });
