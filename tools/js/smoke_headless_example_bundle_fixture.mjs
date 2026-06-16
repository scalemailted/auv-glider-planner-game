import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle } from '../../src/core/headless/HeadlessBundleValidation.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const FIXTURES = Object.freeze({
  debug: 'docs/examples/headless_oceanbox_js_bundle.example.json',
  public: 'docs/examples/headless_oceanbox_js_public_bundle.example.json'
});
const WARN_SIZE_BYTES = 500 * 1024;
const FAIL_SIZE_BYTES = 2 * 1024 * 1024;

function readFixture(filePath) {
  assert.equal(fs.existsSync(filePath), true, `${filePath} exists`);
  const size = fs.statSync(filePath).size;
  assert.equal(size < FAIL_SIZE_BYTES, true, `${filePath} stays below 2 MB`);
  if (size > WARN_SIZE_BYTES) console.warn(`${filePath} is ${size} bytes; keep example fixtures compact.`);
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(payload.type, 'anchor.headless.bundle', `${filePath} is a combined headless bundle`);
  return { payload, size };
}

function loadFixture(name, filePath) {
  const { payload, size } = readFixture(filePath);
  const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
  assert.equal(bundle.type, 'anchor.headless.bundle', `${name} fixture loads as a bundle`);
  assert.deepEqual(bundle.failures, [], `${name} fixture has no loader failures`);
  const validation = validateHeadlessBundle(bundle);
  assert.notEqual(validation.status, 'FAIL', `${name} fixture passes bundle validation`);
  const viewModel = buildHeadlessBundleViewModel(bundle);
  assert.equal(viewModel.type, 'anchor.headless.bundle-view-model', `${name} fixture builds a view model`);
  const summary = buildBrowserHeadlessBundleSummaryArtifact(bundle);
  assert.equal(summary.type, 'anchor.browser.headless-bundle-summary', `${name} fixture builds browser summary artifact`);
  assert.equal(bundle.observations.length > 0, true, `${name} fixture contains observations`);
  assert.equal(bundle.gliderTracks.length > 0, true, `${name} fixture contains glider tracks`);
  assert.ok(bundle.scoreReport, `${name} fixture contains a score report`);
  assert.ok(bundle.replay, `${name} fixture contains replay metadata`);
  return { payload, bundle, validation, viewModel, summary, size };
}

const debugFixture = loadFixture('debug/oracle', FIXTURES.debug);
const publicFixture = loadFixture('public', FIXTURES.public);

assert.equal(Object.hasOwn(publicFixture.bundle.visibleFields?.fields ?? {}, 'T_hiddenTruth'), false, 'public fixture visible fields exclude T_hiddenTruth');
assert.equal(publicFixture.bundle.hiddenFields, null, 'public fixture omits hiddenFields payload');
assert.equal((publicFixture.bundle.manifest?.files ?? []).some((entry) => entry?.path === 'hidden_fields.json' || entry?.role === 'hiddenFields'), false, 'public manifest omits hidden_fields.json reference');
assert.equal(/hidden truth export disabled|hidden export disabled|hidden_fields\.json omitted/i.test((publicFixture.bundle.manifest?.notes ?? []).join(' ')), true, 'public manifest says hidden export is disabled');

const debugHiddenIds = Object.keys(debugFixture.bundle.hiddenFields?.fields ?? {});
assert.ok(debugHiddenIds.includes('T_hiddenTruth'), 'debug/oracle fixture includes T_hiddenTruth as a hidden field');
const hiddenFile = (debugFixture.bundle.manifest?.files ?? []).find((entry) => entry?.path === 'hidden_fields.json' || entry?.role === 'hiddenFields');
const hiddenTier = hiddenFile?.visibilityTier ?? debugFixture.bundle.hiddenFields?.visibilityTier;
assert.ok(['hiddenTruth', 'oracle', 'debugAll'].includes(hiddenTier), 'debug/oracle hidden fields use an explicit hidden/oracle/debug visibility tier');

console.log('Headless example bundle fixture smoke passed', {
  debugBytes: debugFixture.size,
  publicBytes: publicFixture.size,
  publicVisibleFields: Object.keys(publicFixture.bundle.visibleFields?.fields ?? {}).length,
  observations: publicFixture.bundle.observations.length,
  trackPoints: publicFixture.bundle.gliderTracks.length,
  finalScore: publicFixture.bundle.scoreReport?.finalScore ?? null
});