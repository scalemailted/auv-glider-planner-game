import assert from 'node:assert/strict';
import { buildReferenceEnvironment, publicMetadataText } from './reference_bathymetry_environment_test_helpers.mjs';

const first = buildReferenceEnvironment('field-regen-r1-reference-builder');
const second = buildReferenceEnvironment('field-regen-r1-reference-builder');

const result = first.result;
assert.equal(first.manifest.fixtureStatus, 'AVAILABLE');
assert.equal(first.fixture.fixtureId, 'monterey_canyon_15s');
assert.equal(first.fixture.role, 'missionReadyPatch');
assert.equal(first.fixture.actualRasterResolutionArcSeconds, 15);
assert.equal(first.fixture.columns, 360);
assert.equal(first.fixture.rows, 288);

assert.equal(result.type, 'anchor.reference-bathymetry.environment-builder-result');
assert.equal(result.referenceFixtureId, 'monterey_canyon_15s');
assert.ok(result.digest.startsWith('fnv1a32:'));
assert.ok(result.currentArtifactDigest ?? result.currentResult.currentArtifactDigest);
assert.ok(result.currentResult.currentArtifactDigest.startsWith('fnv1a32:'));
assert.ok(result.scalarResult.scalarArtifactDigest.startsWith('fnv1a32:'));
assert.ok(result.scalarResult.hotspotArtifactDigest.startsWith('fnv1a32:'));
assert.equal(result.currentResult.currentArtifactDigest, second.result.currentResult.currentArtifactDigest, 'same seed keeps current digest stable');
assert.equal(result.scalarResult.scalarArtifactDigest, second.result.scalarResult.scalarArtifactDigest, 'same seed keeps scalar digest stable');
assert.equal(result.hiddenTruthExposed, false);
assert.equal(result.simulationChanged, false);
assert.equal(result.scoringChanged, false);

assert.equal(result.dependencyGraph.nodes.currentArtifact.state, 'CURRENT');
assert.equal(result.dependencyGraph.nodes.scalarArtifact.state, 'CURRENT');
assert.equal(result.dependencyGraph.nodes.hotspots.state, 'CURRENT');
assert.equal(result.dependencyGraph.nodes.hazards.state, 'CURRENT');
assert.equal(result.dependencyGraph.nodes.startsDropZones.state, 'NEEDS_VALIDATION');
assert.equal(result.dependencyGraph.nodes.benchmarkBundle.state, 'REQUIRES_REGENERATION');
assert.ok(['CURRENT', 'REQUIRES_COMPOSITION'].includes(result.dependencyGraph.nodes.environmentArtifact.state));

const metadata = publicMetadataText({
  provenance: result.provenance,
  dependencyGraph: result.dependencyGraph,
  validationReport: result.validationReport,
  fieldPolicy: result.fieldPolicy
});
assert.ok(!/T_hiddenTruth|hiddenTruthExposed"\s*:\s*true|[A-Z]:\\\\|external_data[\\/]/.test(metadata));

console.log('smoke_reference_bathymetry_environment_builder: ok', {
  fixtureId: first.fixture.fixtureId,
  currentArtifactDigest: result.currentResult.currentArtifactDigest,
  scalarArtifactDigest: result.scalarResult.scalarArtifactDigest,
  hotspotArtifactDigest: result.scalarResult.hotspotArtifactDigest,
  environmentArtifactStatus: result.environmentArtifactStatus,
  environmentArtifactDigest: result.environmentArtifactDigest
});
