import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleDebugObject } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

const episode = runHeadlessMission({ seed: 'p11-viewer-smoke', width: 8, height: 6 });
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
const viewModel = buildHeadlessBundleViewModel(bundle);
const html = headlessBundleViewerPanelHtml(viewModel);
const debug = buildBrowserHeadlessBundleDebugObject(bundle);

for (const text of ['Water Column', 'Depth-Layer Priority', '2.5D means the tactical map remains top-down', 'Dive profile controls which layer']) {
  assert.ok(html.includes(text), `viewer panel missing ${text}`);
}
assert.equal(debug.hasWaterColumnSummary, true);
assert.deepEqual(debug.waterColumnLayerIds, ['surface', 'thermocline', 'deep']);
assert.equal(debug.usesFull3DPlanning, false);
assert.equal(debug.usesNewPlanner, false);
assert.equal(debug.usesPythonSimulator, false);
assert.equal(debug.usesMARL, false);

console.log('smoke_headless_water_column_viewer_panel: ok', { profile: debug.diveProfileId });
