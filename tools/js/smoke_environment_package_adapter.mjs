import assert from 'node:assert/strict';
import { environment } from './environment_package_test_helpers.mjs';
import { createGeneratedEnvironmentArtifact, generatedEnvironmentArtifactSummary, validateGeneratedEnvironmentArtifact } from '../../src/core/environment/GeneratedEnvironmentArtifact.js';

const level = {
  levelId: 'env-pkg-r1-adapter-level',
  world: {
    grid: { width: 6, height: 5, cellSizeMeters: 120 },
    operationalDomain: { time: { durationSeconds: 1800 } }
  },
  meta: { seed: 'env-pkg-r1-adapter' }
};
const artifact = createGeneratedEnvironmentArtifact({
  seed: 'env-pkg-r1-adapter',
  grid: { width: 6, height: 5, cellSizeMeters: 120 },
  waterColumnConfig: { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' },
  depthAxisMeters: [0, 10, 35, 75, 150],
  timeAxisSeconds: [0, 600, 1200, 1800],
  validTimeEndSeconds: 1800
}, { level });
const validation = validateGeneratedEnvironmentArtifact(artifact);
const summary = generatedEnvironmentArtifactSummary(artifact);
assert.equal(validation.valid, true);
assert.equal(artifact.environmentArtifact?.type, 'anchor.environment.artifact');
assert.equal(artifact.environmentArtifactDigest, artifact.environmentArtifact.artifactDigest);
assert.equal(summary.environmentPackageVersion, 'anchor-environment-env-pkg-r1');
assert.equal(summary.environmentArtifactDigest, artifact.environmentArtifactDigest);
assert.equal(summary.environmentValidationStatus === 'PASS' || summary.environmentValidationStatus === 'WARN', true);
assert.equal(summary.packageOwnsGenerationEquations, false);
assert.equal(summary.packageOwnsVisibilityPolicy, false);
assert.equal(summary.packageOwnsObservationNoise, false);
assert.equal(summary.packageOwnsSimulation, false);
assert.equal(summary.packageOwnsScoring, false);
assert.equal(summary.rendererOwnsEnvironmentTruth, false);
assert.equal(summary.calibratedOceanProduct, false);
assert.equal(summary.operationalForecast, false);
assert.equal(summary.certifiedForNavigation, false);
assert.equal(artifact.componentDigests.currentFieldDigests[artifact.currentField4D.id], artifact.currentField4D.digest);
assert.equal(level.environmentArtifactDigest, artifact.environmentArtifactDigest);
assert.equal(level.meta.environmentArtifactDigest, artifact.environmentArtifactDigest);
assert.equal(level.meta.environmentPackageVersion, 'anchor-environment-env-pkg-r1');
assert.equal(environment.environmentArtifactDigest(artifact.environmentArtifact), artifact.environmentArtifactDigest);
console.log('smoke_environment_package_adapter: ok', { environmentArtifactDigest: artifact.environmentArtifactDigest, currentFieldDigest: artifact.currentField4D.digest });