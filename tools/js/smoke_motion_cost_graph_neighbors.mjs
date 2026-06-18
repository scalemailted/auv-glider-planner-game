import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { createMotionCostGraphNodes } from '../../src/core/motion/MotionCostGraphNodes.js';
import { createMotionCostGraphNeighborPairs } from '../../src/core/motion/MotionCostGraphNeighbors.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-neighbors', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24 });
const fieldPack = createHeadlessFieldPack(config);
const nodeSet = createMotionCostGraphNodes({ config: config.costGraphConfig, fieldPack, waterColumnConfig: config.waterColumnConfig });
const neighborSet = createMotionCostGraphNeighborPairs(nodeSet.nodes, config.costGraphConfig);
assert.equal(neighborSet.type, 'anchor.motion.cost-graph-neighbor-pairs');
assert.ok(neighborSet.pairs.length > 0, 'neighbors should be generated');
assert.ok(neighborSet.pairs.every((pair) => pair.fromNodeId !== pair.toNodeId), 'self-neighbors are excluded');
assert.equal(neighborSet.summary.usesRouteOptimizer, false);

console.log('Motion cost graph neighbors smoke passed');
