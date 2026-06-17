import assert from 'node:assert/strict';

import {
  bestWaterColumnDepthLayer,
  collapseWaterColumnField,
  createWaterColumnScalarField,
  sampleWaterColumnScalar,
  validateWaterColumnField,
  waterColumnFieldSummary
} from '../../src/core/science/WaterColumnFieldModel.js';

const config = { width: 4, height: 3, depthLayerIds: ['surface', 'thermocline', 'deep'] };
const field = createWaterColumnScalarField(config, 0);
field[0][1][1] = 0.2;
field[1][1][1] = 0.8;
field[2][1][1] = 0.5;

assert.equal(validateWaterColumnField(field, config).status, 'PASS');
assert.ok(sampleWaterColumnScalar(field, 1, 1, 'thermocline', config) > 0.79);
assert.equal(collapseWaterColumnField(field, config, { method: 'maxValue' })[1][1], 0.8);
assert.equal(bestWaterColumnDepthLayer(field, config).bestLayerByCell[1][1], 'thermocline');

const summary = waterColumnFieldSummary(field, config, { fieldId: 'A_global' });
assert.equal(summary.type, 'anchor.headless.depth-layer-diagnostics');
assert.equal(summary.usesFull3DPlanning, false);

console.log('smoke_water_column_field_model: ok', { best: summary.bestDepthLayerCounts });
