import assert from 'node:assert/strict';
import {
  hash2D,
  fractalBrownianMotion2D,
  seededFeaturePoints,
  seededHash,
  valueNoise2D
} from '../../src/core/editor/SyntheticAtlasNoise.js';
import {
  OPERATIONAL_WINDOW_PRESETS,
  SYNTHETIC_OCEAN_ATLAS_PRESETS,
  createRegionalMissionRecipe,
  createSyntheticOceanAtlas,
  normalizeOperationalWindow,
  sampleAtlasLayer
} from '../../src/core/editor/SyntheticOceanAtlas.js';

const requiredLayers = [
  'landOceanMask',
  'signedDistanceToCoast',
  'distanceToCoast',
  'continentalShelf',
  'shelfBreak',
  'deepBasin',
  'islandSeamount',
  'canyonPotential',
  'riverMouthInfluence',
  'straitSillInfluence',
  'gulfBayInfluence',
  'openOceanCorridor',
  'dominantCurrentRegime',
  'scalarRegime',
  'missionSuitability'
];

assert.equal(seededHash('atlas-test', 1, 2), seededHash('atlas-test', 1, 2), 'seeded hash is stable');
assert.notEqual(seededHash('atlas-test', 1, 2), seededHash('atlas-test-other', 1, 2), 'seeded hash changes by seed');
assert.equal(hash2D('atlas-test', 4, 9), hash2D('atlas-test', 4, 9), 'hash2D is stable');
assert.ok(valueNoise2D('atlas-test', 1.25, 7.5) >= 0 && valueNoise2D('atlas-test', 1.25, 7.5) <= 1, 'value noise is bounded');
assert.ok(Number.isFinite(fractalBrownianMotion2D('atlas-test', 0.2, 0.9)), 'fBm is finite');
assert.deepEqual(seededFeaturePoints('atlas-test', { count: 4, minDistance: 0.02 }), seededFeaturePoints('atlas-test', { count: 4, minDistance: 0.02 }), 'feature points are stable');

const atlas = createSyntheticOceanAtlas({ presetId: 'syntheticGulfWorld', seed: 'atlas-engine-smoke' });
const repeat = createSyntheticOceanAtlas({ presetId: 'syntheticGulfWorld', seed: 'atlas-engine-smoke' });
const changed = createSyntheticOceanAtlas({ presetId: 'syntheticGulfWorld', seed: 'atlas-engine-smoke-alt' });
assert.equal(atlas.atlasDigest, repeat.atlasDigest, 'same preset/seed gives same atlas digest');
assert.notEqual(atlas.atlasDigest, changed.atlasDigest, 'different seed gives different atlas digest');
assert.equal(atlas.claimBoundary.hiddenTruthExposed, false);
assert.equal(atlas.claimBoundary.operationalForecast, false);

for (const layerName of requiredLayers) {
  const grid = atlas.layers[layerName];
  assert.ok(Array.isArray(grid), `${layerName} exists`);
  assert.equal(grid.length, atlas.resolution.rows, `${layerName} has expected rows`);
  assert.equal(grid[0].length, atlas.resolution.columns, `${layerName} has expected columns`);
  const values = grid.flat().map(Number);
  assert.ok(values.every(Number.isFinite), `${layerName} values are finite`);
  if (!['signedDistanceToCoast', 'dominantCurrentRegime', 'scalarRegime'].includes(layerName)) {
    assert.ok(values.every((value) => value >= 0 && value <= 1), `${layerName} values are bounded 0..1`);
  }
}

const presetChecks = [
  ['syntheticGulfWorld', 'gulfBayInfluence', 0.05],
  ['islandChainWorld', 'islandSeamount', 0.05],
  ['shelfToBasinWorld', 'shelfBreak', 0.05],
  ['openOceanEddyWorld', 'landOceanMask', 0.22, 'max'],
  ['straitSillWorld', 'straitSillInfluence', 0.04],
  ['riverDeltaShelfWorld', 'riverMouthInfluence', 0.03],
  ['mixedRegionalWorld', 'missionSuitability', 0.2]
];

for (const [presetId, layerName, threshold, mode] of presetChecks) {
  const presetAtlas = createSyntheticOceanAtlas({ presetId, seed: `${presetId}:engine-smoke` });
  const summary = presetAtlas.layerSummaries[layerName];
  if (mode === 'max') {
    assert.ok(summary.mean <= threshold, `${presetId} has low ${layerName}`);
  } else {
    assert.ok(summary.max >= threshold || summary.mean >= threshold, `${presetId} has useful ${layerName}`);
  }
  assert.equal(presetAtlas.claimBoundary.realEarthMap, false, `${presetId} is not a real map`);
}

for (const preset of OPERATIONAL_WINDOW_PRESETS) {
  const window = normalizeOperationalWindow({ windowPresetId: preset.id }, atlas);
  assert.ok(window.windowDigest.startsWith('fnv1a32:'), `${preset.id} has digest`);
  assert.ok(window.sampledFieldStats.fieldStatsDigest.startsWith('fnv1a32:'), `${preset.id} has field stats digest`);
  assert.ok(window.currentRegimeHints.length > 0, `${preset.id} has current hints`);
  assert.ok(window.scalarRegimeHints.length > 0, `${preset.id} has scalar hints`);
  assert.ok(window.flowGenerationInputSummary.flowInputSummaryDigest.startsWith('fnv1a32:'), `${preset.id} has flow-input summary digest`);
  assert.ok(Number.isFinite(window.recommendedDomain.widthMeters), `${preset.id} domain width finite`);
  assert.ok(Number.isFinite(window.recommendedGliders), `${preset.id} glider recommendation finite`);
  const recipe = createRegionalMissionRecipe({ atlas, selectedWindow: window, seed: `recipe:${preset.id}` });
  assert.ok(recipe.recipeDigest.startsWith('fnv1a32:'), `${preset.id} recipe digest stable`);
  assert.ok(recipe.datasetTags.regionType, `${preset.id} records dataset tags`);
  assert.ok(recipe.flowGenerationInputs.flowGenerationInputDigest.startsWith('fnv1a32:'), `${preset.id} records flow-generation inputs`);
  assert.equal(recipe.flowGenerationInputs.generatedArtifacts.currentField4D, false, `${preset.id} does not claim currents`);
  assert.equal(recipe.flowGenerationInputs.generatedArtifacts.scalarField4D, false, `${preset.id} does not claim scalars`);
  assert.equal(recipe.flowGenerationInputs.dependencyPlan.currents, 'REQUIRES_REGENERATION');
  assert.equal(recipe.flowGenerationInputs.dependencyPlan.startsDropZones, 'NEEDS_VALIDATION');
  assert.ok(recipe.flowGenerationInputs.depthAxisMeters.length >= 4, `${preset.id} records depth axis`);
  assert.ok(recipe.flowGenerationInputs.timeAxisSeconds.length >= 2, `${preset.id} records compact time axis`);
  assert.ok(recipe.flowGenerationInputs.sourceGridShape.cellCount > 0, `${preset.id} records source grid shape`);
}

assert.ok(Number.isFinite(sampleAtlasLayer(atlas, 'missionSuitability', 0.45, 0.45)), 'bilinear layer sampling is finite');

console.log('smoke_synthetic_ocean_atlas_engine: ok', {
  presetCount: SYNTHETIC_OCEAN_ATLAS_PRESETS.length,
  atlasDigest: atlas.atlasDigest
});
