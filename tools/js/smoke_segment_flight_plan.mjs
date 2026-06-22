import assert from 'node:assert/strict';

import {
  createSegmentFlightPlan,
  normalizeSamplingPhase,
  segmentFlightPlanDigest,
  segmentFlightPlanSummary,
  validateSegmentFlightPlan
} from '../../src/core/planning/SegmentFlightPlan.js';
import { TEST_WATER_COLUMN_CONFIG, makeLevel, makeMission } from './water_column_smoke_helpers.mjs';

const level = makeLevel();
const mission = { ...makeMission(), waterColumnConfig: TEST_WATER_COLUMN_CONFIG, physics: { minimumBottomClearanceMeters: 5 } };
const agentPlan = { agentId: 'glider-1', diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline' };
const segment = {
  id: 'glider-1:segment:start->wp-a',
  agentId: 'glider-1',
  source: { point: { x: 0, y: 1 } },
  target: { point: { x: 4, y: 2 } },
  horizontalGeometry: { distanceCells: 4.12 }
};
const plan = createSegmentFlightPlan({
  segment,
  agentPlan,
  mission,
  level,
  targetWaypoint: {
    id: 'wp-a',
    x: 4,
    y: 2,
    diveProfileId: 'deepDive',
    targetDepthLayerId: 'deep',
    maximumDiveDepthMeters: 120,
    cycleCount: 2,
    sampleIntervalSeconds: 300,
    samplingPhase: 'both',
    surfaceAtEnd: true,
    communicationWaitSeconds: 180
  }
});

const validation = validateSegmentFlightPlan(plan, { mission, level });
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(plan.profileId, 'deepDive');
assert.equal(plan.targetDepthLayerId, 'deep');
assert.equal(plan.maximumImmersionMeters, 120);
assert.equal(plan.cycleCount, 2);
assert.equal(plan.samplingPhase, 'both');
assert.equal(plan.surfaceAtEnd, true);
assert.equal(plan.communicationWaitSeconds, 180);
assert.equal(plan.boundaryFlags.ownsRouteGeometry, false);
assert.equal(plan.boundaryFlags.ownsSimulation, false);
assert.equal(plan.boundaryFlags.ownsScoring, false);
assert.equal(plan.boundaryFlags.representsLowLevelControl, false);
assert.equal(normalizeSamplingPhase('cruise'), 'both');
assert.equal(segmentFlightPlanDigest(plan), segmentFlightPlanDigest(plan), 'flight plan digest is deterministic');

console.log('smoke_segment_flight_plan: ok', segmentFlightPlanSummary(plan));
