import assert from 'node:assert/strict';
import {
  CURRENT_PRESENTATION_STATE_VERSION,
  buildCurrentPresentationDebug,
  currentPresentationCacheSignature,
  currentVectorsVisible,
  isExplicitCurrentSafeMode,
  normalizeCurrentDisplayMode,
  normalizeRendererCurrentDisplayMode
} from '../../src/core/rendering/CurrentPresentationState.js';

const viewModel = {
  waterColumn: {
    currentDisplayMode: 'activeCurrentSlice',
    currentLayerMode: 'followSelectedGlider',
    currentVectorDensity: 'balanced',
    currentMagnitudeScale: 1.8,
    currentColorMode: 'speed',
    showContextCurrents: false
  },
  currentActiveLayerId: 'thermocline',
  visibility: { currentVectors: true }
};
const rendererSummary = {
  sourceVectorSampleCount: 16,
  finiteVectorSampleCount: 16,
  nonzeroVectorSampleCount: 16,
  visibleVectorInstanceCount: 16,
  glyphInstanceCount: 16,
  glyphDrawCallCount: 1
};
const normal = buildCurrentPresentationDebug({ phase: 'planning', runtimeShell: 'default', viewModel, rendererSummary, ui: { showCurrents: true }, layerVisibility: { currentVectors: true }, search: '' });
const hidden = buildCurrentPresentationDebug({ phase: 'planning', runtimeShell: 'default', viewModel, rendererSummary, ui: { showCurrents: false }, layerVisibility: { currentVectors: true }, search: '' });
const safe = buildCurrentPresentationDebug({ phase: 'planning', runtimeShell: 'default', viewModel, rendererSummary, ui: { showCurrents: true }, layerVisibility: { currentVectors: true }, search: '?currentDisplay=safe' });

assert.equal(CURRENT_PRESENTATION_STATE_VERSION, 'current-presentation-state-flow-r2a-4');
assert.equal(normalizeCurrentDisplayMode('activeCurrentSlice'), 'activeSlice');
assert.equal(normalizeRendererCurrentDisplayMode('activeSlice'), 'activeCurrentSlice');
assert.equal(normal.currentPresentationEnabled, true, 'normal current debug enables visible vectors');
assert.equal(normal.rendererOwnsCurrent, false, 'renderer is presentation-only');
assert.equal(normal.displayLayerChangesCurrent, false, 'display layer does not alter canonical currents');
assert.equal(normal.changesOfficialScoring, false, 'current presentation does not change scoring');
assert.equal(hidden.currentPresentationEnabled, false, 'UI hidden state disables current presentation');
assert.match(hidden.noVisibleVectorsReason, /hidden by UI controls/);
assert.equal(safe.safeModeExplicit, true, 'safe mode requires explicit query');
assert.equal(safe.currentPresentationEnabled, false, 'safe mode disables current presentation');
assert.equal(isExplicitCurrentSafeMode('?currentDisplay=safe'), true);
assert.equal(isExplicitCurrentSafeMode('?currentDisplay=activeSlice'), false);
assert.equal(currentVectorsVisible({ ui: { showCurrents: true }, layers: { currentVectors: true }, search: '' }), true);
assert.equal(currentVectorsVisible({ ui: { showCurrents: true }, layers: { currentVectors: true }, search: '?currentDisplay=safe' }), false);
assert.notEqual(
  currentPresentationCacheSignature(viewModel, ''),
  currentPresentationCacheSignature({ ...viewModel, waterColumn: { ...viewModel.waterColumn, currentDisplayMode: 'stackedCurrentSlabs' } }, ''),
  'display mode is included in the cache signature'
);

console.log('smoke_current_presentation_state_defaults: ok');
