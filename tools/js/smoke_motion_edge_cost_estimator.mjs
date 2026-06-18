import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { createMotionCostGraphNode } from '../../src/core/motion/MotionCostGraphSchema.js';
import { estimateMotionEdgeCost } from '../../src/core/motion/MotionEdgeCostEstimator.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-edge', costGraphEnabled: true });
const fieldPack = createHeadlessFieldPack(config);
const fromNode = createMotionCostGraphNode({ nodeId: 'a', x: 4, y: 2, row: 2, col: 4, zIndex: 0, source: 'regularGrid', accessible: true });
const toNode = createMotionCostGraphNode({ nodeId: 'b', x: 8, y: 2, row: 2, col: 8, zIndex: 0, source: 'regularGrid', accessible: true, sciencePriority: 0.6 });
const edge = estimateMotionEdgeCost({ fromNode, toNode, fieldPack, waterColumnConfig: config.waterColumnConfig, motionConfig: config.motionConfig, config: config.costGraphConfig });
assert.equal(edge.type, 'anchor.motion.cost-graph-edge');
assert.ok(['feasible', 'warning'].includes(edge.status), `expected feasible/warning edge, got ${edge.status}`);
assert.ok(Number.isFinite(edge.weightedCost));
assert.ok(Number.isFinite(edge.energyCost));
assert.equal(edge.generatedRoute, false);
assert.equal(edge.usesRouteOptimizer, false);

console.log('Motion edge cost estimator smoke passed');
