import assert from 'node:assert/strict';
import {
  SYNTHETIC_WORLD_MAP_TYPE,
  SYNTHETIC_WORLD_STYLES,
  createSyntheticWorldMap
} from '../../src/core/editor/SyntheticWorldMap.js';

const base = createSyntheticWorldMap({
  style: 'earthlikeSyntheticOcean',
  seed: 'env-studio-r2-world-smoke',
  resolution: { columns: 96, rows: 54 }
});
const repeat = createSyntheticWorldMap({
  style: 'earthlikeSyntheticOcean',
  seed: 'env-studio-r2-world-smoke',
  resolution: { columns: 96, rows: 54 }
});
const changed = createSyntheticWorldMap({
  style: 'earthlikeSyntheticOcean',
  seed: 'env-studio-r2-world-smoke-other',
  resolution: { columns: 96, rows: 54 }
});

assert.equal(base.artifactType, SYNTHETIC_WORLD_MAP_TYPE);
assert.equal(base.coordinateFrame, 'normalizedSyntheticWorld');
assert.ok(base.virtualSize.width > base.resolution.columns, 'world has a larger virtual map space than source grid columns');
assert.ok(base.virtualSize.height > base.resolution.rows, 'world has a larger virtual map space than source grid rows');
assert.ok(base.tileSize > 0, 'world records tile size');
assert.ok(base.lodLevels.length >= 2, 'world records LOD levels');
assert.ok(Number.isFinite(base.generatorParameters.waterLevel), 'world records generator parameters');
assert.equal(base.worldDigest, repeat.worldDigest, 'same style/seed/resolution keeps world digest stable');
assert.notEqual(base.worldDigest, changed.worldDigest, 'different seed changes world digest');
assert.equal(base.claimBoundary.realEarthMap, false);
assert.equal(base.claimBoundary.operationalForecast, false);
assert.equal(base.claimBoundary.hiddenTruthExposed, false);
assert.equal(base.provenance.rawNoiseOnly, false);
assert.ok(base.validation.valid, base.validation.errors.join('\n'));

const requiredLayers = [
  'landOceanMask',
  'distanceToCoast',
  'shelfZone',
  'shelfBreakZone',
  'deepBasinPotential',
  'islandSeamountPotential',
  'canyonPotential',
  'riverMouthInfluence',
  'straitSillInfluence',
  'gulfBayInfluence',
  'openOceanCorridor',
  'coarseFlowRegime',
  'scalarRegime',
  'environmentDiversity',
  'suitability'
];

for (const layerName of requiredLayers) {
  const grid = base.layers[layerName];
  assert.equal(grid.length, base.resolution.rows, `${layerName} rows`);
  assert.equal(grid[0].length, base.resolution.columns, `${layerName} columns`);
  const values = grid.flat().map(Number);
  assert.ok(values.every(Number.isFinite), `${layerName} values are finite`);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  assert.ok(minimum >= 0, `${layerName} min is bounded`);
  assert.ok(maximum <= (layerName === 'coarseFlowRegime' || layerName === 'scalarRegime' ? 8 : 1), `${layerName} max is bounded`);
}

for (const style of SYNTHETIC_WORLD_STYLES) {
  const world = createSyntheticWorldMap({
    style: style.id,
    seed: `env-studio-r2-${style.id}`,
    resolution: { columns: 64, rows: 40 }
  });
  assert.equal(world.style, style.id);
  assert.ok(world.worldDigest.startsWith('fnv1a32:'), `${style.id} world digest`);
  assert.ok(world.features.length > 0, `${style.id} has structured features`);
  assert.ok(world.layerSummaries.suitability.mean >= 0, `${style.id} suitability summary`);
  assert.ok(world.layerSummaries.landOceanMask.mean > 0.01, `${style.id} has land context`);
  assert.ok(world.layerSummaries.landOceanMask.mean < 0.95, `${style.id} has ocean context`);
  if (/archipelago|island/i.test(style.id)) {
    assert.ok(world.layerSummaries.islandSeamountPotential.mean > 0.01, `${style.id} has island/seamount potential`);
  }
  if (/earthlike|continental|shelf/i.test(style.id)) {
    assert.ok(world.layerSummaries.distanceToCoast.mean >= 0, `${style.id} has coastline distance field`);
  }
}

const text = JSON.stringify(base);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"realEarthMap"\s*:\s*true/.test(text));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(text));

console.log('smoke_synthetic_world_map_generator: ok', {
  worldDigest: base.worldDigest,
  styleCount: SYNTHETIC_WORLD_STYLES.length,
  layerCount: requiredLayers.length
});
