import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { buildReplayArtifactsFromEpisode } from '../../src/core/replay/ReplayContractBuilder.js';
import { compareReplayArtifacts } from '../../src/core/replay/ReplayVerifier.js';

const episode = runHeadlessMission({ seed: 'replay-verifier-smoke', motionAware: true, missionScore: true });
const reference = buildReplayArtifactsFromEpisode(episode, { checkpointEvery: 5 });
const same = compareReplayArtifacts(reference, reference);
assert.equal(same.status, 'PASS', same.failures.join('; '));

const tampered = structuredClone(reference);
tampered.checkpoints.checkpoints.at(-1).publicState.vehicles['glider-1'].x += 1;
tampered.checkpoints.checkpoints.at(-1).digest.value = 'fnv1a32:tampered';
const report = compareReplayArtifacts(reference, tampered);
assert.equal(report.status, 'FAIL', 'tampered replay fails');
assert.equal(report.firstDivergence.mismatchClass, 'checkpoint-digest-mismatch');
assert.match(report.firstDivergence.path, /publicState|digest/);

console.log('REPLAY-R1 verifier smoke passed');