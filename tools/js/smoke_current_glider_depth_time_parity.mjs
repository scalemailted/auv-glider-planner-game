import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.depthDistinctness >= 2, 'actual-depth sampling can change current vector');
assert.ok(m.timeDistinctness >= 2, 'mission-time sampling can change current vector');
assert.equal(m.displayModeDigestCount, 1, 'display mode does not change canonical current field digest');
assert.equal(m.displayModeCurrentSampleCount, 1, 'display mode does not change canonical sampled current');
console.log('[smoke_current_glider_depth_time_parity] PASS', { depthDistinctness: m.depthDistinctness, timeDistinctness: m.timeDistinctness });
