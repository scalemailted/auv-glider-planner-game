import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleDebugObject, buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const episode = runHeadlessMission({ seed: 'headless-replay-viewer-smoke', motionAware: true, missionScore: true });
const payload = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, combinedJson: true, checkpointEvery: 5, useDemoObjectiveSequence: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
const html = headlessBundleViewerPanelHtml(viewModel);
const debug = buildBrowserHeadlessBundleDebugObject(bundle);
const summary = buildBrowserHeadlessBundleSummaryArtifact(bundle);

assert.equal(viewModel.replaySummary.present, true, 'view model exposes replay summary');
assert.equal(viewModel.replayPlayback.status, 'ready', 'view model exposes playback state');
assert.match(html, /data-headless-replay-panel/, 'panel renders replay section');
assert.match(html, /Step Event/, 'panel renders replay controls');
assert.equal(debug.replayLoaded, true, 'debug object exposes replay loaded');
assert.equal(debug.replayHiddenTruthIncluded, false, 'debug object preserves public boundary');
assert.equal(summary.replaySummary.replayMode, 'publicObservationPlayback', 'browser summary exports replay mode');

console.log('Headless replay viewer panel smoke passed');