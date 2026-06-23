import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-pause-freeze' });
assert.equal(probe.repeated.currentPresentationTimeSeconds, probe.first.currentPresentationTimeSeconds, 'paused/repeated presentation keeps current time fixed');
assert.equal(probe.repeated.currentDataDigest, probe.first.currentDataDigest, 'paused/repeated presentation keeps current data fixed');
assert.equal(probe.repeated.currentDataUploadSkipped, true, 'paused/repeated current frame skips upload');
assert.equal(probe.repeated.currentLayerSkipReason, 'presentationDigestUnchanged', 'skip reason explains paused current freeze');
console.log('[smoke_current_pause_freeze] PASS', { timeSeconds: probe.first.currentPresentationTimeSeconds, skipReason: probe.repeated.currentLayerSkipReason });