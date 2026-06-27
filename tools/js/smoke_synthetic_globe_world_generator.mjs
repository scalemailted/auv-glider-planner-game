import assert from 'node:assert/strict';
import {
  SYNTHETIC_GLOBE_WORLD_TYPE,
  createSyntheticGlobeWorld,
  sampleSyntheticGlobeWorldLayer
} from '../../src/core/editor/SyntheticGlobeWorld.js';

const base = createSyntheticGlobeWorld({
  style: 'archipelagoWorld',
  seed: 'globe-generator-smoke'
});
const repeat = createSyntheticGlobeWorld({
  style: 'archipelagoWorld',
  seed: 'globe-generator-smoke'
});
const changed = createSyntheticGlobeWorld({
  style: 'archipelagoWorld',
  seed: 'globe-generator-smoke-alt'
});
const continental = createSyntheticGlobeWorld({
  style: 'continentalMargins',
  seed: 'globe-generator-smoke'
});

assert.equal(base.artifactType, SYNTHETIC_GLOBE_WORLD_TYPE);
assert.equal(base.worldDigest, repeat.worldDigest, 'same style/seed reproduces the same globe digest');
assert.notEqual(base.worldDigest, changed.worldDigest, 'different seed changes the globe digest');
assert.ok(base.canonicalWorldResolution.width >= 2048, 'canonical width is high resolution');
assert.ok(base.canonicalWorldResolution.height >= 1024, 'canonical height is high resolution');
assert.equal(base.coordinateFrame, 'syntheticSphericalEquirectangular');
assert.equal(base.claimBoundary.hiddenTruthExposed, false);
assert.equal(base.claimBoundary.realEarthMap, false);
assert.equal(base.claimBoundary.operationalForecast, false);
assert.equal(base.provenance.rawNoiseOnly, false);
assert.ok((base.features ?? []).some((feature) => /island|seamount/i.test(feature.type)), 'archipelago style has island/seamount features');
assert.ok((continental.features ?? []).some((feature) => /continent/i.test(feature.type)), 'continental style has continent features');
assert.ok(Number(base.layerSummaries.landOceanMask.mean) > 0, 'land exists');
assert.ok(Number(base.layerSummaries.landOceanMask.mean) < 1, 'ocean exists');

for (const layer of [
  'landOceanMask',
  'distanceToCoast',
  'shelfZone',
  'shelfBreakZone',
  'deepBasinPotential',
  'islandSeamountPotential',
  'coarseFlowRegime',
  'scalarRegime',
  'suitability'
]) {
  const value = sampleSyntheticGlobeWorldLayer(base, layer, 0.41, 0.47);
  assert.ok(Number.isFinite(value), `${layer} sample is finite`);
}

console.log('smoke_synthetic_globe_world_generator: ok', {
  worldDigest: base.worldDigest,
  resolution: base.canonicalWorldResolution,
  displayTextureResolution: base.displayTextureResolution
});
