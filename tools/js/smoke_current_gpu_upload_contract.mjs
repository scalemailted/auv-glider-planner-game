import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-gpu-upload' });
assert.equal(probe.repeated.currentDataUploadSkipped, true, 'same current time skips GPU-style upload counters');
assert.ok(probe.later.glyphBufferUpdateCount > probe.repeated.glyphBufferUpdateCount, 'advanced current time increments glyph buffer update count');
assert.ok(probe.later.currentDirectionBufferUploadCount > probe.repeated.currentDirectionBufferUploadCount, 'direction upload count increments');
assert.ok(probe.later.currentMatrixBufferUploadCount > probe.repeated.currentMatrixBufferUploadCount, 'matrix upload count increments');
assert.equal(probe.later.rendererOwnsCurrent, false, 'renderer remains current consumer only');
console.log('[smoke_current_gpu_upload_contract] PASS', { updates: [probe.first.glyphBufferUpdateCount, probe.repeated.glyphBufferUpdateCount, probe.later.glyphBufferUpdateCount] });