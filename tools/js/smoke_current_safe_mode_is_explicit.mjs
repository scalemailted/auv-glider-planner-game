import assert from 'node:assert/strict';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';
import { volumetricCurrentDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';

const viewModel = makeVolumetricViewModel({ waterColumnUi: { currentDisplayMode: 'activeSlice' } });
const rendererSummary = { visibleVectorInstanceCount: 8, glyphInstanceCount: 8 };
const originalLocation = globalThis.location;
try {
  globalThis.location = { search: '' };
  const normal = volumetricCurrentDebugPayload(viewModel, rendererSummary);
  assert.equal(normal.currentSafeModeExplicit, false, 'normal URL is not safe mode');
  assert.equal(normal.currentPresentationRequested, true, 'normal URL requests currents');
  assert.equal(normal.currentPresentationEnabled, true, 'normal URL enables visible currents');

  globalThis.location = { search: '?currentDisplay=safe' };
  const safe = volumetricCurrentDebugPayload(viewModel, rendererSummary);
  assert.equal(safe.currentSafeModeExplicit, true, 'safe query is explicit');
  assert.equal(safe.currentPresentationRequested, false, 'safe query disables presentation request');
  assert.equal(safe.currentPresentationEnabled, false, 'safe query disables presentation');
  assert.equal(safe.noVisibleVectorsReason, 'Safe Display mode', 'safe reason is explicit');

  globalThis.location = { search: '' };
  const restored = volumetricCurrentDebugPayload(viewModel, rendererSummary);
  assert.equal(restored.currentPresentationEnabled, true, 'next normal mission re-enables vectors');
} finally {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
}

console.log('smoke_current_safe_mode_is_explicit: ok');
