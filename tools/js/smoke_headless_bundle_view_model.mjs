import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel, headlessBundleViewModelSummary } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h2-view-model-smoke', width: 10, height: 8 }));
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
assert.equal(viewModel.type, 'anchor.headless.bundle-view-model', 'view-model type');
assert.notEqual(viewModel.bundleStatus, 'FAIL', 'view-model status is usable');
assert.equal(viewModel.fieldCards.some((card) => card.id === 'T_hiddenTruth'), false, 'public view model excludes hidden truth card');
assert.ok(viewModel.notA.includes('not Python simulator'), 'claim boundary includes not Python simulator');
const summary = headlessBundleViewModelSummary(viewModel);
assert.equal(summary.observationCount > 0, true, 'summary counts observations');
assert.equal(summary.trackPointCount > 0, true, 'summary counts tracks');

console.log('Headless bundle view-model smoke passed');
