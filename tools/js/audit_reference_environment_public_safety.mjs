import assert from 'node:assert/strict';
import { buildReferenceStudioSession, publicMetadataText } from './reference_bathymetry_environment_test_helpers.mjs';
import {
  buildEnvironmentStudioProject,
  buildEnvironmentStudioReferenceBenchmarkBundle,
  buildEnvironmentStudioReferencePlanningLaunch,
  validateEnvironmentStudioReferenceLaunch
} from '../../src/core/editor/EnvironmentStudioProject.js';

const { session } = buildReferenceStudioSession('env-compose-r1-public-safety');
const validated = validateEnvironmentStudioReferenceLaunch(session, { seed: 'env-compose-r1-public-safety' });
const launch = buildEnvironmentStudioReferencePlanningLaunch(validated, { seed: 'env-compose-r1-public-safety' });
const benchmark = buildEnvironmentStudioReferenceBenchmarkBundle(validated, { seed: 'env-compose-r1-public-safety' });
const project = buildEnvironmentStudioProject(benchmark.session);

const payloads = {
  project,
  launch: {
    level: launch.level,
    mission: launch.mission,
    launchMetadata: launch.launchMetadata
  },
  benchmarkBundle: benchmark.bundle
};
const text = publicMetadataText(payloads);

assert.equal(project.provenance.hiddenTruthExposed, false);
assert.equal(project.provenance.operationalForecast, false);
assert.equal(project.provenance.certifiedForNavigation, false);
assert.equal(launch.launchMetadata.hiddenTruthExposed, false);
assert.equal(launch.launchMetadata.simulationChanged, false);
assert.equal(launch.launchMetadata.scoringChanged, false);
assert.equal(benchmark.bundle.containsHiddenTruth, false);
assert.equal(benchmark.bundle.sourceMetadata.sourceContainsHiddenTruth, false);
assert.equal(benchmark.bundle.sourceMetadata.calibrated, false);
assert.equal(benchmark.bundle.sourceMetadata.synthetic, true);
assert.ok(!/T_hiddenTruth|rawOracleTensor|oracleState/.test(text), 'public artifacts must not include hidden-truth markers');
assert.ok(!/"hiddenTruth"\s*:\s*(?!false|null)/.test(text), 'public artifacts must not include hiddenTruth payload keys');
assert.ok(!/external_data[\\/]|[A-Z]:\\\\/.test(text), 'public artifacts must not include local raw paths');
assert.ok(!/"usesRealHycom"\s*:\s*true|"usesRealMarineCopernicus"\s*:\s*true|"operationalForecast"\s*:\s*true|"calibratedOceanProduct"\s*:\s*true/.test(text), 'public artifacts must not claim operational products');

console.log('audit_reference_environment_public_safety: ok', {
  environmentArtifactDigest: project.fieldRegenerationResult.environmentArtifactDigest,
  launchValidationDigest: project.launchValidationResult.launchValidationDigest,
  benchmarkBundleDigest: project.benchmarkBundleResult.benchmarkBundleDigest
});
