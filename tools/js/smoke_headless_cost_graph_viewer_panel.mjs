import assert from 'node:assert/strict';

import { buildBrowserHeadlessBundleDebugObject, buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const config = createDefaultHeadlessRuntimeConfig({ width: 12, height: 8, seed: 'sim-r1-viewer', costGraphEnabled: true, costGraphGridStep: 4, costGraphMaxNodes: 24, costMatrixFormat: 'sparse' });
const episode = runHeadlessMission(config);
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
const html = headlessBundleViewerPanelHtml(viewModel);
const debug = buildBrowserHeadlessBundleDebugObject(bundle);
const summary = buildBrowserHeadlessBundleSummaryArtifact(bundle);
assert.equal(viewModel.motionCostGraphSummary.present, true);
assert.ok(html.includes('Motion Cost Graph'));
assert.ok(html.includes('data-headless-motion-cost-graph'));
assert.equal(debug.hasMotionCostGraph, true);
assert.equal(debug.motionCostGraphPublicSafe, true);
assert.equal(debug.motionCostGraphUsesRouteOptimizer, false);
assert.equal(summary.motionCostGraphSummary.present, true);
assert.equal(JSON.stringify(summary).includes('T_hiddenTruth'), false);

console.log('Headless cost graph viewer panel smoke passed');
