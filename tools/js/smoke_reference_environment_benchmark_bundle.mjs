import assert from 'node:assert/strict';
import { buildReferenceStudioSession, publicMetadataText } from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioProject,
  buildEnvironmentStudioReferenceBenchmarkBundle
} from '../../src/core/editor/EnvironmentStudioProject.js';
import {
  sampleClassicalPlannerBenchmarkBundle,
  validateClassicalPlannerBenchmarkBundle
} from '../../src/core/io/ClassicalPlannerBenchmarkBundleExporter.js';

const { session } = buildReferenceStudioSession('env-compose-r1-benchmark-bundle');
const result = buildEnvironmentStudioReferenceBenchmarkBundle(session, { seed: 'env-compose-r1-benchmark-bundle' });
const bundle = result.bundle;
const project = buildEnvironmentStudioProject(result.session);
const validation = validateClassicalPlannerBenchmarkBundle(bundle);

assert.equal(result.status, 'PASS');
assert.equal(validation.status, 'PASS');
assert.equal(bundle.containsHiddenTruth, false);
assert.equal(bundle.visibilityClass, 'PUBLIC');
assert.equal(bundle.fairnessClass, 'FORECAST_ONLY');
assert.equal(bundle.sourceMetadata.referenceBathymetryPatch, true);
assert.equal(bundle.sourceMetadata.synthetic, true);
assert.equal(bundle.sourceMetadata.calibrated, false);
assert.ok(bundle.environmentDigest.startsWith('fnv1a32:'));
assert.ok(bundle.benchmarkBundleDigest.startsWith('fnv1a32:'));
assert.ok(bundle.currents.fieldDigest.startsWith('fnv1a32:'));
assert.ok(bundle.scalarFields[0].fieldDigest.startsWith('fnv1a32:'));
assert.equal(bundle.currents.depthStructure, 'packageBackedDepthSpecificCurrentField4D');
assert.equal(bundle.scalarFields[0].depthClassification, 'packageBackedDepthSpecificScalarField4D');
assert.ok(bundle.parityProbes.length >= 8);
assert.equal(project.benchmarkBundleResult.status, 'CURRENT');
assert.equal(project.benchmarkBundleResult.benchmarkBundleDigest, bundle.benchmarkBundleDigest);
assert.equal(project.dependencyGraph.nodes.benchmarkBundle.state, 'CURRENT');

const probe = sampleClassicalPlannerBenchmarkBundle(bundle, bundle.parityProbes[0]);
assert.equal(Number.isFinite(probe.current.uEastMetersPerSecond), true);
assert.equal(Object.values(probe.scalars).every(Number.isFinite), true);

const publicText = publicMetadataText(bundle);
assert.ok(!/T_hiddenTruth|rawOracleTensor|oracleState|external_data[\\/]|[A-Z]:\\\\/.test(publicText), 'benchmark bundle must be public-safe');
assert.ok(!/"hiddenTruth"\s*:/.test(publicText), 'benchmark bundle must not include hidden-truth payload keys');

console.log('smoke_reference_environment_benchmark_bundle: ok', {
  benchmarkBundleDigest: bundle.benchmarkBundleDigest,
  parityProbes: bundle.parityProbes.length,
  scalarFieldDigest: bundle.scalarFields[0].fieldDigest
});
