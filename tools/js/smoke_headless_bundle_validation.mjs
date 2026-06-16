import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle, validateHeadlessVisibleFields } from '../../src/core/headless/HeadlessBundleValidation.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h2-validation-smoke', width: 10, height: 8 }));
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
const validation = validateHeadlessBundle(bundle);
assert.notEqual(validation.status, 'FAIL', 'public bundle validates without failures');
assert.equal(validation.summary.hiddenFieldExported, false, 'public bundle omits hidden export');
assert.equal(validation.summary.observationCount > 0, true, 'validation summarizes observations');

const leakingVisible = JSON.parse(JSON.stringify(bundle.visibleFields));
leakingVisible.fields.T_hiddenTruth = [[[1]]];
const leakValidation = validateHeadlessVisibleFields(leakingVisible);
assert.equal(leakValidation.status, 'FAIL', 'hidden truth leak fails validation');
assert.ok(leakValidation.failures.some((failure) => failure.includes('T_hiddenTruth')), 'leak failure names T_hiddenTruth');

console.log('Headless bundle validation smoke passed');
