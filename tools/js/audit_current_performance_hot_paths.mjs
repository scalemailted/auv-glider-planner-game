import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(m.stacked.glyphDrawCallCount, 1, 'one instanced draw call for stacked currents');
assert.equal(m.sparse.glyphDrawCallCount, 1, 'one instanced draw call for sparse currents');
assert.equal(m.stacked.noPerVectorThreeObjects, true, 'no per-vector Three objects');
assert.ok(m.stacked.glyphBufferUpdateCount >= 1, 'buffer updates are explicit and counted');
console.log('[audit_current_performance_hot_paths] PASS', { stackedGlyphs: m.stacked.glyphInstanceCount, sparseGlyphs: m.sparse.glyphInstanceCount });
