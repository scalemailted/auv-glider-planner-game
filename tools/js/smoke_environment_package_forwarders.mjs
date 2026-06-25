import assert from 'node:assert/strict';
import * as environment from '../../packages/environment/src/index.js';
import * as backendForwarder from '../../src/core/environment/EnvironmentGeneratorBackendContract.js';
import * as manifestForwarder from '../../src/core/environment/SyntheticEnvironmentManifest.js';

assert.equal(backendForwarder.ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION, environment.ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION);
assert.deepEqual(
  backendForwarder.normalizeEnvironmentGeneratorBackend('cpuBathymetryConditionedSyntheticV3'),
  environment.normalizeEnvironmentGeneratorBackend('cpuBathymetryConditionedSyntheticV3')
);
assert.deepEqual(
  backendForwarder.validateEnvironmentGeneratorBackend('cpuBathymetryConditionedSyntheticV3'),
  environment.validateEnvironmentGeneratorBackend('cpuBathymetryConditionedSyntheticV3')
);

const options = { seed: 'env-pkg-r1-forwarder', grid: { width: 6, height: 5, cellSizeMeters: 120 }, validTimeEndSeconds: 900 };
const packageManifest = environment.createSyntheticEnvironmentManifest(options);
const forwardedManifest = manifestForwarder.createSyntheticEnvironmentManifest(options);
assert.deepEqual(forwardedManifest, packageManifest);
assert.equal(manifestForwarder.syntheticEnvironmentManifestDigest(forwardedManifest), environment.syntheticEnvironmentManifestDigest(packageManifest));
assert.equal(manifestForwarder.validateSyntheticEnvironmentManifest(forwardedManifest).valid, true);
console.log('smoke_environment_package_forwarders: ok', { digest: forwardedManifest.digest });