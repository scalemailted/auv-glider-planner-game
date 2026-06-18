import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission({ seed: 'headless-replay-runtime-smoke', motionAware: true, costGraph: true, missionScore: true });
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true, checkpointEvery: 5 });

for (const fileName of ['replay_manifest.json', 'replay_events.json', 'replay_checkpoints.json', 'replay_alignment_report.json', 'bundle.json']) {
  assert.ok(files[fileName], `${fileName} written`);
}
const manifest = JSON.parse(files['replay_manifest.json']);
const combined = JSON.parse(files['bundle.json']);
assert.equal(manifest.hiddenTruthIncluded, false, 'public replay excludes hidden truth');
assert.equal(combined.hiddenFields, null, 'public combined bundle omits hidden fields');
assert.ok(combined.replayEvents.events.length > 0, 'combined embeds replay events');

console.log('Headless replay runtime smoke passed');