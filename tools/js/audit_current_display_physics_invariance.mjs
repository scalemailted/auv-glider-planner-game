import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(m.displayModeDigestCount, 1, 'display modes do not mutate field digest');
assert.equal(m.displayModeCurrentSampleCount, 1, 'display modes do not mutate sampled current');
console.log('[audit_current_display_physics_invariance] PASS');
