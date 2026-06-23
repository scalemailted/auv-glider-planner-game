import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.stacked.distinctMagnitudeBinCount >= 4, 'physical speeds occupy multiple bins');
assert.ok(m.stacked.glyphLengthMaximum > m.stacked.glyphLengthMinimum, 'glyph lengths vary');
assert.ok(m.stacked.calmVectorCount > 0, 'calm vectors are not assigned arbitrary arrows');
console.log('[audit_current_magnitude_fidelity] PASS');
