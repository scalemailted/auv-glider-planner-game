import { assert, createTerrainValidationFixture } from './terrain_validation_smoke_fixture.mjs';
import { validateTerrainAwareSurfaceWaypoint } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const { level, mission } = createTerrainValidationFixture();
const water = validateTerrainAwareSurfaceWaypoint({ level, mission, position: { x: 10.25, y: 10.75 } });
assert.equal(water.accepted, true);
assert.equal(water.position.x, 10.25);
assert.equal(water.position.y, 10.75);

const land = validateTerrainAwareSurfaceWaypoint({ level, mission, position: { x: 15, y: 10 } });
assert.equal(land.accepted, false);
assert.ok(land.hardErrors.some((issue) => issue.code === 'LAND_SURFACE_WAYPOINT'));

const outside = validateTerrainAwareSurfaceWaypoint({ level, mission, position: { x: -0.5, y: 10 } });
assert.equal(outside.accepted, false);
assert.ok(outside.hardErrors.some((issue) => issue.code === 'OUTSIDE_DOMAIN'));

const nearShore = validateTerrainAwareSurfaceWaypoint({ level, mission, position: { x: 1.2, y: 10 } });
assert.equal(nearShore.accepted, true);
assert.ok(nearShore.warnings.some((issue) => issue.code === 'ROUTE_CORRIDOR_SHORELINE_RISK'));
console.log('smoke_terrain_aware_surface_waypoint_validation passed');
