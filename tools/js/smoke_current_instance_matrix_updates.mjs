import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-matrix' });
assert.notEqual(probe.first.currentMatrixDigest, probe.later.currentMatrixDigest, 'instance matrix digest changes when direction/length changes');
assert.ok(probe.later.currentMatrixAttributeVersion > probe.repeated.currentMatrixAttributeVersion, 'matrix attribute version increments after timeline update');
assert.ok(probe.later.currentMatrixBufferUploadCount > probe.repeated.currentMatrixBufferUploadCount, 'matrix upload count increments after timeline update');
console.log('[smoke_current_instance_matrix_updates] PASS', { matrixVersion: probe.later.currentMatrixAttributeVersion, matrixUploads: probe.later.currentMatrixBufferUploadCount });