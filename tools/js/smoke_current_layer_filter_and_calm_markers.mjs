import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';

const metrics = buildFlowR2A5CurrentDynamicsMetrics({ seed: 'flow-r2a5-1-layer-filter' });
const stacked = metrics.stacked;
assert.ok(stacked.calmVectorCount > 0, 'fixture should include calm wet vectors');
assert.ok(stacked.calmMarkerInstanceCount > 0, 'calm wet vectors should render as neutral instanced markers');
assert.equal(stacked.glyphDrawCallCount, 1, 'calm markers share the current glyph instanced mesh');

const hiddenLayer = 'deep';
const viewModel = {
  ...metrics.viewModel,
  waterColumn: { ...(metrics.viewModel.waterColumn ?? {}), currentDisplayMode: 'stackedDepthField', showContextCurrents: true, hiddenLayerIds: [hiddenLayer] },
  displaySettings: {
    ...(metrics.viewModel.displaySettings ?? {}),
    waterColumn: { ...(metrics.viewModel.displaySettings?.waterColumn ?? {}), currentDisplayMode: 'stackedDepthField', showContextCurrents: true, hiddenLayerIds: [hiddenLayer] }
  }
};
const layer = createThreeInstancedCurrentGlyphLayer();
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
const filtered = threeInstancedCurrentGlyphLayerSummary(layer, viewModel);
assert.equal(filtered.activeCurrentDisplayMode, 'stackedDepthField');
assert.equal(filtered.visibleDepthIds.includes(hiddenLayer), false, 'hidden depth layer should be omitted from current glyphs');
assert.ok(filtered.visibleDepthCount < stacked.visibleDepthCount, 'filter should reduce visible current depth count');
assert.ok(filtered.calmMarkerInstanceCount >= 0);
console.log('PASS smoke_current_layer_filter_and_calm_markers');