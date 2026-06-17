import assert from 'node:assert/strict';

import { createGliderMotionConfig } from '../../src/core/motion/GliderMotionSchema.js';
import {
  buildControlScheduleFromWaypoints,
  normalizeMotionPlanInput,
  plannedPathSummary
} from '../../src/core/motion/PlanControlAdapter.js';

const plan = {
  type: 'anchor.plan',
  planId: 'motion-plan-smoke',
  agentPlans: [{
    agentId: 'glider_01',
    waypoints: [
      { x: 0, y: 0, depthLayerId: 'surface' },
      { x: 4, y: 0, depthLayerId: 'thermocline' },
      { x: 4, y: 3, depthLayerId: 'deep', surfaceRequested: true }
    ]
  }],
  desiredSpeedThroughWater: 1.1,
  diveProfileId: 'sawtoothProfile',
  sampleIntervalSeconds: 90
};
const originalPlanJson = JSON.stringify(plan);
const normalized = normalizeMotionPlanInput(plan, { agentId: 'glider_01' });
assert.equal(normalized.planId, 'motion-plan-smoke', 'plan id preserved');
assert.equal(normalized.routeAuthority, 'providedWaypointsOnly', 'plain waypoint plan authority is preserved');
assert.equal(normalized.generatedRoute, false, 'adapter does not generate route');
assert.equal(normalized.waypoints.length, 3, 'waypoints preserved');
assert.equal(normalized.diveProfileId, 'sawtoothProfile', 'default dive profile is preserved for motion execution');
assert.equal(JSON.stringify(plan), originalPlanJson, 'adapter does not mutate input plan');
const oldPlan = { waypoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
assert.equal(normalizeMotionPlanInput(oldPlan).waypoints.length, 2, 'old plan without motion fields works');

const schedule = buildControlScheduleFromWaypoints({
  waypoints: normalized.waypoints,
  glider: { id: 'glider_01' },
  motionConfig: createGliderMotionConfig({ enabled: true, gliderSpeed: 1 }),
  options: { surfaceAtEnd: true }
});
assert.equal(schedule.generatedRoute, false, 'control schedule does not generate route');
assert.equal(schedule.controls.length, 2, 'one command per segment');
assert.equal(schedule.controls.at(-1).surfaceRequested, true, 'final command can request surfacing');
assert.equal(plannedPathSummary(normalized.waypoints).plannedDistance, 7, 'planned distance computed');

console.log('Plan control adapter smoke passed', { controls: schedule.controls.length });
