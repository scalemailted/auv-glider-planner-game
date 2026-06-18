import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { buildMotionCostGraph } from '../../src/core/motion/MotionCostGraphBuilder.js';
import { buildMotionCostMatrix } from '../../src/core/motion/MotionCostMatrixExporter.js';
import { sanitizeMotionCostGraphForPublicExport, validateMotionCostGraphPublicSafety, validateMotionCostMatrixPublicSafety } from '../../src/core/motion/MotionCostGraphPublicSafety.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-public', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24 });
const graph = buildMotionCostGraph({ config: config.costGraphConfig, fieldPack: createHeadlessFieldPack(config), waterColumnConfig: config.waterColumnConfig, motionConfig: config.motionConfig, plan: config.plan });
const safeGraph = sanitizeMotionCostGraphForPublicExport({ ...graph, hiddenTruthField: { T_hiddenTruth: [1] }, generatedRoute: true });
assert.equal(JSON.stringify(safeGraph).includes('T_hiddenTruth'), false);
assert.equal(safeGraph.generatedRoute, false);
assert.equal(validateMotionCostGraphPublicSafety(safeGraph).status, 'PASS');
const matrix = buildMotionCostMatrix(safeGraph, { matrixFormat: 'sparse' });
assert.equal(validateMotionCostMatrixPublicSafety(matrix).status, 'PASS');

console.log('Motion cost graph public safety smoke passed');
