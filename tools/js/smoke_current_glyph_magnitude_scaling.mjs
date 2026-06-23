import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.stacked.canonicalMagnitudeMaximum > m.stacked.canonicalMagnitudeMinimum, 'physical speed ordering exists');
assert.ok(m.stacked.glyphLengthMaximum > m.stacked.glyphLengthMinimum, 'glyph length varies with physical speed');
assert.ok(m.stacked.glyphLengthMaximum <= 1.3, 'glyph maximum length is bounded in cell-size units');
assert.ok(m.stacked.calmVectorCount > 0, 'calm vectors are tracked separately from directional glyphs');
console.log('[smoke_current_glyph_magnitude_scaling] PASS', { glyphMin: m.stacked.glyphLengthMinimum, glyphMean: m.stacked.glyphLengthMean, glyphMax: m.stacked.glyphLengthMaximum });
