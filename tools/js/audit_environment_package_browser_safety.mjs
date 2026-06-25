import assert from 'node:assert/strict';
import { createFixtureEnvironment, environment } from './environment_package_test_helpers.mjs';

const boundary = environment.packageBoundarySummary();
assert.equal(boundary.package, '@anchor/environment');
assert.equal(boundary.version, 'anchor-environment-env-pkg-r1');
for (const forbiddenOwner of ['renderer state', 'player UI', 'mission execution', 'scoring']) {
  assert.equal(boundary.doesNotOwn.includes(forbiddenOwner), true, `${forbiddenOwner} must stay outside @anchor/environment`);
}

const artifact = createFixtureEnvironment();
const summary = environment.environmentArtifactSummary(artifact);
assert.equal(summary.boundaryFlags.packageUsesThree, false);
assert.equal(summary.boundaryFlags.packageUsesPhaser, false);
assert.equal(summary.boundaryFlags.packageUsesDom, false);
assert.equal(summary.boundaryFlags.rendererOwnsEnvironmentTruth, false);
assert.equal(summary.calibratedOceanProduct, false);
assert.equal(summary.operationalForecast, false);
assert.equal(summary.certifiedForNavigation, false);
assert.equal(String(artifact.claimBoundary.warning).includes('Not an operational ocean forecast'), true);
console.log('audit_environment_package_browser_safety: ok', { digest: summary.artifactDigest });