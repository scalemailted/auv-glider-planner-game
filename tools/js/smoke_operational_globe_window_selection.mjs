import assert from 'node:assert/strict';
import {
  OPERATIONAL_GLOBE_WINDOW_TYPE,
  createOperationalGlobeWindow,
  createRegionalMissionRecipeFromGlobeWindow,
  createSyntheticGlobeWorld
} from '../../src/core/editor/SyntheticGlobeWorld.js';

const world = createSyntheticGlobeWorld({
  style: 'earthlikeSyntheticOcean',
  seed: 'globe-window-smoke'
});
const selected = createOperationalGlobeWindow({
  centerLonNormalized: 0.56,
  centerLatNormalized: 0.46,
  widthNormalized: 0.18,
  heightNormalized: 0.16,
  selectedBy: 'smoke'
}, world);
const repeat = createOperationalGlobeWindow({
  centerLonNormalized: 0.56,
  centerLatNormalized: 0.46,
  widthNormalized: 0.18,
  heightNormalized: 0.16,
  selectedBy: 'smoke'
}, world);
const invalid = createOperationalGlobeWindow({
  centerLonNormalized: 0.5,
  centerLatNormalized: 0.5,
  widthNormalized: 0.5,
  heightNormalized: 0.5,
  selectedBy: 'invalid-smoke'
}, world);
const recipe = createRegionalMissionRecipeFromGlobeWindow({
  world,
  selectedWindow: selected,
  seed: 'globe-window-smoke:recipe'
});

const area = selected.bounds.widthNormalized * selected.bounds.heightNormalized;
assert.equal(selected.artifactType, OPERATIONAL_GLOBE_WINDOW_TYPE);
assert.equal(selected.windowDigest, repeat.windowDigest, 'same selected globe window has stable digest');
assert.equal(selected.worldDigest, world.worldDigest);
assert.ok(area > 0);
assert.ok(area < 0.05, 'selected globe window stays small');
assert.equal(selected.validation.valid, true, 'default selected window validates');
assert.equal(invalid.validation.valid, false, 'oversized globe window is rejected');
assert.ok(selected.sampledFieldStats.fieldStatsDigest.startsWith('fnv1a32:'));
assert.ok(Number.isFinite(selected.sampledFieldStats.layerMeans.landOceanMask));
assert.ok(selected.detectedContext.primary, 'context derives from sampled fields');
assert.ok(selected.recommendedDomain.rows > 0 && selected.recommendedDomain.columns > 0, 'selected region has regional recipe dimensions');
assert.ok(recipe.recipeDigest.startsWith('fnv1a32:'), 'selected region can produce regional recipe');
assert.equal(recipe.claimBoundary.hiddenTruthExposed, false);
assert.equal(recipe.flowGenerationInputs.generatedArtifacts.currentField4D, false);
assert.equal(recipe.flowGenerationInputs.generatedArtifacts.scalarField4D, false);

console.log('smoke_operational_globe_window_selection: ok', {
  worldDigest: world.worldDigest,
  windowDigest: selected.windowDigest,
  recipeDigest: recipe.recipeDigest
});
