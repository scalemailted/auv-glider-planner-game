import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.sourceDepthAxis.length >= 5, 'source depth axis is authoritative');
assert.ok(m.sourceTimeAxis.length >= 4, 'source time axis is authoritative');
assert.ok(m.depthDistinctness >= 2, 'source depths are not all copied surface values');
assert.ok(m.timeDistinctness >= 2, 'source times are not fixed at zero');
console.log('[audit_production_current_depth_time_authority] PASS');
