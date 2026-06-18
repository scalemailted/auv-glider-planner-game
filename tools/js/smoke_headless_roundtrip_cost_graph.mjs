import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';

const packet = JSON.parse(fs.readFileSync('docs/examples/headless_solver_packet.example.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('docs/examples/headless_solver_plan.example.json', 'utf8'));
const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
  seed: 'sim-r1-roundtrip',
  motionAware: true,
  costGraph: true,
  costGraphGridStep: 4,
  costGraphMaxNodes: 32,
  costMatrixFormat: 'sparse',
  includeHiddenTruth: false
});
assert.equal(roundtrip.report.summary.status, 'PASS');
assert.equal(roundtrip.report.runtime.usesMotionCostGraph, true);
assert.ok(roundtrip.report.motionCostGraphSummary.edgeCount > 0);
assert.ok(roundtrip.report.motionCostMatrixSummary.finiteCostCount > 0);
assert.equal(roundtrip.report.runtime.usesNewPlanner, false);
assert.equal(roundtrip.report.runtime.usesMARL, false);
assert.equal(JSON.stringify(roundtrip.report).includes('T_hiddenTruth'), false);

console.log('Headless roundtrip cost graph smoke passed');
