import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';
import { volumetricCurrentDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';

const viewModel = makeVolumetricViewModel({
  waterColumnUi: {
    currentDisplayMode: 'activeSlice',
    currentLayerMode: 'followSelectedGlider',
    currentVectorDensity: 'balanced',
    currentMagnitudeScale: 1.8,
    currentColorMode: 'speed',
    showContextCurrents: false
  }
});
const rendererSummary = { visibleVectorInstanceCount: 4, glyphInstanceCount: 4 };
const debug = volumetricCurrentDebugPayload(viewModel, rendererSummary);

assert.equal(viewModel.currentVisualizationAvailable, true, 'modern mission exposes current visualization');
assert.equal(viewModel.currentPresentationRequested, true, 'modern mission requests current vectors by default');
assert.equal(viewModel.currentDisplayMode, 'activeSlice', 'default display mode is activeSlice');
assert.equal(viewModel.currentVisualization.currentLayerMode, 'followSelectedGlider', 'default layer mode follows selected glider');
assert.equal(viewModel.currentVisualization.currentVectorDensity, 'balanced', 'default density is balanced');
assert.equal(Number.isFinite(Number(viewModel.currentVisualization.currentMagnitudeScale)), true, 'magnitude scale is finite');
assert.equal(viewModel.currentVisualization.showContextCurrents, false, 'context currents are off by default');
assert.equal(debug.currentSafeModeExplicit, false, 'safe mode is false without query');
assert.equal(debug.currentPresentationEnabled, true, 'presentation can be enabled with visible instances');

console.log('smoke_current_presentation_defaults: ok', {
  mode: viewModel.currentDisplayMode,
  density: viewModel.currentVisualization.currentVectorDensity,
  scale: viewModel.currentVisualization.currentMagnitudeScale
});
