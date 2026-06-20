import { assert, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { validateTerrainAwareRouteSegment } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const agent = mission.agents[0];
const agentPlan = { agentId: agent.id };
const valid = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: { x: 10, y: 10 }, to: { x: 11, y: 10, maximumDiveDepthMeters: 20 } } });
assert.equal(valid.status, 'VALID');
assert.ok(valid.diagnostics.centerlineSampleCount > 2);
assert.ok(valid.diagnostics.adaptiveSubdivisionCount > 0);

const crossing = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: { x: 10, y: 10 }, to: { x: 16, y: 10, maximumDiveDepthMeters: 20 } } });
assert.equal(crossing.status, 'INVALID');
assert.ok(crossing.hardErrors.some((issue) => issue.code === 'SEGMENT_LAND_INTERSECTION'));
assert.ok(crossing.warnings.some((issue) => issue.code === 'SEGMENT_COASTLINE_CROSSING'));

const near = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: { x: 10, y: 10 }, to: { x: 1.2, y: 10, maximumDiveDepthMeters: 20 } } });
assert.equal(near.status, 'VALID_WITH_WARNINGS');
assert.equal(near.hardErrors.length, 0);
console.log('smoke_terrain_aware_segment_validation passed');
