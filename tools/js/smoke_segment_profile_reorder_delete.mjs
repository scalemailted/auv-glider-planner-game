import assert from 'node:assert/strict';

import { buildMissionRouteSegments } from '../../src/core/planning/MissionRouteSegment.js';
import { makeLevel, makeMission } from './water_column_smoke_helpers.mjs';

const level = makeLevel();
const mission = { ...makeMission(), waterColumnConfig: level.world.waterColumnConfig };
function basePlan() {
  return {
    type: 'anchor.plan',
    agentPlans: [{
      agentId: 'glider-1',
      selectedStart: { x: 0, y: 1 },
      waypoints: [
        { id: 'wp-a', x: 1, y: 1, action: 'sample', diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow' },
        { id: 'wp-b', x: 2, y: 2, action: 'sample', diveProfileId: 'deepDive', targetDepthLayerId: 'deep' },
        { id: 'wp-c', x: 3, y: 3, action: 'sample', diveProfileId: 'surfaceOnly', targetDepthLayerId: 'surface' }
      ]
    }]
  };
}

const original = buildMissionRouteSegments(basePlan(), { level, mission });
const reorderedPlan = basePlan();
const waypoints = reorderedPlan.agentPlans[0].waypoints;
waypoints.splice(0, 2, waypoints[1], waypoints[0]);
const reordered = buildMissionRouteSegments(reorderedPlan, { level, mission });
const wpBIncoming = reordered.find((segment) => segment.target.id === 'wp-b');
const wpAIncoming = reordered.find((segment) => segment.target.id === 'wp-a');
assert.equal(wpBIncoming.flightProfile.profileId, 'deepDive', 'profile metadata travels with target waypoint after reorder');
assert.equal(wpAIncoming.flightProfile.profileId, 'shallowDive', 'moved waypoint keeps its incoming-segment profile');
assert.notEqual(wpBIncoming.id, original.find((segment) => segment.target.id === 'wp-b').id, 'segment id reflects changed source/target topology');

const deletedPlan = basePlan();
deletedPlan.agentPlans[0].waypoints = deletedPlan.agentPlans[0].waypoints.filter((waypoint) => waypoint.id !== 'wp-b');
const afterDelete = buildMissionRouteSegments(deletedPlan, { level, mission });
assert.equal(afterDelete.some((segment) => segment.target.id === 'wp-b'), false, 'deleted waypoint removes its incoming segment');
assert.equal(afterDelete.some((segment) => segment.flightProfile.profileId === 'deepDive'), false, 'deleted segment profile does not migrate to unrelated leg');

console.log('smoke_segment_profile_reorder_delete: ok', {
  original: original.map((segment) => segment.id),
  reordered: reordered.map((segment) => segment.id),
  afterDelete: afterDelete.map((segment) => segment.id)
});
