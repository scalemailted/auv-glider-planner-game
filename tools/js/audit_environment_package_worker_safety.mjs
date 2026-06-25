import assert from 'node:assert/strict';
import { createFixtureEnvironment, environment } from './environment_package_test_helpers.mjs';

const artifact = createFixtureEnvironment();
const summary = environment.environmentArtifactSummary(artifact);
const clonedArtifact = structuredClone(artifact);
const clonedSummary = structuredClone(summary);
const sample = environment.sampleEnvironment(clonedArtifact, 5, 5, 50, 50);
assert.equal(clonedArtifact.artifactDigest, artifact.artifactDigest);
assert.equal(clonedSummary.artifactDigest, summary.artifactDigest);
assert.equal(Number.isFinite(sample.current.uEastMetersPerSecond), true);
assert.equal(Number.isFinite(Object.values(sample.scalars)[0].value), true);
assert.equal(JSON.stringify({ clonedArtifact, clonedSummary }).includes('function'), false);
console.log('audit_environment_package_worker_safety: ok', { digest: artifact.artifactDigest, sampleCurrentU: sample.current.uEastMetersPerSecond });