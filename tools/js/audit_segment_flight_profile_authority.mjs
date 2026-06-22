import assert from 'node:assert/strict';

import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { validateSegmentFlightPlan } from '../../src/core/planning/SegmentFlightPlan.js';
import { makeLevel, makeMission, makePlan } from './water_column_smoke_helpers.mjs';

const level = makeLevel();
const mission = { ...makeMission(), waterColumnConfig: level.world.waterColumnConfig };
const segments = buildMissionRouteSegments(makePlan(), { level, mission });
assert.equal(segments.length > 0, true, 'audit fixture should create route segments');
for (const segment of segments) {
  assert.equal(segment.boundaryFlags.ownsRouteGeometry, false, 'route segment is derived from route geometry, not owner');
  assert.equal(segment.boundaryFlags.ownsSimulation, false, 'route segment does not own simulation');
  assert.equal(segment.boundaryFlags.ownsScoring, false, 'route segment does not own scoring');
  assert.equal(segment.boundaryFlags.usesNewPlanner, false, 'route segment does not create a planner');
  assert.equal(segment.flightProfile.boundaryFlags.representsLowLevelControl, false, 'flight profile is not a low-level descend/ascend command');
  assert.equal(segment.flightProfile.boundaryFlags.waypointIsHorizontalTarget, true, 'waypoint remains horizontal target');
  const validation = validateSegmentFlightPlan(segment.flightProfile, { level, mission });
  assert.equal(validation.valid, true, validation.errors.join('; '));
}

console.log('audit_segment_flight_profile_authority: ok', { segmentCount: segments.length });
