import assert from 'node:assert/strict';
import { depthAwareSampleScoreEvent, evaluateDepthAwareSampleValue, summarizeDepthAwareScoreEvents } from '../../src/core/science/DepthAwareScienceValue.js';

const sampleValue = evaluateDepthAwareSampleValue({ position: { x: 2, y: 2 }, depthLayerId: 'thermocline', observation: { observedValue: 3 }, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline'] } });
const event = depthAwareSampleScoreEvent(sampleValue, { sampleId: 'agent-1:2,2:thermocline:0', agentId: 'agent-1' });
const duplicate = { ...event };
const predicted = { type: 'anchor.rendering.predicted-sample', sampleId: 'predicted-only' };
const summary = summarizeDepthAwareScoreEvents([event, duplicate, predicted], { waterColumnConfig: { depthLayerIds: ['surface', 'thermocline'] } });
assert.equal(summary.canonicalScoreEventCount, 1, 'one observation creates one canonical score event');
assert.equal(summary.duplicateScoreEventCount, 1, 'pause/resume duplicate does not create a new canonical event');
assert.equal(summary.totalSamples, 2, 'replay duplicate is visible as a duplicate diagnostic');
assert.equal(summary.samplesByDepthLayer.surface, 0, 'predicted samples create no score event');
console.log('smoke_depth_score_event_deduplication: PASS');
