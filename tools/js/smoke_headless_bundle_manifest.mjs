import assert from 'node:assert/strict';
import {
  HEADLESS_BUNDLE_FILE_ROLES,
  createHeadlessBundleFileEntry,
  createHeadlessBundleManifest,
  headlessBundleManifestSummary,
  validateHeadlessBundleManifest
} from '../../src/core/headless/HeadlessBundleManifest.js';

for (const role of ['manifest', 'missionConfig', 'visibleFields', 'hiddenFields', 'observations', 'benchmarkRecords', 'notebookConfig']) {
  assert.ok(HEADLESS_BUNDLE_FILE_ROLES.includes(role), `${role} bundle role exists`);
}
const manifest = createHeadlessBundleManifest({
  scenarioId: 'scenario-1',
  missionId: 'mission-1',
  episodeId: 'episode-1',
  files: [
    createHeadlessBundleFileEntry({ path: 'manifest.json', role: 'manifest', schemaType: 'anchor.headless.manifest' }),
    createHeadlessBundleFileEntry({ path: 'mission.json', role: 'missionConfig', schemaType: 'anchor.headless.mission-config' }),
    createHeadlessBundleFileEntry({ path: 'fields/visible.json', role: 'visibleFields', schemaType: 'anchor.headless.field-pack', visibilityTier: 'publicScenario' }),
    createHeadlessBundleFileEntry({ path: 'fields/hidden.json', role: 'hiddenFields', schemaType: 'anchor.headless.field-pack', visibilityTier: 'hiddenTruth' }),
    createHeadlessBundleFileEntry({ path: 'tables/observations.csv', role: 'observations', mediaType: 'text/csv' }),
    createHeadlessBundleFileEntry({ path: 'benchmark/run.json', role: 'benchmarkRecords', schemaType: 'anchor.headless.benchmark-episode' })
  ]
});
assert.equal(manifest.type, 'anchor.headless.manifest');
assert.equal(validateHeadlessBundleManifest(manifest).valid, true, 'manifest validates');
assert.equal(manifest.files.find((entry) => entry.role === 'hiddenFields').visibilityTier, 'hiddenTruth', 'hidden file preserves visibility tier');
const invalid = validateHeadlessBundleManifest({ files: [] });
assert.equal(invalid.valid, false, 'validation catches missing type');
const summary = headlessBundleManifestSummary(manifest);
assert.ok(summary.roles.includes('observations'), 'summary includes observations role');
assert.ok(summary.hiddenFileCount >= 1, 'summary counts hidden fields');
console.log('smoke_headless_bundle_manifest: ok');