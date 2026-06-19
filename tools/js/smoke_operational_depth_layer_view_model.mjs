import assert from 'node:assert/strict';
import { buildOperationalDepthLayerViewModel, validateOperationalDepthLayerViewModel } from '../../src/core/rendering/OperationalDepthLayerViewModel.js';
import { buildBottomBoundaryViewModel } from '../../src/core/rendering/BottomBoundaryViewModel.js';
import { makeGrid, makeLevel, TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const grid = makeGrid();
const level = makeLevel({ grid });
const bottomBoundary = buildBottomBoundaryViewModel({ level, grid });
const model = buildOperationalDepthLayerViewModel({ waterColumnConfig: TEST_WATER_COLUMN_CONFIG, bottomBoundary, grid, activeDepthLayerId: 'thermocline' });
const validation = validateOperationalDepthLayerViewModel(model);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(model.usesFull3DPlanning, false);
assert.equal(model.ownsPlanning, false);
assert.equal(model.layers.some((layer) => layer.id === 'thermocline'), true);
assert.equal(model.validDepthMask.deep[1][1], false, 'Deep layer must be masked where bottom depth is shallow.');
assert.equal(model.validDepthMask.thermocline[2][2], true, 'Thermocline should be available in deeper water.');
console.log(JSON.stringify({ ok: true, summary: validation.summary }));
