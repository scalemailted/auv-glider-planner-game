import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const episode = runHeadlessMission({ seed: 'p11-public-safety', width: 8, height: 6 });
const bundle = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, combinedJson: true });
const loaded = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundle }]);
const summary = buildBrowserHeadlessBundleSummaryArtifact(loaded);
const text = JSON.stringify(summary);

assert.equal(bundle.hiddenFields, null);
assert.equal(summary.waterColumnSummary.publicSafe, true);
assert.equal(summary.waterColumnSummary.usesFull3DPlanning, false);
assert.equal(summary.waterColumnSummary.usesPythonSimulator, false);
assert.equal(summary.depthLayerPrioritySummary.excludesRouteTravelCost, true);
assert.equal(text.includes('T_hiddenTruth'), false);
assert.equal(text.includes('truthValue'), false);

console.log('audit_water_column_public_safety: ok', {
  layers: summary.waterColumnSummary.waterColumnLayerIds,
  coverage: summary.waterColumnSummary.verticalCoverage
});
