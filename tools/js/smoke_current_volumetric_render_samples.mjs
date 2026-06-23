import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.sparse.visibleDepthCount >= 4, 'sparse volumetric field renders multiple physical depths');
assert.ok(m.sparse.volumetricGlyphCount > 0, 'sparse volumetric field marks volumetric glyphs');
assert.equal(m.sparse.noPerVectorThreeObjects, true, 'sparse volumetric current field does not create per-vector Three objects');
console.log('[smoke_current_volumetric_render_samples] PASS', { depths: m.sparse.visibleDepthIds, volumetricGlyphs: m.sparse.volumetricGlyphCount });
