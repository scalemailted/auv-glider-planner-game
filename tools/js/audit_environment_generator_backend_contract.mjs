import assert from 'node:assert/strict';
import { ENVIRONMENT_GENERATOR_BACKENDS, validateEnvironmentGeneratorBackend } from '../../src/core/environment/EnvironmentGeneratorBackendContract.js';

const implemented = ENVIRONMENT_GENERATOR_BACKENDS.filter((backend) => backend.implemented);
assert.deepEqual(implemented.map((backend) => backend.id), ['cpuBathymetryConditionedSyntheticV2', 'cpuBathymetryConditionedSyntheticV3']);
assert.equal(validateEnvironmentGeneratorBackend('cpuBathymetryConditionedSyntheticV2').valid, true);
assert.equal(validateEnvironmentGeneratorBackend('cpuBathymetryConditionedSyntheticV3').valid, true);
assert.equal(validateEnvironmentGeneratorBackend('webgpuOceanSyntheticV1Reserved').valid, false);
assert.equal(validateEnvironmentGeneratorBackend('importedOperationalFieldReserved').valid, false);
for (const backend of ENVIRONMENT_GENERATOR_BACKENDS) {
  assert.match(backend.claimBoundary, /not calibrated|reserved|not implemented/i);
}
console.log('PASS audit_environment_generator_backend_contract');