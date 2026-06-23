import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.stacked.visibleDepthCount >= 4, 'stacked render uses multiple physical depths');
assert.ok(m.sparse.visibleDepthCount >= 4, 'sparse render uses multiple physical depths');
assert.equal(m.sparse.noPerVectorThreeObjects, true);
assert.equal(m.sparse.glyphDrawCallCount, 1);
console.log('[audit_current_volumetric_rendering] PASS');
