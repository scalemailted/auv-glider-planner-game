import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { buildMotionCostGraph } from '../../src/core/motion/MotionCostGraphBuilder.js';
import { buildMotionCostMatrix, motionCostMatrixToCsv, validateMotionCostMatrix } from '../../src/core/motion/MotionCostMatrixExporter.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-matrix', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24, costMatrixFormat: 'sparse' });
const graph = buildMotionCostGraph({ config: config.costGraphConfig, fieldPack: createHeadlessFieldPack(config), waterColumnConfig: config.waterColumnConfig, motionConfig: config.motionConfig, plan: config.plan });
const matrix = buildMotionCostMatrix(graph, { matrixFormat: 'sparse' });
assert.equal(matrix.type, 'anchor.headless.motion-cost-matrix');
assert.equal(validateMotionCostMatrix(matrix).status, 'PASS');
assert.equal(matrix.matrixFormat, 'sparse');
assert.ok(matrix.summary.finiteCostCount > 0);
assert.ok(motionCostMatrixToCsv(matrix).includes('from,to,fromIndex,toIndex,cost'));
assert.equal(JSON.stringify(matrix).includes('T_hiddenTruth'), false);

console.log('Motion cost matrix exporter smoke passed');
