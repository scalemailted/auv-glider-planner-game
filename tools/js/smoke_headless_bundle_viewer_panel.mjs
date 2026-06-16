import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h2-panel-smoke', width: 10, height: 8 }));
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
const html = headlessBundleViewerPanelHtml(buildHeadlessBundleViewModel(bundle));
for (const text of ['Headless Bundle Viewer', 'Visible Fields', 'Observations', 'Glider Tracks', 'Score Report', 'Visibility', 'Browser ANCHOR remains the official visual referee']) {
  assert.ok(html.includes(text), `panel includes ${text}`);
}
assert.ok(html.includes('data-action="export-browser-summary"'), 'panel includes browser summary export action');
assert.ok(html.includes('not official browser scoring'), 'panel states scoring boundary');

console.log('Headless bundle viewer panel smoke passed');
