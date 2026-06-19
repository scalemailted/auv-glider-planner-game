import assert from 'node:assert/strict';
import { depthAwareSampleScoreEvent, evaluateDepthAwareSampleValue, summarizeDepthAwareScoreEvents } from '../../src/core/science/DepthAwareScienceValue.js';

const config = { depthLayerIds: ['surface', 'thermocline', 'deep'] };
const events = ['surface', 'thermocline', 'deep'].map((layerId, index) => {
  const sample = evaluateDepthAwareSampleValue({ position: { x: index, y: 0 }, depthLayerId: layerId, observation: { observedValue: index + 1 }, waterColumnConfig: config });
  return depthAwareSampleScoreEvent(sample, { sampleId: `s-${index}`, agentId: 'glider-1' });
});
const summary = summarizeDepthAwareScoreEvents(events, { waterColumnConfig: config });
const layerTotal = Object.values(summary.scienceValueByDepthLayer).reduce((sum, value) => sum + Number(value), 0);
assert.equal(Number(layerTotal.toFixed(6)), summary.totalScienceScore, 'layer subtotals match total');
assert.equal(summary.totalSamples, 3, 'glider/sample subtotals match total count');
assert.equal(summary.sampledLayerIds.length, 3, 'vertical coverage reports sampled layers');
assert.equal(summary.publicSafe, true, 'hidden truth absent in fair mode');
console.log('smoke_depth_science_debrief_summary: PASS');
