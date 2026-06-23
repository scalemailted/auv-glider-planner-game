import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.ok(m.stacked.visibleDepthCount >= 4, 'stacked depth field renders at least four physical depths');
assert.ok(m.layerStats.filter((layer) => layer.directionalSampleCount > 0).length >= 4, 'at least four layers have directional current samples');
assert.equal(m.stacked.glyphDrawCallCount, 1, 'stacked current field uses one instanced draw call');
console.log('[smoke_current_stacked_depth_render_samples] PASS', { depths: m.stacked.visibleDepthIds, glyphs: m.stacked.glyphInstanceCount });
