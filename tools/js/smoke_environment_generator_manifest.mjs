import assert from 'node:assert/strict';
import { createSyntheticEnvironmentManifest, validateSyntheticEnvironmentManifest } from '../../src/core/environment/SyntheticEnvironmentManifest.js';
import { createGeneratedEnvironmentArtifact, generatedEnvironmentArtifactSummary, validateGeneratedEnvironmentArtifact } from '../../src/core/environment/GeneratedEnvironmentArtifact.js';

const base = {
  seed: 'flow-r2a5-1-env-seed',
  grid: { width: 8, height: 6, cellSizeMeters: 100 },
  depthAxisMeters: [0, 10, 35, 75, 150],
  timeAxisSeconds: [0, 200, 400, 600],
  validTimeEndSeconds: 7200
};
const manifestA = createSyntheticEnvironmentManifest(base);
const manifestB = createSyntheticEnvironmentManifest(base);
const manifestC = createSyntheticEnvironmentManifest({ ...base, seed: 'flow-r2a5-1-env-other-seed' });
assert.equal(validateSyntheticEnvironmentManifest(manifestA).valid, true);
assert.equal(manifestA.digest, manifestB.digest, 'same manifest inputs must be reproducible');
assert.notEqual(manifestA.digest, manifestC.digest, 'different seed must produce a distinct manifest digest');
const artifactA = createGeneratedEnvironmentArtifact(manifestA, { level: { world: { grid: base.grid, operationalDomain: { time: { durationSeconds: 7200 } } } } });
const artifactB = createGeneratedEnvironmentArtifact(manifestB, { level: { world: { grid: base.grid, operationalDomain: { time: { durationSeconds: 7200 } } } } });
assert.equal(validateGeneratedEnvironmentArtifact(artifactA).valid, true);
assert.equal(artifactA.digest, artifactB.digest, 'same manifest and backend must produce same artifact digest');
assert.ok(artifactA.currentField4D.timeAxisSeconds.at(-1) >= 7200, 'generated current axis spans manifest valid end');
const summary = generatedEnvironmentArtifactSummary(artifactA);
assert.equal(summary.backendId, 'cpuBathymetryConditionedSyntheticV2');
assert.equal(summary.backendImplemented, true);
assert.equal(summary.synthetic, true);
assert.equal(summary.calibratedForecast, false);
assert.equal(summary.usesRealHycom, false);
assert.equal(summary.usesRealMarineCopernicus, false);
console.log('PASS smoke_environment_generator_manifest');