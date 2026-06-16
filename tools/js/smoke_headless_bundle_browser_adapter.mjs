import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessBundleDebugObject, buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h2-browser-adapter-smoke', width: 10, height: 8 }));
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
const artifact = buildBrowserHeadlessBundleSummaryArtifact(bundle);
assert.equal(artifact.type, 'anchor.browser.headless-bundle-summary', 'browser summary artifact type');
assert.equal(artifact.scoreSummary.headlessScoreIsOfficialBrowserScore, false, 'headless score is not official browser score');
assert.ok(artifact.notA.includes('not MARL/RL'), 'browser summary keeps no-MARL boundary');
const debug = buildBrowserHeadlessBundleDebugObject(bundle);
assert.equal(debug.usesPythonSimulator, false, 'debug excludes Python simulator');
assert.equal(debug.usesNodeHeadlessRuntime, true, 'debug marks Node headless runtime');
assert.equal(debug.browserSummaryExportAvailable, true, 'debug marks summary export available');

console.log('Headless bundle browser adapter smoke passed');
