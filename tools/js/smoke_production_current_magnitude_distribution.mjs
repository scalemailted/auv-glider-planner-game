import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.diagnostics.speedMaximum > m.diagnostics.speedMinimum, 'physical speed range varies');
assert.ok(m.stacked.distinctMagnitudeBinCount >= 4, 'display samples cover multiple speed bins');
assert.ok(m.diagnostics.speedMean > 0, 'mean physical current speed is positive');
console.log('[smoke_production_current_magnitude_distribution] PASS', { min: m.diagnostics.speedMinimum, mean: m.diagnostics.speedMean, max: m.diagnostics.speedMaximum, bins: m.stacked.distinctMagnitudeBinCount });
