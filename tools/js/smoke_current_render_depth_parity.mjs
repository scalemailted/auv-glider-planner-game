import assert from 'node:assert/strict';
import { createDepthStructuredField, findRepresentativeWetColumn } from './current_vertical_structure_test_helpers.mjs';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { sampleOceanCurrent } from '../../packages/currents/src/index.js';
const field = createDepthStructuredField();
const grid = { width: field.eastAxisMeters.length, height: field.northAxisMeters.length };
const model = buildWaterColumnLayerExplorerViewModel({
  level: { world: { grid, waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] } } },
  grid,
  currentField4D: field,
  waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] },
  activeTimeSeconds: field.timeAxisSeconds[1]
});
const column = findRepresentativeWetColumn(field, { timeSeconds: field.timeAxisSeconds[1], depthMeters: 35 });
for (const layer of model.layers) {
  const vector = layer.currentField.vectors.find((item) => item.x === column.xIndex && item.y === column.yIndex);
  const sample = sampleOceanCurrent({ field, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters: layer.representativeDepthMeters, timeSeconds: field.timeAxisSeconds[1] });
  assert.equal(vector.uEastMetersPerSecond, sample.uEastMetersPerSecond);
  assert.equal(vector.vNorthMetersPerSecond, sample.vNorthMetersPerSecond);
}
console.log('smoke_current_render_depth_parity: ok', { layers: model.layers.length, digest: field.digest });