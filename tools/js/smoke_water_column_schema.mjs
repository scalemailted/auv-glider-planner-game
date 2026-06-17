import assert from 'node:assert/strict';

import {
  WATER_COLUMN_DEFAULT_LAYER_IDS,
  WATER_COLUMN_DEPTH_LAYER_IDS,
  WATER_COLUMN_PROFILE_IDS,
  normalizeWaterColumnConfig,
  validateWaterColumnConfig,
  waterColumnConfigSummary
} from '../../src/core/science/WaterColumnSchema.js';

assert.ok(WATER_COLUMN_DEPTH_LAYER_IDS.includes('thermocline'));
assert.ok(WATER_COLUMN_PROFILE_IDS.includes('sawtoothProfile'));
assert.deepEqual(WATER_COLUMN_DEFAULT_LAYER_IDS, ['surface', 'thermocline', 'deep']);

const config = normalizeWaterColumnConfig({ depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'deepDive' });
const validation = validateWaterColumnConfig(config);
const summary = waterColumnConfigSummary(config);

assert.equal(validation.status, 'PASS');
assert.equal(summary.diveProfileId, 'deepDive');
assert.equal(summary.usesFull3DPlanning, false);
assert.equal(summary.usesPythonSimulator, false);
assert.equal(summary.usesMARL, false);

console.log('smoke_water_column_schema: ok', { layers: summary.depthLayerIds, profile: summary.diveProfileId });
