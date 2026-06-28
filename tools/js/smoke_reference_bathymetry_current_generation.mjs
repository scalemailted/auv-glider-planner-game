import assert from 'node:assert/strict';
import { buildReferenceEnvironment } from './reference_bathymetry_environment_test_helpers.mjs';

const base = buildReferenceEnvironment('field-regen-r1-reference-current');
const repeated = buildReferenceEnvironment('field-regen-r1-reference-current');
const changed = buildReferenceEnvironment('field-regen-r1-reference-current-other-seed');

const currentResult = base.result.currentResult;
const diagnostics = currentResult.currentDiagnostics;
const field = currentResult.currentArtifact;

assert.equal(currentResult.currentArtifactDigest, repeated.result.currentResult.currentArtifactDigest, 'same seed current digest is stable');
assert.notEqual(currentResult.currentArtifactDigest, changed.result.currentResult.currentArtifactDigest, 'different seed changes current digest');
assert.equal(field.sourceMetadata.referenceFixtureId, 'monterey_canyon_15s');
assert.equal(field.sourceMetadata.sourceType, 'reference-bathymetry-conditioned-synthetic-current');
assert.equal(field.sourceMetadata.usesRealHycom, false);
assert.equal(field.sourceMetadata.usesRealMarineCopernicus, false);
assert.equal(field.sourceMetadata.calibratedForecast, false);
assert.notEqual(field.sourceMetadata.hiddenTruthIncluded, true);

assert.equal(diagnostics.landVectorCount, 0, 'land vectors are zero');
assert.equal(diagnostics.belowBottomVectorCount, 0, 'below-bottom vectors are zero');
assert.ok(Number.isFinite(Number(diagnostics.speedMean)), 'speed mean is finite');
assert.ok(Number.isFinite(Number(diagnostics.speedMaximum)), 'speed max is finite');
assert.ok(Number(diagnostics.speedMaximum) > 0, 'current field is nonzero');
assert.ok(Number(diagnostics.speedMaximum) <= 1.2, 'current speed remains bounded for browser benchmarks');
assert.ok(Number(diagnostics.temporalChangeRms) > 0, 'current field varies over time');
assert.ok(Number(diagnostics.surfaceToDeepVectorDifferenceRms) > 0, 'current field varies across depth');
assert.ok(Number(diagnostics.verticalShearRms) > 0, 'vertical shear is present');
assert.ok(field.depthAxisMeters.length >= 3, 'depth axis has multiple operational layers');
assert.ok(field.timeAxisSeconds.length >= 2, 'time axis has multiple samples');

console.log('smoke_reference_bathymetry_current_generation: ok', {
  currentArtifactDigest: currentResult.currentArtifactDigest,
  speedMean: diagnostics.speedMean,
  speedMaximum: diagnostics.speedMaximum,
  temporalChangeRms: diagnostics.temporalChangeRms,
  surfaceToDeepVectorDifferenceRms: diagnostics.surfaceToDeepVectorDifferenceRms
});
