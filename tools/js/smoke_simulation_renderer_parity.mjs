function assert(condition, message) {
  if (!condition) throw new Error(message);
}

import { compareSimulationExecutions, simulationRendererParitySummary } from '../../src/core/simulation/SimulationRendererParity.js';

const canonical = {
  levelId: 'parity-level',
  missionId: 'parity-mission',
  seed: 'seed-1',
  plan: { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [] },
  summary: { elapsedTime: 10, finalScore: 42, sampledCells: 3, energyUsed: 7, hazardsHit: 0, priorityTargets: { captured: 1 }, stopReason: { code: 'complete' } },
  events: [{ type: 'sample', agentId: 'g1', x: 1, y: 2, t: 3 }],
  trajectories: [{ agentId: 'g1', history: [{ x: 0, y: 0, t: 0 }, { x: 1, y: 2, t: 3 }] }]
};
const pass = compareSimulationExecutions(canonical, JSON.parse(JSON.stringify(canonical)));
assert(pass.status === 'PASS', 'identical canonical executions must pass');
assert(pass.canonicalDifferences.length === 0, 'identical canonical executions should have no differences');
const changed = JSON.parse(JSON.stringify(canonical));
changed.summary.finalScore = 41;
const fail = compareSimulationExecutions(canonical, changed);
assert(fail.status === 'FAIL', 'canonical score divergence must fail parity');
assert(simulationRendererParitySummary(pass).status === 'PASS', 'summary must preserve pass status');
console.log('smoke_simulation_renderer_parity passed');