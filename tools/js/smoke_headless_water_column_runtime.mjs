import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission({
  seed: 'p11-runtime-smoke',
  width: 8,
  height: 6,
  depthLayers: ['surface', 'thermocline', 'deep'],
  diveProfileId: 'sawtoothProfile'
});
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
const bundle = JSON.parse(files['bundle.json']);

assert.equal(episode.waterColumnSummary.type, 'anchor.headless.water-column-summary');
assert.equal(episode.depthLayerPriority.type, 'anchor.headless.depth-layer-priority');
assert.equal(episode.waterColumnSummary.usesFull3DPlanning, false);
assert.ok(episode.observations.every((row) => row.depthLayerId && row.diveProfileId));
assert.ok(files['water_column_summary.json']);
assert.ok(files['depth_layer_priority.json']);
assert.equal(bundle.waterColumnSummary.type, 'anchor.headless.water-column-summary');
assert.equal(bundle.depthLayerPrioritySummary.type, 'anchor.headless.depth-layer-priority-summary');
assert.equal(JSON.stringify(bundle.visibleFields).includes('T_hiddenTruth'), false);

console.log('smoke_headless_water_column_runtime: ok', {
  observations: episode.observations.length,
  layers: episode.waterColumnSummary.waterColumnConfig.depthLayerIds
});
