import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function assertExists(relativePath) {
  assert.ok(existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
}

const manifest = readJson('assets/reference_bathymetry/manifest.json');
const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const missionReady = fixtures.find((fixture) => fixture.fixtureId === 'monterey_canyon_15s');
assert.equal(manifest.fixtureStatus, 'AVAILABLE');
assert.equal(missionReady?.role, 'missionReadyPatch');
assert.equal(Number(missionReady?.actualRasterResolutionArcSeconds), 15);

for (const relativePath of [
  'tools/js/smoke_reference_bathymetry_environment_builder.mjs',
  'tools/js/smoke_reference_bathymetry_current_generation.mjs',
  'tools/js/smoke_reference_bathymetry_scalar_hotspot_generation.mjs',
  'tools/js/audit_reference_environment_launch_warning_taxonomy.mjs',
  'tools/js/audit_reference_environment_benchmark_bundle_acceptance.mjs',
  'tools/js/audit_reference_environment_public_safety.mjs',
  'docs/alpha_reference_environment_retest_protocol.md',
  'alpha/reference-environment-retest-feedback-template.json',
  'artifacts/owner-review/env-compose-launch-r1-1/qa-summary.json',
  'artifacts/owner-review/env-compose-launch-r1-1/package-manifest.json'
]) {
  assertExists(relativePath);
}

const feedbackTemplate = readJson('alpha/reference-environment-retest-feedback-template.json');
assert.equal(feedbackTemplate.workflowCompleted, false);
assert.ok(feedbackTemplate.clarity && feedbackTemplate.usability, 'feedback template must include clarity and usability sections');

const ownerSummary = readJson('artifacts/owner-review/env-compose-launch-r1-1/qa-summary.json');
const ownerManifest = readJson('artifacts/owner-review/env-compose-launch-r1-1/package-manifest.json');
assert.match(ownerSummary.status, /^PASS/);
assert.equal(ownerSummary.referenceFixtureId, 'monterey_canyon_15s');
assert.equal(ownerSummary.hiddenTruthExposed, false);
assert.equal(ownerSummary.rawExternalDataPathExposed, false);
assert.equal(ownerSummary.simulationChanged, false);
assert.equal(ownerSummary.scoringChanged, false);
assert.equal(ownerSummary.planningLaunchReady, true);
assert.equal(ownerSummary.blockingWarningCount, 0);
assert.equal(ownerSummary.failureCount, 0);
assert.equal(Array.isArray(ownerSummary.screenshots) ? ownerSummary.screenshots.length : 0, 15);
assert.equal(ownerManifest.status, ownerSummary.status);
assert.equal(ownerManifest.screenshotCount, 15);
assert.equal(ownerManifest.hiddenTruthExposed, false);
assert.equal(ownerManifest.rawExternalDataPathExposed, false);

const artifactText = [
  readText('artifacts/owner-review/env-compose-launch-r1-1/qa-summary.json'),
  readText('artifacts/owner-review/env-compose-launch-r1-1/package-manifest.json')
].join('\n');
assert.ok(!/external_data[\\/]/i.test(artifactText), 'owner artifacts must not expose raw external_data paths');
assert.ok(!/T_hiddenTruth|rawOracleTensor|oracleState/.test(artifactText), 'owner artifacts must not expose hidden truth markers');
assert.ok(!/"hiddenTruth"\s*:\s*(?!false|null)/.test(artifactText), 'owner artifacts must not include hiddenTruth payloads');

const protocol = readText('docs/alpha_reference_environment_retest_protocol.md');
for (const requiredCopy of [
  'not an operational ocean forecast',
  'not certified navigation',
  'Reference bathymetry + deterministic synthetic bathymetry-conditioned fields',
  'Generate 3D Bathymetry',
  'Launch to Planning',
  'Export benchmark bundle'
]) {
  assert.ok(protocol.includes(requiredCopy), `retest protocol must include: ${requiredCopy}`);
}

const ledger = readJson('alpha/feedback-ledger.json');
const item = ledger.items?.find((entry) => entry.feedbackId === 'ALPHA-FB-020');
assert.equal(item?.status, 'READY_FOR_ALPHA_RETEST');
assert.equal(item?.proposedPhase, 'ALPHA-ENV-RETEST-R1');

console.log('audit_alpha_reference_environment_retest_readiness: ok', {
  fixtureId: missionReady.fixtureId,
  fixtureDigest: missionReady.digest,
  ownerPackageStatus: ownerSummary.status,
  launchValidationStatus: ownerSummary.launchValidationStatus,
  benchmarkBundleDigest: ownerSummary.benchmarkBundleDigest,
  screenshotCount: ownerSummary.screenshots.length
});
