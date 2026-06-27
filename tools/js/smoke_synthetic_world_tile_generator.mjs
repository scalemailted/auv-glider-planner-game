import assert from 'node:assert/strict';
import {
  createSyntheticWorldMap,
  createSyntheticWorldTile,
  createSyntheticWorldTileKey,
  createSyntheticWorldViewportState,
  visibleSyntheticWorldTileKeys
} from '../../src/core/editor/SyntheticWorldMap.js';

const world = createSyntheticWorldMap({
  style: 'archipelagoWorld',
  seed: 'env-world-r1-tile-smoke',
  resolution: { columns: 128, rows: 72 },
  generatorParameters: {
    waterLevel: 0.6,
    landmassScale: 0.4,
    islandDensity: 0.82,
    coastlineComplexity: 0.72,
    basinScale: 0.58,
    shelfWidth: 0.44,
    flowIntensity: 0.66,
    roughness: 0.48
  }
});

const key = createSyntheticWorldTileKey({
  worldDigest: world.worldDigest,
  tileX: 2,
  tileY: 1,
  lodLevel: 1,
  layer: 'bathymetryContext'
});
const repeatKey = createSyntheticWorldTileKey({
  worldDigest: world.worldDigest,
  tileX: 2,
  tileY: 1,
  lodLevel: 1,
  layer: 'bathymetryContext'
});
const otherKey = createSyntheticWorldTileKey({
  worldDigest: world.worldDigest,
  tileX: 3,
  tileY: 1,
  lodLevel: 1,
  layer: 'bathymetryContext'
});

assert.equal(key.tileKey, repeatKey.tileKey, 'same tile key is stable');
assert.notEqual(key.tileKey, otherKey.tileKey, 'different tile coordinate changes tile key');

const tile = createSyntheticWorldTile(world, { ...key, gridSize: 16 });
const repeatTile = createSyntheticWorldTile(world, { ...repeatKey, gridSize: 16 });
const otherTile = createSyntheticWorldTile(world, { ...otherKey, gridSize: 16 });

assert.equal(tile.artifactType, 'anchor.synthetic-world-map-tile');
assert.equal(tile.tileDigest, repeatTile.tileDigest, 'same tile regenerates identically');
assert.notEqual(tile.tileDigest, otherTile.tileDigest, 'different tile digest differs');
assert.ok(tile.summary.finite, 'tile samples finite');
assert.ok(tile.bounds.x >= 0 && tile.bounds.x <= 1, 'tile x in range');
assert.ok(tile.bounds.y >= 0 && tile.bounds.y <= 1, 'tile y in range');
assert.ok(tile.bounds.width > 0 && tile.bounds.width <= 1, 'tile width finite');
assert.ok(tile.bounds.height > 0 && tile.bounds.height <= 1, 'tile height finite');
assert.ok(tile.samples.every((row) => row.every((value) => Number.isFinite(Number(value)))), 'all sample values finite');

const viewport = createSyntheticWorldViewportState({
  panX: 0.12,
  panY: -0.08,
  zoom: 2.1,
  canvasWidth: 960,
  canvasHeight: 520
});
const visible = visibleSyntheticWorldTileKeys(world, {
  ...viewport,
  layer: 'coarseFlowRegime'
});

assert.ok(visible.keys.length > 0, 'visible viewport has tiles');
assert.ok(visible.keys.length < 512, 'visible viewport stays browser-friendly');
assert.ok(visible.worldBounds.x >= 0 && visible.worldBounds.y >= 0, 'viewport bounds normalized');
assert.ok(visible.worldBounds.width > 0 && visible.worldBounds.height > 0, 'viewport extent finite');
assert.match(visible.visibleTileDigest, /^fnv1a32:/);

const text = JSON.stringify({ world, tile, visible });
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"realEarthMap"\s*:\s*true/.test(text));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(text));

console.log('smoke_synthetic_world_tile_generator: ok', {
  worldDigest: world.worldDigest,
  tileDigest: tile.tileDigest,
  visibleTiles: visible.keys.length,
  visibleTileDigest: visible.visibleTileDigest
});
