function assert(condition, message) {
  if (!condition) throw new Error(message);
}

import {
  createMissionExecutionSnapshot,
  createMissionLaunchPayload,
  digestExecutionPlan,
  publicExecutionPlan
} from '../../src/core/simulation/MissionExecutionSnapshot.js';

const level = {
  levelId: 'snapshot-level',
  world: { grid: { width: 8, height: 8 }, time: { dt: 1, duration: 10 } },
  layers: { terrain: Array.from({ length: 8 }, () => Array(8).fill(0)), truth: { frames: [] } },
  meta: { seed: 'snapshot-seed' }
};
const mission = {
  missionId: 'snapshot-mission',
  agents: [{ id: 'g1', label: 'Glider 1', start: { x: 1, y: 1 }, maxSpeed: 2, battery: 100 }],
  rules: {},
  scoring: {}
};
const plan = {
  schemaVersion: '2.0',
  type: 'anchor.plan',
  levelId: level.levelId,
  missionId: mission.missionId,
  planningMarkers: [{ id: 'marker-1', x: 3, y: 3 }],
  agentPlans: [{ agentId: 'g1', selectedStart: { x: 1, y: 1 }, waypoints: [
    { id: 'w1', x: 4, y: 1, action: 'sample', t: 2 },
    { id: 'w2', x: 5, y: 2, action: 'sample', t: 4 }
  ] }]
};
const original = JSON.stringify(plan);
const snapshot = createMissionExecutionSnapshot({ level, mission, plan, selectedAgentId: 'g1' });
const payload = createMissionLaunchPayload({ snapshot });
assert(JSON.stringify(plan) === original, 'snapshot creation must not mutate input plan');
assert(snapshot.planSummary.selectedStartCount === 1, 'selected start must be preserved');
assert(snapshot.planSummary.executableWaypointCount === 2, 'waypoint count must be preserved');
assert(snapshot.planSummary.waypointIds.map((item) => item.waypointId).join(',') === 'w1,w2', 'waypoint IDs/order must be preserved');
assert(payload.plan.agentPlans[0].agentId === 'g1', 'agent ownership must be preserved');
assert(!JSON.stringify(publicExecutionPlan(payload.plan)).includes('planningMarkers'), 'planning markers must be excluded from executable digest');
assert(digestExecutionPlan(payload.plan) === payload.planDigest, 'launch digest must be stable');

console.log('smoke_execution_plan_snapshot passed');