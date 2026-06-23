import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(m.diagnostics.status, 'PASS');
assert.ok(m.diagnostics.cellwiseDirectionNoiseScore < 0.5);
assert.ok(m.diagnostics.spatialAutocorrelation > 0.5);
console.log('[audit_current_spatial_coherence] PASS');
