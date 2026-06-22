import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { waterColumnLayerMetadata } from '../../src/core/science/WaterColumnSchema.js';

const depthLayerIds = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
const grid = { width: 36, height: 24 };
const field = depthLayerIds.map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => Number((z * 0.11 + row * 0.001 + col * 0.001).toFixed(6)))));
const level = {
  levelId: 'water-column-layer-performance-audit',
  world: { grid, waterColumnConfig: { depthLayerIds, defaultLayerIds: depthLayerIds, source: 'generatedModernMission' } },
  layers: {
    terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)),
    waterColumn: { sampleValue: field, depthCoordinates: depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0)), timeCoordinates: [0] }
  },
  bathymetry: { depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 200)) }
};
const start = performance.now();
const explorer = buildWaterColumnLayerExplorerViewModel({ level, grid, displayMode: 'stackedSlabs' });
const elapsedMs = performance.now() - start;
const physicalCellCount = explorer.layers.length * grid.width * grid.height;
assert.equal(explorer.layers.length, depthLayerIds.length, 'all depth layers represented');
assert.equal(physicalCellCount <= 5000, true, 'fixture remains browser-friendly for smoke audit');
assert.equal(elapsedMs < 1000, true, 'explorer builds quickly enough for local smoke audit');
assert.equal(JSON.stringify(explorer).includes('isObject3D'), false, 'explorer view model does not allocate renderer objects');
assert.equal(explorer.boundaryFlags.displayOwnsScience, false);
assert.equal(explorer.boundaryFlags.displayChangesScoring, false);

console.log('audit_water_column_layer_performance: ok', { elapsedMs: Number(elapsedMs.toFixed(3)), physicalCellCount });
