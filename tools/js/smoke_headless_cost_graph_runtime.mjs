import assert from 'node:assert/strict';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-runtime', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24, costMatrixFormat: 'sparse' });
const episode = runHeadlessMission(config);
assert.ok(episode.motionCostGraph, 'runtime episode includes graph');
assert.ok(episode.motionCostMatrix, 'runtime episode includes matrix');
assert.ok(episode.motionCostGraphSummary.edgeCount > 0);
assert.ok(episode.motionCostMatrixSummary.finiteCostCount > 0);
assert.equal(episode.diagnostics.usesMotionCostGraph, true);
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(files['motion_cost_graph.json']);
assert.ok(files['motion_cost_matrix.json']);
assert.ok(files['bundle.json']);
assert.equal(files['bundle.json'].includes('T_hiddenTruth'), false);

console.log('Headless cost graph runtime smoke passed');
