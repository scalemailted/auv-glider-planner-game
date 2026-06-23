import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.diagnostics.calmVectorCount > 0, 'canonical source contains calm or weak-current vectors');
assert.ok(m.stacked.calmVectorCount > 0, 'render samples include calm vectors');
assert.ok(m.stacked.glyphInstanceCount < m.stacked.sourceVectorSampleCount, 'calm samples do not create arbitrary directional arrows');
console.log('[smoke_production_current_calm_region] PASS', { calm: m.diagnostics.calmVectorCount, glyphs: m.stacked.glyphInstanceCount, source: m.stacked.sourceVectorSampleCount });
