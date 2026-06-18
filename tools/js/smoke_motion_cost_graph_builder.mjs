import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { buildMotionCostGraph, validateMotionCostGraph } from '../../src/core/motion/MotionCostGraphBuilder.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-builder', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24, costMatrixFormat: 'sparse' });
const graph = buildMotionCostGraph({
  config: config.costGraphConfig,
  fieldPack: createHeadlessFieldPack(config),
  waterColumnConfig: config.waterColumnConfig,
  motionConfig: config.motionConfig,
  plan: config.plan
});
const validation = validateMotionCostGraph(graph);
assert.equal(graph.type, 'anchor.benchmark.feasibility-cost-graph');
assert.equal(validation.status, 'PASS');
assert.ok(graph.summary.nodeCount > 0);
assert.ok(graph.summary.edgeCount > 0);
assert.ok(graph.summary.feasibleEdgeCount > 0);
assert.equal(graph.summary.usesRouteOptimizer, false);
assert.equal(JSON.stringify(graph).includes('T_hiddenTruth'), false);

console.log('Motion cost graph builder smoke passed');
