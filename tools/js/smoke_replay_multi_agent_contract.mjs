#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { verifyReplayIntegrity } from '../../src/core/replay/ReplayIntegrityVerifier.js';
import { createReplayPlaybackState, replayAgentIds, replayMultiAgentSummary, stepReplayPlayback, jumpReplayPlaybackToCheckpoint } from '../../src/core/replay/ReplayPlayback.js';
import { canonicalReplayEventCompare } from '../../src/core/replay/ReplayOrdering.js';
import { replayDigestMatches } from '../../src/core/replay/ReplayDigest.js';

const bundle = JSON.parse(fs.readFileSync('docs/examples/headless_replay_multi_agent.example.json', 'utf8'));
const report = verifyReplayIntegrity(bundle);
assert.equal(report.status, 'PASS');
assert.deepEqual(report.agentIds, ['glider-alpha', 'glider-bravo']);
const sameTick = bundle.replayEvents.events.filter((event) => event.tick === 1);
assert.equal(canonicalReplayEventCompare(sameTick[0], sameTick[1]) < 0, true, 'same-tick agent ordering should be canonical');
let playback = createReplayPlaybackState(bundle);
assert.deepEqual(replayAgentIds(playback), ['glider-alpha', 'glider-bravo']);
playback = stepReplayPlayback(playback, bundle, 1);
assert.equal(playback.currentEvent.agentId, 'glider-alpha');
playback = jumpReplayPlaybackToCheckpoint(playback, bundle, 'terminal');
const summary = replayMultiAgentSummary(playback);
assert.equal(summary.agentCount, 2);
assert.equal(summary.multiAgentReplayContractOnly, true);
assert.equal(summary.usesMARL, false);
assert.equal(replayDigestMatches(playback.currentCheckpoint.digest, playback.publicState).ok, true);
assert.equal(JSON.stringify(bundle).includes('T_hiddenTruth'), false);
console.log(JSON.stringify({ ok: true, agents: summary.agentIds, checkpoint: playback.currentCheckpointId }, null, 2));