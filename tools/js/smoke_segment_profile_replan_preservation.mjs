import assert from 'node:assert/strict';

import { createSurfacingReplanHandoff, normalizeSurfacingReplanHandoff, validateSurfacingReplanHandoff } from '../../src/core/planning/SurfacingReplanHandoff.js';

const plan = {
  type: 'anchor.plan',
  agentPlans: [{
    agentId: 'glider-1',
    selectedStart: { x: 0, y: 1 },
    waypoints: [
      { id: 'wp-a', x: 1, y: 2, action: 'sample', diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow', samplingPhase: 'descent' },
      { id: 'wp-b', x: 4, y: 3, action: 'sample', diveProfileId: 'deepDive', targetDepthLayerId: 'deep', samplingPhase: 'both' }
    ]
  }]
};
const decisionState = {
  id: 'surface-decision-1',
  agentId: 'glider-1',
  time: 120,
  actualPosition: { x: 1.2, y: 2.1 },
  completedWaypoints: ['wp-a'],
  pendingWaypoints: ['wp-b'],
  missedWaypoints: []
};
const handoff = createSurfacingReplanHandoff({
  level: { levelId: 'replan-segment-profile-smoke' },
  mission: { missionId: 'replan-segment-profile-mission', agents: [{ id: 'glider-1' }] },
  plan,
  decisionState,
  surfacedAgentId: 'glider-1',
  resumeState: { t: 120, awaitingSurfaceDecision: decisionState, agents: [{ id: 'glider-1', x: 1.2, y: 2.1 }] }
});
const normalized = normalizeSurfacingReplanHandoff(handoff);
const validation = validateSurfacingReplanHandoff(normalized);
assert.equal(validation.valid, true, validation.errors.join('; '));
const retainedWaypoint = normalized.sourcePlan.agentPlans[0].waypoints.find((waypoint) => waypoint.id === 'wp-b');
assert.equal(retainedWaypoint.diveProfileId, 'deepDive', 'future segment profile is preserved in handoff source plan');
assert.equal(retainedWaypoint.targetDepthLayerId, 'deep', 'future segment target layer is preserved in handoff source plan');
assert.equal(retainedWaypoint.samplingPhase, 'both', 'future segment sampling phase is preserved in handoff source plan');
assert.equal(normalized.boundaryFlags.resetsSimulationClock, false);
assert.equal(normalized.boundaryFlags.usesNewPlanner, false);

console.log('smoke_segment_profile_replan_preservation: ok', validation.summary);
