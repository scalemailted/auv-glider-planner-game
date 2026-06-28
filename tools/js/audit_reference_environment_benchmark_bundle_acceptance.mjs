import assert from 'node:assert/strict';
import { buildReferenceStudioSession, publicMetadataText } from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioReferenceBenchmarkBundle
} from '../../src/core/editor/EnvironmentStudioProject.js';
import {
  validateClassicalPlannerBenchmarkBundle
} from '../../src/core/io/ClassicalPlannerBenchmarkBundleExporter.js';

const seed = 'env-compose-r1-1-benchmark-acceptance';
const { session } = buildReferenceStudioSession(seed);
const first = buildEnvironmentStudioReferenceBenchmarkBundle(session, { seed });
const second = buildEnvironmentStudioReferenceBenchmarkBundle(session, { seed });
const bundle = first.bundle;
const validation = validateClassicalPlannerBenchmarkBundle(bundle);

assert.equal(first.status, 'PASS');
assert.equal(validation.status, 'PASS');
assert.equal(bundle.benchmarkBundleDigest, second.bundle.benchmarkBundleDigest, 'benchmark bundle digest must be stable for the same seed');
assert.equal(bundle.visibilityClass, 'PUBLIC');
assert.equal(bundle.fairnessClass, 'FORECAST_ONLY');
assert.equal(bundle.containsHiddenTruth, false);
assert.equal(bundle.visibilitySafety.containsHiddenTruth, false);
assert.equal(bundle.visibilitySafety.rawExternalDataPathExposed, false);
assert.equal(bundle.visibilitySafety.localAbsolutePathExposed, false);
assert.equal(bundle.fairnessMetadata.hiddenTruthAvailableToPlanner, false);
assert.equal(bundle.fairnessMetadata.scoreProfileId, bundle.scoreProfileId);
assert.ok(bundle.scoreProfileId, 'score profile identity is required');
assert.ok(bundle.referenceEnvironmentDigests.environmentArtifactDigest?.startsWith('fnv1a32:'));
assert.ok(bundle.referenceEnvironmentDigests.currentArtifactDigest?.startsWith('fnv1a32:'));
assert.ok(bundle.referenceEnvironmentDigests.scalarArtifactDigest?.startsWith('fnv1a32:'));
assert.ok(bundle.referenceEnvironmentDigests.hotspotArtifactDigest?.startsWith('fnv1a32:'));
assert.ok(bundle.fieldArtifactStatus.currents === 'CURRENT');
assert.ok(bundle.fieldArtifactStatus.scalarFields === 'CURRENT');
assert.ok(bundle.fieldArtifactStatus.hotspots === 'CURRENT');
assert.ok(bundle.fieldArtifactStatus.startsDropZones === 'CURRENT');
assert.ok(bundle.currents?.fieldDigest?.startsWith('fnv1a32:'));
assert.ok(bundle.scalarFields?.[0]?.fieldDigest?.startsWith('fnv1a32:'));
assert.ok(bundle.missionGeometry?.deploymentZones?.length > 0, 'candidate starts/drop zones must be exported');
assert.ok(Array.isArray(bundle.candidateNodes) && bundle.candidateNodes.length > 0, 'candidate nodes must be exported');
assert.ok(bundle.missionGeometry?.hazards?.fieldDigest?.startsWith('fnv1a32:'), 'hazard field digest is required');
assert.ok(bundle.parityProbes.length >= 8, 'parity probes must be included');

const text = publicMetadataText(bundle);
assert.ok(!/T_hiddenTruth|rawOracleTensor|oracleState/.test(text), 'bundle must not include hidden truth markers');
assert.ok(!/"hiddenTruth"\s*:/.test(text), 'bundle must not include hiddenTruth payload keys');
assert.ok(!/external_data[\\/]/.test(text), 'bundle must not include raw external_data paths');
assert.ok(!/[A-Z]:[\\/]/.test(text), 'bundle must not include local absolute paths');

console.log('audit_reference_environment_benchmark_bundle_acceptance: ok', {
  benchmarkBundleDigest: bundle.benchmarkBundleDigest,
  environmentArtifactDigest: bundle.referenceEnvironmentDigests.environmentArtifactDigest,
  parityProbeCount: bundle.parityProbes.length,
  candidateNodeCount: bundle.candidateNodes.length
});
