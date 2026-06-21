#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayReviewSourceFromBundle } from '../../src/core/replay/ReplayReviewLoader.js';
import { createReplayReviewSession, reduceReplayReviewSession, replayReviewSessionSummary } from '../../src/core/replay/ReplayReviewSession.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_replay_r2a_acceptance.example.json', 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const source = buildReplayReviewSourceFromBundle(bundle, { sourceKind: 'multi-agent-selection-smoke' });
let session = createReplayReviewSession(source);
session = reduceReplayReviewSession(session, { type: 'jumpCheckpoint', selector: 'terminal' });
const fleet = replayReviewSessionSummary(session);
assert.deepEqual(fleet.agentIds, ['glider-alpha', 'glider-bravo']);

session = reduceReplayReviewSession(session, { type: 'selectAgent', agentId: 'glider-alpha' });
const alpha = replayReviewSessionSummary(session);
session = reduceReplayReviewSession(session, { type: 'selectAgent', agentId: 'glider-bravo' });
const bravo = replayReviewSessionSummary(session);
assert.equal(bravo.currentEventIndex, alpha.currentEventIndex);
assert.equal(bravo.currentCheckpointIndex, alpha.currentCheckpointIndex);
assert.equal(bravo.activeTimeSeconds, alpha.activeTimeSeconds);
assert.equal(bravo.publicStateDigest, alpha.publicStateDigest);
assert.equal(bravo.replayReducerRunCount, alpha.replayReducerRunCount, 'selection must not count as replay reduction');
assert.equal(bravo.checkpointRestoreCount, alpha.checkpointRestoreCount, 'selection must not restore checkpoints');

session = reduceReplayReviewSession(session, { type: 'selectAgent', agentId: null });
const all = replayReviewSessionSummary(session);
assert.equal(all.selectedAgentId, null);
assert.equal(all.agentCount, 2);
console.log('smoke_replay_multi_agent_selection: PASS', JSON.stringify({ agentCount: all.agentCount, digest: all.publicStateDigest }));
