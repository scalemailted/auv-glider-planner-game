import assert from 'node:assert/strict';
import { buildReferenceEnvironment } from './reference_bathymetry_environment_test_helpers.mjs';

const { result } = buildReferenceEnvironment('field-regen-r1-reference-scalar');
const scalarResult = result.scalarResult;
const scalar = scalarResult.scalarArtifact;
const diagnostics = scalarResult.scalarDiagnostics;
const hotspots = scalarResult.hotspotArtifact;
const starts = result.startDropZoneCandidates;
const hazards = result.hazardCandidates;

assert.ok(scalarResult.scalarArtifactDigest.startsWith('fnv1a32:'));
assert.ok(scalarResult.hotspotArtifactDigest.startsWith('fnv1a32:'));
assert.equal(scalar.sourceMetadata.referenceFixtureId, 'monterey_canyon_15s');
assert.equal(scalar.sourceMetadata.sourceType, 'reference-bathymetry-conditioned-synthetic-scalar');
assert.equal(scalar.sourceMetadata.calibratedOceanForecast, false);
assert.equal(scalar.sourceMetadata.calibratedBiogeochemicalForecast, false);
assert.equal(scalar.sourceMetadata.hiddenTruthIncluded, false);

assert.ok(Number.isFinite(Number(diagnostics.scalarStatistics?.mean)), 'scalar mean is finite');
assert.ok(Number(diagnostics.depthMeanRange) > 0, 'scalar field varies across depth');
assert.ok(Number(diagnostics.timeMeanRange) > 0, 'scalar field varies over time');
assert.equal(diagnostics.hiddenTruthIncluded, false);
assert.equal(diagnostics.calibratedOceanForecast, false);
assert.equal(diagnostics.calibratedBiogeochemicalForecast, false);

assert.equal(hotspots.status, 'CURRENT');
assert.ok(hotspots.hotspots.length > 0, 'hotspots generated');
assert.ok(hotspots.hotspots.every((entry) => Number.isFinite(Number(entry.meanScalarValue))), 'hotspots have finite values');
assert.ok(starts.candidateDigest.startsWith('fnv1a32:'));
assert.equal(starts.status, 'NEEDS_VALIDATION');
assert.ok(starts.candidates.length > 0, 'start/drop candidates generated');
assert.ok(starts.candidates.every((entry) => entry.validationStatus === 'NEEDS_VALIDATION'), 'start/drop candidates remain validation-gated');
assert.ok(hazards.hazardDigest.startsWith('fnv1a32:'));
assert.equal(hazards.status, 'CURRENT');
assert.ok(hazards.candidates.length > 0, 'hazard candidates generated');
assert.ok(hazards.candidates.some((entry) => entry.hazardKind === 'steep-slope-risk' || entry.hazardKind === 'shallow-near-land-risk'), 'bathymetry-conditioned hazard kinds exist');

console.log('smoke_reference_bathymetry_scalar_hotspot_generation: ok', {
  scalarArtifactDigest: scalarResult.scalarArtifactDigest,
  hotspotArtifactDigest: scalarResult.hotspotArtifactDigest,
  hotspotCount: hotspots.hotspots.length,
  startDropZoneCount: starts.candidates.length,
  hazardCount: hazards.candidates.length
});
