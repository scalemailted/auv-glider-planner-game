import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { artifactKindByType, canonicalJsonDigest } from '../../packages/codecs/src/index.js';

const files = [
  'alpha/release-manifest.json',
  'alpha/scenario-catalog.json',
  'schemas/alpha-release-manifest.schema.json',
  'schemas/alpha-diagnostic-bundle.schema.json',
  'docs/alpha_release.md',
  'tests/e2e/alpha_r1_external_preview.spec.js'
];

for (const file of files) assert.ok(existsSync(file), `${file} exists`);

const manifest = readJson('alpha/release-manifest.json');
const catalog = readJson('alpha/scenario-catalog.json');
const releaseWithoutDigest = { ...manifest };
delete releaseWithoutDigest.releaseDigest;

assert.equal(manifest.releaseDigest, canonicalJsonDigest(releaseWithoutDigest), 'release digest matches canonical manifest without digest');
assert.equal(manifest.validationBaseline.digest, 'fnv1a32:dd016175', 'validation baseline digest');
assert.equal(manifest.classicalPlannerNotebook.localAcceptanceDigest, 'fnv1a32:9a73d341', 'notebook local acceptance digest');
assert.equal(manifest.classicalPlannerNotebook.googleColabHostingSmoke, 'PENDING', 'Colab hosting smoke remains pending');
assert.equal(catalog.entries.length, 6, 'scenario catalog entry count');
assert.ok(catalog.entries.some((entry) => entry.scenarioId === 'alpha-research-benchmark' && entry.supportsNotebookRoundTrip === true), 'research benchmark catalog entry');
assert.ok(artifactKindByType('anchor.alpha-release-manifest').some((entry) => entry.kind === 'alphaReleaseManifest'), 'release manifest registered');
assert.ok(artifactKindByType('anchor.alpha-diagnostic-bundle').some((entry) => entry.kind === 'alphaDiagnosticBundle'), 'diagnostic bundle registered');

const source = readFileSync('src/core/alpha/AlphaRelease.js', 'utf8');
assert.ok(source.includes('hiddenTruthIncluded: false'), 'diagnostic bundle marks hidden truth excluded');
assert.ok(source.includes('automaticallyTransmitted: false'), 'diagnostics are not transmitted automatically');
assert.ok(source.includes('googleColabHostingSmoke'), 'Colab status is represented separately');

console.log(JSON.stringify({
  ok: true,
  releaseDigest: manifest.releaseDigest,
  scenarioCount: catalog.entries.length,
  validationBaselineDigest: manifest.validationBaseline.digest,
  localAcceptanceDigest: manifest.classicalPlannerNotebook.localAcceptanceDigest,
  googleColabHostingSmoke: manifest.classicalPlannerNotebook.googleColabHostingSmoke
}, null, 2));

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}
