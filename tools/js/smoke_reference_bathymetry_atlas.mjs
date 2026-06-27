import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  NO_REFERENCE_DATA_FIXTURE,
  REFERENCE_BATHYMETRY_ATLAS_TYPE,
  createReferenceBathymetryAtlas,
  referenceBathymetryLayerColor,
  referenceBathymetryVisualMetrics,
  sampleReferenceBathymetryElevation
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';

const atlas = createReferenceBathymetryAtlas();

assert.equal(atlas.artifactType, REFERENCE_BATHYMETRY_ATLAS_TYPE);
assert.ok(atlas.atlasDigest.startsWith('fnv1a32:'));
assert.ok(atlas.previewRasterDigest.startsWith('fnv1a32:'));
assert.equal(atlas.sourceDataset.name, NO_REFERENCE_DATA_FIXTURE);
assert.equal(atlas.sourceDataset.referenceDataAvailable, false);
assert.equal(atlas.provenance.fixtureStatus, NO_REFERENCE_DATA_FIXTURE);
assert.equal(atlas.claimBoundary.publicBathymetryTopographyReferenceData, false);
assert.equal(atlas.claimBoundary.certifiedForNavigation, false);
assert.equal(atlas.claimBoundary.operationalOceanForecast, false);
assert.equal(atlas.claimBoundary.hiddenTruthExposed, false);

const samples = [
  sampleReferenceBathymetryElevation(atlas, -123.1, 36.5),
  sampleReferenceBathymetryElevation(atlas, -80, 25),
  sampleReferenceBathymetryElevation(atlas, 142, 38),
  sampleReferenceBathymetryElevation(atlas, 5, 52)
];
assert.ok(samples.every(Number.isFinite), 'reference atlas samples finite signed elevations');
assert.ok(samples.some((value) => value < 0), 'placeholder atlas includes ocean-like negative elevations');

for (const layer of ['topographyBathymetry', 'landOcean', 'slope', 'sourceQuality']) {
  const color = referenceBathymetryLayerColor(atlas, layer, -123.1, 36.5);
  assert.equal(color.length, 4, `${layer} returns RGBA`);
  assert.ok(color.every((value) => Number.isInteger(value) && value >= 0 && value <= 255), `${layer} color bytes valid`);
}

const metrics = referenceBathymetryVisualMetrics(atlas);
assert.equal(metrics.defaultSourceMode, 'referenceBathymetryAtlas');
assert.equal(metrics.proceduralSandboxDefault, false);
assert.equal(metrics.referenceDatasetName, NO_REFERENCE_DATA_FIXTURE);
assert.equal(metrics.hiddenTruthExposed, false);
assert.equal(metrics.simulationChanged, false);
assert.equal(metrics.scoringChanged, false);

const text = canonicalJsonStringify(atlas);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"certifiedForNavigation"\s*:\s*true/.test(text));
assert.ok(!/"operationalOceanForecast"\s*:\s*true/.test(text));
assert.ok(!/"GEBCO"/.test(text), 'placeholder atlas does not claim GEBCO data');
assert.ok(!/"ETOPO"/.test(text), 'placeholder atlas does not claim ETOPO data');

console.log('smoke_reference_bathymetry_atlas: ok', {
  atlasDigest: atlas.atlasDigest,
  fixtureStatus: atlas.provenance.fixtureStatus,
  sampleCount: samples.length
});
