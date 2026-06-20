import { assert, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { validateTerrainAwareRouteSegment } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const report = validateTerrainAwareRouteSegment({ level, mission, agent: mission.agents[0], agentPlan: { agentId: 'glider-1' }, segment: { from: { x: 10, y: 10 }, to: { x: 1.2, y: 10, maximumDiveDepthMeters: 20 } } });
const corridor = report.corridorDiagnostic;
assert.equal(corridor.supported, true);
assert.ok(Number.isFinite(corridor.nominalHalfWidth));
assert.ok(Number.isFinite(corridor.predictedHalfWidth));
assert.ok(Number.isFinite(corridor.minimumCoastlineDistance));
assert.ok(report.warnings.some((issue) => issue.code === 'ROUTE_CORRIDOR_SHORELINE_RISK'));
assert.equal(report.diagnostics.currentRisk.supported, true);
assert.equal(report.type, 'anchor.validation.terrain-aware-route-segment');
console.log('smoke_terrain_aware_route_corridor passed');
