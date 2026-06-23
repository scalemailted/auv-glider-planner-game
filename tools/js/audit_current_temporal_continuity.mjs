import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.timeDistinctness >= 2, 'time samples differ');
assert.ok(m.diagnostics.temporalChangeRms > 0, 'temporal RMS is positive');
assert.ok(m.diagnostics.temporalDiscontinuityMaximum < 0.4, 'temporal changes remain bounded');
assert.ok(m.midpointSample.timeInterpolationFraction >= 0 && m.midpointSample.timeInterpolationFraction <= 1, 'midpoint interpolation fraction is bounded');
console.log('[audit_current_temporal_continuity] PASS');
