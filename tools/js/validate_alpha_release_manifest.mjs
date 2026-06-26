import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalJsonDigest } from '../../packages/codecs/src/index.js';

const manifestPath = process.argv[2] ?? 'alpha/release-manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
const withoutDigest = { ...manifest };
delete withoutDigest.releaseDigest;
const expectedDigest = canonicalJsonDigest(withoutDigest);

assert.equal(manifest.artifactType, 'anchor.alpha-release-manifest');
assert.equal(manifest.artifactVersion, '1.0.0');
assert.equal(manifest.releaseChannel, 'alpha');
assert.equal(manifest.claimBoundary, 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.');
assert.equal(manifest.tagline, 'Plan. Simulate. Compare. Learn.');
assert.equal(manifest.validationBaseline?.id, 'sci-valid-r2a-pre-alpha-baseline');
assert.equal(manifest.validationBaseline?.digest, 'fnv1a32:dd016175');
assert.equal(manifest.classicalPlannerNotebook?.localPythonExecutionVerified, true);
assert.equal(manifest.classicalPlannerNotebook?.localAcceptanceDigest, 'fnv1a32:9a73d341');
assert.equal(manifest.classicalPlannerNotebook?.googleColabHostingSmoke, 'PENDING');
assert.equal(Number(manifest.classicalPlannerNotebook?.checkedInAstarOfficialScore), 23.593559);
assert.equal(manifest.scoring?.profileDigest, 'fnv1a32:1e7b3fe0');
assert.ok(Array.isArray(manifest.curatedScenarios) && manifest.curatedScenarios.length >= 6);
assert.ok(Array.isArray(manifest.knownLimitations) && manifest.knownLimitations.some((item) => /not an operational ocean forecast/i.test(item)));
assert.equal(manifest.releaseDigest, expectedDigest);

console.log(JSON.stringify({
  ok: true,
  manifestPath,
  releaseId: manifest.releaseId,
  releaseVersion: manifest.releaseVersion,
  releaseDigest: manifest.releaseDigest,
  validationBaselineDigest: manifest.validationBaseline.digest,
  googleColabHostingSmoke: manifest.classicalPlannerNotebook.googleColabHostingSmoke
}, null, 2));
