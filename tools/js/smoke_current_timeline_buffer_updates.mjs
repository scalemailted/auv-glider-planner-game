import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.timeDistinctness >= 2, 'canonical timeline changes sampled current');
assert.ok(m.diagnostics.temporalChangeRms > 0, 'temporal-change diagnostic is positive');
assert.ok(m.stacked.glyphBufferUpdateCount >= 1, 'glyph layer records a current-buffer update');
assert.equal(m.stacked.glyphDrawCallCount, 1, 'current presentation remains one instanced draw call');
console.log('[smoke_current_timeline_buffer_updates] PASS', { temporalChangeRms: m.diagnostics.temporalChangeRms, bufferUpdates: m.stacked.glyphBufferUpdateCount });
