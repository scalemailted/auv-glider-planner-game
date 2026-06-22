import assert from 'node:assert/strict';

import {
  createSignedTerrainSurface,
  createSignedTerrainSurfaceFromBathymetry,
  sampleSignedTerrainSurface,
  sampleSignedTerrainSurfaceAtUv,
  signedTerrainSurfaceSummary,
  validateSignedTerrainSurface
} from '../../src/core/science/SignedTerrainSurfaceModel.js';

const elevationMeters = [
  [3, 2, -4, -12],
  [2, -2, -9, -20],
  [1, -8, -18, -35]
];
const surface = createSignedTerrainSurface({ elevationMeters, seaLevelMeters: 0, minimumNavigableDepthMeters: 8, sourceMetadata: { sourceId: 'signed-terrain-smoke' } });
const validation = validateSignedTerrainSurface(surface);
assert.equal(validation.valid, true);
assert.equal(surface.landMask[0][0], true);
assert.equal(surface.wetMask[0][2], true);
assert.equal(surface.bottomDepthMeters[0][2], 4);
assert.equal(surface.navigableWaterMask[0][2], false);
assert.equal(surface.navigableWaterMask[0][3], true);
assert.ok(surface.coastline.length > 0, 'coastline should be derived from the land/water threshold');
assert.equal(surface.terrainSourceDigest, surface.landWaterSourceDigest);
assert.equal(surface.terrainSourceDigest, surface.coastlineSourceDigest);
assert.equal(surface.terrainSourceDigest, surface.bottomBoundarySourceDigest);

const midpoint = sampleSignedTerrainSurface(surface, 1.5, 1.5);
assert.ok(Number.isFinite(midpoint.elevationMeters));
assert.ok(Number.isFinite(midpoint.bottomDepthMeters));
const uvSample = sampleSignedTerrainSurfaceAtUv(surface, 1, 1);
assert.equal(uvSample.navigable, true);

const duplicate = createSignedTerrainSurface({ elevationMeters, seaLevelMeters: 0, minimumNavigableDepthMeters: 8, sourceMetadata: { sourceId: 'signed-terrain-smoke' } });
assert.equal(duplicate.digest, surface.digest, 'signed terrain digest must be deterministic');

const fromBathymetry = createSignedTerrainSurfaceFromBathymetry({ width: 3, height: 2, depthMeters: [[0, 6, 24], [0, 14, 40]], seed: 'bathymetry-smoke' }, { minimumNavigableDepthMeters: 10 });
assert.equal(fromBathymetry.landMask[0][0], true);
assert.equal(fromBathymetry.navigableWaterMask[0][1], false);
assert.equal(fromBathymetry.navigableWaterMask[0][2], true);
assert.equal(signedTerrainSurfaceSummary(fromBathymetry).usesSignedTerrainAuthority, true);
assert.equal(signedTerrainSurfaceSummary(fromBathymetry).usesPerCellLandMeshes, false);

console.log('smoke_signed_terrain_surface_authority: ok');