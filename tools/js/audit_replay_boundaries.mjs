import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildBrowserHeadlessBundleDebugObject } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const episode = runHeadlessMission({ seed: 'replay-boundary-audit', motionAware: true, costGraph: true, missionScore: true });
const publicBundle = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, combinedJson: true, checkpointEvery: 5 });
const replayJson = JSON.stringify({
  replayManifest: publicBundle.replayManifest,
  replayEvents: publicBundle.replayEvents,
  replayCheckpoints: publicBundle.replayCheckpoints,
  replayAlignmentReport: publicBundle.replayAlignmentReport
});
const debug = buildBrowserHeadlessBundleDebugObject(publicBundle);

assert.equal(publicBundle.hiddenFields, null, 'public bundle omits hidden fields');
assert.equal(/T_hiddenTruth|trueRoi|hidden_fields|oracleState|refereeOnlyPayload/.test(replayJson), false, 'public replay artifacts do not expose hidden/referee payload markers');
assert.equal(publicBundle.replayManifest.replayMode, 'publicObservationPlayback', 'public bundle uses playback label');
assert.equal(publicBundle.replayManifest.changesOfficialBrowserScoring, false, 'replay manifest preserves scoring boundary');
assert.equal(debug.changesOfficialBrowserScoring, false, 'debug object preserves official scoring boundary');
assert.equal(debug.usesPythonSimulator, false, 'no Python simulator claim');
assert.equal(debug.usesMARL, false, 'no MARL/RL claim');
assert.equal(debug.usesProductionDataAssimilation, false, 'no production data assimilation claim');

console.log('REPLAY-R1 boundary audit passed');