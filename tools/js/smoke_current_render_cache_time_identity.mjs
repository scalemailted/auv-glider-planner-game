import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-cache-identity' });
assert.equal(probe.currentFieldDigestStable, true, 'current cube digest is stable across time-only updates');
assert.notEqual(probe.firstCacheSignature, probe.laterCacheSignature, 'current presentation cache identity includes time/interpolation state');
assert.equal(probe.cameraOnlySignatureStable, true, 'camera-only changes are not part of current-data cache identity');
assert.equal(probe.repeated.currentDataUploadSkipped, true, 'identical current presentation skips upload');
console.log('[smoke_current_render_cache_time_identity] PASS', { first: probe.firstCacheSignature, later: probe.laterCacheSignature });