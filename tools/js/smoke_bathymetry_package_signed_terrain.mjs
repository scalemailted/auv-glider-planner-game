import assert from 'node:assert/strict';
import { createSignedTerrainSurfaceFromBathymetry, sampleSignedTerrainSurfaceAtUv, signedTerrainSurfaceSummary, validateSignedTerrainSurface } from '../../packages/bathymetry/src/index.js';

const surface = createSignedTerrainSurfaceFromBathymetry({ seed: 'signed-smoke', width: 3, height: 2, depthMeters: [[0, 20, 40], [0, 25, 45]], landSeaMask: [['land', 'water', 'water'], ['land', 'water', 'water']] });
const validation = validateSignedTerrainSurface(surface);
const summary = signedTerrainSurfaceSummary(surface);
const wet = sampleSignedTerrainSurfaceAtUv(surface, 1, 0.5);
const land = sampleSignedTerrainSurfaceAtUv(surface, 0, 0.5);
assert.equal(validation.status, 'PASS');
assert.equal(summary.waterCellCount, 4);
assert.equal(summary.landCellCount, 2);
assert.equal(wet.wet, true);
assert.equal(land.land, true);
console.log('smoke_bathymetry_package_signed_terrain: ok');