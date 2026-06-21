import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayReviewSourceFromBundle } from '../../src/core/replay/ReplayReviewLoader.js';
import { createReplayReviewSession, replayReviewSessionSummary } from '../../src/core/replay/ReplayReviewSession.js';
import { buildReplayWorldRenderViewModel, validateReplayWorldRenderViewModel } from '../../src/core/rendering/ReplayWorldRenderViewModel.js';
import { scanForbiddenPublicMarkers } from '../../src/core/replay/ReplaySchema.js';

function bundleFromExample(fileName) {
  const payload = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  return buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
}

const publicSource = buildReplayReviewSourceFromBundle(bundleFromExample('docs/examples/headless_replay_public.example.json'), { sourceKind: 'audit' });
const session = createReplayReviewSession(publicSource);
const viewModel = buildReplayWorldRenderViewModel(session);
const validation = validateReplayWorldRenderViewModel(viewModel);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const sourceSummary = publicSource.summary;
const sessionSummary = replayReviewSessionSummary(session);
assert.equal(sourceSummary.hiddenTruthIncluded, false, 'source summary does not include hidden truth');
assert.equal(sessionSummary.usesHiddenTruthResimulation, false, 'session does not resimulate hidden truth');
assert.equal(sessionSummary.changesOfficialBrowserScoring, false, 'session does not change scoring');
assert.equal(viewModel.boundaryFlags.ownsReplaySemantics, false, 'view model does not own replay semantics');
assert.equal(viewModel.boundaryFlags.publicObservationPlayback, true, 'view model is public observation playback');
const publicScan = scanForbiddenPublicMarkers({ manifest: publicSource.manifest, events: publicSource.events, checkpoints: publicSource.checkpoints });
assert.equal(publicScan.failures.length, 0, publicScan.failures.join('\n'));

const tamperedSource = buildReplayReviewSourceFromBundle(bundleFromExample('docs/examples/headless_replay_tampered_digest.example.json'), { sourceKind: 'audit' });
const tamperedSession = createReplayReviewSession(tamperedSource);
const tamperedSummary = replayReviewSessionSummary(tamperedSession);
assert.equal(tamperedSummary.integrityStatus, 'FAIL', 'tampered digest fixture fails integrity');
assert.equal(tamperedSession.controls.canPlay, false, 'tampered fixture disables trusted playback');
assert.ok(tamperedSummary.failureCodes.includes('REPLAY_CHECKPOINT_DIGEST_MISMATCH'), 'tampered fixture reports digest mismatch');
console.log('audit_three_replay_boundaries: PASS', JSON.stringify({ publicIntegrity: sessionSummary.integrityStatus, tamperedIntegrity: tamperedSummary.integrityStatus }));
