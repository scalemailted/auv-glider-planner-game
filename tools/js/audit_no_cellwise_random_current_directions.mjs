import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(m.field.sourceMetadata.perturbationPolicy.notCellwiseRandomDirections, true);
assert.ok(m.diagnostics.cellwiseDirectionNoiseScore < 0.5);
assert.ok(m.diagnostics.lowFrequencyEnergyFraction > m.diagnostics.highFrequencyEnergyFraction);
console.log('[audit_no_cellwise_random_current_directions] PASS');
