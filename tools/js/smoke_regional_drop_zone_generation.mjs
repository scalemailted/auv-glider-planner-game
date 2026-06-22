import assert from 'node:assert/strict';

import { createRegionalMissionBundle } from '../../src/core/generation/RegionalMissionDefaults.js';
import { sampleSignedTerrainSurfaceAtUv } from '../../src/core/science/SignedTerrainSurfaceModel.js';

const first = createRegionalMissionBundle({ seed: 'world-r1-1-drop-zone-smoke', agentCount: 3 });
const second = createRegionalMissionBundle({ seed: 'world-r1-1-drop-zone-smoke', agentCount: 3 });
assert.deepEqual(first.level.zones, second.level.zones, 'regional drop zones must be deterministic by seed');
assert.ok(first.level.zones.length >= 2, 'regional fixture should expose separated deployment areas');

for (const zone of first.level.zones) {
  assert.equal(zone.terrainSourceDigest, first.level.signedTerrainSurface.digest);
  assert.ok(zone.cells.length > 0, `${zone.id} should contain deployment cells`);
  for (const cell of zone.cells) {
    const u = first.level.world.grid.width <= 1 ? 0 : cell.x / (first.level.world.grid.width - 1);
    const v = first.level.world.grid.height <= 1 ? 0 : cell.y / (first.level.world.grid.height - 1);
    const sample = sampleSignedTerrainSurfaceAtUv(first.level.signedTerrainSurface, u, v);
    assert.equal(sample.navigable, true, `${zone.id} cell ${cell.x},${cell.y} must be navigable water`);
    assert.ok(sample.bottomDepthMeters >= 12, `${zone.id} cell ${cell.x},${cell.y} should clear the minimum drop-zone depth`);
    assert.equal(first.level.layers.terrain[cell.y]?.[cell.x], 0, `${zone.id} must not overlap land terrain`);
  }
}
const centers = first.level.zones.map((zone) => average(zone.cells));
assert.ok(Math.abs(centers[0].y - centers[1].y) >= 6, 'deployment areas should be separated along the regional coast');

console.log('smoke_regional_drop_zone_generation: ok');

function average(cells) {
  return {
    x: cells.reduce((sum, cell) => sum + cell.x, 0) / Math.max(1, cells.length),
    y: cells.reduce((sum, cell) => sum + cell.y, 0) / Math.max(1, cells.length)
  };
}