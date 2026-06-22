import assert from 'node:assert/strict';

import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const plan = {
  type: 'anchor.plan',
  agentPlans: [{
    agentId: 'glider-1',
    selectedStart: { x: 0, y: 1 },
    diveProfileId: 'sawtoothProfile',
    targetDepthLayerId: 'thermocline',
    waypoints: [
      { id: 'wp-a', x: 1, y: 2, action: 'sample', diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow', cycleCount: 1 },
      { id: 'wp-b', x: 4, y: 3, action: 'sample', diveProfileId: 'deepDive', targetDepthLayerId: 'deep', cycleCount: 2 }
    ]
  }]
};
const model = makeVolumetricViewModel({ plan });
assert.equal(model.routeSegments.length, 2, 'route segments are built for each horizontal leg');
assert.equal(model.plannedDiveSegments.length, 2, 'planned dive preview has one entry per route segment');
for (const routeSegment of model.routeSegments) {
  const planned = model.plannedDiveSegments.find((candidate) => candidate.routeSegmentId === routeSegment.id || candidate.segmentId === routeSegment.id);
  assert.ok(planned, 'planned dive segment exists for ' + routeSegment.id);
  assert.equal(planned.diveProfileId, routeSegment.flightProfile.profileId, 'preview profile matches segment flight plan');
  assert.equal(planned.targetDepthLayerId, routeSegment.flightProfile.targetDepthLayerId, 'preview target layer matches segment flight plan');
  assert.equal(planned.boundaryFlags.ownsSimulation, false, 'preview does not own execution');
  assert.equal(planned.boundaryFlags.ownsScoring, false, 'preview does not own scoring');
}

console.log('smoke_segment_profile_execution_parity: ok', model.plannedDiveSegments.map((segment) => ({ id: segment.segmentId, profile: segment.diveProfileId, target: segment.targetDepthLayerId })));
