import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { createMotionCostGraphNodes } from '../../src/core/motion/MotionCostGraphNodes.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-nodes', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24 });
const fieldPack = createHeadlessFieldPack(config);
const nodeSet = createMotionCostGraphNodes({ config: config.costGraphConfig, fieldPack, waterColumnConfig: config.waterColumnConfig, plan: config.plan });
assert.equal(nodeSet.type, 'anchor.motion.cost-graph-node-set');
assert.ok(nodeSet.nodes.length > 4, 'regular grid should produce several nodes');
assert.ok(nodeSet.nodes.every((node) => node.publicSafe !== false), 'nodes are public-safe');
assert.equal(nodeSet.summary.usesNewPlanner, false);
assert.equal(nodeSet.summary.hiddenTruthIncluded, false);

console.log('Motion cost graph nodes smoke passed');
