import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';

const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-1-cache-invalidation' });
assert.notEqual(probe.firstCacheSignature, probe.laterCacheSignature, 'timeline time changes current presentation cache identity');
assert.notEqual(probe.firstSourceTimeFrameSignature, probe.laterSourceTimeFrameSignature, 'timeline time changes source-frame identity');
assert.equal(probe.repeated.currentDataUploadSkipped, true, 'repeated same time skips current data upload');
assert.equal(probe.currentFieldDigestStable, true, 'timeline change does not rebuild current field source digest');
console.log('[smoke_planning_current_cache_invalidation] PASS', { first: probe.firstCacheSignature, later: probe.laterCacheSignature });
