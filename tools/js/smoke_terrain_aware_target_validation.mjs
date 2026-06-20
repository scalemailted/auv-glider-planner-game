import { assert, buildPlan, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { validateTerrainAwareMissionPlan, validateTerrainAwareSamplingTarget } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const segmentReport = validateTerrainAwareMissionPlan({ level, mission, plan: buildPlan() }).segmentReports;
const valid = validateTerrainAwareSamplingTarget({ level, mission, target: { id: 'target-valid', x: 11, y: 10, depthMeters: 20, attachedSegmentIds: ['agent-segment-1'] }, segmentReports: segmentReport });
assert.notEqual(valid.status, 'INVALID');
assert.equal(valid.centerValidity.valid, true);
assert.equal(valid.reachableByAttachedSegments, true);

const below = validateTerrainAwareSamplingTarget({ level, mission, target: { id: 'target-below', x: 17, y: 17, depthMeters: 90 } });
assert.equal(below.status, 'INVALID');
assert.ok(below.hardErrors.some((issue) => issue.code === 'TARGET_BELOW_SEABED'));

const partial = validateTerrainAwareSamplingTarget({ level, mission, target: { id: 'target-partial', geometryType: 'sphere', x: 17, y: 17, depthMeters: 35, verticalRadius: 25, horizontalRadius: 0.5 } });
assert.equal(partial.status, 'VALID_WITH_WARNINGS');
assert.ok(partial.seabedIntersectionFraction > 0);
assert.ok(partial.warnings.some((issue) => issue.code === 'TARGET_PARTIAL_SEABED_INTERSECTION'));
console.log('smoke_terrain_aware_target_validation passed');
