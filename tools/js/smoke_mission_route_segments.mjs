import assert from 'node:assert/strict';

import { buildMissionRouteSegments, missionRouteSegmentDigest, missionRouteSegmentSummary } from '../../src/core/planning/MissionRouteSegment.js';
import { makeLevel, makeMission } from './water_column_smoke_helpers.mjs';

const level = makeLevel();
const mission = {
  ...makeMission(),
  agents: [
    { id: 'glider-1', start: { x: 0, y: 1 }, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline' },
    { id: 'glider-2', start: { x: 0, y: 3 }, diveProfileId: 'surfaceOnly' }
  ],
  waterColumnConfig: level.world.waterColumnConfig
};
const plan = {
  type: 'anchor.plan',
  agentPlans: [
    {
      agentId: 'glider-1',
      selectedStart: { x: 0, y: 1 },
      waypoints: [
        { id: 'wp-a', x: 1, y: 2, action: 'sample', diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow', samplingPhase: 'descent' },
        { id: 'wp-b', x: 4, y: 3, action: 'sample', diveProfileId: 'deepDive', targetDepthLayerId: 'deep', samplingPhase: 'ascent' }
      ]
    },
    { agentId: 'glider-2', selectedStart: { x: 0, y: 3 }, waypoints: [] }
  ]
};

const segments = buildMissionRouteSegments(plan, { level, mission });
assert.equal(segments.length, 2, 'idle glider with zero waypoints creates no route segment');
assert.equal(segments[0].source.type, 'selectedStart', 'first segment starts at selected deployment');
assert.equal(segments[0].target.id, 'wp-a', 'first target is first waypoint');
assert.equal(segments[1].source.id, 'wp-a', 'second segment starts at previous waypoint');
assert.equal(segments[1].target.id, 'wp-b', 'second segment targets next waypoint');
assert.equal(segments[0].flightProfile.profileId, 'shallowDive');
assert.equal(segments[1].flightProfile.profileId, 'deepDive');
assert.equal(segments[1].flightProfile.targetDepthLayerId, 'deep');
assert.equal(segments[0].boundaryFlags.waypointIsHorizontalTarget, true);
assert.equal(segments[0].boundaryFlags.flightProfileBelongsToIncomingSegment, true);
assert.equal(segments[0].boundaryFlags.representsLowLevelControl, false);
assert.equal(missionRouteSegmentDigest(segments[0]), missionRouteSegmentDigest(segments[0]), 'segment digest is deterministic');

console.log('smoke_mission_route_segments: ok', { summaries: segments.map(missionRouteSegmentSummary) });
