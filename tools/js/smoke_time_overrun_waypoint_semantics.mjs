import assert from 'node:assert/strict';
import { addWaypoint, getAgentPlan } from '../../src/core/planning/WaypointPlan.js';
import { validatePlanForExecution } from '../../src/core/planning/PlanExecutionValidator.js';

const zeros = (w, h) => Array.from({ length: h }, () => Array(w).fill(0));
const zeroVectors = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0]));
const level = {
  world: { grid: { width: 4, height: 4 }, time: { dt: 1, duration: 2 } },
  layers: {
    terrain: zeros(4, 4),
    hazards: zeros(4, 4),
    truth: { frames: [{ t: 0, vector: zeroVectors(4, 4), roi: zeros(4, 4) }] }
  }
};
const mission = { agents: [{ id: 'g1', maxSpeed: 1, battery: 100, start: { x: 0, y: 0 } }], rules: {}, physics: {} };
const plan = { type: 'anchor.plan', agentPlans: [{ agentId: 'g1', waypoints: [] }] };
const waypoint = addWaypoint(plan, 'g1', { x: 3, y: 3, t: 6, estimatedArrivalTime: 6, warningCodes: ['BEYOND_MISSION_WINDOW'], warnings: ['Waypoint ETA exceeds mission duration; it will be kept as a mission-window warning.'], validity: { valid: true, reasons: ['waypoint_exceeds_mission_duration'] }, runtimeBehavior: 'truncate_at_mission_end' });
assert.equal(getAgentPlan(plan, 'g1').waypoints.length, 1);
assert.equal(waypoint.warningCodes.includes('BEYOND_MISSION_WINDOW'), true);
const validation = validatePlanForExecution({ level, mission, plan });
assert.equal(validation.ok, true);
assert.equal(validation.warnings.some((warning) => /mission duration|mission time/i.test(warning)), true);
console.log('smoke_time_overrun_waypoint_semantics passed');
