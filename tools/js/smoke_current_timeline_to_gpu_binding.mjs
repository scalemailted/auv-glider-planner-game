import assert from 'node:assert/strict';
import { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';
import { currentPresentationCacheSignature, currentSourceTimeFrameSignature } from '../../src/core/rendering/CurrentPresentationState.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { currentSecondsToPlanningTimelineTime } from '../../src/core/time/PlanningTimelineTimeBridge.js';

const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-r2a5-2-timeline-binding' });
fixture.state.ui.waterColumn.currentDisplayMode = 'stackedDepthField';
fixture.state.ui.waterColumn.showContextCurrents = true;
fixture.state.ui.waterColumn.currentVectorDensity = 'balanced';

function viewModelAt(timeSeconds) {
  fixture.state.mode = 'planning';
  fixture.state.planningTime = currentSecondsToPlanningTimelineTime(fixture.level, timeSeconds, { phase: 'planning' });
  const built = buildNormalGeneratedCurrentViewModel({ fixture });
  return built.viewModel;
}

const sourceTimes = viewModelAt(0).waterColumnExplorer.currentCube.timeAxisSeconds;
const t0 = sourceTimes[0] ?? 0;
const t1 = sourceTimes[Math.min(2, sourceTimes.length - 1)] ?? t0;
assert.notEqual(t1, t0, 'fixture must expose at least two current source times');

const layer = createThreeInstancedCurrentGlyphLayer();
const firstVm = viewModelAt(t0);
updateThreeInstancedCurrentGlyphLayer(layer, firstVm);
const first = threeInstancedCurrentGlyphLayerSummary(layer, firstVm);

updateThreeInstancedCurrentGlyphLayer(layer, firstVm);
const repeated = threeInstancedCurrentGlyphLayerSummary(layer, firstVm);

const laterVm = viewModelAt(t1);
updateThreeInstancedCurrentGlyphLayer(layer, laterVm);
const later = threeInstancedCurrentGlyphLayerSummary(layer, laterVm);

assert.equal(first.currentPresentationTimeSeconds, t0, 'first glyph upload records the canonical current presentation time');
assert.equal(later.currentPresentationTimeSeconds, t1, 'later glyph upload records the advanced canonical current presentation time');
assert.notEqual(currentPresentationCacheSignature(firstVm), currentPresentationCacheSignature(laterVm), 'presentation cache signature includes current time/frame');
assert.notEqual(currentSourceTimeFrameSignature(firstVm), currentSourceTimeFrameSignature(laterVm), 'source time frame signature changes with timeline');
assert.equal(repeated.currentDataUploadSkipped, true, 'same current frame skips GPU attribute uploads');
assert.equal(repeated.glyphBufferUpdateCount, first.glyphBufferUpdateCount, 'same current frame does not increment buffer upload count');
assert.notEqual(later.currentDataDigest, first.currentDataDigest, 'advanced current frame changes rendered current data digest');
assert.notEqual(later.currentDirectionDigest, first.currentDirectionDigest, 'advanced current frame changes direction attribute digest');
assert.ok(later.glyphBufferUpdateCount > repeated.glyphBufferUpdateCount, 'advanced current frame increments buffer upload count');
assert.ok(later.currentDirectionAttributeVersion > repeated.currentDirectionAttributeVersion, 'direction attribute version advances after timeline change');
assert.ok(later.currentMatrixAttributeVersion > repeated.currentMatrixAttributeVersion, 'matrix attribute version advances after timeline change');
assert.equal(later.glyphDrawCallCount, 1, 'current presentation remains one instanced draw call');
assert.equal(later.rendererOwnsCurrent, false, 'renderer remains a current consumer');
assert.equal(later.changesOfficialScoring, false, 'presentation changes do not alter scoring');

console.log('[smoke_current_timeline_to_gpu_binding] PASS', {
  t0,
  t1,
  firstDigest: first.currentDataDigest,
  laterDigest: later.currentDataDigest,
  firstUploads: first.glyphBufferUpdateCount,
  repeatedSkipped: repeated.currentDataUploadSkipped,
  laterUploads: later.glyphBufferUpdateCount
});
