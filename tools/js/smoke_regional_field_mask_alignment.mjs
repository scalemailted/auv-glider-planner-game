import assert from 'node:assert/strict';

import { createRegionalContinentalShelfScenario } from '../../src/core/generation/RegionalMissionDefaults.js';
import { sampleSignedTerrainSurfaceAtUv } from '../../src/core/science/SignedTerrainSurfaceModel.js';

const level = createRegionalContinentalShelfScenario({ seed: 'world-r1-1-field-mask-smoke', profile: 'regionalFleet' });
const digest = level.signedTerrainSurface.digest;
assert.equal(level.meta.terrainSourceDigest, digest);
assert.equal(level.regionalFields.sourceDigests.terrainSourceDigest, digest);
assert.equal(level.regionalFields.sourceDigests.landWaterSourceDigest, digest);
assert.equal(level.regionalFields.sourceDigests.coastlineSourceDigest, digest);
assert.equal(level.regionalFields.sourceDigests.bottomBoundarySourceDigest, digest);

const width = level.world.grid.width;
const height = level.world.grid.height;
let checkedLand = 0;
let checkedWater = 0;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const u = width <= 1 ? 0 : x / (width - 1);
    const v = height <= 1 ? 0 : y / (height - 1);
    const terrain = sampleSignedTerrainSurfaceAtUv(level.signedTerrainSurface, u, v);
    assert.equal(Boolean(level.layers.terrain[y][x]), terrain.land, `terrain mask mismatch at ${x},${y}`);
    assert.equal(Number(level.layers.depth[y][x]).toFixed(3), Number(terrain.bottomDepthMeters).toFixed(3), `depth mask mismatch at ${x},${y}`);
    if (terrain.land || !terrain.navigable) {
      assert.equal(level.layers.truth.frames[0].roi[y][x], 0, `land/non-navigable ROI should be masked at ${x},${y}`);
      assert.deepEqual(level.layers.truth.frames[0].current[y][x], [0, 0], `land/non-navigable current should be masked at ${x},${y}`);
      checkedLand += 1;
    } else {
      checkedWater += 1;
    }
  }
}
assert.ok(checkedLand > 0, 'regional terrain should include land/non-navigable samples');
assert.ok(checkedWater > 0, 'regional terrain should include navigable water samples');

console.log('smoke_regional_field_mask_alignment: ok');