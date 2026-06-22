import assert from 'node:assert/strict';

import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { waterColumnLayerMetadata } from '../../src/core/science/WaterColumnSchema.js';

const depthLayerIds = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
const grid = { width: 4, height: 4 };
const field = depthLayerIds.map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => Number(([0.1, 0.31, 0.82, 0.55, 0.24][z] + row * 0.01 + col * 0.01).toFixed(6)))));
const level = {
  levelId: 'same-xy-layer-value-display-smoke',
  world: { grid, waterColumnConfig: { depthLayerIds, defaultLayerIds: depthLayerIds, source: 'generatedModernMission' } },
  layers: {
    terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)),
    waterColumn: { sampleValue: field, depthCoordinates: depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0)), timeCoordinates: [0] }
  },
  bathymetry: { depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) }
};
const explorer = buildWaterColumnLayerExplorerViewModel({ level, grid, selectedLocation: { x: 1.5, y: 2.25, depthLayerId: 'thermocline' }, displayMode: 'stackedSlabs', activeLayerId: 'thermocline' });
const values = explorer.selectedVerticalProfile.map((entry) => Number(entry.scienceValue));
assert.equal(values.every(Number.isFinite), true, 'all depth-specific display samples are finite');
assert.equal(new Set(values.map((value) => value.toFixed(5))).size >= 2, true, 'display fixture exposes materially different values at one x/y');
assert.equal(explorer.layers.some((layer) => layer.id === 'integratedWaterColumn'), false, 'integrated view is not added as a physical operational layer');
assert.equal(explorer.integratedSummary.derived, true, 'integrated view is explicitly derived');

console.log('smoke_same_xy_layer_value_display: ok', { values: explorer.selectedVerticalProfile.map((entry) => ({ layerId: entry.layerId, value: entry.scienceValue })) });
