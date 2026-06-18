import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { buildReplayArtifactsFromEpisode } from '../../src/core/replay/ReplayContractBuilder.js';

const episode = runHeadlessMission({ seed: 'replay-builder-smoke', motionAware: true, costGraph: true, missionScore: true });
const artifacts = buildReplayArtifactsFromEpisode(episode, { checkpointEvery: 4, useDemoObjectiveSequence: true });

assert.equal(artifacts.manifest.replayMode, 'publicObservationPlayback');
assert.equal(artifacts.manifest.featureFlags.motionAware, true, 'motion flag preserved');
assert.equal(artifacts.manifest.featureFlags.costGraphEnabled, true, 'cost graph flag preserved');
assert.equal(artifacts.manifest.featureFlags.missionOutcomeScoring, true, 'score flag preserved');
assert.equal(artifacts.events.events.filter((event) => event.phase === 'objective').length, 5, 'demo objective transitions preserved');
assert.ok(artifacts.checkpoints.checkpoints.some((checkpoint) => checkpoint.reasons.includes('terminal')), 'terminal checkpoint');
assert.ok(artifacts.contract.manifest, 'combined contract wrapper exists');

console.log('REPLAY-R1 contract builder smoke passed');