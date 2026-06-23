import assert from 'node:assert/strict';
import { buildCameraInvarianceProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildCameraInvarianceProbe({ seed: 'flow-runtime-r1-camera' });
assert.equal(probe.cacheSignatureStable, true, 'camera-only state does not change current cache signature');
assert.equal(probe.after.currentDataDigest, probe.before.currentDataDigest, 'camera-only state does not change current digest');
assert.equal(probe.after.currentDataUploadSkipped, true, 'camera-only current update skips data upload');
console.log('[smoke_current_camera_invariance] PASS', { digest: probe.after.currentDataDigest, skipReason: probe.after.currentLayerSkipReason });