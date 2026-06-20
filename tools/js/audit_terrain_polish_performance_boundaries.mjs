import { readFileSync } from 'node:fs';
import { assert } from './terrain_validation_smoke_fixture.mjs';

const renderer = readFileSync(new URL('../../src/game/three/ThreeMissionWorldRenderer.js', import.meta.url), 'utf8');
assert.ok(renderer.includes('terrainValidationGroup'));
assert.ok(renderer.includes('updateThreeTerrainValidationLayer'));
assert.equal(renderer.includes('requestAnimationFrame('), false, 'Renderer module should not introduce an independent RAF loop for validation overlays.');
const layer = readFileSync(new URL('../../src/game/three/layers/ThreeTerrainValidationLayer.js', import.meta.url), 'utf8');
assert.ok(layer.includes('existing.get'));
assert.ok(layer.includes('disposeObject'));
assert.ok(layer.includes('missionObjectType'));
console.log('audit_terrain_polish_performance_boundaries passed');
