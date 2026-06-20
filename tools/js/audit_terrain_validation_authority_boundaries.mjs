import { readFileSync } from 'node:fs';
import { assert } from './terrain_validation_smoke_fixture.mjs';

const terrainSource = readFileSync(new URL('../../src/core/planning/TerrainAwareMissionValidation.js', import.meta.url), 'utf8');
assert.equal(/from ['"]three['"]|Phaser|document|localStorage|new Planner|optimi[sz]er/i.test(terrainSource), false);
assert.equal(terrainSource.includes('containsHiddenTruth: true'), false);
assert.ok(terrainSource.includes('containsHiddenTruth: false'));
assert.ok(terrainSource.includes('usesMeshRaycastForValidity: false'));
assert.ok(terrainSource.includes('changesOfficialScoring: false'));

const rendererSource = readFileSync(new URL('../../src/game/three/layers/ThreeTerrainValidationLayer.js', import.meta.url), 'utf8');
assert.ok(rendererSource.includes('rendererOwnsValidation: false'));
assert.ok(rendererSource.includes('usesMeshRaycastForValidity: false'));
assert.equal(rendererSource.includes('addWaypoint('), false);
assert.equal(rendererSource.includes('updateWaypoint('), false);
assert.equal(rendererSource.includes('SimulationEngine'), false);
assert.equal(rendererSource.includes('score'), false);
console.log('audit_terrain_validation_authority_boundaries passed');
