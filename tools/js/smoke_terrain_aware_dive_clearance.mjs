import { assert, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { TERRAIN_AWARE_ISSUE_CODES, validateTerrainAwareRouteSegment, validateTerrainAwareSamplingTarget } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const context = { level, mission, agent: mission.agents[0], agentPlan: { agentId: 'glider-1' } };
const clear = validateTerrainAwareRouteSegment({ ...context, segment: { from: { x: 10, y: 10 }, to: { x: 11, y: 10, maximumDiveDepthMeters: 20 } } });
assert.ok(clear.diagnostics.predictedDiveClearance.minimumPredictedClearanceMeters > 0);
assert.ok(clear.diagnostics.predictedDiveClearance.bottomTurnClearanceMeters > 0);

const limited = validateTerrainAwareRouteSegment({ ...context, segment: { from: { x: 16, y: 16 }, to: { x: 17, y: 16, maximumDiveDepthMeters: 100 } } });
assert.ok(limited.warnings.some((issue) => issue.code === 'BATHYMETRY_LIMITED_PROFILE'));
assert.ok(limited.warnings.some((issue) => issue.code === 'LOW_BOTTOM_CLEARANCE'));
assert.equal(limited.diagnostics.predictedDiveClearance.seabedPenetrationCount, 0);
assert.ok(TERRAIN_AWARE_ISSUE_CODES.includes('BOTTOM_CLEARANCE_VIOLATION'));
const belowTarget = validateTerrainAwareSamplingTarget({ level, mission, target: { id: 'hard-depth', x: 17, y: 17, depthMeters: 90 } });
assert.equal(belowTarget.status, 'INVALID');
console.log('smoke_terrain_aware_dive_clearance passed');
