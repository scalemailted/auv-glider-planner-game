import { assert, currents } from './current_package_test_helpers.mjs';
import { createGeneratedEnvironmentArtifact, validateGeneratedEnvironmentArtifact } from '../../src/core/environment/GeneratedEnvironmentArtifact.js';
import { currentFieldArtifactAdapterSummary } from '../../src/core/environment/CurrentFieldArtifactAdapter.js';

const artifact = createGeneratedEnvironmentArtifact({
  seed: 'flow-pkg-r1-generator-adapter',
  grid: { width: 6, height: 5, cellSizeMeters: 120 },
  waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' },
  depthAxisMeters: [0, 10, 35, 75, 150],
  timeAxisSeconds: [0, 600, 1200, 1800],
  validTimeEndSeconds: 1800
});
const validation = validateGeneratedEnvironmentArtifact(artifact);
assert.equal(validation.valid, true);
assert.equal(currents.validateCurrentField4D(artifact.currentField4D).valid, true);
assert.equal(artifact.currentFieldSummary.digest, artifact.currentField4D.digest);
const summary = currentFieldArtifactAdapterSummary({ artifact: artifact.currentField4D, summary: artifact.currentFieldSummary, validation: currents.validateCurrentField4D(artifact.currentField4D) });
assert.equal(summary.packageBacked, true);
assert.equal(summary.packageUsesThree, false);
assert.equal(summary.packageTimeUnit, 'seconds');
console.log('smoke_current_package_generator_adapter: ok', { digest: artifact.currentField4D.digest });