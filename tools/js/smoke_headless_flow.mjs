import assert from 'node:assert/strict';

import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { currentAssist, crossCurrentMagnitude, advectPoint, headlessFlowSummary, sampleHeadlessFlow } from '../../src/core/headless/runtime/HeadlessFlow.js';

const fieldPack = createHeadlessFieldPack({ seed: 'h1-flow-smoke', width: 12, height: 8 });
const flow = sampleHeadlessFlow(fieldPack, 5, 4, 1);
assert.equal(Number.isFinite(flow.u), true, 'flow u finite');
assert.equal(Number.isFinite(flow.v), true, 'flow v finite');
assert.ok(currentAssist({ u: 1, v: 0 }, { x: 1, y: 0 }) > 0, 'assist positive downstream');
assert.ok(currentAssist({ u: -1, v: 0 }, { x: 1, y: 0 }) < 0, 'assist negative upstream');
assert.equal(crossCurrentMagnitude({ u: 0, v: 1 }, { x: 1, y: 0 }), 1, 'cross-current magnitude');
assert.deepEqual(advectPoint({ x: 1, y: 2 }, { u: 0.5, v: -0.25 }, 2, 1), { x: 2, y: 1.5 }, 'advects point');
const summary = headlessFlowSummary(fieldPack);
assert.equal(summary.finite, true, 'flow summary finite');
assert.equal(summary.hasFlowU, true, 'flow U exists');
assert.equal(summary.hasFlowV, true, 'flow V exists');

console.log('Headless flow smoke passed');
