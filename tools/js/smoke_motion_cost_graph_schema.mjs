import assert from 'node:assert/strict';

import {
  createMotionCostGraphConfig,
  createMotionCostGraphEdge,
  createMotionCostGraphNode,
  motionCostGraphConfigSummary,
  validateMotionCostGraphConfig,
  validateMotionCostGraphEdge,
  validateMotionCostGraphNode
} from '../../src/core/motion/MotionCostGraphSchema.js';

const config = createMotionCostGraphConfig({ metricId: 'balanced', nodeSourceId: 'regularGrid', gridStep: 3, maxNodes: 30, matrixFormat: 'sparse' });
assert.equal(config.type, 'anchor.motion.cost-graph-config');
assert.equal(config.metricId, 'balanced');
assert.equal(config.maxNodes, 30);
assert.equal(validateMotionCostGraphConfig(config).status, 'PASS');
assert.equal(motionCostGraphConfigSummary(config).usesRouteOptimizer, false);

const node = createMotionCostGraphNode({ nodeId: 'n-a', x: 1, y: 2, zIndex: 0, source: 'regularGrid' });
assert.equal(validateMotionCostGraphNode(node).status, 'PASS');

const edge = createMotionCostGraphEdge({ fromNodeId: 'n-a', toNodeId: 'n-b', status: 'feasible', distanceMeters: 1000, durationSeconds: 600, energyCost: 2, weightedCost: 2 });
assert.equal(validateMotionCostGraphEdge(edge).status, 'PASS');
assert.equal(edge.generatedRoute, false);
assert.equal(edge.usesRouteOptimizer, false);
assert.equal(edge.usesMARL, false);

console.log('Motion cost graph schema smoke passed');
