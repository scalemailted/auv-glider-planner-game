import assert from 'node:assert/strict';

import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import {
  bestWaterColumnPriorityLayer,
  computeWaterColumnPriority,
  validateWaterColumnPriorityArtifact
} from '../../src/core/science/WaterColumnPriorityModel.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 6, height: 5, depthLayers: ['surface', 'thermocline', 'deep'] });
const fieldPack = createHeadlessFieldPack(config);
const artifact = computeWaterColumnPriority(fieldPack, config.waterColumnConfig);

assert.equal(artifact.type, 'anchor.headless.depth-layer-priority');
assert.equal(artifact.summary.excludesRouteTravelCost, true);
assert.equal(artifact.summary.usesFull3DPlanning, false);
assert.equal(validateWaterColumnPriorityArtifact(artifact).status, 'PASS');
assert.ok(bestWaterColumnPriorityLayer(artifact).depthLayerId);

console.log('smoke_water_column_priority_model: ok', { best: bestWaterColumnPriorityLayer(artifact) });
