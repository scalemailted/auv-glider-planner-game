import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { buildReplayArtifactsFromEpisode } from '../../src/core/replay/ReplayContractBuilder.js';
import { REPLAY_R1_CONTRACT_ID, REPLAY_R1_SCHEMA_VERSION, REPLAY_MODES, validateReplayArtifacts } from '../../src/core/replay/ReplaySchema.js';

const episode = runHeadlessMission({ seed: 'replay-schema-smoke', motionAware: true, missionScore: true });
const artifacts = buildReplayArtifactsFromEpisode(episode, { checkpointEvery: 5 });
const validation = validateReplayArtifacts(artifacts);

assert.equal(artifacts.manifest.contract, REPLAY_R1_CONTRACT_ID, 'contract id');
assert.equal(artifacts.manifest.version, REPLAY_R1_SCHEMA_VERSION, 'schema version');
assert.equal(artifacts.manifest.replayMode, REPLAY_MODES.publicObservationPlayback, 'public playback default');
assert.equal(artifacts.manifest.changesOfficialBrowserScoring, false, 'official scoring unchanged');
assert.equal(artifacts.manifest.hiddenTruthIncluded, false, 'public replay hides hidden truth');
assert.equal(validation.status, 'PASS', validation.failures.join('; '));
assert.ok(artifacts.events.events.length > 0, 'events emitted');
assert.ok(artifacts.checkpoints.checkpoints.length > 1, 'checkpoints emitted');

console.log('REPLAY-R1 schema smoke passed');