import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(m.diagnostics.status, 'PASS', 'spatial-coherence diagnostics pass');
assert.ok(m.diagnostics.spatialAutocorrelation > 0.5, 'adjacent vectors are spatially correlated');
assert.ok(m.diagnostics.cellwiseDirectionNoiseScore < 0.5, 'direction noise is below mosaic threshold');
assert.ok(m.diagnostics.highFrequencyEnergyFraction < 0.55, 'high-frequency energy is bounded');
console.log('[smoke_current_spatial_coherence] PASS', { autocorrelation: m.diagnostics.spatialAutocorrelation, noise: m.diagnostics.cellwiseDirectionNoiseScore, high: m.diagnostics.highFrequencyEnergyFraction });
