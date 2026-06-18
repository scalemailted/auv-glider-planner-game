import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createHeadlessCombinedBundle, headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle } from '../../src/core/headless/HeadlessBundleValidation.js';

const episode = runHeadlessMission({ seed: 'headless-replay-loader-smoke', motionAware: true, missionScore: true });
const combined = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, combinedJson: true, checkpointEvery: 5 });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: combined }]);
const validation = validateHeadlessBundle(bundle);
assert.equal(bundle.replayManifest?.type, 'anchor.headless.replay-manifest');
assert.equal(bundle.replayEvents?.type, 'anchor.headless.replay-events');
assert.equal(bundle.replayCheckpoints?.type, 'anchor.headless.replay-checkpoints');
assert.equal(validation.failures.length, 0, validation.failures.join('; '));

const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: false, checkpointEvery: 5 });
const separate = buildHeadlessBundleFromFiles(Object.entries(files).map(([fileName, text]) => ({ fileName, text })));
assert.equal(separate.replayManifest?.version, 'replay-r1.0', 'separate replay manifest loads');

console.log('Headless replay bundle loader smoke passed');