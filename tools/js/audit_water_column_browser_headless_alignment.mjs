import assert from 'node:assert/strict';
import { normalizeWaterColumnConfig, waterColumnConfigSummary } from '../../src/core/science/WaterColumnSchema.js';
import { makeVolumetricViewModel, TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

const browserModel = makeVolumetricViewModel({ waterColumnConfig: TEST_WATER_COLUMN_CONFIG });
const browserSummary = waterColumnConfigSummary(browserModel.waterColumnConfig);
const headlessEquivalent = normalizeWaterColumnConfig(TEST_WATER_COLUMN_CONFIG);
assert.deepEqual(browserModel.waterColumnConfig.depthLayerIds, headlessEquivalent.depthLayerIds);
assert.equal(browserSummary.usesFull3DPlanning, false);
assert.equal(browserSummary.usesNewPlanner, false);
assert.equal(browserSummary.calibratedVerticalOceanModel, false);
assert.equal(browserSummary.syntheticTeachingModel ?? true, true);
console.log(JSON.stringify({ ok: true, depthLayerIds: browserSummary.depthLayerIds, diveProfileId: browserSummary.diveProfileId }));
