import assert from 'node:assert/strict';
import { assessDiveProfileFeasibility } from '../../src/core/science/DiveProfileFeasibility.js';

const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'deepDive' };
const short = assessDiveProfileFeasibility({ waterColumnConfig, diveProfileId: 'deepDive', segmentHorizontalDistanceMeters: 240, requestedTargetLayerId: 'deep' });
const long = assessDiveProfileFeasibility({ waterColumnConfig, diveProfileId: 'deepDive', segmentHorizontalDistanceMeters: 1200, requestedTargetLayerId: 'deep' });
assert.ok(long.achievableMaximumDepthMeters >= short.achievableMaximumDepthMeters, 'longer segment permits equal or greater profile depth');
const vehicleLimited = assessDiveProfileFeasibility({ waterColumnConfig, segmentHorizontalDistanceMeters: 2000, vehicleMaxDepthMeters: 40, requestedTargetLayerId: 'deep' });
assert.equal(vehicleLimited.limitingFactor, 'vehicleDepthRating');
assert.ok(vehicleLimited.achievableMaximumDepthMeters <= 40);
const bottomLimited = assessDiveProfileFeasibility({ waterColumnConfig, segmentHorizontalDistanceMeters: 2000, bottomDepthMeters: 80, requiredBottomClearanceMeters: 15, requestedTargetLayerId: 'deep' });
assert.equal(bottomLimited.limitingFactor, 'bottomClearance');
assert.ok(!bottomLimited.reachableLayerIds.includes('deep'));
const durationLimited = assessDiveProfileFeasibility({ waterColumnConfig, segmentHorizontalDistanceMeters: 2000, segmentDurationAvailableSeconds: 120, requestedTargetLayerId: 'deep' });
assert.equal(durationLimited.limitingFactor, 'segmentDuration');
assert.ok(Array.isArray(durationLimited.reachableLayerIds));
assert.equal(durationLimited.usesFull3DPlanning, false);
console.log('smoke_dive_profile_feasibility: PASS');
